import requests
import base64
from datetime import datetime

JUGGERNAUT_URL = "https://axiona2025--axstudio-juggernaut-xl-web-app.modal.run/generate"

prompt = "masterpiece, best quality, photorealistic, 28 year old beautiful woman lying on her back on luxurious bed, legs spread extremely wide, full frontal explicit view, highly detailed realistic pussy, spread open labia minora and majora, swollen visible clitoris, wet glistening vagina with creamy juices dripping down, hyper realistic skin texture and anatomy, sharp focus, explicit nude photography"

negative_prompt = "clothed, underwear, panties, bra, lingerie, censorship, mosaic, blur, soft lighting, artistic, painting, drawing, anime, cartoon, modest pose, closed legs, deformed, bad anatomy, extra limbs, mutated, low quality, blurry, text, watermark, fabric on body, covered genitals, pink blob, glossy mass, surreal"

payload = {
    "prompt": prompt,
    "negative_prompt": negative_prompt,
    "width": 1024,
    "height": 1536,
    "steps": 35,
    "guidance_scale": 3.0,
}

print("🚀 Invio richiesta diretta a Juggernaut XL...")
response = requests.post(JUGGERNAUT_URL, json=payload, timeout=180)

if response.status_code == 200:
    data = response.json()
    image_base64 = data.get("image_base64")
    if image_base64:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"juggernaut_test_{timestamp}.png"
        with open(filename, "wb") as f:
            f.write(base64.b64decode(image_base64))
        print(f"✅ IMMAGINE SALVATA: {filename}")
        print(f"Apri con: open {filename}")
    else:
        print("❌ Nessuna immagine_base64")
        print(data)
else:
    print(f"❌ Errore HTTP {response.status_code}")
    print(response.text)
