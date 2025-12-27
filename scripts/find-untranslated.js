/**
 * @usage
 * node scripts/find-untranslated-strings.js
 *
 * Show sample strings
 * node scripts/find-untranslated-strings.js --samples
 *
 * Show all files (default shows top 20)
 * node scripts/find-untranslated-strings.js --all
 *
 * Show only top 5
 * node scripts/find-untranslated-strings.js --limit=5
 *
 * Scan specific directory
 * node scripts/find-untranslated-strings.js --dir=app/_components/FeatureComponents/Admin
 *
 * Show completed files too
 * node scripts/find-untranslated-strings.js --completed
 */

const fs = require('fs');
const path = require('path');

const EXCLUDE_PATTERNS = [
  /^[a-z-]+$/,
  /^[0-9]+$/,
  /^className/,
  /^data-/,
  /^aria-/,
  /^on[A-Z]/,
  /^[a-z]+Icon$/,
  /^bg-/,
  /^text-/,
  /^px-/,
  /^py-/,
  /^rounded-/,
  /^flex/,
  /^grid/,
  /^w-/,
  /^h-/,
  /^m[tblrxy]?-/,
  /^p[tblrxy]?-/,
  /console\./,
  /import /,
  /from /,
  /export /,
  /^\/\//,
  /^\/\*/,
  /^\s*$/,
  /^[a-f0-9]{6,}$/i,
  /^\d{4}-\d{2}-\d{2}/,
  /^https?:\/\//,
  /^\.{1,2}\//,
  /^@\//,
];

const EXCLUDE_DIRS = ['node_modules', '.next', 'dist', 'build', '.git', 'public', 'scripts', 'data', 'config'];

function shouldExcludeString(str) {
  if (!str || str.length < 2 || str.trim().length === 0) return true;
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(str)) return true;
  }
  return false;
}

function extractStrings(content) {
  const strings = new Set();
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;
    if (trimmed.includes('console.')) continue;

    const jsxTextRegex = />([^<>{}\n]+)</g;
    let match;
    while ((match = jsxTextRegex.exec(line)) !== null) {
      const text = match[1].trim();
      if (!shouldExcludeString(text) && /[A-Z]/.test(text)) {
        strings.add(text);
      }
    }

    const attrPatterns = [
      /placeholder=["']([^"']+)["']/g,
      /title=["']([^"']+)["']/g,
      /aria-label=["']([^"']+)["']/g,
      /alt=["']([^"']+)["']/g,
    ];

    for (const pattern of attrPatterns) {
      while ((match = pattern.exec(line)) !== null) {
        const text = match[1].trim();
        if (!shouldExcludeString(text)) strings.add(text);
      }
    }
  }

  return Array.from(strings);
}

function hasTranslationImport(content) {
  return content.includes('useTranslations') || content.includes('getTranslations');
}

function scanDirectory(dir, baseDir = dir) {
  const results = { completed: [], needsTranslation: [], noStrings: [], totalStrings: 0 };
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.includes(entry.name)) continue;
      const subResults = scanDirectory(fullPath, baseDir);
      results.completed.push(...subResults.completed);
      results.needsTranslation.push(...subResults.needsTranslation);
      results.noStrings.push(...subResults.noStrings);
      results.totalStrings += subResults.totalStrings;
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      if (entry.name.endsWith('.d.ts')) continue;

      const content = fs.readFileSync(fullPath, 'utf-8');
      const strings = extractStrings(content);
      const hasImport = hasTranslationImport(content);

      if (strings.length === 0) {
        results.noStrings.push(relativePath);
      } else if (hasImport) {
        results.completed.push({ path: relativePath, strings: strings.length });
      } else {
        results.needsTranslation.push({ path: relativePath, strings: strings.length, samples: strings.slice(0, 5) });
        results.totalStrings += strings.length;
      }
    }
  }

  return results;
}

function printReport(results, options = {}) {
  const totalFiles = results.completed.length + results.needsTranslation.length;
  const completedCount = results.completed.length;
  const percentage = totalFiles > 0 ? Math.round((completedCount / totalFiles) * 100) : 0;

  console.log('\nTranslation Progress Report\n');
  console.log(`Completed: ${completedCount} files`);
  console.log(`Needs Translation: ${results.needsTranslation.length} files (${results.totalStrings} strings)`);
  console.log(`No Strings: ${results.noStrings.length} files`);
  console.log(`Progress: ${percentage}%\n`);

  if (options.showCompleted && results.completed.length > 0) {
    console.log('Completed Files:');
    results.completed.sort((a, b) => b.strings - a.strings).forEach(file => {
      console.log(`  ✓ ${file.path} (${file.strings} strings)`);
    });
    console.log();
  }

  if (results.needsTranslation.length > 0) {
    console.log('Files Needing Translation:\n');
    const sorted = results.needsTranslation.sort((a, b) => b.strings - a.strings);
    const limit = options.limit || sorted.length;

    sorted.slice(0, limit).forEach((file, i) => {
      console.log(`${i + 1}. ${file.path}`);
      console.log(`   Strings: ${file.strings}`);
      if (options.showSamples && file.samples.length > 0) {
        console.log(`   Samples:`);
        file.samples.forEach(s => console.log(`     "${s.substring(0, 60)}${s.length > 60 ? '...' : ''}"`));
      }
      console.log();
    });

    if (limit < sorted.length) {
      console.log(`... and ${sorted.length - limit} more files\n`);
    }
  }

  console.log('Options: --all, --limit=N, --samples, --completed, --dir=path\n');
}

function main() {
  const args = process.argv.slice(2);
  const options = {
    showSamples: args.includes('--samples'),
    showCompleted: args.includes('--completed'),
    all: args.includes('--all'),
  };

  const limitArg = args.find(arg => arg.startsWith('--limit='));
  if (limitArg) options.limit = parseInt(limitArg.split('=')[1], 10);
  else if (!options.all) options.limit = 20;

  const dirArg = args.find(arg => arg.startsWith('--dir='));
  const scanDir = dirArg ? dirArg.split('=')[1] : 'app';
  const fullPath = path.resolve(process.cwd(), scanDir);

  if (!fs.existsSync(fullPath)) {
    console.error(`Error: Directory "${scanDir}" not found`);
    process.exit(1);
  }

  console.log(`Scanning: ${scanDir}`);
  const results = scanDirectory(fullPath);
  printReport(results, options);
}

if (require.main === module) main();
