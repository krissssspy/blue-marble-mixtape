import { fillRect, type Framebuffer } from './framebuffer.js';

export interface ImagePoint {
  readonly x: number;
  readonly y: number;
}

export interface ImageRect extends ImagePoint {
  readonly width: number;
  readonly height: number;
}

export type PlayheadLocation =
  | (ImagePoint & { readonly kind: 'point' })
  | { readonly kind: 'line'; readonly from: ImagePoint; readonly to: ImagePoint }
  | { readonly kind: 'ring'; readonly center: ImagePoint; readonly radius: number }
  | { readonly kind: 'path'; readonly points: readonly ImagePoint[] }
  | (ImageRect & { readonly kind: 'region' });

const highlight = 6;

export function fitImageRect(
  viewWidth: number,
  viewHeight: number,
  naturalWidth: number,
  naturalHeight: number,
): ImageRect | null {
  if (naturalWidth <= 0 || naturalHeight <= 0) return null;
  const scale = Math.min(viewWidth / naturalWidth, viewHeight / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return { x: (viewWidth - width) / 2, y: (viewHeight - height) / 2, width, height };
}

export function drawPlayhead(
  frame: Framebuffer,
  image: ImageRect,
  locations: readonly PlayheadLocation[],
): void {
  const left = Math.ceil(image.x);
  const top = Math.ceil(image.y);
  const right = Math.ceil(image.x + image.width);
  const bottom = Math.ceil(image.y + image.height);

  function mapPoint({ x, y }: ImagePoint): ImagePoint {
    return {
      x: Math.max(left, Math.min(right - 1, Math.round(image.x + x * image.width))),
      y: Math.max(top, Math.min(bottom - 1, Math.round(image.y + y * image.height))),
    };
  }

  function mark(x: number, y: number): void {
    if (x >= left && x < right && y >= top && y < bottom) {
      fillRect(frame, x, y, 1, 1, highlight);
    }
  }

  function line(from: ImagePoint, to: ImagePoint): void {
    const start = mapPoint(from);
    const end = mapPoint(to);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const steps = Math.max(1, Math.abs(dx), Math.abs(dy));
    for (let step = 0; step <= steps; step += 1) {
      mark(Math.round(start.x + (dx * step) / steps), Math.round(start.y + (dy * step) / steps));
    }
  }

  function path(points: readonly ImagePoint[]): void {
    for (let index = 1; index < points.length; index += 1) line(points[index - 1], points[index]);
  }

  for (const location of locations) {
    switch (location.kind) {
      case 'point': {
        const { x, y } = mapPoint(location);
        for (let offset = -2; offset <= 2; offset += 1) {
          mark(x + offset, y);
          mark(x, y + offset);
        }
        break;
      }
      case 'line':
        line(location.from, location.to);
        break;
      case 'ring': {
        const { x, y } = mapPoint(location.center);
        const radius = location.radius * Math.min(image.width, image.height);
        const steps = Math.max(1, Math.ceil(2 * Math.PI * radius));
        for (let step = 0; step < steps; step += 1) {
          const angle = (2 * Math.PI * step) / steps;
          mark(Math.round(x + radius * Math.cos(angle)), Math.round(y + radius * Math.sin(angle)));
        }
        break;
      }
      case 'path':
        path(location.points);
        break;
      case 'region': {
        const { x, y, width, height } = location;
        path([
          { x, y },
          { x: x + width, y },
          { x: x + width, y: y + height },
          { x, y: y + height },
          { x, y },
        ]);
        break;
      }
    }
  }
}
