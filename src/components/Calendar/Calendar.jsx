import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getNomeMateria } from '../../data';
import { calcularTotalCreditos } from '../../domain/gradeRules';
import CalendarBoard from './CalendarBoard';
import CalendarSidebar from './CalendarSidebar';
import PrerequisiteModal from './PrerequisiteModal';
import useCalendarDrag from './useCalendarDrag';
import useCalendarExport from './useCalendarExport';
import {
  gerarHorarios,
  getCorMateria as calcularCorMateria,
  getCorTurma
} from './calendarUtils';
import './Calendar.css';

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
  materiasMinimoConfirmadas = [],
  onConfirmMinimo
}, ref) => {
  const [minimoModal, setMinimoModal] = useState({
    open: false,
    prereqs: [],
    parent: null,
    tipo: null
  });
  const [isMobile, setIsMobile] = useState(false);
  const calendarTableRef = useRef(null);
  const wrapperRef = useRef(null);
  const horarios = useMemo(() => gerarHorarios(7, 23), []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 1000);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const triggerToast = useCallback((message, level = 'info') => {
    if (typeof onShowToast === 'function') {
      try {
        onShowToast(message, level);
        return;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('onShowToast handler threw an error, using fallback:', error);
      }
    }

    try {
      window.dispatchEvent(new CustomEvent('gradeufla-toast', { detail: { message, level } }));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(`[toast:${level}]`, message);
    }
  }, [onShowToast]);

  const allMateriasList = useMemo(() => [
    ...Object.values(materiasPorSemestre).flat(),
    ...(Array.isArray(eletivas) ? eletivas : [])
  ], [eletivas, materiasPorSemestre]);
  const totalCreditos = useMemo(
    () => calcularTotalCreditos(materiasNoCalendario),
    [materiasNoCalendario]
  );
  const eletivasCodigos = useMemo(
    () => new Set((Array.isArray(eletivas) ? eletivas : []).map(materia => materia.codigo)),
    [eletivas]
  );
  const futurasCodigos = useMemo(() => {
    const codigos = new Set();
    for (let semestre = Number(semestreAtual) + 1; semestre <= 10; semestre++) {
      (materiasPorSemestre[semestre] || []).forEach(materia => codigos.add(materia.codigo));
    }
    return codigos;
  }, [materiasPorSemestre, semestreAtual]);
  const getCorMateria = useCallback(
    codigo => calcularCorMateria(codigo, materiasNoCalendario),
    [materiasNoCalendario]
  );
  const getTipoMateria = useCallback(codigo => {
    if (!materiasNoCalendario[codigo]) return null;
    if (eletivasCodigos.has(codigo)) return 'eletiva';
    if (futurasCodigos.has(codigo)) return 'futura';
    return 'obrigatoria';
  }, [eletivasCodigos, futurasCodigos, materiasNoCalendario]);

  const {
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
    verificarConflito
  } = useCalendarDrag({
    allMateriasList,
    materiasNoCalendario,
    materiasAprovadas,
    materiasMinimoConfirmadas,
    onAddMateria,
    onRemoveMateria,
    triggerToast,
    calendarTableRef,
    horarios
  });

  const handleDownloadPNG = useCalendarExport({
    wrapperRef,
    semestreAtual,
    materiasNoCalendario,
    materiasAprovadas,
    materiasMinimoConfirmadas,
    triggerToast
  });

  const openForteConfirm = (prereqs, parent) => {
    setMinimoModal({
      open: true,
      prereqs: Array.isArray(prereqs) ? prereqs : [prereqs],
      parent,
      tipo: 'forte'
    });
  };

  const openMinimoConfirm = (prereq, parent) => {
    const codigo = prereq && typeof prereq === 'object'
      ? (prereq.codigo || prereq.id || '')
      : String(prereq || '');
    setMinimoModal({ open: true, prereqs: [codigo], parent, tipo: 'minimo' });
  };

  const openCoreqConfirm = (prereqs, parent) => {
    setMinimoModal({
      open: true,
      prereqs: Array.isArray(prereqs) ? prereqs : [prereqs],
      parent,
      tipo: 'coreq'
    });
  };

  const closeMinimoConfirm = () => {
    setMinimoModal({ open: false, prereqs: [], parent: null, tipo: null });
  };

  const confirmMinimo = () => {
    const { prereqs, tipo } = minimoModal;
    if (!prereqs || prereqs.length === 0) {
      triggerToast('Nenhum pré-requisito para confirmar.', 'error');
      closeMinimoConfirm();
      return;
    }

    const prereqsUnicos = [...new Set(prereqs.map(item => String(item).trim()))].filter(Boolean);
    prereqsUnicos.forEach(codigo => {
      if (typeof onConfirmMinimo === 'function') {
        onConfirmMinimo(codigo);
      } else {
        try {
          window.dispatchEvent(new CustomEvent('gradeufla-confirm-minimo', { detail: { codigo } }));
        } catch (error) {
          // O navegador pode não oferecer CustomEvent; a confirmação visual ainda é encerrada.
        }
      }
    });

    const nomes = prereqsUnicos.map(codigo => getNomeMateria(codigo) || codigo).join(', ');
    const mensagens = {
      forte: `Pré-requisito(s) forte(s) ${nomes} confirmado(s) como cursado(s).`,
      minimo: `Pré-requisito ${nomes} confirmado como cursado com média mínima.`,
      coreq: `Co-requisito(s) ${nomes} confirmado(s) como cursado(s).`
    };
    triggerToast(mensagens[tipo] || `Pré-requisito(s) ${nomes} confirmado(s).`, 'success');
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
      <div className="calendar__header-wrapper">
        <button className="btn-voltar btn-voltar--calendar" onClick={onVoltar}>
          <i className="fi fi-br-arrow-left"></i>
          <span className="btn-voltar__text">Voltar</span>
        </button>
      </div>

      <div className="calendar__layout">
        <CalendarSidebar
          semestreAtual={semestreAtual}
          materiasAprovadas={materiasAprovadas}
          materiasPorSemestre={materiasPorSemestre}
          eletivas={eletivas}
          materiasNoCalendario={materiasNoCalendario}
          materiasMinimoConfirmadas={materiasMinimoConfirmadas}
          allMateriasList={allMateriasList}
          totalCreditos={totalCreditos}
          isDragging={isDragging}
          draggingMateria={draggingMateria}
          draggingFromCalendar={draggingFromCalendar}
          shakeErrorMateria={shakeErrorMateria}
          isMobile={isMobile}
          getCorMateria={getCorMateria}
          onDragStart={handleDragStart}
          onMateriaClick={onMateriaClick}
          onOpenForte={openForteConfirm}
          onOpenMinimo={openMinimoConfirm}
          onOpenCoreq={openCoreqConfirm}
        />

        <CalendarBoard
          wrapperRef={wrapperRef}
          tableRef={calendarTableRef}
          semestreAtual={semestreAtual}
          onDownload={handleDownloadPNG}
          isDragging={isDragging}
          draggingMateria={draggingMateria}
          selectedTurmaIndex={selectedTurmaIndex}
          verificarConflito={verificarConflito}
          getCorTurma={getCorTurma}
          horarios={horarios}
          getMateriasEmCelula={getMateriasEmCelula}
          getCellPreviewInfo={getCellPreviewInfo}
          getTipoMateria={getTipoMateria}
          getCorMateria={getCorMateria}
          isMobile={isMobile}
          onDragStartFromCalendar={handleDragStartFromCalendar}
          onMateriaClick={onMateriaClick}
          onCellHover={handleCellHover}
          materiasNoCalendario={materiasNoCalendario}
        />
      </div>

      {isDragging && draggingMateria && (
        <div
          ref={dragGhostRef}
          className="drag-ghost"
          style={{
            backgroundColor: getCorMateria(draggingMateria.codigo)
          }}
        >
          <span>{draggingMateria.nome}</span>
        </div>
      )}

      <PrerequisiteModal
        modal={minimoModal}
        onClose={closeMinimoConfirm}
        onConfirm={confirmMinimo}
      />
    </section>
  );
});

Calendar.displayName = 'Calendar';

export default Calendar;
