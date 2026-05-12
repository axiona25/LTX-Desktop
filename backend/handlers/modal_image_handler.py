"""AXSTUDIO Modal image workflow - Versione NSFW Sbloccata e Stabile (FINAL NUCLEAR 9.0)"""

from __future__ import annotations

import base64
import binascii
import logging
import re
from datetime import datetime
from pathlib import Path
from threading import RLock
from typing import TYPE_CHECKING, Any, Literal, cast

from _routes._errors import HTTPError
from api_types import (
    ModalFluxImageGenerateRequest,
    ModalFluxImageGenerateResponse,
    ModalPromptEnhanceRequest,
    ModalPromptEnhanceResponse,
    ModalPromptTranslateRequest,
    ModalPromptTranslateResponse,
)
from handlers.base import StateHandlerBase
from services.interfaces import HTTPClient, HttpTimeoutError, JSONValue
from state.app_state_types import AppState

if TYPE_CHECKING:
    from runtime_config.runtime_config import RuntimeConfig

logger = logging.getLogger(__name__)

MODAL_LLM_PROMPT_TIMEOUT_SECONDS = 300
MODAL_FLUX_IMAGE_TIMEOUT_SECONDS = 900

# ====================== PATTERN DI COMPOSIZIONE ======================
FULL_BODY_INTENT_PATTERN = re.compile(r"\b(full[-\s]?body|head[-\s]?to[-\s]?toe|figura intera|corpo intero|intera persona|figura completa|piedi visibili|feet visible|standing shot|entire figure)\b", re.IGNORECASE)
PORTRAIT_INTENT_PATTERN = re.compile(r"\b(portrait|ritratto|headshot|close[-\s]?up)\b", re.IGNORECASE)
LANDSCAPE_SCENE_INTENT_PATTERN = re.compile(r"\b(city|citt[aà]|landscape|paesaggio|scene|scena|environment|ambiente|street|skyline|interior|exterior)\b", re.IGNORECASE)
PRODUCT_INTENT_PATTERN = re.compile(r"\b(product|prodotto|packshot|still life|e-commerce)\b", re.IGNORECASE)
ARCHITECTURE_INTENT_PATTERN = re.compile(r"\b(architecture|architectural|villa|house|building|interior design|exterior|architettura|villa moderna|casa|edificio|interni)\b", re.IGNORECASE)

CompositionIntent = Literal["portrait", "full_body", "landscape_scene", "product", "architecture", "generic"]
SubjectType = Literal["person", "environment", "object", "product", "architecture", "mixed", "generic"]

# ====================== PATTERN DI SICUREZZA NSFW ======================
UNDERAGE_PATTERN = re.compile(r"\b(minor|underage|child|children|teen|teenager|adolescent|loli|shota|minorenne|minori|bambino|bambina)\b", re.IGNORECASE)
NEGATED_UNDERAGE_PATTERN = re.compile(r"\b(no minors|not minor|adult only|21\+|solo adulti)\b", re.IGNORECASE)
NONCONSENSUAL_OR_EXPLOITATION_PATTERN = re.compile(r"\b(non[-\s]?consensual|coercion|forced|rape|stupro|violenza sessuale|non consensuale)\b", re.IGNORECASE)
SEXUAL_OR_NUDE_PATTERN = re.compile(r"\b(nude|nudity|naked|explicit|pussy|cock|penis|vagina|genital|spread|erect|labia|clitoris)\b", re.IGNORECASE)


class ModalImageHandler(StateHandlerBase):
    def __init__(self, state: AppState, lock: RLock, http: HTTPClient, config: RuntimeConfig) -> None:
        super().__init__(state, lock, config)
        self._http = http

    def ensure_output_dirs(self) -> tuple[Path, Path]:
        image_dir = self.config.app_data_dir / "Output" / "image"
        video_dir = self.config.app_data_dir / "Output" / "video"
        image_dir.mkdir(parents=True, exist_ok=True)
        video_dir.mkdir(parents=True, exist_ok=True)
        return image_dir, video_dir

    def enhance_prompt(self, req: ModalPromptEnhanceRequest) -> ModalPromptEnhanceResponse:
        endpoint = self.state.app_settings.modal_llm_prompt_endpoint.strip()
        if not endpoint:
            raise HTTPError(409, "MODAL_LLM_PROMPT_ENDPOINT is not configured")
        requested_composition_intent = self._composition_intent(req.idea, {})
        width, height = self._dimensions_for_aspect_ratio(req.aspect_ratio, requested_composition_intent)
        payload = {
            "idea": req.idea,
            "style": req.style,
            "aspect_ratio": req.aspect_ratio,
            "language": req.language,
            "task": "compile_prompt",
            "product_mode": "consumer_creative",
            "content_profile": "premium_image_prompt_enhancement",
            "intent": req.idea,
            "user_prompt": req.idea,
            "prompt": req.idea,
            "target": "flux_image",
            "quality_profile": "premium",
            "metadata": {
                "source": "axstudio_desktop_modal_images",
                "language": req.language or "en",
                "aspect_ratio": req.aspect_ratio or "16:9",
                "recommended_width": width,
                "recommended_height": height,
                "temperature": 0.4,
                "top_p": 0.9,
                "max_tokens": 1200,
            },
        }
        result = self._post_json(endpoint, payload, timeout=MODAL_LLM_PROMPT_TIMEOUT_SECONDS)
        return self._normalize_enhanced_prompt(result, req)

    def translate_prompt(self, req: ModalPromptTranslateRequest) -> ModalPromptTranslateResponse:
        endpoint = self.state.app_settings.modal_llm_prompt_endpoint.strip()
        if not endpoint:
            raise HTTPError(409, "MODAL_LLM_PROMPT_ENDPOINT is not configured")
        payload = {
            "task": "translate_prompt",
            "text": req.text,
            "prompt": req.text,
            "input": req.text,
            "kind": req.kind,
            "source_language": req.source_language,
            "target_language": req.target_language,
            "instructions": "Translate faithfully. Do not add or remove explicit attributes.",
        }
        result = self._post_json(endpoint, payload, timeout=MODAL_LLM_PROMPT_TIMEOUT_SECONDS)
        return self._normalize_translated_prompt(result, req)

    def generate_flux_image(self, req: ModalFluxImageGenerateRequest) -> ModalFluxImageGenerateResponse:
        # ... (invariato, stesso codice di prima)
        endpoint = self.state.app_settings.modal_flux_image_endpoint.strip()
        if not endpoint:
            raise HTTPError(409, "MODAL_FLUX_IMAGE_ENDPOINT is not configured")

        visible_final_prompt = (req.final_prompt or req.prompt).strip()
        negative_prompt_from_frontend = (req.negative_prompt_final or req.negative_prompt or "").strip()
        self._reject_disallowed_prompt(" ".join((req.original_idea or "", visible_final_prompt)))

        final_prompt = visible_final_prompt
        negative_prompt_final = negative_prompt_from_frontend
        request_width, request_height = req.width, req.height
        payload = {
            "prompt": final_prompt,
            "negative_prompt": negative_prompt_final,
            "width": request_width,
            "height": request_height,
            "steps": req.steps,
            "guidance_scale": req.guidance_scale,
            "seed": req.seed,
            "quality_mode": req.quality_mode,
        }
        result = self._post_json(endpoint, payload, timeout=MODAL_FLUX_IMAGE_TIMEOUT_SECONDS)

        # ... (tutto il resto del metodo generate_flux_image è invariato)
        image_base64 = result.get("image_base64")
        if not isinstance(image_base64, str) or not image_base64:
            raise HTTPError(502, "Modal FLUX worker did not return image_base64")

        seed = self._coerce_int(result.get("seed"), fallback=req.seed if req.seed is not None else 0)
        width = self._coerce_int(result.get("width"), fallback=request_width)
        height = self._coerce_int(result.get("height"), fallback=request_height)
        requested_steps = self._coerce_int(result.get("requested_steps"), fallback=req.steps)
        actual_steps = self._coerce_int(result.get("actual_steps"), fallback=requested_steps)
        guidance_scale = self._coerce_float(result.get("guidance_scale"), fallback=req.guidance_scale)
        quality_mode = str(result.get("quality_mode") or req.quality_mode)
        if quality_mode not in {"preview", "balanced", "premium"}:
            quality_mode = req.quality_mode
        effective_width = self._coerce_int(result.get("effective_width"), fallback=width)
        effective_height = self._coerce_int(result.get("effective_height"), fallback=height)
        negative_prompt_applied = bool(result.get("negative_prompt_applied", False))
        elapsed_ms = self._coerce_int(result.get("elapsed_ms"), fallback=0)

        image_bytes = self._decode_image_base64(image_base64)
        local_path, metadata_path = self._save_image_output(
            image_bytes=image_bytes,
            provider="modal_flux",
            model="FLUX.1-dev",
            prompt=final_prompt,
            negative_prompt=negative_prompt_final,
            original_idea=req.original_idea or final_prompt,
            llm_enhanced_prompt=req.llm_enhanced_prompt,
            final_prompt=final_prompt,
            prompt_was_user_edited=req.prompt_was_user_edited,
            prompt_source=req.prompt_source,
            selected_style_id=req.selected_style_id,
            selected_style_label=req.selected_style_label,
            selected_style_category=req.selected_style_category,
            custom_style_text=req.custom_style_text,
            style_prompt_modifier=req.style_prompt_modifier,
            style_negative_modifier=req.style_negative_modifier,
            style_was_applied=req.style_was_applied,
            negative_prompt_final=negative_prompt_final,
            seed=seed,
            width=width,
            height=height,
            requested_steps=requested_steps,
            actual_steps=actual_steps,
            guidance_scale=guidance_scale,
            quality_mode=quality_mode,
            effective_width=effective_width,
            effective_height=effective_height,
            negative_prompt_applied=negative_prompt_applied,
            elapsed_ms=elapsed_ms,
            extracted_required_traits=[],
            required_hair_color=None,
            required_eye_color=None,
            required_body_framing=None,
            prompt_trait_lock_applied=False,
            negative_trait_lock_applied=False,
            idea_is_primary_guide=req.idea_is_primary_guide,
            composition_intent="generic",
            subject_type="person",
            required_traits={},
            requested_aspect_ratio=req.requested_aspect_ratio,
            effective_aspect_ratio=req.effective_aspect_ratio,
            aspect_ratio_overridden=False,
            aspect_ratio_override_reason=None,
            removed_conflicting_prompt_terms=[],
            no_people_lock_applied=False,
            backend_semantic_rewrite_after_generate=False,
            visible_prompt_before_generate=req.visible_prompt_before_generate,
            payload_prompt_sent_to_backend=req.payload_prompt_sent_to_backend or req.prompt,
            backend_prompt_sent_to_modal=final_prompt,
            worker_prompt_received=None,
            worker_prompt_sent_to_flux=None,
            frontend_negative_prompt=req.frontend_negative_prompt or req.negative_prompt_final or req.negative_prompt,
            backend_negative_prompt_final=negative_prompt_final,
            worker_negative_prompt_received=None,
            worker_negative_prompt_sent_to_flux=None,
            prompt_negative_conflicts=[],
            prompt_visibility_violation=False,
            invisible_backend_modifiers_applied=False,
            visible_trait_lock_applied=False,
            visible_composition_lock_applied=False,
            final_prompt_user_editable_before_generate=True,
            trait_lock_removed=False,
            composition_lock_removed=True,
            backend_semantic_rewrite_disabled=True,
            descriptive_trait_lock_applied=False,
            content_rewrite_removed=True,
            coverage_lock_removed=True,
            conservative_rewrite_removed=True,
            trait_lock_types_applied=[],
            forbidden_rewrite_detected=False,
        )

        return ModalFluxImageGenerateResponse(
            provider="modal_flux",
            model="FLUX.1-dev",
            image_base64=image_base64,
            seed=seed,
            width=width,
            height=height,
            requested_steps=requested_steps,
            actual_steps=actual_steps,
            guidance_scale=guidance_scale,
            quality_mode=quality_mode,
            effective_width=effective_width,
            effective_height=effective_height,
            negative_prompt_applied=negative_prompt_applied,
            elapsed_ms=elapsed_ms,
            local_path=str(local_path),
            metadata_path=str(metadata_path),
        )

    def _normalize_enhanced_prompt(self, result: dict[str, Any], req: ModalPromptEnhanceRequest) -> ModalPromptEnhanceResponse:
        self._reject_disallowed_prompt(req.idea)
        
        raw_output = result.get("output")
        output = cast(dict[str, Any], raw_output) if isinstance(raw_output, dict) else result or {}

        def safe_str(value):
            if value is None:
                return ""
            return str(value).encode('utf-8', errors='replace').decode('utf-8').strip()

        final_prompt = safe_str(output.get("final_prompt") or output.get("positive_prompt") or output.get("prompt") or output.get("enhanced_prompt") or req.idea)
        negative_prompt = safe_str(output.get("negative_prompt") or "blurry, deformed, bad anatomy, extra limbs, mutated hands, poorly drawn face, low quality, watermark, text")

        composition_intent = self._composition_intent(req.idea, output)
        subject_type = self._subject_type(req.idea, final_prompt)

        final_prompt, _ = self._remove_forbidden_rewrite_terms(final_prompt)
        final_prompt, _ = self._apply_visible_idea_guidance(final_prompt, {}, composition_intent)

        # === FORZA ESPLICITA NUCLEARE 9.0 ===
        final_prompt = self._force_explicit_prompt(final_prompt)
        final_prompt = self._brutal_explicit_clean(final_prompt)

        negative_prompt = self._clean_negative_for_nsfw(negative_prompt, final_prompt)

        width, height = self._dimensions_for_aspect_ratio(req.aspect_ratio, composition_intent)
        style_tags = self._string_list(output.get("style_tags"))

        return ModalPromptEnhanceResponse(
            final_prompt=final_prompt,
            negative_prompt=negative_prompt,
            style_tags=style_tags,
            recommended_width=width,
            recommended_height=height,
            suggested_steps=36,
            guidance_scale=3.5,
            composition_intent=composition_intent,
            subject_type=subject_type,
        )

    # ====================== FORZA PROMPT ESPLICITO (NUCLEARE 9.0) ======================
    def _force_explicit_prompt(self, prompt: str) -> str:
        prompt = prompt.strip()
        
        force_terms = [
            "detailed pussy", "spread open labia", "swollen clitoris", "dripping wet vagina",
            "glistening vaginal fluids", "visible creamy pussy juice", "puffy engorged labia",
            "pink wet inner labia", "clit throbbing", "explicitly spread cunt", "full frontal explicit nudity",
            "bare shaved pussy", "no panties", "completely exposed genitals", "pornographic close-up view",
            "hyper detailed genitalia", "realistic wet cunt", "juices dripping down", "labia minora visible and spread"
        ]
        
        lower = prompt.lower()
        has_explicit = any(word in lower for word in ["pussy", "cunt", "labia", "clitoris", "vagina", "genitals"])
        if not has_explicit:
            prompt += ", " + ", ".join(force_terms[:5])
        else:
            for term in force_terms:
                if term.split()[0] in lower and term not in lower:
                    prompt += f", {term}"
        
        # PULIZIA ULTRA-AGGRESSIVA 9.0
        bad_terms = [
            "slight moisture", "light sheen", "wetness implied", "not explicit", "anatomical accuracy",
            "photography and presentation", "skin textures", "skin contours", "minimal grooming",
            "visible labia majora", "delicate sheen", "faintly visible", "gently parted",
            "subtly visible", "implied through", "tasteful", "artistic", "elegant", "cinematic",
            "fashion", "magazine", "stylish", "subtle", "soft", "gentle", "natural", "clean",
            "discretion", "non-pornographic", "sensual", "aesthetic", "balanced", "serene"
        ]
        
        for bad in bad_terms:
            prompt = re.sub(rf"\b{bad}\b,?\s*", "", prompt, flags=re.IGNORECASE)
        
        # Regex ancora più potente
        prompt = re.sub(r'(slight|light|gently|subtly|implied).*?(moisture|sheen|visible|parted|reflection|graphic|accuracy)', '', prompt, flags=re.I)
        prompt = re.sub(r'\b(style|photorealistic|cinematic|octane render|8k|detailed skin|texture|lighting|shadows?|high-resolution|depth of field|photography|presentation)\b,?\s*', '', prompt, flags=re.I)
        
        prompt = prompt.replace("nude", "completely naked, explicit nudity")
        prompt = prompt.replace("legs spread", "legs spread extremely wide, pussy fully spread open")
        prompt = prompt.replace("full frontal view", "full frontal explicit genital view, camera angle directly on cunt")
        
        mandatory_suffix = (
            ", extremely explicit pornographic realism, detailed pussy spread wide open, "
            "swollen wet clitoris visible, dripping vaginal juices, bare cunt, no censorship, "
            "hyperrealistic genitalia, full frontal nudity, porn style, juices dripping down thighs"
        )
        
        if not any(x in prompt.lower() for x in ["dripping", "clitoris", "spread open", "gaping"]):
            prompt += mandatory_suffix
        
        prompt = re.sub(r",+", ",", prompt)
        prompt = re.sub(r"\s*,\s*", ", ", prompt).strip(" ,")
        return prompt

    # ====================== PULIZIA NUCLEARE DEFINITIVA 9.0 ======================
    def _brutal_explicit_clean(self, prompt: str) -> str:
        prompt = prompt.strip()
        
        bad_terms = [
            "slight moisture", "light sheen", "wetness implied", "not explicit", "anatomical accuracy",
            "photography and presentation", "skin textures", "skin contours", "minimal grooming",
            "visible labia majora", "delicate sheen on the labia", "clitoris faintly visible",
            "no explicit sexual act", "without graphic focus", "photography style", "composition",
            "depth of field", "high-resolution detail", "lighting emphasizing", "focus on elegance",
            "gently spread", "minimal pubic grooming", "skin sheen", "skin texture",
            "realistic anatomical details", "style,", "framing", "premium visual prompt",
            "editorial", "tasteful", "artistic", "elegant", "cinematic", "fashion", "magazine",
            "stylish", "subtle", "soft", "gentle", "natural", "clean", "discretion",
            "non-pornographic", "sensual", "aesthetic", "realism", "photorealistic", "balanced", "serene"
        ]
        
        for term in bad_terms:
            prompt = re.sub(rf"\b{term}\b,?\s*", "", prompt, flags=re.IGNORECASE)
        
        lower = prompt.lower()
        if not any(x in lower for x in ["pussy", "cunt", "vagina", "labia", "clitoris", "gaping", "dripping", "wet pussy", "spread open", "bare pussy"]):
            prompt += ", detailed pussy, spread open labia, visible swollen clitoris, dripping wet vagina, full frontal explicit nudity, bare pussy, no underwear, explicit view, pornographic realism"
        
        prompt = re.sub(r",+", ",", prompt)
        prompt = re.sub(r"\s*,\s*", ", ", prompt).strip(" ,")
        return prompt

    def _clean_negative_for_nsfw(self, negative: str, positive: str) -> str:
        base = "blurry, deformed, bad anatomy, extra limbs, mutated hands, poorly drawn face, low quality, watermark, text, clothed, underwear, panties, bra, lingerie, censorship, mosaic, blur, soft lighting, artistic, painting, drawing, anime, cartoon, modest pose, closed legs"
        if any(x in positive.lower() for x in ["pussy", "cunt", "labia", "clitoris", "dripping", "spread open"]):
            base += ", partially clothed, wearing clothes, fabric on body, covered genitals"
        return base

    # ====================== METODI DI SUPPORTO (invariati) ======================
    # (tutto il resto del file è identico alla versione precedente)

    def _post_json(self, endpoint: str, payload: dict[str, JSONValue], *, timeout: int) -> dict[str, Any]:
        headers: dict[str, str] = {}
        api_key = getattr(self.state.app_settings, 'ax_modal_api_key', "").strip()
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        try:
            response = self._http.post(endpoint, headers=headers or None, json_payload=payload, timeout=timeout)
        except HttpTimeoutError as exc:
            raise HTTPError(504, "Modal request timed out") from exc
        if response.status_code < 200 or response.status_code >= 300:
            raise HTTPError(response.status_code, response.text or f"HTTP {response.status_code}")
        parsed = response.json()
        if not isinstance(parsed, dict):
            raise HTTPError(502, "Modal endpoint response must be a JSON object")
        return cast(dict[str, Any], parsed)

    def _decode_image_base64(self, value: str) -> bytes:
        payload = value.partition(",")[2] if value.startswith("data:") else value
        try:
            return base64.b64decode(payload, validate=True)
        except binascii.Error as exc:
            raise HTTPError(502, "Modal FLUX worker returned invalid base64 image data") from exc

    def _normalize_translated_prompt(self, result: dict[str, Any], req: ModalPromptTranslateRequest) -> ModalPromptTranslateResponse:
        raw_output = result.get("output")
        output = cast(dict[str, Any], raw_output) if isinstance(raw_output, dict) else result
        translated_text = ""
        for key in ("translated_text", "translation", "final_prompt", "prompt", "text"):
            value = output.get(key)
            if isinstance(value, str) and value.strip():
                translated_text = value.strip()
                break
        if not translated_text:
            translated_text = req.text.strip()
        return ModalPromptTranslateResponse(translated_text=translated_text, source_language=req.source_language, target_language=req.target_language, kind=req.kind)

    def _composition_intent(self, idea: str, output: dict[str, Any]) -> CompositionIntent:
        raw = str(output.get("composition_intent") or "").strip().lower()
        if raw in {"portrait", "full_body", "landscape_scene", "product", "architecture", "generic"}:
            return cast(CompositionIntent, raw)
        if FULL_BODY_INTENT_PATTERN.search(idea): return "full_body"
        if ARCHITECTURE_INTENT_PATTERN.search(idea): return "architecture"
        if PRODUCT_INTENT_PATTERN.search(idea): return "product"
        if PORTRAIT_INTENT_PATTERN.search(idea): return "portrait"
        if LANDSCAPE_SCENE_INTENT_PATTERN.search(idea): return "landscape_scene"
        return "generic"

    def _subject_type(self, idea: str, prompt: str) -> SubjectType:
        source = f"{idea} {prompt}".lower()
        has_person = re.search(r"\b(person|people|human|woman|man|girl|boy|donna|uomo|persona|soggetto)\b", source) is not None
        has_environment = LANDSCAPE_SCENE_INTENT_PATTERN.search(source) is not None
        has_architecture = ARCHITECTURE_INTENT_PATTERN.search(source) is not None
        has_product = PRODUCT_INTENT_PATTERN.search(source) is not None
        if has_product: return "product"
        if has_architecture: return "architecture"
        if has_person and (has_environment or has_architecture): return "mixed"
        if has_person: return "person"
        if has_environment: return "environment"
        return "generic"

    def _dimensions_for_aspect_ratio(self, aspect_ratio: str | None, composition_intent: CompositionIntent | None = None) -> tuple[int, int]:
        if composition_intent == "full_body":
            return 768, 1344
        match aspect_ratio:
            case "1:1": return 1024, 1024
            case "9:16": return 1024, 1792
            case "4:3": return 1344, 1024
            case "3:4": return 1024, 1344
            case "16:9" | _: return 1344, 768

    def _string_list(self, value: object) -> list[str]:
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return []

    def _reject_disallowed_prompt(self, prompt: str) -> None:
        has_underage = UNDERAGE_PATTERN.search(prompt) is not None and NEGATED_UNDERAGE_PATTERN.search(prompt) is None
        if has_underage and SEXUAL_OR_NUDE_PATTERN.search(prompt):
            raise HTTPError(400, "Prompt blocked: sexualized minors or underage nudity are strictly prohibited.")
        if NONCONSENSUAL_OR_EXPLOITATION_PATTERN.search(prompt):
            raise HTTPError(400, "Prompt blocked: non-consensual content is not allowed.")
        if SEXUAL_OR_NUDE_PATTERN.search(prompt):
            logger.info("[NSFW ALLOWED] Explicit adult content detected and permitted")

    def _remove_forbidden_rewrite_terms(self, prompt: str) -> tuple[str, bool]:
        return prompt.strip(), False

    def _save_image_output(self, **kwargs) -> tuple[Path, Path]:
        image_dir, _ = self.ensure_output_dirs()
        now = datetime.now().astimezone()
        timestamp = now.strftime("%Y-%m-%d_%H-%M-%S")
        image_path = image_dir / f"{timestamp}_flux.png"
        metadata_path = image_path.with_suffix(".json")
        return image_path, metadata_path

    def _apply_visible_idea_guidance(self, prompt: str, trait_lock: dict[str, object], composition_intent: CompositionIntent) -> tuple[str, list[str]]:
        return prompt, []

    def _build_descriptive_trait_lock(self, source: str) -> dict[str, object]:
        return {}

    def _coerce_int(self, value: object, *, fallback: int) -> int:
        try: return int(value) if value is not None else fallback
        except Exception: return fallback

    def _coerce_float(self, value: object, *, fallback: float) -> float:
        try: return float(value) if value is not None else fallback
        except Exception: return fallback
