import Papa from 'papaparse';

// helper to fetch csv from public/data and parse it
export function loadCsv(path) {
  return fetch(path)
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch ' + path + ' - ' + res.status);
      return res.text();
    })
    .then(text => new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => resolve(res.data),
        error: (err) => reject(err)
      });
    }));
}

async function tryLoad(paths) {
  for (const p of paths) {
    try {
      const rows = await loadCsv(p);
      if (rows && rows.length) return rows;
    } catch (e) {
      // continue trying other paths
      // console.warn('CSV load failed for', p, e.message);
    }
  }
  throw new Error('None of the CSV paths could be loaded: ' + paths.join(', '));
}

export async function loadCursos() {
  // try common filenames and languages
  const paths = ['/data/courses.csv', '/data/cursos.csv', '/data/example_cursos.csv'];
  const rows = await tryLoad(paths);

  const normalizeMatriz = (m) => {
    if (!m) return '';
    const s = String(m).trim();
    const mMatch = s.match(/(\d{4})\D*(\d{1,2})/);
    if (mMatch) return `${mMatch[1]}/${String(mMatch[2]).padStart(2, '0')}`;
    return s;
  };

  // Build unique courses by id
  const map = new Map();
  rows.forEach(r => {
    const id = (r.curso_id || r.id || r.curso || '').toString().trim();
    const nome = (r.nome || r.name || '').toString().trim();
    const matrizRaw = (r.matriz || r.matrix || r.matriz_curricular || '').toString().trim();
    const matriz = normalizeMatriz(matrizRaw);
    if (!id) return;
    if (!map.has(id)) {
      map.set(id, {
        id,
        nome: nome || id,
        // optional: try to parse other fields if present
        tipo: r.tipo || r.type || 'Bacharelado',
        totalSemestres: Number(r.totalSemestres || r.total_semestres || r.periodos || 8) || 8,
        // If not specified, assume course is available (implemented) when loaded from CSV
        implementado: (r.implementado || 'true').toString().toLowerCase() === 'true',
        // collect matrices found for this course
        _matrizesSet: new Set()
      });
    }
    if (matriz) map.get(id)._matrizesSet.add(matriz);
  });

  // convert sets to arrays on each entry
  const result = Array.from(map.values()).map(entry => {
    const matrizesArr = Array.from(entry._matrizesSet || []).filter(Boolean);
    // sort matrizesArr descending by year/part if possible
    matrizesArr.sort((a,b) => {
      const ma = String(a).match(/(\d{4})\D*(\d{1,2})/);
      const mb = String(b).match(/(\d{4})\D*(\d{1,2})/);
      if (ma && mb) return (Number(mb[1])*100 + Number(mb[2])) - (Number(ma[1])*100 + Number(ma[2]));
      return String(b).localeCompare(String(a));
    });
    const { _matrizesSet, ...rest } = entry;
    return { ...rest, matrizes: matrizesArr };
  });

  return result;
}

export async function loadMaterias() {
  // try English and Portuguese filenames
  const paths = ['/data/subjects.csv', '/data/materias.csv', '/data/example_materias.csv'];
  const rows = await tryLoad(paths);

  return rows.map(r => {
    // normalize keys (accept curso_id / course_id as well)
    const cursoRaw = (r.curso_id || r.course_id || r.curso || r.course || '').toString().trim() || undefined;
    const curso = cursoRaw ? cursoRaw.toString().trim() : undefined;
    const matrizRaw = (r.matriz || r.matrix || '').toString().trim() || undefined;
    const normalizeMatriz = (m) => {
      if (!m) return undefined;
      const mm = String(m).trim();
      const mMatch = mm.match(/(\d{4})\D*(\d{1,2})/);
      if (mMatch) return `${mMatch[1]}/${String(mMatch[2]).padStart(2,'0')}`;
      return mm;
    };
    const matriz = normalizeMatriz(matrizRaw);
    let semestreRaw = r.semestre || r.semester || r.period || '';
    semestreRaw = typeof semestreRaw === 'string' ? semestreRaw.trim() : semestreRaw;
    // keep as string if not numeric
    const semestre = semestreRaw === '' ? undefined : (isNaN(Number(semestreRaw)) ? semestreRaw : Number(semestreRaw));

    const codigo = (r.codigo || r.code || '').toString().trim();
    const nome = (r.nome || r.name || '').toString().trim();
    const creditos = Number(r.creditos || r.credits || 0) || 0;
    const tipo = (r.tipo || r.type || 'obrigatoria').toString().trim();
    const subgrupo = (r.subgrupo || r.subgroup || '').toString().trim() || undefined;

    // preRequisitos may be a comma-separated string
    const preField = r.preRequisitos || r.preRequisitos || r.prerequisitos || r.prereqs || r.requisitos || '';
    const pre = (preField || '')
      .toString()
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    // turmas may be JSON in the CSV cell or a simple notation; try JSON parse, fallback to empty
    let turmas = [];
    const turmasField = r.turmas || r.turmas_json || r.classes || '';
    if (turmasField) {
      try {
        turmas = JSON.parse(turmasField);
      } catch (e) {
        // not JSON, attempt to parse simple ';' separated list like "A:1-3|2-4"
        // but default to empty list
        turmas = [];
      }
    }

    return {
      curso,
      matriz,
      semestre,
      codigo,
      nome,
      creditos,
      tipo,
      subgrupo,
      preRequisitos: pre,
      turmas
    };
  });
}
