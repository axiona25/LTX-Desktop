# low_poly_3d Style LoRA Dataset

Trigger token: `ax_low_poly_3d_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style low_poly_3d --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_low_poly_3d_v1.
- Descrivere soggetto, geometria low poly, volto, occhi, mani, outfit, ambiente, materiali, luce e palette.
- Specificare se la scena è low poly school, game environment, app scene, educational 3D, map scene, adventure landscape o motion graphic style.
- Descrivere faceted shapes, polygonal geometry, matte materials, flat colors e simple daylight quando presenti.
- Non usare nomi di giochi, studi, franchise, personaggi, brand o IP protette.
- Evitare caption generiche come low poly boy.
- Mantenere distinzione da stylized_3d: qui le superfici devono essere più geometriche e sfaccettate.
- Mantenere distinzione da toy_clay_3d: qui i materiali sono matte/geometrici, non plastilina o handmade.
