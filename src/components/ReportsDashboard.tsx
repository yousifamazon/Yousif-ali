import React, { useMemo } from 'react';
import { AppData, MaintenanceInvoice, Transaction } from '../types';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity, PieChart as PieIcon, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isSameMonth } from 'date-fns';

interface Props {
  data: AppData;
  currency?: 'IQD' | 'USD';
  exchangeRate?: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const ReportsDashboard: React.FC<Props> = ({ data, currency = 'IQD', exchangeRate = 1500 }) => {
  const formatValue = (amount: number) => {
    if (currency === 'USD') {
      return `$${(amount / exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${amount.toLocaleString()} د.ع`;
  };

  const last6Months = useMemo(() => {
    const end = new Date();
    const start = subMonths(end, 5);
    return eachMonthOfInterval({ start, end });
  }, []);

  const monthlyData = useMemo(() => {
    return last6Months.map(month => {
      const monthStr = format(month, 'MMM yyyy');
      
      // Personal Transactions
      const transactions = data.transactions.filter(t => isSameMonth(new Date(t.date), month));
      const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

      // Maintenance Invoices
      const invoices = data.maintenanceInvoices.filter(inv => isSameMonth(new Date(inv.date), month));
      const maintenanceRevenue = invoices.reduce((sum, inv) => {
        const amount = inv.totalAfterDiscount;
        const rate = inv.exchangeRate || data.exchangeRate || 1500;
        return sum + (inv.currency === 'USD' ? amount * rate : amount);
      }, 0);
      const maintenancePaid = invoices.reduce((sum, inv) => {
        const amount = inv.cashPaid;
        const rate = inv.exchangeRate || data.exchangeRate || 1500;
        return sum + (inv.currency === 'USD' ? amount * rate : amount);
      }, 0);

      return {
        name: monthStr,
        income: income + maintenancePaid,
        expense: expense,
        revenue: maintenanceRevenue,
        profit: (income + maintenancePaid) - expense
      };
    });
  }, [data, last6Months]);

  const workTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.maintenanceInvoices.forEach(inv => {
      inv.items.forEach(item => {
        const type = item.name || 'گشتی';
        counts[type] = (counts[type] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [data.maintenanceInvoices]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-[var(--text-main)]">ڕاپۆرتە داراییەکان</h2>
        <p className="text-[var(--text-muted)] font-bold">شیکردنەوەی داهات و خەرجییەکان لە ٦ مانگی ڕابردوودا</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-[var(--text-muted)]">کۆی داهات (ئەم مانگە)</span>
          </div>
          <p className="text-2xl font-black text-[var(--text-main)]">
            {formatValue(monthlyData[monthlyData.length - 1].income)}
          </p>
        </div>

        <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl">
              <TrendingDown className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-[var(--text-muted)]">کۆی خەرجی (ئەم مانگە)</span>
          </div>
          <p className="text-2xl font-black text-[var(--text-main)]">
            {formatValue(monthlyData[monthlyData.length - 1].expense)}
          </p>
        </div>

        <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-[var(--text-muted)]">قازانجی پاک (ئەم مانگە)</span>
          </div>
          <p className="text-2xl font-black text-green-600 dark:text-green-400">
            {formatValue(monthlyData[monthlyData.length - 1].profit)}
          </p>
        </div>

        <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-[var(--text-muted)]">کۆی ئیشی کارگە</span>
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {formatValue(monthlyData[monthlyData.length - 1].revenue)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-black text-[var(--text-main)]">داهات و خەرجی مانگانە</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '16px', border: '1px solid var(--border-color)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="income" stroke="#3b82f6" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} name="داهات" />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={3} name="خەرجی" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] p-8 rounded-[40px] border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <PieIcon className="w-6 h-6 text-indigo-600" />
            <h3 className="text-xl font-black text-[var(--text-main)]">جۆرەکانی ئیش و پارچە</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={workTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {workTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '16px' }}
                />
                <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
