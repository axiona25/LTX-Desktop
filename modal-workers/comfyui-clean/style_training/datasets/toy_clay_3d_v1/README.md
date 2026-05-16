# toy_clay_3d Style LoRA Dataset

Trigger token: `ax_toy_clay_3d_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style toy_clay_3d --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_toy_clay_3d_v1.
- Descrivere soggetto, proporzioni toy-like, volto, occhi, capelli clay-sculpted, mani, outfit, ambiente, materiali e luce.
- Specificare se la scena è clay school scene, toy miniature world, stop-motion inspired scene, educational toy scene, cozy clay interior o playful adventure.
- Descrivere matte clay texture, rounded forms, handmade imperfections, pastel colors e warm soft light quando presenti.
- Non usare nomi di studi, film, franchise, personaggi, giocattoli famosi, brand o IP protette.
- Evitare caption generiche come clay 3D boy.
- Mantenere distinzione da stylized_3d: qui il materiale deve sembrare più artigianale, tattile e clay.
- Mantenere distinzione da low_poly_3d: qui le forme sono morbide, non geometriche.
