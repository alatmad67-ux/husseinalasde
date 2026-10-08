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
    // Register Service Worker for PWA
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
    { href: '/inventory', label: 'المخزون باللتر', icon: Droplet },
    { href: '/customers', label: 'ملف الزبائن والديون', icon: Users },
  ];

  return (
    <header className="sticky top-0 z-50 bg-industrial-900 border-b border-industrial-800 shadow-xl backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Workshop Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-amber to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-industrial-950 font-black text-xl">
              <Droplet className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-wide text-white">
                مركز حسين الاسدي
              </h1>
              <p className="text-xs text-brand-amber font-medium flex items-center gap-1">
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
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-industrial-800 text-brand-amber border border-brand-amber/30 shadow-inner'
                      : 'text-slate-300 hover:bg-industrial-800/60 hover:text-white'
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
                className="flex items-center gap-2 bg-brand-emerald hover:bg-brand-emeraldHover text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-lg shadow-emerald-500/20 animate-pulse"
              >
                <Download className="w-4 h-4" />
                <span>تثبيت التطبيق (PWA)</span>
              </button>
            )}
            <Link
              href="/public/vehicle/camry-48291-asadi"
              target="_blank"
              className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 bg-industrial-800/80 px-2.5 py-1.5 rounded-lg border border-industrial-700 hover:text-slate-200 transition"
            >
              <Car className="w-3.5 h-3.5 text-brand-amber" />
              <span>معاينة ملصق QR</span>
            </Link>

            {isAuthenticated && (
              <button
                onClick={logout}
                title="تسجيل الخروج"
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-industrial-800/80 hover:bg-red-950/40 px-2.5 py-1.5 rounded-lg border border-red-900/50 transition font-bold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            )}
          </div>

        </div>

        {/* Mobile Sub-Nav */}
        <div className="flex md:hidden border-t border-industrial-800 py-2 gap-1 overflow-x-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  isActive
                    ? 'bg-industrial-800 text-brand-amber border border-brand-amber/40'
                    : 'text-slate-400 hover:text-white'
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
