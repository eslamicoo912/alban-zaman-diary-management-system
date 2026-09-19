import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AppUser, AccountRole } from '../../types';
import {
  Users,
  UserPlus,
  ShieldCheck,
  KeyRound,
  Trash2,
  Power,
  X,
  Save,
  AlertTriangle,
} from 'lucide-react';

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: 'يرجى إدخال جميع الحقول المطلوبة.',
  weak_password: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل.',
  username_taken: 'اسم المستخدم مستخدم بالفعل.',
  forbidden: 'ليس لديك صلاحية للقيام بهذا الإجراء.',
};

const roleLabel = (role: AccountRole) => (role === 'admin' ? 'مدير النظام' : 'مستخدم');

export const UsersModule: React.FC = () => {
  const { users, currentUser, isAdmin, createUser, updateUser, deleteUser, changePassword } = useApp();

  const [tab, setTab] = useState<'list' | 'add'>('list');
  const [showAdd, setShowAdd] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [form, setForm] = useState({ username: '', fullName: '', password: '', role: 'user' as AccountRole });
  const [busy, setBusy] = useState(false);

  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  const adminIds = users.filter((u) => u.role === 'admin').map((u) => u.id);

  const showMsg = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const result = await createUser(form);
    if (result.ok) {
      showMsg('ok', 'تم إنشاء المستخدم بنجاح.');
      setForm({ username: '', fullName: '', password: '', role: 'user' });
      setShowAdd(false);
      setTab('list');
    } else {
      showMsg('err', ERROR_MESSAGES[result.error || ''] || 'تعذّر إنشاء المستخدم.');
    }
    setBusy(false);
  };

  const toggleActive = (user: AppUser) => {
    if (!isAdmin) return;
    if (user.id === currentUser?.id) {
      showMsg('err', 'لا يمكنك تعطيل حسابك الحالي.');
      return;
    }
    if (!user.isActive && user.role === 'admin' && adminIds.length === 1) {
      showMsg('err', 'لا يمكنك تعطيل آخر حساب مدير.');
      return;
    }
    updateUser({ ...user, isActive: !user.isActive });
  };

  const handleDelete = (user: AppUser) => {
    if (!isAdmin) return;
    if (user.id === currentUser?.id) {
      showMsg('err', 'لا يمكنك حذف حسابك الحالي.');
      return;
    }
    if (user.role === 'admin' && adminIds.length === 1) {
      showMsg('err', 'لا يمكنك حذف آخر حساب مدير.');
      return;
    }
    if (window.confirm(`حذف المستخدم "${user.fullName}"؟`)) {
      deleteUser(user.id);
      showMsg('ok', 'تم حذف المستخدم.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId || resetBusy) return;
    setResetBusy(true);
    const result = await changePassword(resetUserId, newPassword);
    if (result.ok) {
      showMsg('ok', 'تم تحديث كلمة المرور.');
      setResetUserId(null);
      setNewPassword('');
    } else {
      showMsg('err', ERROR_MESSAGES[result.error || ''] || 'تعذّر تحديث كلمة المرور.');
    }
    setResetBusy(false);
  };

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-slate-300" />
        {'هذه الصفحة متاحة لمدير النظام فقط.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{'المستخدمون وصلاحيات الدخول'}</h2>
          <p className="text-xs text-slate-500">{'إدارة حسابات الموظفين والأدوار (المدير فقط).'}</p>
        </div>
        <button
          onClick={() => setTab('list')}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          <Users className="h-3.5 w-3.5" />
          {`المستخدمون (${users.length})`}
        </button>
      </div>

      {msg && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-xs font-bold ${
            msg.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {msg.text}
        </div>
      )}

      {tab === 'add' || showAdd ? (
        <form onSubmit={handleAdd} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
              <UserPlus className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-sm font-black text-slate-900">{'إنشاء مستخدم جديد'}</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">{'الاسم الكامل'}</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="محمد أحمد"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold focus:border-blue-500 focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">{'اسم المستخدم'}</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="cashier1"
                autoComplete="off"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold focus:border-blue-500 focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">{'كلمة المرور'}</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold focus:border-blue-500 focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">{'الدور'}</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as AccountRole })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold focus:border-blue-500 focus:bg-white focus:outline-hidden"
              >
                <option value="user">مستخدم</option>
                <option value="admin">مدير النظام</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              {busy ? '...جارٍ الإنشاء' : 'إنشاء المستخدم'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAdd(false);
                setTab('list');
              }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              {('إلغاء')}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex items-center justify-end">
            <button
              onClick={() => {
                setShowAdd(true);
                setTab('add');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {'إضافة مستخدم'}
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-xs rtl:text-right">
                <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-500">
                  <tr>
                    <th className="py-2.5 px-4">{'المستخدم'}</th>
                    <th className="py-2.5 px-3">{'الدور'}</th>
                    <th className="py-2.5 px-3">{'الحالة'}</th>
                    <th className="py-2.5 px-3">{'آخر دخول'}</th>
                    <th className="py-2.5 px-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{u.fullName}</div>
                        <div className="font-mono text-[10px] text-slate-400">@{u.username}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                            u.role === 'admin'
                              ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                              : 'border-slate-200 bg-slate-100 text-slate-600'
                          }`}
                        >
                          <ShieldCheck className="h-3 w-3" />
                          {roleLabel(u.role)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                            u.isActive ? 'text-emerald-600' : 'text-rose-500'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                          {u.isActive ? 'نشط' : 'معطّل'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleString('ar-EG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : 'لم يسجل بعد'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setResetUserId(u.id); setNewPassword(''); }}
                            title="تغيير كلمة المرور"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleActive(u)}
                            disabled={u.id === currentUser?.id}
                            title={u.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-30"
                          >
                            <Power className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            title="حذف المستخدم"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-2.5 text-[11px] leading-relaxed text-amber-800">
            <AlertTriangle className="mb-0.5 ml-1 inline h-3.5 w-3.5" />
            {'يجب أن يبقى حساب مدير واحد نشط على الأقل. لا يمكن حذف أو تعطيل الحساب المستخدم حالياً.'}
          </p>
        </>
      )}

      {/* Reset password modal */}
      {resetUserId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm"
          onClick={() => setResetUserId(null)}
        >
          <form
            onSubmit={handleResetPassword}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900">{'تغيير كلمة المرور'}</h3>
              </div>
              <button type="button" onClick={() => setResetUserId(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              type="text"
              value={users.find((u) => u.id === resetUserId)?.fullName || ''}
              readOnly
              disabled
              className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-500"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="كلمة المرور الجديدة"
              autoFocus
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold focus:border-blue-500 focus:bg-white focus:outline-hidden"
            />
            <div className="mt-4 flex items-center gap-2">
              <button
                type="submit"
                disabled={resetBusy || newPassword.length < 4}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-40"
              >
                {resetBusy ? '...جارٍ الحفظ' : 'حفظ'}
              </button>
              <button
                type="button"
                onClick={() => setResetUserId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {('إلغاء')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};