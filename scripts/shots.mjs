// Abre el juego en Chromium headless y toma capturas del vuelo, el hangar y el visor.
// Uso: con `npm run dev` corriendo, `npm run shots [url-base]`. Guarda en shots/.
import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:5173';
fs.mkdirSync('shots', { recursive: true });

const navegador = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
const errores = [];
pagina.on('pageerror', (e) => errores.push(e.message));
pagina.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });

const espera = (ms) => pagina.waitForTimeout(ms);
const foto = (nombre) => pagina.screenshot({ path: `shots/${nombre}.png` });

// Juego en la base
await pagina.goto(`${base}/?demo`);
await pagina.waitForFunction(() => window.orbita, null, { timeout: 60000 });
await espera(1500);
await foto('01-base');

// Hangar con cada nave
await pagina.keyboard.press('h');
await espera(600);
await foto('02-hangar');
for (const id of ['vigia', 'aguja', 'marea', 'coloso', 'escarabajo', 'fantasma', 'bastion']) {
  await pagina.evaluate((i) => window.orbita.hangar.elegir(i), id);
  await espera(350);
  await foto(`03-hangar-${id}`);
}
await pagina.keyboard.press('Escape');

// Vuelo junto a un enemigo, atacando
await pagina.evaluate(() => {
  const { s } = window.orbita, j = s.jugador;
  const n = s.npcs.find((e) => e.tipo === 'zarpa');
  j.x = j.px = n.x - 220; j.z = j.pz = n.z;
  window.orbita.escena.foco.set(j.x, 0, j.z);
  j.objetivoId = n.id; j.atacando = true;
});
await espera(2500);
await foto('04-vuelo');

await pagina.goto(`${base}/viewer`);
await pagina.waitForFunction(() => document.title.includes('listo'), null, { timeout: 60000 });
await espera(2500);
await pagina.screenshot({ path: 'shots/05-visor.png' });
await pagina.check('#solo-uso');
await espera(2500);
await pagina.screenshot({ path: 'shots/06-visor-en-uso.png' });

console.log(errores.length ? `Errores:\n${errores.join('\n')}` : 'Sin errores en consola');
await navegador.close();
