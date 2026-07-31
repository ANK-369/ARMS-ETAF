
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDB, saveDB } from '../services/db';
import { findFilesBySecretKey, fetchFromGitHub, getFolderName, listUserBackups, getGitHubConfig, isGitHubConfigured } from '../services/githubService';
import { AppData, Manpower, ManpowerType } from '../types';
import { formatEthiopianDate, getCurrentEthiopianDate, isSameMonth, ETHIOPIAN_MONTHS, ETHIOPIAN_MONTHS_AMHARIC } from '../services/ethiopianDate';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Users, Wallet, ArrowRight, 
  ShoppingCart, Clock, ShieldCheck, Zap,
  RotateCcw, Package, Activity, X, ChevronRight, AlertTriangle, Scale, Percent, Calendar, Filter
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useDate } from '../contexts/DateContext';
import { useSidebar } from '../contexts/SidebarContext';
import CustomSelect from '../components/CustomSelect';
import etafLogo from '../assets/images/etaf_logo.png';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AppData | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  const { t, language } = useLanguage();
  const { isSidebarOpen } = useSidebar();
  
  // Use Global Date Context
  const { month: selectedMonth, setMonth: setSelectedMonth, year: selectedYear, setYear: setSelectedYear } = useDate();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'manpower' | 'sales' | 'store' | 'refunds' | null>(null);

  // Chart View State
  const [volatilityView, setVolatilityView] = useState<'monthly' | 'daily'>('daily');

  // Secret Key / Available File Paths filter state
  const [availablePaths, setAvailablePaths] = useState<string[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string>("");
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Request cancellation and concurrency trackers
  const fetchPathsReqIdRef = useRef(0);
  const loadFileReqIdRef = useRef(0);
  const isFetchingRemoteRef = useRef(false);

  // Get secretKey from sessionStorage (temporary) or localStorage (fallback/permanent)
  const [activeSecretKey, setActiveSecretKey] = useState<string>(() => {
    return sessionStorage.getItem('arms_session_secret_key') || localStorage.getItem('arms_readonly_secret_key') || localStorage.getItem('arms_secret_key') || '';
  });

  // Listen for read-only / secret key state changes
  useEffect(() => {
    const handleReadonlyUpdate = () => {
      const currentKey = sessionStorage.getItem('arms_session_secret_key') || localStorage.getItem('arms_readonly_secret_key') || localStorage.getItem('arms_secret_key') || '';
      setActiveSecretKey(currentKey);
      setData(getDB());
    };

    window.addEventListener('arms_readonly_update', handleReadonlyUpdate);
    return () => window.removeEventListener('arms_readonly_update', handleReadonlyUpdate);
  }, []);

  // Helper to get current user's own file path
  const getMyOwnFilePath = (): string => {
    const config = getGitHubConfig();
    if (!isGitHubConfigured(config)) {
      return '';
    }
    return (config.path || '').trim();
  };

  // Helper to format file paths professionally: "July 2018 arms001 (My File)" or "ሐምሌ 2018 arms001 (የእኔ ፋይል)"
  const formatFilePathNice = (filePath: string, isMine: boolean, lang: 'en' | 'am') => {
    if (!filePath) return '';
    const parts = filePath.split('/');
    const folder = parts[0] || '';
    const filename = (parts[1] || parts[0] || '').replace(/\.json$/i, '');
    
    let formattedLabel = filePath;
    const match = folder.toLowerCase().match(/^([a-z]+)(\d{4})$/);
    if (match) {
      const monthKey = match[1];
      const year = match[2];
      
      const monthMapAmharic: Record<string, string> = {
        "september": "መስከረም", "meskerem": "መስከረም",
        "october": "ጥቅምት", "tikimt": "ጥቅምት",
        "november": "ህዳር", "hidar": "ህዳር",
        "december": "ታህሳስ", "tahsas": "ታህሳስ",
        "january": "ጥር", "tir": "ጥር",
        "february": "የካቲት", "yekatit": "የካቲት",
        "march": "መጋቢት", "megabit": "መጋቢት",
        "april": "ሚያዚያ", "miazia": "ሚያዚያ",
        "may": "ግንቦት", "genbot": "ግንቦት",
        "june": "ሰኔ", "sene": "ሰኔ",
        "july": "ሐምሌ", "hamle": "ሐምሌ",
        "august": "ነሐሴ", "nehasse": "ነሐሴ",
        "pagume": "ጳጉሜ"
      };

      const monthMapEnglish: Record<string, string> = {
        "september": "September", "meskerem": "Meskerem",
        "october": "October", "tikimt": "Tikimt",
        "november": "November", "hidar": "Hidar",
        "december": "December", "tahsas": "Tahsas",
        "january": "January", "tir": "Tir",
        "february": "February", "yekatit": "Yekatit",
        "march": "March", "megabit": "Megabit",
        "april": "April", "miazia": "Miazia",
        "may": "May", "genbot": "Genbot",
        "june": "June", "sene": "Sene",
        "july": "July", "hamle": "Hamle",
        "august": "August", "nehasse": "Nehasse",
        "pagume": "Pagume"
      };

      if (lang === 'am') {
        const monthAm = monthMapAmharic[monthKey] || monthKey;
        formattedLabel = `${monthAm} ${year} ${filename}`;
      } else {
        const monthEn = monthMapEnglish[monthKey] || (monthKey.charAt(0).toUpperCase() + monthKey.slice(1));
        formattedLabel = `${monthEn} ${year} ${filename}`;
      }
    } else if (filename) {
      formattedLabel = filename;
    }

    if (isMine) {
      const suffix = lang === 'am' ? '(የእኔ ፋይል)' : '(My File)';
      return `${formattedLabel} ${suffix}`;
    }

    return formattedLabel;
  };

  // Helper to parse Month and Year from a file path
  const parseMonthAndYearFromPath = (filePath: string) => {
    const folder = filePath.split('/')[0];
    const match = folder.match(/^([a-z]+)(\d{4})$/);
    if (match) {
      const monthName = match[1];
      const year = match[2];
      
      const monthMap: Record<string, string> = {
        "september": "01", "october": "02", "november": "03", "december": "04",
        "january": "05", "february": "06", "march": "07", "april": "08",
        "may": "09", "june": "10", "july": "11", "august": "12", "pagume": "13"
      };
      
      const month = monthMap[monthName] || "01";
      return { month, year };
    }
    return null;
  };

  // 1. Fetch available paths based on selectedMonth, selectedYear, and activeSecretKey
  useEffect(() => {
    let isMounted = true;
    const myOwnPath = getMyOwnFilePath();

    // If no secret key provided, show only the user's own file path (if available)
    if (!activeSecretKey.trim()) {
      const defaultPaths = myOwnPath ? [myOwnPath] : [];
      setAvailablePaths(defaultPaths);
      if (myOwnPath) {
        setSelectedFilePath(myOwnPath);
      } else {
        setSelectedFilePath("");
      }
      return;
    }

    const currentReqId = ++fetchPathsReqIdRef.current;

    const fetchPaths = async () => {
      setIsLoadingFile(true);
      isFetchingRemoteRef.current = true;
      setFileError(null);
      try {
        const { paths, error } = await findFilesBySecretKey(activeSecretKey.trim());
        if (!isMounted || currentReqId !== fetchPathsReqIdRef.current) return;

        if (error) {
          console.warn("Could not list user backups by secret key:", error);
          setAvailablePaths(myOwnPath ? [myOwnPath] : []);
          return;
        }

        if (isMounted && currentReqId === fetchPathsReqIdRef.current) {
          const sorted = [...paths].sort((a, b) => b.localeCompare(a));
          // Always ensure user's own file path is placed FIRST at index 0
          const foreignPaths = sorted.filter(p => p !== myOwnPath);
          const finalPaths = myOwnPath ? [myOwnPath, ...foreignPaths] : foreignPaths;
          setAvailablePaths(finalPaths);
        }
      } catch (err) {
        console.warn("Notice: available paths fetch handled gracefully:", err);
        if (isMounted && currentReqId === fetchPathsReqIdRef.current) {
          setAvailablePaths(myOwnPath ? [myOwnPath] : []);
        }
      } finally {
        if (isMounted && currentReqId === fetchPathsReqIdRef.current) {
          setIsLoadingFile(false);
          isFetchingRemoteRef.current = false;
        }
      }
    };

    fetchPaths();

    return () => {
      isMounted = false;
    };
  }, [selectedMonth, selectedYear, activeSecretKey]);

  // 2. Automatically load the defaulted/selected file path from availablePaths
  useEffect(() => {
    if (availablePaths.length === 0) {
      setSelectedFilePath("");
      return;
    }

    const myOwnPath = getMyOwnFilePath();
    const currentLoadedPath = localStorage.getItem('arms_readonly_file_path') || '';
    
    // Default to user's own path if present, otherwise first available path
    let targetPath = selectedFilePath;
    if (!targetPath || !availablePaths.includes(targetPath)) {
      targetPath = availablePaths.includes(myOwnPath) ? myOwnPath : availablePaths[0];
    }

    if (targetPath && targetPath !== currentLoadedPath) {
      if (targetPath === myOwnPath) {
        // User's OWN path: clear read-only mode and restore live master database
        localStorage.removeItem('arms_readonly_mode');
        localStorage.removeItem('arms_shared_database');
        localStorage.removeItem('arms_readonly_file_path');
        window.dispatchEvent(new Event('arms_readonly_update'));
        setSelectedFilePath(targetPath);
        setData(getDB());
      } else {
        // Previewing another user's path: fetch and put in read-only arms_shared_database
        const currentReqId = ++loadFileReqIdRef.current;
        const loadFileContent = async () => {
          setIsLoadingFile(true);
          isFetchingRemoteRef.current = true;
          setFileError(null);
          try {
            const { data: fetchedData, error } = await fetchFromGitHub(targetPath);
            if (currentReqId !== loadFileReqIdRef.current) return;
            if (error) {
              setFileError(error);
            } else if (fetchedData) {
              localStorage.setItem('arms_shared_database', JSON.stringify(fetchedData));
              localStorage.setItem('arms_readonly_mode', 'true');
              localStorage.setItem('arms_readonly_file_path', targetPath);
              
              window.dispatchEvent(new Event('arms_readonly_update'));
              setSelectedFilePath(targetPath);
              setData(fetchedData);
            }
          } catch (err) {
            if (currentReqId === loadFileReqIdRef.current) {
              setFileError("Failed to fetch file content");
            }
          } finally {
            if (currentReqId === loadFileReqIdRef.current) {
              setIsLoadingFile(false);
              isFetchingRemoteRef.current = false;
            }
          }
        };

        loadFileContent();
      }
    } else if (targetPath && targetPath === currentLoadedPath && targetPath !== selectedFilePath) {
      setSelectedFilePath(targetPath);
    }
  }, [availablePaths, selectedFilePath]);

  const handleFilePathChange = async (filePath: string) => {
    if (!filePath) return;
    const myOwnPath = getMyOwnFilePath();

    if (filePath === myOwnPath) {
      // Switching back to user's OWN file path: full read/write, master DB
      localStorage.removeItem('arms_readonly_mode');
      localStorage.removeItem('arms_shared_database');
      localStorage.removeItem('arms_readonly_file_path');
      window.dispatchEvent(new Event('arms_readonly_update'));
      setSelectedFilePath(filePath);
      setData(getDB());
      return;
    }

    const currentReqId = ++loadFileReqIdRef.current;
    setIsLoadingFile(true);
    isFetchingRemoteRef.current = true;
    setFileError(null);
    try {
      const { data: fetchedData, error } = await fetchFromGitHub(filePath);
      if (currentReqId !== loadFileReqIdRef.current) return;
      if (error) {
        setFileError(error);
      } else if (fetchedData) {
        localStorage.setItem('arms_shared_database', JSON.stringify(fetchedData));
        localStorage.setItem('arms_readonly_mode', 'true');
        localStorage.setItem('arms_readonly_file_path', filePath);
        
        // Keep selected month and year in sync with the parsed path
        const parsed = parseMonthAndYearFromPath(filePath);
        if (parsed) {
          setSelectedMonth(parsed.month);
          setSelectedYear(parsed.year);
        }

        window.dispatchEvent(new Event('arms_readonly_update'));
        setSelectedFilePath(filePath);
        setData(fetchedData);
      }
    } catch (err) {
      if (currentReqId === loadFileReqIdRef.current) {
        setFileError("Failed to fetch file content");
      }
    } finally {
      if (currentReqId === loadFileReqIdRef.current) {
        setIsLoadingFile(false);
        isFetchingRemoteRef.current = false;
      }
    }
  };

  useEffect(() => {
    setData(getDB());
    
    const interval = setInterval(() => {
        if (!isFetchingRemoteRef.current) {
            setData(getDB());
        }
        setCurrentTime(new Date());
    }, 1000); 
    return () => clearInterval(interval);
  }, []);

  if (!data || !selectedMonth || !selectedYear) return <div className="flex items-center justify-center h-full text-gold-500 animate-pulse tracking-widest uppercase text-sm">{t('initializing')}</div>;

  // --- FILTERING LOGIC ---
  const filterDatePrefix = `${selectedYear}-${selectedMonth}`;
  
  // 1. Manpower: Updated to match Audit Page Logic (Monthly Roster)
  // Previously checked specific days, now checks if they are active ANY time during the selected month.
  const monthStart = `${filterDatePrefix}-01`;
  const monthEnd = `${filterDatePrefix}-30`;

  // Filter Manpower based strictly on month overlap (Consistent with Audit)
  const monthlyManpower = data.manpower.filter(m => {
      // Overlap Check: Start <= MonthEnd AND End >= MonthStart
      return m.startDate <= monthEnd && m.endDate >= monthStart;
  });

  // --- ACTIVE MANPOWER (REAL-TIME SNAPSHOT) ---
  // Calculates specific active count for the dashboard display
  const [currentY, currentM, currentD] = getCurrentEthiopianDate().split('-');
  const isCurrentMonthView = selectedYear === currentY && selectedMonth === currentM;
  const currentDayInt = parseInt(currentD) || 30;

  const activeManpower = monthlyManpower.filter(m => {
      // If viewing history, show the full roster count. 
      // If viewing current month, strictly filter by TODAY to show "Current Time Active".
      if (!isCurrentMonthView) return true; 
      
      const [sY, sM, sD] = m.startDate.split('-');
      const [eY, eM, eD] = m.endDate.split('-');
      
      const startDay = (sY === selectedYear && sM === selectedMonth) ? parseInt(sD) : 1;
      const endDay = (eY === selectedYear && eM === selectedMonth) ? parseInt(eD) : 30;
      
      return currentDayInt >= startDay && currentDayInt <= endDay;
  });

  // 2. Income Items (Sales): Matches Month/Year
  const thisMonthIncomeItems = data.incomeItems.filter(i => isSameMonth(i.date, `${filterDatePrefix}-01`));
  
  // 3. Expenses: Matches Month/Year
  const thisMonthExpenses = data.expenses.filter(e => isSameMonth(e.date, `${filterDatePrefix}-01`));
  
  // 4. Refunds: Matches Month/Year (using stopDate)
  const thisMonthRefunds = data.refunds.filter(r => isSameMonth(r.stopDate, `${filterDatePrefix}-01`));

  // 5. Subsidies: Matches Month/Year
  const thisMonthSubsidies = data.subsidies.filter(s => isSameMonth(s.date, `${filterDatePrefix}-01`));

  // 6. Transfers: Matches DateTo (Month Name)
  const selectedMonthIndex = parseInt(selectedMonth) - 1;
  const selectedMonthName = ETHIOPIAN_MONTHS[selectedMonthIndex];
  const thisMonthTransfers = data.transfers.filter(t => t.dateTo === selectedMonthName);

  // --- MONTHLY FINANCIAL TOTALS ---
  
  // Manpower Income (Monthly Count * Amount)
  const manpowerMonthlyTotal = monthlyManpower.reduce((acc, m) => {
      let amt = Number(m.amount);
      if (!amt) {
          // Default rates matching Audit defaults
          if (m.type === ManpowerType.PAYROLL || m.type === ManpowerType.FULL_CASH) amt = 3000;
          else if (m.type === ManpowerType.HALF_CASH) amt = 1500;
          else amt = 3000; // Fallback for others to standard rate
      }
      return acc + amt;
  }, 0);

  const incomeItemsMonthlyTotal = thisMonthIncomeItems.reduce((acc, i) => acc + (Number(i.amount || 0) * Number(i.singlePrice || 0)), 0);
  const subsidiesMonthlyTotal = thisMonthSubsidies.filter(s => s.type === 'Financial').reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
  const transfersMonthlyTotal = thisMonthTransfers.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const totalIncome = manpowerMonthlyTotal + incomeItemsMonthlyTotal + subsidiesMonthlyTotal + transfersMonthlyTotal;

  // Expense Totals
  const marketCost = thisMonthExpenses.reduce((acc, e) => e.category === 'Market' ? Number(acc) + (Number(e.amount) * Number(e.singlePrice || 0)) : Number(acc), 0);
  const wageCost = thisMonthExpenses.reduce((acc, e) => e.category === 'Wage' ? Number(acc) + Number(e.amount) : Number(acc), 0);
  const otherCost = thisMonthExpenses.reduce((acc, e) => e.category === 'Other' ? Number(acc) + Number(e.amount) : Number(acc), 0);
  const refundCost = thisMonthRefunds.reduce((acc, r) => Number(acc) + Number(r.amount), 0);
  
  const totalExpense = marketCost + wageCost + otherCost + refundCost;
  
  // --- NET FINANCIAL POSITION (MONTHLY) ---
  const moneyInHand = totalIncome - totalExpense;

  // Store Stats (Monthly Inventory Value)
  const inventoryItems = data.storeItems.filter(i => i.category === 'inventory' && isSameMonth(i.date, `${filterDatePrefix}-01`));
  const inventoryValue = inventoryItems.reduce((acc, i) => Number(acc) + (Number(i.amount) * Number(i.singlePrice)), 0);

  // --- DAILY AVG ---
  const [currY, currM] = getCurrentEthiopianDate().split('-');
  let dayDivisor = 30;
  if (selectedYear === currY && selectedMonth === currM) {
      dayDivisor = parseInt(getCurrentEthiopianDate().split('-')[2]) || 1;
  }

  const dailyIncomeAvg = totalIncome / 30; 
  const dailyBurnRate = totalExpense / Math.max(1, dayDivisor); 
  const netDaily = dailyIncomeAvg - dailyBurnRate;
  
  const runwayDays = moneyInHand > 0 ? Math.floor(moneyInHand / (dailyBurnRate || 1)) : 0;

  // --- MARKET VOLATILITY ANALYSIS ---
  const itemLastPrices: Record<string, number> = {};
  const volatilityStats: Record<string, { incTotal: number, incCount: number, decTotal: number, decCount: number }> = {};

  const sortedExpenses = [...data.expenses]
    .filter(e => e.category === 'Market' && e.singlePrice && e.singlePrice > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  sortedExpenses.forEach(exp => {
      const name = exp.itemName?.trim().toLowerCase();
      if (!name) return;
      
      const currentPrice = Number(exp.singlePrice) || 0;
      const key = volatilityView === 'monthly' ? exp.date.substring(0, 7) : exp.date;

      if (volatilityView === 'daily' && !exp.date.startsWith(filterDatePrefix)) return;

      if (!volatilityStats[key]) volatilityStats[key] = { incTotal: 0, incCount: 0, decTotal: 0, decCount: 0 };

      if (itemLastPrices[name] !== undefined) {
          const prev = itemLastPrices[name];
          const diff = currentPrice - prev;
          
          let pct = 0;
          if (prev !== 0) {
              pct = (diff / prev) * 100;
          } else if (diff > 0) {
              pct = 100;
          }

          if (pct > 0) {
              volatilityStats[key].incTotal += pct;
              volatilityStats[key].incCount++;
          } else if (pct < 0) {
              volatilityStats[key].decTotal += Math.abs(pct);
              volatilityStats[key].decCount++;
          }
      }
      
      itemLastPrices[name] = currentPrice;
  });

  const marketVolatilityData = Object.keys(volatilityStats).sort().map(k => ({
      name: k, 
      displayName: volatilityView === 'monthly' ? k : k.split('-').slice(1).join('/'), 
      inflation: volatilityStats[k].incCount ? parseFloat((volatilityStats[k].incTotal / volatilityStats[k].incCount).toFixed(1)) : 0,
      deflation: volatilityStats[k].decCount ? parseFloat((volatilityStats[k].decTotal / volatilityStats[k].decCount).toFixed(1)) : 0,
  }));

  const totalInflationSum = marketVolatilityData.reduce((acc, curr) => acc + curr.inflation, 0);
  const avgInflationRate = marketVolatilityData.length > 0 ? (totalInflationSum / marketVolatilityData.length) : 0;
  
  const totalDeflationSum = marketVolatilityData.reduce((acc, curr) => acc + curr.deflation, 0);
  const avgDeflationRate = marketVolatilityData.length > 0 ? (totalDeflationSum / marketVolatilityData.length) : 0;

  // --- TOP 4 LISTS (Filtered by Month) ---
  const topExpenses = [
    ...thisMonthExpenses.map(e => ({
        ...e,
        totalValue: e.category === 'Market' ? (Number(e.amount || 0) * Number(e.singlePrice || 0)) : Number(e.amount || 0),
        displayName: e.category === 'Market' ? e.itemName : (e.workerName || e.reason || t('expenditure'))
    })),
    ...thisMonthRefunds.map(r => ({
        ...r,
        totalValue: Number(r.amount || 0),
        displayName: `${r.firstName} ${r.lastName} (${t('refund')})`
    }))
  ]
    .filter(item => !isNaN(item.totalValue) && item.totalValue > 0)
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 4);

  const topIncome = [
    ...thisMonthIncomeItems.map(i => ({
        ...i,
        totalValue: Number(i.amount || 0) * Number(i.singlePrice || 0),
        displayName: i.name,
        displaySubtext: `${i.amount} ${t(i.measurement || '')}`
    })),
    ...thisMonthSubsidies.filter(s => s.type === 'Financial').map(s => ({
        ...s,
        totalValue: Number(s.amount || 0),
        displayName: s.itemName || s.source || t('subsidy'),
        displaySubtext: t('subsidy')
    })),
    ...thisMonthTransfers.map(tItem => ({
        ...tItem,
        totalValue: Number(tItem.amount || 0),
        displayName: tItem.description || t('transfer'),
        displaySubtext: t('budgetTransfer'),
        date: `${selectedYear}-${selectedMonth}-01`
    }))
  ]
    .filter(item => !isNaN(item.totalValue) && item.totalValue > 0)
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 4);

  // --- CHART DATA PREP ---
  const expenseBreakdownData = [
      { name: t('market'), value: marketCost },
      { name: t('wage'), value: wageCost },
      { name: t('refunds'), value: refundCost },
      { name: t('operationalExpense'), value: otherCost },
  ].sort((a, b) => b.value - a.value);

  const incomeBreakdownData = [
      { name: t('manpower'), value: manpowerMonthlyTotal },
      { name: t('salesIncome'), value: incomeItemsMonthlyTotal },
      { name: t('subsidy'), value: subsidiesMonthlyTotal },
      { name: t('transfer'), value: transfersMonthlyTotal },
  ].sort((a, b) => b.value - a.value);

  // Options for Dropdown
  const monthOptions = ETHIOPIAN_MONTHS.map((m, i) => ({
      value: (i + 1).toString().padStart(2, '0'),
      label: language === 'am' ? ETHIOPIAN_MONTHS_AMHARIC[i] : m
  }));
  
  const yearsOptions = Array.from({length: 63}, (_, i) => (2018 + i).toString());

  // Modal Handler
  const openModal = (type: typeof modalType) => {
      setModalType(type);
      setModalOpen(true);
  };

  const closeModal = () => {
      setModalOpen(false);
      setModalType(null);
  };

  const renderModalContent = () => {
      if (!modalType) return null;

      let title = "";
      let content = null;

      if (modalType === 'manpower') {
          title = `${t('manpowerEntry')} (${selectedYear}-${selectedMonth})`;
          content = (
              <table className="w-full text-sm text-left text-gray-400">
                  <thead className="bg-black/40 text-gold-500 uppercase text-xs">
                      <tr><th className="p-2 md:p-3">{t('rank')}</th><th className="p-2 md:p-3">{t('firstName')}</th><th className="p-2 md:p-3">{t('type')}</th><th className="p-2 md:p-3 text-right">{t('amount')}</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                      {monthlyManpower.map((m, i) => (
                          <tr key={i} className="hover:bg-white/5">
                              <td className="p-2">{t(m.rank)}</td>
                              <td className="p-2 font-bold text-white">{m.firstName} {m.lastName}</td>
                              <td className="p-2"><span className="bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded text-[10px] md:text-xs whitespace-nowrap">{t(m.type)}</span></td>
                              <td className="p-2 text-right font-mono">{Number(m.amount || 3000).toLocaleString()}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          );
      } else if (modalType === 'sales') {
          title = `${t('salesIncome')} (${selectedYear}-${selectedMonth})`;
          content = (
              <table className="w-full text-sm text-left text-gray-400">
                  <thead className="bg-black/40 text-gold-500 uppercase text-xs">
                      <tr><th className="p-2 md:p-3">{t('date')}</th><th className="p-2 md:p-3">{t('item')}</th><th className="p-2 md:p-3">{t('quantity')}</th><th className="p-2 md:p-3 text-right">{t('totalCost')}</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                      {thisMonthIncomeItems.map((item, i) => (
                          <tr key={i} className="hover:bg-white/5">
                              <td className="p-2 text-xs whitespace-nowrap">{formatEthiopianDate(item.date, language)}</td>
                              <td className="p-2 font-bold text-white">{item.name}</td>
                              <td className="p-2 whitespace-nowrap">{item.amount} {t(item.measurement)}</td>
                              <td className="p-2 text-right font-mono text-green-400">{(Number(item.amount) * Number(item.singlePrice)).toLocaleString()}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          );
      } else if (modalType === 'store') {
          title = `${t('storeValue')} (${selectedYear}-${selectedMonth})`;
          content = (
              <table className="w-full text-sm text-left text-gray-400">
                  <thead className="bg-black/40 text-gold-500 uppercase text-xs">
                      <tr><th className="p-2 md:p-3">{t('itemName')}</th><th className="p-2 md:p-3">{t('inStock')}</th><th className="p-2 md:p-3 text-right">{t('estimatedValue')}</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                      {inventoryItems.map((item, i) => (
                          <tr key={i} className="hover:bg-white/5">
                              <td className="p-2 font-bold text-white">{item.name}</td>
                              <td className="p-2 whitespace-nowrap">{item.amount} {t(item.measurement)}</td>
                              <td className="p-2 text-right font-mono text-green-400">{(Number(item.amount) * Number(item.singlePrice)).toLocaleString()}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          );
      } else if (modalType === 'refunds') {
          title = `${t('refunds')} (${selectedYear}-${selectedMonth})`;
          content = (
              <table className="w-full text-sm text-left text-gray-400">
                  <thead className="bg-black/40 text-gold-500 uppercase text-xs">
                      <tr><th className="p-2 md:p-3">{t('date')}</th><th className="p-2 md:p-3">{t('manpower')}</th><th className="p-2 md:p-3">{t('description')}</th><th className="p-2 md:p-3 text-right">{t('amount')}</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                      {thisMonthRefunds.map((r, i) => (
                          <tr key={i} className="hover:bg-white/5">
                              <td className="p-2 text-xs whitespace-nowrap">{formatEthiopianDate(r.stopDate, language)}</td>
                              <td className="p-2 font-bold text-white">{t(r.rank)} {r.firstName}</td>
                              <td className="p-2 text-xs max-w-[100px] md:max-w-[150px] truncate">{r.description}</td>
                              <td className="p-2 text-right font-mono text-orange-400">-{Number(r.amount).toLocaleString()}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          );
      }

      return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-gold-500 rounded-xl shadow-2xl w-[95%] md:w-full max-w-3xl max-h-[85vh] flex flex-col">
                  <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-military-900/50 rounded-t-xl">
                      <h3 className="text-lg md:text-xl font-bold text-gold-500 flex items-center gap-2">
                          <Activity size={20}/> {title}
                      </h3>
                      <button onClick={closeModal} className="p-2 hover:bg-red-900/50 text-gray-400 hover:text-white rounded-full transition">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="flex-1 overflow-auto p-2 md:p-4 custom-scrollbar">
                      <div className="overflow-x-auto">
                        {content}
                      </div>
                  </div>
                  <div className="p-3 border-t border-gray-700 bg-black/20 text-right text-xs text-gray-500">
                      {t('close')}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-12 relative">
      {modalOpen && renderModalContent()}

      {/* FILTER BAR */}
      <div className="bg-military-900 p-4 rounded-xl border border-military-700 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between shadow-lg min-w-0">
          <div className="flex items-center gap-2 text-gold-500 shrink-0">
              <Filter size={20} />
              <span className="font-bold text-sm uppercase tracking-wide">{t('filters')}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap md:flex-row lg:flex-nowrap gap-3 w-full lg:w-auto items-stretch lg:items-end min-w-0">
              <div className="flex gap-3 w-full sm:w-auto md:w-full md:flex-1 lg:w-auto min-w-0">
                  <div className="w-1/2 sm:w-36 md:w-1/2 lg:w-40 flex flex-col gap-1 min-w-0">
                      <span className="text-[10px] uppercase font-mono text-amber-500 font-bold truncate">{language === 'en' ? 'Month' : 'ወር'}</span>
                      <CustomSelect 
                          value={selectedMonth}
                          onChange={val => setSelectedMonth(val)}
                          options={monthOptions}
                          className="text-sm font-bold"
                      />
                  </div>
                  <div className="w-1/2 sm:w-28 md:w-1/2 lg:w-32 flex flex-col gap-1 min-w-0">
                      <span className="text-[10px] uppercase font-mono text-amber-500 font-bold truncate">{language === 'en' ? 'Year' : 'ዓመት'}</span>
                      <CustomSelect 
                          value={selectedYear}
                          onChange={val => setSelectedYear(val)}
                          options={yearsOptions}
                          className="text-sm font-bold"
                      />
                  </div>
              </div>
              <div className="w-full sm:w-72 md:w-full lg:w-[304px] flex flex-col gap-1 min-w-0">
                  <span className="text-[10px] uppercase font-mono text-amber-500 font-bold flex items-center gap-1.5 truncate">
                    {language === 'en' ? 'Available File Path' : 'የሚገኝ የፋይል መንገድ'}
                    {isLoadingFile && <div className="w-3 h-3 rounded-full border-2 border-amber-500 border-t-transparent animate-spin shrink-0"></div>}
                  </span>
                  <CustomSelect 
                      value={selectedFilePath}
                      onChange={val => handleFilePathChange(val)}
                      options={availablePaths.map(p => {
                        const isMine = getMyOwnFilePath() && p === getMyOwnFilePath();
                        return {
                          value: p,
                          label: formatFilePathNice(p, !!isMine, language as 'en' | 'am'),
                          className: isMine 
                            ? 'border-2 border-emerald-500/80 bg-emerald-950/60 text-emerald-400 font-bold my-0.5 rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                            : 'hover:bg-slate-800/80'
                        };
                      })}
                      placeholder={language === 'en' ? 'Select File Path' : 'የፋይል መንገድ ይምረጡ'}
                      className="text-xs font-mono text-amber-400 border border-amber-500/30 bg-amber-500/5"
                  />
              </div>
          </div>
      </div>   

      <div className={`grid grid-cols-1 ${isSidebarOpen ? 'md:grid-cols-1' : 'md:grid-cols-2'} lg:grid-cols-2 gap-4 md:gap-6`}>
          {/* Card 1: Ethiopian Date & Time */}
          <div className="bg-black/20 rounded-xl p-3 md:p-4 border border-military-700 flex flex-row items-center justify-between lg:flex-row lg:items-center lg:justify-between gap-3 shadow-lg min-w-0">
               <div className="flex items-center gap-3 min-w-0">
                   <div className="bg-gold-500/20 p-2 md:p-3 rounded-full text-gold-500 animate-pulse shrink-0">
                       <Clock size={20} className="md:w-6 md:h-6" />
                   </div>
                   <div className="min-w-0">
                       <h4 className="text-white font-bold text-xs sm:text-sm md:text-sm lg:text-base truncate">{t('ethiopianDate')}</h4>
                       <p className="text-[11px] sm:text-xs md:text-xs lg:text-sm text-gold-500 font-bold break-words">{formatEthiopianDate(getCurrentEthiopianDate(), language)}</p>
                   </div>
               </div>
               <div className="text-gray-400 font-mono text-xs sm:text-sm md:text-xs lg:text-base font-bold tracking-normal sm:tracking-wider whitespace-nowrap shrink-0 ml-auto md:ml-11 lg:ml-auto">
                   {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}
               </div>
          </div>

          {/* Card 2: System Status */}
          <div className="bg-black/20 rounded-xl p-3 md:p-4 border border-military-700 flex flex-row items-center justify-between lg:flex-row lg:items-center lg:justify-between gap-3 shadow-lg min-w-0">
               <div className="flex items-center gap-3 min-w-0">
                   <div className="bg-green-500/20 p-2 md:p-3 rounded-full text-green-500 shrink-0">
                       <Zap size={20} className="md:w-6 md:h-6" />
                   </div>
                   <div className="min-w-0">
                       <h4 className="text-white font-bold text-xs sm:text-sm md:text-sm lg:text-base truncate">{t('systemStatus')}</h4>
                       <p className="text-[10px] md:text-[11px] lg:text-xs text-gray-400 truncate">{t('dbIntegrity')}</p>
                   </div>
               </div>
               <div className="text-green-500 font-bold text-[11px] sm:text-xs md:text-xs lg:text-sm flex items-center gap-1 bg-green-900/20 px-2.5 py-1 rounded-full border border-green-500/30 whitespace-nowrap shrink-0 ml-auto md:ml-11 lg:ml-auto">
                   <ShieldCheck size={14} className="md:w-4 md:h-4" /> {t('online')}
               </div>
          </div>
      </div>
         
      <div className="bg-gradient-to-r from-military-900 to-military-800 rounded-2xl p-6 md:p-8 border border-military-700 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition transform group-hover:scale-110 pointer-events-none">
              <div className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center">
                <img src={etafLogo} alt="Ethiopian Air Force Watermark" className="w-full h-full object-cover scale-108" />
              </div>
          </div>
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-center">
              <div className="lg:col-span-2">
                  <div className="flex items-center gap-3 mb-2">
                      <div className={`w-3 h-3 rounded-full ${moneyInHand < 0 ? 'bg-red-500 animate-ping' : 'bg-green-500'}`}></div>
                      <h2 className="text-gray-400 text-xs md:text-sm font-bold uppercase tracking-widest">
                          {language === 'am' ? `የ${ETHIOPIAN_MONTHS_AMHARIC[parseInt(selectedMonth)-1] || ''} ወር ገቢ/ወጪ (በእጅ ያለ ገንዘብ)` : `${ETHIOPIAN_MONTHS[parseInt(selectedMonth)-1] || ''} Net Position (Cash in Hand)`}
                      </h2>
                  </div>
                  <h1 className={`text-4xl md:text-6xl font-black tracking-tighter mb-4 ${moneyInHand < 0 ? 'text-red-500' : 'text-white'}`}>
                      {moneyInHand.toLocaleString()} <span className="text-xl md:text-2xl text-gold-500 font-serif">{t('birr')}</span>
                  </h1>
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-sm font-mono text-gray-400">
                      <div className="flex flex-col">
                          <span className="text-xs uppercase text-green-500 font-bold mb-1">{t('totalInflow')}</span>
                          <span className="text-white text-base md:text-lg">+{totalIncome.toLocaleString()}</span>
                      </div>
                      <div className="hidden sm:block w-px bg-gray-700"></div>
                      <div className="w-full h-px bg-gray-700 sm:hidden"></div>
                      <div className="flex flex-col">
                          <span className="text-xs uppercase text-red-500 font-bold mb-1">{t('totalOutflow')}</span>
                          <span className="text-white text-base md:text-lg">-{totalExpense.toLocaleString()}</span>
                      </div>
                  </div>
              </div>
              
              <div className="bg-black/30 p-4 rounded-xl border border-white/10 flex flex-col justify-between h-full w-full">
                  <div>
                      <h4 className="text-gold-500 font-bold text-xs uppercase mb-3 flex items-center gap-2">
                          <Scale size={14}/> {t('dailyAvg')}
                      </h4>
                      <div className="flex justify-between items-end mb-1">
                          <span className="text-gray-400 text-xs">{t('income')} / {language === 'am' ? '30 ቀን' : '30 Days'}</span>
                          <span className="text-green-400 font-mono text-sm">+{dailyIncomeAvg.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                      </div>
                      <div className="flex justify-between items-end mb-3">
                          <span className="text-gray-400 text-xs">{t('expenditure')} / {dayDivisor} {t('day')}</span>
                          <span className="text-red-400 font-mono text-sm">-{dailyBurnRate.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                      </div>
                      
                      <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden mb-4">
                          <div 
                            className={`h-full ${netDaily >= 0 ? 'bg-green-500' : 'bg-red-500'}`} 
                            style={{ width: `${Math.min((dailyIncomeAvg / (dailyBurnRate || 1)) * 50, 100)}%` }}
                          ></div>
                      </div>
                  </div>
                  
                  <div className="pt-3 border-t border-white/10">
                      <h4 className="text-white font-bold text-xs uppercase mb-1">{t('surplusDuration')}</h4>
                      <div className="flex justify-between items-center">
                         <span className="text-[10px] text-gray-500">{t('daysUntilCash0')}</span>
                         <span className={`text-xl font-black ${runwayDays < 10 ? 'text-red-500' : 'text-blue-400'}`}>
                             {runwayDays} <span className="text-xs font-normal text-gray-400">{t('days')}</span>
                         </span>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <div className={`grid grid-cols-2 gap-3 md:gap-4 ${isSidebarOpen ? 'md:grid-cols-2' : 'md:grid-cols-4'} lg:grid-cols-4`}>
          <button onClick={() => openModal('manpower')} className="text-left bg-military-800 p-3 md:p-4 rounded-xl border-l-4 border-blue-500 shadow-lg hover:bg-military-700 hover:scale-[1.02] transition active:scale-95 group">
              <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] text-blue-400 font-bold uppercase group-hover:text-white transition">{t('manpower')} ({selectedMonth}/{selectedYear})</span>
                  <Users size={16} className="text-blue-500" />
              </div>
              {/* DISPLAY ACTIVE MANPOWER COUNT */}
              <div className="text-lg md:text-2xl font-bold text-white">{activeManpower.length}</div>
              <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">{t('clickForRoster')} <ChevronRight size={10}/></p>
          </button>

          <button onClick={() => openModal('sales')} className="text-left bg-military-800 p-3 md:p-4 rounded-xl border-l-4 border-gold-500 shadow-lg hover:bg-military-700 hover:scale-[1.02] transition active:scale-95 group">
              <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] text-gold-400 font-bold uppercase group-hover:text-white transition">{t('salesIncome')} ({selectedMonth}/{selectedYear})</span>
                  <Wallet size={16} className="text-gold-500" />
              </div>
              <div className="text-lg md:text-2xl font-bold text-white">{thisMonthIncomeItems.length}</div>
              <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">{t('clickForSales')} <ChevronRight size={10}/></p>
          </button>

          <button onClick={() => openModal('store')} className="text-left bg-military-800 p-3 md:p-4 rounded-xl border-l-4 border-green-500 shadow-lg hover:bg-military-700 hover:scale-[1.02] transition active:scale-95 group">
              <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] text-green-400 font-bold uppercase group-hover:text-white transition">{t('storeValue')} ({selectedMonth}/{selectedYear})</span>
                  <Package size={16} className="text-green-500" />
              </div>
              <div className="text-base md:text-xl font-bold text-white truncate">{inventoryValue.toLocaleString()}</div>
              <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">{t('clickForInv')} <ChevronRight size={10}/></p>
          </button>

          <button onClick={() => openModal('refunds')} className="text-left bg-military-800 p-3 md:p-4 rounded-xl border-l-4 border-orange-500 shadow-lg hover:bg-military-700 hover:scale-[1.02] transition active:scale-95 group">
              <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] text-orange-400 font-bold uppercase group-hover:text-white transition">{t('refunds')} ({selectedMonth}/{selectedYear})</span>
                  <RotateCcw size={16} className="text-orange-500" />
              </div>
              <div className="text-base md:text-xl font-bold text-white">{refundCost.toLocaleString()}</div>
              <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">{t('clickForLog')} <ChevronRight size={10}/></p>
          </button>
      </div>

      <div className="bg-slate-900 border border-military-700 rounded-2xl p-4 md:p-6 shadow-xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
             <Percent size={140} className="text-white" />
         </div>
         <div className="flex flex-col xl:flex-row gap-6 relative z-10">
             <div className="w-full xl:w-1/3 flex flex-col justify-center border-b xl:border-b-0 xl:border-r border-gray-800 pb-4 xl:pb-0 xl:pr-6 min-w-0">
                 <h3 className="text-gold-500 font-bold text-sm uppercase tracking-widest flex items-center gap-2 mb-2">
                     <TrendingUp size={16}/> {t('marketVolatility')}
                 </h3>
                 <p className="text-gray-400 text-xs mb-4">{t('volatilityDescription')}</p>
                 
                 <div className="grid grid-cols-2 gap-3 mb-4">
                     <div className="bg-military-900/50 p-2 rounded border border-red-900/30 min-w-0">
                         <span className="block text-[10px] text-gray-500 uppercase truncate">{t('avgPriceHike')}</span>
                         <span className={`text-xs sm:text-sm md:text-base xl:text-xl font-mono font-black block truncate ${avgInflationRate > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                             {avgInflationRate.toFixed(1)}%
                         </span>
                     </div>
                     <div className="bg-military-900/50 p-2 rounded border border-green-900/30 min-w-0">
                         <span className="block text-[10px] text-gray-500 uppercase truncate">{t('avgPriceDrop')}</span>
                         <span className={`text-xs sm:text-sm md:text-base xl:text-xl font-mono font-black block truncate ${avgDeflationRate > 0 ? 'text-green-500' : 'text-gray-500'}`}>
                             {avgDeflationRate.toFixed(1)}%
                         </span>
                     </div>
                 </div>

                 <div className="mt-2 bg-military-900/50 p-3 rounded text-xs text-gray-400 border border-gray-800 space-y-1">
                     <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full shrink-0"></div> <span className="truncate">{t('inflation')}</span></div>
                     <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full shrink-0"></div> <span className="truncate">{t('deflation')}</span></div>
                 </div>

                 <button onClick={() => navigate('/search', { state: { defaultTab: 'trends' } })} className="mt-4 text-xs text-blue-400 hover:text-white flex items-center gap-1 border border-blue-900/50 p-2 rounded hover:bg-blue-900/20 transition w-fit shrink-0">
                    {t('searchTrends')} <ArrowRight size={12}/>
                 </button>
             </div>

             <div className="w-full xl:w-2/3 h-64 min-w-0 flex flex-col justify-between">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                     <h4 className="text-gray-300 font-bold text-xs uppercase flex items-center gap-2">
                         <Activity size={12}/> {t('avgFluctuation')}
                     </h4>
                     <div className="flex items-center gap-1 bg-black/40 rounded-lg p-1 border border-gray-700 w-full sm:w-auto justify-between sm:justify-start">
                        <button 
                            onClick={() => setVolatilityView('monthly')}
                            className={`px-3 py-1 text-[10px] md:text-xs font-bold rounded transition flex items-center gap-1 justify-center ${volatilityView === 'monthly' ? 'bg-gold-500 text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Calendar size={10} /> {t('monthly')}
                        </button>
                        <button 
                            onClick={() => setVolatilityView('daily')}
                            className={`px-3 py-1 text-[10px] md:text-xs font-bold rounded transition flex items-center gap-1 justify-center ${volatilityView === 'daily' ? 'bg-gold-500 text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Clock size={10} /> {t('daily')}
                        </button>
                     </div>
                 </div>

                 <ResponsiveContainer width="100%" height="80%">
                     <AreaChart data={marketVolatilityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                         <defs>
                            <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorDec" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                            </linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                         <XAxis dataKey="displayName" stroke="#94a3b8" tick={{fontSize: 10}} interval={volatilityView === 'daily' ? 'preserveStartEnd' : 0} />
                         <YAxis stroke="#94a3b8" tick={{fontSize: 10}} />
                         <RechartsTooltip 
                             contentStyle={{ backgroundColor: '#0f172a', borderColor: '#d4af37', color: '#fff' }}
                             labelFormatter={(label) => `${volatilityView === 'monthly' ? t('month') : t('dateLabel')}: ${label}`}
                             formatter={(value: any, name: string) => [`${value}%`, name === 'inflation' ? t('avgPriceHike') : t('avgPriceDrop')]}
                         />
                         <Area type="monotone" dataKey="inflation" stroke="#ef4444" fillOpacity={1} fill="url(#colorInc)" strokeWidth={2} name="inflation" />
                         <Area type="monotone" dataKey="deflation" stroke="#22c55e" fillOpacity={1} fill="url(#colorDec)" strokeWidth={2} name="deflation" />
                     </AreaChart>
                 </ResponsiveContainer>
                 {marketVolatilityData.length === 0 && (
                     <div className="h-full flex items-center justify-center text-gray-600 text-xs italic -mt-20">
                         {t('noTrendData')}
                     </div>
                 )}
             </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-military-700 rounded-xl p-4 md:p-5 shadow-xl">
               <h3 className="text-red-400 font-bold text-sm uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
                   <AlertTriangle size={16} /> {t('topExpenses')}
               </h3>
               <div className="space-y-3">
                   {topExpenses.map((e, idx) => (
                       <div key={idx} className={`flex justify-between items-center p-3 bg-military-900/40 rounded border border-gray-800 hover:border-red-500/50 transition ${isSidebarOpen ? 'md:flex-col md:items-start md:justify-start md:gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-0' : ''}`}>
                           <div className={`flex items-center gap-3 ${isSidebarOpen ? 'md:min-w-0 lg:min-w-0' : ''}`}>
                               <div className="w-6 h-6 rounded-full bg-red-900/30 text-red-500 flex items-center justify-center font-bold text-xs shrink-0">{idx + 1}</div>
                               <div className="min-w-0">
                                   <p className="font-bold text-white text-sm truncate">{e.displayName}</p>
                                   <p className="text-[10px] text-gray-500">{formatEthiopianDate(e.date, language)}</p>
                               </div>
                           </div>
                           <div className={`text-right shrink-0 ${isSidebarOpen ? 'md:text-left md:shrink md:w-full md:mt-1 lg:text-right lg:shrink-0 lg:w-auto lg:mt-0' : ''}`}>
                               <p className="text-red-400 font-mono font-bold text-sm md:text-base">-{Number(e.totalValue).toLocaleString()}</p>
                           </div>
                       </div>
                   ))}
                   {topExpenses.length === 0 && <p className="text-gray-500 italic text-xs">{t('noTrendData')}</p>}
               </div>
          </div>

          <div className="bg-slate-900 border border-military-700 rounded-xl p-4 md:p-5 shadow-xl">
               <h3 className="text-green-400 font-bold text-sm uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
                   <TrendingUp size={16} /> {t('topIncome')}
               </h3>
               <div className="space-y-3">
                   {topIncome.map((i, idx) => (
                       <div key={idx} className={`flex justify-between items-center p-3 bg-military-900/40 rounded border border-gray-800 hover:border-green-500/50 transition ${isSidebarOpen ? 'md:flex-col md:items-start md:justify-start md:gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-0' : ''}`}>
                           <div className={`flex items-center gap-3 ${isSidebarOpen ? 'md:min-w-0 lg:min-w-0' : ''}`}>
                               <div className="w-6 h-6 rounded-full bg-green-900/30 text-green-500 flex items-center justify-center font-bold text-xs shrink-0">{idx + 1}</div>
                               <div className="min-w-0">
                                   <p className="font-bold text-white text-sm truncate">{i.displayName}</p>
                                   <p className="text-[10px] text-gray-500">{i.amount} {t(i.measurement)}</p>
                               </div>
                           </div>
                           <div className={`text-right shrink-0 ${isSidebarOpen ? 'md:text-left md:shrink md:w-full md:mt-1 lg:text-right lg:shrink-0 lg:w-auto lg:mt-0' : ''}`}>
                               <p className="text-green-400 font-mono font-bold text-sm md:text-base">+{Number(i.totalValue).toLocaleString()}</p>
                           </div>
                       </div>
                   ))}
                   {topIncome.length === 0 && <p className="text-gray-500 italic text-xs">{t('noTrendData')}</p>}
               </div>
          </div>
      </div>

      <div className="bg-slate-900 border border-military-700 rounded-2xl flex flex-col shadow-xl overflow-hidden h-72 md:h-80">
           <div className="p-4 border-b border-military-800 bg-military-900/50 flex justify-between items-center">
               <h3 className="text-gold-500 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                   <ShoppingCart size={16}/> {t('expenditureBreakdown')}
               </h3>
           </div>
           <div className="flex-1 w-full p-2 md:p-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={expenseBreakdownData}
                        margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                        <YAxis stroke="#94a3b8" tick={{fontSize: 9}} axisLine={false} tickLine={false} />
                        <RechartsTooltip 
                            cursor={{fill: '#ffffff10'}} 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#d4af37', color: '#fff' }}
                            formatter={(value: any) => [Number(value).toLocaleString(), t('amount')]}
                        />
                        <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
           </div>
      </div>

       <div className="bg-slate-900 border border-military-700 rounded-2xl flex flex-col shadow-xl overflow-hidden h-72 md:h-80">
            <div className="p-4 border-b border-military-800 bg-military-900/50 flex justify-between items-center">
                <h3 className="text-green-400 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp size={16}/> {t('incomeBreakdown')}
                </h3>
            </div>
            <div className="flex-1 w-full p-2 md:p-4">
                 <ResponsiveContainer width="100%" height="100%">
                     <BarChart
                         data={incomeBreakdownData}
                         margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
                     >
                         <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                         <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                         <YAxis stroke="#94a3b8" tick={{fontSize: 9}} axisLine={false} tickLine={false} />
                         <RechartsTooltip 
                             cursor={{fill: '#ffffff10'}} 
                             contentStyle={{ backgroundColor: '#0f172a', borderColor: '#d4af37', color: '#fff' }}
                             formatter={(value: any) => [Number(value).toLocaleString(), t('amount')]}
                         />
                         <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={40} />
                     </BarChart>
                 </ResponsiveContainer>
            </div>
       </div>

      <div className="bg-slate-900 border border-military-700 rounded-2xl p-4 md:p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-gold-500 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                  <Activity size={16} /> {t('recentActivity')}
              </h3>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-400 min-w-[500px]">
                  <thead className="bg-military-900 text-gray-500 uppercase text-xs">
                      <tr>
                          <th className="p-3">{t('type')}</th>
                          <th className="p-3">{t('description')}</th>
                          <th className="p-3">{t('date')}</th>
                          <th className="p-3 text-right">{t('amount')}</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                      {[
                          ...thisMonthExpenses.map((e, _i) => ({ id: e.id, type: 'Expenditure', label: e.category === 'Market' ? e.itemName : e.category === 'Other' ? t('operationalExpense') : t(e.category.toLowerCase()), amount: -(Number(e.category === 'Market' ? (Number(e.amount) * Number(e.singlePrice || 1)) : e.amount)), date: e.date, _seq: _i })),
                          ...thisMonthIncomeItems.map((i, _i) => ({ id: i.id, type: 'Income', label: i.name, amount: (Number(i.amount) * Number(i.singlePrice)), date: i.date, _seq: _i })),
                          ...thisMonthRefunds.map((r, _i) => ({ id: r.id, type: 'Refunds', label: `${r.firstName} ${r.lastName}`, amount: -Number(r.amount), date: r.stopDate, _seq: _i })),
                          ...thisMonthSubsidies.map((s, _i) => ({ id: s.id, type: 'Subsidy', label: s.itemName || s.source || t('subsidy'), amount: s.type === 'Financial' ? Number(s.amount) : 0, date: s.date, _seq: _i })),
                          ...thisMonthTransfers.map((tr, _i) => ({ id: tr.id, type: 'Transfer', label: tr.description || t('transfer'), amount: Number(tr.amount), date: `${selectedYear}-${selectedMonth}-01`, _seq: _i })),
                          ...monthlyManpower.map((m, _i) => ({ id: m.id, type: 'Manpower', label: `${m.firstName} ${m.lastName} (${m.type})`, amount: m.amount ? Number(m.amount) : 0, date: m.startDate, _seq: _i })),
                          ...data.storeItems.filter(si => isSameMonth(si.date, `${filterDatePrefix}-01`)).map((si, _i) => ({ id: si.id, type: 'StoreItem', label: si.name, amount: 0, date: si.date, _seq: _i })),
                          ...data.storeOrders.filter(so => isSameMonth(so.date, `${filterDatePrefix}-01`)).map((so, _i) => ({ id: so.id, type: 'StoreOrder', label: so.itemName, amount: 0, date: so.date, _seq: _i })),
                          ...data.notes.filter(n => isSameMonth(n.date, `${filterDatePrefix}-01`)).map((n, _i) => ({ id: n.id, type: 'Note', label: n.title, amount: 0, date: n.date, _seq: _i }))
                      ].sort((a, b) => {
                          const dateCompare = b.date.localeCompare(a.date);
                          if (dateCompare !== 0) return dateCompare;
                          return b._seq - a._seq;
                      }).slice(0, 10).map((item, idx) => (
                          <tr key={idx} className="hover:bg-military-800/50 transition">
                              <td className="p-3">
                                  <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                                      item.type === 'Income' ? 'bg-green-900/50 text-green-400' : 
                                      item.type === 'Refunds' ? 'bg-orange-900/50 text-orange-400' : 
                                      item.type === 'Subsidy' ? 'bg-indigo-900/50 text-indigo-400' :
                                      item.type === 'Transfer' ? 'bg-purple-900/50 text-purple-400' :
                                      item.type === 'Manpower' ? 'bg-blue-900/50 text-blue-400' :
                                      item.type === 'StoreItem' ? 'bg-teal-900/50 text-teal-400' :
                                      item.type === 'StoreOrder' ? 'bg-amber-900/50 text-amber-400' :
                                      item.type === 'Note' ? 'bg-slate-800 text-slate-300' :
                                      'bg-red-900/50 text-red-400'
                                  }`}>
                                      {t(item.type.toLowerCase())}
                                  </span>
                              </td>
                              <td className="p-3 font-medium text-white max-w-[120px] truncate">{item.label || t('notAvailable')}</td>
                              <td className="p-3 text-xs">{formatEthiopianDate(item.date, language)}</td>
                              <td className={`p-3 text-right font-mono font-bold ${item.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {item.amount > 0 ? '+' : ''}{item.amount.toLocaleString()}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

    </div>
  );
};

export default Home;
