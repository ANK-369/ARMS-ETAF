import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  ShieldCheck, Plane, Lock, User, Cpu, Globe, Cloud, RefreshCw, CheckCircle, 
  Search, Eye, FileText, Database, Shield, AlertTriangle, KeyRound, ArrowRight,
  TrendingUp, Award, Calendar, ChevronRight, HardDrive, Info, CheckSquare,
  DollarSign, ShoppingCart, Users, Layers, MapPin, Archive, Filter, FileSpreadsheet,
  Printer, ArrowDownLeft, ArrowUpRight, Ban, Check, ShieldAlert, Menu, X, Settings, Trash2, Clock, FileDown
} from 'lucide-react';
import { 
  getDB, saveDB, getStoredUsername, getStoredAdminUsername, verifyPassword, resetPasswordDirectly,
  getStoredSecurityQuestion, updateStoredCredentials, updateSecurityQuestion, updateAdminCredentialsDirectly,
  isNewUser, sha256, clearDatabaseDataForFreshStart
} from '../services/db';
import { getGitHubConfig, saveGitHubConfig, fetchFromGitHub, pushToGitHub, listUserBackups, getFolderName, autoDetectGitHubPath, listAllRepositoryBackups, RepoFileDetail } from '../services/githubService';
import { analyzeData, chatWithAI, stripMarkdown } from '../services/geminiService';
import { AppData, StoreItem, Manpower, Expense, IncomeItem, Subsidy, Transfer, Refund, RationLog } from '../types';
import { formatEthiopianDate, getCurrentEthiopianDate } from '../services/ethiopianDate';
import { useLanguage } from '../contexts/LanguageContext';
import { useDate } from '../contexts/DateContext';
import etafLogo from '../assets/images/etaf_logo.png';

export const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { language, toggleLanguage, t } = useLanguage();
  const { month, year } = useDate();
  
  // Navigation tabs representing high-detail sectors
  const [activeTab, setActiveTab] = useState<'overview' | 'manpower' | 'market' | 'finance' | 'store' | 'security' | 'ai' | 'about'>('overview');
  
  // Default search and date filters applied to lists
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Sector-specific drop filters
  const [manpowerCommandFilter, setManpowerCommandFilter] = useState<string>('all');
  const [manpowerTypeFilter, setManpowerTypeFilter] = useState<string>('all');
  const [financeTypeFilter, setFinanceTypeFilter] = useState<string>('all');
  const [stockAlertFilter, setStockAlertFilter] = useState<string>('all');

  // Real Database state
  const [liveDb, setLiveDb] = useState<AppData | null>(null);
  
  // Passcode settings state
  const [newPasscode, setNewPasscode] = useState<string>('');
  const [passcodeSuccess, setPasscodeSuccess] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string>('');
  const [passcodeLoading, setPasscodeLoading] = useState<boolean>(false);

  // Cloud backup sync state
  const [githubSyncing, setGithubSyncing] = useState<boolean>(false);
  const [githubMessage, setGithubMessage] = useState<string>('');
  const [ghConfig, setGhConfig] = useState(() => getGitHubConfig());
  const [showGhConfigForm, setShowGhConfigForm] = useState<boolean>(true); // Set to true by default for easier visibility

  // Path Input Local State (prevents overwriting custom edits mid-typing)
  const [pathInput, setPathInput] = useState<string>(() => {
    const conf = getGitHubConfig();
    return conf.path || 'arms_db.json';
  });

  // Popup Credential Proving Section States
  const [showProvingModal, setShowProvingModal] = useState<boolean>(false);
  const [provingPath, setProvingPath] = useState<string>('');
  const [provingPassword, setProvingPassword] = useState<string>('');
  const [provingError, setProvingError] = useState<string>('');
  const [provingLoading, setProvingLoading] = useState<boolean>(false);
  const [remoteDbData, setRemoteDbData] = useState<any>(null);

  useEffect(() => {
    if (ghConfig.path) {
      setPathInput(ghConfig.path);
    }
  }, [ghConfig.path]);

  // Mobile navigation state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Admin credentials state
  const [adminUsername, setAdminUsername] = useState<string>(() => getStoredUsername());
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState<string>('');
  const [adminSecurityQuestion, setAdminSecurityQuestion] = useState<string>(() => getStoredSecurityQuestion());
  const [adminSecurityAnswer, setAdminSecurityAnswer] = useState<string>('');
  const [adminSuccess, setAdminSuccess] = useState<string>('');
  const [adminError, setAdminError] = useState<string>('');
  const [adminLoading, setAdminLoading] = useState<boolean>(false);

  // Commander credentials state
  const [commanderUsername, setCommanderUsername] = useState<string>(() => getStoredAdminUsername());
  const [commanderPassword, setCommanderPassword] = useState<string>('');
  const [commanderPasswordConfirm, setCommanderPasswordConfirm] = useState<string>('');
  const [commanderSuccess, setCommanderSuccess] = useState<string>('');
  const [commanderError, setCommanderError] = useState<string>('');
  const [commanderLoading, setCommanderLoading] = useState<boolean>(false);

  // AI assistant states
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiChatHistory, setAiChatHistory] = useState<{ role: 'user' | 'model'; content: string }[]>([]);
  const [aiChatInput, setAiChatInput] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiChatHistory]);

  // Live clock, printing, and repo file switching states
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [allRepoFiles, setAllRepoFiles] = useState<RepoFileDetail[]>([]);
  const [isLoadingAllFiles, setIsLoadingAllFiles] = useState<boolean>(false);
  const [allFilesError, setAllFilesError] = useState<string>('');

  // Backups states
  const [detectedBackups, setDetectedBackups] = useState<any[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState<boolean>(false);
  const [backupScanError, setBackupScanError] = useState<string>('');
  const [loadedBackupPath, setLoadedBackupPath] = useState<string>('');
  const [isMerging, setIsMerging] = useState<boolean>(false);

  // Load database on mount
  const refreshDatabase = () => {
    const db = getDB();
    setLiveDb(db);
  };

  const scanBackups = async () => {
    setIsLoadingBackups(true);
    setBackupScanError('');
    try {
      const folderName = getFolderName(year, month);
      const { backups, error } = await listUserBackups(folderName);
      if (error) {
        setBackupScanError(error);
      } else {
        setDetectedBackups(backups);
      }
    } catch (err: any) {
      setBackupScanError(err.message || String(err));
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleLoadBackup = async (backupPath: string, filename: string) => {
    setGithubSyncing(true);
    setGithubMessage(language === 'en' ? `Loading backup ${filename}...` : `${filename} ባካፕ በመጫን ላይ...`);
    try {
      const { data, error } = await fetchFromGitHub(backupPath);
      if (data) {
        setLiveDb(data);
        setLoadedBackupPath(backupPath);
        setGithubMessage(language === 'en' ? `Successfully loaded ${filename}!` : `${filename} በትክክል ተጭኗል!`);
      } else if (error) {
        setBackupScanError(error);
        setGithubMessage(`Load Failed: ${error}`);
      }
    } catch (err: any) {
      setBackupScanError(err.message || String(err));
    } finally {
      setGithubSyncing(false);
      setTimeout(() => setGithubMessage(''), 4000);
    }
  };

  const handleResetToLocal = () => {
    refreshDatabase();
    setLoadedBackupPath('');
    setGithubMessage(language === 'en' ? "Returned to Local Replica database." : "ወደ አካባቢያዊ መረጃ ተመልሰዋል።");
    setTimeout(() => setGithubMessage(''), 4000);
  };

  const handleMergeAllBackups = async () => {
    if (detectedBackups.length === 0) return;
    setIsMerging(true);
    setGithubMessage(language === 'en' ? "Aggregating all user files for this month..." : "የሁሉንም ተጠቃሚዎች ፋይል እያጠቃለልን ነው...");
    try {
      const mergedDb: AppData = {
        manpower: [],
        incomeItems: [],
        subsidies: [],
        transfers: [],
        expenses: [],
        refunds: [],
        notes: [],
        storeItems: [],
        storeOrders: [],
        foodProgram: [],
        programSettings: {
          title: 'ጠቅላላ ማጠቃለያ',
          subtitle: 'የሁሉም ተጠቃሚዎች ድምር መረጃ',
          footerLeft: '',
          footerRight: ''
        },
        foodProgramArchive: [],
        mealIngredients: {},
        rationHistory: []
      };

      for (const backup of detectedBackups) {
        const { data } = await fetchFromGitHub(backup.path);
        if (data) {
          const sourceTag = backup.filename.replace('.json', '').toUpperCase();
          
          if (Array.isArray(data.manpower)) {
            mergedDb.manpower.push(...data.manpower.map(m => ({ ...m, description: m.description ? `${m.description} (${sourceTag})` : `(${sourceTag})` })));
          }
          if (Array.isArray(data.incomeItems)) {
            mergedDb.incomeItems.push(...data.incomeItems.map(i => ({ ...i, description: i.description ? `${i.description} (${sourceTag})` : `(${sourceTag})` })));
          }
          if (Array.isArray(data.expenses)) {
            mergedDb.expenses.push(...data.expenses.map(e => ({ ...e, description: e.description ? `${e.description} (${sourceTag})` : `(${sourceTag})` })));
          }
          if (Array.isArray(data.subsidies)) {
            mergedDb.subsidies.push(...data.subsidies.map(s => ({ ...s, description: s.description ? `${s.description} (${sourceTag})` : `(${sourceTag})` })));
          }
          if (Array.isArray(data.refunds)) {
            mergedDb.refunds.push(...data.refunds.map(r => ({ ...r, description: r.description ? `${r.description} (${sourceTag})` : `(${sourceTag})` })));
          }
          if (Array.isArray(data.storeItems)) {
            data.storeItems.forEach(item => {
              const existing = mergedDb.storeItems.find(si => si.name?.toLowerCase()?.trim() === item.name?.toLowerCase()?.trim() && si.category === item.category);
              if (existing) {
                existing.amount = Number(existing.amount) + Number(item.amount);
              } else {
                mergedDb.storeItems.push({ ...item });
              }
            });
          }
          if (Array.isArray(data.rationHistory)) {
            mergedDb.rationHistory.push(...data.rationHistory);
          }
        }
      }

      setLiveDb(mergedDb);
      setLoadedBackupPath('merged');
      setGithubMessage(language === 'en' ? "Successfully aggregated all users!" : "የሁሉንም ተጠቃሚዎች መረጃ በተሳካ ሁኔታ አጠቃልለናል!");
    } catch (err: any) {
      setBackupScanError(err.message || String(err));
    } finally {
      setIsMerging(false);
      setTimeout(() => setGithubMessage(''), 5000);
    }
  };

  const scanAllRepositoryFiles = async () => {
    setIsLoadingAllFiles(true);
    setAllFilesError('');
    try {
      const { files, error } = await listAllRepositoryBackups();
      if (error) {
        setAllFilesError(error);
      } else {
        setAllRepoFiles(files);
      }
    } catch (err: any) {
      setAllFilesError(err.message || String(err));
    } finally {
      setIsLoadingAllFiles(false);
    }
  };

  const handleLoadFilePathNoCredentials = async (targetPath: string) => {
    setGithubSyncing(true);
    setGithubMessage(language === 'en' ? `Loading database file: ${targetPath}...` : `${targetPath} ዳታቤዝ በመጫን ላይ...`);
    try {
      const { data, error } = await fetchFromGitHub(targetPath);
      if (error) {
        alert(language === 'en' ? `Failed to load file: ${error}` : `ፋይሉን መጫን አልተሳካም፦ ${error}`);
        return;
      }
      if (data) {
        // Save GitHub Config with new path
        const updated = { ...ghConfig, path: targetPath, enabled: true };
        saveGitHubConfig(updated);
        setGhConfig(updated);
        setPathInput(targetPath);
        
        // Update state in memory for observation
        setLiveDb(data);
        setLoadedBackupPath(targetPath);
        setGithubMessage(language === 'en' ? "Successfully loaded database for observation!" : "የፋይል መንገዱ መረጃ ለዕይታ በድል ተጭኗል!");
        setTimeout(() => {
          setGithubMessage('');
        }, 3000);
      }
    } catch (err: any) {
      alert(`Error loading database file: ${err.message || String(err)}`);
    } finally {
      setGithubSyncing(false);
    }
  };

  useEffect(() => {
    refreshDatabase();
    setLoadedBackupPath('');
    
    // Setup ticking clock interval
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (ghConfig.enabled && ghConfig.token && ghConfig.owner && ghConfig.repo) {
      scanBackups();
      scanAllRepositoryFiles();
    }
  }, [month, year, ghConfig.enabled, ghConfig.token, ghConfig.owner, ghConfig.repo]);

  // Auto-detect and populate GitHub File Path when Owner, Repo, and Token are entered
  useEffect(() => {
    if (!isNewUser()) return; // Skip automatic path generation for old users

    const { owner, repo, token } = ghConfig;
    if (!owner || !repo || !token) return;

    // Skip if current path already matches the expected directory structure to prevent infinite loops or overwriting custom overrides
    const timer = setTimeout(async () => {
      setGithubSyncing(true);
      setGithubMessage(language === 'en' ? "Auto-detecting file path from GitHub..." : "የፋይል መንገዱን ከ GitHub ላይ በራስ-ሰር በመፈለግ ላይ...");
      try {
        const detectedPath = await autoDetectGitHubPath(owner, repo, token);
        
        // Update state without removing other inputted data (using functional state updates)
        setGhConfig(prev => {
          const updated = {
            ...prev,
            path: detectedPath,
            enabled: true // Enable synchronization by default
          };
          // Save to local storage automatically so they don't have to save manually
          saveGitHubConfig(updated);
          return updated;
        });
        
        setGithubMessage(language === 'en' 
          ? `Cloud path auto-resolved and configured: ${detectedPath}` 
          : `የክላውድ ፋይል መንገድ በራስ-ሰር ተገኝቷል፦ ${detectedPath}`
        );
      } catch (err: any) {
        console.error("Auto-resolve failed:", err);
      } finally {
        setGithubSyncing(false);
        setTimeout(() => setGithubMessage(''), 4000);
      }
    }, 1200); // Debounce to allow seamless typing

    return () => clearTimeout(timer);
  }, [ghConfig.owner, ghConfig.repo, ghConfig.token]);

  const handleVerifyAndConnectPath = async (targetPath: string) => {
    if (!targetPath.trim()) {
      setGithubMessage(language === 'en' ? "Please enter a valid path." : "እባክዎ ትክክለኛ የፋይል መንገድ ያስገቡ።");
      return;
    }
    
    setGithubSyncing(true);
    setGithubMessage(language === 'en' ? "Checking remote file..." : "ክላውድ ላይ ያለውን ፋይል በመፈተሽ ላይ...");
    
    try {
      const { data, error, sha } = await fetchFromGitHub(targetPath);
      
      if (error) {
        if (error.includes('404') || error.toLowerCase().includes('not found')) {
          alert(language === 'en' 
            ? `The file "${targetPath}" does not exist on GitHub. Reverting to the automatically generated file path.` 
            : `"${targetPath}" የተባለው ፋይል GitHub ላይ አልተገኘም። ወደ ራስ-ሰር የተገኘው የፋይል መንገድ እየተመለሰ ነው።`
          );
          
          const { owner, repo, token } = ghConfig;
          const detectedPath = await autoDetectGitHubPath(owner, repo, token);
          setPathInput(detectedPath);
          const updated = { ...ghConfig, path: detectedPath, enabled: true };
          saveGitHubConfig(updated);
          setGhConfig(updated);
          
          // Clear current local display because it's a brand new path on GitHub!
          clearDatabaseDataForFreshStart();
          
          setGithubMessage(language === 'en' 
            ? "Reverted to automatically generated file path. Local database state reset for new file." 
            : "ወደ ራስ-ሰር የተገኘው የፋይል መንገድ ተመልሷል። ለአዲሱ ፋይል የአካባቢው መረጃ ተጠርጓል።"
          );
          setTimeout(() => window.location.reload(), 1500);
          return;
        } else {
          throw new Error(error);
        }
      }
      
      if (data) {
        // Admin is above all; load database for in-memory observation in Admin Dashboard
        const updated = { ...ghConfig, path: targetPath, enabled: true };
        saveGitHubConfig(updated);
        setGhConfig(updated);
        setLiveDb(data);
        setLoadedBackupPath(targetPath);
        setGithubMessage(language === 'en' ? "Data retrieved and loaded for observation!" : "ክላውድ ዳታው ለመመልከት በትክክል ተጭኗል!");
        setTimeout(() => setGithubMessage(''), 3000);
      } else {
        const updated = { ...ghConfig, path: targetPath, enabled: true };
        saveGitHubConfig(updated);
        setGhConfig(updated);
        setGithubMessage(language === 'en' 
          ? "Path linked to empty file." 
          : "መንገዱ ከባዶ ፋይል ጋር ተገናኝቷል።"
        );
        setTimeout(() => setGithubMessage(''), 3000);
      }
    } catch (err: any) {
      setGithubMessage(language === 'en' ? `Connection failed: ${err.message || err}` : `መገናኘት አልተሳካም፦ ${err.message || err}`);
    } finally {
      setGithubSyncing(false);
    }
  };

  const handleProveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvingError('');
    setProvingLoading(true);
    
    try {
      const inputHash = await sha256(provingPassword);
      const targetCreds = remoteDbData?.securityCredentials;
      const adminHash = targetCreds?.adminPasswordHash || remoteDbData?.adminPasswordHash;
      const userHash = targetCreds?.userPasswordHash || remoteDbData?.userPasswordHash;
      
      const isValidAdmin = !!adminHash && adminHash === inputHash;
      const isValidUser = !!userHash && userHash === inputHash;
      
      // Fallbacks for default accounts ONLY IF the remote file path does NOT have custom password hashes configured!
      const isDefaultAdmin = !adminHash && (!targetCreds?.adminCustomized || targetCreds?.adminCustomized === 'false') && provingPassword === 'etaf';
      const isDefaultUser = !userHash && (!targetCreds?.userCustomized || targetCreds?.userCustomized === 'false') && provingPassword === 'admin';
      
      if (isValidAdmin || isValidUser || isDefaultAdmin || isDefaultUser) {
        const updated = { ...ghConfig, path: provingPath, enabled: true };
        saveGitHubConfig(updated);
        setGhConfig(updated);
        
        saveDB(remoteDbData, true);
        
        setGithubMessage(language === 'en' 
          ? "Credentials successfully verified! Loaded remote database." 
          : "መግቢያው በትክክል ተረጋግጧል! የክላውድ መረጃው ተጭኗል።"
        );
        setShowProvingModal(false);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setProvingError(language === 'en' 
          ? "Incorrect passcode. Access to this database file is denied." 
          : "የይለፍ ቃሉ የተሳሳተ ነው! ወደዚህ የዳታቤዝ ፋይል መግባት አይፈቀድም።"
        );
      }
    } catch (err: any) {
      setProvingError(err.message || String(err));
    } finally {
      setProvingLoading(false);
    }
  };

  // Save GitHub Config
  const handleSaveGitHubConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (pathInput !== ghConfig.path) {
      handleVerifyAndConnectPath(pathInput);
      return;
    }
    saveGitHubConfig(ghConfig);
    setGithubMessage(language === 'en' ? "GitHub Configuration Saved Successfully!" : "የ GitHub ቅንጅቶች በተሳካ ሁኔታ ተቀምጠዋል!");
    setTimeout(() => setGithubMessage(''), 4000);
  };

  // Sync from Cloud
  const handleManualGitHubSync = async () => {
    if (pathInput !== ghConfig.path) {
      handleVerifyAndConnectPath(pathInput);
      return;
    }
    setGithubSyncing(true);
    setGithubMessage(language === 'en' ? "Fetching database state from GitHub..." : "ዳታቤዝ ከ GitHub ላይ በማመሳሰል ላይ...");
    try {
      const config = getGitHubConfig();
      if (!config.enabled || !config.token) {
        setGithubMessage(language === 'en' ? "GitHub is not configured yet. Configure in Security panel." : "GitHub አልተዋቀረም። እባክዎን በደህንነት ቅንብር ላይ ያዋቅሩት።");
        setTimeout(() => setGithubMessage(''), 4000);
        setGithubSyncing(false);
        return;
      }
      const { data, error } = await fetchFromGitHub();
      if (data) {
        saveDB(data, true);
        setLiveDb(data);
        setGithubMessage(language === 'en' ? "Ledger downloaded and synchronized successfully!" : "የክላውድ መዝገብ በተሳካ ሁኔታ ወርዷል!");
      } else if (error) {
        setGithubMessage(`${language === 'en' ? 'Sync Failed' : 'ማመሳሰል አልተሳካም'}: ${error}`);
      } else {
        setGithubMessage(language === 'en' ? "Connected but database file is empty." : "ተገናኝቷል ግን ዳታቤዙ ባዶ ነው።");
      }
    } catch (err) {
      setGithubMessage(language === 'en' ? "Fatal: Unable to access GitHub repository." : "ስህተት፡ ሪፖዚቶሪውን ማግኘት አልተቻለም።");
    } finally {
      setTimeout(() => setGithubMessage(''), 5000);
      setGithubSyncing(false);
    }
  };

  // Push to Cloud
  const handleManualPushBackup = async () => {
    if (pathInput !== ghConfig.path) {
      handleVerifyAndConnectPath(pathInput);
      return;
    }
    if (!liveDb) return;
    setGithubSyncing(true);
    setGithubMessage(language === 'en' ? "Pushing local database state to Cloud..." : "የአካባቢውን ዳታቤዝ ወደ ክላውድ በመስቀል ላይ...");
    try {
      const config = getGitHubConfig();
      if (!config.enabled || !config.token) {
        setGithubMessage(language === 'en' ? "GitHub cloud is not configured." : "GitHub አልተገናኘም።");
        setTimeout(() => setGithubMessage(''), 4000);
        setGithubSyncing(false);
        return;
      }
      const res = await pushToGitHub(liveDb);
      if (res.success) {
        setGithubMessage(language === 'en' ? "Database securely backed up to GitHub Cloud!" : "ዳታቤዙ በደህንነት ወደ GitHub ተቀምጧል!");
      } else {
        setGithubMessage(`${language === 'en' ? 'Backup Failed' : 'ባካፕ ማድረግ አልተሳካም'}: ${res.error}`);
      }
    } catch (err: any) {
      setGithubMessage(`${language === 'en' ? 'Fatal Backup Error' : 'ባካፕ ማድረግ አልተሳካም'}: ${err.message || err}`);
    } finally {
      setTimeout(() => setGithubMessage(''), 6000);
      setGithubSyncing(false);
    }
  };

  const handleFreshStart = async () => {
    const confirm = window.confirm(language === 'en'
      ? "Are you sure you want to perform a Fresh Start? This will clear all local data from the website so you can start completely fresh with a new file. Nothing will be deleted from your GitHub repository."
      : "እርግጠኛ ነዎት አዲስ ጅምር (Fresh Start) ማድረግ ይፈልጋሉ? ይህ በአሳሽዎ ላይ ያለውን የአሁኑን መረጃ ያጸዳል፣ በዚህም በአዲስ ፋይል መጀመር ይችላሉ። ከ GitHub ማከማቻዎ ምንም አይነት ነገር አይጠፋም።"
    );
    
    if (!confirm) return;

    setGithubSyncing(true);
    setGithubMessage(language === 'en' ? "Performing Fresh Start..." : "አዲስ ጅምር በማከናወን ላይ...");

    try {
      // 1. Clear all browser storage used by the application
      localStorage.clear();
      sessionStorage.clear();

      setGithubMessage(language === 'en' 
        ? "Fresh start complete! Redirecting to login..." 
        : "አዲስ ጅምር በተሳካ ሁኔታ ተጠናቋል! ወደ መግቢያ ገጽ በመቀየር ላይ..."
      );

      setTimeout(() => {
        window.location.href = '/#/login';
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      alert(err.message || String(err));
      setGithubSyncing(false);
    }
  };

  // Update passcode
  const handleUpdatePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeSuccess('');
    setPasscodeError('');
    
    if (!newPasscode.trim()) {
      setPasscodeError(language === 'en' ? "Passcode cannot be empty." : "የይለፍ ቃል ባዶ መሆን አይችልም።");
      return;
    }

    setPasscodeLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      await resetPasswordDirectly(newPasscode);
      refreshDatabase();
      setPasscodeSuccess(language === 'en' ? "Administrative passcode updated successfully!" : "የአስተዳዳሪ የይለፍ ቃል በትክክል ተቀይሯል!");
      setNewPasscode('');
    } catch (err) {
      setPasscodeError(language === 'en' ? "Security vault update rejected." : "የደህንነት ለውጥ ተከልክሏል።");
    } finally {
      setPasscodeLoading(false);
    }
  };

  // Update System Commander (Admin Role) Credentials
  const handleUpdateCommanderCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommanderSuccess('');
    setCommanderError('');

    if (!commanderUsername.trim()) {
      setCommanderError(language === 'en' ? "Username cannot be empty." : "የተጠቃሚ ስም ባዶ መሆን አይችልም።");
      return;
    }

    if (commanderPassword && commanderPassword !== commanderPasswordConfirm) {
      setCommanderError(language === 'en' ? "Passwords do not match." : "የይለፍ ቃሎች አይዛመዱም።");
      return;
    }

    setCommanderLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const pushRes = await updateAdminCredentialsDirectly(commanderUsername.trim(), commanderPassword ? commanderPassword : undefined);
      if (pushRes && pushRes.success === false) {
        setCommanderError(language === 'en'
          ? `Credentials saved locally, but failed to sync to GitHub: ${pushRes.error}`
          : `መለያው በአካባቢ ተቀምጧል፣ ነገር ግን ወደ GitHub መላክ አልተሳካም፦ ${pushRes.error}`
        );
        return;
      }

      setCommanderSuccess(language === 'en' 
        ? "System Commander credentials updated & synced to GitHub! Logging out to apply changes..." 
        : "የስርዓቱ አዛዥ መግቢያ መረጃ በትክክል ተቀይሮ ወደ GitHub ተልኳል! ለመተግበር እባክዎ እንደገና ይግቡ...");
      setCommanderPassword('');
      setCommanderPasswordConfirm('');
      
      setTimeout(() => {
        localStorage.removeItem("arms_auth");
        localStorage.removeItem("arms_auth_role");
        window.location.reload();
      }, 1800);
    } catch (err: any) {
      setCommanderError(language === 'en' ? `Failed to update: ${err.message || err}` : `ማዘመን አልተሳካም፦ ${err.message || err}`);
    } finally {
      setCommanderLoading(false);
    }
  };

  // Update Administrative Credentials (Username, Password, Security Question)
  const handleUpdateAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminSuccess('');
    setAdminError('');

    if (!adminUsername.trim()) {
      setAdminError(language === 'en' ? "Username cannot be empty." : "የተጠቃሚ ስም ባዶ መሆን አይችልም።");
      return;
    }

    if (adminPassword && adminPassword !== adminPasswordConfirm) {
      setAdminError(language === 'en' ? "Passwords do not match." : "የይለፍ ቃሎች አይዛመዱም።");
      return;
    }

    setAdminLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      // 1. Update Username & Password
      const pushRes = await updateStoredCredentials(adminUsername.trim(), adminPassword ? adminPassword : undefined);

      // 2. Update Security Question & Answer
      if (adminSecurityQuestion.trim()) {
        await updateSecurityQuestion(
          adminSecurityQuestion.trim(), 
          adminSecurityAnswer.trim() ? adminSecurityAnswer.trim() : undefined
        );
      }

      if (pushRes && pushRes.success === false) {
        setAdminError(language === 'en'
          ? `Credentials saved locally, but failed to sync to GitHub: ${pushRes.error}`
          : `መለያው በአካባቢ ተቀምጧል፣ ነገር ግን ወደ GitHub መላክ አልተሳካም፦ ${pushRes.error}`
        );
        return;
      }

      setAdminSuccess(language === 'en' 
        ? "Administrative credentials updated & synced to GitHub! Logging out to apply changes..." 
        : "የአስተዳዳሪ መለያ መረጃ በትክክል ተቀይሮ ወደ GitHub ተልኳል! ለመተግበር እባክዎ እንደገና ይግቡ...");
      setAdminPassword('');
      setAdminPasswordConfirm('');
      setAdminSecurityAnswer('');

      setTimeout(() => {
        localStorage.removeItem("arms_auth");
        localStorage.removeItem("arms_auth_role");
        window.location.reload();
      }, 1800);
    } catch (err: any) {
      setAdminError(language === 'en' ? `Failed to update: ${err.message || err}` : `ማዘመን አልተሳካም፦ ${err.message || err}`);
    } finally {
      setAdminLoading(false);
    }
  };

  // Run AI Executive Summary
  const handleTriggerAiSummary = async () => {
    if (!liveDb) return;
    setIsAiLoading(true);
    setAiAnalysisResult('');
    try {
      const dataString = JSON.stringify({
        manpowerCount: liveDb.manpower.length,
        storeItems: liveDb.storeItems,
        expenses: liveDb.expenses,
        subsidies: liveDb.subsidies,
        refunds: liveDb.refunds,
        rationHistory: liveDb.rationHistory
      }, null, 2);

      const query = `Provide a comprehensive, high-level, read-only AI Logistics executive summary report of our real command records in ${language === 'en' ? 'English' : 'Amharic'}. Audit the expenditures, remaining ration stocks, and flag low items or financial anomalies.`;
      
      const response = await analyzeData(query, dataString, language);
      setAiAnalysisResult(response);
    } catch (e) {
      setAiAnalysisResult(language === 'en' ? "Failed to query AI Engine. Verify key configuration." : "ከAI ሞተር ጋር መገናኘት አልተቻለም። የቁልፍ ቅንብሩን ያረጋግጡ።");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Send message to AI
  const handleSendAiChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiChatInput.trim() || isAiLoading || !liveDb) return;

    const userMessage = aiChatInput.trim();
    setAiChatInput('');
    setIsAiLoading(true);

    const updatedHistory = [...aiChatHistory, { role: 'user' as const, content: userMessage }];
    setAiChatHistory(updatedHistory);

    try {
      const dbContext = {
        databaseState: {
          manpower: liveDb.manpower,
          expenses: liveDb.expenses,
          storeItems: liveDb.storeItems,
          subsidies: liveDb.subsidies,
          rationHistory: liveDb.rationHistory
        },
        systemContext: {
          generationTime: new Date().toISOString(),
          firmware: "ARMS Admin Secure Core v4.9",
          gitHubAttached: !!getGitHubConfig().enabled
        }
      };

      const response = await chatWithAI(
        updatedHistory,
        userMessage,
        dbContext,
        language
      );

      setAiChatHistory(prev => [...prev, { role: 'model' as const, content: stripMarkdown(response) }]);
    } catch (err) {
      setAiChatHistory(prev => [...prev, { role: 'model' as const, content: "ERROR: Communication gateway offline." }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handlePrint = () => {
    setShowPrintModal(true);
  };

  // Shared Helper for date filtering
  const filterByDateRange = (itemDate: string) => {
    if (!itemDate) return true;
    if (startDate && itemDate < startDate) return false;
    if (endDate && itemDate > endDate) return false;
    return true;
  };

  // Real data calculations
  const manpowerList = liveDb?.manpower || [];
  const expensesList = liveDb?.expenses || [];
  const subsidiesList = liveDb?.subsidies || [];
  const refundsList = liveDb?.refunds || [];
  const storeItemsList = liveDb?.storeItems || [];
  const rationHistoryList = liveDb?.rationHistory || [];
  const storeOrdersList = liveDb?.storeOrders || [];

  // Active headcounts
  const activeManpower = manpowerList.filter(m => !m.endDate || m.endDate >= getCurrentEthiopianDate());
  const totalActivePersonnel = activeManpower.length;

  // Financial outputs
  const totalExpensesAmount = expensesList.reduce((sum, item) => sum + (Number(item.amount) * (Number(item.singlePrice) || 1)), 0);
  const totalSubsidiesAmount = subsidiesList.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalRefundsAmount = refundsList.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalIncomeItemsAmount = (liveDb?.incomeItems || []).reduce((sum, item) => sum + (Number(item.amount) * Number(item.singlePrice)), 0);
  
  // Net liquidity balance
  const totalNetLiquidity = (totalSubsidiesAmount + totalIncomeItemsAmount) - (totalExpensesAmount + totalRefundsAmount);

  // Store metrics
  const totalStockRemaining = storeItemsList.filter(i => i.category === 'inventory').reduce((sum, item) => sum + Number(item.amount), 0);
  const lowStockCount = storeItemsList.filter(i => i.category === 'inventory' && Number(i.amount) < 300).length;

  // Live filter maps
  // 1. Filtered Manpower
  const filteredManpower = manpowerList.filter(m => {
    const matchesSearch = `${m.firstName} ${m.lastName} ${m.rank} ${m.description || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = filterByDateRange(m.startDate);
    const matchesCommand = manpowerCommandFilter === 'all' || m.command === manpowerCommandFilter;
    const matchesType = manpowerTypeFilter === 'all' || m.type === manpowerTypeFilter;
    return matchesSearch && matchesDate && matchesCommand && matchesType;
  });

  // 2. Filtered Market Procurements (Expenses category === 'Market')
  const marketProcurements = expensesList.filter(e => e.category === 'Market');
  const filteredMarket = marketProcurements.filter(m => {
    const matchesSearch = `${m.itemName || ''} ${m.description || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = filterByDateRange(m.date);
    return matchesSearch && matchesDate;
  });

  // Ethiopian market reference averages
  const getMarketReferenceRate = (itemName: string): number => {
    const itemLower = itemName.toLowerCase();
    if (itemLower.includes('teff')) return 60;
    if (itemLower.includes('beef') || itemLower.includes('meat')) return 135;
    if (itemLower.includes('oil')) return 120;
    if (itemLower.includes('sugar')) return 75;
    if (itemLower.includes('wheat') || itemLower.includes('bread')) return 50;
    if (itemLower.includes('lentil') || itemLower.includes('misir')) return 85;
    return 90; // Default fallback reference
  };

  // 3. Filtered Financial Unified ledger
  // Merge all financial transactions into a single chronologically sorted unified trace
  interface UnifiedTransaction {
    id: string;
    date: string;
    type: 'subsidy' | 'expense' | 'refund' | 'income';
    categoryLabel: string;
    description: string;
    amount: number;
    flow: 'in' | 'out';
  }

  const unifiedLedger: UnifiedTransaction[] = [
    ...subsidiesList.map(s => ({
      id: s.id,
      date: s.date,
      type: 'subsidy' as const,
      categoryLabel: s.type === 'Financial' ? 'Federal Grant' : 'Food Allocation Grant',
      description: s.description || `${s.source} Funding`,
      amount: s.amount,
      flow: 'in' as const
    })),
    ...expensesList.map(e => ({
      id: e.id,
      date: e.date,
      type: 'expense' as const,
      categoryLabel: e.category === 'Market' ? 'Market Procurement' : e.category === 'Wage' ? 'Wage Disbursal' : 'Other Expenses',
      description: e.description || (e.itemName || e.workerName || e.reason || ''),
      amount: Number(e.amount) * (Number(e.singlePrice) || 1),
      flow: 'out' as const
    })),
    ...refundsList.map(r => ({
      id: r.id,
      date: r.stopDate,
      type: 'refund' as const,
      categoryLabel: 'Personnel Refund',
      description: r.description || `${r.rank} ${r.firstName} ${r.lastName} Exit`,
      amount: r.amount,
      flow: 'out' as const
    })),
    ...(liveDb?.incomeItems || []).map(i => ({
      id: i.id,
      date: i.date,
      type: 'income' as const,
      categoryLabel: 'Sector Income',
      description: i.description || i.name,
      amount: Number(i.amount) * Number(i.singlePrice),
      flow: 'in' as const
    }))
  ].sort((a, b) => b.date.localeCompare(a.date));

  const filteredFinance = unifiedLedger.filter(tx => {
    const matchesSearch = `${tx.categoryLabel} ${tx.description}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = filterByDateRange(tx.date);
    const matchesType = financeTypeFilter === 'all' || tx.type === financeTypeFilter;
    return matchesSearch && matchesDate && matchesType;
  });

  // 4. Filtered Store Items
  const filteredStoreItems = storeItemsList.filter(i => i.category === 'inventory').filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = filterByDateRange(item.date);
    const stockQty = Number(item.amount);
    let matchesAlert = true;
    if (stockAlertFilter === 'low') matchesAlert = stockQty < 300 && stockQty >= 100;
    else if (stockAlertFilter === 'critical') matchesAlert = stockQty < 100;
    else if (stockAlertFilter === 'ok') matchesAlert = stockQty >= 300;
    
    return matchesSearch && matchesDate && matchesAlert;
  });

  // 5. Filtered Ration History Logs
  const filteredRationHistory = rationHistoryList.filter(log => {
    const matchesSearch = `${log.day} ${log.itemsDeducted.map(i => i.itemName).join(', ')}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = filterByDateRange(log.dateExecuted);
    return matchesSearch && matchesDate;
  });

  // Custom localized translations helpers inside component
  const at = (key: string): string => {
    const labels: Record<string, { en: string; am: string }> = {
      adminCommand: { en: "ARMS ADMINISTRATIVE COMMAND CENTER", am: "የARMS የአስተዳደር መቆጣጠሪያ ማዕከል" },
      secureObservability: { en: "SECURE AUDIT PORTAL", am: "የተጠበቀ የኦዲት መግቢያ" },
      online: { en: "ONLINE STATUS", am: "በስራ ላይ" },
      pullCloud: { en: "SYNC CLOUD LEDGER", am: "የክላውድ መዝገብ አምጣ" },
      systemDate: { en: "SYSTEM DATE", am: "የሲስተም ቀን" },
      terminateSession: { en: "LOGOUT", am: "ውጣ" },
      readOnlyWarning: { en: "STRICT READ-ONLY OBSERVA-BILITY. MODIFICATIONS RESTRICTED.", am: "የኦዲት እይታ ብቻ። መረጃ መቀየር ወይም መደለዝ ተከለክሏል።" },
      filterByDate: { en: "Filter by Date Range", am: "በቀን ገደብ ፈልግ" },
      startDate: { en: "Start Date (YYYY-MM-DD)", am: "መጀመሪያ ቀን (წዓ-ወ-ቀ)" },
      endDate: { en: "End Date (YYYY-MM-DD)", am: "መጨረሻ ቀን (წዓ-ወ-ቀ)" },
      searchPlaceholder: { en: "Search records by details...", am: "መዝገቦችን በዝርዝር ፈልግ..." },
      all: { en: "All", am: "ሁሉም" },
      printReport: { en: "Print Section Report", am: "ሪፖርቱን ፕሪንት አድርግ" },
      observeOnly: { en: "OBSERVE ONLY", am: "ምልከታ ብቻ" },
      
      // Tabs
      overviewMatrix: { en: "Overview Matrix", am: "አጠቃላይ ማጠቃለያ" },
      manpowerSector: { en: "Manpower Sector", am: "የሰው ኃይል ዘርፍ" },
      marketSector: { en: "Market Sector", am: "የገበያ ግብይት" },
      financeSector: { en: "Finance Ledger", am: "የፋይናንስ ቁጥጥር" },
      storeRations: { en: "Store & Rations", am: "መጋዘን እና ስንቅ" },
      securityAudit: { en: "Security & Cloud", am: "ደህንነት እና ክላውድ" },
      aiIntelligence: { en: "AI Smart Analyst", am: "የላቀ AI ረዳት" },

      // Metrics
      totalActivePersonnel: { en: "Active Headcount", am: "ንቁ የሰው ኃይል" },
      totalMonthlyExpenses: { en: "Total Cash Outflow", am: "ጠቅላላ የፋይናንስ ወጪ" },
      totalAvailableStock: { en: "Total Store Stock", am: "በመጋዘን የቀረ ስንቅ" },
      alertStatus: { en: "Depleted Stock Alerts", am: "የተሟጠጡ ስንቆች" },

      // Sub-titles
      manpowerTitle: { en: "Live Manpower Allocation Audit List", am: "በስራ ላይ ያሉ የሰው ኃይል ምደባ ኦዲት" },
      marketTitle: { en: "Procurement & Ethiopian Market Price Audits", am: "የግዢ እና የኢትዮጵያ ገበያ ዋጋ ኦዲት" },
      financeTitle: { en: "Unified Command Financial Income & Expense Ledger", am: "የተዋሃደ የገቢ እና የፋይናንስ ወጪ መዝገብ" },
      storeTitle: { en: "Current Inventory Stock Audit", am: "የአሁኑ ግምጃ ቤት ስቶክ ኦዲት" },
      rationsTitle: { en: "Ration Deduction Executions Logs", am: "የሬሽን ቅናሽ አፈጻጸም ታሪኮች" },
      securityTitle: { en: "Terminal Access Credentials & Cloud Replication", am: "የተርሚናል መግቢያ እና የክላውድ ማመሳሰያ" },
      aiTitle: { en: "AI Smart Assistant & Logistics Summarizer", am: "የላቀ አርቴፊሻል ኢንተለጀንስ የሎጅስቲክስ ረዳት" },
      
      // Tables and headers
      name: { en: "Full Name", am: "ሙሉ ስም" },
      rank: { en: "Rank", am: "ማዕረግ" },
      command: { en: "Military Command", am: "ክፍለ ጦር" },
      rationType: { en: "Ration Category", am: "የሬሽን ዓይነት" },
      status: { en: "Status", am: "ሁኔታ" },
      action: { en: "Details", am: "ዝርዝር መግለጫ" },
      date: { en: "Date", am: "ቀን" },
      price: { en: "Unit Price", am: "የአንድ ዋጋ" },
      amount: { en: "Amount", am: "ብዛት" },
      total: { en: "Total Cost", am: "ጠቅላላ ዋጋ" },
      marketRef: { en: "Market Reference", am: "የገበያ ማጣቀሻ" },
      variance: { en: "Price Variance", am: "የዋጋ ልዩነት" },
      budgetAlloc: { en: "Financial Resource Distribution", am: "የበጀት ድጋፍ ስርጭት" },
      cashIn: { en: "Total Revenue / Inflows", am: "ጠቅላላ ገቢ / ግብዓት" },
      cashOut: { en: "Total Payments / Outflows", am: "ጠቅላላ ወጪ / ክፍያዎች" },
      netRes: { en: "Net Liquidity Reserve", am: "የተጣራ የክፍል ቀሪ በጀት" }
    };
    if (!labels[key]) return key;
    return labels[key][language] || key;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none selection:bg-gold-500/30 selection:text-gold-400 print:bg-white print:text-black">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 print:hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold-500/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:30px_30px]"></div>
      </div>

      {/* Top Banner Status Bar */}
      <header className="relative z-20 bg-slate-900/90 border-b border-white/5 backdrop-blur px-4 lg:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
        <div className="flex justify-between items-center w-full md:w-auto gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile hamburger menu toggle button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 -ml-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer shrink-0"
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0 flex items-center justify-center">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden flex items-center justify-center drop-shadow-[0_0_8px_#d4af37] border border-gold-500/30">
                  <img src={etafLogo} alt="Ethiopian Air Force Logo" className="w-full h-full object-cover scale-108" />
                </div>
              </div>
              <div className="min-w-0">
                <h1 className="text-[10px] sm:text-xs font-black tracking-wider text-white uppercase leading-none truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">{at('adminCommand')}</h1>
                <p className="text-[8px] text-emerald-400 font-bold font-mono flex items-center gap-1 uppercase mt-0.5 truncate">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                  <span className="truncate">{at('secureObservability')} • {at('online')}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Right Actions: Quick Lang and Logout */}
          <div className="flex lg:hidden items-center gap-1.5 shrink-0">
            <button 
              onClick={toggleLanguage} 
              className="px-2 py-1 bg-black/40 border border-gold-500/30 rounded-lg text-gold-500 font-bold hover:bg-gold-500/10 transition text-[9px] cursor-pointer"
            >
              {language === 'en' ? 'EN' : 'አማ'}
            </button>
            <button 
              onClick={onLogout}
              className="bg-red-950/50 hover:bg-red-900/60 text-red-400 border border-red-500/30 px-2 py-1 rounded-lg font-bold transition text-[9px] cursor-pointer"
            >
              {language === 'en' ? 'OUT' : 'ውጣ'}
            </button>
          </div>
        </div>

        {/* Live Clock / Meta details bar - Highly responsive wrapping */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 w-full md:w-auto font-mono text-[10px]">
          {githubMessage && (
            <div className="text-gold-400 bg-gold-950/40 border border-gold-500/20 px-2.5 py-1 rounded-lg text-[9px] animate-pulse truncate max-w-[120px] xs:max-w-[180px] sm:max-w-xs">
              {githubMessage}
            </div>
          )}

          <div className="bg-slate-800/80 border border-white/10 px-2.5 py-1.5 rounded-xl text-gold-400 font-bold shrink-0 flex items-center gap-1.5 max-w-full">
            <Clock size={12} className="text-gold-500 shrink-0" />
            <span className="text-white hidden sm:inline">{formatEthiopianDate(getCurrentEthiopianDate(), language)}</span>
            <span className="text-white sm:hidden text-[9px]">{getCurrentEthiopianDate()}</span>
            <span className="text-slate-500">|</span>
            <span className="text-gold-400 font-bold shrink-0 text-[9px] sm:text-[10px]">{currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}</span>
          </div>

          <button 
            onClick={handleManualGitHubSync}
            disabled={githubSyncing}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-white/10 hover:border-gold-500/50 transition cursor-pointer disabled:opacity-50 font-bold text-[9px] shrink-0"
          >
            <RefreshCw size={10} className={githubSyncing ? "animate-spin" : ""} />
            {language === 'en' ? "SYNC" : "አመሳስል"}
          </button>

          {/* Desktop Only Actions */}
          <div className="hidden lg:flex items-center gap-2">
            <button 
              onClick={toggleLanguage} 
              className="flex items-center gap-1 px-2.5 py-1.5 bg-black/40 border border-gold-500/30 rounded-xl text-gold-500 font-bold hover:bg-gold-500/10 transition cursor-pointer text-[10px] shrink-0"
            >
              <Globe size={12} />
              {language === 'en' ? 'ENGLISH' : 'አማርኛ'}
            </button>

            <button 
              onClick={onLogout}
              className="bg-red-950/50 hover:bg-red-900/60 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl font-bold cursor-pointer transition text-[10px] shrink-0"
            >
              {at('terminateSession')}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Slide-over Menu overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer Menu Container */}
          <aside className="relative w-76 bg-slate-900 border-r border-white/10 p-5 flex flex-col gap-6 h-full overflow-y-auto animate-in slide-in-from-left duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center border border-gold-500/30">
                  <img src={etafLogo} alt="Ethiopian Air Force Logo" className="w-full h-full object-cover scale-108" />
                </div>
                <span className="text-xs font-black tracking-widest text-white uppercase">{at('adminCommand')}</span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Read Only Status indicator */}
            <div className="bg-gold-950/20 border border-gold-500/15 p-3 rounded-xl text-[10px] text-gold-400 flex gap-2">
              <ShieldAlert size={16} className="shrink-0 text-gold-400 mt-0.5 animate-pulse" />
              <span className="leading-tight font-medium">{at('readOnlyWarning')}</span>
            </div>

            {/* Sidebar grouped menu options */}
            <div className="space-y-5">
              {[
                {
                  title: language === 'en' ? "Observability & Intel" : "የክትትል እና የ AI ትንታኔ",
                  items: [
                    { id: 'overview', label: at('overviewMatrix'), icon: <Layers size={16} />, desc: language === 'en' ? "Command Matrix overview" : "አጠቃላይ ማጠቃለያ" },
                    { id: 'ai', label: at('aiIntelligence'), icon: <Cpu size={16} />, desc: language === 'en' ? "Executive AI analyst" : "የላቀ AI ረዳት" },
                  ]
                },
                {
                  title: language === 'en' ? "Logistics Sectors" : "የሎጅስቲክስ ዘርፎች",
                  items: [
                    { id: 'manpower', label: at('manpowerSector'), icon: <Users size={16} />, desc: language === 'en' ? "Personnel rosters" : "የሰው ኃይል ምደባ" },
                    { id: 'store', label: at('storeRations'), icon: <Archive size={16} />, desc: language === 'en' ? "Inventory & stocks" : "መጋዘን እና ስንቅ" },
                    { id: 'market', label: at('marketSector'), icon: <ShoppingCart size={16} />, desc: language === 'en' ? "Market pricing" : "የገበያ ዋጋ ኦዲት" },
                    { id: 'finance', label: at('financeSector'), icon: <DollarSign size={16} />, desc: language === 'en' ? "Unified command ledger" : "የገቢና ወጪ ቁጥጥር" },
                  ]
                },
                {
                  title: language === 'en' ? "Administration & Settings" : "አስተዳደር እና ማዋቀሪያ",
                  items: [
                    { id: 'security', label: at('securityAudit'), icon: <Lock size={16} />, desc: language === 'en' ? "Credentials & GitHub" : "ደህንነት እና ክላውድ" },
                    { id: 'about', label: language === 'en' ? "About Developer" : "ስለ አበልጻጊው", icon: <User size={16} />, desc: language === 'en' ? "System Architect" : "ስለ ሲስተም አበልጻጊው" },
                  ]
                }
              ].map((group, groupIdx) => (
                <div key={groupIdx} className="space-y-1.5">
                  <h3 className="px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">
                    {group.title}
                  </h3>
                  <div className="space-y-0.5">
                    {group.items.map(tab => {
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id as any);
                            setSearchTerm('');
                            setStartDate('');
                            setEndDate('');
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition duration-200 border ${
                            isActive 
                              ? 'bg-gradient-to-r from-gold-500/15 to-gold-500/5 border-gold-500/30 text-gold-400 font-bold' 
                              : 'bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <div className={`mt-0.5 ${isActive ? 'text-gold-400' : 'text-gray-500'}`}>
                            {tab.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold leading-none">{tab.label}</div>
                            <div className="text-[9px] text-gray-500 mt-1 font-mono truncate uppercase font-bold">{tab.desc}</div>
                          </div>
                          {isActive && <ChevronRight size={14} className="text-gold-400 shrink-0 self-center" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Version block */}
            <div className="mt-auto border-t border-white/5 pt-4 space-y-2.5">
              <button
                onClick={handleManualPushBackup}
                disabled={githubSyncing}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-white/15 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Cloud size={13} className="text-sky-400" />
                {language === 'en' ? "Backup to Cloud" : "ዳታቤዝ ክላውድ ላይ አስቀምጥ"}
              </button>
              <div className="text-[9px] text-gray-500 text-center font-mono uppercase">
                ARMS Auditing Core v4.9
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Grid: Responsive Sidebar + Central Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row relative z-10 overflow-hidden">
        
        {/* Left Navigation Sidebar (Visible only on Desktop screens) */}
        <aside className="hidden lg:flex w-64 bg-slate-900/55 border-r border-white/5 p-4 flex-col gap-5 shrink-0 print:hidden overflow-y-auto">
          
          {/* Read Only Status indicator */}
          <div className="bg-gold-950/20 border border-gold-500/15 p-3 rounded-xl text-[10px] text-gold-400 flex gap-2">
            <ShieldAlert size={16} className="shrink-0 text-gold-400 mt-0.5 animate-pulse" />
            <span className="leading-tight font-medium">{at('readOnlyWarning')}</span>
          </div>

          {/* Grouped Sidebar list */}
          <div className="space-y-5">
            {[
              {
                title: language === 'en' ? "Observability & Intel" : "የክትትል እና የ AI ትንታኔ",
                items: [
                  { id: 'overview', label: at('overviewMatrix'), icon: <Layers size={16} />, desc: language === 'en' ? "Command Matrix overview" : "አጠቃላይ ማጠቃለያ" },
                  { id: 'ai', label: at('aiIntelligence'), icon: <Cpu size={16} />, desc: language === 'en' ? "Executive AI analyst" : "የላቀ AI ረዳት" },
                ]
              },
              {
                title: language === 'en' ? "Logistics Sectors" : "የሎጅስቲክስ ዘርፎች",
                items: [
                  { id: 'manpower', label: at('manpowerSector'), icon: <Users size={16} />, desc: language === 'en' ? "Personnel rosters" : "የሰው ኃይል ምደባ" },
                  { id: 'store', label: at('storeRations'), icon: <Archive size={16} />, desc: language === 'en' ? "Inventory & stocks" : "መጋዘን እና ስንቅ" },
                  { id: 'market', label: at('marketSector'), icon: <ShoppingCart size={16} />, desc: language === 'en' ? "Market pricing" : "የገበያ ዋጋ ኦዲት" },
                  { id: 'finance', label: at('financeSector'), icon: <DollarSign size={16} />, desc: language === 'en' ? "Unified command ledger" : "የገቢና ወጪ ቁጥጥር" },
                ]
              },
              {
                title: language === 'en' ? "Administration & Settings" : "አስተዳደር እና ማዋቀሪያ",
                items: [
                  { id: 'security', label: at('securityAudit'), icon: <Lock size={16} />, desc: language === 'en' ? "Credentials & GitHub" : "ደህንነት እና ክላውድ" },
                  { id: 'about', label: language === 'en' ? "About Developer" : "ስለ አበልጻጊው", icon: <User size={16} />, desc: language === 'en' ? "System Architect" : "ስለ ሲስተም አበልጻጊው" },
                ]
              }
            ].map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1.5">
                <h3 className="px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">
                  {group.title}
                </h3>
                <div className="space-y-0.5">
                  {group.items.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id as any);
                          setSearchTerm('');
                          setStartDate('');
                          setEndDate('');
                        }}
                        className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition duration-200 border ${
                          isActive 
                            ? 'bg-gradient-to-r from-gold-500/15 to-gold-500/5 border-gold-500/30 text-gold-400 font-bold' 
                            : 'bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <div className={`mt-0.5 ${isActive ? 'text-gold-400' : 'text-gray-500'}`}>
                          {tab.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold leading-none">{tab.label}</div>
                          <div className="text-[9px] text-gray-500 mt-1 font-mono truncate uppercase font-bold">{tab.desc}</div>
                        </div>
                        {isActive && <ChevronRight size={14} className="text-gold-400 shrink-0 self-center" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Backup helper */}
          <div className="mt-auto border-t border-white/5 pt-4 space-y-2">
            <button
              onClick={handleManualPushBackup}
              disabled={githubSyncing}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-white/15 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Cloud size={12} className="text-sky-400" />
              {language === 'en' ? "Backup to Cloud" : "ዳታቤዝ ክላውድ ላይ አስቀምጥ"}
            </button>
            <div className="text-[9px] text-gray-500 text-center font-mono uppercase">
              ARMS Auditing Core v4.9
            </div>
          </div>
        </aside>

        {/* Central Workspace */}
        <main className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 print:p-0">
          
          {/* Section Dynamic Header */}
          <section className="bg-slate-900/60 p-4 rounded-xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:bg-transparent print:border-none">
            <div>
              <div className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">{at('observeOnly')} MODE</div>
              <h2 className="text-xl font-black text-white tracking-wide uppercase mt-0.5">
                {activeTab === 'overview' && at('overviewMatrix')}
                {activeTab === 'manpower' && at('manpowerSector')}
                {activeTab === 'market' && at('marketSector')}
                {activeTab === 'finance' && at('financeSector')}
                {activeTab === 'store' && at('storeRations')}
                {activeTab === 'security' && at('securityAudit')}
                {activeTab === 'ai' && at('aiIntelligence')}
              </h2>
            </div>

            <div className="flex gap-2 print:hidden">
              <button 
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-white/10 rounded text-xs font-bold transition cursor-pointer"
              >
                <Printer size={14} />
                {at('printReport')}
              </button>
            </div>
          </section>

          {/* 1. OVERVIEW MATRIX SUB-PAGE */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* GitHub Multi-User Cloud Live Auditing Panel */}
              {ghConfig.enabled && (
                <div className="bg-slate-900/80 p-5 rounded-2xl border-2 border-gold-500/20 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Cloud size={80} className="text-gold-500" />
                  </div>
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4 mb-4">
                    <div>
                      <h3 className="text-sm font-black text-gold-400 tracking-wider uppercase flex items-center gap-2">
                        <Database size={16} className="text-gold-500" />
                        {language === 'en' ? "GitHub Live Multi-User Auditing Console" : "የ GitHub የቀጥታ ተጠቃሚዎች የኦዲት መቆጣጠሪያ"}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5 uppercase">
                        {language === 'en' ? `Target Folder: ${getFolderName(year, month)}` : `ዒላማ ፎልደር: ${getFolderName(year, month)}`}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={scanBackups}
                        disabled={isLoadingBackups}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded border border-white/10 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw size={12} className={isLoadingBackups ? "animate-spin" : ""} />
                        {language === 'en' ? "Scan Live Users" : "ቀጥታ ተጠቃሚዎችን ፈልግ"}
                      </button>

                      {detectedBackups.length > 0 && (
                        <button 
                          onClick={handleMergeAllBackups}
                          disabled={isMerging}
                          className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Layers size={12} />
                          {isMerging ? (language === 'en' ? "Merging..." : "በማጠቃለል ላይ...") : (language === 'en' ? "Aggregate All Users" : "የሁሉንም ተጠቃሚዎች መረጃ አጠቃልል")}
                        </button>
                      )}
                    </div>
                  </div>

                  {loadedBackupPath && (
                    <div className="mb-4 bg-gold-500/10 border border-gold-500/30 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-pulse">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-gold-400 animate-ping"></div>
                        <div>
                          <span className="text-[11px] font-black text-gold-400 uppercase tracking-widest block">
                            {loadedBackupPath === 'merged' 
                              ? (language === 'en' ? "AGGREGATED MULTI-USER COHORT METRICS" : "የሁሉም ተጠቃሚዎች ጥምር መረጃ እያዩ ነው")
                              : (language === 'en' ? `INSPECTING ACTIVE CLOUD BACKUP: ${loadedBackupPath.split('/').pop()}` : `የቀጥታ ተጠቃሚ መዝገብ በመመርመር ላይ፡ ${loadedBackupPath.split('/').pop()}`)
                            }
                          </span>
                          <span className="text-[9px] text-gray-400 uppercase font-mono">
                            {language === 'en' ? "Overview statistics are loaded directly from remote backup repository" : "ጠቅላላ ስታቲስቲክስ በቀጥታ ከ GitHub መረጃ ማከማቻ የተጫነ ነው"}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={handleResetToLocal}
                        className="px-3 py-1 bg-red-950/50 hover:bg-red-900/60 text-red-400 border border-red-500/30 rounded text-[10px] font-bold transition cursor-pointer"
                      >
                        {language === 'en' ? "View Local Replica" : "ወደ አካባቢያዊ መረጃ ተመለስ"}
                      </button>
                    </div>
                  )}

                  {backupScanError && (
                    <div className="p-3 bg-red-950/20 border border-red-500/20 rounded text-red-400 text-[10px] font-mono mb-4">
                      ⚠️ {backupScanError}
                    </div>
                  )}

                  {allFilesError && (
                    <div className="p-3 bg-red-950/20 border border-red-500/20 rounded text-red-400 text-[10px] font-mono mb-4">
                      ⚠️ {allFilesError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 pt-2">
                    {/* Active Monthly Backups */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-gray-300 uppercase tracking-widest flex items-center gap-2">
                        <Users size={14} className="text-emerald-400" />
                        {language === 'en' ? "Active Monthly Backups" : "የወሩ ንቁ ተጠቃሚዎች"}
                      </h4>
                      {isLoadingBackups ? (
                        <div className="py-6 flex flex-col items-center justify-center text-gray-500 text-[11px] font-mono animate-pulse uppercase">
                          <RefreshCw size={14} className="animate-spin text-gold-500 mb-1" />
                          {language === 'en' ? "Scanning..." : "በመፈለግ ላይ..."}
                        </div>
                      ) : detectedBackups.length === 0 ? (
                        <div className="p-3 bg-black/15 text-center text-gray-500 text-[10px] font-mono uppercase rounded-lg border border-white/5">
                          {language === 'en' ? "No backups in this month folder." : "በዚህ ወር ማህደር ውስጥ የተቀመጡ ባካፖች የሉም።"}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                          {detectedBackups.map((backup) => {
                            const isLoaded = loadedBackupPath === backup.path || (ghConfig.path === backup.path && !loadedBackupPath);
                            return (
                              <button
                                key={backup.path}
                                onClick={() => handleLoadBackup(backup.path, backup.filename)}
                                className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between gap-1 cursor-pointer ${
                                  isLoaded
                                    ? 'bg-gold-500/10 border-gold-500/50 text-gold-400'
                                    : 'bg-black/25 border-white/5 hover:border-white/10 text-gray-300'
                                }`}
                              >
                                <span className="text-[11px] font-bold block truncate w-full uppercase">{backup.filename}</span>
                                <div className="flex justify-between items-center w-full text-[9px] text-gray-500 font-mono mt-0.5">
                                  <span>{(backup.size / 1024).toFixed(1)} KB</span>
                                  {isLoaded && <span className="text-gold-500 font-bold uppercase text-[8px] tracking-widest">ACTIVE</span>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* All Repository History Archives */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-gray-300 uppercase tracking-widest flex items-center gap-2">
                        <Database size={14} className="text-gold-400" />
                        {language === 'en' ? "All History Archive Files" : "የሁሉም ጊዜ የዳታቤዝ ፋይሎች"}
                      </h4>
                      {isLoadingAllFiles ? (
                        <div className="py-6 flex flex-col items-center justify-center text-gray-500 text-[11px] font-mono animate-pulse uppercase">
                          <RefreshCw size={14} className="animate-spin text-gold-500 mb-1" />
                          {language === 'en' ? "Loading Repo Index..." : "ሁሉንም ፋይሎች በመፈለግ ላይ..."}
                        </div>
                      ) : allRepoFiles.length === 0 ? (
                        <div className="p-3 bg-black/15 text-center text-gray-500 text-[10px] font-mono uppercase rounded-lg border border-white/5">
                          {language === 'en' ? "No other database files detected." : "ምንም ሌሎች የዳታቤዝ ፋይሎች አልተገኙም።"}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="relative">
                            <select
                              value={loadedBackupPath || ghConfig.path || ''}
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleLoadFilePathNoCredentials(e.target.value);
                                }
                              }}
                              className="w-full bg-slate-950 border border-white/10 hover:border-gold-500/50 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-gold-500 appearance-none pr-8 cursor-pointer font-mono"
                            >
                              <option value="">-- {language === 'en' ? "Select historical file path..." : "የቀድሞ ፋይል መንገድ ይምረጡ..."} --</option>
                              {allRepoFiles.map((file) => {
                                const isCurrent = file.path === ghConfig.path;
                                return (
                                  <option key={file.path} value={file.path} className="font-mono bg-slate-900 text-white">
                                    {file.path} {isCurrent ? `(${language === 'en' ? 'ACTIVE' : 'በአሁኑ ሰዓት ያለ'})` : ''}
                                  </option>
                                );
                              })}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gold-500">
                              <ChevronRight size={14} className="rotate-90" />
                            </div>
                          </div>
                          
                          <div className="max-h-24 overflow-y-auto custom-scrollbar space-y-1 pr-1 bg-black/15 p-2 rounded-xl border border-white/5">
                            {allRepoFiles.slice(0, 15).map((file) => {
                              const isLoaded = loadedBackupPath === file.path || (ghConfig.path === file.path && !loadedBackupPath);
                              return (
                                <button
                                  key={file.path}
                                  onClick={() => handleLoadFilePathNoCredentials(file.path)}
                                  className={`w-full text-left px-2.5 py-1.5 rounded text-[10px] font-mono transition flex justify-between items-center cursor-pointer ${
                                    isLoaded 
                                      ? 'bg-gold-500/10 text-gold-400 font-bold border border-gold-500/20' 
                                      : 'hover:bg-white/5 text-gray-400'
                                  }`}
                                >
                                  <span className="truncate flex-1 pr-2 text-left">{file.path}</span>
                                  <span className="text-[8px] opacity-60 uppercase font-sans shrink-0 font-bold bg-slate-800 px-1 rounded text-white">
                                    {file.folder}
                                  </span>
                                </button>
                              );
                            })}
                            {allRepoFiles.length > 15 && (
                              <p className="text-[9px] text-center text-slate-500 font-mono italic">
                                + {allRepoFiles.length - 15} {language === 'en' ? "more files available in list" : "ተጨማሪ ፋይሎች በዝርዝሩ ውስጥ አሉ"}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gold-400"></div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{at('totalActivePersonnel')}</div>
                  <div className="text-2xl font-black text-white mt-1 font-mono">
                    {totalActivePersonnel} <span className="text-xs text-gold-400 font-bold">{language === 'en' ? 'Officers' : 'አባላት'}</span>
                  </div>
                  <div className="text-[9px] text-gray-500 font-mono mt-1">
                    {language === 'en' ? "Ready commandos in mess logistics lists" : "በሬሽን ስም ዝርዝር ውስጥ የተመዘገቡ ንቁ አባላት"}
                  </div>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{at('totalMonthlyExpenses')}</div>
                  <div className="text-2xl font-black text-white mt-1 font-mono">
                    {totalExpensesAmount.toLocaleString()} <span className="text-xs text-red-400 font-bold">Birr</span>
                  </div>
                  <div className="text-[9px] text-gray-500 font-mono mt-1">
                    {language === 'en' ? `Procurements & Wages cumulative` : `ጠቅላላ የተከፈሉ ደሞዞች እና የግዢ ወጪዎች`}
                  </div>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{at('totalAvailableStock')}</div>
                  <div className="text-2xl font-black text-white mt-1 font-mono">
                    {totalStockRemaining.toLocaleString()} <span className="text-xs text-emerald-400 font-bold">Units</span>
                  </div>
                  <div className="text-[9px] text-gray-500 font-mono mt-1">
                    {language === 'en' ? `Ingredients volume across inventory` : `በግምጃ ቤት ያሉ ሁሉም የስንቅ ዓይነቶች መጠን`}
                  </div>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-sky-500"></div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{at('alertStatus')}</div>
                  <div className="text-2xl font-black text-sky-400 mt-1 font-mono flex items-center gap-2">
                    {lowStockCount}
                    {lowStockCount > 0 && <AlertTriangle size={18} className="text-gold-400 animate-bounce" />}
                  </div>
                  <div className="text-[9px] text-gray-500 font-mono mt-1">
                    {language === 'en' ? "Stock ingredients below safe margin" : "ደህንነቱ ከተጠበቀው መጠን በታች የሆኑ ስንቆች ብዛት"}
                  </div>
                </div>
              </div>

              {/* Graphic SVG Visualizations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Financial bar charts */}
                <div className="bg-slate-900/40 p-5 rounded-xl border border-white/5">
                  <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-4">
                    {language === 'en' ? "Cash Flow Audit Matrix (SVG)" : "የፋይናንስ ፍሰት ማጠቃለያ ቻርት"}
                  </h3>
                  
                  <div className="relative h-48 bg-black/20 rounded-lg p-3 flex items-end justify-around border border-white/5">
                    {/* Gridlines */}
                    <div className="absolute inset-x-0 top-1/4 border-t border-white/5"></div>
                    <div className="absolute inset-x-0 top-2/4 border-t border-white/5"></div>
                    <div className="absolute inset-x-0 top-3/4 border-t border-white/5"></div>

                    {/* Subsidies */}
                    <div className="flex flex-col items-center gap-1.5 w-1/4 z-10">
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        {totalSubsidiesAmount.toLocaleString()} B
                      </span>
                      <div className="w-10 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t shadow-[0_0_15px_rgba(16,185,129,0.1)] h-24"></div>
                      <span className="text-[9px] text-gray-400 font-bold uppercase">{language === 'en' ? "Subsidies" : "ድጋፎች"}</span>
                    </div>

                    {/* Expenses */}
                    <div className="flex flex-col items-center gap-1.5 w-1/4 z-10">
                      <span className="text-[10px] font-mono text-red-400 font-bold">
                        {totalExpensesAmount.toLocaleString()} B
                      </span>
                      <div className="w-10 bg-gradient-to-t from-red-600 to-red-400 rounded-t shadow-[0_0_15px_rgba(239,68,68,0.1)] h-20"></div>
                      <span className="text-[9px] text-gray-400 font-bold uppercase">{language === 'en' ? "Expenses" : "ወጪዎች"}</span>
                    </div>

                    {/* Reserves */}
                    <div className="flex flex-col items-center gap-1.5 w-1/4 z-10">
                      <span className="text-[10px] font-mono text-gold-400 font-bold">
                        {totalNetLiquidity.toLocaleString()} B
                      </span>
                      <div className="w-10 bg-gradient-to-t from-gold-600 to-gold-400 rounded-t shadow-[0_0_15px_rgba(212,175,55,0.1)] h-16"></div>
                      <span className="text-[9px] text-gray-400 font-bold uppercase">{language === 'en' ? "Reserve" : "ቀሪ በጀት"}</span>
                    </div>
                  </div>
                </div>

                {/* Manpower command pie */}
                <div className="bg-slate-900/40 p-5 rounded-xl border border-white/5">
                  <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-4">
                    {language === 'en' ? "Command Allocation Index" : "የክፍለ ጦር የሰው ኃይል ስርጭት"}
                  </h3>
                  <div className="relative h-48 bg-black/20 rounded-lg p-3 flex items-center justify-around border border-white/5 font-mono text-xs">
                    <div className="space-y-2 text-[11px] text-gray-300">
                      {['Air Force', 'Ground Force', 'Navy', 'Special Force'].map(cmd => {
                        const count = manpowerList.filter(m => m.command === cmd).length;
                        const percentage = manpowerList.length > 0 ? Math.round((count / manpowerList.length) * 100) : 0;
                        return (
                          <div key={cmd} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-gold-400"></span>
                            <span className="font-bold w-24 text-left">{cmd}:</span>
                            <span className="text-white font-bold">{count} ({percentage}%)</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* SVG Graphic Circle */}
                    <svg className="w-32 h-32" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#1e293b" strokeWidth="4" />
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#d4af37" strokeWidth="4.5" strokeDasharray="60 40" strokeDashoffset="25" />
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#38bdf8" strokeWidth="4.5" strokeDasharray="25 75" strokeDashoffset="85" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Dynamic Recent Events ticker */}
              <div className="bg-slate-900/30 p-5 rounded-xl border border-white/5">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
                  {language === 'en' ? "Recent Logged System Operations" : "የቅርብ ጊዜ የሬሽን እና የገንዘብ እንቅስቃሴዎች"}
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {rationHistoryList.slice(0, 4).map(log => (
                    <div key={log.id} className="bg-black/20 p-3 rounded border border-white/5 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <Archive size={14} className="text-gold-500" />
                        <div>
                          <span className="font-bold text-white">{language === 'en' ? 'Ration Deducted' : 'ሬሽን ተቀንሷል'}: {log.day}</span>
                          <span className="text-gray-500 block text-[10px]">
                            {language === 'en' ? `Fed ${log.totalManpower} manpower` : `ለ ${log.totalManpower} አባላት ስንቅ ተቆርጧል`}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono text-gold-400 font-bold">{log.totalCost.toLocaleString()} Birr</span>
                    </div>
                  ))}
                  {expensesList.slice(0, 3).map(exp => (
                    <div key={exp.id} className="bg-black/20 p-3 rounded border border-white/5 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <DollarSign size={14} className="text-emerald-500" />
                        <div>
                          <span className="font-bold text-white">{exp.category === 'Market' ? exp.itemName : (exp.workerName || exp.reason)}</span>
                          <span className="text-gray-500 block text-[10px]">{exp.category} Expense</span>
                        </div>
                      </div>
                      <span className="font-mono text-red-400 font-bold">{(Number(exp.amount) * (Number(exp.singlePrice) || 1)).toLocaleString()} Birr</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Developer Profile: About Me */}
              <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Award size={100} className="text-gold-500" />
                </div>
                
                <h3 className="text-xs font-black text-gold-400 uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <Award size={14} />
                  {language === 'en' ? "About the Developer" : "ስለ ሲስተም አበልጻጊው"}
                </h3>
                
                <div className="flex flex-col md:flex-row gap-5 items-center md:items-start">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-gold-600 to-gold-400 p-0.5 shrink-0 shadow-lg shadow-gold-500/10 flex items-center justify-center">
                    <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-gold-400">
                      <User size={32} />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0 text-center md:text-left space-y-2">
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">Andualem Koriya</h4>
                    <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                      {language === 'en' ? "Software Architect & Logistics Operations Expert" : "የሶፍትዌር መሃንዲስ እና የሎጅስቲክስ ሲስተም ኤክስፐርት"}
                    </p>
                    <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
                      {language === 'en' 
                        ? "Specialized in secure, high-integrity logistics command databases, automated financial audit registries, and military-grade cloud synchronization architectures. This terminal has been engineered to provide total transparency and cryptographic observability over logistics records."
                        : "በከፍተኛ ደህንነት የሚሰሩ የሎጅስቲክስ ኮማንድ ዳታቤዞችን፣ አውቶሜትድ የበጀት እና የፋይናንስ ኦዲት መቆጣጠሪያዎችን እና ወታደራዊ ደረጃ ያላቸው የክላውድ ሲንክ መዋቅሮችን በማበልጸግ ላይ የተካነ። ይህ ተርሚናል በሎጅስቲክስ እንቅስቃሴዎች ላይ ሙሉ ግልጽነት እና የቁጥጥር እይታ ለመስጠት ተዘጋጅቷል።"}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-2 font-mono text-[9px] uppercase">
                      <span className="bg-slate-950 px-2 py-1 rounded-md border border-white/5 text-gray-500">SYSTEM ARCHITECT</span>
                      <span className="bg-slate-950 px-2 py-1 rounded-md border border-white/5 text-gray-500">ARMS CORE LEAD</span>
                      <span className="bg-slate-950 px-2 py-1 rounded-md border border-white/5 text-gray-500">ETHIOPIAN AIR FORCE DEPLOYED</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* 2. MANPOWER SECTOR SUB-PAGE */}
          {activeTab === 'manpower' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Controls and date filter */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest">{at('manpowerTitle')}</h3>
                  <div className="bg-gold-500/10 border border-gold-500/20 px-2 py-0.5 rounded text-[10px] text-gold-400 font-mono">
                    {filteredManpower.length} / {manpowerList.length} {language === 'en' ? "Personnel Match" : "አባላት ተገኝተዋል"}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                    <input 
                      type="text" 
                      placeholder={at('searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 pl-8 text-xs text-white focus:border-gold-500 focus:outline-none"
                    />
                  </div>

                  {/* Command Dropdown */}
                  <select
                    value={manpowerCommandFilter}
                    onChange={(e) => setManpowerCommandFilter(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-gold-500"
                  >
                    <option value="all">{language === 'en' ? "All Commands" : "ሁሉም ክፍለ ጦር"}</option>
                    <option value="Air Force">Air Force</option>
                    <option value="Ground Force">Ground Force</option>
                    <option value="Navy">Navy</option>
                    <option value="Special Force">Special Force</option>
                  </select>

                  {/* Manpower Type Dropdown */}
                  <select
                    value={manpowerTypeFilter}
                    onChange={(e) => setManpowerTypeFilter(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-gold-500"
                  >
                    <option value="all">{language === 'en' ? "All Ration Types" : "ሁሉም የሬሽን ዓይነቶች"}</option>
                    <option value="Payroll">Payroll</option>
                    <option value="Full Cash">Full Cash</option>
                    <option value="Half Cash">Half Cash</option>
                    <option value="Transient">Transient</option>
                    <option value="Pension">Pension</option>
                  </select>

                  {/* Date Filters block */}
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Start (YYYY-MM-DD)"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-1/2 bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 text-[11px] text-white focus:outline-none"
                    />
                    <input 
                      type="text" 
                      placeholder="End (YYYY-MM-DD)"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-1/2 bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 text-[11px] text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Detailed observe list */}
              <div className="bg-slate-900/30 rounded-xl border border-white/5 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-slate-900/50 text-gray-400 font-mono text-[10px]">
                      <th className="p-3">{at('name')}</th>
                      <th className="p-3">{at('rank')}</th>
                      <th className="p-3">{at('command')}</th>
                      <th className="p-3">{at('rationType')}</th>
                      <th className="p-3">{language === 'en' ? "Service Start" : "አገልግሎት የጀመረበት"}</th>
                      <th className="p-3">{language === 'en' ? "Service End" : "አገልግሎት ያበቃበት"}</th>
                      <th className="p-3">{at('action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredManpower.map(person => (
                      <tr key={person.id} className="hover:bg-white/5 transition">
                        <td className="p-3 font-semibold text-white">
                          {person.firstName} {person.lastName}
                        </td>
                        <td className="p-3 font-mono text-gray-300">
                          {person.rank}
                        </td>
                        <td className="p-3">
                          <span className="bg-slate-800 text-gold-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono">
                            {person.command}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-sky-400">
                          {person.type}
                        </td>
                        <td className="p-3 font-mono text-gray-400">
                          {person.startDate}
                        </td>
                        <td className="p-3 font-mono text-gray-500">
                          {person.endDate || "-"}
                        </td>
                        <td className="p-3 text-gray-400 max-w-xs truncate">
                          {person.description || "-"}
                        </td>
                      </tr>
                    ))}
                    {filteredManpower.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-gray-500">
                          {language === 'en' ? "No personnel records found matching filters." : "ምንም የሰው ኃይል መረጃ በዚህ ቀን ገደብ አልተገኘም።"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* 3. MARKET SECTOR SUB-PAGE */}
          {activeTab === 'market' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Sub header controls */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest">{at('marketTitle')}</h3>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded text-[10px] text-emerald-400 font-mono font-bold">
                    {language === 'en' ? "Observing Market Prices" : "የገበያ ዋጋ ተለዋዋጭነት መቆጣጠሪያ"}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Search Bar */}
                  <div className="relative col-span-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                    <input 
                      type="text" 
                      placeholder={at('searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 pl-8 text-xs text-white focus:border-gold-500 focus:outline-none"
                    />
                  </div>

                  {/* Date Filters */}
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Start (YYYY-MM-DD)"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-1/2 bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    />
                    <input 
                      type="text" 
                      placeholder="End (YYYY-MM-DD)"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-1/2 bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Price variance graphic table */}
              <div className="bg-slate-900/30 rounded-xl border border-white/5 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-slate-900/50 text-gray-400 font-mono text-[10px]">
                      <th className="p-3">{at('date')}</th>
                      <th className="p-3">{language === 'en' ? "Item Procured" : "የተገዛው እቃ"}</th>
                      <th className="p-3">{at('amount')}</th>
                      <th className="p-3">{at('price')}</th>
                      <th className="p-3">{at('total')}</th>
                      <th className="p-3">{at('marketRef')}</th>
                      <th className="p-3">{at('variance')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredMarket.map(item => {
                      const cost = Number(item.amount) * (Number(item.singlePrice) || 0);
                      const refPrice = getMarketReferenceRate(item.itemName || '');
                      const actualPrice = Number(item.singlePrice) || 0;
                      const variancePercentage = refPrice > 0 ? Math.round(((actualPrice - refPrice) / refPrice) * 100) : 0;
                      const isOverBudget = variancePercentage > 0;

                      return (
                        <tr key={item.id} className="hover:bg-white/5 transition">
                          <td className="p-3 font-mono text-gray-400">{item.date}</td>
                          <td className="p-3 font-bold text-white">{item.itemName}</td>
                          <td className="p-3 font-mono text-gray-300">{item.amount} {item.measurement || 'Units'}</td>
                          <td className="p-3 font-mono text-white">{actualPrice.toLocaleString()} Birr</td>
                          <td className="p-3 font-mono font-bold text-gray-100">{cost.toLocaleString()} Birr</td>
                          <td className="p-3 font-mono text-gray-400">{refPrice} Birr</td>
                          <td className="p-3 font-mono">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isOverBudget 
                                ? 'bg-red-500/10 text-red-400' 
                                : 'bg-emerald-500/10 text-emerald-400'
                            }`}>
                              {variancePercentage === 0 ? "On Match" : `${variancePercentage > 0 ? '+' : ''}${variancePercentage}%`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredMarket.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-gray-500">
                          {language === 'en' ? "No procurement logs match search filters." : "ምንም የግዢ መረጃዎች በዚህ ገደብ አልተገኙም።"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* 4. FINANCE SECTOR SUB-PAGE */}
          {activeTab === 'finance' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Balances recap row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-xl">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">{at('cashIn')}</div>
                  <div className="text-xl font-black text-white mt-1.5 font-mono">
                    +{(totalSubsidiesAmount + totalIncomeItemsAmount).toLocaleString()} <span className="text-xs text-emerald-400">Birr</span>
                  </div>
                </div>

                <div className="bg-red-950/20 border border-red-500/20 p-4 rounded-xl">
                  <div className="text-[10px] text-red-400 font-bold uppercase tracking-wider">{at('cashOut')}</div>
                  <div className="text-xl font-black text-white mt-1.5 font-mono">
                    -{(totalExpensesAmount + totalRefundsAmount).toLocaleString()} <span className="text-xs text-red-400">Birr</span>
                  </div>
                </div>

                <div className="bg-gold-950/20 border border-gold-500/20 p-4 rounded-xl">
                  <div className="text-[10px] text-gold-400 font-bold uppercase tracking-wider">{at('netRes')}</div>
                  <div className="text-xl font-black text-gold-400 mt-1.5 font-mono">
                    {totalNetLiquidity.toLocaleString()} <span className="text-xs">Birr</span>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest">{at('financeTitle')}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 uppercase font-mono">Total Traced Amount:</span>
                    <span className="font-mono text-xs text-white font-bold">{filteredFinance.reduce((sum, tx) => sum + tx.amount, 0).toLocaleString()} Birr</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                    <input 
                      type="text" 
                      placeholder={at('searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 pl-8 text-xs text-white focus:border-gold-500 focus:outline-none"
                    />
                  </div>

                  {/* Finance Type Filter */}
                  <select
                    value={financeTypeFilter}
                    onChange={(e) => setFinanceTypeFilter(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-gold-500"
                  >
                    <option value="all">{language === 'en' ? "All Transactions" : "ყველა ታሪክ"}</option>
                    <option value="subsidy">{language === 'en' ? "Subsidies" : "የበጀት ድጋፍ"}</option>
                    <option value="expense">{language === 'en' ? "Expenses" : "ወጪዎች"}</option>
                    <option value="refund">{language === 'en' ? "Refunds" : "ተመላሾች"}</option>
                    <option value="income">{language === 'en' ? "Sector Incomes" : "የክፍል ገቢዎች"}</option>
                  </select>

                  {/* Date Filters */}
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Start (YYYY-MM-DD)"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-1/2 bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    />
                    <input 
                      type="text" 
                      placeholder="End (YYYY-MM-DD)"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-1/2 bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Detailed Unified Ledger Table */}
              <div className="bg-slate-900/30 rounded-xl border border-white/5 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-slate-900/50 text-gray-400 font-mono text-[10px]">
                      <th className="p-3">{at('date')}</th>
                      <th className="p-3">{language === 'en' ? "Transaction Category" : "የሂሳብ መደብ"}</th>
                      <th className="p-3">{at('action')}</th>
                      <th className="p-3 text-right">{at('amount')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredFinance.map(tx => (
                      <tr key={tx.id} className="hover:bg-white/5 transition">
                        <td className="p-3 font-mono text-gray-400">{tx.date}</td>
                        <td className="p-3">
                          <span className="bg-slate-800 text-gray-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono">
                            {tx.categoryLabel}
                          </span>
                        </td>
                        <td className="p-3 text-white max-w-sm truncate">{tx.description}</td>
                        <td className={`p-3 font-mono font-bold text-right text-sm ${
                          tx.flow === 'in' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {tx.flow === 'in' ? '+' : '-'}{tx.amount.toLocaleString()} Birr
                        </td>
                      </tr>
                    ))}
                    {filteredFinance.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-gray-500">
                          {language === 'en' ? "No financial transactions found in date range." : "በዚህ ቀን ገደብ ምንም የፋይናንስ እንቅስቃሴ አልተገኘም።"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* 5. STORE & RATIONS SUB-PAGE */}
          {activeTab === 'store' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Controls */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest">{at('storeTitle')}</h3>
                  <div className="flex gap-2">
                    <select
                      value={stockAlertFilter}
                      onChange={(e) => setStockAlertFilter(e.target.value)}
                      className="bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="all">All Stocks</option>
                      <option value="ok">Stock OK (&gt;=300)</option>
                      <option value="low">Stock LOW (100-300)</option>
                      <option value="critical">CRITICAL (&lt;100)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Search bar */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                    <input 
                      type="text" 
                      placeholder={at('searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 pl-8 text-xs text-white focus:outline-none"
                    />
                  </div>

                  {/* Start Date */}
                  <input 
                    type="text" 
                    placeholder="Start (YYYY-MM-DD)"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  />

                  {/* End Date */}
                  <input 
                    type="text" 
                    placeholder="End (YYYY-MM-DD)"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Grid split: Inventory Stocks vs Ration Deduction Logs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Inventory Stock Register */}
                <div className="bg-slate-900/30 rounded-xl border border-white/5 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-gold-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Archive size={14} />
                    {language === 'en' ? "Current Inventory Stocks" : "የአሁን ግምጃ ቤት ስቶክ"}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-400">
                          <th className="pb-2">{language === 'en' ? "Item Name" : "የእቃው ስም"}</th>
                          <th className="pb-2">{language === 'en' ? "Remaining Qty" : "የቀረው መጠን"}</th>
                          <th className="pb-2">{language === 'en' ? "Avg Price" : "አማካኝ ዋጋ"}</th>
                          <th className="pb-2">{language === 'en' ? "Status" : "ደረጃ"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredStoreItems.map(item => {
                          const stockQty = Number(item.amount);
                          let statusBadge = <span className="text-emerald-400">OK</span>;
                          if (stockQty < 100) statusBadge = <span className="text-red-400 font-bold animate-pulse">CRITICAL</span>;
                          else if (stockQty < 300) statusBadge = <span className="text-gold-400 font-semibold">LOW</span>;

                          return (
                            <tr key={item.id} className="hover:bg-white/5">
                              <td className="py-2 text-white font-bold">{item.name}</td>
                              <td className="py-2 font-mono text-gray-300">{stockQty} {item.measurement}</td>
                              <td className="py-2 font-mono text-gray-400">{item.singlePrice} Birr</td>
                              <td className="py-2">{statusBadge}</td>
                            </tr>
                          );
                        })}
                        {filteredStoreItems.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-gray-500">No stock found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Ration Deduction Logs */}
                <div className="bg-slate-900/30 rounded-xl border border-white/5 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                    <HardDrive size={14} />
                    {at('rationsTitle')}
                  </h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {filteredRationHistory.map(log => (
                      <div key={log.id} className="bg-black/35 p-3 rounded border border-white/5 flex justify-between items-start text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{log.day}</span>
                            <span className="text-[10px] font-mono text-gray-400">{log.dateExecuted}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 leading-normal">
                            Fed <strong className="text-white">{log.totalManpower}</strong> officers. Deductions:<br/>
                            <span className="text-gray-500 text-[9px]">
                              {log.itemsDeducted.map(i => `${i.itemName} (${i.amount} ${i.unit})`).join(', ')}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-gold-400 font-bold">{log.totalCost.toLocaleString()} Birr</span>
                      </div>
                    ))}
                    {filteredRationHistory.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No ration executions recorded in range.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* 6. SECURITY & CLOUD SYNC AUDIT SUB-PAGE */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* Column 1: GitHub Config & Remote Backups Selector */}
                <div className="space-y-6">
                  
                  {/* GitHub Cloud Integration Card */}
                  <div className="bg-slate-900/45 p-6 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden backdrop-blur">
                    <div className="absolute top-0 right-0 p-5 opacity-5 pointer-events-none z-0">
                      <Cloud size={90} className="text-gold-500" />
                    </div>

                    <div className="relative z-10 space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <div>
                          <h3 className="text-sm font-black text-gold-400 tracking-wider uppercase flex items-center gap-2">
                            <Cloud size={16} className="text-gold-500 animate-pulse" />
                            {language === 'en' ? "GitHub Cloud Replication Settings" : "የ GitHub ክላውድ ግንኙነት ቅንጅቶች"}
                          </h3>
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase">
                            {language === 'en' ? "Credentials autosave on keystroke • Safe connection" : "የግንኙነት መረጃዎች በየኪይስትሮኩ በራስ-ሰር ይቀመጣሉ"}
                          </p>
                        </div>

                        {/* Connection status badge */}
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${ghConfig.owner && ghConfig.repo && ghConfig.token ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-400">
                            {ghConfig.owner && ghConfig.repo && ghConfig.token ? 'CONNECTED' : 'CONFIG PENDING'}
                          </span>
                        </div>
                      </div>

                      <div className="bg-black/35 p-3.5 rounded-xl border border-white/5 font-mono text-[10px] space-y-1 text-slate-300">
                        <div className="flex justify-between"><span className="text-slate-500">OWNER:</span> <span className="font-bold text-slate-100">{ghConfig.owner || "-"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">REPOSITORY:</span> <span className="font-bold text-slate-100">{ghConfig.repo || "-"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">ACTIVE FILE:</span> <span className="font-bold text-gold-400">{ghConfig.path || "-"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">SYNC STATE:</span> <span className={ghConfig.enabled ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{ghConfig.enabled ? "ENABLED" : "DISABLED"}</span></div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Owner / Organization</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500/80 transition" 
                            value={ghConfig.owner} 
                            onChange={e => {
                              const val = e.target.value;
                              setGhConfig(prev => {
                                const next = { ...prev, owner: val };
                                saveGitHubConfig(next);
                                return next;
                              });
                            }} 
                            placeholder="e.g. username"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Repository Name</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500/80 transition" 
                            value={ghConfig.repo} 
                            onChange={e => {
                              const val = e.target.value;
                              setGhConfig(prev => {
                                const next = { ...prev, repo: val };
                                saveGitHubConfig(next);
                                return next;
                              });
                            }} 
                            placeholder="e.g. repo-name"
                            required
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Personal Access Token (PAT)</label>
                          <input 
                            type="password" 
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500/80 transition font-mono" 
                            value={ghConfig.token} 
                            onChange={e => {
                              const val = e.target.value;
                              setGhConfig(prev => {
                                const next = { ...prev, token: val };
                                saveGitHubConfig(next);
                                return next;
                              });
                            }} 
                            placeholder="ghp_..."
                            required
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Database File Path</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500/80 transition font-mono" 
                              value={pathInput} 
                              onChange={e => setPathInput(e.target.value)} 
                              placeholder="folder/filename.json"
                              required
                            />
                            {pathInput !== ghConfig.path && (
                              <button
                                type="button"
                                onClick={() => handleVerifyAndConnectPath(pathInput)}
                                className="px-4 bg-gold-600 hover:bg-gold-500 text-slate-950 rounded-xl font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer transition"
                                title="Verify credentials and connect to this path"
                              >
                                {language === 'en' ? "Verify & Connect" : "አረጋግጥና አገናኝ"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 py-1">
                        <input 
                          type="checkbox" 
                          id="admin-gh-enabled"
                          className="w-4 h-4 rounded-lg accent-gold-500 cursor-pointer" 
                          checked={ghConfig.enabled} 
                          onChange={e => {
                            const val = e.target.checked;
                            setGhConfig(prev => {
                              const next = { ...prev, enabled: val };
                              saveGitHubConfig(next);
                              return next;
                            });
                          }} 
                        />
                        <label htmlFor="admin-gh-enabled" className="text-xs text-slate-300 font-bold cursor-pointer">
                          {language === 'en' ? "Enable Synchronization Trigger" : "ክላውድ ማመሳሰያውን አግብር"}
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-3.5 pt-1.5">
                        <button
                          type="button"
                          onClick={handleManualGitHubSync}
                          disabled={githubSyncing || !ghConfig.token}
                          className="py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-white/10 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw size={13} className={githubSyncing ? "animate-spin" : ""} />
                          {language === 'en' ? "PULL LEDGER" : "ዳታቤዝ አምጣ"}
                        </button>

                        <button
                          type="button"
                          onClick={handleManualPushBackup}
                          disabled={githubSyncing || !ghConfig.token}
                          className="py-2.5 bg-gold-500 hover:bg-gold-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          <Cloud size={13} />
                          {language === 'en' ? "PUSH LEDGER" : "ዳታቤዝ ስቀል"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Discovered Remote Backups Explorer Card */}
                  <div className="bg-slate-900/45 p-6 rounded-2xl border border-white/5 shadow-2xl backdrop-blur relative overflow-hidden">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <div>
                          <h3 className="text-sm font-black text-sky-400 tracking-wider uppercase flex items-center gap-2">
                            <Database size={16} className="text-sky-400" />
                            {language === 'en' ? "Detected GitHub Backup Files" : "በራስ-ሰር የተገኙ የክላውድ ፋይሎች"}
                          </h3>
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase">
                            {language === 'en' ? `Target Folder: ${getFolderName(year, month)}` : `ዒላማ ፎልደር፡ ${getFolderName(year, month)}`}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button 
                            onClick={scanBackups}
                            disabled={isLoadingBackups || !ghConfig.token}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-white/10 text-[10px] font-bold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                            title="Scan Folder"
                          >
                            <RefreshCw size={12} className={isLoadingBackups ? "animate-spin" : ""} />
                          </button>
                        </div>
                      </div>

                      {backupScanError && (
                        <div className="p-3.5 bg-red-950/20 border border-red-500/20 rounded-xl text-red-400 text-[10px] font-mono leading-normal">
                          ⚠️ {backupScanError}
                        </div>
                      )}

                      {/* Display of Currently Loaded database path indicator */}
                      {loadedBackupPath && (
                        <div className="bg-gold-500/10 border border-gold-500/20 p-3 rounded-xl flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gold-400 animate-ping"></div>
                            <span className="text-[10px] font-mono font-bold text-gold-400 uppercase">
                              {loadedBackupPath === 'merged' ? "AGGREGATED COHORT" : `ACTIVE VIEW: ${loadedBackupPath.split('/').pop()}`}
                            </span>
                          </div>
                          <button 
                            onClick={handleResetToLocal}
                            className="text-[9px] bg-red-950/50 hover:bg-red-900/60 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-lg font-bold transition"
                          >
                            {language === 'en' ? "View Local" : "አካባቢያዊ እይ"}
                          </button>
                        </div>
                      )}

                      {isLoadingBackups ? (
                        <div className="py-8 flex flex-col items-center justify-center text-gray-400 text-xs font-mono animate-pulse uppercase tracking-wider">
                          <RefreshCw size={18} className="animate-spin text-sky-400 mb-2" />
                          {language === 'en' ? "Scanning GitHub repository..." : "የ GitHub ማከማቻን በመፈለግ ላይ..."}
                        </div>
                      ) : detectedBackups.length === 0 ? (
                        <div className="py-6 text-center text-gray-500 text-[11px] font-mono border border-dashed border-white/5 rounded-xl uppercase leading-relaxed">
                          {language === 'en' 
                            ? "No backup files found. Fill Owner, Repo, and PAT credentials above to list folders." 
                            : "ምንም የተቀመጠ ፋይል አልተገኘም። ከላይ ያሉትን መረጃዎች ሲያስገቡ የቀድሞ ፋይሎች እዚህ ይዘረዘራሉ።"}
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {detectedBackups.map((backup) => {
                            const isLoaded = loadedBackupPath === backup.path;
                            const isActiveInConfig = ghConfig.path === backup.path;
                            
                            return (
                              <div 
                                key={backup.path}
                                className={`p-3 rounded-xl border transition flex items-center justify-between gap-4 ${
                                  isLoaded 
                                    ? 'bg-gold-500/10 border-gold-500/40' 
                                    : isActiveInConfig
                                      ? 'bg-slate-800/40 border-gold-500/20'
                                      : 'bg-black/25 border-white/5 hover:border-white/10'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <FileText size={16} className={isLoaded ? 'text-gold-400' : 'text-gray-400'} />
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-white block truncate">{backup.filename}</span>
                                    <span className="text-[9px] text-gray-500 font-mono block uppercase">
                                      {language === 'en' ? 'Path: ' : 'መንገድ፡ '}{backup.path} • {(backup.size / 1024).toFixed(1)} KB
                                    </span>
                                  </div>
                                </div>

                                <div className="flex gap-1.5 shrink-0">
                                  {/* Select Path & Auto Load Button */}
                                  <button
                                    onClick={() => {
                                      // 1. Update the database file path input field immediately
                                      setGhConfig(prev => {
                                        const updated = { ...prev, path: backup.path };
                                        saveGitHubConfig(updated);
                                        return updated;
                                      });
                                      // 2. Load and inspect data instantly
                                      handleLoadBackup(backup.path, backup.filename);
                                    }}
                                    className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition cursor-pointer ${
                                      isLoaded
                                        ? 'bg-gold-500 text-slate-950 font-bold'
                                        : 'bg-slate-800 hover:bg-slate-700 text-gray-300'
                                    }`}
                                  >
                                    {isLoaded ? (language === 'en' ? "ACTIVE" : "በስራ ላይ") : (language === 'en' ? "LOAD & INSPECT" : "አምጣና እይ")}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {detectedBackups.length > 0 && (
                        <button 
                          onClick={handleMergeAllBackups}
                          disabled={isMerging}
                          className="w-full py-2 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Layers size={12} />
                          {isMerging ? (language === 'en' ? "Merging..." : "በማጠቃለል ላይ...") : (language === 'en' ? "Aggregate & Merge All User Backups" : "የሁሉንም ተጠቃሚዎች ፋይል አጠቃልል")}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* FRESH START CARD */}
                  <div className="bg-slate-900/45 p-6 rounded-2xl border border-red-500/15 shadow-2xl backdrop-blur relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-5 opacity-5 pointer-events-none z-0">
                      <Layers size={90} className="text-red-500" />
                    </div>
                    <div className="relative z-10 space-y-4">
                      <div className="border-b border-white/5 pb-3">
                        <h3 className="text-sm font-black text-red-400 tracking-wider uppercase flex items-center gap-2">
                          <AlertTriangle size={16} className="text-red-400 animate-pulse" />
                          {language === 'en' ? "System Fresh Start" : "ስርዓቱን አዲስ ጅምር ማድረግ"}
                        </h3>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase">
                          {language === 'en' ? "Start fresh with a brand new, empty database file" : "ባዶ በሆነ አዲስ የዳታቤዝ ፋይል በአሳሹ ላይ እንደገና ይጀምሩ"}
                        </p>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {language === 'en' 
                          ? "This option clears all currently displayed data details (manpower, finance, store, etc.) from this website so you can start completely fresh. This will automatically generate a new sequential file path on GitHub. Nothing will be deleted or removed from your GitHub repository; previous file paths (like arms001.json) will remain safe on cloud, and you can access them anytime with proper credentials by manually editing the file path input above." 
                          : "ይህ አማራጭ በአሳሽዎ ላይ ያለውን የአሁኑን መረጃ ያጸዳል፣ በዚህም በአዲስ ፋይል መጀመር ይችላሉ። ይህ በራስ-ሰር አዲስ ተከታታይ የፋይል መንገድን በ GitHub ላይ ያመነጫል። ከ GitHub ማከማቻዎ ምንም አይነት ነገር አይጠፋም። ቀደም ሲል የነበሩ የፋይል መንገዶች (እንደ arms001.json) ደህንነታቸው በክላውድ ላይ ይጠበቃል።"}
                      </p>

                      <button
                        type="button"
                        onClick={handleFreshStart}
                        className="w-full py-2.5 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer uppercase"
                      >
                        <Trash2 size={13} />
                        {language === 'en' ? "PERFORM FRESH START" : "አዲስ ጅምር አድርግ"}
                      </button>
                    </div>
                  </div>

                </div>

                {/* Column 2: Administrative Credentials Security settings */}
                <div className="space-y-6">
                  
                  {/* Form 1: System Commander (etaf Role) Access Control */}
                  <div className="bg-slate-900/45 p-6 rounded-2xl border border-white/5 shadow-2xl backdrop-blur">
                    <div className="space-y-4">
                      <div className="border-b border-white/5 pb-3">
                        <h3 className="text-sm font-black text-gold-400 tracking-wider uppercase flex items-center gap-2">
                          <KeyRound size={16} className="text-gold-500" />
                          {language === 'en' ? "System Commander Login (etaf Role)" : "የስርዓቱ አዛዥ መለያ (etaf Role)"}
                        </h3>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase">
                          {language === 'en' ? "Manages access to this master Admin Dashboard terminal" : "ይህንን አስተዳደራዊ ተርሚናል ለመቆጣጠር የሚያገለግል የባለስልጣን መግቢያ"}
                        </p>
                      </div>

                      <form onSubmit={handleUpdateCommanderCredentials} className="space-y-4">
                        <div>
                          <label className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Commander Username</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500/80 transition" 
                            value={commanderUsername} 
                            onChange={e => setCommanderUsername(e.target.value)} 
                            placeholder="e.g. etaf"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[9px] text-gray-400 uppercase font-bold block mb-1">New Commander Password</label>
                            <input 
                              type="password" 
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500/80 transition" 
                              value={commanderPassword} 
                              onChange={e => setCommanderPassword(e.target.value)} 
                              placeholder="••••••••"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Confirm Commander Password</label>
                            <input 
                              type="password" 
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500/80 transition" 
                              value={commanderPasswordConfirm} 
                              onChange={e => setCommanderPasswordConfirm(e.target.value)} 
                              placeholder="••••••••"
                            />
                          </div>
                        </div>

                        {commanderSuccess && (
                          <div className="text-[10px] text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-xl">
                            ✅ {commanderSuccess}
                          </div>
                        )}
                        {commanderError && (
                          <div className="text-[10px] text-red-400 bg-red-950/20 border border-red-500/20 p-3 rounded-xl">
                            ⚠️ {commanderError}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={commanderLoading}
                          className="w-full py-2 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-slate-950 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {commanderLoading ? <RefreshCw className="animate-spin" size={14} /> : (language === 'en' ? "UPDATE COMMANDER CREDENTIALS" : "የአዛዥ መግቢያ መረጃ ቀይር")}
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Form 2: Logistics Specialist (admin Role) Access Control */}
                  <div className="bg-slate-900/45 p-6 rounded-2xl border border-white/5 shadow-2xl backdrop-blur">
                    <div className="space-y-4">
                      <div className="border-b border-white/5 pb-3">
                        <h3 className="text-sm font-black text-gold-400 tracking-wider uppercase flex items-center gap-2">
                          <User size={16} className="text-gold-500" />
                          {language === 'en' ? "Logistics Specialist Login (admin Role)" : "የሎጅስቲክስ ባለሙያ መለያ (admin Role)"}
                        </h3>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase">
                          {language === 'en' ? "Manages access to the standard daily data-entry workspace" : "የየዕለቱን የሪፖርት መረጃዎችን ለማስገባት የሚያገለግል የባለሙያ መግቢያ"}
                        </p>
                      </div>

                      <form onSubmit={handleUpdateAdminCredentials} className="space-y-4">
                        <div>
                          <label className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Specialist Username</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500/80 transition" 
                            value={adminUsername} 
                            onChange={e => setAdminUsername(e.target.value)} 
                            placeholder="e.g. admin"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[9px] text-gray-400 uppercase font-bold block mb-1">New Specialist Password</label>
                            <input 
                              type="password" 
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500/80 transition" 
                              value={adminPassword} 
                              onChange={e => setAdminPassword(e.target.value)} 
                              placeholder="••••••••"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Confirm Specialist Password</label>
                            <input 
                              type="password" 
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500/80 transition" 
                              value={adminPasswordConfirm} 
                              onChange={e => setAdminPasswordConfirm(e.target.value)} 
                              placeholder="••••••••"
                            />
                          </div>
                        </div>

                        <div className="border-t border-white/5 pt-3.5 space-y-4">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">
                              {language === 'en' ? "Security Recovery Question" : "የይለፍ ቃል መልሶ ማግኛ ጥያቄ"}
                            </span>
                            <p className="text-[9px] text-gray-500 leading-normal mb-2 uppercase">
                              {language === 'en' 
                                ? "This shared question and answer will recover logins in case they are forgotten." 
                                : "የይለፍ ቃል ቢጠፋ ለመመለስ የሚያገለግል የጋራ ጥያቄ እና መልስ"}
                            </p>
                          </div>

                          <div>
                            <label className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Security Question</label>
                            <input 
                              type="text" 
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500/80 transition" 
                              value={adminSecurityQuestion} 
                              onChange={e => setAdminSecurityQuestion(e.target.value)} 
                              placeholder="e.g. What is your primary command?"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Answer Hash (Input New Answer to Update)</label>
                            <input 
                              type="password" 
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500/80 transition" 
                              value={adminSecurityAnswer} 
                              onChange={e => setAdminSecurityAnswer(e.target.value)} 
                              placeholder="Enter Answer to Update"
                            />
                          </div>
                        </div>

                        {adminSuccess && (
                          <div className="text-[10px] text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-xl">
                            ✅ {adminSuccess}
                          </div>
                        )}
                        {adminError && (
                          <div className="text-[10px] text-red-400 bg-red-950/20 border border-red-500/20 p-3 rounded-xl">
                            ⚠️ {adminError}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={adminLoading}
                          className="w-full py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-slate-950 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {adminLoading ? <RefreshCw className="animate-spin" size={14} /> : (language === 'en' ? "UPDATE SPECIALIST CREDENTIALS" : "የባለሙያ መግቢያ መረጃ ቀይር")}
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Operational Security Audit Protocol */}
                  <div className="bg-slate-900/30 p-6 rounded-2xl border border-white/5 space-y-3.5">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Shield size={14} className="text-gold-500" />
                      {language === 'en' ? "ARMS Military Auditing Protocol" : "የ ARMS ወታደራዊ የኦዲት ደንቦች"}
                    </h4>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      {language === 'en'
                        ? "This workstation operates under STRICT READ-ONLY OBSERVA-BILITY. The local replica and any remote repositories connected here are audited automatically for integrity. All administrative and synchronization operations are cryptographically checked."
                        : "ይህ አስተዳደራዊ ተርሚናል በኦዲት እይታ ላይ ብቻ የሚሰራ ነው። ማንኛውም በክላውድ ወይም በአካባቢ የሚደረጉ ለውጦች በራስ-ሰር በደህንነት ቁጥጥር ሥር ያልፋሉ።"}
                    </p>
                    <div className="p-3 bg-black/25 rounded-xl border border-white/5 font-mono text-[9px] text-slate-500 space-y-1">
                      <div>SECURITY CLASSIFICATION: <strong className="text-gray-400">RESTRICTED</strong></div>
                      <div>CRYPTOGRAPHIC HASH: <span className="text-gray-400">SHA-256</span></div>
                      <div>STATION COMMAND ID: <span className="text-gray-400">ETH_AF_LOG_ADMIN</span></div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* 7. AI SMART ANALYST SUB-PAGE */}
          {activeTab === 'ai' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Executive Summary generator */}
              <div className="bg-slate-900/30 p-5 rounded-2xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu size={15} className="text-gold-400 animate-pulse" />
                    {language === 'en' ? "AI Executive Logistics Summarizer" : "የላቀ የ AI ሎጅስቲክስ ትንታኔ"}
                  </h3>
                  <button
                    onClick={handleTriggerAiSummary}
                    disabled={isAiLoading}
                    className="px-3.5 py-1.5 bg-gold-500 hover:bg-gold-400 text-slate-950 rounded text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    {isAiLoading ? <RefreshCw className="animate-spin" size={14} /> : (language === 'en' ? "Generate Summary" : "ትንታኔ አውጣ")}
                  </button>
                </div>

                {aiAnalysisResult ? (
                  <div className="bg-black/25 border border-white/5 rounded-lg p-4 font-serif text-sm leading-relaxed text-gray-200 max-h-80 overflow-y-auto whitespace-pre-line">
                    {aiAnalysisResult}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 text-xs border border-dashed border-white/5 rounded-lg">
                    {language === 'en' 
                      ? "Click generate to fetch a real-time logistics summary compiled from your database." 
                      : "ካለው እውነተኛ መረጃ ተነስተው የቁልፍ ስንቆችን እና የፋይናንስ ሁኔታን ትንታኔ ለማውጣት ከላይ ያለውን ይጫኑ።"
                    }
                  </div>
                )}
              </div>

              {/* Chat portal with AI */}
              <div className="bg-slate-900/30 p-5 rounded-2xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    {language === 'en' ? "Interactive Logistics Guard Chat" : "በእውነተኛ መረጃ ላይ የተመሰረተ የ AI ውይይት"}
                  </h3>
                  
                  {aiChatHistory.length > 0 && (
                    <button 
                      onClick={() => {
                        if (window.confirm(language === 'en' ? "Reset chat history?" : "የንግግር ታሪኩን ማጽዳት ይፈልጋሉ?")) {
                          setAiChatHistory([]);
                        }
                      }}
                      className="text-[10px] text-gray-400 hover:text-red-400 font-bold transition flex items-center gap-1 cursor-pointer font-mono"
                    >
                      <Trash2 size={12} />
                      {language === 'en' ? "RESET" : "አጽዳ"}
                    </button>
                  )}
                </div>

                {/* Templates section */}
                <div className="flex flex-wrap gap-2 py-1.5">
                  {[
                    {
                      en: "Identify any duplicate entries in manpower rosters.",
                      am: "በሰው ኃይል ሰንጠረዦች ውስጥ የተደጋገሙ መዝገቦች ካሉ ፈልግ።"
                    },
                    {
                      en: "Analyze price variances and cost inefficiencies.",
                      am: "የዕቃዎች ግዢ የዋጋ ልዩነቶች እና የበጀት ብክነትን ይገምግሙ።"
                    },
                    {
                      en: "Summarize total cash flow and current balance sheet.",
                      am: "አጠቃላይ የበጀት ፍሰት እና አሁን ያለውን የገንዘብ ቀሪ ሂሳብ አጠቃልልልኝ።"
                    },
                    {
                      en: "Show active military count by command division.",
                      am: "በየክፍለ ጦሩ ንቁ የሆኑ የአባላትን ብዛት አስላ።"
                    }
                  ].map((tpl, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setAiChatInput(language === 'en' ? tpl.en : tpl.am);
                      }}
                      className="text-[10px] bg-slate-850 hover:bg-gold-500/10 border border-white/5 hover:border-gold-500/30 text-gray-300 hover:text-gold-400 px-3 py-1.5 rounded-full transition cursor-pointer text-left"
                    >
                      💡 {language === 'en' ? tpl.en : tpl.am}
                    </button>
                  ))}
                </div>

                <div className="bg-black/35 rounded-xl p-4 h-96 overflow-y-auto flex flex-col gap-4 border border-white/5 scroll-smooth">
                  {aiChatHistory.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30 ml-auto rounded-tr-none' 
                          : 'bg-slate-800/80 text-gray-100 mr-auto rounded-tl-none border border-white/5'
                      }`}
                    >
                      <span className="font-bold block text-[8px] uppercase tracking-wider opacity-60 mb-1.5 font-mono">
                        {msg.role === 'user' ? (language === 'en' ? "Admin Command Prompt" : "የአስተዳዳሪ ትዕዛዝ") : "Gemini Logistics Intel Core"}
                      </span>
                      <div className="whitespace-pre-line text-xs">
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {aiChatHistory.length === 0 && (
                    <div className="text-center my-auto text-gray-500 text-xs py-10 flex flex-col items-center gap-2">
                      <Cpu size={32} className="text-slate-600 animate-pulse" />
                      <p>{language === 'en' ? "Ask anything about active headcounts, stocks, or budget variances." : "ስለ ሰው ኃይል፣ ስንቅ እና በጀት ዝርዝር ጉዳዮች እዚህ AI-ን መጠየቅ ይችላሉ።"}</p>
                    </div>
                  )}
                  {isAiLoading && (
                    <div className="flex justify-start w-full">
                      <div className="bg-slate-800/60 border border-white/5 p-3 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-gold-500 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-gold-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-1.5 h-1.5 bg-gold-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendAiChatMessage} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder={language === 'en' ? "Ask smart agent or select a template..." : "AI ረዳቱን እዚህ ይጠይቁ ወይም ጥያቄ ይምረጡ..."}
                    value={aiChatInput}
                    onChange={(e) => setAiChatInput(e.target.value)}
                    disabled={isAiLoading}
                    className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500"
                  />
                  <button 
                    type="submit"
                    disabled={isAiLoading || !aiChatInput.trim()}
                    className="bg-gold-500 hover:bg-gold-400 text-slate-950 rounded-xl px-5 font-bold text-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    {language === 'en' ? "Send" : "ላክ"}
                  </button>
                </form>
              </div>

            </div>
          )}

        </main>

      </div>

      {/* Credential Proving Popup Modal */}
      {showProvingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-slate-950 border border-gold-500/30 rounded-2xl max-w-md w-full p-6 shadow-[0_0_50px_rgba(218,165,32,0.15)] relative">
            <button 
              type="button"
              onClick={() => setShowProvingModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>
            
            <div className="flex flex-col items-center text-center space-y-4 mb-6">
              <div className="p-3 bg-gold-500/10 rounded-full border border-gold-500/20 text-gold-500">
                <ShieldAlert size={28} className="animate-pulse text-gold-500" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gold-400 tracking-wider uppercase">
                  {language === 'en' ? "Security Verification" : "የደህንነት ማረጋገጫ"}
                </h3>
                <p className="text-[11px] text-gray-400 mt-1 uppercase font-mono tracking-tight leading-normal">
                  {language === 'en' 
                    ? "This remote file is secure. Prove you own it to connect and restore its data." 
                    : "ይህ የክላውድ ፋይል የተጠበቀ ነው። መረጃውን ለማግኘት እና ለማመሳሰል ባለቤትነትዎን ያረጋግጡ።"}
                </p>
              </div>
            </div>
            
            <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 font-mono text-[9px] text-slate-400 mb-4 uppercase space-y-1">
              <div className="flex justify-between">
                <span>Target Path:</span>
                <span className="text-gold-500 font-bold">{provingPath}</span>
              </div>
              <div className="flex justify-between">
                <span>Database Owner:</span>
                <span className="text-white font-bold">{remoteDbData?.securityCredentials?.adminUsername || 'etaf'}</span>
              </div>
            </div>
            
            <form onSubmit={handleProveCredentials} className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">
                  {language === 'en' ? "Database Passcode / Password" : "የዳታቤዝ የይለፍ ቃል ያስገቡ"}
                </label>
                <input 
                  type="password" 
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500/80 transition font-mono" 
                  value={provingPassword} 
                  onChange={e => setProvingPassword(e.target.value)} 
                  placeholder="••••••••"
                  required
                  autoFocus
                />
              </div>
              
              {provingError && (
                <div className="text-[10px] text-red-400 bg-red-950/20 border border-red-500/20 p-3 rounded-xl uppercase font-mono">
                  ⚠️ {provingError}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProvingModal(false)}
                  className="py-2.5 bg-slate-900 hover:bg-slate-800 text-gray-400 hover:text-white rounded-xl text-xs font-bold transition border border-white/5 cursor-pointer"
                >
                  {language === 'en' ? "CANCEL" : "ሰርዝ"}
                </button>
                
                <button
                  type="submit"
                  disabled={provingLoading}
                  className="py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-slate-950 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {provingLoading ? <RefreshCw className="animate-spin" size={14} /> : (language === 'en' ? "PROVE & LINK" : "አረጋግጥና አገናኝ")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* State-of-the-art A4 Print Preview and Export Portal */}
      {showPrintModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-start overflow-y-auto p-4 no-print">
          <div className="w-full max-w-[210mm] bg-slate-900 border-b border-gold-500/30 p-4 rounded-t-2xl flex justify-between items-center shrink-0 text-white font-sans">
            <div className="flex items-center gap-2">
              <Printer size={18} className="text-gold-500 animate-pulse" />
              <span className="text-sm font-black tracking-widest uppercase font-mono">
                {language === 'en' ? "ARMS PRINT PREVIEW TERMINAL" : "የህትመት እይታ መቆጣጠሪያ"}
              </span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowPrintModal(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer border border-white/5"
              >
                {language === 'en' ? "CLOSE" : "ዝጋ"}
              </button>
              <button 
                onClick={() => {
                  window.print();
                }}
                className="px-5 py-1.5 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-slate-950 font-black rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-gold-500/10"
              >
                <Printer size={14} />
                {language === 'en' ? "PRINT NOW" : "ፕሪንት አድርግ"}
              </button>
            </div>
          </div>

          <div className="w-full max-w-[210mm] bg-white text-black p-[15mm] md:p-[20mm] shadow-[0_0_50px_rgba(0,0,0,0.5)] min-h-[297mm] flex flex-col justify-between font-sans leading-relaxed print:p-0 print:shadow-none print:min-h-0">
            {/* Header section */}
            <div className="space-y-6">
              <div className="text-center border-b-2 border-black pb-4">
                <h2 className="text-xs font-black tracking-widest uppercase">Federal Democratic Republic of Ethiopia</h2>
                <h1 className="text-sm font-black tracking-widest uppercase mt-1">Ethiopian Air Force • Logistics Command</h1>
                <p className="text-[10px] font-bold font-mono tracking-wider text-gray-600 uppercase mt-1.5">
                  Automated Ration Management System (ARMS) • Audit Ledger
                </p>
                <div className="flex justify-between items-center text-[9px] font-mono font-bold text-gray-500 mt-4 uppercase">
                  <span>FILE SOURCE: {ghConfig.path || "arms_db.json"}</span>
                  <span>GENERATED: {getCurrentEthiopianDate()} (UTC)</span>
                </div>
              </div>

              {/* Document Title */}
              <div className="text-center py-1">
                <h3 className="text-xs font-black underline uppercase tracking-widest">
                  {activeTab === 'overview' && (language === 'en' ? "COMMAND METRICS & LOGISTICS OVERVIEW" : "የሎጅስቲክስ እና የበጀት አጠቃላይ ሪፖርት")}
                  {activeTab === 'manpower' && (language === 'en' ? "ACTIVE PERSONNEL ALLOCATION ROSTER" : "በስራ ላይ ያሉ የአባላት ዝርዝር ሪፖርት")}
                  {activeTab === 'store' && (language === 'en' ? "STORES & RATIONS INVENTORY LEDGER" : "የግምጃ ቤት ስቶክ እና የስንቅ ክምችት ሪፖርት")}
                  {activeTab === 'market' && (language === 'en' ? "MARKET PRICE VARIANCE & AUDIT SHEET" : "የገበያ ዋጋ እና የግዢ ልዩነት ኦዲት ሪፖርት")}
                  {activeTab === 'finance' && (language === 'en' ? "FINANCIAL INCOME & EXPENDITURE LEDGER" : "የገቢ እና የወጪ ሂሳብ መቆጣጠሪያ መዝገብ")}
                  {activeTab === 'security' && (language === 'en' ? "TERMINAL SECURITY CREDENTIALS REPORT" : "የተርሚናል ደህንነት እና የክላውድ ማዋቀሪያ ሪፖርት")}
                  {activeTab === 'ai' && (language === 'en' ? "INTELLIGENT DECISION SUPPORT STATEMENT" : "የ AI ድጋፍ እና የስንቅ ትንታኔ ሪፖርት")}
                </h3>
              </div>

              {/* Dynamic Sections depending on tab */}
              <div className="text-[11px] space-y-4">
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 border border-black p-3 rounded">
                      <div>
                        <p className="font-bold text-gray-600 uppercase text-[8px]">Active Commando Headcount</p>
                        <p className="text-xs font-black">{totalActivePersonnel} Officers</p>
                      </div>
                      <div>
                        <p className="font-bold text-gray-600 uppercase text-[8px]">Total Cash Outflow</p>
                        <p className="text-xs font-black">{totalExpensesAmount.toLocaleString()} Birr</p>
                      </div>
                      <div>
                        <p className="font-bold text-gray-600 uppercase text-[8px]">Total Store Inventory Volume</p>
                        <p className="text-xs font-black">{totalStockRemaining.toLocaleString()} Units</p>
                      </div>
                      <div>
                        <p className="font-bold text-gray-600 uppercase text-[8px]">Depleted Stock Alerts</p>
                        <p className="text-xs font-black text-red-600">{lowStockCount} Items Below Safe Margin</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="font-bold text-gray-700 underline uppercase text-[9px]">Command Level Headcount Distribution</p>
                      <table className="w-full border-collapse border border-black text-left text-[9px]">
                        <thead>
                          <tr className="bg-gray-100 border-b border-black">
                            <th className="p-1.5 border-r border-black font-bold">Military Command Division</th>
                            <th className="p-1.5 font-bold">Active Commando Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['Air Force', 'Ground Force', 'Navy', 'Special Force'].map(cmd => (
                            <tr key={cmd} className="border-b border-black">
                              <td className="p-1.5 border-r border-black font-semibold">{cmd}</td>
                              <td className="p-1.5 font-mono">{manpowerList.filter(m => m.command === cmd).length} Officers</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'manpower' && (
                  <div className="space-y-2">
                    <table className="w-full border-collapse border border-black text-left text-[8px]">
                      <thead>
                        <tr className="bg-gray-100 border-b border-black font-bold">
                          <th className="p-1 border-r border-black">Full Name</th>
                          <th className="p-1 border-r border-black">Rank</th>
                          <th className="p-1 border-r border-black">Command</th>
                          <th className="p-1 border-r border-black">Ration Type</th>
                          <th className="p-1">Period Range</th>
                        </tr>
                      </thead>
                      <tbody>
                        {manpowerList.slice(0, 35).map((m, idx) => (
                          <tr key={idx} className="border-b border-black">
                            <td className="p-1 border-r border-black font-semibold uppercase">{m.firstName} {m.lastName}</td>
                            <td className="p-1 border-r border-black uppercase">{m.rank}</td>
                            <td className="p-1 border-r border-black uppercase">{m.command}</td>
                            <td className="p-1 border-r border-black uppercase">{m.type}</td>
                            <td className="p-1 font-mono">{m.startDate} to {m.endDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {manpowerList.length > 35 && (
                      <p className="text-[7px] text-gray-500 font-mono italic">
                        * Listing truncated to first 35 personnel records for standard A4 page constraint.
                      </p>
                    )}
                  </div>
                )}

                {activeTab === 'store' && (
                  <div className="space-y-4">
                    <table className="w-full border-collapse border border-black text-left text-[8px]">
                      <thead>
                        <tr className="bg-gray-100 border-b border-black font-bold">
                          <th className="p-1 border-r border-black">Item Name</th>
                          <th className="p-1 border-r border-black">Category</th>
                          <th className="p-1 border-r border-black">Quantity Stocked</th>
                          <th className="p-1 border-r border-black">Unit Price</th>
                          <th className="p-1">Last Update</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(liveDb?.storeItems || []).slice(0, 35).map((item, idx) => (
                          <tr key={idx} className="border-b border-black">
                            <td className="p-1 border-r border-black font-semibold uppercase">{item.itemName}</td>
                            <td className="p-1 border-r border-black uppercase">{item.category}</td>
                            <td className="p-1 border-r border-black font-mono">{item.amount} {item.measurement}</td>
                            <td className="p-1 border-r border-black font-mono">{item.singlePrice.toLocaleString()} ETB</td>
                            <td className="p-1 font-mono">{item.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'market' && (
                  <div className="space-y-4">
                    <table className="w-full border-collapse border border-black text-left text-[8px]">
                      <thead>
                        <tr className="bg-gray-100 border-b border-black font-bold">
                          <th className="p-1 border-r border-black">Procured Item</th>
                          <th className="p-1 border-r border-black">Actual Price Paid</th>
                          <th className="p-1 border-r border-black">Reference Market Price</th>
                          <th className="p-1 border-r border-black">Variance State</th>
                          <th className="p-1">Procured Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expensesList.filter(e => e.category === 'Market').slice(0, 35).map((exp, idx) => {
                          const paid = Number(exp.singlePrice) || 0;
                          const ref = Number(exp.marketPrice) || paid;
                          const diff = paid - ref;
                          return (
                            <tr key={idx} className="border-b border-black">
                              <td className="p-1 border-r border-black font-semibold uppercase">{exp.itemName}</td>
                              <td className="p-1 border-r border-black font-mono">{paid.toLocaleString()} ETB</td>
                              <td className="p-1 border-r border-black font-mono">{ref.toLocaleString()} ETB</td>
                              <td className={`p-1 border-r border-black font-mono font-bold ${diff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {diff === 0 ? "0% (ON PAR)" : `${diff > 0 ? '+' : ''}${((diff / ref) * 100).toFixed(1)}%`}
                              </td>
                              <td className="p-1 font-mono">{exp.date}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'finance' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 border border-black p-2 bg-gray-50 text-center font-bold">
                      <div>
                        <p className="text-[7px] text-gray-500 uppercase">Total Revenue / Inflows</p>
                        <p className="text-[10px] font-black text-emerald-700">{totalSubsidiesAmount.toLocaleString()} ETB</p>
                      </div>
                      <div>
                        <p className="text-[7px] text-gray-500 uppercase">Total Outflows / Expenses</p>
                        <p className="text-[10px] font-black text-red-700">{totalExpensesAmount.toLocaleString()} ETB</p>
                      </div>
                      <div>
                        <p className="text-[7px] text-gray-500 uppercase">Net Liquidity Reserve</p>
                        <p className={`text-[10px] font-black ${totalNetLiquidity >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{totalNetLiquidity.toLocaleString()} ETB</p>
                      </div>
                    </div>

                    <p className="font-bold text-gray-700 underline uppercase text-[9px]">Procurements and Wage List Breakdown</p>
                    <table className="w-full border-collapse border border-black text-left text-[8px]">
                      <thead>
                        <tr className="bg-gray-100 border-b border-black font-bold">
                          <th className="p-1 border-r border-black">Recipient / Description</th>
                          <th className="p-1 border-r border-black">Financial Category</th>
                          <th className="p-1 border-r border-black">Quantity</th>
                          <th className="p-1 border-r border-black">Unit Rate</th>
                          <th className="p-1">Total Debit Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expensesList.slice(0, 30).map((exp, idx) => {
                          const qty = Number(exp.amount) || 1;
                          const rate = Number(exp.singlePrice) || Number(exp.amount);
                          const tot = qty * (Number(exp.singlePrice) ? rate : 1);
                          return (
                            <tr key={idx} className="border-b border-black">
                              <td className="p-1 border-r border-black uppercase font-semibold">
                                {exp.itemName || exp.workerName || exp.reason || "Expense"}
                              </td>
                              <td className="p-1 border-r border-black uppercase">{exp.category}</td>
                              <td className="p-1 border-r border-black font-mono">{qty}</td>
                              <td className="p-1 border-r border-black font-mono">{rate.toLocaleString()} ETB</td>
                              <td className="p-1 font-mono font-bold">{tot.toLocaleString()} ETB</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'ai' && (
                  <div className="space-y-4">
                    <p className="font-bold text-gray-700 underline uppercase text-[9px]">Gemini AI Executive Analysis Summary</p>
                    <div className="border border-black p-4 bg-gray-50 rounded text-justify leading-relaxed whitespace-pre-line text-[9px] italic">
                      {aiAnalysisResult || "No executive summary is currently generated on the active dashboard. Please generate one to include it in this printed sheet."}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Verification & Signature Section */}
            <div className="border-t border-black pt-6 mt-8 space-y-6 font-serif">
              <p className="text-[9px] text-center text-gray-500 italic uppercase leading-tight">
                This document contains official high-integrity logistics records of the Federal Democratic Republic of Ethiopia. Unilateral alterations or sharing of these data values are strictly regulated under defense logs.
              </p>
              
              <div className="grid grid-cols-2 gap-8 text-[11px]">
                <div className="space-y-2">
                  <div className="border-b border-black h-8"></div>
                  <p className="font-bold uppercase tracking-wider">Andualem Koriya</p>
                  <p className="text-[9px] text-gray-500 font-sans uppercase font-bold">ARMS Logistics Lead & Lead Developer</p>
                </div>
                
                <div className="space-y-2">
                  <div className="border-b border-black h-8"></div>
                  <p className="font-bold uppercase tracking-wider">COMMANDING GENERAL OFFICER</p>
                  <p className="text-[9px] text-gray-500 font-sans uppercase font-bold">Logistics Division Commandant Approval</p>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
