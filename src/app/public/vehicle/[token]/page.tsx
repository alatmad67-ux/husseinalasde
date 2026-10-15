'use client';

import React, { useState, useEffect } from 'react';
import {
  Car,
  Gauge,
  Phone,
  MapPin,
  ShieldCheck,
  MessageCircle,
  Calendar,
  Navigation,
  ExternalLink,
  X,
  Loader2,
  AlertCircle,
  Droplets,
  Wrench,
  History,
  User,
  Copy,
  Check
} from 'lucide-react';
import IraqiPlateBadge from '@/components/IraqiPlateBadge';
import { getVehicleByQrCode, formatExactDateTime } from '@/services/firestoreService';
import { VehicleDoc, ServiceVisitDoc, CustomerDoc } from '@/types/firestore';

const WORKSHOP_GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/Hfe2TZ3x96CTq8pH8';

export default function VehiclePublicStatusPage({
  params,
}: {
  params: { token: string };
}) {
  const qrCodeId = decodeURIComponent(params.token || '');
  const [vehicle, setVehicle] = useState<VehicleDoc | null>(null);
  const [customer, setCustomer] = useState<CustomerDoc | null>(null);
  const [lastVisit, setLastVisit] = useState<ServiceVisitDoc | null>(null);
  const [history, setHistory] = useState<ServiceVisitDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getVehicleByQrCode(qrCodeId);
        if (data) {
          setVehicle(data.vehicle);
          setCustomer(data.customer || null);
          setLastVisit(data.lastVisit);
          setHistory(data.history || []);
        }
      } catch (err) {
        console.error('Error fetching vehicle by QR code in Firestore:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [qrCodeId]);

  const handleCopyPageLink = async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 flex flex-col items-center justify-start p-4 py-8 antialiased">
      <div className="max-w-md w-full space-y-5">

        {/* Workshop Header Card with Official Logo */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl overflow-hidden border-2 border-amber-500 bg-slate-950 shadow-xl shadow-amber-500/25">
            <img
              src="/logo.jpg"
              alt="شعار مركز حسين الأسدي"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-wide text-slate-950">مركز حسين الأسدي</h1>
          <p className="text-sm text-amber-800 font-black">
            البطاقة الإلكترونية لمتابعة تبديل الزيت والعداد
          </p>
        </div>

        {loading ? (
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-10 text-center space-y-3 shadow-md">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto" />
            <p className="font-black text-base text-slate-700">جاري تحميل بيانات البطاقة الإلكترونية للسيارة...</p>
          </div>
        ) : !vehicle ? (
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 text-center space-y-3 shadow-md">
            <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
            <h2 className="text-lg font-black text-slate-950">لم يتم العثور على بيانات هذه البطاقة</h2>
            <p className="text-sm font-bold text-slate-600">
              يرجى مراجعة مركز حسين الأسدي لتحديث الرابط أو رمز الـ QR الخاص بسيارتك.
            </p>
          </div>
        ) : (
          <>
            {/* Vehicle & Customer Identity Badge */}
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-lg relative overflow-hidden space-y-4">
              <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-amber-500 via-emerald-500 to-amber-500"></div>

              {customer && (
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 mt-1">
                  <span className="text-xs font-black text-slate-500 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-amber-600" />
                    اسم الزبون:
                  </span>
                  <span className="text-base font-black text-slate-950">{customer.fullName}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border-2 border-amber-200">
                    <Car className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-950">{vehicle.makeModel}</h2>
                    <p className="text-xs font-bold text-slate-600 font-mono">
                      {vehicle.engineSize || 'محرك بنزين'} | موديل {vehicle.modelYear}
                    </p>
                  </div>
                </div>
                <IraqiPlateBadge plateNumber={vehicle.plateNumber} size="md" />
              </div>

              {/* Current Odometer & Next Odometer Side-by-Side */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-100 border-2 border-slate-300 rounded-2xl p-3.5 text-center space-y-1">
                  <span className="text-xs font-black text-slate-600 flex items-center justify-center gap-1">
                    <Gauge className="w-4 h-4 text-slate-700" />
                    العداد الحالي (آخر تبديل)
                  </span>
                  <div className="text-2xl font-black font-mono text-slate-950">
                    {(lastVisit?.currentOdometer || vehicle.lastOdometer || 0).toLocaleString()}
                    <span className="text-xs font-sans mr-1">كم</span>
                  </div>
                </div>

                <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-3.5 text-center space-y-1 shadow-sm">
                  <span className="text-xs font-black text-amber-950 flex items-center justify-center gap-1">
                    <Gauge className="w-4 h-4 text-amber-600" />
                    موعد التبديل القادم
                  </span>
                  <div className="text-2xl font-black font-mono text-amber-700">
                    {(lastVisit?.nextOdometer || vehicle.nextOdometer || 0).toLocaleString()}
                    <span className="text-xs font-sans mr-1">كم</span>
                  </div>
                </div>
              </div>

              {/* Last Operation Details Box (شنو سوه بآخر عملية) */}
              <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                  <h3 className="text-sm font-black text-emerald-950 flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-emerald-700" />
                    <span>تفاصيل آخر عملية تبديل وما تم عمله</span>
                  </h3>
                  {lastVisit?.visitDate && (
                    <span className="text-xs font-mono font-black text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-200" dir="ltr">
                      {formatExactDateTime(lastVisit.visitDate)}
                    </span>
                  )}
                </div>

                {lastVisit ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-emerald-200">
                      <span className="text-slate-600 font-black flex items-center gap-1.5">
                        <Droplets className="w-4 h-4 text-amber-600" />
                        زيت المحرك واللتر:
                      </span>
                      <span className="font-black text-slate-950">
                        {lastVisit.oilName} {lastVisit.viscosity ? `(${lastVisit.viscosity})` : ''} — {lastVisit.oilLitersUsed} لتر
                      </span>
                    </div>

                    <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-emerald-200">
                      <span className="text-slate-600 font-black">فلتر الزيت:</span>
                      <span className="font-black text-slate-950">
                        {lastVisit.filterCode || 'لم يتم تبديل فلتر'}
                      </span>
                    </div>

                    {(lastVisit.gearOilName || lastVisit.gearOilDetails) && (
                      <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-amber-200">
                        <span className="text-slate-600 font-black">زيت الكير:</span>
                        <span className="font-black text-amber-900">
                          {lastVisit.gearOilName || lastVisit.gearOilDetails}
                          {lastVisit.gearOilViscosity ? ` (${lastVisit.gearOilViscosity})` : ''}
                          {lastVisit.gearOilLitersUsed ? ` — ${lastVisit.gearOilLitersUsed} لتر` : ''}
                        </span>
                      </div>
                    )}

                    {lastVisit.extraItems && lastVisit.extraItems.length > 0 && (
                      <div className="bg-white p-2.5 rounded-xl border border-emerald-200 space-y-1">
                        <span className="text-slate-600 font-black block text-xs">مواد وقطع إضافية:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {lastVisit.extraItems.map((item, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-lg text-xs font-bold">
                              • {item.name} {item.size ? `(${item.size})` : ''} ×{item.quantity} ({item.totalPrice.toLocaleString()} د.ع)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {lastVisit.additionalServices && lastVisit.additionalServices.length > 0 && (
                      <div className="bg-white p-2.5 rounded-xl border border-amber-200 space-y-1">
                        <span className="text-amber-950 font-black block text-xs">أعمال وأجور إضافية:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {lastVisit.additionalServices.map((srv, idx) => (
                            <span key={idx} className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded-lg text-xs font-bold border border-amber-200">
                              🔧 {srv.description} ({srv.price.toLocaleString()} د.ع)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {lastVisit.technicalNotes && (
                      <div className="bg-amber-50 p-3 rounded-xl border border-amber-300 text-xs font-black text-amber-950">
                        🔧 ملاحظات الفحص والعمل المنجز: {lastVisit.technicalNotes}
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-emerald-200 text-xs font-black">
                      <span className="text-slate-700">قيمة الفاتورة: {Number(lastVisit.totalPrice || 0).toLocaleString()} د.ع</span>
                      <span className="text-emerald-800">الواصل: {Number(lastVisit.paidAmount || 0).toLocaleString()} د.ع</span>
                      {Number(lastVisit.debtAmount || 0) > 0 && (
                        <span className="text-red-600">المتبقي: {Number(lastVisit.debtAmount).toLocaleString()} د.ع</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs font-bold text-slate-600 py-2 space-y-1">
                    <p>العيار الموصى به للسيارة: <strong className="text-slate-950">{vehicle.preferredOilName || ''} {vehicle.preferredOil || 'قياسي'}</strong></p>
                    {vehicle.recommendedLiters && <p>كمية الزيت الموصى بها: <strong className="text-slate-950">{vehicle.recommendedLiters} لتر</strong></p>}
                    {vehicle.preferredFilter && <p>نوع الفلتر: <strong className="text-slate-950">{vehicle.preferredFilter}</strong></p>}
                  </div>
                )}
              </div>

              {/* Copy Link Button for Customer */}
              <button
                type="button"
                onClick={handleCopyPageLink}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl font-black text-xs text-slate-800 flex items-center justify-center gap-2 transition"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                <span>{copiedLink ? 'تم نسخ رابط البطاقة بنجاح!' : 'نسخ رابط هذه البطاقة للاحتفاظ به'}</span>
              </button>
            </div>

            {/* Previous Operations History (إذا كان هناك أكثر من زيارة سابقة) */}
            {history.length > 1 && (
              <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-md space-y-3">
                <h3 className="text-sm font-black text-slate-950 flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-600" />
                  <span>سجل عمليات التبديل السابقة ({history.length})</span>
                </h3>
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {history.slice(1).map((v, idx) => (
                    <div key={v.id || idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs space-y-1">
                      <div className="flex justify-between items-center font-black text-slate-900">
                        <span>{v.oilName} ({v.viscosity}) — {v.oilLitersUsed} لتر</span>
                        <span className="font-mono text-[11px] text-slate-600" dir="ltr">{formatExactDateTime(v.visitDate)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 font-bold">
                        <span>العداد وقتها: {v.currentOdometer?.toLocaleString()} كم</span>
                        <span>الفلتر: {v.filterCode || '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Workshop Location & Navigation Card */}
        <div className="bg-white border-2 border-amber-300 rounded-3xl p-5 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-950 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-600" />
              <span>موقع مركز حسين الأسدي على الخريطة</span>
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
            <span>للتواصل المباشر مع مركز حسين الأسدي</span>
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

        <p className="text-center text-xs text-slate-500 font-bold">
          تم إنشاء هذه البطاقة إلكترونياً عبر نظام مركز حسين الأسدي الذكي لتبديل الزيوت.
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
              اختر البرنامج الذي تود استخدامه للاتجاه إلى <strong className="text-slate-900">مركز حسين الأسدي</strong>:
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
                href={`https://maps.apple.com/?q=${encodeURIComponent('مركز حسين الأسدي')}&ll=33.3152,44.3661`}
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
