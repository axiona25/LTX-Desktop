#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from typing import Any

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
STYLE_PROFILES_FILE = ROOT / "src" / "config" / "styleProfiles.json"
OUTPUT_ROOT = ROOT / "modal-workers" / "comfyui-clean" / "style_training" / "datasets"
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


def load_profile(style_id: str) -> dict[str, Any]:
    data = json.loads(STYLE_PROFILES_FILE.read_text(encoding="utf-8"))
    for profile in data["styles"]:
        if isinstance(profile, dict) and profile.get("id") == style_id:
            return profile
    raise SystemExit(f"Unknown style id: {style_id}")


def image_files(source_dir: Path) -> list[Path]:
    return sorted(path for path in source_dir.iterdir() if path.suffix.lower() in IMAGE_EXTENSIONS and path.is_file())


def convert_to_png(source: Path, destination: Path) -> None:
    with Image.open(source) as image:
        image.convert("RGB").save(destination, "PNG")


def sidecar_caption(source: Path) -> str | None:
    caption_path = source.with_suffix(".txt")
    if not caption_path.exists():
        return None
    caption = caption_path.read_text(encoding="utf-8").strip()
    return caption or None


def generated_caption(profile: dict[str, Any], source: Path) -> str:
    trigger = str(profile.get("trigger_token") or "")
    subject_hint = source.stem.replace("_", " ").replace("-", " ")
    prefix = str(profile.get("prompt_prefix") or "")
    suffix = str(profile.get("prompt_suffix") or "")
    return ", ".join(part for part in [trigger, subject_hint, prefix, suffix] if part)


def write_readme(dataset_dir: Path, profile: dict[str, Any]) -> None:
    lora_training = profile.get("lora_training") if isinstance(profile.get("lora_training"), dict) else {}
    captioning_rules = lora_training.get("captioning_rules") if isinstance(lora_training.get("captioning_rules"), list) else []
    text = [
        f"# {profile['id']} Style LoRA Dataset",
        "",
        f"Trigger token: `{profile.get('trigger_token', '')}`",
        f"Minimum images: {lora_training.get('dataset_size_min', 500)}",
        f"Recommended images: {lora_training.get('dataset_size_recommended', 1200)}",
        "",
        "Place curated source images in a separate folder and run:",
        "",
        "```bash",
        f"/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style {profile['id']} --source-dir /path/to/curated/images --force",
        "```",
        "",
        "Captioning rules:",
        "",
        *[f"- {rule}" for rule in captioning_rules],
        "",
    ]
    (dataset_dir / "README.md").write_text("\n".join(text), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare a local AXSTUDIO style LoRA dataset.")
    parser.add_argument("--style", required=True, help="AXSTUDIO style id, for example pixel_art")
    parser.add_argument("--dataset-name", default="", help="Defaults to <style>_v1")
    parser.add_argument("--source-dir", default="", help="Curated images with optional .txt sidecar captions")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--init-empty", action="store_true", help="Create an empty dataset scaffold only")
    args = parser.parse_args()

    profile = load_profile(args.style)
    dataset_name = args.dataset_name or f"{args.style}_v1"
    dataset_dir = OUTPUT_ROOT / dataset_name
    image_dir = dataset_dir / "images"
    if dataset_dir.exists() and args.force:
        shutil.rmtree(dataset_dir)
    image_dir.mkdir(parents=True, exist_ok=True)
    write_readme(dataset_dir, profile)

    records: list[dict[str, str]] = []
    if args.source_dir:
        source_dir = Path(args.source_dir).expanduser().resolve()
        if not source_dir.exists():
            raise FileNotFoundError(f"Source dir not found: {source_dir}")
        for index, source in enumerate(image_files(source_dir), start=1):
            stem = f"{index:04d}_{source.stem}"
            image_path = image_dir / f"{stem}.png"
            caption_path = image_dir / f"{stem}.txt"
            convert_to_png(source, image_path)
            caption = sidecar_caption(source) or generated_caption(profile, source)
            if profile.get("trigger_token") and str(profile["trigger_token"]) not in caption:
                caption = f"{profile['trigger_token']}, {caption}"
            caption_path.write_text(caption + "\n", encoding="utf-8")
            records.append({"source": str(source), "image": str(image_path), "caption": caption})
    elif not args.init_empty:
        raise SystemExit("Provide --source-dir or use --init-empty to create only the scaffold.")

    manifest = {
        "dataset_name": dataset_name,
        "style_id": args.style,
        "trigger_token": profile.get("trigger_token"),
        "image_count": len(records),
        "quality": "curated_required" if not records else "prepared_unvalidated",
        "warning": "Do not train or promote until the dataset has been manually reviewed for quality, IP safety and caption accuracy.",
        "records": records,
    }
    (dataset_dir / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(records)} image/caption pairs to {dataset_dir}")


if __name__ == "__main__":
    main()
