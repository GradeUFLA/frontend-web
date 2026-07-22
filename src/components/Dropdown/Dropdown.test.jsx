import { fireEvent, render, screen } from '@testing-library/react';
import Dropdown from './Dropdown';

const options = [
  { value: 'a', label: 'Opção A' },
  { value: 'b', label: 'Opção B' },
  { value: 'c', label: 'Opção C' }
];

describe('Dropdown acessível', () => {
  test('campo pesquisável é um combobox e não fica dentro de button', () => {
    render(
      <Dropdown
        options={options}
        value={null}
        onChange={() => {}}
        label="Curso"
        searchable
      />
    );

    const combobox = screen.getByRole('combobox', { name: 'Curso' });
    expect(combobox.tagName).toBe('INPUT');
    expect(combobox.closest('button')).toBeNull();
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
  });

  test('expõe listbox/options e permite Home, End, Enter e Escape', () => {
    const onChange = vi.fn();
    render(
      <Dropdown
        options={options}
        value={null}
        onChange={onChange}
        label="Curso"
        searchable
      />
    );

    const combobox = screen.getByRole('combobox', { name: 'Curso' });
    fireEvent.focus(combobox);
    expect(combobox).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox', { name: 'Curso' })).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);

    fireEvent.keyDown(combobox, { key: 'End' });
    expect(combobox.getAttribute('aria-activedescendant')).toContain('option-2');
    fireEvent.keyDown(combobox, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('c');
    expect(combobox).toHaveAttribute('aria-expanded', 'false');

    fireEvent.focus(combobox);
    fireEvent.keyDown(combobox, { key: 'Escape' });
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
  });

  test('combobox sem busca abre e seleciona uma opção pelo teclado', () => {
    const onChange = vi.fn();
    render(
      <Dropdown
        options={options}
        value={null}
        onChange={onChange}
        label="Matriz curricular"
      />
    );

    const combobox = screen.getByRole('combobox', { name: 'Matriz curricular' });
    fireEvent.keyDown(combobox, { key: 'Enter' });
    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    fireEvent.keyDown(combobox, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('b');
  });
});
