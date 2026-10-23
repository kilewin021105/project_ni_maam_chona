-- ================================================================================
-- BUENAVISTA COMMUNITY COLLEGE (BCC) GUIDANCE & COUNSELING SYSTEM
-- INCREMENTAL UPDATE PATCH FOR SUPABASE (POSTGRESQL)
-- ================================================================================
-- This script contains ONLY new incremental updates, table additions, policies,
-- and updated seed records. It does NOT drop existing tables or overwrite active users.
-- Safe to execute directly in the Supabase SQL Editor.
-- ================================================================================

-- 1. ENSURE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. UPDATE DEGREE PROGRAMS CONSTRAINT ON STUDENT PROFILES
-- Allows BSIT, BSHM, BSTM, BSCRIM, BSED, and BEED
DO $$
BEGIN
    ALTER TABLE student_profiles DROP CONSTRAINT IF EXISTS student_profiles_course_check;
    ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_course_check
        CHECK (course IN ('BSIT', 'BSHM', 'BSTM', 'BSCRIM', 'BSED', 'BEED'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Constraint update handled or table pending: %', SQLERRM;
END $$;

-- 3. ENSURE ALL TABLES EXIST (In case any were missed in older versions)

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

CREATE TABLE IF NOT EXISTS counselor_availability (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    counselor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
    start_time TIME NOT NULL DEFAULT '08:00:00',
    end_time TIME NOT NULL DEFAULT '17:00:00',
    slot_duration_minutes INT NOT NULL DEFAULT 45,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS appointment_status_history (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by_user_id TEXT NOT NULL REFERENCES users(id),
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS counseling_session_records (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    counselor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    session_duration_minutes INT DEFAULT 45,
    case_category VARCHAR(100) NOT NULL,
    subjective TEXT NOT NULL,
    objective TEXT NOT NULL,
    assessment TEXT NOT NULL,
    plan TEXT NOT NULL,
    confidentiality_level VARCHAR(50) NOT NULL DEFAULT 'Strictly Confidential',
    status VARCHAR(50) NOT NULL DEFAULT 'Confidential',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS appointment_feedback (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    appointment_id TEXT UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PREVENT DOUBLE-BOOKING UNIQUE INDEX
CREATE UNIQUE INDEX IF NOT EXISTS idx_prevent_double_booking 
ON appointments(counselor_id, date, time_slot) 
WHERE status IN ('Pending', 'Approved');

-- 5. POPULATE / REFRESH ALL 12 GUIDANCE RESOURCES
INSERT INTO guidance_resources (id, title, category, description, content, target_program) VALUES
('res-1', 'Time Management & Academic Success Guide', 'Study Skills',
 'Master course workloads, prioritize assignments using the Eisenhower Matrix, and eliminate procrastination.',
 'Time management is essential for collegiate success at Buenavista Community College. 1. Use the Eisenhower Matrix: categorize tasks by urgency and importance. 2. Adopt the Pomodoro Technique: study in 25-minute focused blocks followed by 5-minute rests. 3. Audit your weekly hours: balance lecture, lab work, study time, and rest. 4. Visit BCC Guidance Office (Room 204) for individual academic habit planning.',
 'All'),

('res-2', 'Managing College Stress & Exam Anxiety', 'Mental Wellness',
 'Practical coping strategies, grounding techniques, and 4-7-8 breathing exercises to conquer academic pressure.',
 'College life brings new challenges that can trigger acute stress. 1. Recognize somatic symptoms: elevated heart rate, muscle tension, and insomnia. 2. Practice 4-7-8 diaphragmatic breathing: inhale for 4 seconds, hold for 7, exhale slowly for 8. 3. Avoid excessive caffeine right before examinations. 4. If feelings of overwhelm persist, schedule a confidential counseling appointment at the Guidance Office.',
 'All'),

('res-3', 'Career Pathway & Internship (OJT) Readiness Checklist', 'Career Guidance',
 'Essential preparation checklist for students preparing for on-the-job training (OJT) and industry practicum.',
 'Preparing for industry placement requires proactive groundwork: 1. Ensure all prerequisite academic clearances and MOAs are completed. 2. Draft an industry-standard resume highlighting coursework projects and technical competencies. 3. Obtain necessary medical certificates and insurance requirements. 4. Consult your assigned counselor for mock behavioral interviews and workplace ethics orientation.',
 'All'),

('res-4', 'Hospitality & Tourism Professional Etiquette Handbook', 'Career Guidance',
 'Standard operating guidelines on guest interaction, customer delight, intercultural sensitivity, and grooming.',
 'For BSHM and BSTM majors, hospitality excellence begins with daily discipline: 1. Maintain immaculate personal grooming and uniform standards. 2. Master active listening and empathetic dialogue during guest inquiries. 3. Apply the HEAT model (Hear, Empathize, Apologize, Take Action) for conflict resolution. 4. Respect cultural nuances when serving international and domestic guests.',
 'BSHM & BSTM'),

('res-5', 'Effective Study Habits & Active Recall Strategies', 'Study Skills',
 'Replace passive re-reading with active recall, spaced repetition, and the Feynman technique to boost retention.',
 'Passive reading creates an illusion of competence. 1. Active Recall: test yourself after every chapter by closing the book and writing down core concepts. 2. Spaced Repetition: review material on day 1, day 3, day 7, and day 21 before exams. 3. Feynman Technique: explain complex programming algorithms, accounting equations, or criminology procedures in simple terms as if teaching a beginner.',
 'All'),

('res-6', 'College Adjustment & Freshmen Transition Toolkit', 'Study Skills',
 'Navigating independence, college social circles, campus resources, and overcoming freshmen imposter syndrome.',
 'Transitioning from senior high school to BCC college life is a major life milestone. 1. Familiarize yourself with BCC campus offices: Registrar, Guidance, Library, Dean''s Office, and Clinic. 2. Establish a healthy social circle through student clubs and academic study groups. 3. Recognize that feeling overwhelmed early on is normal—reach out to peer facilitators and guidance staff whenever you need guidance.',
 '1st Year Students'),

('res-7', 'Resume Writing & Professional Portfolio Mastery', 'Career Guidance',
 'Step-by-step guide to crafting an impactful 1-page modern resume, LinkedIn profile, and digital portfolio.',
 'Your resume is your personal marketing document: 1. Stick to a clean, reverse-chronological single-page format. 2. Use action verbs and metric-driven accomplishments. 3. Tailor keywords to the specific job description. 4. Have your resume reviewed at the BCC Guidance Center before submitting to internship partners.',
 '3rd & 4th Year Students'),

('res-8', 'Acing Job & Internship Behavioral Interviews', 'Career Guidance',
 'Master the STAR method (Situation, Task, Action, Result) to confidently answer challenging interview questions.',
 'Employers evaluate not just technical skills, but soft skills and emotional resilience: 1. Structure your answers using STAR (Situation, Task, Action, Result). 2. Prepare 3 core stories showcasing teamwork, leadership, and conflict resolution. 3. Research the company or agency thoroughly beforehand. 4. Prepare insightful questions to ask the interviewer at the end of the conversation.',
 'Graduating Students'),

('res-9', 'Emotional Resilience & Mindfulness for College Students', 'Mental Wellness',
 'Cultivating psychological strength, cognitive reframing, and daily mindfulness practices for academic challenges.',
 'Resilience is the ability to bounce back from academic setbacks, failed quizzes, and interpersonal disappointments: 1. Practice cognitive reframing: view failures as data for improvement rather than personal flaws. 2. Grounding Exercise (5-4-3-2-1): Notice 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. 3. Maintain gratitude journaling and positive self-talk.',
 'All'),

('res-10', 'Personal Development, Goal Setting & Self-Leadership', 'Mental Wellness',
 'Establishing SMART goals, building personal integrity, and cultivating healthy self-discipline in college.',
 'Becoming a successful professional requires conscious personal development: 1. Formulate SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound). 2. Align your daily habits with your long-term life vision. 3. Practice digital detox during exam periods. 4. Treat yourself and your peers with mutual respect, empathy, and constructive communication.',
 'All'),

('res-11', 'BCC Guidance & Counseling Support Directory & Rights', 'Mental Wellness',
 'Your guide to counseling rights, confidentiality protections under RA 9258, and guidance office services.',
 'The Center for Student Development & Guidance Services is committed to safeguarding student welfare: 1. Confidentiality Pledge: Sessions are protected by RA 9258 (Guidance and Counseling Act of 2004) and RA 10173 (Data Privacy Act of 2012). 2. How to book: Use the BCC online booking portal or visit Room 204. 3. Emergency walk-ins are accommodated for urgent mental health distress. You are never alone.',
 'All Students'),

('res-12', 'Digital Wellness & Healthy Screen-Time Boundaries', 'Study Skills',
 'Combatting digital fatigue, late-night screen addiction, and maintaining eye health during heavy computer coursework.',
 'With extensive screen time required for programming, research, and online study, digital wellness is critical: 1. Apply the 20-20-20 rule: Every 20 minutes, look at an object 20 feet away for at least 20 seconds. 2. Turn off non-essential notifications during study blocks. 3. Establish a blue-light curfew at least 45 minutes before sleep. 4. Incorporate daily physical stretching and outdoor breaks.',
 'BSIT & All Programs')
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    content = EXCLUDED.content,
    target_program = EXCLUDED.target_program;

-- 6. SYSTEM SETTINGS
INSERT INTO system_settings (id, setting_key, setting_value, description) VALUES
('set-1', 'MIN_BOOKING_LEAD_HOURS', '24', 'Minimum advance notice required in hours before booking an appointment.'),
('set-2', 'MAX_ADVANCE_BOOKING_DAYS', '14', 'Maximum days in advance a student can book an appointment.'),
('set-3', 'CANCELLATION_CUTOFF_HOURS', '4', 'Hours before the appointment after which student self-cancellation is restricted.'),
('set-4', 'MAX_ACTIVE_APPOINTMENTS_PER_STUDENT', '2', 'Maximum concurrent active appointments allowed per student account.')
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description;

-- 7. ROW LEVEL SECURITY
-- RLS is enabled with NO public policies: only the backend (service-role key) can read or write.
-- The previous version created "Public Full Access" policies here, which exposed every table to
-- anyone with the anon key. If you ran that version, also run security_patch.sql.
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
