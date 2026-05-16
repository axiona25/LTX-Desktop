# Storybook Illustration LoRA Training Plan

## Style Target

- ID: `storybook_illustration`
- UI label: `Storybook`
- Trigger token: `ax_storybook_illustration_v1`
- Type: style LoRA, not character LoRA

Goal: train an original storybook illustration style with soft painterly children-book rendering, gentle characters, warm readable faces, soft paper texture, watercolor-like brush grain, pastel harmonious colors, cozy environments, readable hands, and poetic family-friendly storytelling.

This LoRA must not learn a single character, imitate books, illustrators, publishers, franchises, brands, or existing characters. It must not become `storybook_cartoon`, corporate `editorial_illustration`, pure watercolor technique without story, 3D, or flat vector.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Storybook portraits | 15% |
| Half-body story scenes | 20% |
| Full-body story scenes | 20% |
| Environment/story pages | 30% |
| Multiple characters | 5% |
| Props/details | 10% |

Include:

- Original illustrated book-style images
- Gentle school scenes
- Children or characters reading, walking, exploring, learning
- Cozy environments, gardens, forests, schools, bedrooms, generic villages
- Books, backpacks, lanterns, flowers, gentle animals
- Visible readable hands
- Gentle faces
- Paper texture
- Watercolor-like grain
- Soft brush strokes
- Pastel palette
- Warm soft light
- Page-readable compositions

Exclude:

- Famous characters
- Recognizable books, illustrators, publishers, logos, and brands
- Cartoon screenshots
- Anime, manga, comic book, 3D renders, pure vector-flat images
- Deformed hands, asymmetric eyes, too-heavy texture, chaotic environments
- Duplicates and near-duplicates
- Adult-oriented content

## Captioning Guide

Every caption must start with:

```text
ax_storybook_illustration_v1
```

Recommended caption structure:

```text
ax_storybook_illustration_v1, [subject], [story action], [framing/page type], [face/eyes], [hair], [hands/body], [outfit/props], [storybook environment], [paper texture/brushwork], [pastel palette/lighting], original storybook illustration style
```

Good caption:

```text
ax_storybook_illustration_v1, cheerful boy walking toward a cozy school through a flowered garden path, full body storybook page illustration, gentle smiling face, warm readable eyes, soft brown painterly hair, simplified readable hands holding backpack straps, yellow jacket and blue backpack, old stone school building, flowers and trees, soft morning light, pastel green and blue palette, delicate paper texture, watercolor-like brush grain, poetic family-friendly storytelling atmosphere
```

Bad caption:

```text
storybook boy at school
```

Why it is bad:

- Missing trigger token
- Does not describe paper texture, light, palette, or brushwork
- Does not distinguish `storybook_illustration` from `storybook_cartoon`
- Does not control painterly and poetic rendering

Captioning rules:

- Always describe paper texture and brushwork.
- Describe light, palette, and environment.
- Mention face, eyes, and hands when visible.
- Specify storybook page, bedtime story, educational page, garden path, cozy room, or gentle adventure.
- Avoid illustrators, books, publishers, franchises, and brands.
- Keep separation from `storybook_cartoon`, `editorial_illustration`, and watercolor-only style.
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

- Validate texture, face, and hands every checkpoint.
- Avoid overfitting to villages and castles.
- Avoid paper texture becoming too heavy.
- Keep environments soft but readable.
- Preserve variety across school, home, garden, forest, classroom, and reading scenes.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_storybook_illustration_v1, cheerful boy walking to school, backpack, warm morning light, readable face, warm eyes, readable hands, full body, cozy storybook school environment, pastel colors, paper texture, soft painterly shading
```

```text
ax_storybook_illustration_v1, child reading a book in a cozy room with a small pet, gentle expression, readable hands, warm lamp light, soft paper texture, watercolor-like brush grain, poetic storybook illustration
```

```text
ax_storybook_illustration_v1, child walking along a flowered garden path toward a small school, backpack, soft trees, warm daylight, pastel palette, delicate linework, gentle storybook atmosphere
```

```text
ax_storybook_illustration_v1, teacher reading to children in a warm classroom, expressive gentle faces, readable hands, books and plants, soft pastel colors, paper texture, family-friendly educational storybook page
```

Score each output on:

- Storybook Illustration style fidelity
- Paper texture quality
- Brushwork quality
- Pastel palette quality
- Face quality
- Eye quality
- Hand quality
- Environment readability
- Poetic/narrative tone
- Difference from `storybook_cartoon`
- Difference from watercolor-only style
- Absence of book, illustrator, or IP imitation

## Overfitting Watchlist

Stop or reduce training if:

- Every scene resembles the same book.
- Paper texture becomes too strong.
- Palette becomes too pale.
- Hands become too simplified.
- Environments are always village/castle.
- Characters become too infantile or too similar.
- Style becomes too cartoon.
- Style becomes pure watercolor without story.
- Subject readability drops.
- It imitates known books or illustrators.

## AXSTUDIO Integration Criteria

Only connect the LoRA after visual validation confirms:

- `ax_storybook_illustration_v1` produces coherent storybook illustrations.
- Texture, palette, and light are stable.
- Face, eyes, and hands remain readable.
- It does not imitate books, illustrators, or existing characters.
- It remains distinct from `storybook_cartoon`, `editorial_illustration`, and watercolor-only style.
- It works for school, reading, home, garden, forest, classroom, and educational stories.
- The JSON profile is used through the style prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for lightweight video with parallax, soft motion, and illustrated-page camera movement.

Until then, keep it as a JSON style profile and training plan only.
