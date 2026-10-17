/**
 * Buenavista Community College — Guidance Appointment System
 * Seed Data for Buenavista Community College (BCC), Bohol
 */

const SEED_DATA = {
  school: {
    name: 'Buenavista Community College',
    shortName: 'BCC',
    department: 'College of Computer Studies & Information Technology',
    office: 'Center for Student Development & Guidance Services',
    location: '2nd Floor, Main Building, BCC Campus, Buenavista, Bohol',
    contactEmail: 'guidance@buenavista.edu.ph',
    contactPhone: '(038) 510-1234 / 0919-876-5432',
    officeHours: 'Monday to Friday: 8:00 AM - 5:00 PM'
  },

  programs: [
    { code: 'BSIT', name: 'Bachelor of Science in Information Technology' },
    { code: 'BSHM', name: 'Bachelor of Science in Hospitality Management' },
    { code: 'BSTM', name: 'Bachelor of Science in Tourism Management' },
    { code: 'BSCRIM', name: 'Bachelor of Science in Criminal Justice' },
    { code: 'BSED', name: 'Bachelor of Secondary Education' },
    { code: 'BEED', name: 'Bachelor of Elementary Education' }
  ],

  users: [
    {
      id: 'usr-student-1',
      username: 'juan.delacruz@buenavista.edu.ph',
      password: 'password123',
      role: 'student',
      name: 'Juan Dela Cruz',
      studentId: 'BCC-2023-01048',
      course: 'BSIT',
      yearSection: '3A',
      email: 'juan.delacruz@buenavista.edu.ph',
      phone: '0917-555-0192',
      emergencyContact: 'Maria Dela Cruz (Mother) - 0918-555-0144',
      avatarInitial: 'JD',
      status: 'active',
      createdAt: '2026-01-10T08:00:00.000Z'
    },
    {
      id: 'usr-student-2',
      username: 'angelica.ramos@buenavista.edu.ph',
      password: 'password123',
      role: 'student',
      name: 'Angelica Ramos',
      studentId: 'BCC-2023-01892',
      course: 'BSIT',
      yearSection: '2B',
      email: 'angelica.ramos@buenavista.edu.ph',
      phone: '0918-555-0188',
      emergencyContact: 'Roberto Ramos (Father) - 0919-555-0122',
      avatarInitial: 'AR',
      status: 'active',
      createdAt: '2026-01-15T09:30:00.000Z'
    },
    {
      id: 'usr-student-3',
      username: 'mark.reyes@buenavista.edu.ph',
      password: 'password123',
      role: 'student',
      name: 'Mark Anthony Reyes',
      studentId: 'BCC-2024-00431',
      course: 'BSHM',
      yearSection: '1A',
      email: 'mark.reyes@buenavista.edu.ph',
      phone: '0920-555-0177',
      emergencyContact: 'Teresa Reyes (Mother) - 0921-555-0199',
      avatarInitial: 'MR',
      status: 'active',
      createdAt: '2026-02-01T10:00:00.000Z'
    },
    {
      id: 'usr-counselor-1',
      username: 'msantos.guidance@buenavista.edu.ph',
      password: 'password123',
      role: 'counselor',
      counselorId: 'cns-1',
      name: 'Dr. Maria Santos, RGC, PhD',
      title: 'Registered Guidance Counselor & Mental Health Specialist',
      email: 'msantos.guidance@buenavista.edu.ph',
      phone: '0917-888-0011',
      room: 'Guidance Office Rm 204',
      specialization: 'Personal, Emotional & Psychological First Aid',
      avatarInitial: 'MS',
      status: 'active',
      createdAt: '2025-08-01T08:00:00.000Z'
    },
    {
      id: 'usr-counselor-2',
      username: 'rrivera.guidance@buenavista.edu.ph',
      password: 'password123',
      role: 'counselor',
      counselorId: 'cns-2',
      name: 'Prof. Robert Rivera, RGC, MAEd',
      title: 'Guidance Counselor & BSIT Department Liaison',
      email: 'rrivera.guidance@buenavista.edu.ph',
      phone: '0917-888-0022',
      room: 'Guidance Office Rm 205',
      specialization: 'Academic Progression, Career Guidance & Stress Management',
      avatarInitial: 'RR',
      status: 'active',
      createdAt: '2025-08-01T08:00:00.000Z'
    },
    {
      id: 'usr-counselor-3',
      username: 'ecastillo.guidance@buenavista.edu.ph',
      password: 'password123',
      role: 'counselor',
      counselorId: 'cns-3',
      name: 'Ms. Elena Castillo, RPm, RGC',
      title: 'Guidance Counselor & Psychometrician',
      email: 'ecastillo.guidance@buenavista.edu.ph',
      phone: '0917-888-0033',
      room: 'Guidance Office Rm 206',
      specialization: 'Psychological Assessment & Grievance Facilitation',
      avatarInitial: 'EC',
      status: 'active',
      createdAt: '2025-09-01T08:00:00.000Z'
    },
    {
      id: 'usr-admin-1',
      username: 'admin.guidance@buenavista.edu.ph',
      password: 'password123',
      role: 'admin',
      name: 'Director Lourdes Mendoza',
      title: 'Director of Guidance & Student Services',
      email: 'admin.guidance@buenavista.edu.ph',
      phone: '0917-999-0000',
      avatarInitial: 'LM',
      status: 'active',
      createdAt: '2025-06-01T08:00:00.000Z'
    }
  ],

  services: [
    {
      id: 'srv-1',
      code: 'ACAD',
      title: 'Academic Counseling & Study Skills',
      category: 'Academic',
      durationMinutes: 45,
      description: 'Guidance on academic difficulty, study habits, time management, subject backlogs, and performance improvement strategies.',
      icon: 'book-open',
      assignedCounselorIds: ['cns-1', 'cns-2'],
      isActive: true
    },
    {
      id: 'srv-2',
      code: 'CAREER',
      title: 'Career Guidance & Internship Coaching',
      category: 'Career',
      durationMinutes: 60,
      description: 'Career path exploration, BSIT specialization coaching (Software, Networking, Cybersecurity), mock interview prep, and industry transitions.',
      icon: 'clipboard',
      assignedCounselorIds: ['cns-2'],
      isActive: true
    },
    {
      id: 'srv-3',
      code: 'PERS',
      title: 'Personal & Emotional Support',
      category: 'Mental Health',
      durationMinutes: 50,
      description: 'Confidential space to discuss family concerns, relationship issues, anxiety, grief, identity, adjustment difficulties, and emotional well-being.',
      icon: 'heart',
      assignedCounselorIds: ['cns-1', 'cns-3'],
      isActive: true
    },
    {
      id: 'srv-4',
      code: 'PFA',
      title: 'Psychological First Aid & Urgent Care',
      category: 'Mental Health',
      durationMinutes: 60,
      description: 'Immediate supportive intervention for students experiencing acute stress, panic episodes, overwhelming trauma, or mental health emergencies.',
      icon: 'shield',
      assignedCounselorIds: ['cns-1', 'cns-3'],
      isActive: true
    },
    {
      id: 'srv-5',
      code: 'ROUTINE',
      title: 'Routine Interview & Student Profiling',
      category: 'General',
      durationMinutes: 30,
      description: 'Standard periodic developmental check-in and inventory for freshmen, transferees, and continuing BSIT students.',
      icon: 'user',
      assignedCounselorIds: ['cns-1', 'cns-2', 'cns-3'],
      isActive: true
    },
    {
      id: 'srv-6',
      code: 'EXIT',
      title: 'Exit Interview & Clearance',
      category: 'General',
      durationMinutes: 30,
      description: 'Mandatory guidance interview for graduating students or students processing transfer credentials and clearance.',
      icon: 'check-circle',
      assignedCounselorIds: ['cns-2', 'cns-3'],
      isActive: true
    },
    {
      id: 'srv-7',
      code: 'GRIEV',
      title: 'Grievance Consultation & Conflict Resolution',
      category: 'Interpersonal',
      durationMinutes: 45,
      description: 'Mediation and consultation for peer disputes, classroom conflicts, or student-faculty interpersonal difficulties.',
      icon: 'messageSquare',
      assignedCounselorIds: ['cns-1', 'cns-3'],
      isActive: true
    }
  ],

  counselors: [
    {
      id: 'cns-1',
      userId: 'usr-counselor-1',
      name: 'Dr. Maria Santos, RGC, PhD',
      title: 'Registered Guidance Counselor',
      email: 'msantos.guidance@buenavista.edu.ph',
      room: 'Guidance Office Rm 204, BCC Main Bldg',
      specializations: ['Personal Counseling', 'Psychological First Aid', 'Anxiety & Stress'],
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      slotsPerDay: ['09:00 AM', '10:00 AM', '11:00 AM', '01:30 PM', '02:30 PM', '03:30 PM'],
      bio: 'Over 12 years of clinical counseling experience supporting BCC students through holistic mental health wellness and compassionate guidance.',
      maxDailyAppointments: 5,
      isActive: true
    },
    {
      id: 'cns-2',
      userId: 'usr-counselor-2',
      name: 'Prof. Robert Rivera, RGC, MAEd',
      title: 'Guidance Counselor - BSIT Liaison',
      email: 'rrivera.guidance@buenavista.edu.ph',
      room: 'Guidance Office Rm 205, BCC Main Bldg',
      specializations: ['Academic Advisory', 'BSIT Career Development', 'Time Management'],
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      slotsPerDay: ['08:30 AM', '09:30 AM', '10:30 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'],
      bio: 'Specialized in technological career coaching and student retention strategies for BSIT students at BCC Bohol.',
      maxDailyAppointments: 6,
      isActive: true
    },
    {
      id: 'cns-3',
      userId: 'usr-counselor-3',
      name: 'Ms. Elena Castillo, RPm, RGC',
      title: 'Counselor & Psychometrician',
      email: 'ecastillo.guidance@buenavista.edu.ph',
      room: 'Guidance Office Rm 206, BCC Main Bldg',
      specializations: ['Psychological Testing', 'Grievance Mediation', 'Freshman Adjustment'],
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      slotsPerDay: ['09:00 AM', '10:00 AM', '11:00 AM', '01:30 PM', '02:30 PM', '03:30 PM'],
      bio: 'Registered Psychometrician dedicated to ethical student assessment, conflict mediation, and developmental guidance.',
      maxDailyAppointments: 5,
      isActive: true
    }
  ],

  appointments: [
    {
      id: 'apt-101',
      referenceCode: 'BCC-APT-2026-00101',
      studentId: 'usr-student-1',
      studentName: 'Juan Dela Cruz',
      studentNumber: 'BCC-2023-01048',
      courseYear: 'BSIT - 3A',
      studentEmail: 'juan.delacruz@buenavista.edu.ph',
      counselorId: 'cns-2',
      counselorName: 'Prof. Robert Rivera, RGC, MAEd',
      serviceId: 'srv-2',
      serviceTitle: 'Career Guidance & Internship Coaching',
      modality: 'In-Person',
      location: 'Guidance Office Rm 205, BCC Main Bldg',
      date: '2026-09-24',
      timeSlot: '02:00 PM',
      durationMinutes: 60,
      urgency: 'Routine',
      reason: 'Need advice regarding choosing between Software Engineering vs Network Administration track for 4th year capstone and OJT internship applications.',
      status: 'Approved',
      counselorNotes: 'Approved. Please bring a copy of your unofficial transcript and draft resume.',
      createdAt: '2026-09-18T09:15:00.000Z',
      updatedAt: '2026-09-18T11:20:00.000Z'
    },
    {
      id: 'apt-102',
      referenceCode: 'BCC-APT-2026-00102',
      studentId: 'usr-student-1',
      studentName: 'Juan Dela Cruz',
      studentNumber: 'BCC-2023-01048',
      courseYear: 'BSIT - 3A',
      studentEmail: 'juan.delacruz@buenavista.edu.ph',
      counselorId: 'cns-1',
      counselorName: 'Dr. Maria Santos, RGC, PhD',
      serviceId: 'srv-1',
      serviceTitle: 'Academic Counseling & Study Skills',
      modality: 'In-Person',
      location: 'Guidance Office Rm 204',
      date: '2026-09-10',
      timeSlot: '10:00 AM',
      durationMinutes: 45,
      urgency: 'Routine',
      reason: 'Feeling overwhelmed balancing midterms and programming project deadlines.',
      status: 'Completed',
      counselorNotes: 'Session successfully conducted. Student formulated a weekly time-blocking schedule.',
      sessionNoteId: 'note-201',
      createdAt: '2026-09-05T14:30:00.000Z',
      updatedAt: '2026-09-10T11:00:00.000Z'
    },
    {
      id: 'apt-103',
      referenceCode: 'BCC-APT-2026-00103',
      studentId: 'usr-student-2',
      studentName: 'Angelica Ramos',
      studentNumber: 'BCC-2023-01892',
      courseYear: 'BSIT - 2B',
      studentEmail: 'angelica.ramos@buenavista.edu.ph',
      counselorId: 'cns-1',
      counselorName: 'Dr. Maria Santos, RGC, PhD',
      serviceId: 'srv-3',
      serviceTitle: 'Personal & Emotional Support',
      modality: 'Online Video Consultation',
      meetingLink: 'https://meet.google.com/bcc-guidance-conf',
      date: '2026-09-23',
      timeSlot: '01:30 PM',
      durationMinutes: 50,
      urgency: 'Urgent',
      reason: 'Dealing with personal family circumstances that are affecting school focus.',
      status: 'Pending',
      counselorNotes: '',
      createdAt: '2026-09-19T16:00:00.000Z',
      updatedAt: '2026-09-19T16:00:00.000Z'
    },
    {
      id: 'apt-104',
      referenceCode: 'BCC-APT-2026-00104',
      studentId: 'usr-student-3',
      studentName: 'Mark Anthony Reyes',
      studentNumber: 'BCC-2024-00431',
      courseYear: 'BSHM - 1A',
      studentEmail: 'mark.reyes@buenavista.edu.ph',
      counselorId: 'cns-3',
      counselorName: 'Ms. Elena Castillo, RPm, RGC',
      serviceId: 'srv-5',
      serviceTitle: 'Routine Interview & Student Profiling',
      modality: 'In-Person',
      location: 'Guidance Office Rm 206',
      date: '2026-09-25',
      timeSlot: '11:00 AM',
      durationMinutes: 30,
      urgency: 'Routine',
      reason: 'Freshman routine developmental profile interview.',
      status: 'Approved',
      counselorNotes: 'Looking forward to meeting you at BCC Guidance Office Rm 206.',
      createdAt: '2026-09-17T11:00:00.000Z',
      updatedAt: '2026-09-17T13:40:00.000Z'
    }
  ],

  sessionNotes: [
    {
      id: 'note-201',
      appointmentId: 'apt-102',
      studentId: 'usr-student-1',
      studentName: 'Juan Dela Cruz',
      counselorId: 'cns-1',
      counselorName: 'Dr. Maria Santos, RGC, PhD',
      serviceTitle: 'Academic Counseling & Study Skills',
      sessionDate: '2026-09-10',
      caseCategory: 'Academic / Time Management',
      subjective: 'Student reported intense anxiety regarding impending deadline crunch across 3 major IT subjects (Data Structures, Database Management, and Web Development). Expressed feeling scattered and experiencing erratic sleep patterns.',
      objective: 'Student arrived on time. Appeared slightly fatigued but articulate and engaged. Maintained good eye contact and demonstrated high motivation to correct academic habits.',
      assessment: 'Experiencing situational academic stress secondary to poor time-allocation and procrastination on complex programming milestones. No indication of clinical depression or crisis markers.',
      plan: '1. Established 3-hour Pomodoro blocks for programming tasks.\n2. Scheduled consistent sleep target (11 PM).\n3. Recommended peer study group with BSIT-3A classmates.\n4. Scheduled follow-up check-in for October.',
      followUpRequired: true,
      followUpDate: '2026-10-15',
      status: 'Closed / Follow-up Pending',
      createdAt: '2026-09-10T11:15:00.000Z'
    }
  ],

  announcements: [
    {
      id: 'ann-1',
      title: 'Mental Health Awareness Week 2026: "Nurturing Minds, Building Hope"',
      category: 'Events',
      content: 'Join the BCC Guidance Office for free wellness workshops, mindfulness sessions, and peer support talks at the BCC Audio-Visual Room. All BSIT and College students are warmly invited!',
      author: 'Center for Student Development & Guidance Services',
      targetRole: 'all',
      priority: 'high',
      publishDate: '2026-09-18',
      expiryDate: '2026-10-10'
    },
    {
      id: 'ann-2',
      title: 'BSIT 3rd Year Capstone & Career Advisory Schedules',
      category: 'Academic',
      content: 'Guidance Counselor Prof. Robert Rivera is holding dedicated career and specialization consultation slots this September for all 3rd Year BSIT students preparing for practicum.',
      author: 'Prof. Robert Rivera, RGC',
      targetRole: 'student',
      priority: 'medium',
      publishDate: '2026-09-15',
      expiryDate: '2026-09-30'
    },
    {
      id: 'ann-3',
      title: 'Guidance Office Confidentiality & Safe Space Pledge',
      category: 'Notice',
      content: 'All guidance counseling sessions are strictly confidential under the Guidance and Counseling Act of 2004 (RA 9258) and Data Privacy Act of 2012 (RA 10173).',
      author: 'Director Lourdes Mendoza',
      targetRole: 'all',
      priority: 'normal',
      publishDate: '2026-09-01',
      expiryDate: '2026-12-31'
    }
  ],

  notifications: [
    {
      id: 'notif-1',
      recipientId: 'usr-student-1',
      title: 'Appointment Approved',
      message: 'Your Career Guidance appointment with Prof. Robert Rivera on Sep 24, 2026 at 02:00 PM has been approved.',
      type: 'success',
      appointmentId: 'apt-101',
      isRead: false,
      createdAt: '2026-09-18T11:20:00.000Z'
    },
    {
      id: 'notif-2',
      recipientId: 'usr-counselor-1',
      title: 'New Appointment Request',
      message: 'Angelica Ramos (BSIT-2B) has requested a Personal Counseling session on Sep 23, 2026 at 01:30 PM.',
      type: 'info',
      appointmentId: 'apt-103',
      isRead: false,
      createdAt: '2026-09-19T16:00:00.000Z'
    },
    {
      id: 'notif-3',
      recipientId: 'usr-admin-1',
      title: 'New Student Registration',
      message: 'New student account registered for Juan Dela Cruz (BSIT-3A).',
      type: 'info',
      isRead: true,
      createdAt: '2026-09-10T08:05:00.000Z'
    }
  ],

  auditLogs: [
    {
      id: 'log-1',
      action: 'APPOINTMENT_APPROVED',
      actorName: 'Prof. Robert Rivera',
      actorRole: 'counselor',
      target: 'Appointment BCC-APT-2026-00101 (Juan Dela Cruz)',
      timestamp: '2026-09-18T11:20:00.000Z',
      ipAddress: '192.168.1.45'
    },
    {
      id: 'log-2',
      action: 'APPOINTMENT_BOOKED',
      actorName: 'Angelica Ramos',
      actorRole: 'student',
      target: 'Appointment BCC-APT-2026-00103 (Personal Support)',
      timestamp: '2026-09-19T16:00:00.000Z',
      ipAddress: '192.168.1.102'
    },
    {
      id: 'log-3',
      action: 'SESSION_NOTE_SAVED',
      actorName: 'Dr. Maria Santos',
      actorRole: 'counselor',
      target: 'SOAP Note #201 (Juan Dela Cruz)',
      timestamp: '2026-09-10T11:15:00.000Z',
      ipAddress: '192.168.1.40'
    }
  ],

  settings: {
    systemName: 'Buenavista Community College Guidance System',
    leadTimeHours: 12,
    cancellationWindowHours: 4,
    maxActiveBookingsPerStudent: 3,
    allowEmergencyWalkIns: true,
    enableEmailNotifications: true,
    enableSmsReminders: false,
    privacyNotice: 'All counseling consultations adhere to the Philippine Guidance and Counseling Act of 2004 (RA 9258) and Data Privacy Act of 2012 (RA 10173). Information shared is strictly confidential.'
  },

  guidanceResources: [
    {
      id: 'res-1',
      title: 'Time Management & Academic Success Guide',
      category: 'Study Skills',
      description: 'Master course workloads, prioritize assignments using the Eisenhower Matrix, and eliminate procrastination.',
      content: 'Time management is essential for collegiate success at Buenavista Community College. 1. Use the Eisenhower Matrix: categorize tasks by urgency and importance. 2. Adopt the Pomodoro Technique: study in 25-minute focused blocks followed by 5-minute rests. 3. Audit your weekly hours: balance lecture, lab work, study time, and rest. 4. Visit BCC Guidance Office (Room 204) for individual academic habit planning.',
      targetProgram: 'All',
      downloadUrl: '#'
    },
    {
      id: 'res-2',
      title: 'Managing College Stress & Exam Anxiety',
      category: 'Mental Wellness',
      description: 'Practical coping strategies, grounding techniques, and 4-7-8 breathing exercises to conquer academic pressure.',
      content: 'College life brings new challenges that can trigger acute stress. 1. Recognize somatic symptoms: elevated heart rate, muscle tension, and insomnia. 2. Practice 4-7-8 diaphragmatic breathing: inhale for 4 seconds, hold for 7, exhale slowly for 8. 3. Avoid excessive caffeine right before examinations. 4. If feelings of overwhelm persist, schedule a confidential counseling appointment at the Guidance Office.',
      targetProgram: 'All',
      downloadUrl: '#'
    },
    {
      id: 'res-3',
      title: 'Career Pathway & Internship (OJT) Readiness Checklist',
      category: 'Career Guidance',
      description: 'Essential preparation checklist for students preparing for on-the-job training (OJT) and industry practicum.',
      content: 'Preparing for industry placement requires proactive groundwork: 1. Ensure all prerequisite academic clearances and MOAs are completed. 2. Draft an industry-standard resume highlighting coursework projects and technical competencies. 3. Obtain necessary medical certificates and insurance requirements. 4. Consult your assigned counselor for mock behavioral interviews and workplace ethics orientation.',
      targetProgram: 'All',
      downloadUrl: '#'
    },
    {
      id: 'res-4',
      title: 'Hospitality & Tourism Professional Etiquette Handbook',
      category: 'Career Guidance',
      description: 'Standard operating guidelines on guest interaction, customer delight, intercultural sensitivity, and grooming.',
      content: 'For BSHM and BSTM majors, hospitality excellence begins with daily discipline: 1. Maintain immaculate personal grooming and uniform standards. 2. Master active listening and empathetic dialogue during guest inquiries. 3. Apply the HEAT model (Hear, Empathize, Apologize, Take Action) for conflict resolution. 4. Respect cultural nuances when serving international and domestic guests.',
      targetProgram: 'BSHM & BSTM',
      downloadUrl: '#'
    },
    {
      id: 'res-5',
      title: 'Effective Study Habits & Active Recall Strategies',
      category: 'Study Skills',
      description: 'Replace passive re-reading with active recall, spaced repetition, and the Feynman technique to boost retention.',
      content: 'Passive reading creates an illusion of competence. 1. Active Recall: test yourself after every chapter by closing the book and writing down core concepts. 2. Spaced Repetition: review material on day 1, day 3, day 7, and day 21 before exams. 3. Feynman Technique: explain complex programming algorithms, accounting equations, or criminology procedures in simple terms as if teaching a beginner.',
      targetProgram: 'All',
      downloadUrl: '#'
    },
    {
      id: 'res-6',
      title: 'College Adjustment & Freshmen Transition Toolkit',
      category: 'Study Skills',
      description: 'Navigating independence, college social circles, campus resources, and overcoming freshmen imposter syndrome.',
      content: 'Transitioning from senior high school to BCC college life is a major life milestone. 1. Familiarize yourself with BCC campus offices: Registrar, Guidance, Library, Dean\'s Office, and Clinic. 2. Establish a healthy social circle through student clubs and academic study groups. 3. Recognize that feeling overwhelmed early on is normal—reach out to peer facilitators and guidance staff whenever you need guidance.',
      targetProgram: '1st Year Students',
      downloadUrl: '#'
    },
    {
      id: 'res-7',
      title: 'Resume Writing & Professional Portfolio Mastery',
      category: 'Career Guidance',
      description: 'Step-by-step guide to crafting an impactful 1-page modern resume, LinkedIn profile, and digital portfolio.',
      content: 'Your resume is your personal marketing document: 1. Stick to a clean, reverse-chronological single-page format. 2. Use action verbs and metric-driven accomplishments. 3. Tailor keywords to the specific job description. 4. Have your resume reviewed at the BCC Guidance Center before submitting to internship partners.',
      targetProgram: '3rd & 4th Year Students',
      downloadUrl: '#'
    },
    {
      id: 'res-8',
      title: 'Acing Job & Internship Behavioral Interviews',
      category: 'Career Guidance',
      description: 'Master the STAR method (Situation, Task, Action, Result) to confidently answer challenging interview questions.',
      content: 'Employers evaluate not just technical skills, but soft skills and emotional resilience: 1. Structure your answers using STAR (Situation, Task, Action, Result). 2. Prepare 3 core stories showcasing teamwork, leadership, and conflict resolution. 3. Research the company or agency thoroughly beforehand. 4. Prepare insightful questions to ask the interviewer at the end of the conversation.',
      targetProgram: 'Graduating Students',
      downloadUrl: '#'
    },
    {
      id: 'res-9',
      title: 'Emotional Resilience & Mindfulness for College Students',
      category: 'Mental Wellness',
      description: 'Cultivating psychological strength, cognitive reframing, and daily mindfulness practices for academic challenges.',
      content: 'Resilience is the ability to bounce back from academic setbacks, failed quizzes, and interpersonal disappointments: 1. Practice cognitive reframing: view failures as data for improvement rather than personal flaws. 2. Grounding Exercise (5-4-3-2-1): Notice 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. 3. Maintain gratitude journaling and positive self-talk.',
      targetProgram: 'All',
      downloadUrl: '#'
    },
    {
      id: 'res-10',
      title: 'Personal Development, Goal Setting & Self-Leadership',
      category: 'Mental Wellness',
      description: 'Establishing SMART goals, building personal integrity, and cultivating healthy self-discipline in college.',
      content: 'Becoming a successful professional requires conscious personal development: 1. Formulate SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound). 2. Align your daily habits with your long-term life vision. 3. Practice digital detox during exam periods. 4. Treat yourself and your peers with mutual respect, empathy, and constructive communication.',
      targetProgram: 'All',
      downloadUrl: '#'
    },
    {
      id: 'res-11',
      title: 'BCC Guidance & Counseling Support Directory & Rights',
      category: 'Mental Wellness',
      description: 'Your guide to counseling rights, confidentiality protections under RA 9258, and guidance office services.',
      content: 'The Center for Student Development & Guidance Services is committed to safeguarding student welfare: 1. Confidentiality Pledge: Sessions are protected by RA 9258 (Guidance and Counseling Act of 2004) and RA 10173 (Data Privacy Act of 2012). 2. How to book: Use the BCC online booking portal or visit Room 204. 3. Emergency walk-ins are accommodated for urgent mental health distress. You are never alone.',
      targetProgram: 'All Students',
      downloadUrl: '#'
    },
    {
      id: 'res-12',
      title: 'Digital Wellness & Healthy Screen-Time Boundaries',
      category: 'Study Skills',
      description: 'Combatting digital fatigue, late-night screen addiction, and maintaining eye health during heavy computer coursework.',
      content: 'With extensive screen time required for programming, research, and online study, digital wellness is critical: 1. Apply the 20-20-20 rule: Every 20 minutes, look at an object 20 feet away for at least 20 seconds. 2. Turn off non-essential notifications during study blocks. 3. Establish a blue-light curfew at least 45 minutes before sleep. 4. Incorporate daily physical stretching and outdoor breaks.',
      targetProgram: 'BSIT & All Programs',
      downloadUrl: '#'
    }
  ]
};

