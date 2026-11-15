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
