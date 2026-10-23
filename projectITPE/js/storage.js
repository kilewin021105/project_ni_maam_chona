/**
 * BCC Guidance Appointment System — Session storage
 *
 * Holds only the signed-in user's token and profile. All real data lives on the server.
 * "Keep me signed in" stores the session in localStorage; otherwise it lasts until the browser closes.
 */

const Session = {
  TOKEN_KEY: 'bcc_session_token',
  USER_KEY: 'bcc_session_user',

  _stores() {
    const stores = [];
    try { stores.push(window.sessionStorage); } catch (e) {}
    try { stores.push(window.localStorage); } catch (e) {}
    return stores;
  },

  _activeStore() {
    return this._stores().find(s => s.getItem(this.TOKEN_KEY)) || null;
  },

  save(token, user, remember = true) {
    this.clear();
    const stores = this._stores();
    const store = remember ? stores.find(s => s === window.localStorage) : stores.find(s => s === window.sessionStorage);
    if (!store) return;
    store.setItem(this.TOKEN_KEY, token);
    store.setItem(this.USER_KEY, JSON.stringify(user));
  },

  getToken() {
    const store = this._activeStore();
    return store ? store.getItem(this.TOKEN_KEY) : null;
  },

  getUser() {
    const store = this._activeStore();
    if (!store) return null;
    try {
      return JSON.parse(store.getItem(this.USER_KEY));
    } catch (e) {
      return null;
    }
  },

  setUser(user) {
    const store = this._activeStore();
    if (store) store.setItem(this.USER_KEY, JSON.stringify(user));
  },

  clear() {
    this._stores().forEach(s => {
      s.removeItem(this.TOKEN_KEY);
      s.removeItem(this.USER_KEY);
    });
  },

  dashboardFor(role, prefix = '') {
    return `${prefix}${['student', 'counselor', 'admin'].includes(role) ? role : 'student'}/dashboard.html`;
  }
};

// Remove data left behind by the old offline mode (it stored copies of every record, including demo passwords)
(function removeLegacyData() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('bcc_bv_') || k === 'bcc_jwt_token' || k === 'bcc_followup_reminders')
      .forEach(k => localStorage.removeItem(k));
  } catch (e) {}
})();
