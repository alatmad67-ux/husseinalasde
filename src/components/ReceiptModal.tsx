'use client';

import React from 'react';
import { Printer, MessageCircle, X, FileText, CheckCircle } from 'lucide-react';
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
  if (isOpen === false || !data) return null;

  const handleThermalPrint = () => {
    window.print();
  };

  const handleSendWhatsAppReceipt = () => {
    const itemsLines = data.items
      .map((i) => `• ${i.label} (${i.qty}): ${i.price.toLocaleString()} د.ع`)
      .join('%0A');

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
      `────────────────────%0A` +
      `📍 *موقع المركز على الخريطة:*%0Ahttps://maps.app.goo.gl/Hfe2TZ3x96CTq8pH8%0A` +
      `📞 *هاتف المركز:* 07800505015%0A` +
      `شكراً لزيارتكم مركز حسين الاسدي!`;

    const cleanPhone = data.customerPhone.replace(/\s+/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? `964${cleanPhone.substring(1)}` : cleanPhone;
    window.open(`https://wa.me/${intlPhone}?text=${msg}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[94vh] overflow-y-auto">
        
        {/* Top Action Header (Hidden during print) */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-3 print:hidden">
          <div className="flex items-center gap-2 text-emerald-700 font-black text-base">
            <CheckCircle className="w-6 h-6" />
            <span>تم حفظ العملية - خيارات الوصل</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Printable Thermal Receipt Box */}
        <div id="printable-receipt" className="bg-white border-2 border-dashed border-slate-400 rounded-2xl p-5 text-slate-950 space-y-3 text-sm">
          
          <div className="text-center border-b-2 border-slate-900 pb-3 space-y-1.5">
            <div className="w-16 h-16 mx-auto rounded-2xl overflow-hidden border border-amber-500 bg-slate-950">
              <img src="/logo.jpg" alt="شعار مركز حسين الأسدي" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-xl font-black">مركز حسين الأسدي</h2>
            <p className="text-xs font-bold text-slate-700">لخدمات المحركات وتبديل الزيوت والفلاتر</p>
            <p className="text-xs font-mono font-bold">هاتف: 07800505015</p>
          </div>

          <div className="space-y-1.5 text-xs font-bold border-b border-slate-300 pb-2.5">
            <div className="flex justify-between">
              <span className="text-slate-600">رقم الوصل:</span>
              <span className="font-mono font-black">{data.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">التاريخ والوقت:</span>
              <span className="font-mono font-black text-slate-900">{data.dateTimeStr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">اسم الزبون:</span>
              <span className="font-black text-sm">{data.customerName}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-600">السيارة واللوحة:</span>
              <span className="font-black">{data.vehicleModel}</span>
            </div>
            <div className="flex justify-center py-1">
              <IraqiPlateBadge plateNumber={data.plateNumber} size="sm" />
            </div>
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

          <div className="text-center pt-2 border-t border-slate-300 text-[11px] font-bold text-slate-600">
            شكراً لثقتكم بمركز حسين الاسدي
          </div>
        </div>

        {/* Action Buttons: Thermal Print OR WhatsApp Direct Receipt */}
        <div className="space-y-2.5 pt-2 print:hidden">
          <button
            onClick={handleThermalPrint}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition"
          >
            <Printer className="w-5 h-5 text-amber-400" />
            <span>طباعة وصل حراري (أو حفظ كـ PDF)</span>
          </button>

          <button
            onClick={handleSendWhatsAppReceipt}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition"
          >
            <MessageCircle className="w-5 h-5" />
            <span>إرسال الوصل الكامل على واتساب الزبون (بدون طابعة)</span>
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
