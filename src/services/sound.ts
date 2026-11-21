class SoundEngine {
  private ctx: AudioContext | null = null;
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

  private init(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    return this.ctx;
  }

  public unlock() {
    if (this.unlocked && this.ctx && this.ctx.state === 'running') return;
    const ctx = this.init();
    if (!ctx) return;
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

  private scheduleTone(
    ctx: AudioContext,
    freq: number,
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
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
    } catch {
      // Audio autoplay policy or not supported
    }
  }

  public playTone(
    freq: number,
    type: OscillatorType = 'sine',
    duration: number = 0.1,
    gainVal: number = 0.15,
    delaySec: number = 0
  ) {
    if (!this.enabled) return;
    const ctx = this.init();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx
        .resume()
        .then(() => {
          this.scheduleTone(ctx, freq, type, duration, gainVal, delaySec);
        })
        .catch(() => {});
      return;
    }

    this.scheduleTone(ctx, freq, type, duration, gainVal, delaySec);
  }

  public playMove(player: 'X' | 'O') {
    if (player === 'X') {
      this.playTone(540, 'sine', 0.12, 0.2);
    } else {
      this.playTone(390, 'sine', 0.12, 0.2);
    }
  }

  public playClick() {
    this.playTone(620, 'triangle', 0.05, 0.09);
  }

  /** Distinct futuristic radar-start chime when clicking Quick Matchmaking */
  public playMatchmakingStart() {
    if (!this.enabled) return;
    this.playTone(523.25, 'sine', 0.13, 0.2, 0);
    this.playTone(659.25, 'sine', 0.13, 0.22, 0.09);
    this.playTone(783.99, 'triangle', 0.22, 0.24, 0.18);
  }

  /** Distinct alert when a challenge is sent */
  public playChallengeSent() {
    if (!this.enabled) return;
    this.playTone(587.33, 'triangle', 0.11, 0.18, 0);
    this.playTone(880, 'sine', 0.18, 0.2, 0.1);
  }

  /** Distinct alert when an incoming challenge arrives */
  public playChallengeReceived() {
    if (!this.enabled) return;
    this.playTone(783.99, 'sine', 0.12, 0.22, 0);
    this.playTone(1046.5, 'triangle', 0.16, 0.22, 0.12);
    this.playTone(783.99, 'sine', 0.12, 0.18, 0.24);
  }

  /** Rewarding match-joined chord */
  public playJoin() {
    if (!this.enabled) return;
    this.playTone(523.25, 'sine', 0.12, 0.2, 0);
    this.playTone(659.25, 'sine', 0.14, 0.2, 0.08);
    this.playTone(783.99, 'sine', 0.16, 0.22, 0.16);
    this.playTone(1046.5, 'triangle', 0.26, 0.24, 0.24);
  }

  public playWin() {
    if (!this.enabled) return;
    [440, 554.37, 659.25, 880].forEach((freq, idx) => {
      this.playTone(freq, 'triangle', 0.25, 0.2, idx * 0.1);
    });
  }

  public playDraw() {
    if (!this.enabled) return;
    [350, 310, 270].forEach((freq, idx) => {
      this.playTone(freq, 'sawtooth', 0.18, 0.12, idx * 0.09);
    });
  }
}

export const sound = new SoundEngine();
