import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getMe, User } from '../api/auth';
import { BASE_URL } from '../api/client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<{
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
} | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const refreshUser = useCallback(async () => {
    try {
      const user = await getMe();
      setState({ user, isAuthenticated: true, isLoading: false });
    } catch {
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin({ email, password });
    setState({ user: res.user, isAuthenticated: true, isLoading: false });
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const res = await apiRegister({ email, password, name });
    setState({ user: res.user, isAuthenticated: true, isLoading: false });
  }, []);

  const logoutFn = useCallback(async () => {
    await apiLogout();
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ state, login, register, logout: logoutFn, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Toast system
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

const ToastContext = createContext<{
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 left-4 z-[100] flex flex-col gap-2 pointer-events-none sm:left-auto sm:w-96">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto animate-slide-in rounded-xl px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl border ${
              toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400/30 text-white' :
              toast.type === 'error' ? 'bg-red-500/90 border-red-400/30 text-white' :
              toast.type === 'warning' ? 'bg-amber-500/90 border-amber-400/30 text-black' :
              'bg-blue-500/90 border-blue-400/30 text-white'
            }`}
            onClick={() => removeToast(toast.id)}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Navigation
export type Page = 'dashboard' | 'chat' | 'projects' | 'settings' | 'project-detail' | 'file-editor' | 'login' | 'register' | 'image-gen' | 'sandbox' | 'logs' | 'history';

interface NavState {
  page: Page;
  params?: Record<string, string>;
}

const NavContext = createContext<{
  nav: NavState;
  navigate: (page: Page, params?: Record<string, string>) => void;
  goBack: () => void;
  canGoBack: boolean;
} | null>(null);

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used within NavProvider');
  return ctx;
}

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [nav, setNav] = useState<NavState>({ page: 'dashboard' });
  const [navHistory, setNavHistory] = useState<NavState[]>([{ page: 'dashboard' }]);
  const canGoBack = navHistory.length > 1;

  const navigate = useCallback((page: Page, params?: Record<string, string>) => {
    const newState = { page, params };
    setNavHistory(prev => [...prev, newState]);
    setNav(newState);
  }, []);

  const goBack = useCallback(() => {
    setNavHistory(prev => {
      if (prev.length <= 1) return prev;
      const newHistory = prev.slice(0, -1);
      setNav(newHistory[newHistory.length - 1]);
      return newHistory;
    });
  }, []);

  return (
    <NavContext.Provider value={{ nav, navigate, goBack, canGoBack }}>
      {children}
    </NavContext.Provider>
  );
}

// Base URL helper
export { BASE_URL };
