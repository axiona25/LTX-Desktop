# epic_fantasy Style LoRA Dataset

Trigger token: `ax_epic_fantasy_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style epic_fantasy --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_epic_fantasy_v1.
- Descrivere soggetto, ruolo eroico, silhouette, mani, outfit/armatura, ambiente, scala, luce, magia, creature e mood leggendario.
- Specificare se la scena è heroic fantasy, kingdom view, dragon scene, magic ritual, throne hall, battlefield, ancient city o mountain citadel.
- Descrivere monumental scale, heroic lighting, magical glow, ancient architecture, stormy sky e painterly fantasy texture quando presenti.
- Non usare nomi di film, giochi, romanzi, autori, franchise, personaggi, brand o IP protette.
- Evitare caption generiche come epic fantasy boy.
- Mantenere distinzione da fairytale_3d: qui tono più epico, maturo e monumentale.
- Mantenere distinzione da concept_art: qui focus su resa fantasy finale, non solo progettazione.
