
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getDB } from '../services/db';
import { AppData, ManpowerType } from '../types';
import { analyzeData, chatWithAI, stripMarkdown } from '../services/geminiService';
import { 
  Search as SearchIcon, Cpu, User, ShoppingCart, TrendingUp, 
  Gift, ArrowRightLeft, ChevronLeft, ChevronRight, AlertCircle,
  Filter, Copy, Sparkles, LineChart as LineChartIcon, BarChart2,
  MessageSquare, Send, Bot, User as UserIcon, RefreshCcw
} from 'lucide-react';
import { formatEthiopianDate, ETHIOPIAN_MONTHS } from '../services/ethiopianDate';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend 
} from 'recharts';
import CustomSelect from '../components/CustomSelect';
import { useLanguage } from '../contexts/LanguageContext';
import { useDate } from '../contexts/DateContext';

const ITEMS_PER_PAGE = 24; // Increased slightly for grid layout

const ICON_MAP: Record<string, any> = {
    manpower: User,
    income: TrendingUp,
    expenditure: ShoppingCart,
    subsidy: Gift,
    transfer: ArrowRightLeft,
    refund: AlertCircle
};

interface ChatMessage {
    role: 'user' | 'model';
    content: string;
    timestamp: Date;
}

const Search: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'search' | 'trends' | 'chat'>('search');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<AppData | null>(null);
  const [results, setResults] = useState<any[]>([]);
  
  const { t, language } = useLanguage();
  const { month: selectedMonth, year: selectedYear } = useDate();

  // Chatbot State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const QUERY_TEMPLATES = [
    t('q_duplicates'),
    t('q_expenses5000'),
    t('q_incomeVsExpense'),
    t('q_refunds'),
    t('q_marketEfficiency'),
    t('q_topExpenditures')
  ];
  
  // Advanced Filters (State kept for logic, but UI removed)
  const [showDuplicates, setShowDuplicates] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [aiResponse, setAiResponse] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  // Market Trends State
  const [trendItem, setTrendItem] = useState('');
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    setData(getDB());
  }, []);

  // Handle Tab Switch from Navigation
  useEffect(() => {
    if (location.state && (location.state as any).defaultTab) {
        setActiveTab((location.state as any).defaultTab);
    }
  }, [location]);

  useEffect(() => {
      if (activeTab === 'chat' && chatEndRef.current) {
          chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [chatHistory, activeTab]);

  // --- TAB 1: SEARCH LOGIC ---
  useEffect(() => {
    setCurrentPage(1);

    if (!data) {
      setResults([]);
      return;
    }
    
    // --- MONTH FILTER PREPARATION ---
    const filterDatePrefix = `${selectedYear}-${selectedMonth}`;
    const selectedMonthName = ETHIOPIAN_MONTHS[parseInt(selectedMonth) - 1];

    const isInSelectedMonth = (item: any) => {
        // 1. Manpower: Check Overlap (Start <= MonthEnd AND End >= MonthStart)
        if (item.startDate && item.endDate) {
             const mStart = `${filterDatePrefix}-01`;
             const mEnd = `${filterDatePrefix}-30`;
             return item.startDate <= mEnd && item.endDate >= mStart;
        }
        
        // 2. Refunds: Check stopDate
        if (item.stopDate && typeof item.stopDate === 'string') {
            return item.stopDate.startsWith(filterDatePrefix);
        }

        // 3. Transfers (Financial): Check dateTo (Month Name) if date missing
        if (item.dateTo && !item.date) {
             return item.dateTo === selectedMonthName;
        }

        // 4. Standard Date Check (Income, Expense, Subsidy, etc.)
        if (item.date && typeof item.date === 'string') {
            return item.date.startsWith(filterDatePrefix);
        }

        return false;
    };

    // 1. Base Search (Text Query)
    const lowerQ = query.toLowerCase().trim();
    
    const isMatch = (item: any) => {
        // --- DATE FILTER LOGIC ---
        // If the user has NOT typed a query, we filter by the selected month (Browsing Mode).
        // If the user HAS typed a query, we ignore the date filter to allow Global Search.
        if (!lowerQ && !isInSelectedMonth(item)) return false;

        if (!lowerQ && !showDuplicates) return true; // Don't show everything by default unless filters on (Wait, show all in month is good default)
        if (!lowerQ) return true; // If no text query but duplicate filter exists or just listing month data
        
        // 1. Check Raw Data (English/DB Value)
        const rawString = JSON.stringify(item).toLowerCase();
        
        // 2. Check Translated Values (Visual Value)
        // We explicitly translate common enum fields to allow searching in the active language (e.g. Amharic)
        let translatedString = "";
        
        // Add translatable fields if they exist on the item
        if (item.rank) translatedString += t(item.rank) + " ";
        if (item.command) translatedString += t(item.command) + " ";
        if (item.type) translatedString += t(item.type) + " ";
        if (item.measurement) translatedString += t(item.measurement) + " ";
        if (item.category) translatedString += t(item.category) + " "; // Market, Wage, etc.
        
        // Combine raw and translated for full search scope
        const fullSearchContent = (rawString + " " + translatedString).toLowerCase();

        return fullSearchContent.includes(lowerQ);
    };

    // Helper to map DB objects to Search Result Format
    const mapToResult = (item: any, categoryKey: string, title: string, subtitle: string, val: string|null, color: string, border: string) => ({
      id: item.id,
      category: t(categoryKey),
      resultType: categoryKey, // Store string type instead of component
      title, subtitle, value: val, date: item.date || item.startDate || item.dateFrom || item.stopDate, // Normalize date
      color, border, rawItem: item
    });

    const manpowerMatches = data.manpower.filter(isMatch).map(m => mapToResult(
      m, 'manpower', `${m.firstName} ${m.lastName}`, `${t(m.rank)} - ${t(m.type)} - ${t(m.command)}`, 
      m.amount ? `${m.amount} ${t('birr')}` : null, 'text-blue-400', 'border-blue-500'
    ));

    const incomeMatches = data.incomeItems.filter(isMatch).map(i => mapToResult(
      i, 'income', i.name, i.description, `${i.amount} ${t(i.measurement)}`, 
      'text-green-400', 'border-green-500'
    ));

    const expenseMatches = data.expenses.filter(isMatch).map(e => mapToResult(
      e, 'expenditure', e.category === 'Market' ? (e.itemName || t('unknownLabel')) : (e.workerName || t('unknownLabel')), 
      e.description, `${e.amount.toLocaleString()} ${t('birr')}`, 'text-red-400', 'border-red-500'
    ));

    const subsidyMatches = data.subsidies.filter(isMatch).map(s => mapToResult(
      s, 'subsidy', `${s.type} ${t('subsidy')}`, `${t('source')}: ${s.source}`, `${s.amount} ${t(s.measurement)}`, 
      'text-gold-400', 'border-gold-500'
    ));

    const transferMatches = data.transfers.filter(isMatch).map(trans => mapToResult(
      trans, 'transfer', t('budgetTransfer'), trans.description || `${t('fromDateLabel')} ${trans.dateFrom} ${t('toDateLabel')} ${trans.dateTo}`, 
      `${trans.amount} ${t('birr')}`, 'text-purple-400', 'border-purple-500'
    ));

    const refundMatches = data.refunds.filter(isMatch).map(r => mapToResult(
      r, 'refund', `${r.firstName} ${r.lastName}`, `${t(r.rank)} - ${r.description}`, 
      `-${r.amount} ${t('birr')}`, 'text-orange-400', 'border-orange-500'
    ));

    let allResults = [
        ...manpowerMatches, ...incomeMatches, ...expenseMatches, 
        ...subsidyMatches, ...transferMatches, ...refundMatches
    ];

    // 2. Duplicate Filter
    if (showDuplicates) {
        // Group by Title to find real duplicates (Name match)
        const counts: Record<string, number> = {};
        allResults.forEach(r => {
            // Use title as the key (Item Name or Person Name)
            const key = r.title.toLowerCase().trim();
            counts[key] = (counts[key] || 0) + 1;
        });

        // Filter only those with count > 1
        allResults = allResults.filter(r => {
            const key = r.title.toLowerCase().trim();
            return counts[key] > 1;
        });

        // Sort by title to group duplicates visually
        allResults.sort((a, b) => a.title.localeCompare(b.title));
    } else {
        // Default Sort by Date Descending
        allResults.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }

    setResults(allResults);

  }, [query, data, showDuplicates, language, t, selectedMonth, selectedYear]);

  // --- TAB 2: TREND LOGIC ---
  useEffect(() => {
      if (!data || !trendItem) return;
      
      const marketItems = data.expenses.filter(e => 
          e.category === 'Market' && 
          e.itemName?.toLowerCase().trim() === trendItem.toLowerCase().trim()
      );

      // Sort chronological
      marketItems.sort((a, b) => a.date.localeCompare(b.date));

      const chartData = marketItems.map(m => ({
          date: m.date,
          price: m.singlePrice || 0,
          amount: m.amount
      }));
      
      setTrendData(chartData);

  }, [trendItem, data]);

  // --- TAB 3: CHAT LOGIC ---
  const handleChatSubmit = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!chatInput.trim() || !data) return;

      const userMsg = chatInput.trim();
      setChatInput('');
      setIsTyping(true);

      const newHistory = [...chatHistory, { role: 'user', content: userMsg, timestamp: new Date() } as ChatMessage];
      setChatHistory(newHistory);

      // Prepare Context
      const dbContext = {
          manpower: data.manpower.map(m => ({ name: `${m.firstName} ${m.lastName}`, rank: m.rank, type: m.type, amount: m.amount, command: m.command, activeStart: m.startDate, activeEnd: m.endDate })),
          expenses: data.expenses.map(e => ({ type: e.category, name: e.itemName || e.workerName, amount: e.amount, price: e.singlePrice, date: e.date, desc: e.description })),
          income: data.incomeItems.map(i => ({ name: i.name, amount: i.amount, price: i.singlePrice, date: i.date })),
          store: data.storeItems.map(s => ({ name: s.name, qty: s.amount, price: s.singlePrice, date: s.date })),
          subsidies: data.subsidies
      };

      let aiText = "";
      try {
          aiText = await chatWithAI(
              newHistory.map(h => ({ role: h.role, content: h.content })), 
              userMsg, 
              dbContext, 
              language
          );
      } catch (err: any) {
          console.error("Chat AI error:", err);
          aiText = language === 'am'
              ? `የቻት ረዳት ስህተት፦ ${err?.message || "ወደ AI አውታረ መረብ መድረስ አልተቻለም። እባክዎ የቁልፍ ማዋቀሪያዎን ወይም ኢንተርኔትዎን ያረጋግጡ።"}`
              : `Chat Assistant Error: ${err?.message || "Unable to reach the AI Core. Please verify your API Key and connection."}`;
      }

      setChatHistory(prev => [...prev, { role: 'model', content: stripMarkdown(aiText), timestamp: new Date() }]);
      setIsTyping(false);
  };

  const handleResetChat = () => {
      if(window.confirm(t('confirm'))) setChatHistory([]);
  }

  // --- AI HANDLER (OLD SINGLE SEARCH) ---
  const handleAISearch = async () => {
    if (!data) return;
    setLoadingAi(true);
    
    const manpowerContext = data.manpower.map(m => {
        let calculatedAmount = m.amount;
        if (!calculatedAmount) {
            if (m.type === ManpowerType.PAYROLL || m.type === ManpowerType.FULL_CASH) calculatedAmount = 3000;
            else if (m.type === ManpowerType.HALF_CASH) calculatedAmount = 1500;
            else calculatedAmount = 0;
        }
        return {
            name: `${m.firstName} ${m.lastName}`,
            rank: m.rank,
            type: m.type,
            command: m.command,
            contribution_amount: calculatedAmount 
        };
    });

    const incomeContext = data.incomeItems.map(i => ({
        item_name: i.name,
        qty: i.amount,
        unit: i.measurement,
        single_price: i.singlePrice,
        total_value: i.amount * i.singlePrice 
    }));

    const expenseContext = data.expenses.map(e => ({
        category: e.category,
        name: e.itemName || e.workerName,
        cost: e.category === 'Market' ? (e.amount * (e.singlePrice || 0)) : e.amount,
        date: e.date,
        description: e.description
    }));

    const richContext = JSON.stringify({
        meta: "Currency: Birr. Dates: Ethiopian Calendar.",
        manpower: manpowerContext,
        expenses: expenseContext,
        income_items_sold: incomeContext,
        subsidies: data.subsidies,
        refunds: data.refunds
    });

    const finalQuery = query || "Provide a summary of anomalies or potential duplicate data."; // Default prompt if query empty

    try {
        const res = await analyzeData(finalQuery, richContext, language);
        setAiResponse(stripMarkdown(res));
    } catch (err: any) {
        console.error("AI Search Error:", err);
        const localizedError = language === 'am'
            ? `የትንተና ስህተት ተከስቷል፦ ${err?.message || "ወደ AI ማገናኘት አልተሳካም። እባክዎ የ API ቁልፍዎን ያረጋግጡ።"}`
            : `Analysis Error: ${err?.message || "Failed to connect to AI service. Please verify your API Key and connection."}`;
        setAiResponse(localizedError);
    } finally {
        setLoadingAi(false);
    }
  };

  // --- PAGINATION ---
  const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedResults = results.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  // --- HELPER FOR TRENDS ---
  // Get unique market item names
  const uniqueMarketItems = data ? Array.from(new Set(
      data.expenses
      .filter(e => e.category === 'Market' && e.itemName)
      .map(e => e.itemName!)
  )).sort() : [];

  return (
    <div className="max-w-7xl mx-auto pb-12 h-full flex flex-col">
      
      {/* HEADER & TABS */}
      <div className="relative mb-4 sticky top-0 z-30 pt-4 bg-slate-900 pb-2 shadow-xl -mx-4 px-4 md:rounded-b-2xl shrink-0">
        <div className="flex gap-2 mb-4 max-w-lg mx-auto">
            <button 
                onClick={() => setActiveTab('search')}
                className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${activeTab === 'search' ? 'flex-auto md:flex-1 bg-gold-500 text-black' : 'flex-none w-14 md:flex-1 px-4 bg-military-800 text-gray-400 hover:text-white'}`}
                title={t('search')}
            >
                <SearchIcon size={18} /> <span className={activeTab === 'search' ? 'block' : 'hidden md:block'}>{t('search')}</span>
            </button>
            <button 
                onClick={() => setActiveTab('trends')}
                className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${activeTab === 'trends' ? 'flex-auto md:flex-1 bg-gold-500 text-black' : 'flex-none w-14 md:flex-1 px-4 bg-military-800 text-gray-400 hover:text-white'}`}
                title={t('marketTrends')}
            >
                <LineChartIcon size={18} /> <span className={activeTab === 'trends' ? 'block' : 'hidden md:block'}>{t('marketTrends')}</span>
            </button>
            <button 
                onClick={() => setActiveTab('chat')}
                className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${activeTab === 'chat' ? 'flex-auto md:flex-1 bg-gold-500 text-black' : 'flex-none w-14 md:flex-1 px-4 bg-military-800 text-gray-400 hover:text-white'}`}
                title={t('aiAssistant')}
            >
                <MessageSquare size={18} /> <span className={activeTab === 'chat' ? 'block' : 'hidden md:block'}>{t('aiAssistant')}</span>
            </button>
        </div>

        {activeTab === 'search' && (
            <div className="max-w-3xl mx-auto">
                <div className="relative mb-2 group">
                    <input 
                        type="text" 
                        placeholder={t('searchPlaceholder')}
                        className="w-full bg-slate-800 border-2 border-military-600 rounded-full py-3 pl-14 pr-16 md:pr-32 text-white text-base focus:border-gold-500 focus:outline-none shadow-2xl placeholder-gray-500 transition-all focus:bg-slate-900"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={(e) => { if(e.key === 'Enter' && query) handleAISearch(); }}
                    />
                    <SearchIcon className="absolute left-5 top-3.5 text-gray-400 group-focus-within:text-gold-500 transition" size={20} />
                    
                    <button 
                        onClick={handleAISearch}
                        disabled={loadingAi}
                        className="absolute right-1.5 top-1.5 bg-gold-500 hover:bg-gold-600 disabled:bg-gray-700 text-black px-3 md:px-5 py-1.5 rounded-full flex items-center gap-2 transition shadow-lg font-bold"
                    >
                        {loadingAi ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div> : <Cpu size={18} />}
                        <span className="hidden md:inline text-xs md:text-sm">{t('analyze')}</span>
                    </button>
                </div>

                <div className="flex gap-2 pb-2 mb-1 px-1 overflow-x-auto scrollbar-hide snap-x">
                    {QUERY_TEMPLATES.map((tpl, idx) => (
                        <button 
                            key={idx}
                            onClick={() => setQuery(tpl)}
                            className="flex-none whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold-950/20 border border-gold-500/30 text-gold-300 text-[10px] md:text-xs font-bold hover:bg-gold-500 hover:text-black hover:border-gold-400 transition snap-start"
                        >
                            <Sparkles size={10} />
                            {tpl}
                        </button>
                    ))}
                </div>
                
                {/* Month Filter Indicator (Only shows when no query is typed) */}
                {!query && (
                    <div className="flex justify-center">
                        <span className="text-[10px] font-mono text-gold-500 bg-military-900/50 px-3 py-0.5 rounded-full border border-gold-500/20">
                            Filtering for: {ETHIOPIAN_MONTHS[parseInt(selectedMonth)-1]} {selectedYear}
                        </span>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* --- CONTENT: SEARCH --- */}
      {activeTab === 'search' && (
          <div className="animate-in fade-in max-w-full mx-auto flex-1 overflow-auto p-2 pb-20">
              {loadingAi && (
                  <div className="bg-slate-900 border border-gold-500/30 p-6 rounded-xl mb-6 flex flex-col items-center justify-center gap-3 animate-pulse">
                      <Cpu size={40} className="text-gold-500 animate-spin"/>
                      <p className="text-gold-300 font-mono text-sm">{t('processingNeuralAnalysis')}</p>
                  </div>
              )}
              
              {aiResponse && (
                  <div className="bg-slate-900/80 p-6 rounded-xl border border-gold-500/50 mb-8 shadow-2xl animate-in fade-in slide-in-from-top-4 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><Cpu size={100} className="text-gold-500"/></div>
                      <div className="flex justify-between items-start relative z-10 mb-4 border-b border-gold-900/50 pb-2">
                          <h3 className="text-gold-400 font-bold flex items-center gap-2 text-lg"><Cpu /> {t('aiIntelligenceReport')}</h3>
                          <button onClick={() => setAiResponse('')} className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded bg-black/20 hover:bg-red-900/50 transition">{t('dismiss')}</button>
                      </div>
                      <div className="text-gray-200 prose prose-invert max-w-none whitespace-pre-wrap font-mono text-sm leading-relaxed relative z-10 break-words">{aiResponse}</div>
                  </div>
              )}

              <div className="mb-2 text-gray-500 text-[10px] font-bold uppercase tracking-wider flex justify-between items-center px-1">
                  <span>{t('found')} {results.length} {t('records')}</span>
                  <span>{t('page')} {currentPage} {t('of')} {totalPages || 1}</span>
              </div>

              {/* COMPACT GRID LAYOUT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {paginatedResults.map((item: any) => {
                    const Icon = ICON_MAP[item.resultType] || SearchIcon;
                    return (
                        <div key={item.id} className={`bg-military-900/80 p-3 rounded-lg border-l-2 ${item.border} shadow-sm hover:bg-military-800 transition flex flex-col justify-between gap-2 group relative overflow-hidden h-full`}>
                            {/* Hover highlight */}
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none"></div>
                            
                            <div className="flex items-start gap-3 relative z-10">
                                <div className={`h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 ${item.color} shadow-inner border border-white/5`}>
                                    <Icon size={16} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1 mb-1 flex-wrap">
                                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-black/40 ${item.color} tracking-wider border border-white/5`}>
                                            {item.category}
                                        </span>
                                        <span className="text-gray-500 text-[9px] font-mono bg-black/20 px-1.5 py-0.5 rounded whitespace-nowrap">{formatEthiopianDate(item.date, language)}</span>
                                    </div>
                                    <h4 className="text-white font-bold text-sm leading-tight truncate" title={item.title}>{item.title}</h4>
                                    {item.subtitle && <p className="text-gray-400 text-[10px] mt-0.5 truncate" title={item.subtitle}>{item.subtitle}</p>}
                                </div>
                            </div>
                            
                            {item.value && (
                                <div className="relative z-10 pt-2 mt-auto border-t border-white/5">
                                    <div className="font-mono font-bold text-white text-xs bg-black/20 px-2 py-1 rounded text-center truncate border border-white/5">{item.value}</div>
                                </div>
                            )}
                        </div>
                    );
                })}
              </div>

                {results.length === 0 && !loadingAi && (
                    <div className="text-center text-gray-500 mt-10 py-16 bg-military-900/30 rounded-2xl border-2 border-dashed border-gray-700">
                        <SearchIcon size={64} className="mx-auto mb-6 opacity-20" />
                        <p className="text-lg font-bold text-gray-400">{t('noRecordsMatch')}</p>
                        <p className="text-sm mt-2">{t('adjustQueryHint')}</p>
                    </div>
                )}

              {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-4 mt-8 pb-8">
                      <button 
                        onClick={handlePrevPage} 
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-4 py-2 rounded-lg bg-military-800 text-white hover:bg-gold-500 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed transition font-bold text-xs"
                      >
                          <ChevronLeft size={16} /> {t('prev')}
                      </button>
                      
                      <div className="flex gap-2">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              // Simple logic to show window of pages
                              let pageNum = i + 1;
                              if (totalPages > 5 && currentPage > 3) {
                                  pageNum = currentPage - 2 + i;
                                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                              }
                              if (pageNum <= 0) return null;

                              return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition shadow-md ${
                                        currentPage === pageNum 
                                        ? 'bg-gold-500 text-black scale-110' 
                                        : 'bg-military-800 text-gray-400 hover:bg-military-700'
                                    }`}
                                >
                                    {pageNum}
                                </button>
                              );
                          }).filter(Boolean)}
                      </div>

                      <button 
                        onClick={handleNextPage} 
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 px-4 py-2 rounded-lg bg-military-800 text-white hover:bg-gold-500 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed transition font-bold text-xs"
                      >
                          {t('next')} <ChevronRight size={16} />
                      </button>
                  </div>
              )}
          </div>
      )}

      {/* --- CONTENT: MARKET TRENDS --- */}
      {activeTab === 'trends' && (
          <div className="animate-in slide-in-from-right max-w-4xl mx-auto flex-1 overflow-auto">
              <div className="bg-military-800 p-6 rounded-2xl shadow-xl border border-military-700 mb-8 relative z-20">
                  <h3 className="text-gold-500 font-bold mb-4 uppercase tracking-wider text-sm flex items-center gap-2"><BarChart2 size={16}/> {t('trendAnalysisSelector')}</h3>
                  <CustomSelect 
                    value={trendItem}
                    onChange={(val) => setTrendItem(val)}
                    options={uniqueMarketItems}
                    placeholder={t('chooseItemAnalyze')}
                    className="text-lg"
                  />
              </div>

              {trendItem && trendData.length > 0 && (
                  <div className="bg-slate-900 border border-military-700 rounded-2xl p-6 shadow-2xl h-[550px] flex flex-col relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><LineChartIcon size={200} className="text-white"/></div>
                      <div className="flex justify-between items-center mb-6 relative z-10 border-b border-gray-800 pb-4">
                          <div>
                              <h4 className="text-white font-bold text-2xl flex items-center gap-3">{trendItem}</h4>
                              <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">{t('volatilityOverTime')}</p>
                          </div>
                          <div className="text-right">
                              <span className="block text-gold-500 font-mono text-2xl font-bold">{trendData[trendData.length-1].price} {t('birr')}</span>
                              <span className="text-xs text-gray-500 uppercase">{t('currentPrice')}</span>
                          </div>
                      </div>
                      <div className="flex-1 w-full relative z-10">
                          <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={trendData} margin={{top: 10, right: 30, left: 0, bottom: 0}}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                  <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 10}} dy={10} />
                                  <YAxis stroke="#94a3b8" tick={{fontSize: 12}} />
                                  <RechartsTooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#d4af37', color: '#fff', borderRadius: '8px' }}
                                    formatter={(value: any) => [`${value} ${t('birr')}`, t('singlePrice')]}
                                    cursor={{stroke: '#d4af37', strokeWidth: 1, strokeDasharray: '4 4'}}
                                  />
                                  <Legend wrapperStyle={{paddingTop: '20px'}}/>
                                  <Line type="monotone" dataKey="price" stroke="#ef4444" strokeWidth={3} activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} dot={{fill: '#ef4444'}} name={`${t('price')} (${t('birr')})`} />
                              </LineChart>
                          </ResponsiveContainer>
                      </div>
                      
                      {/* Vertical Date Display */}
                      <div className="mt-6 flex flex-col gap-2 text-xs text-gray-500 bg-black/20 p-3 rounded-lg border border-gray-800">
                          <span>{t('firstRecorded')}: <strong className="text-gray-300">{trendData[0].date}</strong></span>
                          <span>{t('lastRecorded')}: <strong className="text-gray-300">{trendData[trendData.length-1].date}</strong></span>
                      </div>
                  </div>
              )}

              {trendItem && trendData.length === 0 && (
                  <div className="text-center p-12 text-gray-500 border border-dashed border-gray-700 rounded-2xl bg-military-900/30">
                      {t('noPriceHistory')}
                  </div>
              )}
              
              {!trendItem && (
                   <div className="text-center p-20 text-gray-600 border-2 border-dashed border-gray-700 rounded-2xl bg-military-900/20 flex flex-col items-center justify-center">
                       <LineChartIcon size={64} className="mb-4 opacity-30" />
                       <p className="text-lg font-bold">{t('selectItemVisualize')}</p>
                       <p className="text-sm mt-2">{t('costFluctuationHint')}</p>
                   </div>
              )}
          </div>
      )}

      {/* --- CONTENT: AI CHAT ASSISTANT --- */}
      {activeTab === 'chat' && (
          <div className="fixed inset-0 z-[200] w-full h-[100dvh] bg-slate-950 flex flex-col md:relative md:h-[calc(100vh-200px)] md:w-full md:max-w-5xl md:mx-auto md:bg-transparent md:z-auto animate-in fade-in slide-in-from-right">
              <div className="flex items-center justify-between bg-slate-900 border border-gold-500/30 p-4 rounded-none md:rounded-t-2xl">
                  <div className="flex items-center gap-3">
                      <button onClick={() => setActiveTab('search')} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white rounded-full active:bg-white/10">
                          <ChevronLeft size={24} />
                      </button>
                      <div className="p-2 bg-gold-500 rounded-full text-black shadow-lg">
                          <Bot size={24} />
                      </div>
                      <div>
                          <h3 className="text-white font-bold text-lg">ARMS {t('aiAssistant')}</h3>
                          <p className="text-xs text-gold-500 font-mono">{t('onlineReady')}</p>
                      </div>
                  </div>
                  <button onClick={handleResetChat} className="p-2 text-gray-400 hover:text-red-400 transition" title={t('resetChat')}>
                      <RefreshCcw size={18} />
                  </button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 bg-slate-950 border-x-0 md:border-x border-gold-500/30 p-6 overflow-y-auto custom-scrollbar space-y-6">
                  {chatHistory.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-60 text-center">
                          <Bot size={64} className="mb-4" />
                          <p className="text-lg font-bold">{t('howCanIHelp')}</p>
                          <p className="text-sm">{t('askAbout')}</p>
                      </div>
                  )}
                  
                  {chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-xl relative group ${
                              msg.role === 'user' 
                              ? 'bg-gold-500 text-black rounded-tr-none' 
                              : 'bg-slate-800 text-gray-200 rounded-tl-none border border-gray-700'
                          }`}>
                              <div className={`absolute -top-3 ${msg.role === 'user' ? '-right-2' : '-left-2'} p-1.5 rounded-full ${msg.role === 'user' ? 'bg-black text-gold-500' : 'bg-gold-500 text-black'} shadow-sm`}>
                                  {msg.role === 'user' ? <UserIcon size={12}/> : <Bot size={12}/>}
                              </div>
                              
                              <div className="text-sm leading-relaxed overflow-hidden">
                                  {msg.role === 'model' ? (
                                      <div 
                                        className="prose prose-invert prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: msg.content }} 
                                      />
                                  ) : (
                                      msg.content
                                  )}
                              </div>
                              <div className={`text-[10px] mt-2 opacity-50 font-mono text-right ${msg.role === 'user' ? 'text-black' : 'text-gray-400'}`}>
                                  {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </div>
                          </div>
                      </div>
                  ))}
                  
                  {isTyping && (
                      <div className="flex justify-start w-full">
                          <div className="bg-slate-800 border border-gray-700 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                              <div className="w-2 h-2 bg-gold-500 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gold-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                              <div className="w-2 h-2 bg-gold-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                          </div>
                      </div>
                  )}
                  <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="bg-slate-900 border border-gold-500/30 border-t-0 border-x-0 md:border-x md:border-b p-4 rounded-none md:rounded-b-2xl">
                  <form onSubmit={handleChatSubmit} className="relative flex items-center gap-2">
                      <input 
                          type="text" 
                          className="flex-1 min-w-0 bg-black/40 border border-gray-600 rounded-full py-3 pl-6 pr-4 text-white focus:border-gold-500 outline-none transition"
                          placeholder={t('typeQuestion')}
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          disabled={isTyping}
                      />
                      <button 
                          type="submit" 
                          disabled={!chatInput.trim() || isTyping}
                          className="shrink-0 bg-gold-500 hover:bg-gold-600 disabled:bg-gray-700 disabled:text-gray-500 text-black p-3 rounded-full shadow-lg transition transform active:scale-95 flex items-center justify-center"
                      >
                          <Send size={20} />
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Search;
