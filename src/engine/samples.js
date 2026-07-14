// Banco de samples en runtime: AudioBuffers decodificados, clave "instrumento/golpe".
// Si hay un sample para un golpe, el scheduler lo usa; si no, cae a la síntesis.
// Los archivos y el manifest se generan con scripts/fetch-samples.mjs (Freesound).

// Cada entrada: { buffer, gain } — gain normaliza el pico para emparejar
// volúmenes entre samples de distintas fuentes (sin herramientas externas).
export const sampleBank = new Map()
let started = false

function peakGain(buffer, target = 0.7) {
  let peak = 0
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const d = buffer.getChannelData(ch)
    for (let i = 0; i < d.length; i++) {
      const a = Math.abs(d[i])
      if (a > peak) peak = a
    }
  }
  if (peak < 1e-4) return 1
  return Math.min(4, target / peak) // tope para no amplificar de más lo casi mudo
}

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
        const buffer = await ctx.decodeAudioData(ab)
        sampleBank.set(key, { buffer, gain: peakGain(buffer) })
      } catch {
        /* un sample que falla no rompe el resto */
      }
    })
  )
}
