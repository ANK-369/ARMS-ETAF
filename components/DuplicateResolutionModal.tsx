
import React from 'react';
import { AlertTriangle, Plus, Copy, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface DuplicateResolutionModalProps {
  isOpen: boolean;
  matchReason: string;
  onMerge: () => void;
  onCreateNew: () => void;
  onCancel: () => void;
  allowCreateNew?: boolean; // Sometimes specific logic might forbid non-merging
}

const DuplicateResolutionModal: React.FC<DuplicateResolutionModalProps> = ({
  isOpen,
  matchReason,
  onMerge,
  onCreateNew,
  onCancel,
  allowCreateNew = true
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border-2 border-orange-500 rounded-2xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden animate-in zoom-in-95">
        
        <div className="p-6 bg-orange-900/20 border-b border-orange-500/50 flex flex-col items-center text-center">
            <div className="p-4 rounded-full bg-orange-500/20 text-orange-500 mb-4 shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-orange-100 mb-2">{t('duplicateDetected')}</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
                {t('duplicateMsg')}
            </p>
        </div>

        <div className="p-4 bg-black/40 border-b border-gray-800">
            <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 uppercase font-bold text-xs">{t('matchingField')}</span>
                <span className="text-white font-mono bg-orange-900/40 px-2 py-1 rounded border border-orange-500/30">
                    {matchReason}
                </span>
            </div>
        </div>

        <div className="p-6 flex flex-col gap-3">
            <button 
                onClick={onMerge}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg transition active:scale-95 group"
            >
                <Copy size={18} className="group-hover:rotate-12 transition"/>
                <span>{t('merge')}</span>
            </button>
            
            {allowCreateNew && (
                <button 
                    onClick={onCreateNew}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 border border-gray-600 hover:border-gray-500 transition active:scale-95"
                >
                    <Plus size={18} />
                    <span>{t('createNew')}</span>
                </button>
            )}

            <button 
                onClick={onCancel}
                className="w-full text-gray-500 hover:text-white py-2 text-sm font-bold mt-2"
            >
                {t('cancel')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateResolutionModal;
