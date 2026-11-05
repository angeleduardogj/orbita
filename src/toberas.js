// Detecta las toberas de una nave sin medir a mano, leyendo su malla y la paleta:
// caras planas del color de energía = núcleos; huecos oscuros hundidos que miran atrás = fuego.
// Es una aproximación para el visor; las naves del juego usan las medidas de assetmap.js.
import * as THREE from 'three';
import { paletas } from './models.js';

const PLANA = 0.97;          // qué tan alineada a un eje debe estar la cara
const AREA_MINIMA = 0.00003; // respecto al tamaño de la nave al cuadrado
const RELLENO_ANILLO = 0.6;  // un núcleo que llena menos de su caja es un marco
const RELLENO_HUECO = 0.68;  // un hueco que llena menos es un panel recortado
const AREA_LATERAL = 0.0003; // las caras laterales deben ser grandes: las chicas son filos de vidrio
const MAX_HUECOS = 40;       // las naves enormes tienen cientos de paneles

// La paleta usa colores distintos para la energía y para el vidrio de las cabinas
const parecido = (r, g, b, hex) => Math.abs(r - (hex >> 16)) + Math.abs(g - ((hex >> 8) & 255)) + Math.abs(b - (hex & 255)) < 24;
const esEnergia = (r, g, b) => parecido(r, g, b, 0x00ffde);
const esCabina = (r, g, b) => parecido(r, g, b, 0x0dd7f0) || parecido(r, g, b, 0x61abcc);
const esOscuro = (r, g, b) => Math.max(r, g, b) < 52;

const lectores = new Map();
function lectorDePaleta(imagen) {
  if (lectores.has(imagen)) return lectores.get(imagen);
  const c = document.createElement('canvas');
  c.width = imagen.width; c.height = imagen.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(imagen, 0, 0);
  const { data } = g.getImageData(0, 0, c.width, c.height);
  const leer = (u, v) => {
    const x = Math.min(c.width - 1, Math.floor((u - Math.floor(u)) * c.width));
    const y = Math.min(c.height - 1, Math.floor((1 - (v - Math.floor(v))) * c.height));
    const i = (y * c.width + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  lectores.set(imagen, leer);
  return leer;
}

// Triángulos del modelo con cierto color, ya en coordenadas del mundo
function triangulos(modelo, pasa) {
  const lista = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3();
  modelo.traverse((o) => {
    if (!o.isMesh || !o.geometry.attributes.uv) return;
    const map = [].concat(o.material)[0].map;
    if (!map?.image) return;
    // Todas las paletas comparten acomodo: se mira siempre la misma para reconocer cada zona
    const leer = lectorDePaleta(paletas.tierra?.image ?? map.image);
    const { position: P, uv: U } = o.geometry.attributes, I = o.geometry.index;
    const total = I ? I.count : P.count;
    for (let i = 0; i < total; i += 3) {
      const [i0, i1, i2] = I ? [I.getX(i), I.getX(i + 1), I.getX(i + 2)] : [i, i + 1, i + 2];
      if (!pasa(...leer((U.getX(i0) + U.getX(i1) + U.getX(i2)) / 3, (U.getY(i0) + U.getY(i1) + U.getY(i2)) / 3))) continue;
      a.fromBufferAttribute(P, i0).applyMatrix4(o.matrixWorld);
      b.fromBufferAttribute(P, i1).applyMatrix4(o.matrixWorld);
      c.fromBufferAttribute(P, i2).applyMatrix4(o.matrixWorld);
      const normal = ab.subVectors(b, a).cross(ac.subVectors(c, a));
      const area = normal.length() / 2;
      if (area > 1e-5) lista.push({ puntos: [a.clone(), b.clone(), c.clone()], normal: normal.clone().normalize(), area });
    }
  });
  return lista;
}

// Une los triángulos que comparten vértices y resume cada grupo
function agrupar(lista, tam) {
  const padre = lista.map((_, i) => i);
  const raiz = (i) => (padre[i] === i ? i : (padre[i] = raiz(padre[i])));
  const vistos = new Map(), celda = tam / 500;
  lista.forEach((t, i) => t.puntos.forEach((p) => {
    const clave = `${Math.round(p.x / celda)},${Math.round(p.y / celda)},${Math.round(p.z / celda)}`;
    if (vistos.has(clave)) padre[raiz(i)] = raiz(vistos.get(clave));
    else vistos.set(clave, i);
  }));
  const grupos = new Map();
  lista.forEach((t, i) => {
    const k = raiz(i);
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(t);
  });
  return [...grupos.values()].map((ts) => {
    const caja = new THREE.Box3(), normal = new THREE.Vector3();
    let area = 0;
    for (const t of ts) {
      t.puntos.forEach((p) => caja.expandByPoint(p));
      normal.addScaledVector(t.normal, t.area);
      area += t.area;
    }
    return { caja, area, normal: normal.normalize(), centro: caja.getCenter(new THREE.Vector3()), medida: caja.getSize(new THREE.Vector3()), ts };
  }).filter((g) => g.area > AREA_MINIMA * tam * tam);
}

function nucleoDe(g, tam) {
  const lado = Math.abs(g.normal.x) > PLANA;
  if (!lado && Math.abs(g.normal.z) <= PLANA) return null; // vidrios de cabina y otras caras inclinadas
  if (lado && g.area < AREA_LATERAL * tam * tam) return null;
  const ancho = lado ? g.medida.z : g.medida.x, alto = g.medida.y;
  const mira = lado ? [Math.sign(g.normal.x), 0, 0] : [0, 0, Math.sign(g.normal.z)];
  const base = { tipo: 'nucleo', x: g.centro.x, y: g.centro.y, z: g.centro.z, ancho, alto, mira, giro: 0 };
  if (g.area / (ancho * alto) >= RELLENO_ANILLO) return base;
  // Un marco rectangular llega a las esquinas de su caja; uno redondo, no
  const u = lado ? 'z' : 'x', margen = 0.08;
  const cuadrado = g.ts.some((t) => t.puntos.some((p) => Math.abs(p[u] - g.centro[u]) > ancho * (0.5 - margen)
    && Math.abs(p.y - g.centro.y) > alto * (0.5 - margen)));
  const grosor = g.area / (2 * (ancho + alto) * (cuadrado ? 1 : Math.PI / 4));
  const boca = grosor * 1.1;
  return { ...base, x: base.x + mira[0] * boca, z: base.z + mira[2] * boca, grosor, forma: cuadrado ? 'cuadrado' : 'redondo' };
}

function fuegoDe(g, modelo, rayo) {
  if (g.normal.z > -PLANA) return null;
  const { x: ancho, y: alto } = g.medida;
  if (g.area / (ancho * alto) < RELLENO_HUECO) return null;
  const zEn = (x, y) => {
    rayo.set(new THREE.Vector3(x, y, -1e5), new THREE.Vector3(0, 0, 1));
    return rayo.intersectObject(modelo, true)[0]?.point.z ?? null;
  };
  const z = g.centro.z, zVisto = zEn(g.centro.x, g.centro.y);
  if (zVisto === null || Math.abs(zVisto - z) > 0.5) return null; // queda tapado por otra pieza
  const m = Math.max(ancho, alto) * 0.15;
  const aro = [[ancho / 2 + m, 0], [-ancho / 2 - m, 0], [0, alto / 2 + m], [0, -alto / 2 - m]]
    .map(([dx, dy]) => zEn(g.centro.x + dx, g.centro.y + dy)).filter((v) => v !== null).sort((p, q) => p - q);
  if (aro.length < 3) return null;
  const hondo = z - aro[aro.length >> 1];
  if (hondo < 0.4) return null; // al ras del casco: es un panel, no un escape
  return { tipo: 'fuego', x: g.centro.x, y: g.centro.y, z, hondo, ancho, alto, giro: 0 };
}

export function detectarToberas(modelo, tam) {
  modelo.updateMatrixWorld(true);
  const rayo = new THREE.Raycaster();
  const energia = agrupar(triangulos(modelo, esEnergia), tam);
  const nucleos = energia.map((g) => nucleoDe(g, tam)).filter(Boolean);
  // Lo oscuro pegado a un núcleo es su carcasa, no otra tobera
  const carcasas = energia.map((g) => g.caja.clone().expandByScalar(Math.max(g.medida.x, g.medida.y)));
  const huecos = agrupar(triangulos(modelo, esOscuro), tam)
    .filter((g) => g.normal.z <= -PLANA && !carcasas.some((c) => c.containsPoint(g.centro)))
    .sort((p, q) => q.area - p.area)
    .slice(0, MAX_HUECOS);
  return [...nucleos, ...huecos.map((g) => fuegoDe(g, modelo, rayo)).filter(Boolean)];
}

// Malla con los vidrios de la cabina, relativa al modelo. Null si no tiene cabina, como los drones.
export function geometriaCabina(modelo) {
  modelo.updateMatrixWorld(true);
  const aModelo = modelo.matrixWorld.clone().invert();
  const posiciones = [];
  for (const t of triangulos(modelo, esCabina)) {
    for (const p of t.puntos) posiciones.push(...p.applyMatrix4(aModelo).toArray());
  }
  if (!posiciones.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  return g;
}
