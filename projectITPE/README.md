# BUENAVISTA COMMUNITY COLLEGE (BCC)
## Guidance Appointment & Counseling Management System

**Institution:** Buenavista Community College, Buenavista, Bohol, Philippines  
**Department:** Center for Student Development & Guidance Services  
**Technology Stack:** HTML5, CSS3, JavaScript (Multi-Page Architecture), Python Flask, Supabase (PostgreSQL) / SQLite  
**Statutory Compliance:** Republic Act 10173 (Data Privacy Act of 2012) & Republic Act 9258 (Guidance and Counseling Act of 2004)

---

## 1. System Overview

The **BCC Guidance Appointment and Counseling Management System** is a full-stack, enterprise-grade web application built to streamline student guidance appointment bookings, counselor caseload management, and administrative oversight for Buenavista Community College.

### Core Roles & Architecture
- **Student Portal (`student/`)**: Appointment booking wizard (5-step), appointment queue tracking, printable encrypted QR Pass Slips, post-counseling feedback (1-5 stars), guidance resources library, and profile contact management.
- **Counselor Portal (`counselor/`)**: Daily schedule, appointment review queue (Approve / Reject / Propose Time), weekly slot availability manager, confidential Clinical SOAP Notes (Subjective, Objective, Assessment, Plan), and follow-up task tracking.
- **Administrator Portal (`admin/`)**: Institutional analytics dashboard, user account management (Student, Counselor, Admin) with academic degree program filters, guidance service catalog management, master appointment oversight with CSV export, audit logs, and system policies.

---

## 2. Project Directory Structure

```
d:/sir robert project/
├── index.html                        # Public Landing Page (Full-Width BCC Hero & Features)
├── login.html                        # Dedicated Sign-In Page (Encrypted Auth & Routing)
├── signup.html                       # Dedicated Student Registration (RA 10173/9258 Consent)
├── account.text                      # Master Demo Accounts and Passwords Reference
├── account.txt                       # Duplicate copy of credentials
├── app.py                            # Python Backend Server Entry Point
├── requirements.txt                  # Python Backend Dependencies
├── pytest.ini                        # Automated Test Configuration
├── .env.example                      # Supabase & Server Environment Template
├── .env                              # Active Environment Configuration
├── backend/                          # PYTHON FLASK BACKEND ENGINE
│   ├── __init__.py                   # Package initialization
│   ├── app.py                        # RESTful API Application (Auth, Appointments, SOAP, Admin)
│   ├── config.py                     # Configuration loader (Supabase, JWT, Ports)
│   ├── auth.py                       # Bcrypt password hashing & JWT role decorators
│   └── database.py                   # Unified Data Access Layer (Supabase + SQLite Fallback)
├── database/
│   └── bcc_guidance.db               # Embedded SQLite Database (Auto-generated & Seeded)
├── supabase/
│   ├── schema.sql                    # Production PostgreSQL / Supabase Database Schema
│   └── seed.sql                      # Production Supabase Seed Script
├── tests/
│   ├── __init__.py                   # Tests package initialization
│   └── test_backend.py               # Comprehensive Pytest Suite (11/11 Tests Passing)
├── css/                              # BCC DESIGN SYSTEM (Theme Green & Wide Layout)
│   ├── variables.css                 # Color tokens, spacing, typography
│   ├── base.css                      # Global resets and modern CSS resets
│   ├── layout.css                    # Responsive wide-screen layout & CSS grid
│   ├── components.css                # Polished textboxes, badges, buttons, modals
│   └── views.css                     # Specialized portal views & table styling
├── js/                               # CLIENT LOGIC & HYBRID REST CLIENT
│   ├── icons.js                      # Scalable SVG Icon repository
│   ├── data.js                       # Client-side seed models & degree programs
│   ├── storage.js                    # LocalStorage persistent state manager
│   ├── api.js                        # REST API Client with automatic offline fallback
│   ├── portal.js                     # Shared session guard, logout controller, role barrier
│   └── components/
│       ├── toast.js                  # Toast notifications
│       ├── modal.js                  # Accessible modals & Printable QR Pass Slip
│       ├── calendar.js               # Interactive calendar widget
│       └── charts.js                 # SVG analytics and caseload charts
├── pictures/                         # INSTITUTIONAL BRAND ASSETS
│   ├── background.jpg                # Campus hero background photography
│   ├── BCC_logo.png                  # Official Buenavista Community College Seal
│   └── BSIT_logo.png                 # BSIT Department Liaison Emblem
├── student/                          # STUDENT MODULE (7 HTML Pages + Controller)
│   ├── dashboard.html                # Metrics, upcoming appointment card, quick actions
│   ├── services.html                 # Guidance services catalog
│   ├── book.html                     # 5-Step interactive appointment booking wizard
│   ├── appointments.html             # Appointment queue, status tabs, QR pass, feedback
│   ├── resources.html                # Guidance resources library (Study skills, Wellness)
│   ├── history.html                  # Past counseling session history
│   ├── profile.html                  # Student academic details & contact updater
│   └── student.js                    # Student event bindings & controller
├── counselor/                        # COUNSELOR MODULE (6 HTML Pages + Controller)
│   ├── dashboard.html                # Daily schedule, session counter, calendar widget
│   ├── appointments.html             # Queue review (Approve / Reject / Pass Slip)
│   ├── schedule.html                 # Weekly calendar & slot availability editor
│   ├── notes.html                    # Clinical SOAP notes (RA 9258 / RA 10173 protected)
│   ├── followups.html                # Student follow-up tasks tracker
│   ├── reports.html                  # Caseload metrics and service utilization
│   └── counselor.js                  # Counselor event bindings & controller
└── admin/                            # ADMINISTRATOR MODULE (8 HTML Pages + Controller)
    ├── dashboard.html                # Campus-wide executive metrics & trends
    ├── users.html                    # User account management (+ Add User dialog)
    ├── services.html                 # Guidance service catalog management
    ├── appointments.html             # Master appointments log with CSV export
    ├── announcements.html            # Campus guidance bulletin manager
    ├── reports.html                  # Institutional analytics and reporting
    ├── settings.html                 # Appointment lead times & system policies
    ├── logs.html                     # Security audit logs (IP, timestamp, action)
    └── admin.js                      # Admin event bindings & controller
```

---

## 3. Quick Start & Execution Instructions

### A. Prerequisites
- Python 3.10+ (tested with Python 3.12.10)
- Modern web browser (Chrome, Edge, Firefox, Safari)

### B. Installing Dependencies
Open PowerShell or your preferred terminal in the project directory:
```powershell
pip install -r requirements.txt
```

### C. Running the Unified Web Server
Start the Python Flask application server:
```powershell
python app.py
```
Output:
```
======================================================================
 BUENAVISTA COMMUNITY COLLEGE — GUIDANCE SYSTEM API SERVER
 REST API:   http://127.0.0.1:5000/api/v1
 Frontend:   http://127.0.0.1:5000/
 Database:   Supabase Remote (or SQLite Fallback)
======================================================================
```

### D. Accessing the Application
Once the server is running, navigate directly to **`http://127.0.0.1:5000`** in any web browser:
- **Public Homepage:** `http://127.0.0.1:5000/` or `http://127.0.0.1:5000/index.html`
- **Sign In Portal:** `http://127.0.0.1:5000/login.html`
- **Student Registration:** `http://127.0.0.1:5000/signup.html`
- **Student Portal:** `http://127.0.0.1:5000/student/dashboard.html`
- **Counselor Portal:** `http://127.0.0.1:5000/counselor/dashboard.html`
- **Admin Portal:** `http://127.0.0.1:5000/admin/dashboard.html`


---

## 4. Supabase Database Configuration

The application is built to connect directly to **Supabase** (Cloud PostgreSQL).

### Setting Up Supabase:
1. Log into your [Supabase Dashboard](https://supabase.com).
2. Create a new project (e.g. `bcc-guidance-db`).
3. In the left navigation, open the **SQL Editor**.
4. Open [`supabase/schema.sql`](supabase/schema.sql) from this project, copy the entire content, paste it into the Supabase SQL Editor, and click **Run**.
   - This creates all tables (`users`, `student_profiles`, `counselor_profiles`, `guidance_services`, `appointments`, `counseling_session_records`, `guidance_resources`, etc.), indexes, unique constraints, and Row Level Security policies.
5. Next, open [`supabase/seed.sql`](supabase/seed.sql), paste it into the SQL Editor, and click **Run**.
   - This seeds all default accounts, services, sample appointments, and guidance resources.
6. Retrieve your API credentials from **Project Settings &rarr; API**:
   - `Project URL` (e.g., `https://xyzproject.supabase.co`)
   - `anon public key` or `service_role secret key`
7. Edit the `.env` file in the project root:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-supabase-service-role-or-anon-key
   ```
8. Restart `python app.py`. The backend will log:
   `[DB] Successfully connected to remote Supabase: https://your-project.supabase.co`

> [!NOTE]
> If `SUPABASE_URL` is empty, the application automatically runs on the integrated, zero-configuration local SQLite database (`database/bcc_guidance.db`) with identical schema and functionality!

---

## 5. Demo Accounts & Credentials

All demo accounts use the standard password: `password123`

### 1. Student Accounts
| Name | Institutional Email | Role | Program & Section |
| :--- | :--- | :--- | :--- |
| **Juan Dela Cruz** (Primary) | `juan.delacruz@buenavista.edu.ph` | Student | BSIT 3A |
| **Angelica Ramos** | `angelica.ramos@buenavista.edu.ph` | Student | BSIT 2B |
| **Mark Anthony Reyes** | `mark.reyes@buenavista.edu.ph` | Student | BSHM 1A |

### 2. Guidance Counselor Accounts
| Name | Institutional Email | Role | Specialization |
| :--- | :--- | :--- | :--- |
| **Dr. Maria Santos, RGC, PhD** | `msantos.guidance@buenavista.edu.ph` | Counselor | Personal & Mental Health |
| **Prof. Robert Rivera, RGC, MAEd** | `rrivera.guidance@buenavista.edu.ph` | Counselor | Academic & Career Guidance |
| **Ms. Elena Castillo, RPm, RGC** | `ecastillo.guidance@buenavista.edu.ph` | Counselor | Psychological Assessment |

### 3. Administrator Account
| Name | Institutional Email | Role | Office |
| :--- | :--- | :--- | :--- |
| **Director Lourdes Mendoza** | `admin.guidance@buenavista.edu.ph` | Administrator | Guidance & Student Services |

---

## 6. Business Workflows Implemented

### Workflow A: Appointment Booking & Concurrency Protection
1. Student signs in and navigates to `student/book.html`.
2. Student selects guidance service, counselor, date, and available time slot.
3. Server validates availability in a transaction. If another student attempts to book the identical counselor slot concurrently, the system rejects it with HTTP `409 Conflict`.
4. Upon successful booking, a unique reference code (`BCC-APT-YYYYMMDD-XXXX`) is issued and stored in the database.
5. In-system notification is immediately generated for the assigned counselor.

### Workflow B: Counselor Review & Decision
1. Counselor logs into `counselor/appointments.html`.
2. Counselor reviews appointment details (student name, urgency, modality, reason).
3. Counselor can:
   - **Approve**: Changes status to `Approved` and triggers student pass slip generation.
   - **Reject**: Prompts for mandatory reason, marks as `Cancelled`, and notifies student.
   - **View Pass Slip**: Displays printable/downloadable appointment pass with QR verification.

### Workflow C: Clinical SOAP Case Notes (RA 9258 / RA 10173 Protected)
1. Counselor conducts session and navigates to `counselor/notes.html`.
2. Counselor clicks "+ New SOAP Note" to document:
   - **S (Subjective)**: Student's expressed feelings and reported circumstances.
   - **O (Objective)**: Clinical behavioral, emotional, and cognitive observations.
   - **A (Assessment)**: Counselor's professional clinical appraisal.
   - **P (Plan)**: Agreed intervention, homework, and follow-up timeline.
3. Records are marked `Strictly Confidential` and stored in isolated tables accessible solely to authorized counselors.

### Workflow D: Completed Session & Student Feedback
1. Counselor marks appointment as `Completed`.
2. In `student/appointments.html`, a **★ Feedback** button becomes available for the student.
3. Student submits 1 to 5 star rating and confidential experience remarks.
4. Duplicate submissions are strictly blocked by unique database constraint.

---

## 7. Automated Testing Results

The automated test suite (`tests/test_backend.py`) verifies all critical security and operational boundaries:

```powershell
pytest tests/test_backend.py -v
```

### Verified Test Cases:
- `test_health_check` — **PASSED** (200 OK, health check response)
- `test_student_login_valid` — **PASSED** (Valid student login, token issued)
- `test_counselor_login_valid` — **PASSED** (Valid counselor login)
- `test_admin_login_valid` — **PASSED** (Valid admin login)
- `test_login_invalid_password` — **PASSED** (401 Unauthorized on bad credentials)
- `test_student_registration` — **PASSED** (201 Created with student profile)
- `test_guidance_services_catalog` — **PASSED** (Catalog retrieves 6 BCC services)
- `test_appointment_booking_and_double_booking_prevention` — **PASSED** (Valid booking succeeds; duplicate concurrent booking returns 409 Conflict; status transitions Approved &rarr; Completed; feedback submission succeeds)
- `test_confidential_clinical_soap_notes` — **PASSED** (Confidential note creation and counselor retrieval)
- `test_guidance_resources_catalog` — **PASSED** (Retrieval of guidance guides)
- `test_admin_users_and_audit_logs` — **PASSED** (User retrieval and audit logging)

**Test Summary:** 11 passed in 6.75s (100% pass rate).
