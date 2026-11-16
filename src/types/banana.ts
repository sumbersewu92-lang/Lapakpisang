export interface PurchaseItem {
  bananaType: string;
  bunches: number;
  weightKg: number;
  buyPricePerKg: number;
  subtotalPayment: number;
}

export interface FarmerPurchase {
  id: string;
  receiptNumber: string;
  farmerName: string;
  bananaType: string; // Ringkasan varietas (misal: "Pisang Rames" atau "Pisang Rames + 1 jenis lainnya")
  items?: PurchaseItem[]; // Rincian multi-item dalam satu nota
  bunches: number; // Jumlah total tandan
  weightKg: number; // Total berat kg
  buyPricePerKg: number; // Rata-rata harga beli per kg
  totalPayment: number; // Total pembayaran
  date: string; // ISO string
  notes?: string;
  createdById?: string;
  createdByName?: string;
}

export interface SaleItem {
  bananaType: string;
  weightKg: number;
  bunches?: number;
  sellPricePerKg: number;
  costPricePerKg: number;
  subtotalRevenue: number;
  subtotalCost: number;
  subtotalProfit: number;
}

export interface CentralWarehouseSale {
  id: string;
  invoiceNumber: string;
  buyerWarehouseName: string; // Nama Pembeli / Gudang Tujuan
  buyerWhatsApp?: string; // No WhatsApp Pembeli (Opsional)
  buyerPhone?: string; // Telepon / No WA
  bananaType: string; // Primary type or summary description
  items?: SaleItem[]; // Multi-item breakdown
  weightKg: number; // Total weight
  bunches?: number; // Total bunches
  sellPricePerKg: number; // Average sell price
  totalRevenue: number; // Sum of items subtotalRevenue
  estimatedCost: number; // Sum of items subtotalCost
  netProfit: number; // totalRevenue - estimatedCost
  profitMarginPercent: number; // (netProfit / totalRevenue) * 100
  date: string;
  notes?: string;
  paymentStatus: 'LUNAS' | 'BELUM_LUNAS'; // Status Pembayaran
  paymentMethod?: 'Transfer Bank' | 'Tunai Langsung' | 'Transfer Susulan (Piutang)';
  dueDate?: string; // Tanggal Janji Bayar / Jatuh Tempo jika belum lunas
  paidAt?: string; // Tanggal pelunasan
  createdById?: string;
  createdByName?: string;
}

export interface BananaStockSummary {
  bananaType: string;
  stockKg: number;
  bunches: number;
  totalCostInvested: number;
  avgBuyPricePerKg: number;
  recommendedSellPrice: number;
  lastUpdated: string;
  hasPurchases?: boolean;
  totalPurchasedKg?: number;
}

export interface BananaRejectRecord {
  id: string;
  referenceNumber: string; // e.g., RJ-20261113-123
  bananaType: string;
  weightKg: number;
  bunches: number;
  costPricePerKg: number; // Harga beli rata-rata stok saat reject dicatat
  totalLossAmount: number; // weightKg * costPricePerKg
  reason: string;
  notes?: string;
  date: string; // ISO string
}

export interface BananaShrinkageRecord {
  id: string;
  referenceNumber: string; // e.g., SS-20261113-123
  bananaType: string;
  weightKg: number; // Berat susut / selisih timbang (kg)
  bunches: number; // Tandan yang disesuaikan (bisa 0 jika hanya susut berat)
  costPricePerKg: number; // Harga beli rata-rata stok saat koreksi dicatat
  totalLossAmount: number; // weightKg * costPricePerKg
  reason: string;
  notes?: string;
  date: string; // ISO string
}

export type UserRole = 'owner' | 'kasir';

export interface AppUserRecord {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  passwordHash: string;
  salt: string;
  isActive: boolean;
  createdById?: string;
  createdAtDate: string;
}

export interface UserSession {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  roleLabel: string;
  storeName: string;
  avatarUrl?: string;
  isLoggedIn: boolean;
}
