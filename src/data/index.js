/* eslint-disable */
// Central data loader: prefer CSVs from /public/data when available; do NOT fall back to in-memory mock modules

import { loadCursos, loadMaterias } from './csvLoader';

let csvCursos = null;
let csvDadosPorCurso = null;

// Try loading CSVs immediately (non-blocking). If they succeed, the exported getters below will use CSV data.
async function loadDataFromCsv() {
  try {
    const cursos = await loadCursos();
    const materiasRows = await loadMaterias();

    // build materias grouped by course -> matrix -> semestre
    const dadosPorCurso = {};
    if (Array.isArray(cursos)) {
      cursos.forEach(c => {
        if (c && c.id) {
          dadosPorCurso[c.id] = { matrizes: {}, eletivas: [] };
        }
      });
    }

    materiasRows.forEach(m => {
      const cursoKey = m.curso;
      if (!cursoKey) return; // skip rows without course ID

      const matrizKey = m.matriz || 'default';
      dadosPorCurso[cursoKey] = dadosPorCurso[cursoKey] || { matrizes: {}, eletivas: [] };
      dadosPorCurso[cursoKey].matrizes[matrizKey] = dadosPorCurso[cursoKey].matrizes[matrizKey] || { materiasPorSemestre: {}, eletivas: [] };

      if (m.tipo === 'eletiva') {
        dadosPorCurso[cursoKey].matrizes[matrizKey].eletivas.push(m);
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

    try {
      // expose for debugging during development
      // eslint-disable-next-line no-undef
      window.__csvCursos = csvCursos;
      // eslint-disable-next-line no-undef
      window.__csvDadosPorCurso = csvDadosPorCurso;
    } catch (e) {
      // ignore if window not available
    }

    return { cursos, dadosPorCurso };
  } catch (e) {
    // CSV load failed: keep csvCursos null so callers receive safe empty fallbacks
    csvCursos = null;
    csvDadosPorCurso = null;
    return null;
  }
}

// start loading but do not block module import
loadDataFromCsv();

// EXPORTS (CSV-first wrappers)

// Get course info (prefers CSV)
export const getCursoInfo = (cursoId) => {
  if (!csvCursos) return null;
  return (csvCursos || []).find(c => c.id === cursoId) || null;
};

// Get materias por semestre (CSV-aware) - returns [] when not available
export function getMateriasPorSemestre(cursoId, semestre, matrizId) {
  if (!csvDadosPorCurso) return [];
  const dados = csvDadosPorCurso;
  const cursoKey = cursoId || Object.keys(dados)[0];
  if (!cursoKey || !dados[cursoKey]) return [];

  const matrizes = dados[cursoKey].matrizes || {};
  const matrizKey = matrizId || Object.keys(matrizes)[0] || 'default';
  const materiasPorSemestre = (matrizes[matrizKey] && matrizes[matrizKey].materiasPorSemestre) || {};

  if (typeof semestre !== 'undefined' && semestre !== null) {
    return materiasPorSemestre[String(semestre)] || [];
  }
  return materiasPorSemestre;
}

export function getEletivas(cursoId, matrizId) {
  if (!csvDadosPorCurso) return [];
  const dados = csvDadosPorCurso;
  const cursoKey = cursoId || Object.keys(dados)[0];
  if (!cursoKey || !dados[cursoKey]) return [];
  const matrizes = dados[cursoKey].matrizes || {};
  const matrizKey = matrizId || Object.keys(matrizes)[0] || 'default';
  return (matrizes[matrizKey] && matrizes[matrizKey].eletivas) || [];
}

export function getHorariosPorDisciplina(disciplinaCodigo) {
  if (!csvDadosPorCurso) return [];
  const dados = csvDadosPorCurso;
  for (const cursoKey of Object.keys(dados)) {
    const cursoObj = dados[cursoKey];
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
  if (!csvCursos) return [];
  const list = csvCursos;
  if (!Array.isArray(list)) return [];
  return list.slice().sort((a, b) => {
    const extract = s => {
      if (!s || !s.id) return Number.POSITIVE_INFINITY;
      const m = String(s.id).match(/\d+/);
      return m ? Number(m[0]) : Number.POSITIVE_INFINITY;
    };
    const na = extract(a);
    const nb = extract(b);
    if (na !== nb) return na - nb;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });
}

export function getMatrizesByCurso(cursoId) {
  if (csvCursos && Array.isArray(csvCursos)) {
    const curso = csvCursos.find(c => c.id === cursoId);
    if (curso && Array.isArray(curso.matrizes) && curso.matrizes.length > 0) {
      const keys = curso.matrizes.slice().sort((a, b) => String(b).localeCompare(String(a)));
      return keys.map(k => ({ id: k, nome: k }));
    }
  }

  if (csvDadosPorCurso && csvDadosPorCurso[cursoId]) {
    const matrizesObj = csvDadosPorCurso[cursoId].matrizes || {};
    const keys = Object.keys(matrizesObj);
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
  }

  return [];
}

export function getCursosImplementados() {
  if (!csvCursos) return [];
  const list = csvCursos;
  return list.filter(c => c.implementado !== false);
}

export function buscarCursos(termo) {
  if (!csvCursos) return [];
  const list = csvCursos;
  const t = termo.toString().toLowerCase();
  return list.filter(c => (c.nome || '').toString().toLowerCase().includes(t) || (c.id || '').toString().toLowerCase().includes(t));
}

export function getNomeMateria(codigo) {
  if (!csvDadosPorCurso) return null;
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
    const eletTop = (cursoObj.eletivas || []).find(e => e.codigo === codigo || String(e.id) === String(codigo));
    if (eletTop) return eletTop.nome;
  }
  return null;
}

// make loader available to app so it can await CSV load
export { loadDataFromCsv as ensureCsvLoaded };

// Detailed prereq verifier using CSV parsed structure when available
export function verificarPreRequisitosDetalhada(materia, materiasAprovadas, materiasNoCalendario = {}) {
  const pad = materia?.preRequisitosDetalhada;
  if (!pad) {
    const faltando = (materia.preRequisitos || []).filter(pr => !materiasAprovadas.includes(pr));
    return { cumprido: faltando.length === 0, faltandoForte: faltando, faltandoMinimo: [], faltandoCoreq: [] };
  }

  const faltandoForte = (pad.forte || []).filter(pr => !materiasAprovadas.includes(pr));
  const faltandoMinimo = (pad.minimo || []).filter(pr => !materiasAprovadas.includes(pr));
  const faltandoCoreq = (pad.coreq || []).filter(pr => !(materiasAprovadas.includes(pr) || Object.keys(materiasNoCalendario || {}).includes(pr)));

  const anyMissing = (faltandoForte.length > 0) || (faltandoMinimo.length > 0) || (faltandoCoreq.length > 0);

  return {
    cumprido: !anyMissing,
    faltandoForte,
    faltandoMinimo,
    faltandoCoreq
  };
}

// Backwards-compatible wrapper
export function verificarPreRequisitos(materia, materiasAprovadas, materiasNoCalendario = {}) {
  const det = verificarPreRequisitosDetalhada(materia, materiasAprovadas, materiasNoCalendario);
  const faltando = [...(det.faltandoForte || []), ...(det.faltandoMinimo || []), ...(det.faltandoCoreq || [])];
  return { cumprido: det.cumprido, faltando };
}
