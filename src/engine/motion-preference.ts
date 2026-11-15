const normalPulseTicks = 15;
const reducedPulseTicks = 60;

export function motionFrame(tick: number, reducedMotion: boolean) {
  const pulseTicks = reducedMotion ? reducedPulseTicks : normalPulseTicks;
  return {
    backgroundTick: reducedMotion ? 0 : tick,
    sparkles: !reducedMotion,
    parallax: !reducedMotion,
    pulse: Math.floor(tick / pulseTicks) % 2 === 0,
  };
}
