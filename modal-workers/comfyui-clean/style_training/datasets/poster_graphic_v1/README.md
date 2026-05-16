# poster_graphic Style LoRA Dataset

Trigger token: `ax_poster_graphic_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style poster_graphic --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_poster_graphic_v1.
- Descrivere soggetto, messaggio visivo, silhouette, composizione, palette, forme, tipografia se presente e texture stampa.
- Specificare se la scena è campaign poster, education poster, music poster, event poster, social key visual, cover graphic o cultural poster.
- Descrivere bold typography solo se realmente presente o richiesta.
- Descrivere limited color palette, screenprint texture, paper grain, strong contrast e diagonal composition quando presenti.
- Non usare nomi di brand, campagne, festival, artisti, film, personaggi o IP protette.
- Evitare testi lunghi generati automaticamente.
- Mantenere distinzione da vector_flat: qui il focus è key visual d'impatto, non semplice illustrazione UI.
- Mantenere distinzione da commercial_ad: qui lo stile è più grafico, iconico e poster-like.
