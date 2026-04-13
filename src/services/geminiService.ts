import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ExtractedReceipt {
  customerName?: string;
  invoiceNumber?: string;
  driverName?: string;
  date?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
    unitPrice?: number;
  }>;
  amount?: number;
  discount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  debtAmount?: number;
}

export async function scanReceipt(base64Image: string, mimeType: string = "image/jpeg"): Promise<ExtractedReceipt> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image.split(',')[1] || base64Image,
          },
        },
        {
          text: "Extract information from this receipt. Return the customer name, invoice number, driver name (if any), date, a list of items with their names, quantities, unit prices, and total prices, the total amount, discount, paid amount, remaining amount, and debt amount. If a field is not found, leave it null. Translate all text fields to Kurdish (Sorani) if they are in English or Arabic.",
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING },
            invoiceNumber: { type: Type.STRING },
            driverName: { type: Type.STRING },
            date: { type: Type.STRING, description: "ISO 8601 date string if possible" },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  price: { type: Type.NUMBER, description: "Total price for this item (quantity * unitPrice)" },
                  unitPrice: { type: Type.NUMBER },
                },
                required: ["name", "quantity", "price"],
              },
            },
            amount: { type: Type.NUMBER, description: "Total amount of the receipt" },
            discount: { type: Type.NUMBER },
            paidAmount: { type: Type.NUMBER },
            remainingAmount: { type: Type.NUMBER },
            debtAmount: { type: Type.NUMBER },
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as ExtractedReceipt;
  } catch (error) {
    console.error("Error scanning receipt with Gemini:", error);
    throw error;
  }
}
