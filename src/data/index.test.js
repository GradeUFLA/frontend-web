const cursos = [{ id: 'G001', nome: 'Curso', matrizes: ['2023/01'] }];
const materias = [{
  curso: 'G001',
  matriz: '2023/01',
  semestre: 1,
  codigo: 'GCC001',
  nome: 'Disciplina',
  creditos: 4,
  tipo: 'obrigatoria',
  turmas: []
}];

const carregarModuloComMocks = ({ loadCursos, loadMaterias }) => {
  jest.resetModules();
  jest.doMock('./csvLoader', () => ({
    loadCursos,
    loadMaterias,
    computeTotalSemestres: jest.fn(lista => lista)
  }));
  return require('./index');
};

describe('carregamento central dos CSVs', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('compartilha uma única Promise entre chamadas concorrentes', async () => {
    let concluirMaterias;
    const materiasPendentes = new Promise(resolve => {
      concluirMaterias = resolve;
    });
    const loadCursos = jest.fn().mockResolvedValue(cursos);
    const loadMaterias = jest.fn(() => materiasPendentes);
    const { ensureCsvLoaded } = carregarModuloComMocks({ loadCursos, loadMaterias });

    const primeira = ensureCsvLoaded();
    const segunda = ensureCsvLoaded();
    const terceira = ensureCsvLoaded();

    expect(primeira).toBe(segunda);
    expect(segunda).toBe(terceira);
    expect(loadCursos).toHaveBeenCalledTimes(1);

    concluirMaterias(materias);
    await primeira;

    expect(loadMaterias).toHaveBeenCalledTimes(1);
  });

  test('reutiliza os dados carregados sem executar um novo parse', async () => {
    const loadCursos = jest.fn().mockResolvedValue(cursos);
    const loadMaterias = jest.fn().mockResolvedValue(materias);
    const { ensureCsvLoaded, getCursos, getNomeMateria } = carregarModuloComMocks({ loadCursos, loadMaterias });

    const primeiraCarga = await ensureCsvLoaded();
    const segundaCarga = await ensureCsvLoaded();

    expect(segundaCarga).toBe(primeiraCarga);
    expect(loadCursos).toHaveBeenCalledTimes(1);
    expect(loadMaterias).toHaveBeenCalledTimes(1);
    expect(getCursos()).toEqual(cursos);
    expect(getNomeMateria('GCC001')).toBe('Disciplina');
    expect(getNomeMateria('INEXISTENTE')).toBeNull();
  });

  test('expõe a falha e permite tentar novamente', async () => {
    const erro = new Error('Falha de rede');
    const loadCursos = jest.fn()
      .mockRejectedValueOnce(erro)
      .mockResolvedValueOnce(cursos);
    const loadMaterias = jest.fn().mockResolvedValue(materias);
    const {
      ensureCsvLoaded,
      getCsvLoadState,
      retryCsvLoad
    } = carregarModuloComMocks({ loadCursos, loadMaterias });

    await expect(ensureCsvLoaded()).rejects.toBe(erro);
    expect(getCsvLoadState()).toMatchObject({ status: 'error', error: erro });

    await expect(retryCsvLoad()).resolves.toMatchObject({ cursos });
    expect(getCsvLoadState()).toMatchObject({ status: 'success', error: null });
    expect(loadCursos).toHaveBeenCalledTimes(2);
    expect(loadMaterias).toHaveBeenCalledTimes(1);
  });
});
