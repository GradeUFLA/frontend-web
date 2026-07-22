import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import MateriaModal from './MateriaModal';

const materia = {
  codigo: 'GCC001',
  nome: 'Algoritmos',
  creditos: 4,
  tipo: 'obrigatoria',
  preRequisitos: [],
  turmas: []
};

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Abrir disciplina</button>
      {open && (
        <MateriaModal
          materia={materia}
          materiasAprovadas={[]}
          materiasNoCalendario={{ GCC001: materia }}
          onClose={() => setOpen(false)}
          onRemove={() => {}}
          onSave={() => {}}
        />
      )}
    </>
  );
}

test('MateriaModal identifica o dialog, prende foco, fecha com Escape e devolve o foco', () => {
  render(<Harness />);
  const opener = screen.getByRole('button', { name: 'Abrir disciplina' });
  opener.focus();
  fireEvent.click(opener);

  expect(screen.getByRole('dialog', { name: 'Algoritmos' })).toHaveAttribute('aria-modal', 'true');
  const close = screen.getByRole('button', { name: 'Fechar detalhes da disciplina' });
  expect(close).toHaveFocus();

  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
  expect(screen.getByRole('button', { name: /remover do calendário/i })).toHaveFocus();

  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});
