import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'

  return {
    // Define o caminho base de assets do MFE chamadas em produção
    base: isProd ? '/remotes/chamadas/' : '/',

    plugins: [
      react(),

      federation({
        name: 'chamadas',

        filename: 'remoteEntry.js',

        exposes: {
          './Chamadas': './src/components/Chamadas.jsx',
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
      port: 5175,
    },

    preview: {
      port: 5175,
    },

    build: {
      target: 'esnext',
    },
  }
})