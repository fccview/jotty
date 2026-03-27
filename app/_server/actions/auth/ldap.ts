import { Client } from "ldapts";
import { getEnvOrFile } from "@/app/_server/actions/file";

export type LdapLoginResult =
  | { ok: true; username: string; isAdmin: boolean }
  | { ok: false; kind: "invalid_credentials" }
  | { ok: false; kind: "unauthorized" }
  | { ok: false; kind: "connection_error" };

function escapeLdapFilter(value: string): string {
  return value
    .replace(/\\/g, "\\5c")
    .replace(/\*/g, "\\2a")
    .replace(/\(/g, "\\28")
    .replace(/\)/g, "\\29")
    .replace(/\0/g, "\\00");
}

export async function ldapLogin(
  username: string,
  password: string
): Promise<LdapLoginResult> {
  const url = process.env.LDAP_URL;
  const bindDN = process.env.LDAP_BIND_DN;
  const bindPassword = await getEnvOrFile(
    "LDAP_BIND_PASSWORD",
    "LDAP_BIND_PASSWORD_FILE"
  );
  const baseDN = process.env.LDAP_BASE_DN;
  const userAttribute = process.env.LDAP_USER_ATTRIBUTE || "uid";

  if (!url || !bindDN || !bindPassword || !baseDN) {
    if (process.env.DEBUGGER) {
      console.error("LDAP - Missing required configuration:", {
        url: !!url,
        bindDN: !!bindDN,
        bindPassword: !!bindPassword,
        baseDN: !!baseDN,
      });
    }
    return { ok: false, kind: "connection_error" };
  }

  const client = new Client({ url });

  try {
    // Step 1: bind as service account to gain search access
    try {
      await client.bind(bindDN, bindPassword);
    } catch (err) {
      if (process.env.DEBUGGER) {
        console.error("LDAP - Service account bind failed:", err);
      }
      return { ok: false, kind: "connection_error" };
    }

    // Step 2: search for the user entry by configured attribute
    let userDN = "";
    let memberOf: string[] = [];

    try {
      const { searchEntries } = await client.search(baseDN, {
        filter: `(${userAttribute}=${escapeLdapFilter(username)})`,
        attributes: ["dn", "memberOf"],
      });

      if (searchEntries.length === 0) {
        return { ok: false, kind: "invalid_credentials" };
      }

      const entry = searchEntries[0];
      userDN = entry.dn;

      const raw = entry["memberOf"];
      if (Array.isArray(raw)) {
        memberOf = raw as string[];
      } else if (typeof raw === "string") {
        memberOf = [raw];
      }
    } catch (err) {
      if (process.env.DEBUGGER) {
        console.error("LDAP - User search failed:", err);
      }
      return { ok: false, kind: "connection_error" };
    }

    // Step 3: bind as the found user to verify their password
    try {
      await client.bind(userDN, password);
    } catch (err) {
      return { ok: false, kind: "invalid_credentials" };
    }

    // Step 4: apply group-based access control
    const adminGroupList = (process.env.LDAP_ADMIN_GROUPS || "")
      .split("|")
      .map((g) => g.trim())
      .filter(Boolean);

    const userGroupList = (process.env.LDAP_USER_GROUPS || "")
      .split("|")
      .map((g) => g.trim())
      .filter(Boolean);

    const isAdmin =
      adminGroupList.length > 0 &&
      adminGroupList.some((g) => memberOf.includes(g));

    if (userGroupList.length > 0) {
      const isInUserGroup = userGroupList.some((g) => memberOf.includes(g));
      if (!isInUserGroup && !isAdmin) {
        if (process.env.DEBUGGER) {
          console.log("LDAP - User not in allowed groups:", {
            username,
            requiredGroups: process.env.LDAP_USER_GROUPS,
            memberOf,
          });
        }
        return { ok: false, kind: "unauthorized" };
      }
    }

    if (process.env.DEBUGGER) {
      console.log("LDAP - Login successful:", { username, isAdmin });
    }

    return { ok: true, username, isAdmin };
  } finally {
    try {
      await client.unbind();
    } catch {}
  }
}
