import { AppData, Task, Transaction } from "../types";
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
  const defaultData: AppData = { tasks: [], transactions: [], descriptions: defaultDescriptions, history: {} };
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
    const createdAt = existingDoc.exists() ? existingDoc.data().createdAt : (transaction.date + 'T00:00:00Z');

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

export const syncSettingsToFirebase = async (descriptions: string[], history: any) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/settings/main`;
  try {
    await setDoc(doc(db, path), { descriptions, history });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};
