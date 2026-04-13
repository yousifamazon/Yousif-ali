import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { X, Camera, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ReceiptScannerProps {
  onScanComplete: (data: any) => void;
  onClose: () => void;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ onScanComplete, onClose }) => {
  const [image, setImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("نەتوانرا کامێرا کارپێبکرێت");
      setShowCamera(false);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setImage(dataUrl);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const scanReceipt = async () => {
    if (!image) return;

    setIsScanning(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const base64Data = image.split(',')[1];

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data,
              },
            },
            {
              text: `Extract information from this receipt. Return a JSON object with the following fields:
              - customerName: string (if available)
              - invoiceNumber: string (if available)
              - date: string (YYYY-MM-DD format)
              - items: array of objects { name: string, price: number, quantity: number, unitPrice: number }
              - totalAmount: number
              - shopName: string (if available)
              
              Translate all text fields to Kurdish (Sorani) if they are in English or Arabic.`,
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
              date: { type: Type.STRING },
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
                  required: ["name", "price"]
                }
              },
              totalAmount: { type: Type.NUMBER },
              shopName: { type: Type.STRING },
            },
            required: ["totalAmount"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      onScanComplete({ ...result, receiptImage: image });
    } catch (err) {
      console.error(err);
      setError("شکستی هێنا لە سکانکردنی وەسڵەکە. تکایە دووبارە هەوڵ بدەرەوە.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-[var(--bg-card)] rounded-[2.5rem] shadow-2xl overflow-hidden border border-[var(--border-color)]">
        {/* Header */}
        <div className="p-6 flex justify-between items-center border-b border-[var(--border-color)] bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
              <Camera className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-black text-xl text-[var(--text-main)]">سکانکردنی وەسڵ</h3>
          </div>
          <button 
            onClick={() => { stopCamera(); onClose(); }} 
            className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-90"
          >
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto max-h-[calc(90vh-88px)]">
          {showCamera ? (
            <div className="relative rounded-[2.5rem] overflow-hidden bg-black aspect-[3/4] shadow-2xl border-4 border-slate-100 dark:border-slate-800">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6 px-6">
                <button 
                  onClick={captureImage}
                  className="w-20 h-20 bg-white rounded-full border-8 border-slate-200/50 flex items-center justify-center shadow-2xl active:scale-90 transition-all"
                >
                  <div className="w-14 h-14 bg-blue-600 rounded-full shadow-inner"></div>
                </button>
                <button 
                  onClick={stopCamera}
                  className="absolute right-8 bottom-6 p-4 bg-red-500 text-white rounded-[1.5rem] shadow-xl active:scale-90 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          ) : image ? (
            <div className="space-y-8">
              <div className="relative rounded-[2.5rem] overflow-hidden border-4 border-blue-50 dark:border-blue-900/20 shadow-2xl bg-slate-50 dark:bg-slate-900">
                <img src={image} alt="Receipt" className="w-full h-auto max-h-[450px] object-contain" />
                <button 
                  onClick={() => setImage(null)}
                  className="absolute top-6 right-6 p-3 bg-black/50 text-white rounded-full backdrop-blur-md hover:bg-black/70 transition-all active:scale-90"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <button
                onClick={scanReceipt}
                disabled={isScanning}
                className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-blue-500/30 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-4 active:scale-[0.98]"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-7 h-7 animate-spin" />
                    <span>خەریکی سکانکردنە...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-7 h-7" />
                    <span>دەستپێکردنی سکانکردن</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              <button
                onClick={startCamera}
                className="flex flex-col items-center justify-center gap-6 p-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[3rem] hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group relative overflow-hidden"
              >
                <div className="p-6 bg-blue-50 dark:bg-blue-900/30 rounded-[2rem] group-hover:scale-110 transition-transform duration-500">
                  <Camera className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-center">
                  <p className="font-black text-xl text-slate-800 dark:text-slate-200">وێنەگرتنی وەسڵ</p>
                  <p className="text-sm text-slate-500 font-bold mt-2">بە کامێرای مۆبایلەکەت</p>
                </div>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-6 p-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[3rem] hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group relative overflow-hidden"
              >
                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] group-hover:scale-110 transition-transform duration-500">
                  <Upload className="w-12 h-12 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="text-center">
                  <p className="font-black text-xl text-slate-800 dark:text-slate-200">بارکردنی وێنە</p>
                  <p className="text-sm text-slate-500 font-bold mt-2">لە گەلەری مۆبایلەکەت</p>
                </div>
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/30">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileUpload} 
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};
