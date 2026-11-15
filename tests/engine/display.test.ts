import { describe, expect, it, vi } from 'vitest';
import { createCanvasPresenter, writeFrameRgba } from '../../src/engine/display.js';
import { createFramebuffer } from '../../src/engine/framebuffer.js';

describe('writeFrameRgba', () => {
  it('expands a frame to opaque RGBA in row order without changing its indices', () => {
    const frame = createFramebuffer();
    const lastPixel = frame.pixels.length - 1;
    frame.pixels[0] = 6;
    frame.pixels[319] = 15;
    frame.pixels[320] = 7;
    frame.pixels[lastPixel] = 5;
    const sourceBefore = frame.pixels.slice();
    const target = new Uint8ClampedArray(frame.pixels.length * 4).fill(17);
    const expected = Buffer.alloc(target.length, Buffer.from([11, 16, 38, 255]));
    expected.set([255, 204, 51, 255], 0);
    expected.set([242, 199, 154, 255], 319 * 4);
    expected.set([255, 107, 107, 255], 320 * 4);
    expected.set([244, 241, 222, 255], lastPixel * 4);

    writeFrameRgba(frame, target);

    expect(Buffer.from(target).equals(expected)).toBe(true);
    expect(frame.pixels).toEqual(sourceBefore);

    frame.pixels[319] = 0;
    sourceBefore[319] = 0;
    target[target.length - 1] = 17;
    expected.set([11, 16, 38, 255], 319 * 4);

    writeFrameRgba(frame, target);

    expect(Buffer.from(target).equals(expected)).toBe(true);
    expect(frame.pixels).toEqual(sourceBefore);
  });
});

function canvasFixture(frame = createFramebuffer()) {
  const context = {
    imageSmoothingEnabled: true,
    createImageData: vi.fn((width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    })),
    putImageData: vi.fn<(image: ImageData, x: number, y: number) => void>(),
  };
  const canvas = {
    width: 300,
    height: 150,
    style: {},
    getContext: vi.fn(() => context),
  };
  return {
    canvas,
    context,
    presenter: createCanvasPresenter(canvas as unknown as HTMLCanvasElement, frame),
  };
}

describe('createCanvasPresenter', () => {
  it('uses the native framebuffer size and disables smoothing', () => {
    const { canvas, context } = canvasFixture();

    expect(canvas.getContext).toHaveBeenCalledWith('2d');
    expect([canvas.width, canvas.height]).toEqual([320, 180]);
    expect(context.imageSmoothingEnabled).toBe(false);
    expect(canvas.style).toMatchObject({ imageRendering: 'pixelated', position: 'absolute' });
  });

  it('fits and centers the canvas at integer scales, with a minimum of one', () => {
    const { canvas, presenter } = canvasFixture();

    presenter.resize(1000, 760);
    expect(canvas.style).toMatchObject({
      width: '960px',
      height: '540px',
      left: '20px',
      top: '110px',
    });

    presenter.resize(970, 400);
    expect(canvas.style).toMatchObject({
      width: '640px',
      height: '360px',
      left: '165px',
      top: '20px',
    });

    presenter.resize(200, 100);
    expect(canvas.style).toMatchObject({
      width: '320px',
      height: '180px',
      left: '-60px',
      top: '-40px',
    });
    expect([canvas.width, canvas.height]).toEqual([320, 180]);
  });

  it('draws current opaque RGBA pixels through one reusable ImageData', () => {
    const frame = createFramebuffer();
    const { context, presenter } = canvasFixture(frame);
    frame.pixels[0] = 6;

    presenter.draw();

    const [firstImage, x, y] = context.putImageData.mock.calls[0];
    expect([firstImage.width, firstImage.height, x, y]).toEqual([320, 180, 0, 0]);
    expect([...firstImage.data.slice(0, 8)]).toEqual([255, 204, 51, 255, 11, 16, 38, 255]);
    frame.pixels[0] = 0;
    frame.pixels[1] = 7;

    presenter.draw();

    expect(context.putImageData).toHaveBeenCalledTimes(2);
    expect(context.createImageData).toHaveBeenCalledExactlyOnceWith(320, 180);
    expect(context.putImageData.mock.calls[1][0]).toBe(firstImage);
    expect([...firstImage.data.slice(0, 8)]).toEqual([11, 16, 38, 255, 255, 107, 107, 255]);
  });

  it('reports when the canvas has no 2D context', () => {
    const canvas = { style: {}, getContext: () => null } as unknown as HTMLCanvasElement;

    expect(() => createCanvasPresenter(canvas, createFramebuffer())).toThrow(/2d context/i);
  });
});
