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
          <div className={cn("flex items-center gap-1 text-xs font-black px-2 py-1 rounded-lg", trend <= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
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
          <div className="bg-[var(--bg-card)] p-4 rounded-[32px] border border-[var(--border-color)] shadow-sm flex items-center gap-4">
            <div className="relative w-16 h-16">
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <path className="text-slate-200 dark:text-slate-800" strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                <path className="text-blue-600" strokeDasharray={`${stats.healthScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-black">{Math.round(stats.healthScore)}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase">نمرەی دارایی</p>
              <p className="font-black text-[var(--text-main)]">تەندروستی باش</p>
            </div>
          </div>

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
        <div className="lg:col-span-2 bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border-color)] shadow-sm">
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

        {/* Category Breakdown & Insights */}
        <div className="space-y-8">
          <div className="bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border-color)] shadow-sm">
            <h3 className="text-xl font-black text-[var(--text-main)] mb-6">زۆرترین خەرجی</h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {stats.categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 mt-6">
              {stats.categoryData.map((cat, idx) => (
                <div key={cat.name} className="flex justify-between items-center group cursor-default">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-sm font-bold text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">{cat.name}</span>
                  </div>
                  <span className="text-sm font-black text-[var(--text-main)]">{formatValue(cat.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Insights Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
            <Zap className="absolute top-4 right-4 w-24 h-24 text-white/10 -mr-8 -mt-8" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-xs font-black uppercase tracking-wider">ڕاوێژکاری زیرەک</span>
              </div>
              <h4 className="text-xl font-black mb-2">ڕێژەی پاشەکەوت: {Math.round(stats.savingsRate)}%</h4>
              <p className="text-sm font-medium text-blue-100 leading-relaxed">
                {stats.savingsRate > 20 
                  ? "ئاستی پاشەکەوتت زۆر باشە! بەردەوام بە لەسەر ئەم ڕەوتە بۆ گەیشتن بە ئامانجەکانت."
                  : "هەوڵ بدە خەرجییە ناپێویستەکان کەم بکەیتەوە بۆ ئەوەی ڕێژەی پاشەکەوتت بەرز بکەیتەوە."}
              </p>
              <button className="mt-6 w-full py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2">
                بینینی ڕاپۆرتی ورد <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Health Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-900/20 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center shrink-0">
            <Target className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">داهاتی گشتی</p>
            <p className="text-lg font-black text-emerald-900 dark:text-emerald-100">{formatValue(stats.income)}</p>
          </div>
        </div>

        <div className="bg-rose-50 dark:bg-rose-900/10 p-6 rounded-[32px] border border-rose-100 dark:border-rose-900/20 flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center shrink-0">
            <TrendingDown className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase">خەرجی گشتی</p>
            <p className="text-lg font-black text-rose-900 dark:text-rose-100">{formatValue(stats.expense)}</p>
          </div>
        </div>

        <div className="bg-sky-50 dark:bg-sky-900/10 p-6 rounded-[32px] border border-sky-100 dark:border-sky-900/20 flex items-center gap-4">
          <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-2xl flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <p className="text-[10px] font-black text-sky-600 dark:text-sky-400 uppercase">خەرجی ڕۆژانە (تێکڕا)</p>
            <p className="text-lg font-black text-sky-900 dark:text-sky-100">{formatValue(Math.round(stats.expense / 30))}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
