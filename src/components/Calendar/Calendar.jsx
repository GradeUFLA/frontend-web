import { forwardRef, useState, useRef } from 'react';
import {
  verificarPreRequisitosDetalhada,
  getNomeMateria
} from '../../data';
import './Calendar.css';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const CORES_MATERIAS = [
  '#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe', '#fd79a8',
  '#00b894', '#e17055', '#74b9ff', '#ffeaa7', '#81ecec'
];

// Cores para diferenciar as turmas durante a seleção
const CORES_TURMAS = [
  '#00F0B5', // Tropical Mint
  '#3185FC', // Azure Blue
  '#F9DC5C', // Royal Gold
  '#E84855', // Watermelon
  '#a29bfe', // Purple
  '#fd79a8', // Pink
];

// Gera horários de 7h até 23h
const gerarHorarios = (start = 7, end = 23) => {
  const horarios = [];
  for (let h = start; h <= end; h++) {
    horarios.push(`${h.toString().padStart(2, '0')}:00`);
  }
  return horarios;
};

// ANP / Saturday stacking helpers
const SATURDAY_INDEX = 6; // normalized day 6 = Sábado
const ANP_BASE_HOUR = 9; // first ANP visual row starts at 09:00
const ANP_MAX_SLOTS = 14; // slots 1..14

// lightweight static normalizer used only by top-level helpers (does not rely on component internals)
const normalizeDiaStatic = (d) => {
  if (d == null) return d;
  const n = Number(d);
  if (!Number.isNaN(n)) {
    if (n >= 0 && n <= 6) return n;
    if (n >= 1 && n <= 7) return ((n + 6) % 7 + 7) % 7; // 1->0 .. 7->6
    return n;
  }
  const s = String(d).toLowerCase().slice(0,3);
  const idx = DIAS_SEMANA.findIndex(x => x.toLowerCase().slice(0,3) === s);
  return idx !== -1 ? idx : d;
};

// parse hour values which may come as numbers or strings like "08:00"
const parseHour = (val) => {
  if (val == null) return NaN;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const match = val.match(/^(\d{1,2})[:.]?(\d{0,2})/);
    if (match) return Number(match[1]);
    const n = Number(val);
    return Number.isNaN(n) ? NaN : n;
  }
  return NaN;
};

const isAnpTurma = (turma) => {
  if (!turma) return false;
  if (turma.anp) return true;
  const horarios = turma.horarios || [];
  if (horarios.length === 0) return false;
  if (horarios.some(h => h && h.anp === true)) return true;
  const hasSat = horarios.some(h => normalizeDiaStatic(h.dia) === SATURDAY_INDEX);
  const hasWeekday = horarios.some(h => normalizeDiaStatic(h.dia) !== SATURDAY_INDEX);
  return hasSat && !hasWeekday;
};

const mapAnpSlotToHorarioIdx = (slot, baseHour = 7) => {
  // slot 1 => row for ANP_BASE_HOUR, so index = ANP_BASE_HOUR - baseHour + (slot-1)
  return (ANP_BASE_HOUR - baseHour) + (Number(slot) - 1);
};

const findFirstAvailableAnpSlot = (materiasNoCalendario) => {
  const used = new Set();
  for (const m of Object.values(materiasNoCalendario || {})) {
    if (m.anpSlot) used.add(Number(m.anpSlot));
  }
  for (let s = 1; s <= ANP_MAX_SLOTS; s++) {
    if (!used.has(s)) return s;
  }
  return null; // none available
};

const Calendar = forwardRef(({
  semestreAtual,
  materiasAprovadas,
  materiasPorSemestre,
  eletivas,
  materiasNoCalendario,
  onAddMateria,
  onRemoveMateria,
  onMateriaClick,
  onVoltar,
  onShowToast,
  onToggleAprovada,
  materiasMinimoConfirmadas = [],
  onConfirmMinimo
}, ref) => {
  const [mostrarEletivas, setMostrarEletivas] = useState(false);
  const [eletivasQuery, setEletivasQuery] = useState('');
  const [futurasQuery, setFuturasQuery] = useState('');
  const [mostrarFuturas, setMostrarFuturas] = useState(false);
  // Credit limits
  const CREDIT_WARN = 25;
  const CREDIT_MAX = 32;
  const [draggingMateria, setDraggingMateria] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTurmaIndex, setSelectedTurmaIndex] = useState(null);
  const [minimoModal, setMinimoModal] = useState({ open: false, prereq: null, parent: null });

  const calendarTableRef = useRef(null);
  const wrapperRef = useRef(null);

  // Robust toast trigger: use parent's onShowToast if provided, otherwise dispatch an event
  const triggerToast = (message, level = 'info') => {
    if (typeof onShowToast === 'function') {
      try {
        onShowToast(message, level);
        return;
      } catch (e) {
        // fall through to fallback
        // eslint-disable-next-line no-console
        console.warn('onShowToast handler threw an error, using fallback:', e);
      }
    }

    try {
      const ev = new CustomEvent('gradeufla-toast', { detail: { message, level } });
      window.dispatchEvent(ev);
    } catch (e) {
      // last resort: console
      // eslint-disable-next-line no-console
      console.log(`[toast:${level}]`, message);
    }

    // Additional direct global fallback in case the App listener isn't attached yet
    try {
      if (typeof window !== 'undefined' && typeof window.gradeuflaAddToast === 'function') {
        window.gradeuflaAddToast(message, level);
      }
    } catch (e) {
      // ignore
    }
  };

  // helper: calculate total credits currently in calendar
  const calcTotalCreditos = () => Object.values(materiasNoCalendario || {}).reduce((acc, m) => acc + (m.creditos || 0), 0);

  // generate hours from 07:00 to 23:00
  const horarios = gerarHorarios(7, 23);
  const baseHour = 7; // used to compute numeric hour from index

  // Download (screenshot) handler: captures the calendar title + table and downloads JPEG
  const handleDownloadPNG = async () => {
    const node = wrapperRef.current;
    if (!node) {
      triggerToast('Área do calendário não disponível para captura.', 'error');
      return;
    }

    try {
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default || html2canvasModule;

      // Use the element's computed background color so exported image matches theme
      const comp = window.getComputedStyle(node);
      let bg = comp && comp.backgroundColor ? comp.backgroundColor : null;
      // If computed background is transparent, fall back to body background or a sensible dark default
      if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
        bg = bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' ? bodyBg : '#121216';
      }

      const canvas = await html2canvas(node, {
        backgroundColor: bg,
        scale: 3, // ⭐ Mudança principal: forçar scale alto (2 ou 3)
        useCORS: true, // Permitir imagens externas
        allowTaint: false,
        logging: false,
        // Melhora a renderização de texto
        foreignObjectRendering: false,
      });

      // ⭐ Manter PNG para melhor qualidade (sem compressão com perdas)
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `grade-${semestreAtual || 'sem'}.png`; // Voltar para PNG
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erro ao gerar imagem do calendário', err);
      triggerToast('Erro ao gerar imagem. Instale html2canvas: npm install html2canvas', 'error');
    }
  };
  // The CSV uses 1 = Domingo, 2 = Segunda, ..., 7 = Sábado (as in your example).
  // Map that to 0..6 by shifting -1 (n-1 mod 7).
  // normalize dia numbers coming from CSV / data sources
  // We accept:
  // - 0..6 (0=Dom, 6=Sáb) -> keep
  // - 1..7 with convention 1=Dom ... 7=Sáb -> map to 0..6 via (n-1) mod 7
  // - strings (e.g., 'Dom','Seg') -> map by matching DIAS_SEMANA
  const normalizeDia = (d) => {
    if (d == null) return d;
    const n = Number(d);
    if (!Number.isNaN(n)) {
      if (n >= 0 && n <= 6) return n;
      if (n >= 1 && n <= 7) {
        // mapping B: shift by -1 (1->0, 2->1, ..., 7->6)
        return ((n + 6) % 7 + 7) % 7;
      }
      return n;
    }
    // try string names (case-insensitive, first 3 letters)
    const s = String(d).toLowerCase().slice(0,3);
    const idx = DIAS_SEMANA.findIndex(x => x.toLowerCase().slice(0,3) === s);
    return idx !== -1 ? idx : d;
  };

  // Obtém matérias disponíveis para o semestre atual
  const getMateriasDisponiveis = () => {
    const materiasDoSemestre = materiasPorSemestre[semestreAtual] || [];
    const materiasAnteriores = [];

    for (let i = 1; i < semestreAtual; i++) {
      const materias = materiasPorSemestre[i] || [];
      materias.forEach(m => {
        if (!materiasAprovadas.includes(m.codigo)) {
          materiasAnteriores.push({ ...m, semestreOriginal: i });
        }
      });
    }

    // Show all eletivas (even if prerequisites are not met). The card will display 'Falta: ...'
    const eletivasDisponiveis = mostrarEletivas ? (Array.isArray(eletivas) ? eletivas.filter(e => !materiasAprovadas.includes(e.codigo)) : []) : [];

    return {
      obrigatorias: materiasDoSemestre.filter(m => !materiasAprovadas.includes(m.codigo)),
      pendentes: materiasAnteriores,
      eletivas: eletivasDisponiveis
    };
  };

  const getCorMateria = (codigo) => {
    const keys = Object.keys(materiasNoCalendario);
    const index = keys.indexOf(codigo);
    if (index === -1) {
      return CORES_MATERIAS[keys.length % CORES_MATERIAS.length];
    }
    return CORES_MATERIAS[index % CORES_MATERIAS.length];
  };

  const getCorTurma = (index) => {
    return CORES_TURMAS[index % CORES_TURMAS.length];
  };

  // Verifica se uma célula está ocupada por alguma matéria já adicionada
  const getMateriasEmCelula = (horarioIdx, diaIdx) => {
    const hora = baseHour + horarioIdx;
    const found = [];
    for (const [codigo, materiaData] of Object.entries(materiasNoCalendario)) {
      // If materia has an assigned ANP slot, map it to the corresponding saturday row
      if (materiaData.anpSlot && diaIdx === SATURDAY_INDEX) {
        const slotIdx = mapAnpSlotToHorarioIdx(materiaData.anpSlot, baseHour);
        if (slotIdx === horarioIdx) {
          found.push({ ...materiaData, codigo });
        }
        continue; // ignore declared saturday horarios for ANP -- they're shown using slot
      }

      for (const h of (materiaData.horarios || [])) {
        if (!h) continue;
        const hd = normalizeDia(h.dia);
        const hStart = parseHour(h.inicio);
        const hEnd = parseHour(h.fim);
        if (hd === diaIdx && !Number.isNaN(hStart) && !Number.isNaN(hEnd) && hora >= hStart && hora < hEnd) {
          found.push({ ...materiaData, codigo });
          break; // avoid duplicate push for same materia
        }
      }
    }
    return found; // possivelmente array vazia
  };

  // Verifica se os horários de uma turma conflitam com matérias já no calendário
  // verificarConflito now accepts a 'turma' object so we can detect ANP-style turmas
  const verificarConflito = (turma) => {
    // If turma is ANP (has anp flag or only saturday horários) => treat specially
    const isAnp = isAnpTurma(turma);
    if (isAnp) {
      // find first available ANP slot
      const slot = findFirstAvailableAnpSlot(materiasNoCalendario);
      if (slot === null) return { temConflito: true, mensagem: 'Sem slots ANP disponíveis' };
      return { temConflito: false, suggestedAnpSlot: slot };
    }

    // non-ANP: normal conflict detection across all existing materias
    for (const horario of turma.horarios || []) {
      const hdHorario = normalizeDia(horario.dia);
      const inicioHorario = parseHour(horario.inicio);
      const fimHorario = parseHour(horario.fim);
      if (Number.isNaN(inicioHorario) || Number.isNaN(fimHorario)) continue;
      for (let hora = inicioHorario; hora < fimHorario; hora++) {
        for (const materia of Object.values(materiasNoCalendario)) {
          // existing materia may have anpSlot -- treat it as occupying a specific saturday row
          for (const h of (materia.horarios || [])) {
            const hd = normalizeDia(h.dia);
            // if existing materia has anpSlot and checking saturday, map to pseudo-hour range
            if (hd === SATURDAY_INDEX && materia.anpSlot) {
              const slotIdx = mapAnpSlotToHorarioIdx(materia.anpSlot, baseHour);
              const slotStart = baseHour + slotIdx;
              const slotEnd = slotStart + 1;
              if (hdHorario === SATURDAY_INDEX && hora >= slotStart && hora < slotEnd) {
                return { temConflito: true, materiaConflito: materia.nome };
              }
              continue; // skip normal saturday horario comparison for this existing materia
            }

            const hStart = parseHour(h.inicio);
            const hEnd = parseHour(h.fim);
            if (hd === hdHorario && !Number.isNaN(hStart) && !Number.isNaN(hEnd) && hora >= hStart && hora < hEnd) {
              return { temConflito: true, materiaConflito: materia.nome };
            }
          }
        }
      }
    }
    return { temConflito: false };
  };

  // Verifica em qual turma a célula pertence (durante o drag)
  const getTurmaIndexParaCelula = (horarioIdx, diaIdx) => {
    if (!draggingMateria) return -1;
    const hora = baseHour + horarioIdx;

    for (let i = 0; i < draggingMateria.turmas.length; i++) {
      const turma = draggingMateria.turmas[i];
      // If turma is ANP and we're hovering a saturday cell, accept: we'll map to ANP slot row
      const turmaIsAnp = isAnpTurma(turma);
      if (turmaIsAnp && diaIdx === SATURDAY_INDEX) {
        // highlight only the row that corresponds to the first available slot
        const slot = findFirstAvailableAnpSlot(materiasNoCalendario);
        const slotRow = slot ? mapAnpSlotToHorarioIdx(slot, baseHour) : null;
        if (slotRow === horarioIdx) return i;
        continue;
      }

      for (const h of (turma.horarios || [])) {
        const hd = normalizeDia(h.dia);
        const hStart = parseHour(h.inicio);
        const hEnd = parseHour(h.fim);
        if (hd === diaIdx && !Number.isNaN(hStart) && !Number.isNaN(hEnd) && hora >= hStart && hora < hEnd) {
          return i;
        }
      }
    }
    return -1;
  };

  // Inicia o drag
  const handleDragStart = async (e, materia) => {
    // Use detailed prereq check
    const det = verificarPreRequisitosDetalhada(materia, materiasAprovadas, materiasNoCalendario);

    // If missing forte prerequisites -> block
    if (det.faltandoForte && det.faltandoForte.length > 0) {
      triggerToast(`Pré-requisitos fortes faltando: ${det.faltandoForte.map(f => getNomeMateria(f)).join(', ')}`, 'error');
      return; // block
    }

    // If missing coreq -> block and show notification (yellow border)
    if (det.faltandoCoreq && det.faltandoCoreq.length > 0) {
      triggerToast(`Co-requisito(s) necessários: ${det.faltandoCoreq.map(f => getNomeMateria(f)).join(', ')}`, 'warn');
      return;
    }

    // If missing minimo prerequisites -> filter out those already confirmed; if remaining, open the confirm modal
    const faltandoMinimoRaw = det.faltandoMinimo || [];
    const faltandoMinimoAtivos = faltandoMinimoRaw.filter(pr => !materiasMinimoConfirmadas.includes(pr));
    if (faltandoMinimoAtivos.length > 0) {
      // open modal to confirm the first missing minimo prereq
      openMinimoConfirm(faltandoMinimoAtivos[0], materia.codigo);
      // stop drag flow; user must confirm then try again
      triggerToast(`Confirme o pré-requisito mínimo ${getNomeMateria(faltandoMinimoAtivos[0])} para destravar esta matéria.`, 'info');
      return;
    }

    if (materiasNoCalendario[materia.codigo]) {
      return;
    }

    // Prevent default mouse behavior early
    e.preventDefault();

    // credit limit checks (before enabling drag state)
    const currentTotal = calcTotalCreditos();
    const materiaCred = materia.creditos || 0;
    if (currentTotal >= CREDIT_MAX) {
      triggerToast(`Limite de créditos atingido (${CREDIT_MAX}). Remova matérias para adicionar mais.`, 'error');
      return;
    }
    if (currentTotal + materiaCred > CREDIT_MAX) {
      triggerToast('Adicionar esta matéria excederia o limite de 32 créditos.', 'error');
      return;
    }

    // Now enable dragging state
    setDraggingMateria(materia);
    setIsDragging(true);
    setDragPosition({ x: e.clientX, y: e.clientY });
    setSelectedTurmaIndex(null);
  };

  // Durante o drag
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  // Quando passa o mouse sobre uma célula do calendário
  const handleCellHover = (horarioIdx, diaIdx) => {
    if (!isDragging || !draggingMateria) return;

    const turmaIndex = getTurmaIndexParaCelula(horarioIdx, diaIdx);
    if (turmaIndex !== -1) {
      setSelectedTurmaIndex(turmaIndex);
    }
  };

  // Finaliza o drag
  const handleMouseUp = (e) => {
    if (!isDragging || !draggingMateria) {
      resetDrag();
      return;
    }

    // Verifica se soltou dentro do calendário
    const calendarTable = calendarTableRef.current;
    if (calendarTable) {
      const rect = calendarTable.getBoundingClientRect();
      const isInsideCalendar =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (isInsideCalendar) {
        // If user hasn't hovered/select a turma, compute target cell from mouse coords
        let turmaIdxToUse = selectedTurmaIndex;
        let targetHorarioIdx = null;
        let targetDiaIdx = null;

        if (turmaIdxToUse === null) {
          try {
            const thead = calendarTable.querySelector('thead');
            const tbody = calendarTable.querySelector('tbody');
            const headerCells = Array.from(thead.querySelectorAll('th'));

            // find which header cell contains the x
            let foundHeaderIndex = headerCells.findIndex(h => {
              const hr = h.getBoundingClientRect();
              return e.clientX >= hr.left && e.clientX <= hr.right;
            });

            if (foundHeaderIndex === -1) {
              // fallback: compute approximate column by proportion
              const timeCol = headerCells[0];
              const timeW = timeCol ? timeCol.getBoundingClientRect().width : rect.width * 0.12;
              const relativeX = e.clientX - rect.left - timeW;
              const contentW = rect.width - timeW;
              const approxCol = Math.floor((relativeX / contentW) * DIAS_SEMANA.length);
              foundHeaderIndex = approxCol + 1; // +1 because headerCells includes time column
            }

            // map header index to day index (header 0 = time column)
            const dayIndex = Math.max(0, foundHeaderIndex - 1);

            // compute row index inside tbody
            const tbodyRect = tbody.getBoundingClientRect();
            const rowHeight = tbodyRect.height / Math.max(1, horarios.length);
            const yInBody = e.clientY - tbodyRect.top;
            targetHorarioIdx = Math.min(horarios.length - 1, Math.max(0, Math.floor(yInBody / rowHeight)));
            targetDiaIdx = dayIndex;

            // attempt to find turma index for that cell
            const computedTurmaIndex = getTurmaIndexParaCelula(targetHorarioIdx, targetDiaIdx);
            if (computedTurmaIndex !== -1) {
              turmaIdxToUse = computedTurmaIndex;
            } else if (targetDiaIdx === SATURDAY_INDEX) {
              // saturday fallback: pick first ANP turma if any
              const anpIdx = (draggingMateria.turmas || []).findIndex(t => isAnpTurma(t));
              if (anpIdx !== -1) turmaIdxToUse = anpIdx;
            }
          } catch (err) {
            // parsing failed; leave turmaIdxToUse as null
            // console.warn('could not compute cell from mouse coords', err);
          }
        }

        // If we have a resolved turma index, proceed like before
        if (turmaIdxToUse !== null && turmaIdxToUse !== -1) {
          const turma = draggingMateria.turmas[turmaIdxToUse];

          // If we computed a concrete target cell, ensure it's empty (no overlapping cell item)
          if (typeof targetHorarioIdx === 'number' && typeof targetDiaIdx === 'number') {
            const ocupadas = getMateriasEmCelula(targetHorarioIdx, targetDiaIdx);
            if (ocupadas && ocupadas.length > 0) {
              triggerToast('Horário já ocupado por outra matéria.', 'error');
              resetDrag();
              return;
            }
          }

          const conflitResult = verificarConflito(turma);
          const temConflito = conflitResult.temConflito;
          const materiaConflito = conflitResult.materiaConflito || conflitResult.mensagem;

          if (temConflito) {
            triggerToast(`Conflito de horário com ${materiaConflito}!`, 'error');
          } else {
            // credit limit check before adding
            const currentTotal = calcTotalCreditos();
            const materiaCred = draggingMateria.creditos || 0;
            if (currentTotal >= CREDIT_MAX) {
              triggerToast(`Limite de créditos atingido (${CREDIT_MAX}). Remova matérias para adicionar mais.`, 'error');
            } else if (currentTotal + materiaCred > CREDIT_MAX) {
              triggerToast('Adicionar esta matéria excederia o limite de 32 créditos.', 'error');
            } else {
              const isTurmaAnp = isAnpTurma(turma);
              if (isTurmaAnp) {
                const slot = conflitResult.suggestedAnpSlot || findFirstAvailableAnpSlot(materiasNoCalendario);
                if (!slot) {
                  triggerToast('Sem vagas ANP disponíveis no sábado.', 'error');
                } else {
                  const added = onAddMateria({
                    ...draggingMateria,
                    turmaId: turma.id,
                    horarios: turma.horarios,
                    anpSlot: slot
                  });
                  if (!added) {
                    triggerToast('Não foi possível adicionar a matéria (conflito ou limite).', 'error');
                  }
                }
              } else {
                const added = onAddMateria({
                  ...draggingMateria,
                  turmaId: turma.id,
                  horarios: turma.horarios
                });
                if (!added) {
                  triggerToast('Não foi possível adicionar a matéria (conflito ou limite).', 'error');
                }
              }
            }
          }
        }
      }
    }

    resetDrag();
  };

  const resetDrag = () => {
    setDraggingMateria(null);
    setIsDragging(false);
    setSelectedTurmaIndex(null);
  };

  // Verifica se uma célula faz parte de alguma turma da matéria sendo arrastada
  const getCellPreviewInfo = (horarioIdx, diaIdx) => {
    if (!isDragging || !draggingMateria) return null;

    const hora = baseHour + horarioIdx;
    const materiasExistentes = getMateriasEmCelula(horarioIdx, diaIdx);

    for (let i = 0; i < draggingMateria.turmas.length; i++) {
      const turma = draggingMateria.turmas[i];
      // ANP handling: if turma is ANP and we're on saturday column, preview only on the first available ANP slot row
      const turmaIsAnp = isAnpTurma(turma);
      if (turmaIsAnp && diaIdx === SATURDAY_INDEX) {
        const slot = findFirstAvailableAnpSlot(materiasNoCalendario);
        if (!slot) return { turmaIndex: i, turmaId: turma.id, cor: getCorTurma(i), isSelected: false, hasConflict: true };
        const slotRow = mapAnpSlotToHorarioIdx(slot, baseHour);
        const { temConflito } = verificarConflito(turma);
        return {
          turmaIndex: i,
          turmaId: turma.id,
          cor: getCorTurma(i),
          isSelected: selectedTurmaIndex === i && slotRow === horarioIdx,
          hasConflict: temConflito || (materiasExistentes.length > 0)
        };
      }

      for (const h of (turma.horarios || [])) {
        const hd = normalizeDia(h.dia);
        const hStart = parseHour(h.inicio);
        const hEnd = parseHour(h.fim);
        if (hd === diaIdx && !Number.isNaN(hStart) && !Number.isNaN(hEnd) && hora >= hStart && hora < hEnd) {
          const { temConflito } = verificarConflito(turma);
          return {
            turmaIndex: i,
            turmaId: turma.id,
            cor: getCorTurma(i),
            isSelected: selectedTurmaIndex === i,
            hasConflict: temConflito || (materiasExistentes.length > 0)
          };
        }
      }
    }
    return null;
  };

  // ---------- Export to Google Calendar (.ics) helpers temporarily disabled ----------
  // Export functionality removed for now (unused) to avoid linting/CI failures.

  const totalCreditos = calcTotalCreditos();
  let creditClass = '';
  if (totalCreditos >= CREDIT_MAX) creditClass = 'calendar__credits--danger';
  else if (totalCreditos > CREDIT_WARN) creditClass = 'calendar__credits--warn';
  const { obrigatorias, pendentes, eletivas: eletivasDisponiveis } = getMateriasDisponiveis();

  const renderMateriaCard = (materia, tipo = 'obrigatoria') => {
    const jaNoCalendario = materiasNoCalendario[materia.codigo];
    const det = verificarPreRequisitosDetalhada(materia, materiasAprovadas, materiasNoCalendario);
    // filter minimo prereqs using confirmed list so confirmed mínimo prereqs are ignored
    const faltandoForte = det.faltandoForte || [];
    const faltandoMinimoRaw = det.faltandoMinimo || [];
    const faltandoMinimo = faltandoMinimoRaw.filter(pr => !materiasMinimoConfirmadas.includes(pr));
    const faltandoCoreq = det.faltandoCoreq || [];
    // If only faltandoMinimo remain but they've been confirmed, consider the materia "destravada" (cumpridoAdjusted)
    const cumpridoAdjusted = (faltandoForte.length === 0) && (faltandoCoreq.length === 0) && (faltandoMinimo.length === 0);

    const isBeingDragged = isDragging && draggingMateria?.codigo === materia.codigo;

    if (jaNoCalendario) return null;

    const cardClasses = [
      'materia-card',
      tipo === 'pendente' && 'materia-card--pending',
      tipo === 'eletiva' && 'materia-card--elective',
      !cumpridoAdjusted && 'materia-card--blocked',
      isBeingDragged && 'materia-card--dragging-origin'
    ].filter(Boolean).join(' ');

    // determine visual indicator color for missing type
    let missingBadge = null;
    if (faltandoForte.length > 0) missingBadge = { color: 'red', text: `Falta: ${faltandoForte.map(f => getNomeMateria(f)).join(', ')}` };
    else if (faltandoMinimo.length > 0) missingBadge = { color: 'orange', text: `Mínimo: ${faltandoMinimo.map(f => getNomeMateria(f)).join(', ')}` };
    else if (faltandoCoreq.length > 0) missingBadge = { color: '#F9DC5C', text: `Co-req: ${faltandoCoreq.map(f => getNomeMateria(f)).join(', ')}` };

    return (
      <div
        key={materia.codigo}
        className={cardClasses}
        onMouseDown={(e) => cumpridoAdjusted && handleDragStart(e, materia)}
        style={{
          borderLeftColor: getCorMateria(materia.codigo),
          cursor: cumpridoAdjusted ? 'grab' : 'not-allowed'
        }}
      >
        <div className="materia-card__header">
          <span className="materia-card__name">{materia.nome}</span>
          <button
            className="materia-card__info-btn"
            onClick={(ev) => {
              ev.stopPropagation();
              onMateriaClick?.(materia);
            }}
            title="Ver informações"
          >
            <i className="fi fi-br-menu-dots-vertical"></i>
          </button>
        </div>
        <div className="materia-card__details">
          <span className="materia-card__code">{materia.codigo}</span>
          <span className="materia-card__credits">{materia.creditos} Créditos</span>
          <span className="materia-card__turmas-count">{(materia.turmas||[]).length} turma{(materia.turmas||[]).length > 1 ? 's' : ''}</span>
        </div>

        {tipo === 'pendente' && materia.semestreOriginal && (
          <span className="materia-card__semester-badge">{materia.semestreOriginal}º Sem</span>
        )}

        {/** show blocked info only when not cumpridoAdjusted */}
        {!cumpridoAdjusted && missingBadge && (
          <div className="materia-card__blocked-info" style={{ borderColor: missingBadge.color, color: missingBadge.color }}>
            <i className="fi fi-br-lock"></i>
            <div>{missingBadge.text}</div>
            {/* If it's a 'minimo' requirement, show the add button on its own row for spacing */}
            {faltandoMinimo.length > 0 && faltandoForte.length === 0 && (
              <div className="materia-card__minimo-actions">
                <button
                  className="materia-card__minimo-btn"
                  onClick={(ev) => { ev.stopPropagation(); openMinimoConfirm(String(faltandoMinimo[0]), materia.codigo); }}
                  title="Confirmar que cursou e obteve média mínima"
                >
                  Adicionar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const openMinimoConfirm = (prereq, parent) => {
    // accept prereq as code string or object { codigo }
    const code = prereq && typeof prereq === 'object' ? (prereq.codigo || prereq.id || '') : String(prereq || '');
    setMinimoModal({ open: true, prereq: code, parent });
  };
  const closeMinimoConfirm = () => setMinimoModal({ open: false, prereq: null, parent: null });

  const confirmMinimo = () => {
    const prereq = minimoModal.prereq;
    const codigo = prereq && String(prereq).trim();
    if (codigo) {
      // call parent handler to mark this minimo prereq as confirmed (does NOT mark as aprovado)
      if (typeof onConfirmMinimo === 'function') {
        onConfirmMinimo(codigo);
      } else {
        try {
          const ev = new CustomEvent('gradeufla-confirm-minimo', { detail: { codigo } });
          window.dispatchEvent(ev);
        } catch (e) {}
      }
      triggerToast(`Pré-requisito ${getNomeMateria(codigo) || codigo} será ignorado como "mínimo" (confirmado).`, 'success');
      closeMinimoConfirm();
      return;
    }

    triggerToast('Não foi possível marcar o pré-requisito - tente novamente.', 'error');
    closeMinimoConfirm();
  };

  return (
    <section
      className="calendar"
      ref={ref}
      id="calendario"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <button className="btn-voltar btn-voltar--calendar" onClick={onVoltar}>
        <i className="fi fi-br-arrow-left"></i>
        <span className="btn-voltar__text">Voltar</span>
      </button>

      <div className="calendar__layout">
        {/* Sidebar de matérias */}
        <div className="calendar__sidebar">
          <div className="calendar__sidebar-header">
            <h3 className="calendar__sidebar-title">
              <i className="fi fi-br-book-alt"></i>
              <span className="calendar__sidebar-title-text">Matérias Disponíveis</span>
            </h3>
            <div className={`calendar__credits ${creditClass}`}>
              <span>Créditos: <strong>{totalCreditos}</strong></span>
            </div>
          </div>

          <p className="calendar__instructions">
            Arraste uma matéria e solte no horário desejado
          </p>

          {/* Matérias Obrigatórias */}
          <div className="calendar__category">
            <h4 className="calendar__category-title">
              <i className="fi fi-br-bookmark calendar__category-icon"></i>
              Obrigatórias
            </h4>
            <div className="calendar__materias">
              {obrigatorias.map(materia => renderMateriaCard(materia, 'obrigatoria'))}
            </div>
          </div>

          {/* Matérias Pendentes de Semestres Anteriores */}
          {pendentes.length > 0 && (
            <div className="calendar__category">
              <h4 className="calendar__category-title calendar__category-title--pending">
                <i className="fi fi-br-triangle-warning calendar__category-icon"></i>
                Pendentes (Anteriores)
              </h4>
              <div className="calendar__materias">
                {pendentes.map(materia => renderMateriaCard(materia, 'pendente'))}
              </div>
            </div>
          )}

          {/* Toggle Eletivas */}
          <div className="calendar__category">
            <button
              className="calendar__electives-toggle"
              onClick={() => {
                const next = !mostrarEletivas;
                setMostrarEletivas(next);
                setMostrarFuturas(false);
                if (!next) setEletivasQuery(''); // clear search when closing
              }}
            >
              <i className="fi fi-br-bullseye-pointer calendar__category-icon"></i>
              <span>Eletivas</span>
              <i className={`fi fi-br-angle-${mostrarEletivas ? 'down' : 'right'} calendar__toggle-icon`}></i>
            </button>

            {mostrarEletivas && (
              <div className="calendar__materias" style={{ marginTop: '10px' }}>
                <input
                  type="text"
                  className="calendar__eletivas-search"
                  placeholder="Pesquisar eletivas..."
                  value={eletivasQuery}
                  onChange={(e) => setEletivasQuery(e.target.value)}
                  style={{ marginBottom: '10px' }}
                />
                {eletivasDisponiveis.length === 0 ? (
                  <p className="calendar__no-electives">
                    Nenhuma eletiva disponível.
                  </p>
                ) : (
                  (() => {
                    // group by subgrupo string coming from CSV (use exact label in CSV)
                    const groups = eletivasDisponiveis.reduce((acc, m) => {
                      const raw = (m.subgrupo || 'Outros').toString().trim();
                      const key = raw || 'Outros';
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(m);
                      return acc;
                    }, {});

                    // order keys so consistent display (you can customize order later)
                    const orderedKeys = Object.keys(groups).sort((a,b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

                    return orderedKeys.map(key => {
                      const label = key.toString();
                      // show the raw label; hide the title if it's just 'Outros'
                      const title = label;
                      const filteredMaterias = groups[key].filter(materia => materia.nome.toLowerCase().includes(eletivasQuery.toLowerCase()));
                      if (filteredMaterias.length === 0) return null; // skip empty groups

                      return (
                        <div key={key} className="calendar__eletiva-group">
                          {label.toLowerCase() !== 'outros' && (
                            <h5 className="calendar__eletiva-group-title">{title}</h5>
                          )}
                          <div className="calendar__eletiva-group-list">
                            {filteredMaterias.map(materia => renderMateriaCard(materia, 'eletiva'))}
                          </div>
                        </div>
                      );
                    });
                  })()
                 )}
               </div>
             )}

             {/* Toggle Matérias Futuras */}
             <button
               className="calendar__futuras-toggle"
               onClick={() => {
                 const next = !mostrarFuturas;
                 setMostrarFuturas(next);
                 setMostrarEletivas(false);
                 if (!next) setFuturasQuery(''); // clear search when closing
               }}
               style={{ marginTop: '12px' }}
             >
               <i className="fi fi-br-rocket calendar__category-icon"></i>
               <span>Matérias Futuras</span>
               <i className={`fi fi-br-angle-${mostrarFuturas ? 'down' : 'right'} calendar__toggle-icon`}></i>
             </button>

             {mostrarFuturas && (
               <div className="calendar__materias" style={{ marginTop: '10px' }}>
                 <input
                   type="text"
                   className="calendar__eletivas-search"
                   placeholder="Pesquisar matérias futuras..."
                   value={futurasQuery}
                   onChange={(e) => setFuturasQuery(e.target.value)}
                   style={{ marginBottom: '10px' }}
                 />
                 {(() => {
                   const startSem = Number(semestreAtual) || 1;
                   // collect materias only from semesters strictly greater than current
                   const grupos = {};
                   Object.keys(materiasPorSemestre)
                     .map(k => Number(k))
                     .filter(kNum => !Number.isNaN(kNum) && kNum > startSem)
                     .sort((a, b) => a - b)
                     .forEach(kNum => {
                       const list = materiasPorSemestre[kNum] || [];
                       const filtered = list.filter(m => !materiasAprovadas.includes(m.codigo) && !materiasNoCalendario[m.codigo]);
                       if (filtered.length > 0) grupos[kNum] = filtered;
                     });

                   if (Object.keys(grupos).length === 0) {
                     return <p className="calendar__no-electives">Nenhuma matéria futura disponível.</p>;
                   }

                   // filter each group's materias by futurasQuery (search by name or code)
                   return Object.keys(grupos).sort((a,b)=>Number(a)-Number(b)).map(key => {
                     const sem = Number(key);
                     const lista = grupos[key];
                     const query = (futurasQuery || '').toLowerCase().trim();
                     const filteredLista = query
                       ? lista.filter(m => (m.nome || '').toLowerCase().includes(query) || (m.codigo || '').toLowerCase().includes(query))
                       : lista;
                     if (filteredLista.length === 0) return null;
                     return (
                       <div key={key} className="calendar__eletiva-group">
                         <h5 className="calendar__eletiva-group-title">{sem}º Semestre</h5>
                         <div className="calendar__eletiva-group-list">
                           {filteredLista.map(materia => renderMateriaCard(materia, 'futura'))}
                         </div>
                       </div>
                     );
                   });
                 })()}
               </div>
             )}
           </div>
        </div>

        {/* Calendário */}
        <div className="calendar__wrapper" ref={wrapperRef}>
           <div className="calendar__title-container">
             <h2 className="calendar__title">Sua Grade - {semestreAtual}º Semestre</h2>

             {/* Download PNG button */}
             <button className="calendar__download" onClick={handleDownloadPNG} title="Baixar PNG da grade">
               <i className="fi fi-br-download" aria-hidden="true" />
             </button>

            {/* Popup flutuante - Legenda das turmas durante o drag */}
            {isDragging && draggingMateria && (
              <div className="calendar__turmas-popup">
                <span className="calendar__turmas-popup-title">Escolha uma turma:</span>
                <div className="calendar__turmas-popup-items">
                  {(draggingMateria.turmas || []).map((turma, index) => {
                    const { temConflito } = verificarConflito(turma);
                    return (
                      <div
                        key={turma.id}
                        className={`calendar__turmas-popup-item ${selectedTurmaIndex === index ? 'calendar__turmas-popup-item--selected' : ''} ${temConflito ? 'calendar__turmas-popup-item--conflito' : ''}`}
                        style={{ borderColor: getCorTurma(index) }}
                      >
                        <span className="calendar__turmas-popup-color" style={{ backgroundColor: getCorTurma(index) }}></span>
                        <span>Turma {turma.id}</span>
                        {temConflito && <i className="fi fi-br-triangle-warning calendar__turmas-popup-conflito"></i>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="calendar__container">
            <table className="calendar__table" ref={calendarTableRef}>
              <thead>
                <tr>
                  <th className="calendar__col-time">Hora</th>
                  {DIAS_SEMANA.map((dia, index) => (
                    <th key={index} className="calendar__col-day">{dia}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {horarios.map((horario, indexHora) => (
                  <tr key={indexHora}>
                    <td className="calendar__cell-time">{horario}</td>
                    {DIAS_SEMANA.map((_, indexDia) => {
                      const materiasEmCelula = getMateriasEmCelula(indexHora, indexDia);
                      const previewInfo = getCellPreviewInfo(indexHora, indexDia);

                      const cellClasses = [
                        'calendar__cell',
                        materiasEmCelula.length > 0 && 'calendar__cell--has-subject',
                        previewInfo && !previewInfo.hasConflict && 'calendar__cell--preview',
                        previewInfo?.hasConflict && 'calendar__cell--preview-conflito',
                        previewInfo?.isSelected && 'calendar__cell--preview-selected'
                      ].filter(Boolean).join(' ');

                      return (
                        <td
                          key={indexDia}
                          className={cellClasses}
                          style={
                            materiasEmCelula.length > 0
                              ? { backgroundColor: getCorMateria(materiasEmCelula[0].codigo) }
                              : previewInfo
                                ? {
                                    backgroundColor: previewInfo.hasConflict
                                      ? 'rgba(232, 72, 85, 0.2)'
                                      : `${previewInfo.cor}33`,
                                    borderColor: previewInfo.cor
                                  }
                                : {}
                          }
                          onClick={(e) => {
                            // If there is at least one subject in this cell, clicking the cell opens the modal for that subject.
                            if (materiasEmCelula && materiasEmCelula.length > 0) {
                              e.stopPropagation();
                              onMateriaClick?.(materiasEmCelula[0]);
                            }
                          }
                          }
                          onMouseEnter={() => handleCellHover(indexHora, indexDia)}
                        >
                          {materiasEmCelula.length > 0 && (
                            <div className="calendar__cell-subjects">
                              {materiasEmCelula.map((mec) => (
                                <div
                                  key={mec.codigo}
                                  className="calendar__cell-subject"
                                  // Keep the subject block clickable as well; remove button stops propagation
                                  onClick={(e) => { e.stopPropagation(); onMateriaClick?.(mec); }}
                                >
                                  <span className="calendar__cell-subject-name">{mec.nome}</span>
                                  <button
                                    className="calendar__cell-remove"
                                    onClick={(ev) => { ev.stopPropagation(); onRemoveMateria(mec.codigo); }}
                                    title="Remover matéria"
                                  >
                                    <i className="fi fi-br-cross-small"></i>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          {previewInfo && !(materiasEmCelula && materiasEmCelula.length) && (
                            <div
                              className="calendar__cell-preview-content"
                              style={{ color: previewInfo.cor }}
                            >
                              {/* preview of turma removed per request */}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="calendar__legend">
            {Object.entries(materiasNoCalendario).map(([codigo, m]) => (
              <div key={codigo} className="calendar__legend-item">
                <span className="calendar__legend-color" style={{ backgroundColor: getCorMateria(codigo) }}></span>
                <span className="calendar__legend-text">{m.nome}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Elemento flutuante durante o drag */}
      {isDragging && draggingMateria && (
        <div
          className="drag-ghost"
          style={{
            left: dragPosition.x - 80,
            top: dragPosition.y - 25,
            backgroundColor: getCorMateria(draggingMateria.codigo)
          }}
        >
          <span>{draggingMateria.nome}</span>
        </div>
      )}

      {/* Modal for minimo confirm */}
      {minimoModal.open && (
        <div className="minimo-modal-overlay" onClick={closeMinimoConfirm}>
          <div className="minimo-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmação - Pré-requisito Mínimo</h3>
            <p>Você já cursou <strong>{getNomeMateria(minimoModal.prereq)}</strong> sem ter sido reprovado por frequência e obteve média final mínima (≥ 50 pontos)?</p>
            <div className="minimo-modal-actions">
              <button className="btn btn-secondary" onClick={closeMinimoConfirm}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmMinimo}>Sim, destravar materia</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
});

Calendar.displayName = 'Calendar';

export default Calendar;
