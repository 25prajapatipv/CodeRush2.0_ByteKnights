// ─── x402 Protocol Types ─────────────────────────────────────────────────────

/** Supported payment schemes */
export type PaymentScheme = 'exact' | 'upto';

/** Trace step types for the playground viewer */
export type TraceStepType =
  | 'REQUEST_INITIATED'
  | 'HTTP_402_RECEIVED'
  | 'BUDGET_EVALUATED'
  | 'PAYLOAD_SIGNED'
  | 'FACILITATOR_VERIFIED'
  | 'SETTLED'
  | 'RESULT_RENDERED'
  | 'ERROR'
  | 'POLICY_BLOCKED'
  | 'FALLBACK_TRIGGERED';

/** Resource categories */
export type ResourceCategory =
  | 'OCR'
  | 'TRANSLATION'
  | 'EMBEDDINGS'
  | 'GEOCODING'
  | 'RISK_SCORING'
  | 'INFERENCE'
  | 'OTHER';

/** Budget policy types */
export type BudgetType = 'per_request' | 'per_task' | 'per_provider' | 'daily';

/** Transaction status */
export type TransactionStatus = 'pending' | 'verified' | 'settled' | 'failed' | 'refunded' | 'voided';

// ─── Payment Requirement (402 Response Body) ─────────────────────────────────

export interface PaymentOption {
  scheme: PaymentScheme;
  network: string;
  amount: string;
  maxAmount?: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  resource: string;
  description: string;
  extra?: Record<string, unknown>;
}

export interface PaymentRequired {
  x402Version: number;
  accepts: PaymentOption[];
}

// ─── Payment Signature (Authorization Header Payload) ────────────────────────

export interface PaymentAuthorization {
  from: string;
  to: string;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: string;
}

export interface PaymentSignature {
  x402Version: number;
  scheme: PaymentScheme;
  network: string;
  payload: {
    signature: string;
    authorization: PaymentAuthorization;
  };
}

// ─── Facilitator Types ───────────────────────────────────────────────────────

export interface VerifyResult {
  isValid: boolean;
  payer: string;
  invalidReason?: string;
}

export interface SettlementResult {
  success: boolean;
  transaction: string;
  network: string;
  payer: string;
  payee: string;
  amount: string;
  actualAmount?: string;
  errorReason?: string;
}

// ─── Receipt ─────────────────────────────────────────────────────────────────

export interface X402Receipt {
  receiptId: string;
  providerId: string;
  providerName: string;
  resourceId: string;
  resourceName: string;
  version: string;
  inputSha256: string;
  outputSha256: string;
  timestamp: string;
  scheme: PaymentScheme;
  quotedAmount: string;
  settledAmount: string;
  settlementHash: string;
  status: TransactionStatus;
  network: string;
}

// ─── Trace ───────────────────────────────────────────────────────────────────

export interface TraceStep {
  id: string;
  traceId: string;
  stepIndex: number;
  type: TraceStepType;
  title: string;
  timestamp: string;
  durationMs: number;
  status: 'pending' | 'success' | 'error' | 'blocked';
  data: Record<string, unknown>;
}

export interface TraceRecord {
  id: string;
  resourceId: string;
  resourceName: string;
  agentId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  steps: TraceStep[];
}

// ─── Policy ──────────────────────────────────────────────────────────────────

export interface PolicyEvaluationResult {
  allowed: boolean;
  reason?: string;
  budgetType?: BudgetType;
  limit?: number;
  currentSpend?: number;
  requestedAmount?: number;
  details?: Record<string, unknown>;
}

// ─── API Response Wrappers ───────────────────────────────────────────────────

export interface ApiResource {
  id: string;
  providerId: string;
  providerName: string;
  name: string;
  description: string;
  category: ResourceCategory;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  pricePerCall: number;
  maxPrice?: number;
  paymentScheme: PaymentScheme;
  avgLatencyMs: number;
  qualityScore: number;
  rateLimit: number;
  rateLimitWindow: number;
  termsUrl?: string;
  status: string;
}

export interface ApiProvider {
  id: string;
  name: string;
  description: string;
  status: string;
  reputationScore: number;
  resources: ApiResource[];
  createdAt: string;
}

export interface AgentProfile {
  id: string;
  name: string;
  walletAddress: string;
  balance: number;
  budgets: BudgetPolicyInfo[];
  createdAt: string;
}

export interface BudgetPolicyInfo {
  id: string;
  type: BudgetType;
  providerId?: string;
  providerName?: string;
  limit: number;
  currentSpend: number;
  remainingBudget: number;
  percentUsed: number;
  resetAt?: string;
}

export interface TransactionInfo {
  id: string;
  resourceId: string;
  resourceName: string;
  providerName: string;
  category: ResourceCategory;
  scheme: PaymentScheme;
  quotedAmount: number;
  settledAmount?: number;
  status: TransactionStatus;
  createdAt: string;
  receipt?: X402Receipt;
}

export interface SpendHistoryEntry {
  date: string;
  amount: number;
  count: number;
}

export interface ProviderEarnings {
  totalEarned: number;
  totalRequests: number;
  avgQualityScore: number;
  resources: {
    resourceId: string;
    resourceName: string;
    earnings: number;
    requests: number;
  }[];
}

export interface CallLog {
  id: string;
  agentName: string;
  resourceName: string;
  amount: number;
  status: TransactionStatus;
  latencyMs: number;
  timestamp: string;
}

// ─── Client Helpers ──────────────────────────────────────────────────────────

export interface AgentWallet {
  address: string;
  signingSecret: string;
}

export function createPaymentSignature(wallet: AgentWallet, option: PaymentOption): string {
  const nonce = (Math.random() * 1e16).toString(36);
  const validAfter = Date.now();
  const validBefore = Date.now() + (option.maxTimeoutSeconds || 60) * 1000;
  const value = option.scheme === 'upto' && option.maxAmount ? option.maxAmount : option.amount;

  const payloadString = `${wallet.address}|${option.payTo}|${value}|${nonce}|${validBefore}`;
  
  // Note: Node environment uses crypto module or HMAC web crypto
  let signature = '';
  try {
    const cryptoModule = require('crypto');
    signature = cryptoModule.createHmac('sha256', wallet.signingSecret).update(payloadString).digest('hex');
  } catch (e) {
    signature = `sim_sig_${Date.now()}`;
  }

  const paymentAuth: PaymentSignature = {
    x402Version: 1,
    scheme: option.scheme,
    network: option.network || 'x402-local-sim',
    payload: {
      signature,
      authorization: {
        from: wallet.address,
        to: option.payTo,
        value,
        nonce,
        validAfter,
        validBefore
      }
    }
  };

  return typeof Buffer !== 'undefined'
    ? Buffer.from(JSON.stringify(paymentAuth)).toString('base64')
    : btoa(JSON.stringify(paymentAuth));
}

export function verifyReceipt(receipt: X402Receipt): boolean {
  if (!receipt) return false;
  return (
    receipt.status === 'settled' &&
    Boolean(receipt.receiptId) &&
    Boolean(receipt.settlementHash) &&
    Boolean(receipt.inputSha256) &&
    Boolean(receipt.outputSha256)
  );
}

