// Sound, synthesised with WebAudio: no audio files, nothing to load.
// Footsteps tick as you walk, a guard's alert is a two-note sting, a relic
// chimes, and the vault door sings when you slip out unseen.
export function createAudio() {
  let context = null;
  let enabled = true;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') void context.resume();
      return context;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  /** Call from a user gesture: browsers only let sound start after one. */
  function unlock() {
    ensure();
  }

  function tone(frequency, duration, type, volume, when = 0, slideTo = null) {
    const audio = ensure();
    if (!audio || !enabled) return;
    const start = audio.currentTime + when;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slideTo !== null) oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function footstep(sneaking) {
    tone(sneaking ? 150 : 110, 0.07, 'triangle', sneaking ? 0.03 : 0.06);
  }

  function pebble() {
    tone(1400, 0.06, 'square', 0.04, 0, 700);
  }

  function pebbleLand() {
    tone(520, 0.09, 'sine', 0.08, 0, 260);
    tone(780, 0.08, 'sine', 0.05, 0.09);
  }

  function relic() {
    tone(660, 0.12, 'sine', 0.09);
    tone(880, 0.14, 'sine', 0.09, 0.09);
    tone(1320, 0.2, 'sine', 0.07, 0.18);
  }

  function alert() {
    tone(392, 0.12, 'sawtooth', 0.07);
    tone(311, 0.18, 'sawtooth', 0.07, 0.12);
  }

  function caught() {
    tone(220, 0.25, 'sawtooth', 0.1, 0, 110);
    tone(110, 0.4, 'triangle', 0.1, 0.15, 55);
  }

  function win() {
    [523, 659, 784, 1047].forEach((frequency, index) => {
      tone(frequency, 0.22, 'sine', 0.08, index * 0.11);
    });
  }

  function toggle() {
    enabled = !enabled;
    return enabled;
  }

  return { unlock, footstep, pebble, pebbleLand, relic, alert, caught, win, toggle };
}
