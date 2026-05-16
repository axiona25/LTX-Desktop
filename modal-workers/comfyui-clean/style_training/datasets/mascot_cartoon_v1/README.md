# mascot_cartoon Style LoRA Dataset

Trigger token: `ax_mascot_cartoon_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style mascot_cartoon --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_mascot_cartoon_v1.
- Descrivere tipo di mascotte, animale/personaggio, forma, espressione, posa, mani/paws, outfit, colori e uso commerciale.
- Specificare se la posa è icon pose, waving, thumbs-up, running, holding product, app mascot, game mascot o sticker pose.
- Descrivere strong silhouette, bold outlines, rounded shapes e brand-friendly colors quando presenti.
- Non usare nomi di brand, mascotte famose, franchise, squadre, loghi o personaggi esistenti.
- Evitare caption generiche come cute mascot.
- Mantenere il focus su riconoscibilità, semplicità e uso commerciale multipiattaforma.
