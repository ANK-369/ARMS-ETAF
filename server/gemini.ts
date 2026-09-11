import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FoodProgramEntry, LogisticsAnalysis, StoreItem, MealIngredientsMap } from "../types";

export const getGeminiApiKey = (customApiKey?: string): string => {
  let key = '';
  if (customApiKey && customApiKey.trim() !== "" && customApiKey.trim() !== "undefined" && customApiKey.trim() !== "null") {
    key = customApiKey.trim();
  } else {
    const envKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    // If the environment key is an unsupported token format (e.g. AQ. which fails direct generative language calls), ignore it
    if (envKey && !envKey.startsWith('AQ.')) {
      key = envKey;
    }
  }
  if (key) {
    key = key.replace(/^['"`]+|['"`]+$/g, '').trim();
  }
  return key;
};

// Formats API errors into clear, actionable, user-friendly messages in Amharic or English
export function formatFriendlyGeminiError(error: any, language: 'en' | 'am' = 'en'): Error {
  const rawMsg = String(error?.message || error || "");
  const lower = rawMsg.toLowerCase();

  const isAuthError = 
    lower.includes("401") ||
    lower.includes("unauthenticated") ||
    lower.includes("access_token_type_unsupported") ||
    lower.includes("invalid authentication credentials") ||
    lower.includes("api_key_invalid") ||
    lower.includes("key not valid") ||
    lower.includes("invalid api key") ||
    lower.includes("unauthorized") ||
    lower.includes("api key not valid");

  const isQuotaError =
    lower.includes("quota") ||
    lower.includes("exhausted") ||
    lower.includes("429") ||
    lower.includes("resource_exhausted") ||
    lower.includes("rate limit") ||
    lower.includes("limit");

  const isHighDemandError =
    lower.includes("503") ||
    lower.includes("high demand") ||
    lower.includes("unavailable") ||
    lower.includes("temporarily unavailable") ||
    lower.includes("service unavailable");

  if (isAuthError) {
    return new Error(language === 'am'
      ? "የጌሚኒ ኤፒአይ ቁልፍ (Gemini API Key) አልተዋቀረም ወይም ትክክለኛ አይደለም/ጊዜው አልፎበታል (401 Unauthenticated)። እባክዎ በዳታቤዝ አስተዳደር (DB Administration) ገጽ ውስጥ ትክክለኛውን የጌሚኒ ኤፒአይ ቁልፍ ያስገቡ እና 'ቁልፉን አስቀምጥ' የሚለውን ይጫኑ።"
      : "The Gemini API key is missing, invalid, or expired (401 Unauthenticated). Please configure a valid Gemini API key in Database Administration > Gemini AI Configuration and click 'Save API Key'.");
  }

  if (isQuotaError) {
    return new Error(language === 'am'
      ? "የጌሚኒ ኤፒአይ የጥሪ ገደብ (Quota/Rate Limit) አልቋል። እባክዎ ጥቂት ደቂቃዎች ጠብቀው እንደገና ይሞክሩ።"
      : "Gemini API quota or rate limit exceeded. Please wait a few moments and try again.");
  }

  if (isHighDemandError) {
    return new Error(language === 'am'
      ? "የጌሚኒ አገልጋዮች በአሁኑ ወቅት ከፍተኛ የጥሪ ጫና (High Demand 503) እያስተናገዱ ነው። እባክዎ ጥቂት ሰከንዶች ጠብቀው እንደገና ይሞክሩ።"
      : "Gemini AI models are temporarily experiencing high demand (503 Service Unavailable). Please try again in a few moments.");
  }

  // Extract clean text if the message is wrapped in JSON
  let displayMsg = rawMsg;
  try {
    const jsonStart = rawMsg.indexOf('{');
    if (jsonStart !== -1) {
      const parsed = JSON.parse(rawMsg.slice(jsonStart));
      if (parsed?.error?.message) {
        displayMsg = parsed.error.message;
      }
    }
  } catch (e) {
    // Keep rawMsg
  }

  return new Error(language === 'am'
    ? `ከአይ አገልግሎት ጋር መገናኘት አልተሳካም። ዝርዝር፦ ${displayMsg}`
    : `Error connecting to AI service. Detail: ${displayMsg}`);
}

// Resilient fallback runner to bypass temporary API limits and model quota failures
async function runWithModelFallback<T>(
    apiKey: string,
    runner: (ai: GoogleGenAI, modelName: string) => Promise<T>,
    language: 'en' | 'am' = 'en'
): Promise<T> {
    // Prioritize high-availability, low-latency models to ensure resilience against high-demand spikes
    const models = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
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
            lastError = err;
            const errMsg = String(err?.message || err).toLowerCase();
            const isAuthError = 
                errMsg.includes("401") ||
                errMsg.includes("unauthenticated") ||
                errMsg.includes("access_token_type_unsupported") ||
                errMsg.includes("invalid authentication credentials") ||
                errMsg.includes("api_key_invalid") ||
                errMsg.includes("key not valid") ||
                errMsg.includes("invalid api key") ||
                errMsg.includes("unauthorized") ||
                errMsg.includes("api key not valid");

            // If it is an authentication error, stop immediately rather than failing all models
            if (isAuthError) {
                throw formatFriendlyGeminiError(err, language);
            }

            // High demand (503) or rate limit (429) should switch gracefully to next model
            const isHighDemand = 
                errMsg.includes("503") || 
                errMsg.includes("high demand") || 
                errMsg.includes("unavailable");

            if (isHighDemand) {
                console.log(`[Gemini Fallback] Model ${model} is experiencing temporary high demand (503). Smoothly switching to next model.`);
            } else {
                console.log(`[Gemini Fallback] Model ${model} request paused; switching to next fallback model.`);
            }
        }
    }
    throw formatFriendlyGeminiError(lastError || new Error("All fallback models failed."), language);
}

export const analyzeDataServer = async (query: string, contextData: string, language: 'en' | 'am' = 'en', customApiKey?: string, isTestPing?: boolean) => {
  const apiKey = getGeminiApiKey(customApiKey);
  if (!apiKey) {
    throw new Error(language === 'am' 
        ? "የጌሚኒ ኤፒአይ ቁልፍ (Gemini API Key) አልተዋቀረም ወይም አልተገኘም። እባክዎ በዳታቤዝ አስተዳደር (DB Administration) ገጽ ውስጥ ያስገቡት እና 'ቁልፉን አስቀምጥ' የሚለውን ይጫኑ።" 
        : "Gemini API Key is not configured or saved. Please configure your Gemini API key in Database Administration > Gemini AI Configuration and click 'Save API Key'.");
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
      throw formatFriendlyGeminiError(error, language);
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
    throw formatFriendlyGeminiError(error, language);
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
        throw formatFriendlyGeminiError(error, language);
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
      throw new Error(language === 'am'
        ? "የጌሚኒ ኤፒአይ ቁልፍ አልተዋቀረም ወይም አልተገኘም። እባክዎ በዳታቤዝ አስተዳደር (DB Administration) ገጽ ውስጥ ያስገቡት እና 'ቁልፉን አስቀምጥ' የሚለውን ይጫኑ።"
        : "Gemini API Key is not configured or saved. Please configure your Gemini API key in Database Administration > Gemini AI Configuration and click 'Save API Key'.");
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
        console.error("Logistics AI Error in fallback chain:", error?.message || error);
        throw formatFriendlyGeminiError(error, language);
    }
};
