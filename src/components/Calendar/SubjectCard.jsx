import { getNomeMateria, verificarPreRequisitosDetalhada } from '../../data';

export default function SubjectCard({
  materia,
  tipo,
  materiasAprovadas,
  materiasNoCalendario,
  materiasMinimoConfirmadas,
  allMateriasList,
  matchesFilter,
  isDragging,
  draggingMateria,
  shakeErrorMateria,
  isMobile,
  getCorMateria,
  onDragStart,
  onMateriaClick,
  onOpenForte,
  onOpenMinimo,
  onOpenCoreq
}) {
  if (materiasNoCalendario[materia.codigo] || !matchesFilter) return null;

  const calendarioComMateria = { ...materiasNoCalendario, [materia.codigo]: materia };
  const detalhes = verificarPreRequisitosDetalhada(
    materia,
    materiasAprovadas,
    calendarioComMateria,
    allMateriasList
  );
  const removerConfirmados = codigos =>
    (codigos || []).filter(codigo => !materiasMinimoConfirmadas.includes(codigo));
  const faltandoForte = removerConfirmados(detalhes.faltandoForte);
  const faltandoMinimo = removerConfirmados(detalhes.faltandoMinimo);
  const faltandoCoreq = removerConfirmados(detalhes.faltandoCoreq);
  const todosCumpridos = faltandoForte.length === 0
    && faltandoMinimo.length === 0
    && faltandoCoreq.length === 0;
  const podeAdicionar = faltandoForte.length === 0 && faltandoMinimo.length === 0;
  const isBeingDragged = isDragging && draggingMateria?.codigo === materia.codigo;

  const cardClasses = [
    'materia-card',
    tipo === 'pendente' && 'materia-card--pending',
    tipo === 'eletiva' && 'materia-card--elective',
    !podeAdicionar && 'materia-card--blocked',
    isBeingDragged && 'materia-card--dragging-origin',
    shakeErrorMateria === materia.codigo && 'shake-error'
  ].filter(Boolean).join(' ');

  let missingBadge = null;
  if (faltandoForte.length > 0) {
    missingBadge = { color: 'red', text: `Falta: ${faltandoForte.map(getNomeMateria).join(', ')}` };
  } else if (faltandoMinimo.length > 0) {
    missingBadge = { color: 'orange', text: `Mínimo: ${faltandoMinimo.map(getNomeMateria).join(', ')}` };
  } else if (faltandoCoreq.length > 0) {
    missingBadge = { color: '#F9DC5C', text: `Co-req: ${faltandoCoreq.map(getNomeMateria).join(', ')}` };
  }

  return (
    <div
      className={cardClasses}
      onMouseDown={event => !isMobile && podeAdicionar && onDragStart(event, materia)}
      onTouchStart={event => !isMobile && podeAdicionar && onDragStart(event, materia)}
      onClick={event => {
        if (isMobile && podeAdicionar) {
          event.stopPropagation();
          onMateriaClick?.(materia);
        }
      }}
      style={{
        borderLeftColor: getCorMateria(materia.codigo),
        cursor: isMobile
          ? (podeAdicionar ? 'pointer' : 'not-allowed')
          : (podeAdicionar ? 'grab' : 'not-allowed')
      }}
    >
      <div className="materia-card__header">
        <span className="materia-card__name">{materia.nome}</span>
        <button
          className="materia-card__info-btn"
          onClick={event => {
            event.stopPropagation();
            onMateriaClick?.(materia);
          }}
          title="Ver informações"
          aria-label={`Ver informações de ${materia.nome}`}
          type="button"
        >
          <i className="fi fi-br-menu-dots-vertical" aria-hidden="true" />
        </button>
      </div>

      <div className="materia-card__details">
        <span className="materia-card__code">{materia.codigo}</span>
        <span className="materia-card__credits">{materia.creditos} Créditos</span>
        <span className="materia-card__turmas-count">
          {(materia.turmas || []).length} turma{(materia.turmas || []).length > 1 ? 's' : ''}
        </span>
      </div>

      {tipo === 'pendente' && materia.semestreOriginal && (
        <span className="materia-card__semester-badge">{materia.semestreOriginal}º Sem</span>
      )}

      {!todosCumpridos && missingBadge && (
        <div
          className="materia-card__blocked-info"
          style={{ borderColor: missingBadge.color, color: missingBadge.color }}
        >
          <i className="fi fi-br-lock"></i>
          <div>{missingBadge.text}</div>

          {tipo === 'eletiva' && (
            <div className="materia-card__minimo-actions">
              {faltandoForte.length > 0 && (
                <button
                  className="materia-card__minimo-btn"
                  onClick={event => {
                    event.stopPropagation();
                    onOpenForte(faltandoForte, materia.codigo);
                  }}
                  title="Confirmar que já cursou este pré-requisito"
                >
                  Adicionar
                </button>
              )}
              {faltandoMinimo.length > 0 && faltandoForte.length === 0 && (
                <button
                  className="materia-card__minimo-btn"
                  onClick={event => {
                    event.stopPropagation();
                    onOpenMinimo(String(faltandoMinimo[0]), materia.codigo);
                  }}
                  title="Confirmar que cursou e obteve média mínima"
                >
                  Adicionar
                </button>
              )}
              {faltandoCoreq.length > 0 && faltandoForte.length === 0 && faltandoMinimo.length === 0 && (
                <button
                  className="materia-card__minimo-btn"
                  onClick={event => {
                    event.stopPropagation();
                    onOpenCoreq(faltandoCoreq, materia.codigo);
                  }}
                  title="Confirmar que já cursou este co-requisito"
                >
                  Adicionar
                </button>
              )}
            </div>
          )}

          {tipo !== 'eletiva' && faltandoMinimo.length > 0 && faltandoForte.length === 0 && (
            <div className="materia-card__minimo-actions">
              <button
                className="materia-card__minimo-btn"
                onClick={event => {
                  event.stopPropagation();
                  onOpenMinimo(String(faltandoMinimo[0]), materia.codigo);
                }}
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
}
