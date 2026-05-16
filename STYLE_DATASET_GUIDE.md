# AXSTUDIO Style Dataset Guide

## General Dataset Rules

Each style LoRA needs a clean dataset that teaches visual language, not copyrighted characters.

Include:

- portraits with clear eyes
- medium shots with hands
- full-body poses
- one or two subject scenes
- interior and exterior backgrounds
- props and vehicles when relevant
- multiple lighting conditions
- multiple palettes

Exclude:

- logos and readable brand marks
- named characters or franchise assets
- screenshots with UI overlays
- low-resolution compressed images
- images where the style is ambiguous
- repeated near-duplicates

## Captioning Rules

Good captions separate content from style:

Good:

`axstyle_cartoon, young explorer driving a small red convertible, three-quarter front view, expressive rounded face, clean medium outline, bright warm palette, simple countryside road, clear hands on steering wheel`

Bad:

`cartoon, cool image, disney pixar car, beautiful, masterpiece`

Good:

`axstyle_anime, close-up portrait of a confident young woman, symmetrical eyes, short brown hair, clean cel shading, soft painted background, controlled blue and cream palette`

Bad:

`anime girl best quality cute`

## Per-Style Dataset Focus

| Style | Include | Exclude |
|---|---|---|
| Anime | clean eyes, cel shadows, painted backgrounds | photoreal skin pores, franchise characters |
| Manga / Comic Ink | ink linework, screen tones, hatching | painterly color, muddy grayscale |
| Cartoon occidentale | rounded shapes, simplified hands, bright palettes | gritty realism, complex skin texture |
| Family 3D Animation | polished CGI, soft lighting, appealing forms | named studio characters, uncanny realism |
| Stylized 3D | clean geometry, readable materials | bad topology, noisy render |
| Fumetto europeo | contour ink, flat color, detailed environments | manga screen-tone dominance |
| Storybook Illustration | paper texture, warm palettes, charming staging | horror lighting, hard realism |
| Cel Shading | hard shadow planes, clean flat colors | photo gradients, uncontrolled shadows |
| Fantasy Illustration | designed costumes, props, atmospheric depth | generic fantasy clutter |
| Semi-realistic Stylization | believable anatomy, painterly realism | raw photography, plastic skin |

## Common Failure Prevention

Eyes:

- include close-ups with both eyes visible
- caption eye shape and symmetry
- reject datasets with smeared pupils

Hands:

- include hand poses holding objects
- caption finger visibility
- reject malformed hand examples

Hair:

- include clear hair mass and silhouette
- caption hair shape, not only color

Lighting:

- caption key light direction
- keep shadow logic consistent

Contamination:

- never mix anime, cartoon, 3D, and comic examples in the same LoRA dataset
- one LoRA should teach one family of visual language
