# Cinematic Realism Style LoRA Training Plan

Style ID: `cinematic_realism`
UI Label: `Cinematic Realism`
Trigger token: `ax_cinematic_realism_v1`

## Objective

Train a style LoRA dedicated to realistic cinematic photography.

The LoRA should improve:

- realistic cinematic light
- narrative composition
- film-still atmosphere
- filmic color grading
- readable faces even in shadows
- coherent hands and body
- realistic environments with depth
- visual storytelling
- future video consistency
- distinction from plain photorealism

This is not a character LoRA. It must not imitate films, directors, studios, franchises, or brands.

## Dataset Requirements

Minimum: 500 images
Recommended: 1200 images
Optimal: 1200-2000 curated images

Distribution:

- 20% cinematic portraits
- 25% half body scenes
- 20% full body scenes
- 25% environment/story scenes
- 5% multiple characters
- 5% props and details

Include:

- realistic scenes with cinematic look
- interiors with window light
- golden-hour exteriors
- realistic urban scenes
- school, home, work, and street scenes
- subjects in natural actions
- readable faces and hands
- practical lights, lamps, windows, motivated natural light
- controlled warm/cool color grading
- horizontal and vertical compositions
- environments with spatial depth
- video-friendly scenes with room for movement

Exclude:

- posters with overlaid text
- frames that are too dark
- unreadable faces
- logos and brands
- recognizable films or franchises
- fantasy/sci-fi scenes when targeting pure realism
- excessive HDR
- extreme lens flare
- flat stock-photo lighting
- cartoon, anime, 3D, render, or painting
- bad hands or anatomy
- duplicate images

## Captioning

Every caption must start with:

`ax_cinematic_realism_v1`

Recommended structure:

```text
ax_cinematic_realism_v1, [subject], [action/scene], [framing], [face/hands readability], [environment], [motivated lighting], [mood], [color grading], realistic cinematic photography
```

Good caption:

```text
ax_cinematic_realism_v1, cheerful boy relaxing in a warm interior, half body cinematic scene, readable expressive face, natural hands holding a mug, soft window light, practical lamp in background, warm highlights, controlled shadows, realistic living room environment, film-grade color grading, realistic cinematic photography
```

Bad caption:

```text
cinematic boy photo
```

Rules:

- always describe light and mood
- identify film still, cinematic scene, or visual storytelling language
- describe environment and composition
- mention face and hands when visible
- describe color grading without citing films or directors
- avoid brands, franchises, and protected references
- avoid generic captions

## Training Parameters

Initial safe parameters:

- resolution: 1024
- network rank: 16-32
- alpha: 16-32
- optimizer: AdamW8bit
- scheduler: cosine or constant_with_warmup
- unet learning rate: 1e-4
- text encoder learning rate: 0 or 5e-6
- validation every: 200-500 steps
- total target steps: 3000-7000

Guidance:

- train conservatively
- validate bright and dark scenes often
- preserve face and hand readability
- avoid always pushing heavy shadows
- keep distinction from `photorealistic` and `dramatic_film`
- test 16:9 and 9:16 for video/social compatibility

## Validation Prompts

1. `ax_cinematic_realism_v1, cheerful boy walking to school, backpack, warm morning light, readable face, readable hands, full body, friendly school environment, realistic cinematic photography, film-grade color grading`
2. `ax_cinematic_realism_v1, young person sitting near a window in a warm interior, readable expressive face, natural hands, soft window light, practical lamp in background, emotional cinematic realism`
3. `ax_cinematic_realism_v1, realistic person walking through a quiet city street at sunrise, cinematic composition, warm highlights, cool shadows, natural posture, film still look`
4. `ax_cinematic_realism_v1, two students talking outside school in morning light, readable faces and hands, realistic environment, emotional filmic atmosphere, cinematic realism`

Evaluate:

- cinematic realism style fidelity
- light quality
- color grading quality
- face readability
- hand readability
- environment realism
- scene depth
- filmic composition
- subject naturalness
- absence of text/logos
- difference from `photorealistic`

## Integration Rule

Do not connect this LoRA to AXSTUDIO until:

- `ax_cinematic_realism_v1` produces coherent filmic looks
- it works on interiors, exteriors, school, city, and home scenes
- faces and hands remain readable
- it does not add text or poster elements
- it remains realistic
- it is distinguishable from `photorealistic` and `dramatic_film`
- it is ready for future video generation with camera motion and coherent lighting
