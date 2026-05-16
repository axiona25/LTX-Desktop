"""Tests for AXSTUDIO Modal prompt and FLUX image integration."""

from __future__ import annotations

import base64
import json
from pathlib import Path

from tests.fakes.services import FakeResponse
from tests.http_error_assertions import assert_http_error


def test_modal_prompt_enhance_calls_configured_endpoint(client, test_state, fake_services):
    test_state.state.app_settings.modal_llm_prompt_endpoint = "https://llm.modal.run/enhance"
    fake_services.http.queue(
        "post",
        FakeResponse(
            json_payload={
                "final_prompt": "cinematic robot painter",
                "negative_prompt": "blurry",
                "style_tags": ["cinematic", "editorial"],
                "recommended_width": 1280,
                "recommended_height": 720,
                "suggested_steps": 28,
                "guidance_scale": 3.5,
            }
        ),
    )

    response = client.post(
        "/api/modal-image/enhance",
        json={"idea": "robot painter", "style": "cinematic", "aspect_ratio": "16:9", "language": "en"},
    )

    assert response.status_code == 200
    assert response.json()["final_prompt"] == "cinematic robot painter"
    call = fake_services.http.calls[-1]
    assert call.url == "https://llm.modal.run/enhance"
    assert call.json_payload is not None
    assert call.json_payload["idea"] == "robot painter"
    assert call.json_payload["task"] == "compile_prompt"
    assert call.json_payload["product_mode"] == "consumer_creative"
    assert call.json_payload["target"] == "flux_image"
    assert "composition_intent" not in call.json_payload
    assert "composition_rules" not in call.json_payload


def test_modal_image_endpoints_send_ax_modal_bearer_when_configured(client, test_state, fake_services):
    test_state.state.app_settings.modal_llm_prompt_endpoint = "https://llm.modal.run/enhance"
    test_state.state.app_settings.ax_modal_api_key = "test-ax-modal-key"
    fake_services.http.queue(
        "post",
        FakeResponse(
            json_payload={
                "final_prompt": "cinematic robot painter",
                "negative_prompt": "blurry",
                "style_tags": ["cinematic"],
                "recommended_width": 1280,
                "recommended_height": 720,
                "suggested_steps": 28,
                "guidance_scale": 3.5,
            }
        ),
    )

    response = client.post(
        "/api/modal-image/enhance",
        json={"idea": "robot painter", "style": "cinematic", "aspect_ratio": "16:9", "language": "en"},
    )

    assert response.status_code == 200
    call = fake_services.http.calls[-1]
    assert call.headers == {"Authorization": "Bearer test-ax-modal-key"}


def test_modal_prompt_enhance_normalizes_existing_llm_prompt_engine(client, test_state, fake_services):
    test_state.state.app_settings.modal_llm_prompt_endpoint = "https://llm.modal.run/generate-prompt"
    fake_services.http.queue(
        "post",
        FakeResponse(
            json_payload={
                "success": True,
                "provider": "modal_llm_prompt_engine",
                "type": "prompt",
                "positive_prompt": "premium cinematic robot painter, neon rain, reflective city",
                "negative_prompt": "low quality",
                "style_tags": ["cinematic"],
                "technical_tags": ["photorealistic", "high detail"],
                "metadata": {"model": "Qwen/Qwen3-30B-A3B-Instruct-2507"},
            }
        ),
    )

    response = client.post(
        "/api/modal-image/enhance",
        json={"idea": "robot painter", "style": "cinematic", "aspect_ratio": "16:9", "language": "en"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["final_prompt"] == "premium cinematic robot painter, neon rain, reflective city"
    assert data["negative_prompt"] == "low quality"
    assert data["style_tags"] == ["cinematic", "photorealistic", "high detail"]
    assert data["recommended_width"] == 1344
    assert data["recommended_height"] == 768
    assert data["suggested_steps"] == 36
    assert data["guidance_scale"] == 3.5
    assert data["composition_intent"] == "landscape_scene"


def test_modal_prompt_enhance_visible_full_body_cleanup_removes_portrait(client, test_state, fake_services):
    test_state.state.app_settings.modal_llm_prompt_endpoint = "https://llm.modal.run/generate-prompt"
    fake_services.http.queue(
        "post",
        FakeResponse(
            json_payload={
                "success": True,
                "positive_prompt": "cinematic portrait of an elegant adult person in a hotel lobby",
                "negative_prompt": "low quality",
            }
        ),
    )

    response = client.post(
        "/api/modal-image/enhance",
        json={
            "idea": "Una persona adulta elegante in piedi, figura intera dalla testa ai piedi, piedi visibili",
            "style": "cinematic",
            "aspect_ratio": "9:16",
            "language": "en",
        },
    )

    assert response.status_code == 200
    data = response.json()
    final_prompt = data["final_prompt"].lower()
    assert data["composition_intent"] == "full_body"
    assert "portrait" not in final_prompt
    assert "full-body standing shot" in final_prompt
    assert "head-to-toe framing" in final_prompt
    assert "feet visible" in final_prompt
    assert data["recommended_width"] == 768
    assert data["recommended_height"] == 1344

    call = fake_services.http.calls[-1]
    assert call.json_payload is not None
    assert "composition_intent" not in call.json_payload
    assert "composition_rules" not in call.json_payload


def test_modal_prompt_enhance_overrides_full_body_landscape_dimensions(client, test_state, fake_services):
    test_state.state.app_settings.modal_llm_prompt_endpoint = "https://llm.modal.run/generate-prompt"
    fake_services.http.queue(
        "post",
        FakeResponse(
            json_payload={
                "success": True,
                "positive_prompt": "cinematic portrait of an explorer in a neon city",
                "negative_prompt": "low quality",
            }
        ),
    )

    response = client.post(
        "/api/modal-image/enhance",
        json={
            "idea": "Una ragazza esploratrice in una città futuristica, figura intera, piedi visibili",
            "style": "cinematic",
            "aspect_ratio": "16:9",
            "language": "en",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["composition_intent"] == "full_body"
    assert data["recommended_width"] == 768
    assert data["recommended_height"] == 1344


def test_modal_prompt_enhance_no_people_removes_human_framing_terms(client, test_state, fake_services):
    test_state.state.app_settings.modal_llm_prompt_endpoint = "https://llm.modal.run/generate-prompt"
    fake_services.http.queue(
        "post",
        FakeResponse(
            json_payload={
                "success": True,
                "positive_prompt": (
                    "Modern empty futuristic city street at night, neon reflections, "
                    "empty wide-angle view with full-body framing, head-to-toe composition, "
                    "both hands and both feet visible, a lone figure silhouette in the center, no people"
                ),
                "negative_prompt": "low quality",
            }
        ),
    )

    response = client.post(
        "/api/modal-image/enhance",
        json={
            "idea": "modern empty futuristic city street at night, neon reflections, rain, cinematic lighting, no people",
            "style": "cinematic",
            "aspect_ratio": "16:9",
            "language": "en",
        },
    )

    assert response.status_code == 200
    data = response.json()
    final_prompt = data["final_prompt"].lower()
    negative_prompt = data["negative_prompt"].lower()
    assert data["composition_intent"] == "landscape_scene"
    assert data["subject_type"] == "environment"
    assert data["recommended_width"] == 1344
    assert data["recommended_height"] == 768
    assert "full-body" not in final_prompt
    assert "head-to-toe" not in final_prompt
    assert "hands" not in final_prompt
    assert "feet" not in final_prompt
    assert "lone figure" not in final_prompt
    assert "silhouette" not in final_prompt
    assert "empty scene with no people" in final_prompt
    assert "human figure" in negative_prompt
    assert "pedestrian" in negative_prompt


def test_modal_prompt_enhance_removes_llm_coverage_rewrite(client, test_state, fake_services):
    test_state.state.app_settings.modal_llm_prompt_endpoint = "https://llm.modal.run/generate-prompt"
    fake_services.http.queue(
        "post",
        FakeResponse(
            json_payload={
                "success": True,
                "positive_prompt": (
                    "full-body portrait of an adult woman, no explicit nudity, wearing underwear, "
                    "non-pornographic, editorially styled"
                ),
                "negative_prompt": (
                    "low quality, nudity in non-editorial context, pornographic content, explicit sexual content, "
                    "explicit sex act, underwear, bikini, minors, sexual violence"
                ),
            }
        ),
    )

    response = client.post(
        "/api/modal-image/enhance",
        json={
            "idea": "Una donna adulta completamente nuda, figura intera, piedi visibili",
            "style": "photorealistic",
            "aspect_ratio": "9:16",
            "language": "en",
        },
    )

    assert response.status_code == 200
    data = response.json()
    final_prompt = data["final_prompt"].lower()
    negative_prompt = data["negative_prompt"].lower()
    assert "wearing underwear" not in final_prompt
    assert "no explicit nudity" not in final_prompt
    assert "non-pornographic" not in final_prompt
    assert "underwear" not in negative_prompt
    assert "bikini" not in negative_prompt
    assert "pornographic content" in negative_prompt
    assert "minors" in negative_prompt
    assert "sexual violence" in negative_prompt


def test_modal_prompt_enhance_requires_endpoint(client):
    response = client.post("/api/modal-image/enhance", json={"idea": "robot painter"})
    assert_http_error(
        response,
        status_code=409,
        code="HTTP_409",
        message="MODAL_LLM_PROMPT_ENDPOINT is not configured",
    )


def test_modal_prompt_translate_uses_existing_llm_endpoint(client, test_state, fake_services):
    test_state.state.app_settings.modal_llm_prompt_endpoint = "https://llm.modal.run/generate-prompt"
    fake_services.http.queue(
        "post",
        FakeResponse(json_payload={"translated_text": "A fully nude adult woman, full-body standing shot"}),
    )

    response = client.post(
        "/api/modal-image/translate",
        json={
            "text": "Una donna adulta completamente nuda, figura intera",
            "target_language": "en",
            "source_language": "it",
            "kind": "prompt",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["translated_text"] == "A fully nude adult woman, full-body standing shot"
    assert data["target_language"] == "en"
    call = fake_services.http.calls[-1]
    assert call.url == "https://llm.modal.run/generate-prompt"
    assert call.json_payload is not None
    assert call.json_payload["task"] == "translate_prompt"
    assert call.json_payload["target_language"] == "en"
    assert call.json_payload["source_language"] == "it"
    assert "Do not add new creative details" in call.json_payload["instructions"]


def test_modal_flux_generate_saves_image_and_metadata(client, test_state, fake_services):
    test_state.state.app_settings.modal_flux_image_endpoint = "https://axiona2025--axstudio-flux-image-web-app.modal.run/generate"
    image_bytes = b"fake-png-bytes"
    fake_services.http.queue(
        "post",
        FakeResponse(
            json_payload={
                "provider": "modal_flux",
                "model": "black-forest-labs/FLUX.2-klein-9B",
                "image_base64": base64.b64encode(image_bytes).decode("ascii"),
                "seed": 123456,
                "width": 1024,
                "height": 768,
                "requested_steps": 28,
                "actual_steps": 24,
                "guidance_scale": 3.5,
                "quality_mode": "balanced",
                "effective_width": 1024,
                "effective_height": 768,
                "negative_prompt_applied": True,
                "worker_prompt_received": "cinematic robot painter\n\n[STYLE: Cinematic] cinematic lighting",
                "worker_prompt_sent_to_flux": "cinematic robot painter\n\n[STYLE: Cinematic] cinematic lighting",
                "worker_negative_prompt_received": "blurry, flat lighting",
                "worker_negative_prompt_sent_to_flux": "blurry, flat lighting",
                "elapsed_ms": 9000,
            }
        ),
    )

    response = client.post(
        "/api/modal-image/generate",
        json={
            "prompt": "cinematic robot painter",
            "negative_prompt": "blurry",
            "negative_prompt_final": "blurry, flat lighting",
            "width": 1024,
            "height": 768,
            "steps": 28,
            "guidance_scale": 3.5,
            "seed": 123456,
            "quality_mode": "balanced",
            "original_idea": "robot painter",
            "llm_enhanced_prompt": "cinematic robot painter",
            "final_prompt": "cinematic robot painter\n\n[STYLE: Cinematic] cinematic lighting",
            "prompt_was_user_edited": False,
            "prompt_source": "llm_enhanced",
            "selected_style_id": "cinematic",
            "selected_style_label": "Cinematic",
            "selected_style_category": "cinematic",
            "custom_style_text": None,
            "style_prompt_modifier": "cinematic lighting",
            "style_negative_modifier": "flat lighting",
            "style_was_applied": True,
            "visible_prompt_before_generate": "cinematic robot painter\n\n[STYLE: Cinematic] cinematic lighting",
            "payload_prompt_sent_to_backend": "cinematic robot painter\n\n[STYLE: Cinematic] cinematic lighting",
            "frontend_negative_prompt": "blurry, flat lighting",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["requested_steps"] == 28
    assert data["actual_steps"] == 24
    assert data["quality_mode"] == "balanced"
    assert data["negative_prompt_applied"] is True
    image_path = Path(data["local_path"])
    metadata_path = Path(data["metadata_path"])
    assert image_path.exists()
    assert metadata_path.exists()
    assert image_path.read_bytes() == image_bytes
    assert image_path.parent == test_state.config.app_data_dir / "Output" / "image"
    assert (test_state.config.app_data_dir / "Output" / "video").exists()
    assert "modal_flux_black-forest-labs-flux2-klein-9b_seed-123456" in image_path.name

    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    assert metadata["prompt"] == "cinematic robot painter\n\n[STYLE: Cinematic] cinematic lighting"
    assert metadata["backend_prompt_sent_to_modal"] == metadata["payload_prompt_sent_to_backend"]
    assert metadata["prompt_visibility_violation"] is False
    assert metadata["backend_semantic_rewrite_after_generate"] is False
    assert metadata["idea_is_primary_guide"] is False
    assert metadata["local_path"] == str(image_path)

    call = fake_services.http.calls[-1]
    assert call.url == "https://axiona2025--axstudio-flux-image-web-app.modal.run/generate"
    assert call.json_payload is not None
    assert call.json_payload["prompt"] == "cinematic robot painter\n\n[STYLE: Cinematic] cinematic lighting"
    assert call.json_payload["negative_prompt"] == "blurry, flat lighting"



def test_modal_prompt_enhance_applies_visible_descriptive_trait_and_framing_lock(client, test_state, fake_services):
    test_state.state.app_settings.modal_llm_prompt_endpoint = "https://llm.modal.run/generate-prompt"
    fake_services.http.queue(
        "post",
        FakeResponse(
            json_payload={
                "success": True,
                "positive_prompt": "ultra realistic studio photograph of an adult woman",
                "negative_prompt": "low quality",
            }
        ),
    )

    response = client.post(
        "/api/modal-image/enhance",
        json={
            "idea": (
                "adult woman with dark brunette hair and clearly visible blue eyes, "
                "full-body standing shot, ultra realistic studio photography"
            ),
            "style": "ultra realistic",
            "aspect_ratio": "16:9",
            "language": "en",
        },
    )

    assert response.status_code == 200
    data = response.json()
    final_prompt = data["final_prompt"].lower()
    assert "dark brunette hair clearly visible" in final_prompt
    assert "clearly visible blue eyes" in final_prompt
    assert "full-body standing shot" in final_prompt
    assert "low quality" in data["negative_prompt"]
    assert "blonde hair" in data["negative_prompt"]
    assert "brown eyes" in data["negative_prompt"]
    assert "cropped body" in data["negative_prompt"]
    assert data["recommended_width"] == 768
    assert data["recommended_height"] == 1344


def test_modal_flux_generate_does_not_apply_hidden_trait_lock(client, test_state, fake_services):
    test_state.state.app_settings.modal_flux_image_endpoint = "https://axiona2025--axstudio-flux-image-web-app.modal.run/generate"
    image_bytes = b"fake-png-bytes"
    visible_prompt = "adult woman with dark brunette hair and clearly visible blue eyes, full-body standing shot"
    backend_prompt = visible_prompt
    backend_negative = "low quality"
    fake_services.http.queue(
        "post",
        FakeResponse(
            json_payload={
                "provider": "modal_flux",
                "model": "black-forest-labs/FLUX.2-klein-9B",
                "image_base64": base64.b64encode(image_bytes).decode("ascii"),
                "seed": 456,
                "width": 1344,
                "height": 768,
                "requested_steps": 36,
                "actual_steps": 36,
                "guidance_scale": 3.5,
                "quality_mode": "premium",
                "effective_width": 1344,
                "effective_height": 768,
                "negative_prompt_applied": True,
                "worker_prompt_received": backend_prompt,
                "worker_prompt_sent_to_flux": backend_prompt,
                "worker_negative_prompt_received": backend_negative,
                "worker_negative_prompt_sent_to_flux": backend_negative,
                "elapsed_ms": 1000,
            }
        ),
    )

    response = client.post(
        "/api/modal-image/generate",
        json={
            "prompt": visible_prompt,
            "negative_prompt_final": "low quality",
            "width": 1344,
            "height": 768,
            "steps": 36,
            "guidance_scale": 3.5,
            "seed": 456,
            "quality_mode": "premium",
            "original_idea": visible_prompt,
            "final_prompt": visible_prompt,
            "prompt_source": "manual",
            "selected_style_id": "ultra_realistic",
            "selected_style_label": "Ultra Realistic",
                "visible_prompt_before_generate": visible_prompt,
                "payload_prompt_sent_to_backend": visible_prompt,
                "frontend_negative_prompt": "low quality",
                "idea_is_primary_guide": True,
                "composition_intent": "full_body",
                "subject_type": "person",
                "required_traits": {"hair_color": "dark brunette", "eye_color": "blue", "body_framing": "full_body"},
                "requested_aspect_ratio": "16:9",
                "effective_aspect_ratio": "9:16",
                "aspect_ratio_overridden": True,
                "aspect_ratio_override_reason": "full_body_requires_vertical_framing",
                "descriptive_trait_lock_applied": True,
                "trait_lock_types_applied": ["adult_clarity", "hair_color", "eye_color", "requested_framing"],
            },
        )

    assert response.status_code == 200
    call = fake_services.http.calls[-1]
    assert call.json_payload is not None
    assert call.json_payload["prompt"] == backend_prompt
    assert call.json_payload["negative_prompt"] == backend_negative
    assert call.json_payload["width"] == 1344
    assert call.json_payload["height"] == 768

    metadata = json.loads(Path(response.json()["metadata_path"]).read_text(encoding="utf-8"))
    assert metadata["visible_prompt_before_generate"] == visible_prompt
    assert metadata["backend_prompt_sent_to_modal"] == backend_prompt
    assert metadata["worker_prompt_received"] == backend_prompt
    assert metadata["worker_prompt_sent_to_flux"] == backend_prompt
    assert metadata["required_hair_color"] == "dark brunette"
    assert metadata["required_eye_color"] == "blue"
    assert metadata["required_body_framing"] == "full_body"
    assert metadata["prompt_trait_lock_applied"] is True
    assert metadata["negative_trait_lock_applied"] is True
    assert metadata["descriptive_trait_lock_applied"] is True
    assert metadata["content_rewrite_removed"] is True
    assert metadata["coverage_lock_removed"] is True
    assert metadata["conservative_rewrite_removed"] is True
    assert metadata["forbidden_rewrite_detected"] is False
    assert metadata["trait_lock_types_applied"] == ["adult_clarity", "hair_color", "eye_color", "requested_framing"]
    assert metadata["idea_is_primary_guide"] is True
    assert metadata["composition_intent"] == "full_body"
    assert metadata["subject_type"] == "person"
    assert metadata["aspect_ratio_overridden"] is True
    assert metadata["aspect_ratio_override_reason"] == "full_body_requires_vertical_framing"
    assert metadata["prompt_visibility_violation"] is False
    assert metadata["invisible_backend_modifiers_applied"] is False
    assert metadata["visible_trait_lock_applied"] is False
    assert metadata["visible_composition_lock_applied"] is False
    assert metadata["final_prompt_user_editable_before_generate"] is True
    assert metadata["trait_lock_removed"] is False
    assert metadata["composition_lock_removed"] is True
    assert metadata["backend_semantic_rewrite_disabled"] is True


def test_modal_flux_generate_does_not_add_unrequested_people_negative_lock(client, test_state, fake_services):
    test_state.state.app_settings.modal_flux_image_endpoint = "https://axiona2025--axstudio-flux-image-web-app.modal.run/generate"
    image_bytes = b"fake-png-bytes"
    visible_prompt = "modern luxury villa at sunset, architectural photography, realistic materials, warm interior lights"
    fake_services.http.queue(
        "post",
        FakeResponse(
            json_payload={
                "provider": "modal_flux",
                "model": "black-forest-labs/FLUX.2-klein-9B",
                "image_base64": base64.b64encode(image_bytes).decode("ascii"),
                "seed": 789,
                "width": 1344,
                "height": 768,
                "requested_steps": 36,
                "actual_steps": 36,
                "guidance_scale": 3.5,
                "quality_mode": "premium",
                "effective_width": 1344,
                "effective_height": 768,
                "negative_prompt_applied": True,
                "worker_prompt_received": visible_prompt,
                "worker_prompt_sent_to_flux": visible_prompt,
                "worker_negative_prompt_received": "cartoon",
                "worker_negative_prompt_sent_to_flux": "cartoon",
                "elapsed_ms": 1000,
            }
        ),
    )

    response = client.post(
        "/api/modal-image/generate",
        json={
            "prompt": visible_prompt,
            "negative_prompt_final": "cartoon",
            "width": 1344,
            "height": 768,
            "steps": 36,
            "guidance_scale": 3.5,
            "seed": 789,
            "quality_mode": "premium",
            "original_idea": visible_prompt,
            "final_prompt": visible_prompt,
            "prompt_source": "manual",
            "selected_style_id": "photorealistic",
            "selected_style_label": "Photorealistic",
            "visible_prompt_before_generate": visible_prompt,
            "payload_prompt_sent_to_backend": visible_prompt,
            "frontend_negative_prompt": "cartoon",
        },
    )

    assert response.status_code == 200
    call = fake_services.http.calls[-1]
    assert call.json_payload is not None
    assert call.json_payload["prompt"] == visible_prompt
    assert call.json_payload["negative_prompt"] == "cartoon"
    assert "people" not in call.json_payload["negative_prompt"].lower()


def test_modal_flux_generate_tracks_no_people_without_hidden_rewrite(client, test_state, fake_services):
    test_state.state.app_settings.modal_flux_image_endpoint = "https://axiona2025--axstudio-flux-image-web-app.modal.run/generate"
    image_bytes = b"fake-png-bytes"
    visible_prompt = "modern empty futuristic city street at night, neon reflections, rain, cinematic lighting, no people"
    backend_prompt = visible_prompt
    backend_negative = "flat lighting"
    fake_services.http.queue(
        "post",
        FakeResponse(
            json_payload={
                "provider": "modal_flux",
                "model": "black-forest-labs/FLUX.2-klein-9B",
                "image_base64": base64.b64encode(image_bytes).decode("ascii"),
                "seed": 790,
                "width": 1344,
                "height": 768,
                "requested_steps": 36,
                "actual_steps": 36,
                "guidance_scale": 3.5,
                "quality_mode": "premium",
                "effective_width": 1344,
                "effective_height": 768,
                "negative_prompt_applied": True,
                "worker_prompt_received": backend_prompt,
                "worker_prompt_sent_to_flux": backend_prompt,
                "worker_negative_prompt_received": backend_negative,
                "worker_negative_prompt_sent_to_flux": backend_negative,
                "elapsed_ms": 1000,
            }
        ),
    )

    response = client.post(
        "/api/modal-image/generate",
        json={
            "prompt": visible_prompt,
            "negative_prompt_final": "flat lighting",
            "width": 1344,
            "height": 768,
            "steps": 36,
            "guidance_scale": 3.5,
            "seed": 790,
            "quality_mode": "premium",
            "original_idea": visible_prompt,
            "final_prompt": visible_prompt,
            "prompt_source": "manual",
            "selected_style_id": "cinematic",
            "selected_style_label": "Cinematic",
            "visible_prompt_before_generate": visible_prompt,
            "payload_prompt_sent_to_backend": visible_prompt,
                "frontend_negative_prompt": "flat lighting",
                "idea_is_primary_guide": True,
                "composition_intent": "landscape_scene",
                "subject_type": "environment",
                "required_traits": {"no_people": True},
                "requested_aspect_ratio": "16:9",
                "effective_aspect_ratio": "16:9",
                "no_people_lock_applied": True,
                "descriptive_trait_lock_applied": True,
                "trait_lock_types_applied": ["no_people"],
            },
        )

    assert response.status_code == 200
    call = fake_services.http.calls[-1]
    assert call.json_payload is not None
    assert call.json_payload["prompt"] == backend_prompt
    assert call.json_payload["negative_prompt"] == backend_negative
    assert "no people" in call.json_payload["prompt"].lower()
    metadata = json.loads(Path(response.json()["metadata_path"]).read_text(encoding="utf-8"))
    assert metadata["extracted_required_traits"] == ["no_people"]
    assert metadata["trait_lock_types_applied"] == ["no_people"]
    assert metadata["descriptive_trait_lock_applied"] is True
    assert metadata["no_people_lock_applied"] is True
    assert metadata["composition_intent"] == "landscape_scene"
    assert metadata["subject_type"] == "environment"
    assert metadata["forbidden_rewrite_detected"] is False
    assert metadata["prompt_negative_conflicts"] == []
    assert metadata["prompt_visibility_violation"] is False


def test_modal_flux_generate_does_not_clean_or_rewrite_adult_prompt_before_worker(client, test_state, fake_services):
    test_state.state.app_settings.modal_flux_image_endpoint = "https://axiona2025--axstudio-flux-image-web-app.modal.run/generate"
    image_bytes = b"fake-png-bytes"
    visible_prompt = "adult subject, neutral studio portrait"
    fake_services.http.queue(
        "post",
        FakeResponse(
            json_payload={
                "provider": "modal_flux",
                "model": "black-forest-labs/FLUX.2-klein-9B",
                "image_base64": base64.b64encode(image_bytes).decode("ascii"),
                "seed": 123456,
                "width": 768,
                "height": 1344,
                "requested_steps": 36,
                "actual_steps": 36,
                "guidance_scale": 3.5,
                "quality_mode": "premium",
                "effective_width": 768,
                "effective_height": 1344,
                "negative_prompt_applied": True,
                "worker_prompt_received": visible_prompt,
                "worker_prompt_sent_to_flux": visible_prompt,
                "worker_negative_prompt_received": "low quality",
                "worker_negative_prompt_sent_to_flux": "low quality",
                "elapsed_ms": 9000,
            }
        ),
    )

    response = client.post(
        "/api/modal-image/generate",
        json={
            "prompt": visible_prompt,
            "negative_prompt": "",
            "negative_prompt_final": "low quality",
            "width": 768,
            "height": 1344,
            "steps": 36,
            "guidance_scale": 3.5,
            "seed": 123456,
            "quality_mode": "premium",
            "original_idea": visible_prompt,
            "final_prompt": visible_prompt,
            "prompt_was_user_edited": False,
            "prompt_source": "llm_enhanced",
            "visible_prompt_before_generate": visible_prompt,
            "payload_prompt_sent_to_backend": visible_prompt,
            "frontend_negative_prompt": "low quality",
        },
    )

    assert response.status_code == 200
    call = fake_services.http.calls[-1]
    assert call.json_payload is not None
    assert call.json_payload["prompt"] == visible_prompt
    assert call.json_payload["negative_prompt"] == "low quality"


def test_modal_flux_generate_blocks_disallowed_minor_sexual_prompt(client, test_state, fake_services):
    test_state.state.app_settings.modal_flux_image_endpoint = "https://axiona2025--axstudio-flux-image-web-app.modal.run/generate"
    response = client.post(
        "/api/modal-image/generate",
        json={
            "prompt": "underage nude subject",
            "negative_prompt": "",
            "width": 768,
            "height": 1344,
            "steps": 36,
            "guidance_scale": 3.5,
            "seed": 123456,
            "quality_mode": "premium",
        },
    )
    assert_http_error(
        response,
        status_code=400,
        code="HTTP_400",
        message="Prompt blocked: sexualized minors or underage nudity are not allowed.",
    )

def test_modal_flux_generate_uses_flux2_klein_9b_default_endpoint(client, fake_services):
    image_bytes = b"fake-png-bytes"
    fake_services.http.queue(
        "post",
        FakeResponse(
            json_payload={
                "provider": "modal_flux",
                "model": "black-forest-labs/FLUX.2-klein-9B",
                "image_base64": base64.b64encode(image_bytes).decode("ascii"),
                "seed": 123456,
                "width": 1024,
                "height": 768,
                "requested_steps": 28,
                "actual_steps": 28,
                "guidance_scale": 3.5,
                "quality_mode": "balanced",
                "effective_width": 1024,
                "effective_height": 768,
                "negative_prompt_applied": False,
                "elapsed_ms": 1000,
            }
        ),
    )
    response = client.post(
        "/api/modal-image/generate",
        json={
            "prompt": "cinematic robot painter",
            "negative_prompt": "",
            "width": 1024,
            "height": 768,
            "steps": 28,
            "guidance_scale": 3.5,
            "seed": None,
            "quality_mode": "balanced",
        },
    )
    assert response.status_code == 200
    assert fake_services.http.calls[-1].url == "https://axiona2025--axstudio-flux-image-web-app.modal.run/generate"
    assert response.json()["model"] == "black-forest-labs/FLUX.2-klein-9B"
