# comic_book Style LoRA Dataset

Trigger token: `ax_comic_book_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style comic_book --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_comic_book_v1.
- Descrivere soggetto, espressione, posa, mani, outfit, ambiente, linee, colori, ombre grafiche, hatching e halftone.
- Specificare se la scena è school comic panel, action comic panel, educational comic, poster comic, adventure comic o character panel.
- Descrivere bold outlines, variable line weight, vivid colors, halftone dots e graphic shadows quando presenti.
- Non usare nomi di editori, supereroi, personaggi, franchise, film, brand o IP protette.
- Evitare caption generiche come comic boy.
- Mantenere distinzione da manga_ink: qui lo stile è colorato e occidentale.
- Mantenere distinzione da graphic_novel: qui il tono è più vivace, accessibile e dinamico.
