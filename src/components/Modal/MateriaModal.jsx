import { getNomeMateria, verificarPreRequisitosDetalhada } from '../../data';
import {
  calcularTotalAposSelecao,
  CREDIT_MAX,
  isTurmaSelecionavel,
  normalizarDia,
  normalizarHora,
  verificarConflitoMateria
} from '../../domain/gradeRules';
import { useId, useRef } from 'react';
import useAccessibleDialog from '../../hooks/useAccessibleDialog';
import './Modal.css';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const MateriaModal = ({
  materia,
  materiasAprovadas,
  onClose,
  onSave,
  onRemove,
  onShowToast,
  materiasNoCalendario = {},
  materiasMinimoConfirmadas = [],
  allMateriasList = []
}) => {
  // Ref para prevenir múltiplas chamadas rápidas (debounce simples)
  const isProcessingRef = useRef(false);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const titleId = `materia-modal-title-${useId().replace(/:/g, '')}`;
  const descriptionId = `materia-modal-description-${useId().replace(/:/g, '')}`;

  useAccessibleDialog({
    open: Boolean(materia),
    onClose,
    dialogRef,
    initialFocusRef: closeButtonRef
  });

  // Verificar se a matéria já está no calendário
  const jaNoCalendario = materia ? materiasNoCalendario[materia.codigo] : false;

  const getConflitoParaTurma = turma => verificarConflitoMateria(
    turma,
    materiasNoCalendario,
    { ignorarCodigo: materia?.codigo }
  );

  const handleAddTurmaClick = (turma) => {
    if (!turma) return;

    if (!isTurmaSelecionavel(turma)) {
      onShowToast?.('Esta turma não possui horário informado.', 'error');
      return;
    }

    // Prevenir múltiplas execuções rápidas
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    // Resetar o flag após um pequeno delay
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 300);

    // Verificar limite de créditos ANTES de tudo
    const novoTotal = calcularTotalAposSelecao(materiasNoCalendario, materia);

    if (novoTotal > CREDIT_MAX) {
      if (typeof onShowToast === 'function') {
        onShowToast(
          `Adicionar esta matéria excederia o limite de 32 créditos.`,
          'error'
        );
      }
      return;
    }

    // Verificar pré-requisitos ANTES de adicionar
    const det = verificarPreRequisitosDetalhada(materia, materiasAprovadas, materiasNoCalendario, allMateriasList);

    // Filter prereqs usando lista de confirmados
    const faltandoForteRaw = det.faltandoForte || [];
    const faltandoForte = faltandoForteRaw.filter(pr => !materiasMinimoConfirmadas.includes(pr));

    const faltandoMinimoRaw = det.faltandoMinimo || [];
    const faltandoMinimo = faltandoMinimoRaw.filter(pr => !materiasMinimoConfirmadas.includes(pr));

    // Se falta pré-requisito forte -> bloquear
    if (faltandoForte.length > 0) {
      if (typeof onShowToast === 'function') {
        onShowToast(
          `Pré-requisitos fortes faltando: ${faltandoForte.map(f => getNomeMateria(f)).join(', ')}`,
          'error'
        );
      }
      return;
    }

    // Se falta pré-requisito mínimo -> bloquear
    if (faltandoMinimo.length > 0) {
      if (typeof onShowToast === 'function') {
        onShowToast(
          `Pré-requisito mínimo necessário: ${faltandoMinimo.map(f => getNomeMateria(f)).join(', ')}`,
          'error'
        );
      }
      return;
    }

    // Verificar conflito de horários
    const conflito = getConflitoParaTurma(turma);
    if (conflito.temConflito) {
      if (typeof onShowToast === 'function') {
        const diaNome = DIAS_SEMANA[normalizarDia(conflito.horarioConflito?.dia)] || 'Dia';
        const inicio = normalizarHora(conflito.horarioConflito?.inicio);
        const fim = normalizarHora(conflito.horarioConflito?.fim);
        onShowToast(
          `Conflito de horário com "${conflito.materiaConflito}" - ${diaNome} das ${inicio}:00 às ${fim}:00`,
          'error'
        );
      }
      return;
    }

    const nova = {
      ...materia,
      turmaId: turma.id,
      horarios: turma.horarios || [],
      anp: turma.anp === true,  // Passa a flag anp da turma
      turmaAnp: turma.anp === true  // Backup da flag
    };

    if (typeof onSave === 'function') {
      // call onSave but do NOT close the modal here; parent controls closing
      // handleAddMateria will verify conflicts with the latest state
      onSave(nova);
    }
  };

  if (!materia) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-content"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <button
          ref={closeButtonRef}
          className="modal-close"
          onClick={onClose}
          type="button"
          aria-label="Fechar detalhes da disciplina"
        >
          <i className="fi fi-br-cross-small" aria-hidden="true" />
        </button>
        <h3 className="modal-titulo" id={titleId}>{materia.nome}</h3>
        <p className="modal-codigo" id={descriptionId}>{materia.codigo}</p>

        <div className="modal-info">
          <div className="modal-info-item">
            <span className="modal-label">Créditos:</span>
            <span className="modal-value">{materia.creditos}</span>
          </div>
          <div className="modal-info-item">
            <span className="modal-label">Tipo:</span>
            <span className="modal-value">
              {materia.tipo === 'obrigatoria' ? 'Obrigatória' : 'Eletiva'}
            </span>
          </div>
          <div className="modal-info-item">
            <span className="modal-label">Turmas:</span>
            <span className="modal-value">{materia.turmas?.length ?? 0}</span>
          </div>
        </div>

        {jaNoCalendario && (
          <div className="modal-remover-container">
            <button
              className="modal-remover-btn"
              onClick={() => {
                if (typeof onRemove === 'function') {
                  onRemove(materia.codigo);
                  onClose();
                }
              }}
              title="Remover do calendário"
            >
              <i className="fi fi-br-trash"></i>
              Remover do Calendário
            </button>
          </div>
        )}

        <div className="modal-turmas">
          <span className="modal-label">Turmas disponíveis:</span>
          <div className="turmas-lista">
            {materia.turmas?.map((turma) => {
              // Verificar se esta turma é a que está no calendário
              const turmaAtual = jaNoCalendario && materiasNoCalendario[materia.codigo]?.turmaId === turma.id;
              const turmaDisponivel = isTurmaSelecionavel(turma);

              const conflito = getConflitoParaTurma(turma);
              const conflitoLabel = conflito.temConflito
                ? conflito.horarioConflito ? (() => {
                    const diaNome = DIAS_SEMANA[normalizarDia(conflito.horarioConflito?.dia)] || 'Dia';
                    const inicio = normalizarHora(conflito.horarioConflito?.inicio);
                    const fim = normalizarHora(conflito.horarioConflito?.fim);
                    return `Conflito com ${conflito.materiaConflito} - ${diaNome} ${inicio}:00-${fim}:00`;
                  })() : conflito.mensagem
                : '';

              return (
                <div
                  key={turma.id}
                  className={`turma-item ${!turmaDisponivel ? 'turma-item--disabled' : ''} ${conflito.temConflito ? 'turma-item--conflito' : ''} ${turmaAtual ? 'turma-item--selecionada' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!turmaDisponivel || conflito.temConflito || turmaAtual) return;
                    handleAddTurmaClick(turma);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!turmaDisponivel || conflito.temConflito || turmaAtual) return;
                      handleAddTurmaClick(turma);
                    }
                  }}
                  role="button"
                  tabIndex={turmaDisponivel ? 0 : -1}
                  aria-disabled={!turmaDisponivel || conflito.temConflito || turmaAtual}
                >
                  <span className="turma-id">Turma {turma.id}</span>
                  <div className="turma-horarios">
                    {(turma.horarios && turma.horarios.length > 0) ? (
                      turma.horarios.map((h, i) => (
                        <span key={i} className="horario-badge">
                          {DIAS_SEMANA[normalizarDia(h.dia) ?? 0]} {h.inicio}{typeof h.inicio === 'number' ? 'h' : ''}-{h.fim}{typeof h.fim === 'number' ? 'h' : ''}
                        </span>
                      ))
                    ) : turma.anp === true ? (
                      <span className="horario-badge horario-badge--anp">ANP</span>
                    ) : (
                      <span className="horario-badge">Horário não informado</span>
                    )}
                  </div>
                  {turmaAtual && (
                    <div className="turma-selecionada">
                      <i className="fi fi-br-check-circle" aria-hidden="true" />
                      <span>Horário Escolhido</span>
                    </div>
                  )}
                  {conflito.temConflito && !turmaAtual && (
                    <div className="turma-conflito">
                      <i className="fi fi-br-triangle-warning" aria-hidden="true" />
                      <span>{conflitoLabel}</span>
                    </div>
                  )}
                </div>
              );
            })}
           </div>
         </div>

        {materia.preRequisitos.length > 0 && (
          <div className="modal-prereq">
            <span className="modal-label">Pré-requisitos:</span>
            <div className="prereq-lista">
              {materia.preRequisitos.map(pr => {
                const cumprido = materiasAprovadas.includes(pr);
                return (
                  <span
                    key={pr}
                    className={`prereq-badge ${cumprido ? 'prereq-badge--completed' : 'prereq-badge--pending'}`}
                  >
                    <i className={`fi ${cumprido ? 'fi-br-check' : 'fi-br-cross'}`}></i> {getNomeMateria(pr)}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MateriaModal;
