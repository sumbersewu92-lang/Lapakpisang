import React from 'react';
import { Scale, Wallet, TrendingUp, Sparkles, Clock3, CheckCircle2, Layers } from 'lucide-react';
import { formatRupiah, formatSignedRupiah, formatNumber } from '../data/initialData';

interface StatCardsProps {
  activeTab: 'purchases' | 'stock-and-sales' | 'financial-report';
  totalStockKg: number;
  totalStockBunches?: number;
  varietyCount?: number;
  totalCapitalSpent: number;
  totalRealizedRevenue: number;
  totalRealizedProfit: number;
  totalRejectLoss?: number;
  totalShrinkageLoss?: number;
  projectedProfitFromStock?: number;
  potentialStockGrossValue?: number;
  totalReceivables: number;
  unpaidCount: number;
  totalPaidRevenue: number;
}

export const StatCards: React.FC<StatCardsProps> = ({
  activeTab,
  totalStockKg,
  totalStockBunches = 0,
  varietyCount = 0,
  totalCapitalSpent,
  totalRealizedRevenue,
  totalRealizedProfit,
  totalRejectLoss = 0,
  totalShrinkageLoss = 0,
  totalReceivables,
  unpaidCount,
  totalPaidRevenue
}) => {
  if (activeTab === 'purchases') {
    return null;
  }
  const combinedLoss = totalRejectLoss + totalShrinkageLoss;
  const adjustedNetProfit = totalRealizedProfit - combinedLoss;

  return (
    <div
      key={activeTab}
      className={
        activeTab === 'stock-and-sales'
          ? 'grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 transition-all duration-300 animate-in fade-in zoom-in-95'
          : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 transition-all duration-300 animate-in fade-in zoom-in-95'
      }
    >
      {/* TAB: STOK & PENJUALAN */}
      {activeTab === 'stock-and-sales' && (
        <>
          {/* Card 1: Total Stok Pisang Gudang */}
          <div className="bg-white rounded-xl border border-stone-200 py-2.5 px-3 sm:px-3.5 shadow-2xs flex flex-col justify-between hover:border-emerald-300 transition-colors">
            <div>
              <div className="flex items-center justify-between text-stone-500 mb-0.5">
                <span className="text-[11px] font-semibold text-stone-600 truncate">Total Stok Pisang Gudang</span>
                <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Scale className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-1 my-0.5">
                <span className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight font-mono tabular-nums leading-none">
                  {formatNumber(totalStockKg)}
                </span>
                <span className="text-[11px] font-bold text-emerald-700 leading-none">kg</span>
              </div>
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-stone-100 flex items-center justify-between gap-2 text-[10.5px] text-stone-500">
              <span className="inline-flex items-center gap-1 truncate">
                <Layers className="w-3 h-3 text-emerald-700 shrink-0" />
                <span>{varietyCount} varietas aktif</span>
              </span>
              <span className="font-semibold text-emerald-800 font-mono tabular-nums shrink-0">
                {formatNumber(totalStockBunches)} tandan
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
          <div className="bg-white rounded-xl border border-stone-200 py-2.5 px-3 sm:px-3.5 shadow-2xs flex flex-col justify-between hover:border-stone-300 transition-colors">
            <div>
              <div className="flex items-center justify-between text-stone-500 mb-0.5">
                <span className="text-[11px] font-semibold text-stone-600 truncate">Penjualan Gudang Pusat</span>
                <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
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

      {/* TAB: LAPORAN KEUANGAN */}
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
              <span>Pembelian dari Petani</span>
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Tunai Lunas</span>
              </span>
            </div>
          </div>

          {/* Card 2: Total Omset Penjualan */}
          <div className="bg-white rounded-xl border border-stone-200 py-2.5 px-3 sm:px-3.5 shadow-2xs flex flex-col justify-between hover:border-stone-300 transition-colors">
            <div>
              <div className="flex items-center justify-between text-stone-500 mb-0.5">
                <span className="text-[11px] font-semibold text-stone-600 truncate">Total Omset Penjualan</span>
                <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
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

          {/* Card 4: Laba Bersih Terwujud */}
          <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-900 text-white rounded-xl py-2.5 px-3 sm:px-3.5 shadow-2xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between text-emerald-100 mb-0.5">
                <span className="text-[11px] font-semibold truncate">
                  Laba Bersih Terwujud
                </span>
                <div className="w-6 h-6 rounded-md bg-white/10 text-emerald-200 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline my-0.5">
                <span
                  className={`text-lg sm:text-xl font-extrabold tracking-tight font-mono tabular-nums leading-none ${
                    adjustedNetProfit >= 0 ? 'text-emerald-200' : 'text-rose-200'
                  }`}
                >
                  {formatSignedRupiah(adjustedNetProfit)}
                </span>
              </div>
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-white/15 flex items-center justify-between gap-2 text-[10.5px] text-emerald-100/90">
              <span className="truncate">
                {combinedLoss > 0 ? 'Koreksi Stok' : 'Sisa Stok Gudang'}
              </span>
              <span className="font-semibold font-mono tabular-nums text-white shrink-0">
                {combinedLoss > 0 ? `-${formatRupiah(combinedLoss)}` : `${formatNumber(totalStockKg)} kg`}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
