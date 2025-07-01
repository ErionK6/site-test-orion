// vite.config.ts
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    nodePolyfills({
      // Pour forcer l'inclusion des polyfills pour les modules qui en ont besoin
      // La plupart du temps, la configuration par défaut est suffisante,
      // mais spécifier 'buffer' et 'global' peut aider.
      globals: {
        Buffer: true, // Fournit une variable globale Buffer
        global: true,
        process: true,
      },
      protocolImports: true, // Nécessaire pour des modules comme 'stream'
    }),
  ],
  define: {
    // Cela remplace `global` par `globalThis` dans le code final, ce qui est
    // la manière moderne et compatible avec les navigateurs de se référer à l'objet global.
    'global': 'globalThis'
  }
})
