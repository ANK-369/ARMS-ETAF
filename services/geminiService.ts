import { FoodProgramEntry, LogisticsAnalysis, StoreItem, MealIngredientsMap } from "../types";

export const getGeminiApiKey = (): string => {
  const userKey = localStorage.getItem('arms_gemini_api_key');
  if (userKey) {
    let key = userKey.trim();
    return key.replace(/^['"`]+|['"`]+$/g, '').trim();
  }
  return '';
};

const getHeaders = (customApiKey?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  const customKey = customApiKey !== undefined ? customApiKey : getGeminiApiKey();
  if (customKey) {
    headers['x-gemini-api-key'] = customKey.trim();
  }
  return headers;
};

export const analyzeData = async (query: string, contextData: string, language: 'en' | 'am' = 'en', customApiKey?: string, isTestPing?: boolean): Promise<string> => {
  const response = await fetch('/api/gemini/analyze', {
    method: 'POST',
    headers: getHeaders(customApiKey),
    body: JSON.stringify({ query, contextData, language, isTestPing })
  });
  if (!response.ok) {
    let serverErr = "";
    try {
      const errJson = await response.json();
      serverErr = errJson.error || errJson.message || "";
    } catch (e) {}
    throw new Error(serverErr || `HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  return data.result;
};

export const chatWithAI = async (
    history: { role: 'user' | 'model'; content: string }[],
    userMessage: string,
    dbData: any,
    language: 'en' | 'am' = 'en'
): Promise<string> => {
    const response = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ history, userMessage, dbData, language })
    });
    if (!response.ok) {
      let serverErr = "";
      try {
        const errJson = await response.json();
        serverErr = errJson.error || errJson.message || "";
      } catch (e) {}
      throw new Error(serverErr || `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.result || "No response generated.";
};

export const performLogisticsAnalysis = async (
    menu: FoodProgramEntry[],
    inventory: StoreItem[],
    manpowerCount: number,
    mealIngredients: MealIngredientsMap = {},
    generateMenu: boolean = false,
    language: 'en' | 'am' = 'en'
): Promise<LogisticsAnalysis | null> => {
    const response = await fetch('/api/gemini/logistics-analysis', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ menu, inventory, manpowerCount, mealIngredients, generateMenu, language })
    });
    if (!response.ok) {
      let serverErr = "";
      try {
        const errJson = await response.json();
        serverErr = errJson.error || errJson.message || "";
      } catch (e) {}
      throw new Error(serverErr || `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.result;
};

export const stripMarkdown = (text: string): string => {
  if (!text) return '';
  return text
    // Replace markdown bold/italic (e.g. **text** or *text*) with clean text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove headings
    .replace(/^#+\s+/gm, '')
    // Replace list/bullet starts at the beginning of a line with Unicode bullets or clean prefix
    .replace(/^\s*[-*+]\s+/gm, '• ')
    // Remove links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove code blocks
    .replace(/```[a-z]*\n([\s\S]*?)\n```/g, '$1')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1');
};

