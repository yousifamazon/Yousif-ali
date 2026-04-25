import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  X, 
  ArrowRight, 
  Wallet, 
  CheckCircle2, 
  ShoppingCart, 
  CreditCard,
  FileText,
  Clock,
  Zap,
  Command
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Transaction, Task, WishlistItem, Debt, MaintenanceInvoice } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: {
    transactions: Transaction[];
    tasks: Task[];
    wishlist: WishlistItem[];
    debts: Debt[];
    invoices: MaintenanceInvoice[];
  };
  onSelectItem: (type: string, id: string) => void;
}

export const CommandPalette: React.FC<Props> = ({ isOpen, onClose, data, onSelectItem }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? onClose() : null; // This is handled parent side usually
      }
      if (isOpen) {
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowDown') setSelectedIndex(s => s + 1);
        if (e.key === 'ArrowUp') setSelectedIndex(s => s - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    const items: any[] = [];

    // Search Transactions
    data.transactions.forEach(t => {
      if (t.description.toLowerCase().includes(q) || t.amount.toString().includes(q) || t.category?.toLowerCase().includes(q)) {
        items.push({ type: 'transaction', id: t.id, title: t.description, subtitle: `${t.amount.toLocaleString()} د.ع • ${t.date}`, icon: Wallet });
      }
    });

    // Search Tasks
    data.tasks.forEach(t => {
      if (t.title.toLowerCase().includes(q)) {
        items.push({ type: 'task', id: t.id, title: t.title, subtitle: `ئیشی ناو ماڵ • ${t.status === 'completed' ? 'تەواوکراو' : 'ماوە'}`, icon: CheckCircle2 });
      }
    });

    // Search Wishlist
    data.wishlist.forEach(w => {
      if (w.title.toLowerCase().includes(q)) {
        items.push({ type: 'wishlist', id: w.id, title: w.title, subtitle: `پێداویستی${w.estimatedPrice ? ` • ${w.estimatedPrice.toLocaleString()} د.ع` : ''}`, icon: ShoppingCart });
      }
    });

    // Search Debts
    data.debts.forEach(d => {
      if (d.personName.toLowerCase().includes(q)) {
        items.push({ type: 'debt', id: d.id, title: d.personName, subtitle: `قەرز • ${d.amount.toLocaleString()} د.ع`, icon: CreditCard });
      }
    });

    return items.slice(0, 10);
  }, [query, data]);

  const safeIndex = results.length > 0 ? ((selectedIndex % results.length) + results.length) % results.length : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-[10vh] px-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl pointer-events-auto"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl bg-[var(--bg-card)] rounded-[2rem] shadow-2xl overflow-hidden border border-[var(--border-color)] pointer-events-auto"
          >
            <div className="flex items-center gap-4 px-6 py-5 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
              <Search className="w-6 h-6 text-blue-600" />
              <input
                autoFocus
                placeholder="گەڕان بۆ هەر شتێک (وەکو: بەنزین، شیر، قەرز...)"
                className="flex-1 bg-transparent border-none outline-none text-xl font-black text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                value={query}
                onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && results[safeIndex]) {
                    onSelectItem(results[safeIndex].type, results[safeIndex].id);
                    onClose();
                  }
                }}
              />
              <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded-lg text-[10px] font-black text-[var(--text-muted)]">
                <Command className="w-3 h-3" />
                <span>K</span>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto py-4">
              {query === '' ? (
                <div className="px-8 py-10 text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Zap className="w-8 h-8 fill-blue-600" />
                  </div>
                  <h3 className="text-xl font-black text-[var(--text-main)]">گەڕانی خیرا</h3>
                  <p className="text-sm font-bold text-[var(--text-muted)] max-w-sm mx-auto">
                    لێرەوە دەتوانیت بەخێرایی بگەیت بە هەر زانیارییەک کە پێویستتە لە سیستەمەکەدا. تەنها بنوسە...
                  </p>
                </div>
              ) : results.length === 0 ? (
                <div className="px-8 py-12 text-center text-[var(--text-muted)] font-bold">
                  هیچ ئەنجامێک نەدۆزرایەوە بۆ "{query}"
                </div>
              ) : (
                <div className="px-3 space-y-1">
                  {results.map((item, idx) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => { onSelectItem(item.type, item.id); onClose(); }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all text-right",
                        idx === safeIndex ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                    >
                      <div className={cn(
                        "p-3 rounded-xl",
                        idx === safeIndex ? "bg-white/20" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                      )}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn("text-base font-black truncate", idx === safeIndex ? "text-white" : "text-[var(--text-main)]")}>{item.title}</div>
                        <div className={cn("text-[10px] font-black uppercase tracking-widest", idx === safeIndex ? "text-blue-100" : "text-[var(--text-muted)]")}>{item.subtitle}</div>
                      </div>
                      <ArrowRight className={cn("w-5 h-5 shrink-0", idx === safeIndex ? "opacity-100" : "opacity-0")} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-[var(--bg-main)] border-top border-[var(--border-color)] flex items-center justify-between">
              <div className="flex items-center gap-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">
                <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded">↵</span> هەڵبژاردن</span>
                <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded">↓↑</span> جوڵە</span>
                <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded">ESC</span> داخستن</span>
              </div>
              <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest">گەڕانی بلیمەت</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
