import { fireEvent, render, screen } from '@testing-library/react';
import Historico from './Historico';

test('persiste cada confirmação de pré-requisito mínimo feita no histórico', () => {
  const onConfirmMinimo = jest.fn();
  const onToggleMateria = jest.fn();
  jest.spyOn(window, 'confirm').mockReturnValue(true);

  const materia = {
    codigo: 'GCC003',
    nome: 'Disciplina avançada',
    semestre: 1,
    preRequisitosDetalhada: {
      forte: [],
      minimo: ['GCC001', 'GCC002'],
      coreq: []
    }
  };

  render(
    <Historico
      semestreAtual={2}
      materiasAprovadas={[]}
      materiasPorSemestre={{ 1: [materia] }}
      onToggleMateria={onToggleMateria}
      onConfirmMinimo={onConfirmMinimo}
      onVoltar={() => {}}
      onContinuar={() => {}}
    />
  );

  fireEvent.click(screen.getByRole('checkbox', { name: /disciplina avançada/i }));

  expect(onConfirmMinimo).toHaveBeenCalledTimes(2);
  expect(onConfirmMinimo).toHaveBeenNthCalledWith(1, 'GCC001');
  expect(onConfirmMinimo).toHaveBeenNthCalledWith(2, 'GCC002');
  expect(onToggleMateria).toHaveBeenCalledWith('GCC003');
});
