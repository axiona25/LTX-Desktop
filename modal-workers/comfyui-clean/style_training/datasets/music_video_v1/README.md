# music_video Style LoRA Dataset

Trigger token: `ax_music_video_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style music_video --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_music_video_v1.
- Descrivere soggetto, azione/performance, ambiente, luce colorata, movimento, mood e composizione.
- Specificare elementi visivi come neon lights, stage lights, microphone, concert crowd, dance floor, smoke, haze, wet pavement, LED panels.
- Indicare volto, occhi e mani quando visibili.
- Descrivere il tipo di scena: performance, dance scene, night drive, concert vibes, emotional close-up, urban music promo.
- Non usare nomi di artisti, band, videoclip, brand, festival o venue reali.
- Evitare testo, loghi e nomi falsi generati se non richiesti.
- Mantenere energia visiva senza sacrificare leggibilità anatomica.
