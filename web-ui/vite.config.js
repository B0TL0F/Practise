import { defineConfig } from 'vite';

// With Docker Compose running, the local edge proxy makes all APIs reachable.
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8088'
    }
  }
});
