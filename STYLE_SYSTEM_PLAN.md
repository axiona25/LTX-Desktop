# AXSTUDIO Style System Plan

## Goal

AXSTUDIO needs strong reusable style control for image generation now and video consistency later. The system must preserve the user prompt while adding a structured style layer that controls visual language, line quality, shading, color, lighting, texture, anatomy tendency, and composition.

## Current Flow

The current image flow is:

1. User writes or pastes an idea in the image prompt box.
2. Optional AXSTUDIO AI can later enhance the prompt.
3. User selects format, resolution, and style.
4. Frontend applies a managed `[STYLE: ...]` block.
5. Backend sends the final prompt to the stable ComfyUI Modal endpoint.

The weak point was that the style block was too shallow. Non-realistic styles such as cartoon or fairytale animation were still sent into a photorealistic SDXL checkpoint with insufficient style control.

## New Architecture

Style data is split into clear layers:

| Layer | Purpose |
|---|---|
| `style_id` | Stable internal app identifier |
| UI label | Short human-readable label |
| Safe label | Brand-safe descriptive style label |
| Style profile | Full structured style definition |
| Prompt layer | Positive prompt generated from style profile |
| Negative layer | Dedicated negative prompt for that style |
| Backend generation profile | Minimum steps/guidance and extra style enforcement |
| LoRA plan | Future trained style adapters |

## Files

| File | Purpose |
|---|---|
| `frontend/constants/imageStyles.ts` | Existing UI style list and previews |
| `frontend/config/styleProfiles.ts` | Structured professional style library |
| `frontend/lib/image-style-prompt.ts` | Builds traceable managed style prompt blocks |
| `backend/handlers/modal_image_handler.py` | Applies backend style profiles before ComfyUI |
| `modal-workers/comfyui-clean/style_training/style_lora_plan.json` | LoRA training plan generated from UI styles |
| `benchmark/style_test_prompts.json` | Benchmark prompts |
| `benchmark/STYLE_BENCHMARK_MATRIX.md` | Evaluation matrix |

## Style Taxonomy

| Family | Examples |
|---|---|
| Anime / Manga | Anime, Manga / Comic Ink, Chibi |
| Western animation | Cartoon, Fairytale Animation, Storybook Illustration |
| 3D stylization | Family-friendly 3D, Stylized 3D, Clay / Toy, Low Poly |
| Comics | European Comic, Superhero Comic, Graphic Novel |
| Illustration | Concept Art, Fantasy Illustration, Cinematic Illustration, Poster Illustration |
| Paint / Drawing | Watercolor, Pencil Sketch, Ink Drawing |
| Hybrid | Semi-realistic Stylization, Cel Shading, Game Art |

## Brand Safety

The app must not depend on proprietary studio names. Existing internal IDs can stay for compatibility, but user-facing labels and prompt text should be generic. Studio-name requests should be normalized into brand-safe descriptions such as family-friendly fairytale animation, stylized cinematic 3D character animation, or expressive polished 3D animated adventure style.

## Prompt Traceability

Every generation should preserve:

1. User prompt
2. LLM enhanced prompt, when available
3. Style prompt layer
4. Negative prompt layer
5. Backend prompt sent to ComfyUI

This keeps results debuggable when a style drifts or a subject becomes unreadable.

## Integration Strategy

The implementation is intentionally incremental:

1. Keep existing UI style IDs and previews.
2. Add style profiles for priority styles.
3. Use style profiles only when available.
4. Fall back to existing `style_prompt_modifier` for legacy styles.
5. Keep backend LoRA hook disabled until real LoRA files exist.
6. Train and enable LoRA per style only after validation.
