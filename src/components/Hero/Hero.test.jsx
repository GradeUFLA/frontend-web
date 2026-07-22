import { fireEvent, render, screen } from '@testing-library/react';
import Hero from './Hero';

vi.mock('../RotatingText', () => ({
  default: () => <span>prática</span>
}));

describe('carregamento de dados no início', () => {
  test('impede cliques repetidos enquanto os CSVs estão carregando', () => {
    const onGetStartedClick = vi.fn();
    render(
      <Hero
        onGetStartedClick={onGetStartedClick}
        csvLoadStatus="loading"
      />
    );

    const button = screen.getByRole('button', { name: /carregando dados/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onGetStartedClick).not.toHaveBeenCalled();
  });

  test('mostra erro claro e permite tentar novamente', () => {
    const onRetry = vi.fn();
    render(
      <Hero
        onGetStartedClick={() => {}}
        csvLoadStatus="error"
        onRetryCsv={onRetry}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível carregar os dados acadêmicos/i);
    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
