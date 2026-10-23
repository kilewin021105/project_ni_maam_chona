-- ================================================================================
-- BUENAVISTA COMMUNITY COLLEGE (BCC), BOHOL
-- Center for Student Development & Guidance Services
-- Seed Data for Supabase (PostgreSQL)
-- All accounts use demo password: password123
-- ================================================================================

-- 1. SEED USERS
INSERT INTO users (id, email, password_hash, name, role, avatar_initial, status, phone) VALUES
('usr-std-1', 'juan.delacruz@buenavista.edu.ph', '$2b$12$NGF0wrv4f4LmLJFAP1xmsuZQiHYeMnKB4fzTO527XFFc/1kKerAve', 'Juan Dela Cruz', 'student', 'JD', 'active', '0917-555-0192'),
('usr-std-2', 'angelica.ramos@buenavista.edu.ph', '$2b$12$NGF0wrv4f4LmLJFAP1xmsuZQiHYeMnKB4fzTO527XFFc/1kKerAve', 'Angelica Ramos', 'student', 'AR', 'active', '0918-555-0143'),
('usr-std-3', 'mark.reyes@buenavista.edu.ph', '$2b$12$NGF0wrv4f4LmLJFAP1xmsuZQiHYeMnKB4fzTO527XFFc/1kKerAve', 'Mark Anthony Reyes', 'student', 'MR', 'active', '0922-555-0188'),

('usr-cns-1', 'msantos.guidance@buenavista.edu.ph', '$2b$12$NGF0wrv4f4LmLJFAP1xmsuZQiHYeMnKB4fzTO527XFFc/1kKerAve', 'Dr. Maria Santos, RGC, PhD', 'counselor', 'MS', 'active', '0919-555-0101'),
('usr-cns-2', 'rrivera.guidance@buenavista.edu.ph', '$2b$12$NGF0wrv4f4LmLJFAP1xmsuZQiHYeMnKB4fzTO527XFFc/1kKerAve', 'Prof. Robert Rivera, RGC, MAEd', 'counselor', 'RR', 'active', '0919-555-0102'),
('usr-cns-3', 'ecastillo.guidance@buenavista.edu.ph', '$2b$12$NGF0wrv4f4LmLJFAP1xmsuZQiHYeMnKB4fzTO527XFFc/1kKerAve', 'Ms. Elena Castillo, RPm, RGC', 'counselor', 'EC', 'active', '0919-555-0103'),

('usr-adm-1', 'admin.guidance@buenavista.edu.ph', '$2b$12$NGF0wrv4f4LmLJFAP1xmsuZQiHYeMnKB4fzTO527XFFc/1kKerAve', 'Director Lourdes Mendoza', 'admin', 'LM', 'active', '0917-555-0100')
ON CONFLICT (id) DO NOTHING;

-- 2. SEED STUDENT PROFILES
INSERT INTO student_profiles (id, user_id, student_id_number, course, year_section, emergency_contact) VALUES
('prof-std-1', 'usr-std-1', 'BCC-2023-01048', 'BSIT', '3A', 'Maria Dela Cruz (Mother) - 0917-000-1111'),
('prof-std-2', 'usr-std-2', 'BCC-2023-01892', 'BSIT', '2B', 'Eduardo Ramos (Father) - 0918-000-2222'),
('prof-std-3', 'usr-std-3', 'BCC-2024-00431', 'BSHM', '1A', 'Teresa Reyes (Mother) - 0922-000-3333')
ON CONFLICT (id) DO NOTHING;

-- 3. SEED COUNSELOR PROFILES
INSERT INTO counselor_profiles (id, user_id, title, room, specialization, max_daily_appointments, bio) VALUES
('prof-cns-1', 'usr-cns-1', 'Registered Guidance Counselor & Mental Health Specialist', 'Guidance Office Rm 204', 'Personal, Emotional & Psychological First Aid', 8, 'Over 12 years of clinical counseling and student crisis intervention experience.'),
('prof-cns-2', 'usr-cns-2', 'Guidance Counselor & BSIT Department Liaison', 'Guidance Office Rm 205', 'Academic Progression, Career Guidance & Stress Management', 8, 'Specializes in student retention, academic probation counseling, and career transitions.'),
('prof-cns-3', 'usr-cns-3', 'Guidance Counselor & Psychometrician', 'Guidance Office Rm 206', 'Psychological Assessment & Grievance Facilitation', 8, 'Expert in standardized psychometric assessments and conflict mediation.')
ON CONFLICT (id) DO NOTHING;

-- 4. SEED GUIDANCE SERVICES
INSERT INTO guidance_services (id, code, title, description, category, duration_minutes, icon, confidentiality_level, is_active) VALUES
('srv-1', 'IND-COUN', 'Individual Counseling', 'One-on-one confidential counseling addressing personal, psychological, emotional, or social difficulties.', 'Counseling', 45, 'heart', 'Strictly Confidential', true),
('srv-2', 'ACAD-ADV', 'Academic Advising & Support', 'Assistance with study habits, time management, subject backlogs, and academic probation recovery.', 'Academic', 45, 'book-open', 'Confidential', true),
('srv-3', 'CAR-COAL', 'Career Counseling & Placement', 'Professional guidance on career development, OJT readiness, job placement, and career transition.', 'Career', 60, 'compass', 'Standard', true),
('srv-4', 'CRISIS-INT', 'Crisis Intervention & Psychological First Aid', 'Immediate assistance and psychological support for acute distress, grief, or personal emergencies.', 'Emergency', 30, 'shield', 'Urgent Confidential', true),
('srv-5', 'PEER-FAC', 'Peer Facilitation & Mediation', 'Conflict mediation between classmates, roommates, or campus student organizations.', 'Mediation', 45, 'users', 'Confidential', true),
('srv-6', 'PSYCH-ASS', 'Psychological Assessment & Testing', 'Standardized psychological appraisals, personality inventories, and mental wellness screeners.', 'Assessment', 60, 'file-text', 'Strictly Confidential', true)
ON CONFLICT (id) DO NOTHING;

-- 5. SEED COUNSELOR AVAILABILITY
INSERT INTO counselor_availability (id, counselor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_available) VALUES
('av-1-1', 'usr-cns-1', 1, '08:00:00', '17:00:00', 45, true),
('av-1-2', 'usr-cns-1', 2, '08:00:00', '17:00:00', 45, true),
('av-1-3', 'usr-cns-1', 3, '08:00:00', '17:00:00', 45, true),
('av-1-4', 'usr-cns-1', 4, '08:00:00', '17:00:00', 45, true),
('av-1-5', 'usr-cns-1', 5, '08:00:00', '17:00:00', 45, true),
('av-2-1', 'usr-cns-2', 1, '08:00:00', '17:00:00', 45, true),
('av-2-2', 'usr-cns-2', 2, '08:00:00', '17:00:00', 45, true),
('av-2-3', 'usr-cns-2', 3, '08:00:00', '17:00:00', 45, true),
('av-2-4', 'usr-cns-2', 4, '08:00:00', '17:00:00', 45, true),
('av-2-5', 'usr-cns-2', 5, '08:00:00', '17:00:00', 45, true)
ON CONFLICT (id) DO NOTHING;

-- 6. SEED APPOINTMENTS
INSERT INTO appointments (id, reference_code, student_id, counselor_id, service_id, date, time_slot, modality, urgency, reason, status, location_or_link) VALUES
('apt-1', 'BCC-APT-20260820-001', 'usr-std-1', 'usr-cns-1', 'srv-1', '2026-08-20', '1:00 PM', 'In-Person', 'Routine', 'Seeking guidance regarding exam stress and heavy academic workload.', 'Approved', 'Guidance Office Rm 204'),
('apt-2', 'BCC-APT-20260821-002', 'usr-std-2', 'usr-cns-2', 'srv-2', '2026-08-21', '10:00 AM', 'In-Person', 'Routine', 'Consultation regarding study habit adjustments for major computing subjects.', 'Pending', 'Guidance Office Rm 205'),
('apt-3', 'BCC-APT-20260810-003', 'usr-std-1', 'usr-cns-1', 'srv-3', '2026-08-10', '2:00 PM', 'Online (Google Meet)', 'Routine', 'OJT placement and industry internship preparation consultation.', 'Completed', 'meet.google.com/bcc-guidance-001'),
('apt-4', 'BCC-APT-20260815-004', 'usr-std-3', 'usr-cns-3', 'srv-1', '2026-08-15', '9:00 AM', 'In-Person', 'Routine', 'Initial consultation regarding college adjustment and transition from senior high.', 'Cancelled', 'Guidance Office Rm 206')
ON CONFLICT (id) DO NOTHING;

-- 7. SEED CONFIDENTIAL CLINICAL NOTES
INSERT INTO counseling_session_records (id, appointment_id, student_id, counselor_id, session_date, session_duration_minutes, case_category, subjective, objective, assessment, plan, confidentiality_level, status) VALUES
('note-1', 'apt-3', 'usr-std-1', 'usr-cns-1', '2026-08-10', 45, 'Career Consultation', 
 'Student expressed uncertainty regarding career trajectory in web software development versus networking.',
 'Client arrived on time, was articulate and showed high motivation to improve technical portfolio.',
 'Mild career-related stress typical of 3rd year transition. Good coping mechanisms evident.',
 'Recommended participating in BCC tech workshops. Scheduled follow-up session for resume review.',
 'Strictly Confidential', 'Confidential')
ON CONFLICT (id) DO NOTHING;

-- 8. SEED GUIDANCE RESOURCES (Section 5.8)
INSERT INTO guidance_resources (id, title, category, description, content, target_program) VALUES
('res-1', 'Time Management & Academic Success Guide', 'Study Skills', 'Master course workloads, prioritize assignments using the Eisenhower Matrix, and eliminate procrastination.', 'Time management is essential for collegiate success at Buenavista Community College. 1. Use the Eisenhower Matrix: categorize tasks by urgency and importance. 2. Adopt the Pomodoro Technique: study in 25-minute focused blocks followed by 5-minute rests. 3. Audit your weekly hours: balance lecture, lab work, study time, and rest. 4. Visit BCC Guidance Office (Room 204) for individual academic habit planning.', 'All'),
('res-2', 'Managing College Stress & Exam Anxiety', 'Mental Wellness', 'Practical coping strategies, grounding techniques, and 4-7-8 breathing exercises to conquer academic pressure.', 'College life brings new challenges that can trigger acute stress. 1. Recognize somatic symptoms: elevated heart rate, muscle tension, and insomnia. 2. Practice 4-7-8 diaphragmatic breathing: inhale for 4 seconds, hold for 7, exhale slowly for 8. 3. Avoid excessive caffeine right before examinations. 4. If feelings of overwhelm persist, schedule a confidential counseling appointment at the Guidance Office.', 'All'),
('res-3', 'Career Pathway & Internship (OJT) Readiness Checklist', 'Career Guidance', 'Essential preparation checklist for students preparing for on-the-job training (OJT) and industry practicum.', 'Preparing for industry placement requires proactive groundwork: 1. Ensure all prerequisite academic clearances and MOAs are completed. 2. Draft an industry-standard resume highlighting coursework projects and technical competencies. 3. Obtain necessary medical certificates and insurance requirements. 4. Consult your assigned counselor for mock behavioral interviews and workplace ethics orientation.', 'All'),
('res-4', 'Hospitality & Tourism Professional Etiquette Handbook', 'Career Guidance', 'Standard operating guidelines on guest interaction, customer delight, intercultural sensitivity, and grooming.', 'For BSHM and BSTM majors, hospitality excellence begins with daily discipline: 1. Maintain immaculate personal grooming and uniform standards. 2. Master active listening and empathetic dialogue during guest inquiries. 3. Apply the HEAT model (Hear, Empathize, Apologize, Take Action) for conflict resolution. 4. Respect cultural nuances when serving international and domestic guests.', 'BSHM & BSTM'),
('res-5', 'Effective Study Habits & Active Recall Strategies', 'Study Skills', 'Replace passive re-reading with active recall, spaced repetition, and the Feynman technique to boost retention.', 'Passive reading creates an illusion of competence. 1. Active Recall: test yourself after every chapter by closing the book and writing down core concepts. 2. Spaced Repetition: review material on day 1, day 3, day 7, and day 21 before exams. 3. Feynman Technique: explain complex programming algorithms, accounting equations, or criminology procedures in simple terms as if teaching a beginner.', 'All'),
('res-6', 'College Adjustment & Freshmen Transition Toolkit', 'Study Skills', 'Navigating independence, college social circles, campus resources, and overcoming freshmen imposter syndrome.', 'Transitioning from senior high school to BCC college life is a major life milestone. 1. Familiarize yourself with BCC campus offices: Registrar, Guidance, Library, Dean''s Office, and Clinic. 2. Establish a healthy social circle through student clubs and academic study groups. 3. Recognize that feeling overwhelmed early on is normal—reach out to peer facilitators and guidance staff whenever you need guidance.', '1st Year Students'),
('res-7', 'Resume Writing & Professional Portfolio Mastery', 'Career Guidance', 'Step-by-step guide to crafting an impactful 1-page modern resume, LinkedIn profile, and digital portfolio.', 'Your resume is your personal marketing document: 1. Stick to a clean, reverse-chronological single-page format. 2. Use action verbs and metric-driven accomplishments. 3. Tailor keywords to the specific job description. 4. Have your resume reviewed at the BCC Guidance Center before submitting to internship partners.', '3rd & 4th Year Students'),
('res-8', 'Acing Job & Internship Behavioral Interviews', 'Career Guidance', 'Master the STAR method (Situation, Task, Action, Result) to confidently answer challenging interview questions.', 'Employers evaluate not just technical skills, but soft skills and emotional resilience: 1. Structure your answers using STAR (Situation, Task, Action, Result). 2. Prepare 3 core stories showcasing teamwork, leadership, and conflict resolution. 3. Research the company or agency thoroughly beforehand. 4. Prepare insightful questions to ask the interviewer at the end of the conversation.', 'Graduating Students'),
('res-9', 'Emotional Resilience & Mindfulness for College Students', 'Mental Wellness', 'Cultivating psychological strength, cognitive reframing, and daily mindfulness practices for academic challenges.', 'Resilience is the ability to bounce back from academic setbacks, failed quizzes, and interpersonal disappointments: 1. Practice cognitive reframing: view failures as data for improvement rather than personal flaws. 2. Grounding Exercise (5-4-3-2-1): Notice 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. 3. Maintain gratitude journaling and positive self-talk.', 'All'),
('res-10', 'Personal Development, Goal Setting & Self-Leadership', 'Mental Wellness', 'Establishing SMART goals, building personal integrity, and cultivating healthy self-discipline in college.', 'Becoming a successful professional requires conscious personal development: 1. Formulate SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound). 2. Align your daily habits with your long-term life vision. 3. Practice digital detox during exam periods. 4. Treat yourself and your peers with mutual respect, empathy, and constructive communication.', 'All'),
('res-11', 'BCC Guidance & Counseling Support Directory & Rights', 'Mental Wellness', 'Your guide to counseling rights, confidentiality protections under RA 9258, and guidance office services.', 'The Center for Student Development & Guidance Services is committed to safeguarding student welfare: 1. Confidentiality Pledge: Sessions are protected by RA 9258 (Guidance and Counseling Act of 2004) and RA 10173 (Data Privacy Act of 2012). 2. How to book: Use the BCC online booking portal or visit Room 204. 3. Emergency walk-ins are accommodated for urgent mental health distress. You are never alone.', 'All Students'),
('res-12', 'Digital Wellness & Healthy Screen-Time Boundaries', 'Study Skills', 'Combatting digital fatigue, late-night screen addiction, and maintaining eye health during heavy computer coursework.', 'With extensive screen time required for programming, research, and online study, digital wellness is critical: 1. Apply the 20-20-20 rule: Every 20 minutes, look at an object 20 feet away for at least 20 seconds. 2. Turn off non-essential notifications during study blocks. 3. Establish a blue-light curfew at least 45 minutes before sleep. 4. Incorporate daily physical stretching and outdoor breaks.', 'BSIT & All Programs')
ON CONFLICT (id) DO NOTHING;

-- 9. SEED ANNOUNCEMENTS
INSERT INTO announcements (id, author_id, title, content, category, target_audience, is_pinned) VALUES
('ann-1', 'usr-adm-1', 'Welcome to 1st Semester A.Y. 2026-2027 Guidance Services', 'The Center for Student Development & Guidance Services is now fully open for student consultations, mental wellness counseling, and academic support.', 'General Notice', 'All', true),
('ann-2', 'usr-adm-1', 'Guidance Awareness Month & Free Mental Wellness Screeners', 'Join us every Wednesday this month for open counseling hours and stress management workshops in Room 204.', 'Event', 'Students', false)
ON CONFLICT (id) DO NOTHING;

-- 10. SEED SYSTEM SETTINGS
INSERT INTO system_settings (id, setting_key, setting_value, description) VALUES
('set-1', 'MIN_BOOKING_LEAD_HOURS', '24', 'Minimum advance notice required in hours before booking an appointment.'),
('set-2', 'MAX_ADVANCE_BOOKING_DAYS', '14', 'Maximum days in advance a student can book an appointment.'),
('set-3', 'CANCELLATION_CUTOFF_HOURS', '4', 'Hours before the appointment after which student self-cancellation is restricted.'),
('set-4', 'MAX_ACTIVE_APPOINTMENTS_PER_STUDENT', '2', 'Maximum concurrent active appointments allowed per student account.')
ON CONFLICT (id) DO NOTHING;
