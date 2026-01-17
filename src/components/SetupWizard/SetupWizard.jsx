import { forwardRef, useState } from 'react';
import Stepper, { Step } from '../Stepper';
import Dropdown from '../Dropdown';
import { cursos, getCursoById, getMatrizesByCurso } from '../../data/cursos';
import './SetupWizard.css';

const SetupWizard = forwardRef(({ onComplete, onVoltar, onShowToast }, ref) => {
  const [cursoSelecionado, setCursoSelecionado] = useState(null);
  const [matrizSelecionada, setMatrizSelecionada] = useState(null);
  const [semestreSelecionado, setSemestreSelecionado] = useState(null);
  const [dropdownError, setDropdownError] = useState(false);

  const cursoInfo = cursoSelecionado ? getCursoById(cursoSelecionado) : null;
  const matrizes = cursoSelecionado ? getMatrizesByCurso(cursoSelecionado) : [];

  // Filtra apenas cursos implementados
  const cursosImplementados = cursos.filter(c => c.implementado);

  const cursosOptions = cursosImplementados.map((curso) => ({
    value: curso.id,
    label: `${curso.id} - ${curso.nome} (${curso.tipo})`
  }));

  const matrizesOptions = matrizes.map((matriz) => ({
    value: matriz.id,
    label: `Matriz ${matriz.nome}`
  }));

  const semestresOptions = cursoInfo
    ? [...Array(cursoInfo.totalSemestres)].map((_, i) => ({
        value: i + 1,
        label: `${i + 1}º Módulo`
      }))
    : [];

  const validateStep = (step) => {
    setDropdownError(false);

    if (step === 1 && !cursoSelecionado) {
      return false;
    }
    if (step === 2 && !matrizSelecionada) {
      return false;
    }
    if (step === 3 && !semestreSelecionado) {
      return false;
    }
    return true;
  };

  const handleValidationError = (step) => {
    setDropdownError(true);
    setTimeout(() => setDropdownError(false), 2000);

    // Vibração do dispositivo (se suportado)
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    let message = '';
    if (step === 1) message = 'Selecione um curso para continuar';
    if (step === 2) message = 'Selecione uma matriz curricular para continuar';
    if (step === 3) message = 'Selecione um semestre para continuar';

    onShowToast?.(message, 'error');
  };

  const handleStepChange = (step) => {
    setDropdownError(false);
    // Reset dependent selections when going back
    if (step === 1) {
      setMatrizSelecionada(null);
      setSemestreSelecionado(null);
    } else if (step === 2) {
      setSemestreSelecionado(null);
    }
  };

  const handleFinalStepCompleted = () => {
    if (cursoSelecionado && matrizSelecionada && semestreSelecionado) {
      onComplete({
        curso: cursoSelecionado,
        matriz: matrizSelecionada,
        semestre: semestreSelecionado
      });
    }
  };

  return (
    <section className="setup-wizard" ref={ref}>
      <button className="btn-voltar" onClick={onVoltar}>
        <i className="fi fi-br-arrow-left"></i> Voltar
      </button>

      <Stepper
        initialStep={1}
        onStepChange={handleStepChange}
        onFinalStepCompleted={handleFinalStepCompleted}
        backButtonText="Voltar"
        nextButtonText="Continuar"
        validateStep={validateStep}
        onValidationError={handleValidationError}
      >
        <Step>
          <h2>Qual é o seu curso?</h2>
          <p>Selecione o curso que você está cursando</p>
          <Dropdown
            options={cursosOptions}
            value={cursoSelecionado}
            onChange={setCursoSelecionado}
            placeholder="Selecione o Curso"
            error={dropdownError && !cursoSelecionado}
          />
        </Step>

        <Step>
          <h2>Qual é a sua matriz curricular?</h2>
          <p>Selecione a matriz curricular do curso{cursoInfo ? ` de ${cursoInfo.nome}` : ''}</p>
          <Dropdown
            options={matrizesOptions}
            value={matrizSelecionada}
            onChange={setMatrizSelecionada}
            placeholder="Selecione a Matriz"
            error={dropdownError && !matrizSelecionada}
          />
        </Step>

        <Step>
          <h2>Qual semestre você está?</h2>
          <p>Selecione o semestre que você vai cursar</p>
          <Dropdown
            options={semestresOptions}
            value={semestreSelecionado}
            onChange={setSemestreSelecionado}
            placeholder="Selecione o Semestre"
            error={dropdownError && !semestreSelecionado}
          />
        </Step>
      </Stepper>
    </section>
  );
});

SetupWizard.displayName = 'SetupWizard';

export default SetupWizard;

