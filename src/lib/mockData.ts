export interface Customer {
  id: string;
  fullName: string;
  phoneNumber: string;
  loyaltyPoints: number;
  totalDebt: number;
}

export interface Vehicle {
  id: string;
  customerId: string;
  makeModel: string;
  year: number;
  engineSize: string;
  plateNumber: string;
  preferredViscosity: string;
  preferredOilVolume: number;
  filterCode: string;
  qrToken: string;
}

export interface Product {
  id: string;
  name: string;
  category: 'engine_oil' | 'gear_oil' | 'filter' | 'coolant' | 'additive';
  viscosity?: string;
  partCode?: string;
  packageSizeLiters: number;
  totalLitersInStock: number; // For bulk/drums or total liters
  unitPrice: number;
}

export interface ServiceHistoryItem {
  id: string;
  date: string;
  odometer: number;
  nextOdometer: number;
  oilName: string;
  oilVolume: number;
  filterName: string;
  techNotes: string;
  totalPrice: number;
  paidAmount: number;
  debtAmount: number;
}

// Sample Data simulating workshop database
export const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Mobil 1 ESP 5W-30 (تخليقي بالكامل)', category: 'engine_oil', viscosity: '5W30', packageSizeLiters: 5, totalLitersInStock: 48.5, unitPrice: 12000 },
  { id: 'p2', name: 'Castrol Magnatec 10W-40', category: 'engine_oil', viscosity: '10W40', packageSizeLiters: 4, totalLitersInStock: 32.0, unitPrice: 9500 },
  { id: 'p3', name: 'Liqui Moly Molygen 5W-40', category: 'engine_oil', viscosity: '5W40', packageSizeLiters: 5, totalLitersInStock: 14.5, unitPrice: 13500 },
  { id: 'p4', name: 'Toyota Genuine ATF WS (دهن گير)', category: 'gear_oil', viscosity: 'ATF WS', packageSizeLiters: 4, totalLitersInStock: 20.0, unitPrice: 15000 },
  { id: 'p5', name: 'فلتر زيت أصلي تويوتا (كوري/ياباني)', category: 'filter', partCode: '90915-YZZE2', packageSizeLiters: 1, totalLitersInStock: 18, unitPrice: 7000 },
  { id: 'p6', name: 'فلتر زيت هيونداي / كيا اصلي', category: 'filter', partCode: '26300-35505', packageSizeLiters: 1, totalLitersInStock: 25, unitPrice: 6500 },
  { id: 'p7', name: 'ماء راديتر بريستون أصلي 50/50 أمريكي', category: 'coolant', viscosity: 'Prestone Red', packageSizeLiters: 4, totalLitersInStock: 12.0, unitPrice: 14000 }
];

export const MOCK_CUSTOMERS: Record<string, { customer: Customer; vehicle: Vehicle; history: ServiceHistoryItem[] }> = {
  '07701234567': {
    customer: {
      id: 'c-101',
      fullName: 'أحمد جاسم الشمري',
      phoneNumber: '07701234567',
      loyaltyPoints: 40,
      totalDebt: 25000
    },
    vehicle: {
      id: 'v-201',
      customerId: 'c-101',
      makeModel: 'تويوتا كامري (Toyota Camry)',
      year: 2021,
      engineSize: '2.5L 4-سلندر',
      plateNumber: 'بغداد 48291 خصوصي',
      preferredViscosity: '5W30',
      preferredOilVolume: 4.4,
      filterCode: '90915-YZZE2',
      qrToken: 'camry-48291-asadi'
    },
    history: [
      {
        id: 'h-1',
        date: '2026-08-15',
        odometer: 64200,
        nextOdometer: 71200,
        oilName: 'Mobil 1 ESP 5W-30',
        oilVolume: 4.4,
        filterName: 'فلتر أصلي 90915-YZZE2',
        techNotes: 'تنظيف فلتر الهواء + فحص ماء الراديتر. المحرك بحالة ممتازة دون تبخير.',
        totalPrice: 58000,
        paidAmount: 58000,
        debtAmount: 0
      },
      {
        id: 'h-2',
        date: '2026-05-10',
        odometer: 57100,
        nextOdometer: 64100,
        oilName: 'Mobil 1 ESP 5W-30',
        oilVolume: 4.4,
        filterName: 'فلتر أصلي 90915-YZZE2',
        techNotes: 'تم غسل المحرك بالفلاشينغ وإضافة زيت جديد.',
        totalPrice: 65000,
        paidAmount: 40000,
        debtAmount: 25000
      }
    ]
  }
};
