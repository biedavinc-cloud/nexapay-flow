// Sending funds to a malformed address is irreversible -- validate before saving.
export function validateWallet(chain, address) {
  const a = String(address || "").trim();
  if (!a) return "Wallet address is required.";
  if (chain === "TRC20") return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a) ? null : "Invalid TRC20 (Tron) address.";
  if (chain === "POLYGON" || chain === "ERC20") return /^0x[a-fA-F0-9]{40}$/.test(a) ? null : "Invalid EVM address (0x + 40 hex characters).";
  return "Unsupported network.";
}
