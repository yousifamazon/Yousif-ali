import { GoogleGenAI, Type } from "@google/genai";
import { AppData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AIInsight {
  title: string;
  content: string;
  type: 'saving' | 'spending' | 'debt' | 'general';
  priority: 'low' | 'medium' | 'high';
}

export async function getFinancialInsights(data: AppData): Promise<AIInsight[]> {
  if (!process.env.GEMINI_API_KEY) return [];

  const prompt = `
    وەک ڕاوێژکارێکی دارایی پێشکەوتوو، شیکاری بۆ ئەم داتایانەی خوارەوە بکە و ٣ بۆ ٥ ئامۆژگاری و تێبینی گرنگ بدە بە زمانی کوردی (سۆرانی).
    داتاکان بریتین لە:
    - خەرجییەکان و داهاتەکان (Transactions)
    - قەرزەکان (Debts)
    - ئامانجەکانی پاشەکەوت (Savings Goals)
    - ئیش و کارەکان (Tasks)

    داتای بەکارهێنەر:
    ${JSON.stringify({
      transactions: data.transactions.slice(-20), // Last 20 for context
      debts: data.debts.filter(d => !d.completed),
      savings: data.savingsGoals.filter(s => s.currentAmount < s.targetAmount),
      tasks: data.tasks.filter(t => !t.completed).slice(0, 10)
    })}

    تێبینییەکان دەبێت زۆر ورد بن و هانی بەکارهێنەر بدەن بۆ باشترکردنی باری دارایی.
    وەڵامەکە بە شێوازی JSON بێت بەم فۆرماتە:
    [
      {
        "title": "ناونیشانی کورت",
        "content": "ناوەڕۆکی ورد و ئامۆژگارییەکە",
        "type": "saving" | "spending" | "debt" | "general",
        "priority": "low" | "medium" | "high"
      }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['saving', 'spending', 'debt', 'general'] },
              priority: { type: Type.STRING, enum: ['low', 'medium', 'high'] }
            },
            required: ["title", "content", "type", "priority"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error getting AI insights:", error);
    return [];
  }
}
