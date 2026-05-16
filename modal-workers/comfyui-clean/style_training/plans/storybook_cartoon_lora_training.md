# Storybook Cartoon LoRA Training Plan

## Style Target

- ID: `storybook_cartoon`
- UI label: `Story Cartoon`
- Trigger token: `ax_storybook_cartoon_v1`
- Type: style LoRA, not character LoRA

Goal: train an original narrative storybook cartoon style with warm positive storytelling, gentle characters, soft rounded forms, rich but readable environments, harmonious warm colors, readable faces and hands, and future narrative animation/video compatibility.

This LoRA must not learn a single character, imitate books, franchises, studios, mascots, logos, brands, or protected characters. It must remain distinct from `clean_cartoon` by being more narrative and environmental, and distinct from `mascot_cartoon` by not forcing an iconic brand mascot.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Character portraits | 15% |
| Half-body narrative scenes | 20% |
| Full-body narrative scenes | 25% |
| Environment/story scenes | 30% |
| Multiple characters | 5% |
| Props/details | 5% |

Include:

- Educational scenes and school scenes
- Classroom and reading scenes
- Children or original characters walking, reading, exploring, talking
- Generic villages and fairytale paths
- Cozy home environments
- Forests, hills, schools, libraries, bedrooms
- Original characters only
- Readable hands
- Warm harmonious colors
- Rich but clean backgrounds
- Soft positive light
- Narrative cartoon illustration

Exclude:

- Famous characters, franchises, mascots, logos, brands, or recognizable book art
- Screenshots from cartoons or existing books
- Anime, chibi, manga, 3D render, photorealism
- Overly chaotic backgrounds
- Dark/horror scenes
- Deformed hands
- Too realistic or too vector-flat styles
- Duplicates and near-duplicates

## Captioning Guide

Every caption must start with:

```text
ax_storybook_cartoon_v1
```

Recommended caption structure:

```text
ax_storybook_cartoon_v1, [subject], [story action], [framing], [face/eyes], [hands/body], [outfit/props], [storybook environment], [lighting], [colors/shading], original storybook cartoon style
```

Good caption:

```text
ax_storybook_cartoon_v1, cheerful cartoon boy walking to school through a warm storybook village path, full body narrative scene, backpack on shoulders, kind expressive face, large warm eyes, simple readable hands holding backpack straps, beige shirt, blue backpack, flowers along the path, cozy school in background, soft golden daylight, rounded trees, warm harmonious colors, gentle storybook shading, positive educational cartoon atmosphere
```

Bad caption:

```text
story cartoon boy
```

Why it is bad:

- Missing trigger token
- Does not describe narrative action, environment, light, or palette
- Does not distinguish `storybook_cartoon` from `clean_cartoon`
- Does not control the fairytale/narrative level of the style

Captioning rules:

- Always describe narrative action and environment.
- Mention face, eyes, and hands when visible.
- Describe light and palette.
- Specify educational story, fairytale path, school story, cozy home story, family story, or adventure story.
- Avoid brands, franchises, mascots, existing book characters, and known works.
- Avoid overly short captions.
- Keep separation from `clean_cartoon` and `mascot_cartoon`.

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

- Validate environment-heavy scenes.
- Ensure backgrounds do not overwhelm the subject.
- Check hands and faces.
- Avoid overfitting to villages, forests, and castles.
- Avoid drift into mascot or chibi.
- Preserve variety across school, home, village, forest, classroom, and educational settings.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_storybook_cartoon_v1, cheerful cartoon boy walking to school, backpack, warm morning light, readable face, large warm eyes, readable hands, full body, friendly storybook school environment, soft rounded shapes, warm harmonious colors
```

```text
ax_storybook_cartoon_v1, teacher reading a book to children in a cozy classroom, expressive faces, readable hands, warm soft light, colorful educational storybook cartoon atmosphere
```

```text
ax_storybook_cartoon_v1, child walking on a sunny village path toward a distant school, backpack, flowers, rounded trees, gentle expression, warm colors, soft storybook cartoon illustration
```

```text
ax_storybook_cartoon_v1, child reading a book in a cozy room with a small pet, warm lamp light, soft rounded furniture, readable hands, gentle positive storytelling atmosphere
```

Score each output on:

- Storybook cartoon style fidelity
- Narrative clarity
- Face quality
- Eye quality
- Hand quality
- Warm palette quality
- Environment quality
- Background readability
- Difference from `clean_cartoon`
- Difference from `mascot_cartoon`
- Absence of IP/character imitation

## Overfitting Watchlist

Stop or reduce training if:

- Every scene becomes a castle/fairytale scene.
- All environments are forests or villages.
- Characters become too mascot-like.
- The style becomes too infantile.
- Backgrounds become too detailed and confusing.
- Hands degrade.
- Palette is always yellow/orange.
- School or modern scenes stop working.
- It starts resembling known books or characters.

## AXSTUDIO Integration Criteria

Only connect the LoRA after visual validation confirms:

- `ax_storybook_cartoon_v1` produces coherent narrative cartoon scenes.
- Face, eyes, and hands remain readable.
- Environments are rich but not chaotic.
- It remains distinct from `clean_cartoon` and `mascot_cartoon`.
- It does not imitate franchises, books, or known characters.
- It works across school, classroom, home, village, forest, and educational scenes.
- The JSON profile is used through the style prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for future animation/video with gentle camera movement and soft storytelling.

Until then, keep it as a JSON style profile and training plan only.
