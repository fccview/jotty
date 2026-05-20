/**
 * Body Size Limit Patch (2026-04-27)
 *
 * Next.js 16 ignores `serverActions.bodySizeLimit` from next.config in standalone
 * builds, leaving the hard-coded 1MB cap baked into
 * node_modules/next/dist/compiled/next-server/app-page*.runtime.prod.js.
 * This patch rewrites that cap so server actions (file uploads, drawio attachments,
 * avatar uploads, etc.) accept payloads larger than 1MB.
 *
 * Configurable via the JOTTY_BODY_SIZE_LIMIT env var (default "100mb"). Accepts
 * the standard `<number><unit>` forms: b, kb, mb, gb (e.g. "50mb", "2gb").
 *
 * Idempotent: re-running with the same target is a no-op.
 *
 * See: https://github.com/fccview/jotty/issues/422
 */

const fs = require("fs");
const path = require("path");

const _RUNTIME_FILES = [
  "app-page.runtime.prod.js",
  "app-page-experimental.runtime.prod.js",
  "app-page-turbo.runtime.prod.js",
  "app-page-turbo-experimental.runtime.prod.js",
  "server.runtime.prod.js",
];

const _UNIT_BYTES = {
  b: 1,
  kb: 1024,
  mb: 1024 * 1024,
  gb: 1024 * 1024 * 1024,
};

const _parseLimit = (input) => {
  const raw = String(input || "100mb").trim().toLowerCase();
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) {
    throw new Error(`Invalid JOTTY_BODY_SIZE_LIMIT value: "${input}"`);
  }
  const amount = parseFloat(match[1]);
  const unit = match[2] || "mb";
  const bytes = Math.floor(amount * _UNIT_BYTES[unit]);
  return { label: `${amount}${unit}`, bytes };
};

const _patchFile = (filePath, label, bytes) => {
  if (!fs.existsSync(filePath)) return "missing";
  const original = fs.readFileSync(filePath, "utf8");
  let patched = original.replace(/"1 MB"/g, `"${label}"`);
  patched = patched.replace(
    /\.parse\(([a-zA-Z_$][\w$]*)\):1048576(?!\d)/g,
    `.parse($1):${bytes}`
  );
  patched = patched.replace(
    /(=[a-zA-Z_$][\w$]*\?\?)0xa00000(?!\d)/g,
    `$1${bytes}`
  );
  if (patched === original) return "noop";
  fs.writeFileSync(filePath, patched);
  return "patched";
};

const _collectRuntimeDirs = (projectRoot) => {
  const dirs = [
    path.join(projectRoot, "node_modules", "next", "dist", "compiled", "next-server"),
    path.join(
      projectRoot,
      ".next",
      "standalone",
      "node_modules",
      "next",
      "dist",
      "compiled",
      "next-server"
    ),
  ];
  return dirs.filter((d) => fs.existsSync(d));
};

module.exports = {
  name: "body-size-limit_20260427",
  apply: (ctx) => {
    const { label, bytes } = _parseLimit(process.env.JOTTY_BODY_SIZE_LIMIT);
    const dirs = _collectRuntimeDirs(ctx.projectRoot);
    const counts = { patched: 0, noop: 0, missing: 0 };
    for (const dir of dirs) {
      for (const fileName of _RUNTIME_FILES) {
        const status = _patchFile(path.join(dir, fileName), label, bytes);
        counts[status]++;
      }
    }
    return `limit=${label} (${bytes} bytes); patched=${counts.patched}, noop=${counts.noop}, missing=${counts.missing}`;
  },
};
