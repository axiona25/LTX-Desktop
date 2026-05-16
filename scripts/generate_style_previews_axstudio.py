#!/usr/bin/env python3
"""Generate AXSTUDIO style preview images with the deployed ComfyUI worker.

This replaces the generic downloaded/fallback thumbnails with generated previews
that visually represent each style preset. The script is resumable and records
the exact prompt, seed, and ComfyUI history filename for each generated image.
"""
from __future__ import annotations

import argparse
import json
import random
import re
import shutil
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Any

try:
    from PIL import Image, ImageDraw, ImageFont
except Exception as exc:  # pragma: no cover
    raise SystemExit(
        "Pillow is required. Run with backend/.venv/bin/python "
        "scripts/generate_style_previews_axstudio.py"
    ) from exc


ROOT = Path(__file__).resolve().parents[1]
STYLES_FILE = ROOT / "frontend" / "constants" / "imageStyles.ts"
OUT_DIR = ROOT / "public" / "style-previews"
DEFAULT_ENDPOINT = "https://axiona2025--axstudio-comfyui-clean-comfyui-server.modal.run"
DEFAULT_CHECKPOINT = "cyberrealisticXL_v100.safetensors"


@dataclass(frozen=True)
class StylePreset:
    style_id: str
    label: str
    category: str
    prompt_modifier: str
    negative_modifier: str


CATEGORY_BASE_PROMPTS = {
    "realistic_photo": (
        "A premium realistic studio image of a single fully clothed adult creative director wearing a simple professional outfit "
        "with a refined camera on a clean tabletop, centered composition, believable materials, clear focal subject, no text"
    ),
    "cinematic": (
        "A cinematic scene of a single fully clothed adult creative director standing in a modern studio at dusk, dramatic environment, "
        "movie-still composition, clear focal subject, no text"
    ),
    "illustration_drawing": (
        "A polished illustrated scene of a single fully clothed adult creative director with a small creative camera in a clean studio, "
        "clear subject, expressive composition, no text"
    ),
    "animation_cartoon": (
        "A charming animated scene of a friendly fully clothed adult character with a small creative camera in a bright studio, "
        "simple background, clear subject, no text"
    ),
    "anime_manga": (
        "A single expressive fully clothed anime character in a clean creative studio with a small camera prop, centered portrait scene, "
        "clear silhouette, no text"
    ),
    "three_d_render": (
        "A single stylized 3D character and a compact futuristic camera on a clean pedestal, studio lighting, "
        "centered composition, no text"
    ),
    "graphic_design": (
        "A clean graphic composition for a premium creative studio campaign, one central camera-inspired object, "
        "bold visual hierarchy, no readable text, no logo"
    ),
    "fantasy_scifi": (
        "A single fully clothed adult character in an imaginative futuristic studio with a luminous camera artifact, rich atmosphere, "
        "centered composition, no text"
    ),
    "artistic_painting": (
        "A painted portrait scene of a single fully clothed adult creative director with a small camera on a simple table, balanced composition, "
        "clear subject, no text"
    ),
    "retro_special": (
        "A retro-inspired creative scene with a single character and a compact camera object, centered composition, "
        "strong visual identity, no text"
    ),
    "custom": (
        "A refined neutral AXSTUDIO style preview, abstract creative object, clean dark studio, centered composition, no text"
    ),
}

STYLE_BASE_OVERRIDES = {
    "product_photography": (
        "A premium perfume bottle and compact camera object on a clean pedestal, commercial studio setup, "
        "controlled reflections, no text"
    ),
    "architectural_photography": (
        "A modern luxury interior studio with large windows, clean architecture, realistic materials, straight lines, no text"
    ),
    "documentary_style": (
        "A natural candid documentary-style moment of a fully clothed creative adult in a real studio workspace, no text"
    ),
    "matte_painting": (
        "A wide cinematic environment with a small creative studio structure in the distance, atmospheric perspective, no text"
    ),
    "isometric": (
        "An isometric miniature creative studio with a tiny camera workstation, clean geometric layout, no text"
    ),
    "low_poly": (
        "A low-poly miniature creative studio scene with a single character and camera object, readable faceted forms, no text"
    ),
    "infographic_style": (
        "A clean modern information-design composition with abstract panels, icons, and one central creative object, "
        "no readable text, no logo"
    ),
    "abstract": (
        "An abstract composition inspired by a creative studio and camera optics, expressive shapes, no literal text, no logo"
    ),
    "pixel_art": (
        "A square pixel-art scene of a tiny creative studio with a character and camera object, crisp pixel grid, no text"
    ),
}


def _extract_prop(line: str, prop: str) -> str:
    for quote in ("'", '"'):
        pattern = rf"{re.escape(prop)}:\s*{quote}((?:\\{quote}|[^{quote}])*){quote}"
        match = re.search(pattern, line)
        if match:
            return match.group(1).replace(f"\\{quote}", quote)
    return ""


def read_styles() -> list[StylePreset]:
    styles: list[StylePreset] = []
    for line in STYLES_FILE.read_text().splitlines():
        if "style_id:" not in line:
            continue
        style_id = _extract_prop(line, "style_id")
        label = _extract_prop(line, "style_label")
        category = _extract_prop(line, "style_category")
        prompt_modifier = _extract_prop(line, "style_prompt_modifier")
        negative_modifier = _extract_prop(line, "style_negative_modifier")
        if style_id and label and category:
            styles.append(StylePreset(style_id, label, category, prompt_modifier, negative_modifier))
    styles.append(StylePreset("custom", "Custom Style", "custom", "", ""))
    seen: set[str] = set()
    unique: list[StylePreset] = []
    for style in styles:
        if style.style_id in seen:
            continue
        seen.add(style.style_id)
        unique.append(style)
    return unique


def request_json(endpoint: str, path: str, *, method: str = "GET", payload: dict[str, Any] | None = None, timeout: int = 120) -> dict[str, Any]:
    data = None
    headers: dict[str, str] = {}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(endpoint.rstrip("/") + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {request.full_url} failed with HTTP {exc.code}: {body}") from exc
    return json.loads(body) if body else {}


def download_image(endpoint: str, filename: str, subfolder: str, output_type: str) -> bytes:
    query = urllib.parse.urlencode({"filename": filename, "subfolder": subfolder, "type": output_type})
    with urllib.request.urlopen(endpoint.rstrip("/") + "/view?" + query, timeout=180) as response:
        return response.read()


def build_prompt(style: StylePreset) -> tuple[str, str]:
    base = STYLE_BASE_OVERRIDES.get(style.style_id) or CATEGORY_BASE_PROMPTS.get(style.category) or CATEGORY_BASE_PROMPTS["custom"]
    prompt_parts = [
        base,
        style.prompt_modifier,
        "square preview image, one clear subject, high quality, polished visual, accurate composition",
    ]
    negative_parts = [
        "text, words, logo, watermark, signature, UI, frame, border, low quality, blurry, malformed, duplicated subject, "
        "nude, topless, bare chest, exposed breasts, lingerie, underwear",
        style.negative_modifier,
    ]
    return ", ".join(part for part in prompt_parts if part.strip()), ", ".join(part for part in negative_parts if part.strip())


def build_workflow(*, checkpoint: str, prompt: str, negative_prompt: str, seed: int, steps: int, cfg: float, filename_prefix: str, size: int) -> dict[str, Any]:
    return {
        "1": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": checkpoint},
        },
        "2": {
            "class_type": "CLIPTextEncode",
            "inputs": {"clip": ["1", 1], "text": prompt},
        },
        "3": {
            "class_type": "CLIPTextEncode",
            "inputs": {"clip": ["1", 1], "text": negative_prompt},
        },
        "4": {
            "class_type": "EmptyLatentImage",
            "inputs": {"width": size, "height": size, "batch_size": 1},
        },
        "5": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["1", 0],
                "seed": seed,
                "steps": steps,
                "cfg": cfg,
                "sampler_name": "dpmpp_2m_sde",
                "scheduler": "karras",
                "positive": ["2", 0],
                "negative": ["3", 0],
                "latent_image": ["4", 0],
                "denoise": 1.0,
            },
        },
        "6": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["5", 0], "vae": ["1", 2]},
        },
        "7": {
            "class_type": "SaveImage",
            "inputs": {"images": ["6", 0], "filename_prefix": filename_prefix},
        },
    }


def submit_prompt(endpoint: str, workflow: dict[str, Any]) -> str:
    response = request_json(endpoint, "/prompt", method="POST", payload={"prompt": workflow}, timeout=120)
    prompt_id = response.get("prompt_id")
    if not isinstance(prompt_id, str) or not prompt_id:
        raise RuntimeError(f"/prompt did not return prompt_id: {response}")
    return prompt_id


def wait_for_history(endpoint: str, prompt_id: str, timeout_seconds: int) -> dict[str, Any]:
    deadline = time.monotonic() + timeout_seconds
    last_response: dict[str, Any] = {}
    while time.monotonic() < deadline:
        history = request_json(endpoint, f"/history/{prompt_id}", timeout=60)
        last_response = history
        item = history.get(prompt_id)
        if isinstance(item, dict):
            status = item.get("status", {})
            if status.get("status_str") == "error":
                raise RuntimeError(f"ComfyUI prompt failed: {json.dumps(status, indent=2)}")
            if item.get("outputs"):
                return item
        time.sleep(2)
    raise TimeoutError(f"Timed out waiting for /history/{prompt_id}. Last response: {json.dumps(last_response)[:1200]}")


def extract_output_image(history_item: dict[str, Any]) -> tuple[str, str, str]:
    outputs = history_item.get("outputs", {})
    for output in outputs.values():
        images = output.get("images") if isinstance(output, dict) else None
        if not isinstance(images, list):
            continue
        for image in images:
            if isinstance(image, dict) and isinstance(image.get("filename"), str):
                return (
                    image["filename"],
                    image.get("subfolder") if isinstance(image.get("subfolder"), str) else "",
                    image.get("type") if isinstance(image.get("type"), str) else "output",
                )
    raise RuntimeError(f"No output image found in history: {json.dumps(outputs, indent=2)}")


def save_preview(image_bytes: bytes, output_path: Path, preview_size: int) -> None:
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    image = image.resize((preview_size, preview_size), Image.Resampling.LANCZOS)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path, "WEBP", quality=92, method=6)


def backup_existing_previews() -> Path | None:
    existing = sorted(OUT_DIR.glob("*.webp"))
    if not existing:
        return None
    backup_dir = OUT_DIR / f"_backup_before_axstudio_generated_{int(time.time())}"
    backup_dir.mkdir(parents=True, exist_ok=True)
    for path in existing:
        shutil.copy2(path, backup_dir / path.name)
    return backup_dir


def create_contact_sheet(styles: list[StylePreset], manifest: list[dict[str, Any]], output_path: Path) -> None:
    generated_ids = {entry["style_id"] for entry in manifest if entry.get("success")}
    selected = [style for style in styles if style.style_id in generated_ids and (OUT_DIR / f"{style.style_id}.webp").exists()]
    if not selected:
        return
    cell = 168
    label_h = 32
    cols = 8
    rows = (len(selected) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell, rows * (cell + label_h)), "#0b0b0d")
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("Arial.ttf", 12)
    except Exception:
        font = ImageFont.load_default()
    for index, style in enumerate(selected):
        x = (index % cols) * cell
        y = (index // cols) * (cell + label_h)
        thumb = Image.open(OUT_DIR / f"{style.style_id}.webp").convert("RGB").resize((cell, cell), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x, y))
        draw.text((x + 8, y + cell + 8), style.label[:24], fill="#f8fafc", font=font)
    sheet.save(output_path, "JPEG", quality=88)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate AXSTUDIO style preview thumbnails through ComfyUI Modal.")
    parser.add_argument("--endpoint", default=DEFAULT_ENDPOINT)
    parser.add_argument("--checkpoint", default=DEFAULT_CHECKPOINT)
    parser.add_argument("--size", type=int, default=768)
    parser.add_argument("--preview-size", type=int, default=512)
    parser.add_argument("--steps", type=int, default=24)
    parser.add_argument("--cfg", type=float, default=6.0)
    parser.add_argument("--timeout", type=int, default=900)
    parser.add_argument("--seed", type=int, default=1778600000)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--only", nargs="*", default=[])
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--no-backup", action="store_true")
    args = parser.parse_args()

    styles = read_styles()
    if args.only:
        wanted = set(args.only)
        styles = [style for style in styles if style.style_id in wanted]
    if args.limit > 0:
        styles = styles[: args.limit]
    if not styles:
        raise SystemExit("No styles selected.")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    backup_dir = None if args.no_backup else backup_existing_previews()
    if backup_dir:
        print(f"backup_dir: {backup_dir}")

    manifest: list[dict[str, Any]] = []
    manifest_path = OUT_DIR / "generation_manifest_axstudio.json"
    for index, style in enumerate(styles):
        output_path = OUT_DIR / f"{style.style_id}.webp"
        if output_path.exists() and not args.force:
            print(f"skip existing: {style.style_id}")
            continue

        seed = args.seed + index
        filename_prefix = f"style_preview_{style.style_id}_{int(time.time())}"
        prompt, negative_prompt = build_prompt(style)
        print(f"[{index + 1}/{len(styles)}] {style.style_id} | {style.label} | seed {seed}")

        entry: dict[str, Any] = {
            "style_id": style.style_id,
            "style_label": style.label,
            "style_category": style.category,
            "seed": seed,
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "output": str(output_path.relative_to(ROOT)),
            "success": False,
        }
        try:
            workflow = build_workflow(
                checkpoint=args.checkpoint,
                prompt=prompt,
                negative_prompt=negative_prompt,
                seed=seed,
                steps=args.steps,
                cfg=args.cfg,
                filename_prefix=filename_prefix,
                size=args.size,
            )
            prompt_id = submit_prompt(args.endpoint, workflow)
            history_item = wait_for_history(args.endpoint, prompt_id, args.timeout)
            filename, subfolder, output_type = extract_output_image(history_item)
            image_bytes = download_image(args.endpoint, filename, subfolder, output_type)
            save_preview(image_bytes, output_path, args.preview_size)
            entry.update(
                {
                    "success": True,
                    "prompt_id": prompt_id,
                    "history_filename": filename,
                    "history_subfolder": subfolder,
                    "history_type": output_type,
                }
            )
            print(f"saved: {output_path}")
        except Exception as exc:
            entry["error"] = str(exc)
            print(f"error: {style.style_id}: {exc}")
        manifest.append(entry)
        manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))

    create_contact_sheet(styles, manifest, OUT_DIR / "_axstudio_generated_contact_sheet.jpg")
    print(f"manifest: {manifest_path}")
    print(f"generated: {sum(1 for item in manifest if item.get('success'))}/{len(manifest)}")


if __name__ == "__main__":
    main()
