// ============================================================
// lib/scannerSound.ts
// Generates scanner beep sounds via Web Audio API.
// No external files needed — works offline.
// ============================================================

/** Play a success beep (double ascending tone) */
export function playSuccessSound(): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()

    const playTone = (freq: number, startTime: number, duration: number, gain = 0.3) => {
      const osc     = ctx.createOscillator()
      const gainNode = ctx.createGain()
      osc.connect(gainNode)
      gainNode.connect(ctx.destination)

      osc.type      = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)
      gainNode.gain.setValueAtTime(0,     startTime)
      gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

      osc.start(startTime)
      osc.stop(startTime + duration)
    }

    const now = ctx.currentTime
    playTone(880, now,        0.12)   // A5
    playTone(1318, now + 0.13, 0.18)  // E6  (ascending — success!)

    // Auto-close context
    setTimeout(() => ctx.close().catch(() => {}), 800)
  } catch {
    // Silently ignore if AudioContext not supported
  }
}

/** Play a warning beep (flat double tone) */
export function playWarningSound(): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()

    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc      = ctx.createOscillator()
      const gainNode = ctx.createGain()
      osc.connect(gainNode)
      gainNode.connect(ctx.destination)

      osc.type      = 'square'
      osc.frequency.setValueAtTime(freq, startTime)
      gainNode.gain.setValueAtTime(0,    startTime)
      gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

      osc.start(startTime)
      osc.stop(startTime + duration)
    }

    const now = ctx.currentTime
    playTone(440, now,        0.1)
    playTone(440, now + 0.15, 0.1)   // same note twice — warning

    setTimeout(() => ctx.close().catch(() => {}), 600)
  } catch { /* ignore */ }
}

/** Play an error buzz */
export function playErrorSound(): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc      = ctx.createOscillator()
    const gainNode = ctx.createGain()
    osc.connect(gainNode)
    gainNode.connect(ctx.destination)

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(200, ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3)
    gainNode.gain.setValueAtTime(0.2,   ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)

    setTimeout(() => ctx.close().catch(() => {}), 600)
  } catch { /* ignore */ }
}
