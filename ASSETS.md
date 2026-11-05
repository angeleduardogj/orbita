# Inventario de assets

Pack: **POLYGON Sci-Fi Space** de Synty, versión Unity 2020.3 v1.13.0.
`assets/POLYGON_SciFi_Space_Unity_2020_3_v1_13_0.zip` contiene un `.unitypackage`.

**Origen y licencia:** el zip trae un banner de un sitio de descargas de terceros, no de Synty. Confirma que tienes
una licencia válida antes de publicar el juego. Los modelos y texturas están fuera de git (ver `.gitignore`).

## Cómo se usa

1. `npm run extraer` saca los FBX y PNG del paquete a `assets/pack/`. Prefabs, materiales y escenas se ignoran.
2. `npm run dev` copia los FBX y PNG a `public/` y escribe el catálogo que usa el visor.
3. `src/models.js` normaliza al cargar: material con la paleta en sRGB, escala, centro y orientación.

No se convierte a GLB: los FBX son binarios, `FBXLoader` los lee directo y no hay Blender en esta máquina.
Las naves ya apuntan a +Z. Solo el dron `SM_Veh_Drone_Attach_01` se gira 180°.

## Mapeo actual

| Pieza | Modelo | Textura | Tamaño (u) |
|---|---|---|---:|
| Chispa | `SM_Ship_Fighter_01` | `Texture_01_A` | 90 |
| Vigía | `SM_Ship_Fighter_04` | `Texture_01_A` | 118 |
| Aguja | `SM_Ship_Stealth_03` | `Texture_01_A` | 132 |
| Marea | `SM_Ship_Fighter_Heavy_01` | `Texture_01_A` | 150 |
| Coloso | `SM_Ship_Bomber_02` | `Texture_01_A` | 190 |
| Escarabajo | `SM_Ship_Fighter_Heavy_02` | `Texture_01_A` | 190 |
| Fantasma | `SM_Ship_Stealth_01` | `Texture_01_A` | 215 |
| Bastión | `SM_Ship_Cruiser_01` | `Texture_01_A` | 250 |
| Colibrí | `SM_Ship_Fighter_05` | `Texture_01_A` | 108 |
| Lince | `SM_Ship_Fighter_03` | `Texture_01_A` | 112 |
| Cometa | `SM_Ship_Fighter_02` | `Texture_01_A` | 120 |
| Navaja | `SM_Ship_Stealth_05` | `Texture_01_A` | 124 |
| Sombra | `SM_Ship_Stealth_02` | `Texture_01_A` | 135 |
| Yunque | `SM_Ship_Fighter_Heavy_04` | `Texture_01_A` | 150 |
| Granizo | `SM_Ship_Bomber_01` | `Texture_01_A` | 160 |
| Eclipse | `SM_Ship_Stealth_04` | `Texture_01_A` | 165 |
| Trueno | `SM_Ship_Bomber_04` | `Texture_01_A` | 190 |
| Tormenta | `SM_Ship_Bomber_03` | `Texture_01_A` | 180 |
| Mula | `SM_Ship_Transport_01` | `Texture_01_A` | 230 |
| Centinela | `SM_Ship_Cruiser_03` | `Texture_01_A` | 255 |
| Caravana | `SM_Ship_Massive_Transport_01` | `Texture_01_A` | 300 |
| Nodriza | `SM_Ship_Galactic_Carrier_01` | `Texture_01_A` | 340 |
| Nodriza Acorazada | `SM_Ship_Galactic_Carrier_01` + `SM_Ship_Galactic_Carrier_Armor_01` | `Texture_01_A` | 340 |
| Titán | `SM_Ship_Colossal_01` | `Texture_01_A` | 360 |
| Bases (Tierra, Marte, Venus) | `SM_Ship_Station_03`, `_01`, `_02` | `Texture_01_A` | 1000 |
| Portal | `SM_Veh_WarpGate_Outer_01`, `SM_Veh_WarpGate_Inner_01` | `Texture_01_A` | 300 |
| Bots Caza y Pesado | `SM_Ship_Fighter_02`, `SM_Ship_Bomber_01` | `Texture_01_A` con tinte | 120, 160 |
| Espina (NPC) | `SM_Veh_Drone_Attach_01` | `Texture_02_A` | 84 |
| Zarpa (NPC) | `SM_Ship_Fighter_Heavy_03` | `Texture_02_A` | 130 |
| Behemot (NPC) | `SM_Ship_Cruiser_02` | `Texture_02_A` | 280 |
| Base | `SM_Ship_Station_03` | `Texture_01_A` | 1000 |
| Caja de botín | `SM_Prop_Crate_01` | `Texture_01_A` | 44 |
| Mina | `SM_Prop_Mine_01` | `Texture_01_A` | 46 |
| Asteroides | `SM_Env_Astroid_02`, `SM_Env_Astroid_Holes_03`, `SM_Env_Astroid_Large_01` | `Texture_01_A` | 100–190 |
| Planeta | `SM_Env_Planet_01` | `Planet_Land_Mask_01` con tinte | 1500 |
| Gigante gaseoso | `SM_Env_Planet_03` | `PlanetLines_01` con tinte | 620 |

| Basura espacial | `SM_Env_Debris_Pipe_01`, `SM_Env_Debris_Shell_04/07/08`, `SM_Env_Debris_Structure_01/03` | `Texture_01_A` | 80–130 |

## Efectos

Todos salen del pack y siguen la receta de sus prefabs (`src/fx.js`):

| Efecto | Texturas y mallas | Prefab de referencia |
|---|---|---|
| Disparo | `SM_Laser_Trail_01`, `Transparent_Flash` | `FX_Laser_Shot` |
| Fogonazo e impacto | `Explosion`, `SphereGlow`, `Transparent_Flash` | `FX_Laser_Bullet` |
| Explosión | `Explosion`, `ExplosionCloud`, `SphereGlow`, `Transparent_Flash`, `SM_Pebble_Debris_01/02/03`, `SM_Env_Debris_Shell_02` | `FX_Explosion` |
| Fuego de toberas oscuras | `SM_Flame_Mesh_New`, `SM_Flame_Mesh_Square`, `Gradient_Boost` | `FX_Flame_Booster_Round` |
| Núcleos de energía | `SphereGlow` | — |
| Escudo | `SM_SphereGeo`, `Circle_Dashes` | — |
| Humo por daño | `ExplosionCloud` | `FX_Fire_01` |
| Rayo perforante | `SM_Laser_Trail_01`, `Transparent_Line` | — |
| Zona segura, ondas y zona de reparación | `Circle_Dashes` | — |
| Retículas | `SM_Hud_Reticle_03/04/07` | — |
| Fondo | `Skybox_02_Front`, `Skybox_04_Front`, `SpaceDust` | — |

Unity anima esos prefabs con su sistema de partículas, que no se exporta: los tiempos y tamaños se reprodujeron a mano.

## Texturas

- Paletas: `PolygonSciFiSpace_Texture_01_A` en `Textures/`; variantes `01_B`–`01_F`, `02_A`–`02_F` y `03_A`–`03_E` en `Textures/Alts/`.
- Los planetas y `SM_Env_Asteroid_0X` no usan la paleta: en Unity llevan un shader con máscaras (`Planet_Land_Mask_01`, `Planet_Cloud_Mask_01`, `PlanetLines_01`).

El visor en `http://localhost:5173/viewer` muestra todos los modelos y texturas, con un check si están en uso y en qué parte del juego.

## Inventario completo

### Naves (32)

`SM_Ship_Bomber_01`, `SM_Ship_Bomber_02`, `SM_Ship_Bomber_03`, `SM_Ship_Bomber_04`, `SM_Ship_Colossal_01`, `SM_Ship_Cruiser_01`, `SM_Ship_Cruiser_02`, `SM_Ship_Cruiser_03`, `SM_Ship_Fighter_01`, `SM_Ship_Fighter_02`, `SM_Ship_Fighter_03`, `SM_Ship_Fighter_04`, `SM_Ship_Fighter_05`, `SM_Ship_Fighter_Heavy_01`, `SM_Ship_Fighter_Heavy_02`, `SM_Ship_Fighter_Heavy_03`, `SM_Ship_Fighter_Heavy_04`, `SM_Ship_Galactic_Carrier_01`, `SM_Ship_Galactic_Carrier_Armor_01`, `SM_Ship_Massive_Transport_01`, `SM_Ship_Station_01`, `SM_Ship_Station_02`, `SM_Ship_Station_03`, `SM_Ship_Station_04`, `SM_Ship_Station_05`, `SM_Ship_Station_06`, `SM_Ship_Stealth_01`, `SM_Ship_Stealth_02`, `SM_Ship_Stealth_03`, `SM_Ship_Stealth_04`, `SM_Ship_Stealth_05`, `SM_Ship_Transport_01`

### Vehículos y partes de nave (75)

`SM_Veh_Beacon_01`, `SM_Veh_Drone_Attach_01`, `SM_Veh_Drone_Repair_01`, `SM_Veh_EscapePod_Large_01`, `SM_Veh_EscapePod_Small_01`, `SM_Veh_MissleRack_01`, `SM_Veh_POV_Cockpit_01`, `SM_Veh_POV_Cockpit_Frame_01`, `SM_Veh_POV_Cockpit_Frame_02`, `SM_Veh_POV_Cockpit_Frame_03`, `SM_Veh_Part_Body_01`, `SM_Veh_Part_Body_02`, `SM_Veh_Part_Body_03`, `SM_Veh_Part_Body_04`, `SM_Veh_Part_Cockpit_01`, `SM_Veh_Part_Cockpit_02`, `SM_Veh_Part_Cockpit_03`, `SM_Veh_Part_Cockpit_04`, `SM_Veh_Part_Cockpit_05`, `SM_Veh_Part_Engine_01`, `SM_Veh_Part_Engine_02`, `SM_Veh_Part_Engine_03`, `SM_Veh_Part_Engine_04`, `SM_Veh_Part_Engine_05`, `SM_Veh_Part_Engine_06`, `SM_Veh_Part_Engine_07`, `SM_Veh_Part_Engine_08`, `SM_Veh_Part_Engine_09`, `SM_Veh_Part_LandingGear_Flat_01`, `SM_Veh_Part_LandingGear_Flat_02`, `SM_Veh_Part_LandingGear_Wheel_01`, `SM_Veh_Part_LandingGear_Wheel_02`, `SM_Veh_Part_Misc_01`, `SM_Veh_Part_Misc_010`, `SM_Veh_Part_Misc_011`, `SM_Veh_Part_Misc_012`, `SM_Veh_Part_Misc_013`, `SM_Veh_Part_Misc_014`, `SM_Veh_Part_Misc_015`, `SM_Veh_Part_Misc_016`, `SM_Veh_Part_Misc_017`, `SM_Veh_Part_Misc_018`, `SM_Veh_Part_Misc_019`, `SM_Veh_Part_Misc_02`, `SM_Veh_Part_Misc_020`, `SM_Veh_Part_Misc_021`, `SM_Veh_Part_Misc_022`, `SM_Veh_Part_Misc_023`, `SM_Veh_Part_Misc_03`, `SM_Veh_Part_Misc_04`, `SM_Veh_Part_Misc_05`, `SM_Veh_Part_Misc_06`, `SM_Veh_Part_Misc_07`, `SM_Veh_Part_Misc_08`, `SM_Veh_Part_Misc_09`, `SM_Veh_Part_Wing_01`, `SM_Veh_Part_Wing_010`, `SM_Veh_Part_Wing_011`, `SM_Veh_Part_Wing_012`, `SM_Veh_Part_Wing_013`, `SM_Veh_Part_Wing_014`, `SM_Veh_Part_Wing_015`, `SM_Veh_Part_Wing_016`, `SM_Veh_Part_Wing_02`, `SM_Veh_Part_Wing_03`, `SM_Veh_Part_Wing_04`, `SM_Veh_Part_Wing_05`, `SM_Veh_Part_Wing_06`, `SM_Veh_Part_Wing_07`, `SM_Veh_Part_Wing_08`, `SM_Veh_Part_Wing_09`, `SM_Veh_Sweepo_01`, `SM_Veh_WarpGate_Glow_01`, `SM_Veh_WarpGate_Inner_01`, `SM_Veh_WarpGate_Outer_01`

### Entorno: asteroides, planetas y escombros (56)

`SM_Env_Asteroid_01`, `SM_Env_Asteroid_02`, `SM_Env_Asteroid_03`, `SM_Env_Asteroid_04`, `SM_Env_Asteroid_05`, `SM_Env_Asteroid_06`, `SM_Env_Asteroid_07`, `SM_Env_Astroid_01`, `SM_Env_Astroid_02`, `SM_Env_Astroid_03`, `SM_Env_Astroid_04`, `SM_Env_Astroid_05`, `SM_Env_Astroid_Field_01`, `SM_Env_Astroid_Field_02`, `SM_Env_Astroid_Field_LowDetail_01`, `SM_Env_Astroid_Field_LowDetail_02`, `SM_Env_Astroid_Holes_01`, `SM_Env_Astroid_Holes_02`, `SM_Env_Astroid_Holes_03`, `SM_Env_Astroid_Holes_04`, `SM_Env_Astroid_Holes_05`, `SM_Env_Astroid_Large_01`, `SM_Env_Astroid_Large_02`, `SM_Env_Astroid_Large_Holes_01`, `SM_Env_Astroid_Large_Holes_02`, `SM_Env_Debris_Pipe_01`, `SM_Env_Debris_Shell_01`, `SM_Env_Debris_Shell_02`, `SM_Env_Debris_Shell_03`, `SM_Env_Debris_Shell_04`, `SM_Env_Debris_Shell_05`, `SM_Env_Debris_Shell_06`, `SM_Env_Debris_Shell_07`, `SM_Env_Debris_Shell_08`, `SM_Env_Debris_Structure_01`, `SM_Env_Debris_Structure_02`, `SM_Env_Debris_Structure_03`, `SM_Env_PlanetRings_01`, `SM_Env_Planet_01`, `SM_Env_Planet_02`, `SM_Env_Planet_03`, `SM_Env_Planet_04`, `SM_Env_Planet_05`, `SM_Env_Planet_06`, `SM_Env_Planet_07`, `SM_Env_Planet_08`, `SM_Env_Planet_09`, `SM_Env_Planet_10`, `SM_Env_Planet_11`, `SM_Env_Planet_12`, `SM_Env_Planet_13`, `SM_Env_Planet_14`, `SM_Env_Rubble_Pebbles_01`, `SM_Env_Rubble_Pebbles_02`, `SM_Env_Rubble_Pile_01`, `SM_Env_Rubble_Pile_02`

### Edificios e interiores (117)

`SM_Bld_Bridge_Ceiling_01`, `SM_Bld_Bridge_Chair_01`, `SM_Bld_Bridge_Chair_Captain_01`, `SM_Bld_Bridge_Console_01`, `SM_Bld_Bridge_Console_02`, `SM_Bld_Bridge_Console_Corner_01`, `SM_Bld_Bridge_Console_Corner_02`, `SM_Bld_Bridge_Floor_01`, `SM_Bld_Bridge_Platform_01`, `SM_Bld_Bridge_Rear_Wall_01`, `SM_Bld_Bridge_Wall_Details_01`, `SM_Bld_Bridge_Walls_01`, `SM_Bld_Ceiling_01`, `SM_Bld_Ceiling_02`, `SM_Bld_Ceiling_03`, `SM_Bld_Ceiling_Pipe_Junction_01`, `SM_Bld_Ceiling_Pipes_Straight_01`, `SM_Bld_Ceiling_Pipes_Straight_Broken_01`, `SM_Bld_Ceiling_Pipes_Turn_L_01`, `SM_Bld_Ceiling_Pipes_Turn_R_01`, `SM_Bld_Corridor_Double_Arch_01`, `SM_Bld_Corridor_Double_Arch_02`, `SM_Bld_Corridor_Single_Arch_01`, `SM_Bld_Corridor_Single_Arch_02`, `SM_Bld_Corridor_Single_Arch_03`, `SM_Bld_Crew_Beds_01`, `SM_Bld_Crew_Blank_01`, `SM_Bld_Crew_Blank_02`, `SM_Bld_Crew_Desk_01`, `SM_Bld_Crew_Kitchen_01`, `SM_Bld_Crew_Shower_01`, `SM_Bld_Crew_Toilet_01`, `SM_Bld_Floor_01`, `SM_Bld_Floor_010`, `SM_Bld_Floor_011`, `SM_Bld_Floor_02`, `SM_Bld_Floor_03`, `SM_Bld_Floor_04`, `SM_Bld_Floor_05`, `SM_Bld_Floor_06`, `SM_Bld_Floor_07`, `SM_Bld_Floor_08`, `SM_Bld_Floor_09`, `SM_Bld_Floor_Large_Walkway_02`, `SM_Bld_Floor_Large_Walkway_Endcap_01`, `SM_Bld_Floor_Small_01`, `SM_Bld_Floor_Small_02`, `SM_Bld_Floor_Small_03`, `SM_Bld_Floor_Small_04`, `SM_Bld_Floor_Small_05`, `SM_Bld_Floor_Small_06`, `SM_Bld_Floor_Small_07`, `SM_Bld_Floor_Small_08`, `SM_Bld_Floor_Small_Hand_Rail_01`, `SM_Bld_Floor_Small_Hand_Rail_End_01`, `SM_Bld_Floor_Small_Hatch_01`, `SM_Bld_Floor_Small_Walkway_02`, `SM_Bld_Floor_Small_Walkway_Endcap_01`, `SM_Bld_HangarExteriorShip_01`, `SM_Bld_HangarExteriorShip_02`, `SM_Bld_HangarPlatform_01`, `SM_Bld_Hangar_01`, `SM_Bld_House_Interior_Floor_01`, `SM_Bld_Hydroponics_BaseFloor_01`, `SM_Bld_Hydroponics_Roof_01`, `SM_Bld_Hydroponics_UpperFloor_01`, `SM_Bld_Landing_Platform_01`, `SM_Bld_Lift_01`, `SM_Bld_Lift_Wall_01`, `SM_Bld_Roof_Exterior_01`, `SM_Bld_Roof_Exterior_02`, `SM_Bld_Roof_Exterior_03`, `SM_Bld_Wall_01`, `SM_Bld_Wall_01_Alt`, `SM_Bld_Wall_02`, `SM_Bld_Wall_03`, `SM_Bld_Wall_04`, `SM_Bld_Wall_04_Alt`, `SM_Bld_Wall_05`, `SM_Bld_Wall_06`, `SM_Bld_Wall_Corner_Pillar_01`, `SM_Bld_Wall_Corner_Pillar_02`, `SM_Bld_Wall_Corner_Pillar_03`, `SM_Bld_Wall_Corner_Pillar_04`, `SM_Bld_Wall_Corner_Pillar_05`, `SM_Bld_Wall_Corner_Pillar_Wide_01`, `SM_Bld_Wall_Corner_Pillar_Wide_02`, `SM_Bld_Wall_Corner_Pillar_Wide_03`, `SM_Bld_Wall_Corner_Pillar_Wide_04`, `SM_Bld_Wall_Corner_Pillar_Wide_05`, `SM_Bld_Wall_Doorframe_01`, `SM_Bld_Wall_Doorframe_02`, `SM_Bld_Wall_Doorframe_03`, `SM_Bld_Wall_Doorframe_04`, `SM_Bld_Wall_Doorframe_05`, `SM_Bld_Wall_Doorframe_06`, `SM_Bld_Wall_Doorframe_Outer_01`, `SM_Bld_Wall_Doorframe_Outer_02`, `SM_Bld_Wall_EscPod_Hatch_01`, `SM_Bld_Wall_Exterior_01`, `SM_Bld_Wall_Exterior_02`, `SM_Bld_Wall_Exterior_03`, `SM_Bld_Wall_Exterior_04`, `SM_Bld_Wall_Exterior_Pillar_01`, `SM_Bld_Wall_Exterior_Window_01`, `SM_Bld_Wall_Exterior_Window_02`, `SM_Bld_Wall_Mechanical_01`, `SM_Bld_Wall_Mechanical_02`, `SM_Bld_Wall_Pillar_01`, `SM_Bld_Wall_Pillar_02`, `SM_Bld_Wall_Pillar_03`, `SM_Bld_Wall_Pillar_04`, `SM_Bld_Wall_Pillar_05`, `SM_Bld_Wall_Pillar_06`, `SM_Bld_Wall_Pillar_07`, `SM_Bld_Wall_Pods_01`, `SM_Bld_Wall_Tube_01`

### Props (235)

`SM_Prop_AirVent_Large_01`, `SM_Prop_AirVent_Small_01`, `SM_Prop_Antenna_01`, `SM_Prop_Barrel_01`, `SM_Prop_Battery_01`, `SM_Prop_Battery_02`, `SM_Prop_Battery_03`, `SM_Prop_Bed_01`, `SM_Prop_Bed_02`, `SM_Prop_Bed_03`, `SM_Prop_Bed_Medical_01`, `SM_Prop_Buttons_01`, `SM_Prop_Buttons_02`, `SM_Prop_Buttons_03`, `SM_Prop_Buttons_04`, `SM_Prop_Buttons_05`, `SM_Prop_Buttons_06`, `SM_Prop_Buttons_07`, `SM_Prop_Buttons_08`, `SM_Prop_Buttons_09`, `SM_Prop_Buttons_10`, `SM_Prop_Buttons_11`, `SM_Prop_Buttons_12`, `SM_Prop_Buttons_13`, `SM_Prop_Buttons_14`, `SM_Prop_Cart_01`, `SM_Prop_Cart_Filled_01`, `SM_Prop_CenterTube_01`, `SM_Prop_CenterTube_02`, `SM_Prop_Chr_Female_Cryo_01`, `SM_Prop_Chr_Female_Cryo_02`, `SM_Prop_Chr_Male_Cryo_01`, `SM_Prop_Chr_Male_Cryo_02`, `SM_Prop_ControlPanel_01`, `SM_Prop_ControlPanel_02`, `SM_Prop_ControlPanel_03`, `SM_Prop_ControlPanel_04`, `SM_Prop_CornerSeat_01`, `SM_Prop_CornerTable_01`, `SM_Prop_Crate_01`, `SM_Prop_Crate_02`, `SM_Prop_Crate_Ammo_01`, `SM_Prop_Crate_Ammo_02`, `SM_Prop_Crate_Shield_01`, `SM_Prop_Crate_Shield_02`, `SM_Prop_Crate_Wide_01`, `SM_Prop_Crate_health_01`, `SM_Prop_Crate_health_02`, `SM_Prop_CryoBed_01`, `SM_Prop_DeadZub_01`, `SM_Prop_Decontamination_Shower_01`, `SM_Prop_Desk_End_01`, `SM_Prop_Desk_Small_01`, `SM_Prop_Detail_Airvent_01`, `SM_Prop_Detail_Box_01`, `SM_Prop_Detail_Box_02`, `SM_Prop_Detail_Box_03`, `SM_Prop_Detail_Box_04`, `SM_Prop_Detail_Box_05`, `SM_Prop_Detail_Box_06`, `SM_Prop_Detail_Button_01`, `SM_Prop_Detail_CeilingBox_01`, `SM_Prop_Detail_CeilingBox_02`, `SM_Prop_Detail_CeilingBox_03`, `SM_Prop_Detail_Handle_01`, `SM_Prop_Detail_Handle_02`, `SM_Prop_Detail_Keypad_01`, `SM_Prop_Detail_Lights_01`, `SM_Prop_Detail_Lights_02`, `SM_Prop_Detail_Lights_03`, `SM_Prop_Detail_Machine_01`, `SM_Prop_Detail_Panel_01`, `SM_Prop_Detail_Panel_Broken_01`, `SM_Prop_Detail_Panel_Fixed_01`, `SM_Prop_Detail_Pipe_01`, `SM_Prop_Detail_Pipe_02`, `SM_Prop_Detail_Pipe_Broken_01`, `SM_Prop_Detail_Pipe_Corner_01`, `SM_Prop_Detail_Pipe_Pillar_01`, `SM_Prop_Detail_Pipe_Straight_01`, `SM_Prop_Detail_Pipes_01`, `SM_Prop_Detail_Pipes_02`, `SM_Prop_Detail_Pipes_03`, `SM_Prop_Detail_Struts_01`, `SM_Prop_Detail_Struts_02`, `SM_Prop_Detail_SynCola_01`, `SM_Prop_Detail_SynCola_02`, `SM_Prop_Detail_Tank_01`, `SM_Prop_Detail_Tank_02`, `SM_Prop_Detail_Vent_01`, `SM_Prop_Detail_Wire_01`, `SM_Prop_Detail_Wire_02`, `SM_Prop_Detail_Wire_03`, `SM_Prop_Detail_Wire_04`, `SM_Prop_Detail_Wire_05`, `SM_Prop_Detail_Wirebox_01`, `SM_Prop_EnergyPort_01`, `SM_Prop_Engine_Construction_01`, `SM_Prop_EscapePod_Hatch_Large_01`, `SM_Prop_EscapePod_Hatch_Small_01`, `SM_Prop_FoodPacket_01`, `SM_Prop_FoodPacket_02`, `SM_Prop_FoodPacket_03`, `SM_Prop_FoodPacket_04`, `SM_Prop_FoodTray_01`, `SM_Prop_FoodTray_02`, `SM_Prop_FoodTray_03`, `SM_Prop_Greeble_Cube_01`, `SM_Prop_Greeble_Cube_02`, `SM_Prop_Greeble_Panel_01`, `SM_Prop_Greeble_Panel_02`, `SM_Prop_Greeble_Panel_03`, `SM_Prop_Greeble_Panel_04`, `SM_Prop_Greeble_Panel_05`, `SM_Prop_Greeble_Panel_06`, `SM_Prop_Greeble_Panel_07`, `SM_Prop_HandScanner_01`, `SM_Prop_Handle_01`, `SM_Prop_Hose_01`, `SM_Prop_Hose_02`, `SM_Prop_Hose_03`, `SM_Prop_Hose_04`, `SM_Prop_Joystick_01`, `SM_Prop_Keycard_01`, `SM_Prop_Keycard_02`, `SM_Prop_Keycard_03`, `SM_Prop_Ladder_01`, `SM_Prop_Ladder_Handles_01`, `SM_Prop_Light_Panel_01`, `SM_Prop_Light_Panel_02`, `SM_Prop_Light_Panel_03`, `SM_Prop_Light_Panel_04`, `SM_Prop_Light_Panel_05`, `SM_Prop_Light_Small_01`, `SM_Prop_Light_Small_02`, `SM_Prop_Light_Small_03`, `SM_Prop_Light_Small_04`, `SM_Prop_Light_Small_05`, `SM_Prop_Light_Small_06`, `SM_Prop_Light_Small_07`, `SM_Prop_Light_Small_08`, `SM_Prop_MapTable_01`, `SM_Prop_MapTable_Top_01`, `SM_Prop_MedicalArms_01`, `SM_Prop_Medical_Cart_01`, `SM_Prop_Medical_Cart_02`, `SM_Prop_Medical_Cart_Bare_01`, `SM_Prop_Medical_Isolator_01`, `SM_Prop_Medical_Machine_01`, `SM_Prop_Medical_Scanner_01`, `SM_Prop_Medical_Tube_01`, `SM_Prop_Mine_01`, `SM_Prop_Missile_01`, `SM_Prop_Missile_02`, `SM_Prop_Missile_03`, `SM_Prop_Missile_04`, `SM_Prop_Missile_05`, `SM_Prop_Missile_06`, `SM_Prop_Missile_07`, `SM_Prop_Oxygen_Tank`, `SM_Prop_Oxygen_Tank_Large`, `SM_Prop_Oxygen_Tank_Small`, `SM_Prop_Pad_01`, `SM_Prop_Panel_01`, `SM_Prop_Pillar_Detail_01`, `SM_Prop_Plant_Container_01`, `SM_Prop_Plant_Vase_01`, `SM_Prop_Plant_Vase_02`, `SM_Prop_Radar_Panel_01`, `SM_Prop_Radar_Panel_02`, `SM_Prop_Satellite_Stand_01`, `SM_Prop_Screen_01`, `SM_Prop_Screen_02`, `SM_Prop_Screen_03`, `SM_Prop_Screen_04`, `SM_Prop_Screen_05`, `SM_Prop_Screen_06`, `SM_Prop_Screen_07`, `SM_Prop_Screen_08`, `SM_Prop_Screen_09`, `SM_Prop_Screen_10`, `SM_Prop_Screen_11`, `SM_Prop_Screen_Small_01`, `SM_Prop_Screen_Small_02`, `SM_Prop_Sink_01`, `SM_Prop_Solar_Hex_01`, `SM_Prop_SpaceWalk_End_01`, `SM_Prop_SpaceWalk_Tube_01`, `SM_Prop_SquareTable_01`, `SM_Prop_StairsPlatform_01`, `SM_Prop_StairsPlatform_02`, `SM_Prop_Stairs_01`, `SM_Prop_Stairs_02`, `SM_Prop_Stairs_03`, `SM_Prop_Stairs_04`, `SM_Prop_Stool_01`, `SM_Prop_Stool_02`, `SM_Prop_Table_01`, `SM_Prop_Tank_01`, `SM_Prop_TestTubes_01`, `SM_Prop_Test_Tube_01`, `SM_Prop_Test_Tube_02`, `SM_Prop_Toilet_01`, `SM_Prop_Turret_Base_Double_01`, `SM_Prop_Turret_Base_Double_010`, `SM_Prop_Turret_Base_Double_02`, `SM_Prop_Turret_Base_Double_03`, `SM_Prop_Turret_Base_Double_04`, `SM_Prop_Turret_Base_Double_05`, `SM_Prop_Turret_Base_Double_06`, `SM_Prop_Turret_Base_Double_07`, `SM_Prop_Turret_Base_Double_08`, `SM_Prop_Turret_Base_Double_09`, `SM_Prop_Turret_Base_Single_01`, `SM_Prop_Turret_Base_Single_010`, `SM_Prop_Turret_Base_Single_02`, `SM_Prop_Turret_Base_Single_03`, `SM_Prop_Turret_Base_Single_04`, `SM_Prop_Turret_Base_Single_05`, `SM_Prop_Turret_Base_Single_06`, `SM_Prop_Turret_Base_Single_07`, `SM_Prop_Turret_Base_Single_08`, `SM_Prop_Turret_Base_Single_09`, `SM_Prop_Turret_Large_01`, `SM_Prop_Turret_Large_02`, `SM_Prop_Turret_Small_Ceiling_01`, `SM_Prop_Turret_Small_Floor_01`, `SM_Prop_Wall_Panel_Small_01`, `SM_Prop_Wall_Panel_Small_02`, `SM_Prop_Wall_Panel_Small_03`, `SM_Prop_Wires_01`, `SM_Prop_Wires_02`, `SM_Prop_Wires_03`, `SM_Prop_Wires_04`, `SM_Prop_Wires_05`

### Personajes (24)

`SM_Chr_Alien_01`, `SM_Chr_Attach_Crew_Female_Hair_01`, `SM_Chr_Attach_Crew_Male_Hair_01`, `SM_Chr_Attach_EVA_Cover_01`, `SM_Chr_Attach_EVA_Cover_Clear_01`, `SM_Chr_Attach_EVA_Female_Head_Blank_01`, `SM_Chr_Attach_EVA_Female_Head_Scaled_01`, `SM_Chr_Attach_EVA_Male_Head_Blank_01`, `SM_Chr_Attach_EVA_Male_Head_Scaled_01`, `SM_Chr_Attach_Hat_Captain_01`, `SM_Chr_Attach_Hat_Crew_01`, `SM_Chr_Attach_Hunter_Female_Hair_01`, `SM_Chr_Attach_Junker_Hair_Female_01`, `SM_Chr_Attach_Junker_Headset_01`, `SM_Chr_Attach_Junker_Helmet_01`, `SM_Chr_Attach_Junker_Helmet_Glass_01`, `SM_Chr_Attach_Male_Hair_01`, `SM_Chr_Attach_Male_Hair_02`, `SM_Chr_Attach_Male_Hair_03`, `SM_Chr_Attach_Male_Hair_05`, `SM_Chr_Attach_Male_Hair_06`, `SM_Chr_Attach_Male_Hair_07`, `SM_Chr_Attach_Mask_Medic_01`, `SM_Chr_Attach_SpaceHelmet_01`

### Armas (7)

`SM_Wep_Pistol_01`, `SM_Wep_Rifle_01`, `SM_Wep_Shield_01`, `SM_Wep_Shield_Extended_01`, `SM_Wep_Shotgun_01`, `SM_Wep_Sword_01`, `SM_Wep_Sword_Double_01`

### HUD (25)

`SM_Hud_Arrows_01`, `SM_Hud_Barrier_01`, `SM_Hud_Barrier_02`, `SM_Hud_Barrier_03`, `SM_Hud_Box_01`, `SM_Hud_Box_02`, `SM_Hud_Box_03`, `SM_Hud_Reticle_01`, `SM_Hud_Reticle_02`, `SM_Hud_Reticle_03`, `SM_Hud_Reticle_04`, `SM_Hud_Reticle_05`, `SM_Hud_Reticle_06`, `SM_Hud_Reticle_07`, `SM_Hud_Reticle_08`, `SM_Hud_Reticle_09`, `SM_Hud_Rings_01`, `SM_Hud_Rings_02`, `SM_Hud_Rings_04`, `SM_Hud_Screen_Backing_01`, `SM_Hud_Text_01`, `SM_Hud_Text_02`, `SM_Hud_Text_03`, `SM_Hud_Text_04`, `SM_Hud_Text_Arrow_01`

### Letreros (47)

`SM_SignBorder_Ammo_01`, `SM_SignBorder_Arrow_01`, `SM_SignBorder_Arrow_02`, `SM_SignBorder_Battery_01`, `SM_SignBorder_Cog_01`, `SM_SignBorder_Communication_01`, `SM_SignBorder_Electric_01`, `SM_SignBorder_Electric_02`, `SM_SignBorder_Fire_01`, `SM_SignBorder_Fix_01`, `SM_SignBorder_Heart_01`, `SM_SignBorder_Leaf_01`, `SM_SignBorder_Medical_02`, `SM_SignBorder_Medical_03`, `SM_SignBorder_Nuclear_01`, `SM_SignBorder_Number_01`, `SM_SignBorder_Number_02`, `SM_SignBorder_Number_03`, `SM_SignBorder_Number_04`, `SM_SignBorder_Number_05`, `SM_SignBorder_Number_06`, `SM_SignBorder_Number_07`, `SM_SignBorder_Number_08`, `SM_SignBorder_Number_09`, `SM_SignBorder_Planet_01`, `SM_SignBorder_Plant_01`, `SM_SignBorder_Rocket_01`, `SM_SignBorder_Science_01`, `SM_SignBorder_Shield_01`, `SM_SignBorder_Ship_01`, `SM_SignBorder_Toxic_01`, `SM_SignBorder_Warning_01`, `SM_SignBorder_Water_01`, `SM_Sign_AirLock_01`, `SM_Sign_Bridge_01`, `SM_Sign_CrewQuarters_01`, `SM_Sign_EngineRoom_01`, `SM_Sign_EscpapePod_01`, `SM_Sign_Exit_02`, `SM_Sign_Hangar_01`, `SM_Sign_Hydroponics_01`, `SM_Sign_Hydroponics_02`, `SM_Sign_Kitchen_01`, `SM_Sign_LoadingBay_01`, `SM_Sign_LockerRoom_01`, `SM_Sign_MedicalBay_01`, `SM_Sign_ScienceLab_01`

### Otros (5)

`BR_Characters`, `Characters`, `SM_FX_LightBlocker_Cube_01`, `SM_FX_LightBlocker_Cube_02`, `SM_FX_LightBlocker_Cube_03`

Además: 51 mallas de colisión en `Models/Collision/` y 12 mallas de efectos en `Models/FX_Meshes/`.

