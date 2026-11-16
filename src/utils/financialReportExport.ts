import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  FarmerPurchase,
  CentralWarehouseSale,
  BananaRejectRecord,
  BananaShrinkageRecord
} from '../types/banana';
import {
  formatDateIndo,
  formatDateTimeIndo,
  formatNumber,
  formatRupiah,
  formatPaymentMethodLabel
} from '../data/initialData';

export type ExportFormat = 'pdf' | 'csv';

export interface FinancialExportInput {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  purchases: FarmerPurchase[];
  sales: CentralWarehouseSale[];
  rejects: BananaRejectRecord[];
  shrinkages: BananaShrinkageRecord[];
}

export interface MutasiLedgerRow {
  ts: number;
  order: number;
  tanggalWaktu: string;
  noReferensi: string;
  jenisMutasi: 'PEMBELIAN' | 'PENJUALAN_LUNAS' | 'PENJUALAN_PIUTANG' | 'SUSUT' | 'REJECT';
  uraianTransaksi: string;
  debet: number;
  kredit: number;
  saldo: number;
}

export interface FinancialStatementSummary {
  startDate: string;
  endDate: string;
  printedAt: string;
  rows: MutasiLedgerRow[];
  totalModalKeluar: number;
  totalKasMasukLunas: number;
  totalPiutangGudang: number;
  totalPenjualanBruto: number;
  labaBersihTerwujud: number;
  saldoArusKasAkhir: number;
  purchaseCount: number;
  paidSaleCount: number;
  unpaidSaleCount: number;
  shrinkageCount: number;
  rejectCount: number;
  totalShrinkageLoss: number;
  totalRejectLoss: number;
}

function parseDateBounds(startDate: string, endDate: string): { startMs: number; endMs: number } {
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const startMs = new Date(sy, (sm || 1) - 1, sd || 1, 0, 0, 0, 0).getTime();
  const endMs = new Date(ey, (em || 1) - 1, ed || 1, 23, 59, 59, 999).getTime();
  return { startMs, endMs };
}

function formatStatementDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  } catch {
    return dateStr;
  }
}

function formatCurrencyCell(amount: number): string {
  if (amount === 0) return '-';
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0
  }).format(amount);
}

function formatSignedRupiah(amount: number): string {
  const formatted = formatRupiah(Math.abs(amount));
  if (amount < 0) return `-${formatted}`;
  return formatted;
}

function formatSignedNumeric(amount: number): string {
  const absFormatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0
  }).format(Math.abs(amount));
  return amount < 0 ? `-${absFormatted}` : absFormatted;
}

function summarizePurchaseVarieties(p: FarmerPurchase): string {
  if (p.items && p.items.length > 0) {
    return p.items.map((it) => `${it.bananaType} ${formatNumber(it.weightKg)} kg`).join(', ');
  }
  return `${p.bananaType} ${formatNumber(p.weightKg)} kg`;
}

function summarizeSaleVarieties(s: CentralWarehouseSale): string {
  if (s.items && s.items.length > 0) {
    return s.items.map((it) => `${it.bananaType} ${formatNumber(it.weightKg)} kg`).join(', ');
  }
  return `${s.bananaType} ${formatNumber(s.weightKg)} kg`;
}

export function buildFinancialStatement(input: FinancialExportInput): FinancialStatementSummary {
  const { startMs, endMs } = parseDateBounds(input.startDate, input.endDate);

  const inRange = (dateStr: string): boolean => {
    const t = new Date(dateStr).getTime();
    return Number.isFinite(t) && t >= startMs && t <= endMs;
  };

  const filteredPurchases = input.purchases.filter((p) => inRange(p.date));
  const filteredSales = input.sales.filter((s) => inRange(s.date));
  const filteredShrinkages = input.shrinkages.filter((sh) => inRange(sh.date));
  const filteredRejects = input.rejects.filter((r) => inRange(r.date));

  const rawEvents: Omit<MutasiLedgerRow, 'saldo'>[] = [];

  filteredPurchases.forEach((p) => {
    const ts = new Date(p.date).getTime();
    const detail = summarizePurchaseVarieties(p);
    rawEvents.push({
      ts: Number.isFinite(ts) ? ts : 0,
      order: 0,
      tanggalWaktu: formatStatementDateTime(p.date),
      noReferensi: p.receiptNumber,
      jenisMutasi: 'PEMBELIAN',
      uraianTransaksi: `Pembelian dari Petani: ${p.farmerName} (${detail})${p.notes ? ` · Catatan: ${p.notes}` : ''}`,
      debet: Math.round(p.totalPayment || 0),
      kredit: 0
    });
  });

  filteredSales.forEach((s) => {
    const ts = new Date(s.date).getTime();
    const detail = summarizeSaleVarieties(s);
    const isPaid = s.paymentStatus === 'LUNAS';
    const statusDesc = isPaid
      ? `LUNAS · ${formatPaymentMethodLabel('LUNAS', s.paymentMethod)}`
      : `PIUTANG / BELUM CAIR: ${formatRupiah(s.totalRevenue)}${s.dueDate ? ` · Tempo ${formatDateIndo(s.dueDate)}` : ''}`;

    rawEvents.push({
      ts: Number.isFinite(ts) ? ts : 0,
      order: 1,
      tanggalWaktu: formatStatementDateTime(s.date),
      noReferensi: s.invoiceNumber,
      jenisMutasi: isPaid ? 'PENJUALAN_LUNAS' : 'PENJUALAN_PIUTANG',
      uraianTransaksi: `Penjualan ke Gudang: ${s.buyerWarehouseName} [${statusDesc}] (${detail})`,
      debet: 0,
      kredit: isPaid ? Math.round(s.totalRevenue || 0) : 0
    });
  });

  filteredShrinkages.forEach((sh) => {
    const ts = new Date(sh.date).getTime();
    rawEvents.push({
      ts: Number.isFinite(ts) ? ts : 0,
      order: 2,
      tanggalWaktu: formatStatementDateTime(sh.date),
      noReferensi: sh.referenceNumber,
      jenisMutasi: 'SUSUT',
      uraianTransaksi: `Catatan Susut / Selisih Timbang: ${sh.bananaType} ${formatNumber(sh.weightKg)} kg (${sh.reason} · Beban Modal ${formatRupiah(sh.totalLossAmount)})`,
      debet: 0,
      kredit: 0
    });
  });

  filteredRejects.forEach((r) => {
    const ts = new Date(r.date).getTime();
    rawEvents.push({
      ts: Number.isFinite(ts) ? ts : 0,
      order: 3,
      tanggalWaktu: formatStatementDateTime(r.date),
      noReferensi: r.referenceNumber,
      jenisMutasi: 'REJECT',
      uraianTransaksi: `Catatan Stok Reject: ${r.bananaType} ${formatNumber(r.weightKg)} kg (${r.reason} · Beban Modal ${formatRupiah(r.totalLossAmount)})`,
      debet: 0,
      kredit: 0
    });
  });

  // Sort chronologically (oldest first, like a bank statement)
  rawEvents.sort((a, b) => a.ts - b.ts || a.order - b.order);

  let runningBalance = 0;
  const rows: MutasiLedgerRow[] = rawEvents.map((ev) => {
    runningBalance = runningBalance + ev.kredit - ev.debet;
    return {
      ...ev,
      saldo: runningBalance
    };
  });

  const totalModalKeluar = filteredPurchases.reduce((acc, p) => acc + Math.round(p.totalPayment || 0), 0);
  const paidSales = filteredSales.filter((s) => s.paymentStatus === 'LUNAS');
  const unpaidSales = filteredSales.filter((s) => s.paymentStatus === 'BELUM_LUNAS');

  const totalKasMasukLunas = paidSales.reduce((acc, s) => acc + Math.round(s.totalRevenue || 0), 0);
  const totalPiutangGudang = unpaidSales.reduce((acc, s) => acc + Math.round(s.totalRevenue || 0), 0);
  const totalPenjualanBruto = filteredSales.reduce((acc, s) => acc + Math.round(s.totalRevenue || 0), 0);

  const totalNetProfitSales = filteredSales.reduce((acc, s) => acc + Math.round(s.netProfit || 0), 0);
  const totalShrinkageLoss = filteredShrinkages.reduce((acc, sh) => acc + Math.round(sh.totalLossAmount || 0), 0);
  const totalRejectLoss = filteredRejects.reduce((acc, r) => acc + Math.round(r.totalLossAmount || 0), 0);
  const labaBersihTerwujud = totalNetProfitSales - totalShrinkageLoss - totalRejectLoss;

  return {
    startDate: input.startDate,
    endDate: input.endDate,
    printedAt: formatDateTimeIndo(new Date().toISOString()),
    rows,
    totalModalKeluar,
    totalKasMasukLunas,
    totalPiutangGudang,
    totalPenjualanBruto,
    labaBersihTerwujud,
    saldoArusKasAkhir: runningBalance,
    purchaseCount: filteredPurchases.length,
    paidSaleCount: paidSales.length,
    unpaidSaleCount: unpaidSales.length,
    shrinkageCount: filteredShrinkages.length,
    rejectCount: filteredRejects.length,
    totalShrinkageLoss,
    totalRejectLoss
  };
}

function buildFileName(startDate: string, endDate: string, ext: 'pdf' | 'csv'): string {
  const safeStart = startDate.replace(/[^0-9-]/g, '');
  const safeEnd = endDate.replace(/[^0-9-]/g, '');
  return `Mutasi_Keuangan_Lapak_Pisang_Sumber_Sewu_${safeStart}_sd_${safeEnd}.${ext}`;
}

export function exportFinancialStatementPDF(summary: FinancialStatementSummary): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2;

  // Formal Banking Colors (BRI-inspired deep navy & crisp neutral slate)
  const navyR = 11;
  const navyG = 58;
  const navyB = 117;

  // Top Header Strip
  doc.setFillColor(navyR, navyG, navyB);
  doc.rect(marginX, 10, contentWidth, 2.2, 'F');

  // Store Identity (Left)
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text('LAPAK PISANG SUMBER SEWU', marginX, 18.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  doc.text('Toko Sumber Sewu · Sistem Jual Beli & Manajemen Pisang', marginX, 23);
  doc.text('Kontak / WhatsApp: 0822-8118-5001', marginX, 27);

  // Statement Title & Metadata (Right)
  doc.setTextColor(navyR, navyG, navyB);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('LAPORAN MUTASI KEUANGAN & ARUS KAS', pageWidth - marginX, 18.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Periode Mutasi : ${formatDateIndo(summary.startDate)} s/d ${formatDateIndo(summary.endDate)}`,
    pageWidth - marginX,
    23,
    { align: 'right' }
  );
  doc.text(`Waktu Cetak    : ${summary.printedAt}`, pageWidth - marginX, 27, { align: 'right' });

  // Horizontal Hairline Rule
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.line(marginX, 30.5, pageWidth - marginX, 30.5);

  // Summary Box (4 Formal Statement Boxes)
  const boxY = 33.5;
  const boxGap = 2.5;
  const boxW = (contentWidth - boxGap * 3) / 4;
  const boxH = 16.5;

  const summaryItems = [
    {
      label: 'TOTAL MODAL KELUAR (DEBET)',
      value: formatRupiah(summary.totalModalKeluar),
      sub: `${summary.purchaseCount} nota pembelian petani`,
      accent: [185, 28, 28] as const
    },
    {
      label: 'KAS MASUK LUNAS (KREDIT)',
      value: formatRupiah(summary.totalKasMasukLunas),
      sub: `${summary.paidSaleCount} faktur penjualan lunas`,
      accent: [4, 120, 87] as const
    },
    {
      label: 'PIUTANG GUDANG (BELUM CAIR)',
      value: formatRupiah(summary.totalPiutangGudang),
      sub: `${summary.unpaidSaleCount} faktur menunggu transfer`,
      accent: [180, 83, 9] as const
    },
    {
      label: 'LABA BERSIH TERWUJUD',
      value: formatSignedRupiah(summary.labaBersihTerwujud),
      sub: `Saldo Arus Kas: ${formatSignedRupiah(summary.saldoArusKasAkhir)}`,
      accent: [navyR, navyG, navyB] as const
    }
  ];

  summaryItems.forEach((item, idx) => {
    const x = marginX + idx * (boxW + boxGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, boxY, boxW, boxH, 1.2, 1.2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(71, 85, 105);
    doc.text(item.label, x + 2.5, boxY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(item.accent[0], item.accent[1], item.accent[2]);
    doc.text(item.value, x + 2.5, boxY + 10.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(item.sub, x + 2.5, boxY + 14.3, { maxWidth: boxW - 5 });
  });

  // Table Title
  const tableStartY = boxY + boxH + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('RINCIAN MUTASI TRANSAKSI KRONOLOGIS', marginX, tableStartY - 1.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Total ${summary.rows.length} mutasi tercatat (Mata Uang: IDR)`,
    pageWidth - marginX,
    tableStartY - 1.8,
    { align: 'right' }
  );

  const tableBody =
    summary.rows.length > 0
      ? summary.rows.map((r) => [
          r.tanggalWaktu,
          r.noReferensi,
          r.uraianTransaksi,
          formatCurrencyCell(r.debet),
          formatCurrencyCell(r.kredit),
          formatSignedNumeric(r.saldo)
        ])
      : [
          [
            '-',
            '-',
            'Tidak ada transaksi atau catatan mutasi pada rentang tanggal yang dipilih.',
            '-',
            '-',
            '0'
          ]
        ];

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: marginX, right: marginX, bottom: 18 },
    head: [
      [
        'Tanggal & Waktu',
        'No. Referensi / Nota',
        'Uraian Transaksi',
        'Debet / Keluar (Rp)',
        'Kredit / Masuk (Rp)',
        'Saldo Kas (Rp)'
      ]
    ],
    body: tableBody,
    foot: [
      [
        '',
        '',
        'TOTAL MUTASI PERIODE INI',
        formatCurrencyCell(summary.totalModalKeluar),
        formatCurrencyCell(summary.totalKasMasukLunas),
        formatSignedNumeric(summary.saldoArusKasAkhir)
      ]
    ],
    showFoot: 'lastPage',
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.2,
      cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      valign: 'top'
    },
    headStyles: {
      fillColor: [navyR, navyG, navyB],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
      halign: 'left',
      valign: 'middle'
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.5
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    columnStyles: {
      0: { cellWidth: 24, font: 'courier', fontSize: 6.9 },
      1: { cellWidth: 26, font: 'courier', fontSize: 6.9 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 25, halign: 'right', font: 'courier', fontSize: 7.2 },
      4: { cellWidth: 25, halign: 'right', font: 'courier', fontSize: 7.2 },
      5: { cellWidth: 25, halign: 'right', font: 'courier', fontSize: 7.2 }
    },
    didParseCell: (data) => {
      if (data.section === 'head' && data.column.index >= 3) {
        data.cell.styles.halign = 'right';
      }
      if (data.section === 'foot' && data.column.index >= 3) {
        data.cell.styles.halign = 'right';
      }
      if (data.section === 'body') {
        const rowObj = summary.rows[data.row.index];
        if (rowObj) {
          if (data.column.index === 3 && rowObj.debet > 0) {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = 'bold';
          }
          if (data.column.index === 4 && rowObj.kredit > 0) {
            data.cell.styles.textColor = [4, 120, 87];
            data.cell.styles.fontStyle = 'bold';
          }
          if (data.column.index === 5) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = rowObj.saldo < 0 ? [185, 28, 28] : [15, 23, 42];
          }
        }
      }
    },
    didDrawPage: () => {
      const currentPage = doc.getNumberOfPages();
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.25);
      doc.line(marginX, pageHeight - 13, pageWidth - marginX, pageHeight - 13);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        'Dokumen mutasi keuangan resmi Lapak Pisang Sumber Sewu · Catatan susut & reject tidak memotong kas secara ganda.',
        marginX,
        pageHeight - 8.5
      );
      doc.text(
        `Halaman ${currentPage}`,
        pageWidth - marginX,
        pageHeight - 8.5,
        { align: 'right' }
      );
    }
  });

  doc.save(buildFileName(summary.startDate, summary.endDate, 'pdf'));
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n\r;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportFinancialStatementCSV(summary: FinancialStatementSummary): void {
  const lines: string[] = [];
  const row = (cells: (string | number)[]) => lines.push(cells.map(escapeCsvCell).join(','));

  row(['LAPAK PISANG SUMBER SEWU']);
  row(['Toko Sumber Sewu | WhatsApp: 0822-8118-5001']);
  row(['LAPORAN MUTASI KEUANGAN & ARUS KAS']);
  row(['Periode', `${formatDateIndo(summary.startDate)} s/d ${formatDateIndo(summary.endDate)}`]);
  row(['Waktu Cetak', summary.printedAt]);
  lines.push('');

  row(['RINGKASAN MUTASI PERIODE']);
  row(['Total Modal Keluar (Pembelian Petani)', summary.totalModalKeluar]);
  row(['Total Kas Masuk Lunas (Penjualan Gudang)', summary.totalKasMasukLunas]);
  row(['Total Piutang Gudang (Belum Cair)', summary.totalPiutangGudang]);
  row(['Beban Susut / Selisih Timbang', summary.totalShrinkageLoss]);
  row(['Beban Stok Reject', summary.totalRejectLoss]);
  row(['Laba Bersih Terwujud', summary.labaBersihTerwujud]);
  row(['Saldo Arus Kas Akhir (Kredit - Debet)', summary.saldoArusKasAkhir]);
  lines.push('');

  row([
    'Tanggal & Waktu',
    'No. Referensi / Nota',
    'Jenis Mutasi',
    'Uraian Transaksi',
    'Debet / Keluar (Rp)',
    'Kredit / Masuk (Rp)',
    'Saldo Kas (Rp)'
  ]);

  summary.rows.forEach((r) => {
    row([
      r.tanggalWaktu,
      r.noReferensi,
      r.jenisMutasi,
      r.uraianTransaksi,
      r.debet,
      r.kredit,
      r.saldo
    ]);
  });

  row([
    '',
    '',
    'TOTAL',
    'TOTAL MUTASI PERIODE INI',
    summary.totalModalKeluar,
    summary.totalKasMasukLunas,
    summary.saldoArusKasAkhir
  ]);

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', buildFileName(summary.startDate, summary.endDate, 'csv'));
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
