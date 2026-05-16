# Anime Clean LoRA Training Plan

## Style Target

- ID: `anime_clean`
- UI label: `Anime`
- Trigger token: `ax_anime_clean_v1`
- Type: style LoRA, not character LoRA

Goal: train a clean modern original anime style with defined line art, expressive readable eyes, stylized layered hair, controlled cel shading, vivid but harmonious colors, readable simplified hands, bright environments, and future animation/video compatibility.

This LoRA must not learn a single character, imitate studios, franchises, characters, logos, or brands. It must not become black-and-white manga ink or cinematic anime; this style should remain clean, bright, general-purpose, and commercially usable.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Anime portraits | 25% |
| Half-body scenes | 25% |
| Full-body scenes | 20% |
| Environment scenes | 20% |
| Multiple characters | 5% |
| Props/details | 5% |

Include:

- Original anime characters
- Varied faces, ages, hairstyles, outfits, and environments
- School scenes, slice-of-life scenes, city scenes
- Outdoor campus and classroom scenes
- Bright readable environments
- Readable simplified hands
- Generic casual and school outfits
- Clean cel shading
- Vivid but controlled colors
- Defined line art
- Clear, ordered backgrounds

Exclude:

- Recognizable characters or screenshots from existing anime
- Studio names, franchise names, logos, subtitles, or watermarks
- Black-and-white manga ink
- Too dark or heavily cinematic images
- Oversexualized/ecchi imagery
- Deformed hands
- Strongly asymmetric eyes
- Dirty line art
- Duplicates and near-duplicates
- Mixed western cartoon or 3D styles

## Captioning Guide

Every caption must start with:

```text
ax_anime_clean_v1
```

Recommended caption structure:

```text
ax_anime_clean_v1, [subject], [scene/action], [framing], [face/eyes], [hair], [hands/body], [outfit], [environment], [line art], [shading/colors], clean original anime style
```

Good caption:

```text
ax_anime_clean_v1, cheerful anime schoolboy walking through a bright school campus, full body, backpack on shoulders, large expressive blue eyes, stylized layered brown hair, clean defined line art, readable simplified hands holding backpack straps, beige casual shirt, soft cel shading, vivid blue sky, green trees, harmonious bright colors, polished original anime style
```

Bad caption:

```text
anime boy at school
```

Why it is bad:

- Missing trigger token
- Does not describe eyes, hair, hands, line work, shading, or palette
- Does not distinguish `anime_clean` from `anime_cinematic`
- Too generic for controllable LoRA training

Captioning rules:

- Always describe eyes and hair when visible.
- Describe line art and cel shading.
- Mention hands and full body when present.
- Describe environment and palette.
- Avoid brands, studios, franchises, characters, and copyrighted references.
- Do not mix `manga_ink` or `anime_cinematic` terms unless intentionally comparing validation output.
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

- Check eyes and hands at every validation interval.
- Avoid overfitting to schoolboy/schoolgirl subjects.
- Preserve variety across hair, outfit, age, and environment.
- Do not let the style become too cinematic.
- Do not let the style collapse into western cartoon.
- Keep line art stable and cel shading clean.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_anime_clean_v1, cheerful anime boy walking to school, backpack, warm morning light, readable face, expressive eyes, readable hands, full body, friendly school environment, clean defined line art, bright harmonious colors
```

```text
ax_anime_clean_v1, anime student sitting in a bright classroom, readable expressive face, clean hands writing in notebook, soft cel shading, clear background detail, polished modern anime look
```

```text
ax_anime_clean_v1, anime character walking through a quiet city street, natural posture, readable hands, vivid sky, clean line art, harmonious colors, slice of life atmosphere
```

```text
ax_anime_clean_v1, two anime students talking outside school, expressive faces, readable hands, bright school campus, soft daylight, clean cel shading, original anime style
```

Score each output on:

- Anime clean style fidelity
- Line art quality
- Eye quality
- Hair quality
- Hand quality
- Proportion consistency
- Cel shading cleanliness
- Environment quality
- Palette harmony
- Absence of studio/character imitation
- Difference from `anime_cinematic`

## Overfitting Watchlist

Stop or reduce training if:

- The same face repeats.
- The same eye design appears in every character.
- Hairstyles become too similar.
- All scenes become school scenes.
- Hands become incorrectly simplified.
- Colors become too saturated.
- The look resembles a recognizable studio or character family.
- The style becomes too cinematic.
- Environment variety collapses.

## AXSTUDIO Integration Criteria

Only connect the LoRA after visual validation confirms:

- `ax_anime_clean_v1` produces coherent clean anime.
- Line art and cel shading are stable.
- Eyes, hands, and hair remain readable.
- It does not imitate characters, franchises, or studios.
- It remains distinct from `anime_cinematic` and `manga_ink`.
- The JSON profile is used through the style prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for future video with line-art consistency, cel-shading consistency, and character motion.

Until then, keep it as a JSON style profile and training plan only.
