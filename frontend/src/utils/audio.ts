/**
 * Web Audio API Sound Synthesizer & Haptic Feedback Utility
 * 
 * Synthesizes pure oscillator sound cues client-side without external MP3 dependencies,
 * ensuring reliable performance in low-bandwidth and offline environments.
 */

let audioMuted = false

export function setAudioMuted(muted: boolean): void {
  audioMuted = muted
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('pathersaathi_driver_audio_muted', muted ? 'true' : 'false')
    } catch {
      // ignore storage errors
    }
  }
}

export function isAudioMuted(): boolean {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('pathersaathi_driver_audio_muted')
      if (stored !== null) {
        audioMuted = stored === 'true'
      }
    } catch {
      // ignore storage errors
    }
  }
  return audioMuted
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null
    return new AudioCtx()
  } catch (err) {
    console.warn('Web Audio API not supported or blocked:', err)
    return null
  }
}

/**
 * Ascending two-tone chime for trip launch (440Hz -> 880Hz) + 100ms vibration
 */
export function playTripStartCue(): void {
  if (isAudioMuted()) return

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(100)
    } catch {
      // ignore vibration errors
    }
  }

  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.connect(gain)
    gain.connect(ctx.destination)

    const now = ctx.currentTime
    osc.frequency.setValueAtTime(440, now)
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.18)

    gain.gain.setValueAtTime(0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35)

    osc.start(now)
    osc.stop(now + 0.35)
  } catch (err) {
    console.warn('Failed to play trip start cue:', err)
  }
}

/**
 * Three-tone harmonic celebration chime (523Hz -> 659Hz -> 784Hz / C5-E5-G5) + 250ms vibration
 */
export function playTripEndCue(): void {
  if (isAudioMuted()) return

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(250)
    } catch {
      // ignore
    }
  }

  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const tones = [523.25, 659.25, 783.99]
    tones.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.connect(gain)
      gain.connect(ctx.destination)

      const start = ctx.currentTime + idx * 0.12
      const stop = start + 0.25

      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0.25, start)
      gain.gain.exponentialRampToValueAtTime(0.01, stop)

      osc.start(start)
      osc.stop(stop)
    })
  } catch (err) {
    console.warn('Failed to play trip end cue:', err)
  }
}

/**
 * Low-frequency pulsing alert for GPS loss / disconnect (220Hz pulses) + double vibration
 */
export function playGpsDisconnectCue(): void {
  if (isAudioMuted()) return

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([100, 50, 100])
    } catch {
      // ignore
    }
  }

  const ctx = getAudioContext()
  if (!ctx) return

  try {
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sawtooth'
      osc.connect(gain)
      gain.connect(ctx.destination)

      const start = ctx.currentTime + i * 0.2
      const stop = start + 0.12

      osc.frequency.setValueAtTime(220, start)
      gain.gain.setValueAtTime(0.2, start)
      gain.gain.exponentialRampToValueAtTime(0.01, stop)

      osc.start(start)
      osc.stop(stop)
    }
  } catch (err) {
    console.warn('Failed to play GPS disconnect cue:', err)
  }
}

/**
 * Soft ascending confirmation chime when signal reconnects (440Hz -> 660Hz) + 80ms vibration
 */
export function playGpsReconnectCue(): void {
  if (isAudioMuted()) return

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(80)
    } catch {
      // ignore
    }
  }

  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.connect(gain)
    gain.connect(ctx.destination)

    const now = ctx.currentTime
    osc.frequency.setValueAtTime(440, now)
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.15)

    gain.gain.setValueAtTime(0.25, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25)

    osc.start(now)
    osc.stop(now + 0.25)
  } catch (err) {
    console.warn('Failed to play GPS reconnect cue:', err)
  }
}
