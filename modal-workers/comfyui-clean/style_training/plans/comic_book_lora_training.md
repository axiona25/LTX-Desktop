# Comic Book LoRA Training Plan

## Style Target

- ID: `comic_book`
- UI label: `Comic Book`
- Trigger token: `ax_comic_book_v1`
- Type: style LoRA, not character LoRA

Goal: train an original color western comic book style with bold ink outlines, variable line weight, vivid colors, graphic shadows, halftone dots, controlled hatching, dynamic poses, readable faces and hands, and energetic comic panel composition.

This LoRA must not learn a single character, imitate publishers, superheroes, franchises, logos, brands, or existing characters. It must not generate speech balloons, text, or sound effects unless explicitly requested. It must remain distinct from `manga_ink`, `graphic_novel`, and `clean_cartoon`.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Comic portraits | 20% |
| Half-body panels | 25% |
| Full-body dynamic panels | 25% |
| Environment/panel scenes | 15% |
| Multiple characters | 5% |
| Props/details | 10% |

Include:

- Original comic characters
- School comic panels, action panels, adventure panels, educational comic scenes
- City scenes and poster-like panels
- Expressive faces
- Readable hands
- Dynamic poses
- Bold outlines
- Vivid colors
- Halftone
- Hatching
- Graphic shadows
- Panel-like compositions

Exclude:

- Recognizable superheroes, characters, publishers, franchises, logos, and brands
- Unwanted speech balloons, captions, text, or sound effects
- Monochrome manga, anime, 3D render, photorealistic images
- Deformed hands
- Chaotic line art or dirty halftone
- Duplicates and near-duplicates
- Gore or adult-oriented content

## Captioning Guide

Every caption must start with:

```text
ax_comic_book_v1
```

Recommended caption structure:

```text
ax_comic_book_v1, [subject], [scene/action], [framing/panel type], [face/eyes], [hair], [hands/body], [outfit], [environment], [bold outlines/halftone/hatching], [colors/shadows], original color comic book style
```

Good caption:

```text
ax_comic_book_v1, cheerful comic book schoolboy walking through a school campus, full body dynamic panel, expressive smiling face, large readable eyes, bold ink outlines, stylized brown hair with graphic highlights, readable comic hands holding backpack straps, beige shirt, blue backpack, vivid blue sky, school building background, halftone shading, hatching on clothing folds, strong graphic shadows, colorful original comic book illustration
```

Bad caption:

```text
comic boy at school
```

Why it is bad:

- Missing trigger token
- Does not describe colors, line treatment, halftone, shadows, or panel framing
- Does not distinguish `comic_book` from `manga_ink`
- Does not help avoid superhero, publisher, or franchise drift

Captioning rules:

- Always describe bold outlines, colors, halftone, and shadows.
- Specify panel, action panel, school comic, educational comic, poster comic, or adventure comic.
- Describe face, eyes, and hands when visible.
- Avoid publishers, superheroes, franchises, characters, and brands.
- Do not generate balloons/text unless explicitly requested.
- Distinguish from `manga_ink` and `graphic_novel`.
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

- Validate line quality, hands, and colors every checkpoint.
- Avoid automatic balloons, text, or sound effects.
- Avoid overfitting to superheroes or action-only poses.
- Check separation from `manga_ink` and `graphic_novel`.
- Preserve positive, educational, and non-action scenes.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_comic_book_v1, cheerful comic book boy walking to school, backpack, warm morning light, readable face, expressive eyes, readable hands, full body, friendly school environment, bold ink outlines, vivid colors, halftone shading, dynamic comic panel
```

```text
ax_comic_book_v1, comic book student sitting in classroom writing in notebook, readable face and hands, bold outlines, vivid colors, hatching on clothing, halftone shadows, educational comic panel
```

```text
ax_comic_book_v1, comic book character running through a school courtyard, dynamic pose, readable hands, speed lines, strong ink outlines, vivid colors, graphic shadows, energetic comic panel
```

```text
ax_comic_book_v1, two comic book students talking outside school, expressive faces, readable hands, colorful school campus, bold outlines, halftone shading, positive story panel
```

Score each output on:

- Comic Book style fidelity
- Line quality
- Color quality
- Halftone quality
- Hatching quality
- Face quality
- Hand quality
- Composition energy
- Absence of unwanted balloons/text
- Difference from `manga_ink`
- Difference from `graphic_novel`
- Absence of IP, publisher, or superhero imitation

## Overfitting Watchlist

Stop or reduce training if:

- Every character becomes superhero-like.
- Balloons or text appear unrequested.
- Colors become oversaturated.
- Halftone becomes chaotic.
- Hands break in dynamic poses.
- Lines become too heavy.
- The style drifts too close to manga.
- The style becomes too dark like graphic novel.
- It imitates known characters or publishers.
- Positive/educational scenes are lost.

## AXSTUDIO Integration Criteria

Only connect the LoRA after visual validation confirms:

- `ax_comic_book_v1` produces coherent original color comic book style.
- Lines, colors, halftone, and shadows are stable.
- Faces and hands remain readable.
- It does not generate unwanted balloons or text.
- It does not imitate characters, publishers, franchises, or brands.
- It remains distinct from `manga_ink` and `graphic_novel`.
- It works for school, educational, action, adventure, and poster scenes.
- The JSON profile is used through the style prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for video with panel motion, parallax, and dynamic camera movement.

Until then, keep it as a JSON style profile and training plan only.
