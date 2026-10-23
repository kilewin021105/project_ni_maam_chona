import re
import sqlite3
import uuid
import datetime
from contextlib import contextmanager
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
        conn = sqlite3.connect(str(Config.LOCAL_DB_PATH), timeout=10)
        conn.row_factory = sqlite3.Row
        return conn

    @classmethod
    def _init_sqlite(cls):
        """Initializes SQLite tables and seeds initial data if database is new."""
        conn = cls.get_connection()
        try:
            cls._create_and_seed(conn)
        finally:
            conn.close()

    @classmethod
    def _create_and_seed(cls, conn):
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

    @classmethod
    def _seed_sqlite(cls, conn):
        """Seeds the demo accounts (password: password123) and sample data into a new SQLite database."""
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

    # ══════════════════════════════════════════════════════════════════
    # Helpers
    # ══════════════════════════════════════════════════════════════════

    USER_COLUMNS = 'id, email, name, role, avatar_initial, status, phone, created_at, updated_at'
    STUDENT_PROFILE_FIELDS = ('student_id_number', 'course', 'year_section', 'emergency_contact')
    COUNSELOR_PROFILE_FIELDS = ('title', 'room', 'specialization', 'max_daily_appointments', 'bio')
    ID_PATTERN = re.compile(r'^[A-Za-z0-9_\-]{1,80}$')

    @classmethod
    @contextmanager
    def _tx(cls):
        """SQLite transaction: commits on success, rolls back on any error, always closes.
        This is what keeps one failed request from leaving the database locked."""
        conn = cls.get_connection()
        try:
            yield conn.cursor()
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    @classmethod
    def _query(cls, sql, params=()) -> list:
        conn = cls.get_connection()
        try:
            return [dict(r) for r in conn.execute(sql, params).fetchall()]
        finally:
            conn.close()

    @classmethod
    def _query_one(cls, sql, params=()):
        rows = cls._query(sql, params)
        return rows[0] if rows else None

    @classmethod
    def _sb(cls):
        return cls._supabase_client

    @staticmethod
    def new_id(prefix: str) -> str:
        return f"{prefix}-{uuid.uuid4().hex[:12]}"

    @staticmethod
    def _now() -> str:
        return datetime.datetime.now().isoformat(timespec='seconds')

    @classmethod
    def valid_id(cls, value) -> bool:
        return bool(value) and bool(cls.ID_PATTERN.match(str(value)))

    @staticmethod
    def _first(value):
        """Supabase embeds come back as a list or a dict depending on the relationship."""
        if isinstance(value, list):
            return value[0] if value else {}
        return value if isinstance(value, dict) else {}

    # ══════════════════════════════════════════════════════════════════
    # Users
    # ══════════════════════════════════════════════════════════════════

    @classmethod
    def _profile_table(cls, role):
        return {'student': 'student_profiles', 'counselor': 'counselor_profiles'}.get(role)

    @classmethod
    def _attach_profile(cls, user: dict) -> dict:
        table = cls._profile_table(user.get('role'))
        if not table:
            return user
        if cls._use_supabase:
            res = cls._sb().table(table).select('*').eq('user_id', user['id']).execute()
            prof = dict(res.data[0]) if res.data else None
        else:
            prof = cls._query_one(f"SELECT * FROM {table} WHERE user_id = ?", (user['id'],))
        if prof:
            user['profile_id'] = prof.pop('id', None)
            for k in ('user_id', 'created_at', 'updated_at'):
                prof.pop(k, None)
            user.update(prof)
        return user

    @classmethod
    def _get_user(cls, column: str, value, include_password: bool) -> dict:
        if value is None:
            return None
        cols = cls.USER_COLUMNS + (', password_hash' if include_password else '')
        if cls._use_supabase:
            q = cls._sb().table('users').select(cols)
            q = q.eq(column, value.lower() if column == 'email' else value)
            res = q.execute()
            user = dict(res.data[0]) if res.data else None
        else:
            where = 'LOWER(email) = ?' if column == 'email' else f'{column} = ?'
            user = cls._query_one(f"SELECT {cols} FROM users WHERE {where}",
                                  (value.lower() if column == 'email' else value,))
        return cls._attach_profile(user) if user else None

    @classmethod
    def get_user_by_email(cls, email: str, include_password: bool = False) -> dict:
        return cls._get_user('email', (email or '').strip(), include_password)

    @classmethod
    def get_user_by_id(cls, user_id: str, include_password: bool = False) -> dict:
        return cls._get_user('id', user_id, include_password)

    @classmethod
    def get_user_by_student_number(cls, student_number: str) -> dict:
        if not student_number:
            return None
        if cls._use_supabase:
            res = cls._sb().table('student_profiles').select('user_id').eq('student_id_number', student_number).execute()
            return {'id': res.data[0]['user_id']} if res.data else None
        row = cls._query_one("SELECT user_id FROM student_profiles WHERE student_id_number = ?", (student_number,))
        return {'id': row['user_id']} if row else None

    @classmethod
    def get_all_users(cls, role: str = None) -> list:
        if cls._use_supabase:
            select = (cls.USER_COLUMNS +
                      ', student_profiles(student_id_number, course, year_section, emergency_contact)'
                      ', counselor_profiles(title, room, specialization, max_daily_appointments, bio)')
            q = cls._sb().table('users').select(select)
            if role:
                q = q.eq('role', role)
            out = []
            for u in (q.order('created_at', desc=True).execute().data or []):
                sp = cls._first(u.pop('student_profiles', None))
                cp = cls._first(u.pop('counselor_profiles', None))
                out.append({**u, **sp, **cp})
            return out

        query = f"""
            SELECT u.id, u.email, u.name, u.role, u.avatar_initial, u.status, u.phone, u.created_at,
                   sp.student_id_number, sp.course, sp.year_section, sp.emergency_contact,
                   cp.title, cp.room, cp.specialization, cp.max_daily_appointments, cp.bio
            FROM users u
            LEFT JOIN student_profiles sp ON u.id = sp.user_id
            LEFT JOIN counselor_profiles cp ON u.id = cp.user_id
            {'WHERE u.role = ?' if role else ''}
            ORDER BY u.created_at DESC
        """
        return cls._query(query, (role,) if role else ())

    @classmethod
    def create_user(cls, user_data: dict) -> dict:
        uid = cls.new_id('usr')
        role = user_data['role']
        user_row = {
            'id': uid,
            'email': user_data['email'].strip().lower(),
            'password_hash': user_data['password_hash'],
            'name': user_data['name'].strip(),
            'role': role,
            'avatar_initial': user_data.get('avatar_initial') or user_data['name'][:2].upper(),
            'status': user_data.get('status', 'active'),
            'phone': user_data.get('phone', '')
        }
        profile_row = None
        if role == 'student':
            profile_row = {
                'id': cls.new_id('prof'),
                'user_id': uid,
                'student_id_number': user_data.get('student_id_number') or f"BCC-{datetime.date.today().year}-{uuid.uuid4().hex[:5].upper()}",
                'course': user_data.get('course') or 'BSIT',
                'year_section': user_data.get('year_section') or '1A',
                'emergency_contact': user_data.get('emergency_contact', '')
            }
        elif role == 'counselor':
            profile_row = {
                'id': cls.new_id('cprof'),
                'user_id': uid,
                'title': user_data.get('title') or 'Registered Guidance Counselor',
                'room': user_data.get('room') or 'Guidance Office Rm 204',
                'specialization': user_data.get('specialization') or 'General Guidance',
                'max_daily_appointments': int(user_data.get('max_daily_appointments') or 5),
                'bio': user_data.get('bio', '')
            }

        if cls._use_supabase:
            cls._sb().table('users').insert(user_row).execute()
            if profile_row:
                try:
                    cls._sb().table(cls._profile_table(role)).insert(profile_row).execute()
                except Exception:
                    # No cross-table transaction over REST: undo the user row so no half-account is left behind
                    cls._sb().table('users').delete().eq('id', uid).execute()
                    raise
            return cls.get_user_by_id(uid)

        with cls._tx() as cur:
            cols = ', '.join(user_row)
            cur.execute(f"INSERT INTO users ({cols}) VALUES ({', '.join('?' * len(user_row))})", tuple(user_row.values()))
            if profile_row:
                pcols = ', '.join(profile_row)
                cur.execute(f"INSERT INTO {cls._profile_table(role)} ({pcols}) VALUES ({', '.join('?' * len(profile_row))})",
                            tuple(profile_row.values()))
        return cls.get_user_by_id(uid)

    @classmethod
    def update_user(cls, user_id: str, data: dict) -> dict:
        """Updates account and role-specific profile fields. Unknown keys are ignored."""
        user = cls.get_user_by_id(user_id)
        if not user:
            return None
        user_fields = {k: data[k] for k in ('name', 'email', 'phone', 'avatar_initial') if k in data}
        if 'email' in user_fields:
            user_fields['email'] = user_fields['email'].strip().lower()
        allowed = cls.STUDENT_PROFILE_FIELDS if user['role'] == 'student' else (
            cls.COUNSELOR_PROFILE_FIELDS if user['role'] == 'counselor' else ())
        profile_fields = {k: data[k] for k in allowed if k in data}
        table = cls._profile_table(user['role'])

        if cls._use_supabase:
            if user_fields:
                cls._sb().table('users').update({**user_fields, 'updated_at': cls._now()}).eq('id', user_id).execute()
            if profile_fields and table:
                if user.get('profile_id'):
                    cls._sb().table(table).update(profile_fields).eq('user_id', user_id).execute()
            return cls.get_user_by_id(user_id)

        with cls._tx() as cur:
            if user_fields:
                sets = ', '.join(f"{k} = ?" for k in user_fields)
                cur.execute(f"UPDATE users SET {sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                            (*user_fields.values(), user_id))
            if profile_fields and table and user.get('profile_id'):
                sets = ', '.join(f"{k} = ?" for k in profile_fields)
                cur.execute(f"UPDATE {table} SET {sets} WHERE user_id = ?", (*profile_fields.values(), user_id))
        return cls.get_user_by_id(user_id)

    @classmethod
    def update_user_password(cls, user_id: str, new_password_hash: str):
        if cls._use_supabase:
            cls._sb().table('users').update({'password_hash': new_password_hash, 'updated_at': cls._now()}).eq('id', user_id).execute()
            return
        with cls._tx() as cur:
            cur.execute("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (new_password_hash, user_id))

    @classmethod
    def set_user_status(cls, user_id: str, new_status: str) -> dict:
        if cls._use_supabase:
            cls._sb().table('users').update({'status': new_status, 'updated_at': cls._now()}).eq('id', user_id).execute()
        else:
            with cls._tx() as cur:
                cur.execute("UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (new_status, user_id))
        return cls.get_user_by_id(user_id)

    @classmethod
    def count_user_links(cls, user_id: str) -> int:
        """Appointments, case notes and follow-ups that reference this user."""
        if cls._use_supabase:
            total = 0
            for table, cols in (('appointments', ('student_id', 'counselor_id')),
                                ('counseling_session_records', ('student_id', 'counselor_id')),
                                ('follow_up_tasks', ('student_id', 'counselor_id'))):
                for col in cols:
                    total += cls._sb().table(table).select('id', count='exact').eq(col, user_id).execute().count or 0
            return total
        row = cls._query_one("""
            SELECT (SELECT COUNT(*) FROM appointments WHERE student_id = ?1 OR counselor_id = ?1)
                 + (SELECT COUNT(*) FROM counseling_session_records WHERE student_id = ?1 OR counselor_id = ?1)
                 + (SELECT COUNT(*) FROM follow_up_tasks WHERE student_id = ?1 OR counselor_id = ?1) AS n
        """, (user_id,))
        return row['n'] if row else 0

    @classmethod
    def delete_user(cls, user_id: str):
        if cls._use_supabase:
            cls._sb().table('notifications').delete().eq('recipient_id', user_id).execute()
            cls._sb().table('counselor_availability').delete().eq('counselor_id', user_id).execute()
            cls._sb().table('users').delete().eq('id', user_id).execute()
            return
        with cls._tx() as cur:
            for sql in ("DELETE FROM notifications WHERE recipient_id = ?",
                        "DELETE FROM counselor_availability WHERE counselor_id = ?",
                        "DELETE FROM student_profiles WHERE user_id = ?",
                        "DELETE FROM counselor_profiles WHERE user_id = ?",
                        "DELETE FROM users WHERE id = ?"):
                cur.execute(sql, (user_id,))

    # ══════════════════════════════════════════════════════════════════
    # Guidance services
    # ══════════════════════════════════════════════════════════════════

    @staticmethod
    def _clean_service(s: dict) -> dict:
        if s is not None:
            s['is_active'] = bool(s.get('is_active'))
        return s

    @classmethod
    def get_services(cls, active_only: bool = True) -> list:
        if cls._use_supabase:
            q = cls._sb().table('guidance_services').select('*')
            if active_only:
                q = q.eq('is_active', True)
            rows = q.order('created_at').execute().data or []
        else:
            rows = cls._query("SELECT * FROM guidance_services" + (" WHERE is_active = 1" if active_only else "") + " ORDER BY created_at, title")
        return [cls._clean_service(r) for r in rows]

    @classmethod
    def get_service_by_id(cls, srv_id: str) -> dict:
        if cls._use_supabase:
            res = cls._sb().table('guidance_services').select('*').eq('id', srv_id).execute()
            return cls._clean_service(res.data[0]) if res.data else None
        return cls._clean_service(cls._query_one("SELECT * FROM guidance_services WHERE id = ?", (srv_id,)))

    @classmethod
    def get_service_by_code(cls, code: str) -> dict:
        if cls._use_supabase:
            res = cls._sb().table('guidance_services').select('*').eq('code', code).execute()
            return cls._clean_service(res.data[0]) if res.data else None
        return cls._clean_service(cls._query_one("SELECT * FROM guidance_services WHERE code = ?", (code,)))

    @classmethod
    def save_guidance_service(cls, data: dict) -> dict:
        """Creates a service, or updates it when data['id'] names an existing one."""
        sid = data.get('id') or cls.new_id('srv')
        record = {
            'id': sid,
            'code': data['code'],
            'title': data['title'],
            'description': data['description'],
            'category': data.get('category', 'General'),
            'duration_minutes': int(data.get('duration_minutes', 45)),
            'icon': data.get('icon', 'book-open'),
            'confidentiality_level': data.get('confidentiality_level', 'Confidential'),
            'is_active': bool(data.get('is_active', True))
        }
        if cls._use_supabase:
            cls._sb().table('guidance_services').upsert(record).execute()
            return cls.get_service_by_id(sid)

        record['is_active'] = 1 if record['is_active'] else 0
        cols = ', '.join(record)
        updates = ', '.join(f"{k} = excluded.{k}" for k in record if k != 'id')
        with cls._tx() as cur:
            cur.execute(f"INSERT INTO guidance_services ({cols}) VALUES ({', '.join('?' * len(record))}) "
                        f"ON CONFLICT(id) DO UPDATE SET {updates}", tuple(record.values()))
        return cls.get_service_by_id(sid)

    @classmethod
    def service_in_use(cls, srv_id: str) -> bool:
        if cls._use_supabase:
            return (cls._sb().table('appointments').select('id', count='exact').eq('service_id', srv_id).execute().count or 0) > 0
        return cls._query_one("SELECT 1 AS x FROM appointments WHERE service_id = ? LIMIT 1", (srv_id,)) is not None

    @classmethod
    def delete_service(cls, srv_id: str):
        if cls._use_supabase:
            cls._sb().table('guidance_services').delete().eq('id', srv_id).execute()
            return
        with cls._tx() as cur:
            cur.execute("DELETE FROM guidance_services WHERE id = ?", (srv_id,))

    # ══════════════════════════════════════════════════════════════════
    # Counselors & availability
    # ══════════════════════════════════════════════════════════════════

    @classmethod
    def get_counselors(cls) -> list:
        if cls._use_supabase:
            res = cls._sb().table('users').select(
                'id, email, name, avatar_initial, phone, counselor_profiles(title, room, specialization, max_daily_appointments, bio)'
            ).eq('role', 'counselor').eq('status', 'active').execute()
            out = []
            for u in (res.data or []):
                cp = cls._first(u.pop('counselor_profiles', None))
                out.append({**u, **cp})
            return out
        return cls._query("""
            SELECT u.id, u.email, u.name, u.avatar_initial, u.phone,
                   cp.title, cp.room, cp.specialization, cp.max_daily_appointments, cp.bio
            FROM users u
            JOIN counselor_profiles cp ON u.id = cp.user_id
            WHERE u.role = 'counselor' AND u.status = 'active'
            ORDER BY u.name
        """)

    @classmethod
    def get_availability(cls, counselor_id: str) -> dict:
        """Returns {1..5: bool} for Monday..Friday. Days without a row count as available."""
        if cls._use_supabase:
            rows = cls._sb().table('counselor_availability').select('day_of_week, is_available').eq('counselor_id', counselor_id).execute().data or []
        else:
            rows = cls._query("SELECT day_of_week, is_available FROM counselor_availability WHERE counselor_id = ?", (counselor_id,))
        days = {d: True for d in range(1, 6)}
        for r in rows:
            if 1 <= int(r['day_of_week']) <= 5:
                days[int(r['day_of_week'])] = bool(r['is_available'])
        return days

    @classmethod
    def set_availability(cls, counselor_id: str, days: dict):
        rows = [{
            'id': cls.new_id('avail'),
            'counselor_id': counselor_id,
            'day_of_week': d,
            'is_available': bool(days.get(d, True))
        } for d in range(1, 6)]
        if cls._use_supabase:
            cls._sb().table('counselor_availability').delete().eq('counselor_id', counselor_id).execute()
            cls._sb().table('counselor_availability').insert(rows).execute()
            return
        with cls._tx() as cur:
            cur.execute("DELETE FROM counselor_availability WHERE counselor_id = ?", (counselor_id,))
            cur.executemany(
                "INSERT INTO counselor_availability (id, counselor_id, day_of_week, is_available) VALUES (?, ?, ?, ?)",
                [(r['id'], r['counselor_id'], r['day_of_week'], 1 if r['is_available'] else 0) for r in rows])

    # ══════════════════════════════════════════════════════════════════
    # Appointments
    # ══════════════════════════════════════════════════════════════════

    @staticmethod
    def _apt_aliases(d: dict) -> dict:
        """Adds the camelCase names the frontend reads alongside the database columns."""
        d['referenceCode'] = d.get('reference_code')
        d['timeSlot'] = d.get('time_slot')
        d['studentId'] = d.get('student_id')
        d['counselorId'] = d.get('counselor_id')
        d['serviceId'] = d.get('service_id')
        d['location'] = d.get('location_or_link')
        d['cancellationReason'] = d.get('cancellation_reason')
        d['courseYear'] = f"{d.get('studentCourse') or ''} {d.get('studentYearSection') or ''}".strip()
        d['hasFeedback'] = d.get('feedbackRating') is not None
        return d

    @classmethod
    def _fetch_appointments(cls, student_id=None, counselor_id=None, status=None, search=None,
                            apt_id=None, date=None) -> list:
        if cls._use_supabase:
            return cls._fetch_appointments_supabase(student_id, counselor_id, status, search, apt_id, date)

        query = """
            SELECT a.*,
                   u_std.name AS studentName, u_std.email AS studentEmail, u_std.phone AS studentPhone,
                   sp.course AS studentCourse, sp.student_id_number AS studentNumber, sp.year_section AS studentYearSection,
                   u_cns.name AS counselorName, cp.room AS counselorRoom,
                   gs.title AS serviceTitle, gs.category AS serviceCategory, gs.duration_minutes AS durationMinutes,
                   fb.rating AS feedbackRating, fb.comments AS feedbackComments
            FROM appointments a
            JOIN users u_std ON a.student_id = u_std.id
            LEFT JOIN student_profiles sp ON u_std.id = sp.user_id
            JOIN users u_cns ON a.counselor_id = u_cns.id
            LEFT JOIN counselor_profiles cp ON u_cns.id = cp.user_id
            LEFT JOIN guidance_services gs ON a.service_id = gs.id
            LEFT JOIN appointment_feedback fb ON fb.appointment_id = a.id
            WHERE 1=1
        """
        params = []
        if apt_id:
            query += " AND (a.id = ? OR a.reference_code = ?)"
            params += [apt_id, apt_id]
        if student_id:
            query += " AND a.student_id = ?"
            params.append(student_id)
        if counselor_id:
            query += " AND a.counselor_id = ?"
            params.append(counselor_id)
        if status and status != 'All':
            query += " AND a.status = ?"
            params.append(status)
        if date:
            query += " AND a.date = ?"
            params.append(date)
        if search:
            term = f"%{search}%"
            query += " AND (u_std.name LIKE ? OR a.reference_code LIKE ? OR gs.title LIKE ? OR u_cns.name LIKE ?)"
            params += [term, term, term, term]
        query += " ORDER BY a.date DESC, a.created_at DESC"
        return [cls._apt_aliases(r) for r in cls._query(query, params)]

    @classmethod
    def _fetch_appointments_supabase(cls, student_id, counselor_id, status, search, apt_id, date) -> list:
        def base():
            q = cls._sb().table('appointments').select('*')
            if student_id:
                q = q.eq('student_id', student_id)
            if counselor_id:
                q = q.eq('counselor_id', counselor_id)
            if status and status != 'All':
                q = q.eq('status', status)
            if date:
                q = q.eq('date', date)
            return q

        if apt_id:
            if not cls.valid_id(apt_id):
                return []
            rows = base().eq('id', apt_id).execute().data or []
            if not rows:
                rows = base().eq('reference_code', apt_id).execute().data or []
        else:
            rows = base().order('date', desc=True).execute().data or []
        if not rows:
            return []

        # Batched lookups instead of one request per row
        user_ids = list({r['student_id'] for r in rows} | {r['counselor_id'] for r in rows})
        users = {u['id']: u for u in (cls._sb().table('users').select('id, name, email, phone').in_('id', user_ids).execute().data or [])}
        sprof = {p['user_id']: p for p in (cls._sb().table('student_profiles').select('user_id, course, student_id_number, year_section')
                                           .in_('user_id', user_ids).execute().data or [])}
        cprof = {p['user_id']: p for p in (cls._sb().table('counselor_profiles').select('user_id, room').in_('user_id', user_ids).execute().data or [])}
        services = {s['id']: s for s in (cls._sb().table('guidance_services').select('id, title, category, duration_minutes')
                                         .in_('id', list({r['service_id'] for r in rows})).execute().data or [])}
        feedback = {f['appointment_id']: f for f in (cls._sb().table('appointment_feedback').select('appointment_id, rating, comments')
                                                     .in_('appointment_id', [r['id'] for r in rows]).execute().data or [])}
        out = []
        for a in rows:
            std, cns = users.get(a['student_id'], {}), users.get(a['counselor_id'], {})
            sp, cp = sprof.get(a['student_id'], {}), cprof.get(a['counselor_id'], {})
            srv, fb = services.get(a['service_id'], {}), feedback.get(a['id'])
            d = {
                **a,
                'studentName': std.get('name', 'Student'), 'studentEmail': std.get('email', ''), 'studentPhone': std.get('phone', ''),
                'studentCourse': sp.get('course'), 'studentNumber': sp.get('student_id_number'), 'studentYearSection': sp.get('year_section'),
                'counselorName': cns.get('name', 'Counselor'), 'counselorRoom': cp.get('room'),
                'serviceTitle': srv.get('title', 'Service'), 'serviceCategory': srv.get('category'), 'durationMinutes': srv.get('duration_minutes', 45),
                'feedbackRating': fb.get('rating') if fb else None, 'feedbackComments': fb.get('comments') if fb else None
            }
            if search:
                term = search.lower()
                haystack = ' '.join(str(x or '') for x in (d['studentName'], d.get('reference_code'), d['serviceTitle'], d['counselorName'])).lower()
                if term not in haystack:
                    continue
            out.append(cls._apt_aliases(d))
        return out

    @classmethod
    def get_appointments(cls, student_id=None, counselor_id=None, status=None, search=None, date=None) -> list:
        return cls._fetch_appointments(student_id=student_id, counselor_id=counselor_id, status=status, search=search, date=date)

    @classmethod
    def get_appointment_by_id(cls, apt_id: str) -> dict:
        rows = cls._fetch_appointments(apt_id=apt_id)
        return rows[0] if rows else None

    @classmethod
    def booked_slots(cls, counselor_id: str, date: str, exclude_id: str = None) -> set:
        """Time slots already held (Pending/Approved) by a counselor on a date."""
        if cls._use_supabase:
            rows = cls._sb().table('appointments').select('id, time_slot').eq('counselor_id', counselor_id) \
                .eq('date', date).in_('status', ['Pending', 'Approved']).execute().data or []
        else:
            rows = cls._query("SELECT id, time_slot FROM appointments WHERE counselor_id = ? AND date = ? AND status IN ('Pending', 'Approved')",
                              (counselor_id, date))
        return {r['time_slot'] for r in rows if r['id'] != exclude_id}

    @classmethod
    def count_active_for_student(cls, student_id: str, from_date: str) -> int:
        if cls._use_supabase:
            return cls._sb().table('appointments').select('id', count='exact').eq('student_id', student_id) \
                .in_('status', ['Pending', 'Approved']).gte('date', from_date).execute().count or 0
        row = cls._query_one("SELECT COUNT(*) AS n FROM appointments WHERE student_id = ? AND status IN ('Pending', 'Approved') AND date >= ?",
                             (student_id, from_date))
        return row['n']

    @classmethod
    def create_appointment(cls, data: dict) -> dict:
        """Inserts a validated booking. Raises ValueError when the slot was taken in the meantime."""
        apt_id = cls.new_id('apt')
        ref = f"BCC-APT-{data['date'].replace('-', '')}-{uuid.uuid4().hex[:4].upper()}"
        conflict_msg = f"This counselor is already booked on {data['date']} at {data['time_slot']}. Please pick another time."
        row = {
            'id': apt_id, 'reference_code': ref,
            'student_id': data['student_id'], 'counselor_id': data['counselor_id'], 'service_id': data['service_id'],
            'date': data['date'], 'time_slot': data['time_slot'],
            'modality': data['modality'], 'urgency': data['urgency'], 'reason': data['reason'],
            'status': 'Pending', 'location_or_link': data['location_or_link']
        }
        history = {
            'id': cls.new_id('hist'), 'appointment_id': apt_id, 'old_status': None, 'new_status': 'Pending',
            'changed_by_user_id': data['student_id'], 'comments': 'Appointment submitted by student'
        }

        if cls._use_supabase:
            if data['time_slot'] in cls.booked_slots(data['counselor_id'], data['date']):
                raise ValueError(conflict_msg)
            try:
                cls._sb().table('appointments').insert(row).execute()
            except Exception as e:
                if 'duplicate' in str(e).lower() or '23505' in str(e):
                    raise ValueError(conflict_msg)
                raise
            cls._sb().table('appointment_status_history').insert(history).execute()
            return cls.get_appointment_by_id(apt_id)

        try:
            with cls._tx() as cur:
                cur.execute("SELECT 1 FROM appointments WHERE counselor_id = ? AND date = ? AND time_slot = ? AND status IN ('Pending', 'Approved')",
                            (data['counselor_id'], data['date'], data['time_slot']))
                if cur.fetchone():
                    raise ValueError(conflict_msg)
                cur.execute(f"INSERT INTO appointments ({', '.join(row)}) VALUES ({', '.join('?' * len(row))})", tuple(row.values()))
                cur.execute(f"INSERT INTO appointment_status_history ({', '.join(history)}) VALUES ({', '.join('?' * len(history))})",
                            tuple(history.values()))
        except sqlite3.IntegrityError:
            # The partial unique index caught a booking that raced this one
            raise ValueError(conflict_msg)
        return cls.get_appointment_by_id(apt_id)

    @classmethod
    def update_appointment_status(cls, apt_id: str, new_status: str, changed_by_id: str, comments: str = '') -> dict:
        apt = cls.get_appointment_by_id(apt_id)
        if not apt:
            raise LookupError('Appointment not found.')
        real_id = apt['id']
        history = {
            'id': cls.new_id('hist'), 'appointment_id': real_id, 'old_status': apt['status'], 'new_status': new_status,
            'changed_by_user_id': changed_by_id, 'comments': comments or None
        }
        reason = comments if new_status == 'Cancelled' else None

        if cls._use_supabase:
            cls._sb().table('appointments').update({'status': new_status, 'cancellation_reason': reason, 'updated_at': cls._now()}).eq('id', real_id).execute()
            cls._sb().table('appointment_status_history').insert(history).execute()
        else:
            with cls._tx() as cur:
                cur.execute("UPDATE appointments SET status = ?, cancellation_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                            (new_status, reason, real_id))
                cur.execute(f"INSERT INTO appointment_status_history ({', '.join(history)}) VALUES ({', '.join('?' * len(history))})",
                            tuple(history.values()))
        return cls.get_appointment_by_id(real_id)

    @classmethod
    def reschedule_appointment(cls, apt_id: str, new_date: str, new_slot: str, changed_by_id: str, reason: str) -> dict:
        apt = cls.get_appointment_by_id(apt_id)
        if not apt:
            raise LookupError('Appointment not found.')
        real_id = apt['id']
        conflict_msg = f"This counselor is already booked on {new_date} at {new_slot}. Please pick another time."
        if new_slot in cls.booked_slots(apt['counselor_id'], new_date, exclude_id=real_id):
            raise ValueError(conflict_msg)
        history = {
            'id': cls.new_id('hist'), 'appointment_id': real_id, 'old_status': apt['status'], 'new_status': 'Approved',
            'changed_by_user_id': changed_by_id,
            'comments': f"Rescheduled from {apt['date']} {apt['time_slot']} to {new_date} {new_slot}. {reason}".strip()
        }
        if cls._use_supabase:
            try:
                cls._sb().table('appointments').update({'date': new_date, 'time_slot': new_slot, 'status': 'Approved',
                                                        'updated_at': cls._now()}).eq('id', real_id).execute()
            except Exception as e:
                if 'duplicate' in str(e).lower() or '23505' in str(e):
                    raise ValueError(conflict_msg)
                raise
            cls._sb().table('appointment_status_history').insert(history).execute()
        else:
            try:
                with cls._tx() as cur:
                    cur.execute("UPDATE appointments SET date = ?, time_slot = ?, status = 'Approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                                (new_date, new_slot, real_id))
                    cur.execute(f"INSERT INTO appointment_status_history ({', '.join(history)}) VALUES ({', '.join('?' * len(history))})",
                                tuple(history.values()))
            except sqlite3.IntegrityError:
                raise ValueError(conflict_msg)
        return cls.get_appointment_by_id(real_id)

    # ══════════════════════════════════════════════════════════════════
    # Feedback
    # ══════════════════════════════════════════════════════════════════

    @classmethod
    def submit_feedback(cls, apt_id: str, student_id: str, rating: int, comments: str) -> dict:
        fb = {'id': cls.new_id('fb'), 'appointment_id': apt_id, 'student_id': student_id, 'rating': rating, 'comments': comments}
        duplicate = ValueError('Feedback for this appointment has already been submitted.')
        if cls._use_supabase:
            if cls._sb().table('appointment_feedback').select('id').eq('appointment_id', apt_id).execute().data:
                raise duplicate
            cls._sb().table('appointment_feedback').insert(fb).execute()
            return fb
        try:
            with cls._tx() as cur:
                cur.execute("SELECT 1 FROM appointment_feedback WHERE appointment_id = ?", (apt_id,))
                if cur.fetchone():
                    raise duplicate
                cur.execute("INSERT INTO appointment_feedback (id, appointment_id, student_id, rating, comments) VALUES (?, ?, ?, ?, ?)",
                            tuple(fb.values()))
        except sqlite3.IntegrityError:
            raise duplicate
        return fb

    @classmethod
    def get_all_feedback(cls) -> list:
        if cls._use_supabase:
            return cls._sb().table('appointment_feedback').select('appointment_id, student_id, rating, comments, created_at').execute().data or []
        return cls._query("SELECT appointment_id, student_id, rating, comments, created_at FROM appointment_feedback")

    # ══════════════════════════════════════════════════════════════════
    # Confidential SOAP notes
    # ══════════════════════════════════════════════════════════════════

    @classmethod
    def get_counseling_records(cls, counselor_id: str = None, student_id: str = None) -> list:
        if cls._use_supabase:
            q = cls._sb().table('counseling_session_records').select('*')
            if counselor_id:
                q = q.eq('counselor_id', counselor_id)
            if student_id:
                q = q.eq('student_id', student_id)
            rows = q.order('session_date', desc=True).execute().data or []
            ids = list({r['student_id'] for r in rows})
            names = {u['id']: u for u in (cls._sb().table('users').select('id, name, email').in_('id', ids).execute().data or [])} if ids else {}
            for r in rows:
                r['studentName'] = names.get(r['student_id'], {}).get('name', 'Student')
                r['studentEmail'] = names.get(r['student_id'], {}).get('email', '')
        else:
            query = """
                SELECT c.*, u.name AS studentName, u.email AS studentEmail
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
            rows = cls._query(query + " ORDER BY c.session_date DESC, c.created_at DESC", params)
        for r in rows:
            r['sessionDate'] = r.get('session_date')
            r['caseCategory'] = r.get('case_category')
        return rows

    @classmethod
    def create_counseling_record(cls, data: dict) -> dict:
        rec = {
            'id': cls.new_id('note'),
            'appointment_id': data.get('appointment_id') or None,
            'student_id': data['student_id'],
            'counselor_id': data['counselor_id'],
            'session_date': data.get('session_date') or datetime.date.today().isoformat(),
            'session_duration_minutes': int(data.get('session_duration_minutes') or 45),
            'case_category': data['case_category'],
            'subjective': data['subjective'],
            'objective': data['objective'],
            'assessment': data['assessment'],
            'plan': data['plan'],
            'confidentiality_level': 'Strictly Confidential',
            'status': 'Confidential'
        }
        if cls._use_supabase:
            cls._sb().table('counseling_session_records').insert(rec).execute()
        else:
            with cls._tx() as cur:
                cur.execute(f"INSERT INTO counseling_session_records ({', '.join(rec)}) VALUES ({', '.join('?' * len(rec))})", tuple(rec.values()))
        return rec

    # ══════════════════════════════════════════════════════════════════
    # Follow-up tasks
    # ══════════════════════════════════════════════════════════════════

    @classmethod
    def get_followups(cls, counselor_id: str) -> list:
        if cls._use_supabase:
            rows = cls._sb().table('follow_up_tasks').select('*').eq('counselor_id', counselor_id).order('due_date').execute().data or []
            ids = list({r['student_id'] for r in rows})
            names = {u['id']: u['name'] for u in (cls._sb().table('users').select('id, name').in_('id', ids).execute().data or [])} if ids else {}
            for r in rows:
                r['studentName'] = names.get(r['student_id'], 'Student')
            return rows
        return cls._query("""
            SELECT f.*, u.name AS studentName FROM follow_up_tasks f
            JOIN users u ON f.student_id = u.id
            WHERE f.counselor_id = ? ORDER BY f.status = 'Completed', f.due_date
        """, (counselor_id,))

    @classmethod
    def get_followup(cls, task_id: str) -> dict:
        if cls._use_supabase:
            res = cls._sb().table('follow_up_tasks').select('*').eq('id', task_id).execute()
            return res.data[0] if res.data else None
        return cls._query_one("SELECT * FROM follow_up_tasks WHERE id = ?", (task_id,))

    @classmethod
    def create_followup(cls, data: dict) -> dict:
        task = {
            'id': cls.new_id('fu'),
            'counselor_id': data['counselor_id'],
            'student_id': data['student_id'],
            'title': data['title'],
            'description': data.get('description', ''),
            'due_date': data['due_date'],
            'status': 'Pending'
        }
        if cls._use_supabase:
            cls._sb().table('follow_up_tasks').insert(task).execute()
        else:
            with cls._tx() as cur:
                cur.execute(f"INSERT INTO follow_up_tasks ({', '.join(task)}) VALUES ({', '.join('?' * len(task))})", tuple(task.values()))
        return task

    @classmethod
    def update_followup_status(cls, task_id: str, status: str) -> dict:
        if cls._use_supabase:
            cls._sb().table('follow_up_tasks').update({'status': status}).eq('id', task_id).execute()
        else:
            with cls._tx() as cur:
                cur.execute("UPDATE follow_up_tasks SET status = ? WHERE id = ?", (status, task_id))
        return cls.get_followup(task_id)

    # ══════════════════════════════════════════════════════════════════
    # Guidance resources
    # ══════════════════════════════════════════════════════════════════

    @classmethod
    def get_resources(cls, category: str = None) -> list:
        if cls._use_supabase:
            q = cls._sb().table('guidance_resources').select('*')
            if category and category != 'All':
                q = q.eq('category', category)
            return q.order('created_at', desc=True).execute().data or []
        if category and category != 'All':
            return cls._query("SELECT * FROM guidance_resources WHERE category = ? ORDER BY created_at DESC, id", (category,))
        return cls._query("SELECT * FROM guidance_resources ORDER BY created_at DESC, id")

    # ══════════════════════════════════════════════════════════════════
    # Announcements
    # ══════════════════════════════════════════════════════════════════

    @classmethod
    def get_announcements(cls, audiences: list = None) -> list:
        """audiences=None returns everything (admin); otherwise only those target audiences."""
        if cls._use_supabase:
            q = cls._sb().table('announcements').select('*')
            if audiences:
                q = q.in_('target_audience', audiences)
            rows = q.order('is_pinned', desc=True).order('created_at', desc=True).execute().data or []
            ids = list({r['author_id'] for r in rows if r.get('author_id')})
            names = {u['id']: u['name'] for u in (cls._sb().table('users').select('id, name').in_('id', ids).execute().data or [])} if ids else {}
            for r in rows:
                r['authorName'] = names.get(r.get('author_id'), 'BCC Guidance Office')
        else:
            query = "SELECT a.*, COALESCE(u.name, 'BCC Guidance Office') AS authorName FROM announcements a LEFT JOIN users u ON a.author_id = u.id"
            params = []
            if audiences:
                query += f" WHERE a.target_audience IN ({', '.join('?' * len(audiences))})"
                params = list(audiences)
            rows = cls._query(query + " ORDER BY a.is_pinned DESC, a.created_at DESC", params)
        for r in rows:
            r['is_pinned'] = bool(r.get('is_pinned'))
            r['targetAudience'] = r.get('target_audience') or 'All'
        return rows

    @classmethod
    def get_announcement(cls, ann_id: str) -> dict:
        if cls._use_supabase:
            res = cls._sb().table('announcements').select('*').eq('id', ann_id).execute()
            return res.data[0] if res.data else None
        return cls._query_one("SELECT * FROM announcements WHERE id = ?", (ann_id,))

    @classmethod
    def save_announcement(cls, data: dict) -> dict:
        """Creates an announcement, or updates it when data['id'] names an existing one."""
        record = {
            'id': data.get('id') or cls.new_id('ann'),
            'author_id': data['author_id'],
            'title': data['title'],
            'content': data['content'],
            'category': data.get('category') or 'General Notice',
            'target_audience': data.get('target_audience') or 'All',
            'is_pinned': bool(data.get('is_pinned'))
        }
        if cls._use_supabase:
            cls._sb().table('announcements').upsert(record).execute()
        else:
            record['is_pinned'] = 1 if record['is_pinned'] else 0
            updates = ', '.join(f"{k} = excluded.{k}" for k in record if k not in ('id', 'author_id'))
            with cls._tx() as cur:
                cur.execute(f"INSERT INTO announcements ({', '.join(record)}) VALUES ({', '.join('?' * len(record))}) "
                            f"ON CONFLICT(id) DO UPDATE SET {updates}", tuple(record.values()))
        return cls.get_announcement(record['id'])

    @classmethod
    def delete_announcement(cls, ann_id: str):
        if cls._use_supabase:
            cls._sb().table('announcements').delete().eq('id', ann_id).execute()
            return
        with cls._tx() as cur:
            cur.execute("DELETE FROM announcements WHERE id = ?", (ann_id,))

    # ══════════════════════════════════════════════════════════════════
    # Notifications
    # ══════════════════════════════════════════════════════════════════

    @classmethod
    def create_notification(cls, recipient_id: str, title: str, message: str, ntype: str = 'info', link: str = None):
        row = {'id': cls.new_id('notif'), 'recipient_id': recipient_id, 'title': title, 'message': message, 'type': ntype, 'link': link}
        try:
            if cls._use_supabase:
                cls._sb().table('notifications').insert(row).execute()
            else:
                with cls._tx() as cur:
                    cur.execute("INSERT INTO notifications (id, recipient_id, title, message, type, link) VALUES (?, ?, ?, ?, ?, ?)",
                                tuple(row.values()))
        except Exception as e:
            # A failed notification must never undo the action that triggered it
            print(f"[DB] notification not saved: {e}")

    @classmethod
    def get_notifications(cls, user_id: str, limit: int = 30) -> list:
        if cls._use_supabase:
            rows = cls._sb().table('notifications').select('*').eq('recipient_id', user_id).order('created_at', desc=True).limit(limit).execute().data or []
        else:
            rows = cls._query("SELECT * FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT ?", (user_id, limit))
        for r in rows:
            r['is_read'] = bool(r.get('is_read'))
        return rows

    @classmethod
    def mark_notification_read(cls, notif_id: str, user_id: str):
        if cls._use_supabase:
            cls._sb().table('notifications').update({'is_read': True}).eq('id', notif_id).eq('recipient_id', user_id).execute()
            return
        with cls._tx() as cur:
            cur.execute("UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient_id = ?", (notif_id, user_id))

    @classmethod
    def mark_all_notifications_read(cls, user_id: str):
        if cls._use_supabase:
            cls._sb().table('notifications').update({'is_read': True}).eq('recipient_id', user_id).execute()
            return
        with cls._tx() as cur:
            cur.execute("UPDATE notifications SET is_read = 1 WHERE recipient_id = ?", (user_id,))

    # ══════════════════════════════════════════════════════════════════
    # Audit logs
    # ══════════════════════════════════════════════════════════════════

    @classmethod
    def add_audit_log(cls, user_id: str, user_name: str, action: str, details: str, ip: str = None):
        row = {'id': cls.new_id('log'), 'user_id': user_id, 'user_name': user_name or 'System',
               'action': action, 'details': details, 'ip_address': ip}
        try:
            if cls._use_supabase:
                cls._sb().table('audit_logs').insert(row).execute()
            else:
                with cls._tx() as cur:
                    cur.execute("INSERT INTO audit_logs (id, user_id, user_name, action, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)",
                                tuple(row.values()))
        except Exception as e:
            print(f"[DB] audit log not saved: {e}")

    @classmethod
    def get_audit_logs(cls, limit: int = 200) -> list:
        if cls._use_supabase:
            rows = cls._sb().table('audit_logs').select('*').order('created_at', desc=True).limit(limit).execute().data or []
        else:
            rows = cls._query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?", (limit,))
        for r in rows:
            r['timestamp'] = r.get('created_at', '')
            r['userName'] = r.get('user_name', '')
        return rows

    # ══════════════════════════════════════════════════════════════════
    # System settings
    # ══════════════════════════════════════════════════════════════════

    SETTING_DEFAULTS = {
        'system_name': ('SYSTEM_NAME', 'Buenavista Community College Guidance System'),
        'lead_time_hours': ('MIN_BOOKING_LEAD_HOURS', '12'),
        'cancellation_window_hours': ('CANCELLATION_CUTOFF_HOURS', '4'),
        'operating_hours': (None, '8:00 AM – 5:00 PM (Mon–Fri)'),
        'max_advance_booking_days': ('MAX_ADVANCE_BOOKING_DAYS', '14'),
        'max_active_appointments_per_student': ('MAX_ACTIVE_APPOINTMENTS_PER_STUDENT', '2'),
    }

    @classmethod
    def get_settings(cls) -> dict:
        if cls._use_supabase:
            rows = cls._sb().table('system_settings').select('setting_key, setting_value').execute().data or []
        else:
            rows = cls._query("SELECT setting_key, setting_value FROM system_settings")
        raw = {r['setting_key']: r['setting_value'] for r in rows}
        # New keys win; the older upper-case seed keys are read as a fallback
        return {key: raw.get(key) or (raw.get(legacy) if legacy else None) or default
                for key, (legacy, default) in cls.SETTING_DEFAULTS.items()}

    @classmethod
    def save_system_settings(cls, settings_dict: dict) -> dict:
        if cls._use_supabase:
            for k, v in settings_dict.items():
                cls._sb().table('system_settings').upsert(
                    {'id': cls.new_id('set'), 'setting_key': k, 'setting_value': str(v)}, on_conflict='setting_key').execute()
            return cls.get_settings()
        with cls._tx() as cur:
            for k, v in settings_dict.items():
                cur.execute("""
                    INSERT INTO system_settings (id, setting_key, setting_value, updated_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = CURRENT_TIMESTAMP
                """, (cls.new_id('set'), k, str(v)))
        return cls.get_settings()
