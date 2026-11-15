import { CREDITS_COPY } from '../strings.js';
import type { CatalogArtifact } from './museum-assets.js';

export function createLinerNotes(document: Document) {
  const element = document.createElement('section');
  element.className = 'museum-credits';
  element.hidden = true;
  element.setAttribute('aria-labelledby', 'museum-credits-heading');

  const card = document.createElement('div');
  card.className = 'museum-credit-card';

  const heading = document.createElement('h1');
  heading.id = 'museum-credits-heading';
  heading.textContent = CREDITS_COPY.heading;
  const count = document.createElement('p');
  const link = document.createElement('a');
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  const date = document.createElement('time');
  const credit = document.createElement('p');
  const notice = document.createElement('p');
  notice.textContent = CREDITS_COPY.notice;
  const controls = document.createElement('p');
  controls.textContent = CREDITS_COPY.controls;
  card.append(heading, count, link, date, credit, notice, controls);
  element.append(card);

  let shown: string | null = null;
  function show(artifact: CatalogArtifact, index: number, total: number): void {
    const position = `${index + 1} / ${total}`;
    if (shown === artifact.id && count.textContent === position) return;
    shown = artifact.id;
    count.textContent = position;
    link.textContent = artifact.title;
    link.href = artifact.sourceUrl;
    date.dateTime = artifact.displayDate;
    date.textContent = artifact.displayDate;
    credit.textContent = artifact.creditLine;
  }

  return { element, show };
}
