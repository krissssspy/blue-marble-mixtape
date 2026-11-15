import { describe, expect, it } from 'vitest';
import { midiToHz } from '../../src/audio/pitch.js';

describe('midiToHz', () => {
  it('maps A4 (note 69) to exactly 440 Hz', () => {
    expect(midiToHz(69)).toBe(440);
  });

  it('doubles per octave up and halves per octave down', () => {
    expect(midiToHz(81)).toBeCloseTo(880, 9);
    expect(midiToHz(57)).toBeCloseTo(220, 9);
  });

  it('maps middle C (note 60) to about 261.626 Hz', () => {
    expect(midiToHz(60)).toBeCloseTo(261.626, 3);
  });

  it('places a fractional note strictly between its neighbouring semitones', () => {
    const bent = midiToHz(69.5);
    expect(bent).toBeGreaterThan(midiToHz(69));
    expect(bent).toBeLessThan(midiToHz(70));
  });
});
