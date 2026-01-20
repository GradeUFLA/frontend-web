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


function App() {
  const calendarioRef = useRef(null);

  // Estados do sistema
  const [etapa, setEtapa] = useState(ETAPAS.INICIO);
  const [cursoSelecionado, setCursoSelecionado] = useState(null);
  const [matrizSelecionada, setMatrizSelecionada] = useState(null);
  const [semestreAtual, setSemestreAtual] = useState(null);
  const [materiasAprovadas, setMateriasAprovadas] = useState([]);
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

  // Handlers do calendário
  const handleAddMateria = (materia) => {
    // If the selected turma has only saturday horários (ANP-only), auto-place on the next free saturday block.
    // But if the turma includes weekday horários as well, keep all horários as provided.
    const horariosArray = materia.horarios || [];
    const hasAnyWeekday = horariosArray.some(h => {
      const nd = normalizeDiaValue(h?.dia);
      return nd !== null && nd !== 6;
    });

    const hasSaturday = horariosArray.some(h => normalizeDiaValue(h?.dia) === 6);

    if (!hasAnyWeekday && horariosArray.length > 0 && hasSaturday) {
      // Build set of occupied saturday hours (consider ALL existing materias)
      const occupied = new Set();
      Object.values(materiasNoCalendario).forEach(m => {
        (m.horarios || []).forEach(h => {
          if (!h) return;
          const nd = normalizeDiaValue(h.dia);
          if (nd === 6) {
            const inicio = parseHour(h.inicio);
            const fim = parseHour(h.fim);
            const startHour = (inicio !== null) ? inicio : 0;
            const endHour = (fim !== null) ? fim : (startHour + 1);
            for (let hour = startHour; hour < endHour; hour++) {
              occupied.add(hour);
            }
          }
        });
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

      if (chosenStart === null) chosenStart = defaultStart;

      const horarios = [{ dia: 6, inicio: chosenStart, fim: chosenStart + 1 }];
      const toAdd = { ...materia, turmaId: materia.turmaId || 'ANP', horarios };
      setMateriasNoCalendario(prev => ({ ...prev, [materia.codigo]: toAdd }));
      return;
    }

    // normal add (from drag selection) - keep all horários (weekday + saturday if present)
    setMateriasNoCalendario(prev => ({
      ...prev,
      [materia.codigo]: materia
    }));
  };

  const handleRemoveMateria = (codigo) => {
    const novasMaterias = { ...materiasNoCalendario };
    delete novasMaterias[codigo];
    setMateriasNoCalendario(novasMaterias);
  };

  // Aguarda o carregamento do CSV antes de renderizar o aplicativo
  useEffect(() => {
    const loadData = async () => {
      await ensureCsvLoaded();
      setCsvLoaded(true);
    };

    loadData();
  }, []);

  return (
    <div className="App">
      {/* Background de partículas */}
      <div className="particles-background">
        <Particles
          particleColors={['#00F0B5', '#00d9a4']}
          particleCount={200}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={100}
          moveParticlesOnHover={true}
          particleHoverFactor={2}
          alphaParticles={false}
          disableRotation={false}
        />
      </div>

      {/* Hero Section - sempre visível quando na etapa inicial */}
      {etapa === ETAPAS.INICIO && (
        <Hero
          onGetStartedClick={handleGetStartedClick}
        />
      )}

      {/* Setup Wizard (Curso, Matriz, Semestre) */}
      {etapa === ETAPAS.SETUP && (
        <SetupWizard
          ref={calendarioRef}
          onComplete={handleSetupComplete}
          onVoltar={handleVoltarParaInicio}
          initialStep={setupInitialStep}
          onShowToast={addToast}
          cursoSelecionado={cursoSelecionado}
          setCursoSelecionado={setCursoSelecionado}
          matrizSelecionada={matrizSelecionada}
          setMatrizSelecionada={setMatrizSelecionada}
          semestreSelecionado={semestreAtual}
          setSemestreSelecionado={setSemestreAtual}
        />
      )}

      {/* Histórico de Matérias Aprovadas */}
      {etapa === ETAPAS.HISTORICO && (
        <Historico
          ref={calendarioRef}
          semestreAtual={semestreAtual}
          materiasAprovadas={materiasAprovadas}
          materiasPorSemestre={materiasPorSemestre}
          onToggleMateria={handleToggleMateriaAprovada}
          onVoltar={handleVoltarParaSetup}
          onContinuar={handleContinuar}
          onShowToast={addToast}
        />
      )}

      {/* Montagem do Calendário */}
      {etapa === ETAPAS.MONTAGEM && (
        <Calendar
          ref={calendarioRef}
          semestreAtual={semestreAtual}
          materiasAprovadas={materiasAprovadas}
          materiasPorSemestre={materiasPorSemestre}
          eletivas={eletivas}
          materiasNoCalendario={materiasNoCalendario}
          onAddMateria={handleAddMateria}
          onRemoveMateria={handleRemoveMateria}
          onMateriaClick={setModalMateria}
          onVoltar={handleVoltarParaHistorico}
          onShowToast={addToast}
        />
      )}

      {/* Modal de detalhes da matéria */}
      {modalMateria && (
        <MateriaModal
          materia={modalMateria}
          materiasAprovadas={materiasAprovadas}
          onClose={() => setModalMateria(null)}
        />
      )}

      {/* Toast de notificações */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default App;
