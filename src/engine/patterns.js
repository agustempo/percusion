// Modelo de datos + ritmos semilla (V0).
// Pattern -> tracks[] ; cada track (PatternTrack) tiene su propio stepsPerBar,
// mezcla (volume/mute/solo) y su lista de pasos. La fuente de verdad es este
// objeto; las vistas (grilla, etc.) sólo lo leen y escriben.
//
// Cada paso es null (silencio) o { s: golpeId, v: velocity }.
// v: 0.5 ghost · 0.9 normal · 1.3 acento. La dinámica es lo que da fraseo.

let _uid = 0
export const uid = () => `t${++_uid}`

// Niveles de dinámica que ciclan al clickear una celda.
export const VEL = { ghost: 0.5, normal: 0.9, accent: 1.3 }

export function makeTrack(instrument, stepsPerBar, steps = null) {
  return {
    id: uid(),
    instrument,
    stepsPerBar,
    steps: steps ? steps.slice() : Array(stepsPerBar).fill(null),
    mute: false,
    solo: false,
    volume: 1,
  }
}

// Helper: pasos desde tuplas [indice, golpeId] o [indice, golpeId, velocity].
function fill(len, hits) {
  const a = Array(len).fill(null)
  for (const h of hits) {
    const [i, s, v = VEL.normal] = h
    a[i] = { s, v }
  }
  return a
}

export function emptyPattern() {
  return {
    name: 'Nuevo patrón',
    bpm: 100,
    beatsPerBar: 4,
    beatUnit: 4,
    countIn: true,
    metronome: false,
    swing: 0,
    humanize: 0.15,
    tracks: [makeTrack('surdo', 4)],
  }
}

// --- Ritmos de referencia (contenido semilla + tutorial implícito) ---

function samba() {
  return {
    name: 'Samba',
    bpm: 100,
    beatsPerBar: 4,
    beatUnit: 4,
    countIn: true,
    metronome: false,
    swing: 0.18, // el "suíngue" de la samba: semicorcheas impares atrasadas
    humanize: 0.22,
    tracks: [
      // Surdo: tiempos 2 y 4 acentuados (corazón del groove).
      makeTrack('surdo', 4, fill(4, [[1, 'open', VEL.accent], [3, 'open', VEL.accent]])),
      // Tamborim: teleco-teco, con acento en el 1.
      makeTrack('tamborim', 16, fill(16, [
        [0, 'hit', VEL.accent], [3, 'hit'], [6, 'hit'], [8, 'hit'], [11, 'hit'], [14, 'hit'],
      ])),
      // Caixa: aros como acento en cada tiempo, golpes internos como ghost notes.
      makeTrack('caixa', 16, fill(16, [
        [0, 'rim', VEL.accent], [2, 'hit', VEL.ghost], [3, 'hit', VEL.ghost],
        [4, 'rim', VEL.accent], [6, 'hit', VEL.ghost], [7, 'hit', VEL.ghost],
        [8, 'rim', VEL.accent], [10, 'hit', VEL.ghost], [11, 'hit', VEL.ghost],
        [12, 'rim', VEL.accent], [14, 'hit', VEL.ghost], [15, 'hit', VEL.ghost],
      ])),
      // Chocalho: semicorcheas parejas, acento en cada tiempo.
      makeTrack('chocalho', 16, fill(16, Array.from({ length: 16 }, (_, i) => [
        i, 'hit', i % 4 === 0 ? VEL.normal : VEL.ghost,
      ]))),
    ],
  }
}

function candombe() {
  return {
    name: 'Candombe',
    bpm: 108,
    beatsPerBar: 4,
    beatUnit: 4,
    countIn: true,
    metronome: false,
    swing: 0.1,
    humanize: 0.2,
    tracks: [
      // Clave de madera: 3+3+2 sobre 8 corcheas, acentuada.
      makeTrack('clave', 8, fill(8, [[0, 'hit', VEL.accent], [3, 'hit', VEL.accent], [6, 'hit', VEL.accent]])),
      // Chico: pulso constante en corcheas (la base del candombe).
      makeTrack('repique', 8, fill(8, [
        [0, 'slap', VEL.accent], [2, 'open', VEL.ghost], [3, 'slap'], [5, 'open', VEL.ghost],
        [6, 'slap', VEL.accent], [7, 'open', VEL.ghost],
      ])),
      // Piano (surdo grave): frase sincopada.
      makeTrack('surdo', 8, fill(8, [[0, 'open', VEL.accent], [2, 'mute', VEL.ghost], [3, 'open'], [6, 'open']])),
    ],
  }
}

// 3-contra-2: el caso que rompe cualquier motor con subdivisión global.
// Agogô = 3 golpes por compás, surdo = 2. Mismo compás, distinta subdivisión.
function tresContraDos() {
  return {
    name: '3 contra 2',
    bpm: 88,
    beatsPerBar: 4,
    beatUnit: 4,
    countIn: true,
    metronome: true,
    swing: 0,
    humanize: 0.12,
    tracks: [
      makeTrack('agogo', 3, fill(3, [[0, 'hi', VEL.accent], [1, 'lo'], [2, 'lo']])),
      makeTrack('surdo', 2, fill(2, [[0, 'open', VEL.accent], [1, 'open']])),
    ],
  }
}

export const SEED_RHYTHMS = {
  samba: { label: 'Samba', make: samba },
  candombe: { label: 'Candombe', make: candombe },
  tresContraDos: { label: '3 contra 2', make: tresContraDos },
  vacio: { label: 'Vacío', make: emptyPattern },
}

// Migra patrones viejos (paso = string) al formato { s, v } y asegura campos.
export function normalizePattern(p) {
  if (typeof p.swing !== 'number') p.swing = 0
  if (typeof p.humanize !== 'number') p.humanize = 0
  for (const t of p.tracks) {
    t.steps = t.steps.map((s) =>
      s == null ? null : typeof s === 'string' ? { s, v: VEL.normal } : s
    )
  }
  return p
}
