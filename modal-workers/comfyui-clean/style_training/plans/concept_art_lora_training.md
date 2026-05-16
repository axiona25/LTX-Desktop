# Concept Art LoRA Training Plan

## Style Target

- ID: `concept_art`
- UI label: `Concept Art`
- Trigger token: `ax_concept_art_v1`
- Type: style LoRA, not character LoRA

Goal: train an original professional concept art style for pre-production, worldbuilding, environment design, character design, prop design, key art, mood painting, and color scripts. The style must emphasize strong silhouettes, cinematic lighting, atmospheric depth, painterly digital brushwork, readable design intent, selective detail, and production-ready visual direction.

This LoRA must not learn a single character, imitate artists, studios, games, films, franchises, brands, or protected IP. It must not become only `epic_fantasy`, only `sci_fi_future`, or clean `editorial_illustration`. It must remain project-oriented concept art: useful for designing worlds, characters, props, vehicles, and moods before final production.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Portrait/head concepts | 10% |
| Half-body character concepts | 15% |
| Full-body character concepts | 20% |
| Environment/worldbuilding scenes | 35% |
| Multiple characters | 5% |
| Props/details/vehicles/design sheets | 15% |

Include:

- Environment concept art
- Character concept art
- Prop and vehicle design
- Generic fantasy and sci-fi worldbuilding
- Educational or school reinterpretations
- Key art, mood paintings, and color scripts
- Silhouette studies and design sheets
- Readable hands and faces when characters are present
- Cinematic lighting, strong value structure, atmospheric depth
- Selective detail and painterly digital brushwork

Exclude:

- Recognizable IP, franchises, games, films, artists, studios, fan art, logos, and brands
- Decorative images with no design function
- Confused compositions or random detail noise
- Images where every character is tiny and unreadable
- Pure photorealistic photos, anime, manga, cartoon, and pure 3D renders
- Deformed hands, broken faces, duplicate or near-duplicate images

## Captioning Guide

Every caption must start with:

```text
ax_concept_art_v1
```

Recommended caption structure:

```text
ax_concept_art_v1, [subject/design focus], [scene/function], [framing], [silhouette/forms], [face/hands if visible], [outfit/props], [environment/worldbuilding], [lighting/value structure], [materials/brushwork], original professional concept art style
```

Good caption:

```text
ax_concept_art_v1, young student explorer standing on a ridge overlooking a vast academy city, full body environment concept art, readable semi-realistic face, hands holding backpack straps, layered travel jacket, strong character silhouette, enormous castle-like school complex in the distance, river valley, floating platforms, atmospheric clouds, dramatic directional sunset light, muted blue and ochre palette, rich painterly brushwork, clear value structure, immersive worldbuilding design
```

Bad caption:

```text
concept art boy with castle
```

Why it is bad:

- Missing trigger token
- Does not describe design function, silhouette, light, or worldbuilding
- Does not distinguish `concept_art` from `epic_fantasy`
- Does not help the LoRA produce useful pre-production images

Captioning rules:

- Always describe the design function and worldbuilding goal.
- Describe silhouette, value structure, light, atmosphere, materials, and scale.
- Mention face and hands when visible.
- Specify environment concept, character concept, prop concept, vehicle concept, key art, mood painting, color script, or design sheet.
- Avoid names of artists, studios, games, films, franchises, brands, and protected IP.
- Keep separation from `epic_fantasy`, `sci_fi_future`, and `editorial_illustration`.
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

- Validate environment and character prompts separately.
- Check silhouette and value readability at thumbnail size.
- Confirm worldbuilding is specific and usable, not just decorative.
- Avoid overexposure to castles, fantasy landscapes, sci-fi tech, or mechs.
- Preserve variety across environments, characters, props, vehicles, and moods.
- Check face and hands in every character validation.
- Confirm 16:9, 21:9, 1:1, and 9:16 outputs for key art and video workflows.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_concept_art_v1, cheerful boy walking to school, backpack, warm morning light, readable face, readable hands, full body, friendly school environment reimagined as cinematic concept art, strong silhouettes, painterly textures, atmospheric depth
```

```text
ax_concept_art_v1, student explorer overlooking a vast academy city in the mountains, backpack, strong silhouette, dramatic sky, readable hands, cinematic lighting, immersive worldbuilding environment concept art
```

```text
ax_concept_art_v1, young student adventurer character design, full body, backpack, readable face and hands, functional outfit, painterly digital brushwork, clear silhouette, production concept art style
```

```text
ax_concept_art_v1, concept art sheet of school exploration props and environment details, backpack, books, lantern, architectural fragments, selective detail, painterly texture, cohesive worldbuilding design
```

Score each output on:

- Concept Art style fidelity
- Design value and production usefulness
- Silhouette readability
- Value structure
- Environment design quality
- Character design quality
- Face and hand quality
- Lighting quality
- Painterly texture quality
- Worldbuilding clarity
- Difference from `epic_fantasy`
- Difference from `sci_fi_future`
- Absence of IP, franchise, film, game, or artist imitation

## Overfitting Watchlist

Stop or reduce training if:

- Every image becomes a castle, epic landscape, sci-fi city, or mech design.
- Details become chaotic and stop supporting design intent.
- Characters become too small or unreadable.
- Hands are ignored because the dataset is too environment-focused.
- The palette is always gray/ochre.
- The style drifts into `epic_fantasy` without design function.
- The style drifts into `sci_fi_future` by overemphasizing technology.
- Outputs resemble known games, films, studios, or artists.
- Images are attractive but unusable as production design.

## AXSTUDIO Integration Notes

Only connect the LoRA after visual validation confirms:

- `ax_concept_art_v1` produces coherent professional concept art.
- Silhouette, worldbuilding, and value structure are stable.
- Characters, props, vehicles, and environments remain readable.
- It does not imitate IP, artists, films, games, studios, or brands.
- It remains distinct from `epic_fantasy`, `sci_fi_future`, and `editorial_illustration`.
- It works for environment, character, prop, vehicle, key art, mood painting, color script, and design sheet prompts.
- The JSON style profile is available through the AXSTUDIO prompt builder.
- Negative prompt and validation prompts are available.
- The style is ready for video with parallax, camera movement, atmospheric depth continuity, and narrative environment development.

Until then, keep it as a JSON style profile and training plan only.
