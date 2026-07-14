<script setup>
// Vista circular (rhythm wheel): otra lectura/escritura del MISMO Pattern.
// Cada track es un anillo concéntrico; los pasos son puntos alrededor del ciclo.
// Una manecilla gira con el pulso. Ideal para tocar en vivo mirando el ciclo.
import { computed } from 'vue'
import { INSTRUMENTS } from '../engine/instruments.js'
import { VEL } from '../engine/patterns.js'

const props = defineProps({
  pattern: { type: Object, required: true },
  phase: { type: Number, default: -1 }, // fase del compás [0,1), <0 = parado
  cellClick: { type: Function, required: true },
  cellStroke: { type: Function, required: true },
})

const CX = 210
const CY = 210
const R0 = 58 // radio del anillo más interno
const RING = 30 // separación entre anillos

const outerR = computed(() => R0 + (props.pattern.tracks.length - 1) * RING + 22)

// Ángulo de un paso: arranca arriba (-90°) y gira en sentido horario.
function angle(i, n) {
  return (i / n) * 2 * Math.PI - Math.PI / 2
}

const rings = computed(() =>
  props.pattern.tracks.map((track, idx) => {
    const radius = R0 + idx * RING
    const n = track.stepsPerBar
    return {
      track,
      radius,
      n,
      color: INSTRUMENTS[track.instrument].color,
      dots: track.steps.map((cell, i) => {
        const th = angle(i, n)
        return { i, cell, x: CX + radius * Math.cos(th), y: CY + radius * Math.sin(th) }
      }),
    }
  })
)

// Marcadores de pulso (líneas radiales tenues).
const beatLines = computed(() => {
  const b = props.pattern.beatsPerBar
  return Array.from({ length: b }, (_, k) => {
    const th = angle(k, b)
    return { x2: CX + outerR.value * Math.cos(th), y2: CY + outerR.value * Math.sin(th) }
  })
})

// Manecilla que gira con la fase.
const hand = computed(() => {
  if (props.phase < 0) return null
  const th = props.phase * 2 * Math.PI - Math.PI / 2
  return { x2: CX + outerR.value * Math.cos(th), y2: CY + outerR.value * Math.sin(th) }
})

function dotR(cell) {
  if (cell == null) return 3.5
  return cell.v >= VEL.accent ? 9 : cell.v >= VEL.normal ? 7 : 5
}
function dotOpacity(cell) {
  if (cell == null) return 1
  return cell.v >= VEL.accent ? 1 : cell.v >= VEL.normal ? 0.82 : 0.45
}
function isActive(ring, i) {
  if (props.phase < 0) return false
  return Math.floor(props.phase * ring.n) % ring.n === i
}
</script>

<template>
  <svg :viewBox="`0 0 420 420`" class="wheel" role="img" aria-label="Vista circular del ritmo">
    <!-- pulsos -->
    <line v-for="(b, k) in beatLines" :key="'b' + k"
          :x1="CX" :y1="CY" :x2="b.x2" :y2="b.y2"
          stroke="#3a3733" stroke-width="1" />

    <!-- anillos guía -->
    <circle v-for="(ring, ri) in rings" :key="'r' + ri"
            :cx="CX" :cy="CY" :r="ring.radius"
            fill="none" stroke="#2a2825" stroke-width="1" />

    <!-- puntos (pasos) -->
    <template v-for="(ring, ri) in rings" :key="'d' + ri">
      <circle v-for="dot in ring.dots" :key="dot.i"
              :cx="dot.x" :cy="dot.y" :r="dotR(dot.cell)"
              :fill="dot.cell != null ? ring.color : '#1c1b1a'"
              :fill-opacity="dotOpacity(dot.cell)"
              :stroke="isActive(ring, dot.i) ? '#f4f1ec' : dot.cell == null ? '#4a463f' : 'none'"
              :stroke-width="isActive(ring, dot.i) ? 2 : 1"
              class="wdot"
              @click="cellClick(ring.track, dot.i)"
              @contextmenu.prevent="cellStroke(ring.track, dot.i)" />
    </template>

    <!-- manecilla -->
    <line v-if="hand" :x1="CX" :y1="CY" :x2="hand.x2" :y2="hand.y2"
          stroke="#f4f1ec" stroke-width="2" stroke-linecap="round" opacity="0.9" />
    <circle :cx="CX" :cy="CY" r="4" fill="#f4f1ec" />
  </svg>
</template>

<style scoped>
.wheel { width: 100%; max-width: 440px; height: auto; display: block; margin: 0 auto; }
.wdot { cursor: pointer; transition: r .05s; }
.wdot:hover { stroke: #8a8580 !important; stroke-width: 2; }
</style>
