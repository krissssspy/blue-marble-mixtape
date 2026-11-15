import { ACCESSIBILITY_STRINGS } from '../strings.js';

interface AnnouncementState {
  readonly avatarChoice?: string;
  readonly roomName?: string;
  readonly prompt?: { readonly title: string };
  readonly listening?: { readonly title: string; readonly creditLine: string };
}

function announcementText({ avatarChoice, roomName, prompt, listening }: AnnouncementState) {
  if (listening) return `${listening.title}. ${listening.creditLine}`;
  if (prompt) return `${ACCESSIBILITY_STRINGS.listenPrompt} ${prompt.title}?`;
  return avatarChoice ?? roomName ?? '';
}

export function createMuseumAnnouncements(document: Document, canvas: HTMLCanvasElement) {
  canvas.setAttribute('aria-label', ACCESSIBILITY_STRINGS.canvasLabel);
  const liveRegion = document.createElement('div');
  liveRegion.className = 'museum-announcements';
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');

  function update(state: AnnouncementState) {
    const text = announcementText(state);
    if (liveRegion.textContent !== text) liveRegion.textContent = text;
  }

  return { liveRegion, update };
}
