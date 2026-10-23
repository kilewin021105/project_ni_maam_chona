/**
 * Buenavista Community College — Guidance Appointment System
 * Shared portal shell: session check, role guard, user menu, notifications, logout
 */

function getPortalContext() {
  const path = window.location.pathname.replace(/\\/g, '/').toLowerCase();
  const isSubdir = /\/(student|counselor|admin)\//.test(path);
  return {
    isSubdir,
    prefix: isSubdir ? '../' : '',
    loginUrl: isSubdir ? '../login.html' : 'login.html'
  };
}

const ROLE_LABELS = { student: 'Student', counselor: 'Guidance Counselor', admin: 'Administrator' };

const Portal = {
  currentUser: null,
  notifications: [],

  /**
   * Checks the session with the server and enforces the page's role.
   * Returns the signed-in user, or null when the page should not continue.
   */
  async init(expectedRole) {
    const ctx = getPortalContext();
    const cached = Session.getUser();
    if (!Session.getToken() || !cached) {
      // Keep a more specific message (e.g. "account deactivated") if one is already waiting
      try {
        if (!sessionStorage.getItem('bcc_login_notice')) sessionStorage.setItem('bcc_login_notice', 'Please sign in to continue.');
      } catch (e) {}
      window.location.replace(ctx.loginUrl);
      return null;
    }

    // Show the cached profile right away, then confirm it with the server
    this.currentUser = cached;
    if (cached.role === expectedRole) {
      this.hydrateUserInfo();
      this.attachShellEvents();
    }

    let fresh;
    try {
      fresh = await ApiClient.getMe();
    } catch (err) {
      Toast.error('Connection problem', err.message);
      return null;
    }

    if (fresh.role !== expectedRole) {
      this.showRoleBoundary(fresh, expectedRole, ctx);
      return null;
    }

    this.currentUser = fresh;
    this.hydrateUserInfo();
    if (cached.role !== expectedRole) this.attachShellEvents();
    this.loadNotifications();
    setInterval(() => this.loadNotifications(), 60000);
    return fresh;
  },

  showRoleBoundary(user, expectedRole, ctx) {
    const barrier = document.createElement('div');
    barrier.className = 'modal-backdrop open';
    barrier.style.zIndex = '99999';
    barrier.innerHTML = `
      <div class="modal-dialog" style="max-width: 480px; text-align: center; padding: 2rem 1.5rem;" role="alertdialog" aria-labelledby="barrier-title">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: #fef2f2; color: #dc2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem;">
          ${Icons.get('shield')}
        </div>
        <h3 id="barrier-title" style="font-size: 1.2rem; font-weight: 800; color: var(--slate-900); margin-bottom: 0.5rem;">You don't have access to this page</h3>
        <p style="font-size: var(--text-sm); color: var(--slate-600); line-height: 1.6; margin-bottom: 1.5rem;">
          You are signed in as <strong>${esc(user.name)}</strong> (${esc(ROLE_LABELS[user.role] || user.role)}).
          This page is for ${esc(ROLE_LABELS[expectedRole] || expectedRole)} accounts only.
        </p>
        <div style="display: flex; flex-direction: column; gap: 0.65rem;">
          <a class="btn btn-primary w-full" href="${Session.dashboardFor(user.role, ctx.prefix)}">Go to my dashboard</a>
          <button type="button" class="btn btn-secondary w-full" id="btn-barrier-logout">Sign out</button>
        </div>
      </div>
    `;
    document.body.appendChild(barrier);
    document.body.style.overflow = 'hidden';
    barrier.querySelector('#btn-barrier-logout').addEventListener('click', () => this.logout(false));
  },

  hydrateUserInfo() {
    const user = this.currentUser;
    if (!user) return;
    const initial = user.avatarInitial || (user.name || '?').charAt(0);
    const courseInfo = user.role === 'student' && user.course ? ` • ${user.course} ${user.yearSection || ''}`.trimEnd() : '';

    document.querySelectorAll('.sidebar-avatar, .topbar-avatar').forEach(el => {
      el.textContent = initial;
      el.className = `${el.classList.contains('sidebar-avatar') ? 'sidebar-avatar' : 'topbar-avatar'} ${user.role}`;
    });
    document.querySelectorAll('.sidebar-user-name, .topbar-user-info .u-name').forEach(el => { el.textContent = user.name; });
    const sbRole = document.querySelector('.sidebar-user-role');
    if (sbRole) sbRole.textContent = `${(ROLE_LABELS[user.role] || user.role).toUpperCase()}${courseInfo}`;
    const tbRole = document.querySelector('.topbar-user-info .u-role');
    if (tbRole) tbRole.textContent = (ROLE_LABELS[user.role] || user.role).toUpperCase();

    // The old topbar search box never did anything
    document.querySelectorAll('.topbar-search').forEach(el => el.remove());

    const tbUser = document.querySelector('.topbar-user');
    if (tbUser && !tbUser.dataset.hasDropdown) {
      tbUser.dataset.hasDropdown = 'true';
      tbUser.setAttribute('role', 'button');
      tbUser.setAttribute('tabindex', '0');
      tbUser.setAttribute('aria-haspopup', 'true');
      tbUser.title = 'Account menu';

      const dropdown = document.createElement('div');
      dropdown.className = 'topbar-user-dropdown';
      dropdown.innerHTML = `
        <div class="user-dd-header">
          <div class="user-dd-name"></div>
          <div class="user-dd-role"></div>
        </div>
        <div class="user-dd-body">
          <button type="button" class="user-dd-item" data-action="password" style="width: 100%; text-align: left; background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1rem; color: var(--slate-700); font-size: 13px; font-weight: 600;">
            ${Icons.get('shield')} <span>Change password</span>
          </button>
          <button type="button" class="user-dd-item" data-action="logout" style="width: 100%; text-align: left; background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1rem; color: #dc2626; font-size: 13px; font-weight: 600;">
            ${Icons.get('logOut')} <span>Sign out</span>
          </button>
        </div>
      `;
      tbUser.appendChild(dropdown);
      tbUser.addEventListener('click', (e) => {
        if (e.target.closest('.user-dd-item')) return;
        dropdown.classList.toggle('open');
      });
      tbUser.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dropdown.classList.toggle('open'); }
        if (e.key === 'Escape') dropdown.classList.remove('open');
      });
      document.addEventListener('click', (e) => {
        if (!tbUser.contains(e.target)) dropdown.classList.remove('open');
      });
    }
    const ddName = document.querySelector('.user-dd-name');
    if (ddName) ddName.textContent = user.name;
    const ddRole = document.querySelector('.user-dd-role');
    if (ddRole) ddRole.textContent = `${(ROLE_LABELS[user.role] || user.role).toUpperCase()} • BCC GUIDANCE`;
  },

  logout(confirmFirst = true) {
    const doLogout = async () => {
      await ApiClient.logout();
      window.location.href = getPortalContext().loginUrl;
    };
    if (!confirmFirst) {
      doLogout();
      return;
    }
    Modal.confirm({
      title: 'Sign out',
      message: 'Are you sure you want to sign out of the BCC Guidance System?',
      confirmText: 'Sign out',
      onConfirm: doLogout
    });
  },

  attachShellEvents() {
    if (this._shellAttached) return;
    this._shellAttached = true;

    const mobileBtn = document.querySelector('.btn-mobile-menu');
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const closeSidebar = () => {
      sidebar && sidebar.classList.remove('open');
      overlay && overlay.classList.remove('open');
    };
    if (mobileBtn && sidebar) {
      mobileBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay && overlay.classList.toggle('open');
      });
    }
    overlay && overlay.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSidebar(); });

    const notifBtn = document.getElementById('topbar-notif-btn');
    const notifPop = document.getElementById('topbar-notif-popover');
    if (notifBtn && notifPop) {
      notifBtn.setAttribute('aria-haspopup', 'true');
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifPop.classList.toggle('open');
      });
      document.addEventListener('click', (e) => {
        if (!notifPop.contains(e.target) && !notifBtn.contains(e.target)) notifPop.classList.remove('open');
      });
    }

    document.querySelectorAll('.btn-sidebar-logout, [data-action="logout"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.logout();
      });
    });
    // The dropdown is created after this runs, so listen at the document level for its logout item
    document.addEventListener('click', (e) => {
      if (e.target.closest('.user-dd-item[data-action="logout"]')) {
        e.preventDefault();
        this.logout();
      }
      if (e.target.closest('.user-dd-item[data-action="password"]')) {
        e.preventDefault();
        document.querySelectorAll('.topbar-user-dropdown').forEach(d => d.classList.remove('open'));
        PasswordDialog.open();
      }
    });
  },

  async loadNotifications() {
    const listEl = document.querySelector('.notif-list');
    if (!listEl) return;
    try {
      this.notifications = await ApiClient.getNotifications();
    } catch (e) {
      return;
    }
    this.renderNotifications();
  },

  renderNotifications() {
    const listEl = document.querySelector('.notif-list');
    const indicator = document.querySelector('.notif-indicator');
    const head = document.querySelector('.notif-head');
    const unread = this.notifications.filter(n => !n.is_read);

    if (indicator) indicator.style.display = unread.length ? '' : 'none';
    if (head) {
      head.innerHTML = `
        <span>Notifications${unread.length ? ` (${unread.length})` : ''}</span>
        ${unread.length ? '<button type="button" class="btn btn-sm btn-outline" id="notif-mark-all" style="padding: 2px 8px; font-size: 11px;">Mark all read</button>' : ''}
      `;
      const markAll = head.querySelector('#notif-mark-all');
      if (markAll) {
        markAll.addEventListener('click', async (e) => {
          e.stopPropagation();
          await ApiClient.markAllNotificationsRead().catch(() => {});
          this.notifications.forEach(n => { n.is_read = true; });
          this.renderNotifications();
        });
      }
    }

    if (!this.notifications.length) {
      listEl.innerHTML = '<div style="padding: 2rem 1rem; text-align: center; color: var(--slate-400); font-size: var(--text-xs);">No notifications yet.</div>';
      return;
    }

    listEl.innerHTML = this.notifications.slice(0, 15).map(n => `
      <div class="notif-row ${n.is_read ? '' : 'unread'}" data-id="${esc(n.id)}" data-link="${esc(n.link || '')}" role="button" tabindex="0">
        <div class="notif-icon-wrap" style="background: var(--bcc-subtle); color: var(--bcc-brand);">${Icons.get('bell')}</div>
        <div class="notif-body">
          <div class="n-title">${esc(n.title)}</div>
          <div class="n-msg">${esc(n.message)}</div>
          <div class="n-time">${esc(Utils.timeAgo(n.created_at))}</div>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.notif-row').forEach(row => {
      const open = async () => {
        const n = this.notifications.find(x => x.id === row.dataset.id);
        if (n && !n.is_read) {
          n.is_read = true;
          ApiClient.markNotificationRead(n.id).catch(() => {});
        }
        const link = row.dataset.link;
        if (link && link.startsWith(`${this.currentUser.role}/`)) {
          window.location.href = getPortalContext().prefix + link;
        } else {
          this.renderNotifications();
        }
      };
      row.addEventListener('click', open);
      row.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
    });
  }
};

/** Change-password dialog shared by all portals. */
const PasswordDialog = {
  open() {
    const modal = Modal.open({
      title: '🔒 Change password',
      size: 'modal-md',
      content: `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <div class="form-group" style="margin: 0;">
            <label class="form-label required" for="cp-current">Current password</label>
            <input type="password" id="cp-current" class="form-input" autocomplete="current-password">
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label required" for="cp-new">New password</label>
            <input type="password" id="cp-new" class="form-input" autocomplete="new-password" placeholder="At least 8 characters">
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label required" for="cp-confirm">Confirm new password</label>
            <input type="password" id="cp-confirm" class="form-input" autocomplete="new-password">
          </div>
        </div>`,
      footer: `
        <button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
        <button type="button" class="btn btn-primary" id="btn-save-pass">Update password</button>`
    });
    const save = modal.querySelector('#btn-save-pass');
    save.addEventListener('click', async () => {
      const current = modal.querySelector('#cp-current').value;
      const next = modal.querySelector('#cp-new').value;
      const confirmPw = modal.querySelector('#cp-confirm').value;
      if (!current || !next || !confirmPw) return Toast.warning('Missing information', 'Please fill in all three fields.');
      if (next.length < 8) return Toast.warning('Password too short', 'Use at least 8 characters.');
      if (next !== confirmPw) return Toast.warning('Passwords don’t match', 'Type the same new password twice.');
      try {
        await Utils.withBusy(save, 'Updating…', () => ApiClient.changePassword(current, next));
        Modal.close();
        Toast.success('Password changed', 'Use your new password next time you sign in.');
      } catch (err) {
        Toast.error('Password not changed', err.message);
      }
    });
  }
};
