import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface VoiceAction {
  type: 'ADD_TRANSACTION' | 'ADD_TASK' | 'ADD_DEBT' | 'UNKNOWN';
  data: any;
  message: string;
}

const addTransactionTool: FunctionDeclaration = {
  name: "addTransaction",
  description: "Add a new financial transaction (expense or income)",
  parameters: {
    type: Type.OBJECT,
    properties: {
      amount: { type: Type.NUMBER, description: "The amount of money" },
      description: { type: Type.STRING, description: "What the money was spent on or earned from" },
      type: { type: Type.STRING, enum: ['expense', 'income'], description: "Whether it is an expense or income" },
      category: { type: Type.STRING, description: "Category like food, fuel, salary, etc." }
    },
    required: ["amount", "description", "type"]
  }
};

const addTaskTool: FunctionDeclaration = {
  name: "addTask",
  description: "Add a new work task",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Title of the task" },
      workTypes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Types of work like driving, electricity, etc." },
      details: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            work: { type: Type.STRING }
          }
        }
      }
    },
    required: ["title"]
  }
};

export async function parseVoiceCommand(text: string): Promise<VoiceAction> {
  if (!process.env.GEMINI_API_KEY) {
    return { type: 'UNKNOWN', data: null, message: "API Key missing" };
  }

  const prompt = `
    بەکارهێنەر ئەم فەرمانەی داوە بە دەنگ یان دەق: "${text}"
    ئەم فەرمانە لێک بدەرەوە و بڕیار بدە چ کارێک ئەنجام بدەیت.
    ئەگەر باسی پارە و خەرجی کرد، بانگی addTransaction بکە.
    ئەگەر باسی ئیش و کار و تاسی کرد، بانگی addTask بکە.
    وەڵامەکەت دەبێت بە کوردی بێت و بڵێیت چیت کردووە.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ functionDeclarations: [addTransactionTool, addTaskTool] }]
      }
    });

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call.name === 'addTransaction') {
        return {
          type: 'ADD_TRANSACTION',
          data: call.args,
          message: `باشە، ${call.args.amount} دینارم بۆ ${call.args.description} تۆمار کرد.`
        };
      }
      if (call.name === 'addTask') {
        return {
          type: 'ADD_TASK',
          data: call.args,
          message: `باشە، ئیشی "${call.args.title}"م بۆ زیاد کردیت.`
        };
      }
    }

    return {
      type: 'UNKNOWN',
      data: null,
      message: response.text || "ببورە، تێنەگەیشتم مەبەستت چییە. تکایە ڕوونتر بیڵێ."
    };
  } catch (error) {
    console.error("Error parsing voice command:", error);
    return { type: 'UNKNOWN', data: null, message: "هەڵەیەک ڕوویدا لە کاتی لێکدانەوەی فەرمانەکە." };
  }
}
