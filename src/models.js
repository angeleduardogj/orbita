// Carga los FBX y los normaliza: mismo tipo de material con la paleta, escala, centro y orientación.
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ASSETS, TEXTURAS_FX, PALETA, PALETAS, MODELOS_ARMA, puestosDe, largoCanon } from './assetmap.js';

// Los FBX apuntan a texturas de la PC del artista. Como el material se reemplaza con la
// paleta, esas rutas se cambian por una imagen vacía para no provocar errores 404.
const PIXEL_VACIO = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const gestor = new THREE.LoadingManager();
gestor.setURLModifier((url) => (/\.fbx$/i.test(url) ? url : PIXEL_VACIO));

const cargador = new FBXLoader(gestor);
const archivos = new Map();   // archivo -> Promise<Group>, cada FBX se descarga una sola vez
const plantillas = new Map(); // id del asset -> Group normalizado
const texturas = new Map();   // nombre -> Promise<Texture>

function cargarArchivo(archivo) {
  if (!archivos.has(archivo)) archivos.set(archivo, cargador.loadAsync(`/models/${archivo}.fbx`).then(hornearEsqueletos));
  return archivos.get(archivo);
}

function cargarTextura(nombre) {
  if (!texturas.has(nombre)) {
    texturas.set(nombre, new THREE.TextureLoader().loadAsync(`/textures/${nombre}.png`).then((t) => {
      t.colorSpace = THREE.SRGBColorSpace; // la paleta está en sRGB
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      return t;
    }));
  }
  return texturas.get(nombre);
}

// Algunos modelos traen esqueleto (SkinnedMesh + Armature). Un clone() de esas
// mallas sigue atado a los huesos del original e ignora su propia posición y rotación.
// Como el juego no usa sus animaciones, se hornean a mallas estáticas en su pose actual.
function hornearEsqueletos(raiz) {
  raiz.updateMatrixWorld(true);
  const pieles = [];
  raiz.traverse((o) => { if (o.isSkinnedMesh) pieles.push(o); });
  const v = new THREE.Vector3();
  for (const piel of pieles) {
    let geo = piel.geometry.clone();
    try {
      piel.skeleton.update();
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        piel.getVertexPosition(i, v);
        pos.setXYZ(i, v.x, v.y, v.z);
      }
    } catch {
      // Algunos personajes apuntan a huesos que no existen: se quedan en su pose de origen
      geo = piel.geometry.clone();
    }
    geo.deleteAttribute('skinIndex');
    geo.deleteAttribute('skinWeight');
    const malla = new THREE.Mesh(geo, piel.material);
    malla.name = piel.name;
    malla.applyMatrix4(piel.matrix);
    piel.parent.add(malla);
    piel.removeFromParent();
  }
  return raiz;
}

async function prepararAsset(id) {
  const def = ASSETS[id];
  const modelo = (await cargarArchivo(def.archivo)).clone();
  for (const pieza of def.piezas ?? []) modelo.add((await cargarArchivo(pieza)).clone());
  const material = new THREE.MeshStandardMaterial({
    map: await cargarTextura(def.textura),
    color: def.tinte ?? 0xffffff,
    roughness: 0.7,
    metalness: 0.1,
  });
  if (def.brillo) material.color.multiplyScalar(def.brillo);
  modelo.traverse((o) => { if (o.isMesh) o.material = material; });

  // Orientación: la nariz queda hacia +Z
  const giro = new THREE.Group();
  giro.add(modelo);
  giro.rotation.set(...def.rot.map(THREE.MathUtils.degToRad));
  giro.updateMatrixWorld(true);

  // Escala y centro: el lado horizontal mayor mide `tam` y el modelo queda en el origen
  const caja = new THREE.Box3().setFromObject(giro, true);
  const medida = caja.getSize(new THREE.Vector3());
  const centro = caja.getCenter(new THREE.Vector3());
  const escala = def.tam / Math.max(medida.x, medida.z);
  giro.scale.setScalar(escala);
  giro.position.copy(centro).multiplyScalar(-escala);

  // Sus cañones de fábrica se quitan después de medir: se montan según el nivel del arma
  if (def.sinCanones) {
    const fabrica = [];
    modelo.traverse((o) => { if (o.isMesh && /_Gun_\d+$/.test(o.name)) fabrica.push(o); });
    for (const o of fabrica) o.removeFromParent();
  }

  const plantilla = new THREE.Group();
  plantilla.add(giro);
  plantilla.userData.radio = (medida.length() * escala) / 2;
  plantillas.set(id, plantilla);
}

// Geometría de cada arma, con el centro de su base en el origen para que gire sobre sí misma
const geoArmas = {};
async function prepararArmas() {
  for (const [id, modelos] of Object.entries(MODELOS_ARMA)) for (const [i, { archivo, nodos }] of modelos.entries()) {
    const raiz = await cargarArchivo(archivo), partes = [];
    raiz.updateMatrixWorld(true);
    raiz.traverse((o) => {
      if (!o.isMesh || !nodos.test(o.name)) return;
      const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
      for (const nombre of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(nombre)) g.deleteAttribute(nombre);
      g.clearGroups();
      partes.push(g);
    });
    const geo = mergeGeometries(partes);
    geo.computeBoundingBox();
    const { min, max } = geo.boundingBox;
    geo.translate(-(min.x + max.x) / 2, -min.y, -(min.z + max.z) / 2);
    (geoArmas[id] ??= [])[i] = { geo, largo: max.z - min.z };
  }
}

// Pone en el modelo las armas de `lista` ({ arma, nivel, puesto, clase }), con el material del casco.
// Solo los láseres siguen a su blanco; los lanzamisiles van fijos.
export function montarArmas(modelo, id, lista) {
  for (const c of modelo.userData.armas ?? []) c.removeFromParent();
  let material = null;
  modelo.traverse((o) => { if (o.isMesh) material ??= o.material; });
  const { tam } = ASSETS[id], largo = largoCanon(tam);
  modelo.userData.armas = lista.map(({ arma, nivel = 1, puesto: [x, y, z, giro = 0] }) => {
    const { geo, largo: propio } = geoArmas[arma][nivel - 1], c = new THREE.Mesh(geo, material);
    c.position.set(x * tam, y * tam, z * tam);
    c.rotation.z = giro;
    c.scale.setScalar(largo * MODELOS_ARMA[arma][nivel - 1].largo / propio);
    modelo.add(c);
    return c;
  });
  modelo.userData.canones = modelo.userData.armas.filter((c, i) => lista[i].clase !== 'misil');
}

// Los enemigos llevan sus primeros `cantidad` cañones básicos
export function montarCanones(modelo, id, cantidad) {
  montarArmas(modelo, id, puestosDe(id).slice(0, cantidad).map((puesto) => ({ arma: 'pulso', puesto, clase: 'laser' })));
}

// Miniaturas para la interfaz: se toman una vez de los modelos y se guardan como imagen
const LADO_FOTO = 176;
const fotos = new Map();
let camaraFotos = null;
function fotografiar(clave, crear, lado = LADO_FOTO) {
  if (fotos.has(clave)) return fotos.get(clave);
  if (!camaraFotos) {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(LADO_FOTO, LADO_FOTO);
    renderer.setClearColor(0x000000, 0);
    const escena = new THREE.Scene(), luz = new THREE.DirectionalLight(0xffffff, 2);
    agregarLuces(escena);
    luz.position.set(-1, 2, 2);
    escena.add(luz);
    camaraFotos = { renderer, escena, camara: new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100) };
  }
  const { renderer, escena, camara } = camaraFotos, objeto = crear();
  escena.add(objeto);
  objeto.updateMatrixWorld(true);
  const caja = new THREE.Box3().setFromObject(objeto, true), centro = caja.getCenter(new THREE.Vector3());
  const radio = caja.getSize(new THREE.Vector3()).length() * 0.54;
  Object.assign(camara, { left: -radio, right: radio, top: radio, bottom: -radio, near: radio * 0.1, far: radio * 20 });
  camara.position.copy(centro).add(new THREE.Vector3(0.75, 1, 0.95).normalize().multiplyScalar(radio * 8));
  camara.lookAt(centro);
  camara.updateProjectionMatrix();
  renderer.setSize(lado, lado);
  renderer.render(escena, camara);
  escena.remove(objeto);
  const url = renderer.domElement.toDataURL('image/png');
  fotos.set(clave, url);
  return url;
}

const materialFoto = () => new THREE.MeshStandardMaterial({ map: paletas.tierra, roughness: 0.6, metalness: 0.1, side: THREE.DoubleSide });

export const fotoNave = (id, empresa, lado) => fotografiar(`${id}:${empresa}:${lado}`, () => {
  const modelo = instanciaUnica(id);
  pintar(modelo, empresa);
  return modelo;
}, lado);
export const fotoAsset = (id) => fotografiar(id, () => instancia(id));
export const fotoArma = (arma, nivel = 1) => fotografiar(`${arma}:${nivel}`, () => new THREE.Mesh(geoArmas[arma][nivel - 1].geo, materialFoto()));
export async function fotoPieza(archivo) {
  const raiz = await cargarArchivo(archivo);
  return fotografiar(archivo, () => {
    const copia = raiz.clone(true), material = materialFoto();
    copia.traverse((o) => { if (o.isMesh) o.material = material; });
    return copia;
  });
}

export const paletas = {}; // empresa -> textura

// Arma una paleta por zonas. Todas las del pack comparten acomodo: comparando tres de referencia
// píxel por píxel se sabe qué es secundario y qué es primario; lo demás queda como en `resto`.
async function mezclarPaleta(paleta) {
  const { resto, secundario = resto, primario = resto, tono } = typeof paleta === 'string' ? { resto: paleta } : paleta;
  const leer = async (nombre) => {
    const { image } = await cargarTextura(nombre);
    const c = document.createElement('canvas');
    c.width = image.width; c.height = image.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(image, 0, 0);
    return { c, g, datos: g.getImageData(0, 0, c.width, c.height) };
  };
  const [a, ref, refSec, refPri, sec, pri] = await Promise.all([resto, PALETA, PALETAS.tierra, 'PolygonSciFiSpace_Texture_01_C', secundario, primario].map(leer));
  const A = a.datos.data, R = ref.datos.data, Z2 = refSec.datos.data, Z1 = refPri.datos.data, S = sec.datos.data, P = pri.datos.data;
  const igual = (x, y, i) => x[i] === y[i] && x[i + 1] === y[i + 1] && x[i + 2] === y[i + 2];
  for (let i = 0; i < A.length; i += 4) {
    if (R[i] < 40 && R[i + 1] > 170 && R[i + 2] > 170) {
      A[i] = R[i]; A[i + 1] = R[i + 1]; A[i + 2] = R[i + 2]; // cristal y energía: azules en todos los bandos
    } else if (!tono) {
      continue;
    } else if (!igual(R, Z2, i)) {
      A[i] = S[i]; A[i + 1] = S[i + 1]; A[i + 2] = S[i + 2];
    } else if (!igual(R, Z1, i)) {
      for (let k = 0; k < 3; k++) A[i + k] = Math.min(255, P[i + k] * tono[k]);
    }
  }
  // Algunos cascos, como el del Titán, usan un azul grisáceo aparte: toma el primario de la
  // paleta, con la misma luz relativa para que los paneles conserven su relieve.
  let i0 = 0;
  while (R[i0] !== 0x4a || R[i0 + 1] !== 0x77 || R[i0 + 2] !== 0x99) i0 += 4;
  const luzBase = 0x5e + 0x73 + 0x84;
  for (let i = 0; i < A.length; i += 4) {
    const azul = R[i + 2] - R[i];
    if (azul < 25 || azul > 60 || R[i] <= 60) continue;
    const luz = (R[i] + R[i + 1] + R[i + 2]) / luzBase;
    for (let k = 0; k < 3; k++) A[i + k] = Math.min(255, A[i0 + k] * luz);
  }
  a.g.putImageData(a.datos, 0, 0);
  const t = new THREE.CanvasTexture(a.c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

// Enciende las luces del modelo con la máscara de emisión del pack: ventanas, focos y tiras
export function encenderLuces(modelo, intensidad = 1.4) {
  modelo.traverse((o) => {
    if (!o.isMesh || !o.material.isMeshStandardMaterial) return;
    o.material.emissive.set(0x9fe8ff);
    o.material.emissiveMap = texturasFx.focos;
    o.material.emissiveIntensity = intensidad;
    o.material.needsUpdate = true;
  });
}

// Le pone a un modelo la paleta de su empresa. Debe tener materiales propios (instanciaUnica).
export function pintar(modelo, empresa) {
  modelo.traverse((o) => { if (o.isMesh && o.material.isMeshStandardMaterial) o.material.map = paletas[empresa]; });
  encenderLuces(modelo);
}

export async function cargarAssets(alAvanzar = () => {}) {
  const ids = Object.keys(ASSETS);
  let listos = 0;
  await Promise.all([
    prepararArmas(),
    ...Object.values(TEXTURAS_FX).map(cargarTextura),
    ...ids.map(async (id) => {
      await prepararAsset(id);
      alAvanzar(++listos / ids.length);
    }),
  ]);
  for (const [clave, nombre] of Object.entries(TEXTURAS_FX)) texturasFx[clave] = await cargarTextura(nombre);
  for (const [empresa, p] of Object.entries(PALETAS)) paletas[empresa] = await mezclarPaleta(p);
}

// Texturas de efectos ya cargadas, por clave de TEXTURAS_FX.
export const texturasFx = {};

// Geometría de un asset con su escala y orientación aplicadas, para usarla con otro material.
export function geometria(id) {
  const plantilla = plantillas.get(id);
  plantilla.updateMatrixWorld(true);
  let resultado;
  plantilla.traverse((o) => {
    if (o.isMesh && !resultado) resultado = o.geometry.clone().applyMatrix4(o.matrixWorld);
  });
  return resultado;
}

// Modelo que no está en assetmap.js, para mostrarlo en el visor: con la paleta, centrado y
// ajustado a un radio de 100. Los modelos del pack van de centímetros a decenas de metros.
// Con varios archivos los arma juntos: las piezas del pack ya traen su lugar en el modelo.
// `nodos` deja solo las mallas con ese nombre. Las demás se vacían en vez de quitarse, porque
// en las torretas el cabezal cuelga del pedestal y quitarlo se lo llevaría también.
export async function modeloSuelto(archivos, nodos) {
  const raiz = new THREE.Group();
  for (const archivo of [].concat(archivos)) raiz.add(hornearEsqueletos(await cargador.loadAsync(`/models/${archivo}.fbx`)));
  if (nodos) raiz.traverse((o) => { if (o.isMesh && !nodos.test(o.name)) o.geometry = new THREE.BufferGeometry(); });
  const material = new THREE.MeshStandardMaterial({ map: await cargarTextura(PALETA), roughness: 0.7, metalness: 0.1, side: THREE.DoubleSide });
  raiz.traverse((o) => { if (o.isMesh) o.material = material; });
  raiz.updateMatrixWorld(true);
  const caja = new THREE.Box3().setFromObject(raiz, true);
  const escala = 200 / (caja.getSize(new THREE.Vector3()).length() || 1);
  const grupo = new THREE.Group();
  grupo.add(raiz);
  raiz.position.sub(caja.getCenter(new THREE.Vector3()));
  grupo.scale.setScalar(escala);
  grupo.userData.radio = 100;
  return grupo;
}

// Copia ligera: comparte geometría y materiales con la plantilla.
export function instancia(id) {
  return plantillas.get(id).clone();
}

// Copia con materiales propios, para poder cambiar su opacidad sin afectar a las demás.
export function instanciaUnica(id) {
  const g = instancia(id);
  g.traverse((o) => {
    if (o.isMesh) o.material = o.material.clone();
  });
  return g;
}

// Luces compartidas por el juego, el hangar y el visor.
export function agregarLuces(escena) {
  escena.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a4256, 1.5));
  const sol = new THREE.DirectionalLight(0xfff4e6, 1.9);
  sol.position.set(-0.5, 1, 0.9);
  escena.add(sol);
}
