import { Product, ScannerSettings } from '../types';

export interface BarcodeMatchResult {
  product: Product;
  quantity: number;
  matchedBy: 'exact' | 'scale_weight' | 'prefix_stripped' | 'prefix_prepended' | 'suffix_matched';
  detectedPrefix?: string;
  weightKg?: number;
}

function isNumeric(str: string): boolean {
  return /^\d+$/.test(str);
}

/**
 * Look up a product by PLU / SKU / ID / barcode in a "contains-or-equals"
 * fashion, tailored to scale PLU codes.
 */
function findProductByPlu(plu: string, products: Product[]): Product | null {
  const q = plu.toLowerCase();
  return (
    products.find(
      p =>
        p.isActive &&
        (p.sku.toLowerCase() === q ||
          p.id.toLowerCase() === q ||
          p.barcode.toLowerCase() === q)
    ) ||
    products.find(
      p =>
        p.isActive &&
        (p.sku.toLowerCase().endsWith(q) ||
          p.id.toLowerCase().endsWith(q) ||
          p.barcode.toLowerCase().endsWith(q))
    ) || null
  );
}

/**
 * Collect every candidate scale prefix we should try, e.g. "20", "99", ...
 * Remove duplicates and blank entries.
 */
function scalePrefixCandidates(settings: ScannerSettings): string[] {
  const candidates: string[] = [];
  if (settings.weightedBarcodePrefix) candidates.push(settings.weightedBarcodePrefix);
  settings.customPrefixes.forEach(p => {
    if (p && !candidates.includes(p)) candidates.push(p);
  });
  return candidates;
}

export function matchProductBarcode(
  rawInput: string,
  products: Product[],
  settings: ScannerSettings
): BarcodeMatchResult | null {
  const code = rawInput.trim();
  if (!code || code.length < settings.minBarcodeLength) {
    return null;
  }

  // 1. Direct Exact Match on Barcode or SKU
  const exact = products.find(
    p => p.isActive && (p.barcode === code || p.sku.toLowerCase() === code.toLowerCase())
  );
  if (exact) {
    return {
      product: exact,
      quantity: 1,
      matchedBy: 'exact',
    };
  }

  // 2. Variable Weight Electronic Scale Barcode.
  // Tries EVERY configured prefix (20, 99, ...) instead of only one.
  // Common layouts after the 2-digit prefix:
  //   - PLU(5) + Grams(5) + Checksum(1)   (EAN-13 style, 13 digits total)
  //   - PLU(4) + Grams(5) + Checksum(1)
  //   - PLU(6) + Grams(5) + Checksum(1)
  if (settings.parseWeightedBarcodes && scalePrefixCandidates(settings).length > 0) {
    for (const scalePrefix of scalePrefixCandidates(settings)) {
      // Only attempt numeric 2-char scale prefixes.
      if (!isNumeric(scalePrefix) || scalePrefix.length !== 2) continue;
      if (!code.startsWith(scalePrefix)) continue;

      const rest = code.slice(scalePrefix.length);
      for (const pluLen of [5, 4, 6]) {
        if (rest.length < pluLen + 5) continue;
        const plu = rest.slice(0, pluLen);
        const weightPart = rest.slice(pluLen, pluLen + 5);
        if (!isNumeric(weightPart)) continue;

        const scaleProduct = findProductByPlu(plu, products);
        if (scaleProduct) {
          const weightNum = parseInt(weightPart, 10);
          const weightKg =
            weightNum > 0 && weightNum <= 30000 ? Number((weightNum / 1000).toFixed(3)) : 1;
          return {
            product: scaleProduct,
            quantity: weightKg,
            matchedBy: 'scale_weight',
            detectedPrefix: scalePrefix,
            weightKg,
          };
        }
      }
    }
  }

  // 3. Custom Prefix Stripping
  // If barcode scanned contains one of the configured prefixes, but the product is saved without it
  if (settings.stripPrefixOnMatch && settings.customPrefixes.length > 0) {
    for (const prefix of settings.customPrefixes) {
      if (prefix && code.startsWith(prefix) && code.length > prefix.length) {
        const stripped = code.slice(prefix.length);
        const match = products.find(
          p =>
            p.isActive &&
            (p.barcode === stripped ||
              p.sku.toLowerCase() === stripped.toLowerCase() ||
              p.barcode.endsWith(stripped))
        );
        if (match) {
          return {
            product: match,
            quantity: 1,
            matchedBy: 'prefix_stripped',
            detectedPrefix: prefix,
          };
        }
      }
    }
  }

  // 4. Suffix Match (general "the scale/prefix prepended digits to my product id" case)
  // Handles ANY prefix, including ones not configured. The product's barcode/id/sku
  // is matched against the TRAILING part of the scanned code, so scanned "9910001"
  // finds product whose barcode/id is "10001". A trailing checksum digit is also tolerated.
  {
    let best: { product: Product; matched: string; prefix: string } | null = null;
    for (const p of products) {
      if (!p.isActive) continue;
      const candidates = [p.barcode, p.sku, p.id].filter(Boolean) as string[];
      for (const key of candidates) {
        const keyq = key.toLowerCase();
        if (keyq.length < 4) continue; // avoid absurd short matches
        const codeq = code.toLowerCase();
        const matchesEnd = (suffix: string) => codeq.length > suffix.length && codeq.endsWith(suffix);
        const used = matchesEnd(keyq) ? keyq : matchesEnd(keyq + '0') ? keyq + '0' : null;
        if (!used) continue;
        const prefix = code.slice(0, code.length - used.length);
        if (!best || used.length > best.matched.length) {
          best = { product: p, matched: used, prefix };
        }
      }
    }
    if (best) {
      return {
        product: best.product,
        quantity: 1,
        matchedBy: 'suffix_matched',
        detectedPrefix: best.prefix || undefined,
      };
    }
  }

  // 5. Custom Prefix Prepending
  // If cashier scans a short in-store code (e.g. 1007001012) and product is registered as 6281007001012
  if (settings.autoPrependDefaultPrefix && settings.defaultPrefix) {
    const prepended = settings.defaultPrefix + code;
    const match = products.find(
      p =>
        p.isActive &&
        (p.barcode === prepended || p.sku.toLowerCase() === prepended.toLowerCase())
    );
    if (match) {
      return {
        product: match,
        quantity: 1,
        matchedBy: 'prefix_prepended',
        detectedPrefix: settings.defaultPrefix,
      };
    }
  }

  // Also try prepending any other configured custom prefix
  if (settings.customPrefixes.length > 0) {
    for (const prefix of settings.customPrefixes) {
      if (prefix && prefix !== settings.defaultPrefix) {
        const prepended = prefix + code;
        const match = products.find(
          p =>
            p.isActive &&
            (p.barcode === prepended || p.sku.toLowerCase() === prepended.toLowerCase())
        );
        if (match) {
          return {
            product: match,
            quantity: 1,
            matchedBy: 'prefix_prepended',
            detectedPrefix: prefix,
          };
        }
      }
    }
  }

  return null;
}