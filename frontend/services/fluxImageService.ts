import { backendFetch } from '../lib/backend'
import type { FluxImageGenerateRequest, FluxImageResult } from '../types/image'

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

export class FluxImageService {
  static generate(request: FluxImageGenerateRequest): Promise<FluxImageResult> {
    return postJson<FluxImageResult>('/api/modal-image/generate', request)
  }
}
