#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
REGISTRY_FILE = ROOT / "modal-workers" / "comfyui-clean" / "style_training" / "style_lora_registry.json"


def main() -> None:
    parser = argparse.ArgumentParser(description="Promote or disable an AXSTUDIO style LoRA registry entry.")
    parser.add_argument("--style", required=True, help="AXSTUDIO style id")
    parser.add_argument("--lora-name", default="", help="Override target lora name, e.g. style/AXSTYLE_pixel_art_v1.safetensors")
    parser.add_argument("--strength", type=float, default=None)
    parser.add_argument("--status", default="validated", choices=["validated", "not_validated", "disabled"])
    parser.add_argument("--disable", action="store_true")
    args = parser.parse_args()

    data = json.loads(REGISTRY_FILE.read_text(encoding="utf-8"))
    styles = data.get("styles")
    if not isinstance(styles, list):
        raise SystemExit(f"Invalid registry: {REGISTRY_FILE}")

    target: dict[str, Any] | None = None
    for item in styles:
        if isinstance(item, dict) and item.get("style_id") == args.style:
            target = item
            break
    if target is None:
        raise SystemExit(f"Style not found in registry: {args.style}")

    if args.lora_name:
        target["target_lora_name"] = args.lora_name
    if args.strength is not None:
        target["lora_strength"] = args.strength
    target["enabled"] = not args.disable and args.status == "validated"
    target["promotion_status"] = "disabled" if args.disable else args.status

    REGISTRY_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(
        f"{args.style}: enabled={target['enabled']} "
        f"status={target['promotion_status']} lora={target['target_lora_name']}"
    )


if __name__ == "__main__":
    main()
