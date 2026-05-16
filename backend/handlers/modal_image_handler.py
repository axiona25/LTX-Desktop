"""AXSTUDIO Modal image workflow - Versione NSFW Sbloccata e Stabile (FINAL NUCLEAR 9.0)"""

from __future__ import annotations

import base64
import binascii
import json
import logging
import os
import re
import time
import urllib.parse
from datetime import datetime
from pathlib import Path
from threading import RLock
from typing import TYPE_CHECKING, Any, Literal, TypedDict, cast

from _routes._errors import HTTPError
from api_types import (
    FluxQualityMode,
    JsonObject,
    ModalFluxImageGenerateRequest,
    ModalFluxImageGenerateResponse,
    ModalPromptEnhanceRequest,
    ModalPromptEnhanceResponse,
    ModalPromptTranslateRequest,
    ModalPromptTranslateResponse,
)
from handlers.base import StateHandlerBase
from services.interfaces import HTTPClient, HttpTimeoutError, JSONValue
from state.app_state_types import AppState

if TYPE_CHECKING:
    from runtime_config.runtime_config import RuntimeConfig

logger = logging.getLogger(__name__)

MODAL_LLM_PROMPT_TIMEOUT_SECONDS = 300
MODAL_FLUX_IMAGE_TIMEOUT_SECONDS = 900
COMFYUI_PROMPT_SUBMIT_TIMEOUT_SECONDS = 300
AXSTUDIO_COMFYUI_IMAGE_ENDPOINT = "https://axiona2025--axstudio-comfyui-clean-comfyui-server.modal.run"
AXSTUDIO_FLUX2_IMAGE_ENDPOINT = os.environ.get(
    "AXSTUDIO_FLUX2_IMAGE_ENDPOINT",
    "https://axiona2025--axstudio-flux-image-web-app.modal.run/generate",
)
AXSTUDIO_IMAGE_CHECKPOINT = "cyberrealisticXL_v100.safetensors"
AXSTUDIO_COMFYUI_FACEID_CHECKPOINT = "realvisxlV50_v50Bakedvae.safetensors"
AXSTUDIO_COMFYUI_EYES_LORA = "EyesXL_v3.safetensors"
AXSTUDIO_COMFYUI_UPSCALER = "4x-UltraSharp.pth"
AXSTUDIO_FLUX_COMFYUI_EYE_REFINE_ENABLED = os.environ.get(
    "AXSTUDIO_FLUX_COMFYUI_EYE_REFINE",
    "1",
).strip().lower() not in {"0", "false", "no", "off"}
AXSTUDIO_FLUX_CHARACTER_REFERENCE_ENABLED = os.environ.get(
    "AXSTUDIO_FLUX_CHARACTER_REFERENCE",
    "1",
).strip().lower() not in {"0", "false", "no", "off"}
AXSTUDIO_CHARACTER_MASTER_FLUX_FALLBACK_ENABLED = os.environ.get(
    "AXSTUDIO_CHARACTER_MASTER_FLUX_FALLBACK",
    "0",
).strip().lower() in {"1", "true", "yes", "on"}
OPENROUTER_CHAT_COMPLETIONS_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
CHARACTER_MASTER_STYLE_ID = "character_master_realistic"
COMFYUI_EYE_REFINE_STYLE_IDS = {
    "photorealistic",
    "portrait_photo",
    "fashion_editorial",
    "product_photo",
    "detail_boost",
    "lifestyle_photo",
    "cinematic_realism",
    "dramatic_film",
    "commercial_ad",
    "music_video",
    "documentary_realism",
}
COMFYUI_EYE_REFINE_STYLE_CATEGORIES = {"realistic_photo", "cinematic"}
COMFYUI_CHARACTER_REFERENCE_STYLE_IDS = COMFYUI_EYE_REFINE_STYLE_IDS
COMFYUI_CHARACTER_REFERENCE_STYLE_CATEGORIES = COMFYUI_EYE_REFINE_STYLE_CATEGORIES


class StyleGenerationProfile(TypedDict, total=False):
    prompt_prefix: str
    prompt_suffix: str
    negative_extra: str
    min_steps: int
    min_guidance_scale: float
    checkpoint: str
    lora_name: str
    lora_strength: float


NON_PHOTO_NEGATIVE_EXTRA = (
    "photograph, photo, photorealistic, realistic camera, live action, real lens, DSLR, "
    "smartphone photo, documentary photo, skin pores, realistic fur photo, real animal photo, "
    "natural camera depth of field, photographic bokeh"
)


STYLE_CATEGORY_GENERATION_PROFILES: dict[str, StyleGenerationProfile] = {
    "animation_cartoon": {
        "prompt_prefix": (
            "non-photorealistic 2D animated feature film frame, stylized hand-drawn animation, "
            "clean readable silhouettes, simplified appealing shapes, expressive subject design, "
            "warm painted background, crisp outline discipline"
        ),
        "prompt_suffix": "make the whole image look animated, not photographed, no live-action realism",
        "negative_extra": (
            "photograph, photorealistic, realistic camera, live action, real human photo, skin pores, "
            "documentary, smartphone photo, lens blur, gritty realism, ugly cartoon anatomy"
        ),
        "min_steps": 38,
        "min_guidance_scale": 7.0,
    },
    "anime_manga": {
        "prompt_prefix": (
            "high-quality anime illustration, non-photographic cel-shaded image, clean line art, "
            "expressive anime face, polished animated background, controlled vibrant colors"
        ),
        "prompt_suffix": "anime artwork only, not a real photo",
        "negative_extra": "photorealistic, real human photo, live action, western photo, skin pores, camera realism",
        "min_steps": 36,
        "min_guidance_scale": 7.0,
    },
    "illustration_drawing": {
        "prompt_prefix": (
            "polished illustration, non-photographic artwork, clean drawing structure, visible artistic design, "
            "controlled shapes, readable subject, intentional linework and painted detail"
        ),
        "prompt_suffix": "illustrated artwork only, not a camera photo",
        "negative_extra": "photorealistic, live action, real camera, documentary photo, realistic lens",
        "min_steps": 34,
        "min_guidance_scale": 6.5,
    },
    "artistic_painting": {
        "prompt_prefix": (
            "painterly fine-art image, visible brushwork, canvas or paper texture, artistic color decisions, "
            "non-photographic painted rendering"
        ),
        "prompt_suffix": "painted artwork, not a photograph",
        "negative_extra": "photorealistic, real camera, live action, glossy CGI, smartphone photo",
        "min_steps": 34,
        "min_guidance_scale": 6.5,
    },
    "three_d_render": {
        "prompt_prefix": (
            "stylized 3D render, animation-ready forms, clean geometry, controlled materials, "
            "global illumination, polished CGI composition"
        ),
        "negative_extra": "bad topology, noisy render, deformed 3d face, low-quality plastic",
        "min_steps": 34,
        "min_guidance_scale": 6.0,
    },
    "graphic_design": {
        "prompt_prefix": (
            "clean non-photographic graphic design image, precise shapes, readable composition, "
            "intentional visual hierarchy, controlled palette, crisp design finish"
        ),
        "negative_extra": (
            "messy layout, unreadable text, clutter, random typography, low quality, "
            f"{NON_PHOTO_NEGATIVE_EXTRA}"
        ),
        "min_steps": 32,
        "min_guidance_scale": 7.0,
    },
    "fantasy_scifi": {
        "prompt_prefix": (
            "high-end fantasy or science-fiction concept art, strong worldbuilding, cinematic atmosphere, "
            "clear subject readability, detailed imaginative environment"
        ),
        "negative_extra": "generic scene, weak worldbuilding, low detail, flat lighting",
        "min_steps": 36,
        "min_guidance_scale": 6.5,
    },
    "retro_special": {
        "prompt_prefix": (
            "strong stylized non-photographic retro artwork, clear period aesthetic, graphic color decisions, "
            "intentional texture and composition"
        ),
        "negative_extra": f"generic photorealistic photo, bland modern realism, weak style, {NON_PHOTO_NEGATIVE_EXTRA}",
        "min_steps": 34,
        "min_guidance_scale": 7.2,
    },
}

FLUX2_DEFAULT_STYLE_IDS = {
    "anime_clean",
    "anime_cinematic",
    "manga_ink",
    "chibi_kawaii",
    "clean_cartoon",
    "mascot_cartoon",
    "storybook_cartoon",
    "disney_animation",
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
    "pixar_3d",
    "studio_ghibli",
}

FLUX2_DEFAULT_STYLE_CATEGORIES = {
    "animation_cartoon",
    "anime_manga",
    "illustration_drawing",
    "artistic_painting",
    "fantasy_scifi",
    "graphic_design",
    "retro_special",
}

STYLE_ID_GENERATION_PROFILES: dict[str, StyleGenerationProfile] = {
    CHARACTER_MASTER_STYLE_ID: {
        "prompt_prefix": (
            "PHOTOREALISTIC CHARACTER MASTER PORTRAIT, single adult person only, centered full frontal face, "
            "calm alive closed-mouth expression, eyes looking directly into camera, both eyes fully visible, full head visible, "
            "close-up ID portrait framing, face occupies most of the frame, top of head to upper shoulders only, shoulders barely visible, no chest or torso, "
            "plain neutral studio background, flattering soft portrait lighting with natural catchlights in the eyes, real camera portrait, "
            "preserve requested ethnicity, era, cultural identity, hair length, beard length, and key somatic traits exactly, "
            "if long hair is requested it must be visibly loose, not tied back, clearly long on both sides of the head and fall past the shoulders, "
            "naturally handsome and photogenic facial structure when beauty is requested, harmonious face, balanced jawline, defined but realistic cheekbones, proportionate nose, "
            "rested under-eyes, clear healthy realistic skin without grime or disease unless explicitly requested, "
            "natural skin pores, natural facial asymmetry, realistic hair strands, realistic beard detail if present, "
            "accurate iris texture, anatomically plausible face, identity reference image quality"
        ),
        "prompt_suffix": (
            "strict character master sheet source image: no scene action, no cinematic pose, no side view, no three-quarter view, "
            "no profile view, no teeth, no open mouth, no halo, no religious iconography, no fantasy styling, no beauty filter; "
            "no modern fashion model styling, no contemporary haircut, no modern t-shirt or crew-neck shirt, no barber-shop grooming; "
            "no torso framing, no waist, no arms, no modern shirt buttons, no modern collar; "
            "make it suitable as a reusable identity reference for future image generations"
        ),
        "negative_extra": (
            "side view, three-quarter view, profile view, looking away, closed eyes, one eye hidden, cropped forehead, cropped chin, "
            "open mouth, visible teeth, smile with teeth, exaggerated emotion, second person, crowd, busy background, halo, icon painting, "
            "religious painting, fantasy scene, cartoon, anime, illustration, 3d render, doll face, waxy skin, plastic skin, airbrushed beauty skin, "
            "over-smoothed skin, fake eyes, distorted iris, asymmetrical eyes, deformed nose, malformed ears, stretched face, identity drift, "
            "ugly face, unpleasant face, plain unattractive face, weak facial structure, dull lifeless eyes, flat dead gaze, no catchlights, grotesque features, "
            "diseased skin, dirty skin, acne scars unless requested, tired dead eyes, unflattering harsh expression, "
            "short hair when long hair is requested, tied back hair when loose long hair is requested, bun, ponytail, hair hidden behind ears, cropped hair, modern haircut, "
            "styled quiff, pompadour, salon haircut, fashionable model grooming, trimmed corporate beard, modern t-shirt, crew neck shirt, blue shirt, "
            "modern henley shirt, shirt buttons, button placket, modern collar, contemporary clothing, torso, chest-focused portrait, arms, western fashion model, generic actor face"
        ),
        "min_steps": 28,
        "min_guidance_scale": 5.0,
        "checkpoint": AXSTUDIO_COMFYUI_FACEID_CHECKPOINT,
    },
    "comic_book": {
        "prompt_prefix": (
            "STRICT 2D COLOR COMIC BOOK ILLUSTRATION, not a photo, not a realistic render, "
            "bold black ink outlines around every major shape, flat vivid color blocks, cel shading, "
            "halftone dots, graphic hatching, dynamic panel composition, printed comic page look"
        ),
        "prompt_suffix": (
            "the final image must read unmistakably as hand-drawn comic book art with visible ink contours, "
            "flat comic colors and graphic shadows; no photographic lighting, no real camera texture"
        ),
        "negative_extra": (
            f"{NON_PHOTO_NEGATIVE_EXTRA}, realistic dog photo, realistic school photograph, "
            "soft realistic fur rendering, weak outlines, smooth photographic gradients, 3d render, CGI, "
            "watercolor, pencil sketch, anime manga black and white"
        ),
        "min_steps": 42,
        "min_guidance_scale": 8.2,
    },
    "graphic_novel": {
        "prompt_prefix": (
            "STRICT 2D GRAPHIC NOVEL ILLUSTRATION, mature sequential art, strong ink linework, "
            "tonal graphic shadows, textured illustrated panels, dramatic drawn storytelling, not a photo"
        ),
        "prompt_suffix": "graphic novel artwork only, visible ink and illustrated tonal structure, no camera realism",
        "negative_extra": f"{NON_PHOTO_NEGATIVE_EXTRA}, glossy photo, smooth realistic fur, weak line art, flat vector minimalism",
        "min_steps": 40,
        "min_guidance_scale": 7.8,
    },
    "european_comic": {
        "prompt_prefix": (
            "STRICT ORIGINAL EUROPEAN COMIC ALBUM ILLUSTRATION, clean ligne claire style linework, "
            "clear ink contours, harmonious flat colors, ordered detailed background, elegant comic panel, not a photo"
        ),
        "prompt_suffix": "polished European comic panel only, clean outlines and flat color separation, no photographic realism",
        "negative_extra": f"{NON_PHOTO_NEGATIVE_EXTRA}, superhero exaggeration, manga screentone, realistic photo texture, messy sketch",
        "min_steps": 40,
        "min_guidance_scale": 7.8,
    },
    "editorial_illustration": {
        "prompt_prefix": (
            "modern editorial illustration only, clean simplified illustrated forms, soft linework, "
            "muted professional palette, light paper texture, balanced conceptual composition, not a photo"
        ),
        "prompt_suffix": "clear magazine/editorial illustration with selected details and graphic clarity, no camera realism",
        "negative_extra": f"{NON_PHOTO_NEGATIVE_EXTRA}, comic panel grammar, heavy outlines, glossy 3d render, pure flat vector",
        "min_steps": 38,
        "min_guidance_scale": 7.4,
    },
    "storybook_illustration": {
        "prompt_prefix": (
            "soft painterly children's storybook illustration only, watercolor-like brush grain, "
            "delicate linework, pastel harmonious colors, cozy poetic page composition, not a photo"
        ),
        "prompt_suffix": "warm storybook page look with paper texture and painterly softness, no realistic camera lighting",
        "negative_extra": f"{NON_PHOTO_NEGATIVE_EXTRA}, 3d render, glossy digital photo, hard comic outlines, pure vector flat",
        "min_steps": 40,
        "min_guidance_scale": 7.6,
    },
    "disney_animation": {
        "prompt_prefix": (
            "Disney animation inspired family-friendly 2D animated film look, non-photographic, "
            "expressive hand-drawn character acting, clean appealing shapes, warm painted background, "
            "clear storybook emotion, polished theatrical animation frame"
        ),
        "prompt_suffix": (
            "must look like a polished classic animated film frame, not live action, not a photo, "
            "no existing characters or copied franchise designs"
        ),
        "negative_extra": (
            f"{NON_PHOTO_NEGATIVE_EXTRA}, official character, existing character, copied character, logo, "
            "watermark, photorealistic skin, live action, uncanny realism"
        ),
        "min_steps": 42,
        "min_guidance_scale": 7.8,
    },
    "concept_art": {
        "prompt_prefix": (
            "professional painted concept art only, cinematic design exploration, strong silhouettes, "
            "clear value structure, painterly brushwork, atmospheric worldbuilding, not a photograph"
        ),
        "prompt_suffix": "production concept art quality with visible digital painting decisions and selective detail",
        "negative_extra": f"{NON_PHOTO_NEGATIVE_EXTRA}, plain realistic photo, random detail, weak design, copied franchise",
        "min_steps": 40,
        "min_guidance_scale": 7.4,
    },
    "epic_fantasy": {
        "prompt_prefix": (
            "original epic fantasy illustration only, cinematic painterly fantasy art, monumental scale, "
            "heroic silhouettes, magical atmosphere, rich painted textures, not a photo"
        ),
        "prompt_suffix": "legendary fantasy painting with dramatic light and painterly fantasy texture, no camera realism",
        "negative_extra": f"{NON_PHOTO_NEGATIVE_EXTRA}, mundane modern photo, copied fantasy franchise, cute fairytale 3d",
        "min_steps": 42,
        "min_guidance_scale": 7.8,
    },
    "cyberpunk": {
        "prompt_prefix": (
            "original cyberpunk sci-fi illustration only, neon-lit futuristic city art, wet reflective streets, "
            "holographic glow, dense vertical worldbuilding, high-contrast painted sci-fi atmosphere"
        ),
        "prompt_suffix": "cinematic illustrated cyberpunk key art, not a plain real street photograph, no real logos",
        "negative_extra": f"{NON_PHOTO_NEGATIVE_EXTRA}, real brand logo, readable corporate text, generic club photo",
        "min_steps": 40,
        "min_guidance_scale": 7.4,
    },
    "sci_fi_future": {
        "prompt_prefix": (
            "clean futuristic sci-fi illustration only, sleek high-tech architecture, bright aspirational future city, "
            "glass and metal design, flying vehicles, polished cinematic future artwork"
        ),
        "prompt_suffix": "bright ordered sci-fi future illustration, no dark cyberpunk grime, no camera photo",
        "negative_extra": f"{NON_PHOTO_NEGATIVE_EXTRA}, dark rainy neon alley, dystopian grime, real logo, readable text",
        "min_steps": 40,
        "min_guidance_scale": 7.4,
    },
    "vector_flat": {
        "prompt_prefix": (
            "STRICT FLAT VECTOR ILLUSTRATION ONLY, clean geometric shapes, solid color fills, crisp vector edges, "
            "minimal shadows, no texture, no realistic lighting, app/web graphic style"
        ),
        "prompt_suffix": "pure flat vector design with simple readable shapes and solid colors, not painted and not photographed",
        "negative_extra": f"{NON_PHOTO_NEGATIVE_EXTRA}, painterly brushwork, paper grain, 3d render, gradients, realistic texture",
        "min_steps": 36,
        "min_guidance_scale": 7.6,
    },
    "poster_graphic": {
        "prompt_prefix": (
            "STRICT HIGH-IMPACT GRAPHIC POSTER STYLE, bold silhouette, limited color palette, strong contrast, "
            "screenprint texture, geometric shapes, poster key visual composition, not a photo"
        ),
        "prompt_suffix": "poster-ready graphic design with print grain and powerful visual hierarchy, no photographic realism",
        "negative_extra": f"{NON_PHOTO_NEGATIVE_EXTRA}, messy typography, fake logo, unreadable text, weak silhouette",
        "min_steps": 38,
        "min_guidance_scale": 7.8,
    },
    "watercolor": {
        "prompt_prefix": (
            "STRICT TRADITIONAL WATERCOLOR ILLUSTRATION ONLY, transparent pigment washes, visible watercolor paper, "
            "wet-on-wet gradients, soft organic edges, light splatter, no camera photo"
        ),
        "prompt_suffix": "delicate watercolor painting with paper grain and transparent washes, no digital glossy realism",
        "negative_extra": f"{NON_PHOTO_NEGATIVE_EXTRA}, oil painting, vector flat, heavy ink outlines, glossy render, hard cel shading",
        "min_steps": 38,
        "min_guidance_scale": 7.4,
    },
    "pencil_sketch": {
        "prompt_prefix": (
            "STRICT MONOCHROME PENCIL SKETCH ONLY, graphite linework, visible paper texture, hatching, "
            "cross-hatching, chiaroscuro, sketchbook drawing, no color, no camera photo"
        ),
        "prompt_suffix": "elegant graphite drawing with pencil strokes and paper grain, monochrome only",
        "negative_extra": f"{NON_PHOTO_NEGATIVE_EXTRA}, full color, watercolor, oil paint, ink comic, marker art, charcoal-only",
        "min_steps": 36,
        "min_guidance_scale": 7.4,
    },
    "pixel_art": {
        "prompt_prefix": (
            "STRICT 2D RETRO PIXEL ART ONLY, crisp visible pixel grid, limited color palette, no anti-aliasing, "
            "hard-edged square pixels, sprite-like forms, tile-based game art"
        ),
        "prompt_suffix": "intentional pixel art with consistent pixel size and limited palette, not low-resolution photography",
        "negative_extra": f"{NON_PHOTO_NEGATIVE_EXTRA}, smooth gradients, blurry pixels, inconsistent pixel size, vector flat, low poly 3d",
        "min_steps": 36,
        "min_guidance_scale": 8.0,
    },
    "pixar_3d": {
        "prompt_prefix": (
            "Pixar inspired premium stylized 3D animated film look, polished CGI, appealing rounded forms, "
            "expressive original character design, clean readable face, soft global illumination, "
            "family-friendly cinematic composition"
        ),
        "prompt_suffix": (
            "must look like a premium 3D animated feature frame, not a photo, no existing characters, "
            "no copied franchise designs, clean stylized anatomy"
        ),
        "negative_extra": (
            "copyrighted character, official character, brand imitation, logo, watermark, live action, "
            "photorealistic skin, uncanny valley, cheap plastic, malformed hands, distorted face"
        ),
        "min_steps": 42,
        "min_guidance_scale": 7.6,
    },
    "studio_ghibli": {
        "prompt_prefix": (
            "Studio Ghibli inspired hand-painted animation look, gentle painterly backgrounds, lush nature, "
            "warm human-scale storytelling, soft atmospheric light, expressive but natural character acting, "
            "poetic animated film frame, not a photo"
        ),
        "prompt_suffix": (
            "must look like a delicate hand-painted animated film still with soft environmental storytelling, "
            "no existing characters or copied franchise designs"
        ),
        "negative_extra": (
            f"{NON_PHOTO_NEGATIVE_EXTRA}, official character, existing character, logo, watermark, "
            "photorealistic, glossy 3d, harsh cyberpunk neon, copied franchise"
        ),
        "min_steps": 42,
        "min_guidance_scale": 7.6,
    },
    "fairytale_3d": {
        "prompt_prefix": (
            "ffairytale3d_style, original family-friendly fairytale 3D animation style, "
            "polished stylized 3D render, expressive original character, soft rounded facial features, "
            "warm expressive eyes, clean sculpted hair, rounded forms, smooth materials"
        ),
        "prompt_suffix": (
            "warm cinematic lighting, soft global illumination, gentle rim light, pastel-friendly color palette, "
            "clean anatomy, readable hands, charming wholesome atmosphere, high quality, original visual language"
        ),
        "negative_extra": (
            "copyrighted character, brand imitation, Disney character, Pixar character, DreamWorks character, "
            "logo, watermark, photorealistic skin, live action, real person, horror mood, dark grotesque mood, "
            "malformed hands, extra fingers, missing fingers, distorted face, asymmetrical eyes, uncanny valley"
        ),
        "min_steps": 42,
        "min_guidance_scale": 7.8,
        "lora_name": "style/AXSTYLE_fairytale_animation_v0.safetensors",
        "lora_strength": 0.65,
    },
    "family_friendly_fairytale_3d": {
        "prompt_prefix": (
            "ffairytale3d_style, original family-friendly fairytale 3D animation style, "
            "polished stylized 3D render, expressive original character, soft rounded facial features, "
            "warm expressive eyes, clean sculpted hair, rounded forms, smooth materials"
        ),
        "prompt_suffix": (
            "warm cinematic lighting, soft global illumination, gentle rim light, pastel-friendly color palette, "
            "clean anatomy, readable hands, charming wholesome atmosphere, high quality, original visual language"
        ),
        "negative_extra": (
            "copyrighted character, brand imitation, Disney character, Pixar character, DreamWorks character, "
            "logo, watermark, photorealistic skin, live action, real person, horror mood, dark grotesque mood, "
            "malformed hands, extra fingers, missing fingers, distorted face, asymmetrical eyes, uncanny valley"
        ),
        "min_steps": 42,
        "min_guidance_scale": 7.8,
        "lora_name": "style/AXSTYLE_fairytale_animation_v0.safetensors",
        "lora_strength": 0.65,
    },
    "disney_style": {
        "prompt_prefix": (
            "family-friendly fairy-tale 2D animated feature film look, non-photorealistic, "
            "hand-drawn inspired animation, rounded expressive character design, big clear expressive eyes, "
            "soft magical background painting, charming storybook proportions, clean animated face"
        ),
        "prompt_suffix": (
            "the final result must look like a polished animated storybook film frame, "
            "not a real street photograph, not live action, not photorealistic"
        ),
        "negative_extra": (
            "photograph, photorealistic, realistic photo, live action, real person, skin pores, "
            "documentary, smartphone photo, lens realism, gritty realism, official character, existing character, logo"
        ),
        "min_steps": 42,
        "min_guidance_scale": 7.8,
        "lora_name": "style/AXSTYLE_fairytale_animation_v0.safetensors",
        "lora_strength": 0.65,
    },
    "fairy_tale_animation": {
        "prompt_prefix": (
            "family-friendly fairytale 2D animated feature film look, non-photorealistic, "
            "hand-drawn inspired animation, rounded expressive character design, soft magical background painting"
        ),
        "prompt_suffix": (
            "the final result must look like an original polished fairytale animation frame, "
            "not live action and not photorealistic"
        ),
        "negative_extra": (
            "photograph, photorealistic, realistic photo, live action, real person, skin pores, "
            "documentary, smartphone photo, lens realism, gritty realism, official character, existing character, logo"
        ),
        "min_steps": 42,
        "min_guidance_scale": 7.8,
        "lora_name": "style/AXSTYLE_fairytale_animation_v0.safetensors",
        "lora_strength": 0.65,
    },
    "cartoon": {
        "prompt_prefix": (
            "clean cartoon animation style, non-photorealistic, bold readable shapes, simple appealing forms, "
            "expressive subject design, bright controlled colors, animation-ready design"
        ),
        "negative_extra": "photorealistic, real camera photo, live action, gritty realism, skin pores",
        "min_steps": 38,
        "min_guidance_scale": 7.0,
    },
    "classic_animated_film": {
        "prompt_prefix": (
            "classic hand-drawn animated feature film style, non-photographic, elegant animated backgrounds, "
            "clear inked forms, warm cinematic color, expressive character animation pose"
        ),
        "negative_extra": "photorealistic, live action, real photo, modern smartphone look, skin pores",
        "min_steps": 40,
        "min_guidance_scale": 7.4,
    },
    "family_3d_animation": {
        "prompt_prefix": (
            "family-friendly stylized 3D animated film look, expressive character design, appealing simplified forms, "
            "polished CGI, soft cinematic lighting, non-photorealistic animation"
        ),
        "negative_extra": "photorealistic, real human photo, gritty realism, uncanny realism, cheap plastic",
        "min_steps": 38,
        "min_guidance_scale": 7.0,
    },
}


def _style_lora_registry_path() -> Path:
    override = os.environ.get("AXSTUDIO_STYLE_LORA_REGISTRY")
    if override:
        return Path(override).expanduser()
    return Path(__file__).resolve().parents[2] / "modal-workers" / "comfyui-clean" / "style_training" / "style_lora_registry.json"


def _style_loras_enabled() -> bool:
    return os.environ.get("AXSTUDIO_ENABLE_STYLE_LORAS", "").strip().lower() in {"1", "true", "yes", "on"}


def _load_style_lora_generation_profiles() -> dict[str, StyleGenerationProfile]:
    if not _style_loras_enabled():
        return {}
    registry_path = _style_lora_registry_path()
    if not registry_path.exists():
        logger.warning("Style LoRA registry not found: %s", registry_path)
        return {}
    try:
        raw: object = json.loads(registry_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("Unable to load Style LoRA registry %s: %s", registry_path, exc)
        return {}

    if not isinstance(raw, dict):
        return {}
    raw_dict = cast(dict[str, object], raw)
    styles_obj = raw_dict.get("styles")
    if not isinstance(styles_obj, list):
        return {}
    styles = cast(list[object], styles_obj)

    profiles: dict[str, StyleGenerationProfile] = {}
    for entry in styles:
        if not isinstance(entry, dict):
            continue
        item = cast(dict[str, object], entry)
        if item.get("enabled") is not True:
            continue
        style_id = item.get("style_id")
        lora_name = item.get("target_lora_name")
        lora_strength = item.get("lora_strength")
        if not isinstance(style_id, str) or not isinstance(lora_name, str):
            continue
        if not isinstance(lora_strength, (int, float)):
            lora_strength = 0.75
        profiles[style_id] = {
            "lora_name": lora_name,
            "lora_strength": float(lora_strength),
        }
    return profiles


STYLE_LORA_GENERATION_PROFILES = _load_style_lora_generation_profiles()

ANIMAL_SUBJECT_PATTERN = re.compile(
    r"\b(poodle|dog|puppy|cat|kitten|horse|rabbit|bear|fox|wolf|animal|barboncino|cane|cagnolino|gatto|gattino|cavallo|coniglio|orso|volpe|lupo|animale)\b",
    re.IGNORECASE,
)

ANIMAL_SUBJECT_NEGATIVE_PROMPT = (
    "human, person, people, girl, boy, woman, man, child, human student, human face, "
    "human body, human skin, human hair, human hands, arms, legs, humanoid, "
    "person in costume, child in costume"
)


def _animal_safe_style_text(value: str) -> str:
    replacements = (
        (r"\bhuman character\b", "animal subject"),
        (r"\bcartoon character\b", "cartoon animal subject"),
        (r"\bcharacter design\b", "animal character design"),
        (r"\bcharacter\b", "subject"),
        (r"\breadable hands\b", "readable paws"),
        (r"\bhands\b", "paws"),
        (r"\bhand\b", "paw"),
        (r"\bsimple stylized hair\b", "stylized fur"),
        (r"\bclean sculpted hair\b", "clean sculpted fur"),
        (r"\bsculpted soft hair\b", "sculpted soft fur"),
        (r"\bhair\b", "fur"),
        (r"\bfriendly face\b", "friendly animal face"),
        (r"\bclean anatomy\b", "clear animal body anatomy"),
    )
    result = value
    for pattern, replacement in replacements:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
    return result

# ====================== PATTERN DI COMPOSIZIONE ======================
FULL_BODY_INTENT_PATTERN = re.compile(r"\b(full[-\s]?body|head[-\s]?to[-\s]?toe|figura intera|corpo intero|intera persona|figura completa|piedi visibili|feet visible|standing shot|entire figure|entire seated body|seated full[-\s]?body|sitting full[-\s]?body)\b", re.IGNORECASE)
WIDE_CHARACTER_SCENE_PATTERN = re.compile(
    r"\b("
    r"wide shot|medium[-\s]?wide|environmental shot|environmental portrait|full[-\s]?body|"
    r"head[-\s]?to[-\s]?toe|entire seated body|seated full[-\s]?body|sitting full[-\s]?body|"
    r"corpo intero|figura intera|piano largo|campo medio|seduta|seduto|"
    r"cafe|caf[eè]|caff[eè]|coffee|espresso|bar table|tavolino|terrace|street|city|"
    r"people|pedestrians|persone|passanti|strada|citt[aà]"
    r")\b",
    re.IGNORECASE,
)
PORTRAIT_INTENT_PATTERN = re.compile(r"\b(portrait|ritratto|headshot|close[-\s]?up)\b", re.IGNORECASE)
LANDSCAPE_SCENE_INTENT_PATTERN = re.compile(r"\b(city|citt[aà]|landscape|paesaggio|scene|scena|environment|ambiente|street|skyline|interior|exterior)\b", re.IGNORECASE)
PRODUCT_INTENT_PATTERN = re.compile(r"\b(product|prodotto|packshot|still life|e-commerce)\b", re.IGNORECASE)
ARCHITECTURE_INTENT_PATTERN = re.compile(r"\b(architecture|architectural|villa|house|building|interior design|exterior|architettura|villa moderna|casa|edificio|interni)\b", re.IGNORECASE)

CompositionIntent = Literal["portrait", "full_body", "landscape_scene", "product", "architecture", "generic"]
SubjectType = Literal["person", "environment", "object", "product", "architecture", "mixed", "generic"]

# ====================== PATTERN DI SICUREZZA NSFW ======================
UNDERAGE_PATTERN = re.compile(r"\b(minor|underage|child|children|teen|teenager|adolescent|loli|shota|minorenne|minori|bambino|bambina)\b", re.IGNORECASE)
NEGATED_UNDERAGE_PATTERN = re.compile(r"\b(no minors|not minor|adult only|21\+|solo adulti)\b", re.IGNORECASE)
NONCONSENSUAL_OR_EXPLOITATION_PATTERN = re.compile(r"\b(non[-\s]?consensual|coercion|forced|rape|stupro|violenza sessuale|non consensuale)\b", re.IGNORECASE)
SEXUAL_OR_NUDE_PATTERN = re.compile(r"\b(nude|nudity|naked|explicit|pussy|cock|penis|vagina|genital|spread|erect|labia|clitoris)\b", re.IGNORECASE)


class ModalImageHandler(StateHandlerBase):
    def __init__(self, state: AppState, lock: RLock, http: HTTPClient, config: RuntimeConfig) -> None:
        super().__init__(state, lock, config)
        self._http = http

    def ensure_output_dirs(self) -> tuple[Path, Path]:
        image_dir = self.config.app_data_dir / "Output" / "image"
        video_dir = self.config.app_data_dir / "Output" / "video"
        image_dir.mkdir(parents=True, exist_ok=True)
        video_dir.mkdir(parents=True, exist_ok=True)
        return image_dir, video_dir

    def _repo_root(self) -> Path:
        return Path(__file__).resolve().parents[2]

    def _credential_candidate_paths(self) -> list[Path]:
        candidates: list[Path] = []
        for base in (Path.cwd(), self._repo_root()):
            for filename in ("credential.txt", "credentials.txt"):
                candidates.append(base / filename)
        for parent in Path(__file__).resolve().parents:
            for filename in ("credential.txt", "credentials.txt"):
                candidates.append(parent / filename)
        unique: list[Path] = []
        seen: set[str] = set()
        for path in candidates:
            key = str(path)
            if key in seen:
                continue
            seen.add(key)
            unique.append(path)
        return unique

    def _read_openrouter_api_key_from_credentials(self) -> str:
        env_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
        if env_key:
            return env_key
        for path in self._credential_candidate_paths():
            if not path.exists():
                continue
            try:
                text = path.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            for line in text.splitlines():
                if "OPENROUTE" not in line.upper() and "OPENROUTER" not in line.upper():
                    continue
                match = re.search(r"sk-or-v1-[A-Za-z0-9_-]+", line)
                if match:
                    logger.info("OpenRouter credentials loaded from %s", path)
                    return match.group(0)
        return ""

    def _resolve_llm_prompt_endpoint(self) -> str:
        if self._read_openrouter_api_key_from_credentials():
            return OPENROUTER_CHAT_COMPLETIONS_ENDPOINT
        configured = self.state.app_settings.modal_llm_prompt_endpoint.strip()
        if configured:
            return configured
        return ""

    def enhance_prompt(self, req: ModalPromptEnhanceRequest) -> ModalPromptEnhanceResponse:
        endpoint = self._resolve_llm_prompt_endpoint()
        if not endpoint:
            raise HTTPError(409, "MODAL_LLM_PROMPT_ENDPOINT is not configured")
        requested_composition_intent = self._composition_intent(req.idea, {})
        width, height = self._dimensions_for_aspect_ratio(req.aspect_ratio, requested_composition_intent)
        style_token = (req.style or "").strip()
        if style_token == "character_identity_card":
            task = "character_identity_card"
        elif style_token == "character_master_prompt":
            task = "character_master_prompt"
        else:
            task = "compile_prompt"
        payload = cast(dict[str, JSONValue], {
            "idea": req.idea,
            "style": req.style,
            "aspect_ratio": req.aspect_ratio,
            "language": req.language,
            "task": task,
            "product_mode": "consumer_creative",
            "content_profile": "premium_image_prompt_enhancement",
            "intent": req.idea,
            "user_prompt": req.idea,
            "prompt": req.idea,
            "target": "flux_image",
            "quality_profile": "premium",
            "metadata": {
                "source": "axstudio_desktop_modal_images",
                "language": req.language or "en",
                "aspect_ratio": req.aspect_ratio or "16:9",
                "recommended_width": width,
                "recommended_height": height,
                "temperature": 0.4,
                "top_p": 0.9,
                "max_tokens": 1200,
            },
        })
        result = self._post_json(endpoint, payload, timeout=MODAL_LLM_PROMPT_TIMEOUT_SECONDS)
        return self._normalize_enhanced_prompt(result, req)

    def translate_prompt(self, req: ModalPromptTranslateRequest) -> ModalPromptTranslateResponse:
        endpoint = self._resolve_llm_prompt_endpoint()
        if not endpoint:
            raise HTTPError(409, "MODAL_LLM_PROMPT_ENDPOINT is not configured")
        payload = cast(dict[str, JSONValue], {
            "task": "translate_prompt",
            "text": req.text,
            "prompt": req.text,
            "input": req.text,
            "kind": req.kind,
            "source_language": req.source_language,
            "target_language": req.target_language,
            "instructions": "Translate faithfully. Do not add new creative details and do not remove explicit attributes.",
        })
        result = self._post_json(endpoint, payload, timeout=MODAL_LLM_PROMPT_TIMEOUT_SECONDS)
        return self._normalize_translated_prompt(result, req)

    def generate_flux_image(self, req: ModalFluxImageGenerateRequest) -> ModalFluxImageGenerateResponse:
        # ... (invariato, stesso codice di prima)
        configured_endpoint = self.state.app_settings.modal_flux_image_endpoint.strip()
        endpoint = self._resolve_image_generation_endpoint(
            configured_endpoint,
            selected_style_id=req.selected_style_id,
            selected_style_category=req.selected_style_category,
        )
        if not endpoint:
            raise HTTPError(409, "MODAL_FLUX_IMAGE_ENDPOINT is not configured")

        visible_final_prompt = (req.final_prompt or req.prompt).strip()
        negative_prompt_from_frontend = (req.negative_prompt_final or req.negative_prompt or "").strip()
        self._reject_disallowed_prompt(" ".join((req.original_idea or "", visible_final_prompt)))

        final_prompt = visible_final_prompt
        negative_prompt_final = negative_prompt_from_frontend
        request_width, request_height = req.width, req.height
        (
            generation_prompt,
            generation_negative_prompt,
            generation_steps,
            generation_guidance_scale,
            generation_checkpoint,
            generation_lora_name,
            generation_lora_strength,
        ) = self._apply_style_generation_profile(
            prompt=final_prompt,
            negative_prompt=negative_prompt_final,
            steps=req.steps,
            guidance_scale=req.guidance_scale,
            selected_style_id=req.selected_style_id,
            selected_style_category=req.selected_style_category,
        )
        generation_prompt = self._translate_text_for_image_engine(generation_prompt, kind="prompt")
        generation_negative_prompt = self._translate_text_for_image_engine(
            generation_negative_prompt,
            kind="negative_prompt",
        )
        character_lora_requested = bool(
            req.use_character_lora
            or req.image_character_id
            or req.image_character_name
            or "CHARACTER IDENTITY LOCK" in generation_prompt
        )
        character_reference_path = (req.image_character_image_path or "").strip()
        character_reference_required = character_lora_requested and self._style_uses_character_reference_identity(
            selected_style_id=req.selected_style_id,
            selected_style_category=req.selected_style_category,
        )
        if character_reference_required and not character_reference_path:
            raise HTTPError(422, "Character reference image is missing; identity lock cannot run.")
        if character_reference_required and not Path(character_reference_path).expanduser().exists():
            raise HTTPError(422, "Character reference image not found; identity lock cannot run.")
        worker_style_id = self._worker_style_id_for_generation_speed(
            selected_style_id=req.selected_style_id,
            selected_style_category=req.selected_style_category,
            character_lora_requested=character_lora_requested,
        )
        payload: dict[str, JSONValue] = {
            "prompt": generation_prompt,
            "negative_prompt": generation_negative_prompt,
            "width": request_width,
            "height": request_height,
            "steps": generation_steps,
            "guidance_scale": generation_guidance_scale,
            "seed": req.seed,
            "quality_mode": req.quality_mode,
            "selected_style_id": worker_style_id,
            "selected_style_label": req.selected_style_label,
            "selected_style_category": req.selected_style_category,
            "image_character_id": req.image_character_id,
            "image_character_name": req.image_character_name,
            "image_character_prompt": req.image_character_prompt,
            "image_character_negative_prompt": req.image_character_negative_prompt,
            "use_character_lora": character_lora_requested,
        }
        used_comfyui_endpoint = self._is_comfyui_endpoint(endpoint)
        if character_lora_requested and used_comfyui_endpoint:
            endpoint = AXSTUDIO_FLUX2_IMAGE_ENDPOINT
            used_comfyui_endpoint = False
        if used_comfyui_endpoint:
            try:
                result = self._generate_comfyui_image(
                    endpoint=endpoint,
                    checkpoint=generation_checkpoint,
                    prompt=generation_prompt,
                    negative_prompt=generation_negative_prompt,
                    width=request_width,
                    height=request_height,
                    steps=generation_steps,
                    guidance_scale=generation_guidance_scale,
                    seed=req.seed,
                    quality_mode=req.quality_mode,
                    lora_name=generation_lora_name,
                    lora_strength=generation_lora_strength,
                )
            except Exception as exc:
                if (req.selected_style_id or "").strip() != CHARACTER_MASTER_STYLE_ID:
                    raise
                if not AXSTUDIO_CHARACTER_MASTER_FLUX_FALLBACK_ENABLED:
                    raise HTTPError(
                        502,
                        "Character Realistico non disponibile: il motore RealVisXL/ComfyUI ha interrotto la generazione. "
                        "Riprova: il prompt resta valido e non viene degradato al fallback FLUX2.",
                    ) from exc
                logger.warning(
                    "ComfyUI character master failed; falling back to FLUX2 endpoint=%s error=%s",
                    AXSTUDIO_FLUX2_IMAGE_ENDPOINT,
                    exc,
                    exc_info=True,
                )
                fallback_started_at = time.perf_counter()
                fallback_steps = min(generation_steps, max(req.steps, 8))
                fallback_payload = dict(payload)
                fallback_payload["steps"] = fallback_steps
                fallback_payload["guidance_scale"] = min(generation_guidance_scale, 4.0)
                fallback_payload["quality_mode"] = "balanced"
                result = self._post_json(
                    AXSTUDIO_FLUX2_IMAGE_ENDPOINT,
                    cast(dict[str, JSONValue], fallback_payload),
                    timeout=MODAL_FLUX_IMAGE_TIMEOUT_SECONDS,
                )
                result["comfyui_primary_failed_reason"] = str(exc)
                result["fallback_endpoint"] = AXSTUDIO_FLUX2_IMAGE_ENDPOINT
                result["fallback_steps"] = fallback_steps
                logger.info(
                    "AXSTUDIO character master fallback response endpoint=%s elapsed_ms=%s model=%s steps=%s",
                    AXSTUDIO_FLUX2_IMAGE_ENDPOINT,
                    int((time.perf_counter() - fallback_started_at) * 1000),
                    result.get("model"),
                    fallback_steps,
                )
                used_comfyui_endpoint = False
        else:
            logger.info(
                "AXSTUDIO image request endpoint=%s style=%s worker_style=%s category=%s character=%s size=%sx%s steps=%s quality=%s",
                endpoint,
                req.selected_style_id,
                worker_style_id,
                req.selected_style_category,
                character_lora_requested,
                request_width,
                request_height,
                generation_steps,
                req.quality_mode,
            )
            image_started_at = time.perf_counter()
            result = self._post_json(endpoint, payload, timeout=MODAL_FLUX_IMAGE_TIMEOUT_SECONDS)
            logger.info(
                "AXSTUDIO image response endpoint=%s elapsed_ms=%s model=%s",
                endpoint,
                int((time.perf_counter() - image_started_at) * 1000),
                result.get("model"),
            )
            if character_lora_requested and not self._result_has_sameface_lora(result):
                raise HTTPError(502, "SameFace Fix LoRA was required for this character generation but was not applied")
            if character_lora_requested and self._should_apply_character_reference_identity(
                selected_style_id=req.selected_style_id,
                selected_style_category=req.selected_style_category,
                image_character_image_path=character_reference_path,
            ):
                try:
                    result = self._apply_character_reference_identity_with_comfyui(
                        result=result,
                        reference_image_path=character_reference_path,
                        prompt=generation_prompt,
                        negative_prompt=generation_negative_prompt,
                        seed=req.seed,
                        quality_mode=req.quality_mode,
                    )
                except Exception as exc:
                    raise HTTPError(
                        502,
                        "Character identity reference post-process failed, so the image was not saved with an unreliable identity.",
                    ) from exc
            if (
                character_lora_requested
                and self._should_refine_flux_with_comfyui(req.selected_style_id, req.selected_style_category)
            ):
                try:
                    result = self._refine_flux_image_with_comfyui(
                        result=result,
                        prompt=generation_prompt,
                        negative_prompt=generation_negative_prompt,
                        width=request_width,
                        height=request_height,
                        seed=req.seed,
                        quality_mode=req.quality_mode,
                        preserve_character_details=character_lora_requested,
                        wide_character_scene=character_lora_requested and self._is_wide_character_scene_prompt(
                            " ".join((req.original_idea or "", req.visible_prompt_before_generate or "", generation_prompt)),
                        ),
                    )
                except Exception as exc:
                    if (req.selected_style_category or "").strip() in COMFYUI_EYE_REFINE_STYLE_CATEGORIES:
                        raise HTTPError(
                            502,
                            "Realistic/cinematic post-process failed, so the base FLUX image was not saved.",
                        ) from exc
                    logger.warning("ComfyUI eye refine post-process failed; returning base FLUX image: %s", exc, exc_info=True)

        # ... (tutto il resto del metodo generate_flux_image è invariato)
        image_base64 = result.get("image_base64")
        if not isinstance(image_base64, str) or not image_base64:
            raise HTTPError(502, "Modal FLUX worker did not return image_base64")

        seed = self._coerce_int(result.get("seed"), fallback=req.seed if req.seed is not None else 0)
        width = self._coerce_int(result.get("width"), fallback=request_width)
        height = self._coerce_int(result.get("height"), fallback=request_height)
        requested_steps = self._coerce_int(result.get("requested_steps"), fallback=req.steps)
        actual_steps = self._coerce_int(result.get("actual_steps"), fallback=requested_steps)
        guidance_scale = self._coerce_float(result.get("guidance_scale"), fallback=req.guidance_scale)
        quality_mode_raw = str(result.get("quality_mode") or req.quality_mode)
        quality_mode: FluxQualityMode = (
            cast(FluxQualityMode, quality_mode_raw)
            if quality_mode_raw in {"preview", "balanced", "premium"}
            else req.quality_mode
        )
        effective_width = self._coerce_int(result.get("effective_width"), fallback=width)
        effective_height = self._coerce_int(result.get("effective_height"), fallback=height)
        negative_prompt_applied = bool(result.get("negative_prompt_applied", False))
        elapsed_ms = self._coerce_int(result.get("elapsed_ms"), fallback=0)
        model_name = str(
            result.get("model")
            or (f"ComfyUI:{generation_checkpoint}" if used_comfyui_endpoint else "black-forest-labs/FLUX.2-klein-9B")
        )

        image_bytes = self._decode_image_base64(image_base64)
        local_path, metadata_path = self._save_image_output(
            image_bytes=image_bytes,
            provider="modal_flux",
            model=model_name,
            prompt=generation_prompt,
            negative_prompt=generation_negative_prompt,
            original_idea=req.original_idea or final_prompt,
            llm_enhanced_prompt=req.llm_enhanced_prompt,
            final_prompt=final_prompt,
            prompt_was_user_edited=req.prompt_was_user_edited,
            prompt_source=req.prompt_source,
            selected_style_id=req.selected_style_id,
            selected_style_label=req.selected_style_label,
            selected_style_category=req.selected_style_category,
            image_character_id=req.image_character_id,
            image_character_name=req.image_character_name,
            image_character_image_path=req.image_character_image_path,
            image_character_prompt=req.image_character_prompt,
            image_character_negative_prompt=req.image_character_negative_prompt,
            use_character_lora=character_lora_requested,
            custom_style_text=req.custom_style_text,
            style_prompt_modifier=req.style_prompt_modifier,
            style_negative_modifier=req.style_negative_modifier,
            style_was_applied=req.style_was_applied,
            negative_prompt_final=generation_negative_prompt,
            seed=seed,
            width=width,
            height=height,
            requested_steps=requested_steps,
            actual_steps=actual_steps,
            guidance_scale=guidance_scale,
            quality_mode=quality_mode,
            effective_width=effective_width,
            effective_height=effective_height,
            negative_prompt_applied=negative_prompt_applied,
            elapsed_ms=elapsed_ms,
            extracted_required_traits=[],
            required_hair_color=None,
            required_eye_color=None,
            required_body_framing=None,
            prompt_trait_lock_applied=False,
            negative_trait_lock_applied=False,
            idea_is_primary_guide=req.idea_is_primary_guide,
            composition_intent="generic",
            subject_type="person",
            required_traits={},
            requested_aspect_ratio=req.requested_aspect_ratio,
            effective_aspect_ratio=req.effective_aspect_ratio,
            aspect_ratio_overridden=False,
            aspect_ratio_override_reason=None,
            removed_conflicting_prompt_terms=[],
            no_people_lock_applied=False,
            backend_semantic_rewrite_after_generate=False,
            visible_prompt_before_generate=req.visible_prompt_before_generate,
            payload_prompt_sent_to_backend=req.payload_prompt_sent_to_backend or req.prompt,
            backend_prompt_sent_to_modal=generation_prompt,
            worker_prompt_received=None,
            worker_prompt_sent_to_flux=result.get("prompt_sent_to_flux"),
            worker_loras_applied=result.get("loras_applied"),
            worker_loras_skipped=result.get("loras_skipped"),
            frontend_negative_prompt=req.frontend_negative_prompt or req.negative_prompt_final or req.negative_prompt,
            backend_negative_prompt_final=generation_negative_prompt,
            worker_negative_prompt_received=result.get("negative_prompt_received"),
            worker_negative_prompt_sent_to_flux=result.get("negative_prompt_sent_to_flux"),
            comfyui_eye_refine_applied=result.get("comfyui_eye_refine_applied"),
            comfyui_eye_refine_denoise=result.get("comfyui_eye_refine_denoise"),
            comfyui_eye_refine_steps=result.get("comfyui_eye_refine_steps"),
            comfyui_eye_refine_guidance_scale=result.get("comfyui_eye_refine_guidance_scale"),
            comfyui_eye_refine_preserve_character_details=result.get("comfyui_eye_refine_preserve_character_details"),
            comfyui_eye_refine_wide_character_scene=result.get("comfyui_eye_refine_wide_character_scene"),
            comfyui_identity_reference_applied=result.get("comfyui_identity_reference_applied"),
            comfyui_identity_reference_engine=result.get("comfyui_identity_reference_engine"),
            comfyui_identity_reference_image_path=result.get("comfyui_identity_reference_image_path"),
            comfyui_identity_reference_denoise=result.get("comfyui_identity_reference_denoise"),
            comfyui_identity_reference_steps=result.get("comfyui_identity_reference_steps"),
            comfyui_identity_reference_faceid_weight=result.get("comfyui_identity_reference_faceid_weight"),
            comfyui_primary_failed_reason=result.get("comfyui_primary_failed_reason"),
            fallback_endpoint=result.get("fallback_endpoint"),
            fallback_steps=result.get("fallback_steps"),
            prompt_negative_conflicts=[],
            prompt_visibility_violation=False,
            invisible_backend_modifiers_applied=False,
            visible_trait_lock_applied=False,
            visible_composition_lock_applied=False,
            final_prompt_user_editable_before_generate=True,
            trait_lock_removed=False,
            composition_lock_removed=True,
            backend_semantic_rewrite_disabled=True,
            descriptive_trait_lock_applied=False,
            content_rewrite_removed=True,
            coverage_lock_removed=True,
            conservative_rewrite_removed=True,
            trait_lock_types_applied=[],
            forbidden_rewrite_detected=False,
        )

        return ModalFluxImageGenerateResponse(
            provider="modal_flux",
            model=model_name,
            image_base64=image_base64,
            seed=seed,
            width=width,
            height=height,
            requested_steps=requested_steps,
            actual_steps=actual_steps,
            guidance_scale=guidance_scale,
            quality_mode=quality_mode,
            effective_width=effective_width,
            effective_height=effective_height,
            negative_prompt_applied=negative_prompt_applied,
            elapsed_ms=elapsed_ms,
            local_path=str(local_path),
            metadata_path=str(metadata_path),
        )

    def _result_has_sameface_lora(self, result: dict[str, Any]) -> bool:
        raw_loras = result.get("loras_applied")
        if not isinstance(raw_loras, list):
            return False
        for raw_lora in cast(list[object], raw_loras):
            if not isinstance(raw_lora, dict):
                continue
            raw_lora_obj = cast(dict[str, object], raw_lora)
            name = str(raw_lora_obj.get("name") or "").lower()
            model_version_id = self._coerce_int(raw_lora_obj.get("model_version_id"), fallback=0)
            if "sameface" in name or model_version_id == 857446:
                return True
        return False

    def _preserve_character_master_named_identity(
        self,
        idea: str,
        final_prompt: str,
        display_final_prompt: str,
        style_token: str,
    ) -> tuple[str, str]:
        if style_token != "character_master_prompt":
            return final_prompt, display_final_prompt

        idea_lower = idea.lower()
        asks_jesus = re.search(r"\b(ges[uù]|jesus|cristo|christ)\b", idea_lower) is not None
        if not asks_jesus:
            return final_prompt, display_final_prompt

        final_prompt = (
            "STRICT JESUS IDENTITY LOCK, HIGHEST PRIORITY: historical visual interpretation of Jesus of Nazareth as a 33-year-old "
            "first-century Judean/Semitic Middle Eastern man; long loose dark brown hair must be visible on both sides of the head, "
            "must not be tied back, must not be cropped, and must fall past the shoulders; full natural untrimmed beard; olive warm skin tone; "
            "deep peaceful compassionate gaze with natural eye catchlights; serene intense expression; naturally handsome humble face with harmonious but realistic proportions; "
            "if clothing is visible, use only a simple rough "
            "off-white first-century linen tunic/robe neckline without buttons, placket, modern collar, modern shirt construction, jacket, or t-shirt; "
            "tight close-up head-and-upper-shoulders ID portrait only, face occupies most of the frame, shoulders barely visible, no chest, no torso, no arms; not a modern generic man, not a western European fashion model, "
            "not a contemporary studio actor, not a modern haircut. "
            f"{final_prompt}"
        ).strip()
        display_final_prompt = (
            "VINCOLO IDENTITÀ GESÙ, PRIORITÀ MASSIMA: interpretazione visiva storica di Gesù di Nazareth a 33 anni, uomo medio-orientale "
            "giudeo/semita del primo secolo; capelli lunghi sciolti castano scuro obbligatoriamente visibili su entrambi i lati del volto, "
            "non legati, non corti, e chiaramente oltre le spalle; barba piena naturale non rifinita da barber shop; carnagione olivastra calda; "
            "sguardo profondo, pacifico e compassionevole con catchlight naturali negli occhi; volto naturalmente bellissimo, umile, sereno e intenso con proporzioni armoniche ma realistiche; "
            "se si vede il collo usare solo una semplice tunica/robe di lino "
            "grezzo chiaro del primo secolo, senza bottoni, abbottonatura, colletto moderno, camicia moderna, giacca o t-shirt; inquadratura stretta "
            "solo testa e spalle superiori, volto dominante nell'immagine, spalle appena visibili, niente busto, niente petto, niente braccia; non un uomo moderno generico, non un modello europeo contemporaneo, "
            "non taglio capelli moderno. "
            f"{display_final_prompt}"
        ).strip()

        return final_prompt, display_final_prompt

    def _character_master_negative_identity_lock(self, idea: str, style_token: str) -> str:
        if style_token != "character_master_prompt":
            return ""
        if re.search(r"\b(ges[uù]|jesus|cristo|christ)\b", idea.lower()) is None:
            return ""
        return (
            "short hair, cropped hair, modern haircut, styled quiff, pompadour, salon-styled hair, barber fade, "
            "tied back hair, bun, ponytail, hair hidden behind ears, short curly hair, hair above shoulders, "
            "fashion model grooming, trimmed corporate beard, modern t-shirt, crew neck shirt, blue shirt, modern shirt, jacket, "
            "modern henley shirt, shirt buttons, button placket, modern collar, contemporary clothing, chest, torso, arms, "
            "western European fashion model, generic handsome actor, modern studio headshot, clean fashion portrait"
        )

    def _character_master_aesthetic_lock(
        self,
        idea: str,
        final_prompt: str,
        display_final_prompt: str,
        style_token: str,
    ) -> tuple[str, str, str]:
        if style_token != "character_master_prompt":
            return final_prompt, display_final_prompt, ""

        beauty_requested = re.search(
            r"\b(bellissim[oaie]?|bell[oaie]?|attraente|affascinante|beautiful|handsome|attractive|good[- ]looking)\b",
            idea.lower(),
        ) is not None
        if not beauty_requested:
            return final_prompt, display_final_prompt, ""

        final_prompt = (
            "AESTHETIC BEAUTY LOCK: create a naturally handsome, photogenic adult face with harmonious facial proportions, "
            "balanced masculine jawline, defined but realistic cheekbones, proportionate straight nose, rested under-eyes, clear healthy realistic skin with visible natural pores, "
            "alive expressive eyes with natural catchlights, clean iris detail, well-shaped natural lips, natural hair and beard texture, calm magnetic presence, "
            "subtle serene closed-mouth expression that still feels warm and human; preserve the requested ethnicity, era, identity, age, "
            "hair length, beard, clothing context, and historical/cultural traits exactly; no modern fashion model styling and no artificial beauty filter. "
            f"{final_prompt}"
        ).strip()
        display_final_prompt = (
            "VINCOLO BELLEZZA NATURALE: crea un volto adulto naturalmente bellissimo, fotogenico e armonioso, con proporzioni facciali equilibrate, "
            "mandibola maschile equilibrata, zigomi definiti ma realistici, naso proporzionato, contorno occhi riposato, pelle sana con pori naturali visibili, "
            "occhi vivi ed espressivi con catchlight naturali, iride nitida, labbra naturali, capelli e barba realistici, espressione serena a bocca chiusa ma calda e umana; "
            "preserva esattamente identita, epoca, etnia, eta, lunghezza dei capelli, barba, abiti e tratti culturali richiesti; "
            "niente styling da modello moderno e niente filtro bellezza artificiale. "
            f"{display_final_prompt}"
        ).strip()
        negative_extra = (
            "ugly face, unpleasant face, unattractive face, plain unattractive face, weak facial structure, dull lifeless eyes, no catchlights, "
            "grotesque face, diseased skin, dirty skin, acne scars unless requested, tired dead eyes, dull eyes, harsh unflattering expression, "
            "damaged skin, artificial beauty filter, plastic model face"
        )
        return final_prompt, display_final_prompt, negative_extra

    def _normalize_enhanced_prompt(self, result: dict[str, Any], req: ModalPromptEnhanceRequest) -> ModalPromptEnhanceResponse:
        self._reject_disallowed_prompt(req.idea)
        
        raw_output = result.get("output")
        output = cast(dict[str, Any], raw_output) if isinstance(raw_output, dict) else result or {}

        def safe_str(value: object) -> str:
            if value is None:
                return ""
            return str(value).encode('utf-8', errors='replace').decode('utf-8').strip()

        final_prompt = safe_str(output.get("final_prompt") or output.get("positive_prompt") or output.get("prompt") or output.get("enhanced_prompt") or req.idea)
        display_final_prompt = safe_str(
            output.get("display_final_prompt")
            or output.get("final_prompt_it")
            or output.get("prompt_it")
            or (final_prompt if (req.language or "").lower().startswith("it") else "")
        )
        final_prompt, display_final_prompt = self._preserve_character_master_named_identity(
            req.idea,
            final_prompt,
            display_final_prompt,
            (req.style or "").strip(),
        )
        final_prompt, display_final_prompt, aesthetic_negative_extra = self._character_master_aesthetic_lock(
            req.idea,
            final_prompt,
            display_final_prompt,
            (req.style or "").strip(),
        )
        negative_prompt = safe_str(output.get("negative_prompt") or "blurry, deformed, bad anatomy, extra limbs, mutated hands, poorly drawn face, low quality, watermark, text")
        negative_prompt = self._merge_comma_prompt_parts(
            negative_prompt,
            self._character_master_negative_identity_lock(req.idea, (req.style or "").strip()),
            aesthetic_negative_extra,
        )
        display_negative_prompt = safe_str(
            output.get("display_negative_prompt")
            or output.get("negative_prompt_it")
            or (negative_prompt if (req.language or "").lower().startswith("it") else "")
        )

        composition_intent = self._composition_intent(req.idea, output)
        subject_type = self._subject_type(req.idea, final_prompt)

        final_prompt, _ = self._remove_forbidden_rewrite_terms(final_prompt)
        final_prompt, _ = self._apply_visible_idea_guidance(final_prompt, {}, composition_intent)

        width, height = self._dimensions_for_aspect_ratio(req.aspect_ratio, composition_intent)
        style_tags = [
            *self._string_list(output.get("style_tags")),
            *self._string_list(output.get("technical_tags")),
        ]

        return ModalPromptEnhanceResponse(
            final_prompt=final_prompt,
            negative_prompt=negative_prompt,
            display_final_prompt=display_final_prompt or None,
            display_negative_prompt=display_negative_prompt or None,
            style_tags=style_tags,
            recommended_width=width,
            recommended_height=height,
            suggested_steps=36,
            guidance_scale=3.5,
            composition_intent=composition_intent,
            subject_type=subject_type,
        )

    # ====================== FORZA PROMPT ESPLICITO (NUCLEARE 9.0) ======================
    def _force_explicit_prompt(self, prompt: str) -> str:
        prompt = prompt.strip()
        
        force_terms = [
            "detailed pussy", "spread open labia", "swollen clitoris", "dripping wet vagina",
            "glistening vaginal fluids", "visible creamy pussy juice", "puffy engorged labia",
            "pink wet inner labia", "clit throbbing", "explicitly spread cunt", "full frontal explicit nudity",
            "bare shaved pussy", "no panties", "completely exposed genitals", "pornographic close-up view",
            "hyper detailed genitalia", "realistic wet cunt", "juices dripping down", "labia minora visible and spread"
        ]
        
        lower = prompt.lower()
        has_explicit = any(word in lower for word in ["pussy", "cunt", "labia", "clitoris", "vagina", "genitals"])
        if not has_explicit:
            prompt += ", " + ", ".join(force_terms[:5])
        else:
            for term in force_terms:
                if term.split()[0] in lower and term not in lower:
                    prompt += f", {term}"
        
        # PULIZIA ULTRA-AGGRESSIVA 9.0
        bad_terms = [
            "slight moisture", "light sheen", "wetness implied", "not explicit", "anatomical accuracy",
            "photography and presentation", "skin textures", "skin contours", "minimal grooming",
            "visible labia majora", "delicate sheen", "faintly visible", "gently parted",
            "subtly visible", "implied through", "tasteful", "artistic", "elegant", "cinematic",
            "fashion", "magazine", "stylish", "subtle", "soft", "gentle", "natural", "clean",
            "discretion", "non-pornographic", "sensual", "aesthetic", "balanced", "serene"
        ]
        
        for bad in bad_terms:
            prompt = re.sub(rf"\b{bad}\b,?\s*", "", prompt, flags=re.IGNORECASE)
        
        # Regex ancora più potente
        prompt = re.sub(r'(slight|light|gently|subtly|implied).*?(moisture|sheen|visible|parted|reflection|graphic|accuracy)', '', prompt, flags=re.I)
        prompt = re.sub(r'\b(style|photorealistic|cinematic|octane render|8k|detailed skin|texture|lighting|shadows?|high-resolution|depth of field|photography|presentation)\b,?\s*', '', prompt, flags=re.I)
        
        prompt = prompt.replace("nude", "completely naked, explicit nudity")
        prompt = prompt.replace("legs spread", "legs spread extremely wide, pussy fully spread open")
        prompt = prompt.replace("full frontal view", "full frontal explicit genital view, camera angle directly on cunt")
        
        mandatory_suffix = (
            ", extremely explicit pornographic realism, detailed pussy spread wide open, "
            "swollen wet clitoris visible, dripping vaginal juices, bare cunt, no censorship, "
            "hyperrealistic genitalia, full frontal nudity, porn style, juices dripping down thighs"
        )
        
        if not any(x in prompt.lower() for x in ["dripping", "clitoris", "spread open", "gaping"]):
            prompt += mandatory_suffix
        
        prompt = re.sub(r",+", ",", prompt)
        prompt = re.sub(r"\s*,\s*", ", ", prompt).strip(" ,")
        return prompt

    # ====================== PULIZIA NUCLEARE DEFINITIVA 9.0 ======================
    def _brutal_explicit_clean(self, prompt: str) -> str:
        prompt = prompt.strip()
        
        bad_terms = [
            "slight moisture", "light sheen", "wetness implied", "not explicit", "anatomical accuracy",
            "photography and presentation", "skin textures", "skin contours", "minimal grooming",
            "visible labia majora", "delicate sheen on the labia", "clitoris faintly visible",
            "no explicit sexual act", "without graphic focus", "photography style", "composition",
            "depth of field", "high-resolution detail", "lighting emphasizing", "focus on elegance",
            "gently spread", "minimal pubic grooming", "skin sheen", "skin texture",
            "realistic anatomical details", "style,", "framing", "premium visual prompt",
            "editorial", "tasteful", "artistic", "elegant", "cinematic", "fashion", "magazine",
            "stylish", "subtle", "soft", "gentle", "natural", "clean", "discretion",
            "non-pornographic", "sensual", "aesthetic", "realism", "photorealistic", "balanced", "serene"
        ]
        
        for term in bad_terms:
            prompt = re.sub(rf"\b{term}\b,?\s*", "", prompt, flags=re.IGNORECASE)
        
        lower = prompt.lower()
        if not any(x in lower for x in ["pussy", "cunt", "vagina", "labia", "clitoris", "gaping", "dripping", "wet pussy", "spread open", "bare pussy"]):
            prompt += ", detailed pussy, spread open labia, visible swollen clitoris, dripping wet vagina, full frontal explicit nudity, bare pussy, no underwear, explicit view, pornographic realism"
        
        prompt = re.sub(r",+", ",", prompt)
        prompt = re.sub(r"\s*,\s*", ", ", prompt).strip(" ,")
        return prompt

    def _clean_negative_for_nsfw(self, negative: str, positive: str) -> str:
        base = "blurry, deformed, bad anatomy, extra limbs, mutated hands, poorly drawn face, low quality, watermark, text, clothed, underwear, panties, bra, lingerie, censorship, mosaic, blur, soft lighting, artistic, painting, drawing, anime, cartoon, modest pose, closed legs"
        if any(x in positive.lower() for x in ["pussy", "cunt", "labia", "clitoris", "dripping", "spread open"]):
            base += ", partially clothed, wearing clothes, fabric on body, covered genitals"
        return base

    # ====================== METODI DI SUPPORTO (invariati) ======================
    # (tutto il resto del file è identico alla versione precedente)

    def _is_chat_completion_endpoint(self, endpoint: str) -> bool:
        normalized = endpoint.lower()
        return "openrouter.ai" in normalized or normalized.rstrip("/").endswith("/chat/completions")

    def _extract_json_object(self, text: str) -> dict[str, Any]:
        stripped = text.strip()
        if stripped.startswith("{"):
            parsed = json.loads(stripped)
            if isinstance(parsed, dict):
                return cast(dict[str, Any], parsed)
        match = re.search(r"\{.*\}", stripped, flags=re.DOTALL)
        if not match:
            raise HTTPError(502, "LLM response did not contain a JSON object")
        parsed = json.loads(match.group(0))
        if not isinstance(parsed, dict):
            raise HTTPError(502, "LLM response JSON must be an object")
        return cast(dict[str, Any], parsed)

    def _llm_system_prompt(self, payload: dict[str, JSONValue]) -> str:
        task = str(payload.get("task") or "")
        if task == "translate_prompt":
            return (
                "You translate AXSTUDIO image prompts. Return only valid JSON with translated_text. "
                "Translate faithfully into the requested target language. Do not add creative details, "
                "do not remove character identity details, and preserve camera, format, style, color, and negative prompt constraints."
            )
        if task == "character_identity_card":
            return (
                "You are AXSTUDIO AI creating a reusable character identity card for an image-generation desktop app. "
                "Return only valid JSON. The app UI is Italian, but engine prompts are English. "
                "From the supplied character source prompt, create display_final_prompt in Italian as a complete carta d'identita del personaggio, "
                "and final_prompt in English as a strict reusable identity lock. Include stable somatic traits: apparent adult age, face silhouette, "
                "eye shape and exact iris color, eyebrows, nose bridge and tip, lips, jaw, chin, cheekbones, ears, skin tone, freckles/marks, hair color, "
                "haircut, body build, height impression, posture, expression, clothing/color traits when useful, and negative_prompt terms that prevent identity drift. "
                "Do not invent franchise characters. Do not change sex, ethnicity, age group, face, hair, eye color, body type, or key colors unless absent."
            )
        if task == "character_master_prompt":
            return (
                "You are AXSTUDIO AI creating a master character portrait prompt for a desktop image-generation app. "
                "Return only valid JSON. The app UI is Italian, while prompts sent to the image engine must be English. "
                "The goal is to generate exactly one reusable photorealistic character master image, not a scene illustration. "
                "Preserve the named subject requested by the user. If the user asks for a historical, religious, mythic, or culturally known figure, "
                "keep that identity as a visual interpretation and never downgrade it into a generic man or woman. "
                "For Gesu/Gesù/Jesus/Christ, explicitly preserve Jesus of Nazareth as a 33-year-old first-century Judean/Semitic Middle Eastern man "
                "with long loose dark hair visibly falling past the shoulders on both sides, full natural untrimmed beard, olive-to-warm skin, "
                "deep peaceful gaze, and serene compassionate intensity, unless the user says otherwise. "
                "If shoulders or neckline are visible for a first-century subject, use a simple rough off-white linen tunic/robe neckline, never a modern t-shirt, crew neck, shirt, jacket, or fashion styling. "
                "No religious iconography means no halo, no sacred props, no icon painting, and no fantasy costume; it does not mean removing the Jesus identity. "
                "If the user requests long hair, never shorten it into a modern haircut; explicitly say the hair falls past the shoulders and remains loose. "
                "Force a centered full frontal face, adult subject, neutral calm expression, eyes looking into camera, both eyes visible, full face visible, "
                "head and upper shoulders only, plain neutral studio background, even soft studio lighting, realistic skin texture, natural pores, "
                "natural hair and beard detail if present, accurate iris color, anatomically plausible nose, mouth, jaw, ears, and facial proportions. "
                "Do not create cinematic scenes, dramatic costumes, halos, religious iconography, fantasy lighting, side view, three-quarter view, profile, "
                "teeth, open mouth, exaggerated beauty retouching, doll skin, cartoon, anime, illustration, or painterly style. "
                "display_final_prompt must be a complete Italian prompt ready for approval, 120-200 words, explicitly saying volto frontale centrato. "
                "final_prompt must be the English engine version with the same constraints and detail. "
                "negative_prompt must strongly reject non-frontal views, asymmetry, stylization, fake skin, extra people, occluded face, cropped head, and identity drift. "
                "Return final_prompt, display_final_prompt, negative_prompt, display_negative_prompt, style_tags, recommended_width, recommended_height, "
                "suggested_steps, guidance_scale, composition_intent='portrait', and subject_type='person'."
            )
        return (
            "You are AXSTUDIO AI for a desktop image-generation app. Return only valid JSON. "
            "The user-facing app must stay in Italian, while prompts sent to the image engine must be English. "
            "Create a detailed production-ready image prompt from the user's idea without changing the requested subject. "
            "If the input is a short idea, do not summarize it and do not simply rewrite it: expand it into a complete prompt "
            "with subject identity, scene, composition, framing, materials, colors, lighting, lens/camera or rendering language, "
            "mood, background, quality constraints, and precise details useful for high-end image generation. "
            "display_final_prompt must be a complete Italian prompt ready for the user to approve, normally 120-220 words. "
            "final_prompt must be the English engine version with the same level of detail, normally 120-220 words. "
            "Never return a one-sentence paraphrase, never keep ellipses from the user input, and never return the user's raw idea as the final prompt. "
            "Return final_prompt in English for the image engine, display_final_prompt in Italian for the app UI, "
            "negative_prompt in English, display_negative_prompt in Italian, style_tags, recommended_width, "
            "recommended_height, suggested_steps, guidance_scale, composition_intent, and subject_type. "
            "If the input is already a finished prompt, preserve its content and improve only clarity and structure. "
            "For realistic styles, use photographic camera, optics, skin, material, lighting, and scene language: focal length, aperture feel, "
            "natural skin texture, catchlights, realistic hair detail, environment, color grading, and physically plausible light. "
            "For cartoon, Disney-like, anime, comic, 3D, painting, or other non-realistic styles, convert every subject and character identity trait into that visual language "
            "without leaving photographic skin/optics behind. If a character identity is provided, keep all somatic traits stable while adapting the rendering style."
        )

    def _chat_completion_payload(self, payload: dict[str, JSONValue]) -> dict[str, JSONValue]:
        model = os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini").strip() or "openai/gpt-4o-mini"
        return cast(dict[str, JSONValue], {
            "model": model,
            "messages": [
                {"role": "system", "content": self._llm_system_prompt(payload)},
                {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
            ],
            "temperature": 0.35,
            "response_format": {"type": "json_object"},
            "max_tokens": 1800,
        })

    def _normalize_chat_completion_response(self, parsed: dict[str, Any]) -> dict[str, Any]:
        choices = parsed.get("choices")
        if isinstance(choices, list) and choices:
            first = cast(object, choices[0])
            if isinstance(first, dict):
                first_obj = cast(dict[str, object], first)
                message = first_obj.get("message")
                if isinstance(message, dict):
                    message_obj = cast(dict[str, object], message)
                    content = message_obj.get("content")
                    if isinstance(content, dict):
                        return cast(dict[str, Any], content)
                    if isinstance(content, str) and content.strip():
                        return self._extract_json_object(content)
        return parsed

    def _post_json(self, endpoint: str, payload: dict[str, JSONValue], *, timeout: int) -> dict[str, Any]:
        headers: dict[str, str] = {}
        is_chat_completion = self._is_chat_completion_endpoint(endpoint)
        llm_model = os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini").strip() or "openai/gpt-4o-mini"
        api_key = self._read_openrouter_api_key_from_credentials() if is_chat_completion else (
            getattr(self.state.app_settings, 'ax_modal_api_key', "").strip()
            or self._read_openrouter_api_key_from_credentials()
        )
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        if is_chat_completion:
            headers["Content-Type"] = "application/json"
            payload = self._chat_completion_payload(payload)
            logger.info("AXSTUDIO AI request via OpenRouter model=%s endpoint=%s", llm_model, endpoint)
        try:
            started_at = time.perf_counter()
            response = self._http.post(endpoint, headers=headers or None, json_payload=payload, timeout=timeout)
            elapsed_ms = int((time.perf_counter() - started_at) * 1000)
            if is_chat_completion:
                logger.info("AXSTUDIO AI OpenRouter response status=%s elapsed_ms=%s", response.status_code, elapsed_ms)
        except HttpTimeoutError as exc:
            raise HTTPError(504, "Modal request timed out") from exc
        if response.status_code < 200 or response.status_code >= 300:
            raise HTTPError(response.status_code, response.text or f"HTTP {response.status_code}")
        parsed = response.json()
        if not isinstance(parsed, dict):
            raise HTTPError(502, "Modal endpoint response must be a JSON object")
        normalized = cast(dict[str, Any], parsed)
        if is_chat_completion:
            return self._normalize_chat_completion_response(normalized)
        return normalized

    def _looks_like_italian_prompt(self, text: str) -> bool:
        lowered = f" {text.lower()} "
        if re.search(r"[àèéìòù]", lowered):
            return True
        italian_terms = (
            " una ", " uno ", " delle ", " degli ", " con ", " senza ", " donna ", " uomo ",
            " ragazza ", " ragazzo ", " capelli ", " occhi ", " seduta ", " seduto ", " strada ",
            " città ", " luce ", " sfondo ", " immagine ", " realistico ", " cartone ", " personaggio ",
        )
        return any(term in lowered for term in italian_terms)

    def _translate_text_for_image_engine(
        self,
        text: str,
        *,
        kind: Literal["prompt", "negative_prompt", "style"],
    ) -> str:
        source = text.strip()
        if not source or not self._looks_like_italian_prompt(source):
            return source
        endpoint = self._resolve_llm_prompt_endpoint()
        if not endpoint:
            logger.warning("Italian image prompt detected but no LLM endpoint is configured for engine translation")
            return source
        payload = cast(dict[str, JSONValue], {
            "task": "translate_prompt",
            "text": source,
            "prompt": source,
            "input": source,
            "kind": kind,
            "source_language": "it",
            "target_language": "en",
            "instructions": "Translate faithfully for an image generation engine. Preserve character identity, style, colors, camera framing, format, and constraints.",
        })
        try:
            result = self._post_json(endpoint, payload, timeout=MODAL_LLM_PROMPT_TIMEOUT_SECONDS)
            translated = self._normalize_translated_prompt(
                result,
                ModalPromptTranslateRequest(
                    text=source,
                    source_language="it",
                    target_language="en",
                    kind=kind,
                ),
            ).translated_text.strip()
            return translated or source
        except Exception as exc:
            logger.warning("Unable to translate image prompt to English; using original text: %s", exc)
            return source

    def _resolve_image_generation_endpoint(
        self,
        configured_endpoint: str,
        *,
        selected_style_id: str | None,
        selected_style_category: str | None,
    ) -> str:
        _ = (configured_endpoint, selected_style_category)
        if (selected_style_id or "").strip() == CHARACTER_MASTER_STYLE_ID:
            return AXSTUDIO_COMFYUI_IMAGE_ENDPOINT
        return AXSTUDIO_FLUX2_IMAGE_ENDPOINT

    def _style_prefers_flux2(self, selected_style_id: str | None, selected_style_category: str | None) -> bool:
        style_id = (selected_style_id or "").strip()
        category = (selected_style_category or "").strip()
        return style_id in FLUX2_DEFAULT_STYLE_IDS or category in FLUX2_DEFAULT_STYLE_CATEGORIES

    def _worker_style_id_for_generation_speed(
        self,
        *,
        selected_style_id: str | None,
        selected_style_category: str | None,
        character_lora_requested: bool,
    ) -> str | None:
        style_id = (selected_style_id or "").strip()
        category = (selected_style_category or "").strip()
        if not style_id:
            return None
        if style_id == CHARACTER_MASTER_STYLE_ID:
            return None
        if category == "realistic_photo" and not character_lora_requested:
            return None
        return style_id

    def _is_comfyui_endpoint(self, endpoint: str) -> bool:
        normalized = endpoint.rstrip("/")
        return "comfyui" in normalized or normalized.endswith(".modal.run") and not normalized.endswith("/generate")

    def _apply_style_generation_profile(
        self,
        *,
        prompt: str,
        negative_prompt: str,
        steps: int,
        guidance_scale: float,
        selected_style_id: str | None,
        selected_style_category: str | None,
    ) -> tuple[str, str, int, float, str, str | None, float]:
        profile = self._generation_profile_for_style(selected_style_id, selected_style_category)
        if not profile:
            return prompt, negative_prompt, steps, guidance_scale, AXSTUDIO_IMAGE_CHECKPOINT, None, 0.0

        animal_subject = ANIMAL_SUBJECT_PATTERN.search(prompt) is not None
        profile_prompt_prefix = str(profile.get("prompt_prefix", "")).strip()
        profile_prompt_suffix = str(profile.get("prompt_suffix", "")).strip()
        if animal_subject:
            profile_prompt_prefix = _animal_safe_style_text(profile_prompt_prefix)
            profile_prompt_suffix = _animal_safe_style_text(profile_prompt_suffix)

        prompt_parts = [
            prompt.strip(),
            (
                "ANIMAL SUBJECT ONLY: preserve the requested animal species exactly; "
                "the subject must be a dog or poodle character, not a human, not a girl, not a person in costume"
            ) if animal_subject else "preserve the exact requested subject and action",
            profile_prompt_prefix,
            profile_prompt_suffix,
        ]
        profiled_prompt = "\n\n".join(part for part in prompt_parts if part)
        profiled_negative = self._merge_comma_prompt_parts(
            negative_prompt,
            profile.get("negative_extra", ""),
            ANIMAL_SUBJECT_NEGATIVE_PROMPT if animal_subject else "",
        )
        profiled_steps = max(steps, int(profile.get("min_steps", steps)))
        profiled_guidance = max(guidance_scale, float(profile.get("min_guidance_scale", guidance_scale)))
        checkpoint = profile.get("checkpoint", AXSTUDIO_IMAGE_CHECKPOINT) or AXSTUDIO_IMAGE_CHECKPOINT
        lora_name = profile.get("lora_name")
        if lora_name is not None and not lora_name.strip():
            lora_name = None
        lora_strength = float(profile.get("lora_strength", 0.0))
        return (
            profiled_prompt,
            profiled_negative,
            profiled_steps,
            profiled_guidance,
            checkpoint,
            lora_name,
            lora_strength,
        )

    def _generation_profile_for_style(
        self,
        selected_style_id: str | None,
        selected_style_category: str | None,
    ) -> StyleGenerationProfile:
        style_id = (selected_style_id or "").strip()
        lora_profile = STYLE_LORA_GENERATION_PROFILES.get(style_id)
        if style_id in STYLE_ID_GENERATION_PROFILES:
            base_profile = cast(StyleGenerationProfile, dict(STYLE_ID_GENERATION_PROFILES[style_id]))
            if lora_profile:
                base_profile.update(lora_profile)
            return base_profile
        category = (selected_style_category or "").strip()
        if category in STYLE_CATEGORY_GENERATION_PROFILES:
            category_profile = cast(StyleGenerationProfile, dict(STYLE_CATEGORY_GENERATION_PROFILES[category]))
            if lora_profile:
                category_profile.update(lora_profile)
            return category_profile
        if lora_profile:
            return lora_profile
        return {}

    def _merge_comma_prompt_parts(self, *parts: str) -> str:
        merged: list[str] = []
        seen: set[str] = set()
        for part in parts:
            for raw_item in part.split(","):
                item = raw_item.strip()
                key = item.lower()
                if item and key not in seen:
                    merged.append(item)
                    seen.add(key)
        return ", ".join(merged)

    def _generate_comfyui_image(
        self,
        *,
        endpoint: str,
        checkpoint: str,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        steps: int,
        guidance_scale: float,
        seed: int | None,
        quality_mode: str,
        lora_name: str | None,
        lora_strength: float,
    ) -> dict[str, Any]:
        start = time.perf_counter()
        actual_seed = seed if seed is not None else int(time.time() * 1000) % 2_147_483_647
        filename_prefix = f"axstudio_1_0_{int(time.time())}"
        workflow = self._build_comfyui_text_to_image_workflow(
            checkpoint=checkpoint,
            prompt=prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            steps=steps,
            guidance_scale=guidance_scale,
            seed=actual_seed,
            filename_prefix=filename_prefix,
            lora_name=lora_name,
            lora_strength=lora_strength,
        )
        base_endpoint = endpoint.rstrip("/")
        response = self._post_json(
            base_endpoint + "/prompt",
            {"prompt": cast(JSONValue, workflow)},
            timeout=COMFYUI_PROMPT_SUBMIT_TIMEOUT_SECONDS,
        )
        prompt_id = response.get("prompt_id")
        if not isinstance(prompt_id, str) or not prompt_id:
            raise HTTPError(502, f"ComfyUI did not return prompt_id: {response}")

        history_item = self._wait_for_comfyui_history(base_endpoint, prompt_id)
        filename, subfolder, output_type = self._extract_comfyui_output_image(history_item)
        image_bytes = self._download_comfyui_image(base_endpoint, filename, subfolder, output_type)
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        return {
            "image_base64": base64.b64encode(image_bytes).decode("ascii"),
            "seed": actual_seed,
            "width": width,
            "height": height,
            "requested_steps": steps,
            "actual_steps": steps,
            "guidance_scale": guidance_scale,
            "quality_mode": quality_mode,
            "effective_width": width,
            "effective_height": height,
            "negative_prompt_applied": bool(negative_prompt.strip()),
            "elapsed_ms": elapsed_ms,
        }

    def _build_comfyui_text_to_image_workflow(
        self,
        *,
        checkpoint: str,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        steps: int,
        guidance_scale: float,
        seed: int,
        filename_prefix: str,
        lora_name: str | None,
        lora_strength: float,
    ) -> dict[str, Any]:
        model_node: list[Any] = ["1", 0]
        clip_node: list[Any] = ["1", 1]
        workflow: dict[str, Any] = {
            "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": checkpoint}},
        }
        if lora_name:
            workflow["8"] = {
                "class_type": "LoraLoader",
                "inputs": {
                    "model": ["1", 0],
                    "clip": ["1", 1],
                    "lora_name": lora_name,
                    "strength_model": lora_strength,
                    "strength_clip": lora_strength,
                },
            }
            model_node = ["8", 0]
            clip_node = ["8", 1]

        workflow.update({
            "2": {"class_type": "CLIPTextEncode", "inputs": {"clip": clip_node, "text": prompt}},
            "3": {"class_type": "CLIPTextEncode", "inputs": {"clip": clip_node, "text": negative_prompt}},
            "4": {"class_type": "EmptyLatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}},
            "5": {
                "class_type": "KSampler",
                "inputs": {
                    "model": model_node,
                    "seed": seed,
                    "steps": steps,
                    "cfg": guidance_scale,
                    "sampler_name": "dpmpp_2m_sde",
                    "scheduler": "karras",
                    "positive": ["2", 0],
                    "negative": ["3", 0],
                    "latent_image": ["4", 0],
                    "denoise": 1.0,
                },
            },
            "6": {"class_type": "VAEDecode", "inputs": {"samples": ["5", 0], "vae": ["1", 2]}},
            "7": {"class_type": "SaveImage", "inputs": {"images": ["6", 0], "filename_prefix": filename_prefix}},
        })
        return workflow

    def _should_refine_flux_with_comfyui(
        self,
        selected_style_id: str | None,
        selected_style_category: str | None,
    ) -> bool:
        if not AXSTUDIO_FLUX_COMFYUI_EYE_REFINE_ENABLED:
            return False
        style_id = (selected_style_id or "").strip()
        category = (selected_style_category or "").strip()
        return category in COMFYUI_EYE_REFINE_STYLE_CATEGORIES or style_id in COMFYUI_EYE_REFINE_STYLE_IDS

    def _style_uses_character_reference_identity(
        self,
        *,
        selected_style_id: str | None,
        selected_style_category: str | None,
    ) -> bool:
        if not AXSTUDIO_FLUX_CHARACTER_REFERENCE_ENABLED:
            return False
        style_id = (selected_style_id or "").strip()
        category = (selected_style_category or "").strip()
        return (
            category in COMFYUI_CHARACTER_REFERENCE_STYLE_CATEGORIES
            or style_id in COMFYUI_CHARACTER_REFERENCE_STYLE_IDS
        )

    def _should_apply_character_reference_identity(
        self,
        *,
        selected_style_id: str | None,
        selected_style_category: str | None,
        image_character_image_path: str | None,
    ) -> bool:
        return bool((image_character_image_path or "").strip()) and self._style_uses_character_reference_identity(
            selected_style_id=selected_style_id,
            selected_style_category=selected_style_category,
        )

    def _is_wide_character_scene_prompt(self, prompt: str) -> bool:
        return WIDE_CHARACTER_SCENE_PATTERN.search(prompt) is not None

    def _apply_character_reference_identity_with_comfyui(
        self,
        *,
        result: dict[str, Any],
        reference_image_path: str,
        prompt: str,
        negative_prompt: str,
        seed: int | None,
        quality_mode: str,
    ) -> dict[str, Any]:
        image_base64 = result.get("image_base64")
        if not isinstance(image_base64, str) or not image_base64.strip():
            return result

        reference_path = Path(reference_image_path).expanduser()
        if not reference_path.exists():
            raise HTTPError(422, f"Character reference image not found: {reference_path}")

        start = time.perf_counter()
        image_bytes = self._decode_image_base64(image_base64)
        base_endpoint = AXSTUDIO_COMFYUI_IMAGE_ENDPOINT.rstrip("/")
        stamp = int(time.time() * 1000)
        target_name = self._upload_comfyui_input_image(base_endpoint, f"axstudio_character_target_{stamp}.png", image_bytes)
        reference_name = self._upload_comfyui_input_image(
            base_endpoint,
            f"axstudio_character_reference_{stamp}.png",
            reference_path.read_bytes(),
        )
        actual_seed = seed if seed is not None else self._coerce_int(result.get("seed"), fallback=stamp % 2_147_483_647)
        identity_steps = 16
        identity_denoise = 0.34
        identity_faceid_weight = 1.65
        workflow = self._build_comfyui_character_identity_workflow(
            target_image_name=target_name,
            reference_image_name=reference_name,
            prompt=self._merge_prompt_parts(
                prompt,
                "same person as the character reference image, matching facial identity, preserve target body, preserve target pose, preserve target clothing, preserve target lighting, preserve target scene, natural realistic face",
            ),
            negative_prompt=self._merge_prompt_parts(
                negative_prompt,
                "different person, changed identity, changed eye color, changed eye shape, changed nose, changed lips, changed ears, deformed eyes, distorted iris, bad teeth, detached teeth, waxy skin, plastic face",
            ),
            seed=actual_seed,
            steps=identity_steps,
            cfg=3.4,
            denoise=identity_denoise,
            faceid_weight=identity_faceid_weight,
            filename_prefix=f"axstudio_character_faceid_{int(time.time())}",
        )
        response = self._post_json(
            base_endpoint + "/prompt",
            {"prompt": cast(JSONValue, workflow)},
            timeout=COMFYUI_PROMPT_SUBMIT_TIMEOUT_SECONDS,
        )
        prompt_id = response.get("prompt_id")
        if not isinstance(prompt_id, str) or not prompt_id:
            raise HTTPError(502, f"ComfyUI character FaceID did not return prompt_id: {response}")

        history_item = self._wait_for_comfyui_history(base_endpoint, prompt_id)
        filename, subfolder, output_type = self._extract_comfyui_output_image(history_item)
        identity_bytes = self._download_comfyui_image(base_endpoint, filename, subfolder, output_type)
        elapsed_ms = self._coerce_int(result.get("elapsed_ms"), fallback=0) + int((time.perf_counter() - start) * 1000)
        refined = dict(result)
        refined.update(
            {
                "image_base64": base64.b64encode(identity_bytes).decode("ascii"),
                "model": (
                    f"{result.get('model') or 'FLUX'} + "
                    f"ComfyUIFaceID:{AXSTUDIO_COMFYUI_FACEID_CHECKPOINT}:IPAdapterFaceIDPlusV2:InstantID"
                ),
                "elapsed_ms": elapsed_ms,
                "quality_mode": quality_mode,
                "comfyui_identity_reference_applied": True,
                "comfyui_identity_reference_engine": "ComfyUI FaceID Plus V2 + InstantID",
                "comfyui_identity_reference_image_path": str(reference_path),
                "comfyui_identity_reference_checkpoint": AXSTUDIO_COMFYUI_FACEID_CHECKPOINT,
                "comfyui_identity_reference_denoise": identity_denoise,
                "comfyui_identity_reference_steps": identity_steps,
                "comfyui_identity_reference_faceid_weight": identity_faceid_weight,
            }
        )
        return refined

    def _refine_flux_image_with_comfyui(
        self,
        *,
        result: dict[str, Any],
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        seed: int | None,
        quality_mode: str,
        preserve_character_details: bool = False,
        wide_character_scene: bool = False,
    ) -> dict[str, Any]:
        image_base64 = result.get("image_base64")
        if not isinstance(image_base64, str) or not image_base64.strip():
            return result

        start = time.perf_counter()
        image_bytes = self._decode_image_base64(image_base64)
        base_endpoint = AXSTUDIO_COMFYUI_IMAGE_ENDPOINT.rstrip("/")
        upload_name = f"axstudio_flux_refine_{int(time.time() * 1000)}.png"
        uploaded_name = self._upload_comfyui_input_image(base_endpoint, upload_name, image_bytes)
        actual_seed = seed if seed is not None else self._coerce_int(result.get("seed"), fallback=int(time.time() * 1000) % 2_147_483_647)
        target_width, target_height = self._target_4k_dimensions(width, height)
        if preserve_character_details:
            refine_denoise = 0.02 if wide_character_scene else 0.025
            refine_steps = 4 if wide_character_scene else 5
            refine_guidance = 2.4 if wide_character_scene else 2.8
            use_eye_lora = False
        else:
            refine_denoise = 0.12
            refine_steps = 10
            refine_guidance = 5.0
            use_eye_lora = True
        eye_lora_model_strength = 0.0 if not use_eye_lora else 0.28
        eye_lora_clip_strength = 0.0 if not use_eye_lora else 0.18
        detail_prompt = (
            "conservative 4k upscale only, preserve the existing face identity exactly, preserve original eye color exactly, "
            "preserve existing eyelids, iris shape, nose, lips, ears, teeth and hand anatomy, do not repaint eyes, "
            "do not redraw eyelashes, do not beautify or reshape the person, do not change pose, do not change body, "
            "do not change scene, keep realistic skin texture and existing facial micro-detail"
            if preserve_character_details
            else "natural realistic eyes, anatomically plausible eyelids, layered iris texture, soft catchlights, subtle sclera shading, coherent gaze, realistic lower eyelids, realistic face detail"
        )
        detail_negative_prompt = (
            "different person, changed identity, changed eye color, brown eyes, black eyes, deformed eyes, crossed eyes, asymmetrical eyes, "
            "distorted iris, repainted iris, fake eyelashes, painted eyelashes, glassy doll eyes, beauty reshape, glamour face, "
            "waxy skin, plastic face, over-smoothed skin, deformed ears, changed nose, changed lips, bad teeth, detached teeth, "
            "broken teeth, bad hands, deformed fingers, fused fingers, extra fingers, melted fingers"
            if preserve_character_details
            else "bad eyes, deformed eyes, crossed eyes, asymmetrical eyes, blurry eyes, dead eyes, duplicate pupils, distorted iris, fake eyelashes, painted eyelashes, clumped eyelashes, glassy doll eyes, oversized catchlights, waxy skin, plastic face"
        )
        workflow = self._build_comfyui_eye_refine_4k_workflow(
            image_name=uploaded_name,
            checkpoint=AXSTUDIO_IMAGE_CHECKPOINT,
            prompt=self._merge_prompt_parts(
                prompt,
                detail_prompt,
            ),
            negative_prompt=self._merge_prompt_parts(
                negative_prompt,
                detail_negative_prompt,
            ),
            seed=actual_seed,
            steps=refine_steps,
            guidance_scale=refine_guidance,
            denoise=refine_denoise,
            target_width=target_width,
            target_height=target_height,
            use_eye_lora=use_eye_lora,
            eye_lora_model_strength=eye_lora_model_strength,
            eye_lora_clip_strength=eye_lora_clip_strength,
            filename_prefix=f"axstudio_flux_eye_refine_4k_{int(time.time())}",
        )
        response = self._post_json(
            base_endpoint + "/prompt",
            {"prompt": cast(JSONValue, workflow)},
            timeout=COMFYUI_PROMPT_SUBMIT_TIMEOUT_SECONDS,
        )
        prompt_id = response.get("prompt_id")
        if not isinstance(prompt_id, str) or not prompt_id:
            raise HTTPError(502, f"ComfyUI eye refine did not return prompt_id: {response}")

        history_item = self._wait_for_comfyui_history(base_endpoint, prompt_id)
        filename, subfolder, output_type = self._extract_comfyui_output_image(history_item)
        refined_bytes = self._download_comfyui_image(base_endpoint, filename, subfolder, output_type)
        elapsed_ms = self._coerce_int(result.get("elapsed_ms"), fallback=0) + int((time.perf_counter() - start) * 1000)
        refined = dict(result)
        refined.update(
            {
                "image_base64": base64.b64encode(refined_bytes).decode("ascii"),
                "model": (
                    f"{result.get('model') or 'FLUX'} + "
                    f"ComfyUI:{AXSTUDIO_IMAGE_CHECKPOINT}:"
                    f"{AXSTUDIO_COMFYUI_EYES_LORA if use_eye_lora else 'no-eye-lora-preserve-character'}:"
                    f"{AXSTUDIO_COMFYUI_UPSCALER}:4K"
                ),
                "width": target_width,
                "height": target_height,
                "effective_width": target_width,
                "effective_height": target_height,
                "elapsed_ms": elapsed_ms,
                "quality_mode": quality_mode,
                "comfyui_eye_refine_applied": True,
                "comfyui_eye_refine_lora": AXSTUDIO_COMFYUI_EYES_LORA if use_eye_lora else None,
                "comfyui_eye_refine_lora_disabled_reason": "preserve_character_identity" if not use_eye_lora else None,
                "comfyui_eye_refine_checkpoint": AXSTUDIO_IMAGE_CHECKPOINT,
                "comfyui_eye_refine_denoise": refine_denoise,
                "comfyui_eye_refine_steps": refine_steps,
                "comfyui_eye_refine_guidance_scale": refine_guidance,
                "comfyui_eye_refine_preserve_character_details": preserve_character_details,
                "comfyui_eye_refine_wide_character_scene": wide_character_scene,
            }
        )
        return refined

    def _merge_prompt_parts(self, *parts: str) -> str:
        merged: list[str] = []
        seen: set[str] = set()
        for part in parts:
            for raw_item in part.split(","):
                item = raw_item.strip()
                key = item.lower()
                if item and key not in seen:
                    merged.append(item)
                    seen.add(key)
        return ", ".join(merged)

    def _upload_comfyui_input_image(self, endpoint: str, filename: str, image_bytes: bytes) -> str:
        boundary = f"----AXSTUDIO{int(time.time() * 1000)}"
        body = b"".join(
            [
                f"--{boundary}\r\n".encode("utf-8"),
                f'Content-Disposition: form-data; name="image"; filename="{filename}"\r\n'.encode("utf-8"),
                b"Content-Type: image/png\r\n\r\n",
                image_bytes,
                b"\r\n",
                f"--{boundary}\r\n".encode("utf-8"),
                b'Content-Disposition: form-data; name="type"\r\n\r\ninput\r\n',
                f"--{boundary}\r\n".encode("utf-8"),
                b'Content-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n',
                f"--{boundary}--\r\n".encode("utf-8"),
            ]
        )
        response = self._http.post(
            endpoint.rstrip() + "/upload/image",
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
            data=body,
            timeout=180,
        )
        if response.status_code < 200 or response.status_code >= 300:
            raise HTTPError(response.status_code, response.text or f"HTTP {response.status_code}")
        parsed = response.json()
        if not isinstance(parsed, dict):
            raise HTTPError(502, "ComfyUI upload response must be a JSON object")
        parsed_obj = cast(dict[str, object], parsed)
        name = parsed_obj.get("name")
        if not isinstance(name, str) or not name:
            raise HTTPError(502, f"ComfyUI upload did not return image name: {parsed}")
        return name

    def _build_comfyui_character_identity_workflow(
        self,
        *,
        target_image_name: str,
        reference_image_name: str,
        prompt: str,
        negative_prompt: str,
        seed: int,
        steps: int,
        cfg: float,
        denoise: float,
        faceid_weight: float,
        filename_prefix: str,
    ) -> dict[str, Any]:
        return {
            "1": {"class_type": "LoadImage", "inputs": {"image": target_image_name}},
            "2": {"class_type": "LoadImage", "inputs": {"image": reference_image_name}},
            "3": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {"ckpt_name": AXSTUDIO_COMFYUI_FACEID_CHECKPOINT},
            },
            "4": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["3", 1], "text": prompt}},
            "5": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["3", 1], "text": negative_prompt}},
            "6": {"class_type": "UltralyticsDetectorProvider", "inputs": {"model_name": "bbox/face_yolov8m.pt"}},
            "7": {
                "class_type": "BboxDetectorSEGS",
                "inputs": {
                    "bbox_detector": ["6", 0],
                    "image": ["1", 0],
                    "threshold": 0.45,
                    "dilation": 12,
                    "crop_factor": 1.55,
                    "drop_size": 10,
                    "labels": "face",
                },
            },
            "8": {"class_type": "SegsToCombinedMask", "inputs": {"segs": ["7", 0]}},
            "9": {"class_type": "GrowMask", "inputs": {"mask": ["8", 0], "expand": 56, "tapered_corners": True}},
            "10": {
                "class_type": "FeatherMask",
                "inputs": {"mask": ["9", 0], "left": 96, "top": 96, "right": 96, "bottom": 96},
            },
            "13": {
                "class_type": "IPAdapterUnifiedLoaderFaceID",
                "inputs": {
                    "model": ["3", 0],
                    "preset": "FACEID PLUS V2",
                    "lora_strength": 0.78,
                    "provider": "CUDA",
                },
            },
            "14": {"class_type": "IPAdapterInsightFaceLoader", "inputs": {"provider": "CUDA", "model_name": "antelopev2"}},
            "15": {
                "class_type": "IPAdapterFaceID",
                "inputs": {
                    "model": ["13", 0],
                    "ipadapter": ["13", 1],
                    "image": ["2", 0],
                    "weight": 1.10,
                    "weight_faceidv2": faceid_weight,
                    "weight_type": "linear",
                    "combine_embeds": "concat",
                    "start_at": 0.0,
                    "end_at": 0.9,
                    "embeds_scaling": "V only",
                    "attn_mask": ["10", 0],
                    "insightface": ["14", 0],
                },
            },
            "16": {"class_type": "InstantIDModelLoader", "inputs": {"instantid_file": "ip-adapter.bin"}},
            "17": {"class_type": "InstantIDFaceAnalysis", "inputs": {"provider": "CUDA"}},
            "18": {
                "class_type": "ControlNetLoader",
                "inputs": {"control_net_name": "InstantID-ControlNet/diffusion_pytorch_model.safetensors"},
            },
            "19": {
                "class_type": "ApplyInstantIDAdvanced",
                "inputs": {
                    "instantid": ["16", 0],
                    "insightface": ["17", 0],
                    "control_net": ["18", 0],
                    "image": ["2", 0],
                    "model": ["15", 0],
                    "positive": ["4", 0],
                    "negative": ["5", 0],
                    "ip_weight": 0.52,
                    "cn_strength": 0.34,
                    "start_at": 0.0,
                    "end_at": 0.75,
                    "noise": 0.0,
                    "combine_embeds": "average",
                    "mask": ["10", 0],
                },
            },
            "20": {
                "class_type": "InpaintModelConditioning",
                "inputs": {
                    "positive": ["19", 1],
                    "negative": ["19", 2],
                    "vae": ["3", 2],
                    "pixels": ["1", 0],
                    "mask": ["10", 0],
                    "noise_mask": True,
                },
            },
            "21": {
                "class_type": "KSampler",
                "inputs": {
                    "model": ["19", 0],
                    "seed": seed,
                    "steps": steps,
                    "cfg": cfg,
                    "sampler_name": "dpmpp_2m_sde",
                    "scheduler": "karras",
                    "positive": ["20", 0],
                    "negative": ["20", 1],
                    "latent_image": ["20", 2],
                    "denoise": denoise,
                },
            },
            "22": {"class_type": "VAEDecode", "inputs": {"samples": ["21", 0], "vae": ["3", 2]}},
            "23": {"class_type": "SaveImage", "inputs": {"images": ["22", 0], "filename_prefix": filename_prefix}},
        }

    def _build_comfyui_eye_refine_4k_workflow(
        self,
        *,
        image_name: str,
        checkpoint: str,
        prompt: str,
        negative_prompt: str,
        seed: int,
        steps: int,
        guidance_scale: float,
        denoise: float,
        target_width: int,
        target_height: int,
        use_eye_lora: bool,
        eye_lora_model_strength: float,
        eye_lora_clip_strength: float,
        filename_prefix: str,
    ) -> dict[str, Any]:
        model_source: list[Any] = ["2", 0] if use_eye_lora else ["1", 0]
        clip_source: list[Any] = ["2", 1] if use_eye_lora else ["1", 1]
        workflow: dict[str, Any] = {
            "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": checkpoint}},
            "3": {"class_type": "LoadImage", "inputs": {"image": image_name}},
            "4": {"class_type": "CLIPTextEncode", "inputs": {"clip": clip_source, "text": prompt}},
            "5": {"class_type": "CLIPTextEncode", "inputs": {"clip": clip_source, "text": negative_prompt}},
            "6": {"class_type": "VAEEncode", "inputs": {"pixels": ["3", 0], "vae": ["1", 2]}},
            "7": {
                "class_type": "KSampler",
                "inputs": {
                    "model": model_source,
                    "seed": seed,
                    "steps": steps,
                    "cfg": guidance_scale,
                    "sampler_name": "dpmpp_2m_sde",
                    "scheduler": "karras",
                    "positive": ["4", 0],
                    "negative": ["5", 0],
                    "latent_image": ["6", 0],
                    "denoise": denoise,
                },
            },
            "12": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["1", 2]}},
            "8": {
                "class_type": "UpscaleModelLoader",
                "inputs": {"model_name": AXSTUDIO_COMFYUI_UPSCALER},
            },
            "9": {
                "class_type": "ImageUpscaleWithModel",
                "inputs": {
                    "upscale_model": ["8", 0],
                    "image": ["12", 0],
                },
            },
            "10": {
                "class_type": "ImageScale",
                "inputs": {
                    "image": ["9", 0],
                    "upscale_method": "lanczos",
                    "width": target_width,
                    "height": target_height,
                    "crop": "disabled",
                },
            },
            "11": {"class_type": "SaveImage", "inputs": {"images": ["10", 0], "filename_prefix": filename_prefix}},
        }
        if use_eye_lora:
            workflow["2"] = {
                "class_type": "LoraLoader",
                "inputs": {
                    "model": ["1", 0],
                    "clip": ["1", 1],
                    "lora_name": AXSTUDIO_COMFYUI_EYES_LORA,
                    "strength_model": eye_lora_model_strength,
                    "strength_clip": eye_lora_clip_strength,
                },
            }
        return workflow

    def _target_4k_dimensions(self, width: int, height: int) -> tuple[int, int]:
        if width <= 0 or height <= 0:
            return 3840, 2160
        ratio = width / height
        if abs(ratio - (16 / 9)) < 0.06:
            return 3840, 2160
        if abs(ratio - (9 / 16)) < 0.06:
            return 2160, 3840
        if abs(ratio - (4 / 3)) < 0.06:
            return 3840, 2880
        if abs(ratio - (3 / 4)) < 0.06:
            return 2880, 3840
        if width == height:
            return 2160, 2160
        if width > height:
            target_width = 3840
            target_height = round((height / width) * target_width / 8) * 8
            return target_width, max(8, target_height)
        target_height = 3840
        target_width = round((width / height) * target_height / 8) * 8
        return max(8, target_width), target_height

    def _wait_for_comfyui_history(self, endpoint: str, prompt_id: str) -> dict[str, Any]:
        deadline = time.monotonic() + MODAL_FLUX_IMAGE_TIMEOUT_SECONDS
        last_response: dict[str, Any] = {}
        while time.monotonic() < deadline:
            response = self._http.get(f"{endpoint}/history/{prompt_id}", timeout=60)
            if response.status_code < 200 or response.status_code >= 300:
                raise HTTPError(response.status_code, response.text or f"HTTP {response.status_code}")
            parsed = response.json()
            if not isinstance(parsed, dict):
                raise HTTPError(502, "ComfyUI history response must be a JSON object")
            last_response = cast(dict[str, Any], parsed)
            item = last_response.get(prompt_id)
            if isinstance(item, dict):
                item_obj = cast(dict[str, Any], item)
                status = item_obj.get("status")
                if isinstance(status, dict):
                    status_obj = cast(dict[str, Any], status)
                    if status_obj.get("status_str") == "error":
                        raise HTTPError(502, f"ComfyUI prompt failed: {status_obj}")
                if item_obj.get("outputs"):
                    return item_obj
            time.sleep(2)
        raise HTTPError(504, f"Timed out waiting for ComfyUI history. Last response: {last_response}")

    def _extract_comfyui_output_image(self, history_item: dict[str, Any]) -> tuple[str, str, str]:
        outputs = history_item.get("outputs")
        if not isinstance(outputs, dict):
            raise HTTPError(502, "ComfyUI history did not contain outputs")
        outputs_obj = cast(dict[str, Any], outputs)
        for output in outputs_obj.values():
            if not isinstance(output, dict):
                continue
            output_obj = cast(dict[str, Any], output)
            images = output_obj.get("images")
            if not isinstance(images, list):
                continue
            for image in cast(list[object], images):
                if not isinstance(image, dict):
                    continue
                image_obj = cast(dict[str, Any], image)
                filename = image_obj.get("filename")
                if isinstance(filename, str) and filename:
                    subfolder = image_obj.get("subfolder")
                    output_type = image_obj.get("type")
                    return (
                        filename,
                        subfolder if isinstance(subfolder, str) else "",
                        output_type if isinstance(output_type, str) else "output",
                    )
        raise HTTPError(502, "ComfyUI history did not contain an output image")

    def _download_comfyui_image(self, endpoint: str, filename: str, subfolder: str, output_type: str) -> bytes:
        query = urllib.parse.urlencode({"filename": filename, "subfolder": subfolder, "type": output_type})
        response = self._http.get(endpoint.rstrip("/") + "/view?" + query, timeout=180)
        if response.status_code < 200 or response.status_code >= 300:
            raise HTTPError(response.status_code, response.text or f"HTTP {response.status_code}")
        if not response.content:
            raise HTTPError(502, "ComfyUI returned an empty image")
        return response.content

    def _decode_image_base64(self, value: str) -> bytes:
        payload = value.partition(",")[2] if value.startswith("data:") else value
        try:
            return base64.b64decode(payload, validate=True)
        except binascii.Error as exc:
            raise HTTPError(502, "Modal FLUX worker returned invalid base64 image data") from exc

    def _normalize_translated_prompt(self, result: dict[str, Any], req: ModalPromptTranslateRequest) -> ModalPromptTranslateResponse:
        raw_output = result.get("output")
        output = cast(dict[str, Any], raw_output) if isinstance(raw_output, dict) else result
        translated_text = ""
        for key in ("translated_text", "translation", "final_prompt", "prompt", "text"):
            value = output.get(key)
            if isinstance(value, str) and value.strip():
                translated_text = value.strip()
                break
        if not translated_text:
            translated_text = req.text.strip()
        return ModalPromptTranslateResponse(translated_text=translated_text, source_language=req.source_language, target_language=req.target_language, kind=req.kind)

    def _composition_intent(self, idea: str, output: dict[str, Any]) -> CompositionIntent:
        raw = str(output.get("composition_intent") or "").strip().lower()
        if raw in {"portrait", "full_body", "landscape_scene", "product", "architecture", "generic"}:
            return cast(CompositionIntent, raw)
        if FULL_BODY_INTENT_PATTERN.search(idea): return "full_body"
        if ARCHITECTURE_INTENT_PATTERN.search(idea): return "architecture"
        if PRODUCT_INTENT_PATTERN.search(idea): return "product"
        if PORTRAIT_INTENT_PATTERN.search(idea): return "portrait"
        if LANDSCAPE_SCENE_INTENT_PATTERN.search(idea): return "landscape_scene"
        return "generic"

    def _subject_type(self, idea: str, prompt: str) -> SubjectType:
        source = f"{idea} {prompt}".lower()
        if ANIMAL_SUBJECT_PATTERN.search(source):
            return "object"
        has_person = re.search(r"\b(person|people|human|woman|man|girl|boy|donna|uomo|persona|soggetto)\b", source) is not None
        has_environment = LANDSCAPE_SCENE_INTENT_PATTERN.search(source) is not None
        has_architecture = ARCHITECTURE_INTENT_PATTERN.search(source) is not None
        has_product = PRODUCT_INTENT_PATTERN.search(source) is not None
        if has_product: return "product"
        if has_architecture: return "architecture"
        if has_person and (has_environment or has_architecture): return "mixed"
        if has_person: return "person"
        if has_environment: return "environment"
        return "generic"

    def _dimensions_for_aspect_ratio(self, aspect_ratio: str | None, composition_intent: CompositionIntent | None = None) -> tuple[int, int]:
        if composition_intent == "full_body":
            return 768, 1344
        match aspect_ratio:
            case "1:1": return 1024, 1024
            case "9:16": return 1024, 1792
            case "4:3": return 1344, 1024
            case "3:4": return 1024, 1344
            case "16:9" | _: return 1344, 768

    def _string_list(self, value: object) -> list[str]:
        if isinstance(value, list):
            return [str(item).strip() for item in cast(list[object], value) if str(item).strip()]
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return []

    def _reject_disallowed_prompt(self, prompt: str) -> None:
        has_underage = UNDERAGE_PATTERN.search(prompt) is not None and NEGATED_UNDERAGE_PATTERN.search(prompt) is None
        if has_underage and SEXUAL_OR_NUDE_PATTERN.search(prompt):
            raise HTTPError(400, "Prompt blocked: sexualized minors or underage nudity are strictly prohibited.")
        if NONCONSENSUAL_OR_EXPLOITATION_PATTERN.search(prompt):
            raise HTTPError(400, "Prompt blocked: non-consensual content is not allowed.")
        if SEXUAL_OR_NUDE_PATTERN.search(prompt):
            logger.info("[NSFW ALLOWED] Explicit adult content detected and permitted")

    def _remove_forbidden_rewrite_terms(self, prompt: str) -> tuple[str, bool]:
        return prompt.strip(), False

    def _save_image_output(self, **kwargs: Any) -> tuple[Path, Path]:
        image_dir, _ = self.ensure_output_dirs()
        now = datetime.now().astimezone()
        timestamp = now.strftime("%Y-%m-%d_%H-%M-%S")
        provider = str(kwargs["provider"])
        model = str(kwargs["model"])
        seed = self._coerce_int(kwargs.get("seed"), fallback=0)
        safe_provider = self._slug(provider)
        safe_model = self._slug(model)
        base_name = f"{timestamp}_{safe_provider}_{safe_model}_seed-{seed}"
        image_path = self._unique_path(image_dir / f"{base_name}.png")
        metadata_path = image_path.with_suffix(".json")

        image_bytes = kwargs["image_bytes"]
        if not isinstance(image_bytes, bytes):
            raise HTTPError(500, "image_bytes must be bytes")
        image_path.write_bytes(image_bytes)

        metadata: JsonObject = {
            "type": "image",
            "provider": provider,
            "model": model,
            "prompt": str(kwargs["prompt"]),
            "original_idea": kwargs.get("original_idea"),
            "llm_enhanced_prompt": kwargs.get("llm_enhanced_prompt"),
            "final_prompt": kwargs.get("final_prompt"),
            "prompt_was_user_edited": bool(kwargs.get("prompt_was_user_edited")),
            "prompt_source": str(kwargs.get("prompt_source") or "manual"),
            "selected_style_id": kwargs.get("selected_style_id"),
            "selected_style_label": kwargs.get("selected_style_label"),
            "selected_style_category": kwargs.get("selected_style_category"),
            "image_character_id": kwargs.get("image_character_id"),
            "image_character_name": kwargs.get("image_character_name"),
            "image_character_image_path": kwargs.get("image_character_image_path"),
            "image_character_prompt": kwargs.get("image_character_prompt"),
            "image_character_negative_prompt": kwargs.get("image_character_negative_prompt"),
            "use_character_lora": bool(kwargs.get("use_character_lora")),
            "custom_style_text": kwargs.get("custom_style_text"),
            "style_prompt_modifier": kwargs.get("style_prompt_modifier"),
            "style_negative_modifier": kwargs.get("style_negative_modifier"),
            "style_was_applied": bool(kwargs.get("style_was_applied")),
            "negative_prompt": str(kwargs.get("negative_prompt") or ""),
            "negative_prompt_final": kwargs.get("negative_prompt_final"),
            "generated_negative_prompt": str(kwargs.get("negative_prompt") or ""),
            "negative_prompt_applied": bool(kwargs.get("negative_prompt_applied")),
            "seed": seed,
            "width": self._coerce_int(kwargs.get("width"), fallback=0),
            "height": self._coerce_int(kwargs.get("height"), fallback=0),
            "requested_steps": self._coerce_int(kwargs.get("requested_steps"), fallback=0),
            "actual_steps": self._coerce_int(kwargs.get("actual_steps"), fallback=0),
            "steps": self._coerce_int(kwargs.get("actual_steps"), fallback=0),
            "guidance_scale": self._coerce_float(kwargs.get("guidance_scale"), fallback=0),
            "quality_mode": str(kwargs.get("quality_mode") or ""),
            "effective_width": self._coerce_int(kwargs.get("effective_width"), fallback=0),
            "effective_height": self._coerce_int(kwargs.get("effective_height"), fallback=0),
            "upscale_pending": True,
            "elapsed_ms": self._coerce_int(kwargs.get("elapsed_ms"), fallback=0),
            "extracted_required_traits": kwargs.get("extracted_required_traits"),
            "required_hair_color": kwargs.get("required_hair_color"),
            "required_eye_color": kwargs.get("required_eye_color"),
            "required_body_framing": kwargs.get("required_body_framing"),
            "prompt_trait_lock_applied": bool(kwargs.get("prompt_trait_lock_applied")),
            "negative_trait_lock_applied": bool(kwargs.get("negative_trait_lock_applied")),
            "idea_is_primary_guide": bool(kwargs.get("idea_is_primary_guide")),
            "composition_intent": str(kwargs.get("composition_intent") or "generic"),
            "subject_type": str(kwargs.get("subject_type") or "generic"),
            "required_traits": kwargs.get("required_traits") or {},
            "requested_aspect_ratio": kwargs.get("requested_aspect_ratio"),
            "effective_aspect_ratio": kwargs.get("effective_aspect_ratio"),
            "aspect_ratio_overridden": bool(kwargs.get("aspect_ratio_overridden")),
            "aspect_ratio_override_reason": kwargs.get("aspect_ratio_override_reason"),
            "removed_conflicting_prompt_terms": kwargs.get("removed_conflicting_prompt_terms") or [],
            "no_people_lock_applied": bool(kwargs.get("no_people_lock_applied")),
            "backend_semantic_rewrite_after_generate": bool(kwargs.get("backend_semantic_rewrite_after_generate")),
            "visible_prompt_before_generate": kwargs.get("visible_prompt_before_generate"),
            "payload_prompt_sent_to_backend": kwargs.get("payload_prompt_sent_to_backend"),
            "backend_prompt_sent_to_modal": kwargs.get("backend_prompt_sent_to_modal"),
            "worker_prompt_received": kwargs.get("worker_prompt_received"),
            "worker_prompt_sent_to_flux": kwargs.get("worker_prompt_sent_to_flux"),
            "worker_loras_applied": kwargs.get("worker_loras_applied"),
            "worker_loras_skipped": kwargs.get("worker_loras_skipped"),
            "frontend_negative_prompt": kwargs.get("frontend_negative_prompt"),
            "backend_negative_prompt_final": kwargs.get("backend_negative_prompt_final"),
            "worker_negative_prompt_received": kwargs.get("worker_negative_prompt_received"),
            "worker_negative_prompt_sent_to_flux": kwargs.get("worker_negative_prompt_sent_to_flux"),
            "comfyui_eye_refine_applied": bool(kwargs.get("comfyui_eye_refine_applied")),
            "comfyui_eye_refine_denoise": kwargs.get("comfyui_eye_refine_denoise"),
            "comfyui_eye_refine_steps": kwargs.get("comfyui_eye_refine_steps"),
            "comfyui_eye_refine_guidance_scale": kwargs.get("comfyui_eye_refine_guidance_scale"),
            "comfyui_eye_refine_preserve_character_details": bool(kwargs.get("comfyui_eye_refine_preserve_character_details")),
            "comfyui_eye_refine_wide_character_scene": bool(kwargs.get("comfyui_eye_refine_wide_character_scene")),
            "comfyui_identity_reference_applied": bool(kwargs.get("comfyui_identity_reference_applied")),
            "comfyui_identity_reference_engine": kwargs.get("comfyui_identity_reference_engine"),
            "comfyui_identity_reference_image_path": kwargs.get("comfyui_identity_reference_image_path"),
            "comfyui_identity_reference_denoise": kwargs.get("comfyui_identity_reference_denoise"),
            "comfyui_identity_reference_steps": kwargs.get("comfyui_identity_reference_steps"),
            "comfyui_identity_reference_faceid_weight": kwargs.get("comfyui_identity_reference_faceid_weight"),
            "comfyui_primary_failed_reason": kwargs.get("comfyui_primary_failed_reason"),
            "fallback_endpoint": kwargs.get("fallback_endpoint"),
            "fallback_steps": kwargs.get("fallback_steps"),
            "prompt_negative_conflicts": kwargs.get("prompt_negative_conflicts") or [],
            "prompt_visibility_violation": bool(kwargs.get("prompt_visibility_violation")),
            "invisible_backend_modifiers_applied": bool(kwargs.get("invisible_backend_modifiers_applied")),
            "visible_trait_lock_applied": bool(kwargs.get("visible_trait_lock_applied")),
            "visible_composition_lock_applied": bool(kwargs.get("visible_composition_lock_applied")),
            "final_prompt_user_editable_before_generate": bool(kwargs.get("final_prompt_user_editable_before_generate")),
            "trait_lock_removed": bool(kwargs.get("trait_lock_removed")),
            "composition_lock_removed": bool(kwargs.get("composition_lock_removed")),
            "backend_semantic_rewrite_disabled": bool(kwargs.get("backend_semantic_rewrite_disabled")),
            "descriptive_trait_lock_applied": bool(kwargs.get("descriptive_trait_lock_applied")),
            "content_rewrite_removed": bool(kwargs.get("content_rewrite_removed")),
            "coverage_lock_removed": bool(kwargs.get("coverage_lock_removed")),
            "conservative_rewrite_removed": bool(kwargs.get("conservative_rewrite_removed")),
            "trait_lock_types_applied": kwargs.get("trait_lock_types_applied") or [],
            "forbidden_rewrite_detected": bool(kwargs.get("forbidden_rewrite_detected")),
            "created_at": now.isoformat(),
            "local_path": str(image_path),
        }
        metadata_path.write_text(self._json_dumps(metadata), encoding="utf-8")
        logger.info("Saved Modal image output to %s", image_path)
        return image_path, metadata_path

    def _json_dumps(self, payload: JsonObject) -> str:
        import json

        return json.dumps(payload, ensure_ascii=False, indent=2) + "\n"

    def _unique_path(self, path: Path) -> Path:
        if not path.exists():
            return path
        stem = path.stem
        suffix = path.suffix
        for index in range(1, 10_000):
            candidate = path.with_name(f"{stem}_{index:02d}{suffix}")
            if not candidate.exists():
                return candidate
        return path.with_name(f"{stem}_{int(time.time() * 1000)}{suffix}")

    def _slug(self, value: str) -> str:
        normalized = value.strip().lower().replace(".", "")
        return re.sub(r"[^a-z0-9_]+", "-", normalized).strip("-") or "unknown"

    def _apply_visible_idea_guidance(self, prompt: str, trait_lock: dict[str, object], composition_intent: CompositionIntent) -> tuple[str, list[str]]:
        return prompt, []

    def _build_descriptive_trait_lock(self, source: str) -> dict[str, object]:
        return {}

    def _coerce_int(self, value: object, *, fallback: int) -> int:
        if value is None:
            return fallback
        if isinstance(value, int):
            return value
        if isinstance(value, float | str | bytes | bytearray):
            try:
                return int(value)
            except Exception:
                return fallback
        return fallback

    def _coerce_float(self, value: object, *, fallback: float) -> float:
        if value is None:
            return fallback
        if isinstance(value, int | float):
            return float(value)
        if isinstance(value, str | bytes | bytearray):
            try:
                return float(value)
            except Exception:
                return fallback
        return fallback
