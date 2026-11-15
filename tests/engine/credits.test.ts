import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createSourceCredits } from '../../src/engine/credits.js';
import type { MuseumCatalog } from '../../src/engine/museum-assets.js';

class Element {
  readonly children: Element[] = [];
  readonly attributes = new Map<string, string>();
  textContentUpdates = 0;
  private text = '';
  href = '';
  dateTime = '';
  id = '';
  rel = '';
  target = '';
  hidden = false;
  className = '';

  constructor(readonly tagName: string) {}

  get textContent(): string {
    return this.text;
  }

  set textContent(value: string) {
    this.text = value;
    this.textContentUpdates += 1;
  }

  append(...children: Element[]): void {
    this.children.push(...children);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
}

describe('source credits', () => {
  it('presents the exact catalog attribution, date, and source link', () => {
    const { artifacts } = JSON.parse(
      readFileSync(new URL('../../public/catalog.json', import.meta.url), 'utf8'),
    ) as MuseumCatalog;
    const document = { createElement: (name: string) => new Element(name) } as unknown as Document;
    const { element, show } = createSourceCredits(document);
    const section = element as unknown as Element;
    expect(section).toMatchObject({
      tagName: 'section',
      className: 'museum-credits',
      hidden: true,
    });
    const [card] = section.children;
    const [title, count, link, date, credit, notice, navigation] = card.children;
    expect(card).toMatchObject({ tagName: 'div', className: 'museum-credit-card' });
    expect([count, credit, notice, navigation].map(({ tagName }) => tagName)).toEqual([
      'p',
      'p',
      'p',
      'p',
    ]);
    expect(title).toMatchObject({ tagName: 'h1', textContent: 'Source credits' });
    expect(section.attributes.get('aria-labelledby')).toBe(title.id);
    expect(notice.textContent).toContain('independent museum project');
    expect(navigation.textContent).toContain('↓ Back');
    for (const index of [0, artifacts.length - 1]) {
      const artifact = artifacts[index];
      show(artifact, index, artifacts.length);
      expect(count.textContent).toBe(`${index + 1} / ${artifacts.length}`);
      expect(link).toMatchObject({
        tagName: 'a',
        textContent: artifact.title,
        href: artifact.sourceUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
      });
      expect(date).toMatchObject({
        tagName: 'time',
        dateTime: artifact.displayDate,
        textContent: artifact.displayDate,
      });
      expect(credit.textContent).toBe(artifact.creditLine);
      const updates = link.textContentUpdates;
      show(artifact, index, artifacts.length);
      expect(link.textContentUpdates).toBe(updates);
    }
    show(artifacts.at(-1)!, 0, artifacts.length);
    expect(count.textContent).toBe(`1 / ${artifacts.length}`);
    show(artifacts[0], 0, artifacts.length);
    expect(link.textContent).toBe(artifacts[0].title);
  });
});
