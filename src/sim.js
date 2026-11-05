// Simulación del juego: lógica pura a tick fijo (20 Hz), sin nada de render ni DOM.
// El render lee el estado `s` y consume la lista s.eventos para los efectos visuales.
import { MUNDO, COMBATE, MUERTE, NIVELES, INICIO, INICIO_DEMO, HABILIDADES, NAVES, NPCS, DRONES, EMPRESAS, EMPRESA_INICIAL, MAPAS, POBLACION, RADIO_PORTAL } from './data.js';
import { ASSETS } from './assetmap.js';

export const DT = 1 / MUNDO.tickHz;
const LIMITE = MUNDO.tamano / 2;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const azar = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const difAngulo = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export const naveDe = (id) => NAVES.find((n) => n.id === id);
// La zona segura depende del mapa: en la base de otra empresa no hay
let radioSeguro = MUNDO.radioZonaSegura;
export const hayZonaSegura = () => radioSeguro > 0;
let portales = [];
export const enBase = (e) => Math.hypot(e.x, e.z) < radioSeguro;
// Los portales también protegen, hasta en mapas ajenos, pero ahí no hay hangar ni reparación
export const enZonaSegura = (e) => enBase(e) || portales.some((p) => dist(p, e) < RADIO_PORTAL);
export const puedeUsarHangar = (s) => !s.jugador.muerto && enBase(s.jugador);

// ---------- Creación ----------

export function crearEstado({ demo = false, dev = false, empresa = EMPRESA_INICIAL } = {}) {
  const ini = demo ? INICIO_DEMO : INICIO;
  const jugador = {
    id: 0, x: MUNDO.aparicion.x, z: MUNDO.aparicion.z, px: MUNDO.aparicion.x, pz: MUNDO.aparicion.z,
    h: Math.PI, ph: Math.PI, rumbo: Math.PI, vel: 0, giroVel: 0, dest: null,
    naveId: ini.nave, naves: dev ? NAVES.map((n) => n.id) : [ini.nave],
    nivel: ini.nivel, xp: NIVELES.xpParaNivel(ini.nivel), creditos: dev ? Infinity : ini.creditos, plasmita: ini.plasmita,
    casco: 0, escudo: 0, sinDanio: 99, cdDisparo: 0,
    objetivoId: null, atacando: false,
    efectos: {},   // nombre -> segundos restantes
    recargas: { impulso: 0, reparacion: 0, barrera: 0, especial: 0 },
    muerto: false, esperaReaparicion: 0,
    invencible: dev, empresa,
  };
  const s = {
    tiempo: 0, siguienteId: 1, jugador, mapaId: empresa,
    npcs: [], drones: [], proyectiles: [], botin: [], minas: [], zonasCura: [], reapariciones: [], eventos: [],
  };
  const st = statsJugador(jugador);
  jugador.casco = st.casco;
  jugador.escudo = st.escudo;
  crearDrones(s, jugador, ini.drones);
  poblarMapa(s, empresa);
  return s;
}

// Deja el mapa recién llegado con sus enemigos y bots. Solo se simula el mapa donde está el jugador.
function poblarMapa(s, id) {
  const mapa = MAPAS[id], j = s.jugador;
  s.mapaId = id;
  portales = mapa.portales;
  radioSeguro = !mapa.empresa || mapa.empresa === j.empresa ? MUNDO.radioZonaSegura : 0;
  s.npcs = [];
  s.drones = s.drones.filter((d) => d.dueno === j && !d.temporal);
  s.proyectiles = []; s.botin = []; s.minas = []; s.zonasCura = []; s.reapariciones = [];
  const poner = (lista, empresa) => {
    for (const [tipo, cantidad] of Object.entries(lista)) {
      for (let i = 0; i < cantidad; i++) crearNpc(s, tipo, empresa);
    }
  };
  if (mapa.empresa) {
    for (const tipo of Object.keys(NPCS)) {
      for (let i = 0; i < NPCS[tipo].cantidad; i++) crearNpc(s, tipo);
    }
  }
  for (const empresa of Object.keys(EMPRESAS)) {
    poner(!mapa.empresa ? POBLACION.centro : empresa === mapa.empresa ? POBLACION.propia : POBLACION.visita, empresa);
  }
}

// Lleva al jugador a otro mapa, junto al portal que une ambos; sin portal, a su punto de salida
function entrarMapa(s, id) {
  const j = s.jugador, regreso = MAPAS[id].portales.find((p) => p.a === s.mapaId);
  poblarMapa(s, id);
  const r = regreso ? Math.hypot(regreso.x, regreso.z) : 1;
  j.x = j.px = regreso ? regreso.x - (regreso.x / r) * RADIO_PORTAL * 0.7 : MUNDO.aparicion.x;
  j.z = j.pz = regreso ? regreso.z - (regreso.z / r) * RADIO_PORTAL * 0.7 : MUNDO.aparicion.z;
  j.dest = null; j.vel = 0; j.objetivoId = null; j.atacando = false;
  s.eventos.push({ t: 'mapa', id }, { t: 'pulso', x: j.x, z: j.z });
  mensaje(s, `Llegaste a ${MAPAS[id].nombre}`, 'aviso');
}

export const portalCercano = (s) => (s.jugador.muerto ? null
  : MAPAS[s.mapaId].portales.find((p) => dist(p, s.jugador) < RADIO_PORTAL) ?? null);

export function saltarPortal(s) {
  const p = portalCercano(s);
  if (p) entrarMapa(s, p.a);
}

// Modo desarrollador: cambia de empresa y lleva al jugador a su mapa
export function cambiarEmpresa(s, empresa) {
  s.jugador.empresa = empresa;
  s.mapaId = '';
  entrarMapa(s, empresa);
}

export const esHostil = (s, n) => (n.empresa ?? n.dueno.empresa) !== s.jugador.empresa;

function crearNpc(s, tipo, empresa = 'sirko') {
  const d = NPCS[tipo];
  // Punto al azar en su anillo, dentro de los límites del mundo
  let x, z;
  do {
    const a = azar(0, Math.PI * 2), r = azar(d.anillo[0], d.anillo[1]);
    x = Math.cos(a) * r; z = Math.sin(a) * r;
  } while (Math.abs(x) > LIMITE - 80 || Math.abs(z) > LIMITE - 80);
  const rumbo = azar(0, 6.28);
  const n = {
    id: s.siguienteId++, tipo, empresa, blanco: null, buscar: azar(0, 1), x, z, px: x, pz: z, h: rumbo, ph: rumbo, rumbo, vel: 0, giroVel: 0,
    casa: { x, z }, dest: null, espera: azar(0, 3), estado: 'patrulla', provocado: false,
    casco: d.casco, cdDisparo: 0,
  };
  s.npcs.push(n);
  crearDrones(s, n, d.drones ?? []);
}

// Reparte los drones alrededor de su dueño
function crearDrones(s, dueno, tipos) {
  tipos.slice(0, DRONES.maximo).forEach((tipo, i) => crearDron(s, dueno, tipo, (i / tipos.length) * Math.PI * 2));
}

function crearDron(s, dueno, tipo, angulo, temporal = false) {
  const d = {
    id: s.siguienteId++, tipo, dueno, bando: dueno === s.jugador ? 'jugador' : 'npc', temporal,
    puesto: s.drones.filter((d) => d.dueno === dueno && !d.temporal).length, angulo,
    casco: NPCS[tipo]?.casco, x: dueno.x, z: dueno.z, px: dueno.x, pz: dueno.z, h: 0, ph: 0, cd: 0, conectado: null,
  };
  s.drones.push(d);
  return d;
}

// ---------- Stats ----------

// Stats reales del jugador con su nave, su nivel y los efectos activos.
export function statsJugador(j) {
  const n = naveDe(j.naveId), e = n.especial, f = 1 + NIVELES.bonusPorNivel * (j.nivel - 1);
  const st = {
    casco: n.casco * f, escudo: n.escudo * f, danio: n.danio * f, cadencia: n.cadencia,
    alcance: n.alcance, velocidad: n.velocidad, giro: n.giro, aceleracion: n.aceleracion,
  };
  if (j.efectos.impulso) st.velocidad *= HABILIDADES.impulso.velocidad;
  if (j.efectos.rafaga) st.cadencia /= e.cadencia;
  if (j.efectos.blindaje) st.casco *= e.casco;
  if (j.efectos.asedio) { st.danio *= e.danio; st.alcance *= e.alcance; st.velocidad = 0; }
  return st;
}

// ---------- Órdenes del jugador ----------

export function ordenMover(s, x, z) {
  const j = s.jugador;
  if (j.muerto || j.efectos.asedio) return;
  j.dest = { x: clamp(x, -LIMITE, LIMITE), z: clamp(z, -LIMITE, LIMITE) };
}

// NPC más cercano a un punto, con tolerancia para que sea fácil atinarle (también con el dedo).
export function npcEnPunto(s, x, z, tolerancia = 70) {
  let mejor = null, mejorD = tolerancia;
  for (const n of atacables(s)) {
    const d = Math.hypot(n.x - x, n.z - z);
    if (d < mejorD && esHostil(s, n)) { mejor = n; mejorD = d; }
  }
  return mejor;
}

// Caja de botín bajo un punto: si hay una, el clic debe ir por ella aunque haya un enemigo cerca
export function hayBotinEnPunto(s, x, z, tolerancia = 45) {
  return s.botin.some((b) => Math.hypot(b.x - x, b.z - z) < tolerancia);
}

export function seleccionar(s, id) {
  const j = s.jugador;
  if (j.objetivoId === id) j.atacando = true; // segundo clic al mismo objetivo: atacar
  else { j.objetivoId = id; j.atacando = false; }
}

export function alternarAtaque(s) {
  const j = s.jugador;
  if (j.objetivoId == null) return mensaje(s, 'Selecciona un enemigo primero', 'aviso');
  j.atacando = !j.atacando;
}

const atacables = (s) => [...s.npcs, ...s.drones.filter((d) => d.tipo === 'sanguijuela')];
export const objetivoActual = (s) => atacables(s).find((n) => n.id === s.jugador.objetivoId) || null;

const mensaje = (s, texto, tipo = 'info') => s.eventos.push({ t: 'mensaje', texto, tipo });

// slot: 'impulso' | 'reparacion' | 'barrera' | 'especial'
export function usarHabilidad(s, slot) {
  const j = s.jugador;
  if (j.muerto || j.recargas[slot] > 0) return;
  const esp = naveDe(j.naveId).especial;
  let recarga;
  if (slot === 'especial') {
    if (!usarEspecial(s, esp)) return;
    recarga = esp.recarga;
  } else {
    const h = HABILIDADES[slot];
    j.efectos[slot] = h.duracion;
    recarga = h.recarga;
    // Reparar suelta un dron que da vueltas por fuera de la nave y su escolta mientras dura
    if (slot === 'reparacion') crearDron(s, j, 'reparacion', azar(0, 6.28), true);
  }
  j.recargas[slot] = recarga;
}

// Devuelve false si no se pudo usar, para no gastar la recarga.
function usarEspecial(s, esp) {
  const j = s.jugador, st = statsJugador(j);
  switch (esp.id) {
    case 'rafaga': case 'asedio': case 'invisible':
      j.efectos[esp.id] = esp.duracion;
      if (esp.id === 'asedio') j.dest = null;
      if (esp.id === 'invisible') {
        for (const n of s.npcs) { n.provocado = false; }
      }
      return true;
    case 'blindaje': {
      j.efectos.blindaje = esp.duracion;
      j.casco += st.casco * (esp.casco - 1); // el casco extra se recibe de inmediato
      return true;
    }
    case 'pulso':
      j.escudo = Math.min(st.escudo, j.escudo + st.escudo * esp.curaEscudo);
      s.eventos.push({ t: 'pulso', x: j.x, z: j.z });
      return true;
    case 'curaArea':
      s.zonasCura.push({ id: s.siguienteId++, x: j.x, z: j.z, radio: esp.radio, vida: esp.duracion, curaPorSegundo: esp.curaPorSegundo });
      return true;
    case 'perforante': {
      if (enZonaSegura(j)) { mensaje(s, 'No se puede disparar en la zona segura', 'aviso'); return false; }
      const obj = objetivoActual(s);
      const ang = obj ? Math.atan2(obj.x - j.x, obj.z - j.z) : j.h;
      j.h = j.ph = ang;
      const dx = Math.sin(ang), dz = Math.cos(ang);
      for (const n of [...s.npcs]) {
        const rx = n.x - j.x, rz = n.z - j.z, a = rx * dx + rz * dz;
        if (a > 0 && a < esp.alcance && Math.abs(rx * dz - rz * dx) < esp.ancho && !enZonaSegura(n) && esHostil(s, n)) {
          s.eventos.push({ t: 'impacto', x: n.x, z: n.z });
          danarNpc(s, n, st.danio * esp.danio);
        }
      }
      s.eventos.push({ t: 'rayo', x1: j.x, z1: j.z, x2: j.x + dx * esp.alcance, z2: j.z + dz * esp.alcance });
      romperSigilo(j);
      return true;
    }
    case 'mina':
      if (enZonaSegura(j)) { mensaje(s, 'No se pueden soltar minas en la zona segura', 'aviso'); return false; }
      s.minas.push({ id: s.siguienteId++, x: j.x, z: j.z, armado: esp.armado, vida: esp.vida, esp, danio: st.danio * esp.danio });
      return true;
  }
  return false;
}

const romperSigilo = (j) => { delete j.efectos.invisible; };

// ---------- Hangar ----------

export function faltaParaComprar(j, nave) {
  if (j.nivel < nave.nivel) return `Requiere nivel ${nave.nivel}`;
  if (j.creditos < nave.creditos) return 'Créditos insuficientes';
  if (j.plasmita < nave.plasmita) return 'Plasmita insuficiente';
  return null;
}

export function comprarNave(s, id) {
  const j = s.jugador, n = naveDe(id);
  if (j.naves.includes(id) || faltaParaComprar(j, n) || !puedeUsarHangar(s)) return false;
  j.creditos -= n.creditos;
  j.plasmita -= n.plasmita;
  j.naves.push(id);
  mensaje(s, `Compraste la nave ${n.nombre}`, 'bueno');
  return true;
}

export function equiparNave(s, id) {
  const j = s.jugador;
  if (!j.naves.includes(id) || !puedeUsarHangar(s)) return false;
  j.naveId = id;
  j.efectos = {};
  j.recargas.especial = 0;
  const st = statsJugador(j);
  j.casco = st.casco;
  j.escudo = st.escudo;
  mensaje(s, `Nave equipada: ${naveDe(id).nombre}`, 'bueno');
  return true;
}

// Modo desarrollador: salta a un nivel y deja la nave al máximo con sus nuevos stats
export function fijarNivel(s, nivel) {
  const j = s.jugador;
  j.nivel = nivel;
  j.xp = NIVELES.xpParaNivel(nivel);
  const st = statsJugador(j);
  j.casco = st.casco;
  j.escudo = st.escudo;
}

// ---------- Tick ----------

// Cada nave tiene dos ángulos: `rumbo` es hacia dónde se desplaza y `h` hacia dónde apunta la
// nariz. Normalmente coinciden; al disparar, la nariz sigue al objetivo y la nave puede ir de lado.

// Mueve una entidad hacia un punto con giro y aceleración suaves, frenando al llegar.
// `c` = { velocidad, giro, aceleracion }. Devuelve true al llegar.
function pilotar(e, tx, tz, c) {
  const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz);
  const dif = difAngulo(Math.atan2(dx, dz), e.rumbo);
  girarSuave(e, dif, c.giro);
  // Más lento si no apunta al destino (evita orbitarlo) y frenado progresivo al llegar
  const alineacion = Math.max(0, Math.cos(dif));
  const objetivo = Math.min(c.velocidad * (0.15 + 0.85 * alineacion * alineacion), Math.sqrt(2 * c.aceleracion * d));
  acelerar(e, objetivo, c.aceleracion);
  avanzar(e);
  return d < 10;
}

function girarSuave(e, dif, giro) {
  const deseado = clamp(dif * 6, -giro, giro);
  e.giroVel += (deseado - e.giroVel) * Math.min(1, 10 * DT);
  e.rumbo += e.giroVel * DT;
}

// Gira la nariz hacia un ángulo, más rápido que el rumbo para que la puntería no se quede atrás
function apuntar(e, angulo, giro) {
  const paso = giro * COMBATE.giroPunteria * DT;
  e.h += clamp(difAngulo(angulo, e.h) * 10 * DT, -paso, paso);
}

function acelerar(e, objetivo, aceleracion) {
  const paso = aceleracion * DT;
  e.vel += clamp(objetivo - e.vel, -paso, paso);
}

function avanzar(e) {
  e.x = clamp(e.x + Math.sin(e.rumbo) * e.vel * DT, -LIMITE, LIMITE);
  e.z = clamp(e.z + Math.cos(e.rumbo) * e.vel * DT, -LIMITE, LIMITE);
}

export function tick(s) {
  s.tiempo += DT;
  tickJugador(s);
  for (const n of [...s.npcs]) tickNpc(s, n);
  tickDrones(s);
  tickProyectiles(s);
  tickBotin(s);
  tickMinas(s);
  tickZonasCura(s);
  tickReapariciones(s);
}

function tickJugador(s) {
  const j = s.jugador;
  j.px = j.x; j.pz = j.z; j.ph = j.h;

  if (j.muerto) {
    j.esperaReaparicion -= DT;
    if (j.esperaReaparicion <= 0) reaparecer(s);
    return;
  }

  const teniaBlindaje = !!j.efectos.blindaje;
  for (const k of Object.keys(j.efectos)) {
    j.efectos[k] -= DT;
    if (j.efectos[k] <= 0) delete j.efectos[k];
  }
  for (const k of Object.keys(j.recargas)) j.recargas[k] = Math.max(0, j.recargas[k] - DT);

  const st = statsJugador(j);
  if (teniaBlindaje && !j.efectos.blindaje) j.casco = Math.min(j.casco, st.casco);

  // Curaciones y regeneración
  if (j.efectos.reparacion) {
    const h = HABILIDADES.reparacion;
    j.casco = Math.min(st.casco, j.casco + st.casco * (h.curaTotal / h.duracion) * DT);
  }
  j.sinDanio += DT;
  if (j.sinDanio > COMBATE.regenEscudoEspera) {
    j.escudo = Math.min(st.escudo, j.escudo + st.escudo * COMBATE.regenEscudo * DT);
  }
  if (enBase(j)) {
    j.casco = Math.min(st.casco, j.casco + st.casco * COMBATE.regenCascoBase * DT);
    j.escudo = Math.min(st.escudo, j.escudo + st.escudo * COMBATE.regenCascoBase * DT);
  }

  // Movimiento
  if (j.efectos.asedio) {
    acelerar(j, 0, st.aceleracion * 3);
    avanzar(j);
  } else if (j.dest) {
    if (pilotar(j, j.dest.x, j.dest.z, st)) j.dest = null;
  } else {
    acelerar(j, 0, st.aceleracion);
    avanzar(j);
  }

  // Disparo automático: mientras puede dispararle, la nariz apunta al objetivo.
  // Fuera de alcance vuelve al rumbo, para no volar de espaldas; al regresar sigue atacando.
  const obj = objetivoActual(s);
  if (!obj) { j.objetivoId = null; j.atacando = false; }
  j.cdDisparo -= DT;
  const aTiro = obj && j.atacando && dist(j, obj) <= st.alcance && !enZonaSegura(j) && !enZonaSegura(obj);
  apuntar(j, aTiro ? Math.atan2(obj.x - j.x, obj.z - j.z) : j.rumbo, st.giro);
  if (aTiro && j.cdDisparo <= 0) {
    j.cdDisparo = st.cadencia;
    disparar(s, j, obj, st.danio, 'jugador');
    romperSigilo(j);
  }
}

function disparar(s, de, a, danio, bando) {
  const empresa = de.empresa ?? de.dueno.empresa; // el láser sale del color de su bando
  s.eventos.push({ t: 'disparo', id: de.id, x: de.x, z: de.z, ang: Math.atan2(a.x - de.x, a.z - de.z), empresa });
  s.proyectiles.push({ x: de.x, z: de.z, px: de.x, pz: de.z, objetivo: a, danio, bando, empresa });
}

function tickProyectiles(s) {
  const paso = COMBATE.velocidadLaser * DT;
  s.proyectiles = s.proyectiles.filter((p) => {
    p.px = p.x; p.pz = p.z;
    const d = dist(p, p.objetivo);
    if (d > paso) {
      p.x += (p.objetivo.x - p.x) / d * paso;
      p.z += (p.objetivo.z - p.z) / d * paso;
      return true;
    }
    // Impacto. Dentro de la zona segura nadie recibe daño.
    const blanco = p.objetivo;
    const vivo = blanco === s.jugador ? !blanco.muerto : s.npcs.includes(blanco) || s.drones.includes(blanco);
    if (vivo && !enZonaSegura(blanco)) {
      s.eventos.push({ t: 'impacto', x: blanco.x, z: blanco.z, escudo: p.bando === 'npc' && blanco.escudo > 0 });
      if (blanco === s.jugador) danarJugador(s, p.danio);
      else danarNpc(s, blanco, p.danio, p.bando === 'jugador');
    }
    return false;
  });
}

function danarNpc(s, n, danio, delJugador = true) {
  n.casco -= danio;
  if (n.tipo === 'sanguijuela') {
    if (n.casco <= 0) matarSanguijuela(s, n);
    return;
  }
  if (delJugador) n.provocado = true;
  if (n.casco <= 0) matarNpc(s, n, delJugador);
}

function matarSanguijuela(s, d) {
  const c = NPCS.sanguijuela;
  s.drones.splice(s.drones.indexOf(d), 1);
  s.eventos.push({ t: 'explosion', x: d.x, z: d.z, tam: 0.8 });
  s.botin.push({ id: s.siguienteId++, x: d.x, z: d.z, creditos: c.creditos, plasmita: c.plasmita, vida: COMBATE.vidaBotin });
  ganarXp(s, c.xp);
}

function matarNpc(s, n, delJugador) {
  const d = NPCS[n.tipo], j = s.jugador;
  s.npcs.splice(s.npcs.indexOf(n), 1);
  s.drones = s.drones.filter((d) => d.dueno !== n); // sin nodo que los controle, caen con él
  s.eventos.push({ t: 'explosion', x: n.x, z: n.z, tam: n.tipo === 'behemot' ? 2.4 : n.tipo === 'zarpa' ? 1.5 : 1 });
  s.reapariciones.push({ tipo: n.tipo, empresa: n.empresa, espera: d.reaparicion });
  if (!delJugador) return; // lo que matan los bots no da botín ni experiencia
  const plasmita = d.plasmita + (Math.random() < d.probPlasmita ? d.plasmitaExtra : 0);
  s.botin.push({ id: s.siguienteId++, x: n.x, z: n.z, creditos: d.creditos, plasmita, vida: COMBATE.vidaBotin });
  ganarXp(s, d.xp);
}

function ganarXp(s, cantidad) {
  const j = s.jugador;
  j.xp += cantidad;
  while (j.nivel < NIVELES.maximo && j.xp >= NIVELES.xpParaNivel(j.nivel + 1)) {
    j.nivel++;
    const st = statsJugador(j);
    j.casco = st.casco;
    j.escudo = st.escudo;
    mensaje(s, `¡Subiste al nivel ${j.nivel}!`, 'bueno');
  }
}

function danarJugador(s, danio) {
  const j = s.jugador;
  if (j.muerto || j.invencible) return;
  if (j.efectos.barrera) danio *= 1 - HABILIDADES.barrera.reduccionDanio;
  j.sinDanio = 0;
  const alEscudo = Math.min(j.escudo, danio);
  j.escudo -= alEscudo;
  j.casco -= danio - alEscudo;
  if (j.casco <= 0) morir(s);
}

function morir(s) {
  const j = s.jugador;
  const perdidos = Math.floor(j.creditos * MUERTE.penalizacionCreditos);
  j.creditos -= perdidos;
  j.casco = 0;
  j.muerto = true;
  j.esperaReaparicion = MUERTE.esperaReaparicion;
  j.vel = 0; j.dest = null; j.objetivoId = null; j.atacando = false; j.efectos = {};
  s.eventos.push({ t: 'explosion', x: j.x, z: j.z, tam: 1.8 });
  mensaje(s, `Nave destruida. Perdiste ${perdidos.toLocaleString('es-MX')} créditos`, 'malo');
}

function reaparecer(s) {
  const j = s.jugador, st = statsJugador(j);
  if (s.mapaId !== j.empresa) { s.mapaId = ''; poblarMapa(s, j.empresa); s.eventos.push({ t: 'mapa', id: j.empresa }); }
  j.x = j.px = MUNDO.aparicion.x;
  j.z = j.pz = MUNDO.aparicion.z;
  j.casco = st.casco; j.escudo = st.escudo; j.muerto = false; j.sinDanio = 99;
  for (const k of Object.keys(j.recargas)) j.recargas[k] = 0;
  s.eventos.push({ t: 'reaparecio', x: j.x, z: j.z });
}

function tickNpc(s, n) {
  const d = NPCS[n.tipo], j = s.jugador;
  n.px = n.x; n.pz = n.z; n.ph = n.h;
  n.cdDisparo -= DT;

  // Busca pelea de vez en cuando: al jugador si es rival, o al bot rival más cercano
  const visible = !j.muerto && !j.efectos.invisible && !enZonaSegura(j) && esHostil(s, n);
  if (n.blanco && (n.blanco === j ? !visible : !s.npcs.includes(n.blanco))) n.blanco = null;
  n.buscar -= DT;
  if (n.buscar <= 0) {
    n.buscar = 1;
    n.blanco = blancoDe(s, n, visible) ?? n.blanco;
  }
  const b = n.blanco, distancia = b ? dist(n, b) : Infinity;

  if (n.estado === 'patrulla') {
    if (b) n.estado = 'persecucion';
  } else if (!b || dist(n, n.casa) > d.correa) {
    n.estado = 'patrulla'; n.dest = n.casa; n.provocado = false; n.blanco = null;
  }

  if (n.estado === 'persecucion') {
    if (distancia > d.alcance * 0.7) {
      pilotar(n, b.x, b.z, d);
    } else {
      // Ya está en rango: frena y encara a su blanco
      girarSuave(n, difAngulo(Math.atan2(b.x - n.x, b.z - n.z), n.rumbo), d.giro);
      acelerar(n, 0, d.aceleracion);
      avanzar(n);
    }
    if (n.cdDisparo <= 0 && distancia <= d.alcance && !enZonaSegura(n)) {
      n.cdDisparo = d.cadencia;
      disparar(s, n, b, d.danio, esHostil(s, n) ? 'npc' : 'amigo');
    }
  } else {
    n.casco = Math.min(d.casco, n.casco + d.casco * COMBATE.regenNpc * DT);
    if (n.dest) {
      const lento = { velocidad: d.velocidad * 0.5, giro: d.giro, aceleracion: d.aceleracion };
      if (pilotar(n, n.dest.x, n.dest.z, lento)) { n.dest = null; n.espera = azar(1, 4); }
    } else {
      acelerar(n, 0, d.aceleracion);
      avanzar(n);
      n.espera -= DT;
      if (n.espera <= 0) {
        const a = azar(0, 6.28), r = azar(0, d.patrulla);
        n.dest = { x: clamp(n.casa.x + Math.cos(a) * r, -LIMITE, LIMITE), z: clamp(n.casa.z + Math.sin(a) * r, -LIMITE, LIMITE) };
      }
    }
  }

  n.h = n.rumbo; // los NPC siempre encaran hacia donde van, y al disparar ya miran al jugador

  // Los NPC nunca cruzan a la zona segura
  const r = Math.hypot(n.x, n.z), minimo = radioSeguro + 30;
  for (const p of portales) { // tampoco a la de los portales
    const dx = n.x - p.x, dz = n.z - p.z, d2 = Math.hypot(dx, dz), borde = RADIO_PORTAL + 30;
    if (d2 < borde) { n.x = p.x + (dx / (d2 || 1)) * borde; n.z = p.z + (dz / (d2 || 1)) * borde; }
  }
  if (radioSeguro && r < minimo) { n.x *= minimo / r; n.z *= minimo / r; }
}

// ---------- Drones ----------

const tamDe = (e, s) => ASSETS[e === s.jugador ? `nave_${e.naveId}` : `npc_${e.tipo}`].tam;

// Los 9 puestos son el contorno de un triángulo con la punta hacia arriba en pantalla: primero
// las esquinas y luego los lados, para que con pocos drones siga parejo. Es de radio 1.
const ESQUINAS = [[0, -1], [-0.866, 0.5], [0.866, 0.5]];
const entre = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const [PUNTA, IZQ, DER] = ESQUINAS;
const TRIANGULO = [
  ...ESQUINAS, entre(PUNTA, IZQ, 1 / 3), entre(PUNTA, DER, 1 / 3), entre(PUNTA, IZQ, 2 / 3), entre(PUNTA, DER, 2 / 3),
  entre(IZQ, DER, 1 / 3), entre(IZQ, DER, 2 / 3),
];

const radioTriangulo = (e, s) => tamDe(e, s) * 0.62 + DRONES.formacion.separacion;

// Puesto fijo junto al dueño. No depende del giro de la nave: la formación nunca da vueltas.
function puestoDe(d, s) {
  const e = d.dueno, r = radioTriangulo(e, s), [x, z] = TRIANGULO[d.puesto];
  return { x: e.x + x * r, z: e.z + z * r };
}

// Borde exterior de la escolta, para dar vueltas por fuera de todo
const radioExterior = (e, s) => radioTriangulo(e, s) + DRONES.orbita.margen;

// Da vueltas a `centro`. Con `velocidad` vuela hacia su lugar en vez de pegarse a él.
function orbitar(d, centro, radio, velocidad = Infinity) {
  d.angulo += DRONES.orbita.giro * DT;
  return volarA(d, centro.x + Math.cos(d.angulo) * radio, centro.z + Math.sin(d.angulo) * radio, velocidad);
}

function volarA(d, x, z, velocidad) {
  const dx = x - d.x, dz = z - d.z, largo = Math.hypot(dx, dz), paso = velocidad * DT;
  if (largo <= paso) { d.x = x; d.z = z; return true; }
  d.x += (dx / largo) * paso;
  d.z += (dz / largo) * paso;
  return false;
}

function encarar(d, x, z) {
  d.h += difAngulo(Math.atan2(x - d.x, z - d.z), d.h) * Math.min(1, 10 * DT);
}

function tickDrones(s) {
  const j = s.jugador;
  s.drones = s.drones.filter((d) => {
    if (d.temporal && !j.efectos.reparacion) return false;
    d.px = d.x; d.pz = d.z; d.ph = d.h;
    d.conectado = null;
    d.cd -= DT;
    if (d.tipo === 'sanguijuela') tickSanguijuela(s, d);
    else {
      if (d.temporal) orbitar(d, j, radioExterior(j, s));
      else volarA(d, ...Object.values(puestoDe(d, s)), Infinity);
      d.h = d.dueno.h;
      if (d.tipo === 'ataque') tickDronAtaque(s, d);
      else tickDronReparacion(s, d);
    }
    return true;
  });
}

function tickDronAtaque(s, d) {
  const j = s.jugador, c = DRONES.ataque;
  const blanco = d.bando === 'jugador' ? (j.atacando && !j.efectos.invisible && !enZonaSegura(j) ? objetivoActual(s) : null)
    : (d.dueno.blanco === j && !j.muerto && !j.efectos.invisible && !enZonaSegura(d.dueno) ? j : null);
  if (blanco && dist(d, blanco) <= c.alcance && d.cd <= 0) {
    d.cd = c.cadencia;
    disparar(s, d, blanco, c.danio, d.bando);
  }
}

function tickDronReparacion(s, d) {
  const j = s.jugador, st = statsJugador(j);
  if (j.muerto || j.casco >= st.casco) return;
  d.conectado = j;
  if (!d.temporal) j.casco = Math.min(st.casco, j.casco + st.casco * DRONES.reparacion.curaPorSegundo * DT);
}

// Vuela al jugador cuando su dueño pelea y le roba casco, que pasa a su dueño
function tickSanguijuela(s, d) {
  const j = s.jugador, c = DRONES.sanguijuela, n = d.dueno;
  const caza = n.blanco === j && !j.muerto && !j.efectos.invisible && !enZonaSegura(j) && dist(n, j) <= c.alcance;
  if (!caza) {
    volarA(d, ...Object.values(puestoDe(d, s)), c.velocidad);
    d.h = n.h;
    return;
  }
  const pegada = orbitar(d, j, tamDe(j, s) * 0.55 + DRONES.orbita.separacion, c.velocidad);
  encarar(d, j.x, j.z);
  if (!pegada) return;
  d.conectado = j;
  if (j.invencible) return;
  const robo = statsJugador(j).casco * c.drenaPorSegundo * DT;
  j.casco -= robo;
  j.sinDanio = 0;
  n.casco = Math.min(NPCS[n.tipo].casco, n.casco + robo);
  if (j.casco <= 0) morir(s);
}

function blancoDe(s, n, jugadorVisible) {
  const d = NPCS[n.tipo], j = s.jugador;
  if (jugadorVisible && (n.provocado || dist(n, j) < d.aggro)) return j;
  let mejor = null, cerca = d.aggro;
  for (const o of s.npcs) {
    if (o.empresa === n.empresa) continue;
    const r = dist(n, o);
    if (r < cerca) { mejor = o; cerca = r; }
  }
  return mejor;
}

function tickBotin(s) {
  const j = s.jugador;
  s.botin = s.botin.filter((b) => {
    b.vida -= DT;
    if (!j.muerto && dist(b, j) < COMBATE.radioBotin) {
      j.creditos += b.creditos;
      j.plasmita += b.plasmita;
      const extra = b.plasmita ? ` y ${b.plasmita} plasmita` : '';
      mensaje(s, `Botín: +${b.creditos.toLocaleString('es-MX')} créditos${extra}`, 'bueno');
      s.eventos.push({ t: 'recogido', x: b.x, z: b.z });
      return false;
    }
    return b.vida > 0;
  });
}

function tickMinas(s) {
  s.minas = s.minas.filter((m) => {
    m.armado -= DT;
    m.vida -= DT;
    if (m.armado > 0) return true;
    if (s.npcs.some((n) => esHostil(s, n) && dist(n, m) < m.esp.radioActivacion)) {
      s.eventos.push({ t: 'explosion', x: m.x, z: m.z, tam: 1.6 });
      for (const n of [...s.npcs]) {
        if (dist(n, m) < m.esp.radioExplosion && esHostil(s, n)) danarNpc(s, n, m.danio);
      }
      return false;
    }
    return m.vida > 0;
  });
}

function tickZonasCura(s) {
  const j = s.jugador;
  s.zonasCura = s.zonasCura.filter((z) => {
    z.vida -= DT;
    if (!j.muerto && dist(z, j) < z.radio) {
      const st = statsJugador(j);
      j.casco = Math.min(st.casco, j.casco + st.casco * z.curaPorSegundo * DT);
    }
    return z.vida > 0;
  });
}

function tickReapariciones(s) {
  s.reapariciones = s.reapariciones.filter((r) => {
    r.espera -= DT;
    if (r.espera > 0) return true;
    crearNpc(s, r.tipo, r.empresa);
    return false;
  });
}
