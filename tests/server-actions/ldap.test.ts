import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Client } from "ldapts";
import { resetAllMocks } from "../setup";

const MockClient = vi.mocked(Client);

const mockGetEnvOrFile = vi.fn();

vi.mock("@/app/_server/actions/file", () => ({
  getEnvOrFile: (...args: any[]) => mockGetEnvOrFile(...args),
}));

import { ldapLogin } from "@/app/_server/actions/auth/ldap";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_ENV = {
  LDAP_URL: "ldap://ldap.example.com:389",
  LDAP_BIND_DN: "cn=service,dc=example,dc=com",
  LDAP_BASE_DN: "ou=users,dc=example,dc=com",
};

const DEFAULT_ENTRY = {
  dn: "uid=alice,ou=users,dc=example,dc=com",
  memberOf: [] as string[],
};

function setupClient({
  serviceBindError,
  searchEntries = [DEFAULT_ENTRY],
  searchError,
  userBindError,
}: {
  serviceBindError?: Error;
  searchEntries?: any[];
  searchError?: Error;
  userBindError?: Error;
} = {}) {
  let bindCalls = 0;
  const mockBind = vi.fn().mockImplementation(async () => {
    bindCalls++;
    if (bindCalls === 1 && serviceBindError) throw serviceBindError;
    if (bindCalls >= 2 && userBindError) throw userBindError;
  });
  const mockSearch = vi.fn().mockImplementation(async () => {
    if (searchError) throw searchError;
    return { searchEntries };
  });
  const mockUnbind = vi.fn().mockResolvedValue(undefined);

  MockClient.mockImplementation(function () {
    return { bind: mockBind, search: mockSearch, unbind: mockUnbind };
  } as any);

  return { mockBind, mockSearch, mockUnbind };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ldapLogin()", () => {
  beforeEach(() => {
    resetAllMocks();
    Object.assign(process.env, BASE_ENV);
    delete process.env.LDAP_USER_ATTRIBUTE;
    delete process.env.LDAP_ADMIN_GROUPS;
    delete process.env.LDAP_USER_GROUPS;
    mockGetEnvOrFile.mockResolvedValue("service-password");
    setupClient();
  });

  afterEach(() => {
    for (const key of [
      "LDAP_URL",
      "LDAP_BIND_DN",
      "LDAP_BASE_DN",
      "LDAP_USER_ATTRIBUTE",
      "LDAP_ADMIN_GROUPS",
      "LDAP_USER_GROUPS",
    ]) {
      delete process.env[key];
    }
  });

  // Core credential checks

  it("returns invalid_credentials when user is not found in the directory", async () => {
    setupClient({ searchEntries: [] });
    const result = await ldapLogin("alice", "password");
    expect(result).toEqual({ ok: false, kind: "invalid_credentials" });
  });

  it("returns invalid_credentials when the user bind fails (wrong password)", async () => {
    setupClient({ userBindError: new Error("Invalid credentials") });
    const result = await ldapLogin("alice", "wrongpassword");
    expect(result).toEqual({ ok: false, kind: "invalid_credentials" });
  });

  it("returns { ok: true } on successful bind with no group restrictions configured", async () => {
    const result = await ldapLogin("alice", "password");
    expect(result).toEqual({ ok: true, username: "alice", isAdmin: false });
  });

  // Connection errors — must NOT appear as invalid_credentials

  it("returns connection_error when the service account bind throws a network error", async () => {
    setupClient({ serviceBindError: new Error("ECONNREFUSED") });
    const result = await ldapLogin("alice", "password");
    expect(result).toEqual({ ok: false, kind: "connection_error" });
  });

  it("returns connection_error when the search throws (e.g. timeout)", async () => {
    setupClient({ searchError: new Error("Timeout") });
    const result = await ldapLogin("alice", "password");
    expect(result).toEqual({ ok: false, kind: "connection_error" });
  });

  // Group-based access control

  it("returns unauthorized when LDAP_USER_GROUPS is set and user has no matching memberOf", async () => {
    process.env.LDAP_USER_GROUPS = "cn=jotty,ou=groups,dc=example,dc=com";
    setupClient({
      searchEntries: [{ dn: DEFAULT_ENTRY.dn, memberOf: [] }],
    });
    const result = await ldapLogin("alice", "password");
    expect(result).toEqual({ ok: false, kind: "unauthorized" });
  });

  it("returns { ok: true } when user is in LDAP_USER_GROUPS", async () => {
    process.env.LDAP_USER_GROUPS = "cn=jotty,ou=groups,dc=example,dc=com";
    setupClient({
      searchEntries: [
        {
          dn: DEFAULT_ENTRY.dn,
          memberOf: "cn=jotty,ou=groups,dc=example,dc=com",
        },
      ],
    });
    const result = await ldapLogin("alice", "password");
    expect(result).toMatchObject({ ok: true, username: "alice" });
  });

  it("returns { ok: true } with isAdmin=false when in LDAP_USER_GROUPS but not LDAP_ADMIN_GROUPS", async () => {
    process.env.LDAP_USER_GROUPS = "cn=jotty,ou=groups,dc=example,dc=com";
    process.env.LDAP_ADMIN_GROUPS = "cn=admins,ou=groups,dc=example,dc=com";
    setupClient({
      searchEntries: [
        {
          dn: DEFAULT_ENTRY.dn,
          memberOf: ["cn=jotty,ou=groups,dc=example,dc=com"],
        },
      ],
    });
    const result = await ldapLogin("alice", "password");
    expect(result).toEqual({ ok: true, username: "alice", isAdmin: false });
  });

  it("returns { ok: true } with isAdmin=true when user memberOf matches LDAP_ADMIN_GROUPS", async () => {
    process.env.LDAP_ADMIN_GROUPS = "cn=admins,ou=groups,dc=example,dc=com";
    setupClient({
      searchEntries: [
        {
          dn: DEFAULT_ENTRY.dn,
          memberOf: ["cn=admins,ou=groups,dc=example,dc=com"],
        },
      ],
    });
    const result = await ldapLogin("alice", "password");
    expect(result).toEqual({ ok: true, username: "alice", isAdmin: true });
  });

  it("returns { ok: true } for an admin user even when LDAP_USER_GROUPS is set and they are not in it", async () => {
    process.env.LDAP_USER_GROUPS = "cn=jotty,ou=groups,dc=example,dc=com";
    process.env.LDAP_ADMIN_GROUPS = "cn=admins,ou=groups,dc=example,dc=com";
    setupClient({
      searchEntries: [
        {
          dn: DEFAULT_ENTRY.dn,
          memberOf: ["cn=admins,ou=groups,dc=example,dc=com"],
        },
      ],
    });
    const result = await ldapLogin("alice", "password");
    expect(result).toEqual({ ok: true, username: "alice", isAdmin: true });
  });

  // Config

  it("uses uid as the default search attribute when LDAP_USER_ATTRIBUTE is not set", async () => {
    const { mockSearch } = setupClient();
    await ldapLogin("alice", "password");
    expect(mockSearch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ filter: "(uid=alice)" })
    );
  });

  it("uses LDAP_USER_ATTRIBUTE when set (e.g. sAMAccountName)", async () => {
    process.env.LDAP_USER_ATTRIBUTE = "sAMAccountName";
    const { mockSearch } = setupClient();
    await ldapLogin("alice", "password");
    expect(mockSearch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ filter: "(sAMAccountName=alice)" })
    );
  });

  // Cleanup

  it("calls unbind after a successful authentication", async () => {
    const { mockUnbind } = setupClient();
    await ldapLogin("alice", "password");
    expect(mockUnbind).toHaveBeenCalledOnce();
  });

  it("calls unbind even when the user bind fails", async () => {
    const { mockUnbind } = setupClient({
      userBindError: new Error("Invalid credentials"),
    });
    await ldapLogin("alice", "wrongpassword");
    expect(mockUnbind).toHaveBeenCalledOnce();
  });
});
