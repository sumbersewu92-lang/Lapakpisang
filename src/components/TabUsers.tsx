import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  ShieldCheck,
  UserCheck,
  Trash2,
  Eye,
  EyeOff,
  Edit3,
  AlertTriangle,
  AlertCircle,
  X,
  Lock,
  User,
  Sparkles
} from 'lucide-react';
import { AppUserRecord, UserRole } from '../types/banana';
import { captureScrollState, blurActiveTrigger } from '../utils/scrollPreservation';
import {
  capitalizeEachWord,
  capitalizeFirstLetter,
  handleCapitalizedInputChange
} from '../utils/textFormat';

interface TabUsersProps {
  users: AppUserRecord[];
  currentUserId: string;
  onAddUser: (data: {
    id: string;
    fullName: string;
    role: UserRole;
    password: string;
  }) => Promise<void>;
  onUpdateUser: (
    userId: string,
    updates: {
      fullName: string;
      role: UserRole;
      isActive: boolean;
      newPassword?: string;
    }
  ) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
}

export const TabUsers: React.FC<TabUsersProps> = ({
  users,
  currentUserId,
  onAddUser,
  onUpdateUser,
  onDeleteUser
}) => {
  // Form Tambah User State
  const [newId, setNewId] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('kasir');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<AppUserRecord | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('kasir');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editError, setEditError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Confirmation Modal State
  const [userToDelete, setUserToDelete] = useState<AppUserRecord | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const formatUserMutationError = (err: unknown, fallback: string): string => {
    if (!(err instanceof Error) || !err.message) return fallback;
    const raw = err.message.trim();
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw) as { error?: string };
        const detail = (parsed.error || '').toLowerCase();
        if (detail.includes('permission') || detail.includes('missing or insufficient')) {
          return 'Akses ditolak oleh database (izin tidak mencukupi). Pastikan Anda masuk sebagai Owner.';
        }
        if (detail) {
          return `${fallback} (${parsed.error})`;
        }
      } catch {
        return fallback;
      }
    }
    return raw;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanId = newId.trim();
    const cleanName = newFullName.trim();

    if (!cleanId) {
      setFormError('Username / ID Pengguna wajib diisi.');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanId)) {
      setFormError('Username / ID hanya boleh berisi huruf, angka, tanda hubung (-), atau garis bawah (_).');
      return;
    }
    if (cleanId.length > 64) {
      setFormError('Username / ID maksimal 64 karakter.');
      return;
    }
    if (users.some((u) => u.id.toLowerCase() === cleanId.toLowerCase())) {
      setFormError(`ID Pengguna "${cleanId}" sudah terdaftar. Gunakan ID yang lain.`);
      return;
    }
    if (!cleanName) {
      setFormError('Nama lengkap wajib diisi.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setFormError('Password minimal terdiri dari 4 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError('Konfirmasi password tidak cocok.');
      return;
    }

    const restore = captureScrollState();
    setIsSubmitting(true);
    try {
      await onAddUser({
        id: cleanId,
        fullName: cleanName,
        role: newRole,
        password: newPassword
      });
      setNewId('');
      setNewFullName('');
      setNewRole('kasir');
      setNewPassword('');
      setConfirmPassword('');
      restore();
    } catch (err: unknown) {
      setFormError(formatUserMutationError(err, 'Gagal menambahkan pengguna ke database.'));
      restore();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (user: AppUserRecord) => {
    const restore = captureScrollState();
    setEditingUser(user);
    setEditFullName(user.fullName);
    setEditRole(user.role);
    setEditNewPassword('');
    setShowEditPassword(false);
    setEditError('');
    restore();
  };

  const closeEditModal = () => {
    const restore = captureScrollState();
    blurActiveTrigger();
    setEditingUser(null);
    restore();
  };

  const handleOpenDeleteModal = (user: AppUserRecord) => {
    setDeleteError('');
    setUserToDelete(user);
  };

  const closeDeleteModal = () => {
    const restore = captureScrollState();
    blurActiveTrigger();
    setDeleteError('');
    setUserToDelete(null);
    restore();
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError('');

    const cleanName = editFullName.trim();
    if (!cleanName) {
      setEditError('Nama lengkap tidak boleh kosong.');
      return;
    }
    if (editNewPassword && editNewPassword.length < 4) {
      setEditError('Password baru minimal terdiri dari 4 karakter.');
      return;
    }

    const restore = captureScrollState();
    setIsUpdating(true);
    try {
      await onUpdateUser(editingUser.id, {
        fullName: cleanName,
        role: editingUser.id === '252500' ? 'owner' : editRole,
        isActive: editingUser.isActive,
        newPassword: editNewPassword || undefined
      });
      blurActiveTrigger();
      setEditingUser(null);
      restore();
    } catch (err: unknown) {
      setEditError(formatUserMutationError(err, 'Gagal memperbarui pengguna.'));
      restore();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleteError('');
    const restore = captureScrollState();
    setIsDeleting(true);
    try {
      await onDeleteUser(userToDelete.id);
      blurActiveTrigger();
      setUserToDelete(null);
      restore();
    } catch (err: unknown) {
      setDeleteError(formatUserMutationError(err, 'Gagal menghapus akun pengguna dari database.'));
      restore();
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      u.id.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.fullName.toLowerCase().includes(q);
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const ownerCount = users.filter((u) => u.role === 'owner').length;
  const kasirCount = users.filter((u) => u.role === 'kasir').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Manajemen Akun &amp; Hak Akses Lapak</span>
          </div>
          <h2 className="text-lg sm:text-2xl font-bold text-stone-900 tracking-tight">
            Kelola Pengguna
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Tambahkan akun kasir atau pengelola baru, atur peran akses, dan pantau daftar pengguna di database.
          </p>
        </div>

        {/* Summary Counters */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
          <div className="px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
              Total User
            </span>
            <span className="text-base sm:text-lg font-extrabold font-mono text-stone-900">
              {users.length}
            </span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-amber-50/70 border border-amber-200 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
              Owner
            </span>
            <span className="text-base sm:text-lg font-extrabold font-mono text-amber-900">
              {ownerCount}
            </span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
              Kasir
            </span>
            <span className="text-base sm:text-lg font-extrabold font-mono text-emerald-900">
              {kasirCount}
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Left Column: Form Tambah User */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-stone-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900 leading-tight">
                Tambah Pengguna Baru
              </h3>
              <p className="text-[11px] text-stone-500">
                Akun baru langsung tersimpan ke database &amp; dapat login.
              </p>
            </div>
          </div>

          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleAddSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1" htmlFor="new-user-id">
                Username / ID Pengguna <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="new-user-id"
                  type="text"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  placeholder="Contoh: 252502 atau kasir2"
                  maxLength={64}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                />
              </div>
              <p className="text-[10.5px] text-stone-400 mt-1">
                Gunakan angka/huruf tanpa spasi (dipakai untuk login).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1" htmlFor="new-user-name">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                id="new-user-name"
                type="text"
                autoCapitalize="words"
                value={newFullName}
                onChange={(e) => handleCapitalizedInputChange(e, capitalizeEachWord, setNewFullName)}
                placeholder="Contoh: Pak Budi / Kasir Pagi"
                maxLength={120}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              />
            </div>

            <div>
              <span className="block text-xs font-semibold text-stone-700 mb-1.5">
                Role / Hak Akses <span className="text-red-500">*</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewRole('kasir')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    newRole === 'kasir'
                      ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500 text-emerald-950'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Kasir</span>
                  </div>
                  <p className="text-[10px] text-stone-500 mt-0.5 leading-snug">
                    Input pembelian, stok, penjualan &amp; laporan
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setNewRole('owner')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    newRole === 'owner'
                      ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500 text-amber-950'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Owner</span>
                  </div>
                  <p className="text-[10px] text-stone-500 mt-0.5 leading-snug">
                    Superadmin &amp; kelola pengguna
                  </p>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1" htmlFor="new-user-pass">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="new-user-pass"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 4 karakter"
                    className="w-full pl-8 pr-8 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                    aria-label={showNewPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1" htmlFor="new-user-confirm">
                  Konfirmasi Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="new-user-confirm"
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>{isSubmitting ? 'Menyimpan Pengguna...' : 'Simpan Pengguna Baru'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Daftar User */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-stone-200 p-4 sm:p-5 shadow-xs space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-800 shrink-0" />
              <h3 className="text-sm sm:text-base font-bold text-stone-900">
                Daftar Pengguna Terdaftar
              </h3>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {filteredUsers.length} Akun
              </span>
            </div>

            {/* Search & Role Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  autoCapitalize="sentences"
                  value={searchQuery}
                  onChange={(e) => handleCapitalizedInputChange(e, capitalizeFirstLetter, setSearchQuery)}
                  placeholder="Cari ID atau nama..."
                  className="w-full sm:w-44 pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as 'ALL' | UserRole)}
                className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
              >
                <option value="ALL">Semua Role</option>
                <option value="owner">Owner (Superadmin)</option>
                <option value="kasir">Kasir</option>
              </select>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="py-10 text-center text-stone-400 text-xs sm:text-sm">
              Tidak ada pengguna yang cocok dengan filter pencarian.
            </div>
          ) : (
            <>
              {/* Mobile Cards (< sm) */}
              <div className="sm:hidden space-y-2.5">
                {filteredUsers.map((u) => {
                  const isPrimaryOwner = u.id === '252500';
                  const isSelf = u.id === currentUserId;

                  return (
                    <div
                      key={u.id}
                      className="p-3 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-stone-200/80 text-stone-900 inline-block">
                            {u.id}
                          </span>
                          <p className="text-sm font-bold text-stone-900 mt-1 truncate">{u.fullName}</p>
                        </div>

                        <span
                          className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                            u.role === 'owner'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-sky-50 text-sky-800 border-sky-200'
                          }`}
                        >
                          {u.role === 'owner' ? 'Owner (Superadmin)' : 'Kasir'}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-stone-200/70">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(u)}
                          title={`Ubah data atau password ${u.fullName}`}
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <Edit3 className="w-3.5 h-3.5 shrink-0" />
                          <span>Ubah</span>
                        </button>
                        {!isPrimaryOwner && !isSelf && (
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(u)}
                            title={`Hapus akun ${u.id}`}
                            aria-label={`Hapus akun ${u.id}`}
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition flex items-center justify-center cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table (>= sm) - 4 proportional columns without horizontal scroll */}
              <div className="hidden sm:block">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-[10px] font-bold text-stone-500 uppercase tracking-wider bg-stone-50/80">
                      <th className="py-2.5 px-2.5 whitespace-nowrap">ID</th>
                      <th className="py-2.5 px-2.5">Nama Lengkap</th>
                      <th className="py-2.5 px-2.5 whitespace-nowrap">Role</th>
                      <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs">
                    {filteredUsers.map((u) => {
                      const isPrimaryOwner = u.id === '252500';
                      const isSelf = u.id === currentUserId;

                      return (
                        <tr key={u.id} className="hover:bg-stone-50/80 transition">
                          <td className="py-3 px-2.5 whitespace-nowrap">
                            <span className="font-mono font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded border border-stone-200 inline-block">
                              {u.id}
                            </span>
                          </td>

                          <td className="py-3 px-2.5 max-w-[180px]">
                            <span className="font-bold text-stone-900 block leading-tight truncate" title={u.fullName}>
                              {u.fullName}
                            </span>
                          </td>

                          <td className="py-3 px-2.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                u.role === 'owner'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-sky-50 text-sky-800 border-sky-200'
                              }`}
                            >
                              {u.role === 'owner' ? (
                                <ShieldCheck className="w-3 h-3 shrink-0" />
                              ) : (
                                <UserCheck className="w-3 h-3 shrink-0" />
                              )}
                              <span>{u.role === 'owner' ? 'Owner (Superadmin)' : 'Kasir'}</span>
                            </span>
                          </td>

                          <td className="py-3 px-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(u)}
                                title={`Ubah data atau password ${u.fullName}`}
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 transition flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <Edit3 className="w-3.5 h-3.5 shrink-0" />
                                <span>Ubah</span>
                              </button>

                              {!isPrimaryOwner && !isSelf && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenDeleteModal(u)}
                                  title={`Hapus akun ${u.id}`}
                                  aria-label={`Hapus akun ${u.id}`}
                                  className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition flex items-center justify-center cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Ubah Pengguna / Reset Password */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/55 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900">
                    Ubah Pengguna ({editingUser.id})
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Perbarui nama, peran, atau ganti password login.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 transition cursor-pointer"
                aria-label="Tutup modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              {editError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1" htmlFor="edit-full-name">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit-full-name"
                  type="text"
                  autoCapitalize="words"
                  value={editFullName}
                  onChange={(e) => handleCapitalizedInputChange(e, capitalizeEachWord, setEditFullName)}
                  maxLength={120}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1" htmlFor="edit-role">
                  Role / Peran
                </label>
                <select
                  id="edit-role"
                  value={editRole}
                  disabled={editingUser.id === '252500'}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-60"
                >
                  <option value="owner">Owner (Superadmin)</option>
                  <option value="kasir">Kasir</option>
                </select>
                {editingUser.id === '252500' && (
                  <p className="text-[10.5px] text-amber-700 mt-1">
                    Role akun Owner utama (252500) tidak dapat diubah.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1" htmlFor="edit-new-password">
                  Password Baru (Opsional)
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="edit-new-password"
                    type={showEditPassword ? 'text' : 'password'}
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                    placeholder="Kosongkan jika tidak ingin mengganti password"
                    className="w-full pl-9 pr-9 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition cursor-pointer disabled:opacity-60"
                >
                  {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Pengguna */}
      {userToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/55 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-sm overflow-hidden p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-900">Hapus Akun Pengguna?</h4>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  Akun <strong>{userToDelete.fullName}</strong> (<span className="font-mono">{userToDelete.id}</span>) akan dihapus permanen dari database dan tidak dapat masuk lagi.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="px-3.5 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Akun'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
