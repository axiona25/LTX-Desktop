"""AXSTUDIO Modal image workflow.

Prompt enhancement and image rendering are intentionally separate calls. The
backend owns local persistence so renderer code never needs filesystem access
and generated assets are always available for later scene/video/character use.
"""

from __future__ import annotations

import base64
import binascii
import logging
import re
import time
from datetime import datetime
from pathlib import Path
from threading import RLock
from typing import TYPE_CHECKING, Any, Literal, cast

from _routes._errors import HTTPError
from api_types import (
    JsonObject,
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
FULL_BODY_INTENT_PATTERN = re.compile(
    r"\b(full[-\s]?body|head[-\s]?to[-\s]?toe|figura intera|corpo intero|intera persona|figura completa|piedi visibili|feet visible|standing shot|entire figure)\b",
    re.IGNORECASE,
)
PORTRAIT_INTENT_PATTERN = re.compile(r"\b(portrait|ritratto|headshot|close[-\s]?up)\b", re.IGNORECASE)
LANDSCAPE_SCENE_INTENT_PATTERN = re.compile(
    r"\b(city|citt[aà]|landscape|paesaggio|scene|scena|environment|ambiente|street|skyline|interior|exterior)\b",
    re.IGNORECASE,
)
PRODUCT_INTENT_PATTERN = re.compile(r"\b(product|prodotto|packshot|still life|e-commerce)\b", re.IGNORECASE)
ARCHITECTURE_INTENT_PATTERN = re.compile(
    r"\b(architecture|architectural|villa|house|building|interior design|exterior|architettura|villa moderna|casa|edificio|interni)\b",
    re.IGNORECASE,
)
CompositionIntent = Literal["portrait", "full_body", "landscape_scene", "product", "architecture", "generic"]
SubjectType = Literal["person", "environment", "object", "product", "architecture", "mixed", "generic"]
UNDERAGE_PATTERN = re.compile(
    r"\b(minor|underage|child|children|teen|teenager|adolescent|minorenne|minori|bambino|bambina|bambini|adolescente)\b",
    re.IGNORECASE,
)
NEGATED_UNDERAGE_PATTERN = re.compile(
    r"\b(no minors|not minor|not underage|adult only|no children|senza minori|nessun minore|solo adulti)\b",
    re.IGNORECASE,
)
SEXUAL_OR_NUDE_PATTERN = re.compile(
    r"\b(nude|nudity|naked|sex|sexual|erotic|porn|genital|genitals|nuda|nudo|nudità|sesso|sessuale|erotico|pornograf|genitali)\b",
    re.IGNORECASE,
)
NONCONSENSUAL_OR_EXPLOITATION_PATTERN = re.compile(
    r"\b(non[-\s]?consensual|coercion|coerced|forced sex|rape|sexual assault|trafficking|exploitation|abuse|"
    r"non consensuale|coercizione|costrett[oa]|stupro|violenza sessuale|sfruttamento|abuso)\b",
    re.IGNORECASE,
)
PROMPT_NEGATIVE_CONFLICT_TERMS = (
    "dark brunette hair",
    "dark brown hair",
    "black hair",
    "blonde hair",
    "red hair",
    "blue eyes",
    "green eyes",
    "brown eyes",
    "full-body standing shot",
    "head-to-toe framing",
    "entire figure visible",
    "feet visible",
    "wide shot",
    "portrait",
    "close-up",
    "half-body",
    "photorealistic",
    "ultra realistic",
    "cinematic",
    "anime",
    "cartoon",
    "illustration",
    "3d render",
    "people",
    "person",
    "human figure",
    "woman",
    "man",
)
FULL_BODY_CONFLICT_TERMS = (
    "cropped portrait",
    "upper body",
    "half-body",
    "bust shot",
    "headshot",
    "close-up",
    "portrait",
)
FULL_BODY_VISIBLE_REINFORCEMENTS = (
    "full-body standing shot",
    "head-to-toe framing",
    "entire figure visible",
    "hands visible",
    "feet visible",
    "centered full figure",
    "no cropping",
)
NO_PEOPLE_CONFLICT_TERMS = (
    "full-body standing shot",
    "full-body framing",
    "head-to-toe framing",
    "head-to-toe composition",
    "entire figure visible",
    "both hands and both feet visible",
    "both hands",
    "both feet",
    "hands visible",
    "feet visible",
    "centered full figure",
    "person",
    "people",
    "human figure",
    "woman",
    "man",
    "adult subject",
    "subject",
    "figure",
    "silhouette",
    "lone figure",
)
FORBIDDEN_REWRITE_TERM_PATTERN = re.compile(
    r"\b(covered body|covered genitals|covered|underwear|bikini|lingerie|modest|modesty|conservative|"
    r"censored|censorship|mosaic|blurred intimate areas|blurred genitals|tasteful|non[-\s]?explicit|"
    r"no explicit nudity|non[-\s]?pornographic|"
    r"safe editorial|rather than explicitness|avoiding close-ups or graphic detail|"
    r"avoid(?:ing)? graphic detail|copert[ao]|intimo|censurat[oa]|mosaico)\b",
    re.IGNORECASE,
)
ADULT_TRAIT_PATTERN = re.compile(r"\b(adult|adulta|adulto|mature|woman|man|person|donna|uomo|persona)\b", re.IGNORECASE)
NO_PEOPLE_PATTERN = re.compile(
    r"\b(no people|without people|no person|no human|empty city|empty street|empty scene|"
    r"senza persone|nessuna persona|nessun umano|citt[aà] vuota|strada vuota|scena vuota)\b",
    re.IGNORECASE,
)
HAIR_TRAIT_PATTERNS: tuple[tuple[str, re.Pattern[str], str, tuple[str, ...]], ...] = (
    (
        "black",
        re.compile(r"\b(black hair|capelli neri)\b", re.IGNORECASE),
        "black hair clearly visible",
        ("blonde hair", "red hair", "light brown hair"),
    ),
    (
        "dark brunette",
        re.compile(r"\b(dark brunette|dark brown hair|brunette|capelli castani scuri|capelli castani|bruna|mora)\b", re.IGNORECASE),
        "dark brunette hair clearly visible",
        ("blonde hair", "red hair", "light blonde hair"),
    ),
    (
        "blonde",
        re.compile(r"\b(blonde hair|blond hair|capelli biondi|bionda|biondo)\b", re.IGNORECASE),
        "blonde hair clearly visible",
        ("black hair", "dark brunette hair", "red hair"),
    ),
    (
        "red",
        re.compile(r"\b(red hair|ginger hair|auburn hair|capelli rossi|rossa|rosso)\b", re.IGNORECASE),
        "red hair clearly visible",
        ("black hair", "blonde hair", "dark brunette hair"),
    ),
)
EYE_TRAIT_PATTERNS: tuple[tuple[str, re.Pattern[str], str, tuple[str, ...]], ...] = (
    (
        "blue",
        re.compile(r"\b(blue eyes|occhi blu|occhi azzurri)\b", re.IGNORECASE),
        "clearly visible blue eyes, eye color remains blue",
        ("brown eyes", "green eyes", "dark eyes", "unclear eye color"),
    ),
    (
        "green",
        re.compile(r"\b(green eyes|occhi verdi)\b", re.IGNORECASE),
        "clearly visible green eyes, eye color remains green",
        ("blue eyes", "brown eyes", "dark eyes", "unclear eye color"),
    ),
    (
        "brown",
        re.compile(r"\b(brown eyes|dark eyes|occhi marroni|occhi castani|occhi scuri)\b", re.IGNORECASE),
        "clearly visible brown eyes, eye color remains brown",
        ("blue eyes", "green eyes", "unclear eye color"),
    ),
)
BODY_TRAIT_PATTERNS: tuple[tuple[str, re.Pattern[str], str, tuple[str, ...]], ...] = (
    ("robust_body", re.compile(r"\b(robust body|robust build|corporatura robusta|robusta)\b", re.IGNORECASE), "robust body type matching the prompt", ("skinny body", "slim body")),
    ("athletic_body", re.compile(r"\b(athletic body|athletic physique|athletic|fisico atletico|atletica|atletico)\b", re.IGNORECASE), "athletic physique matching the prompt", ("unathletic body",)),
    ("curvy_body", re.compile(r"\b(curvy body|curvy|fianchi larghi|curve|formosa)\b", re.IGNORECASE), "curvy body proportions matching the prompt", ("straight narrow body",)),
    ("slim_body", re.compile(r"\b(slim body|slender figure|figura slanciata|snella|slanciata)\b", re.IGNORECASE), "slender figure matching the prompt", ("robust body", "stocky body")),
    ("tall_stature", re.compile(r"\b(tall stature|tall person|persona alta|alta statura|alto|alta)\b", re.IGNORECASE), "tall stature matching the prompt", ("short stature",)),
    ("short_stature", re.compile(r"\b(short stature|short person|persona bassa|bassa statura|basso|bassa)\b", re.IGNORECASE), "short stature matching the prompt", ("tall stature",)),
    ("prosperous_bust", re.compile(r"\b(prosperous bust|full bust|large breasts|lush breasts|seno prosperoso|seno abbondante)\b", re.IGNORECASE), "prosperous bust matching the prompt", ("small bust", "flat chest")),
)


class ModalImageHandler(StateHandlerBase):
    def __init__(
        self,
        state: AppState,
        lock: RLock,
        http: HTTPClient,
        config: RuntimeConfig,
    ) -> None:
        super().__init__(state, lock, config)
        self._http = http

    def enhance_prompt(self, req: ModalPromptEnhanceRequest) -> ModalPromptEnhanceResponse:
        endpoint = self.state.app_settings.modal_llm_prompt_endpoint.strip()
        if not endpoint:
            raise HTTPError(409, "MODAL_LLM_PROMPT_ENDPOINT is not configured")

        requested_composition_intent = self._composition_intent(req.idea, {})
        width, height = self._dimensions_for_aspect_ratio(req.aspect_ratio, requested_composition_intent)
        payload: dict[str, JSONValue] = {
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
        # Modal LLM workers can exceed two minutes on cold start; keep this below
        # image generation but long enough for the existing prompt engine to wake.
        result = self._post_json(endpoint, payload, timeout=MODAL_LLM_PROMPT_TIMEOUT_SECONDS)
        return self._normalize_enhanced_prompt(result, req)

    def translate_prompt(self, req: ModalPromptTranslateRequest) -> ModalPromptTranslateResponse:
        endpoint = self.state.app_settings.modal_llm_prompt_endpoint.strip()
        if not endpoint:
            raise HTTPError(409, "MODAL_LLM_PROMPT_ENDPOINT is not configured")

        payload: dict[str, JSONValue] = {
            "task": "translate_prompt",
            "text": req.text,
            "prompt": req.text,
            "input": req.text,
            "kind": req.kind,
            "source_language": req.source_language,
            "target_language": req.target_language,
            "instructions": (
                "Translate the provided image-generation prompt faithfully. "
                "Do not add new creative details, do not remove explicit user-requested attributes, "
                "do not apply safety rewrites, and preserve bracketed style blocks semantically. "
                "Return only the translated text."
            ),
            "metadata": {
                "source": "axstudio_desktop_modal_images",
                "translation_mode": "prompt_visibility_sync",
                "kind": req.kind,
            },
        }
        result = self._post_json(endpoint, payload, timeout=MODAL_LLM_PROMPT_TIMEOUT_SECONDS)
        return self._normalize_translated_prompt(result, req)

    def generate_flux_image(self, req: ModalFluxImageGenerateRequest) -> ModalFluxImageGenerateResponse:
        endpoint = self.state.app_settings.modal_flux_image_endpoint.strip()
        if not endpoint:
            raise HTTPError(409, "MODAL_FLUX_IMAGE_ENDPOINT is not configured")

        visible_final_prompt = (req.final_prompt or req.prompt).strip()
        negative_prompt_from_frontend = (req.negative_prompt_final or req.negative_prompt or "").strip()
        self._reject_disallowed_prompt(" ".join((req.original_idea or "", visible_final_prompt)))
        trait_lock = self._build_descriptive_trait_lock(
            " ".join(
                part
                for part in (
                    req.original_idea or "",
                    req.llm_enhanced_prompt or "",
                    visible_final_prompt,
                )
                if part
            )
        )
        # /generate must not apply hidden semantic rewrites. Any idea-guided
        # trait/framing reinforcement must already be visible in the editable
        # prompt before this request is sent.
        final_prompt = visible_final_prompt
        negative_prompt_final = negative_prompt_from_frontend
        request_width, request_height = req.width, req.height
        payload: dict[str, JSONValue] = {
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
        provider = str(result.get("provider", "modal_flux"))
        model = str(result.get("model", "FLUX.1-dev"))
        if provider != "modal_flux" or model != "FLUX.1-dev":
            raise HTTPError(502, "Modal FLUX worker returned an unexpected provider/model")

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
        prompt_negative_conflicts = self._find_prompt_negative_conflicts(final_prompt, negative_prompt_final)
        composition_intent = self._coerce_composition_intent(
            req.composition_intent,
            req.original_idea or "",
            final_prompt,
        )
        subject_type = self._coerce_subject_type(req.subject_type, req.original_idea or "", final_prompt)
        required_traits = req.required_traits or self._required_traits_from_trait_lock(trait_lock)
        trait_lock_types_applied = req.trait_lock_types_applied or cast(list[str], trait_lock["trait_lock_types"])
        descriptive_trait_lock_applied = req.descriptive_trait_lock_applied or bool(trait_lock_types_applied)
        no_people_lock_applied = req.no_people_lock_applied or "no_people" in trait_lock_types_applied
        forbidden_rewrite_detected = self._contains_forbidden_rewrite(negative_prompt_final)

        image_bytes = self._decode_image_base64(image_base64)
        local_path, metadata_path = self._save_image_output(
            image_bytes=image_bytes,
            provider=provider,
            model=model,
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
            extracted_required_traits=cast(list[str], trait_lock["extracted_required_traits"]),
            required_hair_color=cast(str | None, trait_lock["required_hair_color"]),
            required_eye_color=cast(str | None, trait_lock["required_eye_color"]),
            required_body_framing=cast(str | None, trait_lock["required_body_framing"]),
            prompt_trait_lock_applied=descriptive_trait_lock_applied,
            negative_trait_lock_applied=descriptive_trait_lock_applied and bool(negative_prompt_final),
            idea_is_primary_guide=req.idea_is_primary_guide,
            composition_intent=composition_intent,
            subject_type=subject_type,
            required_traits=required_traits,
            requested_aspect_ratio=req.requested_aspect_ratio,
            effective_aspect_ratio=req.effective_aspect_ratio,
            aspect_ratio_overridden=req.aspect_ratio_overridden,
            aspect_ratio_override_reason=req.aspect_ratio_override_reason,
            removed_conflicting_prompt_terms=req.removed_conflicting_prompt_terms,
            no_people_lock_applied=no_people_lock_applied,
            backend_semantic_rewrite_after_generate=False,
            visible_prompt_before_generate=req.visible_prompt_before_generate,
            payload_prompt_sent_to_backend=req.payload_prompt_sent_to_backend or req.prompt,
            backend_prompt_sent_to_modal=final_prompt,
            worker_prompt_received=self._optional_str(result.get("worker_prompt_received")),
            worker_prompt_sent_to_flux=self._optional_str(result.get("worker_prompt_sent_to_flux")),
            frontend_negative_prompt=req.frontend_negative_prompt or req.negative_prompt_final or req.negative_prompt,
            backend_negative_prompt_final=negative_prompt_final,
            worker_negative_prompt_received=self._optional_str(result.get("worker_negative_prompt_received")),
            worker_negative_prompt_sent_to_flux=self._optional_str(result.get("worker_negative_prompt_sent_to_flux")),
            prompt_negative_conflicts=prompt_negative_conflicts,
            prompt_visibility_violation=self._prompt_visibility_violation(
                final_prompt,
                self._optional_str(result.get("worker_prompt_received")),
                self._optional_str(result.get("worker_prompt_sent_to_flux")),
            ),
            invisible_backend_modifiers_applied=False,
            visible_trait_lock_applied=False,
            visible_composition_lock_applied=False,
            final_prompt_user_editable_before_generate=True,
            trait_lock_removed=False,
            composition_lock_removed=True,
            backend_semantic_rewrite_disabled=True,
            descriptive_trait_lock_applied=descriptive_trait_lock_applied,
            content_rewrite_removed=True,
            coverage_lock_removed=True,
            conservative_rewrite_removed=True,
            trait_lock_types_applied=trait_lock_types_applied,
            forbidden_rewrite_detected=forbidden_rewrite_detected,
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
            quality_mode=cast(Any, quality_mode),
            effective_width=effective_width,
            effective_height=effective_height,
            negative_prompt_applied=negative_prompt_applied,
            elapsed_ms=elapsed_ms,
            local_path=str(local_path),
            metadata_path=str(metadata_path),
        )

    def ensure_output_dirs(self) -> tuple[Path, Path]:
        image_dir = self.config.app_data_dir / "Output" / "image"
        video_dir = self.config.app_data_dir / "Output" / "video"
        image_dir.mkdir(parents=True, exist_ok=True)
        video_dir.mkdir(parents=True, exist_ok=True)
        return image_dir, video_dir

    def _post_json(self, endpoint: str, payload: dict[str, JSONValue], *, timeout: int) -> dict[str, Any]:
        headers: dict[str, str] = {}
        api_key = self.state.app_settings.ax_modal_api_key.strip()
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        try:
            response = self._http.post(endpoint, headers=headers or None, json_payload=payload, timeout=timeout)
        except HttpTimeoutError as exc:
            raise HTTPError(504, "Modal request timed out") from exc

        if response.status_code < 200 or response.status_code >= 300:
            detail = response.text or f"Modal endpoint returned HTTP {response.status_code}"
            raise HTTPError(response.status_code, detail)

        try:
            parsed = response.json()
        except Exception as exc:
            raise HTTPError(502, "Modal endpoint returned invalid JSON") from exc

        if not isinstance(parsed, dict):
            raise HTTPError(502, "Modal endpoint response must be a JSON object")
        return cast(dict[str, Any], parsed)

    def _decode_image_base64(self, value: str) -> bytes:
        payload = value.partition(",")[2] if value.startswith("data:") else value
        try:
            return base64.b64decode(payload, validate=True)
        except binascii.Error as exc:
            raise HTTPError(502, "Modal FLUX worker returned invalid base64 image data") from exc

    def _normalize_enhanced_prompt(
        self,
        result: dict[str, Any],
        req: ModalPromptEnhanceRequest,
    ) -> ModalPromptEnhanceResponse:
        self._reject_disallowed_prompt(req.idea)
        raw_output = result.get("output")
        output = cast(dict[str, Any], raw_output) if isinstance(raw_output, dict) else result
        raw_metadata = output.get("metadata")
        metadata = cast(dict[str, Any], raw_metadata) if isinstance(raw_metadata, dict) else {}
        final_prompt = str(
            output.get("final_prompt")
            or output.get("positive_prompt")
            or output.get("prompt")
            or output.get("enhanced_prompt")
            or req.idea
        ).strip()
        negative_prompt = str(
            output.get("negative_prompt")
            or "blurry, low quality, distorted anatomy, watermark, text artifacts"
        ).strip()
        composition_intent = self._composition_intent(req.idea, output)
        subject_type = self._subject_type(req.idea, final_prompt)
        trait_lock = self._build_descriptive_trait_lock(" ".join((req.idea, final_prompt)))
        final_prompt, removed_forbidden_prompt = self._remove_forbidden_rewrite_terms(final_prompt)
        final_prompt, removed_conflicting_terms = self._apply_visible_idea_guidance(
            final_prompt,
            trait_lock,
            composition_intent,
        )
        negative_prompt, _ = self._remove_forbidden_rewrite_terms(negative_prompt)
        negative_prompt = self._merge_negative_prompt(
            negative_prompt,
            str(trait_lock["negative_prompt_additions"]),
        )
        negative_prompt = self._remove_negative_prompt_conflicts(negative_prompt, final_prompt)
        width, height = self._dimensions_for_aspect_ratio(req.aspect_ratio, composition_intent)
        style_tags = self._string_list(output.get("style_tags"))
        technical_tags = self._string_list(output.get("technical_tags"))
        if removed_forbidden_prompt:
            technical_tags.append("removed_forbidden_rewrite")
        if removed_conflicting_terms:
            technical_tags.extend([f"removed_conflict:{term}" for term in removed_conflicting_terms])
        return ModalPromptEnhanceResponse(
            final_prompt=final_prompt,
            negative_prompt=negative_prompt,
            style_tags=[*style_tags, *technical_tags],
            recommended_width=self._coerce_int(
                output.get("recommended_width") or metadata.get("recommended_width"),
                fallback=width,
            ) if composition_intent not in {"full_body", "architecture"} else width,
            recommended_height=self._coerce_int(
                output.get("recommended_height") or metadata.get("recommended_height"),
                fallback=height,
            ) if composition_intent not in {"full_body", "architecture"} else height,
            suggested_steps=self._coerce_int(output.get("suggested_steps") or metadata.get("suggested_steps"), fallback=36),
            guidance_scale=self._coerce_float(output.get("guidance_scale") or metadata.get("guidance_scale"), fallback=3.5),
            composition_intent=composition_intent,
            subject_type=subject_type,
        )

    def _normalize_translated_prompt(
        self,
        result: dict[str, Any],
        req: ModalPromptTranslateRequest,
    ) -> ModalPromptTranslateResponse:
        raw_output = result.get("output")
        if isinstance(raw_output, dict):
            output = cast(dict[str, Any], raw_output)
        else:
            output = result

        translated_text = ""
        for key in ("translated_text", "translation", "final_prompt", "prompt", "text"):
            value = output.get(key)
            if isinstance(value, str) and value.strip():
                translated_text = value.strip()
                break
        if not translated_text and isinstance(raw_output, str):
            translated_text = raw_output.strip()
        if not translated_text:
            raise HTTPError(502, "Modal LLM translation returned empty text")

        return ModalPromptTranslateResponse(
            translated_text=translated_text,
            source_language=req.source_language,
            target_language=req.target_language,
            kind=req.kind,
        )

    def _save_image_output(
        self,
        *,
        image_bytes: bytes,
        provider: str,
        model: str,
        prompt: str,
        negative_prompt: str,
        original_idea: str,
        llm_enhanced_prompt: str | None,
        final_prompt: str,
        prompt_was_user_edited: bool,
        prompt_source: str,
        selected_style_id: str | None,
        selected_style_label: str | None,
        selected_style_category: str | None,
        custom_style_text: str | None,
        style_prompt_modifier: str | None,
        style_negative_modifier: str | None,
        style_was_applied: bool,
        negative_prompt_final: str | None,
        seed: int,
        width: int,
        height: int,
        requested_steps: int,
        actual_steps: int,
        guidance_scale: float,
        quality_mode: str,
        effective_width: int,
        effective_height: int,
        negative_prompt_applied: bool,
        elapsed_ms: int,
        extracted_required_traits: list[str],
        required_hair_color: str | None,
        required_eye_color: str | None,
        required_body_framing: str | None,
        prompt_trait_lock_applied: bool,
        negative_trait_lock_applied: bool,
        idea_is_primary_guide: bool,
        composition_intent: str,
        subject_type: str,
        required_traits: JsonObject,
        requested_aspect_ratio: str | None,
        effective_aspect_ratio: str | None,
        aspect_ratio_overridden: bool,
        aspect_ratio_override_reason: str | None,
        removed_conflicting_prompt_terms: list[str],
        no_people_lock_applied: bool,
        backend_semantic_rewrite_after_generate: bool,
        visible_prompt_before_generate: str | None,
        payload_prompt_sent_to_backend: str | None,
        backend_prompt_sent_to_modal: str | None,
        worker_prompt_received: str | None,
        worker_prompt_sent_to_flux: str | None,
        frontend_negative_prompt: str | None,
        backend_negative_prompt_final: str | None,
        worker_negative_prompt_received: str | None,
        worker_negative_prompt_sent_to_flux: str | None,
        prompt_negative_conflicts: list[dict[str, object]],
        prompt_visibility_violation: bool,
        invisible_backend_modifiers_applied: bool,
        visible_trait_lock_applied: bool,
        visible_composition_lock_applied: bool,
        final_prompt_user_editable_before_generate: bool,
        trait_lock_removed: bool,
        composition_lock_removed: bool,
        backend_semantic_rewrite_disabled: bool,
        descriptive_trait_lock_applied: bool,
        content_rewrite_removed: bool,
        coverage_lock_removed: bool,
        conservative_rewrite_removed: bool,
        trait_lock_types_applied: list[str],
        forbidden_rewrite_detected: bool,
    ) -> tuple[Path, Path]:
        image_dir, _ = self.ensure_output_dirs()
        now = datetime.now().astimezone()
        timestamp = now.strftime("%Y-%m-%d_%H-%M-%S")
        safe_provider = self._slug(provider)
        safe_model = self._slug(model)
        base_name = f"{timestamp}_{safe_provider}_{safe_model}_seed-{seed}"
        image_path = self._unique_path(image_dir / f"{base_name}.png")
        metadata_path = image_path.with_suffix(".json")

        image_path.write_bytes(image_bytes)
        metadata: JsonObject = {
            "type": "image",
            "provider": provider,
            "model": model,
            "prompt": prompt,
            "original_idea": original_idea,
            "llm_enhanced_prompt": llm_enhanced_prompt,
            "final_prompt": final_prompt,
            "prompt_was_user_edited": prompt_was_user_edited,
            "prompt_source": prompt_source,
            "selected_style_id": selected_style_id,
            "selected_style_label": selected_style_label,
            "selected_style_category": selected_style_category,
            "custom_style_text": custom_style_text,
            "style_prompt_modifier": style_prompt_modifier,
            "style_negative_modifier": style_negative_modifier,
            "style_was_applied": style_was_applied,
            "negative_prompt": negative_prompt,
            "negative_prompt_final": negative_prompt_final,
            "generated_negative_prompt": negative_prompt,
            "negative_prompt_applied": negative_prompt_applied,
            "seed": seed,
            "width": width,
            "height": height,
            "requested_steps": requested_steps,
            "actual_steps": actual_steps,
            "steps": actual_steps,
            "guidance_scale": guidance_scale,
            "quality_mode": quality_mode,
            "effective_width": effective_width,
            "effective_height": effective_height,
            "upscale_pending": True,
            "elapsed_ms": elapsed_ms,
            "extracted_required_traits": extracted_required_traits,
            "required_hair_color": required_hair_color,
            "required_eye_color": required_eye_color,
            "required_body_framing": required_body_framing,
            "prompt_trait_lock_applied": prompt_trait_lock_applied,
            "negative_trait_lock_applied": negative_trait_lock_applied,
            "idea_is_primary_guide": idea_is_primary_guide,
            "composition_intent": composition_intent,
            "subject_type": subject_type,
            "required_traits": required_traits,
            "requested_aspect_ratio": requested_aspect_ratio,
            "effective_aspect_ratio": effective_aspect_ratio,
            "aspect_ratio_overridden": aspect_ratio_overridden,
            "aspect_ratio_override_reason": aspect_ratio_override_reason,
            "removed_conflicting_prompt_terms": removed_conflicting_prompt_terms,
            "no_people_lock_applied": no_people_lock_applied,
            "backend_semantic_rewrite_after_generate": backend_semantic_rewrite_after_generate,
            "visible_prompt_before_generate": visible_prompt_before_generate,
            "payload_prompt_sent_to_backend": payload_prompt_sent_to_backend,
            "backend_prompt_sent_to_modal": backend_prompt_sent_to_modal,
            "worker_prompt_received": worker_prompt_received,
            "worker_prompt_sent_to_flux": worker_prompt_sent_to_flux,
            "frontend_negative_prompt": frontend_negative_prompt,
            "backend_negative_prompt_final": backend_negative_prompt_final,
            "worker_negative_prompt_received": worker_negative_prompt_received,
            "worker_negative_prompt_sent_to_flux": worker_negative_prompt_sent_to_flux,
            "prompt_negative_conflicts": prompt_negative_conflicts,
            "prompt_visibility_violation": prompt_visibility_violation,
            "invisible_backend_modifiers_applied": invisible_backend_modifiers_applied,
            "visible_trait_lock_applied": visible_trait_lock_applied,
            "visible_composition_lock_applied": visible_composition_lock_applied,
            "final_prompt_user_editable_before_generate": final_prompt_user_editable_before_generate,
            "trait_lock_removed": trait_lock_removed,
            "composition_lock_removed": composition_lock_removed,
            "backend_semantic_rewrite_disabled": backend_semantic_rewrite_disabled,
            "descriptive_trait_lock_applied": descriptive_trait_lock_applied,
            "content_rewrite_removed": content_rewrite_removed,
            "coverage_lock_removed": coverage_lock_removed,
            "conservative_rewrite_removed": conservative_rewrite_removed,
            "trait_lock_types_applied": trait_lock_types_applied,
            "forbidden_rewrite_detected": forbidden_rewrite_detected,
            "created_at": now.isoformat(),
            "local_path": str(image_path),
        }
        metadata_path.write_text(self._json_dumps(metadata), encoding="utf-8")
        logger.info("Saved Modal FLUX image output to %s", image_path)
        return image_path, metadata_path

    def _json_dumps(self, payload: JsonObject) -> str:
        import json

        return json.dumps(payload, ensure_ascii=False, indent=2) + "\n"

    def _unique_path(self, path: Path) -> Path:
        if not path.exists():
            return path
        stem = path.stem
        suffix = path.suffix
        for index in range(1, 10_000):
            candidate = path.with_name(f"{stem}_{index:02d}{suffix}")
            if not candidate.exists():
                return candidate
        return path.with_name(f"{stem}_{int(time.time() * 1000)}{suffix}")

    def _slug(self, value: str) -> str:
        normalized = value.strip().lower().replace(".", "")
        return re.sub(r"[^a-z0-9_]+", "-", normalized).strip("-") or "unknown"

    def _coerce_int(self, value: object, *, fallback: int) -> int:
        try:
            return int(cast(Any, value))
        except Exception:
            return fallback

    def _coerce_float(self, value: object, *, fallback: float) -> float:
        try:
            return float(cast(Any, value))
        except Exception:
            return fallback

    def _string_list(self, value: object) -> list[str]:
        if isinstance(value, list):
            items = cast(list[object], value)
            return [str(item).strip() for item in items if str(item).strip()]
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return []

    def _composition_intent(self, idea: str, output: dict[str, Any]) -> CompositionIntent:
        raw = str(output.get("composition_intent") or "").strip().lower()
        if raw in {"portrait", "full_body", "landscape_scene", "product", "architecture", "generic"}:
            return cast(CompositionIntent, raw)

        if FULL_BODY_INTENT_PATTERN.search(idea):
            return "full_body"
        if ARCHITECTURE_INTENT_PATTERN.search(idea):
            return "architecture"
        if PRODUCT_INTENT_PATTERN.search(idea):
            return "product"
        if PORTRAIT_INTENT_PATTERN.search(idea):
            return "portrait"
        if LANDSCAPE_SCENE_INTENT_PATTERN.search(idea):
            return "landscape_scene"

        source = " ".join(
            str(part or "")
            for part in (
                output.get("positive_prompt"),
                output.get("prompt"),
                output.get("enhanced_prompt"),
            )
        )
        if FULL_BODY_INTENT_PATTERN.search(source):
            return "full_body"
        if ARCHITECTURE_INTENT_PATTERN.search(source):
            return "architecture"
        if PRODUCT_INTENT_PATTERN.search(source):
            return "product"
        if PORTRAIT_INTENT_PATTERN.search(source):
            return "portrait"
        if LANDSCAPE_SCENE_INTENT_PATTERN.search(source):
            return "landscape_scene"
        return "generic"

    def _subject_type(self, idea: str, prompt: str) -> SubjectType:
        source = f"{idea} {prompt}".lower()
        has_person = re.search(r"\b(person|people|human|woman|man|girl|boy|donna|uomo|persona|soggetto)\b", source) is not None
        has_environment = LANDSCAPE_SCENE_INTENT_PATTERN.search(source) is not None
        has_architecture = ARCHITECTURE_INTENT_PATTERN.search(source) is not None
        has_product = PRODUCT_INTENT_PATTERN.search(source) is not None
        if NO_PEOPLE_PATTERN.search(source) and (has_environment or has_architecture):
            return "environment" if not has_architecture else "architecture"
        if has_product:
            return "product"
        if has_architecture:
            return "architecture"
        if has_person and (has_environment or has_architecture):
            return "mixed"
        if has_person:
            return "person"
        if has_environment:
            return "environment"
        return "generic"

    def _coerce_composition_intent(
        self,
        value: str | None,
        idea: str,
        prompt: str,
    ) -> CompositionIntent:
        normalized = (value or "").strip().lower()
        if normalized in {"portrait", "full_body", "landscape_scene", "product", "architecture", "generic"}:
            return cast(CompositionIntent, normalized)
        return self._composition_intent(idea, {"prompt": prompt})

    def _coerce_subject_type(self, value: str | None, idea: str, prompt: str) -> SubjectType:
        normalized = (value or "").strip().lower()
        if normalized in {"person", "environment", "object", "product", "architecture", "mixed", "generic"}:
            return cast(SubjectType, normalized)
        return self._subject_type(idea, prompt)

    def _apply_visible_idea_guidance(
        self,
        prompt: str,
        trait_lock: dict[str, object],
        composition_intent: CompositionIntent,
    ) -> tuple[str, list[str]]:
        result = prompt
        removed_terms: list[str] = []
        trait_types = cast(list[str], trait_lock.get("trait_lock_types") or [])
        has_no_people_lock = "no_people" in trait_types
        if has_no_people_lock:
            for term in NO_PEOPLE_CONFLICT_TERMS:
                pattern = re.compile(rf"(?<!\w){re.escape(term)}(?!\w)", re.IGNORECASE)
                if pattern.search(result):
                    result = pattern.sub("", result)
                    removed_terms.append(term)
            result = re.sub(r"\s{2,}", " ", result)
            result = re.sub(r"\s+,", ",", result)
            result = re.sub(r",\s*,+", ", ", result).strip(" ,")

        if composition_intent == "full_body":
            for term in FULL_BODY_CONFLICT_TERMS:
                pattern = re.compile(rf"(?<!\w){re.escape(term)}(?!\w)", re.IGNORECASE)
                if pattern.search(result):
                    result = pattern.sub("", result)
                    removed_terms.append(term)
            result = re.sub(r"\s{2,}", " ", result)
            result = re.sub(r"\s+,", ",", result)
            result = re.sub(r",\s*,+", ", ", result).strip(" ,")

            missing_reinforcements = [
                term for term in FULL_BODY_VISIBLE_REINFORCEMENTS
                if term.lower() not in result.lower()
            ]
            if missing_reinforcements:
                result = self._merge_prompt_prefix(result, ", ".join(missing_reinforcements))

        additions = str(trait_lock.get("positive_prompt_additions") or "")
        if additions:
            result = self._merge_prompt_prefix(result, additions)
        return result, self._dedupe_terms(removed_terms)

    def _required_traits_from_trait_lock(self, trait_lock: dict[str, object]) -> JsonObject:
        traits: JsonObject = {}
        hair_color = trait_lock.get("required_hair_color")
        eye_color = trait_lock.get("required_eye_color")
        body_framing = trait_lock.get("required_body_framing")
        extracted = trait_lock.get("extracted_required_traits")
        if isinstance(hair_color, str) and hair_color:
            traits["hair_color"] = hair_color
        if isinstance(eye_color, str) and eye_color:
            traits["eye_color"] = eye_color
        if isinstance(body_framing, str) and body_framing:
            traits["body_framing"] = body_framing
        if isinstance(extracted, list):
            traits["extracted"] = [str(item) for item in extracted]
        return traits

    def _build_descriptive_trait_lock(self, source: str) -> dict[str, object]:
        positive_additions: list[str] = []
        negative_additions: list[str] = []
        trait_types: list[str] = []
        extracted_traits: list[str] = []
        required_hair_color: str | None = None
        required_eye_color: str | None = None
        required_body_framing: str | None = None
        has_no_people_lock = NO_PEOPLE_PATTERN.search(source) is not None

        def add_positive(value: str) -> None:
            if value and not self._contains_forbidden_rewrite(value):
                positive_additions.append(value)

        def add_negative(values: tuple[str, ...]) -> None:
            for value in values:
                if value and not self._contains_forbidden_rewrite(value):
                    negative_additions.append(value)

        if ADULT_TRAIT_PATTERN.search(source) and not has_no_people_lock:
            add_positive("adult subject")
            trait_types.append("adult_clarity")
            extracted_traits.append("adult subject")

        if not has_no_people_lock:
            for hair_color, pattern, positive, negatives in HAIR_TRAIT_PATTERNS:
                if pattern.search(source):
                    required_hair_color = hair_color
                    add_positive(positive)
                    add_negative(negatives)
                    trait_types.append("hair_color")
                    extracted_traits.append(f"hair_color:{hair_color}")
                    break

            for eye_color, pattern, positive, negatives in EYE_TRAIT_PATTERNS:
                if pattern.search(source):
                    required_eye_color = eye_color
                    add_positive(positive)
                    add_negative(negatives)
                    trait_types.append("eye_color")
                    extracted_traits.append(f"eye_color:{eye_color}")
                    break

            for trait_id, pattern, positive, negatives in BODY_TRAIT_PATTERNS:
                if pattern.search(source):
                    add_positive(positive)
                    add_negative(negatives)
                    trait_types.append("body_type" if trait_id.endswith("_body") or trait_id == "prosperous_bust" else "stature")
                    extracted_traits.append(trait_id)

        if FULL_BODY_INTENT_PATTERN.search(source) and not has_no_people_lock:
            required_body_framing = "full_body"
            add_positive("full-body standing shot, head-to-toe framing, entire figure visible, feet visible")
            add_negative(("close-up", "portrait", "bust shot", "half-body", "cropped body", "feet out of frame", "head cropped", "body cropped"))
            trait_types.append("requested_framing")
            extracted_traits.append("framing:full_body")

        if has_no_people_lock:
            add_positive("empty scene with no people, no pedestrians, no human figures, environment-only view")
            add_negative(("people", "person", "human figure", "woman", "man", "face", "portrait", "silhouette", "pedestrian", "crowd"))
            trait_types.append("no_people")
            extracted_traits.append("no_people")

        return {
            "positive_prompt_additions": ", ".join(self._dedupe_terms(positive_additions)),
            "negative_prompt_additions": ", ".join(self._dedupe_terms(negative_additions)),
            "trait_lock_types": self._dedupe_terms(trait_types),
            "extracted_required_traits": self._dedupe_terms(extracted_traits),
            "required_hair_color": required_hair_color,
            "required_eye_color": required_eye_color,
            "required_body_framing": required_body_framing,
        }

    def _contains_forbidden_rewrite(self, value: str) -> bool:
        return FORBIDDEN_REWRITE_TERM_PATTERN.search(value) is not None

    def _remove_forbidden_rewrite_terms(self, prompt: str) -> tuple[str, bool]:
        parts: list[str] = []
        removed = False
        for item in prompt.split(","):
            value = item.strip()
            if not value:
                continue
            if self._contains_forbidden_rewrite(value):
                removed = True
                continue
            parts.append(value)
        return ", ".join(self._dedupe_terms(parts)), removed

    def _remove_negative_prompt_conflicts(self, negative_prompt: str, positive_prompt: str) -> str:
        positive = positive_prompt.lower()
        parts: list[str] = []
        for item in negative_prompt.split(","):
            value = item.strip()
            key = value.lower()
            if not value:
                continue
            # Remove direct contradictions only when the positive asks for that
            # exact concept, not when it says "not blonde" or similar.
            if (
                self._contains_prompt_term(positive, key)
                and f"not {key}" not in positive
                and f"no {key}" not in positive
            ):
                continue
            parts.append(value)
        return ", ".join(self._dedupe_terms(parts))

    def _find_prompt_negative_conflicts(self, positive_prompt: str, negative_prompt: str) -> list[dict[str, object]]:
        positive = positive_prompt.lower()
        negative = negative_prompt.lower()
        conflicts: list[dict[str, object]] = []
        seen: set[str] = set()
        for term in PROMPT_NEGATIVE_CONFLICT_TERMS:
            key = term.lower()
            if key in seen:
                continue
            if (
                self._contains_prompt_term(positive, key)
                and self._contains_prompt_term(negative, key)
                and f"no {key}" not in positive
                and f"not {key}" not in positive
            ):
                conflicts.append({"term": term, "in_positive": True, "in_negative": True})
                seen.add(key)
        return conflicts

    def _contains_prompt_term(self, prompt: str, term: str) -> bool:
        pattern = re.compile(rf"(?<!\w){re.escape(term)}(?!\w)", re.IGNORECASE)
        return pattern.search(prompt) is not None

    def _reject_disallowed_prompt(self, prompt: str) -> None:
        has_underage = UNDERAGE_PATTERN.search(prompt) is not None and NEGATED_UNDERAGE_PATTERN.search(prompt) is None
        if has_underage and SEXUAL_OR_NUDE_PATTERN.search(prompt):
            raise HTTPError(400, "Prompt blocked: sexualized minors or underage nudity are not allowed.")
        if NONCONSENSUAL_OR_EXPLOITATION_PATTERN.search(prompt):
            raise HTTPError(400, "Prompt blocked: non-consensual, coercive, exploitative, or sexual-violence content is not allowed.")

    def _prompt_visibility_violation(self, *prompts: str | None) -> bool:
        values = [
            value
            for value in prompts
            if value is not None
        ]
        if len(values) < 2:
            return False
        normalized = [self._normalize_prompt_for_compare(value) for value in values]
        return any(value != normalized[0] for value in normalized[1:])

    def _normalize_prompt_for_compare(self, value: str) -> str:
        return re.sub(r"\s+", " ", value).strip()

    def _optional_str(self, value: object) -> str | None:
        if isinstance(value, str):
            return value
        return None

    def _dedupe_terms(self, values: list[str] | tuple[str, ...]) -> list[str]:
        result: list[str] = []
        seen: set[str] = set()
        for value in values:
            normalized = value.strip()
            key = normalized.lower()
            if normalized and key not in seen:
                result.append(normalized)
                seen.add(key)
        return result

    def _merge_prompt_prefix(self, prompt: str, additions: str) -> str:
        additions_to_apply = [
            item.strip()
            for item in additions.split(",")
            if item.strip() and item.strip().lower() not in prompt.lower()
        ]
        if not additions_to_apply:
            return prompt
        return f"{', '.join(additions_to_apply)}, {prompt}".strip(" ,")

    def _merge_negative_prompt(self, base: str, additions: str) -> str:
        parts: list[str] = []
        seen: set[str] = set()
        for item in f"{base}, {additions}".split(","):
            normalized = item.strip()
            key = normalized.lower()
            if normalized and key not in seen:
                parts.append(normalized)
                seen.add(key)
        return ", ".join(parts)

    def _dimensions_for_aspect_ratio(
        self,
        aspect_ratio: str | None,
        composition_intent: CompositionIntent | None = None,
    ) -> tuple[int, int]:
        if composition_intent == "full_body":
            if aspect_ratio == "3:4":
                return 896, 1152
            return 768, 1344
        if composition_intent in {"architecture", "landscape_scene"} and aspect_ratio in {None, "16:9"}:
            return 1344, 768
        match aspect_ratio:
            case "1:1":
                return 1024, 1024
            case "9:16":
                return 768, 1344
            case "4:3":
                return 1152, 896
            case "3:4":
                return 896, 1152
            case "16:9" | _:
                return 1344, 768
