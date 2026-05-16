# Portrait Photo Style LoRA Training Plan

Style ID: `portrait_photo`
UI Label: `Portrait Photo`
Trigger token: `ax_portrait_photo_v1`

## Objective

Train a style LoRA dedicated to realistic professional portrait photography.

The LoRA should improve:

- face quality
- eye readability
- natural skin texture
- realistic hair
- natural expressions
- soft portrait lighting
- controlled photographic backgrounds
- commercial portrait composition
- coherence between subject and environment

This is not a character LoRA. It must not learn one face, one identity, or one repeated expression.

## Dataset Requirements

Minimum: 500 images
Recommended: 1200 images
Optimal: 1200-2000 curated images

Distribution:

- 45% portraits, close-ups, and headshots
- 25% half body
- 10% full body
- 10% environment portraits
- 5% multiple subjects
- 5% props and details

Include:

- portraits of diverse subjects
- different ages and skin tones
- different hair types
- natural expressions
- soft studio lighting
- natural outdoor lighting
- neutral or lightly contextual backgrounds
- sharp readable eyes
- clean symmetrical faces
- realistic skin, not plastic
- some images with visible hands

Exclude:

- deformed faces
- asymmetric eyes
- over-smoothed skin
- heavy beauty filters
- over-processed photography
- watermarks, logos, or text
- famous people
- anime, cartoon, 3D, or painting
- duplicates or too many images of the same subject

## Captioning

Every caption must start with:

`ax_portrait_photo_v1`

Recommended structure:

```text
ax_portrait_photo_v1, [subject], [framing], [expression], [face details], [eyes details], [hair], [hands if visible], [outfit], [background], [lighting], professional photographic portrait
```

Good caption:

```text
ax_portrait_photo_v1, cheerful schoolboy portrait, half body framing, smiling expression, sharp readable brown eyes, natural skin texture, realistic tousled hair, blue shirt, backpack straps visible, hands holding backpack straps, soft daylight, blurred school background, professional photographic portrait
```

Bad caption:

```text
realistic boy portrait
```

Rules:

- always describe face and eyes
- describe hair when visible
- identify framing: close-up, headshot, half body
- describe light and background
- mention hands when visible
- avoid protected references, brand names, and photographer names
- avoid cartoon/anime/3D terminology

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
- validate often
- avoid overfitting on faces
- preserve subject diversity
- monitor hands even though the style is portrait-focused
- do not overtrain the text encoder

## Validation Prompts

1. `ax_portrait_photo_v1, cheerful boy portrait, backpack, warm morning light, readable face, sharp readable eyes, natural hair, hands holding backpack straps, friendly school background, professional photographic portrait`
2. `ax_portrait_photo_v1, professional portrait of an adult person, half body, natural expression, sharp eyes, realistic skin texture, soft daylight, blurred urban background, commercial portrait photography`
3. `ax_portrait_photo_v1, clean studio portrait, realistic face, clear eyes, natural skin, soft studio lighting, neutral background, professional photographic portrait`
4. `ax_portrait_photo_v1, outdoor lifestyle portrait, smiling person, natural hair, readable face, soft golden light, realistic clothing texture, clean background blur, commercial photography`

Evaluate:

- portrait style fidelity
- face quality
- eye quality
- skin quality
- hair quality
- expression naturalness
- lighting realism
- background quality
- absence of plastic skin
- absence of repeated identity

## Integration Rule

Do not connect this LoRA to AXSTUDIO until:

- the trigger produces coherent portraits
- faces are clean and natural
- eyes are sharp and symmetric
- skin remains realistic
- the LoRA does not repeat one identity
- `portrait_photo` remains distinguishable from `photorealistic`
