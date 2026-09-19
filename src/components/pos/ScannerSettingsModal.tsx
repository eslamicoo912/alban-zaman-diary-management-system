import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ScannerSettings, ScannerSensitivityPreset, Product } from '../../types';
import { matchProductBarcode } from '../../utils/barcodeParser';
import { scannerAudio } from '../../utils/scannerAudio';
import {
  X,
  Sliders,
  Barcode,
  Zap,
  Volume2,
  VolumeX,
  RotateCcw,
  Check,
  Plus,
  Scale,
  Sparkles,
  Search,
  Activity,
  Gauge
} from 'lucide-react';

interface ScannerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateScan?: (barcode: string) => void;
}

export const ScannerSettingsModal: React.FC<ScannerSettingsModalProps> = ({
  isOpen,
  onClose,
  onSimulateScan,
}) => {
  const { t, scannerSettings, updateScannerSettings, resetScannerSettings, products } = useApp();

  // Local draft state for quick editing
  const [settings, setSettings] = useState<ScannerSettings>(scannerSettings);
  const [newPrefixInput, setNewPrefixInput] = useState('');
  const [activeTab, setActiveTab] = useState<'prefixes' | 'sensitivity' | 'tester'>('prefixes');

  // Diagnostics & Tester state
  const [testInput, setTestInput] = useState('');
  const [measuredSpeeds, setMeasuredSpeeds] = useState<number[]>([]);
  const [lastCharTime, setLastCharTime] = useState<number>(0);
  const [testMatch, setTestMatch] = useState<ReturnType<typeof matchProductBarcode>>(null);
  const [isHardwareScanner, setIsHardwareScanner] = useState<boolean | null>(null);
  const [testLog, setTestLog] = useState<string[]>([]);
  const testInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSettings(scannerSettings);
  }, [scannerSettings, isOpen]);

  if (!isOpen) return null;

  // Preset configuration
  const handlePresetSelect = (preset: ScannerSensitivityPreset) => {
    let ms = 45;
    if (preset === 'ultra') ms = 25;
    else if (preset === 'fast') ms = 45;
    else if (preset === 'normal') ms = 70;
    else if (preset === 'relaxed') ms = 120;
    else ms = settings.sensitivityMs;

    setSettings(prev => ({
      ...prev,
      sensitivityPreset: preset,
      sensitivityMs: ms,
    }));
  };

  const handleAddPrefix = (prefixToAdd: string) => {
    const clean = prefixToAdd.trim();
    if (!clean) return;
    if (settings.customPrefixes.includes(clean)) return;

    setSettings(prev => ({
      ...prev,
      customPrefixes: [...prev.customPrefixes, clean],
      defaultPrefix: prev.defaultPrefix || clean,
    }));
    setNewPrefixInput('');
  };

  const handleRemovePrefix = (prefixToRemove: string) => {
    setSettings(prev => {
      const updated = prev.customPrefixes.filter(p => p !== prefixToRemove);
      return {
        ...prev,
        customPrefixes: updated,
        defaultPrefix: prev.defaultPrefix === prefixToRemove ? (updated[0] || '') : prev.defaultPrefix,
      };
    });
  };

  const handleSaveAndApply = () => {
    updateScannerSettings(settings);
    if (settings.audioFeedback) {
      scannerAudio.playSuccessBeep();
    }
    onClose();
  };

  const handleResetDefaults = () => {
    if (confirm(t.confirm + ': ' + t.resetToDefaults + '?')) {
      resetScannerSettings();
      onClose();
    }
  };

  // Test input handler with speed measurement
  const handleTestKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = performance.now();
    if (lastCharTime > 0 && e.key.length === 1) {
      const delta = Math.round(now - lastCharTime);
      setMeasuredSpeeds(prev => [...prev.slice(-15), delta]);
    }
    setLastCharTime(now);

    if (e.key === 'Enter') {
      e.preventDefault();
      evaluateTestBarcode(testInput);
    }
  };

  const handleTestInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTestInput(val);

    // Instant match in tester if enabled
    if (settings.instantMatchAutoAdd && val.length >= settings.minBarcodeLength) {
      evaluateTestBarcode(val, true);
    }
  };

  const evaluateTestBarcode = (raw: string, isInstant = false) => {
    const match = matchProductBarcode(raw, products, settings);
    setTestMatch(match);

    const avgSpeed =
      measuredSpeeds.length > 0
        ? Math.round(measuredSpeeds.reduce((a, b) => a + b, 0) / measuredSpeeds.length)
        : null;

    const detectedHardware = avgSpeed !== null && avgSpeed <= settings.sensitivityMs;
    setIsHardwareScanner(detectedHardware);

    const logEntry = match
      ? `✅ تم التعرف على "${match.product.name}" (${match.matchedBy}) | السرعة: ${avgSpeed ? `${avgSpeed}ms` : 'يدوي'}`
      : `❌ الباركود "${raw}" غير معروف | السرعة: ${avgSpeed ? `${avgSpeed}ms` : 'يدوي'}`;

    setTestLog(prev => [logEntry, ...prev.slice(0, 4)]);

    if (settings.audioFeedback) {
      if (match) scannerAudio.playSuccessBeep();
      else if (!isInstant) scannerAudio.playErrorBeep();
    }
  };

  const testProductSimulate = (product: Product) => {
    setTestInput(product.barcode);
    evaluateTestBarcode(product.barcode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Barcode className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{t.scannerSettingsTitle}</h2>
              <p className="text-xs text-slate-500">{t.scannerSettingsSubtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 px-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('prefixes')}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 transition-colors ${
              activeTab === 'prefixes'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Barcode className="h-4 w-4" />
            <span>{t.barcodePrefixes}</span>
            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700 font-bold">
              {settings.customPrefixes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sensitivity')}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 transition-colors ${
              activeTab === 'sensitivity'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>{t.scannerSensitivity}</span>
            <span className="rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[10px] text-slate-700 font-mono">
              {settings.sensitivityMs}ms
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tester')}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 transition-colors ${
              activeTab === 'tester'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>{t.scannerTester}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* TAB 1: BARCODE PREFIXES & SCALE CONFIG */}
          {activeTab === 'prefixes' && (
            <div className="space-y-5">
              {/* Active Prefixes Chips */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{t.activePrefixes}</h3>
                    <p className="text-slate-500 text-[11px]">{t.customPrefixesDesc}</p>
                  </div>
                </div>

                {/* Chips */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {settings.customPrefixes.length === 0 ? (
                    <span className="text-slate-400 italic">لا توجد بادئات مخصصة</span>
                  ) : (
                    settings.customPrefixes.map(prefix => (
                      <div
                        key={prefix}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-xs font-semibold ${
                          settings.defaultPrefix === prefix
                            ? 'border-blue-500 bg-blue-50 text-blue-800'
                            : 'border-slate-200 bg-white text-slate-800'
                        }`}
                      >
                        <span>{prefix}</span>
                        {settings.defaultPrefix === prefix && (
                          <span className="rounded-md bg-blue-200/70 px-1 text-[9px] font-bold text-blue-800 uppercase">
                            Default
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemovePrefix(prefix)}
                          className="text-slate-400 hover:text-rose-600 transition-colors ml-0.5"
                          title="إزالة البادئة"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Custom Prefix Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t.prefixPlaceholder}
                    value={newPrefixInput}
                    onChange={e => setNewPrefixInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPrefix(newPrefixInput);
                      }
                    }}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddPrefix(newPrefixInput)}
                    className="flex items-center gap-1 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-900 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{t.addPrefix}</span>
                  </button>
                </div>

                {/* Preset Suggestions */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                  <span className="text-slate-400 font-medium">قوالب سريعة:</span>
                  <button
                    type="button"
                    onClick={() => handleAddPrefix('628')}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] hover:border-blue-400 hover:text-blue-600"
                  >
                    + 628 (Saudi GS1)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPrefix('20')}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] hover:border-blue-400 hover:text-blue-600"
                  >
                    + 20 (Scale/Weight)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPrefix('99')}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] hover:border-blue-400 hover:text-blue-600"
                  >
                    + 99 (In-store Deli)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPrefix('DRY-')}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] hover:border-blue-400 hover:text-blue-600"
                  >
                    + DRY- (Store Prefix)
                  </button>
                </div>
              </div>

              {/* Default Prefix Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 p-4 bg-white">
                  <label className="block font-bold text-slate-900 mb-1">{t.defaultPrefix}</label>
                  <p className="text-[11px] text-slate-500 mb-2">تُستخدم للإضافة التلقائية عند إدخال باركود قصير</p>
                  <select
                    value={settings.defaultPrefix}
                    onChange={e => setSettings(prev => ({ ...prev, defaultPrefix: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-2 text-xs font-mono font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  >
                    <option value="">بدون (تعطيل الإضافة التلقائية)</option>
                    {settings.customPrefixes.map(p => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Smart Prefix Matching Toggle */}
                <div className="rounded-xl border border-slate-200 p-4 bg-white flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{t.smartPrefixMatching}</span>
                      <input
                        type="checkbox"
                        checked={settings.stripPrefixOnMatch}
                        onChange={e =>
                          setSettings(prev => ({
                            ...prev,
                            stripPrefixOnMatch: e.target.checked,
                            autoPrependDefaultPrefix: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{t.smartPrefixDesc}</p>
                  </div>
                  <span className="text-[10px] text-blue-600 font-semibold mt-2">
                    {settings.stripPrefixOnMatch ? '✓ Enabled: Stripping & Prepending Active' : '○ Disabled'}
                  </span>
                </div>
              </div>

              {/* Variable Weight Electronic Scale Barcodes */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800 shrink-0">
                      <Scale className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{t.scaleBarcodeTitle}</h4>
                      <p className="text-slate-500 text-[11px] mt-0.5">{t.scaleBarcodeDesc}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.parseWeightedBarcodes}
                    onChange={e => setSettings(prev => ({ ...prev, parseWeightedBarcodes: e.target.checked }))}
                    className="h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 mt-1"
                  />
                </div>

                {settings.parseWeightedBarcodes && (
                  <div className="mt-3.5 pt-3 border-t border-slate-200/80 flex flex-wrap items-center gap-3">
                    <label className="text-[11px] font-semibold text-slate-700 shrink-0">
                      {t.scaleBarcodePrefix}:
                    </label>
                    <input
                      type="text"
                      value={settings.weightedBarcodePrefix}
                      onChange={e => setSettings(prev => ({ ...prev, weightedBarcodePrefix: e.target.value }))}
                      placeholder="20 or 99"
                      className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    />
                    <span className="text-[11px] text-slate-500">
                      Format: <code className="bg-white px-1 py-0.5 rounded-sm border font-bold text-slate-800">Prefix(2) + PLU(5) + Grams(5) + C</code> · 99 &amp; 20 auto-detected
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SENSITIVITY & SPEED */}
          {activeTab === 'sensitivity' && (
            <div className="space-y-5">
              {/* Presets Grid */}
              <div>
                <label className="block font-bold text-slate-900 mb-1">{t.sensitivityPreset}</label>
                <p className="text-slate-500 text-[11px] mb-3">{t.scannerSensitivityDesc}</p>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {[
                    { id: 'ultra', label: 'فائق السرعة', time: '25ms', desc: 'ليزر / ماسحات الصور ثنائية البعد' },
                    { id: 'fast', label: 'سريع (افتراضي)', time: '45ms', desc: 'قارئ باركود قياسي' },
                    { id: 'normal', label: 'متوازن', time: '70ms', desc: 'مختلط / بلوتوث' },
                    { id: 'relaxed', label: 'مريح', time: '120ms', desc: 'محاكاة لوحة المفاتيح' },
                  ].map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetSelect(preset.id as ScannerSensitivityPreset)}
                      className={`flex flex-col rounded-xl border p-3 text-left transition-all ${
                        settings.sensitivityPreset === preset.id
                          ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">{preset.label}</span>
                        <span className="font-mono text-[10px] font-bold text-blue-600">{preset.time}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1">{preset.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fine-Tuning Slider */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900">{t.interKeyTimeout}</span>
                  <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 font-mono font-bold text-blue-600">
                    {settings.sensitivityMs} ms
                  </span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="180"
                  step="5"
                  value={settings.sensitivityMs}
                  onChange={e =>
                    setSettings(prev => ({
                      ...prev,
                      sensitivityMs: Number(e.target.value),
                      sensitivityPreset: 'custom',
                    }))
                  }
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>15ms (Ultra Strict)</span>
                  <span>45ms (Optimal)</span>
                  <span>180ms (Lenient)</span>
                </div>
              </div>

              {/* Minimum Barcode Length */}
              <div className="rounded-xl border border-slate-200 p-4 bg-white flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">{t.minBarcodeLengthLabel}</h4>
                  <p className="text-[11px] text-slate-500">يتجاهل الضغطات العرضية الأقصر من هذا الحد</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="2"
                    max="16"
                    value={settings.minBarcodeLength}
                    onChange={e =>
                      setSettings(prev => ({
                        ...prev,
                        minBarcodeLength: Math.max(2, Number(e.target.value)),
                      }))
                    }
                    className="w-16 rounded-xl border border-slate-200 bg-slate-50/70 p-2 text-center font-mono font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-500 font-medium">أرقام</span>
                </div>
              </div>

              {/* Fast Toggles: Instant Identification & Always-Active Scanning */}
              <div className="space-y-3">
                {/* Instant Identification */}
                <div className="rounded-xl border border-slate-200 p-4 bg-white flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <h4 className="font-bold text-slate-900">{t.instantIdentification}</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{t.instantIdentificationDesc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.instantMatchAutoAdd}
                    onChange={e => setSettings(prev => ({ ...prev, instantMatchAutoAdd: e.target.checked }))}
                    className="h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>

                {/* Always-Active Background Scanning */}
                <div className="rounded-xl border border-slate-200 p-4 bg-white flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Gauge className="h-4 w-4 text-blue-600" />
                      <h4 className="font-bold text-slate-900">{t.backgroundScanning}</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{t.backgroundScanningDesc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableGlobalKeystrokeListener}
                    onChange={e => setSettings(prev => ({ ...prev, enableGlobalKeystrokeListener: e.target.checked }))}
                    className="h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>

                {/* Audio Beep Confirmation */}
                <div className="rounded-xl border border-slate-200 p-4 bg-white flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      {settings.audioFeedback ? (
                        <Volume2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <VolumeX className="h-4 w-4 text-slate-400" />
                      )}
                      <h4 className="font-bold text-slate-900">{t.audioFeedback}</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{t.audioFeedbackDesc}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => scannerAudio.playSuccessBeep()}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      {t.testSound} 🔊
                    </button>
                    <input
                      type="checkbox"
                      checked={settings.audioFeedback}
                      onChange={e => setSettings(prev => ({ ...prev, audioFeedback: e.target.checked }))}
                      className="h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INTERACTIVE SCANNER TESTER */}
          {activeTab === 'tester' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <label className="block font-bold text-slate-900 mb-1">{t.scannerTester}</label>
                <p className="text-[11px] text-slate-500 mb-3">{t.scannerTesterPlaceholder}</p>

                <div className="relative">
                  <input
                    ref={testInputRef}
                    type="text"
                    value={testInput}
                    onChange={handleTestInputChange}
                    onKeyDown={handleTestKeyDown}
                    placeholder="امسح باركوداً فعلياً أو اكتب بسرعة هنا..."
                    className="w-full rounded-xl border-2 border-blue-500/80 bg-white p-3 font-mono text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    autoFocus
                  />
                  {testInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setTestInput('');
                        setTestMatch(null);
                        setMeasuredSpeeds([]);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Speed Metrics Display */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white border border-slate-200 p-3">
                    <span className="text-[10px] text-slate-500 font-semibold block">{t.testedSpeed}</span>
                    <span className="text-base font-mono font-bold text-slate-900">
                      {measuredSpeeds.length > 0
                        ? `${Math.round(measuredSpeeds.reduce((a, b) => a + b, 0) / measuredSpeeds.length)} ms`
                        : '--'}
                    </span>
                  </div>

                  <div className="rounded-xl bg-white border border-slate-200 p-3">
                    <span className="text-[10px] text-slate-500 font-semibold block">{t.charsDetected}</span>
                    <span className="text-base font-mono font-bold text-slate-900">{testInput.length} chars</span>
                  </div>

                  <div className="rounded-xl bg-white border border-slate-200 p-3 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-500 font-semibold block">مصنف المصدر</span>
                    <span
                      className={`text-xs font-bold inline-block px-1.5 py-0.5 rounded-md mt-0.5 ${
                        isHardwareScanner === true
                          ? 'bg-emerald-100 text-emerald-800'
                          : isHardwareScanner === false
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isHardwareScanner === true
                        ? '⚡ Hardware Gun'
                        : isHardwareScanner === false
                        ? '⌨️ Manual Keyboard'
                        : 'Waiting input...'}
                    </span>
                  </div>
                </div>

                {/* Matched Product Banner */}
                {testMatch && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{testMatch.product.imageEmoji || '🥛'}</span>
                        <div>
                          <h5 className="font-bold text-emerald-950 text-xs">
                            {testMatch.product.nameAr
                              ? testMatch.product.nameAr
                              : testMatch.product.name}
                          </h5>
                          <span className="text-[10px] text-emerald-700 font-mono">
                            SKU: {testMatch.product.sku} | Barcode: {testMatch.product.barcode} | Method:{' '}
                            {testMatch.matchedBy}
                            {testMatch.weightKg ? ` (${testMatch.weightKg} kg)` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono font-bold text-emerald-900 text-sm">
                      {testMatch.product.salePrice.toFixed(2)} {t.currency}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Barcode Simulator for Store Products */}
              <div className="rounded-xl border border-slate-200 p-3 bg-white">
                <span className="font-semibold text-slate-700 text-[11px] block mb-2">
                  Click any product below to simulate immediate scanning:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {products.slice(0, 8).map(prod => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => testProductSimulate(prod)}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                    >
                      <span>{prod.imageEmoji || '📦'}</span>
                      <span>{prod.name.slice(0, 16)}</span>
                      <span className="font-mono text-[10px] text-slate-400">({prod.barcode})</span>
                    </button>
                  ))}
                  {/* Also a scale weight barcode demo */}
                  <button
                    type="button"
                    onClick={() => {
                      const scaleCode = `${settings.weightedBarcodePrefix || '20'}00001012503`;
                      setTestInput(scaleCode);
                      evaluateTestBarcode(scaleCode);
                    }}
                    className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 transition-colors"
                  >
                    <span>⚖️</span>
                    <span>باركود الوزن من الميزان (1.250 كغ)</span>
                  </button>
                </div>
              </div>

              {/* Diagnostic Log */}
              {testLog.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-900 p-3 text-[11px] font-mono text-slate-200 space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                    Diagnostics Event Log
                  </div>
                  {testLog.map((log, i) => (
                    <div key={i} className="text-slate-300 truncate">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-3.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{t.resetToDefaults}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleSaveAndApply}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-95 transition-all"
            >
              <Check className="h-4 w-4" />
              <span>{t.saveScannerSettings}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
