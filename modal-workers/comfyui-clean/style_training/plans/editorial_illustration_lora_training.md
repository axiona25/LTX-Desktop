# Editorial Illustration LoRA Training Plan

## Style Target

- ID: `editorial_illustration`
- UI label: `Editorial Illustration`
- Trigger token: `ax_editorial_illustration_v1`
- Type: style LoRA, not character LoRA

Goal: train a modern editorial illustration style that communicates ideas clearly with clean expressive illustrated humans, balanced composition, muted professional palettes, light paper texture, subtle brush grain, readable faces and hands, simplified recognizable environments, and strong suitability for articles, education, apps, business, blogs, and lightweight video.

This LoRA must not learn a single character, imitate illustrators, magazines, brands, agencies, franchises, or protected characters. It must not become comic-book panel art, dark graphic novel, pure flat vector, or fairytale storybook illustration.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Editorial portraits | 15% |
| Half-body scenes | 20% |
| Full-body scenes | 20% |
| Environment/concept scenes | 25% |
| Multiple characters | 10% |
| Props/details | 10% |

Include:

- Original modern editorial illustrations
- Education, business, app/web, social/article, and concept scenes
- Abstract but readable concepts
- People in everyday activities
- Readable hands
- Simplified environments
- Muted modern palettes
- Light paper texture
- Clean linework
- Compositions with visual breathing space
- Conceptual props such as books, laptops, charts, plants, windows, and generic symbols

Exclude:

- Recognizable brand illustrations
- Famous illustrator styles
- Recognizable magazines, campaigns, logos, or protected layouts
- Long text or protected layouts
- Comics with panels or balloons
- Anime, manga, 3D renders, overly childish cartoon
- Pure vector-flat images without texture
- Deformed hands, unreadable faces, duplicate images

## Captioning Guide

Every caption must start with:

```text
ax_editorial_illustration_v1
```

Recommended caption structure:

```text
ax_editorial_illustration_v1, [subject], [action/concept], [framing], [face/eyes], [hands/body], [outfit/props], [environment], [palette/texture], [composition], modern editorial illustration style
```

Good caption:

```text
ax_editorial_illustration_v1, cheerful student walking toward school, full body modern editorial illustration, readable empathetic face, simple clear eyes, simplified dark hair, readable hands holding backpack straps, yellow jacket and blue backpack, clean school building in background, soft trees and sky, muted teal and ochre palette, light paper texture, subtle brush grain, balanced composition, education concept illustration about learning and growth
```

Bad caption:

```text
editorial boy at school
```

Why it is bad:

- Missing trigger token
- Does not describe concept, palette, texture, or composition
- Does not distinguish `editorial_illustration` from comics, cartoon, or flat vector
- Does not preserve business, education, app, and article utility

Captioning rules:

- Always describe the communicated concept.
- Describe palette and texture.
- Mention face and hands when visible.
- Specify education, business, app, article, concept, or social editorial.
- Avoid illustrators, magazines, brands, agencies, franchises, and protected IP.
- Avoid comic, balloon, panel, and superhero grammar.
- Keep separation from `vector_flat`, `storybook_illustration`, `comic_book`, and `graphic_novel`.

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

- Validate composition and message clarity.
- Avoid overfitting to teal/ochre palettes.
- Check hands and faces.
- Avoid becoming too corporate or too abstract.
- Preserve variety across education, business, app, social, and concept scenes.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_editorial_illustration_v1, cheerful boy walking to school, backpack, warm morning light, readable face, readable hands, full body, friendly school environment, modern editorial illustration, muted colors, light paper texture, clean balanced composition
```

```text
ax_editorial_illustration_v1, teacher helping students learn in a bright classroom, readable faces and hands, clean modern illustration, soft muted colors, paper grain, education concept, balanced editorial composition
```

```text
ax_editorial_illustration_v1, person working on laptop with charts and ideas around them, modern business editorial illustration, readable hands, clean composition, muted palette, subtle texture
```

```text
ax_editorial_illustration_v1, two people talking in a simple city park, empathetic expressions, readable gestures, soft background, modern article illustration style, harmonious colors, light brush texture
```

Score each output on:

- Editorial Illustration style fidelity
- Communication clarity
- Composition quality
- Palette quality
- Texture quality
- Face quality
- Hand quality
- Environment simplicity
- Difference from `vector_flat`
- Difference from `storybook_illustration`
- Difference from `comic_book` and `graphic_novel`
- Absence of brand or illustrator imitation

## Overfitting Watchlist

Stop or reduce training if:

- Every scene becomes corporate.
- Palette repeats too strongly.
- Faces become too simplified.
- Hands become symbolic or deformed.
- Composition becomes too infographic-like.
- Style becomes too flat/vector.
- Style becomes too storybook-like.
- Concepts become too abstract and unreadable.
- It imitates recognizable illustrators or magazines.

## AXSTUDIO Integration Criteria

Only connect the LoRA after visual validation confirms:

- `ax_editorial_illustration_v1` produces coherent editorial illustrations.
- Subject, message, and composition are clear.
- Faces and hands remain readable.
- Palette and texture are stable.
- It does not imitate brands, illustrators, or magazines.
- It remains distinct from `vector_flat`, `storybook_illustration`, `graphic_novel`, and `comic_book`.
- It works for education, business, app, blog, article, and social scenes.
- The JSON profile is used through the style prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for lightweight video with parallax, motion graphics, and simple camera movement.

Until then, keep it as a JSON style profile and training plan only.
