import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FoodProgramEntry, LogisticsAnalysis, StoreItem, MealIngredientsMap } from "../types";

export const getGeminiApiKey = (customApiKey?: string): string => {
  let key = '';
  if (customApiKey && customApiKey.trim() !== "" && customApiKey.trim() !== "undefined" && customApiKey.trim() !== "null") {
    key = customApiKey.trim();
  } else {
    key = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  }
  if (key) {
    key = key.replace(/^['"`]+|['"`]+$/g, '').trim();
  }
  return key;
};

// Resilient fallback runner to bypass temporary API limits and model quota failures
async function runWithModelFallback<T>(
    apiKey: string,
    runner: (ai: GoogleGenAI, modelName: string) => Promise<T>,
    language: 'en' | 'am' = 'en'
): Promise<T> {
    const models = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let lastError: any = null;
    
    for (const model of models) {
        try {
            const ai = new GoogleGenAI({ 
                apiKey,
                httpOptions: {
                    headers: {
                        'User-Agent': 'aistudio-build'
                    }
                }
            });
            return await runner(ai, model);
        } catch (err: any) {
            console.warn(`Model ${model} failed, trying next fallback. Error:`, err);
            lastError = err;
            // If it is a critical credentials error, stop right away to avoid endless retries
            const errMsg = String(err?.message || err).toLowerCase();
            if (errMsg.includes("key not valid") || errMsg.includes("invalid api key") || errMsg.includes("unauthorized") || errMsg.includes("api_key_invalid")) {
                throw err;
            }
        }
    }
    throw lastError || new Error("All fallback models failed.");
}

export const analyzeDataServer = async (query: string, contextData: string, language: 'en' | 'am' = 'en', customApiKey?: string, isTestPing?: boolean) => {
  const apiKey = getGeminiApiKey(customApiKey);
  if (!apiKey) {
    throw new Error(language === 'am' 
        ? "የጌሚኒ ኤፒአይ ቁልፍ አልተዋቀረም ወይም አልተገኘም። እባክዎ በዳታቤዝ አስተዳደር ክፍል ውስጥ ያስቀምጡት።" 
        : "Gemini API Key is not configured or saved. Please configure it in the database administration section.");
  }

  if (isTestPing) {
    const testPrompt = "Respond with exactly the word 'OK', nothing else.";
    try {
      return await runWithModelFallback(apiKey, async (ai, model) => {
        const response = await ai.models.generateContent({
          model: model,
          contents: testPrompt,
        });
        return response.text;
      }, language);
    } catch (error: any) {
      const errMsg = error?.message || String(error);
      const isQuota = errMsg.toLowerCase().includes("quota") || 
                      errMsg.toLowerCase().includes("exhausted") || 
                      errMsg.toLowerCase().includes("429") ||
                      errMsg.toLowerCase().includes("limit");
      if (isQuota) {
        throw error;
      }
      throw new Error(language === 'am'
          ? `ከአይ አገልግሎት ጋር መገናኘት አልተሳካም። ዝርዝር፦ ${errMsg}`
          : `Error connecting to AI service. Detail: ${errMsg}`);
    }
  }

  const langInstruction = language === 'am' 
      ? "ANSWER IN AMHARIC LANGUAGE ONLY." 
      : "ANSWER IN ENGLISH LANGUAGE ONLY.";

  const prompt = `
    You are an expert military logistics AI auditor for the 'ARMS' system.
    
    *** IMMEDIATE INSTRUCTION ***
    You are NOT to use general knowledge. You MUST answering using ONLY the JSON data provided below.
    The user has provided a JSON snapshot of the current database.
    
    ${langInstruction}
    
    DATA DICTIONARY:
    1. 'manpower': LIST OF PERSONNEL.
       - If asked "How many payroll?", COUNT items where type is 'Payroll'.
       - If asked "Total contribution?", SUM the 'contribution_amount'.
    2. 'expenses': LIST OF COSTS.
       - 'cost' is the Money spent.
       - 'name' is the item bought or person paid.
    3. 'income_items_sold': Revenue from store sales.
    4. 'subsidies': Financial aid received.
    
    DATABASE CONTEXT (JSON):
    ${contextData}
    
    USER QUESTION:
    "${query}"
    
    RESPONSE RULES:
    1. Analyze the JSON above. Calculate sums, counts, and averages explicitly.
    2. Do NOT say "no information available" if the array is not empty.
    3. If the array is empty, say "${language === 'am' ? 'በዳታቤዝ ውስጥ ምንም መረጃ አልተገኘም።' : 'No records found in the database.'}".
    4. Format your answer as a concise professional report.
    5. ${langInstruction}
  `;

  try {
    return await runWithModelFallback(apiKey, async (ai, model) => {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
      });
      return response.text;
    }, language);
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    const isQuota = errMsg.toLowerCase().includes("quota") || 
                    errMsg.toLowerCase().includes("exhausted") || 
                    errMsg.toLowerCase().includes("429") ||
                    errMsg.toLowerCase().includes("limit");
    if (isQuota) {
      throw error;
    }
    throw new Error(language === 'am'
        ? `ከአይ አገልግሎት ጋር መገናኘት አልተሳካም። ዝርዝር፦ ${errMsg}`
        : `Error connecting to AI service. Detail: ${errMsg}`);
  }
};

export const chatWithAIServer = async (
    history: { role: 'user' | 'model'; content: string }[],
    userMessage: string,
    dbData: any,
    language: 'en' | 'am' = 'en',
    customApiKey?: string
): Promise<string> => {
    const apiKey = getGeminiApiKey(customApiKey);
    if (!apiKey) {
      throw new Error(language === 'am' 
          ? "የጌሚኒ ኤፒአይ ቁልፍ አልተዋቀረም ወይም አልተገኘም። እባክዎ በዳታቤዝ አስተዳደር ክፍል ውስጥ ያስቀምጡት።" 
          : "Gemini API Key is not configured or saved. Please configure it in the database administration section.");
    }

    const systemInstruction = `
        SYSTEM IDENTITY:
        You are the ARMS (Auditing and Ration Management System) Advanced AI Assistant.
        You are a highly intelligent, military-grade logistics bot capable of data analysis, calculation, and prediction.

        DATABASE CONTEXT:
        ${JSON.stringify(dbData)}

        OPERATIONAL RULES:
        1. **Data Driven**: Answer strictly based on the provided DATABASE CONTEXT.
        2. **Memory**: Consider the CHAT HISTORY for context.
        3. **Calculations**: Perform math explicitly (sums, averages, percentages).
        4. **Predictive Analysis**: If asked for predictions (e.g., "What will next month's expense be?"), analyze the 'date' fields in the data, identify trends (increasing/decreasing), and project linear future values. State your confidence level.
        5. **Formatting (CRITICAL)**:
           - DO NOT use Markdown formatting for tables (e.g. no | col | col |).
           - YOU MUST OUTPUT HTML TAGS for visual structuring.
           - **Tables**: Use <table class="w-full text-left border-collapse my-4 border border-gray-700 text-sm">.
             - Headers: <thead class="bg-black/40 text-gold-500 uppercase font-bold"><tr><th class="p-2 border border-gray-700">...</th></tr></thead>
             - Rows: <tbody class="divide-y divide-gray-800"><tr class="hover:bg-white/5"><td class="p-2 border border-gray-700">...</td></tr></tbody>
           - **Bold**: Use <strong>text</strong> for emphasis.
           - **Lists**: Use <ul class="list-disc list-inside space-y-1 my-2"><li>...</li></ul>.
           - **Sections**: Use <h3 class="text-gold-500 font-bold text-lg mt-4 mb-2 border-b border-gray-700 pb-1">Title</h3>.
        6. **Language**: Respond strictly in ${language === 'am' ? 'Amharic' : 'English'}. Respond strictly in grammatically correct, natural and fluent Amharic if the language is Amharic.

        GOAL: Provide accurate, actionable, and visually structured intelligence to the logistics officer.
    `;

    const chatHistoryForModel = history.map(h => ({
        role: h.role,
        parts: [{ text: h.content }]
    }));

    chatHistoryForModel.push({
        role: 'user',
        parts: [{ text: userMessage }]
    });

    try {
        return await runWithModelFallback(apiKey, async (ai, model) => {
            const response = await ai.models.generateContent({
                model: model,
                contents: chatHistoryForModel,
                config: {
                    systemInstruction: systemInstruction,
                    temperature: 0.3,
                }
            });
            return response.text || "No response generated.";
        }, language);
    } catch (error: any) {
        const errMsg = error?.message || String(error);
        const isQuota = errMsg.toLowerCase().includes("quota") || 
                        errMsg.toLowerCase().includes("exhausted") || 
                        errMsg.toLowerCase().includes("429") ||
                        errMsg.toLowerCase().includes("limit");
        if (isQuota) {
            throw error;
        }
        throw new Error(language === 'am'
            ? `የቻት ረዳት ስህተት፦ ከአይ አውታረ መረብ ጋር መገናኘት አልተሳካም። ዝርዝር፦ ${errMsg}`
            : `Chat Assistant Error: Unable to reach the AI Core. Detail: ${errMsg}`);
    }
};

export const performLogisticsAnalysisServer = async (
    menu: FoodProgramEntry[],
    inventory: StoreItem[],
    manpowerCount: number,
    mealIngredients: MealIngredientsMap = {},
    generateMenu: boolean = false,
    customApiKey?: string,
    language: 'en' | 'am' = 'en'
): Promise<LogisticsAnalysis | null> => {
    const apiKey = getGeminiApiKey(customApiKey);
    if (!apiKey) {
      throw new Error("Gemini API Key is not configured or saved.");
    }
    
    let ingredientContext = "No daily recipes provided. Estimate based on menu names.";
    if (Object.keys(mealIngredients).length > 0) {
        ingredientContext = JSON.stringify(mealIngredients);
    }

    const langInstruction = language === 'am' 
        ? "OUTPUT TRANSLATIONS CRITICAL: All textual output (such as names of days in optimizedMenu, descriptions/reasons under recommendedOrders, warnings or text under alerts, and names of foods in optimizedMenu breakfast/lunch/dinner fields) MUST BE TRANSLATED AND WRITTEN IN GRAMMATICALLY CORRECT, NATURAL AMHARIC LANGUAGE ONLY." 
        : "All textual output must be in English.";

    const prompt = `
        ACT AS A MILITARY LOGISTICS OFFICER (QUARTERMASTER).
        
        GOAL: Analyze the Weekly Food Program vs Current Inventory vs Manpower Count.
        
        ${langInstruction}
        
        INPUT DATA:
        1. CURRENT MANPOWER: ${manpowerCount} Personnel.
        2. CURRENT INVENTORY (JSON): ${JSON.stringify(inventory.map(i => ({name: i.name, qty: i.amount, unit: i.measurement})))}
        3. WEEKLY MENU SCHEDULE (JSON): ${JSON.stringify(menu)}
        4. DAILY RECIPES (TOTAL AMOUNT defined for BASE MANPOWER) (JSON): ${ingredientContext}
        
        CALCULATION RULES:
        - The "DAILY RECIPES" provide a 'totalAmount' and a 'baseManpower'.
        - SCALING FORMULA: RequiredAmount = (RecipeTotalAmount / RecipeBaseManpower) * ${manpowerCount}.
        - Example: If Recipe says "50kg Rice for 100 people", and Current Manpower is 120, Need = (50/100)*120 = 60kg.
        - If NO recipe is found, ESTIMATE based on menu names (e.g. Rice=0.2kg/person).
        - DO NOT CALCULATE CALORIES. Focus on Amount and Cost.

        TASKS:
        1. CONSUMPTION ANALYSIS: 
           - Calculate total burn rate for the week.
           - Compare with Stock.
        
        2. ALERTS:
           - Flag "CRITICAL" if stock < 3 days. "LOW" if < 7 days.
           - Check if market items are available in inventory.

        3. RECOMMENDATIONS:
           - Suggest what to buy immediately based on Deficit.

        ${generateMenu ? `
        4. GENERATE OPTIMIZED MENU:
           - Create a NEW weekly menu that strictly uses ingredients we have in HIGH STOCK to save money.
           - Do not suggest items we do not have, unless essential (like Oil/Salt).
        ` : ''}
        
        ${langInstruction}
    `;

    const analysisSchema: Schema = {
        type: Type.OBJECT,
        properties: {
            ingredientBreakdown: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        itemName: { type: Type.STRING },
                        requiredAmount: { type: Type.NUMBER },
                        unit: { type: Type.STRING },
                        inStock: { type: Type.NUMBER },
                        status: { type: Type.STRING, enum: ['OK', 'LOW', 'CRITICAL'] },
                        daysLasting: { type: Type.NUMBER }
                    }
                }
            },
            alerts: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            },
            recommendedOrders: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        itemName: { type: Type.STRING },
                        amountToBuy: { type: Type.NUMBER },
                        unit: { type: Type.STRING },
                        reason: { type: Type.STRING }
                    }
                }
            },
            optimizedMenu: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        day: { type: Type.STRING },
                        breakfast: { type: Type.STRING },
                        lunch: { type: Type.STRING },
                        dinner: { type: Type.STRING }
                    }
                }
            }
        },
        required: ['ingredientBreakdown', 'alerts', 'recommendedOrders']
    };

    try {
        return await runWithModelFallback(apiKey, async (ai, model) => {
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: analysisSchema
                }
            });

            const text = response.text;
            if (!text) return null;

            return JSON.parse(text) as LogisticsAnalysis;
        });
    } catch (error: any) {
        console.error("Logistics AI Error in fallback chain:", error);
        throw new Error(error?.message || String(error));
    }
};
