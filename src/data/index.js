// Central data loader: prefer CSVs from /public/data when available, otherwise fallback to in-memory modules

import { loadCursos, loadMaterias } from './csvLoader';
import * as materiasModule from './materias';
import * as cursosModule from './cursos';

let csvCursos = null;
let csvDadosPorCurso = null;

// Try loading CSVs immediately (non-blocking). If they succeed, the exported getters below will use CSV data.
async function loadDataFromCsv() {
  try {
    const cursos = await loadCursos();
    const materiasRows = await loadMaterias();

    // build materias grouped by course -> matrix -> semestre
    // initialize entries for all courses found in courses.csv to avoid falling back to in-memory data
    const dadosPorCurso = {};
    if (Array.isArray(cursos)) {
      cursos.forEach(c => {
        if (c && c.id) {
          dadosPorCurso[c.id] = { matrizes: {}, eletivas: [] };
        }
      });
    }
    materiasRows.forEach(m => {
      // Ensure subject row has an explicit curso ID; if missing, skip and log (avoid accidental defaulting)
      const cursoKey = m.curso;
      if (!cursoKey) {
        // skip rows without course ID to avoid mixing subjects into the wrong course
        // Log minimally to aid debugging (won't crash production)
        // eslint-disable-next-line no-console
        console.warn('[data] skipping materia with no curso field:', m.codigo || m.nome || m);
        return;
      }

      const matrizKey = m.matriz || 'default';
      dadosPorCurso[cursoKey] = dadosPorCurso[cursoKey] || { matrizes: {}, eletivas: [] };
      dadosPorCurso[cursoKey].matrizes[matrizKey] = dadosPorCurso[cursoKey].matrizes[matrizKey] || { materiasPorSemestre: {}, eletivas: [] };

      if (m.tipo === 'eletiva') {
        // put eletivas under the specific matrix
        dadosPorCurso[cursoKey].matrizes[matrizKey].eletivas.push(m);
        // also keep a top-level eletivas list (for backward compat)
        dadosPorCurso[cursoKey].eletivas.push(m);
      } else {
        const sem = String(m.semestre || '0');
        const target = dadosPorCurso[cursoKey].matrizes[matrizKey].materiasPorSemestre;
        target[sem] = target[sem] || [];
        target[sem].push(m);
      }
    });

    csvCursos = cursos;
    csvDadosPorCurso = dadosPorCurso;
    // expose for debugging during development
    try {
      // eslint-disable-next-line no-undef
      window.__csvCursos = csvCursos;
      // eslint-disable-next-line no-undef
      window.__csvDadosPorCurso = csvDadosPorCurso;
    } catch (e) {
      // ignore if window is not available
    }
    console.info('[data] CSV data loaded:', { cursos: cursos.length, cursosKeys: Object.keys(dadosPorCurso).length });
    // debug: list matrices per course (if available)
    // eslint-disable-next-line no-console
    console.debug('[data] matrizes sample:', csvCursos && csvCursos.slice(0,5).map(c => ({ id: c.id, matrizes: c.matrizes })));
    return { cursos, dadosPorCurso };
  } catch (e) {
    console.warn('[data] CSV load failed, falling back to in-memory data', e);
    csvCursos = null;
    csvDadosPorCurso = null;
    return null;
  }
}

// start loading but do not block module import
loadDataFromCsv();

// EXPORTS (CSV-aware wrappers)

// Get course info (prefers CSV)
export const getCursoInfo = (cursoId) => {
  const list = csvCursos || cursosModule.cursos;
  return list.find(c => c.id === cursoId) || list[0];
};

// Get materias por semestre (CSV-aware)
export function getMateriasPorSemestre(cursoId, semestre, matrizId) {
  const dados = csvDadosPorCurso || materiasModule.dadosPorCurso;
  const localGet = materiasModule.getMateriasPorSemestre;
  const cursoKey = cursoId || Object.keys(dados)[0];

  // prefer CSV grouped by matrix when available
  if (csvDadosPorCurso && csvDadosPorCurso[cursoKey]) {
    const matrizes = csvDadosPorCurso[cursoKey].matrizes || {};
    const matrizKey = matrizId || Object.keys(matrizes)[0] || 'default';
    const materiasPorSemestre = (matrizes[matrizKey] && matrizes[matrizKey].materiasPorSemestre) || {};

    if (typeof semestre !== 'undefined' && semestre !== null) {
      return materiasPorSemestre[String(semestre)] || [];
    }
    return materiasPorSemestre;
  }

  // fallback to original module behavior
  if (typeof semestre !== 'undefined' && semestre !== null) {
    return localGet(cursoId, semestre);
  }
  return localGet(cursoId);
}

export function getEletivas(cursoId, matrizId) {
  const dados = csvDadosPorCurso || materiasModule.dadosPorCurso;
  const localGet = materiasModule.getEletivas;
  const cursoKey = cursoId || Object.keys(dados)[0];

  if (csvDadosPorCurso && csvDadosPorCurso[cursoKey]) {
    const matrizes = csvDadosPorCurso[cursoKey].matrizes || {};
    const matrizKey = matrizId || Object.keys(matrizes)[0] || 'default';
    return (matrizes[matrizKey] && matrizes[matrizKey].eletivas) || [];
  }

  return localGet(cursoId);
}

export function getHorariosPorDisciplina(disciplinaCodigo) {
  const dados = csvDadosPorCurso || materiasModule.dadosPorCurso;
  for (const cursoKey of Object.keys(dados)) {
    const cursoObj = dados[cursoKey];
    // search inside all matrices
    const matrizes = cursoObj.matrizes || {};
    for (const matrizKey of Object.keys(matrizes)) {
      const materiasMap = matrizes[matrizKey].materiasPorSemestre || {};
      for (const sem of Object.keys(materiasMap)) {
        const list = materiasMap[sem] || [];
        const found = list.find(m => m.codigo === disciplinaCodigo || String(m.id) === String(disciplinaCodigo));
        if (found) {
          const horarios = [];
          (found.turmas || []).forEach(t => {
            (t.horarios || []).forEach(h => {
              horarios.push({ ...h, turma: t.id || t.turma || 'A', docente: t.docente || null, disciplinaCodigo: found.codigo, disciplinaNome: found.nome });
            });
          });
          return horarios;
        }
      }
    }
  }
  return [];
}

export function getCursos() {
  return csvCursos || cursosModule.cursos;
}

// Expose matrizes and course helpers (CSV-aware)
export function getMatrizesByCurso(cursoId) {
  // Combine matrices from courses CSV and from subjects grouping (if present)
  const matrizesSet = new Set();

  if (csvCursos && Array.isArray(csvCursos)) {
    const curso = csvCursos.find(c => c.id === cursoId);
    if (curso && Array.isArray(curso.matrizes)) {
      curso.matrizes.forEach(m => matrizesSet.add(m));
    }
  }

  if (csvDadosPorCurso && csvDadosPorCurso[cursoId]) {
    const matrizesObj = csvDadosPorCurso[cursoId].matrizes || {};
    Object.keys(matrizesObj || {}).forEach(k => matrizesSet.add(k));
  }

  const keys = Array.from(matrizesSet);
  if (keys.length > 0) {
    // parse keys that look like year/period or yearperiod into numeric score
    const parseKey = (k) => {
      if (!k) return null;
      const m = String(k).match(/(\d{4})\D*(\d{1,2})/);
      if (m) return Number(m[1]) * 100 + Number(m[2]);
      const num = Number(String(k).replace(/\D/g, ''));
      return isNaN(num) ? null : num;
    };

    keys.sort((a, b) => {
      const pa = parseKey(a);
      const pb = parseKey(b);
      if (pa != null && pb != null) return pb - pa;
      if (pa != null) return -1;
      if (pb != null) return 1;
      return String(b).localeCompare(String(a));
    });

    return keys.map(k => ({ id: k, nome: k }));
  }
  // fallback to cursos module
  return cursosModule.getMatrizesByCurso ? cursosModule.getMatrizesByCurso(cursoId) : [{ id: '202301', nome: '2023/1', ano: 2023 }];
}

export function getCursosImplementados() {
  const list = csvCursos || cursosModule.cursos;
  return list.filter(c => c.implementado !== false);
}

export function buscarCursos(termo) {
  const list = csvCursos || cursosModule.cursos;
  const t = termo.toString().toLowerCase();
  return list.filter(c => (c.nome || '').toString().toLowerCase().includes(t) || (c.id || '').toString().toLowerCase().includes(t));
}

// Re-export small utility wrappers that other modules expect (use CSV data when possible)
export function verificarPreRequisitos(materia, materiasAprovadas) {
  return materiasModule.verificarPreRequisitos(materia, materiasAprovadas);
}

export function getNomeMateria(codigo) {
  // prefer CSV data
  if (csvDadosPorCurso) {
    for (const cursoKey of Object.keys(csvDadosPorCurso)) {
      const cursoObj = csvDadosPorCurso[cursoKey];
      const matrizes = cursoObj.matrizes || {};
      for (const matrizKey of Object.keys(matrizes)) {
        const materiasMap = matrizes[matrizKey].materiasPorSemestre || {};
        for (const sem of Object.keys(materiasMap)) {
          const found = (materiasMap[sem] || []).find(m => m.codigo === codigo || String(m.id) === String(codigo));
          if (found) return found.nome;
        }
        const elet = (matrizes[matrizKey].eletivas || []).find(e => e.codigo === codigo || String(e.id) === String(codigo));
        if (elet) return elet.nome;
      }
      // top-level eletivas fallback
      const eletTop = (cursoObj.eletivas || []).find(e => e.codigo === codigo || String(e.id) === String(codigo));
      if (eletTop) return eletTop.nome;
    }
  }
  return materiasModule.getNomeMateria(codigo);
}

// make loader available to app so it can await CSV load
export { loadDataFromCsv as ensureCsvLoaded };
