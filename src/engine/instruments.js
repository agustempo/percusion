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
}

export const INSTRUMENT_IDS = Object.keys(INSTRUMENTS)
