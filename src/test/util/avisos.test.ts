import { describe, expect, it } from 'vitest';
import { avisosDelMes, avisosParaAbrir } from '../../util/avisos.ts';
import { datosAlOrigen as datos } from '../fixture/datos.ts';

// RF-24: en febrero y agosto, un aviso por monotributo y RS de Chaco; en
// octubre, la revisión anual de escalas y costos de mercado; nunca duplicados.

describe('RF-24 · recordatorio de valores manuales', () => {
  it('en febrero y agosto avisa por monotributo y RS de Chaco, con dónde se publican', () => {
    for (const mes of ['2027-02', '2026-08']) {
      const avisos = avisosDelMes(mes, datos);
      expect(avisos).toHaveLength(1);
      expect(avisos[0].titulo).toMatch(/^Revisar monotributo y RS de Chaco/);
      expect(avisos[0].cuerpo).toContain(datos.monotributo.fuente);
      expect(avisos[0].cuerpo).toContain('chaco.gob.ar');
    }
  });

  it('en octubre lista cada escala con su mes de origen y los cuatro costos de mercado', () => {
    const [aviso] = avisosDelMes('2026-10', datos);
    expect(aviso.titulo).toBe('Revisión anual de escalas y costos de mercado · 2026');
    for (const rol of datos.roles) expect(aviso.cuerpo).toContain(`| ${rol.nombre} |`);
    expect(aviso.cuerpo).toContain('agosto de 2024'); // la escala del conductor
    for (const id of ['conectividad', 'datos-moviles', 'art', 'seguro-equipamiento']) {
      expect(aviso.cuerpo).toContain(`| ${datos.items.find((i) => i.id === id)!.nombre} |`);
    }
  });

  it('una escala vieja no genera ningún aviso fuera de octubre', () => {
    for (const mes of ['2026-01', '2026-03', '2026-09', '2026-11', '2026-12']) expect(avisosDelMes(mes, datos)).toEqual([]);
  });

  it('si ya hay un issue abierto por lo mismo, no se duplica', () => {
    const avisos = avisosDelMes('2026-08', datos);
    expect(avisosParaAbrir(avisos, ['aviso-valores-manuales'])).toEqual([]);
    expect(avisosParaAbrir(avisos, ['aviso-revision-anual'])).toEqual(avisos);
  });
});
