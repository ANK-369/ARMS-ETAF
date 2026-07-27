export const ETHIOPIAN_MONTHS = [
  "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit",
  "Megabit", "Miazia", "Genbot", "Sene", "Hamle", "Nehasse", "Pagume"
];

export const ETHIOPIAN_MONTHS_AMHARIC = [
  "መስከረም", "ጥቅምት", "ህዳር", "ታህሳስ", "ጥር", "የካቲት",
  "መጋቢት", "ሚያዚያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ"
];

/**
 * ማንኛውንም የካላንደር ቀን (Gregorian Date) ወደ ትክክለኛ የኢትዮጵያ ቀን የሚቀይር ረዳት ፈንክሽን
 */
const gregorianToEthiopian = (gDate: Date) => {
  const year = gDate.getFullYear();
  const month = gDate.getMonth() + 1; // JS 0-11 ስለሚቆጥር 1 እንጨምራለን
  const day = gDate.getDate();

  // 1. Julian Day Number (JDN) ማስላት
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  // 2. ከJDN ወደ ኢትዮጵያ ዘመን አቆጣጠር መቀየር (Epoch: 1723856)
  const cn = jdn - 1723856;
  const ethYear = Math.floor((4 * cn + 3) / 1461);
  const r = cn - Math.floor((1461 * ethYear) / 4);
  const ethMonth = Math.floor(r / 30) + 1;
  const ethDay = (r % 30) + 1;

  return { year: ethYear, month: ethMonth, day: ethDay };
};

// Returns current Ethiopian Date accurately based on Julian Day Number
export const getCurrentEthiopianDate = () => {
  const today = new Date();
  const { year, month, day } = gregorianToEthiopian(today);
  
  // ሁልጊዜ 2 ዲጂት እንዲሆን (YYYY-MM-DD ፎርማትን ለመጠበቅ)
  const monthStr = month.toString().padStart(2, '0');
  const dayStr = day.toString().padStart(2, '0');
  
  return `${year}-${monthStr}-${dayStr}`; 
};

export const formatEthiopianDate = (dateString: string, lang: 'en' | 'am' = 'en') => {
  if (!dateString) return "-";
  try {
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    
    const year = parts[0];
    const monthIndex = parseInt(parts[1]) - 1;
    const day = parts[2];

    const months = lang === 'am' ? ETHIOPIAN_MONTHS_AMHARIC : ETHIOPIAN_MONTHS;
    const monthName = months[monthIndex] || "Unknown";
    return `${monthName} ${day}, ${year}`;
  } catch (e) {
    return dateString;
  }
};

/**
 * Checks if two Ethiopian date strings (YYYY-MM-DD) belong to the same Month and Year.
 * Used for Monthly Reset logic.
 */
export const isSameMonth = (date1: string, date2: string) => {
    if (!date1 || !date2) return false;
    const p1 = date1.split('-');
    const p2 = date2.split('-');
    if (p1.length < 2 || p2.length < 2) return false;
    return p1[0] === p2[0] && p1[1] === p2[1]; // Compare Year and Month
};

/**
 * Checks if the currentDate falls within the start and end range (inclusive).
 * Used for Manpower Active Status.
 * String comparison works for ISO-like format (YYYY-MM-DD).
 */
export const isActiveDate = (currentDate: string, startDate: string, endDate: string) => {
    if (!startDate || !endDate || !currentDate) return false;
    return currentDate >= startDate && currentDate <= endDate;
};
