# Cinematic Anime LoRA Training Plan

## Style Target

- ID: `anime_cinematic`
- UI label: `Cinematic Anime`
- Trigger token: `ax_anime_cinematic_v1`
- Type: style LoRA, not character LoRA

Goal: train an original cinematic anime style with emotional depth, dramatic lighting, rich atmospheric color, clean line art, controlled cel shading, readable eyes, readable hands, immersive environments, and future animated video compatibility.

This LoRA must not learn a single character, imitate studios, franchises, films, directors, characters, logos, or brands. It must stay distinct from `anime_clean`: richer light, stronger mood, deeper atmosphere, and more filmic composition.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Cinematic anime portraits | 20% |
| Half-body scenes | 25% |
| Full-body scenes | 20% |
| Environment scenes | 25% |
| Multiple characters | 5% |
| Props/details | 5% |

Include:

- Original anime characters
- Sunset scenes and classroom window-light scenes
- Emotionally atmospheric school scenes
- City sunset and night scenes
- Immersive landscapes
- Light action with cinematic effects
- Emotional close-ups
- Full-body scenes with environment
- Readable hands
- Clean line art
- Rich cel shading
- Deep soft shadows
- Rim light and backlight
- Rich but controlled palettes

Exclude:

- Screenshots from existing anime
- Recognizable characters, studios, franchises, logos, subtitles, or watermarks
- Images that are too dark/horror
- Overly fantasy scenes unless the prompt needs fantasy
- Black-and-white manga
- Flat/simple anime
- Deformed hands or asymmetric eyes
- Near-duplicate sunset school scenes
- Western cartoon or 3D styles

## Captioning Guide

Every caption must start with:

```text
ax_anime_cinematic_v1
```

Recommended caption structure:

```text
ax_anime_cinematic_v1, [subject], [scene/action], [framing], [emotion/face/eyes], [hair], [hands/body], [outfit], [environment], [cinematic lighting], [shadows/color palette], [line art/cel shading], original cinematic anime style
```

Good caption:

```text
ax_anime_cinematic_v1, anime schoolboy walking through a school campus at sunset, half body cinematic frame, emotional readable face, large reflective brown eyes, stylized dark layered hair with warm rim light, hands holding backpack straps, beige shirt and navy backpack, glowing orange sky, tree shadows, students in background, dramatic golden hour lighting, deep soft shadows, rich atmospheric colors, clean anime line art, cinematic cel shading, original animated film look
```

Bad caption:

```text
cinematic anime boy at sunset
```

Why it is bad:

- Missing trigger token
- Does not describe eyes, hands, hair, line art, or shading
- Does not separate subject, environment, and light
- Too generic and risks drifting toward branded or generic cinematic anime prompts

Captioning rules:

- Always describe cinematic light and atmosphere.
- Describe eyes, hair, and hands when visible.
- Mention line art and cel shading.
- Describe environment and palette.
- Avoid studios, works, characters, directors, franchises, and brands.
- Avoid overly generic captions.
- Distinguish from `anime_clean` with mood, light, and filmic composition.
- Prevent unwanted fantasy drift on slice-of-life prompts.

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

- Validate light and palette often.
- Check eyes, hands, and line art every validation.
- Avoid overfitting to sunset.
- Avoid overfitting to school scenes.
- Preserve environment and subject variety.
- Keep separation from `anime_clean` and `epic_fantasy`.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_anime_cinematic_v1, cheerful anime boy walking to school, backpack, warm cinematic sunset light, readable face, emotional eyes, readable hands, full body, friendly school environment, dramatic sky, rich atmospheric colors, clean anime line art
```

```text
ax_anime_cinematic_v1, anime student sitting in a classroom during golden hour, emotional readable face, clean hands writing in notebook, window rim light, deep soft shadows, cinematic cel shading, immersive atmosphere
```

```text
ax_anime_cinematic_v1, anime character standing on a city rooftop at sunset, wind in hair, emotional gaze, readable hands, glowing skyline, rich orange and violet sky, cinematic animated film look
```

```text
ax_anime_cinematic_v1, two anime students talking outside school at sunset, expressive faces, readable hands, dramatic backlight, atmospheric school campus, rich cinematic anime colors
```

Score each output on:

- Cinematic anime style fidelity
- Line art quality
- Eye quality
- Hair quality
- Hand quality
- Cel shading quality
- Cinematic light quality
- Atmosphere quality
- Palette richness
- Environment depth
- Difference from `anime_clean`
- Absence of studio/character imitation

## Overfitting Watchlist

Stop or reduce training if:

- Every scene becomes a school sunset.
- The palette is always orange/violet.
- Faces become too similar.
- Eyes become too glossy or extreme.
- Backgrounds become too complex and steal focus.
- Hands degrade.
- The look resembles a known studio or film.
- Simple daily scenes disappear.
- It drifts into `epic_fantasy` or `dark_fantasy`.
- Images become too dark.

## AXSTUDIO Integration Criteria

Only connect the LoRA after visual validation confirms:

- `ax_anime_cinematic_v1` produces coherent cinematic anime.
- Line art and cel shading are stable.
- Eyes, hair, and hands remain readable.
- It does not imitate studios, works, or characters.
- It remains distinct from `anime_clean` and `manga_ink`.
- It does not always force sunset or fantasy.
- The JSON profile is used through the style prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for future video with camera motion, lighting continuity, and anime continuity.

Until then, keep it as a JSON style profile and training plan only.
