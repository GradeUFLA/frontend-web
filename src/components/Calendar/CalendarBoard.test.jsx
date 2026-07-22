import { fireEvent, render, screen } from '@testing-library/react';
import CalendarBoard from './CalendarBoard';

test('renderiza a grade extraída e mantém o download conectado', () => {
  const onDownload = vi.fn();
  const materia = { codigo: 'GCC001', nome: 'Teste', turmaId: 'A' };

  render(
    <CalendarBoard
      wrapperRef={{ current: null }}
      tableRef={{ current: null }}
      semestreAtual={3}
      onDownload={onDownload}
      isDragging={false}
      draggingMateria={null}
      selectedTurmaIndex={null}
      verificarConflito={() => ({ temConflito: false })}
      getCorTurma={() => '#fff'}
      horarios={['07:00']}
      getMateriasEmCelula={(_, dia) => dia === 1 ? [materia] : []}
      getCellPreviewInfo={() => null}
      getTipoMateria={() => 'obrigatoria'}
      getCorMateria={() => '#4ecdc4'}
      isMobile={false}
      onDragStartFromCalendar={() => {}}
      onMateriaClick={() => {}}
      onCellHover={() => {}}
      materiasNoCalendario={{ GCC001: materia }}
    />
  );

  expect(screen.getByText('Minha Grade - 3º Semestre')).toBeInTheDocument();
  expect(screen.getAllByText('Teste')).toHaveLength(2);
  expect(screen.getByRole('columnheader', { name: 'Hora' })).toHaveAttribute('scope', 'col');
  expect(screen.getByRole('rowheader', { name: '07:00' })).toHaveAttribute('scope', 'row');
  expect(screen.getByRole('button', { name: 'Ver informações de Teste' })).toBeInTheDocument();
  const download = screen.getByRole('button', { name: 'Baixar PNG da grade' });
  expect(download).toHaveAttribute('aria-label', 'Baixar PNG da grade');
  fireEvent.click(download);
  expect(onDownload).toHaveBeenCalledTimes(1);
});
