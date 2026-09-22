// Emails automatically recognized as SUPER_ADMIN with full, unrestricted platform access
// (bypass merchant onboarding / payment). Mirrored in the backend function superadminRoles.
export const SUPERADMIN_EMAILS = [
  "vincentnogue@yahoo.com",
  "vincentnogue2@gmail.com",
  "webdxb1@gmail.com",
];

export const isSuperAdmin = (me) =>
  !!me && (me.role === "SUPER_ADMIN" || SUPERADMIN_EMAILS.includes(me.email));