import { describe, expect, it } from 'vitest';
import { createInputBuffer } from '../../src/engine/input-buffer.js';
import { createTouchControls } from '../../src/engine/touch-controls.js';

class ElementStub extends EventTarget {
  readonly children: ElementStub[] = [];
  readonly dataset: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  readonly captureReleases: number[] = [];
  private readonly captures = new Set<number>();
  textContent = '';
  className = '';

  constructor(readonly tagName: string) {
    super();
  }

  get type(): string | null {
    return this.getAttribute('type');
  }

  set type(value: string) {
    this.setAttribute('type', value);
  }

  get ariaLabel(): string | null {
    return this.getAttribute('aria-label');
  }

  set ariaLabel(value: string) {
    this.setAttribute('aria-label', value);
  }

  append(...children: ElementStub[]): void {
    this.children.push(...children);
  }

  appendChild(child: ElementStub): ElementStub {
    this.append(child);
    return child;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setPointerCapture(id: number): void {
    this.captures.add(id);
  }

  hasPointerCapture(id: number): boolean {
    return this.captures.has(id);
  }

  releasePointerCapture(id: number): void {
    this.captureReleases.push(id);
    this.dropCaptureFromBrowser(id);
  }

  dropCaptureFromBrowser(id: number): void {
    this.captures.delete(id);
  }
}

class PointerStub extends Event {
  constructor(
    type: string,
    readonly pointerId: number,
    readonly pointerType = 'touch',
  ) {
    super(type, { cancelable: true });
  }
}

function setup() {
  const doc = { createElement: (tag: string) => new ElementStub(tag.toUpperCase()) };
  const input = createInputBuffer();
  const controls = createTouchControls(doc as unknown as Document, input) as unknown as ElementStub;
  const buttons = controls.children.flatMap((group) => group.children);
  return { controls, buttons, input };
}

describe('touch controls', () => {
  it('groups four labeled arrow buttons under the left and right thumbs', () => {
    const { controls, buttons } = setup();

    expect(controls.className).toBe('touch-controls');
    expect(controls.children.map((group) => group.className)).toEqual([
      'touch-controls__group',
      'touch-controls__group',
    ]);
    expect(controls.children.map((group) => group.children.length)).toEqual([2, 2]);
    expect(
      buttons.map((button) => [
        button.tagName,
        button.type,
        button.textContent,
        button.getAttribute('aria-label'),
      ]),
    ).toEqual([
      ['BUTTON', 'button', '←', 'Walk left'],
      ['BUTTON', 'button', '→', 'Walk right'],
      ['BUTTON', 'button', '↑ Yes', 'Yes'],
      ['BUTTON', 'button', '↓ No', 'No'],
    ]);
  });

  it('holds touch movement and sends each confirm or decline as a normal press', () => {
    const { buttons, input } = setup();
    for (const [index, button] of buttons.entries()) {
      const press = new PointerStub('pointerdown', index + 8);
      button.dispatchEvent(press);

      expect(press.defaultPrevented).toBe(true);
      expect(button.hasPointerCapture(press.pointerId)).toBe(true);
    }

    expect(input.take()).toEqual({
      left: true,
      right: true,
      pressed: ['left', 'right', 'yes', 'no'],
    });
    expect(input.take()).toEqual({ left: true, right: true, pressed: [] });
  });

  it.each(['pointerup', 'pointercancel', 'lostpointercapture'])(
    'releases only the matching touch on %s',
    (type) => {
      const { buttons, input } = setup();
      const [left, right] = buttons;

      left.dispatchEvent(new PointerStub('pointerdown', 8));
      left.dispatchEvent(new PointerStub('pointerdown', 9));
      right.dispatchEvent(new PointerStub('pointerdown', 10));
      input.take();

      expect(left.hasPointerCapture(8)).toBe(true);
      expect(left.hasPointerCapture(9)).toBe(true);
      expect(right.hasPointerCapture(10)).toBe(true);

      left.dispatchEvent(new PointerStub(type, 8));
      expect(left.hasPointerCapture(8)).toBe(false);
      expect(left.hasPointerCapture(9)).toBe(true);
      expect(right.hasPointerCapture(10)).toBe(true);
      expect(input.take()).toEqual({ left: true, right: true, pressed: [] });

      left.dispatchEvent(new PointerStub(type, 9));
      expect(left.hasPointerCapture(9)).toBe(false);
      expect(right.hasPointerCapture(10)).toBe(true);
      expect(input.take()).toEqual({ left: false, right: true, pressed: [] });
    },
  );

  it('releases input after the browser has already dropped pointer capture', () => {
    const { buttons, input } = setup();
    const [left, right] = buttons;

    left.dispatchEvent(new PointerStub('pointerdown', 8));
    right.dispatchEvent(new PointerStub('pointerdown', 9));
    expect(input.take()).toEqual({ left: true, right: true, pressed: ['left', 'right'] });

    left.dropCaptureFromBrowser(8);
    left.dispatchEvent(new PointerStub('lostpointercapture', 8));

    expect(left.captureReleases).toEqual([]);
    expect(right.hasPointerCapture(9)).toBe(true);
    expect(input.take()).toEqual({ left: false, right: true, pressed: [] });
  });

  it('ignores mouse releases while touch movement is held', () => {
    const { buttons, input } = setup();
    const [left] = buttons;

    left.dispatchEvent(new PointerStub('pointerdown', 8));
    expect(input.take()).toEqual({ left: true, right: false, pressed: ['left'] });

    left.dispatchEvent(new PointerStub('pointerup', 8, 'mouse'));

    expect(left.captureReleases).toEqual([]);
    expect(left.hasPointerCapture(8)).toBe(true);
    expect(input.take()).toEqual({ left: true, right: false, pressed: [] });
  });

  it('ignores mouse pointers', () => {
    const { buttons, input } = setup();
    const [left, , yes] = buttons;

    left.dispatchEvent(new PointerStub('pointerdown', 8, 'mouse'));
    yes.dispatchEvent(new PointerStub('pointerdown', 9, 'mouse'));

    expect(left.hasPointerCapture(8)).toBe(false);
    expect(yes.hasPointerCapture(9)).toBe(false);
    expect(input.take()).toEqual({ left: false, right: false, pressed: [] });
  });
});
