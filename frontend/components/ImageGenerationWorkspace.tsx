import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Download, ImageIcon, Loader2, Monitor, Palette, RotateCcw, Sparkles, Square, UserRound, X } from 'lucide-react'
import { useGeneration } from '../hooks/use-generation'
import { useProjects } from '../contexts/ProjectContext'
import { addVisualAssetToProject } from '../lib/asset-copy'
import { pathToFileUrl } from '../lib/file-url'
import { PromptEnhancerService } from '../services/promptEnhancerService'
import { addImageToGallery, GALLERY_OPEN_IMAGE_EVENT, readImageGallery, writeImageGallery } from '../lib/image-gallery-storage'
import {
  addCharacter,
  buildCharacterIdentityPrompt,
  buildCharacterNegativePrompt,
  CHARACTER_DELETED_EVENT,
  CHARACTER_OPEN_EVENT,
  CHARACTER_UPDATED_EVENT,
  nextCharacterCode,
  readCharacters,
  type SavedCharacter,
} from '../lib/character-storage'
import { ALL_IMAGE_STYLE_PRESETS, IMAGE_STYLE_CATEGORY_LABELS, IMAGE_STYLE_PRESETS, getImageStylePreset, type ImageStyleCategory, type ImageStylePreset } from '../constants/imageStyles'
import type { GenerationSettings } from './SettingsPanel'
import type { GenerationError } from '../lib/generation-errors'
import type { Asset } from '../types/project-model'
import type { PromptSource } from '../types/image'
import { readPersistentItem, removePersistentItem, writePersistentItem } from '../lib/persistent-storage'

type ImageGenerationWorkspaceProps = {
  scope: 'global' | 'project'
  creationMode?: 'image' | 'character'
  showProjectStrip?: boolean
  selectedImagePath?: string | null
  onSelectedImagePathChange?: (path: string | null) => void
}

type AiState = 'idle' | 'thinking' | 'review' | 'approved' | 'error'
type WorkspaceToast = {
  tone: 'success' | 'error'
  message: string
}

type PersistedWorkspaceImageView = {
  selectedImagePath: string | null
  pendingImagePath: string | null
  selectedCharacterId: string | null
}

const WORKSPACE_IMAGE_VIEW_STATE_PREFIX = 'axstudio:image-workspace-view-state:v1'
const CHARACTER_MASTER_STYLE: ImageStylePreset = {
  style_id: 'character_master_realistic',
  style_label: 'Character Realistico',
  style_category: 'realistic_photo',
  style_prompt_modifier: 'photorealistic front-facing character master portrait, calm alive closed-mouth expression, symmetrical full face visible, close-up head-and-upper-shoulders ID framing only, face occupies most of the frame, no chest or torso, flattering soft portrait lighting with natural catchlights, naturally handsome photogenic and harmonious facial proportions when beauty is requested, healthy realistic skin with natural pores, preserve requested ethnicity and historical identity, preserve requested hair length exactly, long hair must remain visibly loose and fall past the shoulders if requested, natural hair and beard detail, accurate iris color, plain studio background, identity reference quality',
  style_negative_modifier: 'three-quarter view, side view, profile view, looking away, smile with teeth, extreme emotion, cinematic scene, dramatic shadows, beauty filter, waxy skin, plastic skin, doll face, ugly face, unpleasant face, plain unattractive face, weak facial structure, grotesque features, dirty skin, diseased skin, dull lifeless eyes, no catchlights, anime, cartoon, illustration, fantasy costume, background clutter, short hair when long hair is requested, tied back hair, bun, ponytail, hair hidden behind ears, hair above shoulders, modern haircut, styled quiff, salon haircut, fashionable model grooming, modern t-shirt, crew neck shirt, modern henley shirt, shirt buttons, button placket, modern collar, contemporary clothing, chest, torso, arms, western fashion model, generic actor face',
  preview_image: './style-previews/photorealistic.webp',
}

function formatGenerationElapsedTime(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function imageWorkspaceViewStateKey(
  scope: ImageGenerationWorkspaceProps['scope'],
  projectId: string | null,
  creationMode: NonNullable<ImageGenerationWorkspaceProps['creationMode']>,
): string {
  return `${WORKSPACE_IMAGE_VIEW_STATE_PREFIX}:${scope}:${creationMode}:${projectId ?? 'global'}`
}

function readWorkspaceImageViewState(storageKey: string): PersistedWorkspaceImageView {
  if (typeof window === 'undefined') {
    return { selectedImagePath: null, pendingImagePath: null, selectedCharacterId: null }
  }
  if (storageKey.includes(':project:')) {
    removePersistentItem(storageKey)
    return { selectedImagePath: null, pendingImagePath: null, selectedCharacterId: null }
  }

  try {
    const raw = readPersistentItem(storageKey)
    if (!raw) return { selectedImagePath: null, pendingImagePath: null, selectedCharacterId: null }
    const parsed = JSON.parse(raw) as Partial<PersistedWorkspaceImageView>
    return {
      selectedImagePath: typeof parsed.selectedImagePath === 'string' ? parsed.selectedImagePath : null,
      pendingImagePath: typeof parsed.pendingImagePath === 'string' ? parsed.pendingImagePath : null,
      selectedCharacterId: typeof parsed.selectedCharacterId === 'string' ? parsed.selectedCharacterId : null,
    }
  } catch {
    return { selectedImagePath: null, pendingImagePath: null, selectedCharacterId: null }
  }
}

function writeWorkspaceImageViewState(storageKey: string, state: PersistedWorkspaceImageView): void {
  if (typeof window === 'undefined') return

  if (storageKey.includes(':project:')) {
    removePersistentItem(storageKey)
    return
  }

  if (!state.selectedImagePath && !state.pendingImagePath && !state.selectedCharacterId) {
    removePersistentItem(storageKey)
    return
  }

  writePersistentItem(storageKey, JSON.stringify(state))
}

const aspectRatioValue: Record<string, string> = {
  '16:9': '16 / 9',
  '9:16': '9 / 16',
  '1:1': '1 / 1',
}

const imageStepsByResolution: Record<string, number> = {
  '1080p': 4,
  '1440p': 6,
  '2048p': 6,
  '4k': 6,
}

function buildImageSettings(
  aspectRatio: string,
  imageResolution: string,
  selectedStyle: ImageStylePreset | null,
): GenerationSettings {
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
    imageStyleId: selectedStyle?.style_id ?? '',
    imageStyleLabel: selectedStyle?.style_label ?? null,
    imageStyleCategory: selectedStyle?.style_category ?? null,
    imageStylePromptModifier: selectedStyle?.style_prompt_modifier ?? null,
    imageStyleNegativeModifier: selectedStyle?.style_negative_modifier ?? null,
    imageCustomStyleText: null,
    imageCharacterId: null,
    imageCharacterName: null,
    imageCharacterImagePath: null,
    imageCharacterPrompt: null,
    imageCharacterNegativePrompt: null,
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

function normalizePromptText(prompt?: string | null): string {
  return (prompt ?? '').trim()
}

function promptKey(prompt?: string | null): string {
  return normalizePromptText(prompt).replace(/\s+/g, ' ').toLowerCase()
}

function samePromptText(first?: string | null, second?: string | null): boolean {
  const firstKey = promptKey(first)
  const secondKey = promptKey(second)
  return firstKey.length > 0 && firstKey === secondKey
}

function sameFileName(firstPath?: string | null, secondPath?: string | null): boolean {
  if (!firstPath || !secondPath) return false
  return fileNameFromPath(firstPath).toLowerCase() === fileNameFromPath(secondPath).toLowerCase()
}

function isSupportedCharacterImagePath(filePath: string): boolean {
  return ['png', 'jpg', 'jpeg', 'webp'].includes(fileExtensionFromPath(filePath))
}

function uniqueImagePaths(paths: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const path of paths) {
    const normalized = path?.trim()
    if (!normalized || seen.has(normalized) || !isSupportedCharacterImagePath(normalized)) continue
    result.push(normalized)
    seen.add(normalized)
  }
  return result
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
  creationMode = 'image',
  showProjectStrip: shouldShowProjectStrip = scope === 'project',
  selectedImagePath: controlledSelectedImagePath,
  onSelectedImagePathChange,
}: ImageGenerationWorkspaceProps) {
  const { activeProject, projectIds, getProject, addAsset, deleteAsset, updateAsset } = useProjects()
  const activeProjectId = activeProject?.id ?? null
  const isCharacterCreationMode = creationMode === 'character'
  const workspaceViewStorageKey = useMemo(
    () => imageWorkspaceViewStateKey(scope, activeProjectId, creationMode),
    [activeProjectId, creationMode, scope],
  )
  const initialWorkspaceViewState = useMemo(
    () => readWorkspaceImageViewState(workspaceViewStorageKey),
    [workspaceViewStorageKey],
  )
  const [idea, setIdea] = useState('')
  const [promptDraft, setPromptDraft] = useState('')
  const [promptSource, setPromptSource] = useState<PromptSource>('manual')
  const [llmOriginalIdea, setLlmOriginalIdea] = useState<string | null>(null)
  const [llmEnhancedPrompt, setLlmEnhancedPrompt] = useState<string | null>(null)
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9')
  const [imageResolution, setImageResolution] = useState('1080p')
  const [selectedStyleId, setSelectedStyleId] = useState('realistic')
  const [characters, setCharacters] = useState<SavedCharacter[]>(() => readCharacters())
  const [selectedCharacterId, setSelectedCharacterId] = useState(
    () => initialWorkspaceViewState.selectedCharacterId ?? '',
  )
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false)
  const [aiState, setAiState] = useState<AiState>('idle')
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [toast, setToast] = useState<WorkspaceToast | null>(null)
  const [internalSelectedImagePath, setInternalSelectedImagePath] = useState<string | null>(
    () => initialWorkspaceViewState.selectedImagePath,
  )
  const [pendingImagePath, setPendingImagePath] = useState<string | null>(
    () => initialWorkspaceViewState.pendingImagePath,
  )
  const persistedImagePathsRef = useRef<Set<string>>(new Set())
  const lastSuccessImagePathRef = useRef<string | null>(null)
  const restoredWorkspaceViewKeyRef = useRef<string | null>(null)
  const skipNextWorkspaceViewPersistRef = useRef(false)

  const {
    generateImage,
    isGenerating,
    progress,
    statusMessage,
    generationStartedAt,
    imagePaths,
    error,
    cancel,
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
  const currentPrompt = idea.trim()
  const selectedStyle = useMemo(
    () => (isCharacterCreationMode ? CHARACTER_MASTER_STYLE : getImageStylePreset(selectedStyleId)),
    [isCharacterCreationMode, selectedStyleId],
  )
  const selectedCharacter = useMemo(() => (
    characters.find((character) => character.id === selectedCharacterId) ?? null
  ), [characters, selectedCharacterId])
  const allProjectImageAssets = useMemo(() => (
    projectIds.flatMap((projectId) => (
      getProject(projectId)?.assets.filter((asset) => asset.type === 'image') ?? []
    ))
  ), [getProject, projectIds])
  const selectedImagePrompt = useMemo(() => {
    if (!selectedImagePath) return ''
    const galleryItems = readImageGallery()
    const projectPrompt = allProjectImageAssets.find((asset) => asset.path === selectedImagePath)?.prompt
    if (projectPrompt?.trim()) return projectPrompt.trim()
    const galleryPrompt = galleryItems.find((item) => item.path === selectedImagePath)?.prompt
    if (galleryPrompt?.trim()) return galleryPrompt.trim()
    const projectPromptByFilename = allProjectImageAssets.find((asset) => sameFileName(asset.path, selectedImagePath))?.prompt
    if (projectPromptByFilename?.trim()) return projectPromptByFilename.trim()
    const galleryPromptByFilename = galleryItems.find((item) => sameFileName(item.path, selectedImagePath))?.prompt
    if (galleryPromptByFilename?.trim()) return galleryPromptByFilename.trim()
    return currentPrompt
  }, [allProjectImageAssets, currentPrompt, selectedImagePath])
  const characterSourceImagePathCandidates = useMemo(() => {
    if (!selectedImagePath) return []
    const galleryItems = readImageGallery()
    const matchingProjectAssets = allProjectImageAssets.filter((asset) => (
      asset.path === selectedImagePath
      || sameFileName(asset.path, selectedImagePath)
      || samePromptText(asset.prompt, selectedImagePrompt)
    ))
    const matchingGalleryItems = galleryItems.filter((item) => (
      item.path === selectedImagePath
      || sameFileName(item.path, selectedImagePath)
      || samePromptText(item.prompt, selectedImagePrompt)
    ))
    return uniqueImagePaths([
      selectedImagePath,
      pendingImagePath,
      ...matchingProjectAssets.map((asset) => asset.path),
      ...matchingGalleryItems.map((item) => item.path),
    ])
  }, [allProjectImageAssets, pendingImagePath, selectedImagePath, selectedImagePrompt])
  const canCreateCharacterFromImage = isCharacterCreationMode && Boolean(pendingImagePath)
  const canUseCharacterSelect = !isCharacterCreationMode
  const selectedProjectImageAsset = useMemo(() => {
    if (scope !== 'project' || !selectedImagePath) return null
    return activeProject?.assets.find((asset) => (
      asset.type === 'image'
      && (
        asset.path === selectedImagePath
        || asset.bigThumbnailPath === selectedImagePath
        || asset.smallThumbnailPath === selectedImagePath
        || asset.takes?.some((take) => (
          take.path === selectedImagePath
          || take.bigThumbnailPath === selectedImagePath
          || take.smallThumbnailPath === selectedImagePath
        ))
      )
    )) ?? null
  }, [activeProject?.assets, scope, selectedImagePath])
  const visibleSelectedImagePath = scope === 'project'
    ? selectedProjectImageAsset?.path ?? null
    : selectedImagePath
  const groupedStyles = useMemo(() => (
    ALL_IMAGE_STYLE_PRESETS.reduce((groups, style) => {
      if (!groups[style.style_category]) groups[style.style_category] = []
      groups[style.style_category]?.push(style)
      return groups
    }, {} as Partial<Record<ImageStyleCategory, ImageStylePreset[]>>)
  ), [])
  const canGenerate = currentPrompt.length > 0 && !isGenerating
  const hasRealProgress = isGenerating && progress > 0 && progress < 100
  const visibleProgress = isGenerating ? Math.max(8, progress || 12) : 0
  const [generationTimerNow, setGenerationTimerNow] = useState(() => Date.now())
  const generationElapsedLabel = generationStartedAt
    ? formatGenerationElapsedTime(generationTimerNow - generationStartedAt)
    : '0:00'
  const generationProgressLabel = hasRealProgress
    ? `${Math.min(100, Math.round(visibleProgress))}%`
    : 'Generazione remota in corso'
  const showProjectStrip = shouldShowProjectStrip
  const selectedAspectRatio = aspectRatioValue[aspectRatio]
  const previewHeight = showProjectStrip
    ? 'clamp(260px, calc(100vh - 22rem), 680px)'
    : 'clamp(280px, calc(100vh - 19rem), 660px)'

  useEffect(() => {
    if (!isGenerating || !generationStartedAt) return
    setGenerationTimerNow(Date.now())
    const timer = window.setInterval(() => {
      setGenerationTimerNow(Date.now())
    }, 1000)
    return () => window.clearInterval(timer)
  }, [generationStartedAt, isGenerating])

  useEffect(() => {
    if (restoredWorkspaceViewKeyRef.current === workspaceViewStorageKey) return
    const persisted = readWorkspaceImageViewState(workspaceViewStorageKey)
    restoredWorkspaceViewKeyRef.current = workspaceViewStorageKey
    skipNextWorkspaceViewPersistRef.current = true
    setPendingImagePath(persisted.pendingImagePath)
    setSelectedImagePath(persisted.selectedImagePath)
    setSelectedCharacterId(persisted.selectedCharacterId ?? '')
  }, [setSelectedImagePath, workspaceViewStorageKey])

  useEffect(() => {
    if (restoredWorkspaceViewKeyRef.current !== workspaceViewStorageKey) return
    if (skipNextWorkspaceViewPersistRef.current) {
      skipNextWorkspaceViewPersistRef.current = false
      return
    }
    writeWorkspaceImageViewState(workspaceViewStorageKey, {
      selectedImagePath,
      pendingImagePath,
      selectedCharacterId: selectedCharacterId || null,
    })
  }, [pendingImagePath, selectedCharacterId, selectedImagePath, workspaceViewStorageKey])

  useEffect(() => {
    const openGalleryImage = (event: Event) => {
      const detail = (event as CustomEvent<{ path?: string }>).detail
      if (!detail?.path) return
      setPendingImagePath(null)
      setSelectedImagePath(detail.path)
    }
    window.addEventListener(GALLERY_OPEN_IMAGE_EVENT, openGalleryImage)
    return () => window.removeEventListener(GALLERY_OPEN_IMAGE_EVENT, openGalleryImage)
  }, [setSelectedImagePath])

  useEffect(() => {
    const openCharacter = (event: Event) => {
      if (!isCharacterCreationMode) return
      const detail = (event as CustomEvent<{ character?: SavedCharacter }>).detail
      const character = detail?.character
      if (!character?.imagePath) return
      setPendingImagePath(null)
      setSelectedImagePath(character.imagePath)
      setSelectedCharacterId(character.id)
      setIdea(character.description || character.identityPrompt || '')
      setPromptDraft(character.description || character.identityPrompt || '')
      setPromptSource('manual')
      setLlmOriginalIdea(null)
      setLlmEnhancedPrompt(null)
      setAiState('idle')
      setIsPromptModalOpen(false)
      setToast(null)
    }
    window.addEventListener(CHARACTER_OPEN_EVENT, openCharacter)
    return () => window.removeEventListener(CHARACTER_OPEN_EVENT, openCharacter)
  }, [isCharacterCreationMode, setSelectedImagePath])

  useEffect(() => {
    if (!error) return
    setToast({ tone: 'error', message: generationErrorMessage(error) })
  }, [error])

  useEffect(() => {
    const refreshCharacters = () => setCharacters(readCharacters())
    window.addEventListener(CHARACTER_UPDATED_EVENT, refreshCharacters)
    window.addEventListener('storage', refreshCharacters)
    return () => {
      window.removeEventListener(CHARACTER_UPDATED_EVENT, refreshCharacters)
      window.removeEventListener('storage', refreshCharacters)
    }
  }, [])

  useEffect(() => {
    if (!selectedCharacterId) return
    if (characters.some((character) => character.id === selectedCharacterId)) return
    setSelectedCharacterId('')
  }, [characters, selectedCharacterId])

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

  const resetWorkspaceForm = useCallback(() => {
    setPendingImagePath(null)
    setSelectedImagePath(null)
    setIdea('')
    setPromptDraft('')
    setPromptSource('manual')
    setLlmOriginalIdea(null)
    setLlmEnhancedPrompt(null)
    setAiState('idle')
    setIsPromptModalOpen(false)
    setSelectedStyleId('realistic')
    setImageResolution(isCharacterCreationMode ? '4k' : '1080p')
    setAspectRatio(isCharacterCreationMode ? '1:1' : '16:9')
    setSelectedCharacterId('')
  }, [isCharacterCreationMode, setSelectedImagePath])

  useEffect(() => {
    const clearDeletedCharacter = (event: Event) => {
      const detail = (event as CustomEvent<{ ids?: string[]; paths?: string[] }>).detail
      const deletedIds = new Set(detail?.ids ?? [])
      const deletedPaths = new Set(detail?.paths ?? [])
      if (
        (selectedCharacterId && deletedIds.has(selectedCharacterId))
        || (selectedImagePath && deletedPaths.has(selectedImagePath))
        || (pendingImagePath && deletedPaths.has(pendingImagePath))
      ) {
        resetWorkspaceForm()
        setToast({ tone: 'success', message: 'Personaggio eliminato dalla libreria.' })
      }
    }
    window.addEventListener(CHARACTER_DELETED_EVENT, clearDeletedCharacter)
    return () => window.removeEventListener(CHARACTER_DELETED_EVENT, clearDeletedCharacter)
  }, [pendingImagePath, resetWorkspaceForm, selectedCharacterId, selectedImagePath])

  useEffect(() => {
    if (!isCharacterCreationMode) return
    setAspectRatio('1:1')
    setImageResolution('4k')
    setSelectedCharacterId('')
    setIsStyleModalOpen(false)
  }, [isCharacterCreationMode])

  useEffect(() => {
    if (scope !== 'project' || !selectedImagePath || selectedProjectImageAsset) return
    resetWorkspaceForm()
  }, [resetWorkspaceForm, scope, selectedImagePath, selectedProjectImageAsset])

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
        style: isCharacterCreationMode
          ? 'character_master_prompt'
          : selectedStyle
          ? `${selectedStyle.style_label}: ${selectedStyle.style_prompt_modifier}`
          : 'stile grafico AXSTUDIO selezionato',
        aspect_ratio: isCharacterCreationMode ? '1:1' : aspectRatio,
        language: 'it',
      })
      const enhancedPrompt = enhanced.display_final_prompt || enhanced.final_prompt
      setPromptDraft(enhancedPrompt)
      setPromptSource('llm_enhanced')
      setLlmOriginalIdea(source)
      setLlmEnhancedPrompt(enhanced.final_prompt)
      setAiState('review')
      setIsPromptModalOpen(true)
    } catch (err) {
      setAiState('error')
      setToast({
        tone: 'error',
        message: readableAxstudioError(err instanceof Error ? err.message : 'prompt_failed', 'ai'),
      })
    }
  }, [aspectRatio, currentPrompt, isCharacterCreationMode, selectedStyle])

  const handleAxStudioAiClick = () => {
    if ((aiState === 'review' || aiState === 'approved') && promptDraft.trim()) {
      setIsPromptModalOpen(true)
      return
    }
    void runAxStudioAi()
  }

  const handleApproveAxStudioPrompt = useCallback(() => {
    const approvedPrompt = promptDraft.trim()
    if (!approvedPrompt) {
      setToast({ tone: 'error', message: 'Il prompt AXSTUDIO AI è vuoto.' })
      return
    }
    setIdea(approvedPrompt)
    setPromptDraft(approvedPrompt)
    setPromptSource(promptSource === 'user_edited' ? 'user_edited' : 'llm_enhanced')
    setAiState('approved')
    setIsPromptModalOpen(false)
    setToast({ tone: 'success', message: 'Prompt approvato. Ora puoi cliccare Genera.' })
  }, [promptDraft, promptSource])

  const handleGenerate = useCallback(async (promptOverride?: string, sourceOverride?: PromptSource) => {
    const promptToGenerate = (promptOverride ?? currentPrompt).trim()
    if (!promptToGenerate) {
      setToast({ tone: 'error', message: 'Scrivi un prompt prima di generare.' })
      return
    }

    setPromptDraft(promptToGenerate)
    setIdea(promptToGenerate)
    setToast(null)
    const effectiveSource = sourceOverride ?? (aiState === 'approved' ? promptSource : 'manual')
    const imageSettings = buildImageSettings(
      isCharacterCreationMode ? '1:1' : aspectRatio,
      isCharacterCreationMode ? '4k' : imageResolution,
      isCharacterCreationMode ? CHARACTER_MASTER_STYLE : selectedStyle,
    )
    const characterForGeneration = canUseCharacterSelect ? selectedCharacter : null
    imageSettings.imageCharacterId = characterForGeneration?.id ?? null
    imageSettings.imageCharacterName = characterForGeneration?.name ?? null
    imageSettings.imageCharacterImagePath = characterForGeneration?.imagePath ?? null
    imageSettings.imageCharacterPrompt = characterForGeneration?.identityPrompt ?? null
    imageSettings.imageCharacterNegativePrompt = characterForGeneration?.negativePrompt ?? null
    await generateImage(promptToGenerate, imageSettings, {
      originalIdea: effectiveSource === 'manual' ? promptToGenerate : llmOriginalIdea ?? promptToGenerate,
      llmEnhancedPrompt: effectiveSource === 'manual' ? null : llmEnhancedPrompt ?? promptToGenerate,
      promptSource: effectiveSource,
      promptWasUserEdited: effectiveSource === 'user_edited',
    })
  }, [aiState, aspectRatio, canUseCharacterSelect, currentPrompt, generateImage, imageResolution, isCharacterCreationMode, llmEnhancedPrompt, llmOriginalIdea, promptSource, selectedCharacter, selectedStyle])

  const handleStopGeneration = useCallback(() => {
    cancel()
    setToast({ tone: 'success', message: 'Generazione interrotta.' })
  }, [cancel])

  const handleRegenerateCharacterImage = useCallback(async () => {
    const discardedPath = pendingImagePath
    setPendingImagePath(null)
    setSelectedImagePath(null)
    if (discardedPath) {
      await window.electronAPI.deleteProjectAssetFiles({ filePaths: [discardedPath] })
    }
    await handleGenerate()
  }, [handleGenerate, pendingImagePath, setSelectedImagePath])

  const handleCreateCharacterFromSelectedImage = useCallback(async () => {
    if (!selectedImagePath) return
    setToast(null)
    let copied: Awaited<ReturnType<typeof window.electronAPI.copyImageToCharacterLibrary>> | null = null
    let copiedFromPath = ''
    for (const sourcePath of characterSourceImagePathCandidates) {
      const result = await window.electronAPI.copyImageToCharacterLibrary({ srcPath: sourcePath })
      if (result.success) {
        copied = result
        copiedFromPath = sourcePath
        break
      }
    }
    if (!copied) {
      setToast({ tone: 'error', message: 'Non trovo il file immagine originale da salvare come character.' })
      return
    }
    if (copiedFromPath && copiedFromPath !== selectedImagePath) {
      setSelectedImagePath(copiedFromPath)
    }
    setToast({ tone: 'success', message: 'Creo la carta d’identità del personaggio...' })
    let identityPrompt = buildCharacterIdentityPrompt(selectedImagePrompt)
    let negativePrompt = buildCharacterNegativePrompt(selectedImagePrompt)
    let description = selectedImagePrompt.trim().slice(0, 180) || 'Character master creato da AXSTUDIO per scene e stili diversi.'
    try {
      const identityCard = await PromptEnhancerService.enhance({
        idea: selectedImagePrompt || `Crea una carta identità completa per il personaggio salvato da ${fileNameFromPath(copiedFromPath || selectedImagePath)}.`,
        style: 'character_identity_card',
        aspect_ratio: aspectRatio,
        language: 'it',
      })
      identityPrompt = identityCard.final_prompt || identityPrompt
      negativePrompt = identityCard.negative_prompt || negativePrompt
      description = (identityCard.display_final_prompt || identityCard.final_prompt || description).slice(0, 600)
    } catch (err) {
      setToast({
        tone: 'error',
        message: readableAxstudioError(err instanceof Error ? err.message : 'character_identity_failed', 'ai'),
      })
    }
    const saved = addCharacter({
      name: `Character ${characters.length + 1}`,
      code: nextCharacterCode(characters.length),
      description,
      imagePath: copied.path,
      identityPrompt,
      negativePrompt,
    })
    setCharacters(readCharacters())
    setSelectedCharacterId(saved.id)
    const linkedPaths = new Set(uniqueImagePaths([selectedImagePath, copiedFromPath, ...characterSourceImagePathCandidates]))
    const galleryItems = readImageGallery()
    const linkedGalleryItems = galleryItems.map((item) => (
      linkedPaths.has(item.path)
        ? { ...item, characterId: saved.id, characterName: saved.name }
        : item
    ))
    if (linkedGalleryItems.some((item, index) => item !== galleryItems[index])) {
      writeImageGallery(linkedGalleryItems)
    }
    for (const projectId of projectIds) {
      const project = getProject(projectId)
      const asset = project?.assets.find((candidate) => linkedPaths.has(candidate.path))
      if (!asset?.generationParams) continue
      updateAsset(projectId, asset.id, {
        generationParams: {
          ...asset.generationParams,
          imageCharacterId: saved.id,
          imageCharacterName: saved.name,
        },
      })
    }
    setPendingImagePath(null)
    persistedImagePathsRef.current.add(selectedImagePath)
    persistedImagePathsRef.current.add(copied.path)
    setToast({ tone: 'success', message: 'Personaggio salvato. Ora puoi riusarlo con qualunque stile grafico.' })
  }, [aspectRatio, characterSourceImagePathCandidates, characters.length, getProject, projectIds, selectedImagePath, selectedImagePrompt, setSelectedImagePath, updateAsset])

  const handleSaveGeneratedImage = useCallback(async () => {
    if (!pendingImagePath || persistedImagePathsRef.current.has(pendingImagePath)) return

    setToast(null)
    try {
      let savedPath = pendingImagePath
      let savedWidth: number | undefined
      let savedHeight: number | undefined
      let savedBigThumb: string | undefined
      let savedSmallThumb: string | undefined
      let savedProjectAssetId: string | null = null

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

        const savedAsset = addAsset(activeProjectId, {
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
            imageCharacterId: selectedCharacter?.id ?? null,
            imageCharacterName: selectedCharacter?.name ?? null,
            imageCharacterImagePath: selectedCharacter?.imagePath ?? null,
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
        savedProjectAssetId = savedAsset.id

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
        projectAssetId: savedProjectAssetId,
        characterId: selectedCharacter?.id ?? null,
        characterName: selectedCharacter?.name ?? null,
      })

      persistedImagePathsRef.current.add(pendingImagePath)
      if (savedBigThumb) persistedImagePathsRef.current.add(savedBigThumb)
      if (savedSmallThumb) persistedImagePathsRef.current.add(savedSmallThumb)
      setPendingImagePath(null)
      setToast({ tone: 'success', message: scope === 'project' ? 'Immagine salvata nel progetto e aggiunta alla galleria.' : 'Immagine salvata nella galleria.' })
    } catch {
      setToast({ tone: 'error', message: readableAxstudioError('save_failed', 'save') })
    }
  }, [activeProject?.name, activeProjectId, addAsset, aspectRatio, currentPrompt, imageResolution, pendingImagePath, scope, selectedCharacter, setSelectedImagePath])

  const handleDiscardGeneratedImage = useCallback(async () => {
    if (!pendingImagePath) return
    const discardedPath = pendingImagePath
    await window.electronAPI.deleteProjectAssetFiles({ filePaths: [discardedPath] })
    resetWorkspaceForm()
    setToast({ tone: 'success', message: 'Immagine scartata e cancellata dallo storage locale.' })
  }, [pendingImagePath, resetWorkspaceForm])

  const handleClearSelectedImage = useCallback(async () => {
    if (pendingImagePath && selectedImagePath === pendingImagePath) {
      void handleDiscardGeneratedImage()
      return
    }
    if (scope === 'project' && activeProjectId && selectedImagePath) {
      const projectAsset = selectedProjectImageAsset
      if (!projectAsset) {
        resetWorkspaceForm()
        setToast(null)
        return
      }

      const filePaths = uniqueImagePaths([
        projectAsset.path,
        projectAsset.bigThumbnailPath,
        projectAsset.smallThumbnailPath,
        ...(projectAsset.takes ?? []).flatMap((take) => [
          take.path,
          take.bigThumbnailPath,
          take.smallThumbnailPath,
        ]),
      ])
      const characterImagePaths = new Set(readCharacters().map((character) => character.imagePath).filter(Boolean))
      const deletableFilePaths = filePaths.filter((filePath) => !characterImagePaths.has(filePath))
      const result = deletableFilePaths.length > 0
        ? await window.electronAPI.deleteProjectAssetFiles({ filePaths: deletableFilePaths })
        : { success: true }
      if (!result.success) {
        setToast({ tone: 'error', message: 'Non sono riuscito a cancellare i file locali dell’immagine.' })
        return
      }

      deleteAsset(activeProjectId, projectAsset.id)
      const galleryItems = readImageGallery()
      const linkedPaths = new Set(filePaths)
      const nextGalleryItems = galleryItems.filter((item) => (
        item.projectAssetId !== projectAsset.id
        && item.path !== projectAsset.path
        && !linkedPaths.has(item.path)
      ))
      if (nextGalleryItems.length !== galleryItems.length) {
        writeImageGallery(nextGalleryItems)
      }
      resetWorkspaceForm()
      setToast({ tone: 'success', message: 'Immagine eliminata dal progetto.' })
      return
    }
    resetWorkspaceForm()
    setToast(null)
  }, [activeProjectId, deleteAsset, handleDiscardGeneratedImage, pendingImagePath, resetWorkspaceForm, scope, selectedImagePath, selectedProjectImageAsset])

  const handleDownloadSelectedImage = useCallback(async () => {
    if (!visibleSelectedImagePath) return

    try {
      const filename = fileNameFromPath(visibleSelectedImagePath)
      const extension = fileExtensionFromPath(visibleSelectedImagePath)
      const destinationPath = await window.electronAPI.showSaveDialog({
        title: 'Scarica immagine',
        defaultPath: filename,
        filters: [
          { name: 'Immagine', extensions: [extension] },
          { name: 'Tutti i file', extensions: ['*'] },
        ],
      })
      if (!destinationPath) return

      const localFile = await window.electronAPI.readLocalFile({ filePath: visibleSelectedImagePath })
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
  }, [visibleSelectedImagePath])

  const aiButtonClass = aiState === 'approved'
    ? 'border-emerald-300/70 bg-emerald-400/15 text-emerald-200 shadow-[0_0_24px_rgba(52,211,153,0.34)]'
    : aiState === 'review'
      ? 'border-amber-300/60 bg-amber-400/15 text-amber-200 shadow-[0_0_24px_rgba(251,191,36,0.35)]'
    : aiState === 'thinking'
      ? 'border-blue-300/50 bg-blue-500/15 text-blue-100 shadow-[0_0_22px_rgba(59,130,246,0.32)]'
      : aiState === 'error'
        ? 'border-red-400/50 bg-red-500/10 text-red-200'
        : 'border-blue-400/30 bg-blue-500/10 text-blue-200 shadow-[0_0_18px_rgba(59,130,246,0.18)]'

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-zinc-950 text-white">
      <div className="flex min-h-0 flex-1 flex-col px-4 pt-4 pb-3 xl:px-5 xl:pt-5">
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
            className="group relative flex max-w-[min(calc(100vw-18rem),calc(100%-2rem))] items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-[#101113] shadow-2xl"
            style={{
              aspectRatio: selectedAspectRatio,
              height: previewHeight,
            }}
          >
            {visibleSelectedImagePath ? (
              <>
                <img src={pathToFileUrl(visibleSelectedImagePath)} alt="" className="h-full w-full rounded-2xl object-cover" />
                <button
                  type="button"
                  onClick={() => void handleDownloadSelectedImage()}
                  className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/55 text-zinc-400 opacity-0 shadow-lg backdrop-blur-sm transition-all hover:border-blue-300/50 hover:bg-blue-500/20 hover:text-white group-hover:opacity-100"
                  title="Scarica sul computer"
                >
                  <Download className="h-[18px] w-[18px]" />
                </button>
                {canCreateCharacterFromImage && (
                  <button
                    type="button"
                    onClick={() => void handleRegenerateCharacterImage()}
                    className="absolute bottom-3 left-3 inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 text-xs font-semibold text-zinc-300 opacity-0 shadow-lg backdrop-blur-sm transition-all hover:border-emerald-300/50 hover:bg-emerald-500/20 hover:text-emerald-100 group-hover:opacity-100"
                    title="Rigenera un nuovo character con lo stesso prompt"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Rigenera
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClearSelectedImage}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/60 text-zinc-300 shadow-lg backdrop-blur-sm transition-colors hover:border-red-300/50 hover:bg-red-500 hover:text-white"
                  title={scope === 'project' ? 'Elimina immagine dal progetto' : pendingImagePath && selectedImagePath === pendingImagePath ? 'Scarta immagine' : 'Chiudi immagine'}
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : !isGenerating ? (
              <div className="flex flex-col items-center justify-center px-8 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/70 xl:h-24 xl:w-24">
                  <ImageIcon className="h-9 w-9 text-zinc-600 xl:h-10 xl:w-10" />
                </div>
                <div className="text-lg font-semibold text-zinc-200">Immagine in preparazione</div>
                <div className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                  Scrivi l’idea nel box in basso, scegli formato e risoluzione, poi genera.
                </div>
              </div>
            ) : (
              null
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
                  {hasRealProgress ? (
                    <div className="h-full bg-blue-400 transition-all duration-300" style={{ width: `${Math.min(100, visibleProgress)}%` }} />
                  ) : (
                    <div className="h-full w-1/3 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-blue-400/80" />
                  )}
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  {generationProgressLabel} - Tempo di creazione {generationElapsedLabel}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full shrink-0 px-4 pb-4 xl:pb-5">
        <div className="mx-auto w-[min(880px,calc(100%-1rem))]">
        <div className="overflow-visible rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
          <div className="relative">
            <button
              type="button"
              onClick={handleAxStudioAiClick}
              disabled={aiState === 'thinking'}
              className={`absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-all ${aiButtonClass}`}
              title={aiState === 'approved' ? 'Prompt approvato: clicca per aprirlo' : aiState === 'review' ? 'Prompt da approvare: clicca per aprirlo' : 'Crea prompt con AXSTUDIO AI'}
            >
              {aiState === 'thinking'
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Sparkles className={`h-3.5 w-3.5 ${aiState === 'approved' ? 'text-emerald-200' : aiState === 'review' ? 'text-amber-200' : ''}`} />}
              AXSTUDIO AI
            </button>
            <textarea
              value={idea}
              onChange={(event) => {
                const nextValue = event.target.value
                setIdea(nextValue)
                if (promptDraft.trim()) {
                  setPromptSource('user_edited')
                  setPromptDraft('')
                  setLlmEnhancedPrompt(null)
                } else {
                  setPromptSource('manual')
                  setLlmOriginalIdea(null)
                  setLlmEnhancedPrompt(null)
                }
                if (aiState !== 'thinking') setAiState('idle')
              }}
              placeholder={isCharacterCreationMode
                ? 'Descrivi il personaggio da creare come volto master frontale...'
                : "Descrivi l'immagine che vuoi generare..."}
              className="h-[66px] w-full resize-none bg-transparent px-3 py-3 pr-36 text-sm leading-5 text-white outline-none placeholder:text-zinc-500 xl:h-[78px]"
            />
          </div>

          <div className="flex items-center gap-1.5 border-t border-zinc-800/70 px-2 py-2 text-xs text-zinc-400">
            <div className="flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap font-medium">AXSTUDIO 1.0</span>
            </div>

            <label className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-zinc-800">
              <Monitor className="h-3.5 w-3.5" />
              <select
                value={imageResolution}
                onChange={(event) => setImageResolution(event.target.value)}
                disabled={isCharacterCreationMode}
                className="bg-transparent text-zinc-300 outline-none"
              >
                <option value="1080p">1080</option>
                <option value="1440p">1440</option>
                <option value="2048p">2048</option>
                <option value="4k">4K</option>
              </select>
            </label>

            <label className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-zinc-800">
              <span className="h-3.5 w-3.5 rounded-sm border border-zinc-500" />
              <select
                value={aspectRatio}
                onChange={(event) => setAspectRatio(event.target.value as '16:9' | '9:16' | '1:1')}
                disabled={isCharacterCreationMode}
                className="bg-transparent text-zinc-300 outline-none"
              >
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
              </select>
            </label>

            {isCharacterCreationMode ? (
              <div className="inline-flex max-w-[210px] items-center gap-1.5 rounded-md bg-zinc-800/80 px-2 py-1 text-emerald-200">
                <Palette className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Character Realistico</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsStyleModalOpen(true)}
                className="inline-flex max-w-[190px] items-center gap-1.5 rounded-md px-2 py-1 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                title="Stili grafici"
              >
                <Palette className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{selectedStyle?.style_label ?? 'Stili grafici'}</span>
              </button>
            )}

            {canUseCharacterSelect && (
              <label className="flex max-w-[170px] items-center gap-1.5 rounded-md px-2 py-1 hover:bg-zinc-800">
                <UserRound className="h-3.5 w-3.5 shrink-0" />
                <select
                  value={selectedCharacterId}
                  onChange={(event) => setSelectedCharacterId(event.target.value)}
                  className="min-w-0 bg-transparent text-zinc-300 outline-none"
                  title="Personaggio"
                >
                  <option value="">No character</option>
                  {characters.map((character) => (
                    <option key={character.id} value={character.id}>{character.name}</option>
                  ))}
                </select>
              </label>
            )}

            <div className="min-w-1 flex-1" />

            {canCreateCharacterFromImage && visibleSelectedImagePath && (
              <button
                type="button"
                onClick={() => void handleRegenerateCharacterImage()}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-emerald-400/60 hover:bg-emerald-500/10 hover:text-emerald-200"
                title="Rigenera un nuovo character con lo stesso prompt"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Rigenera
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (isGenerating) {
                  handleStopGeneration()
                  return
                }
                if (pendingImagePath) {
                  if (isCharacterCreationMode) {
                    void handleCreateCharacterFromSelectedImage()
                    return
                  }
                  void handleSaveGeneratedImage()
                  return
                }
                void handleGenerate()
              }}
              disabled={isGenerating ? false : pendingImagePath ? false : !canGenerate}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                isGenerating
                  ? 'border border-zinc-600 bg-zinc-800 text-zinc-100 shadow-[0_0_18px_rgba(96,165,250,0.16)] hover:border-zinc-500 hover:bg-zinc-700'
                  : pendingImagePath || canGenerate
                  ? 'bg-white text-black hover:bg-zinc-200'
                  : 'cursor-not-allowed bg-zinc-700 text-zinc-500'
              }`}
            >
              {isGenerating ? <Square className="h-3.5 w-3.5 fill-current" /> : <Sparkles className="h-3.5 w-3.5" />}
              {isGenerating ? 'STOP' : pendingImagePath ? (isCharacterCreationMode ? 'Salva Character' : 'Salva') : isCharacterCreationMode ? 'Genera Character' : 'Genera'}
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
      </div>

      {isStyleModalOpen && (
        <div
          className="fixed inset-y-0 z-50 flex items-center justify-center bg-black/72 px-4 backdrop-blur-sm"
          style={{
            left: 'var(--ax-workspace-sidebar-width, 0px)',
            right: 'var(--ax-library-sidebar-width, 0px)',
          }}
        >
          <div
            className="flex h-[min(860px,calc(100vh-2rem))] flex-col rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"
            style={{
              width:
                'min(1280px, calc(100vw - var(--ax-workspace-sidebar-width, 0px) - var(--ax-library-sidebar-width, 0px) - 2rem))',
            }}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
              <div>
                <div className="flex items-center gap-2 text-lg font-semibold text-white">
                  Stili grafici
                  <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                    {IMAGE_STYLE_PRESETS.length}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  Scegli lo stile visivo da applicare alla prossima immagine AXSTUDIO.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStyleModalOpen(false)}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pr-3">
              {(Object.keys(IMAGE_STYLE_CATEGORY_LABELS) as ImageStyleCategory[]).map((category) => {
                const styles = groupedStyles[category] ?? []
                if (styles.length === 0) return null

                return (
                  <section key={category} className="mb-5 last:mb-0">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      {IMAGE_STYLE_CATEGORY_LABELS[category]}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {styles.map((style) => (
                        <button
                          key={style.style_id}
                          type="button"
                          onClick={() => {
                            setSelectedStyleId(style.style_id)
                            setIsStyleModalOpen(false)
                          }}
                          className={`group overflow-hidden rounded-lg border bg-zinc-900 text-left transition-all hover:-translate-y-0.5 hover:border-zinc-500 ${
                            selectedStyleId === style.style_id
                              ? 'border-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.55)]'
                              : 'border-zinc-800'
                          }`}
                        >
                          <div className="relative aspect-[16/10] overflow-hidden bg-zinc-950">
                            <img
                              src={style.preview_image}
                              alt=""
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                            {selectedStyleId === style.style_id && (
                              <div className="absolute right-2 top-2 rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-semibold text-black">
                                Attivo
                              </div>
                            )}
                          </div>
                          <div className="p-2.5">
                            <div className="truncate text-xs font-semibold text-zinc-100">{style.style_label}</div>
                            <div className="mt-0.5 line-clamp-1 text-[10px] leading-4 text-zinc-500">
                              {style.style_prompt_modifier}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {isPromptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 px-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <div className="text-lg font-semibold text-white">Prompt AXSTUDIO AI</div>
                <div className="text-xs text-zinc-500">Leggi, modifica, approva oppure rigenera.</div>
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
                onChange={(event) => {
                  setPromptDraft(event.target.value)
                  setPromptSource('user_edited')
                  setLlmEnhancedPrompt(null)
                  if (aiState === 'approved') setAiState('review')
                }}
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
                Rigenera
              </button>
              <button
                type="button"
                onClick={handleApproveAxStudioPrompt}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
