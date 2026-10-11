'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Wrench, 
  ShoppingCart, 
  Droplet, 
  Users, 
  Download, 
  ShieldCheck, 
  Car,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function HeaderNav() {
  const pathname = usePathname();
  const { isAuthenticated, logout } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstall(false);
    }
    setDeferredPrompt(null);
  };

  const navLinks = [
    { href: '/', label: 'كاونتر تبديل الزيت', icon: Wrench },
    { href: '/direct-sales', label: 'البيع المباشر', icon: ShoppingCart },
    { href: '/inventory', label: 'المخزون والمنتجات', icon: Droplet },
    { href: '/customers', label: 'ملف الزبائن والديون', icon: Users },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Workshop Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 text-white font-black text-xl">
              <Droplet className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h1 className="font-black text-lg leading-tight tracking-wide text-slate-900">
                مركز حسين الاسدي
              </h1>
              <p className="text-xs text-amber-600 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> لخدمات المحركات وتبديل الزيوت
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-amber-50 text-amber-700 border border-amber-300 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* PWA Install Button & Fast Actions */}
          <div className="flex items-center gap-2">
            {canInstall && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>تثبيت التطبيق</span>
              </button>
            )}
            <Link
              href="/public/vehicle/camry-48291-asadi"
              target="_blank"
              className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-200 font-bold transition"
            >
              <Car className="w-3.5 h-3.5 text-amber-600" />
              <span>معاينة ملصق QR</span>
            </Link>

            {isAuthenticated && (
              <button
                onClick={logout}
                title="تسجيل الخروج"
                className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl border border-red-200 transition font-bold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            )}
          </div>

        </div>

        {/* Mobile Sub-Nav */}
        <div className="flex md:hidden border-t border-slate-100 py-2 gap-1.5 overflow-x-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-50 text-amber-700 border border-amber-300'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

      </div>
    </header>
  );
}
