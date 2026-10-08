'use client';

import React, { useState, useEffect } from 'react';
import HeaderNav from '@/components/HeaderNav';
import { 
  searchCustomerOrVehicle, 
  recordServiceVisit,
  getProductsList
} from '@/services/firestoreService';
import { CustomerDoc, VehicleDoc, ProductDoc } from '@/types/firestore';
import { 
  Search, 
  Car, 
  Gauge, 
  CheckCircle, 
  AlertTriangle, 
  Save, 
  Sparkles, 
  Clock, 
  FileText,
  DollarSign,
  Loader2
} from 'lucide-react';

export default function WorkshopPOSPage() {
  const [searchQuery, setSearchQuery] = useState('07701234567');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [savingVisit, setSavingVisit] = useState(false);
  
  // Current Customer & Vehicle from Firestore
  const [customer, setCustomer] = useState<CustomerDoc | null>({
    id: 'cust-demo-1',
    fullName: 'أحمد جاسم الشمري',
    phoneNumber: '07701234567',
    loyaltyPoints: 40,
    totalDebt: 25000,
    createdAt: null
  });
  
  const [vehicle, setVehicle] = useState<VehicleDoc | null>({
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
  });

  // Products from Firestore
  const [products, setProducts] = useState<ProductDoc[]>([
    { id: 'prod-1', name: 'Mobil 1 ESP 5W-30 (تخليقي بالكامل)', category: 'engine_oil', viscosity: '5W30', packageSizeLiters: 5, totalLitersStock: 48.5, unitCost: 9000, salePrice: 12000 },
    { id: 'prod-2', name: 'Castrol Magnatec 10W-40', category: 'engine_oil', viscosity: '10W40', packageSizeLiters: 4, totalLitersStock: 32.0, unitCost: 7000, salePrice: 9500 },
    { id: 'prod-3', name: 'Liqui Moly Molygen 5W-40', category: 'engine_oil', viscosity: '5W40', packageSizeLiters: 5, totalLitersStock: 14.5, unitCost: 10500, salePrice: 13500 },
    { id: 'prod-4', name: 'فلتر زيت أصلي تويوتا', category: 'filter', viscosity: '90915-YZZE2', packageSizeLiters: 1, totalLitersStock: 18, unitCost: 4500, salePrice: 7000 }
  ]);

  // Form Inputs
  const [currentOdo, setCurrentOdo] = useState<number>(71350);
  const [nextOdo, setNextOdo] = useState<number>(78350);
  const [selectedOilId, setSelectedOilId] = useState<string>('prod-1');
  const [oilLiters, setOilLiters] = useState<number>(4.4);
  const [selectedFilterId, setSelectedFilterId] = useState<string>('prod-4');
  const [gearOilNotes, setGearOilNotes] = useState<string>('الگير بحالة جيدة - لا يحتاج تبديل حالياً');
  const [techNotes, setTechNotes] = useState<string>('');
  
  // Financials
  const [totalPrice, setTotalPrice] = useState<number>(55000);
  const [paidAmount, setPaidAmount] = useState<number>(55000);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load products list from Firestore if connected
  useEffect(() => {
    async function loadProducts() {
      try {
        const list = await getProductsList();
        if (list.length > 0) {
          setProducts(list);
          const firstOil = list.find(p => p.category === 'engine_oil');
          if (firstOil?.id) setSelectedOilId(firstOil.id);
        }
      } catch (err) {
        console.warn('Firestore products fetch warning (using cached list):', err);
      }
    }
    loadProducts();
  }, []);

  // Search by Phone or Plate using Firestore
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoadingSearch(true);
    setErrorMessage(null);

    try {
      const result = await searchCustomerOrVehicle(searchQuery.trim());
      if (result && result.customer) {
        setCustomer(result.customer);
        if (result.vehicle) {
          setVehicle(result.vehicle);
          if (result.vehicle.lastOdometer) {
            setCurrentOdo(result.vehicle.lastOdometer);
          }
          if (result.vehicle.nextOdometer) {
            setNextOdo(result.vehicle.nextOdometer);
          }
        }
      } else {
        setErrorMessage('لم يتم العثور على زبون أو مركبة مطابقة في Firestore. يرجى التأكد من الرقم أو إضافة ملف جديد.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'حدث خطأ أثناء البحث في Firestore.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleOdoShortcut = (km: number) => {
    setNextOdo(Number(currentOdo) + km);
  };

  // Submit and commit atomic Firestore transaction
  const handleSaveVisit = async () => {
    if (!customer?.id || !vehicle?.id) {
      setErrorMessage('يرجى تحديد أو اختيار ملف زبون ومركبة أولاً.');
      return;
    }

    setSavingVisit(true);
    setErrorMessage(null);
    setSaveSuccessMsg(null);

    const selectedOil = products.find(p => p.id === selectedOilId);
    const selectedFilter = products.find(p => p.id === selectedFilterId);
    const calculatedDebt = Math.max(0, totalPrice - paidAmount);

    try {
      // Execute atomic Firestore transaction
      const res = await recordServiceVisit({
        customerId: customer.id,
        vehicleId: vehicle.id,
        currentOdometer: Number(currentOdo),
        nextOdometer: Number(nextOdo),
        oilProductId: selectedOilId,
        oilName: selectedOil?.name || 'زيت محرك',
        viscosity: selectedOil?.viscosity || '',
        oilLitersUsed: Number(oilLiters),
        filterCode: selectedFilter?.viscosity || selectedFilter?.name || '',
        gearOilDetails: gearOilNotes,
        technicalNotes: techNotes,
        totalPrice: Number(totalPrice),
        paidAmount: Number(paidAmount),
        debtAmount: calculatedDebt
      });

      // Update local UI state
      setCustomer((prev) => prev ? {
        ...prev,
        totalDebt: prev.totalDebt + calculatedDebt,
        loyaltyPoints: prev.loyaltyPoints + 10
      } : null);

      setVehicle((prev) => prev ? {
        ...prev,
        lastOdometer: Number(currentOdo),
        nextOdometer: Number(nextOdo)
      } : null);

      setSaveSuccessMsg(`تم تثبيت الزيارة بنجاح في Firestore (معرّف الزيارة: ${res.visitId}). تم خصم ${oilLiters} لتر من المخزون وإضافة 10 نقاط ولاء.`);
      setTimeout(() => setSaveSuccessMsg(null), 6000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'فشل حفظ الزيارة في Firestore.');
    } finally {
      setSavingVisit(false);
    }
  };

  const selectedOil = products.find(p => p.id === selectedOilId);
  const debt = Math.max(0, totalPrice - paidAmount);

  return (
    <div className="min-h-screen flex flex-col bg-industrial-950">
      <HeaderNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Top Search Bar */}
        <section className="bg-industrial-900 border border-industrial-800 rounded-2xl p-4 md:p-5 shadow-lg">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute right-3.5 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث برقم الهاتف (مثال: 07701234567) أو رقم اللوحة في Firestore..."
                className="w-full bg-industrial-950 border border-industrial-700 rounded-xl pr-11 pl-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-amber font-mono text-base tracking-wider"
              />
            </div>
            <button
              type="submit"
              disabled={loadingSearch}
              className="w-full md:w-auto px-6 py-3 bg-brand-amber hover:bg-brand-amberHover disabled:opacity-50 text-industrial-950 font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/10"
            >
              {loadingSearch ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-4 h-4 stroke-[3]" />
              )}
              <span>بحث وتعبئة تلقائية (Firestore)</span>
            </button>
          </form>

          {/* Quick Customer Profile Preview */}
          {customer && (
            <div className="mt-4 pt-4 border-t border-industrial-800/80 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-industrial-950/60 p-3 rounded-xl border border-industrial-800">
                <span className="text-xs text-slate-400 block mb-0.5">اسم العميل</span>
                <span className="font-bold text-slate-100">{customer.fullName}</span>
              </div>
              <div className="bg-industrial-950/60 p-3 rounded-xl border border-industrial-800">
                <span className="text-xs text-slate-400 block mb-0.5">المركبة واللوحة</span>
                <span className="font-bold text-brand-amber">{vehicle?.makeModel || '—'}</span>
                <span className="text-xs text-slate-400 block font-mono mt-0.5">{vehicle?.plateNumber}</span>
              </div>
              <div className="bg-industrial-950/60 p-3 rounded-xl border border-industrial-800">
                <span className="text-xs text-slate-400 block mb-0.5">نقاط الولاء</span>
                <span className="font-bold text-brand-emerald flex items-center gap-1">
                  <Sparkles className="w-4 h-4" /> {customer.loyaltyPoints} نقطة
                </span>
              </div>
              <div className="bg-industrial-950/60 p-3 rounded-xl border border-industrial-800">
                <span className="text-xs text-slate-400 block mb-0.5">الديون المسجلة</span>
                <span className={`font-bold ${customer.totalDebt > 0 ? 'text-brand-danger' : 'text-slate-300'}`}>
                  {customer.totalDebt.toLocaleString()} د.ع
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Error / Alert Messages */}
        {errorMessage && (
          <div className="bg-brand-danger/15 border border-brand-danger/40 text-brand-danger p-4 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            <p className="font-bold text-sm">{errorMessage}</p>
          </div>
        )}

        {saveSuccessMsg && (
          <div className="bg-brand-emerald/15 border border-brand-emerald/40 text-brand-emerald p-4 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="font-bold">{saveSuccessMsg}</p>
            </div>
          </div>
        )}

        {/* Main 2-Column POS Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (2 spans): Fluid Inputs & Technical Parameters */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Odometer & Interval Calculation */}
            <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center gap-2 text-brand-amber font-bold text-base border-b border-industrial-800 pb-2">
                <Gauge className="w-5 h-5" />
                <h2>العداد والمسافة المقطوعة (Odometer)</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    العداد الحالي (كم)
                  </label>
                  <input
                    type="number"
                    value={currentOdo}
                    onChange={(e) => setCurrentOdo(Number(e.target.value))}
                    className="w-full bg-industrial-950 border border-industrial-700 rounded-xl px-4 py-3 font-mono text-lg text-white focus:outline-none focus:border-brand-amber"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    العداد القادم للاستحقاق (كم)
                  </label>
                  <input
                    type="number"
                    value={nextOdo}
                    onChange={(e) => setNextOdo(Number(e.target.value))}
                    className="w-full bg-industrial-950 border border-industrial-700 rounded-xl px-4 py-3 font-mono text-lg text-brand-amber font-bold focus:outline-none focus:border-brand-amber"
                  />
                </div>
              </div>

              {/* Odometer Quick Jump Buttons */}
              <div className="flex flex-wrap gap-2 pt-2 items-center">
                <span className="text-xs text-slate-400">زيادة سريعة:</span>
                <button
                  type="button"
                  onClick={() => handleOdoShortcut(5000)}
                  className="px-3 py-1.5 bg-industrial-800 hover:bg-industrial-700 border border-industrial-700 rounded-lg text-xs font-bold text-slate-200 transition"
                >
                  +5,000 كم (زيوت نصف تخليقية)
                </button>
                <button
                  type="button"
                  onClick={() => handleOdoShortcut(7000)}
                  className="px-3 py-1.5 bg-industrial-800 hover:bg-industrial-700 border border-industrial-700 rounded-lg text-xs font-bold text-brand-amber transition"
                >
                  +7,000 كم (تخليقي قياسي)
                </button>
                <button
                  type="button"
                  onClick={() => handleOdoShortcut(10000)}
                  className="px-3 py-1.5 bg-industrial-800 hover:bg-industrial-700 border border-industrial-700 rounded-lg text-xs font-bold text-brand-emerald transition"
                >
                  +10,000 كم (فل سنثتيك ممتاز)
                </button>
              </div>
            </div>

            {/* Oil & Filter Selection with Fractional Dispensing */}
            <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center gap-2 text-brand-amber font-bold text-base border-b border-industrial-800 pb-2">
                <Car className="w-5 h-5" />
                <h2>اختيار الزيت والفلتر والكمية (باللتر من Firestore)</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    نوع الزيت المستخدم
                  </label>
                  <select
                    value={selectedOilId}
                    onChange={(e) => setSelectedOilId(e.target.value)}
                    className="w-full bg-industrial-950 border border-industrial-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-amber"
                  >
                    {products.filter(p => p.category === 'engine_oil').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - (المتاح بالمخزن: {p.totalLitersStock} لتر)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    الكمية المستهلكة (لتر دقيق)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="20"
                      value={oilLiters}
                      onChange={(e) => setOilLiters(Number(e.target.value))}
                      className="w-full bg-industrial-950 border border-industrial-700 rounded-xl px-4 py-3 font-mono text-lg font-bold text-white focus:outline-none focus:border-brand-amber"
                    />
                    <span className="absolute left-3 top-3.5 text-xs text-slate-400">Liters</span>
                  </div>
                </div>
              </div>

              {/* Filter code and Gear notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    فلتر الزيت
                  </label>
                  <select
                    value={selectedFilterId}
                    onChange={(e) => setSelectedFilterId(e.target.value)}
                    className="w-full bg-industrial-950 border border-industrial-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-amber"
                  >
                    {products.filter(p => p.category === 'filter').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.viscosity || ''})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    فحص زيت القير (ATF)
                  </label>
                  <input
                    type="text"
                    value={gearOilNotes}
                    onChange={(e) => setGearOilNotes(e.target.value)}
                    placeholder="مستوى، لون، أو لزوجة دهن القير..."
                    className="w-full bg-industrial-950 border border-industrial-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-brand-amber"
                  />
                </div>
              </div>

              {/* Technical Mechanic Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ملاحظات الفني (تبخير رنكات، تهريب زيت، حالة صوفة الكرنك)
                </label>
                <textarea
                  rows={2}
                  value={techNotes}
                  onChange={(e) => setTechNotes(e.target.value)}
                  placeholder="سجل أي ملاحظات ميكانيكية لتوثيقها في سجل السيارة وتنبيه الزبون..."
                  className="w-full bg-industrial-950 border border-industrial-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-brand-amber text-sm"
                />
              </div>
            </div>

          </div>

          {/* Right Column: Invoice, Payment & Checkout */}
          <div className="space-y-6">
            
            <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center gap-2 text-brand-emerald font-bold text-base border-b border-industrial-800 pb-2">
                <DollarSign className="w-5 h-5" />
                <h2>الحساب وطريقة الدفع السريع</h2>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm py-1 border-b border-industrial-800">
                  <span className="text-slate-400">سعر الزيت ({oilLiters} لتر)</span>
                  <span className="font-mono font-bold text-slate-200">
                    {((selectedOil?.salePrice || 12000) * (oilLiters / 4)).toLocaleString()} د.ع
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm py-1 border-b border-industrial-800">
                  <span className="text-slate-400">فلتر الزيت وأجور العمل</span>
                  <span className="font-mono font-bold text-slate-200">7,000 د.ع</span>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    المبلغ الإجمالي المستحق
                  </label>
                  <input
                    type="number"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(Number(e.target.value))}
                    className="w-full bg-industrial-950 border border-industrial-700 rounded-xl px-4 py-2.5 font-mono text-xl font-bold text-white focus:outline-none focus:border-brand-amber"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    المبلغ الواصل (المقبوض نقداً)
                  </label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="w-full bg-industrial-950 border border-industrial-700 rounded-xl px-4 py-2.5 font-mono text-xl font-bold text-brand-emerald focus:outline-none focus:border-brand-emerald"
                  />
                </div>

                {/* Remaining Debt Display */}
                <div className="p-3 bg-industrial-950 rounded-xl border border-industrial-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">المبلغ المتبقي (دين على الزبون):</span>
                  <span className={`font-mono font-bold ${debt > 0 ? 'text-brand-danger' : 'text-slate-400'}`}>
                    {debt.toLocaleString()} د.ع
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 space-y-2">
                <button
                  type="button"
                  disabled={savingVisit}
                  onClick={handleSaveVisit}
                  className="w-full py-3.5 bg-brand-amber hover:bg-brand-amberHover disabled:opacity-50 text-industrial-950 font-black rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 text-base"
                >
                  {savingVisit ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  <span>حفظ وتثبيت الزيارة (معاملة Firestore)</span>
                </button>

                {vehicle?.qrCodeId && (
                  <button
                    type="button"
                    onClick={() => window.open(`/public/vehicle/${vehicle.qrCodeId}`, '_blank')}
                    className="w-full py-2.5 bg-industrial-800 hover:bg-industrial-700 text-slate-200 font-semibold rounded-xl flex items-center justify-center gap-2 transition text-xs border border-industrial-700"
                  >
                    <FileText className="w-4 h-4" />
                    <span>طباعة ملصق الزجاج (QR Sticker)</span>
                  </button>
                )}
              </div>

            </div>

            {/* Previous Service Highlights */}
            <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-4 shadow-lg">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-amber" />
                آخر بيانات مسجلة للمركبة في Firestore
              </h3>
              {vehicle ? (
                <div className="text-xs space-y-1.5 text-slate-300 bg-industrial-950 p-3 rounded-xl border border-industrial-800">
                  <div className="flex justify-between">
                    <span className="text-slate-500">العداد السابق:</span>
                    <span className="font-mono text-brand-amber">{vehicle.lastOdometer?.toLocaleString()} كم</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">استحقاق القادم:</span>
                    <span className="font-mono text-brand-emerald">{vehicle.nextOdometer?.toLocaleString()} كم</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">الزيت المفضل:</span>
                    <span>{vehicle.preferredOil || '—'}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">لا توجد بيانات سابقة.</p>
              )}
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
