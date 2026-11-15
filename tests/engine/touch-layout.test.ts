import { describe, expect, it } from 'vitest';
import { configureTouchLayout } from '../../src/engine/touch-layout.js';

const touchClass = 'museum-shell--touch';

function setup(initiallyTouch = false) {
  const names = new Set(['museum-shell']);
  if (initiallyTouch) names.add(touchClass);

  const controls = { hidden: !initiallyTouch } as HTMLElement;
  const shell = {
    children: [controls],
    classList: {
      add: (...tokens: string[]) => tokens.forEach((token) => names.add(token)),
      remove: (...tokens: string[]) => tokens.forEach((token) => names.delete(token)),
      contains: (token: string) => names.has(token),
      toggle(token: string, force = !names.has(token)) {
        if (force) names.add(token);
        else names.delete(token);
        return force;
      },
    },
  };

  return {
    controls,
    shell,
    configure(maxTouchPoints: number) {
      configureTouchLayout(shell as unknown as HTMLElement, controls, maxTouchPoints);
    },
  };
}

describe('touch layout capability', () => {
  it('hides the controls and clears touch layout when there are no touch points', () => {
    const view = setup(true);
    view.configure(0);

    expect(view.controls.hidden).toBe(true);
    expect(view.shell.classList.contains(touchClass)).toBe(false);
    expect(view.shell.classList.contains('museum-shell')).toBe(true);
  });

  it.each([1, 5])('shows the controls and enables touch layout for %i touch points', (points) => {
    const view = setup();
    view.configure(points);

    expect(view.controls.hidden).toBe(false);
    expect(view.shell.classList.contains(touchClass)).toBe(true);
  });

  it('adapts to capability changes without replacing the controls', () => {
    const view = setup();
    const states = [2, 0, 3, 0].map((points) => {
      view.configure(points);
      expect(view.shell.children).toHaveLength(1);
      expect(view.shell.children[0]).toBe(view.controls);
      return [view.controls.hidden, view.shell.classList.contains(touchClass)];
    });

    expect(states).toEqual([
      [false, true],
      [true, false],
      [false, true],
      [true, false],
    ]);
  });
});
