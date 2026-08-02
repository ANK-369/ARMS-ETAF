
import React, { useState } from 'react';
import { getDB, smartUpsertItem, findPotentialMatch } from '../services/db';
import { Command, ManpowerType, RANK_OPTIONS, MEASUREMENT_OPTIONS } from '../types';
import { ETHIOPIAN_MONTHS, ETHIOPIAN_MONTHS_AMHARIC, getCurrentEthiopianDate } from '../services/ethiopianDate';
import EthiopianDatePicker from '../components/EthiopianDatePicker';
import DataTools from '../components/DataTools';
import { Users, Package, Gift, ArrowRightLeft, CheckCircle } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import GroupedRankSelect from '../components/GroupedRankSelect';
import SmartInput from '../components/SmartInput';
import DuplicateResolutionModal from '../components/DuplicateResolutionModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useDate } from '../contexts/DateContext';

const Income: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'manpower' | 'item' | 'subsidy' | 'transfer'>('manpower');
  const [msg, setMsg] = useState('');
  const [forceUpdate, setForceUpdate] = useState(0); 
  const { t, language } = useLanguage();
  const { month: selectedMonth, year: selectedYear } = useDate();

  // Sync form dates with selected global date context
  React.useEffect(() => {
    if (selectedYear && selectedMonth) {
      const defaultDate = (() => {
        const current = getCurrentEthiopianDate();
        const [cY, cM, cD] = current.split('-');
        if (selectedYear === cY && selectedMonth === cM) {
          return current;
        }
        return `${selectedYear}-${selectedMonth}-01`;
      })();

      setManpowerForm(prev => ({
        ...prev,
        startDate: defaultDate,
        endDate: defaultDate
      }));

      setItemForm(prev => ({
        ...prev,
        date: defaultDate
      }));

      setSubsidyForm(prev => ({
        ...prev,
        date: defaultDate
      }));

      const mIndex = parseInt(selectedMonth) - 1;
      const selectedMonthName = ETHIOPIAN_MONTHS[mIndex] || '';
      setTransferForm(prev => ({
        ...prev,
        dateTo: selectedMonthName
      }));
    }
  }, [selectedYear, selectedMonth]);

  const [dupModal, setDupModal] = useState<{isOpen: boolean, reason: string, item: any}>({ isOpen: false, reason: '', item: null });

  const [manpowerForm, setManpowerForm] = useState({
    firstName: '', lastName: '', rank: '', command: '' as Command, type: ManpowerType.PAYROLL, 
    startDate: getCurrentEthiopianDate(), endDate: getCurrentEthiopianDate(), description: '', amount: 0
  });

  const [itemForm, setItemForm] = useState({
    name: '', measurement: '', amount: 0, singlePrice: 0, description: '', 
    date: getCurrentEthiopianDate()
  });

  const [subsidyForm, setSubsidyForm] = useState({
    type: 'Financial', itemName: '', source: '', amount: 0, measurement: 'Birr', description: '', 
    date: getCurrentEthiopianDate()
  });

  const [transferForm, setTransferForm] = useState({
    amount: 0, dateFrom: '', dateTo: '', description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = Math.random().toString(36).substr(2, 9);
    
    let collection: any = '';
    let itemToSave: any = null;

    if (activeTab === 'manpower') {
      collection = 'manpower';
      itemToSave = { id, ...manpowerForm };
    } else if (activeTab === 'item') {
      collection = 'incomeItems';
      itemToSave = { id, ...itemForm };
    } else if (activeTab === 'subsidy') {
      collection = 'subsidies';
      const finalSubsidy = { ...subsidyForm };
      if (finalSubsidy.type === 'Financial') finalSubsidy.measurement = 'Birr';
      itemToSave = { id, ...finalSubsidy };
    } else if (activeTab === 'transfer') {
      collection = 'transfers';
      itemToSave = { id, ...transferForm };
    }

    // Check for Duplicates
    const check = findPotentialMatch(collection, itemToSave);
    if (check.found) {
        setDupModal({ isOpen: true, reason: check.reason, item: itemToSave });
        return; 
    }

    // Proceed if no duplicates
    saveItem(collection, itemToSave, false);
  };

  const saveItem = (collection: any, item: any, forceNew: boolean) => {
      smartUpsertItem(collection, item, forceNew);
      setMsg(t('successTitle'));
      setForceUpdate(p => p + 1);
      
      // --- CLEAR INPUT FIELDS (PRESERVING STICKY FIELDS) ---
      if (activeTab === 'manpower') {
          setManpowerForm(prev => ({
              ...prev,
              firstName: '', 
              lastName: '', 
              amount: 0,
              description: ''
              // Keeps: rank, command, type, startDate, endDate
          }));
      } else if (activeTab === 'item') {
          setItemForm(prev => ({
              ...prev,
              name: '',
              amount: 0,
              singlePrice: 0,
              description: ''
              // Keeps: measurement, date
          }));
      } else if (activeTab === 'subsidy') {
          setSubsidyForm(prev => ({
              ...prev,
              itemName: '',
              source: '',
              amount: 0,
              description: ''
              // Keeps: type, measurement, date
          }));
      } else if (activeTab === 'transfer') {
          setTransferForm(prev => ({
              ...prev,
              amount: 0,
              description: ''
              // Keeps: dateFrom, dateTo
          }));
      }

      setTimeout(() => setMsg(''), 3000);
      setDupModal({ isOpen: false, reason: '', item: null });
  };

  const getDbKey = () => {
      if (activeTab === 'manpower') return 'manpower';
      if (activeTab === 'item') return 'incomeItems';
      if (activeTab === 'subsidy') return 'subsidies';
      return 'transfers';
  };

  const getCurrentData = () => {
      const db = getDB();
      const filterPrefix = `${selectedYear}-${selectedMonth}`;
      
      if (activeTab === 'manpower') {
          // Manpower filter by overlap
          const mStart = `${filterPrefix}-01`;
          const mEnd = `${filterPrefix}-30`;
          return db.manpower.filter(m => m.startDate <= mEnd && m.endDate >= mStart);
      }
      
      if (activeTab === 'item') return db.incomeItems.filter(i => i.date && i.date.startsWith(filterPrefix));
      if (activeTab === 'subsidy') return db.subsidies.filter(s => s.date && s.date.startsWith(filterPrefix));
      
      // Transfers usually dateTo matches month name, or if they have a date field
      const mIndex = parseInt(selectedMonth) - 1;
      const mName = ETHIOPIAN_MONTHS[mIndex];
      return db.transfers.filter(t => t.dateTo === mName);
  };

  const InputClass = "w-full bg-slate-800 border border-military-700 rounded-lg p-3 text-white focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition mb-4 placeholder-gray-600";
  const LabelClass = "block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2";

  const TABS = [
    { id: 'manpower', label: t('manpower'), icon: Users },
    { id: 'item', label: t('itemSold'), icon: Package },
    { id: 'subsidy', label: t('subsidyRecord'), icon: Gift },
    { id: 'transfer', label: t('budgetTransfer'), icon: ArrowRightLeft },
  ];

  // Month options with localization
  const monthOptions = ETHIOPIAN_MONTHS.map((m, i) => ({
      value: m,
      label: language === 'am' ? ETHIOPIAN_MONTHS_AMHARIC[i] : m
  }));

  return (
    <div className="max-w-5xl mx-auto pb-12 relative">
      <DuplicateResolutionModal 
        isOpen={dupModal.isOpen}
        matchReason={dupModal.reason}
        onMerge={() => saveItem(getDbKey(), dupModal.item, false)}
        onCreateNew={() => saveItem(getDbKey(), dupModal.item, true)}
        onCancel={() => setDupModal({isOpen: false, reason: '', item: null})}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6 border-b border-military-700 pb-6">
        <div>
            <h2 className="text-3xl text-gold-500 font-bold font-serif tracking-wide">{t('incomeManagement')}</h2>
            <p className="text-gray-400 text-sm mt-1">{t('incomeSubtitle')}</p>
        </div>
        <DataTools data={getCurrentData()} sectionName={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} dbKey={getDbKey()} onImportSuccess={() => setForceUpdate(p => p + 1)}/>
      </div>
      
      {/* Mobile Nav */}
      <div className="md:hidden mb-6 relative z-30">
          <CustomSelect 
            value={activeTab}
            onChange={(val) => setActiveTab(val)}
            options={TABS.map(t => ({ value: t.id, label: t.label }))}
            className="w-full font-bold"
          />
      </div>

      {/* Desktop Nav */}
      <div className="hidden md:flex space-x-2 border-b border-military-700 overflow-x-auto scrollbar-hide pb-2 mb-8">
        {TABS.map((tab) => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold uppercase text-sm tracking-wider transition-all duration-300 flex-none
            ${activeTab === tab.id 
                ? 'bg-gold-500 text-black shadow-[0_-5px_15px_rgba(212,175,55,0.2)]' 
                : 'bg-military-800/50 text-gray-400 hover:text-white hover:bg-military-800'
            }`}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* FIXED POPUP SUCCESS MESSAGE */}
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

      <form onSubmit={handleSubmit} className="bg-military-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-military-700 relative overflow-visible">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 rounded-full blur-3xl -z-10"></div>
        
        {activeTab === 'manpower' && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Users className="text-blue-400"/> {t('manpowerEntry')}</h3>
            <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded mb-4 text-xs text-blue-300">
                <strong>{t('duplicateCheck')}</strong>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                  <label className={LabelClass}>{t('firstName')}</label>
                  <SmartInput collection="manpower" field="firstName" className={InputClass} value={manpowerForm.firstName} onChange={e => setManpowerForm({...manpowerForm, firstName: e.target.value})} required />
              </div>
              <div>
                  <label className={LabelClass}>{t('lastName')}</label>
                  <SmartInput collection="manpower" field="lastName" className={InputClass} value={manpowerForm.lastName} onChange={e => setManpowerForm({...manpowerForm, lastName: e.target.value})} required />
              </div>
            </div>
            
            <div className="mb-4">
              <label className={LabelClass}>{t('command')}</label>
              <CustomSelect 
                value={manpowerForm.command}
                onChange={val => setManpowerForm(prev => ({
                  ...prev,
                  command: val,
                  rank: '' // Reset rank when command changes
                }))}
                options={Object.values(Command).map(c => ({ value: c, label: t(c) }))}
                placeholder={t('selectCommand')}
              />
            </div>

            <div className="mb-4">
              <label className={LabelClass}>{t('rank')}</label>
              <GroupedRankSelect 
                value={manpowerForm.rank}
                command={manpowerForm.command}
                onChange={val => setManpowerForm(prev => ({ ...prev, rank: val }))}
                placeholder={t('selectRank')}
              />
            </div>

            <div className="mb-4">
              <label className={LabelClass}>{t('type')}</label>
              <CustomSelect 
                value={manpowerForm.type}
                onChange={val => setManpowerForm(prev => ({ ...prev, type: val }))}
                options={Object.values(ManpowerType)
                  .filter(v => v !== ManpowerType.PENSION)
                  .map(v => ({ value: v, label: t(v) }))
                }
              />
            </div>
            
            <label className={LabelClass}>{t('amountBirr')}</label><input type="number" className={InputClass} value={manpowerForm.amount || ''} placeholder="3000" onFocus={(e) => e.target.select()} onChange={e => setManpowerForm({...manpowerForm, amount: Number(e.target.value)})} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div><label className={LabelClass}>{t('startDate')}</label><EthiopianDatePicker className="mb-4" value={manpowerForm.startDate} onChange={val => setManpowerForm({...manpowerForm, startDate: val})} /></div>
               <div><label className={LabelClass}>{t('endDate')}</label><EthiopianDatePicker className="mb-4" value={manpowerForm.endDate} onChange={val => setManpowerForm({...manpowerForm, endDate: val})} /></div>
            </div>
             <label className={LabelClass}>{t('description')}</label><textarea className={InputClass} value={manpowerForm.description} onChange={e => setManpowerForm({...manpowerForm, description: e.target.value})} />
          </div>
        )}

        {activeTab === 'item' && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Package className="text-green-400"/> {t('itemSalesEntry')}</h3>
            <div className="bg-green-900/20 border border-green-500/30 p-3 rounded mb-4 text-xs text-green-300">
                <strong>{t('smartMerge')}</strong>
            </div>
            <label className={LabelClass}>{t('itemName')}</label>
            <SmartInput collection="incomeItems" field="name" required className={InputClass} value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div><label className={LabelClass}>{t('amount')}</label><input required type="number" className={InputClass} value={itemForm.amount || ''} placeholder="0" onFocus={(e) => e.target.select()} onChange={e => setItemForm({...itemForm, amount: Number(e.target.value)})} /></div>
              <div>
                <label className={LabelClass}>{t('unit')}</label>
                <CustomSelect 
                  value={itemForm.measurement}
                  onChange={(val) => setItemForm({...itemForm, measurement: val})}
                  options={MEASUREMENT_OPTIONS.map(opt => ({ 
                    value: opt, 
                    label: opt === 'Others' ? t('otherMeasurement') : t(opt) 
                  }))}
                  placeholder={t('selectUnit')}
                />
              </div>
              <div><label className={LabelClass}>{t('singlePrice')}</label><input required type="number" className={InputClass} value={itemForm.singlePrice || ''} placeholder="0" onFocus={(e) => e.target.select()} onChange={e => setItemForm({...itemForm, singlePrice: Number(e.target.value)})} /></div>
            </div>
            <label className={LabelClass}>{t('dateSold')}</label><EthiopianDatePicker className="mb-4" value={itemForm.date} onChange={val => setItemForm({...itemForm, date: val})} />
            <label className={LabelClass}>{t('description')}</label><textarea className={InputClass} value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} placeholder={t('notesPlaceholder')} />
          </div>
        )}

        {activeTab === 'subsidy' && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
             <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Gift className="text-gold-400"/> {t('subsidyRecord')}</h3>
             <label className={LabelClass}>{t('subsidyType')}</label>
             <div className="mb-4">
                 <CustomSelect 
                    value={subsidyForm.type}
                    onChange={val => {
                        setSubsidyForm({
                            ...subsidyForm, 
                            type: val, 
                            measurement: val === 'Financial' ? 'Birr' : ''
                        });
                    }}
                    options={[
                      { value: 'Financial', label: t('subsidyFinancial') },
                      { value: 'Food', label: t('subsidyFood') }
                    ]}
                 />
             </div>
             
             {subsidyForm.type === 'Food' && (
                <div>
                    <label className={LabelClass}>{t('itemName')}</label>
                    <SmartInput collection="subsidies" field="itemName" required className={InputClass} value={subsidyForm.itemName || ''} onChange={e => setSubsidyForm({...subsidyForm, itemName: e.target.value})} placeholder={t('egRice')} />
                </div>
             )}
             <label className={LabelClass}>{t('source')}</label>
             <SmartInput collection="subsidies" field="source" required className={InputClass} value={subsidyForm.source} onChange={e => setSubsidyForm({...subsidyForm, source: e.target.value})} />
             
             <label className={LabelClass}>{t('amount')}</label><input required type="number" className={InputClass} value={subsidyForm.amount || ''} placeholder="0" onFocus={(e) => e.target.select()} onChange={e => setSubsidyForm({...subsidyForm, amount: Number(e.target.value)})} />
             
             {/* CONDITIONAL UNIT INPUT - HIDDEN IF FINANCIAL */}
             {subsidyForm.type !== 'Financial' && (
               <>
                 <label className={LabelClass}>{t('unit')}</label>
                 <div className="mb-4">
                    <CustomSelect 
                       value={subsidyForm.measurement}
                       onChange={val => setSubsidyForm({...subsidyForm, measurement: val})}
                       options={MEASUREMENT_OPTIONS.map(opt => ({ 
                          value: opt, 
                          label: opt === 'Others' ? t('otherMeasurement') : t(opt) 
                       }))}
                       placeholder={t('selectUnit')}
                    />
                 </div>
               </>
             )}
             
             <label className={LabelClass}>{t('dateReceived')}</label><EthiopianDatePicker className="mb-4" value={subsidyForm.date} onChange={val => setSubsidyForm({...subsidyForm, date: val})} />
             <label className={LabelClass}>{t('description')}</label><textarea className={InputClass} value={subsidyForm.description} onChange={e => setSubsidyForm({...subsidyForm, description: e.target.value})} />
          </div>
        )}

        {activeTab === 'transfer' && (
           <div className="animate-in fade-in slide-in-from-right duration-300">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><ArrowRightLeft className="text-purple-400"/> {t('budgetTransfer')}</h3>
              <label className={LabelClass}>{t('amountTransferred')}</label><input required type="number" className={InputClass} value={transferForm.amount || ''} placeholder="0" onFocus={(e) => e.target.select()} onChange={e => setTransferForm({...transferForm, amount: Number(e.target.value)})} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                    <label className={LabelClass}>{t('monthFrom')}</label>
                    <CustomSelect 
                        value={transferForm.dateFrom}
                        onChange={val => setTransferForm({...transferForm, dateFrom: val})}
                        options={monthOptions}
                        placeholder={t('selectMonth')}
                    />
                </div>
                <div>
                    <label className={LabelClass}>{t('monthTo')}</label>
                    <CustomSelect 
                        value={transferForm.dateTo}
                        onChange={val => setTransferForm({...transferForm, dateTo: val})}
                        options={monthOptions}
                        placeholder={t('selectMonth')}
                    />
                </div>
              </div>
              <label className={LabelClass}>{t('description')}</label><textarea className={InputClass} value={transferForm.description} onChange={e => setTransferForm({...transferForm, description: e.target.value})} />
           </div>
        )}

        <button type="submit" className="w-full bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-black font-bold py-4 px-6 rounded-lg transition-all duration-300 shadow-[0_4px_14px_0_rgba(212,175,55,0.39)] hover:shadow-[0_6px_20px_rgba(212,175,55,0.23)] hover:-translate-y-1 mt-6">
            {t('confirmSave')}
        </button>
      </form>
    </div>
  );
};

export default Income;
