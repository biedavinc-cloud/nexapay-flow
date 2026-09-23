// Custom staff roles the SuperAdmin can assign to platform users.
// The backend (superadminRoles) stores the raw string on the User role field,
// so these values must stay stable.
export const STAFF_ROLES = [
  { value: "SUPER_ADMIN", label: "SuperAdmin", desc: "Accès complet à la plateforme & backoffice" },
  { value: "SUPPORT", label: "Support", desc: "Support clients, lecture des transactions" },
  { value: "FINANCE", label: "Finance", desc: "Taux, fournisseurs & trésorerie" },
  { value: "COMPLIANCE", label: "Compliance", desc: "KYC & validation des marchands" },
  { value: "DEVELOPER", label: "Développeur", desc: "Clés API & webhooks" },
  { value: "user", label: "Marchand", desc: "Compte marchand standard" },
];

export const roleLabel = (value) =>
  STAFF_ROLES.find((r) => r.value === value)?.label || value || "user";