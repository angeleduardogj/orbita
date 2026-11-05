// Único lugar donde se decide qué modelo del pack POLYGON Sci-Fi Space representa cada pieza.
//
//   archivo: nombre del FBX en assets/pack/Models/ (sin extensión)
//   textura: textura del material (paleta de Synty)
//   piezas:  otros FBX que se arman con él, cada uno ya trae su lugar (opcional)
//   tam:     tamaño final en unidades del mundo (lado horizontal mayor, tras rotar)
//   rot:     rotación en grados [x, y, z] para que la nariz apunte a +Z y la cara de arriba a +Y
//   tinte:   multiplica el color de la textura (opcional)
//   brillo:  aclara u oscurece el modelo (opcional)
//   motores: toberas de la nave, medidas sobre el modelo (ver fuego, nucleo, anillo y par)
//
// La escala de los FBX y su centro se normalizan solos en src/models.js. Para cambiar un
// modelo basta con editar este archivo. Una nave de data.js sin entrada `nave_<id>` aquí
// no aparece en el hangar.

export const PALETA = 'PolygonSciFiSpace_Texture_01_A';         // azul y naranja: jugador y base
const PALETA_ROJA = 'PolygonSciFiSpace_Texture_02_A';   // rojo y gris: Marte y drones enemigos
const PALETA_SIRKO = 'PolygonSciFiSpace_Texture_03_B';  // grises con negro: base del Enjambre Sirko y portales

const PALETA_GRIS = 'PolygonSciFiSpace_Texture_01_B';   // azul y gris: Tierra y drones propios

// Paleta de cada bando. El pack no trae verde con gris ni amarillo con gris, así que esas dos se
// arman en models.js: `resto` y `secundario` son paletas del pack, y `primario` se lleva a `tono`.
export const PALETAS = {
  tierra: PALETA_GRIS,
  marte: PALETA_ROJA,
  venus: { resto: PALETA, secundario: PALETA_GRIS, primario: 'PolygonSciFiSpace_Texture_01_C', tono: [0.7, 1.1, 0.6] },
  sirko: { resto: PALETA_SIRKO, secundario: PALETA_SIRKO, primario: 'PolygonSciFiSpace_Texture_01_C', tono: [3.43, 1.234, 0.513] },
};

const SIN_ROTAR = [0, 0, 0];

// Toberas medidas sobre el modelo, con la nariz hacia +Z. Solo cuentan las aberturas con marco,
// hundidas y mirando atrás. z es el fondo de la abertura; ancho y alto, los de su hueco.
// Oscura por dentro: fuego que nace en el fondo; hondo es lo que recorre hasta la boca.
const fuego = (x, y, z, hondo, ancho, alto, giro = 0) => ({ tipo: 'fuego', x, y, z, hondo, ancho, alto, giro });
// Con luz: núcleo de energía, solo brilla en azul y no echa fuego. mira es hacia dónde da su cara.
const ATRAS = [0, 0, -1], FRENTE = [0, 0, 1], LADO = [1, 0, 0];
const nucleo = (x, y, z, ancho, alto = ancho, mira = ATRAS) => ({ tipo: 'nucleo', x, y, z, ancho, alto, mira, giro: 0 });
// Núcleo que solo es un marco de luz: brilla el borde y no el centro. z es la boca del marco.
const anillo = (x, y, z, ancho, alto, grosor, forma = 'redondo', mira = ATRAS) => ({ ...nucleo(x, y, z, ancho, alto, mira), grosor, forma });
// La misma tobera a cada lado
const par = (m) => [m, { ...m, x: -m.x, giro: -m.giro, ...(m.mira && { mira: [-m.mira[0], m.mira[1], m.mira[2]] }) }];

export const ASSETS = {
  // Naves del jugador, de menor a mayor tamaño
  nave_chispa:  { nombre: 'Chispa',  archivo: 'SM_Ship_Fighter_01', textura: PALETA, tam: 104, rot: SIN_ROTAR, motores: [...par(fuego(9.5, 0.3, -19.5, 1.5, 1.7, 1.8)), ...par(fuego(7.2, -8.3, -20.6, 1, 1.4, 1.4)), fuego(0, -11.1, -17.1, 1.4, 2.3, 2.9), ...par(fuego(50.1, -7, 1.5, 0.7, 0.8, 5.5))] },
  nave_vigia:   { nombre: 'Vigía',   archivo: 'SM_Ship_Fighter_04', textura: PALETA, tam: 116, rot: SIN_ROTAR, motores: [...par(fuego(9.3, -2.5, -19.2, 1.3, 1.7, 1.6)), fuego(0, -2.2, -20.7, 1, 2, 1.6)] },
  nave_aguja:   { nombre: 'Aguja',   archivo: 'SM_Ship_Stealth_03', textura: PALETA, tam: 128, rot: SIN_ROTAR, motores: [...par(anillo(15.3, 0, -24.2, 5.4, 5.4, 0.5)), ...par(anillo(15.3, 0, 15.2, 5.4, 5.4, 0.5, 'redondo', FRENTE)), nucleo(0, 5.3, -42, 5.6, 1.3)] },
  nave_marea:   { nombre: 'Marea',   archivo: 'SM_Ship_Fighter_Heavy_01', textura: PALETA, tam: 146, rot: SIN_ROTAR, motores: [...par(nucleo(9.7, 11.6, -51, 4)), ...par(nucleo(25.2, -4.3, -43.1, 2.8)), ...par(fuego(11.5, -8.3, -24.9, 4, 1.7, 5.5))] },
  nave_coloso:  { nombre: 'Coloso',  archivo: 'SM_Ship_Bomber_02',  textura: PALETA, tam: 170, rot: SIN_ROTAR, motores: [...par(fuego(43.5, 0.8, -35.3, 2.2, 7.2, 1.1))] },
  nave_escarabajo: { nombre: 'Escarabajo', archivo: 'SM_Ship_Fighter_Heavy_02', textura: PALETA, tam: 190, rot: SIN_ROTAR, motores: [...par(nucleo(43.6, -4.8, -57, 5.8)), ...par(nucleo(58.6, -11.1, -48.3, 4.3)), ...par(fuego(19.9, 18.6, -65.3, 2.9, 3.3, 3.5)), ...par(fuego(15.8, -4.2, -46, 5.9, 2.2, 9))] },
  nave_fantasma:   { nombre: 'Fantasma',   archivo: 'SM_Ship_Stealth_01', textura: PALETA, tam: 215, rot: SIN_ROTAR, motores: [nucleo(0, -0.5, -73.1, 7.5, 1.7), ...par(fuego(17, -2.4, -59.2, 1, 7.8, 4.7))] },
  nave_bastion: { nombre: 'Bastión', archivo: 'SM_Ship_Cruiser_01', textura: PALETA, tam: 250, rot: SIN_ROTAR, motores: [anillo(0, -8, -87.2, 12.4, 18.3, 1.7, 'cuadrado'), ...par(nucleo(17.8, 19.2, -103.9, 3.1)), ...par(nucleo(17.8, 4.4, -103.9, 3.1)), ...par(nucleo(25.4, 1.7, 42.4, 4.9)), ...par(nucleo(38.5, -1.8, 49.7, 3.6)), ...par(fuego(37.5, 4.5, -50.5, 3, 1.8, 7.5))] },
  nave_colibri: { nombre: 'Colibrí', archivo: 'SM_Ship_Fighter_05', textura: PALETA, tam: 108, rot: SIN_ROTAR, motores: [...par(nucleo(3.5, 2.2, -40.1, 1.5))] },
  nave_lince: { nombre: 'Lince', archivo: 'SM_Ship_Fighter_03', textura: PALETA, tam: 112, rot: SIN_ROTAR, motores: [...par(nucleo(13, 0.5, -20.2, 2.1)), fuego(0, -1.3, -28, 0.4, 4, 0.6)] },
  nave_cometa: { nombre: 'Cometa', archivo: 'SM_Ship_Fighter_02', textura: PALETA, tam: 120, rot: SIN_ROTAR, motores: [fuego(0, 4.8, -31.5, 2.5, 8, 3.5), fuego(0, -4.3, -35.5, 2.1, 5.1, 2.9), ...par(fuego(10, 4.8, -17.3, 1.5, 1.8, 1.9))] },
  nave_navaja: { nombre: 'Navaja', archivo: 'SM_Ship_Stealth_05', textura: PALETA, tam: 124, rot: SIN_ROTAR, motores: [nucleo(0, -3.3, -24.7, 3.5, 0.8), ...par(fuego(5.5, 0.4, -8.9, 0.8, 1.1, 1.1))] },
  nave_sombra: { nombre: 'Sombra', archivo: 'SM_Ship_Stealth_02', textura: PALETA, tam: 135, rot: SIN_ROTAR, motores: [nucleo(0, 2.4, -39.5, 5.1, 1.2), ...par(nucleo(9.7, 10.7, -48.5, 3.4)), ...par(fuego(40.5, 10.5, -25.1, 0.7, 0.9, 6, 0.16))] },
  nave_yunque: { nombre: 'Yunque', archivo: 'SM_Ship_Fighter_Heavy_04', textura: PALETA, tam: 150, rot: SIN_ROTAR, motores: [fuego(0, 2, -36.1, 2.4, 2.2, 1.8), ...par(fuego(33, 4.5, -41, 0.5, 7, 0.8))] },
  nave_granizo: { nombre: 'Granizo', archivo: 'SM_Ship_Bomber_01', textura: PALETA, tam: 160, rot: SIN_ROTAR, motores: [...par(nucleo(33.5, -0.6, -53.7, 4.5)), ...par(nucleo(46.8, -0.6, -46.6, 3.3)), fuego(0, 6.5, -40.3, 1.6, 7, 2.1)] },
  nave_eclipse: { nombre: 'Eclipse', archivo: 'SM_Ship_Stealth_04', textura: PALETA, tam: 165, rot: SIN_ROTAR, motores: [nucleo(0, 3.6, -54.1, 7.2, 1.7), fuego(0, 12.7, -43.2, 1.4, 2.5, 3.1), fuego(0, -4.8, -43.2, 1.4, 2.5, 3.1), ...par(fuego(22.1, 0.2, -41, 2, 2.4, 2.4))] },
  nave_trueno: { nombre: 'Trueno', archivo: 'SM_Ship_Bomber_04', textura: PALETA, tam: 170, rot: SIN_ROTAR, motores: [nucleo(0, 0, -51.4, 11.6), ...par(nucleo(27.7, 0, -57.1, 5.3))] },
  nave_tormenta: { nombre: 'Tormenta', archivo: 'SM_Ship_Bomber_03', textura: PALETA, tam: 180, rot: SIN_ROTAR, motores: [anillo(0, -4.8, -48.3, 8.7, 12.9, 1.1, 'cuadrado'), ...par(nucleo(13, -2.6, -45.9, 2.7)), ...par(anillo(39.1, -4, 30.5, 6.5, 6.5, 0.7, 'redondo', FRENTE)), ...par(anillo(39.3, 3.1, 28.5, 2.9, 2.9, 0.4, 'redondo', FRENTE)), ...par(anillo(34.2, 3.1, 28.5, 2.9, 2.9, 0.4, 'redondo', FRENTE)), ...par(fuego(35, -1, -22.7, 1.3, 1, 8, 0.2))] },
  nave_mula: { nombre: 'Mula', archivo: 'SM_Ship_Transport_01', textura: PALETA, tam: 230, rot: SIN_ROTAR, motores: [nucleo(0, -1.8, -103, 17.9), ...par(nucleo(20.4, -9.4, -97.4, 6.1)), ...par(nucleo(20.4, 5.9, -97.4, 6.1)), ...par(fuego(14.5, 18.5, -104, 0.6, 0.6, 3)), ...par(fuego(14.5, -19.5, -103.2, 0.6, 0.6, 3))] },
  nave_centinela: { nombre: 'Centinela', archivo: 'SM_Ship_Cruiser_03', textura: PALETA, tam: 255, rot: SIN_ROTAR, motores: [nucleo(0, -10.8, -76.3, 10.3), ...par(nucleo(17.2, 16.1, -124, 4.2)), ...par(nucleo(29.9, 16.1, -117.2, 3.1))] },
  nave_caravana: { nombre: 'Caravana', archivo: 'SM_Ship_Massive_Transport_01', textura: PALETA, tam: 300, rot: SIN_ROTAR, motores: [nucleo(0, 36.7, -131.8, 9.6, 8.7), nucleo(0, 17.8, -140.6, 5.5), nucleo(0, -21.5, -131.2, 6.1), ...par(nucleo(13.8, -2.2, -134.5, 10.3)), ...par(nucleo(15.3, 17.8, -137.4, 5.5))] },
  nave_nodriza: { nombre: 'Nodriza', archivo: 'SM_Ship_Galactic_Carrier_01', sinCanones: true, textura: PALETA, tam: 340, rot: SIN_ROTAR, motores: [nucleo(0, -31.4, -159.2, 5.4, 5.7), ...par(nucleo(23.3, -16.8, -153, 6.2, 6.5))] },
  nave_acorazada: { nombre: 'Nodriza Acorazada', archivo: 'SM_Ship_Galactic_Carrier_01', sinCanones: true, piezas: ['SM_Ship_Galactic_Carrier_Armor_01'], textura: PALETA, tam: 340, rot: SIN_ROTAR, motores: [nucleo(0, -31.4, -159.2, 5.4, 5.7), ...par(nucleo(23.3, -16.8, -153, 6.2, 6.5))] },
  nave_titan: { nombre: 'Titán', archivo: 'SM_Ship_Colossal_01', textura: PALETA, tam: 360, rot: SIN_ROTAR, motores: [...par(nucleo(21.8, -8.1, -149.2, 11.8)), ...par(nucleo(12.2, -30.6, -147, 11.2))] },

  // NPC hostiles
  npc_espina:  { nombre: 'Espina',  archivo: 'SM_Veh_Drone_Attach_01',   textura: PALETA_SIRKO, tam: 84,  rot: SIN_ROTAR, motores: [fuego(0, 1.4, -40.2, 1.8, 5.9, 0.9), ...par(anillo(24, 0, -20.7, 17.7, 12.8, 0.8, 'redondo', LADO)), nucleo(0, 1.4, -2.7, 2.2, 2.2, FRENTE), ...par(nucleo(4.3, 1.4, -3.7, 1.2, 1.2, FRENTE))] },
  npc_zarpa:   { nombre: 'Zarpa',   archivo: 'SM_Ship_Fighter_Heavy_03', textura: PALETA_SIRKO, tam: 130, rot: SIN_ROTAR, motores: [...par(nucleo(4.4, -4.9, -38, 2.1)), ...par(nucleo(10.7, -4.9, -34.6, 1.5))] },
  npc_behemot: { nombre: 'Behemot', archivo: 'SM_Ship_Cruiser_02',       textura: PALETA_SIRKO, tam: 280, rot: SIN_ROTAR, motores: [anillo(0, -20.2, -95.6, 14.5, 21.5, 2.1, 'cuadrado'), ...par(nucleo(50.7, -22.8, -52.5, 2.3, 1.7)), ...par(anillo(27.8, -20.9, 99.6, 7.4, 7.4, 1.2, 'redondo', FRENTE)), ...par(anillo(31.2, -12.9, 97.4, 3.6, 3.6, 0.6, 'redondo', FRENTE)), ...par(anillo(25.4, -10.6, 97.4, 3.6, 3.6, 0.6, 'redondo', FRENTE)), ...par(nucleo(50.5, -24.1, -4.4, 6.2, 1.7, FRENTE)), ...par(fuego(50.7, -7.7, -52.5, 3.1, 2.6, 15)), ...par(fuego(42.1, 13.2, -52.5, 3.2, 19, 3, -Math.PI / 4)), ...par(fuego(17.6, 32, -97.3, 12.9, 5.2, 13)), ...par(fuego(29, -19.4, 34.6, 1.7, 1.6, 6.5))] },

  // Drones escolta: azules con la paleta del jugador, rojos con la hostil. Sus toberas se detectan solas.
  dron_ataque_azul:     { nombre: 'Dron de ataque', archivo: 'SM_Veh_Drone_Attach_01', textura: PALETA_GRIS, tam: 34, rot: SIN_ROTAR, tinte: 0x8fc0ff },
  dron_ataque_rojo:     { nombre: 'Dron de ataque enemigo', archivo: 'SM_Veh_Drone_Attach_01', textura: PALETA_ROJA, tam: 34, rot: SIN_ROTAR, tinte: 0xff8f80 },
  dron_reparacion_azul: { nombre: 'Dron de reparación', archivo: 'SM_Veh_Drone_Repair_01', textura: PALETA_GRIS, tam: 34, rot: SIN_ROTAR, tinte: 0x8fc0ff },
  dron_reparacion_rojo: { nombre: 'Sanguijuela', archivo: 'SM_Veh_Drone_Repair_01', textura: PALETA_SIRKO, tam: 84, rot: SIN_ROTAR },

  // Base
  base_tierra: { nombre: 'Base Tierra', archivo: 'SM_Ship_Station_03', textura: PALETA, tam: 1000, rot: SIN_ROTAR },
  base_marte:  { nombre: 'Base Marte',  archivo: 'SM_Ship_Station_01', textura: PALETA, tam: 1000, rot: SIN_ROTAR },
  base_venus:  { nombre: 'Base Venus',  archivo: 'SM_Ship_Station_02', textura: PALETA, tam: 1000, rot: SIN_ROTAR },
  portal_aro:      { nombre: 'Portal', archivo: 'SM_Veh_WarpGate_Outer_01', textura: PALETA_SIRKO, tam: 300, rot: SIN_ROTAR },
  portal_interior: { nombre: 'Portal', archivo: 'SM_Veh_WarpGate_Inner_01', textura: PALETA_SIRKO, tam: 300, rot: SIN_ROTAR },

  // Objetos del mundo
  botin:       { nombre: 'Caja de botín', archivo: 'SM_Prop_Crate_01', textura: PALETA, tam: 44, rot: SIN_ROTAR },
  misil_dardo:   { nombre: 'Misil Dardo',   archivo: 'SM_Prop_Missile_01', textura: PALETA, tam: 24, grosor: 0.65, rot: [90, 0, 0] },
  misil_cazador: { nombre: 'Misil Cazador', archivo: 'SM_Prop_Missile_03', textura: PALETA, tam: 30, grosor: 0.65, rot: [90, 0, 0] },
  misil_martillo: { nombre: 'Misil Martillo', archivo: 'SM_Prop_Missile_05', textura: PALETA, tam: 38, grosor: 0.65, rot: [90, 0, 0] },
  mina:        { nombre: 'Mina',          archivo: 'SM_Prop_Mine_01',  textura: PALETA, tam: 46, rot: SIN_ROTAR },
  asteroide_a: { nombre: 'Asteroide',        archivo: 'SM_Env_Astroid_02',       textura: PALETA, tam: 130, rot: SIN_ROTAR, motores: [[-9, -37, 0.9], [9, -37, 0.9]] },
  asteroide_b: { nombre: 'Asteroide hueco',  archivo: 'SM_Env_Astroid_Holes_03', textura: PALETA, tam: 100, rot: SIN_ROTAR },
  asteroide_c: { nombre: 'Asteroide grande', archivo: 'SM_Env_Astroid_Large_01', textura: PALETA, tam: 190, rot: SIN_ROTAR },

  // Basura espacial
  escombro_tubo:      { nombre: 'Tubo roto',      archivo: 'SM_Env_Debris_Pipe_01',      textura: PALETA, tam: 130, rot: SIN_ROTAR, brillo: 2.4 },
  escombro_casco_a:   { nombre: 'Trozo de casco', archivo: 'SM_Env_Debris_Shell_04',     textura: PALETA, tam: 80,  rot: SIN_ROTAR, brillo: 2.6 },
  escombro_casco_b:   { nombre: 'Trozo de casco', archivo: 'SM_Env_Debris_Shell_07',     textura: PALETA, tam: 120, rot: SIN_ROTAR, brillo: 2.6 },
  escombro_casco_c:   { nombre: 'Trozo de casco', archivo: 'SM_Env_Debris_Shell_08',     textura: PALETA, tam: 100, rot: SIN_ROTAR, brillo: 2.6 },
  escombro_armazon_a: { nombre: 'Armazón',        archivo: 'SM_Env_Debris_Structure_01', textura: PALETA, tam: 110, rot: [90, 0, 0], brillo: 3 },
  escombro_armazon_b: { nombre: 'Armazón',        archivo: 'SM_Env_Debris_Structure_03', textura: PALETA, tam: 130, rot: [90, 0, 0], brillo: 3 },

  // Mallas de efectos: render.js y fx.js solo usan su geometría, con su propio material.
  // Se normalizan a tamaño 1 y el código las escala.
  fx_llama:     { nombre: 'Fuego de toberas redondas', archivo: 'SM_Flame_Mesh_New',  textura: PALETA, tam: 1, rot: [90, 0, 0] },
  fx_llama_cuadrada: { nombre: 'Fuego de ranuras alargadas', archivo: 'SM_Flame_Mesh_Square', textura: PALETA, tam: 1, rot: [90, 0, 0] },
  fx_laser:     { nombre: 'Láser', archivo: 'SM_Laser_Trail_01',  textura: PALETA, tam: 1, rot: SIN_ROTAR },
  fx_esfera:    { nombre: 'Burbuja de escudo', archivo: 'SM_SphereGeo',       textura: PALETA, tam: 1, rot: SIN_ROTAR },
  fx_objetivo:  { nombre: 'Retícula de objetivo', archivo: 'SM_Hud_Reticle_03',  textura: PALETA, tam: 1, rot: [90, 0, 0] },
  fx_jugador:   { nombre: 'Retícula del jugador', archivo: 'SM_Hud_Reticle_04',  textura: PALETA, tam: 1, rot: [90, 0, 0] },
  fx_destino:   { nombre: 'Marca de destino', archivo: 'SM_Hud_Reticle_07',  textura: PALETA, tam: 1, rot: [90, 0, 0] },
  fx_guijarro_a: { nombre: 'Restos de explosión', archivo: 'SM_Pebble_Debris_01', textura: PALETA, tam: 10, rot: SIN_ROTAR, brillo: 2 },
  fx_guijarro_b: { nombre: 'Restos de explosión', archivo: 'SM_Pebble_Debris_02', textura: PALETA, tam: 14, rot: SIN_ROTAR, brillo: 2 },
  fx_guijarro_c: { nombre: 'Restos de explosión', archivo: 'SM_Pebble_Debris_03', textura: PALETA, tam: 18, rot: SIN_ROTAR, brillo: 2 },
  fx_resto:      { nombre: 'Restos de explosión', archivo: 'SM_Env_Debris_Shell_02', textura: PALETA, tam: 26, rot: SIN_ROTAR, brillo: 2.6 },

  // Los planetas no usan la paleta: sus texturas son máscaras en blanco y negro que se colorean
  planeta_tierra: { nombre: 'Tierra', archivo: 'SM_Env_Planet_01', textura: 'Planet_Land_Mask_01', tam: 1500, rot: SIN_ROTAR, tinte: 0x5f9fc4 },
  planeta_marte:  { nombre: 'Marte',  archivo: 'SM_Env_Planet_01', textura: 'Planet_Land_Mask_01', tam: 1500, rot: SIN_ROTAR, tinte: 0xc8693a },
  planeta_venus:  { nombre: 'Venus',  archivo: 'SM_Env_Planet_03', textura: 'PolygonSciFiSpace_PlanetLines_01', tam: 1500, rot: SIN_ROTAR, tinte: 0xe0b870 },
  luna:    { nombre: 'Gigante gaseoso', archivo: 'SM_Env_Planet_03', textura: 'PolygonSciFiSpace_PlanetLines_01', tam: 620, rot: SIN_ROTAR, tinte: 0xd8a56a },
};

// Texturas de efectos y de fondo, tal como vienen en Textures/FX_Textures/
// La clave dice para qué se usa cada una: USO_TEXTURAS lo explica en el visor.
// Bots de las empresas: cascos de nave con sus toberas ya medidas, pintados con la paleta de su empresa
ASSETS.npc_caza = { ...ASSETS.nave_cometa, nombre: 'Caza' };
ASSETS.npc_pesado = { ...ASSETS.nave_granizo, nombre: 'Pesado' };

// Tamaños por clase. Las toberas se midieron con el `tam` de cada entrada y se reescalan solas.
// Cada clase se siente más grande que la anterior, sin llegar a escala real: un caza sería un píxel.
const TAMANOS = {
  // Interceptores
  nave_chispa: 90, nave_colibri: 92, nave_lince: 96, npc_espina: 80,
  // Cazas
  nave_vigia: 118, nave_navaja: 124, nave_cometa: 130, nave_aguja: 132, nave_sombra: 138, nave_marea: 150, npc_zarpa: 130, npc_caza: 130,
  // Pesados
  nave_eclipse: 170, nave_yunque: 178, nave_granizo: 185, nave_coloso: 190, nave_trueno: 192, nave_tormenta: 200, nave_fantasma: 205, nave_escarabajo: 212, npc_pesado: 190,
  // Cruceros
  nave_bastion: 280, nave_centinela: 295, npc_behemot: 320,
  // Transportes
  nave_mula: 650, nave_caravana: 760,
  // Capitales
  nave_nodriza: 1000, nave_acorazada: 1000, nave_titan: 1200,
  // Estaciones, portales y planetas
  base_tierra: 1600, base_marte: 1600, base_venus: 1600, portal_aro: 440, portal_interior: 440,
  planeta_tierra: 3200, planeta_marte: 3200, planeta_venus: 3200,
  // Drones
  dron_ataque_azul: 30, dron_ataque_rojo: 30, dron_reparacion_azul: 30, dron_reparacion_rojo: 80,
};
const MEDIDAS = ['x', 'y', 'z', 'ancho', 'alto', 'hondo', 'grosor'];
for (const [id, tam] of Object.entries(TAMANOS)) {
  const def = ASSETS[id], k = tam / def.tam;
  const reescalar = (m) => ({ ...m, ...Object.fromEntries(MEDIDAS.filter((c) => c in m).map((c) => [c, m[c] * k])) });
  ASSETS[id] = { ...def, tam, ...(def.motores && { motores: def.motores.map(reescalar) }) };
}

export const TEXTURAS_FX = {
  explosion: 'Explosion',
  nube: 'ExplosionCloud',
  brillo: 'SphereGlow',
  destello: 'Transparent_Flash',
  linea: 'Transparent_Line',
  circulo: 'Circle_Dashes',
  llama: 'Gradient_Boost',
  focos: 'PolygonSciFiSpace_Emissive_Mask',
  polvo: 'SpaceDust',
  cielo: 'PolygonSciFiSpace_Skybox_02_Front',
  estrellas: 'PolygonSciFiSpace_Skybox_04_Front',
};

export const USO_TEXTURAS = {
  explosion: 'Explosiones y fogonazos',
  nube: 'Fuego y humo',
  brillo: 'Destellos y núcleos de energía',
  destello: 'Láser y chispas',
  linea: 'Rayo perforante',
  circulo: 'Zona segura, escudo y ondas',
  llama: 'Motores',
  focos: 'Luces de naves, bases y portales',
  polvo: 'Polvo espacial',
  cielo: 'Fondo',
  estrellas: 'Fondo',
};

// Torreta de dos cañones que trae el Carrier: es el arma visible de todas las naves.
export const CANON = { archivo: 'SM_Ship_Galactic_Carrier_01', nodo: 'SM_Ship_Galactic_Carrier_Gun_01', largo: 751 };
export const largoCanon = (tam) => Math.min(110, Math.max(13, tam * 0.14));

// Piezas del pack que sirven de imagen en los botones de habilidad
export const ICONOS = { impulso: 'SM_Veh_Part_Engine_02', reparacion: 'SM_Veh_Drone_Repair_01', barrera: 'SM_Wep_Shield_01' };

// Modelo real que se ve en cada socket, uno por nivel. `largo` es relativo al del cañón de la nave.
const torretaBase = (n) => `SM_Prop_Turret_Base_${n}`;
const niveles = (nodos, largo, ...archivos) => archivos.map((n) => ({ archivo: torretaBase(n), nodos, largo }));
export const MODELOS_ARMA = {
  pulso: [1, 1.2, 1.4].map((largo) => ({ archivo: CANON.archivo, nodos: /Carrier_Gun_01$/, largo })), // crece con el nivel
  enjambre: niveles(/Gattling/, 1.2, 'Double_01', 'Double_02', 'Double_03'),
  lanza: niveles(/Laser/, 1.3, 'Single_04', 'Single_05', 'Single_06'),
  dardo: niveles(/Missile/, 0.5, 'Single_09', 'Double_09', 'Single_010'),
  cazador: niveles(/Missile/, 0.5, 'Single_08', 'Double_08', 'Single_010'),
  martillo: niveles(/Missile/, 0.5, 'Single_07', 'Double_07', 'Double_010'),
};

// Puestos de cañón en fracción del tamaño, medidos sobre el casco real de cada nave: [x, y, z].
// Con x distinto de 0 es un par, uno por lado. El orden es el que se van llenando al subir de nivel.
// Nodriza y Acorazada usan los puestos originales de sus cañones de arriba.
export const MONTAJES = {
  nave_chispa: [[0.072,0.045,0.038],[0.344,-0.039,0.038],[0.208,-0.064,0.129]],
  nave_vigia: [[0.161,-0.017,0.061],[0.161,0.047,-0.325],[0.388,-0.017,-0.007]],
  nave_aguja: [[0.184,0.175,0.114],[0.184,0.172,-0.25],[0.184,0.169,0.295]],
  nave_marea: [[0.047,0.017,0.082],[0.434,-0.112,-0.009],[0.184,0.01,-0.123]],
  nave_coloso: [[0.251,0.058,0.109],[0.455,0.004,-0.05],[0.228,0.044,-0.141]],
  nave_escarabajo: [[0.041,0.046,0.122],[0.451,-0.144,-0.128],[0.223,-0.015,-0.265]],
  nave_fantasma: [[0.088,-0.001,0.159],[0.384,-0.041,-0.136],[0.111,-0.002,-0.25]],
  nave_bastion: [[0.031,0.036,0.205],[0.19,0.073,-0.114],[0.236,-0.032,0.364],[0.145,0.05,-0.364],[0.122,0.053,0.045],[0.168,0.003,0.25]],
  nave_colibri: [[0.048,0.043,-0.006],[0.457,-0.04,-0.165],[0.275,-0.017,0.017]],
  nave_lince: [[0.047,-0.002,-0.022],[0.388,0.075,-0.136],[0.206,0.021,-0.113]],
  nave_cometa: [[0.07,0.079,0.066],[0.456,0.053,-0.139],[0.275,0.007,-0.002]],
  nave_navaja: [[0.093,-0.027,0.115],[0.388,0.038,0.138],[0.093,-0.034,-0.203]],
  nave_sombra: [[0.138,0.047,0.159],[0.184,0.045,-0.227],[0.229,0.06,-0.023]],
  nave_yunque: [[0.184,0.066,0.136],[0.229,0.039,-0.25],[0.434,0.025,0.091]],
  nave_granizo: [[0.047,0.052,-0.046],[0.456,0.002,-0.16],[0.229,0.037,-0.25]],
  nave_eclipse: [[0.184,0.11,0.114],[0.184,0.106,-0.25],[0.184,0.103,0.295]],
  nave_trueno: [[0.068,0.028,0.085],[0.455,-0.048,-0.143],[0.159,0.051,-0.165]],
  nave_tormenta: [[0.067,0.02,0.091],[0.408,-0.001,-0.046],[0.18,0.041,-0.114]],
  nave_mula: [[0.025,0.106,0.159],[0.139,0.091,-0.159],[0.139,0.091,0.023],[0.071,0.127,-0.295],[0.071,0.084,-0.432],[0.116,0.106,0.114]],
  nave_centinela: [[0.075,0.05,0.091],[0.303,0.015,-0.091],[0.121,0.012,0.341],[0.098,0.087,-0.295],[0.075,0.05,-0.114],[0.075,0.083,-0.432]],
  nave_caravana: [[0.022,0.173,0.114],[0.067,0.097,0.273],[0.067,0.1,-0.068],[0.067,0.1,-0.205],[0.067,0.093,-0.341],[0.067,0.093,-0.432]],
  nave_titan: [[0.015,0.089,0.114],[0.06,0.01,-0.477],[0.037,0.085,0.205],[0.037,0.107,-0.023],[0.037,0.069,0.295],[0.037,0.069,0.409],[0.037,0.122,-0.25],[0.037,0.126,-0.341]],
  npc_zarpa: [[0.116,0.03,-0.056],[0.456,-0.032,-0.034],[0.275,-0.041,0.012]],
  npc_behemot: [[0.027,0.03,0.114],[0.141,0.084,-0.159],[0.118,-0.041,0.318],[0.096,-0.026,0.205],[0.05,-0.002,0.364],[0.05,0,0.273]],
  npc_caza: [[0.07,0.079,0.066],[0.456,0.053,-0.139],[0.275,0.007,-0.002]],
  npc_pesado: [[0.046,0.052,-0.046],[0.455,0.003,-0.16],[0.228,0.037,-0.25]],
  nave_nodriza: [[0.056,-0.008,0.352],[0.078,-0.009,0.01],[0.046,-0.004,-0.422],[0.019,-0.024,0.339],[0.078,-0.009,-0.074],[0.077,-0.004,-0.422]],
  nave_acorazada: [[0.056,-0.008,0.352],[0.078,-0.009,0.01],[0.046,-0.004,-0.422],[0.019,-0.024,0.339],[0.078,-0.009,-0.074],[0.077,-0.004,-0.422],[0,0.019,-0.235],[0,0.015,-0.121],[0,0.014,-0.071],[0,0.011,0.031],[0,0.002,0.163]],
};
// Puestos de costado y de panza, medidos sobre el casco. Los de panza van en la orilla
// delantera para que asomen desde arriba.
const GIRO_LADO = -1.4, GIRO_PANZA = Math.PI; // inclinación de la torreta sobre su eje Z
export const EXTRAS = {
  nave_chispa: { lados: [[0.046,0,0.194],[0.182,0,-0.048]], panza: [[0.05,-0.08,0.444]] },
  nave_vigia: { lados: [[0.043,0,0.252],[0.13,0,0.063]], panza: [[0.05,-0.041,0.323]] },
  nave_aguja: { lados: [[0.062,0,0.2],[0.145,0,-0.05]], panza: [[0.14,0.139,0.29]] },
  nave_marea: { lados: [[0.042,0,0.149],[0.226,0,-0.037]], panza: [[0.05,-0.067,0.293]] },
  nave_coloso: { lados: [[0.095,0,0.308],[0.447,0,0.077]], panza: [[0.05,-0.066,0.481]] },
  nave_escarabajo: { lados: [[0.072,0,0.257],[0.285,0,-0.04]], panza: [[0.05,-0.033,0.311]] },
  nave_fantasma: { lados: [[0.086,0,0.32],[0.227,0,-0.05]], panza: [[0.05,-0.027,0.5]] },
  nave_bastion: { lados: [[0.202,0,0.32],[0.213,0,-0.05]], panza: [[0.05,0.022,0.45]] },
  nave_colibri: { lados: [[0.171,0,0.266],[0.193,0,-0.042]], panza: [[0.14,-0.029,0.405]] },
  nave_lince: { lados: [[0.04,0,0.051],[0.165,0,-0.114]], panza: [[0.05,-0.084,0.108]] },
  nave_cometa: { lados: [[0.06,0,0.292],[0.241,0,0.073]], panza: [[0.05,-0.041,0.397]] },
  nave_navaja: { lados: [[0.326,0,0.159],[0.249,0,0.04]], panza: [[0.14,-0.046,0.208]] },
  nave_sombra: { lados: [[0.114,0,0.32],[0.161,0,0.08]], panza: [[0.09,-0.002,0.49]] },
  nave_yunque: { lados: [[0.084,0,0.32],[0.322,0,0.08]], panza: [[0.05,-0.041,0.42]] },
  nave_granizo: { lados: [[0.081,0,0.233],[0.45,0,-0.036]], panza: [[0.05,-0.047,0.354]] },
  nave_eclipse: { lados: [[0.065,0,0.2],[0.187,0,-0.05]], panza: [[0.14,-0.11,0.29]] },
  nave_trueno: { lados: [[0.265,0,0.266],[0.386,0,-0.042]], panza: [[0.05,-0.055,0.295]] },
  nave_tormenta: { lados: [[0.075,0,0.218],[0.448,0,-0.034]], panza: [[0.05,-0.053,0.331]] },
  nave_mula: { lados: [[0.072,0,0.32],[0.17,0,-0.05]], panza: [[0.05,-0.02,0.34]] },
  nave_centinela: { lados: [[0.155,0,0.32],[0.143,0,0.08]], panza: [[0.05,0.019,0.48]] },
  nave_caravana: { lados: [[0.092,0,0.32],[0.127,0,-0.05]], panza: [[0.05,0.031,0.47]] },
  nave_titan: { lados: [[0.084,0,0.32],[0.101,0,-0.05]], panza: [[0.05,0.031,0.49]] },
  nave_nodriza: { lados: [[0.054,0,-0.3]], panza: [[0.05,-0.035,0.48],[0.09,-0.056,0.27]] },
  nave_acorazada: { lados: [[0.047,0,-0.05],[0.047,0,-0.18]], panza: [[0.05,-0.035,0.48],[0.09,-0.056,0.27]] },
};

// Reparte los puestos de la nave entre sus sockets. Cada entrada es un par, uno por lado.
// Los misiles usan los últimos puestos de arriba; los láseres, los demás mezclados con los extras.
export function puestosSockets(id, { laser, misil }) {
  const arriba = [...(MONTAJES[id] ?? [])], extra = EXTRAS[id] ?? { lados: [], panza: [] };
  const pares = (n) => Math.ceil(n / 2);
  const misiles = [];
  for (let i = arriba.length - 1; i > 0 && misiles.length < pares(misil); i--) if (arriba[i][0]) misiles.unshift(...arriba.splice(i, 1));
  const lados = extra.lados.map((p) => [...p, GIRO_LADO]), panza = extra.panza.map((p) => [...p, GIRO_PANZA]);
  const lasers = [];
  while (arriba.length || lados.length || panza.length) {
    for (const lista of [arriba, lados, panza]) if (lista.length) lasers.push(lista.shift());
  }
  while (misiles.length < pares(misil) && lasers.length > pares(laser)) misiles.push(lasers.pop());
  const abrir = (lista, n) => lista.flatMap(([x, y, z, g = 0]) => (x ? [[x, y, z, g], [-x, y, z, g === GIRO_PANZA ? g : -g]] : [[x, y, z, g]])).slice(0, n);
  return { laser: abrir(lasers, laser), misil: abrir(misiles, misil) };
}

export const puestosDe = (id) => (MONTAJES[id] ?? []).flatMap(([x, y, z]) => (x ? [[x, y, z], [-x, y, z]] : [[x, y, z]]));
// Nivel 3 llena todos los puestos; los anteriores, una parte y siempre en pares
export function canonesDe(id, nivel) {
  const total = puestosDe(id).length;
  return Math.min(total, Math.ceil(total * nivel / 3 / 2) * 2);
}
