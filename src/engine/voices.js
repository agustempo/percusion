// Voces sintetizadas con Web Audio.
// Cada voz agenda su sonido en un tiempo absoluto del AudioContext (`t`).
// No dependemos de samples: esto valida el TIMING sin tener que curar audio.
// Cada función: (ctx, dest, t, params) -> void

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

function env(g, t, peak, attack, decay) {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
}

// Surdo: seno grave con caída de pitch. Abierto (largo) vs apagado (corto).
function surdo(ctx, dest, t, { muted = false, vel = 1 }) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(muted ? 115 : 92, t)
  o.frequency.exponentialRampToValueAtTime(muted ? 72 : 48, t + 0.12)
  const decay = muted ? 0.11 : 0.34
  env(g, t, vel * (muted ? 0.55 : 0.95), 0.004, decay)
  o.connect(g).connect(dest)
  o.start(t)
  o.stop(t + decay + 0.05)
}

// Caixa / caja: ruido con band-pass. Golpe normal vs aro (más brillante y corto).
function caixa(ctx, dest, t, { rim = false, vel = 1 }) {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = rim ? 3400 : 1900
  bp.Q.value = 0.9
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 1100
  const g = ctx.createGain()
  const dur = rim ? 0.055 : 0.13
  env(g, t, vel * (rim ? 0.6 : 0.7), 0.002, dur)
  src.connect(bp).connect(hp).connect(g).connect(dest)
  src.start(t)
  src.stop(t + dur + 0.03)
}

// Tamborim: tick agudo y muy corto.
function tamborim(ctx, dest, t, { vel = 1 }) {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2700
  bp.Q.value = 1.4
  const g = ctx.createGain()
  const dur = 0.05
  env(g, t, vel * 0.6, 0.001, dur)
  src.connect(bp).connect(g).connect(dest)
  src.start(t)
  src.stop(t + dur + 0.02)
}

// Campana (agogô): dos senos inarmónicos, decay tipo campana.
function bell(ctx, dest, t, { freq = 800, vel = 1 }) {
  const o1 = ctx.createOscillator()
  const o2 = ctx.createOscillator()
  const g = ctx.createGain()
  const g2 = ctx.createGain()
  o1.type = 'sine'
  o1.frequency.value = freq
  o2.type = 'sine'
  o2.frequency.value = freq * 2.76
  g2.gain.value = 0.35
  env(g, t, vel * 0.5, 0.002, 0.28)
  o1.connect(g)
  o2.connect(g2).connect(g)
  g.connect(dest)
  o1.start(t); o2.start(t)
  o1.stop(t + 0.32); o2.stop(t + 0.32)
}

// Chocalho / shaker: ruido muy agudo, ataque suave.
function shaker(ctx, dest, t, { vel = 1 }) {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 6500
  const g = ctx.createGain()
  const dur = 0.05
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(vel * 0.4, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(hp).connect(g).connect(dest)
  src.start(t)
  src.stop(t + dur + 0.02)
}

// Clave: pulso brillante y seco.
function clave(ctx, dest, t, { vel = 1 }) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(2500, t)
  env(g, t, vel * 0.6, 0.001, 0.05)
  o.connect(g).connect(dest)
  o.start(t)
  o.stop(t + 0.06)
}

// Click de metrónomo / count-in.
function click(ctx, dest, t, { accent = false, vel = 1 }) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = 'square'
  o.frequency.value = accent ? 2000 : 1250
  env(g, t, vel * (accent ? 0.35 : 0.22), 0.001, 0.03)
  o.connect(g).connect(dest)
  o.start(t)
  o.stop(t + 0.05)
}

export const VOICES = { surdo, caixa, tamborim, bell, shaker, clave, click }
