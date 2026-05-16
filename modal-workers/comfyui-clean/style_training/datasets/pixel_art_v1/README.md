# pixel_art Style LoRA Dataset

Trigger token: `ax_pixel_art_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style pixel_art --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_pixel_art_v1.
- Descrivere soggetto, azione, sprite scale, palette, pixel grid, ambiente, UI o tile se presenti.
- Specificare se la scena è 8-bit, 16-bit, sprite sheet, game scene, retro UI, icon set, platform scene, RPG scene o educational pixel art.
- Descrivere crisp pixels, limited palette, no anti-aliasing, tile-based environment e dithering quando presenti.
- Non usare nomi di videogiochi, console, franchise, personaggi, brand o IP protette.
- Evitare caption generiche come pixel boy.
- Mantenere distinzione da low_poly_3d: qui è 2D pixel, non geometria 3D.
- Mantenere distinzione da vector_flat: qui deve esserci griglia pixel e palette retro.
