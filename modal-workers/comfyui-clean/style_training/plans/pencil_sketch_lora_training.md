# Pencil Sketch LoRA Training Plan

## Style Target

- ID: `pencil_sketch`
- UI label: `Pencil Sketch`
- Trigger token: `ax_pencil_sketch_v1`
- Type: style LoRA, not character LoRA

Goal: train an original graphite pencil sketch style focused on monochrome linework, hatching, cross-hatching, chiaroscuro, visible paper grain, sketchbook feel, natural construction lines, readable faces, readable hands, architectural sketching, environment studies, storyboard frames, and concept sketch compatibility.

This LoRA must not learn a single character, imitate artists, books, brands, franchises, characters, or protected IP. It must not become `manga_ink`, `watercolor`, heavy charcoal, photorealistic, full color, or glossy digital painting. It must remain elegant, readable, natural, monochrome, and clearly graphite-based.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Pencil portraits | 20% |
| Half-body sketches | 15% |
| Full-body sketches | 20% |
| Environment/architecture sketches | 25% |
| Multiple characters | 5% |
| Props/still life/details | 15% |

Include:

- Pencil portraits, half-body sketches, and full-body sketches
- Well-drawn hands, readable faces, and natural body construction
- School environments, classrooms, urban streets, architecture, and perspective studies
- Desk objects, books, pencils, notebooks, backpacks, and still life subjects
- Storyboard frames, concept sketches, visual notes, and preparatory studies
- Graphite linework, hatching, cross-hatching, chiaroscuro, paper grain, smudged shadows, and eraser highlights

Exclude:

- Full color images, watercolor, oil painting, glossy digital painting, 3D renders, vector flat, photorealistic photos
- Manga ink, comic ink, heavy charcoal-only drawings, marker art, and heavy ink outlines
- Logos, watermarks, recognizable characters, franchise imagery, copied styles, and protected IP
- Deformed hands, unreadable faces, chaotic hatching, overly dark sketches, duplicate images

## Captioning Guide

Every caption must start with:

```text
ax_pencil_sketch_v1
```

Recommended caption structure:

```text
ax_pencil_sketch_v1, [subject], [scene/action], [framing], [face/eyes], [hair], [hands/body], [outfit/props], [environment], [pencil technique], [paper/shading], original pencil sketch drawing style
```

Good caption:

```text
ax_pencil_sketch_v1, cheerful boy walking toward school with backpack, full body pencil sketch, readable soft face, clear pencil-drawn eyes, layered graphite hair strokes, readable hands holding backpack straps, hoodie and backpack rendered with hatching, school building and futuristic towers in background, visible paper grain, cross-hatching on shadows, soft graphite chiaroscuro, natural sketchbook drawing style
```

Bad caption:

```text
pencil boy at school
```

Why it is bad:

- Missing trigger token
- Does not describe graphite, hatching, paper, or chiaroscuro
- Does not distinguish `pencil_sketch` from `manga_ink`
- Does not help preserve face and hand readability

Captioning rules:

- Always describe graphite, paper, and hatching.
- Describe face, eyes, hands, and body construction when visible.
- Specify pencil portrait, full body sketch, environment sketch, storyboard frame, concept sketch, still life, or architectural sketch.
- Mention graphite lines, hatching, cross-hatching, paper grain, smudged shading, construction marks, and eraser highlights when present.
- Avoid artists, books, brands, characters, franchises, and protected IP.
- Keep separation from `manga_ink`, `watercolor`, and heavy charcoal.
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

- Validate monochrome control at every checkpoint.
- Check graphite line quality, hatching, cross-hatching, and chiaroscuro.
- Check paper texture without making it too heavy.
- Check hands, eyes, and faces in character prompts.
- Preserve variety across portraits, full body, architecture, school scenes, storyboard, still life, and concept sketches.
- Prevent dark, dirty, chaotic, or overworked shading.
- Confirm the style remains graphite pencil, not ink, watercolor, charcoal, or photorealistic.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_pencil_sketch_v1, cheerful boy walking to school, backpack, warm morning light represented in graphite, readable face, readable hands, full body, friendly school environment, pencil sketch, hatching, cross-hatching, visible paper texture
```

```text
ax_pencil_sketch_v1, gentle portrait of a young student, readable eyes, soft face, layered graphite hair strokes, paper grain, delicate pencil shading, monochrome sketchbook style
```

```text
ax_pencil_sketch_v1, school courtyard with trees and building, perspective drawing, pencil linework, hatching, paper texture, soft graphite shadows, architectural sketch style
```

```text
ax_pencil_sketch_v1, books, pencil and open notebook on a desk, graphite still life drawing, visible paper grain, cross-hatching, soft shadows, educational sketch study
```

Score each output on:

- Pencil sketch style fidelity
- Graphite line quality
- Hatching quality
- Cross-hatching quality
- Chiaroscuro quality
- Paper texture quality
- Face quality
- Eye quality
- Hand quality
- Subject readability
- Monochrome control
- Difference from `manga_ink`
- Difference from `watercolor`
- Absence of artist or IP imitation

## Overfitting Watchlist

Stop or reduce training if:

- Drawings become too dark or dirty.
- Hatching becomes chaotic.
- Hands and faces become unreadable.
- Paper texture becomes too heavy.
- The style drifts toward `manga_ink`.
- The style drifts toward heavy charcoal.
- Environment perspective degrades.
- Every scene becomes an architectural sketch.
- Subjects look too incomplete or unfinished.
- Construction lines overwhelm the final drawing.
- Commercial readability is lost.

## AXSTUDIO Integration Notes

Only connect the LoRA after visual validation confirms:

- `ax_pencil_sketch_v1` produces coherent graphite pencil drawings.
- Monochrome, graphite, hatching, cross-hatching, chiaroscuro, and paper grain are stable.
- Faces, eyes, and hands remain readable.
- It does not become `manga_ink`, `watercolor`, or heavy charcoal.
- It does not imitate artists, books, brands, franchises, or protected IP.
- It works for portrait, full body, school scene, architectural sketch, storyboard, still life, and concept sketch prompts.
- The JSON style profile is available through the AXSTUDIO prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for light video with line reveal, sketchbook parallax, and gentle camera drift.

Until then, keep it as a JSON style profile and training plan only.
