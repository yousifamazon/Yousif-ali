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

const addDebtTool: FunctionDeclaration = {
  name: "addDebt",
  description: "Add a new debt (owed or owing)",
  parameters: {
    type: Type.OBJECT,
    properties: {
      personName: { type: Type.STRING, description: "Name of the person" },
      amount: { type: Type.NUMBER, description: "The amount of money" },
      type: { type: Type.STRING, enum: ['owed', 'owing'], description: "owed = I owe them money, owing = they owe me money" },
      notes: { type: Type.STRING, description: "Any additional notes" }
    },
    required: ["personName", "amount", "type"]
  }
};

const searchInvoicesTool: FunctionDeclaration = {
  name: "searchInvoices",
  description: "Search for invoices by customer name or date",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "Customer name or keyword to search for" },
      date: { type: Type.STRING, description: "Specific date to filter by (YYYY-MM-DD)" }
    }
  }
};

const systemInstructionText = `تۆ یاریدەدەرێکی زیرەکی کوردیت بۆ بەڕێوەبردنی کار و خەرجییەکان. زۆر بە باشی لە هەموو شێوەزارەکانی زمانی کوردی تێدەگەیت (سۆرانی، بادینی، هەورامی، کەڵهوڕی، هتد).

ڕێساکان:
1. ئەگەر باسی خەرجکردنی پارە، کڕینی شت، یان وەرگرتنی پارەی کرد، فەرمانی addTransaction بەکاربهێنە.
   نموونە: "١٠ هەزارم دا بە غەسل"، "٥٠ هەزارم وەرگرت بۆ ئیشی کارەبا".
2. ئەگەر باسی کارێک، ئەرکێک، یان ئیشێکی کرد کە دەبێت بکرێت، فەرمانی addTask بەکاربهێنە.
   نموونە: "ئیشێکی سڕینەوەی فلتەرم هەیە بۆ بەیانی"، "سبەی دەبێت بچم بۆ لای کاک ئەحمەد بۆ چاککردنی سپلیت".
3. ئەگەر باسی قەرز یان قەرزدان و قەرزوەرگرتنی کرد، فەرمانی addDebt بەکاربهێنە.
   نموونە: "کاک محەمەد ١٠٠ هەزاری لای منە"، "٢٥ هەزارم قەرز دا بە عەلی".
4. ئەگەر داوای گەڕان یان بینینی وەسڵەکانی کرد، فەرمانی searchInvoices بەکاربهێنە.
   نموونە: "وەسڵەکانی کاک نەبەزم نیشان بدە"، "دوێنێ چ وەسڵێکم هەبوو؟".

تێبینی گرنگ:
- زۆر ورد بە لە دەرهێنانی ژمارەکان. "دە هەزار" بکە بە 10000.
- ئەگەر تێنەگەیشتیت، بە کوردییەکی پاراو و شیرین لێی بپرسەوە.
- وەڵامەکانت با زۆر کورت و پوخت بن.`;

export async function parseVoiceCommandAudio(audioBase64: string, mimeType: string): Promise<VoiceAction> {
  if (!process.env.GEMINI_API_KEY) {
    return { type: 'UNKNOWN', data: null, message: "API Key missing" };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: audioBase64,
                mimeType: mimeType
              }
            },
            {
              text: "بەکارهێنەر ئەم دەنگەی ناردووە. گوێی لێ بگرە و بڕیار بدە چ کارێک ئەنجام بدەیت."
            }
          ]
        }
      ],
      config: {
        systemInstruction: systemInstructionText,
        tools: [{ functionDeclarations: [addTransactionTool, addTaskTool, addDebtTool, searchInvoicesTool] }]
      }
    });

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call.name === 'addTransaction') {
        return {
          type: 'ADD_TRANSACTION',
          data: call.args,
          message: response.text || `باشە، ${call.args.amount} دینارم بۆ ${call.args.description} تۆمار کرد.`
        };
      }
      if (call.name === 'addTask') {
        return {
          type: 'ADD_TASK',
          data: call.args,
          message: response.text || `باشە، ئیشی "${call.args.title}"م بۆ زیاد کردیت.`
        };
      }
      if (call.name === 'addDebt') {
        return {
          type: 'ADD_DEBT',
          data: call.args,
          message: response.text || `باشە، قەرزی ${call.args.personName}م تۆمار کرد بە بڕی ${call.args.amount}.`
        };
      }
      if (call.name === 'searchInvoices') {
        return {
          type: 'UNKNOWN', // We'll handle search in the UI later or map it to a new action
          data: call.args,
          message: response.text || `دەگەڕێم بۆ وەسڵەکانی ${call.args.query || call.args.date}...`
        };
      }
    }

    return {
      type: 'UNKNOWN',
      data: null,
      message: response.text || "ببورە، تێنەگەیشتم مەبەستت چییە. تکایە ڕوونتر بیڵێ."
    };
  } catch (error) {
    console.error("Error parsing voice command audio:", error);
    return { type: 'UNKNOWN', data: null, message: "هەڵەیەک ڕوویدا لە کاتی لێکدانەوەی فەرمانەکە." };
  }
}

export async function parseVoiceCommand(text: string): Promise<VoiceAction> {
  if (!process.env.GEMINI_API_KEY) {
    return { type: 'UNKNOWN', data: null, message: "API Key missing" };
  }

  const prompt = `بەکارهێنەر ئەمەی وتووە: "${text}"`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstructionText,
        tools: [{ functionDeclarations: [addTransactionTool, addTaskTool, addDebtTool, searchInvoicesTool] }]
      }
    });

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call.name === 'addTransaction') {
        return {
          type: 'ADD_TRANSACTION',
          data: call.args,
          message: response.text || `باشە، ${call.args.amount} دینارم بۆ ${call.args.description} تۆمار کرد.`
        };
      }
      if (call.name === 'addTask') {
        return {
          type: 'ADD_TASK',
          data: call.args,
          message: response.text || `باشە، ئیشی "${call.args.title}"م بۆ زیاد کردیت.`
        };
      }
      if (call.name === 'addDebt') {
        return {
          type: 'ADD_DEBT',
          data: call.args,
          message: response.text || `باشە، قەرزی ${call.args.personName}م تۆمار کرد بە بڕی ${call.args.amount}.`
        };
      }
      if (call.name === 'searchInvoices') {
        return {
          type: 'UNKNOWN',
          data: call.args,
          message: response.text || `دەگەڕێم بۆ وەسڵەکانی ${call.args.query || call.args.date}...`
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
