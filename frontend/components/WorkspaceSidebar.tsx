import { Film, Folder, ImageIcon, LayoutDashboard, Plus, UserRound, Video } from 'lucide-react'
import { useState } from 'react'
import { useProjects } from '../contexts/ProjectContext'
import { useView } from '../contexts/ViewContext'
import { AxStudioLogo } from './AxStudioLogo'

export type WorkspaceSidebarSection = 'projects' | 'images' | 'characters' | 'video' | 'editor'

function navButtonClass(active: boolean): string {
  return `mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
    active
      ? 'bg-zinc-800 text-white'
      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
  }`
}

export function WorkspaceSidebar({ active }: { active: WorkspaceSidebarSection }) {
  const { projectIds, getProject, createProject } = useProjects()
  const { goHome, openProject, setCurrentView } = useView()
  const [isCreating, setIsCreating] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  const projects = projectIds
    .map((projectId) => getProject(projectId))
    .filter((project): project is NonNullable<ReturnType<typeof getProject>> => project !== null)

  const handleCreateProject = () => {
    const name = newProjectName.trim() || `Progetto ${projects.length + 1}`
    const project = createProject(name)
    setNewProjectName('')
    setIsCreating(false)
    openProject(project.id)
  }

  return (
    <>
      <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-800">
        <div className="p-6">
          <AxStudioLogo />
        </div>

        <nav className="flex-1 px-3">
          <button
            type="button"
            onClick={goHome}
            className={navButtonClass(active === 'projects').replace('mt-2 ', '')}
          >
            <LayoutDashboard className="h-4 w-4" />
            Progetti
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('modal-image-studio')}
            className={navButtonClass(active === 'images')}
          >
            <ImageIcon className="h-4 w-4" />
            Immagini
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('character-studio')}
            className={navButtonClass(active === 'characters')}
          >
            <UserRound className="h-4 w-4" />
            Personaggi
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('video-studio')}
            className={navButtonClass(active === 'video')}
          >
            <Video className="h-4 w-4" />
            Video
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('editor-studio')}
            className={navButtonClass(active === 'editor')}
          >
            <Film className="h-4 w-4" />
            Editor
          </button>

          {projects.length > 0 && (
            <div className="mt-6">
              <h4 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Progetti recenti
              </h4>
              {projects.slice(0, 5).map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => openProject(project.id)}
                  className="flex w-full items-center gap-2 truncate rounded-lg px-3 py-2 text-left text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <Folder className="h-4 w-4 shrink-0" />
                  <span className="truncate">{project.name}</span>
                </button>
              ))}
            </div>
          )}
        </nav>

        <div className="border-t border-zinc-800 p-4">
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            Nuovo progetto
          </button>
        </div>
      </aside>

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-96 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">Nuovo progetto</h2>
            <input
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleCreateProject()
                if (event.key === 'Escape') setIsCreating(false)
              }}
              placeholder="Nome progetto"
              autoFocus
              className="mb-4 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="rounded-lg px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-white"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleCreateProject}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
              >
                Crea
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
