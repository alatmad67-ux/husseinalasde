'use client';

import React, { useState, useEffect } from 'react';
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
  Layers
} from 'lucide-react';

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
    sizesInput: '10W30, 10W40, 20W50', // Comma separated sizes/viscosities
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
      const list = await getProductsList();
      if (list.length > 0) {
        setProducts(list);
      }
    } catch (err) {
      console.warn('Could not load products from Firestore:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-calculate totalPiecesStock & totalLitersStock when cartons, piecesPerCarton, or packageSizeLiters change
  const updateStockCalculations = (
    cartons: number,
    piecesPerCarton: number,
    litersPerPiece: number
  ) => {
    const totalPieces = Number(cartons) * Number(piecesPerCarton);
    const totalLiters = Number((totalPieces * Number(litersPerPiece)).toFixed(2));
    setFormData((prev) => ({
      ...prev,
      cartonsCount: cartons,
      piecesPerCarton: piecesPerCarton,
      packageSizeLiters: litersPerPiece,
      totalPiecesStock: totalPieces,
      totalLitersStock: totalLiters
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
      packageSizeLiters: p.packageSizeLiters ?? 4,
      totalPiecesStock: p.totalPiecesStock ?? 1,
      totalLitersStock: p.totalLitersStock ?? 4,
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

    const productPayload: Omit<ProductDoc, 'id'> = {
      name: formData.name.trim(),
      category: formData.category,
      availableSizes: parsedSizes,
      viscosity: parsedSizes[0] || '',
      cartonsCount: Number(formData.cartonsCount),
      piecesPerCarton: Number(formData.piecesPerCarton),
      packageSizeLiters: Number(formData.packageSizeLiters),
      totalPiecesStock: Number(formData.totalPiecesStock),
      totalLitersStock: Number(formData.totalLitersStock),
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
        setSuccessMsg('تمت إضافة المنتج الجديد مع حساب الكراتين واللترات بنجاح!');
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

  const filtered = products.filter((p) => {
    const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
    const sizesStr = (p.availableSizes || []).join(' ');
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      sizesStr.toLowerCase().includes(search.toLowerCase()) ||
      (p.viscosity && p.viscosity.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <HeaderNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-5">
        
        {/* Header Title & Add Button */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <Droplet className="w-6 h-6 text-amber-600" />
              <span>إدارة المخزون (بالكرتون، القطعة، واللتر) والأسعار</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              إضافة وتعديل الزيوت بعدة قياسات (Sizes)، حساب تلقائي للكراتين والعبوات، وتسعير مزدوج (مباشر / مع الخدمة).
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-3 rounded-xl font-black text-xs shadow-md shadow-amber-500/20 transition w-full md:w-auto justify-center"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ إضافة منتج جديد للمخزون</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <p className="font-bold text-sm">{successMsg}</p>
          </div>
        )}

        {/* Search & Category Filter */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم الزيت، العيار (10W40, 5W30)، كود الفلتر..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-10 pl-4 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500 focus:bg-white"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
          >
            <option value="all">كل الفئات ({products.length})</option>
            {Object.entries(PRODUCT_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Inventory Table & Cards */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">اسم المنتج والنوع</th>
                  <th className="py-3.5 px-4">القياسات / اللزوجة المتوفرة</th>
                  <th className="py-3.5 px-4">التعبئة (كرتون / قطعة / لتر)</th>
                  <th className="py-3.5 px-4">الرصيد الكلي</th>
                  <th className="py-3.5 px-4">سعر الشراء</th>
                  <th className="py-3.5 px-4">سعر البيع فقط</th>
                  <th className="py-3.5 px-4">سعر البيع مع التبديل</th>
                  <th className="py-3.5 px-4">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {filtered.map((item) => {
                  const isLow = item.totalLitersStock <= 15;
                  const sizes = item.availableSizes && item.availableSizes.length > 0
                    ? item.availableSizes
                    : (item.viscosity ? [item.viscosity] : []);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900 text-sm">{item.name}</div>
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block mt-1">
                          {PRODUCT_CATEGORY_LABELS[item.category] || item.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {sizes.map((sz) => (
                            <span
                              key={sz}
                              className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded-md font-mono font-bold text-slate-800 text-[11px]"
                            >
                              {sz}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        <div>{item.cartonsCount || 0} كرتون × {item.piecesPerCarton || 1} قطع</div>
                        <div className="text-[11px] text-slate-500">حجم العبوة: {item.packageSizeLiters} لتر</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <div className={`font-black text-sm ${isLow ? 'text-red-600' : 'text-emerald-700'}`}>
                          {item.totalLitersStock} {item.category === 'filter' || item.category === 'flush' || item.category === 'anti_smoke' ? 'قطعة' : 'لتر'}
                        </div>
                        {item.totalPiecesStock && (
                          <div className="text-[11px] text-slate-500">({item.totalPiecesStock} عبوة)</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                        {(item.unitCost || 0).toLocaleString()} د.ع
                      </td>

                      <td className="py-3.5 px-4 font-mono font-black text-blue-700">
                        {(item.directSalePrice || item.salePrice || 0).toLocaleString()} د.ع
                      </td>

                      <td className="py-3.5 px-4 font-mono font-black text-amber-700">
                        {(item.serviceSalePrice || item.salePrice || 0).toLocaleString()} د.ع
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 rounded-lg bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-700 transition"
                            title="تعديل"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id!, item.name)}
                            className="p-2 rounded-lg bg-red-50 hover:bg-red-600 hover:text-white text-red-600 transition"
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
              const sizes = item.availableSizes && item.availableSizes.length > 0
                ? item.availableSizes
                : (item.viscosity ? [item.viscosity] : []);

              return (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {PRODUCT_CATEGORY_LABELS[item.category] || item.category}
                      </span>
                      <h3 className="font-black text-slate-900 text-sm mt-1">{item.name}</h3>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEditModal(item)} className="p-2 bg-slate-100 rounded-lg text-slate-700">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item.id!, item.name)} className="p-2 bg-red-50 rounded-lg text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Sizes */}
                  <div className="flex flex-wrap gap-1">
                    {sizes.map((sz) => (
                      <span key={sz} className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-xs">
                        {sz}
                      </span>
                    ))}
                  </div>

                  {/* Stock & Dual Prices */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">الرصيد الكلي:</span>
                      <strong className="font-mono text-emerald-700">{item.totalLitersStock} لتر</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">بيع فقط:</span>
                      <strong className="font-mono text-blue-700">{(item.directSalePrice || item.salePrice).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">مع التبديل:</span>
                      <strong className="font-mono text-amber-700">{(item.serviceSalePrice || item.salePrice).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </main>

      {/* Modal: Add / Edit Product with Carton/Piece/Liter Calculator & Dual Pricing */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" />
                <span>{editingId ? 'تعديل المنتج وحساب المخزون' : 'إضافة منتج جديد للمخزون'}</span>
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              
              {/* Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم المنتج / الماركة</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: دهن يورال (Eural) أو كاسترول"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">فئة المنتج</label>
                  <select
                    value={formData.category}
                    onChange={(e: any) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                  >
                    {Object.entries(PRODUCT_CATEGORY_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multi-Sizes Input */}
              <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200 space-y-1.5">
                <label className="block font-black text-amber-900">
                  القياسات / العيارات المتوفرة لنفس المنتج (افصل بينها بفاصلة ,)
                </label>
                <input
                  type="text"
                  value={formData.sizesInput}
                  onChange={(e) => setFormData({ ...formData, sizesInput: e.target.value })}
                  placeholder="مثال: 10W30, 10W40, 20W50, 5W30"
                  className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold focus:outline-none"
                />
                <p className="text-[11px] text-amber-700">
                  * يمكنك كتابة أكثر من قياس لمنتج واحد (مثل يورال 10W30, 10W40, 20W50) لتختار منها في شاشة الكاونتر.
                </p>
              </div>

              {/* Automatic Carton -> Piece -> Liter Calculator */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-1.5 font-black text-slate-800">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span>الحاسبة التلقائية للمخزون (بالكرتون والقطعة واللتر):</span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">عدد الكراتين</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.cartonsCount}
                      onChange={(e) =>
                        updateStockCalculations(
                          Number(e.target.value),
                          formData.piecesPerCarton,
                          formData.packageSizeLiters
                        )
                      }
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-black text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">كم قطعة بالكرتون؟</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.piecesPerCarton}
                      onChange={(e) =>
                        updateStockCalculations(
                          formData.cartonsCount,
                          Number(e.target.value),
                          formData.packageSizeLiters
                        )
                      }
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-black text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">حجم القطعة (كم لتر؟)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.packageSizeLiters}
                      onChange={(e) =>
                        updateStockCalculations(
                          formData.cartonsCount,
                          formData.piecesPerCarton,
                          Number(e.target.value)
                        )
                      }
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-black text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">إجمالي عدد القطع / العبوات</label>
                    <input
                      type="number"
                      value={formData.totalPiecesStock}
                      onChange={(e) => setFormData({ ...formData, totalPiecesStock: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-black text-blue-700"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-emerald-800 mb-1">الرصيد الكلي المحسوب (باللتر/القطعة)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.totalLitersStock}
                      onChange={(e) => setFormData({ ...formData, totalLitersStock: Number(e.target.value) })}
                      className="w-full bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-2 font-mono font-black text-emerald-800"
                    />
                  </div>
                </div>
              </div>

              {/* Dual Pricing Section */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-black text-slate-800 block">التسعير (سعر التكلفة / البيع المباشر / البيع مع الخدمة):</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">سعر الشراء (التكلفة)</label>
                    <input
                      type="number"
                      value={formData.unitCost}
                      onChange={(e) => setFormData({ ...formData, unitCost: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-blue-700 mb-1">سعر البيع فقط (بدون تبديل)</label>
                    <input
                      type="number"
                      required
                      value={formData.directSalePrice}
                      onChange={(e) => setFormData({ ...formData, directSalePrice: Number(e.target.value) })}
                      className="w-full bg-blue-50 border border-blue-300 rounded-xl px-3 py-2 font-mono font-black text-blue-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-amber-700 mb-1">سعر البيع مع التبديل والخدمة</label>
                    <input
                      type="number"
                      required
                      value={formData.serviceSalePrice}
                      onChange={(e) => setFormData({ ...formData, serviceSalePrice: Number(e.target.value) })}
                      className="w-full bg-amber-50 border border-amber-300 rounded-xl px-3 py-2 font-mono font-black text-amber-800"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl flex items-center justify-center gap-2 shadow-md"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{editingId ? 'حفظ التعديلات' : 'إضافة المنتج للمخزون'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
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
