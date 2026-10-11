'use client';

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import HeaderNav from '@/components/HeaderNav';
import IraqiPlateBadge from '@/components/IraqiPlateBadge';
import ReceiptModal, { ReceiptData } from '@/components/ReceiptModal';
import {
  getWorkshopReportsData,
  addExpense,
  deleteExpense,
  formatExactDateTime,
  getRawDateMillis
} from '@/services/firestoreService';
import {
  CustomerDoc,
  VehicleDoc,
  ServiceVisitDoc,
  DirectSaleDoc,
  ProductDoc,
  ExpenseDoc
} from '@/types/firestore';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  Car,
  Users,
  MessageSquare,
  BellRing,
  Printer,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  Plus,
  Trash2,
  Download
} from 'lucide-react';

type FilterMode = 'today' | 'month' | 'custom' | 'all';
type ActiveTab = 'operations' | 'expenses' | 'due_vehicles' | 'debtors';

export default function ReportsAndAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<ServiceVisitDoc[]>([]);
  const [sales, setSales] = useState<DirectSaleDoc[]>([]);
  const [customers, setCustomers] = useState<CustomerDoc[]>([]);
  const [vehicles, setVehicles] = useState<VehicleDoc[]>([]);
  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [expenses, setExpenses] = useState<ExpenseDoc[]>([]);

  const [filterMode, setFilterMode] = useState<FilterMode>('month');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('operations');

  // New Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: 'مصاريف يومية ونثريات',
    amount: 5000,
    notes: ''
  });
  const [savingExpense, setSavingExpense] = useState(false);

  // Receipt Modal
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await getWorkshopReportsData();
      setVisits(res.visits);
      setSales(res.directSales);
      setCustomers(res.customers);
      setVehicles(res.vehicles);
      setProducts(res.products);
      setExpenses(res.expenses || []);
    } catch (e) {
      console.warn('Error loading reports data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // Build lookup maps for fast access
  const customerMap = useMemo(() => {
    const map: Record<string, CustomerDoc> = {};
    customers.forEach(c => {
      if (c.id) map[c.id] = c;
    });
    return map;
  }, [customers]);

  const vehicleMap = useMemo(() => {
    const map: Record<string, VehicleDoc> = {};
    vehicles.forEach(v => {
      if (v.id) map[v.id] = v;
    });
    return map;
  }, [vehicles]);

  const productMap = useMemo(() => {
    const map: Record<string, ProductDoc> = {};
    products.forEach(p => {
      if (p.id) map[p.id] = p;
    });
    return map;
  }, [products]);

  // Compute date range bounds in ms
  const dateBounds = useMemo(() => {
    const now = new Date();
    if (filterMode === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      return { start, end };
    }
    if (filterMode === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      return { start, end };
    }
    if (filterMode === 'custom') {
      const start = startDate ? new Date(`${startDate}T00:00:00`).getTime() : 0;
      const end = endDate ? new Date(`${endDate}T23:59:59`).getTime() : Number.MAX_SAFE_INTEGER;
      return { start, end };
    }
    return { start: 0, end: Number.MAX_SAFE_INTEGER };
  }, [filterMode, startDate, endDate]);

  // Filtered Visits, Direct Sales, & Expenses
  const filteredVisits = useMemo(() => {
    return visits
      .filter(v => {
        const ms = getRawDateMillis(v.visitDate);
        return ms >= dateBounds.start && ms <= dateBounds.end;
      })
      .sort((a, b) => getRawDateMillis(b.visitDate) - getRawDateMillis(a.visitDate));
  }, [visits, dateBounds]);

  const filteredSales = useMemo(() => {
    return sales
      .filter(s => {
        const ms = getRawDateMillis(s.saleDate);
        return ms >= dateBounds.start && ms <= dateBounds.end;
      })
      .sort((a, b) => getRawDateMillis(b.saleDate) - getRawDateMillis(a.saleDate));
  }, [sales, dateBounds]);

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(ex => {
        const ms = getRawDateMillis(ex.expenseDate);
        return ms >= dateBounds.start && ms <= dateBounds.end;
      })
      .sort((a, b) => getRawDateMillis(b.expenseDate) - getRawDateMillis(a.expenseDate));
  }, [expenses, dateBounds]);

  // Calculate Financials (Revenue, Cost, Expenses, True Net Profit, Net Cash Box)
  const financials = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalCollectedCash = 0;

    filteredVisits.forEach(v => {
      totalRevenue += Number(v.totalPrice || 0);
      totalCollectedCash += Number(v.paidAmount || 0);

      let visitCost = 0;
      const oilProd = products.find(p => p.name === v.oilName);
      if (oilProd) {
        visitCost += (oilProd.unitCost || 0) * (v.oilLitersUsed || 0);
      } else {
        visitCost += (v.totalPrice || 0) * 0.65;
      }

      if (v.filterCode && v.filterCode !== 'بدون فلتر') {
        const filterProd = products.find(p => v.filterCode.includes(p.name));
        visitCost += filterProd ? (filterProd.unitCost || 4000) : 4000;
      }

      if (v.gearOilName) {
        const gearProd = products.find(p => p.name === v.gearOilName);
        visitCost += gearProd
          ? (gearProd.unitCost || 0) * (v.gearOilLitersUsed || 1)
          : (v.gearOilTotalPrice || 0) * 0.65;
      }

      totalCost += visitCost;
    });

    filteredSales.forEach(s => {
      totalRevenue += Number(s.totalAmount || 0);
      totalCollectedCash += Number(s.paidAmount || 0);

      let saleCost = 0;
      (s.items || []).forEach(item => {
        const prod = productMap[item.productId];
        if (prod) {
          saleCost += (prod.unitCost || 0) * (item.quantity || 1);
        } else {
          saleCost += (item.unitPrice || 0) * (item.quantity || 1) * 0.7;
        }
      });
      totalCost += saleCost;
    });

    const totalExpenses = filteredExpenses.reduce((acc, ex) => acc + Number(ex.amount || 0), 0);
    const grossProfit = Math.max(0, Math.round(totalRevenue - totalCost));
    const netProfitAfterExpenses = Math.max(0, grossProfit - totalExpenses);
    const netCashInBox = Math.max(0, Math.round(totalCollectedCash - totalExpenses));

    return {
      totalRevenue: Math.round(totalRevenue),
      totalCost: Math.round(totalCost),
      totalExpenses: Math.round(totalExpenses),
      grossProfit,
      netProfit: netProfitAfterExpenses,
      totalCollectedCash: Math.round(totalCollectedCash),
      netCashInBox,
      operationsCount: filteredVisits.length + filteredSales.length
    };
  }, [filteredVisits, filteredSales, filteredExpenses, products, productMap]);

  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title.trim() || expenseForm.amount <= 0) return;
    setSavingExpense(true);
    try {
      const res = await addExpense({
        title: expenseForm.title.trim(),
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        notes: expenseForm.notes.trim()
      });
      setExpenses(prev => [
        {
          id: res.id,
          title: expenseForm.title.trim(),
          category: expenseForm.category,
          amount: Number(expenseForm.amount),
          notes: expenseForm.notes.trim(),
          expenseDate: new Date().toISOString()
        },
        ...prev
      ]);
      setExpenseForm({
        title: '',
        category: 'مصاريف يومية ونثريات',
        amount: 5000,
        notes: ''
      });
    } catch (err: any) {
      alert(err.message || 'خطأ أثناء حفظ المصروف');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;
    try {
      await deleteExpense(id);
      setExpenses(prev => prev.filter(x => x.id !== id));
    } catch (err: any) {
      alert(err.message || 'خطأ أثناء الحذف');
    }
  };

  const handleExportReportExcel = () => {
    const opsRows = filteredVisits.map((v, idx) => {
      const owner = customerMap[v.customerId];
      const car = vehicleMap[v.vehicleId];
      return {
        'ت': idx + 1,
        'التاريخ والوقت': formatExactDateTime(v.visitDate),
        'اسم الزبون': owner?.fullName || 'زبون المركز',
        'رقم الهاتف': owner?.phoneNumber || '',
        'السيارة': car?.makeModel || '',
        'رقم اللوحة': car?.plateNumber || '',
        'العداد الحالي': v.currentOdometer,
        'العداد القادم': v.nextOdometer,
        'نوع الزيت': `${v.oilName} (${v.viscosity})`,
        'اللترات': v.oilLitersUsed,
        'الفلتر': v.filterCode || '',
        'الإجمالي (د.ع)': v.totalPrice,
        'الواصل (د.ع)': v.paidAmount,
        'الدين (د.ع)': v.debtAmount
      };
    });

    const expRows = filteredExpenses.map((ex, idx) => ({
      'ت': idx + 1,
      'التاريخ': formatExactDateTime(ex.expenseDate),
      'عنوان المصروف': ex.title,
      'التصنيف': ex.category,
      'المبلغ (د.ع)': ex.amount,
      'ملاحظات': ex.notes || ''
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(opsRows), 'سجل عمليات التبديل');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expRows), 'سجل المصاريف');
    XLSX.writeFile(wb, `تقرير_مركز_حسين_الاسدي_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Debtors List
  const debtorsList = useMemo(() => {
    return customers
      .filter(c => (c.totalDebt || 0) > 0)
      .sort((a, b) => b.totalDebt - a.totalDebt);
  }, [customers]);

  const totalDebtsSum = useMemo(() => {
    return debtorsList.reduce((acc, c) => acc + (c.totalDebt || 0), 0);
  }, [debtorsList]);

  // Vehicles Due / Follow-up List
  const vehiclesWithFollowUp = useMemo(() => {
    return vehicles.map(v => {
      const owner = customerMap[v.customerId];
      const carVisits = visits
        .filter(vis => vis.vehicleId === v.id)
        .sort((a, b) => getRawDateMillis(b.visitDate) - getRawDateMillis(a.visitDate));
      const lastVisit = carVisits[0];
      const lastVisitMs = lastVisit ? getRawDateMillis(lastVisit.visitDate) : getRawDateMillis(v.updatedAt);
      const daysSinceLastService = lastVisitMs
        ? Math.floor((Date.now() - lastVisitMs) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        vehicle: v,
        owner,
        lastVisit,
        daysSinceLastService,
        isDueSoon: daysSinceLastService >= 20 || (v.nextOdometer - v.lastOdometer <= 3000)
      };
    }).sort((a, b) => b.daysSinceLastService - a.daysSinceLastService);
  }, [vehicles, customerMap, visits]);

  const sendWhatsAppOilAlert = (v: VehicleDoc, owner?: CustomerDoc) => {
    if (!owner?.phoneNumber) {
      alert('لا يوجد رقم هاتف مسجل لهذا الزبون.');
      return;
    }
    const cleanPhone = owner.phoneNumber.replace(/\D/g, '').replace(/^0/, '964');
    const cardLink =
      typeof window !== 'undefined' && v.qrCodeId
        ? `${window.location.origin}/public/vehicle/${encodeURIComponent(v.qrCodeId)}`
        : '';
    const msg =
      `السلام عليكم ورحمة الله أخي العزيز *${owner.fullName}* المحترم 🌹%0A` +
      `تحية طيبة من *مركز حسين الاسدي لخدمات الزيوت والسيارات*.%0A%0A` +
      `🚗 نود تذكيركم بموعد فحص وتبديل زيت سيارتكم: *(${v.makeModel} - لوحة: ${v.plateNumber})*%0A` +
      `🔢 عداد التبديل القادم المقرر: *(${v.nextOdometer?.toLocaleString()} كم)*%0A` +
      `🛢️ العيار المفضل: *(${v.preferredOil || 'قياسي'})*%0A` +
      (cardLink ? `🔗 بطاقة سيارتك الإلكترونية: ${encodeURIComponent(cardLink)}%0A` : '') +
      `%0A📍 موقع الورشة على الخريطة:%0Ahttps://maps.app.goo.gl/Hfe2TZ3x96CTq8pH8%0A📞 للاستفسار: 07800505015`;
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const sendWhatsAppDebtAlert = (c: CustomerDoc) => {
    const cleanPhone = c.phoneNumber.replace(/\D/g, '').replace(/^0/, '964');
    const monthName = new Date().toLocaleDateString('ar-IQ', { month: 'long', year: 'numeric' });
    const msg = `السلام عليكم ورحمة الله أخي العزيز *${c.fullName}* المحترم 🌹%0Aتحية طيبة من *مركز حسين الاسدي لخدمات الزيوت*.%0A%0A📋 *تذكير كشف الحساب الشهري (${monthName}):*%0Aنود تذكيركم بلطف بالرصيد المتبقي بذمتكم والبالغ: *(${c.totalDebt.toLocaleString()} دينار عراقي)*.%0A%0A📍 موقعنا: https://maps.app.goo.gl/Hfe2TZ3x96CTq8pH8%0A📞 للتواصل: 07800505015%0Aشاكرين تعاونكم وثقتكم الدائمة بنا.`;
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const openVisitReceiptModal = (v: ServiceVisitDoc) => {
    const owner = customerMap[v.customerId];
    const car = vehicleMap[v.vehicleId];
    const items: ReceiptData['items'] = [];

    if (v.oilName) {
      items.push({
        label: `زيت محرك: ${v.oilName} (${v.viscosity})`,
        qty: `${v.oilLitersUsed} لتر`,
        price: v.oilTotalPrice || 0
      });
    }
    if (v.filterCode && v.filterCode !== 'بدون فلتر') {
      items.push({
        label: `فلتر زيت: ${v.filterCode}`,
        qty: '1 قطعة',
        price: v.filterPrice || 0
      });
    }
    if (v.gearOilName) {
      items.push({
        label: `زيت كير: ${v.gearOilName} (${v.gearOilViscosity || ''})`,
        qty: `${v.gearOilLitersUsed || 1} لتر`,
        price: v.gearOilTotalPrice || 0
      });
    }

    setReceiptData({
      receiptNumber: `INV-${v.id?.slice(0, 6).toUpperCase() || 'POS'}`,
      dateTimeStr: formatExactDateTime(v.visitDate),
      customerName: owner?.fullName || 'زبون المركز',
      customerPhone: owner?.phoneNumber || '',
      vehicleModel: car?.makeModel || '—',
      plateNumber: car?.plateNumber || '—',
      currentOdometer: v.currentOdometer,
      nextOdometer: v.nextOdometer,
      items,
      totalPrice: v.totalPrice,
      paidAmount: v.paidAmount,
      debtAmount: v.debtAmount,
      techNotes: v.technicalNotes,
      qrCodeId: car?.qrCodeId
    });
    setReceiptOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <HeaderNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-5">
        
        {/* Page Header & Date Range Filter */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 flex items-center gap-2.5">
              <BarChart3 className="w-7 h-7 text-amber-600" />
              <span>تقارير الأرباح، القاصة، المصاريف، وتنبيهات الزبائن</span>
            </h1>
            <p className="text-sm font-bold text-slate-600 mt-1">
              حساب دقيق للأرباح اليومية والشهرية وصافي القاصة بعد المصاريف، مع تصدير مباشر إلى إكسل.
            </p>
          </div>

          {/* Period Filter Buttons + Excel Export */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setFilterMode('today')}
              className={`px-4 py-2.5 rounded-xl font-black text-sm border-2 transition ${
                filterMode === 'today'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('month')}
              className={`px-4 py-2.5 rounded-xl font-black text-sm border-2 transition ${
                filterMode === 'month'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              هذا الشهر
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-4 py-2.5 rounded-xl font-black text-sm border-2 transition ${
                filterMode === 'all'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              كل الأوقات
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('custom')}
              className={`px-4 py-2.5 rounded-xl font-black text-sm border-2 transition ${
                filterMode === 'custom'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              فترة محددة
            </button>

            <button
              type="button"
              onClick={handleExportReportExcel}
              className="px-4 py-2.5 rounded-xl font-black text-sm bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 shadow-sm transition"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>تصدير Excel</span>
            </button>
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {filterMode === 'custom' && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-wrap items-center gap-4 shadow-sm">
            <span className="font-black text-amber-950 text-sm flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-700" />
              <span>حدد الفترة الزمنية للتقرير:</span>
            </span>
            <div className="flex items-center gap-2">
              <label className="text-xs font-black text-slate-700">من:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border-2 border-amber-300 rounded-xl px-3 py-2 font-mono font-black text-sm text-slate-950"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-black text-slate-700">إلى:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border-2 border-amber-300 rounded-xl px-3 py-2 font-mono font-black text-sm text-slate-950"
              />
            </div>
          </div>
        )}

        {/* 4 Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-xs font-black text-slate-500 block">
              إجمالي المبيعات ({financials.operationsCount} عملية)
            </span>
            <div className="text-2xl sm:text-3xl font-mono font-black text-slate-950">
              {financials.totalRevenue.toLocaleString()} <span className="text-sm">د.ع</span>
            </div>
            <p className="text-xs font-black text-emerald-700">
              صافي القاصة الفعلي (بعد المصاريف): {financials.netCashInBox.toLocaleString()} د.ع
            </p>
          </div>

          <div
            onClick={() => setActiveTab('expenses')}
            className="bg-white hover:border-amber-400 border-2 border-slate-200 rounded-2xl p-5 shadow-sm space-y-1 cursor-pointer transition"
          >
            <span className="text-xs font-black text-slate-500 flex items-center justify-between">
              <span>مصاريف الورشة للفترة</span>
              <span className="text-[11px] text-amber-700 underline">إضافة مصروف +</span>
            </span>
            <div className="text-2xl sm:text-3xl font-mono font-black text-amber-700">
              {financials.totalExpenses.toLocaleString()} <span className="text-sm">د.ع</span>
            </div>
            <p className="text-xs font-bold text-slate-500">
              تكلفة المواد المباعة: {financials.totalCost.toLocaleString()} د.ع
            </p>
          </div>

          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
              <span>صافي الربح الحقيقي (بعد المصاريف)</span>
            </span>
            <div className="text-2xl sm:text-3xl font-mono font-black text-emerald-700">
              {financials.netProfit.toLocaleString()} <span className="text-sm">د.ع</span>
            </div>
            <p className="text-xs font-black text-emerald-800">
              الربح قبل المصاريف: {financials.grossProfit.toLocaleString()} د.ع
            </p>
          </div>

          {/* Clickable Debts Summary Card */}
          <div
            onClick={() => setActiveTab('debtors')}
            className="bg-red-50 hover:bg-red-100/80 border-2 border-red-300 rounded-2xl p-5 shadow-sm space-y-1 cursor-pointer transition"
          >
            <span className="text-xs font-black text-red-900 flex items-center justify-between">
              <span>مجموع ديون الزبائن الكلي</span>
              <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-[11px]">
                {debtorsList.length} مديون
              </span>
            </span>
            <div className="text-2xl sm:text-3xl font-mono font-black text-red-600">
              {totalDebtsSum.toLocaleString()} <span className="text-sm">د.ع</span>
            </div>
            <p className="text-xs font-black text-red-800 underline">
              اضغط هنا لعرض أسماء الزبائن المديونين 👈
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-2 flex flex-wrap gap-2 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('operations')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'operations'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>سجل العمليات والمبيعات ({financials.operationsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'expenses'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>سجل المصاريف وصافي القاصة ({filteredExpenses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('due_vehicles')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'due_vehicles'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>السيارات المستحقة للتبديل ({vehiclesWithFollowUp.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('debtors')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'debtors'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>كشف الزبائن المديونين ({debtorsList.length})</span>
          </button>
        </div>

        {loading ? (
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-12 text-center font-black text-slate-600 flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            <span>جاري تحميل البيانات والتقارير المالية...</span>
          </div>
        ) : (
          <>
            {/* TAB 1: OPERATIONS LOG */}
            {activeTab === 'operations' && (
              <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-100 border-b-2 border-slate-200 flex justify-between items-center">
                  <h2 className="font-black text-base text-slate-950">
                    سجل عمليات تبديل الزيت والمبيعات (مرتب حسب التاريخ والوقت الدقيق)
                  </h2>
                </div>

                {filteredVisits.length === 0 && filteredSales.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 font-bold text-base">
                    لا توجد عمليات مسجلة خلال هذه الفترة الزمنية.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {filteredVisits.map((v) => {
                      const owner = customerMap[v.customerId];
                      const car = vehicleMap[v.vehicleId];
                      return (
                        <div key={v.id} className="p-4 sm:p-5 hover:bg-slate-50 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-lg text-xs font-black">
                                تبديل زيت وصيانة
                              </span>
                              <span className="font-mono font-black text-sm text-slate-700" dir="ltr">
                                {formatExactDateTime(v.visitDate)}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 pt-1">
                              <span className="font-black text-base text-slate-950">
                                {owner?.fullName || 'زبون المركز'} ({owner?.phoneNumber || ''})
                              </span>
                              {car && (
                                <span className="text-sm font-bold text-slate-700">
                                  — {car.makeModel}
                                </span>
                              )}
                              {car?.plateNumber && (
                                <IraqiPlateBadge plateNumber={car.plateNumber} size="sm" />
                              )}
                            </div>

                            <div className="text-sm font-bold text-slate-600">
                              الزيت: <strong className="text-slate-900">{v.oilName} ({v.viscosity}) - {v.oilLitersUsed} لتر</strong>
                              {v.filterCode && ` | الفلتر: ${v.filterCode}`}
                              {v.gearOilName && ` | زيت الكير: ${v.gearOilName}`}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
                            <div className="text-right font-mono">
                              <div className="text-base font-black text-slate-950">
                                الإجمالي: {v.totalPrice.toLocaleString()} د.ع
                              </div>
                              <div className="text-xs font-black text-emerald-700">
                                الواصل: {v.paidAmount.toLocaleString()} د.ع
                                {v.debtAmount > 0 && (
                                  <span className="text-red-600 mr-2">
                                    (دين: {v.debtAmount.toLocaleString()})
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => openVisitReceiptModal(v)}
                              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs flex items-center gap-1.5 transition"
                            >
                              <Printer className="w-4 h-4 text-amber-400" />
                              <span>الوصل / واتساب</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {filteredSales.map((s) => (
                      <div key={s.id} className="p-4 sm:p-5 hover:bg-slate-50 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span className="bg-blue-100 text-blue-900 border border-blue-300 px-2.5 py-0.5 rounded-lg text-xs font-black">
                              بيع مباشر سريع
                            </span>
                            <span className="font-mono font-black text-sm text-slate-700" dir="ltr">
                              {formatExactDateTime(s.saleDate)}
                            </span>
                          </div>
                          <div className="text-sm font-black text-slate-900 pt-1">
                            المواد المباعة: {(s.items || []).map(i => `${i.productName} (×${i.quantity})`).join(' + ')}
                          </div>
                        </div>

                        <div className="font-mono font-black text-base text-emerald-700">
                          {s.totalAmount.toLocaleString()} د.ع
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: WORKSHOP EXPENSES & NET CASH BOX */}
            {activeTab === 'expenses' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Add Expense Form */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <h2 className="text-base font-black text-slate-950 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Plus className="w-5 h-5 text-emerald-600" />
                    <span>تسجيل مصروف جديد للورشة</span>
                  </h2>

                  <form onSubmit={handleAddExpenseSubmit} className="space-y-3.5 text-sm">
                    <div>
                      <label className="block font-black text-slate-800 mb-1">بيان المصروف *</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: غداء عمال / اشتراك مولدة / منظفات"
                        value={expenseForm.title}
                        onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                        className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2.5 font-black text-slate-950"
                      />
                    </div>

                    <div>
                      <label className="block font-black text-slate-800 mb-1">التصنيف</label>
                      <select
                        value={expenseForm.category}
                        onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                        className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2.5 font-black text-slate-950"
                      >
                        <option value="مصاريف يومية ونثريات">مصاريف يومية ونثريات</option>
                        <option value="أجور ووجبات عمال">أجور ووجبات عمال</option>
                        <option value="إيجار وكهرباء ومولد">إيجار وكهرباء ومولد</option>
                        <option value="شراء عدد ومستلزمات ورشة">شراء عدد ومستلزمات ورشة</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-black text-slate-800 mb-1">المبلغ (د.ع) *</label>
                      <input
                        type="number"
                        step="250"
                        required
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                        className="w-full bg-amber-50 border-2 border-amber-300 rounded-xl px-3.5 py-2.5 font-mono text-lg font-black text-slate-950"
                      />
                    </div>

                    <div>
                      <label className="block font-black text-slate-800 mb-1">ملاحظات إضافية</label>
                      <input
                        type="text"
                        value={expenseForm.notes}
                        onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                        placeholder="اختياري..."
                        className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2 font-bold text-slate-950"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingExpense}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl flex items-center justify-center gap-2 shadow-md transition"
                    >
                      {savingExpense ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                      <span>حفظ المصروف وخصمه من القاصة</span>
                    </button>
                  </form>
                </div>

                {/* Expenses List & Net Cash Box Summary */}
                <div className="lg:col-span-2 bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-100 pb-3">
                    <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-amber-600" />
                      <span>سجل المصاريف للفترة المحددة ({filteredExpenses.length})</span>
                    </h2>
                    <div className="bg-emerald-50 border border-emerald-300 px-3.5 py-1.5 rounded-xl text-xs font-black text-emerald-950">
                      صافي القاصة النقدي: <span className="font-mono text-sm text-emerald-700">{financials.netCashInBox.toLocaleString()} د.ع</span>
                    </div>
                  </div>

                  {filteredExpenses.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 font-bold text-sm">
                      لا توجد مصاريف مسجلة خلال هذه الفترة.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filteredExpenses.map((ex) => (
                        <div key={ex.id} className="py-3.5 flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-950 text-sm">{ex.title}</span>
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg text-[11px] font-black">
                                {ex.category}
                              </span>
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-500 block mt-0.5" dir="ltr">
                              {formatExactDateTime(ex.expenseDate)}
                            </span>
                            {ex.notes && <p className="text-xs text-slate-600 font-bold mt-0.5">{ex.notes}</p>}
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-mono font-black text-base text-red-600">
                              -{Number(ex.amount).toLocaleString()} د.ع
                            </span>
                            {ex.id && (
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(ex.id!)}
                                className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: VEHICLES DUE FOR OIL CHANGE */}
            {activeTab === 'due_vehicles' && (
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-2 border-b-2 border-slate-100 pb-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
                      <BellRing className="w-6 h-6 text-amber-600" />
                      <span>متابعة وتنبيهات السيارات المستحقة لتبديل الزيت</span>
                    </h2>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">
                      أرسل تذكيراً بضغطة زر إلى واتساب الزبون يتضمن رقم سيارته والعداد القادم ورابط بطاقته وموقع الورشة.
                    </p>
                  </div>
                </div>

                {vehiclesWithFollowUp.length === 0 ? (
                  <p className="text-center py-8 text-slate-500 font-bold">لا توجد سيارات مسجلة حالياً.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehiclesWithFollowUp.map(({ vehicle, owner, daysSinceLastService }) => (
                      <div
                        key={vehicle.id}
                        className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-amber-400 transition"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h3 className="font-black text-slate-950 text-base">{vehicle.makeModel}</h3>
                            <p className="text-sm font-black text-amber-800 mt-0.5">
                              الزبون: {owner?.fullName || 'غير محدد'} ({owner?.phoneNumber || ''})
                            </p>
                            <span className="inline-block mt-1 text-xs font-bold text-slate-500">
                              مضى على آخر زيارة: {daysSinceLastService} يوم
                            </span>
                          </div>
                          <IraqiPlateBadge plateNumber={vehicle.plateNumber} size="sm" />
                        </div>

                        <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-slate-200 font-mono text-sm">
                          <div>
                            <span className="text-xs font-bold text-slate-500 block">العداد السابق:</span>
                            <strong className="font-black text-slate-900">{vehicle.lastOdometer?.toLocaleString()} كم</strong>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-emerald-700 block">موعد التبديل القادم:</span>
                            <strong className="font-black text-emerald-700">{vehicle.nextOdometer?.toLocaleString()} كم</strong>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => sendWhatsAppOilAlert(vehicle, owner)}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-sm transition"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>إرسال تذكير واتساب + رابط البطاقة للزبون</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: DEBTORS REPORT */}
            {activeTab === 'debtors' && (
              <div className="bg-white border-2 border-red-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-2 border-b-2 border-red-100 pb-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                      <span>كشف الزبائن المديونين والتذكير الشهري ({debtorsList.length} زبون)</span>
                    </h2>
                    <p className="text-xs font-bold text-slate-600 mt-0.5">
                      مجموع الديون الكلي: <strong className="text-red-600 font-mono">{totalDebtsSum.toLocaleString()} د.ع</strong>
                    </p>
                  </div>
                </div>

                {debtorsList.length === 0 ? (
                  <div className="py-10 text-center bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 font-black text-base flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-6 h-6" />
                    <span>لا توجد أي ديون متبقية على الزبائن حالياً!</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {debtorsList.map((c) => (
                      <div
                        key={c.id}
                        className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-3"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-black text-slate-950 text-base">{c.fullName}</h3>
                            <p className="font-mono font-bold text-slate-600 text-sm">{c.phoneNumber}</p>
                          </div>
                          <div className="bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl text-right">
                            <span className="text-[10px] font-black text-red-700 block">الدين المتبقي</span>
                            <span className="font-mono font-black text-red-600 text-base">
                              {c.totalDebt.toLocaleString()} د.ع
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => sendWhatsAppDebtAlert(c)}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-sm transition"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>إرسال تذكير واتساب شهري بالدين</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </main>

      <ReceiptModal
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        data={receiptData}
      />
    </div>
  );
}
