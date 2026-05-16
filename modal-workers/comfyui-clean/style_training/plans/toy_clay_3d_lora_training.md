# Toy & Clay LoRA Training Plan

## Style Target

- ID: `toy_clay_3d`
- UI label: `Toy & Clay`
- Trigger token: `ax_toy_clay_3d_v1`
- Type: style LoRA, not character LoRA

Goal: train an original toy and clay 3D style with tactile plasticine/clay materials, soft rounded toy forms, compact readable characters, glossy simple eyes, clay-sculpted hair, small readable hands, matte surfaces, pastel playful colors, warm soft lighting, miniature environments, and stop-motion-like family-friendly appeal.

This LoRA must not learn a single character, imitate studios, films, franchises, famous toys, brands, or existing characters. It must not become generic `stylized_3d`, `low_poly_3d`, or 2D `chibi_kawaii`.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Toy/clay portraits | 20% |
| Half-body scenes | 20% |
| Full-body scenes | 25% |
| Miniature environment scenes | 20% |
| Multiple characters | 5% |
| Props/details | 10% |

Include:

- Original toy-like and clay/plasticine characters
- Miniature school, home, garden, and adventure scenes
- Handmade props, books, backpacks, and small clay objects
- Small but readable hands
- Simple glossy eyes
- Clay-sculpted hair
- Matte tactile surfaces
- Subtle controlled handmade imperfections
- Pastel and vivid colors
- Warm soft light
- Stop-motion-inspired scenes

Exclude:

- Recognizable characters, famous toys, franchises, studios, films, logos, and brands
- Photorealistic images
- 2D cartoon, anime, manga, low-poly style
- Dirty or heavily deformed clay
- Unreadable hands, asymmetric eyes, overly glossy plastic materials
- Duplicates and near-duplicates
- Adult-oriented content

## Captioning Guide

Every caption must start with:

```text
ax_toy_clay_3d_v1
```

Recommended caption structure:

```text
ax_toy_clay_3d_v1, [subject], [scene/action], [framing], [toy-like proportions], [face/eyes], [clay hair], [hands/body], [outfit/props], [miniature environment], [clay materials/lighting], original toy and clay 3D style
```

Good caption:

```text
ax_toy_clay_3d_v1, cheerful toy clay schoolboy walking through a miniature school path, full body, soft rounded toy proportions, large glossy brown button-like eyes, cute smiling clay face, clay-sculpted brown hair chunks, small rounded hands holding backpack straps, beige shirt and blue backpack made of matte clay material, handmade flowers, rounded stone path, colorful toy-like school building, warm soft daylight, pastel playful colors, stop-motion inspired 3D render
```

Bad caption:

```text
clay 3D boy
```

Why it is bad:

- Missing trigger token
- Does not describe materials, hands, eyes, environment, or proportions
- Does not distinguish `toy_clay_3d` from `stylized_3d`
- Does not guide the LoRA toward tactile clay/handmade texture

Captioning rules:

- Always describe clay/plasticine material.
- Describe hands, eyes, and clay-sculpted hair.
- Describe miniature environment and handmade props.
- Mention matte texture, handmade imperfections, and soft light when present.
- Avoid studios, franchises, famous toys, characters, and brands.
- Distinguish from `stylized_3d`, `fairytale_3d`, `low_poly_3d`, and `chibi_kawaii`.
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

- Validate clay materials and matte surfaces every checkpoint.
- Check hands, eyes, and clay-sculpted hair.
- Avoid glossy plastic drift.
- Avoid overfitting to school miniature scenes.
- Preserve variety across characters, props, and environments.
- Test 16:9 and 9:16 for video/social compatibility.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_toy_clay_3d_v1, cheerful toy clay boy walking to school, backpack, warm morning light, readable face, large glossy eyes, readable small rounded hands, full body, miniature school environment, matte clay texture, pastel playful colors
```

```text
ax_toy_clay_3d_v1, clay toy student sitting in a miniature classroom, readable face and hands, rounded desk and books, warm soft light, handmade clay textures, playful educational atmosphere
```

```text
ax_toy_clay_3d_v1, toy clay child exploring a colorful miniature garden path, full body, backpack, rounded trees, handmade flowers, matte clay surfaces, warm family-friendly lighting
```

```text
ax_toy_clay_3d_v1, two toy clay students walking together outside a miniature school, expressive faces, readable rounded hands, pastel school campus, handmade clay look, stop-motion inspired render
```

Score each output on:

- Toy & Clay style fidelity
- Clay material quality
- Matte surface quality
- Face quality
- Eye quality
- Clay-sculpted hair quality
- Hand quality
- Miniature environment quality
- Warm light quality
- Difference from `stylized_3d`
- Difference from `fairytale_3d`
- Difference from `low_poly_3d`
- Absence of IP, brand, or famous toy imitation

## Overfitting Watchlist

Stop or reduce training if:

- Every character looks like the same puppet.
- Materials become too plastic or glossy.
- Eyes become identical button-like shapes.
- Hands become too round and unclear.
- Every scene is a miniature school.
- The palette becomes only pastel with no variety.
- The style drifts too close to chibi.
- The style drifts too close to generic stylized 3D.
- Handmade defects become excessive.
- Subject readability drops.

## AXSTUDIO Integration Criteria

Only connect the LoRA after visual validation confirms:

- `ax_toy_clay_3d_v1` produces coherent toy/clay 3D.
- Materials, eyes, hair, and hands are stable.
- It does not imitate toys, films, brands, or existing characters.
- It remains distinct from `stylized_3d`, `fairytale_3d`, and `low_poly_3d`.
- It works for school, home, garden, adventure, educational, and toy prop scenes.
- The JSON profile is used through the style prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for video with stop-motion-like motion and soft camera movement.

Until then, keep it as a JSON style profile and training plan only.
