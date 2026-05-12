from __future__ import annotations

import modal
from fastapi import FastAPI
import subprocess

app = modal.App("axstudio-comfyui")

comfy_image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git", "wget")
    .pip_install("fastapi[standard]", "uvicorn")
    .run_commands(
        "git clone https://github.com/comfyanonymous/ComfyUI.git /comfyui",
        "cd /comfyui && pip install -r requirements.txt",
        "cd /comfyui && pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121",
    )
    .env({"COMFYUI_PATH": "/comfyui"})
)

volume = modal.Volume.from_name("comfyui-models", create_if_missing=True)

@app.function(
    image=comfy_image,
    gpu="H100",
    volumes={"/comfyui/models": volume},
    timeout=1800,
    scaledown_window=300,
)
@modal.asgi_app()
def web_app():
    # Avvia ComfyUI in background
    subprocess.Popen(["python", "/comfyui/main.py", "--listen", "0.0.0.0", "--port", "8188"])

    api = FastAPI()

    @api.get("/")
    def root():
        return {
            "status": "ComfyUI is running",
            "url": "http://127.0.0.1:8188 (use Modal tunnel or forward port)"
        }

    return api
