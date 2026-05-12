import { useState, useRef, useEffect, useCallback, type CSSProperties } from 'react'
import {
  Trash2, Download, Image, Video, X,
  Heart, Film, Volume2, VolumeX, Sparkles,
  Clock, Monitor, ChevronUp, Scissors, Music,
  ChevronLeft, ChevronRight, Copy, Check
} from 'lucide-react'
import { useProjects } from '../contexts/ProjectContext'
import type { GenSpaceRetakeSource } from '../contexts/ProjectContext'
import { useAppSettings } from '../contexts/AppSettingsContext'
import { useGeneration } from '../hooks/use-generation'
import { useVideoGenerationModelSpecs } from '../hooks/use-video-generation-model-specs'
import { createLocalGenerationError, type GenerationError } from '../lib/generation-errors'
import { useRetake } from '../hooks/use-retake'
import { useIcLora } from '../hooks/use-ic-lora'
import type { ICLoraConditioningType } from '../components/ICLoraPanel'
import type { Asset } from '../types/project-model'
import { GenerationErrorDialog } from '../components/GenerationErrorDialog'
import { addVisualAssetToProject } from '../lib/asset-copy'
import { pathToFileUrl } from '../lib/file-url'
import {
  areVideoGenerationSettingsEquivalent,
  getVideoGenerationModelSpecs,
  resolveVideoGenerationOptions,
  sanitizeVideoGenerationSettings,
  type VideoGenerationModelSpecItem,
} from '../lib/video-generation-model-specs'
import { logger } from '../lib/logger'
import { RetakePanel } from '../components/RetakePanel'
import { ICLoraPanel, CONDITIONING_TYPES } from '../components/ICLoraPanel'
import { FreeApiKeyBubble } from '../components/FreeApiKeyBubble'
import {
  ALL_IMAGE_STYLE_PRESETS,
  IMAGE_STYLE_CATEGORY_LABELS,
  type ImageStyleCategory,
  type ImageStylePreset,
} from '../constants/imageStyles'
import { applyStyleBlock, resolveImageStyle } from '../lib/image-style-prompt'

// Asset card with hover overlays
function AssetCard({
  asset,
  onDelete,
  onPlay,
  onDragStart,
  onCreateVideo,
  onRetake,
  onIcLora,
  onToggleFavorite
}: {
  asset: Asset
  onDelete: () => void
  onPlay: () => void
  onDragStart: (e: React.DragEvent, asset: Asset) => void
  onCreateVideo?: (asset: Asset) => void
  onRetake?: (asset: Asset) => void
  onIcLora?: (asset: Asset) => void
  onToggleFavorite?: () => void
}) {
  const hoverVideoRef = useRef<HTMLVideoElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isMuted, setIsMuted] = useState(true)
  const [volume, setVolume] = useState(0.5)
  const isFavorite = asset.favorite || false

  useEffect(() => {
    if (asset.type !== 'video') return
    if (!isHovered) {
      setCurrentTime(0)
      return
    }
    if (hoverVideoRef.current) {
      hoverVideoRef.current.muted = isMuted
      hoverVideoRef.current.volume = volume
      hoverVideoRef.current.play().catch(() => {})
    }
  }, [asset.type, isHovered, isMuted, volume])

  const handleTimeUpdate = () => {
    if (hoverVideoRef.current) {
      setCurrentTime(hoverVideoRef.current.currentTime)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    const a = document.createElement('a')
    a.href = pathToFileUrl(asset.path)
    a.download = asset.path.split('/').pop() || `${asset.type}-${asset.id}`
    a.click()
  }

  return (
    <div
      className="relative group cursor-pointer rounded-xl overflow-hidden bg-zinc-900"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setCurrentTime(0)
      }}
      onClick={onPlay}
      draggable={asset.type === 'image'}
      onDragStart={(e) => asset.type === 'image' && onDragStart(e, asset)}
    >
      {asset.type === 'video' ? (
        <div className="relative w-full aspect-video bg-zinc-900">
          {asset.bigThumbnailPath && (
            <img
              src={pathToFileUrl(asset.bigThumbnailPath)}
              alt=""
              className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-150 ${
                isHovered ? 'opacity-0' : 'opacity-100'
              }`}
            />
          )}
          {isHovered && (
            <video
              ref={hoverVideoRef}
              src={pathToFileUrl(asset.path)}
              className="absolute inset-0 w-full h-full object-contain"
              muted={isMuted}
              loop
              autoPlay
              playsInline
              preload="metadata"
              onTimeUpdate={handleTimeUpdate}
            />
          )}
        </div>
      ) : (
        <img src={pathToFileUrl(asset.path)} alt="" className="w-full aspect-video object-contain" />
      )}
      
      {/* Favorite heart - always visible when favorited */}
      {isFavorite && !isHovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite?.() }}
          className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/40 backdrop-blur-md text-white transition-colors z-10"
        >
          <Heart className="h-3.5 w-3.5 fill-current" />
        </button>
      )}
      
      {/* Hover overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 transition-opacity duration-200 ${
        isHovered ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* Top buttons */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite?.() }}
              className={`p-1.5 rounded-lg backdrop-blur-md transition-colors ${
                isFavorite ? 'bg-white/20 text-white' : 'bg-black/40 text-white hover:bg-black/60'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            
            {asset.type === 'image' && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onCreateVideo?.(asset) }}
                  className="px-2.5 py-1.5 rounded-lg bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
                >
                  <Film className="h-3 w-3" />
                  Create video
                </button>
              </>
            )}
            {asset.type === 'video' && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onRetake?.(asset) }}
                  className="px-2.5 py-1.5 rounded-lg bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
                >
                  <Scissors className="h-3 w-3" />
                  Retake
                </button>
                {onIcLora && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onIcLora(asset) }}
                    className="px-2.5 py-1.5 rounded-lg bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
                  >
                    <Sparkles className="h-3 w-3" />
                    IC-LoRA
                  </button>
                )}
              </>
            )}
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            {/* Tools button hidden for now */}
          </div>
        </div>
        
        {/* Bottom controls for video */}
        {asset.type === 'video' && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="px-2 py-1 rounded-lg bg-black/50 backdrop-blur-md text-white text-xs font-mono">
                {formatTime(currentTime)}
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-black/40 backdrop-blur-md pl-1.5 pr-2 py-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted) }}
                  className="text-white hover:text-white/80 transition-colors"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation()
                    const next = parseFloat(e.target.value)
                    setVolume(next)
                    if (next === 0) {
                      setIsMuted(true)
                    } else if (isMuted) {
                      setIsMuted(false)
                    }
                  }}
                  className="w-16 h-1 accent-white cursor-pointer"
                  aria-label="Volume"
                />
              </div>
            </div>
          </div>
        )}

        {/* Delete button (subtle, bottom right) */}
        {(
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/40 backdrop-blur-md text-white/70 hover:bg-red-500/80 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      
    </div>
  )
}

// Dropdown component for settings
function SettingsDropdown({ 
  trigger, 
  options, 
  value, 
  onChange,
  title 
}: { 
  trigger: React.ReactNode
  options: { value: string; label: string; disabled?: boolean; tooltip?: string; icon?: React.ReactNode }[]
  value: string
  onChange: (value: string) => void
  title: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])
  
  return (
    <div ref={dropdownRef} className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex shrink-0 items-center gap-1 whitespace-nowrap px-2 py-1.5 rounded-md transition-colors ${isOpen ? 'bg-zinc-700 hover:bg-zinc-700' : 'hover:bg-zinc-800'}`}
      >
        {trigger}
      </button>
      
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 bg-zinc-800 border border-zinc-700 rounded-md p-2 min-w-[160px] shadow-xl z-[9999]">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">{title}</div>
          <div className="space-y-1">
            {options.map(option => (
              <div key={option.value} className="relative group/option">
                <button
                  onClick={() => { if (!option.disabled) { onChange(option.value); setIsOpen(false) } }}
                  className={`w-full flex items-center justify-between px-2 py-2 rounded-md transition-colors text-left ${
                    option.disabled
                      ? 'cursor-not-allowed'
                      : value === option.value ? 'bg-white/20 hover:bg-white/25' : 'hover:bg-zinc-700'
                  }`}
                >
                  <span className={`flex items-center gap-2.5 text-sm ${
                    option.disabled 
                      ? 'text-zinc-600' 
                      : value === option.value ? 'text-white' : 'text-zinc-400'
                  }`}>
                    {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                    {option.label}
                  </span>
                  {value === option.value && !option.disabled && (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                {option.disabled && option.tooltip && (
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-zinc-700 rounded text-xs text-zinc-300 whitespace-nowrap opacity-0 group-hover/option:opacity-100 pointer-events-none z-[10000] transition-opacity">
                    {option.tooltip}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const STYLE_PREVIEW_BASE: CSSProperties = {
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12), inset 0 -18px 26px rgba(0,0,0,0.35)',
}

const STYLE_PREVIEW_BY_CATEGORY: Record<ImageStyleCategory, CSSProperties> = {
  realistic_photo: {
    backgroundColor: '#171717',
    backgroundImage: 'radial-gradient(circle at 34% 32%, rgba(255,235,210,0.95) 0 12%, transparent 13%), radial-gradient(ellipse at 45% 72%, rgba(92,60,42,0.9) 0 24%, transparent 25%), linear-gradient(135deg, #d8d0c4 0%, #7e786f 45%, #171717 100%)',
  },
  cinematic: {
    backgroundColor: '#12070a',
    backgroundImage: 'radial-gradient(circle at 20% 22%, rgba(255,190,82,0.95) 0 10%, transparent 24%), radial-gradient(circle at 78% 74%, rgba(34,115,255,0.55) 0 18%, transparent 34%), linear-gradient(135deg, #f7b246 0%, #751619 44%, #05070d 100%)',
  },
  illustration_drawing: {
    backgroundColor: '#172033',
    backgroundImage: 'repeating-linear-gradient(150deg, rgba(255,255,255,0.18) 0 1px, transparent 1px 7px), radial-gradient(circle at 34% 36%, #d9edff 0 12%, transparent 13%), linear-gradient(135deg, #98d6ff 0%, #5562b8 48%, #111827 100%)',
  },
  animation_cartoon: {
    backgroundColor: '#38bdf8',
    backgroundImage: 'radial-gradient(circle at 30% 35%, #fff3a3 0 18%, transparent 19%), radial-gradient(circle at 72% 66%, #fb7185 0 22%, transparent 23%), linear-gradient(135deg, #fda4af 0%, #fde047 50%, #38bdf8 100%)',
  },
  anime_manga: {
    backgroundColor: '#312e81',
    backgroundImage: 'radial-gradient(circle at 36% 34%, #fdf2f8 0 13%, transparent 14%), radial-gradient(circle at 60% 42%, rgba(34,211,238,0.75) 0 8%, transparent 9%), repeating-linear-gradient(90deg, rgba(255,255,255,0.12) 0 1px, transparent 1px 5px), linear-gradient(135deg, #f0abfc 0%, #67e8f9 42%, #3730a3 100%)',
  },
  three_d_render: {
    backgroundColor: '#0f172a',
    backgroundImage: 'radial-gradient(circle at 36% 36%, rgba(209,250,229,0.95) 0 15%, transparent 16%), radial-gradient(circle at 65% 70%, rgba(20,184,166,0.7) 0 20%, transparent 21%), linear-gradient(135deg, #a7f3d0 0%, #14b8a6 45%, #0f172a 100%)',
  },
  graphic_design: {
    backgroundColor: '#581c87',
    backgroundImage: 'linear-gradient(45deg, transparent 0 34%, rgba(255,255,255,0.9) 35% 43%, transparent 44%), radial-gradient(circle at 70% 30%, #a3e635 0 18%, transparent 19%), linear-gradient(135deg, #84cc16 0%, #2563eb 46%, #c026d3 100%)',
  },
  fantasy_scifi: {
    backgroundColor: '#050008',
    backgroundImage: 'radial-gradient(circle at 48% 30%, rgba(216,180,254,0.95) 0 10%, transparent 26%), radial-gradient(circle at 70% 70%, rgba(34,211,238,0.42) 0 18%, transparent 34%), linear-gradient(135deg, #c084fc 0%, #6d28d9 42%, #030008 100%)',
  },
  artistic_painting: {
    backgroundColor: '#312e81',
    backgroundImage: 'radial-gradient(ellipse at 35% 35%, rgba(254,215,170,0.95) 0 18%, transparent 19%), radial-gradient(ellipse at 66% 62%, rgba(244,63,94,0.76) 0 24%, transparent 25%), repeating-linear-gradient(120deg, rgba(255,255,255,0.12) 0 2px, transparent 2px 9px), linear-gradient(135deg, #fed7aa 0%, #f43f5e 46%, #312e81 100%)',
  },
  retro_special: {
    backgroundColor: '#083344',
    backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0 2px, transparent 2px 6px), radial-gradient(circle at 50% 24%, #fb7185 0 16%, transparent 17%), linear-gradient(135deg, #f472b6 0%, #fdba74 50%, #22d3ee 100%)',
  },
  custom: {
    backgroundColor: '#18181b',
    backgroundImage: 'radial-gradient(circle at 28% 28%, rgba(255,255,255,0.65) 0 12%, transparent 13%), linear-gradient(135deg, #a1a1aa 0%, #3f3f46 48%, #09090b 100%)',
  },
}

const STYLE_PREVIEW_BY_ID: Record<string, CSSProperties> = {
  photorealistic: {
    backgroundImage: 'radial-gradient(circle at 32% 26%, rgba(254,226,204,0.98) 0 11%, transparent 12%), radial-gradient(ellipse at 43% 70%, rgba(51,37,29,0.96) 0 24%, transparent 25%), radial-gradient(circle at 72% 30%, rgba(255,255,255,0.45) 0 8%, transparent 18%), linear-gradient(135deg, #eee7db 0%, #8a8176 45%, #141414 100%)',
  },
  ultra_realistic: {
    backgroundImage: 'radial-gradient(circle at 35% 27%, rgba(255,232,205,0.98) 0 12%, transparent 13%), radial-gradient(ellipse at 45% 72%, rgba(75,48,34,0.98) 0 27%, transparent 28%), linear-gradient(120deg, rgba(255,255,255,0.75) 0 10%, transparent 11% 100%), linear-gradient(135deg, #f6efe6 0%, #706a61 45%, #070707 100%)',
  },
  studio_photography: {
    backgroundImage: 'radial-gradient(circle at 28% 22%, rgba(255,255,255,0.9) 0 18%, transparent 19%), radial-gradient(circle at 58% 44%, rgba(251,226,205,0.96) 0 12%, transparent 13%), linear-gradient(135deg, #f4f4f5 0%, #71717a 52%, #18181b 100%)',
  },
  portrait_photography: {
    backgroundImage: 'radial-gradient(circle at 45% 28%, #ffe1c4 0 15%, transparent 16%), radial-gradient(ellipse at 45% 72%, #3b2a22 0 25%, transparent 26%), linear-gradient(135deg, #d7ccc0 0%, #57534e 50%, #111111 100%)',
  },
  product_photography: {
    backgroundImage: 'radial-gradient(ellipse at 52% 55%, rgba(255,255,255,0.96) 0 22%, transparent 23%), radial-gradient(circle at 72% 28%, rgba(255,255,255,0.55) 0 12%, transparent 13%), linear-gradient(135deg, #e7e5e4 0%, #78716c 48%, #0c0a09 100%)',
  },
  architectural_photography: {
    backgroundImage: 'linear-gradient(90deg, transparent 0 16%, rgba(255,255,255,0.82) 17% 21%, transparent 22% 39%, rgba(255,255,255,0.62) 40% 45%, transparent 46%), linear-gradient(135deg, #d6d3d1 0%, #78716c 50%, #1c1917 100%)',
  },
  documentary_style: {
    backgroundImage: 'radial-gradient(circle at 36% 42%, rgba(250,204,21,0.35) 0 20%, transparent 21%), linear-gradient(135deg, #d6d3d1 0%, #57534e 55%, #1c1917 100%)',
  },
  noir_cinematic: {
    backgroundImage: 'repeating-linear-gradient(105deg, rgba(255,255,255,0.22) 0 5px, transparent 5px 13px), linear-gradient(135deg, #f5f5f5 0%, #525252 42%, #020617 100%)',
  },
  sci_fi_cinematic: {
    backgroundImage: 'radial-gradient(circle at 72% 22%, rgba(34,211,238,0.9) 0 11%, transparent 22%), linear-gradient(90deg, rgba(34,211,238,0.32) 0 2px, transparent 2px 8px), linear-gradient(135deg, #22d3ee 0%, #1e3a8a 44%, #020617 100%)',
  },
  fantasy_cinematic: {
    backgroundImage: 'radial-gradient(circle at 45% 30%, rgba(250,204,21,0.95) 0 10%, transparent 24%), radial-gradient(circle at 62% 68%, rgba(168,85,247,0.58) 0 22%, transparent 30%), linear-gradient(135deg, #facc15 0%, #7e22ce 44%, #0f0518 100%)',
  },
  manga: {
    backgroundImage: 'repeating-radial-gradient(circle at 35% 35%, #f8fafc 0 2px, #111827 2px 3px, transparent 3px 8px), linear-gradient(135deg, #ffffff 0%, #9ca3af 48%, #111827 100%)',
  },
  anime: {
    backgroundImage: 'radial-gradient(circle at 36% 30%, #fdf2f8 0 14%, transparent 15%), radial-gradient(circle at 58% 34%, #22d3ee 0 7%, transparent 8%), linear-gradient(135deg, #f0abfc 0%, #67e8f9 45%, #312e81 100%)',
  },
  cartoon: {
    backgroundImage: 'radial-gradient(circle at 36% 38%, #fde047 0 20%, transparent 21%), radial-gradient(circle at 70% 68%, #fb7185 0 20%, transparent 21%), linear-gradient(135deg, #fb7185 0%, #fde047 48%, #38bdf8 100%)',
  },
  family_3d_animation: {
    backgroundImage: 'radial-gradient(circle at 40% 35%, #fed7aa 0 16%, transparent 17%), radial-gradient(circle at 62% 68%, #60a5fa 0 24%, transparent 25%), linear-gradient(135deg, #f9a8d4 0%, #93c5fd 50%, #1d4ed8 100%)',
  },
  clay_animation: {
    backgroundImage: 'radial-gradient(circle at 37% 40%, #fca5a5 0 18%, transparent 19%), radial-gradient(circle at 66% 66%, #fbbf24 0 19%, transparent 20%), linear-gradient(135deg, #fed7aa 0%, #fb923c 55%, #7c2d12 100%)',
  },
  '3d_render': {
    backgroundImage: 'radial-gradient(circle at 42% 42%, rgba(209,250,229,0.96) 0 18%, transparent 19%), radial-gradient(circle at 64% 68%, rgba(20,184,166,0.72) 0 20%, transparent 21%), linear-gradient(135deg, #a7f3d0 0%, #14b8a6 45%, #0f172a 100%)',
  },
  low_poly: {
    backgroundImage: 'linear-gradient(135deg, transparent 0 24%, rgba(255,255,255,0.35) 25% 32%, transparent 33%), linear-gradient(45deg, #86efac 0 32%, #14b8a6 33% 62%, #0f172a 63%)',
  },
  vector_art: {
    backgroundImage: 'linear-gradient(45deg, #bef264 0 28%, transparent 29%), radial-gradient(circle at 70% 30%, #60a5fa 0 20%, transparent 21%), linear-gradient(135deg, #84cc16 0%, #2563eb 50%, #c026d3 100%)',
  },
  minimal: {
    backgroundImage: 'radial-gradient(circle at 70% 30%, #ffffff 0 12%, transparent 13%), linear-gradient(135deg, #f8fafc 0%, #94a3b8 60%, #0f172a 100%)',
  },
  cyberpunk: {
    backgroundImage: 'linear-gradient(90deg, rgba(236,72,153,0.7) 0 3px, transparent 3px 11px), radial-gradient(circle at 72% 24%, #22d3ee 0 14%, transparent 15%), linear-gradient(135deg, #ec4899 0%, #312e81 48%, #020617 100%)',
  },
  watercolor: {
    backgroundImage: 'radial-gradient(ellipse at 35% 35%, rgba(147,197,253,0.72) 0 28%, transparent 29%), radial-gradient(ellipse at 65% 62%, rgba(244,114,182,0.62) 0 30%, transparent 31%), linear-gradient(135deg, #fef3c7 0%, #bfdbfe 52%, #fbcfe8 100%)',
  },
  oil_painting: {
    backgroundImage: 'repeating-linear-gradient(120deg, rgba(255,255,255,0.16) 0 2px, transparent 2px 8px), radial-gradient(ellipse at 35% 38%, #fed7aa 0 24%, transparent 25%), linear-gradient(135deg, #92400e 0%, #be123c 46%, #312e81 100%)',
  },
  pixel_art: {
    backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.24) 1px, transparent 1px), linear-gradient(0deg, rgba(0,0,0,0.24) 1px, transparent 1px), linear-gradient(135deg, #f472b6 0%, #fb923c 50%, #22d3ee 100%)',
    backgroundSize: '8px 8px, 8px 8px, cover',
  },
  synthwave: {
    backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.22) 0 1px, transparent 1px 7px), radial-gradient(circle at 50% 28%, #fb7185 0 18%, transparent 19%), linear-gradient(135deg, #f472b6 0%, #7c3aed 50%, #22d3ee 100%)',
  },
}

function stylePreviewImageUrl(style: ImageStylePreset): string {
  return style.preview_image || './style-previews/_fallback.webp'
}

function stylePreviewStyle(style: ImageStylePreset | null): CSSProperties {
  const categoryStyle = style ? STYLE_PREVIEW_BY_CATEGORY[style.style_category] : STYLE_PREVIEW_BY_CATEGORY.custom
  const override = style ? STYLE_PREVIEW_BY_ID[style.style_id] : undefined
  const imageLayer = style
    ? {
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.06), rgba(0,0,0,0.34)), url("${stylePreviewImageUrl(style)}")`,
      }
    : undefined
  return {
    ...STYLE_PREVIEW_BASE,
    ...categoryStyle,
    ...override,
    ...imageLayer,
  }
}

function ImageStylePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredStyle, setHoveredStyle] = useState<ImageStylePreset | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const selectedStyle = ALL_IMAGE_STYLE_PRESETS.find((style) => style.style_id === value) ?? null
  const groupedStyles = ALL_IMAGE_STYLE_PRESETS.reduce<Partial<Record<ImageStyleCategory, ImageStylePreset[]>>>((acc, style) => {
    if (style.style_id === 'custom') return acc
    ;(acc[style.style_category] ??= []).push(style)
    return acc
  }, {})

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex shrink-0 items-center gap-1 whitespace-nowrap px-2 py-1.5 rounded-md transition-colors ${
          isOpen ? 'bg-zinc-700 hover:bg-zinc-700' : 'hover:bg-zinc-800'
        }`}
        title="Image style"
      >
        <span className="h-3.5 w-3.5 rounded" style={stylePreviewStyle(selectedStyle)} />
        <span className="max-w-[120px] truncate text-zinc-300 font-medium">
          {selectedStyle?.style_label ?? 'Style'}
        </span>
        <ChevronUp className="h-3 w-3 text-zinc-500" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-[430px] overflow-visible rounded-xl border border-zinc-700 bg-[#050506] p-3 shadow-[0_28px_100px_rgba(0,0,0,0.88)] ring-1 ring-white/5 z-[9999]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Stili immagine</div>
              <div className="text-xs text-zinc-400">Preset visivi applicati al prompt visibile</div>
            </div>
            <button
              type="button"
              onClick={() => { onChange(''); setIsOpen(false) }}
              className={`rounded-lg px-2.5 py-1.5 text-xs ${value ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'bg-white/10 text-white'}`}
            >
              Nessuno stile
            </button>
          </div>

          <div className="max-h-[470px] overflow-y-auto pr-1">
            <div className="space-y-4">
              {(Object.keys(groupedStyles) as ImageStyleCategory[]).map((category) => (
                <div key={category}>
                  <div className="mb-2 text-[10px] uppercase tracking-wider text-zinc-500">
                    {IMAGE_STYLE_CATEGORY_LABELS[category]}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(groupedStyles[category] ?? []).map((style) => (
                      <button
                        type="button"
                        key={style.style_id}
                        onMouseEnter={() => setHoveredStyle(style)}
                        onMouseLeave={() => setHoveredStyle(null)}
                        onFocus={() => setHoveredStyle(style)}
                        onBlur={() => setHoveredStyle(null)}
                        onClick={() => { onChange(style.style_id); setIsOpen(false) }}
                        className={`group relative flex items-center gap-2 rounded-lg border p-2 text-left transition-colors ${
                          value === style.style_id
                            ? 'border-emerald-400/70 bg-emerald-500/10'
                            : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-600 hover:bg-zinc-800/80'
                        }`}
                      >
                        <span className="relative h-14 w-16 shrink-0 overflow-hidden rounded-md bg-zinc-900" style={stylePreviewStyle(style)}>
                          <span className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.10),transparent_28%,rgba(0,0,0,0.30))]" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-zinc-100">{style.style_label}</span>
                          <span className="block truncate text-[11px] text-zinc-500">{IMAGE_STYLE_CATEGORY_LABELS[style.style_category]}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {hoveredStyle && (
            <div className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-16 z-[10001] w-80 rounded-2xl border border-zinc-700 bg-zinc-950 p-3 shadow-[0_22px_80px_rgba(0,0,0,0.9)] ring-1 ring-white/10">
              <div className="h-56 w-full rounded-xl bg-zinc-900" style={stylePreviewStyle(hoveredStyle)}>
                <div className="h-full w-full rounded-xl bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),transparent_35%,rgba(0,0,0,0.25))]" />
              </div>
              <div className="mt-3 text-sm font-semibold text-zinc-100">{hoveredStyle.style_label}</div>
              <div className="mt-0.5 text-xs text-zinc-400">{IMAGE_STYLE_CATEGORY_LABELS[hoveredStyle.style_category]}</div>
              <div className="mt-2 line-clamp-3 text-[11px] leading-4 text-zinc-500">
                {hoveredStyle.style_prompt_modifier}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Lightricks brand icon
function LightricksIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M17.0073 8.18934C16.3266 5.6556 14.9346 2.06903 12.3065 2.06903C9.27204 2.06903 6.86627 7.24621 5.45487 11.7948C4.79654 13.9203 4.35877 15.9049 4.17755 17.1736C4.10214 17.5829 4.06274 18.0044 4.06274 18.4347C4.06274 22.2903 7.22553 25.4338 11.1133 25.4338C15.5206 25.4338 23.9376 22.7073 23.9376 18.4347C23.9376 17.1179 23.1376 15.948 21.9018 14.9595L21.9039 14.9575C22.4493 13.7707 22.847 12.648 23.001 11.705C23.1934 10.5053 23.0074 9.5494 22.4429 8.88217C21.7692 8.07382 20.7107 7.85572 19.6586 7.84288C18.8826 7.84288 17.9777 7.96904 17.0073 8.18934ZM8.00176 9.17083C7.6945 9.93266 7.02317 11.7419 6.70157 12.9799C7.93005 11.9987 9.2965 11.1653 10.7091 10.4796C12.2325 9.73758 13.9171 9.06448 15.518 8.58411C15.08 6.98293 13.9585 3.62158 12.3129 3.62158C11.0298 3.62158 9.41958 5.69374 8.00176 9.17083ZM20.6201 14.083L20.6209 14.0786C21.0507 13.1163 21.3522 12.2118 21.4741 11.4547C21.5511 10.9607 21.5832 10.2872 21.2752 9.89577C20.9416 9.46599 20.1975 9.39543 19.6521 9.38901C18.9932 9.38901 18.2117 9.49943 17.3641 9.69208L17.3683 9.69702C17.586 10.7217 17.7526 11.772 17.8808 12.7968C18.8527 13.16 19.7877 13.5908 20.6201 14.083ZM15.8828 10.0897C14.6739 10.4588 13.4041 10.9464 12.209 11.4846C13.4346 11.588 14.8471 11.8527 16.2581 12.2608C16.1554 11.5367 16.0273 10.8061 15.8799 10.0948L15.8828 10.0897ZM11.1133 12.9816C8.07878 12.9816 5.60884 15.4258 5.60884 18.4347C5.60884 21.4435 8.07878 23.8878 11.1133 23.8878C13.8701 23.8878 16.3653 21.6639 16.6048 18.9158C16.7011 17.7546 16.669 15.9263 16.4637 13.9311C14.6294 13.3385 12.6763 12.9816 11.1133 12.9816ZM18.3883 22.2069C17.7984 22.4697 17.1711 22.7085 16.5284 22.9184C18.0872 21.3274 19.8832 18.8193 21.1982 16.3689L21.1997 16.3654C21.9756 17.0509 22.3915 17.7593 22.3915 18.4347C22.3915 19.6985 20.9288 21.0778 18.3883 22.2069ZM19.9493 15.4655L19.9473 15.4707C19.4291 16.4567 18.8221 17.4625 18.1833 18.4092C18.2214 17.4089 18.1892 16.0386 18.0611 14.5212C18.71 14.7948 19.3456 15.1021 19.9493 15.4655Z" fill="currentColor" />
    </svg>
  )
}

// Square icon for aspect ratio
function AspectIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="14" rx="2" />
    </svg>
  )
}

// Prompt bar component matching the design
// Two-row layout: prompt row on top, settings row below
function PromptBar({
  mode,
  onModeChange,
  canUseIcLora,
  prompt,
  onPromptChange,
  onGenerate,
  isGenerating,
  inputImage,
  onInputImageChange,
  inputAudio,
  onInputAudioChange,
  settings,
  onSettingsChange,
  selectedImageStyleId,
  onImageStyleChange,
  videoModelSpecs,
  videoSettingsMessage,
  canGenerate,
  buttonLabel,
  buttonIcon,
  icLoraCondType,
  onIcLoraCondTypeChange,
  icLoraStrength,
  onIcLoraStrengthChange,
}: {
  mode: 'image' | 'video' | 'retake' | 'ic-lora'
  onModeChange: (mode: 'image' | 'video' | 'retake' | 'ic-lora') => void
  canUseIcLora: boolean
  prompt: string
  onPromptChange: (prompt: string) => void
  onGenerate: () => void
  isGenerating: boolean
  canGenerate: boolean
  buttonLabel: string
  buttonIcon: React.ReactNode
  inputImage: string | null
  onInputImageChange: (path: string | null) => void
  inputAudio: string | null
  onInputAudioChange: (path: string | null) => void
  settings: {
    model: string
    duration: number
    videoResolution: string
    fps: number
    aspectRatio: string
    imageResolution: string
    variations: number
    audio?: boolean
  }
  onSettingsChange: (settings: any) => void
  selectedImageStyleId: string
  onImageStyleChange: (styleId: string) => void
  videoModelSpecs: VideoGenerationModelSpecItem[]
  videoSettingsMessage?: string | null
  icLoraCondType?: ICLoraConditioningType
  onIcLoraCondTypeChange?: (type: ICLoraConditioningType) => void
  icLoraStrength?: number
  onIcLoraStrengthChange?: (strength: number) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isAudioDragOver, setIsAudioDragOver] = useState(false)
  const isRetake = mode === 'retake'
  const isIcLora = mode === 'ic-lora'
  const resolvedVideoOptions = mode === 'video'
    ? resolveVideoGenerationOptions({
        settings,
        modelSpecs: videoModelSpecs,
        hasAudio: Boolean(inputAudio),
      })
    : null
  const showVideoFpsControl = Boolean(
    resolvedVideoOptions
    && resolvedVideoOptions.hasCompatibleOptions
    && resolvedVideoOptions.fpsOptions.length > 1,
  )

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const assetData = e.dataTransfer.getData('asset')
    if (assetData) {
      const asset = JSON.parse(assetData) as Asset
      if (asset.type === 'image') {
        onInputImageChange(asset.path)
      }
    }
  }

  const handleAudioDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsAudioDragOver(false)

    const assetData = e.dataTransfer.getData('asset')
    if (assetData) {
      const asset = JSON.parse(assetData) as Asset
      if (asset.type === 'audio') {
        onInputAudioChange(asset.path)
      }
    }

    // Handle file drops
    const file = e.dataTransfer.files?.[0]
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(ext || '')) {
        const filePath = window.electronAPI?.getPathForFile(file)
        if (filePath) {
          onInputAudioChange(filePath)
        }
      }
    }
  }

  const handleAudioFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const filePath = window.electronAPI?.getPathForFile(file)
      if (filePath) {
        onInputAudioChange(filePath)
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const filePath = window.electronAPI?.getPathForFile(file)
      if (filePath) {
        onInputImageChange(filePath)
      } else {
        const url = URL.createObjectURL(file)
        onInputImageChange(url)
      }
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isGenerating && canGenerate) {
      e.preventDefault()
      onGenerate()
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-visible">
      {/* Top row: Image ref | Prompt | Generate */}
      <div className="flex items-start">
        {/* Input image drop zone — video mode only (I2V) */}
        {mode === 'video' && !isRetake && !isIcLora && (
          <div
            className={`relative w-10 h-10 mx-2 mt-2 rounded-lg border-2 border-dashed transition-colors flex items-center justify-center flex-shrink-0 cursor-pointer ${
              isDragOver ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700 hover:border-zinc-500'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            {inputImage ? (
              <>
                <img src={pathToFileUrl(inputImage)} alt="" className="w-full h-full object-cover rounded-md" />
                <button
                  onClick={(e) => { e.stopPropagation(); onInputImageChange(null) }}
                  className="absolute -top-1 -right-1 p-0.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white z-10"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <Image className="h-4 w-4 text-zinc-500" />
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Audio drop zone — only in video mode */}
        {mode === 'video' && !isRetake && !isIcLora && (
          <div
            className={`relative w-10 h-10 mt-2 rounded-lg border-2 border-dashed transition-colors flex items-center justify-center flex-shrink-0 cursor-pointer ${
              isAudioDragOver ? 'border-emerald-500 bg-emerald-500/10' : inputAudio ? 'border-emerald-600' : 'border-zinc-700 hover:border-zinc-500'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsAudioDragOver(true) }}
            onDragLeave={() => setIsAudioDragOver(false)}
            onDrop={handleAudioDrop}
            onClick={() => audioInputRef.current?.click()}
            title={inputAudio ? 'Audio attached — click to change' : 'Attach audio for A2V'}
          >
            {inputAudio ? (
              <>
                <Music className="h-4 w-4 text-emerald-400" />
                <button
                  onClick={(e) => { e.stopPropagation(); onInputAudioChange(null) }}
                  className="absolute -top-1 -right-1 p-0.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white z-10"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <Music className="h-4 w-4 text-zinc-500" />
            )}
            <input
              ref={audioInputRef}
              type="file"
              accept=".mp3,.wav,.ogg,.aac,.flac,.m4a"
              onChange={handleAudioFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Prompt input - fills remaining width */}
        <div className="relative flex-1 min-w-0 py-1">
          {mode === 'image' && (
            <div
              className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full border border-blue-400/30 bg-blue-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-200 shadow-[0_0_18px_rgba(59,130,246,0.18)]"
              title="Prompt AI"
            >
              <Sparkles className="h-3 w-3" />
              Prompt AI
            </div>
          )}
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'retake'
              ? "Descrivi cosa deve succedere nella sezione selezionata..."
              : mode === 'ic-lora'
                ? "Descrivi lo stile o la trasformazione da applicare..."
              : mode === 'image'
                ? "Descrivi l'immagine che vuoi generare..."
                : "Descrivi il video che vuoi generare..."
            }
            className={`w-full bg-transparent text-white text-sm placeholder:text-zinc-500 focus:outline-none px-2 py-2 resize-none overflow-y-auto h-[70px] leading-5 ${mode === 'image' ? 'pr-24' : ''}`}
          />
        </div>

      </div>
      
      {/* Bottom row: Mode selector + Settings */}
      <div className="flex items-center gap-0.5 px-1.5 py-1.5 border-t border-zinc-800/60 text-xs text-zinc-400">
        {/* Mode dropdown */}
        <SettingsDropdown
          title="MODE"
          value={mode}
          onChange={(v) => onModeChange(v as 'image' | 'video' | 'retake' | 'ic-lora')}
          options={[
            { value: 'image', label: 'Genera immagini', icon: <Image className="h-4 w-4" /> },
            { value: 'video', label: 'Genera video', icon: <Video className="h-4 w-4" /> },
            { value: 'retake', label: 'Rigenera sezione', icon: <Scissors className="h-4 w-4" /> },
            ...(canUseIcLora ? [{ value: 'ic-lora', label: 'IC-LoRA', icon: <Sparkles className="h-4 w-4" /> }] : []),
          ]}
          trigger={
            <>
              {mode === 'image' ? <Image className="h-3.5 w-3.5" /> : mode === 'retake' ? <Scissors className="h-3.5 w-3.5" /> : mode === 'ic-lora' ? <Sparkles className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
              <span className="text-zinc-300 font-medium">{mode === 'image' ? 'Immagine' : mode === 'retake' ? 'Rigenera' : mode === 'ic-lora' ? 'IC-LoRA' : 'Video'}</span>
              <ChevronUp className="h-3 w-3 text-zinc-500" />
            </>
          }
        />

        {mode === 'image' && (
          <ImageStylePicker
            value={selectedImageStyleId}
            onChange={onImageStyleChange}
          />
        )}
        
        <div className="flex-1" />
        
        {isRetake ? (
          <div className="text-[10px] text-zinc-500 pr-2">Trim in the panel above, then retake</div>
        ) : isIcLora ? (
          <>
            <SettingsDropdown
              title="CONDITIONING TYPE"
              value={icLoraCondType || 'canny'}
              onChange={(v) => onIcLoraCondTypeChange?.(v as ICLoraConditioningType)}
              options={CONDITIONING_TYPES.map(ct => ({ value: ct.value, label: ct.label }))}
              trigger={
                <>
                  <span className="text-zinc-300 font-medium">{CONDITIONING_TYPES.find(ct => ct.value === icLoraCondType)?.label || 'Canny Edges'}</span>
                  <ChevronUp className="h-3 w-3 text-zinc-500" />
                </>
              }
            />
            <div className="w-px h-4 bg-zinc-700 mx-0.5" />
            <SettingsDropdown
              title="STRENGTH"
              value={String(icLoraStrength ?? 1.0)}
              onChange={(v) => onIcLoraStrengthChange?.(parseFloat(v))}
              options={[
                { value: '0.5', label: '0.50' },
                { value: '0.75', label: '0.75' },
                { value: '1', label: '1.00' },
                { value: '1.25', label: '1.25' },
                { value: '1.5', label: '1.50' },
                { value: '2', label: '2.00' },
              ]}
              trigger={
                <>
                  <span className="text-zinc-500 text-[10px]">STR</span>
                  <span className="text-zinc-300 font-medium">{(icLoraStrength ?? 1.0).toFixed(2)}</span>
                  <ChevronUp className="h-3 w-3 text-zinc-500" />
                </>
              }
            />
          </>
        ) : mode === 'image' ? (
          <>
            {/* Image generation is routed through AX Modal, not the legacy image stack. */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="font-medium">AXSTUDIO 1.0</span>
            </div>
            
            {/* Resolution dropdown */}
            <SettingsDropdown
              title="IMAGE RESOLUTION"
              value={settings.imageResolution}
              onChange={(v) => onSettingsChange({ ...settings, imageResolution: v })}
              options={[
                { value: '1080p', label: '1080p' },
                { value: '1440p', label: '1440p' },
                { value: '2048p', label: '2048p' },
              ]}
              trigger={
                <>
                  <Monitor className="h-3.5 w-3.5" />
                  <span>{settings.imageResolution.replace('p', '')}</span>
                </>
              }
            />
            
            {/* Aspect ratio dropdown */}
            <SettingsDropdown
              title="RATIO"
              value={settings.aspectRatio}
              onChange={(v) => onSettingsChange({ ...settings, aspectRatio: v })}
              options={[
                { value: '16:9', label: '16:9' },
                { value: '1:1', label: '1:1' },
                { value: '9:16', label: '9:16' },
              ]}
              trigger={
                <>
                  <AspectIcon className="h-3.5 w-3.5" />
                  <span>{settings.aspectRatio}</span>
                </>
              }
            />
            
          </>
        ) : (
          <>
            {resolvedVideoOptions && resolvedVideoOptions.hasCompatibleOptions ? (
              <>
                <SettingsDropdown
                  title="MODEL"
                  value={resolvedVideoOptions.selectedModel ?? settings.model}
                  onChange={(v) => onSettingsChange({ ...settings, model: v })}
                  options={resolvedVideoOptions.modelOptions.map((item) => ({
                    value: item.pipeline,
                    label: item.spec.display_name,
                  }))}
                  trigger={
                    <>
                      <LightricksIcon className="h-3.5 w-3.5" />
                      <span className="text-zinc-300 font-medium">
                        {resolvedVideoOptions.modelOptions.find((item) => item.pipeline === resolvedVideoOptions.selectedModel)?.spec.display_name
                          ?? settings.model}
                      </span>
                    </>
                  }
                />

                <div className="w-px h-4 bg-zinc-700 mx-0.5" />

                <SettingsDropdown
                  title="DURATION"
                  value={String(resolvedVideoOptions.selectedDuration ?? settings.duration)}
                  onChange={(v) => onSettingsChange({ ...settings, duration: parseInt(v) })}
                  options={resolvedVideoOptions.durationOptions.map((value) => ({ value: String(value), label: `${value} Sec` }))}
                  trigger={
                    <>
                      <Clock className="h-3.5 w-3.5" />
                      <span>{resolvedVideoOptions.selectedDuration ?? settings.duration}s</span>
                    </>
                  }
                />

                <SettingsDropdown
                  title="RESOLUTION"
                  value={resolvedVideoOptions.selectedResolution ?? settings.videoResolution}
                  onChange={(v) => onSettingsChange({ ...settings, videoResolution: v })}
                  options={resolvedVideoOptions.resolutionOptions.map((value) => ({ value, label: value }))}
                  trigger={
                    <>
                      <Monitor className="h-3.5 w-3.5" />
                      <span>{(resolvedVideoOptions.selectedResolution ?? settings.videoResolution).replace('p', '')}</span>
                    </>
                  }
                />

                {showVideoFpsControl && (
                  <SettingsDropdown
                    title="FPS"
                    value={String(resolvedVideoOptions.selectedFps ?? settings.fps)}
                    onChange={(v) => onSettingsChange({ ...settings, fps: parseInt(v) })}
                    options={resolvedVideoOptions.fpsOptions.map((value) => ({ value: String(value), label: `${value}` }))}
                    trigger={
                      <>
                        <Film className="h-3.5 w-3.5" />
                        <span>{resolvedVideoOptions.selectedFps ?? settings.fps} FPS</span>
                      </>
                    }
                  />
                )}

                <SettingsDropdown
                  title="ASPECT RATIO"
                  value={settings.aspectRatio}
                  onChange={(v) => onSettingsChange({ ...settings, aspectRatio: v })}
                  options={[
                    { value: '16:9', label: '16:9' },
                    { value: '9:16', label: '9:16' },
                  ]}
                  trigger={
                    <>
                      <AspectIcon className="h-3.5 w-3.5" />
                      <span>{settings.aspectRatio}</span>
                    </>
                  }
                />
              </>
            ) : (
              <div className="px-2 py-1.5 rounded-md bg-zinc-800/60 text-zinc-500 text-xs">
                {videoSettingsMessage || 'Loading generation settings...'}
              </div>
            )}
          </>
        )}
        
        {/* Generate button */}
        <button
          onClick={onGenerate}
          disabled={isGenerating || !canGenerate}
          className={`flex items-center gap-1.5 ml-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all flex-shrink-0 ${
            isGenerating || !canGenerate
              ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
              : 'bg-white text-black hover:bg-zinc-200'
          }`}
        >
          <span className={isGenerating ? 'animate-pulse' : ''}>{buttonIcon}</span>
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}

// Gallery size icon components
function GridSmallIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="2" y="2" width="4" height="4" rx="0.5" />
      <rect x="8" y="2" width="4" height="4" rx="0.5" />
      <rect x="14" y="2" width="4" height="4" rx="0.5" />
      <rect x="20" y="2" width="2" height="4" rx="0.5" />
      <rect x="2" y="8" width="4" height="4" rx="0.5" />
      <rect x="8" y="8" width="4" height="4" rx="0.5" />
      <rect x="14" y="8" width="4" height="4" rx="0.5" />
      <rect x="20" y="8" width="2" height="4" rx="0.5" />
      <rect x="2" y="14" width="4" height="4" rx="0.5" />
      <rect x="8" y="14" width="4" height="4" rx="0.5" />
      <rect x="14" y="14" width="4" height="4" rx="0.5" />
      <rect x="20" y="14" width="2" height="4" rx="0.5" />
    </svg>
  )
}

function GridMediumIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="2" y="2" width="6" height="6" rx="1" />
      <rect x="10" y="2" width="6" height="6" rx="1" />
      <rect x="18" y="2" width="4" height="6" rx="1" />
      <rect x="2" y="10" width="6" height="6" rx="1" />
      <rect x="10" y="10" width="6" height="6" rx="1" />
      <rect x="18" y="10" width="4" height="6" rx="1" />
      <rect x="2" y="18" width="6" height="4" rx="1" />
      <rect x="10" y="18" width="6" height="4" rx="1" />
      <rect x="18" y="18" width="4" height="4" rx="1" />
    </svg>
  )
}

function GridLargeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="2" y="2" width="9" height="9" rx="1.5" />
      <rect x="13" y="2" width="9" height="9" rx="1.5" />
      <rect x="2" y="13" width="9" height="9" rx="1.5" />
      <rect x="13" y="13" width="9" height="9" rx="1.5" />
    </svg>
  )
}

type GallerySize = 'small' | 'medium' | 'large'

const gallerySizeClasses: Record<GallerySize, string> = {
  small: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7',
  medium: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
  large: 'grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3',
}

const DEFAULT_VIDEO_SETTINGS = {
  model: 'fast',
  duration: 5,
  videoResolution: '540p',
  fps: 24,
  aspectRatio: '16:9',
  imageResolution: '1080p',
  variations: 1,
  audio: true,
}

export function GenSpace() {
  const {
    activeProject,
    addAsset,
    addTakeToAsset,
    deleteAsset,
    toggleFavorite,
    genSpaceEditImagePath,
    setGenSpaceEditImagePath,
    setGenSpaceEditMode,
    genSpaceAudioPath,
    setGenSpaceAudioPath,
    genSpaceRetakeSource,
    setGenSpaceRetakeSource,
    setPendingRetakeUpdate,
    genSpaceIcLoraSource,
    setGenSpaceIcLoraSource,
    setPendingIcLoraUpdate,
  } = useProjects()
  const currentProjectId = activeProject?.id ?? null
  const { shouldVideoGenerateWithLtxApi, forceApiGenerations, settings: appSettings } = useAppSettings()
  const {
    modelSpecs: videoGenerationModelSpecsResponse,
    isLoading: isLoadingVideoGenerationModelSpecs,
    errorMessage: videoGenerationModelSpecsErrorMessage,
  } = useVideoGenerationModelSpecs()
  const [mode, setMode] = useState<'image' | 'video' | 'retake' | 'ic-lora'>('image')
  const [prompt, setPrompt] = useState('')
  const [selectedImageStyleId, setSelectedImageStyleId] = useState('')
  const [inputImage, setInputImage] = useState<string | null>(null)
  const [inputAudio, setInputAudio] = useState<string | null>(null)
  const [localError, setLocalError] = useState<GenerationError | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [gallerySize, setGallerySize] = useState<GallerySize>('medium')
  const [showSizeMenu, setShowSizeMenu] = useState(false)
  const sizeMenuRef = useRef<HTMLDivElement>(null)
  const persistedVideoKeyRef = useRef<string | null>(null)
  const persistedImagePathsRef = useRef<Set<string>>(new Set())
  const retakeSubmissionRef = useRef<{
    prompt: string
    input: {
      videoPath: string | null
      startTime: number
      duration: number
      videoDuration: number
    }
  } | null>(null)
  const icLoraSubmissionRef = useRef<{
    prompt: string
    input: {
      videoPath: string
      conditioningType: ICLoraConditioningType
      conditioningStrength: number
    }
  } | null>(null)
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_VIDEO_SETTINGS }))
  const selectedImageStyle = resolveImageStyle(selectedImageStyleId, '')
  const handleImageStyleChange = useCallback((styleId: string) => {
    setSelectedImageStyleId(styleId)
    const resolvedStyle = resolveImageStyle(styleId, '')
    setPrompt((current) => applyStyleBlock(current, resolvedStyle))
  }, [])
  const videoModelSpecs = getVideoGenerationModelSpecs(videoGenerationModelSpecsResponse, {
    useApiSpecs: shouldVideoGenerateWithLtxApi,
  })
  const videoSettingsMessage = isLoadingVideoGenerationModelSpecs
    ? 'Loading generation settings...'
    : videoGenerationModelSpecsErrorMessage
      ? `Could not load generation settings: ${videoGenerationModelSpecsErrorMessage}`
      : null
  const sanitizeVideoSettings = useCallback(
    (next: typeof settings) => {
      if (mode !== 'video' || videoModelSpecs.length === 0) return next
      return sanitizeVideoGenerationSettings(next, videoModelSpecs, {
        hasAudio: Boolean(inputAudio),
      }) ?? next
    },
    [inputAudio, mode, videoModelSpecs],
  )
  
  const {
    generate,
    generateImage,
    isGenerating,
    progress,
    statusMessage,
    videoPath,
    imagePaths,
    error,
    reset,
  } = useGeneration()

  const {
    submitRetake,
    resetRetake,
    isRetaking,
    retakeStatus,
    retakeError,
    retakeResult,
  } = useRetake()

  const [retakeInput, setRetakeInput] = useState({
    videoPath: null as string | null,
    startTime: 0,
    duration: 0,
    videoDuration: 0,
    ready: false,
  })
  const [retakePanelKey, setRetakePanelKey] = useState(0)
  const [retakeInitial, setRetakeInitial] = useState<{
    videoPath: string | null
    duration?: number
  }>({ videoPath: null, duration: undefined })
  const [activeRetakeSource, setActiveRetakeSource] = useState<GenSpaceRetakeSource | null>(null)
  const [activeIcLoraSource, setActiveIcLoraSource] = useState<{
    assetId?: string
    linkedClipIds?: string[]
  } | null>(null)
  const [icLoraInput, setIcLoraInput] = useState({
    videoPath: null as string | null,
    conditioningType: 'canny' as ICLoraConditioningType,
    conditioningStrength: 1.0,
    ready: false,
  })
  const [icLoraPanelKey, setIcLoraPanelKey] = useState(0)
  const [icLoraCondType, setIcLoraCondType] = useState<ICLoraConditioningType>('canny')
  const [icLoraStrength, setIcLoraStrength] = useState(1.0)
  const [icLoraInitial, setIcLoraInitial] = useState<{
    videoPath: string | null
  }>({ videoPath: null })

  const {
    submitIcLora,
    resetIcLora,
    isIcLoraGenerating,
    icLoraStatus,
    icLoraError,
    icLoraResult,
  } = useIcLora()
  
  // Handle incoming frame from the Video Editor for editing
  useEffect(() => {
    if (genSpaceEditImagePath) {
      setMode('video')
      setInputImage(genSpaceEditImagePath)
      setPrompt('')
      setGenSpaceEditImagePath(null)
      setGenSpaceEditMode(null)
    }
  }, [genSpaceEditImagePath, setGenSpaceEditImagePath, setGenSpaceEditMode])

  // Handle incoming audio from the Video Editor for A2V
  useEffect(() => {
    if (genSpaceAudioPath) {
      setMode('video')
      setInputAudio(genSpaceAudioPath)
      setPrompt('')
      setGenSpaceAudioPath(null)
    }
  }, [genSpaceAudioPath, setGenSpaceAudioPath])

  useEffect(() => {
    if (!genSpaceRetakeSource) return
    setMode('retake')
    setPrompt('')
    setActiveRetakeSource(genSpaceRetakeSource)
    setRetakeInitial({
      videoPath: genSpaceRetakeSource.videoPath,
      duration: genSpaceRetakeSource.duration,
    })
    setRetakePanelKey((prev) => prev + 1)
    setGenSpaceRetakeSource(null)
  }, [genSpaceRetakeSource, setGenSpaceRetakeSource])

  useEffect(() => {
    if (!genSpaceIcLoraSource) return
    if (forceApiGenerations) {
      setGenSpaceIcLoraSource(null)
      return
    }
    setMode('ic-lora')
    setPrompt('')
    setActiveIcLoraSource({
      assetId: genSpaceIcLoraSource.assetId,
      linkedClipIds: genSpaceIcLoraSource.linkedClipIds,
    })
    setIcLoraInitial({
      videoPath: genSpaceIcLoraSource.videoPath,
    })
    setIcLoraPanelKey((prev) => prev + 1)
    setGenSpaceIcLoraSource(null)
  }, [genSpaceIcLoraSource, forceApiGenerations, setGenSpaceIcLoraSource])

  useEffect(() => {
    if (forceApiGenerations && mode === 'ic-lora') {
      setMode('video')
    }
  }, [forceApiGenerations, mode])

  useEffect(() => {
    if (mode !== 'video' || videoModelSpecs.length === 0) return
    setSettings((prev) => {
      const next = sanitizeVideoSettings(prev)
      return areVideoGenerationSettingsEquivalent(prev, next) ? prev : next
    })
  }, [mode, sanitizeVideoSettings, videoModelSpecs.length])

  useEffect(() => {
    if (retakeError) {
      setLocalError(createLocalGenerationError(retakeError))
    }
  }, [retakeError])

  useEffect(() => {
    if (icLoraError) {
      setLocalError(createLocalGenerationError(icLoraError))
    }
  }, [icLoraError])

  // Only show assets that were generated (have generationParams), not imported files
  const assets = (activeProject?.assets || []).filter(a => a.generationParams)
  const [lastPrompt, setLastPrompt] = useState('')
  
  // When video generation completes, add to project assets
  useEffect(() => {
    if (!videoPath || !currentProjectId || isGenerating) return

    const generationKey = videoPath
    if (persistedVideoKeyRef.current === generationKey) return
    persistedVideoKeyRef.current = generationKey

    const genMode = inputAudio
      ? 'audio-to-video'
      : inputImage ? 'image-to-video' : 'text-to-video'
    const savedVideoSettings = sanitizeVideoSettings(settings)

    ;(async () => {
      try {
        const copied = await addVisualAssetToProject(videoPath, currentProjectId, 'video')
        if (!copied) throw new Error('Could not persist generated video to project storage')
        addAsset(currentProjectId, {
          type: 'video',
          path: copied.path,
          bigThumbnailPath: copied.bigThumbnailPath,
          smallThumbnailPath: copied.smallThumbnailPath,
          width: copied.width,
          height: copied.height,
          prompt: lastPrompt,
          resolution: savedVideoSettings.videoResolution,
          duration: savedVideoSettings.duration,
          generationParams: {
            mode: genMode as 'text-to-video' | 'image-to-video' | 'audio-to-video',
            prompt: lastPrompt,
            model: savedVideoSettings.model,
            duration: savedVideoSettings.duration,
            resolution: savedVideoSettings.videoResolution,
            fps: savedVideoSettings.fps,
            audio: savedVideoSettings.audio || false,
            cameraMotion: 'none',
            imageAspectRatio: savedVideoSettings.aspectRatio,
            imageSteps: 36,
            inputImageUrl: inputImage || undefined,
            inputAudioUrl: inputAudio || undefined,
          },
          takes: [{
            path: copied.path,
            bigThumbnailPath: copied.bigThumbnailPath,
            smallThumbnailPath: copied.smallThumbnailPath,
            width: copied.width,
            height: copied.height,
            createdAt: Date.now(),
          }],
          activeTakeIndex: 0,
        })
        reset()
      } catch (err) {
        persistedVideoKeyRef.current = null
        logger.error(`Failed to persist generated video asset: ${err}`)
      }
    })()
  }, [videoPath, currentProjectId, isGenerating, sanitizeVideoSettings, settings, inputImage, inputAudio, lastPrompt, addAsset, reset])

  // When retake completes, add as take or new asset
  useEffect(() => {
    if (!retakeResult || !currentProjectId || isRetaking) return
    const submission = retakeSubmissionRef.current
    if (!submission) return
    retakeSubmissionRef.current = null

    ;(async () => {
      const usedPrompt = submission.prompt
      const usedInput = submission.input
      const copied = await addVisualAssetToProject(retakeResult.videoPath, currentProjectId, 'video')
      if (!copied) {
        logger.error('Could not persist retake result to project storage')
        setLocalError(createLocalGenerationError('Failed to save retake output to project storage.'))
        setActiveRetakeSource(null)
        resetRetake()
        return
      }

      if (activeRetakeSource?.assetId) {
        const sourceAsset = activeProject?.assets?.find(a => a.id === activeRetakeSource.assetId)
        if (sourceAsset) {
          const newTakeIndex = sourceAsset.takes ? sourceAsset.takes.length : 1
          addTakeToAsset(currentProjectId, sourceAsset.id, {
            path: copied.path,
            bigThumbnailPath: copied.bigThumbnailPath,
            smallThumbnailPath: copied.smallThumbnailPath,
            width: copied.width,
            height: copied.height,
            createdAt: Date.now(),
          })
          if (activeRetakeSource.linkedClipIds?.length) {
            setPendingRetakeUpdate({
              assetId: sourceAsset.id,
              clipIds: activeRetakeSource.linkedClipIds,
              newTakeIndex,
            })
          }
        }
      } else {
        addAsset(currentProjectId, {
          type: 'video',
          path: copied.path,
          bigThumbnailPath: copied.bigThumbnailPath,
          smallThumbnailPath: copied.smallThumbnailPath,
          width: copied.width,
          height: copied.height,
          prompt: usedPrompt,
          resolution: '',
          duration: usedInput.duration,
          generationParams: {
            mode: 'retake',
            prompt: usedPrompt,
            model: 'pro',
            duration: usedInput.duration,
            resolution: '',
            fps: 24,
            audio: true,
            cameraMotion: 'none',
            retakeVideoPath: copied.path,
            retakeStartTime: usedInput.startTime,
            retakeDuration: usedInput.duration,
            retakeMode: 'replace_audio_and_video',
          },
          takes: [{
            path: copied.path,
            bigThumbnailPath: copied.bigThumbnailPath,
            smallThumbnailPath: copied.smallThumbnailPath,
            width: copied.width,
            height: copied.height,
            createdAt: Date.now(),
          }],
          activeTakeIndex: 0,
        })
        setMode('video')
      }

      setActiveRetakeSource(null)
      resetRetake()
    })()
  }, [retakeResult, isRetaking, currentProjectId, activeProject?.assets, activeRetakeSource, addAsset, addTakeToAsset, setPendingRetakeUpdate, resetRetake])

  useEffect(() => {
    if (!icLoraResult || !currentProjectId || isIcLoraGenerating) return
    const submission = icLoraSubmissionRef.current
    if (!submission) return
    icLoraSubmissionRef.current = null

    ;(async () => {
      const copied = await addVisualAssetToProject(icLoraResult.videoPath, currentProjectId, 'video')
      if (!copied) {
        logger.error('Could not persist IC-LoRA result to project storage')
        setLocalError(createLocalGenerationError('Failed to save IC-LoRA output to project storage.'))
        setActiveIcLoraSource(null)
        resetIcLora()
        return
      }

      if (activeIcLoraSource?.assetId) {
        const sourceAsset = activeProject?.assets?.find(a => a.id === activeIcLoraSource.assetId)
        if (sourceAsset) {
          const newTakeIndex = sourceAsset.takes ? sourceAsset.takes.length : 1
          addTakeToAsset(currentProjectId, sourceAsset.id, {
            path: copied.path,
            bigThumbnailPath: copied.bigThumbnailPath,
            smallThumbnailPath: copied.smallThumbnailPath,
            width: copied.width,
            height: copied.height,
            createdAt: Date.now(),
          })
          if (activeIcLoraSource.linkedClipIds?.length) {
            setPendingIcLoraUpdate({
              assetId: sourceAsset.id,
              clipIds: activeIcLoraSource.linkedClipIds,
              newTakeIndex,
            })
          }
        }
      } else {
        addAsset(currentProjectId, {
          type: 'video',
          path: copied.path,
          bigThumbnailPath: copied.bigThumbnailPath,
          smallThumbnailPath: copied.smallThumbnailPath,
          width: copied.width,
          height: copied.height,
          prompt: submission.prompt,
          resolution: '',
          generationParams: {
            mode: 'ic-lora',
            prompt: submission.prompt,
            model: 'fast',
            duration: 0,
            resolution: '',
            fps: 24,
            audio: false,
            cameraMotion: 'none',
            icLoraVideoPath: submission.input.videoPath,
            icLoraConditioningType: submission.input.conditioningType,
            icLoraConditioningStrength: submission.input.conditioningStrength,
          },
          takes: [{
            path: copied.path,
            bigThumbnailPath: copied.bigThumbnailPath,
            smallThumbnailPath: copied.smallThumbnailPath,
            width: copied.width,
            height: copied.height,
            createdAt: Date.now(),
          }],
          activeTakeIndex: 0,
        })
      }

      setActiveIcLoraSource(null)
    })()
  }, [icLoraResult, isIcLoraGenerating, currentProjectId, activeProject?.assets, activeIcLoraSource, addAsset, addTakeToAsset, setPendingIcLoraUpdate])
  
  // When image generation/editing completes, add all images to project assets
  useEffect(() => {
    if (imagePaths.length > 0 && currentProjectId && !isGenerating) {
      const genMode = 'text-to-image'
      ;(async () => {
        for (let i = 0; i < imagePaths.length; i++) {
          const imgPath = imagePaths[i]
          if (persistedImagePathsRef.current.has(imgPath)) continue
          persistedImagePathsRef.current.add(imgPath)
          const exists = assets.some(a => a.path === imgPath)
          if (!exists) {
            const copied = await addVisualAssetToProject(imgPath, currentProjectId, 'image')
            if (!copied) {
              persistedImagePathsRef.current.delete(imgPath)
              logger.error(`Could not persist generated image to project storage: ${imgPath}`)
              continue
            }
            addAsset(currentProjectId, {
              type: 'image',
              path: copied.path,
              bigThumbnailPath: copied.bigThumbnailPath,
              smallThumbnailPath: copied.smallThumbnailPath,
              width: copied.width,
              height: copied.height,
              prompt: lastPrompt,
              resolution: settings.imageResolution,
              generationParams: {
                mode: genMode,
                prompt: lastPrompt,
                model: 'fast',
                duration: 5,
                resolution: settings.imageResolution,
                fps: 24,
                audio: false,
                cameraMotion: 'none',
                imageAspectRatio: settings.aspectRatio,
                imageSteps: 36,
              },
              takes: [{
                path: copied.path,
                bigThumbnailPath: copied.bigThumbnailPath,
                smallThumbnailPath: copied.smallThumbnailPath,
                width: copied.width,
                height: copied.height,
                createdAt: Date.now(),
              }],
              activeTakeIndex: 0,
            })
          }
        }
      })()
    }
  }, [imagePaths, currentProjectId, isGenerating])
  
  const handleGenerate = async () => {
    if (mode === 'ic-lora') {
      if (!prompt.trim() || !icLoraInput.videoPath || !icLoraInput.ready) return
      icLoraSubmissionRef.current = {
        prompt,
        input: {
          videoPath: icLoraInput.videoPath,
          conditioningType: icLoraCondType,
          conditioningStrength: icLoraStrength,
        },
      }
      await submitIcLora({
        videoPath: icLoraInput.videoPath,
        conditioningType: icLoraCondType,
        conditioningStrength: icLoraStrength,
        prompt,
      })
      return
    }

    if (mode === 'retake') {
      if (!retakeInput.videoPath || retakeInput.duration < 2) return
      retakeSubmissionRef.current = {
        prompt,
        input: {
          videoPath: retakeInput.videoPath,
          startTime: retakeInput.startTime,
          duration: retakeInput.duration,
          videoDuration: retakeInput.videoDuration,
        },
      }
      await submitRetake({
        videoPath: retakeInput.videoPath,
        startTime: retakeInput.startTime,
        duration: retakeInput.duration,
        prompt,
        mode: 'replace_audio_and_video',
      })
      return
    }

    if (!prompt.trim()) return

    // Save the prompt before generation starts
    setLastPrompt(prompt)

    if (mode === 'image') {
      generateImage(
        prompt,
        {
          model: 'fast' as 'fast' | 'pro',
          duration: 5,
          videoResolution: settings.videoResolution,
          fps: 24,
          audio: false,
          cameraMotion: 'none',
          imageResolution: settings.imageResolution,
          imageAspectRatio: settings.aspectRatio,
          imageSteps: 36,
          imageStyleId: selectedImageStyle?.style_id || '',
          imageStyleLabel: selectedImageStyle?.style_label ?? null,
          imageStyleCategory: selectedImageStyle?.style_category ?? null,
          imageStylePromptModifier: selectedImageStyle?.style_prompt_modifier || null,
          imageStyleNegativeModifier: selectedImageStyle?.style_negative_modifier || null,
          imageCustomStyleText: null,
          variations: settings.variations,
        }
      )
    } else {
      // Generate video (t2v if no image/audio, i2v if image, a2v if audio)
      const imagePath = inputImage || null
      const audioPath = inputAudio || null
      const videoSettings = sanitizeVideoSettings(settings)

      generate(
        prompt,
        imagePath,
        {
          model: videoSettings.model as 'fast' | 'pro',
          duration: videoSettings.duration,
          videoResolution: videoSettings.videoResolution,
          fps: videoSettings.fps,
          audio: videoSettings.audio || false,
          cameraMotion: 'none',
          aspectRatio: videoSettings.aspectRatio,
          imageResolution: videoSettings.imageResolution,
          imageAspectRatio: videoSettings.aspectRatio,
          imageSteps: 36,
        },
        audioPath,
      )
    }
  }
  
  const handleDelete = (assetId: string) => {
    if (currentProjectId) {
      deleteAsset(currentProjectId, assetId)
    }
  }
  
  const handleDragStart = (e: React.DragEvent, asset: Asset) => {
    e.dataTransfer.setData('asset', JSON.stringify(asset))
    e.dataTransfer.setData('assetId', asset.id)
    e.dataTransfer.effectAllowed = 'copy'
  }
  
  const handleCreateVideo = (imageAsset: Asset) => {
    setMode('video')
    setInputImage(imageAsset.path)
    setPrompt(`${imageAsset.prompt || 'The scene comes to life...'}`)
  }

  const handleRetake = (videoAsset: Asset) => {
    setMode('retake')
    setPrompt('')
    setActiveRetakeSource(null)
    setRetakeInitial({
      videoPath: videoAsset.path,
      duration: videoAsset.duration,
    })
    setRetakePanelKey((prev) => prev + 1)
  }

  const handleIcLora = (videoAsset: Asset) => {
    if (forceApiGenerations) return
    setMode('ic-lora')
    setPrompt('')
    setActiveIcLoraSource(null)
    setIcLoraInitial({ videoPath: videoAsset.path })
    setIcLoraPanelKey((prev) => prev + 1)
  }

  const isRetakeMode = mode === 'retake'
  const isIcLoraMode = mode === 'ic-lora'
  const hasCompatibleVideoSettings = mode !== 'video' || (
    !isLoadingVideoGenerationModelSpecs
    && videoModelSpecs.length > 0
    && resolveVideoGenerationOptions({
      settings,
      modelSpecs: videoModelSpecs,
      hasAudio: Boolean(inputAudio),
    }).hasCompatibleOptions
  )
  const canSubmit = isRetakeMode
    ? retakeInput.ready && !!retakeInput.videoPath && !isRetaking
    : isIcLoraMode
      ? !!prompt.trim() && icLoraInput.ready && !!icLoraInput.videoPath && !isIcLoraGenerating
      : !!prompt.trim() && hasCompatibleVideoSettings
  const promptButtonLabel = isRetakeMode ? 'Retake' : isIcLoraMode ? 'Generate' : 'Generate'
  const promptButtonIcon = isRetakeMode
    ? <Scissors className="h-3.5 w-3.5" />
    : isIcLoraMode
      ? <Sparkles className="h-3.5 w-3.5" />
    : <Sparkles className={`h-3.5 w-3.5 ${isGenerating ? 'animate-pulse' : ''}`} />
  const promptGenerating = isRetakeMode ? isRetaking : isIcLoraMode ? isIcLoraGenerating : isGenerating
  
  // Close size menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sizeMenuRef.current && !sizeMenuRef.current.contains(e.target as Node)) {
        setShowSizeMenu(false)
      }
    }
    if (showSizeMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSizeMenu])

  const filteredAssets = showFavorites ? assets.filter(a => a.favorite) : assets
  const favoriteCount = assets.filter(a => a.favorite).length
  const isLibraryMode = mode === 'video' || mode === 'image'

  // Navigation for the asset preview modal
  const selectedIndex = selectedAsset ? filteredAssets.findIndex(a => a.id === selectedAsset.id) : -1
  const canGoPrev = selectedIndex > 0
  const canGoNext = selectedIndex >= 0 && selectedIndex < filteredAssets.length - 1

  const goToPrev = useCallback(() => {
    if (canGoPrev) setSelectedAsset(filteredAssets[selectedIndex - 1])
  }, [canGoPrev, filteredAssets, selectedIndex])

  const goToNext = useCallback(() => {
    if (canGoNext) setSelectedAsset(filteredAssets[selectedIndex + 1])
  }, [canGoNext, filteredAssets, selectedIndex])

  // Keyboard navigation for the preview modal
  useEffect(() => {
    if (!selectedAsset) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goToPrev() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goToNext() }
      else if (e.key === 'Escape') setSelectedAsset(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedAsset, goToPrev, goToNext])

  return (
    <div className="h-full relative bg-zinc-950">

      {/* Empty state */}
      {isLibraryMode && assets.length === 0 && !isGenerating && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-zinc-700 flex items-center justify-center mb-4">
            <Sparkles className="h-10 w-10 text-zinc-600" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Start Creating</h3>
          <p className="text-zinc-500 max-w-md">
            Use the prompt bar below to generate images and videos.
            Drag assets into the input box to use them as references.
          </p>
        </div>
      )}

      {/* No favorites empty state */}
      {isLibraryMode && showFavorites && filteredAssets.length === 0 && assets.length > 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <Heart className="h-12 w-12 text-zinc-700 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No favorites yet</h3>
          <p className="text-zinc-500 text-sm">
            Click the heart icon on any asset to add it to your favorites.
          </p>
        </div>
      )}

      {/* Assets area — full width, no background, above the prompt bar */}
      {isLibraryMode && (assets.length > 0 || isGenerating) && (
        <div className="absolute inset-x-0 top-0 bottom-[160px] flex flex-col px-4 pt-4">
          {/* Top bar */}
          <div className="flex items-center justify-end pb-2 gap-2">
            <button
              onClick={() => setShowFavorites(!showFavorites)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                showFavorites
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Heart className={`h-4 w-4 ${showFavorites ? 'fill-current' : ''}`} />
              Favorites
              {favoriteCount > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  showFavorites ? 'bg-red-500/30 text-red-300' : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {favoriteCount}
                </span>
              )}
            </button>

            <div ref={sizeMenuRef} className="relative">
              <button
                onClick={() => setShowSizeMenu(!showSizeMenu)}
                className={`p-2 rounded-md transition-colors ${
                  showSizeMenu ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {gallerySize === 'small' ? <GridSmallIcon className="h-4 w-4" /> :
                 gallerySize === 'medium' ? <GridMediumIcon className="h-4 w-4" /> :
                 <GridLargeIcon className="h-4 w-4" />}
              </button>

              {showSizeMenu && (
                <div className="absolute top-full mt-2 right-0 bg-zinc-800 border border-zinc-700 rounded-md p-2 min-w-[160px] shadow-xl z-50">
                  {([
                    { value: 'small' as GallerySize, label: 'Small', icon: GridSmallIcon },
                    { value: 'medium' as GallerySize, label: 'Medium', icon: GridMediumIcon },
                    { value: 'large' as GallerySize, label: 'Large', icon: GridLargeIcon },
                  ]).map(option => (
                    <button
                      key={option.value}
                      onClick={() => { setGallerySize(option.value); setShowSizeMenu(false) }}
                      className={`w-full flex items-center justify-between px-2 py-2.5 rounded-md transition-colors text-left ${gallerySize === option.value ? 'bg-white/20 hover:bg-white/25' : 'hover:bg-zinc-700'}`}
                    >
                      <div className="flex items-center gap-3">
                        <option.icon className={`h-4 w-4 ${gallerySize === option.value ? 'text-white' : 'text-zinc-500'}`} />
                        <span className={`text-sm ${gallerySize === option.value ? 'text-white font-medium' : 'text-zinc-400'}`}>
                          {option.label}
                        </span>
                      </div>
                      {gallerySize === option.value && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Assets grid — fills remaining space, scrollable */}
          <div className="overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] flex-1">
            <div className={`grid ${gallerySizeClasses[gallerySize]} gap-4`}>
              {isGenerating && (
                <div className="relative rounded-xl overflow-hidden bg-zinc-800 aspect-video">
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="relative w-16 h-16 mb-3">
                      <div className="absolute inset-0 rounded-full border-2 border-violet-500/30" />
                      <div className="absolute inset-0 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                      <div className="absolute inset-2 rounded-full bg-zinc-800 flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-violet-400" />
                      </div>
                    </div>
                    <p className="text-sm text-zinc-400">{statusMessage || 'Generating...'}</p>
                    {progress > 0 && (
                      <div className="w-32 h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-violet-500 transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              )}
              {filteredAssets.map(asset => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onDelete={() => handleDelete(asset.id)}
                  onPlay={() => setSelectedAsset(asset)}
                  onDragStart={handleDragStart}
                  onCreateVideo={handleCreateVideo}
                  onRetake={handleRetake}
                  onIcLora={!forceApiGenerations ? handleIcLora : undefined}
                  onToggleFavorite={() => currentProjectId && toggleFavorite(currentProjectId, asset.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === 'retake' && (
        <div className="absolute inset-x-0 top-0 bottom-[160px] px-4 pt-4 pb-4 flex flex-col overflow-hidden">
          <RetakePanel
            initialVideoPath={retakeInitial.videoPath}
            initialDuration={retakeInitial.duration}
            resetKey={retakePanelKey}
            fillHeight
            isProcessing={isRetaking}
            processingStatus={retakeStatus}
            onChange={(data) => setRetakeInput(data)}
          />
        </div>
      )}

      {mode === 'ic-lora' && !forceApiGenerations && (
        <div className="absolute inset-x-0 top-0 bottom-[160px] px-4 pt-4 pb-4 flex flex-col overflow-hidden">
          <ICLoraPanel
            initialVideoPath={icLoraInitial.videoPath}
            resetKey={icLoraPanelKey}
            fillHeight
            isProcessing={isIcLoraGenerating}
            processingStatus={icLoraStatus}
            conditioningType={icLoraCondType}
            onConditioningTypeChange={setIcLoraCondType}
            conditioningStrength={icLoraStrength}
            onConditioningStrengthChange={setIcLoraStrength}
            outputVideoPath={icLoraResult?.videoPath || null}
            onChange={setIcLoraInput}
          />
        </div>
      )}

      {/* Floating prompt panel — wider, responsive, centered */}
      <div className="absolute bottom-5 left-1/2 w-[min(700px,calc(100%-2rem))] -translate-x-1/2">

        <FreeApiKeyBubble
          forceApiGenerations={forceApiGenerations}
          hasLtxApiKey={appSettings.hasLtxApiKey}
          isGenerating={isGenerating}
        />

        {/* Prompt bar */}
        <PromptBar
          mode={mode}
          onModeChange={setMode}
          canUseIcLora={!forceApiGenerations}
          prompt={prompt}
          onPromptChange={setPrompt}
          onGenerate={handleGenerate}
          isGenerating={promptGenerating}
          canGenerate={canSubmit}
          buttonLabel={promptButtonLabel}
          buttonIcon={promptButtonIcon}
          inputImage={inputImage}
          onInputImageChange={setInputImage}
          inputAudio={inputAudio}
          onInputAudioChange={setInputAudio}
          settings={settings}
          onSettingsChange={(nextSettings) => setSettings(sanitizeVideoSettings(nextSettings))}
          selectedImageStyleId={selectedImageStyleId}
          onImageStyleChange={handleImageStyleChange}
          videoModelSpecs={videoModelSpecs}
          videoSettingsMessage={videoSettingsMessage}
          icLoraCondType={icLoraCondType}
          onIcLoraCondTypeChange={setIcLoraCondType}
          icLoraStrength={icLoraStrength}
          onIcLoraStrengthChange={setIcLoraStrength}
        />
      </div>
      
      {/* Asset preview modal */}
      {selectedAsset && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setSelectedAsset(null)}
        >
          {/* Previous button */}
          <button
            onClick={(e) => { e.stopPropagation(); goToPrev() }}
            disabled={!canGoPrev}
            className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full backdrop-blur-md transition-all ${
              canGoPrev
                ? 'bg-white/10 text-white hover:bg-white/20 cursor-pointer'
                : 'bg-white/5 text-zinc-600 cursor-default'
            }`}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Next button */}
          <button
            onClick={(e) => { e.stopPropagation(); goToNext() }}
            disabled={!canGoNext}
            className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full backdrop-blur-md transition-all ${
              canGoNext
                ? 'bg-white/10 text-white hover:bg-white/20 cursor-pointer'
                : 'bg-white/5 text-zinc-600 cursor-default'
            }`}
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Content area */}
          <div className="relative max-w-5xl w-full max-h-full px-20 py-8" onClick={e => e.stopPropagation()}>
            {/* Top bar: counter + close */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-zinc-500 font-medium">
                {selectedIndex + 1} / {filteredAssets.length}
              </span>
              <button
                onClick={() => setSelectedAsset(null)}
                className="p-2 rounded-md text-zinc-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {selectedAsset.type === 'video' ? (
              <video
                key={selectedAsset.id}
                src={pathToFileUrl(selectedAsset.path)}
                controls
                autoPlay
                className="w-full rounded-xl object-contain max-h-[75vh]"
              />
            ) : (
              <img
                key={selectedAsset.id}
                src={pathToFileUrl(selectedAsset.path)}
                alt=""
                className="w-full rounded-xl object-contain max-h-[75vh]"
              />
            )}
            <div className="mt-4 text-center">
              <div className="inline-flex items-start gap-2 max-w-full">
                <p className="text-zinc-300">{selectedAsset.prompt}</p>
                {selectedAsset.prompt && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedAsset.prompt)
                      setCopiedPrompt(true)
                      setTimeout(() => setCopiedPrompt(false), 2000)
                    }}
                    className="shrink-0 p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                    title="Copy prompt"
                  >
                    {copiedPrompt ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
              <p className="text-zinc-500 text-sm mt-1">
                {selectedAsset.resolution} • {selectedAsset.duration ? `${selectedAsset.duration}s` : 'Image'}
              </p>
            </div>
          </div>
        </div>
      )}

      {(error || localError) && (
        <GenerationErrorDialog
          error={(error || localError)!}
          onDismiss={() => {
            if (error) reset()
            if (localError) {
              setLocalError(null)
              resetRetake()
              resetIcLora()
            }
          }}
        />
      )}
    </div>
  )
}
