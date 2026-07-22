import { loadCsv, loadMaterias } from './csvLoader';

describe('validação dos CSVs', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('rejeita erros estruturais informados pelo PapaParse', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => 'codigo,nome\nGCC001'
    });

    await expect(loadCsv('/data/invalido.csv')).rejects.toThrow(/CSV inválido/i);
  });

  test('rejeita linha de disciplina sem campos obrigatórios', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => 'curso_id,matriz,semestre,codigo,nome\nG001,2023/01,1,,Sem código'
    });

    await expect(loadMaterias()).rejects.toThrow(/linha 2.*código/i);
  });

  test('versiona URLs de dados para permitir cache busting controlado', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => 'codigo,nome\nGCC001,Disciplina'
    });

    await loadCsv('/data/arquivo.csv');

    expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/^\/data\/arquivo\.csv\?v=.+/));
  });

  test('rejeita JSON de turmas corrompido em vez de aceitar uma linha parcial', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => 'curso,matriz,semestre,codigo,nome,turmas\nG001,2023/01,1,GCC001,Disciplina,[json-inválido]'
    });

    await expect(loadMaterias()).rejects.toThrow(/linha 2.*turmas/i);
  });
});
