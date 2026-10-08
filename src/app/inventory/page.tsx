'use client';

import React, { useState } from 'react';
import HeaderNav from '@/components/HeaderNav';
import { MOCK_PRODUCTS, Product } from '@/lib/mockData';
import { 
  Droplet, 
  AlertTriangle, 
  Plus, 
  Minus, 
  Filter, 
  Search, 
  Layers
} from 'lucide-react';

export default function FluidInventoryPage() {
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = products.filter((p) => {
    const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          (p.viscosity && p.viscosity.toLowerCase().includes(search.toLowerCase())) ||
                          (p.partCode && p.partCode.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-industrial-950">
      <HeaderNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Title and Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <Droplet className="w-6 h-6 text-brand-amber" />
              <span>إدارة مخزون السوائل والزيوت باللتر والقطع</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              متابعة دقيقة للبراميل المفتوحة، التجزئة باللتر، والعبوات المغلقة دون هدر.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم، اللزوجة، كود الفلتر..."
                className="w-full bg-industrial-900 border border-industrial-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-brand-amber"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-industrial-900 border border-industrial-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-amber"
            >
              <option value="all">كل الفئات</option>
              <option value="engine_oil">زيوت المحرك</option>
              <option value="gear_oil">زيوت القير والدفرنش</option>
              <option value="filter">فلاتر الزيت والهواء</option>
              <option value="coolant">ماء الراديتر والمبردات</option>
            </select>
          </div>
        </div>

        {/* Low Stock Warning Banner */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-brand-amber" />
            <div className="text-xs">
              <span className="font-bold text-amber-200">تنبيه المخزون الحرج:</span>
              <span className="text-amber-300 mr-2">
                زيت Liqui Moly 5W-40 انخفض إلى أقل من 15 لتر. يرجى طلب برميل جديد من المورد.
              </span>
            </div>
          </div>
        </div>

        {/* Inventory Data Table */}
        <div className="bg-industrial-900 border border-industrial-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-industrial-950 text-slate-400 border-b border-industrial-800">
                <tr>
                  <th className="py-3 px-4">اسم المنتج / الصنف</th>
                  <th className="py-3 px-4">الفئة</th>
                  <th className="py-3 px-4">اللزوجة / كود القطعة</th>
                  <th className="py-3 px-4">العبوة الأصلية</th>
                  <th className="py-3 px-4">الرصيد الفعلي (باللتر أو القطعة)</th>
                  <th className="py-3 px-4">سعر البيع</th>
                  <th className="py-3 px-4">حالة المخزون</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-800 text-slate-200">
                {filtered.map((item) => {
                  const isLow = item.totalLitersInStock <= 15;
                  return (
                    <tr key={item.id} className="hover:bg-industrial-800/40 transition">
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        <Droplet className={`w-4 h-4 ${isLow ? 'text-brand-danger' : 'text-brand-amber'}`} />
                        <span>{item.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">
                        {item.category === 'engine_oil' ? 'زيت محرك' : item.category === 'filter' ? 'فلتر' : 'سوائل'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-amber">
                        {item.viscosity || item.partCode || '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {item.packageSizeLiters} لتر
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black text-sm">
                        <span className={isLow ? 'text-brand-danger' : 'text-brand-emerald'}>
                          {item.totalLitersInStock} {item.category === 'filter' ? 'قطعة' : 'لتر'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {item.unitPrice.toLocaleString()} د.ع
                      </td>
                      <td className="py-3.5 px-4">
                        {isLow ? (
                          <span className="bg-red-500/10 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-full text-[11px] font-bold">
                            منخفض جداً
                          </span>
                        ) : (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[11px] font-bold">
                            متوفر وممتاز
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
