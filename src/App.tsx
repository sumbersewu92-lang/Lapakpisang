import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { Loader2, AlertTriangle } from 'lucide-react';
import { LoginPage } from './components/LoginPage';
import { Navbar } from './components/Navbar';
import { StatCards } from './components/StatCards';
import { TabPurchase } from './components/TabPurchase';
import { TabStockAndSales } from './components/TabStockAndSales';
import { TabFinancialReport } from './components/TabFinancialReport';
import { TabUsers } from './components/TabUsers';
import { SubNavTabs, ActiveTab } from './components/SubNavTabs';
import { ReceiptModal } from './components/ReceiptModal';
import {
  FarmerPurchase,
  PurchaseItem,
  CentralWarehouseSale,
  SaleItem,
  BananaStockSummary,
  BananaRejectRecord,
  BananaShrinkageRecord,
  AppUserRecord,
  UserRole,
  UserSession
} from './types/banana';
import {
  MAIN_BANANA_TYPES,
  TYPICAL_SELL_PRICES,
  normalizeVarietyName,
  toLocalDateCode
} from './data/initialData';
import {
  db,
  OperationType,
  handleFirestoreError,
  logFirestoreError,
  clampStr,
  stripUndefined,
  ensureSeededUsersAndWorkspace,
  formatRoleLabel,
  generateSalt,
  hashPassword
} from './firebase';
import { captureScrollState, runPreservingScroll, blurActiveTrigger } from './utils/scrollPreservation';

const SESSION_STORAGE_KEY = 'lapak_active_user_id';
const LAPAK_ID = 'main';

function safeStorageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota/privacy restrictions
  }
}

function safeStorageRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage privacy restrictions
  }
}

function makeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${Date.now()}-${rand}`;
}

export default function App() {
  // 1. Session & Initialization State
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [dbError, setDbError] = useState<string>('');

  // 2. Active Tab State
  const [activeTab, setActiveTab] = useState<ActiveTab>('purchases');

  // 3. Real-time Firestore Data State (Zero dummy data)
  const [purchases, setPurchases] = useState<FarmerPurchase[]>([]);
  const [sales, setSales] = useState<CentralWarehouseSale[]>([]);
  const [rejects, setRejects] = useState<BananaRejectRecord[]>([]);
  const [shrinkages, setShrinkages] = useState<BananaShrinkageRecord[]>([]);
  const [appUsers, setAppUsers] = useState<AppUserRecord[]>([]);
  const [userNamesById, setUserNamesById] = useState<Record<string, string>>({});

  // 4. Receipt / Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'purchase' | 'sale';
    purchaseData?: FarmerPurchase | null;
    saleData?: CentralWarehouseSale | null;
  }>({
    isOpen: false,
    type: 'purchase'
  });

  // Bootstrap default workspace + default users (252500 & 252501) and verify saved session
  useEffect(() => {
    let isCancelled = false;

    const initApp = async () => {
      try {
        await ensureSeededUsersAndWorkspace();

        const savedUserId = safeStorageGet(SESSION_STORAGE_KEY);
        if (savedUserId && /^[a-zA-Z0-9_-]+$/.test(savedUserId)) {
          const userSnap = await getDoc(doc(db, 'app_users', savedUserId));
          if (userSnap.exists()) {
            const u = userSnap.data() as AppUserRecord;
            if (u.isActive && !isCancelled) {
              setUserSession({
                id: u.id,
                username: u.username,
                fullName: u.fullName,
                role: u.role,
                roleLabel: formatRoleLabel(u.role),
                storeName: 'Lapak Pisang Sumber Sewu',
                isLoggedIn: true
              });
            } else {
              safeStorageRemove(SESSION_STORAGE_KEY);
            }
          } else {
            safeStorageRemove(SESSION_STORAGE_KEY);
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
        if (!isCancelled) {
          setDbError('Gagal terhubung ke database Lapak Pisang Sumber Sewu. Periksa koneksi internet Anda.');
        }
      } finally {
        if (!isCancelled) {
          setSessionReady(true);
        }
      }
    };

    initApp();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Attach real-time Firestore listeners once authenticated as an active user
  useEffect(() => {
    if (!sessionReady || !userSession) {
      return;
    }

    const sortByDateDesc = <T extends { date: string }>(list: T[]): T[] =>
      [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const purchasesPath = `lapak/${LAPAK_ID}/purchases`;
    const purchasesQ = query(
      collection(db, 'lapak', LAPAK_ID, 'purchases'),
      where('lapakId', '==', LAPAK_ID)
    );
    const unsubPurchases = onSnapshot(
      purchasesQ,
      (snapshot) => {
        const list = snapshot.docs.map((d) => d.data() as FarmerPurchase);
        const restore = captureScrollState();
        setPurchases(sortByDateDesc(list));
        restore();
      },
      (error) => {
        setDbError('Gagal memuat data pembelian dari database.');
        logFirestoreError(error, OperationType.LIST, purchasesPath);
      }
    );

    const salesPath = `lapak/${LAPAK_ID}/sales`;
    const salesQ = query(
      collection(db, 'lapak', LAPAK_ID, 'sales'),
      where('lapakId', '==', LAPAK_ID)
    );
    const unsubSales = onSnapshot(
      salesQ,
      (snapshot) => {
        const list = snapshot.docs.map((d) => d.data() as CentralWarehouseSale);
        const restore = captureScrollState();
        setSales(sortByDateDesc(list));
        restore();
      },
      (error) => {
        setDbError('Gagal memuat data penjualan dari database.');
        logFirestoreError(error, OperationType.LIST, salesPath);
      }
    );

    const rejectsPath = `lapak/${LAPAK_ID}/rejects`;
    const rejectsQ = query(
      collection(db, 'lapak', LAPAK_ID, 'rejects'),
      where('lapakId', '==', LAPAK_ID)
    );
    const unsubRejects = onSnapshot(
      rejectsQ,
      (snapshot) => {
        const list = snapshot.docs.map((d) => d.data() as BananaRejectRecord);
        const restore = captureScrollState();
        setRejects(sortByDateDesc(list));
        restore();
      },
      (error) => {
        setDbError('Gagal memuat data stok reject dari database.');
        logFirestoreError(error, OperationType.LIST, rejectsPath);
      }
    );

    const shrinkagesPath = `lapak/${LAPAK_ID}/shrinkages`;
    const shrinkagesQ = query(
      collection(db, 'lapak', LAPAK_ID, 'shrinkages'),
      where('lapakId', '==', LAPAK_ID)
    );
    const unsubShrinkages = onSnapshot(
      shrinkagesQ,
      (snapshot) => {
        const list = snapshot.docs.map((d) => d.data() as BananaShrinkageRecord);
        const restore = captureScrollState();
        setShrinkages(sortByDateDesc(list));
        restore();
      },
      (error) => {
        setDbError('Gagal memuat data susut timbang dari database.');
        logFirestoreError(error, OperationType.LIST, shrinkagesPath);
      }
    );

    // Watch current user document so session updates or deactivation reflect immediately
    const selfUserUnsub = onSnapshot(
      doc(db, 'app_users', userSession.id),
      (snap) => {
        if (!snap.exists()) {
          safeStorageRemove(SESSION_STORAGE_KEY);
          setUserSession(null);
          return;
        }
        const u = snap.data() as AppUserRecord;
        if (!u.isActive) {
          safeStorageRemove(SESSION_STORAGE_KEY);
          setUserSession(null);
          return;
        }
        setUserSession((prev) => {
          if (!prev) return prev;
          if (
            prev.fullName === u.fullName &&
            prev.role === u.role &&
            prev.roleLabel === formatRoleLabel(u.role)
          ) {
            return prev;
          }
          return {
            ...prev,
            fullName: u.fullName,
            role: u.role,
            roleLabel: formatRoleLabel(u.role)
          };
        });
      },
      (error) => {
        logFirestoreError(error, OperationType.GET, `app_users/${userSession.id}`);
      }
    );

    const usersPath = 'app_users';
    const usersQ = query(collection(db, 'app_users'), where('role', 'in', ['owner', 'kasir']));
    const unsubUsers = onSnapshot(
      usersQ,
      (snapshot) => {
        const list = snapshot.docs.map((d) => d.data() as AppUserRecord);
        const nameLookup: Record<string, string> = {};
        list.forEach((u) => {
          if (u.id && u.fullName) {
            nameLookup[u.id] = u.fullName;
          }
        });
        const restore = captureScrollState();
        setUserNamesById(nameLookup);
        if (userSession.role === 'owner') {
          list.sort((a, b) => a.id.localeCompare(b.id));
          setAppUsers(list);
        } else {
          setAppUsers([]);
        }
        restore();
      },
      (error) => {
        if (userSession.role === 'owner') {
          setDbError('Gagal memuat daftar pengguna dari database.');
        }
        logFirestoreError(error, OperationType.LIST, usersPath);
      }
    );

    return () => {
      unsubPurchases();
      unsubSales();
      unsubRejects();
      unsubShrinkages();
      selfUserUnsub();
      unsubUsers();
    };
  }, [sessionReady, userSession?.id, userSession?.role]);

  // Redirect away from Kelola Pengguna if non-owner role
  useEffect(() => {
    if (userSession && userSession.role !== 'owner' && activeTab === 'users') {
      setActiveTab('purchases');
    }
  }, [userSession, activeTab]);

  // Helper to ensure numbers are cleanly parsed without NaN or string concatenation
  const safeNum = (val: unknown): number => {
    if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
    if (val === null || val === undefined || val === '') return 0;
    const raw = String(val).trim();
    const normalized =
      raw.includes(',') && !raw.includes('.') ? raw.replace(',', '.') : raw;
    const parsed = parseFloat(normalized.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const roundWeight = (val: number): number => Math.round(val * 100) / 100;

  // Normalize multi-item or single-item purchase entries cleanly without dropping any variety
  const extractPurchaseItems = (p: FarmerPurchase): PurchaseItem[] => {
    let rawItems: unknown[] = [];
    if (Array.isArray(p.items)) {
      rawItems = p.items;
    } else if (p.items && typeof p.items === 'object') {
      rawItems = Object.values(p.items as Record<string, unknown>);
    }

    const parsedItems: PurchaseItem[] = rawItems
      .filter((it): it is Record<string, unknown> => Boolean(it && typeof it === 'object'))
      .map((it) => {
        const bananaType = normalizeVarietyName(String(it.bananaType || ''));
        const weightKg = safeNum(it.weightKg);
        const bunches = Math.max(0, Math.trunc(safeNum(it.bunches)));
        const buyPricePerKg = safeNum(it.buyPricePerKg);
        const subtotalPayment =
          safeNum(it.subtotalPayment) || Math.round(weightKg * buyPricePerKg);
        return {
          bananaType,
          bunches,
          weightKg,
          buyPricePerKg,
          subtotalPayment
        };
      })
      .filter((it) => it.bananaType.length > 0 && it.weightKg > 0);

    if (parsedItems.length > 0) {
      return parsedItems;
    }

    const fallbackType = normalizeVarietyName(p.bananaType);
    const fallbackWeight = safeNum(p.weightKg);
    if (!fallbackType || fallbackWeight <= 0) {
      return [];
    }

    const fallbackBunches = Math.max(0, Math.trunc(safeNum(p.bunches)));
    const fallbackPrice = safeNum(p.buyPricePerKg);
    const fallbackTotal =
      safeNum(p.totalPayment) || Math.round(fallbackWeight * fallbackPrice);

    return [
      {
        bananaType: fallbackType,
        bunches: fallbackBunches,
        weightKg: fallbackWeight,
        buyPricePerKg:
          fallbackPrice > 0
            ? fallbackPrice
            : fallbackWeight > 0
            ? Math.round(fallbackTotal / fallbackWeight)
            : 0,
        subtotalPayment: fallbackTotal
      }
    ];
  };

  // Normalize multi-item or single-item sale entries cleanly
  const extractSaleItems = (s: CentralWarehouseSale): SaleItem[] => {
    let rawItems: unknown[] = [];
    if (Array.isArray(s.items)) {
      rawItems = s.items;
    } else if (s.items && typeof s.items === 'object') {
      rawItems = Object.values(s.items as Record<string, unknown>);
    }

    const parsedItems: SaleItem[] = rawItems
      .filter((it): it is Record<string, unknown> => Boolean(it && typeof it === 'object'))
      .map((it) => {
        const bananaType = normalizeVarietyName(String(it.bananaType || ''));
        const weightKg = safeNum(it.weightKg);
        const bunches =
          it.bunches !== undefined ? Math.max(0, Math.trunc(safeNum(it.bunches))) : 0;
        const sellPricePerKg = safeNum(it.sellPricePerKg);
        const costPricePerKg = safeNum(it.costPricePerKg);
        const subtotalRevenue =
          safeNum(it.subtotalRevenue) || Math.round(weightKg * sellPricePerKg);
        const subtotalCost =
          safeNum(it.subtotalCost) || Math.round(weightKg * costPricePerKg);
        const subtotalProfit =
          it.subtotalProfit !== undefined
            ? safeNum(it.subtotalProfit)
            : subtotalRevenue - subtotalCost;
        return {
          bananaType,
          weightKg,
          bunches,
          sellPricePerKg,
          costPricePerKg,
          subtotalRevenue,
          subtotalCost,
          subtotalProfit
        };
      })
      .filter((it) => it.bananaType.length > 0 && it.weightKg > 0);

    if (parsedItems.length > 0) {
      return parsedItems;
    }

    const fallbackType = normalizeVarietyName(s.bananaType);
    const fallbackWeight = safeNum(s.weightKg);
    if (!fallbackType || fallbackWeight <= 0) {
      return [];
    }

    return [
      {
        bananaType: fallbackType,
        weightKg: fallbackWeight,
        bunches: s.bunches !== undefined ? Math.max(0, Math.trunc(safeNum(s.bunches))) : 0,
        sellPricePerKg: safeNum(s.sellPricePerKg),
        costPricePerKg: 0,
        subtotalRevenue: safeNum(s.totalRevenue),
        subtotalCost: safeNum(s.estimatedCost),
        subtotalProfit: safeNum(s.netProfit)
      }
    ];
  };

  // Dynamic stock calculations based on chronological ledger:
  // Purchases add to active stock and weighted cost; sales, rejects, and shrinkages
  // deduct strictly from the active stock available at that point in time (never negative),
  // so historical shrinkage/reject logs never reduce newly arrived farmer batches or distort moving average.
  const stockList: BananaStockSummary[] = useMemo(() => {
    type TimelineEvent =
      | {
          kind: 'purchase';
          ts: number;
          order: number;
          weightKg: number;
          bunches: number;
          totalCost: number;
        }
      | {
          kind: 'sale' | 'shrinkage' | 'reject';
          ts: number;
          order: number;
          weightKg: number;
          bunches: number;
        };

    interface VarietyAccumulator {
      canonicalName: string;
      events: TimelineEvent[];
      purchasedKg: number;
    }

    const parseEventTime = (dateStr: string): number => {
      const parsed = new Date(dateStr).getTime();
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const varietyMap = new Map<string, VarietyAccumulator>();

    const ensureVarietyBucket = (rawName: string): VarietyAccumulator | null => {
      const canonical = normalizeVarietyName(rawName);
      if (!canonical) return null;
      const key = canonical.toLowerCase();
      let bucket = varietyMap.get(key);
      if (!bucket) {
        bucket = {
          canonicalName: canonical,
          events: [],
          purchasedKg: 0
        };
        varietyMap.set(key, bucket);
      }
      return bucket;
    };

    // Always preserve main varieties in canonical display order
    MAIN_BANANA_TYPES.forEach((mainType) => {
      ensureVarietyBucket(mainType);
    });

    // 1. Collect incoming purchase events per variety
    purchases.forEach((p) => {
      const ts = parseEventTime(p.date);
      const items = extractPurchaseItems(p);
      items.forEach((it) => {
        const bucket = ensureVarietyBucket(it.bananaType);
        if (!bucket) return;
        const unitPrice =
          it.buyPricePerKg > 0
            ? it.buyPricePerKg
            : it.weightKg > 0 && it.subtotalPayment > 0
            ? Math.round(it.subtotalPayment / it.weightKg)
            : 0;
        const totalCost =
          it.subtotalPayment > 0 ? it.subtotalPayment : Math.round(it.weightKg * unitPrice);

        bucket.purchasedKg = roundWeight(bucket.purchasedKg + it.weightKg);
        bucket.events.push({
          kind: 'purchase',
          ts,
          order: 0,
          weightKg: it.weightKg,
          bunches: it.bunches,
          totalCost
        });
      });
    });

    // 2. Collect sales deduction events per variety
    sales.forEach((s) => {
      const ts = parseEventTime(s.date);
      const items = extractSaleItems(s);
      items.forEach((it) => {
        const bucket = ensureVarietyBucket(it.bananaType);
        if (!bucket) return;
        bucket.events.push({
          kind: 'sale',
          ts,
          order: 1,
          weightKg: it.weightKg,
          bunches: safeNum(it.bunches)
        });
      });
    });

    // 3. Collect shrinkage deduction events per variety
    shrinkages.forEach((sh) => {
      const bucket = ensureVarietyBucket(sh.bananaType);
      if (!bucket) return;
      bucket.events.push({
        kind: 'shrinkage',
        ts: parseEventTime(sh.date),
        order: 2,
        weightKg: safeNum(sh.weightKg),
        bunches: Math.max(0, Math.trunc(safeNum(sh.bunches)))
      });
    });

    // 4. Collect reject deduction events per variety
    rejects.forEach((r) => {
      const bucket = ensureVarietyBucket(r.bananaType);
      if (!bucket) return;
      bucket.events.push({
        kind: 'reject',
        ts: parseEventTime(r.date),
        order: 3,
        weightKg: safeNum(r.weightKg),
        bunches: Math.max(0, Math.trunc(safeNum(r.bunches)))
      });
    });

    const computedAt = new Date().toISOString();

    return Array.from(varietyMap.values()).map((bucket) => {
      const canonicalType = bucket.canonicalName;
      const totalPurchasedKg = roundWeight(bucket.purchasedKg);

      const sortedEvents = [...bucket.events].sort(
        (a, b) => a.ts - b.ts || a.order - b.order
      );

      let runningStock = 0;
      let runningCost = 0;
      let runningBunches = 0;

      for (const ev of sortedEvents) {
        if (ev.kind === 'purchase') {
          if (ev.weightKg <= 0) continue;
          runningStock = roundWeight(runningStock + ev.weightKg);
          runningCost += ev.totalCost;
          runningBunches += ev.bunches;
        } else {
          if (runningStock <= 0 || ev.weightKg <= 0) continue;

          const deductedKg = Math.min(runningStock, ev.weightKg);
          const remainingKg = roundWeight(runningStock - deductedKg);

          if (remainingKg <= 0) {
            runningStock = 0;
            runningCost = 0;
            runningBunches = 0;
          } else {
            const ratio = deductedKg / runningStock;
            runningCost = Math.max(0, runningCost - runningCost * ratio);
            runningStock = remainingKg;
            runningBunches = Math.max(0, runningBunches - ev.bunches);
          }
        }
      }

      const stockKg = Math.max(0, roundWeight(runningStock));
      const bunches = stockKg <= 0 ? 0 : Math.max(0, Math.trunc(runningBunches));
      const avgBuyPrice =
        stockKg > 0 && runningCost > 0 ? Math.round(runningCost / stockKg) : 0;
      const totalCostInvested =
        stockKg > 0 && runningCost > 0 ? Math.round(runningCost) : 0;

      const hasPurchases = stockKg > 0 && avgBuyPrice > 0;
      const recommendedSellPrice =
        TYPICAL_SELL_PRICES[canonicalType] ||
        (avgBuyPrice > 0 ? Math.round(avgBuyPrice * 1.35) : 8000);

      return {
        bananaType: canonicalType,
        stockKg,
        bunches,
        totalCostInvested,
        avgBuyPricePerKg: avgBuyPrice,
        recommendedSellPrice,
        lastUpdated: computedAt,
        hasPurchases,
        totalPurchasedKg
      };
    });
  }, [purchases, sales, rejects, shrinkages]);

  // Overall Statistics for Cards
  const stats = useMemo(() => {
    const totalStockKg = stockList.reduce((acc, s) => acc + s.stockKg, 0);
    const totalStockBunches = stockList.reduce((acc, s) => acc + s.bunches, 0);
    const totalCapitalSpent = purchases.reduce((acc, p) => acc + p.totalPayment, 0);
    const totalRealizedRevenue = sales.reduce((acc, s) => acc + s.totalRevenue, 0);
    const totalRealizedProfit = sales.reduce((acc, s) => acc + s.netProfit, 0);
    const totalRejectLoss = rejects.reduce((acc, r) => acc + safeNum(r.totalLossAmount), 0);
    const totalShrinkageLoss = shrinkages.reduce((acc, sh) => acc + safeNum(sh.totalLossAmount), 0);

    const totalReceivables = sales
      .filter((s) => s.paymentStatus === 'BELUM_LUNAS')
      .reduce((acc, s) => acc + s.totalRevenue, 0);

    const unpaidCount = sales.filter((s) => s.paymentStatus === 'BELUM_LUNAS').length;

    const totalPaidRevenue = sales
      .filter((s) => s.paymentStatus === 'LUNAS')
      .reduce((acc, s) => acc + s.totalRevenue, 0);

    const projectedProfitFromStock = stockList.reduce((acc, s) => {
      const marginPerKg = Math.max(0, s.recommendedSellPrice - s.avgBuyPricePerKg);
      return acc + s.stockKg * marginPerKg;
    }, 0);

    const potentialStockGrossValue = stockList.reduce((acc, s) => {
      return acc + s.stockKg * s.recommendedSellPrice;
    }, 0);

    return {
      totalStockKg,
      totalStockBunches,
      totalCapitalSpent,
      totalRealizedRevenue,
      totalRealizedProfit,
      totalRejectLoss,
      totalShrinkageLoss,
      projectedProfitFromStock,
      potentialStockGrossValue,
      totalReceivables,
      unpaidCount,
      totalPaidRevenue
    };
  }, [stockList, purchases, sales, rejects, shrinkages]);

  // Mark a warehouse sale as paid (Pelunasan Piutang) -> Persist to Firestore
  const handleMarkAsPaid = async (saleId: string) => {
    if (!userSession) return;
    const path = `lapak/${LAPAK_ID}/sales/${saleId}`;
    await runPreservingScroll(async () => {
      try {
        await updateDoc(doc(db, 'lapak', LAPAK_ID, 'sales', saleId), {
          paymentStatus: 'LUNAS',
          paidAt: clampStr(new Date().toISOString(), 64),
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        setDbError('Gagal menyimpan status pelunasan ke database.');
        logFirestoreError(err, OperationType.UPDATE, path);
      }
    });
  };

  // Add new Farmer Purchase -> Persist to Firestore
  const handleAddPurchase = (newPurchaseData: Omit<FarmerPurchase, 'id' | 'receiptNumber'>): FarmerPurchase => {
    const restore = captureScrollState();
    const dateCode = toLocalDateCode();
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const receiptNumber = clampStr(`NT-${dateCode}-${randomSuffix}`, 64);
    const docId = makeDocId('pb');

    const rawItemsList = Array.isArray(newPurchaseData.items)
      ? newPurchaseData.items
      : newPurchaseData.items && typeof newPurchaseData.items === 'object'
      ? Object.values(newPurchaseData.items as Record<string, PurchaseItem>)
      : [];

    const items: PurchaseItem[] | undefined =
      rawItemsList.length > 0
        ? rawItemsList.slice(0, 20).map((it) => {
            const w = roundWeight(safeNum(it.weightKg));
            const b = Math.max(0, Math.trunc(safeNum(it.bunches)));
            const p = safeNum(it.buyPricePerKg);
            const sub = safeNum(it.subtotalPayment) || Math.round(w * p);
            return stripUndefined({
              bananaType: clampStr(normalizeVarietyName(it.bananaType), 120) || 'Pisang',
              bunches: b,
              weightKg: w,
              buyPricePerKg: p,
              subtotalPayment: sub
            });
          })
        : undefined;

    let numWeight = roundWeight(safeNum(newPurchaseData.weightKg));
    let numBunches = Math.max(0, Math.trunc(safeNum(newPurchaseData.bunches)));
    let numPrice = safeNum(newPurchaseData.buyPricePerKg);
    let numTotal = safeNum(newPurchaseData.totalPayment);

    if (items && items.length > 0) {
      numWeight = roundWeight(items.reduce((acc, it) => acc + it.weightKg, 0));
      numBunches = items.reduce((acc, it) => acc + it.bunches, 0);
      numTotal = items.reduce((acc, it) => acc + it.subtotalPayment, 0);
      numPrice = numWeight > 0 ? Math.round(numTotal / numWeight) : 0;
    } else {
      numTotal = numTotal || Math.round(numWeight * numPrice);
    }

    const summaryType = clampStr(
      items && items.length > 1
        ? `${items[0].bananaType} (+${items.length - 1} jenis lain)`
        : normalizeVarietyName(newPurchaseData.bananaType || (items?.[0]?.bananaType ?? 'Pisang')),
      120
    );

    const officerName = userSession
      ? clampStr(userSession.fullName || userSession.username, 120)
      : undefined;

    const newPurchase: FarmerPurchase = stripUndefined({
      id: docId,
      receiptNumber,
      farmerName: clampStr(newPurchaseData.farmerName, 150) || 'Petani',
      bananaType: summaryType,
      items,
      bunches: numBunches,
      weightKg: numWeight,
      buyPricePerKg: numPrice,
      totalPayment: numTotal,
      date: clampStr(newPurchaseData.date || new Date().toISOString(), 64),
      notes: newPurchaseData.notes ? clampStr(newPurchaseData.notes, 500) : undefined,
      createdById: userSession?.id,
      createdByName: officerName
    });

    // Optimistically reflect every purchased item in stock immediately
    setPurchases((prev) =>
      prev.some((p) => p.id === newPurchase.id)
        ? prev
        : [...prev, newPurchase].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )
    );

    if (userSession) {
      const path = `lapak/${LAPAK_ID}/purchases/${docId}`;
      const payload = stripUndefined({
        ...newPurchase,
        lapakId: LAPAK_ID,
        createdById: userSession.id,
        createdByName: officerName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      void setDoc(doc(db, 'lapak', LAPAK_ID, 'purchases', docId), payload).catch((err) => {
        setPurchases((prev) => prev.filter((p) => p.id !== docId));
        setDbError('Gagal menyimpan pembelian petani ke database.');
        logFirestoreError(err, OperationType.CREATE, path);
      });
    }

    setModalState({
      isOpen: true,
      type: 'purchase',
      purchaseData: newPurchase
    });
    restore();

    return newPurchase;
  };

  // Delete Farmer Purchase -> Persist to Firestore
  const handleDeletePurchase = async (id: string) => {
    if (!userSession) return;
    const path = `lapak/${LAPAK_ID}/purchases/${id}`;
    await runPreservingScroll(async () => {
      try {
        await deleteDoc(doc(db, 'lapak', LAPAK_ID, 'purchases', id));
      } catch (err) {
        setDbError('Gagal menghapus data pembelian dari database.');
        logFirestoreError(err, OperationType.DELETE, path);
      }
    });
  };

  // Add new Central Warehouse Sale -> Persist to Firestore
  const handleAddSale = async (newSaleData: Omit<CentralWarehouseSale, 'id' | 'invoiceNumber'>) => {
    if (!userSession) return;
    const dateCode = toLocalDateCode();
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const invoiceNumber = clampStr(`SJ-GP-${dateCode}-${randomSuffix}`, 64);
    const docId = makeDocId('sl');

    const cleanedItems =
      newSaleData.items && newSaleData.items.length > 0
        ? newSaleData.items.slice(0, 20).map((it) =>
            stripUndefined({
              bananaType: clampStr(normalizeVarietyName(it.bananaType), 120),
              weightKg: roundWeight(safeNum(it.weightKg)),
              bunches: it.bunches !== undefined ? safeNum(it.bunches) : undefined,
              sellPricePerKg: safeNum(it.sellPricePerKg),
              costPricePerKg: safeNum(it.costPricePerKg),
              subtotalRevenue: Math.round(safeNum(it.subtotalRevenue)),
              subtotalCost: Math.round(safeNum(it.subtotalCost)),
              subtotalProfit: Math.round(safeNum(it.subtotalProfit))
            })
          )
        : undefined;

    const payload = stripUndefined({
      id: docId,
      lapakId: LAPAK_ID,
      createdById: userSession.id,
      createdByName: clampStr(userSession.fullName || userSession.username, 120),
      invoiceNumber,
      buyerWarehouseName: clampStr(newSaleData.buyerWarehouseName, 180) || 'Pembeli dari Gudang',
      buyerWhatsApp: newSaleData.buyerWhatsApp ? clampStr(newSaleData.buyerWhatsApp, 40) : undefined,
      buyerPhone: newSaleData.buyerPhone ? clampStr(newSaleData.buyerPhone, 40) : undefined,
      bananaType: clampStr(newSaleData.bananaType, 120) || 'Pisang',
      items: cleanedItems,
      weightKg: roundWeight(safeNum(newSaleData.weightKg)),
      bunches: newSaleData.bunches !== undefined ? safeNum(newSaleData.bunches) : undefined,
      sellPricePerKg: safeNum(newSaleData.sellPricePerKg),
      totalRevenue: Math.round(safeNum(newSaleData.totalRevenue)),
      estimatedCost: Math.round(safeNum(newSaleData.estimatedCost)),
      netProfit: Math.round(safeNum(newSaleData.netProfit)),
      profitMarginPercent: safeNum(newSaleData.profitMarginPercent),
      date: clampStr(newSaleData.date || new Date().toISOString(), 64),
      notes: newSaleData.notes ? clampStr(newSaleData.notes, 500) : undefined,
      paymentStatus: newSaleData.paymentStatus,
      paymentMethod: newSaleData.paymentMethod,
      dueDate: newSaleData.dueDate ? clampStr(newSaleData.dueDate, 32) : undefined,
      paidAt: newSaleData.paidAt ? clampStr(newSaleData.paidAt, 64) : undefined,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const path = `lapak/${LAPAK_ID}/sales/${docId}`;
    await runPreservingScroll(async () => {
      try {
        await setDoc(doc(db, 'lapak', LAPAK_ID, 'sales', docId), payload);
      } catch (err) {
        setDbError('Gagal menyimpan penjualan ke database.');
        logFirestoreError(err, OperationType.CREATE, path);
      }
    });
  };

  // Delete Central Warehouse Sale -> Persist to Firestore
  const handleDeleteSale = async (id: string) => {
    if (!userSession) return;
    const path = `lapak/${LAPAK_ID}/sales/${id}`;
    await runPreservingScroll(async () => {
      try {
        await deleteDoc(doc(db, 'lapak', LAPAK_ID, 'sales', id));
      } catch (err) {
        setDbError('Gagal menghapus data pengiriman dari database.');
        logFirestoreError(err, OperationType.DELETE, path);
      }
    });
  };

  // Add Rejected / Damaged Stock Record -> Persist to Firestore
  const handleAddReject = (newRejectData: Omit<BananaRejectRecord, 'id' | 'referenceNumber'>): BananaRejectRecord => {
    const restore = captureScrollState();
    const dateCode = toLocalDateCode();
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const referenceNumber = clampStr(`RJ-${dateCode}-${randomSuffix}`, 64);
    const docId = makeDocId('rj');

    const weightKg = roundWeight(safeNum(newRejectData.weightKg));
    const bunches = safeNum(newRejectData.bunches);
    const costPricePerKg = safeNum(newRejectData.costPricePerKg);
    const totalLossAmount = Math.round(weightKg * costPricePerKg);

    const newReject: BananaRejectRecord = stripUndefined({
      id: docId,
      referenceNumber,
      bananaType: clampStr(normalizeVarietyName(newRejectData.bananaType), 120),
      weightKg,
      bunches,
      costPricePerKg,
      totalLossAmount,
      reason: clampStr(newRejectData.reason, 150) || 'Lainnya',
      notes: newRejectData.notes ? clampStr(newRejectData.notes, 500) : undefined,
      date: clampStr(newRejectData.date || new Date().toISOString(), 64)
    });

    if (userSession) {
      const path = `lapak/${LAPAK_ID}/rejects/${docId}`;
      const payload = stripUndefined({
        ...newReject,
        lapakId: LAPAK_ID,
        createdById: userSession.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      void setDoc(doc(db, 'lapak', LAPAK_ID, 'rejects', docId), payload).catch((err) => {
        setDbError('Gagal menyimpan catatan reject ke database.');
        logFirestoreError(err, OperationType.CREATE, path);
      });
    }

    restore();
    return newReject;
  };

  // Delete / Revert Reject Record -> Persist to Firestore
  const handleDeleteReject = async (id: string) => {
    if (!userSession) return;
    const path = `lapak/${LAPAK_ID}/rejects/${id}`;
    await runPreservingScroll(async () => {
      try {
        await deleteDoc(doc(db, 'lapak', LAPAK_ID, 'rejects', id));
      } catch (err) {
        setDbError('Gagal memulihkan catatan reject dari database.');
        logFirestoreError(err, OperationType.DELETE, path);
      }
    });
  };

  // Add Weight Shrinkage / Scale Variance Record -> Persist to Firestore
  const handleAddShrinkage = (
    newShrinkageData: Omit<BananaShrinkageRecord, 'id' | 'referenceNumber'>
  ): BananaShrinkageRecord => {
    const restore = captureScrollState();
    const dateCode = toLocalDateCode();
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const referenceNumber = clampStr(`SS-${dateCode}-${randomSuffix}`, 64);
    const docId = makeDocId('ss');

    const weightKg = roundWeight(safeNum(newShrinkageData.weightKg));
    const bunches = safeNum(newShrinkageData.bunches);
    const costPricePerKg = safeNum(newShrinkageData.costPricePerKg);
    const totalLossAmount = Math.round(weightKg * costPricePerKg);

    const newShrinkage: BananaShrinkageRecord = stripUndefined({
      id: docId,
      referenceNumber,
      bananaType: clampStr(normalizeVarietyName(newShrinkageData.bananaType), 120),
      weightKg,
      bunches,
      costPricePerKg,
      totalLossAmount,
      reason: clampStr(newShrinkageData.reason, 150) || 'Lainnya',
      notes: newShrinkageData.notes ? clampStr(newShrinkageData.notes, 500) : undefined,
      date: clampStr(newShrinkageData.date || new Date().toISOString(), 64)
    });

    if (userSession) {
      const path = `lapak/${LAPAK_ID}/shrinkages/${docId}`;
      const payload = stripUndefined({
        ...newShrinkage,
        lapakId: LAPAK_ID,
        createdById: userSession.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      void setDoc(doc(db, 'lapak', LAPAK_ID, 'shrinkages', docId), payload).catch((err) => {
        setDbError('Gagal menyimpan catatan susut timbang ke database.');
        logFirestoreError(err, OperationType.CREATE, path);
      });
    }

    restore();
    return newShrinkage;
  };

  // Delete / Revert Shrinkage Record -> Persist to Firestore
  const handleDeleteShrinkage = async (id: string) => {
    if (!userSession) return;
    const path = `lapak/${LAPAK_ID}/shrinkages/${id}`;
    await runPreservingScroll(async () => {
      try {
        await deleteDoc(doc(db, 'lapak', LAPAK_ID, 'shrinkages', id));
      } catch (err) {
        setDbError('Gagal memulihkan catatan susut timbang dari database.');
        logFirestoreError(err, OperationType.DELETE, path);
      }
    });
  };

  // User Management Handlers (Owner / Superadmin only) -> Persist to Firestore
  const handleAddUser = async (data: {
    id: string;
    fullName: string;
    role: UserRole;
    password: string;
  }) => {
    if (!userSession || userSession.role !== 'owner') {
      throw new Error('Hanya Owner (Superadmin) yang dapat menambah pengguna.');
    }

    const cleanId = clampStr(data.id, 64);
    const path = `app_users/${cleanId}`;
    const userRef = doc(db, 'app_users', cleanId);

    await runPreservingScroll(async () => {
      const existing = await getDoc(userRef);
      if (existing.exists()) {
        throw new Error(`ID Pengguna "${cleanId}" sudah terdaftar di database.`);
      }

      const salt = generateSalt();
      const passwordHash = await hashPassword(salt, data.password);

      const payload = {
        id: cleanId,
        username: cleanId,
        fullName: clampStr(data.fullName, 120),
        role: data.role,
        passwordHash,
        salt,
        isActive: true,
        createdById: userSession.id,
        createdAtDate: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      try {
        await setDoc(userRef, payload);
      } catch (err) {
        setDbError('Gagal menambahkan pengguna baru ke database.');
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    });
  };

  const handleUpdateUser = async (
    userId: string,
    updates: {
      fullName: string;
      role: UserRole;
      isActive: boolean;
      newPassword?: string;
    }
  ) => {
    if (!userSession || userSession.role !== 'owner') {
      throw new Error('Hanya Owner (Superadmin) yang dapat mengubah pengguna.');
    }

    const path = `app_users/${userId}`;
    const updatePayload: Record<string, unknown> = {
      fullName: clampStr(updates.fullName, 120),
      role: userId === '252500' ? 'owner' : updates.role,
      isActive: userId === '252500' ? true : updates.isActive,
      updatedAt: serverTimestamp()
    };

    await runPreservingScroll(async () => {
      if (updates.newPassword) {
        const newSalt = generateSalt();
        const newHash = await hashPassword(newSalt, updates.newPassword);
        updatePayload.salt = newSalt;
        updatePayload.passwordHash = newHash;
      }

      try {
        await updateDoc(doc(db, 'app_users', userId), updatePayload);
      } catch (err) {
        setDbError('Gagal memperbarui data pengguna di database.');
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    });
  };

  const handleDeleteUser = async (userId: string) => {
    if (!userSession || userSession.role !== 'owner') return;
    if (userId === '252500' || userId === userSession.id) return;

    const path = `app_users/${userId}`;
    await runPreservingScroll(async () => {
      try {
        await deleteDoc(doc(db, 'app_users', userId));
      } catch (err) {
        setDbError('Gagal menghapus pengguna dari database.');
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    });
  };

  // Login & Logout Handlers
  const handleLoginSuccess = (session: UserSession) => {
    safeStorageSet(SESSION_STORAGE_KEY, session.id);
    setDbError('');
    setUserSession(session);
    setActiveTab('purchases');
  };

  const handleLogout = () => {
    safeStorageRemove(SESSION_STORAGE_KEY);
    setDbError('');
    setUserSession(null);
    setPurchases([]);
    setSales([]);
    setRejects([]);
    setShrinkages([]);
    setAppUsers([]);
    setUserNamesById({});
    setActiveTab('purchases');
  };

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-amber-300 flex items-center justify-center text-2xl shadow-md mb-4">
          🍌
        </div>
        <div className="flex items-center gap-2 text-stone-700 font-semibold text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
          <span>Menyiapkan database Lapak Pisang Sumber Sewu...</span>
        </div>
      </div>
    );
  }

  if (!userSession || !userSession.isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const canManageUsers = userSession.role === 'owner';

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 flex flex-col font-sans overflow-x-clip">
      {/* Top Main Navbar */}
      <Navbar
        user={userSession}
        onLogout={handleLogout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unpaidSalesCount={stats.unpaidCount}
        canManageUsers={canManageUsers}
      />

      {/* Sub-Header Navigation Bar (Dedicated Tabs Bar) */}
      <SubNavTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unpaidSalesCount={stats.unpaidCount}
        canManageUsers={canManageUsers}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:pt-[22px] space-y-4 sm:space-y-6">
        {/* Ringkasan Statistik Cards */}
        {(activeTab === 'stock-and-sales' || activeTab === 'financial-report') && (
          <section aria-label="Ringkasan Statistik Gudang Lapak" className="animate-in fade-in duration-200">
            <StatCards
              activeTab={activeTab}
              totalStockKg={stats.totalStockKg}
              totalCapitalSpent={stats.totalCapitalSpent}
              totalRealizedRevenue={stats.totalRealizedRevenue}
              totalRealizedProfit={stats.totalRealizedProfit}
              totalRejectLoss={stats.totalRejectLoss}
              totalShrinkageLoss={stats.totalShrinkageLoss}
              projectedProfitFromStock={stats.projectedProfitFromStock}
              potentialStockGrossValue={stats.potentialStockGrossValue}
              totalReceivables={stats.totalReceivables}
              unpaidCount={stats.unpaidCount}
              totalPaidRevenue={stats.totalPaidRevenue}
            />
          </section>
        )}

        {/* Active Tab View */}
        <section aria-label="Bagian Kerja Manajemen Lapak">
          {activeTab === 'purchases' ? (
            <TabPurchase
              purchases={purchases}
              onAddPurchase={handleAddPurchase}
              onDeletePurchase={handleDeletePurchase}
              onViewReceipt={(item) => {
                const restore = captureScrollState();
                setModalState({
                  isOpen: true,
                  type: 'purchase',
                  purchaseData: item
                });
                restore();
              }}
            />
          ) : activeTab === 'stock-and-sales' ? (
            <TabStockAndSales
              stockList={stockList}
              sales={sales}
              rejects={rejects}
              shrinkages={shrinkages}
              onAddSale={handleAddSale}
              onAddReject={handleAddReject}
              onDeleteReject={handleDeleteReject}
              onAddShrinkage={handleAddShrinkage}
              onDeleteShrinkage={handleDeleteShrinkage}
              onGoToFinancialReport={() => setActiveTab('financial-report')}
              onViewInvoice={(sale) => {
                const restore = captureScrollState();
                setModalState({
                  isOpen: true,
                  type: 'sale',
                  saleData: sale
                });
                restore();
              }}
              onMarkAsPaid={handleMarkAsPaid}
              onDeleteSale={handleDeleteSale}
            />
          ) : activeTab === 'financial-report' ? (
            <TabFinancialReport
              purchases={purchases}
              sales={sales}
              rejects={rejects}
              shrinkages={shrinkages}
              onDeleteReject={handleDeleteReject}
              onDeleteShrinkage={handleDeleteShrinkage}
              onViewInvoice={(sale) => {
                const restore = captureScrollState();
                setModalState({
                  isOpen: true,
                  type: 'sale',
                  saleData: sale
                });
                restore();
              }}
              onMarkAsPaid={handleMarkAsPaid}
            />
          ) : canManageUsers ? (
            <TabUsers
              users={appUsers}
              currentUserId={userSession.id}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
            />
          ) : null}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-200 bg-white py-4 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-0.5">
            <span className="font-bold text-stone-800">Lapak Pisang Sumber Sewu</span>
            <span aria-hidden="true">·</span>
            <span>Sistem Pencatatan Pengepul Pisang Mentah</span>
          </div>
          <div className="text-stone-400">
            Kapasitas Gudang Aktif · Tersinkronisasi Database Cloud
          </div>
        </div>
      </footer>

      {/* Floating Database Error Notification (Non-shifting overlay) */}
      {dbError && (
        <div
          role="alert"
          className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-50 max-w-md w-[calc(100vw-2rem)] p-3.5 rounded-xl bg-red-50 border border-red-300 text-xs sm:text-sm text-red-900 font-medium flex items-center justify-between gap-3 shadow-lg"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="break-words">{dbError}</span>
          </div>
          <button
            type="button"
            onClick={() => setDbError('')}
            className="text-xs font-bold text-red-700 hover:text-red-900 cursor-pointer shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Printable Receipt / Surat Jalan Modal */}
      {modalState.isOpen && (
        <ReceiptModal
          type={modalState.type}
          purchaseData={modalState.purchaseData}
          saleData={modalState.saleData}
          officerName={(() => {
            const activeRecord =
              modalState.type === 'purchase' ? modalState.purchaseData : modalState.saleData;
            return (
              activeRecord?.createdByName?.trim() ||
              (activeRecord?.createdById ? userNamesById[activeRecord.createdById] : undefined) ||
              userSession.fullName
            );
          })()}
          onClose={() => {
            const restore = captureScrollState();
            blurActiveTrigger();
            setModalState({ isOpen: false, type: 'purchase' });
            restore();
          }}
        />
      )}
    </div>
  );
}
