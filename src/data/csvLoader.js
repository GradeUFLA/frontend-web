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

// Try parsing a prereq string like "Forte: A, B; Minimo: C; Co-requisito: D" into structured object
function parsePreRequisitosString(preField) {
  const result = { forte: [], minimo: [], coreq: [] };
  if (!preField) return result;
  const s = preField.toString().trim();
  if (!s) return result;

  // split by semicolon or new line to separate labeled groups
  const parts = s.split(/[;\n]+/).map(p => p.trim()).filter(Boolean);
  const hasLabel = /\bForte\b|\bMinimo\b|\bCo-?requisito\b/i.test(s);

  if (!hasLabel) {
    // split by commas or slashes or pipes as fallback (use RegExp constructor to avoid needing to escape '/').
    /* eslint-disable-next-line no-useless-escape */
    const items = s.split(new RegExp('[,|/]+')).map(x => x.trim()).filter(Boolean);
    result.forte = items;
    return result;
  }

  parts.forEach(part => {
    let m;
    if ((m = part.match(/Forte\s*:\s*(.*)/i))) {
      const list = m[1].split(/[;,]+/).map(x => x.trim()).filter(Boolean);
      result.forte.push(...list);
    } else if ((m = part.match(/Minimo\s*:\s*(.*)/i))) {
      const list = m[1].split(/[;,]+/).map(x => x.trim()).filter(Boolean);
      result.minimo.push(...list);
    } else if ((m = part.match(/Co-?requisito\s*:\s*(.*)/i))) {
      const list = m[1].split(/[;,]+/).map(x => x.trim()).filter(Boolean);
      result.coreq.push(...list);
    } else {
      // unlabeled fragment -> treat as forte entries
      const list = part.split(/[;,]+/).map(x => x.trim()).filter(Boolean);
      result.forte.push(...list);
    }
  });

  // normalize codes (trim and remove stray punctuation)
  /* eslint-disable-next-line no-useless-escape */
  ['forte', 'minimo', 'coreq'].forEach(k => {
    result[k] = result[k].map(code => (code || '').toString().replace(/[^A-Za-z0-9_-]/g, '').toUpperCase()).filter(Boolean);
  });

  return result;
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
        // totalSemestres will be computed dynamically from subjects later
        totalSemestres: 8, // fallback value
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

// Compute totalSemestres for each course/matriz dynamically from subjects
export function computeTotalSemestres(cursos, materias) {
  // Group materias by curso + matriz
  const matrizSemestresMap = new Map(); // key: "cursoId|matriz" -> max semestre found

  materias.forEach(m => {
    if (!m.curso || !m.matriz || m.tipo !== 'obrigatoria') return;
    if (m.semestre == null || String(m.semestre).toLowerCase() === 'indefinido') return;

    const semestreNum = Number(m.semestre);
    if (isNaN(semestreNum) || semestreNum <= 0) return;

    const key = `${m.curso}|${m.matriz}`;
    const current = matrizSemestresMap.get(key) || 0;
    if (semestreNum > current) {
      matrizSemestresMap.set(key, semestreNum);
    }
  });

  // Apply computed values to cursos - store totalSemestres BY MATRIZ, not just the most recent one
  cursos.forEach(curso => {
    if (!curso.matrizes || curso.matrizes.length === 0) return;

    // Store totalSemestres for each matriz in a map
    if (!curso.totalSemestresPorMatriz) {
      curso.totalSemestresPorMatriz = {};
    }

    curso.matrizes.forEach(matrizId => {
      const key = `${curso.id}|${matrizId}`;
      const computed = matrizSemestresMap.get(key);
      if (computed && computed > 0) {
        curso.totalSemestresPorMatriz[matrizId] = computed;
      } else {
        curso.totalSemestresPorMatriz[matrizId] = 8; // fallback
      }
    });

    // Also set totalSemestres to the most recent matriz for backward compatibility
    const mainMatriz = curso.matrizes[0];
    const mainKey = `${curso.id}|${mainMatriz}`;
    const mainComputed = matrizSemestresMap.get(mainKey);
    curso.totalSemestres = mainComputed && mainComputed > 0 ? mainComputed : 8;
  });

  return cursos;
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

    // preRequisitos may be a labeled string in the CSV; parse into structured object
    const preField = r.preRequisitos || r.prerequisitos || r.prereqs || r.requisitos || '';
    const preDetalhado = parsePreRequisitosString(preField);
    // flat array for backward compatibility
    const preFlat = [...new Set([...(preDetalhado.forte || []), ...(preDetalhado.minimo || []), ...(preDetalhado.coreq || [])])];

    // turmas may be JSON in the CSV cell or a simple notation; try JSON parse, fallback to empty
    let turmas = [];
    const turmasField = r.turmas || r.turmas_json || r.classes || '';
    if (turmasField) {
      try {
        // Remove wrapping quotes if present
        const raw = typeof turmasField === 'string' ? turmasField.trim().replace(/^"|"$/g, '') : turmasField;
        turmas = JSON.parse(raw);
        // Normalize horario.dia values to 0..6 convention (0=Dom, 6=Sáb)
        if (Array.isArray(turmas)) {
          turmas.forEach(t => {
            if (t && Array.isArray(t.horarios)) {
              t.horarios.forEach(h => {
                if (!h || h.dia == null) return;
                const nd = Number(h.dia);
                if (!Number.isNaN(nd)) {
                  if (nd >= 1 && nd <= 7) {
                    h.dia = ((nd + 6) % 7 + 7) % 7;
                  } else if (nd >= 0 && nd <= 6) {
                    h.dia = nd;
                  } else {
                    h.dia = nd;
                  }
                }
                // also normalize times like "08:00" to number hours
                if (typeof h.inicio === 'string') {
                  const m = h.inicio.match(/^(\d{1,2})(?::(\d{2}))?/);
                  if (m) h.inicio = parseInt(m[1], 10);
                }
                if (typeof h.fim === 'string') {
                  const m2 = h.fim.match(/^(\d{1,2})(?::(\d{2}))?/);
                  if (m2) h.fim = parseInt(m2[1], 10);
                }
              });
            }
          });
        }
      } catch (e) {
        // not JSON, attempt simple parsing: format like "id:10A|horarios:3-8,5-8,7-9;anp:false"
        const raw = (typeof turmasField === 'string' ? turmasField.trim() : '');
        if (raw) {
          const items = raw.split(/\s*;\s*/).filter(Boolean);
          turmas = items.map(it => {
            const obj = { id: null, horarios: [], anp: false };
            const parts = it.split(/\s*\|\s*/).filter(Boolean);
            parts.forEach(p => {
              const [k, v] = p.split(/\s*:\s*/);
              if (!k) return;
              const key = k.toLowerCase().trim();
              if (key === 'id') obj.id = v;
              else if (key === 'anp') obj.anp = String(v).toLowerCase() === 'true';
              else if (key === 'horarios') {
                const hs = v.split(/\s*,\s*/).filter(Boolean);
                hs.forEach(hsItem => {
                  const mm = hsItem.match(/(\d)\s*-\s*(\d+)/);
                  if (mm) {
                    const dia = Number(mm[1]);
                    const inicio = Number(mm[2]);
                    obj.horarios.push({ dia: dia >=1 && dia <=7 ? ((dia+6)%7) : dia, inicio, fim: inicio+1 });
                  }
                });
              }
            });
            return obj;
          });
        } else {
          turmas = [];
        }
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
      preRequisitos: preFlat, // legacy consumers expect array
      preRequisitosDetalhada: preDetalhado,
      turmas
    };
  });
}
