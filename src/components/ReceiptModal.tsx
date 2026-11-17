import React, { useState, useRef, useEffect } from 'react';
import { X, Printer, Copy, Check } from 'lucide-react';
import { BananaPurchase, WarehouseSale } from '../types/banana';
import {
  STORE_NAME,
  STORE_SUBTITLE,
  STORE_ADDRESS,
  STORE_WHATSAPP,
  STORE_WHATSAPP_COMPACT,
  formatRupiah,
  formatNumber,
  formatDateTimeIndo,
  formatDateIndo,
  formatPaymentMethodLabel
} from '../data/initialData';
import { captureScrollState } from '../utils/scrollPreservation';

interface ReceiptModalProps {
  type: 'purchase' | 'sale';
  purchaseData?: BananaPurchase | null;
  saleData?: WarehouseSale | null;
  officerName?: string;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  type,
  purchaseData,
  saleData,
  officerName,
  onClose
}) => {
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>('58mm');
  const [isCopied, setIsCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  if (type === 'purchase' && !purchaseData) return null;
  if (type === 'sale' && !saleData) return null;

  const receiptNumber =
    type === 'purchase' ? purchaseData?.receiptNumber : saleData?.invoiceNumber;

  const dateStr =
    (type === 'purchase' ? purchaseData?.date : saleData?.date) || '';

  const partyName =
    type === 'purchase' ? purchaseData?.farmerName : saleData?.buyerWarehouseName;

  const resolvedOfficerName =
    (type === 'purchase'
      ? purchaseData?.createdByName
      : saleData?.createdByName
    )?.trim() ||
    officerName?.trim() ||
    'Petugas Gudang';

  const purchaseItems =
    type === 'purchase' && purchaseData
      ? purchaseData.items && purchaseData.items.length > 0
        ? purchaseData.items
        : [
            {
              id: '1',
              bananaType: purchaseData.bananaType,
              bunches: purchaseData.bunches,
              weightKg: purchaseData.weightKg,
              buyPricePerKg: purchaseData.buyPricePerKg,
              subtotalPayment: purchaseData.totalPayment
            }
          ]
      : [];

  const saleItems =
    type === 'sale' && saleData
      ? saleData.items && saleData.items.length > 0
        ? saleData.items
        : [
            {
              bananaType: saleData.bananaType,
              weightKg: saleData.weightKg,
              bunches: saleData.bunches ?? 0,
              sellPricePerKg: saleData.sellPricePerKg,
              costPricePerKg: 0,
              subtotalRevenue: saleData.totalRevenue,
              subtotalCost: saleData.estimatedCost,
              subtotalProfit: saleData.netProfit
            }
          ]
      : [];

  const handlePrint = () => {
    window.print();
  };

  const triggerCopiedFeedback = () => {
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }
    setIsCopied(true);
    copyTimerRef.current = window.setTimeout(() => {
      setIsCopied(false);
      copyTimerRef.current = null;
    }, 2000);
  };

  const handleCopyTextWA = () => {
    let text = '';
    if (type === 'purchase' && purchaseData) {
      const itemsText = purchaseItems
        .map(
          (it) =>
            `🍌 ${it.bananaType} : ${formatRupiah(it.subtotalPayment)}\n   ${formatNumber(it.weightKg)} kg × ${formatRupiah(it.buyPricePerKg)}${it.bunches > 0 ? ` (${formatNumber(it.bunches)} tdn)` : ''}`
        )
        .join('\n');

      text = `*🍌 ${STORE_NAME.toUpperCase()} - NOTA TIMBANGAN*
${STORE_SUBTITLE}
${STORE_ADDRESS} · WA: ${STORE_WHATSAPP}
----------------------------------------
*STRUK TIMBANGAN PETANI*
Reff/SN   : ${purchaseData.receiptNumber}
Waktu     : ${formatDateTimeIndo(purchaseData.date)}
Petani    : ${purchaseData.farmerName}
Petugas   : ${resolvedOfficerName}
Layanan   : Penerimaan Timbangan
----------------------------------------
${itemsText}
----------------------------------------
*TOTAL DIBAYAR : ${formatRupiah(purchaseData.totalPayment)}*
Status         : BERHASIL / SUKSES
${purchaseData.notes ? `Catatan        : ${purchaseData.notes}\n` : ''}----------------------------------------
* Simpan struk ini sebagai bukti pembayaran sah *
*** TERIMA KASIH ***`;
    } else if (type === 'sale' && saleData) {
      const saleItemsText = saleItems
        .map(
          (it) =>
            `🍌 ${it.bananaType} : ${formatRupiah(it.subtotalRevenue)}\n   ${formatNumber(it.weightKg)} kg × ${formatRupiah(it.sellPricePerKg)}/kg${(it.bunches ?? 0) > 0 ? ` (${formatNumber(it.bunches ?? 0)} tandan)` : ''}`
        )
        .join('\n');

      text = `*🍌 ${STORE_NAME.toUpperCase()} - FAKTUR PENJUALAN*
${STORE_SUBTITLE}
${STORE_ADDRESS} · WA: ${STORE_WHATSAPP}
----------------------------------------
*FAKTUR PENJUALAN GUDANG PUSAT*
Reff/SN   : ${saleData.invoiceNumber}
Waktu     : ${formatDateTimeIndo(saleData.date)}
Pembeli   : ${saleData.buyerWarehouseName}${saleData.buyerWhatsApp ? `\nNo WA     : ${saleData.buyerWhatsApp}` : ''}
Petugas   : ${resolvedOfficerName}
Layanan   : Pengiriman Gudang Pusat
----------------------------------------
${saleItemsText}
----------------------------------------
*TOTAL TAGIHAN : ${formatRupiah(saleData.totalRevenue)}*
Status         : ${
        saleData.paymentStatus === 'BELUM_LUNAS'
          ? `TRANSFER SUSULAN (PIUTANG)${saleData.dueDate ? ` · Tempo: ${formatDateIndo(saleData.dueDate)}` : ''}`
          : `BERHASIL / LUNAS (${formatPaymentMethodLabel('LUNAS', saleData.paymentMethod).toUpperCase()})`
      }
${saleData.notes ? `Catatan        : ${saleData.notes}\n` : ''}----------------------------------------
* Simpan struk ini sebagai bukti penjualan sah *
*** TERIMA KASIH ***`;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          triggerCopiedFeedback();
        })
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text: string) => {
    const restore = captureScrollState();
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.top = '0';
      el.style.left = '0';
      el.style.width = '1px';
      el.style.height = '1px';
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      document.body.appendChild(el);
      el.focus({ preventScroll: true });
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      triggerCopiedFeedback();
    } catch (e) {
      console.error('Failed to copy text', e);
    } finally {
      restore();
    }
  };

  return (
    <div
      className="receipt-print-root fixed inset-0 z-50 bg-stone-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Dynamic Thermal Print Media Styles */}
      <style>{`
        @page {
          size: ${paperSize} auto;
          margin: 2mm;
        }
        @media print {
          html,
          body,
          #root,
          #root > div {
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
            display: block !important;
          }
          #root > div > *:not(.receipt-print-root) {
            display: none !important;
          }
          body * {
            visibility: hidden !important;
          }
          .receipt-print-root,
          .receipt-print-dialog,
          .receipt-print-scroll {
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            max-height: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: transparent !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            display: block !important;
            animation: none !important;
            transition: none !important;
            transform: none !important;
          }
          #printable-thermal-receipt,
          #printable-thermal-receipt * {
            visibility: visible !important;
          }
          #printable-thermal-receipt {
            position: static !important;
            width: 100% !important;
            max-width: ${paperSize} !important;
            height: auto !important;
            margin: 0 !important;
            padding: 1mm 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            font-size: ${paperSize === '58mm' ? '9.5px' : '11px'} !important;
            line-height: 1.3 !important;
            text-align: left !important;
            animation: none !important;
            transition: none !important;
            transform: none !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            break-before: avoid !important;
            page-break-before: avoid !important;
            break-after: avoid !important;
            page-break-after: avoid !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #printable-thermal-receipt .border-dashed {
            border-bottom: 1px dashed #000000 !important;
          }
          #printable-thermal-receipt p,
          #printable-thermal-receipt span {
            color: #000000 !important;
          }
        }
      `}</style>

      {/* Main Modal Card Container */}
      <div className="receipt-print-dialog bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-150">
        {/* 1. Header Bar */}
        <div className="print:hidden flex-shrink-0 px-3.5 sm:px-5 py-3 sm:py-4 border-b border-stone-200 bg-white flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
              <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-stone-900 leading-tight truncate">
                Cetak Struk Thermal
              </h3>
              <p className="text-[11px] sm:text-xs text-stone-500 truncate">
                Pratinjau format cetak nota kasir
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="bg-stone-100 p-0.5 rounded-xl border border-stone-200 flex items-center">
              <button
                type="button"
                onClick={() => setPaperSize('58mm')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  paperSize === '58mm'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                58mm
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('80mm')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  paperSize === '80mm'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                80mm
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition cursor-pointer"
              title="Tutup dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Action Toolbar Bar */}
        <div className="print:hidden flex-shrink-0 px-3.5 sm:px-5 py-2.5 sm:py-3 bg-stone-50/80 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs">
          <div className="text-stone-500 font-medium">
            Kertas:{' '}
            <strong className="text-stone-900 font-semibold">
              {paperSize === '58mm' ? '58mm (Standar Konter)' : '80mm (Standar POS)'}
            </strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyTextWA}
              className="flex-1 sm:flex-initial justify-center px-3 sm:px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-xl font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer active:bg-stone-200 whitespace-nowrap"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-emerald-700 font-bold">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-stone-600 shrink-0" />
                  <span>Salin Teks (WA)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-initial justify-center px-3.5 sm:px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Cetak Sekarang</span>
            </button>
          </div>
        </div>

        {/* 3. Scrollable Receipt Preview Area */}
        <div className="receipt-print-scroll flex-1 overflow-y-auto p-3 sm:p-6 bg-stone-100 flex justify-center items-start min-h-[260px] sm:min-h-[360px]">
          <div
            id="printable-thermal-receipt"
            className={`bg-white rounded-lg shadow-md border border-stone-200 p-4 sm:p-5 font-mono text-stone-800 text-left space-y-3 transition-all duration-200 w-full ${
              paperSize === '58mm' ? 'max-w-[290px] text-[11px]' : 'max-w-[380px] text-xs'
            }`}
          >
            {/* Header */}
            <div className="text-center space-y-0.5">
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-stone-900 leading-tight">
                {STORE_NAME}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-stone-600">{STORE_SUBTITLE}</p>
              <p className="text-[10px] text-stone-500">{STORE_ADDRESS}</p>
              <p className="text-[10px] text-stone-600 font-semibold pt-0.5">
                WA: {STORE_WHATSAPP_COMPACT}
              </p>
            </div>

            <div className="border-b border-dashed border-stone-300" />

            {/* Title Banner */}
            <div className="bg-stone-50 py-1.5 px-2 rounded border border-stone-200 text-center">
              <span className="font-bold text-[10px] sm:text-[11px] text-stone-900 tracking-wider uppercase block">
                {type === 'purchase'
                  ? 'STRUK TIMBANGAN PETANI'
                  : 'FAKTUR PENJUALAN GUDANG PUSAT'}
              </span>
            </div>

            {/* Key-Value Transaction Info */}
            <div className="space-y-1 text-[10px] sm:text-[11px] text-left">
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-stone-500 shrink-0">Reff/SN:</span>
                <span className="font-bold text-stone-900 text-right">{receiptNumber}</span>
              </div>
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-stone-500 shrink-0">Waktu:</span>
                <span className="text-stone-800 text-right">{formatDateTimeIndo(dateStr)}</span>
              </div>
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-stone-500 shrink-0">
                  {type === 'purchase' ? 'Petani:' : 'Pembeli:'}
                </span>
                <div className="text-right min-w-0">
                  <span className="font-bold text-stone-900 block break-words max-w-[170px] sm:max-w-[220px] print:max-w-none">
                    {partyName}
                  </span>
                  {type === 'sale' && saleData?.buyerWhatsApp && (
                    <span className="text-[9.5px] text-stone-500 font-mono block">
                      WA: {saleData.buyerWhatsApp}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-stone-500 shrink-0">Petugas:</span>
                <span className="text-stone-800 text-right break-words min-w-0">
                  {resolvedOfficerName}
                </span>
              </div>
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-stone-500 shrink-0">Layanan:</span>
                <span className="text-stone-800 text-right font-medium">
                  {type === 'purchase' ? 'Penerimaan Timbangan' : 'Pengiriman Gudang Pusat'}
                </span>
              </div>
            </div>

            <div className="border-b border-dashed border-stone-300" />

            {/* Commodity & Weight Details */}
            <div className="space-y-2 text-[10px] sm:text-[11px] text-left">
              {type === 'purchase' &&
                purchaseItems.map((it, idx) => (
                  <div key={`${it.id || it.bananaType}-${idx}`} className="space-y-0.5">
                    <div className="flex justify-between items-start gap-2 font-semibold text-stone-900">
                      <span>🍌 {it.bananaType}</span>
                      <span className="tabular-nums shrink-0">{formatRupiah(it.subtotalPayment)}</span>
                    </div>
                    <div className="text-stone-600 text-[10px] tabular-nums">
                      {formatNumber(it.weightKg)} kg × {formatRupiah(it.buyPricePerKg)}
                      {it.bunches > 0 ? ` (${formatNumber(it.bunches)} tdn)` : ''}
                    </div>
                  </div>
                ))}

              {type === 'sale' &&
                saleData &&
                saleItems.map((it, idx) => (
                  <div key={`${it.bananaType}-${idx}`} className="space-y-0.5">
                    <div className="flex justify-between items-start gap-2 font-semibold text-stone-900">
                      <span>🍌 {it.bananaType}</span>
                      <span className="tabular-nums shrink-0">{formatRupiah(it.subtotalRevenue)}</span>
                    </div>
                    <div className="text-stone-600 text-[10px] tabular-nums">
                      {formatNumber(it.weightKg)} kg × {formatRupiah(it.sellPricePerKg)}/kg
                      {(it.bunches ?? 0) > 0 ? ` (${formatNumber(it.bunches ?? 0)} tdn)` : ''}
                    </div>
                  </div>
                ))}
            </div>

            <div className="border-b border-dashed border-stone-300" />

            {/* Total Highlight */}
            <div className="space-y-1 text-left">
              <div className="flex justify-between items-baseline gap-2 font-bold text-stone-900 text-[11px] sm:text-xs">
                <span>{type === 'purchase' ? 'TOTAL DIBAYAR' : 'TOTAL TAGIHAN'}</span>
                <span className="text-sm sm:text-base font-black tabular-nums text-right shrink-0">
                  {formatRupiah(
                    type === 'purchase'
                      ? purchaseData?.totalPayment || 0
                      : saleData?.totalRevenue || 0
                  )}
                </span>
              </div>

              {type === 'sale' && saleData?.dueDate && saleData.paymentStatus === 'BELUM_LUNAS' && (
                <div className="flex justify-between items-center gap-2 text-[10px] text-amber-900 pt-0.5">
                  <span className="text-stone-500">Jatuh Tempo:</span>
                  <span className="font-bold text-right">{formatDateIndo(saleData.dueDate)}</span>
                </div>
              )}

              {((type === 'purchase' && purchaseData?.notes) ||
                (type === 'sale' && saleData?.notes)) && (
                <div className="pt-1 text-[10px] text-stone-500 italic text-left break-words">
                  Catatan:{' '}
                  {type === 'purchase' ? purchaseData?.notes : saleData?.notes}
                </div>
              )}
            </div>

            <div className="border-b border-dashed border-stone-300" />

            {/* Status Box */}
            <div
              className={`py-1.5 px-2 rounded text-center border ${
                type === 'sale' && saleData?.paymentStatus === 'BELUM_LUNAS'
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-emerald-50 border-emerald-300'
              }`}
            >
              <span
                className={`font-bold text-[10px] sm:text-[11px] tracking-wide uppercase block ${
                  type === 'sale' && saleData?.paymentStatus === 'BELUM_LUNAS'
                    ? 'text-amber-900'
                    : 'text-emerald-800'
                }`}
              >
                {type === 'purchase'
                  ? 'STATUS: BERHASIL / SUKSES'
                  : saleData?.paymentStatus === 'BELUM_LUNAS'
                  ? 'STATUS: TRANSFER SUSULAN (PIUTANG)'
                  : 'STATUS: BERHASIL / LUNAS'}
              </span>
            </div>

            {/* Footer Notes */}
            <div className="text-center text-[9px] sm:text-[10px] text-stone-500 space-y-0.5 pt-1 leading-tight">
              <p>* Simpan struk ini sebagai bukti transaksi sah *</p>
              <p>{STORE_NAME} · {STORE_ADDRESS}</p>
            </div>
          </div>
        </div>

        {/* 4. Footer */}
        <div className="print:hidden flex-shrink-0 px-3.5 sm:px-5 py-2.5 sm:py-3 bg-white border-t border-stone-200 flex items-center justify-between gap-2 text-xs text-stone-500">
          <span className="text-[11px]">Format thermal printer {paperSize}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
