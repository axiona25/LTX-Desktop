# anime_cinematic Style LoRA Dataset

Trigger token: `ax_anime_cinematic_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style anime_cinematic --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_anime_cinematic_v1.
- Descrivere soggetto, emozione, occhi, capelli, outfit, posa, ambiente, luce drammatica, palette e atmosfera.
- Specificare se la scena è sunset school scene, emotional close-up, epic landscape, classroom golden hour, fantasy action o city night anime scene.
- Descrivere line art, cel shading, rim light, backlight, deep shadows e atmospheric depth quando presenti.
- Indicare mani e corpo intero quando visibili.
- Non usare nomi di studi, registi, franchise, film, personaggi o brand.
- Evitare caption generiche come cinematic anime boy.
- Distinguere sempre da anime_clean: qui la luce, il mood e la composizione devono essere più filmici.
