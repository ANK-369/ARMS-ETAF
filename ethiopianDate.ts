
export const ETHIOPIAN_MONTHS = [
  "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit",
  "Megabit", "Miazia", "Genbot", "Sene", "Hamle", "Nehasse", "Pagume"
];

export const ETHIOPIAN_MONTHS_AMHARIC = [
  "መስከረም", "ጥቅምት", "ህዳር", "ታህሳስ", "ጥር", "የካቲት",
  "መጋቢት", "ሚያዚያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ"
];

// Returns current Ethiopian Date roughly based on Gregorian
// Note: A full astronomical conversion is complex. 
// For this offline app, we assume the user sets the date manually often, 
// but this provides a decent default (approx year difference ~7/8 years).
export const getCurrentEthiopianDate = () => {
  const gc = new Date();
  const gcYear = gc.getFullYear();
  const gcMonth = gc.getMonth(); // 0-11
  
  // Rough conversion logic for default value
  // Ethiopian New Year is approx Sept 11/12.
  let ecYear = gcYear - 8;
  if (gcMonth >= 8 && gc.getDate() >= 11) {
    ecYear += 1;
  }
  
  // Return formatted YYYY-MM-DD string (Ethiopian)
  // Defaulting to 01-01 for simplicity if user needs to edit, 
  // or mapped roughly. 
  return `${ecYear}-01-01`; 
};

export const formatEthiopianDate = (dateString: string) => {
  if (!dateString) return "-";
  try {
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    
    const year = parts[0];
    const monthIndex = parseInt(parts[1]) - 1;
    const day = parts[2];

    const monthName = ETHIOPIAN_MONTHS[monthIndex] || "Unknown";
    return `${monthName} ${day}, ${year}`;
  } catch (e) {
    return dateString;
  }
};
