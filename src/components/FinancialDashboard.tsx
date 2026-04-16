import React from 'react';
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
  Legend
} from 'recharts';
import { MaintenanceInvoice, Transaction, Debt } from '../types';
import { TrendingUp, TrendingDown, Wallet, CreditCard, Users, Package, AlertCircle, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface Props {
  invoices: MaintenanceInvoice[];
  transactions: Transaction[];
  debts: Debt[];
}

export const FinancialDashboard: React.FC<Props> = ({ invoices, transactions, debts }) => {
  // Calculate stats
  const totalInvoiceIncome = invoices.reduce((sum, inv) => sum + (inv.cashPaid || 0), 0);
  const totalInvoiceDebt = invoices.reduce((sum, inv) => sum + (inv.debtAmount || 0), 0);
  
  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  
  const totalTransactionIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalTransactionExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  const totalCash = totalInvoiceIncome + totalTransactionIncome - totalTransactionExpense;
  const totalOwedToMe = totalInvoiceDebt + debts.filter(d => d.type === 'owing' && !d.completed).reduce((sum, d) => sum + d.amount, 0);
  const totalIOwe = debts.filter(d => d.type === 'owed' && !d.completed).reduce((sum, d) => sum + d.amount, 0);

  // Chart data: Last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const chartData = last7Days.map(date => {
    const dayInvoices = invoices.filter(inv => inv.date === date);
    const dayTransactions = transactions.filter(t => t.date === date);
    
    const income = dayInvoices.reduce((sum, inv) => sum + (inv.cashPaid || 0), 0) +
                   dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    
    const expense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    return {
      date: date.split('-').slice(1).join('/'),
      income,
      expense
    };
  });

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-[var(--bg-card)] p-6 rounded-[32px] border border-[var(--border-color)] shadow-sm"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-2xl", color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <div className={cn("flex items-center gap-1 text-xs font-bold", trend > 0 ? "text-green-500" : "text-red-500")}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <h3 className="text-[var(--text-muted)] text-sm font-bold mb-1">{title}</h3>
      <p className="text-2xl font-black text-[var(--text-main)]">{value.toLocaleString()} <span className="text-xs">د.ع</span></p>
    </motion.div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-main)] flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-amber-500" />
            داشبۆردی دارایی
          </h1>
          <p className="text-[var(--text-muted)] font-bold mt-1">کورتەی دۆخی دارایی و کارەکانت</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-2xl border border-blue-100 dark:border-blue-900/30">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div className="px-2">
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase">کاش لەبەردەست</p>
            <p className="text-lg font-black text-blue-700 dark:text-blue-300">{totalCash.toLocaleString()} <span className="text-xs">د.ع</span></p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="کۆی داهات" 
          value={totalInvoiceIncome + totalTransactionIncome} 
          icon={TrendingUp} 
          color="bg-green-500" 
        />
        <StatCard 
          title="کۆی خەرجی" 
          value={totalTransactionExpense} 
          icon={TrendingDown} 
          color="bg-red-500" 
        />
        <StatCard 
          title="قەرزی لای خەڵک" 
          value={totalOwedToMe} 
          icon={Users} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="قەرزی سەر من" 
          value={totalIOwe} 
          icon={CreditCard} 
          color="bg-amber-500" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-[var(--text-main)]">داهات و خەرجی (٧ ڕۆژی ڕابردوو)</h3>
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-[var(--text-muted)]">داهات</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-[var(--text-muted)]">خەرجی</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 'bold' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 'bold' }}
                  tickFormatter={(value) => value >= 1000 ? `${value/1000}k` : value}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-card)', 
                    borderColor: 'var(--border-color)',
                    borderRadius: '16px',
                    fontWeight: 'bold'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#3b82f6" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorIncome)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="expense" 
                  stroke="#ef4444" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorExpense)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Chart */}
        <div className="bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border-color)] shadow-sm flex flex-col">
          <h3 className="text-xl font-black text-[var(--text-main)] mb-8">دابەشبوونی داهات</h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'وەسڵەکان', value: totalInvoiceIncome },
                    { name: 'داهاتی تر', value: totalTransactionIncome }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#10b981" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4">
            <div className="flex justify-between items-center p-3 bg-[var(--bg-main)] rounded-2xl">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm font-bold text-[var(--text-main)]">وەسڵەکان</span>
              </div>
              <span className="text-sm font-black text-[var(--text-main)]">{totalInvoiceIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[var(--bg-main)] rounded-2xl">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm font-bold text-[var(--text-main)]">داهاتی تر</span>
              </div>
              <span className="text-sm font-black text-[var(--text-main)]">{totalTransactionIncome.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts & Insights */}
      {(totalIOwe > 0 || totalOwedToMe > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {totalOwedToMe > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/20 flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-black text-blue-900 dark:text-blue-100">ئاگاداری قەرز</h4>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-300 mt-1">
                  بڕی {totalOwedToMe.toLocaleString()} دینار قەرزت لای خەڵکە. هەوڵ بدە وەریان بگریتەوە.
                </p>
              </div>
            </div>
          )}
          {totalIOwe > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-[32px] border border-amber-100 dark:border-amber-900/20 flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h4 className="font-black text-amber-900 dark:text-amber-100">ئەرکی قەرز</h4>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-300 mt-1">
                  بڕی {totalIOwe.toLocaleString()} دینار قەرزت لەسەرە. پلانی بۆ دابنێ بۆ دانەوەی.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
