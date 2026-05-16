# AXSTUDIO Style LoRA Training

This folder tracks the training plan for AXSTUDIO 1.0 visual styles.

The desktop app can now strengthen non-realistic styles at inference time and the ComfyUI workflow has a safe LoRA hook. The hook is disabled until real style LoRA files exist in the Modal volume, because loading a missing LoRA would fail generation.

## Current Status

- Base image checkpoint: `cyberrealisticXL_v100.safetensors`
- Runtime style profiles: implemented in `backend/handlers/modal_image_handler.py`
- Style LoRA plan: `style_lora_plan.json`
- Style LoRA registry: `style_lora_registry.json`
- Target LoRA volume folder: `/loras/style`

## Dataset Rule

Each style needs its own curated dataset before training:

- Minimum: 500 curated images per style
- Recommended: 1200 curated images per style
- Captions must include the style trigger token from `style_lora_plan.json`
- Do not mix brand-owned characters or logos into style datasets

Create a dataset scaffold:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style pixel_art --init-empty --force
```

Prepare a real curated dataset:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py \
  --style pixel_art \
  --source-dir /path/to/curated/pixel_art_images \
  --force
```

## Incremental Training Rule

The first run trains the base LoRA for 3000-7000 steps per style, based on each style profile.

Later refinements must resume from the existing checkpoint and add small increments:

- 50 steps for tiny corrections
- 100 steps for visible style correction
- 150 steps only if the style is still weak

Do not restart from zero unless the dataset changes substantially.

## Regenerate Plan

```bash
/usr/bin/python3 scripts/export_style_lora_plan.py
```

## Train

Dry-run training commands:

```bash
/usr/bin/python3 scripts/run_style_lora_training.py --style pixel_art
```

Execute only after the dataset is curated and cost is approved:

```bash
/usr/bin/python3 scripts/run_style_lora_training.py --style pixel_art --execute
```

## Promote

After visual validation passes:

```bash
/usr/bin/python3 scripts/promote_style_lora.py \
  --style pixel_art \
  --lora-name style/AXSTYLE_pixel_art_v1.safetensors \
  --strength 0.84 \
  --status validated
```

At runtime, promoted LoRAs are used only when `AXSTUDIO_ENABLE_STYLE_LORAS=1`.
