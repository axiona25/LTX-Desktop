# editorial_illustration Style LoRA Dataset

Trigger token: `ax_editorial_illustration_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style editorial_illustration --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_editorial_illustration_v1.
- Descrivere soggetto, azione, concetto comunicato, volto, mani, outfit, ambiente, palette, texture e composizione.
- Specificare se la scena è education editorial, business editorial, app illustration, concept illustration, article illustration, infographic-friendly scene o social editorial.
- Descrivere clean linework, muted colors, paper texture, subtle brush grain e balanced composition quando presenti.
- Non usare nomi di illustratori, magazine, brand, agenzie, personaggi, franchise o IP protette.
- Evitare caption generiche come editorial boy.
- Mantenere distinzione da comic_book e graphic_novel: qui niente panel grammar, niente halftone pesante, niente mood troppo cupo.
- Mantenere distinzione da vector_flat: qui può esserci più texture, umanità e profondità illustrativa.
