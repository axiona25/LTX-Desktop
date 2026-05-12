# AXSTUDIO FLUX Image Worker

Modal worker exposing `POST /generate` for FLUX.1-dev image generation on H100.

## Modal resources

```bash
modal volume create axstudio-flux-cache
modal secret create axstudio-flux-secrets HF_TOKEN=your-huggingface-token
modal deploy modal-workers/flux-image/app.py
```

`HF_TOKEN` or `HUGGING_FACE_HUB_TOKEN` is required if your Hugging Face account needs gated access to `black-forest-labs/FLUX.1-dev`.

## Request

```json
{
  "prompt": "cinematic editorial product photo...",
  "negative_prompt": "blurry, low quality",
  "width": 1344,
  "height": 768,
  "steps": 28,
  "guidance_scale": 3.5,
  "seed": null,
  "quality_mode": "balanced"
}
```

## Response

```json
{
  "provider": "modal_flux",
  "model": "FLUX.1-dev",
  "image_base64": "...",
  "seed": 123456,
  "width": 1344,
  "height": 768,
  "requested_steps": 36,
  "actual_steps": 36,
  "guidance_scale": 3.5,
  "quality_mode": "premium",
  "effective_width": 1344,
  "effective_height": 768,
  "negative_prompt_applied": true,
  "elapsed_ms": 8421
}
```

The desktop backend saves the returned image and a metadata JSON file under `Output/image`.
