export type ImageStyleCategory =
  | 'realistic_photo'
  | 'cinematic'
  | 'illustration_drawing'
  | 'animation_cartoon'
  | 'anime_manga'
  | 'three_d_render'
  | 'graphic_design'
  | 'fantasy_scifi'
  | 'artistic_painting'
  | 'retro_special'
  | 'custom'

export type ImageStylePreset = {
  style_id: string
  style_label: string
  style_category: ImageStyleCategory
  style_prompt_modifier: string
  style_negative_modifier?: string
  preview_image: string
}

type ImageStylePresetDefinition = Omit<ImageStylePreset, 'preview_image'> & {
  preview_image_override?: string
}

const SELECTED_STYLE_PREVIEW_IDS = new Set([
  'anime_cinematic',
  'anime_clean',
  'chibi_kawaii',
  'cinematic_realism',
  'clean_cartoon',
  'comic_book',
  'commercial_ad',
  'concept_art',
  'cyberpunk',
  'documentary_realism',
  'dramatic_film',
  'editorial_illustration',
  'epic_fantasy',
  'european_comic',
  'fairytale_3d',
  'fashion_editorial',
  'graphic_novel',
  'lifestyle_photo',
  'low_poly_3d',
  'manga_ink',
  'mascot_cartoon',
  'music_video',
  'photorealistic',
  'portrait_photo',
  'product_photo',
  'detail_boost',
  'vector_flat',
  'poster_graphic',
  'watercolor',
  'pencil_sketch',
  'pixel_art',
  'sci_fi_future',
  'storybook_cartoon',
  'storybook_illustration',
  'stylized_3d',
  'toy_clay_3d',
])

function imageStylePreviewPath(style: ImageStylePresetDefinition): string {
  if (SELECTED_STYLE_PREVIEW_IDS.has(style.style_id)) {
    return `./style-previews/${style.style_id}.webp`
  }
  return style.preview_image_override ?? `./style-previews/${style.style_id}.webp`
}

export const IMAGE_STYLE_CATEGORY_LABELS: Record<ImageStyleCategory, string> = {
  realistic_photo: 'Realistic',
  cinematic: 'Cinematic',
  illustration_drawing: 'Illustration',
  animation_cartoon: 'Cartoon',
  anime_manga: 'Anime & Manga',
  three_d_render: '3D Animation',
  graphic_design: 'Design',
  fantasy_scifi: 'Fantasy & Sci-Fi',
  artistic_painting: 'Painting & Sketch',
  retro_special: 'Retro & Game',
  custom: 'Custom',
}

const IMAGE_STYLE_PRESET_DEFINITIONS: ImageStylePresetDefinition[] = [
  { style_id: 'photorealistic', style_label: 'Photorealistic', style_category: 'realistic_photo', style_prompt_modifier: 'photorealistic camera look, realistic optics, accurate visible colors, lifelike textures, detailed materials, high dynamic range, lifelike lighting', style_negative_modifier: 'cartoon, painterly, anime, artificial skin, plastic texture, overprocessed' },
  { style_id: 'portrait_photo', style_label: 'Portrait Photo', style_category: 'realistic_photo', style_prompt_modifier: 'professional portrait photography, flattering lens, natural facial detail, balanced skin tones, elegant composition, crisp readable eyes', style_negative_modifier: 'distorted face, bad eyes, waxy skin, harsh flash, over-smoothed skin', preview_image_override: './style-previews/portrait_photography.webp' },
  { style_id: 'fashion_editorial', style_label: 'Fashion Editorial', style_category: 'realistic_photo', style_prompt_modifier: 'high-fashion editorial photography, premium styling, magazine-quality lighting, elegant pose, luxury textures, polished campaign look', style_negative_modifier: 'cheap styling, amateur pose, wrinkled composition, low-end catalog look', preview_image_override: './style-previews/fashion_photography.webp' },
  { style_id: 'product_photo', style_label: 'Product Photo', style_category: 'realistic_photo', style_prompt_modifier: 'premium product photography, clean composition, controlled reflections, sharp edges, commercial lighting, high-end advertising quality', style_negative_modifier: 'clutter, distorted product, messy reflections, low quality render', preview_image_override: './style-previews/product_photography.webp' },
  { style_id: 'detail_boost', style_label: 'Detail Boost', style_category: 'realistic_photo', style_prompt_modifier: 'high-detail realistic finish, natural realistic eyes with layered iris texture and soft catchlights, crisp micro-contrast, refined skin texture, sharper materials, clean edges, high-resolution photographic detail without overprocessing', style_negative_modifier: 'over-sharpened, crunchy texture, noisy details, waxy skin, plastic face, fake eyelashes, painted eyelashes, glassy doll eyes, oversized catchlights, distorted iris, halos, artifacts' },
  { style_id: 'lifestyle_photo', style_label: 'Lifestyle Photo', style_category: 'realistic_photo', style_prompt_modifier: 'premium lifestyle photography, natural environment, believable moment, realistic lighting, polished social campaign composition', style_negative_modifier: 'over-staged, artificial pose, fantasy look, cartoon style', preview_image_override: './style-previews/documentary_style.webp' },
  { style_id: 'cinematic_realism', style_label: 'Cinematic Realism', style_category: 'cinematic', style_prompt_modifier: 'cinematic realism, realistic film scene, filmic color grading, high-end movie still composition, rich atmosphere, believable production design', style_negative_modifier: 'flat lighting, amateur look, video still artifacts, low production value', preview_image_override: './style-previews/cinematic.webp' },
  { style_id: 'dramatic_film', style_label: 'Dramatic Film', style_category: 'cinematic', style_prompt_modifier: 'dramatic film look, strong emotional atmosphere, cinematic contrast, expressive shadows, premium color grading, narrative composition', style_negative_modifier: 'flat mood, weak contrast, bland lighting, amateur framing', preview_image_override: './style-previews/cinematic_dramatic.webp' },
  { style_id: 'commercial_ad', style_label: 'Commercial Ad', style_category: 'cinematic', style_prompt_modifier: 'premium advertising visual style, clean commercial composition, strong product or subject appeal, polished lighting, high-end campaign look', style_negative_modifier: 'amateur ad, clutter, weak product focus, low-end catalog', preview_image_override: './style-previews/advertising_style.webp' },
  { style_id: 'music_video', style_label: 'Music Video', style_category: 'cinematic', style_prompt_modifier: 'modern music video look, dynamic composition, bold color grading, energetic atmosphere, stylized cinematic lighting', style_negative_modifier: 'static boring frame, flat lighting, weak color grading, documentary plainness', preview_image_override: './style-previews/high_end_film_look.webp' },
  { style_id: 'documentary_realism', style_label: 'Documentary', style_category: 'cinematic', style_prompt_modifier: 'documentary realism, natural camera feeling, credible ambient light, spontaneous scene, authentic cinematic observation', style_negative_modifier: 'over-staged, artificial pose, fantasy look, glossy commercial look', preview_image_override: './style-previews/documentary_style.webp' },
  { style_id: 'anime_clean', style_label: 'Anime', style_category: 'anime_manga', style_prompt_modifier: 'high-quality clean anime style, refined cel shading, expressive character design, polished background, vibrant controlled colors, readable eyes', style_negative_modifier: 'photorealistic skin, western cartoon, low-quality anime, distorted eyes', preview_image_override: './style-previews/anime.webp' },
  { style_id: 'anime_cinematic', style_label: 'Cinematic Anime', style_category: 'anime_manga', style_prompt_modifier: 'cinematic anime style, dramatic lighting, detailed environment, emotional composition, refined cel shading, premium animated film look', style_negative_modifier: 'flat anime, cheap TV look, low detail background, photorealistic face' },
  { style_id: 'manga_ink', style_label: 'Manga Ink', style_category: 'anime_manga', style_prompt_modifier: 'manga ink style, black-and-white comic page feeling, expressive eyes, clean linework, screentone shading, dynamic panel composition', style_negative_modifier: 'photorealistic, western comic, 3D render, messy anatomy', preview_image_override: './style-previews/manga.webp' },
  { style_id: 'chibi_kawaii', style_label: 'Chibi', style_category: 'anime_manga', style_prompt_modifier: 'chibi kawaii character style, cute simplified proportions, oversized head, tiny body, playful expression, clean anime coloring', style_negative_modifier: 'realistic proportions, scary mood, photorealism', preview_image_override: './style-previews/chibi.webp' },
  { style_id: 'clean_cartoon', style_label: 'Cartoon', style_category: 'animation_cartoon', style_prompt_modifier: 'clean modern cartoon style, simplified expressive shapes, readable outlines, playful color palette, charming animation-ready design', style_negative_modifier: 'photorealistic, gritty realism, overly complex texture', preview_image_override: './style-previews/cartoon.webp' },
  { style_id: 'mascot_cartoon', style_label: 'Mascot', style_category: 'animation_cartoon', style_prompt_modifier: 'friendly mascot cartoon style, brand-ready original character, simple expressive face, clear silhouette, cheerful colors', style_negative_modifier: 'existing mascot, logo imitation, photorealism, creepy proportions', preview_image_override: './style-previews/kids_illustration.webp' },
  { style_id: 'storybook_cartoon', style_label: 'Story Cartoon', style_category: 'animation_cartoon', style_prompt_modifier: 'soft narrative cartoon style, child-friendly storytelling, warm colors, friendly shapes, gentle background details', style_negative_modifier: 'dark horror, gritty realism, harsh contrast, adult editorial mood', preview_image_override: './style-previews/storybook_illustration.webp' },
  { style_id: 'disney_animation', style_label: 'Disney', style_category: 'animation_cartoon', style_prompt_modifier: 'Disney animation inspired family-friendly 2D animated film look, expressive hand-drawn character acting, clean appealing shapes, warm painted backgrounds, polished theatrical animation frame', style_negative_modifier: 'official character, existing character, copied franchise character, logo, watermark, photorealistic, live action, uncanny realism', preview_image_override: './style-previews/cartoon.webp' },
  { style_id: 'stylized_3d', style_label: 'Stylized 3D', style_category: 'three_d_render', style_prompt_modifier: 'stylized 3D art, simplified appealing forms, polished materials, controlled lighting, animation-ready design', style_negative_modifier: 'photorealism, noisy texture, low-quality render' },
  { style_id: 'fairytale_3d', style_label: 'Fairytale 3D', style_category: 'three_d_render', style_prompt_modifier: 'original family-friendly fairytale 3D animation style, soft rounded forms, expressive warm eyes, polished stylized 3D render, warm cinematic lighting', style_negative_modifier: 'copyrighted character, brand imitation, photorealistic skin, horror mood, uncanny valley, distorted face, malformed hands', preview_image_override: './style-previews/family_friendly_fairytale_3d.webp' },
  { style_id: 'pixar_3d', style_label: 'Pixar', style_category: 'three_d_render', style_prompt_modifier: 'Pixar inspired premium stylized 3D animated film look, polished CGI, appealing rounded forms, expressive original character design, soft global illumination, family-friendly cinematic composition', style_negative_modifier: 'official character, existing character, copied franchise character, logo, watermark, live action, photorealistic skin, uncanny valley, malformed hands', preview_image_override: './style-previews/family_friendly_fairytale_3d.webp' },
  { style_id: 'toy_clay_3d', style_label: 'Toy & Clay', style_category: 'three_d_render', style_prompt_modifier: 'toy and clay 3D style, tactile miniature forms, handmade charm, soft studio lighting, playful sculpted materials', style_negative_modifier: 'glossy CGI, photorealism, gritty realism, horror mood', preview_image_override: './style-previews/toy_style.webp' },
  { style_id: 'low_poly_3d', style_label: 'Low Poly 3D', style_category: 'three_d_render', style_prompt_modifier: 'low-poly 3D style, faceted geometry, simplified shapes, clean color blocks, stylized game art look', style_negative_modifier: 'photorealistic texture, overly detailed mesh, noisy rendering', preview_image_override: './style-previews/low_poly.webp' },
  { style_id: 'comic_book', style_label: 'Comic Book', style_category: 'illustration_drawing', style_prompt_modifier: 'comic book art style, bold ink lines, dynamic composition, expressive shading, panel-ready illustration, strong contrast', style_negative_modifier: 'photorealistic, soft blurry rendering, weak outlines' },
  { style_id: 'graphic_novel', style_label: 'Graphic Novel', style_category: 'illustration_drawing', style_prompt_modifier: 'graphic novel style, mature illustrated composition, strong linework, textured shading, dramatic storytelling, sequential art atmosphere', style_negative_modifier: 'childish cartoon, flat colors, weak line art' },
  { style_id: 'european_comic', style_label: 'Euro Comic', style_category: 'illustration_drawing', style_prompt_modifier: 'European album comic illustration, clean contour ink, readable flat color, precise background detail, controlled line weight, clear storytelling composition', style_negative_modifier: 'photorealistic, manga screentone, superhero exaggeration, messy sketch, photo texture' },
  { style_id: 'editorial_illustration', style_label: 'Editorial Illustration', style_category: 'illustration_drawing', style_prompt_modifier: 'modern editorial illustration, clean visual storytelling, refined shapes, balanced composition, premium magazine-ready communication style', style_negative_modifier: 'photorealistic camera look, noisy texture, messy lines', preview_image_override: './style-previews/illustration.webp' },
  { style_id: 'storybook_illustration', style_label: 'Storybook', style_category: 'illustration_drawing', style_prompt_modifier: 'storybook illustration, whimsical atmosphere, soft painterly details, charming characters, magical but gentle composition', style_negative_modifier: 'photorealistic, harsh realism, aggressive composition' },
  { style_id: 'studio_ghibli', style_label: 'Studio Ghibli', style_category: 'illustration_drawing', style_prompt_modifier: 'Studio Ghibli inspired hand-painted animation look, gentle painterly backgrounds, lush nature, warm human-scale storytelling, soft atmospheric light, poetic animated film frame', style_negative_modifier: 'official character, existing character, copied franchise character, logo, watermark, photorealistic, glossy 3D, harsh neon', preview_image_override: './style-previews/storybook_illustration.webp' },
  { style_id: 'concept_art', style_label: 'Concept Art', style_category: 'illustration_drawing', style_prompt_modifier: 'professional concept art, strong silhouette, production design, detailed environment, cinematic composition, entertainment industry quality', style_negative_modifier: 'flat design, weak silhouette, low detail, unfinished idea sketch' },
  { style_id: 'epic_fantasy', style_label: 'Epic Fantasy', style_category: 'fantasy_scifi', style_prompt_modifier: 'epic fantasy style, magical worldbuilding, grand environment, cinematic light rays, heroic scale, rich imaginative design', style_negative_modifier: 'mundane realism, flat lighting, generic design', preview_image_override: './style-previews/fantasy_art.webp' },
  { style_id: 'cyberpunk', style_label: 'Cyberpunk', style_category: 'fantasy_scifi', style_prompt_modifier: 'cyberpunk style, neon lights, futuristic city atmosphere, rain reflections, high-tech details, moody urban sci-fi look', style_negative_modifier: 'medieval fantasy, rural daylight, flat colors' },
  { style_id: 'sci_fi_future', style_label: 'Sci-Fi Future', style_category: 'fantasy_scifi', style_prompt_modifier: 'clean science fiction future style, advanced technology, futuristic city or spacecraft design, atmospheric lighting, detailed worldbuilding, cinematic scale', style_negative_modifier: 'medieval fantasy, low-tech props, generic modern room', preview_image_override: './style-previews/sci_fi_art.webp' },
  { style_id: 'vector_flat', style_label: 'Vector Flat', style_category: 'graphic_design', style_prompt_modifier: 'clean vector flat design, crisp shapes, scalable illustration, flat colors, precise edges, modern app-ready graphic style', style_negative_modifier: 'photorealistic texture, painterly brushwork, noisy gradients', preview_image_override: './style-previews/vector_art.webp' },
  { style_id: 'poster_graphic', style_label: 'Poster Graphic', style_category: 'graphic_design', style_prompt_modifier: 'modern poster graphic style, bold composition, strong focal point, graphic impact, clean visual hierarchy, print-ready key visual', style_negative_modifier: 'weak composition, cluttered layout, unreadable design', preview_image_override: './style-previews/poster_style.webp' },
  { style_id: 'watercolor', style_label: 'Watercolor', style_category: 'artistic_painting', style_prompt_modifier: 'watercolor painting style, translucent washes, soft paper texture, gentle gradients, delicate hand-painted look', style_negative_modifier: 'photorealistic, oil impasto, hard vector edges' },
  { style_id: 'pencil_sketch', style_label: 'Pencil Sketch', style_category: 'artistic_painting', style_prompt_modifier: 'pencil sketch style, graphite texture, visible hand-drawn lines, soft shading, preparatory drawing feeling', style_negative_modifier: 'over-polished render, photorealistic, flat vector', preview_image_override: './style-previews/pencil_drawing.webp' },
  { style_id: 'pixel_art', style_label: 'Pixel Art', style_category: 'retro_special', style_prompt_modifier: 'pixel art style, crisp pixel grid, limited color palette, retro game aesthetic, readable silhouettes', style_negative_modifier: 'photorealistic, blurry pixels, smooth gradients, high-detail painting' },
]

export const IMAGE_STYLE_PRESETS: ImageStylePreset[] = IMAGE_STYLE_PRESET_DEFINITIONS.map((style) => ({
  style_id: style.style_id,
  style_label: style.style_label,
  style_category: style.style_category,
  style_prompt_modifier: style.style_prompt_modifier,
  style_negative_modifier: style.style_negative_modifier,
  preview_image: imageStylePreviewPath(style),
}))

export const CUSTOM_IMAGE_STYLE_PRESET: ImageStylePreset = {
  style_id: 'custom',
  style_label: 'Custom Style',
  style_category: 'custom',
  style_prompt_modifier: '',
  style_negative_modifier: '',
  preview_image: './style-previews/custom.webp',
}

export const ALL_IMAGE_STYLE_PRESETS = [...IMAGE_STYLE_PRESETS, CUSTOM_IMAGE_STYLE_PRESET]

const LEGACY_STYLE_ALIASES: Record<string, string> = {
  realistic: 'photorealistic',
  ultra_realistic: 'photorealistic',
  hyper_realistic: 'photorealistic',
  studio_photography: 'portrait_photo',
  portrait_photography: 'portrait_photo',
  fashion_photography: 'fashion_editorial',
  product_photography: 'product_photo',
  architectural_photography: 'photorealistic',
  documentary_style: 'documentary_realism',
  cinematic: 'cinematic_realism',
  cinematic_dramatic: 'dramatic_film',
  movie_still: 'cinematic_realism',
  high_end_film_look: 'cinematic_realism',
  noir_cinematic: 'dramatic_film',
  epic_cinematic: 'dramatic_film',
  sci_fi_cinematic: 'sci_fi_future',
  fantasy_cinematic: 'epic_fantasy',
  illustration: 'editorial_illustration',
  digital_painting: 'concept_art',
  semi_realistic_stylization: 'editorial_illustration',
  matte_painting: 'concept_art',
  western_comic: 'comic_book',
  line_art: 'pencil_sketch',
  ink_drawing: 'graphic_novel',
  sketch: 'pencil_sketch',
  pencil_drawing: 'pencil_sketch',
  charcoal_drawing: 'pencil_sketch',
  manga: 'manga_ink',
  anime: 'anime_clean',
  anime_90s: 'anime_clean',
  chibi: 'chibi_kawaii',
  cartoon: 'clean_cartoon',
  cel_shading: 'clean_cartoon',
  kids_illustration: 'storybook_cartoon',
  fairy_tale_animation: 'fairytale_3d',
  classic_animated_film: 'clean_cartoon',
  disney: 'disney_animation',
  disney_style: 'disney_animation',
  disney_animation: 'disney_animation',
  storybook_princess_animation: 'fairytale_3d',
  family_3d_animation: 'fairytale_3d',
  clay_animation: 'toy_clay_3d',
  '3d_render': 'stylized_3d',
  realistic_3d: 'stylized_3d',
  clay_render: 'toy_clay_3d',
  toy_style: 'toy_clay_3d',
  isometric: 'low_poly_3d',
  low_poly: 'low_poly_3d',
  game_art: 'low_poly_3d',
  cgi: 'stylized_3d',
  pixar: 'pixar_3d',
  pixar_style: 'pixar_3d',
  pixar_animation: 'pixar_3d',
  studio_ghibli: 'studio_ghibli',
  ghibli: 'studio_ghibli',
  ghibli_style: 'studio_ghibli',
  vector_art: 'vector_flat',
  flat_illustration: 'vector_flat',
  minimal: 'vector_flat',
  poster_style: 'poster_graphic',
  advertising_style: 'commercial_ad',
  editorial_layout: 'editorial_illustration',
  luxury_brand: 'commercial_ad',
  infographic_style: 'vector_flat',
  fantasy_art: 'epic_fantasy',
  dark_fantasy: 'epic_fantasy',
  surreal: 'concept_art',
  dreamlike: 'storybook_illustration',
  steampunk: 'sci_fi_future',
  gothic: 'epic_fantasy',
  sci_fi_art: 'sci_fi_future',
  oil_painting: 'watercolor',
  acrylic_painting: 'watercolor',
  pastel_art: 'watercolor',
  renaissance_painting: 'watercolor',
  baroque_painting: 'watercolor',
  impressionist: 'watercolor',
  retro: 'pixel_art',
  vaporwave: 'pixel_art',
  synthwave: 'pixel_art',
  pop_art: 'poster_graphic',
  abstract: 'concept_art',
}

export function getImageStylePreset(styleId: string): ImageStylePreset | null {
  return ALL_IMAGE_STYLE_PRESETS.find((style) => style.style_id === styleId)
    ?? ALL_IMAGE_STYLE_PRESETS.find((style) => style.style_id === LEGACY_STYLE_ALIASES[styleId])
    ?? null
}

export function getSafeStyleAlias(input: string): ImageStylePreset | null {
  const normalized = input.trim().toLowerCase()
  if (normalized === 'disney') return getImageStylePreset('disney_animation')
  if (normalized === 'pixar') return getImageStylePreset('pixar_3d')
  if (normalized === 'studio ghibli' || normalized === 'ghibli') return getImageStylePreset('studio_ghibli')
  return null
}
