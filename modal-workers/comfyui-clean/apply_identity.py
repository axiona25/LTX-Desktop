from __future__ import annotations

import argparse
import json
import mimetypes
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from typing import Any


PROJECT_BASE = Path("/Users/r.amoroso/Documents/AXSTUDIO/modal-workers/comfyui-clean/Progetti")
COMFYUI_ENDPOINT = "https://axiona2025--axstudio-comfyui-clean-comfyui-server.modal.run"

DEFAULT_PROMPT = (
    "same person as the master reference, matching facial identity, natural realistic face, "
    "sharp detailed eyes, realistic symmetrical eyes, natural skin texture, preserve target pose, "
    "preserve target body, preserve target lighting, preserve target scene, photorealistic"
)
DEFAULT_NEGATIVE_PROMPT = (
    "different person, changed identity, distorted eyes, red eyes, cross eyed, deformed iris, "
    "bad pupils, asymmetrical eyes, deformed face, plastic skin, waxy skin, overprocessed skin, "
    "blurry, low quality, extra face, watermark, text"
)


def _safe_project_prefix(project_id: str) -> str:
    value = "".join(ch if ch.isalnum() else "_" for ch in project_id).strip("_")
    if not value:
        raise ValueError("project_id must contain at least one alphanumeric character")
    return value


def _request_json(path: str, *, method: str = "GET", payload: dict[str, Any] | None = None, timeout: int = 300) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(
        COMFYUI_ENDPOINT + path,
        data=data,
        headers={"Content-Type": "application/json"} if payload is not None else {},
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} failed with HTTP {exc.code}: {body}") from exc


def _upload_image(path: Path, remote_name: str) -> str:
    boundary = "----AXSTUDIO" + uuid.uuid4().hex
    content_type = mimetypes.guess_type(remote_name)[0] or "application/octet-stream"
    body = b"".join(
        [
            f"--{boundary}\r\n".encode("utf-8"),
            f'Content-Disposition: form-data; name="image"; filename="{remote_name}"\r\n'.encode("utf-8"),
            f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"),
            path.read_bytes(),
            b"\r\n",
            f"--{boundary}\r\n".encode("utf-8"),
            b'Content-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n',
            f"--{boundary}--\r\n".encode("utf-8"),
        ]
    )
    request = urllib.request.Request(
        COMFYUI_ENDPOINT + "/upload/image",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=300) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"upload failed with HTTP {exc.code}: {body_text}") from exc

    name = result.get("name")
    if not isinstance(name, str) or not name:
        raise RuntimeError(f"ComfyUI upload did not return a valid name: {result}")
    print(f"uploaded: {path} -> ComfyUI input/{name}")
    return name


def _download_view(filename: str, output_dir: Path, *, subfolder: str = "", image_type: str = "output") -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    query = urllib.parse.urlencode({"filename": filename, "subfolder": subfolder, "type": image_type})
    url = f"{COMFYUI_ENDPOINT}/view?{query}"
    target = output_dir / Path(filename).name
    with urllib.request.urlopen(url, timeout=300) as response:
        target.write_bytes(response.read())
    return target


def _build_workflow(
    *,
    master_image: str,
    target_image: str,
    filename_prefix: str,
    prompt: str,
    negative_prompt: str,
    seed: int,
    denoise: float,
    steps: int,
    cfg: float,
    ip_weight: float,
    faceid_weight: float,
    instantid_weight: float,
    instantid_controlnet_weight: float,
    faceid_preset: str,
    lora_strength: float,
    identity_lora_name: str | None,
    identity_lora_strength: float,
    identity_lora_clip_strength: float,
    detail_lora_name: str | None,
    detail_lora_strength: float,
    detail_lora_clip_strength: float,
    mask_expand: int,
    mask_feather: int,
) -> dict[str, Any]:
    model_ref: list[Any] = ["3", 0]
    clip_ref: list[Any] = ["3", 1]
    workflow: dict[str, Any] = {
        "1": {"class_type": "LoadImage", "inputs": {"image": target_image}},
        "2": {"class_type": "LoadImage", "inputs": {"image": master_image}},
        "3": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "realvisxlV50_v50Bakedvae.safetensors"}},
    }
    if identity_lora_name and identity_lora_strength != 0:
        workflow["25"] = {
            "class_type": "LoraLoader",
            "inputs": {
                "model": model_ref,
                "clip": clip_ref,
                "lora_name": identity_lora_name,
                "strength_model": identity_lora_strength,
                "strength_clip": identity_lora_clip_strength,
            },
        }
        model_ref = ["25", 0]
        clip_ref = ["25", 1]
    if detail_lora_name and detail_lora_strength != 0:
        workflow["26"] = {
            "class_type": "LoraLoader",
            "inputs": {
                "model": model_ref,
                "clip": clip_ref,
                "lora_name": detail_lora_name,
                "strength_model": detail_lora_strength,
                "strength_clip": detail_lora_clip_strength,
            },
        }
        model_ref = ["26", 0]
        clip_ref = ["26", 1]

    return {
        **workflow,
        "4": {"class_type": "CLIPTextEncode", "inputs": {"clip": clip_ref, "text": prompt}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"clip": clip_ref, "text": negative_prompt}},
        "6": {"class_type": "UltralyticsDetectorProvider", "inputs": {"model_name": "bbox/face_yolov8m.pt"}},
        "7": {
            "class_type": "BboxDetectorSEGS",
            "inputs": {
                "bbox_detector": ["6", 0],
                "image": ["1", 0],
                "threshold": 0.45,
                "dilation": 12,
                "crop_factor": 1.45,
                "drop_size": 10,
                "labels": "face",
            },
        },
        "8": {"class_type": "SegsToCombinedMask", "inputs": {"segs": ["7", 0]}},
        "9": {"class_type": "GrowMask", "inputs": {"mask": ["8", 0], "expand": mask_expand, "tapered_corners": True}},
        "10": {
            "class_type": "FeatherMask",
            "inputs": {"mask": ["9", 0], "left": mask_feather, "top": mask_feather, "right": mask_feather, "bottom": mask_feather},
        },
        "11": {"class_type": "MaskToImage", "inputs": {"mask": ["10", 0]}},
        "12": {"class_type": "SaveImage", "inputs": {"images": ["11", 0], "filename_prefix": f"{filename_prefix}_mask"}},
        "13": {
            "class_type": "IPAdapterUnifiedLoaderFaceID",
            "inputs": {"model": model_ref, "preset": faceid_preset, "lora_strength": lora_strength, "provider": "CUDA"},
        },
        "14": {"class_type": "IPAdapterInsightFaceLoader", "inputs": {"provider": "CUDA", "model_name": "antelopev2"}},
        "15": {
            "class_type": "IPAdapterFaceID",
            "inputs": {
                "model": ["13", 0],
                "ipadapter": ["13", 1],
                "image": ["2", 0],
                "weight": ip_weight,
                "weight_faceidv2": faceid_weight,
                "weight_type": "linear",
                "combine_embeds": "concat",
                "start_at": 0.0,
                "end_at": 0.9,
                "embeds_scaling": "V only",
                "attn_mask": ["10", 0],
                "insightface": ["14", 0],
            },
        },
        "16": {"class_type": "InstantIDModelLoader", "inputs": {"instantid_file": "ip-adapter.bin"}},
        "17": {"class_type": "InstantIDFaceAnalysis", "inputs": {"provider": "CUDA"}},
        "18": {"class_type": "ControlNetLoader", "inputs": {"control_net_name": "InstantID-ControlNet/diffusion_pytorch_model.safetensors"}},
        "19": {
            "class_type": "ApplyInstantIDAdvanced",
            "inputs": {
                "instantid": ["16", 0],
                "insightface": ["17", 0],
                "control_net": ["18", 0],
                "image": ["2", 0],
                "model": ["15", 0],
                "positive": ["4", 0],
                "negative": ["5", 0],
                "ip_weight": instantid_weight,
                "cn_strength": instantid_controlnet_weight,
                "start_at": 0.0,
                "end_at": 0.75,
                "noise": 0.0,
                "combine_embeds": "average",
                "mask": ["10", 0],
            },
        },
        "20": {
            "class_type": "InpaintModelConditioning",
            "inputs": {
                "positive": ["19", 1],
                "negative": ["19", 2],
                "vae": ["3", 2],
                "pixels": ["1", 0],
                "mask": ["10", 0],
                "noise_mask": True,
            },
        },
        "21": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["19", 0],
                "seed": seed,
                "steps": steps,
                "cfg": cfg,
                "sampler_name": "dpmpp_2m_sde",
                "scheduler": "karras",
                "positive": ["20", 0],
                "negative": ["20", 1],
                "latent_image": ["20", 2],
                "denoise": denoise,
            },
        },
        "22": {"class_type": "VAEDecode", "inputs": {"samples": ["21", 0], "vae": ["3", 2]}},
        "23": {"class_type": "SaveImage", "inputs": {"images": ["22", 0], "filename_prefix": filename_prefix}},
    }


def apply_master_to_image(
    project_id: str,
    target_filename: str,
    *,
    prompt: str,
    negative_prompt: str,
    seed: int,
    denoise: float,
    steps: int,
    cfg: float,
    ip_weight: float,
    faceid_weight: float,
    instantid_weight: float,
    instantid_controlnet_weight: float,
    faceid_preset: str,
    lora_strength: float,
    identity_lora_name: str | None,
    identity_lora_strength: float,
    identity_lora_clip_strength: float,
    detail_lora_name: str | None,
    detail_lora_strength: float,
    detail_lora_clip_strength: float,
    mask_expand: int,
    mask_feather: int,
    output_label: str | None,
    open_output: bool,
) -> Path:
    project_path = PROJECT_BASE / project_id
    master_path = project_path / "MasterID" / "master_final.png"
    target_path = project_path / "FaceID" / "input" / Path(target_filename).name
    output_dir = project_path / "FaceID" / "output"
    output_dir.mkdir(parents=True, exist_ok=True)

    if not master_path.exists():
        raise FileNotFoundError(f"Master not found: {master_path}")
    if not target_path.exists():
        raise FileNotFoundError(f"Target not found: {target_path}")
    if seed < 0:
        raise ValueError("seed must be >= 0")

    prefix = _safe_project_prefix(project_id)
    timestamp = int(time.time())
    remote_master = f"{prefix}_master_identity_inpaint.png"
    remote_target = f"{prefix}_target_identity_inpaint.png"
    label = ""
    if output_label:
        label = "_" + "".join(ch if ch.isalnum() else "_" for ch in output_label).strip("_")
    filename_prefix = f"{prefix}_identity_inpaint{label}_{timestamp}"

    print(f"project: {project_id}")
    print(f"master: {master_path}")
    print(f"target: {target_path}")
    print(f"endpoint: {COMFYUI_ENDPOINT}")
    print("engine: ComfyUI local identity inpaint")
    print("models: RealVisXL + IPAdapter FaceID Plus v2 + InstantID")
    if identity_lora_name and identity_lora_strength != 0:
        print(f"identity_lora: {identity_lora_name} model={identity_lora_strength} clip={identity_lora_clip_strength}")
    if detail_lora_name and detail_lora_strength != 0:
        print(f"detail_lora: {detail_lora_name} model={detail_lora_strength} clip={detail_lora_clip_strength}")

    master_image = _upload_image(master_path, remote_master)
    target_image = _upload_image(target_path, remote_target)
    workflow = _build_workflow(
        master_image=master_image,
        target_image=target_image,
        filename_prefix=filename_prefix,
        prompt=prompt,
        negative_prompt=negative_prompt,
        seed=seed,
        denoise=denoise,
        steps=steps,
        cfg=cfg,
        ip_weight=ip_weight,
        faceid_weight=faceid_weight,
        instantid_weight=instantid_weight,
        instantid_controlnet_weight=instantid_controlnet_weight,
        faceid_preset=faceid_preset,
        lora_strength=lora_strength,
        identity_lora_name=identity_lora_name,
        identity_lora_strength=identity_lora_strength,
        identity_lora_clip_strength=identity_lora_clip_strength,
        detail_lora_name=detail_lora_name,
        detail_lora_strength=detail_lora_strength,
        detail_lora_clip_strength=detail_lora_clip_strength,
        mask_expand=mask_expand,
        mask_feather=mask_feather,
    )

    workflow_path = output_dir / f"{filename_prefix}_workflow.json"
    workflow_path.write_text(json.dumps(workflow, indent=2), encoding="utf-8")

    response = _request_json("/prompt", method="POST", payload={"prompt": workflow}, timeout=120)
    prompt_id = response.get("prompt_id")
    if not isinstance(prompt_id, str) or not prompt_id:
        raise RuntimeError(f"/prompt did not return prompt_id: {response}")
    print(f"prompt_id: {prompt_id}")

    history = None
    for _ in range(120):
        time.sleep(2)
        result = _request_json(f"/history/{prompt_id}", timeout=120)
        if prompt_id in result:
            history = result[prompt_id]
            break
    if history is None:
        raise TimeoutError(f"Timed out waiting for history: {prompt_id}")

    history_path = output_dir / f"{filename_prefix}_history.json"
    history_path.write_text(json.dumps(history, indent=2), encoding="utf-8")

    downloaded: list[Path] = []
    for output in history.get("outputs", {}).values():
        if not isinstance(output, dict):
            continue
        for image in output.get("images", []):
            filename = image.get("filename")
            if not isinstance(filename, str) or not filename:
                continue
            subfolder = str(image.get("subfolder") or "")
            image_type = str(image.get("type") or "output")
            downloaded.append(_download_view(filename, output_dir, subfolder=subfolder, image_type=image_type))

    final_candidates = [path for path in downloaded if path.name.startswith(filename_prefix) and "_mask_" not in path.name]
    if not final_candidates:
        raise RuntimeError(f"No final image found in history outputs: {history.get('outputs')}")
    final_path = sorted(final_candidates)[-1]

    print(f"final output: {final_path}")
    for path in downloaded:
        if path != final_path:
            print(f"debug output: {path}")
    print(f"workflow saved: {workflow_path}")
    print(f"history saved: {history_path}")

    if open_output:
        subprocess.run(["open", str(final_path)], check=False)
    return final_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Apply project master identity to an existing image with ComfyUI local inpaint.")
    parser.add_argument("--project", required=True)
    parser.add_argument("--target", required=True)
    parser.add_argument("--prompt", default=DEFAULT_PROMPT)
    parser.add_argument("--negative-prompt", default=DEFAULT_NEGATIVE_PROMPT)
    parser.add_argument("--seed", type=int, default=int(time.time()))
    parser.add_argument("--denoise", type=float, default=0.50)
    parser.add_argument("--steps", type=int, default=30)
    parser.add_argument("--cfg", type=float, default=4.0)
    parser.add_argument("--ip-weight", type=float, default=1.05)
    parser.add_argument("--faceid-weight", type=float, default=1.65)
    parser.add_argument("--instantid-weight", type=float, default=0.45)
    parser.add_argument("--instantid-controlnet-weight", type=float, default=0.35)
    parser.add_argument(
        "--faceid-preset",
        default="FACEID PLUS V2",
        choices=[
            "FACEID",
            "FACEID PLUS - SD1.5 only",
            "FACEID PLUS V2",
            "FACEID PORTRAIT (style transfer)",
            "FACEID PORTRAIT UNNORM - SDXL only (strong)",
        ],
    )
    parser.add_argument("--lora-strength", type=float, default=0.78)
    parser.add_argument("--identity-lora-name", default="LoRA_NOSE0.65.safetensors")
    parser.add_argument("--identity-lora-strength", type=float, default=0.65)
    parser.add_argument("--identity-lora-clip-strength", type=float, default=0.0)
    parser.add_argument("--detail-lora-name", default="EyesXL_v3.safetensors")
    parser.add_argument("--detail-lora-strength", type=float, default=0.35)
    parser.add_argument("--detail-lora-clip-strength", type=float, default=0.0)
    parser.add_argument("--mask-expand", type=int, default=64)
    parser.add_argument("--mask-feather", type=int, default=110)
    parser.add_argument("--output-label")
    parser.add_argument("--open", action="store_true", help="Open the generated file on macOS.")
    args = parser.parse_args()

    if args.seed < 0:
        raise SystemExit("--seed must be >= 0")
    if not 0.0 <= args.denoise <= 1.0:
        raise SystemExit("--denoise must be between 0 and 1")
    if args.steps <= 0:
        raise SystemExit("--steps must be > 0")
    if args.cfg < 0:
        raise SystemExit("--cfg must be >= 0")

    apply_master_to_image(
        args.project,
        args.target,
        prompt=args.prompt,
        negative_prompt=args.negative_prompt,
        seed=args.seed,
        denoise=args.denoise,
        steps=args.steps,
        cfg=args.cfg,
        ip_weight=args.ip_weight,
        faceid_weight=args.faceid_weight,
        instantid_weight=args.instantid_weight,
        instantid_controlnet_weight=args.instantid_controlnet_weight,
        faceid_preset=args.faceid_preset,
        lora_strength=args.lora_strength,
        identity_lora_name=args.identity_lora_name,
        identity_lora_strength=args.identity_lora_strength,
        identity_lora_clip_strength=args.identity_lora_clip_strength,
        detail_lora_name=args.detail_lora_name,
        detail_lora_strength=args.detail_lora_strength,
        detail_lora_clip_strength=args.detail_lora_clip_strength,
        mask_expand=args.mask_expand,
        mask_feather=args.mask_feather,
        output_label=args.output_label,
        open_output=args.open,
    )


if __name__ == "__main__":
    main()
