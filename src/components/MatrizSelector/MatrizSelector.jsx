import { forwardRef } from 'react';
import Dropdown from '../Dropdown';
import { getMatrizesByCurso, getCursoInfo } from '../../data';
import './MatrizSelector.css';

const MatrizSelector = forwardRef(({ cursoId, onMatrizSelect, onVoltar }, ref) => {
  const curso = getCursoInfo(cursoId);
  const matrizes = getMatrizesByCurso(cursoId);

  const matrizesOptions = matrizes.map((matriz) => ({
    value: matriz.id,
    label: `Matriz ${matriz.nome}`
  }));

  return (
    <section className="matriz-selector" ref={ref}>
      <div className="matriz-selector__container">
        <button className="btn-voltar" onClick={onVoltar}>
          <i className="fi fi-br-arrow-left"></i> Voltar
        </button>

        <h2 className="matriz-selector__title">Qual é a sua matriz curricular?</h2>
        <p className="matriz-selector__subtitle">
          Selecione a matriz curricular do curso de {curso?.nome}
        </p>

        <Dropdown
          options={matrizesOptions}
          value={null}
          onChange={onMatrizSelect}
          placeholder="Selecione a Matriz"
        />
      </div>
    </section>
  );
});

MatrizSelector.displayName = 'MatrizSelector';

export default MatrizSelector;
