import { describe, expect, it } from 'vitest';
import { calcular } from '../../util/calculo/index.ts';
import type { Datos } from '../../util/datos/tipos.ts';
import type { Indices } from '../../util/indices.ts';
import { contenidoDelPresupuesto } from '../../util/presupuesto/contenido.ts';
import { proyectarDesdeEscala, textoDeLaProyeccion } from '../../util/proyeccion.ts';
import { datosAlOrigen } from '../fixture/datos.ts';

// RF-35: cada valor de convenio se proyecta desde su escala (RN-12), primero por
// el índice de salarios y después por el IPC NEA, y se dice cuánto se sumó.

const indices = (salarios: Record<string, number>, ipc: Record<string, number>): Indices => ({
  series: {
    salarios: { nombre: 'Salarios', fuente: 'test', meses: salarios },
    'ipc-nea-general': { nombre: 'IPC NEA', fuente: 'test', meses: ipc },
    'ipc-nea-comunicacion': { nombre: 'IPC NEA Comunicación', fuente: 'test', meses: ipc },
  },
});

const ipcHastaSeptiembre = { '2026-07': 100, '2026-08': 102, '2026-09': 105 };

describe('RF-35 · proyección desde la escala', () => {
  it('escala de julio, salarios hasta julio e IPC hasta septiembre: escala × IPC(sep) / IPC(jul)', () => {
    const p = proyectarDesdeEscala('2026-07', indices({ '2026-06': 90, '2026-07': 100 }, ipcHastaSeptiembre));
    expect(p.factor).toBeCloseTo(105 / 100, 12);
    expect(p.porSalarios).toBe(0);
    expect(p.porIpc).toBeCloseTo(0.05, 12);
  });

  it('con salarios hasta agosto: salarios(ago) / salarios(jul) × IPC(sep) / IPC(ago)', () => {
    const p = proyectarDesdeEscala('2026-07', indices({ '2026-07': 200, '2026-08': 204 }, ipcHastaSeptiembre));
    expect(p.factor).toBeCloseTo((204 / 200) * (105 / 102), 12);
    expect(p.porSalarios).toBeCloseTo(0.02, 12);
    expect(p.porIpc).toBeCloseTo(105 / 102 - 1, 12);
  });

  it('si el índice de salarios no llega a la escala, sólo IPC NEA desde la escala', () => {
    const p = proyectarDesdeEscala('2026-08', indices({ '2026-07': 200 }, ipcHastaSeptiembre));
    expect(p.factor).toBeCloseTo(105 / 102, 12);
    expect(p.porSalarios).toBe(0);
  });

  it('al cargar una escala nueva, el ajuste vuelve a cero', () => {
    const p = proyectarDesdeEscala('2026-09', indices({ '2026-07': 200, '2026-08': 204 }, ipcHastaSeptiembre));
    expect(p.factor).toBe(1);
    expect(p.porSalarios).toBe(0);
    expect(p.porIpc).toBe(0);
  });

  it('explica el mes de la escala, el convenio y los dos porcentajes', () => {
    const p = { origen: '2026-07', porSalarios: 0.012, porIpc: 0.035, factor: 1.012 * 1.035 };
    expect(textoDeLaProyeccion(p, 'Productor GS 1, CCT 131/75, SATSAID')).toBe(
      'Escala de julio de 2026 (CCT 131/75) + 1,2 % por salarios + 3,5 % por IPC NEA',
    );
  });
});

describe('RF-35 · en el cálculo, la pantalla y el Word', () => {
  // Productor: escala de 2026-09. Con salarios +2 % hasta octubre e IPC +3 % en noviembre.
  const conProyeccion: Datos = {
    ...datosAlOrigen,
    indices: indices({ '2026-09': 100, '2026-10': 102 }, { '2026-09': 100, '2026-10': 100, '2026-11': 103 }),
  };
  const seleccion = {
    rolId: 'productor',
    categoria: 'A',
    horas: 180,
    antiguedad: 1,
    items: { 'cliente-a': {}, antiguedad: {}, refrigerio: {} },
  };

  const calculo = calcular(seleccion, conProyeccion);
  if (!calculo.ok) throw new Error('el cálculo de prueba no corrió');
  const r = calculo.resultado;
  const factor = 1.02 * 1.03;

  it('el valor hora sale de la escala proyectada', () => {
    const productor = datosAlOrigen.roles.find((x) => x.id === 'productor')!;
    expect(r.rol.valorBaseMensual).toBeCloseTo(productor.valorBaseMensual * factor, 6);
    expect(r.valorHora).toBeCloseTo((productor.valorBaseMensual * factor) / 180, 6);
  });

  it('los adicionales de convenio también se proyectan, con la escala propia del rol', () => {
    // Antigüedad del productor: $11.236,47 (escala propia, CCT 131/75) × factor, un año, 180 horas.
    expect(r.renglones.find((x) => x.id === 'antiguedad')?.monto).toBe(Math.round(11236.47 * factor));
    // Refrigerio: $8.329,50 por jornada × factor × 30 jornadas.
    expect(r.renglones.find((x) => x.id === 'refrigerio')?.monto).toBe(Math.round(8329.5 * factor * 30));
  });

  it('el resultado y el Word dicen de qué escala sale y cuánto se le sumó', () => {
    const texto = 'Escala de septiembre de 2026 (CCT 131/75) + 2,0 % por salarios + 3,0 % por IPC NEA';
    expect(r.rol.escala).toBe(texto);
    const c = contenidoDelPresupuesto(r, conProyeccion, {
      numero: '', profesional: '', email: '', telefono: '', cuit: '', empresa: '', contacto: '',
      descripcion: '', condiciones: '', validez: '',
    } as Parameters<typeof contenidoDelPresupuesto>[2]);
    expect(c.fundamento).toContain(texto);
  });

  it('sin escala propia del rol, los adicionales usan la del ítem: título y exteriores', () => {
    const conTitulo = calcular(
      { ...seleccion, rolId: 'cm', items: { 'cliente-a': {}, 'titulo-universitario': {}, exteriores: {} } },
      conProyeccion,
    );
    if (!conTitulo.ok) throw new Error('el cálculo de prueba no corrió');
    const renglones = conTitulo.resultado.renglones;
    expect(renglones.find((x) => x.id === 'titulo-universitario')?.monto).toBe(Math.round(54478 * factor));
    expect(renglones.find((x) => x.id === 'exteriores')?.monto).toBe(Math.round(10374.34 * factor * 30));
  });
});

describe('RF-35 · los índices cubren todas las escalas', () => {
  // Si una escala quedara antes del primer mes cargado, la proyección fallaría y
  // con ella el cálculo entero: se controla sobre los datos reales.
  it('cada rol y cada adicional de convenio se proyecta sin error con los índices actuales', async () => {
    const { datos } = await import('../../util/datos/index.ts');
    const origenes = [
      ...datos.roles.map((r) => r.escala.origen),
      ...datos.items.filter((i) => i.actualizacion.regla === 'escala').map((i) => i.actualizacion.origen!),
    ];
    for (const origen of origenes) expect(() => proyectarDesdeEscala(origen, datos.indices), origen).not.toThrow();
  });
});
