import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = path.resolve(__dirname, "../..");
const APP = path.join(ROOT, "app");

const CALLER_GATES = new Set([
  "getCurrentUser",
  "getCurrentUserRecord",
  "getUsername",
  "isAdmin",
  "isAuthenticated",
  "canAccessAllContent",
  "sessionActor",
  "getSessionId",
  "cookies",
]);

const NEVER_AN_ACTION = [
  "createSession",
  "swapSession",
  "readSessions",
  "readSessionData",
  "removeSession",
  "removeAllSessionsForUser",
  "clearAllSessions",
  "updateSessionActivity",
  "getSessionsForUser",
  "authenticateApiKey",
  "ensureUser",
  "_updateUserCore",
  "_deleteUserCore",
  "getUserIndex",
  "getUserByItemUuid",
  "decryptMfaSecret",
  "encryptMfaSecret",
  "logAudit",
  "logAuthEvent",
  "logUserEvent",
  "logContentEvent",
  "getDailyLogPath",
  "getDateRange",
  "countOldLogs",
  "sweepOldLogs",
  "readNotesRecursively",
  "readListsRecursively",
  "buildCategoryTree",
  "categoriesFor",
  "canReach",
  "reachableFile",
  "canReachFile",
  "resolveAccess",
  "sharedFiles",
  "listMounts",
  "globalShares",
  "sharedForUser",
  "sharesInvolving",
  "allShared",
  "readCatInfo",
  "writeCatInfo",
  "patchCatInfo",
  "catUuid",
  "ensureRepo",
  "commitNote",
  "commitCategoryRename",
  "scanReminders",
];

const PUBLIC_ACTIONS: Record<string, string> = {
  "auth/index.ts#register": "first-run setup, refuses once a user exists",
  "auth/index.ts#login": "the login form",
  "auth/index.ts#verifyMfaLogin": "gated by the pending-MFA cookie",
  "config/settings.ts#getSettings": "public instance settings, no secrets",
  "config/settings.ts#getBorderRadius": "theme value for the login page",
  "config/css.ts#loadCustomCSS": "theme CSS for every page",
  "config/emojis.ts#loadCustomEmojis": "theme data for every page",
  "config/themes.ts#loadCustomThemes": "theme data for every page",
  "config/helpers.ts#readPackageVersion": "the running version",
  "github/index.ts#getLatestGitHubRelease": "fixed public URL",
  "users/queries.ts#hasUsers": "first-run check on the login page",
  "users/queries.ts#getPublicUser": "public profile fields only",
  "users/queries.ts#getUserByNoteUuid": "public owner fields for public pages",
  "users/queries.ts#getUserByChecklistUuid": "public owner fields for public pages",
  "dashboard/index.ts#toggleArchive": "delegates to updateNote/updateList, which check the caller",
  "share/lookups.ts#folderShares": "delegates to folderShares, which resolves the session user",
  "checklist/viewer.ts#getChecklistsForDisplay": "delegates to getUserChecklists, which uses the session",
  "note/viewer.ts#getNotesForDisplay": "delegates to getUserNotes, which uses the session",
  "checklist-item/reorder.ts#reorderItems": "delegates to rearrangeItems with the session user",
  "_utils/locale-utils.ts#getAvailableLocales": "static locale list",
  "_utils/locale-utils.ts#getAvailableLocalesWithNames": "static locale list",
};

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
};

const isServerModule = (source: ts.SourceFile): boolean => {
  const first = source.statements[0];
  return (
    !!first &&
    ts.isExpressionStatement(first) &&
    ts.isStringLiteral(first.expression) &&
    first.expression.text === "use server"
  );
};

const exportedName = (node: ts.Node): string[] => {
  const exported = ts.canHaveModifiers(node) &&
    ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

  if (ts.isExportDeclaration(node) && !node.isTypeOnly && node.exportClause && ts.isNamedExports(node.exportClause)) {
    return node.exportClause.elements.filter((e) => !e.isTypeOnly).map((e) => e.name.text);
  }
  if (!exported) return [];
  if (ts.isFunctionDeclaration(node) && node.name) return [node.name.text];
  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations
      .map((d) => d.name)
      .filter(ts.isIdentifier)
      .map((n) => n.text);
  }
  return [];
};

const localBodies = (source: ts.SourceFile): Map<string, ts.Node> => {
  const bodies = new Map<string, ts.Node>();
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      bodies.set(statement.name.text, statement);
    }
    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.initializer) {
          bodies.set(decl.name.text, decl.initializer);
        }
      }
    }
  }
  return bodies;
};

const reachesGate = (
  name: string,
  bodies: Map<string, ts.Node>,
  seen = new Set<string>(),
): boolean => {
  if (seen.has(name)) return false;
  seen.add(name);

  const body = bodies.get(name);
  if (!body) return false;

  let found = false;
  const visit = (node: ts.Node) => {
    if (found) return;
    if (ts.isIdentifier(node)) {
      if (CALLER_GATES.has(node.text)) found = true;
      else if (node.text !== name && bodies.has(node.text) && reachesGate(node.text, bodies, seen)) {
        found = true;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return found;
};

const surface = walk(APP).flatMap((file) => {
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  if (!isServerModule(source)) return [];

  const bodies = localBodies(source);
  const key = path.relative(path.join(APP, "_server/actions"), file).startsWith("..")
    ? path.relative(APP, file)
    : path.relative(path.join(APP, "_server/actions"), file);

  return source.statements.flatMap(exportedName).map((name) => ({
    id: `${key.split(path.sep).join("/")}#${name}`,
    name,
    reExported: !bodies.has(name),
    guarded: reachesGate(name, bodies),
  }));
});

describe("Security: every server action checks its caller", () => {
  it("finds the server action modules", () => {
    expect(surface.length).toBeGreaterThan(100);
  });

  it("never exposes an internal helper as a server action", () => {
    const exposed = surface.filter((entry) => NEVER_AN_ACTION.includes(entry.name));
    expect(exposed.map((entry) => entry.id)).toEqual([]);
  });

  it("does not re-export from a server action module", () => {
    expect(surface.filter((entry) => entry.reExported).map((entry) => entry.id)).toEqual([]);
  });

  it("reaches a caller check in every export, or is knowingly public", () => {
    const unguarded = surface
      .filter((entry) => !entry.guarded && !PUBLIC_ACTIONS[entry.id])
      .map((entry) => entry.id);

    expect(unguarded).toEqual([]);
  });

  it("keeps the public allowlist honest", () => {
    const ids = new Set(surface.map((entry) => entry.id));
    const stale = Object.keys(PUBLIC_ACTIONS).filter((id) => !ids.has(id));
    expect(stale).toEqual([]);
  });
});
