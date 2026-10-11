'use client';

import React, { useState } from 'react';
import { QrCode, Copy, Check, MessageCircle, ExternalLink, X, Car } from 'lucide-react';
import IraqiPlateBadge from './IraqiPlateBadge';
import { VehicleDoc, ServiceVisitDoc, CustomerDoc } from '@/types/firestore';

interface QrShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: VehicleDoc | null;
  customer?: CustomerDoc | null;
  customerName?: string;
  customerPhone?: string;
  lastVisit?: ServiceVisitDoc | null;
}

export default function QrShareModal({
  isOpen,
  onClose,
  vehicle,
  customer,
  customerName: propCustomerName,
  customerPhone: propCustomerPhone,
  lastVisit
}: QrShareModalProps) {
  const [copied, setCopied] = useState(false);
  const customerName = propCustomerName || customer?.fullName || '';
  const customerPhone = propCustomerPhone || customer?.phoneNumber || '';

  if (!isOpen || !vehicle) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://husseinalasde.vercel.app';
  const cardUrl = `${origin}/public/vehicle/${vehicle.qrCodeId}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(cardUrl)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(cardUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback copy
      const input = document.createElement('input');
      input.value = cardUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleSendWhatsAppLink = () => {
    const oilInfo = lastVisit
      ? `${lastVisit.oilName} (${lastVisit.viscosity || ''}) - ${lastVisit.oilLitersUsed} لتر`
      : `${vehicle.preferredOilName || ''} (${vehicle.preferredOil || 'قياسي'}) ${vehicle.recommendedLiters ? `- ${vehicle.recommendedLiters} لتر` : ''}`;

    const filterInfo = lastVisit?.filterCode || vehicle.preferredFilter || '—';

    const msg =
      `السلام عليكم أخي العزيز *${customerName || 'المحترم'}* 🌹%0A` +
      `تحية طيبة من *مركز حسين الأسدي لخدمات المحركات وتبديل الزيوت*%0A` +
      `────────────────────%0A` +
      `🚗 *السيارة:* ${vehicle.makeModel} (${vehicle.plateNumber})%0A` +
      `⏲️ *العداد الحالي:* ${(lastVisit?.currentOdometer ?? vehicle.lastOdometer ?? 0).toLocaleString()} كم%0A` +
      `🔔 *موعد تبديل الزيت القادم:* ${(lastVisit?.nextOdometer ?? vehicle.nextOdometer ?? 0).toLocaleString()} كم%0A` +
      `🛢️ *الزيت المعتمد:* ${oilInfo}%0A` +
      `🔧 *الفلتر:* ${filterInfo}%0A` +
      `────────────────────%0A` +
      `📱 *رابط بطاقة سيارتك الإلكترونية (لمتابعة العداد القادم وسجل التبديل وموقع الورشة في أي وقت):*%0A` +
      `${cardUrl}%0A` +
      `────────────────────%0A` +
      `📍 *موقع المركز على الخريطة:*%0Ahttps://maps.app.goo.gl/Hfe2TZ3x96CTq8pH8%0A` +
      `📞 *هاتف المركز:* 07800505015`;

    const cleanPhone = (customerPhone || '').replace(/\D/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? `964${cleanPhone.substring(1)}` : cleanPhone;
    const targetUrl = intlPhone
      ? `https://wa.me/${intlPhone}?text=${msg}`
      : `https://wa.me/?text=${msg}`;

    window.open(targetUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[94vh] overflow-y-auto">
        
        <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
          <h3 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <QrCode className="w-6 h-6 text-amber-600" />
            <span>البطاقة الإلكترونية والـ QR للزبون</span>
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Vehicle Summary */}
        <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-slate-500 block">الزبون: {customerName || '—'}</span>
            <span className="font-black text-slate-950 text-base flex items-center gap-1.5 mt-0.5">
              <Car className="w-4 h-4 text-amber-600" />
              {vehicle.makeModel}
            </span>
          </div>
          <IraqiPlateBadge plateNumber={vehicle.plateNumber} size="sm" />
        </div>

        {/* Scannable QR Code Box */}
        <div className="bg-white border-2 border-amber-300 rounded-2xl p-5 text-center space-y-3 shadow-inner">
          <p className="text-xs font-black text-amber-950">
            يمكن للزبون مسح هذا الكيو آر بكاميرا الموبايل مباشرة أو فتح الرابط أدناه:
          </p>
          <div className="w-52 h-52 mx-auto bg-white p-2 rounded-2xl border-2 border-slate-200 flex items-center justify-center">
            <img
              src={qrImageUrl}
              alt="QR Code"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-amber-50 p-2.5 rounded-xl border border-amber-200">
            <div>
              <span className="text-slate-500 font-sans font-bold block">العداد الحالي</span>
              <strong className="font-black text-slate-950 text-sm">
                {(lastVisit?.currentOdometer ?? vehicle.lastOdometer ?? 0).toLocaleString()} كم
              </strong>
            </div>
            <div className="border-r border-amber-200">
              <span className="text-emerald-800 font-sans font-bold block">العداد القادم</span>
              <strong className="font-black text-emerald-700 text-sm">
                {(lastVisit?.nextOdometer ?? vehicle.nextOdometer ?? 0).toLocaleString()} كم
              </strong>
            </div>
          </div>
        </div>

        {/* Direct Link & Copy Box */}
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-700 block">
            رابط البطاقة المباشر للزبون:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              dir="ltr"
              value={cardUrl}
              className="flex-1 bg-slate-100 border-2 border-slate-300 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-slate-800 select-all"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'تم النسخ!' : 'نسخ الرابط'}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={handleSendWhatsAppLink}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition"
          >
            <MessageCircle className="w-5 h-5" />
            <span>إرسال الرابط وتفاصيل التبديل إلى واتساب الزبون</span>
          </button>

          <a
            href={cardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-amber-50 hover:bg-amber-100 text-amber-950 border-2 border-amber-300 font-black rounded-xl flex items-center justify-center gap-2 text-xs transition"
          >
            <ExternalLink className="w-4 h-4 text-amber-700" />
            <span>فتح معاينة صفحة البطاقة كما يراها الزبون</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
}
