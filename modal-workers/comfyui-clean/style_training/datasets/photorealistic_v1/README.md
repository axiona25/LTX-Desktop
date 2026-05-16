# photorealistic Style LoRA Dataset

Trigger token: `ax_photo_real_v1`
Minimum images: 500
Recommended images: 1200

Place curated source images in a separate folder and run:

```bash
/usr/bin/python3 scripts/prepare_style_lora_dataset.py --style photorealistic --source-dir /path/to/curated/images --force
```

Captioning rules:

- Always describe subject, age group or role when useful, environment, clothing, pose, light, camera feel and realism cues.
- Always include the trigger token ax_photo_real_v1.
- Describe hands and face readability when visible.
- Use realistic photographic language, not artistic labels like cartoon or illustration.
- Do not mention brand names, camera brands or copyrighted styles unless they are part of an allowed internal taxonomy.
- Separate content from style: subject first, then environment, then light, then realism cues.
- Keep captions specific but concise.
- Do not overuse camera jargon unless clearly visible or needed.
