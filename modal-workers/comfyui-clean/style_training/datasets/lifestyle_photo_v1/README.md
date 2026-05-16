# lifestyle_photo Style LoRA Dataset

Trigger token: `ax_lifestyle_photo_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style lifestyle_photo --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_lifestyle_photo_v1.
- Descrivere soggetto, azione quotidiana, ambiente, luce, oggetti e atmosfera.
- Specificare se la posa è seduta, in cammino, rilassata, spontanea o interattiva.
- Descrivere mani e oggetti se il soggetto interagisce con tazze, libri, telefoni, zaini o altri props.
- Descrivere materiali e texture dell'ambiente.
- Mantenere un tono realistico, naturale e commerciale.
- Non usare termini da fashion editorial se la scena non è moda.
- Non usare brand, loghi, nomi di riviste, fotografi o riferimenti protetti.
