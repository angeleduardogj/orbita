import { defineConfig } from 'vite';

// Vite solo se usa para resolver los imports de three y servir las dos páginas en local.
// No hay paso de build a propósito: empaquetar copiaría los FBX crudos a una carpeta publicable.
export default defineConfig({
  plugins: [{
    name: 'visor',
    // /viewer sin diagonal final debe abrir el visor, no la página del juego
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url !== '/viewer') return next();
        res.writeHead(302, { Location: '/viewer/' });
        res.end();
      });
    },
  }],
});
