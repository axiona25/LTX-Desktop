# Dramatic Film LoRA Training Plan

## Style Target

- ID: `dramatic_film`
- UI label: `Dramatic Film`
- Trigger token: `ax_dramatic_film_v1`
- Type: style LoRA, not character LoRA

Goal: train a realistic high-contrast dramatic film look with controlled shadows, emotional atmosphere, motivated lighting, readable faces, readable hands, reflective wet surfaces when useful, and future video compatibility.

This LoRA must not learn a single identity, imitate films, directors, studios, franchises, brands, logos, posters, or push horror/gore. It must remain distinct from `cinematic_realism`: stronger contrast, stronger emotional tension, deeper shadows, but still readable.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Dramatic portraits | 20% |
| Half-body dramatic scenes | 25% |
| Full-body dramatic scenes | 25% |
| Environment/story scenes | 20% |
| Multiple characters | 5% |
| Props/details | 5% |

Include:

- Realistic high-contrast scenes
- Emotional or narrative subject poses
- Readable faces in shadow and difficult light
- Visible hands in a meaningful portion of the dataset
- Low-key interiors
- Rainy, cloudy, or wet exterior scenes
- Reflective pavement and wet surfaces
- Practical lights, street lamps, windows, rim lights, motivated backlight
- School, urban, home, or work environments with dramatic mood
- Dark, controlled, realistic color grading
- Horizontal and vertical compositions
- Video-friendly scenes with clear spatial layout and movement room

Exclude:

- Horror gore or explicit violence
- Recognizable films, franchises, actors, directors, brands, logos, or studios
- Poster layouts or text overlays
- Images where the face is unreadable
- Overly black frames with crushed detail
- Excessive lens flare or aggressive HDR
- Cartoon, anime, 3D render, painting, comic, or illustration styles
- Deformed faces, hands, or anatomy
- Duplicates and near-duplicates
- A dataset made only of night/rain scenes, which would overfit the style

## Captioning Guide

Every caption must start with:

```text
ax_dramatic_film_v1
```

Recommended caption structure:

```text
ax_dramatic_film_v1, [subject], [dramatic action/pose], [framing], [face/eyes/hands readability], [environment], [dramatic lighting], [shadows/reflections/weather], [mood], [color grading], realistic dramatic film still
```

Good caption:

```text
ax_dramatic_film_v1, schoolboy standing outside a school in the rain, three-quarter dramatic film scene, readable tense face, intense eyes, hands holding backpack straps, wet beige overshirt, dark stormy sky, school building in background, street lamp rim light, reflective wet pavement, deep shadows, controlled highlights, moody film color grading, realistic dramatic film still
```

Bad caption:

```text
dramatic boy movie scene
```

Why it is bad:

- Missing trigger token
- Does not describe light, shadows, face, environment, or mood
- Does not separate `dramatic_film` from `cinematic_realism`
- Too generic to teach the LoRA a controlled visual language

Captioning rules:

- Always describe mood, light, and shadows.
- Mention face, eyes, and hands when visible.
- Distinguish rain, stormy sky, low-key interior, night street, practical light, rim light, and deep shadows.
- Do not cite films, directors, studios, franchises, actors, or brands.
- Do not use generic captions such as "dramatic cinematic photo".
- Avoid horror language unless the user has explicitly selected a future horror-specific style.
- Keep the subject realistic and readable.

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

- Validate bright, dark, indoor, and outdoor scenes.
- Avoid overfitting to rain and night.
- Check face and eye readability in shadows.
- Check hands in shadow and reflective scenes.
- Keep the style clearly stronger than `cinematic_realism`, but not horror.
- Reject any tendency to add poster text, fake credits, or logos.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_dramatic_film_v1, cheerful boy walking to school with backpack in dramatic rain, readable face, readable hands, full body, school building background, wet reflective pavement, intense moody lighting, dramatic film still
```

```text
ax_dramatic_film_v1, young person sitting alone near a window in a dim room, readable emotional face, hands visible, strong side light, deep shadows, moody film color grading, dramatic realism
```

```text
ax_dramatic_film_v1, realistic person walking on a wet city street at night, street lamps, reflective pavement, strong silhouette, readable face, cinematic dramatic atmosphere
```

```text
ax_dramatic_film_v1, two students standing outside school during a stormy morning, readable faces and hands, tense emotional mood, strong contrast, dramatic film lighting
```

Score each output on:

- Dramatic film style fidelity
- Dramatic intensity
- Contrast quality
- Face readability
- Eye readability
- Hand quality
- Shadow depth
- Highlight control
- Color grading
- Narrative atmosphere
- Absence of text/logos
- Difference from `cinematic_realism`

## Overfitting Watchlist

Stop or reduce training if:

- Every scene becomes night.
- Every scene contains rain.
- Faces become too dark or unreadable.
- Hands disappear into shadows.
- Contrast crushes skin and materials.
- The mood becomes horror instead of dramatic.
- Fake poster text or logos appear.
- The same school or city environment repeats.
- Natural realism is lost.
- Simple prompts become unusable because the style is too forceful.

## AXSTUDIO Integration Criteria

Only connect the LoRA after visual validation confirms:

- `ax_dramatic_film_v1` consistently produces a dramatic film look.
- Face and hands remain readable.
- No text, poster, logo, or credits are added.
- No unwanted horror/gore behavior.
- It works across interiors, exteriors, school, city, and home scenes.
- It remains distinct from `cinematic_realism`.
- The JSON profile is used through the style prompt builder.
- Negative prompt and validation prompts are available.
- It is suitable for future video generation with camera motion and coherent atmosphere.

Until then, keep it as a JSON style profile and training plan only.
