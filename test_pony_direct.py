import requests
import base64
from datetime import datetime

PONY_URL = "https://axiona2025--axstudio-pony-nsfw-web-app.modal.run/generate"

prompt = "score_9, score_8_up, score_7_up, 28 year old woman, completely naked, lying on back on luxurious bed, legs spread extremely wide, pussy fully spread open, detailed realistic pussy, swollen clitoris, dripping wet vagina, glistening vaginal fluids, visible creamy pussy juice, puffy engorged labia, pink wet inner labia spread wide, hyper detailed genitalia, realistic wet cunt, labia minora visible and spread, bare pussy, explicit full frontal nudity, pornographic realism, photorealistic, sharp focus"

negative_prompt = "score_6, score_5, score_4, clothed, underwear, panties, bra, censorship, mosaic, blur, soft lighting, artistic, painting, drawing, anime, cartoon, modest pose, closed legs, deformed, bad anatomy, extra limbs, mutated, low quality, blurry, text, watermark, fabric, covered genitals, pink blob, glossy mass"

payload = {
    "prompt": prompt,
    "negative_prompt": negative_prompt,
    "width": 1024,
    "height": 1536,
    "steps": 35,
    "guidance_scale": 3.0,
}

print("🚀 Invio richiesta diretta a Pony Diffusion V6 XL...")
response = requests.post(PONY_URL, json=payload, timeout=180)

if response.status_code == 200:
    data = response.json()
    image_base64 = data.get("image_base64")
    if image_base64:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"pony_test_{timestamp}.png"
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
