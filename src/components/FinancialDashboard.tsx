import React, { useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { MaintenanceInvoice, Transaction, Debt, SavingsGoal } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard, 
  Users, 
  Package, 
  AlertCircle, 
  Sparkles, 
  Target, 
  Zap, 
  ShieldCheck,
  ArrowUpRight,
  Plus,
  Vault,
  Calendar,
  DollarSign
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths } from 'date-fns';

interface Props {
  invoices: MaintenanceInvoice[];
  transactions: Transaction[];
  debts: Debt[];
  savingsGoals: SavingsGoal[];
  currency?: 'IQD' | 'USD';
  exchangeRate?: number;
  onAction?: (type: 'income' | 'expense' | 'savings') => void;
}

export const FinancialDashboard: React.FC<Props> = ({ 
  invoices, 
  transactions, 
  debts, 
  savingsGoals,
  currency = 'IQD', 
  exchangeRate = 1500,
  onAction
}) => {
  const formatValue = (amount: number) => {
    if (currency === 'USD') {
      return `$${(amount / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${amount.toLocaleString()} د.ع`;
  };

  // Advanced Calculations
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthEnd = endOfMonth(subMonths(now, 1));

    const currentMonthTransactions = transactions.filter(t => 
      isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd })
    );

    const prevMonthTransactions = transactions.filter(t => 
      isWithinInterval(parseISO(t.date), { start: prevMonthStart, end: prevMonthEnd })
    );

    const transactionsList = transactions || [];
    const invoicesList = invoices || [];
    const debtsList = debts || [];

    const income = transactionsList.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) +
                   invoicesList.reduce((sum, inv) => sum + (inv.cashPaid || 0), 0);
    
    const expense = transactionsList.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    let totalCash = income - expense;

    // Account for savings movements in total wallet cash
    transactionsList.filter(t => t.type === 'savings').forEach(t => {
      if (t.savingsEffect === 'add') {
        totalCash += t.amount; // Withdrawing from savings adds to wallet
      } else if (t.savingsEffect === 'subtract') {
        totalCash -= t.amount; // Putting to savings removes from wallet
      }
    });
    
    const currentMonthExpense = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const prevMonthExpense = prevMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const expenseTrend = prevMonthExpense > 0 ? ((currentMonthExpense - prevMonthExpense) / prevMonthExpense) * 100 : 0;

    // Category breakdown
    const categories: Record<string, number> = {};
    transactionsList.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.subCategory || t.category || 'گشتی';
      categories[cat] = (categories[cat] || 0) + t.amount;
    });

    const categoryData = Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Financial Health Score (0-100)
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
    const debtRatio = income > 0 ? (debtsList.filter(d => d.type === 'owed' && !d.completed).reduce((sum, d) => sum + d.amount, 0) / income) * 100 : 0;
    
    let healthScore = 50;
    healthScore += Math.min(25, savingsRate / 2);
    healthScore -= Math.min(25, debtRatio / 2);
    healthScore = Math.max(0, Math.min(100, healthScore));

    const totalSavings = (savingsGoals || []).reduce((acc, goal) => acc + (goal.currentAmount || 0), 0);

    return {
      income,
      expense,
      currentMonthExpense,
      expenseTrend,
      categoryData,
      healthScore,
      savingsRate,
      totalCash,
      totalSavings,
      totalOwedToMe: invoicesList.reduce((sum, inv) => sum + (inv.debtAmount || 0), 0) + 
                     debtsList.filter(d => d.type === 'owing' && !d.completed).reduce((sum, d) => sum + d.amount, 0),
      totalIOwe: debtsList.filter(d => d.type === 'owed' && !d.completed).reduce((sum, d) => sum + d.amount, 0)
    };
  }, [invoices, transactions, debts, savingsGoals]);

  // Chart data: Last 14 days for trend
  const chartData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const dateStr = d.toISOString().split('T')[0];
      
      const dayInvoices = invoices.filter(inv => inv.date === dateStr);
      const dayTransactions = transactions.filter(t => t.date === dateStr);
      
      const income = dayInvoices.reduce((sum, inv) => sum + (inv.cashPaid || 0), 0) +
                     dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      
      const expense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      
      return {
        date: format(d, 'MM/dd'),
        income,
        expense
      };
    });
  }, [invoices, transactions]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-12">
      {/* --- AI Smart Insight Hub --- */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600/5 to-transparent border-l-4 border-blue-600 p-6 rounded-2xl flex items-center gap-4 shadow-sm"
      >
        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20 shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-black text-blue-600 text-xs uppercase tracking-widest mb-1">تێبینی ژیری دەستکرد بۆ یوسف</h4>
          <p className="text-sm font-bold text-[var(--text-main)] italic leading-relaxed">
            "{stats.savingsRate > 20 ? 'دەستخۆش یوسف! ڕێژەی پاشەکەوتت زۆر باشە، هەوڵبدە ئەم مانگە بەم شێوەیە بەردەوام بیت.' : 'یوسف، خەرجییەکانت کەمێک زیاتر بوون لەم هەفتەیەدا، ئاگاداری ئەو پارە پاشەکەوتانە بە کە دەمێنێتەوە.'}"
          </p>
        </div>
      </motion.div>

      {/* --- Premium Unified Balance Card --- */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group perspective-1000"
      >
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 rounded-[40px] blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />
        
        <div className="relative overflow-hidden rounded-[40px] bg-slate-900 shadow-2xl transition-all duration-500 hover:scale-[1.01] hover:-translate-y-1 min-h-[400px] flex flex-col justify-center items-center p-10">
          {/* Abstract Animated Backgrounds */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[100px] -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-125" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-600/20 rounded-full blur-[80px] -ml-24 -mb-24" />
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] uppercase tracking-[0.3em] font-black text-blue-200/60">کۆی گشتی باڵانس</span>
            </div>

            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-8 drop-shadow-2xl">
              {formatValue(stats.totalCash)}
            </h2>

            <div className="w-full max-w-sm mb-12">
              <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[32px] p-6 text-center transform hover:scale-105 transition-transform duration-500 group/savings">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-300" />
                  <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-widest">کۆی داهات</span>
                </div>
                <div className="text-2xl font-black text-white group-hover/savings:text-emerald-200 transition-colors">
                  {formatValue(stats.income)}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 w-full">
              {[
                { label: 'داهات', type: 'income', icon: Plus },
                { label: 'خەرجی', type: 'expense', icon: ArrowUpRight },
                { label: 'هەلگرتن', type: 'savings', icon: Vault },
              ].map((btn) => (
                <motion.button
                  key={btn.type}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onAction?.(btn.type as any)}
                  className="flex-1 min-w-[120px] max-w-[160px] py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-xl flex items-center justify-center gap-3 transition-all text-white font-black text-xs"
                >
                  <btn.icon className="w-5 h-5" />
                  <span>{btn.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* --- Main Stats Grid --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Health Score Gauge */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-[var(--bg-card)] p-8 rounded-[38px] border border-[var(--border-color)] shadow-sm flex flex-col items-center justify-center text-center overflow-hidden relative group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
          <h4 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-wider mb-6">پلەی دۆخی دارایی</h4>
          <div className="relative w-40 h-20 mb-4">
            <svg className="w-full h-full" viewBox="0 0 100 50">
              <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-800" strokeLinecap="round" />
              <motion.path 
                initial={{ pathLength: 0 }}
                animate={{ pathLength: stats.healthScore / 100 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                d="M 10 50 A 40 40 0 0 1 90 50" 
                fill="none" 
                stroke="#2563eb" 
                strokeWidth="10" 
                strokeLinecap="round" 
              />
            </svg>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-2xl font-black text-[var(--text-main)]">
              %{stats.healthScore}
            </div>
          </div>
          <p className="text-[10px] font-bold text-[var(--text-muted)]">ڕەوشی هەنوکەیی</p>
        </motion.div>

        <div className="bg-[var(--bg-card)] p-8 rounded-[38px] border border-[var(--border-color)] shadow-premium hover:shadow-hover transition-all group lg:col-span-1">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20 group-hover:rotate-6 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">کۆی داهات</h4>
          </div>
          <div className="text-2xl font-black text-[var(--text-main)]">{formatValue(stats.income)}</div>
        </div>

        <div className="bg-[var(--bg-card)] p-8 rounded-[38px] border border-[var(--border-color)] shadow-premium hover:shadow-hover transition-all group lg:col-span-1">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-sky-500 text-white rounded-2xl shadow-lg shadow-sky-500/20 group-hover:rotate-6 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">پارەی لای خەڵک</h4>
          </div>
          <div className="text-2xl font-black text-[var(--text-main)]">{formatValue(stats.totalOwedToMe)}</div>
        </div>

        <div className="bg-[var(--bg-card)] p-8 rounded-[38px] border border-[var(--border-color)] shadow-premium hover:shadow-hover transition-all group lg:col-span-1">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-500/20 group-hover:-rotate-6 transition-transform">
              <TrendingDown className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">قەرزی سەر یوسف</h4>
          </div>
          <div className="text-2xl font-black text-[var(--text-main)]">{formatValue(stats.totalIOwe)}</div>
        </div>
      </div>

      {/* --- Advanced Analytics Section --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3 bg-[var(--bg-card)] p-8 md:p-10 rounded-[48px] border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-black text-[var(--text-main)] mb-1">ڕەوتی دارایی ١٤ ڕۆژ</h3>
              <p className="text-xs font-bold text-[var(--text-muted)]">خەرجی و داهاتی ڕۆژانە</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-600 shadow-sm" />
                <span className="text-xs font-black text-[var(--text-muted)]">داهات</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm" />
                <span className="text-xs font-black text-[var(--text-muted)]">خەرجی</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 'bold' }} 
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-card)', 
                    borderColor: 'var(--border-color)',
                    borderRadius: '24px',
                    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
                    border: 'none',
                    padding: '20px'
                  }} 
                  itemStyle={{ fontWeight: '900', fontSize: '14px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#2563eb" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorIncome)" 
                  animationDuration={2000}
                />
                <Area 
                  type="monotone" 
                  dataKey="expense" 
                  stroke="#f43f5e" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorExpense)" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
