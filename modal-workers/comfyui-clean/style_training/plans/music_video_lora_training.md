# Music Video LoRA Training Plan

## Style Target

- ID: `music_video`
- UI label: `Music Video`
- Trigger token: `ax_music_video_v1`
- Type: style LoRA, not character LoRA

Goal: train a modern music-video look with visual energy, neon and stage lighting, readable motion, performance atmosphere, urban night environments, readable faces, readable hands, and future video compatibility.

This LoRA must not learn a single performer, imitate artists, bands, music videos, festivals, venues, brands, logos, album covers, or generate fake artist names or song titles. It must remain music-video oriented and not collapse into pure `cyberpunk`.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Music-video portraits | 15% |
| Half-body performance | 25% |
| Full-body dance/performance | 25% |
| Environment scenes | 20% |
| Multiple characters/dancers | 10% |
| Props/details | 5% |

Include:

- Single performers
- Dancer groups
- Generic microphone performances
- Club scenes
- Generic concert lighting scenes
- Rehearsal studios with colored lights
- Urban night street scenes
- Night drive scenes
- Generic LED panels
- Smoke and haze
- Wet reflective floors
- Neon cyan, magenta, red, blue, and violet
- Modern streetwear, leather, denim, casual premium outfits
- Readable hands during performance and poses
- Readable faces under colored lighting

Exclude:

- Famous artists, bands, albums, covers, venues, festivals, or identifiable stages
- Logos, band names, brand marks, and protected posters
- Generated text or fake artist/title text
- Overly chaotic images
- Heavy motion blur
- Unreadable faces
- Deformed hands and anatomy in dynamic poses
- Extreme neon saturation
- Scenes that read as pure cyberpunk or sci-fi rather than music video
- Explicit or violent content

## Captioning Guide

Every caption must start with:

```text
ax_music_video_v1
```

Recommended caption structure:

```text
ax_music_video_v1, [subject/performer], [action/performance], [framing], [face/hands readability], [outfit], [environment], [colored lighting], [motion/energy], [props], premium modern music video look
```

Good caption:

```text
ax_music_video_v1, young performer standing in a neon-lit club scene, half body music video shot, readable expressive face, colored cyan and magenta rim lights, black leather jacket, hands near pockets, smoke haze, LED lights in background, glossy wet floor reflections, energetic urban night atmosphere, premium modern music video look
```

Bad caption:

```text
cool music video boy neon
```

Why it is bad:

- Missing trigger token
- Does not describe face, hands, outfit, environment, or lighting
- Does not distinguish performance, dance, concert, or night drive
- Does not help control visual chaos from neon-heavy scenes

Captioning rules:

- Always describe energy and lighting.
- Specify whether the scene is performance, dance, concert, night drive, urban promo, or emotional close-up.
- Describe face and hands when visible.
- Describe outfit and environment.
- Mention neon, stage, LED, smoke, haze, and reflections only when visible.
- Avoid real musicians, bands, videos, venues, festivals, and brands.
- Do not force generated text.
- Keep the result distinct from `cyberpunk`.

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

- Validate faces under colored lighting often.
- Check hands in dynamic and dance poses.
- Avoid overfitting to club/neon scenes.
- Keep scene types varied: performance, dance, concert, night drive, urban promo.
- Do not let the look become pure cyberpunk.
- Monitor motion blur carefully.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_music_video_v1, cheerful boy walking to school with backpack, warm morning light mixed with subtle colorful music-video lighting, readable face, readable hands, full body, friendly school environment, dynamic music video composition
```

```text
ax_music_video_v1, young performer holding a microphone on a small stage, readable expressive face, colored rim lights, smoke haze, glossy floor reflections, energetic modern music video look
```

```text
ax_music_video_v1, group of dancers in an urban studio, dynamic body movement, readable faces and hands, neon lights, stage haze, rhythmic cinematic composition
```

```text
ax_music_video_v1, young person sitting in a car at night, neon city lights through windows, reflective glass, emotional expression, cinematic music video atmosphere
```

Score each output on:

- Music-video style fidelity
- Visual energy
- Colored lighting quality
- Face readability
- Hand readability
- Motion quality
- Environment quality
- Difference from `cyberpunk`
- Absence of logos/text
- Video compatibility

## Overfitting Watchlist

Stop or reduce training if:

- Everything becomes a neon club.
- Everything becomes cyberpunk.
- Faces become unreadable.
- Motion blur becomes excessive.
- Hands break in dance poses.
- Cyan/magenta lighting becomes identical in every image.
- Fake artist names, logos, or text appear.
- Saturation becomes excessive.
- Subjects become too similar to each other.

## AXSTUDIO Integration Criteria

Only connect the LoRA after visual validation confirms:

- `ax_music_video_v1` produces a coherent music-video look.
- It works across performance, dance, concert, night drive, and urban scenes.
- Face and hands remain readable.
- It does not generate names, logos, or text unless explicitly requested.
- It remains distinct from `cyberpunk` and `dramatic_film`.
- The JSON profile is used through the style prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for future video generation with camera motion, performance motion, and colored light changes.

Until then, keep it as a JSON style profile and training plan only.
