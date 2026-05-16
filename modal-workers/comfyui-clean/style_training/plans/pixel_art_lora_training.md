# Pixel Art LoRA Training Plan

## Style Target

- ID: `pixel_art`
- UI label: `Pixel Art`
- Trigger token: `ax_pixel_art_v1`
- Type: style LoRA, not character LoRA

Goal: train an original retro pixel art style focused on coherent pixel grid, crisp hard-edged pixels, limited palette, no anti-aliasing, readable sprite design, tile-based environments, retro UI, icon/item assets, full-body characters, and frame-by-frame animation compatibility.

This LoRA must not learn a single character, imitate videogames, consoles, franchises, brands, characters, or protected IP. It must not generate copied sprites, become `vector_flat`, become `low_poly_3d`, or degrade into generic low-resolution digital painting. It must remain intentional, crisp, clean, retro, readable, and original.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Pixel portraits | 10% |
| Half-body sprites | 10% |
| Full-body sprites | 25% |
| Environment/game scenes | 25% |
| Multiple characters | 5% |
| Props/UI/icons/details | 25% |

Include:

- Original pixel characters and full-body sprites
- Walk cycle frames and simple frame-by-frame animation references
- Tile-based environments, pixel school scenes, pixel cities, platform scenes, and generic RPG-like scenes
- Retro UI, hearts, inventory, books, backpacks, generic icons, item sets, and educational pixel scenes
- Limited palettes, crisp pixel edges, controlled dithering, no anti-aliasing, coherent pixel scale

Exclude:

- Existing game sprites, famous characters, recognizable franchises, real game UI, logos, or brands
- Images that are merely low-resolution but not intentional pixel art
- Heavy anti-aliasing, smooth gradients, inconsistent pixel grids, blurry pixels
- Overly detailed or unreadable assets, 3D low poly, vector flat, non-pixel anime/cartoon imagery
- Duplicate images and copied sprite sheets

## Captioning Guide

Every caption must start with:

```text
ax_pixel_art_v1
```

Recommended caption structure:

```text
ax_pixel_art_v1, [subject], [scene/action], [sprite/framing type], [face/hands readability], [outfit/props], [environment/UI], [palette], [pixel technique], original retro pixel art style
```

Good caption:

```text
ax_pixel_art_v1, cheerful pixel art schoolboy walking toward a futuristic school campus, full body 16-bit sprite style, orange backpack, teal hoodie, readable small pixel face, simple pixel eyes, small blocky hands, tile-based school path, clean futuristic buildings, blue sky, limited teal orange navy palette, crisp pixel grid, hard-edged pixels, simple pixel shading, retro videogame scene
```

Bad caption:

```text
pixel boy at school
```

Why it is bad:

- Missing trigger token
- Does not describe palette, grid, pixel size, or tile-based environment
- Does not distinguish `pixel_art` from `vector_flat`
- Does not help avoid sprites similar to existing games

Captioning rules:

- Always describe pixel grid and limited palette.
- Specify 8-bit, 16-bit, sprite sheet, game scene, retro UI, icon set, platform scene, RPG scene, or educational pixel art when relevant.
- Describe face and hands in a way proportional to pixel scale.
- Mention crisp pixels, hard-edged pixels, no anti-aliasing, tile-based environment, dithering, and coherent pixel size when present.
- Avoid videogame, console, franchise, brand, character, and protected IP names.
- Keep separation from `vector_flat` and `low_poly_3d`.
- Avoid overly short captions.

## Training Checklist

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

Checklist:

- Validate pixel grid and pixel size at every checkpoint.
- Confirm outputs are intentional pixel art, not generic low-res renders.
- Check for crisp hard edges, limited palette, and no smooth gradients.
- Check readable sprites, small faces, and simplified hands.
- Preserve variety across UI, sprites, environments, icons, posters, game scenes, and educational assets.
- Avoid copied sprite language, real game UI, or franchise similarity.
- Confirm the style remains 2D pixel art, not vector flat or pseudo-3D low poly.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_pixel_art_v1, cheerful pixel art boy walking to school, backpack, readable small face, readable blocky hands, full body, friendly school environment, crisp pixel grid, limited color palette, 16-bit retro videogame style
```

```text
ax_pixel_art_v1, retro game UI screen for a school adventure, character portrait, hearts, inventory icons, books and backpack, crisp pixels, limited palette, clean pixel interface
```

```text
ax_pixel_art_v1, pixel art futuristic school campus, tile-based path, trees, clean buildings, flying vehicle, blue sky, limited palette, hard-edged pixels, retro game environment
```

```text
ax_pixel_art_v1, small pixel art sprite sheet of a student walking, four frame walk cycle, backpack, readable silhouette, limited palette, crisp pixel grid, no anti-aliasing
```

Score each output on:

- Pixel art style fidelity
- Pixel grid coherence
- Sprite readability
- Limited palette quality
- Absence of anti-aliasing
- Tile-based environment quality
- UI/icon quality
- Face and hand readability
- Difference from `vector_flat`
- Difference from `low_poly_3d`
- Absence of game, franchise, or IP imitation

## Overfitting Watchlist

Stop or reduce training if:

- Pixel size becomes inconsistent.
- Images look merely low-res instead of true pixel art.
- Sprites become too similar to famous games.
- Palette is always identical or too limited to read.
- Faces and hands become unreadable.
- Environments are always platform scenes.
- UI resembles existing game interfaces.
- Anti-aliasing or smooth gradients appear.
- Outputs drift toward `vector_flat` or `low_poly_3d`.

## AXSTUDIO Integration Notes

Only connect the LoRA after visual validation confirms:

- `ax_pixel_art_v1` produces coherent pixel art.
- Grid, palette, and pixel size are stable.
- Outputs do not look like accidental low-resolution images.
- Sprites, icons, UI, and environments are readable.
- It does not imitate games, characters, franchises, brands, or protected IP.
- It remains distinct from `vector_flat` and `low_poly_3d`.
- It works for sprites, UI, icon sets, school scenes, game scenes, posters, and tile environments.
- The JSON style profile is available through the AXSTUDIO prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for video with frame-by-frame animation, sprite motion, and tile-based parallax.

Until then, keep it as a JSON style profile and training plan only.
