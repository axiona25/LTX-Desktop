# documentary_realism Style LoRA Dataset

Trigger token: `ax_documentary_realism_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style documentary_realism --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_documentary_realism_v1.
- Descrivere soggetto, azione reale, contesto sociale o ambientale, luce disponibile e mood autentico.
- Specificare se la scena è reportage, observational, candid, street, school, work, community o travel documentary.
- Descrivere volto e mani quando visibili.
- Descrivere l'ambiente come parte della storia, non come sfondo decorativo.
- Evitare termini da advertising, fashion editorial, glamour o studio photo.
- Non usare nomi di fotografi, testate, agenzie, brand o luoghi protetti se non forniti dall'utente.
- Mantenere le caption concrete, realistiche e orientate alla narrazione umana.
