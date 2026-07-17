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
    pan: 0, // -1 izquierda · 0 centro · 1 derecha
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

function bossa() {
  return {
    name: 'Bossa nova', bpm: 130, beatsPerBar: 4, beatUnit: 4,
    countIn: true, metronome: false, swing: 0.06, humanize: 0.16,
    tracks: [
      // Clave de bossa (3-2).
      makeTrack('clave', 16, fill(16, [
        [0, 'hit', VEL.accent], [3, 'hit'], [6, 'hit'], [10, 'hit'], [12, 'hit'],
      ])),
      // Surdo grave suave en 1 y 3.
      makeTrack('surdo', 4, fill(4, [[0, 'mute'], [2, 'mute']])),
      // Chocalho: corcheas parejas y tenues.
      makeTrack('chocalho', 16, fill(16, [0, 2, 4, 6, 8, 10, 12, 14].map((i) => [i, 'hit', VEL.ghost]))),
    ],
  }
}

function murga() {
  return {
    name: 'Murga', bpm: 120, beatsPerBar: 4, beatUnit: 4,
    countIn: true, metronome: false, swing: 0.06, humanize: 0.2,
    tracks: [
      // Bombo: marcha con platillo (aro).
      makeTrack('bombo', 8, fill(8, [
        [0, 'hit', VEL.accent], [3, 'rim'], [4, 'hit', VEL.accent], [6, 'rim'],
      ])),
      // Redoblante (caixa) con acentos y ghosts.
      makeTrack('caixa', 16, fill(16, [
        [0, 'hit', VEL.ghost], [2, 'hit'], [4, 'rim', VEL.accent], [7, 'hit', VEL.ghost],
        [8, 'hit'], [10, 'hit', VEL.ghost], [12, 'rim', VEL.accent], [15, 'hit', VEL.ghost],
      ])),
      // Platillos (chocalho) en cada tiempo.
      makeTrack('chocalho', 4, fill(4, [[0, 'hit'], [1, 'hit'], [2, 'hit'], [3, 'hit']])),
    ],
  }
}

function rumba() {
  return {
    name: 'Rumba (guaguancó)', bpm: 96, beatsPerBar: 4, beatUnit: 4,
    countIn: true, metronome: false, swing: 0.1, humanize: 0.2,
    tracks: [
      // Clave de rumba (3-2).
      makeTrack('clave', 16, fill(16, [
        [0, 'hit', VEL.accent], [3, 'hit'], [6, 'hit'], [10, 'hit'], [12, 'hit'],
      ])),
      // Conga: tumbao (open + slap).
      makeTrack('conga', 16, fill(16, [
        [3, 'slap'], [6, 'open'], [7, 'open'], [10, 'slap', VEL.accent], [14, 'open'], [15, 'open'],
      ])),
      // Palitos (woodblock) en corcheas.
      makeTrack('woodblock', 8, fill(8, [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [i, 'hi', i % 2 ? VEL.ghost : VEL.normal]))),
    ],
  }
}

function cumbia() {
  return {
    name: 'Cumbia', bpm: 92, beatsPerBar: 4, beatUnit: 4,
    countIn: true, metronome: false, swing: 0.08, humanize: 0.18,
    tracks: [
      // Cencerro (campana) marcando.
      makeTrack('cencerro', 8, fill(8, [
        [0, 'hit', VEL.accent], [2, 'hit'], [4, 'hit', VEL.accent], [6, 'hit'],
      ])),
      // Conga.
      makeTrack('conga', 16, fill(16, [
        [2, 'open'], [3, 'slap'], [6, 'open'], [10, 'open'], [11, 'slap'], [14, 'open'],
      ])),
      // Guacharaca (chocalho) raspando.
      makeTrack('chocalho', 16, fill(16, [
        [0, 'hit'], [2, 'hit', VEL.ghost], [3, 'hit', VEL.ghost], [4, 'hit'],
        [6, 'hit', VEL.ghost], [7, 'hit', VEL.ghost], [8, 'hit'], [10, 'hit', VEL.ghost],
        [11, 'hit', VEL.ghost], [12, 'hit'], [14, 'hit', VEL.ghost], [15, 'hit', VEL.ghost],
      ])),
      // Bombo en 1 y 3.
      makeTrack('bombo', 4, fill(4, [[0, 'hit', VEL.accent], [2, 'hit']])),
    ],
  }
}

function funk() {
  return {
    name: 'Funk', bpm: 100, beatsPerBar: 4, beatUnit: 4,
    countIn: true, metronome: false, swing: 0, humanize: 0.14,
    tracks: [
      // Bombo (kick) sincopado.
      makeTrack('surdo', 16, fill(16, [[0, 'open', VEL.accent], [6, 'open'], [10, 'open']])),
      // Caixa (snare): backbeat en 2 y 4 + ghost notes.
      makeTrack('caixa', 16, fill(16, [
        [2, 'hit', VEL.ghost], [4, 'hit', VEL.accent], [7, 'hit', VEL.ghost],
        [9, 'hit', VEL.ghost], [12, 'hit', VEL.accent], [14, 'hit', VEL.ghost],
      ])),
      // Chocalho (hi-hat) en semicorcheas, acento por tiempo.
      makeTrack('chocalho', 16, fill(16, Array.from({ length: 16 }, (_, i) => [i, 'hit', i % 4 === 0 ? VEL.normal : VEL.ghost]))),
    ],
  }
}

function reggaeton() {
  return {
    name: 'Reggaetón (dembow)', bpm: 94, beatsPerBar: 4, beatUnit: 4,
    countIn: true, metronome: false, swing: 0, humanize: 0.12,
    tracks: [
      // Bombo (kick) en 1 y 3.
      makeTrack('surdo', 16, fill(16, [[0, 'open', VEL.accent], [8, 'open', VEL.accent]])),
      // Caixa (snare): patrón dembow "boom-ch-boom-chick".
      makeTrack('caixa', 16, fill(16, [
        [3, 'hit', VEL.accent], [6, 'hit'], [8, 'hit', VEL.ghost],
        [11, 'hit', VEL.accent], [14, 'hit'],
      ])),
      // Cencerro / hats en corcheas.
      makeTrack('chocalho', 16, fill(16, [0, 2, 4, 6, 8, 10, 12, 14].map((i) => [i, 'hit', VEL.ghost]))),
    ],
  }
}

// Ritmos agrupados por familia (para el selector).
export const SEED_RHYTHMS = {
  samba: { label: 'Samba', group: 'Brasil', make: samba },
  bossa: { label: 'Bossa nova', group: 'Brasil', make: bossa },
  candombe: { label: 'Candombe', group: 'Afro-uruguayo', make: candombe },
  murga: { label: 'Murga', group: 'Afro-uruguayo', make: murga },
  rumba: { label: 'Rumba (guaguancó)', group: 'Cuba / Latino', make: rumba },
  cumbia: { label: 'Cumbia', group: 'Cuba / Latino', make: cumbia },
  funk: { label: 'Funk', group: 'Popular', make: funk },
  reggaeton: { label: 'Reggaetón (dembow)', group: 'Popular', make: reggaeton },
  tresContraDos: { label: '3 contra 2', group: 'Ejercicios', make: tresContraDos },
  vacio: { label: 'Vacío', group: 'Ejercicios', make: emptyPattern },
}

// Orden de las familias en el selector.
export const RHYTHM_GROUPS = ['Brasil', 'Afro-uruguayo', 'Cuba / Latino', 'Popular', 'Ejercicios']

// Migra patrones viejos (paso = string) al formato { s, v } y asegura campos.
export function normalizePattern(p) {
  if (typeof p.swing !== 'number') p.swing = 0
  if (typeof p.humanize !== 'number') p.humanize = 0
  for (const t of p.tracks) {
    if (typeof t.pan !== 'number') t.pan = 0
    t.steps = t.steps.map((s) =>
      s == null ? null : typeof s === 'string' ? { s, v: VEL.normal } : s
    )
  }
  return p
}
