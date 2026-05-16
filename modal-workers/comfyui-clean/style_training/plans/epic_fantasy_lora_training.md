# Epic Fantasy LoRA Training Plan

## Style Target

- ID: `epic_fantasy`
- UI label: `Epic Fantasy`
- Trigger token: `ax_epic_fantasy_v1`
- Type: style LoRA, not character LoRA

Goal: train an original cinematic epic fantasy style for monumental kingdoms, heroes, castles, legendary creatures, magic, dramatic skies, painterly fantasy textures, and large-scale storytelling. The style must feel mature, grand, heroic, and cinematic while keeping subjects, faces, hands, silhouettes, magic, and environments readable.

This LoRA must not learn a single character, imitate films, games, novels, authors, franchises, brands, or protected IP. It must not become sweet `fairytale_3d`, generic `concept_art`, or dark fantasy/horror when not requested. It must remain original epic fantasy illustration with legendary scale and narrative clarity.

## Dataset Plan

Recommended size:

- Minimum: 500 curated images
- Recommended: 1200 curated images
- Optimal: 1200-2000 curated images

Distribution:

| Slice | Target |
| --- | ---: |
| Fantasy portraits | 10% |
| Half-body heroes | 15% |
| Full-body heroes | 25% |
| Environment/kingdom scenes | 35% |
| Multiple characters | 5% |
| Props/details | 10% |

Include:

- Original heroes and fantasy travelers
- Castles, kingdoms, citadels, mountains, valleys, ancient bridges, throne halls
- Original dragons and legendary creatures
- Non-gore battle scenes, magic rituals, banners, armor, cloaks, staffs, swords, ancient props
- Monumental environments with readable scale
- Readable hands and faces in character images
- Dramatic light, stormy skies, golden rim light, magical glow
- Painterly fantasy textures and 16:9 / 21:9 compositions

Exclude:

- Recognizable fantasy franchises, characters, fan art, logos, brands, films, games, novels, and authors
- Recognizable creatures from existing IP
- Gore, graphic violence, horror-heavy images, adult-oriented content, and oversexualized armor
- Cute fairytale imagery, toy/clay 3D, anime, manga, pure photorealism
- Deformed hands, broken faces, chaotic environments, duplicates and near-duplicates

## Captioning Guide

Every caption must start with:

```text
ax_epic_fantasy_v1
```

Recommended caption structure:

```text
ax_epic_fantasy_v1, [subject/hero], [fantasy role/action], [framing], [silhouette/pose], [face/hands], [outfit/armor/props], [epic environment], [magic/creatures], [lighting/atmosphere], original epic fantasy illustration style
```

Good caption:

```text
ax_epic_fantasy_v1, young student hero standing on a cliff above a vast ancient academy kingdom, full body heroic fantasy composition, readable determined face, hands holding backpack straps and a simple travel sword, dark cloak moving in the wind, monumental castle city in the distance, river valley, banners, dragon silhouette in the stormy sky, golden heroic rim light, deep blue shadows, magical glow, rich painterly fantasy textures, legendary cinematic atmosphere
```

Bad caption:

```text
epic fantasy boy with castle
```

Why it is bad:

- Missing trigger token
- Does not describe scale, light, silhouette, atmosphere, or fantasy details
- Does not distinguish `epic_fantasy` from `concept_art`
- Does not control franchise imitation risk

Captioning rules:

- Always describe scale and atmosphere.
- Describe heroic silhouette, posture, light, magic, environment, and creatures when visible.
- Mention face and hands when visible.
- Specify heroic fantasy, kingdom view, dragon scene, magic ritual, throne hall, battlefield, ancient city, or mountain citadel.
- Avoid film, game, novel, author, franchise, character, brand, and protected IP names.
- Keep separation from `fairytale_3d`, `concept_art`, and dark fantasy/horror.
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

- Validate environments and characters separately.
- Check hands and faces in full-body hero prompts.
- Confirm monumental scale without losing subject readability.
- Avoid overfitting to castles, dragons, swords, or storm skies.
- Preserve variety across heroes, kingdoms, creatures, throne halls, landscapes, rituals, and non-gore battles.
- Check composition readability and silhouette at thumbnail size.
- Validate 16:9, 21:9, 9:16, and 1:1 outputs for poster and video workflows.

## Validation Prompts

Use the same fixed validation prompts across versions:

```text
ax_epic_fantasy_v1, cheerful boy walking to school reimagined as a young fantasy hero, backpack, readable face, readable hands, full body, grand magical academy kingdom, warm heroic morning light, monumental castle, rich painterly fantasy atmosphere
```

```text
ax_epic_fantasy_v1, young hero overlooking a vast ancient kingdom from a cliff, strong silhouette, cloak in wind, dramatic sky, castle city, mountains, river valley, golden rim light, epic fantasy illustration
```

```text
ax_epic_fantasy_v1, original dragon flying above a distant mountain citadel, tiny hero below for scale, storm clouds, magical glow, cinematic fantasy lighting, rich painterly textures
```

```text
ax_epic_fantasy_v1, grand ancient throne hall with banners and warm torchlight, young traveler standing in foreground, readable hands, monumental architecture, deep shadows, legendary fantasy atmosphere
```

Score each output on:

- Epic Fantasy style fidelity
- Monumental scale
- Heroic silhouette
- Lighting quality
- Environment quality
- Creature and magic quality
- Face quality
- Hand quality
- Cinematic composition
- Difference from `fairytale_3d`
- Difference from `concept_art`
- Absence of franchise or IP imitation

## Overfitting Watchlist

Stop or reduce training if:

- Every scene includes castles or dragons.
- Every character becomes an armed warrior.
- Lighting becomes repetitive.
- Compositions become too chaotic or too dark.
- Hands and faces are neglected in favor of environments.
- Magic and creature designs repeat too much.
- The style resembles known fantasy franchises.
- It drifts toward dark fantasy/horror without being asked.
- Narrative variety collapses.

## AXSTUDIO Integration Notes

Only connect the LoRA after visual validation confirms:

- `ax_epic_fantasy_v1` produces coherent epic fantasy.
- Scale, light, magic, and composition are stable.
- Faces and hands remain readable.
- It does not imitate franchises, films, games, novels, authors, or characters.
- It remains distinct from `fairytale_3d`, `concept_art`, and dark fantasy/horror.
- It works for kingdom, dragon, hero, throne hall, magic ritual, non-gore battlefield, and landscape prompts.
- The JSON style profile is available through the AXSTUDIO prompt builder.
- Negative prompt and validation prompts are available.
- It is ready for video with epic camera movement, parallax, creature motion, moving banners/clouds, and atmospheric continuity.

Until then, keep it as a JSON style profile and training plan only.
