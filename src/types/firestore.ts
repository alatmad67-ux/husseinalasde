export interface CustomerDoc {
  id?: string;
  fullName: string;
  phoneNumber: string;
  loyaltyPoints: number;
  totalDebt: number;
  createdAt: any; // Timestamp or ISO string
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
}

export interface ProductDoc {
  id?: string;
  name: string;
  category: 'engine_oil' | 'filter' | 'coolant' | 'gear_oil';
  viscosity?: string;
  packageSizeLiters: number;
  totalLitersStock: number; // Supports fractional liters (e.g. 48.5L)
  unitCost: number;
  salePrice: number;
}

export interface ServiceVisitDoc {
  id?: string;
  vehicleId: string;
  customerId: string;
  visitDate: any;
  currentOdometer: number;
  nextOdometer: number;
  oilProductId?: string;
  oilName: string;
  viscosity?: string;
  oilLitersUsed: number; // Fractional liters deducted (e.g., 3.5L or 4.4L)
  filterCode?: string;
  gearOilDetails?: string;
  technicalNotes?: string;
  totalPrice: number;
  paidAmount: number;
  debtAmount: number;
}

export interface DirectSaleItem {
  productId: string;
  productName: string;
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
