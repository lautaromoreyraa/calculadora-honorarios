import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
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
