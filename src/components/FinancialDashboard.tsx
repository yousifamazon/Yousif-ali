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

    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) +
                   invoices.reduce((sum, inv) => sum + (inv.cashPaid || 0), 0);
    
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    const currentMonthExpense = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const prevMonthExpense = prevMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const expenseTrend = prevMonthExpense > 0 ? ((currentMonthExpense - prevMonthExpense) / prevMonthExpense) * 100 : 0;

    // Category breakdown
    const categories: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.subCategory || t.category || 'گشتی';
      categories[cat] = (categories[cat] || 0) + t.amount;
    });

    const categoryData = Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Financial Health Score (0-100)
    // Factors: Savings rate, Debt ratio, Budget adherence
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
    const debtRatio = income > 0 ? (debts.filter(d => d.type === 'owed' && !d.completed).reduce((sum, d) => sum + d.amount, 0) / income) * 100 : 0;
    
    let healthScore = 50;
    healthScore += Math.min(25, savingsRate / 2);
    healthScore -= Math.min(25, debtRatio / 2);
    healthScore = Math.max(0, Math.min(100, healthScore));

    const totalSavings = savingsGoals.reduce((acc, goal) => acc + (goal.currentAmount || 0), 0);

    return {
      income,
      expense,
      currentMonthExpense,
      expenseTrend,
      categoryData,
      healthScore,
      savingsRate,
      totalCash: income - expense,
      totalSavings,
      totalOwedToMe: invoices.reduce((sum, inv) => sum + (inv.debtAmount || 0), 0) + 
                     debts.filter(d => d.type === 'owing' && !d.completed).reduce((sum, d) => sum + d.amount, 0),
      totalIOwe: debts.filter(d => d.type === 'owed' && !d.completed).reduce((sum, d) => sum + d.amount, 0)
    };
  }, [invoices, transactions, debts, savingsGoals]);

  // Chart data: Last 14 days for better trend
  const chartData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
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
    }).reverse();
  }, [invoices, transactions]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  const StatCard = ({ title, value, icon: Icon, color, trend, subtitle }: any) => (
    <motion.div 
      whileHover={{ y: -5, scale: 1.02 }}
      className="bg-[var(--bg-card)] p-7 rounded-[32px] border border-[var(--border-color)] shadow-premium hover:shadow-hover transition-all relative overflow-hidden group"
    >
      <div className={cn("absolute top-0 right-0 w-24 h-24 opacity-5 -mr-8 -mt-8 rounded-full transition-transform group-hover:scale-150", color)} />
      <div className="flex justify-between items-start mb-5 relative z-10">
        <div className={cn("p-4 rounded-2xl shadow-lg", color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend !== undefined && (
          <div className={cn("flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full", trend <= 0 ? "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30" : "bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30")}>
            {trend <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
            {Math.abs(Math.round(trend))}%
          </div>
        )}
      </div>
      <h3 className="text-[var(--text-muted)] text-xs font-black uppercase tracking-wider mb-2 relative z-10">{title}</h3>
      <p className="text-2xl font-black text-[var(--text-main)] relative z-10 tracking-tight">{formatValue(value)}</p>
      {subtitle && <p className="text-[10px] font-bold text-[var(--text-muted)] mt-2 opacity-60 uppercase">{subtitle}</p>}
    </motion.div>
  );

  return (
    <div className="space-y-10">
      {/* Inspired by Mockup: Large Unified Balance Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-gradient-to-br from-blue-600 to-blue-700 rounded-[40px] p-8 text-white shadow-2xl shadow-blue-500/30 overflow-hidden min-h-[340px] flex flex-col justify-between"
      >
        {/* Abstract Background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/10 rounded-full blur-2xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10">
          <p className="text-blue-100 text-sm font-black text-right mb-2 tracking-wide uppercase opacity-90">کۆی گشتی باڵانس</p>
          <div className="flex flex-row-reverse items-baseline gap-3">
             <h2 className="text-5xl font-black tracking-tighter leading-none">
              {stats.totalCash.toLocaleString()}
            </h2>
            <span className="text-xl font-bold text-blue-100">د.ع</span>
          </div>
        </div>

        <div className="relative z-10 mt-auto flex flex-col items-end gap-6">
          {/* Savings Box */}
          <div className="bg-blue-800/40 backdrop-blur-xl border border-white/10 p-5 rounded-[32px] min-w-[200px] text-right">
            <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">کۆی پاشەکەوت</p>
            <div className="flex flex-row-reverse items-baseline gap-2">
              <p className="text-2xl font-black tracking-tight">{stats.totalSavings.toLocaleString()}</p>
              <span className="text-xs font-bold text-blue-200">د.ع</span>
            </div>
          </div>

          {/* Action Row Cluster */}
          <div className="flex flex-wrap flex-row-reverse gap-3">
            <motion.button 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onAction?.('income')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-lg border border-white/20 px-5 py-3 rounded-2xl font-black text-sm transition-all"
            >
              <span>داهات</span>
              <Plus className="w-4 h-4" />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onAction?.('expense')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-lg border border-white/20 px-5 py-3 rounded-2xl font-black text-sm transition-all"
            >
              <span>خەرجی</span>
              <ArrowUpRight className="w-4 h-4" />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onAction?.('savings')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-lg border border-white/20 px-5 py-3 rounded-2xl font-black text-sm transition-all"
            >
              <span>هەلكرتن</span>
              <Vault className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="کۆی داهات" 
          value={stats.income} 
          icon={TrendingUp} 
          color="bg-emerald-500" 
          subtitle="هەموو کاتەکان"
        />
        <StatCard 
          title="خەرجی ئەم مانگە" 
          value={stats.currentMonthExpense} 
          icon={TrendingDown} 
          color="bg-rose-500" 
          trend={stats.expenseTrend}
          subtitle="بەراورد بە مانگی پێشوو"
        />
        <StatCard 
          title="قەرزی لای خەڵک" 
          value={stats.totalOwedToMe} 
          icon={Users} 
          color="bg-sky-500" 
          subtitle="وەسڵ و قەرزەکان"
        />
        <StatCard 
          title="قەرزی سەر من" 
          value={stats.totalIOwe} 
          icon={CreditCard} 
          color="bg-amber-500" 
          subtitle="پێویستە بدرێتەوە"
        />
      </div>

      {/* Advanced Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Trend Chart */}
        <div className="lg:col-span-3 bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border-color)] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <h3 className="text-xl font-black text-[var(--text-main)]">ڕەوتی دارایی</h3>
              <p className="text-xs font-bold text-[var(--text-muted)]">١٤ ڕۆژی ڕابردوو</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs font-bold text-[var(--text-muted)]">داهات</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-xs font-bold text-[var(--text-muted)]">خەرجی</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 'bold' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 'bold' }}
                  tickFormatter={(value) => value >= 1000 ? `${value/1000}k` : value}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-card)', 
                    borderColor: 'var(--border-color)',
                    borderRadius: '24px',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    border: 'none',
                    padding: '16px'
                  }} 
                  itemStyle={{ fontWeight: '900', fontSize: '14px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#3b82f6" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorIncome)" 
                  animationDuration={1500}
                />
                <Area 
                  type="monotone" 
                  dataKey="expense" 
                  stroke="#f43f5e" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorExpense)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
