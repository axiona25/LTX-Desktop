import { logger } from './logger'

const KNOWN_STORAGE_PREFIXES = [
  'ltx-project-',
  'axstudio:image-workspace-view-state:v1:',
]

const KNOWN_STORAGE_KEYS = [
  'ltx-project-ids',
  'ltx-projects',
  'axstudio-image-gallery-v1',
  'axstudio-character-library-v1',
  'ltx-keyboard-shortcuts',
  'ltx-video-editor-layout',
  'ltx-video-editor-layout-presets',
]

function shouldPersistKey(key: string): boolean {
  return KNOWN_STORAGE_KEYS.includes(key) || KNOWN_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))
}

function readLocalStorageItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocalStorageItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Best effort mirror only.
  }
}

function removeLocalStorageItem(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Best effort mirror only.
  }
}

function jsonRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function collectionScore(key: string, value: string | null): number {
  if (value === null || !value.trim()) return -1
  try {
    const parsed = JSON.parse(value) as unknown
    if (Array.isArray(parsed)) return parsed.length
    const record = jsonRecord(parsed)
    if (record && key.startsWith('ltx-project-')) {
      const assets = Array.isArray(record.assets) ? record.assets.length : 0
      const timelines = Array.isArray(record.timelines) ? record.timelines.length : 0
      return assets * 100 + timelines
    }
  } catch {
    return value.length > 0 ? 0 : -1
  }
  return value.length > 0 ? 0 : -1
}

function shouldPromoteLocalValue(key: string, localValue: string, sqliteValue: string | null): boolean {
  if (sqliteValue === null) return true
  return collectionScore(key, localValue) > collectionScore(key, sqliteValue)
}

export function readPersistentItem(key: string): string | null {
  const appStorage = window.electronAPI?.readAppStorageItem?.(key)
  if (appStorage?.success && appStorage.value !== null) return appStorage.value

  const legacyValue = readLocalStorageItem(key)
  if (legacyValue !== null && window.electronAPI?.writeAppStorageItem) {
    const migrated = window.electronAPI.writeAppStorageItem(key, legacyValue)
    if (!migrated.success) {
      logger.warn(`Failed to migrate localStorage key ${key} to SQLite: ${migrated.error}`)
    }
  }
  return legacyValue
}

export function writePersistentItem(key: string, value: string): void {
  const result = window.electronAPI?.writeAppStorageItem?.(key, value)
  if (result && !result.success) {
    logger.warn(`Failed to write SQLite storage key ${key}: ${result.error}`)
  }
  writeLocalStorageItem(key, value)
}

export function removePersistentItem(key: string): void {
  const result = window.electronAPI?.removeAppStorageItem?.(key)
  if (result && !result.success) {
    logger.warn(`Failed to remove SQLite storage key ${key}: ${result.error}`)
  }
  removeLocalStorageItem(key)
}

export function listPersistentKeys(prefix = ''): string[] {
  const keys = new Set<string>()
  const appStorage = window.electronAPI?.listAppStorageKeys?.(prefix)
  if (appStorage?.success) {
    for (const key of appStorage.keys) keys.add(key)
  }

  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i)
      if (key && key.startsWith(prefix)) keys.add(key)
    }
  } catch {
    // Ignore localStorage enumeration errors.
  }

  return [...keys]
}

export function migrateKnownLocalStorageToPersistentStorage(): void {
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i)
      if (!key || !shouldPersistKey(key)) continue
      const value = window.localStorage.getItem(key)
      if (value === null) continue
      const existing = window.electronAPI?.readAppStorageItem?.(key)
      if (existing?.success && !shouldPromoteLocalValue(key, value, existing.value)) continue
      const result = window.electronAPI?.writeAppStorageItem?.(key, value)
      if (result && !result.success) {
        logger.warn(`Failed to migrate localStorage key ${key} to SQLite: ${result.error}`)
      }
    }
  } catch (error) {
    logger.warn(`Failed to migrate localStorage to SQLite: ${error}`)
  }
}
