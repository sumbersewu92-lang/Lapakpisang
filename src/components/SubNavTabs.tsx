import React from 'react';
import { Scale, Truck, PieChart, Users } from 'lucide-react';

export type ActiveTab = 'purchases' | 'stock-and-sales' | 'financial-report' | 'users';

interface SubNavTabsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  unpaidSalesCount?: number;
  canManageUsers?: boolean;
}

export const SubNavTabs: React.FC<SubNavTabsProps> = ({
  activeTab,
  onTabChange,
  unpaidSalesCount = 0,
  canManageUsers = false
}) => {
  return (
    <div className="hidden lg:block bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700 text-white border-b border-emerald-500/60 shadow-xs sticky top-16 sm:top-18 z-20">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="py-2 sm:py-2.5">
          <nav
            aria-label="Navigasi Menu Lapak"
            className="flex items-center gap-2.5"
          >
            {/* Tab 1: Pembelian Petani */}
            <button
              onClick={() => onTabChange('purchases')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm leading-tight font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'purchases'
                  ? 'bg-white text-emerald-950 shadow-md font-bold'
                  : 'text-white hover:text-white hover:bg-emerald-800/40'
              }`}
            >
              <Scale className={`w-4 h-4 shrink-0 ${activeTab === 'purchases' ? 'text-emerald-700' : 'text-emerald-200'}`} />
              <span>Pembelian Petani</span>
            </button>

            {/* Tab 2: Stok & Penjualan */}
            <div className="relative inline-flex">
              <button
                onClick={() => onTabChange('stock-and-sales')}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm leading-tight font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'stock-and-sales'
                    ? 'bg-white text-emerald-950 shadow-md font-bold'
                    : 'text-white hover:text-white hover:bg-emerald-800/40'
                }`}
              >
                <Truck className={`w-4 h-4 shrink-0 ${activeTab === 'stock-and-sales' ? 'text-emerald-700' : 'text-emerald-200'}`} />
                <span>Stok &amp; Penjualan</span>
              </button>

              {unpaidSalesCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 bg-amber-400 text-stone-950 font-extrabold text-[10px] font-mono rounded-full flex items-center justify-center border-2 border-emerald-800 shadow-sm animate-in zoom-in duration-150 pointer-events-none"
                  title={`${unpaidSalesCount} transaksi penjualan masih menunggu transfer (piutang)`}
                >
                  {unpaidSalesCount}
                </span>
              )}
            </div>

            {/* Tab 3: Laporan Keuangan */}
            <button
              onClick={() => onTabChange('financial-report')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm leading-tight font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'financial-report'
                  ? 'bg-white text-emerald-950 shadow-md font-bold'
                  : 'text-white hover:text-white hover:bg-emerald-800/40'
              }`}
            >
              <PieChart className={`w-4 h-4 shrink-0 ${activeTab === 'financial-report' ? 'text-emerald-700' : 'text-emerald-200'}`} />
              <span>Laporan Keuangan</span>
            </button>

            {/* Tab 4: Kelola Pengguna (Owner / Superadmin only) */}
            {canManageUsers && (
              <button
                onClick={() => onTabChange('users')}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm leading-tight font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-white text-emerald-950 shadow-md font-bold'
                    : 'text-white hover:text-white hover:bg-emerald-800/40'
                }`}
              >
                <Users className={`w-4 h-4 shrink-0 ${activeTab === 'users' ? 'text-emerald-700' : 'text-emerald-200'}`} />
                <span>Kelola Pengguna</span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
};
