# anime_clean Style LoRA Dataset

Trigger token: `ax_anime_clean_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style anime_clean --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_anime_clean_v1.
- Descrivere soggetto, espressione, occhi, capelli, outfit, posa, ambiente, luce e cel shading.
- Specificare se la scena è school life, slice of life, adventure, action light, classroom, outdoor campus o city scene.
- Descrivere line art, colori, ombre e background solo quando rilevanti.
- Indicare mani e corpo intero quando visibili.
- Non usare nomi di studi, franchise, personaggi o brand.
- Evitare caption generiche come anime boy school.
- Mantenere il linguaggio originale, pulito e commerciale.
