// Escena 3D del juego: dibuja lo que hay en el estado de la simulación.
import * as THREE from 'three';
import { MUNDO, NPCS, EMPRESAS, MAPAS, RADIO_PORTAL, nombreSector } from './data.js';
import { ASSETS } from './assetmap.js';
import { naveDe, statsJugador, esHostil, hayZonaSegura } from './sim.js';
import { instancia, instanciaUnica, agregarLuces, geometria, texturasFx, pintar, encenderLuces } from './models.js';
import { Fondo } from './background.js';
import { Efectos, planoFx, ALTURA_NAVES } from './fx.js';
import { CamaraLibre } from './camara-libre.js';
import { detectarToberas } from './toberas.js';

export { ALTURA_NAVES };
const INCLINACION = THREE.MathUtils.degToRad(55); // elevación de la cámara sobre el plano
const AZIMUT = 0; // sin giro: X va a lo ancho de la pantalla y Z a lo alto, igual que en el minimapa
const ZOOM_MIN = 520, ZOOM_MAX = 1500;
const ANCHO_MINIMO = 640; // en pantallas verticales se abre la vista para ver el alcance de las armas
const RADIO_CIRCULO = 2.72; // Circle_Dashes deja margen: lado del plano por unidad de radio
const PARALAJE_LIBRE = 6; // pantallas de fondo por radián girado con la cámara libre
const BASES_CHOCADAS = [ // asset, x, y, z, inclinación en X y en Z
  ['base_tierra', -300, -120, 0, 0.1, 0.22],
  ['base_marte', 310, -160, 60, -0.08, -0.2],
  ['base_venus', 0, -140, 400, 0.22, 0.05],
];
const ESCALA_CHOCADAS = 0.62;
const RITMO_GUERRA = 1.4; // segundos entre explosiones en las bases chocadas
const CASCO_CRITICO = 0.35; // por debajo de esta fracción la nave echa humo

// Retícula del pack (SM_Hud_Reticle_*), dibujada sin luces
function reticula(id, hex, opacidad) {
  return new THREE.Mesh(
    geometria(id),
    new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: opacidad, depthWrite: false }),
  );
}

export class Escena {
  constructor(canvasJuego, canvasFondo) {
    this.renderer = new THREE.WebGLRenderer({ canvas: canvasJuego, antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.fondo = new Fondo(canvasFondo, texturasFx.cielo.image, texturasFx.estrellas.image);
    this.scene = new THREE.Scene();
    agregarLuces(this.scene);

    this.zoom = 720; // altura visible en unidades del mundo
    this.camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 12000);
    const d = 4000;
    this.desfase = new THREE.Vector3(
      Math.cos(INCLINACION) * Math.sin(AZIMUT) * d,
      Math.sin(INCLINACION) * d,
      Math.cos(INCLINACION) * Math.cos(AZIMUT) * d,
    );
    this.foco = new THREE.Vector3(MUNDO.aparicion.x, 0, MUNDO.aparicion.z);
    this.libre = new CamaraLibre();
    this.posNave = new THREE.Vector3();
    this.derecha = new THREE.Vector3();
    this.arriba = new THREE.Vector3();

    this.raycaster = new THREE.Raycaster();
    this.planoNaves = new THREE.Plane(new THREE.Vector3(0, 1, 0), -ALTURA_NAVES);

    this.relojEmision = 0;
    this.npcs = new Map();    // id -> { grupo, modelo, barra }
    this.drones = new Map();
    this.botin = new Map();
    this.minas = new Map();
    this.zonasCura = new Map();

    this.crearMundo();
    this.fx = new Efectos(this.scene);
    this.crearIndicadores();
    this.redimensionar();
    addEventListener('resize', () => this.redimensionar());
  }

  redimensionar() {
    const w = innerWidth, h = innerHeight, dpr = Math.min(devicePixelRatio, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.fondo.redimensionar(w, h);
    this.aplicarZoom();
    this.libre.redimensionar();
  }

  aplicarZoom() {
    const aspecto = innerWidth / innerHeight;
    this.altoVisible = Math.max(this.zoom, ANCHO_MINIMO / aspecto);
    const m = this.altoVisible / 2;
    Object.assign(this.camara, { left: -m * aspecto, right: m * aspecto, top: m, bottom: -m });
    this.camara.updateProjectionMatrix();
  }

  cambiarZoom(factor) {
    this.zoom = THREE.MathUtils.clamp(this.zoom * factor, ZOOM_MIN, ZOOM_MAX);
    this.aplicarZoom();
  }

  crearMundo() {
    const poner = (id, x, y, z, rotY = 0) => {
      const o = instancia(id);
      o.position.set(x, y, z);
      o.rotation.y = rotY;
      this.scene.add(o);
      return o;
    };

    // Lo que cambia de un mapa a otro va en su propio grupo
    this.decorado = new THREE.Group();
    this.scene.add(this.decorado);

    // Zona segura: Circle_Dashes del pack, girando despacio
    // Va debajo de la estación para no pintarla encima; se desplaza en X y Z para que,
    // visto desde la cámara, coincida con el borde real sobre el plano de las naves.
    this.zona = planoFx(texturasFx.circulo, MUNDO.radioZonaSegura * RADIO_CIRCULO, 0x6fb6d8, 0.45);
    this.alinearConNaves(this.zona, -170);
    this.scene.add(this.zona);

    const L = MUNDO.tamano / 2;
    this.crearCuadricula();

    this.luna = poner('luna', 2100, -700, -1500);

    // Asteroides y basura espacial, sin colisión, fuera de la zona segura
    this.flotantes = [];
    const dispersar = (tipos, cantidad, altura) => {
      for (let i = 0; i < cantidad; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = MUNDO.radioZonaSegura + 200 + Math.random() * (L - MUNDO.radioZonaSegura);
        const o = poner(tipos[i % tipos.length], Math.cos(a) * r, altura - Math.random() * 60, Math.sin(a) * r, Math.random() * 6.28);
        o.rotation.x = Math.random() * 6.28;
        o.scale.setScalar(0.6 + Math.random() * 0.9);
        o.userData.giro = (Math.random() - 0.5) * 0.4;
        this.flotantes.push(o);
      }
    };
    dispersar(['asteroide_a', 'asteroide_b', 'asteroide_c'], MUNDO.numAsteroides, -70);
    dispersar(['escombro_tubo', 'escombro_casco_a', 'escombro_armazon_a', 'escombro_casco_b', 'escombro_armazon_b', 'escombro_casco_c'], MUNDO.numEscombros, -30);

    // Nubes de polvo con SpaceDust, muy tenues
    for (let i = 0; i < MUNDO.numPolvo; i++) {
      const p = planoFx(texturasFx.polvo, 1100 + Math.random() * 900, 0x5a78b0, 0.16);
      p.position.set((Math.random() - 0.5) * 2 * L, -160, (Math.random() - 0.5) * 2 * L);
      p.rotation.z = Math.random() * 6.28;
      this.scene.add(p);
    }
  }

  // Cambia el decorado al llegar a un mapa: base y planeta de la empresa, o las bases chocadas
  ponerMapa(id) {
    const empresa = MAPAS[id].empresa, grupo = this.decorado;
    grupo.clear();
    const poner = (asset, x, y, z, paleta) => {
      const o = paleta ? instanciaUnica(asset) : instancia(asset);
      if (paleta) pintar(o, paleta);
      o.position.set(x, y, z);
      grupo.add(o);
      return o;
    };
    this.base = this.planeta = null;
    this.portales = [];
    this.zonasPortal = [];
    if (empresa) {
      // Base un poco por debajo del plano, para que las naves pasen por encima; el planeta detrás
      this.base = poner(`base_${empresa}`, 0, -90, 0, empresa);
      this.planeta = poner(`planeta_${empresa}`, -1150, -1300, -560);
    } else {
      // Las tres bases, trabadas entre sí en plena guerra
      for (const [asset, x, y, z, rx, rz] of BASES_CHOCADAS) {
        const o = poner(asset, x, y, z, asset.slice('base_'.length));
        o.rotation.set(rx, 0, rz);
        o.scale.setScalar(ESCALA_CHOCADAS);
        // Son más altas que anchas: se hunden hasta quedar bajo las naves, sin moverse en pantalla
        const baja = new THREE.Box3().setFromObject(o).max.y - y + 40;
        o.position.y -= baja;
        o.position.z -= baja / Math.tan(INCLINACION);
      }
    }
    for (const p of MAPAS[id].portales) {
      const o = new THREE.Group();
      // Los focos del pack brillan con su máscara de luces, sobre el casco gris y negro
      const encender = (asset) => {
        const pieza = instanciaUnica(asset);
        encenderLuces(pieza, 2.2);
        return pieza;
      };
      o.add(encender('portal_aro'));
      const interior = encender('portal_interior');
      o.add(interior);
      const zona = planoFx(texturasFx.circulo, RADIO_PORTAL * RADIO_CIRCULO, 0x6fb6d8, 0.45);
      zona.position.set(p.x, ALTURA_NAVES - 40, p.z);
      grupo.add(zona);
      this.zonasPortal.push(zona);
      o.position.set(p.x, ALTURA_NAVES - 30, p.z);
      o.rotation.x = -Math.PI / 2;
      grupo.add(o);
      this.portales.push(interior);
    }
    this.zona.visible = hayZonaSegura();
    this.mapaActual = id;
    this.saltoCamara = true;
  }

  // Pone un objeto a la altura y, corrido para que desde la cámara coincida con el plano de las naves
  alinearConNaves(objeto, y) {
    const bajada = (ALTURA_NAVES - y) / this.desfase.y;
    objeto.position.set(-this.desfase.x * bajada, y, -this.desfase.z * bajada);
  }

  // Cuadrícula tipo plano técnico: va debajo de todo y delimita el mapa cuadrado
  crearCuadricula() {
    const L = MUNDO.tamano / 2, grupo = new THREE.Group();
    const lineas = (paso, hex, opacidad) => {
      const puntos = [];
      for (let v = -L; v <= L; v += paso) {
        puntos.push(new THREE.Vector3(v, 0, -L), new THREE.Vector3(v, 0, L));
        puntos.push(new THREE.Vector3(-L, 0, v), new THREE.Vector3(L, 0, v));
      }
      grupo.add(new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(puntos),
        new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: opacidad, depthWrite: false }),
      ));
    };
    lineas(MUNDO.subdivision, 0x6fa8e8, 0.42);
    lineas(MUNDO.sector, 0x9fd0ff, 0.8);

    // Fondo azul del plano, solo dentro del mapa
    const fondo = new THREE.Mesh(
      new THREE.PlaneGeometry(MUNDO.tamano, MUNDO.tamano),
      new THREE.MeshBasicMaterial({ color: 0x0f3a78, transparent: true, opacity: 0.3, depthWrite: false }),
    );
    fondo.rotation.x = -Math.PI / 2;
    fondo.position.y = -2;
    grupo.add(fondo);

    // Borde del mapa
    grupo.add(new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([[-L, -L], [L, -L], [L, L], [-L, L]].map(([x, z]) => new THREE.Vector3(x, 0, z))),
      new THREE.LineBasicMaterial({ color: 0xbfe0ff }),
    ));

    // Nombre de cada sector, en la esquina de su celda
    const lado = MUNDO.sector;
    for (let x = -L; x < L; x += lado) {
      for (let z = -L; z < L; z += lado) {
        const etiqueta = this.etiquetaSector(nombreSector(x + 1, z + 1));
        etiqueta.position.set(x + 130, 1, z + 130);
        grupo.add(etiqueta);
      }
    }
    this.alinearConNaves(grupo, -200);
    this.scene.add(grupo);
  }

  etiquetaSector(texto) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const g = c.getContext('2d');
    g.font = '600 96px ui-monospace, Menlo, monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#9fd0ff';
    g.fillText(texto, 128, 64);
    const textura = new THREE.CanvasTexture(c);
    textura.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 100),
      new THREE.MeshBasicMaterial({ map: textura, transparent: true, opacity: 0.6, depthWrite: false }),
    );
    m.rotation.set(-Math.PI / 2, 0, AZIMUT); // se lee derecho desde la cámara
    return m;
  }

  crearIndicadores() {
    this.anilloObjetivo = reticula('fx_objetivo', 0xff6a5c, 0.95);
    this.anilloObjetivo.visible = false;
    this.marcaDestino = reticula('fx_destino', 0x9fe0ff, 0.85);
    this.marcaDestino.visible = false;
    this.marcaDestino.scale.setScalar(46);
    this.anilloJugador = reticula('fx_jugador', 0x9fe0ff, 0.45);
    this.scene.add(this.anilloObjetivo, this.marcaDestino, this.anilloJugador);
  }

  // Pantalla (px) -> punto del mundo sobre el plano de las naves
  pantallaAMundo(x, y) {
    const ndc = new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camara);
    const p = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this.planoNaves, p) ? p : null;
  }

  // Punto arriba de la nave del jugador, en píxeles. Null si queda detrás de la cámara.
  etiquetaEnPantalla() {
    const v = this.jugador, vista = this.libre.activa ? this.libre.camara : this.camara;
    const p = v.grupo.position.clone().addScaledVector(this.arriba, v.tam * 0.55).project(vista);
    if (p.z > 1) return null;
    return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight };
  }

  // ---------- Sincronización con la simulación ----------

  ponerNaveJugador(naveId, empresa) {
    if (this.jugador) this.scene.remove(this.jugador.grupo);
    const grupo = new THREE.Group();
    const modelo = instanciaUnica(`nave_${naveId}`);
    pintar(modelo, empresa);
    grupo.add(modelo);
    this.scene.add(grupo);
    const materiales = [];
    modelo.traverse((o) => { if (o.isMesh) materiales.push(o.material); });
    const def = ASSETS[`nave_${naveId}`];
    const motores = this.fx.agregarMotores(modelo, def);
    this.jugador = { grupo, modelo, naveId, empresa, materiales, motores, tam: def.tam };
  }

  crearNpc(n) {
    const grupo = new THREE.Group();
    const modelo = instanciaUnica(`npc_${n.tipo}`);
    pintar(modelo, n.empresa);
    grupo.add(modelo);
    this.scene.add(grupo);

    // Barra de vida: dos planos que siempre miran a la cámara
    const barra = new THREE.Group();
    const fondo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x20252f, depthTest: false }));
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0.5, 0, 0); // ancla a la izquierda para escalar en X
    const relleno = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: EMPRESAS[n.empresa]?.color ?? 0xff6a5c, depthTest: false }));
    relleno.position.set(-0.5, 0, 0.01);
    barra.add(fondo, relleno);
    barra.renderOrder = 5;
    fondo.renderOrder = 5;
    relleno.renderOrder = 6;
    barra.visible = false;
    this.scene.add(barra);

    const tam = ASSETS[`npc_${n.tipo}`].tam;
    barra.scale.set(Math.max(50, tam * 0.7), 5, 1);
    const motores = this.fx.agregarMotores(modelo, ASSETS[`npc_${n.tipo}`]);
    return { grupo, modelo, barra, relleno, tam, motores };
  }

  crearDron(d) {
    const id = `dron_${d.tipo === 'ataque' ? 'ataque' : 'reparacion'}_${d.bando === 'jugador' ? 'azul' : 'rojo'}`;
    const def = ASSETS[id], grupo = new THREE.Group(), modelo = instanciaUnica(id);
    if (d.tipo === 'sanguijuela') pintar(modelo, 'sirko');
    else encenderLuces(modelo);
    grupo.add(modelo);
    this.scene.add(grupo);
    def.motores ??= detectarToberas(modelo, def.tam);
    return { grupo, modelo, tam: def.tam, motores: this.fx.agregarMotores(modelo, def), haz: this.fx.crearHaz(d.tipo === 'sanguijuela') };
  }

  // Crea y borra objetos para reflejar una lista de la simulación
  sincronizarLista(mapa, lista, crear) {
    const vivos = new Set();
    for (const e of lista) {
      vivos.add(e.id);
      if (!mapa.has(e.id)) mapa.set(e.id, crear(e));
    }
    for (const [id, v] of mapa) {
      if (!vivos.has(id)) {
        this.scene.remove(v.grupo || v);
        if (v.barra) this.scene.remove(v.barra);
        if (v.haz) this.scene.remove(v.haz);
        mapa.delete(id);
      }
    }
  }

  sincronizar(s, alfa, dtCuadro) {
    const j = s.jugador, t = performance.now() / 1000;
    const lerp = (a, b) => a + (b - a) * alfa;
    const lerpAng = (a, b) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * alfa;

    // Jugador
    if (this.jugador?.naveId !== j.naveId || this.jugador.empresa !== j.empresa) this.ponerNaveJugador(j.naveId, j.empresa);
    const jx = lerp(j.px, j.x), jz = lerp(j.pz, j.z);
    const v = this.jugador;
    v.grupo.visible = !j.muerto;
    v.grupo.position.set(jx, ALTURA_NAVES + Math.sin(t * 1.8) * 2, jz);
    v.grupo.rotation.y = lerpAng(j.ph, j.h);
    v.modelo.rotation.z = THREE.MathUtils.clamp(-j.giroVel * 0.14, -0.35, 0.35); // se ladea al girar
    const st = statsJugador(j);
    this.fx.mostrarMotores(v.motores, !j.efectos.invisible);
    this.fx.animarMotores(v.motores, j.vel, naveDe(j.naveId).velocidad, dtCuadro, t);
    const opacidad = j.efectos.invisible ? 0.3 : 1;
    if (v.materiales[0].opacity !== opacidad) {
      for (const m of v.materiales) {
        m.opacity = opacidad;
        m.transparent = opacidad < 1;
        m.needsUpdate = true;
      }
    }

    this.anilloJugador.visible = !j.muerto;
    this.anilloJugador.position.set(jx, ALTURA_NAVES - 12, jz);
    this.anilloJugador.scale.setScalar(v.tam * 1.3);
    this.anilloJugador.rotation.y = -t * 0.5;

    this.fx.animarEscudo(v.grupo.position, v.tam, !!j.efectos.barrera && !j.muerto, !!j.efectos.blindaje && !j.muerto, dtCuadro);

    // Humo con poco casco y brillos al repararse, a ritmo fijo sin importar los FPS
    this.relojEmision += dtCuadro;
    const emitir = this.relojEmision > 0.09;
    if (emitir) {
      this.relojEmision = 0;
      if (!j.muerto && j.casco / st.casco < CASCO_CRITICO) this.fx.humoDeDanio(jx, jz, v.tam);
    }

    // Seguimiento suave de la cámara
    const suave = this.saltoCamara ? 1 : 1 - Math.exp(-dtCuadro * 6); // al cambiar de mapa no hay viaje
    this.saltoCamara = false;
    this.foco.x += (jx - this.foco.x) * suave;
    this.foco.z += (jz - this.foco.z) * suave;
    this.camara.position.copy(this.foco).add(this.desfase);
    this.camara.lookAt(this.foco);
    this.camara.updateMatrixWorld();
    this.posNave.set(jx, ALTURA_NAVES, jz);
    if (this.libre.activa) this.libre.actualizar(dtCuadro, this.posNave, v);
    const vista = this.libre.activa ? this.libre.camara : this.camara;
    vista.updateMatrixWorld();

    // Fondo con paralaje, en píxeles de pantalla
    this.derecha.setFromMatrixColumn(vista.matrixWorld, 0);
    this.arriba.setFromMatrixColumn(vista.matrixWorld, 1);
    if (this.libre.activa) {
      const giro = vista.rotation, px = innerHeight * PARALAJE_LIBRE;
      this.fondo.dibujar(-giro.y * px, giro.x * px);
    } else {
      const pxPorUnidad = innerHeight / this.altoVisible;
      this.fondo.dibujar(this.foco.dot(this.derecha) * pxPorUnidad, this.foco.dot(this.arriba) * pxPorUnidad);
    }

    // NPC
    this.sincronizarLista(this.npcs, s.npcs, (n) => this.crearNpc(n));
    for (const n of s.npcs) {
      const o = this.npcs.get(n.id), x = lerp(n.px, n.x), z = lerp(n.pz, n.z);
      o.grupo.position.set(x, ALTURA_NAVES + Math.sin(t * 1.5 + n.id) * 3, z);
      o.grupo.rotation.y = lerpAng(n.ph, n.h);
      o.modelo.rotation.z = THREE.MathUtils.clamp(-n.giroVel * 0.14, -0.35, 0.35);
      const max = NPCS[n.tipo].casco;
      this.fx.animarMotores(o.motores, n.vel, NPCS[n.tipo].velocidad, dtCuadro, t);
      if (emitir && n.casco / max < CASCO_CRITICO) this.fx.humoDeDanio(x, z, o.tam);
      o.barra.visible = n.casco < max || n.id === j.objetivoId;
      if (o.barra.visible) {
        o.barra.position.set(x, ALTURA_NAVES, z).addScaledVector(this.arriba, o.tam * 0.6);
        o.barra.quaternion.copy(vista.quaternion);
        o.relleno.scale.x = Math.max(0, n.casco / max);
      }
    }

    // Objetivo y destino
    const sel = j.objetivoId != null ? this.npcs.get(j.objetivoId) ?? this.drones.get(j.objetivoId) : null;
    this.anilloObjetivo.visible = !!sel;
    if (sel) {
      this.anilloObjetivo.position.set(sel.grupo.position.x, ALTURA_NAVES - 12, sel.grupo.position.z);
      this.anilloObjetivo.scale.setScalar(sel.tam * 1.7);
      this.anilloObjetivo.rotation.y = t * 0.8;
      this.anilloObjetivo.material.color.set(j.atacando ? 0xff6a5c : 0xffc46a);
    }
    this.marcaDestino.visible = !!j.dest;
    if (j.dest) {
      this.marcaDestino.position.set(j.dest.x, ALTURA_NAVES, j.dest.z); // en el plano que apunta el mouse
      this.marcaDestino.rotation.y = t * 1.5;
    }

    // Drones escolta
    this.sincronizarLista(this.drones, s.drones, (d) => this.crearDron(d));
    for (const d of s.drones) {
      const o = this.drones.get(d.id), x = lerp(d.px, d.x), z = lerp(d.pz, d.z);
      o.grupo.visible = d.dueno !== j || !j.muerto;
      o.grupo.position.set(x, ALTURA_NAVES + 8 + Math.sin(t * 2 + d.id) * 3, z);
      o.grupo.rotation.y = lerpAng(d.ph, d.h);
      this.fx.mostrarMotores(o.motores, d.dueno !== j || !j.efectos.invisible);
      this.fx.animarMotores(o.motores, 1, 1, dtCuadro, t);
      o.haz.visible = !!d.conectado;
      if (d.conectado) this.fx.ubicarHaz(o.haz, x, z, jx, jz);
    }

    // Botín, minas y zonas de reparación
    this.sincronizarLista(this.botin, s.botin, () => { const o = instancia('botin'); this.scene.add(o); return o; });
    for (const b of s.botin) {
      const o = this.botin.get(b.id);
      o.position.set(b.x, ALTURA_NAVES + Math.sin(t * 2 + b.id) * 4, b.z);
      o.rotation.y = t * 0.9;
      o.visible = b.vida > 8 || Math.sin(t * 10) > 0; // parpadea antes de desaparecer
    }
    this.sincronizarLista(this.minas, s.minas, () => { const o = instancia('mina'); this.scene.add(o); return o; });
    for (const m of s.minas) {
      const o = this.minas.get(m.id);
      o.position.set(m.x, ALTURA_NAVES, m.z);
      o.rotation.y = t * 1.4;
    }
    this.sincronizarLista(this.zonasCura, s.zonasCura, (z) => {
      const o = planoFx(texturasFx.circulo, z.radio * RADIO_CIRCULO, 0x6be89a, 0.9);
      o.position.set(z.x, 3, z.z);
      this.scene.add(o);
      return o;
    });
    for (const o of this.zonasCura.values()) o.rotation.z += dtCuadro * 0.8;

    this.fx.dibujarLaseres(s.proyectiles, lerp);

    // Decoración
    for (const a of this.flotantes) {
      a.rotation.y += a.userData.giro * dtCuadro;
      a.rotation.x += a.userData.giro * 0.5 * dtCuadro;
    }
    if (this.planeta) this.planeta.rotation.y += 0.01 * dtCuadro;
    if (this.base) this.base.rotation.y += 0.015 * dtCuadro;
    for (const p of this.portales) p.rotation.y += 0.8 * dtCuadro;
    for (const z of this.zonasPortal) z.rotation.z += 0.03 * dtCuadro;
    if (this.mapaActual === 'centro') {
      this.relojGuerra = (this.relojGuerra ?? 0) + dtCuadro;
      if (this.relojGuerra > RITMO_GUERRA) {
        this.relojGuerra = 0;
        const a = Math.random() * 6.28, r = 150 + Math.random() * 420;
        this.fx.explosion(Math.cos(a) * r, Math.sin(a) * r, 0.5);
      }
    }
    this.zona.rotation.z += 0.03 * dtCuadro;

    this.fx.actualizar(dtCuadro);
    this.renderer.render(this.scene, vista);
  }

  procesarEvento(ev) {
    if (ev.t === 'mapa') return this.ponerMapa(ev.id);
    if (ev.t !== 'disparo') return this.fx.procesar(ev);
    const v = ev.id === 0 ? this.jugador : this.npcs.get(ev.id) ?? this.drones.get(ev.id);
    if (v) this.fx.fogonazo(ev.x, ev.z, ev.ang, ev.empresa, v.tam);
  }
}
