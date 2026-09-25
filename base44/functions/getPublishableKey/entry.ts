import { getPublishableKey } from "../../shared/checkout.ts";

// Publishable keys are, by design, safe to expose (same model as Stripe's
// pk_*): this endpoint requires no auth. It exists so the frontend never
// needs to hardcode the key -- NEXAPAY_PUBLISHABLE_KEY (Base44 secret)
// stays the single source of truth instead of drifting between the backend
// secret and a copy pasted into the frontend build.
export default async function () {
  try {
    return Response.json({ publishable_key: getPublishableKey() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 503 });
  }
}
