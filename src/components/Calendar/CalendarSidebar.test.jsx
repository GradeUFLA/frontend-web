import { materiaSeEncaixaNoFiltro } from './CalendarSidebar';

const filtro = overrides => ({
  ativo: true,
  dia: null,
  horaInicio: null,
  horaFim: null,
  isAnp: false,
  creditos: null,
  ...overrides
});

describe('filtro da sidebar do calendário', () => {
  test('filtra por dia e sobreposição de horário', () => {
    const materia = {
      turmas: [{ horarios: [{ dia: 2, inicio: 8, fim: 10 }] }]
    };

    expect(materiaSeEncaixaNoFiltro(materia, filtro({ dia: 2, horaInicio: 9, horaFim: 11 }))).toBe(true);
    expect(materiaSeEncaixaNoFiltro(materia, filtro({ dia: 3, horaInicio: 9, horaFim: 11 }))).toBe(false);
    expect(materiaSeEncaixaNoFiltro(materia, filtro({ dia: 2, horaInicio: 10, horaFim: 12 }))).toBe(false);
  });

  test('aceita no filtro ANP apenas turmas exclusivamente remotas', () => {
    const anp = { turmas: [{ anp: true, horarios: [] }] };
    const hibrida = {
      turmas: [{ anp: true, horarios: [{ dia: 3, inicio: 10, fim: 12 }] }]
    };

    expect(materiaSeEncaixaNoFiltro(anp, filtro({ isAnp: true }))).toBe(true);
    expect(materiaSeEncaixaNoFiltro(hibrida, filtro({ isAnp: true }))).toBe(false);
  });

  test('filtra pela quantidade exata de créditos', () => {
    const materia = { creditos: 4, turmas: [{ horarios: [] }] };

    expect(materiaSeEncaixaNoFiltro(materia, filtro({ creditos: 4 }))).toBe(true);
    expect(materiaSeEncaixaNoFiltro(materia, filtro({ creditos: 6 }))).toBe(false);
  });

  test('aplica hora inicial mesmo quando não há hora final', () => {
    const materia = { turmas: [{ horarios: [{ dia: 2, inicio: 8, fim: 10 }] }] };

    expect(materiaSeEncaixaNoFiltro(materia, filtro({ horaInicio: 9 }))).toBe(true);
    expect(materiaSeEncaixaNoFiltro(materia, filtro({ horaInicio: 10 }))).toBe(false);
  });

  test('aplica hora final mesmo quando não há hora inicial', () => {
    const materia = { turmas: [{ horarios: [{ dia: 2, inicio: 10, fim: 12 }] }] };

    expect(materiaSeEncaixaNoFiltro(materia, filtro({ horaFim: 11 }))).toBe(true);
    expect(materiaSeEncaixaNoFiltro(materia, filtro({ horaFim: 10 }))).toBe(false);
  });

  test('rejeita intervalo completo quando o fim não é posterior ao início', () => {
    const materia = { turmas: [{ horarios: [{ dia: 2, inicio: 8, fim: 12 }] }] };

    expect(materiaSeEncaixaNoFiltro(materia, filtro({ horaInicio: 10, horaFim: 10 }))).toBe(false);
    expect(materiaSeEncaixaNoFiltro(materia, filtro({ horaInicio: 11, horaFim: 10 }))).toBe(false);
  });
});
