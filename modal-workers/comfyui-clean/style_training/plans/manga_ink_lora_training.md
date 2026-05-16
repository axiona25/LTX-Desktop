# Manga Ink LoRA Training Plan

## Style Target

- ID: `manga_ink`
- UI label: `Manga Ink`
- Trigger token: `ax_manga_ink_v1`
- Type: style LoRA, not character LoRA

Goal: train an original black-and-white manga ink style with clean line art, screentone, hatching, controlled cross-hatching, readable expressions, detailed environments, and panel/storyboard composition.

This LoRA must not learn a single character, imitate existing manga, authors, studios, franchises, logos, or generate speech balloons, subtitles, or text unless explicitly requested. It must stay monochrome manga ink and remain distinct from `anime_clean` and `comic_book`.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Manga ink portraits | 20% |
| Half-body panels | 25% |
| Full-body panels | 20% |
| Environment/panel scenes | 20% |
| Multiple characters | 5% |
| Props/details | 10% |

Include:

- Original manga characters
- Expressive close-ups
- Half-body manga panels
- Full-body manga scenes
- School scenes and classroom panels
- City scenes, action panels, emotional panels
- Clean screentone and halftone patterns
- Controlled hatching and cross-hatching
- Balanced solid blacks
- Detailed but readable environments
- Visible correct simplified hands
- Strict black-and-white images

Exclude:

- Screenshots or scans of existing manga
- Recognizable characters, authors, studios, franchises, brands, or logos
- Watermarks, subtitles, speech balloons, and unrequested text
- Full color images and colored anime
- Western color comic style
- Rough sketch or dirty line art
- Chaotic screentone
- Deformed hands or asymmetric eyes
- Duplicates and near-duplicates

## Captioning Guide

Every caption must start with:

```text
ax_manga_ink_v1
```

Recommended caption structure:

```text
ax_manga_ink_v1, [subject], [scene/action], [framing/panel type], [face/eyes], [hair], [hands/body], [outfit], [environment], [ink line art], [screentone/hatching], monochrome black and white manga ink style
```

Good caption:

```text
ax_manga_ink_v1, cheerful manga schoolboy walking through a school campus, half body manga panel, expressive large eyes, inked layered black hair, clean hands holding backpack straps, beige shirt rendered in black and white line art, detailed school background, crisp ink contours, screentone shadows, hatching on clothing folds, strong monochrome contrast, polished original manga ink illustration
```

Bad caption:

```text
manga boy at school
```

Why it is bad:

- Missing trigger token
- Does not specify black and white
- Does not describe screentone, ink, hatching, or contrast
- Does not distinguish `manga_ink` from `anime_clean`
- Does not describe hands, eyes, line quality, or environment

Captioning rules:

- Always include `monochrome black and white`.
- Describe line art, screentone, and hatching.
- Describe eyes and hair when visible.
- Describe hands and body when visible.
- Specify panel type: close-up, action panel, emotional panel, environment panel, or manga page frame.
- Avoid manga, author, studio, franchise, and character references.
- Do not generate balloons or text.
- Keep it distinct from `anime_clean` and `comic_book`.

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

- Validate strict monochrome behavior.
- Check screentone density and hatching stability.
- Check faces, expressive eyes, and simplified hands.
- Avoid overfitting to one screentone pattern.
- Reject color drift.
- Reject unwanted text or balloons.
- Preserve clear separation from `anime_clean` and `comic_book`.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_manga_ink_v1, cheerful manga boy walking to school, backpack, readable face, expressive eyes, readable hands, full body, friendly school environment, crisp black ink line art, screentone shading, monochrome black and white
```

```text
ax_manga_ink_v1, manga student sitting in classroom writing in notebook, readable face and hands, clean ink line art, hatching on clothing, screentone shadows, detailed classroom background, monochrome manga panel
```

```text
ax_manga_ink_v1, emotional manga character close-up, expressive eyes, clean facial lines, inked hair, dramatic screentone background, strong black and white contrast, polished manga ink style
```

```text
ax_manga_ink_v1, manga character running through school courtyard, dynamic pose, readable hands, speed lines, crisp ink line art, controlled hatching, monochrome black and white action panel
```

Score each output on:

- Manga ink style fidelity
- Monochrome control
- Line art quality
- Screentone quality
- Hatching quality
- Eye quality
- Hand quality
- Environment readability
- Black/white contrast
- Absence of color
- Absence of text/balloons
- Difference from `anime_clean` and `comic_book`

## Overfitting Watchlist

Stop or reduce training if:

- Screentone density becomes identical everywhere.
- Blacks cover faces or hands.
- Hands become too simplified or broken.
- Scenes are always school scenes.
- Eyes become too similar across subjects.
- Hatching becomes chaotic.
- The style becomes dirty sketch instead of clean ink.
- Text or speech balloons appear unrequested.
- It collapses toward `comic_book`.

## AXSTUDIO Integration Criteria

Only connect the LoRA after visual validation confirms:

- `ax_manga_ink_v1` produces coherent monochrome manga ink.
- Line art, screentone, and hatching are stable.
- Face, eyes, and hands remain readable.
- No unexpected color appears.
- No balloons or text appear unless requested.
- It does not imitate existing works, characters, or studios.
- It remains distinct from `anime_clean` and `comic_book`.
- The JSON profile is used through the style prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for future manga motion/video with parallax, panel movement, and camera movement.

Until then, keep it as a JSON style profile and training plan only.
