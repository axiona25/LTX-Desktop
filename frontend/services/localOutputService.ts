import type { FluxImageResult, LocalImageMetadata } from '../types/image'

export class LocalOutputService {
  static imageDirectoryLabel = 'Output/image'
  static videoDirectoryLabel = 'Output/video'

  static buildImageMetadata(result: FluxImageResult, request: {
    prompt: string
    negative_prompt: string
    steps: number
    guidance_scale: number
    quality_mode: string
  }): LocalImageMetadata {
    return {
      type: 'image',
      provider: result.provider,
      model: result.model,
      prompt: request.prompt,
      negative_prompt: request.negative_prompt,
      seed: result.seed,
      width: result.width,
      height: result.height,
      steps: request.steps,
      guidance_scale: request.guidance_scale,
      quality_mode: request.quality_mode,
      elapsed_ms: result.elapsed_ms,
      created_at: new Date().toISOString(),
      local_path: result.local_path,
    }
  }

  static assertSaved(result: FluxImageResult): void {
    if (!result.local_path || !result.metadata_path) {
      throw new Error('Image generation completed but local output paths were not returned.')
    }
  }
}
