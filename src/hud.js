// HUD en DOM: barras, recursos, objetivo, minimapa, habilidades y mensajes.
import { MUNDO, NPCS, NIVELES, HABILIDADES, PILOTO, RANGOS, EMPRESAS, MAPAS, RADIO_PORTAL, nombreSector } from './data.js';
import { fotoNave, fotoAsset, fotoArma, fotoPieza } from './models.js';
import { ICONOS } from './assetmap.js';
import { naveDe, statsJugador, objetivoActual, distBorde, enZonaSegura, puedeUsarHangar, hayZonaSegura, portalCercano, estadoMisiles, equipoDe } from './sim.js';

const $ = (id) => document.getElementById(id);
const num = (n) => Math.ceil(n).toLocaleString('es-MX');

const rangoDe = (nivel) => RANGOS.filter((r) => r.nivel <= nivel).at(-1);

// Dibujo del rango: galones, barras o estrellas
function insignia({ nombre, insignia: forma, cantidad }) {
  const piezas = Array.from({ length: cantidad }, (_, i) => {
    const centro = 10 + (i - (cantidad - 1) / 2) * 4.5;
    if (forma === 'galon') return `<path d="M3 ${centro + 2.5}L10 ${centro - 2.5}L17 ${centro + 2.5}" fill="none" stroke="currentColor" stroke-width="2.4"/>`;
    if (forma === 'barra') return `<rect x="3" y="${centro - 1.6}" width="14" height="3.2" fill="currentColor"/>`;
    // Una estrella grande o tres en triángulo, para que se distingan a este tamaño
    const [cx, cy] = cantidad > 1 ? [[10, 5.5], [5, 14.5], [15, 14.5]][i] : [10, 10];
    const r = cantidad > 1 ? 5.4 : 8, puntas = Array.from({ length: 10 }, (_, k) => {
      const a = -Math.PI / 2 + (k * Math.PI) / 5, largo = k % 2 ? r * 0.45 : r;
      return `${(cx + Math.cos(a) * largo).toFixed(1)},${(cy + Math.sin(a) * largo).toFixed(1)}`;
    });
    return `<polygon points="${puntas.join(' ')}" fill="currentColor"/>`;
  });
  return `<svg class="insignia" viewBox="0 0 20 20" role="img" aria-label="${nombre}">${piezas.join('')}</svg>`;
}

const NOMBRES_EFECTO = {
  impulso: 'Impulso', reparacion: 'Reparación', barrera: 'Barrera', rafaga: 'Ráfaga',
  blindaje: 'Casco reforzado', invisible: 'Invisible', asedio: 'Modo asedio',
};

const MAX_NUMEROS = 16;
const RANURAS = ['impulso', 'reparacion', 'barrera', 'especial'];
const LISTO = [{ filter: 'brightness(2.2)' }, { filter: 'brightness(1)' }];
const GOLPE = [{ opacity: 0.85 }, { opacity: 0 }];

export class Hud {
  constructor({ alUsar }) {
    this.g = $('minimapa').getContext('2d');
    this.botones = {};
    for (const slot of RANURAS) {
      const b = document.createElement('button');
      b.className = 'habilidad' + (slot === 'especial' ? ' especial' : '');
      b.innerHTML = `<kbd>${RANURAS.indexOf(slot) + 1}</kbd><img alt=""><span class="nombre"></span><div class="sombra"></div><div class="tiempo"></div>`;
      b.addEventListener('click', () => alUsar(slot));
      $('habilidades').append(b);
      this.botones[slot] = { b, img: b.querySelector('img'), nombre: b.querySelector('.nombre'), sombra: b.querySelector('.sombra'), tiempo: b.querySelector('.tiempo') };
      if (ICONOS[slot]) fotoPieza(ICONOS[slot]).then((url) => { this.botones[slot].img.src = url; });
    }
    $('ico-atacar').src = fotoArma('pulso');
    $('ico-portal').src = fotoAsset('portal_aro');
  }

  // Número de daño que sube desde el punto del golpe
  numero({ valor, propio }, { x, y }) {
    const caja = $('numeros');
    if (caja.children.length >= MAX_NUMEROS) return;
    const d = document.createElement('div');
    d.textContent = Math.round(valor).toLocaleString('es-MX');
    if (propio) d.className = 'propio';
    d.style.left = `${x + (Math.random() - 0.5) * 34}px`;
    d.style.top = `${y - 18}px`;
    caja.append(d);
    d.animate([{ transform: 'translate(-50%, 0) scale(1.25)', opacity: 1 }, { transform: 'translate(-50%, -34px)', opacity: 1, offset: 0.6 }, { transform: 'translate(-50%, -52px)', opacity: 0 }], 750).onfinish = () => d.remove();
  }

  // Letrero grande al centro: bloque azul con su etiqueta arriba
  cartel(etiqueta, texto) {
    $('cartel-etiqueta').textContent = etiqueta;
    $('cartel-texto').textContent = texto;
    $('cartel').animate([{ opacity: 0, transform: 'translate(-50%, 10px)' }, { opacity: 1, transform: 'translate(-50%, 0)', offset: 0.12 }, { opacity: 1, transform: 'translate(-50%, 0)', offset: 0.82 }, { opacity: 0, transform: 'translate(-50%, 0)' }], 2000);
  }

  llegada(nombre) {
    $('transicion').animate([{ opacity: 1 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], 700);
    this.cartel('Sector', nombre);
  }

  mensaje(texto, tipo) {
    const d = document.createElement('div');
    d.className = tipo;
    d.textContent = texto;
    $('mensajes').append(d);
    d.addEventListener('animationend', () => d.remove());
    while ($('mensajes').children.length > 4) $('mensajes').firstChild.remove();
  }

  // Insignia del rango y nombre, arriba de la nave
  etiqueta(s, punto) {
    const j = s.jugador, caja = $('etiqueta');
    caja.hidden = j.muerto || !punto;
    if (caja.hidden) return;
    caja.style.left = `${punto.x}px`;
    caja.style.top = `${punto.y}px`;
    const rango = rangoDe(j.nivel);
    if (rango === this.rangoVisto && j.empresa === this.empresaVista) return;
    this.rangoVisto = rango;
    this.empresaVista = j.empresa;
    $('etiqueta-insignia').innerHTML = insignia(rango);
    $('etiqueta-nombre').textContent = PILOTO.nombre;
    $('etiqueta-nombre').style.color = `#${EMPRESAS[j.empresa].color.toString(16).padStart(6, '0')}`;
    $('rango').innerHTML = `${insignia(rango)}${rango.nombre}`;
  }

  actualizar(s) {
    const j = s.jugador, st = statsJugador(j), nave = naveDe(j.naveId);

    $('nave-nombre').textContent = nave.nombre;
    if (j.naveId + j.empresa !== this.fotoVista) {
      this.fotoVista = j.naveId + j.empresa;
      const url = fotoNave(`nave_${j.naveId}`, j.empresa);
      $('nave-foto').src = $('ico-hangar').src = this.botones.especial.img.src = url;
    }
    const portal = portalCercano(s);
    $('btn-portal').hidden = !portal;
    if (portal) $('btn-portal-txt').textContent = `Saltar a ${MAPAS[portal.a].nombre}`;
    $('nivel').textContent = j.nivel;
    if (this.nivelVisto && j.nivel > this.nivelVisto) this.cartel('Subiste de nivel', `Nivel ${j.nivel}`);
    this.nivelVisto = j.nivel;
    $('creditos').textContent = num(j.creditos);
    $('plasmita').textContent = num(j.plasmita);
    $('barra-casco').style.width = $('rastro-casco').style.width = `${(j.casco / st.casco) * 100}%`;
    $('txt-casco').textContent = `Casco ${num(j.casco)} / ${num(st.casco)}`;
    $('barra-escudo').style.width = $('rastro-escudo').style.width = `${(j.escudo / st.escudo) * 100}%`;
    const vida = j.casco + j.escudo, critico = j.casco / st.casco < 0.35 && !j.muerto;
    if (vida < this.vidaVista && performance.now() - (this.ultimoGolpe ?? 0) > 250) {
      this.ultimoGolpe = performance.now();
      $('golpe').animate(GOLPE, 420);
    }
    this.vidaVista = vida;
    $('estado').classList.toggle('critico', critico);
    $('vineta').classList.toggle('critico', critico);
    $('txt-escudo').textContent = `Escudo ${num(j.escudo)} / ${num(st.escudo)}`;

    const maximo = j.nivel >= NIVELES.maximo;
    const xpBase = NIVELES.xpParaNivel(j.nivel), xpSig = NIVELES.xpParaNivel(j.nivel + 1);
    $('barra-xp').style.width = maximo ? '100%' : `${((j.xp - xpBase) / (xpSig - xpBase)) * 100}%`;
    $('txt-xp').textContent = maximo ? 'Nivel máximo' : `XP ${num(j.xp - xpBase)} / ${num(xpSig - xpBase)}`;

    // Objetivo seleccionado
    const obj = objetivoActual(s);
    $('objetivo').hidden = !obj;
    if (obj) {
      const d = NPCS[obj.tipo];
      $('obj-nombre').textContent = d.nombre;
      $('obj-barra').style.width = $('obj-rastro').style.width = `${(obj.casco / d.casco) * 100}%`;
      $('obj-txt').textContent = `${num(obj.casco)} / ${num(d.casco)}`;
      const distancia = distBorde(s, j, obj);
      $('obj-nota').textContent = enZonaSegura(j) ? 'Estás en la zona segura'
        : distancia > st.alcance ? `Fuera de alcance (${Math.round(distancia)} / ${st.alcance | 0})`
        : j.atacando ? 'Atacando' : 'En alcance';
    }

    // Habilidades y recargas
    for (const slot of RANURAS) {
      const v = this.botones[slot];
      const def = slot === 'especial' ? nave.especial : HABILIDADES[slot];
      v.nombre.textContent = def.nombre;
      const resta = j.recargas[slot];
      v.sombra.style.setProperty('--resta', resta / def.recarga);
      v.tiempo.textContent = resta > 0 ? Math.ceil(resta) : '';
      if (v.enfriando && resta <= 0) v.b.animate(LISTO, 500); // destello al quedar lista
      v.enfriando = resta > 0;
      v.b.classList.toggle('enfriando', resta > 0);
    }

    // Efectos activos
    const activos = Object.entries(j.efectos).map(([k, t]) => `<span>${NOMBRES_EFECTO[k]} ${Math.ceil(t)}s</span>`).join('');
    if (activos !== this.activos) { $('efectos').innerHTML = activos; this.activos = activos; }

    $('btn-atacar').classList.toggle('activo', j.atacando);
    const misiles = estadoMisiles(j), txtMisil = !misiles.total ? 'Sin misiles' : misiles.listos ? `Misiles ${misiles.listos}/${misiles.total}` : `Misiles ${Math.ceil(misiles.resta)}s`;
    if (txtMisil !== this.txtMisil) { $('btn-misil-txt').textContent = txtMisil; this.txtMisil = txtMisil; }
    $('btn-misil').disabled = !misiles.total;
    const lanzador = equipoDe(j).misil.find(Boolean)?.id ?? 'dardo';
    if (lanzador !== this.lanzadorVisto) { this.lanzadorVisto = lanzador; $('ico-misil').src = fotoAsset(`misil_${lanzador}`); }
    $('btn-misil').classList.toggle('enfriando', misiles.total > 0 && !misiles.listos);
    $('btn-hangar').disabled = !puedeUsarHangar(s);
    $('muerte').hidden = !j.muerto;

    this.dibujarMinimapa(s);
  }

  // Mundo -> fracción 0..1 del minimapa: el mapa cuadrado ocupa todo el recuadro
  aMapa(x, z) {
    return [0.5 + x / MUNDO.tamano, 0.5 + z / MUNDO.tamano];
  }

  // Fracción 0..1 del minimapa -> mundo
  aMundo(u, v) {
    return { x: (u - 0.5) * MUNDO.tamano, z: (v - 0.5) * MUNDO.tamano };
  }

  dibujarMinimapa(s) {
    const g = this.g, T = g.canvas.width;
    const P = (x, z) => this.aMapa(x, z).map((v) => v * T);
    const j = s.jugador;

    // Plano azul con cuadrícula fina y sectores
    g.fillStyle = '#2b2d31';
    g.fillRect(0, 0, T, T);
    const lineas = (paso, color, ancho) => {
      g.strokeStyle = color;
      g.lineWidth = ancho;
      g.beginPath();
      for (let v = paso; v < MUNDO.tamano; v += paso) {
        const p = (v / MUNDO.tamano) * T;
        g.moveTo(p, 0); g.lineTo(p, T);
        g.moveTo(0, p); g.lineTo(T, p);
      }
      g.stroke();
    };
    lineas(MUNDO.subdivision, 'rgba(181,186,193,.16)', 1);
    lineas(MUNDO.sector, 'rgba(181,186,193,.5)', 1.5);
    g.strokeStyle = '#f2f3f5';
    g.lineWidth = 3;
    g.strokeRect(1.5, 1.5, T - 3, T - 3);

    // Letras de columna y números de fila
    const celda = (MUNDO.sector / MUNDO.tamano) * T, total = MUNDO.tamano / MUNDO.sector;
    g.fillStyle = 'rgba(242,243,245,.8)';
    g.font = '600 17px ui-monospace, Menlo, monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let i = 0; i < total; i++) {
      g.fillText(String.fromCharCode(65 + i), (i + 0.5) * celda, 13);
      if (i > 0) g.fillText(i + 1, 12, (i + 0.5) * celda);
    }

    // Zona segura
    if (hayZonaSegura()) {
      g.beginPath();
      g.arc(...P(0, 0), (MUNDO.radioZonaSegura / MUNDO.tamano) * T, 0, 7);
      g.fillStyle = 'rgba(111,182,216,.3)';
      g.fill();
    }

    // Portales: un aro con la inicial de su destino
    g.strokeStyle = '#d6b3ff';
    g.lineWidth = 3;
    g.fillStyle = '#d6b3ff';
    for (const p of MAPAS[s.mapaId].portales) {
      const [x, y] = P(p.x, p.z);
      g.fillStyle = 'rgba(111,182,216,.3)';
      g.beginPath();
      g.arc(x, y, (RADIO_PORTAL / MUNDO.tamano) * T, 0, 7);
      g.fill();
      g.fillStyle = '#d6b3ff';
      g.beginPath();
      g.arc(x, y, 12, 0, 7);
      g.stroke();
      g.fillText(MAPAS[p.a].nombre[0], x, y + 1);
    }

    const punto = (x, z, r, color) => {
      g.fillStyle = color;
      g.beginPath();
      g.arc(...P(x, z), r, 0, 7);
      g.fill();
    };
    for (const b of s.botin) punto(b.x, b.z, 4, '#d9b45b');
    for (const n of s.npcs) {
      const color = EMPRESAS[n.empresa] ? `#${EMPRESAS[n.empresa].color.toString(16).padStart(6, '0')}` : '#f7ae50'; // Sirko en amarillo, como sus naves
      punto(n.x, n.z, n.tipo === 'behemot' ? 6 : n.tipo === 'zarpa' || n.tipo === 'pesado' ? 4.5 : 3.5, n.id === j.objetivoId ? '#ffc46a' : color);
    }
    if (j.dest) {
      g.strokeStyle = 'rgba(159,224,255,.7)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(...P(j.x, j.z));
      g.lineTo(...P(j.dest.x, j.dest.z));
      g.stroke();
    }

    // El jugador con cruz de ubicación sobre toda la cuadrícula
    const [px, py] = P(j.x, j.z);
    g.strokeStyle = 'rgba(255,255,255,.35)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(px, 0); g.lineTo(px, T);
    g.moveTo(0, py); g.lineTo(T, py);
    g.stroke();
    punto(j.x, j.z, 6, '#ffffff');

    $('coordenadas').textContent = `${MAPAS[s.mapaId].nombre} · ${nombreSector(j.x, j.z)} · X ${Math.round(j.x)} · Z ${Math.round(j.z)}`;
  }
}
