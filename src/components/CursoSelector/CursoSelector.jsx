import { forwardRef } from 'react';
import Dropdown from '../Dropdown';
import { getCursos } from '../../data';
import './CursoSelector.css';

const CursoSelector = forwardRef(({ onCursoSelect, onVoltar }, ref) => {
  const rawCursos = getCursos() || [];
  const extractNum = (c) => {
    if (!c || !c.id) return Number.POSITIVE_INFINITY;
    const m = String(c.id).match(/\d+/);
    return m ? Number(m[0]) : Number.POSITIVE_INFINITY;
  };
  const sortedCursos = rawCursos.slice().sort((a, b) => extractNum(a) - extractNum(b));

  const cursosOptions = sortedCursos.map((curso) => ({
    value: curso.id,
    label: `${curso.id} - ${curso.nome}`
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
