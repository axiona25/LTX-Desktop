# Chibi Kawaii LoRA Training Plan

## Style Target

- ID: `chibi_kawaii`
- UI label: `Chibi`
- Trigger token: `ax_chibi_kawaii_v1`
- Type: style LoRA, not character LoRA

Goal: train an original chibi kawaii style with super-deformed proportions, oversized head, tiny body, large sparkling eyes, rosy cheeks, simplified readable hands, rounded shapes, pastel colors, sticker/social-friendly composition, and future short animation compatibility.

This LoRA must not learn a single character, imitate mascots, franchises, studios, logos, brands, or protected IP. It must not drift into normal `anime_clean` proportions or adult-oriented poses.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Chibi portraits | 20% |
| Half-body chibi | 20% |
| Full-body chibi | 30% |
| Environment scenes | 15% |
| Multiple characters | 10% |
| Props/details | 5% |

Include:

- Original chibi characters
- Sticker poses
- Full-body chibi characters
- Characters with backpacks, books, cups, and small props
- Cute school scenes
- Cozy slice-of-life scenes
- Light fantasy environments
- Chibi pairs and groups
- Large sparkling eyes
- Simplified but readable hands
- Pastel colors
- Soft clean line art
- Soft cel shading
- Simple colorful backgrounds

Exclude:

- Famous mascots or recognizable characters
- Franchises, logos, brands, or game/anime screenshots
- Adultized chibi subjects
- Sexualized outfits or poses
- Realistic proportions
- Deformed hands or asymmetric eyes
- Dark/horror scenes
- Chaotic images
- 3D, photorealistic, manga ink, or western cartoon styles unless explicitly part of a future controlled dataset
- Duplicates and near-duplicates

## Captioning Guide

Every caption must start with:

```text
ax_chibi_kawaii_v1
```

Recommended caption structure:

```text
ax_chibi_kawaii_v1, [subject], [scene/action], [chibi proportions], [face/eyes], [hair], [hands/body], [outfit], [environment], [colors/shading], original chibi kawaii style
```

Good caption:

```text
ax_chibi_kawaii_v1, cheerful chibi schoolboy walking to school, oversized head, tiny body, large sparkling brown eyes, rounded smiling face, rosy cheeks, soft fluffy brown hair, small simplified hands holding backpack straps, beige shirt, blue backpack, cute school campus, pastel blue sky, flowers and petals, soft cel shading, rounded shapes, adorable kawaii composition
```

Bad caption:

```text
cute chibi boy
```

Why it is bad:

- Missing trigger token
- Does not describe chibi proportions
- Does not describe eyes, hands, palette, or environment
- Does not distinguish `chibi_kawaii` from `anime_clean`
- Does not control the style reliably

Captioning rules:

- Always describe oversized head and tiny body.
- Describe eyes, cheeks, hair, and hands.
- Specify sticker pose, full-body chibi, cozy scene, school scene, or kawaii action.
- Describe pastel palette and soft shading.
- Avoid franchises, characters, mascots, studios, and brands.
- Avoid overly short captions.
- Keep strong separation from `anime_clean`.

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

- Validate chibi proportions every run.
- Check eyes and simplified hands.
- Avoid making the body too tiny or unreadable.
- Avoid repeating the same face.
- Preserve variety across outfits, colors, environments, and poses.
- Do not allow drift into normal `anime_clean`.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_chibi_kawaii_v1, cheerful chibi boy walking to school, backpack, warm morning light, readable face, large sparkling eyes, readable small hands, full body, friendly school environment, pastel colors, soft cel shading
```

```text
ax_chibi_kawaii_v1, cute chibi student standing in a sticker-like pose, oversized head, tiny body, big sparkling eyes, rosy cheeks, simple background, soft clean line art, pastel colors
```

```text
ax_chibi_kawaii_v1, chibi character sitting in a cozy room with a small cup, adorable expression, small readable hands, rounded furniture, pastel warm colors, kawaii slice of life style
```

```text
ax_chibi_kawaii_v1, two chibi students walking together outside school, oversized heads, tiny bodies, cheerful expressions, small backpacks, pastel school campus, soft cel shading
```

Score each output on:

- Chibi kawaii style fidelity
- Chibi proportions
- Eye quality
- Expression quality
- Simplified hand quality
- Line art quality
- Pastel palette
- Full-body readability
- Character variety
- Absence of IP/mascot imitation
- Difference from `anime_clean`

## Overfitting Watchlist

Stop or reduce training if:

- The same face repeats.
- Eyes are always identical.
- Heads become too large and bodies unreadable.
- Hands become too simplified or confusing.
- The palette is always pink.
- Every scene is a school scene.
- Characters resemble known mascots.
- The style becomes too infantile and not versatile.
- Full-body and group readability degrades.

## AXSTUDIO Integration Criteria

Only connect the LoRA after visual validation confirms:

- `ax_chibi_kawaii_v1` produces coherent chibi characters.
- Oversized head and tiny body are stable.
- Eyes, hands, and face remain readable.
- It does not imitate mascots or famous characters.
- It remains distinct from `anime_clean`.
- It works for stickers, avatars, social images, school scenes, and cozy scenes.
- The JSON profile is used through the style prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for future short animation with bounce/cute motion.

Until then, keep it as a JSON style profile and training plan only.
