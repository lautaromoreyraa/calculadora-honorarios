import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
// Fuentes autoalojadas: van en el bundle y respetan la CSP (font-src 'self').
// Sólo el eje de peso: el de tamaño óptico duplica el archivo (132 kB contra 58 kB).
import '@fontsource-variable/newsreader/wght.css';
import '@fontsource-variable/public-sans/index.css';
import './estilos/tokens.css';
import './estilos/base.css';

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
