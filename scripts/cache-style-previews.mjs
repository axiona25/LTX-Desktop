import fs from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const sourcePath = path.join(root, 'frontend/constants/imageStyles.ts')
const outDir = path.join(root, 'public/style-previews')
const source = await fs.readFile(sourcePath, 'utf8')

const presets = source.split('\n')
  .filter((line) => line.includes('style_id:'))
  .map((line) => {
    const id = line.match(/style_id:\s*'([^']+)'/)?.[1]
    const label = line.match(/style_label:\s*'([^']+)'/)?.[1]
    const category = line.match(/style_category:\s*'([^']+)'/)?.[1]
    const modifier = (
      line.match(/style_prompt_modifier:\s*'(.+)'\s*,\s*style_negative_modifier/)?.[1]
      ?? line.match(/style_prompt_modifier:\s*"(.+)"\s*,\s*style_negative_modifier/)?.[1]
    )?.replace(/\\'/g, "'")
    return id && label && category && modifier ? { id, label, category, modifier } : null
  })
  .filter(Boolean)
  .filter((style) => style.id !== 'custom')

await fs.mkdir(outDir, { recursive: true })

function hash(input) {
  return Array.from(input).reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0) >>> 0
}

function hsl(seed, s = 70, l = 55, offset = 0) {
  return `hsl(${(seed + offset) % 360} ${s}% ${l}%)`
}

function esc(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function primitives(style, seed) {
  const c1 = hsl(seed, 72, 58)
  const c2 = hsl(seed, 64, 32, 85)
  const c3 = hsl(seed, 86, 72, 170)
  const c4 = hsl(seed, 56, 18, 250)
  const label = esc(style.label)

  const common = `
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="0.55" stop-color="${c2}"/><stop offset="1" stop-color="${c4}"/></linearGradient>
      <radialGradient id="r" cx="35%" cy="28%" r="70%"><stop offset="0" stop-color="${c3}" stop-opacity="0.95"/><stop offset="0.55" stop-color="${c1}" stop-opacity="0.35"/><stop offset="1" stop-color="${c4}" stop-opacity="0"/></radialGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="8"/></filter>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.18"/></feComponentTransfer></filter>
    </defs>
    <rect width="420" height="300" rx="28" fill="url(#g)"/>
    <rect width="420" height="300" rx="28" fill="url(#r)"/>
  `

  const signature = `
    <rect x="0" y="0" width="420" height="300" rx="28" fill="none" stroke="rgba(255,255,255,0.22)"/>
    <rect x="0" y="0" width="420" height="300" rx="28" fill="url(#grain)" opacity="0.55"/>
    <text x="24" y="268" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="rgba(255,255,255,0.88)">${label}</text>
  `

  if (style.id.includes('pixel')) {
    return `${common}<g shape-rendering="crispEdges">${Array.from({ length: 12 }, (_, y) => Array.from({ length: 17 }, (_, x) => `<rect x="${x * 26}" y="${y * 26}" width="24" height="24" fill="${hsl(seed + x * 21 + y * 13, 80, 48)}" opacity="${0.35 + ((x + y) % 4) * 0.14}"/>`).join('')).join('')}</g>${signature}`
  }

  if (style.category === 'realistic_photo') {
    return `${common}<rect x="44" y="34" width="332" height="206" rx="18" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.34)"/><circle cx="170" cy="112" r="46" fill="rgba(255,229,205,0.96)"/><path d="M122 224c18-58 78-78 110-28 12 18 25 30 58 28" fill="rgba(30,20,16,0.72)"/><circle cx="282" cy="86" r="26" fill="rgba(255,255,255,0.54)" filter="url(#soft)"/><path d="M62 58h70M62 78h118M62 98h52" stroke="rgba(255,255,255,0.42)" stroke-width="8" stroke-linecap="round"/>${signature}`
  }
  if (style.category === 'cinematic') {
    return `${common}<rect x="30" y="52" width="360" height="180" rx="10" fill="rgba(0,0,0,0.36)"/><circle cx="102" cy="94" r="44" fill="rgba(255,185,72,0.86)" filter="url(#soft)"/><path d="M24 220C90 156 154 152 212 204s112 46 190-22v68H24z" fill="rgba(0,0,0,0.62)"/><path d="M70 58h280M70 226h280" stroke="rgba(255,255,255,0.28)" stroke-width="5"/>${signature}`
  }
  if (style.category === 'illustration_drawing') {
    return `${common}<path d="M66 216C96 106 176 60 246 88c62 25 82 86 54 132" fill="none" stroke="rgba(255,255,255,0.88)" stroke-width="7" stroke-linecap="round"/><path d="M86 196c72-34 128-30 198 0M112 154c54-18 98-16 146 0" stroke="rgba(0,0,0,0.54)" stroke-width="5" stroke-linecap="round"/><path d="M68 68l274 160M100 48l244 118" stroke="rgba(255,255,255,0.18)" stroke-width="3"/>${signature}`
  }
  if (style.category === 'anime_manga') {
    return `${common}<circle cx="204" cy="105" r="58" fill="rgba(255,224,214,0.96)"/><path d="M144 112c-2-58 118-72 132 0-28-36-94-44-132 0z" fill="rgba(35,25,55,0.8)"/><ellipse cx="182" cy="112" rx="18" ry="24" fill="rgba(255,255,255,0.92)"/><ellipse cx="230" cy="112" rx="18" ry="24" fill="rgba(255,255,255,0.92)"/><circle cx="183" cy="115" r="9" fill="${c2}"/><circle cx="231" cy="115" r="9" fill="${c2}"/><path d="M166 178c30 18 62 18 88 0" stroke="rgba(65,20,55,0.64)" stroke-width="6" stroke-linecap="round"/>${signature}`
  }
  if (style.category === 'animation_cartoon') {
    return `${common}<circle cx="138" cy="128" r="58" fill="rgba(255,235,141,0.96)"/><circle cx="118" cy="112" r="13" fill="rgba(0,0,0,0.65)"/><circle cx="160" cy="112" r="13" fill="rgba(0,0,0,0.65)"/><path d="M106 150c28 30 62 30 88 0" fill="none" stroke="rgba(0,0,0,0.54)" stroke-width="9" stroke-linecap="round"/><rect x="230" y="70" width="100" height="122" rx="28" fill="rgba(255,255,255,0.28)"/>${signature}`
  }
  if (style.category === 'three_d_render') {
    return `${common}<path d="M210 48l112 64v128l-112 40-112-40V112z" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.58)" stroke-width="4"/><path d="M98 112l112 54 112-54M210 166v112" fill="none" stroke="rgba(0,0,0,0.45)" stroke-width="5"/><circle cx="284" cy="76" r="34" fill="rgba(255,255,255,0.48)" filter="url(#soft)"/>${signature}`
  }
  if (style.category === 'graphic_design') {
    return `${common}<rect x="46" y="54" width="128" height="128" rx="20" fill="rgba(255,255,255,0.86)"/><circle cx="274" cy="110" r="66" fill="${c3}"/><path d="M78 218h250M78 238h178" stroke="rgba(255,255,255,0.82)" stroke-width="16" stroke-linecap="round"/><path d="M256 58l86 154" stroke="rgba(0,0,0,0.42)" stroke-width="14"/>${signature}`
  }
  if (style.category === 'fantasy_scifi') {
    return `${common}<path d="M68 228c64-118 118-148 164-80 54-94 92-78 128 82z" fill="rgba(0,0,0,0.48)"/><circle cx="300" cy="78" r="42" fill="rgba(210,180,255,0.88)" filter="url(#soft)"/><path d="M202 48l18 56 58 4-48 32 16 56-44-34-46 34 18-56-48-32 58-4z" fill="rgba(255,255,255,0.44)"/>${signature}`
  }
  if (style.category === 'artistic_painting') {
    return `${common}<path d="M42 176c54-86 104-114 148-70 36 36 70 38 118 0 42-34 62-18 72 52" fill="none" stroke="rgba(255,237,213,0.82)" stroke-width="26" stroke-linecap="round"/><path d="M58 206c72-58 132-62 190-28 42 24 80 16 116-18" fill="none" stroke="rgba(55,20,15,0.48)" stroke-width="18" stroke-linecap="round"/><rect width="420" height="300" fill="url(#grain)" opacity="0.75"/>${signature}`
  }
  return `${common}<circle cx="116" cy="108" r="62" fill="rgba(255,255,255,0.3)"/><path d="M0 210h420M0 232h420M0 254h420" stroke="rgba(255,255,255,0.2)" stroke-width="5"/><path d="M242 58h94v94h-94z" fill="rgba(0,0,0,0.42)"/>${signature}`
}

function svgFor(style) {
  const seed = hash(style.id)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="300" viewBox="0 0 420 300" role="img" aria-label="${esc(style.label)} style preview">${primitives(style, seed)}</svg>\n`
}

for (const style of presets) {
  await fs.writeFile(path.join(outDir, `${style.id}.svg`), svgFor(style), 'utf8')
  console.log(`cached ${style.id}.svg`)
}

console.log(`Cached ${presets.length} local style previews in ${outDir}`)
