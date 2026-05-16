import { useState, useCallback, useEffect } from 'react'
import type { GenerationSettings } from '../components/SettingsPanel'
import { ApiClient, type ApiRequestBodyOf } from '../lib/api-client'
import { createLocalGenerationError, type GenerationError } from '../lib/generation-errors'
import { logger } from '../lib/logger'
import { FluxImageService } from '../services/fluxImageService'
import type { FluxQualityMode, PromptSource } from '../types/image'
import type { ResolvedImageStyle } from '../lib/image-style-prompt'
import { buildStyledPrompt } from '../utils/buildStyledPrompt'

interface GenerationState {
  isGenerating: boolean
  progress: number
  statusMessage: string
  generationStartedAt: number | null
  videoPath: string | null
  imagePath: string | null
  imagePaths: string[]
  error: GenerationError | null
}

const DEFAULT_GENERATION_STATE: GenerationState = {
  isGenerating: false,
  progress: 0,
  statusMessage: '',
  generationStartedAt: null,
  videoPath: null,
  imagePath: null,
  imagePaths: [],
  error: null,
}

let sharedGenerationState: GenerationState = DEFAULT_GENERATION_STATE
let sharedAbortController: AbortController | null = null
let sharedImageGenerationInFlight = false
let sharedGenerationToken = 0

const generationStateListeners = new Set<(state: GenerationState) => void>()

function setSharedGenerationState(
  nextState: GenerationState | ((previousState: GenerationState) => GenerationState),
): void {
  sharedGenerationState = typeof nextState === 'function'
    ? nextState(sharedGenerationState)
    : nextState
  generationStateListeners.forEach((listener) => listener(sharedGenerationState))
}

type GenerateVideoRequest = ApiRequestBodyOf<'generateVideo'>

interface UseGenerationReturn extends GenerationState {
  generate: (prompt: string, imagePath: string | null, settings: GenerationSettings, audioPath?: string | null) => Promise<void>
  generateImage: (prompt: string, settings: GenerationSettings, metadata?: ImageGenerationPromptMetadata) => Promise<void>
  cancel: () => void
  reset: () => void
}

interface ImageGenerationPromptMetadata {
  originalIdea?: string | null
  llmEnhancedPrompt?: string | null
  promptSource?: PromptSource
  promptWasUserEdited?: boolean
}

function getFluxQualityMode(settings: GenerationSettings): FluxQualityMode {
  if (settings.imageResolution === '4k' || settings.imageResolution === '2048p' || settings.imageResolution === '1440p') return 'balanced'
  return 'preview'
}

function resolveImageAspectRatio(_prompt: string, settings: GenerationSettings): string {
  return settings.imageAspectRatio || settings.aspectRatio || '16:9'
}

function dimensionsForImageSettings(aspectRatio: string, imageResolution?: string): { width: number; height: number } {
  const longEdgeByResolution: Record<string, number> = {
    '1080p': 1024,
    '1440p': 1024,
    '2048p': 1216,
    '4k': 1216,
  }
  const longEdge = longEdgeByResolution[imageResolution ?? ''] ?? 1344
  switch (aspectRatio) {
    case '1:1': return { width: Math.min(longEdge, 1792), height: Math.min(longEdge, 1792) }
    case '9:16': return { width: Math.round(longEdge * 9 / 16), height: longEdge }
    case '4:3': return { width: longEdge, height: Math.round(longEdge * 3 / 4) }
    case '3:4': return { width: Math.round(longEdge * 3 / 4), height: longEdge }
    case '16:9':
    default: return { width: longEdge, height: Math.round(longEdge * 9 / 16) }
  }
}

function stepsForQuality(qualityMode: FluxQualityMode): number {
  if (qualityMode === 'premium') return 8
  if (qualityMode === 'balanced') return 6
  return 4
}

// Map phase to user-friendly message
function getPhaseMessage(phase: string): string {
  switch (phase) {
    case 'validating_request':
      return 'Validating request...'
    case 'uploading_image':
      return 'Uploading image...'
    case 'uploading_audio':
      return 'Uploading audio...'
    case 'loading_model':
      return 'Loading model...'
    case 'encoding_text':
      return 'Encoding prompt...'
    case 'inference':
      return 'Generating...'
    case 'downloading_output':
      return 'Downloading output...'
    case 'decoding':
      return 'Decoding video...'
    case 'complete':
      return 'Complete!'
    default:
      return 'Generating...'
  }
}

export function useGeneration(): UseGenerationReturn {
  const [state, setState] = useState<GenerationState>(sharedGenerationState)

  useEffect(() => {
    generationStateListeners.add(setState)
    setState(sharedGenerationState)
    return () => {
      generationStateListeners.delete(setState)
    }
  }, [])

  const generate = useCallback(async (
    prompt: string,
    imagePath: string | null,
    settings: GenerationSettings,
    audioPath?: string | null,
  ) => {
    const statusMsg = settings.model === 'pro'
      ? 'Loading Pro model & generating...'
      : 'Generating video...'

    setSharedGenerationState({
      isGenerating: true,
      progress: 0,
      statusMessage: statusMsg,
      generationStartedAt: Date.now(),
      videoPath: null,
      imagePath: null,
      imagePaths: [],
      error: null,
    })

    sharedAbortController = new AbortController()
    let progressInterval: ReturnType<typeof setInterval> | null = null
    let shouldApplyPollingUpdates = true

    try {
      // Prepare JSON body
      const body: Record<string, unknown> = {
        prompt,
        model: settings.model,
        duration: settings.duration,
        resolution: settings.videoResolution,
        fps: settings.fps,
        audio: settings.audio,
        cameraMotion: settings.cameraMotion,
        negativePrompt: (settings as { negativePrompt?: string }).negativePrompt ?? '',
        aspectRatio: settings.aspectRatio || '16:9',
      }
      if (imagePath) {
        body.imagePath = imagePath
      }
      if (audioPath) {
        body.audioPath = audioPath
      }

      // Poll for real progress from backend with time-based interpolation
      let lastPhase = ''
      let inferenceStartTime = 0
      // Estimated inference time in seconds based on model
      const estimatedInferenceTime = settings.model === 'pro' ? 120 : 45
      
      const pollProgress = async () => {
        if (!shouldApplyPollingUpdates) return
        const result = await ApiClient.getGenerationProgress()
        if (!result.ok || !shouldApplyPollingUpdates) return

        const data = result.data
        let displayProgress = data.progress
        let statusMessage = getPhaseMessage(data.phase)

        // Time-based interpolation during inference phase
        if (data.phase === 'inference') {
          if (lastPhase !== 'inference') {
            inferenceStartTime = Date.now()
          }
          const elapsed = (Date.now() - inferenceStartTime) / 1000
          // Interpolate from 15% to 95% based on estimated time
          const inferenceProgress = Math.min(elapsed / estimatedInferenceTime, 0.95)
          displayProgress = 15 + Math.floor(inferenceProgress * 80)
        }

        // Keep API/local completion as a terminal response state, not polling state.
        // Polling complete means backend state is finalized, but request can still be in-flight.
        if (data.phase === 'complete' || data.status === 'complete') {
          displayProgress = 95
          statusMessage = 'Finalizing...'
        }

        lastPhase = data.phase

        setSharedGenerationState(prev => ({
          ...prev,
          progress: displayProgress,
          statusMessage,
        }))
      }
      
      progressInterval = setInterval(pollProgress, 500)

      // Start generation (HTTP POST - synchronous, returns when done)
      const result = await ApiClient.generateVideo(body as unknown as GenerateVideoRequest, {
        signal: sharedAbortController.signal,
      })
      shouldApplyPollingUpdates = false
      if (!result.ok) {
        setSharedGenerationState(prev => ({
          ...prev,
          isGenerating: false,
          generationStartedAt: null,
          error: result,
        }))
        return
      }

      const payload = result.data
      if (payload.status === 'complete') {
        setSharedGenerationState({
          isGenerating: false,
          progress: 100,
          statusMessage: 'Complete!',
          generationStartedAt: null,
          videoPath: payload.video_path,
          imagePath: null,
          imagePaths: [],
          error: null,
        })
      } else if (payload.status === 'cancelled') {
        setSharedGenerationState(prev => ({
          ...prev,
          isGenerating: false,
          statusMessage: 'Cancelled',
          generationStartedAt: null,
        }))
      } else {
        throw new Error('Unexpected response from /api/generate')
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setSharedGenerationState(prev => ({
          ...prev,
          isGenerating: false,
          statusMessage: 'Cancelled',
          generationStartedAt: null,
        }))
      } else {
        setSharedGenerationState(prev => ({
          ...prev,
          isGenerating: false,
          generationStartedAt: null,
          error: createLocalGenerationError(error instanceof Error ? error.message : 'Unknown error'),
        }))
      }
    } finally {
      shouldApplyPollingUpdates = false
      if (progressInterval) {
        clearInterval(progressInterval)
      }
    }
  }, [])

  const cancel = useCallback(async () => {
    sharedGenerationToken += 1
    sharedImageGenerationInFlight = false

    // Abort the fetch request
    sharedAbortController?.abort()
    
    // Also tell the backend to cancel
    void ApiClient.cancelGeneration()
    
    setSharedGenerationState(prev => ({
      ...prev,
      isGenerating: false,
      statusMessage: 'Cancelled',
      generationStartedAt: null,
    }))
  }, [])

  const generateImage = useCallback(async (
    prompt: string,
    settings: GenerationSettings,
    metadata: ImageGenerationPromptMetadata = {},
  ) => {
    if (sharedImageGenerationInFlight) return
    sharedImageGenerationInFlight = true
    const generationToken = sharedGenerationToken + 1
    sharedGenerationToken = generationToken
    const numImages = 1
    const qualityMode = getFluxQualityMode(settings)
    
    setSharedGenerationState({
      isGenerating: true,
      progress: 0,
      statusMessage: 'Creazione immagine AXSTUDIO...',
      generationStartedAt: Date.now(),
      videoPath: null,
      imagePath: null,
      imagePaths: [],
      error: null,
    })

    sharedAbortController = new AbortController()

    try {
      const imageAspectRatio = resolveImageAspectRatio(prompt, settings)
      const dimensions = dimensionsForImageSettings(imageAspectRatio, settings.imageResolution)
      const steps = Math.max(settings.imageSteps || 0, stepsForQuality(qualityMode))
      const selectedStyle: ResolvedImageStyle | null = settings.imageStylePromptModifier ? {
        style_id: settings.imageStyleId || 'custom',
        style_label: settings.imageStyleLabel || 'Stile grafico',
        style_category: (settings.imageStyleCategory || 'custom') as ResolvedImageStyle['style_category'],
        style_prompt_modifier: settings.imageStylePromptModifier,
        style_negative_modifier: settings.imageStyleNegativeModifier || '',
        preview_image: '',
      } : null
      const engineBasePrompt = metadata.promptSource === 'llm_enhanced' && metadata.llmEnhancedPrompt?.trim()
        ? metadata.llmEnhancedPrompt.trim()
        : prompt
      const styledPrompt = buildStyledPrompt({
        userPrompt: engineBasePrompt,
        styleId: settings.imageStyleId || selectedStyle?.style_id || null,
        aspectRatio: imageAspectRatio,
        fallbackStyle: selectedStyle,
        characterName: settings.imageCharacterName ?? null,
        characterIdentityPrompt: settings.imageCharacterPrompt ?? null,
        characterNegativePrompt: settings.imageCharacterNegativePrompt ?? null,
      })
      const finalPrompt = styledPrompt.finalPrompt
      const styleNegativePrompt = styledPrompt.negativePrompt
      const hasCharacterLock = Boolean(
        settings.imageCharacterId
        || settings.imageCharacterName
        || settings.imageCharacterPrompt,
      )
      const imagePaths: string[] = []
      logger.info(
        `[ImageGeneration] Starting image generation style=${settings.imageStyleId || 'none'} `
        + `label=${settings.imageStyleLabel ?? 'none'} aspect=${imageAspectRatio} `
        + `size=${dimensions.width}x${dimensions.height} steps=${steps} promptChars=${finalPrompt.length}`,
      )
      for (let index = 0; index < numImages; index += 1) {
        setSharedGenerationState(prev => ({
          ...prev,
          progress: 0,
          statusMessage: numImages > 1
            ? `Creazione immagine AXSTUDIO ${index + 1}/${numImages}...`
            : 'Creazione immagine AXSTUDIO...',
        }))

        const result = await FluxImageService.generate({
          prompt: finalPrompt,
          negative_prompt: styleNegativePrompt,
          width: dimensions.width,
          height: dimensions.height,
          steps,
          guidance_scale: 3.5,
          seed: null,
          quality_mode: qualityMode,
          original_idea: metadata.originalIdea ?? prompt,
          llm_enhanced_prompt: metadata.llmEnhancedPrompt ?? null,
          final_prompt: finalPrompt,
          prompt_was_user_edited: Boolean(metadata.promptWasUserEdited),
          prompt_source: metadata.promptSource ?? 'manual',
          selected_style_id: settings.imageStyleId || null,
          selected_style_label: settings.imageStyleLabel ?? null,
          selected_style_category: settings.imageStyleCategory ?? null,
          image_character_id: settings.imageCharacterId ?? null,
          image_character_name: settings.imageCharacterName ?? null,
          image_character_image_path: settings.imageCharacterImagePath ?? null,
          image_character_prompt: settings.imageCharacterPrompt ?? null,
          image_character_negative_prompt: settings.imageCharacterNegativePrompt ?? null,
          use_character_lora: hasCharacterLock,
          custom_style_text: settings.imageCustomStyleText ?? null,
          style_prompt_modifier: settings.imageStylePromptModifier ?? null,
          style_negative_modifier: styleNegativePrompt || null,
          style_was_applied: Boolean(settings.imageStylePromptModifier),
          negative_prompt_final: styleNegativePrompt || null,
          visible_prompt_before_generate: prompt,
          payload_prompt_sent_to_backend: finalPrompt,
          frontend_negative_prompt: styleNegativePrompt || null,
        }, {
          signal: sharedAbortController.signal,
        })
        if (generationToken !== sharedGenerationToken) return
        imagePaths.push(result.local_path)
        logger.info(`[ImageGeneration] Image generation result saved: ${result.local_path}`)
      }

      if (generationToken !== sharedGenerationToken) return
      if (imagePaths.length === 0) {
        throw new Error('Modal FLUX generation completed without output images')
      }

      setSharedGenerationState({
        isGenerating: false,
        progress: 100,
        statusMessage: 'Complete!',
        generationStartedAt: null,
        videoPath: null,
        imagePath: imagePaths[0],
        imagePaths,
        error: null,
      })
      logger.info(`[ImageGeneration] Completed image generation images=${imagePaths.length}`)

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn('[ImageGeneration] Image generation cancelled')
        if (generationToken !== sharedGenerationToken) return
        setSharedGenerationState(prev => ({
          ...prev,
          isGenerating: false,
          statusMessage: 'Cancelled',
          generationStartedAt: null,
        }))
      } else {
        logger.error(`[ImageGeneration] Image generation failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`)
        if (generationToken !== sharedGenerationToken) return
        setSharedGenerationState(prev => ({
          ...prev,
          isGenerating: false,
          generationStartedAt: null,
          error: createLocalGenerationError(error instanceof Error ? error.message : 'Unknown error'),
        }))
      }
    } finally {
      if (generationToken === sharedGenerationToken) {
        sharedImageGenerationInFlight = false
      }
    }
  }, [])

  const reset = useCallback(() => {
    setSharedGenerationState({
      isGenerating: false,
      progress: 0,
      statusMessage: '',
      generationStartedAt: null,
      videoPath: null,
      imagePath: null,
      imagePaths: [],
      error: null,
    })
  }, [])

  return {
    ...state,
    generate,
    generateImage,
    cancel,
    reset,
  }
}
