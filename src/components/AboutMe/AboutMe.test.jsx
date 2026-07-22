import { fireEvent, render, screen } from '@testing-library/react';
import AboutMe from './AboutMe';

test('card Sobre funciona como dialog e devolve o foco ao fechar com Escape', () => {
  render(<AboutMe />);
  const opener = screen.getByRole('button', { name: 'Sobre' });
  opener.focus();
  fireEvent.click(opener);

  expect(screen.getByRole('dialog', { name: /sobre o gradeufla/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();

  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});
