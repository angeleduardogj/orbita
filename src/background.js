// Fondo en un canvas 2D detrás del WebGL, hecho con los skyboxes del pack.
// Las caras del skybox no repiten solas: se arma una loseta espejada para evitar costuras.
const TAM = 1024;

function losetaEspejada(imagen) {
  const c = document.createElement('canvas');
  c.width = c.height = TAM * 2;
  const g = c.getContext('2d');
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    g.save();
    g.translate(TAM, TAM);
    g.scale(sx, sy);
    g.drawImage(imagen, 0, 0, TAM, TAM);
    g.restore();
  }
  return c;
}

export class Fondo {
  // cielo y estrellas: imágenes de los skyboxes
  constructor(canvas, cielo, estrellas) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.capas = [
      { img: losetaEspejada(cielo), paralaje: 0.05, modo: 'source-over', alfa: 1 },
      { img: losetaEspejada(estrellas), paralaje: 0.16, modo: 'lighter', alfa: 0.4 },
    ];
    this.ultimo = null;
  }

  redimensionar(ancho, alto) {
    this.canvas.width = ancho;
    this.canvas.height = alto;
    this.ultimo = null;
  }

  // (x, y): posición de la cámara en píxeles de pantalla
  dibujar(x, y) {
    const clave = `${Math.round(x)},${Math.round(y)}`;
    if (clave === this.ultimo) return;
    this.ultimo = clave;
    const { g, canvas } = this, T = TAM * 2;
    for (const { img, paralaje, modo, alfa } of this.capas) {
      g.globalCompositeOperation = modo;
      g.globalAlpha = alfa;
      const ox = -Math.floor((((x * paralaje) % T) + T) % T);
      const oy = Math.floor((((y * paralaje) % T) + T) % T) - T;
      for (let px = ox; px < canvas.width; px += T) {
        for (let py = oy; py < canvas.height; py += T) g.drawImage(img, px, py);
      }
    }
  }
}
