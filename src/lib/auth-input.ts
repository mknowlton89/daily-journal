const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const NAME_MAX_LENGTH = 80;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_BYTES = 72;

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

export function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > NAME_MAX_LENGTH) return null;
  return name;
}

export function passwordByteLength(password: string) {
  return new TextEncoder().encode(password).length;
}

export function validateNewPassword(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length < PASSWORD_MIN_LENGTH) return null;
  if (passwordByteLength(value) > PASSWORD_MAX_BYTES) return null;
  return value;
}

export function readPassword(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  return value;
}

export function googleSignInDecision(
  existing: { password?: string | null } | null
): "create" | "allow" | "deny" {
  if (!existing) return "create";
  if (existing.password) return "deny";
  return "allow";
}
