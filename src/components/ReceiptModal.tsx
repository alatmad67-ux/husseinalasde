'use client';

import React, { useState } from 'react';
import { Printer, MessageCircle, X, CheckCircle, Copy, Check, QrCode, ExternalLink } from 'lucide-react';
import IraqiPlateBadge from './IraqiPlateBadge';

export interface ReceiptData {
  receiptNumber: string;
  dateTimeStr: string;
  customerName: string;
  customerPhone: string;
  vehicleModel: string;
  plateNumber: string;
  currentOdometer: number;
  nextOdometer: number;
  items: {
    label: string;
    qty: string;
    price: number;
  }[];
  totalPrice: number;
  paidAmount: number;
  debtAmount: number;
  techNotes?: string;
  qrCodeId?: string;
}

interface ReceiptModalProps {
  isOpen?: boolean;
  data: ReceiptData | null;
  onClose: () => void;
}

export default function ReceiptModal({ isOpen, data, onClose }: ReceiptModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  if (isOpen === false || !data) return null;

  const publicCardUrl =
    typeof window !== 'undefined' && data.qrCodeId
      ? `${window.location.origin}/public/vehicle/${encodeURIComponent(data.qrCodeId)}`
      : data.qrCodeId
      ? `/public/vehicle/${encodeURIComponent(data.qrCodeId)}`
      : '';

  const qrImageUrl = publicCardUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(publicCardUrl)}`
    : '';

  const handleThermalPrint = () => {
    window.print();
  };

  const handleCopyCardLink = async () => {
    if (!publicCardUrl) return;
    try {
      await navigator.clipboard.writeText(publicCardUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleSendWhatsAppReceipt = () => {
    const itemsLines = data.items
      .map((i) => `• ${i.label} (${i.qty}): ${i.price.toLocaleString()} د.ع`)
      .join('%0A');

    const cardLinkSection = publicCardUrl
      ? `────────────────────%0A🔗 *رابط بطاقة سيارتك الإلكترونية (لمتابعة العداد، آخر عملية تبديل، وموقع المركز):*%0A${encodeURIComponent(publicCardUrl)}%0A`
      : '';

    const msg =
      `*مركز حسين الاسدي لخدمات وتبديل الزيوت*%0A` +
      `────────────────────%0A` +
      `📄 *وصل فاتورة رقم:* ${data.receiptNumber}%0A` +
      `📅 *التاريخ والوقت:* ${data.dateTimeStr}%0A` +
      `👤 *الزبون:* ${data.customerName}%0A` +
      `🚗 *السيارة:* ${data.vehicleModel} (${data.plateNumber})%0A` +
      `⏲️ *العداد الحالي:* ${data.currentOdometer.toLocaleString()} كم%0A` +
      `🔔 *موعد التبديل القادم:* ${data.nextOdometer.toLocaleString()} كم%0A` +
      `────────────────────%0A` +
      `*التفاصيل والمواد:*%0A${itemsLines}%0A` +
      `────────────────────%0A` +
      `💰 *المبلغ الإجمالي:* ${data.totalPrice.toLocaleString()} د.ع%0A` +
      `✅ *المبلغ الواصل:* ${data.paidAmount.toLocaleString()} د.ع%0A` +
      `📌 *المتبقي (دين):* ${data.debtAmount.toLocaleString()} د.ع%0A` +
      (data.techNotes ? `🔧 *ملاحظات الفحص:* ${data.techNotes}%0A` : '') +
      cardLinkSection +
      `────────────────────%0A` +
      `📍 *موقع المركز على الخريطة:*%0Ahttps://maps.app.goo.gl/Hfe2TZ3x96CTq8pH8%0A` +
      `📞 *هاتف المركز:* 07800505015%0A` +
      `شكراً لزيارتكم مركز حسين الاسدي!`;

    const cleanPhone = data.customerPhone.replace(/\s+/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? `964${cleanPhone.substring(1)}` : cleanPhone;
    window.open(`https://wa.me/${intlPhone}?text=${msg}`, '_blank');
  };

  // Extract clean Date and Time components from dateTimeStr
  let datePart = '';
  let timePart = '';
  if (data.dateTimeStr) {
    if (data.dateTimeStr.includes(' - ')) {
      const parts = data.dateTimeStr.split(' - ');
      datePart = parts[0]?.trim() || '';
      timePart = parts[1]?.trim() || '';
    } else if (data.dateTimeStr.includes('،')) {
      const parts = data.dateTimeStr.split('،');
      datePart = parts[0]?.trim() || '';
      timePart = parts[1]?.trim() || '';
    } else if (data.dateTimeStr.includes(',')) {
      const parts = data.dateTimeStr.split(',');
      datePart = parts[0]?.trim() || '';
      timePart = parts[1]?.trim() || '';
    } else {
      const match = data.dateTimeStr.match(/^(\S+)\s+(.+)$/);
      if (match) {
        datePart = match[1];
        timePart = match[2];
      } else {
        datePart = data.dateTimeStr;
      }
    }
  }
  if (!datePart) {
    datePart = new Date().toLocaleDateString('ar-IQ');
  }
  if (!timePart) {
    timePart = new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
  }

  const saleType =
    data.debtAmount > 0
      ? data.paidAmount > 0
        ? 'نقدي + آجل'
        : 'آجل (دين)'
      : 'نقدي';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[94vh] overflow-y-auto">
        
        {/* Top Action Header (Hidden during print) */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-3 print:hidden">
          <div className="flex items-center gap-2 text-emerald-700 font-black text-base">
            <CheckCircle className="w-6 h-6" />
            <span>تم حفظ العملية - خيارات الوصل والرابط</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Printable Thermal Receipt Box */}
        <div id="printable-receipt" className="bg-white border-2 border-dashed border-slate-400 rounded-2xl p-5 text-slate-950 space-y-4 text-sm">
          
          <div className="text-center border-b-2 border-slate-900 pb-3 space-y-1.5">
            <div className="w-16 h-16 mx-auto rounded-2xl overflow-hidden border border-amber-500 bg-slate-950">
              <img src="/logo.jpg" alt="شعار مركز حسين الأسدي" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-xl font-black">مركز حسين الأسدي</h2>
            <p className="text-xs font-bold text-slate-700">لخدمات المحركات وتبديل الزيوت والفلاتر</p>
            <p className="text-xs font-mono font-bold">هاتف: 07800505015</p>
          </div>

          {/* Invoice Information Bar - Matching Reference Layout */}
          <div className="relative border border-slate-300 rounded-2xl bg-slate-50/50 p-3 pt-4 space-y-2.5 text-xs">
            {/* Centered Floating Pill Badge */}
            <div className="flex justify-center -mt-6 mb-1">
              <span className="bg-slate-950 text-white text-[11px] font-black px-6 py-0.5 rounded-full shadow-sm tracking-wider">
                فاتورة مبيعات
              </span>
            </div>

            {/* Grid Fields */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Row 1 / Col 1: رقم الفاتورة */}
              <div className="space-y-0.5">
                <span className="text-slate-500 font-bold block text-[11px]">رقم الفاتورة:</span>
                <span className="font-mono font-black text-slate-950 text-xs block">{data.receiptNumber}</span>
              </div>

              {/* Row 1 / Col 2: التاريخ */}
              <div className="space-y-0.5">
                <span className="text-slate-500 font-bold block text-[11px]">التاريخ:</span>
                <span className="font-mono font-bold text-slate-950 text-xs block">{datePart}</span>
              </div>

              {/* Row 1 / Col 3: الوقت */}
              <div className="space-y-0.5">
                <span className="text-slate-500 font-bold block text-[11px]">الوقت:</span>
                <span className="font-mono font-bold text-slate-950 text-xs block">{timePart}</span>
              </div>

              {/* Row 1 / Col 4: نوع البيع */}
              <div className="space-y-0.5">
                <span className="text-slate-500 font-bold block text-[11px]">نوع البيع:</span>
                <span className="font-black text-slate-950 text-xs block">{saleType}</span>
              </div>

              {/* Row 2 / Col 1: اسم الزبون */}
              <div className="space-y-0.5">
                <span className="text-slate-500 font-bold block text-[11px]">اسم الزبون:</span>
                <span className="font-black text-slate-950 text-xs block truncate" title={data.customerName || 'زبون نقدي'}>
                  {data.customerName || 'زبون نقدي'}
                </span>
              </div>

              {/* Row 2 / Col 2: هاتف الزبون */}
              <div className="space-y-0.5">
                <span className="text-slate-500 font-bold block text-[11px]">هاتف الزبون:</span>
                <span className="font-mono font-bold text-slate-950 text-xs block">{data.customerPhone || '---'}</span>
              </div>

              {/* Row 2 / Col 3: السيارة واللوحة */}
              <div className="space-y-0.5">
                <span className="text-slate-500 font-bold block text-[11px]">السيارة واللوحة:</span>
                <span className="font-black text-slate-950 text-xs block">
                  {data.vehicleModel || 'بدون تحديد'}
                  {data.plateNumber ? ` (${data.plateNumber})` : ''}
                </span>
              </div>

              {/* Row 2 / Col 4: المستخدم والمستودع */}
              <div className="space-y-0.5">
                <span className="text-slate-500 font-bold block text-[11px]">المستخدم / المستودع:</span>
                <span className="font-bold text-slate-950 text-xs block">كاشير المركز / الرئيسي</span>
              </div>
            </div>

            {data.plateNumber && (
              <div className="flex justify-center pt-1.5 border-t border-slate-200">
                <IraqiPlateBadge plateNumber={data.plateNumber} size="sm" />
              </div>
            )}
          </div>

          {/* Odometer Box */}
          <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-300 grid grid-cols-2 gap-2 text-center">
            <div>
              <span className="text-[11px] font-bold text-slate-600 block">العداد الحالي</span>
              <strong className="font-mono font-black text-sm">{data.currentOdometer.toLocaleString()} كم</strong>
            </div>
            <div className="border-r border-slate-300">
              <span className="text-[11px] font-bold text-amber-800 block">التبديل القادم</span>
              <strong className="font-mono font-black text-sm text-amber-700">{data.nextOdometer.toLocaleString()} كم</strong>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-1.5 border-b border-slate-300 pb-2.5">
            <div className="text-xs font-black text-slate-700">التفاصيل والمواد:</div>
            {data.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs font-bold py-0.5">
                <span>{item.label} ({item.qty})</span>
                <span className="font-mono font-black">{item.price.toLocaleString()} د.ع</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1 text-sm font-black">
            <div className="flex justify-between">
              <span>المبلغ الإجمالي:</span>
              <span className="font-mono text-base">{data.totalPrice.toLocaleString()} د.ع</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>المبلغ الواصل:</span>
              <span className="font-mono">{data.paidAmount.toLocaleString()} د.ع</span>
            </div>
            {data.debtAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>المتبقي (دين):</span>
                <span className="font-mono">{data.debtAmount.toLocaleString()} د.ع</span>
              </div>
            )}
          </div>

          {data.techNotes && (
            <div className="text-xs bg-amber-50 p-2 rounded-lg border border-amber-200 font-bold">
              ملاحظات الفحص: {data.techNotes}
            </div>
          )}

          {/* QR Code for Digital Card inside Receipt */}
          {qrImageUrl && (
            <div className="pt-2 border-t border-slate-300 flex flex-col items-center text-center space-y-1">
              <span className="text-[11px] font-black text-slate-700 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5 text-amber-600" />
                امسح الرمز لفتح بطاقة سيارتك الإلكترونية
              </span>
              <img
                src={qrImageUrl}
                alt="QR Code"
                className="w-28 h-28 rounded-xl border border-slate-300 p-1 bg-white"
              />
            </div>
          )}

          <div className="text-center pt-2 border-t border-slate-300 text-[11px] font-bold text-slate-600">
            شكراً لثقتكم بمركز حسين الاسدي
          </div>
        </div>

        {/* Action Buttons: WhatsApp with Link, Copy Link, Thermal Print */}
        <div className="space-y-2.5 pt-2 print:hidden">
          <button
            onClick={handleSendWhatsAppReceipt}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition"
          >
            <MessageCircle className="w-5 h-5" />
            <span>إرسال الفاتورة + رابط البطاقة لواتساب الزبون</span>
          </button>

          {publicCardUrl && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopyCardLink}
                className={`py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border transition ${
                  copiedLink
                    ? 'bg-emerald-100 border-emerald-500 text-emerald-900'
                    : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
                }`}
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'تم نسخ الرابط!' : 'نسخ رابط البطاقة'}</span>
              </button>

              <a
                href={publicCardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition"
              >
                <ExternalLink className="w-4 h-4" />
                <span>معاينة بطاقة الزبون</span>
              </a>
            </div>
          )}

          <button
            onClick={handleThermalPrint}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>طباعة وصل حراري (أو حفظ كـ PDF)</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
          >
            إغلاق والبدء بمعاملة جديدة
          </button>
        </div>

      </div>
    </div>
  );
}
