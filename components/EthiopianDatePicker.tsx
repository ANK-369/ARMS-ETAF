
import React, { useMemo, useEffect } from 'react';
import { ETHIOPIAN_MONTHS, ETHIOPIAN_MONTHS_AMHARIC } from '../services/ethiopianDate';
import CustomSelect from './CustomSelect';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  value: string; // Expected format "YYYY-MM-DD" (Ethiopian)
  onChange: (val: string) => void;
  className?: string;
}

const EthiopianDatePicker: React.FC<Props> = ({ value, onChange, className }) => {
  const { language } = useLanguage();
  
  // Parse existing value or default
  const [year, month, day] = value ? value.split('-') : ["2016", "01", "01"];

  // Years range: 2018 to 2080 (Ethiopian)
  const years = Array.from({ length: 63 }, (_, i) => (2018 + i).toString());
  
  // Calculate Max Days for current selection
  const maxDays = useMemo(() => {
      const y = parseInt(year);
      const m = parseInt(month);
      
      // Pagume (13th Month)
      if (m === 13) {
          // Ethiopian Leap Year Check: Remainder 3 = Leap (6 days)
          return (y % 4 === 3) ? 6 : 5;
      }
      return 30;
  }, [year, month]);
  
  // Auto-correct date if out of bounds (e.g. switching from Tikimt 30 to Pagume)
  // This handles external updates or initial inconsistent state
  useEffect(() => {
    if (parseInt(day) > maxDays) {
      const correctedDay = maxDays.toString().padStart(2, '0');
      if (correctedDay !== day) {
        onChange(`${year}-${month}-${correctedDay}`);
      }
    }
  }, [maxDays, day, month, year, onChange]);

  // Days: 1 to maxDays
  const days = Array.from({ length: maxDays }, (_, i) => (i + 1).toString().padStart(2, '0'));

  const handleChange = (type: 'y'|'m'|'d', val: string) => {
    let newYear = year;
    let newMonth = month;
    let newDay = day;

    if (type === 'y') newYear = val;
    if (type === 'm') newMonth = val;
    if (type === 'd') newDay = val;

    // IMMEDIATE CLAMP CHECK
    // Ensure day is valid for the new month/year selection before notifying parent
    const y = parseInt(newYear);
    const m = parseInt(newMonth);
    let currentMax = 30;
    if (m === 13) {
        currentMax = (y % 4 === 3) ? 6 : 5;
    }
    
    if (parseInt(newDay) > currentMax) {
        newDay = currentMax.toString().padStart(2, '0');
    }

    onChange(`${newYear}-${newMonth}-${newDay}`);
  };

  const monthOptions = ETHIOPIAN_MONTHS.map((m, idx) => ({
      value: (idx + 1).toString().padStart(2, '0'),
      label: language === 'am' ? ETHIOPIAN_MONTHS_AMHARIC[idx] : m
  }));

  return (
    <div className={`flex gap-2 ${className}`}>
      <div className="w-1/3">
          <CustomSelect 
            value={day}
            onChange={(val) => handleChange('d', val)}
            options={days}
            placeholder="Day"
          />
      </div>
      
      <div className="w-1/3">
          <CustomSelect 
            value={month}
            onChange={(val) => handleChange('m', val)}
            options={monthOptions}
            placeholder="Month"
          />
      </div>

      <div className="w-1/3">
          <CustomSelect 
            value={year}
            onChange={(val) => handleChange('y', val)}
            options={years}
            placeholder="Year"
          />
      </div>
    </div>
  );
};

export default EthiopianDatePicker;
