import { getNomeMateria, verificarPreRequisitosDetalhada } from '../../data';
import './Modal.css';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const MateriaModal = ({
  materia,
  materiasAprovadas,
  onClose,
  onSave,
  checkConflito,
  onShowToast,
  materiasNoCalendario = {},
  materiasMinimoConfirmadas = []
}) => {
  if (!materia) return null;

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

  const handleAddTurmaClick = (turma) => {
    if (!turma) return;

    // Verificar pré-requisitos ANTES de adicionar
    const det = verificarPreRequisitosDetalhada(materia, materiasAprovadas, materiasNoCalendario);

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

    const nova = {
      ...materia,
      turmaId: turma.id,
      horarios: turma.horarios || []
    };

    // Verificar conflito de horário
    if (typeof checkConflito === 'function') {
      const check = checkConflito(nova);
      if (check?.temConflito) {
        const motivo = check.materiaConflito || check.mensagem || 'Conflito de horário';
        if (typeof onShowToast === 'function') {
          onShowToast(`Conflito de horário: ${motivo}`, 'error');
        }
        return;
      }
    }

    if (typeof onSave === 'function') {
      // call onSave but do NOT close the modal here; parent controls closing
      onSave(nova);
    }
  };

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

        <div className="modal-turmas">
          <span className="modal-label">Turmas disponíveis:</span>
          <div className="turmas-lista">
            {materia.turmas?.map((turma) => {
              const nova = { ...materia, turmaId: turma.id, horarios: turma.horarios || [] };
              const check = typeof checkConflito === 'function' ? checkConflito(nova) : { temConflito: false };
              return (
                <div
                  key={turma.id}
                  className={`turma-item ${check?.temConflito ? 'turma-item--disabled' : ''}`}
                  onClick={() => handleAddTurmaClick(turma)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="turma-id">Turma {turma.id}</span>
                  <div className="turma-horarios">
                    {turma.horarios.map((h, i) => (
                      <span key={i} className="horario-badge">
                        {DIAS_SEMANA[normalizeDiaForLabel(h.dia)]} {h.inicio}{typeof h.inicio === 'number' ? 'h' : ''}-{h.fim}{typeof h.fim === 'number' ? 'h' : ''}
                      </span>
                    ))}
                  </div>
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
