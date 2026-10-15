'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import HeaderNav from '@/components/HeaderNav';
import IraqiPlateBadge from '@/components/IraqiPlateBadge';
import ReceiptModal, { ReceiptData } from '@/components/ReceiptModal';
import QrShareModal from '@/components/QrShareModal';
import {
  searchCustomerOrVehicle,
  getCustomerDossier,
  recordDebtPayment,
  addVehicleToCustomer,
  getAllDebtorsSummary,
  formatExactDateTime,
  updateCustomer,
  deleteCustomer,
  updateVehicle,
  deleteVehicle,
  updateServiceVisit,
  deleteServiceVisit,
  bulkImportCustomersFromExcel,
  ExcelImportRow
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
  Receipt,
  FileSpreadsheet,
  Upload,
  Download,
  QrCode,
  Edit,
  Trash2,
  Gift,
  Power
} from 'lucide-react';

export default function CustomerDossierPage() {
  const [searchPhone, setSearchPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(15000);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Loyalty Rewards System Toggle (Default: OFF / Inactive until enabled by Admin)
  const [loyaltyEnabled, setLoyaltyEnabled] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('asadi_loyalty_enabled');
      setLoyaltyEnabled(saved === 'true');
    }
  }, []);

  const toggleLoyaltySystem = () => {
    const nextVal = !loyaltyEnabled;
    setLoyaltyEnabled(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('asadi_loyalty_enabled', nextVal ? 'true' : 'false');
    }
  };

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

  // QR & Digital Link Share Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrModalVehicle, setQrModalVehicle] = useState<VehicleDoc | null>(null);
  const [qrModalCustomer, setQrModalCustomer] = useState<CustomerDoc | null>(null);
  const [qrModalVisit, setQrModalVisit] = useState<ServiceVisitDoc | null>(null);

  // Excel Import Modal State
  const [excelImportModal, setExcelImportModal] = useState(false);
  const [parsedExcelRows, setParsedExcelRows] = useState<ExcelImportRow[]>([]);
  const [importingExcel, setImportingExcel] = useState(false);

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

  // Edit Customer Modal
  const [editCustomerModal, setEditCustomerModal] = useState(false);
  const [editCustForm, setEditCustForm] = useState({
    fullName: '',
    phoneNumber: '',
    totalDebt: 0
  });

  // Edit Vehicle Modal
  const [editingVehicle, setEditingVehicle] = useState<VehicleDoc | null>(null);
  const [editVehForm, setEditVehForm] = useState({
    makeModel: '',
    plateNumber: '',
    engineSize: '',
    modelYear: 2024,
    lastOdometer: 0,
    nextOdometer: 3000,
    recommendedLiters: '',
    preferredOilName: '',
    preferredOil: '',
    preferredFilter: ''
  });

  // Edit Service Visit Modal
  const [editingVisit, setEditingVisit] = useState<ServiceVisitDoc | null>(null);
  const [editVisitForm, setEditVisitForm] = useState({
    currentOdometer: 0,
    nextOdometer: 0,
    oilName: '',
    viscosity: '',
    oilLitersUsed: 4,
    filterCode: '',
    technicalNotes: '',
    totalPrice: 0,
    paidAmount: 0,
    debtAmount: 0
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

  // ============================================================================
  // EXCEL EXPORT & IMPORT HANDLERS
  // ============================================================================
  const handleExportCustomersExcel = () => {
    const exportRows = allCustomers.map((c, index) => {
      const cars = vehiclesByCustomer[c.id || ''] || [];
      const primaryCar = cars[0];
      return {
        'ت': index + 1,
        'اسم الزبون': c.fullName,
        'رقم الهاتف': c.phoneNumber,
        'مبلغ الدين (د.ع)': Number(c.totalDebt || 0),
        'نوع السيارة': primaryCar?.makeModel || '',
        'رقم اللوحة': primaryCar?.plateNumber || '',
        'موديل السنة': primaryCar?.modelYear || '',
        'العداد الحالي (كم)': primaryCar?.lastOdometer || 0,
        'العداد القادم (كم)': primaryCar?.nextOdometer || 0,
        'نوع الزيت': primaryCar?.preferredOilName || '',
        'سايز الزيت': primaryCar?.preferredOil || '',
        'كمية الزيت (لتر)': primaryCar?.recommendedLiters || '',
        'نوع الفلتر': primaryCar?.preferredFilter || '',
        'عدد الزيارات': visitsCountByCustomer[c.id || ''] || 0
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الزبائن والديون');
    XLSX.writeFile(wb, `سجل_زبائن_وديون_مركز_حسين_الاسدي_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleDownloadExcelTemplate = () => {
    const sampleRows = [
      {
        'اسم الزبون': 'أحمد محمد العلي',
        'رقم الهاتف': '07701234567',
        'مبلغ الدين': 0,
        'نوع السيارة': 'تويوتا كامري',
        'رقم اللوحة': '11 A 12345',
        'موديل السنة': 2022,
        'العداد الحالي': 45000,
        'نوع الزيت': 'يورال',
        'سايز الزيت': '5W30',
        'كمية الزيت': 4.5,
        'نوع الفلتر': 'أصلي'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'قالب_استيراد_الزبائن');
    XLSX.writeFile(wb, 'قالب_استيراد_زبائن_مركز_حسين_الاسدي.xlsx');
  };

  const handleExcelFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const mapped: ExcelImportRow[] = rawJson
          .map((r) => {
            // Flexible column matching for Arabic & English headers
            const getVal = (keys: string[]) => {
              for (const k of Object.keys(r)) {
                const cleanK = k.trim().toLowerCase();
                if (keys.some((target) => cleanK.includes(target.toLowerCase()))) {
                  return r[k];
                }
              }
              return '';
            };

            const fullName = String(
              getVal(['اسم', 'الزبون', 'العميل', 'name', 'customer']) || Object.values(r)[0] || ''
            ).trim();
            const phoneNumber = String(
              getVal(['هاتف', 'تلفون', 'موبايل', 'رقم الهاتف', 'phone', 'mobile']) || Object.values(r)[1] || ''
            ).trim();
            const debtVal = Number(
              String(getVal(['دين', 'ديون', 'متبقي', 'مبلغ الدين', 'debt', 'balance']) || 0).replace(/[^\d.]/g, '')
            );
            const makeModel = String(getVal(['سيارة', 'السيارة', 'نوع السيارة', 'مركبة', 'car', 'vehicle', 'model']) || '').trim();
            const plateNumber = String(getVal(['لوحة', 'رقم اللوحة', 'رقم السيارة', 'plate']) || '').trim();
            const lastOdometer = Number(
              String(getVal(['عداد', 'العداد الحالي', 'كيلومتر', 'odometer']) || 0).replace(/[^\d.]/g, '')
            );
            const preferredOilName = String(getVal(['نوع الزيت', 'اسم الزيت', 'الزيت', 'oil']) || '').trim();
            const preferredOil = String(getVal(['سايز', 'لزوجة', 'عيار', 'viscosity', 'size']) || '').trim();
            const recommendedLiters = Number(
              String(getVal(['لتر', 'كمية الزيت', 'اللترات', 'liters']) || 0).replace(/[^\d.]/g, '')
            );
            const preferredFilter = String(getVal(['فلتر', 'نوع الفلتر', 'filter']) || '').trim();

            return {
              fullName,
              phoneNumber,
              totalDebt: isNaN(debtVal) ? 0 : debtVal,
              makeModel,
              plateNumber,
              lastOdometer: isNaN(lastOdometer) ? 0 : lastOdometer,
              preferredOilName,
              preferredOil,
              recommendedLiters: isNaN(recommendedLiters) || recommendedLiters <= 0 ? undefined : recommendedLiters,
              preferredFilter
            };
          })
          .filter((item) => item.fullName || item.phoneNumber);

        setParsedExcelRows(mapped);
      } catch (err) {
        alert('تعذر قراءة ملف الإكسل. يرجى التأكد من أن الملف بصيغة Excel أو CSV صحيحة.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmExcelImport = async () => {
    if (parsedExcelRows.length === 0) return;
    setImportingExcel(true);
    try {
      const res = await bulkImportCustomersFromExcel(parsedExcelRows);
      alert(
        `تم الاستيراد بنجاح!\n- زبائن جدد: ${res.importedCustomers}\n- سيارات مضافة: ${res.importedVehicles}`
      );
      setExcelImportModal(false);
      setParsedExcelRows([]);
      await loadCustomersDirectory();
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء رفع البيانات إلى قاعدة البيانات.');
    } finally {
      setImportingExcel(false);
    }
  };

  // ============================================================================
  // ADD / EDIT / DELETE HANDLERS
  // ============================================================================
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

  const openEditCustomer = () => {
    if (!customer) return;
    setEditCustForm({
      fullName: customer.fullName,
      phoneNumber: customer.phoneNumber,
      totalDebt: Number(customer.totalDebt || 0)
    });
    setEditCustomerModal(true);
  };

  const handleSaveEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id) return;
    try {
      await updateCustomer(customer.id, {
        fullName: editCustForm.fullName.trim(),
        phoneNumber: editCustForm.phoneNumber.trim(),
        totalDebt: Number(editCustForm.totalDebt || 0)
      });
      setCustomer({
        ...customer,
        fullName: editCustForm.fullName.trim(),
        phoneNumber: editCustForm.phoneNumber.trim(),
        totalDebt: Number(editCustForm.totalDebt || 0)
      });
      setEditCustomerModal(false);
      await loadCustomersDirectory();
    } catch (err: any) {
      alert(err.message || 'خطأ أثناء تعديل بيانات الزبون');
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customer?.id) return;
    if (!window.confirm(`هل أنت متأكد من حذف الزبون (${customer.fullName}) وسياراته نهائياً؟`)) return;
    try {
      await deleteCustomer(customer.id);
      setCustomer(null);
      await loadCustomersDirectory();
    } catch (err: any) {
      alert(err.message || 'خطأ أثناء حذف الزبون');
    }
  };

  const openEditVehicleModal = (v: VehicleDoc) => {
    setEditingVehicle(v);
    setEditVehForm({
      makeModel: v.makeModel || '',
      plateNumber: v.plateNumber || '',
      engineSize: v.engineSize || '',
      modelYear: Number(v.modelYear || 2024),
      lastOdometer: Number(v.lastOdometer || 0),
      nextOdometer: Number(v.nextOdometer || 3000),
      recommendedLiters: v.recommendedLiters ? String(v.recommendedLiters) : '',
      preferredOilName: v.preferredOilName || '',
      preferredOil: v.preferredOil || '',
      preferredFilter: v.preferredFilter || ''
    });
  };

  const handleSaveEditVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle?.id) return;
    try {
      const updates: Partial<VehicleDoc> = {
        makeModel: editVehForm.makeModel.trim(),
        plateNumber: editVehForm.plateNumber.trim(),
        engineSize: editVehForm.engineSize.trim(),
        modelYear: Number(editVehForm.modelYear),
        lastOdometer: Number(editVehForm.lastOdometer),
        nextOdometer: Number(editVehForm.nextOdometer),
        recommendedLiters: editVehForm.recommendedLiters ? Number(editVehForm.recommendedLiters) : undefined,
        preferredOilName: editVehForm.preferredOilName.trim(),
        preferredOil: editVehForm.preferredOil.trim(),
        preferredFilter: editVehForm.preferredFilter.trim()
      };
      await updateVehicle(editingVehicle.id, updates);
      setVehicles(prev => prev.map(v => (v.id === editingVehicle.id ? { ...v, ...updates } : v)));
      setEditingVehicle(null);
      await loadCustomersDirectory();
    } catch (err: any) {
      alert(err.message || 'خطأ أثناء تحديث بيانات السيارة');
    }
  };

  const handleDeleteVehicle = async (vehicleId: string, makeModel: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف السيارة (${makeModel})؟`)) return;
    try {
      await deleteVehicle(vehicleId);
      setVehicles(prev => prev.filter(v => v.id !== vehicleId));
      await loadCustomersDirectory();
    } catch (err: any) {
      alert(err.message || 'خطأ أثناء حذف السيارة');
    }
  };

  const openEditVisitModal = (visit: ServiceVisitDoc) => {
    setEditingVisit(visit);
    setEditVisitForm({
      currentOdometer: Number(visit.currentOdometer || 0),
      nextOdometer: Number(visit.nextOdometer || 0),
      oilName: visit.oilName || '',
      viscosity: visit.viscosity || '',
      oilLitersUsed: Number(visit.oilLitersUsed || 4),
      filterCode: visit.filterCode || '',
      technicalNotes: visit.technicalNotes || '',
      totalPrice: Number(visit.totalPrice || 0),
      paidAmount: Number(visit.paidAmount || 0),
      debtAmount: Number(visit.debtAmount || 0)
    });
  };

  const handleSaveEditVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVisit?.id) return;
    try {
      const computedDebt = Math.max(0, Number(editVisitForm.totalPrice) - Number(editVisitForm.paidAmount));
      const updates: Partial<ServiceVisitDoc> = {
        currentOdometer: Number(editVisitForm.currentOdometer),
        nextOdometer: Number(editVisitForm.nextOdometer),
        oilName: editVisitForm.oilName,
        viscosity: editVisitForm.viscosity,
        oilLitersUsed: Number(editVisitForm.oilLitersUsed),
        filterCode: editVisitForm.filterCode,
        technicalNotes: editVisitForm.technicalNotes,
        totalPrice: Number(editVisitForm.totalPrice),
        paidAmount: Number(editVisitForm.paidAmount),
        debtAmount: computedDebt
      };
      await updateServiceVisit(editingVisit.id, updates);
      if (customer?.id) {
        await selectCustomerById(customer.id);
      }
      setEditingVisit(null);
      await loadCustomersDirectory();
    } catch (err: any) {
      alert(err.message || 'خطأ أثناء تعديل العملية');
    }
  };

  const handleDeleteVisit = async (visitId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه العملية من سجل الزبون؟')) return;
    try {
      await deleteServiceVisit(visitId);
      if (customer?.id) {
        await selectCustomerById(customer.id);
      }
      await loadCustomersDirectory();
    } catch (err: any) {
      alert(err.message || 'خطأ أثناء حذف العملية');
    }
  };

  const openQrShareForVehicle = (v: VehicleDoc, c: CustomerDoc) => {
    const latestForCar = history.find(h => h.vehicleId === v.id) || history[0] || null;
    setQrModalVehicle(v);
    setQrModalCustomer(c);
    setQrModalVisit(latestForCar);
    setQrModalOpen(true);
  };

  const generateWhatsAppOilReminder = (v?: VehicleDoc) => {
    if (!customer) return;
    const car = v || vehicles[0];
    const cleanPhone = customer.phoneNumber.replace(/\D/g, '').replace(/^0/, '964');
    const cardLink =
      typeof window !== 'undefined' && car?.qrCodeId
        ? `${window.location.origin}/public/vehicle/${encodeURIComponent(car.qrCodeId)}`
        : '';
    const msg =
      `السلام عليكم ورحمة الله أخي ${customer.fullName} المحترم،%0A` +
      `تحية طيبة من *مركز حسين الأسدي لخدمات الزيوت*.%0A` +
      `نود تذكيركم بأن موعد تبديل زيت محرك سيارتكم (${car?.makeModel || ''} - لوحة: ${car?.plateNumber || ''}) أصبح قريباً عند العداد (${car?.nextOdometer?.toLocaleString() || 0} كم).%0A` +
      (cardLink ? `🔗 بطاقة سيارتك الإلكترونية: ${encodeURIComponent(cardLink)}%0A` : '') +
      `📍 موقع الورشة: https://maps.app.goo.gl/Hfe2TZ3x96CTq8pH8%0A` +
      `أهلاً وسهلاً بكم في أي وقت!`;
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

        {/* Top Action Bar: Excel Import/Export + Loyalty System Status (Inactive by default) */}
        <section className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setExcelImportModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-sm transition"
            >
              <Upload className="w-4 h-4" />
              <span>رفع واستيراد بيانات من إكسل (Excel)</span>
            </button>

            <button
              type="button"
              onClick={handleExportCustomersExcel}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-sm transition"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>تصدير الزبائن والديون إلى إكسل</span>
            </button>
          </div>

          {/* Loyalty System Control (Inactive by default as requested) */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
            <Gift className={`w-5 h-5 ${loyaltyEnabled ? 'text-amber-600' : 'text-slate-400'}`} />
            <div className="text-xs">
              <span className="font-black text-slate-800 block">
                نظام مكافآت الزبائن: {loyaltyEnabled ? 'مفعّل حالياً' : 'متوقف حالياً (للتشغيل لاحقاً)'}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleLoyaltySystem}
              className={`px-3 py-1.5 rounded-lg font-black text-xs flex items-center gap-1 transition ${
                loyaltyEnabled
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{loyaltyEnabled ? 'إيقاف مؤقت' : 'تفعيل النظام'}</span>
            </button>
          </div>
        </section>

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
                          {custCars[0] && (
                            <button
                              type="button"
                              onClick={() => openQrShareForVehicle(custCars[0], c)}
                              className="py-2 px-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl font-black text-xs flex items-center gap-1 transition"
                              title="مشاركة رابط / QR البطاقة الإلكترونية للزبون"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>الرابط / QR</span>
                            </button>
                          )}
                          {hasDebt && (
                            <button
                              type="button"
                              onClick={() => sendMonthlyWhatsAppDebtReminder(c)}
                              className="py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs flex items-center gap-1 shadow-sm transition"
                              title="إرسال تذكير واتساب بالدين"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>واتساب</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => c.id && selectCustomerById(c.id)}
                            className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs transition"
                          >
                            عرض العمليات 👈
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
                    {loyaltyEnabled && (
                      <span className="bg-purple-50 text-purple-900 text-xs px-3 py-0.5 rounded-full border border-purple-300 font-black">
                        نقاط المكافآت: {customer.loyaltyPoints || 0} نقطة
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-slate-600 font-mono font-black text-base">{customer.phoneNumber}</p>
                    <button
                      type="button"
                      onClick={openEditCustomer}
                      className="text-xs font-black text-blue-700 hover:underline flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" /> تعديل بيانات الزبون
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteCustomer}
                      className="text-xs font-black text-red-600 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> حذف الزبون
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
                {vehicles[0] && (
                  <button
                    type="button"
                    onClick={() => openQrShareForVehicle(vehicles[0], customer)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded-xl font-black text-sm shadow-sm transition"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>مشاركة رابط / QR للزبون</span>
                  </button>
                )}

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

            {/* Registered Vehicles Grid (Multi-car view with Iraqi License Plate UI, QR Share, Edit/Delete) */}
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

                    {/* Vehicle Action Buttons: Share QR/Link + Edit + Delete */}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openQrShareForVehicle(v, customer)}
                        className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>رابط / QR البطاقة لواتساب الزبون</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditVehicleModal(v)}
                        className="p-2 bg-white hover:bg-blue-50 text-blue-700 border border-slate-300 rounded-xl"
                        title="تعديل السيارة"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => v.id && handleDeleteVehicle(v.id, v.makeModel)}
                        className="p-2 bg-white hover:bg-red-50 text-red-600 border border-slate-300 rounded-xl"
                        title="حذف السيارة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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

                              <div className="flex items-center gap-2 font-sans">
                                <button
                                  type="button"
                                  onClick={() => openVisitReceipt(item)}
                                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs flex items-center gap-1.5 transition"
                                >
                                  <Printer className="w-4 h-4 text-amber-400" />
                                  <span>الوصل + الرابط للواتساب</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openEditVisitModal(item)}
                                  className="p-2 bg-white hover:bg-blue-50 text-blue-700 border border-slate-300 rounded-xl"
                                  title="تعديل العملية"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => item.id && handleDeleteVisit(item.id)}
                                  className="p-2 bg-white hover:bg-red-50 text-red-600 border border-slate-300 rounded-xl"
                                  title="حذف العملية"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
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

      {/* QR & Link Share Modal */}
      <QrShareModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        vehicle={qrModalVehicle}
        customer={qrModalCustomer}
        lastVisit={qrModalVisit}
      />

      {/* EXCEL IMPORT MODAL */}
      {excelImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                <h2 className="text-lg font-black text-slate-950">
                  رفع واستيراد بيانات الزبائن والسيارات والديون من ملف إكسل (Excel)
                </h2>
              </div>
              <button onClick={() => setExcelImportModal(false)} className="text-slate-400 hover:text-slate-800">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 text-xs sm:text-sm space-y-2 text-emerald-950 font-bold">
              <p>
                يمكنك رفع ملف الإكسل الحالي الخاص بك مباشرةً (يتعرف النظام تلقائياً على الأعمدة مثل: <strong>اسم الزبون، رقم الهاتف، مبلغ الدين، نوع السيارة، رقم اللوحة، العداد الحالي، نوع الزيت، سايز الزيت، كمية الزيت</strong>).
              </p>
              <button
                type="button"
                onClick={handleDownloadExcelTemplate}
                className="inline-flex items-center gap-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-400 px-3.5 py-2 rounded-xl font-black text-xs transition"
              >
                <Download className="w-4 h-4" />
                <span>تحميل قالب إكسل جاهز (اختياري)</span>
              </button>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-3 bg-slate-50">
              <Upload className="w-10 h-10 text-amber-600 mx-auto" />
              <label className="block cursor-pointer">
                <span className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-3 rounded-xl font-black text-sm inline-block shadow-sm">
                  اختر ملف الإكسل (.xlsx / .xls / .csv) من جهازك
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleExcelFileSelected}
                  className="hidden"
                />
              </label>
            </div>

            {parsedExcelRows.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-black text-sm text-slate-900">
                    تم قراءة ({parsedExcelRows.length}) سجل جاهز للاستيراد:
                  </span>
                </div>
                <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 font-black text-slate-800">
                      <tr>
                        <th className="p-2">الاسم</th>
                        <th className="p-2">الهاتف</th>
                        <th className="p-2">السيارة</th>
                        <th className="p-2">اللوحة</th>
                        <th className="p-2">الدين</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold">
                      {parsedExcelRows.slice(0, 30).map((r, i) => (
                        <tr key={i}>
                          <td className="p-2">{r.fullName}</td>
                          <td className="p-2 font-mono">{r.phoneNumber}</td>
                          <td className="p-2">{r.makeModel || '—'}</td>
                          <td className="p-2 font-mono">{r.plateNumber || '—'}</td>
                          <td className="p-2 font-mono text-red-600">{(r.totalDebt || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  disabled={importingExcel}
                  onClick={handleConfirmExcelImport}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-2xl text-base flex items-center justify-center gap-2 shadow-lg transition"
                >
                  {importingExcel ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  <span>تأكيد وحفظ ({parsedExcelRows.length}) زبون في النظام الآن</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {editCustomerModal && customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-950">تعديل بيانات الزبون</h2>
              <button onClick={() => setEditCustomerModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSaveEditCustomer} className="space-y-3.5 text-sm">
              <div>
                <label className="block font-black text-slate-800 mb-1">اسم الزبون *</label>
                <input
                  type="text"
                  required
                  value={editCustForm.fullName}
                  onChange={(e) => setEditCustForm({ ...editCustForm, fullName: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2.5 font-black text-slate-950"
                />
              </div>
              <div>
                <label className="block font-black text-slate-800 mb-1">رقم الهاتف *</label>
                <input
                  type="text"
                  required
                  value={editCustForm.phoneNumber}
                  onChange={(e) => setEditCustForm({ ...editCustForm, phoneNumber: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2.5 font-mono font-black text-slate-950"
                />
              </div>
              <div>
                <label className="block font-black text-slate-800 mb-1">إجمالي الدين المسجل (د.ع)</label>
                <input
                  type="number"
                  value={editCustForm.totalDebt}
                  onChange={(e) => setEditCustForm({ ...editCustForm, totalDebt: Number(e.target.value) })}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2.5 font-mono font-black text-red-600"
                />
              </div>
              <button type="submit" className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-base">
                حفظ التعديلات
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT VEHICLE MODAL */}
      {editingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-950">تعديل بيانات السيارة</h2>
              <button onClick={() => setEditingVehicle(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSaveEditVehicle} className="space-y-3.5 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black text-slate-800 mb-1">نوع وماركة السيارة *</label>
                  <input
                    type="text"
                    required
                    value={editVehForm.makeModel}
                    onChange={(e) => setEditVehForm({ ...editVehForm, makeModel: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 font-black"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-1">موديل السيارة / سنة الصنع *</label>
                  <input
                    type="number"
                    required
                    placeholder="مثال: 2023"
                    value={editVehForm.modelYear}
                    onChange={(e) => setEditVehForm({ ...editVehForm, modelYear: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 font-mono font-black"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-1">حجم المحرك</label>
                  <input
                    type="text"
                    placeholder="مثال: 2.0L أو V6"
                    value={editVehForm.engineSize}
                    onChange={(e) => setEditVehForm({ ...editVehForm, engineSize: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 font-mono font-black"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-1">رقم اللوحة *</label>
                  <input
                    type="text"
                    required
                    value={editVehForm.plateNumber}
                    onChange={(e) => setEditVehForm({ ...editVehForm, plateNumber: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 font-mono font-black"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-1">العداد الحالي (كم)</label>
                  <input
                    type="number"
                    value={editVehForm.lastOdometer}
                    onChange={(e) => setEditVehForm({ ...editVehForm, lastOdometer: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 font-mono font-black"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-1">العداد القادم (كم)</label>
                  <input
                    type="number"
                    value={editVehForm.nextOdometer}
                    onChange={(e) => setEditVehForm({ ...editVehForm, nextOdometer: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 font-mono font-black text-amber-700"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-1">كمية الزيت (لتر)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editVehForm.recommendedLiters}
                    onChange={(e) => setEditVehForm({ ...editVehForm, recommendedLiters: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 font-mono font-black"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-1">سايز الزيت</label>
                  <input
                    type="text"
                    value={editVehForm.preferredOil}
                    onChange={(e) => setEditVehForm({ ...editVehForm, preferredOil: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 font-mono font-black"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-1">نوع الزيت</label>
                  <input
                    type="text"
                    value={editVehForm.preferredOilName}
                    onChange={(e) => setEditVehForm({ ...editVehForm, preferredOilName: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 font-black"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-1">نوع الفلتر</label>
                  <input
                    type="text"
                    value={editVehForm.preferredFilter}
                    onChange={(e) => setEditVehForm({ ...editVehForm, preferredFilter: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 font-black"
                  />
                </div>
              </div>
              <button type="submit" className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-base">
                حفظ تعديلات السيارة
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SERVICE VISIT MODAL */}
      {editingVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-950">تعديل بيانات عملية التبديل</h2>
              <button onClick={() => setEditingVisit(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSaveEditVisit} className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-black text-slate-800 mb-1">العداد الحالي (كم)</label>
                  <input
                    type="number"
                    value={editVisitForm.currentOdometer}
                    onChange={(e) => setEditVisitForm({ ...editVisitForm, currentOdometer: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 font-mono font-black"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-1">العداد القادم (كم)</label>
                  <input
                    type="number"
                    value={editVisitForm.nextOdometer}
                    onChange={(e) => setEditVisitForm({ ...editVisitForm, nextOdometer: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 font-mono font-black"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-1">اسم الزيت</label>
                  <input
                    type="text"
                    value={editVisitForm.oilName}
                    onChange={(e) => setEditVisitForm({ ...editVisitForm, oilName: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 font-black"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-1">السايز / اللزوجة</label>
                  <input
                    type="text"
                    value={editVisitForm.viscosity}
                    onChange={(e) => setEditVisitForm({ ...editVisitForm, viscosity: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 font-mono font-black"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-1">الكمية (لتر)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editVisitForm.oilLitersUsed}
                    onChange={(e) => setEditVisitForm({ ...editVisitForm, oilLitersUsed: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 font-mono font-black"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-1">الفلتر</label>
                  <input
                    type="text"
                    value={editVisitForm.filterCode}
                    onChange={(e) => setEditVisitForm({ ...editVisitForm, filterCode: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 font-black"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-1">المبلغ الإجمالي (د.ع)</label>
                  <input
                    type="number"
                    value={editVisitForm.totalPrice}
                    onChange={(e) => setEditVisitForm({ ...editVisitForm, totalPrice: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 font-mono font-black"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-1">المبلغ الواصل (د.ع)</label>
                  <input
                    type="number"
                    value={editVisitForm.paidAmount}
                    onChange={(e) => setEditVisitForm({ ...editVisitForm, paidAmount: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 font-mono font-black text-emerald-700"
                  />
                </div>
              </div>
              <div>
                <label className="block font-black text-slate-800 mb-1">ملاحظات الفحص</label>
                <input
                  type="text"
                  value={editVisitForm.technicalNotes}
                  onChange={(e) => setEditVisitForm({ ...editVisitForm, technicalNotes: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 font-bold"
                />
              </div>
              <button type="submit" className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-base">
                حفظ تعديلات العملية
              </button>
            </form>
          </div>
        </div>
      )}

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
