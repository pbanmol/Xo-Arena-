class HapticsEngine {
  public enabled: boolean = true;

  trigger(pattern: number | number[] = 25) {
    if (!this.enabled || typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Vibrate API not permitted or not supported
    }
  }
}

export const haptics = new HapticsEngine();
