# AXSTUDIO - Identity / Face Swap Review

## Regola fissa

La generazione immagini da prompt fatta con Grok è considerata valida e NON deve essere modificata.

Il lavoro da proseguire riguarda solo:

- Face Swap
- Identity ID
- consistent character
- master character applicato a immagine esistente
- mantenimento identità volto

## Stato Modal

App Modal attiva:

- axstudio-comfyui-clean

Volume:

- axstudio-comfyui-clean-models

Secret:

- axstudio-comfyui-secrets

Endpoint:

- https://axiona2025--axstudio-comfyui-clean-comfyui-server.modal.run

## Modelli presenti

### Checkpoints

- cyberrealisticXL_v100.safetensors
- Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors
- RealVisXL_V5.0.safetensors

Nota:
RealVisXL_V5.0.safetensors sembra avere dimensione sospetta e non va usato come modello principale senza verifica.

### LoRA

- ip-adapter-faceid-plusv2_sdxl_lora.safetensors
- EyesXL_v3.safetensors
- nsfw_unlock_xl.safetensors

Nota:
EyesXL non deve essere default perché può alterare occhi e volto.
nsfw_unlock_xl non deve essere usato automaticamente.

### Identity models

- /ip-adapter/ip-adapter-faceid-plusv2_sdxl.bin
- /instantid/ip-adapter.bin
- /controlnet/InstantID-ControlNet/diffusion_pytorch_model.safetensors
- /clip_vision/CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors
- /insightface/models/antelopev2/*.onnx

### Face refine / detection

- /ultralytics/bbox/face_yolov8m.pt
- /sams/sam_vit_b_01ec64.pth

## Custom nodes installati

- ComfyUI_IPAdapter_plus
- ComfyUI_InstantID
- ComfyUI-Impact-Pack
- ComfyUI-Impact-Subpack

Nodi disponibili:

- IPAdapterUnifiedLoaderFaceID
- IPAdapterInsightFaceLoader
- IPAdapterFaceID
- InstantIDModelLoader
- InstantIDFaceAnalysis
- ApplyInstantID
- ApplyInstantIDAdvanced
- ApplyInstantIDControlNet
- InstantIDAttentionPatch
- FaceDetailer
- FaceDetailerPipe
- ToDetailerPipeSDXL
- BboxDetectorSEGS
- UltralyticsDetectorProvider
- SAMLoader
- ImageCompositeMasked
- SEGSPaste
- CropByBBoxes
- VAEEncodeForInpaint
- InpaintModelConditioning

## Cartelle ordinate

### _identity_keep

Contiene workflow e test utili da cui ripartire:

- ipadapter_faceid_plusv2_sdxl_api.json
- instantid_test_minimal.json
- instantid_test_minimal_improved.json
- instantid_test_advanced.json
- workflow_ipadapter_instantid_v3.json
- workflow_ipadapter_baseline.json
- workflow_ipadapter_instantid_balanced.json
- faceid_master_correct.json
- faceid_master_v2.json
- faceid_t2i.json
- faceid_strong_t2i.json

### _identity_failed_tests

Contiene test falliti da NON usare come base produttiva:

- test_A_ipadapter_img2img.json
- test_B_ipadapter_stronger_low_denoise.json
- test_C_facedetailer_standalone.json
- test_D_facedetailer_ipadapter_identity.json
- test_E_facedetailer_ipadapter_strong_facecrop.json
- pipeline1_facedetailer_pipe.json
- pipeline1B_facedetailer_pipe_nosam.json
- workflow_facedetailer_v4.json
- workflow_img2img_identity.json
- img2img_faceid.json
- facedetailer_minimal.json

### _prompt_generation_ok

Contiene preset e workflow di generazione prompt considerati validi.
NON modificarli salvo richiesta esplicita.

## Test eseguiti e risultato

### Generazione nuova immagine / identity

IPAdapter FaceID Plus v2 e InstantID funzionano tecnicamente.

Output riusciti:
- faceid_plusv2_sdxl_1778504581_00001_.png
- faceid_master_correct_1778505363_00001_.png
- ipadapter_instantid_v3__00001_.png

### Modifica immagine esistente

Input di test:

- master_final.png
- boudoir_test_00001_.png

Risultati:

- img2img globale con IPAdapter: fallito
- img2img con IPAdapter più forte: fallito
- FaceDetailer standalone: non trasferisce identità
- FaceDetailer + IPAdapter: fallito
- FaceDetailerPipe con SAM: corrompe volto / colore
- FaceDetailerPipe senza SAM conservativo: corrompe volto / colore

Conclusione:

FaceDetailer non deve essere usato come blocco principale per sostituzione volto.
Img2img globale non deve essere usato per face replacement.

## Diagnosi

La pipeline sbagliata è:

target image
→ VAEEncode globale
→ IPAdapter / KSampler globale
→ SaveImage

Questa conserva parzialmente la scena ma non trasferisce correttamente l'identità.

La pipeline corretta da implementare deve essere:

target image
→ rilevamento volto target
→ crop / mask volto
→ applicazione identity sul crop
→ ricomposizione sul frame originale
→ salvataggio

## Obiettivo per Codex

Implementare nell'app desktop solo la parte Identity / Face Swap.

Non toccare la generazione da prompt.

L'app deve distinguere due modalità:

### Modalità 1 - Create New Image from Character

Già abbastanza valida.
Usa master character + prompt scena.
Può usare IPAdapter / InstantID / checkpoint.

### Modalità 2 - Apply Character to Existing Image

Da riprogettare.
Non usare img2img globale.
Non usare FaceDetailer come motore principale.
Serve crop volto + identity conditioning + composite.

## Requisiti UI

Nel desktop deve esserci distinzione chiara:

1. Select Master Character
2. Select Existing Image
3. Choose operation:
   - Create new scene from character
   - Apply character face to existing image
4. Run
5. Show result

## Requisiti backend

Il backend deve:

1. Verificare che master character sia in /input
2. Verificare che target image sia in /input
3. Se modalità nuova scena:
   - usare workflow identity text-to-image
4. Se modalità existing image:
   - usare workflow crop/mask/composite
5. Non usare workflow falliti presenti in _identity_failed_tests
6. Salvare sempre prompt_id
7. Leggere filename reale da /history/{prompt_id}
8. Non inventare mai filename output

## Regole tecniche

- seed deve essere >= 0
- filename_prefix non deve finire con underscore se si vuole evitare doppio underscore
- output va letto da history
- RealVisXL va verificato prima dell'uso
- EyesXL solo opzionale
- FaceDetailer solo opzionale/futuro, non default
- SAM solo se serve una maschera più precisa

## Prossimo step consigliato

Prima di modificare l'app desktop, Codex deve:

1. Analizzare la cartella comfyui-clean
2. Leggere _identity_keep
3. Leggere _identity_failed_tests
4. Non toccare _prompt_generation_ok
5. Proporre un workflow nuovo per:
   - crop volto target
   - identity conditioning su crop
   - composite sul frame originale
6. Implementare questo workflow come nuovo modulo separato:
   - identity_apply_existing_image
7. Preparare test CLI minimo prima di integrarlo nella UI.
