
import React, { useState } from 'react';
import { getDB, smartUpsertItem, findPotentialMatch } from '../services/db';
import { Command, RANK_OPTIONS, MEASUREMENT_OPTIONS } from '../types';
import { getCurrentEthiopianDate } from '../services/ethiopianDate';
import EthiopianDatePicker from '../components/EthiopianDatePicker';
import DataTools from '../components/DataTools';
import { ShoppingCart, Briefcase, Layers, RotateCcw, CheckCircle } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import GroupedRankSelect from '../components/GroupedRankSelect';
import SmartInput from '../components/SmartInput';
import DuplicateResolutionModal from '../components/DuplicateResolutionModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useDate } from '../contexts/DateContext';

const Expenditure: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'market' | 'wage' | 'other' | 'refund'>('market');
  const [msg, setMsg] = useState('');
  const [forceUpdate, setForceUpdate] = useState(0);
  const { t } = useLanguage();
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

      setMarketForm(prev => ({
        ...prev,
        date: defaultDate
      }));

      setWageForm(prev => ({
        ...prev,
        date: defaultDate
      }));

      setOtherForm(prev => ({
        ...prev,
        date: defaultDate
      }));

      setRefundForm(prev => ({
        ...prev,
        stopDate: defaultDate
      }));
    }
  }, [selectedYear, selectedMonth]);

  const [dupModal, setDupModal] = useState<{isOpen: boolean, reason: string, item: any}>({ isOpen: false, reason: '', item: null });

  const [marketForm, setMarketForm] = useState({
    itemName: '', measurement: '', amount: 0, singlePrice: 0, description: '', 
    date: getCurrentEthiopianDate()
  });

  const [wageForm, setWageForm] = useState({
    workerName: '', workerPosition: '', amount: 0, description: '', 
    date: getCurrentEthiopianDate()
  });

  const [otherForm, setOtherForm] = useState({
    reason: '', amount: 0, description: '', 
    date: getCurrentEthiopianDate()
  });

  const [refundForm, setRefundForm] = useState({
    firstName: '', lastName: '', rank: '', command: '' as Command, amount: 0, 
    stopDate: getCurrentEthiopianDate(), description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = Math.random().toString(36).substr(2, 9);
    
    let collection: any = '';
    let itemToSave: any = null;

    if (activeTab === 'market') {
        collection = 'expenses';
        itemToSave = { id, category: 'Market', ...marketForm };
    } else if (activeTab === 'wage') {
        collection = 'expenses';
        itemToSave = { id, category: 'Wage', ...wageForm };
    } else if (activeTab === 'other') {
        collection = 'expenses';
        itemToSave = { id, category: 'Other', ...otherForm };
    } else if (activeTab === 'refund') {
        collection = 'refunds';
        itemToSave = { id, ...refundForm };
    }

    const check = findPotentialMatch(collection, itemToSave);
    if (check.found) {
        setDupModal({ isOpen: true, reason: check.reason, item: itemToSave });
        return; 
    }

    saveItem(collection, itemToSave, false);
  };

  const saveItem = (collection: any, item: any, forceNew: boolean) => {
      smartUpsertItem(collection, item, forceNew);
      setMsg(t('successTitle'));
      
      // Reset logic - Preserve Sticky Fields (Date, Measurement for Market)
      if (activeTab === 'market') {
          setMarketForm(p => ({ 
              ...p, 
              itemName: '', 
              amount: 0, 
              singlePrice: 0, 
              description: '' 
              // measurement and date preserved
          }));
      }
      else if (activeTab === 'wage') {
          setWageForm(p => ({ 
              ...p, 
              workerName: '', 
              workerPosition: '',
              amount: 0, 
              description: '' 
              // date preserved
          }));
      }
      else if (activeTab === 'other') {
          setOtherForm(p => ({ 
              ...p, 
              reason: '', 
              amount: 0, 
              description: '' 
              // date preserved
          }));
      }
      else if (activeTab === 'refund') {
          setRefundForm(p => ({ 
              ...p, 
              firstName: '', 
              lastName: '', 
              amount: 0, 
              description: '' 
              // rank, command, stopDate preserved
          }));
      }

      setForceUpdate(p => p + 1);
      setTimeout(() => setMsg(''), 3000);
      setDupModal({ isOpen: false, reason: '', item: null });
  };

  const getDbKey = () => {
      if (activeTab === 'refund') return 'refunds';
      return 'expenses';
  };

  const getCurrentData = () => {
      const db = getDB();
      const filterPrefix = `${selectedYear}-${selectedMonth}`;

      if (activeTab === 'refund') return db.refunds.filter(r => r.stopDate && r.stopDate.startsWith(filterPrefix));
      
      const filteredExpenses = db.expenses.filter(e => e.date && e.date.startsWith(filterPrefix));
      
      if (activeTab === 'market') return filteredExpenses.filter(e => e.category === 'Market');
      if (activeTab === 'wage') return filteredExpenses.filter(e => e.category === 'Wage');
      if (activeTab === 'other') return filteredExpenses.filter(e => e.category === 'Other');
      
      return filteredExpenses;
  };

  const InputClass = "w-full bg-slate-800 border border-military-700 rounded-lg p-3 text-white focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition mb-4 placeholder-gray-600";
  const LabelClass = "block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2";

  const TABS = [
    { id: 'market', label: t('market'), icon: ShoppingCart },
    { id: 'wage', label: t('wage'), icon: Briefcase },
    { id: 'other', label: t('operationalExpense'), icon: Layers },
    { id: 'refund', label: t('refunds'), icon: RotateCcw },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <DuplicateResolutionModal 
        isOpen={dupModal.isOpen}
        matchReason={dupModal.reason}
        onMerge={() => saveItem(getDbKey(), dupModal.item, false)}
        onCreateNew={() => saveItem(getDbKey(), dupModal.item, true)}
        onCancel={() => setDupModal({isOpen: false, reason: '', item: null})}
      />

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

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6 border-b border-military-700 pb-6">
        <div>
            <h2 className="text-3xl text-gold-500 font-bold font-serif tracking-wide">{t('expenditureManagement')}</h2>
            <p className="text-gray-400 text-sm mt-1">{t('expenditureSubtitle')}</p>
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

      <form onSubmit={handleSubmit} className="bg-military-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-military-700 relative overflow-visible">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-blue-900/10 rounded-full blur-3xl -z-10"></div>
        
        {activeTab === 'market' && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
             <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><ShoppingCart className="text-red-400"/> {t('marketPurchase')}</h3>
             <div className="bg-red-900/20 border border-red-500/30 p-3 rounded mb-4 text-xs text-red-300">
                <strong>{t('marketMergeMsg')}</strong>
            </div>
             <label className={LabelClass}>{t('itemName')}</label>
             <SmartInput collection="expenses" field="itemName" required className={InputClass} value={marketForm.itemName} onChange={e => setMarketForm({...marketForm, itemName: e.target.value})} />
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div><label className={LabelClass}>{t('quantity')}</label><input required type="number" className={InputClass} value={marketForm.amount || ''} onChange={e => setMarketForm({...marketForm, amount: Number(e.target.value)})} placeholder="0" onFocus={(e) => e.target.select()} /></div>
                <div>
                    <label className={LabelClass}>{t('unit')}</label>
                    <CustomSelect 
                      value={marketForm.measurement}
                      onChange={val => setMarketForm({...marketForm, measurement: val})}
                      options={MEASUREMENT_OPTIONS.map(opt => ({ 
                        value: opt, 
                        label: opt === 'Others' ? t('otherMeasurement') : t(opt) 
                      }))}
                      placeholder={t('selectUnit')}
                    />
                </div>
                <div><label className={LabelClass}>{t('singlePrice')}</label><input required type="number" className={InputClass} value={marketForm.singlePrice || ''} onChange={e => setMarketForm({...marketForm, singlePrice: Number(e.target.value)})} placeholder="0" onFocus={(e) => e.target.select()} /></div>
             </div>
             <label className={LabelClass}>{t('date')}</label><EthiopianDatePicker className="mb-4" value={marketForm.date} onChange={val => setMarketForm({...marketForm, date: val})} />
             <label className={LabelClass}>{t('description')}</label><textarea className={InputClass} value={marketForm.description} onChange={e => setMarketForm({...marketForm, description: e.target.value})} />
          </div>
        )}

        {activeTab === 'wage' && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
             <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Briefcase className="text-blue-400"/> {t('wagePayment')}</h3>
             <label className={LabelClass}>{t('workerName')}</label>
             <SmartInput collection="expenses" field="workerName" required className={InputClass} value={wageForm.workerName} onChange={e => setWageForm({...wageForm, workerName: e.target.value})} />
             
             <label className={LabelClass}>{t('positionJob')}</label><input className={InputClass} value={wageForm.workerPosition} onChange={e => setWageForm({...wageForm, workerPosition: e.target.value})} />
             <label className={LabelClass}>{t('paymentAmount')}</label><input required type="number" className={InputClass} value={wageForm.amount || ''} onChange={e => setWageForm({...wageForm, amount: Number(e.target.value)})} onFocus={(e) => e.target.select()} />
             <label className={LabelClass}>{t('date')}</label><EthiopianDatePicker className="mb-4" value={wageForm.date} onChange={val => setWageForm({...wageForm, date: val})} />
             <label className={LabelClass}>{t('description')}</label><textarea className={InputClass} value={wageForm.description} onChange={e => setWageForm({...wageForm, description: e.target.value})} />
          </div>
        )}

        {activeTab === 'other' && (
            <div className="animate-in fade-in slide-in-from-right duration-300">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Layers className="text-purple-400"/> {t('operationalExpense')}</h3>
                <label className={LabelClass}>{t('reasonTitle')}</label>
                <SmartInput collection="expenses" field="reason" required className={InputClass} value={otherForm.reason} onChange={e => setOtherForm({...otherForm, reason: e.target.value})} />
                
                <label className={LabelClass}>{t('amountBirr')}</label><input required type="number" className={InputClass} value={otherForm.amount || ''} onChange={e => setOtherForm({...otherForm, amount: Number(e.target.value)})} onFocus={(e) => e.target.select()} />
                <label className={LabelClass}>{t('date')}</label><EthiopianDatePicker className="mb-4" value={otherForm.date} onChange={val => setOtherForm({...otherForm, date: val})} />
                <label className={LabelClass}>{t('description')}</label><textarea className={InputClass} value={otherForm.description} onChange={e => setOtherForm({...otherForm, description: e.target.value})} />
            </div>
        )}

        {activeTab === 'refund' && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
             <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><RotateCcw className="text-orange-400"/> {t('refundIssuance')}</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className={LabelClass}>{t('firstName')}</label>
                    <SmartInput collection="manpower" field="firstName" className={InputClass} value={refundForm.firstName} onChange={e => setRefundForm({...refundForm, firstName: e.target.value})} required />
                </div>
                <div>
                    <label className={LabelClass}>{t('lastName')}</label>
                    <SmartInput collection="manpower" field="lastName" className={InputClass} value={refundForm.lastName} onChange={e => setRefundForm({...refundForm, lastName: e.target.value})} required />
                </div>
             </div>
             
             <div className="mb-4">
               <label className={LabelClass}>{t('command')}</label>
               <CustomSelect 
                  value={refundForm.command}
                  onChange={val => setRefundForm(prev => ({
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
                  value={refundForm.rank}
                  command={refundForm.command}
                  onChange={val => setRefundForm(prev => ({ ...prev, rank: val }))}
                  placeholder={t('selectRank')}
               />
             </div>

             <label className={LabelClass}>{t('refundAmount')}</label><input required type="number" className={InputClass} value={refundForm.amount || ''} onChange={e => setRefundForm({...refundForm, amount: Number(e.target.value)})} onFocus={(e) => e.target.select()} />
             <label className={LabelClass}>{t('refundDate')}</label><EthiopianDatePicker className="mb-4" value={refundForm.stopDate} onChange={val => setRefundForm({...refundForm, stopDate: val})} />
             <label className={LabelClass}>{t('description')}</label><textarea className={InputClass} value={refundForm.description} onChange={e => setRefundForm({...refundForm, description: e.target.value})} />
          </div>
        )}

        <button type="submit" className="w-full bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-black font-bold py-4 px-6 rounded-lg transition-all duration-300 shadow-[0_4px_14px_0_rgba(212,175,55,0.39)] hover:shadow-[0_6px_20px_rgba(212,175,55,0.23)] hover:-translate-y-1 mt-6">
            {t('confirmExpense')}
        </button>
      </form>
    </div>
  );
};

export default Expenditure;
