# manga_ink Style LoRA Dataset

Trigger token: `ax_manga_ink_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style manga_ink --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_manga_ink_v1.
- Descrivere soggetto, espressione, occhi, capelli, posa, mani, outfit, ambiente, line art, retini e tratteggio.
- Specificare se la scena è school manga panel, emotional close-up, action panel, classroom scene, city scene o adventure panel.
- Descrivere screentone, hatching, cross-hatching, solid blacks e strong contrast quando presenti.
- Indicare sempre monochrome black and white.
- Non usare nomi di manga, autori, studi, franchise, personaggi o brand.
- Evitare caption generiche come manga boy school.
- Mantenere lo stile distinto da anime_clean e comic_book: qui il focus è bianco e nero, ink, retini e tavola manga.
