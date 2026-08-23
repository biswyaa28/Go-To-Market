import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
