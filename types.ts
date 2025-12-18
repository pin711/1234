
export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface BankAccount {
  id: string;
  name: string;
  balance: number;
  bankName: string;
  color: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  note: string;
  date: string;
  createdAt: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: '餐飲飲食', icon: 'Utensils', color: '#ef4444' },
  { id: 'cat-2', name: '交通運輸', icon: 'Bus', color: '#3b82f6' },
  { id: 'cat-3', name: '薪資收入', icon: 'Wallet', color: '#10b981' },
  { id: 'cat-4', name: '購物娛樂', icon: 'ShoppingBag', color: '#f59e0b' },
  { id: 'cat-5', name: '居住規費', icon: 'Home', color: '#8b5cf6' },
  { id: 'cat-6', name: '其他支出', icon: 'MoreHorizontal', color: '#64748b' },
];
