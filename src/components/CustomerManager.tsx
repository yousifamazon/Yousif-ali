import React, { useMemo, useState } from 'react';
import { MaintenanceInvoice } from '../types';
import { User, Phone, CreditCard, Search, ArrowUpRight, ArrowDownRight, FileText, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface Props {
  invoices: MaintenanceInvoice[];
  onViewInvoice: (invoice: MaintenanceInvoice) => void;
}

interface CustomerSummary {
  name: string;
  mobile: string;
  totalBusiness: number;
  totalPaid: number;
  totalDebt: number;
  invoiceCount: number;
  lastInvoiceDate: string;
}

export const CustomerManager: React.FC<Props> = ({ invoices, onViewInvoice }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const customerSummaries = useMemo(() => {
    const summaries: Record<string, CustomerSummary> = {};

    invoices.forEach(inv => {
      const key = inv.customerName || 'بێ ناو';
      if (!summaries[key]) {
        summaries[key] = {
          name: key,
          mobile: inv.mobile || '',
          totalBusiness: 0,
          totalPaid: 0,
          totalDebt: 0,
          invoiceCount: 0,
          lastInvoiceDate: inv.date
        };
      }

      summaries[key].totalBusiness += inv.totalAfterDiscount;
      summaries[key].totalPaid += inv.cashPaid;
      summaries[key].totalDebt += inv.debtAmount;
      summaries[key].invoiceCount += 1;
      
      if (new Date(inv.date) > new Date(summaries[key].lastInvoiceDate)) {
        summaries[key].lastInvoiceDate = inv.date;
      }
    });

    return Object.values(summaries).sort((a, b) => b.totalDebt - a.totalDebt);
  }, [invoices]);

  const filteredCustomers = customerSummaries.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.mobile.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-main)]">بەڕێوەبردنی کڕیاران</h2>
          <p className="text-[var(--text-muted)] font-bold">بینینی لیستی کڕیارەکان و کۆی گشتی قەرزەکانیان</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input 
            type="text" 
            placeholder="گەڕان بۆ کڕیار..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pr-12 pl-4 py-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-800/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-800/40 rounded-xl text-blue-600 dark:text-blue-400">
              <User className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">کۆی کڕیاران</span>
          </div>
          <p className="text-3xl font-black text-blue-700 dark:text-blue-400">{customerSummaries.length}</p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-3xl border border-red-100 dark:border-red-800/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-800/40 rounded-xl text-red-600 dark:text-red-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-red-600 dark:text-red-400">کۆی قەرزی کڕیاران</span>
          </div>
          <p className="text-3xl font-black text-red-700 dark:text-red-400">
            {customerSummaries.reduce((sum, c) => sum + c.totalDebt, 0).toLocaleString()} د.ع
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-3xl border border-green-100 dark:border-green-800/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-800/40 rounded-xl text-green-600 dark:text-green-400">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-green-600 dark:text-green-400">کۆی پارەی وەرگیراو</span>
          </div>
          <p className="text-3xl font-black text-green-700 dark:text-green-300">
            {customerSummaries.reduce((sum, c) => sum + c.totalPaid, 0).toLocaleString()} د.ع
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredCustomers.map((customer, idx) => (
          <motion.div 
            key={`${customer.name}-${idx}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-[var(--bg-card)] rounded-3xl p-6 border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[var(--text-main)]">{customer.name}</h3>
                  <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm font-bold">
                    <Phone className="w-3 h-3" />
                    {customer.mobile || 'بێ مۆبایل'}
                  </div>
                </div>
              </div>
              <div className="text-left">
                <span className="text-[10px] bg-[var(--bg-main)] px-2 py-1 rounded-lg border border-[var(--border-color)] font-bold text-[var(--text-muted)]">
                  {customer.invoiceCount} وەسڵ
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)]">
                <p className="text-[10px] text-[var(--text-muted)] font-bold mb-1">کۆی ئیش</p>
                <p className="text-sm font-black text-[var(--text-main)]">{customer.totalBusiness.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                <p className="text-[10px] text-green-600 dark:text-green-400 font-bold mb-1">وەرگیراو</p>
                <p className="text-sm font-black text-green-700 dark:text-green-300">{customer.totalPaid.toLocaleString()}</p>
              </div>
              <div className={cn(
                "p-3 rounded-2xl border",
                customer.totalDebt > 0 
                  ? "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30" 
                  : "bg-[var(--bg-main)] border-[var(--border-color)]"
              )}>
                <p className={cn(
                  "text-[10px] font-bold mb-1",
                  customer.totalDebt > 0 ? "text-red-600 dark:text-red-400" : "text-[var(--text-muted)]"
                )}>قەرز</p>
                <p className={cn(
                  "text-sm font-black",
                  customer.totalDebt > 0 ? "text-red-700 dark:text-red-300" : "text-[var(--text-main)]"
                )}>{customer.totalDebt.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
              <div className="text-xs text-[var(--text-muted)] font-bold">
                دوایین وەسڵ: {customer.lastInvoiceDate}
              </div>
              <button 
                onClick={() => {
                  // Find the last invoice for this customer and view it
                  const lastInv = invoices.filter(inv => (inv.customerName || 'بێ ناو') === customer.name).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                  if (lastInv) onViewInvoice(lastInv);
                }}
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-sm hover:underline"
              >
                بینینی وەسڵەکان <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}

        {filteredCustomers.length === 0 && (
          <div className="col-span-full text-center py-12 bg-[var(--bg-card)] rounded-[40px] border border-dashed border-[var(--border-color)]">
            <User className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4 opacity-20" />
            <p className="text-[var(--text-muted)] font-bold">هیچ کڕیارێک نەدۆزرایەوە.</p>
          </div>
        )}
      </div>
    </div>
  );
};
