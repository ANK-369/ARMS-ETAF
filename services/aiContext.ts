/**
 * AI Context Builder for ARMS
 * Standardizes database context and precomputed financial metrics
 * across Search, AI Analytics, and Chat Assistant.
 */

import { AppData, ManpowerType } from '../types';
import { ETHIOPIAN_MONTHS, isSameMonth, getCurrentEthiopianDate } from './ethiopianDate';

export interface AIContextMeta {
  selectedMonth?: string;
  selectedYear?: string;
  isReadOnly?: boolean;
  filePath?: string;
  language?: 'en' | 'am';
}

export interface CollectionWrapper<T = any> {
  page: string;
  recordCount: number;
  records: T;
}

export interface MonthFinancialSummary {
  ethiopianMonth: string;
  ethiopianYear: string;
  monthName: string;
  income: {
    manpower: number;
    itemSales: number;
    financialSubsidies: number;
    transfers: number;
    totalIncome: number;
  };
  expenditure: {
    market: number;
    wage: number;
    other: number;
    refunds: number;
    totalExpenditure: number;
  };
  netBalance: number;
}

export interface AIContextPayload {
  dataSource: {
    type: 'own_data' | 'readonly_shared_data';
    description: string;
    filePath?: string;
  };
  currentPeriod: {
    ethiopianMonth: string;
    ethiopianYear: string;
    currentDate: string;
  };
  monthlySummary: MonthFinancialSummary;
  overallSummary: {
    totalManpowerCount: number;
    totalIncomeItemCount: number;
    totalExpenseCount: number;
    totalStoreItemCount: number;
  };
  collections: {
    manpower: CollectionWrapper;
    incomeItems: CollectionWrapper;
    subsidies: CollectionWrapper;
    transfers: CollectionWrapper;
    expenses: CollectionWrapper;
    refunds: CollectionWrapper;
    notes: CollectionWrapper;
    storeItems: CollectionWrapper;
    storeOrders: CollectionWrapper;
    foodProgram: CollectionWrapper;
    foodProgramArchive: CollectionWrapper;
    mealIngredients: CollectionWrapper;
    rationHistory: CollectionWrapper;
    programSettings: CollectionWrapper;
  };
  auditGuidance: {
    incomeDefinition: string;
    expenditureDefinition: string;
    checkRule: string;
  };
}

/**
 * Builds the canonical AI context from a fresh database instance and session metadata.
 * Strips all sensitive security keys and credentials.
 */
export function buildAIContext(db: AppData, meta?: AIContextMeta): AIContextPayload {
  const [currY, currM] = getCurrentEthiopianDate().split('-');
  const selMonth = meta?.selectedMonth || currM || '01';
  const selYear = meta?.selectedYear || currY || '2017';
  const filterDatePrefix = `${selYear}-${selMonth}`;
  const monthStart = `${filterDatePrefix}-01`;
  const monthEnd = `${filterDatePrefix}-30`;
  const monthIndex = parseInt(selMonth, 10) - 1;
  const monthName = ETHIOPIAN_MONTHS[monthIndex] || `Month ${selMonth}`;

  // 1. MANPOWER (with Home.tsx default amount fallback rules)
  // Payroll or FullCash = 3000, HalfCash = 1500, any other type = 3000 when amount is empty or 0
  const computedManpower = (db.manpower || []).map(m => {
    let effectiveAmount = Number(m.amount);
    if (!effectiveAmount || isNaN(effectiveAmount) || effectiveAmount <= 0) {
      if (m.type === ManpowerType.PAYROLL || m.type === ManpowerType.FULL_CASH) {
        effectiveAmount = 3000;
      } else if (m.type === ManpowerType.HALF_CASH) {
        effectiveAmount = 1500;
      } else {
        effectiveAmount = 3000;
      }
    }
    return {
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      rank: m.rank,
      command: m.command,
      type: m.type,
      startDate: m.startDate,
      endDate: m.endDate,
      description: m.description,
      rawAmount: m.amount,
      contributionAmount: effectiveAmount,
      isIncomeContribution: true
    };
  });

  // 2. INCOME ITEMS (Item Sales: computed income total = amount x singlePrice)
  const computedIncomeItems = (db.incomeItems || []).map(i => {
    const qty = Number(i.amount) || 0;
    const price = Number(i.singlePrice) || 0;
    return {
      id: i.id,
      name: i.name,
      amount: qty,
      measurement: i.measurement,
      singlePrice: price,
      totalIncome: qty * price,
      date: i.date,
      description: i.description
    };
  });

  // 3. SUBSIDIES
  const computedSubsidies = (db.subsidies || []).map(s => {
    const amt = Number(s.amount) || 0;
    return {
      id: s.id,
      type: s.type, // 'Financial' | 'Food'
      source: s.source,
      amount: amt,
      measurement: s.measurement,
      itemName: s.itemName,
      date: s.date,
      description: s.description,
      financialContribution: s.type === 'Financial' ? amt : 0
    };
  });

  // 4. TRANSFERS
  const computedTransfers = (db.transfers || []).map(t => ({
    id: t.id,
    amount: Number(t.amount) || 0,
    dateFrom: t.dateFrom,
    dateTo: t.dateTo,
    description: t.description
  }));

  // 5. EXPENSES (Market: computed cost = amount x singlePrice; Wage/Other: cost = amount)
  const computedExpenses = (db.expenses || []).map(e => {
    const qty = Number(e.amount) || 0;
    const price = Number(e.singlePrice) || 0;
    const totalCost = e.category === 'Market' ? (qty * (price || 1)) : qty;
    return {
      id: e.id,
      category: e.category, // 'Market' | 'Wage' | 'Other'
      itemName: e.itemName,
      workerName: e.workerName,
      reason: e.reason,
      amount: qty,
      singlePrice: price,
      totalCost,
      date: e.date,
      description: e.description
    };
  });

  // 6. REFUNDS
  const computedRefunds = (db.refunds || []).map(r => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    rank: r.rank,
    amount: Number(r.amount) || 0,
    stopDate: r.stopDate,
    description: r.description
  }));

  // 7. NOTES
  const cleanNotes = (db.notes || []).map(n => ({
    id: n.id,
    title: n.title,
    content: n.content,
    date: n.date,
    category: n.category
  }));

  // 8. STORE ITEMS
  const computedStoreItems = (db.storeItems || []).map(s => {
    const qty = Number(s.amount) || 0;
    const price = Number(s.singlePrice) || 0;
    return {
      id: s.id,
      name: s.name,
      measurement: s.measurement,
      amount: qty,
      singlePrice: price,
      totalInventoryValue: qty * price,
      category: s.category,
      date: s.date,
      description: s.description
    };
  });

  // 9. STORE ORDERS
  const cleanStoreOrders = (db.storeOrders || []).map(o => ({
    id: o.id,
    itemName: o.itemName,
    buyerName: o.buyerName,
    amount: Number(o.amount) || 0,
    measurement: o.measurement,
    description: o.description,
    date: o.date,
    status: o.status
  }));

  // 10. FOOD PROGRAM
  const cleanFoodProgram = db.foodProgram || [];

  // 11. FOOD PROGRAM ARCHIVE
  const cleanFoodProgramArchive = db.foodProgramArchive || [];

  // 12. MEAL INGREDIENTS
  const cleanMealIngredients = db.mealIngredients || {};

  // 13. RATION HISTORY
  const cleanRationHistory = db.rationHistory || [];

  // 14. PROGRAM SETTINGS
  const cleanProgramSettings = db.programSettings || {
    title: 'ARMS Food Program',
    subtitle: 'Standard Ration Schedule',
    footerLeft: '',
    footerRight: ''
  };

  // --- MONTHLY SUMMARY CALCULATIONS (Matching Home.tsx exact formulas) ---
  // Manpower active in month (overlap: start <= monthEnd && end >= monthStart)
  const monthlyManpower = computedManpower.filter(m => {
    if (!m.startDate || !m.endDate) return true;
    return m.startDate <= monthEnd && m.endDate >= monthStart;
  });
  const manpowerIncomeTotal = monthlyManpower.reduce((acc, m) => acc + m.contributionAmount, 0);

  // Income items in month
  const monthlyIncomeItems = computedIncomeItems.filter(i => isSameMonth(i.date, monthStart));
  const itemSalesIncomeTotal = monthlyIncomeItems.reduce((acc, i) => acc + i.totalIncome, 0);

  // Subsidies in month (Financial only counted toward monetary income)
  const monthlySubsidies = computedSubsidies.filter(s => isSameMonth(s.date, monthStart));
  const financialSubsidiesTotal = monthlySubsidies.reduce((acc, s) => acc + s.financialContribution, 0);

  // Transfers to selected month name
  const monthlyTransfers = computedTransfers.filter(t => t.dateTo === monthName);
  const transfersTotal = monthlyTransfers.reduce((acc, t) => acc + t.amount, 0);

  const totalIncome = manpowerIncomeTotal + itemSalesIncomeTotal + financialSubsidiesTotal + transfersTotal;

  // Monthly Expenses
  const monthlyExpenses = computedExpenses.filter(e => isSameMonth(e.date, monthStart));
  const marketExpenditureTotal = monthlyExpenses.filter(e => e.category === 'Market').reduce((acc, e) => acc + e.totalCost, 0);
  const wageExpenditureTotal = monthlyExpenses.filter(e => e.category === 'Wage').reduce((acc, e) => acc + e.totalCost, 0);
  const otherExpenditureTotal = monthlyExpenses.filter(e => e.category === 'Other').reduce((acc, e) => acc + e.totalCost, 0);

  // Monthly Refunds
  const monthlyRefunds = computedRefunds.filter(r => isSameMonth(r.stopDate, monthStart));
  const refundsExpenditureTotal = monthlyRefunds.reduce((acc, r) => acc + r.amount, 0);

  const totalExpenditure = marketExpenditureTotal + wageExpenditureTotal + otherExpenditureTotal + refundsExpenditureTotal;
  const netBalance = totalIncome - totalExpenditure;

  const isReadOnly = !!meta?.isReadOnly;
  const dataSource = {
    type: isReadOnly ? ('readonly_shared_data' as const) : ('own_data' as const),
    description: isReadOnly
      ? `Read-only shared snapshot (${meta?.filePath || 'remote backup'})`
      : 'Local primary terminal database (read/write)',
    filePath: meta?.filePath || undefined
  };

  return {
    dataSource,
    currentPeriod: {
      ethiopianMonth: selMonth,
      ethiopianYear: selYear,
      currentDate: getCurrentEthiopianDate()
    },
    monthlySummary: {
      ethiopianMonth: selMonth,
      ethiopianYear: selYear,
      monthName,
      income: {
        manpower: manpowerIncomeTotal,
        itemSales: itemSalesIncomeTotal,
        financialSubsidies: financialSubsidiesTotal,
        transfers: transfersTotal,
        totalIncome
      },
      expenditure: {
        market: marketExpenditureTotal,
        wage: wageExpenditureTotal,
        other: otherExpenditureTotal,
        refunds: refundsExpenditureTotal,
        totalExpenditure
      },
      netBalance
    },
    overallSummary: {
      totalManpowerCount: computedManpower.length,
      totalIncomeItemCount: computedIncomeItems.length,
      totalExpenseCount: computedExpenses.length,
      totalStoreItemCount: computedStoreItems.length
    },
    collections: {
      manpower: {
        page: 'Income > Manpower (#/income?tab=manpower)',
        recordCount: computedManpower.length,
        records: computedManpower
      },
      incomeItems: {
        page: 'Income > Items Sold (#/income?tab=item)',
        recordCount: computedIncomeItems.length,
        records: computedIncomeItems
      },
      subsidies: {
        page: 'Income > Subsidies (#/income?tab=subsidy)',
        recordCount: computedSubsidies.length,
        records: computedSubsidies
      },
      transfers: {
        page: 'Income > Budget Transfer (#/income?tab=transfer)',
        recordCount: computedTransfers.length,
        records: computedTransfers
      },
      expenses: {
        page: 'Expenditure > Market / Wage / Other (#/expenditure)',
        recordCount: computedExpenses.length,
        records: computedExpenses
      },
      refunds: {
        page: 'Expenditure > Refunds (#/expenditure?tab=refund)',
        recordCount: computedRefunds.length,
        records: computedRefunds
      },
      notes: {
        page: 'Notebook (#/notebook)',
        recordCount: cleanNotes.length,
        records: cleanNotes
      },
      storeItems: {
        page: 'Store & Inventory > Item List (#/store?tab=items)',
        recordCount: computedStoreItems.length,
        records: computedStoreItems
      },
      storeOrders: {
        page: 'Store & Inventory > Orders (#/store?tab=order)',
        recordCount: cleanStoreOrders.length,
        records: cleanStoreOrders
      },
      foodProgram: {
        page: 'Store & Inventory > Weekly Food Program (#/store?tab=program)',
        recordCount: cleanFoodProgram.length,
        records: cleanFoodProgram
      },
      foodProgramArchive: {
        page: 'Store & Inventory > Food Program Archive (#/store?tab=program)',
        recordCount: cleanFoodProgramArchive.length,
        records: cleanFoodProgramArchive
      },
      mealIngredients: {
        page: 'Store & Inventory > Recipe Database (#/store?tab=program)',
        recordCount: Object.keys(cleanMealIngredients).length,
        records: cleanMealIngredients
      },
      rationHistory: {
        page: 'Store & Inventory > Ration Execution Log (#/store?tab=program)',
        recordCount: cleanRationHistory.length,
        records: cleanRationHistory
      },
      programSettings: {
        page: 'Store & Inventory > Program Settings (#/store?tab=program)',
        recordCount: cleanProgramSettings ? 1 : 0,
        records: cleanProgramSettings
      }
    },
    auditGuidance: {
      incomeDefinition: 'INCOME encompasses four revenue streams: (1) Manpower contributions, (2) Store item sales, (3) Financial subsidies, (4) Transferred surplus budget. If ANY of these collections have records or amounts, total income is strictly greater than 0.',
      expenditureDefinition: 'EXPENDITURE encompasses (1) Market ration purchases (amount x singlePrice), (2) Worker wages, (3) Operational miscellaneous expenses, and (4) Personnel refunds.',
      checkRule: 'Before declaring "no records" or "no income/expenditure", you MUST inspect every single related collection above and explicitly report the record count and name of each collection checked.'
    }
  };
}
