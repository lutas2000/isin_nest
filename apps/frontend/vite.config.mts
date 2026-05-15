import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

const repoRoot = resolve(__dirname, '../..')

const parsePort = (value: string | undefined, fallback: number): number => {
  const port = Number(value)
  return Number.isFinite(port) && port > 0 ? port : fallback
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, '')
  const frontendDevPort = parsePort(env.FRONTEND_DEV_PORT, 3001)
  const backendPort = parsePort(env.PORT, 3000)

  return {
    envDir: repoRoot,
    plugins: [vue(), tailwindcss()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: frontendDevPort,
      proxy: {
        '/api': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    build: {
      outDir: '../../dist/apps/frontend',
      assetsDir: 'assets',
    },
  }
})
