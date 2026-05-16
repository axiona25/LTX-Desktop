# clean_cartoon Style LoRA Dataset

Trigger token: `ax_clean_cartoon_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style clean_cartoon --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_clean_cartoon_v1.
- Descrivere soggetto, espressione, occhi, capelli, outfit, posa, mani, ambiente, linee, colori e shading.
- Specificare se la scena è school cartoon, educational cartoon, adventure cartoon, family cartoon, social cartoon o action cartoon.
- Descrivere clean outlines, rounded shapes, bright colors e soft simple shading quando presenti.
- Indicare mani e corpo intero quando visibili.
- Non usare nomi di studi, franchise, mascotte, personaggi o brand.
- Evitare caption generiche come cartoon boy at school.
- Mantenere distinzione da anime_clean, chibi_kawaii e stylized_3d.
