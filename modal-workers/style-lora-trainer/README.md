# AXSTUDIO Style LoRA Trainer

Modal worker for training AXSTUDIO style LoRAs.

Datasets are expected in the shared Modal volume:

```text
/style_training/<style_id>/<dataset_name>/images/*.png
/style_training/<style_id>/<dataset_name>/images/*.txt
```

## Prepare Dataset Locally

From repo root:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py \
  --style pixel_art \
  --source-dir /path/to/curated/pixel_art_images \
  --force
```

## Upload Dataset

```bash
modal volume put axstudio-comfyui-clean-models \
  modal-workers/comfyui-clean/style_training/datasets/pixel_art_v1 \
  /style_training/pixel_art/pixel_art_v1 \
  --force
```

## Train

```bash
cd modal-workers/style-lora-trainer
modal run app.py \
  --style-id pixel_art \
  --dataset-name pixel_art_v1 \
  --output-name AXSTYLE_pixel_art_v1 \
  --checkpoint-name cyberrealisticXL_v100.safetensors \
  --max-train-steps 3000 \
  --network-dim 16 \
  --network-alpha 16 \
  --learning-rate 1e-4 \
  --save-every-n-steps 500
```

## Output

The LoRA is saved in the shared Modal volume:

```text
/loras/style/AXSTYLE_pixel_art_v1.safetensors
```

Do not connect it to production until visual validation passes. Use:

```bash
/usr/bin/python3 scripts/promote_style_lora.py \
  --style pixel_art \
  --lora-name style/AXSTYLE_pixel_art_v1.safetensors \
  --strength 0.84 \
  --status validated
```

The app only loads promoted style LoRAs when `AXSTUDIO_ENABLE_STYLE_LORAS=1`.
