"""Pydantic request/response models and typed aliases for ltx2_server."""

from __future__ import annotations

from typing import Annotated
from typing import Literal, NamedTuple, TypeAlias

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

NonEmptyPrompt = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
ModelCheckpointID = Literal[
    "ltx-2.3-22b-distilled",
    "ltx-2.3-spatial-upscaler-x2-1.0",
    "ltx-2.3-22b-ic-lora-union-control-ref0.5",
    "dpt-hybrid-midas",
    "yolox-l-torchscript",
    "dw-ll-ucoco-384-bs5",
    "gemma-3-12b-it-qat-q4_0-unquantized",
    "z-image-turbo",
]
LTXLocalModelId = Literal["ltx-2.3-22b-distilled"]


class ImageConditioningInput(NamedTuple):
    """Image conditioning triplet used by all video pipelines."""

    path: str
    frame_idx: int
    strength: float


JsonObject: TypeAlias = dict[str, object]
VideoCameraMotion = Literal[
    "none",
    "dolly_in",
    "dolly_out",
    "dolly_left",
    "dolly_right",
    "jib_up",
    "jib_down",
    "static",
    "focus_shift",
]


# ============================================================
# Response Models
# ============================================================


class ModelStatusItem(BaseModel):
    id: str
    name: str
    loaded: bool
    downloaded: bool


class GpuTelemetry(BaseModel):
    name: str
    vram: int
    vramUsed: int


class HealthResponse(BaseModel):
    status: Literal["ok"]
    models_loaded: bool
    active_model: str | None
    gpu_info: GpuTelemetry
    sage_attention: bool
    models_status: list[ModelStatusItem]


class GpuInfoResponse(BaseModel):
    cuda_available: bool
    mps_available: bool = False
    gpu_available: bool = False
    gpu_name: str | None
    vram_gb: int | None
    gpu_info: GpuTelemetry


class RuntimePolicyResponse(BaseModel):
    force_api_generations: bool


class GenerationProgressResponse(BaseModel):
    status: Literal["idle", "running", "complete", "cancelled", "error"]
    phase: str
    progress: int
    currentStep: int | None
    totalSteps: int | None


class DownloadProgressRunningResponse(BaseModel):
    status: Literal["downloading"]
    current_downloading_file: ModelCheckpointID | None
    current_file_progress: float
    total_progress: float
    total_downloaded_bytes: int
    expected_total_bytes: int
    completed_files: set[ModelCheckpointID]
    all_files: set[ModelCheckpointID]
    error: None = None
    speed_bytes_per_sec: float


class DownloadProgressCompleteResponse(BaseModel):
    status: Literal["complete"]


class DownloadProgressErrorResponse(BaseModel):
    status: Literal["error"]
    error: str


DownloadProgressResponse: TypeAlias = (
    DownloadProgressRunningResponse | DownloadProgressCompleteResponse | DownloadProgressErrorResponse
)


class SuggestGapPromptResponse(BaseModel):
    status: Literal["success"] = "success"
    suggested_prompt: str


class GenerateVideoCompleteResponse(BaseModel):
    status: Literal["complete"]
    video_path: str


class GenerateVideoCancelledResponse(BaseModel):
    status: Literal["cancelled"]


GenerateVideoResponse: TypeAlias = GenerateVideoCompleteResponse | GenerateVideoCancelledResponse


class AxModalAssetResponse(BaseModel):
    model_config = ConfigDict(strict=True)

    status: Literal["complete"]
    output_path: str | None = None
    output_url: str | None = None
    metadata: JsonObject = Field(default_factory=dict)


class ModalPromptEnhanceRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    idea: NonEmptyPrompt
    style: str | None = None
    aspect_ratio: str | None = None
    language: str | None = None


class ModalPromptEnhanceResponse(BaseModel):
    model_config = ConfigDict(strict=True)

    final_prompt: str
    negative_prompt: str
    display_final_prompt: str | None = None
    display_negative_prompt: str | None = None
    style_tags: list[str]
    recommended_width: int
    recommended_height: int
    suggested_steps: int
    guidance_scale: float
    composition_intent: Literal["portrait", "full_body", "landscape_scene", "product", "architecture", "generic"] = "generic"
    subject_type: Literal["person", "environment", "object", "product", "architecture", "mixed", "generic"] = "generic"


class ModalPromptTranslateRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    text: NonEmptyPrompt
    target_language: Literal["en", "it"]
    source_language: str | None = None
    kind: Literal["prompt", "negative_prompt", "style"] = "prompt"


class ModalPromptTranslateResponse(BaseModel):
    model_config = ConfigDict(strict=True)

    translated_text: str
    source_language: str | None = None
    target_language: Literal["en", "it"]
    kind: Literal["prompt", "negative_prompt", "style"] = "prompt"


FluxQualityMode = Literal["preview", "balanced", "premium"]
PromptSource = Literal["llm_enhanced", "user_edited", "manual"]


class ModalFluxImageGenerateRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    prompt: NonEmptyPrompt
    negative_prompt: str = ""
    width: int = Field(default=1024, ge=16)
    height: int = Field(default=1024, ge=16)
    steps: int = Field(default=28, ge=1)
    guidance_scale: float = Field(default=3.5, ge=0)
    seed: int | None = Field(default=None, ge=0, le=2_147_483_647)
    quality_mode: FluxQualityMode = "balanced"
    original_idea: str | None = None
    llm_enhanced_prompt: str | None = None
    final_prompt: str | None = None
    prompt_was_user_edited: bool = False
    prompt_source: PromptSource = "manual"
    selected_style_id: str | None = None
    selected_style_label: str | None = None
    selected_style_category: str | None = None
    image_character_id: str | None = None
    image_character_name: str | None = None
    image_character_image_path: str | None = None
    image_character_prompt: str | None = None
    image_character_negative_prompt: str | None = None
    use_character_lora: bool = False
    custom_style_text: str | None = None
    style_prompt_modifier: str | None = None
    style_negative_modifier: str | None = None
    style_was_applied: bool = False
    negative_prompt_final: str | None = None
    visible_prompt_before_generate: str | None = None
    payload_prompt_sent_to_backend: str | None = None
    frontend_negative_prompt: str | None = None
    idea_is_primary_guide: bool = False
    composition_intent: str | None = None
    subject_type: str | None = None
    required_traits: JsonObject = Field(default_factory=dict)
    requested_aspect_ratio: str | None = None
    effective_aspect_ratio: str | None = None
    aspect_ratio_overridden: bool = False
    aspect_ratio_override_reason: str | None = None
    removed_conflicting_prompt_terms: list[str] = Field(default_factory=list)
    descriptive_trait_lock_applied: bool = False
    trait_lock_types_applied: list[str] = Field(default_factory=list)
    no_people_lock_applied: bool = False
    prompt_visibility_violation: bool = False
    backend_semantic_rewrite_after_generate: bool = False


class ModalFluxImageGenerateResponse(BaseModel):
    model_config = ConfigDict(strict=True)

    provider: Literal["modal_flux"]
    model: str
    image_base64: str
    seed: int
    width: int
    height: int
    requested_steps: int
    actual_steps: int
    guidance_scale: float
    quality_mode: FluxQualityMode
    effective_width: int
    effective_height: int
    negative_prompt_applied: bool
    elapsed_ms: int
    local_path: str
    metadata_path: str


class GenerateImageCompleteResponse(BaseModel):
    status: Literal["complete"]
    image_paths: list[str]


class GenerateImageCancelledResponse(BaseModel):
    status: Literal["cancelled"]


GenerateImageResponse: TypeAlias = GenerateImageCompleteResponse | GenerateImageCancelledResponse


class CancelCancellingResponse(BaseModel):
    status: Literal["cancelling"]
    id: str


class CancelNoActiveGenerationResponse(BaseModel):
    status: Literal["no_active_generation"]


CancelResponse: TypeAlias = CancelCancellingResponse | CancelNoActiveGenerationResponse


class RetakeVideoResponse(BaseModel):
    status: Literal["complete"]
    video_path: str


class RetakePayloadResponse(BaseModel):
    status: Literal["complete"]
    result: JsonObject


class RetakeCancelledResponse(BaseModel):
    status: Literal["cancelled"]


RetakeResponse: TypeAlias = RetakeVideoResponse | RetakePayloadResponse | RetakeCancelledResponse


class IcLoraExtractResponse(BaseModel):
    conditioning: str
    original: str
    conditioning_type: ConditioningType
    frame_time: float


class IcLoraGenerateCompleteResponse(BaseModel):
    status: Literal["complete"]
    video_path: str


class IcLoraGenerateCancelledResponse(BaseModel):
    status: Literal["cancelled"]


IcLoraGenerateResponse: TypeAlias = IcLoraGenerateCompleteResponse | IcLoraGenerateCancelledResponse


# ============================================================
# HuggingFace auth
# ============================================================


class HuggingFaceLoginResponse(BaseModel):
    client_id: str
    redirect_uri: str
    scope: str
    state: str
    code_challenge: str
    code_challenge_method: str


class HuggingFaceAuthStatusResponse(BaseModel):
    status: Literal["authenticated", "pending", "not_authenticated"]


class HuggingFaceLogoutResponse(BaseModel):
    status: Literal["logged_out"]


class ModelDownloadStartResponse(BaseModel):
    status: Literal["started"]
    message: str
    sessionId: str


class LtxDownloadRecommendationResponse(BaseModel):
    status: Literal["download"]
    cps_to_download: list[ModelCheckpointID]


class LtxUpgradeRecommendationResponse(BaseModel):
    status: Literal["upgrade"]
    ltx_model_id: LTXLocalModelId
    upgrade_message: str | None = None
    cps_to_download: list[ModelCheckpointID]
    cps_to_delete: list[ModelCheckpointID]


class LtxOkRecommendationResponse(BaseModel):
    status: Literal["ok"]


LtxRecommendationResponse: TypeAlias = (
    LtxDownloadRecommendationResponse | LtxUpgradeRecommendationResponse | LtxOkRecommendationResponse
)


class ImageGenRecommendationResponse(BaseModel):
    cp_to_download: ModelCheckpointID | None


class LtxIcLoraRecommendationResponse(BaseModel):
    cps_to_download: list[ModelCheckpointID]


class TextEncoderRecommendationResponse(BaseModel):
    cp_to_download: ModelCheckpointID | None
    expected_size_bytes: int
    expected_size_gb: float


class StatusResponse(BaseModel):
    status: str


class HTTPErrorResponse(BaseModel):
    code: str
    message: str


class LtxInsufficientFundsErrorResponse(BaseModel):
    code: Literal["LTX_INSUFFICIENT_FUNDS"]
    message: str


# ============================================================
# Request Models
# ============================================================


LTXVideoGenResolution: TypeAlias = Literal["540p", "720p", "1080p", "1440p", "2160p"]
LTXVideoGenDuration: TypeAlias = Literal[5, 6, 8, 10, 12, 14, 16, 18, 20]
LTXVideoGenFps: TypeAlias = Literal[24, 25, 48, 50]
LTXVideoGenPipeline: TypeAlias = Literal["fast", "pro"]


class LTXVideoGenerationResolutionSpec(BaseModel):
    fps_to_durations: dict[LTXVideoGenFps, list[LTXVideoGenDuration]]


class LTXVideoGenerationSpec(BaseModel):
    display_name: str
    supported_resolutions_durations: dict[LTXVideoGenResolution, LTXVideoGenerationResolutionSpec]
    a2v_supported_resolutions_durations: dict[LTXVideoGenResolution, LTXVideoGenerationResolutionSpec] | None = None


class LTXVideoGenerationModelSpecItem(BaseModel):
    pipeline: LTXVideoGenPipeline
    spec: LTXVideoGenerationSpec


class GenerateVideoModelsSpecsResponse(BaseModel):
    local_models: list[LTXVideoGenerationModelSpecItem]
    api_models: list[LTXVideoGenerationModelSpecItem]


class GenerateVideoRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    prompt: NonEmptyPrompt
    resolution: LTXVideoGenResolution = "1080p"
    model: LTXVideoGenPipeline = "fast"
    cameraMotion: VideoCameraMotion = "none"
    negativePrompt: str = ""
    duration: LTXVideoGenDuration = 5
    fps: LTXVideoGenFps = 24
    audio: bool = False
    imagePath: str | None = None
    audioPath: str | None = None
    aspectRatio: Literal["16:9", "9:16"] = "16:9"


class AxPromptPlan(BaseModel):
    model_config = ConfigDict(strict=True)

    prompt: str | None = None
    negativePrompt: str | None = None
    cameraMotion: VideoCameraMotion | None = None
    resolution: LTXVideoGenResolution | None = None
    model: LTXVideoGenPipeline | None = None
    duration: LTXVideoGenDuration | None = None
    fps: LTXVideoGenFps | None = None
    audio: bool | None = None
    aspectRatio: Literal["16:9", "9:16"] | None = None


class GenerateImageRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    prompt: NonEmptyPrompt
    width: int = Field(default=1024, ge=16)
    height: int = Field(default=1024, ge=16)
    numSteps: int = Field(default=4, ge=1)
    numImages: int = Field(default=1, ge=1)


class AxCharacterGenerateRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    image_path: str
    prompt: str = ""
    character_name: str = ""
    output_kind: Literal["profile", "image", "video"] = "profile"


class AxFaceSwapRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    source_media_path: str
    target_face_path: str
    prompt: str = ""
    media_type: Literal["image", "video"] = "image"


def _default_model_types() -> set[ModelCheckpointID]:
    return set()


class ModelDownloadRequest(BaseModel):
    type: Literal["download", "upgrade"] = "download"
    cp_ids: set[ModelCheckpointID] = Field(default_factory=_default_model_types)


ModelAccessStatus: TypeAlias = Literal["authorized", "not_authorized"]


class CheckModelAccessRequest(BaseModel):
    cp_ids: set[ModelCheckpointID] = Field(default_factory=_default_model_types)


class CheckModelAccessResponse(BaseModel):
    access: dict[str, ModelAccessStatus]


class ModelDeleteRequest(BaseModel):
    cp_ids: set[ModelCheckpointID] = Field(default_factory=_default_model_types)


GapPromptMode: TypeAlias = Literal["text-to-video", "image-to-video", "text-to-image"]


class SuggestGapPromptRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    beforePrompt: str = ""
    afterPrompt: str = ""
    beforeFrame: str | None = None
    afterFrame: str | None = None
    gapDuration: float = 5
    mode: GapPromptMode = "text-to-video"
    inputImage: str | None = None

    @model_validator(mode="after")
    def _validate_input_image_mode(self) -> "SuggestGapPromptRequest":
        if self.inputImage is not None and self.mode != "image-to-video":
            raise ValueError("inputImage is only valid for image-to-video mode")
        return self


RetakeMode: TypeAlias = Literal["replace_audio_and_video", "replace_video", "replace_audio"]


class RetakeRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    video_path: str
    start_time: float
    duration: float
    prompt: str = ""
    mode: RetakeMode = "replace_audio_and_video"


ConditioningType: TypeAlias = Literal["canny", "depth"]


class IcLoraExtractRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    video_path: str
    conditioning_type: ConditioningType = "canny"
    frame_time: float = 0


class IcLoraImageInput(BaseModel):
    model_config = ConfigDict(strict=True)

    path: str
    frame: int = 0
    strength: float = 1.0


def _default_ic_lora_images() -> list[IcLoraImageInput]:
    return []


class IcLoraGenerateRequest(BaseModel):
    model_config = ConfigDict(strict=True)
    video_path: str
    conditioning_type: ConditioningType
    prompt: NonEmptyPrompt
    conditioning_strength: float = 1.0
    num_inference_steps: int = 30
    cfg_guidance_scale: float = 1.0
    negative_prompt: str = ""
    images: list[IcLoraImageInput] = Field(default_factory=_default_ic_lora_images)
