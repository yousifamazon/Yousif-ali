import React, { useState, useRef, useEffect } from 'react';
import { AppData } from '../types';
import { MessageSquare, Send, Bot, User, Loader2, Sparkles, BrainCircuit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { GoogleGenAI } from "@google/genai";

interface SmartAssistantProps {
  data: AppData;
}

export const SmartAssistant: React.FC<SmartAssistantProps> = ({ data }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: 'سڵاو! من یاریدەدەری زیرەکی تۆم. دەتوانیت هەر پرسیارێکت هەبێت دەربارەی داتا و حساباتەکانت لێم بکەیت. بۆ نموونە: "کۆی خەرجی مانگی ڕابردووم چەند بووە؟" یان "کێ زۆرترین قەرزی لایە؟"' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      // Prepare context from data
      const context = `
        You are a smart financial assistant for a Kurdish user. 
        The user's data is provided below in JSON format. 
        Answer the user's question accurately based ONLY on this data.
        Always answer in Kurdish (Sorani dialect).
        Be professional, helpful, and concise.
        
        Data Summary:
        - Total Transactions: ${data.transactions?.length || 0}
        - Total Maintenance Invoices: ${data.maintenanceInvoices?.length || 0}
        - Total Debts: ${data.debts?.length || 0}
        - Total Savings Goals: ${data.savingsGoals?.length || 0}
        
        Full Data (for analysis):
        ${JSON.stringify({
          transactions: data.transactions?.slice(0, 50), // Limit for context window
          debts: data.debts,
          maintenanceInvoices: data.maintenanceInvoices?.slice(0, 20),
          savings: data.savingsGoals
        })}
      `;

      const prompt = `${context}\n\nUser Question: ${userMessage}\nAssistant:`;
      const result = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: {
          parts: [{ text: prompt }]
        }
      });
      const text = result.text;

      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch (error) {
      console.error("AI Assistant Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'ببورە، کێشەیەک لە پەیوەندی دروست بوو. تکایە دووبارە هەوڵ بدەرەوە.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-main)] shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[var(--border-main)] bg-[var(--bg-main)]/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <BrainCircuit className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[var(--text-main)]">یاریدەدەری زیرەک</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Online & Ready</span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setMessages([messages[0]])}
          className="p-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-xl transition-colors"
          title="پاککردنەوەی چات"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex gap-4 max-w-[85%]",
                msg.role === 'user' ? "mr-auto flex-row-reverse" : "ml-auto"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                msg.role === 'user' ? "bg-blue-600 text-white" : "bg-[var(--bg-main)] text-blue-600 border border-[var(--border-main)]"
              )}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={cn(
                "p-5 rounded-3xl text-sm font-bold leading-relaxed shadow-sm",
                msg.role === 'user' 
                  ? "bg-blue-600 text-white rounded-tr-none" 
                  : "bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-main)] rounded-tl-none"
              )}>
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <div className="flex gap-4 max-w-[85%] ml-auto">
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-main)] text-blue-600 border border-[var(--border-main)] flex items-center justify-center shrink-0">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <div className="p-5 rounded-3xl rounded-tl-none bg-[var(--bg-main)] text-[var(--text-muted)] border border-[var(--border-main)] flex items-center gap-3">
              <Sparkles className="w-4 h-4 animate-pulse text-blue-500" />
              <span className="font-bold">خەریکی بیرکردنەوەم...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-[var(--border-main)] bg-[var(--bg-main)]/30">
        <div className="relative flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="پرسیارێک بکە..."
            className="flex-1 pr-6 pl-16 py-5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2rem] text-[var(--text-main)] font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-inner transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute left-2 p-4 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
        <div className="mt-4 flex justify-center gap-4">
          <button 
            onClick={() => setInput('کۆی خەرجی ئەم مانگەم چەندە؟')}
            className="text-xs font-bold text-[var(--text-muted)] hover:text-blue-600 transition-colors px-3 py-1 bg-[var(--bg-main)] rounded-full border border-[var(--border-main)]"
          >
            خەرجی ئەم مانگە؟
          </button>
          <button 
            onClick={() => setInput('کێ زۆرترین قەرزی لایە؟')}
            className="text-xs font-bold text-[var(--text-muted)] hover:text-blue-600 transition-colors px-3 py-1 bg-[var(--bg-main)] rounded-full border border-[var(--border-main)]"
          >
            کێ قەرزاری منە؟
          </button>
          <button 
            onClick={() => setInput('ئامۆژگارییەکی داراییم بکە')}
            className="text-xs font-bold text-[var(--text-muted)] hover:text-blue-600 transition-colors px-3 py-1 bg-[var(--bg-main)] rounded-full border border-[var(--border-main)]"
          >
            ئامۆژگاری دارایی
          </button>
        </div>
      </div>
    </div>
  );
};
