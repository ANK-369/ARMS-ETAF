
import React, { useRef, useState, useEffect } from 'react';
import { 
  Home, DollarSign, ShoppingCart, FileText, User, LogOut, Search, Menu, 
  ShieldCheck, Database, Book, Download, Upload, Package, PanelLeftClose, 
  PanelLeftOpen, ChevronRight, Plane, Activity, X, Globe, Edit3
} from 'lucide-react';
import { getDB, saveDB } from '../services/db';
import { downloadFile } from '../services/dataTransfer';
import { AppData } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { useLanguage } from '../contexts/LanguageContext';
import etafLogo from '../assets/images/etaf_logo.png';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true); // Global Sidebar State
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { t, language, toggleLanguage } = useLanguage();

  // Custom Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
      isOpen: boolean;
      title: string;
      message: React.ReactNode;
      onConfirm: () => void;
      isDanger: boolean;
      type?: 'confirm' | 'alert';
      confirmText?: string;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, isDanger: false });

  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    const checkReadOnly = () => {
      setIsReadOnly(localStorage.getItem('arms_readonly_mode') === 'true');
    };
    checkReadOnly();
    window.addEventListener('storage', checkReadOnly);
    window.addEventListener('arms_readonly_update', checkReadOnly);
    return () => {
      window.removeEventListener('storage', checkReadOnly);
      window.removeEventListener('arms_readonly_update', checkReadOnly);
    };
  }, []);

  const handleExitReadOnly = () => {
    localStorage.removeItem('arms_readonly_mode');
    localStorage.removeItem('arms_readonly_secret_key');
    setIsReadOnly(false);
    window.dispatchEvent(new Event('arms_readonly_update'));
    window.location.reload();
  };

  // Close mobile menu on route change or resize
  useEffect(() => {
    const handleResize = () => {
        if (window.innerWidth >= 768) {
            setMobileMenuOpen(false);
        }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- NAV ITEM DESIGN ---
  const NavItem = ({ page, icon: Icon, label, isMobile = false }: { page: string, icon: any, label: string, isMobile?: boolean }) => {
    const isActive = activePage === page;
    
    // Mobile Style
    if (isMobile) {
        return (
            <button
                onClick={() => {
                    onNavigate(page);
                    setMobileMenuOpen(false);
                }}
                className={`
                    flex items-center w-full px-4 py-3 rounded-lg transition-all duration-200 mb-2
                    ${isActive ? 'bg-gold-500 text-black font-bold shadow-lg' : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                `}
            >
                <Icon size={20} className={isActive ? 'mr-3' : 'mr-3 opacity-70'} />
                <span className="tracking-wide">{t(label)}</span>
                {isActive && <ChevronRight size={16} className="ml-auto" />}
            </button>
        );
    }

    // Desktop Sidebar Style
    return (
      <button
        onClick={() => {
          onNavigate(page);
          setMobileMenuOpen(false);
        }}
        className={`
          relative group flex items-center w-full px-4 py-3.5 mb-1 transition-all duration-300 overflow-hidden
          ${isActive 
            ? 'text-gold-400' 
            : 'text-gray-400 hover:text-white hover:bg-white/5'}
        `}
        title={!isSidebarOpen ? t(label) : ''}
      >
        {/* Active Indicator Line (Left) */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gold-500 shadow-[0_0_15px_rgba(212,175,55,0.6)] rounded-r-full transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`} />

        {/* Active Background Gradient */}
        <div className={`absolute inset-0 bg-gradient-to-r from-gold-500/10 to-transparent transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`} />

        {/* Icon */}
        <div className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]' : 'group-hover:scale-105'}`}>
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
        </div>

        {/* Label */}
        <span 
          className={`
            relative z-10 ml-4 font-medium tracking-wide whitespace-nowrap transition-all duration-500 ease-in-out
            ${isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 overflow-hidden w-0'}
            ${isActive ? 'font-bold text-shadow-sm' : ''}
          `}
        >
          {t(label)}
        </span>
        
        {/* Hover Highlight (Right Side) */}
        <div className={`absolute right-0 top-0 bottom-0 w-1 bg-white/10 transition-all duration-300 ${!isActive && isSidebarOpen ? 'group-hover:opacity-100' : 'opacity-0'}`} />
      </button>
    );
  };

  const handleExportAll = () => {
    const db = getDB();
    const filename = `ARMS_FULL_BACKUP_${new Date().toISOString().split('T')[0]}`;
    downloadFile(JSON.stringify(db, null, 2), filename, 'json');
  };

  const handleImportAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use Custom Dialog
    setConfirmDialog({
        isOpen: true,
        title: t('systemRestoreTitle'),
        message: (
            <div>
                <p>{t('confirmRestoreSystemMsg')}</p>
                <p className="font-mono text-gold-500 my-2">{file.name}</p>
                <p className="text-red-400 font-bold">{t('restoreWarning2')}</p>
            </div>
        ),
        isDanger: true,
        onConfirm: () => processImport(file)
    });

    e.target.value = ''; // Reset input
  };

  const processImport = (file: File) => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const text = (event.target?.result as string).replace(/^\uFEFF/, '');
            const json = JSON.parse(text);
            
            if (Array.isArray(json)) {
                showAlert(t('restoreFailedTitle'), t('restoreFailedMsg'));
                return;
            }

            if (json && typeof json === 'object') {
                // Ensure required keys exist before saving to avoid white screen
                if (!json.manpower && !json.expenses) {
                     showAlert(t('invalidBackupTitle'), t('invalidBackupMsg'));
                     return;
                }

                saveDB(json as AppData);
                // Force reload to apply new DB, auth state will persist via localStorage
                window.location.reload();
            } else {
                showAlert(t('invalidFileTitle'), t('invalidFileMsg'));
            }
        } catch (err) {
            console.error(err);
            showAlert(t('parsingErrorTitle'), t('parsingErrorMsg'));
        }
    };
    reader.readAsText(file);
  };

  const showAlert = (title: string, msg: string) => {
      setConfirmDialog({
          isOpen: true,
          title: title,
          message: msg,
          onConfirm: () => setConfirmDialog(prev => ({...prev, isOpen: false})),
          isDanger: false,
          type: 'alert',
          confirmText: 'OK'
      });
  };

  const getPageTitle = () => {
      switch(activePage) {
          case 'home': return t('dashboard');
          case 'income': return t('income');
          case 'expenditure': return t('expenditure');
          case 'store': return t('store');
          case 'search': return t('search');
          case 'audit': return t('audit');
          case 'notebook': return t('notebook');
          case 'editor': return t('editor');
          case 'about': return t('about');
          case 'dbadmin': return t('dbAdmin');
          default: return 'ARMS';
      }
  };

  return (
    <div className="flex h-screen bg-military-900 text-white font-sans overflow-hidden">
      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({...prev, isOpen: false}))}
        isDanger={confirmDialog.isDanger}
        type={confirmDialog.type}
        confirmText={confirmDialog.confirmText || (confirmDialog.type === 'alert' ? 'OK' : 'Confirm')}
      />

      {/* Sidebar - Desktop (Collapsible) */}
      <aside 
        className={`hidden md:flex flex-col relative bg-slate-950 border-r border-b border-slate-800 h-fit max-h-screen rounded-br-2xl shadow-[5px_5px_30px_rgba(0,0,0,0.5)] z-20 transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)]
        ${isSidebarOpen ? 'w-72' : 'w-20'}
        `}
      >
        {/* --- WATERMARK BACKGROUND --- */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
            {/* Top Light Flare */}
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl"></div>
            
            {/* Bottom Emblem Watermark (Air Force Logo Styled) */}
            <div className={`absolute bottom-20 -right-10 transition-all duration-700 opacity-[0.05] pointer-events-none ${isSidebarOpen ? 'scale-100 rotate-0' : 'scale-50 rotate-12'}`}>
                 <div className="w-[320px] h-[320px] rounded-full overflow-hidden flex items-center justify-center">
                   <img src={etafLogo} alt="Ethiopian Air Force Watermark" className="w-full h-full object-cover scale-108 filter brightness-200" />
                 </div>
            </div>
        </div>

        {/* --- HEADER --- */}
        <div className={`relative z-10 p-6 flex flex-col items-center border-b border-white/5 bg-gradient-to-b from-slate-900 to-transparent text-center transition-all duration-300 ${isSidebarOpen ? 'h-52 justify-start pt-6' : 'h-28 justify-center p-2'}`}>
          
          <div className="relative mb-3 flex items-center justify-center">
              <div className={`absolute inset-0 bg-gold-500 rounded-full blur-xl opacity-20 transition-all duration-500 ${isSidebarOpen ? 'scale-100' : 'scale-75'}`}></div>
              <div className={`relative z-10 rounded-full overflow-hidden flex items-center justify-center transition-all duration-500 border border-gold-500/30 ${isSidebarOpen ? 'w-18 h-18 sm:w-20 sm:h-20' : 'w-10 h-10'}`}>
                <img 
                  src={etafLogo} 
                  alt="Ethiopian Air Force Logo" 
                  className="w-full h-full object-cover scale-108 drop-shadow-lg" 
                />
              </div>
          </div>
          
          <div className={`transition-all duration-500 overflow-hidden flex flex-col items-center ${isSidebarOpen ? 'opacity-100 max-h-40 translate-y-0' : 'opacity-0 max-h-0 translate-y-4'}`}>
            <h1 className="text-2xl font-black tracking-[0.2em] text-white font-serif leading-none mb-1">ARMS</h1>
            <div className="h-px w-12 bg-gold-500/50 mb-2"></div>
            <p className="text-[10px] text-gold-400 font-bold uppercase tracking-widest whitespace-nowrap">
                Ethiopian Air Force
            </p>
            <p className="text-[10px] text-gold-400 font-bold tracking-widest whitespace-nowrap">
                የኢትዮጵያ አይር ሀይል
            </p>
            <p className="text-[8px] text-gray-500 uppercase tracking-wide mt-1">
                Logistics Command
            </p>
          </div>
        </div>

        {/* --- NAVIGATION --- */}
        <nav className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden py-6 space-y-1 scrollbar-hide">
          <NavItem page="home" icon={Home} label="dashboard" />
          
          <div className={`px-4 py-2 mt-4 mb-1 text-[10px] font-bold text-gray-600 uppercase tracking-wider transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
              {t('financials')}
          </div>
          <NavItem page="income" icon={DollarSign} label="income" />
          <NavItem page="expenditure" icon={ShoppingCart} label="expenditure" />
          <NavItem page="audit" icon={FileText} label="audit" />
          
          <div className={`px-4 py-2 mt-4 mb-1 text-[10px] font-bold text-gray-600 uppercase tracking-wider transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
              {t('logistics')}
          </div>
          <NavItem page="store" icon={Package} label="store" />
          <NavItem page="search" icon={Search} label="search" />
          
          <div className={`px-4 py-2 mt-4 mb-1 text-[10px] font-bold text-gray-600 uppercase tracking-wider transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
              {t('system')}
          </div>
          <NavItem page="dbadmin" icon={Database} label="dbAdmin" />
          <NavItem page="notebook" icon={Book} label="notebook" />
          <NavItem page="editor" icon={Edit3} label="editor" />
          <NavItem page="about" icon={User} label="about" />
        </nav>

        {/* --- FOOTER ACTIONS --- */}
        <div className={`relative z-10 p-4 border-t border-white/5 bg-slate-950/50 space-y-3 transition-all duration-300 ${isSidebarOpen ? '' : 'px-2'}`}>
            <div className="flex gap-2">
                <button 
                    onClick={handleExportAll}
                    className={`flex-1 flex items-center justify-center space-x-2 bg-slate-800 hover:bg-gold-600 hover:text-black text-gray-400 hover:text-white py-2.5 rounded-lg text-xs font-bold transition border border-gray-700 hover:border-gold-500 overflow-hidden group ${!isSidebarOpen && 'px-0'}`}
                    title={t('backup')}
                >
                    <Download size={16} className="group-hover:scale-110 transition-transform" /> 
                    <span className={`${isSidebarOpen ? 'block' : 'hidden'}`}>{t('backup')}</span>
                </button>
                <label 
                    className={`flex-1 flex items-center justify-center space-x-2 bg-slate-800 hover:bg-blue-600 hover:text-white text-gray-400 py-2.5 rounded-lg text-xs font-bold transition border border-gray-700 hover:border-blue-400 cursor-pointer overflow-hidden group ${!isSidebarOpen && 'hidden'}`}
                    title={t('restore')}
                >
                    <Upload size={16} className="group-hover:scale-110 transition-transform" /> 
                    <span>{t('restore')}</span>
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        accept=".json" 
                        className="hidden" 
                        onChange={handleImportAll}
                    />
                </label>
            </div>

            <button 
                onClick={onLogout} 
                className={`w-full flex items-center justify-center space-x-3 px-4 py-2.5 text-red-400/70 hover:text-red-400 hover:bg-red-900/10 rounded-lg transition border border-transparent hover:border-red-900/30 ${!isSidebarOpen && 'px-0'}`}
                title={t('logout')}
            >
                <LogOut size={18} />
                <span className={`${isSidebarOpen ? 'block' : 'hidden'}`}>{t('logout')}</span>
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-900 transition-all duration-300">
        
        {/* Desktop Top Toolbar (Global Toggler) */}
        <div className="hidden md:flex items-center justify-between bg-military-900 border-b border-military-700 px-6 py-3 shadow-md shrink-0 z-10">
             <div className="flex items-center gap-4">
                 <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                    className="text-gray-400 hover:text-gold-500 transition focus:outline-none p-1 hover:bg-white/5 rounded"
                    title={isSidebarOpen ? t('collapseSidebar') : t('expandSidebar')}
                 >
                     {isSidebarOpen ? <PanelLeftClose size={22} /> : <PanelLeftOpen size={22} />}
                 </button>
                 <div className="h-6 w-px bg-gray-700"></div>
                 <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="uppercase font-bold tracking-wider text-xs">ARMS System</span>
                    <ChevronRight size={14} className="text-gray-600" />
                    <span className="text-gold-500 font-bold">{getPageTitle()}</span>
                 </div>
             </div>
             <div className="flex items-center gap-4">
                 <button 
                    onClick={toggleLanguage} 
                    className="flex items-center gap-1.5 px-3 py-1 bg-black/30 border border-gray-700 rounded-full text-xs font-bold text-gold-500 hover:bg-gold-500/10 hover:border-gold-500 transition"
                 >
                    <Globe size={14} />
                    {language === 'en' ? 'ENGLISH' : 'AMHARIC'}
                 </button>
                 <div className="h-6 w-px bg-gray-700"></div>
                 <div className="hidden lg:flex text-[10px] text-green-500 font-mono border border-green-900 bg-green-900/10 px-2 py-0.5 rounded items-center gap-1">
                     <Activity size={10} className="animate-pulse"/> {t('systemSecure')}
                 </div>
                 <div className="hidden lg:block text-xs text-gray-600 font-mono">
                     V3.0.4 • ETAF
                 </div>
             </div>
        </div>

        {/* Mobile Header */}
        <header className="md:hidden bg-military-900 border-b border-military-700 p-3 sm:p-4 flex justify-between items-center z-30 shadow-md">
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-gold-500/30 drop-shadow">
                  <img src={etafLogo} alt="Ethiopian Air Force Logo" className="w-full h-full object-cover scale-108" />
                </div>
                <div className="flex flex-col">
                    <span className="font-bold tracking-[0.2em] text-white text-base sm:text-lg leading-none font-serif">ARMS</span>
                    <span className="text-[10px] text-gold-500 font-bold uppercase tracking-wider">Ethiopian Air Force</span>
                    <span className="text-[10px] text-gold-500 font-bold tracking-wider">የኢትዮጵያ አይር ሀይል</span>
                </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
                <button onClick={toggleLanguage} className="p-2 text-gold-500 bg-black/30 rounded-full border border-gray-700 hover:bg-gold-500/10 transition cursor-pointer">
                    <Globe size={18} />
                </button>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gold-500 p-2 hover:bg-white/5 rounded transition cursor-pointer">
                    <Menu size={26} />
                </button>
            </div>
        </header>

        {/* Mobile Menu Overlay - Z-INDEX INCREASED */}
        {mobileMenuOpen && (
            <div className="absolute inset-0 z-[200] bg-slate-950 flex flex-col animate-in slide-in-from-right md:hidden">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-military-900">
                    <div className="flex items-center gap-3">
                         <div className="bg-gold-500/10 p-1.5 rounded-full flex items-center justify-center border border-gold-500/30">
                            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center">
                              <img src={etafLogo} alt="Ethiopian Air Force Logo" className="w-full h-full object-cover scale-108" />
                            </div>
                         </div>
                         <div>
                            <h2 className="text-white font-bold text-xl tracking-wider font-serif">ARMS</h2>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Ethiopian Air Force</p>
                            <p className="text-[10px] text-gray-400 tracking-widest">የኢትዮጵያ አይር ሀይል</p>
                         </div>
                    </div>
                    <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-white bg-white/5 p-2 rounded-full">
                        <X size={24} /> 
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    <NavItem isMobile page="home" icon={Home} label="dashboard" />
                    
                    <div className="px-4 py-2 mt-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-800 mb-2">{t('financials')}</div>
                    <NavItem isMobile page="income" icon={DollarSign} label="income" />
                    <NavItem isMobile page="expenditure" icon={ShoppingCart} label="expenditure" />
                    <NavItem isMobile page="audit" icon={FileText} label="audit" />
                    
                    <div className="px-4 py-2 mt-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-800 mb-2">{t('logistics')}</div>
                    <NavItem isMobile page="store" icon={Package} label="store" />
                    <NavItem isMobile page="search" icon={Search} label="search" />
                    
                    <div className="px-4 py-2 mt-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-800 mb-2">{t('system')}</div>
                    <NavItem isMobile page="dbadmin" icon={Database} label="dbAdmin" />
                    <NavItem isMobile page="notebook" icon={Book} label="notebook" />
                    <NavItem isMobile page="editor" icon={Edit3} label="editor" />
                    <NavItem isMobile page="about" icon={User} label="about" />
                </div>
                
                <div className="p-4 border-t border-gray-800 bg-black/20">
                    <button onClick={onLogout} className="w-full flex items-center justify-center space-x-3 px-4 py-3 bg-red-900/20 text-red-400 rounded-lg font-bold border border-red-900/30 active:scale-95 transition">
                        <LogOut size={20} />
                        <span>{t('logout')}</span>
                    </button>
                </div>
            </div>
        )}

        {/* Page Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-military-700 scrollbar-track-transparent flex flex-col">
             <div className="flex-1 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                 {isReadOnly && (
                     <div className="mb-6 bg-amber-950/40 border border-amber-600/40 rounded-xl p-3 md:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-200 shadow-[0_0_15px_rgba(217,119,6,0.15)] shrink-0 animate-in fade-in slide-in-from-top-1">
                         <div className="flex items-center gap-3">
                             <div className="bg-amber-600/20 p-2 rounded-lg text-amber-400 shrink-0">
                                 <Activity size={20} className="animate-pulse" />
                             </div>
                             <div>
                                 <h4 className="font-bold text-sm tracking-wide">
                                     {language === 'en' ? 'READ-ONLY CONNECTION ACTIVE' : 'የንባብ-ብቻ ግንኙነት ነቅቷል'}
                                 </h4>
                                 <p className="text-xs text-amber-300/80 mt-0.5">
                                     {language === 'en' 
                                         ? 'Viewing remote system data via Secret Key. Data modification is disabled.' 
                                         : 'በምስጢር ቁልፍ የርቀት ስርዓት መረጃዎችን እያዩ ነው። መረጃ ማሻሻል ተሰናክሏል።'}
                                 </p>
                             </div>
                         </div>
                         <button 
                             onClick={handleExitReadOnly}
                             className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-lg transition active:scale-95 shrink-0"
                         >
                             {language === 'en' ? 'Disconnect / Go Local' : 'ግንኙነት አቋርጥ / ወደ አካባቢያዊ ተመለስ'}
                         </button>
                     </div>
                 )}
                 {children}
             </div>
             
             <footer className="mt-8 pt-6 border-t border-military-700 text-center text-xs text-gray-500 pb-2">
                <p className="font-mono">2018 • ARMS • By CPL Andualem Koriya</p>
             </footer>
        </div>
      </main>
    </div>
  );
};

export default Layout;
