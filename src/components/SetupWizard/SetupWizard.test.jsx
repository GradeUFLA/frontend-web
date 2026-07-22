import { fireEvent, render, screen } from '@testing-library/react';
import SetupWizard from './SetupWizard';
import {
  ensureCsvLoaded,
  getCsvLoadState,
  getCursoInfo,
  getCursosImplementados,
  getMatrizesByCurso,
  getTotalSemestres,
  retryCsvLoad,
  subscribeCsvLoadState
} from '../../data';

jest.mock('../../data', () => ({
  ensureCsvLoaded: jest.fn().mockRejectedValue(new Error('CSV inválido')),
  retryCsvLoad: jest.fn().mockResolvedValue({}),
  getCsvLoadState: jest.fn(() => ({ status: 'error', error: new Error('CSV inválido') })),
  subscribeCsvLoadState: jest.fn(() => () => {}),
  getCursoInfo: jest.fn(() => null),
  getTotalSemestres: jest.fn(() => 8),
  getMatrizesByCurso: jest.fn(() => []),
  getCursosImplementados: jest.fn(() => [])
}));

const renderWizard = () => render(
  <SetupWizard
    onComplete={() => {}}
    onVoltar={() => {}}
    cursoSelecionado={null}
    setCursoSelecionado={() => {}}
    matrizSelecionada={null}
    setMatrizSelecionada={() => {}}
    semestreSelecionado={null}
    setSemestreSelecionado={() => {}}
  />
);

beforeEach(() => {
  const errorState = { status: 'error', error: new Error('CSV inválido') };
  ensureCsvLoaded.mockRejectedValue(errorState.error);
  retryCsvLoad.mockResolvedValue({});
  getCsvLoadState.mockReturnValue(errorState);
  subscribeCsvLoadState.mockReturnValue(() => {});
  getCursoInfo.mockReturnValue(null);
  getTotalSemestres.mockReturnValue(8);
  getMatrizesByCurso.mockReturnValue([]);
  getCursosImplementados.mockReturnValue([]);
});

test('wizard não trata dropdown vazio como estado válido quando o CSV falha', () => {
  renderWizard();

  expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível carregar os dados acadêmicos/i);
  expect(screen.queryByText(/qual é o seu curso/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
  expect(retryCsvLoad).toHaveBeenCalledTimes(1);
});
