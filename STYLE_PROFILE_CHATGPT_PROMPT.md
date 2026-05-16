# Prompt For ChatGPT: AXSTUDIO Style Validation And JSON

Use this prompt in ChatGPT when AXSTUDIO needs to validate a style visually, then produce the full JSON and LoRA training instructions.

```text
You are helping define commercial style profiles for AXSTUDIO, an AI Image & Video Studio.

AXSTUDIO style system rules:
- AXSTUDIO is the only source of truth for style behavior.
- Do not use proprietary brand names as operative style names.
- Do not imitate existing studios, franchises, characters, logos, or copyrighted IP.
- Use generic commercial style language only.
- First generate exactly one validation image.
- Do not produce JSON until I approve the validation image.
- After approval, produce a complete JSON style profile and a dedicated LoRA training prompt.

Canonical AXSTUDIO style list:

REALISTIC
1. photorealistic - Photorealistic
2. portrait_photo - Portrait Photo
3. fashion_editorial - Fashion Editorial
4. product_photo - Product Photo
5. lifestyle_photo - Lifestyle Photo

CINEMATIC
6. cinematic_realism - Cinematic Realism
7. dramatic_film - Dramatic Film
8. commercial_ad - Commercial Ad
9. music_video - Music Video
10. documentary_realism - Documentary

ANIME & MANGA
11. anime_clean - Anime
12. anime_cinematic - Cinematic Anime
13. manga_ink - Manga Ink
14. chibi_kawaii - Chibi

CARTOON
15. clean_cartoon - Cartoon
16. mascot_cartoon - Mascot
17. storybook_cartoon - Story Cartoon

3D ANIMATION
18. stylized_3d - Stylized 3D
19. fairytale_3d - Fairytale 3D
20. toy_clay_3d - Toy & Clay
21. low_poly_3d - Low Poly 3D

COMICS
22. comic_book - Comic Book
23. graphic_novel - Graphic Novel
24. european_comic - Euro Comic

ILLUSTRATION
25. editorial_illustration - Editorial Illustration
26. storybook_illustration - Storybook
27. concept_art - Concept Art

FANTASY & SCI-FI
28. epic_fantasy - Epic Fantasy
29. cyberpunk - Cyberpunk
30. sci_fi_future - Sci-Fi Future

DESIGN
31. vector_flat - Vector Flat
32. poster_graphic - Poster Graphic

PAINTING & SKETCH
33. watercolor - Watercolor
34. pencil_sketch - Pencil Sketch

RETRO & GAME
35. pixel_art - Pixel Art

Style to validate now:
[INSERT STYLE ID AND UI LABEL]

Fixed validation subject:
a cheerful boy walking to school, backpack, warm morning light, readable face, readable hands, full body, friendly environment

Phase 1:
Generate one validation image only.
The image must clearly show:
- face style
- eye shape
- hair treatment
- hand readability
- full-body anatomy
- outfit rendering
- environment style
- palette
- lighting
- material or texture treatment
- composition language

Do not generate JSON yet.
After the image, ask whether I approve the style or want corrections.

Phase 2, only after approval:
Produce a complete JSON object with this structure:

{
  "id": "",
  "ui_label": "",
  "safe_label": "",
  "category": "",
  "short_description": "",
  "long_description": "",
  "trigger_token": "",
  "visual_language": {
    "forms": "",
    "face": "",
    "eyes": "",
    "hair": "",
    "body": "",
    "hands": "",
    "environment": "",
    "materials": ""
  },
  "line_treatment": "",
  "shading_mode": "",
  "color_logic": "",
  "lighting_style": "",
  "texture_style": "",
  "composition_hints": [],
  "anatomy_tendency": "",
  "prompt_prefix": "",
  "prompt_suffix": "",
  "negative_prompt": "",
  "recommended_resolution": {
    "portrait": "768x1344",
    "landscape": "1344x768",
    "square": "1024x1024"
  },
  "recommended_aspect_ratios": ["9:16", "16:9", "1:1"],
  "image_prompt_template": "{prompt_prefix}, {user_prompt}, {prompt_suffix}",
  "video_prompt_template": "{prompt_prefix}, {user_prompt}, gentle animated movement, soft camera motion, coherent visual style, {prompt_suffix}",
  "strength_guidance": {
    "default": 0.75,
    "min": 0.55,
    "max": 0.9,
    "notes": ""
  },
  "lora_training": {
    "type": "style_lora",
    "goal": "",
    "dataset_size_min": 500,
    "dataset_size_recommended": 1200,
    "dataset_distribution": {
      "portraits": "25%",
      "half_body": "20%",
      "full_body": "20%",
      "environment_scenes": "15%",
      "multiple_characters": "10%",
      "props_and_details": "10%"
    },
    "captioning_rules": [],
    "bad_caption_example": "",
    "good_caption_example": "",
    "recommended_params": {
      "resolution": 1024,
      "network_rank": "16-32",
      "alpha": "16-32",
      "unet_learning_rate": "1e-4",
      "text_encoder_learning_rate": "0 or 5e-6",
      "optimizer": "AdamW8bit",
      "scheduler": "cosine or constant_with_warmup",
      "validation_every_steps": "200-500",
      "target_total_steps": "3000-7000"
    },
    "overfitting_risks": []
  },
  "validation_prompts": [],
  "tags": []
}

Also produce a second block called LORA_TRAINING_PROMPT_FOR_CODEX that explains exactly how Codex should prepare the dataset and train the LoRA for this approved style.
```
