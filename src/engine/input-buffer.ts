import type { MuseumAction } from './input-map.js';

export interface InputSample {
  readonly left: boolean;
  readonly right: boolean;
  readonly pressed: readonly MuseumAction[];
}

export function createInputBuffer() {
  const held = new Map<string, MuseumAction>();
  let pending: MuseumAction[] = [];

  return {
    press(source: string, action: MuseumAction): void {
      if (held.has(source)) return;
      held.set(source, action);
      pending.push(action);
    },
    release(source: string): void {
      held.delete(source);
    },
    take(): InputSample {
      const actions = [...held.values()];
      const pressed = pending;
      pending = [];
      return { left: actions.includes('left'), right: actions.includes('right'), pressed };
    },
    clear(): void {
      held.clear();
      pending = [];
    },
  };
}
