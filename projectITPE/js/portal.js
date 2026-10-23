/**
 * Buenavista Community College — Guidance Appointment System
 * Shared Portal Controller for Multi-Page HTML Architecture
 */

function getPortalContext() {
  const full = (window.location.pathname + ' ' + window.location.href).replace(/\\/g, '/').toLowerCase();
  const isSubdir = full.includes('/student/') || full.includes('/counselor/') || full.includes('/admin/');
  return {
    isSubdir,
    prefix: isSubdir ? '../' : '',
    loginUrl: isSubdir ? '../login.html' : 'login.html'
  };
}

const Portal = {
  currentUser: null,

  init(expectedRole = 'student') {
    // 1. Ensure Storage is initialized
    StorageService.init();

    // 2. Resolve Current User & Enforce Auth
    const user = StorageService.getCurrentUser();
    const ctx = getPortalContext();

    if (!user) {
      // User is not authenticated -> Redirect directly to dedicated login page
      window.location.href = ctx.loginUrl;
      return;
    }

    if (expectedRole && user.role !== expectedRole) {
      // Show professional institutional Role Access Barrier rather than jarring redirect loops
      this.showRoleBoundaryModal(user, expectedRole, ctx);
      return;
    }

    this.currentUser = user;

    // 3. Hydrate User Info across Sidebar and Topbar
    this.hydrateUserInfo();

    // 4. Attach Shell Events (Mobile Sidebar, Notifications, Logout)
    this.attachShellEvents();

    // 5. Render Notifications
    this.renderNotifications();
  },

  showRoleBoundaryModal(currentUser, expectedRole, ctx) {
    const roleLabels = {
      student: 'Student',
      counselor: 'Guidance Counselor',
      admin: 'System Administrator'
    };
    const expectedLabel = roleLabels[expectedRole] || expectedRole;
    const currentLabel = roleLabels[currentUser.role] || currentUser.role;

    // Demo account mapping for seamless multi-role testing
    const demoAccounts = {
      student: 'juan.delacruz@buenavista.edu.ph',
      counselor: 'msantos.guidance@buenavista.edu.ph',
      admin: 'admin.guidance@buenavista.edu.ph'
    };

    const targetDemoEmail = demoAccounts[expectedRole];
    const userHomeUrl = `${ctx.prefix}${currentUser.role}/dashboard.html`;

    const barrierEl = document.createElement('div');
    barrierEl.className = 'modal-backdrop open';
    barrierEl.style.zIndex = '99999';
    barrierEl.innerHTML = `
      <div class="modal-dialog" style="max-width: 520px; text-align: center; padding: 2rem 1.5rem;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: #fef2f2; color: #dc2626; display: flex; items-center; justify-content: center; margin: 0 auto 1.25rem; font-size: 26px;">
          🔒
        </div>
        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--slate-900); margin-bottom: 0.5rem;">
          Restricted Portal Access
        </h3>
        <p style="font-size: var(--text-sm); color: var(--slate-600); line-height: 1.6; margin-bottom: 1.5rem;">
          You are currently signed in as <strong>${currentUser.name}</strong> with the <strong>${currentLabel}</strong> role.<br>
          This portal section requires authorized <strong>${expectedLabel}</strong> credentials.
        </p>

        <div style="display: flex; flex-direction: column; gap: 0.65rem;">
          ${targetDemoEmail ? `
            <button type="button" class="btn btn-primary btn-lg w-full" id="btn-barrier-switch">
              Switch to ${expectedLabel} Demo Account
            </button>
          ` : ''}
          <button type="button" class="btn btn-secondary w-full" id="btn-barrier-logout">
            Sign Out &amp; Return to Login
          </button>
          <button type="button" class="btn btn-outline w-full" id="btn-barrier-return">
            &larr; Return to My ${currentLabel} Portal
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(barrierEl);
    document.body.style.overflow = 'hidden';

    // Event listeners
    if (targetDemoEmail) {
      barrierEl.querySelector('#btn-barrier-switch').addEventListener('click', () => {
        const users = StorageService.getUsers();
        const demoUser = users.find(u => u.email.toLowerCase() === targetDemoEmail.toLowerCase());
        if (demoUser) {
          StorageService.setCurrentUser(demoUser);
          window.location.reload();
        } else {
          this.logout(false);
        }
      });
    }

    barrierEl.querySelector('#btn-barrier-logout').addEventListener('click', () => {
      this.logout(false);
    });

    barrierEl.querySelector('#btn-barrier-return').addEventListener('click', () => {
      window.location.href = userHomeUrl;
    });
  },

  hydrateUserInfo() {
    const user = this.currentUser;
    if (!user) return;

    // Sidebar User
    const sbAvatar = document.querySelector('.sidebar-avatar');
    if (sbAvatar) {
      sbAvatar.textContent = user.avatarInitial || user.name.charAt(0);
      sbAvatar.className = `sidebar-avatar ${user.role}`;
    }

    const sbName = document.querySelector('.sidebar-user-name');
    if (sbName) sbName.textContent = user.name;

    const sbRole = document.querySelector('.sidebar-user-role');
    if (sbRole) {
      const courseInfo = user.course ? ` • ${user.course} ${user.yearSection || ''}` : '';
      sbRole.textContent = `${user.role.toUpperCase()}${courseInfo}`;
    }

    // Topbar User
    const tbAvatar = document.querySelector('.topbar-avatar');
    if (tbAvatar) {
      tbAvatar.textContent = user.avatarInitial || user.name.charAt(0);
      tbAvatar.className = `topbar-avatar ${user.role}`;
    }

    const tbName = document.querySelector('.topbar-user-info .u-name');
    if (tbName) tbName.textContent = user.name;

    const tbRole = document.querySelector('.topbar-user-info .u-role');
    if (tbRole) tbRole.textContent = user.role.toUpperCase();

    // Mount Topbar User Dropdown Menu
    const tbUser = document.querySelector('.topbar-user');
    if (tbUser && !tbUser.dataset.hasDropdown) {
      tbUser.dataset.hasDropdown = 'true';
      tbUser.title = 'Click to open account menu';

      const dropdown = document.createElement('div');
      dropdown.className = 'topbar-user-dropdown';
      dropdown.id = 'topbar-user-dropdown';
      dropdown.innerHTML = `
        <div class="user-dd-header">
          <div class="user-dd-name">${user.name}</div>
          <div class="user-dd-role">${user.role.toUpperCase()} • BCC GUIDANCE</div>
        </div>
        <div class="user-dd-body">
          <button type="button" class="user-dd-item btn-logout" data-action="logout" style="width: 100%; text-align: left; background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1rem; color: #dc2626; font-size: 13px; font-weight: 600;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Sign Out / Log Out</span>
          </button>
        </div>
      `;
      tbUser.appendChild(dropdown);

      tbUser.addEventListener('click', (e) => {
        if (e.target.closest('.user-dd-item')) return;
        dropdown.classList.toggle('open');
      });

      document.addEventListener('click', (e) => {
        if (!tbUser.contains(e.target)) {
          dropdown.classList.remove('open');
        }
      });
    }
  },

  logout(confirmPrompt = true) {
    const doLogout = () => {
      try {
        StorageService.clearCurrentUser();
        localStorage.removeItem('bcc_current_user');
        sessionStorage.clear();
      } catch (e) {
        console.error('Error clearing storage:', e);
      }

      if (typeof ApiClient !== 'undefined' && ApiClient.logout) {
        ApiClient.logout().catch(() => {});
      }

      const ctx = getPortalContext();
      window.location.href = ctx.loginUrl;
    };

    if (!confirmPrompt) {
      doLogout();
      return;
    }

    try {
      if (typeof Modal !== 'undefined' && typeof Modal.confirm === 'function') {
        Modal.confirm({
          title: 'Sign Out Confirmation',
          message: 'Are you sure you want to sign out from the BCC Guidance System?',
          confirmText: 'Sign Out',
          confirmType: 'btn-primary',
          onConfirm: doLogout
        });
      } else {
        if (confirm('Are you sure you want to sign out?')) {
          doLogout();
        }
      }
    } catch (e) {
      doLogout();
    }
  },

  attachShellEvents() {
    // Mobile Sidebar Toggle
    const mobileBtn = document.querySelector('.btn-mobile-menu');
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (mobileBtn && sidebar) {
      mobileBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('open');
      });
    }

    if (overlay && sidebar) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
      });
    }

    // Notification Popover Toggle
    const notifBtn = document.getElementById('topbar-notif-btn') || document.querySelector('.topbar-icon-btn');
    const notifPop = document.getElementById('topbar-notif-popover') || document.querySelector('.notif-dropdown');

    if (notifBtn && notifPop) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifPop.classList.toggle('open');
      });

      document.addEventListener('click', (e) => {
        if (!notifPop.contains(e.target) && !notifBtn.contains(e.target)) {
          notifPop.classList.remove('open');
        }
      });
    }

    // Attach Logout Click Listeners to All Triggers
    document.querySelectorAll('.btn-sidebar-logout, .btn-logout, [data-action="logout"], #topbar-logout-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.logout();
      });
    });
  },

  renderNotifications() {
    const listEl = document.querySelector('.notif-list');
    if (!listEl) return;

    const notifications = StorageService.getNotifications();
    const user = this.currentUser;
    const userNotifs = notifications.filter(n => !n.userId || n.userId === user.id);

    if (userNotifs.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 2rem 1rem; text-align: center; color: var(--slate-400); font-size: var(--text-xs);">
          No notifications at this time.
        </div>
      `;
      return;
    }

    listEl.innerHTML = userNotifs.slice(0, 5).map(n => `
      <div class="notif-row ${n.read ? '' : 'unread'}">
        <div class="notif-icon-wrap" style="background: var(--bcc-subtle); color: var(--bcc-brand);">
          ${Icons.get('bell')}
        </div>
        <div class="notif-body">
          <div class="n-title">${n.title}</div>
          <div class="n-msg">${n.message}</div>
          <div class="n-time">${n.timestamp || 'Just now'}</div>
        </div>
      </div>
    `).join('');
  }
};
