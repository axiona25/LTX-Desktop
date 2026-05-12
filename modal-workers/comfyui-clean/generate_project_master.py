from __future__ import annotations

import argparse
import json
import random
import shutil
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


PROJECT_BASE = Path("/Users/r.amoroso/Documents/AXSTUDIO/modal-workers/comfyui-clean/Progetti")
COMFYUI_ENDPOINT = "https://axiona2025--axstudio-comfyui-clean-comfyui-server.modal.run"
DEFAULT_CHECKPOINT = "cyberrealisticXL_v100.safetensors"
DEFAULT_PROMPT = (
    "realistic portrait of an adult woman, centered face, upper body, looking straight at camera, "
    "neutral expression, natural skin texture, detailed hazel eyes, symmetrical face, clean background, "
    "soft even lighting, photorealistic, high detail, sharp focus, identity photo style, clear facial "
    "features, no occlusions, front-facing portrait, half bust portrait"
)
DEFAULT_NEGATIVE_PROMPT = (
    "blurry, low quality, distorted face, asymmetrical eyes, extra face, multiple people, profile view, "
    "side view, hair covering face, heavy shadows, bad anatomy, deformed eyes, deformed nose, deformed "
    "lips, cropped face, closed eyes, exaggerated makeup, overprocessed skin, plastic skin"
)


def _request_json(
    endpoint: str,
    path: str,
    *,
    method: str = "GET",
    payload: dict[str, Any] | None = None,
    timeout: int = 60,
) -> dict[str, Any]:
    url = endpoint.rstrip("/") + path
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {url} failed with HTTP {exc.code}: {body}") from exc
    if not body:
        return {}
    return json.loads(body)


def _download_image(endpoint: str, filename: str, subfolder: str, output_type: str) -> bytes:
    query = urllib.parse.urlencode(
        {
            "filename": filename,
            "subfolder": subfolder,
            "type": output_type,
        }
    )
    url = endpoint.rstrip("/") + "/view?" + query
    with urllib.request.urlopen(url, timeout=180) as response:
        return response.read()


def _safe_project_prefix(project_id: str) -> str:
    value = "".join(ch if ch.isalnum() else "_" for ch in project_id).strip("_")
    if not value:
        raise ValueError("project_id must contain at least one alphanumeric character")
    return value


def _build_workflow(
    *,
    checkpoint: str,
    prompt: str,
    negative_prompt: str,
    filename_prefix: str,
    seed: int,
    width: int,
    height: int,
    steps: int,
    cfg: float,
) -> dict[str, Any]:
    return {
        "1": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": checkpoint},
            "_meta": {"title": "Load checkpoint"},
        },
        "2": {
            "class_type": "CLIPTextEncode",
            "inputs": {"clip": ["1", 1], "text": prompt},
            "_meta": {"title": "Manual positive prompt"},
        },
        "3": {
            "class_type": "CLIPTextEncode",
            "inputs": {"clip": ["1", 1], "text": negative_prompt},
            "_meta": {"title": "Manual negative prompt"},
        },
        "4": {
            "class_type": "EmptyLatentImage",
            "inputs": {"width": width, "height": height, "batch_size": 1},
            "_meta": {"title": "Master portrait latent"},
        },
        "5": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["1", 0],
                "seed": seed,
                "steps": steps,
                "cfg": cfg,
                "sampler_name": "dpmpp_2m_sde",
                "scheduler": "karras",
                "positive": ["2", 0],
                "negative": ["3", 0],
                "latent_image": ["4", 0],
                "denoise": 1.0,
            },
            "_meta": {"title": "Generate master portrait"},
        },
        "6": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["5", 0], "vae": ["1", 2]},
            "_meta": {"title": "Decode image"},
        },
        "7": {
            "class_type": "SaveImage",
            "inputs": {"images": ["6", 0], "filename_prefix": filename_prefix},
            "_meta": {"title": "Save generated master"},
        },
    }


def _submit_prompt(endpoint: str, workflow: dict[str, Any]) -> str:
    response = _request_json(endpoint, "/prompt", method="POST", payload={"prompt": workflow}, timeout=120)
    prompt_id = response.get("prompt_id")
    if not isinstance(prompt_id, str) or not prompt_id:
        raise RuntimeError(f"/prompt did not return prompt_id: {response}")
    return prompt_id


def _wait_for_history(endpoint: str, prompt_id: str, timeout_seconds: int) -> dict[str, Any]:
    deadline = time.monotonic() + timeout_seconds
    last_response: dict[str, Any] = {}
    while time.monotonic() < deadline:
        history = _request_json(endpoint, f"/history/{prompt_id}", timeout=60)
        last_response = history
        item = history.get(prompt_id)
        if isinstance(item, dict):
            status = item.get("status", {})
            if status.get("status_str") == "error":
                raise RuntimeError(f"ComfyUI prompt failed: {json.dumps(status, indent=2)}")
            outputs = item.get("outputs", {})
            if outputs:
                return item
        time.sleep(3)
    raise TimeoutError(
        f"Timed out waiting for /history/{prompt_id}. Last response: "
        + json.dumps(last_response, indent=2)[:2000]
    )


def _extract_output_image(history_item: dict[str, Any]) -> tuple[str, str, str]:
    outputs = history_item.get("outputs", {})
    for output in outputs.values():
        images = output.get("images") if isinstance(output, dict) else None
        if not isinstance(images, list):
            continue
        for image in images:
            if not isinstance(image, dict):
                continue
            filename = image.get("filename")
            if isinstance(filename, str) and filename:
                subfolder = image.get("subfolder")
                output_type = image.get("type")
                return (
                    filename,
                    subfolder if isinstance(subfolder, str) else "",
                    output_type if isinstance(output_type, str) else "output",
                )
    raise RuntimeError(f"No output image found in history: {json.dumps(outputs, indent=2)}")


def generate_project_master(
    *,
    project_id: str,
    prompt: str,
    negative_prompt: str,
    checkpoint: str,
    seed: int,
    timeout: int,
    width: int,
    height: int,
    steps: int,
    cfg: float,
) -> tuple[str, str, Path, Path | None, Path]:
    project_path = PROJECT_BASE / project_id
    master_dir = project_path / "MasterID"
    master_dir.mkdir(parents=True, exist_ok=True)
    master_final_path = master_dir / "master_final.png"
    timestamp = int(time.time())
    project_prefix = _safe_project_prefix(project_id)
    filename_prefix = f"{project_prefix}_master_candidate_{timestamp}"

    workflow = _build_workflow(
        checkpoint=checkpoint,
        prompt=prompt,
        negative_prompt=negative_prompt,
        filename_prefix=filename_prefix,
        seed=seed,
        width=width,
        height=height,
        steps=steps,
        cfg=cfg,
    )

    print(f"endpoint: {COMFYUI_ENDPOINT}")
    print(f"project: {project_id}")
    print(f"checkpoint: {checkpoint}")
    print(f"seed: {seed}")
    print(f"size: {width}x{height}")
    print(f"steps: {steps}")
    print(f"cfg: {cfg}")
    print(f"filename_prefix: {filename_prefix}")
    print(f"prompt: {prompt}")
    print(f"negative_prompt: {negative_prompt}")

    prompt_id = _submit_prompt(COMFYUI_ENDPOINT, workflow)
    print(f"prompt_id: {prompt_id}")

    history_item = _wait_for_history(COMFYUI_ENDPOINT, prompt_id, timeout)
    filename, subfolder, output_type = _extract_output_image(history_item)
    print(f"history_filename: {filename}")
    print(f"history_subfolder: {subfolder}")
    print(f"history_type: {output_type}")

    generated_bytes = _download_image(COMFYUI_ENDPOINT, filename, subfolder, output_type)
    generated_path = master_dir / f"generated_{filename}"
    generated_path.write_bytes(generated_bytes)

    backup_path: Path | None = None
    if master_final_path.exists():
        backup_path = master_dir / f"master_backup_{timestamp}.png"
        shutil.copy2(master_final_path, backup_path)

    shutil.copy2(generated_path, master_final_path)
    print(f"generated_local_path: {generated_path}")
    print(f"backup_master_path: {backup_path if backup_path else 'none'}")
    print(f"master_final_path: {master_final_path}")
    return prompt_id, filename, master_final_path, backup_path, generated_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate and install a project master image via stable ComfyUI Modal.")
    parser.add_argument("--project", required=True)
    parser.add_argument("--prompt", default=DEFAULT_PROMPT)
    parser.add_argument("--negative-prompt", default=DEFAULT_NEGATIVE_PROMPT)
    parser.add_argument("--checkpoint", default=DEFAULT_CHECKPOINT)
    parser.add_argument("--seed", type=int, default=random.SystemRandom().randint(0, 2**31 - 1))
    parser.add_argument("--timeout", type=int, default=900)
    parser.add_argument("--width", type=int, default=832)
    parser.add_argument("--height", type=int, default=1216)
    parser.add_argument("--steps", type=int, default=36)
    parser.add_argument("--cfg", type=float, default=5.0)
    args = parser.parse_args()

    if args.seed < 0:
        raise SystemExit("--seed must be >= 0")
    if args.width <= 0 or args.height <= 0:
        raise SystemExit("--width and --height must be > 0")
    if args.steps <= 0:
        raise SystemExit("--steps must be > 0")
    if args.cfg <= 0:
        raise SystemExit("--cfg must be > 0")

    generate_project_master(
        project_id=args.project,
        prompt=args.prompt,
        negative_prompt=args.negative_prompt,
        checkpoint=args.checkpoint,
        seed=args.seed,
        timeout=args.timeout,
        width=args.width,
        height=args.height,
        steps=args.steps,
        cfg=args.cfg,
    )


if __name__ == "__main__":
    main()
