#!/usr/bin/env python3
"""Extrae los FBX y texturas del zip de Synty a assets/pack/.

Un .unitypackage es un tar.gz con una carpeta por GUID: `pathname` guarda la ruta real
y `asset` el contenido. Prefabs, materiales y escenas de Unity se ignoran.
Uso: npm run extraer
"""
import glob
import io
import os
import tarfile
import zipfile

DESTINO = 'assets/pack'
EXTENSIONES = ('.fbx', '.png')

zips = glob.glob('assets/*.zip')
if not zips:
    raise SystemExit('No hay ningún .zip en assets/')

with zipfile.ZipFile(zips[0]) as z:
    nombre = next(n for n in z.namelist() if n.endswith('.unitypackage'))
    paquete = io.BytesIO(z.read(nombre))

rutas, contenidos = {}, {}
with tarfile.open(fileobj=paquete, mode='r:gz') as tar:
    for miembro in tar:
        guid, _, archivo = miembro.name.lstrip('./').partition('/')
        if archivo == 'pathname':
            rutas[guid] = tar.extractfile(miembro).read().decode().split('\n')[0].strip()
        elif archivo == 'asset' and miembro.isfile():
            contenidos[guid] = tar.extractfile(miembro).read()

raiz = os.path.realpath(DESTINO)
copiados = 0
for guid, ruta in rutas.items():
    if guid not in contenidos or not ruta.lower().endswith(EXTENSIONES):
        continue
    salida = os.path.realpath(os.path.join(DESTINO, ruta.replace('Assets/PolygonSciFiSpace/', '')))
    if not salida.startswith(raiz + os.sep):
        continue  # nunca escribir fuera de assets/pack
    os.makedirs(os.path.dirname(salida), exist_ok=True)
    with open(salida, 'wb') as f:
        f.write(contenidos[guid])
    copiados += 1
print(f'[pack] {copiados} archivos en {DESTINO}/')
