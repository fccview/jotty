# Checklist API Documentation

This API provides programmatic access to your checklists and notes. All endpoints require authentication via API key.

## Authentication

### Getting an API Key

1. Log into your checklist application
2. Navigate to your **Profile** (click on your username in the sidebar)
3. Go to the **Settings** tab
4. In the **API Key** section, click **Generate** to create a new API key
5. Copy the generated API key (format: `ck_` followed by random characters)
6. **Important**: Store this key securely - it provides full access to your account

### Using Your API Key

Include your API key in the request header:

```
x-api-key: ck_your_api_key_here
```

**Note**: Replace `ck_your_api_key_here` with your actual API key.

## Organization Features

### Categories

All checklists and notes support categorization for better organization:

- **Default Category**: Items without a specified category are automatically assigned to "Uncategorized"
- **Category Filtering**: You can organize your content by categories like "Work", "Personal", "Shopping", etc.
- **Category Breakdown**: The API provides category statistics in summary endpoints

### Checklist Types

The API supports two types of checklists:

### Regular Checklists

- Simple checklists with basic items
- Items have only `text` and `completed` status
- Used for simple to-do lists and shopping lists

### Task Checklists

- Advanced checklists with task management features
- Items include additional metadata:
  - `status`: Task status (`in_progress`, `paused`, `completed`)
  - `time`: Time tracking data (either `0` or JSON array of time entries)
- Used for project management and time tracking

## Endpoints

### 1. Get All Checklists

**GET** `/api/checklists`

Retrieves all checklists for the authenticated user.

**Response:**

```json
{
  "checklists": [
    {
      "id": "<checklistID>",
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
      "id": "<taskChecklistID>",
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

**Note**: All checklists include a `category` field for organization. If no category is specified when creating a checklist, it defaults to "Uncategorized".

### 2. Create Checklist Item

**POST** `/api/checklists/{listId}/items`

Adds a new item to the specified checklist.

**Request Body for Regular Checklists:**

```json
{
  "text": "New task to complete"
}
```

**Request Body for Task Checklists:**

```json
{
  "text": "New task to complete",
  "status": "in_progress",
  "time": 0
}
```

**Task Checklist Parameters:**

- `text` (required): The task description
- `status` (optional): Task status - `"in_progress"`, `"paused"`, or `"completed"` (defaults to `"in_progress"`)
- `time` (optional): Time tracking value - either `0` for no time tracked or a JSON array of time entries (defaults to `0`)

**Response:**

```json
{
  "success": true
}
```

### 3. Check Item

**PUT** `/api/checklists/{listId}/items/{itemIndex}/check`

Marks an item as completed. Use the item index (0-based) from the checklist response.

**Response:**

```json
{
  "success": true
}
```

### 4. Uncheck Item

**PUT** `/api/checklists/{listId}/items/{itemIndex}/uncheck`

Marks an item as incomplete. Use the item index (0-based) from the checklist response.

**Response:**

```json
{
  "success": true
}
```

### 5. Get All Notes

**GET** `/api/notes`

Retrieves all notes/documents for the authenticated user.

**Response:**

```json
{
  "notes": [
    {
      "id": "note-123",
      "title": "My Note",
      "category": "Personal",
      "content": "Note content here...",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Note**: All notes include a `category` field for organization. If no category is specified when creating a note, it defaults to "Uncategorized".

### 6. Get User Summary Statistics

**GET** `/api/summary`

Retrieves comprehensive statistics about the authenticated user's content, including notes, checklists, items, and tasks with category breakdowns.

**Query Parameters:**

- `username` (optional): Username to get summary for. If not provided, uses the authenticated user. **Note**: Only administrators can query other users' data.

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

**Response Fields:**

- `notes.total`: Total number of notes
- `notes.categories`: Breakdown of notes by category
- `checklists.total`: Total number of checklists
- `checklists.categories`: Breakdown of checklists by category
- `checklists.types`: Breakdown of checklists by type (simple/task)
- `items.total`: Total number of checklist items
- `items.completed`: Number of completed items
- `items.pending`: Number of pending items
- `items.completionRate`: Percentage of completed items (0-100)
- `tasks.total`: Total number of tasks (from task-type checklists)
- `tasks.completed`: Number of completed tasks
- `tasks.inProgress`: Number of in-progress tasks
- `tasks.todo`: Number of todo tasks
- `tasks.completionRate`: Percentage of completed tasks (0-100)

## Error Responses

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid or missing API key)
- `403` - Forbidden (admin access required for certain operations)
- `404` - Not Found (checklist/item not found)
- `500` - Internal Server Error

Error response format:

```json
{
  "error": "Error message description"
}
```

## Export Endpoints

### 1. Request Data Export

**POST** `/api/exports`

Initiates an export of user data. The API will return a download URL upon successful initiation.

**Request Body:**

```json
{
  "type": "<export_type>",
  "username"?: "<username>"
}
```

**Export Types:**

- `all_checklists_notes`: Exports all checklists and notes across all users.
- `user_checklists_notes`: Exports all checklists and notes for a specific user. Requires `username` in the request body.
- `all_users_data`: Exports all user registration data.
- `whole_data_folder`: Exports the entire data folder, excluding temporary export files.

**Response:**

```json
{
  "success": true,
  "downloadUrl": "/api/exports/all_checklists_notes_1678886400000.zip"
}
```

### 2. Get Export Progress

**GET** `/api/exports`

Retrieves the current progress of an ongoing export operation.

**Response:**

```json
{
  "progress": 75,
  "message": "Compressing files: 150/200 bytes"
}
```

## Usage Examples

### Get all checklists

```bash
curl -H "x-api-key: ck_your_api_key_here" \
     https://your-checklist-app.com/api/checklists
```

### Add item to regular checklist

```bash
curl -X POST \
     -H "x-api-key: ck_your_api_key_here" \
     -H "Content-Type: application/json" \
     -d '{"text": "New task"}' \
     https://your-checklist-app.com/api/checklists/<checklist_id>/items
```

### Add item to task checklist

```bash
curl -X POST \
     -H "x-api-key: ck_your_api_key_here" \
     -H "Content-Type: application/json" \
     -d '{"text": "New task with status", "status": "in_progress", "time": 0}' \
     https://your-checklist-app.com/api/checklists/<task_checklist_id>/items
```

### Check item (mark as completed)

```bash
curl -X PUT \
     -H "x-api-key: ck_your_api_key_here" \
     https://your-checklist-app.com/api/checklists/<checklist_id>/items/<item_index>/check
```

### Uncheck item (mark as incomplete)

```bash
curl -X PUT \
     -H "x-api-key: ck_your_api_key_here" \
     https://your-checklist-app.com/api/checklists/<checklist_id>/items/<item_index>/uncheck
```

### Get all notes

```bash
curl -H "x-api-key: ck_your_api_key_here" \
     https://your-checklist-app.com/api/notes
```

### Get user summary statistics

```bash
# Get summary for current user
curl -H "x-api-key: ck_your_api_key_here" \
     https://your-checklist-app.com/api/summary

# Get summary for specific user (admin only)
curl -H "x-api-key: ck_admin_api_key_here" \
     "https://your-checklist-app.com/api/summary?username=testuser"
```

### Export all checklists and notes

```bash
curl -X POST \
     -H "x-api-key: ck_your_api_key_here" \
     -H "Content-Type: application/json" \
     -d '{"type": "all_checklists_notes"}' \
     https://your-checklist-app.com/api/exports
```

### Export user specific checklists and notes

```bash
curl -X POST \
     -H "x-api-key: ck_your_api_key_here" \
     -H "Content-Type: application/json" \
     -d '{"type": "user_checklists_notes", "username": "testuser"}' \
     https://your-checklist-app.com/api/exports
```

### Get export progress

```bash
curl -H "x-api-key: ck_your_api_key_here" \
     https://your-checklist-app.com/api/exports
```

## Important Notes

- Item indices are 0-based (first item is index 0)
- All timestamps are in ISO 8601 format
- API keys are permanent and do not expire
- Only items owned by the authenticated user are accessible (unless you're an admin)
- All checklists and notes support categorization for better organization
- For task checklists, the `status` and `time` parameters are optional when creating items
- Time tracking data is stored as JSON arrays with `id`, `startTime`, `endTime`, and `duration` fields
- The summary endpoint provides comprehensive statistics including category breakdowns
- Admin users can query summary data for any user using the `username` parameter
- Non-admin users can only query their own summary data
- This is a beta implementation - additional features will be added in future updates
