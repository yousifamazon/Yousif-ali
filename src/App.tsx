/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect, useMemo, Component } from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Briefcase, 
  User, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Calendar,
  Clock,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Zap,
  Milk,
  Truck,
  ShoppingCart,
  Fuel,
  Edit2, 
  Moon, 
  Sun, 
  Bell,
  UserMinus,
  PiggyBank,
  Camera,
  Image as ImageIcon,
  Share2,
  Sparkles,
  Loader2,
  Menu,
  X,
  ArrowDownToLine
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarcodeScanner } from './components/BarcodeScanner';
import { ReceiptScanner } from './components/ReceiptScanner';
import { format, isToday, isTomorrow, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, subDays, isPast } from 'date-fns';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
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
  Cell
} from 'recharts';
import { Task, Transaction, AppData, WishlistItem, Debt, SavingsGoal, Product } from './types';
import { 
  getStoredData, 
  saveToStorage, 
  clearStorage,
  syncTaskToFirebase,
  deleteTaskFromFirebase,
  syncTransactionToFirebase,
  deleteTransactionFromFirebase,
  syncSettingsToFirebase,
  resetFirebaseData,
  syncWishlistToFirebase,
  deleteWishlistFromFirebase,
  syncDebtToFirebase,
  deleteDebtFromFirebase,
  syncSavingsGoalToFirebase,
  deleteSavingsGoalFromFirebase,
  syncProductToFirebase
} from './lib/storage';
import { cn } from './lib/utils';
import { 
  auth, 
  loginWithGoogle, 
  logout, 
  db, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, onSnapshot, orderBy, doc, getDocs, getDoc } from 'firebase/firestore';

// Polyfill for crypto.randomUUID if not available
if (typeof crypto === 'undefined') {
  // @ts-ignore
  window.crypto = {
    randomUUID: function() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      }) as any;
    }
  };
} else if (!crypto.randomUUID) {
  // @ts-ignore
  crypto.randomUUID = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }) as any;
  };
}

// --- Components ---

export class ErrorBoundary extends React.Component<any, any> {
  public state: any;
  public props: any;
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-[var(--bg-card)] rounded-3xl p-8 shadow-xl border border-red-100 dark:border-red-900/30">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-[var(--text-main)] mb-4">هەڵەیەک ڕوویدا</h1>
            <p className="text-[var(--text-muted)] font-bold mb-6">ببورە، بەرنامەکە تووشی کێشەیەک بوو لە کاتی کارکردن.</p>
            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl text-left mb-6 overflow-auto max-h-40">
              <code className="text-xs text-red-700 dark:text-red-400 font-mono whitespace-pre-wrap">
                {this.state.error?.message}
              </code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-colors"
            >
              دووبارە بارکردنەوە
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const parseFirestoreError = (err: any): string => {
  let errorMessage = 'کێشەیەک لە پاشەکەوتکردن لە سێرڤەر ڕوویدا';
  try {
    const errInfo = JSON.parse(err.message);
    if (errInfo.error.includes('permission-denied')) {
      errorMessage = 'دەسەڵاتی پاشەکەوتکردنت نییە. تکایە دڵنیابەرەوە کە داخڵ بوویت.';
    } else if (errInfo.error.includes('auth/unauthorized-domain')) {
      errorMessage = 'ئەم سایتە ڕێگەی پێنەدراوە بۆ داخڵبوون. تکایە لە ڕێگەی سایتی سەرەکییەوە هەوڵ بدەرەوە.';
    } else if (errInfo.error.includes('quota-exceeded')) {
      errorMessage = 'کۆتای پاشەکەوتکردن تەواو بووە. تکایە سبەی هەوڵ بدەرەوە.';
    }
  } catch (e) {}

  if (errorMessage === 'کێشەیەک لە پاشەکەوتکردن لە سێرڤەر ڕوویدا' && err.message) {
    errorMessage += '\n\nوردەکاری: ' + err.message.substring(0, 150);
  }
  return errorMessage;
};

const Card = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void; key?: string | number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={onClick ? { scale: 1.01 } : undefined}
    onClick={onClick}
    className={cn(
      "bg-[var(--bg-card)] rounded-3xl p-6 shadow-sm border border-[var(--border-color)] relative overflow-hidden",
      onClick && "cursor-pointer active:scale-95 transition-all",
      className
    )}
  >
    {children}
  </motion.div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className,
  disabled,
  size = 'md'
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100 dark:shadow-none",
    secondary: "bg-[var(--bg-card)] text-[var(--text-main)] hover:bg-[var(--bg-main)] border border-[var(--border-color)]",
    danger: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30",
    ghost: "bg-transparent text-[var(--text-muted)] hover:bg-[var(--bg-main)]",
    accent: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base"
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  );
};

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) => {
  const variants = {
    default: "bg-[var(--bg-main)] text-[var(--text-muted)]",
    success: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    warning: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
    danger: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
    info: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
  };
  return <span className={cn("px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide", variants[variant])}>{children}</span>;
};

const HistoryInput = ({ 
  value, 
  onChange, 
  placeholder, 
  className, 
  historyKey, 
  history = [], 
  onSaveHistory 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  placeholder?: string; 
  className?: string;
  historyKey: string;
  history?: string[];
  onSaveHistory: (key: string, val: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBlur = () => {
    if (value.trim()) {
      onSaveHistory(historyKey, value.trim());
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <input 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleBlur();
              setIsOpen(false);
            }
          }}
          className={cn(
            "w-full px-6 py-4 bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold pl-12",
            className,
            "pl-12" // Ensure padding is applied even if className has px-*
          )} 
          placeholder={placeholder} 
        />
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--bg-main)] rounded-full transition-colors text-[var(--text-muted)]"
        >
          <ChevronDown className={cn("w-5 h-5 transition-transform", isOpen && "rotate-180")} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && history.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-[110] left-0 right-0 mt-2 bg-[var(--bg-card)] rounded-2xl shadow-xl border border-[var(--border-color)] overflow-hidden max-h-48 overflow-y-auto"
          >
            {history.map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  onChange(item);
                  setIsOpen(false);
                }}
                className="w-full text-right px-6 py-3 text-sm font-bold text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors border-b border-[var(--border-color)] last:border-none"
              >
                {item}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FormattedNumberInput = ({ 
  value, 
  onChange, 
  placeholder, 
  className,
  dir,
  disabled
}: { 
  value: number | string; 
  onChange: (val: number) => void; 
  placeholder?: string; 
  className?: string;
  dir?: string;
  disabled?: boolean;
}) => {
  const [displayValue, setDisplayValue] = useState(value ? Number(value).toLocaleString() : '');

  useEffect(() => {
    if (value === '' || value === 0) {
      setDisplayValue('');
    } else {
      const currentNum = parseInt(displayValue.replace(/,/g, ''), 10);
      if (currentNum !== Number(value)) {
        setDisplayValue(Number(value).toLocaleString());
      }
    }
  }, [value]);

  const toEnglishDigits = (str: string) => {
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return str.replace(/[٠-٩]/g, w => arabicNumbers.indexOf(w).toString());
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const englishStr = toEnglishDigits(e.target.value);
    const rawValue = englishStr.replace(/[^\d]/g, '');
    if (rawValue === '') {
      setDisplayValue('');
      onChange(0);
    } else {
      const numValue = parseInt(rawValue, 10);
      setDisplayValue(numValue.toLocaleString());
      onChange(numValue);
    }
  };

  return (
    <input 
      type="text" 
      inputMode="numeric"
      value={displayValue} 
      onChange={handleChange} 
      className={className} 
      placeholder={placeholder} 
      dir={dir}
      disabled={disabled}
    />
  );
};

// --- Main App ---

export default function App() {
  const [data, setData] = useState<AppData>(getStoredData());
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'personal' | 'wishlist' | 'debts' | 'savings'>('dashboard');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawGoalId, setWithdrawGoalId] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState<{ name: string, price: number, quantity: number }>({ name: '', price: 0, quantity: 1 });
  const [quickAddAmounts, setQuickAddAmounts] = useState<Record<string, number>>({});
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editingWishlistId, setEditingWishlistId] = useState<string | null>(null);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [editingSavingsId, setEditingSavingsId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState<{ index: number; value: string } | null>(null);
  const [financeFilter, setFinanceFilter] = useState<'all' | 'market' | 'fuel' | 'income' | 'driver'>('all');
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const resizeImage = (base64Str: string, maxWidth = 1024, maxHeight = 1024): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Str;
      img.onerror = (e) => {
        console.error("Image load error:", e);
        reject(new Error("شکستی هێنا لە بارکردنی وێنەکە"));
      };
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("نەتوانرا کانڤاس دروست بکرێت"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } catch (err) {
          console.error("Resize error:", err);
          reject(err);
        }
      };
    });
  };

  const handleScanReceipt = async () => {
    if (!newTransaction.receiptImage) return;
    
    setIsScanning(true);
    console.log("handleScanReceipt: Starting scan...");
    
    let isStillScanning = true;
    const timeoutId = setTimeout(() => {
      if (isStillScanning) {
        isStillScanning = false;
        setIsScanning(false);
        console.warn("handleScanReceipt: Timeout reached.");
        alert('کاتەکەی تەواو بوو (٤٥ چرکە تێپەڕی)، تکایە وێنەیەکی ڕوونتر بگرە و دووبارە هەوڵ بدەرەوە');
      }
    }, 45000);

    try {
      console.log("handleScanReceipt: Resizing image...");
      const resizedImage = await resizeImage(newTransaction.receiptImage);
      console.log(`handleScanReceipt: Image resized. Size: ${Math.round(resizedImage.length / 1024)} KB`);

      console.log("handleScanReceipt: Calling scanReceipt service...");
      // const result = await scanReceipt(resizedImage);
      const result: any = null;
      
      if (!isStillScanning) return; // Already timed out
      
      isStillScanning = false;
      clearTimeout(timeoutId);
      console.log("handleScanReceipt: scanReceipt result:", result);
      
      if (result) {
        setNewTransaction(p => ({
          ...p,
          customerName: result.customerName || p.customerName,
          invoiceNumber: result.invoiceNumber || p.invoiceNumber,
          driverName: result.driverName || p.driverName,
          amount: result.amount || p.amount,
          discount: result.discount || p.discount,
          paidAmount: result.paidAmount || p.paidAmount,
          remainingAmount: result.remainingAmount || p.remainingAmount,
          debtAmount: result.debtAmount || p.debtAmount,
          receiptItems: result.items ? result.items.map(item => ({ 
            name: item.name, 
            price: item.price,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          })) : p.receiptItems
        }));
        alert('زانیارییەکان بە سەرکەوتوویی پڕکرانەوە');
      } else {
        alert('نەتوانرا زانیارییەکان بخوێنرێتەوە، تکایە دڵنیابە کە وێنەکە ڕوونە و نووسینەکان دیارن');
      }
    } catch (error) {
      if (!isStillScanning) return;
      isStillScanning = false;
      clearTimeout(timeoutId);
      console.error("Scanning failed:", error);
      alert('هەڵەیەک ڕوویدا لە کاتی پەیوەندی بە ژیری دەستکرد');
    } finally {
      setIsScanning(false);
    }
  };

  const handleShareTransaction = async (t: Transaction) => {
    const isDelivery = t.description === 'سایەقی' || t.isDelivery;
    const text = `
${isDelivery ? '🚚 وەسڵی گەیاندن (سایەقی)' : '💰 تۆماری دارایی'}
---------------------------
📝 بابەت: ${t.description}
${t.customerName ? `👤 کڕیار: ${t.customerName}` : ''}
${t.invoiceNumber ? `🔢 ژمارەی قایمە: ${t.invoiceNumber}` : ''}
${t.driverName ? `🚛 سایەق: ${t.driverName}` : ''}
${t.shopName ? `🏪 شوێن: ${t.shopName}` : ''}
---------------------------
${t.receiptItems && t.receiptItems.length > 0 ? `📦 بابەتەکان:
${t.receiptItems.map(item => `- ${item.name}: ${item.quantity || 1} x ${(item.unitPrice || item.price).toLocaleString()} = ${item.price.toLocaleString()} دینار`).join('\n')}
---------------------------` : ''}
💵 کۆی گشتی: ${t.amount.toLocaleString()} دینار
${t.discount ? `📉 داشکاندن: ${t.discount.toLocaleString()} دینار` : ''}
${t.paidAmount ? `✅ وەرگیراو: ${t.paidAmount.toLocaleString()} دینار` : ''}
${t.remainingAmount ? `⏳ ماوە: ${t.remainingAmount.toLocaleString()} دینار` : ''}
${t.debtAmount ? `🚩 قەرز: ${t.debtAmount.toLocaleString()} دینار` : ''}
📅 بەروار: ${format(parseISO(t.date), 'yyyy/MM/dd')}
---------------------------
نێردراوە لە ڕێگەی: رۆژانەی یوسف
    `.trim();

    if (navigator.share) {
      try {
        const shareData: ShareData = {
          title: 'تۆماری دارایی',
          text: text,
        };
        
        // If there's an image, try to share it as a file if supported
        if (t.receiptImage && t.receiptImage.startsWith('data:image')) {
          try {
            const blob = await (await fetch(t.receiptImage)).blob();
            const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              shareData.files = [file];
            }
          } catch (e) {
            console.error('Error preparing image for share:', e);
          }
        }
        
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(text);
      alert('زانیارییەکان کۆپی کران');
    }
  };

  // Form States
  const initialTaskState: Partial<Task> = { 
    title: '', 
    description: '', 
    details: [{ subject: '', work: '' }],
    date: format(new Date(), 'yyyy-MM-dd'), 
    category: 'personal',
    priority: 'medium',
    workTypes: [],
    dueDate: format(new Date(), 'yyyy-MM-dd')
  };

  const initialTransactionState: Partial<Transaction> = { 
    amount: 0, 
    description: '', 
    date: format(new Date(), 'yyyy-MM-dd'), 
    category: 'personal',
    type: 'expense',
    paymentMethod: 'cash',
    milkQuantity: 0,
    fuelLiters: 0,
    fuelPricePerLiter: 0,
    fuelType: 'بەنزین',
    workLocation: '',
    shopName: '',
    itemsBought: '',
    receiptItems: [{ name: '', price: 0 }],
    driverName: '',
    customerName: '',
    invoiceNumber: '',
    receiptImage: '',
    isDelivery: false,
    savingsEffect: 'none'
  };

  const handleBarcodeScan = (barcode: string) => {
    setShowBarcodeScanner(false);
    
    // Look up product in local state
    const existingProduct = data.products?.find(p => p.barcode === barcode);
    
    if (existingProduct) {
      // Add to receipt items
      setNewTransaction(p => ({
        ...p,
        receiptItems: [...(p.receiptItems || []), { name: existingProduct.name, price: existingProduct.price, quantity: 1, unitPrice: existingProduct.price }]
      }));
    } else {
      // Prompt for new product
      setScannedBarcode(barcode);
    }
  };

  const handleSaveNewProduct = async () => {
    if (!scannedBarcode || !newProduct.name || newProduct.price <= 0) return;
    
    const productData = {
      id: crypto.randomUUID(),
      barcode: scannedBarcode,
      name: newProduct.name,
      price: newProduct.price,
      createdAt: new Date().toISOString(),
      userId: user?.uid
    };
    
    await syncProductToFirebase(productData);
    
    // Add to receipt items
    setNewTransaction(p => ({
      ...p,
      receiptItems: [...(p.receiptItems || []), { 
        name: newProduct.name, 
        price: newProduct.price * (newProduct.quantity || 1), 
        quantity: newProduct.quantity || 1, 
        unitPrice: newProduct.price 
      }]
    }));
    
    setScannedBarcode(null);
    setNewProduct({ name: '', price: 0, quantity: 1 });
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewTransaction(p => ({ ...p, receiptImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const initialWishlistState: Partial<WishlistItem> = {
    title: '',
    notes: '',
    estimatedPrice: 0,
    completed: false,
    type: 'general'
  };

  const [activeWishlistTab, setActiveWishlistTab] = useState<'general' | 'private'>('general');
  const [debts, setDebts] = useState<Debt[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [newTask, setNewTask] = useState<Partial<Task>>(initialTaskState);
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>(() => {
    const saved = sessionStorage.getItem('pending_transaction');
    return saved ? JSON.parse(saved) : initialTransactionState;
  });
  const [newWishlistItem, setNewWishlistItem] = useState<Partial<WishlistItem>>(initialWishlistState);
  const [newDebt, setNewDebt] = useState<Partial<Debt>>({ type: 'owed', amount: 0 });
  const [newSavings, setNewSavings] = useState<Partial<SavingsGoal>>({ targetAmount: 0, currentAmount: 0 });

  // Persist pending transaction and modal state
  useEffect(() => {
    sessionStorage.setItem('pending_transaction', JSON.stringify(newTransaction));
  }, [newTransaction]);

  useEffect(() => {
    sessionStorage.setItem('show_transaction_modal', showTransactionModal.toString());
  }, [showTransactionModal]);

  // Restore modal state on mount
  useEffect(() => {
    const shouldShow = sessionStorage.getItem('show_transaction_modal') === 'true';
    if (shouldShow) setShowTransactionModal(true);
  }, []);
  const [tempCustomWorkType, setTempCustomWorkType] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      
      if (currentUser) {
        // Check if we should migrate local data
        const tasksRef = collection(db, `users/${currentUser.uid}/tasks`);
        const transRef = collection(db, `users/${currentUser.uid}/transactions`);
        const wishlistRef = collection(db, `users/${currentUser.uid}/wishlist`);
        const settingsRef = doc(db, `users/${currentUser.uid}/settings/main`);
        
        const [tasksSnap, transSnap, wishlistSnap, settingsSnap] = await Promise.all([
          getDocs(tasksRef),
          getDocs(transRef),
          getDocs(wishlistRef),
          getDoc(settingsRef)
        ]);

        // Migrate tasks if cloud is empty but local is not
        if (tasksSnap.empty && data.tasks.length > 0) {
          console.log("Migrating local tasks to Firebase...");
          setIsMigrating(true);
          for (const task of data.tasks) {
            await syncTaskToFirebase(task);
          }
          setIsMigrating(false);
        }

        // Migrate transactions if cloud is empty but local is not
        if (transSnap.empty && data.transactions.length > 0) {
          console.log("Migrating local transactions to Firebase...");
          setIsMigrating(true);
          for (const trans of data.transactions) {
            await syncTransactionToFirebase(trans);
          }
          setIsMigrating(false);
        }

        // Migrate wishlist if cloud is empty but local is not
        if (wishlistSnap.empty && (data.wishlist || []).length > 0) {
          console.log("Migrating local wishlist to Firebase...");
          setIsMigrating(true);
          for (const item of (data.wishlist || [])) {
            await syncWishlistToFirebase(item);
          }
          setIsMigrating(false);
        }

        // Migrate settings if cloud is empty
        if (!settingsSnap.exists() && (data.descriptions.length > 0 || Object.keys(data.history || {}).length > 0)) {
          console.log("Migrating local settings to Firebase...");
          await syncSettingsToFirebase(data.descriptions, data.history || {});
        }
      }
    });
    return () => unsubscribe();
  }, [data.tasks.length, data.transactions.length]);

  // Sync from Firestore
  useEffect(() => {
    if (!user) return;

    const tasksQuery = query(collection(db, `users/${user.uid}/tasks`), orderBy('date', 'desc'));
    const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
      if (isMigrating && snapshot.empty) return;
      const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setData(prev => ({ ...prev, tasks }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/tasks`));

    const transQuery = query(collection(db, `users/${user.uid}/transactions`), orderBy('date', 'desc'));
    const unsubTrans = onSnapshot(transQuery, (snapshot) => {
      if (isMigrating && snapshot.empty) return;
      const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setData(prev => ({ ...prev, transactions }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/transactions`));

    const unsubSettings = onSnapshot(doc(db, `users/${user.uid}/settings/main`), (snapshot) => {
      if (snapshot.exists()) {
        const settings = snapshot.data();
        setData(prev => ({ 
          ...prev, 
          descriptions: settings.descriptions || prev.descriptions,
          history: settings.history || prev.history
        }));
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}/settings/main`));

    const wishlistQuery = query(collection(db, `users/${user.uid}/wishlist`), orderBy('createdAt', 'desc'));
    const unsubWishlist = onSnapshot(wishlistQuery, (snapshot) => {
      if (isMigrating && snapshot.empty) return;
      const wishlist = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setData(prev => ({ ...prev, wishlist }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/wishlist`));

    const debtsQuery = query(collection(db, `users/${user.uid}/debts`), orderBy('date', 'desc'));
    const unsubDebts = onSnapshot(debtsQuery, (snapshot) => {
      if (isMigrating && snapshot.empty) return;
      const debts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Debt));
      setData(prev => ({ ...prev, debts }));
      setDebts(debts);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/debts`));

    const savingsQuery = query(collection(db, `users/${user.uid}/savingsGoals`), orderBy('createdAt', 'desc'));
    const unsubSavings = onSnapshot(savingsQuery, (snapshot) => {
      if (isMigrating && snapshot.empty) return;
      const savingsGoals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavingsGoal));
      setData(prev => ({ ...prev, savingsGoals }));
      setSavingsGoals(savingsGoals);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/savingsGoals`));

    const productsQuery = query(collection(db, `users/${user.uid}/products`), orderBy('createdAt', 'desc'));
    const unsubProducts = onSnapshot(productsQuery, (snapshot) => {
      if (isMigrating && snapshot.empty) return;
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setData(prev => ({ ...prev, products }));
      setProducts(products);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/products`));

    return () => {
      unsubTasks();
      unsubTrans();
      unsubSettings();
      unsubWishlist();
      unsubDebts();
      unsubSavings();
      unsubProducts();
    };
  }, [user]);

  const handleSaveHistory = (key: string, value: string) => {
    if (!value.trim()) return;
    setData(prev => {
      const history = prev.history || {};
      const fieldHistory = history[key] || [];
      if (fieldHistory.includes(value)) return prev;
      const newHistory = {
        ...history,
        [key]: [value, ...fieldHistory].slice(0, 20)
      };
      
      if (user) {
        syncSettingsToFirebase(prev.descriptions, newHistory);
      }

      return {
        ...prev,
        history: newHistory
      };
    });
  };

  useEffect(() => {
    saveToStorage(data);
  }, [data]);

  // --- Calculations ---

  const stats = useMemo(() => {
    const personal = data.transactions.filter(t => t.category === 'personal');

    const personalExpense = personal.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const personalIncome = personal.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const personalSavings = personal.filter(t => t.type === 'savings').reduce((acc, t) => acc + t.amount, 0);
    
    let balance = personalIncome - personalExpense;
    personal.filter(t => t.type === 'savings').forEach(t => {
      if (t.savingsEffect === 'add') {
        balance += t.amount;
      } else if (t.savingsEffect === 'subtract') {
        balance -= t.amount;
      }
    });
    
    const pendingTasks = data.tasks.filter(t => !t.completed).length;

    // Chart Data (Last 7 days)
    const last7Days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
    const chartData = last7Days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayPersonal = personal.filter(t => t.date === dateStr && t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      const dayIncome = personal.filter(t => t.date === dateStr && t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const daySavings = personal.filter(t => t.date === dateStr && t.type === 'savings').reduce((acc, t) => acc + t.amount, 0);
      return {
        name: format(day, 'EEE'),
        expense: dayPersonal,
        income: dayIncome,
        savings: daySavings
      };
    });

    return { personalExpense, personalIncome, personalSavings, balance, pendingTasks, chartData };
  }, [data]);

  // --- Handlers ---

  const addTask = async () => {
    if (!newTask.title) return;
    
    const taskData = {
      title: newTask.title || '',
      description: newTask.description || '',
      details: newTask.details || [],
      date: newTask.date || format(new Date(), 'yyyy-MM-dd'),
      category: newTask.category || 'personal',
      priority: newTask.priority || 'medium',
      workTypes: newTask.workTypes || []
    };

    if (editingTaskId) {
      const updatedTask = {
        ...data.tasks.find(t => t.id === editingTaskId)!,
        ...taskData
      };
      
      // Optimistic update
      setData(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === editingTaskId ? updatedTask : t)
      }));

      if (user) {
        try {
          await syncTaskToFirebase(updatedTask);
        } catch (err: any) {
          console.error("Failed to sync task (edit):", err);
          alert(parseFirestoreError(err));
        }
      }
    } else {
      const task: Task = {
        id: crypto.randomUUID(),
        ...taskData,
        completed: false
      };
      
      // Optimistic update
      setData(prev => ({ ...prev, tasks: [task, ...prev.tasks] }));

      if (user) {
        try {
          await syncTaskToFirebase(task);
        } catch (err: any) {
          console.error("Failed to sync task (new):", err);
          alert(parseFirestoreError(err));
        }
      }
    }
    
    setShowTaskModal(false);
    setEditingTaskId(null);
    setNewTask(initialTaskState);
  };

  const addTransaction = async () => {
    let finalAmount = Number(newTransaction.amount) || 0;
    
    // Auto-calculate fuel total
    if (newTransaction.description === 'بەنزین' && newTransaction.fuelLiters && newTransaction.fuelPricePerLiter) {
      finalAmount = newTransaction.fuelLiters * newTransaction.fuelPricePerLiter;
    }

    // Auto-calculate total from receipt items if they exist
    const isMilk = newTransaction.description === 'هێنانەوەی شیر';
    const isFuel = newTransaction.description === 'بەنزین';
    
    if (!isMilk && !isFuel && newTransaction.receiptItems?.length) {
      const total = newTransaction.receiptItems.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
      if (total > 0) finalAmount = total;
    }

    if (!finalAmount && !newTransaction.description && !newTransaction.receiptImage) return;

    const transactionData: any = {
      amount: finalAmount,
      description: newTransaction.description || 'بێ وەسف',
      date: newTransaction.date || format(new Date(), 'yyyy-MM-dd'),
      type: newTransaction.type || 'expense',
      category: newTransaction.category || 'personal',
      subCategory: newTransaction.subCategory || '',
      paymentMethod: newTransaction.paymentMethod || 'cash',
      receiptItems: newTransaction.receiptItems,
      receiptImage: newTransaction.receiptImage,
      isDelivery: newTransaction.isDelivery,
      savingsEffect: newTransaction.savingsEffect || 'none'
    };

    // Only add work-specific fields if it's a work transaction
    if (newTransaction.category === 'work') {
      transactionData.milkQuantity = newTransaction.milkQuantity;
      transactionData.maintenanceType = newTransaction.maintenanceType;
      transactionData.workLocation = newTransaction.workLocation;
      transactionData.driverName = newTransaction.driverName;
      transactionData.customerName = newTransaction.customerName;
      transactionData.invoiceNumber = newTransaction.invoiceNumber;
    }

    // Add fuel fields if relevant
    if (newTransaction.description === 'بەنزین' || newTransaction.fuelLiters) {
      transactionData.fuelLiters = newTransaction.fuelLiters;
      transactionData.fuelPricePerLiter = newTransaction.fuelPricePerLiter;
      transactionData.fuelType = newTransaction.fuelType;
    }

    // Add shop fields if relevant
    if (newTransaction.shopName) {
      transactionData.shopName = newTransaction.shopName;
      transactionData.itemsBought = newTransaction.itemsBought;
    }

    if (editingTransactionId) {
      const updatedTransaction = { 
        ...data.transactions.find(t => t.id === editingTransactionId)!, 
        ...transactionData 
      };
      
      // Optimistic update
      setData(prev => ({
        ...prev,
        transactions: prev.transactions.map(t => t.id === editingTransactionId ? updatedTransaction : t)
      }));

      if (user) {
        try {
          await syncTransactionToFirebase(updatedTransaction);
        } catch (err: any) {
          console.error("Failed to sync transaction (edit):", err);
          alert(parseFirestoreError(err));
        }
      }
    } else {
      const transaction: Transaction = {
        id: crypto.randomUUID(),
        ...transactionData
      };
      
      // Optimistic update
      setData(prev => ({ ...prev, transactions: [transaction, ...prev.transactions] }));

      if (user) {
        try {
          await syncTransactionToFirebase(transaction);
        } catch (err: any) {
          console.error("Failed to sync transaction (new):", err);
          alert(parseFirestoreError(err));
        }
      }
    }

    setShowTransactionModal(false);
    setEditingTransactionId(null);
    setNewTransaction(initialTransactionState);
    sessionStorage.removeItem('pending_transaction');
    sessionStorage.removeItem('show_transaction_modal');
  };

  const exportToExcel = () => {
    const tasksData = data.tasks.map(t => ({
      'ناونیشان': t.title,
      'بابەت و کارەکان': (t.details || []).map(d => `${d.subject}: ${d.work}`).join(' | '),
      'بەروار': t.date,
      'جۆری ئیش': (t.workTypes || []).join(', '),
      'گرنگی': t.priority === 'high' ? 'گرنگ' : t.priority === 'medium' ? 'ناوەند' : 'ئاسایی',
      'تەواوبووە': t.completed ? 'بەڵێ' : 'نەخێر'
    }));

    const transactionsData = data.transactions.map(t => ({
      'وەسف': t.description,
      'بڕ': t.amount,
      'بەروار': t.date,
      'جۆر': t.type === 'income' ? 'داهات' : 'خەرجی',
      'بەش': t.category === 'personal' ? 'تایبەت' : 'گشتی',
      'شێوازی پارەدان': t.paymentMethod === 'own_money' ? 'پارەی خۆم' : 'کاش'
    }));

    const wb = XLSX.utils.book_new();
    const wsTasks = XLSX.utils.json_to_sheet(tasksData);
    const wsTrans = XLSX.utils.json_to_sheet(transactionsData);

    XLSX.utils.book_append_sheet(wb, wsTasks, "ئیشەکان");
    XLSX.utils.book_append_sheet(wb, wsTrans, "دارایی");

    XLSX.writeFile(wb, `yousif_data_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add some basic info
    doc.text("Rojanay Yousif - Data Export", 10, 10);
    doc.text(`Date: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 10, 20);

    // Tasks Section
    doc.text("Tasks (ئیشەکان)", 10, 30);
    const taskRows = data.tasks.map(t => [
      t.title,
      (t.details || []).map(d => `${d.subject}: ${d.work}`).join('\n'),
      t.date,
      (t.workTypes || []).join(', '),
      t.completed ? 'Yes' : 'No'
    ]);

    (doc as any).autoTable({
      head: [['Title', 'Details', 'Date', 'Work Types', 'Done']],
      body: taskRows,
      startY: 35,
      styles: { font: 'helvetica', fontSize: 8 },
      headStyles: { fillStyle: 'f' }
    });

    // Transactions Section
    const finalY = (doc as any).lastAutoTable.finalY || 40;
    doc.text("Financials (دارایی)", 10, finalY + 15);
    const transRows = data.transactions.map(t => [
      t.description,
      t.amount.toLocaleString(),
      t.date,
      t.type === 'income' ? 'Income' : 'Expense',
      t.category === 'work' ? 'Work' : 'Personal'
    ]);

    (doc as any).autoTable({
      head: [['Description', 'Amount', 'Date', 'Type', 'Category']],
      body: transRows,
      startY: finalY + 20,
      styles: { font: 'helvetica', fontSize: 8 }
    });

    doc.save(`yousif_data_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  const resetAllData = async () => {
    if (user) {
      try {
        await resetFirebaseData();
      } catch (err: any) {
        console.error("Failed to reset Firebase data:", err);
        alert(parseFirestoreError(err));
        return; // Don't clear local if server fails? Or maybe clear anyway?
      }
    }
    clearStorage();
    setData(getStoredData());
    setShowResetModal(false);
  };

  const toggleTask = async (id: string) => {
    const task = data.tasks.find(t => t.id === id);
    if (!task) return;
    
    const updatedTask = { ...task, completed: !task.completed };
    
    // Optimistic update
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? updatedTask : t)
    }));

    if (user) {
      try {
        await syncTaskToFirebase(updatedTask);
      } catch (err) {
        console.error("Failed to toggle task:", err);
        // Rollback happens automatically via onSnapshot if sync fails
      }
    }
  };

  const addDebt = async () => {
    if (!newDebt.personName || !newDebt.amount) return;
    const debtData = {
      id: editingDebtId || crypto.randomUUID(),
      personName: newDebt.personName,
      amount: newDebt.amount,
      type: newDebt.type || 'owed',
      date: newDebt.date || new Date().toISOString().split('T')[0],
      notes: newDebt.notes || '',
      completed: newDebt.completed || false,
      userId: user?.uid
    };
    await syncDebtToFirebase(debtData);
    setShowDebtModal(false);
    setNewDebt({ type: 'owed', amount: 0 });
  };

  const addSavingsGoal = async () => {
    if (!newSavings.title || !newSavings.targetAmount) return;
    const goalData = {
      id: editingSavingsId || crypto.randomUUID(),
      title: newSavings.title,
      targetAmount: newSavings.targetAmount,
      currentAmount: newSavings.currentAmount || 0,
      createdAt: newSavings.createdAt || new Date().toISOString(),
      userId: user?.uid
    };
    await syncSavingsGoalToFirebase(goalData);
    setShowSavingsModal(false);
    setNewSavings({ targetAmount: 0, currentAmount: 0 });
  };

  const handleWithdrawSavings = async () => {
    if (!withdrawGoalId || !withdrawAmount || withdrawAmount <= 0) return;
    
    const goal = data.savingsGoals?.find(g => g.id === withdrawGoalId);
    if (!goal) return;

    if (withdrawAmount > goal.currentAmount) {
      alert('بڕی دیاریکراو زیاترە لە بڕی پاشەکەوتکراو');
      return;
    }

    const updatedGoal = {
      ...goal,
      currentAmount: goal.currentAmount - withdrawAmount
    };
    await syncSavingsGoalToFirebase(updatedGoal);

    const transactionData = {
      id: crypto.randomUUID(),
      type: 'savings' as const,
      amount: withdrawAmount,
      category: 'personal' as const,
      description: `ڕاکێشانی پارە لە پاشەکەوتی: ${goal.title}`,
      date: new Date().toISOString().split('T')[0],
      savingsEffect: 'add' as const,
      userId: user?.uid,
      createdAt: new Date().toISOString()
    };
    await syncTransactionToFirebase(transactionData);

    setShowWithdrawModal(false);
    setWithdrawGoalId(null);
    setWithdrawAmount(0);
  };

  const handleQuickAddSavings = async (goal: SavingsGoal) => {
    const amountToAdd = quickAddAmounts[goal.id];
    if (!amountToAdd || amountToAdd <= 0) return;

    const updatedGoal = {
      ...goal,
      currentAmount: goal.currentAmount + amountToAdd
    };
    await syncSavingsGoalToFirebase(updatedGoal);

    const transactionData = {
      id: crypto.randomUUID(),
      type: 'savings' as const,
      amount: amountToAdd,
      category: 'personal' as const,
      description: `زیادکردن بۆ پاشەکەوتی: ${goal.title}`,
      date: new Date().toISOString().split('T')[0],
      savingsEffect: 'subtract' as const,
      userId: user?.uid,
      createdAt: new Date().toISOString()
    };
    await syncTransactionToFirebase(transactionData);

    setQuickAddAmounts(p => {
      const next = { ...p };
      delete next[goal.id];
      return next;
    });
  };

  const addWishlistItem = async () => {

    const itemData = {
      title: newWishlistItem.title,
      notes: newWishlistItem.notes || '',
      estimatedPrice: Number(newWishlistItem.estimatedPrice) || 0,
      completed: newWishlistItem.completed || false,
      type: newWishlistItem.type || activeWishlistTab
    };

    if (editingWishlistId) {
      const updatedItem = {
        ...(data.wishlist?.find(w => w.id === editingWishlistId) || {} as any),
        ...itemData
      };
      
      setData(prev => ({
        ...prev,
        wishlist: (prev.wishlist || []).map(w => w.id === editingWishlistId ? updatedItem : w)
      }));

      if (user) {
        try {
          await syncWishlistToFirebase(updatedItem);
        } catch (err: any) {
          console.error("Failed to sync wishlist (edit):", err);
          alert(parseFirestoreError(err));
        }
      }
    } else {
      const item: WishlistItem = {
        id: crypto.randomUUID(),
        ...itemData,
        createdAt: new Date().toISOString()
      };
      
      setData(prev => ({ ...prev, wishlist: [item, ...(prev.wishlist || [])] }));

      if (user) {
        try {
          await syncWishlistToFirebase(item);
        } catch (err: any) {
          console.error("Failed to sync wishlist (new):", err);
          alert(parseFirestoreError(err));
        }
      }
    }
    
    setShowWishlistModal(false);
    setEditingWishlistId(null);
    setNewWishlistItem(initialWishlistState);
  };

  const toggleWishlistItem = async (id: string) => {
    const item = (data.wishlist || []).find(w => w.id === id);
    if (!item) return;
    
    const updatedItem = { ...item, completed: !item.completed };
    
    setData(prev => ({
      ...prev,
      wishlist: (prev.wishlist || []).map(w => w.id === id ? updatedItem : w)
    }));

    if (user) {
      try {
        await syncWishlistToFirebase(updatedItem);
      } catch (err) {
        console.error("Failed to toggle wishlist item:", err);
      }
    }
  };

  const toggleItemStatus = async (id: string, completed: boolean) => {
    const item = data.wishlist?.find(w => w.id === id);
    if (item) {
      const updatedItem = { ...item, completed };
      await syncWishlistToFirebase(updatedItem);
    }
  };

  const deleteItem = async (id: string, type: 'task' | 'transaction' | 'wishlist' | 'debts' | 'savingsGoals') => {
    if (!confirm('ئایا دڵنیایت لە سڕینەوەی ئەم بڕگەیە؟')) return;
    
    // Optimistic update
    setData(prev => {
      const newData = { ...prev };
      if (type === 'task') newData.tasks = prev.tasks.filter(t => t.id !== id);
      else if (type === 'transaction') newData.transactions = prev.transactions.filter(t => t.id !== id);
      else if (type === 'wishlist') newData.wishlist = (prev.wishlist || []).filter(w => w.id !== id);
      else if (type === 'debts') newData.debts = (prev.debts || []).filter(d => d.id !== id);
      else if (type === 'savingsGoals') newData.savingsGoals = (prev.savingsGoals || []).filter(s => s.id !== id);
      return newData;
    });

    if (user) {
      try {
        if (type === 'task') await deleteTaskFromFirebase(id);
        else if (type === 'transaction') await deleteTransactionFromFirebase(id);
        else if (type === 'wishlist') await deleteWishlistFromFirebase(id);
        else if (type === 'debts') await deleteDebtFromFirebase(id);
        else if (type === 'savingsGoals') await deleteSavingsGoalFromFirebase(id);
      } catch (err) {
        console.error("Failed to delete item:", err);
        // Rollback happens automatically via onSnapshot if sync fails
      }
    }
  };

  // --- Render Sections ---

  const renderWishlist = () => {
    const items = (data.wishlist || []).filter(w => activeWishlistTab === 'general' ? w.type !== 'private' : w.type === 'private');
    
    return (
      <div className="space-y-6 pb-24">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-yellow-500" /> ئاواتەکان
          </h2>
          <Button onClick={() => {
            setEditingWishlistId(null);
            setNewWishlistItem(initialWishlistState);
            setShowWishlistModal(true);
          }} className="rounded-2xl px-6">
            <Plus className="w-5 h-5 ml-2" /> زیادکردن
          </Button>
        </div>

        <div className="flex gap-2 bg-[var(--bg-card)] p-1 rounded-2xl border border-[var(--border-color)]">
          <button
            onClick={() => setActiveWishlistTab('general')}
            className={cn(
              "flex-1 py-2 rounded-xl font-bold text-sm transition-all",
              activeWishlistTab === 'general' ? "bg-blue-600 text-white shadow-md" : "text-[var(--text-muted)] hover:bg-[var(--bg-main)]"
            )}
          >
            گشتی
          </button>
          <button
            onClick={() => setActiveWishlistTab('private')}
            className={cn(
              "flex-1 py-2 rounded-xl font-bold text-sm transition-all",
              activeWishlistTab === 'private' ? "bg-blue-600 text-white shadow-md" : "text-[var(--text-muted)] hover:bg-[var(--bg-main)]"
            )}
          >
            تایبەت
          </button>
        </div>

        <div className="grid gap-4">
          {items.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-muted)]">هیچ ئاواتێک نییە</div>
          ) : (
            items.map(item => (
              <Card key={item.id} className={cn("p-5", item.completed && "opacity-60")}>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <button 
                        onClick={() => toggleItemStatus(item.id, !item.completed)}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
                          item.completed ? "bg-green-500 border-green-500 text-white" : "border-[var(--border-color)] hover:border-green-500"
                        )}
                      >
                        {item.completed && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                      <h3 className={cn("font-black text-lg", item.completed ? "line-through text-[var(--text-muted)]" : "text-[var(--text-main)]")}>
                        {item.title}
                      </h3>
                    </div>
                    {item.notes && <p className="text-sm text-[var(--text-muted)] mt-2 whitespace-pre-wrap">{item.notes}</p>}
                    {item.estimatedPrice ? (
                      <div className="mt-3 inline-block bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-lg text-sm font-bold">
                        {item.estimatedPrice.toLocaleString()} دینار
                      </div>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      setEditingWishlistId(item.id);
                      setNewWishlistItem(item);
                      setShowWishlistModal(true);
                    }} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => {
                      if(window.confirm('دڵنیایت لە سڕینەوەی؟')) deleteItem(item.id, 'wishlist');
                    }} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderDebts = () => {
    const totalOwed = (data.debts || []).filter(d => d.type === 'owed' && !d.completed).reduce((acc, d) => acc + d.amount, 0);
    const totalOwing = (data.debts || []).filter(d => d.type === 'owing' && !d.completed).reduce((acc, d) => acc + d.amount, 0);

    return (
      <div className="space-y-6 pb-24">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-2">
            <UserMinus className="w-7 h-7 text-red-600" /> قەرزەکان
          </h2>
          <Button onClick={() => {
            setEditingDebtId(null);
            setNewDebt({ type: 'owed', amount: 0 });
            setShowDebtModal(true);
          }} className="rounded-2xl px-6">
            <Plus className="w-5 h-5 ml-2" /> زیادکردن
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 bg-red-50 border-red-100">
            <p className="text-sm font-bold text-red-800">قەرزارم:</p>
            <p className="text-xl font-black text-red-600">{totalOwed.toLocaleString()} د.ع</p>
          </Card>
          <Card className="p-4 bg-green-50 border-green-100">
            <p className="text-sm font-bold text-green-800">قەرزم لایە:</p>
            <p className="text-xl font-black text-green-600">{totalOwing.toLocaleString()} د.ع</p>
          </Card>
        </div>

        <div className="space-y-4">
          {(data.debts || []).map(debt => (
            <Card key={debt.id} className={cn("transition-all", debt.completed && "opacity-60 bg-[var(--bg-main)]")}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className={cn("font-bold text-lg", debt.completed && "line-through text-[var(--text-muted)]")}>{debt.personName}</h4>
                  <p className="text-sm text-[var(--text-muted)]">{debt.notes}</p>
                  <p className={cn("text-lg font-black mt-1", debt.type === 'owed' ? 'text-red-600' : 'text-green-600')}>{debt.amount.toLocaleString()} د.ع</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => {
                    setEditingDebtId(debt.id);
                    setNewDebt(debt);
                    setShowDebtModal(true);
                  }} className="p-2 text-[var(--text-muted)] hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteItem(debt.id, 'debts')} className="p-2 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderSavings = () => {
    return (
      <div className="space-y-6 pb-24">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-2">
            <PiggyBank className="w-7 h-7 text-yellow-600" /> پاشەکەوت
          </h2>
          <Button onClick={() => {
            setEditingSavingsId(null);
            setNewSavings({ targetAmount: 0, currentAmount: 0 });
            setShowSavingsModal(true);
          }} className="rounded-2xl px-6">
            <Plus className="w-5 h-5 ml-2" /> زیادکردن
          </Button>
        </div>

        <div className="space-y-4">
          {(data.savingsGoals || []).map(goal => {
            const progress = (goal.currentAmount / goal.targetAmount) * 100;
            return (
              <Card key={goal.id} className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-xl">{goal.title}</h4>
                  <div className="flex items-center gap-2">
                    <button onClick={() => {
                      setWithdrawGoalId(goal.id);
                      setShowWithdrawModal(true);
                    }} className="p-2 text-[var(--text-muted)] hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-xl transition-colors" title="ڕاکێشانی پارە">
                      <ArrowDownToLine className="w-4 h-4" />
                    </button>
                    <button onClick={() => {
                      setEditingSavingsId(goal.id);
                      setNewSavings(goal);
                      setShowSavingsModal(true);
                    }} className="p-2 text-[var(--text-muted)] hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteItem(goal.id, 'savingsGoals')} className="p-2 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="w-full bg-[var(--bg-main)] rounded-full h-4 overflow-hidden">
                  <div className={cn("h-full transition-all duration-500", progress >= 100 ? "bg-green-500" : "bg-red-500")} style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span>{goal.currentAmount.toLocaleString()} د.ع</span>
                  <span>{goal.targetAmount.toLocaleString()} د.ع</span>
                </div>
                {goal.currentAmount < goal.targetAmount && (
                  <div className="pt-2 flex items-center gap-2">
                    <div className="flex-1 relative">
                      <FormattedNumberInput 
                        value={quickAddAmounts[goal.id] || ''} 
                        onChange={val => setQuickAddAmounts(p => ({ ...p, [goal.id]: val }))} 
                        className="w-full px-4 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" 
                        placeholder="بڕی پارە زیاد بکە..." 
                      />
                    </div>
                    <button 
                      onClick={() => handleQuickAddSavings(goal)}
                      disabled={!quickAddAmounts[goal.id] || quickAddAmounts[goal.id] <= 0}
                      className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                )}
                {goal.currentAmount < goal.targetAmount && (
                  <div className="text-xs text-[var(--text-muted)] font-bold text-center">
                    ماوە بۆ تەواوبوون: {(goal.targetAmount - goal.currentAmount).toLocaleString()} د.ع
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-8 pb-12">
      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-blue-800 text-white border-none">
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-6">
              <div>
                <p className="text-blue-100 font-medium mb-1">کۆی گشتی باڵانس</p>
                <h2 className="text-4xl sm:text-5xl font-black">
                  {stats.balance.toLocaleString()} <span className="text-xl sm:text-2xl font-normal opacity-80">د.ع</span>
                </h2>
              </div>
              <div className="hidden sm:block w-px h-12 bg-white/20" />
              <div>
                <p className="text-blue-100 font-medium mb-1">کۆی پاشەکەوت</p>
                <h2 className="text-3xl sm:text-4xl font-black">
                  {stats.personalSavings.toLocaleString()} <span className="text-lg sm:text-xl font-normal opacity-80">د.ع</span>
                </h2>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-none px-4" onClick={() => {
                setNewTransaction({ ...initialTransactionState, type: 'income', category: 'personal' });
                setShowTransactionModal(true);
              }}>
                <Plus className="w-4 h-4" /> داهات
              </Button>
              <Button variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-none px-4" onClick={() => {
                setNewTransaction({ ...initialTransactionState, type: 'expense', category: 'personal' });
                setShowTransactionModal(true);
              }}>
                <ArrowUpRight className="w-4 h-4" /> خەرجی
              </Button>
              <Button variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-none px-4" onClick={() => {
                setNewTransaction({ ...initialTransactionState, type: 'savings', category: 'personal', description: 'پارە هەڵگرتن' });
                setShowTransactionModal(true);
              }}>
                <Wallet className="w-4 h-4" /> هەڵگرتن
              </Button>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 opacity-10">
            <Wallet className="w-64 h-64" />
          </div>
        </Card>

        <Card className="bg-[var(--bg-card)] border-[var(--border-color)]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-black text-[var(--text-main)]">ئاماری خەرجی</h3>
            <Badge variant="info">٧ رۆژ</Badge>
          </div>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData}>
                <defs>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" />
                <Area type="monotone" dataKey="income" stroke="#2563eb" fillOpacity={0.1} fill="#2563eb" />
                <Area type="monotone" dataKey="savings" stroke="#f59e0b" fillOpacity={0.1} fill="#f59e0b" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs font-bold text-[var(--text-muted)]">خەرجی</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-600" />
              <span className="text-xs font-bold text-[var(--text-muted)]">داهات</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-xs font-bold text-[var(--text-muted)]">پاشەکەوت</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Fuel, label: 'بەنزین', color: 'bg-red-50 dark:bg-red-900/20 text-red-600' },
          { icon: ShoppingCart, label: 'مارکێت', color: 'bg-green-50 dark:bg-green-900/20 text-green-600' },
          { icon: Zap, label: 'کارەبا', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' },
          { icon: User, label: 'خەرجی تر', color: 'bg-[var(--bg-main)] text-[var(--text-muted)]' },
        ].map((action, i) => (
          <button 
            key={i} 
            onClick={() => {
              setNewTransaction({ 
                ...initialTransactionState,
                description: action.label, 
                category: 'personal',
                type: 'expense'
              });
              setShowTransactionModal(true);
            }}
            className="p-4 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all flex flex-col items-center gap-2 group active:scale-95"
          >
            <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110", action.color)}>
              <action.icon className="w-6 h-6" />
            </div>
            <span className="font-bold text-sm text-[var(--text-main)]">{action.label}</span>
          </button>
        ))}
      </div>

          {/* Export Actions */}
          <div className="grid grid-cols-3 gap-3 no-print">
            <button onClick={exportToExcel} className="flex items-center justify-center gap-2 p-4 bg-green-600 text-white rounded-2xl font-bold shadow-lg shadow-green-100 hover:bg-green-700 transition-all active:scale-95">
              <Briefcase className="w-5 h-5" /> Excel
            </button>
            <button onClick={exportToPDF} className="flex items-center justify-center gap-2 p-4 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95">
              <AlertCircle className="w-5 h-5" /> PDF
            </button>
            <button onClick={handlePrint} className="flex items-center justify-center gap-2 p-4 bg-slate-800 text-white rounded-2xl font-bold shadow-lg hover:bg-slate-900 transition-all active:scale-95">
              <Clock className="w-5 h-5" /> Print
            </button>
          </div>

          <div className="flex justify-center mb-10 no-print">
            <button 
              onClick={() => setShowResetModal(true)} 
              className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all active:scale-95"
            >
              <Trash2 className="w-4 h-4" /> سڕینەوەی هەموو داتاکان
            </button>
          </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tasks Section */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-blue-600" /> ئیشەکانی ئەمڕۆ
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('tasks')}>هەمووی</Button>
          </div>
          <div className="space-y-3">
            {data.tasks.filter(t => isToday(parseISO(t.date)) && !t.completed).length === 0 ? (
              <div className="p-12 bg-[var(--bg-card)] rounded-3xl border border-dashed border-[var(--border-color)] text-center">
                <p className="text-[var(--text-muted)] font-medium">هیچ ئیشێکی ماوە نییە بۆ ئەمڕۆ</p>
              </div>
            ) : (
              data.tasks.filter(t => isToday(parseISO(t.date)) && !t.completed).slice(0, 4).map(task => (
                <div key={task.id} className="group bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-color)] shadow-sm flex items-center gap-4 hover:border-blue-200 transition-all">
                  <button onClick={() => toggleTask(task.id)} className="text-[var(--text-muted)] hover:text-blue-600 transition-colors">
                    <Circle className="w-6 h-6" />
                  </button>
                  <div className="flex-1">
                    <h4 className="font-bold text-[var(--text-main)]">{task.title}</h4>
                    <div className="mt-1 space-y-0.5">
                      {(task.details || []).map((d, i) => (
                        <p key={i} className="text-[10px] text-[var(--text-muted)]">
                          <span className="font-black text-[var(--text-muted)]">{d.subject}:</span> {d.work}
                        </p>
                      ))}
                    </div>
                  </div>
                  <Badge variant={task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'default'}>
                    {task.priority === 'high' ? 'گرنگ' : task.priority === 'medium' ? 'ناوەند' : 'ئاسایی'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Finance Section */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-600" /> کۆتا جوڵەکان
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('personal')}>هەمووی</Button>
          </div>
          <div className="space-y-3">
            {data.transactions.slice(0, 4).map(t => (
              <div key={t.id} className="bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-color)] shadow-sm flex items-center gap-4">
                <div className={cn(
                  "p-2.5 rounded-2xl",
                  t.type === 'income' ? "bg-green-50 dark:bg-green-900/20 text-green-600" : "bg-red-50 dark:bg-red-900/20 text-red-600"
                )}>
                  {t.type === 'income' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-[var(--text-main)]">{t.description}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{t.category === 'work' ? 'کارگە' : 'تایبەت'}</span>
                    <span className="w-1 h-1 rounded-full bg-[var(--border-color)]" />
                    <span className="text-[10px] font-bold text-[var(--text-muted)]">{format(parseISO(t.date), 'MMM d')}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn("font-black text-lg", t.type === 'income' ? "text-green-600" : "text-red-600")}>
                    {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
                  </p>
                  {t.paymentMethod === 'own_money' && <p className="text-[10px] font-bold text-amber-600">لە گیرفانی خۆت</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );

  const renderTasks = () => (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black">لیستی ئیشەکان</h2>
        <Button onClick={() => setShowTaskModal(true)} size="lg">
          <Plus className="w-5 h-5" /> ئیشی نوێ
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
        <input 
          type="text" 
          placeholder="گەڕان لە ئیشەکان..." 
          className="w-full pr-12 pl-4 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-[var(--text-main)]"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="space-y-8">
        {['ئەمڕۆ', 'سبەی', 'دواتر'].map(period => {
          const filteredTasks = data.tasks.filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
            if (!matchesSearch) return false;
            if (period === 'ئەمڕۆ') return isToday(parseISO(t.date));
            if (period === 'سبەی') return isTomorrow(parseISO(t.date));
            return !isToday(parseISO(t.date)) && !isTomorrow(parseISO(t.date));
          });

          if (filteredTasks.length === 0) {
            if (searchQuery) return null;
            return (
              <div key={period} className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-[var(--bg-main)] rounded-full flex items-center justify-center mb-4">
                  <CheckSquare className="w-8 h-8 text-[var(--text-muted)]" />
                </div>
                <h3 className="text-lg font-black text-[var(--text-muted)]">{period} هیچ ئیشێک نییە</h3>
              </div>
            );
          }

          return (
            <div key={period} className="space-y-4">
              <h3 className="text-lg font-black text-[var(--text-muted)] mr-2">{period}</h3>
              <div className="grid grid-cols-1 gap-4">
                {filteredTasks.map(task => (
                  <Card key={task.id} className={cn("p-5 transition-all", task.completed && "opacity-50")}>
                    <div className="flex items-center gap-5">
                      <button onClick={() => toggleTask(task.id)} className={cn(
                        "transition-all transform active:scale-90",
                        task.completed ? "text-green-500" : "text-[var(--text-muted)] hover:text-blue-600"
                      )}>
                        {task.completed ? <CheckCircle2 className="w-8 h-8" /> : <Circle className="w-8 h-8" />}
                      </button>
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-1 mb-1">
                          {(task.workTypes || []).map((wt, i) => (
                            <span key={i} className="text-[9px] font-black bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase">{wt}</span>
                          ))}
                        </div>
                        <h4 className={cn("font-black text-xl text-[var(--text-main)]", task.completed && "line-through")}>{task.title}</h4>
                        <div className="mt-2 space-y-1">
                          {(task.details || []).map((d, i) => (
                            <div key={i} className="bg-[var(--bg-main)] p-2 rounded-xl border border-[var(--border-color)]">
                              <p className="text-xs font-black text-[var(--text-muted)]">{d.subject}</p>
                              <p className="text-xs text-[var(--text-muted)] mt-0.5">{d.work}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-3">
                          <Badge variant={task.category === 'work' ? 'info' : 'warning'}>
                            {task.category === 'work' ? 'کارگە' : 'تایبەت'}
                          </Badge>
                          <Badge variant={task.priority === 'high' ? 'danger' : 'default'}>
                            {task.priority === 'high' ? 'گرنگ' : 'ئاسایی'}
                          </Badge>
                          {task.dueDate && (
                            <span className={cn(
                              "text-xs font-black flex items-center gap-1 px-2 py-1 rounded-lg",
                              !task.completed && isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate))
                                ? "bg-red-50 dark:bg-red-900/20 text-red-600" 
                                : "bg-[var(--bg-main)] text-[var(--text-muted)]"
                            )}>
                              <Clock className="w-3 h-3" /> 
                              کاتی کۆتایی: {format(parseISO(task.dueDate), 'yyyy/MM/dd')}
                              {!task.completed && isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate)) && " (دواکەوتووە!)"}
                            </span>
                          )}
                          <span className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {format(parseISO(task.date), 'yyyy/MM/dd')}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setNewTask({ ...task });
                            setEditingTaskId(task.id);
                            setShowTaskModal(true);
                          }} 
                          className="p-3 text-[var(--text-muted)] hover:text-blue-500 transition-colors"
                        >
                          <Edit2 className="w-6 h-6" />
                        </button>
                        <button onClick={() => deleteItem(task.id, 'task')} className="p-3 text-[var(--text-muted)] hover:text-red-500 transition-colors">
                          <Trash2 className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderFinance = (category: 'work' | 'personal') => {
    const filteredTransactions = data.transactions.filter(t => {
      if (t.category !== category) return false;
      const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (t.shopName || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (financeFilter === 'driver') return t.description === 'سایەقی' || t.isDelivery;
      if (category === 'personal') {
        if (financeFilter === 'market') return t.description === 'مارکێت';
        if (financeFilter === 'fuel') return t.description === 'بەنزین';
        if (financeFilter === 'income') return t.type === 'income';
        if (financeFilter === 'savings') return t.type === 'savings';
      }
      return true;
    });

    return (
      <div className="space-y-6 pb-20">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-black">{category === 'work' ? 'دارایی گشتی' : 'خەرجی تایبەت'}</h2>
          <Button onClick={() => {
            setNewTransaction(p => ({ ...p, category, type: category === 'work' ? 'income' : 'expense' }));
            setShowTransactionModal(true);
          }} size="lg">
            <Plus className="w-5 h-5" /> تۆماری نوێ
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2 bg-[var(--bg-card)] p-1.5 rounded-2xl border border-[var(--border-color)] shadow-sm overflow-x-auto">
            {[
              { id: 'all', label: 'گشتی' },
              { id: 'driver', label: 'سایەقی' },
              ...(category === 'personal' ? [
                { id: 'market', label: 'مارکێت' },
                { id: 'fuel', label: 'بەنزین' },
                { id: 'income', label: 'داهات' },
                { id: 'savings', label: 'پاشەکەوت' },
              ] : [])
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFinanceFilter(f.id as any)}
                className={cn(
                  "px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                  financeFilter === f.id ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-[var(--text-muted)] hover:bg-[var(--bg-main)]"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          
          {category === 'personal' && (
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                placeholder="زیادکردنی وەسفی نوێ..." 
                className="flex-1 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 text-[var(--text-main)]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value.trim();
                    if (val && !(data.descriptions || []).includes(val)) {
                      setData(prev => ({ ...prev, descriptions: [...(prev.descriptions || []), val] }));
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
              <p className="text-[10px] text-[var(--text-muted)] font-bold">ئینتەر دابگرە بۆ زیادکردن</p>
            </div>
          )}
          
          {category === 'personal' && (data.descriptions || []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(data.descriptions || []).map((cat, idx) => (
                <div key={idx} className="flex items-center gap-1 bg-[var(--bg-main)] px-2 py-1 rounded-lg text-[10px] font-bold text-[var(--text-muted)] group relative">
                  {editingDescription?.index === idx ? (
                    <input 
                      autoFocus
                      className="bg-transparent border-none outline-none px-1 w-20 text-[var(--text-main)]"
                      value={editingDescription.value}
                      onChange={(e) => setEditingDescription({ ...editingDescription, value: e.target.value })}
                      onBlur={() => {
                        if (editingDescription.value.trim()) {
                          const next = [...data.descriptions];
                          next[idx] = editingDescription.value.trim();
                          setData(prev => ({ ...prev, descriptions: next }));
                        }
                        setEditingDescription(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                      }}
                    />
                  ) : (
                    <span onClick={() => setEditingDescription({ index: idx, value: cat })} className="cursor-pointer hover:text-blue-600">{cat}</span>
                  )}
                  <button onClick={() => setData(prev => ({ ...prev, descriptions: (prev.descriptions || []).filter((_, i) => i !== idx) }))} className="text-[var(--text-muted)] hover:text-red-500">
                    <Plus className="w-3 h-3 rotate-45" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30">
            <p className="text-green-600 dark:text-green-400 font-bold text-sm">کۆی داهات</p>
            <h3 className="text-2xl font-black text-green-700 dark:text-green-300 mt-1">
              {data.transactions.filter(t => t.category === category && t.type === 'income').reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
            </h3>
          </Card>
          <Card className="bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30">
            <p className="text-red-600 dark:text-red-400 font-bold text-sm">کۆی خەرجی</p>
            <h3 className="text-2xl font-black text-red-700 dark:text-red-300 mt-1">
              {data.transactions.filter(t => t.category === category && t.type === 'expense').reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
            </h3>
          </Card>
          <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
            <p className="text-blue-600 dark:text-blue-400 font-bold text-sm">باڵانس</p>
            <h3 className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">
              {(data.transactions.filter(t => t.category === category && t.type === 'income').reduce((acc, t) => acc + t.amount, 0) - 
                data.transactions.filter(t => t.category === category && t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)).toLocaleString()}
            </h3>
          </Card>
        </div>

        {category === 'work' && stats.totalMilk > 0 && (
          <Card className="bg-blue-600 text-white">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-blue-100 text-sm font-bold">کۆی شیری هێنراوە</p>
                <h3 className="text-3xl font-black">{stats.totalMilk} <span className="text-lg font-normal">لیتر</span></h3>
              </div>
              <Milk className="w-12 h-12 opacity-20" />
            </div>
          </Card>
        )}

        <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <th className="px-6 py-4 font-black text-[var(--text-muted)] text-sm">وەسف</th>
                  <th className="px-6 py-4 font-black text-[var(--text-muted)] text-sm">بڕ</th>
                  <th className="px-6 py-4 font-black text-[var(--text-muted)] text-sm">شێواز</th>
                  <th className="px-6 py-4 font-black text-[var(--text-muted)] text-sm">بەروار</th>
                  <th className="px-6 py-4 font-black text-[var(--text-muted)] text-sm"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-[var(--bg-main)] rounded-full flex items-center justify-center mb-4">
                          <Wallet className="w-8 h-8 text-[var(--text-muted)]" />
                        </div>
                        <h3 className="text-lg font-black text-[var(--text-muted)]">هیچ تۆمارێک نەدۆزرایەوە</h3>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map(t => (
                    <tr key={t.id} className="hover:bg-[var(--bg-main)] transition-colors">
                    <td className="px-6 py-6">
                      <p className="font-bold text-[var(--text-main)] text-lg mb-2">{t.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {t.subCategory && <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase bg-[var(--bg-main)] px-2 py-1 rounded-lg">{t.subCategory}</span>}
                        {t.milkQuantity ? <span className="text-[11px] font-bold text-blue-600 uppercase bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">{t.milkQuantity} لیتر شیر</span> : null}
                        {t.fuelLiters ? <span className="text-[11px] font-bold text-red-600 uppercase bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg">{t.fuelLiters} لیتر {t.fuelType}</span> : null}
                        {t.fuelPricePerLiter ? <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase bg-[var(--bg-main)] px-2 py-1 rounded-lg">نرخی لیتر: {t.fuelPricePerLiter.toLocaleString()}</span> : null}
                        {t.category === 'work' && t.maintenanceType && <span className="text-[11px] font-bold text-amber-700 uppercase bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">{t.maintenanceType}</span>}
                        {t.workLocation && <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase bg-[var(--bg-main)] px-2 py-1 rounded-lg">شوێن: {t.workLocation}</span>}
                        {t.shopName && <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase bg-[var(--bg-main)] px-2 py-1 rounded-lg">ناوی شوێن: {t.shopName}</span>}
                        {t.itemsBought && <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase bg-[var(--bg-main)] px-2 py-1 rounded-lg">پێداویستی: {t.itemsBought}</span>}
                        {t.customerName && <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">کڕیار: {t.customerName}</span>}
                        {t.invoiceNumber && <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg">قایمە: {t.invoiceNumber}</span>}
                        {t.driverName && <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase bg-[var(--bg-main)] px-2 py-1 rounded-lg">سایەق: {t.driverName}</span>}
                        {t.discount ? <span className="text-[11px] font-bold text-orange-600 uppercase bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg">داشکاندن: {t.discount.toLocaleString()}</span> : null}
                        {t.paidAmount ? <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">وەرگیراو: {t.paidAmount.toLocaleString()}</span> : null}
                        {t.remainingAmount ? <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">ماوە: {t.remainingAmount.toLocaleString()}</span> : null}
                        {t.debtAmount ? <span className="text-[11px] font-bold text-red-700 dark:text-red-400 uppercase bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg">قەرز: {t.debtAmount.toLocaleString()}</span> : null}
                        {t.receiptImage && (
                          <div className="w-full mt-3">
                            <button 
                              onClick={() => setSelectedImage(t.receiptImage)}
                              className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-[var(--border-color)] hover:border-blue-500 transition-all group shadow-sm"
                            >
                              <img src={t.receiptImage} alt="Receipt" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Search className="w-5 h-5 text-white" />
                              </div>
                            </button>
                          </div>
                        )}
                        {t.receiptItems && t.receiptItems.length > 0 && (
                          <div className="w-full mt-3 space-y-1.5">
                            {t.receiptItems.map((item, i) => (
                              <div key={i} className="flex justify-between text-[11px] font-medium text-[var(--text-muted)] bg-[var(--bg-main)] px-3 py-1.5 rounded-lg border border-[var(--border-color)]">
                                <span>{item.name}</span>
                                <span className="font-bold">{item.price.toLocaleString()} دینار</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className={cn("font-black text-lg", t.type === 'income' ? "text-green-600" : "text-red-600")}>
                        {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <Badge variant={t.paymentMethod === 'own_money' ? 'warning' : 'default'}>
                        {t.paymentMethod === 'own_money' ? 'پارەی خۆم' : t.paymentMethod === 'factory_money' ? 'پارەی کارگە' : 'کاش'}
                      </Badge>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-[var(--text-muted)]">{format(parseISO(t.date), 'yyyy/MM/dd')}</td>
                    <td className="px-6 py-5">
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => handleShareTransaction(t)}
                          className="text-[var(--text-muted)] hover:text-green-500 transition-colors"
                          title="ناردن بۆ محاسب"
                        >
                          <Share2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => {
                            setNewTransaction({ ...t });
                            setEditingTransactionId(t.id);
                            setShowTransactionModal(true);
                          }} 
                          className="text-[var(--text-muted)] hover:text-blue-500 transition-colors"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button onClick={() => deleteItem(t.id, 'transaction')} className="text-[var(--text-muted)] hover:text-red-500 transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Image Viewer Modal */}
        <AnimatePresence>
          {selectedImage && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setSelectedImage(null)} 
                className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" 
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.9 }} 
                className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center"
              >
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-12 right-0 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <Plus className="w-8 h-8 rotate-45" />
                </button>
                <img 
                  src={selectedImage} 
                  alt="Full Receipt" 
                  className="w-full h-full object-contain rounded-2xl shadow-2xl" 
                />
                <div className="mt-4 flex gap-4">
                  <Button 
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = selectedImage;
                      link.download = `receipt-${Date.now()}.jpg`;
                      link.click();
                    }}
                    variant="secondary"
                    className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                  >
                    داگرتن
                  </Button>
                  <Button 
                    onClick={() => {
                      // Find the transaction with this image to share its details
                      const t = data.transactions.find(tr => tr.receiptImage === selectedImage);
                      if (t) handleShareTransaction(t);
                    }}
                    variant="primary"
                    className="bg-green-600 hover:bg-green-700 shadow-none"
                  >
                    ناردن بۆ محاسب
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] kurdish-font selection:bg-blue-100 selection:text-blue-900 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-32">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 no-print">
          <div className="flex-shrink-0 flex justify-start items-center">
            <button 
              onClick={() => setShowSidebar(true)}
              className="w-12 h-12 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex items-center justify-center text-[var(--text-muted)] shadow-sm hover:text-blue-600 transition-all ml-4 shrink-0"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="text-right">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-4xl font-black text-[var(--text-main)] tracking-tight"
              >
                رۆژانەی یوسف
              </motion.h1>
              <p className="text-[var(--text-muted)] font-bold mt-1">بەڕێوەبردنی زیرەکانەی کار و دارایی</p>
            </div>
          </div>

          <div className="flex flex-1 items-center gap-3 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input 
                type="text"
                placeholder="گەڕان لە کار و دارایی..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-12 pl-4 py-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm shadow-sm transition-all"
              />
            </div>
            
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="w-12 h-12 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex items-center justify-center text-[var(--text-muted)] shadow-sm hover:text-blue-600 transition-all"
            >
              {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>

            {user ? (
              <div className="flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-color)] p-1.5 rounded-2xl shadow-sm">
                <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-9 h-9 rounded-xl border border-[var(--border-color)]" />
                <div className="hidden sm:block">
                  <p className="text-xs font-black text-[var(--text-main)] leading-tight">{user.displayName || 'بەکارهێنەر'}</p>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] leading-tight opacity-70">{user.email}</p>
                  <button onClick={logout} className="text-[10px] font-bold text-red-500 hover:text-red-600 mt-0.5">چوونەدەرەوە</button>
                </div>
                <button onClick={logout} className="sm:hidden p-1.5 text-red-500"><Plus className="w-5 h-5 rotate-45" /></button>
              </div>
            ) : (
              <Button onClick={loginWithGoogle} className="rounded-2xl px-6 h-12">
                چوونەژوورەوە
              </Button>
            )}
          </div>
        </header>

        {/* Sidebar Navigation */}
        <AnimatePresence>
          {showSidebar && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setShowSidebar(false)} 
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]" 
              />
              <motion.div 
                initial={{ x: '100%' }} 
                animate={{ x: 0 }} 
                exit={{ x: '100%' }} 
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 bottom-0 w-72 bg-[var(--bg-card)] shadow-2xl z-[101] flex flex-col border-l border-[var(--border-color)]"
              >
                <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                  <h2 className="text-2xl font-black text-[var(--text-main)]">لیستی بەشەکان</h2>
                  <button onClick={() => setShowSidebar(false)} className="p-2 hover:bg-[var(--bg-main)] rounded-full transition-colors">
                    <X className="w-6 h-6 text-[var(--text-muted)]" />
                  </button>
                </div>
                <div className="p-4 flex-1 overflow-y-auto space-y-2">
                  {[
                    { id: 'dashboard', label: 'داشبۆرد', icon: LayoutDashboard },
                    { id: 'tasks', label: 'ئەرکەکان', icon: CheckSquare },
                    { id: 'personal', label: 'دارایی', icon: Wallet },
                    { id: 'wishlist', label: 'ئاواتەکان', icon: Sparkles },
                    { id: 'debts', label: 'قەرزەکان', icon: CreditCard },
                    { id: 'savings', label: 'پاشەکەوت', icon: PiggyBank },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        setShowSidebar(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-bold transition-all",
                        activeTab === tab.id 
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" 
                          : "text-[var(--text-muted)] hover:bg-[var(--bg-main)] hover:text-[var(--text-main)]"
                      )}
                    >
                      <tab.icon className="w-6 h-6" />
                      <span className="text-lg">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Dynamic Content */}
        <main>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'tasks' && renderTasks()}
              {activeTab === 'personal' && renderFinance('personal')}
              {activeTab === 'wishlist' && renderWishlist()}
              {activeTab === 'debts' && renderDebts()}
              {activeTab === 'savings' && renderSavings()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom Nav */}
        {/* Removed */}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showTaskModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTaskModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-[var(--bg-card)] rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-8 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)]">
                <h3 className="text-2xl font-black text-[var(--text-main)]">ئیشی نوێ</h3>
                <button onClick={() => setShowTaskModal(false)} className="p-2 hover:bg-[var(--bg-main)] rounded-full transition-colors"><Plus className="w-6 h-6 rotate-45" /></button>
              </div>
              <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                {/* Work Types Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-black text-[var(--text-muted)] mr-1">جۆری ئیش (دەتوانی چەند دانەیەک هەڵبژێریت)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['سایەقی', 'کارەبا', 'سیانەی ناو کارگە', 'دوکان'].map(type => (
                      <button
                        key={type}
                        onClick={() => {
                          const current = newTask.workTypes || [];
                          const next = current.includes(type) 
                            ? current.filter(t => t !== type) 
                            : [...current, type];
                          setNewTask(p => ({ ...p, workTypes: next }));
                        }}
                        className={cn(
                          "px-4 py-3 rounded-2xl text-sm font-bold transition-all border-2",
                          (newTask.workTypes || []).includes(type)
                            ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-none"
                            : "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-blue-200"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  
                  {/* Custom Work Type Input */}
                  <div className="flex gap-2 mt-2">
                    <HistoryInput 
                      value={tempCustomWorkType} 
                      onChange={setTempCustomWorkType} 
                      historyKey="custom_work_type"
                      history={data.history?.['custom_work_type']}
                      onSaveHistory={handleSaveHistory}
                      className="px-4 py-2 text-sm bg-[var(--bg-card)]" 
                      placeholder="جۆری ئیشی تر..." 
                    />
                    <button 
                      onClick={() => {
                        const val = tempCustomWorkType.trim();
                        if (val && !(newTask.workTypes || []).includes(val)) {
                          setNewTask(p => ({ ...p, workTypes: [...(p.workTypes || []), val] }));
                          setTempCustomWorkType('');
                        }
                      }}
                      className="flex items-center justify-center w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shrink-0"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Selected Custom Types */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(newTask.workTypes || []).filter(t => !['سایەقی', 'کارەبا', 'سیانەی ناو کارگە', 'دوکان'].includes(t)).map((t, i) => (
                      <div key={i} className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg text-[10px] font-bold text-blue-600 dark:text-blue-400 group">
                        <span 
                          contentEditable 
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const newVal = e.currentTarget.textContent?.trim();
                            if (newVal && newVal !== t) {
                              setNewTask(p => ({
                                ...p,
                                workTypes: (p.workTypes || []).map(type => type === t ? newVal : type)
                              }));
                            }
                          }}
                          className="outline-none focus:bg-[var(--bg-main)] px-1 rounded"
                        >
                          {t}
                        </span>
                        <button onClick={() => setNewTask(p => ({ ...p, workTypes: (p.workTypes || []).filter(type => type !== t) }))}>
                          <Plus className="w-3 h-3 rotate-45 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-[var(--text-muted)] mr-1">ناونیشانی ئیشەکە</label>
                  <HistoryInput 
                    value={newTask.title || ''} 
                    onChange={val => setNewTask(p => ({ ...p, title: val }))} 
                    historyKey="task_title"
                    history={data.history?.['task_title']}
                    onSaveHistory={handleSaveHistory}
                    className="text-lg" 
                    placeholder="چی دەکەیت؟" 
                  />
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-black text-[var(--text-muted)] mr-1">بابەت و کارەکان</label>
                  </div>
                  
                  <div className="space-y-3">
                    {(newTask.details || [{ subject: '', work: '' }]).map((detail, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-start bg-[var(--bg-main)] p-4 rounded-2xl">
                        <div className="col-span-5 space-y-1">
                          <label className="text-[10px] font-bold text-[var(--text-muted)]">بابەت</label>
                          <HistoryInput 
                            value={detail.subject} 
                            onChange={val => {
                              const next = [...(newTask.details || [])];
                              next[idx].subject = val;
                              setNewTask(p => ({ ...p, details: next }));
                            }}
                            historyKey="task_subject"
                            history={data.history?.['task_subject']}
                            onSaveHistory={handleSaveHistory}
                            className="px-3 py-2 bg-[var(--bg-card)] text-sm" 
                            placeholder="بابەت..."
                          />
                        </div>
                        <div className="col-span-6 space-y-1">
                          <label className="text-[10px] font-bold text-[var(--text-muted)]">چ کارێکە؟</label>
                          <HistoryInput 
                            value={detail.work} 
                            onChange={val => {
                              const next = [...(newTask.details || [])];
                              next[idx].work = val;
                              setNewTask(p => ({ ...p, details: next }));
                            }}
                            historyKey="task_work"
                            history={data.history?.['task_work']}
                            onSaveHistory={handleSaveHistory}
                            className="px-3 py-2 bg-[var(--bg-card)] text-sm" 
                            placeholder="وەسفی کارەکە..."
                          />
                        </div>
                        <div className="col-span-1 pt-6">
                          {idx > 0 && (
                            <button 
                              onClick={() => setNewTask(p => ({ ...p, details: (p.details || []).filter((_, i) => i !== idx) }))}
                              className="text-red-400 hover:text-red-600 transition-colors"
                            >
                              <Plus className="w-5 h-5 rotate-45" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => setNewTask(p => ({ ...p, details: [...(p.details || []), { subject: '', work: '' }] }))}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all active:scale-95 border-2 border-dashed border-blue-200 dark:border-blue-800"
                  >
                    <Plus className="w-5 h-5" /> زیادکردنی بابەت
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-[var(--text-muted)] mr-1">بەروار</label>
                    <input type="date" value={newTask.date || ''} onChange={e => setNewTask(p => ({ ...p, date: e.target.value }))} className="w-full px-4 py-3 bg-[var(--bg-main)] dark:bg-slate-800/50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-[var(--text-main)]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-[var(--text-muted)] mr-1">کاتی کۆتایی</label>
                    <input type="date" value={newTask.dueDate || ''} onChange={e => setNewTask(p => ({ ...p, dueDate: e.target.value }))} className="w-full px-4 py-3 bg-[var(--bg-main)] dark:bg-slate-800/50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-[var(--text-main)]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-[var(--text-muted)] mr-1">گرنگی</label>
                    <select value={newTask.priority || 'low'} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value as any }))} className="w-full px-4 py-3 bg-[var(--bg-main)] dark:bg-slate-800/50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold appearance-none text-sm text-[var(--text-main)]">
                      <option value="low">ئاسایی</option>
                      <option value="medium">ناوەند</option>
                      <option value="high">گرنگ</option>
                    </select>
                  </div>
                </div>
                <Button className="w-full py-5 rounded-3xl text-lg" onClick={addTask}>تۆمارکردنی ئیش</Button>
              </div>
            </motion.div>
          </div>
        )}

        {showTransactionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => {
              setShowTransactionModal(false);
              sessionStorage.removeItem('pending_transaction');
              sessionStorage.removeItem('show_transaction_modal');
            }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-[var(--bg-card)] rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)] shrink-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black text-[var(--text-main)]">تۆماری دارایی</h3>
                  <button 
                    onClick={() => setShowReceiptScanner(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-black hover:bg-blue-100 transition-all active:scale-95"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    سکانکردنی وەسڵ
                  </button>
                </div>
                <button onClick={() => {
                  setShowTransactionModal(false);
                  sessionStorage.removeItem('pending_transaction');
                  sessionStorage.removeItem('show_transaction_modal');
                }} className="p-2 hover:bg-[var(--bg-main)] rounded-full transition-colors"><Plus className="w-6 h-6 rotate-45" /></button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto kurdish-font">
                <div className="flex bg-[var(--bg-main)] p-1.5 rounded-2xl shrink-0">
                  <button onClick={() => setNewTransaction(p => ({ ...p, type: 'income' }))} className={cn("flex-1 py-3 rounded-xl font-black transition-all", newTransaction.type === 'income' ? "bg-[var(--bg-card)] text-green-600 shadow-sm" : "text-[var(--text-muted)]")}>داهات</button>
                  <button onClick={() => setNewTransaction(p => ({ ...p, type: 'expense' }))} className={cn("flex-1 py-3 rounded-xl font-black transition-all", newTransaction.type === 'expense' ? "bg-[var(--bg-card)] text-red-600 shadow-sm" : "text-[var(--text-muted)]")}>خەرجی</button>
                  <button onClick={() => setNewTransaction(p => ({ ...p, type: 'savings' }))} className={cn("flex-1 py-3 rounded-xl font-black transition-all", newTransaction.type === 'savings' ? "bg-[var(--bg-card)] text-blue-600 shadow-sm" : "text-[var(--text-muted)]")}>هەڵگرتن</button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-[var(--text-muted)] mr-1">وەسف</label>
                  <HistoryInput 
                    value={newTransaction.description || ''} 
                    onChange={val => setNewTransaction(p => ({ ...p, description: val }))} 
                    historyKey="transaction_description"
                    history={[...(data.descriptions || []), ...(data.history?.['transaction_description'] || [])]}
                    onSaveHistory={handleSaveHistory}
                    placeholder="بۆچییە؟" 
                  />
                  {newTransaction.category === 'personal' && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(data.descriptions || []).slice(0, 12).map((d, i) => (
                        <button 
                          key={i}
                          onClick={() => setNewTransaction(p => ({ ...p, description: d }))}
                          className="text-[10px] font-bold bg-[var(--bg-main)] hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 px-2 py-1 rounded-lg transition-colors text-[var(--text-main)]"
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className={cn("space-y-2", (!['بەنزین'].includes(newTransaction.description || '') && newTransaction.type === 'expense') && "hidden")}>
                  <label className="text-sm font-black text-[var(--text-muted)] mr-1">بڕ (دینار)</label>
                  <FormattedNumberInput 
                    value={newTransaction.description === 'بەنزین' ? (Number(newTransaction.fuelLiters || 0) * Number(newTransaction.fuelPricePerLiter || 0)) : (newTransaction.amount || '')} 
                    onChange={val => setNewTransaction(p => ({ ...p, amount: val }))} 
                    disabled={newTransaction.description === 'بەنزین'}
                    className={cn(
                      "w-full px-6 py-6 bg-[var(--bg-main)] border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-3xl text-center text-[var(--text-main)]",
                      newTransaction.description === 'بەنزین' && "opacity-50"
                    )} 
                    placeholder="0"
                  />
                  {newTransaction.description === 'بەنزین' && (
                    <p className="text-center text-[10px] font-bold text-blue-600 mt-1">کۆی گشتی بەپێی لیتر و نرخ حیساب دەکرێت</p>
                  )}
                </div>

                {newTransaction.type === 'savings' && (
                  <div className="space-y-2">
                    <label className="text-sm font-black text-[var(--text-muted)] mr-1">کاریگەری لەسەر کۆی گشتی باڵانس</label>
                    <div className="flex bg-[var(--bg-main)] p-1.5 rounded-2xl">
                      <button 
                        onClick={() => setNewTransaction(p => ({ ...p, savingsEffect: 'none' }))} 
                        className={cn("flex-1 py-3 rounded-xl font-bold text-sm transition-all", (newTransaction.savingsEffect === 'none' || !newTransaction.savingsEffect) ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm" : "text-[var(--text-muted)]")}
                      >
                        بێ کاریگەر
                      </button>
                      <button 
                        onClick={() => setNewTransaction(p => ({ ...p, savingsEffect: 'subtract' }))} 
                        className={cn("flex-1 py-3 rounded-xl font-bold text-sm transition-all", newTransaction.savingsEffect === 'subtract' ? "bg-[var(--bg-card)] text-red-600 shadow-sm" : "text-[var(--text-muted)]")}
                      >
                        کەمکردن
                      </button>
                      <button 
                        onClick={() => setNewTransaction(p => ({ ...p, savingsEffect: 'add' }))} 
                        className={cn("flex-1 py-3 rounded-xl font-bold text-sm transition-all", newTransaction.savingsEffect === 'add' ? "bg-[var(--bg-card)] text-green-600 shadow-sm" : "text-[var(--text-muted)]")}
                      >
                        زیادکردن
                      </button>
                    </div>
                  </div>
                )}

                {/* Specific Fields for Delivery/Driver */}
                {newTransaction.description === 'سایەقی' && (
                  <div className="space-y-4 bg-[var(--bg-main)] p-5 rounded-3xl border border-[var(--border-color)]">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-[var(--text-muted)] mr-1">ناوی کڕیار</label>
                        <HistoryInput 
                          value={newTransaction.customerName || ''} 
                          onChange={val => setNewTransaction(p => ({ ...p, customerName: val }))} 
                          historyKey="transaction_customer"
                          history={data.history?.['transaction_customer']}
                          onSaveHistory={handleSaveHistory}
                          className="px-4 py-3 bg-[var(--bg-card)] text-sm rounded-2xl border-none shadow-sm" 
                          placeholder="کڕیار..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-[var(--text-muted)] mr-1">ژمارەی قایمە</label>
                        <input 
                          type="text" 
                          value={newTransaction.invoiceNumber || ''} 
                          onChange={e => setNewTransaction(p => ({ ...p, invoiceNumber: e.target.value }))} 
                          className="w-full px-4 py-3 bg-[var(--bg-card)] border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-[var(--text-main)] shadow-sm" 
                          placeholder="0000"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[var(--text-muted)] mr-1">ناوی سایەق</label>
                      <HistoryInput 
                        value={newTransaction.driverName || ''} 
                        onChange={val => setNewTransaction(p => ({ ...p, driverName: val }))} 
                        historyKey="transaction_driver"
                        history={data.history?.['transaction_driver']}
                        onSaveHistory={handleSaveHistory}
                        className="px-4 py-3 bg-[var(--bg-card)] text-sm rounded-2xl border-none shadow-sm" 
                        placeholder="سایەق..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-[var(--text-muted)] mr-1">کۆی گشتی (دینار)</label>
                        <FormattedNumberInput 
                          value={newTransaction.amount || ''} 
                          onChange={val => setNewTransaction(p => ({ ...p, amount: val }))} 
                          className="w-full px-4 py-3 bg-[var(--bg-card)] border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-[var(--text-main)] shadow-sm" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-[var(--text-muted)] mr-1">داشکاندن</label>
                        <FormattedNumberInput 
                          value={newTransaction.discount || ''} 
                          onChange={val => setNewTransaction(p => ({ ...p, discount: val }))} 
                          className="w-full px-4 py-3 bg-[var(--bg-card)] border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-[var(--text-main)] shadow-sm" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-[var(--text-muted)] mr-1">وەرگیراو (پارەی دراو)</label>
                        <FormattedNumberInput 
                          value={newTransaction.paidAmount || ''} 
                          onChange={val => setNewTransaction(p => ({ ...p, paidAmount: val }))} 
                          className="w-full px-4 py-3 bg-[var(--bg-card)] border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-[var(--text-main)] shadow-sm" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-[var(--text-muted)] mr-1">ماوە</label>
                        <FormattedNumberInput 
                          value={newTransaction.remainingAmount || (Number(newTransaction.amount || 0) - Number(newTransaction.discount || 0) - Number(newTransaction.paidAmount || 0))} 
                          onChange={val => setNewTransaction(p => ({ ...p, remainingAmount: val }))} 
                          className="w-full px-4 py-2 bg-[var(--bg-card)] border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-[var(--text-main)]" 
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[var(--text-muted)] mr-1">قەرز</label>
                      <FormattedNumberInput 
                        value={newTransaction.debtAmount || ''} 
                        onChange={val => setNewTransaction(p => ({ ...p, debtAmount: val }))} 
                        className="w-full px-4 py-2 bg-[var(--bg-card)] border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-red-600" 
                      />
                    </div>

                    {newTransaction.receiptItems && newTransaction.receiptItems.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <label className="text-[10px] font-black text-[var(--text-muted)] mr-1">بابەتەکان</label>
                        <div className="bg-[var(--bg-card)] rounded-xl overflow-hidden border border-[var(--border-color)]">
                          <table className="w-full text-[10px]">
                            <thead className="bg-[var(--bg-main)] text-[var(--text-muted)]">
                              <tr>
                                <th className="px-3 py-2 text-right">بابەت</th>
                                <th className="px-3 py-2 text-center">عدد</th>
                                <th className="px-3 py-2 text-center">نرخ</th>
                                <th className="px-3 py-2 text-left">کۆ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {newTransaction.receiptItems.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="px-3 py-2 font-bold">{item.name}</td>
                                  <td className="px-3 py-2 text-center">{item.quantity || '-'}</td>
                                  <td className="px-3 py-2 text-center">{(item.unitPrice || item.price).toLocaleString()}</td>
                                  <td className="px-3 py-2 text-left font-bold">{item.price.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[var(--text-muted)] mr-1">بڕ (دینار)</label>
                      <FormattedNumberInput 
                        value={newTransaction.amount || ''} 
                        onChange={val => setNewTransaction(p => ({ ...p, amount: val }))} 
                        className="w-full px-4 py-2 bg-[var(--bg-card)] border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-[var(--text-main)]" 
                        placeholder="0"
                      />
                    </div>

                    {/* Camera Capture */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[var(--text-muted)] mr-1">وێنەی وەسڵ</label>
                      <div className="flex gap-2">
                        <label className="flex-1 flex items-center justify-center gap-2 py-4 bg-[var(--bg-card)] border-2 border-dashed border-[var(--border-color)] rounded-2xl cursor-pointer hover:bg-[var(--bg-main)] transition-all">
                          <Camera className="w-5 h-5 text-[var(--text-muted)]" />
                          <span className="text-xs font-bold text-[var(--text-muted)]">گرتنی وێنە</span>
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageCapture} />
                        </label>
                        <label className="flex-1 flex items-center justify-center gap-2 py-4 bg-[var(--bg-card)] border-2 border-dashed border-[var(--border-color)] rounded-2xl cursor-pointer hover:bg-[var(--bg-main)] transition-all">
                          <ImageIcon className="w-5 h-5 text-[var(--text-muted)]" />
                          <span className="text-xs font-bold text-[var(--text-muted)]">لە گەلەری</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageCapture} />
                        </label>
                      </div>
                      {newTransaction.receiptImage && (
                        <div className="space-y-2">
                          <button 
                            type="button"
                            onClick={handleScanReceipt}
                            disabled={isScanning}
                            className={cn(
                              "w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all active:scale-95",
                              isScanning ? "bg-[var(--bg-main)] text-[var(--text-muted)] cursor-not-allowed" : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200"
                            )}
                          >
                            {isScanning ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>لە پشکنیندایە...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-5 h-5" />
                                <span>پڕکردنەوەی زانیاری بە ژیری دەستکرد</span>
                              </>
                            )}
                          </button>
                          <div className="relative rounded-2xl overflow-hidden border border-[var(--border-color)]">
                            <img src={newTransaction.receiptImage} alt="Receipt" className="w-full h-48 object-cover" />
                            <button 
                              onClick={() => setNewTransaction(p => ({ ...p, receiptImage: '' }))}
                              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg"
                            >
                              <Plus className="w-4 h-4 rotate-45" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Specific Fields for Fuel */}
                {newTransaction.description === 'بەنزین' && (
                  <div className="space-y-4 bg-[var(--bg-main)] p-5 rounded-2xl">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-[var(--text-muted)] mr-1">بڕی لیتر</label>
                        <FormattedNumberInput 
                          value={newTransaction.fuelLiters || ''} 
                          onChange={val => setNewTransaction(p => ({ ...p, fuelLiters: val }))} 
                          className="w-full px-4 py-2 bg-[var(--bg-card)] border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-[var(--text-main)]" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-[var(--text-muted)] mr-1">نرخی لیتر</label>
                        <FormattedNumberInput 
                          value={newTransaction.fuelPricePerLiter || ''} 
                          onChange={val => setNewTransaction(p => ({ ...p, fuelPricePerLiter: val }))} 
                          className="w-full px-4 py-2 bg-[var(--bg-card)] border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-[var(--text-main)]" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[var(--text-muted)] mr-1">جۆری سوتەمەنی</label>
                      <div className="grid grid-cols-4 gap-1">
                        {['بەنزین', 'گاز', 'خاز', 'نەفت'].map(type => (
                          <button
                            key={type}
                            onClick={() => setNewTransaction(p => ({ ...p, fuelType: type as any }))}
                            className={cn(
                              "py-1.5 rounded-lg text-[10px] font-bold transition-all border-2",
                              newTransaction.fuelType === type ? "bg-blue-600 border-blue-600 text-white" : "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)]"
                            )}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Specific Fields for General Expense */}
                {(!['بەنزین'].includes(newTransaction.description || '') && newTransaction.type === 'expense') && (
                  <div className="space-y-3 bg-[var(--bg-main)] p-5 rounded-2xl">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[var(--text-muted)] mr-1">ناوی شوێن</label>
                      <HistoryInput 
                        value={newTransaction.shopName || ''} 
                        onChange={val => setNewTransaction(p => ({ ...p, shopName: val }))} 
                        historyKey="transaction_shop"
                        history={data.history?.['transaction_shop']}
                        onSaveHistory={handleSaveHistory}
                        className="px-4 py-2 bg-[var(--bg-card)] text-sm text-[var(--text-main)]" 
                        placeholder="شوێنەکە لەکوێیە؟"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-black text-[var(--text-muted)] mr-1">وەسڵ (بابەت و نرخ)</label>
                      <div className="space-y-3">
                        {(newTransaction.receiptItems || []).map((item, index) => (
                          <div key={index} className="flex gap-2 items-center bg-[var(--bg-card)] p-2 rounded-2xl border border-[var(--border-color)] shadow-sm">
                            <div className="flex-1 space-y-1">
                              <label className="text-[10px] font-black text-[var(--text-muted)] mr-1">بابەت</label>
                              <HistoryInput 
                                value={item.name || ''} 
                                onChange={val => {
                                  const next = [...(newTransaction.receiptItems || [])];
                                  next[index].name = val;
                                  setNewTransaction(p => ({ ...p, receiptItems: next }));
                                }}
                                historyKey="transaction_receipt_item"
                                history={data.history?.['transaction_receipt_item']}
                                onSaveHistory={handleSaveHistory}
                                className="px-3 py-2 bg-[var(--bg-card)] text-xs text-[var(--text-main)]" 
                                placeholder="ناوی بابەت" 
                              />
                            </div>
                            <div className="w-20 space-y-1">
                              <label className="text-[10px] font-black text-[var(--text-muted)] mr-1">نرخ</label>
                              <FormattedNumberInput 
                                placeholder="نرخ" 
                                value={item.unitPrice || item.price || ''} 
                                onChange={val => {
                                  const next = [...(newTransaction.receiptItems || [])];
                                  next[index].unitPrice = val;
                                  next[index].price = val * (next[index].quantity || 1);
                                  setNewTransaction(p => ({ ...p, receiptItems: next }));
                                }}
                                className="w-full px-2 py-2 bg-[var(--bg-card)] border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs text-[var(--text-main)]" 
                              />
                            </div>
                            <div className="w-14 space-y-1">
                              <label className="text-[10px] font-black text-[var(--text-muted)] mr-1">دانە</label>
                              <input 
                                type="number"
                                value={item.quantity || 1} 
                                onChange={e => {
                                  const next = [...(newTransaction.receiptItems || [])];
                                  const qty = parseInt(e.target.value) || 1;
                                  next[index].quantity = qty;
                                  next[index].price = (next[index].unitPrice || next[index].price) * qty;
                                  setNewTransaction(p => ({ ...p, receiptItems: next }));
                                }}
                                className="w-full px-2 py-2 bg-[var(--bg-card)] border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs text-[var(--text-main)] text-center" 
                              />
                            </div>
                            {index > 0 && (
                              <button 
                                onClick={() => {
                                  const next = (newTransaction.receiptItems || []).filter((_, i) => i !== index);
                                  setNewTransaction(p => ({ ...p, receiptItems: next }));
                                }}
                                className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                              >
                                <Plus className="w-4 h-4 rotate-45" />
                              </button>
                            )}
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setNewTransaction(p => ({ ...p, receiptItems: [...(p.receiptItems || []), { name: '', price: 0 }] }))}
                            className="flex-1 py-3 border-2 border-dashed border-[var(--border-color)] rounded-2xl text-[var(--text-muted)] font-bold text-sm hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" /> زیادکردنی بابەت
                          </button>
                          <button 
                            onClick={() => setShowBarcodeScanner(true)}
                            className="flex-1 py-3 border-2 border-dashed border-[var(--border-color)] rounded-2xl text-[var(--text-muted)] font-bold text-sm hover:border-green-400 hover:text-green-500 transition-all flex items-center justify-center gap-2"
                          >
                            <Camera className="w-4 h-4" /> سکانی بارکۆد
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-5 bg-blue-600 rounded-[2rem] text-white flex justify-between items-center shadow-lg shadow-blue-100">
                        <span className="font-black">کۆی گشتی:</span>
                        <span className="text-2xl font-black">
                          {(newTransaction.receiptItems || []).reduce((acc, item) => acc + (Number(item.price) || 0), 0).toLocaleString()} <span className="text-sm font-normal">دینار</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 shrink-0">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-[var(--text-muted)] mr-1">شێوازی پارەدان</label>
                    <select value={newTransaction.paymentMethod || 'cash'} onChange={e => setNewTransaction(p => ({ ...p, paymentMethod: e.target.value as any }))} className="w-full px-6 py-4 bg-[var(--bg-main)] dark:bg-slate-800/50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold appearance-none text-[var(--text-main)]">
                      <option value="cash">کاش</option>
                      <option value="own_money">پارەی خۆم</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-[var(--text-muted)] mr-1">بەروار</label>
                    <input type="date" value={newTransaction.date || ''} onChange={e => setNewTransaction(p => ({ ...p, date: e.target.value }))} className="w-full px-6 py-4 bg-[var(--bg-main)] dark:bg-slate-800/50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-[var(--text-main)]" />
                  </div>
                </div>
                <Button className="w-full py-5 rounded-3xl text-lg shrink-0" onClick={addTransaction}>تۆمارکردن</Button>
              </div>
            </motion.div>
          </div>
        )}
        {showWishlistModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowWishlistModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-[var(--bg-card)] rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)] shrink-0">
                <h3 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                  {editingWishlistId ? 'دەستکاری پێداویستی' : 'پێداویستی نوێ'}
                </h3>
                <button onClick={() => setShowWishlistModal(false)} className="p-2 hover:bg-[var(--bg-main)] rounded-full transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-[var(--text-muted)]" />
                </button>
              </div>
              <div className="p-8 space-y-6 overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-sm font-black text-[var(--text-muted)] mr-1">ناوی پێداویستی</label>
                  <input 
                    type="text" 
                    placeholder="نموونە: سەرە شەحن، غاز..." 
                    value={newWishlistItem.title || ''} 
                    onChange={e => setNewWishlistItem(p => ({ ...p, title: e.target.value }))} 
                    className="w-full px-6 py-4 bg-[var(--bg-main)] border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg text-[var(--text-main)]" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-[var(--text-muted)] mr-1">تێبینی (ئارەزوومەندانە)</label>
                  <textarea 
                    placeholder="هەر زانیارییەکی تر..." 
                    value={newWishlistItem.notes || ''} 
                    onChange={e => setNewWishlistItem(p => ({ ...p, notes: e.target.value }))} 
                    className="w-full px-6 py-4 bg-[var(--bg-main)] border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-[var(--text-main)] resize-none" 
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-[var(--text-muted)] mr-1">نرخی خەمڵێنراو (ئارەزوومەندانە)</label>
                  <div className="relative">
                    <FormattedNumberInput 
                      placeholder="0" 
                      value={newWishlistItem.estimatedPrice || ''} 
                      onChange={val => setNewWishlistItem(p => ({ ...p, estimatedPrice: val }))} 
                      className="w-full px-6 py-4 bg-[var(--bg-main)] border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xl text-left text-[var(--text-main)]" 
                      dir="ltr"
                    />
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-bold">د.ع</span>
                  </div>
                </div>
                <Button className="w-full py-5 rounded-3xl text-lg shrink-0" onClick={addWishlistItem}>تۆمارکردن</Button>
              </div>
            </motion.div>
          </div>
        )}

        {showDebtModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDebtModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-[var(--bg-card)] rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)] shrink-0">
                <h3 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-3">
                  <CreditCard className="w-8 h-8 text-blue-600" />
                  {editingDebtId ? 'دەستکاری قەرز' : 'قەرزی نوێ'}
                </h3>
                <button onClick={() => setShowDebtModal(false)} className="p-2 hover:bg-[var(--bg-main)] rounded-full transition-colors"><Plus className="w-6 h-6 rotate-45" /></button>
              </div>
              <div className="p-8 space-y-6 overflow-y-auto flex-1">
                <div className="flex gap-2 bg-[var(--bg-card)] p-1 rounded-2xl border border-[var(--border-color)]">
                  <button
                    onClick={() => setNewDebt(p => ({ ...p, type: 'owed' }))}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-bold transition-all",
                      newDebt.type === 'owed' ? "bg-red-600 text-white shadow-md" : "text-[var(--text-muted)] hover:bg-[var(--bg-main)]"
                    )}
                  >
                    قەرزارم
                  </button>
                  <button
                    onClick={() => setNewDebt(p => ({ ...p, type: 'owing' }))}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-bold transition-all",
                      newDebt.type === 'owing' ? "bg-green-600 text-white shadow-md" : "text-[var(--text-muted)] hover:bg-[var(--bg-main)]"
                    )}
                  >
                    قەرزم لایە
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-[var(--text-muted)] mr-1">ناوی کەسەکە</label>
                  <HistoryInput 
                    value={newDebt.personName || ''} 
                    onChange={val => setNewDebt(p => ({ ...p, personName: val }))} 
                    historyKey="debt_person"
                    history={data.history?.['debt_person']}
                    onSaveHistory={handleSaveHistory}
                    placeholder="ناوی کەسەکە..." 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-[var(--text-muted)] mr-1">بڕی پارە (دینار)</label>
                  <FormattedNumberInput value={newDebt.amount || ''} onChange={val => setNewDebt(p => ({ ...p, amount: val }))} className="w-full px-6 py-4 bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-[var(--text-muted)] mr-1">تێبینی (ئارەزوومەندانە)</label>
                  <textarea value={newDebt.notes || ''} onChange={e => setNewDebt(p => ({ ...p, notes: e.target.value }))} className="w-full px-6 py-4 bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold min-h-[100px]" placeholder="تێبینی..." />
                </div>
              </div>
              <div className="p-8 border-t border-[var(--border-color)] bg-[var(--bg-main)] shrink-0">
                <Button className="w-full py-5 rounded-3xl text-lg shrink-0" onClick={addDebt}>تۆمارکردن</Button>
              </div>
            </motion.div>
          </div>
        )}

        {showWithdrawModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowWithdrawModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-[var(--bg-card)] rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-8 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)]">
                <h3 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-3">
                  <ArrowDownToLine className="w-6 h-6 text-yellow-600" />
                  ڕاکێشانی پارە
                </h3>
                <button onClick={() => setShowWithdrawModal(false)} className="p-2 hover:bg-[var(--bg-main)] rounded-full transition-colors"><Plus className="w-6 h-6 rotate-45" /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-[var(--text-muted)] mr-1">بڕی پارە (دینار)</label>
                  <FormattedNumberInput 
                    value={withdrawAmount || ''} 
                    onChange={val => setWithdrawAmount(val)} 
                    className="w-full px-6 py-4 bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" 
                    placeholder="0" 
                  />
                </div>
                <Button className="w-full py-5 rounded-3xl text-lg" onClick={handleWithdrawSavings}>ڕاکێشان</Button>
              </div>
            </motion.div>
          </div>
        )}

        {showBarcodeScanner && (
          <BarcodeScanner 
            onScan={handleBarcodeScan} 
            onClose={() => setShowBarcodeScanner(false)} 
          />
        )}

        {showReceiptScanner && (
          <ReceiptScanner 
            onScanComplete={(result) => {
              setNewTransaction(prev => ({
                ...prev,
                description: result.shopName || prev.description,
                amount: result.totalAmount || prev.amount,
                customerName: result.customerName || prev.customerName,
                invoiceNumber: result.invoiceNumber || prev.invoiceNumber,
                date: result.date || prev.date,
                receiptItems: (result.items || []).map((item: any) => ({
                  ...item,
                  quantity: item.quantity || 1,
                  unitPrice: item.unitPrice || item.price,
                  price: item.price || (item.unitPrice * (item.quantity || 1))
                })),
                receiptImage: result.receiptImage || prev.receiptImage
              }));
              setShowReceiptScanner(false);
            }}
            onClose={() => setShowReceiptScanner(false)}
          />
        )}

        {scannedBarcode && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setScannedBarcode(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-[var(--bg-card)] rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-8 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)]">
                <h3 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-3">
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
                  کاڵای نوێ
                </h3>
                <button onClick={() => setScannedBarcode(null)} className="p-2 hover:bg-[var(--bg-main)] rounded-full transition-colors"><Plus className="w-6 h-6 rotate-45" /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-[var(--text-muted)] mr-1">ناوی کاڵا</label>
                  <input 
                    type="text"
                    value={newProduct.name} 
                    onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} 
                    className="w-full px-6 py-4 bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" 
                    placeholder="ناوی کاڵا بنووسە..." 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-[var(--text-muted)] mr-1">نرخ (دینار)</label>
                    <FormattedNumberInput 
                      value={newProduct.price || ''} 
                      onChange={val => setNewProduct(p => ({ ...p, price: val }))} 
                      className="w-full px-6 py-4 bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" 
                      placeholder="0" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-[var(--text-muted)] mr-1">دانە (عدد)</label>
                    <input 
                      type="number"
                      value={newProduct.quantity} 
                      onChange={e => setNewProduct(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} 
                      className="w-full px-6 py-4 bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" 
                      placeholder="1" 
                    />
                  </div>
                </div>
                <Button className="w-full py-5 rounded-3xl text-lg" onClick={handleSaveNewProduct}>پاشەکەوتکردن</Button>
              </div>
            </motion.div>
          </div>
        )}

        {showSavingsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSavingsModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-[var(--bg-card)] rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)] shrink-0">
                <h3 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-3">
                  <PiggyBank className="w-8 h-8 text-green-600" />
                  {editingSavingsId ? 'دەستکاری ئامانج' : 'ئامانجی نوێ'}
                </h3>
                <button onClick={() => setShowSavingsModal(false)} className="p-2 hover:bg-[var(--bg-main)] rounded-full transition-colors"><Plus className="w-6 h-6 rotate-45" /></button>
              </div>
              <div className="p-8 space-y-6 overflow-y-auto flex-1">
                <div className="space-y-2">
                  <label className="text-sm font-black text-[var(--text-muted)] mr-1">ناوی ئامانج</label>
                  <HistoryInput 
                    value={newSavings.title || ''} 
                    onChange={val => setNewSavings(p => ({ ...p, title: val }))} 
                    historyKey="savings_title"
                    history={data.history?.['savings_title']}
                    onSaveHistory={handleSaveHistory}
                    placeholder="بۆ نموونە: کڕینی ئۆتۆمبێل..." 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-[var(--text-muted)] mr-1">بڕی ئامانج (دینار)</label>
                  <FormattedNumberInput value={newSavings.targetAmount || ''} onChange={val => setNewSavings(p => ({ ...p, targetAmount: val }))} className="w-full px-6 py-4 bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-[var(--text-muted)] mr-1">بڕی کۆکراوەی ئێستا (دینار)</label>
                  <FormattedNumberInput value={newSavings.currentAmount || ''} onChange={val => setNewSavings(p => ({ ...p, currentAmount: val }))} className="w-full px-6 py-4 bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="0" />
                </div>
              </div>
              <div className="p-8 border-t border-[var(--border-color)] bg-[var(--bg-main)] shrink-0">
                <Button className="w-full py-5 rounded-3xl text-lg shrink-0" onClick={addSavingsGoal}>تۆمارکردن</Button>
              </div>
            </motion.div>
          </div>
        )}
        {showResetModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowResetModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-[var(--bg-card)] rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[var(--text-main)]">ئایا دڵنیایت؟</h3>
                  <p className="text-[var(--text-muted)] font-bold mt-2">هەموو داتاکانی سیستەم بەیەکجار رەشدەکرێنەوە و ناگەڕێنەوە.</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button variant="danger" className="w-full py-4 rounded-2xl text-lg" onClick={resetAllData}>بەڵێ، هەمووی رەش بکەرەوە</Button>
                  <Button variant="ghost" className="w-full py-4 rounded-2xl text-lg" onClick={() => setShowResetModal(false)}>پاشگەزبوونەوە</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
