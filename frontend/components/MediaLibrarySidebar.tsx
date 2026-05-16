import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, Check, Folder, Grid2X2, Grid3X3, Maximize2, Pencil, Trash2, UserRound, Video, X } from 'lucide-react'
import { useProjects } from '../contexts/ProjectContext'
import { pathToFileUrl } from '../lib/file-url'
import {
  CHARACTER_DELETED_EVENT,
  CHARACTER_OPEN_EVENT,
  CHARACTER_UPDATED_EVENT,
  deleteCharacter,
  readCharacters,
  updateCharacterName,
  type SavedCharacter,
} from '../lib/character-storage'
import { GALLERY_UPDATED_EVENT, readImageGallery, writeImageGallery, type SavedGalleryImage } from '../lib/image-gallery-storage'
import type { Asset } from '../types/project-model'

type MediaLibraryKind = 'characters' | 'videos'
type DateFilter = 'all' | 'today' | 'week' | 'month'
type LibraryColumns = 2 | 3

function isInsideDateFilter(timestamp: number, filter: DateFilter): boolean {
  if (filter === 'all') return true
  const age = Date.now() - timestamp
  if (filter === 'today') return age <= 24 * 60 * 60 * 1000
  if (filter === 'week') return age <= 7 * 24 * 60 * 60 * 1000
  return age <= 30 * 24 * 60 * 60 * 1000
}

function isVideoAsset(asset: Asset): boolean {
  return asset.type === 'video'
}

function normalizedText(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

function collectGalleryCharacterRef(
  item: SavedGalleryImage,
  usedCharacterIds: Set<string>,
  usedCharacterNames: Set<string>,
): void {
  const characterId = item.characterId?.trim()
  const characterName = normalizedText(item.characterName)
  if (characterId) usedCharacterIds.add(characterId)
  if (characterName) usedCharacterNames.add(characterName)
}

export function MediaLibrarySidebar({
  kind,
  open,
  onClose,
  projectId,
}: {
  kind: MediaLibraryKind
  open: boolean
  onClose: () => void
  projectId?: string | null
}) {
  const { projectIds, getProject, updateAsset } = useProjects()
  const [characters, setCharacters] = useState<SavedCharacter[]>(() => readCharacters())
  const [galleryItems, setGalleryItems] = useState<SavedGalleryImage[]>(() => readImageGallery())
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [columns, setColumns] = useState<LibraryColumns>(2)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [renamingCharacterId, setRenamingCharacterId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')

  useEffect(() => {
    const refresh = () => setCharacters(readCharacters())
    window.addEventListener(CHARACTER_UPDATED_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(CHARACTER_UPDATED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  useEffect(() => {
    const refresh = () => setGalleryItems(readImageGallery())
    window.addEventListener(GALLERY_UPDATED_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(GALLERY_UPDATED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const projectOptions = useMemo(() => (
    projectIds
      .map((id) => getProject(id))
      .filter((project): project is NonNullable<typeof project> => Boolean(project))
      .map((project) => [project.id, project.name] as const)
  ), [getProject, projectIds])
  const scopedProject = projectId ? getProject(projectId) : null
  const sourceProjectIds = projectId ? [projectId] : projectIds

  const videoItems = useMemo(() => (
    sourceProjectIds.flatMap((sourceProjectId) => {
      const project = getProject(sourceProjectId)
      if (!project) return []
      return project.assets
        .filter(isVideoAsset)
        .map((asset) => ({ asset, projectId: project.id, projectName: project.name }))
    }).filter((item) => (
      isInsideDateFilter(item.asset.createdAt, dateFilter)
      && (projectId ? item.projectId === projectId : projectFilter === 'all' || item.projectId === projectFilter)
    ))
  ), [dateFilter, getProject, projectFilter, projectId, sourceProjectIds])

  const characterItems = useMemo(() => {
    if (!projectId && projectFilter === 'all') {
      return characters.filter((character) => isInsideDateFilter(character.createdAt, dateFilter))
    }

    const usedCharacterIds = new Set<string>()
    const usedCharacterNames = new Set<string>()
    const linkedPromptKeys = new Set<string>()
    const linkedProjectIds = new Set<string>()

    for (const sourceProjectId of sourceProjectIds) {
      const project = getProject(sourceProjectId)
      if (!project) continue
      if (!projectId && projectFilter !== 'all' && sourceProjectId !== projectFilter) continue
      linkedProjectIds.add(project.id)
      for (const asset of project.assets) {
        const characterId = asset.generationParams?.imageCharacterId?.trim()
        const characterName = normalizedText(asset.generationParams?.imageCharacterName)
        const promptKey = normalizedText(asset.prompt)
        if (characterId) usedCharacterIds.add(characterId)
        if (characterName) usedCharacterNames.add(characterName)
        if (promptKey) linkedPromptKeys.add(promptKey)
      }
    }

    for (const item of galleryItems) {
      const itemPromptKey = normalizedText(item.prompt)
      if (
        (item.projectId && linkedProjectIds.has(item.projectId))
        || (itemPromptKey && linkedPromptKeys.has(itemPromptKey))
      ) {
        collectGalleryCharacterRef(item, usedCharacterIds, usedCharacterNames)
      }
    }

    return characters.filter((character) => (
      isInsideDateFilter(character.createdAt, dateFilter)
      && (
        usedCharacterIds.has(character.id)
        || usedCharacterNames.has(normalizedText(character.name))
        || usedCharacterNames.has(normalizedText(character.code))
      )
    ))
  }, [characters, dateFilter, galleryItems, getProject, projectFilter, projectId, sourceProjectIds])

  const title = kind === 'characters' ? 'Personaggi' : 'Video'
  const subtitle = scopedProject
    ? `${kind === 'characters' ? 'Character' : 'Video'} di ${scopedProject.name}`
    : kind === 'characters' ? 'Character creati in AXSTUDIO' : 'Video generati in AXSTUDIO'
  const Icon = kind === 'characters' ? UserRound : Video
  const emptyText = kind === 'characters'
    ? projectId || projectFilter !== 'all' ? 'Nessun personaggio collegato a questo progetto.' : 'Nessun personaggio salvato.'
    : 'Nessun video salvato in questo progetto.'
  const isEmpty = kind === 'characters' ? characterItems.length === 0 : videoItems.length === 0
  const selectedCharacters = useMemo(() => (
    characterItems.filter((character) => selectedIds.has(character.id))
  ), [characterItems, selectedIds])

  useEffect(() => {
    setSelectedIds((prev) => {
      const visibleIds = new Set(characterItems.map((character) => character.id))
      const next = new Set([...prev].filter((id) => visibleIds.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [characterItems])

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const openSelectedCharacter = () => {
    const [character] = selectedCharacters
    if (!character) return
    window.dispatchEvent(new CustomEvent(CHARACTER_OPEN_EVENT, { detail: { character } }))
  }

  const startRenameCharacter = (character: SavedCharacter) => {
    setSelectedIds(new Set([character.id]))
    setRenamingCharacterId(character.id)
    setRenameDraft(character.name)
  }

  const commitRenameCharacter = () => {
    if (!renamingCharacterId) return
    const updated = updateCharacterName(renamingCharacterId, renameDraft)
    setRenamingCharacterId(null)
    setRenameDraft('')
    if (!updated) return
    const nextCharacters = readCharacters()
    setCharacters(nextCharacters)
    const nextGalleryItems = readImageGallery().map((item) => (
      item.characterId === updated.id
        ? { ...item, characterName: updated.name }
        : item
    ))
    writeImageGallery(nextGalleryItems)
    for (const sourceProjectId of projectIds) {
      const project = getProject(sourceProjectId)
      if (!project) continue
      for (const asset of project.assets) {
        const generationParams = asset.generationParams
        if (!generationParams || generationParams.imageCharacterId !== updated.id) continue
        updateAsset(sourceProjectId, asset.id, {
          generationParams: {
            ...generationParams,
            imageCharacterName: updated.name,
          },
        })
      }
    }
    window.dispatchEvent(new CustomEvent(CHARACTER_OPEN_EVENT, { detail: { character: updated } }))
  }

  const cancelRenameCharacter = () => {
    setRenamingCharacterId(null)
    setRenameDraft('')
  }

  const closeDeleteConfirm = () => {
    if (isDeleting) return
    setIsDeleteConfirmOpen(false)
    setDeleteError('')
  }

  const confirmDeleteCharacters = async () => {
    if (selectedCharacters.length === 0) return
    setIsDeleting(true)
    setDeleteError('')

    const selectedIdSet = new Set(selectedCharacters.map((character) => character.id))
    const selectedNameSet = new Set(selectedCharacters.map((character) => normalizedText(character.name)).filter(Boolean))
    const selectedCodeSet = new Set(selectedCharacters.map((character) => normalizedText(character.code)).filter(Boolean))
    const protectedImagePaths = new Set<string>()
    for (const item of readImageGallery()) {
      if (item.path) protectedImagePaths.add(item.path)
    }
    for (const sourceProjectId of projectIds) {
      const project = getProject(sourceProjectId)
      if (!project) continue
      for (const asset of project.assets) {
        if (asset.type !== 'image') continue
        for (const filePath of [
          asset.path,
          asset.bigThumbnailPath,
          asset.smallThumbnailPath,
          ...(asset.takes ?? []).flatMap((take) => [
            take.path,
            take.bigThumbnailPath,
            take.smallThumbnailPath,
          ]),
        ]) {
          if (filePath) protectedImagePaths.add(filePath)
        }
      }
    }
    const selectedCharacterPaths = selectedCharacters.map((character) => character.imagePath).filter(Boolean)
    const filePaths = selectedCharacterPaths.filter((filePath) => !protectedImagePaths.has(filePath))

    if (filePaths.length > 0) {
      const result = await window.electronAPI.deleteProjectAssetFiles({ filePaths })
      if (!result.success) {
        setDeleteError('Non sono riuscito a cancellare i file locali dei personaggi. Riprova.')
        setIsDeleting(false)
        return
      }
    }

    for (const character of selectedCharacters) {
      deleteCharacter(character.id)
    }

    for (const sourceProjectId of projectIds) {
      const project = getProject(sourceProjectId)
      if (!project) continue
      for (const asset of project.assets) {
        const generationParams = asset.generationParams
        if (!generationParams) continue
        const characterId = generationParams.imageCharacterId?.trim()
        const characterName = normalizedText(generationParams.imageCharacterName)
        const shouldClear = (
          (characterId && selectedIdSet.has(characterId))
          || (characterName && selectedNameSet.has(characterName))
          || (characterName && selectedCodeSet.has(characterName))
        )
        if (!shouldClear) continue
        updateAsset(sourceProjectId, asset.id, {
          generationParams: {
            ...generationParams,
            imageCharacterId: null,
            imageCharacterName: null,
            imageCharacterImagePath: null,
          },
        })
      }
    }

    window.dispatchEvent(new CustomEvent(CHARACTER_DELETED_EVENT, {
      detail: {
        ids: [...selectedIdSet],
        paths: selectedCharacterPaths,
      },
    }))
    setCharacters(readCharacters())
    setSelectedIds(new Set())
    setIsDeleting(false)
    setIsDeleteConfirmOpen(false)
  }

  return (
    <aside
      className={`fixed inset-y-0 right-0 z-50 w-[380px] border-l border-zinc-800 bg-zinc-950 text-white shadow-2xl transition-transform duration-300 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex h-24 shrink-0 items-center justify-between border-b border-zinc-800 px-5">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Icon className="h-5 w-5 text-blue-300" />
              {title}
            </div>
            <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="shrink-0 space-y-3 border-b border-zinc-900 px-4 py-4">
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-zinc-500">
              <CalendarDays className="h-3.5 w-3.5" />
              Data
            </span>
            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value as DateFilter)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-3 pr-9 text-sm text-zinc-200 outline-none"
            >
              <option value="all">Tutte</option>
              <option value="today">Ultime 24 ore</option>
              <option value="week">Ultimi 7 giorni</option>
              <option value="month">Ultimi 30 giorni</option>
            </select>
          </label>

          {projectId ? (
            <div className="block">
              <span className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-zinc-500">
                <Folder className="h-3.5 w-3.5" />
                Progetto
              </span>
              <div className="truncate rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
                {scopedProject?.name ?? 'Progetto'}
              </div>
            </div>
          ) : (
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-zinc-500">
                <Folder className="h-3.5 w-3.5" />
                Progetto
              </span>
              <select
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-3 pr-9 text-sm text-zinc-200 outline-none"
              >
                <option value="all">Tutti</option>
                {projectOptions.map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </label>
          )}

          {kind === 'characters' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">{characterItems.length} personaggi</span>
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsDeleteConfirmOpen(true)}
                      className="group flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-200 transition-colors hover:border-red-400/40 hover:bg-red-500/20 hover:text-red-100"
                      title="Elimina personaggi selezionati"
                      aria-label={`Elimina ${selectedIds.size} personaggi selezionati`}
                    >
                      <span>{selectedIds.size}</span>
                      <Trash2 className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                    </button>
                    <button
                      type="button"
                      onClick={openSelectedCharacter}
                      disabled={selectedCharacters.length !== 1}
                      className="group flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700/70 bg-zinc-900 text-zinc-300 transition-colors hover:border-zinc-500 hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-950 disabled:text-zinc-700"
                      title={selectedCharacters.length === 1 ? 'Apri nel box' : 'Seleziona un solo personaggio da aprire'}
                      aria-label="Apri personaggio selezionato nel box"
                    >
                      <Maximize2 className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-zinc-900 p-1">
                <button
                  type="button"
                  onClick={() => setColumns(2)}
                  className={`rounded-md p-1.5 ${columns === 2 ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}
                  title="Due colonne"
                >
                  <Grid2X2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setColumns(3)}
                  className={`rounded-md p-1.5 ${columns === 3 ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}
                  title="Tre colonne"
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {isEmpty ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-zinc-600">
              {emptyText}
            </div>
          ) : kind === 'characters' ? (
            <div className={`grid gap-2 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {characterItems.map((character) => (
                <button
                  key={character.id}
                  type="button"
                  onClick={() => toggleSelection(character.id)}
                  className={`group relative overflow-hidden rounded-lg border bg-zinc-900 text-left transition-colors ${
                    selectedIds.has(character.id)
                      ? 'border-blue-400 ring-1 ring-blue-400/60'
                      : 'border-zinc-800 hover:border-zinc-600'
                  }`}
                  title={character.description || character.identityPrompt}
                >
                  <div className="aspect-square bg-zinc-950">
                    <img
                      src={pathToFileUrl(character.imagePath)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border text-white transition-opacity ${
                    selectedIds.has(character.id)
                      ? 'border-blue-300 bg-blue-500'
                      : 'border-white/20 bg-black/60 opacity-0 group-hover:opacity-100'
                  }`}>
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <div className="p-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {renamingCharacterId === character.id ? (
                        <input
                          value={renameDraft}
                          autoFocus
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => setRenameDraft(event.target.value)}
                          onBlur={commitRenameCharacter}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              commitRenameCharacter()
                            }
                            if (event.key === 'Escape') {
                              event.preventDefault()
                              cancelRenameCharacter()
                            }
                          }}
                          className="min-w-0 flex-1 rounded-md border border-blue-400/60 bg-zinc-950 px-1.5 py-0.5 text-[11px] text-white outline-none"
                        />
                      ) : (
                        <>
                          <div className="min-w-0 flex-1 truncate text-[11px] text-zinc-300">{character.name}</div>
                          {selectedIds.has(character.id) && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                startRenameCharacter(character)
                              }}
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-white"
                              title="Modifica nome"
                              aria-label={`Modifica nome di ${character.name}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-[10px] text-zinc-600">{character.code}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {videoItems.map(({ asset, projectName }) => (
                <div key={asset.id} className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                  <div className="aspect-square bg-zinc-950">
                    {asset.smallThumbnailPath || asset.bigThumbnailPath ? (
                      <img
                        src={pathToFileUrl(asset.smallThumbnailPath || asset.bigThumbnailPath || asset.path)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-zinc-600">
                        <Video className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <div className="truncate text-[11px] text-zinc-300">{projectName}</div>
                    <div className="mt-0.5 truncate text-[10px] text-zinc-600">{asset.resolution}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {kind === 'characters' && isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="flex items-start gap-3 border-b border-zinc-800 px-5 py-4">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-400/30 bg-red-500/10 text-red-200">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-white">Elimina personaggi</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Verranno eliminati {selectedCharacters.length} personaggi dalla libreria.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={isDeleting}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid max-h-40 grid-cols-5 gap-2 overflow-y-auto">
                {selectedCharacters.slice(0, 15).map((character) => (
                  <div key={character.id} className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                    <img src={pathToFileUrl(character.imagePath)} alt="" className="aspect-square w-full object-cover" />
                  </div>
                ))}
              </div>
              {selectedCharacters.length > 15 && (
                <p className="text-xs text-zinc-500">+{selectedCharacters.length - 15} altri personaggi</p>
              )}
              <p className="text-sm text-zinc-400">
                Le immagini dei character verranno rimosse dallo storage locale e i riferimenti nei progetti verranno svuotati.
              </p>
              {deleteError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {deleteError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-zinc-800 px-5 py-4">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={isDeleting}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteCharacters()}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:cursor-wait disabled:opacity-70"
              >
                {isDeleting ? 'Elimino...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
