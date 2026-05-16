# Fairytale 3D LoRA Training Plan

## Style Target

- ID: `fairytale_3d`
- UI label: `Fairytale 3D`
- Trigger token: `ax_fairytale_3d_v1`
- Type: style LoRA, not character LoRA

Goal: train an original fairytale 3D animation style with warm magical atmosphere, expressive soft 3D characters, rounded forms, glossy but controlled eyes, sculpted hair, readable hands, polished materials, lantern light, enchanted environments, and family-friendly storytelling.

This LoRA must not learn a single character, imitate studios, films, franchises, mascots, brands, or protected characters. It must not become plain `stylized_3d`, `toy_clay_3d`, or dark/epic fantasy.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Fairytale 3D portraits | 20% |
| Half-body scenes | 20% |
| Full-body scenes | 25% |
| Environment scenes | 25% |
| Multiple characters | 5% |
| Props/details | 5% |

Include:

- Original 3D characters
- Generic family-friendly fantasy children or characters
- Fairytale villages, generic castles, magical forests, lantern-lit paths
- Cozy interiors and fairytale school paths
- Characters with books, backpacks, lanterns, and small magical props
- Visible correct hands
- Readable glossy eyes
- Sculpted hair
- Soft clean 3D materials
- Warm magical light
- Rich harmonious colors

Exclude:

- Recognizable characters, franchises, studios, films, logos, and brands
- Photorealistic images
- 2D cartoon, anime, manga, low-poly, or strong clay/toy style
- Dark fantasy, horror, adult-oriented outfits or poses
- Deformed hands, asymmetric eyes, unreadable crowded environments
- Duplicates and near-duplicates

## Captioning Guide

Every caption must start with:

```text
ax_fairytale_3d_v1
```

Recommended caption structure:

```text
ax_fairytale_3d_v1, [subject], [story action], [framing], [3D proportions], [face/eyes], [hair], [hands/body], [outfit/props], [fairytale environment], [magical lighting/materials], original fairytale 3D animation style
```

Good caption:

```text
ax_fairytale_3d_v1, cheerful fairytale 3D schoolboy walking through an enchanted village path toward school, full body, soft rounded proportions, large warm glossy brown eyes, gentle smiling face, sculpted brown hair with warm highlights, clean stylized hands holding backpack straps, blue cloak and backpack, glowing lanterns, cozy cottages, distant castle, flowers along stone path, warm magical sunset light, polished soft 3D materials, rich harmonious colors, family-friendly fairytale storytelling atmosphere
```

Bad caption:

```text
fairytale 3D boy
```

Why it is bad:

- Missing trigger token
- Does not describe atmosphere, materials, lighting, eyes, hands, or environment
- Does not distinguish `fairytale_3d` from `stylized_3d`
- Does not stabilize magical narrative consistency

Captioning rules:

- Always describe fairytale atmosphere and magical light.
- Describe eyes, hair, hands, and 3D materials.
- Specify village, castle, forest, enchanted school path, cozy interior, lantern-lit street, or fantasy adventure.
- Avoid studios, films, franchises, characters, mascots, brands, and protected IP.
- Distinguish from `stylized_3d`, `toy_clay_3d`, and `epic_fantasy`.
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

- Validate hands, eyes, hair, and materials every checkpoint.
- Avoid plastic-toy appearance.
- Avoid overfitting to castles and lanterns.
- Preserve variety across village, school, forest, castle, and interior scenes.
- Test 16:9 and 9:16 for video/social compatibility.
- Check that outputs do not resemble known studios, films, or franchises.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_fairytale_3d_v1, cheerful fairytale 3D boy walking to school, backpack, warm magical morning light, readable face, large warm glossy eyes, readable hands, full body, enchanted school path, glowing lanterns, cozy village, rich harmonious colors
```

```text
ax_fairytale_3d_v1, child walking through a cozy enchanted village, full body, gentle smile, readable hands, rounded cottages, flowers, warm lanterns, soft polished 3D materials, magical fairytale atmosphere
```

```text
ax_fairytale_3d_v1, fairytale 3D child reading a book in a cozy magical room, warm lamp light, expressive face, clean hands, soft fabric, wood shelves, glowing details, family-friendly storytelling mood
```

```text
ax_fairytale_3d_v1, two fairytale 3D students walking together on a lantern-lit school path, expressive faces, readable hands, enchanted village background, warm magical lighting, polished stylized 3D render
```

Score each output on:

- Fairytale 3D style fidelity
- Magical atmosphere
- Face quality
- Eye quality
- Hair quality
- Hand quality
- 3D material quality
- Environment quality
- Warm light quality
- Difference from `stylized_3d`
- Difference from `toy_clay_3d`
- Difference from `epic_fantasy`
- Absence of studio/franchise/IP imitation

## Overfitting Watchlist

Stop or reduce training if:

- Every scene has castles.
- Every scene has lanterns.
- The palette is always purple/gold.
- Characters become too similar.
- Eyes become too large or too glossy.
- Materials become plastic.
- Environments become too crowded.
- The look drifts toward known franchises or studios.
- The style becomes epic/dark fantasy.
- It loses the family-friendly tone.

## AXSTUDIO Integration Criteria

Only connect the LoRA after visual validation confirms:

- `ax_fairytale_3d_v1` produces coherent fairytale 3D.
- Face, eyes, hair, and hands remain readable.
- Materials and magical light are stable.
- It does not imitate studios, films, or existing characters.
- It remains distinct from `stylized_3d`, `toy_clay_3d`, and `epic_fantasy`.
- It works for school, village, forest, interior, generic castle, and educational scenes.
- The JSON profile is used through the style prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for video with character motion, camera movement, and magical light continuity.

Until then, keep it as a JSON style profile and training plan only.
