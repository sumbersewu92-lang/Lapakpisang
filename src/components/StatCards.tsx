import React from 'react';
import { Scale, Wallet, TrendingUp, Sparkles, Clock3, CheckCircle2 } from 'lucide-react';
import { formatRupiah, formatSignedRupiah, formatNumber } from '../data/initialData';

interface StatCardsProps {
  activeTab: 'purchases' | 'stock-and-sales' | 'financial-report';
  totalStockKg: number;
  totalStockBunches?: number;
  totalCapitalSpent: number;
  totalRealizedRevenue: number;
  totalRealizedProfit: number;
  totalRejectLoss?: number;
  totalShrinkageLoss?: number;
  projectedProfitFromStock: number;
  potentialStockGrossValue: number;
  totalReceivables: number; // Total Piutang Belum Ditransfer
  unpaidCount: number; // Jumlah Transaksi Belum Lunas
  totalPaidRevenue: number; // Kas Masuk Penjualan Lunas
}

export const StatCards: React.FC<StatCardsProps> = ({
  activeTab,
  totalStockKg,
  totalCapitalSpent,
  totalRealizedRevenue,
  totalRealizedProfit,
  totalRejectLoss = 0,
  totalShrinkageLoss = 0,
  projectedProfitFromStock,
  potentialStockGrossValue,
  totalReceivables,
  unpaidCount,
  totalPaidRevenue
}) => {
  const totalOperationalLoss = totalRejectLoss + totalShrinkageLoss;
  const netProfitAfterAdjustments = totalRealizedProfit - totalOperationalLoss;
  // If active tab is 'purchases', do not render any metric cards
  if (activeTab === 'purchases') {
    return null;
  }

  // Both 'stock-and-sales' and 'financial-report' render an adaptive ultra-compact 4-column symmetric grid
  return (
    <div 
      key={activeTab} 
      className={
        activeTab === 'stock-and-sales'
          ? "grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 transition-all duration-300 animate-in fade-in zoom-in-95"
          : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 transition-all duration-300 animate-in fade-in zoom-in-95"
      }
    >
      {/* =========================================================================
          TAB: STOK & PENJUALAN
          (3 Compact Cards: Total Stok Siap Kirim, Total Piutang Gudang, Penjualan Gudang Pusat)
         ========================================================================= */}
      {activeTab === 'stock-and-sales' && (
        <>
          {/* Card 1: Total Stok Lapak / Siap Kirim */}
          <div className="bg-white rounded-xl border border-stone-200 py-2.5 px-3 sm:px-3.5 shadow-2xs flex flex-col justify-between hover:border-emerald-300 transition-colors">
            <div>
              <div className="flex items-center justify-between text-stone-500 mb-0.5">
                <span className="text-[11px] font-semibold text-stone-600 truncate">Total Stok Siap Kirim</span>
                <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                  <Scale className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-1 my-0.5">
                <span className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight font-mono tabular-nums leading-none">
                  {formatNumber(totalStockKg)}
                </span>
                <span className="text-[11px] font-bold text-emerald-800 leading-none">kg</span>
              </div>
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-stone-100 flex items-center justify-between text-[10.5px] text-stone-500">
              <span>Satuan Inventori</span>
              <span className="font-semibold text-emerald-800">
                Kilogram (kg)
              </span>
            </div>
          </div>

          {/* Card 2: Total Piutang Gudang (Menunggu Transfer) */}
          <div className="bg-amber-50/90 rounded-xl border border-amber-300/90 py-2.5 px-3 sm:px-3.5 shadow-2xs flex flex-col justify-between hover:border-amber-400 transition-colors">
            <div>
              <div className="flex items-center justify-between text-amber-800 mb-0.5">
                <span className="text-[11px] font-bold text-amber-900 truncate">Total Piutang Gudang</span>
                <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                  <Clock3 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline my-0.5">
                <span className="text-lg sm:text-xl font-extrabold text-amber-950 tracking-tight font-mono tabular-nums leading-none">
                  {formatRupiah(totalReceivables)}
                </span>
              </div>
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-amber-200/80 flex items-center justify-between text-[10.5px] text-amber-900">
              <span>Menunggu Transfer</span>
              <span className="font-bold font-mono tabular-nums bg-amber-200/90 px-1.5 py-0.2 rounded text-[10px]">
                {unpaidCount} faktur
              </span>
            </div>
          </div>

          {/* Card 3: Total Penjualan Gudang Pusat */}
          <div className="bg-white rounded-xl border border-stone-200 py-2.5 px-3 sm:px-3.5 shadow-2xs flex flex-col justify-between hover:border-blue-300 transition-colors">
            <div>
              <div className="flex items-center justify-between text-stone-500 mb-0.5">
                <span className="text-[11px] font-semibold text-stone-600 truncate">Penjualan Gudang Pusat</span>
                <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline my-0.5">
                <span className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight font-mono tabular-nums leading-none">
                  {formatRupiah(totalRealizedRevenue)}
                </span>
              </div>
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-stone-100 flex items-center justify-between text-[10.5px] text-stone-500">
              <span>Kas Masuk Lunas</span>
              <span className="font-semibold text-emerald-700 font-mono tabular-nums">
                {formatRupiah(totalPaidRevenue)}
              </span>
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          TAB: LAPORAN KEUANGAN
          (4 Compact Cards: Total Modal Keluar, Total Penjualan, Total Piutang Gudang, Laba Bersih Terwujud)
         ========================================================================= */}
      {activeTab === 'financial-report' && (
        <>
          {/* Card 1: Total Modal Keluar */}
          <div className="bg-white rounded-xl border border-stone-200 py-2.5 px-3 sm:px-3.5 shadow-2xs flex flex-col justify-between hover:border-stone-300 transition-colors">
            <div>
              <div className="flex items-center justify-between text-stone-500 mb-0.5">
                <span className="text-[11px] font-semibold text-stone-600 truncate">Total Modal Keluar</span>
                <div className="w-6 h-6 rounded-md bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
                  <Wallet className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline my-0.5">
                <span className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight font-mono tabular-nums leading-none">
                  {formatRupiah(totalCapitalSpent)}
                </span>
              </div>
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-stone-100 flex items-center justify-between text-[10.5px] text-stone-500">
              <span>Uang Beli Petani</span>
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Tunai Lunas</span>
              </span>
            </div>
          </div>

          {/* Card 2: Total Penjualan (Omset Keseluruhan) */}
          <div className="bg-white rounded-xl border border-stone-200 py-2.5 px-3 sm:px-3.5 shadow-2xs flex flex-col justify-between hover:border-blue-300 transition-colors">
            <div>
              <div className="flex items-center justify-between text-stone-500 mb-0.5">
                <span className="text-[11px] font-semibold text-stone-600 truncate">Total Omset Penjualan</span>
                <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline my-0.5">
                <span className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight font-mono tabular-nums leading-none">
                  {formatRupiah(totalRealizedRevenue)}
                </span>
              </div>
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-stone-100 flex items-center justify-between text-[10.5px] text-stone-500">
              <span>Kas Masuk Lunas</span>
              <span className="font-semibold text-emerald-700 font-mono tabular-nums">
                {formatRupiah(totalPaidRevenue)}
              </span>
            </div>
          </div>

          {/* Card 3: Total Piutang Gudang */}
          <div className="bg-amber-50/90 rounded-xl border border-amber-300/90 py-2.5 px-3 sm:px-3.5 shadow-2xs flex flex-col justify-between hover:border-amber-400 transition-colors">
            <div>
              <div className="flex items-center justify-between text-amber-800 mb-0.5">
                <span className="text-[11px] font-bold text-amber-900 truncate">Total Piutang Gudang</span>
                <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                  <Clock3 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline my-0.5">
                <span className="text-lg sm:text-xl font-extrabold text-amber-950 tracking-tight font-mono tabular-nums leading-none">
                  {formatRupiah(totalReceivables)}
                </span>
              </div>
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-amber-200/80 flex items-center justify-between text-[10.5px] text-amber-900">
              <span>Dana Belum Cair</span>
              <span className="font-bold font-mono tabular-nums bg-amber-200/90 px-1.5 py-0.2 rounded text-[10px]">
                {unpaidCount} faktur
              </span>
            </div>
          </div>

          {/* Card 4: Laba Bersih Aktual (Setelah Beban Reject & Susut) */}
          <div className="bg-gradient-to-br from-emerald-800 via-emerald-850 to-emerald-950 text-white rounded-xl py-2.5 px-3 sm:px-3.5 shadow-2xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between text-emerald-200 mb-0.5">
                <span className="text-[11px] font-semibold truncate">
                  {totalOperationalLoss > 0 ? 'Laba Bersih Aktual' : 'Laba Bersih Terwujud'}
                </span>
                <div className="w-6 h-6 rounded-md bg-emerald-700/60 text-amber-300 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline my-0.5">
                <span className={`text-lg sm:text-xl font-extrabold tracking-tight font-mono tabular-nums leading-none ${
                  netProfitAfterAdjustments >= 0 ? 'text-amber-300' : 'text-rose-300'
                }`}>
                  {formatSignedRupiah(netProfitAfterAdjustments)}
                </span>
              </div>
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-emerald-700/60 flex items-center justify-between gap-2 text-[10.5px] text-emerald-200">
              {totalOperationalLoss > 0 ? (
                <>
                  <span className="truncate">Beban Reject &amp; Susut</span>
                  <span className="font-semibold text-rose-300 font-mono tabular-nums shrink-0">
                    -{formatRupiah(totalOperationalLoss)}
                  </span>
                </>
              ) : (
                <>
                  <span className="truncate">Potensi Tambahan Stok</span>
                  <span className="font-semibold text-white font-mono tabular-nums shrink-0">
                    +{formatRupiah(projectedProfitFromStock)}
                  </span>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
