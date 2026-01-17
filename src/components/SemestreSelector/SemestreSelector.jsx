import { forwardRef } from 'react';
import Dropdown from '../Dropdown';
import './SemestreSelector.css';

const SemestreSelector = forwardRef(({ semestreAtual, totalSemestres = 8, onSemestreSelect, onVoltar }, ref) => {
  const semestresOptions = [...Array(totalSemestres)].map((_, i) => ({
    value: i + 1,
    label: `${i + 1}º Semestre`
  }));

  return (
    <section className="semestre-selector" ref={ref}>
      <div className="semestre-selector__container">
        <button className="btn-voltar" onClick={onVoltar}>
          <i className="fi fi-br-arrow-left"></i> Voltar
        </button>

        <h2 className="semestre-selector__title">Qual semestre você está?</h2>
        <p className="semestre-selector__subtitle">Selecione o semestre que você vai cursar</p>

        <Dropdown
          options={semestresOptions}
          value={semestreAtual}
          onChange={onSemestreSelect}
          placeholder="Selecione o Semestre"
        />
      </div>
    </section>
  );
});

SemestreSelector.displayName = 'SemestreSelector';

export default SemestreSelector;

