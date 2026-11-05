// Banco de pruebas del visor: acciona sobre una nave los mismos efectos que usa el juego.
import { COMBATE } from './data.js';
import { Efectos, ALTURA_NAVES } from './fx.js';
import { encenderLuces } from './models.js';

const ALCANCE = 600;        // hasta dónde vuelan los disparos de prueba
const CADENCIA = 0.35;      // segundos entre disparos con fuego continuo
const RITMO_EMISION = 0.09; // igual que en el juego: humo y brillos a ritmo fijo
const ESPERA_REAPARICION = 1.8;
const sinInterpolar = (a, b) => b;

export class BancoEfectos {
  constructor(scene) {
    this.fx = new Efectos(scene);
    this.lasers = [];
    this.nave = null;
  }

  // La nave queda en el origen con la nariz hacia +Z, a la altura donde el juego pone los efectos
  poner(modelo, def, bando) {
    modelo.position.y = ALTURA_NAVES;
    encenderLuces(modelo);
    this.materiales = []; // antes de agregar los motores: sus materiales se comparten
    modelo.traverse((o) => { if (o.isMesh) this.materiales.push(o.material); });
    this.nave = { modelo, tam: def.tam, bando, motores: this.fx.agregarMotores(modelo, def) };
    this.reiniciar();
  }

  quitar() {
    this.nave = null;
    this.lasers = [];
    this.fx.dibujarLaseres(this.lasers, sinInterpolar);
    this.fx.escudo.visible = false;
  }

  reiniciar() {
    this.empuje = 0.6;
    this.activos = new Set(); // efectos continuos encendidos
    this.relojDisparo = 0;
    this.relojEmision = 0;
    this.reaparece = 0;
  }

  // Punto al azar sobre el casco, para que los golpes no caigan siempre en el centro
  puntoCasco() {
    const r = this.nave.tam * 0.3;
    return { x: (Math.random() - 0.5) * 2 * r, z: (Math.random() - 0.5) * 2 * r };
  }

  disparar() {
    const { tam, bando } = this.nave;
    this.fx.fogonazo(0, 0, 0, bando, tam);
    this.lasers.push({ x: 0, z: tam * 0.5, px: 0, pz: tam * 0.5, objetivo: { x: 0, z: ALCANCE }, empresa: bando });
  }

  // Efectos de una sola vez
  accionar(id) {
    const { tam } = this.nave, p = this.puntoCasco();
    if (id === 'disparo') this.disparar();
    else if (id === 'casco') this.fx.impacto(p.x, p.z, false);
    else if (id === 'escudo') this.fx.impacto(p.x, p.z, true);
    else if (id === 'pulso') this.fx.procesar({ t: 'pulso', x: 0, z: 0 });
    else if (id === 'rayo') this.fx.rayo(0, tam * 0.5, 0, ALCANCE + tam);
    else if (id === 'explosion') {
      this.fx.explosion(0, 0, 1.8);
      this.nave.modelo.visible = false;
      this.reaparece = ESPERA_REAPARICION;
    }
  }

  alternar(id) {
    if (!this.activos.delete(id)) this.activos.add(id);
    const invisible = this.activos.has('invisible');
    for (const m of this.materiales) {
      m.opacity = invisible ? 0.3 : 1;
      m.transparent = invisible;
      m.needsUpdate = true;
    }
    return this.activos.has(id);
  }

  cuadro(dt) {
    const { nave, activos, fx } = this;
    if (!nave) return;
    const t = performance.now() / 1000;
    fx.mostrarMotores(nave.motores, !activos.has('invisible'));
    fx.animarMotores(nave.motores, this.empuje, 1, dt, t);
    fx.animarEscudo(nave.modelo.position, nave.tam, activos.has('barrera'), activos.has('blindaje'), dt);

    if (this.reaparece > 0) {
      this.reaparece -= dt;
      if (this.reaparece <= 0) {
        nave.modelo.visible = true;
        fx.procesar({ t: 'reaparecio', x: 0, z: 0 });
      }
    }

    if (activos.has('fuego')) {
      this.relojDisparo -= dt;
      if (this.relojDisparo <= 0) {
        this.relojDisparo = CADENCIA;
        this.disparar();
      }
    }
    this.lasers = this.lasers.filter((l) => {
      l.z += COMBATE.velocidadLaser * dt;
      if (l.z < ALCANCE) return true;
      fx.impacto(0, ALCANCE, false);
      return false;
    });
    fx.dibujarLaseres(this.lasers, sinInterpolar);

    this.relojEmision += dt;
    if (this.relojEmision > RITMO_EMISION) {
      this.relojEmision = 0;
      if (activos.has('humo')) fx.humoDeDanio(0, 0, nave.tam);
    }
    fx.actualizar(dt);
  }
}
