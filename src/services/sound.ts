class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
  }

  public playTone(freq: number, type: OscillatorType = 'sine', duration: number = 0.1, gainVal: number = 0.15) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio autoplay policy or not supported
    }
  }

  public playMove(player: 'X' | 'O') {
    if (player === 'X') {
      this.playTone(520, 'sine', 0.12, 0.2);
    } else {
      this.playTone(380, 'sine', 0.12, 0.2);
    }
  }

  public playClick() {
    this.playTone(600, 'triangle', 0.05, 0.08);
  }

  public playJoin() {
    this.playTone(440, 'sine', 0.1, 0.15);
    setTimeout(() => this.playTone(660, 'sine', 0.15, 0.18), 100);
  }

  public playWin() {
    if (!this.enabled) return;
    [440, 554, 659, 880].forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.25, 0.2), idx * 100);
    });
  }

  public playDraw() {
    if (!this.enabled) return;
    [350, 310, 270].forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sawtooth', 0.18, 0.12), idx * 90);
    });
  }
}

export const sound = new SoundEngine();
