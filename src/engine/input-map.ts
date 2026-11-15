export type MuseumAction = 'left' | 'right' | 'yes' | 'no';

export function mapKey(key: string): MuseumAction | undefined {
  switch (key) {
    case 'ArrowLeft':
      return 'left';
    case 'ArrowRight':
      return 'right';
    case 'ArrowUp':
      return 'yes';
    case 'ArrowDown':
      return 'no';
    default:
      return undefined;
  }
}
