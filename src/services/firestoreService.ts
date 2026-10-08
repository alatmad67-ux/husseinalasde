import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  runTransaction,
  serverTimestamp,
  increment,
  addDoc,
  updateDoc,
  setDoc,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  CustomerDoc,
  VehicleDoc,
  ProductDoc,
  ServiceVisitDoc,
  DirectSaleDoc,
  DebtPaymentDoc
} from '@/types/firestore';

// ==============================================================================
// 1. SEARCH CUSTOMER OR VEHICLE
// Performs fast lookup across customers (by phone / name) and vehicles (by plate)
// ==============================================================================
export async function searchCustomerOrVehicle(queryStr: string) {
  const cleanQuery = queryStr.trim();
  if (!cleanQuery) return null;

  try {
    // 1. Try querying customers by exact phone number
    const customersRef = collection(db, 'customers');
    const phoneQ = query(customersRef, where('phoneNumber', '==', cleanQuery), limit(1));
    const phoneSnap = await getDocs(phoneQ);

    if (!phoneSnap.empty) {
      const customerDoc = phoneSnap.docs[0];
      const customerData = { id: customerDoc.id, ...customerDoc.data() } as CustomerDoc;

      // Find primary vehicle for this customer
      const vehiclesRef = collection(db, 'vehicles');
      const vehQ = query(vehiclesRef, where('customerId', '==', customerDoc.id), limit(1));
      const vehSnap = await getDocs(vehQ);
      const vehicleData = !vehSnap.empty
        ? ({ id: vehSnap.docs[0].id, ...vehSnap.docs[0].data() } as VehicleDoc)
        : null;

      return { customer: customerData, vehicle: vehicleData };
    }

    // 2. Try querying vehicles by plate number
    const vehiclesRef = collection(db, 'vehicles');
    const plateQ = query(vehiclesRef, where('plateNumber', '==', cleanQuery), limit(1));
    const plateSnap = await getDocs(plateQ);

    if (!plateSnap.empty) {
      const vehDoc = plateSnap.docs[0];
      const vehicleData = { id: vehDoc.id, ...vehDoc.data() } as VehicleDoc;

      // Fetch customer
      const customerSnap = await getDoc(doc(db, 'customers', vehicleData.customerId));
      const customerData = customerSnap.exists()
        ? ({ id: customerSnap.id, ...customerSnap.data() } as CustomerDoc)
        : null;

      return { customer: customerData, vehicle: vehicleData };
    }

    // 3. Fallback: Query customer by fullName prefix
    const nameQ = query(
      customersRef,
      where('fullName', '>=', cleanQuery),
      where('fullName', '<=', cleanQuery + '\uf8ff'),
      limit(1)
    );
    const nameSnap = await getDocs(nameQ);

    if (!nameSnap.empty) {
      const customerDoc = nameSnap.docs[0];
      const customerData = { id: customerDoc.id, ...customerDoc.data() } as CustomerDoc;

      const vehQ = query(vehiclesRef, where('customerId', '==', customerDoc.id), limit(1));
      const vehSnap = await getDocs(vehQ);
      const vehicleData = !vehSnap.empty
        ? ({ id: vehSnap.docs[0].id, ...vehSnap.docs[0].data() } as VehicleDoc)
        : null;

      return { customer: customerData, vehicle: vehicleData };
    }

    return null;
  } catch (error) {
    console.error('Error in searchCustomerOrVehicle:', error);
    throw error;
  }
}

// ==============================================================================
// 2. RECORD SERVICE VISIT (Atomic Transaction)
// - Deducts fractional oil liters from products.totalLitersStock
// - Records service_visits doc
// - Updates vehicle last/next odometer and lastServiceDate
// - Increments customer totalDebt if debtAmount > 0
// - Increments customer loyaltyPoints (+10)
// ==============================================================================
export async function recordServiceVisit(visitData: Omit<ServiceVisitDoc, 'id' | 'visitDate'>) {
  const {
    vehicleId,
    customerId,
    currentOdometer,
    nextOdometer,
    oilProductId,
    oilName,
    viscosity,
    oilLitersUsed,
    filterCode,
    gearOilDetails,
    technicalNotes,
    totalPrice,
    paidAmount,
    debtAmount
  } = visitData;

  return await runTransaction(db, async (transaction) => {
    let productRef = null;
    let currentStock = 0;

    // 1. Read product stock if oilProductId is provided
    if (oilProductId) {
      productRef = doc(db, 'products', oilProductId);
      const productSnap = await transaction.get(productRef);

      if (!productSnap.exists()) {
        throw new Error('المنتج المحدد غير موجود في قاعدة البيانات');
      }

      const pData = productSnap.data() as any;
      currentStock = Number(pData?.totalLitersStock || 0);
      if (currentStock < oilLitersUsed) {
        throw new Error(
          `رصيد المخزون غير كافٍ. المتاح حالياً (${currentStock} لتر) بينما المطلوب (${oilLitersUsed} لتر).`
        );
      }
    }

    // 2. Read Customer and Vehicle
    const customerRef = doc(db, 'customers', customerId);
    const customerSnap = await transaction.get(customerRef);
    if (!customerSnap.exists()) {
      throw new Error('ملف الزبون غير موجود');
    }

    const vehicleRef = doc(db, 'vehicles', vehicleId);
    const vehicleSnap = await transaction.get(vehicleRef);
    if (!vehicleSnap.exists()) {
      throw new Error('ملف المركبة غير موجود');
    }

    // 3. Write: Deduct accurate fractional stock
    if (productRef) {
      const newStock = Number((currentStock - oilLitersUsed).toFixed(2));
      transaction.update(productRef, {
        totalLitersStock: newStock
      });
    }

    // 4. Write: Create new service_visits entry
    const newVisitRef = doc(collection(db, 'service_visits'));
    transaction.set(newVisitRef, {
      vehicleId,
      customerId,
      visitDate: serverTimestamp(),
      currentOdometer,
      nextOdometer,
      oilProductId: oilProductId || null,
      oilName,
      viscosity: viscosity || '',
      oilLitersUsed,
      filterCode: filterCode || '',
      gearOilDetails: gearOilDetails || '',
      technicalNotes: technicalNotes || '',
      totalPrice,
      paidAmount,
      debtAmount
    });

    // 5. Write: Update Vehicle odometer & service timestamp
    transaction.update(vehicleRef, {
      lastOdometer: currentOdometer,
      nextOdometer: nextOdometer,
      lastServiceDate: serverTimestamp(),
      ...(viscosity ? { preferredOil: viscosity } : {}),
      ...(filterCode ? { preferredFilter: filterCode } : {})
    });

    // 6. Write: Update Customer Debt & Loyalty (+10 points per oil change)
    const customerData = customerSnap.data() as any;
    const currentCustomerDebt = Number(customerData?.totalDebt || 0);
    const currentLoyalty = Number(customerData?.loyaltyPoints || 0);

    transaction.update(customerRef, {
      totalDebt: currentCustomerDebt + (debtAmount > 0 ? debtAmount : 0),
      loyaltyPoints: currentLoyalty + 10
    });

    return {
      success: true,
      visitId: newVisitRef.id
    };
  });
}

// ==============================================================================
// 3. RECORD DIRECT SALE (Atomic Transaction)
// - Deducts stock for each item in the basket
// - Records direct_sales doc
// - Increments debt on customer document if debtAmount > 0 and customerId present
// ==============================================================================
export async function recordDirectSale(saleData: Omit<DirectSaleDoc, 'id' | 'saleDate'>) {
  const { customerId, items, totalAmount, paidAmount, debtAmount } = saleData;

  return await runTransaction(db, async (transaction) => {
    // 1. Validate and fetch all products in cart
    const productUpdates: { ref: any; newStock: number }[] = [];

    for (const item of items) {
      const pRef = doc(db, 'products', item.productId);
      const pSnap = await transaction.get(pRef);

      if (!pSnap.exists()) {
        throw new Error(`المنتج (${item.productName}) غير موجود`);
      }

      const pData = pSnap.data() as any;
      const available = Number(pData?.totalLitersStock || 0);
      if (available < item.quantity) {
        throw new Error(`الكمية غير متوفرة في المخزن للمنتج (${item.productName}). المتاح: ${available}`);
      }

      productUpdates.push({
        ref: pRef,
        newStock: Number((available - item.quantity).toFixed(2))
      });
    }

    // 2. Fetch customer doc if debt is added
    let customerRef = null;
    let customerDebt = 0;
    if (customerId && debtAmount > 0) {
      customerRef = doc(db, 'customers', customerId);
      const cSnap = await transaction.get(customerRef);
      if (cSnap.exists()) {
        const cData = cSnap.data() as any;
        customerDebt = Number(cData?.totalDebt || 0);
      }
    }

    // 3. Apply product stock deductions
    for (const update of productUpdates) {
      transaction.update(update.ref, { totalLitersStock: update.newStock });
    }

    // 4. Record direct sale document
    const saleRef = doc(collection(db, 'direct_sales'));
    transaction.set(saleRef, {
      customerId: customerId || null,
      saleDate: serverTimestamp(),
      items,
      totalAmount,
      paidAmount,
      debtAmount
    });

    // 5. Update customer debt if applicable
    if (customerRef && debtAmount > 0) {
      transaction.update(customerRef, {
        totalDebt: customerDebt + debtAmount
      });
    }

    return { success: true, saleId: saleRef.id };
  });
}

// ==============================================================================
// 4. GET CUSTOMER DOSSIER
// - Customer profile & debt
// - Registered vehicles
// - Complete service history ordered by visitDate desc
// ==============================================================================
export async function getCustomerDossier(customerId: string) {
  try {
    const customerSnap = await getDoc(doc(db, 'customers', customerId));
    if (!customerSnap.exists()) {
      return null;
    }

    const customer = { id: customerSnap.id, ...customerSnap.data() } as CustomerDoc;

    // Fetch Vehicles
    const vehQuery = query(collection(db, 'vehicles'), where('customerId', '==', customerId));
    const vehSnap = await getDocs(vehQuery);
    const vehicles: VehicleDoc[] = vehSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as VehicleDoc)
    );

    // Fetch Service Visits history (ordered by visitDate descending)
    const visitsQuery = query(
      collection(db, 'service_visits'),
      where('customerId', '==', customerId),
      orderBy('visitDate', 'desc')
    );
    const visitsSnap = await getDocs(visitsQuery);
    const history: ServiceVisitDoc[] = visitsSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as ServiceVisitDoc)
    );

    // Fetch recent debt payments
    const paymentsQuery = query(
      collection(db, 'debt_payments'),
      where('customerId', '==', customerId),
      orderBy('paymentDate', 'desc')
    );
    const paymentsSnap = await getDocs(paymentsQuery);
    const debtPayments: DebtPaymentDoc[] = paymentsSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as DebtPaymentDoc)
    );

    return {
      customer,
      vehicles,
      history,
      debtPayments
    };
  } catch (error) {
    console.error('Error in getCustomerDossier:', error);
    throw error;
  }
}

// ==============================================================================
// 5. GET VEHICLE BY QR CODE (Windshield Sticker Fast Portal)
// - Public read query by qrCodeId
// ==============================================================================
export async function getVehicleByQrCode(qrCodeId: string) {
  try {
    const vehQuery = query(
      collection(db, 'vehicles'),
      where('qrCodeId', '==', qrCodeId),
      limit(1)
    );
    const vehSnap = await getDocs(vehQuery);

    if (vehSnap.empty) {
      return null;
    }

    const vehDoc = vehSnap.docs[0];
    const vehicle = { id: vehDoc.id, ...vehDoc.data() } as VehicleDoc;

    // Fetch the latest service visit for this vehicle
    const visitQuery = query(
      collection(db, 'service_visits'),
      where('vehicleId', '==', vehicle.id),
      orderBy('visitDate', 'desc'),
      limit(1)
    );
    const visitSnap = await getDocs(visitQuery);
    const lastVisit = !visitSnap.empty
      ? ({ id: visitSnap.docs[0].id, ...visitSnap.docs[0].data() } as ServiceVisitDoc)
      : null;

    return {
      vehicle,
      lastVisit
    };
  } catch (error) {
    console.error('Error in getVehicleByQrCode:', error);
    throw error;
  }
}

// ==============================================================================
// 6. RECORD DEBT PAYMENT
// - Deducts amountPaid from customer totalDebt and logs entry in debt_payments
// ==============================================================================
export async function recordDebtPayment(customerId: string, amountPaid: number, notes?: string) {
  return await runTransaction(db, async (transaction) => {
    const customerRef = doc(db, 'customers', customerId);
    const customerSnap = await transaction.get(customerRef);

    if (!customerSnap.exists()) {
      throw new Error('ملف الزبون غير موجود');
    }

    const cData = customerSnap.data() as any;
    const currentDebt = Number(cData?.totalDebt || 0);
    const updatedDebt = Math.max(0, currentDebt - amountPaid);

    const paymentRef = doc(collection(db, 'debt_payments'));
    transaction.set(paymentRef, {
      customerId,
      paymentDate: serverTimestamp(),
      amountPaid,
      notes: notes || 'تسديد دفعة نقدية'
    });

    transaction.update(customerRef, {
      totalDebt: updatedDebt
    });

    return { success: true, newDebt: updatedDebt };
  });
}

// ==============================================================================
// 7. GET ALL PRODUCTS
// ==============================================================================
export async function getProductsList(): Promise<ProductDoc[]> {
  try {
    const productsSnap = await getDocs(collection(db, 'products'));
    return productsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductDoc));
  } catch (error) {
    console.error('Error in getProductsList:', error);
    return [];
  }
}
