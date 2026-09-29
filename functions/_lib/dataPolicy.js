// Row-level access policy for the generic data API (functions/api/data/*).
// This is the server-side replacement for Base44's per-entity RLS: every
// read/write goes through here, and NOTHING is decided by the client.
//   table       Neon table (hard-coded, never from input)
//   scope       column that ties a row to a tenant. Non-admins only ever see
//               rows where scope column = their own tenant_id.
//   list/get/create/update/delete
//               "admin"  -> admin/SUPER_ADMIN only
//               "scoped" -> any merchant, restricted to their own tenant rows
//               "none"   -> not allowed through this API at all
//   cols        writable columns (type drives coercion). Anything not listed
//               can never be written from the client.
//   hideForMerchant  columns stripped from responses to non-admins
const A = "admin", S = "scoped", N = "none";

export const POLICY = {
  Transaction: {
    table: "nexapay_transactions", scope: "tenant_id",
    list: S, get: S, create: N, update: N, delete: N, cols: {},
    filterable: ["status", "payment_method", "tenant_id", "reference_fiat", "currency_fiat", "network"],
    hideForMerchant: ["payload_base64", "crypto_provider", "destination_wallet"],
  },
  Tenant: {
    table: "nexapay_tenants", scope: "id",
    list: A, get: S, create: N, delete: A,
    update: A,
    cols: {
      company_name: "text", country: "text", city: "text", business_activity: "text", tier: "text",
      has_paid_access: "boolean", account_status: "text", daily_limit: "number", commission_rate: "number",
      kyc_status: "text", receiving_wallet: "text", blockchain: "text", onboarding_complete: "boolean",
      statement_descriptor: "text",
    },
    filterable: ["account_status", "kyc_status", "tier", "id"],
    hideForMerchant: ["id_number"],
  },
  TransactionLog: { table: "nexapay_transaction_logs", scope: null, list: A, get: A, create: N, update: N, delete: N, cols: {}, filterable: ["level", "transaction_id", "reference_fiat"] },
  WebhookLog: { table: "nexapay_webhook_logs", scope: null, list: A, get: A, create: N, update: N, delete: N, cols: {}, filterable: ["status", "event", "order_id"] },
  SuperadminAuditLog: {
    table: "nexapay_superadmin_audit_logs", scope: null, list: A, get: A, create: A, update: N, delete: N,
    cols: { admin_id: "text", admin_email: "text", action: "text", target_tenant_id: "text", details: "text" },
    filterable: ["action", "target_tenant_id"],
  },
  AppSetting: {
    table: "nexapay_app_settings", scope: null, list: A, get: A, create: A, update: A, delete: A,
    cols: { key: "text", value: "text" }, filterable: ["key"],
  },
  ProviderConfig: {
    table: "nexapay_provider_configs", scope: null, list: A, get: A, create: A, update: A, delete: A,
    cols: {
      provider: "text", label: "text", status: "text", enabled: "boolean", is_default: "boolean", api_key_label: "text",
      has_api_secret: "boolean", has_passphrase: "boolean", withdrawals_enabled: "boolean", success_rate: "number",
      notes: "text", last_checked: "date",
    },
    filterable: ["provider", "enabled"],
  },
  SecurityIp: {
    table: "nexapay_security_ips", scope: null, list: A, get: A, create: A, update: A, delete: A,
    cols: { ip: "text", label: "text", active: "boolean", expires_at: "date" }, filterable: ["active"],
  },
  CurrencyConfig: {
    table: "nexapay_currency_configs", scope: null, list: A, get: A, create: A, update: A, delete: A,
    cols: { code: "text", label: "text", symbol: "text", enabled: "boolean", auto_convert: "boolean", min_threshold: "number", margin_pct: "number" },
    filterable: ["code", "enabled"],
  },
  WebhookEndpoint: {
    // Merchants read their own endpoints here (WebhookTester); writes go
    // through /api/merchant/webhooks so secrets are generated server-side.
    table: "nexapay_webhook_endpoints", scope: "tenant_id", list: S, get: S, create: N, update: N, delete: N, cols: {},
    filterable: ["active"], hideForMerchant: ["signing_secret"],
  },
  CryptoWallet: {
    table: "nexapay_crypto_wallets", scope: null, list: A, get: A, create: N, update: N, delete: N, cols: {}, filterable: ["chain", "is_default"],
  },
};

export function coerce(type, v) {
  if (type === "boolean") return v === true || v === "true";
  if (type === "number") { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  if (type === "date") return v ? new Date(v).toISOString() : null;
  return v == null ? "" : String(v);
}
