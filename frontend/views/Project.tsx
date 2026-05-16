import { useCallback, useEffect, useState, type DragEvent } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import { useProjects } from '../contexts/ProjectContext'
import { useView } from '../contexts/ViewContext'
import { Button } from '../components/ui/button'
import { ImageGenerationWorkspace } from '../components/ImageGenerationWorkspace'
import { WorkspaceSidebar } from '../components/WorkspaceSidebar'
import { VideoEditor } from './VideoEditor'
import { addVisualAssetToProject } from '../lib/asset-copy'
import { pathToFileUrl } from '../lib/file-url'
import { GALLERY_DRAG_MIME, type SavedGalleryImage } from '../lib/image-gallery-storage'
import type { Asset } from '../types/project-model'
import {
  hasVisualAssetMetadataForMigration,
  runVisualAssetMetadataMigration,
} from '../lib/project-asset-metadata-migration'

function formatProjectDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('it-IT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function parseGalleryDropPayload(value: string): SavedGalleryImage[] {
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is SavedGalleryImage => (
      typeof item === 'object'
      && item !== null
      && typeof (item as SavedGalleryImage).id === 'string'
      && typeof (item as SavedGalleryImage).path === 'string'
    ))
  } catch {
    return []
  }
}

type ProjectProps = {
  isGalleryOpen?: boolean
}

export function Project({ isGalleryOpen = false }: ProjectProps) {
  const {
    activeProject,
    currentTab,
    setProject,
    addAsset,
    deleteAsset,
    updateAsset,
    pendingRetakeUpdate,
    setPendingRetakeUpdate,
    pendingIcLoraUpdate,
    setPendingIcLoraUpdate,
  } = useProjects()
  const { goHome } = useView()
  const [assetMetadataMigrationProgress, setAssetMetadataMigrationProgress] = useState({ running: false, total: 0, completed: 0 })
  const [upgradePassProjectId, setUpgradePassProjectId] = useState<string | null>(null)
  const [selectedProjectImagePath, setSelectedProjectImagePath] = useState<string | null>(null)
  const [assetPendingDelete, setAssetPendingDelete] = useState<Asset | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [galleryImportItems, setGalleryImportItems] = useState<SavedGalleryImage[]>([])
  const [galleryImportError, setGalleryImportError] = useState('')
  const [isGalleryImporting, setIsGalleryImporting] = useState(false)
  const [isGalleryDragOver, setIsGalleryDragOver] = useState(false)
  const activeProjectId = activeProject?.id ?? null
  const activeProjectAssets = activeProject?.assets ?? null
  const needsAssetMetadataMigration = activeProjectAssets
    ? hasVisualAssetMetadataForMigration(activeProjectAssets)
    : false

  const handleSaveActiveProject = useCallback((project: typeof activeProject extends null ? never : NonNullable<typeof activeProject>) => {
    if (!activeProjectId) return
    setProject(activeProjectId, project)
  }, [activeProjectId, setProject])

  useEffect(() => {
    if (!activeProjectId || !activeProjectAssets || !needsAssetMetadataMigration) return

    let cancelled = false

    const runAssetMetadataMigration = async () => {
      for await (const event of runVisualAssetMetadataMigration(activeProjectAssets, window.electronAPI)) {
        if (cancelled) return

        if (event.kind === 'progress') {
          setAssetMetadataMigrationProgress({ running: true, total: event.total, completed: event.completed })
          continue
        }

        for (const update of event.updates) {
          updateAsset(activeProjectId, update.assetId, update.updates)
        }

        setAssetMetadataMigrationProgress({ running: false, total: 0, completed: 0 })
        setUpgradePassProjectId(activeProjectId)
      }
    }

    void runAssetMetadataMigration()

    return () => {
      cancelled = true
    }
  }, [activeProjectAssets, activeProjectId, needsAssetMetadataMigration, updateAsset])

  useEffect(() => {
    if (currentTab !== 'video-editor') return
    if (pendingRetakeUpdate) setPendingRetakeUpdate(null)
    if (pendingIcLoraUpdate) setPendingIcLoraUpdate(null)
  }, [
    currentTab,
    pendingRetakeUpdate,
    setPendingRetakeUpdate,
    pendingIcLoraUpdate,
    setPendingIcLoraUpdate,
  ])

  const handleConfirmDeleteAsset = useCallback(async () => {
    if (!activeProjectId || !assetPendingDelete) return

    setDeleteError('')
    const filePaths = [
      assetPendingDelete.path,
      assetPendingDelete.bigThumbnailPath,
      assetPendingDelete.smallThumbnailPath,
      ...(assetPendingDelete.takes ?? []).flatMap((take) => [
        take.path,
        take.bigThumbnailPath,
        take.smallThumbnailPath,
      ]),
    ].filter((path): path is string => Boolean(path))

    const result = await window.electronAPI.deleteProjectAssetFiles({ filePaths })
    if (!result.success) {
      setDeleteError('Non sono riuscito a cancellare i file locali dell’immagine. Riprova.')
      return
    }

    deleteAsset(activeProjectId, assetPendingDelete.id)
    setSelectedProjectImagePath((currentPath) => (
      currentPath === assetPendingDelete.path ? null : currentPath
    ))
    setAssetPendingDelete(null)
  }, [activeProjectId, assetPendingDelete, deleteAsset])

  const handleGalleryDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    if (!isGalleryOpen || currentTab !== 'gen-space' || !event.dataTransfer.types.includes(GALLERY_DRAG_MIME)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsGalleryDragOver(true)
  }, [currentTab, isGalleryOpen])

  const handleGalleryDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    const relatedTarget = event.relatedTarget
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return
    setIsGalleryDragOver(false)
  }, [])

  const handleGalleryDrop = useCallback((event: DragEvent<HTMLElement>) => {
    if (!isGalleryOpen || currentTab !== 'gen-space') return
    const payload = event.dataTransfer.getData(GALLERY_DRAG_MIME)
    const droppedItems = parseGalleryDropPayload(payload)
    if (droppedItems.length === 0) return

    event.preventDefault()
    setIsGalleryDragOver(false)
    setGalleryImportError('')
    setGalleryImportItems(droppedItems)
  }, [currentTab, isGalleryOpen])

  const handleConfirmGalleryImport = useCallback(async () => {
    if (!activeProjectId || galleryImportItems.length === 0) return

    setIsGalleryImporting(true)
    setGalleryImportError('')
    try {
      let lastImportedPath: string | null = null

      for (const item of galleryImportItems) {
        const copied = await addVisualAssetToProject(item.path, activeProjectId, 'image')
        if (!copied) {
          setGalleryImportError('Non sono riuscito ad assegnare una o più immagini al progetto.')
          return
        }

        addAsset(activeProjectId, {
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

        lastImportedPath = copied.path
      }

      setSelectedProjectImagePath(lastImportedPath)
      setGalleryImportItems([])
    } finally {
      setIsGalleryImporting(false)
    }
  }, [activeProjectId, addAsset, galleryImportItems])
  
  if (!activeProject) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Project not found</p>
          <Button onClick={goHome}>Go Home</Button>
        </div>
      </div>
    )
  }
  
  const shouldShowAssetMetadataMigrationProgressScreen = assetMetadataMigrationProgress.running
    || (upgradePassProjectId !== activeProjectId && needsAssetMetadataMigration)

  if (shouldShowAssetMetadataMigrationProgressScreen) {
    const progressPct = assetMetadataMigrationProgress.total > 0
      ? (assetMetadataMigrationProgress.completed / assetMetadataMigrationProgress.total) * 100
      : 0

    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="w-[360px]">
          <p className="text-center text-sm text-zinc-300 mb-4">
            Preparing your project assets...
          </p>
          <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-150"
              style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
            />
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex h-screen bg-background text-white">
      <WorkspaceSidebar active="projects" />
      <main
        className="relative min-w-0 flex-1 overflow-hidden"
        onDragOver={handleGalleryDragOver}
        onDragLeave={handleGalleryDragLeave}
        onDrop={handleGalleryDrop}
      >
        {currentTab === 'gen-space' ? (
          <div className="flex h-full min-h-0 flex-col">
            <header className="relative h-24 shrink-0 border-b border-zinc-900 bg-zinc-950">
              <div className="absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-3">
                <button
                  type="button"
                  onClick={goHome}
                  className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                  aria-label="Torna ai progetti"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              </div>

              <div className="absolute left-1/2 top-1/2 w-[min(560px,calc(100%-8rem))] -translate-x-1/2 -translate-y-1/2 text-center">
                <h1 className="truncate text-2xl font-semibold tracking-tight text-white">{activeProject.name}</h1>
                <p className="mt-1 text-xs capitalize text-zinc-500">
                  Creato {formatProjectDate(activeProject.createdAt)}
                </p>
              </div>
            </header>

            <div className="min-h-0 flex-1">
              <ImageGenerationWorkspace
                scope="project"
                showProjectStrip={false}
                selectedImagePath={selectedProjectImagePath}
                onSelectedImagePathChange={setSelectedProjectImagePath}
              />
            </div>
            {isGalleryDragOver && (
              <div className="pointer-events-none absolute inset-4 z-20 flex items-center justify-center rounded-2xl border border-dashed border-blue-400 bg-blue-500/10 text-sm font-medium text-blue-100 backdrop-blur-sm">
                Rilascia qui per assegnare le immagini al progetto
              </div>
            )}
          </div>
        ) : (
          <VideoEditor
            key={activeProject.id}
            currentProject={activeProject}
            saveProject={handleSaveActiveProject}
            pendingRetakeUpdate={pendingRetakeUpdate}
            pendingIcLoraUpdate={pendingIcLoraUpdate}
          />
        )}
      </main>

      {assetPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Eliminare questa immagine?</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Verrà rimossa dal progetto e cancellata dallo storage locale dell’app.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssetPendingDelete(null)}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                <img
                  src={pathToFileUrl(assetPendingDelete.smallThumbnailPath || assetPendingDelete.bigThumbnailPath || assetPendingDelete.path)}
                  alt=""
                  className="h-44 w-full object-cover"
                />
              </div>
              {deleteError && (
                <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {deleteError}
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-zinc-800 px-5 py-4">
              <button
                type="button"
                onClick={() => setAssetPendingDelete(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDeleteAsset()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {galleryImportItems.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Assegnare immagini al progetto?</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Le immagini selezionate verranno copiate nello storage locale del progetto.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGalleryImportItems([])}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto">
                {galleryImportItems.map((item) => (
                  <div key={item.id} className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                    <img src={pathToFileUrl(item.path)} alt="" className="aspect-square w-full object-cover" />
                  </div>
                ))}
              </div>
              {galleryImportError && (
                <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {galleryImportError}
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-zinc-800 px-5 py-4">
              <button
                type="button"
                onClick={() => setGalleryImportItems([])}
                disabled={isGalleryImporting}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmGalleryImport()}
                disabled={isGalleryImporting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {isGalleryImporting ? 'Assegnazione...' : 'Conferma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
