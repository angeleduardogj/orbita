import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/jetbrains-mono/800.css';
// Punto de entrada: une simulación, render, HUD y controles.
import { cargarAssets } from './models.js';
import { Escena } from './render.js';
import { VISTAS } from './camara-libre.js';
import { RANGOS, EMPRESAS, EMPRESA_INICIAL, MAPAS } from './data.js';
import { Hud } from './hud.js';
import { Hangar } from './hangar.js';
import {
  DT, crearEstado, tick, fijarNivel, saltarPortal, cambiarEmpresa, ordenMover, npcEnPunto, hayBotinEnPunto, seleccionar, alternarAtaque, usarHabilidad, puedeUsarHangar,
  dispararMisiles,
} from './sim.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const dev = params.has('dev'); // modo desarrollador: lo del demo, todas las naves, créditos infinitos, invencible y cámara libre
const demo = dev || params.has('demo');
const empresa = EMPRESAS[params.get('empresa')] ? params.get('empresa') : EMPRESA_INICIAL;

async function iniciar() {
  try {
    await cargarAssets((p) => { $('carga-txt').textContent = `Cargando modelos… ${Math.round(p * 100)} %`; $('carga-progreso').style.width = `${p * 100}%`; });
  } catch (e) {
    console.error(e);
    $('carga-txt').textContent = 'No se pudieron cargar los modelos. Revisa assets/pack/ y corre npm run assets.';
    return;
  }

  const s = crearEstado({ demo, dev, empresa });
  const escena = new Escena($('juego'), $('fondo'));
  escena.ponerMapa(s.mapaId);
  const hud = new Hud({ alUsar: (slot) => usarHabilidad(s, slot) });
  const hangar = new Hangar(s);
  window.orbita = { s, escena, hangar }; // para depurar desde la consola y para las capturas

  const seguirPuntero = conectarControles(s, escena, hud, hangar);

  $('carga').hidden = true;
  $('hud').hidden = false;
  $('dev').hidden = !dev;
  if (dev) hud.mensaje('Modo desarrollador: créditos infinitos, invencible y cámara libre', 'aviso');
  else if (demo) hud.mensaje('Modo de prueba: nivel 15 y recursos de sobra', 'aviso');

  // Bucle: simulación a paso fijo y render a la velocidad de la pantalla
  let ultimo = performance.now(), acumulado = 0;
  function cuadro(ahora) {
    const dt = Math.min(0.25, (ahora - ultimo) / 1000);
    ultimo = ahora;
    acumulado += dt;
    while (acumulado >= DT) {
      tick(s);
      acumulado -= DT;
    }
    for (const ev of s.eventos) {
      if (ev.t === 'mensaje') hud.mensaje(ev.texto, ev.tipo);
      else if (ev.t === 'danio') {
        hud.numero(ev, escena.aPantalla(ev.x, ev.z));
        if (ev.propio) escena.sacudir(7);
      } else {
        if (ev.t === 'mapa') hud.llegada(MAPAS[ev.id].nombre);
        escena.procesarEvento(ev);
      }
    }
    s.eventos.length = 0;
    if (hangar.abierto && !puedeUsarHangar(s)) hangar.cerrar();

    seguirPuntero();
    escena.sincronizar(s, acumulado / DT, dt);
    hud.actualizar(s);
    hud.etiqueta(s, escena.etiquetaEnPantalla());
    hangar.actualizar(dt);
    if (escena.libre.activa) {
      const { x, y, z } = escena.libre.camara.position;
      $('cam-pos').textContent = `X ${Math.round(x)} · Y ${Math.round(y)} · Z ${Math.round(z)}`;
    }
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
}

function conectarControles(s, escena, hud, hangar) {
  const lienzo = $('juego');
  let arrastrando = false;
  const puntero = { x: 0, y: 0 };

  // Clic o toque: sobre un enemigo lo selecciona; en cualquier otro punto mueve la nave.
  lienzo.addEventListener('pointerdown', (e) => {
    if (escena.libre.activa) { // la cámara libre usa el arrastre para mirar y no da órdenes
      arrastrando = true;
      lienzo.setPointerCapture(e.pointerId);
      return;
    }
    const p = escena.pantallaAMundo(e.clientX, e.clientY);
    if (!p) return;
    const npc = hayBotinEnPunto(s, p.x, p.z) ? null : npcEnPunto(s, p.x, p.z);
    if (npc) return seleccionar(s, npc.id);
    ordenMover(s, p.x, p.z);
    arrastrando = true;
    puntero.x = e.clientX; puntero.y = e.clientY;
    lienzo.setPointerCapture(e.pointerId);
  });
  lienzo.addEventListener('pointermove', (e) => {
    if (!arrastrando) return;
    if (escena.libre.activa) return escena.libre.girar(e.movementX, e.movementY);
    puntero.x = e.clientX; puntero.y = e.clientY;
  });
  lienzo.addEventListener('pointerup', () => { arrastrando = false; });
  lienzo.addEventListener('pointercancel', () => { arrastrando = false; });
  lienzo.addEventListener('lostpointercapture', () => { arrastrando = false; }); // soltó fuera de la ventana
  lienzo.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (escena.libre.activa) escena.libre.cambiarVelocidad(e.deltaY > 0 ? 1 / 1.1 : 1.1);
    else escena.cambiarZoom(e.deltaY > 0 ? 1.1 : 1 / 1.1);
  }, { passive: false });

  // Clic en el minimapa: viajar a ese punto
  $('minimapa').addEventListener('pointerdown', (e) => {
    const r = e.target.getBoundingClientRect();
    const p = hud.aMundo((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    ordenMover(s, p.x, p.z);
  });

  $('btn-atacar').addEventListener('click', () => alternarAtaque(s));
  $('btn-misil').addEventListener('click', (e) => {
    dispararMisiles(s);
    e.currentTarget.blur(); // si conserva el foco, Espacio lo volvería a pulsar en vez de atacar
  });
  $('btn-hangar').addEventListener('click', () => hangar.alternar());

  // Cada clic pasa al siguiente rango y al llegar al último vuelve a empezar
  const rangoActual = () => RANGOS.findLastIndex((r) => r.nivel <= s.jugador.nivel);
  const mostrarRango = () => { $('btn-rango').textContent = `Rango: ${RANGOS[rangoActual()].nombre}`; };
  mostrarRango();
  $('btn-rango').addEventListener('click', (e) => {
    fijarNivel(s, RANGOS[(rangoActual() + 1) % RANGOS.length].nivel);
    mostrarRango();
    e.currentTarget.blur();
  });

  const empresas = Object.keys(EMPRESAS);
  const mostrarEmpresa = () => { $('btn-empresa').textContent = `Empresa: ${EMPRESAS[s.jugador.empresa].nombre}`; };
  mostrarEmpresa();
  $('btn-empresa').addEventListener('click', (e) => {
    cambiarEmpresa(s, empresas[(empresas.indexOf(s.jugador.empresa) + 1) % empresas.length]);
    mostrarEmpresa();
    e.currentTarget.blur();
  });

  $('btn-portal').addEventListener('click', (e) => {
    saltarPortal(s);
    e.currentTarget.blur();
  });

  const alternarCamara = () => {
    const libre = escena.libre;
    if (libre.activa) libre.desactivar();
    else libre.activar(escena.foco);
    arrastrando = false;
    $('btn-camara').classList.toggle('activo', libre.activa);
    $('btn-anclar').classList.remove('activo');
    $('cam-vistas').hidden = true;
    $('cam-ayuda').hidden = !libre.activa;
  };
  const alternarAncla = () => {
    const libre = escena.libre;
    if (!libre.activa) return;
    if (libre.anclada) libre.soltar();
    else libre.anclar(escena.posNave);
    $('btn-anclar').classList.toggle('activo', libre.anclada);
    $('cam-vistas').hidden = !libre.anclada;
  };
  $('cam-vistas').textContent = VISTAS.map((v, i) => `${i + 1} ${v.nombre}`).join(' · ');
  $('btn-camara').addEventListener('click', (e) => {
    alternarCamara();
    e.currentTarget.blur(); // si conserva el foco, Espacio volvería a pulsarlo en vez de atacar
  });
  $('btn-anclar').addEventListener('click', (e) => {
    alternarAncla();
    e.currentTarget.blur();
  });

  const ranuras = { 1: 'impulso', 2: 'reparacion', 3: 'barrera', 4: 'especial' };
  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const vista = VISTAS[e.key - 1];
    if (escena.libre.anclada && vista) escena.libre.fijarVista(vista); // anclada, los números cambian la vista
    else if (ranuras[e.key]) usarHabilidad(s, ranuras[e.key]);
    else if (e.code === 'Space') { e.preventDefault(); alternarAtaque(s); }
    else if (e.key === 'h' || e.key === 'H') { if (puedeUsarHangar(s)) hangar.alternar(); }
    else if (e.key === 'j' || e.key === 'J') saltarPortal(s);
    else if (e.key === 'm' || e.key === 'M') dispararMisiles(s);
    else if (dev && (e.key === 'c' || e.key === 'C')) alternarCamara();
    else if (dev && (e.key === 'f' || e.key === 'F')) alternarAncla();
    else if (e.key === 'Escape') {
      if (hangar.abierto) hangar.cerrar();
      else { s.jugador.objetivoId = null; s.jugador.atacando = false; }
    }
  });

  // Con el clic presionado la nave persigue al mouse. Se revisa en cada cuadro y no solo al
  // moverlo: la cámara sigue a la nave, así que un mouse quieto apunta a un punto que avanza.
  return () => {
    if (!arrastrando || escena.libre.activa) return;
    const p = escena.pantallaAMundo(puntero.x, puntero.y);
    if (p) ordenMover(s, p.x, p.z);
  };
}

iniciar();
