// Motor rítmico — AGNÓSTICO DE INTERFAZ (sección 6 del doc).
// Sabe representar un patrón, resolver la sincronización entre instrumentos
// con distinta subdivisión, y reproducirlo. No sabe nada de cómo se ve.
//
// Decisión clave (sección 10): un Pattern NO asume una subdivisión global.
// Cada track declara su propio `stepsPerBar`. El scheduler agenda los pasos de
// cada track de forma independiente contra la MISMA duración de compás, así que
// polirritmias como 3-contra-2 salen naturales sin resolver ningún mcm para el
// audio (el mcm sólo importaría para alinearlos VISUALMENTE en una grilla).
//
// Timing: patrón de lookahead scheduling (Chris Wilson). Un timer grueso
// (setTimeout) sólo programa eventos ~120ms adelante usando ctx.currentTime.
// El hilo de JS nunca decide CUÁNDO suena una nota: sólo la agenda antes.

import { INSTRUMENTS } from './instruments.js'
import { VOICES } from './voices.js'

const LOOKAHEAD_MS = 25 // cada cuánto despierta el timer
const SCHEDULE_AHEAD = 0.12 // s: ventana que programamos por adelantado

export class Engine {
  constructor() {
    this.ctx = null
    this.master = null
    this.pattern = null // proxy reactivo de Vue; lo leemos vivo en cada tick
    this.isPlaying = false
    this._timer = null
    this.startTime = 0 // ctx.currentTime del primer downbeat (post count-in)
    this._cursors = [] // { absStep, nextTime, spb } por track
    this._metroCursor = null
  }

  async _ensureCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.9
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume()
  }

  // Duración de un compás en segundos, respetando numerador y denominador.
  get barDuration() {
    const p = this.pattern
    return p.beatsPerBar * (60 / p.bpm) * (4 / p.beatUnit)
  }

  get beatDuration() {
    const p = this.pattern
    return (60 / p.bpm) * (4 / p.beatUnit)
  }

  async play(pattern, { skipCountIn = false } = {}) {
    await this._ensureCtx()
    this.pattern = pattern
    const now = this.ctx.currentTime + 0.06
    let countIn = 0
    if (pattern.countIn && !skipCountIn) {
      countIn = this.barDuration
      for (let b = 0; b < pattern.beatsPerBar; b++) {
        VOICES.click(this.ctx, this.master, now + b * this.beatDuration, {
          accent: b === 0,
        })
      }
    }
    this.startTime = now + countIn
    this._cursors = pattern.tracks.map((t) => ({
      absStep: 0,
      nextTime: this.startTime,
      spb: t.stepsPerBar,
    }))
    this._metroCursor = { absStep: 0, nextTime: this.startTime }
    this.isPlaying = true
    this._loop()
  }

  stop() {
    this.isPlaying = false
    clearTimeout(this._timer)
  }

  // Reprograma en caliente (p. ej. cambio de tempo) alineando al próximo downbeat.
  reschedule() {
    if (!this.isPlaying) return
    this.play(this.pattern, { skipCountIn: true })
  }

  _loop() {
    if (!this.isPlaying) return
    const now = this.ctx.currentTime
    const p = this.pattern
    const bar = this.barDuration

    // Mantener los cursores sincronizados con la lista de tracks (alta/baja en vivo).
    while (this._cursors.length < p.tracks.length) {
      const idx = this._cursors.length
      const spb = p.tracks[idx].stepsPerBar
      this._cursors.push(this._freshCursor(spb, now, bar))
    }
    if (this._cursors.length > p.tracks.length) {
      this._cursors.length = p.tracks.length
    }

    const anySolo = p.tracks.some((t) => t.solo)

    p.tracks.forEach((track, ti) => {
      const cur = this._cursors[ti]
      const spb = track.stepsPerBar
      // Si cambió la subdivisión del track en vivo, resincronizar al compás.
      if (cur.spb !== spb) {
        const fresh = this._freshCursor(spb, now, bar)
        cur.absStep = fresh.absStep
        cur.nextTime = fresh.nextTime
        cur.spb = spb
      }
      const audible = !track.mute && (!anySolo || track.solo)
      const hum = p.humanize || 0
      while (cur.nextTime < now + SCHEDULE_AHEAD) {
        const local = cur.absStep % spb
        const cell = track.steps[local]
        if (cell && audible) {
          const inst = INSTRUMENTS[track.instrument]
          const stroke = inst && inst.strokes.find((s) => s.id === cell.s)
          if (stroke) {
            const fn = VOICES[stroke.voice.type]
            if (fn) {
              // Swing (grid) + humanize (jitter) desplazan el tiempo real,
              // sin tocar cur.nextTime (que ordena el scheduler).
              const tJit = (Math.random() * 2 - 1) * hum * 0.012
              let t = cur.nextTime + this._swing(track, local) + tJit
              if (t < now) t = now + 0.001
              const gJit = 1 + (Math.random() * 2 - 1) * hum * 0.15
              const vel = Math.min(1.4, track.volume * cell.v * gJit)
              fn(this.ctx, this.master, t, { ...stroke.voice, vel })
            }
          }
        }
        cur.absStep++
        cur.nextTime = this.startTime + (cur.absStep / spb) * bar
      }
    })

    // Metrónomo opcional: un click por pulso, acento en el 1.
    if (p.metronome) {
      const m = this._metroCursor
      const beat = this.beatDuration
      while (m.nextTime < now + SCHEDULE_AHEAD) {
        const localBeat = m.absStep % p.beatsPerBar
        VOICES.click(this.ctx, this.master, m.nextTime, { accent: localBeat === 0, vel: 0.7 })
        m.absStep++
        m.nextTime = this.startTime + m.absStep * beat
      }
    }

    this._timer = setTimeout(() => this._loop(), LOOKAHEAD_MS)
  }

  // Swing: atrasa las sub-celdas impares de cada pulso (el offbeat), lo que da
  // el shuffle. Sólo aplica si hay >=2 celdas por tiempo y la subdivisión es
  // múltiplo del compás (los tracks polirrítmicos no se swingean).
  _swing(track, local) {
    const p = this.pattern
    const spb = track.stepsPerBar
    if (!p.swing || spb % p.beatsPerBar !== 0) return 0
    const cellsPerBeat = spb / p.beatsPerBar
    if (cellsPerBeat < 2 || local % 2 !== 1) return 0
    return p.swing * (this.barDuration / spb)
  }

  // Cursor que "entra" en el próximo paso >= ahora (para altas de track en vivo).
  _freshCursor(spb, now, bar) {
    const elapsed = now - this.startTime
    const absStep = elapsed <= 0 ? 0 : Math.ceil((elapsed / bar) * spb)
    return { absStep, nextTime: this.startTime + (absStep / spb) * bar, spb }
  }

  // Fase actual del compás en [0,1). Para dibujar el playhead sin acoplar audio.
  // -1: parado. -2: dentro del count-in.
  phase() {
    if (!this.isPlaying || !this.ctx) return -1
    const elapsed = this.ctx.currentTime - this.startTime
    if (elapsed < 0) return -2
    return (elapsed / this.barDuration) % 1
  }

  // Dispara un golpe suelto (para audicionar al marcar en la grilla).
  preview(instrumentId, strokeId, vel = 1) {
    if (!this.ctx) return
    const inst = INSTRUMENTS[instrumentId]
    const stroke = inst && inst.strokes.find((s) => s.id === strokeId)
    if (!stroke) return
    const fn = VOICES[stroke.voice.type]
    if (fn) fn(this.ctx, this.master, this.ctx.currentTime + 0.01, { ...stroke.voice, vel })
  }

  async unlock() {
    await this._ensureCtx()
  }
}

export const engine = new Engine()
