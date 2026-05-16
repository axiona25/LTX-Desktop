# Photorealistic Style LoRA Training Plan

Style ID: `photorealistic`
UI Label: `Photorealistic`
Trigger token: `ax_photo_real_v1`

## Objective

Train a style LoRA that teaches clean commercial photorealistic photography without binding the model to a single subject identity.

The LoRA should improve:

- natural readable faces
- realistic eyes
- natural hair
- correct hands
- believable anatomy
- coherent lighting
- real-world environments
- credible photographic materials
- image output now and future video consistency later

This is not a character LoRA.

## Dataset Requirements

Minimum: 500 images
Recommended: 1200 images
Optimal: 1200-2000 curated images

Distribution:

- 25% portraits
- 20% half body
- 20% full body
- 15% environment scenes
- 10% multiple characters
- 10% props and details

Include:

- diverse ages, genders, ethnicities, and appearances
- realistic indoor and outdoor scenes
- many visible hands
- natural poses
- daylight, golden hour, and soft indoor light
- casual, lifestyle, school, urban, family, and outdoor clothing
- readable, symmetrical faces
- clean real-world environments
- high-quality images without watermark

Exclude:

- anime, cartoon, 3D render, painting, or comic styles
- malformed hands or distorted faces
- extreme post-processing
- noisy, compressed, or low-resolution images
- text, logos, or watermarks
- duplicate or near-duplicate images
- dataset bias toward a single face or identity

## Captioning

All captions must include:

`ax_photo_real_v1`

Recommended structure:

```text
ax_photo_real_v1, [subject], [action/pose], [framing], [face/hands readability], [outfit], [environment], [lighting], [realistic texture/material cues], commercial photorealistic photography
```

Good caption:

```text
ax_photo_real_v1, cheerful schoolboy walking to school, full body, readable face, readable hands, blue backpack, casual clothes, school entrance in background, warm morning sunlight, realistic clothing texture, realistic skin, soft depth of field, commercial photorealistic photography
```

Bad caption:

```text
boy walking to school realistic
```

## Training Parameters

Initial safe parameters:

- resolution: 1024
- network rank: 16-32
- alpha: 16-32
- optimizer: AdamW8bit
- scheduler: cosine or constant_with_warmup
- unet learning rate: 1e-4
- text encoder learning rate: 0 or 5e-6
- validation every: 200-500 steps
- total target steps: 3000-7000

Training guidance:

- keep training conservative
- validate often
- preserve subject diversity
- do not optimize only for faces
- reject checkpoints that degrade hands or full-body anatomy
- avoid a rigid single-lighting look

## Validation Prompts

1. `ax_photo_real_v1, a cheerful boy walking to school, backpack, warm morning light, readable face, readable hands, full body, friendly environment, commercial photorealistic photography`
2. `ax_photo_real_v1, natural portrait of a smiling teenage student outdoors, realistic face, clear eyes, soft daylight, photorealistic commercial photography`
3. `ax_photo_real_v1, a young person walking in a clean suburban street, casual outfit, realistic posture, warm light, believable environment, commercial photorealistic photo`
4. `ax_photo_real_v1, two students walking together near a school entrance, realistic anatomy, readable hands, natural conversation pose, morning light, clean photorealistic outdoor photography`

Evaluate:

- style fidelity
- face quality
- eye quality
- hand quality
- anatomy quality
- lighting quality
- environment realism
- texture realism
- prompt adherence
- diversity retention

## Integration Rule

Do not connect this LoRA to AXSTUDIO until it passes visual benchmarks and does not force a single identity.
