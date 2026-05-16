import { getImageStylePreset, getSafeStyleAlias, type ImageStylePreset } from '../constants/imageStyles'
import { buildStylePromptLayer, getStyleProfile } from '../config/styleProfiles'

const MANAGED_STYLE_BLOCK_PATTERN = /\n?\n?\[STYLE: [^\]]+\][^\n]*/g

export type ResolvedImageStyle = ImageStylePreset & {
  custom_style_text?: string | null
}

export function stripManagedStyleBlock(prompt: string): string {
  return prompt.replace(MANAGED_STYLE_BLOCK_PATTERN, '').trim()
}

export function buildStyleBlock(style: ResolvedImageStyle): string {
  const profile = getStyleProfile(style.style_id)
  const modifier = profile ? buildStylePromptLayer(profile, 'premium') : style.style_prompt_modifier.trim()
  if (!modifier) return ''
  return `[STYLE: ${profile?.safe_label ?? style.style_label}] ${modifier}`
}

export function getResolvedStyleNegativePrompt(style: ResolvedImageStyle | null): string {
  if (!style) return ''
  const profile = getStyleProfile(style.style_id)
  return profile?.negative_prompt ?? style.style_negative_modifier ?? ''
}

export function applyStyleBlock(prompt: string, style: ResolvedImageStyle | null): string {
  const cleanPrompt = stripManagedStyleBlock(prompt)
  const block = style ? buildStyleBlock(style) : ''
  return [cleanPrompt, block].filter(Boolean).join('\n\n')
}

export function mergeNegativePrompts(...prompts: Array<string | null | undefined>): string {
  const parts: string[] = []
  const seen = new Set<string>()

  for (const prompt of prompts) {
    for (const item of (prompt ?? '').split(',')) {
      const value = item.trim()
      const key = value.toLowerCase()
      if (value && !seen.has(key)) {
        parts.push(value)
        seen.add(key)
      }
    }
  }

  return parts.join(', ')
}

export function removeNegativePromptStyleConflicts(
  negativePrompt: string,
  style: ResolvedImageStyle | null,
): string {
  if (!style) return negativePrompt
  const blockedTerms = new Set<string>([
    style.style_id.replace(/_/g, ' ').toLowerCase(),
    style.style_label.toLowerCase(),
  ])
  if (style.style_category === 'anime_manga') {
    blockedTerms.add('anime')
    blockedTerms.add('manga')
  }
  if (style.style_category === 'animation_cartoon') {
    blockedTerms.add('cartoon')
    blockedTerms.add('cartoonish')
    blockedTerms.add('animation')
  }
  if (style.style_category === 'illustration_drawing') {
    blockedTerms.add('illustration')
    blockedTerms.add('drawing')
    blockedTerms.add('sketch')
  }

  return negativePrompt
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item && !blockedTerms.has(item.toLowerCase()))
    .join(', ')
}

export function resolveImageStyle(styleId: string | null | undefined, customText: string): ResolvedImageStyle | null {
  if (!styleId) return null

  if (styleId === 'custom') {
    const safeAlias = getSafeStyleAlias(customText)
    if (safeAlias) {
      return {
        ...safeAlias,
        style_id: 'custom',
        style_label: 'Custom Style',
        style_category: 'custom',
        custom_style_text: customText,
      }
    }

    const modifier = customText.trim()
    if (!modifier) return null
    return {
      style_id: 'custom',
      style_label: 'Custom Style',
      style_category: 'custom',
      style_prompt_modifier: modifier,
      style_negative_modifier: '',
      preview_image: './style-previews/custom.webp',
      custom_style_text: customText,
    }
  }

  return getImageStylePreset(styleId)
}

export function promptWasEditedAgainstLlm(visiblePrompt: string, llmPrompt: string | null): boolean {
  if (!llmPrompt) return false
  return stripManagedStyleBlock(visiblePrompt) !== llmPrompt.trim()
}
