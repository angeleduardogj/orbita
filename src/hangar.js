// Hangar: selector de naves con visor 3D giratorio, estadísticas y compra/equipo.
import * as THREE from 'three';
import { NAVES, NIVELES, LASERES, MISILES, ARMAMENTO, TIPOS } from './data.js';
import { ASSETS } from './assetmap.js';
import { instanciaUnica, agregarLuces, pintar, montarArmas, fotoNave, fotoArma } from './models.js';
import { encenderCabina } from './fx.js';
import { socketsDe, comprarNave, equiparNave, faltaParaComprar, mejorarArma, instalarArma, precioMejora, puedeUsarHangar, equipoDe, armasMontadas, potenciaDe, cabeEnNave } from './sim.js';

const $ = (id) => document.getElementById(id);
const num = (n) => Math.round(n).toLocaleString('es-MX');

// Solo se ofrecen las naves que ya tienen modelo asignado en assetmap.js
const DISPONIBLES = NAVES.filter((n) => ASSETS[`nave_${n.id}`]);
const CATALOGOS = { laser: LASERES, misil: MISILES };
const CLASES = { laser: 'Láser', misil: 'Lanzamisiles', utilidad: 'Utilidad' };
const mayor = (campo) => Math.max(...DISPONIBLES.map((n) => n[campo]));
const pips = (nivel) => `<span class="pips">${Array.from({ length: ARMAMENTO.nivelMaximo }, (_, i) => `<i class="${i < nivel ? 'on' : ''}"></i>`).join('')}</span>`;

export class Hangar {
  constructor(s) {
    this.s = s;
    this.abierto = false;
    this.seleccion = s.jugador.naveId;
    this.renderer = null; // el visor se crea la primera vez que se abre

    this.botones = new Map();
    this.socket = null; // { clase, i } abierto en el panel de detalle
    for (const n of DISPONIBLES) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.innerHTML = `<img alt=""><span>${n.nombre}</span><small></small>`;
      b.addEventListener('click', () => this.elegir(n.id));
      li.append(b);
      li.dataset.tipo = n.tipo;
      $('hangar-lista').append(li);
      this.botones.set(n.id, b);
    }
    const tipos = [...new Set(DISPONIBLES.map((n) => n.tipo))];
    $('hangar-tipos').innerHTML = `<button data-tipo="" class="sel">Todas</button>${tipos.map((t) => `<button data-tipo="${t}">${TIPOS[t].nombre}</button>`).join('')}`;
    $('hangar-tipos').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      for (const x of $('hangar-tipos').children) x.classList.toggle('sel', x === b);
      for (const li of $('hangar-lista').children) li.hidden = !!b.dataset.tipo && li.dataset.tipo !== b.dataset.tipo;
    });
    $('hangar-cerrar').addEventListener('click', () => this.cerrar());
    $('hd-boton').addEventListener('click', () => this.accion());
    $('hd-armas').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const { clase, socket } = b.dataset, mismo = this.socket?.clase === clase && this.socket.i === +socket;
      this.socket = mismo ? null : { clase, i: +socket };
      this.pintar();
    });
    $('hd-detalle').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const { clase, i } = this.socket ?? {}, { accion, arma } = b.dataset;
      if (accion === 'volver') this.socket = null;
      else if (accion === 'mejorar') this.cambio = mejorarArma(this.s, this.seleccion, clase, i);
      else if (accion === 'quitar') instalarArma(this.s, this.seleccion, clase, i, '');
      else if (accion === 'instalar') this.cambio = instalarArma(this.s, this.seleccion, clase, i, arma);
      this.pintar();
    });
  }

  crearVisor() {
    const canvas = $('hangar-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.escena = new THREE.Scene();
    agregarLuces(this.escena);
    this.camara = new THREE.PerspectiveCamera(30, 1, 1, 3000);
    this.camara.position.set(0, 190, 330);
    this.camara.lookAt(0, 0, 0);
    this.pedestal = new THREE.Group();
    this.escena.add(this.pedestal);
    // Luces de contorno, para despegar la nave del fondo
    const contorno = new THREE.DirectionalLight(0xdfe6f2, 2), calida = new THREE.DirectionalLight(0xffffff, 0.6);
    contorno.position.set(-2, 1, -3);
    calida.position.set(3, 0.5, 1);
    this.escena.add(contorno, calida);
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
    document.querySelector('.ventana').animate([{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'ease-out' });
    for (const [id, b] of this.botones) b.querySelector('img').src = fotoNave(`nave_${id}`, this.s.jugador.empresa);
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
    this.socket = null;
    this.entrada = 0;
    this.pedestal.clear();
    // En el visor todas se ven a un tamaño cómodo; el tamaño real está en la lista
    const modelo = instanciaUnica(`nave_${id}`);
    pintar(modelo, this.s.jugador.empresa);
    encenderCabina(modelo, ASSETS[`nave_${id}`]);
    modelo.scale.setScalar(150 / ASSETS[`nave_${id}`].tam);
    this.modelo = modelo;
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
    const f = 1 + NIVELES.bonusPorNivel * (j.nivel - 1), p = potenciaDe(j, n.id), tipo = TIPOS[n.tipo], equipo = equipoDe(j, n.id);
    montarArmas(this.modelo, `nave_${n.id}`, armasMontadas(j, n.id));

    $('hangar-saldo').textContent = `${num(j.creditos)} créditos · ${num(j.plasmita)} plasmita`;
    for (const nave of DISPONIBLES) {
      const b = this.botones.get(nave.id), tiene = j.naves.includes(nave.id);
      const etiqueta = nave.id === j.naveId ? 'Equipada' : tiene ? 'Tuya' : `Nv. ${nave.nivel}`;
      b.querySelector('small').textContent = etiqueta;
      b.classList.toggle('sel', nave.id === this.seleccion);
      b.classList.toggle('equipada', nave.id === j.naveId);
    }

    $('hd-nombre').textContent = n.nombre;
    $('hd-tipo').textContent = tipo.nombre;
    const barra = (nombre, valor, fraccion) => `<div class="cifra"><dt>${nombre}</dt><dd>${valor}</dd><span class="medida"><i style="width:${Math.min(100, fraccion * 100)}%"></i></span></div>`;
    const dato = (nombre, valor) => `<div class="cifra"><dt>${nombre}</dt><dd>${valor}</dd></div>`;
    $('hd-stats').innerHTML = barra('Casco', num(n.casco * f), n.casco / mayor('casco'))
      + barra('Escudo', num(n.escudo * f), n.escudo / mayor('escudo'))
      + barra('Daño', num(p.danio), p.danio / (mayor('danio') * f))
      + barra('Alcance', num(p.alcance), p.alcance / mayor('alcance'))
      + barra('Velocidad', num(n.velocidad), n.velocidad / mayor('velocidad'))
      + dato('Disparos/s', (1 / p.cadencia).toFixed(1))
      + dato('Disparo', n.torretas ? 'Lateral' : 'Frontal')
      + dato('Drones', tipo.drones);
    $('hd-especial').innerHTML = `<b>${n.especial.nombre}</b>${n.especial.desc}`;

    const tiene = j.naves.includes(n.id), boton = $('hd-boton');
    const precio = n.creditos === 0 ? 'Gratis'
      : `${num(n.creditos)} créditos` + (n.plasmita ? ` + ${num(n.plasmita)} plasmita` : '');
    $('hd-precio').textContent = tiene ? '' : `Nivel ${n.nivel} · ${precio}`;
    const falta = tiene ? null : faltaParaComprar(j, n);
    boton.textContent = !tiene ? 'Comprar' : n.id === j.naveId ? 'Equipada' : 'Equipar';
    boton.disabled = !!falta || n.id === j.naveId;
    $('hd-nota').textContent = falta || '';
    this.pintarArmas();
  }

  pintarArmas() {
    const equipo = equipoDe(this.s.jugador, this.seleccion);
    const ficha = (clase, a, i) => {
      const sel = this.socket?.clase === clase && this.socket.i === i ? 'sel' : '';
      const dentro = a ? `<img src="${fotoArma(a.id, a.nivel)}" alt="">${pips(a.nivel)}` : `<b>${clase === 'utilidad' ? '' : '+'}</b>`;
      return `<button class="slot ${clase} ${sel} ${a ? '' : 'vacio'}" data-clase="${clase}" data-socket="${i}" aria-label="${CLASES[clase]} ${i + 1}">${dentro}</button>`;
    };
    $('hd-armas').innerHTML = Object.keys(CLASES).filter((c) => equipo[c].length).map((c) => {
      const llenos = equipo[c].filter(Boolean).length;
      return `<section><h3>${CLASES[c]} <span>${llenos}/${equipo[c].length}</span></h3><div class="slots">${equipo[c].map((a, i) => ficha(c, a, i)).join('')}</div></section>`;
    }).join('');
    if (this.cambio && this.socket) { // la ficha cambiada salta para confirmar la compra
      $('hd-armas').querySelector('.slot.sel')?.animate([{ transform: 'scale(1.18)' }, { transform: 'scale(1)' }], 240);
    }
    this.cambio = false;
    this.pintarDetalle(equipo);
  }

  // Línea de plano desde el socket abierto hasta su etiqueta
  dibujarCota() {
    const puesto = this.socket && socketsDe(this.seleccion)[this.socket.clase]?.[this.socket.i], cota = $('hd-cota');
    cota.hidden = !puesto;
    if (!puesto) return;
    const { tam } = ASSETS[`nave_${this.seleccion}`], lienzo = this.renderer.domElement, ancho = lienzo.clientWidth, alto = lienzo.clientHeight;
    this.modelo.updateWorldMatrix(true, false);
    const p = this.modelo.localToWorld(new THREE.Vector3(puesto[0] * tam, puesto[1] * tam, puesto[2] * tam)).project(this.camara);
    const x = (p.x + 1) / 2 * ancho, y = (1 - p.y) / 2 * alto, codo = ancho - 150, arriba = 62;
    $('cota-punto').setAttribute('cx', x);
    $('cota-punto').setAttribute('cy', y);
    $('cota-linea').setAttribute('points', `${x},${y} ${codo},${arriba} ${ancho - 18},${arriba}`);
    const arma = equipoDe(this.s.jugador, this.seleccion)[this.socket.clase][this.socket.i];
    const texto = `${CLASES[this.socket.clase]} ${this.socket.i + 1}<b>${arma ? `${CATALOGOS[this.socket.clase][arma.id].nombre} Nv ${arma.nivel}` : 'Vacío'}</b>`;
    if (texto !== this.textoCota) $('cota-texto').innerHTML = this.textoCota = texto;
  }

  // Panel del socket abierto: el arma puesta, su mejora y lo que se le puede instalar
  pintarDetalle(equipo) {
    const abierto = !!this.socket, datos = document.querySelector('.hangar-datos');
    $('hd-detalle').hidden = !abierto;
    datos.classList.toggle('con-socket', abierto);
    if (!abierto) return;
    const j = this.s.jugador, id = this.seleccion, { clase, i } = this.socket;
    const propia = j.naves.includes(id), activo = puedeUsarHangar(this.s) && propia;
    const volver = '<button class="volver" data-accion="volver">Volver a la nave</button>';
    const titulo = `<h3>${CLASES[clase]} · Socket ${i + 1}</h3>`;
    if (clase === 'utilidad') {
      $('hd-detalle').innerHTML = `${volver}${titulo}<p>Aquí irán radares, equipo de minería y bodega extra. Llegarán pronto.</p>`;
      return;
    }
    const arma = equipo[clase][i], catalogo = CATALOGOS[clase];
    let actual = '<p>Este socket está vacío. Elige un arma.</p>';
    if (arma) {
      const a = catalogo[arma.id], precio = precioMejora(arma);
      const mejora = precio === null ? '<small>Nivel máximo</small>'
        : `<button class="principal" data-accion="mejorar" ${!activo || j.creditos < precio ? 'disabled' : ''}><img src="${fotoArma(arma.id, arma.nivel + 1)}" alt="">Subir a Nv ${arma.nivel + 1} · ${num(precio)}</button>`;
      actual = `<div class="actual"><img src="${fotoArma(arma.id, arma.nivel)}" alt=""><div><b>${a.nombre}</b>${pips(arma.nivel)}<small>Nivel ${arma.nivel} de ${ARMAMENTO.nivelMaximo}</small></div></div>${mejora}
        <button class="secundario" data-accion="quitar" ${activo ? '' : 'disabled'}>Quitar arma</button>`;
    }
    const datosArma = (a) => (clase === 'laser'
      ? `Daño ×${a.danio} · Cadencia ×${a.cadencia} · Alcance ×${a.alcance}`
      : `Daño ×${a.danio} · Recarga ${a.recarga} s · Velocidad ${a.velocidad}`);
    const tarjeta = (a) => {
      const cabe = cabeEnNave(id, a.id), puesta = a.id === arma?.id;
      const texto = puesta ? 'Instalada' : !cabe ? 'No cabe en esta nave' : `Instalar · ${a.precio ? num(a.precio) : 'Gratis'}`;
      return `<li class="${puesta ? 'puesta' : ''}"><img src="${fotoArma(a.id)}" alt=""><div><b>${a.nombre}</b><small>${a.desc}</small><small class="cifras">${datosArma(a)}</small>
        <button data-accion="instalar" data-arma="${a.id}" ${puesta || !cabe || !activo || j.creditos < a.precio ? 'disabled' : ''}>${texto}</button></div></li>`;
    };
    const aviso = !propia ? '<small class="aviso-nave">Compra la nave para equiparla.</small>'
      : arma ? '<small class="aviso-nave">Instalar otra reemplaza la actual, sin devolver su precio.</small>' : '';
    $('hd-detalle').innerHTML = `${volver}${titulo}${actual}<h3>Arsenal</h3>${aviso}<ul class="arsenal">${Object.values(catalogo).map(tarjeta).join('')}</ul>`;
  }

  actualizar(dt) {
    if (!this.abierto) return;
    if (!this.socket) this.pedestal.rotation.y += dt * 0.5; // quieta para ubicar el socket
    this.entrada = Math.min(1, this.entrada + dt * 4);
    this.pedestal.scale.setScalar(0.9 + 0.1 * (1 - (1 - this.entrada) ** 3));
    this.renderer.render(this.escena, this.camara);
    this.dibujarCota();
  }
}
