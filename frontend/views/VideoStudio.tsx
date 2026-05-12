import { Video } from 'lucide-react'
import { WorkspaceSidebar } from '../components/WorkspaceSidebar'

export function VideoStudio() {
  return (
    <div className="flex h-screen bg-background text-white">
      <WorkspaceSidebar active="video" />
      <main className="flex min-w-0 flex-1 flex-col bg-zinc-950">
        <header className="h-24 shrink-0 border-b border-zinc-900 px-8 py-5">
          <h1 className="text-3xl font-semibold tracking-tight text-white">Video</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Genera clip video, prepara sequenze e porta i risultati nell’editor per il montaggio finale.
          </p>
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/70">
              <Video className="h-10 w-10 text-zinc-600" />
            </div>
            <h2 className="text-2xl font-semibold text-white">Generazione video</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Qui entrerà il flusso video dedicato. La prepariamo dopo immagini e personaggi.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
