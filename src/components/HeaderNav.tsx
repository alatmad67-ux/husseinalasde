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
  LogOut,
  BarChart3
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
    { href: '/customers', label: 'الزبائن والديون', icon: Users },
    { href: '/reports', label: 'الأرباح والتقارير', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b-2 border-slate-200 shadow-sm backdrop-blur-md print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Workshop Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 text-white font-black text-2xl">
              <Droplet className="w-7 h-7 fill-current" />
            </div>
            <div>
              <h1 className="font-black text-xl leading-tight tracking-wide text-slate-950">
                مركز حسين الاسدي
              </h1>
              <p className="text-xs sm:text-sm text-amber-600 font-black flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-4 h-4" /> لخدمات المحركات وتبديل الزيوت
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-black transition-all ${
                    isActive
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  <Icon className="w-5 h-5" />
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
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-sm font-black transition shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>تثبيت التطبيق</span>
              </button>
            )}
            <Link
              href="/public/vehicle/camry-48291-asadi"
              target="_blank"
              className="hidden xl:flex items-center gap-1.5 text-sm text-slate-700 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-200 font-black transition"
            >
              <Car className="w-4 h-4 text-amber-600" />
              <span>ملصق QR</span>
            </Link>

            {isAuthenticated && (
              <button
                onClick={logout}
                title="تسجيل الخروج"
                className="flex items-center gap-1.5 text-sm text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3.5 py-2 rounded-xl border border-red-200 transition font-black"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            )}
          </div>

        </div>

        {/* Mobile / Tablet Sub-Nav */}
        <div className="flex lg:hidden border-t border-slate-200 py-2.5 gap-2 overflow-x-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-black whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

      </div>
    </header>
  );
}
