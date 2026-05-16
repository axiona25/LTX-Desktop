# concept_art Style LoRA Dataset

Trigger token: `ax_concept_art_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style concept_art --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_concept_art_v1.
- Descrivere soggetto, funzione progettuale, silhouette, ambiente, scala, luce, mood, materiali e dettagli selettivi.
- Specificare se la scena è environment concept, character concept, prop concept, vehicle concept, key art, worldbuilding scene, mood painting o color script.
- Descrivere strong silhouettes, value structure, cinematic lighting, atmospheric depth, painterly brushwork e production design quando presenti.
- Non usare nomi di artisti, studi, giochi, film, franchise, brand o IP protette.
- Evitare caption generiche come concept art boy.
- Mantenere distinzione da epic_fantasy: concept_art può includere fantasy, ma deve restare progettuale e non solo epico.
- Mantenere distinzione da editorial_illustration: qui il focus è worldbuilding, pre-produzione e design visivo.
