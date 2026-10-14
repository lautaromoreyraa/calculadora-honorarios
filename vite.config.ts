import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/test/**/*.test.ts'],
    // Mientras el motor de cálculo no exista, la verificación no tiene que caerse
    // por no encontrar tests.
    passWithNoTests: true,
  },
});
