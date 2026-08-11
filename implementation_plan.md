# Implementation Plan - Automated Email Notifications on Escalation & Resolution

Implementation plan for sending automated email notifications using the existing Nodemailer setup (`backend/config/mailer.js`) when a complaint is escalated or resolved.

## Current Codebase Analysis & Summary (Step 1 Verification)

### 1. Existing Escalation Logic (`backend/repositories/mssql/complaint.repository.js`)
- **Automatic SLA Escalation**:
  - **Function**: `findAll(userRole, userId, warehouseId, sortBy, history)`
  - **Location**: `lines 87–115`
  - **Logic**: Queries complaints with `status IN ('Assigned', 'New', 'In Progress')` where `GETDATE() > warehouse_team_deadline`. Updates status to `'Escalated to Manager'` and logs action `'Automatic Escalation'` in `ComplaintHistory`.
- **Manual Escalation**:
  - **Function**: `updateStatus(complaintIdOrNumber, targetStatusOrAction, userId, userRole)`
  - **Location**: `lines 224–289`
  - **Logic**: Triggered when a Warehouse Team member selects `'Escalate'` (or equivalent). Updates status to `'Escalated to Manager'` and logs action in `ComplaintHistory`.

### 2. Existing Completion / Resolution Logic (`backend/repositories/mssql/complaint.repository.js`)
- **Function**: `updateStatus(complaintIdOrNumber, targetStatusOrAction, userId, userRole)`
- **Location**: `lines 224–289`
- **Logic**: Triggered when either a Warehouse Team member or Warehouse Manager selects `'Resolved'`, `'Completed'`, or `'Complete'`. Updates status to `'Resolved'` and logs action `'Complete'` in `ComplaintHistory`.

### 3. Existing Email Infrastructure (`backend/config/mailer.js`)
- Reuses central Nodemailer transporter instantiated via `getTransporter()`.
- Utilizes environment variables (`EMAIL_SERVICE`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`) from `backend/.env`.
- Exports functions `verifySmtp`, `sendResetMail`, and `sendOtpMail`.

---

## User Review Required

> [!IMPORTANT]
> **Non-Blocking Fire-and-Forget Pattern**: Email sends will be wrapped in async try/catch wrappers so mail server network delays or transient SMTP errors never block the API database transactions or crash the backend service.

> [!NOTE]
> All file operations, scripts, logs, and artifacts are strictly confined to `D:\VII_Sem_Intern\Complaint_Lifecycle_Automation_and_Escalation` with ZERO operations on the `C:` drive.

---

## Proposed Changes

### Backend Configuration

#### [MODIFY] [mailer.js](file:///d:/VII_Sem_Intern/Complaint_Lifecycle_Automation_and_Escalation/backend/config/mailer.js)
- Implement `sendEscalationEmail(details)`:
  - **Recipient**: Warehouse Manager assigned to the complaint's warehouse (`warehouse_id`).
  - **Subject**: `Complaint Escalated - [complaint_number]`
  - **Body Content**: Sales Executive's name, Customer Code, Invoice Number, Complaint Type (and Subtype if present), and an escalation notice requiring their attention.
  - Matches HTML + plain text template formatting established in `mailer.js`.
- Implement `sendResolutionEmail(details)`:
  - **Recipient**: Sales Executive who originally raised the complaint (`sales_executive_id`).
  - **Subject**: `Your Complaint Has Been Resolved - [complaint_number]`
  - **Body Content**: Customer Code, Invoice Number, Warehouse Name, Complaint Type (and Subtype if present), and resolution notification statement.
  - Matches HTML + plain text template formatting established in `mailer.js`.

---

### Backend Repositories

#### [MODIFY] [complaint.repository.js](file:///d:/VII_Sem_Intern/Complaint_Lifecycle_Automation_and_Escalation/backend/repositories/mssql/complaint.repository.js)
- Add a repository helper `getComplaintNotificationDetails(complaintId)`:
  - Queries `Complaints`, `Users` (Sales Exec and Warehouse Manager), `Warehouses`, `ComplaintTypes`, and `ComplaintSubtypes` to fetch all email template parameters and recipient email addresses.
- Hook into **Automatic SLA Escalation** (`findAll`):
  - Call non-blocking escalation notification when a complaint is auto-escalated.
- Hook into **Manual Escalation** (`updateStatus`):
  - Call non-blocking escalation notification when a user escalates a complaint to `'Escalated to Manager'`.
- Hook into **Resolution / Completion** (`updateStatus`):
  - Call non-blocking resolution notification when a complaint status updates to `'Resolved'`.

---

### Project Documentation

#### [MODIFY] [PROJECT_STATE.md](file:///d:/VII_Sem_Intern/Complaint_Lifecycle_Automation_and_Escalation/PROJECT_STATE.md)
- Update running changelog under date `2026-08-11` documenting the automated email notifications for escalation and resolution.

---

## Verification Plan

### Manual / Static Verification (Without running dev servers)
- Perform full code review of SQL queries, recipient lookup logic, and parameters.
- Verify error handling and try/catch wrapping around email dispatch.
- Confirm zero disk operations were performed on the `C:` drive.
- Confirm no unrequested features or styling changes were introduced.
