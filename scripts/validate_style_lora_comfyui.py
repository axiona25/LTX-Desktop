#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


DEFAULT_ENDPOINT = "https://axiona2025--axstudio-comfyui-clean-comfyui-server.modal.run"
ROOT = Path(__file__).resolve().parents[1]
STYLE_PROFILES_FILE = ROOT / "src" / "config" / "styleProfiles.json"
VALIDATION_DIR = ROOT / "modal-workers" / "comfyui-clean" / "style_training" / "validation_prompts"
REGISTRY_FILE = ROOT / "modal-workers" / "comfyui-clean" / "style_training" / "style_lora_registry.json"
RESULTS_ROOT = ROOT / "benchmark" / "results"


def load_style_profile(style_id: str) -> dict[str, Any]:
    data = json.loads(STYLE_PROFILES_FILE.read_text(encoding="utf-8"))
    for profile in data["styles"]:
        if isinstance(profile, dict) and profile.get("id") == style_id:
            return profile
    raise SystemExit(f"Unknown style id: {style_id}")


def load_validation_prompts(style_id: str, profile: dict[str, Any]) -> list[dict[str, str]]:
    validation_path = VALIDATION_DIR / f"{style_id}_validation_prompts.json"
    if validation_path.exists():
        data = json.loads(validation_path.read_text(encoding="utf-8"))
        prompts = data.get("validation_prompts")
    else:
        prompts = profile.get("validation_prompts")
    if not isinstance(prompts, list):
        raise SystemExit(f"No validation prompts found for {style_id}")
    records: list[dict[str, str]] = []
    for item in prompts:
        if isinstance(item, dict) and isinstance(item.get("name"), str) and isinstance(item.get("prompt"), str):
            records.append({"name": item["name"], "prompt": item["prompt"]})
    if not records:
        raise SystemExit(f"Validation prompt list is empty for {style_id}")
    return records


def registry_lora(style_id: str) -> tuple[str, float]:
    data = json.loads(REGISTRY_FILE.read_text(encoding="utf-8"))
    styles = data.get("styles")
    if not isinstance(styles, list):
        raise SystemExit(f"Invalid registry: {REGISTRY_FILE}")
    for item in styles:
        if isinstance(item, dict) and item.get("style_id") == style_id:
            lora_name = item.get("target_lora_name")
            strength = item.get("lora_strength")
            if not isinstance(lora_name, str):
                break
            return lora_name, float(strength) if isinstance(strength, (int, float)) else 0.75
    raise SystemExit(f"No registry entry for {style_id}")


def post_json(url: str, payload: dict[str, Any], timeout: int = 120) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def get_json(url: str, timeout: int = 60) -> dict[str, Any]:
    with urllib.request.urlopen(url, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def get_bytes(url: str, timeout: int = 180) -> bytes:
    with urllib.request.urlopen(url, timeout=timeout) as response:
        return response.read()


def workflow(prompt: str, negative: str, lora_name: str, strength: float, seed: int, prefix: str) -> dict[str, Any]:
    model_ref: list[Any] = ["1", 0]
    clip_ref: list[Any] = ["1", 1]
    nodes: dict[str, Any] = {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "cyberrealisticXL_v100.safetensors"}},
    }
    if lora_name:
        nodes["8"] = {
            "class_type": "LoraLoader",
            "inputs": {
                "model": ["1", 0],
                "clip": ["1", 1],
                "lora_name": lora_name,
                "strength_model": strength,
                "strength_clip": strength,
            },
        }
        model_ref = ["8", 0]
        clip_ref = ["8", 1]
    nodes.update(
        {
            "2": {"class_type": "CLIPTextEncode", "inputs": {"clip": clip_ref, "text": prompt}},
            "3": {"class_type": "CLIPTextEncode", "inputs": {"clip": clip_ref, "text": negative}},
            "4": {"class_type": "EmptyLatentImage", "inputs": {"width": 1344, "height": 768, "batch_size": 1}},
            "5": {
                "class_type": "KSampler",
                "inputs": {
                    "model": model_ref,
                    "seed": seed,
                    "steps": 36,
                    "cfg": 7.5,
                    "sampler_name": "dpmpp_2m_sde",
                    "scheduler": "karras",
                    "positive": ["2", 0],
                    "negative": ["3", 0],
                    "latent_image": ["4", 0],
                    "denoise": 1.0,
                },
            },
            "6": {"class_type": "VAEDecode", "inputs": {"samples": ["5", 0], "vae": ["1", 2]}},
            "7": {"class_type": "SaveImage", "inputs": {"images": ["6", 0], "filename_prefix": prefix}},
        }
    )
    return nodes


def wait_history(endpoint: str, prompt_id: str) -> dict[str, Any]:
    deadline = time.monotonic() + 900
    while time.monotonic() < deadline:
        history = get_json(f"{endpoint}/history/{prompt_id}")
        item = history.get(prompt_id)
        if isinstance(item, dict) and item.get("outputs"):
            return item
        time.sleep(2)
    raise TimeoutError(f"Timed out waiting for prompt {prompt_id}")


def extract_image(history_item: dict[str, Any]) -> tuple[str, str, str]:
    outputs = history_item.get("outputs", {})
    if not isinstance(outputs, dict):
        raise RuntimeError("No outputs in ComfyUI history")
    for output in outputs.values():
        if not isinstance(output, dict):
            continue
        images = output.get("images", [])
        if not isinstance(images, list):
            continue
        for image in images:
            if isinstance(image, dict) and isinstance(image.get("filename"), str):
                return image["filename"], str(image.get("subfolder", "")), str(image.get("type", "output"))
    raise RuntimeError("No image in ComfyUI history")


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate a style LoRA through the deployed ComfyUI endpoint.")
    parser.add_argument("--style", required=True, help="AXSTUDIO style id")
    parser.add_argument("--endpoint", default=DEFAULT_ENDPOINT)
    parser.add_argument("--lora-name", default="")
    parser.add_argument("--strength", type=float, default=None)
    parser.add_argument("--seed", type=int, default=1778659001)
    parser.add_argument("--limit", type=int, default=4)
    args = parser.parse_args()

    profile = load_style_profile(args.style)
    prompts = load_validation_prompts(args.style, profile)
    registry_name, registry_strength = registry_lora(args.style)
    lora_name = args.lora_name or registry_name
    strength = args.strength if args.strength is not None else registry_strength
    negative = str(profile.get("negative_prompt") or "")
    output_dir = RESULTS_ROOT / f"{args.style}_lora_validation"
    output_dir.mkdir(parents=True, exist_ok=True)

    records = []
    for index, item in enumerate(prompts):
        if index >= args.limit:
            break
        prompt_id = item["name"]
        prompt = item["prompt"]
        prefix = f"validate_{args.style}_{prompt_id}_{int(time.time())}"
        graph = workflow(prompt, negative, lora_name, strength, args.seed + index, prefix)
        response = post_json(args.endpoint.rstrip("/") + "/prompt", {"prompt": graph})
        comfy_prompt_id = response["prompt_id"]
        history_item = wait_history(args.endpoint.rstrip("/"), comfy_prompt_id)
        filename, subfolder, image_type = extract_image(history_item)
        query = urllib.parse.urlencode({"filename": filename, "subfolder": subfolder, "type": image_type})
        image_bytes = get_bytes(args.endpoint.rstrip("/") + "/view?" + query)
        local_path = output_dir / f"{prefix}.png"
        local_path.write_bytes(image_bytes)
        records.append(
            {
                "style_id": args.style,
                "test_id": prompt_id,
                "prompt": prompt,
                "negative": negative,
                "seed": args.seed + index,
                "steps": 36,
                "cfg": 7.5,
                "lora_name": lora_name,
                "lora_strength": strength,
                "comfy_prompt_id": comfy_prompt_id,
                "comfy_filename": filename,
                "local_path": str(local_path),
                "image_base64_preview": base64.b64encode(image_bytes[:32]).decode("ascii"),
            }
        )
        print(f"saved {local_path}")

    manifest_path = output_dir / f"validation_manifest_{int(time.time())}.json"
    manifest_path.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {manifest_path}")


if __name__ == "__main__":
    main()
