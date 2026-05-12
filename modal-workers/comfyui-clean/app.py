from __future__ import annotations

import os
import shutil
import subprocess
import time
from pathlib import Path

import modal

APP_NAME = "axstudio-comfyui-clean"
VOLUME_NAME = "axstudio-comfyui-clean-models"

app = modal.App(APP_NAME)
volume = modal.Volume.from_name(VOLUME_NAME, create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install(
        "git",
        "wget",
        "curl",
        "ffmpeg",
        "libgl1",
        "libglib2.0-0",
        "build-essential",
        "python3-dev",
        "cmake",
    )
    .pip_install(
        "torch",
        "torchvision",
        "torchaudio",
        "fastapi[standard]",
        "uvicorn",
        "requests",
        "pillow",
        "opencv-python-headless",
        "numpy",
        "scipy",
        "scikit-image",
        "matplotlib",
        "insightface",
        "onnxruntime",
        "onnxruntime-gpu",
        "diffusers",
        "transformers",
        "accelerate",
        "safetensors",
        "omegaconf",
        "ultralytics",
        "segment-anything",
    )
    .run_commands(
        # Core ComfyUI
        "cd /root && rm -rf ComfyUI && git clone https://github.com/comfyanonymous/ComfyUI.git",
        "cd /root/ComfyUI && pip install -r requirements.txt",

        # Custom nodes directory
        "mkdir -p /root/ComfyUI/custom_nodes",

        # IP-Adapter Plus - already used, kept here so clean builds always include it
        "cd /root/ComfyUI/custom_nodes && rm -rf ComfyUI_IPAdapter_plus && git clone https://github.com/cubiq/ComfyUI_IPAdapter_plus.git",

        # InstantID
        "cd /root/ComfyUI/custom_nodes && rm -rf ComfyUI_InstantID && git clone https://github.com/cubiq/ComfyUI_InstantID.git",


        # Impact Pack + Impact Subpack for FaceDetailer / detectors
        "cd /root/ComfyUI/custom_nodes && rm -rf ComfyUI-Impact-Pack && git clone https://github.com/ltdrdata/ComfyUI-Impact-Pack.git",
        "cd /root/ComfyUI/custom_nodes && rm -rf ComfyUI-Impact-Subpack && git clone https://github.com/ltdrdata/ComfyUI-Impact-Subpack.git",

        # Install custom node requirements when present
        "if [ -f /root/ComfyUI/custom_nodes/ComfyUI_InstantID/requirements.txt ]; then pip install -r /root/ComfyUI/custom_nodes/ComfyUI_InstantID/requirements.txt; fi",
        "if [ -f /root/ComfyUI/custom_nodes/ComfyUI-Impact-Pack/requirements.txt ]; then pip install -r /root/ComfyUI/custom_nodes/ComfyUI-Impact-Pack/requirements.txt; fi",
        "if [ -f /root/ComfyUI/custom_nodes/ComfyUI-Impact-Subpack/requirements.txt ]; then pip install -r /root/ComfyUI/custom_nodes/ComfyUI-Impact-Subpack/requirements.txt; fi",
    )
)


def _safe_remove(path: Path):
    if path.is_symlink() or path.is_file():
        path.unlink(missing_ok=True)
    elif path.exists():
        shutil.rmtree(path)


def _link_model_dir(target_name: str, candidates: list[str], create_if_missing: bool = True):
    chosen = None
    for candidate in candidates:
        p = Path(candidate)
        if p.exists():
            chosen = p
            break

    if chosen is None:
        chosen = Path(candidates[0])
        if create_if_missing:
            chosen.mkdir(parents=True, exist_ok=True)

    dest = Path("/root/ComfyUI/models") / target_name
    _safe_remove(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    os.symlink(str(chosen), str(dest))
    print(f"🔗 linked {dest} -> {chosen}")


@app.function(
    image=image,
    gpu="H100",
    volumes={"/models": volume},
    secrets=[modal.Secret.from_name("axstudio-comfyui-secrets")],
    timeout=3600,
    scaledown_window=300,
)
@modal.web_server(8188, startup_timeout=900)
def comfyui_server():
    os.environ["INSIGHTFACE_HOME"] = "/models/insightface"
    os.environ["HF_HOME"] = "/models/huggingface"
    os.environ["HF_HUB_CACHE"] = "/models/huggingface"

    # Standard ComfyUI model dirs
    _link_model_dir("checkpoints", ["/models/checkpoints"])
    _link_model_dir("loras", ["/models/loras"])
    _link_model_dir("vae", ["/models/vae"])
    _link_model_dir("embeddings", ["/models/embeddings"])
    _link_model_dir("controlnet", ["/models/controlnet"])
    _link_model_dir("upscale_models", ["/models/upscale_models"])
    _link_model_dir("clip_vision", ["/models/clip_vision"])

    # IPAdapter: support both names
    _link_model_dir("ipadapter", ["/models/ipadapter", "/models/ip-adapter"])

    # InstantID, FaceDetailer, detector-related dirs
    _link_model_dir("instantid", ["/models/instantid"])
    _link_model_dir("insightface", ["/models/insightface"])
    _link_model_dir("ultralytics", ["/models/ultralytics"])
    _link_model_dir("sams", ["/models/sams"])

    # Input/output
    Path("/models/input").mkdir(parents=True, exist_ok=True)
    Path("/models/output").mkdir(parents=True, exist_ok=True)
    Path("/models/huggingface").mkdir(parents=True, exist_ok=True)

    cmd = [
        "python",
        "/root/ComfyUI/main.py",
        "--listen", "0.0.0.0",
        "--port", "8188",
        "--output-directory", "/models/output",
        "--input-directory", "/models/input",
    ]

    print("🚀 Starting ComfyUI with IPAdapter + InstantID + Impact Pack...")
    print("Command:", " ".join(cmd))

    subprocess.Popen(cmd)
    time.sleep(8)
