export type FluxQualityMode = 'preview' | 'balanced' | 'premium'
export type PromptSource = 'llm_enhanced' | 'user_edited' | 'manual'

export interface FluxImageGenerateRequest {
  prompt: string
  negative_prompt: string
  width: number
  height: number
  steps: number
  guidance_scale: number
  seed: number | null
  quality_mode: FluxQualityMode
  original_idea?: string | null
  llm_enhanced_prompt?: string | null
  final_prompt?: string | null
  prompt_was_user_edited?: boolean
  prompt_source?: PromptSource
  selected_style_id?: string | null
  selected_style_label?: string | null
  selected_style_category?: string | null
  image_character_id?: string | null
  image_character_name?: string | null
  image_character_image_path?: string | null
  image_character_prompt?: string | null
  image_character_negative_prompt?: string | null
  use_character_lora?: boolean
  custom_style_text?: string | null
  style_prompt_modifier?: string | null
  style_negative_modifier?: string | null
  style_was_applied?: boolean
  negative_prompt_final?: string | null
  visible_prompt_before_generate?: string | null
  payload_prompt_sent_to_backend?: string | null
  frontend_negative_prompt?: string | null
  idea_is_primary_guide?: boolean
  composition_intent?: string | null
  subject_type?: string | null
  required_traits?: Record<string, unknown>
  requested_aspect_ratio?: string | null
  effective_aspect_ratio?: string | null
  aspect_ratio_overridden?: boolean
  aspect_ratio_override_reason?: string | null
  removed_conflicting_prompt_terms?: string[]
  descriptive_trait_lock_applied?: boolean
  trait_lock_types_applied?: string[]
  no_people_lock_applied?: boolean
  prompt_visibility_violation?: boolean
  backend_semantic_rewrite_after_generate?: boolean
}

export interface FluxImageResult {
  provider: 'modal_flux'
  model: string
  image_base64: string
  seed: number
  width: number
  height: number
  requested_steps: number
  actual_steps: number
  guidance_scale: number
  quality_mode: FluxQualityMode
  effective_width: number
  effective_height: number
  negative_prompt_applied: boolean
  elapsed_ms: number
  local_path: string
  metadata_path: string
}

export interface LocalImageMetadata {
  type: 'image'
  provider: 'modal_flux'
  model: string
  prompt: string
  original_idea?: string | null
  llm_enhanced_prompt?: string | null
  final_prompt?: string | null
  prompt_was_user_edited?: boolean
  prompt_source?: PromptSource
  selected_style_id?: string | null
  selected_style_label?: string | null
  selected_style_category?: string | null
  image_character_id?: string | null
  image_character_name?: string | null
  image_character_image_path?: string | null
  image_character_prompt?: string | null
  image_character_negative_prompt?: string | null
  use_character_lora?: boolean
  custom_style_text?: string | null
  style_prompt_modifier?: string | null
  style_negative_modifier?: string | null
  style_was_applied?: boolean
  negative_prompt: string
  negative_prompt_final?: string | null
  generated_negative_prompt?: string
  negative_prompt_applied?: boolean
  visible_prompt_before_generate?: string | null
  payload_prompt_sent_to_backend?: string | null
  backend_prompt_sent_to_modal?: string | null
  worker_prompt_received?: string | null
  worker_prompt_sent_to_flux?: string | null
  frontend_negative_prompt?: string | null
  backend_negative_prompt_final?: string | null
  worker_negative_prompt_received?: string | null
  worker_negative_prompt_sent_to_flux?: string | null
  prompt_negative_conflicts?: Array<{
    term: string
    in_positive: boolean
    in_negative: boolean
  }>
  prompt_visibility_violation?: boolean
  invisible_backend_modifiers_applied?: boolean
  visible_trait_lock_applied?: boolean
  visible_composition_lock_applied?: boolean
  final_prompt_user_editable_before_generate?: boolean
  trait_lock_removed?: boolean
  composition_lock_removed?: boolean
  backend_semantic_rewrite_disabled?: boolean
  descriptive_trait_lock_applied?: boolean
  content_rewrite_removed?: boolean
  coverage_lock_removed?: boolean
  conservative_rewrite_removed?: boolean
  trait_lock_types_applied?: string[]
  forbidden_rewrite_detected?: boolean
  seed: number
  width: number
  height: number
  requested_steps?: number
  actual_steps?: number
  steps: number
  guidance_scale: number
  quality_mode: string
  effective_width?: number
  effective_height?: number
  composition_intent?: string
  subject_type?: string
  idea_is_primary_guide?: boolean
  required_traits?: Record<string, unknown>
  requested_aspect_ratio?: string | null
  effective_aspect_ratio?: string | null
  aspect_ratio_overridden?: boolean
  aspect_ratio_override_reason?: string | null
  removed_conflicting_prompt_terms?: string[]
  no_people_lock_applied?: boolean
  backend_semantic_rewrite_after_generate?: boolean
  upscale_pending?: boolean
  elapsed_ms: number
  created_at: string
  local_path: string
}
