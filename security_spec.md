# Security Specification — Lapak Pisang Sumber Sewu (Multi-User RBAC)

## 1. Data Invariants
1. User accounts live in `/app_users/{userId}` with salted SHA-256 `passwordHash` and `role` strictly in `['owner', 'kasir']`. Primary superadmin `252500` cannot be deleted, deactivated, or downgraded from `'owner'`.
2. Creating new users (outside initial bootstrap of `252500` and `252501`) requires `createdById` to reference an active `'owner'` document in `/app_users/{createdById}`.
3. Operational records under `/lapak/{lapakId}/purchases`, `/stock_adjustments`, and `/sales` require the parent `/lapak/{lapakId}` document to exist and `createdById` to reference an active user in `/app_users/{createdById}`.
4. All document IDs must match `^[a-zA-Z0-9_\-]+$` (max 128 chars), strings enforce `.size()` bounds, arrays (`items`) are capped at `1..30`, numeric ranges (positive `weightKg`, non-negative `bunches`, prices/totals) are enforced, and `createdAt` / `updatedAt` must equal server `request.time`.
5. Stock adjustments (`BananaStockAdjustment`) enforce `type in ['PENAMBAHAN', 'PENGURANGAN', 'REJECT_BUSUK']` and require a non-empty `reason`.
6. Once a warehouse sale (`WarehouseSale`) reaches `paymentStatus == 'LUNAS'`, its payment status cannot be reversed; transitions from `'BELUM_LUNAS'` to `'LUNAS'` may only mutate `paymentStatus`, `paidAt`, and `updatedAt`.

## 2. Adversarial Tests
1. Creating a user with role `'super_hacker'` or an unknown field -> `PERMISSION_DENIED`.
2. Non-owner (`kasir` `252501`) attempting to create a new user with `createdById: '252501'` -> `PERMISSION_DENIED`.
3. Deleting or deactivating primary owner `252500` -> `PERMISSION_DENIED`.
4. Creating a purchase, stock adjustment, or sale with inactive/non-existent `createdById` -> `PERMISSION_DENIED`.
5. Shadow field injection or backdated `createdAt` -> `PERMISSION_DENIED`.
6. Creating a purchase with empty `items` array or negative `weightKg` -> `PERMISSION_DENIED`.
7. Creating a stock adjustment with invalid `type` or missing `reason` -> `PERMISSION_DENIED`.
8. Reverting a `'LUNAS'` warehouse sale back to `'BELUM_LUNAS'` -> `PERMISSION_DENIED`.
