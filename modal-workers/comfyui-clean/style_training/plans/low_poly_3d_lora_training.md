# Low Poly 3D LoRA Training Plan

## Style Target

- ID: `low_poly_3d`
- UI label: `Low Poly 3D`
- Trigger token: `ax_low_poly_3d_v1`
- Type: style LoRA, not character LoRA

Goal: train an original modern low poly 3D style with geometric polygonal forms, visibly faceted surfaces, matte materials, solid bright colors, clean environments, simplified but expressive characters, readable blocky hands, and lightweight game/app-friendly composition.

This LoRA must not learn a single character, imitate games, studios, franchises, brands, or existing characters. It must not become smooth `stylized_3d`, tactile `toy_clay_3d`, photorealistic, or 2D cartoon.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Low poly portraits | 15% |
| Half-body scenes | 20% |
| Full-body scenes | 25% |
| Environment scenes | 30% |
| Multiple characters | 5% |
| Props/details | 5% |

Include:

- Original low poly characters
- Low poly school, city, forest, map, and game-like environments
- Geometric mountains, faceted terrain, blocky buildings, simple clouds
- Educational and app/game scenes
- Full-body characters
- Readable blocky hands
- Faceted hair
- Matte materials
- Solid colors
- Simple clear light
- Clean compositions

Exclude:

- Recognizable characters, known games, franchises, studios, logos, and brands
- Photorealistic images
- 2D cartoon, anime, manga, clay/toy style
- High-detail 3D sculpts
- Too-smooth surfaces or complex realistic textures
- Deformed hands, asymmetric eyes, duplicate images
- Environments that are too poor, cluttered, or unreadable

## Captioning Guide

Every caption must start with:

```text
ax_low_poly_3d_v1
```

Recommended caption structure:

```text
ax_low_poly_3d_v1, [subject], [scene/action], [framing], [low poly geometry], [face/eyes], [hair], [hands/body], [outfit/props], [geometric environment], [matte materials/lighting], original low poly 3D style
```

Good caption:

```text
ax_low_poly_3d_v1, cheerful low poly schoolboy walking through a geometric school campus, full body, simple faceted proportions, friendly simplified face, large simple eyes, faceted brown hair chunks, blocky readable hands holding backpack straps, beige shirt and blue backpack with matte polygonal surfaces, low poly school building, geometric trees, simple clouds, bright daylight, solid colors, clean game-friendly 3D composition
```

Bad caption:

```text
low poly boy
```

Why it is bad:

- Missing trigger token
- Does not describe geometry, materials, hands, eyes, environment, or light
- Does not distinguish `low_poly_3d` from `stylized_3d`
- Does not preserve the game-friendly visual language

Captioning rules:

- Always describe low poly geometry.
- Describe matte materials and solid colors.
- Describe hands, face, eyes, and hair when visible.
- Specify geometric environments.
- Avoid names of games, studios, franchises, brands, or protected IP.
- Distinguish from `stylized_3d` and `toy_clay_3d`.
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

- Validate visible faceted geometry every checkpoint.
- Keep faces expressive despite simplification.
- Keep hands readable despite blocky geometry.
- Avoid overfitting to mountains and geometric trees.
- Preserve variety across school, city, nature, app, and game scenes.
- Test 16:9, 1:1, and 9:16 outputs.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_low_poly_3d_v1, cheerful low poly 3D boy walking to school, backpack, warm morning light, readable face, simple eyes, readable blocky hands, full body, geometric school environment, faceted shapes, matte materials, bright solid colors
```

```text
ax_low_poly_3d_v1, low poly school campus with geometric trees, simple clouds, blocky buildings, bright daylight, matte materials, clean game-friendly 3D environment
```

```text
ax_low_poly_3d_v1, low poly child exploring a colorful geometric mountain path, full body, backpack, faceted terrain, simple trees, readable hands, bright solid colors, lightweight game style
```

```text
ax_low_poly_3d_v1, two low poly 3D students walking together outside school, simplified friendly faces, readable blocky hands, geometric school campus, matte polygonal surfaces, clean bright composition
```

Score each output on:

- Low Poly 3D style fidelity
- Faceted geometry
- Face quality
- Simple eye quality
- Hand readability
- Matte material quality
- Clean environment
- Solid color palette
- Difference from `stylized_3d`
- Difference from `toy_clay_3d`
- Absence of game/franchise imitation

## Overfitting Watchlist

Stop or reduce training if:

- Everything becomes geometric mountains or trees.
- Faces become too poor or expressionless.
- Hands become unreadable.
- Geometry becomes too sharp.
- Scenes become too simple and not commercial enough.
- Colors repeat only green/blue.
- Surfaces become too smooth like `stylized_3d`.
- Materials become too soft like `toy_clay_3d`.
- Human subject variety degrades.

## AXSTUDIO Integration Criteria

Only connect the LoRA after visual validation confirms:

- `ax_low_poly_3d_v1` produces coherent low poly 3D.
- Geometry, materials, and colors are stable.
- Faces and hands remain readable.
- It does not imitate existing games or franchises.
- It remains distinct from `stylized_3d` and `toy_clay_3d`.
- It works for school, city, nature, app, educational, and game scenes.
- The JSON profile is used through the style prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for video with simple motion, lightweight camera movement, and geometric continuity.

Until then, keep it as a JSON style profile and training plan only.
