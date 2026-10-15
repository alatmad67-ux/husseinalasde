import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp,
  addDoc,
  updateDoc,
  limit,
  deleteDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  CustomerDoc,
  VehicleDoc,
  ProductDoc,
  ServiceVisitDoc,
  DirectSaleDoc,
  DebtPaymentDoc,
  ExpenseDoc
} from '@/types/firestore';

// Helper to get raw timestamp in ms for accurate sorting
export function getRawDateMillis(ts: any): number {
  if (!ts) return 0;
  if (typeof ts === 'string') {
    const t = new Date(ts).getTime();
    return isNaN(t) ? 0 : t;
  }
  if (ts.toDate && typeof ts.toDate === 'function') {
    return ts.toDate().getTime();
  }
  if (ts.seconds) {
    return ts.seconds * 1000;
  }
  return 0;
}

// Helper to format Firestore Timestamp or ISO date into Arabic readable date + time
export function formatExactDateTime(ts: any): string {
  if (!ts) return '—';
  try {
    if (typeof ts === 'string') {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) return d.toLocaleString('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' });
      return ts;
    }
    if (ts.toDate && typeof ts.toDate === 'function') {
      return ts.toDate().toLocaleString('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' });
    }
    if (ts.seconds) {
      return new Date(ts.seconds * 1000).toLocaleString('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' });
    }
    return new Date().toLocaleString('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

// ==============================================================================
// 0. GET LAST SERVICE VISIT FOR A SPECIFIC VEHICLE
// ==============================================================================
export async function getLastVisitForVehicle(vehicleId: string): Promise<ServiceVisitDoc | null> {
  if (!vehicleId) return null;
  try {
    const visitSnap = await getDocs(
      query(collection(db, 'service_visits'), where('vehicleId', '==', vehicleId))
    );
    if (visitSnap.empty) return null;
    const visits = visitSnap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceVisitDoc));
    visits.sort((a, b) => getRawDateMillis(b.visitDate) - getRawDateMillis(a.visitDate));
    return visits[0] || null;
  } catch (err) {
    console.warn('Error fetching last visit for vehicle:', err);
    return null;
  }
}

// ==============================================================================
// 1. FAST PARALLEL SEARCH CUSTOMER OR VEHICLE (Returns Customer + Vehicles + Last Visit)
// ==============================================================================
export async function searchCustomerOrVehicle(queryStr: string): Promise<{
  customer: CustomerDoc;
  vehicles: VehicleDoc[];
  vehicle: VehicleDoc | null;
  lastVisit: ServiceVisitDoc | null;
} | null> {
  const cleanQuery = queryStr.trim();
  if (!cleanQuery) return null;

  try {
    const customersRef = collection(db, 'customers');
    const vehiclesRef = collection(db, 'vehicles');

    const [phoneSnap, plateSnap, nameSnap] = await Promise.all([
      getDocs(query(customersRef, where('phoneNumber', '==', cleanQuery), limit(1))),
      getDocs(query(vehiclesRef, where('plateNumber', '==', cleanQuery), limit(1))),
      getDocs(
        query(
          customersRef,
          where('fullName', '>=', cleanQuery),
          where('fullName', '<=', cleanQuery + '\uf8ff'),
          limit(1)
        )
      )
    ]);

    // 1. Match by Phone
    if (!phoneSnap.empty) {
      const customerDoc = phoneSnap.docs[0];
      const customerData = { id: customerDoc.id, ...customerDoc.data() } as CustomerDoc;
      const vehSnap = await getDocs(query(vehiclesRef, where('customerId', '==', customerDoc.id)));
      const vehicles = vehSnap.docs.map(d => ({ id: d.id, ...d.data() } as VehicleDoc));
      const firstVeh = vehicles[0] || null;
      const lastVisit = firstVeh?.id ? await getLastVisitForVehicle(firstVeh.id) : null;
      return { customer: customerData, vehicles, vehicle: firstVeh, lastVisit };
    }

    // 2. Match by Plate Number
    if (!plateSnap.empty) {
      const matchedVehDoc = plateSnap.docs[0];
      const matchedVehicle = { id: matchedVehDoc.id, ...matchedVehDoc.data() } as VehicleDoc;
      const [customerSnap, allVehSnap, lastVisit] = await Promise.all([
        getDoc(doc(db, 'customers', matchedVehicle.customerId)),
        getDocs(query(vehiclesRef, where('customerId', '==', matchedVehicle.customerId))),
        getLastVisitForVehicle(matchedVehDoc.id)
      ]);
      if (customerSnap.exists()) {
        const customerData = { id: customerSnap.id, ...customerSnap.data() } as CustomerDoc;
        const vehicles = allVehSnap.docs.map(d => ({ id: d.id, ...d.data() } as VehicleDoc));
        return { customer: customerData, vehicles, vehicle: matchedVehicle, lastVisit };
      }
    }

    // 3. Match by Name
    if (!nameSnap.empty) {
      const customerDoc = nameSnap.docs[0];
      const customerData = { id: customerDoc.id, ...customerDoc.data() } as CustomerDoc;
      const vehSnap = await getDocs(query(vehiclesRef, where('customerId', '==', customerDoc.id)));
      const vehicles = vehSnap.docs.map(d => ({ id: d.id, ...d.data() } as VehicleDoc));
      const firstVeh = vehicles[0] || null;
      const lastVisit = firstVeh?.id ? await getLastVisitForVehicle(firstVeh.id) : null;
      return { customer: customerData, vehicles, vehicle: firstVeh, lastVisit };
    }

    return null;
  } catch (error) {
    console.error('Error in searchCustomerOrVehicle:', error);
    throw error;
  }
}

// ==============================================================================
// 1.1 CREATE NEW CUSTOMER WITH VEHICLE (مع مواصفات الزيت والفلتر الاختيارية للسيارة)
// ==============================================================================
export async function createCustomerWithVehicle(data: {
  fullName: string;
  phoneNumber: string;
  makeModel: string;
  plateNumber: string;
  engineSize: string;
  modelYear: number;
  lastOdometer?: number;
  recommendedLiters?: number;
  preferredOilName?: string;
  preferredOil?: string;
  preferredFilter?: string;
}) {
  try {
    const {
      fullName,
      phoneNumber,
      makeModel,
      plateNumber,
      engineSize,
      modelYear,
      lastOdometer,
      recommendedLiters,
      preferredOilName,
      preferredOil,
      preferredFilter
    } = data;

    const custRef = collection(db, 'customers');
    const existingSnap = await getDocs(
      query(custRef, where('phoneNumber', '==', phoneNumber.trim()), limit(1))
    );

    let customerId = '';
    let existingCustomerData: any = null;

    if (!existingSnap.empty) {
      customerId = existingSnap.docs[0].id;
      existingCustomerData = existingSnap.docs[0].data();
    } else {
      const newCust = await addDoc(custRef, {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        loyaltyPoints: 0,
        totalDebt: 0,
        createdAt: serverTimestamp()
      });
      customerId = newCust.id;
    }

    const qrCodeId = `${plateNumber.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}-${Date.now().toString().slice(-4)}`;

    const vehPayload = {
      customerId,
      makeModel: makeModel.trim(),
      plateNumber: plateNumber.trim(),
      engineSize: (engineSize || '').trim(),
      modelYear: Number(modelYear) || new Date().getFullYear(),
      lastOdometer: Number(lastOdometer) || 0,
      nextOdometer: (Number(lastOdometer) || 0) + 3000,
      lastServiceDate: null,
      recommendedLiters: recommendedLiters ? Number(recommendedLiters) : undefined,
      preferredOilName: (preferredOilName || '').trim(),
      preferredOil: (preferredOil || '').trim(),
      preferredFilter: (preferredFilter || '').trim(),
      qrCodeId
    };

    const vehRef = await addDoc(collection(db, 'vehicles'), {
      ...vehPayload,
      recommendedLiters: vehPayload.recommendedLiters || null,
      createdAt: serverTimestamp()
    });

    const createdCustomer: CustomerDoc = {
      id: customerId,
      fullName: existingCustomerData ? existingCustomerData.fullName : fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      loyaltyPoints: existingCustomerData ? Number(existingCustomerData.loyaltyPoints || 0) : 0,
      totalDebt: existingCustomerData ? Number(existingCustomerData.totalDebt || 0) : 0,
      createdAt: new Date().toISOString()
    };

    const createdVehicle: VehicleDoc = {
      id: vehRef.id,
      ...vehPayload
    };

    const allVehSnap = await getDocs(
      query(collection(db, 'vehicles'), where('customerId', '==', customerId))
    );
    const allVehicles = allVehSnap.docs.map(d => ({ id: d.id, ...d.data() } as VehicleDoc));

    return {
      success: true,
      customer: createdCustomer,
      vehicle: createdVehicle,
      vehicles: allVehicles
    };
  } catch (error) {
    console.error('Error in createCustomerWithVehicle:', error);
    throw error;
  }
}

// ==============================================================================
// 1.2 ADD ADDITIONAL VEHICLE TO EXISTING CUSTOMER (إضافة سيارة أخرى لنفس الزبون)
// ==============================================================================
export async function addVehicleToCustomer(data: {
  customerId: string;
  makeModel: string;
  plateNumber: string;
  engineSize: string;
  modelYear: number;
  lastOdometer?: number;
  recommendedLiters?: number;
  preferredOilName?: string;
  preferredOil?: string;
  preferredFilter?: string;
}) {
  try {
    const {
      customerId,
      makeModel,
      plateNumber,
      engineSize,
      modelYear,
      lastOdometer,
      recommendedLiters,
      preferredOilName,
      preferredOil,
      preferredFilter
    } = data;

    const qrCodeId = `${plateNumber.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}-${Date.now().toString().slice(-4)}`;

    const vehPayload = {
      customerId,
      makeModel: makeModel.trim(),
      plateNumber: plateNumber.trim(),
      engineSize: (engineSize || '').trim(),
      modelYear: Number(modelYear) || new Date().getFullYear(),
      lastOdometer: Number(lastOdometer) || 0,
      nextOdometer: (Number(lastOdometer) || 0) + 3000,
      lastServiceDate: null,
      recommendedLiters: recommendedLiters ? Number(recommendedLiters) : undefined,
      preferredOilName: (preferredOilName || '').trim(),
      preferredOil: (preferredOil || '').trim(),
      preferredFilter: (preferredFilter || '').trim(),
      qrCodeId
    };

    const vehRef = await addDoc(collection(db, 'vehicles'), {
      ...vehPayload,
      recommendedLiters: vehPayload.recommendedLiters || null,
      createdAt: serverTimestamp()
    });

    const newVehicle: VehicleDoc = {
      id: vehRef.id,
      ...vehPayload
    };

    return { success: true, vehicle: newVehicle };
  } catch (error) {
    console.error('Error in addVehicleToCustomer:', error);
    throw error;
  }
}

// ==============================================================================
// 1.3 EDIT / DELETE CUSTOMER, VEHICLE, OR SERVICE VISIT
// ==============================================================================
export async function updateCustomer(customerId: string, updates: Partial<CustomerDoc>) {
  const ref = doc(db, 'customers', customerId);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp()
  });
  return { success: true };
}

export async function deleteCustomer(customerId: string) {
  const vehSnap = await getDocs(query(collection(db, 'vehicles'), where('customerId', '==', customerId)));
  for (const v of vehSnap.docs) {
    await deleteDoc(doc(db, 'vehicles', v.id));
  }
  await deleteDoc(doc(db, 'customers', customerId));
  return { success: true };
}

export async function updateVehicle(vehicleId: string, updates: Partial<VehicleDoc>) {
  const ref = doc(db, 'vehicles', vehicleId);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp()
  });
  return { success: true };
}

export async function deleteVehicle(vehicleId: string) {
  await deleteDoc(doc(db, 'vehicles', vehicleId));
  return { success: true };
}

export async function updateServiceVisit(visitId: string, updates: Partial<ServiceVisitDoc>) {
  return await runTransaction(db, async (transaction) => {
    const visitRef = doc(db, 'service_visits', visitId);
    const visitSnap = await transaction.get(visitRef);
    if (!visitSnap.exists()) throw new Error('العملية غير موجودة');

    const oldData = visitSnap.data() as ServiceVisitDoc;
    const oldDebt = Number(oldData.debtAmount || 0);
    const newDebt = updates.debtAmount !== undefined ? Number(updates.debtAmount) : oldDebt;
    const debtDiff = newDebt - oldDebt;

    if (debtDiff !== 0 && oldData.customerId) {
      const custRef = doc(db, 'customers', oldData.customerId);
      const custSnap = await transaction.get(custRef);
      if (custSnap.exists()) {
        const currentDebt = Number(custSnap.data()?.totalDebt || 0);
        transaction.update(custRef, {
          totalDebt: Math.max(0, currentDebt + debtDiff)
        });
      }
    }

    transaction.update(visitRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  });
}

export async function deleteServiceVisit(visitId: string) {
  return await runTransaction(db, async (transaction) => {
    const visitRef = doc(db, 'service_visits', visitId);
    const visitSnap = await transaction.get(visitRef);
    if (!visitSnap.exists()) return { success: true };

    const oldData = visitSnap.data() as ServiceVisitDoc;
    const oldDebt = Number(oldData.debtAmount || 0);

    if (oldDebt > 0 && oldData.customerId) {
      const custRef = doc(db, 'customers', oldData.customerId);
      const custSnap = await transaction.get(custRef);
      if (custSnap.exists()) {
        const currentDebt = Number(custSnap.data()?.totalDebt || 0);
        transaction.update(custRef, {
          totalDebt: Math.max(0, currentDebt - oldDebt)
        });
      }
    }

    transaction.delete(visitRef);
    return { success: true };
  });
}

// ==============================================================================
// 1.4 BULK IMPORT CUSTOMERS & VEHICLES FROM EXCEL (استيراد بيانات من إكسل)
// ==============================================================================
export interface ExcelImportRow {
  fullName: string;
  phoneNumber: string;
  totalDebt?: number;
  makeModel?: string;
  plateNumber?: string;
  modelYear?: number;
  engineSize?: string;
  lastOdometer?: number;
  nextOdometer?: number;
  recommendedLiters?: number;
  preferredOilName?: string;
  preferredOil?: string;
  preferredFilter?: string;
}

export async function bulkImportCustomersFromExcel(rows: ExcelImportRow[]) {
  let importedCustomers = 0;
  let importedVehicles = 0;

  const custSnap = await getDocs(collection(db, 'customers'));
  const phoneMap = new Map<string, string>();
  custSnap.docs.forEach(d => {
    const data = d.data();
    if (data.phoneNumber) {
      phoneMap.set(String(data.phoneNumber).trim(), d.id);
    }
  });

  for (const row of rows) {
    const fullName = String(row.fullName || '').trim();
    const phoneNumber = String(row.phoneNumber || '').trim();
    if (!fullName && !phoneNumber) continue;

    let customerId = phoneNumber ? phoneMap.get(phoneNumber) || '' : '';

    if (!customerId) {
      const newCust = await addDoc(collection(db, 'customers'), {
        fullName: fullName || 'زبون بدون اسم',
        phoneNumber: phoneNumber || '—',
        loyaltyPoints: 0,
        totalDebt: Number(row.totalDebt || 0),
        createdAt: serverTimestamp()
      });
      customerId = newCust.id;
      if (phoneNumber) phoneMap.set(phoneNumber, customerId);
      importedCustomers++;
    } else if (Number(row.totalDebt || 0) > 0) {
      const cRef = doc(db, 'customers', customerId);
      const cDoc = await getDoc(cRef);
      if (cDoc.exists()) {
        const existingDebt = Number(cDoc.data()?.totalDebt || 0);
        await updateDoc(cRef, {
          totalDebt: existingDebt + Number(row.totalDebt || 0)
        });
      }
    }

    if (row.makeModel || row.plateNumber) {
      const plateStr = String(row.plateNumber || 'بدون لوحة').trim();
      const lastOdo = Number(row.lastOdometer || 0);
      const nextOdo = Number(row.nextOdometer || (lastOdo > 0 ? lastOdo + 3000 : 3000));
      const qrCodeId = `${plateStr.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 90 + 10)}`;

      await addDoc(collection(db, 'vehicles'), {
        customerId,
        makeModel: String(row.makeModel || 'سيارة').trim(),
        plateNumber: plateStr,
        engineSize: String(row.engineSize || '').trim(),
        modelYear: Number(row.modelYear) || new Date().getFullYear(),
        lastOdometer: lastOdo,
        nextOdometer: nextOdo,
        lastServiceDate: null,
        recommendedLiters: row.recommendedLiters ? Number(row.recommendedLiters) : null,
        preferredOilName: String(row.preferredOilName || '').trim(),
        preferredOil: String(row.preferredOil || '').trim(),
        preferredFilter: String(row.preferredFilter || '').trim(),
        qrCodeId,
        createdAt: serverTimestamp()
      });
      importedVehicles++;
    }
  }

  return {
    success: true,
    importedCustomers,
    importedVehicles
  };
}

// ==============================================================================
// 2. RECORD SERVICE VISIT (Atomic Transaction: Deducts Engine Oil + Gear Oil)
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
    oilUnitPrice,
    oilTotalPrice,
    filterCode,
    filterPrice,
    gearOilProductId,
    gearOilName,
    gearOilViscosity,
    gearOilLitersUsed,
    gearOilUnitPrice,
    gearOilTotalPrice,
    gearOilDetails,
    extraItems,
    additionalServices,
    technicalNotes,
    totalPrice,
    paidAmount,
    debtAmount
  } = visitData;

  return await runTransaction(db, async (transaction) => {
    let oilRef = null;
    let currentOilStock = 0;

    // 1. Read Engine Oil product stock
    if (oilProductId) {
      oilRef = doc(db, 'products', oilProductId);
      const oilSnap = await transaction.get(oilRef);
      if (oilSnap.exists()) {
        const pData = oilSnap.data() as any;
        currentOilStock = Number(pData?.totalLitersStock || 0);
        if (currentOilStock < oilLitersUsed) {
          throw new Error(
            `رصيد زيت المحرك غير كافٍ. المتاح (${currentOilStock} لتر) بينما المطلوب (${oilLitersUsed} لتر).`
          );
        }
      } else {
        oilRef = null;
      }
    }

    // 1.b Read Gear Oil product stock if selected
    let gearRef = null;
    let currentGearStock = 0;
    const gearLiters = Number(gearOilLitersUsed || 0);

    if (gearOilProductId && gearLiters > 0) {
      gearRef = doc(db, 'products', gearOilProductId);
      const gearSnap = await transaction.get(gearRef);
      if (gearSnap.exists()) {
        const gData = gearSnap.data() as any;
        currentGearStock = Number(gData?.totalLitersStock || 0);
        if (currentGearStock < gearLiters) {
          throw new Error(
            `رصيد زيت الجير غير كافٍ. المتاح (${currentGearStock} لتر) بينما المطلوب (${gearLiters} لتر).`
          );
        }
      } else {
        gearRef = null;
      }
    }

    // 1.c Read Extra Products stock if provided
    const extraProductUpdates: { ref: any; newStock: number }[] = [];
    if (extraItems && Array.isArray(extraItems)) {
      for (const item of extraItems) {
        if (item.productId && item.quantity > 0) {
          const itemRef = doc(db, 'products', item.productId);
          const itemSnap = await transaction.get(itemRef);
          if (itemSnap.exists()) {
            const currentStock = Number((itemSnap.data() as any)?.totalLitersStock || 0);
            const newStock = Math.max(0, Number((currentStock - item.quantity).toFixed(2)));
            extraProductUpdates.push({ ref: itemRef, newStock });
          }
        }
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

    // 3. Write: Deduct Engine Oil stock
    if (oilRef) {
      const newStock = Number((currentOilStock - oilLitersUsed).toFixed(2));
      transaction.update(oilRef, {
        totalLitersStock: newStock
      });
    }

    // 3.b Write: Deduct Gear Oil stock (in Liters)
    if (gearRef && gearLiters > 0) {
      const newGearStock = Number((currentGearStock - gearLiters).toFixed(2));
      transaction.update(gearRef, {
        totalLitersStock: newGearStock
      });
    }

    // 3.c Write: Deduct Extra products stock
    for (const update of extraProductUpdates) {
      transaction.update(update.ref, { totalLitersStock: update.newStock });
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
      oilUnitPrice: Number(oilUnitPrice || 0),
      oilTotalPrice: Number(oilTotalPrice || 0),
      filterCode: filterCode || '',
      filterPrice: Number(filterPrice || 0),
      gearOilProductId: gearOilProductId || null,
      gearOilName: gearOilName || '',
      gearOilViscosity: gearOilViscosity || '',
      gearOilLitersUsed: gearLiters,
      gearOilUnitPrice: Number(gearOilUnitPrice || 0),
      gearOilTotalPrice: Number(gearOilTotalPrice || 0),
      gearOilDetails: gearOilDetails || '',
      extraItems: extraItems || [],
      additionalServices: additionalServices || [],
      technicalNotes: technicalNotes || '',
      totalPrice,
      paidAmount,
      debtAmount
    });

    // 5. Write: Update Vehicle odometer & save last used oil/liters/filter for future reference
    transaction.update(vehicleRef, {
      lastOdometer: currentOdometer,
      nextOdometer: nextOdometer,
      lastServiceDate: serverTimestamp(),
      ...(oilName ? { preferredOilName: oilName } : {}),
      ...(viscosity ? { preferredOil: viscosity } : {}),
      ...(oilLitersUsed ? { recommendedLiters: oilLitersUsed } : {}),
      ...(filterCode ? { preferredFilter: filterCode } : {})
    });

    // 6. Write: Update Customer Debt & Loyalty (only if loyalty system is active)
    const customerData = customerSnap.data() as any;
    const currentCustomerDebt = Number(customerData?.totalDebt || 0);
    const currentLoyalty = Number(customerData?.loyaltyPoints || 0);
    const isLoyaltyEnabled =
      typeof window !== 'undefined' && localStorage.getItem('asadi_loyalty_enabled') === 'true';

    transaction.update(customerRef, {
      totalDebt: currentCustomerDebt + (debtAmount > 0 ? debtAmount : 0),
      loyaltyPoints: isLoyaltyEnabled ? currentLoyalty + 10 : currentLoyalty
    });

    cachedProducts = null;

    return {
      success: true,
      visitId: newVisitRef.id
    };
  });
}

// ==============================================================================
// 3. RECORD DIRECT SALE
// ==============================================================================
export async function recordDirectSale(saleData: Omit<DirectSaleDoc, 'id' | 'saleDate'>) {
  const { customerId, items, totalAmount, paidAmount, debtAmount } = saleData;

  return await runTransaction(db, async (transaction) => {
    const productUpdates: { ref: any; newStock: number }[] = [];

    for (const item of items) {
      const pRef = doc(db, 'products', item.productId);
      const pSnap = await transaction.get(pRef);

      if (pSnap.exists()) {
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
    }

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

    for (const update of productUpdates) {
      transaction.update(update.ref, { totalLitersStock: update.newStock });
    }

    const saleRef = doc(collection(db, 'direct_sales'));
    transaction.set(saleRef, {
      customerId: customerId || null,
      saleDate: serverTimestamp(),
      items,
      totalAmount,
      paidAmount,
      debtAmount
    });

    if (customerRef && debtAmount > 0) {
      transaction.update(customerRef, {
        totalDebt: customerDebt + debtAmount
      });
    }

    cachedProducts = null;

    return { success: true, saleId: saleRef.id };
  });
}

// ==============================================================================
// 4. GET CUSTOMER DOSSIER
// ==============================================================================
export async function getCustomerDossier(customerId: string) {
  try {
    const customerSnap = await getDoc(doc(db, 'customers', customerId));
    if (!customerSnap.exists()) {
      return null;
    }

    const customer = { id: customerSnap.id, ...customerSnap.data() } as CustomerDoc;

    const [vehSnap, visitsSnap, salesSnap, paymentsSnap] = await Promise.all([
      getDocs(query(collection(db, 'vehicles'), where('customerId', '==', customerId))),
      getDocs(query(collection(db, 'service_visits'), where('customerId', '==', customerId))),
      getDocs(query(collection(db, 'direct_sales'), where('customerId', '==', customerId))),
      getDocs(query(collection(db, 'debt_payments'), where('customerId', '==', customerId)))
    ]);

    const vehicles: VehicleDoc[] = vehSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as VehicleDoc)
    );

    const history: ServiceVisitDoc[] = visitsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as ServiceVisitDoc))
      .sort((a, b) => getRawDateMillis(b.visitDate) - getRawDateMillis(a.visitDate));

    const directSales: DirectSaleDoc[] = salesSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as DirectSaleDoc))
      .sort((a, b) => getRawDateMillis(b.saleDate) - getRawDateMillis(a.saleDate));

    const debtPayments: DebtPaymentDoc[] = paymentsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as DebtPaymentDoc))
      .sort((a, b) => getRawDateMillis(b.paymentDate) - getRawDateMillis(a.paymentDate));

    return {
      customer,
      vehicles,
      history,
      directSales,
      debtPayments
    };
  } catch (error) {
    console.error('Error in getCustomerDossier:', error);
    throw error;
  }
}

// ==============================================================================
// 5. GET VEHICLE BY QR CODE (مع كامل سجل الزيارات وبيانات الزبون للبطاقة الرقمية)
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

    const [visitSnap, customerSnap] = await Promise.all([
      getDocs(query(collection(db, 'service_visits'), where('vehicleId', '==', vehicle.id!))),
      vehicle.customerId ? getDoc(doc(db, 'customers', vehicle.customerId)) : Promise.resolve(null)
    ]);

    const history = visitSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as ServiceVisitDoc))
      .sort((a, b) => getRawDateMillis(b.visitDate) - getRawDateMillis(a.visitDate));

    const lastVisit = history[0] || null;
    const customer = customerSnap && customerSnap.exists()
      ? ({ id: customerSnap.id, ...customerSnap.data() } as CustomerDoc)
      : null;

    return {
      vehicle,
      customer,
      lastVisit,
      history
    };
  } catch (error) {
    console.error('Error in getVehicleByQrCode:', error);
    throw error;
  }
}

// ==============================================================================
// 6. RECORD DEBT PAYMENT
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
// 7. GET ALL PRODUCTS (NO DUMMY SEEDING + AUTO-PURGE OLD SEEDED MOCK ITEMS)
// ==============================================================================
const OLD_SEEDED_MOCK_NAMES = new Set([
  'زيت يورال الأصلي (Eural Motor Oil)',
  'Mobil 1 ESP (تخليقي بالكامل)',
  'Castrol Magnatec',
  'زيت قير تويوتا وهونداي (ATF / CVT)',
  'فلتر زيت أصلي (تويوتا / كيا / هونداي)',
  'ماء راديتر بريستون أمريكي 50/50',
  'فلاش غسيل محرك (Engine Flush)',
  'مانع تبخير وتنقيص زيت (Stop Smoke)'
]);

let cachedProducts: ProductDoc[] | null = null;
let lastProductsFetch = 0;
let mockCleanupDone = false;

export async function getProductsList(forceRefresh = false): Promise<ProductDoc[]> {
  const now = Date.now();
  if (!forceRefresh && cachedProducts && now - lastProductsFetch < 60000) {
    return cachedProducts;
  }

  try {
    const productsSnap = await getDocs(collection(db, 'products'));
    const realProducts: ProductDoc[] = [];

    for (const d of productsSnap.docs) {
      const data = d.data() as ProductDoc;
      if (!mockCleanupDone && OLD_SEEDED_MOCK_NAMES.has(data.name)) {
        try {
          await deleteDoc(doc(db, 'products', d.id));
          continue;
        } catch {
          // ignore
        }
      }
      realProducts.push({ id: d.id, ...data });
    }

    mockCleanupDone = true;
    cachedProducts = realProducts;
    lastProductsFetch = Date.now();
    return realProducts;
  } catch (error) {
    console.error('Error in getProductsList:', error);
    return cachedProducts || [];
  }
}

export async function addProduct(product: Omit<ProductDoc, 'id'>) {
  try {
    const docRef = await addDoc(collection(db, 'products'), {
      ...product,
      createdAt: serverTimestamp()
    });
    cachedProducts = null;
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error in addProduct:', error);
    throw error;
  }
}

export async function updateProduct(id: string, updates: Partial<ProductDoc>) {
  try {
    const productRef = doc(db, 'products', id);
    await updateDoc(productRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    cachedProducts = null;
    return { success: true };
  } catch (error) {
    console.error('Error in updateProduct:', error);
    throw error;
  }
}

export async function deleteProduct(id: string) {
  try {
    const productRef = doc(db, 'products', id);
    await deleteDoc(productRef);
    cachedProducts = null;
    return { success: true };
  } catch (error) {
    console.error('Error in deleteProduct:', error);
    throw error;
  }
}

// ==============================================================================
// 7.5 WORKSHOP EXPENSES (سجل مصاريف الورشة اليومية والشهرية)
// ==============================================================================
export async function addExpense(expense: Omit<ExpenseDoc, 'id' | 'expenseDate'>) {
  const docRef = await addDoc(collection(db, 'expenses'), {
    ...expense,
    amount: Number(expense.amount || 0),
    expenseDate: serverTimestamp()
  });
  return { success: true, id: docRef.id };
}

export async function deleteExpense(expenseId: string) {
  await deleteDoc(doc(db, 'expenses', expenseId));
  return { success: true };
}

export async function getExpensesList(): Promise<ExpenseDoc[]> {
  try {
    const snap = await getDocs(collection(db, 'expenses'));
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() } as ExpenseDoc))
      .sort((a, b) => getRawDateMillis(b.expenseDate) - getRawDateMillis(a.expenseDate));
  } catch (err) {
    console.warn('Error fetching expenses:', err);
    return [];
  }
}

// ==============================================================================
// 8. GET ALL DEBTORS & TOTAL DEBTS (كشف جميع الزبائن المديونين ومجموع الديون)
// ==============================================================================
export async function getAllDebtorsSummary() {
  try {
    const [custSnap, vehSnap, visitsSnap] = await Promise.all([
      getDocs(collection(db, 'customers')),
      getDocs(collection(db, 'vehicles')),
      getDocs(collection(db, 'service_visits'))
    ]);

    const allCustomers = custSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as CustomerDoc))
      .sort((a, b) => getRawDateMillis(b.createdAt) - getRawDateMillis(a.createdAt));

    const allVehicles = vehSnap.docs.map(d => ({ id: d.id, ...d.data() } as VehicleDoc));
    const vehiclesByCustomer: Record<string, VehicleDoc[]> = {};
    allVehicles.forEach(v => {
      if (!vehiclesByCustomer[v.customerId]) vehiclesByCustomer[v.customerId] = [];
      vehiclesByCustomer[v.customerId].push(v);
    });

    const visitsCountByCustomer: Record<string, number> = {};
    visitsSnap.docs.forEach(d => {
      const data = d.data() as ServiceVisitDoc;
      if (data.customerId) {
        visitsCountByCustomer[data.customerId] = (visitsCountByCustomer[data.customerId] || 0) + 1;
      }
    });

    const debtors = allCustomers.filter(c => Number(c.totalDebt || 0) > 0);
    const totalDebtSum = debtors.reduce((acc, c) => acc + Number(c.totalDebt || 0), 0);

    return {
      totalCustomersCount: allCustomers.length,
      debtorsCount: debtors.length,
      totalDebtSum,
      debtors,
      allCustomers,
      vehiclesByCustomer,
      visitsCountByCustomer
    };
  } catch (error) {
    console.error('Error in getAllDebtorsSummary:', error);
    return {
      totalCustomersCount: 0,
      debtorsCount: 0,
      totalDebtSum: 0,
      debtors: [],
      allCustomers: [],
      vehiclesByCustomer: {} as Record<string, VehicleDoc[]>,
      visitsCountByCustomer: {} as Record<string, number>
    };
  }
}

// ==============================================================================
// 9. GET COMPREHENSIVE ANALYTICS, EXPENSES & DUE VEHICLES REPORT
// ==============================================================================
export async function getWorkshopReportsData() {
  try {
    const [visitsSnap, directSnap, productsList, custSnap, vehSnap, expensesList] = await Promise.all([
      getDocs(collection(db, 'service_visits')),
      getDocs(collection(db, 'direct_sales')),
      getProductsList(),
      getDocs(collection(db, 'customers')),
      getDocs(collection(db, 'vehicles')),
      getExpensesList()
    ]);

    const visits = visitsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceVisitDoc));
    const directSales = directSnap.docs.map(d => ({ id: d.id, ...d.data() } as DirectSaleDoc));
    const customers = custSnap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerDoc));
    const vehicles = vehSnap.docs.map(d => ({ id: d.id, ...d.data() } as VehicleDoc));

    return {
      visits,
      directSales,
      products: productsList,
      customers,
      vehicles,
      expenses: expensesList
    };
  } catch (error) {
    console.error('Error in getWorkshopReportsData:', error);
    return {
      visits: [],
      directSales: [],
      products: [],
      customers: [],
      vehicles: [],
      expenses: []
    };
  }
}
