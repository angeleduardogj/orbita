// Hangar: selector de naves con visor 3D giratorio, estadísticas y compra/equipo.
import * as THREE from 'three';
import { NAVES, NIVELES } from './data.js';
import { ASSETS } from './assetmap.js';
import { instanciaUnica, agregarLuces, pintar } from './models.js';
import { encenderCabina } from './fx.js';
import { comprarNave, equiparNave, faltaParaComprar } from './sim.js';

const $ = (id) => document.getElementById(id);
const num = (n) => Math.round(n).toLocaleString('es-MX');

// Solo se ofrecen las naves que ya tienen modelo asignado en assetmap.js
const DISPONIBLES = NAVES.filter((n) => ASSETS[`nave_${n.id}`]);

export class Hangar {
  constructor(s) {
    this.s = s;
    this.abierto = false;
    this.seleccion = s.jugador.naveId;
    this.renderer = null; // el visor se crea la primera vez que se abre

    this.botones = new Map();
    for (const n of DISPONIBLES) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.addEventListener('click', () => this.elegir(n.id));
      li.append(b);
      $('hangar-lista').append(li);
      this.botones.set(n.id, b);
    }
    $('hangar-cerrar').addEventListener('click', () => this.cerrar());
    $('hd-boton').addEventListener('click', () => this.accion());
  }

  crearVisor() {
    const canvas = $('hangar-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.escena = new THREE.Scene();
    agregarLuces(this.escena);
    this.camara = new THREE.PerspectiveCamera(30, 1, 1, 3000);
    this.camara.position.set(0, 190, 330);
    this.camara.lookAt(0, 0, 0);
    this.pedestal = new THREE.Group();
    this.escena.add(this.pedestal);
    addEventListener('resize', () => this.abierto && this.ajustarVisor());
  }

  ajustarVisor() {
    const c = this.renderer.domElement.parentElement;
    this.renderer.setSize(c.clientWidth, c.clientHeight, false);
    this.camara.aspect = c.clientWidth / c.clientHeight;
    this.camara.updateProjectionMatrix();
  }

  abrir() {
    if (this.abierto) return;
    this.abierto = true;
    $('hangar').hidden = false;
    if (!this.renderer) this.crearVisor();
    this.ajustarVisor();
    this.elegir(this.s.jugador.naveId);
  }

  cerrar() {
    this.abierto = false;
    $('hangar').hidden = true;
  }

  alternar() {
    this.abierto ? this.cerrar() : this.abrir();
  }

  elegir(id) {
    this.seleccion = id;
    this.pedestal.clear();
    // En el visor todas se ven a un tamaño cómodo; el tamaño real está en la lista
    const modelo = instanciaUnica(`nave_${id}`);
    pintar(modelo, this.s.jugador.empresa);
    encenderCabina(modelo, ASSETS[`nave_${id}`]);
    modelo.scale.setScalar(150 / ASSETS[`nave_${id}`].tam);
    this.pedestal.add(modelo);
    this.pintar();
  }

  accion() {
    const j = this.s.jugador, id = this.seleccion;
    if (j.naves.includes(id)) equiparNave(this.s, id);
    else comprarNave(this.s, id);
    this.pintar();
  }

  pintar() {
    const j = this.s.jugador, n = NAVES.find((x) => x.id === this.seleccion);
    const f = 1 + NIVELES.bonusPorNivel * (j.nivel - 1);

    $('hangar-saldo').textContent = `${num(j.creditos)} créditos · ${num(j.plasmita)} plasmita`;
    for (const nave of DISPONIBLES) {
      const b = this.botones.get(nave.id), tiene = j.naves.includes(nave.id);
      const etiqueta = nave.id === j.naveId ? 'Equipada' : tiene ? 'Tuya' : `Nv. ${nave.nivel}`;
      b.innerHTML = `<span>${nave.nombre}</span><small>${etiqueta}</small>`;
      b.classList.toggle('sel', nave.id === this.seleccion);
      b.classList.toggle('equipada', nave.id === j.naveId);
    }

    $('hd-nombre').textContent = n.nombre;
    const filas = [
      ['Casco', num(n.casco * f)], ['Escudo', num(n.escudo * f)],
      ['Daño por disparo', num(n.danio * f)], ['Disparos por segundo', (1 / n.cadencia).toFixed(1)],
      ['Alcance', num(n.alcance)], ['Velocidad', num(n.velocidad)],
    ];
    $('hd-stats').innerHTML = filas.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    $('hd-especial').innerHTML = `<b>${n.especial.nombre}</b>${n.especial.desc}`;

    const tiene = j.naves.includes(n.id), boton = $('hd-boton');
    const precio = n.creditos === 0 ? 'Gratis'
      : `${num(n.creditos)} créditos` + (n.plasmita ? ` + ${num(n.plasmita)} plasmita` : '');
    $('hd-precio').textContent = tiene ? '' : `Nivel ${n.nivel} · ${precio}`;
    const falta = tiene ? null : faltaParaComprar(j, n);
    boton.textContent = !tiene ? 'Comprar' : n.id === j.naveId ? 'Equipada' : 'Equipar';
    boton.disabled = !!falta || n.id === j.naveId;
    $('hd-nota').textContent = falta || '';
  }

  actualizar(dt) {
    if (!this.abierto) return;
    this.pedestal.rotation.y += dt * 0.7;
    this.renderer.render(this.escena, this.camara);
  }
}
