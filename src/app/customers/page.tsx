'use client';

import React, { useState, useEffect } from 'react';
import HeaderNav from '@/components/HeaderNav';
import { 
  searchCustomerOrVehicle,
  getCustomerDossier, 
  recordDebtPayment 
} from '@/services/firestoreService';
import { CustomerDoc, VehicleDoc, ServiceVisitDoc } from '@/types/firestore';
import { 
  Users, 
  Search, 
  DollarSign, 
  MessageSquare, 
  Calendar, 
  Gauge, 
  CreditCard,
  History,
  Loader2,
  AlertTriangle
} from 'lucide-react';

export default function CustomerDossierPage() {
  const [searchPhone, setSearchPhone] = useState('07701234567');
  const [loading, setLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(15000);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active dossier data from Firestore
  const [customer, setCustomer] = useState<CustomerDoc>({
    id: 'cust-demo-1',
    fullName: 'أحمد جاسم الشمري',
    phoneNumber: '07701234567',
    loyaltyPoints: 40,
    totalDebt: 25000,
    createdAt: null
  });

  const [vehicles, setVehicles] = useState<VehicleDoc[]>([
    {
      id: 'veh-demo-1',
      customerId: 'cust-demo-1',
      makeModel: 'تويوتا كامري (Toyota Camry)',
      plateNumber: 'بغداد 48291 خصوصي',
      engineSize: '2.5L 4-سلندر',
      modelYear: 2021,
      lastOdometer: 71350,
      nextOdometer: 78350,
      lastServiceDate: null,
      preferredOil: '5W30',
      preferredFilter: '90915-YZZE2',
      qrCodeId: 'camry-48291-asadi'
    }
  ]);

  const [history, setHistory] = useState<ServiceVisitDoc[]>([
    {
      id: 'visit-1',
      customerId: 'cust-demo-1',
      vehicleId: 'veh-demo-1',
      visitDate: '2026-08-15',
      currentOdometer: 64200,
      nextOdometer: 71200,
      oilName: 'Mobil 1 ESP 5W-30',
      oilLitersUsed: 4.4,
      filterCode: '90915-YZZE2',
      technicalNotes: 'تنظيف فلتر الهواء + فحص ماء الراديتر. المحرك بحالة ممتازة دون تبخير.',
      totalPrice: 58000,
      paidAmount: 58000,
      debtAmount: 0
    },
    {
      id: 'visit-2',
      customerId: 'cust-demo-1',
      vehicleId: 'veh-demo-1',
      visitDate: '2026-05-10',
      currentOdometer: 57100,
      nextOdometer: 64100,
      oilName: 'Mobil 1 ESP 5W-30',
      oilLitersUsed: 4.4,
      filterCode: '90915-YZZE2',
      technicalNotes: 'تم غسل المحرك بالفلاشينغ وإضافة زيت جديد.',
      totalPrice: 65000,
      paidAmount: 40000,
      debtAmount: 25000
    }
  ]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPhone.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const found = await searchCustomerOrVehicle(searchPhone.trim());
      if (found?.customer?.id) {
        const dossier = await getCustomerDossier(found.customer.id);
        if (dossier) {
          setCustomer(dossier.customer);
          setVehicles(dossier.vehicles);
          if (dossier.history.length > 0) {
            setHistory(dossier.history);
          }
        }
      } else {
        setErrorMsg('لم يتم العثور على زبون مطابق في كولكشن Firestore.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'خطأ أثناء استعلام ملف الزبون من Firestore.');
    } finally {
      setLoading(false);
    }
  };

  const generateWhatsAppOilReminder = () => {
    if (!customer) return;
    const v = vehicles[0];
    const msg = `السلام عليكم ورحمة الله أخي ${customer.fullName} المحترم،%0Aتحية طيبة من *مركز حسين الاسدي لخدمات الزيوت*.%0Aنود تذكيركم بأن موعد تبديل زيت محرك سيارتكم (${v?.makeModel || ''} - لوحة: ${v?.plateNumber || ''}) أصبح قريباً عند العداد (${v?.nextOdometer || 0} كم).%0Aأهلاً وسهلاً بكم في أي وقت لفحص المحرك مجاناً!`;
    window.open(`https://wa.me/964${customer.phoneNumber.substring(1)}?text=${msg}`, '_blank');
  };

  const generateWhatsAppDebtReminder = () => {
    if (!customer) return;
    const msg = `السلام عليكم أخي ${customer.fullName}،%0Aمن *مركز حسين الاسدي*. نود تذكيركم بلطف بالمبلغ المتبقي لحسابكم البالغ (${customer.totalDebt.toLocaleString()} دينار عراقي).%0Aشاكرين حسن تعاملكم معنا دائماً.`;
    window.open(`https://wa.me/964${customer.phoneNumber.substring(1)}?text=${msg}`, '_blank');
  };

  const handleRecordDebtPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id || paymentAmount <= 0) return;

    setPaymentLoading(true);
    try {
      const res = await recordDebtPayment(customer.id, Number(paymentAmount), paymentNotes);
      setCustomer((prev) => ({ ...prev, totalDebt: res.newDebt }));
      setPaymentSuccess(true);
      setPaymentNotes('');
      setTimeout(() => setPaymentSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء تسجيل الدفعة.');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-industrial-950">
      <HeaderNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Search header */}
        <section className="bg-industrial-900 border border-industrial-800 rounded-2xl p-4 shadow-lg">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder="ابحث برقم هاتف الزبون لجلب ملفه الكامل من Firestore..."
              className="flex-1 bg-industrial-950 border border-industrial-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-brand-amber"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-brand-amber hover:bg-brand-amberHover text-industrial-950 px-5 py-2.5 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>جلب الملف (Firestore)</span>
            </button>
          </form>
          {errorMsg && (
            <p className="text-xs text-brand-danger font-semibold mt-2">{errorMsg}</p>
          )}
        </section>

        {/* Customer Dossier Header */}
        <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-industrial-800 border border-industrial-700 flex items-center justify-center text-brand-amber font-black text-2xl">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl md:text-2xl font-black text-white">{customer.fullName}</h1>
                <span className="bg-brand-emerald/10 text-brand-emerald text-xs px-2.5 py-1 rounded-full border border-brand-emerald/30 font-bold">
                  عميل موثق
                </span>
              </div>
              <p className="text-slate-400 font-mono text-sm mt-0.5">{customer.phoneNumber}</p>
            </div>
          </div>

          {/* Quick Notification Action Hub */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button
              onClick={generateWhatsAppOilReminder}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg transition"
            >
              <MessageSquare className="w-4 h-4" />
              <span>تذكير تبديل الزيت (WhatsApp)</span>
            </button>

            {customer.totalDebt > 0 && (
              <button
                onClick={generateWhatsAppDebtReminder}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg transition"
              >
                <DollarSign className="w-4 h-4" />
                <span>مطالبة بالدين</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-industrial-900 border border-industrial-800 p-5 rounded-2xl shadow-lg">
            <span className="text-xs text-slate-400 block mb-1">الرصيد المالي المستحق (الديون)</span>
            <span className="text-3xl font-black font-mono text-brand-danger">
              {customer.totalDebt.toLocaleString()} <span className="text-sm font-sans">د.ع</span>
            </span>
          </div>

          <div className="bg-industrial-900 border border-industrial-800 p-5 rounded-2xl shadow-lg">
            <span className="text-xs text-slate-400 block mb-1">نقاط الولاء المتراكمة</span>
            <span className="text-3xl font-black font-mono text-brand-emerald flex items-center gap-2">
              {customer.loyaltyPoints} <span className="text-sm font-sans">نقطة مجانية</span>
            </span>
          </div>

          <div className="bg-industrial-900 border border-industrial-800 p-5 rounded-2xl shadow-lg">
            <span className="text-xs text-slate-400 block mb-1">المركبة المسجلة</span>
            <span className="text-lg font-bold text-brand-amber block truncate">
              {vehicles[0]?.makeModel || 'لا توجد مركبة'}
            </span>
            <span className="text-xs text-slate-400 font-mono mt-1 block">
              رقم اللوحة: {vehicles[0]?.plateNumber || '—'}
            </span>
          </div>
        </div>

        {/* Main Grid: Payment Logger & Complete History Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Payment Logger Form */}
          <div className="space-y-6">
            <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-5 shadow-lg space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-industrial-800 pb-2">
                <CreditCard className="w-5 h-5 text-brand-emerald" />
                <span>تسديد دفعة دين (معاملة Firestore)</span>
              </h2>

              {paymentSuccess && (
                <div className="bg-brand-emerald/15 border border-brand-emerald/40 text-brand-emerald text-xs p-3 rounded-xl font-bold">
                  تم تسجيل الدفعة النقدية بنجاح في Firestore وتحديث رصيد الزبون.
                </div>
              )}

              <form onSubmit={handleRecordDebtPaymentSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    المبلغ المسدد (د.ع)
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full bg-industrial-950 border border-industrial-700 rounded-xl px-4 py-2.5 font-mono text-lg font-bold text-white focus:outline-none focus:border-brand-emerald"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ملاحظات أو طريقة الاستلام
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="مثال: نقداً بالكاونتر، زين كاش..."
                    className="w-full bg-industrial-950 border border-industrial-700 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-emerald"
                  />
                </div>

                <button
                  type="submit"
                  disabled={paymentLoading || customer.totalDebt <= 0}
                  className="w-full py-3 bg-brand-emerald hover:bg-brand-emeraldHover disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/10 text-sm"
                >
                  {paymentLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <DollarSign className="w-4 h-4" />
                  )}
                  <span>تثبيت وصل القبض والخصم من الدين</span>
                </button>
              </form>
            </div>
          </div>

          {/* Service History Timeline */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-5 shadow-lg">
              <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-industrial-800 pb-3 mb-4">
                <History className="w-5 h-5 text-brand-amber" />
                <span>سجل الزيارات والخدمات السابقة للمركبة (Firestore Timeline)</span>
              </h2>

              <div className="space-y-4">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="bg-industrial-950 border border-industrial-800/80 rounded-xl p-4 space-y-3 relative overflow-hidden"
                  >
                    <div className="flex flex-wrap justify-between items-center gap-2 border-b border-industrial-800/50 pb-2">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-brand-amber" />
                        <span className="font-mono">{typeof item.visitDate === 'string' ? item.visitDate : 'اليوم'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-400">العداد: <strong className="text-white font-mono">{item.currentOdometer.toLocaleString()} كم</strong></span>
                        <span className="text-brand-amber">القادم: <strong className="font-mono">{item.nextOdometer.toLocaleString()} كم</strong></span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block mb-0.5">الزيت والكمية المستخدمة:</span>
                        <span className="font-bold text-slate-200">{item.oilName} ({item.oilLitersUsed} لتر)</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-0.5">فلتر الزيت:</span>
                        <span className="font-bold text-slate-200">{item.filterCode || '—'}</span>
                      </div>
                    </div>

                    {item.technicalNotes && (
                      <div className="bg-industrial-900/60 p-2.5 rounded-lg border border-industrial-800 text-xs text-slate-300">
                        <span className="text-brand-amber font-bold ml-1">ملاحظة الفني:</span>
                        {item.technicalNotes}
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-1 text-xs font-mono">
                      <span className="text-slate-400">الإجمالي: {item.totalPrice.toLocaleString()} د.ع</span>
                      <span className="text-brand-emerald">الواصل: {item.paidAmount.toLocaleString()} د.ع</span>
                      {item.debtAmount > 0 && (
                        <span className="text-brand-danger font-bold">دين الزيارة: {item.debtAmount.toLocaleString()} د.ع</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
