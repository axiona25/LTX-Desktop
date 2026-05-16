import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { AlertTriangle, CalendarDays, Check, Folder, FolderPlus, Grid2X2, Grid3X3, Images, Layers, Loader2, Maximize2, Trash2, X } from 'lucide-react'
import { useProjects } from '../contexts/ProjectContext'
import { GALLERY_DRAG_MIME, GALLERY_OPEN_IMAGE_EVENT, GALLERY_UPDATED_EVENT, readImageGallery, writeImageGallery, type SavedGalleryImage } from '../lib/image-gallery-storage'
import { readCharacters } from '../lib/character-storage'
import { pathToFileUrl } from '../lib/file-url'
import { addVisualAssetToProject } from '../lib/asset-copy'
import { Tooltip } from './ui/tooltip'

type GalleryDateFilter = 'all' | 'today' | 'week' | 'month'
type GalleryColumns = 2 | 3

interface GalleryProjectLink {
  id: string
  name: string
}

function isInsideDateFilter(timestamp: number, filter: GalleryDateFilter): boolean {
  if (filter === 'all') return true
  const now = Date.now()
  const age = now - timestamp
  if (filter === 'today') return age <= 24 * 60 * 60 * 1000
  if (filter === 'week') return age <= 7 * 24 * 60 * 60 * 1000
  return age <= 30 * 24 * 60 * 60 * 1000
}

function galleryFamilyKey(item: SavedGalleryImage): string {
  const prompt = item.prompt.trim().toLowerCase()
  if (prompt) return `prompt:${prompt}`
  return `path:${item.path}`
}

export function ImageGallerySidebar({
  open,
  onClose,
  projectId,
}: {
  open: boolean
  onClose: () => void
  projectId?: string | null
}) {
  const { projectIds, getProject, addAsset, deleteAsset } = useProjects()
  const [items, setItems] = useState<SavedGalleryImage[]>(() => readImageGallery())
  const [dateFilter, setDateFilter] = useState<GalleryDateFilter>('all')
  const [styleFilter, setStyleFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [columns, setColumns] = useState<GalleryColumns>(2)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isAssignProjectOpen, setIsAssignProjectOpen] = useState(false)
  const [assignProjectId, setAssignProjectId] = useState('')
  const [assignError, setAssignError] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const refresh = () => setItems(readImageGallery())
    window.addEventListener(GALLERY_UPDATED_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(GALLERY_UPDATED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const styleOptions = useMemo(() => (
    [...new Set(items.map((item) => item.style).filter(Boolean))]
  ), [items])

  const projectOptions = useMemo(() => (
    projectIds
      .map((id) => getProject(id))
      .filter((project): project is NonNullable<typeof project> => Boolean(project))
      .map((project) => [project.id, project.name] as const)
  ), [getProject, projectIds])
  const scopedProject = projectId ? getProject(projectId) : null

  const projectImageItems = useMemo(() => (
    projectIds.flatMap((projectId) => {
      const project = getProject(projectId)
      if (!project) return []

      return project.assets
        .filter((asset) => asset.type === 'image')
        .map((asset): SavedGalleryImage => ({
          id: `project-image-${project.id}-${asset.id}`,
          code: '',
          path: asset.path,
          prompt: asset.prompt,
          createdAt: asset.createdAt,
          model: asset.generationParams?.model ?? 'AXSTUDIO 1.0',
          style: asset.generationParams?.model ?? 'AXSTUDIO 1.0',
          aspectRatio: asset.generationParams?.imageAspectRatio ?? '16:9',
          resolution: asset.resolution,
          projectId: project.id,
          projectName: project.name,
          projectAssetId: asset.id,
          characterId: asset.generationParams?.imageCharacterId ?? null,
          characterName: asset.generationParams?.imageCharacterName ?? null,
        }))
    })
  ), [getProject, projectIds])

  const combinedItems = useMemo(() => {
    const byPath = new Map<string, SavedGalleryImage>()
    for (const item of [...projectImageItems, ...items]) {
      const existing = byPath.get(item.path)
      byPath.set(item.path, existing ? { ...existing, ...item, code: existing.code || item.code } : item)
    }
    return [...byPath.values()]
  }, [items, projectImageItems])

  const projectLinksByFamilyKey = useMemo(() => {
    const links = new Map<string, Map<string, GalleryProjectLink>>()
    for (const item of combinedItems) {
      if (!item.projectId) continue
      const name = item.projectName || getProject(item.projectId)?.name || 'Progetto'
      const key = galleryFamilyKey(item)
      const existing = links.get(key) ?? new Map<string, GalleryProjectLink>()
      existing.set(item.projectId, { id: item.projectId, name })
      links.set(key, existing)
    }
    return new Map([...links.entries()].map(([key, value]) => [key, [...value.values()]]))
  }, [combinedItems, getProject])

  const filteredItems = useMemo(() => (
    combinedItems.filter((item) => (
      isInsideDateFilter(item.createdAt, dateFilter)
      && (styleFilter === 'all' || item.style === styleFilter)
      && (projectId ? item.projectId === projectId : projectFilter === 'all' || item.projectId === projectFilter)
    ))
  ), [combinedItems, dateFilter, projectFilter, projectId, styleFilter])

  const selectedItems = useMemo(() => (
    combinedItems.filter((item) => selectedIds.has(item.id))
  ), [combinedItems, selectedIds])

  const assignableProjectOptions = useMemo(() => (
    projectOptions.filter(([projectOptionId]) => (
      selectedItems.every((item) => {
        const linkedProjects = projectLinksByFamilyKey.get(galleryFamilyKey(item)) ?? []
        return !linkedProjects.some((project) => project.id === projectOptionId)
      })
    ))
  ), [projectLinksByFamilyKey, projectOptions, selectedItems])

  const canOpenAssignProject = selectedItems.length > 0 && projectOptions.length > 0

  useEffect(() => {
    if (assignableProjectOptions.length === 0) {
      setAssignProjectId('')
      return
    }
    if (!assignableProjectOptions.some(([id]) => id === assignProjectId)) {
      setAssignProjectId(assignableProjectOptions[0][0])
    }
  }, [assignProjectId, assignableProjectOptions])

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

  const startGalleryDrag = (event: DragEvent<HTMLButtonElement>, item: SavedGalleryImage) => {
    const dragItems = selectedIds.has(item.id) && selectedItems.length > 0 ? selectedItems : [item]
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData(GALLERY_DRAG_MIME, JSON.stringify(dragItems))
  }

  const closeDeleteConfirm = () => {
    if (isDeleting) return
    setIsDeleteConfirmOpen(false)
    setDeleteError('')
  }

  const closeAssignProject = () => {
    if (isAssigning) return
    setIsAssignProjectOpen(false)
    setAssignError('')
  }

  const openSelectedFullscreen = () => {
    const [item] = selectedItems
    if (!item) return
    window.dispatchEvent(new CustomEvent(GALLERY_OPEN_IMAGE_EVENT, { detail: { path: item.path } }))
  }

  const openAssignProject = () => {
    if (!canOpenAssignProject) return
    setAssignError('')
    setAssignProjectId(assignableProjectOptions[0]?.[0] ?? '')
    setIsAssignProjectOpen(true)
  }

  const confirmAssignToProject = async () => {
    if (!assignProjectId || selectedItems.length === 0) return
    if (!assignableProjectOptions.some(([id]) => id === assignProjectId)) {
      setAssignError('Questo elemento è già assegnato al progetto selezionato.')
      return
    }
    const project = getProject(assignProjectId)
    if (!project) {
      setAssignError('Progetto non disponibile.')
      return
    }

    setIsAssigning(true)
    setAssignError('')

    const galleryUpdates = new Map<string, Partial<SavedGalleryImage>>()

    for (const item of selectedItems) {
      const copied = await addVisualAssetToProject(item.path, assignProjectId, 'image')
      if (!copied) {
        setAssignError('Non sono riuscito ad assegnare una o più immagini al progetto.')
        setIsAssigning(false)
        return
      }

      const asset = addAsset(assignProjectId, {
        type: 'image',
        path: copied.path,
        bigThumbnailPath: copied.bigThumbnailPath,
        smallThumbnailPath: copied.smallThumbnailPath,
        width: copied.width,
        height: copied.height,
        prompt: item.prompt,
        resolution: item.resolution,
        generationParams: {
          mode: 'text-to-image',
          prompt: item.prompt,
          model: item.model,
          duration: 5,
          resolution: item.resolution,
          fps: 24,
          audio: false,
          cameraMotion: 'none',
          imageAspectRatio: item.aspectRatio,
          imageCharacterId: item.characterId ?? null,
          imageCharacterName: item.characterName ?? null,
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

      const update: Partial<SavedGalleryImage> = {
        path: copied.path,
        projectId: project.id,
        projectName: project.name,
        projectAssetId: asset.id,
        characterId: item.characterId ?? null,
        characterName: item.characterName ?? null,
      }
      galleryUpdates.set(item.id, update)
      galleryUpdates.set(item.path, update)
    }

    const nextGalleryItems = readImageGallery().map((item) => {
      const update = galleryUpdates.get(item.id) ?? galleryUpdates.get(item.path)
      return update ? { ...item, ...update } : item
    })
    writeImageGallery(nextGalleryItems)
    setItems(nextGalleryItems)
    setSelectedIds(new Set())
    setIsAssigning(false)
    setIsAssignProjectOpen(false)
  }

  const confirmDeleteSelection = async () => {
    if (selectedItems.length === 0) return

    setIsDeleting(true)
    setDeleteError('')

    const selectedPaths = new Set(selectedItems.map((item) => item.path))
    const projectAssetTargetsByKey = new Map<string, { projectId: string; assetId: string }>()
    for (const item of selectedItems) {
      const candidateProjectIds = item.projectId ? [item.projectId] : projectIds
      for (const candidateProjectId of candidateProjectIds) {
        const project = getProject(candidateProjectId)
        if (!project) continue
        const asset = item.projectAssetId
          ? project.assets.find((candidate) => candidate.id === item.projectAssetId)
          : project.assets.find((candidate) => (
            candidate.path === item.path
            || candidate.bigThumbnailPath === item.path
            || candidate.smallThumbnailPath === item.path
            || candidate.takes?.some((take) => (
              take.path === item.path
              || take.bigThumbnailPath === item.path
              || take.smallThumbnailPath === item.path
            ))
          ))
        if (!asset) continue
        projectAssetTargetsByKey.set(`${project.id}:${asset.id}`, { projectId: project.id, assetId: asset.id })
      }
    }
    const projectAssetTargets = [...projectAssetTargetsByKey.values()]

    const filePaths = [
      ...selectedPaths,
      ...projectAssetTargets.flatMap(({ projectId, assetId }) => {
      const project = getProject(projectId)
      const asset = project?.assets.find((candidate) => candidate.id === assetId)
      if (!asset) return []
      return [
        asset.path,
        asset.bigThumbnailPath,
        asset.smallThumbnailPath,
        ...(asset.takes ?? []).flatMap((take) => [
          take.path,
          take.bigThumbnailPath,
          take.smallThumbnailPath,
        ]),
      ].filter((path): path is string => Boolean(path))
      }),
    ]

    const characterImagePaths = new Set(readCharacters().map((character) => character.imagePath).filter(Boolean))
    const deletableFilePaths = filePaths.filter((filePath) => !characterImagePaths.has(filePath))

    if (deletableFilePaths.length > 0) {
      const result = await window.electronAPI.deleteProjectAssetFiles({ filePaths: deletableFilePaths })
      if (!result.success) {
        setDeleteError('Non sono riuscito a cancellare i file locali. Riprova.')
        setIsDeleting(false)
        return
      }
    }

    const nextGalleryItems = readImageGallery().filter((item) => !selectedIds.has(item.id) && !selectedPaths.has(item.path))
    writeImageGallery(nextGalleryItems)
    setItems(nextGalleryItems)
    for (const { projectId, assetId } of projectAssetTargets) {
      deleteAsset(projectId, assetId)
    }
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
              <Images className="h-5 w-5 text-blue-300" />
              Galleria
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {scopedProject ? `Immagini di ${scopedProject.name}` : 'Immagini salvate in AXSTUDIO'}
            </p>
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
              onChange={(event) => setDateFilter(event.target.value as GalleryDateFilter)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-3 pr-9 text-sm text-zinc-200 outline-none"
            >
              <option value="all">Tutte</option>
              <option value="today">Ultime 24 ore</option>
              <option value="week">Ultimi 7 giorni</option>
              <option value="month">Ultimi 30 giorni</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[11px] uppercase tracking-wide text-zinc-500">Stile</span>
              <select
                value={styleFilter}
                onChange={(event) => setStyleFilter(event.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-2 pr-9 text-sm text-zinc-200 outline-none"
              >
                <option value="all">Tutti</option>
                {styleOptions.map((style) => (
                  <option key={style} value={style}>{style}</option>
                ))}
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
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-2 pr-9 text-sm text-zinc-200 outline-none"
                >
                  <option value="all">Tutti</option>
                  {projectOptions.map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">{filteredItems.length} immagini</span>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="group flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-200 transition-colors hover:border-red-400/40 hover:bg-red-500/20 hover:text-red-100"
                    title="Elimina immagini selezionate"
                    aria-label={`Elimina ${selectedIds.size} immagini selezionate`}
                  >
                    <span>{selectedIds.size}</span>
                    <Trash2 className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                  </button>
                  <button
                    type="button"
                    onClick={openSelectedFullscreen}
                    className="group flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700/70 bg-zinc-900 text-zinc-300 transition-colors hover:border-zinc-500 hover:bg-zinc-800 hover:text-white"
                    title="Apri a tutto schermo"
                    aria-label="Apri immagine selezionata a tutto schermo"
                  >
                    <Maximize2 className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                  </button>
                  <button
                    type="button"
                    onClick={openAssignProject}
                    disabled={!canOpenAssignProject}
                    className="group flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700/70 bg-zinc-900 text-zinc-300 transition-colors hover:border-zinc-500 hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-950 disabled:text-zinc-700"
                    title={
                      projectOptions.length === 0
                        ? 'Crea almeno un progetto per assegnare l’immagine'
                        : assignableProjectOptions.length === 0
                          ? 'Già assegnata a tutti i progetti disponibili'
                          : 'Assegna a un progetto'
                    }
                    aria-label="Assegna immagine selezionata a un progetto"
                  >
                    <FolderPlus className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
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
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {filteredItems.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-zinc-600">
              Nessuna immagine salvata.
            </div>
          ) : (
            <div className={`grid gap-2 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {filteredItems.map((item) => {
                const projectLinks = projectLinksByFamilyKey.get(galleryFamilyKey(item)) ?? []
                return (
                  <button
                    key={item.id}
                    type="button"
                    draggable
                    onClick={() => toggleSelection(item.id)}
                    onDragStart={(event) => startGalleryDrag(event, item)}
                    className={`group relative overflow-hidden rounded-lg border bg-zinc-900 text-left transition-colors ${
                      selectedIds.has(item.id)
                        ? 'border-blue-400 ring-1 ring-blue-400/60'
                        : 'border-zinc-800 hover:border-zinc-600'
                    }`}
                    title={item.prompt}
                  >
                    <img src={pathToFileUrl(item.path)} alt="" className="aspect-square w-full object-cover" />
                    <span className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border text-white transition-opacity ${
                      selectedIds.has(item.id)
                        ? 'border-blue-300 bg-blue-500'
                        : 'border-white/20 bg-black/60 opacity-0 group-hover:opacity-100'
                    }`}>
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <div className="p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-[11px] font-semibold text-zinc-200">{item.code}</div>
                        <Tooltip
                          side="left"
                          content={(
                            <div className="max-w-56 text-left">
                              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Progetti assegnati</div>
                              {projectLinks.length > 0 ? (
                                <div className="space-y-0.5">
                                  {projectLinks.map((project) => (
                                    <div key={project.id} className="truncate text-xs text-zinc-100">{project.name}</div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-zinc-500">Nessun progetto</div>
                              )}
                            </div>
                          )}
                        >
                          <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-md border border-zinc-700 bg-zinc-950 text-zinc-400 transition-colors hover:border-blue-400/50 hover:text-blue-200">
                            <Layers className="h-3.5 w-3.5" />
                            {projectLinks.length > 0 && (
                              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[9px] font-bold leading-none text-white">
                                {projectLinks.length}
                              </span>
                            )}
                          </span>
                        </Tooltip>
                      </div>
                      <div className="mt-0.5 truncate text-[10px] text-zinc-600">{item.style}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {isAssignProjectOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="flex items-start gap-3 border-b border-zinc-800 px-5 py-4">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/10 text-blue-200">
                <FolderPlus className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-white">Assegna a un progetto</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Seleziona il progetto in cui salvare {selectedItems.length} immagini.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAssignProject}
                disabled={isAssigning}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid max-h-40 grid-cols-5 gap-2 overflow-y-auto">
                {selectedItems.slice(0, 15).map((item) => (
                  <div key={item.id} className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                    <img src={pathToFileUrl(item.path)} alt="" className="aspect-square w-full object-cover" />
                  </div>
                ))}
              </div>

              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-wide text-zinc-500">Progetto / cartella</span>
                {assignableProjectOptions.length > 0 ? (
                  <select
                    value={assignProjectId}
                    onChange={(event) => setAssignProjectId(event.target.value)}
                    disabled={isAssigning}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-3 pr-9 text-sm text-zinc-200 outline-none disabled:opacity-50"
                  >
                    {assignableProjectOptions.map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-500">
                    Nessun progetto disponibile: la selezione è già stata assegnata.
                  </div>
                )}
              </label>

              {assignError && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {assignError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-zinc-800 px-5 py-4">
              <button
                type="button"
                onClick={closeAssignProject}
                disabled={isAssigning}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => void confirmAssignToProject()}
                disabled={isAssigning || !assignProjectId}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
                {isAssigning ? 'Assegnazione...' : 'Assegna'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="flex items-start gap-3 border-b border-zinc-800 px-5 py-4">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-200">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-white">Eliminare le immagini?</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Verranno eliminate {selectedItems.length} immagini selezionate dalla galleria.
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

            <div className="p-5">
              <div className="grid max-h-48 grid-cols-4 gap-2 overflow-y-auto">
                {selectedItems.slice(0, 12).map((item) => (
                  <div key={item.id} className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                    <img src={pathToFileUrl(item.path)} alt="" className="aspect-square w-full object-cover" />
                  </div>
                ))}
              </div>
              {selectedItems.length > 12 && (
                <p className="mt-2 text-xs text-zinc-500">+{selectedItems.length - 12} altre immagini</p>
              )}
              {selectedItems.some((item) => item.projectId && item.projectAssetId) && (
                <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  Alcune immagini appartengono a un progetto: verranno rimossi anche gli asset locali collegati.
                </p>
              )}
              {deleteError && (
                <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {deleteError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-zinc-800 px-5 py-4">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={isDeleting}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteSelection()}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Eliminazione...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
