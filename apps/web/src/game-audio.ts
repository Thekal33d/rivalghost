import type { CombatEvent } from '@rivalghost/sim';

const SOUND_KEY = 'rivalghost.sound.v1';
export function soundPreference() {
  try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; }
}

/** One gesture-unlocked mixer per tab. Audio never affects simulation or replay data. */
class GameAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private musicGain?: GainNode;
  private noise?: AudioBuffer;
  private music = new Map<string, AudioBuffer>();
  private loading = new Set<string>();
  private scene: 'menu' | 'flight' = 'menu';
  private backgrounded = false;
  private source?: AudioBufferSourceNode;
  private voices = new Set<AudioScheduledSourceNode>();
  private enabled = soundPreference();
  private playing = false;
  private offset = 0;
  private started = 0;
  private last = new Map<string, number>();

  /** Called synchronously from a click/touch/key event, including the Fly gesture. */
  unlock = () => {
    if (!this.enabled) return;
    try {
      if (!this.context) {
        const Ctx = window.AudioContext ?? (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
        const c = this.context = new Ctx();
        this.master = c.createGain(); this.master.gain.value = .7;
        const limiter = c.createDynamicsCompressor();
        limiter.threshold.value = -14; limiter.knee.value = 12; limiter.ratio.value = 6;
        limiter.attack.value = .003; limiter.release.value = .18;
        this.master.connect(limiter); limiter.connect(c.destination);
        this.musicGain = c.createGain(); this.musicGain.gain.value = this.scene === 'menu' ? .3 : .42;
        this.musicGain.connect(this.master);
        this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
        const samples = this.noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      }
      void this.context.resume().then(() => this.startMusic()).catch(() => {});
      this.loadMusic();
    } catch { /* Audio is optional; unsupported devices can still fly. */ }
  };

  private loadMusic() {
    if (!this.context) return;
    const scene = this.scene;
    if (this.music.has(scene) || this.loading.has(scene)) return;
    this.loading.add(scene);
    void fetch(`/audio/${scene}-music.mp3`).then(r => {
      if (!r.ok) throw new Error('Music unavailable');
      return r.arrayBuffer();
    }).then(b => this.context!.decodeAudioData(b)).then(buffer => {
      this.music.set(scene, buffer); this.startMusic();
    }).catch(() => { /* Buttons and combat still work without music. */ }).finally(() => this.loading.delete(scene));
  }

  setScene(scene: 'menu' | 'flight') {
    if (scene !== this.scene) {
      this.setPlaying(false); this.offset = 0; this.scene = scene;
    }
    if (this.musicGain && this.context) this.musicGain.gain.setTargetAtTime(scene === 'menu' ? .3 : .42, this.context.currentTime, .12);
    this.loadMusic();
    if (scene === 'menu') this.setPlaying(!this.backgrounded);
  }
  setBackgrounded(hidden: boolean) {
    this.backgrounded = hidden;
    if (hidden) this.setPlaying(false);
    else if (this.scene === 'menu') this.setPlaying(true);
  }
  ui(kind: 'tap' | 'select' | 'navigate' | 'back' | 'locked') {
    if (!this.ready('ui', .045, false)) return;
    if (kind === 'select') { this.tone(640, 880, .09, .09, 'triangle'); this.tone(1100, 1100, .08, .04, 'sine', .045); }
    else if (kind === 'navigate') { this.tone(440, 660, .1, .09, 'triangle'); }
    else if (kind === 'back') this.tone(600, 320, .085, .075, 'triangle');
    else if (kind === 'locked') { this.tone(180, 150, .09, .08, 'triangle'); this.tone(180, 150, .09, .06, 'triangle', .1); }
    else this.tone(820, 540, .045, .065, 'triangle');
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    try { localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off'); } catch { /* Session-only preference. */ }
    if (enabled) this.unlock();
    if (this.master && this.context) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(enabled ? .7 : 0, this.context.currentTime, .015);
    }
  }

  begin() { this.end(); this.offset = 0; this.last.clear(); }
  end() { this.setPlaying(false); this.clearEffects(); this.offset = 0; }
  setPlaying(playing: boolean) {
    if (this.backgrounded) playing = false;
    if (playing === this.playing) return;
    this.playing = playing;
    if (playing) this.startMusic();
    else {
      if (this.source && this.context) {
        this.offset += this.context.currentTime - this.started;
        this.source.stop(); this.source.disconnect(); this.source = undefined;
      }
      this.clearEffects();
    }
  }
  private startMusic() {
    const buffer = this.music.get(this.scene);
    if (!this.playing || this.source || !buffer || this.context?.state !== 'running') return;
    const s = this.context.createBufferSource(); s.buffer = buffer; s.loop = true;
    s.connect(this.musicGain!); this.started = this.context.currentTime;
    s.start(0, this.offset % buffer.duration); this.source = s;
  }
  private clearEffects() {
    for (const voice of this.voices) { try { voice.stop(); } catch { /* Already ended. */ } }
    this.voices.clear();
  }
  private ready(key: string, gap: number, requirePlaying = true) {
    const c = this.context;
    if (!this.enabled || this.backgrounded || (requirePlaying && !this.playing) || c?.state !== 'running') return false;
    if (c.currentTime - (this.last.get(key) ?? -10) < gap || this.voices.size > 28) return false;
    this.last.set(key, c.currentTime); return true;
  }
  private tone(from: number, to: number, duration: number, volume: number, type: OscillatorType = 'sine', delay = 0) {
    const c = this.context!, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + duration);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(volume, t + .006);
    g.gain.exponentialRampToValueAtTime(.0001, t + duration);
    o.connect(g); g.connect(this.master!); this.voices.add(o);
    o.onended = () => { this.voices.delete(o); o.disconnect(); g.disconnect(); };
    o.start(t); o.stop(t + duration + .015);
  }
  private burst(duration: number, volume: number, frequency: number) {
    const c = this.context!, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
    s.buffer = this.noise!; f.type = 'lowpass'; f.frequency.setValueAtTime(frequency, t);
    f.frequency.exponentialRampToValueAtTime(100, t + duration);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(volume, t + .005);
    g.gain.exponentialRampToValueAtTime(.0001, t + duration);
    s.connect(f); f.connect(g); g.connect(this.master!); this.voices.add(s);
    s.onended = () => { this.voices.delete(s); s.disconnect(); f.disconnect(); g.disconnect(); };
    s.start(t); s.stop(t + duration + .015);
  }
  shot(rig: string) {
    if (!this.ready('shot', .09)) return;
    this.tone(rig === 'needle' ? 1250 : 790, 230, .07, .055, 'triangle');
  }
  cue(kind: 'launch' | 'win' | 'lose' | 'phase') {
    if (!this.ready(kind, .3)) return;
    if (kind === 'lose') { this.tone(190, 44, .6, .18, 'triangle'); this.burst(.5, .22, 900); }
    else if (kind === 'phase') { this.tone(110, 65, .55, .18, 'sawtooth'); this.tone(220, 130, .55, .07); }
    else {
      const notes = kind === 'win' ? [523, 659, 784, 1047] : [261, 392, 523];
      notes.forEach((f, i) => this.tone(f, f, .22, .12, 'triangle', i * .11));
    }
  }
  event(e: CombatEvent) {
    const gap = e.type === 'damage' ? .1 : e.type === 'graze' ? .15 : .055;
    if (!this.ready(e.type, gap)) return;
    switch (e.type) {
      case 'kill': this.burst(.17, .18, 1800); this.tone(105, 42, .18, .12); break;
      case 'hit': this.burst(.28, .24, 1100); this.tone(130, 38, .3, .2, 'triangle'); break;
      case 'damage': this.tone(330, 180, .035, .045, 'triangle'); break;
      case 'graze': this.tone(1100, 1500, .065, .055); break;
      case 'shield': this.tone(620, 160, .22, .1, 'triangle'); break;
      case 'rescue': case 'upgrade':
        [659, 784, 1047].forEach((f, i) => this.tone(f, f, .16, .1, 'sine', i * .065)); break;
      case 'surge': this.tone(110, 880, .4, .16, 'triangle'); this.burst(.24, .12, 3500); break;
      case 'pulse': this.tone(240, 35, .48, .28); this.burst(.4, .2, 3000); break;
      case 'boss': this.cue('phase'); break;
    }
  }
}

export const gameAudio = new GameAudio();
