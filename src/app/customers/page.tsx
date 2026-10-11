'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
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
import {
  CustomerDoc,
  VehicleDoc,
  ServiceVisitDoc,
  DirectSaleDoc,
  DebtPaymentDoc
} from '@/types/firestore';
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
  BellRing,
  CheckCircle2,
  ArrowRight,
  Wrench,
  ShoppingCart,
  Receipt
} from 'lucide-react';

export default function CustomerDossierPage() {
  const [searchPhone, setSearchPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(15000);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected Customer Dossier State
  const [customer, setCustomer] = useState<CustomerDoc | null>(null);
  const [vehicles, setVehicles] = useState<VehicleDoc[]>([]);
  const [history, setHistory] = useState<ServiceVisitDoc[]>([]);
  const [directSales, setDirectSales] = useState<DirectSaleDoc[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPaymentDoc[]>([]);

  // All Customers & Debtors Directory State
  const [allCustomers, setAllCustomers] = useState<CustomerDoc[]>([]);
  const [debtors, setDebtors] = useState<CustomerDoc[]>([]);
  const [vehiclesByCustomer, setVehiclesByCustomer] = useState<Record<string, VehicleDoc[]>>({});
  const [visitsCountByCustomer, setVisitsCountByCustomer] = useState<Record<string, number>>({});
  const [totalDebtsSum, setTotalDebtsSum] = useState<number>(0);
  const [directoryFilter, setDirectoryFilter] = useState<'all' | 'debtors'>('all');
  const [loadingDirectory, setLoadingDirectory] = useState<boolean>(true);

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

  const loadCustomersDirectory = async () => {
    setLoadingDirectory(true);
    try {
      const res = await getAllDebtorsSummary();
      setAllCustomers(res.allCustomers);
      setDebtors(res.debtors);
      setTotalDebtsSum(res.totalDebtSum);
      setVehiclesByCustomer(res.vehiclesByCustomer || {});
      setVisitsCountByCustomer(res.visitsCountByCustomer || {});
    } catch (e) {
      console.warn('Error loading customers directory:', e);
    } finally {
      setLoadingDirectory(false);
    }
  };

  useEffect(() => {
    loadCustomersDirectory();
  }, []);

  // Filter displayed customers in the directory by search query and ('all' vs 'debtors')
  const filteredDirectoryCustomers = useMemo(() => {
    const baseList = directoryFilter === 'debtors' ? debtors : allCustomers;
    const q = searchPhone.trim().toLowerCase();
    if (!q) return baseList;

    return baseList.filter((c) => {
      const cars = vehiclesByCustomer[c.id || ''] || [];
      const carsText = cars.map((v) => `${v.makeModel} ${v.plateNumber}`).join(' ').toLowerCase();
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.phoneNumber.toLowerCase().includes(q) ||
        carsText.includes(q)
      );
    });
  }, [allCustomers, debtors, directoryFilter, searchPhone, vehiclesByCustomer]);

  const selectCustomerById = async (customerId: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const dossier = await getCustomerDossier(customerId);
      if (dossier) {
        setCustomer(dossier.customer);
        setVehicles(dossier.vehicles);
        setHistory(dossier.history);
        setDirectSales(dossier.directSales || []);
        setDebtPayments(dossier.debtPayments || []);
        setPaymentAmount(dossier.customer.totalDebt > 0 ? dossier.customer.totalDebt : 15000);
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

    // If there is an exact/first match in our loaded directory, open it directly
    if (filteredDirectoryCustomers.length === 1 && filteredDirectoryCustomers[0].id) {
      await selectCustomerById(filteredDirectoryCustomers[0].id);
      return;
    }

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
      await loadCustomersDirectory();
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء إضافة السيارة.');
    }
  };

  const generateWhatsAppOilReminder = (v?: VehicleDoc) => {
    if (!customer) return;
    const car = v || vehicles[0];
    const cleanPhone = customer.phoneNumber.replace(/\D/g, '').replace(/^0/, '964');
    const msg = `السلام عليكم ورحمة الله أخي ${customer.fullName} المحترم،%0Aتحية طيبة من *مركز حسين الأسدي لخدمات الزيوت*.%0Aنود تذكيركم بأن موعد تبديل زيت محرك سيارتكم (${car?.makeModel || ''} - لوحة: ${car?.plateNumber || ''}) أصبح قريباً عند العداد (${car?.nextOdometer?.toLocaleString() || 0} كم).%0A📍 موقع الورشة: https://maps.app.goo.gl/Hfe2TZ3x96CTq8pH8%0Aأهلاً وسهلاً بكم في أي وقت!`;
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const sendMonthlyWhatsAppDebtReminder = (targetCustomer: CustomerDoc) => {
    const cleanPhone = targetCustomer.phoneNumber.replace(/\D/g, '').replace(/^0/, '964');
    const currentMonth = new Date().toLocaleDateString('ar-IQ', { month: 'long', year: 'numeric' });
    const msg = `السلام عليكم ورحمة الله أخي العزيز *${targetCustomer.fullName}* المحترم،%0Aتحية طيبة من *مركز حسين الأسدي لخدمات الزيوت والسيارات* 🌹%0A%0A📋 *تذكير كشف الحساب الشهري (${currentMonth}):*%0Aنود تذكيركم بلطف بالمبلغ المتبقي بذمتكم والبالغ: *(${targetCustomer.totalDebt.toLocaleString()} دينار عراقي)*.%0A%0Aللاستفسار أو التسديد عبر زين كاش / نقداً: 07800505015%0A📍 موقعنا: https://maps.app.goo.gl/Hfe2TZ3x96CTq8pH8%0Aشاكرين تعاونكم وثقتكم الدائمة بنا.`;
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const handleRecordDebtPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id || paymentAmount <= 0) return;

    setPaymentLoading(true);
    try {
      const res = await recordDebtPayment(customer.id, Number(paymentAmount), paymentNotes);
      setCustomer((prev) => prev ? ({ ...prev, totalDebt: res.newDebt }) : null);
      setDebtPayments((prev) => [
        {
          id: Date.now().toString(),
          customerId: customer.id!,
          paymentDate: new Date().toISOString(),
          amountPaid: Number(paymentAmount),
          notes: paymentNotes || 'تسديد دفعة نقدية'
        },
        ...prev
      ]);
      setPaymentSuccess(true);
      setPaymentNotes('');
      await loadCustomersDirectory();
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
        
        {/* Top Interactive Summary Cards: All Customers vs Debtors */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Total Registered Customers (Click to show ALL customers) */}
          <div
            onClick={() => {
              setCustomer(null);
              setDirectoryFilter('all');
            }}
            className={`p-5 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between shadow-sm ${
              !customer && directoryFilter === 'all'
                ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
                : 'bg-white border-slate-200 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-950">
                  سجل جميع زبائن المركز
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 font-bold mt-0.5">
                  اضغط هنا لعرض كافة الزبائن المسجلين وسياراتهم وجميع عملياتهم
                </p>
              </div>
            </div>
            <div className="text-left">
              <span className="text-xs font-black text-slate-500 block">العدد الكلي</span>
              <span className="text-2xl sm:text-3xl font-mono font-black text-amber-600">
                {allCustomers.length} <span className="text-sm">زبون</span>
              </span>
            </div>
          </div>

          {/* Card 2: Total Debts Summary (Click to filter Debtors only) */}
          <div
            onClick={() => {
              setCustomer(null);
              setDirectoryFilter('debtors');
            }}
            className={`p-5 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between shadow-sm ${
              !customer && directoryFilter === 'debtors'
                ? 'bg-red-50 border-red-500 ring-2 ring-red-500/20'
                : 'bg-white border-red-200 hover:border-red-400'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-600/20">
                <DollarSign className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-slate-950">
                    إجمالي ديون الزبائن
                  </h2>
                  <span className="bg-red-100 text-red-800 border border-red-300 px-2.5 py-0.5 rounded-full text-xs font-black">
                    {debtors.length} مديون
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 font-bold mt-0.5">
                  اضغط هنا لفلترة الزبائن المديونين فقط وإرسال التذكير الشهري
                </p>
              </div>
            </div>
            <div className="text-left">
              <span className="text-xs font-black text-slate-500 block">مجموع الديون</span>
              <span className="text-2xl sm:text-3xl font-mono font-black text-red-600">
                {totalDebtsSum.toLocaleString()} <span className="text-sm">د.ع</span>
              </span>
            </div>
          </div>
        </section>

        {/* Search & Filter Bar */}
        <section className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-4 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchPhone}
                onChange={(e) => {
                  setSearchPhone(e.target.value);
                  if (customer) setCustomer(null);
                }}
                placeholder="ابحث فوراً بالاسم، رقم الهاتف، نوع السيارة، أو رقم اللوحة..."
                className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl pr-12 pl-4 py-3.5 text-slate-950 font-mono font-black text-base focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-600 text-white px-7 py-3.5 font-black rounded-xl text-base flex items-center justify-center gap-2 transition shadow-md"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              <span>بحث</span>
            </button>
          </form>

          {errorMsg && (
            <p className="text-sm text-red-600 font-black flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMsg}</span>
            </p>
          )}
        </section>

        {/* VIEW 1: ALL CUSTOMERS DIRECTORY (When no specific customer is open) */}
        {!customer ? (
          <section className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3 border-b-2 border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                {directoryFilter === 'all' ? (
                  <>
                    <Users className="w-6 h-6 text-amber-600" />
                    <h2 className="text-lg font-black text-slate-950">
                      قائمة جميع الزبائن المسجلين ({filteredDirectoryCustomers.length})
                    </h2>
                  </>
                ) : (
                  <>
                    <BellRing className="w-6 h-6 text-red-600" />
                    <h2 className="text-lg font-black text-slate-950">
                      قائمة الزبائن المديونين ({filteredDirectoryCustomers.length})
                    </h2>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDirectoryFilter('all')}
                  className={`px-4 py-2 rounded-xl font-black text-xs border-2 transition ${
                    directoryFilter === 'all'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  عرض كل الزبائن ({allCustomers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDirectoryFilter('debtors')}
                  className={`px-4 py-2 rounded-xl font-black text-xs border-2 transition ${
                    directoryFilter === 'debtors'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
                  }`}
                >
                  المديونين فقط ({debtors.length})
                </button>
              </div>
            </div>

            {loadingDirectory ? (
              <div className="py-12 text-center text-slate-600 font-black flex items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                <span>جاري تحميل قائمة الزبائن وسياراتهم...</span>
              </div>
            ) : filteredDirectoryCustomers.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
                <Users className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="font-black text-base text-slate-800">
                  {directoryFilter === 'debtors'
                    ? '🎉 لا توجد أي ديون متبقية على الزبائن حالياً!'
                    : 'لا يوجد زبائن مطابقين للبحث حالياً.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDirectoryCustomers.map((c) => {
                  const custCars = vehiclesByCustomer[c.id || ''] || [];
                  const visitsCount = visitsCountByCustomer[c.id || ''] || 0;
                  const hasDebt = Number(c.totalDebt || 0) > 0;

                  return (
                    <div
                      key={c.id}
                      onClick={() => c.id && selectCustomerById(c.id)}
                      className="bg-slate-50 hover:bg-amber-50/40 border-2 border-slate-200 hover:border-amber-400 rounded-2xl p-4 flex flex-col justify-between gap-3 cursor-pointer transition shadow-sm"
                    >
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h3 className="font-black text-slate-950 text-lg hover:text-amber-600 transition">
                              {c.fullName}
                            </h3>
                            <p className="font-mono font-black text-slate-600 text-sm">
                              {c.phoneNumber}
                            </p>
                          </div>

                          {hasDebt ? (
                            <div className="bg-red-50 border border-red-300 px-3 py-1 rounded-xl text-right">
                              <span className="text-[10px] font-black text-red-700 block">مبلغ الدين</span>
                              <span className="font-mono font-black text-red-600 text-sm">
                                {c.totalDebt.toLocaleString()} د.ع
                              </span>
                            </div>
                          ) : (
                            <span className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> خالص
                            </span>
                          )}
                        </div>

                        {/* Customer Cars Preview */}
                        {custCars.length > 0 ? (
                          <div className="space-y-1.5 pt-1 border-t border-slate-200">
                            {custCars.map((car) => (
                              <div
                                key={car.id}
                                className="bg-white px-3 py-2 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                              >
                                <div className="text-xs">
                                  <span className="font-black text-slate-900 block">{car.makeModel}</span>
                                  {car.preferredOil && (
                                    <span className="text-[11px] font-bold text-amber-800">
                                      الزيت: {car.preferredOil} {car.recommendedLiters ? `(${car.recommendedLiters} لتر)` : ''}
                                    </span>
                                  )}
                                </div>
                                <IraqiPlateBadge plateNumber={car.plateNumber} size="sm" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs font-bold text-slate-400">لا توجد سيارة مضافة</p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-slate-600">
                          عدد الزيارات: <strong className="text-slate-950 font-mono">{visitsCount}</strong>
                        </span>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {hasDebt && (
                            <button
                              type="button"
                              onClick={() => sendMonthlyWhatsAppDebtReminder(c)}
                              className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs flex items-center gap-1 shadow-sm transition"
                              title="إرسال تذكير واتساب بالدين"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>تذكير واتساب</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => c.id && selectCustomerById(c.id)}
                            className="py-2 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs transition"
                          >
                            عرض كل العمليات 👈
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          /* VIEW 2: FULL CUSTOMER DOSSIER & ALL OPERATIONS */
          <>
            {/* Back to All Customers Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCustomer(null)}
                className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-300 px-5 py-3 rounded-2xl font-black text-sm shadow-sm transition"
              >
                <ArrowRight className="w-5 h-5 text-amber-600" />
                <span>العودة لقائمة جميع الزبائن ({allCustomers.length})</span>
              </button>

              <Link
                href={`/?phone=${encodeURIComponent(customer.phoneNumber)}`}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-3 rounded-2xl font-black text-sm shadow-md shadow-amber-500/20 transition"
              >
                <Wrench className="w-5 h-5" />
                <span>تحويل للكاونتر لبدء تبديل زيت جديد لهذا الزبون</span>
              </Link>
            </div>

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
                    <span className="bg-amber-50 text-amber-900 text-sm px-3 py-0.5 rounded-full border border-amber-300 font-black">
                      {history.length + directSales.length + debtPayments.length} عملية مسجلة
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
                    <span>مطالبة واتساب بالدين</span>
                  </button>
                )}
              </div>
            </div>

            {/* Registered Vehicles Grid (Multi-car view with Iraqi License Plate UI & Oil Specs) */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
                <Car className="w-5 h-5 text-amber-600" />
                <span>المركبات المسجلة باسم الزبون ومواصفاتها ({vehicles.length}):</span>
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

            {/* Main Grid: Debt Payment & Complete Operations History */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Debt Payment Logger + Debt Payments History */}
              <div className="space-y-5">
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

                {/* Debt Payments Log */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <h3 className="text-sm font-black text-slate-950 flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span>سجل تسديدات الديون السابقة ({debtPayments.length})</span>
                  </h3>
                  {debtPayments.length === 0 ? (
                    <p className="text-xs font-bold text-slate-400 py-4 text-center">
                      لا توجد دفعات تسديد دين مسجلة.
                    </p>
                  ) : (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto">
                      {debtPayments.map((p) => (
                        <div key={p.id} className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 text-xs space-y-1">
                          <div className="flex justify-between items-center font-black">
                            <span className="text-emerald-800 font-mono text-sm">
                              +{Number(p.amountPaid).toLocaleString()} د.ع
                            </span>
                            <span className="text-slate-600 font-mono" dir="ltr">
                              {formatExactDateTime(p.paymentDate)}
                            </span>
                          </div>
                          {p.notes && <p className="text-slate-700 font-bold">{p.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right 2 Columns: All Service Visits + Direct Sales Timeline */}
              <div className="lg:col-span-2 space-y-5">
                {/* 1. Oil Change & Service Visits History */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h2 className="text-lg font-black text-slate-950 flex items-center gap-2 border-b-2 border-slate-100 pb-3 mb-4">
                    <History className="w-6 h-6 text-amber-600" />
                    <span>سجل عمليات تبديل الزيت والصيانة ({history.length})</span>
                  </h2>

                  {history.length === 0 ? (
                    <p className="text-sm font-bold text-slate-400 py-8 text-center">
                      لا توجد عمليات تبديل زيت مسجلة لهذا الزبون حتى الآن.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {history.map((item) => {
                        const visitCar = vehicles.find(v => v.id === item.vehicleId);
                        return (
                          <div
                            key={item.id}
                            className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 space-y-3"
                          >
                            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-200 pb-2.5 text-sm">
                              <div className="flex items-center gap-2 text-slate-900 font-black">
                                <Calendar className="w-4 h-4 text-amber-600" />
                                <span dir="ltr">{formatExactDateTime(item.visitDate)}</span>
                                {visitCar && (
                                  <span className="bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-lg text-xs">
                                    {visitCar.makeModel} ({visitCar.plateNumber})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 font-mono text-sm">
                                <span className="text-slate-700 font-bold">العداد: <strong className="text-slate-950 font-black">{item.currentOdometer.toLocaleString()} كم</strong></span>
                                <span className="text-emerald-700 font-black">القادم: <strong>{item.nextOdometer.toLocaleString()} كم</strong></span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                              <div>
                                <span className="text-slate-500 font-bold block text-xs">زيت المحرك والكمية:</span>
                                <span className="font-black text-slate-950">{item.oilName} ({item.viscosity}) - {item.oilLitersUsed} لتر</span>
                              </div>
                              <div>
                                <span className="text-slate-500 font-bold block text-xs">فلتر الزيت:</span>
                                <span className="font-black text-slate-900">{item.filterCode || '—'}</span>
                              </div>
                              {item.gearOilName && (
                                <div>
                                  <span className="text-slate-500 font-bold block text-xs">زيت الكير:</span>
                                  <span className="font-black text-amber-800">
                                    {item.gearOilName} ({item.gearOilViscosity}) - {item.gearOilLitersUsed || 1} لتر
                                  </span>
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
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Direct Sales History for this Customer */}
                {directSales.length > 0 && (
                  <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h2 className="text-base font-black text-slate-950 flex items-center gap-2 border-b-2 border-slate-100 pb-3 mb-4">
                      <ShoppingCart className="w-5 h-5 text-blue-600" />
                      <span>سجل المبيعات المباشرة للزبون ({directSales.length})</span>
                    </h2>
                    <div className="space-y-3">
                      {directSales.map((s) => (
                        <div key={s.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap justify-between items-center gap-2 text-sm">
                          <div>
                            <span className="font-mono font-black text-xs text-slate-500 block" dir="ltr">
                              {formatExactDateTime(s.saleDate)}
                            </span>
                            <p className="font-black text-slate-900 mt-0.5">
                              {(s.items || []).map(i => `${i.productName} (×${i.quantity})`).join(' + ')}
                            </p>
                          </div>
                          <span className="font-mono font-black text-blue-700 text-base">
                            {s.totalAmount.toLocaleString()} د.ع
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
