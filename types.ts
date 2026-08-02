
export enum Rank {
  REC = "Recruit",
  PVT = "Private",
  PFC = "Private First Class",
  CPL = "Corporal",
  SGT = "Sergeant",
  SSGT = "Staff Sergeant",
  SFC = "Sergeant First Class",
  MSG = "Master Sergeant",
  SMA = "Sergeant Major",
  WO1 = "Warrant Officer 1",
  WO2 = "Warrant Officer 2",
  SLT = "Second Lieutenant",
  LT = "Lieutenant",
  CPT = "Captain",
  MAJ = "Major",
  LTC = "Lieutenant Colonel",
  COL = "Colonel",
  BG = "Brigadier General",
  MG = "Major General",
  LTG = "Lieutenant General",
  GEN = "General"
}

// Updated Command Enum
export enum Command {
  AF = "Air Force",
  GF = "Ground Force",
  NV = "Navy",
  SF = "Special Force",
  COMMANDO = "Commando",
  CIVIL = "Civil",
  OTHERS = "Others"
}

// Updated ManpowerType Enum
export enum ManpowerType {
  PAYROLL = "Payroll",
  FULL_CASH = "Full Cash",
  HALF_CASH = "Half Cash",
  TRANSIENT = "Transient",
  PENSION = "Pension",
  OTHERS = "Others"
}

// Hierarchical Rank Options
export const RANK_OPTIONS = [
  // AIR FORCE (Default)
  { value: "Air Force", label: "Air Force", className: "font-bold text-gold-400 bg-military-900/50" },
  { value: "Enlisted", label: "Enlisted", className: "pl-6 text-gray-400 font-semibold" },
  { value: "Recruit", label: "Recruit", className: "pl-10" },
  { value: "Private", label: "Private", className: "pl-10" },
  { value: "Lance CPL", label: "Lance CPL", className: "pl-10" },
  { value: "Corporal", label: "Corporal", className: "pl-10" },
  { value: "Sergeant", label: "Sergeant", className: "pl-10" },
  { value: "NCOs", label: "NCOs", className: "pl-6 text-gray-400 font-semibold" },
  { value: "Officers", label: "Officers", className: "pl-6 text-gray-400 font-semibold" },
  { value: "Second Lieutenant", label: "Second Lieutenant", className: "pl-10" },
  { value: "Lieutenant", label: "Lieutenant", className: "pl-10" },
  { value: "Captain", label: "Captain", className: "pl-10" },
  { value: "Major", label: "Major", className: "pl-10" },
  { value: "Lieutenant Colonel", label: "Lieutenant Colonel", className: "pl-10" },
  { value: "Colonel", label: "Colonel", className: "pl-10" },

  // GROUND FORCE
  { value: "Ground Force", label: "Ground Force", className: "font-bold text-gold-400 bg-military-900/50 mt-1" },
  { value: "Enlisted", label: "Enlisted", className: "pl-6 text-gray-400 font-semibold" },
  { value: "Recruit", label: "Recruit", className: "pl-10" },
  { value: "Private", label: "Private", className: "pl-10" },
  { value: "Lance CPL", label: "Lance CPL", className: "pl-10" },
  { value: "Corporal", label: "Corporal", className: "pl-10" },
  { value: "Sergeant", label: "Sergeant", className: "pl-10" },
  { value: "NCOs", label: "NCOs", className: "pl-6 text-gray-400 font-semibold" },
  { value: "Officers", label: "Officers", className: "pl-6 text-gray-400 font-semibold" },
  { value: "Second Lieutenant", label: "Second Lieutenant", className: "pl-10" },
  { value: "Lieutenant", label: "Lieutenant", className: "pl-10" },
  { value: "Captain", label: "Captain", className: "pl-10" },
  { value: "Major", label: "Major", className: "pl-10" },
  { value: "Lieutenant Colonel", label: "Lieutenant Colonel", className: "pl-10" },
  { value: "Colonel", label: "Colonel", className: "pl-10" },

  // NAVY
  { value: "Navy", label: "Navy", className: "font-bold text-gold-400 bg-military-900/50 mt-1" },
  { value: "Enlisted", label: "Enlisted", className: "pl-6 text-gray-400 font-semibold" },
  { value: "Seaman Recruit", label: "Seaman Recruit", className: "pl-10" },
  { value: "Seaman", label: "Seaman", className: "pl-10" },
  { value: "Leading Seaman", label: "Leading Seaman", className: "pl-10" },
  { value: "Petty Officers", label: "Petty Officers", className: "pl-6 text-gray-400 font-semibold" },
  { value: "Officers", label: "Officers", className: "pl-6 text-gray-400 font-semibold" },

  // OTHERS
  { value: "Others", label: "Others", className: "font-bold text-gold-400 bg-military-900/50 mt-1" }
];

export const MEASUREMENT_OPTIONS = [
  "Kg", "Gram", "Litre", "Quintal", "Meter", "Count", "Pack", "Carton", "Tasa", "Jerkan", "Esir", "Dozen", "Medeb", "Others"
];

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  path: string;
  sha?: string;
  enabled: boolean;
}

export interface Manpower {
  id: string;
  firstName: string;
  lastName: string;
  rank: string;
  command: Command;
  type: ManpowerType;
  startDate: string;
  endDate: string;
  description: string;
  amount?: number; 
}

export interface IncomeItem {
  id: string;
  name: string;
  measurement: string;
  amount: number;
  singlePrice: number;
  description: string;
  date: string;
}

export interface Subsidy {
  id: string;
  type: "Financial" | "Food";
  itemName?: string; 
  source: string;
  amount: number;
  measurement: string; 
  description: string;
  date: string;
}

export interface Transfer {
  id: string;
  amount: number;
  dateFrom: string;
  dateTo: string;
  description: string;
}

export interface Expense {
  id: string;
  category: "Market" | "Wage" | "Other";
  itemName?: string; 
  measurement?: string; 
  amount: number; 
  singlePrice?: number; 
  workerName?: string; 
  workerPosition?: string; 
  reason?: string; 
  description: string;
  date: string;
}

export interface Refund {
  id: string;
  firstName: string;
  lastName: string;
  rank: string;
  command: Command;
  amount: number;
  stopDate: string;
  description: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  date: string; 
  timestamp: string; 
  category: 'Incident' | 'Plan' | 'General';
}

// --- NEW STORE TYPES ---
export interface StoreItem {
  id: string;
  name: string;
  measurement: string;
  amount: number;
  singlePrice: number;
  description: string;
  date: string;
  category: 'inventory' | 'transfer'; // inventory = Item List, transfer = To Next Month
  fromMonth?: string;
  toMonth?: string;
}

export interface StoreOrder {
  id: string;
  itemName: string;
  buyerName?: string; // Buyer Name
  amount: number;
  measurement: string; // Added measurement
  description: string;
  date: string;
  status: 'Pending' | 'Completed';
}

export interface FoodProgramEntry {
  id: string;
  day: string; // Monday, Tuesday...
  breakfast: string;
  lunch: string;
  dinner: string;
}

export interface ProgramSettings {
  title: string;
  subtitle: string;
  footerLeft: string;
  footerRight: string;
}

export interface FoodProgramArchive {
  id: string;
  archivedDate: string;
  name: string;
  program: FoodProgramEntry[];
}

// --- DETAILED RECIPE DATA ---
// UPDATED: Now stores Total Amount for a Base Manpower, per DAY (not per meal)
export interface MealIngredient {
  id: string;
  itemName: string;
  totalAmount: number; // e.g. 50 (Total for the base manpower)
  baseManpower: number; // e.g. 100 (At the time of creation)
  unit: string;
}

// Key is "day" e.g. "Monday"
export type MealIngredientsMap = Record<string, MealIngredient[]>;

// --- RATION HISTORY LOG ---
export interface RationLog {
  id: string;
  day: string; // "Monday"
  dateExecuted: string;
  totalManpower: number;
  itemsDeducted: {
    itemName: string;
    amount: number;
    unit: string;
    priceCalculated: number;
  }[];
  totalCost: number;
}

// --- AI LOGISTICS TYPES ---
export interface LogisticsAnalysis {
    ingredientBreakdown: {
        itemName: string;
        requiredAmount: number;
        unit: string;
        inStock: number;
        status: 'OK' | 'LOW' | 'CRITICAL';
        daysLasting: number;
    }[];
    alerts: string[];
    recommendedOrders: {
        itemName: string;
        amountToBuy: number;
        unit: string;
        reason: string;
    }[];
    optimizedMenu?: FoodProgramEntry[];
}

export interface AppData {
  manpower: Manpower[];
  incomeItems: IncomeItem[];
  subsidies: Subsidy[];
  transfers: Transfer[];
  expenses: Expense[];
  refunds: Refund[];
  notes: Note[];
  storeItems: StoreItem[];
  storeOrders: StoreOrder[];
  foodProgram: FoodProgramEntry[];
  programSettings?: ProgramSettings;
  foodProgramArchive: FoodProgramArchive[];
  mealIngredients?: MealIngredientsMap; // Detailed Recipe Data
  rationHistory?: RationLog[]; // History of executed rations
  secretKey?: string; // Secret Key for read-only date filtering sharing
  securityCredentials?: {
    adminUsername?: string;
    adminPasswordHash?: string;
    userUsername?: string;
    userPasswordHash?: string;
    securityQuestion?: string;
    securityAnswerHash?: string;
    adminCustomized?: string;
    userCustomized?: string;
    secretKey?: string;
  };
}