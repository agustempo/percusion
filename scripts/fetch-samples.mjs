// Descarga samples CC-BY / CC0 de Freesound y genera manifest + atribución.
//
// Uso:
//   FREESOUND_TOKEN=xxxx node scripts/fetch-samples.mjs
//
// El token se saca (gratis, con tu cuenta) en https://freesound.org/apiv2/apply
// NO se commitea: se pasa por variable de entorno.
//
// Sólo busca sonidos con licencia "Attribution" (CC-BY) o "Creative Commons 0"
// (CC0) — nada de NonCommercial. Escribe:
//   public/samples/<inst>_<golpe>.mp3   (previews, calidad más que suficiente)
//   public/samples/manifest.json        { "conga/open": "conga_open.mp3", ... }
//   public/samples/attribution.json     [ {instrument, stroke, name, author, license, url, source} ]

import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const TOKEN = process.env.FREESOUND_TOKEN
if (!TOKEN) {
  console.error('Falta FREESOUND_TOKEN. Sacalo en https://freesound.org/apiv2/apply')
  process.exit(1)
}

// Curación: para cada "instrumento/golpe", una lista de búsquedas alternativas
// (se prueban en orden hasta encontrar un resultado nuevo). Pensadas para
// traer one-shots limpios; se pueden afinar y volver a correr.
const CURATION = [
  { key: 'surdo/open', q: ['surdo', 'surdo samba', 'floor tom low open'] },
  { key: 'surdo/mute', q: ['surdo mute', 'surdo muffled', 'tom muted'] },
  { key: 'caixa/hit', q: ['caixa samba', 'snare drum hit', 'snare acoustic'] },
  { key: 'tamborim/hit', q: ['tamborim', 'tamborim samba', 'frame drum high hit'] },
  { key: 'agogo/hi', q: ['agogo high', 'agogo bell high'] },
  { key: 'agogo/lo', q: ['agogo low', 'agogo bell low'] },
  { key: 'chocalho/hit', q: ['chocalho', 'shaker samba', 'shaker'] },
  { key: 'clave/hit', q: ['clave', 'claves wood'] },
  { key: 'conga/open', q: ['conga open tone', 'conga open'] },
  { key: 'conga/slap', q: ['conga slap', 'conga slap hit'] },
  { key: 'conga/mute', q: ['conga muted', 'conga mute'] },
  { key: 'bongo/open', q: ['bongo open', 'bongo hit'] },
  { key: 'bongo/slap', q: ['bongo slap', 'bongo high'] },
  { key: 'djembe/bass', q: ['djembe bass', 'djembe low'] },
  { key: 'djembe/tone', q: ['djembe tone', 'djembe open'] },
  { key: 'djembe/slap', q: ['djembe slap'] },
  { key: 'cencerro/hit', q: ['cowbell', 'cowbell hit'] },
  { key: 'woodblock/hi', q: ['woodblock high', 'woodblock'] },
  { key: 'woodblock/lo', q: ['woodblock low', 'wood block low'] },
  { key: 'triangulo/open', q: ['triangle open', 'triangle percussion'] },
  { key: 'bombo/hit', q: ['bombo', 'bass drum acoustic', 'kick drum acoustic'] },
]

// Instrumentos donde la síntesis propia gana: en Freesound casi no hay CC-BY
// decentes y los que hay son largos (se solapan al repetir). Quedan en síntesis.
const SYNTH_ONLY = new Set(['surdo', 'bombo'])

// Etiqueta corta de licencia a partir de la URL (para el panel de créditos).
function licenseLabel(url = '') {
  if (url.includes('publicdomain/zero')) return 'CC0'
  const m = url.match(/licenses\/by(-\w+)?\/([\d.]+)/)
  if (m) return 'CC BY' + (m[1] ? m[1].toUpperCase() : '') + ' ' + m[2]
  return 'CC BY'
}

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'samples')
const LICENSE_FILTER = 'license:("Attribution" OR "Creative Commons 0")'

async function search(q) {
  const url =
    'https://freesound.org/apiv2/search/text/?' +
    new URLSearchParams({
      query: q,
      filter: `${LICENSE_FILTER} duration:[0.1 TO 1.3]`,
      sort: 'downloads_desc',
      fields: 'id,name,username,license,url,previews',
      page_size: '8',
      token: TOKEN,
    })
  const res = await fetch(url)
  if (!res.ok) throw new Error(`search ${q}: HTTP ${res.status}`)
  const data = await res.json()
  return (data.results || []).filter((r) => r.previews && r.previews['preview-hq-mp3'])
}

// Prueba las búsquedas en orden y devuelve el primer resultado cuyo id no haya
// sido ya usado para ESE instrumento (evita el mismo sonido en varios golpes).
async function pick(queries, usedIds) {
  for (const q of queries) {
    const results = await search(q)
    const hit = results.find((r) => !usedIds.has(r.id))
    if (hit) return hit
  }
  return null
}

async function download(previewUrl, dest) {
  let res = await fetch(previewUrl)
  if (!res.ok) res = await fetch(previewUrl + '?token=' + TOKEN) // por si el CDN pide token
  if (!res.ok) throw new Error(`download HTTP ${res.status}`)
  await writeFile(dest, Buffer.from(await res.arrayBuffer()))
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const manifest = {}
  const attribution = []
  const usedByInstrument = {} // instrumento -> Set de ids ya usados
  for (const { key, q } of CURATION) {
    const instrument = key.split('/')[0]
    if (SYNTH_ONLY.has(instrument)) {
      console.log(`  (síntesis) ${key}`)
      continue
    }
    const used = (usedByInstrument[instrument] ||= new Set())
    try {
      const s = await pick(q, used)
      if (!s) {
        console.warn(`  (sin resultado) ${key}`)
        continue
      }
      used.add(s.id)
      const file = key.replace('/', '_') + '.mp3'
      await download(s.previews['preview-hq-mp3'], join(OUT, file))
      manifest[key] = file
      attribution.push({
        instrument,
        stroke: key.split('/')[1],
        name: s.name,
        author: s.username,
        license: s.license,
        licenseLabel: licenseLabel(s.license),
        url: s.url,
        source: 'Freesound',
      })
      console.log(`  ✓ ${key} ← "${s.name}" por ${s.username} (${licenseLabel(s.license)})`)
    } catch (e) {
      console.warn(`  ✗ ${key}: ${e.message}`)
    }
  }
  await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
  await writeFile(join(OUT, 'attribution.json'), JSON.stringify(attribution, null, 2))
  console.log(`\nListo: ${Object.keys(manifest).length} samples en public/samples/`)
}

main()
