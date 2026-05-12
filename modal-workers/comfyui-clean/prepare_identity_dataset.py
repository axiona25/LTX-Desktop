from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import cv2
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


PROJECT_BASE = Path("/Users/r.amoroso/Documents/AXSTUDIO/modal-workers/comfyui-clean/Progetti")
TRIGGER_TOKEN = "axstudio_person_v1"


@dataclass(frozen=True)
class SampleSpec:
    name: str
    box: tuple[float, float, float, float] | None
    caption: str
    transform: str = "none"


def _detect_face(image_path: Path) -> tuple[int, int, int, int]:
    image = cv2.imread(str(image_path))
    if image is None:
        raise ValueError(f"Cannot decode image: {image_path}")
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = cascade.detectMultiScale(gray, scaleFactor=1.05, minNeighbors=4, minSize=(120, 120))
    if len(faces) == 0:
        raise RuntimeError(f"No face detected in master image: {image_path}")
    x, y, w, h = max(faces, key=lambda item: int(item[2]) * int(item[3]))
    return int(x), int(y), int(x + w), int(y + h)


def _expand_box(
    box: tuple[float, float, float, float],
    image_size: tuple[int, int],
    *,
    x_factor: float,
    y_factor: float,
    y_shift: float = 0.0,
) -> tuple[int, int, int, int]:
    width, height = image_size
    x1, y1, x2, y2 = box
    bw = x2 - x1
    bh = y2 - y1
    cx = (x1 + x2) / 2
    cy = (y1 + y2) / 2 + bh * y_shift
    nw = bw * x_factor
    nh = bh * y_factor
    left = max(0, int(round(cx - nw / 2)))
    top = max(0, int(round(cy - nh / 2)))
    right = min(width, int(round(cx + nw / 2)))
    bottom = min(height, int(round(cy + nh / 2)))
    if right <= left or bottom <= top:
        raise ValueError(f"Invalid crop box: {(left, top, right, bottom)}")
    return left, top, right, bottom


def _rel_box(face: tuple[int, int, int, int], rel: tuple[float, float, float, float]) -> tuple[float, float, float, float]:
    x1, y1, x2, y2 = face
    fw = x2 - x1
    fh = y2 - y1
    rx1, ry1, rx2, ry2 = rel
    return x1 + fw * rx1, y1 + fh * ry1, x1 + fw * rx2, y1 + fh * ry2


def _fit_square(image: Image.Image, size: int = 1024, fill: tuple[int, int, int] = (232, 232, 228)) -> Image.Image:
    contained = ImageOps.contain(image.convert("RGB"), (size, size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (size, size), fill)
    x = (size - contained.width) // 2
    y = (size - contained.height) // 2
    canvas.paste(contained, (x, y))
    return canvas


def _apply_transform(image: Image.Image, transform: str) -> Image.Image:
    if transform == "none":
        return image
    if transform == "brightness_plus":
        return ImageEnhance.Brightness(image).enhance(1.08)
    if transform == "brightness_minus":
        return ImageEnhance.Brightness(image).enhance(0.92)
    if transform == "contrast_plus":
        return ImageEnhance.Contrast(image).enhance(1.10)
    if transform == "soft_light":
        return ImageEnhance.Contrast(ImageEnhance.Brightness(image).enhance(1.04)).enhance(0.96)
    if transform == "sharpen":
        return image.filter(ImageFilter.UnsharpMask(radius=1.2, percent=80, threshold=3))
    if transform == "rotate_left":
        return image.rotate(-2.0, resample=Image.Resampling.BICUBIC, expand=False, fillcolor=(232, 232, 228))
    if transform == "rotate_right":
        return image.rotate(2.0, resample=Image.Resampling.BICUBIC, expand=False, fillcolor=(232, 232, 228))
    raise ValueError(f"Unsupported transform: {transform}")


def _save_sample(source: Image.Image, spec: SampleSpec, output_dir: Path, index: int) -> dict[str, object]:
    if spec.box is None:
        crop = source
    else:
        crop = source.crop(tuple(int(round(value)) for value in spec.box))
    prepared = _fit_square(_apply_transform(crop, spec.transform))
    filename = f"{index:03d}_{spec.name}.png"
    image_path = output_dir / filename
    caption_path = image_path.with_suffix(".txt")
    prepared.save(image_path, quality=95)
    caption_path.write_text(spec.caption + "\n", encoding="utf-8")
    return {
        "image": str(image_path),
        "caption": str(caption_path),
        "name": spec.name,
        "transform": spec.transform,
        "box": spec.box,
    }


def _contact_sheet(samples: list[dict[str, object]], output_path: Path) -> None:
    thumbs: list[tuple[str, Image.Image]] = []
    for sample in samples:
        path = Path(str(sample["image"]))
        thumbs.append((path.stem, Image.open(path).convert("RGB")))

    cell_w = 240
    cell_h = 292
    cols = 5
    rows = (len(thumbs) + cols - 1) // cols
    canvas = Image.new("RGB", (cols * cell_w, rows * cell_h), (246, 246, 244))
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 15)
    except Exception:
        font = ImageFont.load_default()

    for idx, (label, image) in enumerate(thumbs):
        col = idx % cols
        row = idx // cols
        thumb = ImageOps.contain(image, (cell_w - 20, cell_w - 20), Image.Resampling.LANCZOS)
        x = col * cell_w + (cell_w - thumb.width) // 2
        y = row * cell_h + 12
        canvas.paste(thumb, (x, y))
        draw.text((col * cell_w + 10, row * cell_h + cell_w + 18), label, fill=(30, 30, 30), font=font)
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
    face_box = _expand_box(face, image_size, x_factor=1.35, y_factor=1.42, y_shift=0.03)
    close_face_box = _expand_box(face, image_size, x_factor=1.12, y_factor=1.12, y_shift=0.0)

    base_caption = (
        f"{TRIGGER_TOKEN}, adult woman, same facial identity, front facing portrait, "
        "hazel brown eyes, defined eyebrows, straight nose bridge, natural lips, "
        "defined chin, cheekbones, natural skin texture"
    )
    specs = [
        SampleSpec("full_original", None, base_caption + ", upper body, neutral expression"),
        SampleSpec("full_brightness_plus", None, base_caption + ", upper body, brighter lighting", "brightness_plus"),
        SampleSpec("full_brightness_minus", None, base_caption + ", upper body, softer darker lighting", "brightness_minus"),
        SampleSpec("full_contrast_plus", None, base_caption + ", upper body, slightly higher contrast", "contrast_plus"),
        SampleSpec("face_square", face_box, base_caption + ", face crop, complete face visible"),
        SampleSpec("face_square_sharpen", face_box, base_caption + ", face crop, sharp facial details", "sharpen"),
        SampleSpec("face_square_soft_light", face_box, base_caption + ", face crop, soft even lighting", "soft_light"),
        SampleSpec("face_square_rotate_left", face_box, base_caption + ", face crop, slight head angle left", "rotate_left"),
        SampleSpec("face_square_rotate_right", face_box, base_caption + ", face crop, slight head angle right", "rotate_right"),
        SampleSpec("face_close", close_face_box, base_caption + ", close-up face, eyes nose mouth visible"),
        SampleSpec("face_close_sharpen", close_face_box, base_caption + ", close-up face, sharp eyes nose lips", "sharpen"),
        SampleSpec("eyes_brows", _rel_box(face, (-0.03, 0.18, 1.03, 0.48)), f"{TRIGGER_TOKEN}, close-up eyes and eyebrows, hazel brown eyes, matching eye shape, matching eyebrow shape"),
        SampleSpec("eyes_brows_sharpen", _rel_box(face, (-0.03, 0.18, 1.03, 0.48)), f"{TRIGGER_TOKEN}, close-up eyes and eyebrows, sharp iris detail, defined eyebrows", "sharpen"),
        SampleSpec("left_eye", _rel_box(face, (0.06, 0.20, 0.47, 0.45)), f"{TRIGGER_TOKEN}, close-up left eye, hazel brown iris, eyelid shape, eyebrow detail"),
        SampleSpec("right_eye", _rel_box(face, (0.53, 0.20, 0.94, 0.45)), f"{TRIGGER_TOKEN}, close-up right eye, hazel brown iris, eyelid shape, eyebrow detail"),
        SampleSpec("nose", _rel_box(face, (0.28, 0.35, 0.72, 0.72)), f"{TRIGGER_TOKEN}, close-up nose, straight nose bridge, natural nose tip, nostril shape"),
        SampleSpec("mouth", _rel_box(face, (0.22, 0.63, 0.78, 0.88)), f"{TRIGGER_TOKEN}, close-up mouth and lips, natural lips, closed mouth shape"),
        SampleSpec("mouth_chin", _rel_box(face, (0.16, 0.62, 0.84, 1.05)), f"{TRIGGER_TOKEN}, close-up lips and chin, natural mouth shape, defined chin"),
        SampleSpec("cheeks_midface", _rel_box(face, (0.02, 0.34, 0.98, 0.78)), f"{TRIGGER_TOKEN}, close-up midface, nose cheeks cheekbones, natural expression lines"),
        SampleSpec("forehead_brows", _rel_box(face, (0.02, -0.06, 0.98, 0.30)), f"{TRIGGER_TOKEN}, close-up forehead and eyebrows, natural forehead, defined eyebrow shape"),
        SampleSpec("jaw_chin", _rel_box(face, (0.08, 0.64, 0.92, 1.10)), f"{TRIGGER_TOKEN}, close-up jawline and chin, natural lips, chin and jaw shape"),
    ]

    samples = [_save_sample(source, spec, images_dir, index + 1) for index, spec in enumerate(specs)]
    sheet_path = dataset_dir / "identity_dataset_v1_contact_sheet.png"
    _contact_sheet(samples, sheet_path)

    metadata = {
        "project_id": project_id,
        "dataset_name": dataset_name,
        "source_master": str(master_path),
        "trigger_token": TRIGGER_TOKEN,
        "face_bbox_xyxy": face,
        "sample_count": len(samples),
        "rule": "non-generative crops and conservative image adjustments only",
        "samples": samples,
        "contact_sheet": str(sheet_path),
    }
    (dataset_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    (dataset_dir / "README.md").write_text(
        "# identity_dataset_v1\n\n"
        "Dataset built from the project master only. It uses non-generative crops and conservative "
        "brightness/contrast/sharpness/rotation changes. It is intended as a first identity LoRA "
        "training pack and should be reviewed visually before training.\n\n"
        f"Trigger token: `{TRIGGER_TOKEN}`\n",
        encoding="utf-8",
    )
    return dataset_dir


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare a conservative identity LoRA dataset from project master_final.png.")
    parser.add_argument("--project", required=True)
    parser.add_argument("--dataset-name", default="identity_dataset_v1")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    dataset_dir = build_dataset(args.project, args.dataset_name, args.overwrite)
    print(f"dataset: {dataset_dir}")
    print(f"images: {dataset_dir / 'images'}")
    print(f"contact_sheet: {dataset_dir / 'identity_dataset_v1_contact_sheet.png'}")


if __name__ == "__main__":
    main()
