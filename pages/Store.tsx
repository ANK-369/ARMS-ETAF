
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { addItem, getDB, updateItem, saveDB, deleteItem, smartUpsertItem, processStoreOrder, processRationDeduction, findPotentialMatch } from '../services/db';
import { getCurrentEthiopianDate, ETHIOPIAN_MONTHS, ETHIOPIAN_MONTHS_AMHARIC, isActiveDate, formatEthiopianDate } from '../services/ethiopianDate';
import { Package, ShoppingBag, ArrowRightLeft, List, CheckCircle, Plus, Archive, Edit, Save, Trash2, ShoppingCart, Printer, History, ChevronDown, ChevronUp, ChevronRight, AlertCircle, CheckSquare, X, Download, Cpu, Zap, ShoppingBasket, BarChart3, RefreshCw, ChefHat, Info, Utensils, ClipboardCheck, ArrowRight, Eye, Sparkles, AlertTriangle, Calendar } from 'lucide-react';
import DataTools from '../components/DataTools';
import { AppData, FoodProgramEntry, ProgramSettings, StoreOrder, LogisticsAnalysis, MealIngredient, MealIngredientsMap, RationLog, MEASUREMENT_OPTIONS } from '../types';
import CustomSelect from '../components/CustomSelect';
import SmartInput from '../components/SmartInput';
import ConfirmDialog from '../components/ConfirmDialog';
import DuplicateResolutionModal from '../components/DuplicateResolutionModal';
import { performLogisticsAnalysis } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { useDate } from '../contexts/DateContext';
import EthiopianDatePicker from '../components/EthiopianDatePicker';

// --- EXTRACTED COMPONENT: PROGRAM PAPER ---
interface ProgramPaperProps {
    settings: ProgramSettings;
    program: FoodProgramEntry[];
    isEditing: boolean;
    onEdit: (id: string, field: string, val: string) => void;
    onRecipe: (day: string) => void;
    onRation: (day: string) => void;
}

const ProgramPaper: React.FC<ProgramPaperProps> = ({ settings, program, isEditing, onEdit, onRecipe, onRation }) => {
    const { t, language } = useLanguage();

    return (
        <div className="bg-white text-black shadow-2xl mx-auto rounded-none print:shadow-none print:w-full print:max-w-none w-[210mm] min-w-[210mm] min-h-[297mm] p-4 md:p-[20mm] print-area relative flex-shrink-0 flex flex-col">
          
          <div className="flex-1">
              <div className="text-center border-b-4 border-double border-black pb-4 mb-6">
                  <h1 className="text-3xl font-black uppercase tracking-widest font-serif text-black">{settings.title}</h1>
                  <h2 className="text-lg font-bold uppercase tracking-wide mt-2 text-black">{settings.subtitle}</h2>
              </div>
              
              <table className="w-full border-collapse border-2 border-black text-base md:text-lg">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="border border-black p-3 md:p-4 w-32 uppercase font-black text-black">{t('day')}</th>
                            <th className="border border-black p-3 md:p-4 uppercase font-black text-black">{t('breakfast')}</th>
                            <th className="border border-black p-3 md:p-4 uppercase font-black text-black">{t('lunch')}</th>
                            <th className="border border-black p-3 md:p-4 uppercase font-black text-black">{t('dinner')}</th>
                            {isEditing && (
                                <th className="border border-black p-3 md:p-4 w-24 uppercase font-black text-black print:hidden no-print">{t('action')}</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {program.map((row) => (
                            <tr key={row.id}>
                                <td className="border border-black p-3 md:p-4 font-black uppercase bg-gray-50 text-black align-middle">{t(row.day)}</td>
                                {['breakfast', 'lunch', 'dinner'].map((meal) => (
                                    <td key={meal} className="border border-black p-0 relative group h-full align-middle">
                                        {isEditing ? (
                                            <textarea 
                                                className="w-full h-full p-3 md:p-4 resize-none outline-none bg-yellow-50 focus:bg-white text-black text-center text-base md:text-lg font-medium leading-relaxed"
                                                // @ts-ignore
                                                value={row[meal]}
                                                onChange={(e) => onEdit(row.id, meal, e.target.value)}
                                                rows={2}
                                            />
                                        ) : (
                                            <div className="p-3 md:p-4 min-h-[60px] whitespace-pre-wrap text-black font-medium text-center text-base md:text-lg flex items-center justify-center h-full">{
                                                // @ts-ignore
                                                row[meal]}</div>
                                        )}
                                    </td>
                                ))}
                                {isEditing && (
                                    <td className="border border-black p-2 text-center print:hidden no-print bg-gray-5 align-middle">
                                        <div className="flex flex-col gap-1 justify-center items-center h-full">
                                            <button onClick={() => onRecipe(row.day)} className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 flex items-center justify-center gap-1 font-bold w-full" title={t('dailyRecipe')}>
                                                <ChefHat size={12}/> {t('recipe')}
                                            </button>
                                            <button onClick={() => onRation(row.day)} className="text-[10px] bg-gold-500 text-black px-2 py-1 rounded hover:bg-gold-600 flex items-center justify-center gap-1 font-bold w-full" title={t('issueRation')}>
                                                <Utensils size={12}/> {t('issue')}
                                            </button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>

              {/* FOOTER */}
              <div className="mt-24 print:mt-10 flex justify-between font-serif text-black">
                  <div className="text-center w-1/3">
                      <div className="border-b-2 border-black mb-2 pb-1"></div>
                      <p className="font-bold uppercase text-sm">{settings.footerLeft}</p>
                  </div>
                  <div className="text-center w-1/3">
                      <div className="border-b-2 border-black mb-2 pb-1"></div>
                      <p className="font-bold uppercase text-sm">{settings.footerRight}</p>
                  </div>
              </div>
          </div>

          <div className="text-[10px] text-gray-500 text-right mt-8 print:block print:mt-auto pt-8 print-footer-date">
              {t('generatedOn')} {formatEthiopianDate(getCurrentEthiopianDate(), language)}, {new Date().toLocaleTimeString()}
          </div>
      </div>
    );
}

const Store: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'items' | 'order' | 'transfer' | 'program' | 'logistics'>('items');
  const [msg, setMsg] = useState('');
  const [forceUpdate, setForceUpdate] = useState(0);
  const [dbData, setDbData] = useState<AppData>(getDB());
  const { t, language } = useLanguage();
  const { month: selectedMonth, year: selectedYear } = useDate();

  const [dupModal, setDupModal] = useState<{isOpen: boolean, reason: string, item: any}>({ isOpen: false, reason: '', item: null });

  const [showFullHistory, setShowFullHistory] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [showTransferHistory, setShowTransferHistory] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
      isOpen: boolean;
      title: string;
      message: React.ReactNode;
      onConfirm: () => void;
      isDanger: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, isDanger: false });

  const [receiveModal, setReceiveModal] = useState<{
      isOpen: boolean;
      order: StoreOrder | null;
      receivedAmount: string;
      unitPrice: string;
  }>({ isOpen: false, order: null, receivedAmount: '', unitPrice: '' });

  const [recipeModal, setRecipeModal] = useState<{
      isOpen: boolean;
      day: string;
      baseManpower: number;
      ingredients: MealIngredient[];
  }>({ isOpen: false, day: '', baseManpower: 0, ingredients: [] });

  const [newIngredient, setNewIngredient] = useState({ itemName: '', totalAmount: '', unit: '' });

  const [rationModal, setRationModal] = useState<{
      isOpen: boolean;
      day: string;
      manpower: number;
      calculatedItems: {name: string, amount: number, unit: string}[];
  }>({ isOpen: false, day: '', manpower: 0, calculatedItems: [] });

  const [showPrintModal, setShowPrintModal] = useState(false);
  
  // Archive Modal State
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveName, setArchiveName] = useState('');
  const [doArchive, setDoArchive] = useState(false);

  const [itemForm, setItemForm] = useState({ 
      name: '', measurement: '', amount: '' as any, 
      singlePrice: '' as any, description: '', 
      day: '01', month: '01', year: '2016' 
  });
  
  const [orderCart, setOrderCart] = useState<any[]>([]);
  const [orderForm, setOrderForm] = useState({ 
      itemName: '', amount: '' as any, measurement: '', buyerName: '',
      description: '', day: '01', month: '01', year: '2016' 
  });

  const [transferForm, setTransferForm] = useState({ 
      name: '', measurement: '', amount: '' as any, 
      singlePrice: '' as any, description: '', 
      fromMonth: '', toMonth: '',
      day: '01', month: '01', year: '2016'
  });

  const [foodProgram, setFoodProgram] = useState<FoodProgramEntry[]>(dbData.foodProgram || []);
  const [mealIngredients, setMealIngredients] = useState<MealIngredientsMap>(dbData.mealIngredients || {});
  
  const [programSettings, setProgramSettings] = useState<ProgramSettings>({
      title: 'ሳምንታዊ የምግብ ፕሮግራም',
      subtitle: 'የኢትዮጵያ አየር ኃይል - ሎጅስቲክስ ኮማንድ',
      footerLeft: 'ያዘጋጀው',
      footerRight: 'ያጸደቀው'
  });
  const [isEditingProgram, setIsEditingProgram] = useState(false);

  const [manpowerCount, setManpowerCount] = useState<number>(0);
  const [aiAnalysis, setAiAnalysis] = useState<LogisticsAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Helper to filter by global month context
  const isSelectedDate = (dateString: string) => {
      if (!dateString) return false;
      const parts = dateString.split('-');
      if (parts.length < 2) return false;
      return parts[0] === selectedYear && parts[1] === selectedMonth;
  };

  useEffect(() => {
    const db = getDB();
    setDbData(db);
    if (db.programSettings) setProgramSettings(db.programSettings);
    if (db.mealIngredients) setMealIngredients(db.mealIngredients);
    
    // Automatic Manpower Count Logic
    const currentEth = getCurrentEthiopianDate();
    const [currY, currM, currD] = currentEth.split('-');
    
    // Logic: Is selected month in the Future?
    // Compare YYYY-MM selected vs YYYY-MM current
    const selY = parseInt(selectedYear);
    const selM = parseInt(selectedMonth);
    const curYInt = parseInt(currY);
    const curMInt = parseInt(currM);
    
    const isFutureMonth = (selY > curYInt) || (selY === curYInt && selM > curMInt);
    
    const currentDay = parseInt(currD) || 30;
    
    // Count active manpower
    const activeManpower = db.manpower.filter(m => {
        // 1. Month Overlap Check (Common for both Present and Future)
        const mStart = `${selectedYear}-${selectedMonth}-01`;
        const mEnd = `${selectedYear}-${selectedMonth}-30`;
        const inMonth = m.startDate <= mEnd && m.endDate >= mStart;
        if (!inMonth) return false;

        // 2. FUTURE MONTH: If we are planning for the future, count EVERYONE who overlaps.
        // Do NOT clamp by "Today's" date number, because today's date doesn't apply to future months.
        if (isFutureMonth) return true;

        // 3. CURRENT/PAST MONTH: Clamp by effective day range to show precise status.
        const [sY, sM, sD] = m.startDate.split('-');
        const [eY, eM, eD] = m.endDate.split('-');

        let startDay = 1;
        let endDay = 30;

        // If manpower starts IN the selected month, respect start day
        if (sY === selectedYear && sM === selectedMonth) {
            startDay = parseInt(sD);
        } else if (m.startDate > mStart) {
            startDay = 31; // Starts after this month? (Already filtered by overlap, but safety)
        }

        // If manpower ends IN the selected month, respect end day
        if (eY === selectedYear && eM === selectedMonth) {
            endDay = parseInt(eD);
        } else if (m.endDate < mEnd) {
            endDay = 0; // Ends before this month?
        }

        return currentDay >= startDay && currentDay <= endDay;
    }).length; 
    
    setManpowerCount(activeManpower);

  }, [activeTab, forceUpdate, selectedMonth, selectedYear]);

  // Sync internal forms with selected global date for convenience
  useEffect(() => {
      if (selectedYear && selectedMonth) {
          const defaultDay = '01';
          setItemForm(p => ({ ...p, year: selectedYear, month: selectedMonth, day: defaultDay }));
          setOrderForm(p => ({ ...p, year: selectedYear, month: selectedMonth, day: defaultDay }));
          setTransferForm(p => ({ ...p, year: selectedYear, month: selectedMonth, day: defaultDay }));
      }
  }, [selectedYear, selectedMonth]);

  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!itemForm.amount || !itemForm.singlePrice) return;
    const constructedDate = `${itemForm.year}-${itemForm.month}-${itemForm.day}`;
    const itemToSave = { 
        id: Math.random().toString(36).substr(2, 9), 
        category: 'inventory',
        name: itemForm.name,
        measurement: itemForm.measurement,
        amount: Number(itemForm.amount),
        singlePrice: Number(itemForm.singlePrice),
        description: itemForm.description,
        date: constructedDate
    };
    const check = findPotentialMatch('storeItems', itemToSave);
    if (check.found) { setDupModal({ isOpen: true, reason: check.reason, item: itemToSave }); return; }
    saveStoreItem(itemToSave, false);
  };

  const saveStoreItem = (item: any, forceNew: boolean) => {
      smartUpsertItem('storeItems', item, forceNew);
      setMsg(t('itemAddedMsg'));
      setItemForm(p => ({ ...p, name: '', amount: '', singlePrice: '', description: '' }));
      setForceUpdate(p => p + 1);
      setTimeout(() => setMsg(''), 3000);
      setDupModal({ isOpen: false, reason: '', item: null });
  };

  const handleDeleteItem = (id: string) => {
    setConfirmDialog({
        isOpen: true, title: t('confirm'), message: t('deleteItemConfirm'), isDanger: true,
        onConfirm: () => { deleteItem('storeItems', id); setConfirmDialog(prev => ({...prev, isOpen: false})); setForceUpdate(p => p + 1); }
    });
  };

  const addToCart = () => {
    if(!orderForm.itemName || !orderForm.amount) return;
    setOrderCart([...orderCart, { ...orderForm, id: Math.random().toString(36), amount: Number(orderForm.amount) }]);
    setOrderForm(prev => ({ ...prev, itemName: '', amount: '', measurement: '', description: '', buyerName: prev.buyerName })); 
  };

  const removeFromCart = (id: string) => { setOrderCart(orderCart.filter(item => item.id !== id)); };

  const submitOrderCart = () => {
    if (orderCart.length === 0) return;
    orderCart.forEach(item => {
        const constructedDate = `${item.year}-${item.month}-${item.day}`;
        addItem('storeOrders', {
            id: Math.random().toString(36).substr(2, 9), status: 'Pending', itemName: item.itemName, buyerName: item.buyerName,
            amount: Number(item.amount), measurement: item.measurement, description: item.description, date: constructedDate
        });
    });
    setMsg(t('ordersSubmittedMsg'));
    setOrderCart([]);
    setForceUpdate(p => p + 1);
    setTimeout(() => setMsg(''), 3000);
  };

  const openReceiveModal = (order: StoreOrder) => {
      setReceiveModal({ isOpen: true, order: order, receivedAmount: order.amount.toString(), unitPrice: '' });
  };

  const submitReceive = () => {
      if (!receiveModal.order || !receiveModal.receivedAmount || !receiveModal.unitPrice) return;
      const actualQty = Number(receiveModal.receivedAmount);
      const price = Number(receiveModal.unitPrice);
      const result = processStoreOrder(receiveModal.order.id, actualQty, price);
      setReceiveModal({ isOpen: false, order: null, receivedAmount: '', unitPrice: '' });
      setMsg(result.msg);
      setForceUpdate(p => p + 1);
      setTimeout(() => setMsg(''), 4000);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!transferForm.amount || !transferForm.singlePrice || !transferForm.fromMonth || !transferForm.toMonth) return;
    
    // UPDATED: Use the explicit date selected in the transfer form
    const dateRecord = `${transferForm.year}-${transferForm.month}-${transferForm.day}`;
    
    const transferDesc = `From ${transferForm.fromMonth} To ${transferForm.toMonth}. ${transferForm.description}`;
    smartUpsertItem('storeItems', { 
        id: Math.random().toString(36).substr(2, 9), category: 'transfer', name: transferForm.name, measurement: transferForm.measurement,
        amount: Number(transferForm.amount), singlePrice: Number(transferForm.singlePrice), description: transferDesc, date: dateRecord
    });
    setMsg(t('transferSavedMsg'));
    // Reset but keep date/months for rapid entry
    setTransferForm(p => ({ ...p, name: '', measurement: '', amount: '', singlePrice: '', description: '' }));
    setForceUpdate(p => p + 1);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleProgramCellEdit = (id: string, field: string, val: string) => {
    if (!isEditingProgram) return;
    const updated = foodProgram.map((p) => p.id === id ? { ...p, [field]: val } : p);
    setFoodProgram(updated);
  };

  const handleProgramSave = () => {
      const db = getDB();
      db.foodProgram = foodProgram;
      db.programSettings = programSettings;

      if (doArchive) {
          const archiveEntry = {
              id: Math.random().toString(36).substr(2, 9),
              archivedDate: getCurrentEthiopianDate(),
              name: archiveName || `${t('generated')} ${getCurrentEthiopianDate()}`,
              program: JSON.parse(JSON.stringify(foodProgram)) // Deep copy
          };
          if (!db.foodProgramArchive) db.foodProgramArchive = [];
          db.foodProgramArchive.unshift(archiveEntry);
      }

      saveDB(db);
      setIsEditingProgram(false);
      setShowArchiveModal(false);
      setMsg(t('programSavedMsg'));
      setForceUpdate(p => p + 1);
      setTimeout(() => setMsg(''), 3000); // Fixed timeout
      
      // Reset Archive Form
      setDoArchive(false);
      setArchiveName('');
  };

  const handlePrint = () => window.print();

  const openRecipeEditor = (day: string) => {
      const key = day;
      const existing = mealIngredients[key] || [];
      const baseM = existing.length > 0 ? existing[0].baseManpower : manpowerCount;
      setRecipeModal({ isOpen: true, day: day, baseManpower: baseM, ingredients: JSON.parse(JSON.stringify(existing)) });
  };

  const addIngredientToRecipe = () => {
      if (!newIngredient.itemName || !newIngredient.totalAmount) return;
      const ing: MealIngredient = { id: Math.random().toString(36).substr(2, 9), itemName: newIngredient.itemName, totalAmount: Number(newIngredient.totalAmount), baseManpower: recipeModal.baseManpower, unit: newIngredient.unit };
      setRecipeModal(prev => ({ ...prev, ingredients: [...prev.ingredients, ing] }));
      setNewIngredient({ itemName: '', totalAmount: '', unit: '' });
  };

  const removeIngredientFromRecipe = (id: string) => { setRecipeModal(prev => ({ ...prev, ingredients: prev.ingredients.filter(i => i.id !== id) })); };

  const saveRecipe = () => {
      const finalIngredients = recipeModal.ingredients.map(i => ({...i, baseManpower: recipeModal.baseManpower}));
      
      const newMap = { ...mealIngredients, [recipeModal.day]: finalIngredients };
      setMealIngredients(newMap);
      
      // Persist to DB
      const db = getDB();
      db.mealIngredients = newMap;
      saveDB(db);

      setRecipeModal({ isOpen: false, day: '', baseManpower: 0, ingredients: [] });
      setMsg(t('recipeSavedMsg'));
      setForceUpdate(p => p + 1);
      setTimeout(() => setMsg(''), 3000);
  };

  const openRationModal = (day: string) => {
      const ingredients = mealIngredients[day] || [];
      if (ingredients.length === 0) { 
          setMsg(`No recipe defined for ${day}. Please Add Recipe first.`); 
          setTimeout(() => setMsg(''), 3000);
          return; 
      }
      const items = ingredients.map(ing => {
          const required = (ing.totalAmount / (ing.baseManpower || 1)) * manpowerCount;
          return { name: ing.itemName, amount: parseFloat(required.toFixed(2)), unit: ing.unit };
      });
      setRationModal({ isOpen: true, day, manpower: manpowerCount, calculatedItems: items });
  };

  const updateRationAmount = (index: number, val: number) => {
      const updated = [...rationModal.calculatedItems];
      updated[index].amount = val;
      setRationModal(prev => ({...prev, calculatedItems: updated}));
  };

  const confirmRationDeduction = () => {
      const result = processRationDeduction(rationModal.day, rationModal.manpower, rationModal.calculatedItems);
      setRationModal({ isOpen: false, day: '', manpower: 0, calculatedItems: [] });
      setMsg(result.msg);
      setForceUpdate(p => p + 1);
      setTimeout(() => setMsg(''), 4000);
  };

  const runLogisticsAnalysis = async (generateMenu: boolean) => {
      if (manpowerCount <= 0) { 
          setMsg(t('manpowerError')); 
          setTimeout(() => setMsg(''), 3000);
          return; 
      }
      setIsAnalyzing(true);
      setAiAnalysis(null);
      const inventory = dbData.storeItems.filter(i => i.category === 'inventory');
      try {
          const result = await performLogisticsAnalysis(foodProgram, inventory, manpowerCount, mealIngredients, generateMenu, language);
          if (result) { 
              setAiAnalysis(result); 
              if (result.optimizedMenu && generateMenu) { 
                  setMsg(t('aiMenuApplied')); 
                  setTimeout(() => setMsg(''), 3000);
              } 
          } else { 
              setMsg(t('analysisFailed')); 
              setTimeout(() => setMsg(''), 3000);
          }
      } catch (err: any) {
          console.error("Logistics AI error:", err);
          const errMsg = err?.message || String(err);
          const localizedPrefix = language === 'am' 
              ? "የሎጅስቲክስ ትንተና አልተሳካም፦ " 
              : "Logistics Analysis Failed: ";
          setMsg(localizedPrefix + errMsg);
          setTimeout(() => setMsg(''), 6000);
      }
      setIsAnalyzing(false);
  };

  const applyOptimizedMenu = () => {
      if (aiAnalysis?.optimizedMenu) {
          setFoodProgram(aiAnalysis.optimizedMenu);
          setIsEditingProgram(true); 
          setMsg(t('aiMenuApplied'));
          setTimeout(() => setMsg(''), 3000);
          setActiveTab('program'); 
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const addRecommendationToOrder = (rec: {itemName: string, amountToBuy: number, unit: string}) => {
      const parts = getCurrentEthiopianDate().split('-');
      setOrderCart([...orderCart, {
          id: Math.random().toString(36), itemName: rec.itemName, amount: rec.amountToBuy, measurement: rec.unit, description: t('aiShortageFillerNote'),
          day: parts[2] || '01', month: parts[1] || '01', year: parts[0] || '2016'
      }]);
      setMsg(t('addedToCart').replace('{item}', rec.itemName));
      setTimeout(() => setMsg(''), 2000);
      setActiveTab('order');
  };

  // --- FILTERED DATA GETTERS ---
  const getInventoryData = () => {
    // STRICT FILTER: Category 'inventory' AND Selected Date Match
    const allInventory = dbData.storeItems.filter(i => i.category === 'inventory' && isSelectedDate(i.date));
    allInventory.sort((a, b) => b.date.localeCompare(a.date));
    const uniqueDates = Array.from(new Set(allInventory.map(i => i.date)));
    const recentDates = uniqueDates.slice(0, 3);
    const recentItems = allInventory.filter(i => recentDates.includes(i.date));
    return { allInventory, recentItems };
  };

  const getOrderData = () => {
      // STRICT FILTER: Selected Date Match
      const orders = dbData.storeOrders.filter(o => isSelectedDate(o.date));
      return {
          pending: orders.filter(o => o.status === 'Pending'),
          completed: orders.filter(o => o.status === 'Completed')
      };
  };

  const getTransferData = () => {
      // STRICT FILTER: Category 'transfer' AND Selected Date Match
      return dbData.storeItems.filter(i => i.category === 'transfer' && isSelectedDate(i.date));
  };

  // --- GET FILTERED RATION HISTORY ---
  const getRationHistory = () => {
      return (dbData.rationHistory || []).filter(log => isSelectedDate(log.dateExecuted));
  };

  const { allInventory, recentItems } = getInventoryData();
  const { pending: pendingOrders, completed: completedOrders } = getOrderData();
  const filteredTransfers = getTransferData();
  const filteredRationHistory = getRationHistory();
  
  // Date Selector Logic
  const DateSelectors = ({ form, setForm }: any) => {
      const year = parseInt(form.year) || 2016;
      const month = parseInt(form.month) || 1;
      let maxDays = 30;
      if (month === 13) { maxDays = (year % 4 === 3) ? 6 : 5; }
      const days = Array.from({length: maxDays}, (_, i) => (i+1).toString().padStart(2, '0'));
      const monthOptions = ETHIOPIAN_MONTHS.map((m, i) => ({ value: (i+1).toString().padStart(2,'0'), label: language === 'am' ? ETHIOPIAN_MONTHS_AMHARIC[i] : m }));
      const years = Array.from({length: 51}, (_, i) => (2000 + i).toString());
      const handleMonthChange = (val: string) => {
          const newM = parseInt(val);
          let newMax = 30;
          if (newM === 13) { newMax = (year % 4 === 3) ? 6 : 5; }
          let newDay = form.day;
          if (parseInt(newDay) > newMax) { newDay = newMax.toString().padStart(2, '0'); }
          setForm({...form, month: val, day: newDay});
      };
      
      return (
          <div className="flex gap-4 mb-4">
              <div className="w-1/4">
                  <label className="text-xs text-gray-400 block mb-1 font-bold uppercase">{t('day')}</label>
                  <CustomSelect value={form.day} onChange={(val) => setForm({...form, day: val})} options={days} />
              </div>
              <div className="w-1/3">
                  <label className="text-xs text-gray-400 block mb-1 font-bold uppercase">{t('month')}</label>
                  <CustomSelect value={form.month} onChange={handleMonthChange} options={monthOptions} />
              </div>
              <div className="flex-1">
                   <label className="text-xs text-gray-400 block mb-1 font-bold uppercase">{t('year')}</label>
                   <CustomSelect value={form.year} onChange={(val) => setForm({...form, year: val})} options={years} />
              </div>
          </div>
      )
  };

  const InputClass = "w-full bg-slate-800 border border-military-700 rounded-lg p-3 text-white focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition mb-4 placeholder-gray-600";
  const LabelClass = "block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2";

  const Tabs = [
      { id: 'items', label: t('itemList'), icon: Package },
      { id: 'order', label: t('orders'), icon: ShoppingBag },
      { id: 'transfer', label: t('transfers'), icon: ArrowRightLeft },
      { id: 'program', label: t('foodProgram'), icon: List },
      { id: 'logistics', label: t('logisticsAi'), icon: Zap }
  ];

  return (
    <div className="max-w-5xl mx-auto pb-12 relative">
       {/* ... Duplicate Resolution Modal, Success Msg, Print Modal ... */}
       <DuplicateResolutionModal 
        isOpen={dupModal.isOpen}
        matchReason={dupModal.reason}
        onMerge={() => saveStoreItem(dupModal.item, false)}
        onCreateNew={() => saveStoreItem(dupModal.item, true)}
        onCancel={() => setDupModal({isOpen: false, reason: '', item: null})}
       />

       {msg && (
        <div className="fixed top-10 left-1/2 transform -translate-x-1/2 z-[200] w-[90%] max-w-md animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-green-900/90 border-l-4 border-green-500 text-white p-4 rounded-r-lg shadow-2xl backdrop-blur-md flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-green-500/20 p-2 rounded-full"><CheckCircle size={24} className="text-green-400" /></div>
                    <div><h4 className="font-bold text-lg">{t('successTitle')}</h4><p className="text-sm text-green-200">{msg}</p></div>
                </div>
            </div>
        </div>
       )}

       {showPrintModal && createPortal(
          <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center print-modal-content print-preview-modal animate-in zoom-in-95 duration-200">
              <div className="w-full bg-military-900 border-b border-gold-500 p-4 flex justify-between items-center no-print shrink-0">
                  <h2 className="text-gold-500 font-bold text-xl flex items-center gap-2"><Printer size={24}/> {t('printMode')}</h2>
                  <div className="flex gap-3">
                      <button onClick={() => setShowPrintModal(false)} className="px-4 py-2 text-gray-400 hover:text-white font-bold rounded-lg border border-gray-600 hover:bg-white/10 transition">{t('cancel')}</button>
                      <button onClick={handlePrint} className="px-6 py-2 bg-gold-500 hover:bg-gold-600 text-black font-bold rounded-lg shadow-lg transition flex items-center gap-2"><Printer size={18}/> {t('print')}</button>
                  </div>
              </div>
              <div className="flex-1 w-full overflow-auto bg-gray-800 print-hide-scroll">
                  <div className="min-h-full min-w-full w-fit flex items-center justify-center p-4 md:p-8 print:p-0 print:min-h-0 print:w-full print:block">
                      <div id="printable-audit-report">
                          <ProgramPaper settings={programSettings} program={foodProgram} isEditing={false} onEdit={()=>{}} onRecipe={()=>{}} onRation={()=>{}} />
                      </div>
                  </div>
              </div>
          </div>,
          document.body
       )}

       {/* --- NEW ARCHIVE MODAL --- */}
       {showArchiveModal && (
          <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
               <div className="bg-slate-900 border border-green-500 rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
                   <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2 border-b border-gray-700 pb-2">
                       <Save size={24} className="text-green-500"/> {t('saveConfig')}
                   </h3>
                   
                   <p className="text-gray-300 text-sm mb-6">{t('saveProgramConfirm')}</p> 
                   
                   <div className="bg-military-800 p-4 rounded-lg border border-gray-700 mb-6">
                       <label className="flex items-center gap-3 cursor-pointer mb-4">
                           <input type="checkbox" className="w-5 h-5 rounded accent-green-500" checked={doArchive} onChange={e => setDoArchive(e.target.checked)} />
                           <span className="text-white font-bold text-sm">{t('archiveThisVersion')}</span>
                       </label>
                       
                       {doArchive && (
                           <input 
                               type="text" 
                               className="w-full bg-slate-900 border border-gray-600 rounded p-3 text-white text-sm focus:border-green-500 outline-none transition"
                               placeholder={t('archiveNamePlaceholder')}
                               value={archiveName}
                               onChange={e => setArchiveName(e.target.value)}
                               autoFocus
                           />
                       )}
                   </div>

                   <div className="flex gap-3">
                       <button onClick={() => setShowArchiveModal(false)} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold">{t('cancel')}</button>
                       <button onClick={handleProgramSave} className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold shadow-lg">{t('confirm')}</button>
                   </div>
               </div>
          </div>
       )}

       {/* Modals: Receive, Recipe, Ration (Keep identical structure but use state) */}
       {/* ... Receive Modal ... */}
       {receiveModal.isOpen && receiveModal.order && (
           <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
               <div className="bg-slate-900 border border-green-500 rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95">
                   <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-2">
                       <h3 className="text-green-400 font-bold text-xl flex items-center gap-2"><Download size={24}/> {t('receiveStock')}</h3>
                       <button onClick={() => setReceiveModal({...receiveModal, isOpen: false})} className="text-gray-400 hover:text-white"><X size={24}/></button>
                   </div>
                   <div className="bg-military-800 p-4 rounded-lg mb-6 border border-gray-700">
                       <div className="flex justify-between items-center mb-2"><span className="text-gray-400 text-xs uppercase font-bold">{t('itemOrdered')}</span><span className="text-white font-bold">{receiveModal.order.itemName}</span></div>
                       <div className="flex justify-between items-center"><span className="text-gray-400 text-xs uppercase font-bold">{t('reqAmount')}</span><span className="text-gold-500 font-bold">{receiveModal.order.amount} {t(receiveModal.order.measurement)}</span></div>
                   </div>
                   <div className="space-y-4 mb-8">
                       <div><label className="text-xs text-gray-400 font-bold uppercase mb-1 block">{t('actAmount')}</label><input type="number" className="w-full bg-slate-800 border-2 border-green-900/50 focus:border-green-500 rounded-lg p-3 text-white font-bold text-lg" value={receiveModal.receivedAmount} onChange={e => setReceiveModal({...receiveModal, receivedAmount: e.target.value})} autoFocus /></div>
                       <div><label className="text-xs text-gray-400 font-bold uppercase mb-1 block">{t('unitPrice')}</label><input type="number" className="w-full bg-slate-800 border-2 border-gray-700 focus:border-gold-500 rounded-lg p-3 text-white" value={receiveModal.unitPrice} onChange={e => setReceiveModal({...receiveModal, unitPrice: e.target.value})} placeholder="0.00" /></div>
                   </div>
                   <div className="flex gap-3">
                       <button onClick={() => setReceiveModal({...receiveModal, isOpen: false})} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold">{t('cancel')}</button>
                       <button onClick={submitReceive} disabled={!receiveModal.receivedAmount || !receiveModal.unitPrice} className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">{t('confirm')}</button>
                   </div>
               </div>
           </div>
       )}
       {/* ... Recipe Modal ... */}
       {recipeModal.isOpen && (
           <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
               <div className="bg-slate-900 border border-blue-500 rounded-xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col animate-in zoom-in-95">
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-blue-900/10"><div><h3 className="text-blue-400 font-bold text-lg flex items-center gap-2"><ChefHat size={20}/> {t('dailyRecipe')}: {t(recipeModal.day)}</h3></div><button onClick={() => setRecipeModal({...recipeModal, isOpen: false})} className="text-gray-400 hover:text-white"><X size={24}/></button></div>
                   <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar space-y-6">
                       <div className="bg-military-800 p-4 rounded-lg border border-gray-700"><label className="text-xs text-gray-400 font-bold uppercase mb-1 block">{t('baseManpowerRecipe')}</label><input type="number" className="w-full bg-slate-800 border border-gray-600 rounded p-2 text-white font-mono" value={recipeModal.baseManpower || ''} onChange={e => setRecipeModal({...recipeModal, baseManpower: Number(e.target.value)})} /></div>
                       <div className="bg-black/20 p-4 rounded-lg border border-gray-700 space-y-3"><h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('addItem')}</h4><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><div className="md:col-span-1"><SmartInput collection="storeItems" field="name" className="w-full bg-slate-800 border border-gray-600 rounded p-2 text-white text-sm" placeholder={t('itemName')} value={newIngredient.itemName} onChange={e => setNewIngredient({...newIngredient, itemName: e.target.value})} /></div><div><input type="number" className="w-full bg-slate-800 border border-gray-600 rounded p-2 text-white text-sm" placeholder={t('amount')} value={newIngredient.totalAmount} onChange={e => setNewIngredient({...newIngredient, totalAmount: e.target.value})} /></div><div className="flex gap-2"><CustomSelect value={newIngredient.unit} onChange={val => setNewIngredient({...newIngredient, unit: val})} options={MEASUREMENT_OPTIONS.map(opt => ({ value: opt, label: opt === 'Others' ? t('otherMeasurement') : t(opt) }))} placeholder={t('unit')} className="flex-1 text-xs" /><button onClick={addIngredientToRecipe} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-500"><Plus size={18}/></button></div></div></div>
                       <div className="space-y-2">{recipeModal.ingredients.map((ing, idx) => (<div key={idx} className="flex justify-between items-center bg-military-800 p-3 rounded border border-gray-700"><div><span className="font-bold text-white">{ing.itemName}</span><div className="text-xs text-gray-400">{ing.totalAmount} {t(ing.unit)} (for {recipeModal.baseManpower} {t('people')})</div></div><button onClick={() => removeIngredientFromRecipe(ing.id)} className="text-red-400 hover:text-white"><Trash2 size={16}/></button></div>))}</div>
                   </div>
                   <div className="p-4 border-t border-gray-700 flex justify-end gap-3 bg-black/20"><button onClick={() => setRecipeModal({...recipeModal, isOpen: false})} className="px-4 py-2 text-gray-400 hover:text-white">{t('cancel')}</button><button onClick={saveRecipe} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-bold shadow-lg">{t('save')}</button></div>
               </div>
           </div>
       )}
       {/* ... Ration Modal ... */}
       {rationModal.isOpen && (
           <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
               <div className="bg-slate-900 border border-gold-500 rounded-xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col animate-in zoom-in-95">
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gold-900/10"><div><h3 className="text-gold-500 font-bold text-lg flex items-center gap-2"><Utensils size={20}/> {t('issueRation')}: {t(rationModal.day)}</h3></div><button onClick={() => setRationModal({...rationModal, isOpen: false})} className="text-gray-400 hover:text-white"><X size={24}/></button></div>
                   <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar space-y-6">
                       <div className="bg-military-800 p-4 rounded-lg border border-gray-700"><label className="text-xs text-gray-400 font-bold uppercase mb-1 block">{t('currentHeadcount')}</label><input type="number" className="w-full bg-slate-800 border border-gray-600 rounded p-2 text-white font-mono" value={rationModal.manpower || ''} readOnly /><p className="text-xs text-gray-500 mt-1 italic">{t('calcRecipeMsg')}</p></div>
                       <div className="space-y-4"><h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-gray-700 pb-2">{t('deductList')}</h4>{rationModal.calculatedItems.map((item, idx) => (<div key={idx} className="flex justify-between items-center bg-black/20 p-3 rounded border border-gray-700"><div><span className="font-bold text-white block">{item.name}</span><span className="text-xs text-gray-500">{t(item.unit)}</span></div><div className="w-1/3"><input type="number" className="w-full bg-slate-800 border border-gray-600 rounded p-2 text-white text-right font-mono" value={item.amount} onChange={e => updateRationAmount(idx, Number(e.target.value))} /></div></div>))}</div>
                   </div>
                   <div className="p-4 border-t border-gray-700 flex justify-end gap-3 bg-black/20"><button onClick={() => setRationModal({...rationModal, isOpen: false})} className="px-4 py-2 text-gray-400 hover:text-white">{t('cancel')}</button><button onClick={confirmRationDeduction} className="bg-gold-500 hover:bg-gold-600 text-black px-6 py-2 rounded font-bold shadow-lg flex items-center gap-2"><ClipboardCheck size={18}/> {t('confirmDeduct')}</button></div>
               </div>
           </div>
       )}

       <ConfirmDialog isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message} onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog(prev => ({...prev, isOpen: false}))} isDanger={confirmDialog.isDanger} />

       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6 border-b border-military-700 pb-6 shrink-0">
          <div>
              <h2 className="text-3xl text-gold-500 font-bold font-serif tracking-wide">{t('store')}</h2>
              <p className="text-gray-400 text-sm mt-1">{t('storeSubtitle')}</p>
          </div>
          <DataTools 
            data={
                activeTab === 'items' ? allInventory : 
                activeTab === 'order' ? [...pendingOrders, ...completedOrders] :
                activeTab === 'transfer' ? filteredTransfers : 
                activeTab === 'logistics' ? (aiAnalysis ? [aiAnalysis] : []) : 
                dbData.foodProgram
            } 
            sectionName={activeTab === 'program' ? t('foodProgram') : activeTab === 'logistics' ? t('logisticsAi') : t('storeData')} 
            dbKey={
                activeTab === 'items' || activeTab === 'transfer' ? 'storeItems' : 
                activeTab === 'order' ? 'storeOrders' : 'foodProgram'
            } 
            onImportSuccess={() => setForceUpdate(p => p + 1)}
          />
       </div>

       <div className="md:hidden mb-6 relative z-30">
          <CustomSelect value={activeTab} onChange={(val) => setActiveTab(val)} options={Tabs.map(t => ({ value: t.id, label: t.label }))} className="w-full font-bold" />
       </div>

       <div className="hidden md:flex space-x-2 border-b border-military-700 overflow-x-auto scrollbar-hide pb-2 mb-8">
          {Tabs.map((tab) => (
             <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold uppercase text-sm tracking-wider transition-all duration-300 flex-none ${activeTab === tab.id ? 'bg-gold-500 text-black shadow-[0_-5px_15px_rgba(212,175,55,0.2)]' : 'bg-military-800/50 text-gray-400 hover:text-white hover:bg-military-800'}`}>
                <tab.icon size={18} /><span>{tab.label}</span>
             </button>
          ))}
       </div>

       <div className="relative">
          
          {activeTab === 'items' && (
              <div className="animate-in fade-in slide-in-from-right duration-300">
                  {/* --- WIDE FORM CARD (Like Income Page) --- */}
                  <form onSubmit={handleItemSubmit} className="bg-military-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-military-700 relative overflow-visible mb-12">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 rounded-full blur-3xl -z-10"></div>
                      
                      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Package className="text-gold-500"/> {t('newItem')}</h3>
                      
                      <DateSelectors form={itemForm} setForm={setItemForm} />
                      
                      <label className={LabelClass}>{t('itemName')}</label>
                      <SmartInput collection="storeItems" field="name" required className={InputClass} value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} placeholder={t('egRiceOil')} />
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div><label className={LabelClass}>{t('amount')}</label><input required type="number" className={InputClass} value={itemForm.amount} onChange={e => setItemForm({...itemForm, amount: e.target.value})} placeholder="0" /></div>
                          <div>
                              <label className={LabelClass}>{t('unit')}</label>
                              <CustomSelect value={itemForm.measurement} onChange={(val) => setItemForm({...itemForm, measurement: val})} options={MEASUREMENT_OPTIONS.map(opt => ({ value: opt, label: opt === 'Others' ? t('otherMeasurement') : t(opt) }))} placeholder={t('selectUnit')} />
                          </div>
                          <div><label className={LabelClass}>{t('price')}</label><input required type="number" className={InputClass} value={itemForm.singlePrice} onChange={e => setItemForm({...itemForm, singlePrice: e.target.value})} placeholder="0.00" /></div>
                      </div>
                      
                      <label className={LabelClass}>{t('description')}</label>
                      <textarea className={InputClass} value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} rows={3} />
                      
                      <button type="submit" className="w-full bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-black font-bold py-2.5 md:py-4 px-4 md:px-6 rounded-lg transition-all duration-300 shadow-[0_4px_14px_0_rgba(212,175,55,0.39)] hover:shadow-[0_6px_20px_rgba(212,175,55,0.23)] hover:-translate-y-1 mt-6 text-sm md:text-base">{t('save')}</button>
                  </form>

                  {/* --- TABLES BELOW FORM --- */}
                  <div className="space-y-8">
                      <div>
                          <div className="flex justify-between items-center mb-4"><h3 className="text-gold-500 font-bold flex items-center gap-2"><ShoppingCart size={18}/> {t('recentLogs')} <span className="text-xs text-gray-500 font-normal uppercase">{t('last3Days')}</span></h3><span className="bg-military-900 text-gold-500 text-xs px-2 py-1 rounded border border-military-700">{recentItems.length} {t('records')}</span></div>
                          <div className="bg-military-800 rounded-xl border border-military-700 overflow-hidden shadow-lg">
                              <div className="overflow-x-auto">
                                  <table className="w-full text-left text-sm text-gray-400">
                                      <thead className="bg-black/20 text-xs uppercase font-bold text-gray-500"><tr><th className="p-3">{t('date')}</th><th className="p-3">{t('item')}</th><th className="p-3">{t('quantity')}</th><th className="p-3 text-right">{t('estimatedValue')}</th><th className="p-3 w-10"></th></tr></thead>
                                      <tbody className="divide-y divide-gray-700">
                                          {recentItems.map(item => (<tr key={item.id} className="hover:bg-white/5"><td className="p-3 font-mono text-xs text-gold-500">{item.date}</td><td className="p-3 text-white font-bold">{item.name}</td><td className="p-3">{item.amount} {t(item.measurement)}</td><td className="p-3 text-right font-mono text-gray-300">{(item.amount * item.singlePrice).toLocaleString()}</td><td className="p-3 text-center"><button onClick={() => handleDeleteItem(item.id)} className="text-red-500 hover:text-white"><Trash2 size={14}/></button></td></tr>))}
                                          {recentItems.length === 0 && (<tr><td colSpan={5} className="p-8 text-center text-gray-500">{t('noRecentItems')}</td></tr>)}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      </div>
                      
                      <div className="border-t border-gray-700 pt-6">
                            <button onClick={() => setShowFullHistory(!showFullHistory)} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${showFullHistory ? 'bg-military-900 border-gold-500 text-gold-500' : 'bg-military-800/50 border-gray-700 text-gray-400 hover:text-white hover:bg-military-800'}`}><div className="flex items-center gap-3 font-bold"><History size={20} /><span>{t('fullHistory')}</span><span className="text-xs font-normal bg-black/30 px-2 py-0.5 rounded text-gray-500">{allInventory.length} {t('records')}</span></div>{showFullHistory ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</button>
                            {showFullHistory && (
                                <div className="mt-4 bg-military-900/50 rounded-xl border border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <div className="overflow-y-auto max-h-[500px] custom-scrollbar">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm text-gray-400"><thead className="bg-black/40 text-xs uppercase font-bold text-gray-500 sticky top-0 z-10"><tr><th className="p-3">{t('date')}</th><th className="p-3">{t('item')}</th><th className="p-3">{t('quantity')}</th><th className="p-3 text-right">{t('estimatedValue')}</th><th className="p-3 w-10"></th></tr></thead><tbody className="divide-y divide-gray-800">{allInventory.map(item => (<tr key={item.id} className="hover:bg-white/5"><td className="p-3 font-mono text-xs">{item.date}</td><td className="p-3 text-white font-bold">{item.name}</td><td className="p-3">{item.amount} {t(item.measurement)}</td><td className="p-3 text-right font-mono text-gray-500">{(item.amount * item.singlePrice).toLocaleString()}</td><td className="p-3 text-center"><button onClick={() => handleDeleteItem(item.id)} className="text-gray-600 hover:text-red-500 transition"><Trash2 size={14}/></button></td></tr>))}</tbody></table>
                                        </div>
                                    </div>
                                </div>
                            )}
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'order' && (
              <div className="animate-in fade-in slide-in-from-right duration-300">
                  {/* --- WIDE FORM CARD --- */}
                  <div className="bg-military-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-military-700 relative overflow-visible mb-12">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -z-10"></div>
                      <h3 className="text-white font-bold mb-6 flex items-center gap-2"><Plus size={18} className="text-gold-500"/> {t('createOrder')}</h3>
                      
                      <DateSelectors form={orderForm} setForm={setOrderForm} />
                      
                      <label className={LabelClass}>{t('buyer')}</label><SmartInput collection="storeOrders" field="buyerName" className={InputClass} value={orderForm.buyerName} onChange={e => setOrderForm({...orderForm, buyerName: e.target.value})} placeholder={t('buyer')} />
                      <label className={LabelClass}>{t('itemName')}</label><SmartInput collection="storeItems" field="name" className={InputClass} value={orderForm.itemName} onChange={e => setOrderForm({...orderForm, itemName: e.target.value})} placeholder={t('egMeat')} />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div><label className={LabelClass}>{t('amount')}</label><input type="number" className={InputClass} value={orderForm.amount} onChange={e => setOrderForm({...orderForm, amount: e.target.value})} placeholder="0" /></div>
                          <div><label className={LabelClass}>{t('unit')}</label><CustomSelect value={orderForm.measurement} onChange={(val) => setOrderForm({...orderForm, measurement: val})} options={MEASUREMENT_OPTIONS.map(opt => ({ value: opt, label: opt === 'Others' ? t('otherMeasurement') : t(opt) }))} placeholder={t('selectUnit')} /></div>
                      </div>
                      
                      <label className={LabelClass}>{t('description')}</label><textarea className={InputClass} value={orderForm.description} onChange={e => setOrderForm({...orderForm, description: e.target.value})} placeholder={t('egUrgentHoliday')} rows={2} />
                      
                      <button onClick={addToCart} className="w-full bg-military-900 hover:bg-gold-500 hover:text-black text-white border border-gold-500/50 font-bold py-2.5 md:py-3 rounded-lg shadow-lg transition flex items-center justify-center gap-2 mb-4 text-xs md:text-sm"><ShoppingBag size={16}/> {t('addToCart')}</button>
                      
                      {orderCart.length > 0 && (<div className="bg-black/20 rounded-xl p-4 border border-gray-700"><h4 className="text-gold-500 font-bold text-xs uppercase mb-3">{t('currentCart')} ({orderCart.length})</h4><div className="space-y-2 mb-4 max-h-[200px] overflow-y-auto">{orderCart.map(item => (<div key={item.id} className="flex justify-between items-center bg-military-900 p-2 rounded text-sm border border-gray-700"><div><span className="text-white font-bold block">{item.itemName}</span><span className="text-[10px] text-gray-400">{item.buyerName || t('noBuyer')}</span></div><div className="flex items-center gap-2"><span className="text-gray-400 text-xs">{item.amount} {t(item.measurement)}</span><button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-white"><X size={14}/></button></div></div>))}</div><button onClick={submitOrderCart} className="w-full bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-black font-bold py-2.5 md:py-4 px-4 md:px-6 rounded-lg transition-all duration-300 shadow-[0_4px_14px_0_rgba(212,175,55,0.39)] hover:shadow-[0_6px_20px_rgba(212,175,55,0.23)] hover:-translate-y-1 text-sm md:text-base">{t('confirm')}</button></div>)}
                  </div>

                  <div className="space-y-6">
                       <div>
                           <div className="flex justify-between items-center mb-4"><h3 className="text-white font-bold flex items-center gap-2"><ShoppingBasket size={18} className="text-green-400"/> {t('pendingOrders')}</h3><span className="bg-military-900 text-green-400 text-xs px-2 py-1 rounded border border-military-700">{pendingOrders.length} {t('pending')}</span></div>
                           <div className="bg-military-900 border border-gray-700 rounded-xl overflow-hidden shadow-xl">
                               <div className="overflow-x-auto">
                                   <table className="w-full text-left text-sm text-gray-400"><thead className="bg-black/20 text-xs uppercase font-bold text-gray-500"><tr><th className="p-3">{t('date')}</th><th className="p-3">{t('item')}</th><th className="p-3">{t('buyer')}</th><th className="p-3">{t('quantity')}</th><th className="p-3 w-10">{t('action')}</th></tr></thead><tbody className="divide-y divide-gray-800">{pendingOrders.map(order => (<tr key={order.id} className="hover:bg-white/5"><td className="p-3 font-mono text-xs text-gold-500">{order.date}</td><td className="p-3 text-white font-bold">{order.itemName}</td><td className="p-3 text-xs">{order.buyerName || '-'}</td><td className="p-3">{order.amount} {t(order.measurement)}</td><td className="p-3 text-center"><button onClick={() => openReceiveModal(order)} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs font-bold shadow flex items-center gap-1">{t('receive')}</button></td></tr>))}{pendingOrders.length === 0 && (<tr><td colSpan={5} className="p-6 text-center text-gray-500 italic">{t('noPendingOrders')}</td></tr>)}</tbody></table>
                               </div>
                           </div>
                       </div>
                       <div className="border-t border-gray-700 pt-6">
                            <button onClick={() => setShowOrderHistory(!showOrderHistory)} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${showOrderHistory ? 'bg-military-900 border-gold-500 text-gold-500' : 'bg-military-800/50 border-gray-700 text-gray-400 hover:text-white hover:bg-military-800'}`}><div className="flex items-center gap-3 font-bold"><History size={20} /><span>{t('fullHistory')}</span><span className="text-xs font-normal bg-black/30 px-2 py-0.5 rounded text-gray-500">{completedOrders.length} {t('completed')}</span></div>{showOrderHistory ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</button>
                            {showOrderHistory && (
                                <div className="mt-4 bg-military-900/50 rounded-xl border border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <div className="overflow-y-auto max-h-[500px] custom-scrollbar">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm text-gray-400"><thead className="bg-black/40 text-xs uppercase font-bold text-gray-500 sticky top-0 z-10"><tr><th className="p-3">{t('date')}</th><th className="p-3">{t('item')}</th><th className="p-3">{t('buyer')}</th><th className="p-3">{t('quantity')}</th><th className="p-3">{t('status')}</th></tr></thead><tbody className="divide-y divide-gray-800">{completedOrders.map(order => (<tr key={order.id} className="hover:bg-white/5"><td className="p-3 font-mono text-xs text-gold-500">{order.date}</td><td className="p-3 text-white font-bold">{order.itemName}</td><td className="p-3 text-xs">{order.buyerName || '-'}</td><td className="p-3">{order.amount} {t(order.measurement)}</td><td className="p-3"><span className="text-green-500 font-bold text-xs flex items-center gap-1"><CheckCircle size={12}/> {t('done')}</span></td></tr>))}</tbody></table>
                                        </div>
                                    </div>
                                </div>
                            )}
                       </div>
                  </div>
              </div>
          )}

          {activeTab === 'transfer' && (
              <div className="animate-in fade-in slide-in-from-right duration-300">
                  {/* --- WIDE FORM CARD --- */}
                  <form onSubmit={handleTransferSubmit} className="bg-military-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-military-700 relative overflow-visible mb-12">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -z-10"></div>
                      <h3 className="text-white font-bold mb-6 flex items-center gap-2"><ArrowRightLeft size={18} className="text-gold-500"/> {t('newMonthlyTransfer')}</h3>
                      
                      <DateSelectors form={transferForm} setForm={setTransferForm} />

                      <label className={LabelClass}>{t('itemName')}</label><SmartInput collection="storeItems" field="name" required className={InputClass} value={transferForm.name} onChange={e => setTransferForm({...transferForm, name: e.target.value})} placeholder={t('itemName')} />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div><label className={LabelClass}>{t('amount')}</label><input required type="number" className={InputClass} value={transferForm.amount} onChange={e => setTransferForm({...transferForm, amount: e.target.value})} placeholder="0" /></div>
                          <div><label className={LabelClass}>{t('unit')}</label><CustomSelect value={transferForm.measurement} onChange={(val) => setTransferForm({...transferForm, measurement: val})} options={MEASUREMENT_OPTIONS.map(opt => ({ value: opt, label: opt === 'Others' ? t('otherMeasurement') : t(opt) }))} placeholder={t('selectUnit')} /></div>
                      </div>
                      
                      <label className={LabelClass}>{t('estimatedValue')}</label><input required type="number" className={InputClass} value={transferForm.singlePrice} onChange={e => setTransferForm({...transferForm, singlePrice: e.target.value})} placeholder="0.00" />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                          <div><label className={LabelClass}>{t('fromMonth')}</label><CustomSelect value={transferForm.fromMonth} onChange={(val) => setTransferForm({...transferForm, fromMonth: val})} options={ETHIOPIAN_MONTHS.map((m, i) => ({value: m, label: language === 'am' ? ETHIOPIAN_MONTHS_AMHARIC[i] : m }))} /></div>
                          <div><label className={LabelClass}>{t('toMonth')}</label><CustomSelect value={transferForm.toMonth} onChange={(val) => setTransferForm({...transferForm, toMonth: val})} options={ETHIOPIAN_MONTHS.map((m, i) => ({value: m, label: language === 'am' ? ETHIOPIAN_MONTHS_AMHARIC[i] : m }))} /></div>
                      </div>
                      
                      <label className={LabelClass}>{t('description')}</label><textarea className={InputClass} value={transferForm.description} onChange={e => setTransferForm({...transferForm, description: e.target.value})} rows={2} />
                      
                      <button type="submit" className="w-full bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-black font-bold py-2.5 md:py-4 px-4 md:px-6 rounded-lg transition-all duration-300 shadow-[0_4px_14px_0_rgba(212,175,55,0.39)] hover:shadow-[0_6px_20px_rgba(212,175,55,0.23)] hover:-translate-y-1 mt-6 text-sm md:text-base">{t('save')}</button>
                  </form>

                  <div className="space-y-8">
                      <div>
                          <div className="flex justify-between items-center mb-4"><h3 className="text-gold-500 font-bold flex items-center gap-2"><History size={18}/> {t('recentTransfers')}</h3><span className="bg-military-900 text-gold-500 text-xs px-2 py-1 rounded border border-military-700">{filteredTransfers.length} {t('records')}</span></div>
                          <div className="bg-military-800 rounded-xl border border-military-700 overflow-hidden shadow-lg">
                              <div className="overflow-x-auto">
                                  <table className="w-full text-left text-sm text-gray-400 whitespace-nowrap">
                                      <thead className="bg-black/20 text-xs uppercase font-bold text-gray-500">
                                          <tr>
                                              <th className="p-3">{t('date')}</th>
                                              <th className="p-3">{t('item')}</th>
                                              <th className="p-3">{t('amount')}</th>
                                              <th className="p-3">{t('transferInfo')}</th>
                                              <th className="p-3 text-right">{t('estimatedValue')}</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-700">
                                          {filteredTransfers.slice(0, 10).map(item => (
                                              <tr key={item.id} className="hover:bg-white/5">
                                                  <td className="p-3 font-mono text-xs text-gold-500">{item.date}</td>
                                                  <td className="p-3 text-white font-bold">{item.name}</td>
                                                  <td className="p-3">{item.amount} {t(item.measurement)}</td>
                                                  <td className="p-3 text-xs max-w-[200px] truncate" title={item.description}>{item.description}</td>
                                                  <td className="p-3 text-right font-mono text-gray-300">{(item.amount * item.singlePrice).toLocaleString()}</td>
                                              </tr>
                                          ))}
                                          {filteredTransfers.length === 0 && (<tr><td colSpan={5} className="p-6 text-center text-gray-500">{t('noTransferData')}</td></tr>)}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      </div>

                      <div className="border-t border-gray-700 pt-6">
                            <button onClick={() => setShowTransferHistory(!showTransferHistory)} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${showTransferHistory ? 'bg-military-900 border-gold-500 text-gold-500' : 'bg-military-800/50 border-gray-700 text-gray-400 hover:text-white hover:bg-military-800'}`}>
                                <div className="flex items-center gap-3 font-bold">
                                    <History size={20} />
                                    <span>{t('fullHistory')}</span>
                                    <span className="text-xs font-normal bg-black/30 px-2 py-0.5 rounded text-gray-500">{filteredTransfers.length} {t('records')}</span>
                                </div>
                                {showTransferHistory ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            {showTransferHistory && (
                                <div className="mt-4 bg-military-900/50 rounded-xl border border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <div className="overflow-y-auto max-h-[500px] custom-scrollbar">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm text-gray-400 whitespace-nowrap">
                                                <thead className="bg-black/40 text-xs uppercase font-bold text-gray-500 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="p-3">{t('date')}</th>
                                                        <th className="p-3">{t('item')}</th>
                                                        <th className="p-3">{t('amount')}</th>
                                                        <th className="p-3">{t('transferInfo')}</th>
                                                        <th className="p-3 text-right">{t('estimatedValue')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-800">
                                                    {filteredTransfers.map(item => (
                                                        <tr key={item.id} className="hover:bg-white/5">
                                                            <td className="p-3 font-mono text-xs text-gold-500">{item.date}</td>
                                                            <td className="p-3 text-white font-bold">{item.name}</td>
                                                            <td className="p-3">{item.amount} {t(item.measurement)}</td>
                                                            <td className="p-3 text-xs max-w-[200px] truncate" title={item.description}>{item.description}</td>
                                                            <td className="p-3 text-right font-mono text-gray-300">{(item.amount * item.singlePrice).toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                    {filteredTransfers.length === 0 && (<tr><td colSpan={5} className="p-6 text-center text-gray-500">{t('noTransferData')}</td></tr>)}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'program' && (
              <div className="flex flex-col h-full animate-in fade-in slide-in-from-right">
                  <div className="bg-military-800 p-6 border-b border-military-700 shrink-0 z-20 relative shadow-md flex flex-col items-center gap-4">
                      <h3 className="text-white font-bold flex items-center gap-2 text-2xl tracking-wide"><List size={24} className="text-gold-500"/> {t('weeklyFoodSchedule')}</h3>
                      <div className="flex flex-wrap gap-2 w-full justify-center">
                           {isEditingProgram ? (
                               <>
                                  <button onClick={() => setIsEditingProgram(false)} className="px-3 py-1.5 md:px-6 md:py-2 text-xs md:text-sm text-gray-400 hover:text-white font-bold border border-gray-600 rounded-lg">{t('cancel')}</button>
                                  <button onClick={() => setShowArchiveModal(true)} className="px-3 py-1.5 md:px-6 md:py-2 text-xs md:text-sm bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow">{t('saveConfig')}</button>
                               </>
                           ) : (
                               <button onClick={() => setIsEditingProgram(true)} className="px-3 py-1.5 md:px-6 md:py-2 text-xs md:text-sm bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow flex items-center gap-2"><Edit size={14}/> {t('edit')}</button>
                           )}
                           <button onClick={() => setShowPrintModal(true)} className="px-3 py-1.5 md:px-6 md:py-2 text-xs md:text-sm bg-gold-500 hover:bg-gold-600 text-black font-bold rounded-lg shadow flex items-center gap-2"><Printer size={14}/> {t('print')}</button>
                      </div>
                  </div>
                  {isEditingProgram && (
                      <div className="bg-military-900 p-4 border-b border-military-700 grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
                          <input className="bg-black/20 border border-gray-700 rounded p-2 text-white text-sm" value={programSettings.title} onChange={e => setProgramSettings({...programSettings, title: e.target.value})} placeholder={t('programTitlePlaceholder')} />
                          <input className="bg-black/20 border border-gray-700 rounded p-2 text-white text-sm" value={programSettings.subtitle} onChange={e => setProgramSettings({...programSettings, subtitle: e.target.value})} placeholder={t('programSubtitlePlaceholder')} />
                          <input className="bg-black/20 border border-gray-700 rounded p-2 text-white text-sm" value={programSettings.footerLeft} onChange={e => setProgramSettings({...programSettings, footerLeft: e.target.value})} placeholder={t('footerLeftPlaceholder')} />
                          <input className="bg-black/20 border border-gray-700 rounded p-2 text-white text-sm" value={programSettings.footerRight} onChange={e => setProgramSettings({...programSettings, footerRight: e.target.value})} placeholder={t('footerRightPlaceholder')} />
                      </div>
                  )}
                  <div className="flex-1 overflow-auto bg-gray-100 relative">
                       <div className="min-h-full min-w-full w-fit flex items-center justify-center p-4 md:p-8">
                           <ProgramPaper settings={programSettings} program={foodProgram} isEditing={isEditingProgram} onEdit={handleProgramCellEdit} onRecipe={openRecipeEditor} onRation={openRationModal} />
                      </div>
                  </div>
                  
                  {/* NEW SECTION: RATION HISTORY LOG */}
                  <div className="bg-military-900 border-t border-military-700 p-4">
                      <h4 className="text-gold-500 font-bold mb-3 flex items-center gap-2"><History size={16}/> {t('rationHistoryTitle')}</h4>
                      <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs text-gray-400">
                              <thead className="bg-black/30 font-bold uppercase text-gray-500">
                                  <tr>
                                      <th className="p-2">{t('date')}</th>
                                      <th className="p-2">{t('day')}</th>
                                      <th className="p-2">{t('manpower')}</th>
                                      <th className="p-2 text-right">{t('cost')}</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {filteredRationHistory.map((log, i) => (
                                      <tr key={i} className="hover:bg-white/5 border-b border-gray-800">
                                          <td className="p-2 font-mono text-white">{log.dateExecuted}</td>
                                          <td className="p-2 text-gold-500">{t(log.day)}</td>
                                          <td className="p-2">{log.totalManpower}</td>
                                          <td className="p-2 text-right text-green-400 font-mono">{log.totalCost.toLocaleString()}</td>
                                      </tr>
                                  ))}
                                  {filteredRationHistory.length === 0 && <tr><td colSpan={4} className="p-4 text-center italic">{t('noRationLogs')}</td></tr>}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'logistics' && (
              <div className="p-6 md:p-8 animate-in fade-in slide-in-from-right h-full overflow-y-auto">
                  <div className="max-w-4xl mx-auto space-y-6">
                      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 p-6 rounded-2xl shadow-xl flex items-center justify-between">
                          <div><h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><Cpu size={24} className="text-blue-400"/> {t('logisticsTitle')}</h3><p className="text-gray-300">{t('logisticsSubtitle')}</p></div>
                          <div className="text-right">
                              <span className="block text-4xl font-black text-white">{manpowerCount}</span>
                              <div className="flex items-center gap-2 justify-end mt-1">
                                  <span className="text-xs text-gray-400 uppercase font-bold">{t('currentManpower')}</span>
                              </div>
                          </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <button onClick={() => runLogisticsAnalysis(false)} disabled={isAnalyzing} className="p-4 md:p-6 bg-military-800 hover:bg-military-700 border border-military-600 rounded-xl shadow-lg flex flex-col items-center justify-center gap-2 md:gap-3 transition group disabled:opacity-50">
                               {isAnalyzing ? <RefreshCw size={24} className="animate-spin text-blue-500 md:w-[32px] md:h-[32px]"/> : <BarChart3 size={24} className="text-blue-500 group-hover:scale-110 transition md:w-[32px] md:h-[32px]"/>}
                               <span className="font-bold text-xs md:text-sm text-white">{t('analyzeStock')}</span>
                           </button>
                           <button onClick={() => runLogisticsAnalysis(true)} disabled={isAnalyzing} className="p-4 md:p-6 bg-military-800 hover:bg-military-700 border border-military-600 rounded-xl shadow-lg flex flex-col items-center justify-center gap-2 md:gap-3 transition group disabled:opacity-50">
                               {isAnalyzing ? <RefreshCw size={24} className="animate-spin text-purple-500 md:w-[32px] md:h-[32px]"/> : <Sparkles size={24} className="text-purple-500 group-hover:scale-110 transition md:w-[32px] md:h-[32px]"/>}
                               <span className="font-bold text-xs md:text-sm text-white">{t('autoGenMenu')}</span>
                           </button>
                      </div>
                      {aiAnalysis ? (
                          <div className="space-y-6 animate-in slide-in-from-bottom-4">
                              {aiAnalysis.alerts.length > 0 && (<div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4"><h4 className="text-red-400 font-bold mb-3 flex items-center gap-2"><AlertTriangle size={18}/> {t('criticalAlerts')}</h4><ul className="space-y-2">{aiAnalysis.alerts.map((alert, i) => (<li key={i} className="flex items-start gap-2 text-sm text-gray-300"><span className="text-red-500">•</span> {alert}</li>))}</ul></div>)}
                              {aiAnalysis.recommendedOrders.length > 0 && (<div className="bg-blue-900/20 border border-blue-500/50 rounded-xl p-4"><h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2"><ShoppingCart size={18}/> {t('purchasingRecs')}</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{aiAnalysis.recommendedOrders.map((rec, i) => (<div key={i} className="bg-black/30 p-3 rounded flex justify-between items-center"><div><span className="block font-bold text-white">{rec.itemName}</span><span className="text-xs text-gray-400">{rec.reason}</span></div><button onClick={() => addRecommendationToOrder(rec)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-bold">+ {rec.amountToBuy} {t(rec.unit)}</button></div>))}</div></div>)}
                              <div className="bg-military-800 border border-military-600 rounded-xl p-4"><h4 className="text-gold-500 font-bold mb-3 flex items-center gap-2"><Info size={18}/> {t('stockDuration')}</h4><div className="overflow-x-auto"><table className="w-full text-left text-sm text-gray-400"><thead className="bg-black/20 text-xs uppercase font-bold text-gray-500"><tr><th className="p-2">{t('item')}</th><th className="p-2">{t('requiredWk')}</th><th className="p-2">{t('inStock')}</th><th className="p-2">{t('status')}</th><th className="p-2">{t('estDaysLeft')}</th></tr></thead><tbody className="divide-y divide-gray-700">{aiAnalysis.ingredientBreakdown.map((row, i) => (<tr key={i}><td className="p-2 font-bold text-white">{row.itemName}</td><td className="p-2">{row.requiredAmount.toFixed(1)} {t(row.unit)}</td><td className="p-2">{row.inStock.toFixed(1)} {t(row.unit)}</td><td className="p-2"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.status === 'CRITICAL' ? 'bg-red-900 text-red-400' : row.status === 'LOW' ? 'bg-orange-900 text-orange-400' : 'bg-green-900 text-green-400'}`}>{row.status}</span></td><td className="p-2 font-mono">{row.daysLasting > 14 ? t('moreThan2Weeks') : `${row.daysLasting.toFixed(1)} ${t('days')}`}</td></tr>))}</tbody></table></div></div>
                              {aiAnalysis.optimizedMenu && (<div className="bg-purple-900/20 border border-purple-500/50 rounded-xl p-4"><div className="flex justify-between items-center mb-4"><h4 className="text-purple-400 font-bold flex items-center gap-2"><Sparkles size={18}/> {t('optimizedMenu')}</h4><button onClick={applyOptimizedMenu} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded font-bold shadow-lg flex items-center gap-2"><CheckCircle size={16}/> {t('applyMenu')}</button></div><div className="bg-black/30 p-4 rounded text-xs font-mono text-gray-300 max-h-40 overflow-y-auto"><pre>{JSON.stringify(aiAnalysis.optimizedMenu, null, 2)}</pre></div></div>)}
                          </div>
                      ) : (
                          <div className="text-center p-12 bg-black/20 rounded-xl border border-dashed border-gray-700"><p className="text-gray-500 font-bold">{isAnalyzing ? t('neuralProcessing') : t('awaitingAnalysis')}</p></div>
                      )}
                  </div>
              </div>
          )}

       </div>
    </div>
  );
};

export default Store;
