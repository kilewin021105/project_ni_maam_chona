/**
 * BCC Guidance Appointment System - Local Storage Engine & State Manager
 * Handles local persistence, relational integrity, double-booking validation, and event bus
 */

const StorageKeys = {
  USERS: 'bcc_bv_users_v2',
  SERVICES: 'bcc_bv_services_v2',
  COUNSELORS: 'bcc_bv_counselors_v2',
  APPOINTMENTS: 'bcc_bv_appointments_v2',
  SESSION_NOTES: 'bcc_bv_session_notes_v2',
  ANNOUNCEMENTS: 'bcc_bv_announcements_v2',
  NOTIFICATIONS: 'bcc_bv_notifications_v2',
  RESOURCES: 'bcc_bv_resources_v2',
  FEEDBACK: 'bcc_bv_feedback_v2',
  AUDIT_LOGS: 'bcc_bv_audit_logs_v2',
  SETTINGS: 'bcc_bv_settings_v2',
  CURRENT_USER: 'bcc_bv_current_user_v2'
};

const StorageService = {
  // Initialize storage with seed data if empty
  init() {
    if (!localStorage.getItem(StorageKeys.USERS)) {
      this.resetToDefaults();
    }
  },

  resetToDefaults() {
    localStorage.setItem(StorageKeys.USERS, JSON.stringify(SEED_DATA.users));
    localStorage.setItem(StorageKeys.SERVICES, JSON.stringify(SEED_DATA.services));
    localStorage.setItem(StorageKeys.COUNSELORS, JSON.stringify(SEED_DATA.counselors));
    localStorage.setItem(StorageKeys.APPOINTMENTS, JSON.stringify(SEED_DATA.appointments));
    localStorage.setItem(StorageKeys.SESSION_NOTES, JSON.stringify(SEED_DATA.sessionNotes));
    localStorage.setItem(StorageKeys.ANNOUNCEMENTS, JSON.stringify(SEED_DATA.announcements));
    localStorage.setItem(StorageKeys.NOTIFICATIONS, JSON.stringify(SEED_DATA.notifications));
    localStorage.setItem(StorageKeys.RESOURCES, JSON.stringify(SEED_DATA.guidanceResources || []));
    localStorage.setItem(StorageKeys.FEEDBACK, JSON.stringify([]));
    localStorage.setItem(StorageKeys.AUDIT_LOGS, JSON.stringify(SEED_DATA.auditLogs));
    localStorage.setItem(StorageKeys.SETTINGS, JSON.stringify(SEED_DATA.settings));
    
    // Default logged-in user: Student Juan Dela Cruz
    const defaultStudent = SEED_DATA.users.find(u => u.role === 'student');
    this.setCurrentUser(defaultStudent);
    this.broadcastChange('reset');
  },

  broadcastChange(action, payload = {}) {
    window.dispatchEvent(new CustomEvent('guidance:state-changed', {
      detail: { action, payload, timestamp: new Date().toISOString() }
    }));
  },

  // Raw Read / Write Helpers
  getItem(key, defaultValue = []) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error(`Error reading ${key} from localStorage:`, e);
      return defaultValue;
    }
  },

  setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing ${key} to localStorage:`, e);
    }
  },

  // Current Auth User
  getCurrentUser() {
    const raw = localStorage.getItem(StorageKeys.CURRENT_USER);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  setCurrentUser(user) {
    if (!user) {
      this.clearCurrentUser();
      return;
    }
    localStorage.setItem(StorageKeys.CURRENT_USER, JSON.stringify(user));
    this.broadcastChange('auth_changed', user);
  },

  clearCurrentUser() {
    localStorage.removeItem(StorageKeys.CURRENT_USER);
    this.broadcastChange('auth_changed', null);
  },

  logout() {
    this.clearCurrentUser();
  },

  // User Operations
  getUsers() { return this.getItem(StorageKeys.USERS, []); },
  getUserById(id) { return this.getUsers().find(u => u.id === id); },
  getUserByEmail(email) { return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()); },
  
  saveUser(user) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      users[index] = { ...users[index], ...user, updatedAt: new Date().toISOString() };
    } else {
      user.id = user.id || `usr-${Date.now()}`;
      user.createdAt = new Date().toISOString();
      users.push(user);
    }
    this.setItem(StorageKeys.USERS, users);
    this.logAudit('USER_SAVED', `User record updated: ${user.name} (${user.role})`);
    this.broadcastChange('user_saved', user);
    return user;
  },

  deleteUser(id) {
    let users = this.getUsers();
    const user = users.find(u => u.id === id);
    users = users.filter(u => u.id !== id);
    this.setItem(StorageKeys.USERS, users);
    if (user) {
      this.logAudit('USER_DELETED', `User removed: ${user.name} (${user.email})`);
    }
    this.broadcastChange('user_deleted', { id });
  },

  // Services Operations
  getServices(activeOnly = false) {
    const services = this.getItem(StorageKeys.SERVICES, []);
    return activeOnly ? services.filter(s => s.isActive) : services;
  },

  getServiceById(id) {
    return this.getServices().find(s => s.id === id);
  },

  saveService(service) {
    const services = this.getServices();
    const index = services.findIndex(s => s.id === service.id);
    if (index >= 0) {
      services[index] = { ...services[index], ...service };
    } else {
      service.id = service.id || `srv-${Date.now()}`;
      services.push(service);
    }
    this.setItem(StorageKeys.SERVICES, services);
    this.logAudit('SERVICE_SAVED', `Service updated: ${service.title}`);
    this.broadcastChange('service_saved', service);
    return service;
  },

  // Counselors Operations
  getCounselors(activeOnly = false) {
    const counselors = this.getItem(StorageKeys.COUNSELORS, []);
    return activeOnly ? counselors.filter(c => c.isActive) : counselors;
  },

  getCounselorById(id) {
    return this.getCounselors().find(c => c.id === id);
  },

  // Appointments & Strict Double Booking Validation
  getAppointments() {
    return this.getItem(StorageKeys.APPOINTMENTS, []);
  },

  getAppointmentById(id) {
    return this.getAppointments().find(a => a.id === id);
  },

  getAppointmentsByStudent(studentId) {
    return this.getAppointments().filter(a => a.studentId === studentId);
  },

  getAppointmentsByCounselor(counselorId) {
    return this.getAppointments().filter(a => a.counselorId === counselorId);
  },

  /**
   * Double Booking Collision Detector
   * Validates if a counselor is already booked on the target date and timeSlot.
   */
  checkSlotAvailability(counselorId, date, timeSlot, excludeAppointmentId = null) {
    const appointments = this.getAppointments();
    
    // Active statuses that block the slot
    const blockingStatuses = ['Pending', 'Approved'];

    const conflict = appointments.find(a => 
      a.counselorId === counselorId &&
      a.date === date &&
      a.timeSlot === timeSlot &&
      blockingStatuses.includes(a.status) &&
      (!excludeAppointmentId || a.id !== excludeAppointmentId)
    );

    if (conflict) {
      return {
        available: false,
        conflictAppointment: conflict,
        reason: `This time slot (${timeSlot} on ${date}) is already reserved.`
      };
    }

    return { available: true };
  },

  /**
   * Generates available time slots for a counselor on a given date
   */
  getAvailableSlots(counselorId, date) {
    const counselor = this.getCounselorById(counselorId);
    if (!counselor) return [];

    const defaultSlots = counselor.slotsPerDay || [
      '09:00 AM', '10:00 AM', '11:00 AM', '01:30 PM', '02:30 PM', '03:30 PM'
    ];

    const appointments = this.getAppointments();
    const blockingStatuses = ['Pending', 'Approved'];

    return defaultSlots.map(slot => {
      const isBooked = appointments.some(a => 
        a.counselorId === counselorId &&
        a.date === date &&
        a.timeSlot === slot &&
        blockingStatuses.includes(a.status)
      );

      return {
        time: slot,
        isAvailable: !isBooked
      };
    });
  },

  createAppointment(data) {
    // 1. Double booking validation
    const availability = this.checkSlotAvailability(data.counselorId, data.date, data.timeSlot);
    if (!availability.available) {
      throw new Error(availability.reason);
    }

    const appointments = this.getAppointments();
    const id = `apt-${Date.now()}`;
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const referenceCode = `BCC-APT-${new Date().getFullYear()}-${randNum}`;

    const newAppointment = {
      id,
      referenceCode,
      studentId: data.studentId,
      studentName: data.studentName,
      studentNumber: data.studentNumber || 'BCC-STUDENT',
      courseYear: data.courseYear || 'BSIT',
      studentEmail: data.studentEmail,
      counselorId: data.counselorId,
      counselorName: data.counselorName,
      serviceId: data.serviceId,
      serviceTitle: data.serviceTitle,
      modality: data.modality || 'In-Person',
      location: data.location || 'Guidance Office, St. Joseph Hall',
      meetingLink: data.meetingLink || '',
      date: data.date,
      timeSlot: data.timeSlot,
      durationMinutes: data.durationMinutes || 45,
      urgency: data.urgency || 'Routine',
      reason: data.reason || '',
      status: 'Pending',
      counselorNotes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    appointments.unshift(newAppointment);
    this.setItem(StorageKeys.APPOINTMENTS, appointments);

    // 2. Notify Counselor & Student
    const counselorUser = this.getUsers().find(u => u.counselorId === data.counselorId);
    if (counselorUser) {
      this.createNotification({
        recipientId: counselorUser.id,
        title: 'New Appointment Request',
        message: `${data.studentName} requested an appointment for "${data.serviceTitle}" on ${data.date} at ${data.timeSlot}.`,
        type: 'info',
        appointmentId: id
      });
    }

    this.logAudit('APPOINTMENT_BOOKED', `New request ${referenceCode} by ${data.studentName}`);
    this.broadcastChange('appointment_created', newAppointment);
    return newAppointment;
  },

  updateAppointmentStatus(id, newStatus, counselorNotes = '', newLocationOrLink = null) {
    const appointments = this.getAppointments();
    const index = appointments.findIndex(a => a.id === id);
    if (index === -1) throw new Error('Appointment not found');

    const appointment = appointments[index];
    const prevStatus = appointment.status;
    appointment.status = newStatus;
    appointment.updatedAt = new Date().toISOString();
    if (counselorNotes) appointment.counselorNotes = counselorNotes;
    if (newLocationOrLink) {
      if (appointment.modality === 'Online Video Consultation') {
        appointment.meetingLink = newLocationOrLink;
      } else {
        appointment.location = newLocationOrLink;
      }
    }

    appointments[index] = appointment;
    this.setItem(StorageKeys.APPOINTMENTS, appointments);

    // Create Notification for Student
    let notifType = 'info';
    let notifTitle = `Appointment ${newStatus}`;
    if (newStatus === 'Approved') notifType = 'success';
    if (newStatus === 'Cancelled' || newStatus === 'Rejected') notifType = 'error';

    this.createNotification({
      recipientId: appointment.studentId,
      title: notifTitle,
      message: `Your appointment (${appointment.referenceCode}) for "${appointment.serviceTitle}" with ${appointment.counselorName} has been ${newStatus.toLowerCase()}. ${counselorNotes ? `Note: "${counselorNotes}"` : ''}`,
      type: notifType,
      appointmentId: id
    });

    this.logAudit(`APPOINTMENT_${newStatus.toUpperCase()}`, `Appointment ${appointment.referenceCode} updated from ${prevStatus} to ${newStatus}`);
    this.broadcastChange('appointment_updated', appointment);
    return appointment;
  },

  rescheduleAppointment(id, newDate, newTimeSlot, reason = '') {
    const appointments = this.getAppointments();
    const index = appointments.findIndex(a => a.id === id);
    if (index === -1) throw new Error('Appointment not found');

    const appointment = appointments[index];

    // Double booking check for new time
    const availability = this.checkSlotAvailability(appointment.counselorId, newDate, newTimeSlot, id);
    if (!availability.available) {
      throw new Error(availability.reason);
    }

    appointment.date = newDate;
    appointment.timeSlot = newTimeSlot;
    appointment.status = 'Rescheduled';
    appointment.updatedAt = new Date().toISOString();
    if (reason) {
      appointment.counselorNotes = `Rescheduled: ${reason}`;
    }

    appointments[index] = appointment;
    this.setItem(StorageKeys.APPOINTMENTS, appointments);

    // Notify student
    this.createNotification({
      recipientId: appointment.studentId,
      title: 'Appointment Rescheduled',
      message: `Your appointment has been rescheduled to ${newDate} at ${newTimeSlot}. Reason: ${reason || 'Schedule adjustment by counselor'}.`,
      type: 'warning',
      appointmentId: id
    });

    this.logAudit('APPOINTMENT_RESCHEDULED', `Appointment ${appointment.referenceCode} moved to ${newDate} ${newTimeSlot}`);
    this.broadcastChange('appointment_rescheduled', appointment);
    return appointment;
  },

  // Session Notes (Confidential SOAP notes)
  getSessionNotes() {
    return this.getItem(StorageKeys.SESSION_NOTES, []);
  },

  getSessionNoteById(id) {
    return this.getSessionNotes().find(n => n.id === id);
  },

  getSessionNotesByStudent(studentId) {
    return this.getSessionNotes().filter(n => n.studentId === studentId);
  },

  saveSessionNote(note) {
    const notes = this.getSessionNotes();
    const index = notes.findIndex(n => n.id === note.id);
    if (index >= 0) {
      notes[index] = { ...notes[index], ...note, updatedAt: new Date().toISOString() };
    } else {
      note.id = note.id || `note-${Date.now()}`;
      note.createdAt = new Date().toISOString();
      notes.unshift(note);
    }
    this.setItem(StorageKeys.SESSION_NOTES, notes);

    // Update appointment link if applicable
    if (note.appointmentId) {
      const appointments = this.getAppointments();
      const aptIndex = appointments.findIndex(a => a.id === note.appointmentId);
      if (aptIndex >= 0) {
        appointments[aptIndex].sessionNoteId = note.id;
        appointments[aptIndex].status = 'Completed';
        this.setItem(StorageKeys.APPOINTMENTS, appointments);
      }
    }

    this.logAudit('SESSION_NOTE_SAVED', `SOAP note saved for student ID: ${note.studentId}`);
    this.broadcastChange('session_note_saved', note);
    return note;
  },

  // Announcements
  getAnnouncements() {
    return this.getItem(StorageKeys.ANNOUNCEMENTS, []);
  },

  saveAnnouncement(announcement) {
    const items = this.getAnnouncements();
    const index = items.findIndex(a => a.id === announcement.id);
    if (index >= 0) {
      items[index] = { ...items[index], ...announcement };
    } else {
      announcement.id = announcement.id || `ann-${Date.now()}`;
      announcement.publishDate = announcement.publishDate || new Date().toISOString().split('T')[0];
      items.unshift(announcement);
    }
    this.setItem(StorageKeys.ANNOUNCEMENTS, items);
    this.logAudit('ANNOUNCEMENT_SAVED', `Announcement: ${announcement.title}`);
    this.broadcastChange('announcement_saved', announcement);
    return announcement;
  },

  deleteAnnouncement(id) {
    let items = this.getAnnouncements();
    items = items.filter(a => a.id !== id);
    this.setItem(StorageKeys.ANNOUNCEMENTS, items);
    this.broadcastChange('announcement_deleted', { id });
  },

  // Notifications
  getNotifications(recipientId) {
    const all = this.getItem(StorageKeys.NOTIFICATIONS, []);
    return recipientId ? all.filter(n => n.recipientId === recipientId) : all;
  },

  createNotification(notif) {
    const all = this.getItem(StorageKeys.NOTIFICATIONS, []);
    notif.id = notif.id || `notif-${Date.now()}`;
    notif.isRead = false;
    notif.createdAt = new Date().toISOString();
    all.unshift(notif);
    this.setItem(StorageKeys.NOTIFICATIONS, all);
    this.broadcastChange('notification_created', notif);
    return notif;
  },

  markNotificationAsRead(id) {
    const all = this.getItem(StorageKeys.NOTIFICATIONS, []);
    const notif = all.find(n => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.setItem(StorageKeys.NOTIFICATIONS, all);
      this.broadcastChange('notification_read', { id });
    }
  },

  markAllNotificationsAsRead(recipientId) {
    const all = this.getItem(StorageKeys.NOTIFICATIONS, []);
    all.forEach(n => {
      if (!recipientId || n.recipientId === recipientId) {
        n.isRead = true;
      }
    });
    this.setItem(StorageKeys.NOTIFICATIONS, all);
    this.broadcastChange('notifications_all_read', { recipientId });
  },

  // Audit Logs
  getAuditLogs() {
    return this.getItem(StorageKeys.AUDIT_LOGS, []);
  },

  logAudit(action, target) {
    const logs = this.getAuditLogs();
    const currentUser = this.getCurrentUser();
    const newLog = {
      id: `log-${Date.now()}`,
      action,
      actorName: currentUser ? currentUser.name : 'System',
      actorRole: currentUser ? currentUser.role : 'system',
      target,
      timestamp: new Date().toISOString(),
      ipAddress: '192.168.1.1'
    };
    logs.unshift(newLog);
    if (logs.length > 200) logs.pop(); // Keep manageable size
    this.setItem(StorageKeys.AUDIT_LOGS, logs);
  },

  // Guidance Resources (Section 5.8)
  getResources(category = null) {
    let resources = this.getItem(StorageKeys.RESOURCES, []);
    if (!resources || resources.length < 12) {
      resources = SEED_DATA.guidanceResources || [];
      this.setItem(StorageKeys.RESOURCES, resources);
    }
    if (category && category !== 'All') {
      return resources.filter(r => r.category === category);
    }
    return resources;
  },

  // Appointment Feedback (Section 5.9)
  submitFeedback(appointmentId, studentId, rating, comments = '') {
    const feedbackList = this.getItem(StorageKeys.FEEDBACK, []);
    const existing = feedbackList.find(f => f.appointmentId === appointmentId);
    if (existing) {
      throw new Error('Feedback for this session has already been submitted.');
    }
    const newFeedback = {
      id: `fb-${Date.now()}`,
      appointmentId,
      studentId,
      rating: parseInt(rating, 10),
      comments,
      createdAt: new Date().toISOString()
    };
    feedbackList.push(newFeedback);
    this.setItem(StorageKeys.FEEDBACK, feedbackList);
    this.broadcastChange('feedback_submitted', newFeedback);
    return newFeedback;
  },

  getFeedback(appointmentId) {
    const feedbackList = this.getItem(StorageKeys.FEEDBACK, []);
    return feedbackList.find(f => f.appointmentId === appointmentId) || null;
  },

  // System Settings
  getSettings() {
    return this.getItem(StorageKeys.SETTINGS, SEED_DATA.settings);
  },

  saveSettings(newSettings) {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    this.setItem(StorageKeys.SETTINGS, updated);
    this.logAudit('SETTINGS_UPDATED', 'System settings updated');
    this.broadcastChange('settings_updated', updated);
    return updated;
  }
};

// Initialize right away
StorageService.init();
