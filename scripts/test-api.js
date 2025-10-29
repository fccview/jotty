#!/usr/bin/env node

const https = require('https');
const http = require('http');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
};

const args = process.argv.slice(2);
const API_KEY = args[0];
const BASE_URL = args[1] && !args[1].startsWith("ck_") ? args[1] : 'http://localhost:3001';
const testUsername = args[2] || (args[1] && args[1].startsWith("ck_") ? "fccview" : "fccview");

if (!API_KEY) {
    console.log(`${colors.red}Error: API key is required${colors.reset}`);
    console.log(`Usage: yarn test:api <api-key> [base-url]`);
    console.log(`Example: yarn test:api ck_your_api_key_here http://localhost:3001`);
    process.exit(1);
}

let passed = 0;
let failed = 0;
const results = [];
let testChecklistId = null;
let testTaskChecklistId = null;
let testExportDownloadUrl = null;
let testNoteId = null;

function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method,
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json',
                ...headers,
            },
            body: data ? JSON.stringify(data) : undefined,
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const jsonBody = body ? JSON.parse(body) : {};
                    resolve({ status: res.statusCode, body: jsonBody });
                } catch (e) {
                    resolve({ status: res.statusCode, body: body });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function test(name, testFn) {
    try {
        const result = await testFn();
        if (result.success) {
            console.log(`${colors.green}✓${colors.reset} ${name}`);
            passed++;
        } else {
            console.log(`${colors.red}✗${colors.reset} ${name} - ${result.error}`);
            failed++;
        }
        results.push({ name, success: result.success, error: result.error });
        await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
        console.log(`${colors.red}✗${colors.reset} ${name} - ${error.message}`);
        failed++;
        results.push({ name, success: false, error: error.message });
    }
}

async function runTests() {
    console.log(`${colors.cyan}${colors.bright}🧪 API Endpoint Tests${colors.reset}\n`);

    await test('GET /api/checklists', async () => {
        const response = await makeRequest('GET', '/api/checklists');
        if (response.status === 200 && response.body.checklists) {
            const checklists = response.body.checklists;
            testChecklistId = checklists.find(c => c.type === 'simple')?.id;
            testTaskChecklistId = checklists.find(c => c.type === 'task')?.id;
            console.log(`  📋 Found simple checklist: ${testChecklistId || 'none'}`);
            console.log(`  📋 Found task checklist: ${testTaskChecklistId || 'none'}`);
        }
        return {
            success: response.status === 200 && response.body.checklists,
            error: response.status !== 200 ? `Status ${response.status}` : 'No checklists returned'
        };
    });

    await test('GET /api/notes', async () => {
        const response = await makeRequest('GET', '/api/notes');
        return {
            success: response.status === 200 && response.body.notes,
            error: response.status !== 200 ? `Status ${response.status}` : 'No notes returned'
        };
    });

    await test('POST /api/notes (create note)', async () => {
        console.log(`  ➕ Creating test note`);
        const response = await makeRequest('POST', '/api/notes', {
            title: 'Test Note - API',
            content: 'This is a test note created via API',
            category: 'Uncategorized'
        });

        if (response.status !== 200) {
            return { success: false, error: `Status ${response.status}` };
        }

        console.log(`  📝 Response: ${response.status} - ${response.body.error}`);

        testNoteId = response.body.data.id;
        console.log(`  ✅ Note created with ID: ${testNoteId}`);

        const checkResponse = await makeRequest('GET', '/api/notes');
        const noteExists = checkResponse.body.notes.some(note => note.id === testNoteId);

        return {
            success: noteExists,
            error: noteExists ? null : 'Note not found after creation'
        };
    });

    await test(`GET /api/user/${testUsername} (user info)`, async () => {
        console.log(`  👤 Fetching user info for ${testUsername}`);
        const response = await makeRequest('GET', `/api/user/${testUsername}`);
        if (response.status === 200 && response.body.user) {
            const user = response.body.user;
            console.log(`  ✅ User info retrieved: ${user.username}`);
            console.log(`    Is Admin: ${user.isAdmin !== undefined ? user.isAdmin : 'N/A (public view)'}`);
            console.log(`    Avatar URL: ${user.avatarUrl || 'none'}`);
            console.log(`    Theme: ${user.preferredTheme || 'default'}`);
        }
        return {
            success: response.status === 200 && response.body.user && response.body.user.username === testUsername,
            error: response.status !== 200 ? `Status ${response.status}` : 'No user data returned'
        };
    });

    await test('GET /api/categories', async () => {
        console.log(`  📁 Fetching all categories`);
        const response = await makeRequest('GET', '/api/categories');
        if (response.status === 200 && response.body.categories) {
            const categories = response.body.categories;
            console.log(`  ✅ Categories retrieved:`);
            console.log(`    Notes categories: ${categories.notes.length}`);
            console.log(`    Checklists categories: ${categories.checklists.length}`);
        }
        return {
            success: response.status === 200 && response.body.categories && 
                     response.body.categories.notes !== undefined && 
                     response.body.categories.checklists !== undefined,
            error: response.status !== 200 ? `Status ${response.status}` : 'No categories returned'
        };
    });

    await test('GET /api/summary', async () => {
        const response = await makeRequest('GET', '/api/summary');
        return {
            success: response.status === 200 && response.body.summary,
            error: response.status !== 200 ? `Status ${response.status}` : 'No summary returned'
        };
    });

    await test(`GET /api/summary?username=${testUsername}`, async () => {
        const response = await makeRequest('GET', `/api/summary?username=${testUsername}`);
        if (response.status === 200 && response.body.summary) {
            const summary = response.body.summary;
            console.log(`  📊 Summary for ${testUsername}:`);
            console.log(`    Notes: ${summary.notes.total}`);
            console.log(`    Checklists: ${summary.checklists.total}`);
            console.log(`    Items: ${summary.items.total} (${summary.items.completed} completed)`);
            console.log(`    Tasks: ${summary.tasks.total} (${summary.tasks.completed} completed)`);
        }
        return {
            success: response.status === 200 && response.body.summary,
            error: response.status !== 200 ? `Status ${response.status}` : 'No summary returned'
        };
    });

    await test(`POST /api/checklists/${testChecklistId}/items (regular)`, async () => {
        if (!testChecklistId) {
            return { success: false, error: 'No simple checklist found for testing' };
        }

        console.log(`  ➕ Creating regular item in checklist: ${testChecklistId}`);
        const response = await makeRequest('POST', `/api/checklists/${testChecklistId}/items`, {
            text: 'Test Item - Regular'
        });
        if (response.status !== 200 || !response.body.success) {
            return { success: false, error: `Status ${response.status}` };
        }

        const checkResponse = await makeRequest('GET', '/api/checklists');
        const checklist = checkResponse.body.checklists.find(c => c.id === testChecklistId);
        const itemExists = checklist.items.some(item => item.text === 'Test Item - Regular');

        console.log(`  ✅ Item created: ${itemExists ? 'YES' : 'NO'}`);
        return {
            success: itemExists,
            error: itemExists ? null : 'Item not found in checklist after creation'
        };
    });

    await test(`POST /api/checklists/${testTaskChecklistId}/items (task)`, async () => {
        if (!testTaskChecklistId) {
            return { success: false, error: 'No task checklist found for testing' };
        }

        console.log(`  ➕ Creating task item in checklist: ${testTaskChecklistId}`);
        const response = await makeRequest('POST', `/api/checklists/${testTaskChecklistId}/items`, {
            text: 'Test Item - Task',
            status: 'in_progress',
            time: 0
        });
        if (response.status !== 200 || !response.body.success) {
            return { success: false, error: `Status ${response.status}` };
        }

        const checkResponse = await makeRequest('GET', '/api/checklists');
        const checklist = checkResponse.body.checklists.find(c => c.id === testTaskChecklistId);
        const itemExists = checklist.items.some(item =>
            item.text === 'Test Item - Task' &&
            item.status === 'in_progress' &&
            item.time === 0
        );

        console.log(`  ✅ Task item created with status 'in_progress': ${itemExists ? 'YES' : 'NO'}`);
        return {
            success: itemExists,
            error: itemExists ? null : 'Task item not found with correct properties after creation'
        };
    });

    await test(`POST /api/exports (all_checklists_notes)`, async () => {
        console.log(`  📦 Requesting export of all checklists and notes`);
        const response = await makeRequest('POST', '/api/exports', { type: 'all_checklists_notes' });
        testExportDownloadUrl = response.body.downloadUrl;
        console.log(`  ⬇️  Download URL: ${testExportDownloadUrl}`);
        if (response.status === 200 && response.body.success && response.body.downloadUrl) {
            await makeRequest('GET', testExportDownloadUrl, null, { 'Accept': 'application/zip' });
        }
        return {
            success: response.status === 200 && response.body.success && response.body.downloadUrl,
            error: response.status !== 200 ? `Status ${response.status}` : 'Export failed or no download URL'
        };
    });

    await test(`POST /api/exports (user_checklists_notes)`, async () => {
        console.log(`  📦 Requesting export of ${testUsername}'s checklists and notes`);
        const response = await makeRequest('POST', '/api/exports', { type: 'user_checklists_notes', username: testUsername });
        testExportDownloadUrl = response.body.downloadUrl;
        console.log(`  ⬇️  Download URL: ${testExportDownloadUrl}`);
        if (response.status === 200 && response.body.success && response.body.downloadUrl) {
            await makeRequest('GET', testExportDownloadUrl, null, { 'Accept': 'application/zip' });
        }
        return {
            success: response.status === 200 && response.body.success && response.body.downloadUrl,
            error: response.status !== 200 ? `Status ${response.status}` : 'Export failed or no download URL'
        };
    });

    await test(`POST /api/exports (all_users_data)`, async () => {
        console.log(`  📦 Requesting export of all users data`);
        const response = await makeRequest('POST', '/api/exports', { type: 'all_users_data' });
        testExportDownloadUrl = response.body.downloadUrl;
        console.log(`  ⬇️  Download URL: ${testExportDownloadUrl}`);
        if (response.status === 200 && response.body.success && response.body.downloadUrl) {
            await makeRequest('GET', testExportDownloadUrl, null, { 'Accept': 'application/zip' });
        }
        return {
            success: response.status === 200 && response.body.success && response.body.downloadUrl,
            error: response.status !== 200 ? `Status ${response.status}` : 'Export failed or no download URL'
        };
    });

    await test(`POST /api/exports (whole_data_folder)`, async () => {
        console.log(`  📦 Requesting export of whole data folder`);
        const response = await makeRequest('POST', '/api/exports', { type: 'whole_data_folder' });
        testExportDownloadUrl = response.body.downloadUrl;
        console.log(`  ⬇️  Download URL: ${testExportDownloadUrl}`);
        if (response.status === 200 && response.body.success && response.body.downloadUrl) {
            await makeRequest('GET', testExportDownloadUrl, null, { 'Accept': 'application/zip' });
        }
        return {
            success: response.status === 200 && response.body.success && response.body.downloadUrl,
            error: response.status !== 200 ? `Status ${response.status}` : 'Export failed or no download URL'
        };
    });

    await test(`GET /api/exports (progress check)`, async () => {
        console.log(`  📊 Checking export progress`);
        const response = await makeRequest('GET', '/api/exports');
        console.log(`  📈 Progress: ${response.body.progress}% - ${response.body.message}`);
        return {
            success: response.status === 200 && typeof response.body.progress === 'number',
            error: response.status !== 200 ? `Status ${response.status}` : 'Failed to get export progress'
        };
    });

    await test('Verify temp_exports directory is empty', async () => {
        const exportTempDir = './data/temp_exports';
        try {
            const files = await require('fs/promises').readdir(exportTempDir);
            return {
                success: files.length === 0,
                error: files.length === 0 ? null : `Directory not empty. Files remaining: ${files.join(', ')}`
            };
        } catch (err) {
            if (err.code === 'ENOENT') {
                return { success: true };
            }
            return { success: false, error: `Error checking directory: ${err.message}` };
        }
    });

    await test('Validation error (missing note title)', async () => {
        console.log(`  ❌ Testing validation error for note creation without title`);
        const response = await makeRequest('POST', '/api/notes', { content: 'No title provided' });
        console.log(`  📝 Response: ${response.status} - ${response.body.error}`);
        return {
            success: response.status === 400 && response.body.error === 'Title is required',
            error: `Expected 400 Bad Request with 'Title is required', got ${response.status}`
        };
    });

    await test(`PUT /api/checklists/${testChecklistId}/items/0/check`, async () => {
        if (!testChecklistId) {
            return { success: false, error: 'No simple checklist found for testing' };
        }

        console.log(`  ✓ Checking item 0 in checklist: ${testChecklistId}`);
        const response = await makeRequest('PUT', `/api/checklists/${testChecklistId}/items/0/check`);
        if (response.status !== 200 || !response.body.success) {
            return { success: false, error: `Status ${response.status}` };
        }

        const checkResponse = await makeRequest('GET', '/api/checklists');
        const checklist = checkResponse.body.checklists.find(c => c.id === testChecklistId);
        const item = checklist.items[0];

        console.log(`  ✅ Item 0 completed status: ${item.completed}`);
        return {
            success: item.completed === true,
            error: item.completed !== true ? 'Item not marked as completed after check operation' : null
        };
    });

    await test(`PUT /api/checklists/${testChecklistId}/items/0/uncheck`, async () => {
        if (!testChecklistId) {
            return { success: false, error: 'No simple checklist found for testing' };
        }

        console.log(`  ✗ Unchecking item 0 in checklist: ${testChecklistId}`);
        const response = await makeRequest('PUT', `/api/checklists/${testChecklistId}/items/0/uncheck`);
        if (response.status !== 200 || !response.body.success) {
            return { success: false, error: `Status ${response.status}` };
        }

        const checkResponse = await makeRequest('GET', '/api/checklists');
        const checklist = checkResponse.body.checklists.find(c => c.id === testChecklistId);
        const item = checklist.items[0];

        console.log(`  ✅ Item 0 completed status: ${item.completed}`);
        return {
            success: item.completed === false,
            error: item.completed !== false ? 'Item not marked as incomplete after uncheck operation' : null
        };
    });

    await test('Authentication error (invalid key)', async () => {
        const response = await makeRequest('GET', '/api/checklists', null, { 'x-api-key': 'invalid' });
        return {
            success: response.status === 401 && response.body.error === 'Unauthorized',
            error: `Expected 401 Unauthorized, got ${response.status}`
        };
    });

    await test('Authentication error (no key)', async () => {
        const response = await makeRequest('GET', '/api/checklists', null, { 'x-api-key': '' });
        return {
            success: response.status === 401 && response.body.error === 'Unauthorized',
            error: `Expected 401 Unauthorized, got ${response.status}`
        };
    });

    await test(`Validation error (missing text) - ${testChecklistId}`, async () => {
        if (!testChecklistId) {
            return { success: false, error: 'No simple checklist found for testing' };
        }

        console.log(`  ❌ Testing validation error with checklist: ${testChecklistId}`);
        const response = await makeRequest('POST', `/api/checklists/${testChecklistId}/items`, {});
        console.log(`  📝 Response: ${response.status} - ${response.body.error}`);
        return {
            success: response.status === 400 && response.body.error === 'Text is required',
            error: `Expected 400 Bad Request, got ${response.status}`
        };
    });

    await test('Not found error (invalid list)', async () => {
        const response = await makeRequest('PUT', '/api/checklists/nonexistent/items/0/check');
        return {
            success: response.status === 404 && response.body.error === 'List not found',
            error: `Expected 404 Not Found, got ${response.status}`
        };
    });

    await test(`Range error (invalid index) - ${testChecklistId}`, async () => {
        if (!testChecklistId) {
            return { success: false, error: 'No simple checklist found for testing' };
        }

        console.log(`  ❌ Testing range error with checklist: ${testChecklistId} (index 999)`);
        const response = await makeRequest('PUT', `/api/checklists/${testChecklistId}/items/999/check`);
        console.log(`  📝 Response: ${response.status} - ${response.body.error}`);
        return {
            success: response.status === 400 && response.body.error === 'Item index out of range',
            error: `Expected 400 Bad Request, got ${response.status}`
        };
    });

    await test('Not found error (invalid username)', async () => {
        const response = await makeRequest('GET', '/api/user/nonexistent_user_12345');
        return {
            success: response.status === 404 && response.body.error === 'User not found',
            error: `Expected 404 Not Found, got ${response.status}`
        };
    });

    console.log(`\n${colors.cyan}${colors.bright}📊 Test Summary${colors.reset}`);
    console.log(`${colors.green}✓ Passed: ${passed}${colors.reset}`);
    console.log(`${colors.red}✗ Failed: ${failed}${colors.reset}`);

    const total = passed + failed;
    const percentage = Math.round((passed / total) * 100);

    if (percentage === 100) {
        console.log(`${colors.bgGreen}${colors.white} 🎉 All tests passed! (${percentage}%) ${colors.reset}`);
    } else if (percentage >= 80) {
        console.log(`${colors.bgYellow}${colors.white} ⚠️  Most tests passed (${percentage}%) ${colors.reset}`);
    } else {
        console.log(`${colors.bgRed}${colors.white} ❌ Tests failed (${percentage}%) ${colors.reset}`);
    }

    process.exit(failed > 0 ? 1 : 0);
}

async function cleanupTempExports() {
    const exportTempDir = './data/temp_exports';
    try {
        const fs = require('fs/promises');
        console.log(`${colors.cyan}Attempting to clean up temporary export directory: ${exportTempDir}${colors.reset}`);
        const filesBefore = await fs.readdir(exportTempDir).catch(() => []);
        console.log(`${colors.cyan}Files in ${exportTempDir} before cleanup: ${filesBefore.length > 0 ? filesBefore.join(', ') : 'None'}${colors.reset}`);
        require('fs').rmSync(exportTempDir, { recursive: true, force: true });
        console.log(`${colors.cyan}Cleaned up temporary export directory: ${exportTempDir}${colors.reset}`);
        const filesAfter = await fs.readdir(exportTempDir).catch(() => []);
        console.log(`${colors.cyan}Files in ${exportTempDir} after cleanup: ${filesAfter.length > 0 ? filesAfter.join(', ') : 'None'}${colors.reset}`);
    } catch (err) {
        console.error(`${colors.red}Error cleaning up temporary export directory:${colors.reset}`, err);
    }
}

async function main() {
    await cleanupTempExports();
    await runTests()
        .catch(console.error)
        .finally(async () => {
            await cleanupTempExports();
        });
}

main();