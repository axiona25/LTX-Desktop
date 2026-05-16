# cyberpunk Style LoRA Dataset

Trigger token: `ax_cyberpunk_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style cyberpunk --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_cyberpunk_v1.
- Descrivere soggetto, outfit techwear, volto, mani, ambiente urbano, neon, pioggia, ologrammi, materiali e mood futuristico.
- Specificare se la scena è neon city street, rainy alley, futuristic academy, hologram district, cyber market, night transit, tech interface o skyline megacity.
- Descrivere magenta/cyan neon, wet reflections, holographic glow, dense vertical architecture e sci-fi atmosphere quando presenti.
- Non usare nomi di film, giochi, franchise, brand, aziende, personaggi o IP protette.
- Evitare testi leggibili e loghi reali negli ologrammi.
- Mantenere distinzione da music_video: qui il focus è worldbuilding urbano futuristico, non performance musicale.
- Mantenere distinzione da sci_fi_future: cyberpunk è più notturno, neon, urbano, denso e ribelle.
