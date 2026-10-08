'use client';

import React, { useState, useEffect } from 'react';
import HeaderNav from '@/components/HeaderNav';
import { 
  searchCustomerOrVehicle, 
  recordServiceVisit,
  createCustomerWithVehicle,
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
  Loader2,
  UserPlus,
  RefreshCw,
  X
} from 'lucide-react';

export default function WorkshopPOSPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [savingVisit, setSavingVisit] = useState(false);
  
  // Current Selected Customer & Vehicle from Firestore
  const [customer, setCustomer] = useState<CustomerDoc | null>(null);
  const [vehicle, setVehicle] = useState<VehicleDoc | null>(null);

  // Products from Firestore
  const [products, setProducts] = useState<ProductDoc[]>([
    { id: 'prod-1', name: 'Mobil 1 ESP 5W-30 (تخليقي بالكامل)', category: 'engine_oil', viscosity: '5W30', packageSizeLiters: 5, totalLitersStock: 48.5, unitCost: 9000, salePrice: 12000 },
    { id: 'prod-2', name: 'Castrol Magnatec 10W-40', category: 'engine_oil', viscosity: '10W40', packageSizeLiters: 4, totalLitersStock: 32.0, unitCost: 7000, salePrice: 9500 },
    { id: 'prod-3', name: 'Liqui Moly Molygen 5W-40', category: 'engine_oil', viscosity: '5W40', packageSizeLiters: 5, totalLitersStock: 14.5, unitCost: 10500, salePrice: 13500 },
    { id: 'prod-4', name: 'فلتر زيت أصلي تويوتا', category: 'filter', viscosity: '90915-YZZE2', packageSizeLiters: 1, totalLitersStock: 18, unitCost: 4500, salePrice: 7000 }
  ]);

  // Form Inputs for the Visit
  const [currentOdo, setCurrentOdo] = useState<number>(0);
  const [nextOdo, setNextOdo] = useState<number>(0);
  const [selectedOilId, setSelectedOilId] = useState<string>('prod-1');
  const [oilLiters, setOilLiters] = useState<number>(4.0);
  const [selectedFilterId, setSelectedFilterId] = useState<string>('prod-4');
  const [gearOilNotes, setGearOilNotes] = useState<string>('فحص الگير: طبيعي ولا يحتاج تبديل');
  const [techNotes, setTechNotes] = useState<string>('');
  
  // Financials
  const [totalPrice, setTotalPrice] = useState<number>(55000);
  const [paidAmount, setPaidAmount] = useState<number>(55000);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State for Registering a New Customer + Car
  const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [newCustForm, setNewCustForm] = useState({
    fullName: '',
    phoneNumber: '',
    makeModel: '',
    plateNumber: '',
    engineSize: '2.0L 4-سلندر',
    modelYear: new Date().getFullYear(),
    lastOdometer: 0,
    preferredOil: '5W30',
    preferredFilter: ''
  });

  // Load products list from Firestore
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
        console.warn('Firestore products fetch warning:', err);
      }
    }
    loadProducts();
  }, []);

  // Reset to New Fresh Transaction
  const handleResetNewTransaction = () => {
    setCustomer(null);
    setVehicle(null);
    setSearchQuery('');
    setCurrentOdo(0);
    setNextOdo(0);
    setOilLiters(4.0);
    setGearOilNotes('فحص الگير: طبيعي');
    setTechNotes('');
    setTotalPrice(55000);
    setPaidAmount(55000);
    setErrorMessage(null);
    setSaveSuccessMsg(null);
  };

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
          const last = result.vehicle.lastOdometer || 0;
          setCurrentOdo(last);
          setNextOdo(last + 7000);
        }
      } else {
        setErrorMessage('لم يتم العثور على زبون أو مركبة مطابقة. يمكنك الضغط على "تسجيل زبون جديد" بالأسفل.');
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

  // Create New Customer + Car Handler
  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingCustomer(true);
    setErrorMessage(null);

    try {
      const res = await createCustomerWithVehicle({
        fullName: newCustForm.fullName,
        phoneNumber: newCustForm.phoneNumber,
        makeModel: newCustForm.makeModel,
        plateNumber: newCustForm.plateNumber,
        engineSize: newCustForm.engineSize,
        modelYear: Number(newCustForm.modelYear),
        lastOdometer: Number(newCustForm.lastOdometer),
        preferredOil: newCustForm.preferredOil,
        preferredFilter: newCustForm.preferredFilter
      });

      // Auto-select the newly created customer and car into current POS state
      setCustomer(res.customer);
      setVehicle(res.vehicle);
      setCurrentOdo(res.vehicle.lastOdometer || 0);
      setNextOdo((res.vehicle.lastOdometer || 0) + 7000);
      setNewCustomerModalOpen(false);
      setSaveSuccessMsg(`تم إنشاء ملف الزبون (${res.customer.fullName}) والمركبة بنجاح في Firestore! يمكنك الآن تثبيت الزيارة.`);
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء تسجيل الزبون في Firestore.');
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Submit and commit atomic Firestore transaction
  const handleSaveVisit = async () => {
    if (!customer?.id || !vehicle?.id) {
      setErrorMessage('يرجى تحديد زبون بالبحث أولاً أو إنشاء ملف زبون جديد للبدء.');
      return;
    }

    setSavingVisit(true);
    setErrorMessage(null);
    setSaveSuccessMsg(null);

    const selectedOil = products.find(p => p.id === selectedOilId);
    const selectedFilter = products.find(p => p.id === selectedFilterId);
    const calculatedDebt = Math.max(0, totalPrice - paidAmount);

    try {
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

      // Update local state
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

      setSaveSuccessMsg(`تم تثبيت الزيارة بنجاح في Firestore (معرّف: ${res.visitId}). تم خصم ${oilLiters} لتر وإضافة 10 نقاط ولاء للزبون.`);
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
        
        {/* Top Control Bar: Search OR New Customer */}
        <section className="bg-industrial-900 border border-industrial-800 rounded-2xl p-4 md:p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-industrial-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Car className="w-5 h-5 text-brand-amber" />
                <span>كاونتر تبديل الزيت والخدمة السريعة</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ابحث برقم هاتف الزبون أو لوحة المركبة، أو افتح معاملة جديدة فوراً.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setNewCustomerModalOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-brand-amber hover:bg-brand-amberHover text-industrial-950 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-amber-500/10"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ تسجيل زبون جديد</span>
              </button>

              <button
                onClick={handleResetNewTransaction}
                title="إفراغ الكاونتر وبدء معاملة جديدة"
                className="flex items-center justify-center gap-1.5 bg-industrial-800 hover:bg-industrial-700 text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold border border-industrial-700 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تصفير</span>
              </button>
            </div>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute right-3.5 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث برقم هاتف الزبون (مثال: 0770...) أو رقم اللوحة..."
                className="w-full bg-industrial-950 border border-industrial-700 rounded-xl pr-11 pl-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-amber font-mono text-base tracking-wider"
              />
            </div>
            <button
              type="submit"
              disabled={loadingSearch}
              className="w-full md:w-auto px-6 py-3 bg-industrial-800 hover:bg-brand-amber hover:text-industrial-950 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition border border-industrial-700 text-sm"
            >
              {loadingSearch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>بحث في قاعدة البيانات</span>
            </button>
          </form>

          {/* Customer Profile Status */}
          {customer ? (
            <div className="pt-2 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-industrial-950 p-3 rounded-xl border border-industrial-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">الزبون الحالي</span>
                <span className="font-bold text-white text-sm">{customer.fullName}</span>
                <span className="text-[11px] text-slate-400 block font-mono mt-0.5">{customer.phoneNumber}</span>
              </div>
              <div className="bg-industrial-950 p-3 rounded-xl border border-industrial-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">المركبة الحالية</span>
                <span className="font-bold text-brand-amber text-sm">{vehicle?.makeModel || 'غير محدد'}</span>
                <span className="text-[11px] text-slate-400 block font-mono mt-0.5">{vehicle?.plateNumber}</span>
              </div>
              <div className="bg-industrial-950 p-3 rounded-xl border border-industrial-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">نقاط الولاء</span>
                <span className="font-bold text-brand-emerald flex items-center gap-1 text-sm">
                  <Sparkles className="w-3.5 h-3.5" /> {customer.loyaltyPoints} نقطة
                </span>
              </div>
              <div className="bg-industrial-950 p-3 rounded-xl border border-industrial-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">الديون المسجلة</span>
                <span className={`font-bold text-sm ${customer.totalDebt > 0 ? 'text-brand-danger' : 'text-slate-300'}`}>
                  {customer.totalDebt.toLocaleString()} د.ع
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-industrial-950/60 rounded-xl border border-dashed border-industrial-800 text-center">
              <p className="text-xs text-slate-400">
                لم يتم اختيار زبون بعد. ابحث برقم الهاتف أو اضغط على <strong>"تسجيل زبون جديد"</strong> للبدء فوراً.
              </p>
            </div>
          )}
        </section>

        {/* Alerts */}
        {errorMessage && (
          <div className="bg-brand-danger/15 border border-brand-danger/40 text-brand-danger p-4 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="font-bold text-sm">{errorMessage}</p>
          </div>
        )}

        {saveSuccessMsg && (
          <div className="bg-brand-emerald/15 border border-brand-emerald/40 text-brand-emerald p-4 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <p className="font-bold text-sm">{saveSuccessMsg}</p>
          </div>
        )}

        {/* POS Grid: Odometer + Fluid + Invoicing */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Fluid Inputs & Parameters */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Odometer Section */}
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
                <span className="text-xs text-slate-400">إضافة مسافة:</span>
                <button
                  type="button"
                  onClick={() => handleOdoShortcut(5000)}
                  className="px-3 py-1.5 bg-industrial-800 hover:bg-industrial-700 border border-industrial-700 rounded-lg text-xs font-bold text-slate-200 transition"
                >
                  +5,000 كم
                </button>
                <button
                  type="button"
                  onClick={() => handleOdoShortcut(7000)}
                  className="px-3 py-1.5 bg-industrial-800 hover:bg-industrial-700 border border-industrial-700 rounded-lg text-xs font-bold text-brand-amber transition"
                >
                  +7,000 كم
                </button>
                <button
                  type="button"
                  onClick={() => handleOdoShortcut(10000)}
                  className="px-3 py-1.5 bg-industrial-800 hover:bg-industrial-700 border border-industrial-700 rounded-lg text-xs font-bold text-brand-emerald transition"
                >
                  +10,000 كم
                </button>
              </div>
            </div>

            {/* Oil & Filter Selection */}
            <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center gap-2 text-brand-amber font-bold text-base border-b border-industrial-800 pb-2">
                <Car className="w-5 h-5" />
                <h2>اختيار الزيت والفلتر والكمية (باللتر الدقيق)</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    نوع الزيت المستخدم
                  </label>
                  <select
                    value={selectedOilId}
                    onChange={(e) => setSelectedOilId(e.target.value)}
                    className="w-full bg-industrial-950 border border-industrial-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-amber text-xs"
                  >
                    {products.filter(p => p.category === 'engine_oil').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - (المتاح: {p.totalLitersStock} لتر)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    الكمية المستهلكة (لتر)
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

              {/* Filter and Gear notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    فلتر الزيت
                  </label>
                  <select
                    value={selectedFilterId}
                    onChange={(e) => setSelectedFilterId(e.target.value)}
                    className="w-full bg-industrial-950 border border-industrial-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-amber text-xs"
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
                    className="w-full bg-industrial-950 border border-industrial-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-brand-amber text-xs"
                  />
                </div>
              </div>

              {/* Mechanic Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ملاحظات الفني (تبخير رنكات، تهريب زيت، ماء راديتر)
                </label>
                <textarea
                  rows={2}
                  value={techNotes}
                  onChange={(e) => setTechNotes(e.target.value)}
                  placeholder="سجل أي ملاحظات ميكانيكية لتوثيقها في سجل السيارة وتنبيه الزبون..."
                  className="w-full bg-industrial-950 border border-industrial-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-brand-amber text-xs"
                />
              </div>
            </div>

          </div>

          {/* Right Column: Checkout & Actions */}
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
                  disabled={savingVisit || !customer}
                  onClick={handleSaveVisit}
                  className="w-full py-3.5 bg-brand-amber hover:bg-brand-amberHover disabled:opacity-50 text-industrial-950 font-black rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 text-base"
                >
                  {savingVisit ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  <span>تثبيت الزيارة وخصم الزيت (Firestore)</span>
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

          </div>

        </div>

      </main>

      {/* Modal: Create New Customer + Car */}
      {newCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-industrial-900 border border-industrial-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-industrial-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand-amber" />
                <span>تسجيل زبون ومركبة جديدة</span>
              </h2>
              <button
                onClick={() => setNewCustomerModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-3.5 text-xs">
              
              {/* Customer Personal Details */}
              <div className="bg-industrial-950 p-3 rounded-2xl border border-industrial-800 space-y-3">
                <span className="font-bold text-brand-amber block">بيانات الزبون الشخصية:</span>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">الاسم الكامل</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: علي كريم الخفاجي"
                    value={newCustForm.fullName}
                    onChange={(e) => setNewCustForm({ ...newCustForm, fullName: e.target.value })}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-amber"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">رقم الهاتف</label>
                  <input
                    type="text"
                    required
                    placeholder="0770xxxxxxx"
                    value={newCustForm.phoneNumber}
                    onChange={(e) => setNewCustForm({ ...newCustForm, phoneNumber: e.target.value })}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-brand-amber"
                  />
                </div>
              </div>

              {/* Vehicle Details */}
              <div className="bg-industrial-950 p-3 rounded-2xl border border-industrial-800 space-y-3">
                <span className="font-bold text-brand-amber block">بيانات المركبة والمحرك:</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">نوع وموديل السيارة</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: كيا سبورتاج / هونداي النترا"
                      value={newCustForm.makeModel}
                      onChange={(e) => setNewCustForm({ ...newCustForm, makeModel: e.target.value })}
                      className="w-full bg-industrial-900 border border-industrial-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-amber"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">رقم اللوحة</label>
                    <input
                      type="text"
                      required
                      placeholder="بغداد 12345 خصوصي"
                      value={newCustForm.plateNumber}
                      onChange={(e) => setNewCustForm({ ...newCustForm, plateNumber: e.target.value })}
                      className="w-full bg-industrial-900 border border-industrial-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-brand-amber"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">سنة الصنع</label>
                    <input
                      type="number"
                      value={newCustForm.modelYear}
                      onChange={(e) => setNewCustForm({ ...newCustForm, modelYear: Number(e.target.value) })}
                      className="w-full bg-industrial-900 border border-industrial-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-brand-amber"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">حجم المحرك</label>
                    <input
                      type="text"
                      placeholder="2.0L / 2.4L / 3.5L"
                      value={newCustForm.engineSize}
                      onChange={(e) => setNewCustForm({ ...newCustForm, engineSize: e.target.value })}
                      className="w-full bg-industrial-900 border border-industrial-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-brand-amber"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">العداد الحالي (كم)</label>
                    <input
                      type="number"
                      value={newCustForm.lastOdometer}
                      onChange={(e) => setNewCustForm({ ...newCustForm, lastOdometer: Number(e.target.value) })}
                      className="w-full bg-industrial-900 border border-industrial-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-brand-amber"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">اللزوجة المفضلة</label>
                    <input
                      type="text"
                      placeholder="5W30 أو 5W40"
                      value={newCustForm.preferredOil}
                      onChange={(e) => setNewCustForm({ ...newCustForm, preferredOil: e.target.value })}
                      className="w-full bg-industrial-900 border border-industrial-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-brand-amber"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">كود الفلتر المفضل</label>
                    <input
                      type="text"
                      placeholder="كود فلتر الزيت"
                      value={newCustForm.preferredFilter}
                      onChange={(e) => setNewCustForm({ ...newCustForm, preferredFilter: e.target.value })}
                      className="w-full bg-industrial-900 border border-industrial-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-brand-amber"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={creatingCustomer}
                  className="flex-1 py-3 bg-brand-amber hover:bg-brand-amberHover disabled:opacity-50 text-industrial-950 font-black rounded-xl flex items-center justify-center gap-2 transition"
                >
                  {creatingCustomer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>حفظ الزبون وبدء المعاملة فوراً</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewCustomerModalOpen(false)}
                  className="px-4 py-3 bg-industrial-800 hover:bg-industrial-700 text-slate-300 font-bold rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
