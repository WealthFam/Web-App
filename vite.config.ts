// @ts-nocheck
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { execSync } from 'child_process'
import fs from 'fs'

// Read version.json from root
let version = '0.0.0'
try {
  const versionData = JSON.parse(fs.readFileSync(path.resolve(__dirname, './version.json'), 'utf-8'))
  version = `${versionData.major}.${versionData.minor}.${versionData.patch}`
} catch (e) {
  console.warn('Could not read version.json')
}

// Get latest 4 digits of master commit or from environment
let build = (process.env.VITE_APP_BUILD || '').trim() || '0000'

if (build === '0000') {
  try {
    build = execSync('git rev-parse master').toString().trim().substring(0, 4)
  } catch (e) {
    console.warn('Could not get git build number from master, trying HEAD...')
    try {
      build = execSync('git rev-parse HEAD').toString().trim().substring(0, 4)
    } catch (e2) {
      console.warn('Could not get git build number, using fallback.')
    }
  }
}

console.log(`--- Building WealthFam v${version} (Build: ${build}) ---`)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  define: {
    '__APP_VERSION__': JSON.stringify(version),
    '__APP_BUILD__': JSON.stringify(build)
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: false,
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/telemetry': {
        target: 'http://127.0.0.1:8002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/telemetry/, '/v1/telemetry'),
      },
      '/ws': {
        target: 'http://127.0.0.1:8000',
        ws: true,
        changeOrigin: true,
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('chart.js') || id.includes('vue-chartjs') || id.includes('chartjs-plugin-datalabels')) {
              return 'vendor-charts'
            }
            if (id.includes('leaflet') || id.includes('leaflet.heat')) {
              return 'vendor-maps'
            }
            if (id.includes('lucide-vue-next') || id.includes('@vuepic/vue-datepicker')) {
              return 'vendor-ui'
            }
            if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) {
              return 'vendor-vue'
            }
            if (id.includes('date-fns') || id.includes('marked') || id.includes('axios')) {
              return 'vendor-utils'
            }
            return 'vendor-core'
          }
        }
      }
    }
  }
})
