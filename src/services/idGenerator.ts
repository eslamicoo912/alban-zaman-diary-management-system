export function uid(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const pad3 = (n: number): string => String(n).padStart(3, '0');
const pad2 = (n: number): string => String(n).padStart(2, '0');

function dateStamp(date = new Date()): string {
  return date.toISOString().slice(2, 10).replace(/-/g, '');
}

function monthStamp(date = new Date()): string {
  return date.toISOString().slice(2, 7).replace(/-/g, '');
}

/** Serial numbers for documents: receipt, purchase order, hold, return, shift, loan. */
export function nextReceiptNumber(count: number): string {
  return `REC-${dateStamp()}-${pad3(count + 1)}`;
}

export function nextPurchaseOrderNumber(count: number): string {
  return `PO-${dateStamp()}-${pad3(count + 1)}`;
}

export function nextHoldNumber(count: number): string {
  return `HOLD-${pad3(count + 1)}`;
}

export function nextReturnNumber(count: number): string {
  return `RET-${dateStamp()}-${pad3(count + 1)}`;
}

export function nextShiftNumber(count: number): string {
  return `SH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${pad2(count + 1)}`;
}

export function nextLoanNumber(count: number): string {
  return `LN-${monthStamp()}-${pad2(count + 1)}`;
}