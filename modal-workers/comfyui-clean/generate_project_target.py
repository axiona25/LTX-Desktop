from __future__ import annotations

import argparse
import random
import shutil
import time
from pathlib import Path

from generate_project_master import (
    COMFYUI_ENDPOINT,
    DEFAULT_CHECKPOINT,
    PROJECT_BASE,
    _build_workflow,
    _download_image,
    _extract_output_image,
    _safe_project_prefix,
    _submit_prompt,
    _wait_for_history,
)


DEFAULT_TARGET = "boudoir_test_00001_.png"
DEFAULT_PROMPT = (
    "realistic editorial boudoir style photo of an adult woman, one person, upper body and torso visible, "
    "face clearly visible, looking toward camera, natural pose, soft bedroom studio setting, simple clean "
    "background, flattering natural light, detailed skin texture, photorealistic, sharp focus, realistic body, "
    "clear facial features, no face occlusion, no hair covering face"
)
DEFAULT_NEGATIVE_PROMPT = (
    "blurry, low quality, distorted face, asymmetrical eyes, extra face, multiple people, profile view, side view, "
    "hair covering face, heavy shadows, bad anatomy, deformed eyes, deformed nose, deformed lips, cropped face, "
    "closed eyes, extra limbs, bad hands, watermark, text, overprocessed skin, plastic skin"
)


def generate_project_target(
    *,
    project_id: str,
    target_filename: str,
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
    input_dir = project_path / "FaceID" / "input"
    input_dir.mkdir(parents=True, exist_ok=True)
    target_name = Path(target_filename).name
    target_path = input_dir / target_name
    timestamp = int(time.time())
    project_prefix = _safe_project_prefix(project_id)
    filename_prefix = f"{project_prefix}_target_candidate_{timestamp}"

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
    print(f"target: {target_path}")
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
    generated_path = input_dir / f"generated_{filename}"
    generated_path.write_bytes(generated_bytes)

    backup_path: Path | None = None
    if target_path.exists():
        backup_path = input_dir / f"{target_path.stem}_backup_{timestamp}{target_path.suffix}"
        shutil.copy2(target_path, backup_path)

    shutil.copy2(generated_path, target_path)
    print(f"generated_local_path: {generated_path}")
    print(f"backup_target_path: {backup_path if backup_path else 'none'}")
    print(f"target_final_path: {target_path}")
    return prompt_id, filename, target_path, backup_path, generated_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate and replace a project FaceID target image via stable ComfyUI Modal.")
    parser.add_argument("--project", required=True)
    parser.add_argument("--target", default=DEFAULT_TARGET)
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

    generate_project_target(
        project_id=args.project,
        target_filename=args.target,
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
