import { getPublishableKey } from "../../_lib/checkout.js";

// Publishable keys are meant to be public (Stripe pk_* model) -- no auth needed.
export async function onRequestGet({ env }) {
  try {
    return Response.json({ publishable_key: getPublishableKey(env) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 503 });
  }
}
