import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/services/**'],
      thresholds: { lines: 70, functions: 70, branches: 70, statements: 70 },
      reporter: ['text', 'html'],
    },
  },
})
