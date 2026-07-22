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

const carregarModuloComMocks = async ({ loadCursos, loadMaterias }) => {
  vi.resetModules();
  vi.doMock('./csvLoader', () => ({
    loadCursos,
    loadMaterias,
    computeTotalSemestres: vi.fn(lista => lista)
  }));
  return import('./index');
};

describe('carregamento central dos CSVs', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  test('compartilha uma única Promise entre chamadas concorrentes', async () => {
    let concluirMaterias;
    const materiasPendentes = new Promise(resolve => {
      concluirMaterias = resolve;
    });
    const loadCursos = vi.fn().mockResolvedValue(cursos);
    const loadMaterias = vi.fn(() => materiasPendentes);
    const { ensureCsvLoaded } = await carregarModuloComMocks({ loadCursos, loadMaterias });

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
    const loadCursos = vi.fn().mockResolvedValue(cursos);
    const loadMaterias = vi.fn().mockResolvedValue(materias);
    const { ensureCsvLoaded, getCursos, getNomeMateria } = await carregarModuloComMocks({ loadCursos, loadMaterias });

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
    const loadCursos = vi.fn()
      .mockRejectedValueOnce(erro)
      .mockResolvedValueOnce(cursos);
    const loadMaterias = vi.fn().mockResolvedValue(materias);
    const {
      ensureCsvLoaded,
      getCsvLoadState,
      retryCsvLoad
    } = await carregarModuloComMocks({ loadCursos, loadMaterias });

    await expect(ensureCsvLoaded()).rejects.toBe(erro);
    expect(getCsvLoadState()).toMatchObject({ status: 'error', error: erro });

    await expect(retryCsvLoad()).resolves.toMatchObject({ cursos });
    expect(getCsvLoadState()).toMatchObject({ status: 'success', error: null });
    expect(loadCursos).toHaveBeenCalledTimes(2);
    expect(loadMaterias).toHaveBeenCalledTimes(1);
  });
});
