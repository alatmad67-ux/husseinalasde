'use client';

import React, { useState, useEffect } from 'react';
import HeaderNav from '@/components/HeaderNav';
import { 
  getProductsList, 
  recordDirectSale, 
  searchCustomerOrVehicle 
} from '@/services/firestoreService';
import { ProductDoc, PRODUCT_CATEGORY_LABELS } from '@/types/firestore';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  CheckCircle, 
  DollarSign, 
  Package,
  AlertTriangle,
  Loader2,
  Search
} from 'lucide-react';

interface CartItem {
  key: string;
  id: string;
  name: string;
  selectedSize: string;
  price: number;
  qty: number;
}

export default function DirectSalesPage() {
  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [selectedSizesMap, setSelectedSizesMap] = useState<Record<string, string>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [foundCustomerId, setFoundCustomerId] = useState<string | null>(null);
  const [foundCustomerName, setFoundCustomerName] = useState<string>('');
  
  const [submitting, setSubmitting] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const liveList = await getProductsList();
        if (liveList.length > 0) {
          setProducts(liveList);
          const initSizes: Record<string, string> = {};
          liveList.forEach(p => {
            if (p.id) {
              initSizes[p.id] = p.availableSizes?.[0] || p.viscosity || '';
            }
          });
          setSelectedSizesMap(initSizes);
        }
      } catch (err) {
        console.warn('Could not load products from Firestore:', err);
      }
    }
    fetchProducts();
  }, []);

  const handlePhoneBlur = async () => {
    if (!customerPhone.trim()) {
      setFoundCustomerId(null);
      setFoundCustomerName('');
      return;
    }
    try {
      const res = await searchCustomerOrVehicle(customerPhone.trim());
      if (res?.customer) {
        setFoundCustomerId(res.customer.id || null);
        setFoundCustomerName(res.customer.fullName);
      } else {
        setFoundCustomerId(null);
        setFoundCustomerName('');
      }
    } catch (e) {
      // ignore
    }
  };

  const addToCart = (product: ProductDoc) => {
    const chosenSize = selectedSizesMap[product.id!] || product.viscosity || '';
    const itemKey = `${product.id}-${chosenSize}`;
    // Use directSalePrice (سعر البيع فقط بدون خدمات)
    const price = product.directSalePrice || product.salePrice || 10000;

    setCart((prev) => {
      const existing = prev.find((item) => item.key === itemKey);
      if (existing) {
        return prev.map((item) =>
          item.key === itemKey ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [
        ...prev,
        {
          key: itemKey,
          id: product.id!,
          name: product.name,
          selectedSize: chosenSize,
          price,
          qty: 1
        }
      ];
    });
  };

  const removeFromCart = (key: string) => {
    setCart((prev) => prev.filter((item) => item.key !== key));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await recordDirectSale({
        customerId: foundCustomerId || undefined,
        items: cart.map((i) => ({
          productId: i.id,
          productName: `${i.name} (${i.selectedSize})`,
          selectedSize: i.selectedSize,
          quantity: i.qty,
          unitPrice: i.price
        })),
        totalAmount,
        paidAmount: totalAmount,
        debtAmount: 0
      });

      setCheckoutSuccess(true);
      setCart([]);
      setCustomerPhone('');
      setFoundCustomerId(null);
      setFoundCustomerName('');
      setTimeout(() => setCheckoutSuccess(false), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'فشلت معالجة عملية البيع المباشر.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.availableSizes || []).join(' ').toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <HeaderNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-5">
        
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-amber-600" />
              <span>نظام البيع المباشر السريع (بسعر البيع فقط بدون خدمات)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              بيع مباشر للعبوات، الفلاتر، المحسنات، والفلاشات للزبائن العابرين.
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col sm:flex-row gap-2.5 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن منتج أو قياس..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs font-bold text-slate-800"
          >
            <option value="all">جميع الأقسام</option>
            {Object.entries(PRODUCT_CATEGORY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <p className="font-bold text-sm">{errorMsg}</p>
          </div>
        )}

        {checkoutSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="font-bold text-sm">تم إتمام البيع المباشر وحفظ الفاتورة وخصم المخزون بنجاح!</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Products Grid */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredProducts.map((prod) => {
                const sizes = prod.availableSizes && prod.availableSizes.length > 0
                  ? prod.availableSizes
                  : (prod.viscosity ? [prod.viscosity] : []);
                const directPrice = prod.directSalePrice || prod.salePrice || 10000;

                return (
                  <div
                    key={prod.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-300 shadow-sm transition"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                          {PRODUCT_CATEGORY_LABELS[prod.category] || prod.category}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          المتوفر: <strong className="text-slate-900">{prod.totalLitersStock}</strong>
                        </span>
                      </div>

                      <h3 className="font-black text-slate-900 text-sm">{prod.name}</h3>

                      {/* Size Selector per Product Card */}
                      {sizes.length > 0 && (
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">اختر السايز / العيار:</label>
                          <select
                            value={selectedSizesMap[prod.id!] || sizes[0]}
                            onChange={(e) =>
                              setSelectedSizesMap({ ...selectedSizesMap, [prod.id!]: e.target.value })
                            }
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900"
                          >
                            {sizes.map((sz) => (
                              <option key={sz} value={sz}>{sz}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">سعر البيع فقط:</span>
                        <span className="font-mono font-black text-blue-700 text-base">
                          {directPrice.toLocaleString()} د.ع
                        </span>
                      </div>

                      <button
                        onClick={() => addToCart(prod)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>إضافة للسلة</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Invoice Cart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 h-fit">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Package className="w-5 h-5 text-amber-600" />
              <span>سلة الفاتورة السريعة</span>
            </h2>

            {/* Optional Customer Link */}
            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-600 block font-bold">ربط بالزبون (اختياري)</span>
              <input
                type="text"
                placeholder="رقم هاتف الزبون..."
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                onBlur={handlePhoneBlur}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500"
              />
              {foundCustomerName && (
                <div className="text-[11px] text-emerald-700 font-bold">
                  ✓ الزبون: {foundCustomerName}
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center font-medium">
                  السلة فارغة، اختر المواد لإضافتها للفاتورة.
                </p>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.key}
                    className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs"
                  >
                    <div>
                      <p className="font-black text-slate-900">{item.name}</p>
                      <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        العيار: {item.selectedSize || 'قياسي'}
                      </span>
                      <p className="text-slate-500 font-mono mt-0.5">
                        {item.qty} × {item.price.toLocaleString()} د.ع
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-900">
                        {(item.price * item.qty).toLocaleString()} د.ع
                      </span>
                      <button
                        onClick={() => removeFromCart(item.key)}
                        className="text-slate-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total and Checkout */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-bold">المجموع الكلي:</span>
                <span className="font-mono font-black text-xl text-emerald-700">
                  {totalAmount.toLocaleString()} د.ع
                </span>
              </div>

              <button
                type="button"
                disabled={cart.length === 0 || submitting}
                onClick={handleCheckout}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black rounded-xl flex items-center justify-center gap-2 transition text-sm shadow-md shadow-amber-500/20"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <DollarSign className="w-5 h-5" />
                )}
                <span>قبض نقدي وخصم من المخزون</span>
              </button>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
