import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// serverUrl intentionally omitted: the SDK defaults to https://base44.app,
// which is what we need now that this app is deployed on Cloudflare Pages
// (not Base44's own hosting). An explicit serverUrl: '' here previously
// forced same-origin calls, which broke every remaining base44.entities.*/
// base44.functions.invoke() call (and analytics) once off Base44 hosting --
// they hit /api/apps/.../... on the Cloudflare domain instead of base44.app.
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  appBaseUrl,
});
