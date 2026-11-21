class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private unlocked: boolean = false;
  public enabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockHandler = () => {
        this.unlock();
      };
      window.addEventListener('touchstart', unlockHandler, { passive: true, once: false });
      window.addEventListener('pointerdown', unlockHandler, { passive: true, once: false });
      window.addEventListener('click', unlockHandler, { passive: true, once: false });
    }
  }

  private init(): { ctx: AudioContext; out: AudioNode } | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;

      this.ctx = new AudioContextClass();

      // Master loudness & soft limiter bus so mobile phone speakers sound loud, punchy & crisp
      const master = this.ctx.createGain();
      master.gain.setValueAtTime(1.15, this.ctx.currentTime);

      try {
        const compressor = this.ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
        compressor.knee.setValueAtTime(14, this.ctx.currentTime);
        compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
        compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        compressor.release.setValueAtTime(0.12, this.ctx.currentTime);
        master.connect(compressor);
        compressor.connect(this.ctx.destination);
      } catch {
        master.connect(this.ctx.destination);
      }

      this.masterGain = master;
    }

    return {
      ctx: this.ctx,
      out: this.masterGain || this.ctx.destination
    };
  }

  public unlock() {
    if (this.unlocked && this.ctx && this.ctx.state === 'running') return;
    const engine = this.init();
    if (!engine) return;
    const { ctx } = engine;
    try {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      // Play a 1-sample silent buffer to unlock iOS Safari / WKWebView WebAudio reliably
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      this.unlocked = true;
    } catch {
      // Ignore unlock failures on restricted contexts
    }
  }

  private withReadyContext(fn: (ctx: AudioContext, out: AudioNode) => void) {
    if (!this.enabled) return;
    const engine = this.init();
    if (!engine) return;
    const { ctx, out } = engine;

    if (ctx.state === 'suspended') {
      ctx
        .resume()
        .then(() => fn(ctx, out))
        .catch(() => {});
      return;
    }

    fn(ctx, out);
  }

  private scheduleNote(
    ctx: AudioContext,
    out: AudioNode,
    freqStart: number,
    freqEnd: number | null,
    type: OscillatorType,
    duration: number,
    gainVal: number,
    delaySec: number = 0
  ) {
    try {
      const startTime = ctx.currentTime + delaySec;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, startTime);
      if (freqEnd !== null && freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), startTime + duration * 0.85);
      }

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

      osc.connect(gain);
      gain.connect(out);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
    } catch {
      // Audio autoplay policy or not supported
    }
  }

  public playTone(
    freq: number,
    type: OscillatorType = 'triangle',
    duration: number = 0.12,
    gainVal: number = 0.55,
    delaySec: number = 0
  ) {
    this.withReadyContext((ctx, out) => {
      this.scheduleNote(ctx, out, freq, null, type, duration, gainVal, delaySec);
    });
  }

  /** Punchy, distinct arcade move sounds for X and O (clearly audible on phone speakers) */
  public playMove(player: 'X' | 'O') {
    this.withReadyContext((ctx, out) => {
      if (player === 'X') {
        // Crisp bright upward pop + harmonic chime
        this.scheduleNote(ctx, out, 360, 780, 'triangle', 0.095, 0.72, 0);
        this.scheduleNote(ctx, out, 1046.5, 1174.66, 'sine', 0.16, 0.52, 0.015);
      } else {
        // Warm punchy downward tok + resonant body
        this.scheduleNote(ctx, out, 540, 290, 'triangle', 0.11, 0.74, 0);
        this.scheduleNote(ctx, out, 659.25, 523.25, 'sine', 0.16, 0.5, 0.018);
      }
    });
  }

  /** Tactile UI button click */
  public playClick() {
    this.withReadyContext((ctx, out) => {
      this.scheduleNote(ctx, out, 960, 520, 'triangle', 0.055, 0.45, 0);
    });
  }

  /** Distinct futuristic radar-start chime when clicking Quick Matchmaking */
  public playMatchmakingStart() {
    this.withReadyContext((ctx, out) => {
      this.scheduleNote(ctx, out, 523.25, null, 'triangle', 0.14, 0.62, 0);
      this.scheduleNote(ctx, out, 659.25, null, 'triangle', 0.14, 0.66, 0.085);
      this.scheduleNote(ctx, out, 880, 987.77, 'sine', 0.24, 0.7, 0.17);
    });
  }

  /** Alert when a challenge is sent */
  public playChallengeSent() {
    this.withReadyContext((ctx, out) => {
      this.scheduleNote(ctx, out, 587.33, null, 'triangle', 0.12, 0.6, 0);
      this.scheduleNote(ctx, out, 880, null, 'sine', 0.2, 0.66, 0.095);
    });
  }

  /** Urgent ring when an incoming challenge arrives */
  public playChallengeReceived() {
    this.withReadyContext((ctx, out) => {
      this.scheduleNote(ctx, out, 783.99, null, 'triangle', 0.13, 0.68, 0);
      this.scheduleNote(ctx, out, 1046.5, null, 'triangle', 0.16, 0.72, 0.11);
      this.scheduleNote(ctx, out, 783.99, null, 'sine', 0.14, 0.62, 0.23);
      this.scheduleNote(ctx, out, 1046.5, null, 'sine', 0.22, 0.72, 0.34);
    });
  }

  /** Rewarding match-joined fanfare */
  public playJoin() {
    this.withReadyContext((ctx, out) => {
      this.scheduleNote(ctx, out, 523.25, null, 'triangle', 0.13, 0.65, 0);
      this.scheduleNote(ctx, out, 659.25, null, 'triangle', 0.14, 0.68, 0.075);
      this.scheduleNote(ctx, out, 783.99, null, 'triangle', 0.16, 0.72, 0.15);
      this.scheduleNote(ctx, out, 1046.5, null, 'triangle', 0.28, 0.78, 0.225);
      this.scheduleNote(ctx, out, 1318.5, null, 'sine', 0.3, 0.45, 0.24);
    });
  }

  /** Celebratory arcade victory fanfare */
  public playWin() {
    this.withReadyContext((ctx, out) => {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        this.scheduleNote(ctx, out, freq, null, 'triangle', 0.22, 0.7, idx * 0.085);
      });
      // Final victory chord shimmer
      this.scheduleNote(ctx, out, 1046.5, null, 'sine', 0.42, 0.62, 0.34);
      this.scheduleNote(ctx, out, 1318.5, null, 'sine', 0.42, 0.52, 0.34);
      this.scheduleNote(ctx, out, 1567.98, null, 'sine', 0.44, 0.42, 0.36);
    });
  }

  /** Expressive defeat sting when losing a match */
  public playLoss() {
    this.withReadyContext((ctx, out) => {
      this.scheduleNote(ctx, out, 440, 415.3, 'triangle', 0.16, 0.62, 0);
      this.scheduleNote(ctx, out, 392, 369.99, 'triangle', 0.17, 0.6, 0.14);
      this.scheduleNote(ctx, out, 349.23, 311.13, 'triangle', 0.2, 0.58, 0.28);
      this.scheduleNote(ctx, out, 293.66, 220, 'sawtooth', 0.32, 0.32, 0.43);
    });
  }

  /** Crisp neutral draw chime */
  public playDraw() {
    this.withReadyContext((ctx, out) => {
      this.scheduleNote(ctx, out, 440, null, 'triangle', 0.14, 0.6, 0);
      this.scheduleNote(ctx, out, 392, null, 'triangle', 0.14, 0.6, 0.12);
      this.scheduleNote(ctx, out, 392, 349.23, 'sine', 0.24, 0.55, 0.24);
    });
  }

  /** Clear alert sound when opponent disconnects / goes offline */
  public playDisconnect() {
    this.withReadyContext((ctx, out) => {
      this.scheduleNote(ctx, out, 740, 440, 'triangle', 0.16, 0.74, 0);
      this.scheduleNote(ctx, out, 622.25, 349.23, 'triangle', 0.24, 0.76, 0.18);
    });
  }
}

export const sound = new SoundEngine();
