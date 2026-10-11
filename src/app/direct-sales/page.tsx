'use client';

import React, { useState, useEffect } from 'react';
import HeaderNav from '@/components/HeaderNav';
import ReceiptModal, { ReceiptData } from '@/components/ReceiptModal';
import { 
  getProductsList, 
  recordDirectSale, 
  searchCustomerOrVehicle,
  formatExactDateTime
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
  unitLabel: string;
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

  // Receipt Modal
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

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
    const price = product.directSalePrice || product.salePrice || 10000;
    const isLiquid = product.category === 'engine_oil' || product.category === 'gear_oil' || product.category === 'coolant';
    const unitLabel = isLiquid ? 'لتر' : 'قطعة';

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
          unitLabel,
          price,
          qty: 1
        }
      ];
    });
  };

  const updateCartItemPrice = (key: string, newPrice: number) => {
    setCart(prev => prev.map(item => item.key === key ? { ...item, price: newPrice } : item));
  };

  const updateCartItemQty = (key: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(key);
      return;
    }
    setCart(prev => prev.map(item => item.key === key ? { ...item, qty: newQty } : item));
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
      const res = await recordDirectSale({
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

      setReceiptData({
        receiptNumber: `SALE-${res.saleId?.slice(0, 6).toUpperCase() || Date.now().toString().slice(-5)}`,
        dateTimeStr: formatExactDateTime(new Date()),
        customerName: foundCustomerName || 'زبون بيع مباشر',
        customerPhone: customerPhone || '',
        vehicleModel: 'بيع مباشر (بدون تبديل)',
        plateNumber: '—',
        currentOdometer: 0,
        nextOdometer: 0,
        items: cart.map(i => ({
          label: `${i.name} (${i.selectedSize})`,
          qty: `${i.qty} ${i.unitLabel}`,
          price: i.price * i.qty
        })),
        totalPrice: totalAmount,
        paidAmount: totalAmount,
        debtAmount: 0
      });
      setReceiptOpen(true);

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
        
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 flex items-center gap-2.5">
              <ShoppingCart className="w-7 h-7 text-amber-600" />
              <span>نظام البيع المباشر السريع (بسعر البيع فقط بدون خدمات)</span>
            </h1>
            <p className="text-sm text-slate-600 mt-1 font-bold">
              بيع مباشر للزيوت، الفلاتر، المحسنات، والفلاشات مع إمكانية تعديل السعر وإصدار وصل كاشير أو واتساب.
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-3.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن منتج أو قياس..."
              className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl pr-12 pl-4 py-3 text-base text-slate-950 font-black focus:outline-none focus:border-amber-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3 text-base font-black text-slate-900"
          >
            <option value="all">جميع الأقسام</option>
            {Object.entries(PRODUCT_CATEGORY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border-2 border-red-300 text-red-800 p-4 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 flex-shrink-0 text-red-600" />
            <p className="font-black text-base">{errorMsg}</p>
          </div>
        )}

        {checkoutSuccess && (
          <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-900 p-4 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
            <p className="font-black text-base">تم إتمام البيع المباشر وحفظ الفاتورة وخصم المخزون بنجاح!</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Products Grid */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProducts.map((prod) => {
                const sizes = prod.availableSizes && prod.availableSizes.length > 0
                  ? prod.availableSizes
                  : (prod.viscosity ? [prod.viscosity] : []);
                const directPrice = prod.directSalePrice || prod.salePrice || 10000;
                const isLiquid = prod.category === 'engine_oil' || prod.category === 'gear_oil' || prod.category === 'coolant';
                const unitLabel = isLiquid ? 'لتر' : 'قطعة';

                return (
                  <div
                    key={prod.id}
                    className="bg-white border-2 border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-400 shadow-sm transition"
                  >
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-300">
                          {PRODUCT_CATEGORY_LABELS[prod.category] || prod.category}
                        </span>
                        <span className="text-sm text-slate-600 font-mono font-bold">
                          المتوفر: <strong className="text-slate-950 font-black">{prod.totalLitersStock} {unitLabel}</strong>
                        </span>
                      </div>

                      <h3 className="font-black text-slate-950 text-base">{prod.name}</h3>

                      {/* Size Selector per Product Card */}
                      {sizes.length > 0 && (
                        <div>
                          <label className="text-xs font-black text-slate-600 block mb-1">اختر السايز / العيار:</label>
                          <select
                            value={selectedSizesMap[prod.id!] || sizes[0]}
                            onChange={(e) =>
                              setSelectedSizesMap({ ...selectedSizesMap, [prod.id!]: e.target.value })
                            }
                            className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-black text-slate-950"
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
                        <span className="text-xs text-slate-500 block font-black">سعر البيع ({unitLabel}):</span>
                        <span className="font-mono font-black text-blue-700 text-lg">
                          {directPrice.toLocaleString()} د.ع
                        </span>
                      </div>

                      <button
                        onClick={() => addToCart(prod)}
                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-black transition flex items-center gap-1.5 shadow-sm"
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
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 h-fit">
            <h2 className="text-lg font-black text-slate-950 flex items-center gap-2 border-b-2 border-slate-100 pb-3">
              <Package className="w-6 h-6 text-amber-600" />
              <span>سلة الفاتورة السريعة</span>
            </h2>

            {/* Optional Customer Link */}
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-700 block font-black">رقم واتساب الزبون لإرسال الوصل (اختياري)</span>
              <input
                type="text"
                placeholder="0780..."
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                onBlur={handlePhoneBlur}
                className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-950 font-mono font-black focus:outline-none focus:border-amber-500"
              />
              {foundCustomerName && (
                <div className="text-xs text-emerald-800 font-black">
                  ✓ الزبون: {foundCustomerName}
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center font-bold">
                  السلة فارغة، اختر المواد لإضافتها للفاتورة.
                </p>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.key}
                    className="bg-slate-50 p-3 rounded-xl border-2 border-slate-200 space-y-2 text-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-black text-slate-950">{item.name}</p>
                        <span className="text-xs font-mono font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                          {item.selectedSize || 'قياسي'} ({item.unitLabel})
                        </span>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.key)}
                        className="text-slate-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[11px] font-black text-slate-600 block">الكمية ({item.unitLabel})</label>
                        <input
                          type="number"
                          step={item.unitLabel === 'لتر' ? '0.5' : '1'}
                          min={item.unitLabel === 'لتر' ? '0.5' : '1'}
                          value={item.qty}
                          onChange={(e) => updateCartItemQty(item.key, Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-black text-slate-950"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-black text-blue-700 block">السعر (قابل للتعديل)</label>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateCartItemPrice(item.key, Number(e.target.value))}
                          className="w-full bg-blue-50 border border-blue-300 rounded-lg px-2 py-1 font-mono font-black text-blue-900"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total and Checkout */}
            <div className="pt-3 border-t-2 border-slate-100 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-800 font-black text-base">المجموع الكلي:</span>
                <span className="font-mono font-black text-2xl text-emerald-700">
                  {totalAmount.toLocaleString()} د.ع
                </span>
              </div>

              <button
                type="button"
                disabled={cart.length === 0 || submitting}
                onClick={handleCheckout}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black rounded-xl flex items-center justify-center gap-2 transition text-base shadow-md shadow-amber-500/20"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <DollarSign className="w-5 h-5" />
                )}
                <span>قبض نقدي وإصدار وصل كاشير / واتساب</span>
              </button>
            </div>

          </div>

        </div>

      </main>

      <ReceiptModal
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        data={receiptData}
      />
    </div>
  );
}
