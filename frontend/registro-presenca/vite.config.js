import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
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
})