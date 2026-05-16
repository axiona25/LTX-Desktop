# dramatic_film Style LoRA Dataset

Trigger token: `ax_dramatic_film_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style dramatic_film --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_dramatic_film_v1.
- Descrivere soggetto, postura, espressione, ambiente, luce, ombre, mood e color grading.
- Specificare elementi drammatici visibili: rain, wet pavement, stormy sky, practical light, rim light, deep shadows.
- Indicare volto, occhi e mani quando visibili.
- Descrivere il mood emotivo senza citare film, registi, brand o franchise.
- Evitare caption troppo generiche come dramatic cinematic photo.
- Mantenere separazione tra dramatic_film e cinematic_realism: qui il contrasto e la tensione devono essere più forti.
- Non forzare horror o gore: lo stile deve essere drammatico, non horror esplicito.
