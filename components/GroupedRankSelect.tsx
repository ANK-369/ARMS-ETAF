import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { Command } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

export const AIR_FORCE_RANKS = [
  "ጁ/ኤክ", "ሲ/ኤክ", "ሊ/ኤክ", "ጁ/ቴክ", "ሲ/ቴክ", "ሊ/ቴክ", "ማ/ቴክ", "ጁ/ዋ/ኦ", "ሲ/ዋ/ኦ", "ቺ/ዋ/ኦ"
];

export const GROUND_FORCE_RANKS = [
  "ምልምል", "መሰ/ወ/ር", "ም/፲/አለቃ", "፲/አለቃ", "፶/አለቃ", "ም/መ/አለቃ", "መቶ አለቃ", "ሻ/ል", "ሻ/ቃ", "ሌ/ኮ", "ኮሎነል"
];

export const NCO_RANKS = [
  "መ/፶/አለቃ", "ሻምል ባሻ", "ሻለቃ መ/ባሻ", "ሻለቃ ባሻ", "ጁ/ዋ/ኦ", "ሲ/ዋ/ኦ", "ቺ/ዋ/ኦ"
];

export const NAVY_RANKS = [
  "ምል/መርከበኛ", "መርከበኛ", "መሪ መርከበኛ", "ፒቲ ኦፊሰር", "ቺፍ ፒቲ ኦፊሰር"
];

export const CIVIL_RANKS = [
  "ወጣት", "ወ/ሪት", "ወ/ሮ", "አቶ", "ዶ/ር", "ፕሮፌሰር", "እን/ር", "ጠበቃ", "መምህር/ሪት", "ሌሎች"
];

export interface RankGroup {
  title: string;
  ranks: string[];
}

export function getRankGroupsForCommand(command: Command | string | undefined | null): RankGroup[] | null {
  if (!command) return null;

  switch (command) {
    case Command.AF:
    case "Air Force":
      return [
        { title: "Air Force Rank", ranks: AIR_FORCE_RANKS },
        { title: "Ground Force Rank", ranks: GROUND_FORCE_RANKS },
        { title: "Non-Commissioned Rank", ranks: NCO_RANKS }
      ];
    case Command.GF:
    case "Ground Force":
    case Command.SF:
    case "Special Force":
    case Command.COMMANDO:
    case "Commando":
      return [
        { title: "Ground Force Rank", ranks: GROUND_FORCE_RANKS },
        { title: "Non-Commissioned Rank", ranks: NCO_RANKS }
      ];
    case Command.NV:
    case "Navy":
      return [
        { title: "Navy Rank", ranks: NAVY_RANKS }
      ];
    case Command.CIVIL:
    case "Civil":
      return [
        { title: "Civil Rank", ranks: CIVIL_RANKS }
      ];
    case Command.OTHERS:
    case "Others":
      return [];
    default:
      return null;
  }
}

export function formatRankDisplay(rank: string | undefined | null, command?: Command | string, t?: (key: string) => string): string {
  if (!rank) return '';
  if (rank === '-' || rank === '--') return '--';
  if (rank === 'ሌሎች') return '--';
  return t ? t(rank) : rank;
}

interface GroupedRankSelectProps {
  value: string;
  onChange: (value: string) => void;
  command?: Command | string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

const GroupedRankSelect: React.FC<GroupedRankSelectProps> = ({
  value,
  onChange,
  command,
  disabled = false,
  className = "",
  placeholder
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  const isOthers = command === Command.OTHERS || command === "Others";
  const isCommandEmpty = !command;
  const isDisabled = disabled || isCommandEmpty || isOthers;

  const rankGroups = getRankGroupsForCommand(command);
  const isFlatList = command === Command.NV || command === "Navy" || command === Command.CIVIL || command === "Civil";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset expanded group when dropdown opens/closes or command changes
  useEffect(() => {
    if (!isOpen) {
      setExpandedGroup(null);
    }
  }, [isOpen]);

  const displayPlaceholder = placeholder || t('selectRank');

  const getDisplayText = () => {
    if (isOthers) return "-";
    if (!value) return displayPlaceholder;
    return formatRankDisplay(value, command, t);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        disabled={isDisabled}
        className={`
          w-full flex justify-between items-center text-left
          bg-slate-800 border transition-all duration-300 rounded-lg px-4 py-3
          text-sm font-medium shadow-sm relative overflow-hidden group
          ${isDisabled ? 'opacity-50 cursor-not-allowed border-gray-700 bg-gray-800 text-gray-400' : 'hover:border-gold-500/50 hover:shadow-[0_0_15px_rgba(212,175,55,0.1)] cursor-pointer'}
          ${isOpen ? 'border-gold-500 ring-1 ring-gold-500/50 text-white' : 'border-military-600 text-gray-200'}
        `}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-gold-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"/>
        
        <span className={`block truncate relative z-10 ${(!value && !isOthers) ? 'text-gray-400' : ''}`}>
          {getDisplayText()}
        </span>
        
        <ChevronDown 
          size={16} 
          className={`ml-2 text-gold-500 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'rotate-180 scale-110' : 'rotate-0'}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && !isDisabled && rankGroups && (
        <div className={`
          absolute left-0 w-full mt-2 origin-top-right bg-slate-900 border border-gold-500/30 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] 
          overflow-hidden z-[100] transition-all duration-200 ease-out backdrop-blur-md
        `}>
          <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gold-500/30 scrollbar-track-transparent p-1.5 space-y-1">
            {isFlatList ? (
              // Flat list for Navy & Civil
              rankGroups[0]?.ranks.map((rank) => {
                const isSelected = value === rank;
                return (
                  <div
                    key={rank}
                    onClick={() => {
                      onChange(rank);
                      setIsOpen(false);
                    }}
                    className={`
                      flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-all duration-200 group
                      ${isSelected 
                          ? 'bg-gold-500 text-black font-bold shadow-md' 
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'}
                    `}
                  >
                    <span className={`truncate ${isSelected ? '' : 'group-hover:translate-x-1 transition-transform duration-200'}`}>
                      {rank === 'ሌሎች' ? t('ሌሎች') : t(rank)}
                    </span>
                    {isSelected && <Check size={14} className="ml-2 shrink-0 animate-in zoom-in duration-200" />}
                  </div>
                );
              })
            ) : (
              // Grouped expandable lists for Air Force, Ground Force, Special Force, Commando
              rankGroups.map((group) => {
                const isExpanded = expandedGroup === group.title;
                return (
                  <div key={group.title} className="rounded-lg overflow-hidden border border-military-800/60 bg-slate-900/60">
                    <button
                      type="button"
                      onClick={() => setExpandedGroup(isExpanded ? null : group.title)}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-gold-400 bg-military-900/80 hover:bg-military-800 transition-colors cursor-pointer text-left"
                    >
                      <span>{t(group.title)}</span>
                      <ChevronRight
                        size={14}
                        className={`text-gold-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="p-1 space-y-0.5 bg-slate-950/40 border-t border-military-800">
                        {group.ranks.map((rank) => {
                          const isSelected = value === rank;
                          return (
                            <div
                              key={rank}
                              onClick={() => {
                                onChange(rank);
                                setIsOpen(false);
                              }}
                              className={`
                                flex items-center justify-between px-4 py-2 rounded-md cursor-pointer text-sm transition-all duration-150 group
                                ${isSelected 
                                    ? 'bg-gold-500 text-black font-bold shadow-md' 
                                    : 'text-gray-300 hover:bg-white/10 hover:text-white pl-5'}
                              `}
                            >
                              <span className="truncate">
                                {t(rank)}
                              </span>
                              {isSelected && <Check size={14} className="ml-2 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {rankGroups.length === 0 && (
              <div className="p-4 text-gray-500 text-center text-xs italic">{t('noOptions')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupedRankSelect;
