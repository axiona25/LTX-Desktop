#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
PLAN_FILE = ROOT / "modal-workers" / "comfyui-clean" / "style_training" / "style_lora_plan.json"
DATASET_ROOT = ROOT / "modal-workers" / "comfyui-clean" / "style_training" / "datasets"
TRAINER_DIR = ROOT / "modal-workers" / "style-lora-trainer"
VOLUME_NAME = "axstudio-comfyui-clean-models"
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


def image_count(dataset_name: str) -> int:
    image_dir = DATASET_ROOT / dataset_name / "images"
    if not image_dir.exists():
        return 0
    return sum(1 for path in image_dir.iterdir() if path.suffix.lower() in IMAGE_EXTENSIONS and path.is_file())


def style_records(style_filter: str) -> list[dict[str, Any]]:
    plan = json.loads(PLAN_FILE.read_text(encoding="utf-8"))
    records = [item for item in plan["styles"] if isinstance(item, dict)]
    if style_filter:
        records = [item for item in records if item["style_id"] == style_filter]
        if not records:
            raise SystemExit(f"Style not found in plan: {style_filter}")
    return records


def upload_command(record: dict[str, Any]) -> list[str]:
    dataset_name = str(record["dataset_name"])
    return [
        "modal",
        "volume",
        "put",
        VOLUME_NAME,
        str(DATASET_ROOT / dataset_name),
        str(record["dataset_volume_path"]),
        "--force",
    ]


def train_command(record: dict[str, Any]) -> list[str]:
    return [
        "modal",
        "run",
        "app.py",
        "--style-id",
        str(record["style_id"]),
        "--dataset-name",
        str(record["dataset_name"]),
        "--output-name",
        str(record["output_name"]),
        "--checkpoint-name",
        "cyberrealisticXL_v100.safetensors",
        "--max-train-steps",
        str(record["base_training_steps"]),
        "--network-dim",
        "16",
        "--network-alpha",
        "16",
        "--learning-rate",
        "1e-4",
        "--save-every-n-steps",
        "500",
    ]


def run(command: list[str], cwd: Path | None = None) -> None:
    print("+ " + " ".join(command))
    subprocess.run(command, cwd=str(cwd) if cwd else None, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run or print AXSTUDIO Style LoRA training commands.")
    parser.add_argument("--style", default="", help="Limit to one style id")
    parser.add_argument("--execute", action="store_true", help="Actually run modal upload and training")
    parser.add_argument("--allow-small-dataset", action="store_true", help="Bypass minimum image count for experiments")
    args = parser.parse_args()

    ready = 0
    blocked = 0
    for record in style_records(args.style):
        count = image_count(str(record["dataset_name"]))
        minimum = int(record.get("minimum_dataset_images", 500))
        print(f"{record['style_id']}: {count}/{minimum} images")
        if count < minimum and not args.allow_small_dataset:
            print("  blocked: dataset below minimum")
            blocked += 1
            continue

        ready += 1
        upload = upload_command(record)
        train = train_command(record)
        if args.execute:
            run(upload)
            run(train, cwd=TRAINER_DIR)
        else:
            print("  upload: " + " ".join(upload))
            print("  train:  " + f"cd {TRAINER_DIR} && " + " ".join(train))

    print(f"ready={ready} blocked={blocked}")
    if not args.execute:
        print("Dry run only. Add --execute to run Modal jobs after checking cost and dataset quality.")


if __name__ == "__main__":
    main()
