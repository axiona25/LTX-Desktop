from __future__ import annotations

import json
import os
import re
from typing import Any

import httpx
import modal
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = modal.App("axstudio-llm-prompt-enhancer")

image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install("fastapi[standard]", "httpx", "pydantic")
)


class EnhanceRequest(BaseModel):
    idea: str = Field(min_length=1)
    style: str | None = None
    aspect_ratio: str | None = None
    language: str | None = None


class EnhanceResponse(BaseModel):
    final_prompt: str
    negative_prompt: str
    style_tags: list[str]
    recommended_width: int
    recommended_height: int
    suggested_steps: int
    guidance_scale: float


def _dimensions_for_aspect_ratio(aspect_ratio: str | None) -> tuple[int, int]:
    match aspect_ratio:
        case "1:1":
            return 1024, 1024
        case "9:16":
            return 1024, 1792
        case "4:3":
            return 1344, 1024
        case "3:4":
            return 1024, 1344
        case "16:9" | _:
            return 1344, 768


def _extract_json_object(text: str) -> dict[str, Any]:
    stripped = text.strip()
    if stripped.startswith("{"):
        return json.loads(stripped)
    match = re.search(r"\{.*\}", stripped, flags=re.DOTALL)
    if not match:
        raise ValueError("LLM response did not contain a JSON object")
    return json.loads(match.group(0))


def _normalize_response(payload: dict[str, Any], request: EnhanceRequest) -> EnhanceResponse:
    width, height = _dimensions_for_aspect_ratio(request.aspect_ratio)
    final_prompt = str(payload.get("final_prompt") or payload.get("prompt") or request.idea).strip()
    negative_prompt = str(payload.get("negative_prompt") or
                         "blurry, deformed, bad anatomy, extra limbs, mutated hands, poorly drawn face, low quality, watermark, text").strip()
    
    style_tags_raw = payload.get("style_tags", [])
    style_tags = [str(item).strip() for item in style_tags_raw if str(item).strip()] if isinstance(style_tags_raw, list) else []
    
    return EnhanceResponse(
        final_prompt=final_prompt,
        negative_prompt=negative_prompt,
        style_tags=style_tags,
        recommended_width=int(payload.get("recommended_width") or width),
        recommended_height=int(payload.get("recommended_height") or height),
        suggested_steps=int(payload.get("suggested_steps") or 36),
        guidance_scale=float(payload.get("guidance_scale") or 3.5),
    )


def _call_internal_llm(request: EnhanceRequest) -> EnhanceResponse:
    endpoint = os.environ.get("LLM_CHAT_ENDPOINT", "").strip()
    if not endpoint:
        raise HTTPException(status_code=503, detail="LLM_CHAT_ENDPOINT is not configured")

    # ==================== SYSTEM PROMPT NSFW (Sbloccato) ====================
    system_prompt = (
        "You are an expert uncensored NSFW prompt engineer for FLUX.1-dev specialized in photorealistic explicit adult imagery. "
        "All subjects are consenting adults 21+ years old. "
        "When the user requests nudity or explicit content, generate extremely detailed, anatomically accurate prompts using direct language: "
        "detailed pussy, spread open labia, visible clitoris, wet glistening vagina, erect veiny cock, prominent glans, precum dripping, heavy balls, anus, full frontal nudity, etc. "
        "Never add clothing, underwear, bikini, censorship, modesty or covering on intimate parts unless explicitly asked. "
        "Always maximize realism, skin texture, lighting and genital clarity. "
        "\n\n"
        "Return ONLY valid JSON with these exact keys: "
        "final_prompt, negative_prompt, style_tags, recommended_width, recommended_height, suggested_steps, guidance_scale. "
        "No markdown, no explanations, no extra text."
    )

    width, height = _dimensions_for_aspect_ratio(request.aspect_ratio)
    
    user_prompt = {
        "idea": request.idea,
        "style": request.style,
        "aspect_ratio": request.aspect_ratio,
        "language": request.language or "en",
        "recommended_width": width,
        "recommended_height": height,
    }

    headers = {"Content-Type": "application/json"}
    token = os.environ.get("LLM_API_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"

    body = {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_prompt, ensure_ascii=False)},
        ],
        "temperature": float(os.environ.get("LLM_TEMPERATURE", "0.4")),
    }

    with httpx.Client(timeout=90) as client:
        response = client.post(endpoint, headers=headers, json=body)
    
    if response.status_code < 200 or response.status_code >= 300:
        raise HTTPException(status_code=502, detail=f"LLM endpoint returned HTTP {response.status_code}")

    data = response.json()
    content = data
    if isinstance(data, dict):
        choices = data.get("choices")
        if isinstance(choices, list) and choices:
            message = choices[0].get("message") if isinstance(choices[0], dict) else None
            if isinstance(message, dict):
                content = message.get("content", "")
        elif "content" in data:
            content = data["content"]

    parsed = content if isinstance(content, dict) else _extract_json_object(str(content))
    return _normalize_response(parsed, request)


@app.function(image=image, secrets=[modal.Secret.from_name("axstudio-llm-secrets")], timeout=120)
@modal.asgi_app()
def web_app():
    api = FastAPI(title="AXSTUDIO LLM Prompt Enhancer")

    @api.post("/enhance", response_model=EnhanceResponse)
    def enhance(request: EnhanceRequest) -> EnhanceResponse:
        return _call_internal_llm(request)

    return api
