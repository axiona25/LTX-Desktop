import { ImageGenerationWorkspace } from '../components/ImageGenerationWorkspace'
import { WorkspaceSidebar } from '../components/WorkspaceSidebar'

export function CharacterStudio() {
  return (
    <div className="flex h-screen bg-background text-white">
      <WorkspaceSidebar active="characters" />

      <main className="flex min-w-0 flex-1 flex-col bg-zinc-950">
        <header className="shrink-0 border-b border-zinc-900 px-6 py-4">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Personaggi</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Crea un volto master frontale, salva il character e riusalo nei progetti con gli stili realistici o cartoon.
          </p>
        </header>

        <div className="min-h-0 flex-1">
          <ImageGenerationWorkspace scope="global" creationMode="character" showProjectStrip={false} />
        </div>
      </main>
    </div>
  )
}
