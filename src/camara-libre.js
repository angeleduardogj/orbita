// Cámara libre del modo desarrollador: vuela por los tres ejes sin tocar la simulación.
import * as THREE from 'three';

const VELOCIDAD = 450, VELOCIDAD_MIN = 60, VELOCIDAD_MAX = 3000; // unidades por segundo
const TURBO = 4;             // multiplicador con Shift
const SENSIBILIDAD = 0.004;  // radianes por píxel arrastrado
const CABECEO_MAX = THREE.MathUtils.degToRad(89);
const SALIDA = new THREE.Vector3(0, 420, 560); // dónde aparece respecto a lo que mira el juego
const LEJOS_DE_LA_NAVE = 1500; // al anclar desde más lejos, salta junto a la nave
const SUAVIZADO_VISTA = 6; // qué tan rápido llega a una vista y sigue los giros de la nave
// Vistas fijas con los números. La nariz de la nave apunta a +Z, su derecha a -X; en múltiplos de su tamaño.
export const VISTAS = [
  { nombre: 'Detrás', x: 0, y: 0.45, z: -1.7 },
  { nombre: 'Frente', x: 0, y: 0.25, z: 1.7 },
  { nombre: 'Izquierda', x: 1.8, y: 0.2, z: 0 },
  { nombre: 'Derecha', x: -1.8, y: 0.2, z: 0 },
  { nombre: 'Arriba', x: 0, y: 2, z: -0.1 },
  { nombre: 'Abajo', x: 0, y: -2, z: -0.1 },
  { nombre: 'Diagonal', x: 1.2, y: 0.7, z: 1.2 },
  { nombre: 'Motores', x: 0.45, y: 0.15, z: -1.1 },
];
const TECLAS = {
  KeyD: [1, 0, 0], KeyA: [-1, 0, 0],
  KeyE: [0, 1, 0], KeyQ: [0, -1, 0],
  KeyS: [0, 0, 1], KeyW: [0, 0, -1],
};

export class CamaraLibre {
  constructor() {
    this.camara = new THREE.PerspectiveCamera(60, 1, 2, 30000);
    this.camara.rotation.order = 'YXZ'; // giro horizontal primero: el horizonte no se ladea
    this.activa = false;
    this.anclada = false;
    this.ancla = new THREE.Vector3(); // última posición conocida de la nave
    this.vista = null;                // una de VISTAS, o null si el encuadre es manual
    this.desfase = new THREE.Vector3();
    this.meta = new THREE.Vector3();
    this.velocidad = VELOCIDAD;
    this.teclas = new Set();
    this.paso = new THREE.Vector3();
    addEventListener('keydown', (e) => this.teclas.add(e.code));
    addEventListener('keyup', (e) => this.teclas.delete(e.code));
    addEventListener('blur', () => this.teclas.clear());
  }

  // Empieza mirando el punto donde estaba la cámara del juego
  activar(foco) {
    this.camara.position.copy(foco).add(SALIDA);
    this.camara.lookAt(foco);
    this.activa = true;
  }

  desactivar() {
    this.activa = false;
    this.soltar();
  }

  // Anclada acompaña a la nave sin perder los controles: mover y mirar ajustan el encuadre
  anclar(nave) {
    this.anclada = true;
    this.ancla.copy(nave);
    if (this.camara.position.distanceTo(nave) > LEJOS_DE_LA_NAVE) this.camara.position.copy(nave).add(SALIDA);
    this.camara.lookAt(nave);
  }

  soltar() {
    this.anclada = false;
    this.vista = null;
  }

  // Mira la nave desde una vista fija; sigue sus giros hasta que se mueva o gire a mano
  fijarVista(vista) {
    this.vista = vista;
    this.desfase.subVectors(this.camara.position, this.ancla);
  }

  redimensionar() {
    this.camara.aspect = innerWidth / innerHeight;
    this.camara.updateProjectionMatrix();
  }

  girar(dx, dy) {
    this.vista = null;
    const r = this.camara.rotation;
    r.y -= dx * SENSIBILIDAD;
    r.x = THREE.MathUtils.clamp(r.x - dy * SENSIBILIDAD, -CABECEO_MAX, CABECEO_MAX);
  }

  cambiarVelocidad(factor) {
    this.velocidad = THREE.MathUtils.clamp(this.velocidad * factor, VELOCIDAD_MIN, VELOCIDAD_MAX);
  }

  // W/S avanzan hacia donde mira, A/D van de lado y Q/E bajan y suben en el eje Y del mundo
  actualizar(dt, nave, jugador) {
    if (this.anclada) {
      this.camara.position.add(this.paso.subVectors(nave, this.ancla));
      this.ancla.copy(nave);
    }
    const p = this.paso.set(0, 0, 0);
    let subir = 0;
    for (const codigo of this.teclas) {
      const t = TECLAS[codigo];
      if (!t) continue;
      p.x += t[0]; p.z += t[2];
      subir += t[1];
    }
    p.applyQuaternion(this.camara.quaternion);
    p.y += subir;
    if (p.lengthSq() > 0) this.vista = null;
    if (this.vista) return this.seguirVista(dt, nave, jugador);
    const turbo = this.teclas.has('ShiftLeft') || this.teclas.has('ShiftRight') ? TURBO : 1;
    this.camara.position.addScaledVector(p, this.velocidad * turbo * dt);
  }

  seguirVista(dt, nave, { grupo, tam }) {
    const { x, y, z } = this.vista;
    this.meta.set(x, y, z).multiplyScalar(tam).applyQuaternion(grupo.quaternion);
    this.desfase.lerp(this.meta, 1 - Math.exp(-dt * SUAVIZADO_VISTA));
    this.camara.position.copy(nave).add(this.desfase);
    this.camara.lookAt(nave);
  }
}
