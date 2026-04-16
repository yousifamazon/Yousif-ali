import { AppData, Task, Transaction, MaintenanceInvoice } from "../types";
import { 
  db, 
  auth, 
  handleFirestoreError, 
  OperationType 
} from "../firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp
} from "firebase/firestore";

const STORAGE_KEY = "yousif_daily_data";

export const getStoredData = (): AppData => {
  const defaultDescriptions = [
    'بەنزین', 'دکتۆر', 'مارکێت', 'جگەرە', 'میوە', 'چاکردنەوەی سەیارە', 'کارەبا', 'کرێ', 'هێنانەوەی شیر'
  ];
  const defaultData: AppData = { 
    tasks: [], 
    transactions: [], 
    wishlist: [], 
    debts: [],
    savingsGoals: [],
    products: [],
    descriptions: defaultDescriptions, 
    history: {} 
  };
  let data = null;
  try {
    data = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    console.error("LocalStorage access denied", e);
  }
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (parsed.customCategories && !parsed.descriptions) {
        parsed.descriptions = [...defaultDescriptions, ...parsed.customCategories];
        delete parsed.customCategories;
      }
      return { ...defaultData, ...parsed };
    } catch (e) {
      console.error("Error parsing stored data", e);
    }
  }
  return defaultData;
};

export const saveToStorage = (data: AppData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const clearStorage = () => {
  localStorage.removeItem(STORAGE_KEY);
};

const removeUndefined = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => removeUndefined(item));
  }
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined) {
        newObj[key] = removeUndefined(obj[key]);
      }
    });
    return newObj;
  }
  return obj;
};

// --- Firebase Sync Helpers ---

export const syncMaintenanceInvoiceToFirebase = async (invoice: MaintenanceInvoice) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/maintenanceInvoices/${invoice.id}`;
  try {
    const docRef = doc(db, path);
    const existingDoc = await getDoc(docRef);
    
    const dataToSync = removeUndefined({
      ...invoice,
      userId: auth.currentUser.uid
    });

    if (!existingDoc.exists() || JSON.stringify(existingDoc.data()) !== JSON.stringify(dataToSync)) {
      await setDoc(docRef, dataToSync);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteMaintenanceInvoiceFromFirebase = async (id: string) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/maintenanceInvoices/${id}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const syncTaskToFirebase = async (task: Task) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/tasks/${task.id}`;
  try {
    const docRef = doc(db, path);
    const existingDoc = await getDoc(docRef);
    const createdAt = existingDoc.exists() ? existingDoc.data().createdAt : (task.date + 'T00:00:00Z');
    
    const dataToSync = removeUndefined({
      ...task,
      userId: auth.currentUser.uid,
      createdAt: createdAt
    });

    await setDoc(docRef, dataToSync);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteTaskFromFirebase = async (taskId: string) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/tasks/${taskId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const syncTransactionToFirebase = async (transaction: Transaction) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/transactions/${transaction.id}`;
  try {
    const docRef = doc(db, path);
    const existingDoc = await getDoc(docRef);
    
    let createdAt = transaction.date + 'T00:00:00Z';
    if (existingDoc.exists() && existingDoc.data().createdAt) {
      createdAt = existingDoc.data().createdAt;
    } else if (transaction.createdAt) {
      createdAt = transaction.createdAt;
    }

    const dataToSync = removeUndefined({
      ...transaction,
      userId: auth.currentUser.uid,
      createdAt: createdAt
    });

    await setDoc(docRef, dataToSync);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteTransactionFromFirebase = async (transactionId: string) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/transactions/${transactionId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const syncSettingsToFirebase = async (settings: { descriptions?: string[], history?: any, exchangeRate?: number }) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/settings/main`;
  try {
    const docRef = doc(db, path);
    const existingDoc = await getDoc(docRef);
    const existingData = existingDoc.exists() ? existingDoc.data() : {};
    await setDoc(docRef, { ...existingData, ...settings });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const syncWishlistToFirebase = async (item: any) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/wishlist/${item.id}`;
  try {
    const docRef = doc(db, path);
    const existingDoc = await getDoc(docRef);
    const createdAt = existingDoc.exists() ? existingDoc.data().createdAt : (item.createdAt || new Date().toISOString());
    
    const dataToSync = removeUndefined({
      ...item,
      userId: auth.currentUser.uid,
      createdAt: createdAt
    });

    await setDoc(docRef, dataToSync);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteWishlistFromFirebase = async (id: string) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/wishlist/${id}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const syncDebtToFirebase = async (debt: any) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/debts/${debt.id}`;
  try {
    const docRef = doc(db, path);
    const existingDoc = await getDoc(docRef);
    const createdAt = existingDoc.exists() ? existingDoc.data().createdAt : (debt.date + 'T00:00:00Z');
    
    const dataToSync = removeUndefined({
      ...debt,
      userId: auth.currentUser.uid,
      createdAt: createdAt
    });

    await setDoc(docRef, dataToSync);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteDebtFromFirebase = async (id: string) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/debts/${id}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const syncSavingsGoalToFirebase = async (goal: any) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/savingsGoals/${goal.id}`;
  try {
    const docRef = doc(db, path);
    const existingDoc = await getDoc(docRef);
    const createdAt = existingDoc.exists() ? existingDoc.data().createdAt : (goal.createdAt || new Date().toISOString());
    
    const dataToSync = removeUndefined({
      ...goal,
      userId: auth.currentUser.uid,
      createdAt: createdAt
    });

    await setDoc(docRef, dataToSync);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const syncProductToFirebase = async (product: any) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/products/${product.id}`;
  try {
    const docRef = doc(db, path);
    const existingDoc = await getDoc(docRef);
    const createdAt = existingDoc.exists() ? existingDoc.data().createdAt : (product.createdAt || new Date().toISOString());
    
    const dataToSync = removeUndefined({
      ...product,
      userId: auth.currentUser.uid,
      createdAt: createdAt
    });

    await setDoc(docRef, dataToSync);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const syncInventoryItemToFirebase = async (item: any) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/inventory/${item.id}`;
  try {
    const docRef = doc(db, path);
    const dataToSync = removeUndefined({
      ...item,
      userId: auth.currentUser.uid
    });
    await setDoc(docRef, dataToSync);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteSavingsGoalFromFirebase = async (id: string) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/savingsGoals/${id}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const syncBudgetToFirebase = async (budget: any) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/budgets/${budget.id}`;
  try {
    const docRef = doc(db, path);
    await setDoc(docRef, { ...budget, userId: auth.currentUser.uid });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteBudgetFromFirebase = async (id: string) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/budgets/${id}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const resetFirebaseData = async () => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  
  try {
    // Delete tasks
    const tasksSnapshot = await getDocs(collection(db, `users/${uid}/tasks`));
    const taskDeletions = tasksSnapshot.docs.map(doc => deleteDoc(doc.ref));
    
    // Delete transactions
    const transSnapshot = await getDocs(collection(db, `users/${uid}/transactions`));
    const transDeletions = transSnapshot.docs.map(doc => deleteDoc(doc.ref));
    
    // Delete wishlist
    const wishlistSnapshot = await getDocs(collection(db, `users/${uid}/wishlist`));
    const wishlistDeletions = wishlistSnapshot.docs.map(doc => deleteDoc(doc.ref));

    // Delete debts
    const debtsSnapshot = await getDocs(collection(db, `users/${uid}/debts`));
    const debtsDeletions = debtsSnapshot.docs.map(doc => deleteDoc(doc.ref));

    // Delete savingsGoals
    const savingsSnapshot = await getDocs(collection(db, `users/${uid}/savingsGoals`));
    const savingsDeletions = savingsSnapshot.docs.map(doc => deleteDoc(doc.ref));

    // Delete settings
    const settingsRef = doc(db, `users/${uid}/settings/main`);
    
    await Promise.all([...taskDeletions, ...transDeletions, ...wishlistDeletions, ...debtsDeletions, ...savingsDeletions, deleteDoc(settingsRef)]);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
  }
};
