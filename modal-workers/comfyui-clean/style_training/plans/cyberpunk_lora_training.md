# Cyberpunk LoRA Training Plan

## Style Target

- ID: `cyberpunk`
- UI label: `Cyberpunk`
- Trigger token: `ax_cyberpunk_v1`
- Type: style LoRA, not character LoRA

Goal: train an original cyberpunk style for futuristic dense cities, neon, rain, wet reflections, techwear characters, holograms, abstract signage, advanced technology, and urban sci-fi night atmosphere. The style must be worldbuilding-oriented, technological, cinematic, and distinct from generic neon `music_video` looks.

This LoRA must not learn a single character, imitate films, games, franchises, studios, brands, companies, logos, characters, or protected IP. It must not generate readable text, logos, or trademarks in holograms. It must not become overly clean `sci_fi_future` or generic club/performance neon.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Cyberpunk portraits | 15% |
| Half-body characters | 20% |
| Full-body characters | 20% |
| Environment megacity scenes | 30% |
| Multiple characters | 5% |
| Props/details/interfaces | 10% |

Include:

- Futuristic night cities, rainy streets, rooftops, alleys, tech markets, transit scenes
- Magenta, cyan, blue, and violet neon with controlled exposure
- Wet pavement, reflective asphalt, rain haze, glass, chrome, synthetic fabric, LED panels
- Abstract holograms without readable brand text
- Original techwear students, travelers, and future citizens
- Generic futuristic vehicles and transparent holographic interfaces
- Visible hands on devices, interfaces, umbrellas, backpacks, or props
- Readable faces under neon and 16:9 / 9:16 compositions

Exclude:

- Recognizable sci-fi franchises, characters, fan art, logos, brands, companies, films, and games
- Readable text, trademarks, or brand-like marks inside holograms
- Club or music video scenes with no worldbuilding
- Overly clean utopian sci-fi environments
- Gore, explicit content, oversexualized outfits, deformed hands, unreadable faces
- Burned-out neon, chaotic unreadable cities, duplicate and near-duplicate images

## Captioning Guide

Every caption must start with:

```text
ax_cyberpunk_v1
```

Recommended caption structure:

```text
ax_cyberpunk_v1, [subject], [cyberpunk action/scene], [framing], [face/eyes/hands], [techwear/outfit], [urban environment], [neon/holograms], [rain/reflections], [technology/mood], original cyberpunk futuristic city style
```

Good caption:

```text
ax_cyberpunk_v1, young student walking through a rainy futuristic academy district at night, full body cyberpunk scene, readable face lit by cyan and magenta neon, dark wet hair with rim light, hands holding backpack straps, black techwear jacket, glowing backpack detail, dense vertical megacity, holographic signs with abstract symbols, flying vehicles, wet reflective pavement, rain haze, deep shadows, high contrast neon sci-fi atmosphere
```

Bad caption:

```text
cyberpunk boy in city
```

Why it is bad:

- Missing trigger token
- Does not describe neon, rain, techwear, holograms, or materials
- Does not distinguish `cyberpunk` from `music_video`
- Does not control logo/text or sci-fi imitation risks

Captioning rules:

- Always describe neon, rain or wet reflections, technology, and urban environment.
- Describe techwear outfit, face, and hands when visible.
- Use abstract symbols for holograms, not readable real text or logos.
- Specify neon city street, rainy alley, futuristic academy, hologram district, cyber market, night transit, tech interface, or megacity skyline.
- Avoid film, game, franchise, brand, company, character, and protected IP names.
- Keep separation from `music_video` and `sci_fi_future`.
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

- Validate face and hands under strong neon light.
- Check no readable logos, text, trademarks, or brand-like marks appear in holograms.
- Avoid overfitting to the same magenta/cyan palette.
- Preserve variety across alleys, skyline, interfaces, academy, market, rooftop, and street scenes.
- Keep compositions readable despite dense detail.
- Confirm neon is vivid but not overexposed.
- Validate 16:9, 21:9, 9:16, and 1:1 outputs for video, posters, and social.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_cyberpunk_v1, cheerful boy walking to school reimagined in a futuristic neon academy district, backpack, readable face, readable hands, full body, rainy night city, wet reflective pavement, cyan and magenta neon, holographic signs with abstract symbols, cinematic cyberpunk atmosphere
```

```text
ax_cyberpunk_v1, young person walking through a rainy neon alley, techwear jacket, readable face and hands, holographic glow, wet asphalt reflections, dense futuristic city background, high contrast cyberpunk lighting
```

```text
ax_cyberpunk_v1, futuristic megacity skyline at night, vertical towers, holographic billboards with abstract symbols, flying vehicles, rain haze, magenta and cyan neon reflections, cinematic sci-fi atmosphere
```

```text
ax_cyberpunk_v1, student using a transparent holographic interface in a neon-lit room, readable face, hands interacting with glowing UI, dark techwear, blue and pink light, futuristic cyberpunk environment
```

Score each output on:

- Cyberpunk style fidelity
- Neon quality
- Rain and wet reflection quality
- Futuristic city quality
- Technology and hologram quality
- Face quality
- Hand quality
- Composition readability
- Absence of logos or readable text
- Difference from `music_video`
- Difference from `sci_fi_future`
- Absence of IP or franchise imitation

## Overfitting Watchlist

Stop or reduce training if:

- Every image becomes the same night city.
- Neon is always identical magenta/cyan or becomes overexposed.
- Holograms generate readable text, logos, or brand-like marks.
- Faces are too dark and hands are neglected.
- Scenes become too chaotic to read.
- The style drifts into `music_video` club/performance aesthetics.
- The style drifts into clean bright `sci_fi_future`.
- Outputs resemble known sci-fi franchises.
- Rain appears excessively even when not requested.

## AXSTUDIO Integration Notes

Only connect the LoRA after visual validation confirms:

- `ax_cyberpunk_v1` produces coherent cyberpunk.
- Neon, rain, technology, and city language are stable.
- Faces and hands remain readable.
- It does not generate readable logos, brands, or text.
- It does not imitate films, games, franchises, brands, companies, or characters.
- It remains distinct from `music_video` and `sci_fi_future`.
- It works for city street, alley, skyline, academy, hologram interface, tech market, and rooftop prompts.
- The JSON style profile is available through the AXSTUDIO prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for video with urban camera movement, rain motion, neon flicker, parallax, and hologram animation.

Until then, keep it as a JSON style profile and training plan only.
