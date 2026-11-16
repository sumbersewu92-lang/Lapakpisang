import React, { useState, useEffect } from 'react';
import {
  User,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Clock,
  Scale,
  Truck,
  PieChart,
  AlertCircle
} from 'lucide-react';
import { authenticateAppUser } from '../firebase';
import { UserSession } from '../types/banana';

interface LoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
}

const FEATURE_MODULES = [
  {
    icon: Scale,
    title: 'Pembelian Petani & Timbangan',
    description: 'Catat pasokan berat bersih (kg), harga beli, dan cetak nota timbangan petani secara akurat.'
  },
  {
    icon: Truck,
    title: 'Stok & Pengiriman Gudang',
    description: 'Pantau sisa stok per varietas, pencatatan susut timbang, reject, hingga surat jalan.'
  },
  {
    icon: PieChart,
    title: 'Laporan Keuangan & Laba',
    description: 'Rekonsiliasi modal pokok, piutang gudang, beban operasional, dan laba bersih otomatis.'
  }
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const formattedTime = now
    .toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    .replace(/\./g, ':');

  const formattedDate = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Silakan masukkan ID Karyawan / Username terlebih dahulu.');
      return;
    }
    if (!password) {
      setError('Silakan masukkan kata sandi (password).');
      return;
    }

    setIsLoading(true);
    try {
      const session = await authenticateAppUser(username, password);
      onLoginSuccess(session);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.startsWith('{')) {
        setError('Gagal terhubung ke database pengguna. Silakan coba lagi beberapa saat.');
      } else {
        setError(msg || 'ID Karyawan atau password tidak sesuai.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col lg:h-screen lg:w-screen lg:overflow-x-hidden">
      {/* Mobile & Tablet Top Header (< lg) */}
      <header className="lg:hidden sticky top-0 z-20 w-full bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center font-bold text-xl sm:text-2xl shadow-xs border border-emerald-700/80 shrink-0">
            <span className="select-none">🍌</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-stone-900 leading-tight">
              Lapak Pisang Sumber Sewu
            </h1>
            <p className="text-[11px] sm:text-xs text-stone-500 font-medium leading-snug mt-0.5">
              Sistem Jual Beli dan Management Pisang Mentah
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-0 lg:items-stretch lg:justify-stretch">
        <div className="w-full max-w-md lg:max-w-none lg:flex-1 lg:h-full bg-white rounded-2xl lg:rounded-none shadow-xl lg:shadow-none overflow-hidden lg:overflow-y-auto border border-stone-200 lg:border-0 grid grid-cols-1 lg:grid-cols-12">
          {/* Left Side: Bright Clean Information Panel & 2x2 Feature Cards (Desktop lg+ only) */}
          <div className="hidden lg:flex lg:col-span-7 bg-gradient-to-br from-emerald-50/90 via-white to-sky-50/60 text-stone-900 p-8 xl:p-12 flex-col justify-between border-r border-stone-200/80">
            {/* Top Bar: Brand Identity + Live Digital Clock */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center shadow-xs border border-emerald-700/80 shrink-0">
                  <span className="text-2xl font-bold select-none">🍌</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl xl:text-2xl font-extrabold tracking-tight text-stone-900 leading-tight">
                    Lapak Pisang Sumber Sewu
                  </h1>
                  <p className="text-xs xl:text-sm text-stone-600 font-medium mt-0.5">
                    Sistem Jual Beli dan Management Pisang Mentah
                  </p>
                </div>
              </div>

              {/* Live Digital Clock Widget */}
              <div
                className="bg-white border border-stone-200/90 rounded-xl px-4 py-2.5 shadow-2xs shrink-0 text-right"
                aria-label="Waktu saat ini"
              >
                <div className="flex items-center justify-end gap-1.5 text-stone-900 font-mono text-base xl:text-lg font-bold tracking-tight tabular-nums leading-none">
                  <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{formattedTime}</span>
                </div>
                <p className="text-[11px] text-stone-500 font-medium mt-1 capitalize whitespace-nowrap">
                  {formattedDate}
                </p>
              </div>
            </div>

            {/* Center Content: Intro + 2x2 Feature Module Grid */}
            <div className="my-auto py-8">
              <div className="max-w-xl mb-6 xl:mb-7">
                <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-stone-900 leading-snug text-balance">
                  Pencatatan Rapi, Timbangan Akurat, Cuan Terukur.
                </h2>
                <p className="text-sm text-stone-600 leading-relaxed mt-2">
                  Kelola seluruh operasional harian lapak pengepul pisang mentah dalam satu sistem agribisnis yang terintegrasi dan aman.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 xl:gap-4">
                {FEATURE_MODULES.map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <div
                      key={mod.title}
                      className="bg-white/95 border border-stone-200/90 rounded-xl p-4 shadow-2xs flex flex-col gap-2.5"
                    >
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-stone-900 leading-snug">
                          {mod.title}
                        </h3>
                        <p className="text-xs text-stone-500 leading-relaxed mt-1">
                          {mod.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Left Panel Footer */}
            <div className="pt-5 border-t border-stone-200/80 flex items-center justify-between text-xs text-stone-500 font-medium">
              <span>Copyright &copy; 2026 Sumber Sewu. All right reserved.</span>
            </div>
          </div>

          {/* Right Side: ID Karyawan & Password Login Form */}
          <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 xl:p-14 flex flex-col justify-center bg-white">
            <div className="max-w-md w-full mx-auto">
              <div className="mb-5 sm:mb-7 text-center lg:text-left">
                <p className="hidden lg:block text-xs font-semibold text-emerald-700 mb-1.5">
                  Portal Masuk Lapak Pisang Sumber Sewu
                </p>
                <h3 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                  Masuk Akun
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 mt-1">
                  Masukkan ID Karyawan dan kata sandi Anda untuk mulai mengelola lapak.
                </p>
              </div>

              <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5" htmlFor="username">
                    ID Karyawan / Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="username"
                      name="lapak_employee_id"
                      type="text"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="Masukan Username/ID"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5" htmlFor="password">
                    Kata Sandi (Password)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="password"
                      name="lapak_employee_pin"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="off"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="Masukan Password"
                      className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 focus:outline-none cursor-pointer"
                      aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Fixed-height error slot directly below password field to prevent layout shift */}
                  <div
                    role="alert"
                    aria-live="polite"
                    className={`mt-2 h-9 flex items-start gap-1.5 text-xs font-medium text-red-600 leading-tight transition-opacity duration-150 ${
                      error ? 'opacity-100 visible' : 'opacity-0 invisible select-none pointer-events-none'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="line-clamp-2">{error || '\u00A0'}</span>
                  </div>
                </div>

                <div className="!mt-1">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded-xl shadow-md shadow-emerald-900/10 hover:shadow-lg transition flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>Memverifikasi Akun...</span>
                      </>
                    ) : (
                      <>
                        <span>Masuk ke Lapak</span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile & Tablet Page Footer (< lg) */}
      <footer className="lg:hidden py-4 px-4 text-center">
        <p className="text-xs text-stone-500 font-medium">
          Copyright &copy; 2026 Sumber Sewu. All right reserved.
        </p>
      </footer>
    </div>
  );
};
