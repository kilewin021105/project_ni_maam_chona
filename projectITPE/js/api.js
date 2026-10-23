/**
 * BCC Guidance Appointment System — API Client
 *
 * Every call goes to the Flask server. There is no offline fallback: if the server says no,
 * the caller gets an Error with the server's message and shows it to the user.
 */

const ApiClient = {
  // Same address the page was loaded from, so it also works from a phone on the same Wi-Fi or when deployed
  BASE_URL: '/api/v1',

  async _fetch(endpoint, options = {}) {
    if (window.location.protocol === 'file:') {
      throw new Error('Open the system through the server (run "python app.py", then visit http://127.0.0.1:5000), not by double-clicking the HTML file.');
    }

    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = Session.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let res;
    try {
      res = await fetch(`${this.BASE_URL}${endpoint}`, { ...options, headers, signal: controller.signal });
    } catch (err) {
      throw new Error(err.name === 'AbortError'
        ? 'The server took too long to respond. Please try again.'
        : 'Cannot reach the server. Check that it is running and that you are connected.');
    } finally {
      clearTimeout(timeout);
    }

    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && token && !options.skipAuthRedirect) {
      // Session expired or account deactivated: send the user back to sign in
      Session.clear();
      const ctx = typeof getPortalContext === 'function' ? getPortalContext() : { loginUrl: 'login.html' };
      sessionStorage.setItem('bcc_login_notice', data.error || 'Please sign in again.');
      window.location.href = ctx.loginUrl;
      throw new Error(data.error || 'Please sign in again.');
    }
    if (!res.ok) {
      throw new Error(data.error || `The server returned an error (${res.status}).`);
    }
    return data;
  },

  _get(endpoint) { return this._fetch(endpoint); },
  _send(method, endpoint, payload) {
    return this._fetch(endpoint, { method, body: payload === undefined ? undefined : JSON.stringify(payload) });
  },

  // ── Authentication & own account ──

  async login(email, password, remember = true) {
    const res = await this._fetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }), skipAuthRedirect: true });
    const user = Utils.normalizeUser(res.user);
    Session.save(res.token, user, remember);
    return { ...res, user };
  },

  async registerStudent(studentData) {
    const res = await this._send('POST', '/auth/register', studentData);
    const user = Utils.normalizeUser(res.user);
    Session.save(res.token, user, true);
    return user;
  },

  async getMe() {
    const res = await this._get('/auth/me');
    const user = Utils.normalizeUser(res.user);
    Session.setUser(user);
    return user;
  },

  async logout() {
    try { await this._send('POST', '/auth/logout'); } catch (e) {}
    Session.clear();
  },

  async updateProfile(changes) {
    const res = await this._send('PUT', '/auth/profile', changes);
    const user = Utils.normalizeUser(res.user);
    Session.setUser(user);
    return user;
  },

  changePassword(currentPassword, newPassword) {
    return this._send('POST', '/auth/change-password', { current_password: currentPassword, new_password: newPassword });
  },

  // ── Catalog ──

  async getServices(activeOnly = true) {
    const res = await this._get(`/services?active_only=${activeOnly}`);
    return (res.services || []).map(s => Utils.normalizeService(s));
  },

  async getCounselors() {
    const res = await this._get('/counselors');
    return (res.counselors || []).map(c => Utils.normalizeUser(c));
  },

  /** Returns { slots: [{time, available, reason}], message } */
  getAvailableSlots(counselorId, date, options = {}) {
    const params = new URLSearchParams({ date });
    if (options.excludeId) params.append('exclude', options.excludeId);
    if (options.reschedule) params.append('mode', 'reschedule');
    return this._get(`/counselors/${encodeURIComponent(counselorId)}/slots?${params}`);
  },

  async getGuidanceResources() {
    const res = await this._get('/resources');
    return res.resources || [];
  },

  async getPublicSettings() {
    const res = await this._get('/settings');
    return res.settings || {};
  },

  // ── Appointments ──

  async getAppointments(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v && v !== 'All') params.append(k, v); });
    const res = await this._get(`/appointments${params.toString() ? `?${params}` : ''}`);
    return res.appointments || [];
  },

  async createAppointment(data) {
    const res = await this._send('POST', '/appointments', data);
    return res.appointment;
  },

  async updateAppointmentStatus(id, status, comments = '') {
    const res = await this._send('PATCH', `/appointments/${encodeURIComponent(id)}/status`, { status, comments });
    return res.appointment;
  },

  async rescheduleAppointment(id, date, timeSlot, reason) {
    const res = await this._send('POST', `/appointments/${encodeURIComponent(id)}/reschedule`, { date, time_slot: timeSlot, reason });
    return res.appointment;
  },

  submitFeedback(appointmentId, rating, comments = '') {
    return this._send('POST', `/appointments/${encodeURIComponent(appointmentId)}/feedback`, { rating, comments });
  },

  // ── Counselor tools ──

  async getSessionNotes(studentId = null) {
    const res = await this._get(`/counseling-records${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ''}`);
    return res.records || [];
  },

  createSessionNote(note) { return this._send('POST', '/counseling-records', note); },

  getAvailability() { return this._get('/counselor/availability'); },
  saveAvailability(days, maxDaily) { return this._send('PUT', '/counselor/availability', { days, max_daily_appointments: maxDaily }); },

  async getFollowUps() {
    const res = await this._get('/followups');
    return res.followups || [];
  },
  createFollowUp(task) { return this._send('POST', '/followups', task); },
  updateFollowUp(id, status) { return this._send('PATCH', `/followups/${encodeURIComponent(id)}`, { status }); },
  remindFollowUp(id) { return this._send('POST', `/followups/${encodeURIComponent(id)}/remind`); },

  // ── Announcements & notifications ──

  async getAnnouncements() {
    const res = await this._get('/announcements');
    return (res.announcements || []).map(a => Utils.normalizeAnnouncement(a));
  },
  saveAnnouncement(data) { return this._send('POST', '/announcements', data); },
  deleteAnnouncement(id) { return this._send('DELETE', `/announcements/${encodeURIComponent(id)}`); },

  async getNotifications() {
    const res = await this._get('/notifications');
    return res.notifications || [];
  },
  markNotificationRead(id) { return this._send('PATCH', `/notifications/${encodeURIComponent(id)}/read`); },
  markAllNotificationsRead() { return this._send('PATCH', '/notifications/read-all'); },

  // ── Administration ──

  async getUsers(role = null) {
    const res = await this._get(`/admin/users${role ? `?role=${encodeURIComponent(role)}` : ''}`);
    return (res.users || []).map(u => Utils.normalizeUser(u));
  },
  createUser(data) { return this._send('POST', '/admin/users', data); },
  updateUser(id, data) { return this._send('PUT', `/admin/users/${encodeURIComponent(id)}`, data); },
  setUserStatus(id, status) { return this._send('PATCH', `/admin/users/${encodeURIComponent(id)}/status`, { status }); },
  resetUserPassword(id, newPassword) { return this._send('POST', `/admin/users/${encodeURIComponent(id)}/reset-password`, { new_password: newPassword }); },
  deleteUser(id) { return this._send('DELETE', `/admin/users/${encodeURIComponent(id)}`); },

  saveService(data) { return this._send('POST', '/services', data); },
  deleteService(id) { return this._send('DELETE', `/services/${encodeURIComponent(id)}`); },

  async getSettings() {
    const res = await this._get('/admin/settings');
    return res.settings || {};
  },
  saveSettings(data) { return this._send('PUT', '/admin/settings', data); },

  getReportsSummary() { return this._get('/reports/summary'); },

  async getAuditLogs() {
    const res = await this._get('/admin/audit-logs');
    return res.logs || [];
  }
};
