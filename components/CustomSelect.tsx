
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Option {
  value: string | number;
  label: string;
  className?: string; // Support for custom styling (indentation, colors)
}

interface CustomSelectProps {
  value: string | number;
  onChange: (value: any) => void;
  options: (Option | string | number)[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options, placeholder = "Select", className = "", disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizedOptions: Option[] = options.map(opt => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: opt, label: String(opt) };
    }
    return opt as Option;
  });

  const selectedOption = normalizedOptions.find(o => String(o.value) === String(value));

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button 
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full flex justify-between items-center text-left
          bg-slate-800 border transition-all duration-300 rounded-lg px-4 py-3
          text-sm font-medium shadow-sm relative overflow-hidden group
          ${disabled ? 'opacity-50 cursor-not-allowed border-gray-700 bg-gray-800' : 'hover:border-gold-500/50 hover:shadow-[0_0_15px_rgba(212,175,55,0.1)]'}
          ${isOpen ? 'border-gold-500 ring-1 ring-gold-500/50 text-white' : 'border-military-600 text-gray-200'}
        `}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-gold-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"/>
        
        <span className={`block truncate relative z-10 ${!selectedOption ? 'text-gray-400' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        
        <ChevronDown 
          size={16} 
          className={`ml-2 text-gold-500 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'rotate-180 scale-110' : 'rotate-0'}`} 
        />
      </button>

      {/* Dropdown Menu */}
      <div className={`
        absolute left-0 w-full mt-2 origin-top-right bg-slate-900 border border-gold-500/30 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] 
        overflow-hidden z-[100] transition-all duration-200 ease-out transform backdrop-blur-md
        ${isOpen ? 'opacity-100 scale-100 translate-y-0 visible' : 'opacity-0 scale-95 -translate-y-2 invisible pointer-events-none'}
      `}>
         <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gold-500/30 scrollbar-track-transparent p-1.5 space-y-1">
            {normalizedOptions.map((opt, index) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div
                  key={`${opt.value}-${index}`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`
                    flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-all duration-200 group
                    ${isSelected 
                        ? 'bg-gold-500 text-black font-bold shadow-md' 
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'}
                    ${opt.className || ''} 
                  `}
                >
                  <span className={`truncate ${isSelected ? '' : 'group-hover:translate-x-1 transition-transform duration-200'}`}>
                    {opt.label}
                  </span>
                  {isSelected && <Check size={14} className="ml-2 shrink-0 animate-in zoom-in duration-200" />}
                </div>
              );
            })}
            {normalizedOptions.length === 0 && (
              <div className="p-4 text-gray-500 text-center text-xs italic">{t('noOptions')}</div>
            )}
         </div>
      </div>
    </div>
  );
};

export default CustomSelect;
