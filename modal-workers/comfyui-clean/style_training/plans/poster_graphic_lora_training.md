# Poster Graphic LoRA Training Plan

## Style Target

- ID: `poster_graphic`
- UI label: `Poster Graphic`
- Trigger token: `ax_poster_graphic_v1`
- Type: style LoRA, not character LoRA

Goal: train an original high-impact graphic poster style for key visuals, campaigns, covers, events, culture, education, sport, music, cinema, social graphics, and promotional video. The style must emphasize strong silhouettes, bold visual hierarchy, limited high-contrast palettes, dynamic composition, geometric shapes, subtle print texture, and memorable immediate messaging.

This LoRA must not learn one subject, imitate campaigns, posters, artists, brands, festivals, films, characters, or protected IP. It must not generate logos, trademarks, long text, or uncontrolled slogans. It must remain distinct from UI-focused `vector_flat` and photographic `commercial_ad`.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Portraits/poster faces | 10% |
| Half-body poster subjects | 20% |
| Full-body poster subjects | 20% |
| Environment/key visual scenes | 20% |
| Multiple characters | 5% |
| Props/typography/layout/details | 25% |

Include:

- Original graphic posters and key visuals
- Generic education, event, sport, music, cultural, social, and campaign visuals
- Original cover graphics and poster-like layouts
- Strong silhouettes, diagonal compositions, geometric forms
- Limited palettes, high contrast, paper grain, screenprint texture
- Controlled generic typography only when needed
- Subjects with readable faces and hands when present

Exclude:

- Real movie posters, campaigns, festivals, artists, brands, slogans, logos, famous characters, and fan art
- Long text, proprietary type layouts, real event names
- Overly photographic images, pure flat UI vector, chaotic layouts
- Deformed hands, crowded compositions, duplicate images, noisy palettes

## Captioning Guide

Every caption must start with:

```text
ax_poster_graphic_v1
```

Recommended caption structure:

```text
ax_poster_graphic_v1, [subject], [poster purpose/message], [framing], [silhouette/pose], [face/hands], [graphic environment], [palette], [composition], [print texture], original high-impact graphic poster style
```

Good caption:

```text
ax_poster_graphic_v1, student with backpack facing a futuristic school city, bold education campaign poster, strong side profile silhouette, readable face, simplified hand holding backpack strap, navy jacket and orange backpack, large sun circle, geometric city shapes, diagonal composition, limited navy orange cream palette, high contrast graphic shadows, subtle paper grain, screenprint texture, memorable poster key visual about learning and future
```

Bad caption:

```text
poster boy future
```

Why it is bad:

- Missing trigger token
- Does not describe silhouette, palette, composition, or texture
- Does not distinguish `poster_graphic` from `vector_flat`
- Does not control risk of wrong text or logos

Captioning rules:

- Always describe silhouette, palette, and composition.
- Describe print texture when present.
- Specify education poster, event poster, music poster, sports poster, campaign poster, social key visual, or cover graphic.
- Avoid brand, festival, film, campaign, artist, character, and protected IP names.
- Do not force typography unless requested.
- Avoid long text and uncontrolled slogans.
- Keep separation from `vector_flat` and `commercial_ad`.

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

- Validate that text is not generated unless requested.
- Confirm no logos, brand marks, slogans, or real campaign references appear.
- Check silhouette strength and poster readability at thumbnail size.
- Avoid overfitting to one palette or one diagonal composition.
- Preserve variety across education, sport, music, event, social, campaign, and cover prompts.
- Check faces and hands when subjects are present.
- Validate portrait poster ratios as well as square/social and 16:9 motion formats.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_poster_graphic_v1, cheerful boy walking to school, backpack, readable face, readable hands, full body, bold education poster composition, limited navy orange cream palette, strong silhouette, geometric school environment, screenprint texture, high contrast graphic design
```

```text
ax_poster_graphic_v1, education campaign poster about learning and future, student with backpack, strong silhouette, geometric sun, simplified futuristic school, limited colors, bold visual hierarchy, subtle paper grain
```

```text
ax_poster_graphic_v1, modern event poster graphic with musician silhouette and abstract stage lights, strong contrast, limited red black cream palette, dynamic diagonal shapes, screenprint texture
```

```text
ax_poster_graphic_v1, runner silhouette in dynamic motion, bold diagonal composition, limited orange navy cream palette, high contrast graphic shadows, motivational poster style, subtle print texture
```

Score each output on:

- Poster Graphic style fidelity
- Silhouette strength
- Composition quality
- Visual impact
- Limited palette coherence
- Print texture quality
- Face and hand readability
- Absence of unwanted text or logos
- Difference from `vector_flat`
- Difference from `commercial_ad`
- Key visual quality

## Overfitting Watchlist

Stop or reduce training if:

- The model generates wrong or unwanted text.
- Logos or unwanted symbols appear.
- Every image uses the same layout.
- Palette is always navy/orange.
- Subjects become too simplified or expressionless.
- Compositions become too aggressive.
- The style drifts into minimal `vector_flat`.
- The style drifts into photographic `commercial_ad`.
- Outputs imitate known posters, campaigns, or artists.

## AXSTUDIO Integration Notes

Only connect the LoRA after visual validation confirms:

- `ax_poster_graphic_v1` produces coherent poster/key visual outputs.
- Silhouette, palette, and composition are stable.
- It does not generate logos or unwanted text.
- It remains distinct from `vector_flat` and `commercial_ad`.
- It works for education, sport, music, event, social, campaign, and cover prompts.
- The JSON style profile is available through the AXSTUDIO prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for video/motion graphics with shape transitions, kinetic poster animation, texture motion, and camera push.

Until then, keep it as a JSON style profile and training plan only.
