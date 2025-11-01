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

## Public Endpoints

These endpoints are publicly accessible and do not require authentication.

### 1. Health Check

**GET** `/api/health`

Returns the application health status and version information. This endpoint is useful for monitoring and load balancers.

**Response:**

```json
{
  "status": "healthy",
  "version": "1.9.3",
  "timestamp": "2025-10-31T21:15:57.009Z"
}
```

**Response Fields:**

- `status`: Either "healthy" or "unhealthy"
- `version`: Application version from package.json (null if unable to read)
- `timestamp`: Current server timestamp in ISO 8601 format
- `error`: Error message (only present when status is "unhealthy")

**Note**: This endpoint does not require authentication and is accessible to anyone.

## Authenticated Endpoints

The following endpoints require authentication via API key.

### 2. Get All Checklists

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

### 3. Create Checklist Item

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

### 4. Check Item

**PUT** `/api/checklists/{listId}/items/{itemIndex}/check`

Marks an item as completed. Use the item index (0-based) from the checklist response.

**Response:**

```json
{
  "success": true
}
```

### 5. Uncheck Item

**PUT** `/api/checklists/{listId}/items/{itemIndex}/uncheck`

Marks an item as incomplete. Use the item index (0-based) from the checklist response.

**Response:**

```json
{
  "success": true
}
```

### 6. Get All Notes

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

### 7. Create Note

**POST** `/api/notes`

Creates a new note for the authenticated user.

**Request Body:**

```json
{
  "title": "My New Note",
  "content": "Note content here...",
  "category": "Personal"
}
```

**Parameters:**

- `title` (required): The title of the note
- `content` (optional): The content of the note in markdown format (defaults to empty string)
- `category` (optional): Category for the note (defaults to "Uncategorized")

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

### 8. Get User Information

**GET** `/api/user/{username}`

Retrieves user information. Returns full user data if authenticated as the user or admin, otherwise returns only public information.

**Response (Own Profile or Admin):**

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

**Note**: Sensitive fields like `passwordHash` and `apiKey` are never returned.

### 9. Get All Categories

**GET** `/api/categories`

Retrieves all categories for notes and checklists for the authenticated user. Archived categories are excluded.

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

**Response Fields:**

- `name`: The category name
- `path`: Full path to the category (includes parent categories)
- `count`: Number of items in this category
- `level`: Nesting level (0 for root categories)

### 10. Rebuild Link Index

**POST** `/api/admin/rebuild-index`

Rebuilds the internal link index for a specific user. This is useful when the link relationships between notes and checklists become inconsistent due to bulk operations, data migrations, or other maintenance tasks.

**Request Body:**

```json
{
  "username": "fccview"
}
```

**Parameters:**

- `username` (required): Username whose link index should be rebuilt

**Response:**

```json
{
  "success": true,
  "message": "Successfully rebuilt link index for fccview"
}
```

**Notes:**

- Only administrators can use this endpoint
- The rebuild process scans all notes and checklists for the specified user and recreates the link relationships
- This operation may take time for users with large amounts of content
- The link index tracks internal references between notes and checklists (e.g., when one note links to another)

### 11. Get User Summary Statistics

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

### Health check (public endpoint)

```bash
curl https://your-checklist-app.com/api/health
```

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

### Create a note

```bash
curl -X POST \
     -H "x-api-key: ck_your_api_key_here" \
     -H "Content-Type: application/json" \
     -d '{"title": "My New Note", "content": "This is the content", "category": "Personal"}' \
     https://your-checklist-app.com/api/notes
```

### Get user information

```bash
# Get your own user info
curl -H "x-api-key: ck_your_api_key_here" \
     https://your-checklist-app.com/api/user/your_username

# Get another user's public info
curl -H "x-api-key: ck_your_api_key_here" \
     https://your-checklist-app.com/api/user/other_username
```

### Get all categories

```bash
curl -H "x-api-key: ck_your_api_key_here" \
     https://your-checklist-app.com/api/categories
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

### Rebuild link index for a user (admin only)

```bash
curl -X POST \
     -H "x-api-key: ck_admin_api_key_here" \
     -H "Content-Type: application/json" \
     -d '{"username": "fccview"}' \
     https://your-checklist-app.com/api/admin/rebuild-index
```

## Cron Job Automation

The link index rebuild API can be automated using cron jobs to ensure link relationships remain consistent over time. This is particularly useful for:

- Regular maintenance of large installations
- Ensuring data integrity after bulk operations
- Preventing link reference issues in production environments

### Example Cron Job Setup

Create a shell script (`rebuild-index.sh`) to rebuild the index for all users:

```bash
#!/bin/bash

# rebuild-index.sh - Rebuild link indexes for specific users
API_KEY="ck_your_admin_api_key_here"
BASE_URL="https://your-checklist-app.com"

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

Make the script executable:

```bash
chmod +x rebuild-index.sh
```

### Cron Job Installation

Add to your crontab to run weekly (every Sunday at 2:00 AM):

```bash
# Edit crontab
crontab -e

# Add this line to run weekly on Sundays at 2:00 AM
0 2 * * 0 /path/to/rebuild-index.sh >> /var/log/checklist-index-rebuild.log 2>&1
```

For daily rebuilds (not recommended for large installations):

```bash
# Daily at 2:00 AM
0 2 * * * /path/to/rebuild-index.sh >> /var/log/checklist-index-rebuild.log 2>&1
```

### Alternative: Single User Cron Job

For rebuilding only your own index (non-admin users can only rebuild their own data):

```bash
#!/bin/bash

# rebuild-my-index.sh - Rebuild link index for current user
API_KEY="ck_your_api_key_here"
USERNAME="your_username"
BASE_URL="https://your-checklist-app.com"

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

### Monitoring and Logging

The scripts above include basic logging. For production environments, consider:

1. **Log Rotation**: Use `logrotate` to manage log files
2. **Monitoring**: Integrate with monitoring systems to alert on failures
3. **Backup**: Run the rebuild after database backups
4. **Performance**: Schedule during low-traffic periods

### Best Practices

- **Test First**: Run the script manually before scheduling
- **Monitor Logs**: Regularly check logs for failures
- **Resource Usage**: Be aware that rebuilds can be resource-intensive for large datasets
- **Frequency**: Weekly is usually sufficient; daily may be overkill
- **Error Handling**: Implement retry logic for transient failures

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
- The user information endpoint returns different data based on authentication context
- Categories endpoint excludes archived categories automatically
- When creating notes, the `content` and `category` fields are optional
- Admin endpoints require administrator privileges and API key authentication
- The link index rebuild endpoint can be automated with cron jobs for regular maintenance
- Link relationships between notes and checklists are maintained automatically, but the rebuild endpoint ensures consistency after bulk operations
- This is a beta implementation - additional features will be added in future updates
