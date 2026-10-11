'use client';

import React, { useState, useEffect } from 'react';
import HeaderNav from '@/components/HeaderNav';
import IraqiPlateBadge from '@/components/IraqiPlateBadge';
import ReceiptModal, { ReceiptData } from '@/components/ReceiptModal';
import { 
  searchCustomerOrVehicle, 
  recordServiceVisit,
  createCustomerWithVehicle,
  addVehicleToCustomer,
  getProductsList,
  formatExactDateTime
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
  Droplet,
  Calendar
} from 'lucide-react';

export default function WorkshopPOSPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [savingVisit, setSavingVisit] = useState(false);
  const [liveClock, setLiveClock] = useState('');
  
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

  // Engine Oil Inputs + Editable Price
  const [selectedOilId, setSelectedOilId] = useState<string>('');
  const [selectedOilSize, setSelectedOilSize] = useState<string>('');
  const [oilLiters, setOilLiters] = useState<number>(4.0);
  const [oilPricePerLiter, setOilPricePerLiter] = useState<number>(3000);
  const [oilTotalCustomPrice, setOilTotalCustomPrice] = useState<number>(12000);

  // Filter Input + Editable Price
  const [selectedFilterId, setSelectedFilterId] = useState<string>('');
  const [selectedFilterSize, setSelectedFilterSize] = useState<string>('');
  const [filterCustomPrice, setFilterCustomPrice] = useState<number>(7500);

  // Gear Oil Inputs + Editable Price
  const [includeGearOil, setIncludeGearOil] = useState<boolean>(false);
  const [selectedGearOilId, setSelectedGearOilId] = useState<string>('');
  const [selectedGearOilSize, setSelectedGearOilSize] = useState<string>('');
  const [gearOilLiters, setGearOilLiters] = useState<number>(4.0);
  const [gearCustomPrice, setGearCustomPrice] = useState<number>(16000);
  const [gearOilNotes, setGearOilNotes] = useState<string>('فحص الگير: طبيعي');

  // Technical Notes & Financials
  const [techNotes, setTechNotes] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Receipt Modal State
  const [receiptModalData, setReceiptModalData] = useState<ReceiptData | null>(null);

  // Modals: New Customer + Car OR Add Car to Current Customer
  const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
  const [addCarModalOpen, setAddCarModalOpen] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const [newCustForm, setNewCustForm] = useState({
    fullName: '',
    phoneNumber: '',
    makeModel: '',
    plateNumber: '14 A 12345',
    engineSize: '2.0L 4-سلندر',
    modelYear: new Date().getFullYear(),
    lastOdometer: 0,
    preferredOil: '10W40',
    preferredFilter: ''
  });

  const [newCarForm, setNewCarForm] = useState({
    makeModel: '',
    plateNumber: '14 G 34567',
    engineSize: '2.0L 4-سلندر',
    modelYear: new Date().getFullYear(),
    lastOdometer: 0,
    preferredOil: '10W40',
    preferredFilter: ''
  });

  // Live Clock display
  useEffect(() => {
    const updateClock = () => {
      setLiveClock(new Date().toLocaleString('ar-IQ', { dateStyle: 'full', timeStyle: 'short' }));
    };
    updateClock();
    const timer = setInterval(updateClock, 15000);
    return () => clearInterval(timer);
  }, []);

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
            const pkgPrice = firstOil.serviceSalePrice || firstOil.salePrice || 12000;
            const pkgLiters = firstOil.packageSizeLiters || 4;
            const perL = Math.round(pkgPrice / pkgLiters);
            setOilPricePerLiter(perL);
            setOilTotalCustomPrice(perL * 4);
          }
          const firstFilter = list.find(p => p.category === 'filter');
          if (firstFilter?.id) {
            setSelectedFilterId(firstFilter.id);
            setSelectedFilterSize(firstFilter.availableSizes?.[0] || firstFilter.viscosity || '');
            setFilterCustomPrice(firstFilter.serviceSalePrice || firstFilter.salePrice || 7500);
          }
          const firstGear = list.find(p => p.category === 'gear_oil');
          if (firstGear?.id) {
            setSelectedGearOilId(firstGear.id);
            setSelectedGearOilSize(firstGear.availableSizes?.[0] || firstGear.viscosity || '');
            setGearCustomPrice(firstGear.serviceSalePrice || firstGear.salePrice || 16000);
          }
        }
      } catch (err) {
        console.warn('Firestore products fetch warning:', err);
      }
    }
    loadProducts();
  }, []);

  // Recalculate total invoice when individual editable item prices change
  useEffect(() => {
    const filterVal = selectedFilterId ? Number(filterCustomPrice || 0) : 0;
    const gearVal = includeGearOil ? Number(gearCustomPrice || 0) : 0;
    const sum = Number(oilTotalCustomPrice || 0) + filterVal + gearVal;
    setTotalPrice(sum);
    setPaidAmount(sum);
  }, [oilTotalCustomPrice, selectedFilterId, filterCustomPrice, includeGearOil, gearCustomPrice]);

  // Handlers for Oil Selection & Liters & Per-Liter Price
  const handleSelectOilProduct = (id: string) => {
    setSelectedOilId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      setSelectedOilSize(prod.availableSizes?.[0] || prod.viscosity || '');
      const pkgPrice = prod.serviceSalePrice || prod.salePrice || 12000;
      const pkgLiters = prod.packageSizeLiters || 4;
      const perLiter = Math.round(pkgPrice / pkgLiters);
      setOilPricePerLiter(perLiter);
      setOilTotalCustomPrice(Math.round(perLiter * oilLiters));
    }
  };

  const handleOilLitersChange = (liters: number) => {
    setOilLiters(liters);
    setOilTotalCustomPrice(Math.round(oilPricePerLiter * liters));
  };

  const handleOilPricePerLiterChange = (perLiter: number) => {
    setOilPricePerLiter(perLiter);
    setOilTotalCustomPrice(Math.round(perLiter * oilLiters));
  };

  const handleSelectFilterProduct = (id: string) => {
    setSelectedFilterId(id);
    if (!id) {
      setFilterCustomPrice(0);
      return;
    }
    const prod = products.find(p => p.id === id);
    if (prod) {
      setSelectedFilterSize(prod.availableSizes?.[0] || prod.viscosity || '');
      setFilterCustomPrice(prod.serviceSalePrice || prod.salePrice || 7500);
    }
  };

  const handleSelectGearOilProduct = (id: string) => {
    setSelectedGearOilId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      setSelectedGearOilSize(prod.availableSizes?.[0] || prod.viscosity || '');
      const pkgPrice = prod.serviceSalePrice || prod.salePrice || 16000;
      const pkgLiters = prod.packageSizeLiters || 4;
      setGearCustomPrice(Math.round((pkgPrice / pkgLiters) * gearOilLiters));
    }
  };

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

  // Fast Parallel Search by Phone or Plate
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
        setErrorMessage('لم يتم العثور على زبون أو مركبة مطابقة. اضغط على "+ تسجيل زبون جديد" لإضافته فوراً.');
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

  // Save Service Visit & Open Receipt Modal
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
        filterCode: selectedFilterId ? (selectedFilterSize || selectedFilter?.viscosity || selectedFilter?.name || '') : '',
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

      // Build receipt items
      const receiptItems: { label: string; qty: string; price: number }[] = [
        {
          label: `${selectedOil?.name || 'زيت محرك'} (${selectedOilSize})`,
          qty: `${oilLiters} لتر`,
          price: Number(oilTotalCustomPrice)
        }
      ];

      if (selectedFilterId && selectedFilter) {
        receiptItems.push({
          label: `${selectedFilter.name} (${selectedFilterSize})`,
          qty: `1 قطعة`,
          price: Number(filterCustomPrice)
        });
      }

      if (includeGearOil && selectedGear) {
        receiptItems.push({
          label: `${selectedGear.name} (${selectedGearOilSize})`,
          qty: `${gearOilLiters} لتر`,
          price: Number(gearCustomPrice)
        });
      }

      setReceiptModalData({
        receiptNumber: `INV-${res.visitId.slice(-6).toUpperCase()}`,
        dateTimeStr: formatExactDateTime(new Date().toISOString()),
        customerName: customer.fullName,
        customerPhone: customer.phoneNumber,
        vehicleModel: vehicle.makeModel,
        plateNumber: vehicle.plateNumber,
        currentOdometer: Number(currentOdo),
        nextOdometer: Number(nextOdo),
        items: receiptItems,
        totalPrice: Number(totalPrice),
        paidAmount: Number(paidAmount),
        debtAmount: calculatedDebt,
        techNotes,
        qrCodeId: vehicle.qrCodeId
      });

      setSaveSuccessMsg(`تم حفظ الزيارة بنجاح! اختر الآن طباعة الوصل أو إرساله لواتساب الزبون.`);
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

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6 print:hidden">
        
        {/* Top Control Bar: Search OR New Customer + Live Date/Time */}
        <section className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b-2 border-slate-100 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 flex items-center gap-2.5">
                <Car className="w-7 h-7 text-amber-600" />
                <span>كاونتر تبديل الزيت والخدمة السريعة</span>
              </h2>
              <p className="text-sm text-slate-600 mt-1 font-bold flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>تاريخ ووقت العملية: {liveClock}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <button
                onClick={() => setNewCustomerModalOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-3 rounded-2xl text-sm font-black transition shadow-md shadow-amber-500/20"
              >
                <UserPlus className="w-5 h-5" />
                <span>+ تسجيل زبون جديد</span>
              </button>

              {customer && (
                <button
                  onClick={() => setAddCarModalOpen(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-2xl text-sm font-black transition shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  <span>+ إضافة سيارة أخرى للزبون</span>
                </button>
              )}

              <button
                onClick={handleResetNewTransaction}
                title="إفراغ الكاونتر وبدء معاملة جديدة"
                className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-3 rounded-2xl text-sm font-black border border-slate-300 transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>تصفير</span>
              </button>
            </div>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute right-4 top-4 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث فوراً برقم هاتف الزبون (0780...) أو رقم اللوحة أو الاسم..."
                className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl pr-12 pl-4 py-3.5 text-slate-950 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white font-mono text-base font-black"
              />
            </div>
            <button
              type="submit"
              disabled={loadingSearch}
              className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition text-base shadow-sm"
            >
              {loadingSearch ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              <span>بحث سريع</span>
            </button>
          </form>

          {/* Customer Profile & Iraqi License Plate Display */}
          {customer ? (
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 flex flex-col justify-center">
                <span className="text-xs text-slate-500 font-bold">اسم الزبون ورقم الهاتف</span>
                <span className="font-black text-slate-950 text-lg mt-0.5">{customer.fullName}</span>
                <span className="text-sm text-slate-700 font-mono font-black mt-0.5">{customer.phoneNumber}</span>
              </div>

              {/* Vehicle Switcher + Iraqi Plate */}
              <div className="bg-amber-50/70 p-4 rounded-2xl border-2 border-amber-300 sm:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="space-y-1 w-full sm:w-auto">
                  <span className="text-xs text-amber-900 block font-black">
                    السيارة المختارة ({customerVehicles.length} مسجلة):
                  </span>
                  {customerVehicles.length > 1 ? (
                    <select
                      value={vehicle?.id || ''}
                      onChange={(e) => {
                        const found = customerVehicles.find(v => v.id === e.target.value);
                        if (found) selectVehicleForPOS(found);
                      }}
                      className="w-full bg-white border-2 border-amber-400 rounded-xl px-3 py-2 text-sm font-black text-slate-950 focus:outline-none"
                    >
                      {customerVehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.makeModel} ({v.plateNumber})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-black text-slate-950 text-lg block">{vehicle?.makeModel || 'غير محدد'}</span>
                  )}
                </div>

                {vehicle?.plateNumber && (
                  <IraqiPlateBadge plateNumber={vehicle.plateNumber} size="md" />
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 flex flex-col justify-between">
                <div>
                  <span className="text-xs text-slate-500 block font-bold">الديون المسجلة على الزبون</span>
                  <span className={`font-black text-lg font-mono block mt-0.5 ${customer.totalDebt > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {customer.totalDebt.toLocaleString()} د.ع
                  </span>
                </div>
                <div className="text-xs font-black text-emerald-700 flex items-center gap-1 mt-2">
                  <Sparkles className="w-4 h-4" /> نقاط الولاء: {customer.loyaltyPoints}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 text-center">
              <p className="text-sm text-slate-700 font-black">
                الكاونتر جاهز لمعاملة جديدة — ابحث عن زبون حالي أو اضغط على <span className="text-amber-600">"+ تسجيل زبون جديد"</span>.
              </p>
            </div>
          )}
        </section>

        {/* Alerts */}
        {errorMessage && (
          <div className="bg-red-50 border-2 border-red-200 text-red-800 p-4 rounded-2xl flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 flex-shrink-0 text-red-600" />
            <p className="font-black text-base">{errorMessage}</p>
          </div>
        )}

        {saveSuccessMsg && (
          <div className="bg-emerald-50 border-2 border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-center gap-3">
            <CheckCircle className="w-6 h-6 flex-shrink-0 text-emerald-600" />
            <p className="font-black text-base">{saveSuccessMsg}</p>
          </div>
        )}

        {/* POS Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (2 spans): Odometer + Engine Oil + Gear Oil + Notes */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Odometer & Distance Section (+3000km default + manual input) */}
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-950 font-black text-lg border-b-2 border-slate-100 pb-3">
                <Gauge className="w-6 h-6 text-amber-600" />
                <h2>العداد والمسافة المقطوعة (Odometer)</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-black text-slate-800 mb-1.5">
                    العداد الحالي (كم)
                  </label>
                  <input
                    type="number"
                    value={currentOdo}
                    onChange={(e) => handleCurrentOdoChange(Number(e.target.value))}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-3 font-mono text-xl font-black text-slate-950 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-amber-800 mb-1.5">
                    المسافة المضافة يدوياً (كم)
                  </label>
                  <input
                    type="number"
                    value={customKmInterval}
                    onChange={(e) => handleManualKmChange(e.target.value)}
                    placeholder="مثال: 3000 أو 4000"
                    className="w-full bg-amber-50 border-2 border-amber-300 rounded-2xl px-4 py-3 font-mono text-xl font-black text-amber-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-emerald-800 mb-1.5">
                    العداد القادم للاستحقاق (كم)
                  </label>
                  <input
                    type="number"
                    value={nextOdo}
                    onChange={(e) => setNextOdo(Number(e.target.value))}
                    className="w-full bg-emerald-50 border-2 border-emerald-300 rounded-2xl px-4 py-3 font-mono text-xl font-black text-emerald-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Quick Distance Shortcut Buttons (3000, 5000, 10000) */}
              <div className="flex flex-wrap gap-2.5 pt-2 items-center">
                <span className="text-sm font-black text-slate-600">اختصارات سريعة:</span>
                {[3000, 5000, 10000].map((km) => (
                  <button
                    key={km}
                    type="button"
                    onClick={() => handleOdoShortcut(km)}
                    className={`px-4 py-2 rounded-xl text-sm font-black border-2 transition ${
                      customKmInterval === String(km)
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    }`}
                  >
                    +{km.toLocaleString()} كم
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Engine Oil & Filter Selection (With Editable Item Prices!) */}
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-2 text-slate-950 font-black text-lg border-b-2 border-slate-100 pb-3">
                <Droplet className="w-6 h-6 text-amber-600" />
                <h2>زيت المحرك والفلتر (مع إمكانية تعديل الأسعار مباشرة)</h2>
              </div>

              {/* Engine Oil Row */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-black text-slate-800 mb-1">
                      نوع / ماركة زيت المحرك
                    </label>
                    <select
                      value={selectedOilId}
                      onChange={(e) => handleSelectOilProduct(e.target.value)}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-3 text-slate-950 font-black text-sm focus:outline-none focus:border-amber-500"
                    >
                      {products.filter(p => p.category === 'engine_oil').map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (المتاح: {p.totalLitersStock} لتر)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-black text-slate-800 mb-1">
                      درجة اللزوجة / السايز
                    </label>
                    {selectedOil?.availableSizes && selectedOil.availableSizes.length > 0 ? (
                      <select
                        value={selectedOilSize}
                        onChange={(e) => setSelectedOilSize(e.target.value)}
                        className="w-full bg-amber-50 border-2 border-amber-400 rounded-xl px-3.5 py-3 text-amber-950 font-mono font-black text-sm focus:outline-none"
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
                        placeholder="10W40 / 5W30"
                        className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-3 text-slate-950 font-mono font-black text-sm"
                      />
                    )}
                  </div>
                </div>

                {/* Liters + Price per Liter + Total Oil Price (Editable) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      الكمية المستهلكة (باللتر)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="25"
                      value={oilLiters}
                      onChange={(e) => handleOilLitersChange(Number(e.target.value))}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2.5 font-mono text-base font-black text-slate-950 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-blue-800 mb-1">
                      سعر اللتر الواحد (قابل للتعديل)
                    </label>
                    <input
                      type="number"
                      step="250"
                      value={oilPricePerLiter}
                      onChange={(e) => handleOilPricePerLiterChange(Number(e.target.value))}
                      className="w-full bg-blue-50 border-2 border-blue-300 rounded-xl px-3.5 py-2.5 font-mono text-base font-black text-blue-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-amber-800 mb-1">
                      إجمالي سعر الزيت (قابل للتعديل)
                    </label>
                    <input
                      type="number"
                      step="500"
                      value={oilTotalCustomPrice}
                      onChange={(e) => setOilTotalCustomPrice(Number(e.target.value))}
                      className="w-full bg-amber-50 border-2 border-amber-400 rounded-xl px-3.5 py-2.5 font-mono text-base font-black text-amber-950 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Filter Selection + Editable Filter Price */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-sm font-black text-slate-800 mb-1">
                    فلتر الزيت (بالقطعة)
                  </label>
                  <select
                    value={selectedFilterId}
                    onChange={(e) => handleSelectFilterProduct(e.target.value)}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2.5 text-slate-950 font-black text-sm"
                  >
                    <option value="">— بدون تبديل فلتر —</option>
                    {products.filter(p => p.category === 'filter').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (متاح: {p.totalLitersStock} قطعة)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-800 mb-1">
                    رقم / كود الفلتر
                  </label>
                  {selectedFilter?.availableSizes && selectedFilter.availableSizes.length > 0 ? (
                    <select
                      value={selectedFilterSize}
                      onChange={(e) => setSelectedFilterSize(e.target.value)}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2.5 text-slate-950 font-mono font-black text-sm"
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
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2.5 text-slate-950 font-mono font-black text-sm"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-black text-amber-800 mb-1">
                    سعر الفلتر (قابل للتعديل)
                  </label>
                  <input
                    type="number"
                    step="500"
                    disabled={!selectedFilterId}
                    value={selectedFilterId ? filterCustomPrice : 0}
                    onChange={(e) => setFilterCustomPrice(Number(e.target.value))}
                    className="w-full bg-amber-50 border-2 border-amber-400 disabled:opacity-50 rounded-xl px-3.5 py-2.5 font-mono text-base font-black text-amber-950"
                  />
                </div>
              </div>
            </div>

            {/* 3. Gear Oil Selection (اختيار دهن الجير / القير) */}
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-slate-950 font-black text-lg">
                  <Settings className="w-6 h-6 text-amber-600" />
                  <h2>دهن الجير (القير) والملاحظات الفنية</h2>
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-amber-50 px-4 py-2 rounded-xl border-2 border-amber-300">
                  <input
                    type="checkbox"
                    checked={includeGearOil}
                    onChange={(e) => setIncludeGearOil(e.target.checked)}
                    className="w-5 h-5 accent-amber-600 rounded"
                  />
                  <span className="text-sm font-black text-amber-950">إضافة / تبديل دهن جير</span>
                </label>
              </div>

              {includeGearOil && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 bg-amber-50/50 p-4 rounded-2xl border-2 border-amber-200">
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1">
                      نوع دهن الجير
                    </label>
                    <select
                      value={selectedGearOilId}
                      onChange={(e) => handleSelectGearOilProduct(e.target.value)}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2.5 text-slate-950 font-black text-xs"
                    >
                      {products.filter(p => p.category === 'gear_oil').map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.totalLitersStock} لتر)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1">
                      عيار / سايز الجير
                    </label>
                    {selectedGear?.availableSizes && selectedGear.availableSizes.length > 0 ? (
                      <select
                        value={selectedGearOilSize}
                        onChange={(e) => setSelectedGearOilSize(e.target.value)}
                        className="w-full bg-white border-2 border-amber-300 rounded-xl px-3 py-2.5 text-amber-950 font-mono font-black text-xs"
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
                        className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2.5 text-slate-950 font-mono text-xs"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1">
                      الكمية (باللتر)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={gearOilLiters}
                      onChange={(e) => setGearOilLiters(Number(e.target.value))}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2.5 font-mono font-black text-sm text-slate-950"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-amber-900 mb-1">
                      سعر دهن الجير (قابل للتعديل)
                    </label>
                    <input
                      type="number"
                      step="500"
                      value={gearCustomPrice}
                      onChange={(e) => setGearCustomPrice(Number(e.target.value))}
                      className="w-full bg-white border-2 border-amber-400 rounded-xl px-3 py-2.5 font-mono font-black text-sm text-amber-950"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black text-slate-800 mb-1">
                    ملاحظات فحص الجير
                  </label>
                  <input
                    type="text"
                    value={gearOilNotes}
                    onChange={(e) => setGearOilNotes(e.target.value)}
                    placeholder="مستوى أو حالة دهن الجير..."
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3 text-slate-950 text-sm font-bold focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-800 mb-1">
                    ملاحظات الفني العامّة (تبخير، تهريب، ماء راديتر)
                  </label>
                  <input
                    type="text"
                    value={techNotes}
                    onChange={(e) => setTechNotes(e.target.value)}
                    placeholder="سجل أي ملاحظات ميكانيكية لتوثيقها..."
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3 text-slate-950 text-sm font-bold focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Checkout & Summary */}
          <div className="space-y-6">
            
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-2 text-emerald-700 font-black text-lg border-b-2 border-slate-100 pb-3">
                <DollarSign className="w-6 h-6" />
                <h2>خلاصة الفاتورة والدفع</h2>
              </div>

              <div className="space-y-3 text-sm font-bold">
                <div className="flex justify-between items-center py-2 border-b border-slate-200">
                  <span className="text-slate-700">
                    زيت المحرك ({selectedOilSize || '—'} × {oilLiters} لتر):
                  </span>
                  <span className="font-mono font-black text-base text-slate-950">
                    {Number(oilTotalCustomPrice).toLocaleString()} د.ع
                  </span>
                </div>

                {selectedFilterId && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-slate-700">فلتر الزيت ({selectedFilterSize}):</span>
                    <span className="font-mono font-black text-base text-slate-950">
                      {Number(filterCustomPrice).toLocaleString()} د.ع
                    </span>
                  </div>
                )}

                {includeGearOil && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-200 text-amber-900">
                    <span>دهن الجير ({selectedGearOilSize} × {gearOilLiters} لتر):</span>
                    <span className="font-mono font-black text-base">
                      {Number(gearCustomPrice).toLocaleString()} د.ع
                    </span>
                  </div>
                )}

                <div className="pt-2">
                  <label className="block text-sm font-black text-slate-800 mb-1.5">
                    المبلغ الإجمالي النهائي (د.ع)
                  </label>
                  <input
                    type="number"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-3 font-mono text-2xl font-black text-slate-950 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-emerald-800 mb-1.5">
                    المبلغ الواصل (المقبوض نقداً)
                  </label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="w-full bg-emerald-50 border-2 border-emerald-400 rounded-2xl px-4 py-3 font-mono text-2xl font-black text-emerald-800 focus:outline-none"
                  />
                </div>

                <div className="p-3.5 bg-slate-100 rounded-2xl border-2 border-slate-200 flex items-center justify-between">
                  <span className="text-sm font-black text-slate-700">الباقي (يُسجل ديناً):</span>
                  <span className={`font-mono font-black text-lg ${debt > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                    {debt.toLocaleString()} د.ع
                  </span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 space-y-3">
                <button
                  type="button"
                  disabled={savingVisit || !customer}
                  onClick={handleSaveVisit}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/25 text-base"
                >
                  {savingVisit ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                  <span>حفظ الزيارة وإصدار الوصل</span>
                </button>

                {vehicle?.qrCodeId && (
                  <button
                    type="button"
                    onClick={() => window.open(`/public/vehicle/${vehicle.qrCodeId}`, '_blank')}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black rounded-2xl flex items-center justify-center gap-2 transition text-sm border-2 border-slate-300"
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

      {/* Thermal & WhatsApp Receipt Modal */}
      <ReceiptModal
        data={receiptModalData}
        onClose={() => setReceiptModalData(null)}
      />

      {/* Modal 1: Register New Customer + First Car */}
      {newCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-amber-600" />
                <span>تسجيل زبون جديد مع مركبته</span>
              </h2>
              <button onClick={() => setNewCustomerModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-4 text-sm">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-black text-amber-800 block">بيانات الزبون:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-800 mb-1 font-black">اسم الزبون</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: حيدر علي الاسدي"
                      value={newCustForm.fullName}
                      onChange={(e) => setNewCustForm({ ...newCustForm, fullName: e.target.value })}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-950 font-black"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 mb-1 font-black">رقم الهاتف</label>
                    <input
                      type="text"
                      required
                      placeholder="0780xxxxxxx"
                      value={newCustForm.phoneNumber}
                      onChange={(e) => setNewCustForm({ ...newCustForm, phoneNumber: e.target.value })}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-950 font-mono font-black"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-black text-amber-800 block">بيانات السيارة واللوحة العراقية:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-800 mb-1 font-black">نوع وموديل السيارة</label>
                    <input
                      type="text"
                      required
                      placeholder="توسان / النترا / كامري"
                      value={newCustForm.makeModel}
                      onChange={(e) => setNewCustForm({ ...newCustForm, makeModel: e.target.value })}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-950 font-black"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 mb-1 font-black">رقم اللوحة (مثال: 14 G 34567)</label>
                    <input
                      type="text"
                      required
                      dir="ltr"
                      placeholder="14 G 34567"
                      value={newCustForm.plateNumber}
                      onChange={(e) => setNewCustForm({ ...newCustForm, plateNumber: e.target.value })}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-950 font-mono font-black text-center"
                    />
                  </div>
                </div>

                {/* Live Plate Preview */}
                <div className="flex justify-center py-1">
                  <IraqiPlateBadge plateNumber={newCustForm.plateNumber} size="md" />
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-slate-800 mb-1 font-black text-xs">سنة الصنع</label>
                    <input
                      type="number"
                      value={newCustForm.modelYear}
                      onChange={(e) => setNewCustForm({ ...newCustForm, modelYear: Number(e.target.value) })}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 font-mono font-black"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 mb-1 font-black text-xs">حجم المحرك</label>
                    <input
                      type="text"
                      value={newCustForm.engineSize}
                      onChange={(e) => setNewCustForm({ ...newCustForm, engineSize: e.target.value })}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 font-mono font-black"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 mb-1 font-black text-xs">العداد الحالي</label>
                    <input
                      type="number"
                      value={newCustForm.lastOdometer}
                      onChange={(e) => setNewCustForm({ ...newCustForm, lastOdometer: Number(e.target.value) })}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 font-mono font-black"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2.5">
                <button
                  type="submit"
                  disabled={creatingCustomer}
                  className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl flex items-center justify-center gap-2 text-base"
                >
                  {creatingCustomer ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  <span>حفظ الزبون والسيارة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewCustomerModalOpen(false)}
                  className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black rounded-xl"
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
          <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
                <Car className="w-5 h-5 text-emerald-600" />
                <span>إضافة سيارة جديدة للزبون: {customer.fullName}</span>
              </h2>
              <button onClick={() => setAddCarModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCarSubmit} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-slate-800 mb-1 font-black">نوع وموديل السيارة الجديدة</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: تاهو / سوناتا / بيك اب"
                  value={newCarForm.makeModel}
                  onChange={(e) => setNewCarForm({ ...newCarForm, makeModel: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-950 font-black"
                />
              </div>

              <div>
                <label className="block text-slate-800 mb-1 font-black">رقم اللوحة (مثال: 14 G 34567)</label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  placeholder="14 G 34567"
                  value={newCarForm.plateNumber}
                  onChange={(e) => setNewCarForm({ ...newCarForm, plateNumber: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-950 font-mono font-black text-center"
                />
              </div>

              <div className="flex justify-center py-1">
                <IraqiPlateBadge plateNumber={newCarForm.plateNumber} size="md" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 mb-1 font-black">حجم المحرك</label>
                  <input
                    type="text"
                    value={newCarForm.engineSize}
                    onChange={(e) => setNewCarForm({ ...newCarForm, engineSize: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 font-mono font-black"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 mb-1 font-black">العداد الحالي (كم)</label>
                  <input
                    type="number"
                    value={newCarForm.lastOdometer}
                    onChange={(e) => setNewCarForm({ ...newCarForm, lastOdometer: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 font-mono font-black"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={creatingCustomer}
                  className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl flex items-center justify-center gap-2"
                >
                  {creatingCustomer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>إضافة السيارة لملف الزبون</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAddCarModalOpen(false)}
                  className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black rounded-xl"
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
