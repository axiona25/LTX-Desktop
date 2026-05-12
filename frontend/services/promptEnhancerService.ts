import { backendFetch } from '../lib/backend'
import type { EnhancedPrompt, PromptEnhanceRequest, PromptTranslateRequest, PromptTranslateResponse } from '../types/prompt'

async function postJson<TResponse>(url: string, body: unknown): Promise<TResponse> {
  const response = await backendFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) as unknown : {}
  if (!response.ok) {
    const message = typeof payload === 'object' && payload !== null && 'message' in payload
      ? String((payload as { message: unknown }).message)
      : text || response.statusText
    throw new Error(message)
  }
  return payload as TResponse
}

export class PromptEnhancerService {
  static enhance(request: PromptEnhanceRequest): Promise<EnhancedPrompt> {
    return postJson<EnhancedPrompt>('/api/modal-image/enhance', request)
  }

  static translate(request: PromptTranslateRequest): Promise<PromptTranslateResponse> {
    return postJson<PromptTranslateResponse>('/api/modal-image/translate', request)
  }
}
