export interface IPayment {
  amount: number;
  currency: string;
  redirectUrl: string;
  email: string;
  name: string;
  phone?: string;
  paymentMethod?: string;
}

export interface FlutterwaveTransactionResponse {
  status: string; // "success" | "error"
  message: string;
  data: FlutterwaveTransactionData;
}

export interface FlutterwaveTransactionData {
  id: number;
  tx_ref: string;
  flw_ref: string;
  device_fingerprint: string;
  amount: number;
  currency: string;
  charged_amount: number;
  app_fee: number;
  merchant_fee: number;
  processor_response: string;
  auth_model: string;
  ip: string;
  narration: string;
  status: string; // "successful" | "failed" | "pending"
  payment_type: string; // e.g., "card"
  created_at: string; // ISO date
  account_id: number;
  card?: FlutterwaveCard;
  meta?: Record<string, any>;
  amount_settled: number;
  customer: FlutterwaveCustomer;
}

export interface FlutterwaveCard {
  first_6digits: string;
  last_4digits: string;
  issuer: string;
  country: string;
  type: string;
  token: string;
  expiry: string; // MM/YY
}

export interface FlutterwaveCustomer {
  id: number;
  name: string;
  phone_number: string;
  email: string;
  created_at: string; // ISO date
}
