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
import { MaintenanceInvoice, Transaction, Debt, SavingsGoal, Activity } from '../types';
import { ActivityFeed } from './ActivityFeed';
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
  DollarSign,
  EyeOff,
  History
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths } from 'date-fns';

interface Props {
  invoices: MaintenanceInvoice[];
  transactions: Transaction[];
  debts: Debt[];
  savingsGoals: SavingsGoal[];
  activities?: Activity[];
  isPrivacyMode?: boolean;
  onTogglePrivacy?: () => void;
  currency?: 'IQD' | 'USD';
  exchangeRate?: number;
  onAction?: (type: 'income' | 'expense' | 'savings') => void;
}

export const FinancialDashboard: React.FC<Props> = ({ 
  invoices, 
  transactions, 
  debts, 
  savingsGoals,
  activities = [],
  isPrivacyMode = false,
  onTogglePrivacy,
  currency = 'IQD', 
  exchangeRate = 1500,
  onAction
}) => {
  const formatValue = (amount: number) => {
    if (isPrivacyMode) return '••••••';
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

  const forecastData = useMemo(() => {
    const dailyIncome = stats.income / 30;
    const dailyExpense = stats.expense / 30;
    const currentBalance = stats.totalCash;
    
    return Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      balance: currentBalance + (dailyIncome - dailyExpense) * (i + 1)
    }));
  }, [stats]);

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
            "{stats.totalIOwe > stats.income * 0.5 ? 'یوسف، بڕی قەرزەکانت زۆرە بە بەراورد بە داهاتت، هەوڵبدە سەرەتا قەرزەکان کەمن بکەیتەوە.' : 
               stats.totalOwedToMe > stats.totalCash ? 'بڕێکی باش پارەت لای خەڵکە، ئەگەر ئەو پارانە وەربگریتەوە باڵانست زۆر بەرز دەبێتەوە.' :
               stats.savingsRate > 25 ? 'دەستخۆش یوسف! ڕێژەی پاشەکەوتت نایابە (%' + Math.round(stats.savingsRate) + ')، ئەمە باشترین پلەی داراییە.' : 
               'باری دارایی جێگیرە، یوسف. بەردەوام بە لە تۆمارکردنی وردی وردی خەرجییەکانت.'}"
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
        <div className="lg:col-span-2 bg-[var(--bg-card)] p-8 md:p-10 rounded-[48px] border border-[var(--border-color)] shadow-sm">
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
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 'bold' }} dy={10} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '24px', border: 'none', padding: '20px' }} 
                  itemStyle={{ fontWeight: '900', fontSize: '14px' }}
                />
                <Area type="monotone" dataKey="income" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={4} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] p-8 rounded-[48px] border border-[var(--border-color)] flex flex-col items-center justify-center">
          <h4 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-6">دابەشبوونی خەرجییەکان</h4>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full space-y-3 mt-4">
            {stats.categoryData.map((cat, idx) => (
              <div key={cat.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-xs font-bold text-[var(--text-main)]">{cat.name}</span>
                </div>
                <span className="text-[10px] font-black text-[var(--text-muted)]">{Math.round((cat.value / stats.expense) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- Financial Forecast Projection --- */}
      <div className="bg-slate-900 p-8 md:p-12 rounded-[56px] text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -mr-40 -mt-40 transition-transform duration-1000 group-hover:scale-110" />
        <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-600/30 rounded-full">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">پێشبینی داهاتوو</span>
            </div>
            <h3 className="text-4xl font-black tracking-tighter leading-tight">
              یوسف، پاشەکەوتت چۆن دەبێت لە <span className="text-blue-400">٣٠ ڕۆژی</span> داهاتوودا؟
            </h3>
            <p className="text-slate-400 font-bold leading-relaxed">
              بەپێی ڕەوتی خەرجی و داهاتی ئەم مانگەت، پێشبینی دەکەین باڵانسی کۆتایی مانگت بگاتە نزیکەی {formatValue(forecastData[29].balance)}.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 border border-white/10 rounded-3xl">
                <div className="text-[10px] text-slate-500 font-black mb-1 uppercase tracking-widest">تێکڕای خەرجی ڕۆژانە</div>
                <div className="text-lg font-black">{formatValue(stats.expense / 30)}</div>
              </div>
              <div className="p-4 bg-white/5 border border-white/10 rounded-3xl">
                <div className="text-[10px] text-slate-500 font-black mb-1 uppercase tracking-widest">گەشەی باڵانس</div>
                <div className="text-lg font-black text-emerald-400">+{Math.round(stats.savingsRate)}%</div>
              </div>
            </div>
          </div>
          <div className="w-full md:w-[400px] h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="balance" stroke="#60a5fa" strokeWidth={3} fillOpacity={1} fill="url(#colorForecast)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        <div className="lg:col-span-2 bg-[var(--bg-card)] p-8 md:p-10 rounded-[48px] border border-[var(--border-color)]">
          <ActivityFeed activities={activities} />
        </div>
        
        <div className="space-y-6">
          <div className="bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border-color)] shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-amber-500 rounded-2xl text-white">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-[var(--text-main)]">باری پاراستن</h4>
                <p className="text-[10px] font-bold text-[var(--text-muted)]">Privacy Mode</p>
              </div>
            </div>
            <p className="text-xs font-bold text-[var(--text-muted)] mb-6">
              کاتێک ئەم بارە چالاک دەکەیت، هەموو بڕە پارە هەستیارەکان دادەپۆشرێن بۆ ئەوەی کەس نەیان بینێت.
            </p>
            <div 
              onClick={onTogglePrivacy}
              className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl flex items-center justify-between cursor-pointer group"
            >
              <span className="text-xs font-black transition-colors group-hover:text-blue-600">{isPrivacyMode ? 'چالاکە' : 'ناچالاکە'}</span>
              <div className={cn(
                "w-12 h-6 rounded-full relative transition-colors",
                isPrivacyMode ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
              )}>
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                  isPrivacyMode ? "right-1" : "right-7"
                )} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[40px] text-white shadow-xl shadow-blue-500/10">
            <h4 className="text-sm font-black mb-1">پلانی ساڵانە</h4>
            <p className="text-[10px] text-white/60 mb-6 uppercase tracking-widest font-bold">Annual Strategy</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span>ئاستی پاشەکەوت</span>
                <span className="font-black">%{Math.round(stats.savingsRate)}</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: `${stats.savingsRate}%` }} />
              </div>
              <p className="text-[10px] font-bold leading-relaxed text-blue-100">
                ئەگەر بەم شێوەیە بەردەوام بیت، لە کۆتایی ساڵدا نزیکەی {formatValue(stats.balance * 12)} ت کۆ دەبێتەوە.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
