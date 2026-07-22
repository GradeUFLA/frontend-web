import {
  calcularTotalAposSelecao,
  findNextAnpHour,
  getPendenciasCorequisitosCalendario,
  horariosConflitam,
  isAnpOnly,
  isTurmaSelecionavel,
  normalizarDia,
  normalizarHora,
  verificarConflitoMateria,
  verificarPreRequisitosDetalhada
} from './gradeRules';

describe('regras da grade', () => {
  test('mantém correquisito do mesmo semestre como pendente', () => {
    const materia = {
      codigo: 'GCC001',
      semestre: 3,
      preRequisitosDetalhada: { forte: [], minimo: [], coreq: ['GCC002'] }
    };
    const todas = [materia, { codigo: 'GCC002', semestre: 3 }];

    const resultado = verificarPreRequisitosDetalhada(materia, [], {}, todas);

    expect(resultado.faltandoCoreq).toEqual(['GCC002']);
    expect(resultado.cumprido).toBe(false);
  });

  test('considera correquisito satisfeito quando ele está na grade', () => {
    const materia = {
      codigo: 'GCC001',
      preRequisitosDetalhada: { forte: [], minimo: [], coreq: ['GCC002'] }
    };

    const resultado = verificarPreRequisitosDetalhada(
      materia,
      [],
      { GCC002: { codigo: 'GCC002' } }
    );

    expect(resultado.faltandoCoreq).toEqual([]);
    expect(resultado.cumprido).toBe(true);
  });

  test('só permite turma sem horário quando ela é ANP', () => {
    expect(isTurmaSelecionavel({ anp: false, horarios: [] })).toBe(false);
    expect(isTurmaSelecionavel({ anp: true, horarios: [] })).toBe(true);
    expect(isTurmaSelecionavel({ anp: false, horarios: [{ dia: 2, inicio: 8, fim: 10 }] })).toBe(true);
  });

  test('trocar a turma da mesma matéria não soma seus créditos duas vezes', () => {
    const grade = {
      GCC001: { codigo: 'GCC001', creditos: 4 },
      GCC002: { codigo: 'GCC002', creditos: 6 }
    };

    expect(calcularTotalAposSelecao(grade, { codigo: 'GCC001', creditos: 4 })).toBe(10);
  });

  test('normaliza dias e horas usados nas regras de conflito', () => {
    expect(normalizarDia('Sábado')).toBe(6);
    expect(normalizarDia('segunda-feira')).toBe(1);
    expect(normalizarDia(7)).toBe(6);
    expect(normalizarDia('dia inválido')).toBeNull();
    expect(normalizarHora('08:30')).toBe(8);
    expect(normalizarHora(10.75)).toBe(10);
    expect(normalizarHora('inválida')).toBeNull();
  });

  test('detecta somente sobreposição real no mesmo dia', () => {
    const segundaDeOitoAsDez = { dia: 'Segunda', inicio: '08:00', fim: '10:00' };

    expect(horariosConflitam(
      segundaDeOitoAsDez,
      { dia: 1, inicio: 9, fim: 11 }
    )).toBe(true);
    expect(horariosConflitam(
      segundaDeOitoAsDez,
      { dia: 1, inicio: 10, fim: 12 }
    )).toBe(false);
    expect(horariosConflitam(
      segundaDeOitoAsDez,
      { dia: 2, inicio: 9, fim: 11 }
    )).toBe(false);
  });

  test('ANP sem encontro presencial usa o próximo espaço de sábado', () => {
    const grade = {
      GCC001: { codigo: 'GCC001', anp: true, anpHour: 9 },
      GCC002: { codigo: 'GCC002', anp: true, anpHour: 10 }
    };

    expect(isAnpOnly({ anp: true, horarios: [] })).toBe(true);
    expect(findNextAnpHour(grade)).toBe(11);
    expect(findNextAnpHour(grade, { ignorarCodigo: 'GCC001' })).toBe(9);
  });

  test('informa conflito quando todos os espaços reservados para ANP estão ocupados', () => {
    const grade = Object.fromEntries(
      Array.from({ length: 14 }, (_, index) => [
        `ANP${index}`,
        { codigo: `ANP${index}`, anp: true, anpHour: 9 + index }
      ])
    );

    expect(verificarConflitoMateria({ codigo: 'NOVA', anp: true, horarios: [] }, grade))
      .toEqual({
        temConflito: true,
        mensagem: 'Sem vagas ANP disponíveis no sábado'
      });
  });

  test('ANP híbrida conflita em seus encontros presenciais', () => {
    const grade = {
      GCC001: {
        codigo: 'GCC001',
        nome: 'Disciplina existente',
        horarios: [{ dia: 2, inicio: 8, fim: 10 }]
      }
    };
    const anpHibrida = {
      codigo: 'GCC002',
      anp: true,
      horarios: [{ dia: 'Terça', inicio: 9, fim: 11 }]
    };

    expect(isAnpOnly(anpHibrida)).toBe(false);
    expect(verificarConflitoMateria(anpHibrida, grade)).toMatchObject({
      temConflito: true,
      materiaConflito: 'Disciplina existente'
    });
  });

  test('troca de turma ignora a ocupação anterior da própria disciplina', () => {
    const grade = {
      GCC001: {
        codigo: 'GCC001',
        nome: 'Algoritmos',
        horarios: [{ dia: 1, inicio: 8, fim: 10 }]
      }
    };
    const novaTurma = {
      codigo: 'GCC001',
      horarios: [{ dia: 1, inicio: 9, fim: 11 }]
    };

    expect(verificarConflitoMateria(novaTurma, grade, { ignorarCodigo: 'GCC001' }))
      .toEqual({ temConflito: false });
  });

  test('encontra correquisito pendente e o remove da lista quando adicionado', () => {
    const materia = {
      codigo: 'GCC001',
      preRequisitosDetalhada: { coreq: ['GCC002'] }
    };

    expect(getPendenciasCorequisitosCalendario({ GCC001: materia }))
      .toEqual([{ materiaCodigo: 'GCC001', coreqCodigo: 'GCC002' }]);
    expect(getPendenciasCorequisitosCalendario({
      GCC001: materia,
      GCC002: { codigo: 'GCC002' }
    })).toEqual([]);
  });
});
