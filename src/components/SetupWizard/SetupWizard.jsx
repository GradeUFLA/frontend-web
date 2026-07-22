import { forwardRef, useState, useEffect } from 'react';
import Stepper, { Step } from '../Stepper';
import Dropdown from '../Dropdown';
import {
  ensureCsvLoaded,
  getCsvLoadState,
  getCursoInfo,
  getCursosImplementados,
  getMatrizesByCurso,
  getTotalSemestres,
  retryCsvLoad,
  subscribeCsvLoadState
} from '../../data';
import './SetupWizard.css';

const SetupWizard = forwardRef(({
  onComplete,
  onVoltar,
  onShowToast,
  initialStep = 1,
  // controlled values from App so they persist between mounts
  cursoSelecionado,
  setCursoSelecionado,
  matrizSelecionada,
  setMatrizSelecionada,
  semestreSelecionado,
  setSemestreSelecionado
}, ref) => {
  const [dropdownError, setDropdownError] = useState(false);
  const [csvLoadState, setCsvLoadState] = useState(getCsvLoadState);

  useEffect(() => {
    const unsubscribe = subscribeCsvLoadState(setCsvLoadState);
    const currentState = getCsvLoadState();
    setCsvLoadState(currentState);
    if (currentState.status === 'idle') {
      ensureCsvLoaded().catch(() => {
        // O estado central mantém o erro para exibição e retry.
      });
    }
    return unsubscribe;
  }, []);

  const cursoInfo = cursoSelecionado ? getCursoInfo(cursoSelecionado) : null;
  const dataReady = csvLoadState.status === 'success';
  const matrizes = cursoSelecionado && dataReady ? getMatrizesByCurso(cursoSelecionado) : [];

  // Filtra apenas cursos implementados (CSV loader defaults to implemented=true)
  const cursosImplementados = dataReady ? getCursosImplementados() : [];

  const cursosOptions = cursosImplementados.map((curso) => ({
    value: curso.id,
    label: `${curso.id} - ${curso.nome}`
  }));

  const matrizesOptions = matrizes.map((matriz) => ({
    value: matriz.id,
    label: `Matriz ${matriz.nome}`
  }));

  // Use getTotalSemestres with the selected matriz for accurate semester count
  const totalSemestresParaMatriz = cursoSelecionado && matrizSelecionada
    ? getTotalSemestres(cursoSelecionado, matrizSelecionada)
    : (cursoInfo ? cursoInfo.totalSemestres : 8);

  const semestresOptions = totalSemestresParaMatriz
    ? [...Array(totalSemestresParaMatriz)].map((_, i) => ({
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
    // Use the values controlled by the parent (App)
    if (cursoSelecionado && matrizSelecionada && semestreSelecionado) {
      onComplete({
        curso: cursoSelecionado,
        matriz: matrizSelecionada,
        semestre: semestreSelecionado
      });
    }
  };

  const handleRetryCsv = () => {
    retryCsvLoad().catch(() => {
      // O estado central será atualizado e manterá a mensagem de erro visível.
    });
  };

  return (
    <section className="setup-wizard" ref={ref}>
      <button className="btn-voltar" onClick={onVoltar}>
        <i className="fi fi-br-arrow-left"></i>
        <span className="btn-voltar__text">Voltar</span>
      </button>

      {!dataReady ? (
        <div
          className={`setup-wizard__data-state ${csvLoadState.status === 'error' ? 'setup-wizard__data-state--error' : ''}`}
          role={csvLoadState.status === 'error' ? 'alert' : 'status'}
        >
          {csvLoadState.status === 'error' ? (
            <>
              <h2>Não foi possível carregar os dados acadêmicos</h2>
              <p>Verifique sua conexão e tente novamente.</p>
              <button className="btn-primary" type="button" onClick={handleRetryCsv}>
                Tentar novamente
              </button>
            </>
          ) : (
            <>
              <h2>Carregando dados acadêmicos…</h2>
              <p>Preparando cursos, matrizes e disciplinas.</p>
            </>
          )}
        </div>
      ) : (
        <Stepper
          initialStep={initialStep}
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
              label="Curso"
              error={dropdownError && !cursoSelecionado}
              searchable={true}
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
              label="Matriz curricular"
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
              label="Semestre"
              error={dropdownError && !semestreSelecionado}
            />
          </Step>
        </Stepper>
      )}
    </section>
  );
});

SetupWizard.displayName = 'SetupWizard';

export default SetupWizard;
