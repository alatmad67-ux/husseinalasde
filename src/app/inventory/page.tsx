'use client';

import React, { useState, useEffect } from 'react';
import HeaderNav from '@/components/HeaderNav';
import { 
  getProductsList, 
  addProduct, 
  updateProduct, 
  deleteProduct 
} from '@/services/firestoreService';
import { ProductDoc } from '@/types/firestore';
import { 
  Droplet, 
  AlertTriangle, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  CheckCircle, 
  X, 
  Save, 
  Loader2,
  Package
} from 'lucide-react';

export default function FluidInventoryPage() {
  const [products, setProducts] = useState<ProductDoc[]>([
    { id: 'prod-1', name: 'Mobil 1 ESP 5W-30 (تخليقي بالكامل)', category: 'engine_oil', viscosity: '5W30', packageSizeLiters: 5, totalLitersStock: 48.5, unitCost: 9000, salePrice: 12000 },
    { id: 'prod-2', name: 'Castrol Magnatec 10W-40', category: 'engine_oil', viscosity: '10W40', packageSizeLiters: 4, totalLitersStock: 32.0, unitCost: 7000, salePrice: 9500 },
    { id: 'prod-3', name: 'Liqui Moly Molygen 5W-40', category: 'engine_oil', viscosity: '5W40', packageSizeLiters: 5, totalLitersStock: 14.5, unitCost: 10500, salePrice: 13500 },
    { id: 'prod-4', name: 'Toyota Genuine ATF WS (دهن گير)', category: 'gear_oil', viscosity: 'ATF WS', packageSizeLiters: 4, totalLitersStock: 20.0, unitCost: 11000, salePrice: 15000 },
    { id: 'prod-5', name: 'فلتر زيت أصلي تويوتا', category: 'filter', viscosity: '90915-YZZE2', packageSizeLiters: 1, totalLitersStock: 18, unitCost: 4500, salePrice: 7000 },
    { id: 'prod-6', name: 'ماء راديتر بريستون أصلي 50/50 أمريكي', category: 'coolant', viscosity: 'Prestone Red', packageSizeLiters: 4, totalLitersStock: 12.0, unitCost: 10000, salePrice: 14000 }
  ]);

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'engine_oil' as 'engine_oil' | 'filter' | 'coolant' | 'gear_oil',
    viscosity: '',
    packageSizeLiters: 4,
    totalLitersStock: 20,
    unitCost: 8000,
    salePrice: 12000
  });

  const loadData = async () => {
    try {
      const list = await getProductsList();
      if (list.length > 0) {
        setProducts(list);
      }
    } catch (err) {
      console.warn('Could not load products from Firestore, using default catalog:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      category: 'engine_oil',
      viscosity: '',
      packageSizeLiters: 4,
      totalLitersStock: 20,
      unitCost: 8000,
      salePrice: 12000
    });
    setModalOpen(true);
  };

  const openEditModal = (p: ProductDoc) => {
    setEditingId(p.id || null);
    setFormData({
      name: p.name,
      category: p.category,
      viscosity: p.viscosity || '',
      packageSizeLiters: p.packageSizeLiters,
      totalLitersStock: p.totalLitersStock,
      unitCost: p.unitCost,
      salePrice: p.salePrice
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        await updateProduct(editingId, {
          name: formData.name,
          category: formData.category,
          viscosity: formData.viscosity,
          packageSizeLiters: Number(formData.packageSizeLiters),
          totalLitersStock: Number(formData.totalLitersStock),
          unitCost: Number(formData.unitCost),
          salePrice: Number(formData.salePrice)
        });
        setProducts(prev => prev.map(p => p.id === editingId ? { ...p, ...formData } : p));
        setSuccessMsg('تم تعديل المنتج والمخزون بنجاح في Firestore!');
      } else {
        const res = await addProduct({
          name: formData.name,
          category: formData.category,
          viscosity: formData.viscosity,
          packageSizeLiters: Number(formData.packageSizeLiters),
          totalLitersStock: Number(formData.totalLitersStock),
          unitCost: Number(formData.unitCost),
          salePrice: Number(formData.salePrice)
        });
        setProducts(prev => [...prev, { id: res.id, ...formData }]);
        setSuccessMsg('تمت إضافة المنتج الجديد إلى المخزون في Firestore!');
      }
      setModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء حفظ المنتج في Firestore.');
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
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          (p.viscosity && p.viscosity.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-industrial-950">
      <HeaderNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Header Title & Top Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <Droplet className="w-6 h-6 text-brand-amber" />
              <span>إدارة مخزون السوائل والزيوت باللتر والقطع</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              متابعة دقيقة وتعديل كميات المخزون والأسعار وإضافة منتجات جديدة لمركز حسين الاسدي.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-brand-amber hover:bg-brand-amberHover text-industrial-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-amber-500/20 transition w-full md:w-auto justify-center"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>إضافة منتج جديد للمخزون</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="bg-brand-emerald/15 border border-brand-emerald/40 text-brand-emerald p-4 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <p className="font-bold text-sm">{successMsg}</p>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-lg">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم، اللزوجة، كود الفلتر..."
              className="w-full bg-industrial-950 border border-industrial-700 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-amber font-mono"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto bg-industrial-950 border border-industrial-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-amber"
          >
            <option value="all">كل الفئات</option>
            <option value="engine_oil">زيوت المحرك</option>
            <option value="gear_oil">زيوت القير والدفرنش</option>
            <option value="filter">فلاتر الزيت والهواء</option>
            <option value="coolant">ماء الراديتر والمبردات</option>
          </select>
        </div>

        {/* Responsive Inventory Table / Card Grid */}
        <div className="bg-industrial-900 border border-industrial-800 rounded-2xl overflow-hidden shadow-xl">
          
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-industrial-950 text-slate-400 border-b border-industrial-800">
                <tr>
                  <th className="py-3 px-4">اسم المنتج / الصنف</th>
                  <th className="py-3 px-4">الفئة</th>
                  <th className="py-3 px-4">اللزوجة / الكود</th>
                  <th className="py-3 px-4">العبوة الأصلية</th>
                  <th className="py-3 px-4">الرصيد الفعلي (باللتر أو القطعة)</th>
                  <th className="py-3 px-4">سعر المفرد</th>
                  <th className="py-3 px-4">إجراءات الإدارة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-800 text-slate-200">
                {filtered.map((item) => {
                  const isLow = item.totalLitersStock <= 15;
                  return (
                    <tr key={item.id} className="hover:bg-industrial-800/40 transition">
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        <Droplet className={`w-4 h-4 ${isLow ? 'text-brand-danger' : 'text-brand-amber'}`} />
                        <span>{item.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">
                        {item.category === 'engine_oil' ? 'زيت محرك' : item.category === 'filter' ? 'فلتر' : item.category === 'gear_oil' ? 'زيت قير' : 'مبردات'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-amber">
                        {item.viscosity || '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {item.packageSizeLiters} لتر
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black text-sm">
                        <span className={isLow ? 'text-brand-danger' : 'text-brand-emerald'}>
                          {item.totalLitersStock} {item.category === 'filter' ? 'قطعة' : 'لتر'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {item.salePrice.toLocaleString()} د.ع
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(item)}
                            title="تعديل المنتج أو المخزون"
                            className="p-1.5 rounded-lg bg-industrial-800 hover:bg-brand-amber hover:text-industrial-950 text-slate-300 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id!, item.name)}
                            title="حذف من المخزون"
                            className="p-1.5 rounded-lg bg-industrial-800 hover:bg-brand-danger hover:text-white text-slate-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (optimized for touch screens) */}
          <div className="md:hidden divide-y divide-industrial-800">
            {filtered.map((item) => {
              const isLow = item.totalLitersStock <= 15;
              return (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-brand-amber bg-brand-amber/10 px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                      <h3 className="font-bold text-white text-sm mt-1">{item.name}</h3>
                      {item.viscosity && (
                        <p className="text-xs text-brand-amber font-mono font-bold mt-0.5">{item.viscosity}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-2 rounded-lg bg-industrial-800 text-slate-300"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id!, item.name)}
                        className="p-2 rounded-lg bg-industrial-800 text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-industrial-950 p-2.5 rounded-xl border border-industrial-800 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">الرصيد المتاح:</span>
                      <strong className={`font-mono font-black ${isLow ? 'text-brand-danger' : 'text-brand-emerald'}`}>
                        {item.totalLitersStock} {item.category === 'filter' ? 'قطعة' : 'لتر'}
                      </strong>
                    </div>
                    <div className="text-left">
                      <span className="text-slate-400 block text-[10px]">السعر:</span>
                      <strong className="font-mono text-white">
                        {item.salePrice.toLocaleString()} د.ع
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </main>

      {/* Modal: Add / Edit Product */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-industrial-900 border border-industrial-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            
            <div className="flex justify-between items-center border-b border-industrial-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-brand-amber" />
                <span>{editingId ? 'تعديل بيانات المنتج والمخزون' : 'إضافة منتج جديد للمخزن'}</span>
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">اسم المنتج الكامل</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: Mobil 1 ESP 5W-30"
                  className="w-full bg-industrial-950 border border-industrial-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-amber"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">الفئة</label>
                  <select
                    value={formData.category}
                    onChange={(e: any) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-industrial-950 border border-industrial-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-amber"
                  >
                    <option value="engine_oil">زيت محرك</option>
                    <option value="gear_oil">زيت قير</option>
                    <option value="filter">فلتر</option>
                    <option value="coolant">ماء راديتر</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">اللزوجة أو كود القطعة</label>
                  <input
                    type="text"
                    value={formData.viscosity}
                    onChange={(e) => setFormData({ ...formData, viscosity: e.target.value })}
                    placeholder="5W30 أو 90915-YZZE2"
                    className="w-full bg-industrial-950 border border-industrial-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-amber font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">سعة العبوة الأصلية (لتر)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.packageSizeLiters}
                    onChange={(e) => setFormData({ ...formData, packageSizeLiters: Number(e.target.value) })}
                    className="w-full bg-industrial-950 border border-industrial-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-amber font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">الرصيد الكلي المتاح (لتر/قطع)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.totalLitersStock}
                    onChange={(e) => setFormData({ ...formData, totalLitersStock: Number(e.target.value) })}
                    className="w-full bg-industrial-950 border border-industrial-700 rounded-xl px-3.5 py-2.5 text-brand-emerald font-bold focus:outline-none focus:border-brand-amber font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">سعر الشراء / التكلفة (د.ع)</label>
                  <input
                    type="number"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: Number(e.target.value) })}
                    className="w-full bg-industrial-950 border border-industrial-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-brand-amber font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">سعر البيع للزبون (د.ع)</label>
                  <input
                    type="number"
                    required
                    value={formData.salePrice}
                    onChange={(e) => setFormData({ ...formData, salePrice: Number(e.target.value) })}
                    className="w-full bg-industrial-950 border border-industrial-700 rounded-xl px-3.5 py-2.5 text-brand-amber font-bold focus:outline-none focus:border-brand-amber font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-brand-amber hover:bg-brand-amberHover disabled:opacity-50 text-industrial-950 font-black rounded-xl flex items-center justify-center gap-2 transition"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{editingId ? 'حفظ التعديلات' : 'إضافة إلى المخزون'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
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
