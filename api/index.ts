import express from "express";
import path from "path";
import fs from "fs";
import { analyzeDataServer, chatWithAIServer, performLogisticsAnalysisServer } from "../server/gemini";

// Zero-dependency environment file loader to support local .env.local and .env
function loadEnvFile() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const envPath = path.join(process.cwd(), file);
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, "utf-8");
        content.split("\n").forEach((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#")) {
            const firstEqual = trimmed.indexOf("=");
            if (firstEqual !== -1) {
              const key = trimmed.substring(0, firstEqual).trim();
              let value = trimmed.substring(firstEqual + 1).trim();
              // Remove wrapping quotes
              value = value.replace(/^['"`]+|['"`]+$/g, "").trim();
              if (key && !process.env[key]) {
                process.env[key] = value;
              }
            }
          }
        });
      } catch (err) {
        console.error(`Failed to read env file ${file}:`, err);
      }
      break; // Stop after loading the first found env file
    }
  }
}

loadEnvFile();

const app = express();

// Middleware to parse JSON payloads up to 50MB
app.use(express.json({ limit: "50mb" }));

// Health check endpoint
app.get(["/api/health", "/health"], (req, res) => {
  res.json({ status: "ok", env: "vercel-serverless" });
});

// Gemini Analysis Endpoint
app.post(["/api/gemini/analyze", "/gemini/analyze"], async (req, res) => {
  try {
    const { query, contextData, language } = req.body;
    const customKey = req.headers['x-gemini-api-key'] as string | undefined;
    const result = await analyzeDataServer(query, contextData, language, customKey);
    res.json({ result });
  } catch (err: any) {
    console.error("Vercel Serverless Error /api/gemini/analyze:", err);
    res.status(500).json({ error: err.message || "Failed to analyze data" });
  }
});

// Gemini Chat Endpoint
app.post(["/api/gemini/chat", "/gemini/chat"], async (req, res) => {
  try {
    const { history, userMessage, dbData, language } = req.body;
    const customKey = req.headers['x-gemini-api-key'] as string | undefined;
    const result = await chatWithAIServer(history, userMessage, dbData, language, customKey);
    res.json({ result });
  } catch (err: any) {
    console.error("Vercel Serverless Error /api/gemini/chat:", err);
    res.status(500).json({ error: err.message || "Failed to process chat" });
  }
});

// Gemini Logistics Analysis Endpoint
app.post(["/api/gemini/logistics-analysis", "/gemini/logistics-analysis"], async (req, res) => {
  try {
    const { menu, inventory, manpowerCount, mealIngredients, generateMenu, language } = req.body;
    const customKey = req.headers['x-gemini-api-key'] as string | undefined;
    const result = await performLogisticsAnalysisServer(menu, inventory, manpowerCount, mealIngredients, generateMenu, customKey, language);
    res.json({ result });
  } catch (err: any) {
    console.error("Vercel Serverless Error /api/gemini/logistics-analysis:", err);
    res.status(500).json({ error: err.message || "Failed to perform logistics analysis" });
  }
});

// Export the Express app as default for Vercel
export default app;
