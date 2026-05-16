# Vector Flat LoRA Training Plan

## Style Target

- ID: `vector_flat`
- UI label: `Vector Flat`
- Trigger token: `ax_vector_flat_v1`
- Type: style LoRA, not character LoRA

Goal: train a modern flat vector style for clean, simple, geometric, readable, professional graphics across app, web, dashboard, infographic, educational, presentation, icon, and corporate communication use cases. The style must use solid color fills, clean spacing, crisp vector edges, reduced detail, and clear visual hierarchy.

This LoRA must not learn a single character, generate logos or proprietary icons, imitate brands, apps, companies, mascots, characters, or protected IP. It must not become textured `editorial_illustration`, advertising-heavy `poster_graphic`, cartoon, 3D, or painterly illustration.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Portraits/vector avatars | 10% |
| Half-body vector characters | 20% |
| Full-body vector characters | 20% |
| Environment/app scenes | 25% |
| Multiple characters | 10% |
| Icons/props/UI details | 15% |

Include:

- App and web illustrations
- Dashboard, business, education, infographic, and corporate vector scenes
- Generic UI illustrations and icon sets
- Flat characters, simplified school and office environments
- Geometric forms, solid colors, modern palettes, ordered compositions
- Simplified but readable faces and hands
- Minimal shadows and crisp vector edges

Exclude:

- Real logos, recognizable brands, app UI, proprietary icons, famous characters
- Painterly textures, watercolor, paper grain, heavy comic/anime/cartoon rendering
- 3D renders, photorealism, overly detailed scenes
- Deformed hands, long text, duplicate and near-duplicate images

## Captioning Guide

Every caption must start with:

```text
ax_vector_flat_v1
```

Recommended caption structure:

```text
ax_vector_flat_v1, [subject], [action/concept], [framing], [geometric forms], [face/hands], [outfit/props], [environment/UI elements], [palette], [layout/composition], modern flat vector illustration style
```

Good caption:

```text
ax_vector_flat_v1, cheerful student walking toward a futuristic school campus, full body flat vector illustration, simple geometric body shapes, minimal friendly face, simplified dark hair, readable vector hands holding backpack straps, teal hoodie and orange backpack, clean school building, sky bridge and small flying vehicle, solid teal navy orange palette, flat color fills, minimal shadows, crisp edges, clear app illustration composition
```

Bad caption:

```text
vector boy at school
```

Why it is bad:

- Missing trigger token
- Does not describe geometric forms, palette, layout, or flat design
- Does not distinguish `vector_flat` from `editorial_illustration`
- Does not help preserve vector cleanliness and simplicity

Captioning rules:

- Always describe geometric forms and solid colors.
- Specify app illustration, web illustration, infographic, dashboard, education vector, corporate vector, or icon set.
- Mention face and hands when visible.
- Avoid brands, logos, known apps, proprietary UI, and protected IP.
- Avoid paper texture, brushwork, painterly grain, and realistic lighting.
- Keep separation from `editorial_illustration` and `poster_graphic`.
- Avoid overly short captions.

## Training Checklist

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

Checklist:

- Validate geometric cleanliness and crisp edges.
- Confirm no logos, readable text, or proprietary UI are generated.
- Check simplified hands and faces remain readable.
- Preserve variety across app, web, education, business, icon, dashboard, and infographic scenes.
- Avoid overfitting to one teal/orange palette.
- Confirm the style remains flat, not painterly or editorial textured.
- Validate 16:9, 4:3, 1:1, 9:16, and 4:5 outputs for app, presentation, and motion graphic uses.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_vector_flat_v1, cheerful boy walking to school, backpack, readable face, readable simplified hands, full body, friendly school environment, simple geometric shapes, solid colors, clean flat vector illustration
```

```text
ax_vector_flat_v1, person using a dashboard interface on laptop, simple vector character, clean UI panels, charts, icons, solid colors, minimal shading, modern app illustration
```

```text
ax_vector_flat_v1, teacher explaining a simple chart to students, readable simplified faces and hands, clean classroom environment, flat colors, clear educational vector composition
```

```text
ax_vector_flat_v1, set of simple education and technology icons, books, laptop, school, chart, cloud, clean geometric shapes, solid colors, minimal flat vector design
```

Score each output on:

- Vector Flat style fidelity
- Geometric form cleanliness
- Solid palette quality
- Composition simplicity
- Face readability
- Hand readability
- UI/icon element quality
- Absence of painterly texture
- Absence of logos or text
- Difference from `editorial_illustration`
- Difference from `poster_graphic`

## Overfitting Watchlist

Stop or reduce training if:

- Everything becomes identical corporate artwork.
- Palette is always teal/orange.
- Characters become too rigid or expressionless.
- Hands become unreadable symbols.
- Unwanted icons, logos, or text appear.
- Scenes become too empty.
- The style drifts toward textured `editorial_illustration`.
- The style drifts toward advertising-heavy `poster_graphic`.
- Variety across app, dashboard, education, and web scenes collapses.

## AXSTUDIO Integration Notes

Only connect the LoRA after visual validation confirms:

- `ax_vector_flat_v1` produces coherent flat vector graphics.
- Forms, colors, and composition are stable.
- Faces and hands remain readable even when simplified.
- It does not generate logos, brands, proprietary UI, or unwanted text.
- It remains distinct from `editorial_illustration` and `poster_graphic`.
- It works for app, web, dashboard, education, icon set, business, and infographic scenes.
- The JSON style profile is available through the AXSTUDIO prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for video/motion graphics with shape animation, parallax, and clean transitions.

Until then, keep it as a JSON style profile and training plan only.
