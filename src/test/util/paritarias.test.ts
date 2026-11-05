import { describe, expect, it } from 'vitest';
import {
  avisosDeParitarias,
  avisosDeTrabajo,
  conveniosAVigilar,
  conveniosNombrados,
  enlacesDeEscalas,
  enlacesNuevos,
  textoSeguro,
} from '../../util/paritarias.ts';

// RF-40: una homologación en el Boletín Oficial o un enlace nuevo en la página
// de escalas de un sindicato abren un aviso por convenio; sin cambios, nada.

const CONVENIOS = ['131/75', '173/75', '301/75', '378/75', '541/08'];

// Forma real de la primera sección del Boletín: el título va dentro del enlace.
const SECCION = `
  <a href="/detalleAviso/primera/349983/20261103?anexos=1" title="Ver anexos"><i></i></a>
  <a href="/detalleAviso/primera/349983/20261103" onclick="sendDetalleEvent('Visto', 'ID: 349983');">
    <div class="linea-aviso"><p class="item">MINISTERIO DE CAPITAL HUMANO - SECRETARÍA DE TRABAJO</p>
    <p class="item-detalle"><small>Resolución 1234/2026</small></p></div>
  </a>
  <a href="/detalleAviso/primera/349990/20261103" onclick="sendDetalleEvent('Visto', 'ID: 349990');">
    <div class="linea-aviso"><p class="item">BANCO CENTRAL DE LA REPÚBLICA ARGENTINA</p></div>
  </a>`;

describe('RF-40 · Boletín Oficial', () => {
  it('toma sólo los avisos de Capital Humano o Trabajo, una vez cada uno', () => {
    expect(avisosDeTrabajo(SECCION)).toEqual([
      {
        url: 'https://www.boletinoficial.gob.ar/detalleAviso/primera/349983/20261103',
        titulo: 'MINISTERIO DE CAPITAL HUMANO - SECRETARÍA DE TRABAJO Resolución 1234/2026',
      },
    ]);
  });

  it('una resolución que nombra el CCT 131/75 lo encuentra; un número que lo contiene, no', () => {
    expect(conveniosNombrados('homológase el acuerdo del Convenio Colectivo de Trabajo N° 131/75', CONVENIOS)).toEqual([
      '131/75',
    ]);
    expect(conveniosNombrados('expediente 2131/75 y 131/755', CONVENIOS)).toEqual([]);
  });

  it('vigila los convenios fijos del SRS y los de los roles', () => {
    expect(conveniosAVigilar([{ convenio: 'Cronista, CCT 301/75, rama radio' }])).toEqual([
      '131/75',
      '173/75',
      '301/75',
      '541/08',
    ]);
  });
});

describe('RF-40 · páginas de escalas', () => {
  const base = 'https://sindicato.org.ar/salarios/';
  const pagina = `
    <a href="https://sindicato.org.ar/salarios/">Salarios</a>
    <a href="/wp-content/uploads/2026/08/acta.pdf">Acta</a>
    <iframe src="https://sindicato.org.ar/viewer.html?&#038;file=https%3A%2F%2Fsindicato.org.ar%2Fescala-agosto.pdf"></iframe>
    <img srcset="https://sindicato.org.ar/Escala-Radio.jpeg 750w, https://sindicato.org.ar/Escala-Radio-300x150.jpeg 300w">
    <img src="https://sindicato.org.ar/logo.png"><a href="/contacto/">Contacto</a>`;

  it('encuentra PDF, PDF embebidos e imágenes de escala, sin miniaturas ni la propia página', () => {
    expect(enlacesDeEscalas(pagina, base)).toEqual([
      'https://sindicato.org.ar/Escala-Radio.jpeg',
      'https://sindicato.org.ar/escala-agosto.pdf',
      'https://sindicato.org.ar/wp-content/uploads/2026/08/acta.pdf',
    ]);
  });

  it('un enlace nuevo es el que no aparece en ningún issue anterior; sin cambios, nada', () => {
    const enlaces = enlacesDeEscalas(pagina, base);
    expect(enlacesNuevos(enlaces, [enlaces.join('\n')])).toEqual([]);
    expect(enlacesNuevos(enlaces, [enlaces.slice(1).join('\n')])).toEqual([enlaces[0]]);
  });
});

describe('RF-40 · avisos', () => {
  it('un aviso por convenio, con su etiqueta, juntando las fuentes', () => {
    const avisos = avisosDeParitarias([
      { convenio: '131/75', origen: 'Boletín Oficial: Resolución 1234/2026', enlaces: ['https://bo/1'] },
      { convenio: '131/75', origen: 'Página de escalas de SATSAID', enlaces: ['https://satsaid/escala.pdf'] },
    ]);
    expect(avisos).toHaveLength(1);
    expect(avisos[0].etiqueta).toBe('paritaria-cct-131-75');
    expect(avisos[0].cuerpo).toContain('https://bo/1');
    expect(avisos[0].cuerpo).toContain('https://satsaid/escala.pdf');
  });

  it('el texto de terceros no menciona a nadie ni mete enlaces, y las direcciones van entre <>', () => {
    expect(textoSeguro('Resolución 1/2026 @equipo [clic](http://malo) `x`')).toBe('Resolución 1/2026 equipo clic (http://malo) x');
    expect(textoSeguro('a'.repeat(400))).toHaveLength(150);
    const [aviso] = avisosDeParitarias([{ convenio: '131/75', origen: 'Boletín', enlaces: ['https://bo/1'] }]);
    expect(aviso.cuerpo).toContain('- <https://bo/1>');
  });

  it('sin hallazgos, no hay avisos', () => {
    expect(avisosDeParitarias([])).toEqual([]);
  });
});
