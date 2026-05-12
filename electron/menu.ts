import { Menu, app } from 'electron'

export function installItalianAppMenu(): void {
  const isMac = process.platform === 'darwin'
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about', label: `Informazioni su ${app.name}` },
            { type: 'separator' },
            { role: 'services', label: 'Servizi' },
            { type: 'separator' },
            { role: 'hide', label: `Nascondi ${app.name}` },
            { role: 'hideOthers', label: 'Nascondi altri' },
            { role: 'unhide', label: 'Mostra tutto' },
            { type: 'separator' },
            { role: 'quit', label: `Esci da ${app.name}` },
          ],
        } satisfies Electron.MenuItemConstructorOptions]
      : []),
    {
      label: 'File',
      submenu: [
        { role: isMac ? 'close' : 'quit', label: isMac ? 'Chiudi finestra' : 'Esci' },
      ],
    },
    {
      label: 'Modifica',
      submenu: [
        { role: 'undo', label: 'Annulla' },
        { role: 'redo', label: 'Ripeti' },
        { type: 'separator' },
        { role: 'cut', label: 'Taglia' },
        { role: 'copy', label: 'Copia' },
        { role: 'paste', label: 'Incolla' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle', label: 'Incolla e mantieni stile' },
              { role: 'delete', label: 'Elimina' },
              { role: 'selectAll', label: 'Seleziona tutto' },
            ] satisfies Electron.MenuItemConstructorOptions[]
          : [
              { role: 'delete', label: 'Elimina' },
              { type: 'separator' },
              { role: 'selectAll', label: 'Seleziona tutto' },
            ] satisfies Electron.MenuItemConstructorOptions[]),
      ],
    },
    {
      label: 'Vista',
      submenu: [
        { role: 'reload', label: 'Ricarica' },
        { role: 'forceReload', label: 'Ricarica forzata' },
        { role: 'toggleDevTools', label: 'Strumenti sviluppatore' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Dimensione reale' },
        { role: 'zoomIn', label: 'Ingrandisci' },
        { role: 'zoomOut', label: 'Riduci' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Schermo intero' },
      ],
    },
    {
      label: 'Finestra',
      submenu: [
        { role: 'minimize', label: 'Riduci a icona' },
        { role: 'zoom', label: 'Zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front', label: 'Porta tutto in primo piano' },
              { type: 'separator' },
              { role: 'window', label: 'Finestra' },
            ] satisfies Electron.MenuItemConstructorOptions[]
          : [{ role: 'close', label: 'Chiudi' }] satisfies Electron.MenuItemConstructorOptions[]),
      ],
    },
    {
      label: 'Aiuto',
      submenu: [
        { label: 'AXSTUDIO', enabled: false },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
