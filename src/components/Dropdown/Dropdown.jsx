import { useState } from 'react';
import './Dropdown.css';

const Dropdown = ({
  options,
  value,
  onChange,
  placeholder = 'Selecione uma opção',
  renderOption,
  error = false
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
  };

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`dropdown-container ${error ? 'dropdown-error' : ''}`}>
      <button
        className={`dropdown-btn ${error ? 'error' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <i className={`fi fi-br-angle-${isOpen ? 'up' : 'down'} dropdown-arrow`}></i>
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          {options.map((option) => (
            <button
              key={option.value}
              className={`dropdown-item ${value === option.value ? 'selected' : ''}`}
              onClick={() => handleSelect(option.value)}
              type="button"
            >
              {renderOption ? renderOption(option) : option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;

