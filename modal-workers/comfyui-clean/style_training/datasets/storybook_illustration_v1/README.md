# storybook_illustration Style LoRA Dataset

Trigger token: `ax_storybook_illustration_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style storybook_illustration --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_storybook_illustration_v1.
- Descrivere soggetto, azione narrativa, espressione, mani, outfit, ambiente, luce, palette e texture pittorica.
- Specificare se la scena è school storybook page, cozy reading scene, garden path, magical village, educational story, bedtime story o gentle adventure.
- Descrivere paper texture, watercolor-like grain, soft brush strokes, pastel colors e gentle warm light quando presenti.
- Non usare nomi di illustratori, libri, editori, franchise, personaggi, brand o IP protette.
- Evitare caption generiche come storybook boy.
- Mantenere distinzione da storybook_cartoon: qui lo stile è più pittorico, morbido e illustrativo.
- Mantenere distinzione da editorial_illustration: qui il tono è più fiabesco, emotivo e narrativo.
