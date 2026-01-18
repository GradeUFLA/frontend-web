import { forwardRef, useState } from 'react';
import { verificarPreRequisitos, getNomeMateria } from '../../data';
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
      // Verifica se tem pré-requisitos não cumpridos
      const { cumprido, faltando } = verificarPreRequisitos(materia, materiasAprovadas);

      if (!cumprido) {
        // Dispara animação de shake
        setShakingMateria(materia.codigo);
        setTimeout(() => setShakingMateria(null), 500);

        // Vibração do dispositivo (se suportado)
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }

        // Mostra toast de erro
        const nomesFaltando = faltando.map(f => getNomeMateria(f)).join(', ');
        onShowToast?.(`É necessário fazer ${nomesFaltando} antes`, 'error');
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
