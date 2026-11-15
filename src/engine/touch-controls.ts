import { TOUCH_STRINGS } from '../strings.js';
import type { createInputBuffer } from './input-buffer.js';

type TouchInput = Pick<ReturnType<typeof createInputBuffer>, 'press' | 'release'>;

export function createTouchControls(document: Document, input: TouchInput): HTMLDivElement {
  const controls = document.createElement('div');
  controls.className = 'touch-controls';

  for (const actions of [
    ['left', 'right'],
    ['yes', 'no'],
  ] as const) {
    const group = document.createElement('div');
    group.className = 'touch-controls__group';
    for (const action of actions) {
      const { arrow, label } = TOUCH_STRINGS[action];
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action === 'yes' || action === 'no' ? `${arrow} ${label}` : arrow;
      button.setAttribute('aria-label', label);

      button.addEventListener('pointerdown', (event) => {
        if (event.pointerType !== 'touch') return;
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        input.press(`touch:${event.pointerId}`, action);
      });

      const endTouch = (event: PointerEvent): void => {
        if (event.pointerType !== 'touch') return;
        input.release(`touch:${event.pointerId}`);
        if (button.hasPointerCapture(event.pointerId))
          button.releasePointerCapture(event.pointerId);
      };
      button.addEventListener('pointerup', endTouch);
      button.addEventListener('pointercancel', endTouch);
      button.addEventListener('lostpointercapture', endTouch);
      group.append(button);
    }
    controls.append(group);
  }

  return controls;
}
