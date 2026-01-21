import { useState, useEffect, useRef } from 'react';
import './Dropdown.css';

const Dropdown = ({
  options,
  value,
  onChange,
  placeholder = 'Selecione uma opção',
  renderOption,
  error = false,
  searchable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef(null);

  const handleSelect = (option) => {
    // option is the full option object { value, label }
    onChange(option.value);
    setQuery(option.label || '');
    setIsOpen(false);
  };

  const selectedOption = options.find(opt => opt.value === value);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = searchable && normalizedQuery.length > 0
    ? options.filter(o => (o.label || '').toLowerCase().includes(normalizedQuery))
    : options;

  // sync highlight with filteredOptions/open
  useEffect(() => {
    if (!isOpen) return;
    setHighlight(filteredOptions.length > 0 ? 0 : -1);
  }, [isOpen, filteredOptions.length]);

  const displayedInput = searchable ? (query !== '' ? query : (selectedOption ? selectedOption.label : '')) : '';

  const handleButtonClick = () => {
    setIsOpen((p) => !p);
  };

  const handleKeyDown = (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      e.preventDefault();
      return;
    }

    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (Math.min(Math.max(h, 0) + 1, filteredOptions.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? 0 : h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlight >= 0 && highlight < filteredOptions.length) {
        handleSelect(filteredOptions[highlight]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      // restore input to selected label
      setQuery(selectedOption ? selectedOption.label || '' : '');
    }
  };

  // close when clicking outside
  useEffect(() => {
    const handleDocClick = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setQuery(selectedOption ? selectedOption.label || '' : '');
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [selectedOption]);

  return (
    <div ref={containerRef} className={`dropdown-container ${error ? 'dropdown-error' : ''}`}>
      <button
        className={`dropdown-btn ${error ? 'error' : ''}`}
        onClick={handleButtonClick}
        onKeyDown={!searchable ? handleKeyDown : undefined}
        type="button"
      >
        {searchable ? (
          <input
            className="dropdown-search-input"
            value={displayedInput}
            onChange={(e) => {
              const v = e.target.value;
              setQuery(v);
              setIsOpen(true);
              // If user cleared the field or changed the text away from the selected label,
              // clear the current selection so the dropdown value matches the input
              if ((selectedOption && v !== selectedOption.label) || v.trim() === '') {
                onChange(null);
              }
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
            placeholder="Buscar curso..."
          />
        ) : (
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
        )}
        <i className={`fi fi-br-angle-${isOpen ? 'up' : 'down'} dropdown-arrow`}></i>
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          {filteredOptions.length === 0 ? (
            <div className="dropdown-empty">Curso não encontrado</div>
          ) : (
            filteredOptions.map((option, idx) => (
              <button
                key={option.value}
                className={`dropdown-item ${value === option.value ? 'selected' : ''} ${highlight === idx ? 'highlighted' : ''}`}
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => { handleSelect(option); }}
                type="button"
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
