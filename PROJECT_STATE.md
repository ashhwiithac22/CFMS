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
- **Actions**: Can raise new complaints and send messages to Warehouse Team members.
- **My Complaints Tab**: Removed from sidebar (redundant since Dashboard matches this view).

### 2. Warehouse Team
- **Dashboard**: Shared queue showing all complaints assigned to their specific warehouse (Tirupur, Salem, Erode, Coimbatore, Chennai).
- **My Complaints Tab**: Displays only complaints that they have personally clicked **Take Action** on.
- **Actions**:
  - **Take Action**: Non-exclusive claim button. Updates `taken_action_by` to the claiming user, sets status to `'In Progress'`, and updates history.
  - **Complete**: Sets status to `'Resolved'`. Available on the "My Complaints" tab.
  - **Escalate**: Changes status to `'Escalated to Manager'`.
  - **Message**: Send a message to the Sales Executive who raised the complaint (scoped to the recipient).

### 3. Warehouse Manager
- **Scope**: Can see only complaints for their warehouse that are escalated (status containing `'Escalated'` or equal to `'Escalated'`).
- **My Complaints Tab**: Removed from sidebar.
- **Actions**: Escalate to Warehouse Head or respond to messages.

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
- Non-exclusive; multiple team members can sequentially claim a complaint. The latest member who clicks "Take Action" becomes the owner (`taken_action_by` updates, status stays `'In Progress'`).

### 3. Completed Status
- Shared final state ('Resolved'/'Completed'). Visible to all team members in the warehouse, the Sales Executive, and the owner. Row styling is rendered with a distinct premium green background.

### 4. Sort Sequence
- **Default**: Raised Date DESC.
- **Priority Sort**: Escalated → Red (breached/critical SLA) → Amber → Green → Completed.

### 5. Messaging Scoping & Thread Isolation
- Messages are fully isolated and scoped per `(complaint_id + recipient_id)` pair, ensuring privacy and clear lines of communication.

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
