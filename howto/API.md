# Jotty API

The REST API reads and writes your notes and checklists. Everything except the health check needs an API key.

## Authentication

### Getting an API key

1. Log into Jotty
2. Open your **Profile** by clicking your username in the sidebar
3. Go to the **Settings** tab
4. In the **API Key** section, click **Generate**
5. Copy the key. It starts with `ck_` followed by random characters
6. Keep it somewhere safe. Anyone holding it has full access to your account

### Using your API key

Send it in the `x-api-key` header:

```
x-api-key: ck_your_api_key_here
```

Every example in this file uses `ck_your_api_key_here`. Swap in your own key.

## Interactive API docs

Jotty can serve an OpenAPI spec that ReDoc renders as a browsable reference, with request and response examples for every endpoint.

### Running the API docs

ReDoc runs as its own Docker service and reads the spec from your running Jotty instance, so Jotty has to be up first.

#### Using Docker Compose

1. Set `ENABLE_API_DOCS` to `true` in the Jotty service of your `docker-compose.yml`:

   ```yaml
   environment:
     - ENABLE_API_DOCS=true
   ```

   Then add the ReDoc service underneath your Jotty service:

   ```yaml
    api-docs:
        image: redocly/redoc:latest
        container_name: jotty-api-docs
        ports:
          - "40126:80"
        environment:
          SPEC_URL: http://your-jotty-url.com/api/docs
        extra_hosts:
          - "host.docker.internal:host-gateway"
        depends_on:
          - jotty
        profiles:
          - api-docs
    ```


    `SPEC_URL` has to point at the `/api/docs` endpoint of your Jotty instance, and that endpoint only answers when `ENABLE_API_DOCS=true` is set on Jotty.

2. Start it with the `api-docs` profile:

   ```bash
   docker-compose --profile api-docs up -d
   ```

3. Open `http://localhost:40126`, or whichever host and port you mapped it to.

The spec comes from the running instance, so the docs always match the version of Jotty you have deployed.

### Troubleshooting

**The docs page says "Failed to load"**
- Check that `ENABLE_API_DOCS=true` is set on the Jotty service
- Check that Jotty is running and ReDoc can reach it
- Check that `SPEC_URL` points at your instance's `/api/docs`

**Nothing answers on the port you expected**
- See whether something else already has the port: `netstat -tlnp | grep :8080`
- Check the port mapping in your docker-compose.yml
- Check the api-docs container is running: `docker ps | grep api-docs`

**Requests fail with an auth error in the docs**
- Check the API key is valid and belongs to a user allowed to do what you're trying
- Check the header is spelled `x-api-key: ck_your_key_here`

## Identification

Every note and checklist has a UUID, a 36-character string such as `f47ac10b-58cc-4372-a567-0e02b2c3d479`. Endpoints take the UUID, not the title.

> **Deprecated: slug/category lookups.** A legacy filename slug still works as the item id, optionally with a `?category=` query parameter that defaults to "Uncategorized". Every such request logs a deprecation warning, and this fallback **will be removed in a future release**. All `id` fields in API responses are UUIDs, so switch any stored slugs to those now.

## Organization

### Categories

Every note and checklist sits in a category, such as "Work", "Personal" or "Shopping". Categories can nest.

- Items created without a category go into "Uncategorized"
- The list endpoints take a `category` filter
- The summary endpoint breaks counts down per category

### Checklist types

There are two kinds of checklist.

### Regular checklists

Plain to-do and shopping lists. Items only have `text` and `completed`.

### Task checklists

Checklists for projects and time tracking. Items also carry:
- `status`: `in_progress`, `paused` or `completed`
- `time`: either `0` or a JSON array of time entries

## Public endpoints

These need no API key.

### 1. Health check

**GET** `/api/health`

Returns whether the app is up and which version it is running. Point your uptime monitor or load balancer at it.

**Response:**

```json
{
  "status": "healthy",
  "version": "1.9.3",
  "timestamp": "2025-10-31T21:15:57.009Z"
}
```

**Response fields:**

- `status`: "healthy" or "unhealthy"
- `version`: the version from package.json, or null if it couldn't be read
- `timestamp`: current server time in ISO 8601
- `error`: the error message, only present when status is "unhealthy"

Anyone can call it, logged in or not.

## Authenticated endpoints

Everything from here on needs an API key.

### 2. Get all checklists

**GET** `/api/checklists`

Returns every checklist you own.

**Query parameters:**

- `category` (optional): only checklists in this category
- `type` (optional): `simple` or `task`
- `q` (optional): search titles and item text

**Response:**

```json
{
  "checklists": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "title": "My Tasks",
      "category": "Work",
      "type": "regular",
      "items": [
        {
          "index": 0,
          "text": "Task 1",
          "completed": false
        },
        {
          "index": 1,
          "text": "Task 2",
          "completed": true
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Project Tasks",
      "category": "Work",
      "type": "task",
      "items": [
        {
          "index": 0,
          "text": "Task with status",
          "completed": false,
          "status": "in_progress",
          "time": 0
        },
        {
          "index": 1,
          "text": "Task with time tracking",
          "completed": false,
          "status": "paused",
          "time": [
            {
              "id": "1757951487325",
              "startTime": "2025-09-15T15:51:24.610Z",
              "endTime": "2025-09-15T15:51:27.325Z",
              "duration": 2
            }
          ]
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

Every checklist has a `category`. Checklists created without one are in "Uncategorized".

### 3. Create checklist

**POST** `/api/checklists`

Creates a checklist owned by you.

**Request body:**

```json
{
  "title": "My New Checklist",
  "category": "Work",
  "type": "simple"
}
```

**Parameters:**

- `title` (required): the checklist title
- `category` (optional): defaults to "Uncategorized"
- `type` (optional): `simple` or `task`, defaults to "simple"

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "My New Checklist",
    "category": "Work",
    "type": "simple",
    "items": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Update checklist

**PUT** `/api/checklists/{listId}`

Changes a checklist's title, category or both.

**Request body:**

```json
{
  "title": "Updated Checklist Title",
  "category": "Personal"
}
```

**Parameters:**

- `title` (optional): the new title
- `category` (optional): the new category

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Updated Checklist Title",
    "category": "Personal",
    "type": "simple",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T12:30:00.000Z"
  }
}
```

### 5. Delete checklist

**DELETE** `/api/checklists/{listId}`

Deletes a checklist.

**Response:**

```json
{
  "success": true
}
```

### 6. Create checklist item

**POST** `/api/checklists/{listId}/items`

Adds an item to a checklist.

**Request body for regular checklists:**

```json
{
  "text": "New task to complete"
}
```

**Request body for task checklists:**

```json
{
  "text": "New task to complete",
  "status": "in_progress",
  "time": 0
}
```

**Task checklist parameters:**

- `text` (required): what the task is
- `status` (optional): `"in_progress"`, `"paused"` or `"completed"`, defaults to `"in_progress"`
- `time` (optional): `0` for no time tracked, or a JSON array of time entries. Defaults to `0`

**Response:**

```json
{
  "success": true
}
```

**Creating nested sub-items:**

To put the new item under an existing one, send `parentIndex` with the parent's index path:

```json
{
  "text": "Sub-task of first item",
  "parentIndex": "0"
}
```

Index paths are dot-separated, one number per level:
- `"0"` puts it under the first top-level item
- `"0.1"` puts it under the second child of the first item
- `"2.0.1"` puts it under the second child of the first child of the third top-level item

**Nested items in responses:**

An item with sub-items has a `children` array:

```json
{
  "items": [
    {
      "id": "list-123",
      "index": 0,
      "text": "Parent Task",
      "completed": false,
      "status": "in_progress",
      "description": "Implementation notes",
      "priority": "high",
      "score": 5,
      "startDate": "2026-06-10",
      "targetDate": "2026-06-15",
      "estimatedTime": 2.5,
      "createdBy": "alice",
      "createdAt": "2026-06-01T09:00:00.000Z",
      "lastModifiedBy": "alice",
      "lastModifiedAt": "2026-06-02T10:30:00.000Z",
      "history": [
        {
          "status": "in_progress",
          "timestamp": "2026-06-01T09:00:00.000Z",
          "user": "alice"
        }
      ],
      "children": [
        {
          "id": "list-sub-456",
          "index": 0,
          "text": "Sub-task 1",
          "completed": false
        },
        {
          "id": "list-sub-789",
          "index": 1,
          "text": "Sub-task 2",
          "completed": true,
          "children": [
            {
              "id": "list-sub-sub-999",
              "index": 0,
              "text": "Nested sub-task",
              "completed": false
            }
          ]
        }
      ]
    }
  ]
}
```

### Update checklist item

**PATCH** `/api/checklists/{listId}/items/{itemIndex}`

Changes any of the writable fields on an item. Fields you leave out stay as they are. `itemIndex` can be a nested index path.

**Request body:**

```json
{
  "text": "Updated task title",
  "description": "Additional notes",
  "priority": "high",
  "score": 5,
  "startDate": "2026-06-10",
  "targetDate": "2026-06-15",
  "estimatedTime": 2.5
}
```

**Writable fields:**

- `text` (optional): the item title
- `description` (optional): the item body or notes
- `priority` (optional): `"critical"`, `"high"`, `"medium"`, `"low"` or `"none"`
- `score` (optional): a number
- `startDate` (optional): an ISO date string
- `targetDate` (optional): an ISO date string
- `estimatedTime` (optional): estimated hours

**Response:**

```json
{
  "success": true
}
```

### 7. Check item

**PUT** `/api/checklists/{listId}/items/{itemIndex}/check`

Marks an item as done. `itemIndex` can be a nested index path.

**Examples:**
- `/api/checklists/{listId}/items/0/check` checks the first top-level item
- `/api/checklists/{listId}/items/0.1/check` checks the second child of the first item
- `/api/checklists/{listId}/items/2.0.1/check` checks a grandchild

**Response:**

```json
{
  "success": true
}
```

### 8. Uncheck item

**PUT** `/api/checklists/{listId}/items/{itemIndex}/uncheck`

Marks an item as not done. `itemIndex` can be a nested index path.

**Examples:**
- `/api/checklists/{listId}/items/1/uncheck` unchecks the second top-level item
- `/api/checklists/{listId}/items/0.0/uncheck` unchecks the first child of the first item

**Response:**

```json
{
  "success": true
}
```

### 9. Delete item

**DELETE** `/api/checklists/{listId}/items/{itemIndex}`

Deletes a checklist item. `itemIndex` can be a nested index path.

**Examples:**
- `/api/checklists/{listId}/items/2` deletes the third top-level item
- `/api/checklists/{listId}/items/0.1` deletes the second child of the first item
- `/api/checklists/{listId}/items/1.0.2` deletes a grandchild

**Response:**

```json
{
  "success": true
}
```

### 10. Get all notes

**GET** `/api/notes`

Returns every note you own.

**Query parameters:**

- `category` (optional): only notes in this category
- `q` (optional): search titles and content

**Response:**

```json
{
  "notes": [
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "title": "My Note",
      "category": "Personal",
      "content": "Note content here...",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

Every note has a `category`. Notes created without one are in "Uncategorized".

### 11. Create note

**POST** `/api/notes`

Creates a note owned by you.

**Request body:**

```json
{
  "title": "My New Note",
  "content": "Note content here...",
  "category": "Personal"
}
```

**Parameters:**

- `title` (required): the note title
- `content` (optional): the body in markdown, defaults to an empty string
- `category` (optional): defaults to "Uncategorized"

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "note-123",
    "title": "My New Note",
    "content": "Note content here...",
    "category": "Personal",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "owner": "username"
  }
}
```

### 12. Update note

**PUT** `/api/notes/{noteId}`

Updates a note.

**Request body:**

```json
{
  "title": "Updated Note Title",
  "content": "Updated note content...",
  "category": "Work",
  "originalCategory": "Personal"
}
```

**Parameters:**

- `title` (required): the new title
- `content` (optional): the new body in markdown
- `category` (optional): the category to put it in, defaults to "Uncategorized"
- `originalCategory` (optional): the category the note is in now, used to find it

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "title": "Updated Note Title",
    "content": "Updated note content...",
    "category": "Work",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-02T10:30:00.000Z",
    "owner": "username"
  }
}
```

### 13. Delete note

**DELETE** `/api/notes/{noteId}`

Deletes a note.

**Response:**

```json
{
  "success": true
}
```

## Tasks

The `/tasks` endpoints work on task checklists as Kanban boards. Each board has its own list of statuses, one per column, and every item sits in one of them.

### 14. Get all tasks

**GET** `/api/tasks`

Returns every task checklist you own.

**Query parameters:**

- `category` (optional): only tasks in this category
- `status` (optional): only tasks with at least one item in this status
- `q` (optional): search titles and item text

**Response:**

```json
{
  "tasks": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "title": "Sprint Tasks",
      "category": "Work",
      "statuses": [
        { "id": "todo", "label": "To Do", "order": 0 },
        { "id": "in_progress", "label": "In Progress", "order": 1 },
        { "id": "completed", "label": "Completed", "order": 2 }
      ],
      "items": [
        {
          "id": "task-1",
          "index": 0,
          "text": "Implement user authentication",
          "status": "in_progress",
          "completed": false
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 15. Create task

**POST** `/api/tasks`

Creates a task checklist owned by you.

**Request body:**

```json
{
  "title": "New Sprint",
  "category": "Work",
  "statuses": [
    { "id": "todo", "label": "To Do", "order": 0 },
    { "id": "review", "label": "In Review", "order": 1, "color": "#3b82f6" },
    { "id": "done", "label": "Done", "order": 2 }
  ]
}
```

**Parameters:**

- `title` (required): the task checklist title
- `category` (optional): defaults to "Uncategorized"
- `statuses` (optional): your own Kanban columns, defaults to todo/in_progress/completed

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "New Sprint",
    "category": "Work",
    "statuses": [
      { "id": "todo", "label": "To Do", "order": 0 },
      { "id": "review", "label": "In Review", "order": 1, "color": "#3b82f6" },
      { "id": "done", "label": "Done", "order": 2 }
    ],
    "items": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 16. Get task

**GET** `/api/tasks/{taskId}`

Returns one task checklist.

**Response:**

```json
{
  "task": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "title": "Sprint Tasks",
    "category": "Work",
    "statuses": [
      { "id": "todo", "label": "To Do", "order": 0 },
      { "id": "in_progress", "label": "In Progress", "order": 1 },
      { "id": "completed", "label": "Completed", "order": 2 }
    ],
    "items": [
      {
        "id": "task-1",
        "index": 0,
        "text": "Implement user authentication",
        "status": "in_progress",
        "completed": false
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 17. Update task

**PUT** `/api/tasks/{taskId}`

Changes the title, the category or both. Both fields are optional.

**Request body:**

```json
{
  "title": "Updated Sprint Title",
  "category": "Projects"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Updated Sprint Title",
    "category": "Projects",
    "statuses": [...],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T12:30:00.000Z"
  }
}
```

### 18. Delete task

**DELETE** `/api/tasks/{taskId}`

Deletes a task checklist.

**Response:**

```json
{
  "success": true
}
```

### 19. Get task statuses

**GET** `/api/tasks/{taskId}/statuses`

Returns the Kanban columns of a task.

**Response:**

```json
{
  "statuses": [
    { "id": "todo", "label": "To Do", "order": 0 },
    { "id": "in_progress", "label": "In Progress", "order": 1 },
    { "id": "completed", "label": "Completed", "order": 2 }
  ]
}
```

### 20. Create status

**POST** `/api/tasks/{taskId}/statuses`

Adds a Kanban column to a task.

**Request body:**

```json
{
  "id": "review",
  "label": "In Review",
  "color": "#3b82f6",
  "order": 2
}
```

**Parameters:**

- `id` (required): a unique id for the status
- `label` (required): the column name people see
- `color` (optional): the column color
- `order` (optional): where the column goes, defaults to last

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "review",
    "label": "In Review",
    "color": "#3b82f6",
    "order": 2
  }
}
```

### 21. Update status

**PUT** `/api/tasks/{taskId}/statuses/{statusId}`

Changes a Kanban column.

**Request body:**

```json
{
  "label": "Code Review",
  "color": "#8b5cf6",
  "order": 3
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "review",
    "label": "Code Review",
    "color": "#8b5cf6",
    "order": 3
  }
}
```

### 22. Delete status

**DELETE** `/api/tasks/{taskId}/statuses/{statusId}`

Deletes a Kanban column. Items in it move to the first remaining status.

**Response:**

```json
{
  "success": true
}
```

### 23. Create task item

**POST** `/api/tasks/{taskId}/items`

Adds an item to a task checklist.

**Request body:**

```json
{
  "text": "Implement user authentication",
  "status": "todo"
}
```

**Creating nested items:**

To put the new item under an existing one, send `parentIndex` with the parent's index path:

```json
{
  "text": "Sub-task: Add login form",
  "status": "todo",
  "parentIndex": "0"
}
```

Index path examples:
- `"0"` puts it under the first top-level item
- `"0.1"` puts it under the second child of the first item
- `"2.0.1"` puts it under the second child of the first child of the third top-level item

**Parameters:**

- `text` (required): the item text
- `status` (optional): the starting status, defaults to "todo"
- `parentIndex` (optional): index path of the parent item

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "task-item-1234567890"
  }
}
```

### Get task item

**GET** `/api/tasks/{taskId}/items/{itemIndex}`

Returns one task item with its `children` and Kanban fields. `itemIndex` can be a nested index path.

**Response:**

```json
{
  "item": {
    "id": "task-item-1234567890",
    "index": 0,
    "text": "Implement user authentication",
    "completed": false,
    "status": "todo",
    "time": 0,
    "description": "Add login and token refresh",
    "priority": "high",
    "score": 5,
    "startDate": "2026-06-10",
    "targetDate": "2026-06-15",
    "estimatedTime": 2.5,
    "createdBy": "alice",
    "createdAt": "2026-06-01T09:00:00.000Z",
    "lastModifiedBy": "alice",
    "lastModifiedAt": "2026-06-02T10:30:00.000Z",
    "history": [
      {
        "status": "todo",
        "timestamp": "2026-06-01T09:00:00.000Z",
        "user": "alice"
      }
    ],
    "children": []
  }
}
```

### 24. Update item status

**PUT** `/api/tasks/{taskId}/items/{itemIndex}/status`

Moves an item to another Kanban column by changing its status.

**Request body:**

```json
{
  "status": "in_progress"
}
```

**Parameters:**

- `status` (required): the new status

**Response:**

```json
{
  "success": true
}
```

**Example, moving a nested item:**

```bash
PUT /api/tasks/550e8400-e29b-41d4-a716-446655440000/items/0.1/status
{
  "status": "completed"
}
```

### 25. Delete task item

**DELETE** `/api/tasks/{taskId}/items/{itemIndex}`

Deletes an item from a task checklist.

**Response:**

```json
{
  "success": true
}
```

**Example, deleting a nested item:**

```bash
DELETE /api/tasks/550e8400-e29b-41d4-a716-446655440000/items/0.1
```

This deletes the second child of the first top-level item.

### 26. Get user information

**GET** `/api/user/{username}`

Returns a user's profile. You get the full record for yourself, or for anyone if you are an admin. Everybody else gets the public fields only.

**Response (own profile or admin):**

```json
{
  "user": {
    "username": "fccview",
    "isAdmin": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastLogin": "2024-01-15T10:30:00.000Z",
    "avatarUrl": "https://example.com/avatar.jpg",
    "preferredTheme": "dark",
    "imageSyntax": "markdown",
    "tableSyntax": "markdown",
    "landingPage": "checklists",
    "notesAutoSaveInterval": 5000,
    "notesDefaultEditor": "wysiwyg",
    "notesDefaultMode": "edit",
    "pinnedLists": ["Work/project-tasks"],
    "pinnedNotes": ["Personal/important-note"]
  }
}
```

**Response (Public):**

```json
{
  "user": {
    "username": "fccview",
    "avatarUrl": "https://example.com/avatar.jpg",
    "preferredTheme": "dark"
  }
}
```

`passwordHash`, `apiKey` and other secrets are never in the response.

### 27. Get all categories

**GET** `/api/categories`

Returns your note and checklist categories. Archived categories are left out.

**Response:**

```json
{
  "categories": {
    "notes": [
      {
        "name": "Personal",
        "path": "Personal",
        "count": 5,
        "level": 0
      },
      {
        "name": "Work",
        "path": "Work",
        "count": 3,
        "level": 0
      },
      {
        "name": "Projects",
        "path": "Work/Projects",
        "count": 2,
        "level": 1
      }
    ],
    "checklists": [
      {
        "name": "Shopping",
        "path": "Shopping",
        "count": 4,
        "level": 0
      },
      {
        "name": "Work",
        "path": "Work",
        "count": 6,
        "level": 0
      }
    ]
  }
}
```

**Response fields:**

- `name`: the category name
- `path`: the full path, parent categories included
- `count`: how many items are in it
- `level`: how deep it is nested, 0 for top-level categories

### 28. Rebuild link index

**POST** `/api/admin/rebuild-index`

Rebuilds the relationships index, the list of which notes and checklists link to each other. Jotty keeps it up to date on its own and checks it against your files every minute, so you only need this after editing lots of files outside Jotty, restoring a backup, or if the brain looks wrong.

**Request body:**

```json
{
  "username": "fccview"
}
```

**Parameters:**

- `username` (optional): Whose index to rebuild. Leave it out to rebuild your own. Only admins can name somebody else.

**Response:**

```json
{
  "success": true,
  "message": "Successfully rebuilt link index for fccview"
}
```

**Errors:**

- `401`: missing or invalid API key
- `403`: you named another user and your API key does not belong to an admin
- `404`: no user with that username

**Notes:**

- Any user can rebuild their own index. Rebuilding everybody at once is in **Admin > Content**
- Rebuilding reads your notes and checklists and never changes them
- Encrypted notes are skipped, their content is never read
- Wikilinks keep pointing at the note they were first matched to, so a rebuild does not move them onto a different note with the same title
- The index lives in `data/.relations.db`. If it is deleted, Jotty rebuilds it from your files

### 29. Get user summary statistics

**GET** `/api/summary`

Returns counts for your notes, checklists, items and tasks, broken down by category.

**Query parameters:**

- `username` (optional): whose summary to return. Leave it out for your own. Only admins can ask for somebody else's.

**Response:**

```json
{
  "summary": {
    "username": "fccview",
    "notes": {
      "total": 4,
      "categories": {
        "Personal": 2,
        "Work": 2
      }
    },
    "checklists": {
      "total": 6,
      "categories": {
        "Work": 3,
        "Personal": 2,
        "Uncategorized": 1
      },
      "types": {
        "simple": 4,
        "task": 2
      }
    },
    "items": {
      "total": 27,
      "completed": 3,
      "pending": 24,
      "completionRate": 11
    },
    "tasks": {
      "total": 14,
      "completed": 0,
      "inProgress": 8,
      "todo": 6,
      "completionRate": 0
    }
  }
}
```

**Response fields:**

- `notes.total`: number of notes
- `notes.categories`: notes per category
- `checklists.total`: number of checklists
- `checklists.categories`: checklists per category
- `checklists.types`: checklists per type, simple or task
- `items.total`: number of checklist items
- `items.completed`: items ticked off
- `items.pending`: items not ticked off
- `items.completionRate`: percentage of items completed, 0-100
- `tasks.total`: number of tasks in task checklists
- `tasks.completed`: tasks completed
- `tasks.inProgress`: tasks in progress
- `tasks.todo`: tasks not started
- `tasks.completionRate`: percentage of tasks completed, 0-100

## Error responses

Status codes you can get back:

- `200`: success
- `400`: bad request, usually a missing or invalid parameter
- `401`: missing or invalid API key
- `403`: you're not allowed to do that, usually because it needs an admin
- `404`: the checklist, note or item doesn't exist
- `500`: something broke on the server

Errors come back as:

```json
{
  "error": "Error message description"
}
```

## Export endpoints

### 1. Request data export

**POST** `/api/exports`

Starts an export and returns the URL to download it from.

**Request body:**

```json
{
  "type": "<export_type>",
  "username"?: "<username>"
}
```

**Export types:**

- `all_checklists_notes`: every checklist and note, for every user
- `user_checklists_notes`: every checklist and note for one user. Needs `username` in the body
- `all_users_data`: the user records
- `whole_data_folder`: the whole data folder, minus temporary export files

**Response:**

```json
{
  "success": true,
  "downloadUrl": "/api/exports/all_checklists_notes_1678886400000.zip"
}
```

### 2. Get export progress

**GET** `/api/exports`

Returns how far along the running export is.

**Response:**

```json
{
  "progress": 75,
  "message": "Compressing files: 150/200 bytes"
}
```

## Audit logs

Jotty writes an audit log entry for logins, edits, shares and other user actions. These endpoints read, export, summarise and clean up those entries.

### GET /logs

Returns audit log entries, filtered and paginated.

**Access:**
- Users see their own logs
- Admins see everybody's

**Query parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| username | string | No | Only this user's entries. Admin only, non-admins always get their own |
| action | string | No | Action type, such as "login", "logout" or "checklist_created" |
| category | string | No | One of auth, user, checklist, note, sharing, settings, encryption, api, system, file, upload |
| level | string | No | DEBUG, INFO, WARNING, ERROR or CRITICAL |
| startDate | string (ISO 8601) | No | Start of the range (default: 30 days ago) |
| endDate | string (ISO 8601) | No | End of the range (default: now) |
| success | boolean | No | Only entries that succeeded, or only ones that failed |
| limit | integer | No | How many entries to return (default: 50) |
| offset | integer | No | How many entries to skip (default: 0) |

**Request example:**

```bash
curl -X GET "http://localhost:3000/api/logs?category=auth&limit=10&success=true" \
  -H "x-api-key: YOUR_API_KEY"
```

**Response:**

```json
{
  "success": true,
  "logs": [
    {
      "id": "1766778674300",
      "uuid": "4a0d76b5-18de-400c-8b36-5fbdd9d8299b",
      "timestamp": "2025-12-26T19:51:14.300Z",
      "level": "INFO",
      "username": "fccview",
      "action": "login",
      "category": "auth",
      "resourceType": null,
      "resourceId": null,
      "resourceTitle": null,
      "metadata": {},
      "ipAddress": "::ffff:192.168.86.20",
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "success": true,
      "errorMessage": null,
      "duration": 150
    }
  ],
  "total": 1
}
```

### POST /logs/export

Downloads audit logs as JSON or CSV.

**Access:**
- Users export their own logs
- Admins can export everybody's, or one user's

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| format | string | Yes | "json" or "csv" |
| filters | object | No | The same filters as GET /logs |

**Request example (JSON):**

```bash
curl -X POST "http://localhost:3000/api/logs/export" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "json",
    "filters": {
      "category": "checklist",
      "startDate": "2025-12-01T00:00:00Z",
      "endDate": "2025-12-26T23:59:59Z",
      "limit": 100
    }
  }'
```

**Request example (CSV):**

```bash
curl -X POST "http://localhost:3000/api/logs/export" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "csv",
    "filters": {
      "success": false,
      "level": "ERROR"
    }
  }' > error_logs.csv
```

**Response (JSON format):**

A JSON array of log entries, sent with a Content-Disposition header so it downloads as a file.

**Response (CSV format):**

A CSV file with these columns:
```
Timestamp,Level,Username,Action,Category,Resource Type,Resource ID,Resource Title,Success,IP Address,Error Message
```

### GET /logs/stats

Returns totals across the audit log: entries per level and category, the busiest actions and users, and recent activity.

**Access:** admins only.

**Request example:**

```bash
curl -X GET "http://localhost:3000/api/logs/stats" \
  -H "x-api-key: YOUR_API_KEY"
```

**Response:**

```json
{
  "totalLogs": 1250,
  "logsByLevel": {
    "DEBUG": 50,
    "INFO": 800,
    "WARNING": 300,
    "ERROR": 90,
    "CRITICAL": 10
  },
  "logsByCategory": {
    "auth": 450,
    "user": 200,
    "checklist": 300,
    "note": 250,
    "system": 50
  },
  "topActions": [
    {
      "action": "login",
      "count": 350
    },
    {
      "action": "checklist_updated",
      "count": 245
    }
  ],
  "topUsers": [
    {
      "username": "fccview",
      "count": 425
    },
    {
      "username": "john_doe",
      "count": 380
    }
  ],
  "recentActivity": [
    {
      "id": "1766778674300",
      "uuid": "4a0d76b5-18de-400c-8b36-5fbdd9d8299b",
      "timestamp": "2025-12-26T19:51:14.300Z",
      "level": "WARNING",
      "username": "fccview",
      "action": "logs_cleaned",
      "category": "system",
      "metadata": {
        "deletedFiles": 4
      },
      "ipAddress": "::ffff:192.168.86.20",
      "userAgent": "Mozilla/5.0...",
      "success": true
    }
  ]
}
```

### POST /logs/cleanup

Deletes audit logs older than the retention period set on the instance.

**Access:** admins only.

**Request example:**

```bash
curl -X POST "http://localhost:3000/api/logs/cleanup" \
  -H "x-api-key: YOUR_API_KEY"
```

**Response:**

```json
{
  "success": true,
  "deletedFiles": 15
}
```

### Audit log fields

Each entry has these fields:

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unix timestamp, as a string |
| uuid | string | UUID of the entry |
| timestamp | string | ISO 8601 timestamp |
| level | string | DEBUG, INFO, WARNING, ERROR or CRITICAL |
| username | string | Who did it |
| action | string | What they did |
| category | string | Which area it belongs to |
| resourceType | string | What kind of thing it touched, such as "checklist" or "note" |
| resourceId | string | UUID of the thing it touched |
| resourceTitle | string | Title of the thing it touched |
| metadata | object | Extra context, different per action |
| ipAddress | string | IP address of the request |
| userAgent | string | User agent of the request |
| success | boolean | Whether it worked |
| errorMessage | string | The error, if it didn't |
| duration | integer | How long it took, in milliseconds |

### Common audit actions

**Authentication:**
- `login`, `logout`, `register`, `session_terminated`

**User management:**
- `user_created`, `user_updated`, `user_deleted`, `profile_updated`, `user_settings_updated`

**Checklists:**
- `checklist_created`, `checklist_updated`, `checklist_deleted`, `checklist_shared`, `checklist_unshared`

**Notes:**
- `note_created`, `note_updated`, `note_deleted`, `note_shared`, `note_unshared`

**Encryption:**
- `note_encrypted`, `note_decrypted`, `encryption_keys_generated`, `encryption_keys_imported`

**System:**
- `logs_cleaned`, `export_created`, `migration_check`, `file_scan`

**API:**
- `api_key_generated`, `api_request`

## Usage examples

### Health check (public endpoint)

```bash
curl https://jotty-instance.com/api/health
```

### Get all checklists

```bash
curl -H "x-api-key: ck_your_api_key_here" \
     https://jotty-instance.com/api/checklists
```

### Filter checklists by category

```bash
curl -H "x-api-key: ck_your_api_key_here" \
     "https://jotty-instance.com/api/checklists?category=Work"
```

### Filter checklists by type

```bash
curl -H "x-api-key: ck_your_api_key_here" \
     "https://jotty-instance.com/api/checklists?type=task"
```

### Search checklists

```bash
curl -H "x-api-key: ck_your_api_key_here" \
     "https://jotty-instance.com/api/checklists?q=meeting"
```

### Create a checklist

```bash
curl -X POST \
     -H "x-api-key: ck_your_api_key_here" \
     -H "Content-Type: application/json" \
     -d '{"title": "My New Checklist", "category": "Work", "type": "simple"}' \
     https://jotty-instance.com/api/checklists
```

### Update a checklist

```bash
curl -X PUT \
     -H "x-api-key: ck_your_api_key_here" \
     -H "Content-Type: application/json" \
     -d '{"title": "Updated Title", "category": "Personal"}' \
     https://jotty-instance.com/api/checklists/<checklist_id>
```

### Delete a checklist

```bash
curl -X DELETE \
     -H "x-api-key: ck_your_api_key_here" \
     https://jotty-instance.com/api/checklists/<checklist_id>
```

### Add item to regular checklist

```bash
curl -X POST \
     -H "x-api-key: ck_your_api_key_here" \
     -H "Content-Type: application/json" \
     -d '{"text": "New task"}' \
     https://jotty-instance.com/api/checklists/<checklist_id>/items
```

### Add item to task checklist

```bash
curl -X POST \
     -H "x-api-key: ck_your_api_key_here" \
     -H "Content-Type: application/json" \
     -d '{"text": "New task with status", "status": "in_progress", "time": 0}' \
     https://jotty-instance.com/api/checklists/<task_checklist_id>/items
```

### Check item (mark as completed)

```bash
curl -X PUT \
     -H "x-api-key: ck_your_api_key_here" \
     https://jotty-instance.com/api/checklists/<checklist_id>/items/<item_index>/check
```

### Uncheck item (mark as incomplete)

```bash
curl -X PUT \
     -H "x-api-key: ck_your_api_key_here" \
     https://jotty-instance.com/api/checklists/<checklist_id>/items/<item_index>/uncheck
```

### Get all notes

```bash
curl -H "x-api-key: ck_your_api_key_here" \
     https://jotty-instance.com/api/notes
```

### Filter notes by category

```bash
curl -H "x-api-key: ck_your_api_key_here" \
     "https://jotty-instance.com/api/notes?category=Personal"
```

### Search notes

```bash
curl -H "x-api-key: ck_your_api_key_here" \
     "https://jotty-instance.com/api/notes?q=meeting"
```

### Create a note

```bash
curl -X POST \
     -H "x-api-key: ck_your_api_key_here" \
     -H "Content-Type: application/json" \
     -d '{"title": "My New Note", "content": "This is the content", "category": "Personal"}' \
     https://jotty-instance.com/api/notes
```

### Get user information

```bash
# Get your own user info
curl -H "x-api-key: ck_your_api_key_here" \
     https://jotty-instance.com/api/user/your_username

# Get another user's public info
curl -H "x-api-key: ck_your_api_key_here" \
     https://jotty-instance.com/api/user/other_username
```

### Get all categories

```bash
curl -H "x-api-key: ck_your_api_key_here" \
     https://jotty-instance.com/api/categories
```

### Get user summary statistics

```bash
# Get summary for current user
curl -H "x-api-key: ck_your_api_key_here" \
     https://jotty-instance.com/api/summary

# Get summary for specific user (admin only)
curl -H "x-api-key: ck_admin_api_key_here" \
     "https://jotty-instance.com/api/summary?username=testuser"
```

### Export all checklists and notes

```bash
curl -X POST \
     -H "x-api-key: ck_your_api_key_here" \
     -H "Content-Type: application/json" \
     -d '{"type": "all_checklists_notes"}' \
     https://jotty-instance.com/api/exports
```

### Export user specific checklists and notes

```bash
curl -X POST \
     -H "x-api-key: ck_your_api_key_here" \
     -H "Content-Type: application/json" \
     -d '{"type": "user_checklists_notes", "username": "testuser"}' \
     https://jotty-instance.com/api/exports
```

### Get export progress

```bash
curl -H "x-api-key: ck_your_api_key_here" \
     https://jotty-instance.com/api/exports
```

### Rebuild your link index

```bash
curl -X POST \
     -H "x-api-key: ck_your_api_key_here" \
     https://jotty-instance.com/api/admin/rebuild-index
```

Admins can add `-H "Content-Type: application/json" -d '{"username": "fccview"}'` to rebuild somebody else's.

## Rebuilding the link index on a schedule

> [!TIP]
> You probably don't need this. Jotty already checks the index against your files every minute. A scheduled rebuild only earns its keep if something outside Jotty writes to the data folder regularly, a sync tool or a script, and you'd rather not wait for the check to notice.

### Example script

This script (`rebuild-index.sh`) rebuilds the index for a list of users. It needs an admin API key:

```bash
#!/bin/bash

# rebuild-index.sh - Rebuild link indexes for specific users
API_KEY="ck_your_admin_api_key_here"
BASE_URL="https://jotty-instance.com"

# Get all usernames (requires admin API access)
usernames=("user1" "user2" "user3")

for username in "${usernames[@]}"; do
    echo "Rebuilding index for user: $username"

    response=$(curl -s -X POST \
        -H "x-api-key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$username\"}" \
        "$BASE_URL/api/admin/rebuild-index")

    if echo "$response" | grep -q '"success":true'; then
        echo "Successfully rebuilt index for $username"
    else
        echo "Failed to rebuild index for $username: $response"
    fi

    # Small delay between requests
    sleep 1
done

echo "Index rebuild complete"
```

Make it executable:

```bash
chmod +x rebuild-index.sh
```

### Adding it to cron

To run it weekly, every Sunday at 2:00 AM:

```bash
# Edit crontab
crontab -e

# Add this line to run weekly on Sundays at 2:00 AM
0 2 * * 0 /path/to/rebuild-index.sh >> /var/log/checklist-index-rebuild.log 2>&1
```

Daily also works, but on an instance with a lot of items that is a lot of reading for very little:

```bash
# Daily at 2:00 AM
0 2 * * * /path/to/rebuild-index.sh >> /var/log/checklist-index-rebuild.log 2>&1
```

### Just your own index

Without an admin key you can only rebuild your own index. This version does that:

```bash
#!/bin/bash

# rebuild-my-index.sh - Rebuild link index for current user
API_KEY="ck_your_api_key_here"
USERNAME="your_username"
BASE_URL="https://jotty-instance.com"

echo "Rebuilding link index for $USERNAME"

response=$(curl -s -X POST \
    -H "x-api-key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"$USERNAME\"}" \
    "$BASE_URL/api/admin/rebuild-index")

if echo "$response" | grep -q '"success":true'; then
    echo "✅ Successfully rebuilt index"
else
    echo "❌ Failed to rebuild index: $response"
fi
```

### Tips

- Run the script by hand once before you schedule it
- The log file grows every run, so give it a `logrotate` rule
- If you back up the data folder on a schedule, run the rebuild after the backup rather than during it
- Glance at the log now and then. A rebuild that fails every week is telling you something

## Things worth knowing

- Item indexes start at 0
- Timestamps are ISO 8601
- API keys don't expire. Regenerate yours from your profile if it leaks
- You can only reach items you own, unless you're an admin
- Time entries are JSON arrays with `id`, `startTime`, `endTime` and `duration`
- The user endpoint returns more fields for yourself and for admins than for anybody else
- The API is still growing. Expect new endpoints and fields, and existing ones to keep working
