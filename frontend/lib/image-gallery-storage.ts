export interface SavedGalleryImage {
  id: string
  path: string
  prompt: string
  createdAt: number
  model: string
  style: string
  aspectRatio: string
  resolution: string
  projectId?: string | null
  projectName?: string | null
}

const GALLERY_STORAGE_KEY = 'axstudio-image-gallery-v1'
export const GALLERY_UPDATED_EVENT = 'axstudio:image-gallery-updated'
export const GALLERY_DRAG_MIME = 'application/x-axstudio-gallery-images'

export function readImageGallery(): SavedGalleryImage[] {
  try {
    const raw = localStorage.getItem(GALLERY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as SavedGalleryImage[]
  } catch {
    return []
  }
}

export function writeImageGallery(items: SavedGalleryImage[]): void {
  localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent(GALLERY_UPDATED_EVENT))
}

export function addImageToGallery(item: Omit<SavedGalleryImage, 'id' | 'createdAt'>): SavedGalleryImage {
  const saved: SavedGalleryImage = {
    ...item,
    id: `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
  }
  writeImageGallery([saved, ...readImageGallery()])
  return saved
}
