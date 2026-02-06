const fs = require("fs");
const path = require("path");

const standaloneDir = path.join(__dirname, "..", ".next", "standalone");

fs.copyFileSync(
  path.join(__dirname, "..", "server.js"),
  path.join(standaloneDir, "server.js")
);

const wsSource = path.join(__dirname, "..", "node_modules", "ws");
const wsDest = path.join(standaloneDir, "node_modules", "ws");

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(wsSource)) {
  copyDirSync(wsSource, wsDest);
}

console.log("Postbuild: custom server.js and ws module copied to standalone");
