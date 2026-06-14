import { defineConfig } from 'vite';

// BrowserPod runs Node.js in the browser via WebAssembly and needs
// SharedArrayBuffer, which requires the page to be cross-origin isolated.
// These two headers turn on that isolation for the dev server.
export default defineConfig({
  // BrowserPod's loader uses top-level await. That has to be allowed in three
  // separate esbuild passes: the production build, the dev dependency
  // pre-bundle, and the generic esbuild transform. Setting only build.target
  // leaves the dep-optimizer on its es2020 default, which is what fails.
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
  esbuild: {
    target: 'esnext',
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
});
