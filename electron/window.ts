import { app, BrowserWindow, nativeImage } from 'electron'
import path from 'path'
import fs from 'fs'
import { isDev, getCurrentDir } from './config'
import { logger } from './logger'

let mainWindow: BrowserWindow | null = null

export function createWindow(): BrowserWindow {
  // Get the path to preload script
  const preloadPath = isDev
    ? path.join(getCurrentDir(), 'dist-electron', 'preload.js')
    : path.join(app.getAppPath(), 'dist-electron', 'preload.js')

  // App icon — use .ico on Windows, .png elsewhere
  const iconExt = process.platform === 'win32' ? 'icon.ico' : 'icon.png'
  const iconPath = path.join(getCurrentDir(), 'resources', iconExt)
  logger.info(`[icon] Loading app icon from: ${iconPath} | exists: ${fs.existsSync(iconPath)}`)
  const appIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    icon: appIcon,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: isDev ? false : true,
    },
    backgroundColor: '#1a1a1a',
    titleBarStyle: 'default',
    show: false,
  })

  // Load the app
  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    logger.info(`[window] Loading dev renderer from ${devServerUrl}`)
    mainWindow.loadURL(devServerUrl)
    // DevTools can be opened manually with Ctrl+Shift+I or F12
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    logger.info('[window] Main window ready to show')
    mainWindow?.show()
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logger.error(`[window] Renderer process gone reason=${details.reason} exitCode=${details.exitCode}`)
  })

  mainWindow.webContents.on('unresponsive', () => {
    logger.warn('[window] Main window renderer became unresponsive')
  })

  mainWindow.webContents.on('responsive', () => {
    logger.info('[window] Main window renderer became responsive')
  })

  mainWindow.on('close', () => {
    logger.info('[window] Main window close requested')
  })

  mainWindow.on('closed', () => {
    logger.info('[window] Main window closed')
    mainWindow = null
  })

  return mainWindow
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}
