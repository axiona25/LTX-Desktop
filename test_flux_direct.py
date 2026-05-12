import requests
import base64
from datetime import datetime

FLUX_URL = "https://axiona2025--axstudio-flux-image-web-app.modal.run/generate"

prompts = [
    # Prompt 1 - Fotografico realistico (il più promettente)
    "photorealistic raw photo, 28 year old beautiful woman lying on back on luxurious bed, legs spread wide, full frontal view, highly detailed realistic female genitalia, visible spread labia, detailed clitoris, natural wetness, realistic skin texture and anatomy, sharp focus, natural lighting, 8k raw photo, explicit but realistic nude photography",

    # Prompt 2 - Ancora più controllato
    "realistic photograph of a nude 28 year old woman on bed, legs wide open, explicit view of vagina, detailed labia and clitoris, glistening natural moisture, anatomically correct, photorealistic, sharp detail, no deformation",

    # Prompt 3 - Versione ancora più soft ma pulita
    "high resolution realistic nude photography, 28yo woman lying on back legs spread, detailed realistic pussy, visible labia, natural wetness, photorealistic skin, explicit adult photo, sharp focus"
]

negative_prompt = "deformed, bad anatomy, mutated, extra limbs, ugly, low quality, blurry, cartoon, painting, drawing, anime, plastic skin, glossy blob, red mass, melted, surreal, censorship, underwear, fabric, modest pose, closed legs"

for i, prompt in enumerate(prompts, 1):
    print(f"\n🔥 Test Prompt {i}/3 (fotografico)...")
    payload = {
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "width": 1024,
        "height": 1536,
        "steps": 35,
        "guidance_scale": 2.8,      # abbassato per ridurre deformazioni
        "quality_mode": "premium"
    }

    response = requests.post(FLUX_URL, json=payload, timeout=180)
    
    if response.status_code == 200:
        data = response.json()
        image_base64 = data.get("image_base64")
        if image_base64:
            filename = f"flux_test_photo_{i}_{datetime.now().strftime('%H%M%S')}.png"
            with open(filename, "wb") as f:
                f.write(base64.b64decode(image_base64))
            print(f"✅ Salvato: {filename}")
            print(f"Apri con: open {filename}")
        else:
            print("❌ Nessuna immagine")
    else:
        print(f"❌ Errore {response.status_code}")
