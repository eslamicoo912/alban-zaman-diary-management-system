import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Customer, LoyaltySettings } from '../../types';
import { Gift, Award, Plus, Settings, History, Check, User, Phone, Mail } from 'lucide-react';

export const LoyaltyModule: React.FC = () => {
  const {
    t,
    customers,
    loyaltySettings,
    updateLoyaltySettings,
    loyaltyTransactions,
    addCustomer,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'customers' | 'history' | 'settings'>('customers');

  // Loyalty Settings Form
  const [settingsForm, setSettingsForm] = useState<LoyaltySettings>(loyaltySettings);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // New customer modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', email: '', address: '' });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateLoyaltySettings(settingsForm);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCust.name.trim() || !newCust.phone.trim()) return;

    addCustomer({
      name: newCust.name.trim(),
      phone: newCust.phone.trim(),
      email: newCust.email.trim() || undefined,
      address: newCust.address.trim() || undefined,
    });

    setNewCust({ name: '', phone: '', email: '', address: '' });
    setShowAddModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.loyaltyTitle}</h2>
          <p className="text-xs text-slate-500">
            {'إدارة برامج الولاء، حساب نقاط المكافآت، وسجل الاستبدال'}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-98 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>{t.addCustomer}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('customers')}
          className={`border-b-2 pb-2 px-3 transition-all ${
            activeTab === 'customers'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.customerDirectory} ({customers.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`border-b-2 pb-2 px-3 transition-all ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.loyaltyAuditTrail}
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`border-b-2 pb-2 px-3 transition-all ${
            activeTab === 'settings'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.loyaltySettings}
        </button>
      </div>

      {/* Customers List Tab */}
      {activeTab === 'customers' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs rtl:text-right">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
              <tr>
                <th className="py-3 px-4">{t.customer}</th>
                <th className="py-3 px-3">الهاتف</th>
                <th className="py-3 px-3 text-center">{t.pointsBalance}</th>
                <th className="py-3 px-3 text-right rtl:text-left">{t.loyaltyValue}</th>
                <th className="py-3 px-3 text-center">{t.totalEarned}</th>
                <th className="py-3 px-3 text-center">{t.totalRedeemed}</th>
                <th className="py-3 px-4">تاريخ الانضمام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map(c => {
                const equivalentValue = c.loyaltyPointsBalance * loyaltySettings.pointRedemptionValue;
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-600">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <div>{c.name}</div>
                          {c.email && <div className="text-[10px] text-slate-400 font-normal">{c.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">{c.phone}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-0.5 font-mono font-bold text-blue-700">
                        <Award className="h-3 w-3" />
                        {c.loyaltyPointsBalance} pts
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 rtl:text-left">
                      {equivalentValue.toFixed(2)} {t.currency}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-600">{c.totalPointsEarned}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-400">{c.totalPointsRedeemed}</td>
                    <td className="py-3 px-4 text-slate-400">{c.createdAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* History Log Tab */}
      {activeTab === 'history' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs rtl:text-right">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
              <tr>
                <th className="py-3 px-4">العميل</th>
                <th className="py-3 px-3">النوع</th>
                <th className="py-3 px-3 text-center">النقاط</th>
                <th className="py-3 px-3 text-right rtl:text-left">القيمة المعادلة</th>
                <th className="py-3 px-3">التاريخ</th>
                <th className="py-3 px-4">السبب / الملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loyaltyTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    لا توجد حركات نقاط مسجلة حتى الآن.
                  </td>
                </tr>
              ) : (
                loyaltyTransactions.map(tx => {
                  const isPositive = tx.points > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{tx.customerName}</td>
                      <td className="py-3 px-3 capitalize">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            tx.type === 'earned'
                              ? 'bg-blue-50 text-blue-700'
                              : tx.type === 'redeemed'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        <span className={isPositive ? 'text-blue-600' : 'text-slate-600'}>
                          {isPositive ? `+${tx.points}` : tx.points}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700 rtl:text-left">
                        {tx.amountEquivalent.toFixed(2)} {t.currency}
                      </td>
                      <td className="py-3 px-3 text-slate-400">{new Date(tx.date).toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">{tx.reason}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            {/* Toggle Enable */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <h4 className="font-bold text-slate-900">{t.enableLoyalty}</h4>
                <p className="text-[11px] text-slate-500">السماح للكاشير بمنح واسترداد النقاط عند إصدار الفواتير</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={settingsForm.enabled}
                  onChange={e => setSettingsForm({ ...settingsForm, enabled: e.target.checked })}
                  className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">{t.pointsEarnedRate}</label>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={settingsForm.pointsEarnedPerAmountSpent}
                onChange={e =>
                  setSettingsForm({
                    ...settingsForm,
                    pointsEarnedPerAmountSpent: parseFloat(e.target.value) || 10,
                  })
                }
                className="w-full rounded-xl border border-slate-200 p-2.5 font-bold"
              />
              <p className="mt-1 text-[10px] text-slate-400">Example: 10 means 1 point per 10 {t.currency} spent.</p>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">{t.redemptionRate}</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={settingsForm.pointRedemptionValue}
                onChange={e =>
                  setSettingsForm({
                    ...settingsForm,
                    pointRedemptionValue: parseFloat(e.target.value) || 0.1,
                  })
                }
                className="w-full rounded-xl border border-slate-200 p-2.5 font-bold"
              />
              <p className="mt-1 text-[10px] text-slate-400">Example: 0.10 means 100 points = 10 {t.currency} discount.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">{t.minPointsRedeem}</label>
                <input
                  type="number"
                  step="5"
                  min="0"
                  required
                  value={settingsForm.minPointsForRedemption}
                  onChange={e =>
                    setSettingsForm({
                      ...settingsForm,
                      minPointsForRedemption: parseFloat(e.target.value) || 50,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">{t.maxOrderPercent}</label>
                <input
                  type="number"
                  step="5"
                  min="10"
                  max="100"
                  required
                  value={settingsForm.maxPercentPayableWithPoints}
                  onChange={e =>
                    setSettingsForm({
                      ...settingsForm,
                      maxPercentPayableWithPoints: parseFloat(e.target.value) || 50,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              {settingsSaved && (
                <span className="flex items-center gap-1 font-bold text-blue-600">
                  <Check className="h-4 w-4" /> Settings Saved!
                </span>
              )}
              <div className="ml-auto">
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-98 transition-all"
                >
                  {t.saveSettings}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">{t.addCustomer}</h3>
            <form onSubmit={handleCreateCustomer} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">{t.customer} Name *</label>
                <input
                  type="text"
                  required
                  value={newCust.name}
                  onChange={e => setNewCust({ ...newCust, name: e.target.value })}
                  placeholder="مثال: فيصل السبيعي"
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">الهاتف Number *</label>
                <input
                  type="tel"
                  required
                  value={newCust.phone}
                  onChange={e => setNewCust({ ...newCust, phone: e.target.value })}
                  placeholder="05xxxxxxxx"
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-mono"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={newCust.email}
                  onChange={e => setNewCust({ ...newCust, email: e.target.value })}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">عنوان التوصيل / الحي</label>
                <input
                  type="text"
                  value={newCust.address}
                  onChange={e => setNewCust({ ...newCust, address: e.target.value })}
                  placeholder="مثال: الملقا، الرياض"
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
