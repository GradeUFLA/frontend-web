import { forwardRef } from 'react';
import Dropdown from '../Dropdown';
import { cursos } from '../../data/cursos';
import './CursoSelector.css';

const CursoSelector = forwardRef(({ onCursoSelect, onVoltar }, ref) => {
  const cursosOptions = cursos.map((curso) => ({
    value: curso.id,
    label: `${curso.nome} (${curso.totalSemestres} semestres)`
  }));

  return (
    <section className="curso-selector" ref={ref}>
      <div className="curso-selector__container">
        <button className="btn-voltar" onClick={onVoltar}>
          <i className="fi fi-br-arrow-left"></i> Voltar
        </button>

        <h2 className="curso-selector__title">Qual é o seu curso?</h2>
        <p className="curso-selector__subtitle">Selecione o curso que você está cursando</p>

        <Dropdown
          options={cursosOptions}
          value={null}
          onChange={onCursoSelect}
          placeholder="Selecione o Curso"
        />
      </div>
    </section>
  );
});

CursoSelector.displayName = 'CursoSelector';

export default CursoSelector;

