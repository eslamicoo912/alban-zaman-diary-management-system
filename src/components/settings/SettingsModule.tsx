import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { apiFetch } from '../../api/client';
import {
  Scale,
  Save,
  RotateCcw,
  ToggleLeft,
  ToggleRight,
  Info,
  Trash2,
  DatabaseBackup,
} from 'lucide-react';

const DEFAULT_PREFIX = '99';

export const SettingsModule: React.FC = () => {
  const {
    t,
    scannerSettings,
    updateScannerSettings,
    resetScannerSettings,
    resetAllDemoData,
    wipeAllData,
  } = useApp();

  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [wipeText, setWipeText] = useState('');
  const [wiping, setWiping] = useState(false);

  const handleFullWipe = async () => {
    if (wipeText.trim().toUpperCase() !== 'DELETE') return;
    setWiping(true);
    try {
      const res: any = await apiFetch('/reset', { method: 'POST' });
      if (res && res.ok) {
        wipeAllData();
        window.location.reload();
        return;
      }
      setSavedMsg(`فشل المسح: ${res?.error || ''}`);
    } catch {
      setSavedMsg('فشل المسح (الخادم غير متاح)');
    }
    setWiping(false);
  };

  const [scalePrefix, setScalePrefix] = useState(scannerSettings.weightedBarcodePrefix);
  const [scaleEnabled, setScaleEnabled] = useState(scannerSettings.parseWeightedBarcodes);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const showMsg = (msg: string) => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(null), 2500);
  };

  const saveScale = (e: React.FormEvent) => {
    e.preventDefault();
    updateScannerSettings({
      weightedBarcodePrefix: scalePrefix.trim() || '99',
      parseWeightedBarcodes: scaleEnabled,
    });
    showMsg('تم حفظ إعدادات جهاز الوزن');
  };

  const resetAll = () => {
    resetScannerSettings();
    setScalePrefix(DEFAULT_PREFIX);
    setScaleEnabled(true);
    showMsg('تمت إعادة الضبط للافتراضي');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{'الإعدادات'}</h2>
          <p className="text-xs text-slate-500">
            {'جهاز الوزن الإلكتروني (الميزان) وقواعد التشغيل'}
          </p>
        </div>
        <button
          onClick={resetAll}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {'استعادة الافتراضي'}
        </button>
      </div>

      {savedMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700">
          {savedMsg}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Weigh-Scale (Balance) Settings */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
              <Scale className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">{'جهاز الوزن / الميزان'}</h3>
              <p className="text-[10px] text-slate-400">{'الباركود الأولي للميزان (Prefix)'}</p>
            </div>
          </div>

          <form onSubmit={saveScale} className="mt-4 space-y-3 text-xs">
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                {'بادئة الباركود الموزون (مثال: 99 أو 20)'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={scalePrefix}
                  onChange={e => setScalePrefix(e.target.value)}
                  placeholder="99"
                  className="w-28 rounded-xl border border-slate-200 p-2.5 font-mono text-center text-sm font-bold"
                />
                <span className="flex-1 rounded-xl bg-slate-50 px-3 py-2.5 font-mono text-[11px] text-slate-500">
                  {`المنتج الممسوح سيُقرأ كوزن مباشرة (مثال: ${scalePrefix || '99'} + رقم المنتج)`}
                </span>
              </div>
            </div>

            <label className="flex cursor-pointer items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Info className="h-3.5 w-3.5 text-slate-400" />
                {'تفسير الباركود الموزون تلقائياً'}
              </span>
              <button
                type="button"
                onClick={() => setScaleEnabled(!scaleEnabled)}
                className="text-emerald-600"
              >
                {scaleEnabled ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6 text-slate-300" />}
              </button>
            </label>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <Save className="h-3.5 w-3.5" />
              {t.save}
            </button>
          </form>
        </div>
      </div>

      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] leading-relaxed text-slate-500">
        {'تُحفظ الإعدادات محلياً وتُزامن مع الخادم.'}
      </p>

      {/* Data Reset */}
      <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100">
            <Trash2 className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">{'مسح كل البيانات والبدء من جديد'}</h3>
            <p className="text-[10px] text-slate-500">
              {'يحذف جميع المنتجات والفواتير والموظفين والتجارب ويستعيد البيانات التجريبية الأصلية'}
            </p>
          </div>
        </div>
        {confirmReset ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-rose-200 bg-white p-3">
            <span className="text-xs font-bold text-rose-700">
              {'هل أنت متأكد؟ سيتم فقدان كل البيانات الحالية.'}
            </span>
            <button
              onClick={() => {
                resetAllDemoData();
                setConfirmReset(false);
                window.location.reload();
              }}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
            >
              {'نعم، امسح كل شيء'}
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              {t.cancel}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {'مسح البيانات الآن'}
          </button>
        )}
      </div>

      {/* Full System Wipe */}
      <div className="rounded-2xl border border-rose-300 bg-rose-50/60 p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white">
            <DatabaseBackup className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-rose-900">
              {'مسح النظام نهائياً (المنتجات والبيانات)'}
            </h3>
            <p className="text-[10px] text-rose-700/70">
              {'يحذف جميع المنتجات والفواتير والموظفين مع الاحتفاظ بالإعدادات'}
            </p>
          </div>
        </div>

        {confirmWipe ? (
          <div className="mt-3 space-y-3 rounded-xl border border-rose-300 bg-white p-4">
            <div className="text-xs font-bold text-rose-700">
              {'⚠️ إجراء غير قابل للتراجع. اكتب DELETE في المربع ثم اضغط مسح نهائي.'}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={wipeText}
                onChange={e => setWipeText(e.target.value)}
                placeholder="DELETE"
                className="w-36 rounded-xl border border-slate-300 p-2 text-center font-mono text-sm font-bold uppercase"
              />
              <button
                onClick={handleFullWipe}
                disabled={wipeText.trim().toUpperCase() !== 'DELETE' || wiping}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {wiping ? ('...جارٍ المسح') : ('مسح نهائي')}
              </button>
              <button
                onClick={() => { setConfirmWipe(false); setWipeText(''); }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmWipe(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {'مسح النظام بالكامل'}
          </button>
        )}
      </div>
    </div>
  );
};