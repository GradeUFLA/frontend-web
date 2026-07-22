import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import useCalendarDrag, {
  buildCalendarOccupancy,
  resolveTurmaIndexParaCelula
} from './useCalendarDrag';

vi.mock('../../data', () => ({
  verificarPreRequisitosDetalhada: () => ({
    faltandoForte: [],
    faltandoMinimo: [],
    faltandoCoreq: []
  })
}));

const pointerEvent = (x, y) => ({
  clientX: x,
  clientY: y,
  preventDefault: vi.fn(),
  stopPropagation: vi.fn()
});

const rect = (left, right, top, bottom) => ({
  left,
  right,
  top,
  bottom,
  width: right - left,
  height: bottom - top
});

const createTable = () => {
  const headers = Array.from({ length: 8 }, (_, index) => ({
    getBoundingClientRect: () => rect(index * 100, (index + 1) * 100, 0, 100)
  }));
  return {
    getBoundingClientRect: () => rect(0, 800, 0, 500),
    querySelector: selector => selector === 'thead'
      ? { querySelectorAll: () => headers }
      : { getBoundingClientRect: () => rect(0, 800, 100, 500) }
  };
};

const renderDrag = ({
  materiasNoCalendario = {},
  allMateriasList = [],
  onAddMateria = vi.fn(() => true),
  onRemoveMateria = vi.fn(),
  triggerToast = vi.fn()
} = {}) => {
  const calendarTableRef = { current: createTable() };
  const { result } = renderHook(() => useCalendarDrag({
    allMateriasList,
    materiasNoCalendario,
    materiasAprovadas: [],
    materiasMinimoConfirmadas: [],
    onAddMateria,
    onRemoveMateria,
    triggerToast,
    calendarTableRef,
    horarios: ['07:00', '08:00', '09:00', '10:00']
  }));
  return { hookResult: result, onAddMateria, onRemoveMateria, triggerToast };
};

const DragBubblingHarness = ({ materia, onRemoveMateria }) => {
  const drag = useCalendarDrag({
    allMateriasList: [materia],
    materiasNoCalendario: { [materia.codigo]: materia },
    materiasAprovadas: [],
    materiasMinimoConfirmadas: [],
    onAddMateria: () => true,
    onRemoveMateria,
    triggerToast: () => {},
    calendarTableRef: { current: null },
    horarios: ['07:00']
  });

  return (
    <section data-testid="calendar" onMouseUp={drag.handleMouseUp}>
      <button
        type="button"
        onMouseDown={event => drag.handleDragStartFromCalendar(event, materia)}
        onTouchStart={event => drag.handleDragStartFromCalendar(event, materia)}
      >
        Arrastar
      </button>
      <div className="calendar__sidebar">Destino</div>
    </section>
  );
};

describe('arraste do calendário', () => {
  test('indexa a ocupação da grade por dia e hora', () => {
    const normal = {
      codigo: 'GCC001',
      horarios: [{ dia: 1, inicio: 8, fim: 10 }]
    };
    const anp = {
      codigo: 'GCC002',
      anp: true,
      anpHour: 7,
      horarios: [{ dia: 6, inicio: 7, fim: 8 }]
    };

    const occupancy = buildCalendarOccupancy({ GCC001: normal, GCC002: anp });

    expect(occupancy.get('1:8')).toEqual([expect.objectContaining({ codigo: 'GCC001' })]);
    expect(occupancy.get('1:9')).toEqual([expect.objectContaining({ codigo: 'GCC001' })]);
    expect(occupancy.get('6:7')).toEqual([expect.objectContaining({ codigo: 'GCC002' })]);
    expect(occupancy.get('1:10')).toBeUndefined();
  });

  test('seleciona a turma correspondente à célula', () => {
    const materia = {
      turmas: [
        { id: 'A', horarios: [{ dia: 1, inicio: 8, fim: 10 }] },
        { id: 'B', horarios: [{ dia: 3, inicio: 10, fim: 12 }] }
      ]
    };

    expect(resolveTurmaIndexParaCelula({
      materia,
      horarioIdx: 1,
      diaIdx: 1,
      materiasNoCalendario: {}
    })).toBe(0);
    expect(resolveTurmaIndexParaCelula({
      materia,
      horarioIdx: 3,
      diaIdx: 3,
      materiasNoCalendario: {}
    })).toBe(1);
  });

  test('conflito impede inclusão', async () => {
    const existente = {
      codigo: 'GCC000',
      nome: 'Existente',
      creditos: 4,
      horarios: [{ dia: 1, inicio: 8, fim: 10 }]
    };
    const materia = {
      codigo: 'GCC001',
      nome: 'Nova',
      creditos: 4,
      turmas: [{ id: 'A', horarios: [{ dia: 1, inicio: 8, fim: 10 }] }],
      preRequisitosDetalhada: { forte: [], minimo: [], coreq: [] }
    };
    const utils = renderDrag({ materiasNoCalendario: { GCC000: existente }, allMateriasList: [materia] });

    await act(async () => utils.hookResult.current.handleDragStart(pointerEvent(10, 10), materia));
    act(() => utils.hookResult.current.handleCellHover(1, 1));
    act(() => utils.hookResult.current.handleMouseUp(pointerEvent(250, 150)));

    expect(utils.onAddMateria).not.toHaveBeenCalled();
    expect(utils.triggerToast).toHaveBeenCalledWith(expect.stringContaining('Conflito de horário'), 'error');
  });

  test('remove ao soltar uma matéria da grade na sidebar', () => {
    const sidebar = document.createElement('div');
    sidebar.className = 'calendar__sidebar';
    sidebar.getBoundingClientRect = () => rect(0, 150, 0, 500);
    document.body.appendChild(sidebar);
    const materia = { codigo: 'GCC001', nome: 'Na grade', horarios: [] };
    const utils = renderDrag({ materiasNoCalendario: { GCC001: materia }, allMateriasList: [materia] });

    act(() => utils.hookResult.current.handleDragStartFromCalendar(pointerEvent(300, 100), materia));
    act(() => utils.hookResult.current.handleMouseUp(pointerEvent(50, 100)));

    expect(utils.onRemoveMateria).toHaveBeenCalledWith('GCC001');
    sidebar.remove();
  });

  test('troca de turma não aplica novamente o limite de créditos', () => {
    const completa = {
      codigo: 'GCC001',
      nome: 'Em troca',
      creditos: 4,
      turmas: [
        { id: 'A', horarios: [{ dia: 1, inicio: 8, fim: 9 }] },
        { id: 'B', horarios: [{ dia: 2, inicio: 9, fim: 10 }] }
      ]
    };
    const materiasNoCalendario = {
      GCC001: { ...completa, turmaId: 'A', horarios: completa.turmas[0].horarios },
      GCC999: { codigo: 'GCC999', nome: 'Outras', creditos: 28, horarios: [] }
    };
    const utils = renderDrag({ materiasNoCalendario, allMateriasList: [completa] });

    act(() => utils.hookResult.current.handleDragStartFromCalendar(pointerEvent(200, 200), materiasNoCalendario.GCC001));
    act(() => utils.hookResult.current.handleMouseUp(pointerEvent(350, 350)));

    expect(utils.onRemoveMateria).toHaveBeenCalledWith('GCC001');
    expect(utils.onAddMateria).toHaveBeenCalledWith(expect.objectContaining({ codigo: 'GCC001', turmaId: 'B' }));
    expect(utils.triggerToast).not.toHaveBeenCalledWith(expect.stringContaining('Limite de créditos'), 'error');
  });

  test('finaliza uma única vez quando o mouseup local chega ao listener global por bubbling', () => {
    const materia = { codigo: 'GCC001', nome: 'Na grade', horarios: [] };
    const onRemoveMateria = vi.fn();
    render(<DragBubblingHarness materia={materia} onRemoveMateria={onRemoveMateria} />);

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Arrastar' }), {
      clientX: 10,
      clientY: 10
    });
    fireEvent.mouseUp(screen.getByTestId('calendar'), { clientX: 0, clientY: 0 });

    expect(onRemoveMateria).toHaveBeenCalledTimes(1);
  });

  test('touchcancel encerra o gesto sem remover a matéria', () => {
    const materia = { codigo: 'GCC001', nome: 'Na grade', horarios: [] };
    const onRemoveMateria = vi.fn();
    render(<DragBubblingHarness materia={materia} onRemoveMateria={onRemoveMateria} />);

    fireEvent.touchStart(screen.getByRole('button', { name: 'Arrastar' }), {
      touches: [{ clientX: 10, clientY: 10 }]
    });
    fireEvent.touchCancel(document, {
      changedTouches: [{ clientX: 0, clientY: 0 }]
    });

    expect(onRemoveMateria).not.toHaveBeenCalled();
  });

  test('move o ghost por requestAnimationFrame sem renderizar a árvore a cada pixel', async () => {
    const materia = {
      codigo: 'GCC001',
      nome: 'Nova',
      creditos: 4,
      turmas: [{ id: 'A', horarios: [{ dia: 1, inicio: 8, fim: 10 }] }],
      preRequisitosDetalhada: { forte: [], minimo: [], coreq: [] }
    };
    const utils = renderDrag({ allMateriasList: [materia] });
    let scheduledFrame;
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      scheduledFrame = callback;
      return 1;
    });

    await act(async () => utils.hookResult.current.handleDragStart(pointerEvent(10, 10), materia));
    const ghost = document.createElement('div');
    utils.hookResult.current.dragGhostRef.current = ghost;
    act(() => scheduledFrame());
    const resultBeforeMove = utils.hookResult.current;

    act(() => utils.hookResult.current.handleMouseMove(pointerEvent(200, 100)));
    act(() => scheduledFrame());

    expect(ghost.style.transform).toBe('translate3d(120px, 75px, 0) rotate(-2deg)');
    expect(utils.hookResult.current).toBe(resultBeforeMove);
    expect(requestFrame).toHaveBeenCalled();
    requestFrame.mockRestore();
  });
});
