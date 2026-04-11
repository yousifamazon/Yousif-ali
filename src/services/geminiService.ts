import { GoogleGenAI, Type } from "@google/genai";

// Helper to safely get environment variables
const getEnv = (key: string): string | undefined => {
  // Check process.env (Node/Vite define)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  // Check import.meta.env (Vite)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[`VITE_${key}`]) {
    // @ts-ignore
    return import.meta.env[`VITE_${key}`];
  }
  return undefined;
};

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    const apiKey = getEnv('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export interface ScannedReceipt {
  customerName?: string;
  invoiceNumber?: string;
  driverName?: string;
  amount?: number;
  discount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  debtAmount?: number;
  items?: { name: string; price: number; quantity?: number; unitPrice?: number }[];
}

export const scanReceipt = async (base64Image: string): Promise<ScannedReceipt | null> => {
  try {
    const ai = getAI();
    
    // Remove data:image/jpeg;base64, prefix if exists
    const base64Data = base64Image.split(',')[1] || base64Image;
    const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/jpeg';

    console.log(`Starting receipt scan with Gemini. Image size: ${Math.round(base64Data.length / 1024)} KB, MimeType: ${mimeType}`);
    
    if (base64Data.length < 100) {
      console.error("Base64 data too short, likely invalid image.");
      return null;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: `Extract information from this receipt image. The receipt is in Kurdish or Arabic. 
            Please extract the following fields and return them in a valid JSON format:
            - customerName: The name of the customer (ناوی کڕیار)
            - invoiceNumber: The invoice or receipt number (ژمارەی پسوڵە / قایمە)
            - driverName: The name of the driver or delivery person (ناوی سایەق / ژ. خاوەن پسوڵە)
            - amount: The total amount before discount (کۆی گشتی)
            - discount: The discount amount (داشکاندن)
            - paidAmount: The amount already paid (وەرگیراو)
            - remainingAmount: The remaining amount to be paid (ماوە)
            - debtAmount: The debt amount (قەرز)
            - items: An array of objects, each with:
                - name: item description (بابەت)
                - quantity: quantity (عدد)
                - unitPrice: price per unit (نرخی تاک)
                - price: total price for this item (کۆی گشتی بابەت)
            
            If a field is not found, leave it null or 0. Ensure the output is ONLY the JSON object.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING },
            invoiceNumber: { type: Type.STRING },
            driverName: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            discount: { type: Type.NUMBER },
            paidAmount: { type: Type.NUMBER },
            remainingAmount: { type: Type.NUMBER },
            debtAmount: { type: Type.NUMBER },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  quantity: { type: Type.NUMBER },
                  unitPrice: { type: Type.NUMBER },
                },
                required: ["name", "price"],
              },
            },
          },
        },
      },
    });

    console.log("Gemini response received:", response);
    if (!response.text) {
      console.warn("Gemini returned no text.");
      return null;
    }
    try {
      return JSON.parse(response.text) as ScannedReceipt;
    } catch (e) {
      console.error("Failed to parse receipt JSON:", e);
      return null;
    }
  } catch (error) {
    console.error("Error scanning receipt:", error);
    return null;
  }
};
