# Samples

Los archivos de audio, `manifest.json` y `attribution.json` de esta carpeta los
genera el script de descarga desde Freesound (sólo licencias CC-BY / CC0):

```
FREESOUND_TOKEN=xxxx npm run fetch-samples
```

El token se obtiene (gratis, con tu cuenta) en https://freesound.org/apiv2/apply
y **no se commitea** — se pasa por variable de entorno.

- `manifest.json` mapea `"instrumento/golpe"` → archivo. Si un golpe tiene sample,
  la app lo usa; si no, cae a la síntesis.
- `attribution.json` alimenta el panel "Créditos" de la app (atribución CC-BY).
