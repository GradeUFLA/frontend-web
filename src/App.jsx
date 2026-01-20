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
    setEtapa(ETAPAS.INICIO);
  };

  const handleVoltarParaSetup = () => {
    // when requesting to go back to the setup, respect setupInitialStep (already set when navigating from calendar)
    setEtapa(ETAPAS.SETUP);
  };

  const handleVoltarParaHistorico = () => {
    // when going back from calendar to historico, we want the eventual return to SetupWizard to start at the last step
    setSetupInitialStep(3);
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
    const hasAnyWeekday = horariosArray.some(h => h && h.dia !== 6);

    if (!hasAnyWeekday && horariosArray.length > 0 && horariosArray.some(h => h && h.dia === 6)) {
      // Build set of occupied saturday hours (consider ALL existing materias)
      const occupied = new Set();
      Object.values(materiasNoCalendario).forEach(m => {
        (m.horarios || []).forEach(h => {
          if (h && h.dia === 6) {
            for (let hour = h.inicio; hour < h.fim; hour++) occupied.add(hour);
          }
        });
      });

      // ANP defaults
      const defaultStart = 9;
      const duration = 2;
      let start = defaultStart;
      const maxStart = 22 - duration + 1;
      let chosenStart = null;

      while (start <= maxStart) {
        let conflict = false;
        for (let hh = start; hh < start + duration; hh++) {
          if (occupied.has(hh)) { conflict = true; break; }
        }
        if (!conflict) { chosenStart = start; break; }
        start += duration; // move to next block
      }

      if (chosenStart === null) {
        chosenStart = defaultStart; // fallback
      }

      const horarios = [{ dia: 6, inicio: chosenStart, fim: chosenStart + duration }];
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
