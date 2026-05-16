import { useCallback, useEffect } from 'react'
import { Film } from 'lucide-react'
import { WorkspaceSidebar } from '../components/WorkspaceSidebar'
import { useProjects } from '../contexts/ProjectContext'
import { VideoEditor } from './VideoEditor'
import type { Project } from '../types/project-model'

export function EditorStudio() {
  const {
    activeProject,
    projectIds,
    activateProject,
    setProject,
    pendingRetakeUpdate,
    pendingIcLoraUpdate,
  } = useProjects()

  useEffect(() => {
    if (activeProject || projectIds.length === 0) return
    activateProject(projectIds[0])
  }, [activateProject, activeProject, projectIds])

  const activeProjectId = activeProject?.id ?? null
  const saveActiveProject = useCallback((project: Project) => {
    if (!activeProjectId) return
    setProject(activeProjectId, project)
  }, [activeProjectId, setProject])

  return (
    <div className="flex h-screen bg-background text-white">
      <WorkspaceSidebar active="editor" />
      <main className="min-w-0 flex-1 bg-zinc-950">
        {activeProject ? (
          <VideoEditor
            key={activeProject.id}
            currentProject={activeProject}
            saveProject={saveActiveProject}
            pendingRetakeUpdate={pendingRetakeUpdate}
            pendingIcLoraUpdate={pendingIcLoraUpdate}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-md text-center">
              <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/70">
                <Film className="h-10 w-10 text-zinc-600" />
              </div>
              <h1 className="text-2xl font-semibold text-white">Editor</h1>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Crea o apri un progetto per usare l’editor video.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
