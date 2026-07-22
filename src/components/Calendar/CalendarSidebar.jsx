import { memo, useState } from 'react';
import SubjectCard from './SubjectCard';
import {
  CREDIT_MAX,
  CREDIT_WARN,
  DIAS_SEMANA,
  SATURDAY_INDEX,
  gerarHorarios,
  isAnpTurma,
  normalizeDia,
  parseHour
} from './calendarUtils';

const INITIAL_FILTER = {
  ativo: false,
  dia: null,
  horaInicio: null,
  horaFim: null,
  isAnp: false,
  creditos: null
};

export const materiaSeEncaixaNoFiltro = (materia, filtroHorario) => {
  if (!filtroHorario.ativo) return true;
  if (!materia.turmas || materia.turmas.length === 0) return false;

  const { dia, horaInicio, horaFim, isAnp, creditos } = filtroHorario;

  if (horaInicio !== null && horaFim !== null && horaFim <= horaInicio) return false;

  if (creditos !== null && (materia.creditos || 0) !== creditos) return false;

  if (isAnp) {
    return materia.turmas.some(turma => {
      if (!isAnpTurma(turma)) return false;
      const horarios = turma.horarios || [];
      const temHorarioNaoSabado = horarios.some(horario => {
        const horarioDia = normalizeDia(horario.dia);
        return horarioDia !== SATURDAY_INDEX && horarioDia !== null;
      });
      return !temHorarioNaoSabado;
    });
  }

  if (dia === null && horaInicio === null && horaFim === null) return true;

  return materia.turmas.some(turma => (turma.horarios || []).some(horario => {
    const horarioDia = normalizeDia(horario.dia);
    const inicio = parseHour(horario.inicio);
    const fim = parseHour(horario.fim);

    if (dia !== null && horarioDia !== dia) return false;
    if (horaInicio !== null && horaFim !== null) {
      return !(fim <= horaInicio || inicio >= horaFim);
    }
    if (horaInicio !== null) return fim > horaInicio;
    if (horaFim !== null) return inicio < horaFim;
    return true;
  }));
};

function EmptyFilterWarning({ sectionName }) {
  return (
    <div className="calendar__empty-filter-warning">
      <div className="calendar__empty-filter-icon">
        <i className="fi fi-br-search"></i>
      </div>
      <div className="calendar__empty-filter-content">
        <h5>Sem disciplinas</h5>
        <p>Nenhuma disciplina {sectionName.toLowerCase()} encontrada para o filtro aplicado.</p>
      </div>
    </div>
  );
}

function CalendarSidebar({
  semestreAtual,
  materiasAprovadas,
  materiasPorSemestre,
  eletivas,
  materiasNoCalendario,
  materiasMinimoConfirmadas,
  allMateriasList,
  totalCreditos,
  isDragging,
  draggingMateria,
  draggingFromCalendar,
  shakeErrorMateria,
  isMobile,
  getCorMateria,
  onDragStart,
  onMateriaClick,
  onOpenForte,
  onOpenMinimo,
  onOpenCoreq
}) {
  const [mostrarEletivas, setMostrarEletivas] = useState(false);
  const [eletivasQuery, setEletivasQuery] = useState('');
  const [mostrarFuturas, setMostrarFuturas] = useState(false);
  const [futurasQuery, setFuturasQuery] = useState('');
  const [filtroHorario, setFiltroHorario] = useState(INITIAL_FILTER);
  const intervaloHorarioInvalido = filtroHorario.horaInicio !== null
    && filtroHorario.horaFim !== null
    && filtroHorario.horaFim <= filtroHorario.horaInicio;

  const materiasDoSemestre = materiasPorSemestre[semestreAtual] || [];
  const obrigatorias = materiasDoSemestre.filter(materia => !materiasAprovadas.includes(materia.codigo));
  const pendentes = [];
  for (let semestre = 1; semestre < semestreAtual; semestre++) {
    (materiasPorSemestre[semestre] || []).forEach(materia => {
      if (!materiasAprovadas.includes(materia.codigo)) {
        pendentes.push({ ...materia, semestreOriginal: semestre });
      }
    });
  }
  const eletivasDisponiveis = mostrarEletivas
    ? (Array.isArray(eletivas) ? eletivas.filter(materia => !materiasAprovadas.includes(materia.codigo)) : [])
    : [];

  let creditClass = '';
  if (totalCreditos >= CREDIT_MAX) creditClass = 'calendar__credits--danger';
  else if (totalCreditos > CREDIT_WARN) creditClass = 'calendar__credits--warn';

  const matchesFilter = materia => materiaSeEncaixaNoFiltro(materia, filtroHorario);
  const renderEmptyFilterWarning = sectionName => <EmptyFilterWarning sectionName={sectionName} />;
  const renderMateriaCard = (materia, tipo = 'obrigatoria') => (
    <SubjectCard
      key={materia.codigo}
      materia={materia}
      tipo={tipo}
      materiasAprovadas={materiasAprovadas}
      materiasNoCalendario={materiasNoCalendario}
      materiasMinimoConfirmadas={materiasMinimoConfirmadas}
      allMateriasList={allMateriasList}
      matchesFilter={matchesFilter(materia)}
      isDragging={isDragging}
      draggingMateria={draggingMateria}
      shakeErrorMateria={shakeErrorMateria}
      isMobile={isMobile}
      getCorMateria={getCorMateria}
      onDragStart={onDragStart}
      onMateriaClick={onMateriaClick}
      onOpenForte={onOpenForte}
      onOpenMinimo={onOpenMinimo}
      onOpenCoreq={onOpenCoreq}
    />
  );

  return (
    <div className={`calendar__sidebar ${isDragging && draggingFromCalendar ? 'calendar__sidebar--drop-zone' : ''}`}>
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
        <span className="calendar__instructions-desktop">
          Arraste uma matéria da lista para o horário desejado.
          Para mover ou remover, arraste a matéria no calendário para outro horário ou de volta para a lista
        </span>
        <span className="calendar__instructions-mobile">
          Clique na matéria da lista e selecione um horário.
          Clique na matéria do calendário para ver informações.
        </span>
      </p>

      <div className="calendar__time-filter">
        <button
          className={`calendar__time-filter-toggle ${filtroHorario.ativo ? 'active' : ''}`}
          onClick={() => setFiltroHorario({ ...filtroHorario, ativo: !filtroHorario.ativo })}
          title="Filtrar matérias por horário ou créditos"
        >
          <i className="fi fi-br-search-alt"></i>
          <span>Filtrar Matérias</span>
          <i className={`fi fi-br-angle-${filtroHorario.ativo ? 'down' : 'right'}`} style={{ marginLeft: 'auto' }}></i>
        </button>

        {filtroHorario.ativo && (
          <div className="calendar__time-filter-content">
            <div className="calendar__time-filter-row">
              <label htmlFor="filter-dia">Tipo:</label>
              <select
                id="filter-dia"
                value={filtroHorario.isAnp ? 'anp' : (filtroHorario.dia ?? '')}
                onChange={event => {
                  const value = event.target.value;
                  if (value === 'anp') {
                    setFiltroHorario({
                      ...filtroHorario,
                      isAnp: true,
                      dia: null,
                      horaInicio: null,
                      horaFim: null
                    });
                  } else {
                    setFiltroHorario({
                      ...filtroHorario,
                      isAnp: false,
                      dia: value === '' ? null : Number(value)
                    });
                  }
                }}
              >
                <option value="">Qualquer dia</option>
                <option value="anp">ANP</option>
                {DIAS_SEMANA.slice(1, 6).map((dia, index) => (
                  <option key={index + 1} value={index + 1}>{dia}</option>
                ))}
              </select>
            </div>

            {!filtroHorario.isAnp && (
              <>
                <div className="calendar__time-filter-row">
                  <label htmlFor="filter-inicio">Hora início:</label>
                  <select
                    id="filter-inicio"
                    aria-invalid={intervaloHorarioInvalido}
                    aria-describedby={intervaloHorarioInvalido ? 'filter-horario-error' : undefined}
                    value={filtroHorario.horaInicio ?? ''}
                    onChange={event => {
                      const value = event.target.value;
                      setFiltroHorario({
                        ...filtroHorario,
                        horaInicio: value === '' ? null : Number(value)
                      });
                    }}
                  >
                    <option value="">-</option>
                    {gerarHorarios(7, 23).map((horario, index) => (
                      <option key={index} value={7 + index}>{horario}</option>
                    ))}
                  </select>
                </div>

                <div className="calendar__time-filter-row">
                  <label htmlFor="filter-fim">Hora fim:</label>
                  <select
                    id="filter-fim"
                    aria-invalid={intervaloHorarioInvalido}
                    aria-describedby={intervaloHorarioInvalido ? 'filter-horario-error' : undefined}
                    value={filtroHorario.horaFim ?? ''}
                    onChange={event => {
                      const value = event.target.value;
                      setFiltroHorario({
                        ...filtroHorario,
                        horaFim: value === '' ? null : Number(value)
                      });
                    }}
                  >
                    <option value="">-</option>
                    {gerarHorarios(7, 24).map((horario, index) => (
                      <option key={index} value={7 + index}>{horario}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="calendar__time-filter-row">
              <label htmlFor="filter-creditos">Créditos:</label>
              <select
                id="filter-creditos"
                value={filtroHorario.creditos ?? ''}
                onChange={event => {
                  const value = event.target.value;
                  setFiltroHorario({
                    ...filtroHorario,
                    creditos: value === '' ? null : Number(value)
                  });
                }}
              >
                <option value="">Qualquer</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(creditos => (
                  <option key={creditos} value={creditos}>{creditos} crédito{creditos > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>

            {(filtroHorario.dia !== null || filtroHorario.horaInicio !== null || filtroHorario.horaFim !== null || filtroHorario.isAnp || filtroHorario.creditos !== null) && (
              <button
                className="calendar__time-filter-clear"
                onClick={() => setFiltroHorario({ ...INITIAL_FILTER, ativo: true })}
                title="Limpar filtros"
              >
                <i className="fi fi-br-broom"></i>
                <span>Limpar Filtros</span>
              </button>
            )}

            {intervaloHorarioInvalido && (
              <p className="calendar__time-filter-error" id="filter-horario-error" role="alert">
                A hora final deve ser posterior à hora inicial.
              </p>
            )}

            <p className="calendar__time-filter-hint">
              {filtroHorario.isAnp
                ? 'Mostrando apenas matérias exclusivamente ANP'
                : filtroHorario.dia !== null || filtroHorario.horaInicio !== null || filtroHorario.horaFim !== null
                  ? `Mostrando matérias com turmas disponíveis${filtroHorario.dia !== null ? ` às ${DIAS_SEMANA[filtroHorario.dia]}s` : ''}${filtroHorario.horaInicio !== null ? ` das ${String(filtroHorario.horaInicio).padStart(2, '0')}:00` : ''}${filtroHorario.horaFim !== null ? ` às ${String(filtroHorario.horaFim).padStart(2, '0')}:00` : ''}`
                  : 'Configure o filtro acima para buscar matérias em horários específicos ou exclusivamente ANP'}
            </p>
          </div>
        )}
      </div>

      <div className="calendar__category">
        <h4 className="calendar__category-title">
          <i className="fi fi-br-bookmark calendar__category-icon"></i>
          Obrigatórias
        </h4>
        <div className="calendar__materias">
          {(() => {
            const materiasRenderizaveis = obrigatorias.filter(materia => (
              !materiasNoCalendario[materia.codigo] && matchesFilter(materia)
            ));
            if (materiasRenderizaveis.length === 0) {
              if (filtroHorario.ativo && obrigatorias.some(materia => !materiasNoCalendario[materia.codigo])) {
                return renderEmptyFilterWarning('obrigatórias');
              }
              return (
                <div className="calendar__empty-filter-warning">
                  <div className="calendar__empty-filter-icon">
                    <i className="fi fi-br-check"></i>
                  </div>
                  <div className="calendar__empty-filter-content">
                    <h5>Parabéns! 🎉</h5>
                    <p>Todas as matérias obrigatórias do semestre ja estão na sua grade!</p>
                  </div>
                </div>
              );
            }
            return materiasRenderizaveis.map(materia => renderMateriaCard(materia, 'obrigatoria'));
          })()}
        </div>
      </div>

      {pendentes.length > 0 && (
        <div className="calendar__category">
          <h4 className="calendar__category-title calendar__category-title--pending">
            <i className="fi fi-br-triangle-warning calendar__category-icon"></i>
            Pendentes (Anteriores)
          </h4>
          <div className="calendar__materias">
            {(() => {
              const materiasFiltradas = pendentes.filter(matchesFilter);
              if (filtroHorario.ativo && materiasFiltradas.length === 0) {
                return renderEmptyFilterWarning('pendentes');
              }
              return materiasFiltradas.map(materia => renderMateriaCard(materia, 'pendente'));
            })()}
          </div>
        </div>
      )}

      <div className="calendar__category">
        <button
          className="calendar__electives-toggle"
          onClick={() => {
            const next = !mostrarEletivas;
            setMostrarEletivas(next);
            setMostrarFuturas(false);
            if (!next) setEletivasQuery('');
          }}
        >
          <i className="fi fi-br-bullseye-pointer calendar__category-icon"></i>
          <span>Eletivas</span>
          {mostrarEletivas && (
            <input
              type="text"
              className="calendar__eletivas-search"
              placeholder="Pesquisar..."
              value={eletivasQuery}
              onChange={event => setEletivasQuery(event.target.value)}
              onClick={event => event.stopPropagation()}
            />
          )}
          <i className={`fi fi-br-angle-${mostrarEletivas ? 'down' : 'right'} calendar__toggle-icon`}></i>
        </button>

        {mostrarEletivas && (
          <div className="calendar__materias" style={{ marginTop: '10px' }}>
            {eletivasDisponiveis.length === 0 ? (
              <p className="calendar__no-electives">Nenhuma eletiva disponível.</p>
            ) : (() => {
              const groups = eletivasDisponiveis.reduce((acc, materia) => {
                const raw = (materia.subgrupo || 'Outros').toString().trim();
                const key = raw || 'Outros';
                if (!acc[key]) acc[key] = [];
                acc[key].push(materia);
                return acc;
              }, {});
              const orderedKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
              const renderedGroups = orderedKeys.map(key => {
                const label = key.toString();
                const matchingQuery = groups[key].filter(materia => materia.nome.toLowerCase().includes(eletivasQuery.toLowerCase()));
                const filteredMaterias = matchingQuery.filter(matchesFilter);
                if (filteredMaterias.length === 0) {
                  if (filtroHorario.ativo && matchingQuery.length > 0) {
                    return (
                      <div key={key} className="calendar__eletiva-group">
                        {label.toLowerCase() !== 'outros' && <h5 className="calendar__eletiva-group-title">{label}</h5>}
                        <div className="calendar__eletiva-group-list">
                          {renderEmptyFilterWarning('eletivas')}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }
                return (
                  <div key={key} className="calendar__eletiva-group">
                    {label.toLowerCase() !== 'outros' && <h5 className="calendar__eletiva-group-title">{label}</h5>}
                    <div className="calendar__eletiva-group-list">
                      {filteredMaterias.map(materia => renderMateriaCard(materia, 'eletiva'))}
                    </div>
                  </div>
                );
              }).filter(Boolean);
              return renderedGroups.length === 0 && filtroHorario.ativo
                ? renderEmptyFilterWarning('eletivas')
                : renderedGroups;
            })()}
          </div>
        )}

        <button
          className="calendar__futuras-toggle"
          onClick={() => {
            const next = !mostrarFuturas;
            setMostrarFuturas(next);
            setMostrarEletivas(false);
            if (!next) setFuturasQuery('');
          }}
          style={{ marginTop: '12px' }}
        >
          <i className="fi fi-br-rocket calendar__category-icon"></i>
          <span>Matérias Futuras</span>
          {mostrarFuturas && (
            <input
              type="text"
              className="calendar__eletivas-search"
              placeholder="Pesquisar..."
              value={futurasQuery}
              onChange={event => setFuturasQuery(event.target.value)}
              onClick={event => event.stopPropagation()}
            />
          )}
          <i className={`fi fi-br-angle-${mostrarFuturas ? 'down' : 'right'} calendar__toggle-icon`}></i>
        </button>

        {mostrarFuturas && (
          <div className="calendar__materias" style={{ marginTop: '10px' }}>
            {(() => {
              const startSem = Number(semestreAtual) || 1;
              const grupos = {};
              Object.keys(materiasPorSemestre)
                .map(Number)
                .filter(semestre => !Number.isNaN(semestre) && semestre > startSem)
                .sort((a, b) => a - b)
                .forEach(semestre => {
                  const filtered = (materiasPorSemestre[semestre] || []).filter(materia => (
                    !materiasAprovadas.includes(materia.codigo) && !materiasNoCalendario[materia.codigo]
                  ));
                  if (filtered.length > 0) grupos[semestre] = filtered;
                });

              if (Object.keys(grupos).length === 0) {
                return <p className="calendar__no-electives">Nenhuma matéria futura disponível.</p>;
              }

              const renderedGroups = Object.keys(grupos).sort((a, b) => Number(a) - Number(b)).map(key => {
                const semestre = Number(key);
                const query = futurasQuery.toLowerCase().trim();
                const matchingQuery = query
                  ? grupos[key].filter(materia => (materia.nome || '').toLowerCase().includes(query) || (materia.codigo || '').toLowerCase().includes(query))
                  : grupos[key];
                const filteredMaterias = matchingQuery.filter(matchesFilter);

                if (filteredMaterias.length === 0) {
                  if (filtroHorario.ativo && matchingQuery.length > 0) {
                    return (
                      <div key={key} className="calendar__eletiva-group">
                        <h5 className="calendar__eletiva-group-title">{semestre}º Semestre</h5>
                        <div className="calendar__eletiva-group-list">
                          {renderEmptyFilterWarning('futuras')}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }

                return (
                  <div key={key} className="calendar__eletiva-group">
                    <h5 className="calendar__eletiva-group-title">{semestre}º Semestre</h5>
                    <div className="calendar__eletiva-group-list">
                      {filteredMaterias.map(materia => renderMateriaCard(materia, 'futura'))}
                    </div>
                  </div>
                );
              }).filter(Boolean);

              return renderedGroups.length === 0 && filtroHorario.ativo
                ? renderEmptyFilterWarning('futuras')
                : renderedGroups;
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(CalendarSidebar);
