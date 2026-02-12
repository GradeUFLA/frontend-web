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

const DIAS_SEMANA_NOMES = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado'
};

// Verifica se uma matéria é ANP (pela tag anp na turma ou no objeto)
const isAnpMateria = (materia) => {
  if (!materia) return false;
  // Verificar se a matéria ou turma tem flag ANP
  return materia.anp === true || materia.turmaAnp === true;
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

/**
 * Função que verifica se dois horários conflitam (se sobrepõem)
 * @param {Object} horario1 - {dia: number, inicio: number, fim: number}
 * @param {Object} horario2 - {dia: number, inicio: number, fim: number}
 * @returns {boolean} - true se há conflito
 */
const horariosConflitam = (horario1, horario2) => {
  // Normalizar dia para número 0-6
  const dia1 = normalizeDiaValue(horario1.dia);
  const dia2 = normalizeDiaValue(horario2.dia);

  // Se dias são diferentes, não há conflito
  if (dia1 !== dia2 || dia1 === null || dia2 === null) {
    return false;
  }

  // Normalizar horas para números
  const inicio1 = parseHour(horario1.inicio);
  const fim1 = parseHour(horario1.fim);
  const inicio2 = parseHour(horario2.inicio);
  const fim2 = parseHour(horario2.fim);

  // Se alguma hora é inválida, não podemos verificar
  if (inicio1 === null || fim1 === null || inicio2 === null || fim2 === null) {
    return false;
  }

  // Verifica sobreposição de tempo
  // Há conflito se: horario1 começa ANTES de horario2 terminar E horario1 termina DEPOIS de horario2 começar
  return (inicio1 < fim2 && fim1 > inicio2);
};

/**
 * Formata horário para exibição
 */
const formatarHorario = (horario) => {
  const dia = normalizeDiaValue(horario.dia);
  const diaNome = DIAS_SEMANA_NOMES[dia] || 'Dia desconhecido';
  const inicio = parseHour(horario.inicio);
  const fim = parseHour(horario.fim);
  return `${diaNome} das ${inicio}:00 às ${fim}:00`;
};

/**
 * Verifica conflito de horário para matérias normais (não-ANP)
 * @param {Object} materiaToCheck - Matéria que está sendo adicionada (com horarios)
 * @param {Object} materiasState - Objeto com matérias já no calendário
 * @returns {{temConflito: boolean, materiaConflito?: string, horarioConflito?: string}}
 */
const checkConflitoParaMateria = (materiaToCheck, materiasState) => {
  if (!materiaToCheck) return { temConflito: false };

  const isAnpOnlyMateria = (m) => {
    const horarios = m?.horarios || [];
    if (horarios.length === 0) return true;
    return horarios.every(h => normalizeDiaValue(h.dia) === SATURDAY_INDEX);
  };

  // Matérias ANP nunca têm conflito de horário normal (só quando são ANP-only)
  if (isAnpMateria(materiaToCheck) && isAnpOnlyMateria(materiaToCheck)) {
    const nextHour = findNextAnpHour(materiasState);
    if (nextHour === null) {
      return { temConflito: true, mensagem: 'Sem vagas ANP disponíveis no sábado' };
    }
    return { temConflito: false };
  }

  // Pegar os horários da matéria que está sendo adicionada
  const horariosNovos = materiaToCheck.horarios || [];

  // Para cada matéria já na grade
  for (const [codigo, materiaExistente] of Object.entries(materiasState || {})) {
    // Ignorar matérias ANP apenas se forem ANP-only (sem horários em dias úteis)
    if (materiaExistente.anp && isAnpOnlyMateria(materiaExistente)) continue;

    // Pegar os horários da matéria existente
    const horariosExistentes = materiaExistente.horarios || [];

    // Para cada horário da nova matéria
    for (const novoHorario of horariosNovos) {
      if (!novoHorario) continue;

      // Para cada horário da matéria existente
      for (const horarioExistente of horariosExistentes) {
        if (!horarioExistente) continue;

        // Verifica se há conflito
        if (horariosConflitam(novoHorario, horarioExistente)) {
          return {
            temConflito: true,
            materiaConflito: materiaExistente.nome || codigo,
            horarioConflito: formatarHorario(horarioExistente)
          };
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

    // Verificar conflito de forma SÍNCRONA usando o estado atual
    // Verifica se é ANP pela tag
    const isAnp = isAnpMateria(materia);

    if (isAnp) {
      // ANP: verificar se há horário disponível
      const nextHour = findNextAnpHour(materiasNoCalendario);
      if (nextHour === null) {
        addToast('Sem vagas ANP disponíveis no sábado.', 'error');
        return false;
      }

      // Preservar horários originais (seg-sex) + adicionar horário do sábado
      const horariosOriginais = materia.horarios || [];
      const horarioSabado = { dia: SATURDAY_INDEX, inicio: nextHour, fim: nextHour + 1 };

      const toAdd = {
        ...materia,
        anp: true,
        anpHour: nextHour,
        horarios: [...horariosOriginais, horarioSabado]
      };

      setMateriasNoCalendario(prevState => ({ ...prevState, [materia.codigo]: toAdd }));
      return true;
    }

    // Matéria normal: verificar conflito ANTES de adicionar
    const conflitoCheck = checkConflitoParaMateria(materia, materiasNoCalendario);
    if (conflitoCheck.temConflito) {
      const mensagem = conflitoCheck.horarioConflito
        ? `Conflito de horário com "${conflitoCheck.materiaConflito}" - ${conflitoCheck.horarioConflito}`
        : `Conflito de horário com ${conflitoCheck.materiaConflito || conflitoCheck.mensagem}`;
      addToast(mensagem, 'error');
      return false;
    }

    setMateriasNoCalendario(prevState => ({ ...prevState, [materia.codigo]: materia }));
    return true;
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

  // Sempre voltar para a tela inicial ao recarregar a página
  useEffect(() => {
    try {
      window.history.replaceState({ etapa: ETAPAS.INICIO }, document.title, window.location.href);
    } catch (e) {
      // ignore
    }
    setEtapa(ETAPAS.INICIO);
  }, []);

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
            onShowToast={(msg, type) => addToast(msg, type)}
          />
        )}
      </div>
    </>
  );
}

export default App;
