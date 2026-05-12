import { useMemo, useState } from 'react'
import { CalendarDays, Folder, UserRound, Video, X } from 'lucide-react'
import { useProjects } from '../contexts/ProjectContext'
import { pathToFileUrl } from '../lib/file-url'
import type { Asset } from '../types/project-model'

type MediaLibraryKind = 'characters' | 'videos'
type DateFilter = 'all' | 'today' | 'week' | 'month'

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

export function MediaLibrarySidebar({
  kind,
  open,
  onClose,
}: {
  kind: MediaLibraryKind
  open: boolean
  onClose: () => void
}) {
  const { projectIds, getProject } = useProjects()
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [projectFilter, setProjectFilter] = useState('all')

  const projectOptions = useMemo(() => (
    projectIds
      .map((id) => getProject(id))
      .filter((project): project is NonNullable<typeof project> => Boolean(project))
      .map((project) => [project.id, project.name] as const)
  ), [getProject, projectIds])

  const items = useMemo(() => {
    if (kind === 'characters') return []

    return projectIds.flatMap((projectId) => {
      const project = getProject(projectId)
      if (!project) return []
      return project.assets
        .filter(isVideoAsset)
        .map((asset) => ({ asset, projectId: project.id, projectName: project.name }))
    }).filter((item) => (
      isInsideDateFilter(item.asset.createdAt, dateFilter)
      && (projectFilter === 'all' || item.projectId === projectFilter)
    ))
  }, [dateFilter, getProject, kind, projectFilter, projectIds])

  const title = kind === 'characters' ? 'Personaggi' : 'Video'
  const subtitle = kind === 'characters' ? 'Character creati in AXSTUDIO' : 'Video generati in AXSTUDIO'
  const Icon = kind === 'characters' ? UserRound : Video
  const emptyText = kind === 'characters'
    ? 'Nessun personaggio salvato.'
    : 'Nessun video salvato.'

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
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-zinc-600">
              {emptyText}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {items.map(({ asset, projectName }) => (
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
    </aside>
  )
}
