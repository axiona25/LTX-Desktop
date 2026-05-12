from __future__ import annotations

import base64
import io
import os
import random
import time
from typing import Any, Literal

import modal
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

MODEL_ID = "black-forest-labs/FLUX.1-dev"
CACHE_DIR = "/cache/huggingface"

app = modal.App("axstudio-flux-image")
volume = modal.Volume.from_name("axstudio-flux-cache", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install("fastapi[standard]", "accelerate", "diffusers", "transformers", "safetensors", "pillow", "torch")
    .env({"HF_HOME": CACHE_DIR, "HF_HUB_CACHE": CACHE_DIR})
)

_pipe: Any | None = None

class GenerateRequest(BaseModel):
    prompt: str
    negative_prompt: str = ""
    width: int = 1024
    height: int = 1536
    steps: int = 40
    guidance_scale: float = 2.5   # abbassato per ridurre blob/deformazioni
    seed: int | None = None
    quality_mode: Literal["preview", "balanced", "premium"] = "premium"

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
    api = FastAPI(title="AXSTUDIO FLUX NSFW Optimized")

    @api.post("/generate")
    def generate(request: GenerateRequest):
        global _pipe
        start = time.perf_counter()

        try:
            import torch
            from diffusers import FluxPipeline

            if _pipe is None:
                token = os.environ.get("HF_TOKEN")
                _pipe = FluxPipeline.from_pretrained(
                    MODEL_ID,
                    torch_dtype=torch.bfloat16,
                    cache_dir=CACHE_DIR,
                    token=token,
                )
                _pipe.to("cuda")

            seed = request.seed if request.seed is not None else random.randint(0, 2_147_483_647)
            generator = torch.Generator(device="cuda").manual_seed(seed)

            # Negative prompt ultra forte contro pink blob e deformazioni
            strong_negative = (request.negative_prompt or "") + ", deformed genitalia, pink blob, glossy mass, melted pussy, surreal anatomy, bad anatomy, extra limbs, mutated hands, plastic skin, censorship, underwear, closed legs, modest pose, soft lighting, artistic, painting, drawing, anime, cartoon, low quality, blurry, text, watermark, fabric on body, covered genitals"

            result = _pipe(
                prompt=request.prompt,
                negative_prompt=strong_negative.strip(),
                width=request.width,
                height=request.height,
                num_inference_steps=request.steps,
                guidance_scale=request.guidance_scale,
                generator=generator,
                output_type="pil",
            )

            buffer = io.BytesIO()
            result.images[0].save(buffer, format="PNG")
            elapsed_ms = int((time.perf_counter() - start) * 1000)

            return {
                "image_base64": base64.b64encode(buffer.getvalue()).decode("ascii"),
                "seed": seed,
                "elapsed_ms": elapsed_ms
            }

        except Exception as e:
            print(f"❌ ERRORE FLUX: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    return api
