<script setup>
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue'
import { engine } from './engine/scheduler.js'
import { INSTRUMENTS, INSTRUMENT_IDS } from './engine/instruments.js'
import { SEED_RHYTHMS, makeTrack, normalizePattern, VEL } from './engine/patterns.js'

// --- Estado: el patrón es la única fuente de verdad ---
const pattern = reactive(SEED_RHYTHMS.samba.make())
const playing = ref(false)
const phase = ref(-1) // fase del compás [0,1) para el playhead
const newInstrument = ref('surdo')

// --- Transporte ---
async function togglePlay() {
  if (playing.value) {
    engine.stop()
    playing.value = false
    phase.value = -1
  } else {
    await engine.play(pattern)
    playing.value = true
  }
}

function onTempo(v) {
  pattern.bpm = Math.min(240, Math.max(40, Math.round(v)))
  if (playing.value) engine.reschedule()
}

// --- Playhead: leemos la fase del motor por rAF, sin acoplar audio a la UI ---
let raf = null
function tick() {
  if (playing.value) phase.value = engine.phase()
  raf = requestAnimationFrame(tick)
}
onMounted(() => {
  raf = requestAnimationFrame(tick)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  engine.stop()
})

// --- Grilla ---
// Paso activo (local) de un track según la fase actual del compás.
function activeStep(track) {
  if (phase.value < 0) return -1
  return Math.floor(phase.value * track.stepsPerBar) % track.stepsPerBar
}

// Agrupación visual por pulso: sólo si stepsPerBar es múltiplo de beatsPerBar.
function groupsOf(track) {
  const spb = track.stepsPerBar
  if (spb % pattern.beatsPerBar === 0) {
    const per = spb / pattern.beatsPerBar
    const groups = []
    for (let b = 0; b < pattern.beatsPerBar; b++) {
      groups.push(Array.from({ length: per }, (_, i) => b * per + i))
    }
    return groups
  }
  // Polirrítmico respecto al compás: una sola fila sin agrupar.
  return [Array.from({ length: spb }, (_, i) => i)]
}

// Click izquierdo: vacío -> normal -> acento -> ghost -> vacío (dinámica).
const VEL_CYCLE = [VEL.normal, VEL.accent, VEL.ghost]
function cellClick(track, i) {
  const cell = track.steps[i]
  if (cell == null) {
    track.steps[i] = { s: INSTRUMENTS[track.instrument].strokes[0].id, v: VEL.normal }
  } else {
    const next = VEL_CYCLE.indexOf(cell.v) + 1
    if (next < VEL_CYCLE.length) cell.v = VEL_CYCLE[next]
    else track.steps[i] = null
  }
  const c = track.steps[i]
  if (c) engine.preview(track.instrument, c.s, c.v)
}

// Click derecho: cambia el golpe (abierto/apagado/aro...), mantiene la dinámica.
function cellStroke(track, i) {
  const cell = track.steps[i]
  if (!cell) return
  const strokes = INSTRUMENTS[track.instrument].strokes
  if (strokes.length < 2) return
  const idx = strokes.findIndex((s) => s.id === cell.s)
  cell.s = strokes[(idx + 1) % strokes.length].id
  engine.preview(track.instrument, cell.s, cell.v)
}

function cellClass(track, i) {
  const cell = track.steps[i]
  if (cell == null) return { playing: activeStep(track) === i }
  const idx = INSTRUMENTS[track.instrument].strokes.findIndex((s) => s.id === cell.s)
  return {
    on: true,
    accent: cell.v >= VEL.accent,
    ghost: cell.v <= VEL.ghost,
    alt: idx > 0,
    playing: activeStep(track) === i,
  }
}

function cellStyle(track, i) {
  const cell = track.steps[i]
  if (cell == null) return {}
  const op = cell.v >= VEL.accent ? 1 : cell.v >= VEL.normal ? 0.82 : 0.42
  return { background: INSTRUMENTS[track.instrument].color, opacity: op }
}

// --- Subdivisiones (steps por compás) derivadas del compás ---
const subdivPresets = computed(() => {
  const B = pattern.beatsPerBar
  return [
    { label: 'Negras', spb: B },
    { label: 'Corcheas', spb: 2 * B },
    { label: 'Semis', spb: 4 * B },
    { label: 'Tresillo', spb: 3 * B },
    { label: 'Seisillo', spb: 6 * B },
  ]
})

function setSubdivision(track, spb) {
  if (spb === track.stepsPerBar) return
  track.stepsPerBar = spb
  track.steps = Array(spb).fill(null) // reset: la grilla cambia de fondo
}

// --- Tracks ---
function addTrack() {
  const spb = pattern.beatsPerBar * 4 // semicorcheas por defecto
  pattern.tracks.push(makeTrack(newInstrument.value, spb))
}
function removeTrack(id) {
  const i = pattern.tracks.findIndex((t) => t.id === id)
  if (i >= 0) pattern.tracks.splice(i, 1)
}
function toggleMute(t) { t.mute = !t.mute }
function toggleSolo(t) { t.solo = !t.solo }

// --- Cargar ritmo semilla ---
function loadRhythm(key) {
  const fresh = SEED_RHYTHMS[key].make()
  Object.assign(pattern, fresh)
  if (playing.value) engine.reschedule()
}

// --- Persistencia local (sección 4: guardado offline) ---
function save() {
  localStorage.setItem('percussion:pattern', JSON.stringify(pattern))
}
function load() {
  const raw = localStorage.getItem('percussion:pattern')
  if (!raw) return
  try {
    Object.assign(pattern, normalizePattern(JSON.parse(raw)))
    if (playing.value) engine.reschedule()
  } catch { /* ignore */ }
}

const instName = (id) => INSTRUMENTS[id].name
const instColor = (id) => INSTRUMENTS[id].color
</script>

<template>
  <div class="app">
    <header class="top">
      <div class="brand">
        <span class="dot" /> Acompañamiento de Percusión
        <span class="tag">V0 · spike de motor</span>
      </div>
      <div class="rhythms">
        <button v-for="(r, key) in SEED_RHYTHMS" :key="key" class="chip" @click="loadRhythm(key)">
          {{ r.label }}
        </button>
      </div>
    </header>

    <!-- Transporte -->
    <section class="transport">
      <button class="play" :class="{ on: playing }" @click="togglePlay">
        {{ playing ? '■ Detener' : '▶ Tocar' }}
      </button>

      <div class="ctrl tempo">
        <label>Tempo</label>
        <input type="range" min="40" max="240" :value="pattern.bpm" @input="onTempo($event.target.valueAsNumber)" />
        <span class="bpm">{{ pattern.bpm }} <small>BPM</small></span>
      </div>

      <div class="ctrl">
        <label>Compás</label>
        <div class="meter">
          <select v-model.number="pattern.beatsPerBar">
            <option v-for="n in [2, 3, 4, 5, 6, 7]" :key="n" :value="n">{{ n }}</option>
          </select>
          <span>/</span>
          <select v-model.number="pattern.beatUnit">
            <option :value="4">4</option>
            <option :value="8">8</option>
          </select>
        </div>
      </div>

      <div class="ctrl">
        <label>Swing</label>
        <input type="range" min="0" max="0.6" step="0.02" v-model.number="pattern.swing" />
        <span class="val">{{ Math.round(pattern.swing * 100) }}%</span>
      </div>

      <div class="ctrl">
        <label>Humaniza</label>
        <input type="range" min="0" max="1" step="0.05" v-model.number="pattern.humanize" />
        <span class="val">{{ Math.round(pattern.humanize * 100) }}%</span>
      </div>

      <label class="toggle">
        <input type="checkbox" v-model="pattern.countIn" /> Count-in
      </label>
      <label class="toggle">
        <input type="checkbox" v-model="pattern.metronome" /> Metrónomo
      </label>

      <div class="spacer" />
      <button class="ghost" @click="save">Guardar</button>
      <button class="ghost" @click="load">Cargar</button>
    </section>

    <!-- Tracks + grilla -->
    <section class="tracks">
      <div v-for="track in pattern.tracks" :key="track.id" class="track">
        <div class="track-head" :style="{ '--c': instColor(track.instrument) }">
          <span class="swatch" />
          <span class="tname">{{ instName(track.instrument) }}</span>

          <select class="subdiv" :value="track.stepsPerBar"
                  @change="setSubdivision(track, Number($event.target.value))">
            <option v-for="p in subdivPresets" :key="p.label" :value="p.spb">{{ p.label }}</option>
            <option v-if="!subdivPresets.some(p => p.spb === track.stepsPerBar)"
                    :value="track.stepsPerBar">Libre ({{ track.stepsPerBar }})</option>
          </select>

          <button class="mini" :class="{ act: track.mute }" @click="toggleMute(track)" title="Silenciar">M</button>
          <button class="mini solo" :class="{ act: track.solo }" @click="toggleSolo(track)" title="Solo">S</button>

          <input class="vol" type="range" min="0" max="1" step="0.05" v-model.number="track.volume" title="Volumen" />
          <button class="mini del" @click="removeTrack(track.id)" title="Quitar">×</button>
        </div>

        <div class="grid" :class="{ mono: track.stepsPerBar % pattern.beatsPerBar !== 0 }">
          <div v-for="(group, gi) in groupsOf(track)" :key="gi" class="beatgroup">
            <button
              v-for="i in group" :key="i"
              class="cell"
              :class="cellClass(track, i)"
              :style="cellStyle(track, i)"
              @click="cellClick(track, i)"
              @contextmenu.prevent="cellStroke(track, i)"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Agregar instrumento -->
    <section class="add">
      <select v-model="newInstrument">
        <option v-for="id in INSTRUMENT_IDS" :key="id" :value="id">{{ instName(id) }}</option>
      </select>
      <button class="ghost" @click="addTrack">+ Agregar instrumento</button>
      <p class="hint">
        <b>Click</b> en una celda cicla la dinámica (normal → acento → ghost → apagar).
        <b>Click derecho</b> cambia el golpe (abierto/apagado/aro). Movné el <b>Swing</b> y
        <b>Humaniza</b> mientras suena. Probá <b>3 contra 2</b> para oír la polirritmia.
      </p>
    </section>
  </div>
</template>

<style scoped>
.app {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px 18px 60px;
  color: #e8e6e3;
  font: 14px/1.4 system-ui, sans-serif;
}
.top { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; flex-wrap: wrap; }
.brand { display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 600; }
.brand .dot { width: 10px; height: 10px; border-radius: 50%; background: #e07a5f; box-shadow: 0 0 12px #e07a5f; }
.tag { font-size: 11px; font-weight: 500; color: #8a8580; background: #2a2825; padding: 3px 8px; border-radius: 20px; }
.rhythms { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { background: #2a2825; color: #d8d4cf; border: 1px solid #3a3733; border-radius: 20px; padding: 6px 14px; cursor: pointer; font-size: 13px; }
.chip:hover { background: #34312d; border-color: #4a463f; }

.transport {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  background: #232120; border: 1px solid #33302c; border-radius: 12px;
  padding: 12px 16px; margin-bottom: 18px;
}
.play { background: #e07a5f; color: #1a1817; border: none; border-radius: 8px; padding: 10px 20px; font-size: 15px; font-weight: 600; cursor: pointer; min-width: 118px; }
.play.on { background: #3d5a80; color: #fff; }
.ctrl { display: flex; align-items: center; gap: 8px; }
.ctrl label { font-size: 12px; color: #9a958f; }
.tempo input[type=range] { width: 130px; }
.bpm { font-variant-numeric: tabular-nums; font-weight: 600; min-width: 66px; }
.bpm small { color: #8a8580; font-weight: 400; }
.ctrl input[type=range] { width: 88px; }
.val { font-variant-numeric: tabular-nums; color: #b8b4af; min-width: 34px; font-size: 12px; }
.meter { display: flex; align-items: center; gap: 4px; }
select { background: #1c1b1a; color: #e8e6e3; border: 1px solid #3a3733; border-radius: 6px; padding: 5px 6px; font-size: 13px; }
.toggle { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #b8b4af; cursor: pointer; }
.spacer { flex: 1; }
.ghost { background: transparent; color: #b8b4af; border: 1px solid #3a3733; border-radius: 7px; padding: 7px 12px; cursor: pointer; font-size: 13px; }
.ghost:hover { background: #2a2825; }

.tracks { display: flex; flex-direction: column; gap: 10px; }
.track { background: #201f1e; border: 1px solid #302d2a; border-radius: 10px; padding: 10px 12px; }
.track-head { display: flex; align-items: center; gap: 10px; margin-bottom: 9px; }
.swatch { width: 12px; height: 12px; border-radius: 3px; background: var(--c); }
.tname { font-weight: 600; min-width: 92px; }
.subdiv { min-width: 96px; }
.mini { width: 26px; height: 26px; border-radius: 6px; border: 1px solid #3a3733; background: #262523; color: #b8b4af; cursor: pointer; font-size: 12px; font-weight: 600; }
.mini.act { background: #e0b15f; color: #1a1817; border-color: #e0b15f; }
.mini.solo.act { background: #7fb069; border-color: #7fb069; }
.mini.del { margin-left: auto; }
.mini.del:hover { background: #6e2b2b; color: #fff; }
.vol { width: 80px; }

.grid { display: flex; gap: 10px; flex-wrap: wrap; }
.grid.mono { gap: 4px; }
.beatgroup { display: flex; gap: 4px; padding: 3px; background: #191817; border-radius: 6px; }
.cell {
  position: relative;
  width: 26px; height: 30px; border-radius: 5px; border: 1px solid #37342f;
  background: #14130f; cursor: pointer; padding: 0; transition: transform .05s, box-shadow .08s;
}
.cell:hover { border-color: #55504a; }
.cell.on { border-color: transparent; }
/* Acento: anillo brillante. Ghost: más chico y tenue. */
.cell.accent { outline: 2px solid rgba(255, 255, 255, .85); outline-offset: -2px; }
.cell.ghost { transform: scale(0.82); }
/* Golpe alternativo (2º stroke): punto en la esquina. */
.cell.alt::after {
  content: ''; position: absolute; top: 3px; right: 3px;
  width: 5px; height: 5px; border-radius: 50%; background: rgba(20, 19, 15, .75);
}
.cell.playing { box-shadow: 0 0 0 2px #f4f1ec, 0 0 10px rgba(244,241,236,.4); transform: translateY(-1px); }
.cell.ghost.playing { transform: scale(0.82) translateY(-1px); }

.add { display: flex; align-items: center; gap: 10px; margin-top: 18px; flex-wrap: wrap; }
.hint { flex-basis: 100%; color: #8a8580; font-size: 12.5px; margin: 6px 0 0; }
.hint b { color: #d8d4cf; }
</style>
