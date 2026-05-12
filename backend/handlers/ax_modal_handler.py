"""AXSTUDIO Modal integration handler.

This layer keeps LTX as the rendering engine while letting AX own prompt
planning, character creation, and face-swap workflows through a Modal-hosted
LLM/service endpoint.
"""

from __future__ import annotations

import base64
import logging
import mimetypes
import uuid
from pathlib import Path
from threading import RLock
from typing import TYPE_CHECKING, Any, Literal, cast

from _routes._errors import HTTPError
from api_types import (
    AxCharacterGenerateRequest,
    AxFaceSwapRequest,
    AxModalAssetResponse,
    AxPromptPlan,
    GenerateVideoRequest,
    JsonObject,
)
from handlers.base import StateHandlerBase
from server_utils.media_validation import validate_image_file
from services.interfaces import HTTPClient, HttpTimeoutError, JSONValue
from state.app_state_types import AppState

if TYPE_CHECKING:
    from runtime_config.runtime_config import RuntimeConfig

logger = logging.getLogger(__name__)

AxTask = Literal["plan_image_to_video", "plan_text_to_video", "plan_audio_to_video", "character_from_image", "face_swap"]


class AxModalHandler(StateHandlerBase):
    def __init__(
        self,
        state: AppState,
        lock: RLock,
        http: HTTPClient,
        config: RuntimeConfig,
    ) -> None:
        super().__init__(state, lock, config)
        self._http = http

    def plan_generation(self, req: GenerateVideoRequest, *, mode: str) -> AxPromptPlan:
        payload: JsonObject = {
            "task": mode,
            "prompt": req.prompt,
            "generation": {
                "resolution": req.resolution,
                "model": req.model,
                "cameraMotion": req.cameraMotion,
                "negativePrompt": req.negativePrompt,
                "duration": req.duration,
                "fps": req.fps,
                "audio": req.audio,
                "aspectRatio": req.aspectRatio,
            },
        }
        if req.imagePath:
            payload["inputImage"] = self._build_media_payload(req.imagePath)
        if req.audioPath:
            payload["inputAudio"] = self._build_media_payload(req.audioPath, include_data=False)

        task: AxTask = "plan_audio_to_video" if req.audioPath else "plan_image_to_video" if req.imagePath else "plan_text_to_video"
        result = self._call_modal(task, payload)
        plan_payload = result.get("plan", result)
        if not isinstance(plan_payload, dict):
            raise HTTPError(502, "AX Modal returned an invalid prompt plan")
        return AxPromptPlan.model_validate(plan_payload)

    def generate_character(self, req: AxCharacterGenerateRequest) -> AxModalAssetResponse:
        validate_image_file(req.image_path)
        result = self._call_modal(
            "character_from_image",
            {
                "task": "character_from_image",
                "image": self._build_media_payload(req.image_path),
                "prompt": req.prompt,
                "characterName": req.character_name,
                "outputKind": req.output_kind,
            },
        )
        return self._asset_response_from_modal(result, default_suffix=".json")

    def face_swap(self, req: AxFaceSwapRequest) -> AxModalAssetResponse:
        if req.media_type == "image":
            validate_image_file(req.source_media_path)
        validate_image_file(req.target_face_path)

        result = self._call_modal(
            "face_swap",
            {
                "task": "face_swap",
                "sourceMedia": self._build_media_payload(req.source_media_path, include_data=req.media_type == "image"),
                "targetFace": self._build_media_payload(req.target_face_path),
                "prompt": req.prompt,
                "mediaType": req.media_type,
            },
            timeout=600,
        )
        return self._asset_response_from_modal(result, default_suffix=".mp4" if req.media_type == "video" else ".png")

    def _call_modal(self, task: AxTask, payload: JsonObject, *, timeout: int = 180) -> dict[str, Any]:
        settings = self.state.app_settings.model_copy(deep=True)
        endpoint = settings.ax_modal_endpoint.strip()
        if not endpoint:
            raise HTTPError(409, "AX Modal endpoint is not configured")

        headers = {"X-AX-Task": task}
        if settings.ax_modal_api_key.strip():
            headers["Authorization"] = f"Bearer {settings.ax_modal_api_key.strip()}"

        try:
            response = self._http.post(endpoint, headers=headers, json_payload=cast(dict[str, JSONValue], payload), timeout=timeout)
        except HttpTimeoutError as exc:
            raise HTTPError(504, f"AX Modal request timed out: {task}") from exc

        if response.status_code < 200 or response.status_code >= 300:
            detail = response.text or f"AX Modal returned HTTP {response.status_code}"
            raise HTTPError(response.status_code, detail)

        try:
            parsed = response.json()
        except Exception as exc:
            raise HTTPError(502, "AX Modal returned invalid JSON") from exc

        if not isinstance(parsed, dict):
            raise HTTPError(502, "AX Modal response must be a JSON object")
        return cast(dict[str, Any], parsed)

    def _build_media_payload(self, path_value: str, *, include_data: bool = True) -> JsonObject:
        path = Path(path_value)
        payload: JsonObject = {
            "path": str(path),
            "name": path.name,
            "mimeType": mimetypes.guess_type(path.name)[0] or "application/octet-stream",
        }
        if include_data:
            payload["dataUrl"] = self._file_to_data_url(path)
        return payload

    def _file_to_data_url(self, path: Path) -> str:
        mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        encoded = base64.b64encode(path.read_bytes()).decode("ascii")
        return f"data:{mime_type};base64,{encoded}"

    def _asset_response_from_modal(self, result: dict[str, Any], *, default_suffix: str) -> AxModalAssetResponse:
        output_path = result.get("output_path")
        output_url = result.get("output_url")

        if not output_path and isinstance(result.get("output_base64"), str):
            output_path = str(self._write_base64_output(result["output_base64"], default_suffix=default_suffix))

        metadata: JsonObject = {}
        raw_metadata = result.get("metadata", {})
        if isinstance(raw_metadata, dict):
            metadata = cast(JsonObject, raw_metadata)

        return AxModalAssetResponse(
            status="complete",
            output_path=str(output_path) if output_path else None,
            output_url=str(output_url) if output_url else None,
            metadata=metadata,
        )

    def _write_base64_output(self, data: str, *, default_suffix: str) -> Path:
        payload = data
        suffix = default_suffix
        if data.startswith("data:"):
            header, _, payload = data.partition(",")
            mime_type = header.removeprefix("data:").split(";", 1)[0]
            guessed = mimetypes.guess_extension(mime_type)
            if guessed:
                suffix = guessed

        output_path = self.config.outputs_dir / f"ax_modal_{uuid.uuid4().hex[:8]}{suffix}"
        output_path.write_bytes(base64.b64decode(payload))
        return output_path
