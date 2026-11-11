import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'

  return {
    // Define o caminho base de assets do MFE registro em produção
    base: isProd ? '/remotes/registro/' : '/',

    plugins: [
      react(),

      federation({
        name: 'registroPresenca',

        filename: 'remoteEntry.js',

        exposes: {
          './RegistroPresenca': './src/components/RegistroPresenca.jsx',
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
      port: 5176,
    },

    preview: {
      port: 5176,
    },

    build: {
      target: 'esnext',
    },
  }
})