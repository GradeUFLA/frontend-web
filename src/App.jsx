import { useState, useRef, useEffect } from 'react';

// Components
import {
  Particles,
  Hero,
  Historico,
  Calendar,
  MateriaModal,
  ToastContainer,
  useToast
} from './components';
import { AboutMe } from './components';
import SetupWizard from './components/SetupWizard';

// Data
import { getMateriasPorSemestre, getEletivas, ensureCsvLoaded } from './data';

// Styles
import './styles/global.css';

// Etapas do fluxo
const ETAPAS = {
  INICIO: 'inicio',
  SETUP: 'setup',
  HISTORICO: 'historico',
  MONTAGEM: 'montagem'
};

// helper to normalize day values (0=Dom .. 6=Sab)
const normalizeDiaValue = (d) => {
  if (d == null) return null;
  const n = Number(d);
  if (!Number.isNaN(n)) {
    if (n >= 0 && n <= 6) return n;
    if (n >= 1 && n <= 7) return ((n + 6) % 7 + 7) % 7; // map 1..7 => 0..6
  }
  // Normalize strings: lowercase, remove diacritics, take first 3 letters
  const raw = String(d).toLowerCase();
  const normalized = raw.normalize ? raw.normalize('NFD').replace(/\p{Diacritic}/gu, '') : raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const s = normalized.slice(0,3);
  const dias = ['dom','seg','ter','qua','qui','sex','sab'];
  const idx = dias.findIndex(x => x === s);
  return idx !== -1 ? idx : null;
};

// parse hour value safely: accepts number or strings like '08:00' or '8'
const parseHour = (v) => {
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isNaN(n)) return Math.floor(n);
  const s = String(v).trim();
  // match HH or HH:MM
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (m) return parseInt(m[1], 10);
  return null;
};

// ----------------- new helpers for conflict detection (used by App and modal) -----------------
const SATURDAY_INDEX = 6;
const ANP_BASE_HOUR = 9;
const ANP_MAX_SLOTS = 14;
const mapAnpSlotToHorarioIdx = (slot, baseHour = 7) => {
  return (ANP_BASE_HOUR - baseHour) + (Number(slot) - 1);
};
const findFirstAvailableAnpSlotGlobal = (materiasState) => {
  const used = new Set();
  for (const m of Object.values(materiasState || {})) {
    if (m.anpSlot) used.add(Number(m.anpSlot));
  }
  for (let s = 1; s <= ANP_MAX_SLOTS; s++) {
    if (!used.has(s)) return s;
  }
  return null;
};

// returns {temConflito: boolean, materiaConflito?: string, suggestedAnpSlot?: number}
const checkConflitoParaMateria = (materiaToCheck, materiasState) => {
  if (!materiaToCheck || !materiaToCheck.horarios) return { temConflito: false };
  // detect if turma is ANP-only: has saturday and no weekday
  const horarios = materiaToCheck.horarios || [];
  const hasWeekday = horarios.some(h => normalizeDiaValue(h?.dia) !== null && normalizeDiaValue(h?.dia) !== SATURDAY_INDEX);
  const hasSaturday = horarios.some(h => normalizeDiaValue(h?.dia) === SATURDAY_INDEX);
  const isAnp = hasSaturday && !hasWeekday;

  if (isAnp) {
    const slot = findFirstAvailableAnpSlotGlobal(materiasState);
    if (slot === null) return { temConflito: true, mensagem: 'Sem slots ANP disponíveis' };
    return { temConflito: false, suggestedAnpSlot: slot };
  }

  // for non-ANP, check each horario hour-by-hour against existing materias
  for (const horario of horarios) {
    const hdHorario = normalizeDiaValue(horario.dia);
    const inicioHorario = parseHour(horario.inicio);
    const fimHorario = parseHour(horario.fim);
    if (hdHorario == null || Number.isNaN(inicioHorario) || Number.isNaN(fimHorario)) continue;

    for (let hora = inicioHorario; hora < fimHorario; hora++) {
      for (const existing of Object.values(materiasState || {})) {
        // existing may have ANP slot: if it's occupying saturday slot map it to hour range
        if (existing.anpSlot && hdHorario === SATURDAY_INDEX) {
          const slotIdx = mapAnpSlotToHorarioIdx(existing.anpSlot, 7);
          const slotStart = 7 + slotIdx; // since baseHour 7
          const slotEnd = slotStart + 1;
          if (hora >= slotStart && hora < slotEnd) {
            return { temConflito: true, materiaConflito: existing.nome || existing.codigo };
          }
          continue;
        }

        for (const h of (existing.horarios || [])) {
          const hd = normalizeDiaValue(h.dia);
          const hStart = parseHour(h.inicio);
          const hEnd = parseHour(h.fim);
          if (hd == null || Number.isNaN(hStart) || Number.isNaN(hEnd)) continue;
          if (hd === hdHorario && hora >= hStart && hora < hEnd) {
            return { temConflito: true, materiaConflito: existing.nome || existing.codigo };
          }
        }
      }
    }
  }
  return { temConflito: false };
};


function App() {
  const calendarioRef = useRef(null);

  // Estados do sistema
  const [etapa, setEtapa] = useState(ETAPAS.INICIO);
  const [cursoSelecionado, setCursoSelecionado] = useState(null);
  const [matrizSelecionada, setMatrizSelecionada] = useState(null);
  const [semestreAtual, setSemestreAtual] = useState(null);
  const [materiasAprovadas, setMateriasAprovadas] = useState([]);
  const [minimoConfirmados, setMinimoConfirmados] = useState([]); // lista de prereqs 'mínimo' que o usuário confirmou
  const [materiasNoCalendario, setMateriasNoCalendario] = useState({});
  const [modalMateria, setModalMateria] = useState(null);
  const [csvLoaded, setCsvLoaded] = useState(false);
  const [setupInitialStep, setSetupInitialStep] = useState(1);

  // Hook de toast para notificações
  const { toasts, addToast, removeToast } = useToast();

  // Obtém dados do curso selecionado (consultas a curso são feitas nos componentes que precisarem)

  // Usa curso + matriz para obter matérias (por enquanto só curso, depois pode expandir)
  const materiasPorSemestre = cursoSelecionado ? getMateriasPorSemestre(cursoSelecionado, undefined, matrizSelecionada) : {};
  const eletivas = cursoSelecionado ? getEletivas(cursoSelecionado, matrizSelecionada) : [];

  // Handlers de navegação
  const handleGetStartedClick = async () => {
    if (!csvLoaded) {
      await ensureCsvLoaded();
      setCsvLoaded(true);
    }
    // default to first step when starting flow
    setSetupInitialStep(1);
    setEtapa(ETAPAS.SETUP);
    setTimeout(() => {
      calendarioRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSetupComplete = ({ curso, matriz, semestre }) => {
    setCursoSelecionado(curso);
    setMatrizSelecionada(matriz);
    setSemestreAtual(semestre);

    // Por padrão, marca todas as matérias de semestres anteriores como aprovadas
    const materiasCurso = getMateriasPorSemestre(curso, undefined, matriz);
    const materiasAnteriores = [];
    for (let i = 1; i < semestre; i++) {
      const materias = materiasCurso[i] || [];
      materias.forEach(m => materiasAnteriores.push(m.codigo));
    }
    setMateriasAprovadas(materiasAnteriores);

    setEtapa(ETAPAS.HISTORICO);
  };

  const handleVoltarParaInicio = () => {
    // clear calendar when leaving montagem/setup flow
    setMateriasNoCalendario({});
    setEtapa(ETAPAS.INICIO);
  };

  const handleVoltarParaSetup = () => {
    // when requesting to go back to the setup, respect setupInitialStep (already set when navigating from calendar)
    // clear calendar when leaving montagem
    setMateriasNoCalendario({});
    setEtapa(ETAPAS.SETUP);
  };

  const handleVoltarParaHistorico = () => {
    // when going back from calendar to historico, we want the eventual return to SetupWizard to start at the last step
    setSetupInitialStep(3);
    // clear calendar when leaving montagem
    setMateriasNoCalendario({});
    setEtapa(ETAPAS.HISTORICO);
  };

  const handleContinuar = () => {
    setEtapa(ETAPAS.MONTAGEM);
  };

  // Handler para toggle de matéria aprovada
  const handleToggleMateriaAprovada = (codigo) => {
    if (materiasAprovadas.includes(codigo)) {
      // Ao desmarcar, remove também as matérias que dependem dela
      const materiasParaRemover = new Set([codigo]);
      const todasMaterias = [...Object.values(materiasPorSemestre).flat(), ...eletivas];

      // Encontra matérias que dependem da que foi desmarcada
      let tamanhoAnterior = 0;
      while (materiasParaRemover.size !== tamanhoAnterior) {
        tamanhoAnterior = materiasParaRemover.size;
        todasMaterias
          .filter(m =>
            materiasAprovadas.includes(m.codigo) &&
            !materiasParaRemover.has(m.codigo) &&
            m.preRequisitos.some(pr => materiasParaRemover.has(pr))
          )
          .forEach(m => materiasParaRemover.add(m.codigo));
      }

      setMateriasAprovadas(materiasAprovadas.filter(c => !materiasParaRemover.has(c)));
    } else {
      setMateriasAprovadas([...materiasAprovadas, codigo]);
    }
  };

  // Marca um pré-requisito 'mínimo' como confirmado (não é aprovado, apenas ignorado para checagens mínimas)
  const handleConfirmMinimo = (codigo) => {
    setMinimoConfirmados(prev => (prev.includes(codigo) ? prev : [...prev, codigo]));
  };

  // Handlers do calendário
  const handleAddMateria = (materia) => {
    // add returns true on success, false on failure (conflict etc)
    if (!materia) return false;

    const horariosArray = materia.horarios || [];
    const hasAnyWeekday = horariosArray.some(h => {
      const nd = normalizeDiaValue(h?.dia);
      return nd !== null && nd !== SATURDAY_INDEX;
    });

    const hasSaturday = horariosArray.some(h => normalizeDiaValue(h?.dia) === SATURDAY_INDEX);

    // We'll perform an atomic update: check conflicts against the latest state inside the functional updater
    let wasAdded = false;

    setMateriasNoCalendario(prevState => {
      // check conflict against prevState
      const conflitoCheck = checkConflitoParaMateria(materia, prevState);
      if (conflitoCheck.temConflito) {
        const motivo = conflitoCheck.materiaConflito || conflitoCheck.mensagem || 'Conflito de horário';
        addToast(`Conflito de horário: ${motivo}`, 'error');
        wasAdded = false;
        return prevState; // do not modify state
      }

      if (!hasAnyWeekday && horariosArray.length > 0 && hasSaturday) {
        // Build set of occupied saturday hours (consider ALL existing materias)
        const occupied = new Set();
        Object.values(prevState).forEach(m => {
          (m.horarios || []).forEach(h => {
            if (!h) return;
            const nd = normalizeDiaValue(h.dia);
            if (nd === SATURDAY_INDEX) {
              const inicio = parseHour(h.inicio);
              const fim = parseHour(h.fim);
              const startHour = (inicio !== null) ? inicio : 0;
              const endHour = (fim !== null) ? fim : (startHour + 1);
              for (let hour = startHour; hour < endHour; hour++) {
                occupied.add(hour);
              }
            }
          });
          // also account for assigned anpSlot
          if (m.anpSlot) {
            const slotIdx = mapAnpSlotToHorarioIdx(m.anpSlot, 7);
            const slotStart = 7 + slotIdx;
            occupied.add(slotStart);
          }
        });

        // ANP scheduling: allocate 1-hour slots starting at 8:00, using next free hour
        const defaultStart = 8;
        const maxHour = 22; // last start hour allowed
        let chosenStart = null;
        let start = defaultStart;
        while (start <= maxHour) {
          if (!occupied.has(start)) { chosenStart = start; break; }
          start += 1; // next hour
        }

        if (chosenStart === null) {
          addToast('Sem vagas ANP disponíveis no sábado.', 'error');
          wasAdded = false;
          return prevState;
        }

        const horariosNew = [{ dia: 6, inicio: chosenStart, fim: chosenStart + 1 }];
        const toAdd = { ...materia, turmaId: materia.turmaId || 'ANP', horarios: horariosNew };
        wasAdded = true;
        return { ...prevState, [materia.codigo]: toAdd };
      }

      // normal add (from drag selection) - keep all horários (weekday + saturday if present)
      wasAdded = true;
      return { ...prevState, [materia.codigo]: materia };
    });

    return wasAdded;
  };

  const handleRemoveMateria = (codigo) => {
    // Recursively remove dependents that have the removed subject as a co-requirement
    const toRemove = new Set([codigo]);
    let changed = true;

    while (changed) {
      changed = false;
      for (const [c, m] of Object.entries(materiasNoCalendario)) {
        if (toRemove.has(c)) continue;
        const coreqList = (m.preRequisitosDetalhada && m.preRequisitosDetalhada.coreq) || [];
        // Check if any coreq is in toRemove
        let dependsOn = false;
        for (const pr of coreqList) {
          if (toRemove.has(pr)) { dependsOn = true; break; }
        }
        if (dependsOn) {
          toRemove.add(c);
          changed = true;
        }
      }
    }

    // Build new calendar state without the removed subjects
    const novas = { ...materiasNoCalendario };
    const removedDependents = [];
    toRemove.forEach(code => {
      if (novas[code]) {
        if (code !== codigo) removedDependents.push(novas[code].nome || code);
        delete novas[code];
      }
    });

    setMateriasNoCalendario(novas);

    // Notify user about dependents removed (if any)
    if (removedDependents.length > 0) {
      removedDependents.forEach(nome => addToast(`A matéria "${nome}" foi removida porque dependia do co-requisito removido.`, 'error'));
    }
  };

  // Effect para rolar para o calendário quando muda para a etapa de montagem
  useEffect(() => {
    if (etapa === ETAPAS.MONTAGEM) {
      setTimeout(() => {
        calendarioRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [etapa]);

  return (
    <>
      <Particles />
      <div className="app-container">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <AboutMe />
        <div className="calendario-container" ref={calendarioRef}>
          {etapa === ETAPAS.INICIO && (
            <Hero onGetStartedClick={handleGetStartedClick} />
          )}
          {etapa === ETAPAS.SETUP && (
            <SetupWizard
              cursoSelecionado={cursoSelecionado}
              setCursoSelecionado={setCursoSelecionado}
              matrizSelecionada={matrizSelecionada}
              setMatrizSelecionada={setMatrizSelecionada}
              semestreSelecionado={semestreAtual}
              setSemestreSelecionado={setSemestreAtual}
              onComplete={handleSetupComplete}
              initialStep={setupInitialStep}
              onVoltar={handleVoltarParaInicio}
            />
          )}
          {etapa === ETAPAS.HISTORICO && (
            <Historico
              materiasAprovadas={materiasAprovadas}
              materiasPorSemestre={materiasPorSemestre}
              eletivas={eletivas}
              onToggleMateria={handleToggleMateriaAprovada}
              onConfirmMinimo={handleConfirmMinimo}
              onShowToast={(msg, kind) => addToast(msg, kind)}
              onVoltar={handleVoltarParaSetup}
              onContinuar={handleContinuar}
              cursoSelecionado={cursoSelecionado}
              matrizSelecionada={matrizSelecionada}
              semestreAtual={semestreAtual}
            />
          )}
          {etapa === ETAPAS.MONTAGEM && (
            <Calendar
              materiasPorSemestre={materiasPorSemestre}
              eletivas={eletivas}
              materiasAprovadas={materiasAprovadas}
              materiasNoCalendario={materiasNoCalendario}
              onAddMateria={handleAddMateria}
              onRemoveMateria={handleRemoveMateria}
              onVoltar={handleVoltarParaHistorico}
              onContinuar={handleContinuar}
              cursoSelecionado={cursoSelecionado}
              matrizSelecionada={matrizSelecionada}
              semestreAtual={semestreAtual}
             materiasMinimoConfirmadas={minimoConfirmados}
             onConfirmMinimo={handleConfirmMinimo}
             onMateriaClick={(m) => setModalMateria(m)}
            />
          )}
        </div>
        {modalMateria && (
          <MateriaModal
            materia={modalMateria}
            onClose={() => setModalMateria(null)}
            onSave={(novaMateria) => {
              // Add the turma to calendar but do NOT show toast here (modal actions are silent)
              handleAddMateria(novaMateria);
             }}
            materiasAprovadas={materiasAprovadas}
          checkConflito={(m) => checkConflitoParaMateria(m, materiasNoCalendario)}
          onShowToast={(msg, type) => addToast(msg, type)}
          />
        )}
      </div>
    </>
  );
}

export default App;
