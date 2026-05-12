from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

import modal


APP_NAME = "axstudio-identity-lora-trainer"
VOLUME_NAME = "axstudio-comfyui-clean-models"
DEFAULT_OUTPUT_NAME = "AXSTUDIO_identity_lora_v1"

MOUNT_DIR = Path("/models")
CHECKPOINT = MOUNT_DIR / "checkpoints" / "realvisxlV50_v50Bakedvae.safetensors"
SD_SCRIPTS_DIR = Path("/root/sd-scripts")

app = modal.App(APP_NAME)
volume = modal.Volume.from_name(VOLUME_NAME, create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("git", "build-essential", "libgl1", "libglib2.0-0")
    .pip_install(
        "torch",
        "torchvision",
        "torchaudio",
        "accelerate",
        "transformers",
        "diffusers",
        "safetensors",
        "opencv-python-headless",
        "pillow",
        "toml",
        "einops",
        "prodigyopt",
        "lion-pytorch",
        "voluptuous",
        "huggingface-hub",
        "sentencepiece",
    )
    .run_commands(
        "cd /root && rm -rf sd-scripts && git clone --depth=1 https://github.com/kohya-ss/sd-scripts.git",
        "cd /root/sd-scripts && pip install -r requirements.txt",
    )
)


def _run(command: list[str], *, cwd: Path | None = None) -> None:
    print("+ " + " ".join(command), flush=True)
    subprocess.run(command, cwd=str(cwd) if cwd else None, check=True)


def _write_dataset_config(dataset_dir: Path, config_path: Path, repeats: int) -> None:
    image_dir = dataset_dir / "images"
    if not image_dir.exists():
        raise FileNotFoundError(f"Dataset images dir not found: {image_dir}")
    config_path.write_text(
        "\n".join(
            [
                "[general]",
                "caption_extension = \".txt\"",
                "shuffle_caption = false",
                "keep_tokens = 1",
                "",
                "[[datasets]]",
                "resolution = 1024",
                "batch_size = 1",
                "enable_bucket = true",
                "bucket_reso_steps = 32",
                "bucket_no_upscale = false",
                "",
                "[[datasets.subsets]]",
                f"image_dir = \"{image_dir}\"",
                "caption_extension = \".txt\"",
                f"num_repeats = {repeats}",
                "",
            ]
        ),
        encoding="utf-8",
    )


def _count_dataset_images(dataset_dir: Path) -> int:
    return len(list((dataset_dir / "images").glob("*.png"))) + len(list((dataset_dir / "images").glob("*.jpg")))


def _resolve_lora_path(lora_name: str) -> Path:
    candidate = Path(lora_name)
    if candidate.suffix != ".safetensors":
        candidate = candidate.with_suffix(".safetensors")
    if candidate.is_absolute():
        return candidate
    return MOUNT_DIR / "loras" / candidate.name


def _incremental_output_name(base_lora_name: str, run_steps: int) -> str:
    return f"{Path(base_lora_name).stem}_plus{run_steps}"


@app.function(
    image=image,
    gpu="H100",
    volumes={str(MOUNT_DIR): volume},
    timeout=7200,
    scaledown_window=300,
)
def train_identity_lora(
    project_id: str = "PROGETTO_TEST",
    dataset_name: str = "identity_dataset_v1",
    output_name: str = DEFAULT_OUTPUT_NAME,
    repeats: int = 8,
    max_train_steps: int = 600,
    network_dim: int = 16,
    network_alpha: int = 8,
    learning_rate: float = 5e-5,
    base_lora_name: str = "",
    previous_train_steps: int = 0,
    save_every_n_steps: int = 0,
) -> dict[str, Any]:
    dataset_dir = MOUNT_DIR / "lora_training" / project_id / dataset_name
    output_dir = MOUNT_DIR / "loras"
    output_dir.mkdir(parents=True, exist_ok=True)

    if not CHECKPOINT.exists():
        raise FileNotFoundError(f"Checkpoint not found: {CHECKPOINT}")
    if not dataset_dir.exists():
        raise FileNotFoundError(f"Dataset not found in volume: {dataset_dir}")
    image_count = _count_dataset_images(dataset_dir)
    if image_count == 0:
        raise RuntimeError(f"No training images found in: {dataset_dir / 'images'}")
    if max_train_steps <= 0:
        raise ValueError("max_train_steps must be > 0")
    if previous_train_steps < 0:
        raise ValueError("previous_train_steps must be >= 0")
    if save_every_n_steps < 0:
        raise ValueError("save_every_n_steps must be >= 0")

    base_lora_path: Path | None = None
    if base_lora_name:
        base_lora_path = _resolve_lora_path(base_lora_name)
        if not base_lora_path.exists():
            raise FileNotFoundError(f"Base LoRA for incremental training not found: {base_lora_path}")
        if output_name == DEFAULT_OUTPUT_NAME:
            output_name = _incremental_output_name(base_lora_path.name, max_train_steps)

    work_dir = Path("/tmp/axstudio_lora_train")
    work_dir.mkdir(parents=True, exist_ok=True)
    dataset_config = work_dir / "dataset_config.toml"
    _write_dataset_config(dataset_dir, dataset_config, repeats)

    metadata = {
        "project_id": project_id,
        "dataset_name": dataset_name,
        "dataset_dir": str(dataset_dir),
        "image_count": image_count,
        "checkpoint": str(CHECKPOINT),
        "output_name": output_name,
        "repeats": repeats,
        "max_train_steps": max_train_steps,
        "network_dim": network_dim,
        "network_alpha": network_alpha,
        "learning_rate": learning_rate,
        "training_mode": "incremental" if base_lora_path else "fresh",
        "base_lora_name": base_lora_name or None,
        "base_lora_path": str(base_lora_path) if base_lora_path else None,
        "previous_train_steps": previous_train_steps,
        "run_train_steps": max_train_steps,
        "estimated_total_train_steps": previous_train_steps + max_train_steps,
        "save_every_n_steps": save_every_n_steps,
    }
    (work_dir / "train_request.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    command = [
        "accelerate",
        "launch",
        "--num_cpu_threads_per_process",
        "2",
        "sdxl_train_network.py",
        "--pretrained_model_name_or_path",
        str(CHECKPOINT),
        "--dataset_config",
        str(dataset_config),
        "--output_dir",
        str(output_dir),
        "--output_name",
        output_name,
        "--save_model_as",
        "safetensors",
        "--network_module",
        "networks.lora",
        "--network_dim",
        str(network_dim),
        "--network_alpha",
        str(network_alpha),
        "--network_train_unet_only",
        "--learning_rate",
        str(learning_rate),
        "--train_batch_size",
        "1",
        "--max_train_steps",
        str(max_train_steps),
        "--mixed_precision",
        "bf16",
        "--save_precision",
        "bf16",
        "--optimizer_type",
        "adafactor",
        "--optimizer_args",
        "scale_parameter=False",
        "relative_step=False",
        "warmup_init=False",
        "--lr_scheduler",
        "constant",
        "--gradient_checkpointing",
        "--cache_text_encoder_outputs",
        "--cache_text_encoder_outputs_to_disk",
        "--cache_latents",
        "--cache_latents_to_disk",
        "--bucket_reso_steps",
        "32",
        "--caption_extension",
        ".txt",
        "--seed",
        "1778569901",
        "--max_data_loader_n_workers",
        "1",
        "--persistent_data_loader_workers",
    ]
    if base_lora_path:
        command.extend(["--network_weights", str(base_lora_path)])
    if save_every_n_steps:
        command.extend(["--save_every_n_steps", str(save_every_n_steps)])

    _run(command, cwd=SD_SCRIPTS_DIR)

    output_path = output_dir / f"{output_name}.safetensors"
    if not output_path.exists():
        candidates = sorted(output_dir.glob(f"{output_name}*.safetensors"))
        if not candidates:
            raise FileNotFoundError(f"Training finished but no LoRA output found for {output_name}")
        output_path = candidates[-1]

    try:
        metadata_path = output_dir / f"{output_path.stem}.metadata.json"
        metadata_path.write_text(json.dumps({**metadata, "output_path": str(output_path)}, indent=2), encoding="utf-8")
        volume.commit()
    except Exception as exc:
        print(f"Volume commit warning: {exc}")

    result = {
        **metadata,
        "success": True,
        "output_path": str(output_path),
        "volume_output_path": f"/loras/{output_path.name}",
        "metadata_path": str(output_dir / f"{output_path.stem}.metadata.json"),
        "volume_metadata_path": f"/loras/{output_path.stem}.metadata.json",
    }
    print(json.dumps(result, indent=2), flush=True)
    return result


@app.local_entrypoint()
def main(
    project_id: str = "PROGETTO_TEST",
    dataset_name: str = "identity_dataset_v1",
    output_name: str = DEFAULT_OUTPUT_NAME,
    repeats: int = 8,
    max_train_steps: int = 600,
    network_dim: int = 16,
    network_alpha: int = 8,
    learning_rate: float = 5e-5,
    base_lora_name: str = "",
    previous_train_steps: int = 0,
    save_every_n_steps: int = 0,
) -> None:
    result = train_identity_lora.remote(
        project_id=project_id,
        dataset_name=dataset_name,
        output_name=output_name,
        repeats=repeats,
        max_train_steps=max_train_steps,
        network_dim=network_dim,
        network_alpha=network_alpha,
        learning_rate=learning_rate,
        base_lora_name=base_lora_name,
        previous_train_steps=previous_train_steps,
        save_every_n_steps=save_every_n_steps,
    )
    print(json.dumps(result, indent=2))
