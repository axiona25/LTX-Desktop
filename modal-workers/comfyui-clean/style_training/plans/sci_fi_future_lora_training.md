# Sci-Fi Future LoRA Training Plan

## Style Target

- ID: `sci_fi_future`
- UI label: `Sci-Fi Future`
- Trigger token: `ax_sci_fi_future_v1`
- Type: style LoRA, not character LoRA

Goal: train an original clean futuristic sci-fi style for bright advanced cities, sustainable megastructures, high-tech architecture, flying vehicles, orbital stations, spaceports, holographic interfaces, polished materials, and an aspirational mood of progress. The style must stay ordered, luminous, coherent, and distinct from rainy neon `cyberpunk`.

This LoRA must not learn a single character, imitate films, games, franchises, studios, companies, brands, characters, or protected IP. It must not generate readable logos, trademarks, or text in panels and interfaces. It must not become dark cyberpunk, generic multi-genre `concept_art`, or sterile corporate rendering.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Sci-fi portraits | 10% |
| Half-body characters | 15% |
| Full-body characters | 20% |
| Environment/future city scenes | 35% |
| Multiple characters | 5% |
| Props/details/vehicles/interfaces | 15% |

Include:

- Clean futuristic cities and sustainable megacities
- Advanced academy environments, orbital stations, spaceports, transit hubs, clean laboratories, high-tech interiors
- Flying vehicles, futuristic trains, sky bridges, holographic interfaces without readable logos
- Functional futuristic outfits and smart backpacks
- Glass, polished metal, white composite panels, blue light accents, transparent displays
- Bright daylight, soft blue glow, open skies, optimistic atmosphere
- Readable faces and hands, clean cinematic compositions

Exclude:

- Cyberpunk rainy neon alleys, dark dystopian grime, and chaotic night cities
- Real logos, readable brand signs, trademarks, text-heavy panels
- Known sci-fi franchises, famous characters, fan art, films, and games
- Fantasy, castles, fairytale elements, gore, explicit content
- Broken hands or faces, chaotic technology, overly sterile corporate renders
- Duplicate and near-duplicate images

## Captioning Guide

Every caption must start with:

```text
ax_sci_fi_future_v1
```

Recommended caption structure:

```text
ax_sci_fi_future_v1, [subject], [future action/scene], [framing], [face/eyes/hands], [futuristic outfit/props], [advanced environment], [architecture/vehicles], [technology/materials], [lighting/mood], original clean futuristic sci-fi style
```

Good caption:

```text
ax_sci_fi_future_v1, young student standing on a sky bridge overlooking a clean futuristic academy city, full body sci-fi scene, readable calm face, hands holding a smart backpack strap, dark functional jacket with subtle blue light accents, sleek glass towers, elevated transit rails, flying vehicles, white composite architecture, bright daylight, soft clouds, polished metal and glass materials, optimistic high-tech future atmosphere
```

Bad caption:

```text
sci-fi boy in future city
```

Why it is bad:

- Missing trigger token
- Does not describe architecture, materials, light, or technology
- Does not distinguish `sci_fi_future` from `cyberpunk`
- Does not help avoid logos, text, or incoherent design

Captioning rules:

- Always describe architecture, materials, technology, and light.
- Mention face and hands when visible.
- Use holographic interface or abstract UI, not real text or logos.
- Specify future city, orbital station, spaceport, advanced academy, transit hub, clean laboratory, or high-tech interior.
- Avoid film, game, franchise, studio, brand, company, character, and protected IP names.
- Keep separation from `cyberpunk` and `concept_art`.
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

- Validate future city, interior, vehicle, station, and character prompts separately.
- Check no readable logos, brand marks, or text appear in panels or interfaces.
- Avoid overfitting to identical white/blue city scenes.
- Preserve variety across cities, space, interiors, transit, academy, labs, and vehicles.
- Check hands and faces in character prompts.
- Confirm technology looks functional and coherent.
- Validate 16:9, 21:9, 9:16, and 1:1 outputs for video, presentation, and poster workflows.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_sci_fi_future_v1, cheerful boy walking to school reimagined in a clean futuristic academy city, backpack, readable face, readable hands, full body, bright daylight, sleek glass buildings, flying vehicles, elevated transit rails, optimistic sci-fi future atmosphere
```

```text
ax_sci_fi_future_v1, young student standing on a sky bridge overlooking a bright futuristic city, functional jacket, smart backpack, readable hands, glass towers, flying vehicles, clean blue technology accents, cinematic sci-fi future style
```

```text
ax_sci_fi_future_v1, clean orbital station interior with large window showing Earth, student explorer in foreground, readable face and hands, white composite panels, holographic interface, soft blue light, optimistic sci-fi atmosphere
```

```text
ax_sci_fi_future_v1, sleek futuristic transit station with elevated train and flying vehicles, clean architecture, bright daylight, polished metal and glass, people walking naturally, cinematic future city design
```

Score each output on:

- Sci-Fi Future style fidelity
- Futuristic architecture quality
- Technology quality
- Vehicle quality
- Material quality
- Lighting quality
- Face quality
- Hand quality
- Environment order and readability
- Absence of logos or readable text
- Difference from `cyberpunk`
- Difference from `concept_art`
- Absence of IP or franchise imitation

## Overfitting Watchlist

Stop or reduce training if:

- Every scene becomes the same white/blue city.
- The style becomes too sterile or corporate.
- Vehicles repeat too much.
- Interfaces generate text or logos.
- The style drifts toward rainy neon `cyberpunk`.
- The style drifts into generic `concept_art`.
- Technology becomes incoherent or decorative.
- Characters, hands, and faces are neglected in favor of environments.
- Architectural detail becomes too dense to read.

## AXSTUDIO Integration Notes

Only connect the LoRA after visual validation confirms:

- `ax_sci_fi_future_v1` produces coherent clean future sci-fi.
- Architecture, vehicles, materials, and technology are stable.
- Faces and hands remain readable.
- It does not generate logos, brands, trademarks, or readable text.
- It does not imitate films, games, franchises, studios, brands, companies, or characters.
- It remains distinct from `cyberpunk` and `concept_art`.
- It works for future city, academy, orbital station, spaceport, transit hub, lab, and high-tech interior prompts.
- The JSON style profile is available through the AXSTUDIO prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for video with futuristic camera movement, moving vehicles, holograms, and environmental parallax.

Until then, keep it as a JSON style profile and training plan only.
