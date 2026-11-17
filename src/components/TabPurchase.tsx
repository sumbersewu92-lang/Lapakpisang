import React, { useState, useRef } from 'react';
import { 
  PlusCircle, 
  Search, 
  Trash2, 
  FileText, 
  User, 
  Scale, 
  Coins, 
  AlertCircle,
  AlertTriangle,
  X,
  Plus
} from 'lucide-react';
import { FarmerPurchase, PurchaseItem } from '../types/banana';
import { 
  formatRupiah, 
  formatNumber, 
  formatDateTimeIndo,
  normalizeVarietyName,
  isSameVariety
} from '../data/initialData';
import { captureScrollState, blurActiveTrigger } from '../utils/scrollPreservation';
import {
  capitalizeEachWord,
  capitalizeFirstLetter,
  handleCapitalizedInputChange
} from '../utils/textFormat';

interface TabPurchaseProps {
  purchases: FarmerPurchase[];
  onAddPurchase: (purchase: Omit<FarmerPurchase, 'id' | 'receiptNumber'>) => FarmerPurchase | void;
  onDeletePurchase: (id: string) => void;
  onViewReceipt: (purchase: FarmerPurchase) => void;
}

interface FormPurchaseItemRow {
  id: string;
  bananaType: string;
  customBananaType: string;
  isCustomType: boolean;
  weightKg: string;
  buyPricePerKg: string;
}

const createEmptyItemRow = (defaultType = 'Pisang Rames'): FormPurchaseItemRow => ({
  id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  bananaType: defaultType,
  customBananaType: '',
  isCustomType: false,
  weightKg: '',
  buyPricePerKg: ''
});

export const TabPurchase: React.FC<TabPurchaseProps> = ({
  purchases,
  onAddPurchase,
  onDeletePurchase,
  onViewReceipt
}) => {
  // Form State: 1 Farmer Header + Dynamic Item Rows (Opsi A)
  const [farmerName, setFarmerName] = useState('');
  const [notes, setNotes] = useState('');
  const [itemRows, setItemRows] = useState<FormPurchaseItemRow[]>([createEmptyItemRow()]);
  const [formError, setFormError] = useState('');

  // Table Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  
  // State Pop-up Modal Konfirmasi Hapus Transaksi
  const [purchaseToDelete, setPurchaseToDelete] = useState<FarmerPurchase | null>(null);
  const pendingFocusRowIdRef = useRef<string | null>(null);

  // Row Management Handlers
  const handleAddItemRow = () => {
    if (itemRows.length >= 20) {
      setFormError('Maksimal 20 jenis pisang per nota pembelian.');
      return;
    }
    const restore = captureScrollState();
    // Default next variety to alternative main variety if available
    const currentTypes = itemRows.map((r) =>
      normalizeVarietyName(r.isCustomType ? r.customBananaType : r.bananaType)
    );
    let nextDefault = 'Pisang Lumut (Biasa)';
    if (!currentTypes.some((t) => isSameVariety(t, 'Pisang Lumut (Biasa)'))) {
      nextDefault = 'Pisang Lumut (Biasa)';
    } else if (!currentTypes.some((t) => isSameVariety(t, 'Pisang Lumut (Bungkus)'))) {
      nextDefault = 'Pisang Lumut (Bungkus)';
    } else if (!currentTypes.some((t) => isSameVariety(t, 'Pisang Rames'))) {
      nextDefault = 'Pisang Rames';
    } else {
      nextDefault = 'Pisang Lumut (Biasa)';
    }
    setItemRows((prev) => [...prev, createEmptyItemRow(nextDefault)]);
    restore();
  };

  const handleRemoveItemRow = (rowId: string) => {
    if (itemRows.length <= 1) return;
    const restore = captureScrollState();
    setItemRows(prev => prev.filter(r => r.id !== rowId));
    restore();
  };

  const handleUpdateRow = (rowId: string, updates: Partial<FormPurchaseItemRow>) => {
    setItemRows(prev => prev.map(r => r.id === rowId ? { ...r, ...updates } : r));
  };

  const handleRowBananaTypeChange = (rowId: string, selected: string) => {
    if (selected === '__CUSTOM__') {
      pendingFocusRowIdRef.current = rowId;
      handleUpdateRow(rowId, { isCustomType: true, customBananaType: '' });
    } else {
      if (pendingFocusRowIdRef.current === rowId) {
        pendingFocusRowIdRef.current = null;
      }
      handleUpdateRow(rowId, { isCustomType: false, bananaType: selected });
    }
  };

  const handleRowPriceChange = (rowId: string, rawVal: string) => {
    const digits = rawVal.replace(/\D/g, '');
    if (!digits) {
      handleUpdateRow(rowId, { buyPricePerKg: '' });
    } else {
      const num = parseInt(digits, 10);
      handleUpdateRow(rowId, { buyPricePerKg: String(num) });
    }
  };

  // Calculations across all item rows
  const calculatedItems = itemRows.map(row => {
    const normalizedWeight = row.weightKg.trim().replace(',', '.');
    const parsedW = parseFloat(normalizedWeight);
    const w = Number.isFinite(parsedW) && parsedW > 0 ? Math.round(parsedW * 100) / 100 : 0;
    const p = parseFloat(row.buyPricePerKg) || 0;
    const subtotal = Math.round(w * p);
    return {
      ...row,
      numWeight: w,
      numPrice: p,
      subtotal
    };
  });

  const totalWeightKg = Math.round(calculatedItems.reduce((acc, it) => acc + it.numWeight, 0) * 100) / 100;
  const totalPayment = calculatedItems.reduce((acc, it) => acc + it.subtotal, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!farmerName.trim()) {
      setFormError('Nama petani wajib diisi.');
      return;
    }

    if (itemRows.length === 0) {
      setFormError('Minimal harus ada 1 jenis pisang yang ditimbang.');
      return;
    }

    // Validate each row
    const validatedItems: PurchaseItem[] = [];
    for (let i = 0; i < calculatedItems.length; i++) {
      const row = calculatedItems[i];
      const rawType = row.isCustomType ? row.customBananaType : row.bananaType;
      const activeType = normalizeVarietyName(rawType);

      if (!activeType) {
        setFormError(`Jenis pisang ke-${i + 1} belum dipilih atau diketik.`);
        return;
      }
      if (row.numWeight < 0.01) {
        setFormError(`Baris ke-${i + 1} (${activeType}): Total berat (kg) minimal 0,01 kg.`);
        return;
      }
      if (row.numPrice <= 0) {
        setFormError(`Baris ke-${i + 1} (${activeType}): Harga beli per kg harus lebih dari Rp. 0.`);
        return;
      }

      validatedItems.push({
        bananaType: activeType,
        bunches: 0,
        weightKg: row.numWeight,
        buyPricePerKg: row.numPrice,
        subtotalPayment: row.subtotal
      });
    }

    // Determine summary variety name
    const summaryType = validatedItems.length === 1
      ? validatedItems[0].bananaType
      : `${validatedItems[0].bananaType} (+${validatedItems.length - 1} jenis lain)`;

    const avgBuyPrice = totalWeightKg > 0 ? Math.round(totalPayment / totalWeightKg) : 0;

    const restore = captureScrollState();
    onAddPurchase({
      farmerName: farmerName.trim(),
      bananaType: summaryType,
      items: validatedItems,
      bunches: 0,
      weightKg: totalWeightKg,
      buyPricePerKg: avgBuyPrice,
      totalPayment: totalPayment,
      date: new Date().toISOString(),
      notes: notes.trim() || undefined
    });

    // Reset form
    setFarmerName('');
    setNotes('');
    setItemRows([createEmptyItemRow()]);
    restore();
  };

  // Kategori pisang utama untuk logika penyaringan
  const MAIN_BANANA_CATEGORIES = ['Pisang Rames', 'Pisang Lumut (Biasa)', 'Pisang Lumut (Bungkus)'];

  // Filtered purchases sesuai pencarian dan 5 opsi jenis pisang (mendukung nota multi-item)
  const filteredPurchases = purchases.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (p.farmerName || '').toLowerCase().includes(q) ||
      (p.bananaType || '').toLowerCase().includes(q) ||
      (p.receiptNumber || '').toLowerCase().includes(q) ||
      (p.items && p.items.some(it => (it.bananaType || '').toLowerCase().includes(q)));

    let matchesType = true;
    if (filterType === 'ALL') {
      matchesType = true;
    } else if (filterType === 'OTHER') {
      if (p.items && p.items.length > 0) {
        matchesType = p.items.some(it => !MAIN_BANANA_CATEGORIES.some(cat => isSameVariety(cat, it.bananaType)));
      } else {
        matchesType = !MAIN_BANANA_CATEGORIES.some(cat => isSameVariety(cat, p.bananaType));
      }
    } else {
      if (p.items && p.items.length > 0) {
        matchesType = p.items.some(it => isSameVariety(it.bananaType, filterType));
      } else {
        matchesType = isSameVariety(p.bananaType, filterType);
      }
    }

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Main Grid: Form on Left/Top + History Table on Right/Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Form Container (5 Cols on Desktop) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-stone-200 p-4 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-[10px] mb-3 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-800" />
                Form Timbangan Masuk
              </h3>
              <span className="text-xs text-stone-500 font-medium">
                {itemRows.length > 1 ? `${itemRows.length} Jenis Pisang` : 'Nota Baru'}
              </span>
            </div>

            {formError && (
              <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-2">
              {/* 1. Nama Petani */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-[3px]">
                  Nama Petani <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoCapitalize="words"
                    value={farmerName}
                    onChange={(e) => handleCapitalizedInputChange(e, capitalizeEachWord, setFarmerName)}
                    placeholder="Nama Petani"
                    className="w-full h-[32px] pl-9 pr-3 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>

              {/* 2. Daftar Komoditas / Jenis Pisang (Dinamis: Bisa 1 atau lebih jenis pisang per nota) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-stone-700">
                    Daftar Timbangan Pisang <span className="text-red-500">*</span>
                  </label>
                  {itemRows.length > 1 && (
                    <span className="text-[11px] text-stone-500 font-medium">
                      {itemRows.length} jenis dalam 1 nota
                    </span>
                  )}
                </div>

                {calculatedItems.map((row, index) => {
                  const formattedBuyPrice = row.buyPricePerKg
                    ? `Rp. ${Number(row.buyPricePerKg).toLocaleString('id-ID')}`
                    : '';

                  return (
                    <div 
                      key={row.id}
                      className="bg-stone-50/90 rounded-xl p-3 border border-stone-200 space-y-2 relative transition-all"
                    >
                      {/* Baris Header Item: Penanda Urutan & Tombol Hapus jika > 1 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <span className="text-xs font-bold text-stone-800">
                            {row.isCustomType ? (row.customBananaType || 'Jenis Pisang Lainnya') : row.bananaType}
                          </span>
                        </div>

                        {itemRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(row.id)}
                            className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition cursor-pointer"
                            title="Hapus baris pisang ini"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-stone-400 hover:text-red-600" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown Jenis Pisang */}
                      <div>
                        <div className="space-y-[5px]">
                          <select
                            value={row.isCustomType ? '__CUSTOM__' : row.bananaType}
                            onChange={(e) => handleRowBananaTypeChange(row.id, e.target.value)}
                            className="w-full h-[32px] px-3 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 cursor-pointer"
                          >
                            <option value="Pisang Rames">Pisang Rames</option>
                            <option value="Pisang Lumut (Biasa)">Pisang Lumut (Biasa)</option>
                            <option value="Pisang Lumut (Bungkus)">Pisang Lumut (Bungkus)</option>
                            <option value="__CUSTOM__">Ketik Jenis Pisang Lainnya</option>
                          </select>

                          {/* Input teks jika opsi Ketik Jenis Pisang Lainnya dipilih */}
                          {row.isCustomType && (
                            <div className="flex items-center gap-2 animate-in fade-in duration-150">
                              <input
                                type="text"
                                autoCapitalize="words"
                                ref={(el) => {
                                  if (el && pendingFocusRowIdRef.current === row.id) {
                                    pendingFocusRowIdRef.current = null;
                                    el.focus({ preventScroll: true });
                                  }
                                }}
                                required
                                value={row.customBananaType}
                                onChange={(e) =>
                                  handleCapitalizedInputChange(e, capitalizeEachWord, (val) =>
                                    handleUpdateRow(row.id, { customBananaType: val })
                                  )
                                }
                                placeholder="Ketik jenis pisang manual..."
                                className="flex-1 h-[32px] px-3 text-sm bg-white border border-emerald-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateRow(row.id, { isCustomType: false, bananaType: 'Pisang Rames', customBananaType: '' })}
                                className="h-[32px] px-2.5 text-xs bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-lg border border-stone-200 transition cursor-pointer shrink-0"
                                title="Batal dan kembali ke pilihan standar"
                              >
                                Batal
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Total Berat & Harga Beli Petani (Grid 2 Kolom Sejajar) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                        <div>
                          <label className="block text-[11px] font-semibold text-stone-600 mb-[3px]">
                            Total Berat (kg) <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-stone-400">
                              <Scale className="w-3.5 h-3.5" />
                            </div>
                            <input
                              type="number"
                              step="any"
                              min="0.01"
                              required
                              value={row.weightKg}
                              onChange={(e) => handleUpdateRow(row.id, { weightKg: e.target.value })}
                              placeholder="0"
                              className="w-full h-[32px] pl-8 pr-2.5 text-sm bg-white border border-stone-200 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-700"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-stone-600 mb-[3px]">
                            Harga Beli Petani (per kg) <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-stone-400">
                              <Coins className="w-3.5 h-3.5" />
                            </div>
                            <input
                              type="text"
                              inputMode="numeric"
                              required
                              value={formattedBuyPrice}
                              onChange={(e) => handleRowPriceChange(row.id, e.target.value)}
                              placeholder="Rp. 0"
                              className="w-full h-[32px] pl-8 pr-2.5 text-sm bg-white border border-stone-200 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-700"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Subtotal Item Baris Ini */}
                      <div className="pt-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-stone-500 border-t border-stone-200/70">
                        <span className="font-mono text-stone-400">
                          Hitung berdasarkan berat (kg)
                        </span>
                        <span className="font-mono font-semibold text-emerald-900">
                          Subtotal: {formatRupiah(row.subtotal)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Tombol Tambah Jenis Pisang (+ Opsi A) */}
                {itemRows.length < 20 && (
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="w-full h-[32px] px-3 border border-dashed border-emerald-400 text-emerald-800 hover:bg-emerald-50 active:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tambah Jenis Pisang Lainnya</span>
                  </button>
                )}
              </div>

              {/* Catatan Tambahan (Opsional) */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-[3px]">
                  Keterangan / Kondisi Buah (Opsional)
                </label>
                <input
                  type="text"
                  autoCapitalize="sentences"
                  value={notes}
                  onChange={(e) => handleCapitalizedInputChange(e, capitalizeFirstLetter, setNotes)}
                  placeholder="Contoh: Buah tua padat, grade A, bebas cacat getah"
                  className="w-full h-[32px] px-3 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              {/* Dynamic Live Kalkulator Box Akumulasi Nota */}
              <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-emerald-900">
                  <span className="font-medium">
                    Total Muatan ({calculatedItems.length} jenis):
                  </span>
                  <span className="font-mono text-[11px] text-emerald-800 font-semibold">
                    {formatNumber(totalWeightKg)} kg
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-1 pt-1 border-t border-emerald-200">
                  <span className="text-xs font-bold text-emerald-950">
                    Total Bayar ke Petani:
                  </span>
                  <span className="text-lg sm:text-xl font-extrabold text-emerald-900 font-mono tabular-nums">
                    {formatRupiah(totalPayment)}
                  </span>
                </div>
              </div>

              {/* Tombol Simpan Transaksi */}
              <button
                type="submit"
                className="w-full min-h-[38px] py-2 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>Simpan dan Tambah Stok</span>
              </button>
            </form>
          </div>
        </div>

        {/* Purchase History Ledger Table (7 Cols on Desktop) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-stone-200 p-4 sm:p-6 shadow-xs flex flex-col justify-between min-w-0">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-[10px] border-b border-stone-100 gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-800 shrink-0" />
                  <span>Riwayat Pembelian dari Petani</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Total {filteredPurchases.length} penerimaan timbangan tercatat
                </p>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-48">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-stone-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    autoCapitalize="sentences"
                    value={searchQuery}
                    onChange={(e) => handleCapitalizedInputChange(e, capitalizeFirstLetter, setSearchQuery)}
                    placeholder="Cari nota, petani, varietas..."
                    className="w-full h-[34px] pl-8 pr-8 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full sm:w-auto h-[34px] px-2.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 cursor-pointer font-medium text-stone-700"
                >
                  <option value="ALL">Semua Jenis</option>
                  <option value="Pisang Rames">Pisang Rames</option>
                  <option value="Pisang Lumut (Biasa)">Pisang Lumut (Biasa)</option>
                  <option value="Pisang Lumut (Bungkus)">Pisang Lumut (Bungkus)</option>
                  <option value="OTHER">Lainnya</option>
                </select>
              </div>
            </div>

            {/* Table / Mobile Cards Area */}
            <div className="mt-3">
              {filteredPurchases.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
                    <Scale className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-stone-700">Tidak ada riwayat pembelian ditemukan</p>
                  <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                    {searchQuery ? 'Coba ubah kata kunci pencarian Anda.' : 'Gunakan formulir di samping untuk mencatat timbangan pembelian pertama dari petani.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile Card List (< md) */}
                  <div className="md:hidden space-y-2">
                    {filteredPurchases.map((item) => (
                      <div key={item.id} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-mono font-semibold text-emerald-900 block text-[11px]">
                              {item.receiptNumber}
                            </span>
                            <span className="font-bold text-stone-900 block text-sm truncate">
                              {item.farmerName}
                            </span>
                            <span className="text-[10px] text-stone-400 block">
                              {formatDateTimeIndo(item.date)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => onViewReceipt(item)}
                              title="Lihat Nota Timbangan"
                              className="p-1.5 text-stone-600 hover:text-emerald-800 bg-white border border-stone-200 rounded-lg transition cursor-pointer"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPurchaseToDelete(item)}
                              title={`Hapus Transaksi ${item.receiptNumber}`}
                              className="p-1.5 text-red-500 hover:text-red-700 bg-white border border-stone-200 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {item.items && item.items.length > 1 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.items.map((it, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 font-medium"
                              >
                                🍌 {it.bananaType}: {formatNumber(it.weightKg)} kg
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-block text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded font-medium">
                            🍌 {item.bananaType}
                          </span>
                        )}

                        {item.notes && (
                          <p className="text-[11px] text-stone-500 italic break-words">
                            {item.notes}
                          </p>
                        )}

                        <div className="pt-2 border-t border-stone-200/70 flex items-center justify-between gap-2 text-xs">
                          <div className="font-mono tabular-nums text-stone-700">
                            <strong className="text-stone-900">{formatNumber(item.weightKg)} kg</strong>
                          </div>
                          <div className="text-right font-mono tabular-nums">
                            <strong className="text-emerald-900 block">{formatRupiah(item.totalPayment)}</strong>
                            <span className="text-[10px] text-stone-400">
                              {item.items && item.items.length > 1 ? `x\u0304 @${formatRupiah(item.buyPricePerKg)}/kg` : `@${formatRupiah(item.buyPricePerKg)}/kg`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop & Tablet Table (>= md), Vertical Scroll Only on Desktop (>= lg) */}
                  <div className="hidden md:block overflow-x-auto lg:overflow-x-hidden lg:max-h-[438px] lg:overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="lg:sticky lg:top-0 lg:z-10 bg-stone-50">
                        <tr className="border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider bg-stone-50 shadow-[inset_0_-1px_0_0_#e7e5e4]">
                          <th className="py-2.5 px-2 w-[124px] min-w-[120px] whitespace-nowrap">Nota &amp; Waktu</th>
                          <th className="py-2.5 px-2 md:min-w-[210px] lg:min-w-0">Petani &amp; Varietas</th>
                          <th className="py-2.5 px-2 w-[1%] text-left whitespace-nowrap">Total Berat</th>
                          <th className="py-2.5 px-2 w-[1%] text-left whitespace-nowrap">Harga / Total</th>
                          <th className="py-2.5 px-1.5 w-[1%] text-center whitespace-nowrap">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
                        {filteredPurchases.map((item) => (
                          <tr key={item.id} className="hover:bg-stone-50/70 transition">
                            <td className="py-3 px-2 w-[124px] min-w-[120px] align-top">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-mono font-semibold text-emerald-900 text-[11px] leading-tight whitespace-nowrap">
                                  {item.receiptNumber}
                                </span>
                                <span className="text-[10px] text-stone-400 leading-tight whitespace-nowrap">
                                  {formatDateTimeIndo(item.date)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-2 align-top min-w-0">
                              <span className="font-semibold text-stone-900 block break-words">
                                {item.farmerName}
                              </span>
                              
                              {/* Display Multi-item Badges if available */}
                              {item.items && item.items.length > 1 ? (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {item.items.map((it, idx) => (
                                    <span 
                                      key={idx} 
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 font-medium break-words max-w-full"
                                    >
                                      🍌 {it.bananaType}: {formatNumber(it.weightKg)} kg
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[11px] text-emerald-800 font-medium break-words block">
                                  {item.bananaType}
                                </span>
                              )}

                              {item.notes && (
                                <span className="text-[10px] text-stone-400 italic block mt-0.5 break-words">
                                  {item.notes}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-left align-top whitespace-nowrap">
                              <span className="font-mono font-bold text-stone-900 block tabular-nums">
                                {formatNumber(item.weightKg)} kg
                              </span>
                            </td>
                            <td className="py-3 px-2 text-left align-top whitespace-nowrap">
                              <span className="font-mono font-bold text-emerald-900 block tabular-nums">
                                {formatRupiah(item.totalPayment)}
                              </span>
                              <span className="text-[10px] text-stone-400 block font-mono tabular-nums">
                                {item.items && item.items.length > 1
                                  ? `x\u0304 @${formatRupiah(item.buyPricePerKg)}/kg`
                                  : `@${formatRupiah(item.buyPricePerKg)}/kg`
                                }
                              </span>
                            </td>
                            <td className="py-3 px-1.5 text-center align-top whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onViewReceipt(item)}
                                  title="Lihat Nota Timbangan"
                                  className="p-1.5 text-stone-500 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition cursor-pointer"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPurchaseToDelete(item)}
                                  title={`Hapus Transaksi ${item.receiptNumber}`}
                                  className="p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-md transition cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Table Footer info */}
          <div className="pt-2.5 mt-3 border-t border-stone-100 flex flex-wrap items-center justify-between text-xs text-stone-500 gap-2">
            <span>
              Menampilkan {filteredPurchases.length} dari {purchases.length} transaksi
            </span>
            <span className="text-emerald-800 font-medium">
              Nota timbangan dapat dicetak untuk arsip petani &amp; kasir
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          POP-UP MODAL DIALOG KONFIRMASI HAPUS TRANSAKSI
          - Ditampilkan di tengah layar dengan latar belakang transparan gelap
          - max-h-[90vh] dengan struktur flex vertikal (no vertical screen overflow)
          - Header dan Footer sticky (flex-shrink-0), konten scrollable (flex-1 overflow-y-auto)
          - Transaksi hanya benar-benar terhapus saat tombol "Ya, Hapus" diklik
         ========================================================================= */}
      {purchaseToDelete && (
        <div 
          className="fixed inset-0 z-50 bg-stone-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => {
            const restore = captureScrollState();
            blurActiveTrigger();
            setPurchaseToDelete(null);
            restore();
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-delete-title"
          >
            {/* Header Modal (Fixed/Sticky: flex-shrink-0) */}
            <div className="flex-shrink-0 px-5 py-4 border-b border-stone-200 bg-red-50/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="modal-delete-title" className="text-sm sm:text-base font-bold text-stone-900">
                    Konfirmasi Hapus Transaksi
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
                  setPurchaseToDelete(null);
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
                Apakah Anda yakin ingin menghapus catatan transaksi pembelian dari petani berikut dari arsip pembukuan?
              </p>

              {/* Rincian Transaksi yang akan dihapus */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                  <span className="text-[11px] text-stone-500 font-medium">Nomor Nota:</span>
                  <span className="font-mono font-bold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200 text-[11px]">
                    {purchaseToDelete.receiptNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-stone-500">Nama Petani:</span>
                  <span className="font-bold text-stone-900">{purchaseToDelete.farmerName}</span>
                </div>
                
                {purchaseToDelete.items && purchaseToDelete.items.length > 1 ? (
                  <div className="space-y-1 py-1">
                    <span className="text-[11px] text-stone-500 block">Rincian Varietas ({purchaseToDelete.items.length} jenis):</span>
                    {purchaseToDelete.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px] pl-2 border-l-2 border-emerald-600">
                        <span className="font-semibold text-emerald-900">🍌 {it.bananaType}</span>
                        <span className="font-mono text-stone-700">
                          {formatNumber(it.weightKg)} kg · {formatRupiah(it.subtotalPayment)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-stone-500">Varietas Pisang:</span>
                    <span className="font-semibold text-emerald-900">🍌 {purchaseToDelete.bananaType}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-stone-500">Total Berat:</span>
                  <span className="font-mono font-medium text-stone-800">
                    {formatNumber(purchaseToDelete.weightKg)} kg
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-stone-200/80 pt-2">
                  <span className="text-[11px] font-bold text-stone-700">Total Pembayaran:</span>
                  <span className="font-mono font-bold text-emerald-900 text-sm">
                    {formatRupiah(purchaseToDelete.totalPayment)}
                  </span>
                </div>
              </div>

              {/* Peringatan Dampak Pengurangan Stok Fisik */}
              <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl text-[11px] text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="leading-snug">
                  <strong>Penyesuaian Stok Otomatis:</strong> Stok pisang siap kirim pada gudang lapak akan otomatis berkurang sebanyak <strong>{formatNumber(purchaseToDelete.weightKg)} kg</strong> agar data stok fisik dan nilai modal tetap sinkron.
                </p>
              </div>
            </div>

            {/* Footer Modal (Fixed/Sticky: flex-shrink-0) */}
            <div className="flex-shrink-0 px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const restore = captureScrollState();
                  blurActiveTrigger();
                  setPurchaseToDelete(null);
                  restore();
                }}
                className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 active:bg-stone-200 rounded-lg transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (purchaseToDelete) {
                    const restore = captureScrollState();
                    const deletedId = purchaseToDelete.id;
                    blurActiveTrigger();
                    onDeletePurchase(deletedId);
                    setPurchaseToDelete(null);
                    restore();
                  }
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
    </div>
  );
};
