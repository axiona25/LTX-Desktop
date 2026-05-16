# Euro Comic LoRA Training Plan

## Style Target

- ID: `european_comic`
- UI label: `Euro Comic`
- Trigger token: `ax_european_comic_v1`
- Type: style LoRA, not character LoRA

Goal: train an original European comic illustration style with clean clear linework, harmonious flat colors, ordered architectural backgrounds, expressive but restrained characters, readable faces and hands, balanced panel composition, and classic-modern narrative adventure tone.

This LoRA must not learn a single character, imitate authors, publishers, series, franchises, brands, or existing characters. It must not generate speech balloons, text, or sound effects unless explicitly requested. It must remain distinct from `comic_book`, `graphic_novel`, and `manga_ink`.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| European comic portraits | 15% |
| Half-body panels | 20% |
| Full-body panels | 25% |
| Environment/story scenes | 30% |
| Multiple characters | 5% |
| Props/details | 5% |

Include:

- Original characters
- School scenes, classroom scenes, European-style streets, village scenes, city squares
- Countryside adventure and educational panels
- Balanced adventure panels
- Detailed architectural environments
- Clean linework
- Harmonious flat colors
- Light shadows
- Expressive faces
- Readable hands
- Ordered backgrounds

Exclude:

- Recognizable authors, series, publishers, franchises, characters, logos, and brands
- Unwanted speech balloons, captions, text, or sound effects
- Monochrome manga
- Saturated superhero comic style
- Overly dark graphic novel style
- 3D render or photorealistic images
- Dirty line art, deformed hands, chaotic environments
- Duplicates and near-duplicates

## Captioning Guide

Every caption must start with:

```text
ax_european_comic_v1
```

Recommended caption structure:

```text
ax_european_comic_v1, [subject], [scene/action], [framing/panel type], [face/eyes], [hair], [hands/body], [outfit], [European-style environment], [linework/colors/shadows], original European comic illustration style
```

Good caption:

```text
ax_european_comic_v1, cheerful schoolboy walking through a European-style school courtyard, full body balanced comic panel, friendly readable face, clean moderate-size eyes, inked brown hair, readable hands holding backpack straps, beige jacket and blue backpack, detailed stone school building, courtyard trees, clear blue sky, clean clear linework, harmonious flat colors, subtle graphic shadows, ordered background detail, polished original European comic illustration
```

Bad caption:

```text
Euro comic boy at school
```

Why it is bad:

- Missing trigger token
- Does not describe linework, palette, environment, or composition
- Does not distinguish `european_comic` from `comic_book`
- Does not control author or series imitation risk

Captioning rules:

- Always describe clean linework and harmonious colors.
- Describe environments and architecture when present.
- Describe face, eyes, and hands when visible.
- Specify school panel, village scene, city square, adventure panel, classroom scene, or educational comic.
- Avoid authors, publishers, series, characters, franchises, and brands.
- Do not generate balloons/text unless explicitly requested.
- Keep separation from `comic_book`, `graphic_novel`, and `manga_ink`.

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

- Validate linework, face, hands, and background every checkpoint.
- Avoid recognizable author imitation.
- Avoid automatic balloons, captions, or text.
- Keep separation from `comic_book`.
- Keep separation from `graphic_novel`.
- Ensure environments stay detailed but ordered.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_european_comic_v1, cheerful boy walking to school, backpack, warm morning light, readable face, clean eyes, readable hands, full body, European-style school courtyard, clear linework, harmonious flat colors, ordered detailed background
```

```text
ax_european_comic_v1, student sitting in a detailed classroom writing in notebook, readable face and hands, clean linework, harmonious colors, subtle shadows, polished European educational comic panel
```

```text
ax_european_comic_v1, young explorer walking through a charming village street, full body, backpack, readable hands, detailed buildings, clear daylight, balanced European comic composition
```

```text
ax_european_comic_v1, two students talking outside an old school entrance, expressive friendly faces, readable hands, ordered architectural background, clean lines, harmonious colors, narrative comic panel
```

Score each output on:

- European Comic style fidelity
- Linework quality
- Harmonious color quality
- Face quality
- Eye quality
- Hand quality
- Ordered background quality
- Narrative clarity
- Absence of unwanted text/balloons
- Difference from `comic_book`
- Difference from `graphic_novel`
- Absence of author, series, or publisher imitation

## Overfitting Watchlist

Stop or reduce training if:

- The style resembles a recognizable author or series.
- Everything becomes European/classic even when not requested.
- Backgrounds become too detailed and distracting.
- Colors become too flat or dated.
- Lines become too rigid.
- Hands deform.
- Balloons or text appear unrequested.
- The style becomes too close to `comic_book`.
- The style becomes too close to `graphic_novel`.
- Modern commercial appeal drops.

## AXSTUDIO Integration Criteria

Only connect the LoRA after visual validation confirms:

- `ax_european_comic_v1` produces coherent Euro Comic style.
- Lines, palette, and backgrounds are stable.
- Face, eyes, and hands remain readable.
- It does not generate unwanted text or balloons.
- It does not imitate authors, publishers, series, or characters.
- It remains distinct from `comic_book` and `graphic_novel`.
- It works for school, classroom, city, village, adventure, and educational scenes.
- The JSON profile is used through the style prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for video with panel motion, parallax, and light camera movement.

Until then, keep it as a JSON style profile and training plan only.
