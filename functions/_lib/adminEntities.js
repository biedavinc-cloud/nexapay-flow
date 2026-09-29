// Whitelist of admin-managed config tables. Table and column names are
// hard-coded here and NEVER taken from request input -- only values are
// (parameterized). type drives coercion of the incoming JSON value.
export const ADMIN_ENTITIES = {
  SecurityIp: {
    table: "nexapay_security_ips",
    cols: { ip: "text", label: "text", active: "boolean", expires_at: "date" },
  },
  CryptoWallet: {
    table: "nexapay_crypto_wallets",
    cols: { label: "text", address: "text", chain: "text", currency: "text", is_default: "boolean" },
    defaultGroup: "chain",
  },
  ProviderConfig: {
    table: "nexapay_provider_configs",
    cols: {
      provider: "text", label: "text", status: "text", enabled: "boolean", is_default: "boolean",
      api_key_label: "text", has_api_secret: "boolean", has_passphrase: "boolean",
      withdrawals_enabled: "boolean", success_rate: "number", notes: "text",
    },
  },
  CurrencyConfig: {
    table: "nexapay_currency_configs",
    cols: { code: "text", label: "text", symbol: "text", enabled: "boolean", auto_convert: "boolean", min_threshold: "number", margin_pct: "number" },
  },
};

export function coerce(type, v) {
  if (type === "boolean") return v === true || v === "true";
  if (type === "number") { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  if (type === "date") return v ? new Date(v).toISOString() : null;
  return v == null ? "" : String(v);
}
