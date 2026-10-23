-- ================================================================================
-- BUENAVISTA COMMUNITY COLLEGE (BCC), BOHOL
-- Center for Student Development & Guidance Services
-- Database Schema for Supabase (PostgreSQL)
-- ================================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'counselor', 'admin')),
    avatar_initial VARCHAR(10),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. STUDENT PROFILES TABLE
CREATE TABLE IF NOT EXISTS student_profiles (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id_number VARCHAR(50) UNIQUE NOT NULL,
    course VARCHAR(100) NOT NULL CHECK (course IN ('BSIT', 'BSHM', 'BSTM', 'BSCRIM', 'BSED', 'BEED')),
    year_section VARCHAR(50) NOT NULL,
    emergency_contact VARCHAR(255),
    consent_ra10173 BOOLEAN NOT NULL DEFAULT TRUE,
    consent_ra9258 BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. COUNSELOR PROFILES TABLE
CREATE TABLE IF NOT EXISTS counselor_profiles (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    room VARCHAR(100) NOT NULL,
    specialization TEXT NOT NULL,
    max_daily_appointments INT NOT NULL DEFAULT 8,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. GUIDANCE SERVICES TABLE
CREATE TABLE IF NOT EXISTS guidance_services (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 45,
    icon VARCHAR(50) NOT NULL DEFAULT 'book-open',
    confidentiality_level VARCHAR(50) NOT NULL DEFAULT 'Confidential',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. COUNSELOR AVAILABILITY TABLE
CREATE TABLE IF NOT EXISTS counselor_availability (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    counselor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5), -- 1=Monday, 5=Friday
    start_time TIME NOT NULL DEFAULT '08:00:00',
    end_time TIME NOT NULL DEFAULT '17:00:00',
    slot_duration_minutes INT NOT NULL DEFAULT 45,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    reference_code VARCHAR(100) UNIQUE NOT NULL,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    counselor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id TEXT NOT NULL REFERENCES guidance_services(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    modality VARCHAR(50) NOT NULL DEFAULT 'In-Person' CHECK (modality IN ('In-Person', 'Online (Google Meet)', 'Phone Call')),
    urgency VARCHAR(50) NOT NULL DEFAULT 'Routine' CHECK (urgency IN ('Routine', 'Urgent', 'Crisis Intervention')),
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Completed', 'Cancelled', 'Rescheduled')),
    cancellation_reason TEXT,
    location_or_link VARCHAR(255) DEFAULT 'Guidance Rm 204',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index to strictly prevent double-booking for the same counselor at the same date and time slot
CREATE UNIQUE INDEX IF NOT EXISTS idx_prevent_double_booking 
ON appointments(counselor_id, date, time_slot) 
WHERE status IN ('Pending', 'Approved');

-- 7. APPOINTMENT STATUS HISTORY TABLE
CREATE TABLE IF NOT EXISTS appointment_status_history (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by_user_id TEXT NOT NULL REFERENCES users(id),
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CONFIDENTIAL CLINICAL SOAP CASE NOTES (Protected under RA 9258 / RA 10173)
CREATE TABLE IF NOT EXISTS counseling_session_records (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    counselor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    session_duration_minutes INT DEFAULT 45,
    case_category VARCHAR(100) NOT NULL,
    subjective TEXT NOT NULL, -- S: Student's statements and expressed emotions
    objective TEXT NOT NULL,  -- O: Clinical behavioral observations
    assessment TEXT NOT NULL, -- A: Counselor professional assessment
    plan TEXT NOT NULL,       -- P: Agreed action plan and follow-up
    confidentiality_level VARCHAR(50) NOT NULL DEFAULT 'Strictly Confidential',
    status VARCHAR(50) NOT NULL DEFAULT 'Confidential',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. FOLLOW UP TASKS TABLE
CREATE TABLE IF NOT EXISTS follow_up_tasks (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    counselor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    author_id TEXT NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General Notice',
    target_audience VARCHAR(50) NOT NULL DEFAULT 'All' CHECK (target_audience IN ('All', 'Students', 'Counselors')),
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. GUIDANCE RESOURCES TABLE (Section 5.8)
CREATE TABLE IF NOT EXISTS guidance_resources (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    content TEXT,
    file_url VARCHAR(255),
    target_program VARCHAR(50) DEFAULT 'All',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. APPOINTMENT FEEDBACK TABLE (Section 5.9)
CREATE TABLE IF NOT EXISTS appointment_feedback (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    appointment_id TEXT UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. AUDIT LOGS TABLE (Section 7.8)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. SYSTEM SETTINGS TABLE (Section 7.9)
CREATE TABLE IF NOT EXISTS system_settings (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================================
-- ROW LEVEL SECURITY
-- ================================================================================
-- RLS is ON for every table with no public policies. The Flask backend connects with the
-- service-role key (which bypasses RLS); the public anon key gets no access at all.
DO $$
DECLARE
    tbl text;
    pol record;
    tables text[] := ARRAY[
        'users', 'student_profiles', 'counselor_profiles', 'guidance_services', 'counselor_availability',
        'appointments', 'appointment_status_history', 'counseling_session_records', 'follow_up_tasks',
        'notifications', 'announcements', 'guidance_resources', 'appointment_feedback', 'audit_logs', 'system_settings'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF to_regclass('public.' || tbl) IS NULL THEN
            CONTINUE;
        END IF;
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
        -- Remove every existing policy on the table (the old ones all used USING (true))
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', pol.policyname, tbl);
        END LOOP;
        -- Belt and braces: the browser-facing roles get no table privileges at all
        EXECUTE format('REVOKE ALL ON TABLE %I FROM anon, authenticated;', tbl);
    END LOOP;
END $$;
