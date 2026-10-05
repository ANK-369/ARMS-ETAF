/**
 * ARMS Site Map & Navigation Registry
 * Built strictly from the application routing and UI component labels.
 */

export interface SiteMapTab {
  id: string;
  labelEn: string;
  labelAm: string;
  link: string; // e.g. #/income?tab=manpower
  navPath: string; // e.g. /income?tab=manpower
  descriptionEn: string;
  descriptionAm: string;
}

export interface SiteMapSection {
  id: string;
  labelEn: string;
  labelAm: string;
  link: string; // e.g. #/dbadmin?section=access_ai
  navPath: string; // e.g. /dbadmin?section=access_ai
  descriptionEn: string;
  descriptionAm: string;
}

export interface SiteMapRoute {
  path: string; // e.g. /home
  link: string; // e.g. #/home
  labelEn: string;
  labelAm: string;
  role: 'all' | 'user' | 'admin';
  descriptionEn: string;
  descriptionAm: string;
  tabs?: SiteMapTab[];
  sections?: SiteMapSection[];
}

export const SITE_MAP: SiteMapRoute[] = [
  {
    path: '/home',
    link: '#/home',
    labelEn: 'Dashboard',
    labelAm: 'ዋና ገጽ',
    role: 'user',
    descriptionEn: 'View net financial position, monthly inflow/outflow, active manpower headcount, daily averages, cash runway, monthly inventory value, and recent market price volatility.',
    descriptionAm: 'የፋይናንስ ቁመና፣ የወርሃዊ ገቢና ወጪ፣ በስራ ላይ ያለ የሰው ኃይል፣ ዕለታዊ አማካይ፣ የካሽ ዕድሜ፣ የግምጃ ቤት ዋጋ እና የገበያ ዋጋ ንረትን ይመልከቱ።'
  },
  {
    path: '/income',
    link: '#/income',
    labelEn: 'Income',
    labelAm: 'ገቢ',
    role: 'user',
    descriptionEn: 'Manage all revenue streams: military personnel contributions, store item sales, subsidies, and budget transfers from previous months.',
    descriptionAm: 'ሁሉንም የገቢ ምንጮች ያስተዳድሩ፦ የአባላት መዋጮ፣ የተሸጡ ዕቃዎች፣ ድጎማዎች እና የበጀት ዝውውር።',
    tabs: [
      {
        id: 'manpower',
        labelEn: 'Manpower',
        labelAm: 'የሰው ኃይል',
        link: '#/income?tab=manpower',
        navPath: '/income?tab=manpower',
        descriptionEn: 'Register military personnel contributions with rank, command, type (Payroll, Full Cash, Half Cash, Transient), dates, and amount.',
        descriptionAm: 'የአባላት መዋጮን በማዕረግ፣ በክፍል፣ በአይነት (Payroll፣ Full Cash፣ Half Cash፣ Transient)፣ በቀን እና በመጠን ይመዝግቡ።'
      },
      {
        id: 'item',
        labelEn: 'Items Sold',
        labelAm: 'የተሸጡ ዕቃዎች',
        link: '#/income?tab=item',
        navPath: '/income?tab=item',
        descriptionEn: 'Record income from store and ration item sales with item name, quantity, unit, and single price.',
        descriptionAm: 'የዕቃ እና የስንቅ ሽያጭ ገቢን በዕቃ ስም፣ ብዛት፣ መለኪያ እና ነጠላ ዋጋ ይመዝግቡ።'
      },
      {
        id: 'subsidy',
        labelEn: 'Subsidies',
        labelAm: 'ድጎማዎች',
        link: '#/income?tab=subsidy',
        navPath: '/income?tab=subsidy',
        descriptionEn: 'Record external financial or material/food aid received from higher commands or donors.',
        descriptionAm: 'ከበላይ አመራር ወይም ከለጋሾች የተገኘ የገንዘብ ወይም የስንቅ ድጎማን ይመዝግቡ።'
      },
      {
        id: 'transfer',
        labelEn: 'Budget Transfer',
        labelAm: 'የበጀት ዝውውር',
        link: '#/income?tab=transfer',
        navPath: '/income?tab=transfer',
        descriptionEn: 'Record transferred surplus budget or remaining funds brought forward from previous Ethiopian months.',
        descriptionAm: 'ካለፉት ወራት የተላለፈ ትርፍ በጀት ወይም ቀሪ ገንዘብን ወደ ወቅታዊው ወር ያዛውሩ።'
      }
    ]
  },
  {
    path: '/expenditure',
    link: '#/expenditure',
    labelEn: 'Expenditure',
    labelAm: 'ወጪ',
    role: 'user',
    descriptionEn: 'Manage all outgoing funds: market food and supply purchases, civilian worker wages, operational costs, and personnel refunds.',
    descriptionAm: 'ሁሉንም የወጪ ዓይነቶች ያስተዳድሩ፦ የገበያ ግዢዎች፣ የሰራተኞች ደመወዝ፣ ልዩ ልዩ ወጪዎች እና ተመላሽ ሂሳቦች።',
    tabs: [
      {
        id: 'market',
        labelEn: 'Market Purchases',
        labelAm: 'የገበያ ግዢ',
        link: '#/expenditure?tab=market',
        navPath: '/expenditure?tab=market',
        descriptionEn: 'Record market purchases for fresh produce, grain, meat, and dry food rations with item name, quantity, unit price, date, and receipt notes.',
        descriptionAm: 'የገበያ ግዢዎችን (እህል፣ ስጋ፣ አትክልት እና ስንቅ) በዕቃ ስም፣ ብዛት፣ ነጠላ ዋጋ፣ ቀን እና ደረሰኝ ይመዝግቡ።'
      },
      {
        id: 'wage',
        labelEn: 'Worker Wages',
        labelAm: 'የሰራተኛ ደመወዝ',
        link: '#/expenditure?tab=wage',
        navPath: '/expenditure?tab=wage',
        descriptionEn: 'Record service payments, contractor fees, and monthly wages for civilian staff and mess workers.',
        descriptionAm: 'የሲቪል ሰራተኞች እና የወጥ ቤት ሰራተኞች ወርሃዊ ደመወዝ እና የአገልግሎት ክፍያዎችን ይመዝግቡ።'
      },
      {
        id: 'other',
        labelEn: 'Operational Expenses',
        labelAm: 'ልዩ ልዩ ወጪዎች',
        link: '#/expenditure?tab=other',
        navPath: '/expenditure?tab=other',
        descriptionEn: 'Record utility bills, transport, vehicle maintenance, kitchen equipment, and miscellaneous command operational costs.',
        descriptionAm: 'የመጓጓዣ፣ ጥገና፣ መብራትና ውሃ እና ሌሎች የክፍሉ ልዩ ልዩ የስራ ማስኬጃ ወጪዎችን ይመዝግቡ።'
      },
      {
        id: 'refund',
        labelEn: 'Refunds',
        labelAm: 'ተመላሽ',
        link: '#/expenditure?tab=refund',
        navPath: '/expenditure?tab=refund',
        descriptionEn: 'Issue and log food ration and allowance refunds for personnel transferred, discharged, or placed on leave.',
        descriptionAm: 'የስራ ቦታ ለቀየሩ፣ ለተሰናበቱ ወይም ፍቃድ ለወጡ አባላት የተደረጉ የተመላሽ ክፍያዎችን ይመዝግቡ።'
      }
    ]
  },
  {
    path: '/audit',
    link: '#/audit',
    labelEn: 'Audit Center',
    labelAm: 'ኦዲት ማዕከል',
    role: 'user',
    descriptionEn: 'Comprehensive financial and logistics auditing suite with real-time automated reports, printable ledgers, manual audit adjustments, and historical price logs.',
    descriptionAm: 'አጠቃላይ የፋይናንስ እና ሎጅስቲክስ ኦዲት ማዕከል፦ አውቶማቲክ ሪፖርቶች፣ ሊታተሙ የሚችሉ መዝገቦች፣ ማኑዋል ኦዲት እና የገበያ ዋጋ ታሪክ።',
    tabs: [
      {
        id: 'automated',
        labelEn: 'Automated Audit',
        labelAm: 'አውቶማቲክ ኦዲት',
        link: '#/audit?tab=automated',
        navPath: '/audit?tab=automated',
        descriptionEn: 'Instant real-time ledger computing total monthly income, expenditure, net balance, manpower roster, and exportable printable audit documents.',
        descriptionAm: 'ጠቅላላ ወርሃዊ ገቢ፣ ወጪ፣ ቀሪ ሂሳብ፣ የሰው ኃይል እና ለህትመት ዝግጁ የሆኑ ኦፊሴላዊ የኦዲት ሰነዶችን በቅጽበት የሚያዘጋጅ አውቶማቲክ ገጽ።'
      },
      {
        id: 'manual',
        labelEn: 'Manual Audit',
        labelAm: 'ማኑዋል ኦዲት',
        link: '#/audit?tab=manual',
        navPath: '/audit?tab=manual',
        descriptionEn: 'Enter manual audit reconciliation numbers, auditor notes, official committee signatures, and custom audit overrides.',
        descriptionAm: 'የማኑዋል ኦዲት ማስተካከያ ቁጥሮችን፣ የኦዲተሩን አስተያየት እና የኮሚቴ ፊርማዎችን የሚያስቀምጡበት ገጽ።'
      },
      {
        id: 'marketHistory',
        labelEn: 'Market History',
        labelAm: 'የገበያ ታሪክ',
        link: '#/audit?tab=marketHistory',
        navPath: '/audit?tab=marketHistory',
        descriptionEn: 'Browse chronological history of all market purchases across months and inspect price deviations.',
        descriptionAm: 'የሁሉም ወራት የገበያ ግዢዎች ታሪክ እና የዋጋ ልዩነቶችን ይመልከቱ።'
      },
      {
        id: 'calc',
        labelEn: 'Calculators',
        labelAm: 'ስሌቶች',
        link: '#/audit?tab=calc',
        navPath: '/audit?tab=calc',
        descriptionEn: 'Military ration estimation tools, headcount meal calculators, and budget projection scratchpads.',
        descriptionAm: 'የስንቅ መጠን መገመቻ፣ የዕለታዊ ምግብ ስሌት እና የበጀት ማቀጃ ረዳት መሳሪያዎች።'
      }
    ]
  },
  {
    path: '/store',
    link: '#/store',
    labelEn: 'Store & Inventory',
    labelAm: 'ግምጃ ቤት',
    role: 'user',
    descriptionEn: 'Warehouse supply depot, ration item tracking, inventory management, weekly menu programs, recipe deduction engine, and logistics AI analysis.',
    descriptionAm: 'የስንቅ መጋዘን ዕቃዎች ክምችት፣ የዕቃ ዝርዝር፣ የትዕዛዝ ክትትል፣ ሳምንታዊ የምግብ ፕሮግራም እና የ AI ሎጅስቲክስ ትንታኔ።',
    tabs: [
      {
        id: 'items',
        labelEn: 'Item List',
        labelAm: 'ዕቃ ዝርዝር',
        link: '#/store?tab=items',
        navPath: '/store?tab=items',
        descriptionEn: 'Add, view, and update inventory items in stock, current amounts, units of measurement, unit prices, and total inventory value.',
        descriptionAm: 'በመጋዘን ውስጥ ያሉ ዕቃዎችን፣ ብዛታቸውን፣ የመለኪያ ዓይነት፣ ነጠላ ዋጋ እና ጠቅላላ ዋጋ ይመዝግቡ እና ይቆጣጠሩ።'
      },
      {
        id: 'order',
        labelEn: 'Orders',
        labelAm: 'ትዕዛዞች',
        link: '#/store?tab=order',
        navPath: '/store?tab=order',
        descriptionEn: 'Create requisition orders for supplies, track buyer names, and mark orders as Pending or Completed.',
        descriptionAm: 'የዕቃ ግዢ ወይም መቀበያ ትዕዛዞችን ያውጡ፣ የገዢውን ስም ይመዝግቡ፣ እንዲሁም የትዕዛዙን ሁኔታ (Pending / Completed) ይከታተሉ።'
      },
      {
        id: 'transfer',
        labelEn: 'Transfers to Next Month',
        labelAm: 'ወደ ቀጣይ ወር ዝውውር',
        link: '#/store?tab=transfer',
        navPath: '/store?tab=transfer',
        descriptionEn: 'Roll over remaining food ration stocks from the current month to the next operational month.',
        descriptionAm: 'በወሩ መጨረሻ የቀሩ የስንቅ እና የዕቃ ክምችቶችን ወደ ቀጣዩ ወር መዝገብ ያስተላልፉ።'
      },
      {
        id: 'program',
        labelEn: 'Weekly Food Program',
        labelAm: 'ሳምንታዊ የምግብ ፕሮግራም',
        link: '#/store?tab=program',
        navPath: '/store?tab=program',
        descriptionEn: 'Configure daily meals (Breakfast, Lunch, Dinner) from Monday to Sunday, set base headcount recipes, and execute live ration deductions.',
        descriptionAm: 'ከሰኞ እስከ እሁድ የቁርስ፣ ምሳ እና እራት ሜኑ ያዋቅሩ፣ የንጥረ-ነገር አዘገጃጀት (Recipe) ያስቀምጡ እና ዕለታዊ ስንቅ ይቀንሱ።'
      },
      {
        id: 'logistics',
        labelEn: 'Logistics AI Analyst',
        labelAm: 'የሎጅስቲክስ AI ተንታኝ',
        link: '#/store?tab=logistics',
        navPath: '/store?tab=logistics',
        descriptionEn: 'AI engine analyzes recipe requirements against current stock, flags critical shortages, predicts runway days, and suggests optimal purchase quantities.',
        descriptionAm: 'የአሁኑን የመጋዘን ክምችት ከሳምንታዊው ሜኑ ጋር በማወዳደር ያለቀባቸውን ዕቃዎች የሚለይ፣ ስንቁ የሚያቆይበትን ቀን የሚያሰላ እና የግዢ ምክር የሚሰጥ AI።'
      }
    ]
  },
  {
    path: '/search',
    link: '#/search',
    labelEn: 'Search & AI',
    labelAm: 'ፍለጋ እና AI',
    role: 'user',
    descriptionEn: 'Unified search engine across all records, historical item price trend charts, and conversational military logistics AI Assistant.',
    descriptionAm: 'በሁሉም መረጃዎች ውስጥ ፈጣን ፍለጋ፣ የዕቃዎች የገበያ ዋጋ አዝማሚያ ግራፍ እና የ AI ውይይት ረዳት።',
    tabs: [
      {
        id: 'search',
        labelEn: 'Global Search',
        labelAm: 'አጠቃላይ ፍለጋ',
        link: '#/search?tab=search',
        navPath: '/search?tab=search',
        descriptionEn: 'Search across manpower, sales, expenses, subsidies, transfers, and refunds with duplicate detection filters.',
        descriptionAm: 'በሰው ኃይል፣ በሽያጭ፣ በወጪዎች፣ በድጎማዎች እና በተመላሾች ውስጥ ቁልፍ ቃላትን ይፈልጉ፣ ተደጋጋሚ መረጃዎችን ይለዩ።'
      },
      {
        id: 'trends',
        labelEn: 'Market Trends',
        labelAm: 'የገበያ አዝማሚያ',
        link: '#/search?tab=trends',
        navPath: '/search?tab=trends',
        descriptionEn: 'Interactive graph plotting purchase price fluctuations and volume trends for any chosen market item.',
        descriptionAm: 'የማንኛውንም ዕቃ የዋጋ መዋዠቅ እና የግዢ መጠን ታሪክ በግራፍ ይመልከቱ።'
      },
      {
        id: 'chat',
        labelEn: 'AI Assistant',
        labelAm: 'የ AI ረዳት',
        link: '#/search?tab=chat',
        navPath: '/search?tab=chat',
        descriptionEn: 'Ask conversational questions about database records, receive real-time financial tallies, and get direct clickable navigation links to any section.',
        descriptionAm: 'ስለ ዳታቤዝ መረጃዎች በጽሁፍ ይጠይቁ፣ ትክክለኛ የቁጥር ስሌቶችን ያግኙ፣ እንዲሁም ወደ ማንኛውም የሲስተሙ ክፍል የሚወስዱ ተጫኝ ሊንኮችን ይቀበሉ።'
      }
    ]
  },
  {
    path: '/dbadmin',
    link: '#/dbadmin',
    labelEn: 'Database Administration',
    labelAm: 'ዳታቤዝ አስተዳደር',
    role: 'user',
    descriptionEn: 'Manage GitHub cloud synchronization, backup and restore, security credentials, security question recovery, Gemini AI API key, and data wipe/danger zone.',
    descriptionAm: 'የ GitHub ክላውድ ማመሳሰል፣ የዳታ ባካፕ እና መልሶ ማግኛ፣ የተርሚናል ይለፍ ቃል፣ የደህንነት ጥያቄ፣ የ Gemini API ቁልፍ እና ስርዓቱን አዲስ የማድረግ አደገኛ ዞን።',
    sections: [
      {
        id: 'sync_backup',
        labelEn: 'GitHub Cloud Sync and System Backup & Restore Data',
        labelAm: 'GitHub ክላውድ ማመሳሰል እና ዳታ ማደስ/መጠባበቂያ',
        link: '#/dbadmin?section=sync_backup',
        navPath: '/dbadmin?section=sync_backup',
        descriptionEn: 'Set up GitHub repository, owner, personal access token (PAT), automatic cloud backups, manual push/pull, and JSON export/import.',
        descriptionAm: 'የ GitHub ማከማቻ ስም፣ ባለቤት፣ ሚስጥራዊ ቶከን (PAT) በማስገባት አውቶማቲክ ባካፕ ያዘጋጁ፣ ወይም የ JSON ፋይል ያውርዱ/ይጫኑ።'
      },
      {
        id: 'access_ai',
        labelEn: 'System Access and AI Configuration',
        labelAm: 'የስርዓት መግቢያ እና AI ማዋቀሪያ',
        link: '#/dbadmin?section=access_ai',
        navPath: '/dbadmin?section=access_ai',
        descriptionEn: 'Change terminal administrative username and password, configure security recovery question and answer, and configure/test Gemini AI Engine API key.',
        descriptionAm: 'የተርሚናል መለያ ስም እና የይለፍ ቃል ይቀይሩ፣ የይለፍ ቃል መርሻ የደህንነት ጥያቄ እና መልስ ያዋቅሩ፣ እንዲሁም የ Gemini AI API ቁልፍ ያስቀምጡና ይሞክሩ።'
      },
      {
        id: 'fresh_danger',
        labelEn: 'System Fresh Start and Danger Zone',
        labelAm: 'ስርዓቱን አዲስ ጅምር ማድረግ እና አደገኛ ዞን',
        link: '#/dbadmin?section=fresh_danger',
        navPath: '/dbadmin?section=fresh_danger',
        descriptionEn: 'Clear selected database tables, delete specific historical months, or execute a factory fresh start wipe of local storage.',
        descriptionAm: 'የተመረጡ የዳታቤዝ ክፍሎችን ባዶ ያድርጉ፣ የተወሰኑ ወራትን ያጥፉ ወይም አጠቃላይ ሲስተሙን እንደ አዲስ ባዶ ያድርጉ።'
      }
    ]
  },
  {
    path: '/notebook',
    link: '#/notebook',
    labelEn: 'Notebook',
    labelAm: 'ማስታወሻ',
    role: 'user',
    descriptionEn: 'Officer memo pad, command directives, meeting notes, operational reminders, and categorization tags.',
    descriptionAm: 'የአዛዥ ማስታወሻ ደብተር፣ የስራ መመሪያዎች፣ የስብሰባ ቃለ-ጉባኤዎች እና የስራ ማስታወሻዎች።'
  },
  {
    path: '/editor',
    link: '#/editor',
    labelEn: 'Data Editor',
    labelAm: 'ዳታ ማስተካከያ',
    role: 'user',
    descriptionEn: 'Direct table-based data inspector and editor for advanced editing of raw entries across all database collections.',
    descriptionAm: 'በሁሉም የዳታቤዝ ክፍሎች ውስጥ ያሉ መዝገቦችን በቀጥታ በሰንጠረዥ ለማየት እና ለማስተካከል የሚያስችል ዳታ ኤዲተር።'
  },
  {
    path: '/about',
    link: '#/about',
    labelEn: 'About Creator',
    labelAm: 'ስለ አዘጋጁ',
    role: 'user',
    descriptionEn: 'Information about the creator, software engineering background, contact details, and system architecture.',
    descriptionAm: 'ስለ ሲስተም አዘጋጁ፣ የሶፍትዌር ኢንጂነሪንግ ሙያዊ መረጃ እና የግንኙነት አድራሻዎች።'
  },
  {
    path: '/login',
    link: '#/login',
    labelEn: 'Login & Password Recovery',
    labelAm: 'መግቢያ እና የይለፍ ቃል መልሶ ማግኛ',
    role: 'all',
    descriptionEn: 'Terminal authentication screen with credentials verification and "Forgot Password?" Account Recovery Terminal using the configured security recovery challenge.',
    descriptionAm: 'ወደ ሲስተሙ መግቢያ ገጽ፤ እንዲሁም "የይለፍ ቃል ረሱ?" በሚለው ተርሚናል የደህንነት ጥያቄን በመመለስ የይለፍ ቃልን በቀጥታ መቀየሪያ።'
  },
  {
    path: '/admin-dashboard',
    link: '#/admin-dashboard',
    labelEn: 'Admin Dashboard',
    labelAm: 'የአስተዳዳሪ ማዕከል',
    role: 'admin',
    descriptionEn: 'Restricted administrative command center for multi-user backup aggregation, cross-terminal audits, centralized user security, and executive AI summaries.',
    descriptionAm: 'ለአስተዳዳሪ ብቻ የተፈቀደ የቁጥጥር ማዕከል፦ የሁሉንም ተጠቃሚዎች ፋይል ማጠቃለል፣ የተጠቃሚዎች ደህንነት ቁጥጥር እና የላቀ የ AI ትንታኔ።',
    tabs: [
      {
        id: 'overview',
        labelEn: 'Command Matrix Overview',
        labelAm: 'አጠቃላይ ማጠቃለያ',
        link: '#/admin-dashboard?tab=overview',
        navPath: '/admin-dashboard?tab=overview',
        descriptionEn: 'Cross-user aggregated troop headcount, total multi-command inflow/outflow, and detected GitHub backup repositories.',
        descriptionAm: 'የሁሉም ተጠቃሚዎች ድምር የሰው ኃይል፣ አጠቃላይ ገቢና ወጪ እና የተገኙ የ GitHub ባካፕ ፋይሎች ማጠቃለያ።'
      },
      {
        id: 'manpower',
        labelEn: 'Personnel Rosters',
        labelAm: 'የሰው ኃይል ምደባ',
        link: '#/admin-dashboard?tab=manpower',
        navPath: '/admin-dashboard?tab=manpower',
        descriptionEn: 'Fleet-wide active military personnel allocation and command distribution across all terminals.',
        descriptionAm: 'በሁሉም ተርሚናሎች የተመዘገቡ አባላት ዝርዝር እና የክፍል ምደባ ኦዲት።'
      },
      {
        id: 'market',
        labelEn: 'Market Pricing',
        labelAm: 'የገበያ ዋጋ ኦዲት',
        link: '#/admin-dashboard?tab=market',
        navPath: '/admin-dashboard?tab=market',
        descriptionEn: 'Cross-unit food and ration market purchase comparison to detect pricing anomalies or overspending.',
        descriptionAm: 'የተለያዩ ተጠቃሚዎች የገዙበትን የገበያ ዋጋ በማነፃፀር ያልተገባ የዋጋ ጭማሪን የመቆጣጠሪያ ኦዲት።'
      },
      {
        id: 'finance',
        labelEn: 'Unified Command Ledger',
        labelAm: 'የገቢና ወጪ ቁጥጥር',
        link: '#/admin-dashboard?tab=finance',
        navPath: '/admin-dashboard?tab=finance',
        descriptionEn: 'Unified central command balance sheet aggregating all incomes, subsidies, transfers, and expenses.',
        descriptionAm: 'የሁሉንም ክፍሎች ገቢ፣ ድጎማ፣ ዝውውር እና ወጪ በአንድ ላይ የሚያጠቃልል ማዕከላዊ የፋይናንስ መዝገብ።'
      },
      {
        id: 'store',
        labelEn: 'Inventory & Stocks',
        labelAm: 'መጋዘን እና ስንቅ',
        link: '#/admin-dashboard?tab=store',
        navPath: '/admin-dashboard?tab=store',
        descriptionEn: 'Multi-depot warehouse stock inspection and centralized ration holdings report.',
        descriptionAm: 'የሁሉም ክፍሎች የመጋዘን ክምችት እና የስንቅ ሁኔታ ማጠቃለያ።'
      },
      {
        id: 'security',
        labelEn: 'Credentials & GitHub',
        labelAm: 'ደህንነት እና ክላውድ',
        link: '#/admin-dashboard?tab=security',
        navPath: '/admin-dashboard?tab=security',
        descriptionEn: 'Manage system-wide administrator and user passwords, view credential audit, and configure central GitHub repository.',
        descriptionAm: 'የአስተዳዳሪ እና የተጠቃሚ ይለፍ ቃላትን ይቀይሩ፣ የደህንነት ሁኔታን ኦዲት ያድርጉ፣ ማዕከላዊ GitHub ያዋቅሩ።'
      },
      {
        id: 'ai',
        labelEn: 'Executive AI Analyst',
        labelAm: 'የላቀ AI ረዳት',
        link: '#/admin-dashboard?tab=ai',
        navPath: '/admin-dashboard?tab=ai',
        descriptionEn: 'Generate comprehensive multi-command executive AI briefings and chat directly with the Administrative AI Core.',
        descriptionAm: 'የሁሉንም ተጠቃሚዎች ዳታ በአንድ ላይ የሚያጠቃልል ከፍተኛ የ AI ሪፖርት ያመንጩ፣ ከአስተዳዳሪ AI ጋር ይወያዩ።'
      },
      {
        id: 'about',
        labelEn: 'About Developer',
        labelAm: 'ስለ አበልጻጊው',
        link: '#/admin-dashboard?tab=about',
        navPath: '/admin-dashboard?tab=about',
        descriptionEn: 'Administrative technical specs and system engineering credentials.',
        descriptionAm: 'የአስተዳዳሪ ቴክኒካል መረጃዎች እና የሲስተም አበልጻጊው ዝርዝር።'
      }
    ]
  }
];

/**
 * Text instruction block for AI chat model with exact paths and deep links
 */
export function getSiteMapPromptText(): string {
  let text = "ARMS APPLICATION SITE MAP, REAL SCREENS, TABS & NAVIGATION DEEP-LINKS:\n";
  text += "When answering questions about where features are or how to navigate the application, you MUST answer from this site map ONLY using the exact on-screen breadcrumbs and output clickable HTML navigation links in the exact format: <a href=\"#/path?param=value\" data-nav=\"/path?param=value\">Label</a>.\n\n";

  for (const route of SITE_MAP) {
    text += `• PAGE: ${route.labelEn} (${route.labelAm}) [Role: ${route.role}] -> Link: <a href="${route.link}" data-nav="${route.path}">${route.labelEn}</a>\n`;
    text += `  Overview: ${route.descriptionEn} / ${route.descriptionAm}\n`;
    if (route.tabs) {
      for (const tab of route.tabs) {
        text += `  - TAB: ${tab.labelEn} (${tab.labelAm}) -> Link: <a href="${tab.link}" data-nav="${tab.navPath}">${route.labelEn} > ${tab.labelEn}</a>\n`;
        text += `    Purpose: ${tab.descriptionEn} / ${tab.descriptionAm}\n`;
      }
    }
    if (route.sections) {
      for (const sec of route.sections) {
        text += `  - SECTION: ${sec.labelEn} (${sec.labelAm}) -> Link: <a href="${sec.link}" data-nav="${sec.navPath}">${route.labelEn} > ${sec.labelEn}</a>\n`;
        text += `    Purpose: ${sec.descriptionEn} / ${sec.descriptionAm}\n`;
      }
    }
  }

  text += `\nKEY USER TASKS DIRECTORY:
1. Add Income:
   - Go to Income (<a href="#/income" data-nav="/income">Income</a>).
   - For personnel/troop contribution: Income > Manpower (<a href="#/income?tab=manpower" data-nav="/income?tab=manpower">Income > Manpower</a>)
   - For store ration/item sales: Income > Items Sold (<a href="#/income?tab=item" data-nav="/income?tab=item">Income > Items Sold</a>)
   - For aid/subsidies: Income > Subsidies (<a href="#/income?tab=subsidy" data-nav="/income?tab=subsidy">Income > Subsidies</a>)
   - For budget transfers: Income > Budget Transfer (<a href="#/income?tab=transfer" data-nav="/income?tab=transfer">Income > Budget Transfer</a>)
   - Amharic: ገቢ ለመመዝገብ ወደ ገቢ (<a href="#/income" data-nav="/income">ገቢ</a>) ይሂዱ። ለሰው ኃይል መዋጮ፦ ገቢ > የሰው ኃይል (<a href="#/income?tab=manpower" data-nav="/income?tab=manpower">ገቢ > የሰው ኃይል</a>)፤ ለሽያጭ፦ ገቢ > የተሸጡ ዕቃዎች (<a href="#/income?tab=item" data-nav="/income?tab=item">ገቢ > የተሸጡ ዕቃዎች</a>)፤ ለድጎማ፦ ገቢ > ድጎማዎች (<a href="#/income?tab=subsidy" data-nav="/income?tab=subsidy">ገቢ > ድጎማዎች</a>)፤ ለዝውውር፦ ገቢ > የበጀት ዝውውር (<a href="#/income?tab=transfer" data-nav="/income?tab=transfer">ገቢ > የበጀት ዝውውር</a>)።

2. Add Expenditure:
   - Go to Expenditure (<a href="#/expenditure" data-nav="/expenditure">Expenditure</a>).
   - For market ration purchases: Expenditure > Market Purchases (<a href="#/expenditure?tab=market" data-nav="/expenditure?tab=market">Expenditure > Market Purchases</a>)
   - For worker wages: Expenditure > Worker Wages (<a href="#/expenditure?tab=wage" data-nav="/expenditure?tab=wage">Expenditure > Worker Wages</a>)
   - For operational costs: Expenditure > Operational Expenses (<a href="#/expenditure?tab=other" data-nav="/expenditure?tab=other">Expenditure > Operational Expenses</a>)
   - For personnel refunds: Expenditure > Refunds (<a href="#/expenditure?tab=refund" data-nav="/expenditure?tab=refund">Expenditure > Refunds</a>)
   - Amharic: ወጪ ለመመዝገብ ወደ ወጪ (<a href="#/expenditure" data-nav="/expenditure">ወጪ</a>) ይሂዱ። ለገበያ ግዢ፦ ወጪ > የገበያ ግዢ (<a href="#/expenditure?tab=market" data-nav="/expenditure?tab=market">ወጪ > የገበያ ግዢ</a>)፤ ለደመወዝ፦ ወጪ > የሰራተኛ ደመወዝ (<a href="#/expenditure?tab=wage" data-nav="/expenditure?tab=wage">ወጪ > የሰራተኛ ደመወዝ</a>)፤ ለልዩ ልዩ ወጪ፦ ወጪ > ልዩ ልዩ ወጪዎች (<a href="#/expenditure?tab=other" data-nav="/expenditure?tab=other">ወጪ > ልዩ ልዩ ወጪዎች</a>)፤ ለተመላሽ፦ ወጪ > ተመላሽ (<a href="#/expenditure?tab=refund" data-nav="/expenditure?tab=refund">ወጪ > ተመላሽ</a>)።

3. Add Store & Inventory Items:
   - Go to Store & Inventory > Item List (<a href="#/store?tab=items" data-nav="/store?tab=items">Store & Inventory > Item List</a>).
   - Amharic: የግምጃ ቤት ዕቃዎችን ለመመዝገብ ወደ ግምጃ ቤት > ዕቃ ዝርዝር (<a href="#/store?tab=items" data-nav="/store?tab=items">ግምጃ ቤት > ዕቃ ዝርዝር</a>) ይሂዱ።

4. Manual Audit:
   - Go to Audit Center > Manual Audit (<a href="#/audit?tab=manual" data-nav="/audit?tab=manual">Audit Center > Manual Audit</a>).
   - Amharic: ማኑዋል ኦዲት የሚገኘው በ ኦዲት ማዕከል > ማኑዋል ኦዲት (<a href="#/audit?tab=manual" data-nav="/audit?tab=manual">ኦዲት ማዕከል > ማኑዋል ኦዲት</a>) ውስጥ ነው።

5. Change Password:
   - Go to Database Administration > System Access & AI Configuration > Change Administrative Credentials (<a href="#/dbadmin?section=access_ai" data-nav="/dbadmin?section=access_ai">Database Administration > System Access & AI Configuration</a>).
   - Amharic: የይለፍ ቃልዎን ለመቀየር ወደ ዳታቤዝ አስተዳደር > የስርዓት መግቢያ እና AI ማዋቀሪያ > የአስተዳዳሪ መግቢያ መረጃን ይቀይሩ (<a href="#/dbadmin?section=access_ai" data-nav="/dbadmin?section=access_ai">ዳታቤዝ አስተዳደር > የስርዓት መግቢያ እና AI ማዋቀሪያ</a>) ይሂዱ።

6. Set / Configure Gemini API Key:
   - Go to Database Administration > System Access & AI Configuration > Gemini AI Engine API Key (<a href="#/dbadmin?section=access_ai" data-nav="/dbadmin?section=access_ai">Database Administration > System Access & AI Configuration</a>).
   - Amharic: የ Gemini API ቁልፍ ለማስቀመጥ ወደ ዳታቤዝ አስተዳደር > የስርዓት መግቢያ እና AI ማዋቀሪያ > የGemini AI ሞተር API ቁልፍ (<a href="#/dbadmin?section=access_ai" data-nav="/dbadmin?section=access_ai">ዳታቤዝ አስተዳደር > የስርዓት መግቢያ እና AI ማዋቀሪያ</a>) ይሂዱ።

7. Forgot Password:
   - Go to the Login screen (<a href="#/login" data-nav="/login">Login</a>) and click "Forgot Password?". Answer the configured security challenge question in the Account Recovery Terminal to set a new password.
   - Amharic: የይለፍ ቃልዎን ከረሱ ወደ መግቢያ ገጽ (<a href="#/login" data-nav="/login">መግቢያ</a>) ሄደው "የይለፍ ቃል ረሱ?" የሚለውን በመጫን የደህንነት ጥያቄውን በመመለስ አዲስ የይለፍ ቃል በቀጥታ ማዘጋጀት ይችላሉ።

8. Admin-Only Features:
   - Any feature exclusive to the administrative command center is located on the Admin Dashboard (<a href="#/admin-dashboard" data-nav="/admin-dashboard">Admin Dashboard</a>) and is accessible only when authenticated as Administrator.
   - Amharic: ለአስተዳዳሪ ብቻ የተፈቀዱ ተግባራት በአስተዳዳሪ ማዕከል (<a href="#/admin-dashboard" data-nav="/admin-dashboard">የአስተዳዳሪ ማዕከል</a>) ውስጥ ብቻ ይገኛሉ።
`;

  return text;
}
