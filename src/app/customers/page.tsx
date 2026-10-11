'use client';

import React, { useState } from 'react';
import HeaderNav from '@/components/HeaderNav';
import { 
  searchCustomerOrVehicle,
  getCustomerDossier, 
  recordDebtPayment,
  addVehicleToCustomer
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
  X
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

  // Modal to add car from dossier
  const [addCarModal, setAddCarModal] = useState(false);
  const [newCarForm, setNewCarForm] = useState({
    makeModel: '',
    plateNumber: '',
    engineSize: '2.0L',
    modelYear: new Date().getFullYear(),
    lastOdometer: 0
  });

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
          setHistory(dossier.history);
        }
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
        lastOdometer: Number(newCarForm.lastOdometer)
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
    const msg = `السلام عليكم ورحمة الله أخي ${customer.fullName} المحترم،%0Aتحية طيبة من *مركز حسين الاسدي لخدمات الزيوت*.%0Aنود تذكيركم بأن موعد تبديل زيت محرك سيارتكم (${car?.makeModel || ''} - لوحة: ${car?.plateNumber || ''}) أصبح قريباً عند العداد (${car?.nextOdometer || 0} كم).%0Aأهلاً وسهلاً بكم في أي وقت لفحص المحرك مجاناً!`;
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
      setCustomer((prev) => prev ? ({ ...prev, totalDebt: res.newDebt }) : null);
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
    <div className="min-h-screen flex flex-col bg-slate-50">
      <HeaderNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-5">
        
        {/* Search header */}
        <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder="ابحث برقم هاتف الزبون أو رقم اللوحة أو الاسم لعرض كشف الحساب..."
              className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-mono font-bold text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>عرض ملف الزبون</span>
            </button>
          </form>
          {errorMsg && (
            <p className="text-xs text-red-600 font-bold mt-2">{errorMsg}</p>
          )}
        </section>

        {!customer ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-2 shadow-sm">
            <Users className="w-10 h-10 text-amber-500 mx-auto" />
            <h2 className="text-base font-black text-slate-900">ابحث عن الزبون لعرض ملفه وسجل مركباته</h2>
            <p className="text-xs text-slate-500">اكتب رقم الهاتف أو رقم اللوحة في الأعلى لعرض جميع السيارات المسجلة، الديون، وسجل الصيانات.</p>
          </div>
        ) : (
          <>
            {/* Customer Dossier Header */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-black text-2xl">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900">{customer.fullName}</h1>
                    <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold">
                      {vehicles.length} سيارات مسجلة
                    </span>
                  </div>
                  <p className="text-slate-500 font-mono font-bold text-sm mt-0.5">{customer.phoneNumber}</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <button
                  onClick={() => setAddCarModal(true)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ إضافة سيارة أخرى</span>
                </button>

                <button
                  onClick={() => generateWhatsAppOilReminder()}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>تذكير واتساب بالزيت</span>
                </button>

                {customer.totalDebt > 0 && (
                  <button
                    onClick={generateWhatsAppDebtReminder}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>مطالبة بالدين</span>
                  </button>
                )}
              </div>
            </div>

            {/* Registered Vehicles Grid (Multi-car view) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Car className="w-4 h-4 text-amber-600" />
                <span>المركبات المسجلة باسم الزبون ({vehicles.length}):</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {vehicles.map((v) => (
                  <div key={v.id} className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-slate-900 text-sm">{v.makeModel}</span>
                      <span className="text-[11px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                        {v.plateNumber}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-mono flex justify-between pt-1">
                      <span>العداد السابق: {v.lastOdometer?.toLocaleString()} كم</span>
                      <span className="text-emerald-700 font-bold">القادم: {v.nextOdometer?.toLocaleString()} كم</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Main Grid: Debt Payment & History Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Payment Logger */}
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                    <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <span>تسديد دفعة من الدين</span>
                    </h2>
                    <span className="font-mono font-black text-red-600 text-sm">
                      الدين: {customer.totalDebt.toLocaleString()} د.ع
                    </span>
                  </div>

                  {paymentSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl font-bold">
                      تم تسجيل الدفعة وخصمها من رصيد الدين بنجاح!
                    </div>
                  )}

                  <form onSubmit={handleRecordDebtPaymentSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        المبلغ المسدد (د.ع)
                      </label>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 font-mono text-lg font-black text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ملاحظات الاستلام
                      </label>
                      <input
                        type="text"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="نقداً، زين كاش..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={paymentLoading || customer.totalDebt <= 0}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl flex items-center justify-center gap-2 transition text-xs shadow-sm"
                    >
                      {paymentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                      <span>تثبيت وصل القبض</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Service History Timeline */}
              <div className="lg:col-span-2">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                    <History className="w-5 h-5 text-amber-600" />
                    <span>سجل الزيارات والصيانات السابقة ({history.length})</span>
                  </h2>

                  {history.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">لا توجد زيارات مسجلة حتى الآن.</p>
                  ) : (
                    <div className="space-y-3.5">
                      {history.map((item) => (
                        <div
                          key={item.id}
                          className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5"
                        >
                          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-200 pb-2 text-xs">
                            <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                              <Calendar className="w-3.5 h-3.5 text-amber-600" />
                              <span>زيارة صيانة</span>
                            </div>
                            <div className="flex items-center gap-3 font-mono">
                              <span className="text-slate-600">العداد: <strong className="text-slate-900">{item.currentOdometer.toLocaleString()} كم</strong></span>
                              <span className="text-emerald-700">القادم: <strong>{item.nextOdometer.toLocaleString()} كم</strong></span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-slate-500 block">زيت المحرك:</span>
                              <span className="font-black text-slate-900">{item.oilName} ({item.viscosity}) - {item.oilLitersUsed} لتر</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">الفلتر:</span>
                              <span className="font-bold text-slate-800">{item.filterCode || '—'}</span>
                            </div>
                            {item.gearOilName && (
                              <div>
                                <span className="text-slate-500 block">زيت الجير:</span>
                                <span className="font-bold text-amber-800">{item.gearOilName} ({item.gearOilViscosity})</span>
                              </div>
                            )}
                          </div>

                          {item.technicalNotes && (
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700">
                              <strong className="text-amber-700 ml-1">ملاحظة الفني:</strong>
                              {item.technicalNotes}
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-1 text-xs font-mono font-bold">
                            <span className="text-slate-600">الإجمالي: {item.totalPrice.toLocaleString()} د.ع</span>
                            <span className="text-emerald-700">الواصل: {item.paidAmount.toLocaleString()} د.ع</span>
                            {item.debtAmount > 0 && (
                              <span className="text-red-600">المتبقي: {item.debtAmount.toLocaleString()} د.ع</span>
                            )}
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

      {/* Add Car Modal */}
      {addCarModal && customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black text-slate-900">إضافة سيارة ثانية للزبون: {customer.fullName}</h2>
              <button onClick={() => setAddCarModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCar} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">نوع وموديل السيارة</label>
                <input
                  type="text"
                  required
                  value={newCarForm.makeModel}
                  onChange={(e) => setNewCarForm({ ...newCarForm, makeModel: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم اللوحة</label>
                <input
                  type="text"
                  required
                  value={newCarForm.plateNumber}
                  onChange={(e) => setNewCarForm({ ...newCarForm, plateNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold"
                />
              </div>
              <button type="submit" className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl">
                حفظ السيارة
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
