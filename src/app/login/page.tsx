'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock, Phone, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('07800505015');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const success = login(phoneNumber, password);
      if (!success) {
        setError('رقم الهاتف أو كلمة المرور غير صحيحة. يرجى التأكد من البيانات.');
        setIsLoading(false);
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl">
        
        {/* Header with Official Logo */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-3xl overflow-hidden border-2 border-amber-500 bg-slate-950 shadow-xl shadow-amber-500/20">
            <img
              src="/logo.jpg"
              alt="شعار مركز حسين الأسدي"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wide text-slate-950">مركز حسين الأسدي</h1>
            <p className="text-sm text-amber-600 font-black mt-1 flex items-center justify-center gap-1">
              <ShieldCheck className="w-4 h-4" /> بوابة تسجيل دخول الإدارة والورشة
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span className="font-black">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-black text-slate-800 mb-1.5">
              رقم هاتف الإدارة
            </label>
            <div className="relative">
              <Phone className="absolute right-3.5 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="07800505015"
                required
                className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl pr-11 pl-4 py-3 text-slate-950 font-mono text-base placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition font-black"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-black text-slate-800 mb-1.5">
              رمز الدخول السري
            </label>
            <div className="relative">
              <Lock className="absolute right-3.5 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl pr-11 pl-4 py-3 text-slate-950 font-mono text-base placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition font-black"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black rounded-xl flex items-center justify-center gap-2 transition text-base shadow-lg shadow-amber-500/25 mt-2"
          >
            <span>{isLoading ? 'جاري التحقق...' : 'تسجيل الدخول للنظام'}</span>
            <ArrowLeft className="w-5 h-5" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-xs font-bold text-slate-500">
            * هذا النظام محمي ومخصص لـ <strong>مركز حسين الأسدي</strong>. يمكن للزبائن مسح ملصقات الـ QR مباشرة دون الحاجة لحساب.
          </p>
        </div>

      </div>
    </div>
  );
}
