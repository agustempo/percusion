import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  // Se sirve bajo samona.app/percusion — los assets deben referenciarse desde ahí.
  base: '/percusion/',
  plugins: [vue()],
})
