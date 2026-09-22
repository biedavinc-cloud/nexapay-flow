// Comprehensive country + dialing-code reference for NexaPay checkout & onboarding.
// francZone marks CFA (XAF / XOF) markets where Mobile Money is the dominant rail.

export const COUNTRIES = [
  { code: "CM", name: "Cameroun", dial: "+237", flag: "🇨🇲", currency: "XAF", francZone: true },
  { code: "CI", name: "Côte d'Ivoire", dial: "+225", flag: "🇨🇮", currency: "XOF", francZone: true },
  { code: "SN", name: "Sénégal", dial: "+221", flag: "🇸🇳", currency: "XOF", francZone: true },
  { code: "ML", name: "Mali", dial: "+223", flag: "🇲🇱", currency: "XOF", francZone: true },
  { code: "BF", name: "Burkina Faso", dial: "+226", flag: "🇧🇫", currency: "XOF", francZone: true },
  { code: "BJ", name: "Bénin", dial: "+229", flag: "🇧🇯", currency: "XOF", francZone: true },
  { code: "NE", name: "Niger", dial: "+227", flag: "🇳🇪", currency: "XOF", francZone: true },
  { code: "TG", name: "Togo", dial: "+228", flag: "🇹🇬", currency: "XOF", francZone: true },
  { code: "GW", name: "Guinée-Bissau", dial: "+245", flag: "🇬🇼", currency: "XOF", francZone: true },
  { code: "CG", name: "Congo", dial: "+242", flag: "🇨🇬", currency: "XAF", francZone: true },
  { code: "GA", name: "Gabon", dial: "+241", flag: "🇬🇦", currency: "XAF", francZone: true },
  { code: "TD", name: "Tchad", dial: "+235", flag: "🇹🇩", currency: "XAF", francZone: true },
  { code: "CF", name: "Centrafrique", dial: "+236", flag: "🇨🇫", currency: "XAF", francZone: true },
  { code: "GQ", name: "Guinée Équatoriale", dial: "+240", flag: "🇬🇶", currency: "XAF", francZone: true },
  { code: "GN", name: "Guinée", dial: "+224", flag: "🇬🇳", currency: "GNF" },
  { code: "CD", name: "RD Congo", dial: "+243", flag: "🇨🇩", currency: "CDF" },
  { code: "MA", name: "Maroc", dial: "+212", flag: "🇲🇦", currency: "MAD" },
  { code: "DZ", name: "Algérie", dial: "+213", flag: "🇩🇿", currency: "DZD" },
  { code: "TN", name: "Tunisie", dial: "+216", flag: "🇹🇳", currency: "TND" },
  { code: "EG", name: "Égypte", dial: "+20", flag: "🇪🇬", currency: "EGP" },
  { code: "NG", name: "Nigeria", dial: "+234", flag: "🇳🇬", currency: "NGN" },
  { code: "GH", name: "Ghana", dial: "+233", flag: "🇬🇭", currency: "GHS" },
  { code: "KE", name: "Kenya", dial: "+254", flag: "🇰🇪", currency: "KES" },
  { code: "TZ", name: "Tanzanie", dial: "+255", flag: "🇹🇿", currency: "TZS" },
  { code: "UG", name: "Ouganda", dial: "+256", flag: "🇺🇬", currency: "UGX" },
  { code: "RW", name: "Rwanda", dial: "+250", flag: "🇷🇼", currency: "RWF" },
  { code: "ZA", name: "Afrique du Sud", dial: "+27", flag: "🇿🇦", currency: "ZAR" },
  { code: "AE", name: "Émirats Arabes Unis", dial: "+971", flag: "🇦🇪", currency: "AED" },
  { code: "SA", name: "Arabie Saoudite", dial: "+966", flag: "🇸🇦", currency: "SAR" },
  { code: "QA", name: "Qatar", dial: "+974", flag: "🇶🇦", currency: "QAR" },
  { code: "KW", name: "Koweït", dial: "+965", flag: "🇰🇼", currency: "KWD" },
  { code: "BH", name: "Bahreïn", dial: "+973", flag: "🇧🇭", currency: "BHD" },
  { code: "OM", name: "Oman", dial: "+968", flag: "🇴🇲", currency: "OMR" },
  { code: "JO", name: "Jordanie", dial: "+962", flag: "🇯🇴", currency: "JOD" },
  { code: "LB", name: "Liban", dial: "+961", flag: "🇱🇧", currency: "LBP" },
  { code: "IL", name: "Israël", dial: "+972", flag: "🇮🇱", currency: "ILS" },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷", currency: "EUR" },
  { code: "BE", name: "Belgique", dial: "+32", flag: "🇧🇪", currency: "EUR" },
  { code: "CH", name: "Suisse", dial: "+41", flag: "🇨🇭", currency: "CHF" },
  { code: "LU", name: "Luxembourg", dial: "+352", flag: "🇱🇺", currency: "EUR" },
  { code: "MC", name: "Monaco", dial: "+377", flag: "🇲🇨", currency: "EUR" },
  { code: "DE", name: "Allemagne", dial: "+49", flag: "🇩🇪", currency: "EUR" },
  { code: "AT", name: "Autriche", dial: "+43", flag: "🇦🇹", currency: "EUR" },
  { code: "ES", name: "Espagne", dial: "+34", flag: "🇪🇸", currency: "EUR" },
  { code: "IT", name: "Italie", dial: "+39", flag: "🇮🇹", currency: "EUR" },
  { code: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹", currency: "EUR" },
  { code: "NL", name: "Pays-Bas", dial: "+31", flag: "🇳🇱", currency: "EUR" },
  { code: "IE", name: "Irlande", dial: "+353", flag: "🇮🇪", currency: "EUR" },
  { code: "GR", name: "Grèce", dial: "+30", flag: "🇬🇷", currency: "EUR" },
  { code: "PL", name: "Pologne", dial: "+48", flag: "🇵🇱", currency: "PLN" },
  { code: "SE", name: "Suède", dial: "+46", flag: "🇸🇪", currency: "SEK" },
  { code: "NO", name: "Norvège", dial: "+47", flag: "🇳🇴", currency: "NOK" },
  { code: "DK", name: "Danemark", dial: "+45", flag: "🇩🇰", currency: "DKK" },
  { code: "FI", name: "Finlande", dial: "+358", flag: "🇫🇮", currency: "EUR" },
  { code: "CZ", name: "Tchéquie", dial: "+420", flag: "🇨🇿", currency: "CZK" },
  { code: "RO", name: "Roumanie", dial: "+40", flag: "🇷🇴", currency: "RON" },
  { code: "HU", name: "Hongrie", dial: "+36", flag: "🇭🇺", currency: "HUF" },
  { code: "BG", name: "Bulgarie", dial: "+359", flag: "🇧🇬", currency: "BGN" },
  { code: "HR", name: "Croatie", dial: "+385", flag: "🇭🇷", currency: "EUR" },
  { code: "GB", name: "Royaume-Uni", dial: "+44", flag: "🇬🇧", currency: "GBP" },
  { code: "US", name: "États-Unis", dial: "+1", flag: "🇺🇸", currency: "USD" },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦", currency: "CAD" },
  { code: "BR", name: "Brésil", dial: "+55", flag: "🇧🇷", currency: "BRL" },
  { code: "MX", name: "Mexique", dial: "+52", flag: "🇲🇽", currency: "MXN" },
  { code: "IN", name: "Inde", dial: "+91", flag: "🇮🇳", currency: "INR" },
  { code: "PK", name: "Pakistan", dial: "+92", flag: "🇵🇰", currency: "PKR" },
  { code: "BD", name: "Bangladesh", dial: "+880", flag: "🇧🇩", currency: "BDT" },
  { code: "PH", name: "Philippines", dial: "+63", flag: "🇵🇭", currency: "PHP" },
  { code: "ID", name: "Indonésie", dial: "+62", flag: "🇮🇩", currency: "IDR" },
  { code: "TH", name: "Thaïlande", dial: "+66", flag: "🇹🇭", currency: "THB" },
  { code: "VN", name: "Vietnam", dial: "+84", flag: "🇻🇳", currency: "VND" },
  { code: "MY", name: "Malaisie", dial: "+60", flag: "🇲🇾", currency: "MYR" },
  { code: "SG", name: "Singapour", dial: "+65", flag: "🇸🇬", currency: "SGD" },
  { code: "CN", name: "Chine", dial: "+86", flag: "🇨🇳", currency: "CNY" },
  { code: "JP", name: "Japon", dial: "+81", flag: "🇯🇵", currency: "JPY" },
  { code: "KR", name: "Corée du Sud", dial: "+82", flag: "🇰🇷", currency: "KRW" },
  { code: "TR", name: "Turquie", dial: "+90", flag: "🇹🇷", currency: "TRY" },
  { code: "RU", name: "Russie", dial: "+7", flag: "🇷🇺", currency: "RUB" },
  { code: "AU", name: "Australie", dial: "+61", flag: "🇦🇺", currency: "AUD" },
  { code: "NZ", name: "Nouvelle-Zélande", dial: "+64", flag: "🇳🇿", currency: "NZD" },
];

// Mobile Money operator auto-detection rules keyed by dial code (without '+').
export const OPERATOR_RULES = {
  "237": [
    { op: "Orange Money", prefixes: ["69", "655", "656", "657", "658", "659", "7"] },
    { op: "MTN Mobile Money", prefixes: ["67", "68"] },
    { op: "Nextel Money", prefixes: ["66"] },
  ],
  "225": [
    { op: "Orange Money", prefixes: ["07", "47", "87"] },
    { op: "MTN MoMo", prefixes: ["05", "45", "85"] },
    { op: "Moov Money", prefixes: ["01", "41", "81"] },
    { op: "Wave", prefixes: ["02", "27", "57"] },
  ],
  "221": [
    { op: "Orange Money", prefixes: ["77", "78"] },
    { op: "Wave", prefixes: ["76", "70"] },
    { op: "Free Money", prefixes: ["76"] },
  ],
  "223": [
    { op: "Orange Money", prefixes: ["6", "7"] },
    { op: "Moov Money", prefixes: ["5"] },
  ],
  "226": [
    { op: "Orange Money", prefixes: ["6"] },
    { op: "Moov Money", prefixes: ["7"] },
  ],
  "229": [
    { op: "MTN MoMo", prefixes: ["6"] },
    { op: "Moov Money", prefixes: ["9", "61", "62", "63", "64", "65"] },
  ],
  "227": [
    { op: "Moov Money", prefixes: ["8"] },
    { op: "Airtel Money", prefixes: ["9"] },
  ],
  "228": [
    { op: "Moov Money", prefixes: ["9", "7"] },
    { op: "Togocel Money", prefixes: ["2", "8"] },
  ],
};

export function detectOperator(dial, localNumber) {
  const d = (dial || "").replace(/\D/g, "");
  const rules = OPERATOR_RULES[d];
  if (!rules) return "";
  const n = (localNumber || "").replace(/\D/g, "");
  if (!n) return "";
  let match = "";
  let matchLen = 0;
  for (const r of rules) {
    for (const p of r.prefixes) {
      if (n.startsWith(p) && p.length > matchLen) {
        match = r.op;
        matchLen = p.length;
      }
    }
  }
  return match;
}

export const FRANC_ZONE_FIRST = [...COUNTRIES].sort((a, b) => {
  if (a.francZone && !b.francZone) return -1;
  if (!a.francZone && b.francZone) return 1;
  return 0;
});

export const ALL_DIALS = Array.from(new Set(COUNTRIES.map((c) => c.dial))).sort();