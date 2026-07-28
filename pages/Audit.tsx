
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getDB } from '../services/db';
import { AppData, ManpowerType, Command, GitHubConfig, Manpower } from '../types';
import { 
  Printer, Trash2, Settings, FileText, 
  Bold, Italic, Underline, List, ListOrdered, 
  Calculator, Plus, X, RotateCcw, Download, Upload, 
  Database, Book, AlertTriangle, CheckCircle, Save, Type, ArrowLeftRight, Hash, DollarSign,
  Maximize2, Minimize2, History, CheckSquare, Square, Delete, Edit, Monitor, Eye, Github, Cloud, RefreshCw, Link,
  AlignLeft, AlignCenter, AlignRight, Table as TableIcon, Eraser, Delete as DeleteIcon, Lock, EyeOff, KeyRound, Cpu, Copy
} from 'lucide-react';
import { ETHIOPIAN_MONTHS, ETHIOPIAN_MONTHS_AMHARIC, getCurrentEthiopianDate, isActiveDate, formatEthiopianDate } from '../services/ethiopianDate';
import { downloadFile, generateHTMLDoc, parseImportFile } from '../services/dataTransfer';
import CustomSelect from '../components/CustomSelect';
import ConfirmDialog from '../components/ConfirmDialog';
import { useLanguage } from '../contexts/LanguageContext';
import { useDate } from '../contexts/DateContext';
import { getGitHubConfig, saveGitHubConfig, fetchFromGitHub, pushToGitHub, autoDetectGitHubPath } from '../services/githubService';

// --- SUB-COMPONENT: PAGEBREAK ---
const PageBreak: React.FC = () => {
  return (
    <div className="print-page-break" style={{ pageBreakBefore: 'always', breakBefore: 'page' }} />
  );
};

// --- SUB-COMPONENT: AUTOMATED AUDIT ---
const AutomatedAudit = ({ data }: { data: AppData }) => {
  const { t, language } = useLanguage();
  
  // Use Global Date Context
  const { month: filterMonth, setMonth: setFilterMonth, year: filterYear, setYear: setFilterYear } = useDate();

  const [showSettings, setShowSettings] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const auditRef = useRef<HTMLDivElement>(null);

  // Editable Letter Head Fields
  const [date, setDate] = useState("");
  const [recipient, setRecipient] = useState("ለ4ኛ አ/ም/ም/አዛዥ ለኤር ሎጀስቲክ");
  const [city, setCity] = useState("ባህር ዳር");
  const [subjectPrefix, setSubjectPrefix] = useState("ጉዳዩ");
  const [pageCount, setPageCount] = useState("4");
  const [leaderName, setLeaderName] = useState("ሻ/ል ጌታሰው");
  const [diningName, setDiningName] = useState("የሜድሮክ ግብር ቤት ቦርድ ሰብሳቢ");
  const [auditorName, setAuditorName] = useState("፲/አለቃ አንዱዓለም ኮሪያ");
  
  // Settings: Standard Monthly Rate (Allow string for empty input)
  const [monthlyRate, setMonthlyRate] = useState<string | number>(3000);
  const [useStandardRate, setUseStandardRate] = useState(false); // Default OFF

  useEffect(() => {
    const mName = language === 'am' 
      ? (ETHIOPIAN_MONTHS_AMHARIC[parseInt(filterMonth) - 1] || "")
      : (ETHIOPIAN_MONTHS[parseInt(filterMonth) - 1] || "");
      
    if (language === 'am') {
        setDate(`${mName} 30 ቀን ${filterYear} ዓ/ም`);
    } else {
        setDate(`${mName} 30, ${filterYear}`);
    }
  }, [filterMonth, filterYear, language, t]);

  // Dynamic document.title for PDF filename on print
  useEffect(() => {
    const originalTitle = document.title;
    if (showPrintModal) {
      const mNameAmharic = ETHIOPIAN_MONTHS_AMHARIC[parseInt(filterMonth) - 1] || "";
      document.title = `የ${mNameAmharic} ወር ኦዲት ${filterYear}`;
    }
    return () => {
      document.title = originalTitle;
    };
  }, [showPrintModal, filterMonth, filterYear]);

  // Sync current Automated Report HTML to localStorage for Manual Editor
  useEffect(() => {
    const timer = setTimeout(() => {
      if (auditRef.current) {
        localStorage.setItem('arms_automated_audit_html', auditRef.current.innerHTML);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [
    filterMonth, filterYear, language, date, recipient, city, 
    subjectPrefix, pageCount, leaderName, diningName, auditorName, 
    monthlyRate, useStandardRate, data
  ]);

  // STRICT MONTH DATA FILTER
  const getMonthData = (collection: any[], dateField: string) => {
    return collection.filter(item => {
      if (!item[dateField]) return false;
      const [y, m] = item[dateField].split('-');
      return y === filterYear && m === filterMonth;
    });
  };

  // --- MANPOWER LOGIC REVISED ---
  // 1. Filter: Show personnel belonging to the selected month (Overlap logic)
  const monthStart = `${filterYear}-${filterMonth}-01`;
  const monthEnd = `${filterYear}-${filterMonth}-30`; 
  
  const relevantManpower = data.manpower.filter(m => {
      // Basic Overlap Check: Start <= MonthEnd AND End >= MonthStart
      return m.startDate <= monthEnd && m.endDate >= monthStart;
  });

  // 2. Status: Determine Active/Inactive based on CURRENT DAY (Real-time)
  const currentEth = getCurrentEthiopianDate();
  const currentDay = parseInt(currentEth.split('-')[2]) || 30; // 1-30
  
  // Determine if Selected Month is in the Future
  const [currY, currM] = currentEth.split('-');
  const isFutureMonth = (parseInt(filterYear) > parseInt(currY)) || (parseInt(filterYear) === parseInt(currY) && parseInt(filterMonth) > parseInt(currM));

  // Helper: Get Effective Start/End days for THIS selected month
  const getEffectiveRange = (m: Manpower) => {
      const [sY, sM, sD] = m.startDate.split('-');
      const [eY, eM, eD] = m.endDate.split('-');

      let startDay = 1;
      let endDay = 30;

      // If started in this month/year, use specific day. Otherwise (started prev), use 1.
      if (sY === filterYear && sM === filterMonth) {
          startDay = parseInt(sD);
      } else if (m.startDate > monthStart) {
          // Should not happen due to overlap filter, but safe guard
          startDay = 31; // Inactive
      }

      // If ends in this month/year, use specific day. Otherwise (ends future), use 30.
      if (eY === filterYear && eM === filterMonth) {
          endDay = parseInt(eD);
      } else if (m.endDate < monthEnd) {
          // Ends before this month? overlap filter handles it, but logic:
          endDay = 0; // Inactive
      }

      return { startDay, endDay };
  };

  const isManpowerActive = (m: Manpower) => {
      if (isFutureMonth) return true; // Everyone is considered active in future months (until proven otherwise)
      const { startDay, endDay } = getEffectiveRange(m);
      // Active if current day is within the EFFECTIVE range for this month
      return currentDay >= startDay && currentDay <= endDay;
  };

  // --- FINANCIALS ---
  const rateVal = Number(monthlyRate) || 0;
  
  const payrollList: Manpower[] = [];
  const gfList: Manpower[] = [];
  const navyList: Manpower[] = [];
  const sfList: Manpower[] = [];
  const fullCashList: Manpower[] = [];
  const halfCashList: Manpower[] = [];
  const transientList: Manpower[] = [];
  const pensionList: Manpower[] = [];

  const overpaidMap: Record<number, number> = {}; 
  let totalOverpaid = 0;

  relevantManpower.forEach(m => {
      if (m.type === ManpowerType.HALF_CASH) {
          halfCashList.push(m);
      } else if (m.type === ManpowerType.TRANSIENT) {
          transientList.push(m);
      } else if (m.type === ManpowerType.PENSION) {
          pensionList.push(m);
      } else {
          // Standard/Full Payers
          if (useStandardRate) {
              const actualAmount = Number(m.amount) || 0;
              if (actualAmount > rateVal) {
                  const diff = actualAmount - rateVal;
                  overpaidMap[diff] = (overpaidMap[diff] || 0) + 1;
                  totalOverpaid += diff;
              }
          }

          if (m.type === ManpowerType.PAYROLL) payrollList.push(m);
          else if (m.command === Command.GF) gfList.push(m);
          else if (m.command === Command.NV) navyList.push(m);
          else if (m.command === Command.SF) sfList.push(m);
          else fullCashList.push(m);
      }
  });

  const overpaidString = Object.entries(overpaidMap).map(([diff, count]) => `${count} * ${diff}`).join(', ');

  // Calculation Helper
  const getCategoryTotal = (list: Manpower[]) => {
      if (useStandardRate) return list.length * rateVal;
      // If NOT using standard rate, Sum individual amounts
      return list.reduce((acc, m) => acc + (Number(m.amount) || 0), 0);
  };

  const payrollTotal = getCategoryTotal(payrollList);
  const gfTotal = getCategoryTotal(gfList);
  const navyTotal = getCategoryTotal(navyList);
  const sfTotal = getCategoryTotal(sfList);
  const fullCashTotal = getCategoryTotal(fullCashList);
  
  const halfCashTotal = halfCashList.reduce((acc, m) => acc + (Number(m.amount) || 0), 0);
  const transientTotal = transientList.reduce((acc, c) => Number(acc) + Number(c.amount || 0), 0);
  
  // Strictly filtered by selected month
  const itemsInMonth = getMonthData(data.incomeItems, 'date');
  const itemsTotal = itemsInMonth.reduce((acc, i) => Number(acc) + (Number(i.amount) * Number(i.singlePrice)), 0);
  
  const subsidyInMonth = getMonthData(data.subsidies, 'date');
  const subsidyFinancial = subsidyInMonth.filter(s => s.type === 'Financial').reduce((acc, s) => Number(acc) + Number(s.amount), 0);
  
  // Transfers: Strictly logic -> Transfers registered IN this month (moving to next)
  // We use storeItems with category 'transfer' filtered by selected month
  const transferredItems = getMonthData(data.storeItems || [], 'date').filter(i => i.category === 'transfer');
  const totalTransferredValue = transferredItems.reduce((acc, i) => acc + (Number(i.amount) * Number(i.singlePrice)), 0);

  // Transfers from Previous Month (Income)
  const currentMonthNameEng = ETHIOPIAN_MONTHS[parseInt(filterMonth) - 1];
  const transfersIn = data.transfers.filter(t => t.dateTo === currentMonthNameEng);
  const transferTotal = transfersIn.reduce((acc, t) => Number(acc) + Number(t.amount), 0);

  // --- EXPENDITURE ---
  const expensesInMonth = getMonthData(data.expenses, 'date');
  const marketExpenses = expensesInMonth.filter(e => e.category === 'Market');
  
  const aggregatedMarketExpenses = marketExpenses.reduce((acc: any[], curr) => {
      const existing = acc.find(item => item.itemName.toLowerCase().trim() === curr.itemName.toLowerCase().trim());
      const currTotalCost = Number(curr.amount) * Number(curr.singlePrice || 0);
      if (existing) {
          existing.amount = Number(existing.amount) + Number(curr.amount); 
          existing.tempTotalCost = Number(existing.tempTotalCost) + currTotalCost; 
          if (existing.amount > 0) existing.singlePrice = existing.tempTotalCost / existing.amount;
      } else {
          acc.push({ ...curr, amount: Number(curr.amount), tempTotalCost: currTotalCost });
      }
      return acc;
  }, []);
  
  const marketTotal = aggregatedMarketExpenses.reduce((acc, e) => Number(acc) + Number(e.tempTotalCost), 0);
  const wageTotal = expensesInMonth.filter(e => e.category === 'Wage').reduce((acc, e) => Number(acc) + Number(e.amount), 0);
  const otherTotal = expensesInMonth.filter(e => e.category === 'Other').reduce((acc, e) => Number(acc) + Number(e.amount), 0);
  
  const refundsInMonth = getMonthData(data.refunds, 'stopDate');
  const refundTotal = refundsInMonth.reduce((acc, r) => Number(acc) + Number(r.amount), 0);
  const refundCount = refundsInMonth.length;

  const totalIncomeCalc = payrollTotal + gfTotal + navyTotal + sfTotal + fullCashTotal + (useStandardRate ? totalOverpaid : 0) + halfCashTotal + transientTotal + itemsTotal + subsidyFinancial + transferTotal;
  const totalExpenseCalc = marketTotal + wageTotal + refundTotal + otherTotal;
  const netResult = totalIncomeCalc - totalExpenseCalc;

  // Sorting Manpower for Display
  const sortedManpower = [...relevantManpower].sort((a, b) => {
    if (a.type < b.type) return -1;
    if (a.type > b.type) return 1;
    return 0;
  });

  // Calculate stats based on "isManpowerActive" (Day logic)
  const activeCount = sortedManpower.filter(isManpowerActive).length;
  const inactiveCount = sortedManpower.length - activeCount;

  const fmt = (val: number) => val > 0 ? val.toLocaleString() : '--';
  const handlePrint = () => {
    const originalTitle = document.title;
    const formattedMonth = ETHIOPIAN_MONTHS[parseInt(filterMonth) - 1] || filterMonth;
    const formattedMonthAm = ETHIOPIAN_MONTHS_AMHARIC[parseInt(filterMonth) - 1] || filterMonth;
    
    const printTitle = language === 'am'
      ? `${formattedMonthAm}_${filterYear}_ኦዲት_ሪፖርት`
      : `${formattedMonth}_${filterYear}_Audit_Report`;
      
    document.title = printTitle;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const yearsOptions = Array.from({length: 51}, (_, i) => (2000 + i).toString());
  const monthOptions = ETHIOPIAN_MONTHS.map((m, i) => ({
      value: (i + 1).toString().padStart(2, '0'),
      label: language === 'am' ? ETHIOPIAN_MONTHS_AMHARIC[i] : m
  }));

  const mName = language === 'am' 
      ? (ETHIOPIAN_MONTHS_AMHARIC[parseInt(filterMonth) - 1] || "")
      : (ETHIOPIAN_MONTHS[parseInt(filterMonth) - 1] || "");

  // Helper for Display Labels
  const getLabel = (key: string, count: number) => {
      if (useStandardRate) return `${t(key)} (${count} * ${rateVal})`;
      return `${t(key)} (${count})`;
  };

  const PrintableContent = () => {
    const chunkArray = <T,>(arr: T[], size: number): T[][] => {
      if (!arr || arr.length === 0) return [[]];
      const chunks: T[][] = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };

    const marketChunks = chunkArray(aggregatedMarketExpenses, 15);
    const transferChunks = chunkArray(transferredItems, 14);
    const manpowerChunks = chunkArray(sortedManpower, 20);

    const sectionsToRender: Array<{ id: string; render: () => React.ReactNode }> = [
      // 1. Cover Letter
      {
        id: 'letter',
        render: () => (
          <div>
                <div className="flex justify-end mb-8 font-bold text-sm border-b border-black/20 pb-2 text-black"><p>{date}</p></div>
                <div className="mb-8 text-black">
                    <p className="font-bold uppercase tracking-wider text-sm">{recipient}</p>
                    <p className="font-bold uppercase tracking-wider text-sm mt-1">{city}</p>
                </div>
                <div className="mb-10 text-center text-black">
                    <p className="font-bold underline text-xl tracking-wide">
                        {subjectPrefix}፦ {language === 'am' 
                            ? `${t('auditReportFor')}${mName} ${t('auditSubjectSuffix')}` 
                            : `${t('auditReportFor')} ${mName} ${filterYear} ${t('auditSubjectSuffix')}`}
                    </p>
                </div>
                <div className="mb-12 text-justify text-lg leading-8 text-black">
                    <p>
                        {language === 'am'
                            ? `${t('auditBodyIntro')}${mName} ${t('auditBodyMid')} ${filterYear} ${t('auditBodyEnd')} ${pageCount} ${t('auditBodyPages')}`
                            : `${t('auditBodyIntro')} ${mName} ${t('auditBodyMid')} ${filterYear} ${t('auditBodyEnd')} ${pageCount} ${t('auditBodyPages')}`
                        }
                    </p>
                </div>
                <div className="mt-32 text-black">
                    <div className="flex flex-col items-end pr-8 mb-24">
                        <div className="flex flex-col items-center w-64">
                            <p className="font-bold mb-20">{t('withRegards')}</p>
                            <div className="h-0.5 bg-black w-48 mb-2"></div> 
                            <p className="font-bold text-lg">{leaderName}</p>
                            <p className="text-xs uppercase font-bold text-black text-center">{diningName}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-start pl-8">
                        <div className="flex flex-col items-center w-64">
                            <div className="h-0.5 bg-black w-48 mb-2"></div>
                            <p className="font-bold text-lg">{auditorName}</p>
                            <p className="text-sm uppercase tracking-widest font-bold">{t('auditor')}</p>
                        </div>
                    </div>
                </div>
          </div>
        )
      },
      // 2. Summary
      {
        id: 'summary',
        render: () => (
          <div>
                <h2 className="text-xl font-bold text-center underline mb-8 text-black uppercase">{t('incomeExpenseSummary')}</h2>
                
                <div className="mb-8">
                    <h3 className="font-bold text-lg mb-4 text-black border-b-2 border-black pb-1">{t('incomeTitle')}</h3>
                    <table className="w-full text-sm text-black border-collapse">
                        <tbody>
                            <tr className="border-b border-gray-300"><td className="p-2">{getLabel('payrollCount', payrollList.length)}</td><td className="p-2 text-right font-mono">{fmt(payrollTotal)}</td></tr>
                            {gfList.length > 0 && <tr className="border-b border-gray-300"><td className="p-2">{getLabel('groundForce', gfList.length)}</td><td className="p-2 text-right font-mono">{fmt(gfTotal)}</td></tr>}
                            {navyList.length > 0 && <tr className="border-b border-gray-300"><td className="p-2">{getLabel('Navy', navyList.length)}</td><td className="p-2 text-right font-mono">{fmt(navyTotal)}</td></tr>}
                            {sfList.length > 0 && <tr className="border-b border-gray-300"><td className="p-2">{getLabel('Special Force', sfList.length)}</td><td className="p-2 text-right font-mono">{fmt(sfTotal)}</td></tr>}
                            <tr className="border-b border-gray-300"><td className="p-2">{getLabel('fullCash', fullCashList.length)}</td><td className="p-2 text-right font-mono">{fmt(fullCashTotal)}</td></tr>
                            {useStandardRate && totalOverpaid > 0 && <tr className="border-b border-gray-300"><td className="p-2">{t('overpaidAmount')} ({overpaidString})</td><td className="p-2 text-right font-mono">{fmt(totalOverpaid)}</td></tr>}
                            <tr className="border-b border-gray-300"><td className="p-2">{t('halfCash')} ({halfCashList.length} {t('people')})</td><td className="p-2 text-right font-mono">{fmt(halfCashTotal)}</td></tr>
                            <tr className="border-b border-gray-300"><td className="p-2">{t('transient')} ({transientList.length} {t('people')})</td><td className="p-2 text-right font-mono">{fmt(transientTotal)}</td></tr>
                            {subsidyFinancial > 0 && <tr className="border-b border-gray-300"><td className="p-2">{t('subsidy')}</td><td className="p-2 text-right font-mono">{fmt(subsidyFinancial)}</td></tr>}
                            <tr className="border-b border-gray-300"><td className="p-2">{t('miscIncome')}</td><td className="p-2 text-right font-mono">{fmt(itemsTotal)}</td></tr>
                            <tr className="border-b border-gray-300"><td className="p-2">{t('transferFromPrev')}</td><td className="p-2 text-right font-mono">{fmt(transferTotal)}</td></tr>
                            <tr className="font-bold bg-gray-100 border-t-2 border-black text-base"><td className="p-3">{t('totalIncome')}</td><td className="p-3 text-right font-mono">{fmt(totalIncomeCalc)}</td></tr>
                        </tbody>
                    </table>
                </div>

                <div className="mb-2">
                    <h3 className="font-bold text-lg mb-4 text-black border-b-2 border-black pb-1">{t('expenditureTitle')}</h3>
                    <table className="w-full text-sm text-black border-collapse">
                        <tbody>
                            <tr className="border-b border-gray-300"><td className="p-2">{t('market')}</td><td className="p-2 text-right font-mono">{fmt(marketTotal)}</td></tr>
                            <tr className="border-b border-gray-300"><td className="p-2">{t('wage')}</td><td className="p-2 text-right font-mono">{fmt(wageTotal)}</td></tr>
                            <tr className="border-b border-gray-300"><td className="p-2">{t('refund')} ({refundCount} {t('people')})</td><td className="p-2 text-right font-mono">{fmt(refundTotal)}</td></tr>
                            <tr className="border-b border-gray-300"><td className="p-2">{t('otherCosts')}</td><td className="p-2 text-right font-mono">{fmt(otherTotal)}</td></tr>
                            <tr className="font-bold bg-gray-100 border-t-2 border-black text-base"><td className="p-3">{t('totalExpense')}</td><td className="p-3 text-right font-mono">{fmt(totalExpenseCalc)}</td></tr>
                        </tbody>
                    </table>
                </div>

                <div className="mt-8 border-t-4 border-double border-black pt-4">
                    <div className="flex justify-between items-center text-xl font-bold text-black">
                        <span>{t('netBalance')}</span>
                        <span className={`font-mono px-4 py-1 rounded ${netResult >= 0 ? 'bg-gray-200' : 'bg-red-100'}`}>
                            {netResult.toLocaleString()} {t('birr')}
                        </span>
                    </div>
                </div>
          </div>
        )
      }
    ];

    // 3. Market Expense Detail (Paginated)
    marketChunks.forEach((chunk, chunkIdx) => {
      const isLast = chunkIdx === marketChunks.length - 1;
      const startIdx = chunkIdx * 15;
      sectionsToRender.push({
        id: `market-${chunkIdx}`,
        render: () => (
          <div>
            <h2 className="text-xl font-bold text-center underline mb-6 text-black uppercase">
              {t('marketListTitle')}{marketChunks.length > 1 ? ` (${chunkIdx + 1}/${marketChunks.length})` : ''}
            </h2>
            <div>
              <table className="w-full text-xs md:text-sm text-black border border-black">
                <thead className="bg-gray-200 font-bold uppercase">
                  <tr>
                    <th className="border border-black p-2 text-center w-12">{t('sno')}</th>
                    <th className="border border-black p-2 text-left">{t('itemType')}</th>
                    <th className="border border-black p-2 text-center">{t('quantity')}</th>
                    <th className="border border-black p-2 text-center">{t('measurement')}</th>
                    <th className="border border-black p-2 text-right">{t('singlePrice')}</th>
                    <th className="border border-black p-2 text-right">{t('totalPrice')}</th>
                  </tr>
                </thead>
                <tbody>
                  {chunk.map((item: any, idx) => {
                    const rowNum = startIdx + idx + 1;
                    return (
                      <tr key={idx} className="border-b border-black/50">
                        <td className="border-r border-black/50 p-2 text-center">{rowNum}</td>
                        <td className="border-r border-black/50 p-2 font-bold">{item.itemName}</td>
                        <td className="border-r border-black/50 p-2 text-center">{item.amount}</td>
                        <td className="border-r border-black/50 p-2 text-center">{t(item.measurement)}</td>
                        <td className="border-r border-black/50 p-2 text-right font-mono">{Number(item.singlePrice).toFixed(2)}</td>
                        <td className="p-2 text-right font-mono font-bold">{(Number(item.amount) * Number(item.singlePrice)).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                  {aggregatedMarketExpenses.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center italic">{t('noMarketData')}</td></tr>
                  )}
                  {isLast && aggregatedMarketExpenses.length > 0 && (
                    <tr className="bg-gray-200 font-bold border-t-2 border-black">
                      <td colSpan={5} className="p-2 text-right uppercase">{t('total')}</td>
                      <td className="p-2 text-right font-mono">{fmt(marketTotal)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      });
    });

    // 4. Transfers to Next Month (Paginated)
    transferChunks.forEach((chunk, chunkIdx) => {
      const isLast = chunkIdx === transferChunks.length - 1;
      const startIdx = chunkIdx * 14;
      sectionsToRender.push({
        id: `transfers-${chunkIdx}`,
        render: () => (
          <div>
            <h2 className="text-xl font-bold text-center underline mb-6 text-black uppercase">
              {t('transferNextTitle')}{transferChunks.length > 1 ? ` (${chunkIdx + 1}/${transferChunks.length})` : ''}
            </h2>
            <div>
              <table className="w-full text-xs md:text-sm text-black border border-black">
                <thead className="bg-gray-200 font-bold uppercase">
                  <tr>
                    <th className="border border-black p-2 text-center w-12">{t('sno')}</th>
                    <th className="border border-black p-2 text-left">{t('itemType')}</th>
                    <th className="border border-black p-2 text-center">{t('quantity')}</th>
                    <th className="border border-black p-2 text-center">{t('measurement')}</th>
                    <th className="border border-black p-2 text-right">{t('estimation')}</th>
                    <th className="border border-black p-2 text-right">{t('totalPrice')}</th>
                  </tr>
                </thead>
                <tbody>
                  {chunk.map((item: any, idx) => {
                    const rowNum = startIdx + idx + 1;
                    return (
                      <tr key={idx} className="border-b border-black/50">
                        <td className="border-r border-black/50 p-2 text-center">{rowNum}</td>
                        <td className="border-r border-black/50 p-2 font-bold">{item.name}</td>
                        <td className="border-r border-black/50 p-2 text-center">{item.amount}</td>
                        <td className="border-r border-black/50 p-2 text-center">{t(item.measurement)}</td>
                        <td className="border-r border-black/50 p-2 text-right font-mono">{Number(item.singlePrice).toFixed(2)}</td>
                        <td className="p-2 text-right font-mono font-bold">{(Number(item.amount) * Number(item.singlePrice)).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                  {transferredItems.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center italic">{t('noTransferData')}</td></tr>
                  )}
                  {isLast && transferredItems.length > 0 && (
                    <tr className="bg-gray-200 font-bold border-t-2 border-black">
                      <td colSpan={5} className="p-2 text-right uppercase">{t('total')}</td>
                      <td className="p-2 text-right font-mono">{fmt(totalTransferredValue)}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* ISSUE 3: New Summary Row */}
              {isLast && (
                <div className="mt-6 border-t-4 border-double border-black pt-4">
                  <div className="flex justify-between items-center text-sm md:text-base font-bold text-black">
                    <span>{t('netPlusTransfersSummary')}</span>
                    <span className={`font-mono px-4 py-1.5 rounded ${netResult + totalTransferredValue >= 0 ? 'bg-gray-200' : 'bg-red-100'}`}>
                      {(netResult + totalTransferredValue).toLocaleString()} {t('birr')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      });
    });

    // 5. Manpower Roster (Paginated)
    manpowerChunks.forEach((chunk, chunkIdx) => {
      const isLast = chunkIdx === manpowerChunks.length - 1;
      const startIdx = chunkIdx * 20;
      sectionsToRender.push({
        id: `manpower-${chunkIdx}`,
        render: () => (
          <div>
            <h2 className="text-xl font-bold text-center underline mb-6 text-black uppercase">
              {t('manpowerRosterTitle')}{manpowerChunks.length > 1 ? ` (${chunkIdx + 1}/${manpowerChunks.length})` : ''}
            </h2>
            <div>
              <table className="w-full text-xs text-black border border-black">
                <thead className="bg-gray-200 font-bold uppercase">
                  <tr>
                    <th className="border border-black p-2 text-center w-12">{t('sno')}</th>
                    <th className="border border-black p-2 text-left">{t('rank')}</th>
                    <th className="border border-black p-2 text-left">{t('name')}</th>
                    <th className="border border-black p-2 text-center">{t('type')}</th>
                    <th className="border border-black p-2 text-right">{t('payment')}</th>
                  </tr>
                </thead>
                <tbody>
                  {chunk.map((m: any, idx) => {
                    const rowNum = startIdx + idx + 1;
                    const active = isFutureMonth ? true : isManpowerActive(m);
                    let displayAmount = Number(m.amount);
                    if (!displayAmount) {
                      if (useStandardRate) {
                        if (m.type === ManpowerType.PAYROLL || m.type === ManpowerType.FULL_CASH) displayAmount = Number(rateVal);
                        else if (m.type === ManpowerType.HALF_CASH) displayAmount = 1500;
                        else displayAmount = 0;
                      } else {
                        displayAmount = 0;
                      }
                    }

                    return (
                      <tr key={idx} className={`border-b border-black/50 ${!active ? 'text-red-600 line-through bg-red-50' : ''}`}>
                        <td className="border-r border-black/50 p-1.5 text-center">{rowNum}</td>
                        <td className="border-r border-black/50 p-1.5">{t(m.rank)}</td>
                        <td className="border-r border-black/50 p-1.5 font-bold">{m.firstName} {m.lastName}</td>
                        <td className="border-r border-black/50 p-1.5 text-center">{t(m.type)}</td>
                        <td className="p-1.5 text-right font-mono">{displayAmount.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                  {sortedManpower.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center italic">{t('noManpowerData')}</td></tr>
                  )}
                  {isLast && (
                    <tr className="bg-gray-200 font-bold border-t-2 border-black text-sm">
                      <td colSpan={4} className="p-2 text-right uppercase">{t('total')}</td>
                      <td className="p-2 text-right font-mono">
                        {fmt(sortedManpower.reduce((acc, m) => {
                          let val = Number(m.amount);
                          if (!val) {
                            if (useStandardRate) {
                              if (m.type === ManpowerType.PAYROLL || m.type === ManpowerType.FULL_CASH) val = Number(rateVal);
                              else if (m.type === ManpowerType.HALF_CASH) val = 1500;
                              else val = 0;
                            } else {
                              val = 0;
                            }
                          }
                          return acc + val;
                        }, 0))}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {isLast && (
                <div className="mt-4 flex gap-4 text-xs font-bold border-t border-black pt-2">
                  <div>{t('activeLabel')}: {activeCount}</div>
                  <div className="text-red-600">{t('inactiveLabel')}: {inactiveCount}</div>
                  <div>{t('totalRoster')}: {sortedManpower.length}</div>
                </div>
              )}
            </div>
          </div>
        )
      });
    });

    const totalSections = sectionsToRender.length;

    return (
      <div ref={auditRef} id="printable-audit-report" className="print-modal-content text-black relative flex flex-col xl:flex-row xl:flex-wrap xl:justify-center gap-8 print:gap-0 bg-transparent shadow-none w-full max-w-[210mm] xl:max-w-none mx-auto">
        {sectionsToRender.map((sec, idx) => {
          const currentPage = idx + 1;
          return (
            <React.Fragment key={sec.id}>
              {idx > 0 && <PageBreak />}
              <div className="audit-section p-[20mm] bg-white w-[210mm] min-h-[297mm] print:w-full print:h-auto print:min-h-0 print:shadow-none shadow-2xl flex flex-col justify-between relative print:bg-white text-black">
                <div className="flex-grow">
                  {sec.render()}
                </div>
                {/* Localized Footer for Both On-screen and Printed Pages */}
                <div className="border-t border-black/20 pt-2 flex justify-between text-[10px] text-slate-700 font-sans mt-4">
                  <span>
                    {t('generatedOn')} {formatEthiopianDate(getCurrentEthiopianDate(), language)}, {new Date().toLocaleTimeString()}
                  </span>
                  <span>
                    {language === 'am' ? `ገጽ ${currentPage} ከ ${totalSections}` : `Page ${currentPage} of ${totalSections}`}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-stone-950 relative overflow-hidden">
      <div className="absolute top-4 right-4 z-[40]">
           <button onClick={() => setShowSettings(!showSettings)} className="bg-gold-500 hover:bg-gold-600 text-black p-3 rounded-full shadow-lg transition shadow-gold-500/20">
               {showSettings ? <X size={20}/> : <Settings size={20} />}
           </button>
      </div>

      {showSettings && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 max-w-[95%] bg-slate-900/95 backdrop-blur-md p-6 rounded-2xl text-white border border-gold-500/30 shadow-2xl z-[40] animate-in zoom-in-95 duration-200">
            <h4 className="text-gold-500 font-bold mb-4 border-b border-gray-700 pb-2 flex items-center gap-2"><Settings size={16}/> {t('reportConfig')}</h4>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="flex gap-2">
                    <div className="w-1/2">
                        <label className="text-xs text-gray-400 block mb-1">{t('month')}</label>
                        <CustomSelect value={filterMonth} onChange={(val) => setFilterMonth(val)} options={monthOptions} className="text-sm" />
                    </div>
                    <div className="w-1/2">
                        <label className="text-xs text-gray-400 block mb-1">{t('year')}</label>
                        <CustomSelect value={filterYear} onChange={(val) => setFilterYear(val)} options={yearsOptions} className="text-sm" />
                    </div>
                </div>
                <div><label className="text-xs text-gray-400 block mb-1">{t('recipientLabel')}</label><input type="text" value={recipient} onChange={e => setRecipient(e.target.value)} className="w-full bg-black/40 border border-gray-600 rounded p-2 text-sm focus:border-gold-500 outline-none" placeholder={t('recipientPlaceholder')}/></div>
                <div><label className="text-xs text-gray-400 block mb-1">{t('city')}</label><input type="text" value={city} onChange={e => setCity(e.target.value)} className="w-full bg-black/40 border border-gray-600 rounded p-2 text-sm focus:border-gold-500 outline-none" placeholder={t('city')}/></div>
                <div><label className="text-xs text-gray-400 block mb-1">{t('subjectPrefix')}</label><input type="text" value={subjectPrefix} onChange={e => setSubjectPrefix(e.target.value)} className="w-full bg-black/40 border border-gray-600 rounded p-2 text-sm focus:border-gold-500 outline-none" placeholder={t('subjectPlaceholder')}/></div>
                <div><label className="text-xs text-gray-400 block mb-1">{t('pageCount')}</label><input type="text" value={pageCount} onChange={e => setPageCount(e.target.value)} className="w-full bg-black/40 border border-gray-600 rounded p-2 text-sm focus:border-gold-500 outline-none" placeholder={t('pageCountPlaceholder')}/></div>
                <div><label className="text-xs text-gray-400 block mb-1">{t('chairmanName')}</label><input type="text" value={leaderName} onChange={e => setLeaderName(e.target.value)} className="w-full bg-black/40 border border-gray-600 rounded p-2 text-sm focus:border-gold-500 outline-none"/></div>
                <div><label className="text-xs text-gray-400 block mb-1">{t('chairmanTitle')}</label><input type="text" value={diningName} onChange={e => setDiningName(e.target.value)} className="w-full bg-black/40 border border-gray-600 rounded p-2 text-sm focus:border-gold-500 outline-none" placeholder={t('chairmanTitlePlaceholder')}/></div>
                <div><label className="text-xs text-gray-400 block mb-1">{t('auditorName')}</label><input type="text" value={auditorName} onChange={e => setAuditorName(e.target.value)} className="w-full bg-black/40 border border-gray-600 rounded p-2 text-sm focus:border-gold-500 outline-none"/></div>
                
                {/* Standard Monthly Rate Input & Toggle */}
                <div className="flex items-center justify-between border-t border-gray-700 pt-4 mt-2">
                    <label className="text-xs text-gold-500 font-bold uppercase flex items-center gap-1">
                        <DollarSign size={12}/> {t('standardMonthlyRate')}
                    </label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            value={monthlyRate} 
                            onChange={e => setMonthlyRate(e.target.value === '' ? '' : Number(e.target.value))} 
                            className={`w-20 bg-black/40 border border-gray-600 rounded p-1 text-sm text-right focus:border-gold-500 outline-none ${!useStandardRate ? 'opacity-50' : ''}`}
                            disabled={!useStandardRate}
                            placeholder="3000"
                        />
                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input 
                                type="checkbox" 
                                checked={useStandardRate} 
                                onChange={e => setUseStandardRate(e.target.checked)} 
                                className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 right-5 checked:bg-gold-500 checked:border-gold-500 border-gray-600"
                            />
                            <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${useStandardRate ? 'bg-gold-900' : 'bg-gray-700'}`}></label>
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-700 flex gap-2">
                <button onClick={() => setShowPrintModal(true)} className="flex-1 bg-gold-500 hover:bg-gold-600 text-black font-bold py-2.5 md:py-3 rounded-lg flex items-center justify-center gap-2 transition shadow-lg text-xs"><Printer size={16}/> {t('printReport')}</button>
                <button onClick={() => { setShowPrintModal(true); setTimeout(() => handlePrint(), 300); }} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 md:py-3 rounded-lg flex items-center justify-center gap-2 transition shadow-lg text-xs"><FileText size={16}/> {t('downloadPdf')}</button>
            </div>
        </div>
      )}

      {showPrintModal && createPortal(
          <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center print-preview-modal animate-in zoom-in-95 duration-200">
              <div className="w-full bg-military-900 border-b border-gold-500 p-4 flex flex-col sm:flex-row justify-between items-center no-print shrink-0 gap-3">
                  <h2 className="text-gold-500 font-bold text-lg sm:text-xl flex items-center gap-2">
                      <Printer size={20} className="sm:w-[24px] sm:h-[24px]"/> {t('printPreview')}
                  </h2>
                  <div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto">
                      <button onClick={() => setShowPrintModal(false)} className="px-3 py-1.5 md:px-4 md:py-2 text-xs text-gray-400 hover:text-white font-bold rounded-lg border border-gray-600 hover:bg-white/10 transition">{t('closePreview')}</button>
                      <button onClick={handlePrint} className="px-3 py-1.5 md:px-6 md:py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg transition flex items-center gap-2 text-xs md:text-sm">
                          <FileText size={14} className="md:w-[18px] md:h-[18px]"/> {t('downloadPdf')}
                      </button>
                      <button onClick={handlePrint} className="px-3 py-1.5 md:px-6 md:py-2 bg-gold-500 hover:bg-gold-600 text-black font-bold rounded-lg shadow-lg transition flex items-center gap-2 text-xs md:text-sm">
                          <Printer size={14} className="md:w-[18px] md:h-[18px]"/> {t('printNow')}
                      </button>
                  </div>
              </div>
              <div className="flex-1 w-full overflow-auto bg-gray-800 p-8 flex justify-center print-hide-scroll">
                  <PrintableContent />
              </div>
          </div>,
          document.body
      )}

      <div className="flex-1 overflow-auto bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] bg-fixed relative">
          <div className="min-w-fit p-4 md:p-8 flex justify-center pb-20 opacity-80 hover:opacity-100 transition duration-500">
             <div className="relative group cursor-pointer" onClick={() => setShowPrintModal(true)}>
                 <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition z-10 rounded-sm">
                     <div className="bg-gold-500 text-black px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-2xl transform scale-110">
                         <Eye size={20}/> {t('clickPreview')}
                     </div>
                 </div>
                 <div className="pointer-events-none">
                    <PrintableContent />
                 </div>
             </div>
          </div>
      </div>
    </div>
  );
};

// ... (Rest of the file ManualAudit, Calculation, DatabaseManage, Audit main component - no changes needed there)
// Re-exporting Main Component without changes to structure
const ManualAudit = () => {
    const editorRef = useRef<HTMLDivElement>(null);
    const { t, language } = useLanguage();
    const { month, year } = useDate();
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printHtml, setPrintHtml] = useState('');

    // Custom Modal States
    const [showTableModal, setShowTableModal] = useState(false);
    const [tableRows, setTableRows] = useState("3");
    const [tableCols, setTableCols] = useState("3");
    const [showSyncConfirm, setShowSyncConfirm] = useState(false);
    const [showNoAuditAlert, setShowNoAuditAlert] = useState(false);

    const execCmd = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        if (editorRef.current) editorRef.current.focus();
    };

    const cleanSyncedAuditHtml = (rawHtml: string): string => {
        if (!rawHtml) return '';
        const temp = document.createElement('div');
        temp.innerHTML = rawHtml;

        const sections = temp.querySelectorAll('.audit-section');
        if (sections.length > 0) {
            const parts: string[] = [];
            sections.forEach((sec) => {
                const flexGrow = sec.querySelector('.flex-grow');
                if (flexGrow) {
                    parts.push(flexGrow.innerHTML);
                } else {
                    const clone = sec.cloneNode(true) as HTMLElement;
                    const footer = clone.querySelector('.border-t');
                    if (footer) footer.remove();
                    parts.push(clone.innerHTML);
                }
            });
            return parts.join('<div style="margin: 24px 0; border-top: 1px dashed #cbd5e1;" class="no-print"></div><p><br></p>');
        }

        return rawHtml;
    };

    const handleInsertTableSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowTableModal(false);
        const r = parseInt(tableRows);
        const c = parseInt(tableCols);
        
        if (isNaN(r) || isNaN(c) || r <= 0 || c <= 0) return;

        let tableHtml = `<table style="width:100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 10px; border: 1px solid black;"><thead style="background-color: #e5e7eb;"><tr>`;
        
        for(let j=0; j<c; j++) {
            tableHtml += `<th style="border: 1px solid black; padding: 8px; font-weight: bold; text-align: left; color: black;">${t('tableHeaderWord')} ${j+1}</th>`;
        }
        tableHtml += `</tr></thead><tbody>`;
        
        for(let i=0; i<r; i++) {
            tableHtml += `<tr>`;
            for(let j=0; j<c; j++) {
                tableHtml += `<td style="border: 1px solid black; padding: 8px; color: black;">${t('tableCellWord')}</td>`;
            }
            tableHtml += `</tr>`;
        }
        tableHtml += `</tbody></table><p><br></p>`;
        
        execCmd('insertHTML', tableHtml);
    };

    const handleSyncFromAutomated = () => {
        setShowSyncConfirm(true);
    };

    const executeSyncFromAutomated = () => {
        setShowSyncConfirm(false);
        const stored = localStorage.getItem('arms_automated_audit_html');
        if (stored && editorRef.current) {
            editorRef.current.innerHTML = cleanSyncedAuditHtml(stored);
        } else {
            setShowNoAuditAlert(true);
        }
    };

    const handlePrintManual = () => {
        if (editorRef.current) {
            setPrintHtml(cleanSyncedAuditHtml(editorRef.current.innerHTML));
            setShowPrintModal(true);
        }
    };

    const handlePrintManualNow = () => {
        const originalTitle = document.title;
        const formattedMonth = ETHIOPIAN_MONTHS[parseInt(month) - 1] || month;
        const formattedMonthAm = ETHIOPIAN_MONTHS_AMHARIC[parseInt(month) - 1] || month;
        
        const printTitle = language === 'am'
          ? `ማኑዋል_${formattedMonthAm}_${year}_ኦዲት_ሪፖርት`
          : `Manual_${formattedMonth}_${year}_Audit_Report`;
          
        document.title = printTitle;
        window.print();
        setTimeout(() => {
          document.title = originalTitle;
        }, 1000);
    };

    useEffect(() => {
        const stored = localStorage.getItem('arms_automated_audit_html');
        if (stored && editorRef.current) {
            editorRef.current.innerHTML = cleanSyncedAuditHtml(stored);
        }
    }, []);

    return (
        <div className="h-full flex flex-col bg-stone-950 overflow-hidden relative">
            <div className="bg-slate-800 border-b border-gold-500 p-2 flex flex-wrap gap-2 items-center justify-between z-10 shadow-md">
                <div className="flex gap-2 items-center flex-wrap">
                    {/* Font Style */}
                    <div className="flex bg-slate-900 rounded p-1 space-x-1 border border-gray-700">
                        <button onClick={() => execCmd('bold')} className="p-2 text-gray-300 hover:bg-gold-500 hover:text-black rounded transition" title={t('editorBold')}><Bold size={16}/></button>
                        <button onClick={() => execCmd('italic')} className="p-2 text-gray-300 hover:bg-gold-500 hover:text-black rounded transition" title={t('editorItalic')}><Italic size={16}/></button>
                        <button onClick={() => execCmd('underline')} className="p-2 text-gray-300 hover:bg-gold-500 hover:text-black rounded transition" title={t('editorUnderline')}><Underline size={16}/></button>
                        <button onClick={() => execCmd('removeFormat')} className="p-2 text-gray-400 hover:bg-gold-500 hover:text-black rounded transition" title={t('editorClearFormat')}><Eraser size={16}/></button>
                        <button onClick={() => execCmd('delete')} className="p-2 text-red-400 hover:bg-red-500 hover:text-white rounded transition" title={t('editorDeleteSelection')}><Trash2 size={16}/></button>
                    </div>

                    {/* Font Select */}
                    <div className="flex bg-slate-900 rounded p-1 border border-gray-700 items-center">
                        <select 
                            onChange={(e) => execCmd('fontName', e.target.value)}
                            className="bg-transparent text-gray-300 text-xs font-bold outline-none cursor-pointer px-1"
                            title={t('editorFontFamily')}
                            defaultValue="Inter"
                        >
                            <option value="Inter" className="bg-slate-900 text-white">{t('fontSansSerif')}</option>
                            <option value="Georgia" className="bg-slate-900 text-white">{t('fontSerif')}</option>
                            <option value="Courier New" className="bg-slate-900 text-white">{t('fontMonospace')}</option>
                        </select>
                    </div>

                    {/* Font Size Select */}
                    <div className="flex bg-slate-900 rounded p-1 border border-gray-700 items-center">
                        <select 
                            onChange={(e) => execCmd('fontSize', e.target.value)}
                            className="bg-transparent text-gray-300 text-xs font-bold outline-none cursor-pointer px-1"
                            title={t('editorFontSize')}
                            defaultValue="3"
                        >
                            <option value="1" className="bg-slate-900 text-white">{t('sizeXSmall')}</option>
                            <option value="2" className="bg-slate-900 text-white">{t('sizeSmall')}</option>
                            <option value="3" className="bg-slate-900 text-white">{t('sizeNormal')}</option>
                            <option value="4" className="bg-slate-900 text-white">{t('sizeLarge')}</option>
                            <option value="5" className="bg-slate-900 text-white">{t('sizeXLarge')}</option>
                            <option value="6" className="bg-slate-900 text-white">{t('sizeXXLarge')}</option>
                            <option value="7" className="bg-slate-900 text-white">{t('sizeHuge')}</option>
                        </select>
                    </div>

                    {/* Alignment */}
                    <div className="flex bg-slate-900 rounded p-1 space-x-1 border border-gray-700">
                        <button onClick={() => execCmd('justifyLeft')} className="p-2 text-gray-300 hover:bg-gold-500 hover:text-black rounded transition" title={t('editorAlignLeft')}><AlignLeft size={16}/></button>
                        <button onClick={() => execCmd('justifyCenter')} className="p-2 text-gray-300 hover:bg-gold-500 hover:text-black rounded transition" title={t('editorAlignCenter')}><AlignCenter size={16}/></button>
                        <button onClick={() => execCmd('justifyRight')} className="p-2 text-gray-300 hover:bg-gold-500 hover:text-black rounded transition" title={t('editorAlignRight')}><AlignRight size={16}/></button>
                    </div>

                    {/* Lists */}
                    <div className="flex bg-slate-900 rounded p-1 space-x-1 border border-gray-700">
                         <button onClick={() => execCmd('insertOrderedList')} className="p-2 text-gray-300 hover:bg-gold-500 hover:text-black rounded transition" title={t('editorNumberedList')}><ListOrdered size={16}/></button>
                         <button onClick={() => execCmd('insertUnorderedList')} className="p-2 text-gray-300 hover:bg-gold-500 hover:text-black rounded transition" title={t('editorBulletList')}><List size={16}/></button>
                    </div>

                    {/* Table */}
                    <div className="flex bg-slate-900 rounded p-1 space-x-1 border border-gray-700">
                         <button onClick={() => { setTableRows("3"); setTableCols("3"); setShowTableModal(true); }} className="p-2 text-gray-300 hover:bg-gold-500 hover:text-black rounded transition" title={t('editorInsertTable')}><TableIcon size={16}/></button>
                    </div>

                    {/* Sync from Automated */}
                    <div className="flex bg-slate-900 rounded p-1 space-x-1 border border-gray-700">
                         <button onClick={handleSyncFromAutomated} className="p-2 text-gold-500 hover:bg-gold-500 hover:text-black rounded transition flex items-center gap-1 text-xs font-bold" title={t('syncFromAutomatedTooltip')}><RefreshCw size={14}/> {t('syncAutomatedBtn')}</button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handlePrintManual} className="bg-gold-500 hover:bg-gold-600 text-black px-4 py-2 rounded font-bold text-xs flex items-center gap-2"><Printer size={14} /> {t('printReport')}</button>
                    <button onClick={() => { handlePrintManual(); setTimeout(() => handlePrintManualNow(), 300); }} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold text-xs flex items-center gap-2"><FileText size={14} /> {t('downloadPdf')}</button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 md:p-8 pb-20">
                <div ref={editorRef} className="bg-white mx-auto w-full max-w-[210mm] min-h-[297mm] p-[10mm] md:p-[25mm] shadow-[0_10px_40px_rgba(0,0,0,0.5)] text-black outline-none leading-relaxed overflow-y-visible" contentEditable suppressContentEditableWarning={true}>
                    <h1 style={{textAlign: 'center', textDecoration: 'underline'}}>{t('manualReport')}</h1>
                    <p>{t('startTyping')}</p>
                </div>
            </div>

            {showPrintModal && createPortal(
                <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center print-preview-modal animate-in zoom-in-95 duration-200">
                    <div className="w-full bg-military-900 border-b border-gold-500 p-4 flex justify-between items-center no-print shrink-0">
                        <h2 className="text-gold-500 font-bold text-xl flex items-center gap-2">
                            <Printer size={24}/> {t('printPreview')} (Manual Audit)
                        </h2>
                        <div className="flex gap-3">
                            <button onClick={() => setShowPrintModal(false)} className="px-4 py-2 text-gray-400 hover:text-white font-bold rounded-lg border border-gray-600 hover:bg-white/10 transition">{t('closePreview')}</button>
                            <button onClick={handlePrintManualNow} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg transition flex items-center gap-2">
                                <FileText size={18}/> {t('downloadPdf')}
                            </button>
                            <button onClick={handlePrintManualNow} className="px-6 py-2 bg-gold-500 hover:bg-gold-600 text-black font-bold rounded-lg shadow-lg transition flex items-center gap-2">
                                <Printer size={18}/> {t('printNow')}
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 w-full overflow-auto bg-gray-800 p-8 flex justify-center print-hide-scroll">
                        <div id="printable-audit-report" className="bg-white text-black w-[210mm] min-h-[297mm] print:w-full print:h-auto print:min-h-0 print:shadow-none shadow-2xl mx-auto print-modal-content manual-audit-preview-page print:bg-white relative p-[20mm]">
                            {/* Dynamic Fixed Footer for Printed Media */}
                            <div className="print-footer-container font-sans" data-lang={language}>
                              <span>
                                {t('generatedOn')} {formatEthiopianDate(getCurrentEthiopianDate(), language)}, {new Date().toLocaleTimeString()}
                              </span>
                            </div>
                            <div dangerouslySetInnerHTML={{ __html: printHtml }} />
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <ConfirmDialog 
                isOpen={showSyncConfirm}
                title={language === 'en' ? "Reload Automated Audit" : "አውቶማቲክ ኦዲቱን ድጋሚ ጫን"}
                message={
                    <div>
                        <p className="text-amber-300 font-bold mb-2">
                            {language === 'en' 
                                ? "Are you sure you want to reload the automated audit?" 
                                : "እርግጠኛ ነዎት አውቶማቲክ ኦዲቱን እንደገና መጫን ይፈልጋሉ?"}
                        </p>
                        <p className="text-gray-300 text-sm">
                            {language === 'en'
                                ? "This will overwrite your manual changes in this editor."
                                : "ይህ በዚህ ኤዲተር ውስጥ ያደረጉትን ማኑዋል ለውጦች በሙሉ ይተካል።"}
                        </p>
                    </div>
                }
                onConfirm={executeSyncFromAutomated}
                onCancel={() => setShowSyncConfirm(false)}
                isDanger={true}
                confirmText={language === 'en' ? "Reload" : "ድጋሚ ጫን"}
                cancelText={language === 'en' ? "Cancel" : "ሰርዝ"}
            />

            <ConfirmDialog 
                isOpen={showNoAuditAlert}
                title={language === 'en' ? "No Automated Audit Found" : "ምንም አውቶማቲክ ኦዲት አልተገኘም"}
                message={
                    <p className="text-gray-300 text-sm">
                        {language === 'en'
                            ? "No automated audit data found. Please view the Automated Audit tab first to generate the report."
                            : "ምንም አውቶማቲክ የኦዲት መረጃ አልተገኘም። እባክዎ መጀመሪያ ሪፖርቱን ለማመንጨት አውቶማቲክ የኦዲት ታብን ይመልከቱ።"}
                    </p>
                }
                onConfirm={() => setShowNoAuditAlert(false)}
                isDanger={false}
                confirmText="OK"
                type="alert"
            />

            {/* Custom Table Dialog Modal */}
            {showTableModal && (
              <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-slate-900 border-2 border-gold-500 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-md w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-4 bg-military-800 border-b border-gray-700 flex items-center justify-between">
                    <h3 className="text-xl font-bold font-serif tracking-wide text-gold-100 flex items-center gap-2">
                      <TableIcon size={20} className="text-gold-500" />
                      {language === 'en' ? "Insert Table" : "ሰንጠረዥ አስገባ"}
                    </h3>
                    <button onClick={() => setShowTableModal(false)} className="text-gray-400 hover:text-white transition">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <form onSubmit={handleInsertTableSubmit}>
                    <div className="p-6 space-y-4 bg-black/20 text-gray-300">
                      <div>
                        <label className="text-xs text-gray-400 uppercase font-bold block mb-1">
                          {language === 'en' ? "Number of Rows" : "የረድፍ ብዛት"}
                        </label>
                        <input 
                          type="number" 
                          min="1" 
                          max="50"
                          className="w-full bg-slate-950 border border-gray-600 rounded p-2.5 text-white focus:border-gold-500 outline-none transition"
                          value={tableRows}
                          onChange={e => setTableRows(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 uppercase font-bold block mb-1">
                          {language === 'en' ? "Number of Columns" : "የአምድ ብዛት"}
                        </label>
                        <input 
                          type="number" 
                          min="1" 
                          max="20"
                          className="w-full bg-slate-950 border border-gray-600 rounded p-2.5 text-white focus:border-gold-500 outline-none transition"
                          value={tableCols}
                          onChange={e => setTableCols(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="p-4 bg-slate-900 flex justify-end gap-3 border-t border-gray-800">
                      <button 
                        type="button"
                        onClick={() => setShowTableModal(false)}
                        className="px-5 py-2.5 rounded-lg font-bold text-gray-400 hover:text-white hover:bg-white/10 transition border border-gray-700 uppercase text-xs tracking-wider"
                      >
                        {language === 'en' ? "Cancel" : "ሰርዝ"}
                      </button>
                      <button 
                        type="submit"
                        className="px-6 py-2.5 rounded-lg font-bold text-black bg-gold-500 hover:bg-gold-600 border border-gold-400 transition flex items-center gap-2 uppercase text-xs tracking-wider"
                      >
                        <CheckCircle size={16} />
                        {language === 'en' ? "Insert" : "አስገባ"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
        </div>
    )
}

const Calculation = () => {
    const { t } = useLanguage();
    const [marketItems, setMarketItems] = useState<{qty: string, price: string}[]>([{qty: '', price: ''}]);
    const [standardCalcOpen, setStandardCalcOpen] = useState(false);
    const [calcDisplay, setCalcDisplay] = useState('0');
    const [isResult, setIsResult] = useState(false);
    const calcDisplayRef = useRef<HTMLDivElement>(null);

    const addRow = () => setMarketItems([...marketItems, {qty: '', price: ''}]);
    const updateRow = (idx: number, field: 'qty'|'price', val: string) => {
        const newItems = [...marketItems];
        newItems[idx][field] = val;
        setMarketItems(newItems);
    };
    const resetMarket = () => setMarketItems([{qty: '', price: ''}]);

    const totalQty = marketItems.reduce((acc, i) => acc + (Number(i.qty) || 0), 0);
    const totalCost = marketItems.reduce((acc, i) => acc + ((Number(i.qty) || 0) * (Number(i.price) || 0)), 0);
    const avgPrice = totalQty > 0 ? (totalCost / totalQty).toFixed(4) : "0.0000";

    const handleCalcInput = (val: string) => {
        if (val === 'C') {
            setCalcDisplay('0');
            setIsResult(false);
        } else if (val === 'DEL') {
            setIsResult(false);
            if (calcDisplay.length > 1) {
                setCalcDisplay(calcDisplay.slice(0, -1));
            } else {
                setCalcDisplay('0');
            }
        } else if (val === '=') {
            try {
                // eslint-disable-next-line no-eval
                setCalcDisplay(String(eval(calcDisplay)));
                setIsResult(true);
            } catch { 
                setCalcDisplay('Error');
                setIsResult(true);
            }
        } else {
            if (isResult) {
                setIsResult(false);
                if (['/','*','-','+'].includes(val)) {
                    setCalcDisplay(prev => prev + val);
                } else {
                    setCalcDisplay(val);
                }
            } else {
                if (['/','*','-','+'].includes(val) && ['/','*','-','+'].includes(calcDisplay.slice(-1))) {
                    return;
                }
                setCalcDisplay(prev => prev === '0' && !['/','*','-','+'].includes(val) ? val : prev + val);
            }
        }
    };

    useEffect(() => {
        if (calcDisplayRef.current) {
            setTimeout(() => {
                if (calcDisplayRef.current) {
                    if (isResult) {
                        calcDisplayRef.current.scrollLeft = 0;
                    } else {
                        calcDisplayRef.current.scrollLeft = calcDisplayRef.current.scrollWidth;
                    }
                }
            }, 10);
        }
    }, [calcDisplay, standardCalcOpen, isResult]);

    return (
        <div className="flex flex-col h-full min-h-[600px] relative p-4 md:p-8 overflow-y-auto">
            <div className="bg-military-900 border border-military-700 p-4 flex flex-col md:flex-row justify-between items-center mb-6 rounded-xl shadow-lg gap-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-3"><Type size={24} className="text-gold-500"/> <span className="tracking-wide">{t('avgMarketCalcTitle')}</span></h3>
                <div className="flex gap-2 w-full md:w-auto justify-center md:justify-end flex-wrap">
                    <button onClick={resetMarket} className="bg-red-900/50 hover:bg-red-800 text-red-200 px-4 py-2 rounded font-bold text-sm transition border border-red-500/30 flex items-center gap-2"><RotateCcw size={14}/> {t('resetForm')}</button>
                    <button onClick={() => setStandardCalcOpen(true)} className="bg-gold-500 hover:bg-gold-600 text-black px-4 py-2 rounded font-bold text-sm transition shadow-lg flex items-center gap-2"><Calculator size={14}/> {t('openStdCalc')}</button>
                </div>
            </div>

            <div className="flex gap-8 flex-col lg:flex-row items-start">
                <div className="flex-1 bg-slate-900 border border-military-700 rounded-xl p-4 md:p-6 shadow-2xl w-full flex flex-col">
                    <div className="w-full mb-4">
                        <div className="hidden md:grid grid-cols-12 gap-4 mb-2 text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-700 pb-2">
                            <div className="col-span-1 text-center">#</div>
                            <div className="col-span-4">{t('itemQty')}</div>
                            <div className="col-span-4">{t('cost')}</div>
                            <div className="col-span-3 text-right">{t('total')}</div>
                        </div>
                        <div className="space-y-4 md:space-y-3 max-h-[60vh] md:max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                            {marketItems.map((item, idx) => (
                                <div key={idx} className="flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 items-center bg-black/20 md:bg-transparent p-3 md:p-0 rounded-lg border border-gray-800 md:border-0 animate-in fade-in slide-in-from-left-2">
                                    <div className="flex justify-between items-center w-full md:contents">
                                        <div className="md:col-span-1 flex justify-center">
                                            <div className="w-6 h-6 rounded-full bg-military-800 text-gold-500 flex items-center justify-center text-xs font-bold border border-military-600">{idx+1}</div>
                                        </div>
                                        <div className="md:hidden text-right font-mono text-gold-400 font-bold text-sm">
                                            {((Number(item.qty)||0) * (Number(item.price)||0)).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="w-full md:contents">
                                        <div className="flex flex-col md:grid md:grid-cols-1 md:col-span-4 gap-2 w-full">
                                            <div className="w-full">
                                                <label className="text-[10px] text-gray-500 font-bold uppercase md:hidden block mb-1">{t('itemQty')}</label>
                                                <input type="number" className="w-full bg-black/40 border border-gray-700 rounded p-2 text-white font-mono text-right focus:border-gold-500 outline-none" placeholder={t('itemQty')} value={item.qty} onChange={e => updateRow(idx, 'qty', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="flex flex-col md:grid md:grid-cols-1 md:col-span-4 gap-2 w-full mt-2 md:mt-0">
                                             <div className="w-full">
                                                 <label className="text-[10px] text-gray-500 font-bold uppercase md:hidden block mb-1">{t('cost')}</label>
                                                 <input type="number" className="w-full bg-black/40 border border-gray-700 rounded p-2 text-white font-mono text-right focus:border-gold-500 outline-none" placeholder={t('cost')} value={item.price} onChange={e => updateRow(idx, 'price', e.target.value)} />
                                             </div>
                                        </div>
                                    </div>
                                    <div className="hidden md:block col-span-3 text-right font-mono text-gold-400 font-bold">
                                        {((Number(item.qty)||0) * (Number(item.price)||0)).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <button onClick={addRow} className="w-full py-3 bg-military-800 hover:bg-military-700 border border-dashed border-gray-600 text-gray-400 hover:text-white rounded-lg transition font-bold text-sm flex items-center justify-center gap-2"><Plus size={16}/> {t('addNewRow')}</button>

                    <div className="mt-6 bg-black/40 rounded-xl p-4 border border-gold-500/30 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="text-center sm:border-r border-gray-700 pb-2 sm:pb-0 border-b sm:border-b-0">
                            <span className="block text-xs text-gray-500 uppercase font-bold">{t('totalQty')}</span>
                            <span className="text-xl font-bold text-white">{totalQty}</span>
                        </div>
                        <div className="text-center sm:border-r border-gray-700 pb-2 sm:pb-0 border-b sm:border-b-0">
                             <span className="block text-xs text-gray-500 uppercase font-bold">{t('totalCost')}</span>
                             <span className="text-xl font-bold text-green-400">{totalCost.toLocaleString()}</span>
                        </div>
                        <div className="text-center">
                             <span className="block text-xs text-gray-500 uppercase font-bold">{t('avgSinglePrice')}</span>
                             <span className="text-xl font-black text-gold-500">{avgPrice}</span>
                        </div>
                    </div>
                </div>

                {standardCalcOpen && (
                    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                        <div className="w-full max-w-sm bg-slate-900 border-2 border-gold-500 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[500px] md:h-auto max-h-[90vh]">
                            <div className="p-4 bg-military-900 flex justify-between items-center border-b border-gray-700 shrink-0">
                                <span className="text-gold-500 font-bold uppercase tracking-widest text-sm">{t('standardCalcTitle')}</span>
                                <button onClick={() => setStandardCalcOpen(false)} className="text-gray-400 hover:text-white bg-white/10 rounded-full p-2"><X size={20}/></button>
                            </div>
                            <div className="bg-black p-6 text-right flex-1 flex flex-col justify-end border-b border-gray-800 overflow-hidden min-h-[100px]">
                                 <div ref={calcDisplayRef} className="text-white font-mono text-5xl w-full overflow-x-auto whitespace-nowrap scrollbar-hide">
                                     {calcDisplay}
                                 </div>
                            </div>
                            <div className="grid grid-cols-4 gap-1 p-2 bg-slate-800 h-auto shrink-0">
                                <button onClick={() => handleCalcInput('C')} className="bg-red-900/80 hover:bg-red-800 text-red-200 font-bold p-4 text-xl rounded">C</button>
                                <button onClick={() => handleCalcInput('DEL')} className="bg-red-900/50 hover:bg-red-800 text-white font-bold p-4 text-xl rounded">⌫</button>
                                <button onClick={() => handleCalcInput('/')} className="bg-orange-600 hover:bg-orange-500 text-white font-bold p-4 text-xl rounded">/</button>
                                <button onClick={() => handleCalcInput('*')} className="bg-orange-600 hover:bg-orange-500 text-white font-bold p-4 text-xl rounded">*</button>
                                
                                {['7','8','9','-'].map(btn => (
                                    <button 
                                        key={btn} 
                                        onClick={() => handleCalcInput(btn)}
                                        className={`p-4 font-bold text-2xl rounded transition active:scale-95 ${['/','*','-','+'].includes(btn) ? 'bg-orange-600 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                                    >
                                        {btn}
                                    </button>
                                ))}
                                {['4','5','6','+'].map(btn => (
                                    <button 
                                        key={btn} 
                                        onClick={() => handleCalcInput(btn)}
                                        className={`p-4 font-bold text-2xl rounded transition active:scale-95 ${['/','*','-','+'].includes(btn) ? 'bg-orange-600 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                                    >
                                        {btn}
                                    </button>
                                ))}
                                {['1','2','3'].map(btn => (
                                    <button 
                                        key={btn} 
                                        onClick={() => handleCalcInput(btn)}
                                        className="p-4 font-bold text-2xl bg-slate-700 text-white hover:bg-slate-600 rounded transition active:scale-95"
                                    >
                                        {btn}
                                    </button>
                                ))}
                                <button onClick={() => handleCalcInput('=')} className="row-span-2 bg-gold-500 hover:bg-gold-400 text-black font-bold p-4 text-2xl rounded shadow-lg border-2 border-gold-300">=</button>
                                <button onClick={() => handleCalcInput('0')} className="col-span-2 p-4 font-bold text-2xl bg-slate-700 text-white hover:bg-slate-600 rounded transition active:scale-95">0</button>
                                <button onClick={() => handleCalcInput('.')} className="p-4 font-bold text-2xl bg-slate-700 text-white hover:bg-slate-600 rounded transition active:scale-95">.</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// --- MAIN PAGE COMPONENT ---
const Audit: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'automated' | 'manual' | 'calc'>('automated');
  const [data, setData] = useState<AppData | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    setData(getDB());
  }, [activeTab]); 

  if (!data) return <div className="p-8 text-center text-gold-500 animate-pulse">{t('initializing')}</div>;

  const TABS = [
    { id: 'automated', label: t('automatedAudit'), icon: FileText },
    { id: 'manual', label: t('manualAudit'), icon: Edit },
    { id: 'calc', label: t('calculators'), icon: Calculator },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex-col px-6 md:px-12 pt-6 border-b border-military-700 mb-4 pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
              <div>
                  <h2 className="text-3xl text-gold-500 font-bold font-serif tracking-wide">{t('auditCenter')}</h2>
                  <p className="text-gray-400 text-sm mt-1">{t('auditSubtitle')}</p>
              </div>
          </div>
          <div className="md:hidden relative z-50">
              <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">{t('selectSection')}</label>
              <CustomSelect 
                value={activeTab}
                onChange={(val) => setActiveTab(val)}
                options={TABS.map(t => ({ value: t.id, label: t.label }))}
              />
          </div>
          <div className="hidden md:flex space-x-2 overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                className={`flex items-center gap-2 px-4 py-3 rounded-t-xl font-bold uppercase text-sm tracking-wider transition-all duration-300 
                ${activeTab === tab.id 
                    ? 'bg-gold-500 text-black shadow-[0_-5px_15px_rgba(212,175,55,0.2)]' 
                    : 'bg-military-800/50 text-gray-400 hover:text-white hover:bg-military-800'
                }`}
                title={tab.label}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
      </div>
      <div className="flex-1 overflow-hidden relative">
          {activeTab === 'automated' && <AutomatedAudit data={data} />}
          {activeTab === 'manual' && <ManualAudit />}
          {activeTab === 'calc' && <Calculation />}
      </div>
    </div>
  );
};

export default Audit;
