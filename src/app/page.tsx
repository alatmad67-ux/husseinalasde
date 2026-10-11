'use client';

import React, { useState, useEffect } from 'react';
import HeaderNav from '@/components/HeaderNav';
import { 
  searchCustomerOrVehicle, 
  recordServiceVisit,
  createCustomerWithVehicle,
  addVehicleToCustomer,
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
  FileText, 
  DollarSign, 
  Loader2,
  UserPlus,
  RefreshCw,
  X,
  Plus,
  Settings,
  Droplet
} from 'lucide-react';

export default function WorkshopPOSPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [savingVisit, setSavingVisit] = useState(false);
  
  // Current Customer & All their Registered Vehicles
  const [customer, setCustomer] = useState<CustomerDoc | null>(null);
  const [customerVehicles, setCustomerVehicles] = useState<VehicleDoc[]>([]);
  const [vehicle, setVehicle] = useState<VehicleDoc | null>(null);

  // Products from Firestore
  const [products, setProducts] = useState<ProductDoc[]>([]);

  // Odometer Inputs
  const [currentOdo, setCurrentOdo] = useState<number>(0);
  const [nextOdo, setNextOdo] = useState<number>(0);
  const [customKmInterval, setCustomKmInterval] = useState<string>('3000');

  // Engine Oil Inputs
  const [selectedOilId, setSelectedOilId] = useState<string>('');
  const [selectedOilSize, setSelectedOilSize] = useState<string>('');
  const [oilLiters, setOilLiters] = useState<number>(4.0);

  // Filter Input
  const [selectedFilterId, setSelectedFilterId] = useState<string>('');
  const [selectedFilterSize, setSelectedFilterSize] = useState<string>('');

  // Gear Oil Inputs (New!)
  const [includeGearOil, setIncludeGearOil] = useState<boolean>(false);
  const [selectedGearOilId, setSelectedGearOilId] = useState<string>('');
  const [selectedGearOilSize, setSelectedGearOilSize] = useState<string>('');
  const [gearOilLiters, setGearOilLiters] = useState<number>(4.0);
  const [gearOilNotes, setGearOilNotes] = useState<string>('فحص الگير: طبيعي');

  // Technical Notes & Financials
  const [techNotes, setTechNotes] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals: New Customer + Car OR Add Car to Current Customer
  const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
  const [addCarModalOpen, setAddCarModalOpen] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const [newCustForm, setNewCustForm] = useState({
    fullName: '',
    phoneNumber: '',
    makeModel: '',
    plateNumber: '',
    engineSize: '2.0L 4-سلندر',
    modelYear: new Date().getFullYear(),
    lastOdometer: 0,
    preferredOil: '10W40',
    preferredFilter: ''
  });

  const [newCarForm, setNewCarForm] = useState({
    makeModel: '',
    plateNumber: '',
    engineSize: '2.0L 4-سلندر',
    modelYear: new Date().getFullYear(),
    lastOdometer: 0,
    preferredOil: '10W40',
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
          if (firstOil?.id) {
            setSelectedOilId(firstOil.id);
            setSelectedOilSize(firstOil.availableSizes?.[0] || firstOil.viscosity || '');
          }
          const firstFilter = list.find(p => p.category === 'filter');
          if (firstFilter?.id) {
            setSelectedFilterId(firstFilter.id);
            setSelectedFilterSize(firstFilter.availableSizes?.[0] || firstFilter.viscosity || '');
          }
          const firstGear = list.find(p => p.category === 'gear_oil');
          if (firstGear?.id) {
            setSelectedGearOilId(firstGear.id);
            setSelectedGearOilSize(firstGear.availableSizes?.[0] || firstGear.viscosity || '');
          }
        }
      } catch (err) {
        console.warn('Firestore products fetch warning:', err);
      }
    }
    loadProducts();
  }, []);

  // Recalculate suggested price whenever oil, filter, or gear oil changes (using Service Price)
  useEffect(() => {
    const oilProd = products.find(p => p.id === selectedOilId);
    const filterProd = products.find(p => p.id === selectedFilterId);
    const gearProd = products.find(p => p.id === selectedGearOilId);

    const oilUnitService = oilProd?.serviceSalePrice || oilProd?.salePrice || 12000;
    const oilPackageLiters = oilProd?.packageSizeLiters || 4;
    const oilCalculated = Math.round((oilUnitService / oilPackageLiters) * oilLiters);

    const filterCalculated = filterProd ? (filterProd.serviceSalePrice || filterProd.salePrice || 7000) : 0;

    let gearCalculated = 0;
    if (includeGearOil && gearProd) {
      const gearUnitService = gearProd.serviceSalePrice || gearProd.salePrice || 15000;
      const gearPkgLiters = gearProd.packageSizeLiters || 4;
      gearCalculated = Math.round((gearUnitService / gearPkgLiters) * gearOilLiters);
    }

    const sum = oilCalculated + filterCalculated + gearCalculated;
    setTotalPrice(sum);
    setPaidAmount(sum);
  }, [selectedOilId, oilLiters, selectedFilterId, includeGearOil, selectedGearOilId, gearOilLiters, products]);

  // Reset to New Fresh Transaction
  const handleResetNewTransaction = () => {
    setCustomer(null);
    setCustomerVehicles([]);
    setVehicle(null);
    setSearchQuery('');
    setCurrentOdo(0);
    setNextOdo(0);
    setCustomKmInterval('3000');
    setOilLiters(4.0);
    setIncludeGearOil(false);
    setGearOilNotes('فحص الگير: طبيعي');
    setTechNotes('');
    setErrorMessage(null);
    setSaveSuccessMsg(null);
  };

  // Search by Phone or Plate
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoadingSearch(true);
    setErrorMessage(null);

    try {
      const result = await searchCustomerOrVehicle(searchQuery.trim());
      if (result && result.customer) {
        setCustomer(result.customer);
        setCustomerVehicles(result.vehicles || []);
        if (result.vehicle) {
          selectVehicleForPOS(result.vehicle);
        }
      } else {
        setErrorMessage('لم يتم العثور على زبون أو مركبة مطابقة. يمكنك الضغط على "+ تسجيل زبون جديد" بالأسفل.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'حدث خطأ أثناء البحث في قاعدة البيانات.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const selectVehicleForPOS = (v: VehicleDoc) => {
    setVehicle(v);
    const last = v.lastOdometer || 0;
    setCurrentOdo(last);
    setNextOdo(last + 3000);
    if (v.preferredOil) {
      setSelectedOilSize(v.preferredOil);
    }
  };

  // Odometer Shortcut handler
  const handleOdoShortcut = (km: number) => {
    setCustomKmInterval(String(km));
    setNextOdo(Number(currentOdo) + km);
  };

  const handleManualKmChange = (val: string) => {
    setCustomKmInterval(val);
    const num = Number(val) || 0;
    setNextOdo(Number(currentOdo) + num);
  };

  const handleCurrentOdoChange = (val: number) => {
    setCurrentOdo(val);
    const addKm = Number(customKmInterval) || 3000;
    setNextOdo(val + addKm);
  };

  // Create New Customer + Car
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

      setCustomer(res.customer);
      setCustomerVehicles(res.vehicles);
      selectVehicleForPOS(res.vehicle);
      setNewCustomerModalOpen(false);
      setSaveSuccessMsg(`تم تسجيل الزبون (${res.customer.fullName}) والسيارة بنجاح!`);
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء تسجيل الزبون.');
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Add Additional Car to Current Customer
  const handleAddCarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id) return;
    setCreatingCustomer(true);

    try {
      const res = await addVehicleToCustomer({
        customerId: customer.id,
        makeModel: newCarForm.makeModel,
        plateNumber: newCarForm.plateNumber,
        engineSize: newCarForm.engineSize,
        modelYear: Number(newCarForm.modelYear),
        lastOdometer: Number(newCarForm.lastOdometer),
        preferredOil: newCarForm.preferredOil,
        preferredFilter: newCarForm.preferredFilter
      });

      const updatedList = [...customerVehicles, res.vehicle];
      setCustomerVehicles(updatedList);
      selectVehicleForPOS(res.vehicle);
      setAddCarModalOpen(false);
      setSaveSuccessMsg(`تمت إضافة السيارة الجديدة (${res.vehicle.makeModel}) لملف الزبون ${customer.fullName}!`);
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء إضافة السيارة.');
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Save Service Visit
  const handleSaveVisit = async () => {
    if (!customer?.id || !vehicle?.id) {
      setErrorMessage('يرجى البحث عن زبون أولاً أو الضغط على "+ تسجيل زبون جديد".');
      return;
    }

    setSavingVisit(true);
    setErrorMessage(null);
    setSaveSuccessMsg(null);

    const selectedOil = products.find(p => p.id === selectedOilId);
    const selectedFilter = products.find(p => p.id === selectedFilterId);
    const selectedGear = products.find(p => p.id === selectedGearOilId);
    const calculatedDebt = Math.max(0, totalPrice - paidAmount);

    try {
      const res = await recordServiceVisit({
        customerId: customer.id,
        vehicleId: vehicle.id,
        currentOdometer: Number(currentOdo),
        nextOdometer: Number(nextOdo),
        oilProductId: selectedOilId,
        oilName: selectedOil?.name || 'زيت محرك',
        viscosity: selectedOilSize || selectedOil?.viscosity || '',
        oilLitersUsed: Number(oilLiters),
        filterCode: selectedFilterSize || selectedFilter?.viscosity || selectedFilter?.name || '',
        gearOilProductId: includeGearOil ? selectedGearOilId : undefined,
        gearOilName: includeGearOil ? selectedGear?.name : '',
        gearOilViscosity: includeGearOil ? selectedGearOilSize : '',
        gearOilLitersUsed: includeGearOil ? Number(gearOilLiters) : 0,
        gearOilDetails: gearOilNotes,
        technicalNotes: techNotes,
        totalPrice: Number(totalPrice),
        paidAmount: Number(paidAmount),
        debtAmount: calculatedDebt
      });

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

      setSaveSuccessMsg(`تم حفظ الزيارة بنجاح! تم خصم الزيوت من المخزون وإضافة 10 نقاط ولاء للزبون.`);
      setTimeout(() => setSaveSuccessMsg(null), 6000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'فشل حفظ الزيارة.');
    } finally {
      setSavingVisit(false);
    }
  };

  const selectedOil = products.find(p => p.id === selectedOilId);
  const selectedFilter = products.find(p => p.id === selectedFilterId);
  const selectedGear = products.find(p => p.id === selectedGearOilId);
  const debt = Math.max(0, totalPrice - paidAmount);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <HeaderNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-5">
        
        {/* Top Control Bar: Search OR New Customer */}
        <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Car className="w-5 h-5 text-amber-600" />
                <span>كاونتر تبديل الزيت والخدمة السريعة</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                ابحث برقم هاتف الزبون أو رقم اللوحة، أو سجل زبوناً جديداً مع مركبته.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setNewCustomerModalOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-xs font-black transition shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ تسجيل زبون جديد</span>
              </button>

              {customer && (
                <button
                  onClick={() => setAddCarModalOpen(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ إضافة سيارة أخرى للزبون</span>
                </button>
              )}

              <button
                onClick={handleResetNewTransaction}
                title="إفراغ الكاونتر وبدء معاملة جديدة"
                className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2.5 rounded-xl text-xs font-bold border border-slate-200 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تصفير</span>
              </button>
            </div>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute right-3.5 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث برقم هاتف الزبون (مثال: 0780...) أو رقم اللوحة أو الاسم..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-11 pl-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white font-mono text-sm font-bold"
              />
            </div>
            <button
              type="submit"
              disabled={loadingSearch}
              className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition text-sm"
            >
              {loadingSearch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>بحث عن الزبون</span>
            </button>
          </form>

          {/* Customer Profile & Multi-Vehicle Selector */}
          {customer ? (
            <div className="pt-2 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block font-semibold">اسم الزبون</span>
                  <span className="font-black text-slate-900 text-sm">{customer.fullName}</span>
                  <span className="text-xs text-slate-500 block font-mono mt-0.5">{customer.phoneNumber}</span>
                </div>

                {/* Vehicle Switcher if customer owns multiple cars */}
                <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                  <span className="text-[11px] text-amber-800 block font-bold mb-1">
                    اختر سيارة الزبون ({customerVehicles.length} مسجلة):
                  </span>
                  {customerVehicles.length > 1 ? (
                    <select
                      value={vehicle?.id || ''}
                      onChange={(e) => {
                        const found = customerVehicles.find(v => v.id === e.target.value);
                        if (found) selectVehicleForPOS(found);
                      }}
                      className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-black text-slate-900 focus:outline-none"
                    >
                      {customerVehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.makeModel} - ({v.plateNumber})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <span className="font-black text-amber-700 text-sm block">{vehicle?.makeModel || 'غير محدد'}</span>
                      <span className="text-[11px] text-slate-600 font-mono">{vehicle?.plateNumber}</span>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block font-semibold">نقاط الولاء</span>
                  <span className="font-black text-emerald-600 flex items-center gap-1 text-sm mt-1">
                    <Sparkles className="w-4 h-4" /> {customer.loyaltyPoints} نقطة
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block font-semibold">الديون السابقة</span>
                  <span className={`font-black text-sm block mt-1 ${customer.totalDebt > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                    {customer.totalDebt.toLocaleString()} د.ع
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center">
              <p className="text-xs text-slate-600 font-medium">
                الكاونتر جاهز لمعاملة جديدة — ابحث عن زبون حالي أو اضغط على <strong>"+ تسجيل زبون جديد"</strong>.
              </p>
            </div>
          )}
        </section>

        {/* Alerts */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <p className="font-bold text-sm">{errorMessage}</p>
          </div>
        )}

        {saveSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <p className="font-bold text-sm">{saveSuccessMsg}</p>
          </div>
        )}

        {/* POS Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (2 spans): Odometer + Engine Oil + Gear Oil + Notes */}
          <div className="lg:col-span-2 space-y-5">
            
            {/* 1. Odometer & Distance Section (3000km default + manual input) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-black text-base border-b border-slate-100 pb-2.5">
                <Gauge className="w-5 h-5 text-amber-600" />
                <h2>العداد والمسافة المقطوعة (Odometer)</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    العداد الحالي (كم)
                  </label>
                  <input
                    type="number"
                    value={currentOdo}
                    onChange={(e) => handleCurrentOdoChange(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono text-lg font-black text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-700 mb-1.5">
                    المسافة المضافة يدوياً (كم)
                  </label>
                  <input
                    type="number"
                    value={customKmInterval}
                    onChange={(e) => handleManualKmChange(e.target.value)}
                    placeholder="اكتب المسافة مثل 3000 أو 4500"
                    className="w-full bg-amber-50/50 border border-amber-300 rounded-xl px-3.5 py-2.5 font-mono text-lg font-black text-amber-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-700 mb-1.5">
                    العداد القادم للاستحقاق (كم)
                  </label>
                  <input
                    type="number"
                    value={nextOdo}
                    onChange={(e) => setNextOdo(Number(e.target.value))}
                    className="w-full bg-emerald-50/60 border border-emerald-300 rounded-xl px-3.5 py-2.5 font-mono text-lg font-black text-emerald-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Quick Distance Shortcut Buttons (3000, 5000, 10000) */}
              <div className="flex flex-wrap gap-2 pt-1 items-center">
                <span className="text-xs font-bold text-slate-500">اختصارات سريعة للمسافة:</span>
                <button
                  type="button"
                  onClick={() => handleOdoShortcut(3000)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black border transition ${
                    customKmInterval === '3000'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  +3,000 كم
                </button>
                <button
                  type="button"
                  onClick={() => handleOdoShortcut(5000)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black border transition ${
                    customKmInterval === '5000'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  +5,000 كم
                </button>
                <button
                  type="button"
                  onClick={() => handleOdoShortcut(10000)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black border transition ${
                    customKmInterval === '10000'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  +10,000 كم
                </button>
              </div>
            </div>

            {/* 2. Engine Oil & Filter Selection (With Size/Viscosity dropdown) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-black text-base border-b border-slate-100 pb-2.5">
                <Droplet className="w-5 h-5 text-amber-600" />
                <h2>زيت المحرك والفلتر</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Oil Product */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نوع / ماركة زيت المحرك
                  </label>
                  <select
                    value={selectedOilId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedOilId(id);
                      const prod = products.find(p => p.id === id);
                      if (prod) {
                        setSelectedOilSize(prod.availableSizes?.[0] || prod.viscosity || '');
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-bold text-xs focus:outline-none focus:border-amber-500"
                  >
                    {products.filter(p => p.category === 'engine_oil').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (متاح: {p.totalLitersStock} لتر)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Oil Viscosity / Size selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    درجة اللزوجة / السايز
                  </label>
                  {selectedOil?.availableSizes && selectedOil.availableSizes.length > 0 ? (
                    <select
                      value={selectedOilSize}
                      onChange={(e) => setSelectedOilSize(e.target.value)}
                      className="w-full bg-amber-50 border border-amber-300 rounded-xl px-3 py-2.5 text-amber-900 font-mono font-black text-xs focus:outline-none"
                    >
                      {selectedOil.availableSizes.map((sz) => (
                        <option key={sz} value={sz}>{sz}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={selectedOilSize}
                      onChange={(e) => setSelectedOilSize(e.target.value)}
                      placeholder="مثال: 10W40 أو 5W30"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-mono font-bold text-xs"
                    />
                  )}
                </div>

                {/* Liters Used */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الكمية باللتر
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="25"
                      value={oilLiters}
                      onChange={(e) => setOilLiters(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-base font-black text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">لتر</span>
                  </div>
                </div>
              </div>

              {/* Filter Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    فلتر الزيت
                  </label>
                  <select
                    value={selectedFilterId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedFilterId(id);
                      const prod = products.find(p => p.id === id);
                      if (prod) {
                        setSelectedFilterSize(prod.availableSizes?.[0] || prod.viscosity || '');
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-bold text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="">— بدون تبديل فلتر —</option>
                    {products.filter(p => p.category === 'filter').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (المتوفر: {p.totalLitersStock} قطعة)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    كود / رقم الفلتر
                  </label>
                  {selectedFilter?.availableSizes && selectedFilter.availableSizes.length > 0 ? (
                    <select
                      value={selectedFilterSize}
                      onChange={(e) => setSelectedFilterSize(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-mono font-bold text-xs"
                    >
                      {selectedFilter.availableSizes.map((sz) => (
                        <option key={sz} value={sz}>{sz}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={selectedFilterSize}
                      onChange={(e) => setSelectedFilterSize(e.target.value)}
                      placeholder="كود الفلتر..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-mono text-xs"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* 3. Gear Oil Selection (اختيار دهن الجير / القير) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2 text-slate-900 font-black text-base">
                  <Settings className="w-5 h-5 text-amber-600" />
                  <h2>دهن الجير (القير) والملاحظات الفنية</h2>
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                  <input
                    type="checkbox"
                    checked={includeGearOil}
                    onChange={(e) => setIncludeGearOil(e.target.checked)}
                    className="w-4 h-4 accent-amber-600 rounded"
                  />
                  <span className="text-xs font-black text-amber-900">تبديل أو إضافة دهن جير؟</span>
                </label>
              </div>

              {includeGearOil && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-amber-50/40 p-3.5 rounded-xl border border-amber-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      نوع دهن الجير
                    </label>
                    <select
                      value={selectedGearOilId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedGearOilId(id);
                        const prod = products.find(p => p.id === id);
                        if (prod) {
                          setSelectedGearOilSize(prod.availableSizes?.[0] || prod.viscosity || '');
                        }
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-xs"
                    >
                      {products.filter(p => p.category === 'gear_oil').map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (المتاح: {p.totalLitersStock} لتر)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      عيار / سايز دهن الجير
                    </label>
                    {selectedGear?.availableSizes && selectedGear.availableSizes.length > 0 ? (
                      <select
                        value={selectedGearOilSize}
                        onChange={(e) => setSelectedGearOilSize(e.target.value)}
                        className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-amber-900 font-mono font-bold text-xs"
                      >
                        {selectedGear.availableSizes.map((sz) => (
                          <option key={sz} value={sz}>{sz}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={selectedGearOilSize}
                        onChange={(e) => setSelectedGearOilSize(e.target.value)}
                        placeholder="ATF / CVT / 75W90"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الكمية باللتر
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={gearOilLiters}
                      onChange={(e) => setGearOilLiters(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-black text-sm text-slate-900"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ملاحظات فحص الجير
                  </label>
                  <input
                    type="text"
                    value={gearOilNotes}
                    onChange={(e) => setGearOilNotes(e.target.value)}
                    placeholder="مستوى أو حالة دهن الجير..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs font-medium focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ملاحظات الفني العامّة (تبخير، تهريب، ماء راديتر)
                  </label>
                  <input
                    type="text"
                    value={techNotes}
                    onChange={(e) => setTechNotes(e.target.value)}
                    placeholder="سجل أي ملاحظات ميكانيكية لتوثيقها..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs font-medium focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Checkout & Summary */}
          <div className="space-y-5">
            
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 font-black text-base border-b border-slate-100 pb-2.5">
                <DollarSign className="w-5 h-5" />
                <h2>خلاصة الحساب والدفع (سعر الخدمة والتبديل)</h2>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">
                    زيت المحرك ({selectedOilSize || '—'} × {oilLiters} لتر):
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {Math.round(((selectedOil?.serviceSalePrice || selectedOil?.salePrice || 12000) / (selectedOil?.packageSizeLiters || 4)) * oilLiters).toLocaleString()} د.ع
                  </span>
                </div>

                {selectedFilter && (
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">فلتر الزيت ({selectedFilterSize}):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {(selectedFilter.serviceSalePrice || selectedFilter.salePrice || 7000).toLocaleString()} د.ع
                    </span>
                  </div>
                )}

                {includeGearOil && selectedGear && (
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-amber-800">
                    <span className="font-bold">دهن الجير ({selectedGearOilSize} × {gearOilLiters} لتر):</span>
                    <span className="font-mono font-bold">
                      {Math.round(((selectedGear.serviceSalePrice || selectedGear.salePrice || 15000) / (selectedGear.packageSizeLiters || 4)) * gearOilLiters).toLocaleString()} د.ع
                    </span>
                  </div>
                )}

                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المبلغ الإجمالي النهائي (د.ع)
                  </label>
                  <input
                    type="number"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 font-mono text-xl font-black text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-700 mb-1">
                    المبلغ الواصل (المقبوض نقداً)
                  </label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="w-full bg-emerald-50/50 border border-emerald-300 rounded-xl px-4 py-2.5 font-mono text-xl font-black text-emerald-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">الباقي (يُسجل ديناً):</span>
                  <span className={`font-mono font-black text-sm ${debt > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                    {debt.toLocaleString()} د.ع
                  </span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="button"
                  disabled={savingVisit || !customer}
                  onClick={handleSaveVisit}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-amber-500/20 text-sm"
                >
                  {savingVisit ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  <span>تثبيت الزيارة وحفظ الفاتورة</span>
                </button>

                {vehicle?.qrCodeId && (
                  <button
                    type="button"
                    onClick={() => window.open(`/public/vehicle/${vehicle.qrCodeId}`, '_blank')}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-2 transition text-xs border border-slate-200"
                  >
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>فتح وطباعة ملصق الزجاج (QR Sticker)</span>
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Modal 1: Register New Customer + First Car */}
      {newCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-600" />
                <span>تسجيل زبون جديد مع مركبته</span>
              </h2>
              <button onClick={() => setNewCustomerModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-black text-amber-700 block">بيانات الزبون:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">اسم الزبون</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: حيدر علي الاسدي"
                      value={newCustForm.fullName}
                      onChange={(e) => setNewCustForm({ ...newCustForm, fullName: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">رقم الهاتف</label>
                    <input
                      type="text"
                      required
                      placeholder="0780xxxxxxx"
                      value={newCustForm.phoneNumber}
                      onChange={(e) => setNewCustForm({ ...newCustForm, phoneNumber: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-black text-amber-700 block">بيانات السيارة:</span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">نوع وموديل السيارة</label>
                    <input
                      type="text"
                      required
                      placeholder="توسان / النترا / كامري"
                      value={newCustForm.makeModel}
                      onChange={(e) => setNewCustForm({ ...newCustForm, makeModel: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">رقم اللوحة</label>
                    <input
                      type="text"
                      required
                      placeholder="بغداد 12345"
                      value={newCustForm.plateNumber}
                      onChange={(e) => setNewCustForm({ ...newCustForm, plateNumber: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">سنة الصنع</label>
                    <input
                      type="number"
                      value={newCustForm.modelYear}
                      onChange={(e) => setNewCustForm({ ...newCustForm, modelYear: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">حجم المحرك</label>
                    <input
                      type="text"
                      value={newCustForm.engineSize}
                      onChange={(e) => setNewCustForm({ ...newCustForm, engineSize: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">العداد الحالي</label>
                    <input
                      type="number"
                      value={newCustForm.lastOdometer}
                      onChange={(e) => setNewCustForm({ ...newCustForm, lastOdometer: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={creatingCustomer}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl flex items-center justify-center gap-2"
                >
                  {creatingCustomer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>حفظ الزبون والسيارة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewCustomerModalOpen(false)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add Additional Vehicle to Existing Customer */}
      {addCarModalOpen && customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Car className="w-5 h-5 text-emerald-600" />
                <span>إضافة سيارة جديدة للزبون: {customer.fullName}</span>
              </h2>
              <button onClick={() => setAddCarModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCarSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-bold">نوع وموديل السيارة الجديدة</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: تاهو / سوناتا / بيك اب"
                  value={newCarForm.makeModel}
                  onChange={(e) => setNewCarForm({ ...newCarForm, makeModel: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">رقم اللوحة</label>
                <input
                  type="text"
                  required
                  placeholder="بغداد 99887"
                  value={newCarForm.plateNumber}
                  onChange={(e) => setNewCarForm({ ...newCarForm, plateNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">حجم المحرك</label>
                  <input
                    type="text"
                    value={newCarForm.engineSize}
                    onChange={(e) => setNewCarForm({ ...newCarForm, engineSize: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">العداد الحالي (كم)</label>
                  <input
                    type="number"
                    value={newCarForm.lastOdometer}
                    onChange={(e) => setNewCarForm({ ...newCarForm, lastOdometer: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={creatingCustomer}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl flex items-center justify-center gap-2"
                >
                  {creatingCustomer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>إضافة السيارة لملف الزبون</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAddCarModalOpen(false)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
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
