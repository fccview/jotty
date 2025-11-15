const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs/promises');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
};

let passed = 0;
let failed = 0;
const results = [];
const testState = {
    noteId: null,
    simpleChecklistId: null,
    taskChecklistId: null,
    createdChecklistId: null,
};

const args = process.argv.slice(2);
const API_KEY = args[0];
const BASE_URL = args[1] || 'http://localhost:3001';
const testUsername = args[2] || 'fccview';

if (!API_KEY) {
    console.log(`${colors.red}Error: API key is required.${colors.reset}`);
    console.log(`Usage:   yarn test:api <api-key> [base-url] [username]`);
    console.log(`Example: yarn test:api ck_your_key http://localhost:3001 fccview`);
    process.exit(1);
}

const logStep = (message) => {
    console.log(`  ${colors.cyan}${message}${colors.reset}`);
};

const makeRequest = (method, path, data = null, headers = {}) => {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const transport = url.protocol === 'https:' ? https : http;

        const postData = data ? JSON.stringify(data) : null;

        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search, // Includes query params
            method,
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json',
                ...headers,
            },
        };

        if (postData) {
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = transport.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const jsonBody = body ? JSON.parse(body) : {};
                    resolve({ status: res.statusCode, body: jsonBody });
                } catch (e) {
                    // Resolve with raw body if JSON parsing fails
                    resolve({ status: res.statusCode, body: body });
                }
            });
        });

        req.on('error', (e) => {
            reject(new Error(`Request failed: ${e.message}`));
        });

        if (postData) {
            req.write(postData);
        }
        req.end();
    });
};

const test = async (name, testFn = () => Promise.resolve({ success: true })) => {
    try {
        const result = await testFn();
        if (result.success) {
            console.log(`${colors.green}✓${colors.reset} ${name}`);
            passed++;
        } else {
            console.log(`${colors.red}✗${colors.reset} ${name} - ${colors.yellow}${result.error}${colors.reset}`);
            failed++;
        }
        results.push({ name, success: result.success, error: result.error });

        await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
        console.log(`${colors.red}✗${colors.reset} ${name} - ${colors.red}Test threw an exception: ${error.message}${colors.reset}`);
        failed++;
        results.push({ name, success: false, error: error.message });
    }
};

const testSetup = async () => {
    logStep(`Testing against: ${BASE_URL} as user: ${testUsername}`);

    await test('GET /api/checklists (setup)', async () => {
        const response = await makeRequest('GET', '/api/checklists');
        if (response.status === 200 && response.body.checklists) {
            const checklists = response.body.checklists;
            testState.simpleChecklistId = checklists.find(c => c.type === 'simple')?.id;
            testState.taskChecklistId = checklists.find(c => c.type === 'task')?.id;
            logStep(`Found simple checklist: ${testState.simpleChecklistId || 'none'}`);
            logStep(`Found task checklist: ${testState.taskChecklistId || 'none'}`);
        }
        return {
            success: response.status === 200 && response.body.checklists && testState.simpleChecklistId && testState.taskChecklistId,
            error: response.status !== 200 ? `Status ${response.status}` : 'Could not find simple or task checklists for testing'
        };
    });

    await test('GET /api/categories (setup)', async () => {
        logStep(`Fetching all categories`);
        const response = await makeRequest('GET', '/api/categories');
        if (response.status === 200 && response.body.categories) {
            const { notes, checklists } = response.body.categories;
            logStep(`Categories retrieved: ${notes.length} note, ${checklists.length} checklist`);
        }
        return {
            success: response.status === 200 && response.body.categories &&
                response.body.categories.notes !== undefined &&
                response.body.categories.checklists !== undefined,
            error: response.status !== 200 ? `Status ${response.status}` : 'No categories returned'
        };
    });
}

const testNoteEndpoints = async () => {
    console.log(`\n${colors.bright}--- Testing Note Endpoints ---${colors.reset}`);

    await test('GET /api/notes', async () => {
        const response = await makeRequest('GET', '/api/notes');
        return {
            success: response.status === 200 && Array.isArray(response.body.notes),
            error: response.status !== 200 ? `Status ${response.status}` : 'No notes array returned'
        };
    });

    await test('POST /api/notes (create note)', async () => {
        logStep(`Creating test note...`);
        const noteData = {
            title: 'Test Note - API',
            content: 'This is a test note created via API',
            category: 'Uncategorized'
        };
        const response = await makeRequest('POST', '/api/notes', noteData);

        if (response.status !== 200 || !response.body.data?.id) {
            return { success: false, error: `Status ${response.status} - ${response.body.error}` };
        }

        testState.noteId = response.body.data.id;
        logStep(`Note created with ID: ${testState.noteId}`);

        const checkResponse = await makeRequest('GET', '/api/notes');
        const createdNote = checkResponse.body.notes.find(note => note.id === testState.noteId);

        if (!createdNote) return { success: false, error: 'Note not found after creation' };
        if (createdNote.title !== noteData.title) return { success: false, error: 'Note title mismatch' };
        if (createdNote.content !== noteData.content) return { success: false, error: 'Note content mismatch' };

        return { success: true };
    });

    await test(`PUT /api/notes/:id (update note)`, async () => {
        if (!testState.noteId) return { success: false, error: 'No test note ID available' };

        logStep(`Updating note: ${testState.noteId}`);
        const updateData = {
            title: 'Updated Test Note - API',
            content: 'This note has been updated via API',
            category: 'Work',
            originalCategory: 'Uncategorized'
        };
        const response = await makeRequest('PUT', `/api/notes/${testState.noteId}`, updateData);

        if (response.status !== 200) return { success: false, error: `Status ${response.status}` };

        const checkResponse = await makeRequest('GET', '/api/notes');
        const updatedNote = checkResponse.body.notes.find(note => note.id === testState.noteId);

        const isUpdated = updatedNote &&
            updatedNote.title === updateData.title &&
            updatedNote.content === updateData.content &&
            updatedNote.category === updateData.category;

        logStep(`Note update verified: ${isUpdated ? 'YES' : 'NO'}`);
        return {
            success: isUpdated,
            error: isUpdated ? null : 'Note not properly updated'
        };
    });

    await test(`PUT /api/notes/:id (partial update)`, async () => {
        if (!testState.noteId) return { success: false, error: 'No test note ID available' };

        logStep(`Partially updating note: ${testState.noteId}`);
        const partialData = { content: 'Updated content only' };
        const response = await makeRequest('PUT', `/api/notes/${testState.noteId}`, partialData);

        if (response.status !== 200) return { success: false, error: `Status ${response.status}` };

        const checkResponse = await makeRequest('GET', '/api/notes');
        const updatedNote = checkResponse.body.notes.find(note => note.id === testState.noteId);

        if (!updatedNote) return { success: false, error: 'Note not found after partial update' };

        const titlePreserved = updatedNote.title === 'Updated Test Note - API';
        const categoryPreserved = updatedNote.category === 'Work';
        const contentUpdated = updatedNote.content === partialData.content;

        if (!titlePreserved) return { success: false, error: 'Title was not preserved' };
        if (!categoryPreserved) return { success: false, error: 'Category was not preserved' };
        if (!contentUpdated) return { success: false, error: 'Content was not updated' };

        logStep(`Partial update successful: title and category preserved`);
        return { success: true };
    });

    await test('GET /api/notes?category=Work (filter notes)', async () => {
        logStep(`Filtering notes by category 'Work'`);
        const response = await makeRequest('GET', '/api/notes?category=Work');

        if (response.status !== 200) return { success: false, error: `Status ${response.status}` };

        const filtered = response.body.notes.every(n => n.category === 'Work');
        logStep(`Found ${response.body.notes.length} note(s). All filtered: ${filtered}`);

        return { success: filtered };
    });

    await test(`DELETE /api/notes/:id (delete note)`, async () => {
        if (!testState.noteId) return { success: false, error: 'No test note ID available' };

        logStep(`Deleting note: ${testState.noteId}`);
        const response = await makeRequest('DELETE', `/api/notes/${testState.noteId}`);

        if (response.status !== 200) return { success: false, error: `Status ${response.status}` };

        const checkResponse = await makeRequest('GET', '/api/notes');
        const noteExists = checkResponse.body.notes.some(note => note.id === testState.noteId);

        logStep(`Note deleted: ${!noteExists ? 'YES' : 'NO'}`);
        return {
            success: !noteExists,
            error: noteExists ? 'Note still exists after deletion' : null
        };
    });
};

const testChecklistEndpoints = async () => {
    console.log(`\n${colors.bright}--- Testing Checklist Endpoints ---${colors.reset}`);

    await test('POST /api/checklists (create checklist)', async () => {
        logStep(`Creating test checklist...`);
        const response = await makeRequest('POST', '/api/checklists', {
            title: 'Test Checklist - API',
            category: 'API Tests',
            type: 'simple'
        });

        if (response.status !== 200 || !response.body.data?.id) {
            return { success: false, error: `Status ${response.status}` };
        }

        testState.createdChecklistId = response.body.data.id;
        logStep(`Checklist created with ID: ${testState.createdChecklistId}`);

        return { success: true };
    });

    await test(`PUT /api/checklists/:id (update checklist)`, async () => {
        if (!testState.createdChecklistId) return { success: false, error: 'No test checklist ID available' };

        logStep(`Updating checklist: ${testState.createdChecklistId}`);
        const response = await makeRequest('PUT', `/api/checklists/${testState.createdChecklistId}`, {
            title: 'Updated Test Checklist - API',
            category: 'API Tests Updated'
        });

        if (response.status !== 200) return { success: false, error: `Status ${response.status}` };

        const checkResponse = await makeRequest('GET', '/api/checklists');
        const updatedChecklist = checkResponse.body.checklists.find(c => c.id === testState.createdChecklistId);

        const isUpdated = updatedChecklist &&
            updatedChecklist.title === 'Updated Test Checklist - API' &&
            updatedChecklist.category === 'API Tests Updated';

        logStep(`Checklist update verified: ${isUpdated ? 'YES' : 'NO'}`);
        return { success: isUpdated, error: isUpdated ? null : 'Checklist not properly updated' };
    });

    await test('GET /api/checklists?category=API Tests Updated (filter)', async () => {
        logStep(`Filtering checklists by category`);
        const response = await makeRequest('GET', '/api/checklists?category=API%20Tests%20Updated');

        if (response.status !== 200) return { success: false, error: `Status ${response.status}` };

        const filtered = response.body.checklists.every(c => c.category === 'API Tests Updated');
        logStep(`Filtered ${response.body.checklists.length} checklist(s)`);

        return { success: filtered, error: filtered ? null : 'Filter returned incorrect items' };
    });

    await test('GET /api/checklists?q=Updated (search)', async () => {
        logStep(`Searching checklists for 'Updated'`);
        const response = await makeRequest('GET', '/api/checklists?q=Updated');
        if (response.status !== 200) return { success: false, error: `Status ${response.status}` };
        logStep(`Found ${response.body.checklists.length} result(s)`);
        return { success: true };
    });

    await test(`DELETE /api/checklists/:id (delete checklist)`, async () => {
        if (!testState.createdChecklistId) return { success: false, error: 'No test checklist ID available' };

        logStep(`Deleting checklist: ${testState.createdChecklistId}`);
        const response = await makeRequest('DELETE', `/api/checklists/${testState.createdChecklistId}`);

        if (response.status !== 200) return { success: false, error: `Status ${response.status}` };

        const checkResponse = await makeRequest('GET', '/api/checklists');
        const checklistExists = checkResponse.body.checklists.some(c => c.id === testState.createdChecklistId);

        logStep(`Checklist deleted: ${!checklistExists ? 'YES' : 'NO'}`);
        return { success: !checklistExists, error: checklistExists ? 'Checklist still exists' : null };
    });
};

const testItemEndpoints = async () => {
    console.log(`\n${colors.bright}--- Testing Checklist Item Endpoints ---${colors.reset}`);

    await test(`POST /api/checklists/:id/items (regular)`, async () => {
        if (!testState.simpleChecklistId) return { success: false, error: 'No simple checklist ID' };

        logStep(`Creating regular item in checklist: ${testState.simpleChecklistId}`);
        const response = await makeRequest('POST', `/api/checklists/${testState.simpleChecklistId}/items`, {
            text: 'Test Item - Regular'
        });
        if (response.status !== 200 || !response.body.success) {
            return { success: false, error: `Status ${response.status}` };
        }

        const checkResponse = await makeRequest('GET', '/api/checklists');
        const checklist = checkResponse.body.checklists.find(c => c.id === testState.simpleChecklistId);
        const itemExists = checklist.items.some(item => item.text === 'Test Item - Regular');

        logStep(`Item created: ${itemExists ? 'YES' : 'NO'}`);
        return { success: itemExists, error: itemExists ? null : 'Item not found after creation' };
    });

    await test(`POST /api/checklists/:id/items (task)`, async () => {
        if (!testState.taskChecklistId) return { success: false, error: 'No task checklist ID' };

        logStep(`Creating task item in checklist: ${testState.taskChecklistId}`);
        const response = await makeRequest('POST', `/api/checklists/${testState.taskChecklistId}/items`, {
            text: 'Test Item - Task',
            status: 'in_progress',
            time: 0
        });
        if (response.status !== 200 || !response.body.success) {
            return { success: false, error: `Status ${response.status}` };
        }

        const checkResponse = await makeRequest('GET', '/api/checklists');
        const checklist = checkResponse.body.checklists.find(c => c.id === testState.taskChecklistId);
        const itemExists = checklist.items.some(item =>
            item.text === 'Test Item - Task' && item.status === 'in_progress'
        );

        logStep(`Task item created: ${itemExists ? 'YES' : 'NO'}`);
        return { success: itemExists, error: itemExists ? null : 'Task item not found' };
    });

    await test(`PUT /api/checklists/:id/items/0/check`, async () => {
        if (!testState.simpleChecklistId) return { success: false, error: 'No simple checklist ID' };

        logStep(`Checking item 0 in checklist: ${testState.simpleChecklistId}`);
        const response = await makeRequest('PUT', `/api/checklists/${testState.simpleChecklistId}/items/0/check`);
        if (response.status !== 200 || !response.body.success) {
            return { success: false, error: `Status ${response.status}` };
        }

        const checkResponse = await makeRequest('GET', '/api/checklists');
        const item = checkResponse.body.checklists.find(c => c.id === testState.simpleChecklistId).items[0];

        logStep(`Item 0 completed status: ${item.completed}`);
        return { success: item.completed === true, error: 'Item not marked as completed' };
    });

    await test(`PUT /api/checklists/:id/items/0/uncheck`, async () => {
        if (!testState.simpleChecklistId) return { success: false, error: 'No simple checklist ID' };

        logStep(`Unchecking item 0 in checklist: ${testState.simpleChecklistId}`);
        const response = await makeRequest('PUT', `/api/checklists/${testState.simpleChecklistId}/items/0/uncheck`);
        if (response.status !== 200 || !response.body.success) {
            return { success: false, error: `Status ${response.status}` };
        }

        const checkResponse = await makeRequest('GET', '/api/checklists');
        const item = checkResponse.body.checklists.find(c => c.id === testState.simpleChecklistId).items[0];

        logStep(`Item 0 completed status: ${item.completed}`);
        return { success: item.completed === false, error: 'Item not marked as incomplete' };
    });
}

const testUserAndSummaryEndpoints = async () => {
    console.log(`\n${colors.bright}--- Testing User & Summary Endpoints ---${colors.reset}`);

    await test(`GET /api/user/${testUsername} (user info)`, async () => {
        logStep(`Fetching user info for ${testUsername}`);
        const response = await makeRequest('GET', `/api/user/${testUsername}`);
        if (response.status === 200 && response.body.user) {
            logStep(`User info retrieved: ${response.body.user.username}`);
        }
        return {
            success: response.status === 200 && response.body.user && response.body.user.username === testUsername,
            error: response.status !== 200 ? `Status ${response.status}` : 'No user data returned'
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
            logStep(`Summary for ${testUsername} retrieved.`);
        }
        return {
            success: response.status === 200 && response.body.summary,
            error: response.status !== 200 ? `Status ${response.status}` : 'No summary returned'
        };
    });
}

const testExportEndpoints = async () => {
    console.log(`\n${colors.bright}--- Testing Export Endpoints ---${colors.reset}`);

    const exportTypes = [
        'all_checklists_notes',
        'user_checklists_notes',
        'all_users_data',
        'whole_data_folder'
    ];

    for (const type of exportTypes) {
        await test(`POST /api/exports (${type})`, async () => {
            logStep(`Requesting export: ${type}`);
            const payload = type === 'user_checklists_notes' ? { type, username: testUsername } : { type };
            const response = await makeRequest('POST', '/api/exports', payload);

            if (response.status === 200 && response.body.success && response.body.downloadUrl) {
                logStep(`Download URL received. Attempting to fetch...`);
                const downloadRes = await makeRequest('GET', response.body.downloadUrl, null, { 'Accept': 'application/zip' });
                // We just care that we got *a* response, not necessarily 200
                logStep(`Fetch attempt returned status: ${downloadRes.status}`);
            }
            return {
                success: response.status === 200 && response.body.success && response.body.downloadUrl,
                error: response.status !== 200 ? `Status ${response.status}` : 'Export failed or no download URL'
            };
        });
    }

    await test(`GET /api/exports (progress check)`, async () => {
        logStep(`Checking export progress`);
        const response = await makeRequest('GET', '/api/exports');
        logStep(`Progress: ${response.body.progress}% - ${response.body.message}`);
        return {
            success: response.status === 200 && typeof response.body.progress === 'number',
            error: response.status !== 200 ? `Status ${response.status}` : 'Failed to get export progress'
        };
    });
}

const testErrorHandling = async () => {
    console.log(`\n${colors.bright}--- Testing Error Handling ---${colors.reset}`);

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

    await test('Validation error (missing note title)', async () => {
        logStep(`Testing note creation without title...`);
        const response = await makeRequest('POST', '/api/notes', { content: 'No title provided' });
        logStep(`Response: ${response.status} - ${response.body.error}`);
        return {
            success: response.status === 400 && response.body.error === 'Title is required',
            error: `Expected 400 'Title is required', got ${response.status}`
        };
    });

    await test(`Validation error (missing item text)`, async () => {
        if (!testState.simpleChecklistId) return { success: false, error: 'No simple checklist ID' };
        logStep(`Testing item creation without text on: ${testState.simpleChecklistId}`);
        const response = await makeRequest('POST', `/api/checklists/${testState.simpleChecklistId}/items`, {});
        logStep(`Response: ${response.status} - ${response.body.error}`);
        return {
            success: response.status === 400 && response.body.error === 'Text is required',
            error: `Expected 400 'Text is required', got ${response.status}`
        };
    });

    await test('Not found error (invalid list)', async () => {
        const response = await makeRequest('PUT', '/api/checklists/nonexistent/items/0/check');
        return {
            success: response.status === 404 && response.body.error === 'List not found',
            error: `Expected 404 'List not found', got ${response.status}`
        };
    });

    await test(`Range error (invalid item index)`, async () => {
        if (!testState.simpleChecklistId) return { success: false, error: 'No simple checklist ID' };
        logStep(`Testing range error with index 999 on: ${testState.simpleChecklistId}`);
        const response = await makeRequest('PUT', `/api/checklists/${testState.simpleChecklistId}/items/999/check`);
        logStep(`Response: ${response.status} - ${response.body.error}`);
        return {
            success: response.status === 400 && response.body.error === 'Item index out of range',
            error: `Expected 400 'Item index out of range', got ${response.status}`
        };
    });

    await test('Not found error (invalid username)', async () => {
        const response = await makeRequest('GET', '/api/user/nonexistent_user_12345');
        return {
            success: response.status === 404 && response.body.error === 'User not found',
            error: `Expected 404 'User not found', got ${response.status}`
        };
    });
}

const printSummary = () => {
    console.log(`\n${colors.cyan}${colors.bright}📊 Test Summary${colors.reset}`);
    console.log(`${colors.green}✓ Passed: ${passed}${colors.reset}`);
    console.log(`${colors.red}✗ Failed: ${failed}${colors.reset}`);

    const total = passed + failed;
    if (total === 0) {
        console.log(`${colors.yellow}No tests were run.${colors.reset}`);
        return;
    }

    const percentage = Math.round((passed / total) * 100);

    if (percentage === 100) {
        console.log(`${colors.bgGreen}${colors.white} All tests passed! (${percentage}%) ${colors.reset}`);
    } else if (percentage >= 80) {
        console.log(`${colors.bgYellow}${colors.white} Most tests passed (${percentage}%) ${colors.reset}`);
    } else {
        console.log(`${colors.bgRed}${colors.white} Tests failed (${percentage}%) ${colors.reset}`);
    }
}

const manageTempExports = async (mode = 'post-clean') => {
    const exportTempDir = './data/temp_exports';
    try {
        const logColor = mode === 'pre-clean' ? colors.cyan : colors.blue;
        logStep(`${logColor}Attempting to ${mode} temporary export directory: ${exportTempDir}${colors.reset}`);

        const files = await fs.readdir(exportTempDir).catch(() => []);
        if (files.length > 0) {
            logStep(`${logColor}Files found: ${files.join(', ')}. Removing...${colors.reset}`);
        } else {
            logStep(`${logColor}Directory is already empty or does not exist.${colors.reset}`);
        }

        // Use fs.rm from 'fs/promises'
        await fs.rm(exportTempDir, { recursive: true, force: true });

        // Re-create the directory so the app doesn't crash if it expects it
        await fs.mkdir(exportTempDir, { recursive: true });

        logStep(`${logColor}Cleanup complete. Directory is now clean.${colors.reset}`);
        return true;
    } catch (err) {
        console.error(`${colors.red}Error during ${mode} of ${exportTempDir}:${colors.reset}`, err.message);
        return false;
    }
}

const main = async () => {
    await manageTempExports('pre-clean');

    console.log(`${colors.cyan}${colors.bright}🧪 Running API Endpoint Tests${colors.reset}\n`);

    try {
        await testSetup();
        await testNoteEndpoints();
        await testChecklistEndpoints();
        await testItemEndpoints();
        await testUserAndSummaryEndpoints();
        await testExportEndpoints();
        await testErrorHandling();
    } catch (e) {
        console.error(`${colors.red}A critical error occurred during test execution:${colors.reset}`, e);
        failed++;
    } finally {
        await manageTempExports('post-clean');
        printSummary();
        process.exit(failed > 0 ? 1 : 0);
    }
}

main();