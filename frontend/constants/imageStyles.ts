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

type ImageStylePresetDefinition = Omit<ImageStylePreset, 'preview_image'>

export const IMAGE_STYLE_CATEGORY_LABELS: Record<ImageStyleCategory, string> = {
  realistic_photo: 'Realistic Photo',
  cinematic: 'Cinematic',
  illustration_drawing: 'Illustration & Drawing',
  animation_cartoon: 'Animation & Cartoon',
  anime_manga: 'Anime & Manga',
  three_d_render: '3D Render',
  graphic_design: 'Graphic Design',
  fantasy_scifi: 'Fantasy & Sci-Fi',
  artistic_painting: 'Artistic Painting',
  retro_special: 'Retro & Special',
  custom: 'Custom',
}

const IMAGE_STYLE_PRESET_DEFINITIONS: ImageStylePresetDefinition[] = [
  { style_id: 'realistic', style_label: 'Realistic', style_category: 'realistic_photo', style_prompt_modifier: 'realistic visual style, natural proportions, believable materials, accurate lighting, lifelike details', style_negative_modifier: 'cartoon, anime, illustration, CGI, unrealistic proportions' },
  { style_id: 'photorealistic', style_label: 'Photorealistic', style_category: 'realistic_photo', style_prompt_modifier: 'photorealistic camera look, realistic optics, accurate visible colors, lifelike textures, detailed materials, high dynamic range, lifelike lighting', style_negative_modifier: 'cartoon, painterly, anime, artificial skin, plastic texture, overprocessed' },
  { style_id: 'ultra_realistic', style_label: 'Ultra Realistic', style_category: 'realistic_photo', style_prompt_modifier: 'ultra realistic photographic detail, realistic lens rendering, realistic light behavior, high fidelity physical traits, high-resolution photographic realism, precise textures', style_negative_modifier: 'low detail, flat lighting, unrealistic anatomy, waxy skin, artificial rendering' },
  { style_id: 'hyper_realistic', style_label: 'Hyper Realistic', style_category: 'realistic_photo', style_prompt_modifier: 'hyper realistic, extremely sharp detail, lifelike surfaces, realistic imperfections, premium photographic fidelity, natural lens rendering', style_negative_modifier: 'cartoonish, simplified detail, over-smoothed, uncanny face, synthetic look' },
  { style_id: 'studio_photography', style_label: 'Studio Photography', style_category: 'realistic_photo', style_prompt_modifier: 'professional studio photography, controlled lighting, softbox highlights, clean background, crisp focus, commercial photography quality', style_negative_modifier: 'harsh shadows, uncontrolled light, amateur composition, noisy background' },
  { style_id: 'portrait_photography', style_label: 'Portrait Photography', style_category: 'realistic_photo', style_prompt_modifier: 'professional portrait photography, flattering lens, natural facial detail, shallow depth of field, balanced skin tones, elegant composition', style_negative_modifier: 'distorted face, bad eyes, waxy skin, harsh flash, over-smoothed skin' },
  { style_id: 'fashion_photography', style_label: 'Fashion Photography', style_category: 'realistic_photo', style_prompt_modifier: 'high-fashion photography, editorial composition, premium styling, luxury textures, controlled pose, magazine-quality lighting', style_negative_modifier: 'cheap styling, amateur pose, wrinkled composition, low-end catalog look' },
  { style_id: 'product_photography', style_label: 'Product Photography', style_category: 'realistic_photo', style_prompt_modifier: 'premium product photography, clean composition, controlled reflections, sharp edges, commercial lighting, high-end advertising quality', style_negative_modifier: 'clutter, distorted product, messy reflections, low quality render' },
  { style_id: 'architectural_photography', style_label: 'Architectural Photography', style_category: 'realistic_photo', style_prompt_modifier: 'professional architectural photography, straight vertical lines, realistic spatial perspective, premium interior/exterior lighting, crisp material detail', style_negative_modifier: 'warped architecture, tilted lines, distorted perspective, blurry materials' },
  { style_id: 'documentary_style', style_label: 'Documentary Style', style_category: 'realistic_photo', style_prompt_modifier: 'documentary photography style, natural environment, authentic moment, realistic lighting, candid composition, journalistic realism', style_negative_modifier: 'over-staged, artificial pose, fantasy look, cartoon style' },
  { style_id: 'cinematic', style_label: 'Cinematic', style_category: 'cinematic', style_prompt_modifier: 'cinematic lighting, dramatic composition, filmic color grading, high-end movie still look, rich atmosphere, depth of field', style_negative_modifier: 'flat lighting, amateur look, video still artifacts, low production value' },
  { style_id: 'cinematic_dramatic', style_label: 'Cinematic Dramatic', style_category: 'cinematic', style_prompt_modifier: 'dramatic cinematic lighting, strong contrast, emotional atmosphere, film still composition, expressive shadows, premium color grading', style_negative_modifier: 'flat mood, weak contrast, bland lighting, amateur framing' },
  { style_id: 'movie_still', style_label: 'Movie Still', style_category: 'cinematic', style_prompt_modifier: 'high-end movie still, realistic film scene, cinematic lens, professional production design, natural motion feeling, atmospheric lighting', style_negative_modifier: 'behind-the-scenes look, cheap set, flat television lighting' },
  { style_id: 'high_end_film_look', style_label: 'High-End Film Look', style_category: 'cinematic', style_prompt_modifier: 'premium film look, refined cinematic color science, anamorphic feeling, soft highlights, deep shadows, high-budget production value', style_negative_modifier: 'digital harshness, over-sharpened, flat color, cheap video look' },
  { style_id: 'noir_cinematic', style_label: 'Noir Cinematic', style_category: 'cinematic', style_prompt_modifier: 'film noir cinematic style, moody black-and-white or muted tones, strong shadows, venetian light, mystery atmosphere, classic dramatic framing', style_negative_modifier: 'bright cheerful colors, flat lighting, modern glossy look' },
  { style_id: 'epic_cinematic', style_label: 'Epic Cinematic', style_category: 'cinematic', style_prompt_modifier: 'epic cinematic scale, grand composition, sweeping atmosphere, dramatic light rays, large-scale scene, high-budget fantasy/adventure film look', style_negative_modifier: 'small scale, bland background, weak composition, low drama' },
  { style_id: 'sci_fi_cinematic', style_label: 'Sci-Fi Cinematic', style_category: 'cinematic', style_prompt_modifier: 'science fiction cinematic style, futuristic lighting, advanced technology design, atmospheric haze, neon reflections, high-end sci-fi movie still', style_negative_modifier: 'retro cheap props, inconsistent technology, flat environment' },
  { style_id: 'fantasy_cinematic', style_label: 'Fantasy Cinematic', style_category: 'cinematic', style_prompt_modifier: 'fantasy cinematic style, magical atmosphere, epic lighting, rich worldbuilding, dramatic environment, high-end fantasy film look', style_negative_modifier: 'generic fantasy, cheap costume, flat lighting, low detail' },
  { style_id: 'illustration', style_label: 'Illustration', style_category: 'illustration_drawing', style_prompt_modifier: 'detailed illustration, clean visual storytelling, balanced composition, expressive shapes, polished digital art', style_negative_modifier: 'photorealistic camera look, noisy texture, messy lines' },
  { style_id: 'digital_painting', style_label: 'Digital Painting', style_category: 'illustration_drawing', style_prompt_modifier: 'polished digital painting, painterly brushwork, rich colors, soft gradients, concept art quality, detailed lighting', style_negative_modifier: 'photographic realism, noisy photo texture, unfinished sketch' },
  { style_id: 'concept_art', style_label: 'Concept Art', style_category: 'illustration_drawing', style_prompt_modifier: 'professional concept art, strong silhouette, production design, detailed environment, cinematic composition, entertainment industry quality', style_negative_modifier: 'flat design, weak silhouette, low detail, unfinished idea sketch' },
  { style_id: 'matte_painting', style_label: 'Matte Painting', style_category: 'illustration_drawing', style_prompt_modifier: 'cinematic matte painting, expansive environment, atmospheric perspective, detailed background, film production art quality', style_negative_modifier: 'small scene, poor perspective, flat background, low resolution' },
  { style_id: 'comic_book', style_label: 'Comic Book', style_category: 'illustration_drawing', style_prompt_modifier: 'comic book art style, bold ink lines, dynamic composition, expressive shading, panel-ready illustration, strong contrast', style_negative_modifier: 'photorealistic, soft blurry rendering, weak outlines' },
  { style_id: 'graphic_novel', style_label: 'Graphic Novel', style_category: 'illustration_drawing', style_prompt_modifier: 'graphic novel style, mature illustrated composition, strong linework, textured shading, dramatic storytelling, sequential art atmosphere', style_negative_modifier: 'childish cartoon, flat colors, weak line art' },
  { style_id: 'western_comic', style_label: 'Western Comic', style_category: 'illustration_drawing', style_prompt_modifier: 'western comic style, bold anatomy, dynamic pose, dramatic ink shadows, energetic action composition, vibrant comic coloring', style_negative_modifier: 'manga style, photorealism, flat composition' },
  { style_id: 'line_art', style_label: 'Line Art', style_category: 'illustration_drawing', style_prompt_modifier: 'clean line art, precise outlines, minimal shading, elegant contour drawing, crisp black lines', style_negative_modifier: 'messy lines, heavy paint, noisy texture, photorealistic rendering' },
  { style_id: 'ink_drawing', style_label: 'Ink Drawing', style_category: 'illustration_drawing', style_prompt_modifier: 'traditional ink drawing, expressive hatching, bold black lines, hand-drawn texture, detailed pen work', style_negative_modifier: 'digital smoothness, flat vector, photorealistic shading' },
  { style_id: 'sketch', style_label: 'Sketch', style_category: 'illustration_drawing', style_prompt_modifier: 'artistic sketch style, visible construction lines, expressive loose strokes, hand-drawn feeling, dynamic draft quality', style_negative_modifier: 'over-polished render, photorealistic, flat vector' },
  { style_id: 'pencil_drawing', style_label: 'Pencil Drawing', style_category: 'illustration_drawing', style_prompt_modifier: 'pencil drawing style, graphite texture, soft shading, visible pencil strokes, realistic hand-drawn detail', style_negative_modifier: 'digital paint, saturated color, glossy render' },
  { style_id: 'charcoal_drawing', style_label: 'Charcoal Drawing', style_category: 'illustration_drawing', style_prompt_modifier: 'charcoal drawing, deep smudged shadows, textured paper, expressive monochrome values, dramatic hand-drawn marks', style_negative_modifier: 'clean vector, glossy digital, saturated color' },
  { style_id: 'manga', style_label: 'Manga', style_category: 'anime_manga', style_prompt_modifier: 'manga art style, black-and-white comic page feeling, expressive eyes, clean linework, screentone shading, dynamic panel composition', style_negative_modifier: 'photorealistic, western comic, 3D render, messy anatomy' },
  { style_id: 'anime', style_label: 'Anime', style_category: 'anime_manga', style_prompt_modifier: 'high-quality anime style, clean cel shading, expressive character design, polished background, vibrant but controlled colors, cinematic anime composition', style_negative_modifier: 'photorealistic skin, western cartoon, low-quality anime, distorted eyes' },
  { style_id: 'anime_cinematic', style_label: 'Cinematic Anime', style_category: 'anime_manga', style_prompt_modifier: 'cinematic anime style, dramatic lighting, detailed environment, emotional composition, refined cel shading, premium animated film look', style_negative_modifier: 'flat anime, cheap TV look, low detail background, photorealistic face' },
  { style_id: 'anime_90s', style_label: '90s Anime', style_category: 'anime_manga', style_prompt_modifier: '1990s anime inspired style, hand-painted background feeling, cel animation look, nostalgic color palette, expressive linework', style_negative_modifier: 'modern glossy 3D, photorealistic, cheap digital gradients' },
  { style_id: 'chibi', style_label: 'Chibi', style_category: 'anime_manga', style_prompt_modifier: 'chibi character style, cute simplified proportions, oversized head, tiny body, playful expression, clean anime coloring', style_negative_modifier: 'realistic proportions, scary mood, photorealism' },
  { style_id: 'cartoon', style_label: 'Cartoon', style_category: 'animation_cartoon', style_prompt_modifier: 'cartoon style, simplified expressive shapes, clean outlines, playful color palette, charming animation-ready design', style_negative_modifier: 'photorealistic, gritty realism, overly complex texture' },
  { style_id: 'kids_illustration', style_label: 'Kids Illustration', style_category: 'animation_cartoon', style_prompt_modifier: "children's book illustration style, warm colors, friendly shapes, soft textures, gentle storytelling composition", style_negative_modifier: 'dark horror, gritty realism, harsh contrast, adult editorial mood' },
  { style_id: 'storybook_illustration', style_label: 'Storybook Illustration', style_category: 'animation_cartoon', style_prompt_modifier: 'storybook illustration, whimsical atmosphere, soft painterly details, charming characters, magical but gentle composition', style_negative_modifier: 'photorealistic, harsh realism, aggressive composition' },
  { style_id: 'fairy_tale_animation', style_label: 'Fairy-Tale Animation', style_category: 'animation_cartoon', style_prompt_modifier: 'fairy-tale animation style, magical atmosphere, elegant shapes, soft glowing colors, enchanting animated story look', style_negative_modifier: 'dark gritty realism, horror, photorealistic camera look' },
  { style_id: 'classic_animated_film', style_label: 'Classic Animated Film', style_category: 'animation_cartoon', style_prompt_modifier: 'classic animated film style, hand-drawn inspired animation look, expressive characters, elegant backgrounds, warm cinematic color palette', style_negative_modifier: 'photorealistic, modern plastic CGI, messy linework' },
  { style_id: 'storybook_princess_animation', style_label: 'Storybook Princess Animation', style_category: 'animation_cartoon', style_prompt_modifier: 'storybook princess animation style, elegant fairy-tale character design, graceful shapes, polished hand-drawn inspired look, magical warm lighting', style_negative_modifier: 'photorealism, horror, gritty texture, distorted cartoon anatomy' },
  { style_id: 'family_3d_animation', style_label: 'Family 3D Animation', style_category: 'animation_cartoon', style_prompt_modifier: 'family-friendly 3D animated film style, expressive stylized characters, polished 3D surfaces, soft cinematic lighting, charming emotional look', style_negative_modifier: 'photorealism, uncanny realism, low-quality plastic, harsh render' },
  { style_id: 'clay_animation', style_label: 'Clay Animation', style_category: 'animation_cartoon', style_prompt_modifier: 'clay animation style, handmade clay texture, stop-motion charm, soft imperfections, tactile sculpted forms', style_negative_modifier: 'glossy CGI, photorealism, flat vector' },
  { style_id: '3d_render', style_label: '3D Render', style_category: 'three_d_render', style_prompt_modifier: 'high-quality 3D render, clean geometry, realistic materials, global illumination, polished rendering, sharp details', style_negative_modifier: 'low-poly unless requested, noisy render, bad topology, photorealistic camera noise' },
  { style_id: 'realistic_3d', style_label: 'Realistic 3D', style_category: 'three_d_render', style_prompt_modifier: 'realistic 3D rendering, physically based materials, ray-traced lighting, realistic reflections, high-end CGI quality', style_negative_modifier: 'cartoon, clay, low-poly, flat lighting, poor materials' },
  { style_id: 'stylized_3d', style_label: 'Stylized 3D', style_category: 'three_d_render', style_prompt_modifier: 'stylized 3D art, simplified appealing forms, polished materials, controlled lighting, animation-ready design', style_negative_modifier: 'photorealism, noisy texture, low-quality render' },
  { style_id: 'clay_render', style_label: 'Clay Render', style_category: 'three_d_render', style_prompt_modifier: 'clay render style, matte monochrome material, soft studio lighting, clean form study, sculptural 3D look', style_negative_modifier: 'textured materials, colorful patterns, photorealistic skin' },
  { style_id: 'toy_style', style_label: 'Toy Style', style_category: 'three_d_render', style_prompt_modifier: 'toy-like 3D style, miniature proportions, plastic or vinyl material, playful design, collectible figure look', style_negative_modifier: 'realistic human skin, gritty realism, horror mood' },
  { style_id: 'isometric', style_label: 'Isometric', style_category: 'three_d_render', style_prompt_modifier: 'isometric view, clean geometric composition, miniature world feeling, balanced top-down perspective, polished design', style_negative_modifier: 'fisheye perspective, distorted camera, messy composition' },
  { style_id: 'low_poly', style_label: 'Low Poly', style_category: 'three_d_render', style_prompt_modifier: 'low-poly 3D style, faceted geometry, simplified shapes, clean color blocks, stylized game art look', style_negative_modifier: 'photorealistic texture, overly detailed mesh, noisy rendering' },
  { style_id: 'game_art', style_label: 'Game Art', style_category: 'three_d_render', style_prompt_modifier: 'high-quality game art, optimized stylized design, strong silhouette, readable shapes, polished environment or character presentation', style_negative_modifier: 'weak silhouette, clutter, low-quality asset, messy texture' },
  { style_id: 'cgi', style_label: 'CGI', style_category: 'three_d_render', style_prompt_modifier: 'high-end CGI style, realistic rendering pipeline, detailed materials, controlled lighting, polished commercial visual effects quality', style_negative_modifier: 'bad render, noisy shadows, low-poly artifacts unless requested' },
  { style_id: 'vector_art', style_label: 'Vector Art', style_category: 'graphic_design', style_prompt_modifier: 'clean vector art, crisp shapes, scalable illustration, flat colors, precise edges, modern graphic style', style_negative_modifier: 'photorealistic texture, painterly brushwork, noisy gradients' },
  { style_id: 'flat_illustration', style_label: 'Flat Illustration', style_category: 'graphic_design', style_prompt_modifier: 'flat illustration style, minimal shading, clean shapes, modern editorial design, balanced color palette', style_negative_modifier: 'photorealistic, detailed texture, messy gradients' },
  { style_id: 'minimal', style_label: 'Minimal', style_category: 'graphic_design', style_prompt_modifier: 'minimal visual style, clean composition, simple shapes, lots of negative space, refined modern design', style_negative_modifier: 'cluttered, overly detailed, noisy background, chaotic composition' },
  { style_id: 'poster_style', style_label: 'Poster Style', style_category: 'graphic_design', style_prompt_modifier: 'poster design style, bold composition, strong focal point, graphic impact, clean visual hierarchy, print-ready feeling', style_negative_modifier: 'weak composition, cluttered layout, unreadable design' },
  { style_id: 'advertising_style', style_label: 'Advertising Style', style_category: 'graphic_design', style_prompt_modifier: 'premium advertising visual style, clean commercial composition, strong brand appeal, polished lighting, high-end campaign look', style_negative_modifier: 'amateur ad, clutter, weak product focus, low-end catalog' },
  { style_id: 'editorial_layout', style_label: 'Editorial Layout', style_category: 'graphic_design', style_prompt_modifier: 'editorial magazine style, refined composition, premium layout feeling, sophisticated visual hierarchy, elegant spacing', style_negative_modifier: 'messy layout, cheap design, chaotic spacing' },
  { style_id: 'luxury_brand', style_label: 'Luxury Brand', style_category: 'graphic_design', style_prompt_modifier: 'luxury brand visual style, refined minimalism, premium materials, elegant lighting, sophisticated composition, high-end campaign mood', style_negative_modifier: 'cheap look, cluttered composition, harsh colors, low-end design' },
  { style_id: 'infographic_style', style_label: 'Infographic Style', style_category: 'graphic_design', style_prompt_modifier: 'infographic style, clear visual hierarchy, structured composition, clean icons, readable layout, modern information design', style_negative_modifier: 'messy text, unreadable labels, clutter, photorealistic chaos' },
  { style_id: 'fantasy_art', style_label: 'Fantasy Art', style_category: 'fantasy_scifi', style_prompt_modifier: 'fantasy art style, magical atmosphere, detailed mythical environment, epic lighting, rich imaginative design', style_negative_modifier: 'mundane realism, flat lighting, generic design' },
  { style_id: 'dark_fantasy', style_label: 'Dark Fantasy', style_category: 'fantasy_scifi', style_prompt_modifier: 'dark fantasy art style, gothic atmosphere, dramatic shadows, mystical environment, intense mood, highly detailed fantasy design', style_negative_modifier: 'cheerful cartoon, bright childish palette, flat composition' },
  { style_id: 'surreal', style_label: 'Surreal', style_category: 'fantasy_scifi', style_prompt_modifier: 'surreal visual style, dream logic, unexpected elements, symbolic composition, imaginative atmosphere, refined artistic execution', style_negative_modifier: 'literal realism, boring composition, generic scene' },
  { style_id: 'dreamlike', style_label: 'Dreamlike', style_category: 'fantasy_scifi', style_prompt_modifier: 'dreamlike atmosphere, soft glowing light, ethereal mood, gentle surreal details, poetic composition', style_negative_modifier: 'harsh realism, gritty texture, flat lighting' },
  { style_id: 'cyberpunk', style_label: 'Cyberpunk', style_category: 'fantasy_scifi', style_prompt_modifier: 'cyberpunk style, neon lights, futuristic city atmosphere, rain reflections, high-tech details, moody urban sci-fi look', style_negative_modifier: 'medieval fantasy, rural daylight, flat colors' },
  { style_id: 'steampunk', style_label: 'Steampunk', style_category: 'fantasy_scifi', style_prompt_modifier: 'steampunk style, brass machinery, Victorian industrial design, gears and steam, warm metallic palette, retro-futuristic atmosphere', style_negative_modifier: 'clean modern minimalism, neon cyberpunk, plastic futuristic props' },
  { style_id: 'gothic', style_label: 'Gothic', style_category: 'fantasy_scifi', style_prompt_modifier: 'gothic visual style, ornate architecture, dark romantic atmosphere, dramatic shadows, antique textures, mysterious mood', style_negative_modifier: 'bright modern minimalism, playful cartoon, flat lighting' },
  { style_id: 'sci_fi_art', style_label: 'Sci-Fi Art', style_category: 'fantasy_scifi', style_prompt_modifier: 'science fiction art, advanced technology, futuristic design language, atmospheric lighting, detailed worldbuilding, cinematic scale', style_negative_modifier: 'medieval fantasy, low-tech props, generic modern room' },
  { style_id: 'watercolor', style_label: 'Watercolor', style_category: 'artistic_painting', style_prompt_modifier: 'watercolor painting style, translucent washes, soft paper texture, gentle gradients, delicate hand-painted look', style_negative_modifier: 'photorealistic, oil impasto, hard vector edges' },
  { style_id: 'oil_painting', style_label: 'Oil Painting', style_category: 'artistic_painting', style_prompt_modifier: 'oil painting style, rich brush strokes, layered paint texture, classical lighting, painterly realism, canvas texture', style_negative_modifier: 'flat digital vector, photorealistic camera noise, plastic render' },
  { style_id: 'acrylic_painting', style_label: 'Acrylic Painting', style_category: 'artistic_painting', style_prompt_modifier: 'acrylic painting style, bold color layers, visible brushwork, textured surface, expressive painterly composition', style_negative_modifier: 'photorealistic, smooth CGI, flat vector' },
  { style_id: 'pastel_art', style_label: 'Pastel Art', style_category: 'artistic_painting', style_prompt_modifier: 'pastel art style, soft powdery texture, gentle blended colors, delicate shading, paper grain', style_negative_modifier: 'hard digital edges, glossy 3D render, harsh contrast' },
  { style_id: 'renaissance_painting', style_label: 'Renaissance Painting', style_category: 'artistic_painting', style_prompt_modifier: 'renaissance painting inspired style, classical composition, balanced anatomy, warm chiaroscuro lighting, old master atmosphere', style_negative_modifier: 'modern photo look, cartoon, neon colors, digital UI style' },
  { style_id: 'baroque_painting', style_label: 'Baroque Painting', style_category: 'artistic_painting', style_prompt_modifier: 'baroque painting inspired style, dramatic chiaroscuro, rich fabrics, theatrical composition, deep shadows, classical painterly detail', style_negative_modifier: 'flat minimalism, cartoon, futuristic neon' },
  { style_id: 'impressionist', style_label: 'Impressionist', style_category: 'artistic_painting', style_prompt_modifier: 'impressionist painting style, visible loose brush strokes, atmospheric light, vibrant color touches, soft outdoor feeling', style_negative_modifier: 'sharp photorealism, vector edges, CGI render' },
  { style_id: 'retro', style_label: 'Retro', style_category: 'retro_special', style_prompt_modifier: 'retro visual style, nostalgic colors, vintage design cues, period-inspired composition, analog texture', style_negative_modifier: 'ultra-modern minimalism, futuristic neon unless requested' },
  { style_id: 'vaporwave', style_label: 'Vaporwave', style_category: 'retro_special', style_prompt_modifier: 'vaporwave aesthetic, pastel neon colors, retro digital mood, surreal grid elements, nostalgic 80s/90s atmosphere', style_negative_modifier: 'natural documentary realism, muted palette, medieval fantasy' },
  { style_id: 'synthwave', style_label: 'Synthwave', style_category: 'retro_special', style_prompt_modifier: 'synthwave style, neon sunset palette, retro-futuristic atmosphere, glowing grids, cinematic 1980s-inspired mood', style_negative_modifier: 'flat daylight, natural muted colors, medieval texture' },
  { style_id: 'pixel_art', style_label: 'Pixel Art', style_category: 'retro_special', style_prompt_modifier: 'pixel art style, crisp pixel grid, limited color palette, retro game aesthetic, readable silhouettes', style_negative_modifier: 'photorealistic, blurry pixels, smooth gradients, high-detail painting' },
  { style_id: 'pop_art', style_label: 'Pop Art', style_category: 'retro_special', style_prompt_modifier: 'pop art style, bold colors, graphic contrast, halftone texture, iconic composition, playful commercial art energy', style_negative_modifier: 'muted realism, subtle lighting, low contrast' },
  { style_id: 'abstract', style_label: 'Abstract', style_category: 'retro_special', style_prompt_modifier: 'abstract art style, non-literal composition, expressive shapes, color relationships, visual rhythm, artistic interpretation', style_negative_modifier: 'literal documentary realism, overly detailed natural scene' },
]

export const IMAGE_STYLE_PRESETS: ImageStylePreset[] = IMAGE_STYLE_PRESET_DEFINITIONS.map((style) => ({
  ...style,
  preview_image: `./style-previews/${style.style_id}.webp`,
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

export function getImageStylePreset(styleId: string): ImageStylePreset | null {
  return ALL_IMAGE_STYLE_PRESETS.find((style) => style.style_id === styleId) ?? null
}

export function getSafeStyleAlias(input: string): ImageStylePreset | null {
  const normalized = input.trim().toLowerCase()
  if (normalized === 'disney') return getImageStylePreset('storybook_princess_animation')
  if (normalized === 'pixar') return getImageStylePreset('family_3d_animation')
  return null
}
