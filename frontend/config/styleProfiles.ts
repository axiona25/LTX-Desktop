import type { ImageStyleCategory } from '../constants/imageStyles'
import jsonStyleProfiles from '../../src/config/styleProfiles.json'

export type StyleCompatibility = 'image' | 'image_video_future'
export type StylePromptVariant = 'short' | 'long' | 'premium'

export interface StyleTrainingPlan {
  objective: string
  dataset_images_min: number
  dataset_images_recommended: number
  captioning_rules: string[]
  balance_rules: string[]
  overfit_risks: string[]
  validation_prompts: string[]
  suggested_steps_base: number
  suggested_steps_incremental: number
}

export interface StyleProfile {
  id: string
  ui_label: string
  safe_label: string
  category: ImageStyleCategory
  source_category?: string
  short_description: string
  long_description: string
  trigger_token?: string
  visual_language: string
  line_treatment: string
  shading_mode: string
  color_logic: string
  lighting_style: string
  texture_style: string
  composition_hints: string
  anatomy_tendency: string
  environment_tendency: string
  prompt_prefix: string
  prompt_suffix: string
  prompt_short: string
  prompt_long: string
  prompt_premium: string
  negative_prompt: string
  recommended_resolution: string
  recommended_aspect_ratios: string[]
  image_prompt_template: string
  video_prompt_template: string
  strength_guidance: number
  compatibility: StyleCompatibility
  constraints: string[]
  notes: string
  tags: string[]
  training: StyleTrainingPlan
}

type JsonStyleProfile = {
  id: string
  ui_label: string
  safe_label: string
  category: string
  short_description: string
  long_description: string
  trigger_token?: string
  visual_language?: Record<string, string> | string
  line_treatment?: string
  shading_mode?: string
  color_logic?: string
  lighting_style?: string
  texture_style?: string
  composition_hints?: string[] | string
  anatomy_tendency?: string
  environment_tendency?: string
  prompt_prefix: string
  prompt_suffix: string
  negative_prompt: string
  recommended_resolution?: Record<string, string> | string
  recommended_aspect_ratios?: string[]
  image_prompt_template?: string
  video_prompt_template?: string
  strength_guidance?: { default?: number } | number
  lora_training?: {
    goal?: string
    dataset_size_min?: number
    dataset_size_recommended?: number
    captioning_rules?: string[]
    overfitting_risks?: string[]
    recommended_params?: Record<string, string | number>
  }
  validation_prompts?: Array<{ name: string; prompt: string }>
  tags?: string[]
}

function normalizeJsonCategory(category: string): ImageStyleCategory {
  switch (category) {
    case 'REALISTIC':
      return 'realistic_photo'
    case 'CINEMATIC':
      return 'cinematic'
    case 'ANIME & MANGA':
      return 'anime_manga'
    case 'CARTOON':
      return 'animation_cartoon'
    case '3D ANIMATION':
      return 'three_d_render'
    case 'COMICS':
    case 'ILLUSTRATION':
      return 'illustration_drawing'
    case 'FANTASY & SCI-FI':
      return 'fantasy_scifi'
    case 'DESIGN':
      return 'graphic_design'
    case 'PAINTING & SKETCH':
      return 'artistic_painting'
    case 'RETRO & GAME':
      return 'retro_special'
    case 'stylized_3d_animation':
      return 'animation_cartoon'
    case 'anime_manga':
    case 'animation_cartoon':
    case 'three_d_render':
    case 'illustration_drawing':
    case 'fantasy_scifi':
    case 'cinematic':
    case 'realistic_photo':
    case 'graphic_design':
    case 'artistic_painting':
    case 'retro_special':
    case 'custom':
      return category
    default:
      return 'custom'
  }
}

function stringifyVisualLanguage(value: JsonStyleProfile['visual_language']): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return Object.entries(value).map(([key, text]) => `${key}: ${text}`).join(', ')
}

function stringifyMaybeArray(value: string[] | string | undefined): string {
  if (!value) return ''
  return Array.isArray(value) ? value.join(', ') : value
}

function stringifyResolution(value: JsonStyleProfile['recommended_resolution']): string {
  if (!value) return '1024-1344px'
  if (typeof value === 'string') return value
  return Object.entries(value).map(([key, size]) => `${key}: ${size}`).join(', ')
}

function normalizeStrength(value: JsonStyleProfile['strength_guidance']): number {
  if (typeof value === 'number') return value
  return value?.default ?? 0.75
}

function normalizeStepCount(value: string | number | undefined, fallback: number): number {
  if (typeof value === 'number') return value
  if (!value) return fallback
  const firstNumber = value.match(/\d+/)?.[0]
  return firstNumber ? Number(firstNumber) : fallback
}

function jsonTrainingPlan(profile: JsonStyleProfile): StyleTrainingPlan {
  return {
    objective: profile.lora_training?.goal ?? `Train ${profile.safe_label} as a controllable AXSTUDIO style.`,
    dataset_images_min: profile.lora_training?.dataset_size_min ?? 24,
    dataset_images_recommended: profile.lora_training?.dataset_size_recommended ?? 40,
    captioning_rules: profile.lora_training?.captioning_rules ?? [
      'Use the style trigger token when available.',
      'Keep subject, camera, environment, lighting, material, and style language separated.',
      'Do not use brand names or existing characters.',
    ],
    balance_rules: [
      'Include portraits, half body, full body, environments, multiple characters, and props.',
      'Validate eyes, hands, anatomy, materials, and background readability separately.',
    ],
    overfit_risks: profile.lora_training?.overfitting_risks ?? [
      'Characters becoming too similar across prompts.',
      'Style overpowering the user prompt.',
    ],
    validation_prompts: profile.validation_prompts?.map((item) => item.prompt) ?? [],
    suggested_steps_base: normalizeStepCount(profile.lora_training?.recommended_params?.target_total_steps, 3000),
    suggested_steps_incremental: 250,
  }
}

function jsonProfileToStyleProfile(profile: JsonStyleProfile): StyleProfile {
  const visualLanguage = stringifyVisualLanguage(profile.visual_language)
  const compositionHints = stringifyMaybeArray(profile.composition_hints)
  const strength = normalizeStrength(profile.strength_guidance)
  return {
    id: profile.id,
    ui_label: profile.ui_label,
    safe_label: profile.safe_label,
    category: normalizeJsonCategory(profile.category),
    source_category: profile.category,
    short_description: profile.short_description,
    long_description: profile.long_description,
    trigger_token: profile.trigger_token,
    visual_language: visualLanguage,
    line_treatment: profile.line_treatment ?? '',
    shading_mode: profile.shading_mode ?? '',
    color_logic: profile.color_logic ?? '',
    lighting_style: profile.lighting_style ?? '',
    texture_style: profile.texture_style ?? '',
    composition_hints: compositionHints,
    anatomy_tendency: profile.anatomy_tendency ?? '',
    environment_tendency: profile.environment_tendency ?? '',
    prompt_prefix: profile.prompt_prefix,
    prompt_suffix: profile.prompt_suffix,
    prompt_short: [profile.trigger_token, profile.short_description].filter(Boolean).join(', '),
    prompt_long: [profile.prompt_prefix, profile.short_description, profile.lighting_style].filter(Boolean).join(', '),
    prompt_premium: [
      profile.prompt_prefix,
      visualLanguage,
      profile.lighting_style,
      profile.texture_style,
      profile.anatomy_tendency,
      compositionHints,
      profile.prompt_suffix,
    ].filter(Boolean).join(', '),
    negative_prompt: profile.negative_prompt,
    recommended_resolution: stringifyResolution(profile.recommended_resolution),
    recommended_aspect_ratios: profile.recommended_aspect_ratios ?? ['16:9', '9:16', '1:1'],
    image_prompt_template: profile.image_prompt_template ?? '{prompt_prefix}, {user_prompt}, {prompt_suffix}',
    video_prompt_template: profile.video_prompt_template ?? '{prompt_prefix}, {user_prompt}, {prompt_suffix}',
    strength_guidance: strength,
    compatibility: 'image_video_future',
    constraints: [
      'No branded style imitation.',
      'No existing characters, logos, or franchise references.',
    ],
    notes: 'Imported from src/config/styleProfiles.json and used as an AXSTUDIO-owned style profile.',
    tags: profile.tags ?? [],
    training: jsonTrainingPlan(profile),
  }
}

const COMMON_STYLIZED_NEGATIVE = 'photorealistic, real camera photo, live action, skin pores, documentary photo, smartphone photo, weak style, muddy details, unreadable face, bad eyes, bad hands, malformed fingers, distorted anatomy, warped background, random text, watermark, logo'

function trainingPlan(objective: string, extraRules: string[] = []): StyleTrainingPlan {
  return {
    objective,
    dataset_images_min: 24,
    dataset_images_recommended: 40,
    captioning_rules: [
      'Use one stable trigger token per style.',
      'Caption content separately from style: subject, pose, camera, environment, lighting, material.',
      'Keep brand names, proprietary characters, logos, and artist names out of captions.',
      ...extraRules,
    ],
    balance_rules: [
      '30% portraits and face close-ups for eye and face coherence.',
      '25% full body or medium shots for anatomy and hands.',
      '25% environments and props for background language.',
      '20% action, expression, and multi-subject stress cases.',
    ],
    overfit_risks: [
      'Repeating the same face shape across all samples.',
      'Letting one color palette dominate the style.',
      'Training copyrighted characters instead of the visual language.',
      'Overtraining until prompt content is ignored.',
    ],
    validation_prompts: [
      'portrait of a young explorer, clear eyes, neutral background',
      'full-body character holding a map in a small town square',
      'two friends in a red convertible on a sunny road',
      'cozy interior room with props and readable materials',
    ],
    suggested_steps_base: 600,
    suggested_steps_incremental: 100,
  }
}

export const STYLE_PROFILES: StyleProfile[] = [
  {
    id: 'anime',
    ui_label: 'Anime',
    safe_label: 'Premium Anime',
    category: 'anime_manga',
    short_description: 'Clean anime image language with expressive faces and controlled cel shading.',
    long_description: 'A polished anime style focused on readable eyes, simplified but appealing anatomy, clean contours, cinematic framing, and coherent painted backgrounds.',
    visual_language: 'Japanese animation-inspired composition, expressive character acting, clean silhouette hierarchy.',
    line_treatment: 'Controlled thin-to-medium outlines, clean facial features, crisp hair shapes.',
    shading_mode: 'Cel shading with soft gradient accents.',
    color_logic: 'Clear saturated palette with disciplined contrast and readable skin/hair separation.',
    lighting_style: 'Soft cinematic key light with stylized highlights.',
    texture_style: 'Mostly smooth surfaces, subtle painterly background texture.',
    composition_hints: 'Keep the face readable, avoid tiny distant faces, use clear foreground/midground/background.',
    anatomy_tendency: 'Stylized but anatomically coherent, larger expressive eyes, clean hands.',
    environment_tendency: 'Detailed but not noisy animated backgrounds.',
    prompt_prefix: 'premium anime illustration, non-photographic cel-shaded artwork, clean anime linework',
    prompt_suffix: 'keep the subject readable, with correct eyes, clean hands, coherent anime anatomy',
    prompt_short: 'premium anime illustration, clean cel shading, expressive eyes',
    prompt_long: 'premium anime illustration, clean cel shading, expressive eyes, controlled linework, polished animated background, readable character silhouette',
    prompt_premium: 'premium anime illustration, non-photographic cel-shaded artwork, expressive character design, clean linework, readable eyes, correct hands, polished animated background, controlled saturated palette, cinematic anime composition',
    negative_prompt: `${COMMON_STYLIZED_NEGATIVE}, western cartoon, cheap anime, broken cel shading, asymmetrical eyes`,
    recommended_resolution: '1024-1344px longest side',
    recommended_aspect_ratios: ['16:9', '9:16', '1:1'],
    image_prompt_template: '{user_prompt}, {style_prompt}, clear anime subject readability',
    video_prompt_template: '{user_prompt}, anime film frame, stable character model, clean motion-ready silhouettes',
    strength_guidance: 0.82,
    compatibility: 'image_video_future',
    constraints: ['No named anime franchises or characters.', 'No artist-name mimicry.'],
    notes: 'Use this instead of vague “anime style” alone.',
    tags: ['anime', 'cel-shading', 'character'],
    training: trainingPlan('Train a controllable anime visual language without copying named franchises.', ['Caption eye shape, hair mass, line thickness, and cel-shadow placement.']),
  },
  {
    id: 'manga',
    ui_label: 'Manga / Comic Ink',
    safe_label: 'Manga Comic Ink',
    category: 'anime_manga',
    short_description: 'Black-and-white manga ink language with screen tones and strong line hierarchy.',
    long_description: 'A manga/comic ink style for sharp silhouettes, expressive eyes, controlled hatching, screen-tone shading, and clear panel-ready storytelling.',
    visual_language: 'Sequential art, expressive face acting, panel-ready framing.',
    line_treatment: 'Black ink outlines, controlled hatching, speed lines only when useful.',
    shading_mode: 'Screen tones, hatching, sparse solid black shapes.',
    color_logic: 'Mostly monochrome or limited accent colors.',
    lighting_style: 'High readability value grouping.',
    texture_style: 'Ink on paper, screen-tone grain.',
    composition_hints: 'Avoid photographic depth of field; use bold positive/negative shapes.',
    anatomy_tendency: 'Stylized manga anatomy with clear hands and readable expression.',
    environment_tendency: 'Line-based environments with perspective discipline.',
    prompt_prefix: 'manga comic ink artwork, black ink linework, screen-tone shading',
    prompt_suffix: 'make it look inked and panel-ready, not photographed',
    prompt_short: 'manga comic ink, clean black linework, screen tones',
    prompt_long: 'manga comic ink artwork, clean black linework, screen-tone shading, expressive eyes, crisp panel-ready composition',
    prompt_premium: 'manga comic ink artwork, non-photographic sequential art, crisp black linework, controlled hatching, screen-tone shading, expressive readable eyes, clean hands, disciplined perspective, strong black-and-white value design',
    negative_prompt: `${COMMON_STYLIZED_NEGATIVE}, full color painting, soft photo lighting, muddy ink, unreadable hatching`,
    recommended_resolution: '1024px square or 1344px landscape',
    recommended_aspect_ratios: ['1:1', '16:9', '9:16'],
    image_prompt_template: '{user_prompt}, {style_prompt}, crisp ink readability',
    video_prompt_template: '{user_prompt}, manga panel motion concept, stable ink silhouettes',
    strength_guidance: 0.86,
    compatibility: 'image_video_future',
    constraints: ['Avoid named manga/anime properties.'],
    notes: 'Best for high-contrast characters and action poses.',
    tags: ['manga', 'ink', 'screentone'],
    training: trainingPlan('Train ink and screen-tone behavior while preserving anatomy.', ['Caption hatching direction, screen-tone density, and panel composition.']),
  },
  {
    id: 'cartoon',
    ui_label: 'Cartoon Occidentale',
    safe_label: 'Western Cartoon',
    category: 'animation_cartoon',
    short_description: 'Readable western cartoon design with simplified appealing forms.',
    long_description: 'A broad non-branded cartoon language emphasizing clean shapes, readable faces, controlled outlines, simplified anatomy, and cheerful color logic.',
    visual_language: 'Simplified animation-ready shapes, clear face acting, strong silhouette.',
    line_treatment: 'Medium clean outlines with soft internal detail.',
    shading_mode: 'Flat shading with simple soft highlights.',
    color_logic: 'Bright but controlled palette, clear subject separation.',
    lighting_style: 'Soft friendly animation lighting.',
    texture_style: 'Smooth vector/painted hybrid surfaces.',
    composition_hints: 'Bring key characters closer; avoid tiny faces in wide shots.',
    anatomy_tendency: 'Rounded proportions, expressive face, simplified hands.',
    environment_tendency: 'Readable playful backgrounds.',
    prompt_prefix: 'western cartoon animation style, non-photorealistic, simplified appealing forms',
    prompt_suffix: 'clear cartoon face, correct hands, clean outlines, no live-action realism',
    prompt_short: 'western cartoon, clean outlines, expressive rounded shapes',
    prompt_long: 'western cartoon animation style, simplified appealing forms, clean outlines, expressive face, bright controlled colors, readable background',
    prompt_premium: 'western cartoon animation style, non-photorealistic, simplified appealing forms, clean medium outlines, expressive rounded character design, correct hands, clear eyes, bright controlled color palette, readable animation-ready background',
    negative_prompt: `${COMMON_STYLIZED_NEGATIVE}, anime, gritty realism, over-complex textures, creepy proportions`,
    recommended_resolution: '1024-1344px',
    recommended_aspect_ratios: ['16:9', '1:1'],
    image_prompt_template: '{user_prompt}, {style_prompt}, readable western cartoon staging',
    video_prompt_template: '{user_prompt}, western cartoon animation frame, stable simplified character model',
    strength_guidance: 0.84,
    compatibility: 'image_video_future',
    constraints: ['No branded cartoon characters or logos.'],
    notes: 'Safer replacement for brand-specific cartoon requests.',
    tags: ['cartoon', 'animation', 'family'],
    training: trainingPlan('Train generic western cartoon shape language without brand dependency.', ['Caption outline thickness, shape roundness, and expression type.']),
  },
  {
    id: 'family_3d_animation',
    ui_label: 'Family 3D Animation',
    safe_label: 'Family-Friendly 3D Animation',
    category: 'animation_cartoon',
    short_description: 'Polished family-friendly cinematic 3D character animation.',
    long_description: 'A non-branded stylized 3D animation language with appealing faces, clean materials, soft lighting, and cinematic family adventure staging.',
    visual_language: 'Stylized cinematic 3D, appealing forms, expressive emotional acting.',
    line_treatment: 'No ink outlines; use clean geometry and silhouette readability.',
    shading_mode: 'Soft global illumination, stylized material response.',
    color_logic: 'Warm cinematic palette, clean material color separation.',
    lighting_style: 'Soft studio or golden-hour animated lighting.',
    texture_style: 'Polished 3D surfaces, subtle skin/material detail.',
    composition_hints: 'Camera close enough for readable faces; avoid tiny subjects.',
    anatomy_tendency: 'Appealing stylized anatomy with large readable eyes and clean hands.',
    environment_tendency: 'Polished 3D environments with readable props.',
    prompt_prefix: 'family-friendly stylized cinematic 3D animation, polished CGI, appealing character design',
    prompt_suffix: 'make it look like an original animated adventure frame, not a real photo',
    prompt_short: 'family-friendly stylized 3D animation, polished CGI, appealing forms',
    prompt_long: 'family-friendly stylized cinematic 3D animation, polished CGI, appealing character design, soft global illumination, readable expressive face',
    prompt_premium: 'family-friendly stylized cinematic 3D animation, polished original CGI, appealing character design, expressive readable eyes, correct hands, soft global illumination, clean materials, warm cinematic palette, readable animation-ready environment',
    negative_prompt: `${COMMON_STYLIZED_NEGATIVE}, cheap plastic, uncanny realism, gritty skin pores, low-poly unless requested`,
    recommended_resolution: '1024-1344px',
    recommended_aspect_ratios: ['16:9', '9:16', '1:1'],
    image_prompt_template: '{user_prompt}, {style_prompt}, polished stylized 3D render',
    video_prompt_template: '{user_prompt}, stylized 3D animation keyframe, stable character proportions',
    strength_guidance: 0.8,
    compatibility: 'image_video_future',
    constraints: ['No named studio references.', 'No existing characters.'],
    notes: 'Safe replacement for proprietary studio-name prompts.',
    tags: ['3d', 'animation', 'family'],
    training: trainingPlan('Train polished generic family 3D animation rendering and character appeal.', ['Caption material type, eye scale, face shape, and lighting setup.']),
  },
  {
    id: 'stylized_3d',
    ui_label: 'Stylized 3D Animation',
    safe_label: 'Stylized 3D Animation',
    category: 'three_d_render',
    short_description: 'Stylized 3D render with simplified forms and high readability.',
    long_description: 'A clean stylized 3D look for characters, objects, and environments where geometry, lighting, and material readability matter more than realism.',
    visual_language: 'Simplified geometry, strong silhouettes, polished render finish.',
    line_treatment: 'Geometry-driven edge readability, optional subtle rim light.',
    shading_mode: 'Soft PBR-inspired stylized shading.',
    color_logic: 'Separated material colors, limited palette.',
    lighting_style: 'Studio or cinematic softbox lighting.',
    texture_style: 'Smooth stylized materials with controlled roughness.',
    composition_hints: 'Use object/character scale separation and uncluttered framing.',
    anatomy_tendency: 'Simplified stylized body forms, clean hands.',
    environment_tendency: 'Game/animation-ready props and spaces.',
    prompt_prefix: 'stylized 3D animation render, simplified appealing forms, polished materials',
    prompt_suffix: 'clean geometry, readable silhouette, no photographic skin texture',
    prompt_short: 'stylized 3D animation render, clean geometry',
    prompt_long: 'stylized 3D animation render, simplified appealing forms, clean geometry, polished materials, soft cinematic lighting',
    prompt_premium: 'stylized 3D animation render, simplified appealing forms, clean geometry, polished materials, correct proportions, readable hands and face, controlled roughness, soft cinematic lighting, animation-ready composition',
    negative_prompt: `${COMMON_STYLIZED_NEGATIVE}, noisy render, bad topology, broken geometry, uncanny skin texture`,
    recommended_resolution: '1024-1344px',
    recommended_aspect_ratios: ['16:9', '1:1', '9:16'],
    image_prompt_template: '{user_prompt}, {style_prompt}, high-quality stylized 3D scene',
    video_prompt_template: '{user_prompt}, stylized 3D animation keyframe, stable geometry',
    strength_guidance: 0.78,
    compatibility: 'image_video_future',
    constraints: ['Avoid mixing with photorealistic camera language.'],
    notes: 'Best baseline for app-owned 3D styles.',
    tags: ['3d', 'stylized', 'render'],
    training: trainingPlan('Train stylized material and geometry behavior without collapsing into realism.', ['Caption material roughness, geometry simplification, and lighting type.']),
  },
  {
    id: 'storybook_illustration',
    ui_label: 'Storybook Illustration',
    safe_label: 'Storybook Illustration',
    category: 'animation_cartoon',
    short_description: 'Warm storybook illustration with soft textures and charming readable characters.',
    long_description: 'A gentle illustrated style for narrative scenes, warm palettes, painterly backgrounds, and friendly characters with readable faces.',
    visual_language: 'Whimsical narrative illustration, soft shapes, charming subject staging.',
    line_treatment: 'Soft outlines or painted edges, no hard photo realism.',
    shading_mode: 'Soft painterly shading.',
    color_logic: 'Warm harmonious palette, gentle contrast.',
    lighting_style: 'Diffuse storybook glow.',
    texture_style: 'Paper texture, soft brush, subtle grain.',
    composition_hints: 'Use centered readable subjects and clear story cues.',
    anatomy_tendency: 'Friendly stylized proportions, readable faces.',
    environment_tendency: 'Narrative backgrounds with simple props.',
    prompt_prefix: 'storybook illustration, warm non-photographic painted look, whimsical readable scene',
    prompt_suffix: 'soft paper texture, charming characters, clear story composition',
    prompt_short: 'storybook illustration, warm painterly texture, charming scene',
    prompt_long: 'storybook illustration, warm non-photographic painted look, soft paper texture, charming readable characters, gentle story composition',
    prompt_premium: 'storybook illustration, warm non-photographic painted look, soft paper texture, charming readable characters, correct expressive eyes, gentle brush texture, coherent warm palette, clear narrative background and props',
    negative_prompt: `${COMMON_STYLIZED_NEGATIVE}, harsh realism, horror mood, muddy brushwork, aggressive contrast`,
    recommended_resolution: '1024px square or 1344px landscape',
    recommended_aspect_ratios: ['1:1', '16:9'],
    image_prompt_template: '{user_prompt}, {style_prompt}, charming storybook clarity',
    video_prompt_template: '{user_prompt}, storybook animation keyframe, stable illustrated composition',
    strength_guidance: 0.83,
    compatibility: 'image_video_future',
    constraints: ['No named children book franchises.'],
    notes: 'Good for family-safe scenes and children-oriented art direction.',
    tags: ['storybook', 'illustration', 'warm'],
    training: trainingPlan('Train warm illustrated texture and narrative clarity.', ['Caption paper texture, brush softness, and story cues.']),
  },
  {
    id: 'european_comic',
    ui_label: 'Fumetto Europeo',
    safe_label: 'European Comic',
    category: 'illustration_drawing',
    short_description: 'European album comic style with clean ink, readable color, and detailed backgrounds.',
    long_description: 'A Franco-Belgian inspired comic language with clear contour lines, controlled flat color, detailed environments, and readable story staging.',
    visual_language: 'Album comic composition, clear storytelling, readable props and backgrounds.',
    line_treatment: 'Clean contour line, precise internal drawing, controlled line weight.',
    shading_mode: 'Flat color with selective soft shading.',
    color_logic: 'Natural but graphic color palette, clear object separation.',
    lighting_style: 'Readable daylight or controlled interior light.',
    texture_style: 'Clean print illustration, subtle paper feel.',
    composition_hints: 'Use clear perspective and strong subject/background separation.',
    anatomy_tendency: 'Stylized but grounded proportions.',
    environment_tendency: 'Detailed architecture and props without noise.',
    prompt_prefix: 'European album comic illustration, clean contour ink, readable flat color',
    prompt_suffix: 'precise backgrounds, clear storytelling, not photorealistic',
    prompt_short: 'European comic illustration, clean ink, readable flat color',
    prompt_long: 'European album comic illustration, clean contour ink, readable flat color, precise backgrounds, clear storytelling composition',
    prompt_premium: 'European album comic illustration, clean contour ink, readable flat color, precise background detail, controlled line weight, clear expressive face, correct hands, print-quality composition, not photorealistic',
    negative_prompt: `${COMMON_STYLIZED_NEGATIVE}, manga screentone, superhero exaggeration, messy sketch, photo texture`,
    recommended_resolution: '1344x768 or 1024x1024',
    recommended_aspect_ratios: ['16:9', '1:1'],
    image_prompt_template: '{user_prompt}, {style_prompt}, precise European comic readability',
    video_prompt_template: '{user_prompt}, European comic keyframe, stable ink and flat color',
    strength_guidance: 0.84,
    compatibility: 'image_video_future',
    constraints: ['Avoid named comic characters and series.'],
    notes: 'Good for vehicles, cities, adventure scenes.',
    tags: ['comic', 'european', 'ink'],
    training: trainingPlan('Train clear European comic line and color discipline.', ['Caption contour line, flat color, and background detail density.']),
  },
  {
    id: 'western_comic',
    ui_label: 'Superhero Comic Style',
    safe_label: 'Superhero Comic',
    category: 'illustration_drawing',
    short_description: 'Bold superhero comic rendering with dynamic action and graphic shadows.',
    long_description: 'A high-energy western superhero comic look with strong anatomy, dynamic framing, bold ink shadows, and saturated comic colors.',
    visual_language: 'Dynamic action composition, heroic staging, graphic impact.',
    line_treatment: 'Bold ink line, thick shadows, energetic contours.',
    shading_mode: 'Graphic shadows, halftone or hard cel-color accents.',
    color_logic: 'High-contrast saturated palette.',
    lighting_style: 'Dramatic rim light and strong shadow grouping.',
    texture_style: 'Print comic texture, optional halftone.',
    composition_hints: 'Use diagonals, close readable action, strong focal point.',
    anatomy_tendency: 'Heroic stylization but hands and faces must remain coherent.',
    environment_tendency: 'Urban/action backgrounds with readable perspective.',
    prompt_prefix: 'superhero comic illustration, bold ink lines, dynamic action composition',
    prompt_suffix: 'graphic shadows, saturated comic color, readable heroic anatomy',
    prompt_short: 'superhero comic, bold ink, dynamic action',
    prompt_long: 'superhero comic illustration, bold ink lines, dynamic action composition, graphic shadows, saturated comic color',
    prompt_premium: 'superhero comic illustration, bold ink lines, dynamic action composition, strong silhouette, graphic shadows, saturated comic color, readable heroic anatomy, correct hands, clear face, print-ready energy',
    negative_prompt: `${COMMON_STYLIZED_NEGATIVE}, manga style, flat weak action, soft photo lighting, broken muscles`,
    recommended_resolution: '1344x768 or 768x1344',
    recommended_aspect_ratios: ['16:9', '9:16'],
    image_prompt_template: '{user_prompt}, {style_prompt}, bold comic action clarity',
    video_prompt_template: '{user_prompt}, superhero comic action keyframe, stable strong silhouette',
    strength_guidance: 0.86,
    compatibility: 'image_video_future',
    constraints: ['No named superheroes or publisher logos.'],
    notes: 'Use for action and dramatic character shots.',
    tags: ['comic', 'superhero', 'action'],
    training: trainingPlan('Train dynamic western comic ink and anatomy without copying named characters.', ['Caption action direction, shadow shape, and line weight.']),
  },
  {
    id: 'cel_shading',
    ui_label: 'Cel Shading',
    safe_label: 'Cel Shading',
    category: 'animation_cartoon',
    short_description: 'Hard-edged animation shading with clean shapes and readable form.',
    long_description: 'A cel-shaded style for crisp planes, clean shadows, controlled highlights, and non-photographic readability across characters and props.',
    visual_language: 'Animation-ready planar forms, clean shadow decisions.',
    line_treatment: 'Optional clean outline, crisp internal shape borders.',
    shading_mode: 'Hard-edged cel shadows and simple highlights.',
    color_logic: 'Flat local color with clean shadow hue shifts.',
    lighting_style: 'Single readable key light.',
    texture_style: 'Smooth non-photographic surfaces.',
    composition_hints: 'Avoid noisy detail; favor large readable forms.',
    anatomy_tendency: 'Stylized but clean planes on face and body.',
    environment_tendency: 'Simplified forms with consistent shadow logic.',
    prompt_prefix: 'cel-shaded animation style, hard-edged shadow shapes, clean flat colors',
    prompt_suffix: 'clear planes, crisp readable forms, no photographic texture',
    prompt_short: 'cel-shaded animation, hard-edged shadows, clean flat colors',
    prompt_long: 'cel-shaded animation style, hard-edged shadow shapes, clean flat colors, crisp readable forms, controlled highlights',
    prompt_premium: 'cel-shaded animation style, hard-edged shadow shapes, clean flat colors, controlled highlights, crisp readable forms, correct eyes and hands, consistent single light direction, no photographic texture',
    negative_prompt: `${COMMON_STYLIZED_NEGATIVE}, soft photo gradients, noisy texture, muddy shading, uncontrolled shadows`,
    recommended_resolution: '1024-1344px',
    recommended_aspect_ratios: ['16:9', '1:1', '9:16'],
    image_prompt_template: '{user_prompt}, {style_prompt}, cel-shaded form clarity',
    video_prompt_template: '{user_prompt}, cel-shaded animation keyframe, stable shadow shapes',
    strength_guidance: 0.85,
    compatibility: 'image_video_future',
    constraints: ['Avoid photorealistic material language.'],
    notes: 'Useful as a technical style modifier across anime, cartoon, and game art.',
    tags: ['cel-shading', 'animation', 'clean'],
    training: trainingPlan('Train hard-edged shadow discipline and non-photographic form readability.', ['Caption shadow edge type, key light direction, and highlight style.']),
  },
  {
    id: 'fantasy_art',
    ui_label: 'Fantasy Illustration',
    safe_label: 'Fantasy Illustration',
    category: 'fantasy_scifi',
    short_description: 'High-detail fantasy illustration with coherent worldbuilding and readable characters.',
    long_description: 'A fantasy concept illustration style focused on atmospheric lighting, designed costumes, readable faces, detailed environments, and coherent props.',
    visual_language: 'Epic but readable fantasy concept illustration.',
    line_treatment: 'Painterly edges with controlled silhouette clarity.',
    shading_mode: 'Painterly light and shadow with atmospheric depth.',
    color_logic: 'Rich palette tied to environment and magic source.',
    lighting_style: 'Cinematic fantasy light, rim light, atmospheric glow.',
    texture_style: 'Painterly materials: cloth, metal, stone, foliage.',
    composition_hints: 'Use strong foreground subject and environment scale cues.',
    anatomy_tendency: 'Semi-stylized heroic anatomy with clean hands/face.',
    environment_tendency: 'Detailed mythical environments with designed props.',
    prompt_prefix: 'high-end fantasy illustration, coherent magical worldbuilding, painterly concept art',
    prompt_suffix: 'readable character, designed props, atmospheric fantasy lighting',
    prompt_short: 'fantasy illustration, painterly concept art, magical atmosphere',
    prompt_long: 'high-end fantasy illustration, painterly concept art, coherent magical worldbuilding, readable character, atmospheric lighting',
    prompt_premium: 'high-end fantasy illustration, coherent magical worldbuilding, painterly concept art, readable character face, correct hands, designed costume and props, atmospheric depth, rich material texture, cinematic fantasy lighting',
    negative_prompt: `${COMMON_STYLIZED_NEGATIVE}, generic fantasy, cluttered props, unreadable face, cheap costume, flat lighting`,
    recommended_resolution: '1344x768 or 768x1344',
    recommended_aspect_ratios: ['16:9', '9:16', '1:1'],
    image_prompt_template: '{user_prompt}, {style_prompt}, coherent fantasy design',
    video_prompt_template: '{user_prompt}, fantasy illustration keyframe, stable costume and environment design',
    strength_guidance: 0.78,
    compatibility: 'image_video_future',
    constraints: ['Avoid named fantasy franchises.'],
    notes: 'Good for hero shots, scenes, posters.',
    tags: ['fantasy', 'concept-art', 'painterly'],
    training: trainingPlan('Train fantasy lighting, costume, and environment language without generic clutter.', ['Caption material, prop role, magic source, and environment depth.']),
  },
  {
    id: 'semi_realistic_stylization',
    ui_label: 'Semi-Realistic Stylization',
    safe_label: 'Semi-Realistic Stylization',
    category: 'illustration_drawing',
    short_description: 'Balanced stylization between realism and illustration.',
    long_description: 'A controlled semi-realistic style that keeps believable anatomy and materials while avoiding pure photographic output.',
    visual_language: 'Illustrated realism, believable forms, controlled simplification.',
    line_treatment: 'Subtle edge control, minimal or no hard outlines.',
    shading_mode: 'Painterly realistic shading with simplified detail.',
    color_logic: 'Natural but art-directed palette.',
    lighting_style: 'Cinematic soft light with controlled contrast.',
    texture_style: 'Painterly skin and materials, no raw camera texture.',
    composition_hints: 'Prioritize face, eyes, hands, and silhouette readability.',
    anatomy_tendency: 'Natural proportions with slightly idealized features.',
    environment_tendency: 'Believable but painterly spaces.',
    prompt_prefix: 'semi-realistic stylized illustration, believable anatomy, painterly realism',
    prompt_suffix: 'not a raw photograph, keep face and hands coherent',
    prompt_short: 'semi-realistic stylized illustration, believable anatomy',
    prompt_long: 'semi-realistic stylized illustration, believable anatomy, painterly realism, natural materials, controlled cinematic lighting',
    prompt_premium: 'semi-realistic stylized illustration, believable anatomy, painterly realism, coherent expressive eyes, correct hands, natural but art-directed materials, controlled cinematic lighting, no raw photographic camera texture',
    negative_prompt: `${COMMON_STYLIZED_NEGATIVE}, over-photographic skin pores, plastic skin, uncanny realism, cartoon exaggeration`,
    recommended_resolution: '1024-1344px',
    recommended_aspect_ratios: ['16:9', '9:16', '1:1'],
    image_prompt_template: '{user_prompt}, {style_prompt}, semi-realistic readability',
    video_prompt_template: '{user_prompt}, semi-realistic stylized keyframe, stable anatomy',
    strength_guidance: 0.68,
    compatibility: 'image_video_future',
    constraints: ['Do not drift into raw photorealism.'],
    notes: 'Useful bridge style when realism is too literal and cartoon is too strong.',
    tags: ['semi-realistic', 'illustration', 'character'],
    training: trainingPlan('Train a controlled bridge between realism and illustration.', ['Caption realism level, edge treatment, and material simplification.']),
  },
  ...(jsonStyleProfiles.styles as JsonStyleProfile[]).map(jsonProfileToStyleProfile),
]

export const STYLE_PROFILE_BY_ID: Record<string, StyleProfile> = STYLE_PROFILES.reduce<Record<string, StyleProfile>>((acc, profile) => {
  acc[profile.id] = profile
  return acc
}, {})

const STYLE_PROFILE_ALIASES: Record<string, string> = {
  fairytale_3d: 'family_friendly_fairytale_3d',
  disney_style: 'family_friendly_fairytale_3d',
  fairy_tale_animation: 'family_friendly_fairytale_3d',
  family_3d_animation: 'family_friendly_fairytale_3d',
  storybook_princess_animation: 'family_friendly_fairytale_3d',
}

export function getStyleProfile(styleId: string | null | undefined): StyleProfile | null {
  if (!styleId) return null
  return STYLE_PROFILE_BY_ID[styleId] ?? STYLE_PROFILE_BY_ID[STYLE_PROFILE_ALIASES[styleId]] ?? null
}

export function buildStylePromptLayer(profile: StyleProfile, variant: StylePromptVariant = 'premium'): string {
  const variantPrompt = variant === 'short'
    ? profile.prompt_short
    : variant === 'long'
      ? profile.prompt_long
      : profile.prompt_premium
  return [
    profile.trigger_token,
    profile.prompt_prefix,
    variantPrompt,
    profile.visual_language,
    profile.line_treatment,
    profile.shading_mode,
    profile.color_logic,
    profile.composition_hints,
    profile.prompt_suffix,
  ].filter(Boolean).join(', ')
}
