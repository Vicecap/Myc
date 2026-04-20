import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './store/context';
import { ToastProvider, useToast, NavProvider, useNav, type Page } from './store/context';
import {
  MessageSquare, FolderGit2, Settings, Home, ChevronLeft,
  Send, Sparkles, FileCode, Play, Download,
  Trash2, Plus, Search, LogOut, User, Key,
  Zap, Image as ImageIcon, Terminal, GitBranch,
  Eye, History, Save, X,
  Loader2, ChevronRight, Rocket,
  Cpu, EyeOff, Eye as EyeIcon, Lock,
  Mail, Bug, Wand2, BarChart3,
  ChevronDown
} from 'lucide-react';
import { register as apiRegister } from './api/auth';
import { listProjects, createProject, generateProject, getProjectFiles, getProjectFile,
  updateProjectFile, commitProject, getProjectLogs,
  runProject, deployProject, cloneProject, searchProject, type Project,
  type FileInfo } from './api/projects';
import { getModels, aiStreamPrompt, aiImprove, aiExplain, aiDebug,
  generateImage, generateVideo, runSandbox, type AIModel, type ChatMessage } from './api/ai';
import { getUsage, getApiKeys, createApiKey, deleteApiKey, type UsageStats, type ApiKey } from './api/user';
import { BASE_URL } from './api/client';

/* ================================================================
   UTILITY
   ================================================================ */
function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

function timeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getLanguageFromExt(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    html: 'html', css: 'css', scss: 'scss', json: 'json', md: 'markdown',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
    php: 'php', sql: 'sql', yaml: 'yaml', yml: 'yaml', xml: 'xml',
    sh: 'bash', bash: 'bash', vue: 'vue', svelte: 'svelte',
  };
  return map[ext || ''] || 'text';
}

function getFileIcon(path: string) {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html': return '🌐';
    case 'css': case 'scss': return '🎨';
    case 'json': return '📋';
    case 'md': return '📝';
    case 'py': return '🐍';
    case 'js': case 'mjs': return '⚡';
    case 'ts': case 'tsx': return '💎';
    case 'jsx': return '⚛️';
    case 'jpg': case 'png': case 'svg': case 'gif': return '🖼️';
    case 'env': return '🔒';
    case 'gitignore': return '🙈';
    default: return '📄';
  }
}

/* ================================================================
   REUSABLE UI COMPONENTS
   ================================================================ */

function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
  return <Loader2 className={cn('animate-spin text-violet-400', sizes[size])} />;
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'error' | 'info' }) {
  const colors = {
    default: 'bg-gray-800 text-gray-300 border-gray-700',
    success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border', colors[variant])}>
      {children}
    </span>
  );
}

function Button({ children, variant = 'primary', size = 'md', icon, loading, disabled, onClick, className }: {
  children?: React.ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg'; icon?: React.ReactNode; loading?: boolean;
  disabled?: boolean; onClick?: () => void; className?: string;
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none';
  const variants = {
    primary: 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40',
    secondary: 'bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700',
    ghost: 'text-gray-400 hover:text-white hover:bg-white/5',
    danger: 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30',
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3.5 text-base' };
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], className)}>
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </button>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder, icon, multiline, className }: {
  label?: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; icon?: React.ReactNode;
  multiline?: boolean; className?: string;
}) {
  return (
    <div className={cn('w-full', className)}>
      {label && <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{icon}</div>}
        {multiline ? (
          <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={4}
            className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all resize-none" />
        ) : (
          <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className={cn('w-full bg-gray-900/50 border border-gray-700/50 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all',
              icon ? 'pl-10 pr-4 py-2.5' : 'px-4 py-2.5')} />
        )}
      </div>
    </div>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-lg bg-gray-950 border border-gray-800 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-800 sticky top-0 bg-gray-950 z-10">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"><X size={18} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description, action, actionLabel }: {
  icon: React.ReactNode; title: string; description: string; action?: () => void; actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-800/50 flex items-center justify-center mb-4 text-gray-500">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-300 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-xs mb-6">{description}</p>
      {action && actionLabel && <Button onClick={action} variant="primary" icon={<Plus size={16} />}>{actionLabel}</Button>}
    </div>
  );
}

/* ================================================================
   MARKDOWN-LIKE RENDERER (simple)
   ================================================================ */
function SimpleMarkdown({ text }: { text: string }) {
  const renderBlock = (block: string, idx: number) => {
    const codeMatch = block.match(/^```(\w+)?\n([\s\S]*?)```$/m);
    if (codeMatch) {
      return (
        <div key={idx} className="my-3 rounded-xl overflow-hidden border border-gray-700/50">
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800/80 text-xs text-gray-400">
            <span>{codeMatch[1] || 'code'}</span>
          </div>
          <pre className="p-3 text-sm text-gray-300 overflow-x-auto bg-gray-900/80 font-mono leading-relaxed">
            <code>{codeMatch[2].trim()}</code>
          </pre>
        </div>
      );
    }
    const lines = block.split('\n');
    return lines.map((line, li) => {
      if (line.startsWith('### ')) return <h3 key={`${idx}-${li}`} className="text-base font-semibold text-white mt-3 mb-1">{line.slice(4)}</h3>;
      if (line.startsWith('## ')) return <h2 key={`${idx}-${li}`} className="text-lg font-bold text-white mt-3 mb-1">{line.slice(3)}</h2>;
      if (line.startsWith('# ')) return <h1 key={`${idx}-${li}`} className="text-xl font-bold text-white mt-3 mb-1">{line.slice(2)}</h1>;
      if (line.startsWith('- ')) return <li key={`${idx}-${li}`} className="text-sm text-gray-300 ml-4 list-disc">{renderInline(line.slice(2))}</li>;
      if (line.startsWith('**') && line.endsWith('**')) return <p key={`${idx}-${li}`} className="text-sm font-semibold text-white mt-2">{line.replace(/\*\*/g, '')}</p>;
      if (line.trim() === '') return <div key={`${idx}-${li}`} className="h-2" />;
      return <p key={`${idx}-${li}`} className="text-sm text-gray-300 leading-relaxed">{renderInline(line)}</p>;
    });
  };

  const renderInline = (text: string): React.ReactNode => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`'))
        return <code key={i} className="px-1.5 py-0.5 bg-gray-800 rounded text-xs text-violet-300 font-mono">{part.slice(1, -1)}</code>;
      if (part.startsWith('**') && part.endsWith('**'))
        return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
      if (part.startsWith('*') && part.endsWith('*'))
        return <em key={i} className="text-violet-300">{part.slice(1, -1)}</em>;
      return <span key={i}>{part}</span>;
    });
  };

  const blocks = text.split(/(```[\s\S]*?```)/g).filter(Boolean);
  return <div className="space-y-0.5">{blocks.map(renderBlock)}</div>;
}

/* ================================================================
   LOGIN PAGE
   ================================================================ */
function LoginPage() {
  const { login } = useAuth();
  const { navigate } = useNav();
  const { addToast } = useToast();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return addToast('Please fill in all fields', 'warning');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        addToast('Welcome back!', 'success');
      } else {
        await apiRegister({ email, password, name });
        addToast('Account created!', 'success');
      }
      navigate('dashboard');
    } catch (err: any) {
      addToast(err.error || err.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-500/30 mb-4">
            <Sparkles size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">CloudForge</h1>
          <p className="text-sm text-gray-500 mt-1">AI-Powered Development Platform</p>
        </div>

        {/* Tabs */}
        <div className="w-full max-w-sm bg-gray-900/50 rounded-xl p-1 flex gap-1 mb-6 border border-gray-800/50">
          <button onClick={() => setMode('login')}
            className={cn('flex-1 py-2 text-sm font-medium rounded-lg transition-all', mode === 'login' ? 'bg-violet-600 text-white shadow-lg' : 'text-gray-400 hover:text-white')}>
            Sign In
          </button>
          <button onClick={() => setMode('register')}
            className={cn('flex-1 py-2 text-sm font-medium rounded-lg transition-all', mode === 'register' ? 'bg-violet-600 text-white shadow-lg' : 'text-gray-400 hover:text-white')}>
            Register
          </button>
        </div>

        {/* Form */}
        <div className="w-full max-w-sm space-y-4">
          {mode === 'register' && (
            <Input label="Name" value={name} onChange={setName} placeholder="John Doe" icon={<User size={16} />} />
          )}
          <Input label="Email" value={email} onChange={setEmail} type="email" placeholder="you@example.com" icon={<Mail size={16} />} />
          <div>
            <Input label="Password" value={password} onChange={setPassword} type={showPw ? 'text' : 'password'}
              placeholder="••••••••" icon={<Lock size={16} />} />
            <button onClick={() => setShowPw(!showPw)} className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
              {showPw ? <EyeOff size={12} /> : <EyeIcon size={12} />} {showPw ? 'Hide' : 'Show'} password
            </button>
          </div>
          <Button loading={loading} onClick={handleSubmit} className="w-full" size="lg">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </div>

        <p className="text-xs text-gray-600 mt-8">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
      </div>
    </div>
  );
}

/* ================================================================
   BOTTOM NAVIGATION
   ================================================================ */
function BottomNav() {
  const { nav, navigate } = useNav();
  const mainPages: { page: Page; label: string; icon: React.ReactNode }[] = [
    { page: 'dashboard', label: 'Home', icon: <Home size={20} /> },
    { page: 'chat', label: 'AI Chat', icon: <MessageSquare size={20} /> },
    { page: 'projects', label: 'Projects', icon: <FolderGit2 size={20} /> },
    { page: 'image-gen', label: 'Create', icon: <Zap size={20} /> },
    { page: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur-xl border-t border-gray-800/50 z-40 safe-area-bottom">
      <div className="flex items-center justify-around py-2 max-w-lg mx-auto">
        {mainPages.map(item => (
          <button key={item.page} onClick={() => navigate(item.page)}
            className={cn('flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[56px]',
              nav.page === item.page ? 'text-violet-400' : 'text-gray-500 hover:text-gray-300')}>
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
            {nav.page === item.page && <div className="w-1 h-1 rounded-full bg-violet-400 mt-0.5" />}
          </button>
        ))}
      </div>
    </nav>
  );
}

/* ================================================================
   HEADER
   ================================================================ */
function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const { goBack, canGoBack, nav } = useNav();
  return (
    <header className="sticky top-0 z-30 bg-gray-950/90 backdrop-blur-xl border-b border-gray-800/50">
      <div className="flex items-center gap-3 px-4 py-3">
        {canGoBack && !['dashboard', 'chat', 'projects', 'settings', 'image-gen'].includes(nav.page) && (
          <button onClick={goBack} className="p-1.5 -ml-1 rounded-lg hover:bg-gray-800 text-gray-400 active:scale-95 transition-all">
            <ChevronLeft size={22} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-white truncate">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}

/* ================================================================
   DASHBOARD PAGE
   ================================================================ */
function DashboardPage() {
  const { state: auth } = useAuth();
  const { navigate } = useNav();
  const { addToast } = useToast();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<AIModel[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, m] = await Promise.all([listProjects(), getModels()]);
        setProjects(p);
        setModels(m);
      } catch { /* ignore */ }
      if (auth.isAuthenticated) {
        try {
          const u = await getUsage();
          setStats(u);
        } catch { /* ignore */ }
      }
      setLoading(false);
    };
    load();
  }, [auth.isAuthenticated]);

  const quickActions = [
    { icon: <MessageSquare size={22} />, label: 'AI Chat', page: 'chat' as Page, color: 'from-violet-500/20 to-purple-500/20 border-violet-500/20' },
    { icon: <Plus size={22} />, label: 'New Project', action: () => navigate('projects', { modal: 'create' }), color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/20' },
    { icon: <Sparkles size={22} />, label: 'Generate', action: () => navigate('projects', { modal: 'generate' }), color: 'from-amber-500/20 to-orange-500/20 border-amber-500/20' },
    { icon: <ImageIcon size={22} />, label: 'Image Gen', page: 'image-gen' as Page, color: 'from-pink-500/20 to-rose-500/20 border-pink-500/20' },
    { icon: <Terminal size={22} />, label: 'Sandbox', page: 'sandbox' as Page, color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/20' },
    { icon: <Rocket size={22} />, label: 'Deploy', action: () => addToast('Select a project to deploy', 'info'), color: 'from-green-500/20 to-lime-500/20 border-green-500/20' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      <Header title="Dashboard" subtitle={`Welcome${auth.user?.name ? `, ${auth.user.name}` : ''}`} />

      <div className="px-4 py-4 space-y-4">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-2xl p-4">
              <div className="text-2xl font-bold text-white">{stats.requestsToday}</div>
              <div className="text-xs text-gray-400 mt-1">Requests Today</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-4">
              <div className="text-2xl font-bold text-white">{projects.length}</div>
              <div className="text-xs text-gray-400 mt-1">Projects</div>
            </div>
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-4">
              <div className="text-2xl font-bold text-white">{stats.tokensUsed >= 1000 ? `${(stats.tokensUsed / 1000).toFixed(1)}k` : stats.tokensUsed}</div>
              <div className="text-xs text-gray-400 mt-1">Tokens Used</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-4">
              <div className="text-2xl font-bold text-white">{formatSize(stats.storageUsed)}</div>
              <div className="text-xs text-gray-400 mt-1">Storage</div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action, i) => (
              <button key={i} onClick={() => { if (action.page) navigate(action.page); else action.action?.(); }}
                className={cn('bg-gradient-to-br border rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-all', action.color)}>
                <div className="text-white">{action.icon}</div>
                <span className="text-xs font-medium text-gray-200">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Available Models */}
        {models.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-300 mb-3">AI Models ({models.length})</h2>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {models.map((m, i) => (
                <div key={i} className="flex-shrink-0 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 min-w-[120px]">
                  <div className="text-sm font-semibold text-white truncate">{m.name || m.id}</div>
                  {m.provider && <div className="text-xs text-gray-500 mt-0.5">{m.provider}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Projects */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300">Recent Projects</h2>
            {projects.length > 0 && (
              <button onClick={() => navigate('projects')} className="text-xs text-violet-400 flex items-center gap-1">
                View all <ChevronRight size={14} />
              </button>
            )}
          </div>
          {projects.length === 0 ? (
            <EmptyState icon={<FolderGit2 size={28} />} title="No Projects Yet" description="Create your first project or generate one with AI"
              action={() => navigate('projects', { modal: 'create' })} actionLabel="Create Project" />
          ) : (
            <div className="space-y-2">
              {projects.slice(0, 5).map(p => (
                <button key={p.id} onClick={() => navigate('project-detail', { id: p.id })}
                  className="w-full bg-gray-900/50 border border-gray-800/50 rounded-xl p-4 flex items-center gap-3 active:scale-[0.99] transition-all text-left">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <FolderGit2 size={20} className="text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{p.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{timeAgo(p.updatedAt)}</div>
                  </div>
                  <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   AI CHAT PAGE
   ================================================================ */
interface ChatMsg {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

function ChatPage() {
  const { addToast } = useToast();
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 'welcome', role: 'assistant', content: '👋 Hello! I\'m your AI coding assistant. I can help you write code, explain concepts, debug issues, and improve your projects. What can I help you with?', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('');
  const [models, setModels] = useState<AIModel[]>([]);
  const [showModels, setShowModels] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getModels().then(setModels).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMsg = { id: Date.now().toString(), role: 'user', content: input.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const assistantMsg: ChatMsg = { id: (Date.now() + 1).toString(), role: 'assistant', content: '', timestamp: Date.now() };
    setMessages(prev => [...prev, assistantMsg]);

    const chatMessages: ChatMessage[] = messages.filter(m => m.content).map(m => ({ role: m.role, content: m.content }));
    chatMessages.push({ role: 'user', content: userMsg.content });

    try {
      await aiStreamPrompt(
        { prompt: userMsg.content, model: model || undefined, context: messages.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n') },
        (text) => {
          setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: m.content + text } : m));
        },
        () => { setLoading(false); },
        (err) => {
          setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: `⚠️ Error: ${err}` } : m));
          addToast(err, 'error');
          setLoading(false);
        }
      );
    } catch {
      setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: '⚠️ Failed to connect to AI service.' } : m));
      setLoading(false);
    }
  };

  return (
    <div className="pb-24 flex flex-col h-[100dvh]">
      <Header title="AI Chat" subtitle="Powered by CloudForge AI" right={
        <div className="relative">
          <button onClick={() => setShowModels(!showModels)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-800 text-xs text-gray-300">
            <Cpu size={14} />
            {model || 'Auto'}
            <ChevronDown size={12} />
          </button>
          {showModels && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden">
              <button onClick={() => { setModel(''); setShowModels(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800">
                Auto Select
              </button>
              {models.map(m => (
                <button key={m.id} onClick={() => { setModel(m.id); setShowModels(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 truncate">
                  {m.name || m.id}
                </button>
              ))}
            </div>
          )}
        </div>
      } />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[85%] rounded-2xl px-4 py-3',
              msg.role === 'user' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white' :
              msg.content ? 'bg-gray-900 border border-gray-800 text-white' :
              'bg-gray-900 border border-gray-800')}>
              {msg.role === 'assistant' && msg.content ? <SimpleMarkdown text={msg.content} /> :
               msg.role === 'assistant' && !msg.content ? <div className="flex items-center gap-2 text-gray-400"><Spinner size="sm" /><span className="text-sm">Thinking...</span></div> :
               <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-16 bg-gray-950/90 backdrop-blur-xl border-t border-gray-800/50 p-3">
        <div className="flex items-end gap-2 max-w-2xl mx-auto">
          <div className="flex-1 bg-gray-900 border border-gray-700/50 rounded-2xl flex items-end">
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask me anything..." rows={1}
              className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none resize-none max-h-32" />
          </div>
          <button onClick={sendMessage} disabled={!input.trim() || loading}
            className={cn('w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95',
              input.trim() && !loading ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25' :
              'bg-gray-800 text-gray-500')}>
            {loading ? <Spinner size="sm" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   PROJECTS PAGE
   ================================================================ */
function ProjectsPage() {
  const { addToast } = useToast();
  const { navigate, nav } = useNav();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(nav.params?.modal === 'create');
  const [showGenerate, setShowGenerate] = useState(nav.params?.modal === 'generate');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [genPrompt, setGenPrompt] = useState('');
  const [creating, setCreating] = useState(false);
  const [genLoading, setGenLoading] = useState(false);

  const load = async () => {
    try {
      const p = await listProjects();
      setProjects(p);
    } catch {
      addToast('Failed to load projects', 'error');
    } finally { setLoading(false); };
  };

  useEffect(() => { load(); }, []);

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreate = async () => {
    if (!newName.trim()) return addToast('Project name is required', 'warning');
    setCreating(true);
    try {
      const p = await createProject({ name: newName.trim(), description: newDesc.trim() || undefined });
      addToast(`Project "${p.name}" created!`, 'success');
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      load();
    } catch (err: any) {
      addToast(err.error || 'Failed to create project', 'error');
    } finally { setCreating(false); }
  };

  const handleGenerate = async () => {
    if (!genPrompt.trim()) return addToast('Please describe your project', 'warning');
    setGenLoading(true);
    try {
      const p = await generateProject({ prompt: genPrompt.trim() });
      addToast(`Project "${p.name}" generated!`, 'success');
      setShowGenerate(false);
      setGenPrompt('');
      load();
    } catch (err: any) {
      addToast(err.error || 'Failed to generate project', 'error');
    } finally { setGenLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;

  return (
    <div className="pb-24">
      <Header title="Projects" subtitle={`${projects.length} project${projects.length !== 1 ? 's' : ''}`} right={
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" icon={<Plus size={16} />} onClick={() => setShowCreate(true)} />
          <Button variant="ghost" size="sm" icon={<Sparkles size={16} />} onClick={() => setShowGenerate(true)} />
        </div>
      } />

      <div className="px-4 py-3">
        <Input value={search} onChange={setSearch} placeholder="Search projects..." icon={<Search size={16} />} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<FolderGit2 size={28} />}
          title={search ? 'No matching projects' : 'No projects yet'}
          description={search ? 'Try a different search term' : 'Create a project from scratch or generate one with AI'}
          action={() => setShowCreate(true)} actionLabel="Create Project" />
      ) : (
        <div className="px-4 space-y-2">
          {filtered.map(p => (
            <button key={p.id} onClick={() => navigate('project-detail', { id: p.id })}
              className="w-full bg-gray-900/50 border border-gray-800/50 rounded-xl p-4 flex items-center gap-3 active:scale-[0.99] transition-all text-left">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <FolderGit2 size={22} className="text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{p.name}</div>
                {p.description && <div className="text-xs text-gray-500 truncate mt-0.5">{p.description}</div>}
                <div className="text-xs text-gray-600 mt-1">{timeAgo(p.updatedAt)}</div>
              </div>
              <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Project">
        <div className="space-y-4">
          <Input label="Project Name" value={newName} onChange={setNewName} placeholder="my-awesome-project" />
          <Input label="Description (optional)" value={newDesc} onChange={setNewDesc} placeholder="A brief description" />
          <Button loading={creating} onClick={handleCreate} className="w-full" size="lg">
            Create Project
          </Button>
        </div>
      </Modal>

      {/* Generate Modal */}
      <Modal open={showGenerate} onClose={() => setShowGenerate(false)} title="Generate with AI">
        <div className="space-y-4">
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 text-sm text-gray-300">
            Describe what you want to build and AI will generate the entire project structure and code for you.
          </div>
          <Input label="Project Description" value={genPrompt} onChange={setGenPrompt}
            placeholder="A todo app with React and Tailwind CSS..." multiline />
          <Button loading={genLoading} onClick={handleGenerate} className="w-full" size="lg" icon={<Sparkles size={18} />}>
            Generate Project
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* ================================================================
   PROJECT DETAIL PAGE
   ================================================================ */
function ProjectDetailPage() {
  const { navigate, nav } = useNav();
  const { addToast } = useToast();
  const id = nav.params?.id || '';
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [logs, setLogs] = useState<{ stdout: string; stderr: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'files' | 'logs' | 'info'>('files');
  const [running, setRunning] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [f, l] = await Promise.all([
          getProjectFiles(id),
          getProjectLogs(id).catch(() => null),
        ]);
        setFiles(f);
        if (l) setLogs(l);
        setProject({ id, name: 'Project', createdAt: '', updatedAt: '' });
      } catch {
        addToast('Failed to load project', 'error');
      } finally { setLoading(false); }
    };
    load();
  }, [id, addToast]);

  const handleRun = async () => {
    setRunning(true);
    try {
      await runProject(id);
      addToast('Project started!', 'success');
    } catch (err: any) {
      addToast(err.error || 'Failed to run', 'error');
    } finally { setRunning(false); }
  };

  const handleDeploy = async () => {
    try {
      await deployProject(id);
      addToast('Deployed successfully!', 'success');
    } catch (err: any) {
      addToast(err.error || 'Deploy failed', 'error');
    }
  };

  const handleClone = async () => {
    try {
      const p = await cloneProject(id);
      addToast(`Cloned as "${p.name}"`, 'success');
      navigate('projects');
    } catch (err: any) {
      addToast(err.error || 'Clone failed', 'error');
    }
  };

  const handleSearch = async () => {
    if (!searchQ.trim()) return;
    try {
      const results = await searchProject(id, searchQ);
      addToast(`Found ${Array.isArray(results) ? results.length : 0} results`, 'info');
    } catch {
      addToast('Search failed', 'error');
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;

  return (
    <div className="pb-24">
      <Header title={project?.name || 'Project'} subtitle={id.slice(0, 12)} right={
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" icon={<Search size={16} />} onClick={() => setShowSearch(!showSearch)} />
          <Button variant="ghost" size="sm" icon={<Play size={16} />} loading={running} onClick={handleRun} />
        </div>
      } />

      {showSearch && (
        <div className="px-4 py-2 flex gap-2">
          <Input value={searchQ} onChange={setSearchQ} placeholder="Search in project..." className="flex-1" />
          <Button variant="primary" size="sm" onClick={handleSearch}>Search</Button>
        </div>
      )}

      {/* Action Bar */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
        <Button variant="secondary" size="sm" icon={<Play size={14} />} loading={running} onClick={handleRun}>Run</Button>
        <Button variant="secondary" size="sm" icon={<Rocket size={14} />} onClick={handleDeploy}>Deploy</Button>
        <Button variant="secondary" size="sm" icon={<GitBranch size={14} />} onClick={handleClone}>Clone</Button>
        <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={() => addToast('Download started', 'info')}>Download</Button>
      </div>

      {/* Tabs */}
      <div className="px-4 flex gap-0 border-b border-gray-800">
        {(['files', 'logs', 'info'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-all',
              tab === t ? 'border-violet-500 text-violet-400' : 'border-transparent text-gray-500')}>
            {t}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {tab === 'files' && (
          files.length === 0 ? (
            <EmptyState icon={<FileCode size={28} />} title="No Files" description="Project has no files yet"
              action={() => navigate('file-editor', { id, path: 'index.html' })} actionLabel="Create File" />
          ) : (
            <div className="space-y-1">
              {files.map((f, i) => (
                <button key={i} onClick={() => navigate('file-editor', { id, path: f.path })}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-900/50 active:scale-[0.99] transition-all text-left">
                  <span className="text-lg">{getFileIcon(f.path)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate font-medium">{f.name}</div>
                    <div className="text-xs text-gray-500">{f.path} · {formatSize(f.size)}</div>
                  </div>
                  <ChevronRight size={16} className="text-gray-600" />
                </button>
              ))}
            </div>
          )
        )}

        {tab === 'logs' && (
          logs ? (
            <div className="space-y-4">
              {logs.stdout && (
                <div>
                  <div className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" /> STDOUT
                  </div>
                  <pre className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-xs text-emerald-400 font-mono overflow-x-auto max-h-64">
                    {logs.stdout}
                  </pre>
                </div>
              )}
              {logs.stderr && (
                <div>
                  <div className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-400" /> STDERR
                  </div>
                  <pre className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-xs text-red-400 font-mono overflow-x-auto max-h-64">
                    {logs.stderr}
                  </pre>
                </div>
              )}
              {!logs.stdout && !logs.stderr && <p className="text-sm text-gray-500 text-center py-8">No logs yet. Run the project to see output.</p>}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No logs available.</p>
          )
        )}

        {tab === 'info' && (
          <div className="space-y-3">
            <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Project ID</div>
              <div className="text-sm text-white font-mono">{id}</div>
            </div>
            <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Files</div>
              <div className="text-sm text-white">{files.length} files</div>
            </div>
            <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Preview URL</div>
              <div className="text-sm text-violet-400 font-mono break-all">{BASE_URL}/projects/{id}/preview</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   FILE EDITOR PAGE
   ================================================================ */
function FileEditorPage() {
  const { nav } = useNav();
  const { addToast } = useToast();
  const id = nav.params?.id || '';
  const filePath = decodeURIComponent(nav.params?.path || '');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiMode, setAiMode] = useState<'none' | 'improve' | 'explain' | 'debug'>('none');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [showAI, setShowAI] = useState(false);
  const lang = getLanguageFromExt(filePath);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const file = await getProjectFile(id, filePath);
        setContent(file.content);
      } catch {
        addToast('Failed to load file', 'error');
      } finally { setLoading(false); }
    };
    load();
  }, [id, filePath, addToast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProjectFile(id, filePath, content);
      addToast('File saved!', 'success');
    } catch (err: any) {
      addToast(err.error || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const handleAI = async (mode: 'improve' | 'explain' | 'debug') => {
    setAiLoading(true);
    setAiMode(mode);
    setShowAI(true);
    setAiResult('');
    try {
      if (mode === 'improve') {
        const res = await aiImprove({ code: content, language: lang });
        setAiResult(res.improvedCode || res.response);
      } else if (mode === 'explain') {
        const res = await aiExplain({ code: content, language: lang });
        setAiResult(res.response);
      } else {
        const res = await aiDebug({ code: content, language: lang });
        setAiResult(res.fix || res.response);
      }
    } catch (err: any) {
      setAiResult(`Error: ${err.error || 'Failed'}`);
    } finally { setAiLoading(false); }
  };

  const handleCommit = async () => {
    const msg = prompt('Commit message:');
    if (!msg) return;
    try {
      await commitProject(id, msg);
      addToast('Committed!', 'success');
    } catch (err: any) {
      addToast(err.error || 'Commit failed', 'error');
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;

  return (
    <div className="pb-24 flex flex-col h-[100dvh]">
      <Header title={filePath.split('/').pop() || filePath} subtitle={lang} right={
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" icon={<Wand2 size={16} />} onClick={() => setShowAI(!showAI)} />
          <Button variant="ghost" size="sm" icon={<Save size={16} />} loading={saving} onClick={handleSave} />
        </div>
      } />

      {/* Toolbar */}
      <div className="px-4 py-2 flex items-center gap-2 border-b border-gray-800 overflow-x-auto scrollbar-hide">
        <Badge variant="info">{lang}</Badge>
        <Button variant="ghost" size="sm" icon={<Wand2 size={14} />} onClick={() => handleAI('improve')}>Improve</Button>
        <Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={() => handleAI('explain')}>Explain</Button>
        <Button variant="ghost" size="sm" icon={<Bug size={14} />} onClick={() => handleAI('debug')}>Debug</Button>
        <Button variant="ghost" size="sm" icon={<History size={14} />} onClick={handleCommit}>Commit</Button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <textarea value={content} onChange={e => setContent(e.target.value)}
          className="w-full h-full bg-gray-950 text-gray-200 font-mono text-sm p-4 resize-none focus:outline-none leading-relaxed"
          spellCheck={false} autoCapitalize="off" autoCorrect="off" />
      </div>

      {/* AI Panel */}
      {showAI && (
        <div className="absolute bottom-16 left-0 right-0 bg-gray-950/95 backdrop-blur-xl border-t border-gray-800 max-h-[50vh] overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-violet-400" />
                <span className="text-sm font-semibold text-white">
                  {aiMode === 'improve' ? 'Improve Code' : aiMode === 'explain' ? 'Explain Code' : 'Debug Code'}
                </span>
              </div>
              <button onClick={() => { setShowAI(false); setAiResult(''); }} className="p-1 rounded-lg hover:bg-gray-800 text-gray-400"><X size={16} /></button>
            </div>
            {aiLoading ? (
              <div className="flex items-center gap-2 text-gray-400 py-4"><Spinner size="sm" /><span className="text-sm">AI is working...</span></div>
            ) : aiResult ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 max-h-64 overflow-y-auto">
                <SimpleMarkdown text={aiResult} />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => handleAI('improve')} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center active:scale-95 transition-all">
                  <Wand2 size={18} className="mx-auto mb-1 text-violet-400" />
                  <div className="text-xs text-gray-300">Improve</div>
                </button>
                <button onClick={() => handleAI('explain')} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center active:scale-95 transition-all">
                  <Eye size={18} className="mx-auto mb-1 text-blue-400" />
                  <div className="text-xs text-gray-300">Explain</div>
                </button>
                <button onClick={() => handleAI('debug')} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center active:scale-95 transition-all">
                  <Bug size={18} className="mx-auto mb-1 text-amber-400" />
                  <div className="text-xs text-gray-300">Debug</div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="bg-gray-950 border-t border-gray-800 px-4 py-2 flex items-center justify-between text-xs text-gray-500">
        <span>Ln {content.slice(0, content.length).split('\n').length} · {content.length} chars</span>
        <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
          <Save size={14} /> Save
        </Button>
      </div>
    </div>
  );
}

/* ================================================================
   IMAGE GENERATION / CREATE PAGE
   ================================================================ */
function ImageGenPage() {
  const { addToast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'image' | 'video' | 'sandbox'>('image');
  const [sandboxCode, setSandboxCode] = useState('print("Hello World")');
  const [sandboxLang, setSandboxLang] = useState('python');
  const [sandboxResult, setSandboxResult] = useState('');
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);

  const handleImageGen = async () => {
    if (!prompt.trim()) return addToast('Enter a prompt', 'warning');
    setLoading(true);
    try {
      const res = await generateImage(prompt);
      setImageUrl(res.url);
      addToast('Image generated!', 'success');
    } catch (err: any) {
      addToast(err.error || 'Generation failed', 'error');
    } finally { setLoading(false); }
  };

  const handleVideoGen = async () => {
    if (!videoPrompt.trim()) return addToast('Enter a prompt', 'warning');
    setVideoLoading(true);
    try {
      const res = await generateVideo(videoPrompt);
      setVideoUrl(res.url);
      addToast('Video generated!', 'success');
    } catch (err: any) {
      addToast(err.error || 'Generation failed', 'error');
    } finally { setVideoLoading(false); }
  };

  const handleSandbox = async () => {
    if (!sandboxCode.trim()) return addToast('Enter some code', 'warning');
    setSandboxLoading(true);
    try {
      const res = await runSandbox(sandboxCode, sandboxLang);
      setSandboxResult(JSON.stringify(res, null, 2));
      addToast('Code executed!', 'success');
    } catch (err: any) {
      setSandboxResult(`Error: ${err.error || 'Execution failed'}`);
      addToast('Execution failed', 'error');
    } finally { setSandboxLoading(false); }
  };

  return (
    <div className="pb-24">
      <Header title="Create" subtitle="Generate images, videos & run code" />

      <div className="px-4 flex gap-0 border-b border-gray-800 mt-1">
        {([['image', 'Image', <ImageIcon size={14} />], ['video', 'Video', <Play size={14} />], ['sandbox', 'Sandbox', <Terminal size={14} />]] as const).map(([t, l, icon]) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('flex-1 flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all',
              tab === t ? 'border-violet-500 text-violet-400' : 'border-transparent text-gray-500')}>
            {icon} {l}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {tab === 'image' && (
          <div className="space-y-4">
            <Input label="Image Prompt" value={prompt} onChange={setPrompt}
              placeholder="A futuristic cityscape at sunset, cyberpunk style..." multiline />
            <Button loading={loading} onClick={handleImageGen} className="w-full" size="lg" icon={<ImageIcon size={18} />}>
              Generate Image
            </Button>
            {imageUrl && (
              <div className="rounded-xl overflow-hidden border border-gray-800">
                <img src={imageUrl} alt="Generated" className="w-full" />
              </div>
            )}
          </div>
        )}

        {tab === 'video' && (
          <div className="space-y-4">
            <Input label="Video Prompt" value={videoPrompt} onChange={setVideoPrompt}
              placeholder="A drone flying over mountains at sunrise..." multiline />
            <Button loading={videoLoading} onClick={handleVideoGen} className="w-full" size="lg" icon={<Play size={18} />}>
              Generate Video
            </Button>
            {videoUrl && (
              <div className="rounded-xl overflow-hidden border border-gray-800">
                <video src={videoUrl} controls className="w-full" />
              </div>
            )}
          </div>
        )}

        {tab === 'sandbox' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <select value={sandboxLang} onChange={e => setSandboxLang(e.target.value)}
                className="bg-gray-900 border border-gray-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="ruby">Ruby</option>
                <option value="go">Go</option>
              </select>
            </div>
            <textarea value={sandboxCode} onChange={e => setSandboxCode(e.target.value)}
              placeholder="Write your code here..."
              className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none h-40" />
            <Button loading={sandboxLoading} onClick={handleSandbox} className="w-full" size="lg" icon={<Play size={18} />}>
              Run Code
            </Button>
            {sandboxResult && (
              <pre className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-xs text-emerald-400 font-mono overflow-x-auto max-h-48 whitespace-pre-wrap">
                {sandboxResult}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   SETTINGS PAGE
   ================================================================ */
function SettingsPage() {
  const { state: auth, logout: doLogout } = useAuth();
  const { navigate } = useNav();
  const { addToast } = useToast();
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKeys, setShowKeys] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const load = async () => {
      try {
        const [u, k] = await Promise.all([getUsage(), getApiKeys()]);
        setUsage(u);
        setKeys(k);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
  }, [auth.isAuthenticated]);

  const handleLogout = async () => {
    await doLogout();
    navigate('login');
    addToast('Logged out', 'info');
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return addToast('Enter a key name', 'warning');
    setCreatingKey(true);
    try {
      const key = await createApiKey(newKeyName.trim());
      setKeys(prev => [...prev, key]);
      setNewKeyName('');
      addToast('API key created!', 'success');
    } catch (err: any) {
      addToast(err.error || 'Failed to create key', 'error');
    } finally { setCreatingKey(false); }
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      await deleteApiKey(keyId);
      setKeys(prev => prev.filter(k => k.id !== keyId));
      addToast('Key deleted', 'success');
    } catch (err: any) {
      addToast(err.error || 'Failed to delete', 'error');
    }
  };

  if (loading && auth.isAuthenticated) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;

  if (!auth.isAuthenticated) return <LoginPage />;

  return (
    <div className="pb-24">
      <Header title="Settings" />

      <div className="px-4 py-4 space-y-4">
        {/* Profile Card */}
        <div className="bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/20 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <User size={26} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold text-white">{auth.user?.name || auth.user?.email || 'User'}</div>
            <div className="text-sm text-gray-400 truncate">{auth.user?.email}</div>
            <Badge variant="info">{auth.user?.role || 'user'}</Badge>
          </div>
        </div>

        {/* Usage Stats */}
        {usage && (
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <BarChart3 size={16} /> Usage
            </h3>
            <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Requests Today</span>
                <span className="text-sm font-semibold text-white">{usage.requestsToday}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div className="bg-gradient-to-r from-violet-500 to-indigo-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((usage.requestsToday / (usage.limit?.requests || 100)) * 100, 100)}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Total Requests</span>
                <span className="text-sm font-semibold text-white">{usage.requestsTotal}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Projects</span>
                <span className="text-sm font-semibold text-white">{usage.projectsCreated}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Tokens Used</span>
                <span className="text-sm font-semibold text-white">{usage.tokensUsed.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Storage</span>
                <span className="text-sm font-semibold text-white">{formatSize(usage.storageUsed)}</span>
              </div>
            </div>
          </div>
        )}

        {/* API Keys */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Key size={16} /> API Keys
            </h3>
            <button onClick={() => setShowKeys(true)} className="text-xs text-violet-400 flex items-center gap-1">
              <Plus size={14} /> Add Key
            </button>
          </div>
          {keys.length === 0 ? (
            <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6 text-center">
              <Key size={24} className="mx-auto mb-2 text-gray-600" />
              <p className="text-sm text-gray-500">No API keys yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {keys.map(k => (
                <div key={k.id} className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{k.name}</div>
                    <div className="text-xs text-gray-500 font-mono truncate">{k.key.slice(0, 8)}••••••••</div>
                    <div className="text-xs text-gray-600 mt-0.5">Created {timeAgo(k.createdAt)}</div>
                  </div>
                  <button onClick={() => handleDeleteKey(k.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button onClick={() => navigate('chat')} className="w-full bg-gray-900/50 border border-gray-800/50 rounded-xl p-4 flex items-center gap-3 active:scale-[0.99] transition-all">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <MessageSquare size={20} className="text-violet-400" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-white">AI Chat</div>
              <div className="text-xs text-gray-500">Start a new conversation</div>
            </div>
            <ChevronRight size={16} className="text-gray-600" />
          </button>

          <button onClick={() => navigate('projects')} className="w-full bg-gray-900/50 border border-gray-800/50 rounded-xl p-4 flex items-center gap-3 active:scale-[0.99] transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <FolderGit2 size={20} className="text-blue-400" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-white">My Projects</div>
              <div className="text-xs text-gray-500">View all your projects</div>
            </div>
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Logout */}
        <Button variant="danger" onClick={handleLogout} className="w-full mt-4" size="lg" icon={<LogOut size={18} />}>
          Sign Out
        </Button>

        <div className="text-center text-xs text-gray-700 pt-4">
          CloudForge v1.0 · API: {BASE_URL}
        </div>
      </div>

      {/* Create Key Modal */}
      <Modal open={showKeys} onClose={() => setShowKeys(false)} title="Create API Key">
        <div className="space-y-4">
          <Input label="Key Name" value={newKeyName} onChange={setNewKeyName} placeholder="My API Key" />
          <Button loading={creatingKey} onClick={handleCreateKey} className="w-full" size="lg">Create Key</Button>
        </div>
      </Modal>
    </div>
  );
}

/* ================================================================
   MAIN APP
   ================================================================ */
function AppContent() {
  const { state: auth } = useAuth();
  const { nav } = useNav();

  // Show login if not authenticated and on a protected page
  if (!auth.isAuthenticated && !auth.isLoading && nav.page !== 'login' && nav.page !== 'register') {
    return <LoginPage />;
  }

  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-500/30">
            <Sparkles size={32} className="text-white animate-pulse" />
          </div>
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  // Page Router
  const renderPage = () => {
    switch (nav.page) {
      case 'login': return <LoginPage />;
      case 'dashboard': return <DashboardPage />;
      case 'chat': return <ChatPage />;
      case 'projects': return <ProjectsPage />;
      case 'project-detail': return <ProjectDetailPage />;
      case 'file-editor': return <FileEditorPage />;
      case 'settings': return <SettingsPage />;
      case 'image-gen': return <ImageGenPage />;
      case 'sandbox': return <ImageGenPage />; // reuse with sandbox tab
      default: return <DashboardPage />;
    }
  };

  const showBottomNav = auth.isAuthenticated && ['dashboard', 'chat', 'projects', 'settings', 'image-gen', 'sandbox'].includes(nav.page);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-lg mx-auto relative">
        {renderPage()}
        {showBottomNav && <BottomNav />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <NavProvider>
          <AppContent />
        </NavProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
