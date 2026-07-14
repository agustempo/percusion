// Biblioteca curada de instrumentos (V0).
// La complejidad técnica (golpes por instrumento) viene resuelta de fábrica:
// el usuario sólo elige y marca. Cada `stroke` apunta a una voz sintetizada.
// Extensible por diseño: agregar un instrumento es agregar una entrada acá.

export const INSTRUMENTS = {
  surdo: {
    name: 'Surdo',
    color: '#e07a5f',
    strokes: [
      { id: 'open', label: 'Abierto', voice: { type: 'surdo', muted: false } },
      { id: 'mute', label: 'Apagado', voice: { type: 'surdo', muted: true } },
    ],
  },
  caixa: {
    name: 'Caixa',
    color: '#3d5a80',
    strokes: [
      { id: 'hit', label: 'Golpe', voice: { type: 'caixa' } },
      { id: 'rim', label: 'Aro', voice: { type: 'caixa', rim: true } },
    ],
  },
  repique: {
    name: 'Repique',
    color: '#6d597a',
    strokes: [
      { id: 'open', label: 'Abierto', voice: { type: 'caixa', rim: true } },
      { id: 'slap', label: 'Slap', voice: { type: 'tamborim' } },
    ],
  },
  tamborim: {
    name: 'Tamborim',
    color: '#81b29a',
    strokes: [{ id: 'hit', label: 'Golpe', voice: { type: 'tamborim' } }],
  },
  agogo: {
    name: 'Agogô',
    color: '#f2cc8f',
    strokes: [
      { id: 'lo', label: 'Grave', voice: { type: 'bell', freq: 540 } },
      { id: 'hi', label: 'Agudo', voice: { type: 'bell', freq: 810 } },
    ],
  },
  chocalho: {
    name: 'Chocalho',
    color: '#a5a58d',
    strokes: [{ id: 'hit', label: 'Golpe', voice: { type: 'shaker' } }],
  },
  clave: {
    name: 'Clave',
    color: '#bc6c25',
    strokes: [{ id: 'hit', label: 'Golpe', voice: { type: 'clave' } }],
  },
  conga: {
    name: 'Conga',
    color: '#c1666b',
    strokes: [
      { id: 'open', label: 'Abierto', voice: { type: 'membrane', freq: 240, decay: 0.22, noise: 0.15 } },
      { id: 'slap', label: 'Slap', voice: { type: 'membrane', freq: 300, decay: 0.08, noise: 0.9, noiseFreq: 3600 } },
      { id: 'mute', label: 'Apagado', voice: { type: 'membrane', freq: 220, decay: 0.08, noise: 0.1 } },
    ],
  },
  bongo: {
    name: 'Bongó',
    color: '#d4a373',
    strokes: [
      { id: 'open', label: 'Abierto', voice: { type: 'membrane', freq: 400, decay: 0.13, noise: 0.15 } },
      { id: 'slap', label: 'Slap', voice: { type: 'membrane', freq: 480, decay: 0.07, noise: 0.85, noiseFreq: 4200 } },
    ],
  },
  djembe: {
    name: 'Djembe',
    color: '#a3714f',
    strokes: [
      { id: 'bass', label: 'Bajo', voice: { type: 'membrane', freq: 90, decay: 0.34, bend: 0.6 } },
      { id: 'tone', label: 'Tono', voice: { type: 'membrane', freq: 280, decay: 0.15, noise: 0.25 } },
      { id: 'slap', label: 'Slap', voice: { type: 'membrane', freq: 380, decay: 0.1, noise: 1, noiseFreq: 4200 } },
    ],
  },
  timbal: {
    name: 'Timbal',
    color: '#8ecae6',
    strokes: [
      { id: 'open', label: 'Abierto', voice: { type: 'membrane', freq: 320, decay: 0.12, noise: 0.35, noiseFreq: 4000 } },
      { id: 'paila', label: 'Paila', voice: { type: 'clave', freq: 3200 } },
    ],
  },
  cencerro: {
    name: 'Cencerro',
    color: '#e9c46a',
    strokes: [{ id: 'hit', label: 'Golpe', voice: { type: 'cowbell' } }],
  },
  woodblock: {
    name: 'Woodblock',
    color: '#9c6644',
    strokes: [
      { id: 'hi', label: 'Agudo', voice: { type: 'clave', freq: 1700 } },
      { id: 'lo', label: 'Grave', voice: { type: 'clave', freq: 1150 } },
    ],
  },
  triangulo: {
    name: 'Triángulo',
    color: '#cfd6e6',
    strokes: [
      { id: 'open', label: 'Abierto', voice: { type: 'bell', freq: 4200, decay: 1.1 } },
      { id: 'mute', label: 'Apagado', voice: { type: 'bell', freq: 4200, decay: 0.13 } },
    ],
  },
  bombo: {
    name: 'Bombo',
    color: '#774936',
    strokes: [
      { id: 'hit', label: 'Parche', voice: { type: 'membrane', freq: 72, decay: 0.4, bend: 0.62 } },
      { id: 'rim', label: 'Aro', voice: { type: 'clave', freq: 1400 } },
    ],
  },
}

export const INSTRUMENT_IDS = Object.keys(INSTRUMENTS)
