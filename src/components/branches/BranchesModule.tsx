import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Branch } from '../../types';
import { Building2, Plus, CheckCircle2, MapPin, Phone, Check } from 'lucide-react';

export const BranchesModule: React.FC = () => {
  const { t, branches, activeBranchId, setActiveBranchId, addBranch } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    nameAr: '',
    code: '',
    address: '',
    phone: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) return;

    addBranch({
      name: form.name.trim(),
      nameAr: form.nameAr.trim(),
      code: form.code.trim().toUpperCase(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      isActive: true,
    });

    setForm({
      name: '',
      nameAr: '',
      code: '',
      address: '',
      phone: '',
    });
    setShowAddModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.branchesTitle}</h2>
          <p className="text-xs text-slate-500">
            {'إدارة منافذ ومستودعات الألبان، وتحديد الفرع النشط لعمليات الكاشير'}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-98 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>{t.addBranch}</span>
        </button>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {branches.map(b => {
          const isSelected = b.id === activeBranchId;
          return (
            <div
              key={b.id}
              className={`relative rounded-2xl border p-5 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/20 shadow-md ring-1 ring-blue-500'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                    {b.code}
                  </span>
                  <h3 className="mt-2 text-base font-bold text-slate-900">
                    {b.nameAr}
                  </h3>
                  <div className="text-xs text-slate-500">{b.name}</div>
                </div>

                {isSelected ? (
                  <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-800">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{t.activeBranch}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveBranchId(b.id)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {t.switchBranch}
                  </button>
                )}
              </div>

              <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{b.address}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-mono">{b.phone}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Branch Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">{t.addBranch}</h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">الفرع Name (EN) *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: فرع الروضة"
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">الفرع Name (AR) *</label>
                <input
                  type="text"
                  required
                  value={form.nameAr}
                  onChange={e => setForm({ ...form, nameAr: e.target.value })}
                  placeholder="مثال: فرع الروضة"
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Code *</label>
                  <input
                    type="text"
                    required
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value })}
                    placeholder="مثال: RWD-03"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">الهاتف</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="011-xxxxxxx"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">العنوان</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="الحي، المدينة"
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-98 transition-all"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
