export const STRINGS = {
  welcomeTitle: 'OVERTONE',
  start: '↑ START',
  listen: 'LISTEN?\n↑ YES ↓ NO',
  close: '↓ CLOSE',
  loading: 'LOADING',
  ready: 'READY',
  farewell: 'THANKS FOR\nVISITING',
  credits: '↑ CREDITS',
} as const;

export const CREDITS_COPY = {
  heading: 'Source credits',
  notice:
    'I share NASA imagery in Overtone, my independent museum project. I link to each original source.',
  controls: '← → Browse · ↓ Back',
} as const;

export const TOUCH_STRINGS = {
  left: { arrow: '←', label: 'Walk left' },
  right: { arrow: '→', label: 'Walk right' },
  yes: { arrow: '↑', label: 'Yes' },
  no: { arrow: '↓', label: 'No' },
} as const;

export const AVATAR_LABELS = {
  skin: ['Light peach', 'Warm beige', 'Golden tan', 'Copper brown', 'Rich brown', 'Deep umber'],
  hair: ['Short crop', 'Side sweep', 'Round afro', 'Twin braids', 'High ponytail'],
  outfit: ['Ocean blue', 'Forest green', 'Coral red', 'Sunflower yellow', 'Slate', 'Teal'],
  headgear: ['No headgear', 'Baseball cap', 'Beanie', 'Sun hat', 'Headband', 'Explorer hat'],
} as const;

export const AVATAR_COPY = {
  step: 'STEP',
  categories: ['COMPLEXION', 'HAIR', 'OUTFIT', 'HEADGEAR'],
  previous: '←',
  next: '→',
  confirm: '↑ OK',
  back: '↓ BACK',
} as const;

export const TUTORIAL_HINTS = [
  { arrows: ['←', '→'], label: 'WALK' },
  { arrows: ['↑'], label: 'YES' },
  { arrows: ['↓'], label: 'NO' },
] as const;

export const MONTH_ABBREVIATIONS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const;

export const ACCESSIBILITY_STRINGS = {
  canvasLabel: 'Overtone museum',
  listenPrompt: 'Listen to',
  farewell: 'I appreciate your visit to Overtone.',
} as const;

export const MUSEUM_ROOMS = [
  { id: 'sea-level', name: 'Sea Level', genre: 'Ambient drone' },
  { id: 'air-quality', name: 'Air Quality', genre: 'Glitch / IDM' },
  { id: 'biodiversity', name: 'Biodiversity', genre: 'Dawn chorus' },
  { id: 'wildfires', name: 'Wildfires', genre: 'Industrial' },
  { id: 'greenhouse-gases', name: 'Greenhouse Gases', genre: 'Baroque chorale' },
  { id: 'energy', name: 'Energy', genre: 'Synthwave' },
  { id: 'disasters', name: 'Disasters', genre: 'Cinematic' },
  { id: 'water-resources', name: 'Water Resources', genre: 'Lo-fi jazz' },
  { id: 'agriculture', name: 'Agriculture', genre: 'Folk / bluegrass' },
  { id: 'lab', name: 'Lab', genre: 'Visitor choice' },
] as const;

export const APP_STRINGS = {
  tutorial: 'Tutorial',
  museum: 'Museum',
  loadFailed: 'LOAD FAILED\n↑ RETRY',
} as const;

export const LAB_COPY = {
  invite: '↑ OPEN THE LAB',
  next: '↑ NEXT',
  play: '↑ PLAY',
  steps: {
    artifact: 'ARTIFACT',
    scan: 'SCAN',
    pitchSource: 'PITCH FROM',
    loudnessSource: 'LOUDNESS FROM',
    scale: 'SCALE',
    voice: 'VOICE',
    rhythm: 'RHYTHM',
    tempo: 'TEMPO',
    play: 'PLAY?',
  },
} as const;
