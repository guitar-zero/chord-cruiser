import { defineConfig } from 'vite';
import { tabImportMiddleware } from './server/tabImport.js';
export default defineConfig({
  plugins: [{
    name: 'tab-import',
    configureServer(server) { server.middlewares.use(tabImportMiddleware); },
    configurePreviewServer(server) { server.middlewares.use(tabImportMiddleware); },
  }],
});
