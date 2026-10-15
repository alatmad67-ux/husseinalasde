'use client';

import React, { useState, useEffect } from 'react';
import HeaderNav from '@/components/HeaderNav';
import IraqiPlateBadge from '@/components/IraqiPlateBadge';
import ReceiptModal, { ReceiptData } from '@/components/ReceiptModal';
import QrShareModal from '@/components/QrShareModal';
import { 
  searchCustomerOrVehicle, 
  recordServiceVisit,
  createCustomerWithVehicle,
  addVehicleToCustomer,
  updateVehicle,
  getProductsList,
  getLastVisitForVehicle,
  formatExactDateTime
} from '@/services/firestoreService';
import { CustomerDoc, VehicleDoc, ProductDoc, ServiceVisitDoc, ExtraServiceItem, AdditionalServiceLabor } from '@/types/firestore';
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
  Calendar,
  History,
  Info,
  QrCode,
  BellRing,
  Edit3,
  Trash2,
  Package,
  Wrench
} from 'lucide-react';

export default function WorkshopPOSPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [savingVisit, setSavingVisit] = useState(false);
  const [liveClock, setLiveClock] = useState('');
  
  // Current Customer, All Registered Vehicles, Active Vehicle, & Last Visit
  const [customer, setCustomer] = useState<CustomerDoc | null>(null);
  const [customerVehicles, setCustomerVehicles] = useState<VehicleDoc[]>([]);
  const [vehicle, setVehicle] = useState<VehicleDoc | null>(null);
  const [lastVisit, setLastVisit] = useState<ServiceVisitDoc | null>(null);

  // Products from Firestore
  const [products, setProducts] = useState<ProductDoc[]>([]);

  // Odometer Inputs
  const [currentOdo, setCurrentOdo] = useState<number>(0);
  const [nextOdo, setNextOdo] = useState<number>(3000);
  const [customKmInterval, setCustomKmInterval] = useState<string>('3000');

  // Engine Oil Inputs + Editable Price (Per Liter & Total)
  const [selectedOilId, setSelectedOilId] = useState<string>('');
  const [selectedOilSize, setSelectedOilSize] = useState<string>('');
  const [oilLiters, setOilLiters] = useState<number>(4.0);
  const [oilPricePerLiter, setOilPricePerLiter] = useState<number>(0);
  const [oilTotalCustomPrice, setOilTotalCustomPrice] = useState<number>(0);

  // Filter Input + Editable Price
  const [selectedFilterId, setSelectedFilterId] = useState<string>('');
  const [selectedFilterSize, setSelectedFilterSize] = useState<string>('');
  const [filterCustomPrice, setFilterCustomPrice] = useState<number>(0);

  // Gear Oil Inputs (Strictly by Liter!) + Editable Per-Liter & Total Price
  const [includeGearOil, setIncludeGearOil] = useState<boolean>(false);
  const [selectedGearOilId, setSelectedGearOilId] = useState<string>('');
  const [selectedGearOilSize, setSelectedGearOilSize] = useState<string>('');
  const [gearOilLiters, setGearOilLiters] = useState<number>(4.0);
  const [gearPricePerLiter, setGearPricePerLiter] = useState<number>(0);
  const [gearCustomPrice, setGearCustomPrice] = useState<number>(0);
  const [gearOilNotes, setGearOilNotes] = useState<string>('');

  // Extra materials & parts (ماء راديتر، فلتر تبريد، فلتر هواء، بطارية، محسنات، فلاش...)
  const [extraItems, setExtraItems] = useState<ExtraServiceItem[]>([]);
  const [newExtraItem, setNewExtraItem] = useState<{
    productId: string;
    name: string;
    size: string;
    quantity: number;
    unitPrice: number;
  }>({
    productId: '',
    name: '',
    size: '',
    quantity: 1,
    unitPrice: 0
  });

  // Additional service / labor fees (أجور عمل / فتح وتنظيف بلكات / فتح كيس الكير...)
  const [additionalServices, setAdditionalServices] = useState<AdditionalServiceLabor[]>([]);
  const [newLaborService, setNewLaborService] = useState<{
    description: string;
    fee: number;
  }>({
    description: '',
    fee: 0
  });

  // Quick Edit Active Vehicle Modal State
  const [quickEditVehicleOpen, setQuickEditVehicleOpen] = useState(false);
  const [savingVehicleEdit, setSavingVehicleEdit] = useState(false);
  const [editVehForm, setEditVehForm] = useState({
    makeModel: '',
    modelYear: new Date().getFullYear(),
    engineSize: '',
    recommendedLiters: '',
    preferredOil: '',
    preferredOilName: '',
    preferredFilter: ''
  });

  // Technical Notes & Financials
  const [techNotes, setTechNotes] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Receipt Modal State & QR Share Modal State
  const [receiptModalData, setReceiptModalData] = useState<ReceiptData | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLoyaltyEnabled(localStorage.getItem('asadi_loyalty_enabled') === 'true');
    }
  }, []);

  // Modals: New Customer + Car OR Add Car to Current Customer
  const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
  const [addCarModalOpen, setAddCarModalOpen] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const [newCustForm, setNewCustForm] = useState({
    fullName: '',
    phoneNumber: '',
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

  // Live Clock display
  useEffect(() => {
    const updateClock = () => {
      setLiveClock(new Date().toLocaleString('ar-IQ', { dateStyle: 'full', timeStyle: 'short' }));
    };
    updateClock();
    const timer = setInterval(updateClock, 15000);
    return () => clearInterval(timer);
  }, []);

  // Load real products list from Firestore
  useEffect(() => {
    async function loadProducts() {
      try {
        const list = await getProductsList();
        setProducts(list);
        if (list.length > 0) {
          const firstOil = list.find(p => p.category === 'engine_oil');
          if (firstOil?.id) {
            setSelectedOilId(firstOil.id);
            setSelectedOilSize(firstOil.availableSizes?.[0] || firstOil.viscosity || '');
            const perL = firstOil.serviceSalePrice || firstOil.salePrice || 0;
            setOilPricePerLiter(perL);
            setOilTotalCustomPrice(Math.round(perL * 4));
          }
          const firstGear = list.find(p => p.category === 'gear_oil');
          if (firstGear?.id) {
            setSelectedGearOilId(firstGear.id);
            setSelectedGearOilSize(firstGear.availableSizes?.[0] || firstGear.viscosity || '');
            const gearPerL = firstGear.serviceSalePrice || firstGear.salePrice || 0;
            setGearPricePerLiter(gearPerL);
            setGearCustomPrice(Math.round(gearPerL * 4));
          }
        }

        // Check if navigated from Customers page with ?phone=...
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const phoneParam = params.get('phone');
          if (phoneParam) {
            setSearchQuery(phoneParam);
            const result = await searchCustomerOrVehicle(phoneParam);
            if (result && result.customer) {
              setCustomer(result.customer);
              setCustomerVehicles(result.vehicles || []);
              if (result.vehicle) {
                applyVehicleAndLastVisitToPOS(result.vehicle, result.lastVisit);
              }
            }
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
    const filterVal = (selectedFilterId || selectedFilterSize.trim()) ? Number(filterCustomPrice || 0) : 0;
    const gearVal = includeGearOil ? Number(gearCustomPrice || 0) : 0;
    const extraVal = extraItems.reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0);
    const laborVal = additionalServices.reduce((acc, curr) => acc + (Number(curr.price || curr.fee) || 0), 0);
    const sum = Number(oilTotalCustomPrice || 0) + filterVal + gearVal + extraVal + laborVal;
    setTotalPrice(sum);
    setPaidAmount(sum);
  }, [oilTotalCustomPrice, selectedFilterId, selectedFilterSize, filterCustomPrice, includeGearOil, gearCustomPrice, extraItems, additionalServices]);

  // Handlers for Engine Oil Selection & Liters & Per-Liter Price
  const handleSelectOilProduct = (id: string) => {
    setSelectedOilId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      setSelectedOilSize(prod.availableSizes?.[0] || prod.viscosity || '');
      const perLiter = prod.serviceSalePrice || prod.salePrice || 0;
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

  // Handlers for Filter Selection
  const handleSelectFilterProduct = (id: string) => {
    setSelectedFilterId(id);
    if (!id) {
      setFilterCustomPrice(0);
      return;
    }
    const prod = products.find(p => p.id === id);
    if (prod) {
      setSelectedFilterSize(prod.availableSizes?.[0] || prod.viscosity || prod.name || '');
      setFilterCustomPrice(prod.serviceSalePrice || prod.salePrice || 0);
    }
  };

  // Handlers for Gear Oil Selection (By Liter)
  const handleSelectGearOilProduct = (id: string) => {
    setSelectedGearOilId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      setSelectedGearOilSize(prod.availableSizes?.[0] || prod.viscosity || '');
      const perLiter = prod.serviceSalePrice || prod.salePrice || 0;
      setGearPricePerLiter(perLiter);
      setGearCustomPrice(Math.round(perLiter * gearOilLiters));
    }
  };

  const handleGearLitersChange = (liters: number) => {
    setGearOilLiters(liters);
    setGearCustomPrice(Math.round(gearPricePerLiter * liters));
  };

  const handleGearPricePerLiterChange = (perLiter: number) => {
    setGearPricePerLiter(perLiter);
    setGearCustomPrice(Math.round(perLiter * gearOilLiters));
  };

  // Apply Vehicle + Last Visit Details to POS
  const applyVehicleAndLastVisitToPOS = (v: VehicleDoc, visit: ServiceVisitDoc | null) => {
    setVehicle(v);
    setLastVisit(visit);

    const lastOdo = visit?.currentOdometer ?? v.lastOdometer ?? 0;
    const addKm = Number(customKmInterval) || 3000;
    setCurrentOdo(lastOdo);
    setNextOdo(lastOdo + addKm);

    // Pre-fill recommended liters from last visit or vehicle profile
    const recLiters = visit?.oilLitersUsed || v.recommendedLiters || 4.0;
    setOilLiters(recLiters);

    // Pre-fill oil product & viscosity if available
    const prefOilName = visit?.oilName || v.preferredOilName || '';
    const prefViscosity = visit?.viscosity || v.preferredOil || '';

    let matchedOilProd = products.find(
      p => p.category === 'engine_oil' && (p.id === visit?.oilProductId || (prefOilName && p.name === prefOilName))
    );
    if (!matchedOilProd) {
      matchedOilProd = products.find(p => p.category === 'engine_oil' && p.id === selectedOilId);
    }

    if (matchedOilProd?.id) {
      setSelectedOilId(matchedOilProd.id);
      const perL = matchedOilProd.serviceSalePrice || matchedOilProd.salePrice || oilPricePerLiter;
      setOilPricePerLiter(perL);
      setOilTotalCustomPrice(Math.round(perL * recLiters));
    } else {
      setOilTotalCustomPrice(Math.round(oilPricePerLiter * recLiters));
    }

    if (prefViscosity) {
      setSelectedOilSize(prefViscosity);
    }

    const prefFilter = visit?.filterCode || v.preferredFilter || '';
    if (prefFilter) {
      setSelectedFilterSize(prefFilter);
    }
  };

  // Switch between multiple cars of the same customer
  const handleSwitchVehicle = async (vehicleId: string) => {
    const found = customerVehicles.find(v => v.id === vehicleId);
    if (!found) return;
    const visit = found.id ? await getLastVisitForVehicle(found.id) : null;
    applyVehicleAndLastVisitToPOS(found, visit);
  };

  // Reset to New Fresh Transaction
  const handleResetNewTransaction = () => {
    setCustomer(null);
    setCustomerVehicles([]);
    setVehicle(null);
    setLastVisit(null);
    setSearchQuery('');
    setCurrentOdo(0);
    setNextOdo(3000);
    setCustomKmInterval('3000');
    setOilLiters(4.0);
    setIncludeGearOil(false);
    setGearOilNotes('');
    setExtraItems([]);
    setNewExtraItem({ productId: '', name: '', size: '', quantity: 1, unitPrice: 0 });
    setAdditionalServices([]);
    setNewLaborService({ description: '', fee: 0 });
    setTechNotes('');
    setErrorMessage(null);
    setSaveSuccessMsg(null);
  };

  // Quick Edit Active Vehicle Handlers
  const openQuickEditModal = () => {
    if (!vehicle) return;
    setEditVehForm({
      makeModel: vehicle.makeModel || '',
      modelYear: vehicle.modelYear || new Date().getFullYear(),
      engineSize: vehicle.engineSize || '',
      recommendedLiters: vehicle.recommendedLiters ? String(vehicle.recommendedLiters) : '',
      preferredOil: vehicle.preferredOil || '',
      preferredOilName: vehicle.preferredOilName || '',
      preferredFilter: vehicle.preferredFilter || ''
    });
    setQuickEditVehicleOpen(true);
  };

  const handleSaveQuickEditVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle?.id) return;
    setSavingVehicleEdit(true);
    try {
      const updates: Partial<VehicleDoc> = {
        makeModel: editVehForm.makeModel,
        modelYear: Number(editVehForm.modelYear),
        engineSize: editVehForm.engineSize,
        recommendedLiters: editVehForm.recommendedLiters ? Number(editVehForm.recommendedLiters) : undefined,
        preferredOil: editVehForm.preferredOil,
        preferredOilName: editVehForm.preferredOilName,
        preferredFilter: editVehForm.preferredFilter
      };
      await updateVehicle(vehicle.id, updates);
      const updatedVeh: VehicleDoc = { ...vehicle, ...updates };
      setVehicle(updatedVeh);
      setCustomerVehicles((prev) => prev.map((v) => (v.id === vehicle.id ? updatedVeh : v)));
      setQuickEditVehicleOpen(false);
      setSaveSuccessMsg(`تم تحديث موديل وبيانات السيارة (${updatedVeh.makeModel}) بنجاح!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'فشل تحديث بيانات السيارة');
    } finally {
      setSavingVehicleEdit(false);
    }
  };

  // Extra Materials Handlers
  const handleSelectExtraProduct = (prodId: string) => {
    if (!prodId) {
      setNewExtraItem({ productId: '', name: '', size: '', quantity: 1, unitPrice: 0 });
      return;
    }
    const p = products.find((prod) => prod.id === prodId);
    if (p) {
      const price = p.serviceSalePrice || p.salePrice || 0;
      const size = p.availableSizes?.[0] || p.viscosity || '';
      setNewExtraItem({
        productId: p.id,
        name: p.name,
        size,
        quantity: 1,
        unitPrice: price
      });
    }
  };

  const handleQuickAddExtraShortcut = (name: string, defaultPrice: number = 0) => {
    const match = products.find(
      (p) =>
        p.name.includes(name) ||
        (name.includes('ماء راديتر') && p.category === 'coolant') ||
        (name.includes('تبريد') && p.category === 'filter') ||
        (name.includes('هواء') && p.category === 'filter') ||
        (name.includes('بطارية') && p.category === 'battery') ||
        (name.includes('فلاش') && p.category === 'additive') ||
        (name.includes('محسن') && p.category === 'additive')
    );
    setNewExtraItem({
      productId: match?.id || '',
      name: match?.name || name,
      size: match?.availableSizes?.[0] || '',
      quantity: 1,
      unitPrice: match ? (match.serviceSalePrice || match.salePrice || 0) : defaultPrice
    });
  };

  const handleAddExtraItemToList = () => {
    if (!newExtraItem.name.trim()) return;
    const qty = Math.max(0.5, Number(newExtraItem.quantity) || 1);
    const price = Number(newExtraItem.unitPrice) || 0;
    const item: ExtraServiceItem = {
      id: `extra_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: newExtraItem.productId || undefined,
      name: newExtraItem.name.trim(),
      size: newExtraItem.size.trim() || undefined,
      quantity: qty,
      unitPrice: price,
      totalPrice: Math.round(qty * price)
    };
    setExtraItems((prev) => [...prev, item]);
    setNewExtraItem({ productId: '', name: '', size: '', quantity: 1, unitPrice: 0 });
  };

  const handleRemoveExtraItem = (id: string) => {
    setExtraItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Additional Services / Labor Handlers
  const handleQuickAddLaborShortcut = (desc: string, defaultFee: number = 0) => {
    setNewLaborService({
      description: desc,
      fee: defaultFee
    });
  };

  const handleAddLaborToList = () => {
    if (!newLaborService.description.trim()) return;
    const fee = Number(newLaborService.fee) || 0;
    const item: AdditionalServiceLabor = {
      id: `labor_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      description: newLaborService.description.trim(),
      price: fee,
      fee: fee
    };
    setAdditionalServices((prev) => [...prev, item]);
    setNewLaborService({ description: '', fee: 0 });
  };

  const handleRemoveLabor = (id: string) => {
    setAdditionalServices((prev) => prev.filter((s) => s.id !== id));
  };

  // Fast Parallel Search by Phone, Plate, or Name
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
          applyVehicleAndLastVisitToPOS(result.vehicle, result.lastVisit);
        } else {
          setVehicle(null);
          setLastVisit(null);
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

  // Create New Customer + Car (with optional oil/filter specs)
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
        recommendedLiters: newCustForm.recommendedLiters ? Number(newCustForm.recommendedLiters) : undefined,
        preferredOilName: newCustForm.preferredOilName,
        preferredOil: newCustForm.preferredOil,
        preferredFilter: newCustForm.preferredFilter
      });

      setCustomer(res.customer);
      setCustomerVehicles(res.vehicles);
      applyVehicleAndLastVisitToPOS(res.vehicle, null);
      setNewCustomerModalOpen(false);
      setSaveSuccessMsg(`تم تسجيل الزبون (${res.customer.fullName}) والسيارة ومواصفاتها بنجاح!`);
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء تسجيل الزبون.');
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Add Additional Car to Current Customer (with optional oil/filter specs)
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
        recommendedLiters: newCarForm.recommendedLiters ? Number(newCarForm.recommendedLiters) : undefined,
        preferredOilName: newCarForm.preferredOilName,
        preferredOil: newCarForm.preferredOil,
        preferredFilter: newCarForm.preferredFilter
      });

      const updatedList = [...customerVehicles, res.vehicle];
      setCustomerVehicles(updatedList);
      applyVehicleAndLastVisitToPOS(res.vehicle, null);
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

    const resolvedOilName = selectedOil?.name || vehicle.preferredOilName || 'زيت محرك';
    const resolvedFilterCode = selectedFilterId
      ? (selectedFilterSize || selectedFilter?.viscosity || selectedFilter?.name || '')
      : (selectedFilterSize.trim() || '');

    try {
      const res = await recordServiceVisit({
        customerId: customer.id,
        vehicleId: vehicle.id,
        currentOdometer: Number(currentOdo),
        nextOdometer: Number(nextOdo),
        oilProductId: selectedOilId || undefined,
        oilName: resolvedOilName,
        viscosity: selectedOilSize || selectedOil?.viscosity || '',
        oilLitersUsed: Number(oilLiters),
        oilUnitPrice: Number(oilPricePerLiter),
        oilTotalPrice: Number(oilTotalCustomPrice),
        filterCode: resolvedFilterCode,
        filterPrice: resolvedFilterCode ? Number(filterCustomPrice) : 0,
        gearOilProductId: includeGearOil ? (selectedGearOilId || undefined) : undefined,
        gearOilName: includeGearOil ? (selectedGear?.name || 'زيت كير') : '',
        gearOilViscosity: includeGearOil ? selectedGearOilSize : '',
        gearOilLitersUsed: includeGearOil ? Number(gearOilLiters) : 0,
        gearOilUnitPrice: includeGearOil ? Number(gearPricePerLiter) : 0,
        gearOilTotalPrice: includeGearOil ? Number(gearCustomPrice) : 0,
        gearOilDetails: gearOilNotes,
        extraItems: extraItems.length > 0 ? extraItems : undefined,
        additionalServices: additionalServices.length > 0 ? additionalServices : undefined,
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

      const updatedVeh: VehicleDoc = {
        ...vehicle,
        lastOdometer: Number(currentOdo),
        nextOdometer: Number(nextOdo),
        preferredOilName: resolvedOilName,
        preferredOil: selectedOilSize || vehicle.preferredOil,
        recommendedLiters: Number(oilLiters),
        preferredFilter: resolvedFilterCode || vehicle.preferredFilter
      };
      setVehicle(updatedVeh);

      // Update lastVisit state so the Worker Reference Card reflects the newly saved visit immediately
      setLastVisit({
        id: res.visitId,
        customerId: customer.id,
        vehicleId: vehicle.id,
        visitDate: new Date().toISOString(),
        currentOdometer: Number(currentOdo),
        nextOdometer: Number(nextOdo),
        oilName: resolvedOilName,
        viscosity: selectedOilSize,
        oilLitersUsed: Number(oilLiters),
        filterCode: resolvedFilterCode,
        gearOilName: includeGearOil ? (selectedGear?.name || 'زيت كير') : '',
        gearOilViscosity: includeGearOil ? selectedGearOilSize : '',
        gearOilLitersUsed: includeGearOil ? Number(gearOilLiters) : 0,
        extraItems: extraItems.length > 0 ? extraItems : undefined,
        additionalServices: additionalServices.length > 0 ? additionalServices : undefined,
        totalPrice: Number(totalPrice),
        paidAmount: Number(paidAmount),
        debtAmount: calculatedDebt
      });

      // Build receipt items
      const receiptItems: { label: string; qty: string; price: number }[] = [
        {
          label: `${resolvedOilName} (${selectedOilSize || 'قياسي'})`,
          qty: `${oilLiters} لتر`,
          price: Number(oilTotalCustomPrice)
        }
      ];

      if (resolvedFilterCode && Number(filterCustomPrice) > 0) {
        receiptItems.push({
          label: `فلتر زيت: ${resolvedFilterCode}`,
          qty: `1 قطعة`,
          price: Number(filterCustomPrice)
        });
      }

      if (includeGearOil) {
        receiptItems.push({
          label: `زيت كير: ${selectedGear?.name || ''} (${selectedGearOilSize})`,
          qty: `${gearOilLiters} لتر`,
          price: Number(gearCustomPrice)
        });
      }

      // Add extra materials to receipt
      extraItems.forEach((item) => {
        receiptItems.push({
          label: `${item.name}${item.size ? ` (${item.size})` : ''}`,
          qty: `${item.quantity}`,
          price: Number(item.totalPrice)
        });
      });

      // Add additional labor services to receipt
      additionalServices.forEach((srv) => {
        receiptItems.push({
          label: `أجور عمل: ${srv.description}`,
          qty: `خدمة`,
          price: Number(srv.price || srv.fee || 0)
        });
      });

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

          {/* Customer Profile & Iraqi License Plate + Last Service Reference Card */}
          {customer ? (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                        onChange={(e) => handleSwitchVehicle(e.target.value)}
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
                    {vehicle && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-xs font-bold text-slate-700 block">
                          حجم المحرك: {vehicle.engineSize || '—'} | الموديل / سنة الصنع: <strong>{vehicle.modelYear || '—'}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={openQuickEditModal}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-amber-100 text-amber-900 border-2 border-amber-300 rounded-xl text-xs font-black transition shadow-xs"
                          title="تعديل نوع السيارة وموديلها وسنة صنعها ومواصفاتها"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                          <span>تعديل الموديل والمواصفات</span>
                        </button>
                      </div>
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
                  {loyaltyEnabled ? (
                    <div className="text-xs font-black text-emerald-700 flex items-center gap-1 mt-2">
                      <Sparkles className="w-4 h-4" /> نقاط الولاء: {customer.loyaltyPoints}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setQrModalOpen(true)}
                      className="mt-2 py-1.5 px-2.5 bg-amber-100 hover:bg-amber-200 text-amber-950 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>رابط / QR البطاقة للزبون</span>
                    </button>
                  )}
                </div>
              </div>

              {/* WORKER REFERENCE BANNER: Last Service Details & Vehicle Oil/Filter Specs */}
              {vehicle && (
                <div className="bg-gradient-to-l from-emerald-50 via-amber-50/60 to-white border-2 border-emerald-400 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-2.5">
                    <div className="flex items-center gap-2 text-emerald-950 font-black text-base">
                      <History className="w-5 h-5 text-emerald-600" />
                      <span>بيانات آخر عملية تبديل ومواصفات زيت السيارة (مرجع العامل والفني):</span>
                    </div>
                    <span className="bg-white border border-emerald-300 text-emerald-900 px-3 py-1 rounded-xl font-mono font-black text-xs" dir="ltr">
                      آخر تبديل: {lastVisit ? formatExactDateTime(lastVisit.visitDate) : (vehicle.lastServiceDate ? formatExactDateTime(vehicle.lastServiceDate) : 'لا توجد زيارة سابقة (أول مرة)')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-sm">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-500 block">نوع الزيت السابق / المعتمد:</span>
                      <strong className="font-black text-slate-950 text-base block mt-0.5">
                        {lastVisit?.oilName || vehicle.preferredOilName || 'غير محدد'}
                      </strong>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-amber-300">
                      <span className="text-xs font-bold text-amber-800 block">السايز / درجة اللزوجة:</span>
                      <strong className="font-mono font-black text-amber-900 text-base block mt-0.5">
                        {lastVisit?.viscosity || vehicle.preferredOil || 'غير محدد'}
                      </strong>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-emerald-300">
                      <span className="text-xs font-bold text-emerald-800 block">كم لتر تأخذ السيارة؟</span>
                      <strong className="font-mono font-black text-emerald-700 text-base block mt-0.5">
                        {lastVisit?.oilLitersUsed || vehicle.recommendedLiters ? `${lastVisit?.oilLitersUsed || vehicle.recommendedLiters} لتر` : 'غير محدد'}
                      </strong>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-500 block">نوع / كود الفلتر:</span>
                      <strong className="font-mono font-black text-slate-950 text-base block mt-0.5">
                        {lastVisit?.filterCode || vehicle.preferredFilter || 'غير محدد'}
                      </strong>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                      <span className="text-xs font-bold text-slate-500 block">العداد في آخر زيارة:</span>
                      <strong className="font-mono font-black text-slate-950 text-base block mt-0.5">
                        {(lastVisit?.currentOdometer ?? vehicle.lastOdometer ?? 0).toLocaleString()} كم
                      </strong>
                    </div>
                  </div>

                  {lastVisit?.gearOilName && (
                    <div className="bg-amber-100/70 border border-amber-300 px-3.5 py-2 rounded-xl text-xs font-black text-amber-950 flex items-center gap-2">
                      <Info className="w-4 h-4 text-amber-700 flex-shrink-0" />
                      <span>
                        تم تبديل زيت الكير في آخر زيارة: <strong>{lastVisit.gearOilName} ({lastVisit.gearOilViscosity})</strong> — الكمية: <strong>{lastVisit.gearOilLitersUsed} لتر</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 text-center">
              <p className="text-sm text-slate-700 font-black">
                الكاونتر جاهز لمعاملة جديدة — ابحث عن زبون حالي لعرض آخر عملية تبديل ومواصفات سيارته أو اضغط على <span className="text-amber-600">"+ تسجيل زبون جديد"</span>.
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
                <h2>زيت المحرك (باللتر) والفلتر (مع إمكانية تعديل الأسعار مباشرة)</h2>
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
                      <option value="">— اختر زيت المحرك من المخزون —</option>
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
                        placeholder="مثال: 10W40 / 5W30"
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
                      max="30"
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
                    <option value="">— بدون فلتر / إدخال يدوي —</option>
                    {products.filter(p => p.category === 'filter').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (متاح: {p.totalLitersStock} قطعة)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-800 mb-1">
                    نوع / رقم الفلتر
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
                      placeholder="اكتب نوع أو رقم الفلتر..."
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
                    value={filterCustomPrice}
                    onChange={(e) => setFilterCustomPrice(Number(e.target.value))}
                    className="w-full bg-amber-50 border-2 border-amber-400 rounded-xl px-3.5 py-2.5 font-mono text-base font-black text-amber-950"
                  />
                </div>
              </div>
            </div>

            {/* 3. Gear Oil Selection (اختيار دهن الجير / القير باللتر) */}
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-slate-950 font-black text-lg">
                  <Settings className="w-6 h-6 text-amber-600" />
                  <h2>دهن الجير / القير (يقاس ويباع باللتر) والملاحظات</h2>
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-amber-50 px-4 py-2 rounded-xl border-2 border-amber-300">
                  <input
                    type="checkbox"
                    checked={includeGearOil}
                    onChange={(e) => setIncludeGearOil(e.target.checked)}
                    className="w-5 h-5 accent-amber-600 rounded"
                  />
                  <span className="text-sm font-black text-amber-950">تبديل / إضافة دهن جير (باللتر)</span>
                </label>
              </div>

              {includeGearOil && (
                <div className="bg-amber-50/50 p-4 rounded-2xl border-2 border-amber-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-black text-slate-800 mb-1">
                        نوع دهن الجير (من المخزون)
                      </label>
                      <select
                        value={selectedGearOilId}
                        onChange={(e) => handleSelectGearOilProduct(e.target.value)}
                        className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2.5 text-slate-950 font-black text-sm"
                      >
                        <option value="">— اختر دهن الجير —</option>
                        {products.filter(p => p.category === 'gear_oil').map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (المتاح: {p.totalLitersStock} لتر)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-800 mb-1">
                        عيار / سايز دهن الجير
                      </label>
                      {selectedGear?.availableSizes && selectedGear.availableSizes.length > 0 ? (
                        <select
                          value={selectedGearOilSize}
                          onChange={(e) => setSelectedGearOilSize(e.target.value)}
                          className="w-full bg-white border-2 border-amber-300 rounded-xl px-3 py-2.5 text-amber-950 font-mono font-black text-sm"
                        >
                          {selectedGear.availableSizes.map((sz) => (
                            <option key={sz} value={sz}>{sz}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="مثال: ATF / CVT / 75W90"
                          value={selectedGearOilSize}
                          onChange={(e) => setSelectedGearOilSize(e.target.value)}
                          className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2.5 text-slate-950 font-mono font-black text-sm"
                        />
                      )}
                    </div>
                  </div>

                  {/* Gear Oil Liters + Per-Liter Price + Total Gear Oil Price */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                    <div>
                      <label className="block text-xs font-black text-slate-800 mb-1">
                        الكمية المستهلكة (باللتر)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={gearOilLiters}
                        onChange={(e) => handleGearLitersChange(Number(e.target.value))}
                        className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2.5 font-mono font-black text-base text-slate-950"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-blue-800 mb-1">
                        سعر اللتر الواحد لدهن الجير
                      </label>
                      <input
                        type="number"
                        step="250"
                        value={gearPricePerLiter}
                        onChange={(e) => handleGearPricePerLiterChange(Number(e.target.value))}
                        className="w-full bg-blue-50 border-2 border-blue-300 rounded-xl px-3 py-2.5 font-mono font-black text-base text-blue-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-amber-900 mb-1">
                        إجمالي سعر دهن الجير (قابل للتعديل)
                      </label>
                      <input
                        type="number"
                        step="500"
                        value={gearCustomPrice}
                        onChange={(e) => setGearCustomPrice(Number(e.target.value))}
                        className="w-full bg-white border-2 border-amber-400 rounded-xl px-3 py-2.5 font-mono font-black text-base text-amber-950"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black text-slate-800 mb-1">
                    ملاحظات فحص الجير (اختياري)
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

            {/* 4. Extra Materials & Parts (مواد وقطع إضافية: ماء راديتر، فلتر تبريد، فلتر هواء، بطارية، محسنات...) */}
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-slate-950 font-black text-lg">
                  <Package className="w-6 h-6 text-amber-600" />
                  <h2>مواد وقطع إضافية (ماء راديتر، فلتر مكيف/تبريد، فلتر هواء، بطارية، محسنات...)</h2>
                </div>
                <span className="text-xs font-black bg-amber-100 text-amber-950 px-2.5 py-1 rounded-xl">
                  {extraItems.length} مواد مضافة
                </span>
              </div>

              {/* Quick Shortcut Buttons */}
              <div className="space-y-1.5">
                <span className="text-xs font-black text-slate-600 block">اختصارات سريعة لإضافة المواد:</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '+ ماء راديتر', defaultPrice: 5000 },
                    { label: '+ فلتر تبريد (مكيف)', defaultPrice: 10000 },
                    { label: '+ فلتر هواء', defaultPrice: 7000 },
                    { label: '+ بطارية', defaultPrice: 65000 },
                    { label: '+ فلاش غسيل ماكينة', defaultPrice: 5000 },
                    { label: '+ محسن زيت / مانع تبخير', defaultPrice: 5000 }
                  ].map((sc) => (
                    <button
                      key={sc.label}
                      type="button"
                      onClick={() => handleQuickAddExtraShortcut(sc.label.replace('+ ', ''), sc.defaultPrice)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-amber-100 hover:text-amber-950 text-slate-800 rounded-xl text-xs font-black border border-slate-300 transition"
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Extra Item Inputs */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1">
                      اختر من المخزون (أو اكتب بالأسفل يدوياً)
                    </label>
                    <select
                      value={newExtraItem.productId}
                      onChange={(e) => handleSelectExtraProduct(e.target.value)}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 font-black text-sm"
                    >
                      <option value="">— اختر مادة من المخزون —</option>
                      {products
                        .filter((p) => p.category !== 'engine_oil' && p.category !== 'gear_oil')
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.viscosity ? `(${p.viscosity})` : ''} - رصيد: {p.totalLitersStock}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1">
                      اسم المادة أو القطعة *
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: ماء راديتر أمريكي أحمر"
                      value={newExtraItem.name}
                      onChange={(e) => setNewExtraItem({ ...newExtraItem, name: e.target.value })}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 text-sm font-black focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-end">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">الحجم / السايز</label>
                    <input
                      type="text"
                      placeholder="مثال: 4 لتر / 70Ah"
                      value={newExtraItem.size}
                      onChange={(e) => setNewExtraItem({ ...newExtraItem, size: e.target.value })}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 text-sm font-mono font-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">الكمية</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={newExtraItem.quantity}
                      onChange={(e) => setNewExtraItem({ ...newExtraItem, quantity: Number(e.target.value) })}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 text-sm font-mono font-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-blue-800 mb-1">سعر المفرد (د.ع)</label>
                    <input
                      type="number"
                      step="250"
                      value={newExtraItem.unitPrice}
                      onChange={(e) => setNewExtraItem({ ...newExtraItem, unitPrice: Number(e.target.value) })}
                      className="w-full bg-blue-50 border-2 border-blue-300 rounded-xl px-3 py-2 text-blue-950 text-sm font-mono font-black"
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleAddExtraItemToList}
                      disabled={!newExtraItem.name.trim()}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-xl text-sm flex items-center justify-center gap-1.5 transition shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة للفاتورة</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Added Extra Items Table/Cards */}
              {extraItems.length > 0 ? (
                <div className="space-y-2">
                  {extraItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-amber-50/50 border border-amber-200 rounded-2xl"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <div>
                          <strong className="text-slate-950 font-black text-sm block">
                            {item.name} {item.size ? `(${item.size})` : ''}
                          </strong>
                          <span className="text-xs text-slate-600 font-bold">
                            الكمية: {item.quantity} × {item.unitPrice.toLocaleString()} د.ع
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-amber-950 text-base">
                          {item.totalPrice.toLocaleString()} د.ع
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExtraItem(item.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl transition"
                          title="حذف المادة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-bold text-slate-500 text-center py-1">
                  لم تتم إضافة أي مواد إضافية لهذه العملية (اختياري).
                </p>
              )}
            </div>

            {/* 5. Additional Labor / Service Fees (أجور عمل إضافية: فتح وتنظيف بلكات، فتح كيس الكير، فحص...) */}
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-slate-950 font-black text-lg">
                  <Wrench className="w-6 h-6 text-amber-600" />
                  <h2>أجور وأعمال يدوية إضافية (أجور عمل / فتح وتنظيف بلكات / فتح كيس الكير...)</h2>
                </div>
                <span className="text-xs font-black bg-emerald-100 text-emerald-950 px-2.5 py-1 rounded-xl">
                  {additionalServices.length} أجور مضافة
                </span>
              </div>

              {/* Quick Labor Shortcuts */}
              <div className="space-y-1.5">
                <span className="text-xs font-black text-slate-600 block">اختصارات سريعة للأجور:</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { desc: 'فتح وتنظيف البلكات', fee: 10000 },
                    { desc: 'فتح وتنظيف كيس الكير', fee: 15000 },
                    { desc: 'تبديل وتنسيم ماء الراديتر', fee: 5000 },
                    { desc: 'فحص كمبيوتر وتشخيص أعطال', fee: 10000 },
                    { desc: 'صيانة وفحص أسفل السيارة', fee: 5000 }
                  ].map((srv) => (
                    <button
                      key={srv.desc}
                      type="button"
                      onClick={() => handleQuickAddLaborShortcut(srv.desc, srv.fee)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-950 text-slate-800 rounded-xl text-xs font-black border border-slate-300 transition"
                    >
                      + {srv.desc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Labor Inputs */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-slate-800 mb-1">
                    وصف العمل / الخدمة المنجزة *
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: فتح وتنظيف البلكات / فتح كيس الكير"
                    value={newLaborService.description}
                    onChange={(e) => setNewLaborService({ ...newLaborService, description: e.target.value })}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 text-sm font-black focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-black text-emerald-800 mb-1">
                      أجور العمل (د.ع)
                    </label>
                    <input
                      type="number"
                      step="1000"
                      value={newLaborService.fee}
                      onChange={(e) => setNewLaborService({ ...newLaborService, fee: Number(e.target.value) })}
                      className="w-full bg-emerald-50 border-2 border-emerald-300 rounded-xl px-3 py-2 text-emerald-950 text-sm font-mono font-black"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddLaborToList}
                    disabled={!newLaborService.description.trim()}
                    className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-xl text-sm flex items-center justify-center gap-1 transition shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة</span>
                  </button>
                </div>
              </div>

              {/* Added Labor Services List */}
              {additionalServices.length > 0 ? (
                <div className="space-y-2">
                  {additionalServices.map((srv) => (
                    <div
                      key={srv.id}
                      className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-200 rounded-2xl"
                    >
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-emerald-700" />
                        <strong className="text-slate-950 font-black text-sm block">
                          {srv.description}
                        </strong>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-emerald-900 text-base">
                          {(Number(srv.price || srv.fee) || 0).toLocaleString()} د.ع
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLabor(srv.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl transition"
                          title="حذف الخدمة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-bold text-slate-500 text-center py-1">
                  لم يتم تسجيل أجور عمل إضافية لهذه العملية (اختياري).
                </p>
              )}
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

                {(selectedFilterId || selectedFilterSize.trim()) && Number(filterCustomPrice) > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-slate-700">فلتر الزيت ({selectedFilterSize || 'قياسي'}):</span>
                    <span className="font-mono font-black text-base text-slate-950">
                      {Number(filterCustomPrice).toLocaleString()} د.ع
                    </span>
                  </div>
                )}

                {includeGearOil && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-200 text-amber-900">
                    <span>دهن الجير ({selectedGearOilSize || '—'} × {gearOilLiters} لتر):</span>
                    <span className="font-mono font-black text-base">
                      {Number(gearCustomPrice).toLocaleString()} د.ع
                    </span>
                  </div>
                )}

                {/* Extra Items in Summary */}
                {extraItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-slate-200 text-slate-800">
                    <span className="truncate max-w-[180px]">
                      {item.name} {item.size ? `(${item.size})` : ''} × {item.quantity}:
                    </span>
                    <span className="font-mono font-black text-base text-slate-950">
                      {item.totalPrice.toLocaleString()} د.ع
                    </span>
                  </div>
                ))}

                {/* Additional Services in Summary */}
                {additionalServices.map((srv) => (
                  <div key={srv.id} className="flex justify-between items-center py-2 border-b border-slate-200 text-emerald-900">
                    <span className="truncate max-w-[180px]">أجور: {srv.description}</span>
                    <span className="font-mono font-black text-base text-emerald-700">
                      {(Number(srv.price || srv.fee) || 0).toLocaleString()} د.ع
                    </span>
                  </div>
                ))}

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
                    onClick={() => setQrModalOpen(true)}
                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition text-sm shadow-sm"
                  >
                    <QrCode className="w-4 h-4 text-amber-400" />
                    <span>مشاركة رابط / QR البطاقة لواتساب الزبون</span>
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

      {/* Digital Customer Card Link & QR Code Share Modal */}
      <QrShareModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        vehicle={vehicle}
        customer={customer}
        lastVisit={lastVisit}
      />

      {/* Modal 1: Register New Customer + First Car (with optional Oil Liters, Oil Type/Size, Filter) */}
      {newCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
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
              {/* Customer Basic Info */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-black text-amber-800 block">1. بيانات الزبون الأساسية:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-800 mb-1 font-black">اسم الزبون *</label>
                    <input
                      type="text"
                      required
                      placeholder="اكتب اسم الزبون..."
                      value={newCustForm.fullName}
                      onChange={(e) => setNewCustForm({ ...newCustForm, fullName: e.target.value })}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-950 font-black"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 mb-1 font-black">رقم الهاتف *</label>
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

              {/* Vehicle Basic Info */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-black text-amber-800 block">2. بيانات السيارة واللوحة العراقية:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-800 mb-1 font-black">نوع وموديل السيارة *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: توسان / النترا / كامري"
                      value={newCustForm.makeModel}
                      onChange={(e) => setNewCustForm({ ...newCustForm, makeModel: e.target.value })}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-950 font-black"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 mb-1 font-black">رقم اللوحة *</label>
                    <input
                      type="text"
                      required
                      dir="ltr"
                      placeholder="مثال: 14 A 12345"
                      value={newCustForm.plateNumber}
                      onChange={(e) => setNewCustForm({ ...newCustForm, plateNumber: e.target.value })}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-950 font-mono font-black text-center"
                    />
                  </div>
                </div>

                {/* Live Plate Preview */}
                {newCustForm.plateNumber && (
                  <div className="flex justify-center py-1">
                    <IraqiPlateBadge plateNumber={newCustForm.plateNumber} size="md" />
                  </div>
                )}

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
                      placeholder="مثال: 2.0L"
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

              {/* Optional Oil & Filter Specs for Worker Reference */}
              <div className="bg-emerald-50/70 p-4 rounded-2xl border-2 border-emerald-300 space-y-3">
                <div>
                  <span className="font-black text-emerald-950 block">
                    3. مواصفات الزيت والفلتر للسيارة (اختياري - غير إجباري):
                  </span>
                  <p className="text-xs font-bold text-emerald-800">
                    تُحفظ مع ملف السيارة لتظهر للعامل تلقائياً في كل مرة يزور فيها الزبون الورشة.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-800 mb-1 font-black text-xs">
                      كم لتر زيت تأخذ السيارة؟ (اختياري)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="مثال: 4 أو 4.5"
                      value={newCustForm.recommendedLiters}
                      onChange={(e) => setNewCustForm({ ...newCustForm, recommendedLiters: e.target.value })}
                      className="w-full bg-white border-2 border-emerald-300 rounded-xl px-3 py-2 text-slate-950 font-mono font-black"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-800 mb-1 font-black text-xs">
                      سايز / عيار الزيت (اختياري)
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: 10W40 أو 5W30 أو 0W20"
                      value={newCustForm.preferredOil}
                      onChange={(e) => setNewCustForm({ ...newCustForm, preferredOil: e.target.value })}
                      className="w-full bg-white border-2 border-emerald-300 rounded-xl px-3 py-2 text-slate-950 font-mono font-black"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-800 mb-1 font-black text-xs">
                      نوع / ماركة الزيت (اختياري)
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: يورال / كاسترول / موبيل"
                      value={newCustForm.preferredOilName}
                      onChange={(e) => setNewCustForm({ ...newCustForm, preferredOilName: e.target.value })}
                      className="w-full bg-white border-2 border-emerald-300 rounded-xl px-3 py-2 text-slate-950 font-black"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-800 mb-1 font-black text-xs">
                      نوع أو كود الفلتر (اختياري)
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: كوري أصلي / 90915"
                      value={newCustForm.preferredFilter}
                      onChange={(e) => setNewCustForm({ ...newCustForm, preferredFilter: e.target.value })}
                      className="w-full bg-white border-2 border-emerald-300 rounded-xl px-3 py-2 text-slate-950 font-black"
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

      {/* Modal 2: Add Additional Vehicle to Existing Customer (with optional Oil/Filter specs) */}
      {addCarModalOpen && customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 mb-1 font-black">نوع وموديل السيارة *</label>
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
                  <label className="block text-slate-800 mb-1 font-black">رقم اللوحة *</label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    placeholder="مثال: 14 G 34567"
                    value={newCarForm.plateNumber}
                    onChange={(e) => setNewCarForm({ ...newCarForm, plateNumber: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-950 font-mono font-black text-center"
                  />
                </div>
              </div>

              {newCarForm.plateNumber && (
                <div className="flex justify-center py-1">
                  <IraqiPlateBadge plateNumber={newCarForm.plateNumber} size="md" />
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-800 mb-1 font-black text-xs">سنة الصنع / الموديل *</label>
                  <input
                    type="number"
                    required
                    value={newCarForm.modelYear}
                    onChange={(e) => setNewCarForm({ ...newCarForm, modelYear: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 font-mono font-black"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 mb-1 font-black text-xs">حجم المحرك</label>
                  <input
                    type="text"
                    placeholder="مثال: 2.5L"
                    value={newCarForm.engineSize}
                    onChange={(e) => setNewCarForm({ ...newCarForm, engineSize: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 font-mono font-black"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 mb-1 font-black text-xs">العداد الحالي (كم)</label>
                  <input
                    type="number"
                    value={newCarForm.lastOdometer}
                    onChange={(e) => setNewCarForm({ ...newCarForm, lastOdometer: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 font-mono font-black"
                  />
                </div>
              </div>

              {/* Optional Oil/Filter Specs */}
              <div className="bg-emerald-50/70 p-3.5 rounded-2xl border-2 border-emerald-300 space-y-2.5">
                <span className="font-black text-emerald-950 block text-xs">
                  مواصفات الزيت والفلتر لهذه السيارة (اختياري - غير إجباري):
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-700 mb-1 font-black text-xs">كم لتر تأخذ؟</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="مثال: 4.5"
                      value={newCarForm.recommendedLiters}
                      onChange={(e) => setNewCarForm({ ...newCarForm, recommendedLiters: e.target.value })}
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-slate-950 font-mono font-black"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-black text-xs">سايز الزيت</label>
                    <input
                      type="text"
                      placeholder="مثال: 5W30"
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

      {/* Modal 3: Quick Edit Active Vehicle Model & Specs */}
      {quickEditVehicleOpen && vehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-600" />
                <span>تعديل موديل وبيانات السيارة: {vehicle.makeModel}</span>
              </h2>
              <button onClick={() => setQuickEditVehicleOpen(false)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickEditVehicle} className="space-y-4 text-sm">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-800 mb-1 font-black">نوع وموديل السيارة *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: سوناتا / توسان"
                      value={editVehForm.makeModel}
                      onChange={(e) => setEditVehForm({ ...editVehForm, makeModel: e.target.value })}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-950 font-black"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-800 mb-1 font-black">سنة الصنع / الموديل *</label>
                    <input
                      type="number"
                      required
                      value={editVehForm.modelYear}
                      onChange={(e) => setEditVehForm({ ...editVehForm, modelYear: Number(e.target.value) })}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-950 font-mono font-black"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-800 mb-1 font-black">حجم المحرك</label>
                  <input
                    type="text"
                    placeholder="مثال: 2.0L أو 2.4L"
                    value={editVehForm.engineSize}
                    onChange={(e) => setEditVehForm({ ...editVehForm, engineSize: e.target.value })}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-950 font-mono font-black"
                  />
                </div>
              </div>

              {/* Oil & Filter Preferences */}
              <div className="bg-amber-50/60 p-4 rounded-2xl border-2 border-amber-300 space-y-3">
                <span className="font-black text-amber-950 block text-xs">
                  مواصفات الزيت والفلتر المعتمدة للسيارة:
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-700 mb-1 font-black text-xs">كم لتر تأخذ؟</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="مثال: 4.5"
                      value={editVehForm.recommendedLiters}
                      onChange={(e) => setEditVehForm({ ...editVehForm, recommendedLiters: e.target.value })}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-950 font-mono font-black"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-black text-xs">سايز الزيت</label>
                    <input
                      type="text"
                      placeholder="مثال: 5W30"
                      value={editVehForm.preferredOil}
                      onChange={(e) => setEditVehForm({ ...editVehForm, preferredOil: e.target.value })}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-950 font-mono font-black"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-black text-xs">نوع الزيت</label>
                    <input
                      type="text"
                      placeholder="مثال: يورال"
                      value={editVehForm.preferredOilName}
                      onChange={(e) => setEditVehForm({ ...editVehForm, preferredOilName: e.target.value })}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-950 font-black"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-black text-xs">نوع الفلتر</label>
                    <input
                      type="text"
                      placeholder="مثال: أصلي"
                      value={editVehForm.preferredFilter}
                      onChange={(e) => setEditVehForm({ ...editVehForm, preferredFilter: e.target.value })}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-950 font-black"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={savingVehicleEdit}
                  className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl flex items-center justify-center gap-2"
                >
                  {savingVehicleEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>حفظ التعديلات على السيارة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickEditVehicleOpen(false)}
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
