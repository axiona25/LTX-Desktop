import { getImageStylePreset, type ImageStylePreset } from '../constants/imageStyles'
import { getStyleProfile } from '../config/styleProfiles'
import { mergeNegativePrompts } from '../lib/image-style-prompt'

export type StyledPromptDebugLayers = {
  userPrompt: string
  stylePromptPrefix: string
  stylePromptSuffix: string
  negativePrompt: string
  triggerToken: string
  loraStrength: number | null
  aspectRatio: string | null
}

export type StyledPromptResult = {
  finalPrompt: string
  negativePrompt: string
  styleId: string
  styleLabel: string
  triggerToken: string
  debugPromptLayers: StyledPromptDebugLayers
}

export type BuildStyledPromptInput = {
  userPrompt: string
  styleId?: string | null
  loraStrength?: number | null
  aspectRatio?: string | null
  fallbackStyle?: ImageStylePreset | null
  characterName?: string | null
  characterIdentityPrompt?: string | null
  characterNegativePrompt?: string | null
}

function normalizePromptText(value: string): string {
  return value.replace(/\s+,/g, ',').replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim()
}

function promptRequestsAnimal(value: string): boolean {
  return /\b(poodle|dog|puppy|cat|kitten|horse|rabbit|bear|fox|wolf|animal|barboncino|cane|cagnolino|gatto|gattino|cavallo|coniglio|orso|volpe|lupo|animale)\b/i.test(value)
}

function animalSafeStyleText(value: string): string {
  return value
    .replace(/\bhuman character\b/gi, 'animal subject')
    .replace(/\bcartoon character\b/gi, 'cartoon animal subject')
    .replace(/\bcharacter design\b/gi, 'animal character design')
    .replace(/\bcharacter\b/gi, 'subject')
    .replace(/\breadable hands\b/gi, 'readable paws')
    .replace(/\bhands\b/gi, 'paws')
    .replace(/\bhand\b/gi, 'paw')
    .replace(/\bsimple stylized hair\b/gi, 'stylized fur')
    .replace(/\bclean sculpted hair\b/gi, 'clean sculpted fur')
    .replace(/\bsculpted soft hair\b/gi, 'sculpted soft fur')
    .replace(/\bhair\b/gi, 'fur')
    .replace(/\bfriendly face\b/gi, 'friendly animal face')
    .replace(/\bclean anatomy\b/gi, 'clear animal body anatomy')
}

function compositionSafeStyleText(value: string, wantsWideComposition: boolean): string {
  if (!wantsWideComposition) return value
  return value
    .replace(/\bprofessional photographic portrait\b/gi, 'professional environmental photography')
    .replace(/\bprofessional portrait photography\b/gi, 'professional environmental photography')
    .replace(/\bcommercial portrait quality\b/gi, 'commercial photographic quality')
    .replace(/\bcoherent realistic portrait look\b/gi, 'coherent realistic environmental photo look')
    .replace(/\bclean studio portrait\b/gi, 'clean environmental photograph')
    .replace(/\bportrait\b/gi, 'environmental photo')
    .replace(/\bhalf body framing\b/gi, 'full requested scene framing')
    .replace(/\bhalf body\b/gi, 'full requested scene')
    .replace(/\bhigh detail face\b/gi, 'readable face within the full scene')
    .replace(/\bsoft background blur\b/gi, 'natural environmental depth of field')
    .replace(/\bneutral background\b/gi, 'requested environment background')
    .replace(/\bflattering lens\b/gi, 'natural documentary lens')
}

function styleIsPhotographic(category?: string | null): boolean {
  return category === 'realistic_photo' || category === 'cinematic'
}

function styleAuthorityText(styleLabel: string, category?: string | null): string {
  const base = `STYLE AUTHORITY: render the entire image strictly in the selected style "${styleLabel}". The character, face, clothing, lighting, background, materials, and full scene must all share "${styleLabel}". Character identity may preserve only recognizable identity, facial proportions, feature placement, and gaze; it must never override the selected rendering style.`
  if (styleIsPhotographic(category)) {
    return `${base} Since this is a photographic/film style, the final image must look like a real camera image with natural photographic skin, real optics, and no cartoon, anime, illustration, doll, or 3D animated rendering.`
  }
  return `${base} Since this is a stylized/non-photo style, convert the character identity into the selected visual language; do not force photorealistic skin pores, photographic texture, real-camera optics, or live-action rendering.`
}

function identityPromptForStyle(value: string, category?: string | null): string {
  if (styleIsPhotographic(category)) return value
  return value
    .replace(/\bhyper realistic\b/gi, 'recognizable')
    .replace(/\bultra realistic\b/gi, 'recognizable')
    .replace(/\brealistic editorial portrait identity\b/gi, 'recognizable portrait identity')
    .replace(/\brealistic facial proportions\b/gi, 'same facial proportions')
    .replace(/\bnatural skin texture with visible pores\b/gi, 'same skin tone and facial surface character')
    .replace(/\bvisible pores\b/gi, 'same skin character')
    .replace(/\bpores\b/gi, 'skin character')
    .replace(/\brealistic facial micro-details\b/gi, 'facial identity cues')
    .replace(/\bfacial micro-details\b/gi, 'facial identity cues')
    .replace(/\bskin texture\b/gi, 'skin character')
    .replace(/\bglossy realistic catchlights\b/gi, 'same catchlight placement')
    .replace(/\brealistic\b/gi, 'recognizable')
}

function dentalQualityLockText(category?: string | null): string {
  if (styleIsPhotographic(category)) {
    return [
      'DENTAL REALISM LOCK: if teeth are visible, render natural teeth seated correctly inside the gums',
      'front teeth must be aligned, proportional, cleanly shaped and part of one continuous dental arch',
      'neighboring teeth should touch naturally with realistic narrow separation lines',
      'no floating teeth, no detached teeth, no isolated tooth fragments, no broken-looking front teeth',
    ].join('; ')
  }
  return [
    'DENTAL READABILITY LOCK: if teeth are visible, keep them coherent, attached inside the mouth, and matched to the selected style',
    'no floating or detached teeth',
  ].join('; ')
}

function dentalNegativePromptText(): string {
  return [
    'bad teeth',
    'broken teeth',
    'floating teeth',
    'detached teeth',
    'separated tooth fragments',
    'isolated teeth',
    'teeth outside mouth',
    'extra teeth',
    'duplicate teeth',
    'missing front teeth',
    'misaligned front teeth',
    'oversized front teeth',
    'black gaps between front teeth',
    'malformed gums',
    'melted teeth',
    'jagged teeth',
  ].join(', ')
}

function promptRequestsWideComposition(value: string): boolean {
  return /\b(full body|entire body|whole body|wide shot|medium wide|medium-wide|environmental portrait|environmental shot|head to toe|head-to-toe|standing full body|sitting full body|seated full body|corpo intero|figura intera|piano largo|campo medio|scena intera|seduta|seduto|sitting|seated|bar table|cafe|caf[eè]|caff[eè]|coffee|espresso|tavolino|bar|terrace|outdoor|chair|chairs|table|people|pedestrians|street|city|persone|passanti|strada|citt[aà])\b/i.test(value)
}

function compositionLockText(userPrompt: string): string {
  if (!promptRequestsWideComposition(userPrompt)) return ''
  return [
    'COMPOSITION LOCK: the requested scene, action, props, and camera distance are the highest priority',
    'this must be a medium-wide environmental scene, not a portrait session',
    'camera is 4 to 6 meters away from the subject',
    'subject occupies about 25 to 40 percent of the frame',
    'do not crop into a face close-up, headshot, or shoulders-up portrait',
    'show the subject body, pose, clothing, hands, props, furniture, and surrounding environment requested by the user',
    'for cafe or city scenes, the table, chair, coffee cup, saucer, street context, nearby customers, and pedestrians must be visible',
    'the main character face must remain readable with correct eyes, nose, lips, ears and teeth, but without changing to a close-up',
    'visible hands must have natural fingers and must hold props correctly',
    'identity details must be preserved inside the wider scene, not by replacing the scene with a beauty portrait',
  ].join('; ')
}

function compositionNegativePromptText(userPrompt: string): string {
  if (!promptRequestsWideComposition(userPrompt)) return ''
  return [
    'extreme close-up',
    'face close-up',
    'beauty close-up',
    'cropped face only',
    'headshot only',
    'shoulders-up portrait',
    'bust portrait',
    'single-person portrait',
    'studio portrait',
    'plain background',
    'isolated face',
    'passport photo',
    'missing body',
    'missing hands',
    'bad hands',
    'deformed hands',
    'fused fingers',
    'extra fingers',
    'melted fingers',
    'bad ears',
    'deformed ears',
    'bad nose',
    'deformed nose',
    'missing coffee cup',
    'missing table',
    'missing chair',
    'missing cafe terrace',
    'empty background',
    'no pedestrians',
    'no nearby people',
    'no city scene',
  ].join(', ')
}

function characterLockText(
  characterIdentityPrompt: string,
  characterName: string | null | undefined,
  styleLabel: string,
  wantsWideComposition: boolean,
): string {
  if (!characterIdentityPrompt) return ''
  const name = characterName || 'selected character'
  if (wantsWideComposition) {
    return `CHARACTER IDENTITY LOCK: reuse the same original character identity named ${name}; preserve these identity traits inside the requested wider scene: ${characterIdentityPrompt}. Keep the same recognizable face proportions, eye and iris color, brow shape, nose, lips, jaw, skin tone, freckles, and gaze. Do not change the requested camera distance, pose, action, body visibility, props, furniture, or environment to show the face better. The character must remain recognizable while the full scene is rendered in "${styleLabel}".`
  }
  return `CHARACTER IDENTITY LOCK: reuse the same original character identity named ${name}; preserve these identity traits across the selected style without changing the selected style: ${characterIdentityPrompt}. FULL FACE LOCK IS CRITICAL: keep the same face silhouette, head proportions, forehead, cheekbones, jaw, chin, nose bridge, nose tip, nostrils, mouth width, lip shape, ear position, ear shape, skin tone, freckles, under-eye character, and facial identity cues. EYE AND GAZE LOCK IS CRITICAL: keep the same eye shape, eyelid geometry, iris color, iris pattern, pupil size, catchlight placement, eyebrow angle, brow distance, and emotional gaze. Do not replace the face with a generic model face; do not beautify, reshape, age-shift, or lose the identity. Adapt clothing, pose, camera, lighting, background, and scene, and render all of them in "${styleLabel}".`
}

export function buildStyledPrompt(input: BuildStyledPromptInput): StyledPromptResult {
  const userPrompt = input.userPrompt.trim()
  const preset = input.styleId ? getImageStylePreset(input.styleId) ?? input.fallbackStyle : input.fallbackStyle
  const styleId = preset?.style_id ?? input.styleId ?? 'unstyled'
  const profile = getStyleProfile(styleId)
  const styleLabel = profile?.ui_label ?? preset?.style_label ?? 'Nessuno stile'
  const styleCategory = profile?.category ?? preset?.style_category ?? null
  const triggerToken = profile?.trigger_token ?? ''
  const isAnimalPrompt = promptRequestsAnimal(userPrompt)
  const wantsWideComposition = promptRequestsWideComposition(userPrompt)
  const rawStylePromptPrefix = profile?.prompt_prefix ?? preset?.style_prompt_modifier ?? ''
  const rawStylePromptSuffix = profile?.prompt_suffix ?? ''
  const compositionStylePromptPrefix = compositionSafeStyleText(rawStylePromptPrefix, wantsWideComposition)
  const compositionStylePromptSuffix = compositionSafeStyleText(rawStylePromptSuffix, wantsWideComposition)
  const stylePromptPrefix = isAnimalPrompt ? animalSafeStyleText(compositionStylePromptPrefix) : compositionStylePromptPrefix
  const stylePromptSuffix = isAnimalPrompt ? animalSafeStyleText(compositionStylePromptSuffix) : compositionStylePromptSuffix
  const animalNegativePrompt = isAnimalPrompt
    ? 'human, person, people, girl, boy, woman, man, child, student as human, human face, human body, human skin, human hair, human hands, arms, legs, humanoid, anthropomorphic human, child in costume'
    : ''
  const negativePrompt = mergeNegativePrompts(preset?.style_negative_modifier, profile?.negative_prompt, animalNegativePrompt)
  const characterIdentityPrompt = identityPromptForStyle(input.characterIdentityPrompt?.trim() ?? '', styleCategory)
  const styleAuthority = styleAuthorityText(styleLabel, styleCategory)
  const dentalQualityLock = dentalQualityLockText(styleCategory)
  const compositionLock = compositionLockText(userPrompt)
  const characterLock = characterLockText(characterIdentityPrompt, input.characterName, styleLabel, wantsWideComposition)
  const characterNegativePrompt = characterIdentityPrompt
    ? styleIsPhotographic(styleCategory)
      ? mergeNegativePrompts(
        input.characterNegativePrompt,
        'different person, different face identity, changed face shape, changed head proportions, changed forehead, changed jaw, changed chin, changed cheekbones, changed gaze, changed eye shape, changed iris color, different left and right eye colors, mismatched iris colors, heterochromia, one brown eye and one blue eye, one green eye and one brown eye, generic brown eyes, doll eyes, exaggerated eyelashes, changed eyebrow shape, changed nose shape, changed nostrils, changed mouth shape, changed lips, changed ears, changed skin texture, plastic skin, airbrushed skin, unrecognizable character',
      )
      : mergeNegativePrompts(
        'different person, different face identity, changed face shape, changed head proportions, changed forehead, changed jaw, changed chin, changed cheekbones, changed gaze, changed eye shape, changed iris color, different left and right eye colors, mismatched iris colors, heterochromia, changed eyebrow shape, changed nose shape, changed nostrils, changed mouth shape, changed lips, changed ears, unrecognizable character',
      )
    : ''
  const finalNegativePrompt = mergeNegativePrompts(
    negativePrompt,
    characterNegativePrompt,
    dentalNegativePromptText(),
    compositionNegativePromptText(userPrompt),
  )
  const subjectLock = userPrompt
    ? isAnimalPrompt
      ? 'ANIMAL SUBJECT ONLY: preserve the requested animal species exactly; the subject must be a real dog or poodle character, not a human, not a girl, not a person in costume.'
      : 'The main subject and action must exactly match the user request; do not replace animals, objects, vehicles or environments with another subject.'
    : ''
  const finalPrompt = profile
      ? normalizePromptText((wantsWideComposition ? [
        styleAuthority,
        stylePromptPrefix,
        compositionLock,
        userPrompt,
        characterLock,
        dentalQualityLock,
        stylePromptSuffix,
        subjectLock,
      ] : [
        styleAuthority,
        stylePromptPrefix,
        characterLock,
        dentalQualityLock,
        compositionLock,
        userPrompt,
        stylePromptSuffix,
        subjectLock,
      ]).filter(Boolean).join(', '))
    : (wantsWideComposition
      ? [styleAuthority, stylePromptPrefix ? `[STYLE: ${styleLabel}] ${stylePromptPrefix}` : '', compositionLock, userPrompt, characterLock, dentalQualityLock].filter(Boolean).join('\n\n')
      : [styleAuthority, stylePromptPrefix ? `[STYLE: ${styleLabel}] ${stylePromptPrefix}` : '', characterLock, dentalQualityLock, compositionLock, userPrompt].filter(Boolean).join('\n\n'))

  const result: StyledPromptResult = {
    finalPrompt,
    negativePrompt: finalNegativePrompt,
    styleId,
    styleLabel,
    triggerToken,
    debugPromptLayers: {
      userPrompt,
      stylePromptPrefix,
      stylePromptSuffix,
      negativePrompt: finalNegativePrompt,
      triggerToken,
      loraStrength: input.loraStrength ?? null,
      aspectRatio: input.aspectRatio ?? null,
    },
  }

  if (import.meta.env.DEV) {
    console.debug('[AXSTUDIO style prompt]', result)
  }

  return result
}
