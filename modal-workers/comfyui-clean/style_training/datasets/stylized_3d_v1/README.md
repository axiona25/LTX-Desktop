# stylized_3d Style LoRA Dataset

Trigger token: `ax_stylized_3d_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style stylized_3d --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_stylized_3d_v1.
- Descrivere soggetto, proporzioni, volto, occhi, capelli, mani, outfit, ambiente, materiali, luce e rendering.
- Specificare se la scena è school 3D, app character, game-like scene, educational 3D, adventure 3D o social animation.
- Descrivere rounded shapes, sculpted hair, glossy eyes, smooth materials e soft cinematic lighting quando presenti.
- Non usare nomi di studi, franchise, personaggi, mascotte, brand o IP protette.
- Evitare caption generiche come stylized 3D boy.
- Mantenere distinzione da fairytale_3d, toy_clay_3d, low_poly_3d e clean_cartoon.
