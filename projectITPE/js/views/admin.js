/**
 * Buenavista Community College — Admin View Controller
 * Exact Copycat Mockup Implementation for Admin Executive Dashboard (Panel E)
 */

const AdminView = {
  currentTab: 'dashboard',

  async render(tab = 'dashboard') {
    this.currentTab = tab;
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    const user = StorageService.getCurrentUser();

    let tabHtml = '';
    switch (tab) {
      case 'dashboard':
        tabHtml = await this.renderDashboard(user);
        break;
      case 'users':
      case 'students':
      case 'counselors':
        tabHtml = await this.renderUsers(user);
        break;
      case 'services':
        tabHtml = await this.renderServices(user);
        break;
      case 'appointments':
        tabHtml = await this.renderAppointments(user);
        break;
      case 'announcements':
        tabHtml = await this.renderAnnouncements(user);
        break;
      case 'reports':
        tabHtml = await this.renderReports(user);
        break;
      case 'settings':
        tabHtml = await this.renderSettings(user);
        break;
      case 'logs':
        tabHtml = await this.renderAuditLogs(user);
        break;
      default:
        tabHtml = await this.renderDashboard(user);
    }

    mainContent.innerHTML = `<div class="page-container fade-in">${tabHtml}</div>`;
    this.attachEvents(user);
  },

  /* --------------------------------------------------------------------------
     Panel E: Admin Executive Dashboard (Mockup Copycat)
     -------------------------------------------------------------------------- */
  async renderDashboard(user) {
    const totalStudents = '1,248';
    const totalAppointments = '684';
    const completedCount = '552';
    const pendingCount = '132';

    return `
      <!-- Greeting Header -->
      <div style="margin-bottom: 1.5rem;">
        <h2 style="font-size: 1.75rem; font-weight: 800; color: var(--slate-900);">Welcome, Admin</h2>
        <p style="font-size: var(--text-sm); color: var(--slate-500); margin-top: 2px;">System Administrator</p>
      </div>

      <!-- 4 Metric Cards (Panel E Copycat) -->
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-header">
            <span>Total Students</span>
          </div>
          <div class="metric-value">${totalStudents}</div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span>Total Appointments</span>
          </div>
          <div class="metric-value">${totalAppointments}</div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span>Completed</span>
          </div>
          <div class="metric-value" style="color: var(--bcc-brand);">${completedCount}</div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span>Pending</span>
          </div>
          <div class="metric-value" style="color: #ca8a04;">${pendingCount}</div>
        </div>
      </div>

      <!-- Analytics Row: Chart & Donut Split -->
      <div style="display: grid; grid-template-columns: 1.3fr 0.7fr; gap: 1.5rem; margin-bottom: 1.5rem;">
        <div class="card">
          <div class="card-header">
            <div class="card-title">${Icons.get('barChart')} Appointment Overview</div>
          </div>
          <div style="height: 200px; display: flex; align-items: center; justify-content: center; background: var(--bg-subtle); border-radius: var(--r-sm);">
            <svg width="100%" height="160" viewBox="0 0 500 160" preserveAspectRatio="none">
              <path d="M0,120 Q80,40 160,90 T320,50 T500,80 L500,160 L0,160 Z" fill="rgba(5, 150, 105, 0.15)"/>
              <path d="M0,120 Q80,40 160,90 T320,50 T500,80" fill="none" stroke="var(--bcc-brand)" stroke-width="3"/>
            </svg>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">${Icons.get('check-circle')} Appointment Status</div>
          </div>
          <div style="text-align: center; padding: 1rem;">
            <div style="font-size: 2.5rem; font-weight: 800; color: var(--bcc-brand);">81%</div>
            <div class="text-xs text-muted" style="margin-bottom: 1rem;">Completed Consultations Rate</div>
            <div style="font-size: 11px; text-align: left; display: flex; flex-direction: column; gap: 0.35rem; color: var(--slate-600);">
              <div class="flex justify-between"><span>Completed</span><span class="font-bold">81%</span></div>
              <div class="flex justify-between"><span>Confirmed</span><span class="font-bold">10%</span></div>
              <div class="flex justify-between"><span>Pending</span><span class="font-bold">5%</span></div>
              <div class="flex justify-between"><span>Cancelled</span><span class="font-bold">4%</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Appointments Master Table (Panel E Copycat) -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">${Icons.get('calendar')} Recent Appointments</div>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Service</th>
                <th>Counselor</th>
                <th>Date & Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="font-bold">Ana Reyes</td>
                <td>Academic Counseling</td>
                <td>Maria Santos</td>
                <td>Aug 28, 2026 1:00 PM</td>
                <td><span class="badge badge-confirmed"><span class="badge-dot"></span> Confirmed</span></td>
              </tr>
              <tr>
                <td class="font-bold">Mark Santos</td>
                <td>Career Guidance</td>
                <td>John Reyes</td>
                <td>Aug 28, 2026 9:30 AM</td>
                <td><span class="badge badge-pending"><span class="badge-dot"></span> Pending</span></td>
              </tr>
              <tr>
                <td class="font-bold">Ella Cruz</td>
                <td>Personal Counseling</td>
                <td>Ana Cruz</td>
                <td>Aug 28, 2026 11:00 AM</td>
                <td><span class="badge badge-confirmed"><span class="badge-dot"></span> Confirmed</span></td>
              </tr>
              <tr>
                <td class="font-bold">Juan Dela Cruz</td>
                <td>Career Guidance</td>
                <td>Paolo Dela Cruz</td>
                <td>Aug 27, 2026 2:00 PM</td>
                <td><span class="badge badge-confirmed"><span class="badge-dot"></span> Confirmed</span></td>
              </tr>
              <tr>
                <td class="font-bold">Sofia Ramirez</td>
                <td>Mental Health Support</td>
                <td>Maria Santos</td>
                <td>Aug 27, 2026 10:00 AM</td>
                <td><span class="badge badge-confirmed"><span class="badge-dot"></span> Confirmed</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async renderUsers(user) {
    const users = await ApiClient.getUsers();

    return `
      <div>
        <div style="margin-bottom: 1.5rem;">
          <h2 style="font-size: var(--text-xl); font-weight: 800;">User Account Management</h2>
          <p class="text-xs text-muted">Manage student, counselor, and administrator user accounts.</p>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td class="font-bold">${u.name}</td>
                  <td>${u.email}</td>
                  <td><span class="badge badge-brand">${u.role.toUpperCase()}</span></td>
                  <td><span class="badge badge-confirmed">Active</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async renderServices(user) {
    const services = await ApiClient.getServices();

    return `
      <div>
        <div style="margin-bottom: 1.5rem;">
          <h2 style="font-size: var(--text-xl); font-weight: 800;">Guidance Services Catalog</h2>
          <p class="text-xs text-muted">Manage active guidance counseling programs.</p>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Title</th>
                <th>Category</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${services.map(s => `
                <tr>
                  <td class="font-bold">${s.code}</td>
                  <td>${s.title}</td>
                  <td><span class="badge badge-brand">${s.category}</span></td>
                  <td>${s.durationMinutes} mins</td>
                  <td><span class="badge badge-confirmed">Active</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async renderAppointments(user) {
    const appointments = await ApiClient.getAppointments();

    return `
      <div>
        <div style="margin-bottom: 1.5rem;">
          <h2 style="font-size: var(--text-xl); font-weight: 800;">Master Appointments Log</h2>
          <p class="text-xs text-muted">Complete institution-wide appointment record.</p>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ref Code</th>
                <th>Student</th>
                <th>Service</th>
                <th>Counselor</th>
                <th>Date & Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${appointments.map(apt => `
                <tr>
                  <td class="font-bold" style="font-family: var(--font-mono);">${apt.referenceCode}</td>
                  <td>${apt.studentName}</td>
                  <td>${apt.serviceTitle}</td>
                  <td>${apt.counselorName}</td>
                  <td>${apt.date} at ${apt.timeSlot}</td>
                  <td>
                    <span class="badge badge-${apt.status.toLowerCase()}">
                      <span class="badge-dot"></span> ${apt.status}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async renderAnnouncements(user) {
    const announcements = await ApiClient.getAnnouncements();

    return `
      <div>
        <div style="margin-bottom: 1.5rem;">
          <h2 style="font-size: var(--text-xl); font-weight: 800;">Campus Bulletins & Announcements</h2>
          <p class="text-xs text-muted">Publish official notices for students and counselors.</p>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Publish Date</th>
                <th>Author</th>
              </tr>
            </thead>
            <tbody>
              ${announcements.map(ann => `
                <tr>
                  <td class="font-bold">${ann.title}</td>
                  <td><span class="badge badge-brand">${ann.category}</span></td>
                  <td>${ann.publishDate}</td>
                  <td>${ann.author}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async renderReports(user) {
    return `
      <div>
        <div style="margin-bottom: 1.5rem;">
          <h2 style="font-size: var(--text-xl); font-weight: 800;">Campus Analytics & Reports</h2>
          <p class="text-xs text-muted">Institutional metrics for guidance program evaluation.</p>
        </div>

        <div class="stats-grid-3">
          <div class="card text-center">
            <h4 style="font-size: 2.25rem; color: var(--bcc-brand); font-weight: 800;">1,248</h4>
            <div class="text-xs text-muted">Enrolled Students Covered</div>
          </div>
          <div class="card text-center">
            <h4 style="font-size: 2.25rem; color: #3b82f6; font-weight: 800;">684</h4>
            <div class="text-xs text-muted">Total Consultations Processed</div>
          </div>
          <div class="card text-center">
            <h4 style="font-size: 2.25rem; color: #9333ea; font-weight: 800;">96%</h4>
            <div class="text-xs text-muted">Student Satisfaction Index</div>
          </div>
        </div>
      </div>
    `;
  },

  async renderSettings(user) {
    return `
      <div style="width: 100%;">
        <div class="card">
          <div class="card-header">
            <div class="card-title">${Icons.get('settings')} System Policies & Settings</div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; font-size: var(--text-sm);">
            <div style="background: var(--bg-subtle); padding: 1.15rem; border-radius: var(--r-md); border: 1px solid var(--border-light);">
              <span class="text-muted" style="display: block; font-size: 11px; text-transform: uppercase; font-weight: 700;">System Name</span>
              <span style="font-size: var(--text-base); font-weight: 800; color: var(--slate-900);">Buenavista Community College Guidance System</span>
            </div>
            <div style="background: var(--bg-subtle); padding: 1.15rem; border-radius: var(--r-md); border: 1px solid var(--border-light);">
              <span class="text-muted" style="display: block; font-size: 11px; text-transform: uppercase; font-weight: 700;">Lead Time Requirement</span>
              <span style="font-size: var(--text-base); font-weight: 800; color: var(--slate-900);">12 Hours Prior</span>
            </div>
            <div style="background: var(--bg-subtle); padding: 1.15rem; border-radius: var(--r-md); border: 1px solid var(--border-light);">
              <span class="text-muted" style="display: block; font-size: 11px; text-transform: uppercase; font-weight: 700;">Cancellation Window</span>
              <span style="font-size: var(--text-base); font-weight: 800; color: var(--slate-900);">4 Hours Prior</span>
            </div>
            <div style="background: var(--bg-subtle); padding: 1.15rem; border-radius: var(--r-md); border: 1px solid var(--border-light);">
              <span class="text-muted" style="display: block; font-size: 11px; text-transform: uppercase; font-weight: 700;">Data Privacy Compliance</span>
              <span style="font-size: var(--text-base); font-weight: 800; color: var(--bcc-brand);">RA 10173 & RA 9258 Certified</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async renderAuditLogs(user) {
    const logs = await ApiClient.getAuditLogs();

    return `
      <div>
        <div style="margin-bottom: 1.5rem;">
          <h2 style="font-size: var(--text-xl); font-weight: 800;">Security Audit Logs</h2>
          <p class="text-xs text-muted">System actions and authentication security trail.</p>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(log => `
                <tr>
                  <td>${new Date(log.timestamp).toLocaleString()}</td>
                  <td><span class="badge badge-brand">${log.action}</span></td>
                  <td>${log.actorName}</td>
                  <td>${log.target}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  attachEvents(user) {}
};
