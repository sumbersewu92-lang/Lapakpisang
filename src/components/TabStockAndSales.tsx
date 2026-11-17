import React, { useState } from 'react';
import { 
  Building2, 
  Package, 
  TrendingUp, 
  Trash2, 
  AlertTriangle, 
  FileCheck2, 
  Sparkles,
  CheckCircle2,
  Clock3,
  Calendar,
  ShoppingCart,
  ArrowRight,
  X,
  Plus,
  AlertCircle,
  Phone,
  RotateCcw,
  ArrowUpRight,
  Scale,
  Check
} from 'lucide-react';
import { BananaStockSummary, CentralWarehouseSale, SaleItem, BananaRejectRecord, BananaShrinkageRecord } from '../types/banana';
import { 
  MAIN_BANANA_TYPES,
  TYPICAL_BUY_PRICES,
  TYPICAL_SELL_PRICES, 
  STOCK_CORRECTION_REASONS,
  formatRupiah, 
  formatSignedRupiah,
  formatPaymentMethodLabel,
  formatNumber, 
  formatSignedKg,
  formatDateTimeIndo,
  formatDateIndo,
  toLocalDateInput,
  isSameVariety 
} from '../data/initialData';
import { captureScrollState, blurActiveTrigger } from '../utils/scrollPreservation';
import {
  capitalizeEachWord,
  capitalizeFirstLetter,
  handleCapitalizedInputChange
} from '../utils/textFormat';

interface TabStockAndSalesProps {
  stockList: BananaStockSummary[];
  sales: CentralWarehouseSale[];
  rejects?: BananaRejectRecord[];
  shrinkages?: BananaShrinkageRecord[];
  onAddSale: (sale: Omit<CentralWarehouseSale, 'id' | 'invoiceNumber'>) => void;
  onAddReject?: (reject: Omit<BananaRejectRecord, 'id' | 'referenceNumber'>) => BananaRejectRecord | void;
  onDeleteReject?: (rejectId: string) => void;
  onAddShrinkage?: (shrinkage: Omit<BananaShrinkageRecord, 'id' | 'referenceNumber'>) => BananaShrinkageRecord | void;
  onDeleteShrinkage?: (shrinkageId: string) => void;
  onGoToFinancialReport?: () => void;
  onViewInvoice: (sale: CentralWarehouseSale) => void;
  onMarkAsPaid: (saleId: string) => void;
  onDeleteSale: (saleId: string) => void;
}

interface CartItemState {
  id: string;
  bananaType: string;
  stockOutWeightKg: string;
  weightKg: string;
  sellPricePerKg: string;
  isWeighedEdited?: boolean;
}

export const TabStockAndSales: React.FC<TabStockAndSalesProps> = ({
  stockList,
  sales,
  rejects = [],
  shrinkages = [],
  onAddSale,
  onAddReject,
  onDeleteReject,
  onAddShrinkage,
  onDeleteShrinkage,
  onGoToFinancialReport,
  onViewInvoice,
  onMarkAsPaid,
  onDeleteSale
}) => {
  // Available bananas with positive stock
  const availableBananas = stockList.filter(s => s.stockKg > 0);

  // Cart State (Initialized strictly empty by default)
  const [cartItems, setCartItems] = useState<CartItemState[]>([]);

  // State Pop-up Modal Konfirmasi Hapus Riwayat Pengiriman
  const [saleToDelete, setSaleToDelete] = useState<CentralWarehouseSale | null>(null);

  // State Modal Koreksi Stok (Gabungan Reject / Buah Rusak & Susut di Luar Penjualan)
  const [correctionTargetStock, setCorrectionTargetStock] = useState<BananaStockSummary | null>(null);
  const [correctionWeightKg, setCorrectionWeightKg] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>(STOCK_CORRECTION_REASONS[0]);
  const [correctionNotes, setCorrectionNotes] = useState<string>('');
  const [correctionModalError, setCorrectionModalError] = useState<string>('');
  const [correctionToDelete, setCorrectionToDelete] = useState<{
    source: 'shrinkage' | 'reject';
    record: BananaRejectRecord | BananaShrinkageRecord;
  } | null>(null);

  // Modal Checkout State
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);

  // Form Fields inside Checkout Modal (Nama Pembeli & No WhatsApp bersifat opsional)
  const [buyerWarehouseName, setBuyerWarehouseName] = useState<string>('');
  const [buyerWhatsApp, setBuyerWhatsApp] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'LUNAS' | 'BELUM_LUNAS'>('BELUM_LUNAS');
  const [paymentMethod, setPaymentMethod] = useState<'Transfer Bank' | 'Tunai Langsung' | 'Transfer Susulan (Piutang)'>('Transfer Susulan (Piutang)');
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return toLocalDateInput(d);
  });

  const [showCartValidation, setShowCartValidation] = useState<boolean>(false);
  const [modalErrorMsg, setModalErrorMsg] = useState<string>('');
  const [isSubmittingSale, setIsSubmittingSale] = useState<boolean>(false);

  const parseWeightInput = (raw: string): number => {
    const normalized = raw.trim().replace(',', '.');
    const parsed = parseFloat(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.round(parsed * 100) / 100;
  };

  // Helper to format typed value into Rupiah
  const formatRupiahInput = (val: string) => {
    if (!val) return '';
    const num = parseInt(val, 10);
    return isNaN(num) ? '' : `Rp. ${num.toLocaleString('id-ID')}`;
  };

  // Action: Add banana to cart from left table (silent update, no toast banner)
  const handleAddToCart = (stockItem: BananaStockSummary) => {
    if (stockItem.stockKg <= 0) return;

    const restore = captureScrollState();
    setShowCartValidation(false);
    const existingIndex = cartItems.findIndex(it => isSameVariety(it.bananaType, stockItem.bananaType));

    if (existingIndex < 0) {
      const initialStockStr = String(stockItem.stockKg);
      setCartItems(prev => [
        ...prev,
        {
          id: `cart-${Date.now()}-${Math.random()}`,
          bananaType: stockItem.bananaType,
          stockOutWeightKg: initialStockStr,
          weightKg: '', // Wajib diisi manual; placeholder "0 kg"
          sellPricePerKg: '', // Default awal kosong sehingga menampilkan placeholder "Rp. 0" untuk input manual
          isWeighedEdited: false
        }
      ]);
    }
    restore();
  };

  // Action: Remove specific item from cart by Index, ID, or Banana Type (bulletproof deletion)
  const handleRemoveCartItem = (indexToRemove: number, idToRemove?: string, bananaTypeToRemove?: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const restore = captureScrollState();
    setCartItems(prev => {
      // 1. Primary: Direct index-based removal
      if (typeof indexToRemove === 'number' && indexToRemove >= 0 && indexToRemove < prev.length) {
        return prev.filter((_, idx) => idx !== indexToRemove);
      }
      // 2. Secondary fallback: remove by ID or Banana Type
      return prev.filter(it => {
        if (idToRemove && it.id === idToRemove) return false;
        if (bananaTypeToRemove && it.bananaType === bananaTypeToRemove) return false;
        return true;
      });
    });
    restore();
  };

  // Action: Clear entire cart (100% reliable, direct state reset)
  const handleClearCart = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const restore = captureScrollState();
    setCartItems([]);
    setShowCartValidation(false);
    restore();
  };

  const sanitizeWeightInput = (raw: string): string => {
    const cleaned = raw.replace(/[^0-9.,]/g, '');
    let hasSep = false;
    let out = '';
    for (const ch of cleaned) {
      if (ch === '.' || ch === ',') {
        if (!hasSep) {
          out += ch;
          hasSep = true;
        }
      } else {
        out += ch;
      }
    }
    return out;
  };

  // Action: Update cart item field
  const handleUpdateCartField = (
    id: string,
    field: 'weightKg' | 'sellPricePerKg',
    value: string
  ) => {
    setCartItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (field === 'weightKg') {
        return {
          ...item,
          weightKg: sanitizeWeightInput(value),
          isWeighedEdited: true
        };
      }
      return { ...item, [field]: value };
    }));
  };

  // Handle manual price typing with pure digits and auto Rupiah formatting
  const handlePriceChange = (id: string, inputValue: string) => {
    const digits = inputValue.replace(/\D/g, '');
    if (!digits) {
      handleUpdateCartField(id, 'sellPricePerKg', '');
    } else {
      const num = parseInt(digits, 10);
      handleUpdateCartField(id, 'sellPricePerKg', String(num));
    }
  };

  // Calculated totals of Cart:
  // - Berat Stok Keluar memotong stok gudang & menghitung Modal Pokok (HPP)
  // - Hasil Timbang menghitung tagihan ke pembeli (Omset) & dicetak pada struk pembeli
  // - Selisih Timbang = Hasil Timbang - Berat Stok Keluar
  const calculatedItems: SaleItem[] = cartItems.map(item => {
    const stockInfo = stockList.find(s => isSameVariety(s.bananaType, item.bananaType));
    const stockOutWeightKg =
      stockInfo && stockInfo.stockKg > 0
        ? Math.round(stockInfo.stockKg * 100) / 100
        : parseWeightInput(item.stockOutWeightKg);
    const numWeight = parseWeightInput(item.weightKg);
    const weightVarianceKg = Math.round((numWeight - stockOutWeightKg) * 100) / 100;
    const numSellPrice = Math.max(0, Math.round(parseFloat(item.sellPricePerKg) || 0));

    const costPrice = stockInfo && stockInfo.avgBuyPricePerKg > 0 
      ? Math.round(stockInfo.avgBuyPricePerKg) 
      : (TYPICAL_SELL_PRICES[item.bananaType] ? Math.round(TYPICAL_SELL_PRICES[item.bananaType] * 0.75) : 6500);

    const subtotalRevenue = Math.round(numWeight * numSellPrice);
    const subtotalCost = Math.round(stockOutWeightKg * costPrice);
    const subtotalProfit = subtotalRevenue - subtotalCost;

    return {
      bananaType: item.bananaType,
      weightKg: numWeight,
      stockOutWeightKg,
      weightVarianceKg,
      sellPricePerKg: numSellPrice,
      costPricePerKg: costPrice,
      subtotalRevenue,
      subtotalCost,
      subtotalProfit
    };
  });

  const totalCartWeight = Math.round(calculatedItems.reduce((acc, it) => acc + it.weightKg, 0) * 100) / 100;
  const totalCartStockOutWeight =
    Math.round(calculatedItems.reduce((acc, it) => acc + (it.stockOutWeightKg ?? it.weightKg), 0) * 100) / 100;
  const totalCartVariance = Math.round((totalCartWeight - totalCartStockOutWeight) * 100) / 100;
  const totalCartRevenue = calculatedItems.reduce((acc, it) => acc + it.subtotalRevenue, 0);
  const totalCartCost = calculatedItems.reduce((acc, it) => acc + it.subtotalCost, 0);
  const totalCartNetProfit = totalCartRevenue - totalCartCost;
  const overallMarginPercent = totalCartRevenue > 0 ? (totalCartNetProfit / totalCartRevenue) * 100 : 0;

  // Validation before opening modal
  const handleProceedToCheckout = () => {
    if (cartItems.length === 0) {
      return;
    }

    let hasError = false;
    for (const it of calculatedItems) {
      const stockInfo = stockList.find(s => isSameVariety(s.bananaType, it.bananaType));
      const availableKg = stockInfo ? stockInfo.stockKg : 0;
      const stockOutKg = it.stockOutWeightKg ?? it.weightKg;
      if (stockOutKg < 0.01 || stockOutKg > availableKg || it.weightKg < 0.01 || it.sellPricePerKg <= 0) {
        hasError = true;
      }
    }

    if (hasError) {
      setShowCartValidation(true);
      return;
    }

    // Open Checkout Lightbox
    setShowCartValidation(false);
    setModalErrorMsg('');
    setIsCheckoutModalOpen(true);
  };

  // Quick Due Date offset in days
  const handleSetQuickDueDate = (daysOffset: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    setDueDate(toLocalDateInput(target));
  };

  // Submit Final Sale from Modal
  const handleConfirmAndSaveSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingSale) return;
    setModalErrorMsg('');

    if (calculatedItems.length === 0) {
      setModalErrorMsg('Keranjang muatan kosong. Tambahkan minimal 1 jenis pisang.');
      return;
    }

    if (calculatedItems.length > 20) {
      setModalErrorMsg('Maksimal 20 item varietas dalam satu Surat Jalan.');
      return;
    }

    for (const it of calculatedItems) {
      const stockInfo = stockList.find(s => isSameVariety(s.bananaType, it.bananaType));
      const availableKg = stockInfo ? stockInfo.stockKg : 0;
      const stockOutKg = it.stockOutWeightKg ?? it.weightKg;
      if (stockOutKg < 0.01 || it.weightKg < 0.01 || it.sellPricePerKg <= 0) {
        setModalErrorMsg(`Periksa kembali berat stok keluar, hasil timbang (min 0,01 kg), dan harga jual untuk ${it.bananaType}.`);
        return;
      }
      if (stockOutKg > availableKg) {
        setModalErrorMsg(
          `Stok ${it.bananaType} berubah dan kini tersisa ${formatNumber(availableKg)} kg (stok keluar diminta ${formatNumber(stockOutKg)} kg). Tutup modal dan sesuaikan keranjang.`
        );
        return;
      }
    }

    setIsSubmittingSale(true);
    try {
      const restore = captureScrollState();
      // Logika penyimpanan: Jika nama pembeli dikosongkan, otomatis disimpan sebagai "Pembeli dari Gudang"
      const finalBuyerName = buyerWarehouseName.trim() || 'Pembeli dari Gudang';
      const trimmedWA = buyerWhatsApp.trim() || undefined;

      const uniqueTypes = Array.from(new Set(calculatedItems.map(it => it.bananaType)));
      const summaryTypeLabel = uniqueTypes.length === 1 
        ? uniqueTypes[0] 
        : `${uniqueTypes[0]} + ${uniqueTypes.length - 1} jenis lainnya`;

      const avgSellPrice = totalCartWeight > 0 ? Math.round(totalCartRevenue / totalCartWeight) : 0;

      onAddSale({
        buyerWarehouseName: finalBuyerName,
        buyerWhatsApp: trimmedWA,
        buyerPhone: trimmedWA,
        bananaType: summaryTypeLabel,
        items: calculatedItems,
        weightKg: totalCartWeight,
        stockOutWeightKg: totalCartStockOutWeight,
        weightVarianceKg: totalCartVariance,
        sellPricePerKg: avgSellPrice,
        totalRevenue: totalCartRevenue,
        estimatedCost: totalCartCost,
        netProfit: totalCartNetProfit,
        profitMarginPercent: overallMarginPercent,
        date: new Date().toISOString(),
        notes: undefined,
        paymentStatus: paymentStatus,
        paymentMethod: paymentStatus === 'LUNAS' ? paymentMethod : 'Transfer Susulan (Piutang)',
        dueDate: paymentStatus === 'BELUM_LUNAS' && dueDate ? dueDate : undefined,
        paidAt: paymentStatus === 'LUNAS' ? new Date().toISOString() : undefined
      });

      // Reset Cart & Close Modal cleanly
      blurActiveTrigger();
      setCartItems([]);
      setBuyerWarehouseName('');
      setBuyerWhatsApp('');
      setIsCheckoutModalOpen(false);
      restore();
    } finally {
      setIsSubmittingSale(false);
    }
  };

  // Confirm Paid Action in History
  const handleConfirmPaid = (sale: CentralWarehouseSale) => {
    const restore = captureScrollState();
    onMarkAsPaid(sale.id);
    restore();
  };

  // Calculated totals for table footer
  const totalReceivables = sales
    .filter(s => s.paymentStatus === 'BELUM_LUNAS')
    .reduce((acc, s) => acc + s.totalRevenue, 0);

  const totalPaidRevenue = sales
    .filter(s => s.paymentStatus === 'LUNAS')
    .reduce((acc, s) => acc + s.totalRevenue, 0);

  const totalAllRevenue = sales.reduce((acc, s) => acc + s.totalRevenue, 0);
  const totalAllProfit = sales.reduce((acc, s) => acc + s.netProfit, 0);

  // Combined Koreksi Stok (Shrinkage + Reject records unified)
  const combinedCorrections = [
    ...shrinkages.map((record) => ({ source: 'shrinkage' as const, record })),
    ...rejects.map((record) => ({ source: 'reject' as const, record }))
  ].sort((a, b) => new Date(b.record.date).getTime() - new Date(a.record.date).getTime());

  const totalCorrectionKg =
    Math.round(combinedCorrections.reduce((acc, item) => acc + (item.record.weightKg || 0), 0) * 100) / 100;
  const totalCorrectionLoss = combinedCorrections.reduce(
    (acc, item) => acc + (item.record.totalLossAmount || 0),
    0
  );

  // Open Koreksi Stok Modal for a specific variety
  const handleOpenCorrectionModal = (stockItem: BananaStockSummary) => {
    if (stockItem.stockKg <= 0) return;
    setCorrectionTargetStock(stockItem);
    setCorrectionWeightKg('');
    setCorrectionReason(STOCK_CORRECTION_REASONS[0]);
    setCorrectionNotes('');
    setCorrectionModalError('');
  };

  const handleSetCorrectionAllStock = () => {
    if (!correctionTargetStock) return;
    setCorrectionWeightKg(String(correctionTargetStock.stockKg));
    setCorrectionModalError('');
  };

  const handleSubmitCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTargetStock || (!onAddShrinkage && !onAddReject)) return;

    const numWeight = parseWeightInput(correctionWeightKg);

    if (numWeight < 0.01) {
      setCorrectionModalError('Masukkan berat koreksi stok (kg) minimal 0,01 kg.');
      return;
    }

    if (numWeight > correctionTargetStock.stockKg) {
      setCorrectionModalError(
        `Berat koreksi (${formatNumber(numWeight)} kg) melebihi sisa stok tersedia (${formatNumber(correctionTargetStock.stockKg)} kg).`
      );
      return;
    }

    const costBasisPerKg =
      correctionTargetStock.avgBuyPricePerKg > 0
        ? Math.round(correctionTargetStock.avgBuyPricePerKg)
        : (TYPICAL_BUY_PRICES[correctionTargetStock.bananaType] || 0);
    const lossAmount = Math.round(numWeight * costBasisPerKg);

    const restore = captureScrollState();
    const correctionPayload = {
      bananaType: correctionTargetStock.bananaType,
      weightKg: numWeight,
      bunches: 0,
      costPricePerKg: costBasisPerKg,
      totalLossAmount: lossAmount,
      reason: correctionReason,
      notes: correctionNotes.trim() || undefined,
      date: new Date().toISOString()
    };

    if (onAddShrinkage) {
      onAddShrinkage(correctionPayload);
    } else if (onAddReject) {
      onAddReject(correctionPayload);
    }

    // Synchronize active cart if this variety is already in cart
    const remainingKgAfterCorrection =
      Math.round(Math.max(0, correctionTargetStock.stockKg - numWeight) * 100) / 100;
    setCartItems((prev) =>
      prev.flatMap((item) => {
        if (!isSameVariety(item.bananaType, correctionTargetStock.bananaType)) {
          return [item];
        }
        if (remainingKgAfterCorrection <= 0) {
          return [];
        }
        const currentStockOutKg = parseWeightInput(item.stockOutWeightKg);
        if (currentStockOutKg > remainingKgAfterCorrection) {
          const nextStockOutStr = String(remainingKgAfterCorrection);
          return [
            {
              ...item,
              stockOutWeightKg: nextStockOutStr,
              weightKg: item.isWeighedEdited ? item.weightKg : nextStockOutStr
            }
          ];
        }
        return [item];
      })
    );

    blurActiveTrigger();
    setCorrectionTargetStock(null);
    restore();
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Manajemen Inventori &amp; Distribusi Pusat</span>
          </div>
          <h2 className="text-lg sm:text-2xl font-bold text-stone-900 tracking-tight">
            Stok Pisang Lapak &amp; Penjualan ke Gudang Pusat
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Pilih varietas pisang ke keranjang muatan, sesuaikan volume, dan terbitkan Surat Jalan melalui pop-up checkout.
          </p>
        </div>
      </div>

      {/* =========================================================================
          GRID 2 KOLOM (SIDE-BY-SIDE):
          SISI KIRI: DAFTAR STOK RINGKAS DENGAN TOMBOL "+ KERANJANG" (RATA ATAS / TOP-ALIGNED)
          SISI KANAN: PANEL KERANJANG RINGKAS DENGAN MAX-HEIGHT (NO SCREEN OVERFLOW)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* SISI KIRI (7 Kolom Desktop): DAFTAR STOK PISANG RINGKAS - RATA ATAS */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-stone-200 p-4 sm:p-5 shadow-xs flex flex-col justify-start items-stretch space-y-4 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-800 shrink-0" />
              <h3 className="text-sm sm:text-base font-bold text-stone-900">
                Daftar Stok Siap Kirim
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
              {stockList.filter(s => s.stockKg > 0).length} Varietas Tersedia
            </span>
          </div>

          {/* Mobile Stock Cards (< sm) */}
          <div className="sm:hidden space-y-2.5">
            {stockList.map(item => {
              const hasStock = item.stockKg > 0;
              const isOutOfStock = !hasStock;
              const inCart = cartItems.some(c => isSameVariety(c.bananaType, item.bananaType));
              const hasActiveStock = item.stockKg > 0 && item.avgBuyPricePerKg > 0;

              return (
                <div key={item.bananaType} className="p-3 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base select-none shrink-0">🍌</span>
                      <div className="min-w-0">
                        <span className="font-bold text-stone-900 block text-xs leading-tight">
                          {item.bananaType}
                        </span>
                        {!MAIN_BANANA_TYPES.includes(item.bananaType) && (
                          <span className="inline-block text-[9px] bg-amber-50 text-amber-800 border border-amber-200/90 px-1.5 py-0.2 rounded font-medium mt-0.5">
                            Ketik Manual
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-200/70 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-400 block">Sisa Stok</span>
                      <span className={`font-mono font-bold tabular-nums ${hasStock ? 'text-stone-900' : 'text-stone-400'}`}>
                        {formatNumber(item.stockKg)} kg
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 block">Harga Beli Rata2</span>
                      <span className={`font-mono tabular-nums ${hasActiveStock ? 'font-bold text-stone-900' : 'text-stone-400'}`}>
                        {hasActiveStock ? `${formatRupiah(item.avgBuyPricePerKg)}/kg` : 'Rp. 0/kg'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-200/70 flex items-center justify-end gap-1.5 whitespace-nowrap">
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => handleOpenCorrectionModal(item)}
                      title={isOutOfStock ? 'Stok kosong (0 kg)' : `Koreksi stok (buah busuk/rusak atau susut) untuk ${item.bananaType}`}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 transition flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap disabled:opacity-35 disabled:cursor-not-allowed"
                    >
                      <Scale className="w-3.5 h-3.5 shrink-0" />
                      <span>Koreksi Stok</span>
                    </button>
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => {
                        if (inCart) {
                          handleRemoveCartItem(-1, undefined, item.bananaType);
                        } else {
                          handleAddToCart(item);
                        }
                      }}
                      title={isOutOfStock ? 'Stok belum tersedia (0 kg)' : inCart ? 'Sudah di Keranjang (klik untuk hapus)' : 'Tambah ke Keranjang'}
                      aria-label={inCart ? 'Sudah di Keranjang' : 'Tambah ke Keranjang'}
                      className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-0.5 shrink-0 cursor-pointer whitespace-nowrap ${
                        inCart 
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300'
                          : 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs disabled:opacity-35 disabled:cursor-not-allowed'
                      }`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                      {inCart ? (
                        <Check className="w-3 h-3 stroke-[2.75] shrink-0" />
                      ) : (
                        <Plus className="w-3 h-3 stroke-[2.75] shrink-0" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compact Stock Table (>= sm) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-[10px] font-bold text-stone-500 uppercase tracking-wider bg-stone-50/80">
                  <th className="py-2.5 px-2.5 text-left">Jenis Pisang</th>
                  <th className="py-2.5 px-2.5 text-left whitespace-nowrap">Sisa Stok (Kg)</th>
                  <th className="py-2.5 px-2.5 text-left whitespace-nowrap">Modal Rata2</th>
                  <th className="py-2.5 px-2.5 text-center whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {stockList.map(item => {
                  const hasStock = item.stockKg > 0;
                  const isOutOfStock = !hasStock;
                  const inCart = cartItems.some(c => isSameVariety(c.bananaType, item.bananaType));
                  const hasActiveStock = item.stockKg > 0 && item.avgBuyPricePerKg > 0;

                  return (
                    <tr key={item.bananaType} className="hover:bg-stone-50/80 transition group">
                      {/* 1. Jenis Pisang */}
                      <td className="py-3 px-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base select-none shrink-0">🍌</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-stone-900 block text-xs leading-tight">
                              {item.bananaType}
                            </span>
                            {!MAIN_BANANA_TYPES.includes(item.bananaType) && (
                              <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200/90 px-1.5 py-0.2 rounded font-medium">
                                Ketik Manual
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Sisa Stok (Kg) */}
                      <td className="py-3 px-2.5 text-left whitespace-nowrap">
                        <span className={`font-mono font-bold block tabular-nums text-xs leading-tight ${
                          hasStock ? 'text-stone-900' : 'text-stone-400'
                        }`}>
                          {formatNumber(item.stockKg)} kg
                        </span>
                      </td>

                      {/* 3. Harga Beli (Rata-Rata) */}
                      <td className="py-3 px-2.5 text-left whitespace-nowrap">
                        <span className={`font-mono tabular-nums text-xs leading-tight inline-flex items-baseline gap-1 ${
                          hasActiveStock ? 'font-bold text-stone-900' : 'font-normal text-stone-400'
                        }`}>
                          <span>{hasActiveStock ? formatRupiah(item.avgBuyPricePerKg) : 'Rp. 0'}</span>
                          <span className={`text-[10.5px] font-normal ${
                            hasActiveStock ? 'text-stone-500' : 'text-stone-400'
                          }`}>
                            /kg
                          </span>
                        </span>
                      </td>

                      {/* 4. Tombol Aksi: Ikon +Keranjang & Koreksi Stok sejajar 1 baris */}
                      <td className="py-3 px-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => {
                              if (inCart) {
                                handleRemoveCartItem(-1, undefined, item.bananaType);
                              } else {
                                handleAddToCart(item);
                              }
                            }}
                            title={isOutOfStock ? 'Stok belum tersedia (0 kg)' : inCart ? 'Sudah di Keranjang (klik untuk hapus)' : 'Tambah ke Keranjang'}
                            aria-label={inCart ? 'Sudah di Keranjang' : 'Tambah ke Keranjang'}
                            className={`px-2 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-0.5 cursor-pointer whitespace-nowrap shrink-0 ${
                              inCart 
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300'
                                : 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs disabled:opacity-35 disabled:cursor-not-allowed'
                            }`}
                          >
                            <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                            {inCart ? (
                              <Check className="w-3 h-3 stroke-[2.75] shrink-0" />
                            ) : (
                              <Plus className="w-3 h-3 stroke-[2.75] shrink-0" />
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => handleOpenCorrectionModal(item)}
                            title={isOutOfStock ? 'Stok kosong (0 kg)' : `Catat koreksi stok (busuk/susut) untuk ${item.bananaType}`}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 text-amber-800 transition flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-35 disabled:cursor-not-allowed"
                          >
                            <Scale className="w-3.5 h-3.5 shrink-0" />
                            <span>Koreksi Stok</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-500 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <span>Klik ikon <strong className="text-emerald-800 font-semibold">Keranjang (+)</strong> untuk jual, atau <strong className="text-amber-800 font-semibold">Koreksi Stok</strong> untuk buah busuk/susut di luar penjualan</span>
            <span className="font-mono text-emerald-900 font-bold shrink-0">
              {formatNumber(stockList.reduce((acc, s) => acc + s.stockKg, 0))} kg total stok
            </span>
          </div>
        </div>

        {/* SISI KANAN (5 Kolom Desktop): PANEL KERANJANG RINGKAS */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-stone-200 shadow-xs flex flex-col overflow-hidden">
          {/* Cart Header */}
          <div className="p-4 border-b border-stone-200 bg-stone-50/70 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 leading-tight">
                  Keranjang Muatan Gudang
                </h3>
                <span className="text-[11px] text-stone-500">
                  {cartItems.length} jenis pisang terpilih
                </span>
              </div>
            </div>

            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="text-[11px] text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200/80 px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-semibold shadow-2xs"
                title="Kosongkan seluruh isi keranjang"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan</span>
              </button>
            )}
          </div>

          {/* Scrollable Cart Items Container */}
          <div
            data-scroll-preserve="cart-items"
            className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[240px] lg:min-h-[420px]"
          >
            {cartItems.length === 0 ? (
              <div className="h-full min-h-[200px] lg:min-h-[380px] py-8 lg:py-12 px-4 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mb-3">
                  <ShoppingCart className="w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-stone-800">Keranjang Muatan Masih Kosong</p>
                <p className="text-xs text-stone-500 mt-1.5 max-w-xs leading-relaxed">
                  Pilih varietas pisang di sebelah kiri untuk menambah ke nota penjualan.
                </p>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full mt-3.5">
                  <span>Klik ikon</span>
                  <span className="inline-flex items-center gap-0.5 font-bold">
                    <ShoppingCart className="w-3 h-3" />
                    <Plus className="w-2.5 h-2.5 stroke-[2.75]" />
                  </span>
                  <span>pada tabel stok</span>
                </div>
              </div>
            ) : (
              cartItems.map((cartItem, idx) => {
                const currentStock = stockList.find(s => isSameVariety(s.bananaType, cartItem.bananaType));
                const stockKg = currentStock ? currentStock.stockKg : 0;
                const numStockOutKg =
                  stockKg > 0
                    ? Math.round(stockKg * 100) / 100
                    : parseWeightInput(cartItem.stockOutWeightKg);
                const hasWeighedValue = cartItem.weightKg.trim() !== '';
                const numWeighedKg = parseWeightInput(cartItem.weightKg);
                const varianceKg = Math.round((numWeighedKg - numStockOutKg) * 100) / 100;
                const numPrice = Math.max(0, Math.round(parseFloat(cartItem.sellPricePerKg) || 0));
                const subtotal = Math.round(numWeighedKg * numPrice);

                const isStockOutExceeding = numStockOutKg > stockKg;
                const isStockOutEmptyOrZero = showCartValidation && numStockOutKg < 0.01;
                const isStockOutInvalid = isStockOutExceeding || isStockOutEmptyOrZero;
                const isWeighedInvalid = showCartValidation && numWeighedKg < 0.01;
                const isPriceInvalid = showCartValidation && numPrice <= 0;

                return (
                  <div 
                    key={cartItem.id}
                    className={`p-3 rounded-xl border transition ${
                      isStockOutExceeding ? 'bg-red-50/60 border-red-300' : 'bg-stone-50/70 border-stone-200'
                    }`}
                  >
                    {/* Item Title & Subtotal Bar */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-200/60">
                      <div>
                        <span className="text-[10px] text-stone-400 font-semibold uppercase block">
                          Item #{idx + 1} · Stok: {formatNumber(stockKg)} kg
                        </span>
                        <strong className="text-xs text-stone-900 block leading-tight">
                          {cartItem.bananaType}
                        </strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-emerald-900 tabular-nums">
                          {formatRupiah(subtotal)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveCartItem(idx, cartItem.id, cartItem.bananaType, e);
                          }}
                          className="p-1.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 active:bg-red-200 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0 border border-red-200 shadow-2xs group"
                          title={`Hapus ${cartItem.bananaType} dari keranjang muatan`}
                          aria-label={`Hapus ${cartItem.bananaType}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-600 group-hover:text-red-700 transition-colors" />
                        </button>
                      </div>
                    </div>

                    {/* 3 Weight/Variance Fields + Harga Jual */}
                    <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2.5 text-xs items-start">
                      {/* 1. Berat Stok Keluar (Kg) - Otomatis & Tidak Bisa Diubah */}
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">
                          Berat Stok Keluar (Kg)
                        </label>
                        <div
                          aria-readonly="true"
                          className={`w-full px-2.5 py-1.5 text-xs border rounded-lg font-mono font-bold tabular-nums select-none cursor-not-allowed flex items-center justify-between ${
                            isStockOutInvalid
                              ? 'bg-red-50 border-red-400 text-red-700'
                              : 'bg-stone-100 border-stone-200 text-stone-700'
                          }`}
                        >
                          <span>{formatNumber(numStockOutKg)} kg</span>
                          <span className="text-[9.5px] font-sans font-semibold text-stone-400">
                            Otomatis
                          </span>
                        </div>
                        {isStockOutInvalid ? (
                          <span className="text-[10px] text-red-600 font-semibold block mt-0.5 leading-tight">
                            {isStockOutEmptyOrZero
                              ? 'Stok kosong (0 kg)'
                              : `Melebihi stok (${formatNumber(stockKg)} kg)`}
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-400 block mt-0.5 leading-tight">
                            Potong stok &amp; modal gudang
                          </span>
                        )}
                      </div>

                      {/* 2. Hasil Timbang (Kg) - Wajib diisi manual */}
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">
                          Hasil Timbang (Kg) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          required
                          value={cartItem.weightKg}
                          onChange={(e) => handleUpdateCartField(cartItem.id, 'weightKg', e.target.value)}
                          placeholder="0 kg"
                          aria-invalid={isWeighedInvalid}
                          className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded-lg font-mono tabular-nums placeholder:text-stone-400 focus:outline-none focus:ring-1 transition-colors ${
                            isWeighedInvalid
                              ? 'border-red-500 ring-1 ring-red-500/20 focus:ring-red-500'
                              : 'border-stone-200 focus:ring-emerald-700'
                          }`}
                        />
                        {isWeighedInvalid ? (
                          <span className="text-[10px] text-red-600 font-semibold block mt-0.5 leading-tight">
                            Wajib diisi (&gt; 0 kg)
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-400 block mt-0.5 leading-tight">
                            Dicetak di struk &amp; tagihan
                          </span>
                        )}
                      </div>

                      {/* 3. Input Harga Jual Manual */}
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">
                          Harga Jual / kg <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          value={formatRupiahInput(cartItem.sellPricePerKg)}
                          onChange={(e) => handlePriceChange(cartItem.id, e.target.value)}
                          placeholder="Rp. 0"
                          aria-invalid={isPriceInvalid}
                          className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded-lg font-mono tabular-nums placeholder:text-stone-400 focus:outline-none focus:ring-1 transition-colors ${
                            isPriceInvalid
                              ? 'border-red-500 ring-1 ring-red-500/20 focus:ring-red-500'
                              : 'border-stone-200 focus:ring-emerald-700'
                          }`}
                        />
                        <span className={`text-[10px] block mt-0.5 leading-tight ${
                          isPriceInvalid ? 'text-red-600 font-semibold' : 'text-stone-400'
                        }`}>
                          {isPriceInvalid ? 'Wajib diisi (> Rp. 0)' : 'Input manual (Rp.)'}
                        </span>
                      </div>

                      {/* 4. Selisih Timbang (Read-only auto-computed, placeholder 0 kg saat Hasil Timbang kosong) */}
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">
                          Selisih Timbang
                        </label>
                        {!hasWeighedValue ? (
                          <div className="w-full px-2.5 py-1.5 text-xs border rounded-lg font-mono tabular-nums bg-stone-100 border-stone-200 text-stone-400 flex items-center justify-between">
                            <span>0 kg</span>
                          </div>
                        ) : (
                          <div
                            className={`w-full px-2.5 py-1.5 text-xs border rounded-lg font-mono font-bold tabular-nums flex items-center justify-between ${
                              varianceKg > 0
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : varianceKg < 0
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : 'bg-stone-100 border-stone-200 text-stone-600'
                            }`}
                          >
                            <span>{formatSignedKg(varianceKg)}</span>
                            <span className="text-[9.5px] font-sans font-semibold opacity-80">
                              {varianceKg === 0 ? 'Pas' : varianceKg > 0 ? 'Lebih' : 'Kurang'}
                            </span>
                          </div>
                        )}
                        <span className="text-[10px] text-stone-400 block mt-0.5 leading-tight">
                          Hasil Timbang - Stok Keluar
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sticky Bottom Summary & Primary Checkout Button */}
          <div className="p-4 border-t border-stone-200 bg-stone-50/90 shrink-0 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-stone-600">
                <span className="font-medium">Total Hasil Timbang (Pembeli):</span>
                <span className="font-mono font-bold text-stone-900 tabular-nums">
                  {formatNumber(totalCartWeight)} kg
                </span>
              </div>
              {totalCartWeight > 0 && Math.abs(totalCartVariance) > 0.001 && (
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span>
                    Stok Keluar Gudang: <strong className="font-mono text-stone-700">{formatNumber(totalCartStockOutWeight)} kg</strong>
                  </span>
                  <span
                    className={`font-mono font-bold tabular-nums ${
                      totalCartVariance > 0 ? 'text-emerald-700' : 'text-amber-800'
                    }`}
                  >
                    Selisih Timbang: {formatSignedKg(totalCartVariance)}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-stone-200 flex flex-wrap items-center justify-between gap-1">
                <span className="font-bold text-stone-900 text-xs">Total Tagihan Penjualan:</span>
                <span className="font-mono font-extrabold text-emerald-950 text-base sm:text-lg tabular-nums">
                  {formatRupiah(totalCartRevenue)}
                </span>
              </div>
            </div>

            {/* Primary Action Button: Open Checkout Modal */}
            <button
              type="button"
              disabled={cartItems.length === 0}
              onClick={handleProceedToCheckout}
              className={`w-full py-2.5 px-4 font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-2 text-xs sm:text-sm ${
                cartItems.length === 0
                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed opacity-80'
                  : 'bg-emerald-800 hover:bg-emerald-900 text-white cursor-pointer active:scale-[0.99]'
              }`}
            >
              <span>Lanjut ke Pembayaran &amp; Surat Jalan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          POP-UP / MODAL PEMBAYARAN & CHECKOUT (LIGHTBOX)
         ========================================================================= */}
      {isCheckoutModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              const restore = captureScrollState();
              blurActiveTrigger();
              setIsCheckoutModalOpen(false);
              restore();
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-150">
            {/* 1. Fixed Modal Header */}
            <div className="bg-emerald-900 text-white px-5 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between shrink-0 border-b border-emerald-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-800 flex items-center justify-center text-lg shrink-0">
                  🚚
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base leading-tight">
                    Form Konfirmasi Pembayaran
                  </h3>
                  <p className="text-[11px] text-emerald-200">
                    Penerbitan Surat Jalan Gudang Pusat
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const restore = captureScrollState();
                  blurActiveTrigger();
                  setIsCheckoutModalOpen(false);
                  restore();
                }}
                className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-800 transition cursor-pointer"
                title="Tutup Form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2. Form with Scrollable Body and Fixed Footer */}
            <form onSubmit={handleConfirmAndSaveSale} className="flex flex-col flex-1 overflow-hidden">
              {/* Scrollable Form Body Container - space-y-3 for compact single-screen view */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                {modalErrorMsg && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{modalErrorMsg}</span>
                  </div>
                )}

                {/* 1. Nama Pembeli (Opsional) */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nama Pembeli (Opsional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      autoCapitalize="words"
                      value={buyerWarehouseName}
                      onChange={(e) => handleCapitalizedInputChange(e, capitalizeEachWord, setBuyerWarehouseName)}
                      placeholder="Nama Pembeli"
                      className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>
                  <span className="text-[10px] text-stone-400 mt-0.5 block">
                    Bila dikosongkan, tersimpan otomatis sebagai: <strong className="text-stone-600">"Pembeli dari Gudang"</strong>
                  </span>
                </div>

                {/* 2. No WhatsApp (Opsional) */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    No WhatsApp (Opsional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={buyerWhatsApp}
                      onChange={(e) => setBuyerWhatsApp(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700 font-mono"
                    />
                  </div>
                </div>

                {/* 3. Metode & Status Pembayaran */}
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                  <span className="text-xs font-bold text-stone-800 block">
                    Metode &amp; Status Pembayaran <span className="text-red-500">*</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label 
                      className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition text-xs ${
                        paymentStatus === 'BELUM_LUNAS'
                          ? 'bg-amber-50/90 border-amber-300 text-amber-900 font-semibold'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_option_modal"
                        checked={paymentStatus === 'BELUM_LUNAS'}
                        onChange={() => {
                          setPaymentStatus('BELUM_LUNAS');
                          setPaymentMethod('Transfer Susulan (Piutang)');
                        }}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <span className="block font-bold leading-tight">Transfer Susulan (Piutang)</span>
                        <span className="text-[10px] text-amber-800/80 block mt-0.5">
                          Menunggu transfer gudang pusat
                        </span>
                      </div>
                    </label>

                    <label 
                      className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition text-xs ${
                        paymentStatus === 'LUNAS'
                          ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 font-semibold'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_option_modal"
                        checked={paymentStatus === 'LUNAS'}
                        onChange={() => {
                          setPaymentStatus('LUNAS');
                          setPaymentMethod('Transfer Bank');
                        }}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="block font-bold leading-tight">Lunas (Transfer/Tunai)</span>
                        <span className="text-[10px] text-emerald-800/80 block mt-0.5">
                          Uang langsung cair / lunas saat kirim
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Due Date for Unpaid */}
                  {paymentStatus === 'BELUM_LUNAS' && (
                    <div className="pt-2 border-t border-amber-200/70 animate-in fade-in duration-150">
                      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                        <label className="text-[11px] font-semibold text-amber-950 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-amber-700" />
                          Tanggal Janji Bayar / Jatuh Tempo:
                        </label>
                        <div className="flex items-center gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleSetQuickDueDate(3)}
                            className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-medium cursor-pointer"
                          >
                            +3 Hari
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetQuickDueDate(7)}
                            className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-medium cursor-pointer"
                          >
                            +7 Hari
                          </button>
                        </div>
                      </div>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg text-amber-950 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  )}
                </div>

                {/* 3. Ringkasan Akhir Muatan & Tagihan */}
                <div className="p-3.5 sm:p-4 bg-emerald-50/90 rounded-xl border border-emerald-200 space-y-2">
                  <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider block">
                    Ringkasan Muatan ({calculatedItems.length} Jenis Pisang)
                  </span>

                  <div className="flex flex-wrap gap-1 pb-2 border-b border-emerald-200/80">
                    {calculatedItems.map((it, idx) => (
                      <span 
                        key={idx}
                        className="text-[10px] font-medium bg-white text-emerald-900 px-2 py-0.5 rounded border border-emerald-200 font-mono"
                      >
                        {it.bananaType}: {formatNumber(it.weightKg)} kg (@{formatRupiah(it.sellPricePerKg)})
                        {it.weightVarianceKg !== undefined && Math.abs(it.weightVarianceKg) > 0.001
                          ? ` · Selisih ${formatSignedKg(it.weightVarianceKg)}`
                          : ''}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-stone-500 block">Hasil Timbang:</span>
                      <span className="font-mono font-bold text-stone-900 tabular-nums">
                        {formatNumber(totalCartWeight)} kg
                      </span>
                      {Math.abs(totalCartVariance) > 0.001 && (
                        <span className="text-[10px] text-stone-500 block font-mono">
                          Stok keluar {formatNumber(totalCartStockOutWeight)} kg ({formatSignedKg(totalCartVariance)})
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">Modal Stok Keluar:</span>
                      <span className="font-mono text-stone-600 tabular-nums">
                        {formatRupiah(totalCartCost)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-800 font-semibold block">Estimasi Laba:</span>
                      <span className={`font-mono font-bold tabular-nums ${totalCartNetProfit >= 0 ? 'text-emerald-900' : 'text-rose-700'}`}>
                        {formatSignedRupiah(totalCartNetProfit)} ({overallMarginPercent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-emerald-200/80 flex items-baseline justify-between">
                    <span className="text-xs font-bold text-emerald-950">
                      Total Nilai Tagihan:
                    </span>
                    <span className="text-lg sm:text-xl font-extrabold font-mono text-emerald-950 tabular-nums">
                      {formatRupiah(totalCartRevenue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Fixed Modal Footer Actions (Always visible without page scrolling) */}
              <div className="p-3.5 sm:p-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-2.5 sm:gap-3">
                <span className="text-[11px] text-stone-500 hidden sm:inline">
                  * Stok gudang otomatis terpotong saat transaksi dikonfirmasi
                </span>
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const restore = captureScrollState();
                      blurActiveTrigger();
                      setIsCheckoutModalOpen(false);
                      restore();
                    }}
                    className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold transition cursor-pointer text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingSale}
                    className="px-4 sm:px-5 py-2.5 sm:py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99] disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{isSubmittingSale ? 'Menyimpan...' : 'Konfirmasi & Simpan Transaksi'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          RIWAYAT PENJUALAN KE GUDANG PUSAT DENGAN MULTI-ITEM SUPPORT & TANDAI LUNAS
         ========================================================================= */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-6 shadow-xs flex flex-col justify-between min-w-0">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100">
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-800 shrink-0" />
                <span>Riwayat Pengiriman &amp; Status Pembayaran Gudang</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Daftar transaksi penjualan grosir dengan rincian komoditas dan status pelunasan piutang
              </p>
            </div>
            <span className="text-xs font-semibold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-md self-start sm:self-auto shrink-0">
              {sales.length} Pengiriman Selesai
            </span>
          </div>

          <div className="mt-4">
            {sales.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-stone-700">Belum ada transaksi penjualan ke gudang pusat</p>
                <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                  Gunakan keranjang muatan di atas untuk menerbitkan Surat Jalan pertama.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile & Tablet Card List (< lg) */}
                <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sales.map((sale) => {
                    const isUnpaid = sale.paymentStatus === 'BELUM_LUNAS';

                    return (
                      <div
                        key={sale.id}
                        className={`p-3.5 rounded-xl border space-y-2.5 ${
                          isUnpaid ? 'bg-amber-50/40 border-amber-200' : 'bg-stone-50/60 border-stone-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-mono font-semibold text-stone-900 block text-[11px]">
                              {sale.invoiceNumber}
                            </span>
                            <span className="font-bold text-stone-900 block text-sm truncate">
                              {sale.buyerWarehouseName}
                            </span>
                            <span className="text-[10px] text-stone-400 block">
                              {formatDateTimeIndo(sale.date)}
                            </span>
                            {sale.buyerWhatsApp && (
                              <span className="text-[10px] text-emerald-800 font-mono font-medium block">
                                WA: {sale.buyerWhatsApp}
                              </span>
                            )}
                          </div>

                          <div className="shrink-0">
                            {isUnpaid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                                <Clock3 className="w-3 h-3 text-amber-700 shrink-0" />
                                <span>Piutang</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                                <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0" />
                                <span>Lunas</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {sale.items && sale.items.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {sale.items.map((it, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-medium bg-emerald-50 text-emerald-900 px-1.5 py-0.5 rounded border border-emerald-200 font-mono"
                              >
                                {(it.bananaType || 'Pisang').replace('Pisang ', '')}: {formatNumber(it.weightKg)}kg
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-block text-[11px] text-emerald-800 font-medium">
                            {sale.bananaType}
                          </span>
                        )}

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-200/70 text-xs">
                          <div>
                            <span className="text-[10px] text-stone-400 block">Hasil Timbang</span>
                            <strong className="font-mono text-stone-900 tabular-nums">{formatNumber(sale.weightKg)} kg</strong>
                            {sale.weightVarianceKg !== undefined && Math.abs(sale.weightVarianceKg) > 0.001 && (
                              <span className={`text-[9.5px] font-mono block ${sale.weightVarianceKg > 0 ? 'text-emerald-700' : 'text-amber-800'}`}>
                                Selisih: {formatSignedKg(sale.weightVarianceKg)}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 block">Tagihan</span>
                            <strong className="font-mono text-stone-900 tabular-nums">{formatRupiah(sale.totalRevenue)}</strong>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-stone-400 block">Laba Bersih</span>
                            <strong className={`font-mono tabular-nums ${sale.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                              {formatSignedRupiah(sale.netProfit)}
                            </strong>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-stone-200/70 flex flex-wrap items-center justify-between gap-2">
                          <div className="text-[10px] text-stone-500">
                            {isUnpaid && sale.dueDate ? (
                              <span className="text-amber-800 font-mono">Tempo: {formatDateIndo(sale.dueDate)}</span>
                            ) : (
                              <span>{formatPaymentMethodLabel(sale.paymentStatus, sale.paymentMethod)}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 ml-auto">
                            {isUnpaid && (
                              <button
                                type="button"
                                onClick={() => handleConfirmPaid(sale)}
                                className="px-2.5 py-1 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Tandai Lunas</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onViewInvoice(sale)}
                              className="p-1.5 text-stone-600 hover:text-emerald-800 bg-white border border-stone-200 rounded-lg transition cursor-pointer"
                              title="Lihat & Cetak Surat Jalan Resmi"
                            >
                              <FileCheck2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSaleToDelete(sale)}
                              className="p-1.5 text-red-500 hover:text-red-700 bg-white border border-stone-200 rounded-lg transition cursor-pointer"
                              title={`Hapus Riwayat Pengiriman ${sale.invoiceNumber}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table (>= lg) */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider bg-stone-50/60">
                        <th className="py-2.5 px-3">Surat Jalan</th>
                        <th className="py-2.5 px-3">Gudang &amp; Rincian Muatan</th>
                        <th className="py-2.5 px-3 text-right">Volume (Kg)</th>
                        <th className="py-2.5 px-3 text-right">Total Tagihan</th>
                        <th className="py-2.5 px-3 text-right">Laba Bersih</th>
                        <th className="py-2.5 px-3 text-center">Status Pembayaran</th>
                        <th className="py-2.5 px-3 text-center">Aksi Pelunasan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
                      {sales.map((sale) => {
                        const isUnpaid = sale.paymentStatus === 'BELUM_LUNAS';

                        return (
                          <tr key={sale.id} className={`transition ${isUnpaid ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-stone-50/70'}`}>
                            {/* No Surat Jalan & Tanggal */}
                            <td className="py-3 px-3">
                              <span className="font-mono font-semibold text-stone-900 block text-[11px]">
                                {sale.invoiceNumber}
                              </span>
                              <span className="text-[10px] text-stone-400 block">
                                {formatDateTimeIndo(sale.date)}
                              </span>
                            </td>

                            {/* Gudang & Rincian Muatan Pisang */}
                            <td className="py-3 px-3">
                              <span className="font-bold text-stone-900 block text-xs">
                                {sale.buyerWarehouseName}
                              </span>
                              {sale.buyerWhatsApp && (
                                <span className="text-[10px] text-emerald-800 font-mono font-medium block">
                                  WA: {sale.buyerWhatsApp}
                                </span>
                              )}
                              {/* Multi-item breakdown tags if available */}
                              {sale.items && sale.items.length > 0 ? (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {sale.items.map((it, idx) => (
                                    <span 
                                      key={idx} 
                                      className="text-[10px] font-medium bg-emerald-50 text-emerald-900 px-1.5 py-0.2 rounded border border-emerald-200 font-mono"
                                    >
                                      {(it.bananaType || 'Pisang').replace('Pisang ', '')}: {formatNumber(it.weightKg)}kg
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[11px] text-emerald-800 font-medium">
                                  {sale.bananaType}
                                </span>
                              )}
                              {sale.notes && (
                                <span className="text-[10px] text-stone-400 italic block mt-0.5 truncate max-w-[200px]">
                                  {sale.notes}
                                </span>
                              )}
                            </td>

                            {/* Volume Kg */}
                            <td className="py-3 px-3 text-right">
                              <span className="font-mono font-bold text-stone-900 block tabular-nums">
                                {formatNumber(sale.weightKg)} kg
                              </span>
                              {sale.weightVarianceKg !== undefined && Math.abs(sale.weightVarianceKg) > 0.001 && (
                                <span className={`text-[10px] font-mono block tabular-nums ${
                                  sale.weightVarianceKg > 0 ? 'text-emerald-700' : 'text-amber-800'
                                }`}>
                                  Keluar {formatNumber(sale.stockOutWeightKg ?? sale.weightKg)} kg · Selisih {formatSignedKg(sale.weightVarianceKg)}
                                </span>
                              )}
                            </td>

                            {/* Total Tagihan Penjualan */}
                            <td className="py-3 px-3 text-right">
                              <span className="font-mono font-bold text-stone-900 block tabular-nums">
                                {formatRupiah(sale.totalRevenue)}
                              </span>
                              <span className="text-[10px] text-stone-400 block font-mono tabular-nums">
                                Rata2: @{formatRupiah(sale.sellPricePerKg)}/kg
                              </span>
                            </td>

                            {/* Laba Bersih */}
                            <td className="py-3 px-3 text-right">
                              <span className={`font-mono font-bold block tabular-nums ${sale.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                                {formatSignedRupiah(sale.netProfit)}
                              </span>
                              <span className={`text-[10px] font-semibold font-mono tabular-nums ${sale.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                ({sale.profitMarginPercent.toFixed(1)}%)
                              </span>
                            </td>

                            {/* Status Pembayaran */}
                            <td className="py-3 px-3 text-center">
                              {isUnpaid ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                                    <Clock3 className="w-3 h-3 text-amber-700 shrink-0" />
                                    <span>Belum Lunas (Piutang)</span>
                                  </span>
                                  {sale.dueDate && (
                                    <span className="text-[9px] text-amber-800 mt-0.5 block font-mono">
                                      Tempo: {formatDateIndo(sale.dueDate)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="inline-flex flex-col items-center">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0" />
                                    <span>Lunas</span>
                                  </span>
                                  <span className="text-[9px] text-emerald-700 mt-0.5 block">
                                    {formatPaymentMethodLabel(sale.paymentStatus, sale.paymentMethod)}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Aksi Pelunasan & Cetak Surat Jalan */}
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {isUnpaid ? (
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmPaid(sale)}
                                    className="px-2.5 py-1 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                    title="Konfirmasi pembayaran transfer telah diterima"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Tandai Lunas</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-emerald-700 font-semibold px-1.5 py-0.5 bg-emerald-50 rounded">
                                    Kas Terwujud
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => onViewInvoice(sale)}
                                  className="p-1.5 text-stone-500 hover:text-emerald-800 hover:bg-stone-100 rounded-md transition cursor-pointer"
                                  title="Lihat &amp; Cetak Surat Jalan Resmi"
                                >
                                  <FileCheck2 className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setSaleToDelete(sale)}
                                  title={`Hapus Riwayat Pengiriman ${sale.invoiceNumber}`}
                                  className="p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-md transition cursor-pointer"
                                  aria-label={`Hapus ${sale.invoiceNumber}`}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Table Footer info with Receivables vs Paid Revenue */}
        <div className="pt-3 mt-4 border-t border-stone-100 flex flex-wrap items-center justify-between text-xs text-stone-500 gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              Total Omset: <strong className="text-stone-900 font-mono">{formatRupiah(totalAllRevenue)}</strong>
            </span>
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <span className="text-amber-800 font-semibold">
              Piutang Belum Ditransfer: <strong className="font-mono">{formatRupiah(totalReceivables)}</strong>
            </span>
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <span className="text-emerald-800 font-semibold">
              Kas Lunas: <strong className="font-mono">{formatRupiah(totalPaidRevenue)}</strong>
            </span>
          </div>
          <span className={`font-bold font-mono ${totalAllProfit >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
            Total Keuntungan: {formatSignedRupiah(totalAllProfit)}
          </span>
        </div>
      </div>

      {/* =========================================================================
          POP-UP MODAL DIALOG KONFIRMASI HAPUS RIWAYAT PENGIRIMAN
          - Ditampilkan di tengah layar dengan latar belakang transparan gelap
          - max-h-[90vh] dengan struktur flex vertikal (no vertical screen overflow)
          - Header dan Footer sticky (flex-shrink-0), konten scrollable (flex-1 overflow-y-auto)
          - Transaksi hanya benar-benar terhapus saat tombol "Ya, Hapus" diklik
         ========================================================================= */}
      {saleToDelete && (
        <div 
          className="fixed inset-0 z-50 bg-stone-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => {
            const restore = captureScrollState();
            blurActiveTrigger();
            setSaleToDelete(null);
            restore();
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-delete-sale-title"
          >
            {/* Header Modal (Fixed/Sticky: flex-shrink-0) */}
            <div className="flex-shrink-0 px-5 py-4 border-b border-stone-200 bg-red-50/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="modal-delete-sale-title" className="text-sm sm:text-base font-bold text-stone-900">
                    Konfirmasi Hapus Riwayat Pengiriman
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Tindakan ini permanen dan tidak dapat dibatalkan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const restore = captureScrollState();
                  blurActiveTrigger();
                  setSaleToDelete(null);
                  restore();
                }}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition cursor-pointer"
                aria-label="Tutup modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body Modal (Scrollable: flex-1 overflow-y-auto) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-stone-700">
              <p className="text-stone-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus data riwayat pengiriman / surat jalan berikut dari pembukuan?
              </p>

              {/* Rincian Surat Jalan yang akan dihapus */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                  <span className="text-[11px] text-stone-500 font-medium">No. Surat Jalan:</span>
                  <span className="font-mono font-bold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200 text-[11px]">
                    {saleToDelete.invoiceNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-stone-500">Gudang Tujuan:</span>
                  <span className="font-bold text-stone-900">{saleToDelete.buyerWarehouseName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-stone-500">Waktu Pengiriman:</span>
                  <span className="text-stone-700">{formatDateTimeIndo(saleToDelete.date)}</span>
                </div>
                <div className="border-t border-dashed border-stone-200 pt-2 space-y-1">
                  <span className="text-[11px] text-stone-500 font-medium block">Rincian Muatan:</span>
                  {saleToDelete.items && saleToDelete.items.length > 0 ? (
                    saleToDelete.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-700">🍌 {item.bananaType}</span>
                        <span className="font-mono text-stone-900 font-medium">
                          {formatNumber(item.weightKg)} kg
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-700">🍌 {saleToDelete.bananaType}</span>
                      <span className="font-mono text-stone-900 font-medium">
                        {formatNumber(saleToDelete.weightKg)} kg
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-stone-200/80 pt-2">
                  <span className="text-[11px] font-bold text-stone-700">Total Nilai Muatan:</span>
                  <span className="font-mono font-bold text-emerald-900 text-sm">
                    {formatRupiah(saleToDelete.totalRevenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-stone-500">Status Pembayaran:</span>
                  <span className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                    saleToDelete.paymentStatus === 'LUNAS' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {saleToDelete.paymentStatus === 'LUNAS' ? 'LUNAS' : 'BELUM LUNAS (PIUTANG)'}
                  </span>
                </div>
              </div>

              {/* Peringatan Dampak Pemulihan Stok Fisik */}
              <div className="p-3 bg-emerald-50/90 border border-emerald-200/90 rounded-xl text-[11px] text-emerald-950 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="leading-snug space-y-1">
                  <p>
                    <strong>Pemulihan Stok Otomatis:</strong> Seluruh stok keluar sebesar <strong>{formatNumber(saleToDelete.stockOutWeightKg ?? saleToDelete.weightKg)} kg</strong> akan otomatis dikembalikan ke daftar stok siap kirim lapak.
                  </p>
                  <p className="text-stone-500">
                    Nilai omset, kas, piutang, dan laba operasional juga akan disesuaikan kembali secara otomatis.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Modal (Fixed/Sticky: flex-shrink-0) */}
            <div className="flex-shrink-0 px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const restore = captureScrollState();
                  blurActiveTrigger();
                  setSaleToDelete(null);
                  restore();
                }}
                className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 active:bg-stone-200 rounded-lg transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const restore = captureScrollState();
                  const id = saleToDelete.id;
                  blurActiveTrigger();
                  onDeleteSale(id);
                  setSaleToDelete(null);
                  restore();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          RIWAYAT KOREKSI STOK (GABUNGAN BUAH RUSAK / PENYUSUTAN DI LUAR PENJUALAN)
         ========================================================================= */}
      {combinedCorrections.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-6 shadow-xs space-y-4 min-w-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2 text-amber-800 text-xs font-bold tracking-wide mb-0.5">
                <Scale className="w-3.5 h-3.5 shrink-0" />
                <span>Penyesuaian Stok &amp; Buah Rusak di Luar Penjualan</span>
              </div>
              <h3 className="text-base font-bold text-stone-900">
                Riwayat Koreksi Stok
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Catatan pengurangan stok karena buah busuk/dibuang, sortir mutu, atau penyesuaian opname gudang.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <div className="text-xs text-stone-600 font-mono tabular-nums bg-amber-50/70 border border-amber-200 px-3 py-1.5 rounded-lg">
                <span className="font-semibold text-amber-900">{combinedCorrections.length} catatan</span>
                <span aria-hidden="true" className="mx-1.5 text-amber-400">·</span>
                <span className="font-bold text-amber-950">-{formatNumber(totalCorrectionKg)} kg</span>
                <span aria-hidden="true" className="mx-1.5 text-amber-400">·</span>
                <span className="font-bold text-amber-900">-{formatRupiah(totalCorrectionLoss)}</span>
              </div>
              {onGoToFinancialReport && (
                <button
                  type="button"
                  onClick={onGoToFinancialReport}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <span>Rekap Keuangan</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Mobile & Tablet Cards (< lg) */}
          <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3">
            {combinedCorrections.map(({ source, record }) => {
              const canRestore = source === 'shrinkage' ? Boolean(onDeleteShrinkage) : Boolean(onDeleteReject);
              return (
                <div
                  key={`${source}-${record.id}`}
                  className="p-3.5 rounded-xl border border-amber-200/90 bg-amber-50/35 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                        <span className="font-mono font-semibold text-stone-900">
                          {record.referenceNumber}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDateTimeIndo(record.date)}</span>
                      </div>
                      <span className="font-bold text-stone-900 block text-sm truncate mt-0.5">
                        🍌 {record.bananaType}
                      </span>
                      <span className="text-[11px] font-medium text-amber-900 block mt-0.5">
                        {record.reason}
                      </span>
                    </div>
                  </div>

                  {record.notes && (
                    <p className="text-[11px] text-stone-600 italic bg-white/80 px-2.5 py-1.5 rounded-lg border border-stone-200/70">
                      "{record.notes}"
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-amber-200/60 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-500 block">Berat Koreksi</span>
                      <strong className="font-mono text-stone-900 tabular-nums">
                        {formatNumber(record.weightKg)} kg
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">Modal Pokok</span>
                      <strong className="font-mono text-stone-700 tabular-nums">
                        {formatRupiah(record.costPricePerKg)}/kg
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] block font-semibold text-amber-800">
                        Beban Koreksi
                      </span>
                      <strong className="font-mono tabular-nums text-amber-900">
                        -{formatRupiah(record.totalLossAmount)}
                      </strong>
                    </div>
                  </div>

                  {canRestore && (
                    <div className="pt-2 border-t border-amber-200/60 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setCorrectionToDelete({ source, record })}
                        className="px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 rounded-lg transition flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Pulihkan Stok</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop Table (>= lg) */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider bg-stone-50/80">
                  <th className="py-2.5 px-3">Ref &amp; Tanggal</th>
                  <th className="py-2.5 px-3">Varietas &amp; Alasan Koreksi</th>
                  <th className="py-2.5 px-3 text-right">Berat Koreksi (Kg)</th>
                  <th className="py-2.5 px-3 text-right">Modal Pokok / kg</th>
                  <th className="py-2.5 px-3 text-right">Nilai Beban</th>
                  {(onDeleteShrinkage || onDeleteReject) && <th className="py-2.5 px-3 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
                {combinedCorrections.map(({ source, record }) => {
                  const canRestore = source === 'shrinkage' ? Boolean(onDeleteShrinkage) : Boolean(onDeleteReject);
                  return (
                    <tr key={`${source}-${record.id}`} className="hover:bg-amber-50/30 transition">
                      <td className="py-3 px-3">
                        <span className="font-mono font-semibold text-stone-900 block text-[11px]">
                          {record.referenceNumber}
                        </span>
                        <span className="text-[10px] text-stone-400 block">
                          {formatDateTimeIndo(record.date)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-stone-900">🍌 {record.bananaType}</span>
                          <span aria-hidden="true" className="text-stone-300">·</span>
                          <span className="text-[11px] font-medium text-amber-900">
                            {record.reason}
                          </span>
                        </div>
                        {record.notes && (
                          <span className="text-[10px] text-stone-500 italic block mt-0.5">
                            {record.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        <span className="font-bold text-stone-900 block">
                          {formatNumber(record.weightKg)} kg
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-700 whitespace-nowrap">
                        {formatRupiah(record.costPricePerKg)}/kg
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold tabular-nums whitespace-nowrap text-amber-800">
                        -{formatRupiah(record.totalLossAmount)}
                      </td>
                      {(onDeleteShrinkage || onDeleteReject) && (
                        <td className="py-3 px-3 text-center">
                          {canRestore && (
                            <button
                              type="button"
                              onClick={() => setCorrectionToDelete({ source, record })}
                              className="px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 rounded-lg transition inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              title="Hapus catatan koreksi stok & pulihkan stok"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Pulihkan</span>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
            <span>
              Total Koreksi Stok Tercatat: <strong className="font-mono text-amber-800 tabular-nums">-{formatNumber(totalCorrectionKg)} kg</strong>
            </span>
            <span className="font-mono font-bold text-amber-900 tabular-nums">
              Total Beban Koreksi: -{formatRupiah(totalCorrectionLoss)}
            </span>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL CATAT KOREKSI STOK (GABUNGAN BUAH RUSAK / SUSUT DI LUAR PENJUALAN)
         ========================================================================= */}
      {correctionTargetStock && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => {
            const restore = captureScrollState();
            blurActiveTrigger();
            setCorrectionTargetStock(null);
            restore();
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-correction-stock-title"
          >
            {/* Header Modal */}
            <div className="flex-shrink-0 px-5 py-4 border-b border-amber-200 bg-amber-50/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                  <Scale className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 id="modal-correction-stock-title" className="text-sm sm:text-base font-bold text-stone-900 truncate">
                    Koreksi Stok Gudang
                  </h3>
                  <p className="text-[11px] text-amber-900/80 truncate">
                    Catat buah busuk/dibuang atau susut stok di luar penjualan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const restore = captureScrollState();
                  blurActiveTrigger();
                  setCorrectionTargetStock(null);
                  restore();
                }}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition cursor-pointer shrink-0"
                aria-label="Tutup modal koreksi stok"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form & Scrollable Body */}
            <form onSubmit={handleSubmitCorrection} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
                {correctionModalError && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{correctionModalError}</span>
                  </div>
                )}

                {/* Info Varietas & Modal Saat Ini */}
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-stone-400 uppercase font-semibold block">Varietas Dipilih</span>
                    <strong className="text-sm text-stone-900 block truncate">🍌 {correctionTargetStock.bananaType}</strong>
                    <span className="text-[11px] text-stone-600 font-mono">
                      Stok Tersedia: <strong>{formatNumber(correctionTargetStock.stockKg)} kg</strong>
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-stone-400 block">Modal Pokok Rata2</span>
                    <strong className="font-mono text-stone-900 text-xs sm:text-sm tabular-nums">
                      {formatRupiah(
                        correctionTargetStock.avgBuyPricePerKg > 0
                          ? correctionTargetStock.avgBuyPricePerKg
                          : (TYPICAL_BUY_PRICES[correctionTargetStock.bananaType] || 0)
                      )}
                      /kg
                    </strong>
                  </div>
                </div>

                {/* Input Berat Koreksi Stok */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-stone-700">
                      Berat Koreksi Stok (kg) <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSetCorrectionAllStock}
                      className="text-[10px] font-bold text-amber-800 hover:underline cursor-pointer"
                    >
                      Koreksi Semua
                    </button>
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    max={correctionTargetStock.stockKg}
                    required
                    value={correctionWeightKg}
                    onChange={(e) => {
                      setCorrectionWeightKg(e.target.value);
                      setCorrectionModalError('');
                    }}
                    placeholder="Contoh: 15"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-stone-400 block mt-0.5">
                    Maksimal: {formatNumber(correctionTargetStock.stockKg)} kg
                  </span>
                </div>

                {/* Alasan Koreksi Stok */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Alasan Koreksi Stok <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {STOCK_CORRECTION_REASONS.map(reason => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Catatan Opsional */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Catatan Tambahan (Opsional)
                  </label>
                  <input
                    type="text"
                    autoCapitalize="sentences"
                    value={correctionNotes}
                    onChange={(e) => handleCapitalizedInputChange(e, capitalizeFirstLetter, setCorrectionNotes)}
                    placeholder="Contoh: Pisang busuk di gudang belum sempat terjual"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Live Impact Preview */}
                {(() => {
                  const previewKg = parseWeightInput(correctionWeightKg);
                  const costBasis = correctionTargetStock.avgBuyPricePerKg > 0
                    ? Math.round(correctionTargetStock.avgBuyPricePerKg)
                    : (TYPICAL_BUY_PRICES[correctionTargetStock.bananaType] || 0);
                  const previewLoss = Math.round(previewKg * costBasis);
                  const remainingKg = Math.round(Math.max(0, correctionTargetStock.stockKg - previewKg) * 100) / 100;

                  return (
                    <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                        Simulasi Dampak Koreksi Stok
                      </span>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-stone-600">Sisa Stok Siap Kirim:</span>
                        <strong className="font-mono text-stone-900 tabular-nums">
                          {formatNumber(remainingKg)} kg
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-stone-600">Modal Rata-rata (Tetap):</span>
                        <strong className="font-mono text-stone-700 tabular-nums">
                          {formatRupiah(costBasis)}/kg
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-amber-200/80">
                        <span className="font-semibold text-amber-950">Nilai Beban Koreksi Stok:</span>
                        <strong className="font-mono font-extrabold text-amber-900 text-sm tabular-nums">
                          -{formatRupiah(previewLoss)}
                        </strong>
                      </div>
                      <p className="text-[10px] text-amber-900/80 leading-snug pt-0.5">
                        Untuk selisih timbang saat penjualan (termasuk pisang reject yang langsung dibuang saat jual), cukup isi langsung di keranjang penjualan.
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Sticky Footer */}
              <div className="flex-shrink-0 px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const restore = captureScrollState();
                    blurActiveTrigger();
                    setCorrectionTargetStock(null);
                    restore();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Simpan Koreksi Stok</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL KONFIRMASI PULIHKAN STOK DARI RIWAYAT KOREKSI STOK
         ========================================================================= */}
      {correctionToDelete && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => {
            const restore = captureScrollState();
            blurActiveTrigger();
            setCorrectionToDelete(null);
            restore();
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-restore-correction-title"
          >
            <div className="flex-shrink-0 px-5 py-4 border-b border-stone-200 bg-emerald-50/70 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="modal-restore-correction-title" className="text-sm sm:text-base font-bold text-stone-900">
                    Pulihkan Catatan Koreksi Stok?
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Stok dikembalikan ke siap kirim &amp; beban koreksi dibatalkan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const restore = captureScrollState();
                  blurActiveTrigger();
                  setCorrectionToDelete(null);
                  restore();
                }}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3 text-xs text-stone-700">
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-stone-500">No. Referensi:</span>
                  <strong className="font-mono">{correctionToDelete.record.referenceNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Varietas:</span>
                  <strong>🍌 {correctionToDelete.record.bananaType}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Berat Koreksi:</span>
                  <strong className="font-mono">
                    {formatNumber(correctionToDelete.record.weightKg)} kg
                  </strong>
                </div>
                <div className="flex justify-between border-t border-stone-200 pt-1.5">
                  <span className="text-stone-500">Nilai Beban:</span>
                  <strong className="font-mono text-amber-800">
                    -{formatRupiah(correctionToDelete.record.totalLossAmount)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const restore = captureScrollState();
                  blurActiveTrigger();
                  setCorrectionToDelete(null);
                  restore();
                }}
                className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const restore = captureScrollState();
                  const { source, record } = correctionToDelete;
                  blurActiveTrigger();
                  if (source === 'shrinkage' && onDeleteShrinkage) {
                    onDeleteShrinkage(record.id);
                  } else if (source === 'reject' && onDeleteReject) {
                    onDeleteReject(record.id);
                  }
                  setCorrectionToDelete(null);
                  restore();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ya, Pulihkan Stok</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
