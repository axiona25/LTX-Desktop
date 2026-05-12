import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Download, ImageIcon, Loader2, Monitor, Sparkles, X } from 'lucide-react'
import { useGeneration } from '../hooks/use-generation'
import { useProjects } from '../contexts/ProjectContext'
import { addVisualAssetToProject } from '../lib/asset-copy'
import { pathToFileUrl } from '../lib/file-url'
import { PromptEnhancerService } from '../services/promptEnhancerService'
import { addImageToGallery } from '../lib/image-gallery-storage'
import type { GenerationSettings } from './SettingsPanel'
import type { GenerationError } from '../lib/generation-errors'
import type { Asset } from '../types/project-model'

type ImageGenerationWorkspaceProps = {
  scope: 'global' | 'project'
  showProjectStrip?: boolean
  selectedImagePath?: string | null
  onSelectedImagePathChange?: (path: string | null) => void
}

type AiState = 'idle' | 'thinking' | 'ready' | 'error'
type WorkspaceToast = {
  tone: 'success' | 'error'
  message: string
}

const aspectRatioValue: Record<string, string> = {
  '16:9': '16 / 9',
  '9:16': '9 / 16',
  '1:1': '1 / 1',
}

const imageStepsByResolution: Record<string, number> = {
  '1080p': 36,
  '1440p': 40,
  '2048p': 44,
}

function buildImageSettings(aspectRatio: string, imageResolution: string): GenerationSettings {
  return {
    model: 'fast',
    duration: 5,
    videoResolution: '540p',
    fps: 24,
    audio: false,
    cameraMotion: 'none',
    aspectRatio,
    imageResolution,
    imageAspectRatio: aspectRatio,
    imageSteps: imageStepsByResolution[imageResolution] ?? 36,
    variations: 1,
  }
}

function readableAxstudioError(message: string, context: 'ai' | 'image' | 'save'): string {
  const lower = message.toLowerCase()
  if (
    lower.includes('modal-http')
    || lower.includes('endpoint is stopped')
    || lower.includes('app for invoked web endpoint is stopped')
    || lower.includes('404')
  ) {
    return context === 'ai'
      ? 'AXSTUDIO AI non disponibile. Il servizio di creazione prompt non è attivo in questo momento.'
      : 'AXSTUDIO non disponibile. Il servizio di generazione non è attivo in questo momento.'
  }
  if (
    lower.includes('fetch')
    || lower.includes('network')
    || lower.includes('econnrefused')
    || lower.includes('failed to fetch')
  ) {
    return context === 'ai'
      ? 'AXSTUDIO AI non disponibile. Controlla la connessione e riprova.'
      : 'Connessione ad AXSTUDIO non disponibile. Controlla la connessione e riprova.'
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'La richiesta ha impiegato troppo tempo. Riprova tra poco.'
  }
  if (lower.includes('credits') || lower.includes('funds') || lower.includes('402')) {
    return 'Crediti insufficienti per completare la generazione.'
  }
  if (lower.includes('prompt')) {
    return context === 'ai'
      ? 'AXSTUDIO AI non è riuscito a creare il prompt. Puoi modificarlo manualmente e riprovare.'
      : 'Il prompt non è valido o non può essere elaborato. Controlla il testo e riprova.'
  }
  if (context === 'save') {
    return 'Immagine generata, ma non sono riuscito a salvarla nella cartella del progetto.'
  }
  return context === 'ai'
    ? 'AXSTUDIO AI non è riuscito a completare la richiesta. Riprova tra poco.'
    : 'Non sono riuscito a completare la generazione. Riprova tra poco.'
}

function generationErrorMessage(error: GenerationError): string {
  return readableAxstudioError(error.error.message, 'image')
}

function fileNameFromPath(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || 'axstudio-image.png'
}

function fileExtensionFromPath(filePath: string): string {
  const name = fileNameFromPath(filePath)
  const parts = name.split('.')
  return parts.length > 1 ? parts.pop()?.toLowerCase() || 'png' : 'png'
}

function GeneratedImageThumb({
  asset,
  selected,
  onClick,
}: {
  asset: Asset
  selected: boolean
  onClick: () => void
}) {
  const thumb = asset.smallThumbnailPath || asset.bigThumbnailPath || asset.path

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative h-20 w-32 shrink-0 overflow-hidden rounded-lg border bg-zinc-900 transition-colors ${
        selected ? 'border-blue-400' : 'border-zinc-800 hover:border-zinc-600'
      }`}
    >
      <img src={pathToFileUrl(thumb)} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}

export function ImageGenerationWorkspace({
  scope,
  showProjectStrip: shouldShowProjectStrip = scope === 'project',
  selectedImagePath: controlledSelectedImagePath,
  onSelectedImagePathChange,
}: ImageGenerationWorkspaceProps) {
  const { activeProject, addAsset } = useProjects()
  const activeProjectId = activeProject?.id ?? null
  const [idea, setIdea] = useState('')
  const [promptDraft, setPromptDraft] = useState('')
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9')
  const [imageResolution, setImageResolution] = useState('1080p')
  const [aiState, setAiState] = useState<AiState>('idle')
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [toast, setToast] = useState<WorkspaceToast | null>(null)
  const [internalSelectedImagePath, setInternalSelectedImagePath] = useState<string | null>(null)
  const [pendingImagePath, setPendingImagePath] = useState<string | null>(null)
  const persistedImagePathsRef = useRef<Set<string>>(new Set())
  const lastSuccessImagePathRef = useRef<string | null>(null)

  const {
    generateImage,
    isGenerating,
    progress,
    statusMessage,
    imagePaths,
    error,
  } = useGeneration()

  const projectImageAssets = useMemo(() => (
    activeProject?.assets.filter((asset) => asset.type === 'image' && asset.generationParams?.mode === 'text-to-image') ?? []
  ), [activeProject?.assets])

  const selectedImagePath = controlledSelectedImagePath ?? internalSelectedImagePath
  const setSelectedImagePath = useCallback((path: string | null) => {
    if (onSelectedImagePathChange) {
      onSelectedImagePathChange(path)
      return
    }
    setInternalSelectedImagePath(path)
  }, [onSelectedImagePathChange])
  const currentPrompt = promptDraft.trim() || idea.trim()
  const canGenerate = currentPrompt.length > 0 && !isGenerating
  const visibleProgress = isGenerating ? Math.max(8, progress || 12) : 0
  const showProjectStrip = shouldShowProjectStrip
  const selectedAspectRatio = aspectRatioValue[aspectRatio]
  const previewHeight = showProjectStrip ? 'min(calc(100vh - 17rem), 720px)' : 'min(calc(100vh - 12rem), 720px)'

  useEffect(() => {
    if (scope !== 'project' || selectedImagePath || projectImageAssets.length === 0) return
    setSelectedImagePath(projectImageAssets[0].path)
  }, [projectImageAssets, scope, selectedImagePath, setSelectedImagePath])

  useEffect(() => {
    if (!error) return
    setToast({ tone: 'error', message: generationErrorMessage(error) })
  }, [error])

  useEffect(() => {
    if (imagePaths.length === 0 || isGenerating) return
    const latestPath = imagePaths[imagePaths.length - 1]
    setSelectedImagePath(latestPath)
    setPendingImagePath(latestPath)

    if (lastSuccessImagePathRef.current !== latestPath) {
      lastSuccessImagePathRef.current = latestPath
      setToast({ tone: 'success', message: 'Immagine pronta. Se ti piace, clicca Salva.' })
    }
  }, [imagePaths, isGenerating, setSelectedImagePath])

  const runAxStudioAi = useCallback(async (sourceText?: string) => {
    const source = (sourceText ?? currentPrompt).trim()
    if (!source) {
      setToast({ tone: 'error', message: 'Scrivi prima un’idea o un prompt.' })
      return
    }

    setAiState('thinking')
    setToast(null)
    try {
      const enhanced = await PromptEnhancerService.enhance({
        idea: source,
        style: 'realistic, cinematic, production ready',
        aspect_ratio: aspectRatio,
        language: 'it',
      })
      setPromptDraft(enhanced.display_final_prompt || enhanced.final_prompt)
      setAiState('ready')
      setToast({ tone: 'success', message: 'Prompt creato con AXSTUDIO AI. Clicca sul badge dorato per leggerlo e modificarlo.' })
    } catch (err) {
      setAiState('error')
      setToast({
        tone: 'error',
        message: readableAxstudioError(err instanceof Error ? err.message : 'prompt_failed', 'ai'),
      })
    }
  }, [aspectRatio, currentPrompt])

  const handleAxStudioAiClick = () => {
    if (aiState === 'ready' && promptDraft.trim()) {
      setIsPromptModalOpen(true)
      return
    }
    void runAxStudioAi()
  }

  const handleGenerate = useCallback(async (promptOverride?: string) => {
    const promptToGenerate = (promptOverride ?? currentPrompt).trim()
    if (!promptToGenerate) {
      setToast({ tone: 'error', message: 'Scrivi un prompt prima di generare.' })
      return
    }

    setPromptDraft(promptToGenerate)
    setToast(null)
    await generateImage(promptToGenerate, buildImageSettings(aspectRatio, imageResolution))
  }, [aspectRatio, currentPrompt, generateImage, imageResolution])

  const handleSaveGeneratedImage = useCallback(async () => {
    if (!pendingImagePath || persistedImagePathsRef.current.has(pendingImagePath)) return

    setToast(null)
    try {
      let savedPath = pendingImagePath
      let savedWidth: number | undefined
      let savedHeight: number | undefined
      let savedBigThumb: string | undefined
      let savedSmallThumb: string | undefined

      if (scope === 'project' && activeProjectId) {
        const copied = await addVisualAssetToProject(pendingImagePath, activeProjectId, 'image')
        if (!copied) {
          setToast({ tone: 'error', message: readableAxstudioError('save_failed', 'save') })
          return
        }

        savedPath = copied.path
        savedWidth = copied.width
        savedHeight = copied.height
        savedBigThumb = copied.bigThumbnailPath
        savedSmallThumb = copied.smallThumbnailPath

        addAsset(activeProjectId, {
          type: 'image',
          path: copied.path,
          bigThumbnailPath: copied.bigThumbnailPath,
          smallThumbnailPath: copied.smallThumbnailPath,
          width: copied.width,
          height: copied.height,
          prompt: currentPrompt,
          resolution: imageResolution,
          generationParams: {
            mode: 'text-to-image',
            prompt: currentPrompt,
            model: 'AXSTUDIO 1.0',
            duration: 5,
            resolution: imageResolution,
            fps: 24,
            audio: false,
            cameraMotion: 'none',
            imageAspectRatio: aspectRatio,
            imageSteps: imageStepsByResolution[imageResolution] ?? 36,
          },
          takes: [{
            path: copied.path,
            bigThumbnailPath: copied.bigThumbnailPath,
            smallThumbnailPath: copied.smallThumbnailPath,
            width: copied.width,
            height: copied.height,
            createdAt: Date.now(),
          }],
          activeTakeIndex: 0,
        })

        await window.electronAPI.deleteProjectAssetFiles({ filePaths: [pendingImagePath] })
        setSelectedImagePath(copied.path)
      }

      addImageToGallery({
        path: savedPath,
        prompt: currentPrompt,
        model: 'AXSTUDIO 1.0',
        style: 'AXSTUDIO 1.0',
        aspectRatio,
        resolution: savedWidth && savedHeight ? `${savedWidth}x${savedHeight}` : imageResolution,
        projectId: scope === 'project' ? activeProjectId : null,
        projectName: scope === 'project' ? activeProject?.name ?? null : null,
      })

      persistedImagePathsRef.current.add(pendingImagePath)
      if (savedBigThumb) persistedImagePathsRef.current.add(savedBigThumb)
      if (savedSmallThumb) persistedImagePathsRef.current.add(savedSmallThumb)
      setPendingImagePath(null)
      setToast({ tone: 'success', message: scope === 'project' ? 'Immagine salvata nel progetto e aggiunta alla galleria.' : 'Immagine salvata nella galleria.' })
    } catch {
      setToast({ tone: 'error', message: readableAxstudioError('save_failed', 'save') })
    }
  }, [activeProject?.name, activeProjectId, addAsset, aspectRatio, currentPrompt, imageResolution, pendingImagePath, scope, setSelectedImagePath])

  const handleDiscardGeneratedImage = useCallback(async () => {
    if (!pendingImagePath) return
    const discardedPath = pendingImagePath
    await window.electronAPI.deleteProjectAssetFiles({ filePaths: [discardedPath] })
    setPendingImagePath(null)
    setSelectedImagePath(null)
    setToast({ tone: 'success', message: 'Immagine scartata e cancellata dallo storage locale.' })
  }, [pendingImagePath, setSelectedImagePath])

  const handleDownloadSelectedImage = useCallback(async () => {
    if (!selectedImagePath) return

    try {
      const filename = fileNameFromPath(selectedImagePath)
      const extension = fileExtensionFromPath(selectedImagePath)
      const destinationPath = await window.electronAPI.showSaveDialog({
        title: 'Scarica immagine',
        defaultPath: filename,
        filters: [
          { name: 'Immagine', extensions: [extension] },
          { name: 'Tutti i file', extensions: ['*'] },
        ],
      })
      if (!destinationPath) return

      const localFile = await window.electronAPI.readLocalFile({ filePath: selectedImagePath })
      const saved = await window.electronAPI.saveFile({
        filePath: destinationPath,
        data: localFile.data,
        encoding: 'base64',
      })
      if (!saved.success) {
        setToast({ tone: 'error', message: 'Non sono riuscito a salvare il file sul computer.' })
        return
      }
      setToast({ tone: 'success', message: 'Download completato.' })
    } catch {
      setToast({ tone: 'error', message: 'Non sono riuscito ad aprire il download sul computer.' })
    }
  }, [selectedImagePath])

  const aiButtonClass = aiState === 'ready'
    ? 'border-amber-300/60 bg-amber-400/15 text-amber-200 shadow-[0_0_24px_rgba(251,191,36,0.35)]'
    : aiState === 'thinking'
      ? 'border-blue-300/50 bg-blue-500/15 text-blue-100 shadow-[0_0_22px_rgba(59,130,246,0.32)]'
      : aiState === 'error'
        ? 'border-red-400/50 bg-red-500/10 text-red-200'
        : 'border-blue-400/30 bg-blue-500/10 text-blue-200 shadow-[0_0_18px_rgba(59,130,246,0.18)]'

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-zinc-950 text-white">
      <div className="flex min-h-0 flex-1 flex-col px-5 pt-5 pb-40">
        {showProjectStrip && projectImageAssets.length > 0 && (
          <div className="mb-4 flex items-center gap-3 overflow-x-auto pb-1">
            {projectImageAssets.map((asset) => (
              <GeneratedImageThumb
                key={asset.id}
                asset={asset}
                selected={selectedImagePath === asset.path}
                onClick={() => setSelectedImagePath(asset.path)}
              />
            ))}
          </div>
        )}

        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div
            className="group relative flex max-w-[calc(100vw-32rem)] items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-[#101113] shadow-2xl"
            style={{
              aspectRatio: selectedAspectRatio,
              height: previewHeight,
            }}
          >
            {selectedImagePath ? (
              <>
                <img src={pathToFileUrl(selectedImagePath)} alt="" className="h-full w-full rounded-2xl object-cover" />
                <button
                  type="button"
                  onClick={() => void handleDownloadSelectedImage()}
                  className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/55 text-zinc-400 opacity-0 shadow-lg backdrop-blur-sm transition-all hover:border-blue-300/50 hover:bg-blue-500/20 hover:text-white group-hover:opacity-100"
                  title="Scarica sul computer"
                >
                  <Download className="h-[18px] w-[18px]" />
                </button>
                {pendingImagePath && selectedImagePath === pendingImagePath && (
                  <button
                    type="button"
                    onClick={() => void handleDiscardGeneratedImage()}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-zinc-300 hover:bg-red-500 hover:text-white"
                    title="Scarta immagine"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center px-8 text-center">
                <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/70">
                  <ImageIcon className="h-10 w-10 text-zinc-600" />
                </div>
                <div className="text-lg font-semibold text-zinc-200">Immagine in preparazione</div>
                <div className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                  Scrivi l’idea nel box in basso, scegli formato e risoluzione, poi genera.
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/72 backdrop-blur-sm">
                <div className="relative mb-5 h-20 w-20">
                  <div className="absolute inset-0 rounded-full border border-blue-400/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                  <div className="absolute inset-3 flex items-center justify-center rounded-full bg-zinc-950">
                    <Sparkles className="h-7 w-7 animate-pulse text-blue-300" />
                  </div>
                </div>
                <div className="text-sm font-medium text-zinc-200">{statusMessage || 'Creazione immagine...'}</div>
                <div className="mt-4 h-2 w-64 overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full bg-blue-400 transition-all duration-300" style={{ width: `${Math.min(100, visibleProgress)}%` }} />
                </div>
                <div className="mt-2 text-xs text-zinc-500">{Math.min(100, Math.round(visibleProgress))}%</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-5 left-1/2 w-[min(760px,calc(100%-2rem))] -translate-x-1/2">
        <div className="overflow-visible rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
          <div className="relative">
            <button
              type="button"
              onClick={handleAxStudioAiClick}
              disabled={aiState === 'thinking'}
              className={`absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-all ${aiButtonClass}`}
              title={aiState === 'ready' ? 'Prompt pronto: clicca per aprirlo' : 'Crea prompt con AXSTUDIO AI'}
            >
              {aiState === 'thinking'
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Sparkles className={`h-3.5 w-3.5 ${aiState === 'ready' ? 'text-amber-200' : ''}`} />}
              AXSTUDIO AI
            </button>
            <textarea
              value={idea}
              onChange={(event) => {
                setIdea(event.target.value)
                if (aiState !== 'thinking') setAiState('idle')
              }}
              placeholder="Descrivi l'immagine che vuoi generare..."
              className="h-[78px] w-full resize-none bg-transparent px-3 py-3 pr-36 text-sm leading-5 text-white outline-none placeholder:text-zinc-500"
            />
          </div>

          <div className="flex items-center gap-1.5 border-t border-zinc-800/70 px-2 py-2 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="font-medium">AXSTUDIO 1.0</span>
            </div>

            <label className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-zinc-800">
              <Monitor className="h-3.5 w-3.5" />
              <select
                value={imageResolution}
                onChange={(event) => setImageResolution(event.target.value)}
                className="bg-transparent text-zinc-300 outline-none"
              >
                <option value="1080p">1080</option>
                <option value="1440p">1440</option>
                <option value="2048p">2048</option>
              </select>
            </label>

            <label className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-zinc-800">
              <span className="h-3.5 w-3.5 rounded-sm border border-zinc-500" />
              <select
                value={aspectRatio}
                onChange={(event) => setAspectRatio(event.target.value as '16:9' | '9:16' | '1:1')}
                className="bg-transparent text-zinc-300 outline-none"
              >
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
              </select>
            </label>

            <div className="flex-1" />

            <button
              type="button"
              onClick={() => pendingImagePath ? void handleSaveGeneratedImage() : void handleGenerate()}
              disabled={pendingImagePath ? false : !canGenerate}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                pendingImagePath || canGenerate
                  ? 'bg-white text-black hover:bg-zinc-200'
                  : 'cursor-not-allowed bg-zinc-700 text-zinc-500'
              }`}
            >
              <Sparkles className={`h-3.5 w-3.5 ${isGenerating ? 'animate-pulse' : ''}`} />
              {pendingImagePath ? 'Salva' : 'Genera'}
            </button>
          </div>
        </div>

        {toast && (
          <div className={`mt-3 flex items-start gap-2 rounded-xl border p-3 text-sm ${
            toast.tone === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : 'border-red-500/30 bg-red-500/10 text-red-200'
          }`}>
            {toast.tone === 'success'
              ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="rounded-md p-0.5 opacity-70 hover:bg-white/10 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {isPromptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 px-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <div className="text-lg font-semibold text-white">Prompt AXSTUDIO AI</div>
                <div className="text-xs text-zinc-500">Leggi, modifica e poi genera oppure rielabora.</div>
              </div>
              <button
                type="button"
                onClick={() => setIsPromptModalOpen(false)}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              <textarea
                value={promptDraft}
                onChange={(event) => setPromptDraft(event.target.value)}
                className="h-72 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm leading-6 text-zinc-100 outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-zinc-800 px-5 py-4">
              <button
                type="button"
                onClick={() => void runAxStudioAi(promptDraft)}
                disabled={aiState === 'thinking'}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-500"
              >
                {aiState === 'thinking' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Rielabora
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPromptModalOpen(false)
                  void handleGenerate(promptDraft)
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                <Sparkles className="h-4 w-4" />
                Genera
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
