import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente (locais ou injetadas no build)
  const env = loadEnv(mode, process.cwd(), '')
  const isProd = mode === 'production'

  return {
    plugins: [
      react(),
      federation({
        name: 'host',
        remotes: {
          alunos: isProd
            ? '/remotes/alunos/assets/remoteEntry.js'
            : (env.VITE_MFE_ALUNOS_URL || 'http://localhost:5174/assets/remoteEntry.js'),
          chamadas: isProd
            ? '/remotes/chamadas/assets/remoteEntry.js'
            : (env.VITE_MFE_CHAMADAS_URL || 'http://localhost:5175/assets/remoteEntry.js'),
          registroPresenca: isProd
            ? '/remotes/registro/assets/remoteEntry.js'
            : (env.VITE_MFE_REGISTRO_URL || 'http://localhost:5176/assets/remoteEntry.js'),
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