# Commercial Ad LoRA Training Plan

## Style Target

- ID: `commercial_ad`
- UI label: `Commercial Ad`
- Trigger token: `ax_commercial_ad_v1`
- Type: style LoRA, not brand-specific LoRA

Goal: train a premium commercial advertising look for bright, persuasive, clean, modern images suitable for social ads, brand campaigns, product launches, corporate content, and future promotional video.

This LoRA must not learn brands, logos, slogans, campaigns, celebrities, proprietary layouts, or generate unwanted ad text. It must remain distinct from `product_photo` and `lifestyle_photo`: product photo is product-centered; lifestyle photo is more natural; commercial ad is more polished, persuasive, and benefit-driven.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Commercial portraits | 15% |
| Half-body scenes | 20% |
| Full-body scenes | 20% |
| Environment/ad scenes | 20% |
| Multiple characters | 5% |
| Product/props/details | 20% |

Include:

- Generic advertising visuals with people
- Product-in-use scenes
- Social campaign visuals
- Generic product launch setups
- Premium commercial lifestyle scenes
- Tech lifestyle scenes
- Generic food and beverage advertising
- Corporate/service advertising
- Modern, clean environments
- Bright controlled light
- Compositions with negative space
- Positive, natural expressions
- Correct hands holding products
- Clean realistic materials

Exclude:

- Real logos, trademarks, slogans, and recognizable packaging
- Celebrity or campaign references
- Watermarks
- Long text, protected layouts, or poster copy
- Overly generic stock-photo imagery
- Excessive saturation
- Cartoon, anime, 3D render, painting, comic, or illustration styles
- Deformed hands, faces, products, or product geometry

## Captioning Guide

Every caption must start with:

```text
ax_commercial_ad_v1
```

Recommended caption structure:

```text
ax_commercial_ad_v1, [subject/product/service], [ad scene type], [visual benefit], [framing], [face/hands/product readability], [environment], [lighting], [color mood], [composition/copy space], premium commercial advertising photography
```

Good caption:

```text
ax_commercial_ad_v1, cheerful student walking outside a modern school, half body commercial advertising scene, backpack visible, positive expression, readable face, natural hand holding backpack strap, bright polished morning light, fresh modern school environment, clean negative space for ad copy, harmonious colors, aspirational social campaign photography
```

Bad caption:

```text
nice ad photo
```

Why it is bad:

- Missing trigger token
- Does not describe subject, message, visual benefit, light, or composition
- Does not distinguish `commercial_ad` from `lifestyle_photo`
- Does not teach copy-space or advertising hierarchy

Captioning rules:

- Always describe the visual message or benefit.
- Specify whether the image is a product ad, lifestyle ad, social campaign, tech ad, food ad, corporate ad, or service ad.
- Describe negative space when useful, without forcing generated text.
- Describe light and color mood.
- Identify the main subject or product.
- Avoid brands, logos, slogans, and known campaigns.
- Do not force generated text.
- Keep the style distinct from `product_photo` and `lifestyle_photo`.

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

- Validate people, products, services, and mixed scenes.
- Avoid overfitting to social ad templates.
- Do not allow automatic text or slogan generation.
- Keep the look premium but not artificial.
- Check hands in product-holding scenes.
- Preserve separation from `lifestyle_photo` and `product_photo`.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_commercial_ad_v1, cheerful boy walking to school, backpack, warm morning light, readable face, readable hands, full body, friendly modern school environment, bright positive commercial advertising photography, clean negative space
```

```text
ax_commercial_ad_v1, person using wireless earbuds in a bright modern room, positive expression, clean product visibility, soft commercial lighting, aspirational tech lifestyle advertising photo
```

```text
ax_commercial_ad_v1, fresh breakfast drink on a clean kitchen table with fruit and soft morning light, bright commercial food advertising photography, polished composition, realistic materials
```

```text
ax_commercial_ad_v1, friendly professional standing in a bright modern office, confident natural pose, readable face and hands, clean background, premium corporate advertising photography
```

Score each output on:

- Commercial ad style fidelity
- Message clarity
- Composition quality
- Advertising light quality
- Subject/product readability
- Negative space
- Face quality
- Hand quality
- Absence of logos/brands
- Absence of unwanted text
- Difference from `product_photo` and `lifestyle_photo`

## Overfitting Watchlist

Stop or reduce training if:

- All outputs look like the same social template.
- Unwanted text or slogans appear.
- Invented logos or marks appear.
- Subjects feel like cheap stock photos.
- Smiles become artificial and repetitive.
- Colors become too saturated.
- The look collapses into `lifestyle_photo`.
- The look collapses into `product_photo`.
- Hands degrade when holding products.

## AXSTUDIO Integration Criteria

Only connect the LoRA after visual validation confirms:

- `ax_commercial_ad_v1` generates coherent premium ad images.
- It works with people, products, services, and mixed scenes.
- It does not generate brands, logos, slogans, or unwanted text.
- It keeps clean persuasive composition.
- It remains distinct from `lifestyle_photo` and `product_photo`.
- The JSON profile is used through the style prompt builder.
- Negative prompt and validation prompts are available.
- It is suitable for future commercial video generation with camera motion and readable subject/product.

Until then, keep it as a JSON style profile and training plan only.
