import { describe, it, expect } from "vitest";
import {
  toPublicUser,
  sanitizeUserForClient,
  sanitizeUserForPublic,
} from "@/app/_utils/user-sanitize-utils";
import { User } from "@/app/_types";

const SECRET_FIELDS = [
  "passwordHash",
  "apiKey",
  "mfaSecret",
  "mfaRecoveryCode",
] as const;

const SECRET_VALUES = [
  "super_secret_hash",
  "super_secret_api_key",
  "super_secret_mfa",
  "super_secret_recovery",
];

const makeUser = (extra?: Partial<User>): User =>
  ({
    username: "gandalf",
    passwordHash: "super_secret_hash",
    apiKey: "super_secret_api_key",
    mfaSecret: "super_secret_mfa",
    mfaRecoveryCode: "super_secret_recovery",
    mfaEnabled: true,
    lastLogin: "2024-01-01T00:00:00.000Z",
    isAdmin: true,
    isSuperAdmin: false,
    avatarUrl: "/uploads/gandalf.png",
    ...extra,
  }) as User;

describe("toPublicUser", () => {
  it("should return null for a null user", () => {
    expect(toPublicUser(null)).toBeNull();
  });

  it("should build a new object rather than casting the record", () => {
    const user = makeUser();

    const result = toPublicUser(user);

    expect(result).not.toBe(user);
    expect(result).toEqual({
      username: "gandalf",
      isAdmin: true,
      isSuperAdmin: false,
      avatarUrl: "/uploads/gandalf.png",
    });
  });

  it("should expose exactly the allowed public keys", () => {
    const result = toPublicUser(makeUser());

    expect(Object.keys(result!).sort()).toEqual([
      "avatarUrl",
      "isAdmin",
      "isSuperAdmin",
      "username",
    ]);
  });

  it("should strip credentials, mfa secrets and lastLogin at runtime", () => {
    const result = toPublicUser(makeUser());

    SECRET_FIELDS.forEach((field) => {
      expect(result).not.toHaveProperty(field);
    });

    expect(result).not.toHaveProperty("lastLogin");
    expect(result).not.toHaveProperty("mfaEnabled");

    SECRET_VALUES.forEach((secret) => {
      expect(JSON.stringify(result)).not.toContain(secret);
    });
  });

  it("should drop unknown fields added to the user record later", () => {
    const user = makeUser({ pgpPrivateKey: "leaky_private_key" } as never);

    const result = toPublicUser(user);

    expect(result).not.toHaveProperty("pgpPrivateKey");
    expect(JSON.stringify(result)).not.toContain("leaky_private_key");
  });

  it("should not let callers mutate the source record", () => {
    const user = makeUser();

    const result = toPublicUser(user)!;
    result.username = "saruman";

    expect(user.username).toBe("gandalf");
  });
});

describe("sanitizeUserForClient", () => {
  it("should return null for a null user", () => {
    expect(sanitizeUserForClient(null)).toBeNull();
  });

  it("should strip secrets while keeping settings fields", () => {
    const user = makeUser();

    const result = sanitizeUserForClient(user);

    expect(result).not.toBe(user);
    expect(result?.username).toBe("gandalf");
    expect(result?.mfaEnabled).toBe(true);

    SECRET_FIELDS.forEach((field) => {
      expect(result).not.toHaveProperty(field);
    });

    expect(result).not.toHaveProperty("lastLogin");

    SECRET_VALUES.forEach((secret) => {
      expect(JSON.stringify(result)).not.toContain(secret);
    });
  });
});

describe("sanitizeUserForPublic", () => {
  it("should return null for a null user", () => {
    expect(sanitizeUserForPublic(null)).toBeNull();
  });

  it("should return only the username by default", () => {
    const result = sanitizeUserForPublic(makeUser());

    expect(result).toEqual({ username: "gandalf" });
  });

  it("should include the avatar only when requested", () => {
    const result = sanitizeUserForPublic(makeUser(), true);

    expect(result).toEqual({
      username: "gandalf",
      avatarUrl: "/uploads/gandalf.png",
    });

    SECRET_VALUES.forEach((secret) => {
      expect(JSON.stringify(result)).not.toContain(secret);
    });
  });
});
