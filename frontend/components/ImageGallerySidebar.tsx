import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { CalendarDays, Check, Folder, Grid2X2, Grid3X3, Images, X } from 'lucide-react'
import { useProjects } from '../contexts/ProjectContext'
import { GALLERY_DRAG_MIME, GALLERY_UPDATED_EVENT, readImageGallery, type SavedGalleryImage } from '../lib/image-gallery-storage'
import { pathToFileUrl } from '../lib/file-url'

type GalleryDateFilter = 'all' | 'today' | 'week' | 'month'
type GalleryColumns = 2 | 3

function isInsideDateFilter(timestamp: number, filter: GalleryDateFilter): boolean {
  if (filter === 'all') return true
  const now = Date.now()
  const age = now - timestamp
  if (filter === 'today') return age <= 24 * 60 * 60 * 1000
  if (filter === 'week') return age <= 7 * 24 * 60 * 60 * 1000
  return age <= 30 * 24 * 60 * 60 * 1000
}

export function ImageGallerySidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { projectIds, getProject } = useProjects()
  const [items, setItems] = useState<SavedGalleryImage[]>(() => readImageGallery())
  const [dateFilter, setDateFilter] = useState<GalleryDateFilter>('all')
  const [styleFilter, setStyleFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [columns, setColumns] = useState<GalleryColumns>(2)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

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

  const projectImageItems = useMemo(() => (
    projectIds.flatMap((projectId) => {
      const project = getProject(projectId)
      if (!project) return []

      return project.assets
        .filter((asset) => asset.type === 'image')
        .map((asset): SavedGalleryImage => ({
          id: `project-image-${project.id}-${asset.id}`,
          path: asset.path,
          prompt: asset.prompt,
          createdAt: asset.createdAt,
          model: asset.generationParams?.model ?? 'AXSTUDIO 1.0',
          style: asset.generationParams?.model ?? 'AXSTUDIO 1.0',
          aspectRatio: asset.generationParams?.imageAspectRatio ?? '16:9',
          resolution: asset.resolution,
          projectId: project.id,
          projectName: project.name,
        }))
    })
  ), [getProject, projectIds])

  const combinedItems = useMemo(() => {
    const byPath = new Map<string, SavedGalleryImage>()
    for (const item of [...projectImageItems, ...items]) {
      byPath.set(item.path, item)
    }
    return [...byPath.values()]
  }, [items, projectImageItems])

  const filteredItems = useMemo(() => (
    combinedItems.filter((item) => (
      isInsideDateFilter(item.createdAt, dateFilter)
      && (styleFilter === 'all' || item.style === styleFilter)
      && (projectFilter === 'all' || item.projectId === projectFilter)
    ))
  ), [combinedItems, dateFilter, projectFilter, styleFilter])

  const selectedItems = useMemo(() => (
    combinedItems.filter((item) => selectedIds.has(item.id))
  ), [combinedItems, selectedIds])

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
            <p className="mt-1 text-xs text-zinc-500">Immagini salvate in AXSTUDIO</p>
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
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">{filteredItems.length} immagini</span>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-blue-300 hover:text-blue-200"
                >
                  {selectedIds.size} selezionate · pulisci
                </button>
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
              {filteredItems.map((item) => (
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
                    <div className="truncate text-[11px] text-zinc-300">{item.projectName || 'Senza progetto'}</div>
                    <div className="mt-0.5 truncate text-[10px] text-zinc-600">{item.style}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
