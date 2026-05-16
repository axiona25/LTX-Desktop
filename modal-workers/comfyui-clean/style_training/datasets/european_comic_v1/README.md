# european_comic Style LoRA Dataset

Trigger token: `ax_european_comic_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style european_comic --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_european_comic_v1.
- Descrivere soggetto, posa, volto, occhi, mani, outfit, ambiente, architettura, linework, colori e composizione.
- Specificare se la scena è school European comic panel, city square, adventure panel, classroom scene, village scene, countryside scene o educational comic.
- Descrivere clean linework, harmonious flat colors, ordered background, architectural detail e clear natural daylight quando presenti.
- Non usare nomi di autori, editori, serie, personaggi, franchise, brand o IP protette.
- Evitare caption generiche come Euro comic boy.
- Mantenere distinzione da comic_book: qui il tono è più ordinato, meno esplosivo e meno saturo.
- Mantenere distinzione da graphic_novel: qui il tono è più chiaro, classico, leggibile e meno cupo.
