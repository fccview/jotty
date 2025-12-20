/**
 * Auto-translate script
 *
 * Automatically translates hardcoded strings that already exist in en.json
 * Adds necessary imports and hooks to files
 *
 * Usage:
 * node scripts/auto-translate.js
 * node scripts/auto-translate.js --dry-run  (preview changes without applying)
 * node scripts/auto-translate.js --file=path/to/file.tsx  (translate single file)
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS_PATH = path.join(__dirname, '../app/_translations/en.json');
const EXCLUDE_DIRS = ['node_modules', '.next', 'dist', 'build', '.git', 'public', 'scripts', 'data', 'config', '_translations'];

// Load translations and create reverse lookup
function loadTranslations() {
  const content = fs.readFileSync(TRANSLATIONS_PATH, 'utf-8');
  const translations = JSON.parse(content);
  const lookup = new Map(); // value -> key

  function traverse(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') {
        // Store all keys for this value (there might be duplicates)
        if (!lookup.has(value)) {
          lookup.set(value, []);
        }
        lookup.get(value).push(fullKey);
      } else if (typeof value === 'object' && value !== null) {
        traverse(value, fullKey);
      }
    }
  }

  traverse(translations);
  return lookup;
}

function hasTranslationImport(content) {
  return content.includes('useTranslations') || content.includes('getTranslations');
}

function isServerComponent(content) {
  return content.includes('"use server"') || content.includes("'use server'");
}

function isClientComponent(content) {
  return content.includes('"use client"') || content.includes("'use client'");
}

function addTranslationImport(content) {
  const lines = content.split('\n');
  const isServer = isServerComponent(content);
  const importStatement = isServer
    ? `import { getTranslations } from "next-intl/server";`
    : `import { useTranslations } from "next-intl";`;

  // Find the last import statement
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, importStatement);
  } else {
    // No imports found, add after directives or at the top
    const directiveIndex = lines.findIndex(line =>
      line.includes('"use client"') || line.includes("'use client'") ||
      line.includes('"use server"') || line.includes("'use server'")
    );
    if (directiveIndex >= 0) {
      lines.splice(directiveIndex + 2, 0, importStatement);
    } else {
      lines.unshift(importStatement);
    }
  }

  return lines.join('\n');
}

function addTranslationHook(content) {
  // Server components can't use hooks - skip for now (they need async/await pattern)
  if (isServerComponent(content)) {
    return content;
  }

  const lines = content.split('\n');

  // Find the component function
  let componentStartIndex = -1;
  let braceIndex = -1;

  // Look for export const Component = or export function Component
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if ((line.includes('export const') || line.includes('export function')) &&
        !line.includes('//') && !line.includes('/*')) {
      componentStartIndex = i;
      // Find the FUNCTION BODY opening brace (look for ) => { or ) {, not just {)
      for (let j = i; j < Math.min(i + 15, lines.length); j++) {
        // Match function body brace patterns, not destructuring braces
        if (lines[j].includes(') => {') ||
            (lines[j].includes(')') && lines[j + 1] && lines[j + 1].trim() === '{')) {
          // Found closing paren of parameters
          if (lines[j].includes('{')) {
            braceIndex = j;
          } else if (lines[j + 1] && lines[j + 1].trim() === '{') {
            braceIndex = j + 1;
          }
          break;
        }
        // Also handle single-line arrow functions: ): Type => {
        if (lines[j].match(/\)\s*:.*=>\s*\{/)) {
          braceIndex = j;
          break;
        }
      }
      break;
    }
  }

  if (braceIndex < 0) return content;

  // Find the first line after the opening brace that's not a comment or empty
  let insertIndex = braceIndex + 1;
  while (insertIndex < lines.length &&
         (lines[insertIndex].trim().startsWith('//') ||
          lines[insertIndex].trim().startsWith('/*') ||
          lines[insertIndex].trim() === '')) {
    insertIndex++;
  }

  // Check if t hook already exists nearby
  const hasT = lines.slice(insertIndex, Math.min(insertIndex + 15, lines.length))
    .some(line => /const\s+t\s*=\s*useTranslations/.test(line));

  if (!hasT) {
    const indent = lines[insertIndex].match(/^\s*/)[0];
    lines.splice(insertIndex, 0, `${indent}const t = useTranslations();`);
  }

  return lines.join('\n');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function translateFile(filePath, lookup, dryRun = false) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Skip if already has translation import
  if (hasTranslationImport(content)) {
    return { changed: false, reason: 'already has translations' };
  }

  let newContent = content;
  let replacements = [];

  // Sort lookup by string length (longest first) to avoid partial replacements
  const sortedEntries = Array.from(lookup.entries())
    .sort((a, b) => b[0].length - a[0].length);

  for (const [value, keys] of sortedEntries) {
    // Skip very short strings to avoid false positives
    if (value.length < 3) continue;

    // Skip strings with special characters that might cause issues
    if (value.includes('{') || value.includes('}')) continue;

    // Use the shortest, most specific key
    const key = keys.sort((a, b) => a.length - b.length)[0];

    // Pattern 1: JSX text between tags >text<
    const jsxRegex = new RegExp(`>\\s*${escapeRegex(value)}\\s*<`, 'g');
    const jsxMatches = newContent.match(jsxRegex);
    if (jsxMatches) {
      newContent = newContent.replace(jsxRegex, `>{t('${key}')}<`);
      replacements.push({ value, key, context: 'JSX text', count: jsxMatches.length });
    }

    // Pattern 2: String literals in attributes (but not template strings with variables)
    const attrPattern = new RegExp(`(placeholder|title|aria-label|alt|label|description|buttonText)=["']${escapeRegex(value)}["']`, 'g');
    const attrMatches = newContent.match(attrPattern);
    if (attrMatches) {
      newContent = newContent.replace(attrPattern, `$1={t('${key}')}`);
      replacements.push({ value, key, context: 'attribute', count: attrMatches.length });
    }
  }

  if (replacements.length === 0) {
    return { changed: false, reason: 'no matching strings found' };
  }

  // Add import and hook only if we actually replaced strings
  newContent = addTranslationImport(newContent);
  newContent = addTranslationHook(newContent);

  if (!dryRun) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }

  return {
    changed: true,
    replacements,
    preview: dryRun ? newContent : null
  };
}

function scanDirectory(dir, lookup, dryRun, baseDir = dir) {
  const results = {
    processed: 0,
    changed: 0,
    skipped: 0,
    details: []
  };

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.includes(entry.name)) continue;
      const subResults = scanDirectory(fullPath, lookup, dryRun, baseDir);
      results.processed += subResults.processed;
      results.changed += subResults.changed;
      results.skipped += subResults.skipped;
      results.details.push(...subResults.details);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      if (entry.name.endsWith('.d.ts')) continue;

      results.processed++;
      const result = translateFile(fullPath, lookup, dryRun);

      if (result.changed) {
        results.changed++;
        results.details.push({
          file: relativePath,
          replacements: result.replacements,
          preview: result.preview
        });
      } else {
        results.skipped++;
      }
    }
  }

  return results;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileArg = args.find(arg => arg.startsWith('--file='));

  console.log('Loading translations...');
  const lookup = loadTranslations();
  console.log(`Loaded ${lookup.size} unique translation strings\n`);

  if (fileArg) {
    // Translate single file
    const filePath = fileArg.split('=')[1];
    const fullPath = path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
      console.error(`Error: File "${filePath}" not found`);
      process.exit(1);
    }

    console.log(`${dryRun ? 'Previewing' : 'Translating'} file: ${filePath}\n`);
    const result = translateFile(fullPath, lookup, dryRun);

    if (result.changed) {
      console.log(`✓ ${filePath}`);
      console.log(`  Replacements: ${result.replacements.length}`);
      result.replacements.forEach(r => {
        console.log(`    - "${r.value}" → t('${r.key}') [${r.context}] (${r.count}x)`);
      });
      if (result.preview) {
        console.log('\nPreview:');
        console.log('─'.repeat(80));
        console.log(result.preview);
        console.log('─'.repeat(80));
      }
    } else {
      console.log(`○ ${filePath} - ${result.reason}`);
    }
  } else {
    // Scan entire app directory
    console.log(`${dryRun ? 'Previewing' : 'Translating'} files in app directory...\n`);
    const scanDir = path.resolve(process.cwd(), 'app');
    const results = scanDirectory(scanDir, lookup, dryRun);

    console.log('\nResults:');
    console.log(`Processed: ${results.processed} files`);
    console.log(`Changed: ${results.changed} files`);
    console.log(`Skipped: ${results.skipped} files`);

    if (results.details.length > 0) {
      console.log('\nChanged files:');
      results.details.forEach(detail => {
        console.log(`\n✓ ${detail.file}`);
        console.log(`  Replacements: ${detail.replacements.length}`);
        detail.replacements.slice(0, 5).forEach(r => {
          const preview = r.value.substring(0, 50);
          console.log(`    - "${preview}${r.value.length > 50 ? '...' : ''}" → t('${r.key}') [${r.context}]`);
        });
        if (detail.replacements.length > 5) {
          console.log(`    ... and ${detail.replacements.length - 5} more`);
        }
      });
    }

    if (dryRun) {
      console.log('\n--dry-run mode: No files were modified');
      console.log('Run without --dry-run to apply changes');
    }
  }
}

if (require.main === module) main();
