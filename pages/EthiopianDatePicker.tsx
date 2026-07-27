
import React, { useEffect } from 'react';
import { ETHIOPIAN_MONTHS } from '../services/ethiopianDate';

interface Props {
  value: string; // Expected format "YYYY-MM-DD" (Ethiopian)
  onChange: (val: string) => void;
  className?: string;
}

const EthiopianDatePicker: React.FC<Props> = ({ value, onChange, className }) => {
  // Parse existing value or default
  const [year, month, day] = value ? value.split('-') : ["2016", "01", "01"];

  // Years range: 2010 to 2030 (Ethiopian)
  const years = Array.from({ length: 21 }, (_, i) => (2010 + i).toString());
  
  // Days: 1 to 30 (Pagume is 5/6, but 30 is safe for UI simplicty in dropdown)
  const days = Array.from({ length: 30 }, (_, i) => (i + 1).toString().padStart(2, '0'));

  const handleChange = (type: 'y'|'m'|'d', val: string) => {
    let newYear = year;
    let newMonth = month;
    let newDay = day;

    if (type === 'y') newYear = val;
    if (type === 'm') newMonth = val;
    if (type === 'd') newDay = val;

    onChange(`${newYear}-${newMonth}-${newDay}`);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <select 
        className="bg-slate-800 border border-military-700 text-white p-2 rounded focus:border-gold-500 outline-none w-1/3"
        value={day}
        onChange={(e) => handleChange('d', e.target.value)}
      >
        {days.map(d => <option key={d} value={d}>{d}</option>)}
        {/* Handle Pagume logic implicitly or allow up to 30 for simplicity */}
      </select>
      
      <select 
        className="bg-slate-800 border border-military-700 text-white p-2 rounded focus:border-gold-500 outline-none w-1/3"
        value={month}
        onChange={(e) => handleChange('m', e.target.value)}
      >
        {ETHIOPIAN_MONTHS.map((m, idx) => {
          const val = (idx + 1).toString().padStart(2, '0');
          return <option key={m} value={val}>{m}</option>
        })}
      </select>

      <select 
        className="bg-slate-800 border border-military-700 text-white p-2 rounded focus:border-gold-500 outline-none w-1/3"
        value={year}
        onChange={(e) => handleChange('y', e.target.value)}
      >
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
};

export default EthiopianDatePicker;
