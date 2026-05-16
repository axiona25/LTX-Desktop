# Stylized 3D LoRA Training Plan

## Style Target

- ID: `stylized_3d`
- UI label: `Stylized 3D`
- Trigger token: `ax_stylized_3d_v1`
- Type: style LoRA, not character LoRA

Goal: train an original modern stylized 3D animation style with expressive characters, rounded readable forms, glossy but controlled eyes, sculpted hair, clean hands, smooth polished materials, soft cinematic lighting, and animation-ready composition.

This LoRA must not learn a single character, imitate studios, franchises, mascots, brands, or protected characters. It must not become photorealistic, 2D cartoon, `toy_clay_3d`, `low_poly_3d`, or too close to `fairytale_3d`.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| 3D portraits | 20% |
| Half-body scenes | 25% |
| Full-body scenes | 25% |
| Environment scenes | 20% |
| Multiple characters | 5% |
| Props/details | 5% |

Include:

- Original 3D characters
- Expressive faces
- Readable glossy eyes
- Sculpted hair
- Full-body stylized 3D characters
- Visible correct simplified hands
- School scenes, app characters, game-like environments, educational scenes
- Colorful environments
- Soft materials
- Soft lighting
- Clean modern rendering
- Animation-ready poses

Exclude:

- Recognizable characters, franchises, studios, logos, brands, and mascots
- Photorealistic images
- 2D cartoon, anime, clay/toy style, low-poly style
- Characters too similar to each other
- Deformed hands or asymmetric eyes
- Materials that look too plastic
- Duplicates and near-duplicates

## Captioning Guide

Every caption must start with:

```text
ax_stylized_3d_v1
```

Recommended caption structure:

```text
ax_stylized_3d_v1, [subject], [scene/action], [framing], [3D proportions], [face/eyes], [hair], [hands/body], [outfit/props], [environment], [materials/lighting], original stylized 3D animation style
```

Good caption:

```text
ax_stylized_3d_v1, cheerful stylized 3D schoolboy walking through a bright school campus, full body, rounded friendly proportions, large glossy brown eyes, soft expressive face, sculpted brown hair, clean stylized hands holding backpack straps, beige shirt, blue backpack, smooth polished fabric materials, soft cinematic daylight, colorful school environment, high quality modern stylized 3D render
```

Bad caption:

```text
stylized 3D boy
```

Why it is bad:

- Missing trigger token
- Does not describe proportions, materials, hair, hands, or lighting
- Does not distinguish `stylized_3d` from `fairytale_3d` or `toy_clay_3d`
- Does not stabilize a useful AXSTUDIO style LoRA

Captioning rules:

- Always describe materials and lighting.
- Describe eyes, hair, and hands.
- Specify app character, game scene, educational 3D, school 3D, social animation, or animation-ready scene.
- Avoid studios, franchises, mascots, characters, and brands.
- Distinguish from `fairytale_3d`, `toy_clay_3d`, `low_poly_3d`, and `clean_cartoon`.
- Avoid overly short captions.

## Training Setup

Initial conservative parameters:

| Parameter | Value |
| --- | --- |
| Resolution | 1024 |
| Network rank | 16-32 |
| Alpha | 16-32 |
| Optimizer | AdamW8bit |
| Scheduler | cosine or constant_with_warmup |
| UNet learning rate | 1e-4 |
| Text encoder learning rate | 0 or 5e-6 |
| Validation cadence | every 200-500 steps |
| Target total steps | 3000-7000 |

Training notes:

- Validate hands, eyes, and materials every checkpoint.
- Avoid plastic-toy appearance.
- Avoid overfitting to schoolboy/schoolgirl subjects.
- Preserve character and environment variety.
- Test 16:9 and 9:16 for video/social compatibility.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_stylized_3d_v1, cheerful stylized 3D boy walking to school, backpack, warm morning light, readable face, large glossy eyes, readable hands, full body, friendly school environment, rounded shapes, smooth polished materials
```

```text
ax_stylized_3d_v1, friendly 3D app character standing in a simple pose, expressive face, glossy eyes, clean hands, rounded proportions, smooth materials, bright clean background
```

```text
ax_stylized_3d_v1, stylized 3D child exploring a colorful game-like village, full body, backpack, expressive face, readable hands, soft cinematic lighting, polished 3D environment
```

```text
ax_stylized_3d_v1, two stylized 3D students talking outside school, expressive faces, readable hands, colorful school campus, smooth materials, friendly animation-ready composition
```

Score each output on:

- Stylized 3D style fidelity
- Face quality
- Eye quality
- Hair quality
- Hand quality
- Material quality
- 3D rendering quality
- Render cleanliness
- Animation/video compatibility
- Difference from `fairytale_3d`
- Difference from `toy_clay_3d`
- Difference from `clean_cartoon`

## Overfitting Watchlist

Stop or reduce training if:

- All characters share the same face.
- Eyes become too glossy or too large.
- Materials become plastic.
- Hair sculpting repeats.
- Every scene is school-based.
- It becomes too fairytale-like.
- It becomes too toy/clay-like.
- Hands deform or simplify badly.
- It loses flexibility across app, game, educational, and advertising scenes.

## AXSTUDIO Integration Criteria

Only connect the LoRA after visual validation confirms:

- `ax_stylized_3d_v1` produces coherent modern stylized 3D.
- Face, eyes, hair, and hands remain readable.
- Materials and lighting are clean.
- It does not imitate studios or known characters.
- It remains distinct from `fairytale_3d`, `toy_clay_3d`, and `clean_cartoon`.
- It works for school, app, game, educational, advertising, and social scenes.
- The JSON profile is used through the style prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for video with character motion and camera movement.

Until then, keep it as a JSON style profile and training plan only.
