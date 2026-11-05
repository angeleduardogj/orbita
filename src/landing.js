// Landing en la raíz: las ilustraciones salen de los modelos y aparecen cuando terminan de cargar.
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/jetbrains-mono/800.css';
import { EMPRESA_INICIAL } from './data.js';
import { cargarAssets, fotoNave } from './models.js';

addEventListener('keydown', (e) => {
  if (e.key === 'Enter') location.href = document.getElementById('btn-despegar').href;
});

await cargarAssets();
for (const img of document.querySelectorAll('img[data-nave]')) img.src = fotoNave(`nave_${img.dataset.nave}`, EMPRESA_INICIAL, 640);
window.landingLista = true;
