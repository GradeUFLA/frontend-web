import {
  ANP_START_HOUR,
  CREDIT_MAX,
  findNextAnpHour,
  isAnpTurma,
  normalizarDia,
  normalizarHora,
  SATURDAY_INDEX
} from '../../domain/gradeRules';

export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const CREDIT_WARN = 25;
export {
  ANP_START_HOUR,
  CREDIT_MAX,
  findNextAnpHour,
  isAnpTurma,
  SATURDAY_INDEX
};

export const normalizeDia = normalizarDia;
export const parseHour = value => normalizarHora(value) ?? NaN;

const CORES_MATERIAS = [
  '#4ecdc4', '#ffe66d', '#a29bfe', '#fd79a8',
  '#00b894', '#74b9ff', '#ffeaa7', '#81ecec',
  '#6c5ce7', '#00cec9', '#55a3ff', '#fdcb6e'
];

const CORES_TURMAS = [
  '#00F0B5', '#3185FC', '#F9DC5C',
  '#a29bfe', '#fd79a8', '#00cec9'
];

export const gerarHorarios = (start = 7, end = 23) => {
  const horarios = [];
  for (let hora = start; hora <= end; hora++) {
    horarios.push(`${hora.toString().padStart(2, '0')}:00`);
  }
  return horarios;
};

export const getCorMateria = (codigo, materiasNoCalendario = {}) => {
  const codigos = Object.keys(materiasNoCalendario);
  const index = codigos.indexOf(codigo);
  const colorIndex = index === -1 ? codigos.length : index;
  return CORES_MATERIAS[colorIndex % CORES_MATERIAS.length];
};

export const getCorTurma = index => CORES_TURMAS[index % CORES_TURMAS.length];
