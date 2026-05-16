# Lifestyle Photo Style LoRA Training Plan

Style ID: `lifestyle_photo`
UI Label: `Lifestyle Photo`
Trigger token: `ax_lifestyle_photo_v1`

## Objective

Train a style LoRA dedicated to natural commercial lifestyle photography.

The LoRA should improve:

- realistic everyday scenes
- natural relaxed subjects
- credible interaction with environments and objects
- soft natural light
- warm authentic atmosphere
- realistic materials
- readable hands during common actions
- subject-environment relationship
- commercial quality without looking overly staged

This is not a character LoRA. It must not learn one face, become fashion editorial, become product photography, or produce only home interiors.

## Dataset Requirements

Minimum: 500 images
Recommended: 1200 images
Optimal: 1200-2000 curated images

Distribution:

- 15% lifestyle portraits
- 25% half body
- 20% full body
- 25% environment scenes
- 10% multiple characters
- 5% props and details

Include:

- home scenes
- school scenes
- work/office scenes
- outdoor urban scenes
- park and leisure scenes
- diverse subjects by age and appearance
- realistic everyday activities
- people walking, reading, drinking, talking, working, studying
- visible hands interacting with objects
- natural window light
- clean but lived-in environments
- realistic materials: fabric, wood, ceramic, paper, plants, glass, sofas, floors

Exclude:

- overly fashion-like posing
- product-only photos
- studio catalog photos
- chaotic or dirty environments
- visible logos and trademarks
- watermarks
- famous people
- anime, cartoon, 3D, or painting
- deformed faces or hands
- plastic skin
- duplicate images
- too many similar sofa or kitchen scenes

## Captioning

Every caption must start with:

`ax_lifestyle_photo_v1`

Recommended structure:

```text
ax_lifestyle_photo_v1, [subject], [everyday action], [framing], [pose/body language], [face/hands readability], [objects/props], [environment], [lighting], [materials], natural commercial lifestyle photography
```

Good caption:

```text
ax_lifestyle_photo_v1, cheerful boy relaxing on a beige sofa, half body lifestyle scene, holding a ceramic mug, readable face, readable hands, casual beige shirt and dark trousers, cozy modern living room, books and plants nearby, warm natural window light, soft realistic fabric texture, authentic commercial lifestyle photography
```

Bad caption:

```text
boy on couch lifestyle
```

Rules:

- always describe everyday action and environment
- identify objects the subject interacts with
- mention hands and face when visible
- describe light and materials
- avoid fashion editorial language unless relevant
- avoid brands, logos, and protected references
- keep captions concrete but not excessively long

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
- validate indoor and outdoor scenes frequently
- do not overexpose living rooms or kitchens
- check hands in object interaction scenes
- preserve variety across ages, environments, and actions
- keep the style distinct from `fashion_editorial` and `product_photo`

## Validation Prompts

1. `ax_lifestyle_photo_v1, cheerful boy relaxing on a sofa, holding a mug, warm morning light, readable face, readable hands, cozy modern living room, friendly environment, natural commercial lifestyle photography`
2. `ax_lifestyle_photo_v1, cheerful boy walking to school with backpack, warm morning light, readable face, readable hands, full body, friendly school environment, natural candid lifestyle photography`
3. `ax_lifestyle_photo_v1, family preparing breakfast in a bright kitchen, natural gestures, readable faces and hands, warm daylight, cozy home environment, authentic commercial lifestyle photo`
4. `ax_lifestyle_photo_v1, young person walking through a clean city street with casual outfit, relaxed posture, natural expression, soft daylight, realistic urban lifestyle photography`

Evaluate:

- lifestyle photo style fidelity
- naturalness of the scene
- face quality
- hand quality
- environment realism
- lighting coherence
- material quality
- absence of excessive fashion posing
- absence of product-only framing
- environment/action diversity

## Integration Rule

Do not connect this LoRA to AXSTUDIO until:

- `ax_lifestyle_photo_v1` produces natural everyday scenes
- it works across home, school, work, city, and outdoor contexts
- hands and faces remain readable
- it does not look like `fashion_editorial`
- it does not look like `product_photo`
- it stays commercial but authentic
- the style can extend to video with natural motion and soft camera movement
