import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    react(),

    federation({
      name: 'alunos',

      filename: 'remoteEntry.js',

      exposes: {
        './Alunos': './src/components/Alunos.jsx',
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
    port: 5174,
  },

    preview: {
    port: 5174,
  },

  build: {
    target: 'esnext',
  },
})