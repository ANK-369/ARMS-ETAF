import React from 'react';
import { AlertTriangle, Check, X, Info, ShieldAlert } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  type?: 'confirm' | 'alert';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = "Confirm", 
  cancelText = "Cancel", 
  isDanger = false,
  type = 'confirm'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`bg-slate-900 border-2 ${isDanger ? 'border-red-500' : 'border-gold-500'} rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-md w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200`}>
        {/* Header */}
        <div className={`p-4 ${isDanger ? 'bg-red-900/30' : 'bg-military-800'} border-b border-gray-700 flex items-center gap-3`}>
          <div className={`p-2 rounded-full ${isDanger ? 'bg-red-500 text-white' : 'bg-gold-500 text-black'} shadow-lg`}>
            {isDanger ? <ShieldAlert size={24} /> : <Info size={24} />}
          </div>
          <h3 className={`text-xl font-bold font-serif tracking-wide ${isDanger ? 'text-red-100' : 'text-gold-100'}`}>
            {title}
          </h3>
        </div>
        
        {/* Body */}
        <div className="p-6 text-gray-300 leading-relaxed text-sm md:text-base border-b border-gray-800 bg-black/20">
          {message}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 flex justify-end gap-3">
          {type === 'confirm' && onCancel && (
            <button 
              onClick={onCancel}
              className="px-5 py-2.5 rounded-lg font-bold text-gray-400 hover:text-white hover:bg-white/10 transition border border-gray-700 hover:border-gray-500 uppercase text-xs tracking-wider"
            >
              {cancelText}
            </button>
          )}
          <button 
            onClick={onConfirm}
            className={`px-6 py-2.5 rounded-lg font-bold text-white shadow-lg transition flex items-center gap-2 uppercase text-xs tracking-wider transform active:scale-95 ${
              isDanger 
                ? 'bg-red-600 hover:bg-red-700 border border-red-500' 
                : 'bg-gold-500 hover:bg-gold-600 text-black border border-gold-400'
            }`}
          >
            {type === 'confirm' ? <Check size={16} /> : <Check size={16} />} 
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;