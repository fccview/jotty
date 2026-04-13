const fs = require('fs');

const path = 'tests/server-actions/checklist-item.test.ts';
let code = fs.readFileSync(path, 'utf8');

// The objects typically look like:
// const mockChecklist: any = {
//   id: 'list-1',
//   uuid: 'uuid-1',
//   ...
// We want to replace `id: ` with `slug: ` but ONLY at the checklist level, not inside `items: [ { id: 'item-1' } ]`.

// Actually, let's just do a blanket regex:
// If it's `id: 'some-string', uuid:` we change to `slug: '...'`
code = code.replace(/(\b)id(\s*:\s*['"][^'"]+['"]\s*,\s*uuid\b)/g, "$1slug$2");
// Also if uuid comes before id
code = code.replace(/(\buuid\s*:\s*['"][^'"]+['"]\s*,\s*)id(\s*:)/g, "$1slug$2");

fs.writeFileSync(path, code);
console.log('Fixed checklist-item mock objects');
