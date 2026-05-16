# fashion_editorial Style LoRA Dataset

Trigger token: `ax_fashion_editorial_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style fashion_editorial --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_fashion_editorial_v1.
- Descrivere outfit, posa, styling, ambiente, luce e composizione.
- Indicare se l'immagine è full body, three-quarter, half body o portrait.
- Descrivere i materiali visibili: tessuti, scarpe, accessori, superfici, vetro, cemento.
- Descrivere la qualità della luce e il mood editoriale.
- Non usare nomi di brand moda, riviste, fotografi o campagne esistenti.
- Non captionare come semplice photorealistic: specificare sempre il taglio fashion/editorial.
- Mantenere il focus sul linguaggio visivo, non su una singola identità.
