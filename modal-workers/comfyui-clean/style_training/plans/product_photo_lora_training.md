# Product Photo Style LoRA Training Plan

Style ID: `product_photo`
UI Label: `Product Photo`
Trigger token: `ax_product_photo_v1`

## Objective

Train a style LoRA dedicated to premium commercial product photography.

The LoRA should improve:

- product composition
- visual cleanliness
- product hierarchy
- realistic materials
- readable packaging
- controlled reflections
- realistic shadows
- commercial surfaces
- coherent props
- e-commerce and advertising quality

This is not a product-specific LoRA. It must not learn a single product, produce brands/logos/trademarks, or turn every product into cosmetics.

## Dataset Requirements

Minimum: 500 images
Recommended: 1200 images
Optimal: 1200-2000 curated images

Distribution:

- 70% product, props, and details
- 20% environment/product scenes
- 5% half body lifestyle usage
- 5% full body lifestyle usage
- 0% pure portraits
- 0% multiple characters as primary focus

Include:

- generic cosmetics without brands
- generic packaging
- generic tech products
- lifestyle accessories
- food and beverage packaging
- home/design objects
- surfaces: marble, wood, glass, paper, fabric, metal, ceramic
- softbox studio lighting
- natural window light
- controlled reflections
- realistic contact shadows
- non-protected minimalist labels
- coherent, non-distracting props
- square, vertical, and horizontal compositions

Exclude:

- real logos
- trademarks
- recognizable packaging
- watermarks
- long or deformed text
- broken product geometry
- impossible reflections
- dirty or random backgrounds
- noisy images
- clearly non-photographic 3D renders
- duplicate images
- overrepresentation of cosmetics

## Captioning

Every caption must start with:

`ax_product_photo_v1`

Recommended structure:

```text
ax_product_photo_v1, [product type], [packaging/material], [composition], [surface], [props], [lighting], [reflections/shadows], [texture details], premium commercial product photography
```

Good caption:

```text
ax_product_photo_v1, amber glass cosmetic serum bottle with cream paper box, centered tabletop product composition, readable minimalist label, marble surface, beige ceramic vase, green botanical props, soft natural window light, controlled reflections, realistic glass and paper textures, premium commercial product photography
```

Bad caption:

```text
nice product photo
```

Rules:

- always describe the product
- describe packaging and materials
- identify composition and surface
- describe light and shadows
- mention reflections if present
- describe props only when useful
- avoid brands and logos
- avoid generic captions
- avoid complex text that the model cannot control

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
- validate many product categories
- avoid overfitting to cosmetics
- avoid overfitting to marble/stone surfaces
- check product geometry
- check reflection and shadow plausibility
- check label readability without expecting complex text

## Validation Prompts

1. `ax_product_photo_v1, amber glass cosmetic serum bottle with cream paper box, centered product composition, readable minimalist label, marble surface, green botanical props, soft natural window light, premium commercial product photography`
2. `ax_product_photo_v1, premium wireless headphones on clean matte surface, realistic plastic and metal materials, soft studio lighting, controlled reflections, minimal background, commercial product photography`
3. `ax_product_photo_v1, premium coffee packaging standing on wooden tabletop, clean paper bag texture, ceramic cup, soft morning light, realistic shadows, elegant commercial product photo`
4. `ax_product_photo_v1, realistic hands holding a premium reusable water bottle, clean lifestyle product shot, readable product shape, soft daylight, natural fabric background, commercial advertising photography`

Evaluate:

- product photo style fidelity
- product hierarchy
- material quality
- packaging quality
- realistic reflections
- realistic shadows
- clean composition
- absence of logos/brands
- absence of severe text deformation
- versatility across product categories

## Integration Rule

Do not connect this LoRA to AXSTUDIO until:

- `ax_product_photo_v1` produces coherent product shots
- it works on cosmetics, tech, food packaging, and lifestyle objects
- the product remains the focal point
- no recognizable logos or brands appear
- materials are realistic
- geometry and reflections are credible
- the style remains distinguishable from `commercial_ad`
