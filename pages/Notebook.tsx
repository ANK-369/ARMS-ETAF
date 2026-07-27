
import React, { useState, useEffect } from 'react';
import { getDB, addItem, deleteItem } from '../services/db';
import { Note } from '../types';
import { getCurrentEthiopianDate, formatEthiopianDate } from '../services/ethiopianDate';
import { Plus, Trash2, Calendar, Clock, Book, AlertTriangle, Lightbulb, StickyNote } from 'lucide-react';
import DataTools from '../components/DataTools';
import CustomSelect from '../components/CustomSelect';
import ConfirmDialog from '../components/ConfirmDialog';
import { useLanguage } from '../contexts/LanguageContext';
import { useDate } from '../contexts/DateContext';

const Notebook: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [form, setForm] = useState({ title: '', content: '', category: 'General' });
  const [forceUpdate, setForceUpdate] = useState(0);

  const { t, language } = useLanguage();
  const { month: selectedMonth, year: selectedYear } = useDate();

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
      isOpen: boolean;
      title: string;
      message: React.ReactNode;
      onConfirm: () => void;
      isDanger: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, isDanger: false });

  const refreshNotes = () => {
    const db = getDB();
    const targetDate = `${selectedYear}-${selectedMonth}`;
    
    const filteredNotes = (db.notes || [])
        .filter(n => n.date && n.date.startsWith(targetDate))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
    setNotes(filteredNotes);
  };

  useEffect(() => { refreshNotes(); }, [forceUpdate, selectedMonth, selectedYear]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) return;

    // Use Selected Date for new notes? Or current date? 
    // Usually new notes are for "today", but if viewing past month, user might want to backdate?
    // Let's use current Ethiopian date for creation to maintain integrity, 
    // BUT the filter will hide it if current date is not in selected month.
    // To allow user to see what they just created, we might need to be careful.
    // Standard behavior: Creation is "Now". Viewing is "Filtered".
    
    const newNote: Note = {
      id: Math.random().toString(36).substr(2, 9),
      title: form.title,
      content: form.content,
      // @ts-ignore
      category: form.category,
      date: getCurrentEthiopianDate(),
      timestamp: new Date().toISOString() 
    };

    addItem('notes', newNote);
    setForm({ title: '', content: '', category: 'General' });
    refreshNotes();
  };

  const requestDelete = (id: string) => {
      setConfirmDialog({
          isOpen: true,
          title: t('deleteNote'),
          message: t('deleteNoteConfirm'),
          isDanger: true,
          onConfirm: () => handleDelete(id)
      });
  };

  const handleDelete = (id: string) => {
      deleteItem('notes', id);
      setConfirmDialog(prev => ({...prev, isOpen: false}));
      refreshNotes();
  };

  const getCategoryColor = (cat: string) => {
      switch(cat) {
          case 'Incident': return 'border-red-500 text-red-400 bg-red-900/20';
          case 'Plan': return 'border-blue-500 text-blue-400 bg-blue-900/20';
          default: return 'border-gold-500 text-gold-400 bg-yellow-900/20';
      }
  };
  
  const getCategoryIcon = (cat: string) => {
      switch(cat) {
          case 'Incident': return <AlertTriangle size={14}/>;
          case 'Plan': return <Lightbulb size={14}/>;
          default: return <StickyNote size={14}/>;
      }
  };

  const categoryOptions = [
      { value: 'General', label: t('General') },
      { value: 'Incident', label: t('Incident') },
      { value: 'Plan', label: t('Plan') }
  ];

  return (
    <div className="max-w-7xl mx-auto pb-12">
       <ConfirmDialog 
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(prev => ({...prev, isOpen: false}))}
          isDanger={confirmDialog.isDanger}
          confirmText={t('confirm')}
          cancelText={t('cancel')}
       />

       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-military-700 pb-6">
          <div>
              <h2 className="text-3xl text-gold-500 font-bold flex items-center gap-3 font-serif"><Book /> {t('fieldNotebook')}</h2>
              <p className="text-gray-400 text-sm mt-1">{t('notebookSubtitle')}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <span className="text-gold-500 font-mono text-xs md:text-sm bg-military-900 px-3 py-2 rounded border border-military-700 text-center whitespace-nowrap sm:h-[46px] flex items-center justify-center">{formatEthiopianDate(`${selectedYear}-${selectedMonth}-01`, language).split(',')[0]} {t('filteredTag')}</span>
              <DataTools 
                data={notes} 
                sectionName="Notebook Notes" 
                dbKey="notes" 
                onImportSuccess={() => setForceUpdate(p => p + 1)} 
              />
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* LEFT: FORM (Sticky) */}
          <div className="lg:col-span-1 lg:sticky lg:top-4">
             <form onSubmit={handleSave} className="bg-military-800 p-6 rounded-2xl shadow-2xl border border-military-700 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition"><Book size={80}/></div>
                
                <h3 className="text-white font-bold mb-6 border-b border-gray-600 pb-2 flex items-center gap-2 relative z-10"><Plus size={18} className="text-gold-500"/> {t('newEntry')}</h3>
                
                <div className="relative z-10 space-y-4">
                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">{t('category')}</label>
                        <CustomSelect 
                            value={form.category}
                            onChange={(val) => setForm({...form, category: val})}
                            options={categoryOptions}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">{t('subject')}</label>
                        <input className="w-full bg-slate-900 border border-military-600 rounded-lg p-3 text-white focus:border-gold-500 outline-none transition placeholder-gray-600" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder={t('enterTitle')} required />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">{t('details')}</label>
                        <textarea className="w-full bg-slate-900 border border-military-600 rounded-lg p-3 text-white h-48 resize-none focus:border-gold-500 outline-none transition placeholder-gray-600" value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder={t('writeDetails')} required />
                    </div>
                    
                    <button type="submit" className="w-full bg-gold-500 hover:bg-gold-600 text-black font-bold py-3 rounded-lg shadow-lg transition transform hover:-translate-y-1">{t('saveEntry')}</button>
                </div>
             </form>
          </div>

          {/* RIGHT: NOTES GRID */}
          <div className="lg:col-span-3">
             {notes.length === 0 && (
                 <div className="text-center p-20 bg-military-900/30 rounded-2xl border-2 border-dashed border-gray-700">
                     <Book size={48} className="mx-auto mb-4 text-gray-600" />
                     <p className="text-gray-500 font-bold text-lg">{t('noNotes')}</p>
                     <p className="text-sm text-gray-600">{t('addFirstEntryHint')}</p>
                 </div>
             )}
             
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {notes.map(note => (
                    <div key={note.id} className="bg-slate-900 border border-gray-800 rounded-xl p-5 shadow-lg flex flex-col hover:border-gray-600 transition group relative overflow-hidden">
                       <div className={`absolute top-0 left-0 w-1 h-full ${note.category === 'Incident' ? 'bg-red-500' : (note.category === 'Plan' ? 'bg-blue-500' : 'bg-gold-500')}`}></div>
                       
                       <div className="flex justify-between items-start mb-3 pl-2">
                          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full flex items-center gap-1 border ${getCategoryColor(note.category)}`}>
                              {getCategoryIcon(note.category)} {t(note.category)}
                          </span>
                          <button onClick={() => requestDelete(note.id)} className="text-gray-600 hover:text-red-500 p-1 rounded hover:bg-red-900/20 transition"><Trash2 size={16} /></button>
                       </div>
                       
                       <h4 className="text-lg font-bold text-white mb-2 pl-2 leading-tight">{note.title}</h4>
                       <p className="text-gray-400 text-sm whitespace-pre-wrap flex-1 pl-2 mb-4 leading-relaxed font-light">{note.content}</p>
                       
                       <div className="mt-auto pt-3 border-t border-gray-800 flex justify-between items-center text-[10px] text-gray-500 pl-2">
                           <span className="flex items-center gap-1"><Calendar size={10}/> {formatEthiopianDate(note.date, language)}</span>
                           <span className="flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded"><Clock size={10}/> {new Date(note.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                       </div>
                    </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  );
};

export default Notebook;
