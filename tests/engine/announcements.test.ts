import { describe, expect, it } from 'vitest';
import { createMuseumAnnouncements } from '../../src/engine/announcements.js';

class ElementStub {
  private readonly attributes = new Map<string, string>();
  private text = '';
  readonly writes: string[] = [];
  className = '';

  constructor(readonly tagName: string) {}

  get textContent(): string {
    return this.text;
  }

  set textContent(value: string | null) {
    this.text = value ?? '';
    this.writes.push(this.text);
  }

  get ariaLabel(): string | null {
    return this.getAttribute('aria-label');
  }

  set ariaLabel(value: string) {
    this.setAttribute('aria-label', value);
  }

  set role(value: string) {
    this.setAttribute('role', value);
  }

  set ariaLive(value: string) {
    this.setAttribute('aria-live', value);
  }

  set ariaAtomic(value: string) {
    this.setAttribute('aria-atomic', value);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }
}

function setup() {
  const canvas = new ElementStub('CANVAS');
  const document = {
    createElement: (tag: string) => new ElementStub(tag.toUpperCase()),
  } as unknown as Document;
  const { liveRegion, update } = createMuseumAnnouncements(
    document,
    canvas as unknown as HTMLCanvasElement,
  );
  return { canvas, liveRegion: liveRegion as unknown as ElementStub, update };
}

describe('museum announcements', () => {
  it('names the canvas and supplies a polite, atomic status region', () => {
    const { canvas, liveRegion } = setup();

    expect(canvas.getAttribute('aria-label')).toMatch(/blue marble mixtape|museum/i);
    expect(liveRegion.tagName).toBe('DIV');
    expect(liveRegion.className).toBe('museum-announcements');
    expect(liveRegion.getAttribute('role')).toBe('status');
    expect(liveRegion.getAttribute('aria-live')).toBe('polite');
    expect(liveRegion.getAttribute('aria-atomic')).toBe('true');
  });

  it('announces new avatar choices and room names without repeated DOM updates', () => {
    const { liveRegion, update } = setup();

    update({ avatarChoice: 'Coral coat' });
    expect(liveRegion.textContent).toContain('Coral coat');
    const firstChoiceWrites = [...liveRegion.writes];
    update({ avatarChoice: 'Coral coat' });
    expect(liveRegion.writes).toEqual(firstChoiceWrites);

    update({ avatarChoice: 'Slate coat' });
    expect(liveRegion.textContent).toContain('Slate coat');
    update({ roomName: 'Sea Level' });
    expect(liveRegion.textContent).toContain('Sea Level');
    const firstRoomWrites = [...liveRegion.writes];
    update({ roomName: 'Sea Level' });
    expect(liveRegion.writes).toEqual(firstRoomWrites);

    update({ roomName: 'Air Quality' });
    expect(liveRegion.textContent).toContain('Air Quality');
  });

  it('announces an artifact prompt once and announces it again after leaving and returning', () => {
    const { liveRegion, update } = setup();

    update({ roomName: 'Sea Level' });
    update({ roomName: 'Sea Level', prompt: { title: 'Coastal Tide Gauge' } });
    expect(liveRegion.textContent).toContain('Coastal Tide Gauge');
    expect(liveRegion.textContent).toMatch(/listen/i);
    const firstPromptWrites = [...liveRegion.writes];
    update({ roomName: 'Sea Level', prompt: { title: 'Coastal Tide Gauge' } });
    expect(liveRegion.writes).toEqual(firstPromptWrites);

    update({ roomName: 'Sea Level' });
    const beforeReentry = liveRegion.writes.length;
    update({ roomName: 'Sea Level', prompt: { title: 'Coastal Tide Gauge' } });
    expect(liveRegion.writes).toHaveLength(beforeReentry + 1);
    expect(liveRegion.textContent).toContain('Coastal Tide Gauge');
  });

  it('clears an empty view once and can announce the same prompt afterward', () => {
    const { liveRegion, update } = setup();
    const prompt = { prompt: { title: 'Coastal Tide Gauge' } };

    update({});
    expect(liveRegion.writes).toEqual([]);
    update(prompt);
    const announcement = liveRegion.textContent;
    expect(announcement).toContain(prompt.prompt.title);

    update({});
    expect(liveRegion.textContent).toBe('');
    expect(liveRegion.writes).toEqual([announcement, '']);
    update({});
    expect(liveRegion.writes).toEqual([announcement, '']);

    update(prompt);
    expect(liveRegion.textContent).toBe(announcement);
    expect(liveRegion.writes).toEqual([announcement, '', announcement]);
  });

  it('announces the listening title and credits without rewriting identical text', () => {
    const { liveRegion, update } = setup();

    const title = 'Arctic Sea Ice';
    const creditLine = 'NASA Scientific Visualization Studio';
    update({ listening: { title, creditLine } });

    expect(liveRegion.textContent).toContain(title);
    expect(liveRegion.textContent).toContain(creditLine);
    const listeningWrites = [...liveRegion.writes];
    update({ listening: { title, creditLine } });
    expect(liveRegion.writes).toEqual(listeningWrites);
  });
});
