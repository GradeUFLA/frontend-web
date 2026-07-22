import { useEffect, useId, useRef, useState } from 'react';
import './Dropdown.css';

const Dropdown = ({
  options,
  value,
  onChange,
  placeholder = 'Selecione uma opção',
  label = placeholder,
  renderOption,
  error = false,
  searchable = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const reactId = useId().replace(/:/g, '');
  const listboxId = `dropdown-${reactId}-listbox`;

  const selectedOption = options.find(option => option.value === value);
  const normalizedQuery = query.trim().toLowerCase();
  const queryIsSelectedLabel = selectedOption?.label === query;
  const filteredOptions = searchable && normalizedQuery.length > 0 && !queryIsSelectedLabel
    ? options.filter(option => (option.label || '').toLowerCase().includes(normalizedQuery))
    : options;

  const optionId = index => `dropdown-${reactId}-option-${index}`;

  const openDropdown = preferLast => {
    const selectedIndex = filteredOptions.findIndex(option => option.value === value);
    const fallbackIndex = preferLast ? filteredOptions.length - 1 : 0;
    setHighlight(selectedIndex >= 0 ? selectedIndex : fallbackIndex);
    setIsOpen(true);
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setHighlight(-1);
    if (searchable) setQuery(selectedOption?.label || '');
  };

  const handleSelect = option => {
    onChange(option.value);
    setQuery(option.label || '');
    setIsOpen(false);
    setHighlight(-1);
  };

  const handleKeyDown = event => {
    const opensDropdown = ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key);
    if (!isOpen && opensDropdown) {
      event.preventDefault();
      openDropdown(event.key === 'ArrowUp');
      return;
    }

    if (!isOpen) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight(current => Math.min(current + 1, filteredOptions.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight(current => Math.max(current - 1, 0));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setHighlight(filteredOptions.length > 0 ? 0 : -1);
    } else if (event.key === 'End') {
      event.preventDefault();
      setHighlight(filteredOptions.length - 1);
    } else if (event.key === 'Enter' || (!searchable && event.key === ' ')) {
      event.preventDefault();
      if (highlight >= 0 && highlight < filteredOptions.length) {
        handleSelect(filteredOptions[highlight]);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeDropdown();
    } else if (event.key === 'Tab') {
      closeDropdown();
    }
  };

  useEffect(() => {
    if (!isOpen && searchable) setQuery(selectedOption?.label || '');
  }, [isOpen, searchable, selectedOption]);

  useEffect(() => {
    if (!isOpen) return;
    if (filteredOptions.length === 0) {
      setHighlight(-1);
    } else if (highlight >= filteredOptions.length) {
      setHighlight(filteredOptions.length - 1);
    }
  }, [filteredOptions.length, highlight, isOpen]);

  useEffect(() => {
    const handleDocClick = event => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        closeDropdown();
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
    // selectedOption is intentionally captured so the visible label is restored.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOption]);

  const comboboxProps = {
    role: 'combobox',
    'aria-label': label,
    'aria-expanded': isOpen,
    'aria-controls': listboxId,
    'aria-activedescendant': isOpen && highlight >= 0 ? optionId(highlight) : undefined,
    'aria-invalid': error || undefined,
    onKeyDown: handleKeyDown
  };

  return (
    <div ref={containerRef} className={`dropdown-container ${error ? 'dropdown-error' : ''}`}>
      {searchable ? (
        <div
          className={`dropdown-btn dropdown-control ${error ? 'error' : ''}`}
          onClick={() => {
            inputRef.current?.focus();
            if (!isOpen) openDropdown(false);
          }}
        >
          <input
            {...comboboxProps}
            ref={inputRef}
            className="dropdown-search-input"
            value={query}
            onChange={event => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              setIsOpen(true);
              setHighlight(0);
              if ((selectedOption && nextQuery !== selectedOption.label) || nextQuery.trim() === '') {
                onChange(null);
              }
            }}
            onFocus={() => {
              if (!isOpen) openDropdown(false);
            }}
            placeholder={placeholder}
            aria-autocomplete="list"
          />
          <i className={`fi fi-br-angle-${isOpen ? 'up' : 'down'} dropdown-arrow`} aria-hidden="true" />
        </div>
      ) : (
        <button
          {...comboboxProps}
          className={`dropdown-btn ${error ? 'error' : ''}`}
          onClick={() => {
            if (isOpen) closeDropdown();
            else openDropdown(false);
          }}
          type="button"
        >
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
          <i className={`fi fi-br-angle-${isOpen ? 'up' : 'down'} dropdown-arrow`} aria-hidden="true" />
        </button>
      )}

      {isOpen && (
        <div className="dropdown-menu" id={listboxId} role="listbox" aria-label={label}>
          {filteredOptions.length === 0 ? (
            <div className="dropdown-empty" role="status">Nenhuma opção encontrada</div>
          ) : (
            filteredOptions.map((option, index) => (
              <button
                key={option.value}
                id={optionId(index)}
                className={`dropdown-item ${value === option.value ? 'selected' : ''} ${highlight === index ? 'highlighted' : ''}`}
                onMouseEnter={() => setHighlight(index)}
                onMouseDown={event => event.preventDefault()}
                onClick={() => handleSelect(option)}
                type="button"
                role="option"
                aria-selected={value === option.value}
                tabIndex={-1}
              >
                {renderOption ? renderOption(option) : option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
