import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, SaleItem, Sale, Customer } from '../../types';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';
import { ScannerSettingsModal } from './ScannerSettingsModal';
import { matchProductBarcode } from '../../utils/barcodeParser';
import { scannerAudio } from '../../utils/scannerAudio';
import { 
  Search, 
  Barcode, 
  Trash2, 
  Plus, 
  Minus, 
  PauseCircle, 
  PlayCircle, 
  User, 
  CreditCard, 
  Gift, 
  Sparkles, 
  AlertTriangle,
  Clock,
  RotateCcw,
  Check,
  Sliders,
  X
} from 'lucide-react';

export const POSScreen: React.FC = () => {
  const {
    t,
    products,
    customers,
    loyaltySettings,
    heldOrders,
    holdOrder,
    resumeOrder,
    removeHeldOrder,
    completeSale,
    activeShift,
    activeBranch,
    addCustomer,
    scannerSettings,
    createPendingPurchaseOrder,
    addProduct,
  } = useApp();

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Cart state
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerQuery, setCustomerQuery] = useState<string>('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState<boolean>(false);
  const [orderDiscountPercent, setOrderDiscountPercent] = useState<number>(0);
  const [redeemPointsChecked, setRedeemPointsChecked] = useState<boolean>(false);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showHeldOrdersModal, setShowHeldOrdersModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showScannerSettings, setShowScannerSettings] = useState(false);
  const [scanFeedbackToast, setScanFeedbackToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
  const [poToast, setPoToast] = useState<string | null>(null);

  // Custom Order modal state (manual items with a discount, no stock effect)
  const [showCustomOrderModal, setShowCustomOrderModal] = useState(false);
  const [coName, setCoName] = useState('');
  const [coQty, setCoQty] = useState(1);
  const [coPrice, setCoPrice] = useState(0);
  const [coDiscount, setCoDiscount] = useState(0);

  // Quick add product for unrecognized barcodes
  const [showQuickAddProduct, setShowQuickAddProduct] = useState(false);
  const [qaBarcode, setQaBarcode] = useState('');
  const [qaForm, setQaForm] = useState({
    name: '',
    nameAr: '',
    price: 0,
    cost: 0,
    unit: 'Piece',
  });

  // New customer quick-add state
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Barcode scanner simulator popup
  const [barcodeInput, setBarcodeInput] = useState('');

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement;

      // F1: Quick save as cash WITHOUT printable invoice
      if (e.key === 'F1') {
        if (cart.length > 0 && !showPaymentModal) {
          e.preventDefault();
          handleQuickCashSave();
        }
      }
      // F2 or Ctrl+K: Focus search input
      else if (e.key === 'F2' || (e.ctrlKey && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } 
      // F4 or Ctrl+Enter: Pay & Checkout (saves + opens printable invoice)
      else if (e.key === 'F4' || (e.ctrlKey && e.key === 'Enter')) {
        if (cart.length > 0 && !showPaymentModal) {
          e.preventDefault();
          setShowPaymentModal(true);
        }
      } 
      // F8: Hold cart
      else if (e.key === 'F8') {
        if (cart.length > 0) {
          e.preventDefault();
          handleHoldCart();
        }
      }
      // Ctrl+H: Open Held Orders drawer
      else if (e.ctrlKey && e.key.toLowerCase() === 'h' && !isInput) {
        e.preventDefault();
        setShowHeldOrdersModal(true);
      }
      // Ctrl+B: Open Barcode Scanner Settings
      else if (e.ctrlKey && e.key.toLowerCase() === 'b' && !isInput) {
        e.preventDefault();
        setShowScannerSettings(prev => !prev);
      }
      // Ctrl+U: Quick Add Customer
      else if (e.ctrlKey && e.key.toLowerCase() === 'u' && !isInput) {
        e.preventDefault();
        setShowAddCustomerModal(true);
      }
      // Ctrl+Backspace or Ctrl+Delete: Clear Cart
      else if (e.ctrlKey && (e.key === 'Backspace' || e.key === 'Delete') && !isInput) {
        if (cart.length > 0) {
          e.preventDefault();
          setCart([]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, showPaymentModal, handleQuickCashSave]);

  // Global Hardware Barcode Scanner Keystroke Listener (Always-Active Scanning)
  useEffect(() => {
    if (!scannerSettings.enableGlobalKeystrokeListener) return;

    let buffer = '';
    let lastKeyTime = 0;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when a modal is open or when typing in dedicated input
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement;

      // Allow scanning whether or not the search/barcode fields are focused
      // (the scale/barcode gun types even when the cashier never clicked a field).
      const isPosField =
        activeEl === searchInputRef.current || activeEl === barcodeInputRef.current;
      if (isInput && !isPosField) {
        return;
      }

      const now = performance.now();
      const delta = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.length >= scannerSettings.minBarcodeLength) {
          e.preventDefault();
          processScannedBarcode(buffer);
          buffer = '';
        }
        return;
      }

      // Collect single printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (delta <= scannerSettings.sensitivityMs || buffer.length === 0) {
          // Scanner-grade characters: swallow them so they don't pollute
          // the search/barcode inputs, then add to the buffer.
          if (buffer.length > 0) {
            e.preventDefault();
          }
          buffer += e.key;

          if (
            scannerSettings.instantMatchAutoAdd &&
            buffer.length >= scannerSettings.minBarcodeLength
          ) {
            const match = matchProductBarcode(buffer, products, scannerSettings);
            if (match && match.matchedBy === 'exact') {
              processScannedBarcode(buffer);
              buffer = '';
            }
          }
        } else {
          buffer = e.key;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [scannerSettings, products]);

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Customer searchable picker (by name or phone number)
  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      c => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q)
    );
  }, [customers, customerQuery]);

  const selectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setCustomerQuery('');
    setCustomerDropdownOpen(false);
    setRedeemPointsChecked(false);
  };

  const selectWalkInCustomer = () => {
    setSelectedCustomerId('');
    setCustomerQuery('');
    setCustomerDropdownOpen(false);
    setRedeemPointsChecked(false);
  };

  // Products filtering
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (!p.isActive) return false;
      const query = searchQuery.trim().toLowerCase();
      const matchQuery =
        !query ||
        p.name.toLowerCase().includes(query) ||
        (p.nameAr && p.nameAr.toLowerCase().includes(query)) ||
        p.sku.toLowerCase().includes(query) ||
        p.barcode.toLowerCase().includes(query);
      return matchQuery;
    });
  }, [products, searchQuery]);

  // Expiry calculation helper
  const getExpiryBadge = (expiryDateStr: string) => {
    if (!expiryDateStr) return null;
    const now = new Date();
    const exp = new Date(expiryDateStr);
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {t.expired}
        </span>
      );
    }
    if (diffDays <= 3) {
      return (
        <span className="flex items-center gap-0.5 rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
          <Clock className="h-3 w-3" /> {diffDays} {t.days}
        </span>
      );
    }
    if (diffDays <= 7) {
      return (
        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
          {diffDays} {t.days}
        </span>
      );
    }
    return null;
  };

  // Add product to cart
  const addToCart = (product: Product, quantityToAdd = 1) => {
    if (product.currentStock <= 0) {
      requestStockForOOS(product);
      return;
    }

    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.productId === product.id);
      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        const newQty = existing.quantity + quantityToAdd;
        if (newQty > product.currentStock) {
          alert(`${t.warning}: Only ${product.currentStock} ${product.unit} available.`);
          return prev;
        }
        const updated = [...prev];
        const lineGross = newQty * existing.salePrice;
        const lineTotal = lineGross - existing.discountAmount;

        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          lineTotal,
        };
        return updated;
      } else {
        const lineGross = quantityToAdd * product.salePrice;
        const lineTotal = lineGross;

        const newItem: SaleItem = {
          productId: product.id,
          productName: product.name,
          productNameAr: product.nameAr,
          sku: product.sku,
          barcode: product.barcode,
          unit: product.unit,
          quantity: quantityToAdd,
          costPrice: product.costPrice,
          salePrice: product.salePrice,
          discountAmount: 0,
          lineTotal,
          batchNumber: product.batchNumber,
          expiryDate: product.expiryDate,
        };
        return [...prev, newItem];
      }
    });
  };

  // Out-of-stock: prevent adding to cart, auto-request a pending purchase order instead
  const requestStockForOOS = (product: Product) => {
    const result = createPendingPurchaseOrder(product);
    if (result.alreadyPending) {
      setPoToast(`طلب شراء معلق موجود بالفعل لـ ${product.nameAr || product.name}`
      );
    } else if (result.created) {
      setPoToast(`تم إنشاء طلب شراء معلق لـ ${product.nameAr || product.name}`
      );
    }
    setTimeout(() => setPoToast(null), 3500);
  };

  // Add a manual / custom order line (no stock effect, marked on the orders page)
  const addCustomOrder = () => {
    if (!coName.trim() || coQty <= 0 || coPrice <= 0) return;
    const gross = coQty * coPrice;
    const discount = Math.min(coDiscount, gross);
    const lineTotal = Math.max(0, gross - discount);
    const customItem: SaleItem = {
      productId: `custom-${Date.now()}`,
      productName: coName.trim(),
      productNameAr: coName.trim(),
      sku: 'CUSTOM',
      barcode: 'CUSTOM',
      unit: 'Piece',
      quantity: coQty,
      costPrice: 0,
      salePrice: coPrice,
      discountAmount: discount,
      lineTotal,
      batchNumber: 'CUSTOM',
      expiryDate: '',
      isCustomOrder: true,
    };
    setCart(prev => [...prev, customItem]);
    setCoName('');
    setCoQty(1);
    setCoPrice(0);
    setCoDiscount(0);
    setShowCustomOrderModal(false);
  };

  // Quick-add a brand-new product for a scanned-but-unrecognized barcode
  const handleQuickAddProduct = () => {
    if (!qaForm.name.trim()) return;
    const newProduct: Omit<Product, 'id'> = {
      name: qaForm.name.trim(),
      nameAr: qaForm.nameAr.trim() || qaForm.name.trim(),
      sku: `SKU-${qaBarcode.slice(-6) || Date.now()}`,
      barcode: qaBarcode,
      unit: qaForm.unit as Product['unit'],
      imageEmoji: '🥛',
      costPrice: qaForm.cost,
      salePrice: qaForm.price,
      minSalePrice: 0,
      currentStock: 0,
      minStock: 10,
      expiryDate: '',
      batchNumber: 'INITIAL',
      isActive: true,
      isPerishable: false,
    };
    addProduct(newProduct);
    setQaForm({ name: '', nameAr: '', price: 0, cost: 0, unit: 'Piece' });
    setQaBarcode('');
    setShowQuickAddProduct(false);
    setBarcodeInput('');
    setSearchQuery('');
    setScanFeedbackToast({
      message:'تمت إضافة المنتج الجديد بنجاح',
      type: 'success',
    });
    setTimeout(() => setScanFeedbackToast(null), 2500);
  };

  // Barcode processing with custom prefixes, sensitivity, scale barcodes, and audio feedback
  const processScannedBarcode = (rawCode: string): boolean => {
    const code = rawCode.trim();
    if (!code) return false;

    const match = matchProductBarcode(code, products, scannerSettings);
    if (match) {
      addToCart(match.product, match.quantity);
      if (scannerSettings.audioFeedback) {
        scannerAudio.playSuccessBeep();
      }
      const weightDesc = match.weightKg
        ? ` (${match.weightKg} kg)`
        : match.quantity > 1
        ? ` (x${match.quantity})`
        : '';
      setScanFeedbackToast({
        message: `${match.product.nameAr ? match.product.nameAr : match.product.name}${weightDesc}`,
        type: 'success',
      });
      setTimeout(() => setScanFeedbackToast(null), 2500);
      setBarcodeInput('');
      return true;
    } else {
      if (scannerSettings.audioFeedback) {
        scannerAudio.playErrorBeep();
      }
      setScanFeedbackToast({
        message:`الباركود "${code}" غير معروف — أضف المنتج بسرعة`,
        type: 'warning',
      });
      setQaBarcode(code);
      setShowQuickAddProduct(true);
      setTimeout(() => setScanFeedbackToast(null), 3000);
      return false;
    }
  };

  // Form submit handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processScannedBarcode(barcodeInput);
  };

  // Instant match input change handler
  const handleBarcodeInput = (val: string) => {
    setBarcodeInput(val);
    if (scannerSettings.instantMatchAutoAdd && val.length >= scannerSettings.minBarcodeLength) {
      const match = matchProductBarcode(val, products, scannerSettings);
      if (match && (match.matchedBy === 'exact' || match.matchedBy === 'scale_weight')) {
        processScannedBarcode(val);
      }
    }
  };

  // Cart item modifiers
  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }

    setCart(prev => {
      const item = prev[index];
      const prod = products.find(p => p.id === item.productId);
      if (prod && newQty > prod.currentStock) {
        alert(`${t.warning}: Only ${prod.currentStock} in stock.`);
        return prev;
      }

      const updated = [...prev];
      const lineGross = newQty * item.salePrice;
      const lineTotal = Math.max(0, lineGross - item.discountAmount);

      updated[index] = {
        ...item,
        quantity: newQty,
        lineTotal,
      };
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
    setOrderDiscountPercent(0);
    setRedeemPointsChecked(false);
  };

  // Cart calculations
  const grossSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.salePrice), 0);
  }, [cart]);

  const percentageDiscountAmount = useMemo(() => {
    return (grossSubtotal * orderDiscountPercent) / 100;
  }, [grossSubtotal, orderDiscountPercent]);

  // Loyalty calculations
  const maxAllowedLoyaltyDiscount = useMemo(() => {
    return (grossSubtotal * (loyaltySettings.maxPercentPayableWithPoints / 100));
  }, [grossSubtotal, loyaltySettings.maxPercentPayableWithPoints]);

  const loyaltyRedeemable = useMemo(() => {
    if (!loyaltySettings.enabled || !selectedCustomer || !redeemPointsChecked) {
      return { pointsToRedeem: 0, discountAmount: 0 };
    }

    if (selectedCustomer.loyaltyPointsBalance < loyaltySettings.minPointsForRedemption) {
      return { pointsToRedeem: 0, discountAmount: 0 };
    }

    const customerPointsValue = selectedCustomer.loyaltyPointsBalance * loyaltySettings.pointRedemptionValue;
    const discountAmount = Math.min(customerPointsValue, maxAllowedLoyaltyDiscount);
    const pointsToRedeem = Math.ceil(discountAmount / loyaltySettings.pointRedemptionValue);

    return { pointsToRedeem, discountAmount };
  }, [loyaltySettings, selectedCustomer, redeemPointsChecked, maxAllowedLoyaltyDiscount]);

  const totalDiscount = percentageDiscountAmount + loyaltyRedeemable.discountAmount;
  const grandTotal = Math.max(0, grossSubtotal - totalDiscount);
  const netSubtotal = grandTotal;

  // Hold order
  const handleHoldCart = () => {
    if (cart.length === 0) return;
    holdOrder(cart, selectedCustomerId, selectedCustomer?.name);
    clearCart();
  };

  // Resume order
  const handleResumeCart = (holdId: string) => {
    const order = resumeOrder(holdId);
    if (order) {
      setCart(order.items);
      setSelectedCustomerId(order.customerId || '');
      setShowHeldOrdersModal(false);
    }
  };

  // On sale success from payment modal
  const handleSaleSuccess = (saleData: any) => {
    const sale = completeSale(saleData);
    setShowPaymentModal(false);
    clearCart();
    setCompletedSale(sale);
  };

  // F1 quick save as cash WITHOUT printable invoice
  function handleQuickCashSave() {
    if (cart.length === 0) return;
    const saleData = {
      items: cart,
      subtotal: netSubtotal,
      discountTotal: totalDiscount,
      total: grandTotal,
      paymentMethod: 'cash' as const,
      payments: [{ method: 'cash' as const, amount: Math.max(0, grandTotal) }],
      customerId: selectedCustomerId,
      pointsRedeemed: loyaltyRedeemable.pointsToRedeem,
      pointsDiscountAmount: loyaltyRedeemable.discountAmount,
      notes: 'F1 quick save',
    };
    const sale = completeSale(saleData);
    setShowPaymentModal(false);
    clearCart();
    setScanFeedbackToast({
      type: 'success',
      message: `✓ ${t.receiptNumber} ${sale.receiptNumber} — ${t.savedWithoutPrint}`,
    });
    setTimeout(() => setScanFeedbackToast(null), 2500);
  }

  // Add customer submission
  const handleAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;

    const created = addCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
    });

    setSelectedCustomerId(created.id);
    setNewCustName('');
    setNewCustPhone('');
    setShowAddCustomerModal(false);
  };

  return (
    <div className="relative flex h-[calc(100vh-6.5rem)] flex-col gap-3 lg:flex-row">
      {/* Real-time Scan Notification Toast */}
      {scanFeedbackToast && (
        <div
          className={`fixed top-20 z-50 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-lg backdrop-blur-xs transition-all ${'left-6'
          } ${
            scanFeedbackToast.type === 'success'
              ? 'border-emerald-200 bg-white/95 text-emerald-900 shadow-emerald-500/10'
              : 'border-amber-200 bg-white/95 text-amber-900 shadow-amber-500/10'
          }`}
        >
          {scanFeedbackToast.type === 'success' ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
              ✓
            </span>
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">
              !
            </span>
          )}
          <span>{scanFeedbackToast.message}</span>
        </div>
      )}

      {/* Out-of-stock purchase request toast */}
      {poToast && (
        <div className="fixed top-20 z-50 flex items-center gap-2 rounded-xl border border-indigo-200 bg-white/95 px-4 py-2.5 text-xs font-semibold text-indigo-900 shadow-lg backdrop-blur-xs transition-all"
          style={{ ['right']: '1.5rem' }}>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold">
            🛒
          </span>
          <span>{poToast}</span>
        </div>
      )}

      {/* LEFT SECTION: Products Search, Categories & Grid */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        {/* Top Search & Barcode Scan Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
          {/* Main search bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={t.searchProductPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-9 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 rtl:pl-4 rtl:pr-9"
            />
          </div>

          {/* Barcode scanner input & settings */}
          <div className="flex items-center gap-1.5">
            <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-1">
              <div className="relative">
                <Barcode className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-2.5" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder={t.scanBarcode}
                  value={barcodeInput}
                  onChange={e => handleBarcodeInput(e.target.value)}
                  className="w-36 rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-8 pr-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 rtl:pl-2 rtl:pr-8"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-slate-800 px-3 py-2.5 text-xs font-semibold text-white hover:bg-slate-900 transition-colors"
                title="أدخل الباركود للإضافة مباشرة"
              >
                ⏎
              </button>
            </form>

            {/* Scanner Settings Button */}
            <button
              type="button"
              onClick={() => setShowScannerSettings(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all"
              title={t.scannerSettingsTitle}
            >
              <Sliders className="h-4 w-4 text-slate-500" />
              <span className="hidden sm:inline font-mono text-[11px] text-slate-500">
                {scannerSettings.sensitivityMs}ms
              </span>
              {scannerSettings.customPrefixes.length > 0 && (
                <span className="hidden md:inline rounded-md bg-blue-100 px-1 py-0.5 font-mono text-[9px] font-bold text-blue-700">
                  {scannerSettings.customPrefixes[0]}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {filteredProducts.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400">
              <span className="text-4xl">🥛</span>
              <p className="mt-2 text-sm">{t.search}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {filteredProducts.map(product => {
                const isOutOfStock = product.currentStock <= 0;
                const isLowStock = !isOutOfStock && product.currentStock <= product.minStock;
                const expiryBadge = getExpiryBadge(product.expiryDate);

                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product, 1)}
                    className={`group relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all active:scale-95 rtl:text-right ${
                      isOutOfStock
                        ? 'cursor-pointer border-rose-200 bg-rose-50/50 opacity-80 hover:border-rose-400'
                        : 'border-slate-200/80 bg-white hover:border-blue-500 hover:shadow-md'
                    }`}
                  >
                    {/* Top badging */}
                    <div className="flex w-full items-start justify-between gap-1">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-2xl group-hover:bg-blue-50/50 transition-colors">
                        {product.imageEmoji || '🥛'}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {expiryBadge}
                        {isLowStock && (
                          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                            {t.lowStockBadge}
                          </span>
                        )}
                        {isOutOfStock && (
                          <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-800">
                            {t.outOfStockBadge}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Product Names */}
                    <div className="my-2 flex-1">
                      <h4 className="line-clamp-2 text-xs font-bold leading-tight text-slate-800 group-hover:text-blue-600">
                        {product.nameAr || product.name}
                      </h4>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {product.unit} • {t.batch}: {product.batchNumber}
                      </p>
                    </div>

                    {/* Price & Stock status */}
                    <div className="flex w-full items-baseline justify-between border-t border-slate-100 pt-1.5">
                      <div>
                        <span className="text-xs font-extrabold text-blue-600">
                          {product.salePrice.toFixed(2)}
                        </span>
                        <span className="ml-0.5 text-[9px] text-slate-500 rtl:mr-0.5">{t.currency}</span>
                      </div>
                      <span className={`text-[10px] font-semibold ${isLowStock ? 'text-amber-600' : 'text-slate-400'}`}>
                        {product.currentStock} {product.unit}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SECTION: Cart, Customer & Checkout */}
      <div className="flex w-full flex-col rounded-2xl border border-slate-200/80 bg-white shadow-xs lg:w-96 xl:w-[410px]">
        {/* Customer Header Selector */}
        <div className="border-b border-slate-100 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <User className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-2.5" />
              <input
                value={customerQuery}
                onFocus={() => setCustomerDropdownOpen(true)}
                onChange={e => {
                  setCustomerQuery(e.target.value);
                  setCustomerDropdownOpen(true);
                }}
                onBlur={() => setTimeout(() => setCustomerDropdownOpen(false), 150)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && filteredCustomers.length > 0) {
                    selectCustomer(filteredCustomers[0]);
                  }
                }}
                placeholder={
                  selectedCustomer
                    ? `${selectedCustomer.name} (${selectedCustomer.phone || '—'})`
                    : t.selectCustomer
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-3 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-hidden rtl:pl-3 rtl:pr-8"
              />
              {customerDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={selectWalkInCustomer}
                    className="block w-full px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 rtl:pr-3"
                  >
                    {t.walkInCustomer}
                  </button>
                  {filteredCustomers.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => selectCustomer(c)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-blue-50 rtl:pr-3"
                    >
                      <span className="font-semibold text-slate-800">
                        {c.name} ({c.loyaltyPointsBalance} pts)
                      </span>
                      {c.phone && (
                        <span className="text-[10px] text-slate-400" dir="ltr">
                          {c.phone}
                        </span>
                      )}
                    </button>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <div className="px-3 py-2 text-[11px] text-slate-400">
                      {'لا توجد نتائج مطابقة'}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowAddCustomerModal(true)}
              className="flex shrink-0 items-center gap-1 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              title={t.addCustomer}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.addCustomer}</span>
            </button>
          </div>

          {/* Loyalty Banner if customer selected */}
          {selectedCustomer && loyaltySettings.enabled && (
            <div className="mt-2 flex items-center justify-between rounded-xl bg-blue-50/70 p-2 text-xs text-blue-900">
              <div className="flex items-center gap-1.5">
                <Gift className="h-3.5 w-3.5 text-blue-600" />
                <span>
                  {t.loyaltyBalance}: <b>{selectedCustomer.loyaltyPointsBalance}</b>
                </span>
                <span className="text-[10px] text-blue-600">
                  (~{(selectedCustomer.loyaltyPointsBalance * loyaltySettings.pointRedemptionValue).toFixed(2)} {t.currency})
                </span>
              </div>
              <label className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-blue-700">
                <input
                  type="checkbox"
                  checked={redeemPointsChecked}
                  onChange={e => setRedeemPointsChecked(e.target.checked)}
                  disabled={selectedCustomer.loyaltyPointsBalance < loyaltySettings.minPointsForRedemption}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>{t.redeemLoyalty}</span>
              </label>
            </div>
          )}
        </div>

        {/* Cart Item Rows */}
        <div className="flex-1 divide-y divide-slate-100 overflow-y-auto p-3">
          {cart.length === 0 ? (
            <div className="flex h-52 flex-col items-center justify-center text-center text-slate-400">
              <span className="text-3xl">🛒</span>
              <p className="mt-2 text-xs font-medium">{t.cartEmpty}</p>
              <p className="text-[10px] text-slate-400">{t.openShiftPrompt}</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 py-2 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-slate-800">
                    {item.productNameAr ? item.productNameAr : item.productName}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span>{item.salePrice.toFixed(2)} {t.currency}</span>
                    <span>•</span>
                    <span>{t.batch}: {item.batchNumber}</span>
                    <span className="font-semibold text-emerald-600" title={t.netProfit}>
                      {t.netProfit}: {((item.salePrice - item.costPrice) * item.quantity - item.discountAmount).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => updateQuantity(idx, item.quantity - 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-slate-700 shadow-2xs hover:bg-slate-50"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    title={`${t.qty}`}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isInteger(v) && v >= 1) updateQuantity(idx, v);
                    }}
                    onBlur={(e) => {
                      const v = Math.floor(Number(e.target.value));
                      if (!(v >= 1) || !Number.isFinite(v)) updateQuantity(idx, item.quantity);
                    }}
                    className="w-14 rounded-md bg-white text-center font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => updateQuantity(idx, item.quantity + 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-slate-700 shadow-2xs hover:bg-slate-50"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                {/* Line Total & Remove */}
                <div className="flex items-center gap-2">
                  <span className="w-16 text-right font-extrabold text-slate-900 rtl:text-left">
                    {item.lineTotal.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromCart(idx)}
                    className="rounded p-1 text-slate-300 hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Order Controls & Hold Bar */}
        <div className="border-t border-slate-100 bg-slate-50/50 p-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowCustomOrderModal(true)}
                className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                <Plus className="h-3.5 w-3.5 text-indigo-600" />
                <span>{'طلب مخصص'}</span>
              </button>
              <button
                type="button"
                onClick={handleHoldCart}
                disabled={cart.length === 0}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              >
                <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
                <span>{t.holdOrder}</span>
              </button>
              {heldOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHeldOrdersModal(true)}
                  className="flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1.5 font-bold text-amber-800 hover:bg-amber-200"
                >
                  <PlayCircle className="h-3.5 w-3.5" />
                  <span>{heldOrders.length}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={clearCart}
              disabled={cart.length === 0}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 font-medium"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t.clearCart}</span>
            </button>
          </div>

          {/* Discount input row */}
          <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
            <span>{t.discount} (%):</span>
            <div className="flex items-center gap-1">
              {[0, 5, 10, 15].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setOrderDiscountPercent(pct)}
                  className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                    orderDiscountPercent === pct
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bill Summary Breakdown */}
        <div className="space-y-1.5 border-t border-slate-200 bg-slate-50 p-4 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>{t.subtotal}</span>
            <span>{grossSubtotal.toFixed(2)} {t.currency}</span>
          </div>

          {percentageDiscountAmount > 0 && (
            <div className="flex justify-between font-semibold text-amber-600">
              <span>{t.discount} ({orderDiscountPercent}%)</span>
              <span>-{percentageDiscountAmount.toFixed(2)} {t.currency}</span>
            </div>
          )}

          {loyaltyRedeemable.discountAmount > 0 && (
            <div className="flex justify-between font-semibold text-blue-600">
              <span>{t.pointsDiscountApplied} ({loyaltyRedeemable.pointsToRedeem} pts)</span>
              <span>-{loyaltyRedeemable.discountAmount.toFixed(2)} {t.currency}</span>
            </div>
          )}

          <div className="flex items-baseline justify-between border-t border-slate-200 pt-2 text-base font-extrabold text-slate-900">
            <span>{t.total}</span>
            <div className="text-right">
              <span className="text-2xl font-black text-blue-600">{grandTotal.toFixed(2)}</span>
              <span className="ml-1 text-xs font-bold text-slate-500 rtl:mr-1">{t.currency}</span>
            </div>
          </div>
        </div>

        {/* Large Action Charge Button */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            disabled={cart.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-base font-extrabold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-98 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CreditCard className="h-5 w-5" />
            <span>{t.payNow}</span>
          </button>
        </div>
      </div>

      {/* Payment Tender Modal */}
      {showPaymentModal && (
        <PaymentModal
          items={cart}
          subtotal={netSubtotal}
          discountTotal={totalDiscount}
          total={grandTotal}
          customerId={selectedCustomerId}
          pointsRedeemed={loyaltyRedeemable.pointsToRedeem}
          pointsDiscountAmount={loyaltyRedeemable.discountAmount}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handleSaleSuccess}
        />
      )}

      {/* Printable Thermal Receipt Modal */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          branch={activeBranch}
          onClose={() => setCompletedSale(null)}
        />
      )}

      {/* Held Orders Modal */}
      {showHeldOrdersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-base font-bold text-slate-800">{t.resumeOrder}</h3>
            <p className="text-xs text-slate-500 mb-3">{t.heldOrdersCount}: {heldOrders.length}</p>

            <div className="max-h-64 space-y-2 overflow-y-auto">
              {heldOrders.map(hold => (
                <div
                  key={hold.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900">{hold.holdNumber}</span>
                    <span className="ml-2 text-slate-500">{hold.customerName || t.walkInCustomer}</span>
                    <div className="text-[10px] text-slate-400">
                      {hold.items.length} items • {new Date(hold.heldAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResumeCart(hold.id)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700"
                    >
                      {t.view}
                    </button>
                    <button
                      onClick={() => removeHeldOrder(hold.id)}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowHeldOrdersModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">{t.addCustomer}</h3>
            <form onSubmit={handleAddCustomerSubmit} className="mt-3 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">الاسم الكامل</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: طارق الغامدي"
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">الجوال</label>
                <input
                  type="tel"
                  required
                  placeholder="05xxxxxxxx"
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Order Modal (manual item with discount) */}
      {showCustomOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">{'طلب مخصص'}</h3>
              <button
                onClick={() => setShowCustomOrderModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {'أصناف غير مخزنية بدون تأثير على المخزون — تُعلَّم كطلب مخصص في صفحة الطلبات'}
            </p>
            <form onSubmit={e => { e.preventDefault(); addCustomOrder(); }} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">{'اسم الصنف *'}</label>
                <input
                  type="text"
                  required
                  value={coName}
                  onChange={e => setCoName(e.target.value)}
                  placeholder={'مثال: دجاج مشوي / كرتونة بيض خاص'}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">{t.qty}</label>
                  <input
                    type="number"
                    min={1}
                    value={coQty}
                    onChange={e => setCoQty(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">{'السعر / الوحدة'}</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={coPrice}
                    onChange={e => setCoPrice(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">{`خصم يدوي (إجمالي ${t.currency})`}</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={coDiscount}
                  onChange={e => setCoDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-xs">
                <span className="font-semibold text-slate-600">{t.total}</span>
                <span className="font-mono font-extrabold text-slate-900">
                  {(Math.max(0, coQty * coPrice - Math.min(coDiscount, coQty * coPrice))).toFixed(2)} {t.currency}
                </span>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCustomOrderModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700"
                >
                  {'إضافة للفاتورة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Product Modal (unrecognized barcode) */}
      {showQuickAddProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">{'إضافة منتج جديد بسرعة'}</h3>
              <button
                onClick={() => setShowQuickAddProduct(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {`الباركود "${qaBarcode}" غير موجود في قائمة المنتجات. أدخل بيانات المنتج ليُضاف.`}
            </p>
            <form onSubmit={e => { e.preventDefault(); handleQuickAddProduct(); }} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">{'اسم المنتج *'}</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={qaForm.name}
                  onChange={e => setQaForm({ ...qaForm, name: e.target.value })}
                  placeholder={'مثال: جبنة رومي'}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">{'سعر البيع'}</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={qaForm.price}
                    onChange={e => setQaForm({ ...qaForm, price: Math.max(0, Number(e.target.value)) })}
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">{'سعر التكلفة'}</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={qaForm.cost}
                    onChange={e => setQaForm({ ...qaForm, cost: Math.max(0, Number(e.target.value)) })}
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowQuickAddProduct(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Configuration Modal */}
      <ScannerSettingsModal
        isOpen={showScannerSettings}
        onClose={() => setShowScannerSettings(false)}
        onSimulateScan={code => processScannedBarcode(code)}
      />
    </div>
  );
};
