import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [{
    name: 'local-development-connections',
    apply: 'serve',
    transformIndexHtml(html) {
      return html.replace("connect-src 'none'", "connect-src 'self' ws://localhost:*");
    },
  }],
  base: './',
  server: { host: 'localhost', strictPort: true },
  preview: { host: 'localhost', strictPort: true },
  build: { sourcemap: false, target: 'es2022' },
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    restoreMocks: true,
  },
});
