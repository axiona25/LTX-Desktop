#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src" / "config" / "styleProfiles.json"
OUT_DIR = ROOT / "STYLE" / "llm_instruction_dataset"

OFFICIAL_STYLE_IDS = [
    "photorealistic",
    "portrait_photo",
    "fashion_editorial",
    "product_photo",
    "lifestyle_photo",
    "cinematic_realism",
    "dramatic_film",
    "commercial_ad",
    "music_video",
    "documentary_realism",
    "anime_clean",
    "anime_cinematic",
    "manga_ink",
    "chibi_kawaii",
    "clean_cartoon",
    "mascot_cartoon",
    "storybook_cartoon",
    "stylized_3d",
    "fairytale_3d",
    "toy_clay_3d",
    "low_poly_3d",
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
    "pixel_art",
]


MODEL_ROUTES: dict[str, dict[str, Any]] = {
    "anime_clean": {
        "base_model": "black-forest-labs/FLUX.1-dev",
        "lora": "Canopus LoRA Flux Anime",
        "lora_source": "prithivMLmods/Canopus-LoRA-Flux-Anime",
    },
    "anime_cinematic": {
        "base_model": "black-forest-labs/FLUX.1-dev",
        "lora": "Canopus LoRA Flux Anime",
        "lora_source": "prithivMLmods/Canopus-LoRA-Flux-Anime",
    },
    "manga_ink": {
        "base_model": "black-forest-labs/FLUX.2-klein-9B",
        "lora": "LineAniRedmond",
        "lora_source": "Civitai modelVersionId 2675344",
    },
    "chibi_kawaii": {
        "base_model": "black-forest-labs/FLUX.1-dev",
        "lora": "Canopus LoRA Flux Anime",
        "lora_source": "prithivMLmods/Canopus-LoRA-Flux-Anime",
    },
    "clean_cartoon": {
        "base_model": "black-forest-labs/FLUX.1-dev",
        "lora": "CartoonStyle Flux LoRA",
        "lora_source": "Norod78/CartoonStyle-flux-lora",
    },
    "mascot_cartoon": {
        "base_model": "black-forest-labs/FLUX.1-dev",
        "lora": "CartoonStyle Flux LoRA",
        "lora_source": "Norod78/CartoonStyle-flux-lora",
    },
    "storybook_cartoon": {
        "base_model": "black-forest-labs/FLUX.1-dev",
        "lora": "CartoonStyle Flux LoRA",
        "lora_source": "Norod78/CartoonStyle-flux-lora",
    },
    "comic_book": {
        "base_model": "black-forest-labs/FLUX.1-dev",
        "lora": "ComicStrips LoRA Fluxdev",
        "lora_source": "zhreyu/ComicStrips-Lora-Fluxdev",
    },
    "graphic_novel": {
        "base_model": "black-forest-labs/FLUX.2-klein-9B",
        "lora": "Comic Sketch - CE",
        "lora_source": "Civitai modelVersionId 2787286",
    },
    "european_comic": {
        "base_model": "black-forest-labs/FLUX.1-dev",
        "lora": "Retro Comic Flux",
        "lora_source": "renderartist/retrocomicflux",
    },
    "stylized_3d": {
        "base_model": "black-forest-labs/FLUX.1-dev",
        "lora": "Flux 3D Animation Style LoRA",
        "lora_source": "Muapi/flux-3d-animation-style-lora, Civitai modelVersionId 922267",
    },
    "fairytale_3d": {
        "base_model": "black-forest-labs/FLUX.1-dev",
        "lora": "Flux 3D Animation Style LoRA",
        "lora_source": "Muapi/flux-3d-animation-style-lora, Civitai modelVersionId 922267",
    },
    "toy_clay_3d": {
        "base_model": "black-forest-labs/FLUX.1-dev",
        "lora": "Flux 3D Animation Style LoRA",
        "lora_source": "Muapi/flux-3d-animation-style-lora, Civitai modelVersionId 922267",
    },
    "low_poly_3d": {
        "base_model": "black-forest-labs/FLUX.1-dev",
        "lora": "Flux 3D Animation Style LoRA",
        "lora_source": "Muapi/flux-3d-animation-style-lora, Civitai modelVersionId 922267",
    },
    "watercolor": {
        "base_model": "black-forest-labs/FLUX.1-dev",
        "lora": "Aquarel Watercolor Flux LoRA",
        "lora_source": "SebastianBodza/flux_lora_aquarel_watercolor",
    },
    "pencil_sketch": {
        "base_model": "black-forest-labs/FLUX.1-dev",
        "lora": "Pencil Sketch Flux Style LoRA",
        "lora_source": "Muapi/pencil-sketch-flux-style-lora",
    },
    "pixel_art": {
        "base_model": "black-forest-labs/FLUX.1-dev",
        "lora": "Modern Pixel Art Flux LoRA",
        "lora_source": "UmeAiRT/FLUX.1-dev-LoRA-Modern_Pixel_art",
    },
}


COMMON_LLM_RULES = [
    "Rewrite the user request in English before sending it to the image model.",
    "Preserve the exact subject, species, action, object count, and location from the user request.",
    "Do not replace an animal with a human, humanoid, person in costume, mascot suit, or human-like student unless the user asks for that.",
    "For animal prompts, explicitly state: clearly a real animal or stylized animal character, not a human, not a person in costume.",
    "Do not add extra background people, extra characters, logos, readable text, signage, watermarks, labels, letters, or writing on objects unless requested.",
    "Keep the image model prompt concrete: subject, action, framing, style, lighting, environment, composition, constraints.",
    "Use protected studio/style names only if AXSTUDIO intentionally exposes that UI label; otherwise use safe generic descriptions.",
    "Never ask the image model to copy a living artist, exact franchise character, logo, brand, campaign, or copyrighted character.",
    "Keep the negative prompt aligned with the selected style; do not negate the selected style itself.",
]

ANIMAL_SUBJECT_RULES = [
    "Repeat the animal species in the positive prompt.",
    "Add: clearly a dog/animal, not a human, not a person in costume, no human body.",
    "If the animal is doing a human action, describe the prop and pose in animal-compatible terms.",
    "Block common failures: no people in the background, no human face, no human hands, no person wearing a costume.",
]

TEXT_SUPPRESSION_RULES = [
    "Default to no text, no letters, no logo, no signage, no watermark, no writing on objects.",
    "If the selected style supports typography or posters, include typography only when the user explicitly asks for text.",
    "For sci-fi holograms and cyberpunk signs, request abstract symbols instead of readable words.",
]


CATEGORY_RULES: dict[str, dict[str, list[str]]] = {
    "REALISTIC": {
        "must": ["Keep a photographic camera logic, realistic materials, realistic light, and believable lens framing."],
        "avoid": ["Do not add illustration, cartoon, anime, 3D render, or painterly terms."],
    },
    "CINEMATIC": {
        "must": ["Use filmic framing, production design, lens-aware composition, and cinematic light."],
        "avoid": ["Avoid flat app illustration, fake poster typography, and random text."],
    },
    "ANIME & MANGA": {
        "must": ["Use clear anime/manga construction, readable eyes, clean silhouette, and controlled linework."],
        "avoid": ["Avoid photorealistic skin, live-action camera realism, and western 3D render language."],
    },
    "CARTOON": {
        "must": ["Use clean readable cartoon shapes, expressive acting, and family-friendly character design."],
        "avoid": ["Avoid photorealism, uncanny realism, gritty texture, and copied franchise character design."],
    },
    "3D ANIMATION": {
        "must": [
            "Use premium stylized 3D animated film language, rounded appealing shapes, polished materials, soft global illumination.",
            "For bicycle prompts, specify a clear bicycle with two wheels if a real bicycle is required.",
            "Keep animal subjects animal-shaped, with paws or animal-compatible grips rather than human hands.",
        ],
        "avoid": [
            "Avoid photorealistic animal photo, human body, person in costume, cheap plastic toy look, tricycle unless requested.",
            "Avoid text or writing on vehicles, buildings, backpacks, clothing, and props.",
        ],
    },
    "COMICS": {
        "must": ["Use visible linework, readable panels or panel-ready composition, controlled color/shading, and expressive faces."],
        "avoid": ["Avoid speech bubbles, captions, sound effects, fake text, photorealism, and live-action texture."],
    },
    "ILLUSTRATION": {
        "must": ["Use clear illustrated structure, selected detail, readable hands/faces, and a coherent visual concept."],
        "avoid": ["Avoid drifting into photorealism or generic 3D render unless the style explicitly requires it."],
    },
    "FANTASY & SCI-FI": {
        "must": ["Use worldbuilding, atmosphere, coherent materials, and readable subject scale."],
        "avoid": ["Avoid known franchise references, readable logos, random interface text, and copied characters."],
    },
    "DESIGN": {
        "must": ["Use strong visual hierarchy, clean graphic composition, and style-specific color limits."],
        "avoid": ["Avoid fake logos, uncontrolled typography, cluttered layout, and photorealistic texture."],
    },
    "PAINTING & SKETCH": {
        "must": ["Make the physical medium obvious through paper, pigment, graphite, brushwork, or hatching."],
        "avoid": ["Avoid glossy digital render, camera realism, and losing subject readability to texture."],
    },
    "RETRO & GAME": {
        "must": ["Use intentional retro/game asset logic, crisp forms, and readable silhouettes."],
        "avoid": ["Avoid low-resolution photo artifacts, smooth gradients, and copied game sprites."],
    },
}


STYLE_OVERRIDES: dict[str, dict[str, list[str]]] = {
    "anime_clean": {
        "must": [
            "Use Canopus LoRA Flux Anime route.",
            "Force clean anime design, cel shading, expressive eyes, and polished animated background.",
        ],
        "avoid": ["Avoid photorealistic faces, western 3D render, and live-action camera language."],
    },
    "anime_cinematic": {
        "must": [
            "Use Canopus LoRA Flux Anime route.",
            "Add cinematic anime lighting, dramatic composition, and detailed anime environment.",
        ],
        "avoid": ["Avoid flat TV-frame look, photorealism, and generic western cartoon."],
    },
    "chibi_kawaii": {
        "must": [
            "Use Canopus LoRA Flux Anime route.",
            "Force chibi proportions, oversized head, tiny body, cute expression, and simple readable forms.",
        ],
        "avoid": ["Avoid realistic anatomy, mature realistic proportions, and photorealistic texture."],
    },
    "clean_cartoon": {
        "must": [
            "Use CartoonStyle Flux LoRA route.",
            "Force clean cartoon shapes, readable outlines, expressive pose, and simplified colors.",
        ],
        "avoid": ["Avoid realistic camera output, gritty realism, and complex painterly texture."],
    },
    "mascot_cartoon": {
        "must": [
            "Use CartoonStyle Flux LoRA route.",
            "Force original mascot clarity, simple silhouette, friendly expression, and brand-safe uniqueness.",
        ],
        "avoid": ["Avoid existing mascots, logos, brand imitation, and photorealistic rendering."],
    },
    "storybook_cartoon": {
        "must": [
            "Use CartoonStyle Flux LoRA route.",
            "Add soft narrative cartoon warmth, child-friendly storytelling, and gentle background details.",
        ],
        "avoid": ["Avoid horror, adult editorial mood, photorealism, and dark gritty texture."],
    },
    "stylized_3d": {
        "must": [
            "Use Flux 3D Animation Style LoRA route.",
            "Ask for premium stylized 3D animated film look, big expressive glossy eyes, rounded appealing shapes, fluffy or sculpted material detail.",
        ],
        "avoid": ["Do not allow the output to become a realistic photo or a human in costume."],
    },
    "fairytale_3d": {
        "must": [
            "Use Flux 3D Animation Style LoRA route.",
            "Add soft magical light, warm storybook color, rounded forms, and family-friendly charm.",
        ],
        "avoid": ["Avoid photorealistic animal photography, dark fantasy, horror, and text on props."],
    },
    "toy_clay_3d": {
        "must": [
            "Use Flux 3D Animation Style LoRA route.",
            "Add tactile handmade clay or toy-like materials, miniature scale, soft studio lighting, and sculpted forms.",
        ],
        "avoid": ["Avoid glossy generic CGI, photorealistic animal photos, and flat 2D cartoon language."],
    },
    "low_poly_3d": {
        "must": [
            "Use Flux 3D Animation Style LoRA route.",
            "Add faceted low-poly geometry, simplified polygonal forms, clean color blocks, and game-ready 3D composition.",
        ],
        "avoid": ["Avoid smooth rounded CGI if the user requested low-poly, photorealistic texture, and 2D vector flat language."],
    },
    "comic_book": {
        "must": ["Use ComicStrips LoRA Fluxdev route.", "Force bold ink lines, comic color separation, and panel-ready readability."],
        "avoid": ["Avoid photographic outputs, generic realism, and speech balloons unless requested."],
    },
    "european_comic": {
        "must": [
            "Use Retro Comic Flux route.",
            "Force clean readable comic album linework, ordered backgrounds, and harmonious flat color.",
        ],
        "avoid": ["Avoid manga screentone, superhero exaggeration, fake text balloons, and photorealistic texture."],
    },
    "graphic_novel": {
        "must": ["Force mature illustrated linework, textured shading, and narrative visual tone."],
        "avoid": ["Avoid camera-photo realism and superhero poster cliches unless requested."],
    },
    "vector_flat": {
        "must": ["Force flat vector design, solid color fills, crisp edges, no paper or brush texture."],
        "avoid": ["Avoid editorial brush grain, 3D lighting, and realistic materials."],
    },
    "poster_graphic": {
        "must": ["Make silhouette, palette, and composition stronger than environmental detail."],
        "avoid": ["Do not generate slogans, words, or logos unless user explicitly provides approved text."],
    },
    "pixel_art": {
        "must": ["Use Modern Pixel Art Flux LoRA route.", "Force visible pixel grid, no anti-aliasing, consistent pixel size, limited palette."],
        "avoid": ["Avoid smooth 3D, vector flat, and generic low-res image artifacts."],
    },
    "watercolor": {
        "must": ["Use Aquarel Watercolor Flux LoRA route.", "Force transparent pigment washes, visible paper, wet-on-wet gradients, soft organic edges."],
        "avoid": ["Avoid storybook cartoon if the request is only for watercolor technique."],
    },
    "pencil_sketch": {
        "must": ["Use Pencil Sketch Flux Style LoRA route.", "Force monochrome graphite, hatching, cross-hatching, paper grain, and chiaroscuro."],
        "avoid": ["Avoid color, watercolor, ink manga, charcoal-heavy darkness, and glossy digital paint."],
    },
    "cyberpunk": {
        "must": ["Use neon, rain reflections, dense vertical city, techwear, and abstract hologram symbols."],
        "avoid": ["Avoid readable corporate logos, real brands, clean sci-fi daylight, and generic music-video neon."],
    },
    "sci_fi_future": {
        "must": ["Use clean daylight, glass, metal, composite panels, flying vehicles, and optimistic advanced technology."],
        "avoid": ["Avoid cyberpunk rain, dark alleys, dystopian grime, and readable panel text."],
    },
}


def _as_text(value: Any) -> str:
    if isinstance(value, list):
        return ", ".join(str(item) for item in value)
    if isinstance(value, dict):
        return ", ".join(f"{key}: {text}" for key, text in value.items())
    return str(value or "")


def _compact_list(*groups: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for group in groups:
        for item in group:
            key = item.strip().lower()
            if key and key not in seen:
                seen.add(key)
                out.append(item.strip())
    return out


def _style_record(profile: dict[str, Any]) -> dict[str, Any]:
    style_id = str(profile["id"])
    category = str(profile.get("category", ""))
    category_rules = CATEGORY_RULES.get(category, {"must": [], "avoid": []})
    overrides = STYLE_OVERRIDES.get(style_id, {"must": [], "avoid": []})
    model_route = MODEL_ROUTES.get(
        style_id,
        {
            "base_model": "black-forest-labs/FLUX.2-klein-9B",
            "lora": None,
            "lora_source": None,
        },
    )
    validation_prompts = [
        str(item.get("prompt", ""))
        for item in profile.get("validation_prompts", [])
        if isinstance(item, dict) and item.get("prompt")
    ]
    return {
        "style_id": style_id,
        "ui_label": profile.get("ui_label"),
        "safe_label": profile.get("safe_label"),
        "category": category,
        "trigger_token": profile.get("trigger_token"),
        "model_route": model_route,
        "llm_task": "rewrite_user_request_into_final_image_prompt",
        "system_instruction": (
            "You are AXSTUDIO's image prompt director. Rewrite user image requests into precise English "
            "prompts for the selected style while preserving subject fidelity and blocking common model failures."
        ),
        "common_rules": COMMON_LLM_RULES,
        "subject_fidelity_rules": ANIMAL_SUBJECT_RULES,
        "text_suppression_rules": TEXT_SUPPRESSION_RULES,
        "style_must_rules": _compact_list(category_rules.get("must", []), overrides.get("must", [])),
        "style_avoid_rules": _compact_list(category_rules.get("avoid", []), overrides.get("avoid", [])),
        "prompt_recipe": [
            "Translate the user's request to English.",
            "Start with the exact requested subject and action.",
            "Add style-specific visual language from prompt_prefix.",
            "Add framing, environment, lighting, materials, and composition.",
            "Add subject fidelity constraints when the subject is an animal or object-specific request.",
            "Add no-text/no-logo constraints unless the user explicitly asked for typography.",
            "End with prompt_suffix quality/style terms.",
        ],
        "negative_prompt_recipe": [
            "Merge the user's negative prompt with the style negative prompt.",
            "Add no text, no logo, no watermark, no signage, no writing on objects by default.",
            "For animal prompts add no human, no person, no human body, no person in costume, no background people.",
            "Do not include words that negate the selected style.",
        ],
        "style_profile": {
            "short_description": profile.get("short_description"),
            "long_description": profile.get("long_description"),
            "visual_language": _as_text(profile.get("visual_language")),
            "line_treatment": profile.get("line_treatment"),
            "shading_mode": profile.get("shading_mode"),
            "color_logic": profile.get("color_logic"),
            "lighting_style": profile.get("lighting_style"),
            "texture_style": profile.get("texture_style"),
            "composition_hints": _as_text(profile.get("composition_hints")),
            "anatomy_tendency": profile.get("anatomy_tendency"),
            "prompt_prefix": profile.get("prompt_prefix"),
            "prompt_suffix": profile.get("prompt_suffix"),
            "negative_prompt": profile.get("negative_prompt"),
        },
        "validation_prompts": validation_prompts,
        "example_user_request": "Crea una barboncino femmina che va sulla bicicletta con la cartella verso la propria scuola",
        "example_final_prompt": _example_prompt_for_style(profile),
        "example_negative_prompt_additions": [
            "no text",
            "no letters",
            "no logo",
            "no signage",
            "no writing on objects",
            "no people in the background",
            "no human body",
            "no person in costume",
        ],
    }


def _example_prompt_for_style(profile: dict[str, Any]) -> str:
    style_id = str(profile["id"])
    prefix = str(profile.get("prompt_prefix", "")).strip()
    suffix = str(profile.get("prompt_suffix", "")).strip()
    base = (
        "A cute female brown poodle riding a small red bicycle to school, wearing a blue school backpack, "
        "clearly a dog and not a human, full body visible, cheerful expression, colorful school building in the background, "
        "empty school courtyard, no other characters, no people, no human body, no person in costume, "
        "no text, no letters, no logo, no signage, no writing on objects, clean composition"
    )
    if style_id in {"stylized_3d", "fairytale_3d"}:
        base += (
            ", premium stylized 3D animated film look, big expressive glossy eyes, rounded appealing shapes, "
            "fluffy curly fur, warm morning sunlight"
        )
    return ", ".join(part for part in [prefix, base, suffix] if part)


def _chat_example(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "style_id": record["style_id"],
        "messages": [
            {"role": "system", "content": record["system_instruction"]},
            {
                "role": "user",
                "content": (
                    f"Style: {record['ui_label']} ({record['style_id']})\n"
                    f"Request: {record['example_user_request']}"
                ),
            },
            {
                "role": "assistant",
                "content": json.dumps(
                    {
                        "prompt": record["example_final_prompt"],
                        "negative_prompt_additions": record["example_negative_prompt_additions"],
                    },
                    ensure_ascii=False,
                ),
            },
        ],
        "metadata": {
            "style_id": record["style_id"],
            "category": record["category"],
            "model_route": record["model_route"],
        },
    }


def main() -> None:
    raw = json.loads(SOURCE.read_text(encoding="utf-8"))
    profiles_by_id = {str(item["id"]): item for item in raw["styles"]}
    missing = [style_id for style_id in OFFICIAL_STYLE_IDS if style_id not in profiles_by_id]
    if missing:
        raise SystemExit(f"Missing profiles: {missing}")

    records = [_style_record(profiles_by_id[style_id]) for style_id in OFFICIAL_STYLE_IDS]
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    dataset = {
        "version": "2026-05-14.v1",
        "purpose": "AXSTUDIO LLM instruction dataset for image prompt rewriting by style.",
        "style_count": len(records),
        "global_rules": {
            "common": COMMON_LLM_RULES,
            "animal_subjects": ANIMAL_SUBJECT_RULES,
            "text_suppression": TEXT_SUPPRESSION_RULES,
        },
        "styles": records,
    }
    (OUT_DIR / "axstudio_style_llm_instructions.json").write_text(
        json.dumps(dataset, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    with (OUT_DIR / "axstudio_style_llm_instructions.jsonl").open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
    with (OUT_DIR / "axstudio_style_llm_chat_examples.jsonl").open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(_chat_example(record), ensure_ascii=False) + "\n")
    (OUT_DIR / "README.md").write_text(_readme(records), encoding="utf-8")


def _readme(records: list[dict[str, Any]]) -> str:
    rows = "\n".join(
        f"| `{record['style_id']}` | {record['ui_label']} | {record['model_route']['base_model']} | {record['model_route'].get('lora') or '-'} |"
        for record in records
    )
    return f"""# AXSTUDIO LLM Style Instruction Dataset

Generated from `src/config/styleProfiles.json`.

This dataset is for the LLM layer that rewrites user requests into final image prompts.
It is not a LoRA image dataset. It captures prompt rules, failure guards, negative prompt
additions, model routes, and style-specific instructions.

## Files

- `axstudio_style_llm_instructions.json`: full structured dataset.
- `axstudio_style_llm_instructions.jsonl`: one style instruction record per line.
- `axstudio_style_llm_chat_examples.jsonl`: chat-style examples for prompt rewriting.

## Global Rules Captured

- Translate Italian or mixed-language user input to English before image generation.
- Preserve exact subject, species, action, props, and setting.
- For animal prompts, prevent human substitution and people-in-costume failures.
- Suppress unintended text, logos, signage, watermarks, and writing on objects.
- Keep selected style strong without negating it in the negative prompt.

## Current Style Routes

| Style ID | Label | Base Model | LoRA |
|---|---|---|---|
{rows}
"""


if __name__ == "__main__":
    main()
