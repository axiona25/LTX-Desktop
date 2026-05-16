# pencil_sketch Style LoRA Dataset

Trigger token: `ax_pencil_sketch_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style pencil_sketch --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_pencil_sketch_v1.
- Descrivere soggetto, posa, volto, occhi, mani, ambiente, tratteggio, chiaroscuro, carta e tecnica a grafite.
- Specificare se la scena è pencil portrait, full body sketch, environment sketch, storyboard frame, concept sketch, still life o architectural sketch.
- Descrivere graphite lines, hatching, cross-hatching, paper grain, smudged shading ed eraser highlights quando presenti.
- Non usare nomi di artisti, libri, brand, personaggi, franchise o IP protette.
- Evitare caption generiche come pencil boy.
- Mantenere distinzione da manga_ink: qui non è inchiostro, è grafite.
- Mantenere distinzione da watercolor: qui il focus è monocromia, linea e chiaroscuro.
