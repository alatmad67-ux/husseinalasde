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
  DebtPaymentDoc
} from '@/types/firestore';

// ==============================================================================
// 1. SEARCH CUSTOMER OR VEHICLE (Returns Customer + All their Registered Vehicles)
// ==============================================================================
export async function searchCustomerOrVehicle(queryStr: string): Promise<{
  customer: CustomerDoc;
  vehicles: VehicleDoc[];
  vehicle: VehicleDoc | null;
} | null> {
  const cleanQuery = queryStr.trim();
  if (!cleanQuery) return null;

  try {
    const customersRef = collection(db, 'customers');
    const vehiclesRef = collection(db, 'vehicles');

    // 1. Try querying customers by exact phone number
    const phoneQ = query(customersRef, where('phoneNumber', '==', cleanQuery), limit(1));
    const phoneSnap = await getDocs(phoneQ);

    if (!phoneSnap.empty) {
      const customerDoc = phoneSnap.docs[0];
      const customerData = { id: customerDoc.id, ...customerDoc.data() } as CustomerDoc;

      const vehQ = query(vehiclesRef, where('customerId', '==', customerDoc.id));
      const vehSnap = await getDocs(vehQ);
      const vehicles = vehSnap.docs.map(d => ({ id: d.id, ...d.data() } as VehicleDoc));

      return {
        customer: customerData,
        vehicles,
        vehicle: vehicles[0] || null
      };
    }

    // 2. Try querying vehicles by plate number
    const plateQ = query(vehiclesRef, where('plateNumber', '==', cleanQuery), limit(1));
    const plateSnap = await getDocs(plateQ);

    if (!plateSnap.empty) {
      const matchedVehDoc = plateSnap.docs[0];
      const matchedVehicle = { id: matchedVehDoc.id, ...matchedVehDoc.data() } as VehicleDoc;

      const customerSnap = await getDoc(doc(db, 'customers', matchedVehicle.customerId));
      if (customerSnap.exists()) {
        const customerData = { id: customerSnap.id, ...customerSnap.data() } as CustomerDoc;
        const allVehQ = query(vehiclesRef, where('customerId', '==', customerSnap.id));
        const allVehSnap = await getDocs(allVehQ);
        const vehicles = allVehSnap.docs.map(d => ({ id: d.id, ...d.data() } as VehicleDoc));

        return {
          customer: customerData,
          vehicles,
          vehicle: matchedVehicle
        };
      }
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

      const vehQ = query(vehiclesRef, where('customerId', '==', customerDoc.id));
      const vehSnap = await getDocs(vehQ);
      const vehicles = vehSnap.docs.map(d => ({ id: d.id, ...d.data() } as VehicleDoc));

      return {
        customer: customerData,
        vehicles,
        vehicle: vehicles[0] || null
      };
    }

    return null;
  } catch (error) {
    console.error('Error in searchCustomerOrVehicle:', error);
    throw error;
  }
}

// ==============================================================================
// 1.1 CREATE NEW CUSTOMER WITH VEHICLE (أو إضافة سيارة لزبون موجود)
// ==============================================================================
export async function createCustomerWithVehicle(data: {
  fullName: string;
  phoneNumber: string;
  makeModel: string;
  plateNumber: string;
  engineSize: string;
  modelYear: number;
  lastOdometer?: number;
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

    const vehRef = await addDoc(collection(db, 'vehicles'), {
      customerId,
      makeModel: makeModel.trim(),
      plateNumber: plateNumber.trim(),
      engineSize: engineSize.trim(),
      modelYear: Number(modelYear) || new Date().getFullYear(),
      lastOdometer: Number(lastOdometer) || 0,
      nextOdometer: (Number(lastOdometer) || 0) + 3000,
      lastServiceDate: serverTimestamp(),
      preferredOil: preferredOil || '',
      preferredFilter: preferredFilter || '',
      qrCodeId
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
      customerId,
      makeModel: makeModel.trim(),
      plateNumber: plateNumber.trim(),
      engineSize: engineSize.trim(),
      modelYear: Number(modelYear) || new Date().getFullYear(),
      lastOdometer: Number(lastOdometer) || 0,
      nextOdometer: (Number(lastOdometer) || 0) + 3000,
      lastServiceDate: new Date().toISOString(),
      preferredOil: preferredOil || '',
      preferredFilter: preferredFilter || '',
      qrCodeId
    };

    // Fetch all vehicles for this customer
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
// 1.2 ADD ADDITIONAL VEHICLE TO EXISTING CUSTOMER (إضافة سيارة ثانية لنفس الزبون)
// ==============================================================================
export async function addVehicleToCustomer(data: {
  customerId: string;
  makeModel: string;
  plateNumber: string;
  engineSize: string;
  modelYear: number;
  lastOdometer?: number;
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
      preferredOil,
      preferredFilter
    } = data;

    const qrCodeId = `${plateNumber.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}-${Date.now().toString().slice(-4)}`;

    const vehRef = await addDoc(collection(db, 'vehicles'), {
      customerId,
      makeModel: makeModel.trim(),
      plateNumber: plateNumber.trim(),
      engineSize: engineSize.trim(),
      modelYear: Number(modelYear) || new Date().getFullYear(),
      lastOdometer: Number(lastOdometer) || 0,
      nextOdometer: (Number(lastOdometer) || 0) + 3000,
      lastServiceDate: serverTimestamp(),
      preferredOil: preferredOil || '',
      preferredFilter: preferredFilter || '',
      qrCodeId
    });

    const newVehicle: VehicleDoc = {
      id: vehRef.id,
      customerId,
      makeModel: makeModel.trim(),
      plateNumber: plateNumber.trim(),
      engineSize: engineSize.trim(),
      modelYear: Number(modelYear) || new Date().getFullYear(),
      lastOdometer: Number(lastOdometer) || 0,
      nextOdometer: (Number(lastOdometer) || 0) + 3000,
      lastServiceDate: new Date().toISOString(),
      preferredOil: preferredOil || '',
      preferredFilter: preferredFilter || '',
      qrCodeId
    };

    return { success: true, vehicle: newVehicle };
  } catch (error) {
    console.error('Error in addVehicleToCustomer:', error);
    throw error;
  }
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
    filterCode,
    gearOilProductId,
    gearOilName,
    gearOilViscosity,
    gearOilLitersUsed,
    gearOilDetails,
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

    // 3.b Write: Deduct Gear Oil stock
    if (gearRef && gearLiters > 0) {
      const newGearStock = Number((currentGearStock - gearLiters).toFixed(2));
      transaction.update(gearRef, {
        totalLitersStock: newGearStock
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
      gearOilProductId: gearOilProductId || null,
      gearOilName: gearOilName || '',
      gearOilViscosity: gearOilViscosity || '',
      gearOilLitersUsed: gearLiters,
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

    // 6. Write: Update Customer Debt & Loyalty (+10 points)
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

    const vehQuery = query(collection(db, 'vehicles'), where('customerId', '==', customerId));
    const vehSnap = await getDocs(vehQuery);
    const vehicles: VehicleDoc[] = vehSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as VehicleDoc)
    );

    const visitsQuery = query(
      collection(db, 'service_visits'),
      where('customerId', '==', customerId)
    );
    const visitsSnap = await getDocs(visitsQuery);
    const history: ServiceVisitDoc[] = visitsSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as ServiceVisitDoc)
    );

    const paymentsQuery = query(
      collection(db, 'debt_payments'),
      where('customerId', '==', customerId)
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
// 5. GET VEHICLE BY QR CODE
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

    const visitQuery = query(
      collection(db, 'service_visits'),
      where('vehicleId', '==', vehicle.id),
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
// 7. GET ALL PRODUCTS (With Dual Pricing, Multi-Sizes, Carton/Piece/Liter info)
// ==============================================================================
const DEFAULT_INITIAL_PRODUCTS: Omit<ProductDoc, 'id'>[] = [
  {
    name: 'زيت يورال الأصلي (Eural Motor Oil)',
    category: 'engine_oil',
    availableSizes: ['10W30', '10W40', '20W50', '5W30'],
    viscosity: '10W40',
    cartonsCount: 5,
    piecesPerCarton: 4,
    packageSizeLiters: 4,
    totalPiecesStock: 20,
    totalLitersStock: 80.0,
    unitCost: 8500,
    directSalePrice: 11000,
    serviceSalePrice: 12500,
    salePrice: 12500
  },
  {
    name: 'Mobil 1 ESP (تخليقي بالكامل)',
    category: 'engine_oil',
    availableSizes: ['5W30', '0W20', '5W40'],
    viscosity: '5W30',
    cartonsCount: 3,
    piecesPerCarton: 4,
    packageSizeLiters: 4,
    totalPiecesStock: 12,
    totalLitersStock: 48.0,
    unitCost: 10000,
    directSalePrice: 13000,
    serviceSalePrice: 14500,
    salePrice: 14500
  },
  {
    name: 'Castrol Magnatec',
    category: 'engine_oil',
    availableSizes: ['10W40', '5W30', '20W50'],
    viscosity: '10W40',
    cartonsCount: 4,
    piecesPerCarton: 6,
    packageSizeLiters: 4,
    totalPiecesStock: 24,
    totalLitersStock: 96.0,
    unitCost: 7500,
    directSalePrice: 9500,
    serviceSalePrice: 11000,
    salePrice: 11000
  },
  {
    name: 'زيت قير تويوتا وهونداي (ATF / CVT)',
    category: 'gear_oil',
    availableSizes: ['ATF WS', 'ATF SP-IV', 'CVT FE', '75W90'],
    viscosity: 'ATF WS',
    cartonsCount: 2,
    piecesPerCarton: 6,
    packageSizeLiters: 4,
    totalPiecesStock: 12,
    totalLitersStock: 48.0,
    unitCost: 11000,
    directSalePrice: 14000,
    serviceSalePrice: 16000,
    salePrice: 16000
  },
  {
    name: 'فلتر زيت أصلي (تويوتا / كيا / هونداي)',
    category: 'filter',
    availableSizes: ['90915-YZZE2', '26300-35505', '90915-YZZD4'],
    viscosity: '90915-YZZE2',
    cartonsCount: 2,
    piecesPerCarton: 20,
    packageSizeLiters: 1,
    totalPiecesStock: 40,
    totalLitersStock: 40,
    unitCost: 4000,
    directSalePrice: 6000,
    serviceSalePrice: 7500,
    salePrice: 7500
  },
  {
    name: 'ماء راديتر بريستون أمريكي 50/50',
    category: 'coolant',
    availableSizes: ['أحمر Red', 'أخضر Green'],
    viscosity: 'أحمر Red',
    cartonsCount: 3,
    piecesPerCarton: 6,
    packageSizeLiters: 4,
    totalPiecesStock: 18,
    totalLitersStock: 72.0,
    unitCost: 10000,
    directSalePrice: 13500,
    serviceSalePrice: 15000,
    salePrice: 15000
  },
  {
    name: 'فلاش غسيل محرك (Engine Flush)',
    category: 'flush',
    availableSizes: ['300ml', '500ml'],
    viscosity: '300ml',
    cartonsCount: 2,
    piecesPerCarton: 12,
    packageSizeLiters: 1,
    totalPiecesStock: 24,
    totalLitersStock: 24,
    unitCost: 5000,
    directSalePrice: 7500,
    serviceSalePrice: 9000,
    salePrice: 9000
  },
  {
    name: 'مانع تبخير وتنقيص زيت (Stop Smoke)',
    category: 'anti_smoke',
    availableSizes: ['350ml', '500ml'],
    viscosity: '350ml',
    cartonsCount: 2,
    piecesPerCarton: 12,
    packageSizeLiters: 1,
    totalPiecesStock: 24,
    totalLitersStock: 24,
    unitCost: 6000,
    directSalePrice: 9000,
    serviceSalePrice: 10000,
    salePrice: 10000
  }
];

export async function getProductsList(): Promise<ProductDoc[]> {
  try {
    const productsSnap = await getDocs(collection(db, 'products'));
    if (productsSnap.empty) {
      const seeded: ProductDoc[] = [];
      for (const item of DEFAULT_INITIAL_PRODUCTS) {
        const docRef = await addDoc(collection(db, 'products'), {
          ...item,
          createdAt: serverTimestamp()
        });
        seeded.push({ id: docRef.id, ...item });
      }
      return seeded;
    }
    return productsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductDoc));
  } catch (error) {
    console.error('Error in getProductsList:', error);
    return [];
  }
}

export async function addProduct(product: Omit<ProductDoc, 'id'>) {
  try {
    const docRef = await addDoc(collection(db, 'products'), {
      ...product,
      createdAt: serverTimestamp()
    });
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
    return { success: true };
  } catch (error) {
    console.error('Error in deleteProduct:', error);
    throw error;
  }
}
