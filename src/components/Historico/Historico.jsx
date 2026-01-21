import { forwardRef, useState } from 'react';
import { verificarPreRequisitosDetalhada, getNomeMateria } from '../../data';
import './Historico.css';

const Historico = forwardRef(({
  semestreAtual,
  materiasAprovadas,
  materiasPorSemestre,
  onToggleMateria,
  onVoltar,
  onContinuar,
  onShowToast
}, ref) => {
  const [shakingMateria, setShakingMateria] = useState(null);

  const handleToggle = (materia) => {
    const isChecked = materiasAprovadas.includes(materia.codigo);

    // Se está tentando marcar (não está marcada ainda)
    if (!isChecked) {
      // Verifica se tem pré-requisitos não cumpridos (detalhado)
      const det = verificarPreRequisitosDetalhada(materia, materiasAprovadas, {});

      if (det.faltandoForte && det.faltandoForte.length > 0) {
        // Dispara animação de shake
        setShakingMateria(materia.codigo);
        setTimeout(() => setShakingMateria(null), 500);

        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

        const nomes = det.faltandoForte.map(f => getNomeMateria(f)).join(', ');
        onShowToast?.(`É necessário fazer ${nomes} antes (pré-requisito forte)`, 'error');
        return;
      }

      if (det.faltandoMinimo && det.faltandoMinimo.length > 0) {
        const nomes = det.faltandoMinimo.map(f => getNomeMateria(f)).join(', ');
        const confirmed = window.confirm(`Você já cursou ${nomes} e obteve média mínima? Se sim, confirme para marcar como feita.`);
        if (!confirmed) {
          onShowToast?.(`Necessário ter cursado: ${nomes} (mínimo).`, 'warn');
          return;
        }
      }

      if (det.faltandoCoreq && det.faltandoCoreq.length > 0) {
        const nomes = det.faltandoCoreq.map(f => getNomeMateria(f)).join(', ');
        onShowToast?.(`Co-requisito(s) necessários: ${nomes}. Marque a co-requisito no calendário primeiro.`, 'warn');
        return;
      }
    }

    // Se passou na validação ou está desmarcando, faz o toggle
    onToggleMateria(materia.codigo);
  };

  return (
    <section className="historico" ref={ref}>
      <div className="historico__container">
        <h2 className="historico__title">Matérias</h2>
        <p className="historico__subtitle">
          Desmarque as matérias que você ainda NÃO cursou
        </p>

        <div className="historico__grid">
          {[...Array(semestreAtual - 1)].map((_, semIdx) => {
            const sem = semIdx + 1;
            const materias = materiasPorSemestre[sem] || [];

            return (
              <div key={sem} className="historico__semestre">
                <h3 className="historico__semestre-titulo">{sem}º Semestre</h3>
                <div className="historico__materias">
                  {materias.map(materia => {
                    const isShaking = shakingMateria === materia.codigo;
                    const isChecked = materiasAprovadas.includes(materia.codigo);

                    return (
                      <label
                        key={materia.codigo}
                        className={`historico__materia ${isShaking ? 'historico__materia--shake' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggle(materia)}
                        />
                        <span className="historico__checkbox"></span>
                        <span className="historico__materia-nome">{materia.nome}</span>
                        <span className="historico__materia-codigo">{materia.codigo}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {semestreAtual === 1 && (
          <p className="historico__info">
            Como você está no 1º semestre, não há matérias anteriores para marcar.
          </p>
        )}

        <div className="historico__actions">
          <button className="btn-secondary" onClick={onVoltar}>
            Voltar
          </button>
          <button className="btn-primary" onClick={onContinuar}>
            Continuar para Montagem
          </button>
        </div>
      </div>
    </section>
  );
});

Historico.displayName = 'Historico';

export default Historico;
