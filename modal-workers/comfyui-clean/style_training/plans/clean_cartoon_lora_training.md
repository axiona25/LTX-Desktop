# Clean Cartoon LoRA Training Plan

## Style Target

- ID: `clean_cartoon`
- UI label: `Cartoon`
- Trigger token: `ax_clean_cartoon_v1`
- Type: style LoRA, not character LoRA

Goal: train a clean modern original 2D cartoon style with readable characters, clean outlines, rounded shapes, expressive faces, bright harmonious colors, simplified but correct hands, soft simple shading, family-friendly tone, and future animation/video compatibility.

This LoRA must not learn a single character, imitate studios, franchises, mascots, logos, brands, or protected characters. It must not become `anime_clean`, `chibi_kawaii`, or 3D.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Cartoon portraits | 20% |
| Half-body scenes | 25% |
| Full-body scenes | 25% |
| Environment scenes | 20% |
| Multiple characters | 5% |
| Props/details | 5% |

Include:

- Original cartoon characters
- Expressive faces
- Large simple eyes, but not anime eyes
- Full-body and half-body cartoon characters
- School, educational, social, family-friendly, light adventure, and action-light scenes
- Colorful environments
- Readable simplified hands
- Clean line art
- Rounded shapes
- Vivid but controlled colors
- Simple soft shading

Exclude:

- Recognizable characters or mascots
- Screenshots from existing cartoons
- Logos, brands, franchises, and IP references
- Anime, manga, chibi super-deformed, 3D render, comic book style
- Realistic images
- Dirty line art
- Deformed hands or asymmetric eyes
- Duplicates and near-duplicates
- Adult-oriented content

## Captioning Guide

Every caption must start with:

```text
ax_clean_cartoon_v1
```

Recommended caption structure:

```text
ax_clean_cartoon_v1, [subject], [scene/action], [framing], [face/eyes], [hair], [hands/body], [outfit], [environment], [line art], [colors/shading], original clean cartoon style
```

Good caption:

```text
ax_clean_cartoon_v1, cheerful cartoon schoolboy walking through a colorful school campus, full body, backpack on shoulders, large friendly eyes, expressive smiling face, simplified brown hair, clean rounded outlines, readable cartoon hands holding backpack straps, beige shirt, blue backpack, bright blue sky, green trees, soft simple shading, vivid harmonious colors, polished original clean cartoon style
```

Bad caption:

```text
cartoon boy at school
```

Why it is bad:

- Missing trigger token
- Does not describe line work, colors, shading, face, or hands
- Does not distinguish `clean_cartoon` from `anime_clean` or `chibi_kawaii`
- Does not teach the LoRA the intended visual language

Captioning rules:

- Always describe lines, shapes, and colors.
- Describe face, eyes, and hands when visible.
- Specify school cartoon, educational cartoon, adventure cartoon, family cartoon, social cartoon, or action cartoon.
- Avoid studios, franchises, mascots, characters, and brands.
- Avoid overly short captions.
- Preserve distinction from `anime_clean`, `chibi_kawaii`, and `stylized_3d`.

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

- Check eyes and hands often.
- Avoid overfitting to school scenes.
- Avoid chibi proportions.
- Avoid anime eyes/hair language.
- Preserve variety across characters, environments, and poses.
- Check future animation/video readability.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_clean_cartoon_v1, cheerful cartoon boy walking to school, backpack, warm morning light, readable face, large friendly eyes, readable hands, full body, friendly school environment, clean outlines, bright harmonious colors
```

```text
ax_clean_cartoon_v1, cartoon student sitting in a colorful classroom, readable smiling face, clean hands writing in notebook, rounded shapes, bright colors, soft simple shading, educational cartoon style
```

```text
ax_clean_cartoon_v1, cheerful cartoon child exploring a colorful park trail, full body, backpack, expressive face, readable hands, rounded trees, bright sky, polished modern cartoon look
```

```text
ax_clean_cartoon_v1, two cartoon students walking together outside school, expressive faces, readable hands, colorful school campus, clean outlines, bright friendly atmosphere
```

Score each output on:

- Clean cartoon style fidelity
- Line quality
- Face clarity
- Eye quality
- Hand quality
- Color quality
- Simple shading quality
- Full-body readability
- Difference from `anime_clean`
- Difference from `chibi_kawaii`
- Absence of IP/mascot imitation

## Overfitting Watchlist

Stop or reduce training if:

- The same face repeats.
- Eye/hair designs repeat too much.
- Colors become too saturated.
- Hands become too simple or broken.
- Bodies become too chibi.
- The style becomes anime.
- Every scene is a school scene.
- Characters resemble known mascots.
- Environment variety collapses.

## AXSTUDIO Integration Criteria

Only connect the LoRA after visual validation confirms:

- `ax_clean_cartoon_v1` produces coherent 2D clean cartoon.
- Lines, shapes, and colors are stable.
- Face, eyes, and hands remain readable.
- It does not imitate IP, mascots, or franchises.
- It remains distinct from `anime_clean`, `chibi_kawaii`, and `stylized_3d`.
- It works for school, educational, social, adventure, and light action scenes.
- The JSON profile is used through the style prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for future animation/video with smooth motion and consistent shapes.

Until then, keep it as a JSON style profile and training plan only.
