
import React, { useState, useEffect } from 'react';
import { 
  Plus, LogOut, Wallet, PieChart as PieChartIcon, 
  ArrowUpCircle, ArrowDownCircle, History, 
  Trash2, Edit2, ChevronRight, LayoutDashboard,
  BrainCircuit, Loader2, Menu, X, Save
} from 'lucide-react';
// Fix: Use separate import for types and values from firebase/auth to ensure proper module resolution
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { 
  collection, query, where, onSnapshot, 
  addDoc, deleteDoc, doc, updateDoc,
  writeBatch
} from 'firebase/firestore';
import { auth, db, isOfflineMode } from './firebase';
import { 
  BankAccount, Transaction, Category, 
  DEFAULT_CATEGORIES, TransactionType 
} from './types';
import { getFinancialAdvice } from './geminiService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

// --- UI Components ---

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' }> = ({ 
  children, variant = 'primary', className = '', ...props 
}) => {
  const base = "px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-rose-500 text-white hover:bg-rose-600",
    success: "bg-emerald-500 text-white hover:bg-emerald-600",
    ghost: "text-slate-500 hover:bg-slate-100"
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props}>{children}</button>;
};

const Card: React.FC<{ children: React.ReactNode, title?: string, className?: string, action?: React.ReactNode }> = ({ children, title, className = "", action }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-100 p-6 ${className}`}>
    {(title || action) && (
      <div className="flex justify-between items-center mb-4">
        {title && <h3 className="text-lg font-semibold text-slate-800">{title}</h3>}
        {action}
      </div>
    )}
    {children}
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'transactions' | 'reports'>('dashboard');

  // Auth Logic with strict guards for Firebase auth instance
  useEffect(() => {
    if (isOfflineMode || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u as User | null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Syncing with strict DB guards for Firestore instance
  useEffect(() => {
    if (isOfflineMode || !user || !db) {
      // 離線/展示模式下的預設數據
      if (user) {
        setAccounts([
          { id: 'm1', name: '展示現金', bankName: '我的錢包', balance: 5000, color: '#6366f1' },
          { id: 'm2', name: '展示銀行', bankName: '國泰世華', balance: 120000, color: '#10b981' }
        ]);
        setTransactions([
          { id: 't1', accountId: 'm1', amount: 150, type: 'expense', categoryId: 'cat-1', note: '範例：午餐便當', date: new Date().toISOString().split('T')[0], createdAt: Date.now() },
          { id: 't2', accountId: 'm2', amount: 35000, type: 'income', categoryId: 'cat-3', note: '範例：本月薪資', date: new Date().toISOString().split('T')[0], createdAt: Date.now() - 1000 }
        ]);
      } else {
        setAccounts([]);
        setTransactions([]);
      }
      return;
    }

    // 嚴格型別守衛：確保 db 實例存在才進行 Firestore 操作
    const accountsRef = collection(db, 'accounts');
    const transactionsRef = collection(db, 'transactions');

    const qAcc = query(accountsRef, where('userId', '==', user.uid));
    const unsubAcc = onSnapshot(qAcc, (snap) => {
      setAccounts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankAccount)));
    });

    const qTrans = query(transactionsRef, where('userId', '==', user.uid));
    const unsubTrans = onSnapshot(qTrans, (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction))
        .sort((a, b) => b.createdAt - a.createdAt));
    });

    return () => { unsubAcc(); unsubTrans(); };
  }, [user]);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
      <p className="text-slate-400 font-medium tracking-widest">系統安全載入中...</p>
    </div>
  );

  if (!user) return <AuthPage />;

  const handleLogout = () => {
    if (auth) signOut(auth).catch(err => console.error("Logout Error:", err));
  };

  return (
    <div className="min-h-screen flex bg-slate-50 overflow-hidden">
      {/* Sidebar Mobile Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm transition-all" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-50 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center gap-3 px-2 mb-8 mt-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <Wallet className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">FinTrack AI</h1>
          </div>

          <nav className="flex-1 space-y-1">
            <SidebarLink active={activeTab === 'dashboard'} icon={<LayoutDashboard />} label="數位儀表板" onClick={() => {setActiveTab('dashboard'); setIsSidebarOpen(false);}} />
            <SidebarLink active={activeTab === 'accounts'} icon={<Wallet />} label="銀行帳戶" onClick={() => {setActiveTab('accounts'); setIsSidebarOpen(false);}} />
            <SidebarLink active={activeTab === 'transactions'} icon={<History />} label="財務流水帳" onClick={() => {setActiveTab('transactions'); setIsSidebarOpen(false);}} />
            <SidebarLink active={activeTab === 'reports'} icon={<PieChartIcon />} label="分析報表" onClick={() => {setActiveTab('reports'); setIsSidebarOpen(false);}} />
          </nav>

          <div className="pt-4 border-t border-slate-100">
            <div className="px-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">已登入用戶</p>
              <p className="text-sm font-bold text-slate-700 truncate">{user.email}</p>
            </div>
            <Button variant="ghost" className="w-full justify-start text-rose-500 hover:bg-rose-50 rounded-xl" onClick={handleLogout}>
              <LogOut size={18} /> 安全登出
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-30">
          <button className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <h2 className="text-lg font-black text-slate-700 tracking-tight">
            {activeTab === 'dashboard' && '概覽'}
            {activeTab === 'accounts' && '帳戶管理'}
            {activeTab === 'transactions' && '記帳紀錄'}
            {activeTab === 'reports' && '統計分析'}
          </h2>
          <div className="hidden sm:flex items-center gap-3">
            <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full flex items-center gap-2">
              <span className="text-[10px] font-black text-indigo-400 uppercase">總資產</span>
              <span className="text-sm font-black text-indigo-700">${accounts.reduce((sum, a) => sum + a.balance, 0).toLocaleString()}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar bg-slate-50/50">
          <div className="max-w-6xl mx-auto space-y-6">
            {activeTab === 'dashboard' && <DashboardPage accounts={accounts} transactions={transactions} onAddTransaction={() => setActiveTab('transactions')} />}
            {activeTab === 'accounts' && <AccountsPage accounts={accounts} user={user} />}
            {activeTab === 'transactions' && <TransactionsPage transactions={transactions} accounts={accounts} user={user} />}
            {activeTab === 'reports' && <ReportsPage transactions={transactions} accounts={accounts} />}
          </div>
        </div>
      </main>
    </div>
  );
}

// --- Auth Page Component ---

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOfflineMode || !auth) {
      setError("當前為展示模式。請在 firebase.ts 中填入設定以啟用雲端同步。");
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 border border-slate-100">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-indigo-200 rotate-6 hover:rotate-0 transition-transform cursor-pointer">
            <Wallet className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter">FinTrack AI</h1>
          <p className="text-slate-400 mt-2 font-medium">智慧理財，從這一刻開始</p>
        </div>

        {isOfflineMode && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-sm flex gap-3 items-start">
            <X className="shrink-0 mt-0.5" size={18} />
            <p><strong>展示模式：</strong>您的資料將僅保存在本地內存中，重新整理後會消失。請填寫 Firebase 設定以進行永久保存。</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">電子郵件</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
              placeholder="example@fintrack.ai"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">密碼</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-rose-500 text-xs font-bold bg-rose-50 p-3 rounded-xl border border-rose-100">{error}</p>}
          <Button type="submit" className="w-full py-4 text-lg shadow-xl shadow-indigo-100 mt-2" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : (isLogin ? '立即登入' : '註冊帳號')}
          </Button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-sm text-slate-500 font-medium">
            {isLogin ? '還沒有帳號嗎？' : '已經有帳號了？'}
            <button 
              className="ml-2 text-indigo-600 font-black hover:underline"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? '點此建立新帳號' : '返回登入介面'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Sub Page Components ---

function DashboardPage({ accounts, transactions, onAddTransaction }: { accounts: BankAccount[], transactions: Transaction[], onAddTransaction: () => void }) {
  const [advice, setAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  const fetchAdvice = async () => {
    setLoadingAdvice(true);
    const result = await getFinancialAdvice(transactions, accounts, DEFAULT_CATEGORIES);
    setAdvice(result);
    setLoadingAdvice(false);
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthIncome = transactions.filter(t => t.date.startsWith(currentMonth) && t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const monthExpense = transactions.filter(t => t.date.startsWith(currentMonth) && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 text-white relative overflow-hidden md:col-span-2 shadow-2xl shadow-indigo-200 border-none group">
        <div className="relative z-10 p-2">
          <p className="text-indigo-100 text-[10px] font-black mb-1 uppercase tracking-[0.2em]">資產淨值總覽</p>
          <h2 className="text-5xl font-black mb-10 tracking-tighter">${totalBalance.toLocaleString()}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-xl border border-white/5 group-hover:bg-white/20 transition-all">
              <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-1">本月累計收入</p>
              <p className="text-2xl font-black">+${monthIncome.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-xl border border-white/5 group-hover:bg-white/20 transition-all">
              <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-1">本月累計支出</p>
              <p className="text-2xl font-black">-${monthExpense.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full -ml-20 -mb-20 blur-2xl" />
      </Card>

      <Card title="Gemini AI 建議" className="md:col-span-1 flex flex-col h-full bg-slate-900 text-white border-none shadow-2xl">
        <div className="flex-1 min-h-[180px]">
          {advice ? (
            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap h-[220px] overflow-y-auto pr-2 custom-scrollbar font-medium selection:bg-indigo-500 selection:text-white">
              {advice}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 py-10">
              <BrainCircuit className="w-16 h-16 mb-4 opacity-10" />
              <p className="text-sm font-bold opacity-40">點擊下方按鈕進行深度分析</p>
            </div>
          )}
        </div>
        <Button 
          variant="secondary" 
          className="w-full mt-6 bg-white border-none text-slate-900 hover:bg-indigo-50 font-black tracking-tight" 
          onClick={fetchAdvice} 
          disabled={loadingAdvice || transactions.length === 0}
        >
          {loadingAdvice ? <Loader2 className="animate-spin" size={18} /> : (advice ? '更新理財建議' : '產生智慧分析')}
        </Button>
      </Card>

      <Card title="最近收支流水" className="md:col-span-2">
        <div className="space-y-1">
          {transactions.slice(0, 5).map(t => {
            const cat = DEFAULT_CATEGORIES.find(c => c.id === t.categoryId);
            return (
              <div key={t.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100 group cursor-default">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-md group-hover:scale-105 transition-all">
                    <History size={20} />
                  </div>
                  <div>
                    <p className="font-black text-slate-800 tracking-tight">{t.note || '未命名交易'}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.date} • {cat?.name}</p>
                  </div>
                </div>
                <p className={`font-black text-xl tracking-tighter ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                </p>
              </div>
            );
          })}
          {transactions.length === 0 && <p className="text-center text-slate-400 py-16 font-bold opacity-40 italic">尚無任何交易資料</p>}
          <Button variant="ghost" className="w-full mt-2 text-indigo-600 font-black" onClick={onAddTransaction}>
            查看完整帳目歷史 <ChevronRight size={16} />
          </Button>
        </div>
      </Card>

      <Card title="資產分佈狀況" className="md:col-span-1">
        <div className="space-y-4">
          {accounts.map(acc => (
            <div key={acc.id} className="p-5 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all group">
              <div className="flex justify-between items-center mb-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{acc.bankName}</p>
                <div className="w-3 h-3 rounded-full shadow-lg group-hover:scale-125 transition-transform" style={{ backgroundColor: acc.color }} />
              </div>
              <div className="flex justify-between items-end">
                <h4 className="font-black text-slate-800 text-lg tracking-tight">{acc.name}</h4>
                <p className="text-2xl font-black text-indigo-600 tracking-tighter">${acc.balance.toLocaleString()}</p>
              </div>
            </div>
          ))}
          {accounts.length === 0 && <p className="text-center text-slate-400 py-16 font-bold opacity-40">請先新增您的帳戶</p>}
        </div>
      </Card>
    </div>
  );
}

function AccountsPage({ accounts, user }: { accounts: BankAccount[], user: User }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [balance, setBalance] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOfflineMode || !db) {
      alert("離線模式無法保存。");
      return;
    }
    
    try {
      if (editingId) {
        await updateDoc(doc(db, 'accounts', editingId), {
          name,
          bankName: bank,
          balance: Number(balance)
        });
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'accounts'), {
          userId: user.uid,
          name,
          bankName: bank,
          balance: Number(balance),
          color: '#' + Math.floor(Math.random()*16777215).toString(16),
          createdAt: Date.now()
        });
        setIsAdding(false);
      }
      setName(''); setBank(''); setBalance('');
    } catch (err) {
      console.error("Save Account Error:", err);
    }
  };

  const handleEdit = (acc: BankAccount) => {
    setEditingId(acc.id);
    setName(acc.name);
    setBank(acc.bankName);
    setBalance(acc.balance.toString());
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (isOfflineMode || !db) return;
    if (window.confirm('確定要永久移除此帳戶嗎？這將無法復原。')) {
      await deleteDoc(doc(db, 'accounts', id));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-black text-slate-800 tracking-tighter">資產帳戶管理</h3>
        <Button onClick={() => {setIsAdding(true); setEditingId(null); setName(''); setBank(''); setBalance('');}} className="rounded-xl shadow-indigo-100 shadow-xl"><Plus size={20} /> 新增銀行帳戶</Button>
      </div>

      {(isAdding || editingId) && (
        <Card title={editingId ? "編輯帳戶明細" : "連結新的銀行帳戶"} className="animate-in zoom-in-95 duration-300">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">帳戶名稱</label>
                <input placeholder="例如：生活開銷卡" required className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">所屬銀行</label>
                <input placeholder="例如：台新銀行" required className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold" value={bank} onChange={e => setBank(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">初始餘額</label>
                <input placeholder="0" type="number" required className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-black text-lg" value={balance} onChange={e => setBalance(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" onClick={() => {setIsAdding(false); setEditingId(null);}} className="rounded-xl">取消變更</Button>
              <Button type="submit" className="rounded-xl px-8 shadow-xl shadow-indigo-100">{editingId ? '儲存更新' : '確認新增'}</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {accounts.map(acc => (
          <div key={acc.id} className="group relative bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all overflow-hidden duration-500">
            <div className="absolute top-0 right-0 w-40 h-40 bg-slate-50 rounded-full -mr-20 -mt-20 group-hover:bg-indigo-50 transition-colors duration-500" />
            <div className="relative">
              <div className="flex justify-between items-start mb-10">
                <div className="w-16 h-16 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-100 group-hover:scale-110 transition-transform">
                  <Wallet size={32} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <button onClick={() => handleEdit(acc)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl shadow-sm transition-all"><Edit2 size={18} /></button>
                  <button onClick={() => handleDelete(acc.id)} className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-white rounded-xl shadow-sm transition-all"><Trash2 size={18} /></button>
                </div>
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{acc.bankName}</p>
              <h4 className="text-2xl font-black text-slate-800 mb-8 tracking-tighter">{acc.name}</h4>
              <p className="text-4xl font-black text-indigo-600 tracking-tighter group-hover:scale-105 transition-transform origin-left">${acc.balance.toLocaleString()}</p>
            </div>
          </div>
        ))}
        {accounts.length === 0 && !isAdding && (
          <div className="col-span-full py-32 flex flex-col items-center justify-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 opacity-50">
            <Plus className="w-12 h-12 text-slate-200 mb-4" />
            <p className="font-bold text-slate-400 uppercase tracking-widest">點擊右上角新增您的第一個帳戶</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TransactionsPage({ transactions, accounts, user }: { transactions: Transaction[], accounts: BankAccount[], user: User }) {
  const [isAdding, setIsAdding] = useState(false);
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOfflineMode || !db) return;
    const numAmount = Number(amount);
    const targetAcc = accounts.find(a => a.id === accountId);
    if (!targetAcc) return;

    try {
      const batch = writeBatch(db);
      const transRef = doc(collection(db, 'transactions'));
      batch.set(transRef, {
        userId: user.uid,
        accountId,
        amount: numAmount,
        type,
        categoryId,
        note,
        date,
        createdAt: Date.now()
      });

      const newBalance = type === 'income' ? targetAcc.balance + numAmount : targetAcc.balance - numAmount;
      batch.update(doc(db, 'accounts', accountId), { balance: newBalance });
      await batch.commit();

      setAmount(''); setNote(''); setIsAdding(false);
    } catch (err) {
      console.error("Transaction Error:", err);
    }
  };

  const handleDelete = async (t: Transaction) => {
    if (isOfflineMode || !db) return;
    if (window.confirm('確定要刪除此筆收支紀錄嗎？相應的帳戶餘額將會被自動回退。')) {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'transactions', t.id));
        const acc = accounts.find(a => a.id === t.accountId);
        if (acc) {
          const backBalance = t.type === 'income' ? acc.balance - t.amount : acc.balance + t.amount;
          batch.update(doc(db, 'accounts', t.accountId), { balance: backBalance });
        }
        await batch.commit();
      } catch (err) {
        console.error("Delete Transaction Error:", err);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-black text-slate-800 tracking-tighter">日常收支流水帳</h3>
        <Button onClick={() => setIsAdding(true)} className="rounded-xl shadow-xl shadow-indigo-100"><Plus size={20} /> 記下一筆</Button>
      </div>

      {isAdding && (
        <Card title="新增流水交易" className="animate-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleAdd} className="space-y-8">
            <div className="flex gap-2 p-2 bg-slate-100 rounded-[1.5rem] w-fit">
              <button 
                type="button" 
                className={`px-10 py-3 rounded-2xl transition-all font-black tracking-tight ${type === 'expense' ? 'bg-white shadow-lg text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setType('expense')}
              >支出支出</button>
              <button 
                type="button" 
                className={`px-10 py-3 rounded-2xl transition-all font-black tracking-tight ${type === 'income' ? 'bg-white shadow-lg text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setType('income')}
              >收入收入</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">選擇日期</label>
                <input type="date" className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">交易金額</label>
                <input placeholder="0" type="number" required className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-black text-2xl" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">收支帳戶</label>
                <select required className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold appearance-none bg-white" value={accountId} onChange={e => setAccountId(e.target.value)}>
                  <option value="">請選擇付款帳戶</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (可用: ${a.balance})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">類別標籤</label>
                <select required className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold appearance-none bg-white" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                  <option value="">請選擇消費類別</option>
                  {DEFAULT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2 lg:col-span-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">備註/品名</label>
                <input placeholder="今天買了什麼？ (例如：午餐、薪資、網購)" className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold" value={note} onChange={e => setNote(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-6 border-t border-slate-50">
              <Button variant="secondary" onClick={() => setIsAdding(false)} className="rounded-xl">暫時取消</Button>
              <Button type="submit" variant="success" className="rounded-xl px-10 shadow-xl shadow-emerald-50 font-black">儲存並同步資產</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-0 overflow-hidden shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50/50">
              <tr className="border-b border-slate-100">
                <th className="py-6 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">交易日期</th>
                <th className="py-6 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">類別</th>
                <th className="py-6 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">備註說明</th>
                <th className="py-6 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">使用帳戶</th>
                <th className="py-6 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">變動金額</th>
                <th className="py-6 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.map(t => {
                const cat = DEFAULT_CATEGORIES.find(c => c.id === t.categoryId);
                const acc = accounts.find(a => a.id === t.accountId);
                return (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-all group duration-300">
                    <td className="py-6 px-6 text-sm font-bold text-slate-500">{t.date}</td>
                    <td className="py-6 px-6">
                      <span className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-2" style={{ backgroundColor: (cat?.color || '#eee') + '15', color: cat?.color }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: cat?.color}} />
                        {cat?.name || '其他'}
                      </span>
                    </td>
                    <td className="py-6 px-6 text-sm font-black text-slate-800 tracking-tight">{t.note || '—'}</td>
                    <td className="py-6 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full shadow-sm" style={{backgroundColor: acc?.color}} />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">{acc?.name}</span>
                      </div>
                    </td>
                    <td className={`py-6 px-6 text-xl font-black text-right tracking-tighter ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                    </td>
                    <td className="py-6 px-6 text-center">
                      <button onClick={() => handleDelete(t)} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100 transform scale-90 hover:scale-100">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-slate-300">
              <History className="w-16 h-16 opacity-10 mb-6" />
              <p className="font-black uppercase tracking-[0.3em]">尚未有任何記帳資料</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function ReportsPage({ transactions }: { transactions: Transaction[], accounts: BankAccount[] }) {
  const categoryData = DEFAULT_CATEGORIES.map(cat => {
    const total = transactions
      .filter(t => t.categoryId === cat.id && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { name: cat.name, value: total, color: cat.color };
  }).filter(c => c.value > 0);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const income = transactions.filter(t => t.date === dateStr && t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.date === dateStr && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { date: dateStr.slice(5), income, expense };
  }).reverse();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-700">
      <Card title="支出類別佔比 (圓餅圖)" className="shadow-2xl shadow-slate-200/50 rounded-[2.5rem] border-none">
        <div className="h-[450px] w-full mt-4">
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={categoryData} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={100} 
                  outerRadius={150} 
                  paddingAngle={8}
                  stroke="none"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '20px', fontWeight: 'bold'}} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-300 font-black uppercase tracking-[0.2em] italic">數據收集不足...</div>
          )}
        </div>
      </Card>

      <Card title="最近一週現金流動 (長條圖)" className="shadow-2xl shadow-slate-200/50 rounded-[2.5rem] border-none">
        <div className="h-[450px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7Days}>
              <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: '900', fill: '#94a3b8'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#cbd5e1', fontWeight: 'bold'}} />
              <Tooltip 
                cursor={{ fill: '#f8fafc', radius: 15 }} 
                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '20px' }} 
              />
              <Bar dataKey="income" fill="#10b981" radius={[12, 12, 0, 0]} name="收入總計" barSize={28} />
              <Bar dataKey="expense" fill="#f43f5e" radius={[12, 12, 0, 0]} name="支出總計" barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

// --- Sidebar Helper Component ---

function SidebarLink({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`
        w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black transition-all text-sm tracking-tight
        ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
      `}
    >
      {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 22 }) : icon}
      <span>{label}</span>
      {active && <div className="ml-auto w-2 h-2 rounded-full bg-white shadow-inner animate-pulse" />}
    </button>
  );
}
