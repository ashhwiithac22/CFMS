# Complaint Lifecycle Automation and Escalation - Project State

## Tech Stack Summary
- **Frontend**: React (Vite, Tailwind CSS, Lucide icons, Framer Motion)
- **Backend**: Node.js (Express, `mssql` client)
- **Database**: Microsoft SQL Server Express
- **Routing**: React Router DOM (v6)

---

## Database Schema (Current)
Below is the SQL Server schema defining the tables and relations:

### 1. `Warehouses`
- `id` (INT, IDENTITY, PK)
- `name` (VARCHAR(100), UNIQUE, NOT NULL)
- `location` (VARCHAR(255), NOT NULL)
- `created_at` (DATETIME, default: GETDATE())

### 2. `Users`
- `id` (INT, IDENTITY, PK)
- `username` (VARCHAR(100), UNIQUE, NOT NULL)
- `email` (VARCHAR(255), UNIQUE, NOT NULL)
- `password_hash` (VARCHAR(255), NOT NULL)
- `first_name` (VARCHAR(100), NOT NULL)
- `last_name` (VARCHAR(100), NOT NULL)
- `role` (VARCHAR(50), NOT NULL) — Options: `'Sales Executive'`, `'Warehouse Team'`, `'Warehouse Manager'`, `'Administrator'`
- `warehouse_id` (INT, FK to `Warehouses(id)`, NULL)
- `status` (VARCHAR(20), default: `'Active'`)
- `refresh_token` (VARCHAR(500), NULL)
- `reset_token` (VARCHAR(255), NULL)
- `reset_token_expiry` (DATETIME, NULL)
- `created_at` (DATETIME, default: GETDATE())
- `updated_at` (DATETIME, default: GETDATE())

### 3. `ComplaintTypes`
- `id` (INT, IDENTITY, PK)
- `name` (VARCHAR(100), UNIQUE, NOT NULL)
- `description` (VARCHAR(255), NULL)
- `created_at` (DATETIME, default: GETDATE())

### 4. `ComplaintSubtypes`
- `id` (INT, IDENTITY, PK)
- `complaint_type_id` (INT, FK to `ComplaintTypes(id)`, NOT NULL)
- `name` (VARCHAR(100), NOT NULL)
- `created_at` (DATETIME, default: GETDATE())

### 5. `Complaints`
- `id` (INT, IDENTITY, PK)
- `complaint_number` (VARCHAR(50), UNIQUE, NOT NULL)
- `sales_executive_id` (INT, FK to `Users(id)`, NOT NULL)
- `warehouse_id` (INT, FK to `Warehouses(id)`, NOT NULL)
- `customer_code` (VARCHAR(100), NOT NULL)
- `invoice_number` (VARCHAR(100), NOT NULL)
- `complaint_type_id` (INT, FK to `ComplaintTypes(id)`, NOT NULL)
- `complaint_subtype_id` (INT, FK to `ComplaintSubtypes(id)`, NULL)
- `description` (NVARCHAR(MAX), NOT NULL)
- `attachment_url` (VARCHAR(500), NULL)
- `status` (VARCHAR(50), default: `'New'`, NOT NULL) — Options: `'New'`, `'Assigned'`, `'In Progress'`, `'Escalated to Manager'`, `'Escalated to Warehouse Head'`, `'Resolved'`, `'Closed'`
- `assigned_warehouse_team_id` (INT, FK to `Users(id)`, NULL)
- `taken_action_by` (INT, FK to `Users(id)`, NULL) — *Added in Step 3*
- `raised_at` (DATETIME, default: GETDATE())
- `warehouse_team_deadline` (DATETIME, NULL)
- `warehouse_team_responded_at` (DATETIME, NULL)
- `escalated_to_manager_at` (DATETIME, NULL)
- `manager_deadline` (DATETIME, NULL)
- `manager_responded_at` (DATETIME, NULL)
- `escalated_to_warehouse_head_at` (DATETIME, NULL)
- `created_at` (DATETIME, default: GETDATE())
- `updated_at` (DATETIME, default: GETDATE())

### 6. `ComplaintHistory`
- `id` (INT, IDENTITY, PK)
- `complaint_id` (INT, FK to `Complaints(id)`, NOT NULL)
- `action` (VARCHAR(100), NOT NULL)
- `performed_by` (INT, FK to `Users(id)`, NULL)
- `notes` (NVARCHAR(MAX), NULL)
- `timestamp` (DATETIME, default: GETDATE())

### 7. `Messages`
- `id` (INT, IDENTITY, PK)
- `complaint_id` (VARCHAR(50), NOT NULL)
- `sender_id` (INT, NOT NULL)
- `sender_role` (VARCHAR(50), NOT NULL)
- `recipient_id` (INT, NULL)
- `recipient_role` (VARCHAR(50), NULL)
- `message_text` (NVARCHAR(MAX), NULL)
- `attachment_url` (VARCHAR(500), NULL)
- `read_status` (VARCHAR(20), default: `'Unread'`)
- `created_at` (DATETIME, default: GETDATE())

### 8. `AuditLogs`
- `id` (INT, IDENTITY, PK)
- `user_id` (INT, FK to `Users(id)` with ON DELETE SET NULL, NULL)
- `action` (VARCHAR(100), NOT NULL)
- `ip_address` (VARCHAR(45), NOT NULL)
- `user_agent` (VARCHAR(255), NOT NULL)
- `details` (VARCHAR(500), NULL)
- `timestamp` (DATETIME, default: GETDATE())

---

## Role Definitions & Visibilities

### 1. Sales Executive
- **Scope**: Can see only complaints raised by themselves.
- **Actions**: Can raise new complaints and send messages to both Warehouse Team members and the Warehouse Manager at any time.
- **My Complaints Tab**: Removed from sidebar (redundant since Dashboard matches this view).

### 2. Warehouse Team
- **Dashboard**: Shared queue showing all complaints assigned to their specific warehouse (Tirupur, Salem, Erode, Coimbatore, Chennai).
- **My Complaints Tab**: Displays only complaints that they have personally clicked **Take Action** on.
- **Actions**:
  - **Take Action**: Non-exclusive claim button. Updates `taken_action_by` to the claiming user, sets status to `'In Progress'`, and updates history.
  - **Complete**: Sets status to `'Resolved'`. Available on the "My Complaints" tab.
  - **Escalate**: Changes status to `'Escalated to Manager'`.
  - **Message**: Send messages to both the Sales Executive who raised the complaint and the Warehouse Manager (scoped to the recipient).

### 3. Warehouse Manager
- **Scope**:
  - **Dashboard**: Shows active escalated complaints only (status is escalated/in progress and not completed).
  - **Escalated Complaints Tab**: Shows full history of escalated complaints for their warehouse (active and completed/resolved).
- **My Complaints Tab**: Removed from sidebar.
- **Actions**: Exactly THREE actions: **Message** (can message both the Sales Executive and all Warehouse Team members), **Complete** (resolves/completes the complaint), and **Take Action** (available on unclaimed escalated complaints, moves the status to 'In Progress' and claims the complaint).
- **Stat Cards** (scoped to their warehouse only):
  - **Total Logs**: Total count of all complaints ever raised for the manager's warehouse (regardless of status or escalation).
  - **Pending**: Complaints escalated to the manager but not yet claimed by them (status: Escalated, no manager claim).
  - **In Progress**: Complaints escalated to the manager that they have clicked "Take Action" on, but not yet marked Complete.
  - **Escalated**: Total count of complaints ever escalated to this manager (Pending + In Progress + Completed-that-were-escalated).
  - **Completed**: Total count of complaints completed for this warehouse by anyone (Warehouse Team completions + Manager completions).

### 4. Administrator
- **Scope**: Dashboard does not show complaints.
- **My Complaints Tab**: Removed from sidebar.
- **Oversight Message**: A placeholder is displayed: `"Reports and complaint oversight tools coming soon"`.

---

## Key Business & Logic Decisions

### 1. SLA Countdown & Color Thresholds
- **SLA Deadline**: Set automatically to creation date + 24 hours.
- **Thresholds**:
  - `> 12 hours left`: Green
  - `6 to 12 hours left (inclusive)`: Amber
  - `< 6 hours left`: Red
  - `0 hours left (SLA Breached)`: Triggers auto-escalation to the Warehouse Manager.

### 2. Take Action Behavior
- **Warehouse Team**: Exclusive claim button. Once claimed (status becomes `'In Progress'`), the `"Take Action"` button disappears from the Dashboard for all team members. The claiming user becomes the sole owner (`taken_action_by` is set). Sequential reassignment is disabled.
- **Warehouse Manager**: Scoped claim button on escalated complaints. Available on complaints that are escalated but not yet claimed by the manager. Clicking `"Take Action"` updates `taken_action_by` to the Manager's user ID and changes the status to `'In Progress'`, updating the stats from "Pending" to "In Progress" while keeping the complaint active on the Manager's Dashboard.

### 3. Completed Status
- Shared final state ('Resolved'/'Completed'). Visible to all team members in the warehouse, the Sales Executive, and the owner. Row styling is rendered with a distinct premium green background.

### 4. Sort Sequence
- **Default**: Raised Date DESC.
- **Priority Sort**: Escalated → Red (breached/critical SLA) → Amber → Green → Completed.

### 5. Messaging Scoping & Thread Isolation
- Messages are fully isolated and scoped per `(complaint_id + recipient_id)` pair, ensuring privacy and clear lines of communication.

### 5b. Expanded Messaging Matrix
- **Sales Executive**: Can message both Warehouse Team and Warehouse Manager at any time (regardless of complaint escalation status).
- **Warehouse Team**: Can message both Sales Executive and their Warehouse Manager.
- **Warehouse Manager**: Can message both Sales Executive and all Warehouse Team members.

### 5c. Notification System
- **Real-Time Cross-Role Notifications**: When a user sends a message, a notification is created for the recipient.
- **Navbar & Sidebar Badges**: The recipient sees dynamic unread message count badges in the header bell icon and the sidebar menu item.
- **Notifications Page**: Displays a chronological list of recent unread/read messages. Clicking a notification automatically navigates to the thread, opens the Message Panel overlay, selects the correct recipient, and marks all received messages for that complaint as Read.

### 6. Warehouse-to-User Mapping
- Users (except Sales Executives and Admin) are mapped to a specific warehouse via the `warehouse_id` foreign key.

---

## Project Constraints
1. All changes and workspace actions must reside under `d:\VII_Sem_Intern\Complaint_Lifecycle_Automation_and_Escalation` (never use `C:\` files for workspace project code).
2. UI layout must never introduce page-level horizontal scrolling.
3. Playwright tests and subagents must use local Chrome (`channel: 'chrome'`) to avoid azureedge download issues.

---

## Running Changelog
### 2026-08-08
- Added `taken_action_by` column in SQL Server Complaints schema.
- Configured "My Complaints" sidebar item removal rules for Sales Executives, Warehouse Managers, and Administrators.
- Configured Admin Dashboard with placeholder text.
- Filtered Warehouse Team's "My Complaints" tab to only display complaints where `taken_action_by` is equal to the logged-in user's ID.
- Configured Warehouse Team's Action Column to conditionally display buttons:
  - If status is `'In Progress'`: Dashboard shows `"Escalate"`, `"Message"`, and `"Take Action"`.
  - On the "My Complaints" page, the action available is `"Complete"`.
- Enforced shared green row styling for `'Resolved'` / `'Completed'` complaints on Dashboard, My Complaints, and Sales Executive views.

- **2026-08-08 (Enhancements & Bug Fixes)**
  - Simplified and reversed the Take Action behavior to be exclusive: once claimed, the button disappears from the Dashboard for all team members (reassignment disabled).
  - Fixed a database sequence generation bug in `complaint.repository.js` by querying the max sequence number using `ISNUMERIC` to avoid UNIQUE KEY constraint violations.
  - Removed "Take Action" from Warehouse Manager entirely, leaving only "Complete" and "Message".
  - Scoped Warehouse Manager's Dashboard to active escalated complaints and added a new "Escalated Complaints" sidebar history tab showing both active and completed escalated complaints.
  - Fixed status badge text overlap ("Escalated to Manager") by increasing the Status column width to 145px in `ComplaintsTable.jsx`.
  - Re-introduced "Take Action" button specifically for the Warehouse Manager role to claim escalated complaints, updating status to `'In Progress'` and moving them in the stat cards.
  - Fixed Warehouse Manager's stat cards (Total Logs, Pending, In Progress, Escalated, Completed) to correctly pull from the full historical database scope using robust SQL queries.
  - Verified live E2E counts increments/decrements in browser and cross-checked counts with direct SQL queries.

### 2026-08-09
- Implemented real-time cross-role Notification System:
  - Created backend routes and database-backed repository methods for unread message counts, notifications feed, and mark-as-read updates.
  - Added bell count indicator in Navbar header and sidebar notification badge on the React frontend.
  - Built a dedicated Notifications page displaying recent message notifications.
  - Configured notification click handler to automatically retrieve the associated complaint details, launch the messaging panel modal, pre-select the sender, and mark the thread as read.
- Implemented Expanded Messaging Permission Matrix:
  - Removed escalation gating for Sales Executive communication. Sales Executive can now message both Warehouse Team and Warehouse Manager at any time.
  - Warehouse Team members can message both Sales Executive and Warehouse Manager.
  - Warehouse Managers can message both Sales Executive and all Warehouse Team members.
- Configured E2E Playwright test suite verifying the notifications count badges, Notifications page clicking, and thread isolation.
