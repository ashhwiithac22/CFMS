# CFMS — Complaint Lifecycle Automation & Escalation System

**Customer Feedback Management System (CFMS)** is a full-stack, role-based enterprise application built to automate the complete complaint lifecycle — from registration to resolution — for a multi-warehouse logistics and garment distribution operation. It replaces manual, spreadsheet-driven complaint tracking with a real-time, SLA-enforced workflow that automatically routes, escalates, and reports on customer complaints across warehouses.

---

## 🎯 Overview

Sales Executives raise complaints on behalf of customers against a specific warehouse. Each complaint enters a shared queue visible to that warehouse's team, is tracked against a **24-hour SLA countdown**, and automatically escalates through the chain of command if left unresolved — all while keeping every stakeholder informed via in-app notifications and email alerts.

Built as a role-driven system with **four distinct user roles**, each with a tailored dashboard, permission set, and reporting view:

| Role | Responsibility |
|---|---|
| 🧑‍💼 **Sales Executive** | Raises complaints on behalf of customers, tracks their status, and messages warehouse staff |
| 📦 **Warehouse Team** | Claims and resolves complaints assigned to their warehouse |
| 🧑‍✈️ **Warehouse Manager** | Handles escalated complaints and oversees warehouse-level performance |
| 🛡️ **Administrator** | System oversight (reporting and user management) |

---

## ✨ Key Features

### 🔐 Authentication & Security
- JWT-based authentication with access + refresh token rotation
- Bcrypt password hashing
- Role-based access control (RBAC) enforced at both route and query level
- OTP-based "Forgot Password" flow via email (6-digit code, 10-minute expiry, rate-limited resend)
- Enforced password complexity policy (min 8 characters, uppercase, digit, special character)

### 📋 Complaint Lifecycle Management
- Dynamic complaint type & subtype selection (Mismatch, Packaging, Quality Issues, Transport Related, Shortage, Excess, Design Change, Length Issues)
- Photo attachment upload as proof of complaint
- Auto-generated, sequential complaint numbering
- Shared, warehouse-scoped complaint queues for team visibility

### ⏱️ SLA Tracking & Auto-Escalation
- Live 24-hour SLA countdown per complaint
- Color-coded urgency indicators — green (>12h), amber (6–12h), red (<6h)
- Automatic escalation to the Warehouse Manager when the SLA expires
- Manual escalation option for Warehouse Team members
- Full escalation history retained for audit and reporting

### 💬 Messaging & Notifications
- Per-recipient, thread-isolated messaging tied to each complaint
- Expanded messaging matrix — Sales Executives, Warehouse Team, and Warehouse Managers can all message one another
- Image attachments in messages
- Real-time in-app notifications with unread-count badges
- Automated email alerts on escalation (to Warehouse Manager) and resolution (to Sales Executive)

### 📊 Role-Based Reporting
- Dedicated report views for Sales Executive, Warehouse Team, and Warehouse Manager
- Interactive charts (complaint type breakdown, SLA breach trends)
- Custom date-range filtering
- Export to Excel (.xlsx) and PDF

### 🎨 UI/UX
- Fully responsive design — desktop, tablet, and mobile
- Light and dark theme support with persistent user preference
- Smooth animations and micro-interactions (Framer Motion)
- Accessible, enterprise-grade design system

---

## 🛠️ Tech Stack

**Frontend**
- React (Vite)
- React Router DOM
- Context API for state management
- Framer Motion for animations
- Recharts for data visualization
- Custom design system (light/dark theming)

**Backend**
- Node.js with Express.js
- JWT authentication with refresh token rotation
- bcrypt for password hashing
- Nodemailer for transactional email
- Multer for file uploads
- Repository pattern with raw parameterized SQL queries
- Express Validator, Helmet, CORS, Morgan, Express Rate Limit

**Database**
- Microsoft SQL Server Express

**Export**
- SheetJS (xlsx) for Excel export
- jsPDF + html2canvas for PDF export

---

## 🗄️ Database Schema

| Table | Purpose |
|---|---|
| `Users` | All system users, mapped to a warehouse via `warehouse_id` (where applicable) |
| `Warehouses` | Registered warehouse locations |
| `Complaints` | Core complaint records with full SLA and escalation timestamps |
| `ComplaintTypes` / `ComplaintSubtypes` | Configurable complaint categorization |
| `ComplaintHistory` | Full audit trail of every status change |
| `Messages` | Thread-isolated, per-recipient messaging tied to complaints |
| `AuditLogs` | System-wide security and action audit trail |

---

## 📁 Project Structure

```
CFMS/
├── backend/
│   ├── config/           # DB and mailer configuration
│   ├── controllers/      # Request handlers
│   ├── database/         # Schema and seed scripts
│   ├── middlewares/      # Auth, validation, security
│   ├── repositories/     # Data access layer (raw SQL)
│   ├── routes/           # API route definitions
│   ├── services/         # Business logic layer
│   └── utils/            # Shared utilities
├── frontend/
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── context/      # Auth & Theme context providers
│       ├── pages/        # Route-level page components
│       └── services/     # API client layer
└── PROJECT_STATE.md      # Living technical documentation
```

---

## 🔄 Complaint Workflow

```
Sales Executive raises complaint
        │
        ▼
Assigned to Warehouse Team (shared queue) — 24h SLA timer starts
        │
        ├── Resolved within 24h ──► Sales Executive notified
        │
        └── SLA expires / manually escalated
                    │
                    ▼
          Warehouse Manager notified via email
                    │
                    ├── Resolved ──► Sales Executive notified
                    │
                    └── Full history logged for reporting
```

---

## 📄 License

This project was developed as part of an internship program.

---
