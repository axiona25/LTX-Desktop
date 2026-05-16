import { readPersistentItem, writePersistentItem } from './persistent-storage'

export interface SavedGalleryImage {
  id: string
  code: string
  path: string
  prompt: string
  createdAt: number
  model: string
  style: string
  aspectRatio: string
  resolution: string
  projectId?: string | null
  projectName?: string | null
  projectAssetId?: string | null
  characterId?: string | null
  characterName?: string | null
}

const GALLERY_STORAGE_KEY = 'axstudio-image-gallery-v1'
export const GALLERY_UPDATED_EVENT = 'axstudio:image-gallery-updated'
export const GALLERY_DRAG_MIME = 'application/x-axstudio-gallery-images'
export const GALLERY_OPEN_IMAGE_EVENT = 'axstudio:image-gallery-open-image'

export function readImageGallery(): SavedGalleryImage[] {
  try {
    const raw = readPersistentItem(GALLERY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map((item, index) => normalizeGalleryImage(item, index))
  } catch {
    return []
  }
}

export function writeImageGallery(items: SavedGalleryImage[]): void {
  writePersistentItem(GALLERY_STORAGE_KEY, JSON.stringify(items.map((item, index) => normalizeGalleryImage(item, index))))
  window.dispatchEvent(new CustomEvent(GALLERY_UPDATED_EVENT))
}

export function addImageToGallery(item: Omit<SavedGalleryImage, 'id' | 'createdAt' | 'code'> & { code?: string }): SavedGalleryImage {
  const existingItems = readImageGallery()
  const saved: SavedGalleryImage = {
    ...item,
    code: item.code?.trim() || nextGalleryImageCode(existingItems.length),
    id: `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
  }
  writeImageGallery([saved, ...existingItems])
  return saved
}

export function nextGalleryImageCode(index: number): string {
  return `AX-${String(index + 1).padStart(4, '0')}`
}

function normalizeGalleryImage(item: Partial<SavedGalleryImage>, index: number): SavedGalleryImage {
  return {
    id: typeof item.id === 'string' ? item.id : `gallery-migrated-${index}`,
    code: typeof item.code === 'string' && item.code.trim() ? item.code : nextGalleryImageCode(index),
    path: typeof item.path === 'string' ? item.path : '',
    prompt: typeof item.prompt === 'string' ? item.prompt : '',
    createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
    model: typeof item.model === 'string' ? item.model : 'AXSTUDIO 1.0',
    style: typeof item.style === 'string' ? item.style : 'AXSTUDIO 1.0',
    aspectRatio: typeof item.aspectRatio === 'string' ? item.aspectRatio : '16:9',
    resolution: typeof item.resolution === 'string' ? item.resolution : '',
    projectId: item.projectId ?? null,
    projectName: item.projectName ?? null,
    projectAssetId: item.projectAssetId ?? null,
    characterId: item.characterId ?? null,
    characterName: item.characterName ?? null,
  }
}
