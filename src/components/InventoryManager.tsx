import React, { useState, useMemo } from 'react';
import { InventoryItem } from '../types';
import { Package, Plus, Search, Trash2, Edit2, AlertTriangle, TrendingUp, TrendingDown, PackagePlus, PackageMinus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface InventoryManagerProps {
  items: InventoryItem[];
  onSave: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({ items, onSave, onDelete }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    name: '',
    category: 'گشتی',
    quantity: 0,
    minQuantity: 5,
    unit: 'دانە',
    purchasePrice: 0,
    salePrice: 0
  });

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);

  const stats = useMemo(() => {
    const totalItems = items.length;
    const lowStock = items.filter(i => i.quantity <= i.minQuantity).length;
    const totalValue = items.reduce((acc, i) => acc + (i.quantity * i.purchasePrice), 0);
    const potentialProfit = items.reduce((acc, i) => acc + (i.quantity * (i.salePrice - i.purchasePrice)), 0);
    return { totalItems, lowStock, totalValue, potentialProfit };
  }, [items]);

  const handleSave = () => {
    if (!newItem.name) return;
    const item: InventoryItem = {
      id: editingItem?.id || crypto.randomUUID(),
      name: newItem.name || '',
      category: newItem.category || 'گشتی',
      quantity: Number(newItem.quantity) || 0,
      minQuantity: Number(newItem.minQuantity) || 0,
      unit: newItem.unit || 'دانە',
      purchasePrice: Number(newItem.purchasePrice) || 0,
      salePrice: Number(newItem.salePrice) || 0,
      lastUpdated: new Date().toISOString()
    };
    onSave(item);
    setShowAddModal(false);
    setEditingItem(null);
    setNewItem({
      name: '',
      category: 'گشتی',
      quantity: 0,
      minQuantity: 5,
      unit: 'دانە',
      purchasePrice: 0,
      salePrice: 0
    });
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setNewItem(item);
    setShowAddModal(true);
  };

  const updateQuantity = (id: string, delta: number) => {
    const item = items.find(i => i.id === id);
    if (item) {
      onSave({
        ...item,
        quantity: Math.max(0, item.quantity + delta),
        lastUpdated: new Date().toISOString()
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-main)] shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl">
              <Package className="w-6 h-6" />
            </div>
            <span className="text-[var(--text-muted)] font-bold">کۆی پارچەکان</span>
          </div>
          <div className="text-2xl font-black text-[var(--text-main)]">{stats.totalItems}</div>
        </div>

        <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-main)] shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className={cn(
              "p-3 rounded-2xl",
              stats.lowStock > 0 ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
            )}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <span className="text-[var(--text-muted)] font-bold">کەمی مەخزەن</span>
          </div>
          <div className="text-2xl font-black text-[var(--text-main)]">{stats.lowStock}</div>
        </div>

        <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-main)] shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-[var(--text-muted)] font-bold">کۆی نرخ (کڕین)</span>
          </div>
          <div className="text-2xl font-black text-[var(--text-main)]">{stats.totalValue.toLocaleString()} د.ع</div>
        </div>

        <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-main)] shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-2xl">
              <TrendingDown className="w-6 h-6" />
            </div>
            <span className="text-[var(--text-muted)] font-bold">قازانجی چاوەڕوانکراو</span>
          </div>
          <div className="text-2xl font-black text-[var(--text-main)]">{stats.potentialProfit.toLocaleString()} د.ع</div>
        </div>
      </div>

      {/* Search and Add */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="گەڕان بۆ پارچە یان جۆر..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-12 pl-4 py-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl text-[var(--text-main)] font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-6 h-6" />
          زیادکردنی پارچە
        </button>
      </div>

      {/* Inventory List */}
      <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-main)] overflow-hidden">
        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-[var(--border-main)]">
          {filteredItems.map((item, idx) => (
            <div key={`inv-card-${item.id}-${idx}`} className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-black text-lg text-[var(--text-main)]">{item.name}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-1">{item.category}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEdit(item)} className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => onDelete(item.id)} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              
              <div className="flex items-center justify-between bg-[var(--bg-main)] p-3 rounded-2xl">
                <div className="flex items-center gap-3">
                  <button onClick={() => updateQuantity(item.id, -1)} className="p-2 bg-red-500/10 text-red-600 rounded-lg"><PackageMinus className="w-5 h-5" /></button>
                  <span className={cn("font-black text-lg min-w-[3rem] text-center", item.quantity <= item.minQuantity ? "text-red-600" : "text-[var(--text-main)]")}>
                    {item.quantity} {item.unit}
                  </span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="p-2 bg-green-500/10 text-green-600 rounded-lg"><PackagePlus className="w-5 h-5" /></button>
                </div>
                <div className="text-left">
                  <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase">نرخی فرۆشتن</div>
                  <div className="font-black text-green-600">{item.salePrice.toLocaleString()}</div>
                </div>
              </div>

              <div className="flex justify-between text-xs font-bold text-[var(--text-muted)] pt-2">
                <span>کڕین: {item.purchasePrice.toLocaleString()} د.ع</span>
                <span>{format(new Date(item.lastUpdated), 'yyyy-MM-dd HH:mm')}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-[var(--bg-main)] border-b border-[var(--border-main)]">
                <th className="px-6 py-4 font-black text-[var(--text-main)]">ناوی پارچە</th>
                <th className="px-6 py-4 font-black text-[var(--text-main)]">جۆر</th>
                <th className="px-6 py-4 font-black text-[var(--text-main)]">بڕ</th>
                <th className="px-6 py-4 font-black text-[var(--text-main)]">نرخی کڕین</th>
                <th className="px-6 py-4 font-black text-[var(--text-main)]">نرخی فرۆشتن</th>
                <th className="px-6 py-4 font-black text-[var(--text-main)]">کردارەکان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-main)]">
              {filteredItems.map((item, idx) => (
                <tr key={`${item.id}-${idx}`} className="hover:bg-[var(--bg-main)]/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-[var(--text-main)]">{item.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">دوا نوێکردنەوە: {format(new Date(item.lastUpdated), 'yyyy-MM-dd HH:mm')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-[var(--text-main)] rounded-full text-xs font-bold">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-lg transition-colors"
                      >
                        <PackageMinus className="w-5 h-5" />
                      </button>
                      <span className={cn(
                        "font-black text-lg min-w-[3rem] text-center",
                        item.quantity <= item.minQuantity ? "text-red-600" : "text-[var(--text-main)]"
                      )}>
                        {item.quantity} {item.unit}
                      </span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 rounded-lg transition-colors"
                      >
                        <PackagePlus className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-[var(--text-main)]">{item.purchasePrice.toLocaleString()} د.ع</td>
                  <td className="px-6 py-4 font-bold text-green-600">{item.salePrice.toLocaleString()} د.ع</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-xl transition-colors"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onDelete(item.id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="px-6 py-12 text-center text-[var(--text-muted)] font-bold bg-[var(--bg-main)]/30">
            هیچ پارچەیەک نەدۆزرایەوە
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[var(--bg-card)] w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-[var(--border-main)]"
            >
              <div className="p-8 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-main)]/50">
                <h2 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-3">
                  <Package className="w-8 h-8 text-blue-600" />
                  {editingItem ? 'دەستکاری پارچە' : 'زیادکردنی پارچەی نوێ'}
                </h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-[var(--bg-main)] rounded-full transition-colors">
                  <X className="w-6 h-6 text-[var(--text-muted)]" />
                </button>
              </div>

              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-[var(--text-muted)] mr-2">ناوی پارچە</label>
                    <input
                      type="text"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      className="w-full px-6 py-4 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-2xl text-[var(--text-main)] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="بۆ نموونە: پاتری ٦٠ ئەمپێر"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black text-[var(--text-muted)] mr-2">جۆر / پۆلێن</label>
                    <input
                      type="text"
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      className="w-full px-6 py-4 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-2xl text-[var(--text-main)] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="بۆ نموونە: کارەبایی"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black text-[var(--text-muted)] mr-2">بڕی ئێستا</label>
                    <input
                      type="number"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                      className="w-full px-6 py-4 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-2xl text-[var(--text-main)] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black text-[var(--text-muted)] mr-2">کەمترین بڕ (بۆ ئاگادارکردنەوە)</label>
                    <input
                      type="number"
                      value={newItem.minQuantity}
                      onChange={(e) => setNewItem({ ...newItem, minQuantity: Number(e.target.value) })}
                      className="w-full px-6 py-4 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-2xl text-[var(--text-main)] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black text-[var(--text-muted)] mr-2">یەکە</label>
                    <select
                      value={newItem.unit}
                      onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                      className="w-full px-6 py-4 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-2xl text-[var(--text-main)] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="دانە">دانە</option>
                      <option value="کیلۆ">کیلۆ</option>
                      <option value="لیتر">لیتر</option>
                      <option value="مەتر">مەتر</option>
                      <option value="سێت">سێت</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black text-[var(--text-muted)] mr-2">نرخی کڕین (د.ع)</label>
                    <input
                      type="number"
                      value={newItem.purchasePrice}
                      onChange={(e) => setNewItem({ ...newItem, purchasePrice: Number(e.target.value) })}
                      className="w-full px-6 py-4 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-2xl text-[var(--text-main)] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black text-[var(--text-muted)] mr-2">نرخی فرۆشتن (د.ع)</label>
                    <input
                      type="number"
                      value={newItem.salePrice}
                      onChange={(e) => setNewItem({ ...newItem, salePrice: Number(e.target.value) })}
                      className="w-full px-6 py-4 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-2xl text-[var(--text-main)] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 bg-[var(--bg-main)]/50 border-t border-[var(--border-main)] flex gap-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 bg-[var(--bg-card)] text-[var(--text-main)] rounded-2xl font-black border border-[var(--border-main)] hover:bg-[var(--bg-main)] transition-all"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                >
                  {editingItem ? 'نوێکردنەوە' : 'پاشەکەوتکردن'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const X = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
