import { fireEvent, render, screen } from '@testing-library/react';
import SubjectCard from './SubjectCard';

vi.mock('../../data', () => ({
  getNomeMateria: codigo => codigo,
  verificarPreRequisitosDetalhada: materia => materia.detalhes
}));

const renderCard = (materia, onDragStart = vi.fn()) => {
  render(
    <SubjectCard
      materia={materia}
      tipo="obrigatoria"
      materiasAprovadas={[]}
      materiasNoCalendario={{}}
      materiasMinimoConfirmadas={[]}
      allMateriasList={[materia]}
      matchesFilter
      isDragging={false}
      draggingMateria={null}
      shakeErrorMateria={null}
      isMobile={false}
      getCorMateria={() => '#fff'}
      onDragStart={onDragStart}
      onMateriaClick={() => {}}
      onOpenForte={() => {}}
      onOpenMinimo={() => {}}
      onOpenCoreq={() => {}}
    />
  );
  return onDragStart;
};

describe('cartão de disciplina', () => {
  test('pré-requisito forte pendente bloqueia o arraste', () => {
    const onDragStart = renderCard({
      codigo: 'GCC001',
      nome: 'Disciplina bloqueada',
      creditos: 4,
      turmas: [{ id: 'A', horarios: [{ dia: 1, inicio: 8, fim: 10 }] }],
      detalhes: { faltandoForte: ['GCC000'], faltandoMinimo: [], faltandoCoreq: [] }
    });

    const card = screen.getByText('Disciplina bloqueada').closest('.materia-card');
    expect(card).toHaveClass('materia-card--blocked');
    fireEvent.mouseDown(card);
    expect(onDragStart).not.toHaveBeenCalled();
  });

  test('correquisito pendente avisa sem bloquear a inclusão provisória', () => {
    const materia = {
      codigo: 'GCC002',
      nome: 'Disciplina com correquisito',
      creditos: 4,
      turmas: [{ id: 'A', horarios: [{ dia: 1, inicio: 10, fim: 12 }] }],
      detalhes: { faltandoForte: [], faltandoMinimo: [], faltandoCoreq: ['GCC003'] }
    };
    const onDragStart = renderCard(materia);

    expect(screen.getByText('Co-req: GCC003')).toBeInTheDocument();
    const card = screen.getByText('Disciplina com correquisito').closest('.materia-card');
    expect(card).not.toHaveClass('materia-card--blocked');
    fireEvent.mouseDown(card);
    expect(onDragStart).toHaveBeenCalledWith(expect.anything(), materia);
  });

  test('botão de informações inclui o nome da disciplina', () => {
    renderCard({
      codigo: 'GCC004',
      nome: 'Estruturas de Dados',
      creditos: 4,
      turmas: [],
      detalhes: { faltandoForte: [], faltandoMinimo: [], faltandoCoreq: [] }
    });

    expect(screen.getByRole('button', { name: 'Ver informações de Estruturas de Dados' })).toBeInTheDocument();
  });
});
