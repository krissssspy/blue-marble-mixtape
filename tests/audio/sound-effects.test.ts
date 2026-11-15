import { describe, expect, it, vi } from 'vitest';
import { createSoundEffects, type SoundEffectContext } from '../../src/audio/sound-effects.js';

function fixture(state: AudioContextState = 'running') {
  const parameter = () => ({
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  });
  function createTone() {
    return {
      type: '',
      frequency: parameter(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };
  }
  function createGain() {
    return { gain: parameter(), connect: vi.fn(), disconnect: vi.fn() };
  }
  const tones: ReturnType<typeof createTone>[] = [];
  const gains: ReturnType<typeof createGain>[] = [];
  const context = {
    state,
    currentTime: 0,
    destination: {},
    createOscillator: vi.fn(() => {
      const tone = createTone();
      tones.push(tone);
      return tone;
    }),
    createGain: vi.fn(() => {
      const gain = createGain();
      gains.push(gain);
      return gain;
    }),
  };
  const effects = createSoundEffects(context as unknown as SoundEffectContext);
  return { context, tones, gains, ...effects };
}

describe('museum sound effects', () => {
  it('makes no audio nodes before the shared context is running', () => {
    const { context, select, footstep } = fixture('suspended');
    select();
    footstep();
    expect(context.createOscillator).not.toHaveBeenCalled();
    expect(context.createGain).not.toHaveBeenCalled();
    context.state = 'running';
    select();
    expect(context.createOscillator).toHaveBeenCalledOnce();
  });

  it('plays a brief quiet selection click and disconnects on completion', () => {
    const { context, tones, gains, select } = fixture();
    context.currentTime = 2;
    select();
    const [tone] = tones;
    const [gain] = gains;
    expect(tone.type).toBe('sine');
    expect(tone.frequency.setValueAtTime).toHaveBeenCalledExactlyOnceWith(580, 2);
    expect(tone.frequency.exponentialRampToValueAtTime).toHaveBeenCalledExactlyOnceWith(455, 2.052);
    expect(gain.gain.setValueAtTime).toHaveBeenCalledExactlyOnceWith(0, 2);
    expect(gain.gain.linearRampToValueAtTime.mock.calls).toEqual([
      [0.018, 2.004],
      [0, 2.052],
    ]);
    expect(tone.connect).toHaveBeenCalledExactlyOnceWith(gain);
    expect(gain.connect).toHaveBeenCalledExactlyOnceWith(context.destination);
    expect(tone.start).toHaveBeenCalledExactlyOnceWith(2);
    expect(tone.stop).toHaveBeenCalledExactlyOnceWith(2.052);
    expect(tone.disconnect).not.toHaveBeenCalled();
    expect(gain.disconnect).not.toHaveBeenCalled();
    tone.onended!();
    expect(tone.disconnect).toHaveBeenCalledOnce();
    expect(gain.disconnect).toHaveBeenCalledOnce();
  });

  it('gives footsteps a softer low timbre with an independent walking cadence', () => {
    const { tones, gains, context, select, footstep } = fixture();
    footstep();
    footstep();
    context.currentTime = 0.19;
    footstep();
    select();
    context.currentTime = 0.2;
    footstep();
    select();
    context.currentTime = 0.25;
    select();
    expect(tones.map(({ type }) => type)).toEqual(['triangle', 'sine', 'triangle', 'sine']);
    expect(tones[0].frequency.setValueAtTime).toHaveBeenCalledExactlyOnceWith(132, 0);
    expect(tones[0].frequency.exponentialRampToValueAtTime).toHaveBeenCalledExactlyOnceWith(
      58,
      0.082,
    );
    expect(gains[0].gain.linearRampToValueAtTime.mock.calls).toEqual([
      [0.026, 0.007],
      [0, 0.082],
    ]);
    expect(tones[2].start).toHaveBeenCalledExactlyOnceWith(0.2);
  });
});
