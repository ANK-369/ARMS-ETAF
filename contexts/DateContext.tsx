
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { getCurrentEthiopianDate } from '../services/ethiopianDate';

interface DateContextType {
  month: string;
  setMonth: (m: string) => void;
  year: string;
  setYear: (y: string) => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export const DateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize with current date
  const currentEth = getCurrentEthiopianDate();
  const [defaultY, defaultM] = currentEth.split('-');

  const [month, setMonthState] = useState<string>(() => {
    const stored = localStorage.getItem('arms_selected_month');
    if (stored) return stored;
    return defaultM;
  });
  const [year, setYearState] = useState<string>(() => {
    const stored = localStorage.getItem('arms_selected_year');
    if (stored) return stored;
    return defaultY;
  });

  const setMonth = (m: string) => {
    setMonthState(m);
    localStorage.setItem('arms_selected_month', m);
  };

  const setYear = (y: string) => {
    setYearState(y);
    localStorage.setItem('arms_selected_year', y);
  };

  return (
    <DateContext.Provider value={{ month, setMonth, year, setYear }}>
      {children}
    </DateContext.Provider>
  );
};

export const useDate = () => {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error('useDate must be used within a DateProvider');
  }
  return context;
};
