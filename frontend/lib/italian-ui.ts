import { useEffect } from 'react'

const EXACT_TRANSLATIONS: Record<string, string> = {
  // Global app states
  'Reconnecting...': 'Riconnessione...',
  'The backend process stopped unexpectedly. Attempting to restart...': 'Il backend si e fermato in modo imprevisto. Tentativo di riavvio...',
  'The backend process crashed and could not be restarted': 'Il backend si e chiuso in modo anomalo e non puo essere riavviato',
  'Review the logs below and restart the application.': 'Controlla i log qui sotto e riavvia l\'applicazione.',
  'Restart Application': 'Riavvia applicazione',
  'Starting AXSTUDIO...': 'Avvio di AXSTUDIO...',
  'Initializing the inference engine': 'Inizializzazione del motore di inferenza',
  'Loading settings...': 'Caricamento impostazioni...',
  'Finalizing setup...': 'Finalizzazione configurazione...',
  'Setup finalization failed': 'Finalizzazione configurazione non riuscita',
  'Retry': 'Riprova',
  'Settings': 'Impostazioni',
  'View Backend Logs': 'Visualizza log backend',
  'Logs': 'Log',
  'Download logs': 'Scarica log',
  'Open log folder': 'Apri cartella log',
  'Refresh logs': 'Aggiorna log',
  'Auto-refreshing every 2s': 'Aggiornamento automatico ogni 2s',

  // API gateway / setup
  'Connect API Keys': 'Collega chiavi API',
  'Add the required API keys to continue.': 'Aggiungi le chiavi API richieste per continuare.',
  'Video generation, prompt enhancement, and cloud text encoding.': 'Generazione video, miglioramento prompt e codifica testo cloud.',
  'Required to generate images with Z Image Turbo.': 'Richiesta per generare immagini con Z Image Turbo.',
  'LTX API key': 'Chiave API LTX',
  'FAL AI API key': 'Chiave API FAL AI',
  'Enter your LTX API key...': 'Inserisci la tua chiave API LTX...',
  'Enter your FAL AI API key...': 'Inserisci la tua chiave API FAL AI...',
  'Get LTX API key': 'Ottieni chiave API LTX',
  'Get FAL API key': 'Ottieni chiave API FAL',
  'Your key stays in your local app settings.': 'La chiave resta nelle impostazioni locali dell\'app.',
  'Required': 'Richiesto',
  'Optional': 'Opzionale',
  'Not set': 'Non impostata',
  'Save Key': 'Salva chiave',
  'Required API keys are missing. Add them to continue.': 'Mancano chiavi API richieste. Aggiungile per continuare.',
  'I have read and agree to the LTX-2 Community License Agreement': 'Ho letto e accetto il contratto di licenza community LTX-2',
  'Loading license...': 'Caricamento licenza...',
  'Available:': 'Disponibile:',
  'Location': 'Posizione',
  'Desktop': 'Desktop',

  // Navigation / workspace
  'New Project': 'Nuovo progetto',
  'Open Project': 'Apri progetto',
  'Recent Projects': 'Progetti recenti',
  'Create Project': 'Crea progetto',
  'Project': 'Progetto',
  'Projects': 'Progetti',
  'Video Editor': 'Editor video',
  'Review the LLM prompt, choose a style, then render with Modal FLUX.': 'Rivedi il prompt LLM, scegli uno stile e genera con Modal FLUX.',
  'Prompt Director': 'Direttore prompt',
  'FLUX Image Generator': 'Generatore immagini FLUX',
  'IDEA / EDITABLE FINAL PROMPT': 'IDEA / PROMPT FINALE MODIFICABILE',
  'LLM STYLE HINT': 'SUGGERIMENTO STILE LLM',
  'LANGUAGE': 'LINGUA',
  'LLM OUTPUT PARAMETERS': 'PARAMETRI OUTPUT LLM',
  'LLM enhanced': 'Migliorato da LLM',
  'Improve Prompt': 'Migliora prompt',
  'Generate Image': 'Genera immagine',
  'Regenerate': 'Rigenera',
  'Save': 'Salva',
  'Use as Scene': 'Usa come scena',
  'Save as Character': 'Salva come personaggio',
  'Prepared for scene reuse': 'Predisposto per riuso come scena',
  'Prepared for character workflows': 'Predisposto per workflow personaggio',

  // Generation box / styles
  'Image': 'Immagine',
  'Video': 'Video',
  'Audio': 'Audio',
  'Style': 'Stile',
  'Image Style': 'Stile immagine',
  'Image Styles': 'Stili immagine',
  'Visual presets applied to the visible prompt': 'Preset visivi applicati al prompt visibile',
  'No style': 'Nessuno stile',
  'No managed style': 'Nessuno stile gestito',
  'Quality': 'Qualita',
  'Seed': 'Seed',
  'Auto': 'Automatico',
  'Preview': 'Anteprima',
  'Balanced': 'Bilanciata',
  'Premium': 'Premium',
  'Applied in visible prompt:': 'Applicato nel prompt visibile:',
  'Custom Style': 'Stile personalizzato',
  'Example: luxury editorial fashion with soft golden light': 'Esempio: editoriale lusso con luce dorata morbida',
  'Generate': 'Genera',
  'Generating...': 'Generazione...',
  'Start Creating': 'Inizia a creare',
  'Use the prompt bar below to generate images and videos.': 'Usa la barra prompt qui sotto per generare immagini e video.',
  'Drag assets into the input box to use them as references.': 'Trascina asset nel box input per usarli come riferimenti.',
  'MODEL': 'MODELLO',
  'Image generation, prompt enhancement, and cloud text encoding.': 'Generazione immagini, miglioramento prompt e codifica testo cloud.',

  // Style categories
  'Realistic Photo': 'Foto realistica',
  'Cinematic': 'Cinematografico',
  'Illustration & Drawing': 'Illustrazione e disegno',
  'Animation & Cartoon': 'Animazione e cartoon',
  'Anime & Manga': 'Anime e manga',
  '3D Render': 'Render 3D',
  'Graphic Design': 'Graphic design',
  'Fantasy & Sci-Fi': 'Fantasy e sci-fi',
  'Artistic Painting': 'Pittura artistica',
  'Retro & Special': 'Retro e speciali',
  'Custom': 'Personalizzato',

  // Style labels
  'Realistic': 'Realistico',
  'Photorealistic': 'Fotorealistico',
  'Ultra Realistic': 'Ultra realistico',
  'Hyper Realistic': 'Iper realistico',
  'Studio Photography': 'Fotografia studio',
  'Portrait Photography': 'Fotografia ritratto',
  'Fashion Photography': 'Fotografia moda',
  'Product Photography': 'Fotografia prodotto',
  'Architectural Photography': 'Fotografia architettura',
  'Documentary Style': 'Stile documentario',
  'Cinematic Dramatic': 'Cinematografico drammatico',
  'Movie Still': 'Fotogramma film',
  'High-End Film Look': 'Look film premium',
  'Noir Cinematic': 'Noir cinematografico',
  'Epic Cinematic': 'Epico cinematografico',
  'Sci-Fi Cinematic': 'Sci-fi cinematografico',
  'Fantasy Cinematic': 'Fantasy cinematografico',
  'Illustration': 'Illustrazione',
  'Digital Painting': 'Pittura digitale',
  'Concept Art': 'Concept art',
  'Matte Painting': 'Matte painting',
  'Comic Book': 'Fumetto',
  'Graphic Novel': 'Graphic novel',
  'Western Comic': 'Fumetto occidentale',
  'Line Art': 'Line art',
  'Ink Drawing': 'Disegno a inchiostro',
  'Sketch': 'Schizzo',
  'Pencil Drawing': 'Disegno a matita',
  'Charcoal Drawing': 'Disegno a carboncino',
  'Manga': 'Manga',
  'Anime': 'Anime',
  'Cinematic Anime': 'Anime cinematografico',
  '90s Anime': 'Anime anni 90',
  'Chibi': 'Chibi',
  'Cartoon': 'Cartoon',
  'Kids Illustration': 'Illustrazione bambini',
  'Storybook Illustration': 'Illustrazione fiaba',
  'Fairy-Tale Animation': 'Animazione fiabesca',
  'Classic Animated Film': 'Film animato classico',
  'Storybook Princess Animation': 'Animazione fiaba principessa',
  'Family 3D Animation': 'Animazione 3D family',
  'Clay Animation': 'Animazione clay',
  'Realistic 3D': '3D realistico',
  'Stylized 3D': '3D stilizzato',
  'Clay Render': 'Render clay',
  'Toy Style': 'Stile giocattolo',
  'Isometric': 'Isometrico',
  'Low Poly': 'Low poly',
  'Game Art': 'Game art',
  'CGI': 'CGI',
  'Vector Art': 'Arte vettoriale',
  'Flat Illustration': 'Illustrazione flat',
  'Minimal': 'Minimale',
  'Poster Style': 'Stile poster',
  'Advertising Style': 'Stile pubblicitario',
  'Editorial Layout': 'Layout editoriale',
  'Luxury Brand': 'Brand lusso',
  'Infographic Style': 'Stile infografica',
  'Fantasy Art': 'Arte fantasy',
  'Dark Fantasy': 'Dark fantasy',
  'Surreal': 'Surreale',
  'Dreamlike': 'Onirico',
  'Cyberpunk': 'Cyberpunk',
  'Steampunk': 'Steampunk',
  'Gothic': 'Gotico',
  'Sci-Fi Art': 'Arte sci-fi',
  'Watercolor': 'Acquerello',
  'Oil Painting': 'Pittura a olio',
  'Acrylic Painting': 'Pittura acrilica',
  'Pastel Art': 'Pastello',
  'Renaissance Painting': 'Pittura rinascimentale',
  'Baroque Painting': 'Pittura barocca',
  'Impressionist': 'Impressionista',
  'Retro': 'Retro',
  'Vaporwave': 'Vaporwave',
  'Synthwave': 'Synthwave',
  'Pixel Art': 'Pixel art',
  'Pop Art': 'Pop art',
  'Abstract': 'Astratto',

  // Errors / dialogs
  'Generation Failed': 'Generazione non riuscita',
  'Something went wrong during generation. Please try again.': 'Qualcosa e andato storto durante la generazione. Riprova.',
  'TECHNICAL DETAILS': 'DETTAGLI TECNICI',
  'Try Again': 'Riprova',
  'Export': 'Esporta',
  'Export complete': 'Esportazione completata',
  'Export failed': 'Esportazione non riuscita',
  'Package (FCPXML)': 'Pacchetto (FCPXML)',
  'For Premiere Pro & DaVinci Resolve': 'Per Premiere Pro e DaVinci Resolve',
  'Video Export': 'Esportazione video',
  'Format': 'Formato',
  'Resolution': 'Risoluzione',
  'Frame Rate': 'Frame rate',
  'Options': 'Opzioni',
  'Burn-in subtitles': 'Sottotitoli impressi',
  'Add clips to the timeline to export.': 'Aggiungi clip alla timeline per esportare.',
  'Most compatible format': 'Formato piu compatibile',
  'Professional editing format': 'Formato editing professionale',
  'Web-optimized format': 'Formato ottimizzato per il web',
  'Import Timeline': 'Importa timeline',
  'Click to select timeline file': 'Clicca per selezionare il file timeline',
  'Supports .xml (FCP 7 XML), .fcpxml': 'Supporta .xml (FCP 7 XML), .fcpxml',
  'How to export from your NLE:': 'Come esportare dal tuo NLE:',
  'Parsing timeline...': 'Analisi timeline...',
  'Import Error': 'Errore importazione',
  'Name:': 'Nome:',
  'Duration:': 'Durata:',
  'Clips:': 'Clip:',
  'Video Tracks:': 'Tracce video:',
  'Audio Tracks:': 'Tracce audio:',
  'All media files found': 'Tutti i file media trovati',
  'No media references to link': 'Nessun riferimento media da collegare',

  // Tools panels
  'Retake': 'Rigenera sezione',
  'Clear video': 'Rimuovi video',
  'Replace video': 'Sostituisci video',
  'Drop a video to retake': 'Trascina un video da rigenerare',
  'Select the video part to regenerate': 'Seleziona la parte video da rigenerare',
  'IC-LoRA / Style Transfer': 'IC-LoRA / trasferimento stile',
  'Download Required: IC-LoRA Resources': 'Download richiesto: risorse IC-LoRA',
  'Accept license for these models:': 'Accetta la licenza per questi modelli:',
  'Input': 'Input',
  'Conditioning': 'Condizionamento',
  'Output': 'Output',
  'Drop or import a driving video': 'Trascina o importa un video guida',
  'Output video will appear here': 'Il video output apparira qui',
  'Canny Edges': 'Bordi Canny',
  'Edge detection': 'Rilevamento bordi',
  'Depth Map': 'Mappa profondita',
  'Estimated depth': 'Profondita stimata',

  // Keyboard shortcuts / menu
  'Keyboard Shortcuts': 'Scorciatoie tastiera',
  'Search actions or keys...': 'Cerca azioni o tasti...',
  'Reset all shortcuts to the selected preset': 'Ripristina tutte le scorciatoie al preset selezionato',
  'Save current layout as a custom preset': 'Salva il layout corrente come preset personalizzato',
  'Save as custom preset:': 'Salva come preset personalizzato:',
  'Preset name...': 'Nome preset...',
  'Modifiers:': 'Modificatori:',
  'Search menus...': 'Cerca menu...',
  'No results': 'Nessun risultato',
  'General': 'Generale',
  'API Keys': 'Chiavi API',
  'About': 'Informazioni',
  'Project Assets Path': 'Percorso asset progetto',
  'Videos Generation': 'Generazione video',
  'Generate With API': 'Genera con API',
  'Text Encoding': 'Codifica testo',
  'Recommended': 'Consigliato',
  'Prompt Cache': 'Cache prompt',
  'Skip repeat encoding calls': 'Evita chiamate ripetute di codifica',
  'Local Encoder': 'Encoder locale',
  'Downloading text encoder...': 'Download encoder testo...',
  'Compiles the model for optimized inference.': 'Compila il modello per inferenza ottimizzata.',
  'Experimental:': 'Sperimentale:',
  'Enter seed...': 'Inserisci seed...',
  'Generate random seed': 'Genera seed casuale',
  'AX Modal LLM': 'LLM AX Modal',
  'Modal Image Pipeline': 'Pipeline immagini Modal',
  'Images': 'Immagini',
  'Prompt enhancer endpoint': 'Endpoint miglioramento prompt',
  'FLUX image endpoint': 'Endpoint immagini FLUX',
  'Gemini API': 'API Gemini',
  'HuggingFace': 'HuggingFace',
  'LTX API key required': 'Chiave API LTX richiesta',
  'Text-to-Video': 'Testo-a-video',
  'Image-to-Video': 'Immagine-a-video',
  'LTX-2 Model License': 'Licenza modello LTX-2',
  'Third-Party Notices': 'Note di terze parti',
  'AI-Powered Video Editor': 'Editor video basato su AI',
  'License': 'Licenza',
  'Create and manage your video projects': 'Crea e gestisci i tuoi progetti video',
  'No projects yet': 'Ancora nessun progetto',
  'Create your first project to get started': 'Crea il tuo primo progetto per iniziare',
  'Create New Project': 'Crea nuovo progetto',
  'Rename Project': 'Rinomina progetto',
  'Project name': 'Nome progetto',
  'No favorites yet': 'Ancora nessun preferito',
  'Copy prompt': 'Copia prompt',
  'Image style': 'Stile immagine',
  'MODE': 'MODALITA',
  'CONDITIONING TYPE': 'TIPO CONDIZIONAMENTO',
  'STRENGTH': 'INTENSITA',
  'STR': 'INT',
  'IMAGE RESOLUTION': 'RISOLUZIONE IMMAGINE',
  'RATIO': 'FORMATO',
  'DURATION': 'DURATA',
  'RESOLUTION': 'RISOLUZIONE',
  'FPS': 'FPS',
  'ASPECT RATIO': 'FORMATO',
  'Trim in the panel above, then retake': 'Taglia nel pannello sopra, poi rigenera',
  'Idea / Editable Final Prompt': 'Idea / prompt finale modificabile',
  'Write the initial image idea. After Improve Prompt, this same box becomes the editable final prompt sent to FLUX.': "Scrivi l'idea iniziale dell'immagine. Dopo Migliora prompt, lo stesso box diventa il prompt finale modificabile inviato a FLUX.",
  'Aspect Ratio': 'Formato',
  'Language': 'Lingua',
  'Character generator and face swap are delegated to your Modal LLM/service.': 'Generatore personaggio e face swap sono delegati al tuo servizio/LLM Modal.',
  'Character Generator From Image': 'Generatore personaggio da immagine',
  'Character name': 'Nome personaggio',
  'Optional AX instructions for character identity, wardrobe, voice, continuity...': 'Istruzioni AX opzionali per identita personaggio, guardaroba, voce, continuita...',
  'Face Swap For Images And Videos': 'Face swap per immagini e video',
  'Optional AX instructions: preserve lighting, retain expression, keep camera motion...': 'Istruzioni AX opzionali: preserva illuminazione, espressione, movimento camera...',
  'Result': 'Risultato',
  'Off': 'Disattivato',
  'None': 'Nessuno',
  'Static': 'Statico',
  'Focus Shift': 'Cambio fuoco',
  'Dolly In': 'Dolly avanti',
  'Dolly Out': 'Dolly indietro',
  'Dolly Left': 'Dolly sinistra',
  'Dolly Right': 'Dolly destra',
  'Jib Up': 'Jib su',
  'Jib Down': 'Jib giu',
  'Space': 'Spazio',
  'Enter': 'Invio',
  'Shift': 'Maiusc',
  'Delete': 'Canc',
  'Del': 'Canc',
  'Home': 'Inizio',
  'End': 'Fine',
}

const ATTRIBUTE_NAMES = ['title', 'placeholder', 'aria-label'] as const
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'KBD'])
const SKIP_CLASS_PARTS = ['cm-', 'monaco', 'log-line', 'technical-details']

function translateValue(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const translated = EXACT_TRANSLATIONS[trimmed]
  if (!translated || translated === trimmed) return null
  return value.replace(trimmed, translated)
}

function shouldSkipElement(element: Element | null): boolean {
  if (!element) return false
  if (SKIP_TAGS.has(element.tagName)) return true
  const className = typeof element.className === 'string' ? element.className : ''
  if (SKIP_CLASS_PARTS.some((part) => className.includes(part))) return true
  return element.closest('textarea,input,code,pre,kbd,[data-no-translate="true"]') !== null
}

function translateTextNode(node: Text): void {
  if (shouldSkipElement(node.parentElement)) return
  const next = translateValue(node.nodeValue ?? '')
  if (next !== null) node.nodeValue = next
}

function translateElementAttributes(element: Element): void {
  if (shouldSkipElement(element)) return
  for (const attr of ATTRIBUTE_NAMES) {
    const value = element.getAttribute(attr)
    if (!value) continue
    const next = translateValue(value)
    if (next !== null) element.setAttribute(attr, next)
  }
}

function translateTree(root: ParentNode): void {
  if (root instanceof Element) translateElementAttributes(root)
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  let current = walker.nextNode()
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) translateTextNode(current as Text)
    if (current.nodeType === Node.ELEMENT_NODE) translateElementAttributes(current as Element)
    current = walker.nextNode()
  }
}

export function useItalianUi(): void {
  useEffect(() => {
    translateTree(document.body)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData' && mutation.target.nodeType === Node.TEXT_NODE) {
          translateTextNode(mutation.target as Text)
          continue
        }
        if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          translateElementAttributes(mutation.target)
          continue
        }
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text)
          if (node.nodeType === Node.ELEMENT_NODE) translateTree(node as Element)
        }
      }
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRIBUTE_NAMES],
    })
    return () => observer.disconnect()
  }, [])
}
