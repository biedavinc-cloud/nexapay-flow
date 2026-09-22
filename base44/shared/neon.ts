// Neon Postgres mirror for NexaPay — FULL mirror of every Base44 entity.
// Mirrors all transactions, logs, users, api keys, wallets, providers, webhooks,
// settings, currencies and security IPs into the merchant's own Neon database
// using the DATABASE_URL secret. Tables are auto-created on first connect.
// Best-effort: callers wrap live writes in waitUntil so payment processing is
// never blocked. Use syncAllToNeon() for a complete bulk snapshot.

import { Pool } from "npm:pg@8.13.1";
import { secrets } from "base44:runtime";

let poolPromise = null;

async function getPool() {
  if (poolPromise) return poolPromise;
  poolPromise = (async () => {
    const raw = secrets.get("DATABASE_URL");
    if (!raw) throw new Error("DATABASE_URL not set");
    // pg does not implement libpq channel_binding; ssl is configured explicitly below.
    const u = new URL(raw);
    u.searchParams.delete("sslmode");
    u.searchParams.delete("channel_binding");
    const pool = new Pool({
      connectionString: u.toString(),
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 8000,
    });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nexapay_users (
        id TEXT PRIMARY KEY, full_name TEXT, email TEXT, role TEXT, created_date TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS nexapay_api_keys (
        id TEXT PRIMARY KEY, label TEXT, secret_key TEXT, publishable_key TEXT,
        active BOOLEAN, last_used TIMESTAMPTZ, created_date TIMESTAMPTZ, updated_date TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS nexapay_app_settings (
        id TEXT PRIMARY KEY, key TEXT, value TEXT, created_date TIMESTAMPTZ, updated_date TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS nexapay_crypto_wallets (
        id TEXT PRIMARY KEY, label TEXT, address TEXT, chain TEXT, currency TEXT,
        is_default BOOLEAN, created_date TIMESTAMPTZ, updated_date TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS nexapay_currency_configs (
        id TEXT PRIMARY KEY, code TEXT, label TEXT, symbol TEXT, enabled BOOLEAN,
        auto_convert BOOLEAN, min_threshold NUMERIC, margin_pct NUMERIC,
        created_date TIMESTAMPTZ, updated_date TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS nexapay_provider_configs (
        id TEXT PRIMARY KEY, provider TEXT, label TEXT, status TEXT, enabled BOOLEAN,
        is_default BOOLEAN, api_key_label TEXT, has_api_secret BOOLEAN, has_passphrase BOOLEAN,
        withdrawals_enabled BOOLEAN, success_rate NUMERIC, last_checked TIMESTAMPTZ, notes TEXT,
        created_date TIMESTAMPTZ, updated_date TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS nexapay_security_ips (
        id TEXT PRIMARY KEY, ip TEXT, label TEXT, active BOOLEAN, expires_at TIMESTAMPTZ,
        created_date TIMESTAMPTZ, updated_date TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS nexapay_transactions (
        id TEXT PRIMARY KEY, reference_fiat TEXT, client_name TEXT, amount_fiat NUMERIC,
        currency_fiat TEXT, asset TEXT, network TEXT, usdt_amount NUMERIC, exchange_rate NUMERIC,
        payment_method TEXT, crypto_provider TEXT, destination_wallet TEXT, status TEXT,
        payload_base64 TEXT, tx_hash_crypto TEXT, error_message TEXT,
        created_date TIMESTAMPTZ, updated_date TIMESTAMPTZ
      );
      ALTER TABLE nexapay_transactions ADD COLUMN IF NOT EXISTS payload_base64 TEXT;
      ALTER TABLE nexapay_transactions ADD COLUMN IF NOT EXISTS tenant_id TEXT;
      ALTER TABLE nexapay_transactions ADD COLUMN IF NOT EXISTS gateway_fee NUMERIC;
      ALTER TABLE nexapay_transactions ADD COLUMN IF NOT EXISTS nexapay_commission NUMERIC;
      ALTER TABLE nexapay_transactions ADD COLUMN IF NOT EXISTS usdt_net_sent NUMERIC;
      ALTER TABLE nexapay_users ADD COLUMN IF NOT EXISTS tenant_id TEXT;
      ALTER TABLE nexapay_users ADD COLUMN IF NOT EXISTS phone_number TEXT;
      ALTER TABLE nexapay_users ADD COLUMN IF NOT EXISTS kyc_status TEXT;
      CREATE TABLE IF NOT EXISTS nexapay_tenants (
        id TEXT PRIMARY KEY, company_name TEXT, tier TEXT, has_paid_access BOOLEAN,
        account_status TEXT, daily_limit NUMERIC, commission_rate NUMERIC, checkout_primary_color TEXT,
        logo_url TEXT, kyc_status TEXT, kyc_doc_url TEXT, selfie_url TEXT, id_name TEXT,
        id_number TEXT, phone TEXT, receiving_wallet TEXT, blockchain TEXT,
        onboarding_complete BOOLEAN, created_date TIMESTAMPTZ, updated_date TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS nexapay_tenant_wallets (
        id TEXT PRIMARY KEY, tenant_id TEXT, wallet_address TEXT, blockchain TEXT,
        is_active BOOLEAN, created_date TIMESTAMPTZ, updated_date TIMESTAMPTZ
      );
      ALTER TABLE nexapay_transactions ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS tenant_isolation_policy ON nexapay_transactions;
      CREATE POLICY tenant_isolation_policy ON nexapay_transactions
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::text);
      CREATE TABLE IF NOT EXISTS nexapay_transaction_logs (
        id TEXT PRIMARY KEY, transaction_id TEXT, reference_fiat TEXT, from_status TEXT,
        to_status TEXT, level TEXT, message TEXT, actor TEXT, created_date TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS nexapay_webhook_endpoints (
        id TEXT PRIMARY KEY, label TEXT, url TEXT, signing_secret TEXT, active BOOLEAN,
        events TEXT, created_date TIMESTAMPTZ, updated_date TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS nexapay_webhook_logs (
        id TEXT PRIMARY KEY, endpoint_url TEXT, event TEXT, order_id TEXT, status TEXT,
        http_status NUMERIC, attempts NUMERIC, response_snippet TEXT,
        created_date TIMESTAMPTZ, updated_date TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS nexapay_superadmin_audit_logs (
        id TEXT PRIMARY KEY, admin_id TEXT, admin_email TEXT, action TEXT,
        target_tenant_id TEXT, details TEXT, created_date TIMESTAMPTZ
      );
      ALTER TABLE nexapay_users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'TENANT_USER';
      UPDATE nexapay_users SET role = 'SUPER_ADMIN'
        WHERE email IN ('vincentnogue@yahoo.com','vincentnogue2@gmail.com','webdxb1@gmail.com');
      CREATE OR REPLACE FUNCTION protect_minimum_superadmins() RETURNS TRIGGER AS $$
      DECLARE superadmin_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO superadmin_count FROM nexapay_users WHERE role = 'SUPER_ADMIN';
        IF (TG_OP = 'UPDATE' AND OLD.role = 'SUPER_ADMIN' AND (NEW.role IS NULL OR NEW.role <> 'SUPER_ADMIN')) THEN
          IF superadmin_count <= 2 THEN
            RAISE EXCEPTION 'Action bloquée : La plateforme doit conserver au moins 2 SuperAdmins actifs en permanence.';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS enforce_superadmin_protection ON nexapay_users;
      CREATE TRIGGER enforce_superadmin_protection
        BEFORE UPDATE ON nexapay_users FOR EACH ROW
        EXECUTE FUNCTION protect_minimum_superadmins();
      CREATE OR REPLACE FUNCTION protect_minimum_superadmins_delete() RETURNS TRIGGER AS $$
      DECLARE superadmin_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO superadmin_count FROM nexapay_users WHERE role = 'SUPER_ADMIN';
        IF (OLD.role = 'SUPER_ADMIN' AND superadmin_count <= 2) THEN
          RAISE EXCEPTION 'Action bloquée : Impossible de supprimer ce compte, il faut conserver au moins 2 SuperAdmins actifs.';
        END IF;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS enforce_superadmin_delete_protection ON nexapay_users;
      CREATE TRIGGER enforce_superadmin_delete_protection
        BEFORE DELETE ON nexapay_users FOR EACH ROW
        EXECUTE FUNCTION protect_minimum_superadmins_delete();
    `);
    return pool;
  })().catch((e) => {
    poolPromise = null;
    throw e;
  });
  return poolPromise;
}

async function upsertRow(table, columns, row) {
  const pool = await getPool();
  const cols = ["id", ...columns];
  const values = cols.map((c) => (row[c] === undefined ? null : row[c]));
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(",");
  const updates = columns.map((c) => `${c}=EXCLUDED.${c}`).join(",");
  await pool.query(
    `INSERT INTO ${table} (${cols.join(",")}) VALUES (${placeholders})
     ON CONFLICT (id) DO UPDATE SET ${updates}`,
    values
  );
}

export async function neonPing() {
  const pool = await getPool();
  const r = await pool.query("SELECT version() AS v");
  return r.rows[0]?.v || "unknown";
}

export async function neonExec(text, params = []) {
  const pool = await getPool();
  return pool.query(text, params);
}

// --- Live per-write mirrors (hot path: payments) ---
export async function mirrorTransaction(tx) {
  await upsertRow("nexapay_transactions", [
    "tenant_id", "reference_fiat", "client_name", "amount_fiat", "currency_fiat", "gateway_fee",
    "nexapay_commission", "asset", "network", "usdt_amount", "usdt_net_sent", "exchange_rate",
    "payment_method", "crypto_provider", "destination_wallet", "status", "payload_base64",
    "tx_hash_crypto", "error_message", "created_date", "updated_date",
  ], tx);
}

export async function mirrorLog(rec) {
  await upsertRow("nexapay_transaction_logs", [
    "transaction_id", "reference_fiat", "from_status", "to_status", "level", "message",
    "actor", "created_date",
  ], rec);
}

// --- Per-entity upserts (config + admin data) ---
export async function mirrorUser(r) {
  await upsertRow("nexapay_users", ["full_name", "email", "role", "tenant_id", "phone_number", "kyc_status", "created_date"], r);
}
export async function mirrorTenant(r) {
  await upsertRow("nexapay_tenants", [
    "company_name", "tier", "has_paid_access", "account_status", "daily_limit", "commission_rate",
    "checkout_primary_color", "logo_url", "kyc_status", "kyc_doc_url", "selfie_url",
    "id_name", "id_number", "phone", "receiving_wallet", "blockchain", "onboarding_complete",
    "created_date", "updated_date",
  ], r);
}
export async function mirrorApiKey(r) {
  await upsertRow("nexapay_api_keys", [
    "label", "secret_key", "publishable_key", "active", "last_used", "created_date", "updated_date",
  ], r);
}
export async function mirrorAppSetting(r) {
  await upsertRow("nexapay_app_settings", ["key", "value", "created_date", "updated_date"], r);
}
export async function mirrorCryptoWallet(r) {
  await upsertRow("nexapay_crypto_wallets", [
    "label", "address", "chain", "currency", "is_default", "created_date", "updated_date",
  ], r);
}
export async function mirrorCurrencyConfig(r) {
  await upsertRow("nexapay_currency_configs", [
    "code", "label", "symbol", "enabled", "auto_convert", "min_threshold", "margin_pct",
    "created_date", "updated_date",
  ], r);
}
export async function mirrorProviderConfig(r) {
  await upsertRow("nexapay_provider_configs", [
    "provider", "label", "status", "enabled", "is_default", "api_key_label", "has_api_secret",
    "has_passphrase", "withdrawals_enabled", "success_rate", "last_checked", "notes",
    "created_date", "updated_date",
  ], r);
}
export async function mirrorSecurityIp(r) {
  await upsertRow("nexapay_security_ips", [
    "ip", "label", "active", "expires_at", "created_date", "updated_date",
  ], r);
}
export async function mirrorWebhookEndpoint(r) {
  await upsertRow("nexapay_webhook_endpoints", [
    "label", "url", "signing_secret", "active", "events", "created_date", "updated_date",
  ], r);
}
export async function mirrorWebhookLog(r) {
  await upsertRow("nexapay_webhook_logs", [
    "endpoint_url", "event", "order_id", "status", "http_status", "attempts", "response_snippet",
    "created_date", "updated_date",
  ], r);
}

export async function mirrorSuperadminAuditLog(r) {
  await upsertRow("nexapay_superadmin_audit_logs", [
    "admin_id", "admin_email", "action", "target_tenant_id", "details", "created_date",
  ], r);
}

// --- Full bulk snapshot: pulls every record of every entity and upserts it ---
export async function syncAllToNeon(base44) {
  const sr = base44.asServiceRole.entities;
  const tasks = [
    ["Tenant", sr.Tenant, mirrorTenant],
    ["User", sr.User, mirrorUser],
    ["ApiKey", sr.ApiKey, mirrorApiKey],
    ["AppSetting", sr.AppSetting, mirrorAppSetting],
    ["CryptoWallet", sr.CryptoWallet, mirrorCryptoWallet],
    ["CurrencyConfig", sr.CurrencyConfig, mirrorCurrencyConfig],
    ["ProviderConfig", sr.ProviderConfig, mirrorProviderConfig],
    ["SecurityIp", sr.SecurityIp, mirrorSecurityIp],
    ["Transaction", sr.Transaction, mirrorTransaction],
    ["TransactionLog", sr.TransactionLog, mirrorLog],
    ["WebhookEndpoint", sr.WebhookEndpoint, mirrorWebhookEndpoint],
    ["WebhookLog", sr.WebhookLog, mirrorWebhookLog],
    ["SuperadminAuditLog", sr.SuperadminAuditLog, mirrorSuperadminAuditLog],
  ];
  const counts = {};
  const PAGE = 500;
  for (const [name, entity, fn] of tasks) {
    try {
      let total = 0;
      let skip = 0;
      // Paginate through every record (list caps each call) so the mirror is complete.
      while (true) {
        const rows = await entity.list("-created_date", PAGE, skip);
        if (!rows || rows.length === 0) break;
        for (const r of rows) {
          try { await fn(r); } catch {}
        }
        total += rows.length;
        if (rows.length < PAGE) break;
        skip += PAGE;
      }
      counts[name] = total;
    } catch (e) {
      counts[name] = `error: ${e.message}`;
    }
  }
  return counts;
}