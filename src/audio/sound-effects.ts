export type SoundEffectContext = Pick<
  AudioContext,
  'currentTime' | 'state' | 'destination' | 'createOscillator' | 'createGain'
>;

const sounds = {
  select: {
    type: 'sine',
    from: 580,
    to: 455,
    volume: 0.018,
    attack: 0.004,
    duration: 0.052,
    interval: 0.055,
  },
  footstep: {
    type: 'triangle',
    from: 132,
    to: 58,
    volume: 0.026,
    attack: 0.007,
    duration: 0.082,
    interval: 0.2,
  },
} as const;

export function createSoundEffects(context: SoundEffectContext) {
  const nextAt = { select: 0, footstep: 0 };

  function play(kind: keyof typeof sounds): void {
    const start = context.currentTime;
    if (context.state !== 'running' || start < nextAt[kind]) return;

    const sound = sounds[kind];
    const end = start + sound.duration;
    nextAt[kind] = start + sound.interval;
    const tone = context.createOscillator();
    const gain = context.createGain();
    tone.type = sound.type;
    tone.frequency.setValueAtTime(sound.from, start);
    tone.frequency.exponentialRampToValueAtTime(sound.to, end);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(sound.volume, start + sound.attack);
    gain.gain.linearRampToValueAtTime(0, end);
    tone.connect(gain);
    gain.connect(context.destination);
    tone.onended = () => {
      tone.disconnect();
      gain.disconnect();
    };
    tone.start(start);
    tone.stop(end);
  }

  return {
    select: () => play('select'),
    footstep: () => play('footstep'),
  };
}
