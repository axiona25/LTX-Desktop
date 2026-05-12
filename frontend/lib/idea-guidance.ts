export type CompositionIntent = 'portrait' | 'full_body' | 'landscape_scene' | 'product' | 'architecture' | 'generic'
export type SubjectType = 'person' | 'environment' | 'object' | 'product' | 'architecture' | 'mixed' | 'generic'

export type IdeaGuidanceAnalysis = {
  composition_intent: CompositionIntent
  subject_type: SubjectType
  required_traits: Record<string, unknown>
  descriptive_trait_lock_applied: boolean
  trait_lock_types_applied: string[]
  no_people_lock_applied: boolean
}

const FULL_BODY_RE = /\b(full[-\s]?body|head[-\s]?to[-\s]?toe|figura intera|corpo intero|intera persona|figura completa|piedi visibili|feet visible|standing shot|entire figure)\b/i
const PORTRAIT_RE = /\b(portrait|ritratto|headshot|close[-\s]?up)\b/i
const LANDSCAPE_RE = /\b(city|citt[aà]|landscape|paesaggio|scene|scena|environment|ambiente|street|skyline|interior|exterior|strada|notte|rain|pioggia)\b/i
const ARCHITECTURE_RE = /\b(architecture|architectural|villa|house|building|interior design|exterior|architettura|villa moderna|casa|edificio|interni)\b/i
const PRODUCT_RE = /\b(product|prodotto|packshot|still life|e-commerce)\b/i
const PERSON_RE = /\b(person|people|human|woman|man|adult|subject|donna|uomo|persona|soggetto|ragazza|ragazzo)\b/i
const NO_PEOPLE_RE = /\b(no people|without people|no person|no human|empty city|empty street|empty scene|senza persone|nessuna persona|nessun umano|citt[aà] vuota|strada vuota|scena vuota)\b/i

const HAIR_TRAITS: Array<[string, RegExp]> = [
  ['black', /\b(black hair|capelli neri)\b/i],
  ['dark brunette', /\b(dark brunette|dark brown hair|brunette|capelli castani scuri|capelli castani|bruna|mora)\b/i],
  ['blonde', /\b(blonde hair|blond hair|capelli biondi|bionda|biondo)\b/i],
  ['red', /\b(red hair|ginger hair|auburn hair|capelli rossi|rossa|rosso)\b/i],
]

const EYE_TRAITS: Array<[string, RegExp]> = [
  ['blue', /\b(blue eyes|occhi blu|occhi azzurri)\b/i],
  ['green', /\b(green eyes|occhi verdi)\b/i],
  ['brown', /\b(brown eyes|dark eyes|occhi marroni|occhi castani|occhi scuri)\b/i],
]

const BODY_TRAITS: Array<[string, RegExp]> = [
  ['robust_body', /\b(robust body|robust build|corporatura robusta|robusta)\b/i],
  ['athletic_body', /\b(athletic body|athletic physique|athletic|fisico atletico|atletica|atletico)\b/i],
  ['curvy_body', /\b(curvy body|curvy|fianchi larghi|curve|formosa)\b/i],
  ['slim_body', /\b(slim body|slender figure|figura slanciata|snella|slanciata)\b/i],
  ['tall_stature', /\b(tall stature|tall person|persona alta|alta statura|alto|alta)\b/i],
  ['short_stature', /\b(short stature|short person|persona bassa|bassa statura|basso|bassa)\b/i],
  ['prosperous_bust', /\b(prosperous bust|full bust|large breasts|lush breasts|seno prosperoso|seno abbondante)\b/i],
]

function firstMatch(source: string, traits: Array<[string, RegExp]>): string | null {
  return traits.find(([, pattern]) => pattern.test(source))?.[0] ?? null
}

export function analyzeIdeaGuidance(...sources: Array<string | null | undefined>): IdeaGuidanceAnalysis {
  const source = sources.filter(Boolean).join(' ')
  const composition_intent: CompositionIntent = FULL_BODY_RE.test(source)
    ? 'full_body'
    : ARCHITECTURE_RE.test(source)
      ? 'architecture'
      : PRODUCT_RE.test(source)
        ? 'product'
        : PORTRAIT_RE.test(source)
          ? 'portrait'
          : LANDSCAPE_RE.test(source)
            ? 'landscape_scene'
            : 'generic'

  const hasPerson = PERSON_RE.test(source)
  const hasEnvironment = LANDSCAPE_RE.test(source)
  const hasArchitecture = ARCHITECTURE_RE.test(source)
  const subject_type: SubjectType = NO_PEOPLE_RE.test(source) && (hasEnvironment || hasArchitecture)
    ? hasArchitecture ? 'architecture' : 'environment'
    : PRODUCT_RE.test(source)
      ? 'product'
      : hasArchitecture
        ? 'architecture'
        : hasPerson && hasEnvironment
          ? 'mixed'
          : hasPerson
            ? 'person'
            : hasEnvironment
              ? 'environment'
              : 'generic'

  const hair = firstMatch(source, HAIR_TRAITS)
  const eyes = firstMatch(source, EYE_TRAITS)
  const bodyTraits = BODY_TRAITS.filter(([, pattern]) => pattern.test(source)).map(([trait]) => trait)
  const trait_lock_types_applied = [
    ...(hasPerson ? ['adult_clarity'] : []),
    ...(hair ? ['hair_color'] : []),
    ...(eyes ? ['eye_color'] : []),
    ...bodyTraits.map((trait) => trait.includes('stature') ? 'stature' : 'body_type'),
    ...(composition_intent === 'full_body' ? ['requested_framing'] : []),
    ...(NO_PEOPLE_RE.test(source) ? ['no_people'] : []),
  ].filter((value, index, list) => list.indexOf(value) === index)

  return {
    composition_intent,
    subject_type,
    required_traits: {
      ...(hair ? { hair_color: hair } : {}),
      ...(eyes ? { eye_color: eyes } : {}),
      ...(bodyTraits.length ? { body_traits: bodyTraits } : {}),
      ...(composition_intent === 'full_body' ? { body_framing: 'full_body' } : {}),
      ...(NO_PEOPLE_RE.test(source) ? { no_people: true } : {}),
    },
    descriptive_trait_lock_applied: trait_lock_types_applied.length > 0,
    trait_lock_types_applied,
    no_people_lock_applied: NO_PEOPLE_RE.test(source),
  }
}

export function dimensionsForIdeaGuidance(
  selectedAspectRatio: string,
  analysis: IdeaGuidanceAnalysis,
): {
  width: number
  height: number
  effective_aspect_ratio: string
  aspect_ratio_overridden: boolean
  aspect_ratio_override_reason: string | null
} {
  if (analysis.composition_intent === 'full_body') {
    const useThreeFour = selectedAspectRatio === '3:4'
    return {
      width: useThreeFour ? 896 : 768,
      height: useThreeFour ? 1152 : 1344,
      effective_aspect_ratio: useThreeFour ? '3:4' : '9:16',
      aspect_ratio_overridden: selectedAspectRatio !== (useThreeFour ? '3:4' : '9:16'),
      aspect_ratio_override_reason: selectedAspectRatio !== (useThreeFour ? '3:4' : '9:16')
        ? 'full_body_requires_vertical_framing'
        : null,
    }
  }

  if (analysis.composition_intent === 'landscape_scene' || analysis.composition_intent === 'architecture') {
    return {
      width: 1344,
      height: 768,
      effective_aspect_ratio: '16:9',
      aspect_ratio_overridden: selectedAspectRatio !== '16:9',
      aspect_ratio_override_reason: selectedAspectRatio !== '16:9'
        ? `${analysis.composition_intent}_prefers_landscape_framing`
        : null,
    }
  }

  switch (selectedAspectRatio) {
    case '1:1':
      return { width: 1024, height: 1024, effective_aspect_ratio: '1:1', aspect_ratio_overridden: false, aspect_ratio_override_reason: null }
    case '9:16':
      return { width: 768, height: 1344, effective_aspect_ratio: '9:16', aspect_ratio_overridden: false, aspect_ratio_override_reason: null }
    case '4:3':
      return { width: 1152, height: 896, effective_aspect_ratio: '4:3', aspect_ratio_overridden: false, aspect_ratio_override_reason: null }
    case '3:4':
      return { width: 896, height: 1152, effective_aspect_ratio: '3:4', aspect_ratio_overridden: false, aspect_ratio_override_reason: null }
    case '16:9':
    default:
      return { width: 1344, height: 768, effective_aspect_ratio: '16:9', aspect_ratio_overridden: false, aspect_ratio_override_reason: null }
  }
}
