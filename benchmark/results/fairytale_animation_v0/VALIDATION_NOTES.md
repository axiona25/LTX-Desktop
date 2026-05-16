# Fairytale Animation LoRA v0 Validation

## LoRA

- File: `/loras/style/AXSTYLE_fairytale_animation_v0.safetensors`
- Strength tested: `0.65`
- Base checkpoint: `cyberrealisticXL_v100.safetensors`
- Dataset: `fairytale_animation_v0`
- Dataset size: 9 image/caption pairs
- Status: candidate connected only for Fairytale Animation style profiles

## Tests

| Test | Output | Result |
|---|---|---|
| Portrait | `validate_fairytale_lora_portrait_1778660107.png` | Passed style direction; face is readable and strongly non-photoreal |
| Car scene | `validate_fairytale_lora_car_1778660152.png` | Passed style direction; scene is readable and clearly animated |

## Limits

This is a prototype LoRA trained from a small generated dataset. It is useful for immediate style control but should not be considered the final production LoRA.

Before promoting to stable AXSTUDIO 1.0 default, build `fairytale_animation_v1` with 24-40 curated images and rerun the full benchmark matrix.
