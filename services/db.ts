
import { AppData, Manpower, IncomeItem, Subsidy, Transfer, Expense, Refund, StoreItem, RationLog } from '../types';
import { getCurrentEthiopianDate } from './ethiopianDate';
import { pushToGitHub } from './githubService';

const DB_KEY = 'arms_database';

const initialData: AppData = {
  manpower: [],
  incomeItems: [],
  subsidies: [],
  transfers: [],
  expenses: [],
  refunds: [],
  notes: [],
  storeItems: [],
  storeOrders: [],
  foodProgram: [
    { id: 'mon', day: 'Monday', breakfast: '', lunch: '', dinner: '' },
    { id: 'tue', day: 'Tuesday', breakfast: '', lunch: '', dinner: '' },
    { id: 'wed', day: 'Wednesday', breakfast: '', lunch: '', dinner: '' },
    { id: 'thu', day: 'Thursday', breakfast: '', lunch: '', dinner: '' },
    { id: 'fri', day: 'Friday', breakfast: '', lunch: '', dinner: '' },
    { id: 'sat', day: 'Saturday', breakfast: '', lunch: '', dinner: '' },
    { id: 'sun', day: 'Sunday', breakfast: '', lunch: '', dinner: '' },
  ],
  programSettings: {
    title: 'ሳምንታዊ የምግብ ፕሮግራም',
    subtitle: 'የኢትዮጵያ አየር ኃይል - ሎጅስቲክስ ኮማንድ',
    footerLeft: 'ያዘጋጀው',
    footerRight: 'ያጸደቀው'
  },
  foodProgramArchive: [],
  mealIngredients: {}, // CRITICAL: Ensures recipes are saved
  rationHistory: []    // CRITICAL: Ensures deduction logs are saved
};

export const clearStoredCredentials = () => {
  localStorage.removeItem('arms_admin_username');
  localStorage.removeItem('arms_admin_password_hash');
  localStorage.removeItem('arms_user_username');
  localStorage.removeItem('arms_user_password_hash');
  localStorage.removeItem('arms_security_question');
  localStorage.removeItem('arms_security_answer_hash');
  localStorage.removeItem('arms_admin_customized');
  localStorage.removeItem('arms_user_customized');
  localStorage.removeItem('arms_username');
  localStorage.removeItem('arms_password_hash');
};

export const getDB = (): AppData => {
  const isReadOnly = localStorage.getItem('arms_readonly_mode') === 'true';
  const sharedData = localStorage.getItem('arms_shared_database');
  if (isReadOnly && sharedData) {
    try {
      const parsed = JSON.parse(sharedData);
      return {
        ...initialData,
        ...parsed,
        manpower: Array.isArray(parsed.manpower) ? parsed.manpower : [],
        incomeItems: Array.isArray(parsed.incomeItems) ? parsed.incomeItems : [],
        subsidies: Array.isArray(parsed.subsidies) ? parsed.subsidies : [],
        transfers: Array.isArray(parsed.transfers) ? parsed.transfers : [],
        expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
        refunds: Array.isArray(parsed.refunds) ? parsed.refunds : [],
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        storeItems: Array.isArray(parsed.storeItems) ? parsed.storeItems : [],
        storeOrders: Array.isArray(parsed.storeOrders) ? parsed.storeOrders : [],
        foodProgram: Array.isArray(parsed.foodProgram) ? parsed.foodProgram : initialData.foodProgram,
        programSettings: parsed.programSettings || initialData.programSettings,
        foodProgramArchive: Array.isArray(parsed.foodProgramArchive) ? parsed.foodProgramArchive : [],
        mealIngredients: parsed.mealIngredients || {},
        rationHistory: Array.isArray(parsed.rationHistory) ? parsed.rationHistory : []
      };
    } catch (e) {
      console.error("Shared database parsing failed, falling back.", e);
    }
  }

  const data = localStorage.getItem(DB_KEY);
  if (!data) {
    localStorage.setItem(DB_KEY, JSON.stringify(initialData));
    return initialData;
  }
  try {
    const parsed = JSON.parse(data);
    
    // EXTRACT security credentials if present and populated in parsed database
    if (parsed.secretKey) {
      localStorage.setItem('arms_secret_key', parsed.secretKey);
    }

    if (parsed.securityCredentials && typeof parsed.securityCredentials === 'object') {
      const creds = parsed.securityCredentials;
      if (creds.adminUsername) localStorage.setItem('arms_admin_username', creds.adminUsername);
      if (creds.adminPasswordHash) localStorage.setItem('arms_admin_password_hash', creds.adminPasswordHash);
      if (creds.userUsername) localStorage.setItem('arms_user_username', creds.userUsername);
      if (creds.userPasswordHash) localStorage.setItem('arms_user_password_hash', creds.userPasswordHash);
      if (creds.securityQuestion) localStorage.setItem('arms_security_question', creds.securityQuestion);
      if (creds.securityAnswerHash) localStorage.setItem('arms_security_answer_hash', creds.securityAnswerHash);
      if (creds.adminCustomized) localStorage.setItem('arms_admin_customized', creds.adminCustomized);
      if (creds.userCustomized) localStorage.setItem('arms_user_customized', creds.userCustomized);
      if (creds.secretKey) localStorage.setItem('arms_secret_key', creds.secretKey);
    }

    // CRITICAL FIX: Merge parsed data with initialData to ensure NO missing keys
    const safeData: AppData = {
        ...initialData,
        ...parsed,
        manpower: Array.isArray(parsed.manpower) ? parsed.manpower : [],
        incomeItems: Array.isArray(parsed.incomeItems) ? parsed.incomeItems : [],
        subsidies: Array.isArray(parsed.subsidies) ? parsed.subsidies : [],
        transfers: Array.isArray(parsed.transfers) ? parsed.transfers : [],
        expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
        refunds: Array.isArray(parsed.refunds) ? parsed.refunds : [],
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        storeItems: Array.isArray(parsed.storeItems) ? parsed.storeItems : [],
        storeOrders: Array.isArray(parsed.storeOrders) ? parsed.storeOrders : [],
        foodProgram: Array.isArray(parsed.foodProgram) ? parsed.foodProgram : initialData.foodProgram,
        programSettings: parsed.programSettings || initialData.programSettings,
        foodProgramArchive: Array.isArray(parsed.foodProgramArchive) ? parsed.foodProgramArchive : [],
        mealIngredients: parsed.mealIngredients || {},
        rationHistory: Array.isArray(parsed.rationHistory) ? parsed.rationHistory : []
    };

    return safeData;
  } catch (e) {
    console.error("Database corruption detected, reverting to default.", e);
    return initialData;
  }
};

export const saveDB = (data: AppData, skipSync: boolean = false) => {
  try {
      const isReadOnly = localStorage.getItem('arms_readonly_mode') === 'true';
      
      // Enforce path date alignment: saving to master is ONLY allowed when the filtered UI date matches the configured path date.
      // If there's a mismatch (or we are in read-only mode), we save to arms_shared_database as temporary session state.
      let matches = !isReadOnly;
      if (!isReadOnly) {
          const confStr = localStorage.getItem('arms_github_config');
          if (confStr) {
              try {
                  const conf = JSON.parse(confStr);
                  if (conf.enabled && conf.path) {
                      const selectedMonth = localStorage.getItem('arms_selected_month');
                      const selectedYear = localStorage.getItem('arms_selected_year');
                      if (selectedMonth && selectedYear) {
                          const monthMap: Record<string, string> = {
                              "01": "september", "1": "september",
                              "02": "october", "2": "october",
                              "03": "november", "3": "november",
                              "04": "december", "4": "december",
                              "05": "january", "5": "january",
                              "06": "february", "6": "february",
                              "07": "march", "7": "march",
                              "08": "april", "8": "april",
                              "09": "may", "9": "may",
                              "10": "june", "11": "july", "12": "august", "13": "pagume"
                          };
                          const mName = monthMap[selectedMonth] || `month_${selectedMonth}`;
                          const currentUiFolder = `${mName}${selectedYear}`;
                          const confFolder = conf.path.split('/')[0];
                          
                          if (currentUiFolder.toLowerCase() !== confFolder.toLowerCase()) {
                              matches = false;
                          }
                      }
                  }
              } catch (e) {
                  // Fall through
              }
          }
      }

      if (isReadOnly || !matches) {
        // In read-only mode or mismatched date, only update session shared DB in memory, do NOT persist to master or sync
        localStorage.setItem('arms_shared_database', JSON.stringify(data));
        return;
      }

      // Extract credentials from incoming data if they exist (e.g. from a cloud pull)
      if (data.secretKey !== undefined) {
        if (data.secretKey) localStorage.setItem('arms_secret_key', data.secretKey);
        else localStorage.removeItem('arms_secret_key');
      }

      if (data.securityCredentials && typeof data.securityCredentials === 'object') {
        const creds = data.securityCredentials;
        if (creds.adminUsername) localStorage.setItem('arms_admin_username', creds.adminUsername);
        if (creds.adminPasswordHash) localStorage.setItem('arms_admin_password_hash', creds.adminPasswordHash);
        if (creds.userUsername) localStorage.setItem('arms_user_username', creds.userUsername);
        if (creds.userPasswordHash) localStorage.setItem('arms_user_password_hash', creds.userPasswordHash);
        if (creds.securityQuestion) localStorage.setItem('arms_security_question', creds.securityQuestion);
        if (creds.securityAnswerHash) localStorage.setItem('arms_security_answer_hash', creds.securityAnswerHash);
        if (creds.adminCustomized) localStorage.setItem('arms_admin_customized', creds.adminCustomized);
        if (creds.userCustomized) localStorage.setItem('arms_user_customized', creds.userCustomized);
        if (creds.secretKey) localStorage.setItem('arms_secret_key', creds.secretKey);
      }

      // Inject the CURRENT localStorage credentials into the database object before storing/pushing
      const sKey = localStorage.getItem('arms_secret_key') || undefined;
      data.secretKey = sKey;
      data.securityCredentials = {
        adminUsername: localStorage.getItem('arms_admin_username') || undefined,
        adminPasswordHash: localStorage.getItem('arms_admin_password_hash') || undefined,
        userUsername: localStorage.getItem('arms_user_username') || undefined,
        userPasswordHash: localStorage.getItem('arms_user_password_hash') || undefined,
        securityQuestion: localStorage.getItem('arms_security_question') || undefined,
        securityAnswerHash: localStorage.getItem('arms_security_answer_hash') || undefined,
        adminCustomized: localStorage.getItem('arms_admin_customized') || undefined,
        userCustomized: localStorage.getItem('arms_user_customized') || undefined,
        secretKey: sKey
      };

      // 1. Save to Local Storage (Instant)
      localStorage.setItem(DB_KEY, JSON.stringify(data));
      
      // 2. Backup to GitHub (Async)
      if (!skipSync) {
        pushToGitHub(data).catch(err => console.error("Auto-Sync Failed:", err));
      }
  } catch (e) {
      console.error("Failed to save to localStorage (Quota exceeded?)", e);
      alert("System Warning: Storage Full. Data could not be saved locally.");
  }
};

// Raw add (legacy support, mostly internal)
export const addItem = <T>(collection: keyof AppData, item: T) => {
  const db = getDB();
  if (!db[collection]) {
    // @ts-ignore
    db[collection] = [];
  }
  (db[collection] as T[]).push(item);
  saveDB(db);
};

export const updateItem = <T>(collection: keyof AppData, id: string, updatedFields: Partial<T>) => {
  const db = getDB();
  const list = db[collection] as any[];
  const index = list.findIndex((item) => String(item.id) === String(id));
  if (index !== -1) {
    list[index] = { ...list[index], ...updatedFields };
    saveDB(db);
  }
};

export const deleteItem = (collection: keyof AppData, id: string) => {
  const db = getDB();
  if (Array.isArray(db[collection])) {
    db[collection] = (db[collection] as any[]).filter((i: any) => String(i.id) !== String(id)) as any;
    saveDB(db);
  }
};

export const resetDB = () => {
  if (window.confirm("Are you sure you want to completely wipe the database? This does NOT affect your login.")) {
      localStorage.removeItem(DB_KEY);
      window.location.reload();
  }
};

/**
 * Helper to get unique values for Smart Suggestions
 */
export const getUniqueValues = (collection: keyof AppData, field: string): string[] => {
    const db = getDB();
    const list = db[collection] as any[];
    if (!list) return [];
    
    // Extract values, map to string, trim, lowercase for uniqueness check
    const values = list.map(item => item[field]).filter(val => val !== undefined && val !== null && val !== '');
    
    // Create Set for uniqueness
    return Array.from(new Set(values));
};

/**
 * Check for potential duplicates BEFORE upserting.
 * Returns information about the match to display in a modal.
 */
export const findPotentialMatch = (collection: keyof AppData, newItem: any) => {
  const db = getDB();
  const list = db[collection] as any[];
  
  let match: any = undefined;
  let matchReason = "";

  if (collection === 'manpower' || collection === 'refunds') {
      match = list.find(m => {
        const isSameName = m.firstName?.toLowerCase()?.trim() === newItem.firstName?.toLowerCase()?.trim() &&
                           m.lastName?.toLowerCase()?.trim() === newItem.lastName?.toLowerCase()?.trim();
        if (!isSameName) return false;
        
        const mDate = collection === 'manpower' ? m.startDate : m.stopDate;
        const newDate = collection === 'manpower' ? newItem.startDate : newItem.stopDate;
        if (!mDate || !newDate) return true;
        return mDate.slice(0, 7) === newDate.slice(0, 7);
      });
      if (match) matchReason = `${match.firstName} ${match.lastName}`;
  } else if (collection === 'incomeItems' || collection === 'storeItems') {
      match = list.find(i => {
        const isSameName = i.name?.toLowerCase()?.trim() === newItem.name?.toLowerCase()?.trim();
        if (!isSameName) return false;
        
        if (collection === 'storeItems' && i.category !== newItem.category) return false;
        
        const iDate = i.date;
        const newDate = newItem.date;
        if (!iDate || !newDate) return true;
        return iDate.slice(0, 7) === newDate.slice(0, 7);
      });
      if (match) matchReason = `${match.name} (${match.date})`;
  } else if (collection === 'expenses') {
      match = list.find(e => {
         if (e.category !== newItem.category) return false;
         
         const eDate = e.date;
         const newDate = newItem.date;
         if (!eDate || !newDate) return false;
         if (eDate.slice(0, 7) !== newDate.slice(0, 7)) return false;
         
         if (e.category === 'Market') return e.itemName?.toLowerCase()?.trim() === newItem.itemName?.toLowerCase()?.trim();
         if (e.category === 'Wage') return e.workerName?.toLowerCase()?.trim() === newItem.workerName?.toLowerCase()?.trim();
         if (e.category === 'Other') return e.reason?.toLowerCase()?.trim() === newItem.reason?.toLowerCase()?.trim();
         return false;
      });
      if (match) {
          matchReason = match.category === 'Market' ? match.itemName : (match.workerName || match.reason);
      }
  } else if (collection === 'subsidies') {
      match = list.find(s => {
         if (s.type !== newItem.type) return false;
         
         const sDate = s.date;
         const newDate = newItem.date;
         if (!sDate || !newDate) return false;
         if (sDate.slice(0, 7) !== newDate.slice(0, 7)) return false;
         
         const key1 = s.itemName || s.source;
         const key2 = newItem.itemName || newItem.source;
         return key1?.toLowerCase()?.trim() === key2?.toLowerCase()?.trim();
      });
      if (match) {
          matchReason = match.itemName || match.source;
      }
  }

  return match ? { found: true, item: match, reason: matchReason } : { found: false, item: null, reason: '' };
};

/**
 * SMART UPSERT: Handles strict normalization and duplicate merging.
 * Added `forceNew` to bypass merging logic and simply add as new entry.
 */
export const smartUpsertItem = (collection: keyof AppData, newItem: any, forceNew: boolean = false) => {
  const db = getDB();
  // @ts-ignore
  if (!db[collection]) db[collection] = [];
  
  const list = db[collection] as any[];
  
  // If Force New, generate ID and push immediately
  if (forceNew) {
      if (!newItem.id) newItem.id = Math.random().toString(36).substr(2, 9);
      newItem.id = Math.random().toString(36).substr(2, 9); 
      list.push(newItem);
      // @ts-ignore
      db[collection] = list;
      saveDB(db);
      return;
  }

  let existingIndex = -1;

  // --- 1. IDENTIFY DUPLICATE (Same Logic as Matcher) ---
  if (collection === 'manpower') {
    existingIndex = list.findIndex(m => 
      m.firstName?.toLowerCase()?.trim() === newItem.firstName?.toLowerCase()?.trim() &&
      m.lastName?.toLowerCase()?.trim() === newItem.lastName?.toLowerCase()?.trim() &&
      (!m.startDate || !newItem.startDate || m.startDate.slice(0, 7) === newItem.startDate.slice(0, 7))
    );
  } else if (collection === 'refunds') {
    existingIndex = list.findIndex(r => 
      r.firstName?.toLowerCase()?.trim() === newItem.firstName?.toLowerCase()?.trim() &&
      r.lastName?.toLowerCase()?.trim() === newItem.lastName?.toLowerCase()?.trim() &&
      (!r.stopDate || !newItem.stopDate || r.stopDate.slice(0, 7) === newItem.stopDate.slice(0, 7))
    );
  } else if (collection === 'incomeItems') {
    existingIndex = list.findIndex(i => 
      i.name?.toLowerCase()?.trim() === newItem.name?.toLowerCase()?.trim() &&
      i.date === newItem.date 
    );
  } else if (collection === 'storeItems') {
    existingIndex = list.findIndex(i => 
      i.name?.toLowerCase()?.trim() === newItem.name?.toLowerCase()?.trim() &&
      i.category === newItem.category &&
      (!i.date || !newItem.date || i.date.slice(0, 7) === newItem.date.slice(0, 7))
    );
  } else if (collection === 'expenses') {
    existingIndex = list.findIndex(e => {
       if (e.category !== newItem.category) return false;
       if (e.date !== newItem.date) return false; 

       if (e.category === 'Market') return e.itemName?.toLowerCase()?.trim() === newItem.itemName?.toLowerCase()?.trim();
       if (e.category === 'Wage') return e.workerName?.toLowerCase()?.trim() === newItem.workerName?.toLowerCase()?.trim();
       if (e.category === 'Other') return e.reason?.toLowerCase()?.trim() === newItem.reason?.toLowerCase()?.trim();
       return false;
    });
  } else if (collection === 'subsidies') {
    existingIndex = list.findIndex(s => {
       if (s.type !== newItem.type) return false;
       if (!s.date || !newItem.date || s.date.slice(0, 7) !== newItem.date.slice(0, 7)) return false;
       const key1 = s.itemName || s.source;
       const key2 = newItem.itemName || newItem.source;
       return key1?.toLowerCase()?.trim() === key2?.toLowerCase()?.trim();
    });
  }

  // --- 2. MERGE OR ADD ---
  if (existingIndex !== -1) {
    // MERGE LOGIC
    const existing = list[existingIndex];
    
    // A) MANPOWER / REFUNDS / SUBSIDIES (Simple Sum)
    if (['manpower', 'refunds', 'subsidies', 'transfers'].includes(collection)) {
        existing.amount = (Number(existing.amount) || 0) + (Number(newItem.amount) || 0);
        
        // Update metadata to latest
        if (newItem.rank) existing.rank = newItem.rank;
        if (newItem.command) existing.command = newItem.command;
        if (newItem.type) existing.type = newItem.type;
        if (newItem.date) existing.date = newItem.date;
        if (newItem.description) existing.description = newItem.description; 
        
        if (collection === 'refunds' && newItem.stopDate) existing.stopDate = newItem.stopDate;
    } 
    // B) ITEMS (Weighted Average Price)
    else if (['incomeItems', 'storeItems', 'expenses'].includes(collection)) {
        const oldQty = Number(existing.amount) || 0;
        const oldPrice = Number(existing.singlePrice) || 0;
        
        const newQty = Number(newItem.amount) || 0;
        const newPrice = Number(newItem.singlePrice) || 0;

        const totalQty = oldQty + newQty;
        
        let avgPrice = oldPrice;
        if (totalQty > 0) {
            const totalValue = (oldQty * oldPrice) + (newQty * newPrice);
            avgPrice = totalValue / totalQty;
        }

        existing.amount = totalQty;
        existing.singlePrice = parseFloat(avgPrice.toFixed(4)); 
        
        if (newItem.date) existing.date = newItem.date;
        if (newItem.measurement) existing.measurement = newItem.measurement;
        if (newItem.description) existing.description = newItem.description;
    }

    list[existingIndex] = existing;
  } else {
    // NEW ENTRY
    if (!newItem.id) newItem.id = Math.random().toString(36).substr(2, 9);
    list.push(newItem);
  }

  if (collection === 'refunds') {
      const manpowerIndex = db.manpower.findIndex(m => 
          m.firstName?.toLowerCase()?.trim() === newItem.firstName?.toLowerCase()?.trim() &&
          m.lastName?.toLowerCase()?.trim() === newItem.lastName?.toLowerCase()?.trim()
      );
      
      if (manpowerIndex !== -1) {
          const refundDate = newItem.stopDate || newItem.date || getCurrentEthiopianDate();
          db.manpower[manpowerIndex].endDate = refundDate;
      }
  }

  // @ts-ignore
  db[collection] = list;
  saveDB(db);
};

// --- SPECIAL STORE TRANSACTION LOGIC (STOCK IN / RECEIVE) ---
export const processStoreOrder = (orderId: string, actualReceivedAmount: number, finalPrice: number): { success: boolean, msg: string } => {
  const db = getDB();
  const orderIndex = db.storeOrders.findIndex(o => o.id === orderId);
  
  if (orderIndex === -1) return { success: false, msg: "Order not found" };
  
  const order = db.storeOrders[orderIndex];
  
  // 1. Find Inventory Item (Case Insensitive Match) to ADD STOCK
  let inventoryIndex = db.storeItems.findIndex(i => 
    i.category === 'inventory' && 
    i.name.toLowerCase().trim() === order.itemName.toLowerCase().trim()
  );

  // 2. Logic: STOCK IN (Add to Inventory)
  if (inventoryIndex !== -1) {
    // Item Exists: Update Qty and Weighted Average Price
    const item = db.storeItems[inventoryIndex];
    const oldQty = Number(item.amount);
    const oldPrice = Number(item.singlePrice);
    
    const newQty = oldQty + actualReceivedAmount;
    
    // Weighted Average Price Calculation
    // (OldValue + NewValue) / TotalQty
    let newAvgPrice = oldPrice;
    if (newQty > 0) {
        newAvgPrice = ((oldQty * oldPrice) + (actualReceivedAmount * finalPrice)) / newQty;
    }

    item.amount = newQty;
    item.singlePrice = parseFloat(newAvgPrice.toFixed(4));
    // NOTE: We do NOT append to description to avoid infinite string bloat. 
    // The history is preserved in `storeOrders`.
    item.date = order.date; // Update to latest transaction date

    db.storeItems[inventoryIndex] = item;
  } else {
    // Item Does Not Exist: Create New
    const newItem: StoreItem = {
        id: Math.random().toString(36).substr(2, 9),
        category: 'inventory',
        name: order.itemName,
        measurement: order.measurement,
        amount: actualReceivedAmount,
        singlePrice: finalPrice,
        description: `Initial stock from Order (${order.buyerName || 'Unknown'}). ${order.description}`,
        date: order.date
    };
    db.storeItems.push(newItem);
  }

  // 3. Update Order Status
  order.status = 'Completed';
  // Update order amount to reflect what was ACTUALLY received
  order.amount = actualReceivedAmount; 
  order.description = `${order.description} (Received & Added to Stock @ ${finalPrice} Birr)`;
  db.storeOrders[orderIndex] = order;

  saveDB(db);
  return { success: true, msg: `Received ${actualReceivedAmount} ${order.measurement} of ${order.itemName}. Inventory Updated.` };
};

// --- RATION DEDUCTION LOGIC ---
export const processRationDeduction = (day: string, manpower: number, items: {name: string, amount: number, unit: string}[]): {success: boolean, msg: string} => {
  const db = getDB();
  let totalCost = 0;
  const deductedItemsLog = [];

  // Iterate over items to deduct
  for (const reqItem of items) {
    // Find item in inventory
    const inventoryIndex = db.storeItems.findIndex(i => 
      i.category === 'inventory' && 
      i.name.toLowerCase().trim() === reqItem.name.toLowerCase().trim()
    );

    if (inventoryIndex !== -1) {
      const item = db.storeItems[inventoryIndex];
      const price = item.singlePrice || 0;
      const cost = reqItem.amount * price;
      
      // Deduct
      item.amount = Math.max(0, item.amount - reqItem.amount);
      totalCost += cost;

      deductedItemsLog.push({
        itemName: item.name,
        amount: reqItem.amount,
        unit: reqItem.unit,
        priceCalculated: price
      });

      db.storeItems[inventoryIndex] = item;
    } else {
      // Item not found, log it as 0 cost deduction
      deductedItemsLog.push({
        itemName: reqItem.name,
        amount: reqItem.amount,
        unit: reqItem.unit,
        priceCalculated: 0
      });
    }
  }

  // Create Log
  const newLog: RationLog = {
    id: Math.random().toString(36).substr(2, 9),
    day,
    dateExecuted: getCurrentEthiopianDate(),
    totalManpower: manpower,
    itemsDeducted: deductedItemsLog,
    totalCost
  };

  if (!db.rationHistory) db.rationHistory = [];
  db.rationHistory.unshift(newLog); // Add to top

  saveDB(db);
  return { success: true, msg: `Daily Ration for ${day} Processed. Inventory Deducted.` };
};

// --- SECURE AUTHENTICATION CREDENTIALS SERVICES ---
const DEFAULT_USERNAME = 'admin';
const DEFAULT_USER_PASSWORD_HASH = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'; // sha256 of 'admin'

const DEFAULT_ADMIN_USERNAME = 'etaf';
const DEFAULT_ADMIN_PASSWORD_HASH = '89950db85e13d5cf42017fe7003c4a243fe614b6bc6be869fbf793c9d7494f6f'; // sha256 of 'etaf'

export const sha256 = async (message: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const getStoredUsername = (): string => {
    return localStorage.getItem('arms_user_username') || localStorage.getItem('arms_username') || DEFAULT_USERNAME;
};

export const getStoredAdminUsername = (): string => {
    const adminUser = localStorage.getItem('arms_admin_username');
    const userUser = localStorage.getItem('arms_user_username') || localStorage.getItem('arms_username') || DEFAULT_USERNAME;
    if (adminUser && adminUser.toLowerCase() === userUser.toLowerCase() && userUser.toLowerCase() !== DEFAULT_ADMIN_USERNAME) {
        return DEFAULT_ADMIN_USERNAME;
    }
    return adminUser || DEFAULT_ADMIN_USERNAME;
};

export const verifyAdminPassword = async (passwordInput: string): Promise<boolean> => {
    const adminHash = localStorage.getItem('arms_admin_password_hash');
    const isAdminCustomized = localStorage.getItem('arms_admin_customized') === 'true';
    const storedHash = adminHash || (isAdminCustomized ? undefined : DEFAULT_ADMIN_PASSWORD_HASH);
    const inputHash = await sha256(passwordInput);
    return storedHash === inputHash;
};

export const verifyUserPassword = async (passwordInput: string): Promise<boolean> => {
    const userHash = localStorage.getItem('arms_user_password_hash');
    const legacyHash = localStorage.getItem('arms_password_hash');
    const isUserCustomized = localStorage.getItem('arms_user_customized') === 'true';
    const storedHash = userHash || legacyHash || (isUserCustomized ? undefined : DEFAULT_USER_PASSWORD_HASH);
    const inputHash = await sha256(passwordInput);
    return storedHash === inputHash;
};

export const verifyPassword = async (passwordInput: string): Promise<boolean> => {
    const isAdminValid = await verifyAdminPassword(passwordInput);
    const isUserValid = await verifyUserPassword(passwordInput);
    return isAdminValid || isUserValid;
};

export const updateStoredCredentials = async (newUsername: string, newPassword?: string) => {
    localStorage.setItem('arms_user_username', newUsername);
    localStorage.setItem('arms_user_customized', 'true');
    localStorage.setItem('arms_username', newUsername);

    const currentAdminUser = localStorage.getItem('arms_admin_username');
    if (currentAdminUser && currentAdminUser.toLowerCase() === newUsername.toLowerCase() && newUsername.toLowerCase() !== DEFAULT_ADMIN_USERNAME) {
        localStorage.setItem('arms_admin_username', DEFAULT_ADMIN_USERNAME);
        localStorage.removeItem('arms_admin_customized');
        localStorage.removeItem('arms_admin_password_hash');
    }

    if (newPassword) {
        const hash = await sha256(newPassword);
        localStorage.setItem('arms_user_password_hash', hash);
        localStorage.setItem('arms_password_hash', hash);
    }
    const currentDb = getDB();
    saveDB(currentDb, true);
    return await pushToGitHub(currentDb, undefined, true);
};

export const getStoredSecurityQuestion = (): string => {
    return localStorage.getItem('arms_security_question') || 'What is your primary military command / station?';
};

export const verifySecurityAnswer = async (answerInput: string): Promise<boolean> => {
    // Default answer is "air force" (sha256 hash below)
    const defaultAnswerHash = '59cb4a57262112423fe5d9efda47cc320d32b509ef473b64c7df76f1165a26a4';
    const storedHash = localStorage.getItem('arms_security_answer_hash') || defaultAnswerHash;
    const inputHash = await sha256(answerInput.trim().toLowerCase());
    return storedHash === inputHash;
};

export const updateSecurityQuestion = async (question: string, answer?: string) => {
    localStorage.setItem('arms_security_question', question);
    if (answer) {
        const hash = await sha256(answer.trim().toLowerCase());
        localStorage.setItem('arms_security_answer_hash', hash);
    }
    const currentDb = getDB();
    saveDB(currentDb, true);
    return await pushToGitHub(currentDb, undefined, true);
};

export const updateAdminCredentialsDirectly = async (newUsername: string, newPassword?: string) => {
    localStorage.setItem('arms_admin_username', newUsername);
    localStorage.setItem('arms_admin_customized', 'true');
    if (newPassword) {
        const hash = await sha256(newPassword);
        localStorage.setItem('arms_admin_password_hash', hash);
    }
    const currentDb = getDB();
    saveDB(currentDb, true);
    return await pushToGitHub(currentDb, undefined, true);
};

export const resetPasswordDirectly = async (newPassword: string) => {
    const hash = await sha256(newPassword);
    localStorage.setItem('arms_user_password_hash', hash);
    localStorage.setItem('arms_password_hash', hash);
    localStorage.setItem('arms_user_customized', 'true');
    const currentDb = getDB();
    saveDB(currentDb, true);
    return await pushToGitHub(currentDb, undefined, true);
};

export const isNewUser = (): boolean => {
    // If passwords have been customized, they are NOT a new user
    const adminCust = localStorage.getItem('arms_admin_customized');
    const userCust = localStorage.getItem('arms_user_customized');
    
    // Check actual stored hashes to be completely safe
    const adminHash = localStorage.getItem('arms_admin_password_hash');
    const userHash = localStorage.getItem('arms_user_password_hash');
    const DEFAULT_ADMIN_PASSWORD_HASH = '89950db85e13d5cf42017fe7003c4a243fe614b6bc6be869fbf793c9d7494f6f';
    const DEFAULT_USER_PASSWORD_HASH = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';

    const hasChangedAdmin = (adminCust === 'true') || (adminHash && adminHash !== DEFAULT_ADMIN_PASSWORD_HASH);
    const hasChangedUser = (userCust === 'true') || (userHash && userHash !== DEFAULT_USER_PASSWORD_HASH);

    if (hasChangedAdmin || hasChangedUser) {
        return false;
    }

    try {
        const dbRaw = localStorage.getItem('arms_database');
        if (dbRaw) {
            const db = JSON.parse(dbRaw);
            const hasManpower = db.manpower && db.manpower.length > 0;
            const hasExpenses = db.expenses && db.expenses.length > 0;
            const hasIncome = db.incomeItems && db.incomeItems.length > 0;
            const hasNotes = db.notes && db.notes.length > 0;
            const hasStore = db.storeItems && db.storeItems.length > 0;
            if (hasManpower || hasExpenses || hasIncome || hasNotes || hasStore) {
                return false;
            }
        }
    } catch (e) {}

    const ghRaw = localStorage.getItem('arms_github_config');
    if (ghRaw) {
        try {
            const gh = JSON.parse(ghRaw);
            if (gh.owner || gh.repo || gh.token || (gh.path && gh.path !== 'arms_db.json')) {
                return false;
            }
        } catch (e) {}
    }

    return true;
};

export const clearDatabaseDataForFreshStart = () => {
  // Clear the filename assignment cache so a brand-new path gets allocated next time
  localStorage.removeItem('arms_assigned_filename_folder');
  localStorage.removeItem('arms_assigned_filename');

  // Preserve all credentials in local storage. Do NOT call clearStoredCredentials().
  const secretKey = localStorage.getItem('arms_secret_key') || '';

  // Preserve the current credentials block to save into the fresh database
  const currentDb = getDB();
  const credentials = currentDb.securityCredentials || {};

  // Create database state with empty transactional data but preserving all credentials
  const freshDb: AppData = {
    ...initialData,
    securityCredentials: credentials,
    secretKey: secretKey || undefined
  };

  localStorage.setItem(DB_KEY, JSON.stringify(freshDb));

  // Reset arms_github_config path to arms_db.json so auto-detect triggers sequence generation
  const storedGh = localStorage.getItem('arms_github_config');
  if (storedGh) {
    try {
      const gh = JSON.parse(storedGh);
      gh.path = 'arms_db.json';
      localStorage.setItem('arms_github_config', JSON.stringify(gh));
    } catch (e) {}
  }
};

