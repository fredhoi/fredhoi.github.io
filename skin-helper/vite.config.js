import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/skin-helper/', // 子路徑部署
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: true,
    port: 3000,
    https: false, 
  },
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
   
          tensorflow: ['@tensorflow/tfjs'],

          three: ['three', '@tresjs/core', '@tresjs/cientos'],

          vue: ['vue'],
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      '@tensorflow/tfjs',
      '@tensorflow-models/face-landmarks-detection',
      'three',
      '@tresjs/core',
      '@tresjs/cientos',
    ],
  },
})
