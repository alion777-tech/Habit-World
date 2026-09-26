// 孵化演出専用。BGMとは独立した、小さなシンセサイザー。
let context: AudioContext | null = null;
let sources: AudioScheduledSourceNode[] = [];
export function stopFairySounds() {
  for (const source of sources) { try { source.stop(); } catch {} }
  sources = [];
}
export async function unlockFairySounds() {
  context ??= new AudioContext();
  await context.resume();
}
export function fairySoundReady() { return context?.state === "running"; }
function note(frequency: number, delay: number, duration: number, volume = .07, type: OscillatorType = "sine") {
  if (!context || context.state !== "running") return;
  const ctx = context, start = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator(), gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * .85, start + duration);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + .008);
  gain.gain.exponentialRampToValueAtTime(.001, start + duration);
  oscillator.connect(gain); gain.connect(ctx.destination);
  oscillator.start(start); oscillator.stop(start + duration + .01);
  sources.push(oscillator);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); sources = sources.filter(s => s !== oscillator); };
}
export function playFairyHatchSound(reducedMotion: boolean) {
  stopFairySounds();
  const revealAt = reducedMotion ? 0 : 2.3;
  if (!reducedMotion) {
    [0, .3, .6, .9, 1.15, 1.4, 1.6, 1.8, 2].forEach((delay, i) => {
      note(500 + (i % 2) * 180, delay, .09, .08, "triangle");
      note(780, delay + .1, .07, .045);
    });
    if (context?.state === "running") {
      const ctx = context, length = Math.floor(ctx.sampleRate * .16);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate), data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3) * .18;
      const crack = ctx.createBufferSource(); crack.buffer = buffer; crack.connect(ctx.destination);
      crack.start(ctx.currentTime + revealAt); sources.push(crack);
      crack.onended = () => { crack.disconnect(); sources = sources.filter(s => s !== crack); };
    }
  }
  [523, 659, 784, 1047, 1319, 1568].forEach((pitch, i) => note(pitch, revealAt + .12 + i * .14, .65, .055));
  [523, 659, 784].forEach(pitch => note(pitch, revealAt + .9, .8, .025));
}
export function playFairyNamedSound() {
  [659, 784, 1047].forEach((pitch, i) => note(pitch, i * .12, .55, .06));
}
