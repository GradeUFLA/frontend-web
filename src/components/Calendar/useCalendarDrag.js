import { useEffect, useMemo, useRef, useState } from 'react';
import { verificarPreRequisitosDetalhada } from '../../data';
import {
  calcularTotalAposSelecao,
  calcularTotalCreditos,
  CREDIT_MAX,
  verificarConflitoMateria
} from '../../domain/gradeRules';
import {
  DIAS_SEMANA,
  SATURDAY_INDEX,
  findNextAnpHour,
  getCorTurma,
  isAnpTurma,
  normalizeDia,
  parseHour
} from './calendarUtils';

const BASE_HOUR = 7;

const getPointerPosition = event => ({
  x: event.changedTouches?.[0]?.clientX ?? event.touches?.[0]?.clientX ?? event.clientX,
  y: event.changedTouches?.[0]?.clientY ?? event.touches?.[0]?.clientY ?? event.clientY
});

const isPointInside = (x, y, rect) => (
  x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
);

export const buildCalendarOccupancy = (materiasNoCalendario, baseHour = BASE_HOUR) => {
  const occupancy = new Map();
  const addToCell = (dia, hora, materia, codigo) => {
    const key = `${dia}:${hora}`;
    const current = occupancy.get(key) || [];
    if (!current.some(item => item.codigo === codigo)) {
      current.push({ ...materia, codigo });
      occupancy.set(key, current);
    }
  };

  Object.entries(materiasNoCalendario).forEach(([codigo, materia]) => {
    if (materia.anp && materia.anpHour != null) {
      addToCell(SATURDAY_INDEX, materia.anpHour, materia, codigo);
    }

    (materia.horarios || []).forEach(horario => {
      if (!horario) return;
      const dia = normalizeDia(horario.dia);
      const inicio = parseHour(horario.inicio);
      const fim = parseHour(horario.fim);
      if (dia === null || Number.isNaN(inicio) || Number.isNaN(fim)) return;
      if (materia.anp && dia === SATURDAY_INDEX) return;

      for (let hora = baseHour; hora < 24; hora++) {
        if (hora >= inicio && hora < fim) addToCell(dia, hora, materia, codigo);
      }
    });
  });

  return occupancy;
};

export const resolveTurmaIndexParaCelula = ({
  materia,
  horarioIdx,
  diaIdx,
  materiasNoCalendario,
  baseHour = BASE_HOUR
}) => {
  if (!materia) return -1;
  const hora = baseHour + horarioIdx;

  for (let index = 0; index < (materia.turmas || []).length; index++) {
    const turma = materia.turmas[index];
    if (isAnpTurma(turma) && diaIdx === SATURDAY_INDEX) {
      if (findNextAnpHour(materiasNoCalendario, {
        ignorarCodigo: materia.codigo
      }) === hora) return index;
      continue;
    }

    for (const horario of (turma.horarios || [])) {
      const dia = normalizeDia(horario.dia);
      const inicio = parseHour(horario.inicio);
      const fim = parseHour(horario.fim);
      if (dia === diaIdx && !Number.isNaN(inicio) && !Number.isNaN(fim) && hora >= inicio && hora < fim) {
        return index;
      }
    }
  }
  return -1;
};

const getTargetCell = (calendarTable, clientX, clientY, horarios) => {
  const rect = calendarTable.getBoundingClientRect();
  const thead = calendarTable.querySelector('thead');
  const tbody = calendarTable.querySelector('tbody');
  const headerCells = Array.from(thead.querySelectorAll('th'));
  let headerIndex = headerCells.findIndex(header => {
    const headerRect = header.getBoundingClientRect();
    return clientX >= headerRect.left && clientX <= headerRect.right;
  });

  if (headerIndex === -1) {
    const timeColumn = headerCells[0];
    const timeWidth = timeColumn ? timeColumn.getBoundingClientRect().width : rect.width * 0.12;
    const relativeX = clientX - rect.left - timeWidth;
    const contentWidth = rect.width - timeWidth;
    headerIndex = Math.floor((relativeX / contentWidth) * DIAS_SEMANA.length) + 1;
  }

  const tbodyRect = tbody.getBoundingClientRect();
  const rowHeight = tbodyRect.height / Math.max(1, horarios.length);
  return {
    diaIdx: Math.max(0, headerIndex - 1),
    horarioIdx: Math.min(
      horarios.length - 1,
      Math.max(0, Math.floor((clientY - tbodyRect.top) / rowHeight))
    )
  };
};

export default function useCalendarDrag({
  allMateriasList,
  materiasNoCalendario,
  materiasAprovadas,
  materiasMinimoConfirmadas,
  onAddMateria,
  onRemoveMateria,
  triggerToast,
  calendarTableRef,
  horarios
}) {
  const [shakeErrorMateria, setShakeErrorMateria] = useState(null);
  const [draggingMateria, setDraggingMateria] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTurmaIndex, setSelectedTurmaIndex] = useState(null);
  const [draggingFromCalendar, setDraggingFromCalendar] = useState(false);
  const dragFinishedRef = useRef(false);
  const dragGhostRef = useRef(null);
  const dragAnimationFrameRef = useRef(null);
  const pendingDragPositionRef = useRef({ x: 0, y: 0 });

  const moveDragGhost = (x, y) => {
    pendingDragPositionRef.current = { x, y };
    if (dragAnimationFrameRef.current !== null) return;

    dragAnimationFrameRef.current = requestAnimationFrame(() => {
      dragAnimationFrameRef.current = null;
      const ghost = dragGhostRef.current;
      if (!ghost) return;
      const position = pendingDragPositionRef.current;
      ghost.style.transform = `translate3d(${position.x - 80}px, ${position.y - 25}px, 0) rotate(-2deg)`;
    });
  };

  const cancelDragAnimation = () => {
    if (dragAnimationFrameRef.current === null) return;
    cancelAnimationFrame(dragAnimationFrameRef.current);
    dragAnimationFrameRef.current = null;
  };

  const resetDrag = () => {
    cancelDragAnimation();
    setDraggingMateria(null);
    setIsDragging(false);
    setSelectedTurmaIndex(null);
    setDraggingFromCalendar(false);
  };

  const calendarOccupancy = useMemo(
    () => buildCalendarOccupancy(materiasNoCalendario),
    [materiasNoCalendario]
  );
  const materiasByCodigo = useMemo(() => new Map(
    allMateriasList.map(materia => [materia.codigo, materia])
  ), [allMateriasList]);

  const getMateriasEmCelula = (horarioIdx, diaIdx) => (
    calendarOccupancy.get(`${diaIdx}:${BASE_HOUR + horarioIdx}`) || []
  );

  const verificarConflito = turma => verificarConflitoMateria(
    turma,
    materiasNoCalendario,
    { ignorarCodigo: draggingMateria?.codigo }
  );

  const getTurmaIndexParaCelula = (horarioIdx, diaIdx) => resolveTurmaIndexParaCelula({
    materia: draggingMateria,
    horarioIdx,
    diaIdx,
    materiasNoCalendario
  });

  const handleDragStartFromCalendar = (event, materiaNoCalendario) => {
    event.preventDefault();
    event.stopPropagation();
    const { x, y } = getPointerPosition(event);
    const materiaCompleta = materiasByCodigo.get(materiaNoCalendario.codigo);
    setDraggingMateria(materiaCompleta || materiaNoCalendario);
    setIsDragging(true);
    moveDragGhost(x, y);
    setSelectedTurmaIndex(null);
    setDraggingFromCalendar(true);
    dragFinishedRef.current = false;
  };

  const handleDragStart = async (event, materia) => {
    if (!materia.turmas || materia.turmas.length === 0) {
      setShakeErrorMateria(materia.codigo);
      setTimeout(() => setShakeErrorMateria(null), 600);
      triggerToast('Esta matéria não possui turmas disponíveis no momento.', 'error');
      return;
    }

    const temTurmasComHorarios = materia.turmas.some(turma => (
      turma.anp || (turma.horarios && turma.horarios.length > 0)
    ));
    if (!temTurmasComHorarios) {
      setShakeErrorMateria(materia.codigo);
      setTimeout(() => setShakeErrorMateria(null), 600);
      triggerToast('Esta matéria não possui turmas com horários disponíveis.', 'error');
      return;
    }

    const calendarioComMateria = { ...materiasNoCalendario, [materia.codigo]: materia };
    const detalhes = verificarPreRequisitosDetalhada(
      materia,
      materiasAprovadas,
      calendarioComMateria,
      allMateriasList
    );
    const removerConfirmados = codigos => (codigos || []).filter(
      codigo => !materiasMinimoConfirmadas.includes(codigo)
    );
    if (removerConfirmados(detalhes.faltandoForte).length > 0
      || removerConfirmados(detalhes.faltandoMinimo).length > 0
      || materiasNoCalendario[materia.codigo]) {
      return;
    }

    event.preventDefault();
    const { x, y } = getPointerPosition(event);
    setDraggingMateria(materia);
    setIsDragging(true);
    moveDragGhost(x, y);
    setSelectedTurmaIndex(null);
    setDraggingFromCalendar(false);
    dragFinishedRef.current = false;
  };

  const handleMouseMove = event => {
    if (!isDragging) return;
    const { x, y } = getPointerPosition(event);
    moveDragGhost(x, y);
  };

  const handleCellHover = (horarioIdx, diaIdx) => {
    if (!isDragging || !draggingMateria) return;
    const turmaIndex = getTurmaIndexParaCelula(horarioIdx, diaIdx);
    if (turmaIndex !== -1) setSelectedTurmaIndex(turmaIndex);
  };

  const addTurma = (materia, turma) => onAddMateria({
    ...materia,
    turmaId: turma.id,
    horarios: turma.horarios,
    anp: turma.anp === true,
    turmaAnp: turma.anp === true
  });

  const handleDropFromCalendar = (clientX, clientY) => {
    const sidebar = document.querySelector('.calendar__sidebar');
    if (sidebar && isPointInside(clientX, clientY, sidebar.getBoundingClientRect())) {
      onRemoveMateria(draggingMateria.codigo);
      return;
    }

    const calendarTable = calendarTableRef.current;
    if (!calendarTable || !isPointInside(clientX, clientY, calendarTable.getBoundingClientRect())) return;

    try {
      const { horarioIdx, diaIdx } = getTargetCell(calendarTable, clientX, clientY, horarios);
      const ocupadas = getMateriasEmCelula(horarioIdx, diaIdx);
      if (ocupadas.some(materia => materia.codigo === draggingMateria.codigo)) return;
      if (ocupadas.length > 0) {
        triggerToast('Horário já ocupado por outra matéria.', 'error');
        return;
      }

      const materiaCompleta = materiasByCodigo.get(draggingMateria.codigo);
      if (!materiaCompleta?.turmas) return;
      const turmaIndex = getTurmaIndexParaCelula(horarioIdx, diaIdx);
      if (turmaIndex === -1) return;
      const turma = materiaCompleta.turmas[turmaIndex];
      const conflito = verificarConflito(turma);
      if (conflito.temConflito) {
        triggerToast(`Conflito de horário com ${conflito.materiaConflito || conflito.mensagem}!`, 'error');
        return;
      }
      onRemoveMateria(draggingMateria.codigo);
      addTurma(materiaCompleta, turma);
    } catch (error) {
      triggerToast('Erro ao realocar matéria', 'error');
    }
  };

  const handleDropFromSidebar = (clientX, clientY) => {
    const calendarTable = calendarTableRef.current;
    if (!calendarTable || !isPointInside(clientX, clientY, calendarTable.getBoundingClientRect())) return;

    let turmaIndex = selectedTurmaIndex;
    let targetCell = null;
    if (turmaIndex === null) {
      try {
        targetCell = getTargetCell(calendarTable, clientX, clientY, horarios);
        turmaIndex = getTurmaIndexParaCelula(targetCell.horarioIdx, targetCell.diaIdx);
        if (turmaIndex === -1 && targetCell.diaIdx === SATURDAY_INDEX) {
          turmaIndex = (draggingMateria.turmas || []).findIndex(isAnpTurma);
        }
      } catch (error) {
        turmaIndex = null;
      }
    }

    if (turmaIndex === null || turmaIndex === -1) return;
    const turma = draggingMateria.turmas[turmaIndex];
    if (targetCell && getMateriasEmCelula(targetCell.horarioIdx, targetCell.diaIdx).length > 0) {
      triggerToast('Horário já ocupado por outra matéria.', 'error');
      return;
    }

    const conflito = verificarConflito(turma);
    if (conflito.temConflito) {
      triggerToast(`Conflito de horário com ${conflito.materiaConflito || conflito.mensagem}!`, 'error');
      return;
    }

    const totalAtual = calcularTotalCreditos(materiasNoCalendario);
    const novoTotal = calcularTotalAposSelecao(materiasNoCalendario, draggingMateria);
    if (totalAtual >= CREDIT_MAX) {
      triggerToast(`Limite de créditos atingido (${CREDIT_MAX}). Remova matérias para adicionar mais.`, 'error');
    } else if (novoTotal > CREDIT_MAX) {
      triggerToast('Adicionar esta matéria excederia o limite de 32 créditos.', 'error');
    } else if (!addTurma(draggingMateria, turma)) {
      triggerToast('Não foi possível adicionar a matéria.', 'error');
    }
  };

  const handleMouseUp = event => {
    if (dragFinishedRef.current) return;
    if (!isDragging || !draggingMateria) {
      resetDrag();
      return;
    }

    // O mesmo evento pode passar pelo handler React e pelo listener do document.
    // A trava precisa ser síncrona, pois as atualizações de estado só chegam no render seguinte.
    dragFinishedRef.current = true;
    const { x, y } = getPointerPosition(event);
    if (draggingFromCalendar) handleDropFromCalendar(x, y);
    else handleDropFromSidebar(x, y);
    resetDrag();
  };

  useEffect(() => {
    if (!isDragging) return undefined;
    const handleGlobalMove = event => {
      event.preventDefault();
      const { x, y } = getPointerPosition(event);
      moveDragGhost(x, y);
    };
    const handleGlobalUp = event => handleMouseUp(event);
    const handleGlobalCancel = () => {
      dragFinishedRef.current = true;
      resetDrag();
    };

    document.addEventListener('mousemove', handleGlobalMove, { passive: false });
    document.addEventListener('mouseup', handleGlobalUp);
    document.addEventListener('touchmove', handleGlobalMove, { passive: false });
    document.addEventListener('touchend', handleGlobalUp);
    document.addEventListener('touchcancel', handleGlobalCancel);
    return () => {
      document.removeEventListener('mousemove', handleGlobalMove);
      document.removeEventListener('mouseup', handleGlobalUp);
      document.removeEventListener('touchmove', handleGlobalMove);
      document.removeEventListener('touchend', handleGlobalUp);
      document.removeEventListener('touchcancel', handleGlobalCancel);
    };
    // Os handlers precisam enxergar o estado do render em que o drag foi iniciado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  useEffect(() => () => cancelDragAnimation(), []);

  const getCellPreviewInfo = (horarioIdx, diaIdx) => {
    if (!isDragging || !draggingMateria) return null;
    const hora = BASE_HOUR + horarioIdx;
    const materiasExistentes = getMateriasEmCelula(horarioIdx, diaIdx);

    for (let index = 0; index < (draggingMateria.turmas || []).length; index++) {
      const turma = draggingMateria.turmas[index];
      if (isAnpTurma(turma) && diaIdx === SATURDAY_INDEX) {
        const nextHour = findNextAnpHour(materiasNoCalendario, {
          ignorarCodigo: draggingMateria.codigo
        });
        if (!nextHour) {
          return { turmaIndex: index, turmaId: turma.id, cor: getCorTurma(index), isSelected: false, hasConflict: true };
        }
        if (hora !== nextHour) continue;
        return {
          turmaIndex: index,
          turmaId: turma.id,
          cor: getCorTurma(index),
          isSelected: selectedTurmaIndex === index,
          hasConflict: false
        };
      }

      for (const horario of (turma.horarios || [])) {
        const dia = normalizeDia(horario.dia);
        const inicio = parseHour(horario.inicio);
        const fim = parseHour(horario.fim);
        if (dia === diaIdx && !Number.isNaN(inicio) && !Number.isNaN(fim) && hora >= inicio && hora < fim) {
          return {
            turmaIndex: index,
            turmaId: turma.id,
            cor: getCorTurma(index),
            isSelected: selectedTurmaIndex === index,
            hasConflict: verificarConflito(turma).temConflito || materiasExistentes.length > 0
          };
        }
      }
    }
    return null;
  };

  return {
    draggingMateria,
    dragGhostRef,
    isDragging,
    selectedTurmaIndex,
    draggingFromCalendar,
    shakeErrorMateria,
    handleDragStart,
    handleDragStartFromCalendar,
    handleMouseMove,
    handleMouseUp,
    handleCellHover,
    getMateriasEmCelula,
    getCellPreviewInfo,
    getTurmaIndexParaCelula,
    verificarConflito,
    resetDrag
  };
}
