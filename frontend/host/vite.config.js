import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    react(),

    federation({
      name: 'host',

      remotes: {
        alunos: 'http://localhost:5174/assets/remoteEntry.js',
        chamadas: 'http://localhost:5175/assets/remoteEntry.js',
        registroPresenca: 'http://localhost:5176/assets/remoteEntry.js',
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
})