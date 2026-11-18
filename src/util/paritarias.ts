import type { Aviso } from './avisos.ts';
import type { Rol } from './datos/tipos.ts';

export const BOLETIN = 'https://www.boletinoficial.gob.ar';

const CONVENIOS_FIJOS = ['541/08', '131/75', '173/75'];

export const PAGINAS_DE_ESCALAS: { sindicato: string; convenio: string; url: string }[] = [
  { sindicato: 'FATPREN', convenio: '541/08', url: 'https://fatpren.org.ar/salarios/' },
  { sindicato: 'SATSAID', convenio: '131/75', url: 'https://satsaid.com.ar/' },
  { sindicato: 'SiPreBA', convenio: '301/75', url: 'https://www.sipreba.org/paritarias/escala-salarial-prensa-radial/' },
];

export function conveniosAVigilar(roles: Pick<Rol, 'convenio'>[]): string[] {
  const deLosRoles = roles.flatMap((r) => [...r.convenio.matchAll(/CCT (\d+\/\d+)/g)].map((m) => m[1]));
  return [...new Set([...CONVENIOS_FIJOS, ...deLosRoles])].sort();
}

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

export function avisosDeTrabajo(html: string): AvisoDelBoletin[] {
  const avisos = new Map<string, AvisoDelBoletin>();
  for (const m of html.matchAll(/href="(\/detalleAviso\/primera\/\d+\/\d{8})"([\s\S]{0,3000}?)<\/a>/g)) {
    const titulo = textoPlano(`<x${m[2]}`.replace(/^<x[^>]*>/, ''));
    if (/CAPITAL HUMANO|TRABAJO/i.test(titulo)) avisos.set(m[1], { url: BOLETIN + m[1], titulo });
  }
  return [...avisos.values()];
}

export function conveniosNombrados(texto: string, convenios: string[]): string[] {
  return convenios.filter((c) => new RegExp(`(?<![\\d/])${c.replace('/', '\\/')}(?![\\d/])`).test(texto));
}

export function enlacesDeEscalas(html: string, base: string): string[] {
  const enlaces = new Set<string>();
  const pagina = new URL(base).href;
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
      url.pathname = url.pathname.replace(/-\d+x\d+(\.[a-z]+)$/i, '$1');
      if (url.href === pagina) continue;
      let nombre = url.pathname;
      try {
        nombre = decodeURIComponent(url.pathname);
      } catch {
      }
      const esImagen = /\.(jpe?g|png|gif|webp)$/i.test(nombre);
      const nombraEscala = /escala|salari|paritari|acuerdo/i.test(nombre);
      if (nombraEscala || (!esImagen && /\.pdf$/i.test(nombre))) enlaces.add(url.href);
    }
  }
  return [...enlaces].sort();
}

export function enlacesNuevos(enlaces: string[], issuesAnteriores: string[]): string[] {
  const historia = issuesAnteriores.join('\n');
  return enlaces.filter((e) => !historia.includes(e));
}

export const etiquetaDe = (convenio: string) => `paritaria-cct-${convenio.replace('/', '-')}`;

export interface Hallazgo {
  convenio: string;
  origen: string;
  enlaces: string[];
}

export function textoSeguro(texto: string): string {
  const limpio = texto.replace(/[@[\]`<>*_|#!]/g, ' ').replace(/\s+/g, ' ').trim();
  return limpio.length > 150 ? `${limpio.slice(0, 149)}…` : limpio;
}

export function avisosDeParitarias(hallazgos: Hallazgo[]): Aviso[] {
  const porConvenio = new Map<string, Hallazgo[]>();
  for (const h of hallazgos) porConvenio.set(h.convenio, [...(porConvenio.get(h.convenio) ?? []), h]);
  return [...porConvenio.entries()].map(([convenio, lista]) => ({
    etiqueta: etiquetaDe(convenio),
    titulo: `Posible paritaria nueva del CCT ${convenio}`,
    cuerpo: [
      `Apareció algo nuevo sobre el CCT ${convenio}. Es informativo: la calculadora ya se actualiza sola por índice (RN-12). Si se decide reanclar la escala, Claude arma el PR con el acuerdo nuevo y Lautaro lo aprueba (RF-23).`,
      '',
      ...lista.flatMap((h) => [`**${textoSeguro(h.origen)}**`, '', ...h.enlaces.map((e) => `- <${e}>`), '']),
    ].join('\n'),
  }));
}
