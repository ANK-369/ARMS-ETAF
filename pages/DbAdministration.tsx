import React, { useState, useEffect } from 'react';
import { getDB, saveDB, getStoredUsername, updateStoredCredentials, getStoredSecurityQuestion, updateSecurityQuestion, isNewUser, sha256 } from '../services/db';
import { getGitHubConfig, saveGitHubConfig, fetchFromGitHub, pushToGitHub, autoDetectGitHubPath } from '../services/githubService';
import { downloadFile, parseImportFile } from '../services/dataTransfer';
import { AppData, GitHubConfig } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';
import CustomSelect from '../components/CustomSelect';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Trash2, Settings, X, Download, Upload, Database, 
  AlertTriangle, CheckCircle, Save, CheckSquare, Square, Eye, 
  Github, Cloud, RefreshCw, Link, Eraser, Lock, EyeOff, KeyRound, Cpu, Copy 
} from 'lucide-react';

const DbAdministration: React.FC = () => {
    // ... Database manage code identical to before ...
    const { t, language } = useLanguage();
    const [activeSection, setActiveSection] = useState<'sync_backup' | 'access_ai' | 'fresh_danger'>('sync_backup');
    const [msg, setMsg] = useState('');
    const [error, setError] = useState(false);
    const [selectedToDelete, setSelectedToDelete] = useState<string[]>([]);
    const [showWipeConfirm, setShowWipeConfirm] = useState(false);
    
    // GitHub State
    const [ghConfig, setGhConfig] = useState<GitHubConfig>({ token: '', owner: '', repo: '', path: 'arms_db.json', enabled: false });
    const [initialConfig, setInitialConfig] = useState<GitHubConfig | null>(null);
    const [ghLoading, setGhLoading] = useState(false);

    // Path Input Local State (prevents overwriting custom edits mid-typing)
    const [pathInput, setPathInput] = useState<string>('');

    // Popup Credential Proving Section States
    const [showProvingModal, setShowProvingModal] = useState<boolean>(false);
    const [provingPath, setProvingPath] = useState<string>('');
    const [provingPassword, setProvingPassword] = useState<string>('');
    const [provingError, setProvingError] = useState<string>('');
    const [provingLoading, setProvingLoading] = useState<boolean>(false);
    const [remoteDbData, setRemoteDbData] = useState<any>(null);

    // Secure Credentials State
    const [adminUsername, setAdminUsername] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
    const [securityQuestion, setSecurityQuestion] = useState('');
    const [securityAnswer, setSecurityAnswer] = useState('');
    
    // Gemini API Key State
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [showGeminiKey, setShowGeminiKey] = useState(false);
    const [testingGemini, setTestingGemini] = useState(false);
    const [geminiTestResult, setGeminiTestResult] = useState<{success: boolean, msg: string} | null>(null);

    // Secret Key State
    const [secretKey, setSecretKey] = useState('');
    const [isGeneratedKey, setIsGeneratedKey] = useState<boolean>(false);

    // Custom verify path modals
    const [pathVerificationState, setPathVerificationState] = useState<{
        isOpen: boolean;
        type: 'confirmCreate' | 'confirmImport';
        targetPath: string;
        remoteDbData?: AppData | null;
    }>({
        isOpen: false,
        type: 'confirmCreate',
        targetPath: '',
    });

    const executeCreateCustomPath = async (tPath: string) => {
        setPathVerificationState(prev => ({ ...prev, isOpen: false }));
        setGhLoading(true);
        setMsg(language === 'en' ? "Creating new custom path on GitHub..." : "አዲስ የፋይል መንገድ GitHub ላይ በመፍጠር ላይ...");
        
        try {
            const currentDb = getDB();
            // Force save currentDb locally to this new path
            const updated = { ...ghConfig, path: tPath, enabled: true };
            saveGitHubConfig(updated);
            setGhConfig(updated);
            setInitialConfig(updated);
            
            // Backup current data to this path
            const res = await pushToGitHub(currentDb, tPath, true);
            if (res.success) {
                setMsg(language === 'en' ? "Custom file path saved successfully!" : "የመረጡት የፋይል መንገድ በተሳካ ሁኔታ ተቀምጧል!");
                setError(false);
                setTimeout(() => window.location.reload(), 1500);
            } else {
                setMsg(res.error || "Failed to push initial backup.");
                setError(true);
            }
        } catch (err: any) {
            setMsg(err.message || "Failed to create path.");
            setError(true);
        } finally {
            setGhLoading(false);
        }
    };

    const handleCancelCreateCustomPath = () => {
        setPathVerificationState(prev => ({ ...prev, isOpen: false }));
        setPathInput(ghConfig.path);
    };

    const executeImportUnsecuredData = (remoteData: AppData, tPath: string) => {
        setPathVerificationState(prev => ({ ...prev, isOpen: false }));
        
        const updated = { ...ghConfig, path: tPath, enabled: true };
        saveGitHubConfig(updated);
        setGhConfig(updated);
        setInitialConfig(updated);
        
        saveDB(remoteData, true);
        
        setMsg(language === 'en' ? "Data retrieved and loaded successfully!" : "ክላውድ ዳታው በትክክል ተጭኗል!");
        setError(false);
        setTimeout(() => window.location.reload(), 1500);
    };

    const handleCancelImport = () => {
        setPathVerificationState(prev => ({ ...prev, isOpen: false }));
        setPathInput(ghConfig.path);
    };

    // Confirm Dialog States
    const [showFreshStartConfirm, setShowFreshStartConfirm] = useState(false);
    const [showFactoryResetConfirm, setShowFactoryResetConfirm] = useState(false);

    useEffect(() => {
        const conf = getGitHubConfig();
        setGhConfig(conf);
        setInitialConfig(conf);
        setPathInput(conf.path || 'arms_db.json');
        setAdminUsername(getStoredUsername());
        setGeminiApiKey(localStorage.getItem('arms_gemini_api_key') || '');
        setSecurityQuestion(getStoredSecurityQuestion());

        // Read pending key first if it exists, otherwise read session or saved key from database
        const pendingKey = localStorage.getItem('arms_pending_secret_key');
        const pendingIsGen = localStorage.getItem('arms_pending_is_generated') === 'true';
        if (pendingKey !== null) {
            setSecretKey(pendingKey);
            setIsGeneratedKey(pendingIsGen);
        } else {
            const sessionKey = sessionStorage.getItem('arms_session_secret_key');
            const readonlyKey = localStorage.getItem('arms_readonly_secret_key');
            const originalKey = localStorage.getItem('arms_original_secret_key') || getDB().securityCredentials?.secretKey || getDB().secretKey || '';
            setSecretKey(sessionKey || readonlyKey || originalKey);
            setIsGeneratedKey(false);
        }
    }, []);

    // Sync local path input when config path changes from elsewhere
    useEffect(() => {
        if (ghConfig.path) {
            setPathInput(ghConfig.path);
        }
    }, [ghConfig.path]);

    // Auto-detect and populate GitHub File Path when Owner, Repo, and Token are entered/modified
    useEffect(() => {
        if (!initialConfig) return; // Prevent overwriting on initial mount before config is set

        const { owner, repo, token } = ghConfig;
        if (!owner || !repo || !token) return;

        // Skip if credentials match the initially loaded config to avoid overwriting saved state on mount
        if (initialConfig &&
            owner === initialConfig.owner &&
            repo === initialConfig.repo &&
            token === initialConfig.token) {
            return;
        }

        let isActive = true;

        const timer = setTimeout(async () => {
            setGhLoading(true);
            setMsg(language === 'en' ? "Auto-detecting next available file path from GitHub..." : "የሚቀጥለውን የክላውድ ፋይል መንገድ በራስ-ሰር በመፈለግ ላይ...");
            setError(false);
            try {
                const detectedPath = await autoDetectGitHubPath(owner, repo, token);
                if (!isActive) return;
                
                setPathInput(detectedPath);
                setGhConfig(prev => {
                    const updated = {
                        ...prev,
                        owner,
                        repo,
                        token,
                        path: detectedPath,
                    };
                    return updated;
                });
                
                setMsg(language === 'en' 
                  ? `Next sequential file path auto-resolved: ${detectedPath}` 
                  : `የሚቀጥለው የክላውድ ፋይል መንገድ በራስ-ሰር ተገኝቷል፦ ${detectedPath}`
                );
                setError(false);
            } catch (err: any) {
                console.error("Auto-resolve failed:", err);
            } finally {
                if (isActive) {
                    setGhLoading(false);
                    setTimeout(() => setMsg(''), 4000);
                }
            }
        }, 1200); // Debounce to allow seamless typing

        return () => {
            isActive = false;
            clearTimeout(timer);
        };
    }, [ghConfig.owner, ghConfig.repo, ghConfig.token, initialConfig]);

    const handleUpdateCredentials = async () => {
        if (!adminUsername.trim()) {
            setMsg("Username cannot be empty");
            setError(true);
            return;
        }
        
        if (adminPassword && adminPassword !== adminPasswordConfirm) {
            setMsg("Passwords do not match");
            setError(true);
            return;
        }
        
        try {
            await updateStoredCredentials(adminUsername.trim(), adminPassword || undefined);
            if (securityQuestion.trim() && securityAnswer.trim()) {
                updateSecurityQuestion(securityQuestion.trim(), securityAnswer.trim());
            }
            
            // Auto logout trigger
            setMsg(language === 'am' 
                ? "መግቢያው በትክክል ተቀይሯል። አዲሱን መረጃ ለማንቀሳቀስ እባክዎ እንደገና ይግቡ..." 
                : "Credentials updated successfully. Logging out to apply changes...");
            setError(false);
            setAdminPassword('');
            setAdminPasswordConfirm('');
            setSecurityAnswer('');
            
            setTimeout(() => {
                localStorage.removeItem("arms_auth");
                localStorage.removeItem("arms_auth_role");
                window.location.reload();
            }, 1800);
        } catch (err) {
            console.error("Failed to update credentials:", err);
            setMsg("Failed to save credentials");
            setError(true);
        }
    };
    
    const handleSaveGeminiKey = () => {
        const trimmed = geminiApiKey.trim();
        if (trimmed) {
            localStorage.setItem('arms_gemini_api_key', trimmed);
            setMsg("Gemini API Key Saved Successfully");
        } else {
            localStorage.removeItem('arms_gemini_api_key');
            setMsg("Gemini API Key Cleared (reverted to system default)");
        }
        setError(false);
        setTimeout(() => setMsg(''), 3000);
    };

    const handleGenerateSecretKey = () => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = 'ARMS-';
        for (let i = 0; i < 4; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        result += '-';
        for (let i = 0; i < 4; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        setSecretKey(result);
        setIsGeneratedKey(true);
        localStorage.setItem('arms_pending_secret_key', result);
        localStorage.setItem('arms_pending_is_generated', 'true');
        setMsg(language === 'en' ? "New Secret Key generated. Click Save Key to write to database." : "አዲስ የሚስጥር ቁልፍ ተፈጥሯል። ወደ ዳታቤዝ ለመፃፍ 'ቁልፉን አስቀምጥ' የሚለውን ይጫኑ።");
        setError(false);
        setTimeout(() => setMsg(''), 4000);
    };

    const handleSaveSecretKey = async () => {
        const trimmed = secretKey.trim();

        // Clear pending states since we're saving
        localStorage.removeItem('arms_pending_secret_key');
        localStorage.removeItem('arms_pending_is_generated');

        const wasGenerated = isGeneratedKey || localStorage.getItem('arms_pending_is_generated') === 'true';

        if (wasGenerated) {
            setGhLoading(true);
            setMsg(language === 'en' ? "Saving permanent Secret Key to GitHub..." : "ቋሚ የሚስጥር ቁልፍ ወደ GitHub በመጫን ላይ...");
            setError(false);

            // Update AppData and save/push to GitHub (current file path)
            const currentDb = getDB();
            currentDb.secretKey = trimmed || undefined;
            if (!currentDb.securityCredentials) {
                currentDb.securityCredentials = {};
            }
            currentDb.securityCredentials.secretKey = trimmed || undefined;
            
            // 1. Save the generated Secret Key inside the CURRENT ACTIVE local DB (skip background sync)
            saveDB(currentDb, true);

            if (ghConfig.enabled && ghConfig.owner && ghConfig.repo && ghConfig.token) {
                try {
                    const targetPath = pathInput || ghConfig.path;
                    // 2. Upload the updated JSON file back to GitHub
                    const pushResult = await pushToGitHub(currentDb, targetPath, true);
                    if (pushResult.success) {
                        if (trimmed) {
                            localStorage.setItem('arms_secret_key', trimmed);
                            localStorage.setItem('arms_original_secret_key', trimmed);
                            sessionStorage.removeItem('arms_session_secret_key');
                            localStorage.removeItem('arms_readonly_secret_key');
                        } else {
                            localStorage.removeItem('arms_secret_key');
                            localStorage.removeItem('arms_original_secret_key');
                            localStorage.removeItem('arms_readonly_secret_key');
                        }

                        window.dispatchEvent(new Event('arms_readonly_update'));

                        // 3. Confirm that the Secret Key has been permanently saved
                        setMsg(language === 'en' 
                            ? "Secret Key permanently saved to GitHub & dataset updated successfully!" 
                            : "የሚስጥር ቁልፍ በGitHub ላይ ተቀምጧል እና መረጃው በስኬት ተጭኗል!"
                        );
                        setError(false);
                        setIsGeneratedKey(false);

                        // Trigger a page reload after a short delay for complete UI synchronization
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    } else {
                        throw new Error(pushResult.error || "GitHub push failed");
                    }
                } catch (e: any) {
                    console.error("Failed to push generated key to GitHub:", e);
                    setMsg(language === 'en' ? `Error: ${e.message || e}` : `ስህተት፦ ${e.message || e}`);
                    setError(true);
                } finally {
                    setGhLoading(false);
                }
            } else {
                setMsg(language === 'en' ? "GitHub Sync is not configured. Saved locally." : "GitHub አልተዋቀረም። በኮምፒውተርዎ ላይ ብቻ ተቀምጧል።");
                setError(true);
                setGhLoading(false);
            }
        } else {
            // Manually entered: do NOT update currentDb or upload to GitHub.
            if (trimmed) {
                sessionStorage.setItem('arms_session_secret_key', trimmed);
                localStorage.setItem('arms_readonly_secret_key', trimmed);
                localStorage.setItem('arms_secret_key', trimmed);
                window.dispatchEvent(new Event('arms_readonly_update'));
                setMsg(language === 'en' ? "Secret Key saved for viewing datasets matching this key!" : "የሚስጥር ቁልፍ ተቀምጧል!");
            } else {
                sessionStorage.removeItem('arms_session_secret_key');
                localStorage.removeItem('arms_readonly_secret_key');
                
                const originalKey = localStorage.getItem('arms_original_secret_key') || getDB().securityCredentials?.secretKey || getDB().secretKey || '';
                if (originalKey) {
                    setSecretKey(originalKey);
                    localStorage.setItem('arms_secret_key', originalKey);
                    window.dispatchEvent(new Event('arms_readonly_update'));
                    setMsg(language === 'en' ? "Manually entered key removed. Restored your original secret key." : "ጊዜያዊ ቁልፍ ተሰርዟል። የመጀመሪያው ቁልፍዎ ተመልሷል።");
                } else {
                    setSecretKey('');
                    localStorage.removeItem('arms_secret_key');
                    window.dispatchEvent(new Event('arms_readonly_update'));
                    setMsg(language === 'en' ? "Secret Key cleared." : "የሚስጥር ቁልፍ ተሰርዟል።");
                }
            }
            setError(false);
        }

        setTimeout(() => setMsg(''), 4000);
        setIsGeneratedKey(false);
    };
    
    const handleTestGemini = async () => {
        setTestingGemini(true);
        setGeminiTestResult(null);
        try {
            const { analyzeData } = await import('../services/geminiService');
            const result = await analyzeData("Respond with exactly the word 'OK'.", "[]", language, geminiApiKey, true);
            if (result && result.toUpperCase().includes("OK")) {
                setGeminiTestResult({ success: true, msg: "Connection successful! Gemini response: " + result });
            } else if (result && result.includes("Error connecting")) {
                setGeminiTestResult({ success: false, msg: result });
            } else {
                setGeminiTestResult({ success: true, msg: "Connected, but response: " + result });
            }
        } catch (err: any) {
            setGeminiTestResult({ success: false, msg: err.message || "Failed to connect to Gemini API." });
        } finally {
            setTestingGemini(false);
        }
    };

    const handleVerifyAndConnectPath = async (targetPath: string) => {
        if (!targetPath.trim()) {
            setMsg(language === 'en' ? "Please enter a valid path." : "እባክዎ ትክክለኛ የፋይል መንገድ ያስገቡ።");
            setError(true);
            return;
        }
        
        setGhLoading(true);
        setMsg(language === 'en' ? "Checking remote file..." : "ክላውድ ላይ ያለውን ፋይል በመፈተሽ ላይ...");
        setError(false);
        
        try {
            // Fetch file directly using fetchFromGitHub(targetPath, true)
            const { data, error, sha } = await fetchFromGitHub(targetPath, true);
            
            if (error) {
                // If there's an error (connection or repository level), display it
                setMsg(language === 'en' ? `Connection failed: ${error}` : `መገናኘት አልተሳካም፦ ${error}`);
                setError(true);
                return;
            }
            
            // File does not exist yet on GitHub (new custom path)
            if (!data) {
                setGhLoading(false);
                setPathVerificationState({
                    isOpen: true,
                    type: 'confirmCreate',
                    targetPath
                });
                return;
            }
            
            // File exists!
            if (data.securityCredentials && (data.securityCredentials.adminPasswordHash || data.securityCredentials.userPasswordHash)) {
                // Credentials found! Trigger the Proving popup.
                setProvingPath(targetPath);
                setRemoteDbData(data);
                setProvingPassword('');
                setProvingError('');
                setShowProvingModal(true);
            } else {
                // No credentials found, pull the data immediately!
                setGhLoading(false);
                setPathVerificationState({
                    isOpen: true,
                    type: 'confirmImport',
                    targetPath,
                    remoteDbData: data
                });
            }
        } catch (err: any) {
            setMsg(language === 'en' ? `Connection failed: ${err.message || err}` : `መገናኘት አልተሳካም፦ ${err.message || err}`);
            setError(true);
        } finally {
            setGhLoading(false);
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
                
                // Load and pull data
                saveDB(remoteDbData, true);
                
                setMsg(language === 'en' 
                    ? "Credentials successfully verified! Loaded remote database." 
                    : "መግቢያው በትክክል ተረጋግጧል! የክላውድ መረጃው ተጭኗል።"
                );
                setError(false);
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

    const saveGhConfig = async () => {
        if (pathInput !== ghConfig.path) {
            await handleVerifyAndConnectPath(pathInput);
            return;
        }
        saveGitHubConfig(ghConfig);
        setMsg("GitHub Configuration Saved");
        setError(false);
        setTimeout(() => setMsg(''), 3000);
    };

    const handleSyncNow = async () => {
        setGhLoading(true);
        let targetPath = pathInput;
        if (pathInput !== ghConfig.path) {
            await handleVerifyAndConnectPath(pathInput);
            return;
        }
        const { data, error } = await fetchFromGitHub(targetPath, true);
        if (data) {
            saveDB(data, true); 
            setMsg(t('restoreSuccess'));
            setError(false);
            setTimeout(() => window.location.reload(), 1500);
        } else {
            setMsg(error || t('githubError'));
            setError(true);
        }
        setGhLoading(false);
    };

    const handleBackupNow = async () => {
        setGhLoading(true);
        const db = getDB();
        
        let targetPath = pathInput;
        if (pathInput !== ghConfig.path) {
            const updated = { ...ghConfig, path: pathInput };
            saveGitHubConfig(updated);
            setGhConfig(updated);
        }
        
        const res = await pushToGitHub(db, targetPath, true);
        if (res.success) {
            setMsg("Backup uploaded to GitHub successfully.");
            setError(false);
        } else {
            setMsg(res.error || "Backup failed.");
            setError(true);
        }
        setGhLoading(false);
        setTimeout(() => setMsg(''), 3000);
    };

    const executeFreshStart = async () => {
        setShowFreshStartConfirm(false);
        setGhLoading(true);
        setMsg(language === 'en' ? "Performing Fresh Start..." : "አዲስ ጅምር በማከናወን ላይ...");

        try {
            // 1. Clear all browser storage used by the application
            localStorage.clear();
            sessionStorage.clear();

            setMsg(language === 'en' 
                ? "Fresh start complete! Redirecting to login..." 
                : "አዲስ ጅምር በተሳካ ሁኔታ ተጠናቋል! ወደ መግቢያ ገጽ በመቀየር ላይ..."
            );
            setError(false);

            setTimeout(() => {
                window.location.href = '/#/login';
                window.location.reload();
            }, 1500);
        } catch (err: any) {
            setMsg(err.message || String(err));
            setError(true);
            setGhLoading(false);
        }
    };

    const handleFreshStart = () => {
        setShowFreshStartConfirm(true);
    };

    const handleBackup = () => {
        const db = getDB();
        const filename = `ARMS_FULL_BACKUP_${new Date().toISOString().split('T')[0]}`;
        downloadFile(JSON.stringify(db, null, 2), filename, 'json');
        setMsg(t('backupSuccess'));
        setError(false);
        setTimeout(() => setMsg(''), 3000);
    };

    const handleRestoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        parseImportFile(file, (json) => {
            if (json && typeof json === 'object') {
                saveDB(json as AppData, true);
                window.location.reload();
            } else {
                setMsg(t('invalidBackup'));
                setError(true);
            }
        });
    };

    const handleWipe = () => {
        if (selectedToDelete.length === 0) return;
        
        const db = getDB();
        // @ts-ignore
        selectedToDelete.forEach(key => db[key] = []);
        
        saveDB(db);
        setSelectedToDelete([]);
        setShowWipeConfirm(false);
        setMsg(t('recordDeleted'));
        setError(false);
        setTimeout(() => window.location.reload(), 1500);
    };

    const toggleDeleteSelection = (key: string) => {
        if (selectedToDelete.includes(key)) {
            setSelectedToDelete(selectedToDelete.filter(k => k !== key));
        } else {
            setSelectedToDelete([...selectedToDelete, key]);
        }
    };

    const dbKeys: {key: keyof AppData, label: string}[] = [
        { key: 'manpower', label: t('db_manpower') },
        { key: 'incomeItems', label: t('db_incomeItems') },
        { key: 'subsidies', label: t('db_subsidies') },
        { key: 'transfers', label: t('db_transfers') },
        { key: 'expenses', label: t('db_expenses') },
        { key: 'refunds', label: t('db_refunds') },
        { key: 'storeItems', label: t('db_storeItems') },
        { key: 'storeOrders', label: t('db_storeOrders') },
        { key: 'notes', label: t('db_notes') },
        { key: 'foodProgramArchive', label: t('db_foodProgramArchive') }
    ];

    const sectionOptions = [
        { 
            value: 'sync_backup', 
            label: language === 'am' 
                ? 'GitHub ክላውድ ማመሳሰል እና ዳታ ማደስ/መጠባበቂያ' 
                : 'GitHub Cloud Sync and System Backup & Restore Data' 
        },
        { 
            value: 'access_ai', 
            label: language === 'am' 
                ? 'የስርዓት መግቢያ እና AI ማዋቀሪያ' 
                : 'System Access and AI Configuration' 
        },
        { 
            value: 'fresh_danger', 
            label: language === 'am' 
                ? 'ስርዓቱን አዲስ ጅምር ማድረግ እና አደገኛ ዞን' 
                : 'System Fresh Start and Danger Zone' 
        }
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8 p-6 md:p-12 overflow-y-auto h-full pb-32">
            <h3 className="text-3xl font-bold text-gold-500 border-b border-gray-700 pb-4 mb-4 flex items-center gap-3"><Database size={32}/> {t('dbAdministration')}</h3>
            
            {/* Section Dropdown Menu Selector */}
            <div className="space-y-3 mb-6 bg-slate-900/90 p-4 rounded-xl border border-gray-700 shadow-xl">
                <label className="text-xs font-bold text-gold-500 uppercase tracking-widest block flex items-center gap-2">
                    <Settings size={14}/> {language === 'am' ? 'የዳታቤዝ አስተዳደር ክፍል ይምረጡ' : 'Select Database Administration Section'}
                </label>
                
                {/* Dropdown Select */}
                <CustomSelect 
                    value={activeSection}
                    onChange={(val) => setActiveSection(val as any)}
                    options={sectionOptions}
                    className="w-full font-bold text-sm md:text-base"
                />

                {/* Quick Tab Buttons */}
                <div className="hidden md:flex space-x-2 border-t border-gray-800 pt-3 mt-1">
                    {sectionOptions.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setActiveSection(opt.value as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold uppercase text-xs tracking-wider transition-all duration-200 cursor-pointer ${
                                activeSection === opt.value
                                    ? 'bg-gold-500 text-black shadow-md'
                                    : 'bg-slate-800/80 text-gray-400 hover:text-white hover:bg-slate-700'
                            }`}
                        >
                            {opt.value === 'sync_backup' && <Cloud size={16} />}
                            {opt.value === 'access_ai' && <Settings size={16} />}
                            {opt.value === 'fresh_danger' && <AlertTriangle size={16} />}
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {msg && (
                <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-lg ${error ? 'bg-red-900/50 border-red-500 text-red-200' : 'bg-green-900/50 border-green-500 text-green-200'}`}>
                    {error ? <AlertTriangle size={24} /> : <CheckCircle size={24} />} 
                    <span className="font-bold">{msg}</span>
                </div>
            )}

            {/* SECTION 1: GitHub Cloud Sync and System Backup & Restore Data */}
            {activeSection === 'sync_backup' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="bg-slate-900 p-8 rounded-2xl border border-purple-500/30 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Github size={150}/></div>
                        <div className="flex items-center gap-4 mb-6 relative z-10">
                            <div className="h-14 w-14 bg-purple-900/50 rounded-full flex items-center justify-center text-purple-400"><Cloud size={28}/></div>
                            <div>
                                 <h4 className="text-2xl font-bold text-white">{t('githubSync')}</h4>
                                 <p className="text-xs text-purple-400 font-bold uppercase tracking-wider">{t('githubDesc')}</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-6 mb-6 relative z-10">
                            <div>
                                <label className="text-xs text-gray-400 uppercase font-bold block mb-1">{t('repoOwner')}</label>
                                <input className="w-full bg-black/40 border border-gray-600 rounded p-3 text-white" value={ghConfig.owner} onChange={e => setGhConfig({...ghConfig, owner: e.target.value})} placeholder={t('egUsername')}/>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 uppercase font-bold block mb-1">{t('repoName')}</label>
                                <input className="w-full bg-black/40 border border-gray-600 rounded p-3 text-white" value={ghConfig.repo} onChange={e => setGhConfig({...ghConfig, repo: e.target.value})} placeholder={t('egRepoName')} />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 uppercase font-bold block mb-1">{t('filePath')}</label>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input 
                                        className="w-full sm:flex-1 min-w-0 bg-black/40 border border-gray-600 rounded p-3 text-white font-mono" 
                                        value={pathInput} 
                                        onChange={e => setPathInput(e.target.value)} 
                                        placeholder={t('egFolderFile')}
                                    />
                                    {pathInput !== ghConfig.path && (
                                        <button
                                            type="button"
                                            onClick={() => handleVerifyAndConnectPath(pathInput)}
                                            className="w-full sm:w-auto px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold text-xs transition uppercase flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                                            title={t('verifyConnectTooltip')}
                                        >
                                            <Link size={14} />
                                            {language === 'en' ? "Verify & Connect" : "አረጋግጥና አገናኝ"}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 uppercase font-bold block mb-1">{t('patToken')}</label>
                                <input type="password" className="w-full bg-black/40 border border-gray-600 rounded p-3 text-white" value={ghConfig.token} onChange={e => setGhConfig({...ghConfig, token: e.target.value})} placeholder="ghp_..." />
                            </div>
                        </div>
                        <div className="flex items-center gap-4 mb-6 relative z-10">
                            <label className="flex items-center gap-2 cursor-pointer bg-black/30 p-2 rounded border border-gray-700">
                                <input type="checkbox" className="w-5 h-5 rounded accent-purple-500" checked={ghConfig.enabled} onChange={e => setGhConfig({...ghConfig, enabled: e.target.checked})} />
                                <span className="text-white font-bold text-sm">{t('syncEnabled')}</span>
                            </label>
                        </div>
                        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 relative z-10 w-full">
                            <button onClick={saveGhConfig} className="bg-slate-800 hover:bg-slate-700 border border-gray-600 text-white font-bold py-2 px-4 md:py-3 md:px-6 rounded-lg transition shadow-lg text-xs md:text-sm">{t('save')}</button>
                            <button onClick={handleBackupNow} disabled={ghLoading || !ghConfig.enabled} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 md:py-3 md:px-6 rounded-lg transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 text-xs md:text-sm">
                                {ghLoading ? <RefreshCw className="animate-spin" size={16}/> : <Upload size={16}/>}
                                {t('backup')} {t('nowLabel')}
                            </button>
                            <button onClick={handleSyncNow} disabled={ghLoading || !ghConfig.enabled} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 md:py-3 md:px-6 rounded-lg transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 text-xs md:text-sm">
                                {ghLoading ? <RefreshCw className="animate-spin" size={16}/> : <Download size={16}/>}
                                {t('restore')} {t('nowLabel')}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-military-800 p-8 rounded-2xl border-l-8 border-green-500 shadow-2xl flex flex-col hover:bg-military-700 transition group">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="h-14 w-14 bg-green-900/50 rounded-full flex items-center justify-center text-green-400 group-hover:scale-110 transition"><Download size={28}/></div>
                                <div>
                                     <h4 className="text-2xl font-bold text-white">{t('systemBackup')}</h4>
                                     <p className="text-xs text-green-400 font-bold uppercase tracking-wider">{t('safeZone')}</p>
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm mb-8 flex-1 leading-relaxed">{t('backupDesc')}</p>
                            <button onClick={handleBackup} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 md:py-4 rounded-lg transition shadow-lg flex items-center justify-center gap-2 text-xs md:text-sm">
                                <Download size={18}/> {t('downloadBackup')}
                            </button>
                        </div>

                        <div className="bg-military-800 p-8 rounded-2xl border-l-8 border-blue-500 shadow-2xl flex flex-col hover:bg-military-700 transition group">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="h-14 w-14 bg-blue-900/50 rounded-full flex items-center justify-center text-blue-400 group-hover:scale-110 transition"><Upload size={28}/></div>
                                <div>
                                     <h4 className="text-2xl font-bold text-white">{t('restoreData')}</h4>
                                     <p className="text-xs text-blue-400 font-bold uppercase tracking-wider">{t('overwriteMode')}</p>
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm mb-8 flex-1 leading-relaxed">{t('restoreDesc')}</p>
                            <label className="w-full block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 md:py-4 rounded-lg text-center cursor-pointer transition shadow-lg flex items-center justify-center gap-2 text-xs md:text-sm">
                                <Upload size={18}/> {t('selectBackup')}
                                <input type="file" accept=".json" className="hidden" onChange={handleRestoreChange} />
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION 2: System Access and AI Configuration */}
            {activeSection === 'access_ai' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="bg-slate-900 border border-military-600 p-8 rounded-2xl shadow-2xl space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><KeyRound size={150}/></div>
                        
                        <h4 className="text-2xl font-bold text-gold-500 border-b border-military-700 pb-3 flex items-center gap-3 relative z-10">
                            <Settings size={28}/> {t('systemAccessAndAiConfig')}
                        </h4>
                        
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-8 relative z-10">
                            {/* Username & Password */}
                            <div className="space-y-4 bg-black/20 p-6 rounded-xl border border-military-700">
                                <h5 className="text-lg font-bold text-white flex items-center gap-2"><Lock size={18} className="text-gold-500"/> {t('changeAdminCredentials')}</h5>
                                <p className="text-xs text-gray-400">{t('updateAccessParams')}</p>
                                
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-gray-400 uppercase font-bold block mb-1">{t('username')}</label>
                                        <input 
                                            className="w-full bg-slate-950 border border-gray-600 rounded p-3 text-white font-mono focus:border-gold-500 outline-none transition" 
                                            value={adminUsername} 
                                            onChange={e => setAdminUsername(e.target.value)} 
                                            placeholder={t('username')}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 uppercase font-bold block mb-1">{t('newPasswordLabel')}</label>
                                        <input 
                                            type="password" 
                                            className="w-full bg-slate-950 border border-gray-600 rounded p-3 text-white font-mono focus:border-gold-500 outline-none transition" 
                                            value={adminPassword} 
                                            onChange={e => setAdminPassword(e.target.value)} 
                                            placeholder={t('leaveEmptyKeepCurrent')}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 uppercase font-bold block mb-1">{t('confirmNewPasswordLabel')}</label>
                                        <input 
                                            type="password" 
                                            className="w-full bg-slate-950 border border-gray-600 rounded p-3 text-white font-mono focus:border-gold-500 outline-none transition" 
                                            value={adminPasswordConfirm} 
                                            onChange={e => setAdminPasswordConfirm(e.target.value)} 
                                            placeholder={t('confirmNewPasswordLabel')}
                                        />
                                    </div>
                                    <div className="border-t border-slate-800 pt-3 mt-3">
                                        <label className="text-xs text-gray-400 uppercase font-bold block mb-1">{t('securityRecoveryQuestion')}</label>
                                        <input 
                                            className="w-full bg-slate-950 border border-gray-600 rounded p-3 text-white focus:border-gold-500 outline-none transition text-sm" 
                                            value={securityQuestion} 
                                            onChange={e => setSecurityQuestion(e.target.value)} 
                                            placeholder={t('recoveryQuestionPlaceholder')}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 uppercase font-bold block mb-1">{t('recoveryAnswer')}</label>
                                        <input 
                                            type="password" 
                                            className="w-full bg-slate-950 border border-gray-600 rounded p-3 text-white focus:border-gold-500 outline-none transition text-sm font-mono" 
                                            value={securityAnswer} 
                                            onChange={e => setSecurityAnswer(e.target.value)} 
                                            placeholder={t('updateRecoveryAnswerPlaceholder')}
                                        />
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={handleUpdateCredentials}
                                    className="w-full bg-gold-500 hover:bg-gold-600 text-black font-bold py-2.5 md:py-3 px-4 md:px-6 rounded-lg transition shadow-lg flex items-center justify-center gap-2 text-xs md:text-sm"
                                >
                                    <Save size={14}/> {t('updateAccessCredentials')}
                                </button>
                            </div>

                            {/* Gemini API Key */}
                            <div className="space-y-4 bg-black/20 p-6 rounded-xl border border-military-700 flex flex-col justify-between">
                                <div>
                                    <h5 className="text-lg font-bold text-white flex items-center gap-2"><Cpu size={18} className="text-purple-500"/> {t('geminiAiEngineApiKey')}</h5>
                                    <p className="text-xs text-gray-400">{t('geminiApiKeyDesc')}</p>
                                    
                                    <div className="mt-4 space-y-3">
                                        <div>
                                            <label className="text-xs text-gray-400 uppercase font-bold block mb-1">{t('geminiApiKeyLabel')}</label>
                                            <div className="relative">
                                                <input 
                                                    type={showGeminiKey ? "text" : "password"} 
                                                    className="w-full bg-slate-950 border border-gray-600 rounded p-3 pr-12 text-white font-mono focus:border-purple-500 outline-none transition" 
                                                    value={geminiApiKey} 
                                                    onChange={e => setGeminiApiKey(e.target.value)} 
                                                    placeholder={t('geminiApiKeyPlaceholder')}
                                                />
                                                <button 
                                                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                                                    className="absolute right-3 top-3 text-gray-400 hover:text-white transition"
                                                >
                                                    {showGeminiKey ? <EyeOff size={18}/> : <Eye size={18}/>}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-3 mt-4">
                                    {geminiTestResult && (
                                        <div className={`p-3 rounded border text-xs font-mono flex items-center gap-2 ${geminiTestResult.success ? 'bg-green-950/40 border-green-700/50 text-green-400' : 'bg-red-950/40 border-red-700/50 text-red-400'}`}>
                                            {geminiTestResult.success ? <CheckCircle size={14}/> : <AlertTriangle size={14}/>}
                                            <span className="flex-1">{geminiTestResult.msg}</span>
                                        </div>
                                    )}
                                    
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button 
                                            onClick={handleSaveGeminiKey}
                                            className="w-full sm:flex-1 min-w-0 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 md:py-3 px-4 md:px-6 rounded-lg transition shadow-lg flex items-center justify-center gap-2 text-xs md:text-sm text-center"
                                        >
                                            <Save size={14}/> {t('saveApiKey')}
                                        </button>
                                        <button 
                                            onClick={handleTestGemini}
                                            disabled={testingGemini}
                                            className="w-full sm:flex-1 min-w-0 bg-slate-800 hover:bg-slate-700 border border-gray-600 text-purple-300 font-bold py-2.5 md:py-3 px-3 md:px-4 rounded-lg transition shadow-lg flex items-center justify-center gap-2 text-xs md:text-sm disabled:opacity-50 text-center"
                                            title={t('sendTestMessageTooltip')}
                                        >
                                            {testingGemini ? <RefreshCw className="animate-spin" size={14}/> : <Cpu size={14}/>}
                                            {t('testCore')}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Secret Key Sharing */}
                            <div className="space-y-4 bg-black/20 p-6 rounded-xl border border-military-700 flex flex-col justify-between">
                                <div>
                                    <h5 className="text-lg font-bold text-white flex items-center gap-2"><KeyRound size={18} className="text-amber-500"/> {language === 'en' ? 'Secret Key Sharing' : 'የሚስጥር ቁልፍ ማጋራት'}</h5>
                                    <p className="text-xs text-gray-400">
                                        {language === 'en' 
                                            ? 'Generate a unique secret key to share secure, read-only dashboard views of your logistics records.' 
                                            : 'የሎጅስቲክስ መዛግብትዎን ደህንነቱ የተጠበቀ የንባብ-ብቻ እይታ ለማጋራት ልዩ የምስጢር ቁልፍ ያመንጩ።'}
                                    </p>
                                    
                                    <div className="mt-4 space-y-3">
                                        <div>
                                            <label className="text-xs text-gray-400 uppercase font-bold block mb-1">{language === 'en' ? 'Active Secret Key' : 'ንቁ የሚስጥር ቁልፍ'}</label>
                                            <input 
                                                type="text" 
                                                className="w-full bg-slate-950 border border-gray-600 rounded p-3 text-white font-mono focus:border-amber-500 outline-none transition" 
                                                value={secretKey} 
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setSecretKey(val);
                                                    localStorage.setItem('arms_pending_secret_key', val);
                                                    localStorage.setItem('arms_pending_is_generated', 'false');
                                                    setIsGeneratedKey(false);
                                                }} 
                                                placeholder={language === 'en' ? 'e.g. ARMS-ABCD-1234' : 'ለምሳሌ ARMS-ABCD-1234'}
                                            />
                                        </div>

                                        <div className="pt-2 border-t border-military-700/50">
                                            <label className="text-xs text-gray-400 uppercase font-bold block mb-1">
                                                {language === 'en' ? 'Shared Secret Key' : 'የተጋራ የሚስጥር ቁልፍ'}
                                            </label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    readOnly
                                                    className="flex-1 min-w-0 truncate bg-slate-900 border border-gray-700 rounded p-3 text-amber-400 font-mono outline-none cursor-default select-all text-xs" 
                                                    value={getDB().securityCredentials?.secretKey || getDB().secretKey || ''} 
                                                    placeholder={language === 'en' ? 'No key saved in dataset' : 'በዳታቤዙ ውስጥ የተቀመጠ ቁልፍ የለም'}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const keyToCopy = getDB().securityCredentials?.secretKey || getDB().secretKey || '';
                                                        if (keyToCopy) {
                                                            navigator.clipboard.writeText(keyToCopy);
                                                            setMsg(language === 'en' ? "Secret Key copied to clipboard!" : "የሚስጥር ቁልፍ ወደ ቅንጥብ ሰሌዳ ተገልብጧል!");
                                                            setError(false);
                                                            setTimeout(() => setMsg(''), 3000);
                                                        } else {
                                                            setMsg(language === 'en' ? "No Secret Key to copy." : "የሚቀዳ የሚስጥር ቁልፍ የለም።");
                                                            setError(true);
                                                            setTimeout(() => setMsg(''), 3000);
                                                        }
                                                    }}
                                                    className="shrink-0 bg-slate-800 hover:bg-slate-700 border border-gray-600 text-gray-300 hover:text-white font-bold px-3 rounded transition flex items-center justify-center cursor-pointer"
                                                    title={language === 'en' ? 'Copy Key' : 'ቁልፍ ቅዳ'}
                                                >
                                                    <Copy size={16} />
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-gray-500 mt-1">
                                                {language === 'en' 
                                                    ? 'This is the permanent key saved inside the GitHub JSON file for this dataset. Share this key with other trusted users.' 
                                                    : 'ይህ በዚህ መረጃ ፋይል ውስጥ በGitHub ላይ የተቀመጠው ቋሚ ቁልፍ ነው። ይህንን ቁልፍ ለሌሎች ታማኝ ተጠቃሚዎች ያጋሩ።'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                                    <button 
                                        onClick={handleGenerateSecretKey}
                                        className="w-full sm:flex-1 min-w-0 bg-slate-800 hover:bg-slate-700 border border-gray-600 text-amber-300 font-bold py-2.5 md:py-3 px-4 md:px-6 rounded-lg transition shadow-lg flex items-center justify-center gap-2 text-xs md:text-sm text-center"
                                    >
                                        <RefreshCw size={14}/> {language === 'en' ? 'Generate' : 'አመንጭ'}
                                    </button>
                                    <button 
                                        onClick={handleSaveSecretKey}
                                        className="w-full sm:flex-1 min-w-0 bg-amber-600 hover:bg-amber-500 text-black font-bold py-2.5 md:py-3 px-4 md:px-6 rounded-lg transition shadow-lg flex items-center justify-center gap-2 text-xs md:text-sm text-center"
                                    >
                                        <Save size={14}/> {language === 'en' ? 'Save Key' : 'ቁልፉን አስቀምጥ'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION 3: System Fresh Start and Danger Zone */}
            {activeSection === 'fresh_danger' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    {/* FRESH START CARD */}
                    <div className="bg-slate-900 border border-red-500/30 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Database size={150}/></div>
                        <div className="flex items-center gap-4 mb-6 relative z-10">
                            <div className="h-14 w-14 bg-red-900/40 rounded-full flex items-center justify-center text-red-400"><Eraser size={28}/></div>
                            <div>
                                 <h4 className="text-2xl font-bold text-white">{language === 'en' ? "System Fresh Start" : "ስርዓቱን አዲስ ጅምር ማድረግ"}</h4>
                                 <p className="text-xs text-red-400 font-bold uppercase tracking-wider">{language === 'en' ? "Start fresh with a brand new, empty database file" : "ባዶ በሆነ አዲስ የዳታቤዝ ፋይል በአሳሹ ላይ እንደገና ይጀምሩ"}</p>
                            </div>
                        </div>

                        <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                            {language === 'en' 
                              ? "This option clears all currently displayed data details (manpower, finance, store, etc.) from this website so you can start completely fresh. This will automatically generate a new sequential file path on GitHub. Nothing will be deleted or removed from your GitHub repository; previous file paths (like arms001.json) will remain safe on cloud, and you can access them anytime with proper credentials by manually editing the file path input above." 
                              : "ይህ አማራጭ በአሳሽዎ ላይ ያለውን የአሁኑን መረጃ ያጸዳል፣ በዚህም በአዲስ ፋይል መጀመር ይችላሉ። ይህ በራስ-ሰር አዲስ ተከታታይ የፋይል መንገድን በ GitHub ላይ ያመነጫል። ከ GitHub ማከማቻዎ ምንም አይነት ነገር አይጠፋም። ቀደም ሲል የነበሩ የፋይል መንገዶች (እንደ arms001.json) ደህንነታቸው በክላውድ ላይ ይጠበቃል።"}
                        </p>

                        <button
                            onClick={handleFreshStart}
                            className="bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-500/30 font-bold py-2 md:py-3 px-4 md:px-6 rounded-lg transition shadow-lg flex items-center gap-2 cursor-pointer uppercase text-[10px] md:text-xs"
                        >
                            <Trash2 size={14} />
                            {language === 'en' ? "PERFORM FRESH START" : "አዲስ ጅምር አድርግ"}
                        </button>
                    </div>

                    <div className="bg-slate-950 border-2 border-red-600 rounded-2xl p-8 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(220,38,38,0.05)_10px,rgba(220,38,38,0.05)_20px)]"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-red-600 text-white rounded-lg shadow-lg"><Eraser size={32}/></div>
                                <div>
                                    <h3 className="text-3xl font-bold text-red-500">{t('dangerZone')}</h3>
                                    <p className="text-red-300/60 font-mono text-sm uppercase">{t('wipeDesc')}</p>
                                </div>
                            </div>
                            <div className="bg-black/40 rounded-xl p-6 border border-red-900/50 mb-8">
                                <h4 className="text-gray-400 font-bold uppercase text-xs mb-4 flex items-center gap-2"><CheckSquare size={14}/> {t('configureDel')}</h4>
                                <div className="grid grid-cols-2 md:grid-cols-[repeat(auto-fit,minmax(min(90px,100%),1fr))] gap-4 text-center">
                                    {dbKeys.map(({key, label}) => (
                                        <div key={key} className="flex flex-col items-center">
                                            <button 
                                                onClick={() => toggleDeleteSelection(key)}
                                                className={`w-12 h-12 flex items-center justify-center rounded-lg border-2 transition-all mb-2 ${selectedToDelete.includes(key) ? 'bg-red-600 border-red-500 text-white scale-110 shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-500'}`}
                                            >
                                                {selectedToDelete.includes(key) ? <CheckSquare size={24}/> : <Square size={24}/>}
                                            </button>
                                            <span className="text-[10px] md:text-xs font-bold text-gray-400 leading-tight">{label}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-4 mt-6 justify-center">
                                    <button onClick={() => setSelectedToDelete(dbKeys.map(k=>k.key))} className="text-xs text-red-400 hover:text-white underline">{t('selectAll')}</button>
                                    <button onClick={() => setSelectedToDelete([])} className="text-xs text-gray-500 hover:text-white underline">{t('unselectAll')}</button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4 w-full">
                                <button 
                                    onClick={() => setShowWipeConfirm(true)}
                                    disabled={selectedToDelete.length === 0}
                                    className="bg-red-600 hover:bg-red-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold py-2.5 md:py-4 px-4 md:px-8 rounded-lg shadow-xl flex items-center justify-center gap-3 transition transform active:scale-95 text-xs md:text-sm w-full"
                                >
                                    <Trash2 size={16} /> {t('confirmDel')} ({selectedToDelete.length})
                                </button>
                                <button 
                                    onClick={() => setShowFactoryResetConfirm(true)}
                                    className="bg-transparent border-2 border-red-800 text-red-800 hover:bg-red-900/20 hover:text-red-500 font-bold py-2.5 md:py-4 px-4 md:px-8 rounded-lg transition flex items-center justify-center gap-3 text-xs md:text-sm w-full"
                                >
                                    <AlertTriangle size={16} /> {t('factoryReset')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog 
                isOpen={showWipeConfirm}
                title={t('confirmDeletion')}
                message={
                    <div>
                        <p className="text-red-300 font-bold mb-2">{t('deleteWarning').replace('X', selectedToDelete.length.toString())}</p>
                        <ul className="list-disc list-inside text-gray-400 text-sm mb-4 bg-black/30 p-2 rounded">
                            {selectedToDelete.map(k => <li key={k}>{dbKeys.find(d => d.key === k)?.label || k}</li>)}
                        </ul>
                        <p className="text-xs text-gray-500 uppercase font-bold border-t border-gray-700 pt-2">{t('irreversibleWarning')}</p>
                    </div>
                }
                onConfirm={handleWipe}
                onCancel={() => setShowWipeConfirm(false)}
                isDanger={true}
                confirmText={t('delete')}
            />

            <ConfirmDialog 
                isOpen={showFreshStartConfirm}
                title={language === 'en' ? "System Fresh Start" : "ስርዓቱን አዲስ ጅምር ማድረግ"}
                message={
                    <div>
                        <p className="text-amber-300 font-bold mb-2">
                            {language === 'en' 
                                ? "Are you sure you want to perform a Fresh Start?" 
                                : "እርግጠኛ ነዎት አዲስ ጅምር (Fresh Start) ማድረግ ይፈልጋሉ?"}
                        </p>
                        <p className="text-gray-300 text-sm mb-2">
                            {language === 'en'
                                ? "This will clear all local data from the website so you can start completely fresh with a new file. Nothing will be deleted from your GitHub repository."
                                : "ይህ በአሳሽዎ ላይ ያለውን የአሁኑን መረጃ ያጸዳል፣ በዚህም በአዲስ ፋይል መጀመር ይችላሉ። ከ GitHub ማከማቻዎ ምንም አይነት ነገር አይጠፋም።"}
                        </p>
                    </div>
                }
                onConfirm={executeFreshStart}
                onCancel={() => setShowFreshStartConfirm(false)}
                isDanger={false}
                confirmText={language === 'en' ? "Fresh Start" : "አዲስ ጅምር"}
                cancelText={language === 'en' ? "Cancel" : "ሰርዝ"}
            />

            <ConfirmDialog 
                isOpen={showFactoryResetConfirm}
                title={language === 'en' ? "Factory Reset" : "ወደ ፋብሪካ ቅንጅት መመለስ"}
                message={
                    <div>
                        <p className="text-red-300 font-bold mb-2">
                            {language === 'en'
                                ? "FACTORY RESET: THIS ACTION CANNOT BE UNDONE."
                                : "የዳታቤዝ መጥረግ፦ ይህ ድርጊት ወደኋላ ሊመለስ አይችልም።"}
                        </p>
                        <p className="text-gray-300 text-sm mb-2">
                            {language === 'en'
                                ? "Are you sure you want to completely wipe the local database and reset all custom settings? This will clear all data locally from this browser."
                                : "የአሁኑን መረጃ በሙሉ እና ብጁ ቅንጅቶችን ለማጥፋት እርግጠኛ ነዎት? ይህ ከአሳሽዎ ላይ ሁሉንም መረጃዎች ያስወግዳል።"}
                        </p>
                    </div>
                }
                onConfirm={() => {
                    localStorage.removeItem('arms_database');
                    window.location.reload();
                }}
                onCancel={() => setShowFactoryResetConfirm(false)}
                isDanger={true}
                confirmText={language === 'en' ? "Reset Database" : "ዳታቤዝ አጥፋ"}
                cancelText={language === 'en' ? "Cancel" : "ሰርዝ"}
            />

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
                      <Lock size={28} className="animate-pulse text-gold-500" />
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
                      <span>{t('targetPathLabel')}</span>
                      <span className="text-gold-500 font-bold">{provingPath}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('databaseOwnerLabel')}</span>
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

            <ConfirmDialog 
                isOpen={pathVerificationState.isOpen && pathVerificationState.type === 'confirmCreate'}
                title={language === 'en' ? "Create Custom File" : "ብጁ ፋይል ፍጠር"}
                message={
                    <div>
                        <p className="text-amber-300 font-bold mb-2 text-sm">
                            {language === 'en' 
                                ? `The file "${pathVerificationState.targetPath}" does not exist on GitHub.` 
                                : `"${pathVerificationState.targetPath}" የተባለው ፋይል GitHub ላይ አልተገኘም።`}
                        </p>
                        <p className="text-gray-300 text-xs leading-relaxed">
                            {language === 'en'
                                ? "Do you want to use this custom path anyway? (You can upload your current local data as a backup to this path)"
                                : "ይህንን ብጁ የፋይል መንገድ መጠቀም ይፈልጋሉ? (የአሁኑን ዳታቤዝዎን ወደዚህ ፋይል መስቀል ይችላሉ)"}
                        </p>
                    </div>
                }
                onConfirm={() => executeCreateCustomPath(pathVerificationState.targetPath)}
                onCancel={handleCancelCreateCustomPath}
                isDanger={false}
                confirmText={language === 'en' ? "Create File" : "ፋይል ፍጠር"}
                cancelText={language === 'en' ? "Return to Previous File" : "ወደ ቀድሞው ፋይል ይመለሱ"}
            />

            <ConfirmDialog 
                isOpen={pathVerificationState.isOpen && pathVerificationState.type === 'confirmImport'}
                title={language === 'en' ? "Import Unsecured Data" : "ያልተቆለፈ መረጃ አስመጣ"}
                message={
                    <div>
                        <p className="text-amber-300 font-bold mb-2 text-sm">
                            {language === 'en' 
                                ? "Database file found with no secure passcode." 
                                : "የመግቢያ ኮድ የሌለው የዳታቤዝ ፋይል ተገኝቷል።"}
                        </p>
                        <p className="text-gray-300 text-xs leading-relaxed">
                            {language === 'en'
                                ? "Do you want to pull and display all data from this file? (This will overwrite your browser's current data)"
                                : "ሁሉንም መረጃዎች ወደ አሳሽዎ ጎትተው ማስገባት ይፈልጋሉ? (ይህ የአሁኑን መረጃዎን ይተካል)"}
                        </p>
                    </div>
                }
                onConfirm={() => executeImportUnsecuredData(pathVerificationState.remoteDbData!, pathVerificationState.targetPath)}
                onCancel={handleCancelImport}
                isDanger={false}
                confirmText={language === 'en' ? "Pull Data" : "መረጃውን አውርድ"}
                cancelText={language === 'en' ? "Return to Previous File" : "ወደ ቀድሞው ፋይል ይመለሱ"}
            />
        </div>
    );
};

export default DbAdministration;
