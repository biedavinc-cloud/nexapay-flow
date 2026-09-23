// Admin Back-Office: dynamic PSP & API key management.
// List (masked keys) + save (encrypts credentials before persisting). Admin/SUPER_ADMIN only.
// Updating keys here takes effect immediately across all NexaPay payment endpoints, because
// the shared PSP modules resolve the active PspConfig at request time (DB-first, env fallback).
import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { encryptConfig, decryptConfig, maskKeys } from "../../shared/pspCrypto.ts";

const PROVIDERS = ["KORAPAY", "PAYUNIT", "STRIPE", "FLUTTERWAVE", "PAYSTACK", "MONNIFY", "PAWAPAY", "BIZAO"];
const LABELS = {
  KORAPAY: "Korapay", PAYUNIT: "PayUnit", STRIPE: "Stripe", FLUTTERWAVE: "Flutterwave",
  PAYSTACK: "Paystack", MONNIFY: "Monnify", PAWAPAY: "Pawapay", BIZAO: "Bizao",
};

async function requireAdmin(base44) {
  try {
    const me = await base44.auth.me();
    if (me && (me.role === "admin" || me.role === "SUPER_ADMIN")) return me;
  } catch {}
  return null;
}

export default async function (req) {
  const base44 = createClientFromRequest(req);
  try {
    const me = await requireAdmin(base44);
    if (!me) return Response.json({ error: "Forbidden — admin only." }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || "list";

    if (action === "list") {
      const list = await base44.asServiceRole.entities.PspConfig.list("-updated_date", 50);
      const out = [];
      for (const c of list) {
        let masked = {};
        try {
          const creds = await decryptConfig(c.config_encrypted);
          const env = c.environment || "sandbox";
          const ec = (creds && (creds[env] || creds.sandbox || creds.live)) || creds || {};
          masked = maskKeys(ec);
        } catch {}
        out.push({
          id: c.id, provider: c.provider, label: c.label, active: c.active,
          environment: c.environment, priority_card: c.priority_card, priority_momo: c.priority_momo,
          has_keys: c.has_keys, notes: c.notes, masked_keys: masked, updated_date: c.updated_date,
        });
      }
      return Response.json({ configs: out });
    }

    if (action === "save") {
      const provider = String(body.provider || "").toUpperCase();
      if (!PROVIDERS.includes(provider)) return Response.json({ error: "Unknown provider." }, { status: 400 });
      const environment = body.environment === "live" ? "live" : "sandbox";

      const existing = (await base44.asServiceRole.entities.PspConfig.filter({ provider }, "-updated_date", 1))[0];
      let creds = {};
      if (existing && existing.config_encrypted) {
        const d = await decryptConfig(existing.config_encrypted);
        if (d) creds = d;
      }
      // Merge incoming credentials for the selected environment (skip empty / masked values
      // so a masked placeholder never overwrites a stored secret).
      const incoming = body.credentials || {};
      const envCreds = { ...(creds[environment] || {}) };
      for (const [k, v] of Object.entries(incoming)) {
        const s = String(v ?? "").trim();
        if (s && !s.includes("•")) envCreds[k] = s;
      }
      creds[environment] = envCreds;
      const hasKeys = Object.keys(envCreds).length > 0;
      const configEncrypted = hasKeys ? await encryptConfig(creds) : (existing?.config_encrypted || "");

      const data = {
        provider,
        label: LABELS[provider],
        active: body.active !== undefined ? !!body.active : (existing?.active ?? false),
        environment,
        priority_card: Number(body.priority_card ?? existing?.priority_card ?? 0),
        priority_momo: Number(body.priority_momo ?? existing?.priority_momo ?? 0),
        config_encrypted: configEncrypted,
        has_keys: hasKeys || (existing?.has_keys ?? false),
        notes: body.notes !== undefined ? String(body.notes || "") : (existing?.notes || ""),
      };

      if (existing) await base44.asServiceRole.entities.PspConfig.update(existing.id, data);
      else await base44.asServiceRole.entities.PspConfig.create(data);

      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}