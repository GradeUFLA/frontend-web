import { useState, useRef } from 'react';

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
import { getMateriasPorSemestre, getEletivas } from './data';
import { getCursoById } from './data/cursos';

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

  // Hook de toast para notificações
  const { toasts, addToast, removeToast } = useToast();

  // Obtém dados do curso selecionado
  const cursoInfo = cursoSelecionado ? getCursoById(cursoSelecionado) : null;

  // Usa curso + matriz para obter matérias (por enquanto só curso, depois pode expandir)
  const materiasPorSemestre = cursoSelecionado ? getMateriasPorSemestre(cursoSelecionado) : {};
  const eletivas = cursoSelecionado ? getEletivas(cursoSelecionado) : [];

  // Handlers de navegação
  const handleGetStartedClick = () => {
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
    const materiasCurso = getMateriasPorSemestre(curso);
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
    setEtapa(ETAPAS.SETUP);
  };

  const handleVoltarParaHistorico = () => {
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
    setMateriasNoCalendario({
      ...materiasNoCalendario,
      [materia.codigo]: materia
    });
  };

  const handleRemoveMateria = (codigo) => {
    const novasMaterias = { ...materiasNoCalendario };
    delete novasMaterias[codigo];
    setMateriasNoCalendario(novasMaterias);
  };

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
          onShowToast={addToast}
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

