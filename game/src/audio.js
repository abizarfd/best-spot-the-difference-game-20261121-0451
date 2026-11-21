// audio.js — every sound in Lantern Light is synthesised with WebAudio.
// No audio files, no network: small oscillators and envelopes only.
// The AudioContext is created lazily on the first user gesture, so the
// page never complains about autoplay, and M mutes everything.

export class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  ensure() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  resume() {
    if (this.ensure() && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }

  tone(freq, dur, type = 'sine', vol = 0.5, when = 0, slideTo = null) {
    if (this.muted || !this.ensure()) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  click() { this.tone(660, 0.07, 'triangle', 0.25); }

  start() {
    this.tone(392, 0.12, 'triangle', 0.35);
    this.tone(523, 0.12, 'triangle', 0.35, 0.09);
    this.tone(659, 0.18, 'triangle', 0.4, 0.18);
  }

  found(combo) {
    // A rising chime; the top note climbs with the combo.
    const base = 523;
    this.tone(base, 0.14, 'sine', 0.5);
    this.tone(base * 1.25, 0.14, 'sine', 0.45, 0.08);
    this.tone(base * 1.5 + Math.min(combo, 8) * 12, 0.22, 'sine', 0.5, 0.16);
  }

  wrong() {
    this.tone(160, 0.22, 'sawtooth', 0.3, 0, 110);
    this.tone(90, 0.25, 'square', 0.18, 0.02, 70);
  }

  hint() {
    for (let i = 0; i < 4; i++) this.tone(880 + i * 220, 0.1, 'sine', 0.3, i * 0.06);
  }

  tick() { this.tone(980, 0.05, 'square', 0.15); }

  win() {
    const notes = [523, 659, 784, 1047, 784, 1047];
    notes.forEach((n, i) => this.tone(n, 0.22, 'triangle', 0.45, i * 0.11));
    this.tone(1319, 0.5, 'sine', 0.4, 0.7);
  }

  lose() {
    const notes = [392, 330, 262, 196];
    notes.forEach((n, i) => this.tone(n, 0.3, 'triangle', 0.35, i * 0.16));
  }
}
