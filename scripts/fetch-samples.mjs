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

// Curación: qué buscar para cada "instrumento/golpe". Empezamos con un set
// coherente; se puede ampliar. Query pensada para traer one-shots limpios.
const CURATION = [
  { key: 'surdo/open', q: 'surdo open' },
  { key: 'surdo/mute', q: 'surdo muffled' },
  { key: 'caixa/hit', q: 'caixa samba snare' },
  { key: 'tamborim/hit', q: 'tamborim' },
  { key: 'agogo/hi', q: 'agogo bell high' },
  { key: 'agogo/lo', q: 'agogo bell low' },
  { key: 'chocalho/hit', q: 'shaker chocalho' },
  { key: 'clave/hit', q: 'clave wood hit' },
  { key: 'conga/open', q: 'conga open tone' },
  { key: 'conga/slap', q: 'conga slap' },
  { key: 'conga/mute', q: 'conga muted' },
  { key: 'bongo/open', q: 'bongo open' },
  { key: 'bongo/slap', q: 'bongo slap' },
  { key: 'djembe/bass', q: 'djembe bass' },
  { key: 'djembe/tone', q: 'djembe tone' },
  { key: 'djembe/slap', q: 'djembe slap' },
  { key: 'cencerro/hit', q: 'cowbell hit' },
  { key: 'woodblock/hi', q: 'woodblock high' },
  { key: 'woodblock/lo', q: 'woodblock low' },
  { key: 'triangulo/open', q: 'triangle percussion open' },
  { key: 'bombo/hit', q: 'bass drum bombo hit' },
]

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'samples')
const LICENSE_FILTER = 'license:("Attribution" OR "Creative Commons 0")'

async function search(q) {
  const url =
    'https://freesound.org/apiv2/search/text/?' +
    new URLSearchParams({
      query: q,
      filter: `${LICENSE_FILTER} duration:[0 TO 2]`,
      sort: 'downloads_desc',
      fields: 'id,name,username,license,url,previews',
      page_size: '5',
      token: TOKEN,
    })
  const res = await fetch(url)
  if (!res.ok) throw new Error(`search ${q}: HTTP ${res.status}`)
  const data = await res.json()
  return (data.results || []).find((r) => r.previews && r.previews['preview-hq-mp3'])
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
  for (const { key, q } of CURATION) {
    try {
      const s = await search(q)
      if (!s) {
        console.warn(`  (sin resultado) ${key} — "${q}"`)
        continue
      }
      const file = key.replace('/', '_') + '.mp3'
      await download(s.previews['preview-hq-mp3'], join(OUT, file))
      manifest[key] = file
      attribution.push({
        instrument: key.split('/')[0],
        stroke: key.split('/')[1],
        name: s.name,
        author: s.username,
        license: s.license,
        url: s.url,
        source: 'Freesound',
      })
      console.log(`  ✓ ${key} ← "${s.name}" por ${s.username} (${s.license})`)
    } catch (e) {
      console.warn(`  ✗ ${key}: ${e.message}`)
    }
  }
  await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
  await writeFile(join(OUT, 'attribution.json'), JSON.stringify(attribution, null, 2))
  console.log(`\nListo: ${Object.keys(manifest).length} samples en public/samples/`)
}

main()
