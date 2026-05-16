# chibi_kawaii Style LoRA Dataset

Trigger token: `ax_chibi_kawaii_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style chibi_kawaii --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_chibi_kawaii_v1.
- Descrivere proporzioni chibi: oversized head, tiny body, short limbs, rounded shapes.
- Descrivere occhi, espressione, capelli, outfit, posa, mani e ambiente.
- Specificare se la scena è sticker, school scene, cute adventure, cozy slice of life, mascot pose o kawaii action.
- Descrivere palette pastello, soft cel shading, rosy cheeks e cute props quando presenti.
- Non usare nomi di franchise, personaggi, studi, mascotte famose, brand o IP protette.
- Non usare caption generiche come cute chibi boy.
- Mantenere il focus su tenerezza, leggibilità e proporzioni super-deformed.
