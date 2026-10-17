import { describe, expect, it } from 'vitest';
import { datos } from '../../../util/datos/index.ts';

// El esquema valida la forma de cada archivo por separado; estos tests validan lo
// que cruza archivos: que las referencias apunten a algo que existe.

const repetidos = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);
const idsDeRoles = datos.roles.map((r) => r.id);

describe('datos', () => {
  it('no repite ids de roles, ítems, grupos ni exclusiones', () => {
    expect(repetidos(idsDeRoles)).toEqual([]);
    expect(repetidos(datos.items.map((i) => i.id))).toEqual([]);
    expect(repetidos(datos.grupos.map((g) => g.id))).toEqual([]);
    expect(repetidos(datos.exclusiones.map((e) => e.id))).toEqual([]);
  });

  it('RF-31 · la encuesta, si está, es un formulario de Google', () => {
    const url = datos.parametros.encuesta?.url;
    if (url) expect(url).toMatch(/^https:\/\/(docs\.google\.com\/forms\/|forms\.gle\/)/);
  });

  it('tiene los ocho roles de la investigación', () => {
    expect(idsDeRoles).toHaveLength(8);
  });

  it('cada ítem pertenece a un grupo y a una exclusión que existen', () => {
    const grupos = new Set(datos.grupos.map((g) => g.id));
    const exclusiones = new Set(datos.exclusiones.map((e) => e.id));
    for (const item of datos.items) {
      expect(grupos, item.id).toContain(item.grupo);
      if (item.exclusion) expect(exclusiones, item.id).toContain(item.exclusion);
    }
  });

  it('RF-27 · si un grupo tiene subgrupos, cada ítem suelto va en uno de los suyos', () => {
    for (const grupo of datos.grupos) {
      const subgrupos = new Set((grupo.subgrupos ?? []).map((s) => s.id));
      for (const item of datos.items.filter((i) => i.grupo === grupo.id && !i.exclusion)) {
        if (subgrupos.size === 0) expect(item.subgrupo, item.id).toBeUndefined();
        else expect(subgrupos, item.id).toContain(item.subgrupo);
      }
    }
  });

  it('RF-27 · los costos operativos van en subgrupos y ninguno queda vacío', () => {
    const operativos = datos.grupos.find((g) => g.id === 'operativos')!;
    expect(operativos.subgrupos!.length).toBeGreaterThanOrEqual(2);
    for (const s of operativos.subgrupos!) {
      expect(datos.items.some((i) => i.subgrupo === s.id), s.id).toBe(true);
    }
  });

  it('cada exclusión tiene al menos dos opciones', () => {
    for (const exclusion of datos.exclusiones) {
      const opciones = datos.items.filter((i) => i.exclusion === exclusion.id);
      expect(opciones.length, exclusion.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('el tipo de cliente es obligatorio y tiene las cuatro categorías de CISPREN', () => {
    const cliente = datos.exclusiones.find((e) => e.id === 'tipo-de-cliente');
    expect(cliente?.obligatorio).toBe(true);
    expect(datos.items.filter((i) => i.exclusion === 'tipo-de-cliente')).toHaveLength(4);
  });

  it('urgente y muy urgente se excluyen entre sí (RF-05)', () => {
    const plazo = datos.items.filter((i) => i.exclusion === 'plazo').map((i) => i.id);
    expect(plazo.sort()).toEqual(['muy-urgente', 'urgente']);
  });

  it('los valores por rol apuntan a roles que existen', () => {
    for (const item of datos.items) {
      if ('porRol' in item && item.porRol) {
        for (const rol of Object.keys(item.porRol)) expect(idsDeRoles, item.id).toContain(rol);
      }
    }
  });

  it('conserva las diferencias por rol de la planilla (RN-04)', () => {
    const emergencia = datos.items.find((i) => i.id === 'cobertura-de-emergencia');
    const ia = datos.items.find((i) => i.id === 'ia-y-redes');
    expect(emergencia?.tipo === 'porcentual' && emergencia.porRol?.fotoperiodista?.porcentaje).toBe(0.3);
    expect(ia?.tipo === 'mensual' && ia.porRol?.['redactor-digital']?.dolares?.herramientas).toHaveLength(1);
  });

  it('cada provincia con monto fijo lo tiene para todas las categorías de monotributo', () => {
    const letras = datos.monotributo.categorias.map((c) => c.letra);
    for (const provincia of datos.provincias) {
      if (provincia.ingresosBrutos.modo !== 'fijo-por-categoria') continue;
      expect(Object.keys(provincia.ingresosBrutos.montos).sort(), provincia.id).toEqual([...letras].sort());
    }
  });

  it('hay precio de combustible para cada provincia', () => {
    for (const provincia of datos.provincias) {
      expect(datos.combustible.precios[provincia.id], provincia.id).toBeDefined();
    }
  });

  it('los tramos de vacaciones arrancan en 0 años y están ordenados', () => {
    const tramos = datos.parametros.vacaciones.diasPorAntiguedad.map((t) => t.desdeAnios);
    expect(tramos[0]).toBe(0);
    expect(tramos).toEqual([...tramos].sort((a, b) => a - b));
  });
});
