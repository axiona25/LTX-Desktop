# AXSTUDIO FLUX Image Worker

Modal worker exposing `POST /generate` for FLUX image generation on H100.

## Modal resources

```bash
modal volume create axstudio-flux-cache
modal deploy modal-workers/flux-image/app.py
```

Default model:

```text
black-forest-labs/FLUX.2-klein-9B
```

The worker also routes selected 3D animation styles to:

```text
black-forest-labs/FLUX.1-dev
```

That secondary route is used for Flux.1-only LoRAs such as `Flux 3D Animation Style LoRA`
(`Muapi/flux-3d-animation-style-lora`, Civitai version `922267`).

This worker is the direct FLUX path used by AXSTUDIO for prompt-following and graphic styles.

## Request

```json
{
  "prompt": "cinematic editorial product photo...",
  "negative_prompt": "blurry, low quality",
  "width": 1344,
  "height": 768,
  "steps": 8,
  "guidance_scale": 1.0,
  "seed": null,
  "quality_mode": "balanced"
}
```

## Response

```json
{
  "provider": "modal_flux",
  "model": "black-forest-labs/FLUX.2-klein-9B",
  "image_base64": "...",
  "seed": 123456,
  "width": 1344,
  "height": 768,
  "requested_steps": 8,
  "actual_steps": 8,
  "guidance_scale": 1.0,
  "quality_mode": "premium",
  "effective_width": 1344,
  "effective_height": 768,
  "negative_prompt_applied": true,
  "elapsed_ms": 8421
}
```

The desktop backend saves the returned image and a metadata JSON file under `Output/image`.
