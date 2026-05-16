# storybook_cartoon Style LoRA Dataset

Trigger token: `ax_storybook_cartoon_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style storybook_cartoon --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_storybook_cartoon_v1.
- Descrivere soggetto, azione narrativa, espressione, mani, outfit, ambiente, luce, palette e mood.
- Specificare se la scena è educational story, school story, cozy home story, fairytale path, adventure story o family story.
- Descrivere soft rounded shapes, warm colors, cozy environment, gentle shading e storybook atmosphere quando presenti.
- Non usare nomi di brand, franchise, personaggi, mascotte, studi o opere esistenti.
- Evitare caption generiche come story cartoon boy.
- Mantenere distinzione da clean_cartoon: più narrativo e ambientale.
- Mantenere distinzione da mascot_cartoon: meno iconico-brand, più scena e racconto.
