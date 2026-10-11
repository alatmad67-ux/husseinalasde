import React from 'react';
import { 
  Car, 
  Gauge, 
  Droplet, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  MessageCircle
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

  const displayVehicle = vehicle || {
    makeModel: 'تويوتا كامري (Toyota Camry)',
    plateNumber: 'بغداد 48291 خصوصي',
    engineSize: '2.5L 4-سلندر',
    modelYear: 2021,
    lastOdometer: 71350,
    nextOdometer: 74350,
    preferredOil: '10W40 / 5W30',
    preferredFilter: '90915-YZZE2'
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-start p-4 py-8 antialiased">
      <div className="max-w-md w-full space-y-5">
        
        {/* Workshop Header Card */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25 font-black">
            <Droplet className="w-8 h-8 fill-current" />
          </div>
          <h1 className="text-2xl font-black tracking-wide text-slate-900">مركز حسين الاسدي</h1>
          <p className="text-xs text-amber-700 font-bold">
            بطاقة الفحص ومتابعة تبديل الزيت الإلكترونية
          </p>
        </div>

        {/* Vehicle Identity Badge */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-amber-500"></div>

          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">{displayVehicle.makeModel}</h2>
                <p className="text-xs text-slate-500 font-mono">{displayVehicle.engineSize || 'محرك بنزين'}</p>
              </div>
            </div>
            <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 block font-bold">رقم اللوحة</span>
              <span className="font-mono font-black text-xs text-amber-700">{displayVehicle.plateNumber}</span>
            </div>
          </div>

          {/* Critical Next Due Service Display */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-center space-y-1.5">
            <span className="text-xs text-amber-900 font-bold block">
              موعد الاستحقاق القادم لتبديل الزيت
            </span>
            <div className="text-3xl font-black font-mono text-amber-600">
              {displayVehicle.nextOdometer?.toLocaleString()} <span className="text-sm font-sans font-bold text-slate-700">كم</span>
            </div>
            <p className="text-xs text-emerald-700 font-bold">
              العيار الموصى به: {displayVehicle.preferredOil || '10W40'}
            </p>
          </div>

          {/* Last Service Details */}
          <div className="mt-4 space-y-2.5 text-xs text-slate-700">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5 font-bold">
                <Gauge className="w-3.5 h-3.5 text-amber-600" /> عداد آخر تبديل:
              </span>
              <span className="font-mono font-black text-slate-900">{displayVehicle.lastOdometer?.toLocaleString()} كم</span>
            </div>
            {lastVisit && (
              <>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-bold">زيت المحرك المسجل:</span>
                  <span className="font-black text-slate-900">{lastVisit.oilName} ({lastVisit.viscosity}) - {lastVisit.oilLitersUsed} لتر</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-bold">فلتر الزيت:</span>
                  <span className="font-bold text-slate-900">{lastVisit.filterCode || '—'}</span>
                </div>
                {lastVisit.gearOilName && (
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-bold">زيت الجير:</span>
                    <span className="font-bold text-amber-700">{lastVisit.gearOilName} ({lastVisit.gearOilViscosity})</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Workshop Contact & Direct Links */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-md space-y-3">
          <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>للتواصل المباشر مع مركز حسين الاسدي</span>
          </h3>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <a
              href="https://wa.me/9647800505015"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>واتساب الورشة</span>
            </a>

            <a
              href="tel:07800505015"
              className="flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-black text-xs transition border border-slate-200"
            >
              <Phone className="w-4 h-4 text-amber-600" />
              <span>اتصال: 07800505015</span>
            </a>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 font-medium">
          تم إنشاء هذه البطاقة إلكترونياً عبر نظام مركز حسين الاسدي الذكي لتبديل الزيوت.
        </p>

      </div>
    </div>
  );
}
