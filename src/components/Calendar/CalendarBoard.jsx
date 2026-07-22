import { memo } from 'react';
import { DIAS_SEMANA } from './calendarUtils';

function TurmasPopup({ materia, selectedTurmaIndex, verificarConflito, getCorTurma }) {
  if (!materia) return null;
  return (
    <div className="calendar__turmas-popup">
      <span className="calendar__turmas-popup-title">Escolha uma turma:</span>
      <div className="calendar__turmas-popup-items">
        {(materia.turmas || []).map((turma, index) => {
          const { temConflito } = verificarConflito(turma);
          return (
            <div
              key={turma.id}
              className={`calendar__turmas-popup-item ${selectedTurmaIndex === index ? 'calendar__turmas-popup-item--selected' : ''} ${temConflito ? 'calendar__turmas-popup-item--conflito' : ''}`}
              style={{ borderColor: getCorTurma(index) }}
            >
              <span
                className="calendar__turmas-popup-color"
                style={{ backgroundColor: getCorTurma(index) }}
              ></span>
              <span>Turma {turma.id}</span>
              {temConflito && <i className="fi fi-br-triangle-warning calendar__turmas-popup-conflito"></i>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarGrid({
  tableRef,
  horarios,
  getMateriasEmCelula,
  getCellPreviewInfo,
  getTipoMateria,
  getCorMateria,
  isMobile,
  onDragStartFromCalendar,
  onMateriaClick,
  onCellHover
}) {
  return (
    <div className="calendar__container">
      <table className="calendar__table" ref={tableRef}>
        <thead>
          <tr>
            <th className="calendar__col-time" scope="col">Hora</th>
            {DIAS_SEMANA.map((dia, index) => (
              <th key={index} className="calendar__col-day" scope="col">{dia}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {horarios.map((horario, indexHora) => (
            <tr key={indexHora}>
              <th className="calendar__cell-time" scope="row">{horario}</th>
              {DIAS_SEMANA.map((_, indexDia) => {
                const materias = getMateriasEmCelula(indexHora, indexDia);
                const preview = getCellPreviewInfo(indexHora, indexDia);
                const tipo = materias.length > 0 ? getTipoMateria(materias[0].codigo) : null;
                const classes = [
                  'calendar__cell',
                  materias.length > 0 && 'calendar__cell--has-subject',
                  tipo === 'eletiva' && 'calendar__cell--eletiva',
                  tipo === 'futura' && 'calendar__cell--futura',
                  tipo === 'obrigatoria' && 'calendar__cell--obrigatoria',
                  preview && !preview.hasConflict && 'calendar__cell--preview',
                  preview?.hasConflict && 'calendar__cell--preview-conflito',
                  preview?.isSelected && 'calendar__cell--preview-selected'
                ].filter(Boolean).join(' ');

                return (
                  <td
                    key={indexDia}
                    className={classes}
                    style={materias.length > 0
                      ? {
                          backgroundColor: getCorMateria(materias[0].codigo),
                          cursor: isMobile ? 'pointer' : 'grab'
                        }
                      : preview
                        ? {
                            backgroundColor: preview.hasConflict
                              ? 'rgba(232, 72, 85, 0.2)'
                              : `${preview.cor}33`,
                            borderColor: preview.cor
                          }
                        : {}}
                    onMouseDown={event => {
                      if (materias.length > 0 && !isMobile) {
                        if (event.target.closest('.calendar__cell-info')) return;
                        onDragStartFromCalendar(event, materias[0]);
                      }
                    }}
                    onClick={event => {
                      if (event.target.closest('.calendar__cell-info')) return;
                      if (isMobile && materias.length > 0) {
                        event.stopPropagation();
                        onMateriaClick?.(materias[0]);
                      }
                    }}
                    onMouseEnter={() => onCellHover(indexHora, indexDia)}
                  >
                    {materias.length > 0 && (
                      <div className="calendar__cell-subjects">
                        {materias.map(materia => (
                          <div key={materia.codigo} className="calendar__cell-subject">
                            <span className="calendar__cell-subject-name">{materia.nome}</span>
                            <button
                              className={`calendar__cell-info ${isMobile ? 'calendar__cell-info--mobile-hidden' : ''}`}
                              onClick={event => {
                                event.stopPropagation();
                                event.preventDefault();
                                onMateriaClick?.(materia);
                              }}
                              onMouseDown={event => {
                                event.stopPropagation();
                                event.preventDefault();
                              }}
                              title="Ver informações"
                              aria-label={`Ver informações de ${materia.nome}`}
                              type="button"
                            >
                              <i className="fi fi-br-menu-dots-vertical" aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {preview && materias.length === 0 && (
                      <div className="calendar__cell-preview-content" style={{ color: preview.cor }}></div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LegendSection({ title, type, materias, getCorMateria }) {
  if (materias.length === 0) return null;
  return (
    <div className="calendar__legend-section">
      <h4 className="calendar__legend-section-title">{title}</h4>
      <div className="calendar__legend-items">
        {materias.map(materia => (
          <div
            key={materia.codigo}
            className={`calendar__legend-item ${type ? `calendar__legend-item--${type}` : ''}`}
          >
            <span
              className={`calendar__legend-color ${type ? `calendar__legend-color--${type}` : ''}`}
              style={{ backgroundColor: getCorMateria(materia.codigo) }}
            ></span>
            <span className="calendar__legend-text">
              {materia.nome}
              {materia.turmaId && (
                <span className="calendar__legend-turma"> - Turma {materia.turmaId}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarLegend({ materiasNoCalendario, getTipoMateria, getCorMateria }) {
  const grupos = { obrigatorias: [], eletivas: [], futuras: [] };
  Object.entries(materiasNoCalendario).forEach(([codigo, materia]) => {
    const item = { codigo, ...materia };
    const tipo = getTipoMateria(codigo);
    if (tipo === 'eletiva') grupos.eletivas.push(item);
    else if (tipo === 'futura') grupos.futuras.push(item);
    else grupos.obrigatorias.push(item);
  });

  return (
    <div className="calendar__legend">
      <LegendSection title="Obrigatórias" materias={grupos.obrigatorias} getCorMateria={getCorMateria} />
      <LegendSection title="Eletivas" type="eletiva" materias={grupos.eletivas} getCorMateria={getCorMateria} />
      <LegendSection title="Futuras" type="futura" materias={grupos.futuras} getCorMateria={getCorMateria} />
    </div>
  );
}

function CalendarBoard({
  wrapperRef,
  tableRef,
  semestreAtual,
  onDownload,
  isDragging,
  draggingMateria,
  selectedTurmaIndex,
  verificarConflito,
  getCorTurma,
  horarios,
  getMateriasEmCelula,
  getCellPreviewInfo,
  getTipoMateria,
  getCorMateria,
  isMobile,
  onDragStartFromCalendar,
  onMateriaClick,
  onCellHover,
  materiasNoCalendario
}) {
  return (
    <div className="calendar__wrapper" ref={wrapperRef}>
      <div className="calendar__title-container">
        <h2 className="calendar__title">Minha Grade - {semestreAtual}º Semestre</h2>
        <button
          className="calendar__download"
          onClick={onDownload}
          title="Baixar PNG da grade"
          aria-label="Baixar PNG da grade"
          type="button"
        >
          <i className="fi fi-br-download" aria-hidden="true" />
        </button>
        {isDragging && (
          <TurmasPopup
            materia={draggingMateria}
            selectedTurmaIndex={selectedTurmaIndex}
            verificarConflito={verificarConflito}
            getCorTurma={getCorTurma}
          />
        )}
      </div>

      <CalendarGrid
        tableRef={tableRef}
        horarios={horarios}
        getMateriasEmCelula={getMateriasEmCelula}
        getCellPreviewInfo={getCellPreviewInfo}
        getTipoMateria={getTipoMateria}
        getCorMateria={getCorMateria}
        isMobile={isMobile}
        onDragStartFromCalendar={onDragStartFromCalendar}
        onMateriaClick={onMateriaClick}
        onCellHover={onCellHover}
      />

      <CalendarLegend
        materiasNoCalendario={materiasNoCalendario}
        getTipoMateria={getTipoMateria}
        getCorMateria={getCorMateria}
      />

      <div className="calendar__footer">
        <p className="calendar__footer-text">
          Não se esqueça de fazer sua matrícula no SIG! Este aplicativo não tem nenhum vínculo com a UFLA.<br />
          Os horarios das turmas são baseados nos dados oficiais, mas podem sofrer alterações pela universidade. Use como guia, mas sempre confirme no SIG.<br />
          Banco de dados atualizado em 22/07/26 - 11:00 | Período letivo 2026/1
        </p>
      </div>
    </div>
  );
}

export default memo(CalendarBoard);
