# graphic_novel Style LoRA Dataset

Trigger token: `ax_graphic_novel_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style graphic_novel --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_graphic_novel_v1.
- Descrivere soggetto, espressione, posa, mani, outfit, ambiente, linework, texture, ombre, palette e mood narrativo.
- Specificare se la scena è school graphic novel panel, urban narrative scene, emotional close-up, atmospheric interior, adventure panel o poster illustration.
- Descrivere variable ink linework, muted colors, textured shading, painterly shadows e atmospheric background quando presenti.
- Non usare nomi di editori, fumetti, personaggi, franchise, film, brand o IP protette.
- Evitare caption generiche come graphic novel boy.
- Mantenere distinzione da comic_book: qui il tono è più maturo, meno saturo e più narrativo.
- Mantenere distinzione da manga_ink: qui lo stile è colorato, occidentale e semi-realistico.
