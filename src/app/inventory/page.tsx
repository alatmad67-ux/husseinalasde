'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import HeaderNav from '@/components/HeaderNav';
import { 
  getProductsList, 
  addProduct, 
  updateProduct, 
  deleteProduct 
} from '@/services/firestoreService';
import { ProductDoc, ProductCategory, PRODUCT_CATEGORY_LABELS } from '@/types/firestore';
import { 
  Droplet, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  CheckCircle, 
  X, 
  Save, 
  Loader2,
  Package,
  Layers,
  AlertTriangle,
  Download
} from 'lucide-react';

// Helper to determine whether a category is measured in Liters or Pieces
function isLiquidCategory(category: ProductCategory): boolean {
  return category === 'engine_oil' || category === 'gear_oil' || category === 'coolant';
}

export default function FluidInventoryPage() {
  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'engine_oil' as ProductCategory,
    sizesInput: '10W30, 10W40, 20W50',
    cartonsCount: 5,
    piecesPerCarton: 4,
    packageSizeLiters: 4,
    totalPiecesStock: 20,
    totalLitersStock: 80,
    unitCost: 8500,
    directSalePrice: 11000,
    serviceSalePrice: 12500
  });

  const loadData = async () => {
    try {
      const list = await getProductsList(true);
      setProducts(list);
    } catch (err) {
      console.warn('Could not load products from Firestore:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-calculate stock based on whether the product is measured by Liters or Pieces
  const updateStockCalculations = (
    category: ProductCategory,
    cartons: number,
    piecesPerCarton: number,
    litersPerPiece: number
  ) => {
    const totalPieces = Number(cartons) * Number(piecesPerCarton);
    const liquid = isLiquidCategory(category);
    const effectiveLitersPerPiece = liquid ? Number(litersPerPiece) : 1;
    const totalStock = liquid
      ? Number((totalPieces * effectiveLitersPerPiece).toFixed(2))
      : totalPieces;

    setFormData((prev) => ({
      ...prev,
      category,
      cartonsCount: cartons,
      piecesPerCarton: piecesPerCarton,
      packageSizeLiters: effectiveLitersPerPiece,
      totalPiecesStock: totalPieces,
      totalLitersStock: totalStock
    }));
  };

  const handleCategoryChange = (newCat: ProductCategory) => {
    const liquid = isLiquidCategory(newCat);
    const defaultPkgLiters = liquid ? (formData.packageSizeLiters > 1 ? formData.packageSizeLiters : 4) : 1;
    const defaultSizes =
      newCat === 'engine_oil'
        ? '10W30, 10W40, 20W50'
        : newCat === 'gear_oil'
        ? 'ATF, CVT, 75W90'
        : newCat === 'filter'
        ? 'كوري, ياباني, أصلي'
        : 'قياسي';

    const totalPieces = Number(formData.cartonsCount) * Number(formData.piecesPerCarton);
    const totalStock = liquid ? Number((totalPieces * defaultPkgLiters).toFixed(2)) : totalPieces;

    setFormData((prev) => ({
      ...prev,
      category: newCat,
      sizesInput: editingId ? prev.sizesInput : defaultSizes,
      packageSizeLiters: defaultPkgLiters,
      totalPiecesStock: totalPieces,
      totalLitersStock: totalStock
    }));
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      category: 'engine_oil',
      sizesInput: '10W30, 10W40, 20W50',
      cartonsCount: 5,
      piecesPerCarton: 4,
      packageSizeLiters: 4,
      totalPiecesStock: 20,
      totalLitersStock: 80,
      unitCost: 8000,
      directSalePrice: 10500,
      serviceSalePrice: 12000
    });
    setModalOpen(true);
  };

  const openEditModal = (p: ProductDoc) => {
    setEditingId(p.id || null);
    const sizesStr = p.availableSizes && p.availableSizes.length > 0
      ? p.availableSizes.join(', ')
      : (p.viscosity || '');

    setFormData({
      name: p.name,
      category: p.category,
      sizesInput: sizesStr,
      cartonsCount: p.cartonsCount ?? 1,
      piecesPerCarton: p.piecesPerCarton ?? 1,
      packageSizeLiters: isLiquidCategory(p.category) ? (p.packageSizeLiters ?? 4) : 1,
      totalPiecesStock: p.totalPiecesStock ?? p.totalLitersStock ?? 1,
      totalLitersStock: p.totalLitersStock ?? 1,
      unitCost: p.unitCost ?? 0,
      directSalePrice: p.directSalePrice ?? p.salePrice ?? 0,
      serviceSalePrice: p.serviceSalePrice ?? p.salePrice ?? 0
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const parsedSizes = formData.sizesInput
      .split(/[,،]+/)
      .map(s => s.trim())
      .filter(Boolean);

    const liquid = isLiquidCategory(formData.category);

    const productPayload: Omit<ProductDoc, 'id'> = {
      name: formData.name.trim(),
      category: formData.category,
      availableSizes: parsedSizes,
      viscosity: parsedSizes[0] || '',
      cartonsCount: Number(formData.cartonsCount),
      piecesPerCarton: Number(formData.piecesPerCarton),
      packageSizeLiters: liquid ? Number(formData.packageSizeLiters) : 1,
      totalPiecesStock: Number(formData.totalPiecesStock),
      totalLitersStock: liquid ? Number(formData.totalLitersStock) : Number(formData.totalPiecesStock),
      unitCost: Number(formData.unitCost),
      directSalePrice: Number(formData.directSalePrice),
      serviceSalePrice: Number(formData.serviceSalePrice),
      salePrice: Number(formData.serviceSalePrice)
    };

    try {
      if (editingId) {
        await updateProduct(editingId, productPayload);
        setProducts(prev => prev.map(p => p.id === editingId ? { id: editingId, ...productPayload } : p));
        setSuccessMsg('تم تحديث بيانات المنتج والكميات والأسعار بنجاح!');
      } else {
        const res = await addProduct(productPayload);
        setProducts(prev => [...prev, { id: res.id, ...productPayload }]);
        setSuccessMsg('تمت إضافة المنتج الجديد للمخزون بنجاح!');
      }
      setModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء حفظ المنتج.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف المنتج (${name}) من المخزون؟`)) return;

    try {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      setSuccessMsg(`تم حذف (${name}) بنجاح.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء الحذف.');
    }
  };

  const handleExportInventoryExcel = () => {
    const rows = products.map((p, idx) => ({
      'ت': idx + 1,
      'اسم المنتج': p.name,
      'القسم': PRODUCT_CATEGORY_LABELS[p.category] || p.category,
      'السايزات المتوفرة': (p.availableSizes || []).join(' / ') || p.viscosity || '',
      'الرصيد المتاح': p.totalLitersStock,
      'وحدة القياس': isLiquidCategory(p.category) ? 'لتر' : 'قطعة',
      'سعر التكلفة (د.ع)': p.unitCost || 0,
      'سعر البيع المباشر (د.ع)': p.directSalePrice || p.salePrice || 0,
      'سعر البيع مع التبديل (د.ع)': p.serviceSalePrice || p.salePrice || 0
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'جرد المخزن');
    XLSX.writeFile(wb, `جرد_مخزن_مركز_حسين_الاسدي_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const lowStockProducts = products.filter((p) => {
    const liquid = isLiquidCategory(p.category);
    return liquid ? Number(p.totalLitersStock || 0) <= 16 : Number(p.totalLitersStock || 0) <= 5;
  });

  const filtered = products.filter((p) => {
    const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
    const sizesStr = (p.availableSizes || []).join(' ');
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      sizesStr.toLowerCase().includes(search.toLowerCase()) ||
      (p.viscosity && p.viscosity.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const currentFormIsLiquid = isLiquidCategory(formData.category);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <HeaderNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-5">
        
        {/* Header Title & Add Button */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 flex items-center gap-2.5">
              <Droplet className="w-7 h-7 text-amber-600" />
              <span>إدارة المخزون والمنتجات (الزيوت باللتر / الفلاتر والمواد بالقطعة)</span>
            </h1>
            <p className="text-sm text-slate-600 mt-1 font-bold">
              الزيوت تقاس وتحسب باللتر تلقائياً، بينما الفلاتر والمحسنات والفلاشات ومانع التبخير تقاس بالقطعة.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
            <button
              type="button"
              onClick={handleExportInventoryExcel}
              className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-3.5 rounded-xl font-black text-sm shadow-sm transition flex-1 md:flex-none"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>تصدير المخزون إلى Excel</span>
            </button>

            <button
              onClick={openAddModal}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3.5 rounded-xl font-black text-sm shadow-md shadow-amber-500/20 transition flex-1 md:flex-none justify-center"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              <span>+ إضافة منتج جديد للمخزون</span>
            </button>
          </div>
        </div>

        {/* Low Stock Alert Banner (تنبيه نواقص المخزن) */}
        {lowStockProducts.length > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-red-900 font-black text-sm sm:text-base">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>تنبيه نواقص المخزون ({lowStockProducts.length} مواد أوشكت على النفاد وتحتاج طلبية جديدة):</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.map((lp) => (
                <span
                  key={lp.id}
                  onClick={() => openEditModal(lp)}
                  className="cursor-pointer bg-white hover:bg-red-100 border border-red-300 text-red-900 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition"
                >
                  <span>{lp.name}</span>
                  <span className="font-mono text-red-600">
                    ({lp.totalLitersStock} {isLiquidCategory(lp.category) ? 'لتر' : 'قطعة'})
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-900 p-4 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-6 h-6 flex-shrink-0 text-emerald-600" />
            <p className="font-black text-base">{successMsg}</p>
          </div>
        )}

        {/* Search & Category Filter */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-4 top-3.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الزيت، العيار (10W40, 5W30)، أو اسم الفلتر..."
              className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl pr-12 pl-4 py-3 text-base text-slate-950 font-black focus:outline-none focus:border-amber-500 focus:bg-white"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3 text-base font-black text-slate-900 focus:outline-none focus:border-amber-500"
          >
            <option value="all">كل الأقسام ({products.length})</option>
            {Object.entries(PRODUCT_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Inventory Table & Cards */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-100 text-slate-900 font-black border-b-2 border-slate-200 text-sm">
                <tr>
                  <th className="py-4 px-4">اسم المنتج والفئة</th>
                  <th className="py-4 px-4">القياسات / الموديلات</th>
                  <th className="py-4 px-4">وحدة القياس والتعبئة</th>
                  <th className="py-4 px-4">الرصيد المتوفر حالياً</th>
                  <th className="py-4 px-4">سعر التكلفة</th>
                  <th className="py-4 px-4">سعر البيع فقط</th>
                  <th className="py-4 px-4">سعر البيع مع التبديل</th>
                  <th className="py-4 px-4">تعديل / حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-900">
                {filtered.map((item) => {
                  const liquid = isLiquidCategory(item.category);
                  const unitLabel = liquid ? 'لتر' : 'قطعة';
                  const isLow = liquid ? item.totalLitersStock <= 16 : item.totalLitersStock <= 5;
                  const sizes = item.availableSizes && item.availableSizes.length > 0
                    ? item.availableSizes
                    : (item.viscosity ? [item.viscosity] : []);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="py-4 px-4">
                        <div className="font-black text-slate-950 text-base">{item.name}</div>
                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-md border inline-block mt-1 ${
                          liquid
                            ? 'text-amber-900 bg-amber-50 border-amber-300'
                            : 'text-blue-900 bg-blue-50 border-blue-300'
                        }`}>
                          {PRODUCT_CATEGORY_LABELS[item.category] || item.category} ({liquid ? 'يقاس باللتر' : 'يقاس بالقطعة'})
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {sizes.map((sz) => (
                            <span
                              key={sz}
                              className="px-2.5 py-1 bg-slate-100 border border-slate-300 rounded-lg font-mono font-black text-slate-900 text-xs"
                            >
                              {sz}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono text-sm font-bold text-slate-700">
                        <div>{item.cartonsCount || 0} كرتون × {item.piecesPerCarton || 1} قطعة</div>
                        {liquid ? (
                          <div className="text-xs text-amber-800 font-black mt-0.5">
                            حجم العبوة: {item.packageSizeLiters} لتر
                          </div>
                        ) : (
                          <div className="text-xs text-blue-800 font-black mt-0.5">
                            يحسب بالقطعة الواحدة
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 font-mono">
                        <div className={`font-black text-base ${isLow ? 'text-red-600' : 'text-emerald-700'}`}>
                          {item.totalLitersStock} {unitLabel}
                        </div>
                        {liquid && item.totalPiecesStock && (
                          <div className="text-xs font-bold text-slate-500">({item.totalPiecesStock} عبوة/دبة)</div>
                        )}
                      </td>

                      <td className="py-4 px-4 font-mono font-black text-slate-600 text-sm">
                        {(item.unitCost || 0).toLocaleString()} د.ع
                        <span className="block text-[11px] text-slate-400">لكل {unitLabel}</span>
                      </td>

                      <td className="py-4 px-4 font-mono font-black text-blue-700 text-base">
                        {(item.directSalePrice || item.salePrice || 0).toLocaleString()} د.ع
                      </td>

                      <td className="py-4 px-4 font-mono font-black text-amber-700 text-base">
                        {(item.serviceSalePrice || item.salePrice || 0).toLocaleString()} د.ع
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2.5 rounded-xl bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-800 transition"
                            title="تعديل"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id!, item.name)}
                            className="p-2.5 rounded-xl bg-red-50 hover:bg-red-600 hover:text-white text-red-600 transition"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Cards */}
          <div className="md:hidden divide-y divide-slate-200">
            {filtered.map((item) => {
              const liquid = isLiquidCategory(item.category);
              const unitLabel = liquid ? 'لتر' : 'قطعة';
              const sizes = item.availableSizes && item.availableSizes.length > 0
                ? item.availableSizes
                : (item.viscosity ? [item.viscosity] : []);

              return (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-black text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-300">
                        {PRODUCT_CATEGORY_LABELS[item.category] || item.category} ({unitLabel})
                      </span>
                      <h3 className="font-black text-slate-950 text-base mt-1.5">{item.name}</h3>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEditModal(item)} className="p-2.5 bg-slate-100 rounded-xl text-slate-800">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item.id!, item.name)} className="p-2.5 bg-red-50 rounded-xl text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Sizes */}
                  <div className="flex flex-wrap gap-1.5">
                    {sizes.map((sz) => (
                      <span key={sz} className="px-2.5 py-1 bg-slate-100 border border-slate-300 rounded-lg font-mono font-black text-xs">
                        {sz}
                      </span>
                    ))}
                  </div>

                  {/* Stock & Dual Prices */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm">
                    <div>
                      <span className="text-xs text-slate-500 font-bold block">الرصيد الكلي:</span>
                      <strong className="font-mono font-black text-emerald-700">{item.totalLitersStock} {unitLabel}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-bold block">بيع فقط:</span>
                      <strong className="font-mono font-black text-blue-700">{(item.directSalePrice || item.salePrice).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-bold block">مع التبديل:</span>
                      <strong className="font-mono font-black text-amber-700">{(item.serviceSalePrice || item.salePrice).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </main>

      {/* Modal: Add / Edit Product with Dynamic Unit (Liters vs Pieces) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
                <Package className="w-6 h-6 text-amber-600" />
                <span>{editingId ? 'تعديل المنتج وحساب المخزون' : 'إضافة منتج جديد للمخزون'}</span>
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-sm">
              
              {/* Category Selection First so Unit Mode is obvious */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-black text-slate-900 mb-1.5">فئة المنتج (تحدد وحدة القياس)</label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleCategoryChange(e.target.value as ProductCategory)}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-3 text-slate-950 font-black focus:outline-none focus:border-amber-500"
                  >
                    {Object.entries(PRODUCT_CATEGORY_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-black text-slate-900 mb-1.5">اسم المنتج / الماركة</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={currentFormIsLiquid ? 'مثال: دهن يورال (Eural) أو كاسترول' : 'مثال: فلتر زيت أصلي تويوتا'}
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-3 text-slate-950 font-black focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Unit Mode Indicator Badge */}
              <div className={`p-3 rounded-xl border-2 font-black text-sm flex items-center justify-between ${
                currentFormIsLiquid
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-blue-50 border-blue-300 text-blue-950'
              }`}>
                <span>
                  وحدة القياس والحساب المعتمدة لهذا القسم:
                </span>
                <span className="px-3 py-1 rounded-lg bg-white border font-mono text-base">
                  {currentFormIsLiquid ? 'يقاس باللتر (Liters)' : 'يقاس بالقطعة (Pieces)'}
                </span>
              </div>

              {/* Multi-Sizes Input */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-200 space-y-1.5">
                <label className="block font-black text-slate-900">
                  {currentFormIsLiquid
                    ? 'القياسات / درجات اللزوجة المتوفرة (افصل بينها بفاصلة ,)'
                    : 'الأحجام / الموديلات أو الأكواد المتوفرة (افصل بينها بفاصلة ,)'}
                </label>
                <input
                  type="text"
                  value={formData.sizesInput}
                  onChange={(e) => setFormData({ ...formData, sizesInput: e.target.value })}
                  placeholder={currentFormIsLiquid ? 'مثال: 10W30, 10W40, 20W50, 5W30' : 'مثال: كوري, ياباني, 90915-YZZE2'}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-950 font-mono font-black focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Automatic Stock Calculator: Different layout for Liters vs Pieces */}
              <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 space-y-3">
                <div className="flex items-center gap-2 font-black text-slate-950">
                  <Layers className="w-5 h-5 text-amber-600" />
                  <span>
                    {currentFormIsLiquid
                      ? 'حاسبة مخزون الزيوت والسوائل (كرتون ← عبوة ← إجمالي اللترات):'
                      : 'حاسبة مخزون القطع والفلاتر (كرتون ← إجمالي عدد القطع):'}
                  </span>
                </div>

                <div className={`grid gap-3 ${currentFormIsLiquid ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <div>
                    <label className="block font-black text-slate-700 mb-1 text-xs">عدد الكراتين</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.cartonsCount}
                      onChange={(e) =>
                        updateStockCalculations(
                          formData.category,
                          Number(e.target.value),
                          formData.piecesPerCarton,
                          formData.packageSizeLiters
                        )
                      }
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2.5 font-mono text-base font-black text-slate-950"
                    />
                  </div>

                  <div>
                    <label className="block font-black text-slate-700 mb-1 text-xs">كم قطعة بالكرتون؟</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.piecesPerCarton}
                      onChange={(e) =>
                        updateStockCalculations(
                          formData.category,
                          formData.cartonsCount,
                          Number(e.target.value),
                          formData.packageSizeLiters
                        )
                      }
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2.5 font-mono text-base font-black text-slate-950"
                    />
                  </div>

                  {currentFormIsLiquid && (
                    <div>
                      <label className="block font-black text-amber-900 mb-1 text-xs">حجم العبوة (كم لتر؟)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={formData.packageSizeLiters}
                        onChange={(e) =>
                          updateStockCalculations(
                            formData.category,
                            formData.cartonsCount,
                            formData.piecesPerCarton,
                            Number(e.target.value)
                          )
                        }
                        className="w-full bg-amber-50 border-2 border-amber-400 rounded-xl px-3 py-2.5 font-mono text-base font-black text-amber-950"
                      />
                    </div>
                  )}
                </div>

                {currentFormIsLiquid ? (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block font-black text-slate-700 mb-1 text-xs">إجمالي عدد العبوات (الدبات)</label>
                      <input
                        type="number"
                        value={formData.totalPiecesStock}
                        onChange={(e) => setFormData({ ...formData, totalPiecesStock: Number(e.target.value) })}
                        className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2.5 font-mono text-base font-black text-blue-700"
                      />
                    </div>
                    <div>
                      <label className="block font-black text-emerald-900 mb-1 text-xs">الرصيد الكلي المحسوب (باللتر)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.totalLitersStock}
                        onChange={(e) => setFormData({ ...formData, totalLitersStock: Number(e.target.value) })}
                        className="w-full bg-emerald-50 border-2 border-emerald-400 rounded-xl px-3 py-2.5 font-mono text-base font-black text-emerald-900"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-200">
                    <label className="block font-black text-emerald-900 mb-1 text-xs">
                      الرصيد الكلي المتوفر في المخزون (بالقطعة)
                    </label>
                    <input
                      type="number"
                      value={formData.totalPiecesStock}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFormData({
                          ...formData,
                          totalPiecesStock: val,
                          totalLitersStock: val
                        });
                      }}
                      className="w-full bg-emerald-50 border-2 border-emerald-400 rounded-xl px-4 py-2.5 font-mono text-lg font-black text-emerald-900"
                    />
                  </div>
                )}
              </div>

              {/* Dual Pricing Section */}
              <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 space-y-3">
                <span className="font-black text-slate-950 block">
                  {currentFormIsLiquid
                    ? 'التسعير للتر الواحد (سعر التكلفة / البيع المباشر / البيع مع الخدمة):'
                    : 'التسعير للقطعة الواحدة (سعر التكلفة / البيع المباشر / البيع مع الخدمة):'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-black text-slate-700 mb-1 text-xs">
                      سعر الشراء ({currentFormIsLiquid ? 'للتر' : 'للقطعة'})
                    </label>
                    <input
                      type="number"
                      value={formData.unitCost}
                      onChange={(e) => setFormData({ ...formData, unitCost: Number(e.target.value) })}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2.5 font-mono text-base font-black text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-black text-blue-800 mb-1 text-xs">
                      سعر البيع فقط (بدون خدمة)
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.directSalePrice}
                      onChange={(e) => setFormData({ ...formData, directSalePrice: Number(e.target.value) })}
                      className="w-full bg-blue-50 border-2 border-blue-300 rounded-xl px-3 py-2.5 font-mono text-base font-black text-blue-900"
                    />
                  </div>

                  <div>
                    <label className="block font-black text-amber-900 mb-1 text-xs">
                      سعر البيع مع التبديل
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.serviceSalePrice}
                      onChange={(e) => setFormData({ ...formData, serviceSalePrice: Number(e.target.value) })}
                      className="w-full bg-amber-50 border-2 border-amber-300 rounded-xl px-3 py-2.5 font-mono text-base font-black text-amber-900"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2.5">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl flex items-center justify-center gap-2 shadow-md text-base"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  <span>{editingId ? 'حفظ التعديلات' : 'إضافة المنتج للمخزون'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black rounded-xl text-base"
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
