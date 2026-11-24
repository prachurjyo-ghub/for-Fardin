export type BadgeTone = "blue" | "green" | "amber" | "red" | "grey";
export type SupplierBusinessStatus =
  "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED" | "CLOSED";

export type RequestStatus = "new" | "viewed" | "quoted" | "skipped";

export type RequestCategory =
  | "Braking"
  | "Engine"
  | "Electrical"
  | "Suspension"
  | "Filters"
  | "Cooling"
  | "HVAC"
  | "Other";

export interface SourcingRequest {
  id: string;
  requestId?: string;
  requestItemId?: string;
  part: string;
  vehicle: string;
  location: string;
  qty: number;
  urgent: boolean;
  expires: string;
  photo: boolean;
  note: string;
  status: RequestStatus;
  category?: RequestCategory;
}

export type QuoteStatus =
  "Awaiting decision" | "Accepted" | "Not selected" | "Clarification";

export interface Quotation {
  backendId?: string;
  id: string;
  request: string;
  part: string;
  brand: string;
  price: string;
  eta: string;
  status: QuoteStatus;
  condition?: string;
  compatibility?: string;
  submittedAt?: string;
  rawStatus?: string;
  revisionNumber?: number;
  validUntil?: string;
  supplierNotes?: string | null;
  clarificationItems?: Array<{
    id: string;
    question: string;
    reply: string | null;
    askedAt: string;
  }>;
}

export type FulfillmentStatus =
  | "PENDING_SUPPLIER_CONFIRMATION"
  | "CONFIRMED"
  | "SUPPLIER_PREPARING"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "IN_DELIVERY"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED"
  | "RETURNED";

export interface FulfillmentOrder {
  id: string;
  orderNumber: string;
  requestNumber: string | null;
  status: FulfillmentStatus;
  currency: "BDT";
  customerTotal: string;
  supplierSubtotal: string;
  supplierPayable: string;
  externalSourcingRequired: boolean;
  supplierAvailabilityConfirmedAt: string | null;
  commissionReservation: {
    status: "RESERVED" | "SETTLED" | "RELEASED" | "REVERSED";
    eligibleAmount: string;
    commissionRateBps: number;
    commissionAmount: string;
    reservedAt: string;
    settledAt: string | null;
    releasedAt: string | null;
    reversedAt: string | null;
  } | null;
  deliveryArea: { area: string | null; city: string | null };
  urgent: {
    eligibility: string;
    basis: string | null;
    estimatedWindowStart: string | null;
    estimatedWindowEnd: string | null;
    targetDeadlineAt: string | null;
    breached: boolean;
  };
  items: Array<{
    id: string;
    description: string;
    brand: string | null;
    partNumber: string | null;
    condition: string | null;
    quantity: number;
    supplierUnitPrice: string;
    supplierLineTotal: string;
    fulfillmentSource: "INVENTORY" | "EXTERNAL";
    reservationStatus: string | null;
  }>;
  history: Array<{
    id: string;
    toStatus: FulfillmentStatus;
    note: string | null;
    at: string;
  }>;
  failure: { code: string; reason: string; reportedAt: string } | null;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  unitPrice: string;
  condition: "NEW" | "RECONDITIONED" | "USED";
  listingClassification: "NEW_GENUINE" | "NEW_AFTERMARKET" | "USED" | null;
  publicationStatus: "DRAFT" | "PUBLISHED" | "SUSPENDED" | "ARCHIVED";
  moderationStatus: "NOT_REVIEWED" | "APPROVED" | "FLAGGED" | "REJECTED";
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minimumStock: number;
  preparationTimeMin: number | null;
  isAvailable: boolean;
  isActive: boolean;
  availabilityStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "HIDDEN";
  version: number;
  notes: string | null;
  images: ListingImage[];
  commissionEligibility: {
    eligible: boolean;
    requiredCredit: string | null;
    rateBps: number | null;
    reason: string | null;
  };
  product: CatalogueProduct;
}

export interface ListingImage {
  id: string;
  url: string;
  mimeType: string;
  byteSize: number;
  width: number;
  height: number;
  displayOrder: number;
  isPrimary: boolean;
  version: number;
}

export interface FixedPurchaseRequest {
  id: string;
  requestNumber: string;
  status: string;
  creditStatus: "NOT_APPLICABLE" | "ELIGIBLE" | "AWAITING_CREDITS" | "RESERVED";
  submittedAt: string | null;
  customerNotes: string | null;
  items: Array<{
    description: string;
    partNumber: string | null;
    quantity: number;
    product: { id: string; name: string; catalogueCode: string | null } | null;
  }>;
  listing: {
    id: string;
    sku: string;
    unitPrice: string;
    listingClassification: "NEW_GENUINE" | "NEW_AFTERMARKET" | null;
  } | null;
  orders: Array<{ id: string; orderNumber: string; status: string }>;
  commissionRequirement: {
    requiredCredit: string | null;
    availableCredit: string;
    additionalCreditNeeded: string | null;
    rateBps: number | null;
  };
}

export interface SupplierWallet {
  id: string;
  businessId: string;
  status: "ACTIVE" | "FROZEN" | "CLOSED";
  availableCredit: string;
  reservedCredit: string;
  totalPrepaidBalance: string;
  version: number;
  commissionPolicy: {
    id: string;
    rateBps: number;
    ratePercent: number;
    effectiveFrom: string;
  } | null;
  topUps: WalletTopUp[];
  entries: WalletLedgerEntry[];
  reservations: WalletReservation[];
}

export interface WalletTopUp {
  id: string;
  amount: string;
  currency: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  paymentMethod: string;
  externalReference: string;
  evidenceReference: string | null;
  supplierNote: string | null;
  decisionReason: string | null;
  requestedAt: string;
  reviewedAt: string | null;
}

export interface WalletLedgerEntry {
  id: string;
  type:
    | "TOP_UP"
    | "CREDIT_RESERVATION"
    | "COMMISSION_SETTLEMENT"
    | "RESERVATION_RELEASE"
    | "ADJUSTMENT"
    | "REVERSAL";
  availableDelta: string;
  reservedDelta: string;
  availableBalance: string;
  reservedBalance: string;
  orderId: string | null;
  reason: string;
  createdAt: string;
}

export interface WalletReservation {
  id: string;
  status: "RESERVED" | "SETTLED" | "RELEASED" | "REVERSED";
  eligibleAmount: string;
  commissionRateBps: number;
  commissionAmount: string;
  reservedAt: string;
  order: { id: string; orderNumber: string; status: string };
}

export interface CurrentSubscription {
  id: string;
  planName: string;
  status: string;
  effectiveStatus: string;
  startsAt: string;
  endsAt: string;
  durationMonths: number;
  currency: string;
  price: string;
  complimentary: boolean;
  invoice: { id: string; invoiceNumber: string; status: string } | null;
}

export interface CatalogueProduct {
  id: string;
  catalogueCode: string | null;
  name: string;
  description: string | null;
  category: { id: string; name: string; slug: string };
  brand: { id: string; name: string; slug: string } | null;
  numbers: Array<{ id: string; partNumber: string; isPrimary: boolean }>;
}

export interface CsvPreview {
  id: string;
  expiresAt: string;
  summary: { total: number; creates: number; updates: number; errors: number };
  rows: Array<{
    rowNumber: number;
    action: "create" | "update" | "error";
    errors: string[];
  }>;
}

export type ProductStockStatus = "In stock" | "Low stock" | "Out of stock";
export type StockStatus = ProductStockStatus;

export interface Product {
  id: string;
  name: string;
  partNumber: string;
  brand: string;
  category: RequestCategory;
  price: string;
  stock: number;
  min: number;
  compatibility: string;
  status: ProductStockStatus;
  description?: string;
}

export interface ProductPayload {
  name: string;
  partNumber: string;
  brand: string;
  category: RequestCategory;
  compatibility: string;
  price: string;
  stock: number;
  min: number;
  description?: string;
}

export type TransactionStatus =
  "Completed" | "Pending settlement" | "Processing" | "Failed" | "Refunded";

export interface Transaction {
  id: string;
  orderId: string;
  part: string;
  amount: string;
  fee: string;
  net: string;
  status: TransactionStatus;
  date: string;
  invoiceId: string;
}

export interface PendingSettlement {
  id: string;
  period: string;
  orders: number;
  amount: string;
  expectedDate: string;
}

export interface TransactionSummary {
  completedPayments: string;
  pendingSettlements: string;
  monthTotal: string;
}

export interface ConversationMessage {
  id: string;
  sender: "supplier" | "operations" | "system";
  body: string;
  sentAt: string;
  attachments?: { id: string; name: string; type: string }[];
}

export type ChatMessage = ConversationMessage;
export type MessageAttachment = { name: string; type: string };

export interface Conversation {
  id: string;
  subject: string;
  reference: string;
  referenceType: "request" | "quotation" | "order";
  preview: string;
  unread: number;
  updatedAt: string;
  messages: ConversationMessage[];
}

export interface QuoteFormPayload {
  brand: string;
  condition: string;
  quantity: number;
  unitPrice: string;
  preparationTime: string;
  prepTime?: string;
  validUntil?: string;
  compatibility?: string;
  supplierNotes?: string;
}

export interface QuotePayload extends QuoteFormPayload {
  requestId: string;
  requestItemId: string;
  part: string;
}

export interface DashboardMetrics {
  openRequests: number;
  urgentRequests: number;
  quotesAwaiting: number;
  quotesUpdatedToday: number;
  ordersToPrepare: number;
  ordersDueSoon: number;
  completedThisMonth: number;
  completedGrowth: string;
  acceptedOrderValue: string;
  fulfillmentBreakdown: {
    delivered: number;
    inProgress: number;
    readyForPickup: number;
    exceptions: number;
    total: number;
  };
}

export interface BusinessLocation {
  id: string;
  label: string;
  address: string;
  city: string;
  phone: string;
  primary: boolean;
}

export interface OperatingHours {
  day: string;
  open: string;
  close: string;
  closed?: boolean;
}

export interface BusinessProfile {
  id: string;
  businessCode: string | null;
  legalName: string;
  displayName: string;
  tradeLicense: string | null;
  vatNumber: string | null;
  email: string | null;
  phone: string | null;
  status: SupplierBusinessStatus;
  verifiedAt: string | null;
  serviceAreas: string[];
  supportedCategories: string[];
  locations: Array<{
    id: string;
    label: string;
    addressLine: string;
    city: string;
    area: string | null;
    postalCode: string | null;
    phone: string | null;
    isPrimary: boolean;
    isActive: boolean;
  }>;
  members: Array<{
    id: string;
    title: string | null;
    isPrimary: boolean;
    isActive: boolean;
    user: { fullName: string | null; email: string; accountStatus: string };
  }>;
}
