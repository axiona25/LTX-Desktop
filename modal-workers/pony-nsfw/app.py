from __future__ import annotations

import base64
import io
import os
import random
import time
from typing import Any

import modal
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# MODELLO CORRETTO (uno dei più stabili)
MODEL_ID = "Polenov2024/Pony-Diffusion-V6-XL"

CACHE_DIR = "/cache/huggingface"

app = modal.App("axstudio-pony-nsfw")
volume = modal.Volume.from_name("axstudio-pony-cache", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git")
    .pip_install("fastapi[standard]", "accelerate", "diffusers", "transformers", "safetensors", "pillow", "torch")
    .env({"HF_HOME": CACHE_DIR, "HF_HUB_CACHE": CACHE_DIR})
)

_pipe: Any | None = None

class GenerateRequest(BaseModel):
    prompt: str
    negative_prompt: str = ""
    width: int = 1024
    height: int = 1536
    steps: int = 35
    guidance_scale: float = 3.0
    seed: int | None = None

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
    api = FastAPI(title="AXSTUDIO Pony NSFW")

    @api.get("/debug")
    def debug():
        return {
            "service": "axstudio-pony-nsfw",
            "version": "debug-2026-05-11-v2",
            "model_id": MODEL_ID,
            "cache_dir": CACHE_DIR,
        }

    @api.post("/generate")
    def generate(request: GenerateRequest):
        global _pipe
        start = time.perf_counter()

        try:
            import torch
            from diffusers import DiffusionPipeline

            if _pipe is None:
                print(f"🔄 Caricamento modello: {MODEL_ID} ...")
                token = os.environ.get("HF_TOKEN")
                _pipe = DiffusionPipeline.from_pretrained(
                    MODEL_ID,
                    torch_dtype=torch.bfloat16,
                    cache_dir=CACHE_DIR,
                    token=token,
                )
                _pipe.to("cuda")
                print("✅ Modello caricato con successo")

            seed = request.seed or random.randint(0, 2**32 - 1)
            generator = torch.Generator("cuda").manual_seed(seed)

            result = _pipe(
                prompt=request.prompt,
                negative_prompt=request.negative_prompt or None,
                width=request.width,
                height=request.height,
                num_inference_steps=request.steps,
                guidance_scale=request.guidance_scale,
                generator=generator,
                output_type="pil",
            )

            buffer = io.BytesIO()
            result.images[0].save(buffer, format="PNG")
            elapsed = int((time.perf_counter() - start) * 1000)

            return {
                "image_base64": base64.b64encode(buffer.getvalue()).decode("ascii"),
                "seed": seed,
                "elapsed_ms": elapsed
            }

        except Exception as e:
            print(f"❌ ERRORE: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))

    return api
