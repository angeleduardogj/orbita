// Visor de assets: todos los modelos y texturas del pack, con un check si el juego los usa
// y en dónde. Las piezas en uso se ven como en el juego, con flecha amarilla hacia la nariz (+Z).
// Los modelos se dibujan al acercarse a la pantalla: son 686 y no conviene cargarlos todos.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ASSETS, TEXTURAS_FX, USO_TEXTURAS, PALETA } from './assetmap.js';
import { cargarAssets, instancia, instanciaUnica, modeloSuelto, agregarLuces } from './models.js';
import { BancoEfectos } from './viewer-efectos.js';
import { detectarToberas } from './toberas.js';

const TAM = 256;
// Naves que el pack trae en piezas: se muestran armadas junto a sus modelos sueltos
const ARMADOS = [
  { archivo: 'SM_Ship_Galactic_Carrier_01 + Armor_01', partes: ['SM_Ship_Galactic_Carrier_01', 'SM_Ship_Galactic_Carrier_Armor_01'], carpeta: 'Models (armado)' },
];
const ESCALA_REAL = 460; // unidades visibles por celda en modo de escala real
const INCLINACION = THREE.MathUtils.degToRad(55);
const $ = (id) => document.getElementById(id);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(TAM, TAM);
renderer.setClearColor(0x000000, 0);

const escena = new THREE.Scene();
agregarLuces(escena);
const camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 20000);
camara.position.set(0, Math.sin(INCLINACION) * 6000, Math.cos(INCLINACION) * 6000);
camara.lookAt(0, 0, 0);
const flecha = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 1, 0xffd34d);
escena.add(flecha);

// En qué parte del juego se usa cada pieza de assetmap.js
function lugar(id, def) {
  if (id.startsWith('nave_')) return `Nave: ${def.nombre}`;
  if (id === 'npc_caza' || id === 'npc_pesado') return `Bot: ${def.nombre}`;
  if (id.startsWith('npc_')) return `Enemigo: ${def.nombre}`;
  if (id.startsWith('portal_')) return 'Portal';
  if (id.startsWith('planeta_')) return `Planeta: ${def.nombre}`;
  if (id.startsWith('dron_')) return def.nombre;
  if (id.startsWith('base_')) return def.nombre;
  if (id.startsWith('escombro_')) return 'Basura espacial';
  if (id.startsWith('asteroide_')) return 'Asteroides';
  if (id.startsWith('fx_')) return `Efecto: ${def.nombre}`;
  if (id === 'botin') return 'Caja de botín';
  if (id === 'mina') return 'Mina de Escarabajo';
  return `Fondo: ${def.nombre}`;
}

// archivo -> lista de lugares, sin repetir
function agregar(mapa, archivo, texto) {
  if (!mapa.has(archivo)) mapa.set(archivo, new Set());
  mapa.get(archivo).add(texto);
}
const usoModelos = new Map(), usoTexturas = new Map(), idDeModelo = new Map();
for (const [id, def] of Object.entries(ASSETS)) {
  // Lo que se arma con piezas tiene su propia tarjeta
  const clave = def.piezas ? ARMADOS.find((a) => a.partes.includes(def.piezas[0])).archivo : def.archivo;
  agregar(usoModelos, clave, lugar(id, def));
  if (!idDeModelo.has(clave)) idDeModelo.set(clave, id); // un archivo puede servir a varias piezas
  for (const pieza of def.piezas ?? []) agregar(usoModelos, pieza, lugar(id, def));
  if (def.textura !== PALETA || !id.startsWith('fx_')) {
    const grupo = id.startsWith('nave_') || id.startsWith('base_') ? 'Naves del jugador y base'
      : id.startsWith('npc_') ? 'Enemigos' : lugar(id, def);
    agregar(usoTexturas, def.textura, grupo);
  }
}
for (const [clave, nombre] of Object.entries(TEXTURAS_FX)) agregar(usoTexturas, nombre, USO_TEXTURAS[clave]);

// Tipo y categoría de un archivo, deducidos de su nombre y su carpeta.
// Completo: se usa tal cual. Parte: pieza para armar otra cosa, como los módulos de edificios.
function clasificar(archivo, carpeta) {
  const n = archivo;
  if (carpeta.startsWith('Textures')) {
    if (carpeta.includes('FX_Textures')) return n.includes('Skybox') ? ['Textura', 'Skybox'] : ['Textura', 'Efectos'];
    if (/Signs?_/.test(n)) return ['Textura', 'Letreros'];
    if (/Mask|Emissive|Dirt/.test(n)) return ['Textura', 'Máscaras'];
    if (/Texture_0/.test(n)) return ['Textura', 'Paletas'];
    return ['Textura', 'Planetas'];
  }
  if (carpeta.includes('Collision')) return ['Colisión', 'Colisión'];
  if (carpeta.includes('FX_Meshes') || n.startsWith('SM_FX')) return ['Efecto', 'Efectos'];
  if (n.startsWith('SM_Hud')) return ['Efecto', 'HUD'];
  if (n.startsWith('SM_Ship_Station')) return ['Completo', 'Estaciones'];
  if (n === 'SM_Ship_Galactic_Carrier_Armor_01') return ['Parte', 'Partes de nave']; // blindaje del Carrier
  if (n.startsWith('SM_Ship')) return ['Completo', 'Naves'];
  if (/^SM_Veh_(Part|POV|WarpGate)/.test(n)) return ['Parte', 'Partes de nave'];
  if (n.startsWith('SM_Veh')) return ['Completo', 'Vehículos'];
  if (n.startsWith('SM_Chr_Attach')) return ['Parte', 'Personajes']; // pelo, gorras, cascos
  if (n.includes('Chr')) return ['Completo', 'Personajes'];
  if (n.startsWith('SM_Wep')) return ['Completo', 'Armas'];
  if (/Astroid|Asteroid/.test(n)) return ['Completo', 'Asteroides'];
  if (/Planet/.test(n)) return ['Completo', 'Planetas'];
  if (/Debris|Rubble/.test(n)) return ['Completo', 'Escombros'];
  if (n.startsWith('SM_Prop')) return ['Completo', 'Props'];
  if (n.startsWith('SM_Bld')) return ['Parte', 'Edificios'];
  if (n.startsWith('SM_Sign')) return ['Parte', 'Letreros'];
  return ['Parte', 'Otros'];
}

function tarjeta(archivo, carpeta, usos, contenido) {
  const [tipo, categoria] = clasificar(archivo, carpeta);
  const fig = document.createElement('figure');
  fig.dataset.tipo = tipo;
  fig.dataset.categoria = categoria;
  fig.classList.toggle('usado', !!usos);
  fig.append(contenido);
  const pie = document.createElement('figcaption');
  const check = document.createElement('span');
  check.className = 'check';
  check.textContent = usos ? '✓ En uso' : '— Sin usar';
  const nombre = document.createElement('code');
  nombre.textContent = archivo;
  const etiqueta = document.createElement('span');
  etiqueta.className = 'etiqueta';
  etiqueta.textContent = `${tipo} · ${categoria}`;
  pie.append(check, etiqueta, nombre);
  if (usos) {
    const donde = document.createElement('small');
    donde.textContent = [...usos].join(' · ');
    pie.append(donde);
  }
  const ruta = document.createElement('small');
  ruta.textContent = carpeta;
  pie.append(ruta);
  fig.append(pie);
  fig.dataset.nombre = archivo.toLowerCase();
  fig.tabIndex = 0;
  fig.addEventListener('click', () => abrirModal(fig));
  fig.addEventListener('keydown', (e) => { if (e.key === 'Enter') abrirModal(fig); });
  return fig;
}

// Dibuja un modelo en el lienzo de su tarjeta
function pintar(celda) {
  const real = $('escala-real').checked && celda.id;
  const m = real ? ESCALA_REAL / 2 : celda.modelo.userData.radio * 1.08;
  Object.assign(camara, { left: -m, right: m, top: m, bottom: -m });
  camara.updateProjectionMatrix();

  flecha.visible = !!celda.id;
  if (celda.id) {
    const tam = ASSETS[celda.id].tam;
    flecha.setLength(tam * 0.72, tam * 0.12, tam * 0.07);
  }
  escena.add(celda.modelo);
  renderer.render(escena, camara);
  escena.remove(celda.modelo);

  celda.g.clearRect(0, 0, TAM, TAM);
  celda.g.drawImage(renderer.domElement, 0, 0, TAM, TAM);
}

// Cola de carga: un modelo a la vez, para no congelar la página
const pendientes = [];
let trabajando = false, dibujados = 0;
async function atender() {
  if (trabajando) return;
  trabajando = true;
  while (pendientes.length) {
    const celda = pendientes.pop(); // lo último que se vio primero
    if (celda.lienzo.closest('figure').hidden) { celda.pedido = false; continue; }
    try {
      celda.modelo = celda.id ? instancia(celda.id) : await modeloSuelto(celda.partes ?? celda.archivo);
      pintar(celda);
      if (!celda.id) {
        // Sin uso en el juego: se libera, ya quedó dibujado en su lienzo
        celda.modelo.traverse((o) => o.isMesh && o.geometry.dispose());
        celda.modelo = null;
      }
      dibujados++;
    } catch (e) {
      console.warn(`No se pudo mostrar ${celda.archivo}: ${e.message}`);
      celda.g.fillStyle = '#93a3bb';
      celda.g.font = '16px system-ui';
      celda.g.fillText('Sin vista previa', 60, TAM / 2);
    }
    await new Promise(requestAnimationFrame);
  }
  trabajando = false;
}

const observador = new IntersectionObserver((entradas) => {
  for (const e of entradas) {
    const celda = e.target.celda;
    if (e.isIntersecting && !celda.pedido) {
      celda.pedido = true;
      pendientes.push(celda);
    }
  }
  atender();
}, { rootMargin: '400px' });

// ---------- Vista ampliada ----------

let visor = null;  // renderer, escena y controles, se crean al abrir por primera vez
let enModal = null; // modelo mostrado
let banco = null;   // efectos del juego para probar sobre las naves
const enJuego = (id) => /^(nave|npc)_/.test(id || ''); // con toberas medidas en assetmap.js
const aceptaEfectos = (fig) => enJuego(fig.celda?.id) || ['Naves', 'Vehículos'].includes(fig.dataset.categoria);
const NOMBRES_EMPUJE = [[0.05, 'Apagado'], [0.5, 'Lento'], [1.15, 'Crucero'], [Infinity, 'Impulso']];

function crearVisor() {
  const renderer = new THREE.WebGLRenderer({ canvas: $('modal-canvas'), antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  agregarLuces(scene);
  const relleno = new THREE.DirectionalLight(0xbcd0ff, 1.2); // para ver también la panza del modelo
  relleno.position.set(0.4, -1, -0.6);
  scene.add(relleno);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100000);
  const controles = new OrbitControls(camera, renderer.domElement);
  controles.enableDamping = true;
  controles.autoRotateSpeed = 1.6;
  controles.addEventListener('start', () => { controles.autoRotate = false; }); // el usuario toma el control
  visor = { renderer, scene, camera, controles };
  addEventListener('resize', ajustarVisor);
  let ultimo = performance.now();
  const cuadro = (ahora = ultimo) => {
    const dt = Math.min(0.1, (ahora - ultimo) / 1000);
    ultimo = ahora;
    if ($('modal').open) {
      controles.update();
      banco?.cuadro(dt);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(cuadro);
  };
  cuadro();
}

function ajustarVisor() {
  const v = $('modal-vista');
  visor.renderer.setSize(v.clientWidth, v.clientHeight, false);
  visor.camera.aspect = v.clientWidth / v.clientHeight;
  visor.camera.updateProjectionMatrix();
}

function limpiarModal() {
  if (!enModal) return;
  banco?.quitar();
  visor.scene.remove(enModal.modelo);
  if (enModal.propio) enModal.modelo.traverse((o) => o.isMesh && o.geometry.dispose());
  enModal = null;
}

async function abrirModal(fig) {
  const celda = fig.celda, titulo = $('modal-titulo');
  titulo.replaceChildren(...fig.querySelector('figcaption').cloneNode(true).childNodes);
  $('modal').showModal();
  $('modal-img').hidden = !!celda;
  $('modal-canvas').hidden = !celda;
  $('modal-ayuda').hidden = !celda;
  $('modal-fx').hidden = !aceptaEfectos(fig);
  $('fx-nota').textContent = '';

  if (!celda) {
    $('modal-img').src = fig.querySelector('img').src;
    return;
  }
  if (!visor) crearVisor();
  ajustarVisor();
  limpiarModal();
  try {
    const medida = enJuego(celda.id);
    const nave = aceptaEfectos(fig);
    let modelo = medida ? instanciaUnica(celda.id) : celda.id ? instancia(celda.id) : await modeloSuelto(celda.partes ?? celda.archivo);
    if (nave && !medida) modelo = envolver(modelo); // los motores van a escala del mundo
    enModal = { modelo, propio: !celda.id };
    visor.scene.add(modelo);
    if (nave) {
      banco ??= new BancoEfectos(visor.scene);
      const def = medida ? ASSETS[celda.id] : defDetectada(modelo);
      banco.poner(modelo, def, celda.id?.startsWith('npc_') ? 'npc' : 'jugador');
      reiniciarPanelFx();
      if (!medida) $('fx-nota').textContent = def.motores.length ? `${def.motores.length} toberas detectadas solas` : 'No se detectaron toberas';
    }
    const r = modelo.userData.radio, y = modelo.position.y;
    visor.camera.position.set(r * 1.6, y + r * 1.5, r * 2.6);
    visor.controles.target.set(0, y, 0);
    visor.controles.minDistance = r * 0.4;
    visor.controles.maxDistance = r * 12;
    visor.controles.autoRotate = true;
  } catch (e) {
    console.warn(`No se pudo mostrar ${celda.archivo}: ${e.message}`);
  }
}

function envolver(modelo) {
  const grupo = new THREE.Group();
  grupo.add(modelo);
  grupo.userData.radio = modelo.userData.radio;
  return grupo;
}

// Las naves sin medir sacan sus toberas de la malla
function defDetectada(modelo) {
  modelo.updateMatrixWorld(true);
  const medida = new THREE.Box3().setFromObject(modelo).getSize(new THREE.Vector3());
  const tam = Math.max(medida.x, medida.z);
  return { tam, motores: detectarToberas(modelo, tam) };
}

function mostrarEmpuje() {
  const e = Number($('fx-empuje').value);
  $('fx-empuje-txt').textContent = NOMBRES_EMPUJE.find(([tope]) => e < tope)[1];
  if (banco) banco.empuje = e;
}

function reiniciarPanelFx() {
  $('fx-empuje').value = banco.empuje;
  mostrarEmpuje();
  for (const b of document.querySelectorAll('[data-continuo]')) b.setAttribute('aria-pressed', 'false');
}

$('fx-empuje').addEventListener('input', mostrarEmpuje);
$('modal-fx').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || !banco?.nave) return;
  if (b.dataset.accion) banco.accionar(b.dataset.accion);
  else b.setAttribute('aria-pressed', banco.alternar(b.dataset.continuo));
});

$('modal-cerrar').addEventListener('click', () => $('modal').close());
$('modal').addEventListener('click', (e) => { if (e.target === $('modal')) $('modal').close(); }); // clic afuera
$('modal').addEventListener('close', limpiarModal);

// ---------- Filtros ----------

let tipoActivo = 'Todos', categoriaActiva = '';

function filtrar() {
  const texto = $('buscar').value.trim().toLowerCase(), soloUso = $('solo-uso').checked;
  let visibles = 0;
  for (const fig of document.querySelectorAll('figure')) {
    fig.hidden = (soloUso && !fig.classList.contains('usado'))
      || (tipoActivo !== 'Todos' && fig.dataset.tipo !== tipoActivo)
      || (categoriaActiva && fig.dataset.categoria !== categoriaActiva)
      || !fig.dataset.nombre.includes(texto);
    if (!fig.hidden) visibles++;
  }
  for (const [titulo, rejilla] of [['titulo-modelos', 'modelos'], ['titulo-texturas', 'texturas']]) {
    $(titulo).hidden = !$(rejilla).querySelector('figure:not([hidden])');
  }
  $('estado').textContent = `${visibles} visibles`;
  // Los que recién aparecen se vuelven a observar, para dibujar los que se saltó la cola
  for (const fig of $('modelos').children) {
    if (!fig.hidden && fig.celda.pedido === false) observador.unobserve(fig), observador.observe(fig);
  }
}

// Botones de tipo con su cantidad, y lista de categorías del tipo elegido
function armarFiltros() {
  const figuras = [...document.querySelectorAll('figure')];
  const boton = (texto, activo, alClic) => {
    const b = document.createElement('button');
    b.textContent = texto;
    b.classList.toggle('activo', activo);
    b.addEventListener('click', () => {
      for (const otro of b.parentElement.children) otro.classList.toggle('activo', otro === b);
      alClic();
      filtrar();
    });
    return b;
  };
  const pintarCategorias = () => {
    const cuenta = new Map();
    for (const f of figuras) {
      if (tipoActivo === 'Todos' || f.dataset.tipo === tipoActivo) cuenta.set(f.dataset.categoria, (cuenta.get(f.dataset.categoria) || 0) + 1);
    }
    categoriaActiva = '';
    $('categorias').replaceChildren(
      boton('Todas', true, () => { categoriaActiva = ''; }),
      ...[...cuenta].sort().map(([c, n]) => boton(`${c} ${n}`, false, () => { categoriaActiva = c; })),
    );
  };
  const tipos = ['Todos', 'Completo', 'Parte', 'Textura', 'Efecto', 'Colisión'];
  for (const tipo of tipos) {
    const n = tipo === 'Todos' ? figuras.length : figuras.filter((f) => f.dataset.tipo === tipo).length;
    $('tipos').append(boton(`${tipo} ${n}`, tipo === tipoActivo, () => {
      tipoActivo = tipo;
      pintarCategorias();
    }));
  }
  pintarCategorias();
}

async function iniciar() {
  const [catalogo] = await Promise.all([fetch('/models/catalogo.json').then((r) => r.json()), cargarAssets()]);
  // Primero lo que está en uso, luego por nombre
  const orden = (uso) => (a, b) => (uso.has(b.archivo) - uso.has(a.archivo)) || a.archivo.localeCompare(b.archivo);
  const celdas = [];

  for (const { archivo, carpeta, partes } of [...catalogo.modelos, ...ARMADOS].sort(orden(usoModelos))) {
    const lienzo = document.createElement('canvas');
    lienzo.width = lienzo.height = TAM;
    const fig = tarjeta(archivo, carpeta, usoModelos.get(archivo), lienzo);
    const celda = { archivo, partes, id: idDeModelo.get(archivo), lienzo, g: lienzo.getContext('2d') };
    fig.celda = celda;
    celdas.push(celda);
    $('modelos').append(fig);
    observador.observe(fig);
  }
  for (const { archivo, carpeta } of catalogo.texturas.sort(orden(usoTexturas))) {
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = archivo;
    img.src = `/textures/${encodeURIComponent(archivo)}.png`;
    $('texturas').append(tarjeta(archivo, carpeta, usoTexturas.get(archivo), img));
  }

  const usados = (lista, uso) => lista.filter((a) => uso.has(a.archivo)).length;
  $('titulo-modelos').textContent = `Modelos: ${catalogo.modelos.length}, en uso ${usados(catalogo.modelos, usoModelos)}`;
  $('titulo-texturas').textContent = `Texturas: ${catalogo.texturas.length}, en uso ${usados(catalogo.texturas, usoTexturas)}`;

  armarFiltros();
  $('buscar').addEventListener('input', filtrar);
  $('solo-uso').addEventListener('change', filtrar);
  $('escala-real').addEventListener('change', () => celdas.forEach((c) => c.modelo && pintar(c)));
  filtrar();
  document.title = 'Órbita · Visor listo';
}

iniciar();
