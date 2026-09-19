import type { ScannerSettings } from '../types';

export const DEFAULT_SCANNER_SETTINGS: ScannerSettings = {
  customPrefixes: ['628', '20', '99', 'DRY-'],
  defaultPrefix: '628',
  stripPrefixOnMatch: true,
  autoPrependDefaultPrefix: true,
  parseWeightedBarcodes: true,
  weightedBarcodePrefix: '20',
  sensitivityPreset: 'fast',
  sensitivityMs: 45,
  minBarcodeLength: 4,
  instantMatchAutoAdd: true,
  enableGlobalKeystrokeListener: true,
  audioFeedback: true,
};

/** Merges arbitrary persisted data over the defaults, guarding against bad payloads. */
export function normalizeScannerSettings(v: unknown): ScannerSettings {
  if (!v || typeof v !== 'object') return DEFAULT_SCANNER_SETTINGS;
  return { ...DEFAULT_SCANNER_SETTINGS, ...(v as Partial<ScannerSettings>) };
}