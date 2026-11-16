# Security Specification — Lapak Pisangku (Multi-User RBAC)

## 1. Data Invariants
1. User accounts live in `/app_users/{userId}` with salted SHA-256 `passwordHash` and `role` strictly in `['owner', 'kasir']`. Primary superadmin `252500` cannot be deleted, deactivated, or downgraded from `'owner'`.
2. Creating new users (outside initial bootstrap of `252500` and `252501`) requires `createdById` to reference an active `'owner'` document in `/app_users/{createdById}`.
3. Operational records under `/lapak/{lapakId}/purchases`, `/sales`, `/rejects`, and `/shrinkages` require the parent `/lapak/{lapakId}` document to exist and `createdById` to reference an active user in `/app_users/{createdById}`.
4. All document IDs must match `^[a-zA-Z0-9_\-]+$` (max 128 chars), strings enforce `.size()` bounds, arrays (`items`) are capped at `<= 20`, and `createdAt` / `updatedAt` must equal server `request.time`.
5. Once a sale reaches `paymentStatus == 'LUNAS'`, its payment status cannot be reversed; transitions from `'BELUM_LUNAS'` to `'LUNAS'` may only mutate `paymentStatus`, `paidAt`, and `updatedAt`.

## 2. Adversarial Tests
1. Creating a user with role `'super_hacker'` or an unknown field -> `PERMISSION_DENIED`.
2. Non-owner (`kasir` `252501`) attempting to create a new user with `createdById: '252501'` -> `PERMISSION_DENIED`.
3. Deleting or deactivating primary owner `252500` -> `PERMISSION_DENIED`.
4. Creating a purchase/sale with inactive/non-existent `createdById` -> `PERMISSION_DENIED`.
5. Shadow field injection or backdated `createdAt` -> `PERMISSION_DENIED`.
6. Reverting a `'LUNAS'` sale back to `'BELUM_LUNAS'` -> `PERMISSION_DENIED`.
