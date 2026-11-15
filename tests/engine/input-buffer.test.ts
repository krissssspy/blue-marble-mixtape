import { describe, expect, it } from 'vitest';
import { createInputBuffer } from '../../src/engine/input-buffer.js';

describe('createInputBuffer', () => {
  it('holds each movement direction across reads until its source releases it', () => {
    const buffer = createInputBuffer();
    buffer.press('keyboard-left', 'left');
    buffer.press('keyboard-right', 'right');

    expect(buffer.take()).toEqual({ left: true, right: true, pressed: ['left', 'right'] });
    expect(buffer.take()).toEqual({ left: true, right: true, pressed: [] });

    buffer.release('keyboard-left');
    expect(buffer.take()).toEqual({ left: false, right: true, pressed: [] });
    buffer.release('keyboard-right');
    expect(buffer.take()).toEqual({ left: false, right: false, pressed: [] });
  });

  it('reports new physical presses in order, ignores repeats, and accepts a re-press', () => {
    const buffer = createInputBuffer();
    buffer.press('keyboard-up', 'yes');
    buffer.press('keyboard-up', 'yes');
    buffer.press('keyboard-down', 'no');
    buffer.press('touch-up', 'yes');
    buffer.release('keyboard-up');
    buffer.press('keyboard-up', 'yes');

    const sample = buffer.take();

    buffer.press('keyboard-up', 'yes');
    buffer.release('keyboard-down');
    expect(buffer.take()).toEqual({ left: false, right: false, pressed: [] });
    expect(sample).toEqual({
      left: false,
      right: false,
      pressed: ['yes', 'no', 'yes', 'yes'],
    });

    buffer.press('keyboard-down', 'no');
    expect(buffer.take()).toEqual({ left: false, right: false, pressed: ['no'] });
  });

  it('keeps a direction held while another source still holds it', () => {
    const buffer = createInputBuffer();
    buffer.press('keyboard-left', 'left');
    buffer.press('touch-left', 'left');
    buffer.release('keyboard-left');

    expect(buffer.take()).toEqual({ left: true, right: false, pressed: ['left', 'left'] });

    buffer.release('touch-left');
    expect(buffer.take()).toEqual({ left: false, right: false, pressed: [] });
  });

  it('clears held keys and pending actions when input is reset', () => {
    const buffer = createInputBuffer();
    buffer.press('keyboard-left', 'left');
    buffer.press('keyboard-up', 'yes');

    buffer.clear();
    expect(buffer.take()).toEqual({ left: false, right: false, pressed: [] });

    buffer.press('keyboard-left', 'left');
    expect(buffer.take()).toEqual({ left: true, right: false, pressed: ['left'] });
  });
});
