class RetroAudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private musicInterval: number | null = null;
  private currentSource: AudioScheduledSourceNode[] = [];
  private isMusicPlaying: boolean = false;

  constructor() {
    // Lazy initialize context on user interaction
  }

  private init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopMusic();
    } else {
      this.init();
    }
  }

  getMute(): boolean {
    return this.isMuted;
  }

  // Create distorted white noise for explosions
  private createNoiseBuffer(): AudioBuffer {
    this.init();
    if (!this.ctx) throw new Error('No audio context');
    const bufferSize = this.ctx.sampleRate * 1.5; // 1.5 seconds of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  playShoot(type: 'NORMAL' | 'SPREAD' | 'HEAVY' = 'NORMAL') {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const now = this.ctx.currentTime;

    if (type === 'HEAVY') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.18);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'SPREAD') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else {
      // Normal shoot
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  }

  playEnemyShoot() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  playExplosion(type: 'SMALL' | 'LARGE' | 'BOSS' = 'SMALL') {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer();

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';

      const gain = this.ctx.createGain();

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      if (type === 'SMALL') {
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(40, now + 0.2);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        noise.start(now);
        noise.stop(now + 0.25);
      } else if (type === 'LARGE') {
        filter.frequency.setValueAtTime(250, now);
        filter.frequency.exponentialRampToValueAtTime(20, now + 0.5);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        noise.start(now);
        noise.stop(now + 0.6);

        // Add a low bass rumble oscillator for power
        const rumble = this.ctx.createOscillator();
        const rumbleGain = this.ctx.createGain();
        rumble.type = 'sawtooth';
        rumble.frequency.setValueAtTime(80, now);
        rumble.frequency.exponentialRampToValueAtTime(10, now + 0.5);
        rumbleGain.gain.setValueAtTime(0.25, now);
        rumbleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        rumble.connect(rumbleGain);
        rumbleGain.connect(this.ctx.destination);
        rumble.start(now);
        rumble.stop(now + 0.5);
      } else {
        // BOSS EXPLOSION - multiple rumble bursts
        filter.frequency.setValueAtTime(300, now);
        filter.frequency.exponentialRampToValueAtTime(15, now + 1.2);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.3);
        noise.start(now);
        noise.stop(now + 1.3);

        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.linearRampToValueAtTime(10, now + 1.2);
        oscGain.gain.setValueAtTime(0.4, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 1.3);
      }
    } catch (e) {
      console.warn('Explosion sound failed', e);
    }
  }

  playPowerup() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C major arpeggio
    const noteDuration = 0.05;

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * noteDuration);

      gain.gain.setValueAtTime(0.08, now + idx * noteDuration);
      gain.gain.exponentialRampToValueAtTime(0.005, now + idx * noteDuration + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * noteDuration);
      osc.stop(now + idx * noteDuration + 0.15);
    });
  }

  playBomb() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Bass sweep drop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 1.5);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 1.5);

    // Screen shake white noise blast
    try {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 1.2);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + 1.2);
    } catch (e) {}
  }

  playHit() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.15);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playBossWarning() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = 1.8;

    // Siren sweeps
    for (let i = 0; i < 3; i++) {
      const offset = i * 0.6;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now + offset);
      osc.frequency.linearRampToValueAtTime(300, now + offset + 0.3);
      osc.frequency.linearRampToValueAtTime(150, now + offset + 0.6);

      gain.gain.setValueAtTime(0.12, now + offset);
      gain.gain.linearRampToValueAtTime(0.12, now + offset + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.6);
    }
  }

  playGameOver() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [196.00, 185.00, 174.61, 146.83]; // G3, F#3, F3, D3 sad chord
    const noteDuration = 0.25;

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * noteDuration);

      gain.gain.setValueAtTime(0.15, now + idx * noteDuration);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * noteDuration + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * noteDuration);
      osc.stop(now + idx * noteDuration + 0.35);
    });
  }

  startMusic() {
    if (this.isMuted || this.isMusicPlaying) return;
    this.init();
    if (!this.ctx) return;

    this.isMusicPlaying = true;
    let step = 0;

    // Retro bassline & melody pattern (8-bit style)
    // A minor / C major feel
    const bassline = [110.00, 110.00, 130.81, 130.81, 146.83, 146.83, 164.81, 164.81]; // A2, C3, D3, E3
    const melody = [
      440.00, 0, 493.88, 523.25, 0, 587.33, 659.25, 0,
      587.33, 523.25, 493.88, 440.00, 392.00, 440.00, 0, 0
    ];

    const tick = () => {
      if (this.isMuted || !this.isMusicPlaying || !this.ctx) return;

      const now = this.ctx.currentTime;
      const tempo = 0.15; // Speed of ticks

      // Bass note every 2 ticks
      if (step % 2 === 0) {
        const bassFreq = bassline[Math.floor(step / 2) % bassline.length];
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();

        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(bassFreq, now);
        bassGain.gain.setValueAtTime(0.04, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + tempo * 1.8);

        bassOsc.connect(bassGain);
        bassGain.connect(this.ctx.destination);

        bassOsc.start(now);
        bassOsc.stop(now + tempo * 1.8);
      }

      // Melody note every tick
      const melFreq = melody[step % melody.length];
      if (melFreq > 0) {
        const melOsc = this.ctx.createOscillator();
        const melGain = this.ctx.createGain();

        melOsc.type = 'square';
        melOsc.frequency.setValueAtTime(melFreq, now);
        melGain.gain.setValueAtTime(0.02, now);
        melGain.gain.exponentialRampToValueAtTime(0.001, now + tempo * 0.95);

        melOsc.connect(melGain);
        melGain.connect(this.ctx.destination);

        melOsc.start(now);
        melOsc.stop(now + tempo * 0.95);
      }

      // Basic synth Hi-hat white noise accent on beat 4
      if (step % 4 === 2) {
        try {
          const hatOsc = this.ctx.createOscillator();
          const hatGain = this.ctx.createGain();
          hatOsc.type = 'sawtooth';
          hatOsc.frequency.setValueAtTime(10000, now);
          hatGain.gain.setValueAtTime(0.005, now);
          hatGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

          hatOsc.connect(hatGain);
          hatGain.connect(this.ctx.destination);
          hatOsc.start(now);
          hatOsc.stop(now + 0.05);
        } catch (e) {}
      }

      step++;
      this.musicInterval = window.setTimeout(tick, tempo * 1000);
    };

    tick();
  }

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicInterval) {
      clearTimeout(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const audioManager = new RetroAudioManager();
