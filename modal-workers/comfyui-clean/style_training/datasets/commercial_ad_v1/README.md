# commercial_ad Style LoRA Dataset

Trigger token: `ax_commercial_ad_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style commercial_ad --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_commercial_ad_v1.
- Descrivere soggetto, prodotto o servizio, beneficio visivo, composizione, luce, mood e ambiente.
- Specificare se la scena è product ad, lifestyle ad, tech ad, food ad, corporate ad o social campaign.
- Descrivere spazio negativo o area copy se presente, ma non forzare testo generato.
- Descrivere mani e interazioni con prodotti quando visibili.
- Non usare brand, loghi, marchi o slogan reali.
- Mantenere tono positivo, pulito, vendibile e commerciale.
- Distinguere commercial_ad da product_photo: qui può esserci una scena più ampia, soggetto umano e messaggio aspirazionale.
