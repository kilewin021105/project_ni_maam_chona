# BUENAVISTA COMMUNITY COLLEGE (BCC)
## Guidance Appointment & Counseling Management System

**Institution:** Buenavista Community College, Buenavista, Bohol, Philippines
**Department:** Center for Student Development & Guidance Services
**Technology Stack:** HTML5, CSS3, JavaScript (multi-page), Python Flask, SQLite (default) or Supabase (PostgreSQL)
**Statutory Compliance:** Republic Act 10173 (Data Privacy Act of 2012) & Republic Act 9258 (Guidance and Counseling Act of 2004)

---

## 1. System Overview

A web application for booking guidance appointments, managing counselor caseloads, and overseeing the Guidance Office.

- **Student portal (`student/`)**: 5-step booking wizard with live time slots, appointment list with cancel and pass slip (scannable QR code), session rating after completed sessions, counseling history, guidance resource library with search, and contact details / password management.
- **Counselor portal (`counselor/`)**: dashboard for today, own appointment queue (approve, reject with reason, reschedule, mark completed, cancel), monthly calendar with an availability editor (weekdays and daily limit), confidential SOAP notes for own students, follow-up tasks with in-app reminders to students, and a caseload report.
- **Administrator portal (`admin/`)**: campus dashboard with a monthly chart, user accounts (create, edit, reset password, activate/deactivate, delete unused), guidance services (create, edit, set inactive, delete unused), all appointments with filters, cancel and CSV export, announcements with audience (everyone / students / counselors) and pinning, booking policy settings, campus report, and a searchable audit log.

Every page gets its data from the Flask API. There is no offline or demo mode: if the server rejects an action, the page shows the server's error.

---

## 2. Project Structure

```
projectITPE/
├── index.html, login.html, signup.html   Public pages
├── app.py                                Start the server: python app.py
├── requirements.txt, pytest.ini
├── .env.example                          Settings template (copy to .env)
├── backend/
│   ├── app.py          REST API: every route checks login and role
│   ├── auth.py         bcrypt passwords, JWT sessions, sign-in lockout
│   ├── config.py       Settings from .env
│   └── database.py     Data layer (SQLite or Supabase), safe transactions
├── database/bcc_guidance.db              SQLite database (created and seeded on first run)
├── supabase/
│   ├── schema.sql, seed.sql              New Supabase project
│   ├── update_patch.sql                  Re-create tables/seed on an existing project
│   └── security_patch.sql                Run once if you used an older version (see §4)
├── tests/test_backend.py                 54 automated API tests
├── css/                                  Design system (variables, base, layout, components, views)
├── js/
│   ├── utils.js        HTML escaping, dates, report helpers
│   ├── storage.js      Session (token + profile only)
│   ├── api.js          API client
│   ├── portal.js       Session check, role guard, notifications, change password
│   ├── icons.js
│   ├── components/     modal.js (dialogs, pass slip), toast.js, calendar.js
│   └── vendor/qrcode.min.js              QR code generator (qrcode-generator 1.4.4, MIT)
├── student/   dashboard, services, book, appointments, resources, history, profile + student.js
├── counselor/ dashboard, appointments, schedule, notes, followups, reports + counselor.js
└── admin/     dashboard, users, services, appointments, announcements, reports, settings, logs + admin.js
```

Only `index.html`, `login.html`, `signup.html` and the `css/`, `js/`, `pictures/`, `student/`, `counselor/` and `admin/` folders are served to browsers. The database, backend code, Supabase scripts, tests and `.env` can't be downloaded.

---

## 3. Running the System

**Requirements:** Python 3.10+ and a modern browser.

```powershell
pip install -r requirements.txt
python app.py
```

Then open **http://127.0.0.1:5000** in your browser.

- Always open the site through the server address. Double-clicking an HTML file will not work.
- **On a phone:** connect the phone to the same Wi-Fi, find this computer's IP address (`ipconfig` → IPv4 Address), and open `http://<that-IP>:5000`. If it doesn't load, allow Python through Windows Firewall.
- Settings are optional. Copy `.env.example` to `.env` to change them (port, allowed email domain, sign-in lockout, Supabase).

### Running the tests

```powershell
python -m pytest tests -q
```

Each test uses its own temporary database, so running the tests never changes `database/bcc_guidance.db`.

---

## 4. Supabase (optional)

With no Supabase settings the app uses the local SQLite file. To use Supabase:

1. Create a project, open the **SQL Editor**, run `supabase/schema.sql`, then `supabase/seed.sql`.
2. In **Project Settings → API**, copy the Project URL and the **service_role** secret key.
3. Put them in `.env`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-service-role-secret-key
   ```
4. Restart `python app.py`. It prints `[DB] Successfully connected to remote Supabase`.

> **Important:** Row Level Security is on for every table with no public policies, so only the backend (using the service-role key) can read or write data. Keep the service-role key in `.env` only. Never put it in JavaScript.
>
> **If you set up Supabase with an older version** of this project, run `supabase/security_patch.sql` once. The old scripts created "Public Full Access" policies that let anyone with the public anon key read and change every table, including password hashes and SOAP notes.

---

## 5. Demo Accounts

All seeded accounts use the password `password123`. Change these passwords (or remove the accounts) before real use.

| Role | Email |
| :--- | :--- |
| Student | `juan.delacruz@buenavista.edu.ph`, `angelica.ramos@buenavista.edu.ph`, `mark.reyes@buenavista.edu.ph` |
| Counselor | `msantos.guidance@buenavista.edu.ph`, `rrivera.guidance@buenavista.edu.ph`, `ecastillo.guidance@buenavista.edu.ph` |
| Administrator | `admin.guidance@buenavista.edu.ph` |

Students can register themselves with a `@buenavista.edu.ph` email (configurable with `ALLOWED_EMAIL_DOMAIN`). Counselor and admin accounts are created by an administrator.

**Forgotten passwords:** for privacy, resets happen in person. An administrator opens **Users → Reset password**, gives the person a temporary password, and they change it from their account menu (**Change password**).

---

## 6. Rules the System Enforces

**Security**
- Every API route checks the session and role. Students only see their own data, counselors only their own appointments, notes and follow-ups, and admin routes require the admin role.
- Sessions expire after 12 hours. Deactivated accounts are signed out on their next request.
- After 5 wrong passwords for the same email, sign-in is blocked for 15 minutes. Error messages don't reveal whether an email is registered.
- Passwords need at least 8 characters and are stored as bcrypt hashes. Password hashes are never sent to the browser.
- All user-entered text is escaped before it is shown, so typed HTML can't run as code.

**Booking** (limits are set in **Admin → Settings**)
- Monday to Friday only, from the fixed list of 9 daily time slots.
- At least *lead time* hours ahead (default 12) and at most *N* days ahead (default 14).
- At most *N* upcoming appointments per student (default 2).
- Respects each counselor's available weekdays and daily limit, and never double-books a slot (also enforced by a database index).

**Appointment status**
- Pending → Approved or Cancelled. Approved → Completed or Cancelled.
- Students can cancel their own appointments up to the cancellation cut-off (default 4 hours before).
- Counselors approve, reschedule, complete (on or after the appointment date) and cancel; a reason is required to reject or cancel.
- Administrators can cancel any appointment with a reason.
- Students can rate a session once, only after it is completed.
- Every change is recorded in the status history and audit log, and the student or counselor is notified in the app.
