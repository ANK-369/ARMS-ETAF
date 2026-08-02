
import React, { useState, useEffect } from 'react';
import { getDB, deleteItem, updateItem } from '../services/db';
import { AppData, Command, ManpowerType, MEASUREMENT_OPTIONS } from '../types';
import { 
    Trash2, Edit, Save, X, Search, CheckCircle, Users, TrendingUp, Gift, 
    ArrowRightLeft, ShoppingCart, RotateCcw, Package, ShoppingBag, Book, 
    Database, Filter, ChevronRight, PanelLeftClose, PanelLeftOpen, Archive, Code,
    FileText, AlertTriangle
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import CustomSelect from '../components/CustomSelect';
import GroupedRankSelect, { formatRankDisplay } from '../components/GroupedRankSelect';
import EthiopianDatePicker from '../components/EthiopianDatePicker';
import { useLanguage } from '../contexts/LanguageContext';
import { useDate } from '../contexts/DateContext';
import { ETHIOPIAN_MONTHS, ETHIOPIAN_MONTHS_AMHARIC } from '../services/ethiopianDate';

const DataEditor: React.FC = () => {
  const [data, setData] = useState<AppData | null>(null);
  const [activeCollection, setActiveCollection] = useState<keyof AppData>('manpower');
  const [query, setQuery] = useState('');
  const [msg, setMsg] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const { t, language } = useLanguage();
  const { month: selectedMonth, year: selectedYear } = useDate();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [complexEditField, setComplexEditField] = useState<{key: string, value: string} | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
      isOpen: boolean;
      title: string;
      message: React.ReactNode;
      onConfirm: () => void;
      isDanger: boolean;
      type?: 'confirm' | 'alert';
      confirmText?: string;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, isDanger: false });

  const refreshData = () => {
    setData(getDB());
  };

  useEffect(() => {
    refreshData();
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }, [selectedMonth, selectedYear]);

  if (!data) return <div className="flex h-full items-center justify-center text-gold-500 animate-pulse">{t('loadingDatabase')}</div>;

  const COLLECTIONS = [
    { key: 'manpower', label: t('db_manpower'), icon: Users, category: t('cat_HR') },
    { key: 'incomeItems', label: t('db_incomeItems'), icon: TrendingUp, category: t('cat_Finance') },
    { key: 'subsidies', label: t('db_subsidies'), icon: Gift, category: t('cat_Finance') },
    { key: 'transfers', label: t('db_transfers'), icon: ArrowRightLeft, category: t('cat_Finance') },
    { key: 'expenses', label: t('db_expenses'), icon: ShoppingCart, category: t('cat_Finance') },
    { key: 'refunds', label: t('db_refunds'), icon: RotateCcw, category: t('cat_Finance') },
    { key: 'storeItems', label: t('db_storeItems'), icon: Package, category: t('cat_Logistics') },
    { key: 'storeOrders', label: t('db_storeOrders'), icon: ShoppingBag, category: t('cat_Logistics') },
    { key: 'foodProgramArchive', label: t('db_foodProgramArchive'), icon: Archive, category: t('cat_Logistics') },
    { key: 'notes', label: t('db_notes'), icon: Book, category: t('cat_System') },
  ];

  const groupedCollections = COLLECTIONS.reduce((acc, curr) => {
      if (!acc[curr.category]) acc[curr.category] = [];
      acc[curr.category].push(curr);
      return acc;
  }, {} as Record<string, typeof COLLECTIONS>);

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditForm(JSON.parse(JSON.stringify(item)));
  };

  const handleSave = () => {
    if (editingId) {
      const sanitizedForm = { ...editForm };
      Object.keys(sanitizedForm).forEach((key) => {
        const isNumericField = NUMERIC_FIELDS.includes(key) || typeof (data[activeCollection] as any[])?.find((item: any) => item.id === editingId)?.[key] === 'number';
        if (isNumericField) {
          const val = sanitizedForm[key];
          sanitizedForm[key] = (val === '' || val === null || val === undefined || isNaN(Number(val))) ? 0 : Number(val);
        }
      });
      updateItem(activeCollection, editingId, sanitizedForm);
      setEditingId(null);
      setEditForm({});
      refreshData();
      setMsg(t('recordUpdated'));
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const requestDelete = (id: string) => {
      setConfirmDialog({
          isOpen: true,
          title: t('confirmDeleteTitle'),
          message: t('confirmDeleteRecord'),
          isDanger: true,
          onConfirm: () => handleDelete(id)
      });
  };

  const handleDelete = (id: string) => {
      deleteItem(activeCollection, id);
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      setTimeout(() => {
          refreshData();
          setMsg(t('recordDeleted'));
          setTimeout(() => setMsg(''), 3000);
      }, 50);
  };

  const handleInputChange = (key: string, value: any, isNumeric: boolean) => {
      // Store raw input as-is while typing so numeric inputs can be emptied without snapping back to 0 immediately
      setEditForm((prev: any) => ({ ...prev, [key]: value }));
  };

  const openComplexEditor = (key: string) => {
      const val = editForm[key];
      setComplexEditField({ 
          key, 
          value: JSON.stringify(val, null, 2) 
      });
  };

  const saveComplexEditor = () => {
      if (!complexEditField) return;
      try {
          const parsed = JSON.parse(complexEditField.value);
          setEditForm((prev: any) => ({ ...prev, [complexEditField.key]: parsed }));
          setComplexEditField(null);
      } catch (e) {
          setConfirmDialog({
              isOpen: true,
              title: t('jsonError'),
              message: t('invalidJson'),
              onConfirm: () => setConfirmDialog(prev => ({...prev, isOpen: false})),
              isDanger: true,
              type: 'alert',
              confirmText: 'OK'
          });
      }
  };

  const isComplex = (val: any) => typeof val === 'object' && val !== null;

  // Translation helpers for labels and values
  const getFieldLabel = (key: string, collection: string): string => {
      switch (key) {
          case 'firstName': return t('firstName');
          case 'lastName': return t('lastName');
          case 'rank': return t('rank');
          case 'command': return t('command');
          case 'type': 
              if (collection === 'subsidies') return t('subsidyType');
              return t('type');
          case 'startDate': return t('startDate');
          case 'endDate': return t('endDate');
          case 'stopDate': return t('refundDate') || t('stopDate');
          case 'archivedDate': return t('date');
          case 'description': return t('description');
          case 'amount':
              if (collection === 'refunds') return t('refundAmount');
              if (collection === 'transfers') return t('amountTransferred');
              return t('amount');
          case 'name':
              if (collection === 'foodProgramArchive') return t('name');
              return t('itemName');
          case 'itemName': return t('itemName');
          case 'measurement': return t('measurement');
          case 'singlePrice': return t('singlePrice');
          case 'date': return t('date');
          case 'source': return t('source');
          case 'dateFrom': return t('monthFrom');
          case 'dateTo': return t('monthTo');
          case 'category': return t('category');
          case 'workerName': return t('workerName');
          case 'workerPosition': return t('positionJob');
          case 'reason': return t('reasonTitle');
          case 'buyerName': return t('buyer');
          case 'status': return t('status');
          case 'quantity': return t('quantity');
          case 'unitPrice': return t('unitPrice');
          case 'totalPrice': return t('totalPrice');
          case 'title': return t('subject');
          case 'content': return t('details');
          case 'program': return t('program');
          default: {
              const translated = t(key);
              return translated !== key ? translated : key;
          }
      }
  };

  const getFieldValue = (key: string, val: any, item: any, collection: string): string => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return `[${t('complexData')}]`;

      const strVal = String(val);

      if (key === 'command') {
          return t(strVal);
      }

      if (key === 'rank') {
          return formatRankDisplay(strVal, item?.command, t);
      }

      if (key === 'type') {
          if (collection === 'manpower') {
              return t(strVal);
          }
          if (collection === 'subsidies') {
              if (strVal === 'Financial') return t('subsidyFinancial');
              if (strVal === 'Food') return t('subsidyFood');
              return t(strVal);
          }
      }

      if (key === 'category') {
          if (collection === 'expenses') {
              if (strVal === 'Market') return t('market');
              if (strVal === 'Wage') return t('wage');
              if (strVal === 'Other') return t('operationalExpense') || t('other');
          }
          if (collection === 'storeItems') {
              if (strVal === 'inventory') return t('itemList');
              if (strVal === 'transfer') return t('transfers');
          }
          if (collection === 'notes') {
              if (strVal === 'Incident') return t('Incident');
              if (strVal === 'Plan') return t('Plan');
              if (strVal === 'General') return t('General');
          }
      }

      if (key === 'status') {
          if (collection === 'storeOrders') {
              if (strVal === 'Pending') return t('pending');
              if (strVal === 'Completed') return t('completed');
          }
      }

      if (key === 'measurement') {
          return t(strVal);
      }

      if (key === 'dateFrom' || key === 'dateTo') {
          if (collection === 'transfers') {
              const idx = ETHIOPIAN_MONTHS.indexOf(strVal);
              if (idx !== -1 && language === 'am') {
                  return ETHIOPIAN_MONTHS_AMHARIC[idx];
              }
              return strVal;
          }
      }

      return strVal;
  };

  // Filter Helper
  const isRecordInMonth = (item: any) => {
      const targetPrefix = `${selectedYear}-${selectedMonth}`;
      
      // MANPOWER: Check Overlap regardless of status
      // Show if ANY part of their service falls within the selected month
      if (activeCollection === 'manpower') {
          const monthStart = `${targetPrefix}-01`;
          const monthEnd = `${targetPrefix}-30`;
          // Overlap Logic: (StartA <= EndB) and (EndA >= StartB)
          return item.startDate <= monthEnd && item.endDate >= monthStart;
      }

      // TRANSFERS (Financial): Check Month Name Match
      if (activeCollection === 'transfers') {
          const mIndex = parseInt(selectedMonth) - 1;
          const mName = ETHIOPIAN_MONTHS[mIndex];
          return item.dateTo === mName;
      }

      // Standard Date Fields (ISO-like YYYY-MM-DD)
      if (item.date && typeof item.date === 'string') return item.date.startsWith(targetPrefix);
      if (item.stopDate && typeof item.stopDate === 'string') return item.stopDate.startsWith(targetPrefix);
      if (item.archivedDate && typeof item.archivedDate === 'string') return item.archivedDate.startsWith(targetPrefix);
      
      return false;
  };

  const items = ((data[activeCollection] as any[]) || []).filter(isRecordInMonth);
  
  const filteredItems = items.filter(item => 
    JSON.stringify(item).toLowerCase().includes(query.toLowerCase())
  );

  const activeCollectionLabel = COLLECTIONS.find(c => c.key === activeCollection)?.label || activeCollection;

  // List of fields that MUST be numbers to prevent calculation errors
  const NUMERIC_FIELDS = ['amount', 'singlePrice', 'quantity', 'cost', 'baseManpower', 'totalAmount', 'price', 'unitPrice', 'totalPrice'];

  const renderEditControl = (key: string) => {
      const isNumericField = NUMERIC_FIELDS.includes(key) || typeof editForm[key] === 'number';

      if (key === 'id') {
          return (
              <input 
                  className="w-full bg-black/40 border border-gray-700 rounded p-3 text-gray-500 font-mono text-sm cursor-not-allowed" 
                  value={editForm[key] || ''} 
                  disabled 
              />
          );
      }

      if (isComplex(editForm[key])) {
          return (
              <div className="flex items-center gap-2">
                  <div className="flex-1 bg-black/40 border border-gray-700 rounded p-3 text-gray-500 font-mono text-sm italic">
                      {t('complexData')}
                  </div>
                  <button 
                      type="button"
                      onClick={() => openComplexEditor(key)} 
                      className="bg-military-800 hover:bg-gold-500 hover:text-black border border-gray-600 text-gold-500 px-4 py-3 rounded font-bold text-xs transition flex items-center gap-2 shrink-0"
                  >
                      <Code size={16}/> {t('editJson')}
                  </button>
              </div>
          );
      }

      // Command dropdown (manpower, refunds)
      if (key === 'command' && (activeCollection === 'manpower' || activeCollection === 'refunds')) {
          return (
              <CustomSelect
                  value={editForm[key] || ''}
                  onChange={val => handleInputChange(key, val, false)}
                  options={Object.values(Command).map(c => ({ value: c, label: t(c) }))}
              />
          );
      }

      // Rank dropdown (manpower, refunds)
      if (key === 'rank' && (activeCollection === 'manpower' || activeCollection === 'refunds')) {
          return (
              <GroupedRankSelect
                  value={editForm[key] || ''}
                  onChange={val => handleInputChange(key, val, false)}
                  command={editForm.command}
              />
          );
      }

      // Type dropdown
      if (key === 'type') {
          if (activeCollection === 'manpower') {
              return (
                  <CustomSelect
                      value={editForm[key] || ''}
                      onChange={val => handleInputChange(key, val, false)}
                      options={Object.values(ManpowerType)
                          .filter(v => v !== ManpowerType.PENSION || editForm[key] === ManpowerType.PENSION)
                          .map(v => ({ value: v, label: t(v) }))}
                  />
              );
          }
          if (activeCollection === 'subsidies') {
              return (
                  <CustomSelect
                      value={editForm[key] || ''}
                      onChange={val => handleInputChange(key, val, false)}
                      options={[
                          { value: 'Financial', label: t('subsidyFinancial') },
                          { value: 'Food', label: t('subsidyFood') }
                      ]}
                  />
              );
          }
      }

      // Measurement dropdown
      if (key === 'measurement') {
          return (
              <CustomSelect
                  value={editForm[key] || ''}
                  onChange={val => handleInputChange(key, val, false)}
                  options={MEASUREMENT_OPTIONS.map(opt => ({ value: opt, label: t(opt) }))}
              />
          );
      }

      // Month dropdown for transfers
      if ((key === 'dateFrom' || key === 'dateTo') && activeCollection === 'transfers') {
          return (
              <CustomSelect
                  value={editForm[key] || ''}
                  onChange={val => handleInputChange(key, val, false)}
                  options={ETHIOPIAN_MONTHS.map((m, idx) => ({
                      value: m,
                      label: language === 'am' ? ETHIOPIAN_MONTHS_AMHARIC[idx] : m
                  }))}
              />
          );
      }

      // Ethiopian Date Pickers for date fields
      if (['startDate', 'endDate', 'stopDate', 'date', 'archivedDate'].includes(key)) {
          return (
              <EthiopianDatePicker
                  value={editForm[key] || ''}
                  onChange={val => handleInputChange(key, val, false)}
              />
          );
      }

      // Expense / StoreItem / Note Category dropdown
      if (key === 'category') {
          if (activeCollection === 'expenses') {
              return (
                  <CustomSelect
                      value={editForm[key] || ''}
                      onChange={val => handleInputChange(key, val, false)}
                      options={[
                          { value: 'Market', label: t('market') },
                          { value: 'Wage', label: t('wage') },
                          { value: 'Other', label: t('operationalExpense') || t('other') }
                      ]}
                  />
              );
          }
          if (activeCollection === 'storeItems') {
              return (
                  <CustomSelect
                      value={editForm[key] || ''}
                      onChange={val => handleInputChange(key, val, false)}
                      options={[
                          { value: 'inventory', label: t('itemList') },
                          { value: 'transfer', label: t('transfers') }
                      ]}
                  />
              );
          }
          if (activeCollection === 'notes') {
              return (
                  <CustomSelect
                      value={editForm[key] || ''}
                      onChange={val => handleInputChange(key, val, false)}
                      options={[
                          { value: 'Incident', label: t('Incident') },
                          { value: 'Plan', label: t('Plan') },
                          { value: 'General', label: t('General') }
                      ]}
                  />
              );
          }
      }

      // Store Order Status dropdown
      if (key === 'status' && activeCollection === 'storeOrders') {
          return (
              <CustomSelect
                  value={editForm[key] || ''}
                  onChange={val => handleInputChange(key, val, false)}
                  options={[
                      { value: 'Pending', label: t('pending') },
                      { value: 'Completed', label: t('completed') }
                  ]}
              />
          );
      }

      // Note content text area
      if (key === 'content' && activeCollection === 'notes') {
          return (
              <textarea
                  className="w-full bg-slate-800 border border-gray-600 rounded p-3 text-white focus:border-blue-500 outline-none transition h-32 resize-y font-sans"
                  value={editForm[key] !== undefined && editForm[key] !== null ? editForm[key] : ''}
                  onChange={e => handleInputChange(key, e.target.value, false)}
              />
          );
      }

      // Default text / number input
      return (
          <input 
              type={isNumericField ? "number" : "text"}
              className="w-full bg-slate-800 border border-gray-600 rounded p-3 text-white focus:border-blue-500 outline-none transition"
              value={editForm[key] !== undefined && editForm[key] !== null ? editForm[key] : ''}
              onChange={e => handleInputChange(key, e.target.value, isNumericField)}
              onBlur={() => {
                  if (isNumericField) {
                      setEditForm((prev: any) => {
                          const val = prev[key];
                          if (val === '' || val === null || val === undefined) {
                              return { ...prev, [key]: 0 };
                          }
                          const num = Number(val);
                          return { ...prev, [key]: isNaN(num) ? 0 : num };
                      });
                  }
              }}
          />
      );
  };

  return (
    <div className="flex h-full bg-slate-900 overflow-hidden relative">
      
      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({...prev, isOpen: false}))}
        isDanger={confirmDialog.isDanger}
        type={confirmDialog.type}
        confirmText={confirmDialog.confirmText || (confirmDialog.type === 'alert' ? 'OK' : t('confirm'))}
        cancelText={t('cancel')}
      />

      {msg && (
        <div className="fixed top-10 left-1/2 transform -translate-x-1/2 z-[200] w-[90%] max-w-md animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-green-900/90 border-l-4 border-green-500 text-white p-4 rounded-r-lg shadow-2xl backdrop-blur-md flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-green-500/20 p-2 rounded-full">
                        <CheckCircle size={24} className="text-green-400" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg">{t('successTitle')}</h4>
                        <p className="text-sm text-green-200">{msg}</p>
                    </div>
                </div>
            </div>
        </div>
      )}

      {complexEditField && (
          <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-slate-900 border border-gold-500 rounded-lg shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col">
                  <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-black/20">
                      <h3 className="text-gold-500 font-bold flex items-center gap-2"><Code size={18}/> {t('jsonEditor')}: <span className="text-white">{complexEditField.key}</span></h3>
                      <button onClick={() => setComplexEditField(null)} className="text-gray-400 hover:text-white"><X size={20}/></button>
                  </div>
                  <div className="flex-1 p-0 overflow-hidden relative">
                      <textarea
                        className="w-full h-full bg-slate-950 text-green-400 font-mono text-sm p-4 outline-none resize-none"
                        value={complexEditField.value}
                        onChange={e => setComplexEditField({ ...complexEditField, value: e.target.value })}
                        spellCheck={false}
                      />
                  </div>
                  <div className="p-4 border-t border-gray-700 flex justify-end bg-black/20">
                      <button onClick={saveComplexEditor} className="bg-gold-500 hover:bg-gold-600 text-black font-bold py-2 px-6 rounded shadow-lg transition">{t('applyJsonChanges')}</button>
                  </div>
              </div>
          </div>
      )}

      <aside 
        className={`absolute top-0 left-0 z-50 bg-military-900 border-r border-b border-military-700 shadow-2xl transition-all duration-300 transform rounded-br-xl h-fit max-h-[calc(100vh-40px)] md:relative md:top-auto md:left-auto md:translate-x-0 md:h-fit md:max-h-[calc(100vh-140px)] md:rounded-br-xl ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-0 md:w-0 overflow-hidden'}`}
      >
         <div className="p-4 border-b border-military-800 flex justify-between items-center">
             <h3 className="text-white font-bold uppercase tracking-wider flex items-center gap-2 text-sm"><Database size={16} className="text-gold-500"/> {t('collections')}</h3>
             <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400"><X size={20}/></button>
         </div>
         <div className="overflow-y-auto scroll-smooth h-fit max-h-[calc(100vh-160px)] md:h-auto md:max-h-[calc(100vh-210px)] p-3 space-y-4 pb-6 custom-scrollbar">
             {Object.entries(groupedCollections).map(([cat, cols]) => (
                 <div key={cat}>
                     <h4 className="px-3 mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{cat}</h4>
                     <div className="space-y-1">
                         {cols.map(col => (
                             <button
                                key={col.key}
                                onClick={() => { setActiveCollection(col.key as any); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeCollection === col.key ? 'bg-gold-500 text-black shadow-lg font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                             >
                                  <col.icon size={16} />
                                  <span className="truncate">{col.label}</span>
                                  {activeCollection === col.key && <ChevronRight size={14} className="ml-auto opacity-50"/>}
                             </button>
                         ))}
                     </div>
                 </div>
             ))}
         </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-900">
          <header className="bg-military-800 border-b border-military-700 p-4 flex flex-col sm:flex-row sm:items-center gap-4 z-40 shadow-md">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                  <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-400 hover:text-white p-2 hover:bg-white/5 rounded-lg transition shrink-0">
                      {isSidebarOpen ? <PanelLeftClose size={20}/> : <PanelLeftOpen size={20}/>}
                  </button>
                  
                  <div className="flex-1 sm:flex-none">
                       <h2 className="text-white font-bold text-lg flex items-center justify-between sm:justify-start gap-2">
                           <span>{activeCollectionLabel}</span>
                           <span className="bg-military-900 text-gray-400 text-xs px-2 py-0.5 rounded-full border border-gray-700 ml-auto sm:ml-0">{items.length} {t('records')}</span>
                       </h2>
                  </div>
              </div>

              <div className="relative group w-full sm:w-48 md:w-64 sm:ml-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold-500" size={16} />
                  <input 
                    className="w-full bg-black/20 border border-gray-600 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:border-gold-500 outline-none transition"
                    placeholder={t('searchRecords')}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                  />
              </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
               {filteredItems.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-60">
                       <Filter size={64} className="mb-4"/>
                       <p className="text-lg font-bold">{t('noRecordsFound')}</p>
                       <p className="text-sm">{t('changeQueryHint')}</p>
                   </div>
               ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                       {filteredItems.map((item, idx) => (
                           <div key={item.id || idx} className="bg-military-900 border border-military-700 rounded-xl p-4 shadow-lg hover:border-gold-500/50 transition group flex flex-col relative">
                               <div className="flex justify-between items-start mb-3 border-b border-white/5 pb-2">
                                   <div className="font-mono text-[10px] text-gray-500 truncate" title={item.id}>ID: {item.id}</div>
                                   <div className="flex gap-1">
                                       <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded transition"><Edit size={14}/></button>
                                       <button onClick={() => requestDelete(item.id)} className="p-1.5 text-red-400 hover:bg-red-900/30 rounded transition"><Trash2 size={14}/></button>
                                   </div>
                               </div>
                               
                               <div className="flex-1 space-y-1.5 mb-2 overflow-hidden">
                                   {Object.entries(item).filter(([k]) => k !== 'id').slice(0, 5).map(([key, val]) => (
                                       <div key={key} className="grid grid-cols-3 gap-2 text-xs">
                                           <span className="text-gray-500 font-bold uppercase truncate text-[10px] pt-0.5">
                                               {getFieldLabel(key, activeCollection)}
                                           </span>
                                           <span className="col-span-2 text-gray-300 truncate font-mono">
                                               {getFieldValue(key, val, item, activeCollection)}
                                           </span>
                                       </div>
                                   ))}
                               </div>
                           </div>
                       ))}
                   </div>
               )}
          </div>
      </main>

      {editingId && (
          <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
               <div className="bg-slate-900 border border-blue-500 rounded-xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col">
                   <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-military-800 rounded-t-xl">
                       <h3 className="text-white font-bold text-lg flex items-center gap-2"><Edit size={20} className="text-blue-500"/> {t('editRecord')}</h3>
                       <button onClick={() => { setEditingId(null); setEditForm({}); }} className="text-gray-400 hover:text-white"><X size={24}/></button>
                   </div>
                   
                   <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-900">
                       <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded text-blue-300 text-xs flex gap-2 items-center mb-4">
                           <AlertTriangle size={16}/> {t('dbEditCaution')}
                       </div>

                       {Object.keys(editForm).map((key) => (
                           <div key={key} className="space-y-1">
                               <label className="text-xs text-gray-400 font-bold uppercase ml-1 block">
                                   {getFieldLabel(key, activeCollection)}
                               </label>
                               {renderEditControl(key)}
                           </div>
                       ))}
                   </div>

                   <div className="p-4 border-t border-gray-700 flex justify-end gap-3 bg-military-800 rounded-b-xl">
                       <button onClick={() => { setEditingId(null); setEditForm({}); }} className="px-5 py-2.5 text-gray-400 hover:text-white font-bold">{t('cancel')}</button>
                       <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-8 rounded shadow-lg transition flex items-center gap-2">
                           <Save size={18}/> {t('saveChanges')}
                       </button>
                   </div>
               </div>
          </div>
      )}

    </div>
  );
};

export default DataEditor;

