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
import { MaintenanceInvoice, Transaction, Debt } from '../types';
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
  currency?: 'IQD' | 'USD';
  exchangeRate?: number;
}

export const FinancialDashboard: React.FC<Props> = ({ invoices, transactions, debts, currency = 'IQD', exchangeRate = 1500 }) => {
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

    return {
      income,
      expense,
      currentMonthExpense,
      expenseTrend,
      categoryData,
      healthScore,
      savingsRate,
      totalCash: income - expense,
      totalOwedToMe: invoices.reduce((sum, inv) => sum + (inv.debtAmount || 0), 0) + 
                     debts.filter(d => d.type === 'owing' && !d.completed).reduce((sum, d) => sum + d.amount, 0),
      totalIOwe: debts.filter(d => d.type === 'owed' && !d.completed).reduce((sum, d) => sum + d.amount, 0)
    };
  }, [invoices, transactions, debts]);

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
      className="bg-[var(--bg-card)] p-6 rounded-[32px] border border-[var(--border-color)] shadow-sm relative overflow-hidden group"
    >
      <div className={cn("absolute top-0 right-0 w-24 h-24 opacity-5 -mr-8 -mt-8 rounded-full transition-transform group-hover:scale-150", color)} />
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={cn("p-3 rounded-2xl shadow-lg", color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs font-black px-2 py-1 rounded-lg", trend <= 0 ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400")}>
            {trend <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
            {Math.abs(Math.round(trend))}%
          </div>
        )}
      </div>
      <h3 className="text-[var(--text-muted)] text-sm font-bold mb-1 relative z-10">{title}</h3>
      <p className="text-2xl font-black text-[var(--text-main)] relative z-10">{formatValue(value)}</p>
      {subtitle && <p className="text-[10px] font-bold text-[var(--text-muted)] mt-1">{subtitle}</p>}
    </motion.div>
  );

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-8 bg-blue-600 rounded-full" />
            <h1 className="text-4xl font-black text-[var(--text-main)] tracking-tight">
              کۆنترۆڵی دارایی
            </h1>
          </div>
          <p className="text-[var(--text-muted)] font-bold text-lg">بەخێربێیتەوە، یوسف. لێرە هەموو شتێک لەژێر چاودێریدایە.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-4 rounded-[32px] text-white shadow-xl shadow-blue-200 dark:shadow-none flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-100 uppercase">کۆی باڵانس</p>
              <p className="text-xl font-black">{formatValue(stats.totalCash)}</p>
            </div>
          </div>
        </div>
      </div>

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
