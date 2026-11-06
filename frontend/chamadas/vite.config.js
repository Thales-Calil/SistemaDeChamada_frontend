import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    react(),

    federation({
      name: 'chamadas',

      filename: 'remoteEntry.js',

      remotes: {
        registroPresenca:
          'http://localhost:5176/assets/remoteEntry.js',
      },

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
})