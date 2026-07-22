import {
  findNextAnpHour,
  gerarHorarios,
  getCorMateria,
  normalizeDia,
  parseHour
} from './calendarUtils';

describe('utilitários do calendário', () => {
  test('normaliza dias e horas recebidos do CSV', () => {
    expect(normalizeDia('Segunda')).toBe(1);
    expect(normalizeDia(7)).toBe(6);
    expect(parseHour('08:30')).toBe(8);
  });

  test('gera a faixa de horários incluindo as duas extremidades', () => {
    expect(gerarHorarios(7, 9)).toEqual(['07:00', '08:00', '09:00']);
  });

  test('encontra o próximo espaço ANP e mantém cores estáveis', () => {
    const grade = {
      GCC001: { anp: true, anpHour: 9 },
      GCC002: { anp: true, anpHour: 10 }
    };
    expect(findNextAnpHour(grade)).toBe(11);
    expect(getCorMateria('GCC001', grade)).toBe(getCorMateria('GCC001', grade));
  });
});
