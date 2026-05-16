# portrait_photo Style LoRA Dataset

Trigger token: `ax_portrait_photo_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style portrait_photo --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_portrait_photo_v1.
- Descrivere chiaramente volto, occhi, capelli, espressione e tipo di luce.
- Specificare se l'inquadratura è close-up, headshot, mezzo busto o half body.
- Indicare se le mani sono visibili e se sono leggibili.
- Descrivere lo sfondo solo quando contribuisce al contesto.
- Separare soggetto, posa, volto, luce, outfit, ambiente e qualità fotografica.
- Evitare termini artistici come anime, cartoon, 3D, painting o illustration.
- Non usare brand, nomi di fotografi famosi o riferimenti protetti.
