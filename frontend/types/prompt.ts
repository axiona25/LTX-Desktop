export interface PromptEnhanceRequest {
  idea: string
  style?: string | null
  aspect_ratio?: string | null
  language?: string | null
}

export interface PromptTranslateRequest {
  text: string
  target_language: 'en' | 'it'
  source_language?: string | null
  kind?: 'prompt' | 'negative_prompt' | 'style'
}

export interface PromptTranslateResponse {
  translated_text: string
  source_language?: string | null
  target_language: 'en' | 'it'
  kind: 'prompt' | 'negative_prompt' | 'style'
}

export interface EnhancedPrompt {
  final_prompt: string
  negative_prompt: string
  display_final_prompt?: string
  display_negative_prompt?: string
  style_tags: string[]
  recommended_width: number
  recommended_height: number
  suggested_steps: number
  guidance_scale: number
  composition_intent?: 'portrait' | 'full_body' | 'landscape_scene' | 'product' | 'architecture' | 'generic'
  subject_type?: 'person' | 'environment' | 'object' | 'product' | 'architecture' | 'mixed' | 'generic'
}
