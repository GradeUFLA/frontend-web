import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Stepper, { Step } from './Stepper';

test('indicadores anteriores são buttons acessíveis e operáveis por teclado', async () => {
  const user = userEvent.setup();
  render(
    <Stepper initialStep={2}>
      <Step>Conteúdo 1</Step>
      <Step>Conteúdo 2</Step>
      <Step>Conteúdo 3</Step>
    </Stepper>
  );

  const previousStep = screen.getByRole('button', { name: 'Voltar para etapa 1' });
  expect(screen.getByRole('button', { name: 'Etapa 2 de 3, atual' })).toHaveAttribute('aria-current', 'step');

  previousStep.focus();
  await user.keyboard('{Enter}');

  expect(screen.getByText('Conteúdo 1')).toBeInTheDocument();
});
