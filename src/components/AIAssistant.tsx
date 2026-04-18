import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, MessageSquare, Mic, MicOff, Send, X, Loader2, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { AppData, Transaction } from '../types';
import { cn } from '../lib/utils';

interface AIAssistantProps {
  data: AppData;
  onAddTransaction: (t: Partial<Transaction>) => void;
  onNavigate: (tab: any) => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ data, onAddTransaction, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; type?: 'insight' | 'action' }[]>([]);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const processAI = async (prompt: string) => {
    setIsTyping(true);
    try {
      const context = {
        transactionsCount: data.transactions?.length || 0,
        totalIncome: data.transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0,
        totalExpense: data.transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0,
        recentTransactions: data.transactions?.slice(0, 5).map(t => `${t.description}: ${t.amount} IQD`),
        tasksOpen: data.tasks?.filter(t => !t.completed).length || 0,
      };

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: `You are "بەردەستی یوسف" (Yousif's Assistant), a highly intelligent Kurdish financial advisor and personal manager.
          You speak in a professional, polite, and encouraging Kurdish (Sorani).
          Current User Data: ${JSON.stringify(context)}.
          
          Your abilities:
          1. Answer questions about finances and tasks.
          2. Parse "natural language" into transactions. If a user says "I spent 5000 on bread", recognize it as an expense.
          3. If you detect a request to add a transaction, return a JSON block at the end of your response like this: [ACTION:ADD_TRANSACTION:{"description":"Bread","amount":5000,"type":"expense"}]
          4. Suggest navigation. If user wants to see reports, return [ACTION:NAVIGATE:reports].
          
          Balance beauty in your words with technical precision. Always encourage Yousif to save more.`,
        },
      });

      const aiText = response.text || "ببوورە ناتوانم وەڵامت بدەمەوە لەم کاتەدا.";
      
      // Handle Actions
      if (aiText.includes('[ACTION:ADD_TRANSACTION:')) {
        const match = aiText.match(/\[ACTION:ADD_TRANSACTION:(.*?)\]/);
        if (match && match[1]) {
          try {
            const tx = JSON.parse(match[1]);
            onAddTransaction(tx);
          } catch (e) {
            console.error("Failed to parse transaction action", e);
          }
        }
      }

      if (aiText.includes('[ACTION:NAVIGATE:')) {
        const match = aiText.match(/\[ACTION:NAVIGATE:(.*?)\]/);
        if (match && match[1]) {
          onNavigate(match[1]);
        }
      }

      const cleanText = aiText.replace(/\[ACTION:.*?\]/g, '').trim();
      setMessages(prev => [...prev, { role: 'assistant', content: cleanText }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "هەڵەیەک ڕوویدا لە پەیوەندی بە ژیری دەستکرد." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    const userMsg = inputText.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInputText('');
    processAI(userMsg);
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("بەرنامەکەت پشتگیری دەنگ ناکات (Chrome/Edge تاقی بکەرەوە)");
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'ckb-IQ'; // Kurdish Iraq
    recognition.continuous = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      // Auto-send voice
      setMessages(prev => [...prev, { role: 'user', content: transcript }]);
      processAI(transcript);
    };

    recognition.start();
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[200]">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 10 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center text-white shadow-2xl shadow-blue-500/40 relative group"
        >
          <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-0 group-hover:opacity-40 transition-opacity animate-pulse" />
          <Sparkles className="w-8 h-8 relative z-10" />
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-end p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
            />
            
            <motion.div
              initial={{ x: 100, opacity: 0, scale: 0.9 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: 100, opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-lg bg-[var(--bg-card)] rounded-[2.5rem] shadow-3xl border border-[var(--border-color)] overflow-hidden pointer-events-auto flex flex-col h-[600px] max-h-[80vh]"
            >
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg">بەردەستی یوسف</h3>
                    <p className="text-[10px] text-blue-100 font-bold opacity-80 uppercase tracking-widest">AI Intelligent Assistant</p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center mb-4">
                      <MessageSquare className="w-10 h-10 text-blue-600" />
                    </div>
                    <h4 className="font-black text-[var(--text-main)] mb-2">چۆن دەتوانم یارمەتیت بدەم؟</h4>
                    <p className="text-sm font-medium text-[var(--text-muted)]">دەتوانی پرسیار دەربارەی بودجەکەت بکەیت یان داوا بکەیت خەرجییەک تۆمار بکەم.</p>
                  </div>
                )}
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex flex-col max-w-[85%]",
                      m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className={cn(
                      "p-4 rounded-3xl text-sm font-bold shadow-sm",
                      m.role === 'user' 
                        ? "bg-blue-600 text-white rounded-br-sm" 
                        : "bg-white dark:bg-slate-800 text-[var(--text-main)] rounded-bl-sm border border-[var(--border-color)]"
                    )}>
                      {m.content}
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <div className="flex items-center gap-2 text-blue-600 font-black text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    بەردەست بیر دەکاتەوە...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-6 border-t border-[var(--border-color)] bg-[var(--bg-card)]">
                <div className="flex items-center gap-2 bg-[var(--bg-main)] p-2 rounded-[2rem] border border-[var(--border-color)]">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="چی بکەم بۆت؟..."
                    className="flex-1 bg-transparent px-4 py-2 outline-none font-bold text-sm text-[var(--text-main)]"
                  />
                  <button
                    onClick={isListening ? () => {} : startListening}
                    className={cn(
                      "p-3 rounded-full transition-all",
                      isListening ? "bg-red-500 text-white animate-pulse" : "bg-slate-200 dark:bg-slate-700 text-[var(--text-muted)] hover:text-blue-600"
                    )}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={handleSend}
                    className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
