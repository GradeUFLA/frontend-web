import { fireEvent, render, screen } from '@testing-library/react';
import PrerequisiteModal from './PrerequisiteModal';

test('modal de pré-requisito tem nome, foco inicial e fecha com Escape', () => {
  const onClose = vi.fn();
  render(
    <PrerequisiteModal
      modal={{ open: true, tipo: 'forte', prereqs: ['GCC001'] }}
      onClose={onClose}
      onConfirm={() => {}}
    />
  );

  expect(screen.getByRole('dialog', { name: /pré-requisito forte/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
});
