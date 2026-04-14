import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ExtractedReceipt {
  shopName?: string;
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
    const prompt = `
      Extract all relevant information from this receipt image.
      Return the data strictly in JSON format with the following structure:
      {
        "shopName": "Name of the store or business",
        "customerName": "Name of the customer if present",
        "invoiceNumber": "Invoice or receipt number",
        "driverName": "Name of the driver if present",
        "date": "Date of the receipt (YYYY-MM-DD)",
        "items": [
          {
            "name": "Item name (translated to Kurdish Sorani)",
            "quantity": number,
            "price": total price for this item,
            "unitPrice": price per unit
          }
        ],
        "amount": total amount,
        "discount": discount amount if any,
        "paidAmount": amount already paid,
        "remainingAmount": amount left to pay,
        "debtAmount": debt amount if any
      }
      
      Important:
      1. Translate item names and shop name to Kurdish Sorani if they are in another language.
      2. Ensure all numeric values are numbers, not strings.
      3. If a value is not found, use null or omit the field.
      4. Return ONLY the JSON object.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image.split(',')[1] || base64Image,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    
    if (!text) throw new Error("No response from Gemini");
    
    // Clean the response text in case Gemini adds markdown code blocks
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      return JSON.parse(cleanedText) as ExtractedReceipt;
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", cleanedText);
      throw new Error("نەتوانرا زانیارییەکان بە دروستی وەربگیرێت");
    }
  } catch (error) {
    console.error("Error scanning receipt with Gemini:", error);
    throw error;
  }
}
