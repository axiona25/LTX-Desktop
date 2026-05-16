# AXSTUDIO Style Profile Integration

AXSTUDIO keeps style control inside the app. External tools can help design a style, but AXSTUDIO remains the source of truth for:

- UI style names and categories
- prompt prefix/suffix
- negative prompt
- LoRA trigger token
- LoRA strength and backend routing after validation
- legacy style aliases

## Current Structure

- `frontend/constants/imageStyles.ts`
  - Defines the commercial UI taxonomy shown in the style picker.
  - Contains only the approved canonical UI styles.
  - Maps old style IDs to canonical IDs so older projects do not break.

- `src/config/styleProfiles.json`
  - Stores full validated style profiles.
  - A style can be absent here and still appear in the UI. In that case AXSTUDIO uses the lightweight UI preset prompt modifier.
  - When a full profile exists, AXSTUDIO uses the richer prompt layers from this JSON.

- `frontend/config/styleProfiles.ts`
  - Loads JSON profiles and normalizes them for the frontend.
  - Adds style aliases such as `fairytale_3d -> family_friendly_fairytale_3d`.

- `frontend/utils/buildStyledPrompt.ts`
  - Builds the final prompt from separated layers:
    - user prompt
    - style prompt prefix
    - style prompt suffix
    - negative prompt
    - trigger token
    - final enhanced prompt

- `backend/handlers/modal_image_handler.py`
  - Applies backend-side style tuning and LoRA routing only for validated styles.

## Add A New Style

1. Add the canonical UI style to `frontend/constants/imageStyles.ts`.
2. Add aliases from old or duplicate IDs to the canonical style.
3. Ask ChatGPT to create one validation image first.
4. Only after visual approval, add the full profile to `src/config/styleProfiles.json`.
5. Run `pnpm typecheck:ts`.
6. Generate benchmark images in AXSTUDIO.
7. Train LoRA only after the style JSON and visual target are approved.
8. Connect the LoRA in the backend only after validation.

## Important Rules

- Do not use proprietary brand names as operational style IDs or UI labels.
- Do not connect an unvalidated LoRA to a production style.
- Do not remove legacy aliases unless all existing projects have been migrated.
- Keep the UI taxonomy compact. Additional experimental styles should stay out of the main picker until validated.
