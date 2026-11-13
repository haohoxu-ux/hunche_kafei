import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createApi } from './server/api.mjs'

export default defineConfig(({mode}) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  function attach(server) {
    const api = createApi({env})
    server.middlewares.use(api.middleware)
    server.httpServer?.once('close', api.stop)
  }
  return {
    server: { fs: { deny: ['.env', '.env.*', '**/.private/**', '**/*.sqlite*', '**/.git/**', '**/*.{crt,pem}'] } },
    plugins: [vue(), { name: 'wedding-api', configureServer: attach, configurePreviewServer: attach }]
  }
})
