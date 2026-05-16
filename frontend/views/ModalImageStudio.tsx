import { ImageGenerationWorkspace } from '../components/ImageGenerationWorkspace'
import { WorkspaceSidebar } from '../components/WorkspaceSidebar'

export function ModalImageStudio() {
  return (
    <div className="flex h-screen bg-background text-white">
      <WorkspaceSidebar active="images" />

      <main className="flex min-w-0 flex-1 flex-col bg-zinc-950">
        <header className="shrink-0 border-b border-zinc-900 px-6 py-4">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Immagini</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Crea immagini con AXSTUDIO AI, scegli formato e qualità, poi salva i risultati nei tuoi progetti.
          </p>
        </header>

        <div className="min-h-0 flex-1">
          <ImageGenerationWorkspace scope="global" />
        </div>
      </main>
    </div>
  )
}
