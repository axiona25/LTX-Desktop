import requests
import base64
from datetime import datetime

FLUX_URL = "https://axiona2025--axstudio-flux-image-web-app.modal.run/generate"

prompt = "photorealistic raw photo, 28 year old beautiful woman lying on her back on luxurious bed, legs spread extremely wide, full frontal explicit view, highly detailed realistic pussy, spread open labia minora and majora, swollen visible clitoris, wet glistening vagina with creamy juices dripping down, hyper realistic skin texture and anatomy, sharp focus, explicit but realistic nude photography"

negative_prompt = "deformed genitalia, pink blob, glossy mass, melted pussy, surreal anatomy, bad anatomy, extra limbs, mutated, plastic skin, censorship, underwear, closed legs, modest pose, soft lighting, artistic, painting, drawing, anime, cartoon, low quality, blurry, text, watermark, fabric on body, covered genitals"

payload = {
    "prompt": prompt,
    "negative_prompt": negative_prompt,
    "width": 1024,
    "height": 1536,
    "steps": 40,
    "guidance_scale": 2.5,
    "quality_mode": "premium"
}

print("🚀 Test FLUX ottimizzato NSFW...")
response = requests.post(FLUX_URL, json=payload, timeout=180)

if response.status_code == 200:
    data = response.json()
    image_base64 = data.get("image_base64")
    if image_base64:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"flux_optimized_{timestamp}.png"
        with open(filename, "wb") as f:
            f.write(base64.b64decode(image_base64))
        print(f"✅ IMMAGINE SALVATA: {filename}")
        print(f"Apri con: open {filename}")
    else:
        print("❌ Nessuna immagine_base64")
else:
    print(f"❌ Errore HTTP {response.status_code}")
    print(response.text)
