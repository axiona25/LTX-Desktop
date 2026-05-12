from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

from prepare_identity_dataset import PROJECT_BASE, TRIGGER_TOKEN, _detect_face, _expand_box, _rel_box


def _fit_square(image: Image.Image, size: int = 1024, fill: tuple[int, int, int] = (232, 232, 228)) -> Image.Image:
    contained = ImageOps.contain(image.convert("RGB"), (size, size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (size, size), fill)
    canvas.paste(contained, ((size - contained.width) // 2, (size - contained.height) // 2))
    return canvas


def _transform(image: Image.Image, name: str) -> Image.Image:
    if name == "none":
        return image
    if name == "sharpen":
        return image.filter(ImageFilter.UnsharpMask(radius=1.1, percent=75, threshold=3))
    if name == "soft_contrast":
        return ImageEnhance.Contrast(ImageEnhance.Brightness(image).enhance(1.03)).enhance(1.06)
    if name == "brightness_minus":
        return ImageEnhance.Brightness(image).enhance(0.96)
    if name == "rotate_left":
        return image.rotate(-1.0, resample=Image.Resampling.BICUBIC, expand=False, fillcolor=(232, 232, 228))
    if name == "rotate_right":
        return image.rotate(1.0, resample=Image.Resampling.BICUBIC, expand=False, fillcolor=(232, 232, 228))
    raise ValueError(f"Unsupported transform: {name}")


def _save_sample(
    source: Image.Image,
    output_dir: Path,
    index: int,
    name: str,
    box: tuple[float, float, float, float] | None,
    caption: str,
    transform: str = "none",
) -> dict[str, object]:
    crop = source if box is None else source.crop(tuple(int(round(v)) for v in box))
    prepared = _fit_square(_transform(crop, transform))
    image_path = output_dir / f"{index:03d}_{name}.png"
    caption_path = image_path.with_suffix(".txt")
    prepared.save(image_path, quality=95)
    caption_path.write_text(caption + "\n", encoding="utf-8")
    return {
        "image": str(image_path),
        "caption": str(caption_path),
        "name": name,
        "box": box,
        "transform": transform,
    }


def _contact_sheet(samples: list[dict[str, object]], output_path: Path) -> None:
    cell_w = 260
    cell_h = 310
    cols = 4
    rows = (len(samples) + cols - 1) // cols
    canvas = Image.new("RGB", (cols * cell_w, rows * cell_h), (246, 246, 244))
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 15)
    except Exception:
        font = ImageFont.load_default()
    for index, sample in enumerate(samples):
        image = Image.open(str(sample["image"])).convert("RGB")
        thumb = ImageOps.contain(image, (cell_w - 22, cell_w - 22), Image.Resampling.LANCZOS)
        col = index % cols
        row = index // cols
        x = col * cell_w + (cell_w - thumb.width) // 2
        y = row * cell_h + 12
        canvas.paste(thumb, (x, y))
        draw.text((col * cell_w + 12, row * cell_h + cell_w + 20), str(sample["name"]), fill=(30, 30, 30), font=font)
    canvas.save(output_path, quality=95)


def build_dataset(project_id: str, dataset_name: str, overwrite: bool) -> Path:
    project_dir = PROJECT_BASE / project_id
    master_path = project_dir / "MasterID" / "master_final.png"
    dataset_dir = project_dir / "LoRA" / dataset_name
    images_dir = dataset_dir / "images"

    if not master_path.exists():
        raise FileNotFoundError(f"Master not found: {master_path}")
    if dataset_dir.exists() and not overwrite:
        raise FileExistsError(f"Dataset already exists: {dataset_dir}")
    images_dir.mkdir(parents=True, exist_ok=True)

    source = Image.open(master_path).convert("RGB")
    face = _detect_face(master_path)
    image_size = source.size
    face_box = _expand_box(face, image_size, x_factor=1.18, y_factor=1.20, y_shift=0.0)

    identity_caption = (
        f"{TRIGGER_TOKEN}, same adult woman identity, front-facing face, hazel brown eyes, "
        "longer narrow nose, straight vertical nose bridge, refined natural nose tip, "
        "narrow nostril base, natural lips, realistic skin texture"
    )
    nose_caption = (
        f"{TRIGGER_TOKEN}, close-up nose and center face, longer narrow nose, straight nose bridge, "
        "refined nose tip, narrow nostril base, realistic nose anatomy, natural midface"
    )

    specs: list[tuple[str, tuple[float, float, float, float] | None, str, str]] = [
        ("face_control", face_box, identity_caption + ", complete face visible", "none"),
        ("face_control_sharpen", face_box, identity_caption + ", sharp complete face", "sharpen"),
        ("midface_control", _rel_box(face, (0.05, 0.22, 0.95, 0.82)), identity_caption + ", midface and cheeks visible", "none"),
        ("midface_soft_contrast", _rel_box(face, (0.05, 0.22, 0.95, 0.82)), identity_caption + ", midface soft contrast", "soft_contrast"),
        ("nose_center", _rel_box(face, (0.25, 0.28, 0.75, 0.76)), nose_caption, "none"),
        ("nose_center_sharpen", _rel_box(face, (0.25, 0.28, 0.75, 0.76)), nose_caption + ", sharp bridge and tip", "sharpen"),
        ("nose_center_soft", _rel_box(face, (0.25, 0.28, 0.75, 0.76)), nose_caption + ", soft even light", "soft_contrast"),
        ("nose_center_dark", _rel_box(face, (0.25, 0.28, 0.75, 0.76)), nose_caption + ", natural shadows", "brightness_minus"),
        ("nose_left_angle", _rel_box(face, (0.24, 0.28, 0.76, 0.76)), nose_caption + ", subtle left micro angle", "rotate_left"),
        ("nose_right_angle", _rel_box(face, (0.24, 0.28, 0.76, 0.76)), nose_caption + ", subtle right micro angle", "rotate_right"),
        ("eyes_nose", _rel_box(face, (0.12, 0.18, 0.88, 0.68)), identity_caption + ", eyes and nose relationship", "none"),
        ("nose_mouth", _rel_box(face, (0.18, 0.36, 0.82, 0.90)), nose_caption + ", nose mouth distance and proportions", "none"),
    ]

    samples = [
        _save_sample(source, images_dir, index + 1, name, box, caption, transform)
        for index, (name, box, caption, transform) in enumerate(specs)
    ]
    sheet_path = dataset_dir / f"{dataset_name}_contact_sheet.png"
    _contact_sheet(samples, sheet_path)

    metadata = {
        "project_id": project_id,
        "dataset_name": dataset_name,
        "source_master": str(master_path),
        "trigger_token": TRIGGER_TOKEN,
        "face_bbox_xyxy": face,
        "sample_count": len(samples),
        "focus": "nose and midface proportions",
        "rule": "non-generative crops and conservative image adjustments only",
        "samples": samples,
        "contact_sheet": str(sheet_path),
    }
    (dataset_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    (dataset_dir / "README.md").write_text(
        f"# {dataset_name}\n\n"
        "Nose-focused incremental dataset derived only from the project master. "
        "Use it for short incremental LoRA refinement, not a full retrain.\n\n"
        f"Trigger token: `{TRIGGER_TOKEN}`\n",
        encoding="utf-8",
    )
    return dataset_dir


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare a nose-focused incremental identity LoRA dataset.")
    parser.add_argument("--project", required=True)
    parser.add_argument("--dataset-name", default="identity_dataset_v2_nose_focus")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    dataset_dir = build_dataset(args.project, args.dataset_name, args.overwrite)
    print(f"dataset: {dataset_dir}")
    print(f"images: {dataset_dir / 'images'}")
    print(f"contact_sheet: {dataset_dir / (args.dataset_name + '_contact_sheet.png')}")


if __name__ == "__main__":
    main()
