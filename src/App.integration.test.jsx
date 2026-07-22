import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from './App';
import * as data from './data';

vi.mock('./components', async () => {
  const [toast, hero, historico, calendar, materiaModal] = await Promise.all([
    vi.importActual('./components/Toast/Toast'),
    vi.importActual('./components/Hero/Hero'),
    vi.importActual('./components/Historico/Historico'),
    vi.importActual('./components/Calendar/Calendar'),
    vi.importActual('./components/Modal/MateriaModal')
  ]);
  return {
    Particles: () => null,
    AboutMe: () => null,
    Hero: hero.default,
    Historico: historico.default,
    Calendar: calendar.default,
    MateriaModal: materiaModal.default,
    ToastContainer: toast.default,
    useToast: toast.useToast
  };
});

vi.mock('./data', async () => {
  const gradeRules = await vi.importActual('./domain/gradeRules');
  return {
    ensureCsvLoaded: vi.fn(),
    getCsvLoadState: vi.fn(),
    getCursoInfo: vi.fn(),
    getCursosImplementados: vi.fn(),
    getEletivas: vi.fn(),
    getMateriasPorSemestre: vi.fn(),
    getMatrizesByCurso: vi.fn(),
    getNomeMateria: vi.fn(),
    getTotalSemestres: vi.fn(),
    retryCsvLoad: vi.fn(),
    subscribeCsvLoadState: vi.fn(),
    verificarPreRequisitos: gradeRules.verificarPreRequisitos,
    verificarPreRequisitosDetalhada: gradeRules.verificarPreRequisitosDetalhada
  };
});

const introducao = {
  codigo: 'GCC101',
  nome: 'Introdução à Computação',
  semestre: 1,
  creditos: 4,
  tipo: 'obrigatoria',
  preRequisitos: [],
  preRequisitosDetalhada: { forte: [], minimo: [], coreq: [] },
  turmas: [{ id: 'A', horarios: [{ dia: 1, inicio: 8, fim: 10 }] }]
};

const algoritmos = {
  codigo: 'GCC202',
  nome: 'Algoritmos e Estruturas de Dados',
  semestre: 2,
  creditos: 4,
  tipo: 'obrigatoria',
  preRequisitos: ['GCC101'],
  preRequisitosDetalhada: { forte: ['GCC101'], minimo: [], coreq: [] },
  turmas: [
    { id: 'A', horarios: [{ dia: 2, inicio: 8, fim: 10 }] },
    { id: 'B', horarios: [{ dia: 4, inicio: 10, fim: 12 }] }
  ]
};

const materiasPorSemestre = {
  1: [introducao],
  2: [algoritmos]
};

let csvListener;

const selectOption = (comboboxName, optionName) => {
  fireEvent.click(screen.getByRole('combobox', { name: comboboxName }));
  fireEvent.click(screen.getByRole('option', { name: optionName }));
};

const completeSetup = async () => {
  fireEvent.click(screen.getByRole('button', { name: /vamos lá/i }));

  expect(await screen.findByRole('heading', { name: /qual é o seu curso/i })).toBeInTheDocument();
  selectOption(/curso/i, /G001 - Sistemas de Informação/i);
  fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

  expect(screen.getByRole('heading', { name: /qual é a sua matriz curricular/i })).toBeInTheDocument();
  selectOption(/matriz curricular/i, /matriz 2023\/01/i);
  fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

  expect(screen.getByRole('heading', { name: /qual semestre você está/i })).toBeInTheDocument();
  selectOption(/semestre/i, /2º módulo/i);
  fireEvent.click(screen.getByRole('button', { name: /finalizar/i }));

  expect(await screen.findByRole('heading', { name: 'Matérias' })).toBeInTheDocument();
};

const reachCalendar = async () => {
  await completeSetup();
  fireEvent.click(screen.getByRole('button', { name: /continuar para montagem/i }));
  expect(await screen.findByRole('heading', { name: /minha grade - 2º semestre/i })).toBeInTheDocument();
};

const openAlgoritmosModal = () => {
  fireEvent.click(screen.getAllByRole('button', {
    name: `Ver informações de ${algoritmos.nome}`
  })[0]);
  return screen.getByRole('dialog', { name: algoritmos.nome });
};

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  csvListener = null;
  window.history.replaceState(null, document.title, '/');

  data.ensureCsvLoaded.mockResolvedValue({});
  data.getCsvLoadState.mockReturnValue({ status: 'success', error: null });
  data.getCursoInfo.mockReturnValue({
    id: 'G001',
    nome: 'Sistemas de Informação',
    totalSemestres: 8
  });
  data.getCursosImplementados.mockReturnValue([
    { id: 'G001', nome: 'Sistemas de Informação', implementado: true }
  ]);
  data.getMatrizesByCurso.mockReturnValue([{ id: '2023/01', nome: '2023/01' }]);
  data.getTotalSemestres.mockReturnValue(8);
  data.getMateriasPorSemestre.mockReturnValue(materiasPorSemestre);
  data.getEletivas.mockReturnValue([]);
  data.getNomeMateria.mockImplementation(codigo => ({
    GCC101: introducao.nome,
    GCC202: algoritmos.nome
  })[codigo] || codigo);
  data.subscribeCsvLoadState.mockImplementation(listener => {
    csvListener = listener;
    return () => {
      if (csvListener === listener) csvListener = null;
    };
  });
  data.retryCsvLoad.mockResolvedValue({});
});

afterEach(() => {
  vi.clearAllMocks();
});

test('percorre Hero, Setup, Histórico e Montagem preservando o histórico acadêmico', async () => {
  render(<App />);

  await completeSetup();

  const introducaoCheckbox = screen.getByLabelText(/introdução à computação/i);
  expect(introducaoCheckbox).toBeChecked();

  fireEvent.click(screen.getByRole('button', { name: /continuar para montagem/i }));

  expect(await screen.findByRole('heading', { name: /minha grade - 2º semestre/i })).toBeInTheDocument();
  expect(screen.getByText(algoritmos.nome)).toBeInTheDocument();
  expect(window.history.state).toEqual({ etapa: 'montagem' });
});

test('mostra a falha do CSV, executa retry e libera o fluxo completo', async () => {
  const errorState = { status: 'error', error: new Error('Falha de rede') };
  const successState = { status: 'success', error: null };
  data.getCsvLoadState.mockReturnValue(errorState);
  data.retryCsvLoad.mockImplementation(() => {
    data.getCsvLoadState.mockReturnValue(successState);
    csvListener?.(successState);
    return Promise.resolve({});
  });

  render(<App />);

  expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível carregar os dados acadêmicos/i);
  expect(screen.getByRole('button', { name: /vamos lá/i })).toBeDisabled();

  fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));

  await waitFor(() => expect(screen.getByRole('button', { name: /vamos lá/i })).toBeEnabled());
  expect(data.retryCsvLoad).toHaveBeenCalledTimes(1);

  await completeSetup();
  fireEvent.click(screen.getByRole('button', { name: /continuar para montagem/i }));
  expect(await screen.findByRole('heading', { name: /minha grade - 2º semestre/i })).toBeInTheDocument();
});

test('troca e remove uma turma pelo modal conectado ao App', async () => {
  render(<App />);
  await reachCalendar();

  let dialog = openAlgoritmosModal();
  fireEvent.click(within(dialog).getByRole('button', { name: /turma a/i }));
  fireEvent.click(within(dialog).getByRole('button', { name: /fechar detalhes/i }));

  expect(screen.getByText('Créditos:').parentElement).toHaveTextContent('Créditos: 4');

  dialog = openAlgoritmosModal();
  fireEvent.click(within(dialog).getByRole('button', { name: /turma b/i }));
  fireEvent.click(within(dialog).getByRole('button', { name: /fechar detalhes/i }));

  dialog = openAlgoritmosModal();
  expect(within(dialog).getByText('Turma B').closest('.turma-item')).toHaveTextContent(/horário escolhido/i);

  fireEvent.click(within(dialog).getByRole('button', { name: /remover do calendário/i }));

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByText('Créditos:').parentElement).toHaveTextContent('Créditos: 0');
  expect(screen.getAllByRole('button', { name: `Ver informações de ${algoritmos.nome}` })).toHaveLength(1);
});

test('responde a voltar e avançar do navegador sem perder a seleção do setup', async () => {
  render(<App />);
  await reachCalendar();

  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate', { state: { etapa: 'historico' } }));
  });
  expect(await screen.findByRole('heading', { name: 'Matérias' })).toBeInTheDocument();

  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate', { state: { etapa: 'setup' } }));
  });
  expect(await screen.findByRole('heading', { name: /qual semestre você está/i })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: /semestre/i })).toHaveTextContent(/2º módulo/i);

  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate', { state: { etapa: 'historico' } }));
  });
  expect(await screen.findByRole('heading', { name: 'Matérias' })).toBeInTheDocument();
});
