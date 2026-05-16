# watercolor Style LoRA Dataset

Trigger token: `ax_watercolor_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style watercolor --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_watercolor_v1.
- Descrivere soggetto, posa, volto, mani, ambiente, palette, carta, pigmenti, pennellate e tecnica.
- Specificare se la scena è watercolor portrait, landscape, cityscape, school scene, book illustration, botanical composition, still life o editorial watercolor.
- Descrivere transparent washes, wet-on-wet gradients, paper grain, pigment blooms, soft edges e light splatter quando presenti.
- Non usare nomi di artisti, libri, editori, brand, personaggi, franchise o IP protette.
- Evitare caption generiche come watercolor boy.
- Mantenere distinzione da storybook_illustration: qui il focus è la tecnica acquerello.
- Mantenere distinzione da pencil_sketch: qui il focus è pigmento e colore, non grafite o linea.
