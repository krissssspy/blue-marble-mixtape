export const STRINGS = {
  welcomeTitle: 'BLUE MARBLE\nMIXTAPE',
  start: '↑ START',
  listen: 'LISTEN?\n↑ YES ↓ NO',
  close: '↓ CLOSE',
  loading: 'LOADING',
  ready: 'READY',
} as const;

export const TOUCH_STRINGS = {
  left: { arrow: '←', label: 'Walk left' },
  right: { arrow: '→', label: 'Walk right' },
  yes: { arrow: '↑', label: 'Yes' },
  no: { arrow: '↓', label: 'No' },
} as const;

export const AVATAR_LABELS = {
  skin: ['Light peach', 'Warm beige', 'Golden tan', 'Copper brown', 'Rich brown', 'Deep umber'],
  hair: ['Short crop', 'Side part', 'Waves', 'Afro', 'Braids', 'Ponytail'],
  outfit: ['Ocean blue', 'Forest green', 'Coral red', 'Sunflower yellow', 'Slate', 'Plum'],
  headgear: ['No headgear', 'Baseball cap', 'Beanie', 'Sun hat', 'Headband', 'Explorer hat'],
} as const;

export const AVATAR_COPY = {
  step: 'STEP',
  categories: ['SKIN', 'HAIR', 'OUTFIT', 'HEADGEAR'],
  previous: '←',
  next: '→',
  confirm: '↑ OK',
  back: '↓ BACK',
} as const;
