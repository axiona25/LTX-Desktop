from __future__ import annotations

import base64
import gc
import inspect
import io
import os
from pathlib import Path
import random
import re
import time
from typing import Any, Literal

import modal
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

FLUX2_KLEIN_MODEL_ID = "black-forest-labs/FLUX.2-klein-9B"
FLUX1_DEV_MODEL_ID = "black-forest-labs/FLUX.1-dev"
DEFAULT_MODEL_ID = FLUX2_KLEIN_MODEL_ID
CACHE_DIR = "/cache/huggingface"
LORA_CACHE_DIR = "/cache/civitai-loras"
FLUX1_STYLE_IDS = {
    "stylized_3d",
    "fairytale_3d",
    "pixar_3d",
    "disney_animation",
    "toy_clay_3d",
    "low_poly_3d",
    "anime_clean",
    "anime_cinematic",
    "chibi_kawaii",
    "clean_cartoon",
    "mascot_cartoon",
    "storybook_cartoon",
    "comic_book",
    "european_comic",
    "watercolor",
    "pencil_sketch",
    "pixel_art",
}

app = modal.App("axstudio-flux-image")
volume = modal.Volume.from_name("axstudio-flux-cache", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git")
    .pip_install(
        "fastapi[standard]",
        "accelerate",
        "git+https://github.com/huggingface/diffusers.git",
        "transformers",
        "peft",
        "safetensors",
        "pillow",
        "requests",
        "torch",
    )
    .env({"HF_HOME": CACHE_DIR, "HF_HUB_CACHE": CACHE_DIR})
)

_pipe: Any | None = None
_pipe_model_id: str | None = None
_loaded_lora_adapters: set[str] = set()

FLUX_3D_ANIMATION_LORA: dict[str, Any] = {
    "name": "Flux 3D Animation Style LoRA",
    "model_version_id": 922267,
    "hf_repo": "Muapi/flux-3d-animation-style-lora",
    "hf_filename": "flux-3d-animation-style-lora.safetensors",
    "base_model": "Flux.1 D",
    "preferred_model": FLUX1_DEV_MODEL_ID,
    "trigger_words": [],
    "weight": 0.7,
}

FLUX_ANIME_LORA: dict[str, Any] = {
    "name": "Canopus LoRA Flux Anime",
    "hf_repo": "prithivMLmods/Canopus-LoRA-Flux-Anime",
    "hf_filename": "Canopus-Anime-Character-Art-FluxDev-LoRA.safetensors",
    "base_model": "Flux.1 Dev",
    "preferred_model": FLUX1_DEV_MODEL_ID,
    "trigger_words": [],
    "weight": 0.68,
}

FLUX_CARTOON_LORA: dict[str, Any] = {
    "name": "CartoonStyle Flux LoRA",
    "hf_repo": "Norod78/CartoonStyle-flux-lora",
    "hf_filename": "CartoonStyle_flux_lora.safetensors",
    "base_model": "Flux.1 Dev",
    "preferred_model": FLUX1_DEV_MODEL_ID,
    "trigger_words": [],
    "weight": 0.7,
}

FLUX_COMIC_LORA: dict[str, Any] = {
    "name": "ComicStrips LoRA Fluxdev",
    "hf_repo": "zhreyu/ComicStrips-Lora-Fluxdev",
    "hf_filename": "ComicStrips_flux_lora_v1_fp16.safetensors",
    "base_model": "Flux.1 Dev",
    "preferred_model": FLUX1_DEV_MODEL_ID,
    "trigger_words": [],
    "weight": 0.68,
}

FLUX_RETRO_COMIC_LORA: dict[str, Any] = {
    "name": "Retro Comic Flux",
    "hf_repo": "renderartist/retrocomicflux",
    "hf_filename": "Retro_Comic_Flux_v2_renderartist.safetensors",
    "base_model": "Flux.1 Dev",
    "preferred_model": FLUX1_DEV_MODEL_ID,
    "trigger_words": [],
    "weight": 0.62,
}

FLUX_WATERCOLOR_LORA: dict[str, Any] = {
    "name": "Aquarel Watercolor Flux LoRA",
    "hf_repo": "SebastianBodza/flux_lora_aquarel_watercolor",
    "hf_filename": "lora.safetensors",
    "base_model": "Flux.1 Dev",
    "preferred_model": FLUX1_DEV_MODEL_ID,
    "trigger_words": [],
    "weight": 0.7,
}

FLUX_PENCIL_SKETCH_LORA: dict[str, Any] = {
    "name": "Pencil Sketch Flux Style LoRA",
    "hf_repo": "Muapi/pencil-sketch-flux-style-lora",
    "hf_filename": "pencil-sketch-flux-style-lora.safetensors",
    "base_model": "Flux.1 D",
    "preferred_model": FLUX1_DEV_MODEL_ID,
    "trigger_words": [],
    "weight": 0.72,
}

FLUX_PIXEL_ART_LORA: dict[str, Any] = {
    "name": "Modern Pixel Art Flux LoRA",
    "hf_repo": "UmeAiRT/FLUX.1-dev-LoRA-Modern_Pixel_art",
    "hf_filename": "ume_modern_pixelart.safetensors",
    "base_model": "Flux.1 Dev",
    "preferred_model": FLUX1_DEV_MODEL_ID,
    "trigger_words": [],
    "weight": 0.75,
}

FLUX_DETAILIFIER_LORA: dict[str, Any] = {
    "name": "Detailifier - FLUX",
    "model_version_id": 1031573,
    "base_model": "Flux.1 D",
    "preferred_model": FLUX1_DEV_MODEL_ID,
    "trigger_words": ["detailifier"],
    "weight": 0.45,
}

FLUX_CHARACTER_DETAILIFIER_LORA: dict[str, Any] = {
    **FLUX_DETAILIFIER_LORA,
    "weight": 0.28,
    "role": "character_realistic_detail",
}

FLUX_REALISTIC_EYES_LORA: dict[str, Any] = {
    "name": "Realistic Eyes - FLUX",
    "model_version_id": 1001867,
    "base_model": "Flux.1 D",
    "preferred_model": FLUX1_DEV_MODEL_ID,
    "trigger_words": ["detailed eyes"],
    "weight": 0.18,
}

FLUX_SAMEFACE_FIX_LORA: dict[str, Any] = {
    "name": "SameFace Fix [Flux Lora]",
    "model_version_id": 857446,
    "base_model": "Flux.1 D",
    "preferred_model": FLUX1_DEV_MODEL_ID,
    "trigger_words": [],
    # SameFace Fix is intended as a negative-weight consistency LoRA.
    "weight": -0.65,
    "role": "character_consistency",
}

STYLE_LORA_REGISTRY: dict[str, list[dict[str, Any]]] = {
    "__character_identity__": [
        FLUX_SAMEFACE_FIX_LORA,
    ],
    "photorealistic": [
        FLUX_REALISTIC_EYES_LORA,
    ],
    "portrait_photo": [
        FLUX_REALISTIC_EYES_LORA,
    ],
    "fashion_editorial": [
        FLUX_REALISTIC_EYES_LORA,
    ],
    "product_photo": [
        FLUX_REALISTIC_EYES_LORA,
    ],
    "detail_boost": [
        FLUX_DETAILIFIER_LORA,
        FLUX_REALISTIC_EYES_LORA,
    ],
    "lifestyle_photo": [
        FLUX_REALISTIC_EYES_LORA,
    ],
    "cinematic_realism": [
        FLUX_REALISTIC_EYES_LORA,
    ],
    "dramatic_film": [
        FLUX_REALISTIC_EYES_LORA,
    ],
    "commercial_ad": [
        FLUX_REALISTIC_EYES_LORA,
    ],
    "music_video": [
        FLUX_REALISTIC_EYES_LORA,
    ],
    "documentary_realism": [
        FLUX_REALISTIC_EYES_LORA,
    ],
    "anime_clean": [
        FLUX_ANIME_LORA,
    ],
    "anime_cinematic": [
        FLUX_ANIME_LORA,
    ],
    "manga_ink": [
        {
            "name": "LineAniRedmond",
            "model_version_id": 2675344,
            "base_model": "Flux.2 Klein 9B",
            "trigger_words": ["Lineart", "LineAniAF"],
            "weight": 0.7,
        },
    ],
    "chibi_kawaii": [
        FLUX_ANIME_LORA,
    ],
    "clean_cartoon": [
        FLUX_CARTOON_LORA,
    ],
    "mascot_cartoon": [
        FLUX_CARTOON_LORA,
    ],
    "storybook_cartoon": [
        FLUX_CARTOON_LORA,
    ],
    "comic_book": [
        FLUX_COMIC_LORA,
    ],
    "graphic_novel": [
        {
            "name": "Comic Sketch - CE",
            "model_version_id": 2787286,
            "base_model": "Flux.2 Klein 9B",
            "trigger_words": ["comic sketch"],
            "weight": 0.65,
        },
    ],
    "european_comic": [
        FLUX_RETRO_COMIC_LORA,
    ],
    "stylized_3d": [
        FLUX_3D_ANIMATION_LORA,
        {
            "name": "3D.Redmond",
            "model_version_id": 2705473,
            "base_model": "Flux.2 Klein 9B",
            "trigger_words": ["3DRenderAF", "3D Render Style"],
            "weight": 0.65,
        },
    ],
    "fairytale_3d": [
        FLUX_3D_ANIMATION_LORA,
        {
            "name": "3D.Redmond",
            "model_version_id": 2705473,
            "base_model": "Flux.2 Klein 9B",
            "trigger_words": ["3DRenderAF", "3D Render Style"],
            "weight": 0.55,
        },
    ],
    "pixar_3d": [
        FLUX_3D_ANIMATION_LORA,
        {
            "name": "3D.Redmond",
            "model_version_id": 2705473,
            "base_model": "Flux.2 Klein 9B",
            "trigger_words": ["3DRenderAF", "3D Render Style"],
            "weight": 0.7,
        },
    ],
    "toy_clay_3d": [
        FLUX_3D_ANIMATION_LORA,
    ],
    "low_poly_3d": [
        FLUX_3D_ANIMATION_LORA,
    ],
    "disney_animation": [
        FLUX_3D_ANIMATION_LORA,
        {
            "name": "Disney Mid-Century Animation",
            "model_version_id": 2701512,
            "base_model": "Flux.2 Klein 9B",
            "trigger_words": ["Disney Mid-Century Animation"],
            "weight": 0.62,
        },
    ],
    "studio_ghibli": [
        {
            "name": "StudioGhibli.Redmond",
            "model_version_id": 2702260,
            "base_model": "Flux.2 Klein 9B",
            "trigger_words": ["StudioGhibli.Redmond"],
            "weight": 0.62,
        },
    ],
    "watercolor": [
        FLUX_WATERCOLOR_LORA,
    ],
    "pencil_sketch": [
        FLUX_PENCIL_SKETCH_LORA,
    ],
    "pixel_art": [
        FLUX_PIXEL_ART_LORA,
    ],
}

REALISTIC_CHARACTER_DETAIL_STYLE_IDS = {
    "photorealistic",
    "portrait_photo",
    "fashion_editorial",
    "lifestyle_photo",
    "cinematic_realism",
    "dramatic_film",
    "documentary_realism",
}

class GenerateRequest(BaseModel):
    prompt: str
    negative_prompt: str = ""
    width: int = 1024
    height: int = 1536
    steps: int = 8
    guidance_scale: float = 1.0
    seed: int | None = None
    quality_mode: Literal["preview", "balanced", "premium"] = "premium"
    selected_style_id: str | None = None
    selected_style_label: str | None = None
    selected_style_category: str | None = None
    use_character_lora: bool = False
    image_character_id: str | None = None
    image_character_name: str | None = None


def _select_model_id(style_id: str | None, use_character_lora: bool = False) -> str:
    if use_character_lora:
        return FLUX1_DEV_MODEL_ID
    normalized_style_id = (style_id or "").strip()
    if normalized_style_id in FLUX1_STYLE_IDS:
        return FLUX1_DEV_MODEL_ID
    return DEFAULT_MODEL_ID


def _is_lora_compatible(lora_base_model: str, model_id: str) -> bool:
    normalized_base = lora_base_model.lower()
    if not normalized_base.strip():
        return True
    if model_id == FLUX2_KLEIN_MODEL_ID and "klein 9b" in normalized_base:
        return True
    if model_id == FLUX1_DEV_MODEL_ID and ("flux.1" in normalized_base or "flux 1" in normalized_base):
        return True
    return False


def _download_civitai_lora(model_version_id: int) -> Path:
    import requests

    target_dir = Path(LORA_CACHE_DIR)
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / f"civitai_{model_version_id}.safetensors"
    if target.exists() and target.stat().st_size > 0:
        return target

    url = f"https://civitai.com/api/download/models/{model_version_id}"
    civitai_token = (
        os.environ.get("CIVITAI_TOKEN")
        or os.environ.get("CIVITAI_API_TOKEN")
        or os.environ.get("CIVITAI")
    )
    headers = {"User-Agent": "AXSTUDIO/1.0"}
    if civitai_token:
        headers["Authorization"] = f"Bearer {civitai_token}"
    with requests.get(url, stream=True, timeout=180, headers=headers) as response:
        response.raise_for_status()
        temp = target.with_suffix(".tmp")
        with temp.open("wb") as file:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    file.write(chunk)
        temp.replace(target)
    return target


def _download_huggingface_lora(repo_id: str, filename: str) -> Path:
    from huggingface_hub import hf_hub_download

    token = os.environ.get("HF_TOKEN")
    path = hf_hub_download(
        repo_id=repo_id,
        filename=filename,
        cache_dir=CACHE_DIR,
        token=token,
    )
    return Path(path)


def _download_lora(spec: dict[str, Any]) -> Path:
    repo_id = str(spec.get("hf_repo") or "").strip()
    filename = str(spec.get("hf_filename") or "").strip()
    if repo_id and filename:
        return _download_huggingface_lora(repo_id, filename)
    return _download_civitai_lora(int(spec["model_version_id"]))


def _lora_key(spec: dict[str, Any]) -> str:
    if spec.get("model_version_id") is not None:
        return f"civitai_{int(spec['model_version_id'])}"
    repo_id = str(spec.get("hf_repo") or "hf")
    filename = Path(str(spec.get("hf_filename") or "lora")).stem
    raw_key = f"hf_{repo_id}_{filename}"
    return re.sub(r"[^0-9A-Za-z_]+", "_", raw_key).strip("_")


def _cleanup_failed_lora_adapter(pipe: Any, adapter_name: str) -> None:
    global _loaded_lora_adapters

    _loaded_lora_adapters.discard(adapter_name)
    if hasattr(pipe, "delete_adapters"):
        try:
            pipe.delete_adapters(adapter_name)
        except Exception:
            pass
    if hasattr(pipe, "disable_lora"):
        try:
            pipe.disable_lora()
        except Exception:
            pass


def _prefetch_lora_specs(selected_style_ids: list[str]) -> dict[str, Any]:
    downloaded: list[dict[str, Any]] = []
    failed: list[dict[str, Any]] = []

    seen_loras: set[str] = set()
    for style_id in selected_style_ids:
        for spec in STYLE_LORA_REGISTRY.get(style_id, []):
            lora_key = _lora_key(spec)
            if lora_key in seen_loras:
                continue
            seen_loras.add(lora_key)
            try:
                path = _download_lora(spec)
                downloaded.append(
                    {
                        "style_id": style_id,
                        "name": spec.get("name"),
                        "model_version_id": spec.get("model_version_id"),
                        "hf_repo": spec.get("hf_repo"),
                        "hf_filename": spec.get("hf_filename"),
                        "base_model": spec.get("base_model"),
                        "path": str(path),
                        "bytes": path.stat().st_size,
                    }
                )
            except Exception as exc:
                failed.append(
                    {
                        "style_id": style_id,
                        "name": spec.get("name"),
                        "model_version_id": spec.get("model_version_id"),
                        "hf_repo": spec.get("hf_repo"),
                        "error": str(exc),
                    }
                )

    volume.commit()
    return {"downloaded": downloaded, "failed": failed}


@app.function(
    image=image,
    volumes={"/cache": volume},
    timeout=900,
    scaledown_window=60,
)
def prefetch_all_loras() -> dict[str, Any]:
    return _prefetch_lora_specs(sorted(STYLE_LORA_REGISTRY.keys()))


def _apply_style_loras(
    pipe: Any,
    style_id: str | None,
    model_id: str,
    use_character_lora: bool = False,
) -> tuple[str, list[dict[str, Any]], list[str]]:
    global _loaded_lora_adapters

    requested = list(STYLE_LORA_REGISTRY.get((style_id or "").strip(), []))
    if use_character_lora:
        character_conflict_lora_keys = {
            _lora_key(FLUX_REALISTIC_EYES_LORA),
        }
        requested = [
            spec
            for spec in requested
            if _lora_key(spec) not in character_conflict_lora_keys
        ]
        requested.extend(STYLE_LORA_REGISTRY["__character_identity__"])
        if (style_id or "").strip() in REALISTIC_CHARACTER_DETAIL_STYLE_IDS:
            requested_lora_keys = {_lora_key(spec) for spec in requested}
            if _lora_key(FLUX_CHARACTER_DETAILIFIER_LORA) not in requested_lora_keys:
                requested.append(FLUX_CHARACTER_DETAILIFIER_LORA)
    compatible = [
        spec
        for spec in requested
        if spec.get("preferred_model") in (None, model_id)
        and _is_lora_compatible(str(spec.get("base_model", "")), model_id)
    ]
    skipped = [
        f"{spec.get('name')} requires {spec.get('base_model')}"
        for spec in requested
        if spec not in compatible
    ]

    if not compatible:
        if hasattr(pipe, "disable_lora"):
            pipe.disable_lora()
        return "", [], skipped

    adapter_names: list[str] = []
    adapter_weights: list[float] = []
    trigger_words: list[str] = []
    applied: list[dict[str, Any]] = []

    for spec in compatible:
        adapter_name = _lora_key(spec)
        try:
            lora_path = _download_lora(spec)
            if adapter_name not in _loaded_lora_adapters:
                pipe.load_lora_weights(str(lora_path), adapter_name=adapter_name)
                _loaded_lora_adapters.add(adapter_name)
        except Exception as exc:
            _cleanup_failed_lora_adapter(pipe, adapter_name)
            skipped.append(f"{spec.get('name')} could not be loaded: {exc}")
            continue
        adapter_names.append(adapter_name)
        adapter_weights.append(float(spec.get("weight", 0.6)))
        trigger_words.extend(str(word) for word in spec.get("trigger_words", []) if str(word).strip())
        applied.append(
            {
                "name": spec.get("name"),
                "model_version_id": spec.get("model_version_id"),
                "hf_repo": spec.get("hf_repo"),
                "hf_filename": spec.get("hf_filename"),
                "base_model": spec.get("base_model"),
                "weight": spec.get("weight", 0.6),
            }
        )

    if not adapter_names:
        if hasattr(pipe, "disable_lora"):
            pipe.disable_lora()
        return "", [], skipped

    if hasattr(pipe, "enable_lora"):
        pipe.enable_lora()
    pipe.set_adapters(adapter_names, adapter_weights=adapter_weights)
    return ", ".join(dict.fromkeys(trigger_words)), applied, skipped

@app.function(
    image=image,
    gpu="H100",
    volumes={"/cache": volume},
    secrets=[modal.Secret.from_name("axstudio-flux-secrets")],
    timeout=900,
    scaledown_window=300,
)
@modal.asgi_app()
def web_app():
    api = FastAPI(title="AXSTUDIO FLUX Image Worker")

    @api.post("/generate")
    def generate(request: GenerateRequest):
        global _pipe, _pipe_model_id, _loaded_lora_adapters
        start = time.perf_counter()

        try:
            import torch

            character_lora_requested = bool(
                request.use_character_lora
                or request.image_character_id
                or request.image_character_name
            )
            model_id = _select_model_id(request.selected_style_id, character_lora_requested)

            if _pipe is None or _pipe_model_id != model_id:
                if _pipe is not None:
                    if hasattr(_pipe, "disable_lora"):
                        try:
                            _pipe.disable_lora()
                        except Exception:
                            pass
                    try:
                        _pipe.to("cpu")
                    except Exception:
                        pass
                    del _pipe
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                        try:
                            torch.cuda.ipc_collect()
                        except Exception:
                            pass
                    gc.collect()
                    _loaded_lora_adapters = set()
                if model_id == FLUX1_DEV_MODEL_ID:
                    from diffusers import FluxPipeline as PipelineClass
                else:
                    from diffusers import Flux2KleinPipeline as PipelineClass
                token = os.environ.get("HF_TOKEN")
                _pipe = PipelineClass.from_pretrained(
                    model_id,
                    torch_dtype=torch.bfloat16,
                    cache_dir=CACHE_DIR,
                    token=token,
                )
                _pipe.enable_model_cpu_offload()
                _pipe_model_id = model_id

            seed = request.seed if request.seed is not None else random.randint(0, 2_147_483_647)
            generator = torch.Generator(device="cpu").manual_seed(seed)
            steps = request.steps
            if request.quality_mode == "preview":
                steps = min(steps, 4)
            elif request.quality_mode == "balanced":
                steps = max(steps, 6)
            else:
                steps = max(steps, 8)

            lora_triggers, loras_applied, loras_skipped = _apply_style_loras(
                _pipe,
                request.selected_style_id,
                model_id,
                character_lora_requested,
            )
            effective_prompt = f"{lora_triggers}, {request.prompt}" if lora_triggers else request.prompt
            negative_prompt_sent_to_flux = ""
            call_kwargs: dict[str, Any] = {
                "prompt": effective_prompt,
                "width": request.width,
                "height": request.height,
                "num_inference_steps": steps,
                "guidance_scale": request.guidance_scale,
                "generator": generator,
                "output_type": "pil",
            }
            if request.negative_prompt.strip():
                pipe_call_parameters = inspect.signature(_pipe.__call__).parameters
                if "negative_prompt" in pipe_call_parameters:
                    negative_prompt_sent_to_flux = request.negative_prompt
                    call_kwargs["negative_prompt"] = request.negative_prompt
                if "negative_prompt_2" in pipe_call_parameters:
                    negative_prompt_sent_to_flux = request.negative_prompt
                    call_kwargs["negative_prompt_2"] = request.negative_prompt

            result = _pipe(**call_kwargs)

            buffer = io.BytesIO()
            result.images[0].save(buffer, format="PNG")
            elapsed_ms = int((time.perf_counter() - start) * 1000)

            return {
                "provider": "modal_flux",
                "model": model_id,
                "image_base64": base64.b64encode(buffer.getvalue()).decode("ascii"),
                "seed": seed,
                "width": request.width,
                "height": request.height,
                "requested_steps": request.steps,
                "actual_steps": steps,
                "guidance_scale": request.guidance_scale,
                "quality_mode": request.quality_mode,
                "effective_width": request.width,
                "effective_height": request.height,
                "negative_prompt_applied": bool(negative_prompt_sent_to_flux),
                "use_character_lora": character_lora_requested,
                "elapsed_ms": elapsed_ms,
                "loras_applied": loras_applied,
                "loras_skipped": loras_skipped,
                "prompt_sent_to_flux": effective_prompt,
                "negative_prompt_received": request.negative_prompt,
                "negative_prompt_sent_to_flux": negative_prompt_sent_to_flux or None,
            }

        except Exception as e:
            print(f"FLUX worker error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    return api
