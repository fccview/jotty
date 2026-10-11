const fs = require("fs");
const path = require("path");
const { patches } = require("./locale-patches.cjs");

const deepMerge = (target, source) => {
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (
      sv !== null &&
      typeof sv === "object" &&
      !Array.isArray(sv) &&
      tv !== null &&
      typeof tv === "object" &&
      !Array.isArray(tv)
    ) {
      deepMerge(tv, sv);
    } else {
      target[key] = sv;
    }
  }
  return target;
};

const translationsDir = path.join(__dirname, "..", "..", "app", "_translations");

for (const [locale, patch] of Object.entries(patches)) {
  const filePath = path.join(translationsDir, `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  deepMerge(data, patch);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

process.stdout.write(`Patched: ${Object.keys(patches).sort().join(", ")}\n`);
