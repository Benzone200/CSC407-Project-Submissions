# CivicLedger — Municipal Complaint Management System

**Louis Municipal Complaint App | CSC 407 Project Submission**

## Student Information

| Field | Details |
|---|---|
| Full Name | Edache Louis Enenche |
| Matriculation Number | 23/sci01/061 |
| Course Code | CSC 407 |
| Project Title | Louis Municipal Complaint App (CivicLedger) |
| Topic Focus | Building Web Applications: Web Application Security, Testing, Deployment, and Review |

---

## 1. Project Overview

CivicLedger is a full-stack web application designed to modernize municipal service delivery through digital citizen complaint reporting and administrative management.

The application demonstrates the complete software engineering lifecycle, including UI/UX design, web application security hardening, automated testing, production deployment readiness, and post-build evaluation.

Residents can register, authenticate, manage their profiles, submit categorized municipal complaints across six municipal wards, and search or filter complaint records.

Municipal administrators have elevated Role-Based Access Control (RBAC) privileges that allow them to triage complaints, assign responsible departments, record resolution notes, delete invalid records, inspect audit logs, and export database backups.

### Complaint Categories

- Roads & Potholes
- Street Lighting
- Water & Drainage
- Waste & Sanitation
- Public Safety
- Parks & Trees

---

## 2. Project Repository

**Original GitHub Repository:**

https://github.com/allowancemobileapp/LOUIS_MUNICIPAL_COMPLAINT_APP

---

## 3. Technologies Used

### Frontend

| Technology | Purpose |
|---|---|
| React 19 | Component-based single-page application |
| React DOM 19 | React rendering |
| TypeScript | Static typing across the application |
| Tailwind CSS 4 | Responsive utility-based styling |
| Lucide React | User interface icons |
| Motion | Interface animations |
| Vite 8 | Development server and production bundler |

### Backend and Database

| Technology | Purpose |
|---|---|
| Node.js 22 | Server runtime |
| Express 4 | REST API and middleware |
| SQLite | Embedded relational database |
| node:sqlite | Native SQLite database interface |
| dotenv | Environment variable management |
| tsx | TypeScript execution during development and testing |
| node:crypto | Password hashing, token digests and cookie signing |
| node:test | Automated unit testing |

### Development and Build Tools

- Vite
- TypeScript
- npm / Bun
- Tailwind CSS
- Native Node.js testing utilities

---

## 4. System Architecture and Project Structure

The application uses a full-stack architecture consisting of a React frontend, an Express backend, shared TypeScript validation modules, and an SQLite database.

```text
.
├── .env.example
├── .gitignore
├── index.html
├── metadata.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── server.ts
├── public/
│   └── favicon.ico
├── data/
│   └── civicledger.db
└── src/
    ├── main.tsx
    ├── index.css
    ├── App.tsx
    ├── assets/
    │   └── images/
    ├── services/
    │   └── api.ts
    ├── shared/
    │   ├── types.ts
    │   ├── validation.ts
    │   └── validation.test.ts
    ├── server/
    │   ├── db.ts
    │   └── security.ts
    └── components/
        ├── Layout.tsx
        ├── DashboardView.tsx
        ├── SubmitComplaintView.tsx
        ├── AuthView.tsx
        ├── ProfileView.tsx
        ├── SecurityView.tsx
        ├── TestingView.tsx
        ├── DeploymentView.tsx
        └── ReviewView.tsx
```

### Important Components

| Component | Responsibility |
|---|---|
| App.tsx | Application state, routing and authentication hydration |
| Layout.tsx | Responsive navigation and theme management |
| DashboardView.tsx | Complaint dashboard, statistics and filtering |
| SubmitComplaintView.tsx | Complaint submission and validation |
| AuthView.tsx | Registration and authentication |
| ProfileView.tsx | Account management and password updates |
| SecurityView.tsx | Security documentation and live security probes |
| TestingView.tsx | Automated verification interface |
| DeploymentView.tsx | Server diagnostics, audit logs and database backups |
| ReviewView.tsx | Project evaluation and system review |

---

## 5. Implemented Features

### 5.1 User Interface and Frontend

**Dashboard and Complaint Registry**

- Live complaint statistics and KPI cards.
- Search complaints using keywords.
- Filter by category, priority and status.
- View all reports or personal reports.
- Inspect individual complaint records.
- Administrative complaint triage interface.

**Authentication and User Profiles**

- Citizen registration and sign-in.
- Password visibility toggle.
- Real-time password strength indicator.
- Profile information updates.
- Password rotation.
- Active server session inspection.

**Complaint Management**

- Authenticated complaint submission.
- Field-level input validation.
- Automatic department routing.
- Complaint reference generation.
- Complaint status tracking.

**Responsive Design**

- Desktop sidebar navigation.
- Tablet and desktop top navigation.
- Mobile slide-out navigation drawer.
- Mobile-friendly complaint cards.
- Persistent light and dark themes.

### 5.2 Web Application Security

Security is implemented across authentication, authorization, database operations, session management and HTTP responses.

**Password Security**

- Password hashing using Node.js scrypt.
- Random 16-byte salts.
- 64-byte derived password hashes.
- timingSafeEqual password verification.

**Session Management**

- Cryptographically generated random session tokens.
- SHA-256 token digests stored in SQLite.
- HMAC-SHA256 signed cookies.
- HttpOnly cookie protection.
- Secure cookie configuration over HTTPS.
- Seven-day session expiration.

**Role-Based Access Control (RBAC)**

Two user roles are implemented:

- Resident: Access to citizen functionality and personal complaint management.
- Administrator: Elevated privileges for complaint triage, administrative records, audit logs and database backups.

Authentication and authorization middleware enforce access boundaries.

**SQL Injection Protection**

- Parameterized prepared SQL statements.
- Input validation.
- Live SQL injection security probe.

**Cross-Site Scripting (XSS) Protection**

- React JSX automatic escaping.
- HTML entity encoding.
- Content Security Policy.
- No use of dangerouslySetInnerHTML.
- Live XSS neutralization probe.

**HTTP Security Hardening**

Implemented security headers include:

- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- Strict-Transport-Security
- Content-Security-Policy

Sensitive password hashes are excluded from user-facing data projections.

### 5.3 Automated Testing

The project incorporates automated testing using Node.js native testing utilities.

**Unit Testing**

Ten automated assertions cover:

- Registration validation.
- Login validation.
- Complaint validation.
- Profile validation.
- Complaint triage validation.
- XSS neutralization.
- SQL injection detection.
- RBAC helpers.
- Password strength validation.

**Live Verification Suite**

The application includes 14 live-executed verification checks across eight QA disciplines:

1. Functional testing.
2. Login and registration testing.
3. Form validation.
4. Security testing.
5. Usability testing.
6. Responsive and mobile testing.
7. Error handling.
8. Database testing.

Testing uses rolled-back SQLite SAVEPOINT transactions and live HTTP probes to prevent test records from remaining in the database.

### 5.4 Deployment and Operations

The deployment interface provides:

- Live Node.js runtime information.
- Server uptime monitoring.
- SQLite database diagnostics.
- Database size monitoring.
- Database table record counts.
- SQLite WAL and foreign-key status.
- Operational audit logs.
- JSON database backup export.

The administrative backup endpoint performs a SQLite WAL checkpoint and exports a sanitized JSON snapshot.

### 5.5 Project Review and Evaluation

The Review module evaluates:

- System objectives and functionality.
- Implemented security controls.
- Live database metrics.
- Performance observations.
- SQLite WAL operation.
- Session and cookie configuration challenges.
- Current system limitations.
- Future development opportunities.

**Known Limitations**

- Single-node SQLite database architecture.
- Text-only complaint reporting.
- No distributed rate limiting.

**Future Development Roadmap**

- PostgreSQL or Cloud SQL migration.
- GPS-based complaint mapping.
- Image and photo uploads.
- SMS and email notifications.
- TOTP multi-factor authentication.

---

## 6. Database Design

CivicLedger uses SQLite in Write-Ahead Logging (WAL) mode with foreign-key enforcement.

### Database Tables

**users**

Stores citizen and administrator account information.

Important fields:
- id
- full_name
- email
- password_hash
- role
- ward
- phone
- avatar_url
- created_at

**sessions**

Stores authenticated session records.

Important fields:
- token_hash
- user_id
- user_agent
- created_at
- expires_at

**complaints**

Stores municipal complaint records.

Important fields:
- id
- reference_code
- title
- category
- priority
- status
- ward
- address
- description
- reporter_id
- assigned_department
- resolution_notes
- created_at
- updated_at

**audit_logs**

Stores security and administrative activity.

Important fields:
- id
- event_type
- actor_email
- actor_role
- target_resource
- outcome
- detail
- created_at

---

## 7. API Endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | /api/health | Public | Runtime and database health |
| POST | /api/auth/register | Public | Register a resident |
| POST | /api/auth/login | Public | Authenticate a user |
| POST | /api/auth/logout | Public | Revoke a session |
| GET | /api/auth/me | Public | Retrieve authenticated user information |
| PATCH | /api/profile | Authenticated | Update profile |
| POST | /api/profile/password | Authenticated | Change password |
| GET | /api/complaints | Public / Auth | Search and filter complaints |
| POST | /api/complaints | Authenticated | Create complaint |
| PATCH | /api/complaints/:id | Admin only | Update complaint |
| DELETE | /api/complaints/:id | Admin only | Delete complaint |
| GET | /api/admin/audit | Admin only | Retrieve audit records |
| GET | /api/admin/backup | Admin only | Export database backup |
| GET | /api/operations/logs | Public | View masked operational logs |
| POST | /api/security/test-sqli | Public | Test SQL injection protection |
| POST | /api/security/test-xss | Public | Test XSS protection |
| GET | /api/security/headers | Public | Inspect security headers |
| POST | /api/testing/run-live | Public | Run live verification tests |

---

## 8. Installation and Usage

### Prerequisites

- Node.js v22 or later.
- npm or Bun.
- A compatible operating system.

### Step 1: Clone the Repository

```bash
git clone https://github.com/allowancemobileapp/LOUIS_MUNICIPAL_COMPLAINT_APP.git
```

### Step 2: Enter the Project Directory

```bash
cd LOUIS_MUNICIPAL_COMPLAINT_APP
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Configure Environment Variables

Copy `.env.example` to `.env` and configure the required values.

Supported variables:

```env
PORT=3000
NODE_ENV=development
SESSION_SECRET=your-strong-secret
DATABASE_PATH=./data/civicledger.db
```

Use a strong, randomly generated session secret for production deployments. Never commit actual environment secrets to GitHub.

### Step 5: Start Development Server

```bash
npm run dev
```

The application runs on port 3000 by default.

### Step 6: Run Tests

TypeScript checks:

```bash
npm run lint
```

Unit tests:

```bash
npx tsx --test src/shared/validation.test.ts
```

### Step 7: Build for Production

```bash
npm run build
```

### Step 8: Start Production Server

```bash
NODE_ENV=production npm start
```

---

## 9. Evaluation and Quality Assurance

The project provides dedicated interfaces for security inspection, automated testing, deployment diagnostics and system evaluation.

These modules demonstrate practical application of the software engineering concepts covered by the CSC 407 topic.

The system combines functional requirements with security and operational considerations to provide a structured municipal complaint management solution.

---

## 10. Conclusion

CivicLedger demonstrates how modern web technologies can be applied to improve municipal complaint management and citizen participation.

The project integrates a responsive frontend, authenticated REST API, relational database, security controls, automated testing, deployment diagnostics and project evaluation.

It demonstrates the practical application of web application development, web application security, testing, deployment and review.

---

## Author

**Edache Louis Enenche**

Matriculation Number: 23/sci01/061

Course: CSC 407

Project: Louis Municipal Complaint App (CivicLedger)

**CSC 407 Project Submission**