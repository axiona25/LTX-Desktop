#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
STYLE_PROFILES_FILE = ROOT / "src" / "config" / "styleProfiles.json"
OUTPUT_DIR = ROOT / "modal-workers" / "comfyui-clean" / "style_training"
PLAN_FILE = OUTPUT_DIR / "style_lora_plan.json"
REGISTRY_FILE = OUTPUT_DIR / "style_lora_registry.json"

APPROVED_STYLE_IDS = [
    "photorealistic",
    "portrait_photo",
    "fashion_editorial",
    "product_photo",
    "lifestyle_photo",
    "cinematic_realism",
    "dramatic_film",
    "commercial_ad",
    "music_video",
    "manga_ink",
    "comic_book",
    "graphic_novel",
    "european_comic",
    "editorial_illustration",
    "storybook_illustration",
    "concept_art",
    "epic_fantasy",
    "cyberpunk",
    "sci_fi_future",
    "vector_flat",
    "poster_graphic",
    "watercolor",
    "pencil_sketch",
    "documentary_realism",
    "anime_clean",
    "anime_cinematic",
    "chibi_kawaii",
    "clean_cartoon",
    "mascot_cartoon",
    "storybook_cartoon",
    "stylized_3d",
    "fairytale_3d",
    "toy_clay_3d",
    "low_poly_3d",
    "pixel_art",
]


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")


def as_dict(value: object) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def as_list(value: object) -> list[Any]:
    return value if isinstance(value, list) else []


def training_steps(profile: dict[str, Any]) -> int:
    recommended = as_dict(as_dict(profile.get("lora_training")).get("recommended_params"))
    raw = recommended.get("target_total_steps")
    if isinstance(raw, int):
        return raw
    if isinstance(raw, str):
        match = re.search(r"\d+", raw)
        if match:
            return int(match.group(0))
    return 3000


def strength(profile: dict[str, Any]) -> float:
    raw = profile.get("strength_guidance")
    if isinstance(raw, (int, float)):
        return float(raw)
    if isinstance(raw, dict) and isinstance(raw.get("default"), (int, float)):
        return float(raw["default"])
    return 0.75


def style_record(profile: dict[str, Any]) -> dict[str, Any]:
    style_id = str(profile["id"])
    lora_training = as_dict(profile.get("lora_training"))
    recommended_params = as_dict(lora_training.get("recommended_params"))
    validation_prompts = [
        item
        for item in as_list(profile.get("validation_prompts"))
        if isinstance(item, dict) and isinstance(item.get("prompt"), str)
    ]
    output_name = f"AXSTYLE_{style_id}_v1"
    return {
        "style_id": style_id,
        "style_label": profile.get("ui_label", style_id),
        "safe_label": profile.get("safe_label", style_id),
        "style_category": profile.get("category", "custom"),
        "trigger_token": profile.get("trigger_token") or f"ax_{slug(style_id)}_v1",
        "target_lora_name": f"style/{output_name}.safetensors",
        "output_name": output_name,
        "dataset_name": f"{style_id}_v1",
        "dataset_volume_path": f"/style_training/{style_id}/{style_id}_v1",
        "minimum_dataset_images": lora_training.get("dataset_size_min", 500),
        "recommended_dataset_images": lora_training.get("dataset_size_recommended", 1200),
        "dataset_distribution": lora_training.get("dataset_distribution", {}),
        "base_training_steps": training_steps(profile),
        "incremental_steps": 250,
        "network_rank": recommended_params.get("network_rank", "16-32"),
        "network_alpha": recommended_params.get("alpha", "16-32"),
        "unet_learning_rate": recommended_params.get("unet_learning_rate", "1e-4"),
        "text_encoder_learning_rate": recommended_params.get("text_encoder_learning_rate", "0 or 5e-6"),
        "optimizer": recommended_params.get("optimizer", "AdamW8bit"),
        "scheduler": recommended_params.get("scheduler", "cosine or constant_with_warmup"),
        "validation_every_steps": recommended_params.get("validation_every_steps", "200-500"),
        "lora_strength_default": strength(profile),
        "prompt_prefix": profile.get("prompt_prefix", ""),
        "prompt_suffix": profile.get("prompt_suffix", ""),
        "negative_prompt": profile.get("negative_prompt", ""),
        "captioning_rules": lora_training.get("captioning_rules", []),
        "overfitting_risks": lora_training.get("overfitting_risks", []),
        "validation_prompts": validation_prompts,
        "status": "dataset_required",
        "enabled_in_app": False,
        "promotion_status": "not_trained",
    }


def main() -> None:
    data = json.loads(STYLE_PROFILES_FILE.read_text(encoding="utf-8"))
    profiles_by_id = {
        str(profile["id"]): profile
        for profile in data["styles"]
        if isinstance(profile, dict) and isinstance(profile.get("id"), str)
    }
    missing = [style_id for style_id in APPROVED_STYLE_IDS if style_id not in profiles_by_id]
    if missing:
        raise SystemExit(f"Missing approved style profiles: {', '.join(missing)}")

    styles = [style_record(profiles_by_id[style_id]) for style_id in APPROVED_STYLE_IDS]
    plan = {
        "plan_name": "AXSTUDIO_style_lora_training_v2",
        "base_checkpoint": "cyberrealisticXL_v100.safetensors",
        "output_volume_dir": "/loras/style",
        "style_count": len(styles),
        "training_policy": {
            "train_one_lora_per_style": True,
            "style_lora_only": True,
            "minimum_dataset_images": 500,
            "recommended_dataset_images": 1200,
            "resume_incrementally": True,
            "do_not_overwrite_existing_lora": True,
            "do_not_enable_unvalidated_lora": True,
            "notes": (
                "Each style needs a curated dataset before training. The app can load promoted LoRAs "
                "from style_lora_registry.json only when AXSTUDIO_ENABLE_STYLE_LORAS=1 and the registry "
                "entry is enabled."
            ),
        },
        "styles": styles,
    }
    registry = {
        "registry_name": "AXSTUDIO_style_lora_registry_v1",
        "base_checkpoint": plan["base_checkpoint"],
        "output_volume_dir": plan["output_volume_dir"],
        "enable_policy": "Only set enabled=true after dataset, training and visual validation pass.",
        "styles": [
            {
                "style_id": style["style_id"],
                "trigger_token": style["trigger_token"],
                "target_lora_name": style["target_lora_name"],
                "lora_strength": style["lora_strength_default"],
                "enabled": False,
                "promotion_status": style["promotion_status"],
                "dataset_name": style["dataset_name"],
                "minimum_dataset_images": style["minimum_dataset_images"],
                "recommended_dataset_images": style["recommended_dataset_images"],
            }
            for style in styles
        ],
    }
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    PLAN_FILE.write_text(json.dumps(plan, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    REGISTRY_FILE.write_text(json.dumps(registry, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {PLAN_FILE} with {len(styles)} style entries")
    print(f"Wrote {REGISTRY_FILE} with {len(styles)} registry entries")


if __name__ == "__main__":
    main()
