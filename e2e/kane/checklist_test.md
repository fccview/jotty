---
mode: testing
url: http://localhost:4812/
max_steps: 40
---

# Create a checklist and tick an item

## Create the admin account
On the setup page, type "alexmorgan" in the Username field and "Jotty-Test-2026!" in both the Password and Confirm Password fields, then click "Create Admin Account".
Verify the Checklists page shows "No Checklists yet".

## Create a checklist
Click "New Checklist" at the bottom of the sidebar.
Type "Groceries" in the "Checklist name" field, keep "Simple Checklist" selected, and click "Create Checklist".
Type "Milk" in the "Add new item..." field and click "Add Item".
Type "Eggs" in the "Add new item..." field and click "Add Item".
Verify the checklist shows "Milk" and "Eggs" with progress "0/2".

## Tick an item
Click the checkbox next to "Milk".
Verify the progress shows "1/2" and "50%".
