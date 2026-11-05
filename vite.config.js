import { defineConfig } from 'vite';

// Vite solo se usa para resolver los imports de three y servir las páginas en local: landing, juego y visor.
// No hay paso de build a propósito: empaquetar copiaría los FBX crudos a una carpeta publicable.
// Con ORBITA_CLAVE se puede abrir por un túnel: sin la clave no se sirve nada, modelos incluidos.
const clave = process.env.ORBITA_CLAVE;

export default defineConfig({
  server: clave ? { allowedHosts: ['.trycloudflare.com'] } : {},
  plugins: [{
    name: 'visor',
    // /viewer y /juego sin diagonal final deben abrir su página, no la landing
    configureServer(server) {
      if (clave) {
        server.middlewares.use((req, res, next) => {
          const conClave = new URL(req.url, 'http://x').searchParams.get('clave') === clave;
          if (conClave) res.setHeader('Set-Cookie', `orbita=${clave}; Path=/; HttpOnly; Secure; SameSite=Lax`);
          if (conClave || req.headers.cookie?.includes(`orbita=${clave}`)) return next();
          res.writeHead(403);
          res.end('Acceso restringido');
        });
      }
      server.middlewares.use((req, res, next) => {
        const pagina = req.url.split('?')[0];
        if (pagina !== '/viewer' && pagina !== '/juego') return next();
        res.writeHead(302, { Location: req.url.replace(pagina, `${pagina}/`) });
        res.end();
      });
    },
  }],
});
