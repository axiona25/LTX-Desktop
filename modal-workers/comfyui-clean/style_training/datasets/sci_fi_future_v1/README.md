# sci_fi_future Style LoRA Dataset

Trigger token: `ax_sci_fi_future_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style sci_fi_future --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_sci_fi_future_v1.
- Descrivere soggetto, outfit futuristico, volto, mani, ambiente, architettura, tecnologia, veicoli, materiali e luce.
- Specificare se la scena è futuristic city, advanced academy, orbital station, spaceport, high-tech interior, clean laboratory, sustainable megacity o exploration scene.
- Descrivere sleek architecture, glass and metal materials, blue technology accents, flying vehicles, holographic interfaces e bright daylight quando presenti.
- Non usare nomi di film, giochi, franchise, aziende, brand, personaggi o IP protette.
- Evitare loghi, testi leggibili o marchi nei pannelli tecnologici.
- Mantenere distinzione da cyberpunk: qui il mood è pulito, luminoso, ordinato e aspirazionale.
- Mantenere distinzione da concept_art: qui il focus è sci-fi futuro pulito, non concept generico multi-genere.
