import { forwardRef, useState, useRef } from 'react';
import {
  verificarPreRequisitos,
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

// Gera horários de 6h até 23h
const gerarHorarios = (start = 6, end = 23) => {
  const horarios = [];
  for (let h = start; h <= end; h++) {
    horarios.push(`${h.toString().padStart(2, '0')}:00`);
  }
  return horarios;
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
  onShowToast
}, ref) => {
  const [mostrarEletivas, setMostrarEletivas] = useState(false);
  const [draggingMateria, setDraggingMateria] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTurmaIndex, setSelectedTurmaIndex] = useState(null);

  const calendarTableRef = useRef(null);

  // generate hours from 06:00 to 23:00
  const horarios = gerarHorarios(6, 23);
  const baseHour = 6; // used to compute numeric hour from index

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

    const eletivasDisponiveis = mostrarEletivas ? eletivas.filter(e => {
      const { cumprido } = verificarPreRequisitos(e, materiasAprovadas);
      return cumprido;
    }) : [];

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
      for (const h of (materiaData.horarios || [])) {
        if (!h) continue;
        const hd = normalizeDia(h.dia);
        if (hd === diaIdx && hora >= h.inicio && hora < h.fim) {
          found.push({ ...materiaData, codigo });
          break; // avoid duplicate push for same materia
        }
      }
    }
    return found; // possibly empty array
  };

  // Verifica se os horários de uma turma conflitam com matérias já no calendário
  const verificarConflito = (horarios) => {
    for (const horario of horarios) {
      const hdHorario = normalizeDia(horario.dia);
      for (let hora = horario.inicio; hora < horario.fim; hora++) {
        for (const materia of Object.values(materiasNoCalendario)) {
          for (const h of materia.horarios || []) {
            const hd = normalizeDia(h.dia);
            if (hd === hdHorario && hora >= h.inicio && hora < h.fim) {
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
      for (const h of (turma.horarios || [])) {
        const hd = normalizeDia(h.dia);
        if (hd === diaIdx && hora >= h.inicio && hora < h.fim) {
          return i;
        }
      }
    }
    return -1;
  };

  // Inicia o drag
  const handleDragStart = (e, materia) => {
    const { cumprido, faltando } = verificarPreRequisitos(materia, materiasAprovadas);
    if (!cumprido) {
      onShowToast?.(`Pré-requisitos não cumpridos: ${faltando.map(f => getNomeMateria(f)).join(', ')}`, 'error');
      return;
    }

    if (materiasNoCalendario[materia.codigo]) {
      return;
    }

    e.preventDefault();

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

    // Verifica se soltou dentro do calendário e tem uma turma selecionada
    const calendarTable = calendarTableRef.current;
    if (calendarTable && selectedTurmaIndex !== null) {
      const rect = calendarTable.getBoundingClientRect();
      const isInsideCalendar =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (isInsideCalendar) {
        const turma = draggingMateria.turmas[selectedTurmaIndex];
        const { temConflito, materiaConflito } = verificarConflito(turma.horarios);

        if (temConflito) {
          onShowToast?.(`Conflito de horário com ${materiaConflito}!`, 'error');
        } else {
          // Adiciona a matéria com a turma selecionada
          onAddMateria({
            ...draggingMateria,
            turmaId: turma.id,
            horarios: turma.horarios
          });
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
      for (const h of (turma.horarios || [])) {
        const hd = normalizeDia(h.dia);
        if (hd === diaIdx && hora >= h.inicio && hora < h.fim) {
          const { temConflito } = verificarConflito(turma.horarios || []);
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

  // ---------- NEW: Export to Google Calendar (.ics) helpers ----------
  const pad = (n) => String(n).padStart(2, '0');

  const parseHour = (h) => {
    // support number (8) or string '08:00' or '8:00'
    if (h == null) return { hour: 0, minute: 0 };
    if (typeof h === 'number') return { hour: Math.floor(h), minute: Math.round((h - Math.floor(h)) * 60) };
    if (typeof h === 'string') {
      const parts = h.split(':');
      return { hour: Number(parts[0]) || 0, minute: Number(parts[1]) || 0 };
    }
    return { hour: 0, minute: 0 };
  };

  const getNextDateForWeekday = (weekday /*0=Dom..6=Sáb*/, hour = 8, minute = 0) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayWeekday = today.getDay();
    let diff = weekday - todayWeekday;
    if (diff < 0) diff += 7;
    const result = new Date(today);
    result.setDate(today.getDate() + diff);
    result.setHours(hour, minute, 0, 0);
    return result;
  };

  const formatDateTimeLocal = (date) => {
    // Format: YYYYMMDDTHHMMSS
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  };

  const buildICS = (entries, weeks = 16) => {
    // entries: object mapping codigo -> materia data (with horarios array)
    const lines = [];
    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//GradeUFLA//Grade Export//EN');
    lines.push('CALSCALE:GREGORIAN');

    for (const [codigo, m] of Object.entries(entries)) {
      const titulo = `${m.nome}`;
      const descricao = `Código: ${codigo} | Turma: ${m.turmaId || ''} | Créditos: ${m.creditos || ''}`;

      // For each horario of the materia, create an event with weekly recurrence
      for (const h of (m.horarios || [])) {
        if (!h) continue;
        const dia = normalizeDia(h.dia); // 0..6
        if (typeof dia !== 'number' || dia < 0 || dia > 6) continue;

        const { hour, minute } = parseHour(h.inicio ?? h.start ?? h.hour ?? 0);
        const { hour: hourEnd, minute: minuteEnd } = parseHour(h.fim ?? h.end ?? (h.inicio ? Number(h.inicio) + 1 : 1));

        const startDate = getNextDateForWeekday(dia, hour, minute);
        const endDate = new Date(startDate);
        endDate.setHours(hourEnd, minuteEnd, 0, 0);

        const dtstart = formatDateTimeLocal(startDate);
        const dtend = formatDateTimeLocal(endDate);

        // Use RRULE weekly for number of occurrences (weeks)
        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${codigo}-${m.turmaId || '0'}-${dia}-${hour}-${minute}@gradeufla`);
        // Use timezone label; Google understands floating times but we'll include TZID as São Paulo
        lines.push(`DTSTART;TZID=America/Sao_Paulo:${dtstart}`);
        lines.push(`DTEND;TZID=America/Sao_Paulo:${dtend}`);
        lines.push(`RRULE:FREQ=WEEKLY;COUNT=${weeks}`);
        lines.push(`SUMMARY:${escapeICSText(titulo)}`);
        lines.push(`DESCRIPTION:${escapeICSText(descricao)}`);
        lines.push('STATUS:CONFIRMED');
        lines.push('END:VEVENT');
      }
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  };

  function escapeICSText(txt = '') {
    return String(txt).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\,');
  }

  const exportToICS = (weeks = 16) => {
    if (!materiasNoCalendario || Object.keys(materiasNoCalendario).length === 0) {
      onShowToast?.('Não há disciplinas no calendário para exportar.', 'info');
      return;
    }

    try {
      const ics = buildICS(materiasNoCalendario, weeks);
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grade-ufla.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // Open Google Calendar import page in new tab (user still needs to upload the .ics file)
      window.open('https://calendar.google.com/calendar/u/0/r/import', '_blank');
      onShowToast?.('Arquivo .ics gerado. Abra a aba do Google Calendar e importe o arquivo.', 'success');
    } catch (err) {
      console.error('Erro ao gerar .ics', err);
      onShowToast?.('Erro ao gerar arquivo .ics', 'error');
    }
  };

  const totalCreditos = Object.values(materiasNoCalendario).reduce((acc, m) => acc + m.creditos, 0);
  const { obrigatorias, pendentes, eletivas: eletivasDisponiveis } = getMateriasDisponiveis();

  const renderMateriaCard = (materia, tipo = 'obrigatoria') => {
    const jaNoCalendario = materiasNoCalendario[materia.codigo];
    const { cumprido, faltando } = verificarPreRequisitos(materia, materiasAprovadas);
    const isBeingDragged = isDragging && draggingMateria?.codigo === materia.codigo;

    if (jaNoCalendario) return null;

    const cardClasses = [
      'materia-card',
      tipo === 'pendente' && 'materia-card--pending',
      tipo === 'eletiva' && 'materia-card--elective',
      !cumprido && 'materia-card--blocked',
      isBeingDragged && 'materia-card--dragging-origin'
    ].filter(Boolean).join(' ');

    return (
      <div
        key={materia.codigo}
        className={cardClasses}
        onMouseDown={(e) => cumprido && handleDragStart(e, materia)}
        onClick={() => {
          // clicking the card (not the info button) opens the modal; if it's being dragged, ignore click
          if (isBeingDragged) return;
          onMateriaClick?.(materia);
        }}
        style={{
          borderLeftColor: getCorMateria(materia.codigo),
          cursor: cumprido ? 'grab' : 'not-allowed'
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
          <span className="materia-card__credits">{materia.creditos} créd</span>
          <span className="materia-card__turmas-count">{materia.turmas.length} turma{materia.turmas.length > 1 ? 's' : ''}</span>
        </div>
        {tipo === 'pendente' && materia.semestreOriginal && (
          <span className="materia-card__semester-badge">{materia.semestreOriginal}º Sem</span>
        )}
        {!cumprido && (
          <div className="materia-card__blocked-info">
            <i className="fi fi-br-lock"></i> Falta: {faltando.map(f => getNomeMateria(f)).join(', ')}
          </div>
        )}
      </div>
    );
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
        <i className="fi fi-br-arrow-left"></i> Voltar
      </button>

      <div className="calendar__layout">
        {/* Sidebar de matérias */}
        <div className="calendar__sidebar">
          <div className="calendar__sidebar-header">
            <h3><i className="fi fi-br-book-alt"></i> Matérias Disponíveis</h3>
            <div className="calendar__credits">
              <span>Créditos: <strong>{totalCreditos}</strong></span>
            </div>
          </div>

          <p className="calendar__instructions">
            Arraste uma matéria e solte no horário desejado
          </p>

          {/* Matérias Obrigatórias do Semestre */}
          <div className="calendar__category">
            <h4 className="calendar__category-title">
              <i className="fi fi-br-bookmark calendar__category-icon"></i>
              Obrigatórias ({semestreAtual}º Sem)
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
              onClick={() => setMostrarEletivas(!mostrarEletivas)}
            >
              <i className="fi fi-br-bullseye-pointer calendar__category-icon"></i>
              <span>Eletivas</span>
              <i className={`fi fi-br-angle-${mostrarEletivas ? 'down' : 'right'} calendar__toggle-icon`}></i>
            </button>

            {mostrarEletivas && (
              <div className="calendar__materias" style={{ marginTop: '10px' }}>
                {eletivasDisponiveis.length === 0 ? (
                  <p className="calendar__no-electives">
                    Nenhuma eletiva disponível com os pré-requisitos cumpridos.
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
                      // if CSV already contains 'Subgrupo' prefix, don't duplicate
                      const title = /subgrupo/i.test(label) ? label : `Subgrupo: ${label}`;
                      return (
                        <div key={key} className="calendar__eletiva-group">
                          <h5 className="calendar__eletiva-group-title">{title}</h5>
                          <div className="calendar__eletiva-group-list">
                            {groups[key].map(materia => renderMateriaCard(materia, 'eletiva'))}
                          </div>
                        </div>
                      );
                    });
                  })()
                 )}
               </div>
             )}
          </div>
        </div>

        {/* Calendário */}
        <div className="calendar__wrapper">
          <div className="calendar__title-container">
            <h2 className="calendar__title">Sua Grade - {semestreAtual}º Semestre</h2>

            {/* Export button */}
            <div className="calendar__export">
              <button className="btn-export" onClick={() => exportToICS(16)} title="Exportar para Google Calendar">
                <i className="fi fi-br-calendar"></i> Exportar p/ Google Calendar
              </button>
            </div>

            {/* Popup flutuante - Legenda das turmas durante o drag */}
            {isDragging && draggingMateria && (
              <div className="calendar__turmas-popup">
                <span className="calendar__turmas-popup-title">Escolha uma turma:</span>
                <div className="calendar__turmas-popup-items">
                  {(draggingMateria.turmas || []).map((turma, index) => {
                    const { temConflito } = verificarConflito(turma.horarios || []);
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
                          onMouseEnter={() => handleCellHover(indexHora, indexDia)}
                        >
                          {materiasEmCelula.length > 0 && (
                            <div className="calendar__cell-subjects">
                              {materiasEmCelula.map((mec) => (
                                <div
                                  key={mec.codigo}
                                  className="calendar__cell-subject"
                                  onClick={(e) => {
                                    // clicking the subject in the calendar opens the modal; stop propagation to avoid other handlers
                                    e.stopPropagation();
                                    onMateriaClick?.(mec);
                                  }}
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
    </section>
  );
});

Calendar.displayName = 'Calendar';

export default Calendar;
