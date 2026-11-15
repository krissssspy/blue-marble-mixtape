import { transparentIndex, type Framebuffer } from './framebuffer.js';
import { FRAME_PALETTE } from './palette.js';

const rgbaPalette = FRAME_PALETTE.map((hex) => {
  const rgb = Number.parseInt(hex.slice(1), 16);
  return [(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255, 255];
});

const transparentRgba = [0, 0, 0, 0];

export function writeFrameRgba(frame: Framebuffer, target: Uint8ClampedArray): void {
  for (let pixel = 0; pixel < frame.pixels.length; pixel += 1) {
    const index = frame.pixels[pixel];
    target.set(index === transparentIndex ? transparentRgba : rgbaPalette[index], pixel * 4);
  }
}

export function createCanvasPresenter(canvas: HTMLCanvasElement, frame: Framebuffer) {
  canvas.width = frame.width;
  canvas.height = frame.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not get a 2D context for the game canvas.');

  context.imageSmoothingEnabled = false;
  canvas.style.imageRendering = 'pixelated';
  canvas.style.position = 'absolute';
  const image = context.createImageData(frame.width, frame.height);

  return {
    resize(hostWidth: number, hostHeight: number): void {
      const scale = Math.max(
        1,
        Math.floor(Math.min(hostWidth / frame.width, hostHeight / frame.height)),
      );
      const width = frame.width * scale;
      const height = frame.height * scale;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.style.left = `${(hostWidth - width) / 2}px`;
      canvas.style.top = `${(hostHeight - height) / 2}px`;
    },
    draw(): void {
      writeFrameRgba(frame, image.data);
      context.putImageData(image, 0, 0);
    },
  };
}
