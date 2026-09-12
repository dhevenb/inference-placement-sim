// SPEC: the triple-slash reference lets `tsc --noEmit` accept the `test` key below.
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: '/inference-placement-sim/',
  plugins: [react()],
  test: { environment: 'node' },
});
