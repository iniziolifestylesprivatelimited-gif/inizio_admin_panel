import { useState, useRef, useEffect } from 'react';
import { FiChevronDown } from 'react-icons/fi';

const CustomDropdown = ({ value, onChange, options, statusColor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to determine display label and value
  const getOptionInfo = (option) => {
    if (typeof option === 'object' && option !== null) {
      return { value: option.value, label: option.label };
    }
    return { value: option, label: option };
  };

  const selectedOption = options.map(getOptionInfo).find(opt => opt.value === value) || { value, label: value };

  return (
    <div className="relative w-full font-medium" ref={dropdownRef}>
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-transparent outline-none pr-8 pl-3 py-2.5 rounded-lg border cursor-pointer transition-all flex justify-between items-center select-none ${statusColor}`}
      >
        {selectedOption.label}
        <FiChevronDown className={`absolute right-2.5 top-1/2 -translate-y-1/2 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} text-current opacity-70`} />
      </div>

      {/* Options List */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-white/10 rounded-lg shadow-xl shadow-black/60 max-h-60 overflow-y-auto custom-scrollbar z-50 animate-in fade-in slide-in-from-top-2">
          {options.map((option, idx) => {
            const { value: optValue, label: optLabel } = getOptionInfo(option);
            return (
              <div
                key={idx}
                onClick={() => {
                  onChange(optValue);
                  setIsOpen(false);
                }}
                className={`px-3 py-2.5 text-xs font-bold cursor-pointer transition-colors ${
                  value === optValue ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {optLabel}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;