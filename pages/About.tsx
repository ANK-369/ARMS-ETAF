
import React from 'react';
import { Mail, Github, Linkedin, Cpu, Code, ShieldCheck, MapPin, Terminal, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const About: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="h-full flex items-center justify-center p-4 overflow-y-auto">
       <div className="max-w-6xl w-full bg-military-800 rounded-2xl shadow-2xl overflow-hidden border border-military-700 flex flex-col md:flex-row animate-in fade-in slide-in-from-bottom-4 duration-500 my-auto">
           {/* LEFT: VISUAL PROFILE */}
           <div className="bg-slate-900 md:w-1/3 p-8 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-military-700 relative overflow-hidden">
               {/* Background Pattern */}
               <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:16px_16px]"></div>
               
               <div className="relative mb-6">
                   <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-military-800 border-4 border-gold-500 shadow-[0_0_20px_rgba(212,175,55,0.3)] flex items-center justify-center overflow-hidden relative z-10 group">
                        <span className="text-6xl md:text-7xl group-hover:scale-110 transition duration-500">👨‍✈️</span>
                   </div>
                   <div className="absolute -bottom-2 -right-2 bg-gold-500 text-black p-2 rounded-full border-4 border-slate-900 z-20">
                       <ShieldCheck size={24} />
                   </div>
               </div>

               <h2 className="text-3xl font-black text-white font-serif tracking-wide mb-2">{t('name_andualem')}</h2>
               <div className="flex flex-col gap-1 mb-6">
                   <p className="text-gold-500 text-sm font-bold uppercase tracking-[0.2em]">{t('solutionArchitect')}</p>
                   <p className="text-blue-400 text-xs font-bold uppercase tracking-[0.2em]">{t('aiEngineerRole')}</p>
               </div>

               <div className="flex gap-2 mb-8 flex-wrap justify-center max-w-xs">
                   <span className="bg-blue-900/30 text-blue-400 text-[10px] px-2 py-1 rounded border border-blue-500/30 font-bold">{t('tagCyberSecurity')}</span>
                   <span className="bg-purple-900/30 text-purple-400 text-[10px] px-2 py-1 rounded border border-purple-500/30 font-bold">{t('tagAiMl')}</span>
                   <span className="bg-green-900/30 text-green-400 text-[10px] px-2 py-1 rounded border border-green-500/30 font-bold">{t('tagFullStack')}</span>
               </div>

               <div className="flex gap-4">
                   <a href="https://github.com/andualemkoriya" target="_blank" rel="noreferrer" className="p-3 bg-slate-800 rounded-full text-gray-400 hover:text-white hover:bg-black transition border border-gray-700 hover:border-white"><Github size={20}/></a>
                   <a href="#" className="p-3 bg-slate-800 rounded-full text-gray-400 hover:text-white hover:bg-blue-600 transition border border-gray-700 hover:border-white"><Linkedin size={20}/></a>
               </div>
           </div>

           {/* RIGHT: INFO DOSSIER */}
           <div className="md:w-2/3 p-8 md:p-10 bg-military-800 relative flex flex-col overflow-y-auto max-h-[90vh]">
               <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                   <Code size={120} className="text-white"/>
               </div>

               <h3 className="text-gold-500 font-bold uppercase tracking-widest text-sm mb-4 flex items-center gap-2 border-b border-gray-700 pb-2">
                   <Cpu size={16}/> {t('developer_bio')}
               </h3>

               <div className="space-y-4 text-gray-300 text-sm leading-relaxed mb-8">
                    <p>{t('bio_p1')}</p>
                    <p>{t('bio_p2')}</p>
                    <p>{t('bio_p3')}</p>
               </div>

               <h3 className="text-blue-400 font-bold uppercase tracking-widest text-sm mb-4 flex items-center gap-2 border-b border-gray-700 pb-2">
                   <Terminal size={16}/> {t('tech_portfolio')}
               </h3>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                    <div className="bg-black/20 p-4 rounded-lg border border-gray-700/50">
                        <h4 className="text-white font-bold mb-2 flex items-center gap-2"><Globe size={14} className="text-green-400"/> {t('past_projects')}</h4>
                        <ul className="list-disc list-inside text-xs text-gray-400 space-y-1">
                            <li>{t('proj_patient')}</li>
                            <li>{t('proj_library')}</li>
                            <li>{t('proj_ichat')}</li>
                            <li>{t('proj_cloner')}</li>
                        </ul>
                    </div>
                    <div className="bg-black/20 p-4 rounded-lg border border-gray-700/50">
                        <h4 className="text-white font-bold mb-2 flex items-center gap-2"><ShieldCheck size={14} className="text-red-400"/> {t('adv_interests')}</h4>
                        <ul className="list-disc list-inside text-xs text-gray-400 space-y-1">
                            <li>{t('int_malware')}</li>
                            <li>{t('int_reverse')}</li>
                            <li>{t('int_spyware')}</li>
                            <li>{t('int_automation')}</li>
                        </ul>
                    </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-700 pt-6 mt-auto">
                   <a href="mailto:andualemkoriya999@gmail.com" className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 hover:bg-slate-900 transition border border-transparent hover:border-gold-500/30 group">
                       <div className="p-2 bg-military-800 rounded-full text-gold-500 group-hover:scale-110 transition"><Mail size={16}/></div>
                       <div className="overflow-hidden">
                           <p className="text-[10px] text-gray-500 uppercase font-bold">{t('emailLabel')}</p>
                           <p className="text-xs text-white truncate">andualemkoriya999@gmail.com</p>
                       </div>
                   </a>
                   <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 hover:bg-slate-900 transition border border-transparent hover:border-gold-500/30 group">
                       <div className="p-2 bg-military-800 rounded-full text-gold-500 group-hover:scale-110 transition"><MapPin size={16}/></div>
                       <div>
                           <p className="text-[10px] text-gray-500 uppercase font-bold">{t('locationLabel')}</p>
                           <p className="text-xs text-white">{t('aboutLocationText')}</p>
                       </div>
                   </div>
               </div>
               
               <div className="mt-8 text-center">
                   <p className="text-[10px] text-gray-400 font-mono uppercase bg-black/40 px-6 py-2 rounded-full border border-gold-500/20 shadow-inner inline-block">
                       {t('systemVersionStable')}
                   </p>
               </div>
           </div>
       </div>
    </div>
  );
};

export default About;
