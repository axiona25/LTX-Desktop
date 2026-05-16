# fairytale_3d Style LoRA Dataset

Trigger token: `ax_fairytale_3d_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style fairytale_3d --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_fairytale_3d_v1.
- Descrivere soggetto, proporzioni, volto, occhi, capelli, mani, outfit, ambiente, materiali, luce magica e atmosfera narrativa.
- Specificare se la scena è fairytale village, enchanted school path, castle scene, magical forest, cozy interior, lantern-lit street o fantasy adventure.
- Descrivere rounded shapes, sculpted hair, glossy eyes, warm magical light, glowing lanterns e polished 3D materials quando presenti.
- Non usare nomi di studi, film, franchise, personaggi, mascotte, brand o IP protette.
- Evitare caption generiche come fairytale 3D boy.
- Mantenere distinzione da stylized_3d: qui lo stile è più magico, narrativo e incantato.
- Mantenere distinzione da epic_fantasy: qui il tono resta dolce, family-friendly e fiabesco, non epico/dark.
