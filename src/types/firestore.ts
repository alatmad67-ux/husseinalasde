export interface CustomerDoc {
  id?: string;
  fullName: string;
  phoneNumber: string;
  loyaltyPoints: number;
  totalDebt: number;
  createdAt: any;
}

export interface VehicleDoc {
  id?: string;
  customerId: string;
  makeModel: string;
  plateNumber: string;
  engineSize: string;
  modelYear: number;
  lastOdometer: number;
  nextOdometer: number;
  lastServiceDate: any;
  preferredOil?: string;
  preferredFilter?: string;
  qrCodeId: string;
  updatedAt?: any;
}

export type ProductCategory = 
  | 'engine_oil' 
  | 'gear_oil' 
  | 'filter' 
  | 'coolant' 
  | 'additive' 
  | 'flush' 
  | 'anti_smoke';

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  engine_oil: 'زيوت المحركات',
  gear_oil: 'زيوت الجير (القير)',
  filter: 'الفلاتر (زيت / هواء / شاصي)',
  coolant: 'مياه الراديترات والمبردات',
  additive: 'المحسنات والمعالجات',
  flush: 'الفلاشات (غسيل محرك)',
  anti_smoke: 'مانع تبخير وتنقيص'
};

export interface ProductDoc {
  id?: string;
  name: string;
  category: ProductCategory;
  // Support multiple sizes/viscosities for a single product (e.g. ["10W30", "10W40", "20W50"])
  availableSizes?: string[];
  viscosity?: string; // Primary or default size/code
  // Carton & Piece & Liter breakdown
  cartonsCount?: number;
  piecesPerCarton?: number;
  packageSizeLiters: number; // Liters per piece/bottle
  totalPiecesStock?: number; // Total bottles/pieces
  totalLitersStock: number;  // Total liters across all cartons/bottles
  // Dual Pricing
  unitCost: number;          // سعر الشراء / التكلفة
  directSalePrice: number;   // سعر البيع المباشر (فقط بدون خدمة)
  serviceSalePrice: number;  // سعر البيع مع التبديل والخدمة
  salePrice: number;         // Backward compatible default price
}

export interface ServiceVisitDoc {
  id?: string;
  vehicleId: string;
  customerId: string;
  visitDate: any;
  currentOdometer: number;
  nextOdometer: number;
  // Engine Oil
  oilProductId?: string;
  oilName: string;
  viscosity?: string;
  oilLitersUsed: number;
  oilUnitPrice?: number;
  oilTotalPrice?: number;
  // Filter
  filterCode?: string;
  filterPrice?: number;
  // Gear Oil (ATF / CVT / Manual)
  gearOilProductId?: string;
  gearOilName?: string;
  gearOilViscosity?: string;
  gearOilLitersUsed?: number;
  gearOilUnitPrice?: number;
  gearOilTotalPrice?: number;
  gearOilDetails?: string;
  // Notes & Financials
  technicalNotes?: string;
  totalPrice: number;
  paidAmount: number;
  debtAmount: number;
}

export interface DirectSaleItem {
  productId: string;
  productName: string;
  selectedSize?: string;
  quantity: number;
  unitPrice: number;
}

export interface DirectSaleDoc {
  id?: string;
  customerId?: string;
  saleDate: any;
  items: DirectSaleItem[];
  totalAmount: number;
  paidAmount: number;
  debtAmount: number;
}

export interface DebtPaymentDoc {
  id?: string;
  customerId: string;
  paymentDate: any;
  amountPaid: number;
  notes?: string;
}
