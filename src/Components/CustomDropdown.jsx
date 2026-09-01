import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiChevronDown } from 'react-icons/fi';

const CustomDropdown = ({ value, onChange, options, statusColor, defaultLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, minWidth: 0 });
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6,
        left: rect.left,
        minWidth: rect.width
      });
    }
  };

  const toggleDropdown = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  // Close dropdown when clicking outside or scrolling
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        menuRef.current && !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      if (isOpen) {
        updatePosition();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

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
        onClick={toggleDropdown}
        className={`w-full bg-transparent outline-none px-3 py-2.5 rounded-lg border cursor-pointer transition-all flex justify-between items-center select-none gap-2 ${statusColor}`}
      >
        <span className="truncate">{(!value && defaultLabel) ? defaultLabel : selectedOption.label}</span>
        <FiChevronDown className={`shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} text-current opacity-70`} />
      </div>

      {/* Options List rendered via createPortal */}
      {isOpen && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            minWidth: `${coords.minWidth}px`
          }}
          className="w-max max-w-[280px] bg-slate-950/65 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl shadow-black/80 max-h-60 overflow-y-auto overflow-x-hidden custom-scrollbar z-[99999] animate-dropdown"
        >
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
                  value === optValue ? 'bg-blue-600/65 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {optLabel}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};

export default CustomDropdown;