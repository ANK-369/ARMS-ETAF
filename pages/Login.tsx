import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Plane, Lock, User, Cpu, Globe, Cloud, RefreshCw, AlertTriangle, 
  CheckCircle, Info, KeyRound
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { saveDB, getStoredUsername, getStoredAdminUsername, verifyAdminPassword, verifyUserPassword, verifyPassword, getStoredSecurityQuestion, verifySecurityAnswer, resetPasswordDirectly } from '../services/db';
import { getGitHubConfig, saveGitHubConfig, fetchFromGitHub, findFilesBySecretKey } from '../services/githubService';
import etafLogo from '../assets/images/etaf_logo.png';

interface LoginProps {
  onLoginSuccess: (role: 'admin' | 'user') => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Password recovery states
  const [isResetting, setIsResetting] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  
  // Advanced Cloud Gateway Sync form states
  const [showCloudSync, setShowCloudSync] = useState<boolean>(false);
  const [ghToken, setGhToken] = useState<string>("");
  const [ghOwner, setGhOwner] = useState<string>("");
  const [ghRepo, setGhRepo] = useState<string>("");
  const [ghPath, setGhPath] = useState<string>("arms_db.json");
  const [syncMessage, setSyncMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' | null }>({ text: '', type: null });

  // Secret Key Access states
  const [showSecretKeyAccess, setShowSecretKeyAccess] = useState<boolean>(false);
  const [enteredSecretKey, setEnteredSecretKey] = useState<string>("");
  const [secretKeyMessage, setSecretKeyMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' | null }>({ text: '', type: null });
  const [matchingFiles, setMatchingFiles] = useState<string[]>([]);

  const { t, toggleLanguage, language } = useLanguage();

  // Fresh Start Sync / Populate Form Config
  useEffect(() => {
    const initSyncAndConfig = async () => {
      // 1. Populate form with existing GitHub config if present
      const config = getGitHubConfig();
      if (config) {
        if (config.token) setGhToken(config.token);
        if (config.owner) setGhOwner(config.owner);
        if (config.repo) setGhRepo(config.repo);
        if (config.path) setGhPath(config.path || "arms_db.json");
      }

      // 2. Fresh Start Sync Logic from original Login
      if (config && config.enabled && config.token) {
        setIsSyncing(true);
        try {
          const { data } = await fetchFromGitHub();
          if (data) {
            // Save fetched data to local DB, skip triggering another push to avoid redundancy
            saveDB(data, true); 
            console.log("Fresh Start: Synced from GitHub");
          }
        } catch (err) {
          console.error("Fresh start sync failed:", err);
        } finally {
          setIsSyncing(false);
        }
      }
    };
    initSyncAndConfig();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetSuccessMsg('');
    setLoading(true);
    
    // Simulate secure check delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      const trimmedUsername = username.trim().toLowerCase();
      
      const adminUser = getStoredAdminUsername().toLowerCase();
      const standardUser = getStoredUsername().toLowerCase();

      // 1. Check for Admin Role
      // If customized, default "etaf/etaf" credentials are disabled (unless etaf is kept as the custom username)
      const isCustomAdmin = localStorage.getItem('arms_admin_customized') === 'true';
      const isAdminUsernameMatch = (trimmedUsername === adminUser && adminUser !== standardUser) || (!isCustomAdmin && trimmedUsername === 'etaf');
      if (isAdminUsernameMatch) {
        const isValidAdmin = await verifyAdminPassword(password);
        if (isValidAdmin || (!isCustomAdmin && password === 'etaf')) {
          setLoading(false);
          onLoginSuccess('admin');
          return;
        }
      }

      // 2. Check for Regular User Role
      // If customized, default "admin/admin" credentials are disabled (unless admin is kept as the custom username)
      const isCustomUser = localStorage.getItem('arms_user_customized') === 'true';
      const isUserUsernameMatch = (trimmedUsername === standardUser) || (!isCustomUser && trimmedUsername === 'admin');
      if (isUserUsernameMatch) {
        const isValidUser = await verifyUserPassword(password);
        if (isValidUser || (!isCustomUser && password === 'admin')) {
          setLoading(false);
          onLoginSuccess('user');
          return;
        }
      }

      setError(t('accessDenied'));
      setLoading(false);
    } catch (err) {
      console.error("Login verification failed:", err);
      setError("System Security Error");
      setLoading(false);
    }
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 600));
    const isAnswerCorrect = await verifySecurityAnswer(securityAnswer);
    setLoading(false);
    if (isAnswerCorrect) {
      setResetStep(2);
    } else {
      setError(language === 'en' ? "Security response validation failed. Access Denied." : "የደህንነት መልስ ማረጋገጫ አልተሳካም። መዳረሻ ተከልክሏል።");
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newPassword) {
      setError(language === 'en' ? "Password cannot be empty." : "የይለፍ ቃል ባዶ መሆን አይችልም።");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setError(language === 'en' ? "Passwords do not match." : "የይለፍ ቃላት አይዛመዱም።");
      return;
    }
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    await resetPasswordDirectly(newPassword);
    setLoading(false);
    setResetSuccessMsg(language === 'en' 
      ? "Password reset successfully. Please authenticate using your new credentials."
      : "የይለፍ ቃል በትክክል ተቀይሯል። እባክዎን በአዲሱ መለያዎ ይግቡ።"
    );
    setIsResetting(false);
    setResetStep(1);
    setSecurityAnswer('');
    setNewPassword('');
    setNewPasswordConfirm('');
    setPassword('');
  };

  // Cloud Remote Link Sync: Fetches DB from remote GitHub and overrides local storage before evaluating login!
  const handleCloudGatewaySync = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncMessage({ 
      text: language === 'en' ? "Verifying secure pipeline connection..." : "የደህንነት መስመር ግንኙነትን በማረጋገጥ ላይ...", 
      type: "info" 
    });
    setLoading(true);

    try {
      if (!ghToken || !ghOwner || !ghRepo) {
        setSyncMessage({ 
          text: language === 'en' ? "Missing required GitHub API parameters." : "አስፈላጊው የ GitHub API መረጃ አልተሟላም።", 
          type: "error" 
        });
        setLoading(false);
        return;
      }

      // Temporarily save GitHub configuration
      const tempConfig = {
        token: ghToken.trim(),
        owner: ghOwner.trim(),
        repo: ghRepo.trim(),
        path: ghPath.trim(),
        enabled: true
      };
      saveGitHubConfig(tempConfig);

      // Fetch DB from cloud
      const { data, error } = await fetchFromGitHub();
      
      if (error) {
        setSyncMessage({ 
          text: language === 'en' ? `Remote Sync Failed: ${error}` : `ክላውድ ግንኙነት አልተሳካም: ${error}`, 
          type: "error" 
        });
        // Revert config to disabled
        saveGitHubConfig({ ...tempConfig, enabled: false });
      } else if (data) {
        // Successfully pulled database! Override local state
        saveDB(data, true);
        
        // Save GitHub configuration as enabled
        saveGitHubConfig(tempConfig);

        setSyncMessage({ 
          text: language === 'en' 
            ? "Sync triggered. Cloud ledger successfully integrated into browser cache." 
            : "ማመሳሰል ተጠናቋል። ክላውድ ዳታቤዝ ወደ ኮምፒውተርዎ ገብቷል።", 
          type: "success" 
        });
      } else {
        setSyncMessage({ 
          text: language === 'en' 
            ? "Connected to repository, but no ledger data found. Prepared standard database." 
            : "ከሪፖዚቶሪው ጋር ተገናኝቷል፤ ነገር ግን ምንም ዳታ አልተገኘም። መደበኛው ዳታቤዝ ተዘጋጅቷል።", 
          type: "success" 
        });
      }
    } catch (err) {
      setSyncMessage({ 
        text: language === 'en' ? "Fatal error linked with GitHub API gateway." : "ከ GitHub API ጋር በተገናኘ የሲስተም ስህተት አጋጥሟል።", 
        type: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSecretKey = async () => {
    setSecretKeyMessage({ 
      text: language === 'en' ? "Searching secure repositories for matching secret key..." : "ከተዛማጅ ሚስጥር ቁልፍ ጋር ደህንነቱ የተጠበቀ ማከማቻ ፍለጋ ላይ ነው...", 
      type: "info" 
    });
    setLoading(true);
    setMatchingFiles([]);

    try {
      const { paths, error } = await findFilesBySecretKey(enteredSecretKey);
      if (error) {
        setSecretKeyMessage({ text: error, type: "error" });
      } else if (paths.length === 0) {
        setSecretKeyMessage({ 
          text: language === 'en' ? "No authorized data ledgers found matching this secret key." : "ከዚህ ሚስጥር ቁልፍ ጋር የሚዛመድ የተፈቀደ የዳታ መዝገብ አልተገኘም።", 
          type: "error" 
        });
      } else {
        setMatchingFiles(paths);
        setSecretKeyMessage({ 
          text: language === 'en' 
            ? `Found ${paths.length} authorized database ledger(s) matching this key.` 
            : `${paths.length} የተፈቀዱ የዳታ መዝገቦች ተገኝተዋል።`, 
          type: "success" 
        });
      }
    } catch (err) {
      setSecretKeyMessage({ 
        text: language === 'en' ? "Connection failed while searching." : "በመፈለግ ላይ እያለ ግንኙነቱ ተቋርጧል።", 
        type: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSecretFile = async (filePath: string) => {
    setSecretKeyMessage({ 
      text: language === 'en' ? "Downloading and synchronizing authorized ledger..." : "የተፈቀደውን መዝገብ በማውረድ እና በማመሳሰል ላይ...", 
      type: "info" 
    });
    setLoading(true);

    try {
      const { data, error } = await fetchFromGitHub(filePath);
      if (error) {
        setSecretKeyMessage({ text: error, type: "error" });
      } else if (data) {
        // Successfully fetched! Save into shared read-only database (arms_shared_database)
        localStorage.setItem('arms_shared_database', JSON.stringify(data));
        localStorage.setItem('arms_readonly_mode', 'true');
        localStorage.setItem('arms_readonly_secret_key', enteredSecretKey);
        localStorage.setItem('arms_readonly_file_path', filePath);
        sessionStorage.setItem('arms_session_secret_key', enteredSecretKey);
        
        // Dispatch custom event to notify layout
        window.dispatchEvent(new Event('arms_readonly_update'));

        setSecretKeyMessage({ 
          text: language === 'en' ? "Ledger loaded successfully. Transitioning to Read-Only Workspace..." : "መዝገቡ በትክክል ተጭኗል። ወደ ንባብ-ብቻ እይታ በመቀየር ላይ...", 
          type: "success" 
        });

        setTimeout(() => {
          setLoading(false);
          onLoginSuccess('user');
        }, 1000);
      } else {
        setSecretKeyMessage({ 
          text: language === 'en' ? "Authorized file content empty." : "የተፈቀደው የፋይል ይዘት ባዶ ነው።", 
          type: "error" 
        });
        setLoading(false);
      }
    } catch (err) {
      setSecretKeyMessage({ 
        text: language === 'en' ? "Failed to download authorized ledger." : "የተፈቀደውን መዝገብ ማውረድ አልተሳካም።", 
        type: "error" 
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background Animated Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-500/5 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-[100px]"></div>
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      {/* Sync Indicator */}
      {isSyncing && (
          <div className="absolute top-6 left-6 z-30 flex items-center gap-2 bg-slate-900/80 backdrop-blur px-4 py-2 rounded-full border border-purple-500/30 text-purple-400 animate-in slide-in-from-top-4">
              <RefreshCw size={16} className="animate-spin" />
              <span className="text-xs font-bold font-mono">{t('syncingCloudData')}</span>
          </div>
      )}

      {/* Language Toggle */}
      <div className="absolute top-6 right-6 z-20">
          <button 
            onClick={toggleLanguage} 
            className="flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur border border-gold-500/30 rounded-full text-gold-500 font-bold hover:bg-gold-500/10 transition cursor-pointer"
          >
            <Globe size={16} />
            {language === 'en' ? 'ENGLISH' : 'አማርኛ'}
          </button>
      </div>

      <div className="relative z-10 w-full max-w-md">
         {/* Logo Composite */}
         <div className="flex justify-center mb-8 relative">
             <div className="relative">
                 <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center relative z-10 drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]">
                     <img 
                       src={etafLogo} 
                       alt="Ethiopian Air Force Logo" 
                       className="w-full h-full object-cover scale-108" 
                     />
                 </div>
             </div>
             <div className="absolute -inset-4 border-2 border-gold-500/10 rounded-full animate-[spin_10s_linear_infinite]"></div>
             <div className="absolute -inset-8 border border-dashed border-gold-500/10 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
         </div>

         <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden group">
            {/* Scanning Line Effect */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gold-500/50 shadow-[0_0_10px_#d4af37] animate-[scan_3s_ease-in-out_infinite] opacity-50"></div>
            
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black text-white tracking-[0.2em] font-serif mb-2">ARMS</h1>
              <p className="text-[10px] text-gold-500 font-bold uppercase tracking-widest border-t border-b border-gold-500/20 py-1 inline-block">
                 {t('systemName')}
              </p>
            </div>

            {resetSuccessMsg && (
                <div className="bg-green-950/40 border border-green-700/50 text-green-400 text-xs p-3.5 rounded flex items-start gap-2.5 animate-in slide-in-from-top-2 mb-4">
                    <CheckCircle size={16} className="shrink-0 mt-0.5 text-green-400" />
                    <div className="text-left">
                        <span className="font-bold block uppercase tracking-wider text-[10px] mb-0.5">{t('successAlert')}</span>
                        {resetSuccessMsg}
                    </div>
                </div>
            )}

            {isResetting ? (
              resetStep === 1 ? (
                <form onSubmit={handleSecuritySubmit} className="space-y-4">
                  <div className="bg-blue-950/40 border border-blue-500/30 p-3.5 rounded-lg text-xs text-blue-400 leading-relaxed mb-4 text-left">
                    <span className="font-bold block mb-1 uppercase tracking-wider text-[10px]">{t('accountRecoveryTerminal')}</span>
                    {t('verifyIdentityChallenge')}
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-xs text-gray-400 font-bold uppercase ml-1">{t('securityQuestion')}</label>
                    <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-lg text-white font-medium text-sm leading-relaxed">
                      {getStoredSecurityQuestion()}
                    </div>
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-xs text-gray-400 font-bold uppercase ml-1">{t('yourAnswer')}</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-slate-800/50 border border-gray-700 rounded-lg py-3 px-4 text-white focus:border-gold-500 focus:outline-none focus:bg-slate-800 transition shadow-inner text-sm"
                      placeholder={t('enterSecurityResponse')}
                      value={securityAnswer}
                      onChange={e => setSecurityAnswer(e.target.value)}
                    />
                  </div>

                  {error && (
                      <div className="bg-red-900/20 border border-red-900/50 text-red-400 text-xs p-3 rounded flex items-center gap-2 animate-in slide-in-from-top-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                          {error}
                      </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => { setIsResetting(false); setError(''); }}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-lg transition text-xs cursor-pointer"
                    >
                      {t('cancel')}
                    </button>
                    <button 
                      disabled={loading}
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-black font-bold py-3.5 rounded-lg transition disabled:opacity-70 flex items-center justify-center gap-2 text-xs cursor-pointer"
                    >
                      {loading ? <Cpu className="animate-spin" /> : t('verifyResponse')}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
                  <div className="bg-green-950/40 border border-green-500/30 p-3.5 rounded-lg text-xs text-green-400 leading-relaxed mb-4 text-left">
                    <span className="font-bold block mb-1 uppercase tracking-wider text-[10px]">{t('identityConfirmed')}</span>
                    {t('setNewCredential')}
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-xs text-gray-400 font-bold uppercase ml-1">{t('newPasswordLabel')}</label>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold-500 transition" size={18} />
                        <input 
                          required
                          type="password" 
                          className="w-full bg-slate-800/50 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-gold-500 focus:outline-none focus:bg-slate-800 transition shadow-inner text-sm"
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                        />
                    </div>
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-xs text-gray-400 font-bold uppercase ml-1">{t('confirmNewPasswordLabel')}</label>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold-500 transition" size={18} />
                        <input 
                          required
                          type="password" 
                          className="w-full bg-slate-800/50 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-gold-500 focus:outline-none focus:bg-slate-800 transition shadow-inner text-sm"
                          placeholder="••••••••"
                          value={newPasswordConfirm}
                          onChange={e => setNewPasswordConfirm(e.target.value)}
                        />
                    </div>
                  </div>

                  {error && (
                      <div className="bg-red-900/20 border border-red-900/50 text-red-400 text-xs p-3 rounded flex items-center gap-2 animate-in slide-in-from-top-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                          {error}
                      </div>
                  )}

                  <button 
                    disabled={loading}
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-black font-bold py-3.5 rounded-lg transition duration-300 disabled:opacity-70 flex items-center justify-center gap-2 mt-4 text-sm cursor-pointer"
                  >
                    {loading ? <Cpu className="animate-spin" /> : t('saveNewPassword')}
                  </button>
                </form>
              )
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1 text-left">
                  <label className="text-xs text-gray-400 font-bold uppercase ml-1">{t('username')}</label>
                  <div className="relative group">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold-500 transition" size={18} />
                      <input 
                        type="text" 
                        required
                        className="w-full bg-slate-800/50 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-gold-500 focus:outline-none focus:bg-slate-800 transition shadow-inner text-sm"
                        placeholder={t('username')}
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                      />
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-xs text-gray-400 font-bold uppercase ml-1">{t('password')}</label>
                  <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold-500 transition" size={18} />
                      <input 
                        type="password" 
                        required
                        className="w-full bg-slate-800/50 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-gold-500 focus:outline-none focus:bg-slate-800 transition shadow-inner text-sm"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                  </div>
                  <div className="text-right">
                      <button 
                        type="button" 
                        onClick={() => { setIsResetting(true); setError(''); setResetStep(1); }} 
                        className="text-[11px] text-gold-500 hover:text-gold-400 font-bold hover:underline bg-transparent border-none p-0 cursor-pointer"
                      >
                        {t('forgotPassword')}
                      </button>
                  </div>
                </div>

                {error && (
                    <div className="bg-red-900/20 border border-red-900/50 text-red-400 text-xs p-3 rounded flex items-center gap-2 animate-in slide-in-from-top-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                        {error}
                    </div>
                )}

                <button 
                  disabled={loading || isSyncing}
                  className="w-full bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-black font-bold py-3.5 rounded-lg transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 text-sm cursor-pointer"
                >
                  {loading ? (
                      <Cpu className="animate-spin" /> 
                  ) : (
                      t('authenticate')
                  )}
                </button>
              </form>
            )}

            {/* Collapsible Cloud Sync setup for dynamic devices monitoring */}
            <div className="border-t border-white/5 pt-4 mt-6">
              <button 
                type="button"
                onClick={() => setShowCloudSync(!showCloudSync)}
                className="w-full text-center flex items-center justify-center gap-1.5 text-[11px] text-gray-400 hover:text-gold-400 font-bold hover:underline transition cursor-pointer bg-transparent border-none p-0"
              >
                <Cloud size={13} className="text-gold-500" />
                {showCloudSync 
                  ? (language === 'en' ? "Hide Cloud Remote Link" : "ክላውድ ማመሳሰያ ቅጽ ደብቅ")
                  : (language === 'en' ? "Configure Cloud Remote Sync Link" : "ክላውድ ማመሳሰያ ቅጽ አሳይ")
                }
              </button>

              {showCloudSync && (
                <form onSubmit={handleCloudGatewaySync} className="mt-4 space-y-3 text-left animate-in slide-in-from-top-3 duration-300">
                  <div className="bg-gold-950/20 border border-gold-500/10 p-3 rounded text-[10px] text-gold-400 leading-normal flex gap-2">
                    <Info size={14} className="shrink-0 text-gold-400 mt-0.5" />
                    <span>
                      {language === 'en' 
                        ? "Configure GitHub repo synchronization to instantly pull custom credentials and live records upon browser entry on any mobile device."
                        : "በማንኛውም ስልክ ወይም ኮምፒውተር ላይ የደህንነት መለያዎችዎን ለማመሳሰል የ GitHub ግንኙነትን እዚህ ያዋቅሩ።"
                      }
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-500 uppercase font-mono">{t('githubPersonalToken')}</label>
                    <input 
                      required
                      type="password" 
                      placeholder="ghp_..."
                      value={ghToken}
                      onChange={e => setGhToken(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-gold-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-500 uppercase font-mono">{t('ownerOrganization')}</label>
                      <input 
                        required
                        type="text" 
                        placeholder="e.g. AirForceLogistics"
                        value={ghOwner}
                        onChange={e => setGhOwner(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-gold-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-500 uppercase font-mono">{t('repositoryName')}</label>
                      <input 
                        required
                        type="text" 
                        placeholder="e.g. arms-ledger"
                        value={ghRepo}
                        onChange={e => setGhRepo(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-gold-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-500 uppercase font-mono">{t('databaseFilePath')}</label>
                    <input 
                      required
                      type="text" 
                      value={ghPath}
                      onChange={e => setGhPath(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-gold-500"
                    />
                  </div>

                  {syncMessage.text && (
                    <div className={`p-2.5 rounded text-[10px] ${
                      syncMessage.type === 'success' ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400' :
                      syncMessage.type === 'error' ? 'bg-red-950/40 border border-red-500/30 text-red-400' :
                      'bg-sky-950/40 border border-sky-500/30 text-sky-400'
                    }`}>
                      {syncMessage.text}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded py-2 font-bold text-[10px] tracking-wider uppercase transition cursor-pointer"
                  >
                    {language === 'en' ? "TEST & SYNC CLOUD DATABASE" : "ግንኙነቱን ፈትሽ እና ክላውድ ዳታቤዝ አምጣ"}
                  </button>
                </form>
              )}
            </div>

            {/* Collapsible Secret Key Access block */}
            <div className="border-t border-white/5 pt-4 mt-4">
              <button 
                type="button"
                onClick={() => setShowSecretKeyAccess(!showSecretKeyAccess)}
                className="w-full text-center flex items-center justify-center gap-1.5 text-[11px] text-gray-400 hover:text-amber-400 font-bold hover:underline transition cursor-pointer bg-transparent border-none p-0"
              >
                <KeyRound size={13} className="text-amber-500" />
                {showSecretKeyAccess 
                  ? (language === 'en' ? "Hide Secret Key Access" : "የሚስጥር ቁልፍ መግቢያ ደብቅ")
                  : (language === 'en' ? "Access via Shared Secret Key" : "በተጋራ የሚስጥር ቁልፍ ግባ")
                }
              </button>

              {showSecretKeyAccess && (
                <div className="mt-4 space-y-3 text-left animate-in slide-in-from-top-3 duration-300">
                  <div className="bg-amber-950/20 border border-amber-500/10 p-3 rounded text-[10px] text-amber-400 leading-normal flex gap-2">
                    <Info size={14} className="shrink-0 text-amber-400 mt-0.5" />
                    <span>
                      {language === 'en' 
                        ? "Enter a shared Secret Key to search the cloud repository for authorized logistics records and view them in Read-Only mode."
                        : "የተፈቀደላቸውን የሎጅስቲክስ መዛግብት በክላውድ ሪፖዚቶሪ ውስጥ ለመፈለግ እና በንባብ-ብቻ እይታ ለመመልከት የተጋራ ሚስጥር ቁልፍ ያስገቡ።"
                      }
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-500 uppercase font-mono">{language === 'en' ? 'Secret Key' : 'የሚስጥር ቁልፍ'}</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. ARMS-ABCD-1234"
                      value={enteredSecretKey}
                      onChange={e => setEnteredSecretKey(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 text-[11px] text-white font-mono focus:outline-none focus:border-amber-500 uppercase"
                    />
                  </div>

                  {secretKeyMessage.text && (
                    <div className={`p-2.5 rounded text-[10px] ${
                      secretKeyMessage.type === 'success' ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400' :
                      secretKeyMessage.type === 'error' ? 'bg-red-950/40 border border-red-500/30 text-red-400' :
                      'bg-sky-950/40 border border-sky-500/30 text-sky-400'
                    }`}>
                      {secretKeyMessage.text}
                    </div>
                  )}

                  {matchingFiles.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-[9px] text-gray-500 uppercase font-mono">{language === 'en' ? 'Select Authorized File Ledger' : 'የተፈቀደለትን ፋይል ይምረጡ'}</label>
                      <div className="max-h-32 overflow-y-auto border border-white/10 rounded divide-y divide-white/5 bg-slate-950">
                        {matchingFiles.map((file, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSelectSecretFile(file)}
                            className="w-full text-left px-3 py-2 text-[10px] font-mono text-gray-300 hover:bg-white/5 hover:text-white transition flex justify-between items-center"
                          >
                            <span>{file}</span>
                            <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 rounded uppercase">{t('selectBadge')}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button 
                    type="button"
                    onClick={handleSearchSecretKey}
                    disabled={loading || !enteredSecretKey.trim()}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-black rounded py-2 font-bold text-[10px] tracking-wider uppercase transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? <Cpu className="animate-spin" size={12}/> : (language === 'en' ? "SEARCH AUTHORIZED LEDGERS" : "የተፈቀዱ መዛግብትን ፈልግ")}
                  </button>
                </div>
              )}
            </div>


            
            <div className="mt-6 text-center">
                <p className="text-[10px] text-gray-600 font-mono">
                    {t('restrictedAccess')}
                </p>
            </div>
         </div>
      </div>
    </div>
  );
};
