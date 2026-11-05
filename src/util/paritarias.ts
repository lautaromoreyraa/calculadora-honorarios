// Aviso de paritarias nuevas (RF-40). Ningún sindicato publica sus escalas en
// una API: la Action semanal mira la primera sección del Boletín Oficial (las
// resoluciones de la Secretaría de Trabajo que homologan acuerdos) y las
// páginas donde los sindicatos publican sus escalas, y abre un issue por
// convenio. Es informativo: no carga montos ni toca datos/ (RN-12 ya actualiza
// por índice; reanclar una escala es opcional).
//
// La memoria entre semanas son los propios issues: un enlace es nuevo si no
// aparece en ningún issue anterior de paritarias, abierto o cerrado.
import type { Aviso } from './avisos.ts';
import type { Rol } from './datos/tipos.ts';

export const BOLETIN = 'https://www.boletinoficial.gob.ar';

/** Convenios que se vigilan aunque ningún rol los use hoy (SRS, RF-40). */
const CONVENIOS_FIJOS = ['541/08', '131/75', '173/75'];

/** Páginas de escalas de cada sindicato y el convenio al que corresponden. */
export const PAGINAS_DE_ESCALAS: { sindicato: string; convenio: string; url: string }[] = [
  { sindicato: 'FATPREN', convenio: '541/08', url: 'https://fatpren.org.ar/salarios/' },
  { sindicato: 'SATSAID', convenio: '131/75', url: 'https://satsaid.com.ar/' },
  { sindicato: 'SiPreBA', convenio: '301/75', url: 'https://www.sipreba.org/paritarias/escala-salarial-prensa-radial/' },
];

/** Los convenios a vigilar: los fijos y los que citan los roles («CCT 131/75»). */
export function conveniosAVigilar(roles: Pick<Rol, 'convenio'>[]): string[] {
  const deLosRoles = roles.flatMap((r) => [...r.convenio.matchAll(/CCT (\d+\/\d+)/g)].map((m) => m[1]));
  return [...new Set([...CONVENIOS_FIJOS, ...deLosRoles])].sort();
}

/** Texto plano de un HTML, sin etiquetas ni entidades comunes. */
export function textoPlano(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

export interface AvisoDelBoletin {
  url: string;
  titulo: string;
}

/**
 * Los avisos de la primera sección de un día que pueden homologar un acuerdo:
 * los del Ministerio de Capital Humano o de Trabajo. El resto (BCRA, ARCA…) no
 * se abre, para no pedir cientos de páginas por semana.
 */
export function avisosDeTrabajo(html: string): AvisoDelBoletin[] {
  const avisos = new Map<string, AvisoDelBoletin>();
  // El título va en un <div> dentro del enlace, a varios cientos de caracteres del href.
  for (const m of html.matchAll(/href="(\/detalleAviso\/primera\/\d+\/\d{8})"([\s\S]{0,3000}?)<\/a>/g)) {
    const titulo = textoPlano(`<x${m[2]}`.replace(/^<x[^>]*>/, ''));
    if (/CAPITAL HUMANO|TRABAJO/i.test(titulo)) avisos.set(m[1], { url: BOLETIN + m[1], titulo });
  }
  return [...avisos.values()];
}

/** Los convenios que nombra un texto: «131/75» suelto, no dentro de otro número. */
export function conveniosNombrados(texto: string, convenios: string[]): string[] {
  return convenios.filter((c) => new RegExp(`(?<![\\d/])${c.replace('/', '\\/')}(?![\\d/])`).test(texto));
}

/**
 * Los enlaces de una página de sindicato que pueden ser una escala: PDF o con
 * «escala», «salari», «paritari» o «acuerdo» en la dirección. Absolutos y sin
 * repetidos.
 */
export function enlacesDeEscalas(html: string, base: string): string[] {
  const enlaces = new Set<string>();
  const pagina = new URL(base).href;
  // Las direcciones salen de href, src, data-src y srcset. Los PDF también se
  // embeben en un visor (FATPREN: viewer.html?file=<pdf>), y algunas escalas son
  // una imagen (SiPreBA), con sus miniaturas en el srcset.
  for (const m of html.matchAll(/(?:href|src|data-src|srcset|data-srcset)="([^"]+)"/g)) {
    for (const candidata of m[1].split(/,\s+/).map((c) => c.trim().split(/\s+/)[0])) {
      let url: URL;
      try {
        url = new URL(candidata.replace(/&amp;|&#0?38;/g, '&'), base);
        const embebido = url.searchParams.get('file');
        if (embebido) url = new URL(embebido, base);
      } catch {
        continue;
      }
      if (!/^https?:$/.test(url.protocol) || /\.(css|js|svg)$/i.test(url.pathname)) continue;
      url.hash = '';
      // Una miniatura (escala-300x150.jpeg) es la misma escala que el original.
      url.pathname = url.pathname.replace(/-\d+x\d+(\.[a-z]+)$/i, '$1');
      // La propia página no cuenta: siempre está y nombra «salarios» en la dirección.
      if (url.href === pagina) continue;
      let nombre = url.pathname;
      try {
        nombre = decodeURIComponent(url.pathname);
      } catch {
        // Un %ZZ roto no tiene que tirar abajo toda la página: se usa la dirección como vino.
      }
      const esImagen = /\.(jpe?g|png|gif|webp)$/i.test(nombre);
      const nombraEscala = /escala|salari|paritari|acuerdo/i.test(nombre);
      if (nombraEscala || (!esImagen && /\.pdf$/i.test(nombre))) enlaces.add(url.href);
    }
  }
  return [...enlaces].sort();
}

/** Los enlaces que no aparecen en ningún issue anterior. */
export function enlacesNuevos(enlaces: string[], issuesAnteriores: string[]): string[] {
  const historia = issuesAnteriores.join('\n');
  return enlaces.filter((e) => !historia.includes(e));
}

/** Etiqueta por convenio: con un issue abierto con ella, no se abre otro. */
export const etiquetaDe = (convenio: string) => `paritaria-cct-${convenio.replace('/', '-')}`;

export interface Hallazgo {
  convenio: string;
  origen: string;
  enlaces: string[];
}

/**
 * Texto de terceros (el título de un aviso del Boletín) listo para un issue:
 * corto y sin lo que Markdown convierte en mención, enlace o código, para que
 * una página rota u hostil no notifique a nadie ni meta enlaces en un issue con
 * apariencia oficial.
 */
export function textoSeguro(texto: string): string {
  const limpio = texto.replace(/[@[\]`<>*_|#!]/g, ' ').replace(/\s+/g, ' ').trim();
  return limpio.length > 150 ? `${limpio.slice(0, 149)}…` : limpio;
}

/** Un aviso por convenio, juntando lo del Boletín y lo de las páginas de los sindicatos. */
export function avisosDeParitarias(hallazgos: Hallazgo[]): Aviso[] {
  const porConvenio = new Map<string, Hallazgo[]>();
  for (const h of hallazgos) porConvenio.set(h.convenio, [...(porConvenio.get(h.convenio) ?? []), h]);
  return [...porConvenio.entries()].map(([convenio, lista]) => ({
    etiqueta: etiquetaDe(convenio),
    titulo: `Posible paritaria nueva del CCT ${convenio}`,
    cuerpo: [
      `Apareció algo nuevo sobre el CCT ${convenio}. Es informativo: la calculadora ya se actualiza sola por índice (RN-12). Si se decide reanclar la escala, Claude arma el PR con el acuerdo nuevo y Lautaro lo aprueba (RF-23).`,
      '',
      // Las direcciones van entre <…>: URL.href ya escapa < y >, así que no se pueden cerrar antes.
      ...lista.flatMap((h) => [`**${textoSeguro(h.origen)}**`, '', ...h.enlaces.map((e) => `- <${e}>`), '']),
    ].join('\n'),
  }));
}
