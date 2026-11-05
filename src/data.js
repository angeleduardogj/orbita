// Todos los números del juego viven aquí: naves, NPC, costos, fórmulas y tiempos.
// Tiempos en segundos, distancias en unidades del mundo, velocidades en unidades/s.

export const MUNDO = {
  tamano: 6000,            // el mundo va de -3000 a +3000 en X y Z
  radioZonaSegura: 620,    // círculo alrededor de la base: nadie dispara ni recibe daño
  tickHz: 20,              // simulación con paso fijo
  sector: 1000,            // lado de cada sector de la cuadrícula
  subdivision: 250,        // separación de las líneas finas
  aparicion: { x: 0, z: 340 }, // donde nace y reaparece el jugador
  numAsteroides: 70,
  numEscombros: 90,       // basura espacial
  numPolvo: 26,
};

// Nombre del sector de un punto: columna con letra (X) y fila con número (Z), como "C4"
export function nombreSector(x, z) {
  const lado = MUNDO.sector, total = MUNDO.tamano / lado, mitad = MUNDO.tamano / 2;
  const indice = (v) => Math.min(total - 1, Math.max(0, Math.floor((v + mitad) / lado)));
  return String.fromCharCode(65 + indice(x)) + (indice(z) + 1);
}

export const COMBATE = {
  velocidadLaser: 1500,
  giroPunteria: 2.5,       // la nariz gira esta cantidad de veces más rápido que el rumbo
  radioBotin: 55,          // distancia a la que se recoge una caja al pasar encima
  vidaBotin: 60,
  regenEscudoEspera: 4,    // segundos sin recibir daño antes de regenerar escudo
  regenEscudo: 0.05,       // fracción del escudo máximo por segundo
  regenCascoBase: 0.08,    // fracción del casco por segundo dentro de la zona segura
  regenNpc: 0.04,          // los NPC se curan al volver a patrullar
};

export const MUERTE = {
  esperaReaparicion: 3,
  penalizacionCreditos: 0.10, // fracción de créditos que se pierde
};

// XP total acumulada necesaria para alcanzar el nivel n.
export const NIVELES = {
  maximo: 20,
  bonusPorNivel: 0.05,     // +5 % a casco, escudo y daño por cada nivel sobre el 1
  xpParaNivel: (n) => Math.round(120 * Math.pow(n - 1, 2.1)),
};

// Empresas: cada una tiene su planeta, su mapa y su base. Solo se entra a la base propia.
export const EMPRESAS = {
  tierra: { nombre: 'Tierra', color: 0x5fb0ff },
  marte:  { nombre: 'Marte',  color: 0xff5a4a },
  venus:  { nombre: 'Venus',  color: 0x4fd07a },
};
export const EMPRESA_INICIAL = 'tierra';

// Mapas unidos por portales. Saltar te deja junto al portal de regreso en el mapa destino.
// El mapa central no es de nadie: su base chocada está abierta para todos.
const portales = (a, b) => [{ x: 0, z: -2500, a: 'centro' }, { x: 2500, z: 2000, a }, { x: -2500, z: 2000, a: b }];
export const MAPAS = {
  tierra: { nombre: 'Tierra', empresa: 'tierra', portales: portales('marte', 'venus') },
  marte:  { nombre: 'Marte',  empresa: 'marte',  portales: portales('venus', 'tierra') },
  venus:  { nombre: 'Venus',  empresa: 'venus',  portales: portales('tierra', 'marte') },
  centro: {
    nombre: 'Frente Central', empresa: null,
    portales: [{ x: 0, z: 2500, a: 'tierra' }, { x: -2500, z: -2000, a: 'marte' }, { x: 2500, z: -2000, a: 'venus' }],
  },
};
export const RADIO_PORTAL = 240; // a esta distancia ya se puede saltar

// Cuántos bots hay de cada empresa según el mapa
export const POBLACION = {
  propia: { caza: 6, pesado: 2 },  // los dueños del mapa
  visita: { caza: 2 },             // incursiones de las otras dos empresas
  centro: { caza: 8, pesado: 3 },  // cada empresa en el mapa central
};

// Lo que se muestra arriba de la nave. El nombre será el de la cuenta cuando exista.
export const PILOTO = { nombre: 'Nómada' };
export const RANGOS = [
  { nivel: 1, nombre: 'Raso', insignia: 'galon', cantidad: 1 },
  { nivel: 4, nombre: 'Cabo', insignia: 'galon', cantidad: 2 },
  { nivel: 7, nombre: 'Sargento', insignia: 'galon', cantidad: 3 },
  { nivel: 10, nombre: 'Teniente', insignia: 'barra', cantidad: 1 },
  { nivel: 13, nombre: 'Capitán', insignia: 'barra', cantidad: 2 },
  { nivel: 16, nombre: 'Comandante', insignia: 'estrella', cantidad: 1 },
  { nivel: 19, nombre: 'Almirante', insignia: 'estrella', cantidad: 3 },
];

export const INICIO = { nivel: 1, creditos: 500, plasmita: 0, nave: 'chispa', drones: [] };
export const INICIO_DEMO = { nivel: 15, creditos: 150000, plasmita: 600, nave: 'chispa', drones: ['ataque', 'ataque', 'ataque', 'ataque', 'ataque', 'ataque', 'reparacion', 'reparacion', 'reparacion'] };

// Habilidades comunes a todas las naves. La cuarta ranura es el especial de cada nave.
export const HABILIDADES = {
  impulso:    { nombre: 'Impulso',    tecla: '1', recarga: 15, duracion: 4, velocidad: 1.7 },
  reparacion: { nombre: 'Reparación', tecla: '2', recarga: 20, duracion: 3, curaTotal: 0.35 },
  barrera:    { nombre: 'Barrera',    tecla: '3', recarga: 25, duracion: 6, reduccionDanio: 0.5 },
};

// Drones escolta: van fijos en un triángulo alrededor de su dueño y solo giran sobre su eje
// hacia donde apunta la nave. Los del jugador son azules y los del enemigo, rojos.
// La sanguijuela es un dron de reparación enemigo: se pega al jugador y le drena el casco.
export const DRONES = {
  maximo: 9,
  formacion: { separacion: 55 }, // radio del triángulo sobre el tamaño de la nave
  orbita: { giro: 1.4, separacion: 30, margen: 45 }, // lo que da vueltas: la sanguijuela y el dron del botón Reparación
  ataque: { nombre: 'Dron de ataque', danio: 20, cadencia: 0.8, alcance: 420 },
  reparacion: { nombre: 'Dron de reparación', curaPorSegundo: 0.02 }, // fracción del casco
  sanguijuela: { nombre: 'Sanguijuela', drenaPorSegundo: 0.025, alcance: 520, velocidad: 420 },
};

// Especiales de las naves: la cuarta ranura. Varias naves pueden compartir uno.
const ESPECIALES = {
  rafaga: { id: 'rafaga', nombre: 'Ráfaga', desc: 'Dispara 2.5 veces más rápido por 5 s.', recarga: 20, duracion: 5, cadencia: 2.5 },
  pulso: { id: 'pulso', nombre: 'Pulso de escudo', desc: 'Recupera al instante el 60 % del escudo.', recarga: 25, curaEscudo: 0.6 },
  perforante: { id: 'perforante', nombre: 'Disparo perforante', desc: 'Rayo de largo alcance que atraviesa a todos los enemigos en línea.', recarga: 14, alcance: 1100, ancho: 40, danio: 6 },
  curaArea: { id: 'curaArea', nombre: 'Reparación en área', desc: 'Crea por 7 s un círculo que repara casco mientras estés dentro.', recarga: 28, duracion: 7, radio: 240, curaPorSegundo: 0.09 },
  blindaje: { id: 'blindaje', nombre: 'Casco reforzado', desc: '+60 % de casco máximo por 10 s.', recarga: 35, duracion: 10, casco: 1.6 },
  mina: { id: 'mina', nombre: 'Mina', desc: 'Suelta una mina que estalla cuando un enemigo se acerca.', recarga: 12, armado: 0.8, vida: 40, radioActivacion: 270, radioExplosion: 320, danio: 14 },
  invisible: { id: 'invisible', nombre: 'Invisibilidad', desc: 'Los NPC te pierden de vista por 6 s. Disparar la cancela.', recarga: 30, duracion: 6 },
  asedio: { id: 'asedio', nombre: 'Modo asedio', desc: 'Doble daño y +30 % de alcance por 10 s, pero no te mueves.', recarga: 30, duracion: 10, danio: 2, alcance: 1.3 },
};

// Ordenadas por nivel. `cadencia` = segundos entre disparos.
export const NAVES = [
  {
    id: 'chispa', nombre: 'Chispa', nivel: 1, creditos: 0, plasmita: 0,
    casco: 1000, escudo: 500, velocidad: 300, giro: 3.6, aceleracion: 420,
    danio: 40, cadencia: 0.5, alcance: 420,
    especial: ESPECIALES.rafaga,
  },
  {
    id: 'vigia', nombre: 'Vigía', nivel: 3, creditos: 8000, plasmita: 0,
    casco: 1500, escudo: 1100, velocidad: 310, giro: 3.2, aceleracion: 400,
    danio: 48, cadencia: 0.5, alcance: 460,
    especial: ESPECIALES.pulso,
  },
  {
    id: 'aguja', nombre: 'Aguja', nivel: 5, creditos: 14000, plasmita: 0,
    casco: 1300, escudo: 800, velocidad: 350, giro: 3.4, aceleracion: 460,
    danio: 70, cadencia: 0.6, alcance: 560,
    especial: ESPECIALES.perforante,
  },
  {
    id: 'marea', nombre: 'Marea', nivel: 6, creditos: 16000, plasmita: 20,
    casco: 2200, escudo: 1400, velocidad: 300, giro: 2.8, aceleracion: 360,
    danio: 62, cadencia: 0.5, alcance: 440,
    especial: ESPECIALES.curaArea,
  },
  {
    id: 'coloso', nombre: 'Coloso', nivel: 8, creditos: 30000, plasmita: 150,
    casco: 4200, escudo: 1800, velocidad: 240, giro: 2.0, aceleracion: 260,
    danio: 85, cadencia: 0.6, alcance: 430,
    especial: ESPECIALES.blindaje,
  },
  {
    id: 'escarabajo', nombre: 'Escarabajo', nivel: 10, creditos: 42000, plasmita: 60,
    casco: 3400, escudo: 2400, velocidad: 270, giro: 2.4, aceleracion: 300,
    danio: 95, cadencia: 0.5, alcance: 450,
    especial: ESPECIALES.mina,
  },
  {
    id: 'fantasma', nombre: 'Fantasma', nivel: 12, creditos: 55000, plasmita: 120,
    casco: 2800, escudo: 2600, velocidad: 360, giro: 3.2, aceleracion: 440,
    danio: 115, cadencia: 0.45, alcance: 500,
    especial: ESPECIALES.invisible,
  },
  {
    id: 'bastion', nombre: 'Bastión', nivel: 15, creditos: 70000, plasmita: 200,
    casco: 6000, escudo: 3800, velocidad: 210, giro: 1.6, aceleracion: 220,
    danio: 140, cadencia: 0.6, alcance: 520,
    especial: ESPECIALES.asedio,
  },
  {
    id: 'colibri', nombre: 'Colibrí', nivel: 2, creditos: 4000, plasmita: 0,
    casco: 1100, escudo: 700, velocidad: 340, giro: 3.8, aceleracion: 480,
    danio: 38, cadencia: 0.4, alcance: 400,
    especial: ESPECIALES.rafaga,
  },
  {
    id: 'lince', nombre: 'Lince', nivel: 3, creditos: 6000, plasmita: 0,
    casco: 1400, escudo: 900, velocidad: 330, giro: 3.4, aceleracion: 440,
    danio: 46, cadencia: 0.5, alcance: 430,
    especial: ESPECIALES.pulso,
  },
  {
    id: 'cometa', nombre: 'Cometa', nivel: 4, creditos: 10000, plasmita: 0,
    casco: 1600, escudo: 1000, velocidad: 345, giro: 3.3, aceleracion: 450,
    danio: 56, cadencia: 0.5, alcance: 480,
    especial: ESPECIALES.perforante,
  },
  {
    id: 'navaja', nombre: 'Navaja', nivel: 5, creditos: 13000, plasmita: 0,
    casco: 1200, escudo: 900, velocidad: 370, giro: 3.6, aceleracion: 480,
    danio: 64, cadencia: 0.55, alcance: 520,
    especial: ESPECIALES.invisible,
  },
  {
    id: 'sombra', nombre: 'Sombra', nivel: 7, creditos: 20000, plasmita: 10,
    casco: 1700, escudo: 1300, velocidad: 355, giro: 3.3, aceleracion: 450,
    danio: 78, cadencia: 0.55, alcance: 540,
    especial: ESPECIALES.invisible,
  },
  {
    id: 'yunque', nombre: 'Yunque', nivel: 7, creditos: 22000, plasmita: 30,
    casco: 3000, escudo: 1500, velocidad: 265, giro: 2.4, aceleracion: 300,
    danio: 72, cadencia: 0.55, alcance: 430,
    especial: ESPECIALES.blindaje,
  },
  {
    id: 'granizo', nombre: 'Granizo', nivel: 8, creditos: 26000, plasmita: 40,
    casco: 3000, escudo: 1400, velocidad: 250, giro: 2.2, aceleracion: 280,
    danio: 88, cadencia: 0.6, alcance: 440,
    especial: ESPECIALES.mina,
  },
  {
    id: 'eclipse', nombre: 'Eclipse', nivel: 9, creditos: 34000, plasmita: 60,
    casco: 2300, escudo: 2000, velocidad: 350, giro: 3.1, aceleracion: 430,
    danio: 100, cadencia: 0.5, alcance: 540,
    especial: ESPECIALES.perforante,
  },
  {
    id: 'trueno', nombre: 'Trueno', nivel: 9, creditos: 36000, plasmita: 70,
    casco: 3600, escudo: 1800, velocidad: 245, giro: 2.1, aceleracion: 270,
    danio: 96, cadencia: 0.6, alcance: 450,
    especial: ESPECIALES.mina,
  },
  {
    id: 'tormenta', nombre: 'Tormenta', nivel: 11, creditos: 46000, plasmita: 90,
    casco: 3900, escudo: 2400, velocidad: 240, giro: 2.0, aceleracion: 260,
    danio: 108, cadencia: 0.55, alcance: 470,
    especial: ESPECIALES.rafaga,
  },
  {
    id: 'mula', nombre: 'Mula', nivel: 11, creditos: 44000, plasmita: 50,
    casco: 5000, escudo: 2600, velocidad: 220, giro: 1.8, aceleracion: 230,
    danio: 70, cadencia: 0.6, alcance: 430,
    especial: ESPECIALES.curaArea,
  },
  {
    id: 'centinela', nombre: 'Centinela', nivel: 13, creditos: 60000, plasmita: 150,
    casco: 5200, escudo: 3000, velocidad: 225, giro: 1.8, aceleracion: 240,
    danio: 125, cadencia: 0.6, alcance: 510,
    especial: ESPECIALES.asedio,
  },
  {
    id: 'caravana', nombre: 'Caravana', nivel: 14, creditos: 66000, plasmita: 180,
    casco: 7000, escudo: 3400, velocidad: 190, giro: 1.4, aceleracion: 190,
    danio: 90, cadencia: 0.6, alcance: 450,
    especial: ESPECIALES.curaArea,
  },
  {
    id: 'nodriza', nombre: 'Nodriza', nivel: 16, creditos: 85000, plasmita: 260,
    casco: 6800, escudo: 4400, velocidad: 195, giro: 1.4, aceleracion: 200,
    danio: 150, cadencia: 0.6, alcance: 540,
    especial: ESPECIALES.asedio,
  },
  {
    id: 'acorazada', nombre: 'Nodriza Acorazada', nivel: 18, creditos: 110000, plasmita: 340,
    casco: 8800, escudo: 5000, velocidad: 180, giro: 1.3, aceleracion: 180,
    danio: 155, cadencia: 0.6, alcance: 540,
    especial: ESPECIALES.blindaje,
  },
  {
    id: 'titan', nombre: 'Titán', nivel: 20, creditos: 150000, plasmita: 500,
    casco: 9500, escudo: 5600, velocidad: 170, giro: 1.2, aceleracion: 170,
    danio: 180, cadencia: 0.65, alcance: 560,
    especial: ESPECIALES.asedio,
  },
].sort((a, b) => a.nivel - b.nivel);

// Facción hostil inventada: el Enjambre Sirko.
// `anillo` = distancia al centro donde aparecen: entre más lejos, más peligroso.
export const NPCS = {
  // La sanguijuela vuela como dron, pero se puede atacar como cualquier enemigo
  sanguijuela: {
    nombre: 'Sanguijuela', cantidad: 0, casco: 700,
    xp: 40, creditos: 90, plasmita: 0, probPlasmita: 0, plasmitaExtra: 0,
  },
  // Bots de las empresas: usan cascos de nave con la paleta de su empresa
  caza: {
    nombre: 'Caza', cantidad: 0, anillo: [800, 2600], bot: true,
    casco: 1600, danio: 42, cadencia: 0.8, alcance: 400, velocidad: 240, giro: 2.6, aceleracion: 300,
    aggro: 620, correa: 1500, patrulla: 500, reaparicion: 18,
    xp: 180, creditos: 500, plasmita: 1, probPlasmita: 0.2, plasmitaExtra: 1,
  },
  pesado: {
    nombre: 'Pesado', cantidad: 0, anillo: [800, 2600], bot: true,
    casco: 4200, danio: 90, cadencia: 0.9, alcance: 440, velocidad: 170, giro: 1.8, aceleracion: 200,
    aggro: 660, correa: 1500, patrulla: 400, reaparicion: 32,
    xp: 620, creditos: 1800, plasmita: 6, probPlasmita: 0.4, plasmitaExtra: 3,
  },
  espina: {
    nombre: 'Espina Sirko', cantidad: 34, anillo: [850, 1900],
    casco: 400, danio: 18, cadencia: 0.9, alcance: 320, velocidad: 220, giro: 3, aceleracion: 320,
    aggro: 480, correa: 1100, patrulla: 320, reaparicion: 12,
    xp: 60, creditos: 180, plasmita: 0, probPlasmita: 0.15, plasmitaExtra: 1,
  },
  zarpa: {
    nombre: 'Zarpa Sirko', cantidad: 20, anillo: [1700, 2600],
    casco: 1400, danio: 45, cadencia: 0.8, alcance: 380, velocidad: 200, giro: 2.4, aceleracion: 260,
    drones: ['sanguijuela'],
    aggro: 560, correa: 1300, patrulla: 380, reaparicion: 20,
    xp: 220, creditos: 650, plasmita: 2, probPlasmita: 0.3, plasmitaExtra: 2,
  },
  behemot: {
    nombre: 'Behemot Sirko', cantidad: 8, anillo: [2500, 3300],
    casco: 6000, danio: 120, cadencia: 0.9, alcance: 460, velocidad: 150, giro: 1.4, aceleracion: 160,
    drones: ['ataque', 'ataque', 'sanguijuela'],
    aggro: 640, correa: 1500, patrulla: 300, reaparicion: 40,
    xp: 900, creditos: 2600, plasmita: 10, probPlasmita: 0.5, plasmitaExtra: 6,
  },
};
