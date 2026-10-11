'use client';

import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Gauge, 
  Droplet, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  MessageCircle,
  Calendar,
  Navigation,
  ExternalLink,
  X,
  Loader2
} from 'lucide-react';
import IraqiPlateBadge from '@/components/IraqiPlateBadge';
import { getVehicleByQrCode, formatExactDateTime } from '@/services/firestoreService';
import { VehicleDoc, ServiceVisitDoc } from '@/types/firestore';

const WORKSHOP_GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/Hfe2TZ3x96CTq8pH8';

export default function VehiclePublicStatusPage({
  params,
}: {
  params: { token: string };
}) {
  const qrCodeId = params.token;
  const [vehicle, setVehicle] = useState<VehicleDoc | null>(null);
  const [lastVisit, setLastVisit] = useState<ServiceVisitDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getVehicleByQrCode(qrCodeId);
        if (data) {
          setVehicle(data.vehicle);
          setLastVisit(data.lastVisit);
        }
      } catch (err) {
        console.error('Error fetching vehicle by QR code in Firestore:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [qrCodeId]);

  const displayVehicle = vehicle || {
    makeModel: 'تويوتا كامري (Toyota Camry)',
    plateNumber: 'بغداد 48291 أ',
    engineSize: '2.5L 4-سلندر',
    modelYear: 2022,
    lastOdometer: 71350,
    nextOdometer: 74350,
    preferredOil: '10W40 / 5W30',
    preferredFilter: '90915-YZZE2'
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 flex flex-col items-center justify-start p-4 py-8 antialiased">
      <div className="max-w-md w-full space-y-5">
        
        {/* Workshop Header Card */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25 font-black">
            <Droplet className="w-9 h-9 fill-current" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-wide text-slate-950">مركز حسين الاسدي</h1>
          <p className="text-sm text-amber-800 font-black">
            بطاقة الفحص ومتابعة تبديل الزيت الإلكترونية
          </p>
        </div>

        {loading ? (
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-10 text-center space-y-3 shadow-md">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto" />
            <p className="font-black text-base text-slate-700">جاري تحميل بيانات البطاقة الإلكترونية للسيارة...</p>
          </div>
        ) : (
          <>
            {/* Vehicle Identity Badge */}
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-amber-500 via-emerald-500 to-amber-500"></div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-100 pb-4 mb-4 pt-1">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border-2 border-amber-200">
                    <Car className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-950">{displayVehicle.makeModel}</h2>
                    <p className="text-xs font-bold text-slate-600 font-mono">
                      {displayVehicle.engineSize || 'محرك بنزين'} | موديل {displayVehicle.modelYear}
                    </p>
                  </div>
                </div>
                <IraqiPlateBadge plateNumber={displayVehicle.plateNumber} size="md" />
              </div>

              {/* Critical Next Due Service Display */}
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-center space-y-1.5">
                <span className="text-sm text-amber-950 font-black block">
                  موعد الاستحقاق القادم لتبديل الزيت
                </span>
                <div className="text-3xl sm:text-4xl font-black font-mono text-amber-600">
                  {displayVehicle.nextOdometer?.toLocaleString()} <span className="text-base font-sans font-black text-slate-800">كم</span>
                </div>
                <p className="text-sm text-emerald-800 font-black">
                  العيار الموصى به: {displayVehicle.preferredOil || '10W40'}
                </p>
              </div>

              {/* Last Service Details */}
              <div className="mt-4 space-y-3 text-sm text-slate-800">
                {lastVisit?.visitDate && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600 flex items-center gap-1.5 font-black">
                      <Calendar className="w-4 h-4 text-amber-600" /> تاريخ آخر تبديل:
                    </span>
                    <span className="font-mono font-black text-slate-950" dir="ltr">
                      {formatExactDateTime(lastVisit.visitDate)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600 flex items-center gap-1.5 font-black">
                    <Gauge className="w-4 h-4 text-amber-600" /> عداد آخر تبديل:
                  </span>
                  <span className="font-mono font-black text-slate-950">{displayVehicle.lastOdometer?.toLocaleString()} كم</span>
                </div>

                {lastVisit && (
                  <>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600 font-black">زيت المحرك المسجل:</span>
                      <span className="font-black text-slate-950">{lastVisit.oilName} ({lastVisit.viscosity}) - {lastVisit.oilLitersUsed} لتر</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600 font-black">فلتر الزيت:</span>
                      <span className="font-black text-slate-950">{lastVisit.filterCode || '—'}</span>
                    </div>
                    {lastVisit.gearOilName && (
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600 font-black">زيت الكير:</span>
                        <span className="font-black text-amber-800">{lastVisit.gearOilName} ({lastVisit.gearOilViscosity})</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Workshop Location & Navigation Card */}
            <div className="bg-white border-2 border-amber-300 rounded-3xl p-5 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-950 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-red-600" />
                  <span>موقع مركز حسين الاسدي على الخريطة</span>
                </h3>
              </div>

              <p className="text-xs font-bold text-slate-600">
                اضغط على الزر أدناه لاختيار تطبيق الملاحة المفضل لديك (خرائط كوكل، تطبيق Waze، أو خرائط آبل) للوصول المباشر إلى الورشة:
              </p>

              <button
                type="button"
                onClick={() => setMapPickerOpen(true)}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl font-black text-base flex items-center justify-center gap-2.5 shadow-md shadow-amber-500/20 transition"
              >
                <Navigation className="w-5 h-5" />
                <span>فتح موقع الورشة على الخريطة (Google / Waze)</span>
              </button>
            </div>

            {/* Workshop Contact & Direct Links */}
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-md space-y-3">
              <h3 className="text-sm font-black text-slate-950 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>للتواصل المباشر مع مركز حسين الاسدي</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <a
                  href="https://wa.me/9647800505015"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm transition shadow-sm"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>واتساب الورشة</span>
                </a>

                <a
                  href="tel:07800505015"
                  className="flex items-center justify-center gap-2 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-950 rounded-xl font-black text-sm transition border-2 border-slate-300"
                >
                  <Phone className="w-5 h-5 text-amber-600" />
                  <span>اتصال: 07800505015</span>
                </a>
              </div>
            </div>
          </>
        )}

        <p className="text-center text-xs text-slate-500 font-bold">
          تم إنشاء هذه البطاقة إلكترونياً عبر نظام مركز حسين الاسدي الذكي لتبديل الزيوت.
        </p>

      </div>

      {/* Modal: Choose Map Application (Google Maps / Waze / Apple Maps) */}
      {mapPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-950 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-600" />
                <span>اختر تطبيق الخريطة والملاحة</span>
              </h3>
              <button
                type="button"
                onClick={() => setMapPickerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-xs font-bold text-slate-600">
              اختر البرنامج الذي تود استخدامه للاتجاه إلى <strong className="text-slate-900">مركز حسين الاسدي</strong>:
            </p>

            <div className="space-y-2.5">
              {/* Option 1: Google Maps Direct Link */}
              <a
                href={WORKSHOP_GOOGLE_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMapPickerOpen(false)}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm flex items-center justify-between shadow-sm transition"
              >
                <span className="flex items-center gap-2.5">
                  <MapPin className="w-5 h-5" />
                  <span>فتح في خرائط كوكل (Google Maps)</span>
                </span>
                <ExternalLink className="w-4 h-4" />
              </a>

              {/* Option 2: Waze App */}
              <a
                href={`https://waze.com/ul?q=${encodeURIComponent(WORKSHOP_GOOGLE_MAPS_URL)}&navigate=yes`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMapPickerOpen(false)}
                className="w-full py-3.5 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-black text-sm flex items-center justify-between shadow-sm transition"
              >
                <span className="flex items-center gap-2.5">
                  <Navigation className="w-5 h-5" />
                  <span>فتح عبر تطبيق ويز (Waze)</span>
                </span>
                <ExternalLink className="w-4 h-4" />
              </a>

              {/* Option 3: Apple Maps / Default System Map */}
              <a
                href={`https://maps.apple.com/?q=${encodeURIComponent('مركز حسين الاسدي')}&ll=33.3152,44.3661`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  window.open(WORKSHOP_GOOGLE_MAPS_URL, '_blank');
                  setMapPickerOpen(false);
                }}
                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm flex items-center justify-between shadow-sm transition"
              >
                <span className="flex items-center gap-2.5">
                  <MapPin className="w-5 h-5 text-amber-400" />
                  <span>خرائط آبل / المتصفح المباشر</span>
                </span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <button
              type="button"
              onClick={() => setMapPickerOpen(false)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-black text-sm"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
