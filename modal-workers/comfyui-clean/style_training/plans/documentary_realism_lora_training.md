# Documentary Realism LoRA Training Plan

## Style Target

- ID: `documentary_realism`
- UI label: `Documentary`
- Trigger token: `ax_documentary_realism_v1`
- Type: style LoRA, not character LoRA

Goal: train an authentic documentary and observational reportage style with natural available light, real environments, candid posture, human-centered storytelling, readable faces, readable hands, and future documentary video compatibility.

This LoRA must not learn a single identity, imitate photographers, agencies, publications, documentary brands, or add text, poster layouts, logos, or infographics. It must remain realistic, observed, and human, without becoming too commercial, too fashion/editorial, or too cinematic-polished.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Environmental portraits | 20% |
| Half-body candid scenes | 20% |
| Full-body candid scenes | 20% |
| Environment/story scenes | 30% |
| Multiple characters | 5% |
| Props/details | 5% |

Include:

- Real school scenes
- Street scenes and city life
- Markets and community spaces
- Urban and rural environments
- Public transport
- Everyday work
- Natural family life
- Subjects in real actions
- Available light: daylight, overcast, window light, street light
- Readable faces
- Hands visible in everyday actions
- Observed compositions, not overly staged
- Environments that tell a story

Exclude:

- Fashion editorial
- Commercial advertising
- Product photography
- Glossy studio portraits
- Overly dramatic cinematic frames
- Posters with text
- Logos, brands, celebrities, agencies, or recognizable publications
- Cartoon, anime, 3D render, painting, comic, or illustration styles
- Too noisy or unreadable images
- Deformed faces or hands
- Too many identical street or school scenes

## Captioning Guide

Every caption must start with:

```text
ax_documentary_realism_v1
```

Recommended caption structure:

```text
ax_documentary_realism_v1, [subject], [real-life action], [framing], [face/hands readability], [environment/context], [available lighting], [mood], [documentary/reportage cues], authentic documentary realism
```

Good caption:

```text
ax_documentary_realism_v1, schoolboy walking through a real school courtyard, full body candid documentary scene, backpack on shoulders, readable face, hands holding backpack straps, other students in background, natural daylight through trees, realistic school building, honest neutral colors, observational reportage photography
```

Bad caption:

```text
documentary boy at school
```

Why it is bad:

- Missing trigger token
- Does not describe light, context, face, hands, or mood
- Does not distinguish `documentary_realism` from `photorealistic`
- Does not explain the observational/reportage nature of the scene

Captioning rules:

- Always describe the real context.
- Mention available light.
- Specify whether the scene is candid, reportage, observational, real-life, street, school, work, community, or travel documentary.
- Describe face and hands when visible.
- Avoid advertising, fashion, glamour, or overly polished cinematic terms.
- Do not cite photographers, publications, agencies, documentaries, or brands.
- Do not force text or layouts.
- Preserve authenticity and naturalness.

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

- Validate interiors, exteriors, city, school, community, work, and travel scenes.
- Avoid making the style flat, gray, or visually low quality.
- Maintain honest realism without becoming advertising.
- Keep clear separation from `photorealistic` and `cinematic_realism`.
- Reject generated documentary titles, lower thirds, poster text, or layouts.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_documentary_realism_v1, cheerful boy walking to school with backpack, natural morning light, readable face, readable hands, full body, real school courtyard, other students in background, authentic observational documentary photography
```

```text
ax_documentary_realism_v1, person walking through a busy city street, candid posture, natural available light, realistic environment, human-centered reportage photography
```

```text
ax_documentary_realism_v1, people talking in a local community space, readable faces and hands, natural gestures, available light, honest documentary realism
```

```text
ax_documentary_realism_v1, student standing outside school entrance, backpack, readable face, hands visible, natural expression, real school environment, neutral documentary color palette
```

Score each output on:

- Documentary style fidelity
- Scene authenticity
- Available light realism
- Face quality
- Hand quality
- Environment realism
- Observational composition
- Absence of advertising look
- Absence of fashion/editorial look
- Absence of text/logos
- Reportage video compatibility

## Overfitting Watchlist

Stop or reduce training if:

- Everything becomes gray or flat.
- Everything becomes urban reportage.
- All subjects look serious or sad.
- Visual quality drops too far in the name of authenticity.
- Scenes become noisy or unreadable.
- Hands degrade because they are too rarely visible.
- The look collapses into `photorealistic`.
- The look collapses into `cinematic_realism`.
- Documentary text, titles, or layouts appear.
- Commercial appeal is completely lost.

## AXSTUDIO Integration Criteria

Only connect the LoRA after visual validation confirms:

- `ax_documentary_realism_v1` produces authentic observed scenes.
- It works across school, street, home, community, work, and travel.
- Face and hands remain readable.
- It does not look like advertising.
- It does not look fashion/editorial.
- It does not add text or layouts.
- The JSON profile is used through the style prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for future documentary video with handheld camera feel, natural movement, and observational pacing.

Until then, keep it as a JSON style profile and training plan only.
