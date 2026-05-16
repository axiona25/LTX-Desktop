import { readPersistentItem, writePersistentItem } from './persistent-storage'

export interface SavedCharacter {
  id: string
  name: string
  code: string
  description: string
  imagePath: string
  identityPrompt: string
  negativePrompt: string
  createdAt: number
  updatedAt: number
}

const CHARACTER_STORAGE_KEY = 'axstudio-character-library-v1'
export const CHARACTER_UPDATED_EVENT = 'axstudio:characters-updated'
export const CHARACTER_OPEN_EVENT = 'axstudio:character-open'
export const CHARACTER_DELETED_EVENT = 'axstudio:character-deleted'

const FULL_FACE_IDENTITY_LOCK_PROMPT = [
  'exact same eye identity as the character master reference',
  'almond shaped eyes with slightly lifted outer corners',
  'calm intense direct gaze',
  'heavy natural upper eyelids and visible lower eyelid folds',
  'both eyes have the same matching iris color',
  'preserve the exact iris color from the character master reference',
  'glossy realistic catchlights in the same eye position',
  'same eyebrow thickness, angle, distance and arch',
  'exact same oval face silhouette, forehead height, cheekbone position, jaw softness, chin shape and facial symmetry',
  'same straight natural nose shape, bridge width, nostril shape, nose tip and nose length',
  'same natural lips, mouth width, cupid bow, lower lip fullness and mouth corner shape',
  'same visible ear size, ear position, earlobe shape and ear angle when ears are visible',
  'same natural skin tone, skin texture, pores, subtle freckles, under-eye texture and realistic facial micro-details',
  'same face proportions between eyes, nose, mouth, cheeks, ears and jaw',
].join(', ')

const FULL_FACE_IDENTITY_NEGATIVE_PROMPT = [
  'changed face shape',
  'changed gaze',
  'changed eye shape',
  'changed eye color',
  'incorrect eye color',
  'different left and right eye colors',
  'mismatched iris colors',
  'heterochromia',
  'one brown eye and one blue eye',
  'one green eye and one brown eye',
  'doll eyes',
  'exaggerated eyelashes',
  'changed eyebrow shape',
  'changed nose shape',
  'changed nostrils',
  'changed mouth shape',
  'changed lips',
  'changed ears',
  'changed skin texture',
  'plastic skin',
  'airbrushed skin',
].join(', ')

function mergePromptParts(...parts: Array<string | null | undefined>): string {
  const merged: string[] = []
  const seen = new Set<string>()
  for (const part of parts) {
    for (const rawItem of (part ?? '').split(',')) {
      const item = rawItem.trim()
      const key = item.toLowerCase()
      if (!item || seen.has(key)) continue
      merged.push(item)
      seen.add(key)
    }
  }
  return merged.join(', ')
}

function sourcePromptIdentityHints(sourcePrompt: string): string {
  const normalized = sourcePrompt.toLowerCase()
  const hints: string[] = []
  if (/\bblue[- ]green hazel\b|\bhazel[- ]green\b|\bgreen[- ]hazel\b/.test(normalized)) {
    hints.push(
      'adult woman with blue green hazel eyes',
      'exact same blue green hazel eye color as the character master reference',
      'visible cool green blue outer iris with warm amber gold central ring and darker limbal ring',
      'both eyes must keep the same blue green hazel iris color in every future scene',
    )
  } else if (/\bhazel eyes\b/.test(normalized)) {
    hints.push('exact same hazel eye color as the character master reference')
  } else if (/\bgreen eyes\b|\bgreen irises\b/.test(normalized)) {
    hints.push('exact same green eye color as the character master reference')
  } else if (/\bblue eyes\b|\bblue irises\b/.test(normalized)) {
    hints.push('exact same blue eye color as the character master reference')
  } else if (/\bbrown eyes\b|\bbrown irises\b/.test(normalized)) {
    hints.push('exact same brown eye color as the character master reference')
  }
  if (/\bdark brown hair\b/.test(normalized)) hints.push('same dark brown hair')
  else if (/\bbrown hair\b/.test(normalized)) hints.push('same brown hair')
  else if (/\bblack hair\b/.test(normalized)) hints.push('same black hair')
  else if (/\bblonde hair\b|\bblond hair\b/.test(normalized)) hints.push('same blonde hair')
  if (/\bdark (natural )?eyebrows\b|\bstrong natural dark eyebrows\b/.test(normalized)) {
    hints.push('same strong natural dark eyebrows')
  }
  if (/\boval face\b/.test(normalized)) hints.push('same oval face with realistic facial proportions')
  if (/\bstraight (natural )?nose\b/.test(normalized)) hints.push('same straight natural nose shape')
  if (/\bsubtle freckles\b|\bfreckles\b/.test(normalized)) hints.push('same subtle freckles and natural skin micro-details')
  return hints.join(', ')
}

export function buildCharacterIdentityPrompt(sourcePrompt = ''): string {
  return mergePromptParts(sourcePromptIdentityHints(sourcePrompt), FULL_FACE_IDENTITY_LOCK_PROMPT)
}

export function buildCharacterNegativePrompt(sourcePrompt = ''): string {
  const normalized = sourcePrompt.toLowerCase()
  let eyeNegatives = ''
  if (/\bblue[- ]green hazel\b|\bhazel[- ]green\b|\bgreen[- ]hazel\b/.test(normalized)) {
    eyeNegatives = 'brown eyes, olive eyes, dark brown irises, amber-only eyes, black eyes, generic brown eyes'
  } else if (/\bhazel eyes\b/.test(normalized)) {
    eyeNegatives = 'blue eyes, gray eyes, black eyes, flat brown eyes'
  } else if (/\bgreen eyes\b|\bgreen irises\b/.test(normalized)) {
    eyeNegatives = 'brown eyes, blue eyes, black eyes, amber eyes'
  } else if (/\bblue eyes\b|\bblue irises\b/.test(normalized)) {
    eyeNegatives = 'brown eyes, green eyes, black eyes, amber eyes'
  } else if (/\bbrown eyes\b|\bbrown irises\b/.test(normalized)) {
    eyeNegatives = 'blue eyes, green eyes, gray eyes, light hazel eyes'
  }
  return mergePromptParts(eyeNegatives, FULL_FACE_IDENTITY_NEGATIVE_PROMPT)
}

export function readCharacters(): SavedCharacter[] {
  try {
    const raw = readPersistentItem(CHARACTER_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map((item, index) => normalizeCharacter(item, index))
  } catch {
    return []
  }
}

export function writeCharacters(items: SavedCharacter[]): void {
  writePersistentItem(CHARACTER_STORAGE_KEY, JSON.stringify(items.map((item, index) => normalizeCharacter(item, index))))
  window.dispatchEvent(new CustomEvent(CHARACTER_UPDATED_EVENT))
}

export function addCharacter(item: Omit<SavedCharacter, 'id' | 'createdAt' | 'updatedAt'>): SavedCharacter {
  const now = Date.now()
  const existingCharacters = readCharacters()
  const saved: SavedCharacter = {
    ...item,
    code: item.code.trim() || nextCharacterCode(existingCharacters.length),
    description: item.description.trim() || 'Character master pronto per scene e stili diversi.',
    id: `character-${now}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: now,
    updatedAt: now,
  }
  writeCharacters([saved, ...existingCharacters])
  return saved
}

export function deleteCharacter(id: string): void {
  writeCharacters(readCharacters().filter((item) => item.id !== id))
}

export function updateCharacterName(id: string, name: string): SavedCharacter | null {
  const nextName = name.trim()
  if (!nextName) return null
  let updated: SavedCharacter | null = null
  const nextCharacters = readCharacters().map((item) => {
    if (item.id !== id) return item
    updated = {
      ...item,
      name: nextName,
      updatedAt: Date.now(),
    }
    return updated
  })
  if (!updated) return null
  writeCharacters(nextCharacters)
  return updated
}

export function nextCharacterCode(index: number): string {
  return `CHR-${String(index + 1).padStart(3, '0')}`
}

function normalizeCharacter(item: Partial<SavedCharacter>, index: number): SavedCharacter {
  const rawIdentityPrompt = typeof item.identityPrompt === 'string' ? item.identityPrompt : ''
  const identityPrompt = mergePromptParts(rawIdentityPrompt, FULL_FACE_IDENTITY_LOCK_PROMPT)
  const rawNegativePrompt = typeof item.negativePrompt === 'string' ? item.negativePrompt : ''
  const negativePrompt = mergePromptParts(rawNegativePrompt, FULL_FACE_IDENTITY_NEGATIVE_PROMPT)
  return {
    id: typeof item.id === 'string' ? item.id : `character-migrated-${index}`,
    name: typeof item.name === 'string' && item.name.trim() ? item.name : nextCharacterCode(index),
    code: typeof item.code === 'string' && item.code.trim() ? item.code : nextCharacterCode(index),
    description: typeof item.description === 'string' && item.description.trim()
      ? item.description
      : identityPrompt.slice(0, 180) || 'Character master pronto per scene e stili diversi.',
    imagePath: typeof item.imagePath === 'string' ? item.imagePath : '',
    identityPrompt,
    negativePrompt,
    createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
    updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
  }
}
