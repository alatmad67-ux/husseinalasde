'use client';

import React, { useState, useEffect } from 'react';
import HeaderNav from '@/components/HeaderNav';
import { 
  getProductsList, 
  recordDirectSale, 
  searchCustomerOrVehicle 
} from '@/services/firestoreService';
import { ProductDoc } from '@/types/firestore';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  CheckCircle, 
  DollarSign, 
  User, 
  Package,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export default function DirectSalesPage() {
  const [products, setProducts] = useState<ProductDoc[]>([
    { id: 'prod-1', name: 'Mobil 1 ESP 5W-30 (تخليقي بالكامل)', category: 'engine_oil', packageSizeLiters: 5, totalLitersStock: 48.5, unitCost: 9000, salePrice: 12000 },
    { id: 'prod-2', name: 'Castrol Magnatec 10W-40', category: 'engine_oil', packageSizeLiters: 4, totalLitersStock: 32.0, unitCost: 7000, salePrice: 9500 },
    { id: 'prod-3', name: 'Toyota Genuine ATF WS (دهن گير)', category: 'gear_oil', packageSizeLiters: 4, totalLitersStock: 20.0, unitCost: 11000, salePrice: 15000 },
    { id: 'prod-4', name: 'ماء راديتر بريستون أصلي 50/50 أمريكي', category: 'coolant', packageSizeLiters: 4, totalLitersStock: 12.0, unitCost: 10000, salePrice: 14000 },
    { id: 'prod-5', name: 'فلتر زيت أصلي تويوتا', category: 'filter', packageSizeLiters: 1, totalLitersStock: 18, unitCost: 4500, salePrice: 7000 }
  ]);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [foundCustomerId, setFoundCustomerId] = useState<string | null>(null);
  const [foundCustomerName, setFoundCustomerName] = useState<string>('');
  
  const [submitting, setSubmitting] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch live products from Firestore
  useEffect(() => {
    async function fetchProducts() {
      try {
        const liveList = await getProductsList();
        if (liveList.length > 0) {
          setProducts(liveList);
        }
      } catch (err) {
        console.warn('Could not load products from Firestore, using default catalog:', err);
      }
    }
    fetchProducts();
  }, []);

  // Quick lookup customer by phone
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
      // ignore silent search error
    }
  };

  const addToCart = (product: ProductDoc) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [
        ...prev,
        { id: product.id!, name: product.name, price: product.salePrice, qty: 1 }
      ];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
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
          productName: i.name,
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

  return (
    <div className="min-h-screen flex flex-col bg-industrial-950">
      <HeaderNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-brand-amber" />
              <span>نظام البيع المباشر السريع (Firestore Direct Sales)</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              بيع مباشر للزبائن العابرين دون الحاجة لبيانات المركبة أو عداد المسافة، مع خصم المخزون فورياً.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-brand-danger/15 border border-brand-danger/40 text-brand-danger p-4 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            <p className="font-bold text-sm">{errorMsg}</p>
          </div>
        )}

        {checkoutSuccess && (
          <div className="bg-brand-emerald/15 border border-brand-emerald/40 text-brand-emerald p-4 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-6 h-6" />
            <div>
              <p className="font-bold">تم إتمام عملية البيع المباشر بنجاح في Firestore!</p>
              <p className="text-xs text-emerald-300">تم خصم الكميات تلقائياً وتحديث كولكشن direct_sales.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Products Grid */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-industrial-900 border border-industrial-800 rounded-2xl p-4 flex flex-col justify-between hover:border-industrial-700 transition"
                >
                  <div>
                    <span className="text-[11px] font-bold text-brand-amber uppercase tracking-wider bg-brand-amber/10 px-2 py-0.5 rounded">
                      {prod.category}
                    </span>
                    <h3 className="font-bold text-slate-100 text-sm mt-2">{prod.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      المتوفر بالمخزن: <strong className="text-slate-200 font-mono">{prod.totalLitersStock}</strong>
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-industrial-800 flex items-center justify-between">
                    <span className="font-mono font-black text-brand-emerald text-base">
                      {prod.salePrice.toLocaleString()} د.ع
                    </span>
                    <button
                      onClick={() => addToCart(prod)}
                      className="px-3.5 py-1.5 bg-industrial-800 hover:bg-brand-amber hover:text-industrial-950 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة للسلة</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Invoice Cart */}
          <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-5 shadow-xl space-y-4 h-fit">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-industrial-800 pb-3">
              <Package className="w-5 h-5 text-brand-amber" />
              <span>سلة الفاتورة السريعة</span>
            </h2>

            {/* Optional Customer Link */}
            <div className="space-y-2 bg-industrial-950 p-3 rounded-xl border border-industrial-800">
              <span className="text-xs text-slate-400 block font-semibold">ربط بالزبون (اختياري)</span>
              <input
                type="text"
                placeholder="رقم الهاتف للبحث في Firestore..."
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                onBlur={handlePhoneBlur}
                className="w-full bg-industrial-900 border border-industrial-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-amber font-mono"
              />
              {foundCustomerName && (
                <div className="text-[11px] text-brand-emerald font-bold">
                  ✓ الزبون: {foundCustomerName}
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">السلة فارغة، اختر المواد لإضافتها للفاتورة.</p>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center bg-industrial-950 p-2.5 rounded-xl border border-industrial-800 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-200">{item.name}</p>
                      <p className="text-slate-400 font-mono mt-0.5">
                        {item.qty} × {item.price.toLocaleString()} د.ع
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-brand-amber">
                        {(item.price * item.qty).toLocaleString()} د.ع
                      </span>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-slate-500 hover:text-brand-danger p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total and Checkout */}
            <div className="pt-3 border-t border-industrial-800 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-bold">المجموع الكلي:</span>
                <span className="font-mono font-black text-xl text-brand-emerald">
                  {totalAmount.toLocaleString()} د.ع
                </span>
              </div>

              <button
                type="button"
                disabled={cart.length === 0 || submitting}
                onClick={handleCheckout}
                className="w-full py-3.5 bg-brand-amber hover:bg-brand-amberHover disabled:opacity-50 text-industrial-950 font-black rounded-xl flex items-center justify-center gap-2 transition text-sm shadow-lg shadow-amber-500/10"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <DollarSign className="w-5 h-5" />
                )}
                <span>قبض نقدي وخصم المخزون (Firestore)</span>
              </button>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
