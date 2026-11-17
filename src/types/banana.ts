export interface PurchaseItem {
  id?: string;
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
  bananaType: string;
  items?: PurchaseItem[];
  bunches: number;
  weightKg: number;
  buyPricePerKg: number;
  totalPayment: number;
  date: string;
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
  buyerWarehouseName: string;
  buyerWhatsApp?: string;
  buyerPhone?: string;
  bananaType: string;
  items?: SaleItem[];
  weightKg: number;
  bunches?: number;
  sellPricePerKg: number;
  totalRevenue: number;
  estimatedCost: number;
  netProfit: number;
  profitMarginPercent: number;
  date: string;
  notes?: string;
  paymentStatus: 'LUNAS' | 'BELUM_LUNAS';
  paymentMethod?: 'Transfer Bank' | 'Tunai Langsung' | 'Transfer Susulan (Piutang)';
  dueDate?: string;
  paidAt?: string;
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
  referenceNumber: string;
  bananaType: string;
  weightKg: number;
  bunches: number;
  costPricePerKg: number;
  totalLossAmount: number;
  reason: string;
  notes?: string;
  date: string;
}

export interface BananaShrinkageRecord {
  id: string;
  referenceNumber: string;
  bananaType: string;
  weightKg: number;
  bunches: number;
  costPricePerKg: number;
  totalLossAmount: number;
  reason: string;
  notes?: string;
  date: string;
}

// Compatibility aliases
export type BananaPurchaseItem = PurchaseItem;
export type BananaPurchase = FarmerPurchase;
export type WarehouseSale = CentralWarehouseSale;

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
