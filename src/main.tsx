import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
// Fuentes autoalojadas: van en el bundle y respetan la CSP (font-src 'self').
// Las dos son de diseñadores argentinos (RNF-12): Alegreya, de Juan Pablo del
// Peral (Huerta Tipográfica), y Archivo, de Omnibus-Type. Sólo el eje de peso;
// la cursiva de Alegreya es para el título, y se baja recién cuando se usa.
import '@fontsource-variable/alegreya/wght.css';
import '@fontsource-variable/alegreya/wght-italic.css';
import '@fontsource-variable/archivo/wght.css';
import './estilos/tokens.css';
import './estilos/base.css';

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
