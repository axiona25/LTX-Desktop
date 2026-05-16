import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { logger } from './lib/logger'
import { migrateKnownLocalStorageToPersistentStorage } from './lib/persistent-storage'
import { installProjectStorageDevtools } from './lib/project-storage-devtools'
import './index.css'

migrateKnownLocalStorageToPersistentStorage()
installProjectStorageDevtools()

window.addEventListener('error', (event) => {
  logger.error(`[Renderer] Uncaught error: ${event.message} ${event.filename}:${event.lineno}:${event.colno}`)
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason instanceof Error
    ? `${event.reason.name}: ${event.reason.message}\n${event.reason.stack ?? ''}`
    : String(event.reason)
  logger.error(`[Renderer] Unhandled promise rejection: ${reason}`)
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
