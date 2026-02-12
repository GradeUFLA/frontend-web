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

// ----------------- helpers for conflict detection -----------------
const SATURDAY_INDEX = 6;
const ANP_START_HOUR = 9; // ANP começa às 9h

// Verifica se uma matéria é ANP (pela tag anp na turma ou no objeto)
const isAnpMateria = (materia) => {
  if (!materia) return false;
  // Se já tem a flag anp definida
  if (materia.anp === true) return true;
  // Se a turma tem a flag anp
  if (materia.turmaAnp === true) return true;
  return false;
};

// Encontra o primeiro horário disponível para ANP no sábado (9h, 10h, 11h...)
const findNextAnpHour = (materiasState) => {
  const usedHours = new Set();
  for (const m of Object.values(materiasState || {})) {
    if (m.anp && m.anpHour != null) {
      usedHours.add(Number(m.anpHour));
    }
  }
  // Procurar primeiro horário livre começando às 9h
  for (let hour = ANP_START_HOUR; hour <= 22; hour++) {
    if (!usedHours.has(hour)) return hour;
  }
  return null; // Sem horários disponíveis
};

// Verifica conflito de horário para matérias normais (não-ANP)
const checkConflitoParaMateria = (materiaToCheck, materiasState) => {
  if (!materiaToCheck) return { temConflito: false };

  // Matérias ANP nunca têm conflito (são alocadas automaticamente)
  if (isAnpMateria(materiaToCheck)) {
    const nextHour = findNextAnpHour(materiasState);
    if (nextHour === null) {
      return { temConflito: true, mensagem: 'Sem vagas ANP disponíveis no sábado' };
    }
    return { temConflito: false };
  }

  // Para matérias normais: verificar conflito de horários
  const horarios = materiaToCheck.horarios || [];
  for (const horario of horarios) {
    const hdHorario = normalizeDiaValue(horario.dia);
    const inicioHorario = parseHour(horario.inicio);
    const fimHorario = parseHour(horario.fim);
    if (hdHorario == null || Number.isNaN(inicioHorario) || Number.isNaN(fimHorario)) continue;

    for (let hora = inicioHorario; hora < fimHorario; hora++) {
      for (const existing of Object.values(materiasState || {})) {
        // Ignorar matérias ANP (elas ficam no sábado separadas)
        if (existing.anp) continue;

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
  // Inicializa etapa baseado no histórico do navegador (se houver)
  const getInitialEtapa = () => {
    try {
      const state = window.history.state;
      if (state && state.etapa && ETAPAS[state.etapa.toUpperCase()]) {
        return state.etapa;
      }
    } catch (e) {
      // Ignore errors
    }
    return ETAPAS.INICIO;
  };

  const [etapa, setEtapa] = useState(getInitialEtapa);
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

  // Integração com histórico do navegador (botões voltar/avançar)
  useEffect(() => {
    // Inicializa o estado no histórico se ainda não existir
    if (!window.history.state || !window.history.state.etapa) {
      window.history.replaceState({ etapa }, document.title, window.location.href);
    }

    // Handler para quando usuário clica em voltar/avançar
    const handlePopState = (event) => {
      if (event.state && event.state.etapa) {
        const novaEtapa = event.state.etapa;

        // Se estava em MONTAGEM e está saindo, limpa o calendário
        // Evita inconsistências de matérias de um período quando usuário muda de semestre
        if (etapa === ETAPAS.MONTAGEM && novaEtapa !== ETAPAS.MONTAGEM) {
          setMateriasNoCalendario({});
        }

        // Se está voltando para SETUP de HISTORICO ou MONTAGEM, começar na última etapa (seleção de semestre)
        if (novaEtapa === ETAPAS.SETUP && (etapa === ETAPAS.HISTORICO || etapa === ETAPAS.MONTAGEM)) {
          setSetupInitialStep(3);
        }

        // Se está indo do SETUP para INICIO, resetar o setupInitialStep para 1
        if (novaEtapa === ETAPAS.INICIO && etapa === ETAPAS.SETUP) {
          setSetupInitialStep(1);
        }

        setEtapa(novaEtapa);

        // Scroll suave para a seção apropriada
        if (novaEtapa === ETAPAS.MONTAGEM || novaEtapa === ETAPAS.HISTORICO) {
          setTimeout(() => {
            calendarioRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [etapa]);

  // Função helper para mudar de etapa e atualizar o histórico
  const navegarParaEtapa = (novaEtapa) => {
    if (novaEtapa !== etapa) {
      setEtapa(novaEtapa);
      // Adiciona ao histórico do navegador
      window.history.pushState({ etapa: novaEtapa }, document.title, window.location.href);
    }
  };

  // Listen for fallback toast events dispatched by components that can't call addToast directly
  useEffect(() => {
    const handler = (e) => {
      try {
        const detail = e && e.detail ? e.detail : {};
        const message = detail.message || detail.msg || 'Notification';
        const level = detail.level || detail.type || 'info';
        addToast(message, level);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('gradeufla-toast handler error', err);
      }
    };

    window.addEventListener('gradeufla-toast', handler);
    // also expose a direct global function fallback for legacy callers
    // set on window so other modules can call window.gradeuflaAddToast(msg, level)
    // This is cleaned up on unmount
    // eslint-disable-next-line no-undef
    window.gradeuflaAddToast = (msg, level = 'info') => addToast(msg, level);

    return () => {
      window.removeEventListener('gradeufla-toast', handler);
      try { delete window.gradeuflaAddToast; } catch (e) { window.gradeuflaAddToast = undefined; }
    };
  }, [addToast]);

  // Obtém dados do curso selecionado (consultas a curso são feitas nos componentes que precisarem)

  // Usa curso + matriz para obter matérias (por enquanto só curso, depois pode expandir)
  const materiasPorSemestre = cursoSelecionado ? getMateriasPorSemestre(cursoSelecionado, undefined, matrizSelecionada) : {};
  const eletivas = cursoSelecionado ? getEletivas(cursoSelecionado, matrizSelecionada) : [];

  // Criar lista completa de todas as matérias (obrigatórias + eletivas) para verificação de pré-requisitos
  const allMateriasList = [...Object.values(materiasPorSemestre).flat(), ...eletivas];

  // Handlers de navegação
  const handleGetStartedClick = async () => {
    if (!csvLoaded) {
      await ensureCsvLoaded();
      setCsvLoaded(true);
    }
    // default to first step when starting flow
    setSetupInitialStep(1);
    navegarParaEtapa(ETAPAS.SETUP);
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

    navegarParaEtapa(ETAPAS.HISTORICO);
  };

  const handleVoltarParaInicio = () => {
    // clear calendar when leaving montagem/setup flow
    setMateriasNoCalendario({});
    navegarParaEtapa(ETAPAS.INICIO);
  };

  const handleVoltarParaSetup = () => {
    // when requesting to go back to the setup, start at last step (semestre selection)
    setSetupInitialStep(3);
    // clear calendar when leaving montagem
    setMateriasNoCalendario({});
    navegarParaEtapa(ETAPAS.SETUP);
  };

  const handleVoltarParaHistorico = () => {
    // when going back from calendar to historico, we want the eventual return to SetupWizard to start at the last step
    setSetupInitialStep(3);
    // clear calendar when leaving montagem
    setMateriasNoCalendario({});
    navegarParaEtapa(ETAPAS.HISTORICO);
  };

  const handleContinuar = () => {
    navegarParaEtapa(ETAPAS.MONTAGEM);
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
    if (!materia) return false;

    let wasAdded = false;

    setMateriasNoCalendario(prevState => {
      // Verifica se é ANP pela tag
      const isAnp = isAnpMateria(materia);

      if (isAnp) {
        // ANP: alocar no primeiro horário disponível no sábado (9h, 10h, 11h...)
        const nextHour = findNextAnpHour(prevState);
        if (nextHour === null) {
          addToast('Sem vagas ANP disponíveis no sábado.', 'error');
          wasAdded = false;
          return prevState;
        }

        // Preservar horários originais (seg-sex) + adicionar horário do sábado
        const horariosOriginais = materia.horarios || [];
        const horarioSabado = { dia: SATURDAY_INDEX, inicio: nextHour, fim: nextHour + 1 };

        const toAdd = {
          ...materia,
          anp: true,
          anpHour: nextHour,
          horarios: [...horariosOriginais, horarioSabado]  // Preserva originais + adiciona sábado
        };
        wasAdded = true;
        return { ...prevState, [materia.codigo]: toAdd };
      }

      // Matéria normal: verificar conflito
      const conflitoCheck = checkConflitoParaMateria(materia, prevState);
      if (conflitoCheck.temConflito) {
        wasAdded = false;
        return prevState;
      }

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
              onShowToast={(msg, type) => addToast(msg, type)}
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
            onRemove={(codigo) => {
              // Remove matéria do calendário
              setMateriasNoCalendario(prev => {
                const updated = { ...prev };
                delete updated[codigo];
                return updated;
              });
            }}
            materiasAprovadas={materiasAprovadas}
            materiasNoCalendario={materiasNoCalendario}
            materiasMinimoConfirmadas={minimoConfirmados}
            allMateriasList={allMateriasList}
            checkConflito={(m) => checkConflitoParaMateria(m, materiasNoCalendario)}
            onShowToast={(msg, type) => addToast(msg, type)}
          />
        )}
      </div>
    </>
  );
}

export default App;
