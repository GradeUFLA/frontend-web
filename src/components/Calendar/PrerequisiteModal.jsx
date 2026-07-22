import { useId, useRef } from 'react';
import { getNomeMateria } from '../../data';
import useAccessibleDialog from '../../hooks/useAccessibleDialog';

export default function PrerequisiteModal({ modal, onClose, onConfirm }) {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const titleId = `prerequisite-modal-title-${useId().replace(/:/g, '')}`;

  useAccessibleDialog({
    open: modal.open,
    onClose,
    dialogRef,
    initialFocusRef: cancelButtonRef
  });

  if (!modal.open) return null;

  const nomes = modal.prereqs.map(codigo => getNomeMateria(codigo) || codigo).join(', ');
  const tituloPorTipo = {
    forte: 'Confirmação - Pré-requisito Forte',
    minimo: 'Confirmação - Pré-requisito Mínimo',
    coreq: 'Confirmação - Co-requisito'
  };

  return (
    <div className="minimo-modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="minimo-modal"
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <h3 id={titleId}>{tituloPorTipo[modal.tipo] || 'Confirmação de pré-requisito'}</h3>
        {modal.tipo === 'forte' && (
          <>
            <p>
              Você já cursou e foi <strong>aprovado</strong> em <strong>{nomes}</strong>?
            </p>
            <p style={{ fontSize: '0.9rem', color: '#a3a3a3', marginTop: '8px' }}>
              Você só pode cursar esta matéria se tiver sido <strong>aprovado</strong> em{' '}
              <strong>{nomes}</strong>.
            </p>
          </>
        )}

        {modal.tipo === 'minimo' && (
          <>
            <p>
              Você já cursou <strong>{getNomeMateria(modal.prereqs[0]) || modal.prereqs[0]}</strong> sem ter sido
              reprovado por frequência e obteve média final mínima (≥ 50 pontos)?
            </p>
          </>
        )}

        {modal.tipo === 'coreq' && (
          <>
            <p>
              Você já cursou e foi <strong>aprovado</strong> em <strong>{nomes}</strong>?
            </p>
            <p style={{ fontSize: '0.9rem', color: '#a3a3a3', marginTop: '8px' }}>
              Para cursar esta matéria, você deve estar <strong>aprovado</strong> em{' '}
              <strong>{nomes}</strong> ou <strong>cursá-la(s) junto</strong> no mesmo semestre.
            </p>
          </>
        )}

        <div className="minimo-modal-actions">
          <button ref={cancelButtonRef} className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={onConfirm}>Sim, destravar matéria</button>
        </div>
      </div>
    </div>
  );
}
