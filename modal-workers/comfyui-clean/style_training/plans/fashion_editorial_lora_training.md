# Fashion Editorial Style LoRA Training Plan

Style ID: `fashion_editorial`
UI Label: `Fashion Editorial`
Trigger token: `ax_fashion_editorial_v1`

## Objective

Train a style LoRA dedicated to high-end fashion editorial and premium lifestyle photography.

The LoRA should improve:

- outfit styling
- natural fashion posing
- magazine-style composition
- editorial lighting
- material quality
- full-body readability
- realistic faces
- correct hands
- premium commercial environments
- campaign-style image quality

This is not a character LoRA. It must not learn one face, imitate brands, imitate magazines, copy fashion campaigns, or generate readable logos.

## Dataset Requirements

Minimum: 500 images
Recommended: 1200 images
Optimal: 1200-2000 curated images

Distribution:

- 20% editorial portraits
- 25% half body
- 30% full body
- 15% environment/editorial scenes
- 5% multiple subjects
- 5% outfit, accessory, and detail shots

Include:

- diverse outfits
- diverse subjects
- natural fashion poses
- full-body images with readable outfits
- modern urban environments
- clean architectural environments
- warm light, soft studio light, and premium natural light
- visible materials: fabrics, shoes, backpacks, accessories, surfaces
- visible and correct hands in a meaningful share of the dataset
- realistic faces without excessive retouching

Exclude:

- visible brand logos
- recognizable fashion campaigns
- famous people
- watermarks
- protected editorial text/layouts
- compressed or low-quality images
- unnatural extreme poses
- plastic skin
- repetitive outfits
- anime, cartoon, 3D, or painting styles
- bad hands or bad anatomy

## Captioning

Every caption must start with:

`ax_fashion_editorial_v1`

Recommended structure:

```text
ax_fashion_editorial_v1, [subject], [framing], [pose], [outfit], [accessories], [face/hands readability], [environment], [lighting], [materials], premium fashion editorial photography
```

Good caption:

```text
ax_fashion_editorial_v1, cheerful student walking outside a modern school, full body fashion pose, beige overshirt, white t-shirt, dark trousers, clean white sneakers, backpack, readable face, natural hands, warm morning editorial light, modern architecture background, polished pavement reflections, premium magazine-style fashion photography
```

Bad caption:

```text
fashion boy photo
```

Rules:

- always describe outfit and pose
- identify full body, three-quarter, half body, or portrait framing
- describe light and environment
- describe visible materials
- mention hands when visible
- avoid brand names, magazine names, famous photographers, or campaign references
- avoid generic captions
- do not mix cartoon, anime, or 3D language

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
- validate full body and hands frequently
- do not overexpose runway poses
- do not overexpose a single outfit type
- avoid drifting into glamour or adult fashion
- keep the style distinct from `photorealistic` and `portrait_photo`

## Validation Prompts

1. `ax_fashion_editorial_v1, cheerful boy walking to school, backpack, warm morning light, readable face, readable hands, full body, friendly modern school environment, stylish outfit, premium fashion editorial photography`
2. `ax_fashion_editorial_v1, full body fashion editorial photo of a stylish person walking in a clean urban environment, confident pose, polished outfit, warm directional light, realistic clothing textures, magazine-quality photography`
3. `ax_fashion_editorial_v1, half body editorial portrait, stylish outfit, natural expression, sharp eyes, soft premium light, clean architectural background, refined commercial fashion photography`
4. `ax_fashion_editorial_v1, lifestyle fashion campaign scene, model walking outdoors, elegant casual outfit, readable hands, refined color grading, polished environment, premium editorial photography`

Evaluate:

- fashion editorial style fidelity
- outfit readability
- pose quality
- realistic face
- readable eyes
- correct hands
- realistic materials
- editorial lighting
- premium composition
- absence of logos or brands
- difference from `photorealistic`

## Integration Rule

Do not connect this LoRA to AXSTUDIO until:

- `ax_fashion_editorial_v1` produces coherent editorial looks
- outfit and posing are clearly improved
- full-body anatomy and hands remain stable
- no logos or brands appear
- the style remains distinguishable from `photorealistic` and `portrait_photo`
- the style works for images and can later support video with walking, posing, and camera motion
