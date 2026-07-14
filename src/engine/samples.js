// Banco de samples en runtime: AudioBuffers decodificados, clave "instrumento/golpe".
// Si hay un sample para un golpe, el scheduler lo usa; si no, cae a la síntesis.
// Los archivos y el manifest se generan con scripts/fetch-samples.mjs (Freesound).

export const sampleBank = new Map()
let started = false

// Se llama una vez, en el gesto de Play (ya tenemos AudioContext desbloqueado).
export async function loadSamples(ctx) {
  if (started) return
  started = true
  const base = (import.meta.env.BASE_URL || '/') + 'samples/'
  let manifest
  try {
    const res = await fetch(base + 'manifest.json', { cache: 'no-cache' })
    if (!res.ok) return // sin samples aún -> todo síntesis
    manifest = await res.json()
  } catch {
    return
  }
  await Promise.all(
    Object.entries(manifest).map(async ([key, file]) => {
      try {
        const ab = await fetch(base + file).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
        sampleBank.set(key, await ctx.decodeAudioData(ab))
      } catch {
        /* un sample que falla no rompe el resto */
      }
    })
  )
}
