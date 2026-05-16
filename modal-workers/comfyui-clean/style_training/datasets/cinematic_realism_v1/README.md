# cinematic_realism Style LoRA Dataset

Trigger token: `ax_cinematic_realism_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style cinematic_realism --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_cinematic_realism_v1.
- Descrivere soggetto, azione, ambiente, luce, mood, composizione e color grading.
- Specificare il tipo di luce: window light, golden hour, practical light, rim light, key light, low-key light.
- Descrivere il mood narrativo: warm, emotional, dramatic, hopeful, intimate, suspenseful, calm.
- Descrivere se la scena sembra un film still, cinematic scene o realistic visual storytelling.
- Indicare volto, occhi e mani quando visibili.
- Non usare nomi di film, registi, studi, brand o franchise.
- Evitare caption troppo generiche come cinematic photo.
