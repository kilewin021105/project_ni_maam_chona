/**
 * Buenavista Community College — Guidance Appointment System
 * Application Router & Main Controller
 */

const App = {
  currentRole: 'student',
  currentTab: 'dashboard',

  async init() {
    StorageService.init();
    Toast.init();

    const currentUser = StorageService.getCurrentUser();
    this.currentRole = currentUser ? currentUser.role : 'student';

    this.renderSidebar();
    this.renderTopbar();
    this.attachGlobalListeners();

    // Navigate to initial view
    this.navigateTo(this.currentRole, 'dashboard');
  },

  /* --------------------------------------------------------------------------
     Navigation & Routing
     -------------------------------------------------------------------------- */
  async navigateTo(role, tab = 'dashboard') {
    this.currentRole = role;
    this.currentTab = tab;

    const sidebar = document.getElementById('app-sidebar');
    const topbar = document.getElementById('app-topbar');
    const mainContent = document.getElementById('main-content');

    if (role === 'auth') {
      if (sidebar) sidebar.style.display = 'none';
      if (topbar) topbar.style.display = 'none';
      if (mainContent) mainContent.classList.add('is-public');
    } else {
      if (sidebar) sidebar.style.display = 'flex';
      if (topbar) topbar.style.display = 'flex';
      if (mainContent) mainContent.classList.remove('is-public');
    }

    // Update Role Bar Active Buttons
    document.querySelectorAll('.demo-role-btn').forEach(btn => {
      if (btn.getAttribute('data-role') === role) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    // Update Sidebar Navigation
    this.updateSidebarNav(role, tab);

    // Update Topbar Title
    this.updateTopbarTitle(role, tab);

    // Render Target View
    if (role === 'student') {
      await StudentView.render(tab);
    } else if (role === 'counselor') {
      await CounselorView.render(tab);
    } else if (role === 'admin') {
      await AdminView.render(tab);
    } else if (role === 'auth') {
      await AuthView.render();
    }

    this.closeMobileSidebar();
  },

  async navigateToRole(newRole) {
    const users = StorageService.getUsers();
    let targetUser = users.find(u => u.role === newRole);
    if (!targetUser) targetUser = users[0];

    StorageService.setCurrentUser(targetUser);
    this.currentRole = newRole;
    this.renderSidebar();
    this.renderTopbar();
    this.navigateTo(newRole, 'dashboard');
  },

  /* --------------------------------------------------------------------------
     UI Shell Renders
     -------------------------------------------------------------------------- */
  renderRoleBar() {
    const roleBar = document.getElementById('demo-role-bar');
    if (!roleBar) return;

    roleBar.innerHTML = `
      <div class="demo-bar-brand">
        <span class="demo-bar-tag">BCC GUIDANCE</span>
        <span>Buenavista Community College &bull; Student Services</span>
      </div>
      <div class="demo-bar-actions">
        <span style="font-size: 11px; color: var(--slate-400); margin-right: 4px;">Switch Role:</span>
        <button class="demo-role-btn ${this.currentRole === 'student' ? 'active' : ''}" data-role="student">
          ${Icons.get('user')} Student
        </button>
        <button class="demo-role-btn ${this.currentRole === 'counselor' ? 'active' : ''}" data-role="counselor">
          ${Icons.get('heart')} Counselor
        </button>
        <button class="demo-role-btn ${this.currentRole === 'admin' ? 'active' : ''}" data-role="admin">
          ${Icons.get('shield')} Admin
        </button>
        <button class="demo-role-btn" id="demo-btn-auth" style="border-color: rgba(220,38,38,0.4); color: #fca5a5;">
          ${Icons.get('logOut')} Sign In Page
        </button>
      </div>
    `;

    roleBar.querySelectorAll('.demo-role-btn[data-role]').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = btn.getAttribute('data-role');
        this.navigateToRole(r);
      });
    });

    const authBtn = roleBar.querySelector('#demo-btn-auth');
    if (authBtn) {
      authBtn.addEventListener('click', () => {
        this.navigateTo('auth', 'login');
      });
    }
  },

  renderSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    if (!sidebar) return;

    const user = StorageService.getCurrentUser();
    const role = user ? user.role : 'student';

    let navItems = [];

    if (role === 'student') {
      navItems = [
        { tab: 'dashboard', label: 'Dashboard', icon: 'grid' },
        { tab: 'services', label: 'Guidance Services', icon: 'book-open' },
        { tab: 'book', label: 'Book Appointment', icon: 'plus' },
        { tab: 'appointments', label: 'My Appointments', icon: 'calendar' },
        { tab: 'history', label: 'Counseling History', icon: 'clipboard' },
        { tab: 'profile', label: 'Student Profile', icon: 'user' }
      ];
    } else if (role === 'counselor') {
      navItems = [
        { tab: 'dashboard', label: 'Dashboard', icon: 'grid' },
        { tab: 'appointments', label: 'Appointment Queue', icon: 'clock' },
        { tab: 'schedule', label: 'My Schedule', icon: 'calendar' },
        { tab: 'notes', label: 'SOAP Case Notes', icon: 'file-text' },
        { tab: 'followups', label: 'Follow-Up Tracker', icon: 'heart' },
        { tab: 'reports', label: 'Counselor Reports', icon: 'barChart' }
      ];
    } else if (role === 'admin') {
      navItems = [
        { tab: 'dashboard', label: 'Executive Dashboard', icon: 'grid' },
        { tab: 'users', label: 'User Accounts', icon: 'users' },
        { tab: 'services', label: 'Services Catalog', icon: 'book-open' },
        { tab: 'appointments', label: 'Master Appointments', icon: 'calendar' },
        { tab: 'announcements', label: 'Bulletins & Notices', icon: 'bell' },
        { tab: 'reports', label: 'Campus Analytics', icon: 'barChart' },
        { tab: 'settings', label: 'System Settings', icon: 'settings' },
        { tab: 'logs', label: 'Audit Logs', icon: 'shield' }
      ];
    }

    sidebar.innerHTML = `
      <div class="sidebar-header">
        <div class="sidebar-logo-wrap">
          <img src="pictures/BCC_logo.png" alt="BCC Logo" class="sidebar-logo">
        </div>
        <div class="sidebar-school-name">
          <div class="line1">BUENAVISTA C.C.</div>
          <div class="line2">Guidance Office</div>
        </div>
      </div>

      <div class="sidebar-user">
        <div class="sidebar-avatar ${role}">${user ? (user.avatarInitial || 'U') : 'U'}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${user ? user.name : 'Guest User'}</div>
          <div class="sidebar-user-role">${role.toUpperCase()} ${user && user.course ? `&bull; ${user.course}` : ''}</div>
        </div>
      </div>

      <nav class="sidebar-nav" aria-label="Main Menu">
        <div class="nav-group-label">Navigation</div>
        ${navItems.map(item => `
          <a class="nav-item ${this.currentTab === item.tab ? 'active' : ''}" data-tab="${item.tab}">
            ${Icons.get(item.icon)}
            <span>${item.label}</span>
          </a>
        `).join('')}
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-footer-logo">
          <img src="pictures/BSIT_logo.png" alt="BSIT Logo">
          <span>BSIT Guidance System</span>
        </div>
        <button class="btn-sidebar-logout" id="sidebar-btn-logout" title="Sign Out">
          ${Icons.get('logOut')}
        </button>
      </div>
    `;

    sidebar.querySelectorAll('.nav-item').forEach(link => {
      link.addEventListener('click', () => {
        const tab = link.getAttribute('data-tab');
        this.navigateTo(this.currentRole, tab);
      });
    });

    const logoutBtn = sidebar.querySelector('#sidebar-btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.navigateTo('auth', 'login');
      });
    }
  },

  renderTopbar() {
    const topbar = document.getElementById('app-topbar');
    if (!topbar) return;

    const user = StorageService.getCurrentUser();
    const notifs = user ? StorageService.getNotifications(user.id) : [];
    const unreadCount = notifs.filter(n => !n.isRead).length;

    topbar.innerHTML = `
      <div class="topbar-left">
        <button class="btn-mobile-menu" id="btn-toggle-mobile-sidebar" aria-label="Toggle Navigation">
          ${Icons.get('menu')}
        </button>
        <div>
          <div class="topbar-title" id="topbar-title-text">Dashboard</div>
          <div class="topbar-subtitle" id="topbar-subtitle-text">Buenavista Community College &bull; Guidance Services</div>
        </div>
      </div>

      <div class="topbar-right">
        <div class="topbar-search">
          ${Icons.get('search')}
          <input type="text" placeholder="Search appointments, counselors..." id="global-search-input">
        </div>

        <div class="relative">
          <button class="topbar-icon-btn" id="btn-topbar-notifications" aria-label="Notifications">
            ${Icons.get('bell')}
            ${unreadCount > 0 ? '<span class="notif-indicator"></span>' : ''}
          </button>

          <!-- Notification Dropdown -->
          <div class="notif-dropdown" id="topbar-notif-popover">
            <div class="notif-head">
              <span>Notifications</span>
              <button class="btn btn-sm btn-outline" id="btn-mark-all-read" style="padding: 0.15rem 0.5rem; font-size: 11px;">
                Mark all read
              </button>
            </div>
            <div class="notif-list" id="topbar-notif-list">
              ${notifs.length === 0 ? `
                <div class="empty-state" style="padding: 1.5rem;">
                  <p class="text-sm text-muted">No new notifications</p>
                </div>
              ` : notifs.map(n => `
                <div class="notif-row ${!n.isRead ? 'unread' : ''}" data-notif-id="${n.id}">
                  <div class="notif-icon-wrap" style="background: ${n.type === 'success' ? '#dcfce7' : (n.type === 'error' ? '#fee2e2' : '#e0f2fe')}; color: ${n.type === 'success' ? '#16a34a' : (n.type === 'error' ? '#dc2626' : '#0284c7')};">
                    ${Icons.get(n.type === 'success' ? 'check-circle' : 'info')}
                  </div>
                  <div class="notif-body">
                    <div class="n-title">${n.title}</div>
                    <div class="n-msg">${n.message}</div>
                    <div class="n-time">${new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="topbar-user">
          <div class="topbar-avatar ${this.currentRole}">
            ${user ? (user.avatarInitial || 'U') : 'U'}
          </div>
          <div class="topbar-user-info">
            <div class="u-name">${user ? user.name : 'Guest'}</div>
            <div class="u-role">${this.currentRole}</div>
          </div>
        </div>
      </div>
    `;

    // Notifications Dropdown Toggle
    const notifBtn = topbar.querySelector('#btn-topbar-notifications');
    const notifPopover = topbar.querySelector('#topbar-notif-popover');
    if (notifBtn && notifPopover) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifPopover.classList.toggle('open');
      });
      document.addEventListener('click', () => notifPopover.classList.remove('open'));
    }

    // Mark All Read
    const markReadBtn = topbar.querySelector('#btn-mark-all-read');
    if (markReadBtn && user) {
      markReadBtn.addEventListener('click', () => {
        StorageService.markAllNotificationsAsRead(user.id);
        Toast.info('Notifications', 'All marked as read.');
        this.renderTopbar();
      });
    }

    // Mobile menu toggle
    const toggleMobileBtn = topbar.querySelector('#btn-toggle-mobile-sidebar');
    if (toggleMobileBtn) {
      toggleMobileBtn.addEventListener('click', () => {
        const sb = document.getElementById('app-sidebar');
        const ov = document.getElementById('sidebar-overlay');
        if (sb) sb.classList.toggle('open');
        if (ov) ov.classList.toggle('open');
      });
    }
  },

  updateSidebarNav(role, tab) {
    document.querySelectorAll('.nav-item').forEach(link => {
      if (link.getAttribute('data-tab') === tab) link.classList.add('active');
      else link.classList.remove('active');
    });
  },

  updateTopbarTitle(role, tab) {
    const titleEl = document.getElementById('topbar-title-text');
    if (!titleEl) return;

    const titles = {
      dashboard: 'Dashboard Overview',
      services: 'Guidance Services Catalog',
      book: 'Book Counseling Session',
      appointments: role === 'student' ? 'My Appointments' : (role === 'counselor' ? 'Appointment Queue' : 'Master Appointments'),
      history: 'Counseling Session Records',
      profile: 'Student Profile',
      schedule: 'Counseling Schedule Calendar',
      notes: 'SOAP Clinical Case Notes',
      followups: 'Client Follow-Up Tracker',
      reports: 'Guidance Analytics & Reports',
      users: 'User Account Management',
      announcements: 'Bulletins & Campus Notices',
      settings: 'System Policies & Settings',
      logs: 'Security Audit Logs'
    };

    titleEl.textContent = titles[tab] || 'Guidance Portal';
  },

  updateUserDisplay(user) {
    this.renderSidebar();
    this.renderTopbar();
  },

  closeMobileSidebar() {
    const sb = document.getElementById('app-sidebar');
    const ov = document.getElementById('sidebar-overlay');
    if (sb) sb.classList.remove('open');
    if (ov) ov.classList.remove('open');
  },

  attachGlobalListeners() {
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => this.closeMobileSidebar());
    }

    window.addEventListener('guidance:state-changed', (e) => {
      this.renderTopbar();
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
