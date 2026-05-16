# Mascot Cartoon LoRA Training Plan

## Style Target

- ID: `mascot_cartoon`
- UI label: `Mascot`
- Trigger token: `ax_mascot_cartoon_v1`
- Type: style LoRA, not character LoRA

Goal: train an original commercial mascot cartoon style for iconic, friendly, memorable characters usable across brand identity, apps, web, games, advertising, social, merchandise, stickers, and animation/video.

This LoRA must not learn a specific mascot, imitate famous mascots, franchises, characters, sports teams, logos, brands, or generate letters/logos/symbols on outfits unless explicitly requested.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Mascot portraits | 20% |
| Half-body mascot | 20% |
| Full-body mascot | 35% |
| Environment scenes | 10% |
| Multiple mascots | 5% |
| Props/details | 10% |

Include:

- Original animal mascots
- Original human/stylized mascots
- App icon poses
- Thumbs-up, waving, running, and product-holding poses
- Educational, app/web, game, advertising, sticker, and merchandise mascots
- Readable hands/paws
- Bright harmonious brand-friendly colors
- Strong silhouettes
- Simple backgrounds
- Clean lines
- Rounded memorable forms

Exclude:

- Famous mascots or franchise characters
- Real logos, sports teams, brands, registered letters, or symbols
- Characters too close to existing IP
- Anime/manga and photorealistic images
- 3D renders unless part of a later dedicated style
- Deformed hands/paws
- Duplicates and near-duplicates
- Outfits with marks or logos

## Captioning Guide

Every caption must start with:

```text
ax_mascot_cartoon_v1
```

Recommended caption structure:

```text
ax_mascot_cartoon_v1, [mascot type], [commercial use/pose], [body shape], [face/eyes], [hands/paws], [outfit/accessories], [colors], [environment], [line art/shading], original brand mascot cartoon style
```

Good caption:

```text
ax_mascot_cartoon_v1, original friendly dog mascot walking to school, full body icon pose, rounded compact body, large expressive eyes, big smiling face, simplified paws with thumbs-up gesture, blue cap, blue hoodie, yellow backpack, bold clean outlines, bright brand-friendly blue and yellow palette, cheerful school background, polished commercial mascot cartoon design
```

Bad caption:

```text
cute dog mascot
```

Why it is bad:

- Missing trigger token
- Does not describe silhouette, pose, colors, hands/paws, or commercial use
- Does not distinguish `mascot_cartoon` from `clean_cartoon`
- Does not help prevent similarity to existing mascots

Captioning rules:

- Always describe mascot type and pose.
- Describe silhouette and forms.
- Describe hands/paws clearly.
- Describe brand-friendly palette.
- Specify use: app, brand, game, sticker, merchandise, or advertising.
- Avoid mascot, brand, franchise, team, logo, and character references.
- Do not generate letters, symbols, or logos unless explicitly requested.
- Keep separation from `clean_cartoon` and `chibi_kawaii`.

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

- Validate silhouette and small-size readability.
- Check hands/paws.
- Avoid overfitting to a single animal.
- Avoid overfitting to thumbs-up poses.
- Reject generated logos, letters, or outfit symbols.
- Preserve variety across mascot type, colors, commercial uses, and poses.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_mascot_cartoon_v1, original friendly dog mascot walking to school, backpack, warm morning light, readable face, large expressive eyes, readable paws, full body, cheerful school environment, bold clean outlines, bright brand-friendly colors
```

```text
ax_mascot_cartoon_v1, original friendly mascot character in app icon pose, strong silhouette, big smile, large readable eyes, waving hand, simple clean background, bright brand-friendly colors, polished mascot cartoon design
```

```text
ax_mascot_cartoon_v1, cheerful mascot holding a generic product box, readable paws, friendly expression, rounded shapes, bold outlines, clean commercial background, advertising mascot style
```

```text
ax_mascot_cartoon_v1, energetic animal mascot running in a colorful game-like environment, full body, strong silhouette, expressive face, readable paws, bright colors, clean cartoon outlines
```

Score each output on:

- Mascot cartoon style fidelity
- Silhouette strength
- Face readability
- Eye quality
- Hand/paw quality
- Character memorability
- Commercial simplicity
- Brand-friendly palette
- Absence of unwanted letters/logos
- Absence of known mascot imitation
- Difference from `clean_cartoon` and `chibi_kawaii`

## Overfitting Watchlist

Stop or reduce training if:

- All mascots become dogs.
- The same smile repeats.
- Every pose is thumbs-up.
- Letters/logos appear on caps or shirts.
- Designs resemble known mascots.
- Silhouettes become weak.
- Characters become too complex.
- Hands/paws deform.
- Colors are always blue/yellow.
- The style loses versatility across app, game, advertising, and merchandise uses.

## AXSTUDIO Integration Criteria

Only connect the LoRA after visual validation confirms:

- `ax_mascot_cartoon_v1` produces coherent commercial mascots.
- Silhouette, face, hands/paws are readable.
- It does not generate logos, letters, or marks unless requested.
- It does not imitate existing mascots.
- It remains distinct from `clean_cartoon` and `chibi_kawaii`.
- It works for app icon, advertising, game, sticker, and merchandise.
- The JSON profile is used through the style prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for future mascot animation/video with loops, walking, waving, and mascot motion.

Until then, keep it as a JSON style profile and training plan only.
