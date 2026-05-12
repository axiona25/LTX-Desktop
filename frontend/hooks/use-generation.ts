import { useState, useCallback, useRef } from 'react'
import type { GenerationSettings } from '../components/SettingsPanel'
import { ApiClient, type ApiRequestBodyOf } from '../lib/api-client'
import { createLocalGenerationError, type GenerationError } from '../lib/generation-errors'
import { FluxImageService } from '../services/fluxImageService'
import type { FluxQualityMode } from '../types/image'

interface GenerationState {
  isGenerating: boolean
  progress: number
  statusMessage: string
  videoPath: string | null
  imagePath: string | null
  imagePaths: string[]
  error: GenerationError | null
}

type GenerateVideoRequest = ApiRequestBodyOf<'generateVideo'>

interface UseGenerationReturn extends GenerationState {
  generate: (prompt: string, imagePath: string | null, settings: GenerationSettings, audioPath?: string | null) => Promise<void>
  generateImage: (prompt: string, settings: GenerationSettings) => Promise<void>
  cancel: () => void
  reset: () => void
}

function getFluxQualityMode(settings: GenerationSettings): FluxQualityMode {
  if (settings.imageSteps >= 36) return 'premium'
  if (settings.imageSteps >= 24) return 'balanced'
  return 'preview'
}

function resolveImageAspectRatio(_prompt: string, settings: GenerationSettings): string {
  return settings.imageAspectRatio || settings.aspectRatio || '16:9'
}

function dimensionsForAspectRatio(aspectRatio: string): { width: number; height: number } {
  switch (aspectRatio) {
    case '1:1': return { width: 1024, height: 1024 }
    case '9:16': return { width: 768, height: 1344 }
    case '4:3': return { width: 1152, height: 896 }
    case '3:4': return { width: 896, height: 1152 }
    case '16:9':
    default: return { width: 1344, height: 768 }
  }
}

function stepsForQuality(qualityMode: FluxQualityMode): number {
  if (qualityMode === 'premium') return 36
  if (qualityMode === 'balanced') return 24
  return 12
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
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    progress: 0,
    statusMessage: '',
    videoPath: null,
    imagePath: null,
    imagePaths: [],
    error: null,
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const imageGenerationInFlightRef = useRef(false)

  const generate = useCallback(async (
    prompt: string,
    imagePath: string | null,
    settings: GenerationSettings,
    audioPath?: string | null,
  ) => {
    const statusMsg = settings.model === 'pro'
      ? 'Loading Pro model & generating...'
      : 'Generating video...'

    setState({
      isGenerating: true,
      progress: 0,
      statusMessage: statusMsg,
      videoPath: null,
      imagePath: null,
      imagePaths: [],
      error: null,
    })

    abortControllerRef.current = new AbortController()
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

        setState(prev => ({
          ...prev,
          progress: displayProgress,
          statusMessage,
        }))
      }
      
      progressInterval = setInterval(pollProgress, 500)

      // Start generation (HTTP POST - synchronous, returns when done)
      const result = await ApiClient.generateVideo(body as unknown as GenerateVideoRequest, {
        signal: abortControllerRef.current.signal,
      })
      shouldApplyPollingUpdates = false
      if (!result.ok) {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          error: result,
        }))
        return
      }

      const payload = result.data
      if (payload.status === 'complete') {
        setState({
          isGenerating: false,
          progress: 100,
          statusMessage: 'Complete!',
          videoPath: payload.video_path,
          imagePath: null,
          imagePaths: [],
          error: null,
        })
      } else if (payload.status === 'cancelled') {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          statusMessage: 'Cancelled',
        }))
      } else {
        throw new Error('Unexpected response from /api/generate')
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          statusMessage: 'Cancelled',
        }))
      } else {
        setState(prev => ({
          ...prev,
          isGenerating: false,
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
    // Abort the fetch request
    abortControllerRef.current?.abort()
    
    // Also tell the backend to cancel
    void ApiClient.cancelGeneration()
    
    setState(prev => ({
      ...prev,
      isGenerating: false,
      statusMessage: 'Cancelled',
    }))
  }, [])

  const generateImage = useCallback(async (
    prompt: string,
    settings: GenerationSettings
  ) => {
    if (imageGenerationInFlightRef.current) return
    imageGenerationInFlightRef.current = true
    const numImages = 1
    const qualityMode = getFluxQualityMode(settings)
    
    setState({
      isGenerating: true,
      progress: 0,
      statusMessage: 'Generating FLUX image on Modal...',
      videoPath: null,
      imagePath: null,
      imagePaths: [],
      error: null,
    })

    abortControllerRef.current = new AbortController()

    try {
      const imageAspectRatio = resolveImageAspectRatio(prompt, settings)
      const dimensions = dimensionsForAspectRatio(imageAspectRatio)
      const steps = Math.max(settings.imageSteps || 0, stepsForQuality(qualityMode))
      const imagePaths: string[] = []
      for (let index = 0; index < numImages; index += 1) {
        setState(prev => ({
          ...prev,
          progress: 35 + Math.floor((index / numImages) * 55),
          statusMessage: numImages > 1
            ? `Generating FLUX image ${index + 1}/${numImages} on Modal...`
            : 'Generating FLUX image on Modal...',
        }))

        const result = await FluxImageService.generate({
          prompt,
          negative_prompt: '',
          width: dimensions.width,
          height: dimensions.height,
          steps,
          guidance_scale: 3.5,
          seed: null,
          quality_mode: qualityMode,
          original_idea: prompt,
          llm_enhanced_prompt: null,
          final_prompt: prompt,
          prompt_was_user_edited: false,
          prompt_source: 'manual',
          selected_style_id: settings.imageStyleId || null,
          selected_style_label: settings.imageStyleLabel ?? null,
          selected_style_category: settings.imageStyleCategory ?? null,
          custom_style_text: settings.imageCustomStyleText ?? null,
          style_prompt_modifier: settings.imageStylePromptModifier ?? null,
          style_negative_modifier: settings.imageStyleNegativeModifier ?? null,
          style_was_applied: Boolean(settings.imageStylePromptModifier),
          negative_prompt_final: settings.imageStyleNegativeModifier || null,
          visible_prompt_before_generate: prompt,
          payload_prompt_sent_to_backend: prompt,
          frontend_negative_prompt: settings.imageStyleNegativeModifier || null,
        })
        imagePaths.push(result.local_path)
      }

      if (imagePaths.length === 0) {
        throw new Error('Modal FLUX generation completed without output images')
      }

      setState({
        isGenerating: false,
        progress: 100,
        statusMessage: 'Complete!',
        videoPath: null,
        imagePath: imagePaths[0],
        imagePaths,
        error: null,
      })

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          statusMessage: 'Cancelled',
        }))
      } else {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          error: createLocalGenerationError(error instanceof Error ? error.message : 'Unknown error'),
        }))
      }
    } finally {
      imageGenerationInFlightRef.current = false
    }
  }, [])

  const reset = useCallback(() => {
    setState({
      isGenerating: false,
      progress: 0,
      statusMessage: '',
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
