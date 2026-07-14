// Voces sintetizadas con Web Audio.
// Cada voz agenda su sonido en un tiempo absoluto del AudioContext (`t`).
// No dependemos de samples: esto valida el TIMING sin tener que curar audio.
//
// Cada instrumento se arma por capas, como el sonido real:
//   transitorio de ataque (el golpe del parche/mano) + cuerpo tonal + ruido.
// Eso es lo que le da "carne" frente a un simple oscilador.
// Firma: (ctx, dest, t, params) -> void

let _noise = null
function noiseBuffer(ctx) {
  if (_noise && _noise.sampleRate === ctx.sampleRate) return _noise
  const len = Math.floor(ctx.sampleRate * 0.5)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  _noise = buf
  return buf
}

// Envelope percusivo: sube rápido al pico y cae exponencial.
function hit(g, t, peak, attack, decay) {
  const p = Math.max(peak, 0.0002)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(p, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
}

// Surdo: bombo grave. Transitorio de mazo + fundamental con caída de pitch
// + armónico. Abierto = largo y con cuerpo; apagado (abafado) = corto y seco.
function surdo(ctx, dest, t, { muted = false, vel = 1 }) {
  // Ataque del mazo: click de ruido filtrado.
  const click = ctx.createBufferSource()
  click.buffer = noiseBuffer(ctx)
  const clickLP = ctx.createBiquadFilter()
  clickLP.type = 'lowpass'
  clickLP.frequency.value = muted ? 2600 : 1500
  const clickG = ctx.createGain()
  hit(clickG, t, vel * 0.3, 0.001, muted ? 0.02 : 0.03)
  click.connect(clickLP).connect(clickG).connect(dest)
  click.start(t)
  click.stop(t + 0.05)

  // Cuerpo: fundamental (sine) + armónico (triangle), ambos caen de pitch.
  const o1 = ctx.createOscillator()
  o1.type = 'sine'
  o1.frequency.setValueAtTime(muted ? 132 : 100, t)
  o1.frequency.exponentialRampToValueAtTime(muted ? 72 : 50, t + 0.1)
  const o2 = ctx.createOscillator()
  o2.type = 'triangle'
  o2.frequency.setValueAtTime(muted ? 205 : 152, t)
  o2.frequency.exponentialRampToValueAtTime(muted ? 112 : 80, t + 0.1)
  const o2g = ctx.createGain()
  o2g.gain.value = 0.22
  const body = ctx.createGain()
  const decay = muted ? 0.13 : 0.44
  hit(body, t, vel * (muted ? 0.6 : 1.0), 0.006, decay)
  o1.connect(body)
  o2.connect(o2g).connect(body)
  body.connect(dest)
  o1.start(t); o2.start(t)
  o1.stop(t + decay + 0.05); o2.stop(t + decay + 0.05)
}

// Caixa / caja: cuerpo tonal (parche) + bordonas (ruido brillante).
// Aro = más agudo, seco y corto.
function caixa(ctx, dest, t, { rim = false, vel = 1 }) {
  const b1 = ctx.createOscillator()
  b1.type = 'triangle'
  b1.frequency.value = rim ? 380 : 190
  const b2 = ctx.createOscillator()
  b2.type = 'triangle'
  b2.frequency.value = rim ? 520 : 278 // levemente inarmónico
  const bodyG = ctx.createGain()
  hit(bodyG, t, vel * (rim ? 0.28 : 0.4), 0.001, rim ? 0.04 : 0.09)

  const snares = ctx.createBufferSource()
  snares.buffer = noiseBuffer(ctx)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = rim ? 3500 : 1600
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = rim ? 4200 : 3000
  bp.Q.value = 0.6
  const nG = ctx.createGain()
  const nDur = rim ? 0.05 : 0.14
  hit(nG, t, vel * (rim ? 0.5 : 0.55), 0.001, nDur)

  b1.connect(bodyG); b2.connect(bodyG); bodyG.connect(dest)
  snares.connect(hp).connect(bp).connect(nG).connect(dest)
  b1.start(t); b2.start(t); b1.stop(t + 0.11); b2.stop(t + 0.11)
  snares.start(t); snares.stop(t + nDur + 0.02)
}

// Tamborim: membranita aguda y muy seca. Ping tonal + ruido corto.
function tamborim(ctx, dest, t, { vel = 1 }) {
  const o = ctx.createOscillator()
  o.type = 'triangle'
  o.frequency.setValueAtTime(880, t)
  o.frequency.exponentialRampToValueAtTime(620, t + 0.03)
  const og = ctx.createGain()
  hit(og, t, vel * 0.32, 0.001, 0.04)
  const n = ctx.createBufferSource()
  n.buffer = noiseBuffer(ctx)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 3000
  bp.Q.value = 1.2
  const ng = ctx.createGain()
  hit(ng, t, vel * 0.5, 0.001, 0.045)
  o.connect(og).connect(dest)
  n.connect(bp).connect(ng).connect(dest)
  o.start(t); o.stop(t + 0.06)
  n.start(t); n.stop(t + 0.06)
}

// Campana (agogô) / triángulo: timbre metálico por FM (modulación con ratio
// inarmónico) + un parcial extra. `decay` controla la cola (triángulo = larga).
function bell(ctx, dest, t, { freq = 800, decay = 0.5, vel = 1 }) {
  const carrier = ctx.createOscillator()
  carrier.type = 'sine'
  carrier.frequency.value = freq
  const mod = ctx.createOscillator()
  mod.type = 'sine'
  mod.frequency.value = freq * 1.48 // ratio inarmónico -> metálico
  const modGain = ctx.createGain()
  modGain.gain.setValueAtTime(freq * 3, t)
  modGain.gain.exponentialRampToValueAtTime(freq * 0.3, t + 0.15)
  mod.connect(modGain).connect(carrier.frequency)
  const p2 = ctx.createOscillator()
  p2.type = 'sine'
  p2.frequency.value = freq * 2.8
  const p2g = ctx.createGain()
  p2g.gain.value = 0.18
  const g = ctx.createGain()
  hit(g, t, vel * 0.5, 0.003, decay)
  carrier.connect(g)
  p2.connect(p2g).connect(g)
  g.connect(dest)
  const end = t + decay + 0.05
  carrier.start(t); mod.start(t); p2.start(t)
  carrier.stop(end); mod.stop(end); p2.stop(end)
}

// Membrana afinada: sirve para congas, bongó, djembe, bombo. Cuerpo con caída
// de pitch + armónico, y ruido opcional para el slap/ataque de mano.
function membrane(ctx, dest, t, { freq = 220, decay = 0.18, bend = 0.72, noise = 0, noiseFreq = 3200, vel = 1 }) {
  const o1 = ctx.createOscillator()
  o1.type = 'sine'
  o1.frequency.setValueAtTime(freq, t)
  o1.frequency.exponentialRampToValueAtTime(freq * bend, t + decay * 0.5)
  const o2 = ctx.createOscillator()
  o2.type = 'triangle'
  o2.frequency.setValueAtTime(freq * 1.6, t)
  o2.frequency.exponentialRampToValueAtTime(freq * 1.6 * bend, t + decay * 0.5)
  const o2g = ctx.createGain()
  o2g.gain.value = 0.28
  const g = ctx.createGain()
  hit(g, t, vel * 0.8, 0.002, decay)
  o1.connect(g); o2.connect(o2g).connect(g); g.connect(dest)
  o1.start(t); o2.start(t)
  o1.stop(t + decay + 0.05); o2.stop(t + decay + 0.05)
  if (noise > 0) {
    const n = ctx.createBufferSource()
    n.buffer = noiseBuffer(ctx)
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = noiseFreq
    bp.Q.value = 0.9
    const ng = ctx.createGain()
    hit(ng, t, vel * 0.55 * noise, 0.001, 0.05)
    n.connect(bp).connect(ng).connect(dest)
    n.start(t); n.stop(t + 0.08)
  }
}

// Cencerro / cowbell: dos ondas cuadradas por bandpass (el clásico timbre 808).
function cowbell(ctx, dest, t, { vel = 1 }) {
  const o1 = ctx.createOscillator()
  o1.type = 'square'
  o1.frequency.value = 540
  const o2 = ctx.createOscillator()
  o2.type = 'square'
  o2.frequency.value = 800
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2640
  bp.Q.value = 1
  const g = ctx.createGain()
  hit(g, t, vel * 0.42, 0.002, 0.17)
  o1.connect(bp); o2.connect(bp); bp.connect(g).connect(dest)
  o1.start(t); o2.start(t)
  o1.stop(t + 0.2); o2.stop(t + 0.2)
}

// Chocalho / shaker: ruido muy agudo con ataque suave (los perdigones).
function shaker(ctx, dest, t, { vel = 1 }) {
  const n = ctx.createBufferSource()
  n.buffer = noiseBuffer(ctx)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 5000
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 8000
  bp.Q.value = 0.7
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(vel * 0.4, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06)
  n.connect(hp).connect(bp).connect(g).connect(dest)
  n.start(t)
  n.stop(t + 0.08)
}

// Clave / woodblock: "tock" de madera. Ruido por bandpass de Q alto
// (resonancia woody) + dos parciales tonales. `freq` afina la altura.
function clave(ctx, dest, t, { freq = 2200, vel = 1 }) {
  const n = ctx.createBufferSource()
  n.buffer = noiseBuffer(ctx)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = freq
  bp.Q.value = 8
  const ng = ctx.createGain()
  hit(ng, t, vel * 0.5, 0.001, 0.06)
  const o1 = ctx.createOscillator()
  o1.type = 'sine'
  o1.frequency.value = freq * 1.13
  const o2 = ctx.createOscillator()
  o2.type = 'sine'
  o2.frequency.value = freq * 0.57
  const og = ctx.createGain()
  hit(og, t, vel * 0.4, 0.001, 0.05)
  n.connect(bp).connect(ng).connect(dest)
  o1.connect(og); o2.connect(og); og.connect(dest)
  n.start(t); n.stop(t + 0.08)
  o1.start(t); o2.start(t); o1.stop(t + 0.06); o2.stop(t + 0.06)
}

// Sample: reproduce un AudioBuffer ya decodificado. Agendar un buffer con
// .start(t) es incluso más preciso que la síntesis. `rate` permite afinar.
function sample(ctx, dest, t, { buffer, rate = 1, vel = 1 }) {
  if (!buffer) return
  const src = ctx.createBufferSource()
  src.buffer = buffer
  if (rate !== 1) src.playbackRate.value = rate
  const g = ctx.createGain()
  g.gain.value = vel
  src.connect(g).connect(dest)
  src.start(t)
}

// Click de metrónomo / count-in.
function click(ctx, dest, t, { accent = false, vel = 1 }) {
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.value = accent ? 2000 : 1300
  const g = ctx.createGain()
  hit(g, t, vel * (accent ? 0.3 : 0.2), 0.001, 0.035)
  o.connect(g).connect(dest)
  o.start(t)
  o.stop(t + 0.05)
}

export const VOICES = { surdo, caixa, tamborim, bell, membrane, cowbell, shaker, clave, sample, click }
