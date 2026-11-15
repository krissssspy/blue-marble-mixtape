const viewportWidth = 320;

export function cameraLeft(explorerX: number, roomWidth: number): number {
  return Math.max(0, Math.min(explorerX - viewportWidth / 2, roomWidth - viewportWidth));
}
