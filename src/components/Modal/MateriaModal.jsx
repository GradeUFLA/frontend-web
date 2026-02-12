import { getNomeMateria, verificarPreRequisitosDetalhada } from '../../data';
import { useRef } from 'react';
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

  // Verificar se a matéria já está no calendário
  const jaNoCalendario = materia ? materiasNoCalendario[materia.codigo] : false;

  const normalizeDiaForLabel = (d) => {
    const n = Number(d);
    if (!Number.isNaN(n)) {
      if (n >= 0 && n <= 6) return n;
      if (n >= 1 && n <= 7) return ((n + 6) % 7 + 7) % 7; // 1->0 .. 7->6
    }
    // fallback: try parse first 3 letters
    const s = String(d).toLowerCase().slice(0,3);
    const idx = DIAS_SEMANA.findIndex(x => x.toLowerCase().slice(0,3) === s);
    return idx !== -1 ? idx : 0;
  };

  const parseHour = (val) => {
    if (val == null) return null;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const match = val.match(/^(\d{1,2})[:.]?(\d{0,2})/);
      if (match) return Number(match[1]);
      const n = Number(val);
      return Number.isNaN(n) ? null : n;
    }
    return null;
  };

  const normalizeDiaValue = (d) => {
    if (d == null) return null;
    const n = Number(d);
    if (!Number.isNaN(n)) {
      if (n >= 0 && n <= 6) return n;
      if (n >= 1 && n <= 7) return ((n + 6) % 7 + 7) % 7;
    }
    const s = String(d).toLowerCase().slice(0,3);
    const idx = DIAS_SEMANA.findIndex(x => x.toLowerCase().slice(0,3) === s);
    return idx !== -1 ? idx : null;
  };

  const horariosConflitam = (horario1, horario2) => {
    const dia1 = normalizeDiaValue(horario1.dia);
    const dia2 = normalizeDiaValue(horario2.dia);

    // Se dias são diferentes, não há conflito
    if (dia1 !== dia2 || dia1 === null || dia2 === null) {
      return false;
    }

    const inicio1 = parseHour(horario1.inicio);
    const fim1 = parseHour(horario1.fim);
    const inicio2 = parseHour(horario2.inicio);
    const fim2 = parseHour(horario2.fim);

    if (inicio1 === null || fim1 === null || inicio2 === null || fim2 === null) {
      return false;
    }

    // Há conflito se: horario1 começa ANTES de horario2 terminar E horario1 termina DEPOIS de horario2 começar
    return (inicio1 < fim2 && fim1 > inicio2);
  };

  const isAnpOnlyMateria = (m) => {
    const horarios = m?.horarios || [];
    if (horarios.length === 0) return true;
    return horarios.every(h => normalizeDiaValue(h.dia) === 6);
  };

  const getConflitoParaTurma = (turma) => {
    if (!turma) return { temConflito: false };

    if (turma.anp === true && isAnpOnlyMateria(turma)) {
      return { temConflito: false };
    }

    const horariosNovos = turma.horarios || [];
    for (const [codigo, materiaExistente] of Object.entries(materiasNoCalendario || {})) {
      if (materiaExistente.anp && isAnpOnlyMateria(materiaExistente)) continue;

      const horariosExistentes = materiaExistente.horarios || [];
      for (const novoHorario of horariosNovos) {
        if (!novoHorario) continue;
        for (const horarioExistente of horariosExistentes) {
          if (!horarioExistente) continue;
          if (horariosConflitam(novoHorario, horarioExistente)) {
            return {
              temConflito: true,
              materiaConflito: materiaExistente.nome || codigo,
              horarioConflito: horarioExistente
            };
          }
        }
      }
    }

    return { temConflito: false };
  };

  const handleAddTurmaClick = (turma) => {
    if (!turma) return;

    // Prevenir múltiplas execuções rápidas
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    // Resetar o flag após um pequeno delay
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 300);

    // Verificar limite de créditos ANTES de tudo
    const CREDIT_MAX = 32;
    const creditosAtuais = Object.values(materiasNoCalendario || {}).reduce((acc, m) => acc + (m.creditos || 0), 0);
    const novoTotal = creditosAtuais + (materia.creditos || 0);

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

    const faltandoCoreqRaw = det.faltandoCoreq || [];
    const faltandoCoreq = faltandoCoreqRaw.filter(pr => !materiasMinimoConfirmadas.includes(pr));

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

    // Se falta co-requisito -> bloquear
    if (faltandoCoreq.length > 0) {
      if (typeof onShowToast === 'function') {
        onShowToast(
          `Co-requisito(s) necessários: ${faltandoCoreq.map(f => getNomeMateria(f)).join(', ')}`,
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
        const diaNome = DIAS_SEMANA[normalizeDiaValue(conflito.horarioConflito?.dia)] || 'Dia';
        const inicio = parseHour(conflito.horarioConflito?.inicio);
        const fim = parseHour(conflito.horarioConflito?.fim);
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
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><i className="fi fi-br-cross-small"></i></button>
        <h3 className="modal-titulo">{materia.nome}</h3>
        <p className="modal-codigo">{materia.codigo}</p>

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
            <span className="modal-value">{materia.turmas?.length || 1}</span>
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
              const conflito = getConflitoParaTurma(turma);
              const conflitoLabel = conflito.temConflito
                ? (() => {
                    const diaNome = DIAS_SEMANA[normalizeDiaValue(conflito.horarioConflito?.dia)] || 'Dia';
                    const inicio = parseHour(conflito.horarioConflito?.inicio);
                    const fim = parseHour(conflito.horarioConflito?.fim);
                    return `Conflito com ${conflito.materiaConflito} - ${diaNome} ${inicio}:00-${fim}:00`;
                  })()
                : '';

              return (
                <div
                  key={turma.id}
                  className={`turma-item ${conflito.temConflito ? 'turma-item--conflito' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (conflito.temConflito) return;
                    handleAddTurmaClick(turma);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      if (conflito.temConflito) return;
                      handleAddTurmaClick(turma);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="turma-id">Turma {turma.id}</span>
                  <div className="turma-horarios">
                    {(turma.horarios && turma.horarios.length > 0) ? (
                      turma.horarios.map((h, i) => (
                        <span key={i} className="horario-badge">
                          {DIAS_SEMANA[normalizeDiaForLabel(h.dia)]} {h.inicio}{typeof h.inicio === 'number' ? 'h' : ''}-{h.fim}{typeof h.fim === 'number' ? 'h' : ''}
                        </span>
                      ))
                    ) : (
                      <span className="horario-badge horario-badge--anp">ANP</span>
                    )}
                  </div>
                  {conflito.temConflito && (
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
