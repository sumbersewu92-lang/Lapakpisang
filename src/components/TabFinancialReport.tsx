import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  Download, 
  FileCheck2, 
  Coins, 
  PieChart,
  Calendar,
  Layers,
  Clock3,
  CheckCircle2,
  PackageX,
  RotateCcw,
  X,
  Scale,
  AlertTriangle
} from 'lucide-react';
import { FarmerPurchase, CentralWarehouseSale, BananaRejectRecord, BananaShrinkageRecord } from '../types/banana';
import {
  formatRupiah,
  formatSignedRupiah,
  formatPaymentMethodLabel,
  formatNumber,
  formatDateTimeIndo,
  formatDateIndo,
  toLocalDateInput
} from '../data/initialData';
import { captureScrollState, blurActiveTrigger } from '../utils/scrollPreservation';
import {
  ExportFormat,
  buildFinancialStatement,
  exportFinancialStatementPDF,
  exportFinancialStatementCSV
} from '../utils/financialReportExport';

interface TabFinancialReportProps {
  purchases: FarmerPurchase[];
  sales: CentralWarehouseSale[];
  rejects?: BananaRejectRecord[];
  shrinkages?: BananaShrinkageRecord[];
  onViewInvoice: (sale: CentralWarehouseSale) => void;
  onMarkAsPaid?: (saleId: string) => void;
  onDeleteReject?: (rejectId: string) => void;
  onDeleteShrinkage?: (shrinkageId: string) => void;
}

type TimeframeFilter = 'today' | 'week' | 'month' | 'all';

export const TabFinancialReport: React.FC<TabFinancialReportProps> = ({
  purchases,
  sales,
  rejects = [],
  shrinkages = [],
  onViewInvoice,
  onMarkAsPaid,
  onDeleteReject,
  onDeleteShrinkage
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('all');
  const [adjustmentFilter, setAdjustmentFilter] = useState<'all' | 'shrinkage' | 'reject'>('all');
  const [rejectToDelete, setRejectToDelete] = useState<BananaRejectRecord | null>(null);
  const [shrinkageToDelete, setShrinkageToDelete] = useState<BananaShrinkageRecord | null>(null);

  // Export Report Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState<string>(() => toLocalDateInput(new Date()));
  const [exportEndDate, setExportEndDate] = useState<string>(() => toLocalDateInput(new Date()));
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [exportError, setExportError] = useState<string>('');

  // Filter logic based on timeframe
  const isDateInTimeframe = (dateStr: string, filter: TimeframeFilter): boolean => {
    if (filter === 'all') return true;

    const itemDate = new Date(dateStr);
    const now = new Date(); // In 2026

    // Normalize to midnight for fair day comparison
    const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate()).getTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (filter === 'today') {
      return itemDay === today;
    }

    if (filter === 'week') {
      const oneWeekAgo = today - (7 * 24 * 60 * 60 * 1000);
      return itemDay >= oneWeekAgo && itemDay <= today;
    }

    if (filter === 'month') {
      return (
        itemDate.getFullYear() === now.getFullYear() &&
        itemDate.getMonth() === now.getMonth()
      );
    }

    return true;
  };

  // Filtered datasets
  const filteredSales = useMemo(() => {
    return sales.filter(s => isDateInTimeframe(s.date, timeframe));
  }, [sales, timeframe]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => isDateInTimeframe(p.date, timeframe));
  }, [purchases, timeframe]);

  const filteredRejects = useMemo(() => {
    return rejects.filter(r => isDateInTimeframe(r.date, timeframe));
  }, [rejects, timeframe]);

  const filteredShrinkages = useMemo(() => {
    return shrinkages.filter(sh => isDateInTimeframe(sh.date, timeframe));
  }, [shrinkages, timeframe]);

  // Aggregate Metrics
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + s.totalRevenue, 0);
  }, [filteredSales]);

  const totalCost = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + s.estimatedCost, 0);
  }, [filteredSales]);

  const totalNetProfit = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + s.netProfit, 0);
  }, [filteredSales]);

  const totalRejectLoss = useMemo(() => {
    return filteredRejects.reduce((acc, r) => acc + r.totalLossAmount, 0);
  }, [filteredRejects]);

  const totalRejectedKg = useMemo(() => {
    return filteredRejects.reduce((acc, r) => acc + r.weightKg, 0);
  }, [filteredRejects]);

  const totalShrinkageLoss = useMemo(() => {
    return filteredShrinkages.reduce((acc, sh) => acc + sh.totalLossAmount, 0);
  }, [filteredShrinkages]);

  const totalShrinkageKg = useMemo(() => {
    return filteredShrinkages.reduce((acc, sh) => acc + sh.weightKg, 0);
  }, [filteredShrinkages]);

  const totalOperationalLoss = totalRejectLoss + totalShrinkageLoss;
  const netProfitAfterAdjustments = totalNetProfit - totalOperationalLoss;
  const overallMarginPercent = totalRevenue > 0 ? (netProfitAfterAdjustments / totalRevenue) * 100 : 0;

  const totalCapitalSpentOnPurchases = useMemo(() => {
    return filteredPurchases.reduce((acc, p) => acc + p.totalPayment, 0);
  }, [filteredPurchases]);

  const totalKgSold = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + s.weightKg, 0);
  }, [filteredSales]);

  // Receivables & Cash in calculations
  const totalReceivables = useMemo(() => {
    return filteredSales
      .filter(s => s.paymentStatus === 'BELUM_LUNAS')
      .reduce((acc, s) => acc + s.totalRevenue, 0);
  }, [filteredSales]);

  const unpaidCount = useMemo(() => {
    return filteredSales.filter(s => s.paymentStatus === 'BELUM_LUNAS').length;
  }, [filteredSales]);

  const totalPaidRevenue = useMemo(() => {
    return filteredSales
      .filter(s => s.paymentStatus === 'LUNAS')
      .reduce((acc, s) => acc + s.totalRevenue, 0);
  }, [filteredSales]);

  const totalPaidNetProfit = useMemo(() => {
    return filteredSales
      .filter(s => s.paymentStatus === 'LUNAS')
      .reduce((acc, s) => acc + s.netProfit, 0);
  }, [filteredSales]);

  // Profit breakdown by Banana Type
  const profitByBanana = useMemo(() => {
    const map: Record<string, { weightKg: number; revenue: number; cost: number; profit: number }> = {};

    filteredSales.forEach(s => {
      if (s.items && s.items.length > 0) {
        s.items.forEach(item => {
          if (!map[item.bananaType]) {
            map[item.bananaType] = { weightKg: 0, revenue: 0, cost: 0, profit: 0 };
          }
          map[item.bananaType].weightKg += item.weightKg;
          map[item.bananaType].revenue += item.subtotalRevenue;
          map[item.bananaType].cost += item.subtotalCost;
          map[item.bananaType].profit += item.subtotalProfit;
        });
      } else {
        if (!map[s.bananaType]) {
          map[s.bananaType] = { weightKg: 0, revenue: 0, cost: 0, profit: 0 };
        }
        map[s.bananaType].weightKg += s.weightKg;
        map[s.bananaType].revenue += s.totalRevenue;
        map[s.bananaType].cost += s.estimatedCost;
        map[s.bananaType].profit += s.netProfit;
      }
    });

    return Object.entries(map).map(([type, data]) => ({
      bananaType: type,
      weightKg: data.weightKg,
      revenue: data.revenue,
      cost: data.cost,
      profit: data.profit,
      marginPercent: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0
    })).sort((a, b) => b.profit - a.profit);
  }, [filteredSales]);

  // Combined Operational Loss breakdown (Reject + Shrinkage) by Banana Type
  const operationalLossByBanana = useMemo(() => {
    const map: Record<string, {
      rejectKg: number;
      rejectLoss: number;
      shrinkageKg: number;
      shrinkageLoss: number;
      totalKg: number;
      totalLoss: number;
      count: number;
    }> = {};

    filteredRejects.forEach(r => {
      if (!map[r.bananaType]) {
        map[r.bananaType] = {
          rejectKg: 0,
          rejectLoss: 0,
          shrinkageKg: 0,
          shrinkageLoss: 0,
          totalKg: 0,
          totalLoss: 0,
          count: 0
        };
      }
      map[r.bananaType].rejectKg += r.weightKg;
      map[r.bananaType].rejectLoss += r.totalLossAmount;
      map[r.bananaType].totalKg += r.weightKg;
      map[r.bananaType].totalLoss += r.totalLossAmount;
      map[r.bananaType].count += 1;
    });

    filteredShrinkages.forEach(sh => {
      if (!map[sh.bananaType]) {
        map[sh.bananaType] = {
          rejectKg: 0,
          rejectLoss: 0,
          shrinkageKg: 0,
          shrinkageLoss: 0,
          totalKg: 0,
          totalLoss: 0,
          count: 0
        };
      }
      map[sh.bananaType].shrinkageKg += sh.weightKg;
      map[sh.bananaType].shrinkageLoss += sh.totalLossAmount;
      map[sh.bananaType].totalKg += sh.weightKg;
      map[sh.bananaType].totalLoss += sh.totalLossAmount;
      map[sh.bananaType].count += 1;
    });

    return Object.entries(map)
      .map(([type, data]) => ({
        bananaType: type,
        ...data
      }))
      .sort((a, b) => b.totalLoss - a.totalLoss);
  }, [filteredRejects, filteredShrinkages]);

  const handleOpenExportModal = () => {
    const now = new Date();
    const todayStr = toLocalDateInput(now);
    let defaultStart = todayStr;

    if (timeframe === 'today') {
      defaultStart = todayStr;
    } else if (timeframe === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      defaultStart = toLocalDateInput(weekAgo);
    } else if (timeframe === 'month') {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      defaultStart = toLocalDateInput(firstOfMonth);
    } else {
      const allDates = [
        ...purchases.map((p) => p.date),
        ...sales.map((s) => s.date),
        ...rejects.map((r) => r.date),
        ...shrinkages.map((sh) => sh.date)
      ]
        .map((ds) => new Date(ds).getTime())
        .filter((t) => Number.isFinite(t));

      if (allDates.length > 0) {
        defaultStart = toLocalDateInput(new Date(Math.min(...allDates)));
      } else {
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        defaultStart = toLocalDateInput(firstOfMonth);
      }
    }

    setExportStartDate(defaultStart);
    setExportEndDate(todayStr);
    setExportError('');
    setIsExportModalOpen(true);
  };

  const exportPreviewSummary = useMemo(() => {
    if (!isExportModalOpen || !exportStartDate || !exportEndDate || exportStartDate > exportEndDate) {
      return null;
    }
    return buildFinancialStatement({
      startDate: exportStartDate,
      endDate: exportEndDate,
      purchases,
      sales,
      rejects,
      shrinkages
    });
  }, [isExportModalOpen, exportStartDate, exportEndDate, purchases, sales, rejects, shrinkages]);

  const handleDownloadReport = (e: React.FormEvent) => {
    e.preventDefault();
    setExportError('');

    if (!exportStartDate || !exportEndDate) {
      setExportError('Pilih rentang tanggal mulai dan tanggal akhir terlebih dahulu.');
      return;
    }

    if (exportStartDate > exportEndDate) {
      setExportError('Tanggal mulai ("Dari Tanggal") tidak boleh melebihi tanggal akhir ("Sampai Tanggal").');
      return;
    }

    const summary = buildFinancialStatement({
      startDate: exportStartDate,
      endDate: exportEndDate,
      purchases,
      sales,
      rejects,
      shrinkages
    });

    if (exportFormat === 'pdf') {
      exportFinancialStatementPDF(summary);
    } else {
      exportFinancialStatementCSV(summary);
    }

    const restore = captureScrollState();
    blurActiveTrigger();
    setIsExportModalOpen(false);
    restore();
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
            <PieChart className="w-3.5 h-3.5 shrink-0" />
            <span>Rekapitulasi Keuangan &amp; Laba Rugi</span>
          </div>
          <h2 className="text-lg sm:text-2xl font-bold text-stone-900 tracking-tight">
            Laporan Keuangan Penjualan Gudang Pusat
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Analisis arus kas modal pembelian petani, total penerimaan penjualan, piutang gudang, dan margin keuntungan bersih.
          </p>
        </div>

        {/* Filter Rentang Waktu (Segmented Buttons) & Print Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto shrink-0">
          <div className="grid grid-cols-2 sm:inline-flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-medium gap-1 sm:gap-0">
            <button
              type="button"
              onClick={() => setTimeframe('today')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                timeframe === 'today'
                  ? 'bg-emerald-800 text-white font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('week')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                timeframe === 'week'
                  ? 'bg-emerald-800 text-white font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Minggu Ini
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('month')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                timeframe === 'month'
                  ? 'bg-emerald-800 text-white font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                timeframe === 'all'
                  ? 'bg-emerald-800 text-white font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Semua Waktu
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenExportModal}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer whitespace-nowrap shrink-0"
            title="Unduh mutasi laporan keuangan (PDF / CSV)"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Unduh Laporan</span>
          </button>
        </div>
      </div>

      {/* Bagian 1: Rekapitulasi Total Modal Keseluruhan vs Total Pendapatan Penjualan */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-6 shadow-xs space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-2">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>Rekapitulasi Arus Modal vs Pendapatan Penjualan</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Periode:{' '}
              <strong className="text-stone-700">
                {timeframe === 'today'
                  ? 'Hari Ini'
                  : timeframe === 'week'
                  ? '7 Hari Terakhir'
                  : timeframe === 'month'
                  ? 'Bulan Berjalan'
                  : 'Keseluruhan Data'}
              </strong>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
            <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span>{filteredSales.length} transaksi penjualan</span>
            <span aria-hidden="true">·</span>
            <span>{filteredPurchases.length} pembelian petani</span>
            <span aria-hidden="true">·</span>
            <span className={filteredShrinkages.length > 0 ? 'text-amber-800 font-semibold' : ''}>
              {filteredShrinkages.length} koreksi susut
            </span>
            <span aria-hidden="true">·</span>
            <span className={filteredRejects.length > 0 ? 'text-rose-700 font-semibold' : ''}>
              {filteredRejects.length} catatan reject
            </span>
          </div>
        </div>

        {/* Row 1: 4 Arus Kas Utama */}
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Total Modal Pembelian Petani */}
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
              <span className="text-xs font-semibold text-stone-500 block mb-1">
                Modal Keluar (Petani)
              </span>
              <span className="text-base sm:text-lg font-extrabold text-stone-900 font-mono tabular-nums block">
                {formatRupiah(totalCapitalSpentOnPurchases)}
              </span>
              <span className="text-[10px] text-stone-400 mt-1 block">
                {filteredPurchases.length} timbangan masuk
              </span>
            </div>

            {/* 2. Total Pendapatan Penjualan Gudang */}
            <div className="bg-blue-50/60 rounded-xl p-4 border border-blue-200/80">
              <span className="text-xs font-semibold text-blue-900 block mb-1">
                Total Omset Penjualan
              </span>
              <span className="text-base sm:text-lg font-extrabold text-blue-950 font-mono tabular-nums block">
                {formatRupiah(totalRevenue)}
              </span>
              <span className="text-[10px] text-blue-700 font-medium mt-1 block">
                Volume: {formatNumber(totalKgSold)} kg
              </span>
            </div>

            {/* 3. Total Piutang Belum Ditransfer */}
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-300">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-amber-900">
                  Piutang Belum Cair
                </span>
                <span className="text-[9px] font-bold bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-mono">
                  {unpaidCount} inv
                </span>
              </div>
              <span className="text-base sm:text-lg font-extrabold text-amber-950 font-mono tabular-nums block">
                {formatRupiah(totalReceivables)}
              </span>
              <span className="text-[10px] text-amber-800 mt-1 block">
                Transfer susulan gudang
              </span>
            </div>

            {/* 4. Kas Lunas Masuk */}
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
              <span className="text-xs font-semibold text-stone-600 block mb-1">
                Kas Masuk (Lunas)
              </span>
              <span className="text-base sm:text-lg font-extrabold text-emerald-900 font-mono tabular-nums block">
                {formatRupiah(totalPaidRevenue)}
              </span>
              <span className="text-[10px] text-stone-400 mt-1 block">
                Dana efektif di rekening
              </span>
            </div>
          </div>

          {/* Row 2: Beban Susut/Selisih Timbang, Beban Reject & Laba Bersih Aktual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* 5. Beban Susut / Selisih Timbang */}
            <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-amber-900">
                  Beban Susut / Selisih Timbang
                </span>
                <span className="text-[9px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-mono">
                  {filteredShrinkages.length} item
                </span>
              </div>
              <span className="text-base sm:text-lg font-extrabold text-amber-900 font-mono tabular-nums block">
                {totalShrinkageLoss > 0 ? `-${formatRupiah(totalShrinkageLoss)}` : formatRupiah(0)}
              </span>
              <span className="text-[10px] text-amber-800 mt-1 block">
                {formatNumber(totalShrinkageKg)} kg selisih bobot
              </span>
            </div>

            {/* 6. Kerugian Stok Pisang Reject */}
            <div className="bg-rose-50/80 rounded-xl p-4 border border-rose-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-rose-900">
                  Beban Stok Reject
                </span>
                <span className="text-[9px] font-bold bg-rose-200 text-rose-900 px-1.5 py-0.2 rounded font-mono">
                  {filteredRejects.length} item
                </span>
              </div>
              <span className="text-base sm:text-lg font-extrabold text-rose-800 font-mono tabular-nums block">
                {totalRejectLoss > 0 ? `-${formatRupiah(totalRejectLoss)}` : formatRupiah(0)}
              </span>
              <span className="text-[10px] text-rose-700 mt-1 block">
                {formatNumber(totalRejectedKg)} kg buah rusak
              </span>
            </div>

            {/* 7. Total Laba Bersih Aktual (Sesudah Beban Reject & Susut) */}
            <div className="sm:col-span-2 lg:col-span-1 bg-emerald-900 text-white rounded-xl p-4 border border-emerald-800 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-emerald-200">
                  {totalOperationalLoss > 0 ? 'Laba Bersih Aktual' : 'Laba Bersih Total'}
                </span>
                <span className="text-[10px] font-bold bg-amber-400 text-emerald-950 px-1.5 py-0.2 rounded font-mono">
                  {overallMarginPercent.toFixed(1)}%
                </span>
              </div>
              <span className={`text-base sm:text-lg font-extrabold font-mono tabular-nums block ${
                netProfitAfterAdjustments >= 0 ? 'text-amber-300' : 'text-rose-300'
              }`}>
                {netProfitAfterAdjustments >= 0
                  ? `+${formatRupiah(netProfitAfterAdjustments)}`
                  : `-${formatRupiah(Math.abs(netProfitAfterAdjustments))}`}
              </span>
              <span className="text-[10px] text-emerald-200/90 mt-1 block truncate">
                {totalOperationalLoss > 0
                  ? `Laba Jual: +${formatRupiah(totalNetProfit)} · Beban: -${formatRupiah(totalOperationalLoss)}`
                  : `Cair: ${formatRupiah(totalPaidNetProfit)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Visual Cashflow & Loss Reconciliation Bar */}
        {(totalRevenue > 0 || totalOperationalLoss > 0) && (
          <div className="p-3.5 sm:p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs text-stone-600">
              <span className="font-semibold text-stone-800">
                Keseimbangan Omset, Modal Pokok, Susut &amp; Reject:
              </span>
              <span className="font-mono text-stone-500 text-[11px] sm:text-xs">
                {totalRevenue > 0
                  ? `Modal ${((totalCost / totalRevenue) * 100).toFixed(1)}% · Susut ${((totalShrinkageLoss / totalRevenue) * 100).toFixed(1)}% · Reject ${((totalRejectLoss / totalRevenue) * 100).toFixed(1)}% · Laba Aktual ${overallMarginPercent.toFixed(1)}%`
                  : `Total Beban Operasional: -${formatRupiah(totalOperationalLoss)}`}
              </span>
            </div>
            {/* Split Progress Bar */}
            {totalRevenue > 0 && (
              <div className="w-full h-3 bg-stone-200 rounded-full overflow-hidden flex">
                <div 
                  style={{ width: `${Math.min(100, Math.max(0, (totalCost / totalRevenue) * 100))}%` }} 
                  className="bg-stone-500 transition-all duration-500"
                  title={`Modal Pokok Terjual: ${formatRupiah(totalCost)}`}
                />
                {totalShrinkageLoss > 0 && (
                  <div
                    style={{ width: `${Math.min(100, Math.max(0, (totalShrinkageLoss / totalRevenue) * 100))}%` }}
                    className="bg-amber-500 transition-all duration-500"
                    title={`Beban Susut / Selisih Timbang: ${formatRupiah(totalShrinkageLoss)}`}
                  />
                )}
                {totalRejectLoss > 0 && (
                  <div
                    style={{ width: `${Math.min(100, Math.max(0, (totalRejectLoss / totalRevenue) * 100))}%` }}
                    className="bg-rose-500 transition-all duration-500"
                    title={`Kerugian Stok Reject: ${formatRupiah(totalRejectLoss)}`}
                  />
                )}
                {netProfitAfterAdjustments > 0 && (
                  <div 
                    style={{ width: `${Math.min(100, Math.max(0, (netProfitAfterAdjustments / totalRevenue) * 100))}%` }} 
                    className="bg-emerald-700 transition-all duration-500"
                    title={`Laba Bersih Aktual: ${formatRupiah(netProfitAfterAdjustments)}`}
                  />
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500 pt-1">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-stone-500 inline-block shrink-0" />
                  <span>Modal Pokok Terjual ({formatRupiah(totalCost)})</span>
                </div>
                {totalShrinkageLoss > 0 && (
                  <div className="flex items-center gap-1.5 text-amber-900 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shrink-0" />
                    <span>Susut Timbang (-{formatRupiah(totalShrinkageLoss)})</span>
                  </div>
                )}
                {totalRejectLoss > 0 && (
                  <div className="flex items-center gap-1.5 text-rose-800 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shrink-0" />
                    <span>Beban Reject (-{formatRupiah(totalRejectLoss)})</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 inline-block shrink-0" />
                <span className={`font-semibold ${netProfitAfterAdjustments >= 0 ? 'text-emerald-900' : 'text-rose-800'}`}>
                  Laba Bersih Aktual ({netProfitAfterAdjustments >= 0 ? `+${formatRupiah(netProfitAfterAdjustments)}` : `-${formatRupiah(Math.abs(netProfitAfterAdjustments))}`})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Breakdown Performa per Varietas Pisang */}
        {profitByBanana.length > 0 && (
          <div className="pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-800" />
              Kontribusi Laba Bersih Berdasarkan Jenis Pisang
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {profitByBanana.map((b) => (
                <div key={b.bananaType} className="p-3.5 bg-white border border-stone-200 rounded-xl shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 text-xs truncate">{b.bananaType}</span>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono">
                      {b.marginPercent.toFixed(1)}% margin
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between text-xs">
                    <span className="text-stone-500">Volume: {formatNumber(b.weightKg)} kg</span>
                    <span className={`font-mono font-bold tabular-nums ${b.profit >= 0 ? 'text-emerald-900' : 'text-rose-700'}`}>
                      {formatSignedRupiah(b.profit)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bagian 2: Tabel Riwayat Laba Bersih per Transaksi Penjualan ke Gudang Pusat */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-6 shadow-xs space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 gap-2">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>Riwayat Laba Bersih per Transaksi Penjualan ke Gudang Pusat</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Rincian perolehan keuntungan bersih dari setiap pengiriman partai besar yang selesai
            </p>
          </div>
          <div className="text-xs text-stone-500 font-mono shrink-0">
            {filteredSales.length} Pengiriman Selesai
          </div>
        </div>

        {/* Table / Mobile Cards Content */}
        <div>
          {filteredSales.length === 0 ? (
            <div className="text-center py-12 px-4 bg-stone-50 rounded-xl border border-dashed border-stone-200">
              <div className="w-10 h-10 rounded-full bg-stone-200 text-stone-400 flex items-center justify-center mx-auto mb-2.5">
                <Calendar className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-stone-700">
                Tidak ada transaksi penjualan pada rentang waktu ini
              </p>
              <p className="text-xs text-stone-400 mt-1">
                Ubah filter rentang waktu ke "Semua Waktu" atau catat penjualan baru di tab "Stok &amp; Penjualan".
              </p>
              <button
                type="button"
                onClick={() => setTimeframe('all')}
                className="mt-3 px-3 py-1.5 text-xs font-semibold bg-emerald-800 text-white rounded-lg hover:bg-emerald-900 transition cursor-pointer"
              >
                Tampilkan Semua Waktu
              </button>
            </div>
          ) : (
            <>
              {/* Mobile & Tablet Card List (< lg) */}
              <div className="lg:hidden space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredSales.map((sale) => {
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
                                className="text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-1.5 py-0.5 rounded"
                              >
                                {it.bananaType}: {formatNumber(it.weightKg)} kg
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
                            <span className="text-[10px] text-stone-400 block">Volume</span>
                            <strong className="font-mono text-stone-900 tabular-nums">{formatNumber(sale.weightKg)} kg</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 block">Pendapatan</span>
                            <strong className="font-mono text-stone-900 tabular-nums">{formatRupiah(sale.totalRevenue)}</strong>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-stone-400 block">Laba ({sale.profitMarginPercent.toFixed(1)}%)</span>
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
                            {isUnpaid && onMarkAsPaid && (
                              <button
                                type="button"
                                onClick={() => onMarkAsPaid(sale.id)}
                                className="px-2.5 py-1 text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Tandai Lunas</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onViewInvoice(sale)}
                              className="p-1.5 text-stone-600 hover:text-emerald-800 bg-white border border-stone-200 rounded-lg transition cursor-pointer"
                              title="Lihat Dokumen Surat Jalan"
                            >
                              <FileCheck2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile & Tablet Totals Summary Box */}
                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-stone-500 block">Total Volume</span>
                    <strong className="font-mono text-stone-900 tabular-nums">{formatNumber(totalKgSold)} kg</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">Total Pendapatan</span>
                    <strong className="font-mono text-stone-900 tabular-nums">{formatRupiah(totalRevenue)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-800 block">Piutang</span>
                    <strong className="font-mono text-amber-900 tabular-nums">{formatRupiah(totalReceivables)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-800 block">Laba Bersih</span>
                    <strong className={`font-mono tabular-nums ${totalNetProfit >= 0 ? 'text-emerald-900' : 'text-rose-700'}`}>
                      {formatSignedRupiah(totalNetProfit)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Desktop Table (>= lg) */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider bg-stone-50/70">
                      <th className="py-2.5 px-3">Tanggal &amp; Surat Jalan</th>
                      <th className="py-2.5 px-3">Gudang Tujuan &amp; Buah</th>
                      <th className="py-2.5 px-3 text-right">Volume (Kg)</th>
                      <th className="py-2.5 px-3 text-right">Pendapatan</th>
                      <th className="py-2.5 px-3 text-right">Laba Bersih</th>
                      <th className="py-2.5 px-3 text-center">Status Pembayaran</th>
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs text-stone-700 font-sans">
                    {filteredSales.map((sale) => {
                      const isUnpaid = sale.paymentStatus === 'BELUM_LUNAS';

                      return (
                        <tr key={sale.id} className={`transition ${isUnpaid ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-stone-50/80'}`}>
                          <td className="py-3 px-3">
                            <span className="font-mono font-semibold text-stone-900 block text-[11px]">
                              {sale.invoiceNumber}
                            </span>
                            <span className="text-[10px] text-stone-400 block">
                              {formatDateTimeIndo(sale.date)}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-stone-900 block text-xs">
                              {sale.buyerWarehouseName}
                            </span>
                            {sale.items && sale.items.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {sale.items.map((it, idx) => (
                                  <span 
                                    key={idx} 
                                    className="text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-1.5 py-0.5 rounded"
                                  >
                                    {it.bananaType}: {formatNumber(it.weightKg)} kg
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
                          <td className="py-3 px-3 text-right font-mono font-bold text-stone-900 tabular-nums">
                            {formatNumber(sale.weightKg)} kg
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-stone-900 tabular-nums">
                            {formatRupiah(sale.totalRevenue)}
                            <span className="text-[10px] text-stone-400 block font-normal">
                              @{formatRupiah(sale.sellPricePerKg)}/kg
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={`font-mono font-bold block tabular-nums text-sm ${sale.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                              {formatSignedRupiah(sale.netProfit)}
                            </span>
                            <span className={`text-[10px] font-semibold font-mono tabular-nums ${sale.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                              ({sale.profitMarginPercent.toFixed(1)}%)
                            </span>
                          </td>

                          {/* Status Bayar Column */}
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

                          {/* Aksi Column */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {isUnpaid && onMarkAsPaid && (
                                <button
                                  type="button"
                                  onClick={() => onMarkAsPaid(sale.id)}
                                  className="px-2 py-0.5 text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded transition shadow-xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                  title="Tandai Pembayaran Lunas"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Tandai Lunas</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onViewInvoice(sale)}
                                className="p-1.5 text-stone-500 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition cursor-pointer"
                                title="Lihat Dokumen Surat Jalan"
                              >
                                <FileCheck2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Table Footer Totals */}
                  <tfoot>
                    <tr className="border-t-2 border-stone-300 font-bold text-xs bg-stone-50 text-stone-900">
                      <td colSpan={2} className="py-3 px-3">
                        TOTAL PERIODE INI
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {formatNumber(totalKgSold)} kg
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-900">
                        {formatRupiah(totalRevenue)}
                      </td>
                      <td className={`py-3 px-3 text-right font-mono tabular-nums text-sm ${totalNetProfit >= 0 ? 'text-emerald-900' : 'text-rose-700'}`}>
                        {formatSignedRupiah(totalNetProfit)}
                      </td>
                      <td className="py-3 px-3 text-center font-mono tabular-nums text-[11px] text-amber-800">
                        Piutang: {formatRupiah(totalReceivables)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-[10px] text-emerald-700 font-semibold">Valid</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Informational footer note */}
        <div className="pt-2 text-xs text-stone-500 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100">
          <span>
            * Modal pokok dihitung berdasarkan harga rata-rata timbangan beli petani saat pasokan masuk.
          </span>
          <span className="text-emerald-800 font-medium flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            Laporan Keuangan Terverifikasi
          </span>
        </div>
      </div>

      {/* Bagian 3: Rekapitulasi & Pencatatan Beban Operasional (Susut / Selisih Timbang & Reject) */}
      {(() => {
        const combinedAdjustments = [
          ...filteredShrinkages.map(s => ({ kind: 'shrinkage' as const, record: s })),
          ...filteredRejects.map(r => ({ kind: 'reject' as const, record: r }))
        ].sort((a, b) => new Date(b.record.date).getTime() - new Date(a.record.date).getTime());

        const filteredAdjustments = combinedAdjustments.filter(item =>
          adjustmentFilter === 'all' ? true : item.kind === adjustmentFilter
        );

        const displayedAdjustedKg = Math.round(
          filteredAdjustments.reduce((acc, item) => acc + item.record.weightKg, 0) * 100
        ) / 100;
        const displayedAdjustedLoss = filteredAdjustments.reduce(
          (acc, item) => acc + item.record.totalLossAmount,
          0
        );
        const adjustmentFooterLabel =
          adjustmentFilter === 'shrinkage'
            ? 'TOTAL SUSUT / SELISIH PERIODE INI'
            : adjustmentFilter === 'reject'
            ? 'TOTAL STOK REJECT PERIODE INI'
            : 'TOTAL BEBAN SUSUT & REJECT PERIODE INI';

        return (
          <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-6 shadow-xs space-y-4 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 gap-2">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Rekapitulasi Beban Susut / Selisih Timbang &amp; Stok Reject</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Catatan historis susut dan reject dihitung berdasarkan modal pokok saat pencatatan untuk neraca keuangan, tanpa memotong pasokan baru maupun mengganggu harga pokok rata-rata (moving average).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span className="text-xs font-mono font-bold text-stone-800 bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-lg">
                  {combinedAdjustments.length} Catatan · -{formatRupiah(totalOperationalLoss)}
                </span>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAdjustmentFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  adjustmentFilter === 'all'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Semua ({combinedAdjustments.length})
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentFilter('shrinkage')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  adjustmentFilter === 'shrinkage'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                Susut / Selisih Timbang ({filteredShrinkages.length})
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentFilter('reject')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  adjustmentFilter === 'reject'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                Stok Reject ({filteredRejects.length})
              </button>
            </div>

            {/* Per-variety breakdown cards */}
            {operationalLossByBanana.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {operationalLossByBanana.map((item) => (
                  <div key={item.bananaType} className="p-3.5 bg-stone-50/70 border border-stone-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-stone-900 text-xs truncate">🍌 {item.bananaType}</span>
                      <span className="text-[10px] font-semibold text-stone-700 bg-white px-1.5 py-0.5 rounded border border-stone-200 font-mono shrink-0">
                        {item.count} koreksi
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs gap-2">
                      <span className="text-stone-600 font-mono">
                        Total: {formatNumber(item.totalKg)} kg
                      </span>
                      <span className="font-mono font-bold text-rose-700 tabular-nums">
                        -{formatRupiah(item.totalLoss)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-stone-500 pt-1 border-t border-stone-200/70">
                      <span>Susut: {formatNumber(item.shrinkageKg)} kg (-{formatRupiah(item.shrinkageLoss)})</span>
                      <span>Reject: {formatNumber(item.rejectKg)} kg (-{formatRupiah(item.rejectLoss)})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredAdjustments.length === 0 ? (
              <div className="text-center py-8 px-4 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto mb-2.5">
                  <Scale className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-stone-700">
                  Tidak ada catatan susut timbang maupun reject pada rentang waktu ini
                </p>
                <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
                  Gunakan tombol <strong className="text-amber-800">Susut / Koreksi</strong> untuk selisih timbang atau <strong className="text-rose-700">Reject</strong> untuk buah rusak di tab Stok &amp; Penjualan.
                </p>
                {timeframe !== 'all' && (rejects.length > 0 || shrinkages.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setTimeframe('all')}
                    className="mt-3 px-3 py-1.5 text-xs font-semibold bg-emerald-800 text-white rounded-lg hover:bg-emerald-900 transition cursor-pointer"
                  >
                    Tampilkan Semua Waktu
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile & Tablet Cards (< lg) */}
                <div className="lg:hidden space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredAdjustments.map(({ kind, record }) => {
                      const isReject = kind === 'reject';
                      const canRestore = isReject ? Boolean(onDeleteReject) : Boolean(onDeleteShrinkage);

                      return (
                        <div
                          key={record.id}
                          className={`p-3.5 rounded-xl border space-y-2.5 ${
                            isReject ? 'border-rose-200/80 bg-rose-50/30' : 'border-amber-200/90 bg-amber-50/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-semibold text-stone-900 text-[11px]">
                                  {record.referenceNumber}
                                </span>
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                  isReject
                                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                                    : 'bg-amber-100 text-amber-800 border-amber-200'
                                }`}>
                                  {isReject ? 'Reject' : 'Susut / Selisih'}
                                </span>
                              </div>
                              <span className="font-bold text-stone-900 block text-sm truncate mt-0.5">
                                🍌 {record.bananaType}
                              </span>
                              <span className="text-[10px] text-stone-500 block">
                                {formatDateTimeIndo(record.date)}
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold text-stone-700 bg-white border border-stone-200 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                              {record.reason}
                            </span>
                          </div>

                          {record.notes && (
                            <p className="text-[11px] text-stone-600 italic bg-white/80 px-2.5 py-1.5 rounded-lg border border-stone-200/70">
                              "{record.notes}"
                            </p>
                          )}

                          <div className={`grid grid-cols-3 gap-2 pt-2 border-t text-xs ${
                            isReject ? 'border-rose-200/60' : 'border-amber-200/60'
                          }`}>
                            <div>
                              <span className="text-[10px] text-stone-500 block">Volume</span>
                              <strong className="font-mono text-stone-900 tabular-nums">{formatNumber(record.weightKg)} kg</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-stone-500 block">Modal/kg</span>
                              <strong className="font-mono text-stone-700 tabular-nums">{formatRupiah(record.costPricePerKg)}</strong>
                            </div>
                            <div className="text-right">
                              <span className={`text-[10px] block font-semibold ${isReject ? 'text-rose-700' : 'text-amber-800'}`}>
                                Beban Modal
                              </span>
                              <strong className={`font-mono tabular-nums ${isReject ? 'text-rose-800' : 'text-amber-900'}`}>
                                -{formatRupiah(record.totalLossAmount)}
                              </strong>
                            </div>
                          </div>

                          {canRestore && (
                            <div className={`pt-2 border-t flex justify-end ${isReject ? 'border-rose-200/60' : 'border-amber-200/60'}`}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isReject) {
                                    setRejectToDelete(record as BananaRejectRecord);
                                  } else {
                                    setShrinkageToDelete(record as BananaShrinkageRecord);
                                  }
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
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

                  <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-amber-800 block">Susut / Selisih</span>
                      <strong className="font-mono text-amber-900 tabular-nums">
                        {formatNumber(totalShrinkageKg)} kg (-{formatRupiah(totalShrinkageLoss)})
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-rose-700 block">Stok Reject</span>
                      <strong className="font-mono text-rose-800 tabular-nums">
                        {formatNumber(totalRejectedKg)} kg (-{formatRupiah(totalRejectLoss)})
                      </strong>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-stone-600 block font-semibold">Total Beban Operasional</span>
                      <strong className="font-mono text-stone-900 tabular-nums">-{formatRupiah(totalOperationalLoss)}</strong>
                    </div>
                  </div>
                </div>

                {/* Desktop Table (>= lg) */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider bg-stone-50/80">
                        <th className="py-2.5 px-3">Ref &amp; Tanggal</th>
                        <th className="py-2.5 px-3">Jenis</th>
                        <th className="py-2.5 px-3">Varietas &amp; Keterangan</th>
                        <th className="py-2.5 px-3 text-right">Berat (Kg)</th>
                        <th className="py-2.5 px-3 text-right">Modal Pokok / kg</th>
                        <th className="py-2.5 px-3 text-right">Beban Modal</th>
                        {(onDeleteReject || onDeleteShrinkage) && <th className="py-2.5 px-3 text-center">Aksi</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
                      {filteredAdjustments.map(({ kind, record }) => {
                        const isReject = kind === 'reject';
                        const canRestore = isReject ? Boolean(onDeleteReject) : Boolean(onDeleteShrinkage);

                        return (
                          <tr key={record.id} className={isReject ? 'hover:bg-rose-50/30 transition' : 'hover:bg-amber-50/30 transition'}>
                            <td className="py-3 px-3">
                              <span className="font-mono font-semibold text-stone-900 block text-[11px]">
                                {record.referenceNumber}
                              </span>
                              <span className="text-[10px] text-stone-400 block">
                                {formatDateTimeIndo(record.date)}
                              </span>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isReject
                                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                                  : 'bg-amber-100 text-amber-900 border-amber-200'
                              }`}>
                                {isReject ? 'Reject' : 'Susut / Selisih'}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-stone-900">🍌 {record.bananaType}</span>
                                <span className="text-[10px] font-medium text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full">
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
                            <td className={`py-3 px-3 text-right font-mono font-bold tabular-nums text-sm whitespace-nowrap ${
                              isReject ? 'text-rose-700' : 'text-amber-800'
                            }`}>
                              -{formatRupiah(record.totalLossAmount)}
                            </td>
                            {(onDeleteReject || onDeleteShrinkage) && (
                              <td className="py-3 px-3 text-center">
                                {canRestore && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isReject) {
                                        setRejectToDelete(record as BananaRejectRecord);
                                      } else {
                                        setShrinkageToDelete(record as BananaShrinkageRecord);
                                      }
                                    }}
                                    className="px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 rounded-lg transition inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                    title="Hapus catatan & pulihkan stok siap kirim"
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
                    <tfoot>
                      <tr className="border-t-2 border-stone-300 font-bold text-xs bg-stone-50 text-stone-900">
                        <td colSpan={3} className="py-3 px-3">
                          {adjustmentFooterLabel}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                          {formatNumber(displayedAdjustedKg)} kg
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-500">
                          -
                        </td>
                        <td className={`py-3 px-3 text-right font-mono tabular-nums text-sm whitespace-nowrap ${
                          adjustmentFilter === 'shrinkage' ? 'text-amber-800' : 'text-rose-700'
                        }`}>
                          -{formatRupiah(displayedAdjustedLoss)}
                        </td>
                        {(onDeleteReject || onDeleteShrinkage) && (
                          <td className="py-3 px-3 text-center">
                            <span className="text-[10px] text-stone-600 font-semibold">Tercatat</span>
                          </td>
                        )}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* Modal Konfirmasi Pulihkan Stok Reject */}
      {rejectToDelete && onDeleteReject && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => {
            const restore = captureScrollState();
            blurActiveTrigger();
            setRejectToDelete(null);
            restore();
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-report-restore-reject-title"
          >
            <div className="flex-shrink-0 px-5 py-4 border-b border-stone-200 bg-emerald-50/70 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="modal-report-restore-reject-title" className="text-sm sm:text-base font-bold text-stone-900">
                    Pulihkan Catatan Stok Reject?
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Stok dikembalikan ke siap kirim &amp; beban kerugian dibatalkan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const restore = captureScrollState();
                  blurActiveTrigger();
                  setRejectToDelete(null);
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
                  <strong className="font-mono">{rejectToDelete.referenceNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Varietas:</span>
                  <strong>🍌 {rejectToDelete.bananaType}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Volume Reject:</span>
                  <strong className="font-mono">
                    {formatNumber(rejectToDelete.weightKg)} kg
                  </strong>
                </div>
                <div className="flex justify-between border-t border-stone-200 pt-1.5">
                  <span className="text-stone-500">Beban Kerugian:</span>
                  <strong className="font-mono text-rose-700">-{formatRupiah(rejectToDelete.totalLossAmount)}</strong>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const restore = captureScrollState();
                  blurActiveTrigger();
                  setRejectToDelete(null);
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
                  blurActiveTrigger();
                  onDeleteReject(rejectToDelete.id);
                  setRejectToDelete(null);
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

      {/* Modal Konfirmasi Pulihkan Koreksi Susut / Selisih Timbang */}
      {shrinkageToDelete && onDeleteShrinkage && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => {
            const restore = captureScrollState();
            blurActiveTrigger();
            setShrinkageToDelete(null);
            restore();
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-report-restore-shrinkage-title"
          >
            <div className="flex-shrink-0 px-5 py-4 border-b border-stone-200 bg-emerald-50/70 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="modal-report-restore-shrinkage-title" className="text-sm sm:text-base font-bold text-stone-900">
                    Pulihkan Koreksi Susut / Selisih?
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Stok dikembalikan ke siap kirim &amp; beban susut dibatalkan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const restore = captureScrollState();
                  blurActiveTrigger();
                  setShrinkageToDelete(null);
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
                  <strong className="font-mono">{shrinkageToDelete.referenceNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Varietas:</span>
                  <strong>🍌 {shrinkageToDelete.bananaType}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Berat Susut / Selisih:</span>
                  <strong className="font-mono">
                    {formatNumber(shrinkageToDelete.weightKg)} kg
                  </strong>
                </div>
                <div className="flex justify-between border-t border-stone-200 pt-1.5">
                  <span className="text-stone-500">Beban Modal Susut:</span>
                  <strong className="font-mono text-amber-800">-{formatRupiah(shrinkageToDelete.totalLossAmount)}</strong>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const restore = captureScrollState();
                  blurActiveTrigger();
                  setShrinkageToDelete(null);
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
                  blurActiveTrigger();
                  onDeleteShrinkage(shrinkageToDelete.id);
                  setShrinkageToDelete(null);
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

      {/* Modal Konfigurasi Unduh Laporan Mutasi Keuangan (PDF / CSV) */}
      {isExportModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => {
            const restore = captureScrollState();
            blurActiveTrigger();
            setIsExportModalOpen(false);
            restore();
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-export-financial-title"
          >
            {/* Header Modal */}
            <div className="flex-shrink-0 px-5 py-4 border-b border-stone-200 bg-emerald-900 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-800 border border-emerald-700 text-amber-300 flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 id="modal-export-financial-title" className="text-sm sm:text-base font-bold truncate">
                    Unduh Laporan Mutasi Keuangan
                  </h3>
                  <p className="text-[11px] text-emerald-200 truncate">
                    Format Rekening Koran &amp; Arus Kas Lapak Pisang Sumber Sewu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const restore = captureScrollState();
                  blurActiveTrigger();
                  setIsExportModalOpen(false);
                  restore();
                }}
                className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-800 rounded-lg transition cursor-pointer shrink-0"
                aria-label="Tutup modal unduh laporan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleDownloadReport} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
                {exportError && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{exportError}</span>
                  </div>
                )}

                {/* Filter Rentang Tanggal */}
                <div className="space-y-2">
                  <label className="block font-bold text-stone-800">
                    Filter Rentang Tanggal Mutasi <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="export-start-date" className="block text-[11px] font-semibold text-stone-600 mb-1">
                        Dari Tanggal
                      </label>
                      <input
                        id="export-start-date"
                        type="date"
                        required
                        value={exportStartDate}
                        onChange={(e) => {
                          setExportStartDate(e.target.value);
                          setExportError('');
                        }}
                        className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>
                    <div>
                      <label htmlFor="export-end-date" className="block text-[11px] font-semibold text-stone-600 mb-1">
                        Sampai Tanggal
                      </label>
                      <input
                        id="export-end-date"
                        type="date"
                        required
                        value={exportEndDate}
                        onChange={(e) => {
                          setExportEndDate(e.target.value);
                          setExportError('');
                        }}
                        className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Pilihan Format File (Dropdown) */}
                <div>
                  <label htmlFor="export-file-format" className="block font-bold text-stone-800 mb-1">
                    Pilihan Format File <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="export-file-format"
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  >
                    <option value="pdf">Unduh PDF (.pdf — Rekening Koran Resmi)</option>
                    <option value="csv">Unduh CSV (.csv — Spreadsheet / Excel)</option>
                  </select>
                  <span className="text-[10.5px] text-stone-500 block mt-1">
                    Dokumen disusun kronologis menyerupai mutasi rekening bank dengan kolom Debet, Kredit, dan Saldo Kas Berjalan.
                  </span>
                </div>

                {/* Live Summary Preview */}
                {exportPreviewSummary && (
                  <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-stone-200/80">
                      <span className="text-[11px] font-bold text-stone-800">
                        Pratinjau Ringkasan Mutasi
                      </span>
                      <span className="text-[11px] font-mono text-stone-600 tabular-nums">
                        {formatDateIndo(exportPreviewSummary.startDate)} – {formatDateIndo(exportPreviewSummary.endDate)} · <strong>{exportPreviewSummary.rows.length}</strong> mutasi
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div className="p-2.5 bg-white border border-stone-200 rounded-lg">
                        <span className="text-[10px] text-stone-500 block">Modal Keluar (Debet)</span>
                        <strong className="font-mono text-rose-700 tabular-nums">
                          {formatRupiah(exportPreviewSummary.totalModalKeluar)}
                        </strong>
                      </div>
                      <div className="p-2.5 bg-white border border-stone-200 rounded-lg">
                        <span className="text-[10px] text-stone-500 block">Kas Masuk Lunas (Kredit)</span>
                        <strong className="font-mono text-emerald-800 tabular-nums">
                          {formatRupiah(exportPreviewSummary.totalKasMasukLunas)}
                        </strong>
                      </div>
                      <div className="p-2.5 bg-white border border-stone-200 rounded-lg">
                        <span className="text-[10px] text-stone-500 block">Piutang Belum Cair</span>
                        <strong className="font-mono text-amber-800 tabular-nums">
                          {formatRupiah(exportPreviewSummary.totalPiutangGudang)}
                        </strong>
                      </div>
                      <div className="p-2.5 bg-white border border-stone-200 rounded-lg">
                        <span className="text-[10px] text-stone-500 block">Laba Bersih Terwujud</span>
                        <strong className={`font-mono tabular-nums ${exportPreviewSummary.labaBersihTerwujud >= 0 ? 'text-emerald-900' : 'text-rose-700'}`}>
                          {exportPreviewSummary.labaBersihTerwujud >= 0 ? '+' : '-'}{formatRupiah(Math.abs(exportPreviewSummary.labaBersihTerwujud))}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div className="flex-shrink-0 px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const restore = captureScrollState();
                    blurActiveTrigger();
                    setIsExportModalOpen(false);
                    restore();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{exportFormat === 'pdf' ? 'Unduh PDF' : 'Unduh CSV'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
