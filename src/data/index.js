export * from './materias';
export * from './cursos';

// Re-exportar cursoInfo baseado no curso selecionado
export const getCursoInfo = (cursoId) => {
  const { cursos } = require('./cursos');
  return cursos.find(c => c.id === cursoId) || cursos[0];
};

