#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROMPTS_FILE = ROOT / "benchmark" / "style_test_prompts.json"
RESULTS_DIR = ROOT / "benchmark" / "results"


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare AXSTUDIO style benchmark records.")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of generated commands.")
    parser.add_argument("--project", default="STYLE_BENCHMARK", help="Project name for output metadata.")
    parser.add_argument("--resolution", default="1080", help="UI generation resolution label.")
    args = parser.parse_args()

    data = json.loads(PROMPTS_FILE.read_text())
    prompts = data["prompts"]
    style_ids = data["priority_style_ids"]
    timestamp = int(time.time())
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    plan_path = RESULTS_DIR / f"style_benchmark_plan_{timestamp}.jsonl"

    count = 0
    with plan_path.open("w") as handle:
        for style_id in style_ids:
            for prompt in prompts:
                record = {
                    "project": args.project,
                    "style_id": style_id,
                    "prompt_id": prompt["id"],
                    "prompt": prompt["prompt"],
                    "resolution": args.resolution,
                    "seed": None,
                    "status": "planned",
                    "scores": {
                        "quality": None,
                        "style_fidelity": None,
                        "anatomy": None,
                        "composition": None,
                        "color": None,
                    },
                    "known_errors": [],
                    "output_path": None,
                }
                handle.write(json.dumps(record, ensure_ascii=False) + "\n")
                print(f"planned style={style_id} prompt={prompt['id']}")
                count += 1
                if args.limit and count >= args.limit:
                    print(f"Wrote partial benchmark plan: {plan_path}")
                    return

    print(f"Wrote benchmark plan: {plan_path}")


if __name__ == "__main__":
    main()
