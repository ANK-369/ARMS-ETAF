
import React, { useState } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import { downloadFile, generateCSV, generateHTMLDoc, parseImportFile, mergeData } from '../services/dataTransfer';
import { AppData } from '../types';
import CustomSelect from './CustomSelect';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  data: any[];
  sectionName: string; // e.g. "Manpower"
  dbKey: keyof AppData; // e.g. "manpower"
  onImportSuccess: () => void;
}

const DataTools: React.FC<Props> = ({ data, sectionName, dbKey, onImportSuccess }) => {
  // Changed default from 'csv' to 'json'
  const [format, setFormat] = useState<'csv' | 'json' | 'doc'>('json');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);
  const { t } = useLanguage();

  const handleExport = () => {
    if (!data.length) {
      setMsg(t('noDataExport'));
      setError(true);
      setTimeout(() => { setMsg(''); setError(false); }, 3000);
      return;
    }

    const filename = `ARMS_${sectionName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    
    let content = '';
    if (format === 'csv') content = generateCSV(data);
    if (format === 'json') content = JSON.stringify(data, null, 2);
    if (format === 'doc') content = generateHTMLDoc(sectionName + ' Report', data);

    downloadFile(content, filename, format);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. FILENAME SECURITY CHECK
    const cleanFileName = file.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanSectionName = sectionName.toLowerCase().replace(/[^a-z0-9]/g, '');

    let isValidName = cleanFileName.includes(cleanSectionName);
    
    if (cleanSectionName === 'itemsold' && cleanFileName.includes('incomeitem')) isValidName = true;
    if (cleanSectionName === 'market' && cleanFileName.includes('expense')) isValidName = true;
    if (cleanSectionName === 'wage' && cleanFileName.includes('expense')) isValidName = true;
    if (cleanSectionName === 'transfer' && cleanFileName.includes('transfer')) isValidName = true;
    if (cleanSectionName.includes('store') && cleanFileName.includes('store')) isValidName = true;
    if (cleanSectionName.includes('notebook') && cleanFileName.includes('notes')) isValidName = true;

    if (!isValidName) {
        setMsg(`${t('secBlockPart1')} "${file.name}" ${t('secBlockPart2')} "${sectionName}" ${t('secBlockPart3')}`);
        setError(true);
        e.target.value = ''; 
        return; 
    }

    // 2. PARSE & SCHEMA CHECK
    parseImportFile(file, (parsedData) => {
      if (!parsedData || !Array.isArray(parsedData) || parsedData.length === 0) {
        setMsg(t('importFailed'));
        setError(true);
        return;
      }
      
      mergeData(dbKey, parsedData, 
        (count) => {
           setMsg(`${t('importSuccessPart1')} ${count} ${t('importSuccessPart2')} ${sectionName}${t('importSuccessPart3')}`);
           setError(false);
           onImportSuccess();
        },
        (err) => {
            setMsg(err);
            setError(true);
        }
      );
    });
    
    e.target.value = ''; 
  };

  const formatOptions = [
      { value: 'json', label: 'JSON' },
      { value: 'csv', label: 'CSV' },
      { value: 'doc', label: 'DOC' }
  ];

  return (
    <div className="flex flex-row flex-nowrap items-center gap-1 md:gap-2 bg-military-900 p-1 md:p-2 rounded-lg border border-military-700 relative z-[60] w-full md:w-auto justify-between md:justify-start overflow-visible">
      {/* CENTERED MESSAGE MODAL */}
      {msg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`bg-slate-900 border-2 p-6 rounded-xl shadow-2xl max-w-md w-full flex flex-col items-center text-center ${error ? 'border-red-500' : 'border-green-500'}`}>
                <div className={`p-4 rounded-full mb-4 ${error ? 'bg-red-900/30 text-red-500' : 'bg-green-900/30 text-green-500'}`}>
                    {error ? <AlertTriangle size={48} /> : <CheckCircle size={48} />}
                </div>
                <h3 className={`text-xl font-bold mb-2 ${error ? 'text-red-400' : 'text-green-400'}`}>
                    {error ? t('actionBlocked') : t('successTitle')}
                </h3>
                <p className="text-gray-300 mb-6">{msg}</p>
                <button 
                    onClick={() => { setMsg(''); setError(false); }}
                    className={`px-6 py-2 rounded font-bold transition ${error ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                >
                    {t('dismiss')}
                </button>
            </div>
        </div>
      )}
      
      {/* Format Select */}
      <div className="w-20 md:w-32 relative z-[70] shrink-0">
          <CustomSelect 
            value={format} 
            onChange={val => setFormat(val)} 
            options={formatOptions}
            className="text-[10px] md:text-xs"
          />
      </div>

      {/* Export Button */}
      <button 
        onClick={handleExport}
        className="flex-1 md:flex-none flex items-center justify-center gap-1 md:gap-2 bg-military-800 hover:bg-gold-500 hover:text-black text-gold-500 px-2 py-2 md:px-3 md:py-2.5 rounded transition text-[10px] md:text-xs font-bold border border-gold-500/30 h-10 md:h-[46px] whitespace-nowrap min-w-0"
        title={t('export')}
      >
        <Download size={14} className="shrink-0" />
        <span className="truncate">{t('export')}</span>
      </button>

      {/* Import Button */}
      <label className="flex-1 md:flex-none flex items-center justify-center gap-1 md:gap-2 bg-blue-900/30 hover:bg-blue-600 hover:text-white text-blue-400 px-2 py-2 md:px-3 md:py-2.5 rounded transition text-[10px] md:text-xs font-bold border border-blue-500/30 cursor-pointer h-10 md:h-[46px] whitespace-nowrap min-w-0">
        <Upload size={14} className="shrink-0" />
        <span className="truncate">{t('import')}</span>
        <input 
            type="file" 
            accept=".csv,.json" 
            className="hidden" 
            onChange={handleImport}
        />
      </label>
    </div>
  );
};

export default DataTools;
