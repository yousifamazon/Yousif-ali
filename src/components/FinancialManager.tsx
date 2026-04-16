import React, { useMemo } from 'react';
import { AppData, Transaction, Budget } from '../types';
import { 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  Zap,
  Target,
  ArrowRight,
  PieChart as PieIcon,
  BarChart3
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

interface Props {
  data: AppData;
  currency?: 'IQD' | 'USD';
  exchangeRate?: number;
}

export const FinancialManager: React.FC<Props> = ({ data, currency = 'IQD', exchangeRate = 1500 }) => {
  const formatValue = (amount: number) => {
    if (currency === 'USD') {
      return `$${(amount / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${amount.toLocaleString()} د.ع`;
  };

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const currentMonthTransactions = useMemo(() => 
    (data.transactions || []).filter(t => 
      isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd })
    ), [data.transactions, monthStart, monthEnd]);

  const income = currentMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const savings = income - expense;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;

  // Budget Adherence
  const budgetAdherence = useMemo(() => {
    const budgets = data.budgets || [];
    if (budgets.length === 0) return 100;

    let totalBudget = 0;
    let totalSpent = 0;

    budgets.forEach(b => {
      totalBudget += b.amount;
      const spent = currentMonthTransactions
        .filter(t => t.type === 'expense' && (t.category === b.category || t.subCategory === b.category))
        .reduce((sum, t) => sum + t.amount, 0);
      totalSpent += spent;
    });

    return totalBudget > 0 ? Math.max(0, 100 - (totalSpent / totalBudget) * 100) : 100;
  }, [data.budgets, currentMonthTransactions]);

  // Debt Health
  const debtHealth = useMemo(() => {
    const totalIOwe = (data.debts || []).filter(d => d.type === 'owed' && !d.completed).reduce((sum, d) => sum + d.amount, 0);
    if (totalIOwe === 0) return 100;
    if (income === 0) return 0;
    return Math.max(0, 100 - (totalIOwe / (income * 3)) * 100); // Bad if debt > 3x monthly income
  }, [data.debts, income]);

  const overallScore = Math.round((savingsRate + budgetAdherence + debtHealth) / 3);

  const getStatusColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 dark:text-emerald-400';
    if (score >= 60) return 'text-blue-500 dark:text-blue-400';
    if (score >= 40) return 'text-amber-500 dark:text-amber-400';
    return 'text-rose-500 dark:text-rose-400';
  };

  const getStatusBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 dark:bg-emerald-900/20';
    if (score >= 60) return 'bg-blue-50 dark:bg-blue-900/20';
    if (score >= 40) return 'bg-amber-50 dark:bg-amber-900/20';
    return 'bg-rose-50 dark:bg-rose-900/20';
  };

  const getStatusMessage = (score: number) => {
    if (score >= 80) return 'دۆخی دارایی زۆر نایابە! تۆ بە باشی پلانەکانت جێبەجێ دەکەیت.';
    if (score >= 60) return 'دۆخی دارایی جێگیرە، بەڵام هێشتا جێگەی باشترکردنی تێدایە.';
    if (score >= 40) return 'ئاگاداربە! خەرجییەکانت خەریکە لە کۆنترۆڵ دەردەچن.';
    return 'دۆخی دارایی مەترسیدارە! پێویستت بە گۆڕانکاری خێرا هەیە لە شێوازی خەرجکردن.';
  };

  return (
    <div className="space-y-8">
      {/* Score Overview */}
      <div className={cn("p-8 rounded-[40px] border border-transparent shadow-xl relative overflow-hidden", getStatusBg(overallScore))}>
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10 -mr-20 -mt-20 rounded-full bg-current" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="relative w-40 h-40 shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="3" />
              <motion.circle 
                cx="18" cy="18" r="16" fill="none" 
                className={cn("stroke-current", getStatusColor(overallScore))} 
                strokeWidth="3" 
                strokeDasharray="100, 100" 
                initial={{ strokeDashoffset: 100 }}
                animate={{ strokeDashoffset: 100 - overallScore }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-5xl font-black", getStatusColor(overallScore))}>{overallScore}</span>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">نمرەی گشتی</span>
            </div>
          </div>
          <div className="text-center md:text-right space-y-4">
            <h2 className={cn("text-3xl font-black", getStatusColor(overallScore))}>بەڕێوەبەری دارایی زیرەک</h2>
            <p className="text-lg font-bold text-[var(--text-main)] leading-relaxed max-w-xl">
              {getStatusMessage(overallScore)}
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <div className="px-4 py-2 bg-white/50 dark:bg-black/20 backdrop-blur-sm rounded-2xl border border-white/20 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-black">پاشەکەوت: {Math.round(savingsRate)}%</span>
              </div>
              <div className="px-4 py-2 bg-white/50 dark:bg-black/20 backdrop-blur-sm rounded-2xl border border-white/20 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-black">پابەندی بودجە: {Math.round(budgetAdherence)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strategic Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Savings Strategy */}
        <div className="bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border-color)] shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-[var(--text-main)]">ستراتیژی پاشەکەوت</h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)]">
              <p className="text-xs font-black text-[var(--text-muted)] mb-1 uppercase">ڕێسای ٥٠/٣٠/٢٠</p>
              <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                <div className="h-full bg-blue-500" style={{ width: '50%' }} />
                <div className="h-full bg-amber-500" style={{ width: '30%' }} />
                <div className="h-full bg-emerald-500" style={{ width: '20%' }} />
              </div>
              <div className="flex justify-between mt-2 text-[10px] font-bold">
                <span>پێویستی (٥٠٪)</span>
                <span>ئارەزوو (٣٠٪)</span>
                <span>پاشەکەوت (٢٠٪)</span>
              </div>
            </div>
            <p className="text-sm font-bold text-[var(--text-muted)] leading-relaxed">
              بەپێی داهاتی ئەم مانگەت ({formatValue(income)}), پێویستە لانی کەم {formatValue(income * 0.2)} پاشەکەوت بکەیت.
            </p>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border-color)] shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-2xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-[var(--text-main)]">هەڵسەنگاندنی مەترسی</h3>
          </div>
          <div className="space-y-4">
            {expense > income ? (
              <div className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                <Info className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-sm font-bold text-rose-700 dark:text-rose-300">خەرجییەکانت لە داهاتت زیاترە! ئەمە دەبێتە هۆی دروستبوونی قەرز.</p>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">باڵانسی داهات و خەرجی لە دۆخێکی باشدایە.</p>
              </div>
            )}
            <div className="p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)]">
              <p className="text-xs font-black text-[var(--text-muted)] mb-1 uppercase">قەرزی سەر من</p>
              <p className="text-xl font-black text-[var(--text-main)]">
                {formatValue(data.debts?.filter(d => d.type === 'owed' && !d.completed).reduce((sum, d) => sum + d.amount, 0))}
              </p>
            </div>
          </div>
        </div>

        {/* Smart Alerts */}
        <div className="bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border-color)] shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-[var(--text-main)]">ئاگادارییە زیرەکەکان</h3>
          </div>
          <div className="space-y-3">
            {(data.budgets || []).map(b => {
              const spent = currentMonthTransactions
                .filter(t => t.type === 'expense' && (t.category === b.category || t.subCategory === b.category))
                .reduce((sum, t) => sum + t.amount, 0);
              const percent = (spent / b.amount) * 100;
              
              if (percent > 80) {
                return (
                  <div key={b.id} className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20 flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300">بودجەی {b.category} لە لێواری تەواوبووندایە</span>
                    <span className="text-xs font-black text-amber-800 dark:text-amber-200">{Math.round(percent)}%</span>
                  </div>
                );
              }
              return null;
            })}
            {data.transactions?.filter(t => t.isRecurring).length > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20 flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">خەرجی دووبارەبووەوەت هەیە بۆ ئەمڕۆ</span>
                <ArrowRight className="w-4 h-4 text-blue-600" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
