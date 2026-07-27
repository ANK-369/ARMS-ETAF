
import React, { useMemo } from 'react';
import { getUniqueValues } from '../services/db';
import { AppData } from '../types';

interface SmartInputProps {
  collection: keyof AppData;
  field: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  type?: string;
  disabled?: boolean;
}

const SmartInput: React.FC<SmartInputProps> = ({ 
  collection, 
  field, 
  value, 
  onChange, 
  placeholder, 
  className,
  required,
  type = "text",
  disabled
}) => {
  // Memoize suggestions to prevent querying DB on every render
  // Only re-calc if collection/field changes (usually static)
  const suggestions = useMemo(() => {
      return getUniqueValues(collection, field);
  }, [collection, field]);

  const listId = `list-${collection}-${field}`;

  return (
    <div>
      <input 
        type={type}
        list={listId}
        value={value} 
        onChange={onChange}
        placeholder={placeholder}
        className={className}
        required={required}
        disabled={disabled}
      />
      <datalist id={listId}>
        {suggestions.map((val, idx) => (
          <option key={idx} value={val} />
        ))}
      </datalist>
    </div>
  );
};

export default SmartInput;
