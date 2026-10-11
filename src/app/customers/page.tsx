'use client';

import React, { useState, useEffect } from 'react';
import HeaderNav from '@/components/HeaderNav';
import IraqiPlateBadge from '@/components/IraqiPlateBadge';
import ReceiptModal, { ReceiptData } from '@/components/ReceiptModal';
import { 
  searchCustomerOrVehicle,
  getCustomerDossier, 
  recordDebtPayment,
  addVehicleToCustomer,
  getAllDebtorsSummary,
  formatExactDateTime
} from '@/services/firestoreService';
import { CustomerDoc, VehicleDoc, ServiceVisitDoc } from '@/types/firestore';
import { 
  Users, 
  Search, 
  DollarSign, 
  MessageSquare, 
  Calendar, 
  CreditCard,
  History,
  Loader2,
  Car,
  Plus,
  X,
  AlertCircle,
  Printer,
  ChevronDown,
  ChevronUp,
  BellRing
} from 'lucide-react';

export default function CustomerDossierPage() {
  const [searchPhone, setSearchPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(15000);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [customer, setCustomer] = useState<CustomerDoc | null>(null);
  const [vehicles, setVehicles] = useState<VehicleDoc[]>([]);
  const [history, setHistory] = useState<ServiceVisitDoc[]>([]);

  // Debtors Dashboard State
  const [debtors, setDebtors] = useState<CustomerDoc[]>([]);
  const [totalDebtsSum, setTotalDebtsSum] = useState<number>(0);
  const [showDebtorsList, setShowDebtorsList] = useState<boolean>(true);
  const [loadingDebtors, setLoadingDebtors] = useState<boolean>(true);

  // Receipt Modal for past visits
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // Modal to add car from dossier
  const [addCarModal, setAddCarModal] = useState(false);
  const [newCarForm, setNewCarForm] = useState({
    makeModel: '',
    plateNumber: '',
    engineSize: '',
    modelYear: new Date().getFullYear(),
    lastOdometer: 0,
    recommendedLiters: '',
    preferredOilName: '',
    preferredOil: '',
    preferredFilter: ''
  });

  const loadDebtorsSummary = async () => {
    setLoadingDebtors(true);
    try {
      const res = await getAllDebtorsSummary();
      setDebtors(res.debtors);
      setTotalDebtsSum(res.totalDebtSum);
    } catch (e) {
      console.warn('Error loading debtors summary:', e);
    } finally {
      setLoadingDebtors(false);
    }
  };

  useEffect(() => {
    loadDebtorsSummary();
  }, []);

  const selectCustomerById = async (customerId: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const dossier = await getCustomerDossier(customerId);
      if (dossier) {
        setCustomer(dossier.customer);
        setVehicles(dossier.vehicles);
        setHistory(dossier.history);
        setPaymentAmount(dossier.customer.totalDebt > 0 ? dossier.customer.totalDebt : 15000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'خطأ أثناء فتح ملف الزبون.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPhone.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const found = await searchCustomerOrVehicle(searchPhone.trim());
      if (found?.customer?.id) {
        await selectCustomerById(found.customer.id);
      } else {
        setErrorMsg('لم يتم العثور على زبون مطابق في قاعدة البيانات.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'خطأ أثناء استعلام ملف الزبون.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id) return;

    try {
      const res = await addVehicleToCustomer({
        customerId: customer.id,
        makeModel: newCarForm.makeModel,
        plateNumber: newCarForm.plateNumber,
        engineSize: newCarForm.engineSize,
        modelYear: Number(newCarForm.modelYear),
        lastOdometer: Number(newCarForm.lastOdometer),
        recommendedLiters: newCarForm.recommendedLiters ? Number(newCarForm.recommendedLiters) : undefined,
        preferredOilName: newCarForm.preferredOilName,
        preferredOil: newCarForm.preferredOil,
        preferredFilter: newCarForm.preferredFilter
      });
      setVehicles(prev => [...prev, res.vehicle]);
      setAddCarModal(false);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء إضافة السيارة.');
    }
  };

  const generateWhatsAppOilReminder = (v?: VehicleDoc) => {
    if (!customer) return;
    const car = v || vehicles[0];
    const cleanPhone = customer.phoneNumber.replace(/\D/g, '').replace(/^0/, '964');
    const msg = `السلام عليكم ورحمة الله أخي ${customer.fullName} المحترم،%0Aتحية طيبة من *مركز حسين الاسدي لخدمات الزيوت*.%0Aنود تذكيركم بأن موعد تبديل زيت محرك سيارتكم (${car?.makeModel || ''} - لوحة: ${car?.plateNumber || ''}) أصبح قريباً عند العداد (${car?.nextOdometer?.toLocaleString() || 0} كم).%0A📍 موقع الورشة: https://maps.app.goo.gl/Hfe2TZ3x96CTq8pH8%0Aأهلاً وسهلاً بكم في أي وقت!`;
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const sendMonthlyWhatsAppDebtReminder = (targetCustomer: CustomerDoc) => {
    const cleanPhone = targetCustomer.phoneNumber.replace(/\D/g, '').replace(/^0/, '964');
    const currentMonth = new Date().toLocaleDateString('ar-IQ', { month: 'long', year: 'numeric' });
    const msg = `السلام عليكم ورحمة الله أخي العزيز *${targetCustomer.fullName}* المحترم،%0Aتحية طيبة من *مركز حسين الاسدي لخدمات الزيوت والسيارات* 🌹%0A%0A📋 *تذكير كشف الحساب الشهري (${currentMonth}):*%0Aنود تذكيركم بلطف بالمبلغ المتبقي بذمتكم والبالغ: *(${targetCustomer.totalDebt.toLocaleString()} دينار عراقي)*.%0A%0Aللاستفسار أو التسديد عبر زين كاش / نقداً: 07800505015%0A📍 موقعنا: https://maps.app.goo.gl/Hfe2TZ3x96CTq8pH8%0Aشاكرين تعاونكم وثقتكم الدائمة بنا.`;
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const handleRecordDebtPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id || paymentAmount <= 0) return;

    setPaymentLoading(true);
    try {
      const res = await recordDebtPayment(customer.id, Number(paymentAmount), paymentNotes);
      setCustomer((prev) => prev ? ({ ...prev, totalDebt: res.newDebt }) : null);
      setPaymentSuccess(true);
      setPaymentNotes('');
      await loadDebtorsSummary();
      setTimeout(() => setPaymentSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء تسجيل الدفعة.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const openVisitReceipt = (visit: ServiceVisitDoc) => {
    if (!customer) return;
    const car = vehicles.find(v => v.id === visit.vehicleId) || vehicles[0];
    const items: ReceiptData['items'] = [];

    if (visit.oilName) {
      items.push({
        label: `زيت محرك: ${visit.oilName} (${visit.viscosity})`,
        qty: `${visit.oilLitersUsed} لتر`,
        price: visit.oilTotalPrice || (visit.oilUnitPrice ? visit.oilUnitPrice * visit.oilLitersUsed : 0)
      });
    }
    if (visit.filterCode && visit.filterCode !== 'بدون فلتر') {
      items.push({
        label: `فلتر زيت: ${visit.filterCode}`,
        qty: `1 قطعة`,
        price: visit.filterPrice || 0
      });
    }
    if (visit.gearOilName) {
      items.push({
        label: `زيت كير: ${visit.gearOilName} (${visit.gearOilViscosity || ''})`,
        qty: `${visit.gearOilLitersUsed || 1} لتر`,
        price: visit.gearOilTotalPrice || 0
      });
    }

    setReceiptData({
      receiptNumber: `INV-${visit.id?.slice(0, 6).toUpperCase() || 'OLD'}`,
      dateTimeStr: formatExactDateTime(visit.visitDate),
      customerName: customer.fullName,
      customerPhone: customer.phoneNumber,
      vehicleModel: car?.makeModel || '—',
      plateNumber: car?.plateNumber || '—',
      currentOdometer: visit.currentOdometer,
      nextOdometer: visit.nextOdometer,
      items,
      totalPrice: visit.totalPrice,
      paidAmount: visit.paidAmount,
      debtAmount: visit.debtAmount,
      techNotes: visit.technicalNotes,
      qrCodeId: car?.qrCodeId
    });
    setReceiptOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <HeaderNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-5">
        
        {/* Top Interactive Debts Summary Banner */}
        <section className="bg-white border-2 border-red-200 rounded-2xl overflow-hidden shadow-sm">
          <div
            onClick={() => setShowDebtorsList(!showDebtorsList)}
            className="bg-gradient-to-l from-red-50 via-amber-50/40 to-white p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer hover:bg-red-50/80 transition"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-600/20">
                <DollarSign className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-slate-950">
                    إجمالي ديون الزبائن في المركز
                  </h2>
                  <span className="bg-red-100 text-red-800 border border-red-300 px-3 py-0.5 rounded-full text-xs font-black">
                    {debtors.length} زبون مديون
                  </span>
                </div>
                <p className="text-sm text-slate-600 font-bold mt-0.5">
                  اضغط هنا لإظهار أو إخفاء قائمة الزبائن المديونين وإرسال رسائل التذكير الشهرية عبر الواتساب
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <div className="text-right sm:text-left">
                <span className="text-xs font-black text-slate-500 block">مجموع الديون الكلي:</span>
                <span className="text-2xl sm:text-3xl font-mono font-black text-red-600">
                  {totalDebtsSum.toLocaleString()} <span className="text-sm">د.ع</span>
                </span>
              </div>
              <button
                type="button"
                className="p-2.5 rounded-xl bg-white border-2 border-slate-200 text-slate-700 hover:border-red-400"
              >
                {showDebtorsList ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Expandable Debtors Table / Cards */}
          {showDebtorsList && (
            <div className="p-5 border-t-2 border-red-100 bg-white space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <BellRing className="w-5 h-5 text-red-600" />
                  <span>قائمة الزبائن المديونين ({debtors.length}) - تذكير الواتساب الشهري والتسديد السريع:</span>
                </h3>
              </div>

              {loadingDebtors ? (
                <div className="py-6 text-center text-slate-500 font-bold flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                  <span>جاري تحميل سجل الديون...</span>
                </div>
              ) : debtors.length === 0 ? (
                <div className="py-6 text-center bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-black text-base">
                  🎉 ممتاز! لا توجد أي ديون متبقية على الزبائن حالياً.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {debtors.map((d) => (
                    <div
                      key={d.id}
                      className="bg-slate-50 border-2 border-slate-200 hover:border-red-300 rounded-2xl p-4 flex flex-col justify-between gap-3 transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-black text-slate-950 text-base">{d.fullName}</h4>
                          <p className="font-mono font-bold text-slate-600 text-sm">{d.phoneNumber}</p>
                        </div>
                        <div className="bg-red-50 border border-red-200 px-3 py-1 rounded-xl text-right">
                          <span className="text-[10px] font-black text-red-700 block">مبلغ الدين</span>
                          <span className="font-mono font-black text-red-600 text-base">
                            {d.totalDebt.toLocaleString()} د.ع
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => sendMonthlyWhatsAppDebtReminder(d)}
                          className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>تذكير واتساب شهري</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => d.id && selectCustomerById(d.id)}
                          className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs transition"
                        >
                          فتح الملف / تسديد
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Search header */}
        <section className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder="ابحث برقم هاتف الزبون، الاسم، أو رقم اللوحة لعرض ملفه الكامل..."
              className="flex-1 bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3.5 text-slate-950 font-mono font-black text-base focus:outline-none focus:border-amber-500 focus:bg-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-600 text-white px-7 py-3.5 font-black rounded-xl text-base flex items-center justify-center gap-2 transition shadow-md"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              <span>عرض ملف الزبون</span>
            </button>
          </form>
          {errorMsg && (
            <p className="text-sm text-red-600 font-black mt-2 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMsg}</span>
            </p>
          )}
        </section>

        {!customer ? (
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-10 text-center space-y-2 shadow-sm">
            <Users className="w-12 h-12 text-amber-500 mx-auto" />
            <h2 className="text-lg font-black text-slate-950">اختر زبوناً من قائمة الديون أعلاه أو ابحث عنه بالاسم أو الرقم</h2>
            <p className="text-sm font-bold text-slate-500">لعرض جميع السيارات المسجلة، الأرقام العراقية، الديون، وسجل الصيانات بالتاريخ والوقت الدقيق.</p>
          </div>
        ) : (
          <>
            {/* Customer Dossier Header */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-center justify-center text-amber-600 font-black text-2xl">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl font-black text-slate-950">{customer.fullName}</h1>
                    <span className="bg-emerald-50 text-emerald-800 text-sm px-3 py-0.5 rounded-full border border-emerald-300 font-black">
                      {vehicles.length} سيارات مسجلة
                    </span>
                  </div>
                  <p className="text-slate-600 font-mono font-black text-base mt-1">{customer.phoneNumber}</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
                <button
                  onClick={() => setAddCarModal(true)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-3 rounded-xl font-black text-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ إضافة سيارة أخرى</span>
                </button>

                <button
                  onClick={() => generateWhatsAppOilReminder()}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-black text-sm shadow-sm transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>تذكير واتساب بالزيت</span>
                </button>

                {customer.totalDebt > 0 && (
                  <button
                    onClick={() => sendMonthlyWhatsAppDebtReminder(customer)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-black text-sm shadow-sm transition"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>تذكير واتساب بالدين</span>
                  </button>
                )}
              </div>
            </div>

            {/* Registered Vehicles Grid (Multi-car view with Iraqi License Plate UI) */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
                <Car className="w-5 h-5 text-amber-600" />
                <span>المركبات المسجلة باسم الزبون ({vehicles.length}):</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicles.map((v) => (
                  <div key={v.id} className="bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl space-y-3 flex flex-col justify-between">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="font-black text-slate-950 text-base block">{v.makeModel}</span>
                        <span className="text-xs font-bold text-slate-500">محرك: {v.engineSize || 'قياسي'} | موديل: {v.modelYear}</span>
                      </div>
                      <IraqiPlateBadge plateNumber={v.plateNumber} size="sm" />
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs space-y-1 font-bold text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-500">الزيت والسايز:</span>
                        <strong className="text-slate-950 font-black">{v.preferredOilName || '—'} ({v.preferredOil || '—'})</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">الكمية والفلتر:</span>
                        <strong className="text-emerald-800 font-black">
                          {v.recommendedLiters ? `${v.recommendedLiters} لتر` : '—'} | فلتر: {v.preferredFilter || '—'}
                        </strong>
                      </div>
                    </div>
                    <div className="text-sm text-slate-700 font-mono font-bold flex justify-between pt-2 border-t border-slate-200">
                      <span>السابق: {v.lastOdometer?.toLocaleString()} كم</span>
                      <span className="text-emerald-700 font-black">القادم: {v.nextOdometer?.toLocaleString()} كم</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Main Grid: Debt Payment & History Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Payment Logger */}
              <div className="space-y-4">
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
                    <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-emerald-600" />
                      <span>تسديد دفعة من الدين</span>
                    </h2>
                    <span className="font-mono font-black text-red-600 text-base">
                      الدين: {customer.totalDebt.toLocaleString()} د.ع
                    </span>
                  </div>

                  {paymentSuccess && (
                    <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-900 text-sm p-3.5 rounded-xl font-black">
                      تم تسجيل الدفعة وخصمها من رصيد الدين بنجاح!
                    </div>
                  )}

                  <form onSubmit={handleRecordDebtPaymentSubmit} className="space-y-3.5">
                    <div>
                      <label className="block text-sm font-black text-slate-800 mb-1">
                        المبلغ المسدد (د.ع)
                      </label>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                        className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3 font-mono text-xl font-black text-slate-950 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-black text-slate-800 mb-1">
                        ملاحظات الاستلام
                      </label>
                      <input
                        type="text"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="نقداً، زين كاش..."
                        className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-950 font-bold"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={paymentLoading || customer.totalDebt <= 0}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl flex items-center justify-center gap-2 transition text-sm shadow-md"
                    >
                      {paymentLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <DollarSign className="w-5 h-5" />}
                      <span>تثبيت وصل القبض وخصم الدين</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Service History Timeline */}
              <div className="lg:col-span-2">
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h2 className="text-lg font-black text-slate-950 flex items-center gap-2 border-b-2 border-slate-100 pb-3 mb-4">
                    <History className="w-6 h-6 text-amber-600" />
                    <span>سجل الزيارات والعمليات السابقة بالتاريخ والوقت ({history.length})</span>
                  </h2>

                  {history.length === 0 ? (
                    <p className="text-sm font-bold text-slate-400 py-8 text-center">لا توجد زيارات مسجلة حتى الآن.</p>
                  ) : (
                    <div className="space-y-4">
                      {history.map((item) => (
                        <div
                          key={item.id}
                          className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 space-y-3"
                        >
                          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-200 pb-2.5 text-sm">
                            <div className="flex items-center gap-2 text-slate-900 font-black">
                              <Calendar className="w-4 h-4 text-amber-600" />
                              <span dir="ltr">{formatExactDateTime(item.visitDate)}</span>
                            </div>
                            <div className="flex items-center gap-3 font-mono text-sm">
                              <span className="text-slate-700 font-bold">العداد: <strong className="text-slate-950 font-black">{item.currentOdometer.toLocaleString()} كم</strong></span>
                              <span className="text-emerald-700 font-black">القادم: <strong>{item.nextOdometer.toLocaleString()} كم</strong></span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className="text-slate-500 font-bold block text-xs">زيت المحرك:</span>
                              <span className="font-black text-slate-950">{item.oilName} ({item.viscosity}) - {item.oilLitersUsed} لتر</span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-bold block text-xs">فلتر الزيت:</span>
                              <span className="font-black text-slate-900">{item.filterCode || '—'}</span>
                            </div>
                            {item.gearOilName && (
                              <div>
                                <span className="text-slate-500 font-bold block text-xs">زيت الكير:</span>
                                <span className="font-black text-amber-800">{item.gearOilName} ({item.gearOilViscosity})</span>
                              </div>
                            )}
                          </div>

                          {item.technicalNotes && (
                            <div className="bg-white p-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-800">
                              <strong className="text-amber-700 ml-1">ملاحظة الفني:</strong>
                              {item.technicalNotes}
                            </div>
                          )}

                          <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-slate-200 text-sm font-mono font-black">
                            <div className="flex flex-wrap gap-4">
                              <span className="text-slate-800">الإجمالي: {item.totalPrice.toLocaleString()} د.ع</span>
                              <span className="text-emerald-700">الواصل: {item.paidAmount.toLocaleString()} د.ع</span>
                              {item.debtAmount > 0 && (
                                <span className="text-red-600">المتبقي: {item.debtAmount.toLocaleString()} د.ع</span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => openVisitReceipt(item)}
                              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-sans font-black text-xs flex items-center gap-1.5 transition"
                            >
                              <Printer className="w-4 h-4 text-amber-400" />
                              <span>طباعة / إرسال الوصل بالواتساب</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </>
        )}

      </main>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        data={receiptData}
      />

      {/* Add Car Modal */}
      {addCarModal && customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-950">إضافة سيارة ثانية للزبون: {customer.fullName}</h2>
              <button onClick={() => setAddCarModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddCar} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-black text-slate-800 mb-1">نوع وموديل السيارة *</label>
                  <input
                    type="text"
                    required
                    value={newCarForm.makeModel}
                    onChange={(e) => setNewCarForm({ ...newCarForm, makeModel: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-950 font-black"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-1">رقم اللوحة العراقية *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: 14 A 48291"
                    value={newCarForm.plateNumber}
                    onChange={(e) => setNewCarForm({ ...newCarForm, plateNumber: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-950 font-mono font-black"
                  />
                </div>
              </div>
              {newCarForm.plateNumber && (
                <div className="flex justify-center">
                  <IraqiPlateBadge plateNumber={newCarForm.plateNumber} size="sm" />
                </div>
              )}

              <div className="bg-emerald-50/70 p-3.5 rounded-2xl border-2 border-emerald-300 space-y-2.5">
                <span className="font-black text-emerald-950 block text-xs">
                  مواصفات الزيت والفلتر للسيارة (اختياري - غير إجباري):
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-700 mb-1 font-black text-xs">كم لتر تأخذ؟</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="مثال: 4 أو 4.5"
                      value={newCarForm.recommendedLiters}
                      onChange={(e) => setNewCarForm({ ...newCarForm, recommendedLiters: e.target.value })}
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-slate-950 font-mono font-black"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-black text-xs">سايز الزيت</label>
                    <input
                      type="text"
                      placeholder="مثال: 10W40 أو 5W30"
                      value={newCarForm.preferredOil}
                      onChange={(e) => setNewCarForm({ ...newCarForm, preferredOil: e.target.value })}
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-slate-950 font-mono font-black"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-black text-xs">نوع الزيت</label>
                    <input
                      type="text"
                      placeholder="مثال: يورال"
                      value={newCarForm.preferredOilName}
                      onChange={(e) => setNewCarForm({ ...newCarForm, preferredOilName: e.target.value })}
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-slate-950 font-black"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-black text-xs">نوع الفلتر</label>
                    <input
                      type="text"
                      placeholder="مثال: أصلي"
                      value={newCarForm.preferredFilter}
                      onChange={(e) => setNewCarForm({ ...newCarForm, preferredFilter: e.target.value })}
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-slate-950 font-black"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-base">
                حفظ السيارة
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
