# AXSTUDIO LLM Style Instruction Dataset

Generated from `src/config/styleProfiles.json`.

This dataset is for the LLM layer that rewrites user requests into final image prompts.
It is not a LoRA image dataset. It captures prompt rules, failure guards, negative prompt
additions, model routes, and style-specific instructions.

## Files

- `axstudio_style_llm_instructions.json`: full structured dataset.
- `axstudio_style_llm_instructions.jsonl`: one style instruction record per line.
- `axstudio_style_llm_chat_examples.jsonl`: chat-style examples for prompt rewriting.

## Global Rules Captured

- Translate Italian or mixed-language user input to English before image generation.
- Preserve exact subject, species, action, props, and setting.
- For animal prompts, prevent human substitution and people-in-costume failures.
- Suppress unintended text, logos, signage, watermarks, and writing on objects.
- Keep selected style strong without negating it in the negative prompt.

## Current Style Routes

| Style ID | Label | Base Model | LoRA |
|---|---|---|---|
| `photorealistic` | Photorealistic | black-forest-labs/FLUX.2-klein-9B | - |
| `portrait_photo` | Portrait Photo | black-forest-labs/FLUX.2-klein-9B | - |
| `fashion_editorial` | Fashion Editorial | black-forest-labs/FLUX.2-klein-9B | - |
| `product_photo` | Product Photo | black-forest-labs/FLUX.2-klein-9B | - |
| `lifestyle_photo` | Lifestyle Photo | black-forest-labs/FLUX.2-klein-9B | - |
| `cinematic_realism` | Cinematic Realism | black-forest-labs/FLUX.2-klein-9B | - |
| `dramatic_film` | Dramatic Film | black-forest-labs/FLUX.2-klein-9B | - |
| `commercial_ad` | Commercial Ad | black-forest-labs/FLUX.2-klein-9B | - |
| `music_video` | Music Video | black-forest-labs/FLUX.2-klein-9B | - |
| `documentary_realism` | Documentary | black-forest-labs/FLUX.2-klein-9B | - |
| `anime_clean` | Anime | black-forest-labs/FLUX.1-dev | Canopus LoRA Flux Anime |
| `anime_cinematic` | Cinematic Anime | black-forest-labs/FLUX.1-dev | Canopus LoRA Flux Anime |
| `manga_ink` | Manga Ink | black-forest-labs/FLUX.2-klein-9B | LineAniRedmond |
| `chibi_kawaii` | Chibi | black-forest-labs/FLUX.1-dev | Canopus LoRA Flux Anime |
| `clean_cartoon` | Cartoon | black-forest-labs/FLUX.1-dev | CartoonStyle Flux LoRA |
| `mascot_cartoon` | Mascot | black-forest-labs/FLUX.1-dev | CartoonStyle Flux LoRA |
| `storybook_cartoon` | Story Cartoon | black-forest-labs/FLUX.1-dev | CartoonStyle Flux LoRA |
| `stylized_3d` | Stylized 3D | black-forest-labs/FLUX.1-dev | Flux 3D Animation Style LoRA |
| `fairytale_3d` | Fairytale 3D | black-forest-labs/FLUX.1-dev | Flux 3D Animation Style LoRA |
| `toy_clay_3d` | Toy & Clay | black-forest-labs/FLUX.1-dev | Flux 3D Animation Style LoRA |
| `low_poly_3d` | Low Poly 3D | black-forest-labs/FLUX.1-dev | Flux 3D Animation Style LoRA |
| `comic_book` | Comic Book | black-forest-labs/FLUX.1-dev | ComicStrips LoRA Fluxdev |
| `graphic_novel` | Graphic Novel | black-forest-labs/FLUX.2-klein-9B | Comic Sketch - CE |
| `european_comic` | Euro Comic | black-forest-labs/FLUX.1-dev | Retro Comic Flux |
| `editorial_illustration` | Editorial Illustration | black-forest-labs/FLUX.2-klein-9B | - |
| `storybook_illustration` | Storybook | black-forest-labs/FLUX.2-klein-9B | - |
| `concept_art` | Concept Art | black-forest-labs/FLUX.2-klein-9B | - |
| `epic_fantasy` | Epic Fantasy | black-forest-labs/FLUX.2-klein-9B | - |
| `cyberpunk` | Cyberpunk | black-forest-labs/FLUX.2-klein-9B | - |
| `sci_fi_future` | Sci-Fi Future | black-forest-labs/FLUX.2-klein-9B | - |
| `vector_flat` | Vector Flat | black-forest-labs/FLUX.2-klein-9B | - |
| `poster_graphic` | Poster Graphic | black-forest-labs/FLUX.2-klein-9B | - |
| `watercolor` | Watercolor | black-forest-labs/FLUX.1-dev | Aquarel Watercolor Flux LoRA |
| `pencil_sketch` | Pencil Sketch | black-forest-labs/FLUX.1-dev | Pencil Sketch Flux Style LoRA |
| `pixel_art` | Pixel Art | black-forest-labs/FLUX.1-dev | Modern Pixel Art Flux LoRA |
