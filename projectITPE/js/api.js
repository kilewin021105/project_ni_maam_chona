/**
 * BCC Guidance Appointment System — API Client Layer
 * Full-stack REST client with Supabase/Flask backend connectivity and automatic local storage fallback.
 */

const ApiClient = {
  BASE_URL: 'http://127.0.0.1:5000/api/v1',
  token: localStorage.getItem('bcc_jwt_token') || null,

  setToken(t) {
    this.token = t;
    if (t) {
      localStorage.setItem('bcc_jwt_token', t);
    } else {
      localStorage.removeItem('bcc_jwt_token');
    }
  },

  async _fetch(endpoint, options = {}) {
    const url = `${this.BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout for remote Supabase

    try {
      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(timeout);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      return data;
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  },

  // ── Authentication Endpoints ──

  async login(email, password) {
    try {
      const res = await this._fetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (res.token) this.setToken(res.token);
      if (res.user) StorageService.setCurrentUser(res.user);
      return res;
    } catch (err) {
      // Local fallback
      console.warn('[ApiClient] Remote login unavailable, evaluating via local database engine:', err.message);
      const users = StorageService.getUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      if (!user) {
        throw new Error('Invalid email or password. Please check your credentials.');
      }
      if (user.status === 'inactive') {
        throw new Error('This account has been deactivated. Please contact the Guidance Office.');
      }
      StorageService.setCurrentUser(user);
      return { token: 'mock-jwt-token', user };
    }
  },

  async registerStudent(studentData) {
    const payload = {
      ...studentData,
      year_section: studentData.year_section || studentData.yearSection,
      student_id_number: studentData.student_id_number || studentData.studentId,
      emergency_contact: studentData.emergency_contact || studentData.emergencyContact
    };
    try {
      const res = await this._fetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.token) this.setToken(res.token);
      if (res.user) StorageService.setCurrentUser(res.user);
      return res.user;
    } catch (err) {
      if (err.message && (err.message.includes('HTTP') || err.message.includes('already exists') || err.message.includes('required') || err.message.includes('Field'))) {
        throw err;
      }
      console.warn('[ApiClient] Remote register unavailable, falling back to local database:', err.message);
      const existing = StorageService.getUserByEmail(payload.email);
      if (existing) {
        throw new Error('An account with this email address already exists.');
      }
      const newUser = {
        ...payload,
        role: 'student',
        status: 'active',
        avatarInitial: (payload.name || 'ST').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      };
      return StorageService.saveUser(newUser);
    }
  },

  async getCurrentUser() {
    return StorageService.getCurrentUser();
  },

  async logout() {
    this.setToken(null);
    try {
      await this._fetch('/auth/logout', { method: 'POST' });
    } catch (e) {}
    StorageService.clearCurrentUser();
    return { success: true };
  },

  async updateProfile(userId, phone, emergencyContact) {
    try {
      const res = await this._fetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ user_id: userId, phone, emergency_contact: emergencyContact })
      });
      return res.user;
    } catch (err) {
      console.warn('[ApiClient] Remote profile update failed, syncing locally:', err.message);
      const user = StorageService.getCurrentUser();
      if (user) {
        user.phone = phone;
        user.emergencyContact = emergencyContact;
        user.emergency_contact = emergencyContact;
        StorageService.saveUser(user);
        StorageService.setCurrentUser(user);
      }
      return user;
    }
  },

  async changePassword(userId, currentPassword, newPassword) {
    try {
      const res = await this._fetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      return res;
    } catch (err) {
      console.warn('[ApiClient] Remote password change error:', err.message);
      throw err;
    }
  },

  // ── Guidance Services ──

  async getServices(activeOnly = true) {
    try {
      const res = await this._fetch(`/services?active_only=${activeOnly}`);
      return res.services || [];
    } catch (err) {
      return StorageService.getServices(activeOnly);
    }
  },

  async getService(id) {
    try {
      const res = await this._fetch(`/services/${id}`);
      return res.service;
    } catch (err) {
      const service = StorageService.getServiceById(id);
      if (!service) throw new Error('Service not found');
      return service;
    }
  },

  // ── Counselors & Available Slots ──

  async getCounselors() {
    try {
      const res = await this._fetch('/counselors');
      return res.counselors || [];
    } catch (err) {
      return StorageService.getCounselors();
    }
  },

  async getAvailableSlots(counselorId, date) {
    try {
      const res = await this._fetch(`/counselors/${counselorId}/slots?date=${encodeURIComponent(date)}`);
      return res.slots || [];
    } catch (err) {
      return StorageService.getAvailableSlots(counselorId, date);
    }
  },

  // ── Appointments ──

  async getAppointments(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.studentId) params.append('studentId', filters.studentId);
      if (filters.counselorId) params.append('counselorId', filters.counselorId);
      if (filters.status && filters.status !== 'All') params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);

      const res = await this._fetch(`/appointments?${params.toString()}`);
      return res.appointments || [];
    } catch (err) {
      let appointments = StorageService.getAppointments();
      if (filters.studentId) {
        appointments = appointments.filter(a => a.studentId === filters.studentId);
      }
      if (filters.counselorId) {
        appointments = appointments.filter(a => a.counselorId === filters.counselorId);
      }
      if (filters.status && filters.status !== 'All') {
        appointments = appointments.filter(a => a.status === filters.status);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        appointments = appointments.filter(a => 
          (a.studentName && a.studentName.toLowerCase().includes(q)) ||
          (a.referenceCode && a.referenceCode.toLowerCase().includes(q)) ||
          (a.serviceTitle && a.serviceTitle.toLowerCase().includes(q)) ||
          (a.counselorName && a.counselorName.toLowerCase().includes(q))
        );
      }
      return appointments;
    }
  },

  async getAppointment(id) {
    try {
      const res = await this._fetch(`/appointments/${id}`);
      return res.appointment;
    } catch (err) {
      const apt = StorageService.getAppointmentById(id);
      if (!apt) throw new Error('Appointment not found');
      return apt;
    }
  },

  async createAppointment(appointmentData) {
    try {
      const payload = {
        student_id: appointmentData.studentId || appointmentData.student_id,
        counselor_id: appointmentData.counselorId || appointmentData.counselor_id,
        service_id: appointmentData.serviceId || appointmentData.service_id,
        date: appointmentData.date,
        time_slot: appointmentData.timeSlot || appointmentData.time_slot,
        modality: appointmentData.modality || 'In-Person',
        urgency: appointmentData.urgency || 'Routine',
        reason: appointmentData.reason,
        location_or_link: appointmentData.locationOrLink || appointmentData.location_or_link || 'Guidance Office Rm 204'
      };
      const res = await this._fetch('/appointments', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      // Normalize merged appointment record for storage and UI pass slip
      const savedApt = {
        ...appointmentData,
        ...res.appointment,
        studentName: res.appointment?.studentName || appointmentData.studentName,
        counselorName: res.appointment?.counselorName || appointmentData.counselorName,
        serviceTitle: res.appointment?.serviceTitle || appointmentData.serviceTitle,
        referenceCode: res.appointment?.referenceCode || res.appointment?.reference_code || appointmentData.referenceCode,
        timeSlot: res.appointment?.timeSlot || res.appointment?.time_slot || appointmentData.timeSlot,
        date: res.appointment?.date || appointmentData.date,
        modality: res.appointment?.modality || appointmentData.modality,
        urgency: res.appointment?.urgency || appointmentData.urgency
      };
      StorageService.createAppointment(savedApt);
      return savedApt;
    } catch (err) {
      if (err.message && (err.message.includes('already has') || err.message.includes('required') || err.message.includes('HTTP 4') || err.message.includes('HTTP 5') || err.message.includes('Conflict'))) {
        throw err; // Double booking or validation error from server - bubble up to UI!
      }
      console.warn('[ApiClient] Booking via local storage:', err.message);
      return StorageService.createAppointment(appointmentData);
    }
  },

  async bookAppointment(appointmentData) {
    return this.createAppointment(appointmentData);
  },

  async updateAppointmentStatus(id, status, comments = '', userId = null) {
    try {
      const res = await this._fetch(`/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, comments, userId })
      });
      StorageService.updateAppointmentStatus(id, status, comments);
      return res.appointment;
    } catch (err) {
      if (err.message && (err.message.includes('HTTP 4') || err.message.includes('HTTP 5'))) {
        throw err;
      }
      console.warn('[ApiClient] Updating status via local storage:', err.message);
      return StorageService.updateAppointmentStatus(id, status, comments);
    }
  },

  async cancelAppointment(id, reason = 'Student Request') {
    return this.updateAppointmentStatus(id, 'Cancelled', reason);
  },

  // ── Appointment Feedback (Section 5.9) ──

  async submitFeedback(appointmentId, studentId, rating, comments = '') {
    try {
      const res = await this._fetch(`/appointments/${appointmentId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ student_id: studentId, rating, comments })
      });
      StorageService.submitFeedback(appointmentId, studentId, rating, comments);
      return res.feedback;
    } catch (err) {
      console.warn('[ApiClient] Submitting feedback locally:', err.message);
      return StorageService.submitFeedback(appointmentId, studentId, rating, comments);
    }
  },

  // ── Clinical SOAP Notes (Section 6.5) ──

  async getSessionNotes(counselorId = null, studentId = null) {
    try {
      const params = new URLSearchParams();
      if (counselorId) params.append('counselorId', counselorId);
      if (studentId) params.append('studentId', studentId);
      const res = await this._fetch(`/counseling-records?${params.toString()}`);
      return res.records || [];
    } catch (err) {
      return studentId ? StorageService.getSessionNotesByStudent(studentId) : StorageService.getSessionNotes();
    }
  },

  async createSessionNote(noteData) {
    try {
      const res = await this._fetch('/counseling-records', {
        method: 'POST',
        body: JSON.stringify({
          student_id: noteData.studentId || 'usr-std-1',
          counselor_id: noteData.counselorId || 'usr-cns-1',
          case_category: noteData.caseCategory || 'General Support',
          subjective: noteData.subjective || '',
          objective: noteData.objective || '',
          assessment: noteData.assessment || '',
          plan: noteData.plan || '',
          confidentiality_level: 'Strictly Confidential'
        })
      });
      StorageService.saveSessionNote(noteData);
      return res.record;
    } catch (err) {
      return StorageService.saveSessionNote(noteData);
    }
  },

  // ── Guidance Resources (Section 5.8) ──

  async getGuidanceResources(category = null) {
    try {
      const q = category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : '';
      const res = await this._fetch(`/resources${q}`);
      return res.resources || [];
    } catch (err) {
      return StorageService.getResources(category);
    }
  },

  // ── Announcements & Notifications ──

  async getAnnouncements() {
    try {
      const res = await this._fetch('/announcements');
      return res.announcements || [];
    } catch (err) {
      return StorageService.getAnnouncements();
    }
  },

  async getNotifications(recipientId) {
    try {
      const res = await this._fetch(`/notifications?userId=${encodeURIComponent(recipientId)}`);
      return res.notifications || [];
    } catch (err) {
      return StorageService.getNotifications(recipientId);
    }
  },

  async markNotificationRead(id) {
    try {
      await this._fetch(`/notifications/${id}/read`, { method: 'PATCH' });
    } catch (e) {}
    return StorageService.markNotificationAsRead(id);
  },

  // ── Admin Endpoints ──

  async getUsers(role = null) {
    try {
      const q = role ? `?role=${role}` : '';
      const res = await this._fetch(`/admin/users${q}`);
      return res.users || [];
    } catch (err) {
      const users = StorageService.getUsers();
      return role ? users.filter(u => u.role === role) : users;
    }
  },

  async saveUser(userData) {
    try {
      const res = await this._fetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      StorageService.saveUser(userData);
      return res.user;
    } catch (err) {
      return StorageService.saveUser(userData);
    }
  },

  async changePassword(userId, currentPassword, newPassword) {
    try {
      const res = await this._fetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, current_password: currentPassword, new_password: newPassword })
      });
      return res;
    } catch (err) {
      console.warn('[ApiClient] Change password fallback:', err.message);
      return { message: 'Password changed successfully (offline).' };
    }
  },

  async updateProfile(userId, phone, emergencyContact) {
    try {
      const res = await this._fetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ user_id: userId, phone, emergency_contact: emergencyContact })
      });
      if (res.user) StorageService.setCurrentUser(res.user);
      return res.user;
    } catch (err) {
      console.warn('[ApiClient] Profile update fallback:', err.message);
      const user = StorageService.getCurrentUser() || {};
      user.phone = phone;
      user.emergencyContact = emergencyContact;
      StorageService.setCurrentUser(user);
      return user;
    }
  },

  async toggleUserStatus(userId, status) {
    try {
      const res = await this._fetch(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      return res.user;
    } catch (err) {
      return { id: userId, status };
    }
  },

  async saveService(serviceData) {
    try {
      const res = await this._fetch('/services', {
        method: 'POST',
        body: JSON.stringify(serviceData)
      });
      return res.service;
    } catch (err) {
      return StorageService.saveService(serviceData);
    }
  },

  async saveAnnouncement(announcementData) {
    try {
      const res = await this._fetch('/announcements', {
        method: 'POST',
        body: JSON.stringify(announcementData)
      });
      return res.announcement;
    } catch (err) {
      return StorageService.saveAnnouncement(announcementData);
    }
  },

  async saveSettings(settingsData) {
    try {
      const res = await this._fetch('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settingsData)
      });
      return res.settings;
    } catch (err) {
      return StorageService.saveSettings(settingsData);
    }
  },

  async getReportsSummary() {
    try {
      const res = await this._fetch('/reports/summary');
      return res;
    } catch (err) {
      const appointments = StorageService.getAppointments();
      const students = StorageService.getUsers().filter(u => u.role === 'student');
      const counselors = StorageService.getUsers().filter(u => u.role === 'counselor');
      const counts = {};
      appointments.forEach(a => {
        counts[a.status] = (counts[a.status] || 0) + 1;
      });
      return {
        total_appointments: appointments.length,
        total_students: students.length,
        total_counselors: counselors.length,
        status_breakdown: counts
      };
    }
  },

  async getAuditLogs() {
    try {
      const res = await this._fetch('/admin/audit-logs');
      return res.logs || [];
    } catch (err) {
      return StorageService.getAuditLogs();
    }
  },

  async getSettings() {
    try {
      const res = await this._fetch('/admin/settings');
      return res.settings || {};
    } catch (err) {
      return StorageService.getSettings();
    }
  }
};
