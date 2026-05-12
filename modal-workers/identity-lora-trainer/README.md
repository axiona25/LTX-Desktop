# AXSTUDIO Identity LoRA Trainer

Modal worker for training a first lightweight SDXL identity LoRA from a conservative project master dataset.

## Input

Dataset expected in the shared Modal volume:

```text
/lora_training/<PROJECT_ID>/identity_dataset_v1/images/*.png
/lora_training/<PROJECT_ID>/identity_dataset_v1/images/*.txt
```

The dataset must be prepared from the project master only. Do not use generated alternative identities.

## Upload Dataset

From `modal-workers/comfyui-clean`:

```bash
modal volume put axstudio-comfyui-clean-models \
  Progetti/PROGETTO_TEST/LoRA/identity_dataset_v1 \
  /lora_training/PROGETTO_TEST/identity_dataset_v1 \
  --force
```

## Train

From this directory:

```bash
modal run app.py \
  --project-id <PROJECT_ID> \
  --dataset-name identity_dataset_v1 \
  --output-name AXSTUDIO_identity_lora_v1 \
  --max-train-steps 600 \
  --network-dim 16 \
  --network-alpha 8 \
  --learning-rate 0.00005
```

## Incremental Train

Use incremental training when a LoRA already exists and only needs a small refinement.
This loads the previous LoRA with `--network_weights` and trains only the extra
steps requested by `--max-train-steps`.

Example: continue the 600-step LoRA with 100 additional steps:

```bash
modal run app.py \
  --project-id <PROJECT_ID> \
  --dataset-name identity_dataset_v1 \
  --base-lora-name AXSTUDIO_identity_lora_v1.safetensors \
  --previous-train-steps 600 \
  --max-train-steps 100 \
  --output-name AXSTUDIO_identity_lora_v1_plus100 \
  --network-dim 16 \
  --network-alpha 8 \
  --learning-rate 0.00002
```

For very small refinements, start with `--max-train-steps 50` or `100`.
Do not run another 600 steps unless the dataset changes substantially.

## Output

The trained LoRA is saved to:

```text
/loras/AXSTUDIO_identity_lora_v1.safetensors
```

It can then be tested in the ComfyUI identity inpaint workflow as an additional detail/identity LoRA.

Incremental runs also write metadata next to the LoRA:

```text
/loras/<OUTPUT_NAME>.metadata.json
```
