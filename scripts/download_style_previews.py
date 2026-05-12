#!/usr/bin/env python3
"""Download or generate local AXSTUDIO style preview thumbnails.

Uses official APIs when keys are available:
- PEXELS_API_KEY
- UNSPLASH_ACCESS_KEY
- PIXABAY_API_KEY

If no key/source is available for a style, creates a deterministic local fallback
thumbnail and records that in licenses.json. Tokens are never printed.
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
except Exception as exc:  # pragma: no cover
    raise SystemExit("Pillow is required. Run with backend/.venv/bin/python scripts/download_style_previews.py") from exc

ROOT = Path(__file__).resolve().parents[1]
STYLES_FILE = ROOT / "frontend" / "constants" / "imageStyles.ts"
OUT_DIR = ROOT / "public" / "style-previews"
LICENSE_URLS = {
    "Pexels": "https://www.pexels.com/license/",
    "Unsplash": "https://unsplash.com/license",
    "Pixabay": "https://pixabay.com/service/license-summary/",
    "local_fallback": "",
}

QUERIES = {
    "realistic": "realistic portrait studio photography adult model neutral background",
    "photorealistic": "photorealistic studio portrait natural light",
    "ultra_realistic": "ultra realistic portrait photography high detail",
    "hyper_realistic": "hyper realistic portrait close detail",
    "studio_photography": "professional studio photography portrait softbox lighting",
    "portrait_photography": "portrait photography adult studio natural light",
    "fashion_photography": "fashion photography editorial model studio",
    "product_photography": "premium product photography studio lighting",
    "architectural_photography": "modern architecture photography luxury villa exterior",
    "documentary_style": "documentary photography street scene realistic",
    "cinematic": "cinematic city night neon rain",
    "cinematic_dramatic": "dramatic cinematic lighting silhouette",
    "movie_still": "movie still cinematic scene",
    "high_end_film_look": "cinematic film still luxury scene",
    "noir_cinematic": "film noir black and white cinematic street",
    "epic_cinematic": "epic cinematic landscape dramatic light",
    "sci_fi_cinematic": "science fiction cinematic city neon",
    "fantasy_cinematic": "fantasy cinematic castle dramatic light",
    "illustration": "digital illustration character landscape",
    "digital_painting": "digital painting fantasy landscape",
    "concept_art": "concept art environment character",
    "matte_painting": "matte painting cinematic landscape",
    "comic_book": "comic book illustration hero style",
    "graphic_novel": "graphic novel illustration dramatic",
    "western_comic": "western comic art illustration",
    "line_art": "line art illustration black white",
    "ink_drawing": "ink drawing illustration",
    "sketch": "pencil sketch drawing",
    "pencil_drawing": "pencil drawing portrait",
    "charcoal_drawing": "charcoal drawing portrait",
    "cartoon": "cartoon illustration character",
    "kids_illustration": "children book illustration",
    "storybook_illustration": "storybook illustration fantasy",
    "fairy_tale_animation": "fairy tale illustration castle",
    "classic_animated_film": "classic animation illustration character",
    "storybook_princess_animation": "storybook princess style illustration generic",
    "family_3d_animation": "family friendly 3d animation character",
    "clay_animation": "clay animation character",
    "manga": "manga illustration character black white",
    "anime": "anime style illustration character",
    "anime_cinematic": "cinematic anime city background",
    "anime_90s": "90s anime style illustration",
    "chibi": "chibi character illustration",
    "3d_render": "3d render object studio",
    "realistic_3d": "realistic 3d render product studio",
    "stylized_3d": "stylized 3d character render",
    "clay_render": "clay render 3d object",
    "toy_style": "toy photography vinyl figure",
    "isometric": "isometric illustration city",
    "low_poly": "low poly 3d landscape",
    "game_art": "game art environment",
    "cgi": "cgi render futuristic object",
    "vector_art": "vector art illustration",
    "flat_illustration": "flat illustration modern",
    "minimal": "minimal design abstract",
    "poster_style": "poster design graphic",
    "advertising_style": "advertising photography product",
    "editorial_layout": "editorial magazine layout design",
    "luxury_brand": "luxury brand photography",
    "infographic_style": "infographic design illustration",
    "fantasy_art": "fantasy art landscape",
    "dark_fantasy": "dark fantasy art castle",
    "surreal": "surreal art landscape",
    "dreamlike": "dreamlike landscape ethereal",
    "cyberpunk": "cyberpunk city neon",
    "steampunk": "steampunk machinery illustration",
    "gothic": "gothic architecture dark",
    "sci_fi_art": "sci fi art futuristic city",
    "watercolor": "watercolor painting landscape",
    "oil_painting": "oil painting portrait",
    "acrylic_painting": "acrylic painting abstract",
    "pastel_art": "pastel art landscape",
    "renaissance_painting": "renaissance painting portrait",
    "baroque_painting": "baroque painting dramatic",
    "impressionist": "impressionist painting landscape",
    "retro": "retro design photography",
    "vaporwave": "vaporwave aesthetic city",
    "synthwave": "synthwave neon landscape",
    "pixel_art": "pixel art landscape",
    "pop_art": "pop art portrait",
    "abstract": "abstract art colorful",
    "custom": "custom style placeholder design",
}

CATEGORY_SOURCE_ORDER = {
    "realistic_photo": ["Pexels", "Unsplash"],
    "cinematic": ["Unsplash", "Pexels"],
    "illustration_drawing": ["Pixabay", "Unsplash"],
    "animation_cartoon": ["Pixabay", "Unsplash"],
    "anime_manga": ["Pixabay", "Unsplash"],
    "three_d_render": ["Pixabay", "Unsplash"],
    "graphic_design": ["Pixabay", "Unsplash"],
    "fantasy_scifi": ["Pixabay", "Unsplash"],
    "artistic_painting": ["Pixabay", "Unsplash"],
    "retro_special": ["Pixabay", "Unsplash"],
    "custom": [],
}

PALETTES = {
    "realistic_photo": ("#1f2937", "#d6a77a", "#f8fafc"),
    "cinematic": ("#020617", "#f97316", "#14b8a6"),
    "illustration_drawing": ("#f8fafc", "#111827", "#f59e0b"),
    "animation_cartoon": ("#38bdf8", "#facc15", "#f472b6"),
    "anime_manga": ("#f8fafc", "#ef4444", "#111827"),
    "three_d_render": ("#111827", "#94a3b8", "#22d3ee"),
    "graphic_design": ("#0f172a", "#f8fafc", "#22c55e"),
    "fantasy_scifi": ("#111827", "#8b5cf6", "#22d3ee"),
    "artistic_painting": ("#fef3c7", "#7c2d12", "#2563eb"),
    "retro_special": ("#111827", "#ec4899", "#facc15"),
    "custom": ("#111827", "#71717a", "#f8fafc"),
}


def read_credentials_env() -> dict[str, str]:
    values = {key: os.environ.get(key, "").strip() for key in ("PEXELS_API_KEY", "UNSPLASH_ACCESS_KEY", "PIXABAY_API_KEY")}
    aliases = {
        "PEXELS_API_KEY": ("PEXELS", "PEXELS_KEY", "PEXELS_TOKEN", "PEXELS_API"),
        "UNSPLASH_ACCESS_KEY": ("UNSPLASH", "UNSPLASH_KEY", "UNSPLASH_TOKEN", "UNSPLASH_API_KEY"),
        "PIXABAY_API_KEY": ("PIXABAY", "PIXABAY_KEY", "PIXABAY_TOKEN", "PIXABAY_API"),
    }
    p = ROOT / "credentials.txt"
    if p.exists():
        text = p.read_text(errors="ignore")
        for key in list(values):
            if values[key]:
                continue
            for candidate in (key, *aliases[key]):
                match = re.search(rf"{re.escape(candidate)}\s*[:=]\s*([^\s]+)", text)
                if match:
                    values[key] = match.group(1).strip().strip('"')
                    break
    return values


def read_styles() -> list[dict[str, str]]:
    text = STYLES_FILE.read_text()
    rows: list[dict[str, str]] = []
    for match in re.finditer(r"style_id:\s*'([^']+)'.*?style_label:\s*'([^']+)'.*?style_category:\s*'([^']+)'", text):
        style_id, label, category = match.groups()
        rows.append({"style_id": style_id, "style_label": label, "style_category": category})
    rows.append({"style_id": "custom", "style_label": "Custom Style", "style_category": "custom"})
    seen: set[str] = set()
    unique = []
    for row in rows:
        if row["style_id"] not in seen:
            unique.append(row)
            seen.add(row["style_id"])
    return unique


def http_json(url: str, headers: dict[str, str] | None = None) -> dict[str, Any]:
    req = urllib.request.Request(url, headers={"User-Agent": "AXSTUDIO-style-preview-downloader/1.0", **(headers or {})})
    with urllib.request.urlopen(req, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def http_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "AXSTUDIO-style-preview-downloader/1.0"})
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read()


def search_provider(provider: str, query: str, keys: dict[str, str]) -> dict[str, str] | None:
    if provider == "Pexels" and keys.get("PEXELS_API_KEY"):
        url = "https://api.pexels.com/v1/search?" + urllib.parse.urlencode({"query": query, "per_page": 1, "orientation": "square"})
        data = http_json(url, {"Authorization": keys["PEXELS_API_KEY"]})
        photos = data.get("photos") or []
        if photos:
            photo = photos[0]
            return {"image_url": photo["src"].get("large") or photo["src"].get("medium"), "source": "Pexels", "author": str(photo.get("photographer") or ""), "source_url": str(photo.get("url") or "")}
    if provider == "Unsplash" and keys.get("UNSPLASH_ACCESS_KEY"):
        url = "https://api.unsplash.com/search/photos?" + urllib.parse.urlencode({"query": query, "per_page": 1, "content_filter": "high"})
        data = http_json(url, {"Authorization": f"Client-ID {keys['UNSPLASH_ACCESS_KEY']}"})
        results = data.get("results") or []
        if results:
            photo = results[0]
            return {"image_url": photo["urls"].get("regular") or photo["urls"].get("small"), "source": "Unsplash", "author": str((photo.get("user") or {}).get("name") or ""), "source_url": str((photo.get("links") or {}).get("html") or "")}
    if provider == "Pixabay" and keys.get("PIXABAY_API_KEY"):
        url = "https://pixabay.com/api/?" + urllib.parse.urlencode({"key": keys["PIXABAY_API_KEY"], "q": query, "image_type": "photo", "safesearch": "true", "per_page": 3})
        data = http_json(url)
        hits = data.get("hits") or []
        if hits:
            hit = hits[0]
            return {"image_url": hit.get("largeImageURL") or hit.get("webformatURL"), "source": "Pixabay", "author": str(hit.get("user") or ""), "source_url": str(hit.get("pageURL") or "")}
    return None


def square_webp_from_bytes(data: bytes, out_path: Path) -> None:
    image = Image.open(BytesIO(data)).convert("RGB")
    side = min(image.size)
    left = (image.width - side) // 2
    top = (image.height - side) // 2
    image = image.crop((left, top, left + side, top + side)).resize((512, 512), Image.Resampling.LANCZOS)
    image.save(out_path, "WEBP", quality=84, method=6)


def fallback_image(style_id: str, label: str, category: str, out_path: Path) -> None:
    bg, accent, second = PALETTES.get(category, PALETTES["custom"])
    image = Image.new("RGB", (512, 512), bg)
    draw = ImageDraw.Draw(image)
    c1 = tuple(int(bg[i:i+2], 16) for i in (1, 3, 5))
    c2 = tuple(int(accent[i:i+2], 16) for i in (1, 3, 5))
    for y in range(512):
        t = y / 511
        row = tuple(int(c1[i] * (1 - t) + c2[i] * t * 0.75) for i in range(3))
        draw.line([(0, y), (512, y)], fill=row)

    if category in {"realistic_photo", "cinematic"}:
        draw.ellipse((190, 86, 322, 218), fill="#f1d2b6")
        draw.rounded_rectangle((146, 218, 366, 474), radius=92, fill="#4b2e25")
        if category == "cinematic":
            draw.rectangle((0, 0, 512, 58), fill="#020617")
            draw.rectangle((0, 454, 512, 512), fill="#020617")
            draw.line((40, 380, 470, 190), fill=second, width=8)
    elif category in {"illustration_drawing", "anime_manga", "animation_cartoon"}:
        draw.ellipse((142, 72, 370, 300), fill="#fff7ed", outline="#111827", width=6)
        draw.ellipse((196, 160, 226, 198), fill="#111827")
        draw.ellipse((286, 160, 316, 198), fill="#111827")
        draw.arc((210, 190, 304, 250), 10, 170, fill="#ef4444", width=5)
        draw.polygon([(256, 300), (142, 452), (370, 452)], fill=accent)
        if category == "anime_manga":
            for x in range(0, 512, 14):
                draw.line((x, 0, x - 180, 512), fill="#111827", width=1)
    elif category == "three_d_render":
        draw.rounded_rectangle((136, 148, 376, 388), radius=34, fill="#d1d5db", outline="#f8fafc", width=5)
        draw.polygon([(136, 148), (256, 72), (376, 148), (256, 224)], fill=second)
        draw.polygon([(376, 148), (424, 246), (376, 388), (256, 224)], fill="#64748b")
    elif category == "graphic_design":
        draw.rectangle((76, 84, 436, 428), fill="#f8fafc")
        draw.rectangle((110, 122, 402, 170), fill=accent)
        draw.ellipse((118, 214, 260, 356), fill=second)
        draw.rectangle((280, 226, 394, 342), fill="#111827")
    elif category == "fantasy_scifi":
        draw.polygon([(256, 72), (328, 390), (184, 390)], fill="#312e81")
        draw.ellipse((76, 92, 436, 452), outline=second, width=8)
        draw.line((70, 390, 442, 170), fill=accent, width=7)
    elif category == "artistic_painting":
        for i in range(18):
            x = (i * 47) % 512
            y = (i * 83) % 512
            draw.ellipse((x - 80, y - 40, x + 120, y + 80), fill=[accent, second, "#fef3c7"][i % 3])
        image = image.filter(ImageFilter.GaussianBlur(3))
    elif category == "retro_special":
        if style_id == "pixel_art":
            block = 32
            colors = [bg, accent, second, "#22d3ee", "#111827"]
            for y in range(0, 512, block):
                for x in range(0, 512, block):
                    draw.rectangle((x, y, x + block, y + block), fill=colors[((x // block) + (y // block)) % len(colors)])
        else:
            draw.ellipse((154, 84, 358, 288), fill=accent)
            for y in range(306, 512, 22):
                draw.line((0, y, 512, y), fill=second, width=3)
    else:
        draw.rounded_rectangle((96, 96, 416, 416), radius=54, fill="#27272a", outline="#71717a", width=5)

    try:
        font_big = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 34)
        font_small = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 20)
    except Exception:
        font_big = ImageFont.load_default()
        font_small = ImageFont.load_default()
    overlay = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rounded_rectangle((24, 392, 488, 488), radius=22, fill=(0, 0, 0, 165))
    od.text((44, 414), label[:28], font=font_big, fill=(255, 255, 255, 245))
    od.text((44, 454), category.replace("_", " ").title(), font=font_small, fill=(220, 220, 220, 210))
    image = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")
    image.save(out_path, "WEBP", quality=84, method=6)


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    keys = read_credentials_env()
    styles = read_styles()
    manifest: dict[str, dict[str, str]] = {}
    licenses: list[dict[str, str]] = []
    downloaded = 0
    fallback = 0
    now = datetime.now(timezone.utc).isoformat()
    fallback_image("custom", "Style", "custom", OUT_DIR / "_fallback.webp")

    for style in styles:
        style_id = style["style_id"]
        label = style["style_label"]
        category = style["style_category"]
        query = QUERIES.get(style_id, label)
        out_file = OUT_DIR / f"{style_id}.webp"
        selected: dict[str, str] | None = None
        provider_order = list(CATEGORY_SOURCE_ORDER.get(category, []))
        if "Pexels" not in provider_order:
            provider_order.append("Pexels")
        for provider in provider_order:
            try:
                selected = search_provider(provider, query, keys)
            except Exception:
                selected = None
            if selected and selected.get("image_url"):
                break
        if selected and selected.get("image_url"):
            try:
                square_webp_from_bytes(http_bytes(selected["image_url"]), out_file)
                source = selected["source"]
                downloaded += 1
            except Exception:
                fallback_image(style_id, label, category, out_file)
                selected = None
                source = "local_fallback"
                fallback += 1
        else:
            fallback_image(style_id, label, category, out_file)
            source = "local_fallback"
            fallback += 1
        manifest[style_id] = {"file": f"./style-previews/{style_id}.webp", "source": source, "query": query}
        licenses.append({"style_id": style_id, "file": f"./style-previews/{style_id}.webp", "source": source, "author": selected.get("author", "") if selected else "AXSTUDIO local fallback", "source_url": selected.get("source_url", "") if selected else "", "license_url": LICENSE_URLS[source], "downloaded_at": now, "query": query})

    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    (OUT_DIR / "licenses.json").write_text(json.dumps(licenses, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"styles": len(styles), "downloaded": downloaded, "fallback": fallback, "out_dir": str(OUT_DIR)}, ensure_ascii=False))
    if downloaded == 0:
        print("No provider API keys were available or downloads failed. Configure PEXELS_API_KEY, UNSPLASH_ACCESS_KEY, or PIXABAY_API_KEY to fetch real library images.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
