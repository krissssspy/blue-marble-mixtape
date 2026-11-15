export function configureTouchLayout(
  shell: HTMLElement,
  controls: HTMLElement,
  maxTouchPoints: number,
): void {
  const hasTouch = maxTouchPoints > 0;
  controls.hidden = !hasTouch;
  shell.classList.toggle('museum-shell--touch', hasTouch);
}
