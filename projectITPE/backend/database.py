import sqlite3
import json
import uuid
import datetime
from pathlib import Path
from .config import Config

class DBService:
    _supabase_client = None
    _use_supabase = False

    @classmethod
    def init(cls):
        """Initializes database connection to Supabase or fallback local SQLite."""
        if Config.SUPABASE_URL and Config.SUPABASE_KEY and not Config.SUPABASE_URL.startswith('your_'):
            try:
                from supabase import create_client
                client = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)
                # Verify that connection works and users table is accessible
                probe = client.table('users').select('id').limit(1).execute()
                cls._supabase_client = client
                cls._use_supabase = True
                print(f"[DB] Successfully connected to remote Supabase: {Config.SUPABASE_URL}")
                return
            except Exception as e:
                print(f"[DB Notice] Supabase connection failed: {e}")
                print(f"[DB Notice] Automatically operating on embedded SQLite database with full accounts and demo data.\n")
        
        # Fallback to embedded SQLite
        cls._use_supabase = False
        cls._init_sqlite()
        print(f"[DB] Operating in SQLite mode: {Config.LOCAL_DB_PATH}")

    @classmethod
    def is_supabase(cls) -> bool:
        return cls._use_supabase

    @classmethod
    def get_connection(cls):
        """Returns SQLite connection with row factory enabled."""
        Config.LOCAL_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(Config.LOCAL_DB_PATH))
        conn.row_factory = sqlite3.Row
        return conn

    @classmethod
    def _init_sqlite(cls):
        """Initializes SQLite tables and seeds initial data if database is new."""
        conn = cls.get_connection()
        cursor = conn.cursor()

        cursor.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('student', 'counselor', 'admin')),
            avatar_initial TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            phone TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS student_profiles (
            id TEXT PRIMARY KEY,
            user_id TEXT UNIQUE NOT NULL,
            student_id_number TEXT UNIQUE NOT NULL,
            course TEXT NOT NULL,
            year_section TEXT NOT NULL,
            emergency_contact TEXT,
            consent_ra10173 INTEGER NOT NULL DEFAULT 1,
            consent_ra9258 INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS counselor_profiles (
            id TEXT PRIMARY KEY,
            user_id TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            room TEXT NOT NULL,
            specialization TEXT NOT NULL,
            max_daily_appointments INTEGER NOT NULL DEFAULT 8,
            bio TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS guidance_services (
            id TEXT PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            duration_minutes INTEGER NOT NULL DEFAULT 45,
            icon TEXT NOT NULL DEFAULT 'book-open',
            confidentiality_level TEXT NOT NULL DEFAULT 'Confidential',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS counselor_availability (
            id TEXT PRIMARY KEY,
            counselor_id TEXT NOT NULL,
            day_of_week INTEGER NOT NULL,
            start_time TEXT NOT NULL DEFAULT '08:00',
            end_time TEXT NOT NULL DEFAULT '17:00',
            slot_duration_minutes INTEGER NOT NULL DEFAULT 45,
            is_available INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY (counselor_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS appointments (
            id TEXT PRIMARY KEY,
            reference_code TEXT UNIQUE NOT NULL,
            student_id TEXT NOT NULL,
            counselor_id TEXT NOT NULL,
            service_id TEXT NOT NULL,
            date TEXT NOT NULL,
            time_slot TEXT NOT NULL,
            modality TEXT NOT NULL DEFAULT 'In-Person',
            urgency TEXT NOT NULL DEFAULT 'Routine',
            reason TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending',
            cancellation_reason TEXT,
            location_or_link TEXT DEFAULT 'Guidance Rm 204',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (counselor_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (service_id) REFERENCES guidance_services(id)
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_prevent_double_booking 
        ON appointments(counselor_id, date, time_slot) 
        WHERE status IN ('Pending', 'Approved');

        CREATE TABLE IF NOT EXISTS appointment_status_history (
            id TEXT PRIMARY KEY,
            appointment_id TEXT NOT NULL,
            old_status TEXT,
            new_status TEXT NOT NULL,
            changed_by_user_id TEXT NOT NULL,
            comments TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS counseling_session_records (
            id TEXT PRIMARY KEY,
            appointment_id TEXT,
            student_id TEXT NOT NULL,
            counselor_id TEXT NOT NULL,
            session_date TEXT NOT NULL,
            session_duration_minutes INTEGER DEFAULT 45,
            case_category TEXT NOT NULL,
            subjective TEXT NOT NULL,
            objective TEXT NOT NULL,
            assessment TEXT NOT NULL,
            plan TEXT NOT NULL,
            confidentiality_level TEXT NOT NULL DEFAULT 'Strictly Confidential',
            status TEXT NOT NULL DEFAULT 'Confidential',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (counselor_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS follow_up_tasks (
            id TEXT PRIMARY KEY,
            counselor_id TEXT NOT NULL,
            student_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            due_date TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (counselor_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            recipient_id TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'info',
            is_read INTEGER NOT NULL DEFAULT 0,
            link TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS announcements (
            id TEXT PRIMARY KEY,
            author_id TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'General Notice',
            target_audience TEXT NOT NULL DEFAULT 'All',
            is_pinned INTEGER NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS guidance_resources (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            content TEXT,
            file_url TEXT,
            target_program TEXT DEFAULT 'All',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS appointment_feedback (
            id TEXT PRIMARY KEY,
            appointment_id TEXT UNIQUE NOT NULL,
            student_id TEXT NOT NULL,
            rating INTEGER NOT NULL,
            comments TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            user_name TEXT NOT NULL,
            action TEXT NOT NULL,
            details TEXT NOT NULL,
            ip_address TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS system_settings (
            id TEXT PRIMARY KEY,
            setting_key TEXT UNIQUE NOT NULL,
            setting_value TEXT NOT NULL,
            description TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        """)
        conn.commit()

        # Seed initial records if empty
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM users")
        if cur.fetchone()[0] == 0:
            cls._seed_sqlite(conn)
        conn.close()

    @classmethod
    def _seed_sqlite(cls, conn):
        """Seeds initial demo data from account.text into SQLite."""
        # bcrypt hash for password123
        pwd_hash = "$2b$12$4McCr50z0YtmHGL34kwdu.CNaaKCRqA9.Xn.FE/KmKVTT3hay0Xjm"

        users = [
            ('usr-std-1', 'juan.delacruz@buenavista.edu.ph', pwd_hash, 'Juan Dela Cruz', 'student', 'JD', 'active', '0917-555-0192'),
            ('usr-std-2', 'angelica.ramos@buenavista.edu.ph', pwd_hash, 'Angelica Ramos', 'student', 'AR', 'active', '0918-555-0143'),
            ('usr-std-3', 'mark.reyes@buenavista.edu.ph', pwd_hash, 'Mark Anthony Reyes', 'student', 'MR', 'active', '0922-555-0188'),
            ('usr-cns-1', 'msantos.guidance@buenavista.edu.ph', pwd_hash, 'Dr. Maria Santos, RGC, PhD', 'counselor', 'MS', 'active', '0919-555-0101'),
            ('usr-cns-2', 'rrivera.guidance@buenavista.edu.ph', pwd_hash, 'Prof. Robert Rivera, RGC, MAEd', 'counselor', 'RR', 'active', '0919-555-0102'),
            ('usr-cns-3', 'ecastillo.guidance@buenavista.edu.ph', pwd_hash, 'Ms. Elena Castillo, RPm, RGC', 'counselor', 'EC', 'active', '0919-555-0103'),
            ('usr-adm-1', 'admin.guidance@buenavista.edu.ph', pwd_hash, 'Director Lourdes Mendoza', 'admin', 'LM', 'active', '0917-555-0100')
        ]
        conn.executemany("INSERT INTO users (id, email, password_hash, name, role, avatar_initial, status, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", users)

        student_profiles = [
            ('prof-std-1', 'usr-std-1', 'BCC-2023-01048', 'BSIT', '3A', 'Maria Dela Cruz (Mother) - 0917-000-1111'),
            ('prof-std-2', 'usr-std-2', 'BCC-2023-01892', 'BSIT', '2B', 'Eduardo Ramos (Father) - 0918-000-2222'),
            ('prof-std-3', 'usr-std-3', 'BCC-2024-00431', 'BSHM', '1A', 'Teresa Reyes (Mother) - 0922-000-3333')
        ]
        conn.executemany("INSERT INTO student_profiles (id, user_id, student_id_number, course, year_section, emergency_contact) VALUES (?, ?, ?, ?, ?, ?)", student_profiles)

        counselor_profiles = [
            ('prof-cns-1', 'usr-cns-1', 'Registered Guidance Counselor & Mental Health Specialist', 'Guidance Office Rm 204', 'Personal, Emotional & Psychological First Aid', 8, 'Over 12 years of clinical counseling and student crisis intervention experience.'),
            ('prof-cns-2', 'usr-cns-2', 'Guidance Counselor & BSIT Department Liaison', 'Guidance Office Rm 205', 'Academic Progression, Career Guidance & Stress Management', 8, 'Specializes in student retention, academic probation counseling, and career transitions.'),
            ('prof-cns-3', 'usr-cns-3', 'Guidance Counselor & Psychometrician', 'Guidance Office Rm 206', 'Psychological Assessment & Grievance Facilitation', 8, 'Expert in standardized psychometric assessments and conflict mediation.')
        ]
        conn.executemany("INSERT INTO counselor_profiles (id, user_id, title, room, specialization, max_daily_appointments, bio) VALUES (?, ?, ?, ?, ?, ?, ?)", counselor_profiles)

        services = [
            ('srv-1', 'IND-COUN', 'Individual Counseling', 'One-on-one confidential counseling addressing personal, psychological, emotional, or social difficulties.', 'Counseling', 45, 'heart', 'Strictly Confidential', 1),
            ('srv-2', 'ACAD-ADV', 'Academic Advising & Support', 'Assistance with study habits, time management, subject backlogs, and academic probation recovery.', 'Academic', 45, 'book-open', 'Confidential', 1),
            ('srv-3', 'CAR-COAL', 'Career Counseling & Placement', 'Professional guidance on career development, OJT readiness, job placement, and career transition.', 'Career', 60, 'compass', 'Standard', 1),
            ('srv-4', 'CRISIS-INT', 'Crisis Intervention & Psychological First Aid', 'Immediate assistance and psychological support for acute distress, grief, or personal emergencies.', 'Emergency', 30, 'shield', 'Urgent Confidential', 1),
            ('srv-5', 'PEER-FAC', 'Peer Facilitation & Mediation', 'Conflict mediation between classmates, roommates, or campus student organizations.', 'Mediation', 45, 'users', 'Confidential', 1),
            ('srv-6', 'PSYCH-ASS', 'Psychological Assessment & Testing', 'Standardized psychological appraisals, personality inventories, and mental wellness screeners.', 'Assessment', 60, 'file-text', 'Strictly Confidential', 1)
        ]
        conn.executemany("INSERT INTO guidance_services (id, code, title, description, category, duration_minutes, icon, confidentiality_level, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", services)

        appointments = [
            ('apt-1', 'BCC-APT-20260820-001', 'usr-std-1', 'usr-cns-1', 'srv-1', '2026-08-20', '1:00 PM', 'In-Person', 'Routine', 'Seeking guidance regarding exam stress and heavy academic workload.', 'Approved', 'Guidance Office Rm 204'),
            ('apt-2', 'BCC-APT-20260821-002', 'usr-std-2', 'usr-cns-2', 'srv-2', '2026-08-21', '10:00 AM', 'In-Person', 'Routine', 'Consultation regarding study habit adjustments for major computing subjects.', 'Pending', 'Guidance Office Rm 205'),
            ('apt-3', 'BCC-APT-20260810-003', 'usr-std-1', 'usr-cns-1', 'srv-3', '2026-08-10', '2:00 PM', 'Online (Google Meet)', 'Routine', 'OJT placement and industry internship preparation consultation.', 'Completed', 'meet.google.com/bcc-guidance-001'),
            ('apt-4', 'BCC-APT-20260815-004', 'usr-std-3', 'usr-cns-3', 'srv-1', '2026-08-15', '9:00 AM', 'In-Person', 'Routine', 'Initial consultation regarding college adjustment and transition from senior high.', 'Cancelled', 'Guidance Office Rm 206')
        ]
        conn.executemany("INSERT INTO appointments (id, reference_code, student_id, counselor_id, service_id, date, time_slot, modality, urgency, reason, status, location_or_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", appointments)

        notes = [
            ('note-1', 'apt-3', 'usr-std-1', 'usr-cns-1', '2026-08-10', 45, 'Career Consultation',
             'Student expressed uncertainty regarding career trajectory in web software development versus networking.',
             'Client arrived on time, was articulate and showed high motivation to improve technical portfolio.',
             'Mild career-related stress typical of 3rd year transition. Good coping mechanisms evident.',
             'Recommended participating in BCC tech workshops. Scheduled follow-up session for resume review.',
             'Strictly Confidential', 'Confidential')
        ]
        conn.executemany("INSERT INTO counseling_session_records (id, appointment_id, student_id, counselor_id, session_date, session_duration_minutes, case_category, subjective, objective, assessment, plan, confidentiality_level, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", notes)

        resources = [
            ('res-1', 'Time Management & Academic Success Guide', 'Study Skills', 'Master course workloads, prioritize assignments using the Eisenhower Matrix, and eliminate procrastination.', 'Time management is essential for collegiate success at Buenavista Community College. 1. Use the Eisenhower Matrix: categorize tasks by urgency and importance. 2. Adopt the Pomodoro Technique: study in 25-minute focused blocks followed by 5-minute rests. 3. Audit your weekly hours: balance lecture, lab work, study time, and rest. 4. Visit BCC Guidance Office (Room 204) for individual academic habit planning.', 'All'),
            ('res-2', 'Managing College Stress & Exam Anxiety', 'Mental Wellness', 'Practical coping strategies, grounding techniques, and 4-7-8 breathing exercises to conquer academic pressure.', 'College life brings new challenges that can trigger acute stress. 1. Recognize somatic symptoms: elevated heart rate, muscle tension, and insomnia. 2. Practice 4-7-8 diaphragmatic breathing: inhale for 4 seconds, hold for 7, exhale slowly for 8. 3. Avoid excessive caffeine right before examinations. 4. If feelings of overwhelm persist, schedule a confidential counseling appointment at the Guidance Office.', 'All'),
            ('res-3', 'Career Pathway & Internship (OJT) Readiness Checklist', 'Career Guidance', 'Essential preparation checklist for students preparing for on-the-job training (OJT) and industry practicum.', 'Preparing for industry placement requires proactive groundwork: 1. Ensure all prerequisite academic clearances and MOAs are completed. 2. Draft an industry-standard resume highlighting coursework projects and technical competencies. 3. Obtain necessary medical certificates and insurance requirements. 4. Consult your assigned counselor for mock behavioral interviews and workplace ethics orientation.', 'All'),
            ('res-4', 'Hospitality & Tourism Professional Etiquette Handbook', 'Career Guidance', 'Standard operating guidelines on guest interaction, customer delight, intercultural sensitivity, and grooming.', 'For BSHM and BSTM majors, hospitality excellence begins with daily discipline: 1. Maintain immaculate personal grooming and uniform standards. 2. Master active listening and empathetic dialogue during guest inquiries. 3. Apply the HEAT model (Hear, Empathize, Apologize, Take Action) for conflict resolution. 4. Respect cultural nuances when serving international and domestic guests.', 'BSHM & BSTM'),
            ('res-5', 'Effective Study Habits & Active Recall Strategies', 'Study Skills', 'Replace passive re-reading with active recall, spaced repetition, and the Feynman technique to boost retention.', 'Passive reading creates an illusion of competence. 1. Active Recall: test yourself after every chapter by closing the book and writing down core concepts. 2. Spaced Repetition: review material on day 1, day 3, day 7, and day 21 before exams. 3. Feynman Technique: explain complex programming algorithms, accounting equations, or criminology procedures in simple terms as if teaching a beginner.', 'All'),
            ('res-6', 'College Adjustment & Freshmen Transition Toolkit', 'Study Skills', 'Navigating independence, college social circles, campus resources, and overcoming freshmen imposter syndrome.', 'Transitioning from senior high school to BCC college life is a major life milestone. 1. Familiarize yourself with BCC campus offices: Registrar, Guidance, Library, Dean\'s Office, and Clinic. 2. Establish a healthy social circle through student clubs and academic study groups. 3. Recognize that feeling overwhelmed early on is normal—reach out to peer facilitators and guidance staff whenever you need guidance.', '1st Year Students'),
            ('res-7', 'Resume Writing & Professional Portfolio Mastery', 'Career Guidance', 'Step-by-step guide to crafting an impactful 1-page modern resume, LinkedIn profile, and digital portfolio.', 'Your resume is your personal marketing document: 1. Stick to a clean, reverse-chronological single-page format. 2. Use action verbs and metric-driven accomplishments. 3. Tailor keywords to the specific job description. 4. Have your resume reviewed at the BCC Guidance Center before submitting to internship partners.', '3rd & 4th Year Students'),
            ('res-8', 'Acing Job & Internship Behavioral Interviews', 'Career Guidance', 'Master the STAR method (Situation, Task, Action, Result) to confidently answer challenging interview questions.', 'Employers evaluate not just technical skills, but soft skills and emotional resilience: 1. Structure your answers using STAR (Situation, Task, Action, Result). 2. Prepare 3 core stories showcasing teamwork, leadership, and conflict resolution. 3. Research the company or agency thoroughly beforehand. 4. Prepare insightful questions to ask the interviewer at the end of the conversation.', 'Graduating Students'),
            ('res-9', 'Emotional Resilience & Mindfulness for College Students', 'Mental Wellness', 'Cultivating psychological strength, cognitive reframing, and daily mindfulness practices for academic challenges.', 'Resilience is the ability to bounce back from academic setbacks, failed quizzes, and interpersonal disappointments: 1. Practice cognitive reframing: view failures as data for improvement rather than personal flaws. 2. Grounding Exercise (5-4-3-2-1): Notice 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. 3. Maintain gratitude journaling and positive self-talk.', 'All'),
            ('res-10', 'Personal Development, Goal Setting & Self-Leadership', 'Mental Wellness', 'Establishing SMART goals, building personal integrity, and cultivating healthy self-discipline in college.', 'Becoming a successful professional requires conscious personal development: 1. Formulate SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound). 2. Align your daily habits with your long-term life vision. 3. Practice digital detox during exam periods. 4. Treat yourself and your peers with mutual respect, empathy, and constructive communication.', 'All'),
            ('res-11', 'BCC Guidance & Counseling Support Directory & Rights', 'Mental Wellness', 'Your guide to counseling rights, confidentiality protections under RA 9258, and guidance office services.', 'The Center for Student Development & Guidance Services is committed to safeguarding student welfare: 1. Confidentiality Pledge: Sessions are protected by RA 9258 (Guidance and Counseling Act of 2004) and RA 10173 (Data Privacy Act of 2012). 2. How to book: Use the BCC online booking portal or visit Room 204. 3. Emergency walk-ins are accommodated for urgent mental health distress. You are never alone.', 'All Students'),
            ('res-12', 'Digital Wellness & Healthy Screen-Time Boundaries', 'Study Skills', 'Combatting digital fatigue, late-night screen addiction, and maintaining eye health during heavy computer coursework.', 'With extensive screen time required for programming, research, and online study, digital wellness is critical: 1. Apply the 20-20-20 rule: Every 20 minutes, look at an object 20 feet away for at least 20 seconds. 2. Turn off non-essential notifications during study blocks. 3. Establish a blue-light curfew at least 45 minutes before sleep. 4. Incorporate daily physical stretching and outdoor breaks.', 'BSIT & All Programs')
        ]
        conn.executemany("INSERT INTO guidance_resources (id, title, category, description, content, target_program) VALUES (?, ?, ?, ?, ?, ?)", resources)

        announcements = [
            ('ann-1', 'usr-adm-1', 'Welcome to 1st Semester A.Y. 2026-2027 Guidance Services', 'The Center for Student Development & Guidance Services is now fully open for student consultations, mental wellness counseling, and academic support.', 'General Notice', 'All', 1),
            ('ann-2', 'usr-adm-1', 'Guidance Awareness Month & Free Mental Wellness Screeners', 'Join us every Wednesday this month for open counseling hours and stress management workshops in Room 204.', 'Event', 'Students', 0)
        ]
        conn.executemany("INSERT INTO announcements (id, author_id, title, content, category, target_audience, is_pinned) VALUES (?, ?, ?, ?, ?, ?, ?)", announcements)

        settings = [
            ('set-1', 'MIN_BOOKING_LEAD_HOURS', '24', 'Minimum advance notice required in hours before booking an appointment.'),
            ('set-2', 'MAX_ADVANCE_BOOKING_DAYS', '14', 'Maximum days in advance a student can book an appointment.'),
            ('set-3', 'CANCELLATION_CUTOFF_HOURS', '4', 'Hours before the appointment after which student self-cancellation is restricted.'),
            ('set-4', 'MAX_ACTIVE_APPOINTMENTS_PER_STUDENT', '2', 'Maximum concurrent active appointments allowed per student account.')
        ]
        conn.executemany("INSERT INTO system_settings (id, setting_key, setting_value, description) VALUES (?, ?, ?, ?)", settings)

        conn.commit()

    # ── CRUD Operations Abstraction Layer ──

    @classmethod
    def get_user_by_email(cls, email: str) -> dict:
        if cls._use_supabase:
            res = cls._supabase_client.table('users').select('*').eq('email', email.lower()).execute()
            if res.data:
                u = res.data[0]
                uid = u['id']
                if u['role'] == 'student':
                    p = cls._supabase_client.table('student_profiles').select('*').eq('user_id', uid).execute()
                    if p.data:
                        prof_data = {k: v for k, v in p.data[0].items() if k != 'id'}
                        u.update(prof_data)
                        u['profile_id'] = p.data[0].get('id')
                elif u['role'] == 'counselor':
                    p = cls._supabase_client.table('counselor_profiles').select('*').eq('user_id', uid).execute()
                    if p.data:
                        prof_data = {k: v for k, v in p.data[0].items() if k != 'id'}
                        u.update(prof_data)
                        u['profile_id'] = p.data[0].get('id')
                u['id'] = uid
                return u
            return None

        conn = cls.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email.lower(),))
        row = cur.fetchone()
        if not row:
            conn.close()
            return None
        user = dict(row)
        uid = user['id']
        if user['role'] == 'student':
            cur.execute("SELECT * FROM student_profiles WHERE user_id = ?", (uid,))
            p = cur.fetchone()
            if p:
                prof_data = {k: v for k, v in dict(p).items() if k != 'id'}
                user.update(prof_data)
                user['profile_id'] = dict(p).get('id')
        elif user['role'] == 'counselor':
            cur.execute("SELECT * FROM counselor_profiles WHERE user_id = ?", (uid,))
            p = cur.fetchone()
            if p:
                prof_data = {k: v for k, v in dict(p).items() if k != 'id'}
                user.update(prof_data)
                user['profile_id'] = dict(p).get('id')
        user['id'] = uid
        conn.close()
        return user

    @classmethod
    def get_user_by_id(cls, user_id: str) -> dict:
        if cls._use_supabase:
            res = cls._supabase_client.table('users').select('*').eq('id', user_id).execute()
            if not res.data:
                # Check if user_id passed was actually a profile ID
                sp_lookup = cls._supabase_client.table('student_profiles').select('user_id').eq('id', user_id).execute()
                if sp_lookup.data:
                    return cls.get_user_by_id(sp_lookup.data[0]['user_id'])
                cp_lookup = cls._supabase_client.table('counselor_profiles').select('user_id').eq('id', user_id).execute()
                if cp_lookup.data:
                    return cls.get_user_by_id(cp_lookup.data[0]['user_id'])
                return None
            u = res.data[0]
            uid = u['id']
            if u.get('role') == 'student':
                sp = cls._supabase_client.table('student_profiles').select('*').eq('user_id', uid).execute()
                if sp.data:
                    prof_data = {k: v for k, v in sp.data[0].items() if k != 'id'}
                    u.update(prof_data)
                    u['profile_id'] = sp.data[0].get('id')
            elif u.get('role') == 'counselor':
                cp = cls._supabase_client.table('counselor_profiles').select('*').eq('user_id', uid).execute()
                if cp.data:
                    prof_data = {k: v for k, v in cp.data[0].items() if k != 'id'}
                    u.update(prof_data)
                    u['profile_id'] = cp.data[0].get('id')
            u['id'] = uid
            return u

        conn = cls.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cur.fetchone()
        if not row:
            # Check profile id fallback in SQLite
            cur.execute("SELECT user_id FROM student_profiles WHERE id = ?", (user_id,))
            sp_r = cur.fetchone()
            if sp_r:
                conn.close()
                return cls.get_user_by_id(sp_r[0])
            cur.execute("SELECT user_id FROM counselor_profiles WHERE id = ?", (user_id,))
            cp_r = cur.fetchone()
            if cp_r:
                conn.close()
                return cls.get_user_by_id(cp_r[0])
            conn.close()
            return None
        user = dict(row)
        uid = user['id']
        if user.get('role') == 'student':
            cur.execute("SELECT * FROM student_profiles WHERE user_id = ?", (uid,))
            p = cur.fetchone()
            if p:
                prof_data = {k: v for k, v in dict(p).items() if k != 'id'}
                user.update(prof_data)
                user['profile_id'] = dict(p).get('id')
        elif user.get('role') == 'counselor':
            cur.execute("SELECT * FROM counselor_profiles WHERE user_id = ?", (uid,))
            p = cur.fetchone()
            if p:
                prof_data = {k: v for k, v in dict(p).items() if k != 'id'}
                user.update(prof_data)
                user['profile_id'] = dict(p).get('id')
        user['id'] = uid
        conn.close()
        return user

    @classmethod
    def get_all_users(cls, role: str = None) -> list:
        if cls._use_supabase:
            users_list = []
            try:
                q = cls._supabase_client.table('users').select("""
                    *,
                    student_profiles(course, year_section, student_id_number, emergency_contact),
                    counselor_profiles(specialization, room, title)
                """)
                if role:
                    q = q.eq('role', role)
                res = q.order('created_at', desc=True).execute()
                users_list = res.data or []
            except Exception as e:
                print(f"[Supabase] get_all_users join fallback: {e}")
                q = cls._supabase_client.table('users').select('*')
                if role:
                    q = q.eq('role', role)
                res = q.order('created_at', desc=True).execute()
                users_list = res.data or []

            users = []
            for u in users_list:
                sp_raw = u.get('student_profiles')
                sp = sp_raw[0] if isinstance(sp_raw, list) and len(sp_raw) > 0 else (sp_raw if isinstance(sp_raw, dict) else {})
                cp_raw = u.get('counselor_profiles')
                cp = cp_raw[0] if isinstance(cp_raw, list) and len(cp_raw) > 0 else (cp_raw if isinstance(cp_raw, dict) else {})
                users.append({
                    **u,
                    'course': sp.get('course', ''),
                    'year_section': sp.get('year_section', ''),
                    'student_id_number': sp.get('student_id_number', ''),
                    'emergency_contact': sp.get('emergency_contact', ''),
                    'specialization': cp.get('specialization', ''),
                    'room': cp.get('room', ''),
                    'title': cp.get('title', '')
                })
            return users

        conn = cls.get_connection()
        cur = conn.cursor()
        if role:
            cur.execute("""
                SELECT u.id, u.email, u.name, u.role, u.avatar_initial, u.status, u.phone, u.created_at,
                       sp.course, sp.year_section, cp.specialization
                FROM users u
                LEFT JOIN student_profiles sp ON u.id = sp.user_id
                LEFT JOIN counselor_profiles cp ON u.id = cp.user_id
                WHERE u.role = ? ORDER BY u.created_at DESC
            """, (role,))
        else:
            cur.execute("""
                SELECT u.id, u.email, u.name, u.role, u.avatar_initial, u.status, u.phone, u.created_at,
                       sp.course, sp.year_section, cp.specialization
                FROM users u
                LEFT JOIN student_profiles sp ON u.id = sp.user_id
                LEFT JOIN counselor_profiles cp ON u.id = cp.user_id
                ORDER BY u.created_at DESC
            """)
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return rows

    @classmethod
    def create_user(cls, user_data: dict) -> dict:
        uid = user_data.get('id') or f"usr-{uuid.uuid4().hex[:8]}"
        user_data['id'] = uid

        if cls._use_supabase:
            cls._supabase_client.table('users').insert({
                'id': uid,
                'email': user_data['email'].lower(),
                'password_hash': user_data['password_hash'],
                'name': user_data['name'],
                'role': user_data['role'],
                'avatar_initial': user_data.get('avatar_initial') or user_data['name'][:2].upper(),
                'status': user_data.get('status', 'active'),
                'phone': user_data.get('phone', '')
            }).execute()

            if user_data['role'] == 'student':
                student_id = user_data.get('student_id_number') or user_data.get('studentId') or user_data.get('student_id') or f"BCC-2026-{uuid.uuid4().hex[:5].upper()}"
                year_sec = user_data.get('year_section') or user_data.get('yearSection') or '1A'
                em_contact = user_data.get('emergency_contact') or user_data.get('emergencyContact') or ''
                course = user_data.get('course') or 'BSIT'

                cls._supabase_client.table('student_profiles').insert({
                    'id': f"prof-{uuid.uuid4().hex[:8]}",
                    'user_id': uid,
                    'student_id_number': student_id,
                    'course': course,
                    'year_section': year_sec,
                    'emergency_contact': em_contact
                }).execute()
            elif user_data['role'] == 'counselor':
                cls._supabase_client.table('counselor_profiles').insert({
                    'id': f"cprof-{uuid.uuid4().hex[:8]}",
                    'user_id': uid,
                    'title': user_data.get('title', 'Registered Guidance Counselor'),
                    'room': user_data.get('room', 'Guidance Office Rm 204'),
                    'specialization': user_data.get('specialization', 'General Guidance'),
                    'max_daily_appointments': int(user_data.get('max_daily_appointments') or user_data.get('max_appointments') or 5),
                    'bio': user_data.get('bio', ''),
                    'is_active': True
                }).execute()
            return user_data

        conn = cls.get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO users (id, email, password_hash, name, role, avatar_initial, status, phone)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            uid,
            user_data['email'].lower(),
            user_data['password_hash'],
            user_data['name'],
            user_data['role'],
            user_data.get('avatar_initial') or user_data['name'][:2].upper(),
            user_data.get('status', 'active'),
            user_data.get('phone', '')
        ))

        if user_data['role'] == 'student':
            student_id = user_data.get('student_id_number') or user_data.get('studentId') or user_data.get('student_id') or f"BCC-2026-{uuid.uuid4().hex[:5].upper()}"
            year_sec = user_data.get('year_section') or user_data.get('yearSection') or '1A'
            em_contact = user_data.get('emergency_contact') or user_data.get('emergencyContact') or ''
            course = user_data.get('course') or 'BSIT'

            cur.execute("""
                INSERT INTO student_profiles (id, user_id, student_id_number, course, year_section, emergency_contact)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                f"prof-{uuid.uuid4().hex[:8]}",
                uid,
                student_id,
                course,
                year_sec,
                em_contact
            ))
        elif user_data['role'] == 'counselor':
            cur.execute("""
                INSERT INTO counselor_profiles (id, user_id, title, room, specialization, max_daily_appointments, bio, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                f"cprof-{uuid.uuid4().hex[:8]}",
                uid,
                user_data.get('title', 'Registered Guidance Counselor'),
                user_data.get('room', 'Guidance Office Rm 204'),
                user_data.get('specialization', 'General Guidance'),
                int(user_data.get('max_daily_appointments') or user_data.get('max_appointments') or 5),
                user_data.get('bio', ''),
                1
            ))
        conn.commit()
        conn.close()
        return user_data

    # ── Services ──

    @classmethod
    def get_services(cls, active_only: bool = True) -> list:
        if cls._use_supabase:
            q = cls._supabase_client.table('guidance_services').select('*')
            if active_only:
                q = q.eq('is_active', True)
            return q.order('created_at').execute().data

        conn = cls.get_connection()
        cur = conn.cursor()
        if active_only:
            cur.execute("SELECT * FROM guidance_services WHERE is_active = 1 ORDER BY created_at")
        else:
            cur.execute("SELECT * FROM guidance_services ORDER BY created_at")
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return rows

    @classmethod
    def get_service_by_id(cls, srv_id: str) -> dict:
        if cls._use_supabase:
            res = cls._supabase_client.table('guidance_services').select('*').eq('id', srv_id).execute()
            return res.data[0] if res.data else None

        conn = cls.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM guidance_services WHERE id = ?", (srv_id,))
        row = cur.fetchone()
        conn.close()
        return dict(row) if row else None

    # ── Counselors ──

    @classmethod
    def get_counselors(cls) -> list:
        if cls._use_supabase:
            counselors = []
            try:
                res = cls._supabase_client.table('users').select('*, counselor_profiles(*)').eq('role', 'counselor').eq('status', 'active').execute()
                users_list = res.data or []
            except Exception as e:
                print(f"[Supabase] get_counselors join fallback: {e}")
                res = cls._supabase_client.table('users').select('*').eq('role', 'counselor').eq('status', 'active').execute()
                users_list = res.data or []

            for u in users_list:
                cp = u.get('counselor_profiles')
                if isinstance(cp, list):
                    prof = cp[0] if len(cp) > 0 else {}
                elif isinstance(cp, dict):
                    prof = cp
                else:
                    try:
                        p_res = cls._supabase_client.table('counselor_profiles').select('*').eq('user_id', u['id']).execute()
                        prof = p_res.data[0] if p_res.data else {}
                    except Exception:
                        prof = {}
                prof_clean = {k: v for k, v in prof.items() if k != 'id'}
                counselors.append({**u, **prof_clean, 'profile_id': prof.get('id')})
            return counselors

        conn = cls.get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT u.id, u.email, u.name, u.avatar_initial, u.phone,
                   cp.title, cp.room, cp.specialization, cp.max_daily_appointments, cp.bio
            FROM users u
            JOIN counselor_profiles cp ON u.id = cp.user_id
            WHERE u.role = 'counselor' AND u.status = 'active'
        """)
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return rows

    # ── Appointments ──

    @classmethod
    def get_appointments(cls, student_id=None, counselor_id=None, status=None, search=None) -> list:
        if cls._use_supabase:
            data_list = []
            try:
                q = cls._supabase_client.table('appointments').select("""
                    *,
                    student:users!appointments_student_id_fkey(name, email, phone),
                    counselor:users!appointments_counselor_id_fkey(name, email),
                    service:guidance_services(title, category, duration_minutes)
                """)
                if student_id:
                    q = q.eq('student_id', student_id)
                if counselor_id:
                    q = q.eq('counselor_id', counselor_id)
                if status and status != 'All':
                    q = q.eq('status', status)
                res = q.order('date', desc=True).execute()
                data_list = res.data or []
            except Exception as e:
                print(f"[Supabase] appointments joined query fallback: {e}")
                q = cls._supabase_client.table('appointments').select('*')
                if student_id:
                    q = q.eq('student_id', student_id)
                if counselor_id:
                    q = q.eq('counselor_id', counselor_id)
                if status and status != 'All':
                    q = q.eq('status', status)
                res = q.order('date', desc=True).execute()
                data_list = res.data or []

            users_cache = {}
            services_cache = {}

            out = []
            for a in data_list:
                std_info = a.get('student')
                if not std_info and a.get('student_id'):
                    sid = a['student_id']
                    if sid not in users_cache:
                        try:
                            u_res = cls._supabase_client.table('users').select('name, email, phone').eq('id', sid).execute()
                            users_cache[sid] = u_res.data[0] if u_res.data else {}
                        except Exception:
                            users_cache[sid] = {}
                    std_info = users_cache[sid]

                cns_info = a.get('counselor')
                if not cns_info and a.get('counselor_id'):
                    cid = a['counselor_id']
                    if cid not in users_cache:
                        try:
                            u_res = cls._supabase_client.table('users').select('name, email').eq('id', cid).execute()
                            users_cache[cid] = u_res.data[0] if u_res.data else {}
                        except Exception:
                            users_cache[cid] = {}
                    cns_info = users_cache[cid]

                srv_info = a.get('service')
                if not srv_info and a.get('service_id'):
                    svid = a['service_id']
                    if svid not in services_cache:
                        try:
                            sv_res = cls._supabase_client.table('guidance_services').select('title, category, duration_minutes').eq('id', svid).execute()
                            services_cache[svid] = sv_res.data[0] if sv_res.data else {}
                        except Exception:
                            services_cache[svid] = {}
                    srv_info = services_cache[svid]

                std_name = std_info.get('name', 'Student') if std_info else 'Student'
                cns_name = cns_info.get('name', 'Counselor') if cns_info else 'Counselor'
                srv_title = srv_info.get('title', 'Service') if srv_info else 'Service'
                ref = a.get('reference_code', '')
                
                if search:
                    term = search.lower()
                    if (term not in std_name.lower() and
                        term not in ref.lower() and
                        term not in srv_title.lower() and
                        term not in cns_name.lower()):
                        continue

                out.append({
                    **a,
                    'referenceCode': ref,
                    'timeSlot': a.get('time_slot', ''),
                    'studentId': a.get('student_id', ''),
                    'counselorId': a.get('counselor_id', ''),
                    'serviceId': a.get('service_id', ''),
                    'studentName': std_name,
                    'studentEmail': std_info.get('email', '') if std_info else '',
                    'counselorName': cns_name,
                    'serviceTitle': srv_title,
                    'location': a.get('location_or_link', 'Guidance Office Rm 204')
                })
            return out

        conn = cls.get_connection()
        cur = conn.cursor()
        query = """
            SELECT a.*,
                   u_std.name as studentName, u_std.email as studentEmail, sp.course as studentCourse,
                   sp.student_id_number as studentNumber, sp.year_section as studentYearSection,
                   u_cns.name as counselorName, cp.room as counselorRoom,
                   gs.title as serviceTitle, gs.duration_minutes as durationMinutes
            FROM appointments a
            JOIN users u_std ON a.student_id = u_std.id
            LEFT JOIN student_profiles sp ON u_std.id = sp.user_id
            JOIN users u_cns ON a.counselor_id = u_cns.id
            LEFT JOIN counselor_profiles cp ON u_cns.id = cp.user_id
            JOIN guidance_services gs ON a.service_id = gs.id
            WHERE 1=1
        """
        params = []
        if student_id:
            query += " AND a.student_id = ?"
            params.append(student_id)
        if counselor_id:
            query += " AND a.counselor_id = ?"
            params.append(counselor_id)
        if status and status != 'All':
            query += " AND a.status = ?"
            params.append(status)
        if search:
            query += " AND (u_std.name LIKE ? OR a.reference_code LIKE ? OR gs.title LIKE ?)"
            term = f"%{search}%"
            params.extend([term, term, term])

        query += " ORDER BY a.date DESC, a.created_at DESC"
        cur.execute(query, params)
        rows = []
        for r in cur.fetchall():
            d = dict(r)
            d['referenceCode'] = d.get('reference_code')
            d['timeSlot'] = d.get('time_slot')
            d['studentId'] = d.get('student_id')
            d['counselorId'] = d.get('counselor_id')
            d['serviceId'] = d.get('service_id')
            d['location'] = d.get('location_or_link')
            d['courseYear'] = f"{d.get('studentCourse', 'BSIT')} {d.get('studentYearSection', '')}".strip()
            rows.append(d)
        conn.close()
        return rows

    @classmethod
    def get_appointment_by_id(cls, apt_id: str) -> dict:
        if cls._use_supabase:
            data_list = []
            try:
                res = cls._supabase_client.table('appointments').select("""
                    *,
                    student:users!appointments_student_id_fkey(name, email, phone),
                    counselor:users!appointments_counselor_id_fkey(name, email),
                    service:guidance_services(title, category, duration_minutes)
                """).or_(f"id.eq.{apt_id},reference_code.eq.{apt_id}").execute()
                data_list = res.data or []
            except Exception as e:
                print(f"[Supabase] appointment by id join fallback: {e}")
                res = cls._supabase_client.table('appointments').select('*').or_(f"id.eq.{apt_id},reference_code.eq.{apt_id}").execute()
                data_list = res.data or []

            if not data_list:
                return None
            a = data_list[0]

            student_info = a.get('student')
            if not student_info and a.get('student_id'):
                try:
                    s_res = cls._supabase_client.table('users').select('name, email, phone').eq('id', a['student_id']).execute()
                    student_info = s_res.data[0] if s_res.data else {}
                except Exception:
                    student_info = {}

            counselor_info = a.get('counselor')
            if not counselor_info and a.get('counselor_id'):
                try:
                    c_res = cls._supabase_client.table('users').select('name, email').eq('id', a['counselor_id']).execute()
                    counselor_info = c_res.data[0] if c_res.data else {}
                except Exception:
                    counselor_info = {}

            service_info = a.get('service')
            if not service_info and a.get('service_id'):
                try:
                    srv_res = cls._supabase_client.table('guidance_services').select('title, category, duration_minutes').eq('id', a['service_id']).execute()
                    service_info = srv_res.data[0] if srv_res.data else {}
                except Exception:
                    service_info = {}

            sp_data = {}
            if a.get('student_id'):
                try:
                    sp = cls._supabase_client.table('student_profiles').select('*').eq('user_id', a['student_id']).execute()
                    sp_data = sp.data[0] if sp.data else {}
                except Exception:
                    pass

            cp_data = {}
            if a.get('counselor_id'):
                try:
                    cp = cls._supabase_client.table('counselor_profiles').select('*').eq('user_id', a['counselor_id']).execute()
                    cp_data = cp.data[0] if cp.data else {}
                except Exception:
                    pass
            
            std_name = student_info.get('name', 'Student') if student_info else 'Student'
            cns_name = counselor_info.get('name', 'Counselor') if counselor_info else 'Counselor'
            srv_title = service_info.get('title', 'Service') if service_info else 'Service'
            
            return {
                **a,
                'referenceCode': a.get('reference_code'),
                'timeSlot': a.get('time_slot'),
                'studentId': a.get('student_id'),
                'counselorId': a.get('counselor_id'),
                'serviceId': a.get('service_id'),
                'location': a.get('location_or_link', 'Guidance Office Rm 204'),
                'studentName': std_name,
                'studentEmail': student_info.get('email', '') if student_info else '',
                'studentPhone': student_info.get('phone', '') if student_info else '',
                'studentCourse': sp_data.get('course', 'BSIT'),
                'studentNumber': sp_data.get('student_id_number', ''),
                'courseYear': f"{sp_data.get('course', 'BSIT')} {sp_data.get('year_section', '')}".strip(),
                'counselorName': cns_name,
                'counselorRoom': cp_data.get('room', 'Guidance Office Rm 204'),
                'serviceTitle': srv_title,
                'durationMinutes': service_info.get('duration_minutes', 45) if service_info else 45
            }

        conn = cls.get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT a.*,
                   u_std.name as studentName, u_std.email as studentEmail, sp.course as studentCourse,
                   sp.student_id_number as studentNumber, sp.year_section as studentYearSection,
                   u_cns.name as counselorName, cp.room as counselorRoom,
                   gs.title as serviceTitle
            FROM appointments a
            JOIN users u_std ON a.student_id = u_std.id
            LEFT JOIN student_profiles sp ON u_std.id = sp.user_id
            JOIN users u_cns ON a.counselor_id = u_cns.id
            LEFT JOIN counselor_profiles cp ON u_cns.id = cp.user_id
            JOIN guidance_services gs ON a.service_id = gs.id
            WHERE a.id = ? OR a.reference_code = ?
        """, (apt_id, apt_id))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row)
        d['referenceCode'] = d.get('reference_code')
        d['timeSlot'] = d.get('time_slot')
        d['studentId'] = d.get('student_id')
        d['counselorId'] = d.get('counselor_id')
        d['serviceId'] = d.get('service_id')
        d['location'] = d.get('location_or_link')
        d['courseYear'] = f"{d.get('studentCourse', 'BSIT')} {d.get('studentYearSection', '')}".strip()
        return d

    @classmethod
    def create_appointment(cls, data: dict) -> dict:
        """
        Creates an appointment with transaction-level double booking check and validation.
        Normalizes modality and urgency to satisfy check constraints.
        """
        counselor_id = data['counselor_id']
        date = data['date']
        time_slot = data['time_slot']

        # Modality normalization to match CHECK (modality IN ('In-Person', 'Online (Google Meet)', 'Phone Call'))
        raw_modality = str(data.get('modality', 'In-Person')).strip()
        if 'meet' in raw_modality.lower() or 'online' in raw_modality.lower() or 'video' in raw_modality.lower():
            modality = 'Online (Google Meet)'
        elif 'phone' in raw_modality.lower() or 'call' in raw_modality.lower():
            modality = 'Phone Call'
        else:
            modality = 'In-Person'

        # Urgency normalization to match CHECK (urgency IN ('Routine', 'Urgent', 'Crisis Intervention'))
        raw_urgency = str(data.get('urgency', 'Routine')).strip()
        if 'crisis' in raw_urgency.lower() or 'emergency' in raw_urgency.lower():
            urgency = 'Crisis Intervention'
        elif 'urgent' in raw_urgency.lower() or 'high' in raw_urgency.lower() or 'immediate' in raw_urgency.lower():
            urgency = 'Urgent'
        else:
            urgency = 'Routine'

        location = data.get('location_or_link') or ('meet.google.com/bcc-guidance' if modality == 'Online (Google Meet)' else 'Guidance Office Rm 204')

        student_id = data['student_id']
        counselor_id = data['counselor_id']

        if cls._use_supabase:
            # Check student exists (or resolve from profile id)
            std_chk = cls._supabase_client.table('users').select('id, name').eq('id', student_id).execute()
            if not std_chk.data:
                sp_chk = cls._supabase_client.table('student_profiles').select('user_id').eq('id', student_id).execute()
                if sp_chk.data:
                    student_id = sp_chk.data[0]['user_id']
                    data['student_id'] = student_id
                else:
                    raise ValueError(f"Student account not found (id: {data['student_id']}).")

            # Check counselor exists (or resolve from profile id)
            cns_chk = cls._supabase_client.table('users').select('id, name').eq('id', counselor_id).execute()
            if not cns_chk.data:
                cp_chk = cls._supabase_client.table('counselor_profiles').select('user_id').eq('id', counselor_id).execute()
                if cp_chk.data:
                    counselor_id = cp_chk.data[0]['user_id']
                    data['counselor_id'] = counselor_id
                else:
                    raise ValueError(f"Counselor account not found (id: {data['counselor_id']}).")

            # Check service exists
            srv_chk = cls._supabase_client.table('guidance_services').select('id, title').eq('id', data['service_id']).execute()
            if not srv_chk.data:
                raise ValueError(f"Guidance service not found (id: {data['service_id']}).")

            # Check for conflict
            conflict = cls._supabase_client.table('appointments').select('id')\
                .eq('counselor_id', counselor_id)\
                .eq('date', date)\
                .eq('time_slot', time_slot)\
                .in_('status', ['Pending', 'Approved']).execute()
            if conflict.data:
                raise ValueError(f"Selected counselor already has a reserved session on {date} at {time_slot}. Please select another slot.")

            apt_id = data.get('id') or f"apt-{uuid.uuid4().hex[:8]}"
            date_clean = date.replace('-', '')
            ref = data.get('reference_code') or f"BCC-APT-{date_clean}-{uuid.uuid4().hex[:4].upper()}"

            new_apt = {
                'id': apt_id,
                'reference_code': ref,
                'student_id': student_id,
                'counselor_id': counselor_id,
                'service_id': data['service_id'],
                'date': date,
                'time_slot': time_slot,
                'modality': modality,
                'urgency': urgency,
                'reason': data['reason'],
                'status': 'Pending',
                'location_or_link': location
            }
            cls._supabase_client.table('appointments').insert(new_apt).execute()

            # Record history in Supabase
            try:
                cls._supabase_client.table('appointment_status_history').insert({
                    'id': f"hist-{uuid.uuid4().hex[:8]}",
                    'appointment_id': apt_id,
                    'old_status': None,
                    'new_status': 'Pending',
                    'changed_by_user_id': student_id,
                    'comments': 'Appointment submitted by student'
                }).execute()
            except Exception as e:
                print(f"[Supabase] History log notice: {e}")

            # Create notification for counselor in Supabase
            try:
                cls._supabase_client.table('notifications').insert({
                    'id': f"notif-{uuid.uuid4().hex[:8]}",
                    'recipient_id': counselor_id,
                    'title': 'New Appointment Request',
                    'message': f"New request submitted for {date} at {time_slot} (Ref: {ref})",
                    'type': 'appointment',
                    'link': 'counselor/appointments.html'
                }).execute()
            except Exception as e:
                print(f"[Supabase] Notification notice: {e}")

            return cls.get_appointment_by_id(apt_id)

        conn = cls.get_connection()
        cur = conn.cursor()
        try:
            # Check student exists (or resolve from profile id)
            cur.execute("SELECT id FROM users WHERE id = ?", (student_id,))
            if not cur.fetchone():
                cur.execute("SELECT user_id FROM student_profiles WHERE id = ?", (student_id,))
                sp_row = cur.fetchone()
                if sp_row:
                    student_id = sp_row[0]
                    data['student_id'] = student_id
                else:
                    raise ValueError(f"Student account not found (id: {data['student_id']}).")

            # Check counselor exists (or resolve from profile id)
            cur.execute("SELECT id FROM users WHERE id = ?", (counselor_id,))
            if not cur.fetchone():
                cur.execute("SELECT user_id FROM counselor_profiles WHERE id = ?", (counselor_id,))
                cp_row = cur.fetchone()
                if cp_row:
                    counselor_id = cp_row[0]
                    data['counselor_id'] = counselor_id
                else:
                    raise ValueError(f"Counselor account not found (id: {data['counselor_id']}).")

            # Check service exists
            cur.execute("SELECT id FROM guidance_services WHERE id = ?", (data['service_id'],))
            if not cur.fetchone():
                raise ValueError(f"Guidance service not found (id: {data['service_id']}).")

            # Double booking check within transaction
            cur.execute("""
                SELECT id FROM appointments 
                WHERE counselor_id = ? AND date = ? AND time_slot = ? AND status IN ('Pending', 'Approved')
            """, (counselor_id, date, time_slot))
            if cur.fetchone():
                raise ValueError(f"Selected counselor already has a reserved session on {date} at {time_slot}. Please select another slot.")

            apt_id = data.get('id') or f"apt-{uuid.uuid4().hex[:8]}"
            date_clean = date.replace('-', '')
            ref = data.get('reference_code') or f"BCC-APT-{date_clean}-{uuid.uuid4().hex[:4].upper()}"

            cur.execute("""
                INSERT INTO appointments (
                    id, reference_code, student_id, counselor_id, service_id,
                    date, time_slot, modality, urgency, reason, status, location_or_link
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                apt_id, ref, data['student_id'], counselor_id, data['service_id'],
                date, time_slot, modality, urgency, data['reason'], 'Pending',
                location
            ))

            # Record history
            cur.execute("""
                INSERT INTO appointment_status_history (id, appointment_id, old_status, new_status, changed_by_user_id, comments)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (f"hist-{uuid.uuid4().hex[:8]}", apt_id, None, 'Pending', data['student_id'], 'Appointment submitted by student'))

            # Create notification for counselor
            cur.execute("""
                INSERT INTO notifications (id, recipient_id, title, message, type, link)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                f"notif-{uuid.uuid4().hex[:8]}",
                counselor_id,
                'New Appointment Request',
                f"New request submitted for {date} at {time_slot} (Ref: {ref})",
                'appointment',
                'counselor/appointments.html'
            ))

            conn.commit()
            new_apt = cls.get_appointment_by_id(apt_id)
            return new_apt
        finally:
            conn.close()

    @classmethod
    def update_appointment_status(cls, apt_id: str, new_status: str, changed_by_id: str, comments: str = '') -> dict:
        if cls._use_supabase:
            apt_res = cls._supabase_client.table('appointments').select('*').or_(f"id.eq.{apt_id},reference_code.eq.{apt_id}").execute()
            if not apt_res.data:
                raise ValueError("Appointment not found")
            apt = apt_res.data[0]
            real_id = apt['id']
            old_status = apt['status']

            update_data = {
                'status': new_status,
                'updated_at': datetime.datetime.now().isoformat()
            }
            if new_status == 'Cancelled':
                update_data['cancellation_reason'] = comments

            cls._supabase_client.table('appointments').update(update_data).eq('id', real_id).execute()

            try:
                cls._supabase_client.table('appointment_status_history').insert({
                    'id': f"hist-{uuid.uuid4().hex[:8]}",
                    'appointment_id': real_id,
                    'old_status': old_status,
                    'new_status': new_status,
                    'changed_by_user_id': changed_by_id,
                    'comments': comments
                }).execute()
            except Exception as e:
                print(f"[Supabase] Status history notice: {e}")

            try:
                cls._supabase_client.table('notifications').insert({
                    'id': f"notif-{uuid.uuid4().hex[:8]}",
                    'recipient_id': apt['student_id'],
                    'title': f"Appointment {new_status}",
                    'message': f"Your appointment ({apt.get('reference_code', '')}) has been marked as {new_status}." + (f" Note: {comments}" if comments else ""),
                    'type': 'appointment',
                    'link': 'student/appointments.html'
                }).execute()
            except Exception as e:
                print(f"[Supabase] Notification notice: {e}")

            return cls.get_appointment_by_id(real_id)

        conn = cls.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM appointments WHERE id = ? OR reference_code = ?", (apt_id, apt_id))
        row = cur.fetchone()
        if not row:
            conn.close()
            raise ValueError("Appointment not found")
        real_id = row['id']
        old_status = row['status']

        cur.execute("""
            UPDATE appointments SET status = ?, cancellation_reason = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (new_status, comments if new_status == 'Cancelled' else None, real_id))

        cur.execute("""
            INSERT INTO appointment_status_history (id, appointment_id, old_status, new_status, changed_by_user_id, comments)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (f"hist-{uuid.uuid4().hex[:8]}", real_id, old_status, new_status, changed_by_id, comments))

        cur.execute("""
            INSERT INTO notifications (id, recipient_id, title, message, type, link)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            f"notif-{uuid.uuid4().hex[:8]}",
            row['student_id'],
            f"Appointment {new_status}",
            f"Your appointment ({row['reference_code']}) has been marked as {new_status}." + (f" Note: {comments}" if comments else ""),
            'appointment',
            'student/appointments.html'
        ))

        conn.commit()
        conn.close()
        return cls.get_appointment_by_id(real_id)

    # ── Feedback ──

    @classmethod
    def submit_feedback(cls, apt_id: str, student_id: str, rating: int, comments: str) -> dict:
        if cls._use_supabase:
            existing = cls._supabase_client.table('appointment_feedback').select('id').eq('appointment_id', apt_id).execute()
            if existing.data:
                raise ValueError("Feedback for this appointment has already been submitted.")

            fid = f"fb-{uuid.uuid4().hex[:8]}"
            fb = {
                'id': fid,
                'appointment_id': apt_id,
                'student_id': student_id,
                'rating': rating,
                'comments': comments
            }
            cls._supabase_client.table('appointment_feedback').insert(fb).execute()
            return fb

        conn = cls.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT id FROM appointment_feedback WHERE appointment_id = ?", (apt_id,))
        if cur.fetchone():
            conn.close()
            raise ValueError("Feedback for this appointment has already been submitted.")

        fid = f"fb-{uuid.uuid4().hex[:8]}"
        cur.execute("""
            INSERT INTO appointment_feedback (id, appointment_id, student_id, rating, comments)
            VALUES (?, ?, ?, ?, ?)
        """, (fid, apt_id, student_id, rating, comments))
        conn.commit()
        conn.close()
        return {'id': fid, 'appointment_id': apt_id, 'rating': rating, 'comments': comments}

    # ── Clinical SOAP Notes ──

    @classmethod
    def get_counseling_records(cls, counselor_id: str = None, student_id: str = None) -> list:
        if cls._use_supabase:
            records = []
            try:
                q = cls._supabase_client.table('counseling_session_records').select("""
                    *,
                    student:users!counseling_session_records_student_id_fkey(name, email)
                """)
                if counselor_id:
                    q = q.eq('counselor_id', counselor_id)
                if student_id:
                    q = q.eq('student_id', student_id)
                res = q.order('session_date', desc=True).execute()
                records = res.data or []
            except Exception as e:
                print(f"[Supabase] Join note query fallback: {e}")
                q = cls._supabase_client.table('counseling_session_records').select('*')
                if counselor_id:
                    q = q.eq('counselor_id', counselor_id)
                if student_id:
                    q = q.eq('student_id', student_id)
                res = q.order('session_date', desc=True).execute()
                records = res.data or []

            user_cache = {}
            out = []
            for r in records:
                s_name = 'Student'
                s_email = ''
                if r.get('student'):
                    s_name = r['student'].get('name', 'Student')
                    s_email = r['student'].get('email', '')
                elif r.get('student_id'):
                    sid = r['student_id']
                    if sid not in user_cache:
                        try:
                            u_res = cls._supabase_client.table('users').select('name, email').eq('id', sid).execute()
                            user_cache[sid] = u_res.data[0] if u_res.data else {}
                        except Exception:
                            user_cache[sid] = {}
                    s_name = user_cache[sid].get('name', 'Student')
                    s_email = user_cache[sid].get('email', '')

                out.append({
                    **r,
                    'studentName': s_name,
                    'studentEmail': s_email,
                    'sessionDate': r.get('session_date'),
                    'caseCategory': r.get('case_category')
                })
            return out

        conn = cls.get_connection()
        cur = conn.cursor()
        query = """
            SELECT c.*, u.name as studentName, u.email as studentEmail
            FROM counseling_session_records c
            JOIN users u ON c.student_id = u.id
            WHERE 1=1
        """
        params = []
        if counselor_id:
            query += " AND c.counselor_id = ?"
            params.append(counselor_id)
        if student_id:
            query += " AND c.student_id = ?"
            params.append(student_id)
        query += " ORDER BY c.session_date DESC"
        cur.execute(query, params)
        rows = [dict(r) for r in cur.fetchall()]
        for r in rows:
            r['sessionDate'] = r.get('session_date')
            r['caseCategory'] = r.get('case_category')
        conn.close()
        return rows

    @classmethod
    def create_counseling_record(cls, data: dict) -> dict:
        nid = f"note-{uuid.uuid4().hex[:8]}"
        conf_level = data.get('confidentiality_level', 'Strictly Confidential')
        status = data.get('status', 'Confidential')
        session_date = data.get('session_date', datetime.date.today().isoformat())
        duration = data.get('session_duration_minutes', 45)

        if cls._use_supabase:
            rec = {
                'id': nid,
                'appointment_id': data.get('appointment_id'),
                'student_id': data['student_id'],
                'counselor_id': data['counselor_id'],
                'session_date': session_date,
                'session_duration_minutes': duration,
                'case_category': data['case_category'],
                'subjective': data['subjective'],
                'objective': data['objective'],
                'assessment': data['assessment'],
                'plan': data['plan'],
                'confidentiality_level': conf_level,
                'status': status
            }
            cls._supabase_client.table('counseling_session_records').insert(rec).execute()
            return {
                **data,
                'id': nid,
                'confidentiality_level': conf_level,
                'status': status,
                'session_date': session_date,
                'session_duration_minutes': duration
            }

        conn = cls.get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO counseling_session_records (
                id, appointment_id, student_id, counselor_id, session_date,
                session_duration_minutes, case_category, subjective, objective,
                assessment, plan, confidentiality_level, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            nid,
            data.get('appointment_id'),
            data['student_id'],
            data['counselor_id'],
            session_date,
            duration,
            data['case_category'],
            data['subjective'],
            data['objective'],
            data['assessment'],
            data['plan'],
            conf_level,
            status
        ))
        conn.commit()
        conn.close()
        return {
            **data,
            'id': nid,
            'confidentiality_level': conf_level,
            'status': status,
            'session_date': session_date,
            'session_duration_minutes': duration
        }

    # ── Guidance Resources ──

    @classmethod
    def get_resources(cls, category: str = None) -> list:
        if cls._use_supabase:
            q = cls._supabase_client.table('guidance_resources').select('*')
            if category and category != 'All':
                q = q.eq('category', category)
            res = q.order('created_at', desc=True).execute()
            return res.data or []

        conn = cls.get_connection()
        cur = conn.cursor()
        if category and category != 'All':
            cur.execute("SELECT * FROM guidance_resources WHERE category = ? ORDER BY created_at DESC", (category,))
        else:
            cur.execute("SELECT * FROM guidance_resources ORDER BY created_at DESC")
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return rows

    # ── Announcements & Notifications ──

    @classmethod
    def get_announcements(cls) -> list:
        if cls._use_supabase:
            res_data = []
            try:
                res = cls._supabase_client.table('announcements').select("""
                    *,
                    author:users!announcements_author_id_fkey(name)
                """).order('is_pinned', desc=True).order('created_at', desc=True).execute()
                res_data = res.data or []
            except Exception as e:
                print(f"[Supabase] announcements join fallback: {e}")
                res = cls._supabase_client.table('announcements').select('*').order('is_pinned', desc=True).order('created_at', desc=True).execute()
                res_data = res.data or []

            out = []
            for a in res_data:
                author_name = a.get('author', {}).get('name', 'BCC Guidance Office') if a.get('author') else 'BCC Guidance Office'
                out.append({
                    **a,
                    'authorName': author_name,
                    'author': author_name,
                    'targetAudience': a.get('target_audience', 'All')
                })
            return out

        conn = cls.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT a.*, u.name as authorName FROM announcements a JOIN users u ON a.author_id = u.id ORDER BY a.is_pinned DESC, a.created_at DESC")
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return rows

    @classmethod
    def save_announcement(cls, data: dict) -> dict:
        aid = data.get('id') or f"ann-{uuid.uuid4().hex[:8]}"
        is_pinned = 1 if data.get('is_pinned', False) else 0

        if cls._use_supabase:
            ann_data = {
                'id': aid,
                'title': data['title'],
                'content': data['content'],
                'category': data.get('category', 'General Notice'),
                'target_audience': data.get('target_audience') or data.get('targetAudience') or 'All',
                'author_id': data.get('author_id', 'usr-adm-1'),
                'is_pinned': bool(is_pinned)
            }
            cls._supabase_client.table('announcements').upsert(ann_data).execute()
            return {'id': aid, **data}

        conn = cls.get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO announcements (id, title, content, category, author_id, is_pinned, is_published)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            aid,
            data['title'],
            data['content'],
            data.get('category', 'General Notice'),
            data.get('author_id', 'usr-adm-1'),
            is_pinned,
            is_published
        ))
        conn.commit()
        conn.close()
        return {'id': aid, **data}

    @classmethod
    def get_notifications(cls, user_id: str) -> list:
        if cls._use_supabase:
            res = cls._supabase_client.table('notifications').select('*').eq('recipient_id', user_id).order('created_at', desc=True).limit(20).execute()
            return res.data or []

        conn = cls.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT 20", (user_id,))
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return rows

    @classmethod
    def mark_notification_read(cls, notif_id: str):
        if cls._use_supabase:
            cls._supabase_client.table('notifications').update({'is_read': 1}).eq('id', notif_id).execute()
            return

        conn = cls.get_connection()
        cur = conn.cursor()
        cur.execute("UPDATE notifications SET is_read = 1 WHERE id = ?", (notif_id,))
        conn.commit()
        conn.close()

    # ── Audit Logs ──

    @classmethod
    def add_audit_log(cls, user_id: str, user_name: str, action: str, details: str, ip: str = None):
        log_id = f"log-{uuid.uuid4().hex[:8]}"
        if cls._use_supabase:
            try:
                cls._supabase_client.table('audit_logs').insert({
                    'id': log_id,
                    'user_id': user_id,
                    'user_name': user_name,
                    'action': action,
                    'details': details,
                    'ip_address': ip
                }).execute()
            except Exception as e:
                print(f"[Supabase] add_audit_log notice: {e}")
            return

        conn = cls.get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO audit_logs (id, user_id, user_name, action, details, ip_address)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (log_id, user_id, user_name, action, details, ip))
        conn.commit()
        conn.close()

    @classmethod
    def get_audit_logs(cls, limit: int = 50) -> list:
        if cls._use_supabase:
            res = cls._supabase_client.table('audit_logs').select('*').order('created_at', desc=True).limit(limit).execute()
            out = []
            for r in (res.data or []):
                out.append({
                    **r,
                    'timestamp': r.get('created_at', ''),
                    'userName': r.get('user_name', '')
                })
            return out

        conn = cls.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?", (limit,))
        rows = []
        for r in cur.fetchall():
            d = dict(r)
            d['timestamp'] = d.get('created_at', '')
            d['userName'] = d.get('user_name', '')
            rows.append(d)
        conn.close()
        return rows

    # ── System Settings ──

    @classmethod
    def get_settings(cls) -> dict:
        if cls._use_supabase:
            res = cls._supabase_client.table('system_settings').select('setting_key, setting_value').execute()
            raw = {r['setting_key']: r['setting_value'] for r in (res.data or [])}
            settings = dict(raw)
            settings['system_name'] = raw.get('system_name') or raw.get('SYSTEM_NAME') or 'Buenavista Community College Guidance System'
            settings['lead_time_hours'] = raw.get('lead_time_hours') or raw.get('MIN_BOOKING_LEAD_HOURS') or '12'
            settings['cancellation_window_hours'] = raw.get('cancellation_window_hours') or raw.get('CANCELLATION_CUTOFF_HOURS') or '4'
            settings['operating_hours'] = raw.get('operating_hours') or '8:00 AM – 5:00 PM (Mon–Fri)'
            settings['max_advance_booking_days'] = raw.get('max_advance_booking_days') or raw.get('MAX_ADVANCE_BOOKING_DAYS') or '14'
            settings['max_active_appointments_per_student'] = raw.get('max_active_appointments_per_student') or raw.get('MAX_ACTIVE_APPOINTMENTS_PER_STUDENT') or '2'
            return settings

        conn = cls.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT setting_key, setting_value FROM system_settings")
        raw = {r['setting_key']: r['setting_value'] for r in cur.fetchall()}
        conn.close()

        settings = dict(raw)
        settings['system_name'] = raw.get('system_name') or raw.get('SYSTEM_NAME') or 'Buenavista Community College Guidance System'
        settings['lead_time_hours'] = raw.get('lead_time_hours') or raw.get('MIN_BOOKING_LEAD_HOURS') or '12'
        settings['cancellation_window_hours'] = raw.get('cancellation_window_hours') or raw.get('CANCELLATION_CUTOFF_HOURS') or '4'
        settings['operating_hours'] = raw.get('operating_hours') or '8:00 AM – 5:00 PM (Mon–Fri)'
        settings['max_advance_booking_days'] = raw.get('max_advance_booking_days') or raw.get('MAX_ADVANCE_BOOKING_DAYS') or '14'
        settings['max_active_appointments_per_student'] = raw.get('max_active_appointments_per_student') or raw.get('MAX_ACTIVE_APPOINTMENTS_PER_STUDENT') or '2'
        return settings

    @classmethod
    def save_system_settings(cls, settings_dict: dict) -> dict:
        if cls._use_supabase:
            for k, v in settings_dict.items():
                cls._supabase_client.table('system_settings').upsert({
                    'id': f"set-{uuid.uuid4().hex[:6]}",
                    'setting_key': k,
                    'setting_value': str(v)
                }, on_conflict='setting_key').execute()
            return cls.get_settings()

        conn = cls.get_connection()
        cur = conn.cursor()
        for k, v in settings_dict.items():
            cur.execute("""
                INSERT INTO system_settings (id, setting_key, setting_value, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = CURRENT_TIMESTAMP
            """, (f"set-{uuid.uuid4().hex[:6]}", k, str(v)))
        conn.commit()
        conn.close()
        return cls.get_settings()

    # ── Profile & Password Management ──

    @classmethod
    def update_user_password(cls, user_id: str, new_password_hash: str):
        if cls._use_supabase:
            cls._supabase_client.table('users').update({
                'password_hash': new_password_hash,
                'updated_at': datetime.datetime.now().isoformat()
            }).eq('id', user_id).execute()
            return

        conn = cls.get_connection()
        cur = conn.cursor()
        cur.execute("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (new_password_hash, user_id))
        conn.commit()
        conn.close()

    @classmethod
    def update_student_profile(cls, user_id: str, phone: str = None, emergency_contact: str = None) -> dict:
        if cls._use_supabase:
            if phone is not None:
                cls._supabase_client.table('users').update({
                    'phone': phone,
                    'updated_at': datetime.datetime.now().isoformat()
                }).eq('id', user_id).execute()
            if emergency_contact is not None:
                cls._supabase_client.table('student_profiles').update({
                    'emergency_contact': emergency_contact
                }).eq('user_id', user_id).execute()
            return cls.get_user_by_id(user_id)

        conn = cls.get_connection()
        cur = conn.cursor()
        if phone is not None:
            cur.execute("UPDATE users SET phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (phone, user_id))
        if emergency_contact is not None:
            cur.execute("UPDATE student_profiles SET emergency_contact = ? WHERE user_id = ?", (emergency_contact, user_id))
        conn.commit()
        conn.close()
        return cls.get_user_by_id(user_id)

    @classmethod
    def toggle_user_status(cls, user_id: str, new_status: str) -> dict:
        if cls._use_supabase:
            cls._supabase_client.table('users').update({
                'status': new_status,
                'updated_at': datetime.datetime.now().isoformat()
            }).eq('id', user_id).execute()
            return cls.get_user_by_id(user_id)

        conn = cls.get_connection()
        cur = conn.cursor()
        cur.execute("UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (new_status, user_id))
        conn.commit()
        conn.close()
        return cls.get_user_by_id(user_id)

    # ── Service Management ──

    @classmethod
    def save_guidance_service(cls, data: dict) -> dict:
        sid = data.get('id') or f"srv-{uuid.uuid4().hex[:8]}"
        code = data.get('code', f"SRV-{uuid.uuid4().hex[:4].upper()}")
        is_active = bool(data.get('is_active', data.get('isActive', True)))

        if cls._use_supabase:
            srv_record = {
                'id': sid,
                'code': code,
                'title': data['title'],
                'description': data['description'],
                'category': data.get('category', 'General Counseling'),
                'duration_minutes': int(data.get('duration_minutes', data.get('durationMinutes', 45))),
                'icon': data.get('icon', 'book-open'),
                'confidentiality_level': data.get('confidentiality_level', 'Confidential'),
                'is_active': is_active
            }
            cls._supabase_client.table('guidance_services').upsert(srv_record).execute()
            return cls.get_service_by_id(sid)

        conn = cls.get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO guidance_services (id, code, title, description, category, duration_minutes, icon, confidentiality_level, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                code = excluded.code,
                title = excluded.title,
                description = excluded.description,
                category = excluded.category,
                duration_minutes = excluded.duration_minutes,
                icon = excluded.icon,
                confidentiality_level = excluded.confidentiality_level,
                is_active = excluded.is_active
        """, (
            sid,
            code,
            data['title'],
            data['description'],
            data.get('category', 'General Counseling'),
            int(data.get('duration_minutes', data.get('durationMinutes', 45))),
            data.get('icon', 'book-open'),
            data.get('confidentiality_level', 'Confidential'),
            1 if is_active else 0
        ))
        conn.commit()
        conn.close()
        return cls.get_service_by_id(sid)

