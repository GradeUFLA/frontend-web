export const CREDIT_MAX = 32;
export const SATURDAY_INDEX = 6;
export const ANP_START_HOUR = 9;
export const ANP_END_HOUR = 22;

const DIAS_NORMALIZADOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

const removerDiacriticos = valor => String(valor)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const codigosNoCalendario = (materiasNoCalendario = {}) =>
  new Set(Object.keys(materiasNoCalendario || {}));

export function normalizarDia(valor) {
  if (valor == null || valor === '') return null;

  const numerico = Number(valor);
  if (!Number.isNaN(numerico)) {
    if (numerico >= 0 && numerico <= 6) return numerico;
    if (numerico >= 1 && numerico <= 7) return ((numerico + 6) % 7 + 7) % 7;
    return null;
  }

  const abreviacao = removerDiacriticos(valor).trim().toLowerCase().slice(0, 3);
  const indice = DIAS_NORMALIZADOS.indexOf(abreviacao);
  return indice === -1 ? null : indice;
}

export function normalizarHora(valor) {
  if (valor == null || valor === '') return null;
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? Math.floor(valor) : null;
  }

  const match = String(valor).trim().match(/^(\d{1,2})(?::|\.\s*)?(\d{0,2})$/);
  if (!match) return null;

  const hora = Number(match[1]);
  return Number.isFinite(hora) ? hora : null;
}

export function horariosConflitam(horarioA, horarioB) {
  if (!horarioA || !horarioB) return false;

  const diaA = normalizarDia(horarioA.dia);
  const diaB = normalizarDia(horarioB.dia);
  if (diaA == null || diaB == null || diaA !== diaB) return false;

  const inicioA = normalizarHora(horarioA.inicio);
  const fimA = normalizarHora(horarioA.fim);
  const inicioB = normalizarHora(horarioB.inicio);
  const fimB = normalizarHora(horarioB.fim);
  if ([inicioA, fimA, inicioB, fimB].some(valor => valor == null)) return false;

  return inicioA < fimB && fimA > inicioB;
}

export function isAnpTurma(turma) {
  return turma?.anp === true || turma?.turmaAnp === true;
}

export function isAnpOnly(turma) {
  const horarios = Array.isArray(turma?.horarios) ? turma.horarios : [];
  return horarios.length === 0
    || horarios.every(horario => normalizarDia(horario?.dia) === SATURDAY_INDEX);
}

export function findNextAnpHour(
  materiasNoCalendario = {},
  { ignorarCodigo = null } = {}
) {
  const horasOcupadas = new Set();

  for (const [codigo, materia] of Object.entries(materiasNoCalendario || {})) {
    if (codigo === ignorarCodigo) continue;
    if (isAnpTurma(materia) && materia?.anpHour != null) {
      horasOcupadas.add(Number(materia.anpHour));
    }
  }

  for (let hora = ANP_START_HOUR; hora <= ANP_END_HOUR; hora++) {
    if (!horasOcupadas.has(hora)) return hora;
  }
  return null;
}

export function verificarConflitoMateria(
  materia,
  materiasNoCalendario = {},
  { ignorarCodigo = materia?.codigo ?? null } = {}
) {
  if (!materia) return { temConflito: false };

  if (isAnpTurma(materia) && isAnpOnly(materia)) {
    const proximaHora = findNextAnpHour(materiasNoCalendario, { ignorarCodigo });
    if (proximaHora == null) {
      return { temConflito: true, mensagem: 'Sem vagas ANP disponíveis no sábado' };
    }
    return { temConflito: false };
  }

  const horariosNovos = Array.isArray(materia.horarios) ? materia.horarios : [];
  for (const [codigo, materiaExistente] of Object.entries(materiasNoCalendario || {})) {
    if (codigo === ignorarCodigo) continue;
    if (isAnpTurma(materiaExistente) && isAnpOnly(materiaExistente)) continue;

    const horariosExistentes = Array.isArray(materiaExistente?.horarios)
      ? materiaExistente.horarios
      : [];
    for (const novoHorario of horariosNovos) {
      for (const horarioExistente of horariosExistentes) {
        if (horariosConflitam(novoHorario, horarioExistente)) {
          return {
            temConflito: true,
            materiaConflito: materiaExistente?.nome || codigo,
            horarioConflito: horarioExistente
          };
        }
      }
    }
  }

  return { temConflito: false };
}

export function isTurmaSelecionavel(turma) {
  return isAnpTurma(turma)
    || (Array.isArray(turma?.horarios) && turma.horarios.length > 0);
}

export function calcularTotalCreditos(materiasNoCalendario = {}) {
  return Object.values(materiasNoCalendario || {})
    .reduce((total, materia) => total + Number(materia?.creditos || 0), 0);
}

export function calcularTotalAposSelecao(materiasNoCalendario = {}, materia) {
  const materiaAtual = materiasNoCalendario?.[materia?.codigo];
  return calcularTotalCreditos(materiasNoCalendario)
    - Number(materiaAtual?.creditos || 0)
    + Number(materia?.creditos || 0);
}

export function verificarPreRequisitosDetalhada(
  materia,
  materiasAprovadas = [],
  materiasNoCalendario = {},
  allMateriasList = null
) {
  const detalhada = materia?.preRequisitosDetalhada;
  if (!detalhada) {
    const faltando = (materia?.preRequisitos || [])
      .filter(codigo => !materiasAprovadas.includes(codigo));
    return {
      cumprido: faltando.length === 0,
      faltandoForte: faltando,
      faltandoMinimo: [],
      faltandoCoreq: []
    };
  }

  const isSamePeriod = (codigo) => {
    const semestreMateria = materia?.semestre ?? materia?.semestreOriginal;
    if (
      semestreMateria == null ||
      semestreMateria === '' ||
      semestreMateria === 'Indefinido' ||
      !Array.isArray(allMateriasList) ||
      allMateriasList.length === 0
    ) {
      return false;
    }

    const prerequisito = allMateriasList.find(item => item.codigo === codigo);
    const semestrePrerequisito = prerequisito?.semestre ?? prerequisito?.semestreOriginal;
    if (
      semestrePrerequisito == null ||
      semestrePrerequisito === '' ||
      semestrePrerequisito === 'Indefinido'
    ) {
      return false;
    }

    const atualNumero = Number(semestreMateria);
    const prerequisitoNumero = Number(semestrePrerequisito);
    if (!Number.isNaN(atualNumero) && !Number.isNaN(prerequisitoNumero)) {
      return atualNumero === prerequisitoNumero;
    }

    return String(semestreMateria).trim() === String(semestrePrerequisito).trim();
  };

  const faltandoForte = (detalhada.forte || [])
    .filter(codigo => !materiasAprovadas.includes(codigo))
    .filter(codigo => !isSamePeriod(codigo));

  const faltandoMinimo = (detalhada.minimo || [])
    .filter(codigo => !materiasAprovadas.includes(codigo))
    .filter(codigo => !isSamePeriod(codigo));

  // Correquisitos do mesmo período continuam obrigatórios: eles devem estar
  // aprovados ou presentes junto com a matéria na grade atual.
  const presentes = codigosNoCalendario(materiasNoCalendario);
  const faltandoCoreq = (detalhada.coreq || [])
    .filter(codigo => !materiasAprovadas.includes(codigo) && !presentes.has(codigo));

  const cumprido = faltandoForte.length === 0
    && faltandoMinimo.length === 0
    && faltandoCoreq.length === 0;

  return { cumprido, faltandoForte, faltandoMinimo, faltandoCoreq };
}

export function verificarPreRequisitos(materia, materiasAprovadas, materiasNoCalendario = {}) {
  const resultado = verificarPreRequisitosDetalhada(
    materia,
    materiasAprovadas,
    materiasNoCalendario
  );
  const faltando = [
    ...(resultado.faltandoForte || []),
    ...(resultado.faltandoMinimo || []),
    ...(resultado.faltandoCoreq || [])
  ];
  return { cumprido: resultado.cumprido, faltando };
}

export function getPendenciasCorequisitosCalendario(
  materiasNoCalendario = {},
  materiasAprovadas = [],
  prerequisitosConfirmados = []
) {
  const presentes = codigosNoCalendario(materiasNoCalendario);
  const satisfeitos = new Set([...materiasAprovadas, ...prerequisitosConfirmados]);
  const pendencias = [];

  for (const [materiaCodigo, materia] of Object.entries(materiasNoCalendario || {})) {
    const corequisitos = materia?.preRequisitosDetalhada?.coreq || [];
    for (const coreqCodigo of corequisitos) {
      if (!presentes.has(coreqCodigo) && !satisfeitos.has(coreqCodigo)) {
        pendencias.push({ materiaCodigo, coreqCodigo });
      }
    }
  }

  return pendencias;
}
