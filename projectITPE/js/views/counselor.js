/**
 * Buenavista Community College — Counselor View Controller
 * Exact Copycat Mockup Implementation for Counselor Dashboard (Panel D)
 */

const CounselorView = {
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
      case 'appointments':
        tabHtml = await this.renderQueue(user);
        break;
      case 'schedule':
      case 'calendar':
        tabHtml = await this.renderCalendar(user);
        break;
      case 'notes':
        tabHtml = await this.renderSoapNotes(user);
        break;
      case 'reports':
        tabHtml = await this.renderReports(user);
        break;
      default:
        tabHtml = await this.renderDashboard(user);
    }

    mainContent.innerHTML = `<div class="page-container fade-in">${tabHtml}</div>`;
    this.attachEvents(user);
  },

  /* --------------------------------------------------------------------------
     Panel D: Counselor Dashboard (Mockup Copycat)
     -------------------------------------------------------------------------- */
  async renderDashboard(user) {
    const appointments = await ApiClient.getAppointments({ counselorId: user.counselorId });

    const todayCount = 5;
    const weekCount = 12;
    const completedCount = 8;
    const pendingCount = 4;

    return `
      <!-- Greeting Header -->
      <div style="margin-bottom: 1.5rem;">
        <h2 style="font-size: 1.75rem; font-weight: 800; color: var(--slate-900);">Welcome, ${user.name}</h2>
        <p style="font-size: var(--text-sm); color: var(--slate-500); margin-top: 2px;">Guidance Counselor</p>
      </div>

      <!-- 4 Metric Cards (Panel D Copycat) -->
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-header">
            <span>Today's Appointments</span>
          </div>
          <div class="metric-value">${todayCount}</div>
          <a href="#" class="metric-link" id="cns-link-today">View Schedule &rarr;</a>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span>This Week</span>
          </div>
          <div class="metric-value">${weekCount}</div>
          <a href="#" class="metric-link" id="cns-link-week">View Schedule &rarr;</a>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span>Completed</span>
          </div>
          <div class="metric-value" style="color: var(--bcc-brand);">${completedCount}</div>
          <a href="#" class="metric-link" id="cns-link-completed">View Reports &rarr;</a>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span>Pending</span>
          </div>
          <div class="metric-value" style="color: #ca8a04;">${pendingCount}</div>
          <a href="#" class="metric-link" id="cns-link-pending">View Reports &rarr;</a>
        </div>
      </div>

      <!-- Main Split Grid -->
      <div style="display: grid; grid-template-columns: 1.3fr 0.7fr; gap: 1.5rem;">
        
        <!-- Left: Today's Appointments Table & Quick Actions -->
        <div>
          <div class="card" style="margin-bottom: 1.5rem;">
            <div class="card-header">
              <div class="card-title">${Icons.get('clock')} Today's Appointments</div>
              <a href="#" class="text-xs font-bold text-brand" id="btn-cns-view-all">View All &rarr;</a>
            </div>

            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Student</th>
                    <th>Service</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>8:00 AM</td>
                    <td class="font-bold">Ana Reyes</td>
                    <td>Academic Counseling</td>
                    <td><span class="badge badge-confirmed"><span class="badge-dot"></span> Confirmed</span></td>
                  </tr>
                  <tr>
                    <td>9:30 AM</td>
                    <td class="font-bold">Mark Santos</td>
                    <td>Career Guidance</td>
                    <td><span class="badge badge-confirmed"><span class="badge-dot"></span> Confirmed</span></td>
                  </tr>
                  <tr>
                    <td>11:00 AM</td>
                    <td class="font-bold">Ella Cruz</td>
                    <td>Personal Counseling</td>
                    <td><span class="badge badge-confirmed"><span class="badge-dot"></span> Confirmed</span></td>
                  </tr>
                  <tr>
                    <td>1:00 PM</td>
                    <td class="font-bold">Juan Dela Cruz</td>
                    <td>Career Guidance</td>
                    <td><span class="badge badge-confirmed"><span class="badge-dot"></span> Confirmed</span></td>
                  </tr>
                  <tr>
                    <td>3:00 PM</td>
                    <td class="font-bold">Sofia Ramirez</td>
                    <td>Mental Health Support</td>
                    <td><span class="badge badge-pending"><span class="badge-dot"></span> Pending</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <div class="card-title">${Icons.get('grid')} Quick Actions</div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;">
              <button class="btn btn-secondary" id="qa-cns-sched">
                ${Icons.get('calendar')} View My Schedule
              </button>
              <button class="btn btn-secondary" id="qa-cns-students">
                ${Icons.get('user')} Student Records
              </button>
              <button class="btn btn-secondary" id="qa-cns-reports">
                ${Icons.get('barChart')} Reports
              </button>
            </div>
          </div>
        </div>

        <!-- Right: Appointment Calendar & Promo Banner -->
        <div>
          <div class="card" style="margin-bottom: 1.5rem;">
            <div class="card-header">
              <div class="card-title">${Icons.get('calendar')} Appointment Calendar</div>
            </div>

            <div style="text-align: center; font-weight: 800; margin-bottom: 0.75rem;">
              &lt; August 2026 &gt;
            </div>

            <div id="cns-calendar-widget"></div>

            <div class="flex gap-3 justify-center" style="margin-top: 1rem; font-size: 11px; color: var(--slate-600);">
              <span class="flex items-center gap-1"><span class="badge-dot" style="background: var(--bcc-brand);"></span> Confirmed</span>
              <span class="flex items-center gap-1"><span class="badge-dot" style="background: #ca8a04;"></span> Pending</span>
              <span class="flex items-center gap-1"><span class="badge-dot" style="background: #3b82f6;"></span> Completed</span>
            </div>
          </div>

          <!-- Bottom Support Promo Card -->
          <div class="support-promo-card">
            <div>
              <h3>Support Guide Empower</h3>
              <p>The Guidance Office is a safe space for every student.</p>
            </div>
          </div>
        </div>

      </div>
    `;
  },

  /* Queue Tab */
  async renderQueue(user) {
    const appointments = await ApiClient.getAppointments({ counselorId: user.counselorId });

    return `
      <div>
        <div style="margin-bottom: 1.5rem;">
          <h2 style="font-size: var(--text-xl); font-weight: 800;">Appointment Queue</h2>
          <p class="text-xs text-muted">Review and update student consultation requests.</p>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ref Code</th>
                <th>Student</th>
                <th>Service</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${appointments.map(apt => `
                <tr>
                  <td class="font-bold" style="font-family: var(--font-mono);">${apt.referenceCode}</td>
                  <td>${apt.studentName}</td>
                  <td>${apt.serviceTitle}</td>
                  <td>${apt.date} at ${apt.timeSlot}</td>
                  <td>
                    <span class="badge badge-${apt.status.toLowerCase()}">
                      <span class="badge-dot"></span> ${apt.status}
                    </span>
                  </td>
                  <td>
                    ${apt.status === 'Pending' ? `
                      <button class="btn btn-sm btn-primary btn-approve-apt" data-id="${apt.id}">Approve</button>
                    ` : `
                      <button class="btn btn-sm btn-outline btn-view-pass" data-id="${apt.id}">View Pass</button>
                    `}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async renderCalendar(user) {
    return `
      <div>
        <div style="margin-bottom: 1.5rem;">
          <h2 style="font-size: var(--text-xl); font-weight: 800;">My Counseling Schedule</h2>
          <p class="text-xs text-muted">Monthly overview of all confirmed counseling sessions.</p>
        </div>

        <div class="card">
          <div id="cns-full-calendar-widget"></div>
        </div>
      </div>
    `;
  },

  async renderSoapNotes(user) {
    const notes = await ApiClient.getSessionNotes();

    return `
      <div>
        <div class="flex justify-between items-center" style="margin-bottom: 1.5rem;">
          <div>
            <h2 style="font-size: var(--text-xl); font-weight: 800;">SOAP Clinical Case Notes</h2>
            <p class="text-xs text-muted">Subjective, Objective, Assessment, and Plan documentation.</p>
          </div>
          <button class="btn btn-primary" id="btn-create-soap-note">+ New SOAP Note</button>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Student Name</th>
                <th>Category</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${notes.map(n => `
                <tr>
                  <td>${n.sessionDate}</td>
                  <td class="font-bold">${n.studentName}</td>
                  <td>${n.caseCategory}</td>
                  <td><span class="badge badge-confirmed">${n.status}</span></td>
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
          <h2 style="font-size: var(--text-xl); font-weight: 800;">Counselor Guidance Reports</h2>
          <p class="text-xs text-muted">Summary of conducted counseling sessions and cases.</p>
        </div>

        <div class="stats-grid-3">
          <div class="card text-center">
            <h4 style="font-size: 2rem; color: var(--bcc-brand); font-weight: 800;">48</h4>
            <div class="text-xs text-muted">Total Consultations Completed</div>
          </div>
          <div class="card text-center">
            <h4 style="font-size: 2rem; color: #3b82f6; font-weight: 800;">14</h4>
            <div class="text-xs text-muted">Academic Advisory Sessions</div>
          </div>
          <div class="card text-center">
            <h4 style="font-size: 2rem; color: #9333ea; font-weight: 800;">22</h4>
            <div class="text-xs text-muted">Mental Health Care Sessions</div>
          </div>
        </div>
      </div>
    `;
  },

  attachEvents(user) {
    document.querySelectorAll('.btn-approve-apt').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        try {
          await ApiClient.updateAppointmentStatus(id, 'Approved');
          Toast.success('Approved', 'Appointment has been approved.');
          this.render('appointments');
        } catch (err) {
          Toast.error('Error', err.message);
        }
      });
    });

    document.querySelectorAll('.btn-view-pass').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const appointments = await ApiClient.getAppointments();
        const apt = appointments.find(a => a.id === id);
        if (apt) Modal.showAppointmentPass(apt);
      });
    });
  }
};
