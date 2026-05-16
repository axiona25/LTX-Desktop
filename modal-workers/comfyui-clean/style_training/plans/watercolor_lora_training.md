# Watercolor LoRA Training Plan

## Style Target

- ID: `watercolor`
- UI label: `Watercolor`
- Trigger token: `ax_watercolor_v1`
- Type: style LoRA, not character LoRA

Goal: train an original watercolor style focused on transparent pigments, visible paper, wet-on-wet gradients, soft organic edges, fluid brushwork, color blooms, light splatter, harmonious palette, and delicate emotional atmosphere. The style must preserve subject readability, especially faces and hands.

This LoRA must not learn a single character, imitate artists, books, publishers, brands, franchises, or protected IP. It must not become narrative `storybook_illustration`, digital `editorial_illustration`, pencil-only sketching, or lose readability in favor of technique.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Watercolor portraits | 15% |
| Half-body figures | 15% |
| Full-body figures | 20% |
| Landscapes/environment scenes | 30% |
| Multiple characters | 5% |
| Props/still life/details | 15% |

Include:

- Watercolor portraits, half body and full body figures
- Landscapes, cityscapes, school scenes, nature, gardens, soft architecture
- Still life, books, pencils, flowers, botanical compositions
- Visible paper texture, transparent washes, wet-on-wet gradients
- Dry brush accents, pigment blooms, light splatter
- Readable hands and faces in subject images

Exclude:

- Glossy digital images, 3D renders, vector flat, comic, anime, manga
- Oil painting, pencil-only sketch, excessive paper texture, chaotic splatter
- Unreadable subjects, deformed hands, dissolved faces
- Logos, watermarks, recognizable books, characters, artists, and duplicate images

## Captioning Guide

Every caption must start with:

```text
ax_watercolor_v1
```

Recommended caption structure:

```text
ax_watercolor_v1, [subject], [scene/action], [framing], [face/eyes], [hair], [hands/body], [outfit/props], [environment], [watercolor technique], [palette/lighting], original watercolor illustration style
```

Good caption:

```text
ax_watercolor_v1, cheerful boy walking toward school with backpack, full body watercolor illustration, soft readable face, gentle eyes, loose brown hair painted with fluid brush strokes, lightly defined hands holding backpack straps, blue hoodie, orange backpack, school building in soft background, pale blue sky, transparent watercolor washes, visible paper grain, wet-on-wet green trees, warm ochre sunlight, delicate pigment blooms, airy emotional atmosphere
```

Bad caption:

```text
watercolor boy at school
```

Why it is bad:

- Missing trigger token
- Does not describe paper, pigments, brushwork, or technique
- Does not distinguish `watercolor` from `storybook_illustration`
- Does not help preserve face and hand readability

Captioning rules:

- Always describe watercolor technique.
- Mention paper grain, washes, pigment, soft edges, wet-on-wet gradients, blooms, or splatter when present.
- Describe face and hands when visible.
- Specify portrait, landscape, cityscape, school scene, still life, botanical, book illustration, or editorial watercolor.
- Avoid artists, books, publishers, brands, characters, franchises, and protected IP.
- Keep separation from `storybook_illustration`, `editorial_illustration`, and `pencil_sketch`.
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

- Validate paper texture, pigment transparency, and subject readability at each checkpoint.
- Check hands and faces in character prompts.
- Avoid overfitting to landscapes only.
- Preserve variety across portraits, figures, landscapes, still life, botanical, school, and editorial scenes.
- Avoid excessive detail loss, splatter, paper grain, or washed-out values.
- Confirm the style remains watercolor technique-focused, not storybook narrative or digital editorial.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_watercolor_v1, cheerful boy walking to school, backpack, warm morning light, readable face, readable hands, full body, friendly school environment, transparent watercolor washes, visible paper texture, soft pigment gradients, delicate splatter
```

```text
ax_watercolor_v1, gentle portrait of a young student, readable eyes, soft face, loose watercolor hair, transparent skin tones, visible paper grain, delicate brush strokes, airy white background
```

```text
ax_watercolor_v1, peaceful school garden path with trees and flowers, soft building in background, transparent washes, wet-on-wet greens, warm sunlight, paper texture, poetic watercolor landscape
```

```text
ax_watercolor_v1, books, pencil and small flower vase on a desk, soft natural light, transparent watercolor pigment, visible paper grain, delicate shadows, calm educational still life
```

Score each output on:

- Watercolor style fidelity
- Paper quality
- Pigment transparency
- Brushwork quality
- Face quality
- Hand quality
- Subject readability
- Palette delicacy
- Difference from `storybook_illustration`
- Difference from `pencil_sketch`
- Absence of artist, book, or IP imitation

## Overfitting Watchlist

Stop or reduce training if:

- Images become too washed out or unreadable.
- Hands and faces dissolve into stains.
- Paper texture becomes too heavy.
- Splatter becomes excessive.
- Palette is always blue/ochre.
- The style becomes too storybook narrative.
- The style becomes too clean and digital.
- The watercolor technique disappears.
- Outputs imitate known artists or books.

## AXSTUDIO Integration Notes

Only connect the LoRA after visual validation confirms:

- `ax_watercolor_v1` produces coherent watercolor.
- Paper, pigments, and brushwork are stable.
- Faces and hands remain readable.
- It does not imitate artists, books, or existing characters.
- It remains distinct from `storybook_illustration`, `editorial_illustration`, and `pencil_sketch`.
- It works for portrait, landscape, school, botanical, still life, and editorial scenes.
- The JSON style profile is available through the AXSTUDIO prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for poetic video with paper parallax, pigment bloom motion, and gentle camera drift.

Until then, keep it as a JSON style profile and training plan only.
