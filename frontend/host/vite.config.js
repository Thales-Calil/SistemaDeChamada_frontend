import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente (locais ou injetadas pelo GitHub Actions)
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      federation({
        name: 'host',
        remotes: {
          alunos: env.VITE_MFE_ALUNOS_URL || 'http://localhost:5174/assets/remoteEntry.js',
          chamadas: env.VITE_MFE_CHAMADAS_URL || 'http://localhost:5175/assets/remoteEntry.js',
          registroPresenca: env.VITE_MFE_REGISTRO_URL || 'http://localhost:5176/assets/remoteEntry.js',
        },
        shared: {
          react: {
            singleton: true,
            requiredVersion: '^19.0.0',
          },
          'react-dom': {
            singleton: true,
            requiredVersion: '^19.0.0',
          },
        },
      }),
    ],

    server: {
      port: 5173,
    },

    build: {
      target: 'esnext',
    },
  }
})