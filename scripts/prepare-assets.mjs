// Copia a public/ los FBX y texturas del pack, para servirlos en local, y escribe el catálogo
// que usa el visor. public/models/ y public/textures/ están en .gitignore: nunca se publican.
import fs from 'node:fs';
import path from 'node:path';
import { ASSETS, TEXTURAS_FX } from '../src/assetmap.js';

const pack = 'assets/pack';
if (!fs.existsSync(pack)) {
  console.error('\n[assets] No existe assets/pack/. Pon el zip de Synty en assets/ y corre: npm run extraer\n');
  process.exit(1);
}

const recorrer = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? recorrer(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const archivos = recorrer(pack);
const carpeta = (f) => path.relative(pack, path.dirname(f));

// Cualquier cosa que pida assetmap.js debe existir en el pack
const nombres = new Set(archivos.map((f) => path.basename(f)));
const pedidos = [
  ...Object.values(ASSETS).flatMap((a) => [`${a.archivo}.fbx`, `${a.textura}.png`, ...(a.piezas ?? []).map((p) => `${p}.fbx`)]),
  ...Object.values(TEXTURAS_FX).map((n) => `${n}.png`),
];
for (const nombre of pedidos) {
  if (!nombres.has(nombre)) {
    console.error(`[assets] Falta ${nombre} en assets/pack/ (revisa src/assetmap.js)`);
    process.exit(1);
  }
}

function copiar(lista, destino) {
  fs.rmSync(destino, { recursive: true, force: true }); // quita lo que ya no esté en el pack
  fs.mkdirSync(destino, { recursive: true });
  for (const f of lista) fs.copyFileSync(f, path.join(destino, path.basename(f)));
}

const modelos = archivos.filter((f) => f.toLowerCase().endsWith('.fbx'));
const texturas = archivos.filter((f) => f.toLowerCase().endsWith('.png'));
copiar(modelos, 'public/models');
copiar(texturas, 'public/textures');

const entrada = (f) => ({ archivo: path.basename(f, path.extname(f)), carpeta: carpeta(f) });
fs.writeFileSync('public/models/catalogo.json', JSON.stringify({ modelos: modelos.map(entrada), texturas: texturas.map(entrada) }));
console.log(`[assets] ${modelos.length} modelos y ${texturas.length} texturas listos en public/`);
