# product_photo Style LoRA Dataset

Trigger token: `ax_product_photo_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style product_photo --source-dir /path/to/curated/images --force
```

Captioning rules:

- Usare sempre il trigger token ax_product_photo_v1.
- Descrivere il tipo di prodotto, packaging, materiale, superficie, props, luce e composizione.
- Specificare se la scena è studio, tabletop, e-commerce, lifestyle o advertising.
- Descrivere materiali visibili: vetro, carta, metallo, plastica, tessuto, marmo, legno, ceramica.
- Descrivere riflessi, ombre, label readability e product hierarchy.
- Evitare nomi di brand, loghi, marchi o prodotti registrati.
- Non usare caption vaghe come product shot o nice product.
- Se ci sono mani o modelli, descriverli come elementi secondari e mantenere il prodotto protagonista.
