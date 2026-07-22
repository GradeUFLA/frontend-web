import { act, renderHook } from '@testing-library/react';
import useCalendarExport from './useCalendarExport';

vi.mock('../../data', () => ({
  getNomeMateria: codigo => codigo
}));

describe('exportação do calendário', () => {
  test('bloqueia o PNG enquanto houver correquisito pendente', async () => {
    const triggerToast = vi.fn();
    const wrapperRef = {
      get current() {
        throw new Error('a captura não deveria ser iniciada');
      }
    };
    const materiasNoCalendario = {
      GCC001: {
        codigo: 'GCC001',
        preRequisitosDetalhada: { coreq: ['GCC002'] }
      }
    };
    const { result } = renderHook(() => useCalendarExport({
      wrapperRef,
      semestreAtual: 3,
      materiasNoCalendario,
      materiasAprovadas: [],
      materiasMinimoConfirmadas: [],
      triggerToast
    }));

    await act(async () => result.current());

    expect(triggerToast).toHaveBeenCalledWith(
      expect.stringContaining('GCC002'),
      'error'
    );
  });
});
