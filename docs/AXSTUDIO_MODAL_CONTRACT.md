# AXSTUDIO Modal Integration Contract

AXSTUDIO is a desktop fork of LTX Desktop where AX owns prompt planning and orchestration through an external LLM service running on Modal. LTX remains the local render engine for image-to-video/video generation, asset handling, preview, timeline/editor, and export.

## Control Boundary

AXSTUDIO must not rely on the original LTX prompt enhancer to decide creative direction.

- AX LLM: expands intent, writes the final generation prompt, decides negative prompt, motion/camera, duration, fps, model, aspect ratio, and optional audio guidance.
- LTX Desktop backend: validates settings, calls AX Modal when orchestration is enabled, then sends the returned render plan to the existing LTX generation pipeline.
- LTX local models: render final media only.
- AX Modal tools: perform character generation from an image and face swap for generated images/videos.

The default text-to-video prompt enhancer is disabled in AXSTUDIO settings. Enable `AX Modal prompt orchestration` to make `/api/generate` fail closed when Modal is not configured, instead of silently using raw UI prompts.

## Runtime Settings

Settings can be configured in the desktop UI under `Settings > API Keys > AX Modal LLM` or via environment variables.

| Setting | Env var | Purpose |
| --- | --- | --- |
| `axModalEndpoint` | `AX_MODAL_ENDPOINT` | Base URL or invoke URL for the Modal orchestration service. |
| `axModalApiKey` | `AX_MODAL_API_KEY` | Optional bearer token. Never returned to the frontend. |
| `axModalPromptOrchestrationEnabled` | `AX_MODAL_PROMPT_ORCHESTRATION_ENABLED` | Enables AX LLM planning before LTX generation. |

`AX_MODAL_PROMPT_ORCHESTRATION_ENABLED` accepts truthy values such as `1`, `true`, `yes`, or `on`.

## Transport

AXSTUDIO sends JSON over HTTP `POST`.

Headers:

```http
Content-Type: application/json
Authorization: Bearer <AX_MODAL_API_KEY>
```

`Authorization` is omitted when no key is configured.

The configured endpoint can be either:

- A single invoke endpoint that accepts the `task` field.
- A router/proxy endpoint that dispatches by `task` internally.

## Prompt Planning

Called automatically before the existing LTX `/api/generate` handler when AX orchestration is enabled.

Request:

```json
{
  "task": "plan_generation",
  "mode": "image_to_video",
  "request": {
    "prompt": "raw user/director intent",
    "negative_prompt": "optional original negative prompt",
    "image_path": "/absolute/path/to/input.png",
    "duration": 5,
    "fps": 24,
    "resolution": "720p",
    "aspect_ratio": "16:9",
    "model": "ltxv-13b-0.9.8-distilled",
    "camera_motion": "optional UI value",
    "audio": false
  },
  "project": {
    "app": "AXSTUDIO",
    "source": "desktop"
  }
}
```

Response:

```json
{
  "prompt": "final production prompt for LTX render",
  "negativePrompt": "final negative prompt",
  "cameraMotion": "slow dolly in",
  "resolution": "720p",
  "model": "ltxv-13b-0.9.8-distilled",
  "duration": 5,
  "fps": 24,
  "audio": false,
  "aspectRatio": "16:9",
  "metadata": {
    "llmModel": "ax-director-v1",
    "stylePreset": "cinematic portrait"
  }
}
```

Only fields returned by Modal override the original request. Missing optional fields keep the existing LTX values.

## Character Generation From Image

Endpoint exposed by AXSTUDIO backend:

```http
POST /api/ax/character/generate
```

AXSTUDIO forwards the request to Modal with `task: "character_from_image"`.

Frontend request to AXSTUDIO:

```json
{
  "imagePath": "/absolute/path/to/reference.png",
  "characterName": "Marta",
  "prompt": "create a consistent cinematic character reference",
  "metadata": {
    "projectId": "optional"
  }
}
```

Modal request:

```json
{
  "task": "character_from_image",
  "imagePath": "/absolute/path/to/reference.png",
  "image": {
    "kind": "data_url",
    "mimeType": "image/png",
    "data": "data:image/png;base64,..."
  },
  "characterName": "Marta",
  "prompt": "create a consistent cinematic character reference",
  "metadata": {
    "projectId": "optional"
  }
}
```

Expected Modal response:

```json
{
  "id": "char_marta_001",
  "output_path": "/absolute/path/to/character.png",
  "metadata": {
    "embedding_path": "/absolute/path/to/character.pt"
  }
}
```

Alternative response formats are supported:

```json
{ "output_url": "https://.../character.png" }
```

```json
{
  "output_base64": "iVBORw0KGgoAAA...",
  "mime_type": "image/png"
}
```

When `output_base64` is returned, AXSTUDIO writes the file into the configured LTX output directory and returns the saved path.

## Face Swap For Images And Videos

Endpoint exposed by AXSTUDIO backend:

```http
POST /api/ax/face-swap
```

AXSTUDIO forwards the request to Modal with `task: "face_swap"`.

Frontend request to AXSTUDIO:

```json
{
  "sourceMediaPath": "/absolute/path/to/generated-video.mp4",
  "targetFacePath": "/absolute/path/to/face.png",
  "mediaType": "video",
  "prompt": "preserve lighting and identity; avoid waxy skin",
  "metadata": {
    "projectId": "optional"
  }
}
```

Modal request:

```json
{
  "task": "face_swap",
  "sourceMediaPath": "/absolute/path/to/generated-video.mp4",
  "targetFacePath": "/absolute/path/to/face.png",
  "mediaType": "video",
  "sourceMedia": {
    "kind": "path",
    "path": "/absolute/path/to/generated-video.mp4"
  },
  "targetFace": {
    "kind": "data_url",
    "mimeType": "image/png",
    "data": "data:image/png;base64,..."
  },
  "prompt": "preserve lighting and identity; avoid waxy skin",
  "metadata": {
    "projectId": "optional"
  }
}
```

For image sources, AXSTUDIO can send both source and target as data URLs. For video sources, AXSTUDIO currently sends the source path and target face data URL. If Modal runs remotely and cannot read local paths, add an upload/presigned-storage step before calling the face-swap worker.

Expected Modal response follows the same output contract as character generation:

```json
{
  "id": "swap_001",
  "output_path": "/absolute/path/to/swapped-video.mp4",
  "metadata": {
    "framesProcessed": 120
  }
}
```

## Error Contract

Modal should return non-2xx HTTP status codes for hard failures.

Recommended error body:

```json
{
  "error": "face not detected in target image",
  "code": "FACE_NOT_DETECTED",
  "details": {
    "targetFacePath": "/absolute/path/to/face.png"
  }
}
```

AXSTUDIO propagates the failure as an HTTP error to the desktop frontend.

## Implementation Notes

- Prompt orchestration is fail-closed when enabled: no Modal endpoint means generation returns `409`.
- The API key is write-only from the frontend perspective; the settings API only exposes `hasAxModalApiKey`.
- The AX Tools view is a first integration screen. The next step is binding outputs into the project asset library/timeline instead of displaying raw JSON.
- Character generation and face swap are Modal-backed by design; the local LTX engine is not expected to provide those features natively.
