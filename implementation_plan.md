# Implementation Plan — Role-Based Report Generation

Build out the existing "Reports" sidebar page with distinct, role-tailored report content for **Sales Executive**, **Warehouse Team**, and **Warehouse Manager**, including on-screen charts, Excel (.xlsx) download, and PDF download, with strict server-side role scoping and date-range filtering.

---

## Technical Architecture & Design

### 1. Backend Architecture (`/api/reports`)
- **New Files**:
  - `backend/repositories/mssql/report.repository.js`: Encapsulates all role-scoped report SQL queries.
  - `backend/controllers/report.controller.js`: Handles API requests for reports.
  - `backend/routes/report.routes.js`: Exposes `/api/reports` endpoint protected by `authenticateToken`.
  - Registered in `backend/server.js` under `app.use('/api/reports', reportRoutes)`.

- **Role-Based SQL Query Scoping**:
  - **Sales Executive ("My Complaints Report")**:
    - Filter: `c.sales_executive_id = @userId`
    - Date filtering on `c.raised_at` (Today / Week / Month / Custom date range).
    - Returns: Total raised, Resolved count, Escalated count, Currently active count, Type/Subtype breakdown, Avg resolution time (`DATEDIFF(minute, c.raised_at, resolved_time)`), SLA performance (% resolved <= 24h vs. escalated past 24h), Detailed complaint list.
  - **Warehouse Team ("My Performance Report")**:
    - Personal scope: `c.warehouse_id = @warehouseId AND c.taken_action_by = @userId`
    - Returns: Personal claimed count, Personal completed count, Personal avg resolution time, Personal type/subtype breakdown, Personal SLA compliance rate (% resolved within 24h).
    - Secondary Warehouse-wide section (`c.warehouse_id = @warehouseId`): Total warehouse complaints, count resolved directly by team (never escalated) vs. count escalated to manager.
    - Detailed table of user's claimed complaints.
  - **Warehouse Manager ("Warehouse Escalation Report")**:
    - Scope: `c.warehouse_id = @warehouseId`
    - Returns: Total complaints raised for warehouse, Escalation rate (% escalated to manager vs resolved directly), Avg time spent in "Escalated" status before manager resolution, Type/Subtype breakdown, Team member performance comparison table (claimed & completed counts per team member), SLA breach trend per week over range, Detailed table of all warehouse complaints.

- **Strict Server-Side Enforcements**:
  - `userId` and `warehouseId` retrieved directly from verified JWT token (`req.user`).
  - No client-supplied user/warehouse override accepted.

---

### 2. Frontend Architecture & UI (`Reports.jsx`)
- **New Libraries**:
  - `recharts` for theme-aware responsive charts (BarChart for Type/Subtype breakdown; LineChart for SLA Breach Trend).
  - `xlsx` for client-side Excel generation (creates `.xlsx` file with summary statistics and formatted detailed data table).
  - `jspdf` & `html2canvas` for PDF export (captures summary cards, chart visuals, and detailed report table into a clean PDF document).

- **New Page Component**:
  - `frontend/src/pages/Reports.jsx` (rendered in `Dashboard.jsx` when `activeTab === 'Reports'`).
  - Styled with established CSS variables (`var(--bg-primary)`, `var(--card-bg)`, `var(--text-primary)`, `var(--border-color)`, `var(--brand-primary)`).
  - Supports light and dark mode automatically.
  - Controls: Date Range Selector (Today, This Week, This Month, Custom Date Range Picker), Refresh Button, Export Excel Button, Export PDF Button.

---

## Proposed File Changes

### Backend
- `[NEW]` [report.repository.js](file:///d:/VII_Sem_Intern/Complaint_Lifecycle_Automation_and_Escalation/backend/repositories/mssql/report.repository.js)
- `[NEW]` [report.controller.js](file:///d:/VII_Sem_Intern/Complaint_Lifecycle_Automation_and_Escalation/backend/controllers/report.controller.js)
- `[NEW]` [report.routes.js](file:///d:/VII_Sem_Intern/Complaint_Lifecycle_Automation_and_Escalation/backend/routes/report.routes.js)
- `[MODIFY]` [server.js](file:///d:/VII_Sem_Intern/Complaint_Lifecycle_Automation_and_Escalation/backend/server.js) (Register `/api/reports`)

### Frontend
- `[NEW]` [Reports.jsx](file:///d:/VII_Sem_Intern/Complaint_Lifecycle_Automation_and_Escalation/frontend/src/pages/Reports.jsx)
- `[MODIFY]` [Dashboard.jsx](file:///d:/VII_Sem_Intern/Complaint_Lifecycle_Automation_and_Escalation/frontend/src/pages/Dashboard.jsx) (Wire `activeTab === 'Reports'` to render `<Reports />`)
- `[MODIFY]` [package.json](file:///d:/VII_Sem_Intern/Complaint_Lifecycle_Automation_and_Escalation/frontend/package.json) (Add `recharts`, `xlsx`, `jspdf`, `html2canvas`)

---

## Verification Plan

### Automated / Review Checks
- Verify SQL queries in `report.repository.js` strictly enforce `sales_executive_id` for Sales Executives and `warehouse_id` for Warehouse roles.
- Verify date range SQL clauses (`@startDate` and `@endDate`) are injected parameterically.
- Verify zero code touches existing auth, SLA monitor, messaging, or complaint workflow logic.

### Export Verification
- Test Excel export generates a valid `.xlsx` file containing summary cards and table data.
- Test PDF export generates a readable document with summary numbers, chart renders, and tables.
