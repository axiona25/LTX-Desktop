# AXSTUDIO Style LoRA Training Guide

## Strategy

AXSTUDIO should train style-specific LoRAs incrementally, one style family at a time.

Priority:

1. Fairytale / cartoon / family animation
2. Anime / manga / cel shading
3. Stylized 3D / game art / low poly
4. Storybook / watercolor / ink / sketch
5. Fantasy / concept / poster illustration

## Base Setup

| Item | Value |
|---|---|
| Base checkpoint | `cyberrealisticXL_v100.safetensors` for compatibility with current AXSTUDIO 1.0 |
| Target folder | `/loras/style` in Modal volume |
| Dataset size | minimum 24, recommended 40 images per style |
| First training | about 600 steps |
| Incremental training | 50-100 steps |
| Save cadence | every 100 steps |

## Hyperparameter Baseline

Use these as starting values:

| Parameter | Value |
|---|---|
| Network rank | 16 |
| Network alpha | 8 |
| Resolution | 1024 |
| Batch size | 1-2 |
| Learning rate UNet | `1e-4` |
| Learning rate text encoder | `5e-5` or off for stable captions |
| Optimizer | AdamW 8-bit |
| Scheduler | cosine or constant with warmup |
| Caption dropout | low, 0.05-0.10 |

## Incremental Training Rule

If a style has already trained 600 steps, do not restart from zero. Resume from the latest checkpoint:

- 50 steps for small prompt adherence improvements
- 100 steps for visible style weakness
- 150 steps only if style identity is still poor

Record each increment in metadata:

- base checkpoint
- source dataset version
- previous LoRA checkpoint
- added steps
- validation prompts
- selected default strength

## Validation

A LoRA is not promoted until it passes:

- portrait face readability
- eye symmetry
- hand readability
- full-body anatomy
- two-subject consistency
- indoor environment
- outdoor environment
- object/prop readability
- three different seeds with similar style fidelity

## Fallback If Training Is Not Ready

Until LoRAs are trained:

1. Use `frontend/config/styleProfiles.ts` for structured prompt layers.
2. Use backend style profiles to increase non-photoreal enforcement.
3. Keep current checkpoint and workflow stable.
4. Add one LoRA at a time only after it exists in the Modal volume.

## Promotion Criteria

A LoRA becomes default for a style only when:

- style fidelity average is 4/5 or higher
- anatomy average is 3.5/5 or higher
- prompt fidelity average is 4/5 or higher
- it does not degrade realistic styles
- it works at 16:9, 9:16, and 1:1
