import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, User, Milk, Eye, EyeOff, ShieldCheck, LogIn } from 'lucide-react';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'اسم المستخدم أو كلمة المرور غير صحيحة',
  account_disabled: 'هذا الحساب معطّل، تواصل مع المدير.',
  missing_fields: 'يرجى إدخال جميع الحقول المطلوبة.',
  forbidden: 'ليس لديك صلاحية للقيام بهذا الإجراء.',
};

export const LoginScreen: React.FC = () => {
  const { login, users, t } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hasOnlyDefaultAdmin = users.length <= 1 && users.some((u) => u.username === 'admin');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    const result = await login(username, password);
    if (!result.ok) {
      setError(ERROR_MESSAGES[result.error || ''] || 'تعذّر تسجيل الدخول.');
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-4 font-sans">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <Milk className="h-8 w-8 text-blue-300" />
          </div>
          <h1 className="text-2xl font-black text-white">{t.appName || 'ألبان زمان'}</h1>
          <p className="mt-1 text-xs text-slate-400">{'نظام نقاط البيع — تسجيل الدخول'}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-white/95 p-6 shadow-2xl backdrop-blur"
        >
          <div className="mb-4 flex items-center gap-2 text-slate-800">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-black">{'دخول آمن'}</span>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          <label className="mb-1.5 block text-xs font-bold text-slate-600">{'اسم المستخدم'}</label>
          <div className="relative mb-3">
            <User className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 right-3" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              placeholder="admin"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-9 pl-3 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden"
            />
          </div>

          <label className="mb-1.5 block text-xs font-bold text-slate-600">{'كلمة المرور'}</label>
          <div className="relative mb-4">
            <Lock className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 right-3" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-9 pl-10 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 left-3"
              tabIndex={-1}
              aria-label="إظهار كلمة المرور"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-black text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {busy ? '...جارٍ الدخول' : 'تسجيل الدخول'}
          </button>

          {hasOnlyDefaultAdmin && (
            <p className="mt-4 rounded-xl bg-blue-50 px-3 py-2 text-center text-[11px] font-semibold text-blue-700">
              {'الدخول الافتراضي: admin / admin123 — يُنصح بتغيير كلمة المرور من الإعدادات.'}
            </p>
          )}
        </form>

        <p className="mt-4 text-center text-[10px] text-slate-500">
          {'© ألبان زمان — جميع الحقوق محفوظة'}
        </p>
      </div>
    </div>
  );
};
