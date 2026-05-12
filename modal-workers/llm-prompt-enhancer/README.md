# AXSTUDIO LLM Prompt Enhancer Worker

Modal worker exposing `POST /enhance` for AXSTUDIO image prompt planning.

## Deploy

```bash
modal secret create axstudio-llm-secrets \
  LLM_CHAT_ENDPOINT=https://your-internal-llm-endpoint/v1/chat/completions \
  LLM_API_TOKEN=your-token-if-needed

modal deploy modal-workers/llm-prompt-enhancer/app.py
```

## Request

```json
{
  "idea": "a cinematic product shot of a futuristic espresso machine",
  "style": "editorial luxury",
  "aspect_ratio": "16:9",
  "language": "en"
}
```

## Response

```json
{
  "final_prompt": "...",
  "negative_prompt": "...",
  "style_tags": ["editorial", "luxury"],
  "recommended_width": 1344,
  "recommended_height": 768,
  "suggested_steps": 28,
  "guidance_scale": 3.5
}
```

Secrets are read from environment variables and are never printed.
