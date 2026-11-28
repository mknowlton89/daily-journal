import { describe, expect, it } from "vitest";
import {
  googleSignInDecision,
  normalizeEmail,
  normalizeName,
  validateNewPassword,
} from "@/lib/auth-input";

describe("auth input", () => {
  it("normalizes email and rejects values that are not email strings", () => {
    expect(normalizeEmail("  Ada@Example.com ")).toBe("ada@example.com");
    expect(normalizeEmail("not-an-email")).toBeNull();
    expect(normalizeEmail({ $gt: "" })).toBeNull();
    expect(normalizeEmail("")).toBeNull();
  });

  it("trims names and caps their length", () => {
    expect(normalizeName("  Ada   Lovelace  ")).toBe("Ada Lovelace");
    expect(normalizeName("   ")).toBeNull();
    expect(normalizeName("a".repeat(81))).toBeNull();
    expect(normalizeName(12)).toBeNull();
  });

  it("accepts a new password without changing its characters", () => {
    expect(validateNewPassword("  correct horse  ")).toBe("  correct horse  ");
    expect(validateNewPassword("short")).toBeNull();
    expect(validateNewPassword("a".repeat(73))).toBeNull();
    expect(validateNewPassword({ length: 12 })).toBeNull();
  });

  it("refuses to attach Google sign-in to a password account", () => {
    expect(googleSignInDecision(null)).toBe("create");
    expect(googleSignInDecision({ password: undefined })).toBe("allow");
    expect(googleSignInDecision({ password: "hashed" })).toBe("deny");
  });
});
