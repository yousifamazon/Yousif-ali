export type TaskDetail = {
  id: string;
  subject: string;
  work: string;
};

export type Task = {
  id: string;
  title: string;
  description?: string; // Keep for backward compatibility if needed, but we'll use details
  details?: TaskDetail[];
  date: string;
  completed: boolean;
  category: 'work' | 'personal' | 'other';
  priority: 'low' | 'medium' | 'high';
  workTypes?: string[]; // e.g., ['سایەقی', 'کارەبا']
  dueDate?: string;
};

export type ReceiptItem = {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  unitPrice?: number;
};

export type Transaction = {
  id: string;
  type: 'income' | 'expense' | 'savings';
  amount: number;
  category: 'work' | 'personal';
  description: string;
  date: string;
  subCategory?: string;
  paymentMethod?: 'cash' | 'factory_money' | 'own_money';
  milkQuantity?: number;
  // Fuel specific
  fuelLiters?: number;
  fuelPricePerLiter?: number;
  fuelType?: 'بەنزین' | 'گاز' | 'خاز' | 'نەفت';
  // Maintenance/Work specific
  workLocation?: string;
  shopName?: string;
  itemsBought?: string;
  maintenanceType?: 'سیانەی ناو کارگە' | 'ئیشی کارەبا';
  receiptItems?: ReceiptItem[];
  // Delivery/Driver specific
  driverName?: string;
  customerName?: string;
  invoiceNumber?: string;
  receiptImage?: string;
  isDelivery?: boolean;
  discount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  debtAmount?: number;
  savingsEffect?: 'add' | 'subtract' | 'none';
  createdAt?: string;
};

export type Debt = {
  id: string;
  personName: string;
  amount: number;
  type: 'owed' | 'owing'; // 'owed' = I owe them, 'owing' = they owe me
  date: string;
  notes?: string;
  completed: boolean;
};

export type SavingsGoal = {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  notes?: string;
  createdAt: string;
};

export type WishlistItem = {
  id: string;
  title: string;
  notes?: string;
  estimatedPrice?: number;
  createdAt: string;
  completed: boolean;
  type?: 'general' | 'private';
};

export type Product = {
  id: string;
  barcode: string;
  name: string;
  price: number;
  createdAt: string;
};

export type MaintenanceItem = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type MaintenanceInvoice = {
  id: string;
  invoiceNumber: string;
  title?: string;
  date: string;
  customerName: string;
  mobile: string;
  deviceInfo: string;
  items: MaintenanceItem[];
  totalAmount: number;
  discount: number;
  totalAfterDiscount: number;
  cashPaid: number;
  debtAmount: number;
  remainingBalance: number;
  technicianName: string;
  warranty: string;
  notes: string;
  receivedFromFactory: number;
  factoryOwesMe: number;
  iOweFactory: number;
  createdAt: string;
  userId?: string;
};

export type AppData = {
  tasks: Task[];
  transactions: Transaction[];
  wishlist?: WishlistItem[];
  debts?: Debt[];
  savingsGoals?: SavingsGoal[];
  products?: Product[];
  maintenanceInvoices?: MaintenanceInvoice[];
  descriptions: string[];
  history?: Record<string, string[]>;
  customTabs?: string[];
};
