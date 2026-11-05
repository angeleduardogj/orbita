// Efectos visuales. Todo sale del pack: texturas de FX_Textures y mallas de FX_Meshes,
// combinadas como en los prefabs de Unity (FX_Explosion, FX_Laser_Shot, FX_Flame_Booster...).
import * as THREE from 'three';
import { COMBATE } from './data.js';
import { instancia, geometria, texturasFx } from './models.js';
import { geometriaCabina } from './toberas.js';

export const ALTURA_NAVES = 20; // plano donde vuelan las naves
const MAX_PARTICULAS = 480;
const MAX_LASERES = 200;

const azar = (a, b) => a + Math.random() * (b - a);
const color = (hex) => new THREE.Color(hex);

// Rastro de cada misil: del más fino y rápido al más pesado, con humo
const ESTELAS = {
  fina: { paso: 7, t0: 10, dur: 0.3, color: 'escudo' },
  media: { paso: 7, t0: 15, dur: 0.5, color: 'fuego' },
  pesada: { paso: 6, t0: 22, dur: 0.6, color: 'fuego', humo: true },
};

const C = {
  blanco: color(0xffffff),
  fuego: color(0xffa040),
  brasa: color(0xff3a10),
  humo: color(0x4a4640),
  humoFin: color(0x1c1a18),
  laser: {
    tierra: color(0x5fb0ff), marte: color(0xff4a3a), venus: color(0x4fe07a), sirko: color(0xf7ae50),
    jugador: color(0x6fe8ff), npc: color(0xff5a20),
  },
  escudo: color(0x6fc0ff),
  cura: color(0x6be89a),
  oro: color(0xffcf6a),
};
// Color de la llama según su temperatura, de empuje 0 a EMPUJE_MAX. El fuego sigue el color
// de un cuerpo caliente: rojo apagado, naranja, amarillo, blanco y blanco azulado.
const EMPUJE_MAX = 1.9;
const NIVELES_CALOR = 16;
const EMPUJE_MINIMO = 0.04; // por debajo, el motor está apagado
const ANCHO_LLAMA = 0.8;   // fracción del hueco de la tobera que ocupa la llama
const DESPEGUE_HALO = 1.5; // el halo del núcleo va un poco atrás para que no lo tape el marco
const RAMPA = {
  fuego: [[0, 0x5a1200], [0.3, 0xe63a08], [0.65, 0xff8a1e], [1, 0xffc95a], [1.4, 0xfff0c8], [EMPUJE_MAX, 0xd2e8ff]],
  nucleo: [[0, 0x0d2a70], [0.5, 0x1f6fe0], [1, 0x45a8ff], [1.4, 0x8fd2ff], [EMPUJE_MAX, 0xdcf4ff]],
};

function colorDeCalor(tipo, empuje) {
  const r = RAMPA[tipo];
  const i = Math.max(1, r.findIndex(([e]) => e >= empuje));
  const [e0, c0] = r[i - 1], [e1, c1] = r[i];
  return color(c0).lerp(color(c1), Math.min(1, (empuje - e0) / (e1 - e0)));
}

// Franja que sigue el marco de un núcleo: va del borde de SphereGlow a su centro y de vuelta,
// así el brillo se concentra sobre el marco y se apaga hacia adentro y hacia afuera.
const franjas = new Map();
function franjaDeLuz({ ancho, alto, grosor, forma }) {
  const clave = `${ancho},${alto},${grosor},${forma}`;
  if (franjas.has(clave)) return franjas.get(clave);
  const w = (ancho - grosor) / 2, h = (alto - grosor) / 2, abre = grosor * 1.4;
  const lados = forma === 'redondo' ? 24 : 4;
  const giro = forma === 'redondo' ? 0 : Math.PI / 4;
  const escala = forma === 'redondo' ? 1 : Math.SQRT2; // las esquinas del rectángulo quedan a √2
  const posiciones = [], uvs = [], indices = [];
  [-abre, 0, abre].forEach((d, anillo) => {
    for (let i = 0; i < lados; i++) {
      const a = giro + (i / lados) * Math.PI * 2;
      posiciones.push(Math.cos(a) * escala * Math.max(0, w + d), Math.sin(a) * escala * Math.max(0, h + d), 0);
      uvs.push(0.5, anillo === 1 ? 0.5 : 0);
    }
  });
  for (let anillo = 0; anillo < 2; anillo++) {
    for (let i = 0; i < lados; i++) {
      const a = anillo * lados + i, b = anillo * lados + ((i + 1) % lados);
      indices.push(a, b, a + lados, b, b + lados, a + lados);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  franjas.set(clave, g);
  return g;
}

// Las cabinas están encendidas siempre y brillan parejo, sin halo ni parpadeo
const luzCabina = new THREE.MeshBasicMaterial({
  color: 0x3fb4e0, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false,
  side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
});
const cabinas = new WeakMap(); // def -> geometría, para no releer la malla en cada aparición

export function encenderCabina(modelo, def) {
  if (!cabinas.has(def)) cabinas.set(def, geometriaCabina(modelo));
  const g = cabinas.get(def);
  if (!g) return null;
  const luz = new THREE.Mesh(g, luzCabina);
  modelo.add(luz);
  return luz;
}

const RESTOS = ['fx_guijarro_a', 'fx_guijarro_b', 'fx_guijarro_c', 'fx_resto'];

// Plano horizontal con una textura del pack
export function planoFx(textura, tam, hex, opacidad) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(tam, tam),
    new THREE.MeshBasicMaterial({
      map: textura, color: hex, transparent: true, opacity: opacidad,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  return m;
}

export class Efectos {
  constructor(scene) {
    this.scene = scene;

    // Partículas: sprites reutilizados, sin crear objetos durante el juego
    this.libres = [];
    this.particulas = [];
    for (let i = 0; i < MAX_PARTICULAS; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false }));
      s.visible = false;
      s.renderOrder = 20;
      scene.add(s);
      this.libres.push(s);
    }

    this.restos = [];   // pedazos que salen volando en las explosiones
    this.planos = [];   // ondas y rayos de vida corta

    this.crearLaseres();
    this.crearEscudo();

    this.crearLlamas();
  }

  crearLlamas() {
    // Una malla por forma de abertura, y materiales ya preparados para cada nivel de calor
    const crearGeo = (id) => {
      const g = geometria(id);
      g.translate(0, 0, -0.5); // la base queda en el origen y la llama crece hacia atrás
      g.computeBoundingBox();
      return { geo: g, medida: g.boundingBox.getSize(new THREE.Vector3()) };
    };
    const porNivel = (crear) => Array.from({ length: NIVELES_CALOR }, (_, n) => crear((n / (NIVELES_CALOR - 1)) * EMPUJE_MAX));
    const aditivo = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
    const llama = (empuje, extra) => new THREE.MeshBasicMaterial({
      ...aditivo, map: texturasFx.llama, side: THREE.DoubleSide, opacity: Math.min(1, 0.45 + empuje * 0.45),
      color: colorDeCalor('fuego', Math.min(EMPUJE_MAX, empuje + extra)),
    });
    this.llamas = { redonda: crearGeo('fx_llama'), alargada: crearGeo('fx_llama_cuadrada') };
    this.fuego = {
      borde: porNivel((e) => llama(e, 0)),
      centro: porNivel((e) => llama(e, 0.5)), // el centro de la llama siempre está más caliente que el borde
    };
    const luz = (e) => ({ ...aditivo, map: texturasFx.brillo, color: colorDeCalor('nucleo', Math.min(EMPUJE_MAX, 0.5 + e)), opacity: Math.min(1, 0.55 + e * 0.35) });
    this.nucleo = {
      plano: new THREE.PlaneGeometry(1, 1),
      luz: porNivel((e) => new THREE.MeshBasicMaterial({ ...luz(e), side: THREE.DoubleSide })),
      halo: porNivel((e) => new THREE.SpriteMaterial(luz(e))),
    };
  }

  crearLaseres() {
    // Cada disparo: la malla SM_Laser_Trail_01 más la cabeza brillante Transparent_Flash
    this.estelas = new THREE.InstancedMesh(
      geometria('fx_laser'),
      new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
      MAX_LASERES,
    );
    const plano = new THREE.PlaneGeometry(1, 1);
    plano.rotateX(-Math.PI / 2);
    plano.rotateY(Math.PI / 2); // el largo de la textura queda sobre Z
    this.cabezas = new THREE.InstancedMesh(
      plano,
      new THREE.MeshBasicMaterial({ map: texturasFx.destello, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
      MAX_LASERES,
    );
    for (const m of [this.estelas, this.cabezas]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.setColorAt(0, C.blanco);
      m.renderOrder = 15;
      this.scene.add(m);
    }
    this.tmp = new THREE.Object3D();
  }

  crearEscudo() {
    // Burbuja facetada SM_SphereGeo más un aro Circle_Dashes
    this.escudo = new THREE.Group();
    this.matEscudo = new THREE.MeshStandardMaterial({
      color: C.escudo, emissive: C.escudo, emissiveIntensity: 0.25, flatShading: true,
      transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.escudo.add(new THREE.Mesh(geometria('fx_esfera'), this.matEscudo));
    this.aroEscudo = planoFx(texturasFx.circulo, 1.5, C.escudo, 0);
    this.escudo.add(this.aroEscudo);
    this.escudo.visible = false;
    this.scene.add(this.escudo);
    this.golpeEscudo = 0;
  }

  // ---------- Motores ----------

  // Prepara cada tobera de `def.motores` y devuelve el estado para animarlas
  agregarMotores(modelo, def) {
    // despegue: cuánto se separa de la cara de la tobera, hacia donde mira
    const colocar = (pieza, m, despegue = 0) => {
      const [nx, ny, nz] = m.mira || [0, 0, -1];
      pieza.position.set(m.x + nx * despegue, m.y + ny * despegue, m.z + nz * despegue);
      pieza.rotation.set(0, nx ? Math.PI / 2 : 0, m.giro);
      modelo.add(pieza);
      return pieza;
    };
    const toberas = (def.motores || []).map((m) => {
      if (m.tipo === 'nucleo') {
        const { plano, luz, halo } = this.nucleo;
        if (m.grosor) return { ...m, luz: colocar(new THREE.Mesh(franjaDeLuz(m), luz[0]), m) };
        return {
          ...m,
          luz: colocar(new THREE.Mesh(plano, luz[0]), m, 0.2),
          halo: colocar(new THREE.Sprite(halo[0]), m, DESPEGUE_HALO),
        };
      }
      const alargada = Math.max(m.ancho, m.alto) > 2 * Math.min(m.ancho, m.alto);
      const llama = alargada ? this.llamas.alargada : this.llamas.redonda;
      const crear = () => colocar(new THREE.Mesh(llama.geo, this.fuego.borde[0]), m);
      return { ...m, medida: llama.medida, borde: crear(), centro: crear() };
    });
    return { toberas, cabina: encenderCabina(modelo, def), empuje: 0, velPrevia: 0 };
  }

  mostrarMotores(motores, visible) {
    motores.ocultos = !visible;
    if (motores.cabina) motores.cabina.visible = visible;
  }

  // El empuje sube con la velocidad y aún más mientras acelera; al frenar cae
  animarMotores(motores, vel, velBase, dt, t) {
    const aceleracion = dt > 0 ? (vel - motores.velPrevia) / dt : 0;
    motores.velPrevia = vel;
    const objetivo = vel / velBase + (aceleracion > 8 ? 0.35 : aceleracion < -8 ? -0.2 : 0);
    motores.empuje += (objetivo - motores.empuje) * (1 - Math.exp(-dt * 6));
    const e = THREE.MathUtils.clamp(motores.empuje, 0, EMPUJE_MAX);
    const nivel = Math.round((e / EMPUJE_MAX) * (NIVELES_CALOR - 1));

    // Motor apagado: sin empuje no sale nada de esa tobera, ni fuego ni brillo
    const encendido = e > EMPUJE_MINIMO && !motores.ocultos;
    for (const m of motores.toberas) {
      for (const pieza of [m.borde, m.centro, m.luz, m.halo]) if (pieza) pieza.visible = encendido;
      if (!encendido) continue;
      const parpadeo = 0.9 + 0.1 * Math.sin(t * 34 + m.x * 3 + m.y);
      const tam = Math.sqrt(m.ancho * m.alto);
      if (m.tipo === 'nucleo') {
        m.luz.material = this.nucleo.luz[nivel];
        if (m.grosor) continue;
        m.luz.scale.set(m.ancho * 1.5, m.alto * 1.5, 1);
        m.halo.material = this.nucleo.halo[nivel];
        m.halo.scale.setScalar(tam * (2 + 0.8 * e) * parpadeo);
        continue;
      }
      // Sale más angosta que el hueco y nace en el fondo: la boca siempre se ve alrededor
      const largo = m.hondo + tam * (0.4 + 4.5 * e) * parpadeo;
      const { medida } = m;
      m.borde.material = this.fuego.borde[nivel];
      m.borde.scale.set(ANCHO_LLAMA * m.ancho / medida.x, ANCHO_LLAMA * m.alto / medida.y, largo);
      m.centro.material = this.fuego.centro[nivel];
      m.centro.scale.set(0.5 * ANCHO_LLAMA * m.ancho / medida.x, 0.5 * ANCHO_LLAMA * m.alto / medida.y, largo * 0.7);
    }
  }

  // ---------- Partículas ----------

  particula(p) {
    const s = this.libres.pop();
    if (!s) return; // sin sprites libres: se omite, nunca se rompe el juego
    const m = s.material;
    m.map = p.tex;
    m.blending = p.normal ? THREE.NormalBlending : THREE.AdditiveBlending;
    m.rotation = p.rot ?? azar(0, 6.28);
    m.needsUpdate = true;
    s.position.set(p.x, p.y ?? ALTURA_NAVES + 10, p.z);
    s.visible = true;
    this.particulas.push({ s, t: 0, vx: 0, vz: 0, giro: 0, largo: 1, opacidad: 1, c1: C.blanco, c2: C.blanco, ...p });
  }

  // Fogonazo en la boca del arma: FX_MuzzleFlash usa Explosion.png
  // Rastro continuo: suelta partículas a distancia fija desde donde quedó la última
  estelaMisil(rastro, x, z, tipo) {
    const receta = ESTELAS[tipo];
    rastro.x ??= x;
    rastro.z ??= z;
    const d = Math.hypot(x - rastro.x, z - rastro.z), pasos = Math.floor(d / receta.paso);
    for (let i = 1; i <= pasos; i++) {
      const k = i * receta.paso / d;
      this.gotaEstela(rastro.x + (x - rastro.x) * k, rastro.z + (z - rastro.z) * k, receta, rastro.n = (rastro.n ?? 0) + 1);
    }
    if (pasos) {
      rastro.x += (x - rastro.x) * pasos * receta.paso / d;
      rastro.z += (z - rastro.z) * pasos * receta.paso / d;
    }
  }

  gotaEstela(x, z, { t0, dur, color, humo }, n) {
    this.particula({ tex: texturasFx.brillo, x, z, t0, t1: t0 * 0.25, dur, c1: C.blanco, c2: C[color] });
    if (humo && n % 4 === 0) {
      this.particula({ tex: texturasFx.nube, normal: true, x, z, vx: azar(-8, 8), vz: azar(-8, 8), t0: t0 * 0.7, t1: t0 * 2.2, dur: 0.9, giro: azar(-1, 1), c1: C.humo, c2: C.humoFin, opacidad: 0.45 });
    }
  }

  fogonazo(x, z, ang, empresa, tam) {
    const nx = x + Math.sin(ang) * tam * 0.5, nz = z + Math.cos(ang) * tam * 0.5;
    this.particula({ tex: texturasFx.explosion, x: nx, z: nz, t0: 16, t1: 44, dur: 0.1, c1: C.blanco, c2: C.laser[empresa] });
  }

  impacto(x, z, escudo) {
    if (escudo) {
      this.golpeEscudo = 1;
      this.particula({ tex: texturasFx.brillo, x, z, t0: 30, t1: 70, dur: 0.18, c1: C.escudo, c2: C.escudo, opacidad: 0.3 });
      return;
    }
    this.particula({ tex: texturasFx.explosion, x, z, t0: 24, t1: 70, dur: 0.2, c1: C.blanco, c2: C.fuego });
    this.particula({ tex: texturasFx.brillo, x, z, t0: 40, t1: 90, dur: 0.16, c1: C.fuego, c2: C.brasa, opacidad: 0.7 });
    this.chispas(x, z, 3, 170, 0.22, 18);
  }

  // Chispas alargadas con Transparent_Flash, orientadas según su dirección
  chispas(x, z, cantidad, velocidad, dur, tam) {
    for (let i = 0; i < cantidad; i++) {
      const a = azar(0, 6.28), v = azar(0.5, 1) * velocidad;
      // La cámara está inclinada: el eje Z se ve acortado en pantalla al girar el sprite
      const vx = Math.cos(a) * v, vz = Math.sin(a) * v;
      const rot = Math.atan2(-vz * 0.82, vx);
      this.particula({ tex: texturasFx.destello, x, z, vx, vz, rot, t0: tam, t1: tam * 0.4, largo: 2.6, dur: dur * azar(0.7, 1.2), c1: C.blanco, c2: C.fuego });
    }
  }

  // Receta de FX_Explosion: destello, nubes de fuego, humo, chispas y restos
  explosion(x, z, e = 1) {
    const { explosion, brillo, nube } = texturasFx;
    this.particula({ tex: explosion, x, z, t0: 70 * e, t1: 250 * e, dur: 0.32, c1: C.blanco, c2: C.fuego });
    this.particula({ tex: brillo, x, z, t0: 160 * e, t1: 340 * e, dur: 0.45, c1: C.fuego, c2: C.brasa, opacidad: 0.8 });
    for (let i = 0; i < 7; i++) {
      const a = azar(0, 6.28), v = azar(30, 110) * e;
      this.particula({
        tex: nube, x: x + azar(-14, 14) * e, z: z + azar(-14, 14) * e, vx: Math.cos(a) * v, vz: Math.sin(a) * v,
        t0: 50 * e, t1: azar(150, 240) * e, dur: azar(0.55, 0.95), giro: azar(-1, 1), c1: C.fuego, c2: C.brasa,
      });
    }
    for (let i = 0; i < 5; i++) {
      const a = azar(0, 6.28), v = azar(20, 60) * e;
      this.particula({
        tex: nube, normal: true, x, z, vx: Math.cos(a) * v, vz: Math.sin(a) * v, t0: 70 * e, t1: azar(220, 320) * e,
        dur: azar(1.2, 1.9), giro: azar(-0.5, 0.5), c1: C.humo, c2: C.humoFin, opacidad: 0.55,
      });
    }
    this.chispas(x, z, Math.round(7 * e), 420 * e, 0.42, 34);
    const piezas = Math.round(6 + 3 * e);
    for (let i = 0; i < piezas; i++) {
      const o = instancia(RESTOS[i % RESTOS.length]);
      const a = azar(0, 6.28), v = azar(50, 190) * Math.sqrt(e);
      o.position.set(x, ALTURA_NAVES, z);
      o.rotation.set(azar(0, 6), azar(0, 6), azar(0, 6));
      this.scene.add(o);
      this.restos.push({ o, t: 0, dur: azar(1.1, 2), vx: Math.cos(a) * v, vz: Math.sin(a) * v, gx: azar(-4, 4), gy: azar(-4, 4), tam: azar(0.7, 1.4) * Math.sqrt(e) });
    }
  }

  humoDeDanio(x, z, tam) {
    const r = tam * 0.25;
    this.particula({ tex: texturasFx.nube, normal: true, x: x + azar(-r, r), z: z + azar(-r, r), vx: azar(-10, 10), vz: azar(-10, 10), t0: 22, t1: 80, dur: 0.9, giro: azar(-1, 1), c1: C.humo, c2: C.humoFin, opacidad: 0.5 });
    this.particula({ tex: texturasFx.nube, x: x + azar(-r, r), z: z + azar(-r, r), t0: 14, t1: 34, dur: 0.35, giro: azar(-1, 1), c1: C.fuego, c2: C.brasa });
  }

  // Onda expansiva con Circle_Dashes
  onda(x, z, radio, c, duracion = 0.55) {
    const m = planoFx(texturasFx.circulo, 2, c, 1);
    m.position.set(x, ALTURA_NAVES, z);
    this.scene.add(m);
    this.planos.push({ m, t: 0, dur: duracion, ini: radio * 0.2, fin: radio });
  }

  // Rayo perforante: SM_Laser_Trail_01 a todo lo largo más Transparent_Line como halo
  rayo(x1, z1, x2, z2) {
    const largo = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(x2 - x1, z2 - z1);
    const crear = (geo, tex, ancho, alto, c) => {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.position.set((x1 + x2) / 2, ALTURA_NAVES + 8, (z1 + z2) / 2);
      m.rotation.y = ang;
      m.scale.set(ancho, alto, largo);
      m.renderOrder = 15;
      this.scene.add(m);
      this.planos.push({ m, t: 0, dur: 0.35, propia: true });
    };
    crear(this.estelas.geometry, null, 900, 900, C.blanco);
    crear(this.cabezas.geometry, texturasFx.linea, 70, 1, C.laser.jugador);
    this.particula({ tex: texturasFx.explosion, x: x1, z: z1, t0: 40, t1: 130, dur: 0.2, c1: C.blanco, c2: C.laser.jugador });
  }

  // Haz fijo entre un dron y su blanco, con Transparent_Line: verde repara, rojo drena
  crearHaz(drena) {
    const m = new THREE.Mesh(this.cabezas.geometry, new THREE.MeshBasicMaterial({
      map: texturasFx.linea, color: drena ? C.laser.npc : C.cura, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    m.renderOrder = 15;
    m.visible = false;
    this.scene.add(m);
    return m;
  }

  ubicarHaz(m, x1, z1, x2, z2) {
    m.position.set((x1 + x2) / 2, ALTURA_NAVES + 6, (z1 + z2) / 2);
    m.rotation.y = Math.atan2(x2 - x1, z2 - z1);
    m.scale.set(16, 1, Math.hypot(x2 - x1, z2 - z1));
  }

  procesar(ev) {
    switch (ev.t) {
      case 'impacto': this.impacto(ev.x, ev.z, ev.escudo); break;
      case 'explosion': this.explosion(ev.x, ev.z, ev.tam); break;
      case 'rayo': this.rayo(ev.x1, ev.z1, ev.x2, ev.z2); break;
      case 'pulso': this.onda(ev.x, ev.z, 300, C.escudo, 0.7); this.golpeEscudo = 1; break;
      case 'recogido':
        this.particula({ tex: texturasFx.explosion, x: ev.x, z: ev.z, t0: 30, t1: 110, dur: 0.3, c1: C.blanco, c2: C.oro });
        break;
      case 'reaparecio': this.onda(ev.x, ev.z, 220, C.escudo, 0.8); break;
    }
  }

  // ---------- Actualización por cuadro ----------

  dibujarLaseres(proyectiles, lerp) {
    const { tmp } = this;
    let n = 0;
    for (const p of proyectiles) {
      if (n >= MAX_LASERES) break;
      const x = lerp(p.px, p.x), z = lerp(p.pz, p.z);
      tmp.position.set(x, ALTURA_NAVES + 8, z);
      tmp.rotation.set(0, Math.atan2(p.objetivo.x - x, p.objetivo.z - z), 0);
      tmp.scale.set(360, 360, COMBATE.velocidadLaser * 0.06);
      tmp.updateMatrix();
      this.estelas.setMatrixAt(n, tmp.matrix);
      this.estelas.setColorAt(n, C.laser[p.empresa]);
      tmp.scale.set(40, 1, 84);
      tmp.updateMatrix();
      this.cabezas.setMatrixAt(n, tmp.matrix);
      this.cabezas.setColorAt(n, C.laser[p.empresa]);
      n++;
    }
    for (const m of [this.estelas, this.cabezas]) {
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
      m.instanceColor.needsUpdate = true;
    }
  }

  // barrera y blindaje mantienen la burbuja visible; un golpe la enciende un instante
  animarEscudo(pos, tam, barrera, blindaje, dt) {
    this.golpeEscudo = Math.max(0, this.golpeEscudo - dt * 3.2);
    const fija = barrera || blindaje ? 0.24 : 0;
    const fuerza = Math.max(fija, this.golpeEscudo * 0.3);
    this.escudo.visible = fuerza > 0.01;
    if (!this.escudo.visible) return;
    this.escudo.position.copy(pos);
    this.escudo.scale.setScalar(tam * 1.15);
    const c = blindaje && !barrera ? C.oro : C.escudo;
    this.matEscudo.color.copy(c);
    this.matEscudo.emissive.copy(c);
    this.matEscudo.opacity = fuerza;
    this.aroEscudo.material.color.copy(c);
    this.aroEscudo.material.opacity = fuerza * 2;
    this.aroEscudo.rotation.z += dt * 1.4;
  }

  actualizar(dt) {
    this.particulas = this.particulas.filter((p) => {
      p.t += dt;
      const k = p.t / p.dur, { s } = p, m = s.material;
      if (k >= 1) {
        s.visible = false;
        this.libres.push(s);
        return false;
      }
      const tam = p.t0 + (p.t1 - p.t0) * Math.sqrt(k); // crece rápido al inicio y luego se frena
      s.scale.set(tam * p.largo, tam, 1);
      s.position.x += p.vx * dt;
      s.position.z += p.vz * dt;
      m.rotation += p.giro * dt;
      m.opacity = p.opacidad * (1 - k * k);
      m.color.copy(p.c1).lerp(p.c2, k);
      return true;
    });

    this.restos = this.restos.filter((r) => {
      r.t += dt;
      const k = r.t / r.dur;
      if (k >= 1) {
        this.scene.remove(r.o);
        return false;
      }
      r.o.position.x += r.vx * dt;
      r.o.position.z += r.vz * dt;
      r.o.rotation.x += r.gx * dt;
      r.o.rotation.y += r.gy * dt;
      r.o.scale.setScalar(r.tam * Math.min(1, (1 - k) * 3.5)); // se encoge al final
      return true;
    });

    this.planos = this.planos.filter((p) => {
      p.t += dt;
      const k = p.t / p.dur;
      if (k >= 1) {
        this.scene.remove(p.m);
        p.m.material.dispose();
        if (!p.propia) p.m.geometry.dispose();
        return false;
      }
      p.m.material.opacity = 1 - k;
      if (!p.propia) p.m.scale.setScalar(p.ini + (p.fin - p.ini) * k);
      return true;
    });
  }
}
