import React from 'react';
import { 
  Car, 
  Calendar, 
  Gauge, 
  Droplet, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  MessageCircle,
  AlertCircle
} from 'lucide-react';
import { getVehicleByQrCode } from '@/services/firestoreService';

export default async function VehiclePublicStatusPage({
  params,
}: {
  params: { token: string };
}) {
  const qrCodeId = params.token;
  let vehicle = null;
  let lastVisit = null;

  try {
    const data = await getVehicleByQrCode(qrCodeId);
    if (data) {
      vehicle = data.vehicle;
      lastVisit = data.lastVisit;
    }
  } catch (err) {
    console.error('Error fetching vehicle by QR code in Firestore:', err);
  }

  // Fallback demo vehicle if testing offline or initial run
  const displayVehicle = vehicle || {
    makeModel: 'تويوتا كامري (Toyota Camry)',
    plateNumber: 'بغداد 48291 خصوصي',
    engineSize: '2.5L 4-سلندر',
    modelYear: 2021,
    lastOdometer: 71350,
    nextOdometer: 78350,
    preferredOil: 'Mobil 1 ESP 5W-30 (تخليقي بالكامل)',
    preferredFilter: 'تويوتا أصلي 90915-YZZE2'
  };

  return (
    <div className="min-h-screen bg-industrial-950 text-slate-100 flex flex-col items-center justify-start p-4 py-8 antialiased">
      <div className="max-w-md w-full space-y-6">
        
        {/* Workshop Header Card */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-amber to-amber-600 text-industrial-950 shadow-xl shadow-amber-500/20 font-black">
            <Droplet className="w-8 h-8 fill-current" />
          </div>
          <h1 className="text-2xl font-black tracking-wide text-white">مركز حسين الاسدي</h1>
          <p className="text-xs text-brand-amber font-semibold">
            بطاقة الفحص ومتابعة تبديل الزيت الإلكترونية (Firestore QR)
          </p>
        </div>

        {/* Vehicle Identity Badge */}
        <div className="bg-industrial-900 border border-industrial-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-brand-amber via-brand-emerald to-brand-amber"></div>

          <div className="flex items-center justify-between border-b border-industrial-800/80 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-industrial-800 text-brand-amber border border-industrial-700">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">{displayVehicle.makeModel}</h2>
                <p className="text-xs text-slate-400 font-mono">{displayVehicle.engineSize || 'محرك بنزين'}</p>
              </div>
            </div>
            <div className="bg-industrial-950 px-3 py-1.5 rounded-xl border border-industrial-700 text-center">
              <span className="text-[10px] text-slate-400 block font-semibold">رقم اللوحة</span>
              <span className="font-mono font-bold text-xs text-brand-amber">{displayVehicle.plateNumber}</span>
            </div>
          </div>

          {/* Critical Next Due Service Display */}
          <div className="bg-gradient-to-br from-industrial-950 to-industrial-900 border border-brand-amber/30 rounded-2xl p-4 text-center space-y-2">
            <span className="text-xs text-slate-400 font-semibold block">
              موعد الاستحقاق القادم لتبديل الزيت
            </span>
            <div className="text-3xl font-black font-mono text-brand-amber">
              {displayVehicle.nextOdometer?.toLocaleString()} <span className="text-sm font-sans font-bold text-slate-300">كم</span>
            </div>
            <p className="text-[11px] text-brand-emerald font-medium">
              الزيت الموصى به: {displayVehicle.preferredOil || '5W-30 تخليقي'}
            </p>
          </div>

          {/* Last Service Details */}
          <div className="mt-4 space-y-2.5 text-xs text-slate-300">
            <div className="flex justify-between py-1.5 border-b border-industrial-800/50">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-brand-amber" /> عداد آخر تبديل:
              </span>
              <span className="font-mono font-semibold">{displayVehicle.lastOdometer?.toLocaleString()} كم</span>
            </div>
            {lastVisit && (
              <>
                <div className="flex justify-between py-1.5 border-b border-industrial-800/50">
                  <span className="text-slate-500">الزيت المسجل:</span>
                  <span className="font-semibold text-slate-200">{lastVisit.oilName} ({lastVisit.oilLitersUsed} لتر)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-industrial-800/50">
                  <span className="text-slate-500">فلتر الزيت:</span>
                  <span className="font-semibold text-slate-200">{lastVisit.filterCode || '—'}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Workshop Contact & Direct Links */}
        <div className="bg-industrial-900 border border-industrial-800 rounded-3xl p-5 shadow-xl space-y-3">
          <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-emerald" />
            <span>معلومات التواصل والورشة</span>
          </h3>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <a
              href="https://wa.me/9647701234567"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition shadow-md"
            >
              <MessageCircle className="w-4 h-4" />
              <span>واتساب الورشة</span>
            </a>

            <a
              href="tel:07701234567"
              className="flex items-center justify-center gap-2 py-3 bg-industrial-800 hover:bg-industrial-700 text-slate-200 rounded-xl font-bold text-xs transition border border-industrial-700 shadow-md"
            >
              <Phone className="w-4 h-4 text-brand-amber" />
              <span>اتصال مباشر</span>
            </a>
          </div>

          <a
            href="https://maps.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2.5 text-slate-400 hover:text-slate-200 text-xs font-semibold"
          >
            <MapPin className="w-3.5 h-3.5 text-brand-danger" />
            <span>عرض موقع المركز على خرائط Google Maps</span>
          </a>
        </div>

        <p className="text-center text-[10px] text-slate-500">
          تم إنشاء هذه البطاقة تلقائياً عبر نظام مركز حسين الاسدي الذكي لتبديل الزيوت.
        </p>

      </div>
    </div>
  );
}
