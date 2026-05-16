# vector_flat Style LoRA Dataset

Trigger token: `ax_vector_flat_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style vector_flat --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_vector_flat_v1.
- Descrivere soggetto, azione, forme geometriche, palette, layout, ambiente, icone e composizione.
- Specificare se la scena è app illustration, web illustration, infographic, dashboard, education vector, corporate vector o icon set.
- Descrivere solid color fills, clean vector shapes, minimal shading, flat design e clear visual hierarchy quando presenti.
- Non usare nomi di brand, loghi, app, aziende, personaggi o IP protette.
- Evitare caption generiche come vector boy.
- Mantenere distinzione da editorial_illustration: qui niente texture carta/pennello.
- Mantenere distinzione da poster_graphic: qui la funzione è più UI/infografica, meno poster d'impatto.
