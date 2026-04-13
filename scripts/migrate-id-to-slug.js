#!/usr/bin/env node
/**
 * Targeted .id -> .slug/.uuid migration script.
 * Only replaces .id on Checklist and Note types, using TypeScript error output as guidance.
 * Does NOT touch .id on Item types (checklist items).
 */
const fs = require('fs');
const { execSync } = require('child_process');

// Get TypeScript errors
const tscOutput = execSync('npx tsc --noEmit 2>&1 || true', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

// Parse errors for "Property 'id' does not exist on type 'Checklist'" and similar
const errorPattern = /^(.+)\((\d+),(\d+)\): error TS2339: Property 'id' does not exist on type '([^']+(?:Checklist|Note)[^']*)'/gm;
const errors = [];
let match;
while ((match = errorPattern.exec(tscOutput)) !== null) {
  errors.push({
    file: match[1],
    line: parseInt(match[2]),
    col: parseInt(match[3]),
    type: match[4],
  });
}

// Also catch TS2353 (object literal with unknown 'id' on Checklist/Note)
const errorPattern2 = /^(.+)\((\d+),(\d+)\): error TS2353: .+'id' does not exist in type '([^']*(?:Checklist|Note)[^']*)'/gm;
while ((match = errorPattern2.exec(tscOutput)) !== null) {
  errors.push({
    file: match[1],
    line: parseInt(match[2]),
    col: parseInt(match[3]),
    type: match[4],
  });
}

console.log(`Found ${errors.length} .id errors on Checklist/Note types`);

// Group by file
const fileGroups = {};
for (const err of errors) {
  if (!fileGroups[err.file]) fileGroups[err.file] = [];
  fileGroups[err.file].push(err);
}

// URL-like patterns that should use .uuid instead of .slug
const uuidPatterns = [
  /\/(checklist|note)\//,
  /router\.push/,
  /router\.replace/,
  /revalidatePath/,
  /href.*\//,
  /link.*\//i,
  /url.*=/i,
  /path.*=.*\//,
  /navigate/i,
];

for (const [filePath, fileErrors] of Object.entries(fileGroups)) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;

    // Sort errors by line number descending to avoid offset issues
    const sorted = [...fileErrors].sort((a, b) => b.line - a.line || b.col - a.col);

    for (const err of sorted) {
      const lineIdx = err.line - 1;
      if (lineIdx >= lines.length) continue;

      const line = lines[lineIdx];
      const col = err.col - 1;

      // Find the .id token at approximately this column
      // Look for .id patterns (ensuring we don't match .items, .isShared, etc.)
      // We need to match exactly ".id" followed by a non-identifier char
      const before = line.substring(0, col);
      const after = line.substring(col);

      // Check if this .id occurrence should be .uuid (URL/navigation context)
      const fullLine = line;
      const isUrlContext = uuidPatterns.some(p => p.test(fullLine));
      // Also check surrounding lines for URL context
      const contextLines = lines.slice(Math.max(0, lineIdx - 3), Math.min(lines.length, lineIdx + 3)).join('\n');
      const isUrlContextSurrounding = uuidPatterns.some(p => p.test(contextLines));

      const replacement = (isUrlContext || isUrlContextSurrounding) ? '.uuid' : '.slug';

      // Replace .id at this specific column
      // TypeScript points to 'id' (the property name), meaning the dot is before col
      if (line[col - 1] === '.' && after.startsWith('id')) {
        // Check that it's ".id" not ".identifier" etc
        const charAfterDotId = line[col + 2];
        if (!charAfterDotId || /[^a-zA-Z0-9_]/.test(charAfterDotId)) {
          const newLine = line.substring(0, col - 1) + replacement + line.substring(col + 2);
          lines[lineIdx] = newLine;
          modified = true;
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
      console.log(`  Updated: ${filePath} (${fileErrors.length} replacements)`);
    }
  } catch (e) {
    console.error(`  Error processing ${filePath}: ${e.message}`);
  }
}

console.log('Done!');
