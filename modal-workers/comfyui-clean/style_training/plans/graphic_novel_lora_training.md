# Graphic Novel LoRA Training Plan

## Style Target

- ID: `graphic_novel`
- UI label: `Graphic Novel`
- Trigger token: `ax_graphic_novel_v1`
- Type: style LoRA, not character LoRA

Goal: train an original mature graphic novel illustration style with expressive variable linework, rich illustrated textures, desaturated cinematic palette, painterly shadows, emotional faces, readable illustrated hands, lived-in environments, and grounded visual storytelling.

This LoRA must not learn a single character, imitate publishers, authors, graphic novels, films, franchises, brands, or existing characters. It must not generate speech balloons, text, or sound effects unless explicitly requested. It must stay illustrative, narrative, mature, and distinct from `comic_book`, `manga_ink`, `documentary_realism`, and photorealism.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Graphic novel portraits | 20% |
| Half-body panels | 25% |
| Full-body panels | 20% |
| Environment/story scenes | 25% |
| Multiple characters | 5% |
| Props/details | 5% |

Include:

- Original semi-realistic characters
- Narrative school scenes, street scenes, interiors, emotional close-ups, adventure panels
- Atmospheric environments
- Expressive faces
- Readable hands
- Variable linework
- Controlled hatching
- Painterly textures
- Desaturated palettes
- Directional shadows
- Cinematic compositions

Exclude:

- Recognizable characters, publishers, franchises, logos, and brands
- Unwanted speech balloons, captions, text, or sound effects
- Pure photorealistic images
- Monochrome manga
- Overly bright comic-book cartoon style
- Recognizable superheroes
- Gore or adult-oriented content
- Deformed hands, chaotic linework, duplicate images
- Colors that are too saturated for the `graphic_novel` target

## Captioning Guide

Every caption must start with:

```text
ax_graphic_novel_v1
```

Recommended caption structure:

```text
ax_graphic_novel_v1, [subject], [scene/action], [framing/panel type], [face/eyes/emotion], [hair], [hands/body], [outfit], [environment], [linework/texture], [muted colors/shadows], original graphic novel illustration style
```

Good caption:

```text
ax_graphic_novel_v1, schoolboy walking through an old school courtyard, full body narrative graphic novel panel, thoughtful readable face, expressive eyes, textured dark hair, realistic illustrated hands holding backpack straps, beige jacket and blue backpack, weathered school building, cloudy sky, muted blue and ochre palette, variable ink linework, painterly shadows, subtle paper texture, atmospheric original graphic novel illustration
```

Bad caption:

```text
graphic novel boy at school
```

Why it is bad:

- Missing trigger token
- Does not describe linework, texture, palette, or atmosphere
- Does not distinguish `graphic_novel` from `comic_book`
- Does not control the mature narrative tone

Captioning rules:

- Always describe narrative mood, texture, and linework.
- Mention muted or desaturated palette.
- Describe face and hands when visible.
- Specify emotional close-up, narrative panel, urban scene, school panel, atmospheric interior, or poster illustration.
- Avoid publishers, authors, characters, franchises, films, and brands.
- Do not generate balloons/text unless explicitly requested.
- Keep separation from `comic_book`, `manga_ink`, and photorealistic/documentary looks.

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

- Validate linework, face, hands, and texture every checkpoint.
- Avoid overfitting to overly dark tones.
- Avoid automatic balloons, captions, or text.
- Keep separation from `comic_book`.
- Keep separation from photorealistic and documentary realism.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_graphic_novel_v1, cheerful boy walking to school, backpack, warm morning light, readable face, expressive eyes, readable hands, full body, atmospheric school environment, variable ink linework, muted colors, textured shading, narrative graphic novel panel
```

```text
ax_graphic_novel_v1, emotional close-up of a student outside school, readable expressive eyes, textured ink linework, muted cinematic colors, painterly shadows, atmospheric graphic novel illustration
```

```text
ax_graphic_novel_v1, young person walking through a quiet city street, full body, backpack, readable hands, overcast light, textured buildings, muted palette, mature narrative comic panel
```

```text
ax_graphic_novel_v1, two students talking near an old school entrance, expressive faces, readable hands, atmospheric background, muted colors, variable ink lines, grounded storytelling composition
```

Score each output on:

- Graphic Novel style fidelity
- Linework quality
- Texture quality
- Muted palette quality
- Face quality
- Eye quality
- Hand quality
- Narrative atmosphere
- Environment quality
- Absence of unwanted text/balloons
- Difference from `comic_book`
- Difference from `manga_ink`
- Absence of IP or character imitation

## Overfitting Watchlist

Stop or reduce training if:

- Every image becomes too dark.
- Colors become muddy or unreadable.
- Linework becomes dirty.
- Balloons or text appear unrequested.
- Every subject becomes sad or serious.
- The style becomes too photorealistic.
- The style becomes too vivid like `comic_book`.
- Hands deform under excess texture.
- Environments become too complex and unclear.

## AXSTUDIO Integration Criteria

Only connect the LoRA after visual validation confirms:

- `ax_graphic_novel_v1` produces coherent graphic novel style.
- Linework, texture, and palette are stable.
- Face, eyes, and hands remain readable.
- It does not generate unwanted text or balloons.
- It does not imitate publishers, authors, characters, or franchises.
- It remains distinct from `comic_book` and `manga_ink`.
- It works for school, urban, interior, emotional, adventure, and poster scenes.
- The JSON profile is used through the style prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for video with panel motion, parallax, and cinematic storytelling.

Until then, keep it as a JSON style profile and training plan only.
