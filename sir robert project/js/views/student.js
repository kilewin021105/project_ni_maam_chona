/**
 * Buenavista Community College — Student View Controller
 * Exact Copycat Mockup Implementation for Student Dashboard & Booking Wizard
 */

const StudentView = {
  currentTab: 'dashboard',
  bookingStep: 1,
  selectedServiceId: 'srv-1',
  selectedCounselorId: 'cns-1',
  selectedDate: '2026-08-20',
  selectedTimeSlot: '1:00 PM',

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
      case 'services':
      case 'book':
        tabHtml = await this.renderBookingWizard(user);
        break;
      case 'appointments':
        tabHtml = await this.renderAppointments(user);
        break;
      case 'history':
        tabHtml = await this.renderHistory(user);
        break;
      case 'profile':
        tabHtml = await this.renderProfile(user);
        break;
      default:
        tabHtml = await this.renderDashboard(user);
    }

    mainContent.innerHTML = `<div class="page-container fade-in">${tabHtml}</div>`;
    this.attachEvents(user);
  },

  /* --------------------------------------------------------------------------
     Panel C: Student Dashboard (Mockup Copycat)
     -------------------------------------------------------------------------- */
  async renderDashboard(user) {
    const appointments = await ApiClient.getAppointments({ studentId: user.id });
    const announcements = await ApiClient.getAnnouncements();

    const upcomingCount = appointments.filter(a => a.status === 'Approved' || a.status === 'Pending').length;
    const totalCount = appointments.length;
    const completedCount = appointments.filter(a => a.status === 'Completed').length;
    const cancelledCount = appointments.filter(a => a.status === 'Cancelled').length;

    const today = new Date().toISOString().split('T')[0];
    const upcoming = appointments
      .filter(a => (a.status === 'Approved' || a.status === 'Pending') && a.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0];

    return `
      <!-- Greeting Header -->
      <div style="margin-bottom: 1.5rem;">
        <h2 style="font-size: 1.75rem; font-weight: 800; color: var(--slate-900);">Good morning, ${user.name}!</h2>
        <p style="font-size: var(--text-sm); color: var(--slate-500); margin-top: 2px;">Here's what's happening with your guidance appointments.</p>
      </div>

      <!-- 4 Metric Cards (Panel C Copycat) -->
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-header">
            <span>Upcoming Appointments</span>
          </div>
          <div class="metric-value">${upcomingCount}</div>
          <a href="#" class="metric-link" id="link-metric-upcoming">View Details &rarr;</a>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span>Total Appointments</span>
          </div>
          <div class="metric-value">${totalCount}</div>
          <a href="#" class="metric-link" id="link-metric-total">View Details &rarr;</a>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span>Completed</span>
          </div>
          <div class="metric-value" style="color: var(--bcc-brand);">${completedCount}</div>
          <a href="#" class="metric-link" id="link-metric-completed">View Details &rarr;</a>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span>Cancelled</span>
          </div>
          <div class="metric-value" style="color: #dc2626;">${cancelledCount}</div>
          <a href="#" class="metric-link" id="link-metric-cancelled">View Details &rarr;</a>
        </div>
      </div>

      <!-- Main Split Layout -->
      <div style="display: grid; grid-template-columns: 1.3fr 0.7fr; gap: 1.5rem;">
        
        <!-- Left: Upcoming Appointments & Quick Actions -->
        <div>
          <div class="card" style="margin-bottom: 1.5rem;">
            <div class="card-header">
              <div class="card-title">
                ${Icons.get('calendar')} Upcoming Appointments
              </div>
              <a href="#" class="text-xs font-bold text-brand" id="btn-view-all-apts">View All &rarr;</a>
            </div>

            ${upcoming ? `
              <div style="background: var(--bg-subtle); border: 1px solid var(--border); border-radius: var(--r-md); padding: 1.25rem;">
                <div class="flex items-center justify-between" style="margin-bottom: 0.75rem;">
                  <div>
                    <span class="badge badge-brand">${upcoming.modality}</span>
                    <h4 style="font-size: var(--text-base); font-weight: 800; margin-top: 0.35rem;">${upcoming.serviceTitle}</h4>
                  </div>
                  <span class="badge badge-${upcoming.status.toLowerCase()}">
                    <span class="badge-dot"></span> ${upcoming.status}
                  </span>
                </div>

                <div style="font-size: var(--text-xs); color: var(--slate-600); margin-bottom: 1rem;">
                  <div><strong>Counselor:</strong> ${upcoming.counselorName}</div>
                  <div style="margin-top: 2px;"><strong>Schedule:</strong> ${upcoming.date} at ${upcoming.timeSlot}</div>
                </div>

                <div class="flex gap-2 justify-end">
                  <button class="btn btn-primary btn-sm btn-view-pass" data-id="${upcoming.id}">View Details</button>
                </div>
              </div>
            ` : `
              <div class="text-center" style="padding: 2rem 1rem; color: var(--slate-500);">
                <p class="text-sm">No upcoming appointments scheduled.</p>
                <button class="btn btn-primary btn-sm" id="btn-dash-book-now" style="margin-top: 0.75rem;">Book Appointment</button>
              </div>
            `}
          </div>

          <div class="card">
            <div class="card-header">
              <div class="card-title">${Icons.get('grid')} Quick Actions</div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;">
              <button class="btn btn-secondary" id="qa-dash-book">
                ${Icons.get('plus')} Book Appointment
              </button>
              <button class="btn btn-secondary" id="qa-dash-my-apts">
                ${Icons.get('calendar')} My Appointments
              </button>
              <button class="btn btn-secondary" id="qa-dash-profile">
                ${Icons.get('user')} Student Profile
              </button>
            </div>
          </div>
        </div>

        <!-- Right: Recent Announcements & Support Card -->
        <div>
          <div class="card" style="margin-bottom: 1.5rem;">
            <div class="card-header">
              <div class="card-title">${Icons.get('bell')} Recent Announcements</div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.85rem;">
              ${announcements.slice(0, 3).map(ann => `
                <div style="padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-light);">
                  <div class="flex items-center justify-between" style="font-size: 11px; color: var(--slate-400); margin-bottom: 2px;">
                    <span class="badge badge-gold">${ann.category}</span>
                    <span>${ann.publishDate}</span>
                  </div>
                  <h5 style="font-size: var(--text-xs); font-weight: 700; color: var(--slate-900); margin-top: 3px;">${ann.title}</h5>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Bottom Support Banner (Copycat) -->
          <div class="support-promo-card">
            <div>
              <h3>Your Goals Our Support</h3>
              <p>The Guidance Office is here to help you succeed.</p>
            </div>
          </div>
        </div>

      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     Panel B: 5-Step Appointment Booking Wizard (Mockup Copycat)
     -------------------------------------------------------------------------- */
  async renderBookingWizard(user) {
    const services = await ApiClient.getServices();
    const counselors = await ApiClient.getCounselors();

    return `
      <!-- Hero Header Strip (Mockup Panel B) -->
      <div class="booking-hero-strip">
        <h2>Book an Appointment</h2>
        <p>Choose a guidance service that fits your needs.</p>
      </div>

      <!-- 5-Step Stepper Bar (Copycat Mockup) -->
      <div class="stepper-bar">
        <div class="step-item ${this.bookingStep === 1 ? 'active' : (this.bookingStep > 1 ? 'completed' : '')}">
          <div class="step-circle">1</div>
          <div class="step-title">Service</div>
          <div class="step-sub">Select service</div>
        </div>

        <div class="step-item ${this.bookingStep === 2 ? 'active' : (this.bookingStep > 2 ? 'completed' : '')}">
          <div class="step-circle">2</div>
          <div class="step-title">Counselor</div>
          <div class="step-sub">Choose counselor</div>
        </div>

        <div class="step-item ${this.bookingStep === 3 ? 'active' : (this.bookingStep > 3 ? 'completed' : '')}">
          <div class="step-circle">3</div>
          <div class="step-title">Date & Time</div>
          <div class="step-sub">Pick schedule</div>
        </div>

        <div class="step-item ${this.bookingStep === 4 ? 'active' : (this.bookingStep > 4 ? 'completed' : '')}">
          <div class="step-circle">4</div>
          <div class="step-title">Details</div>
          <div class="step-sub">Add information</div>
        </div>

        <div class="step-item ${this.bookingStep === 5 ? 'active' : ''}">
          <div class="step-circle">5</div>
          <div class="step-title">Confirm</div>
          <div class="step-sub">Review & submit</div>
        </div>
      </div>

      <!-- Step Content Panes -->
      <div id="booking-step-container">
        ${this.bookingStep === 1 ? this.renderStep1(services) : ''}
        ${this.bookingStep === 2 ? this.renderStep2(counselors) : ''}
        ${this.bookingStep === 3 ? this.renderStep3() : ''}
        ${this.bookingStep === 4 ? this.renderStep4() : ''}
        ${this.bookingStep === 5 ? this.renderStep5(services, counselors, user) : ''}
      </div>
    `;
  },

  /* Step 1: Select Service (6 Cards Copycat Grid) */
  renderStep1(services) {
    return `
      <div>
        <div style="margin-bottom: 1.25rem;">
          <h3 style="font-size: var(--text-lg); font-weight: 800;">Select Guidance Service</h3>
          <p class="text-xs text-muted">Choose the type of service you need.</p>
        </div>

        <div class="service-select-grid">
          ${services.map(srv => `
            <div class="service-select-card ${this.selectedServiceId === srv.id ? 'selected' : ''}" data-srv-id="${srv.id}">
              <div class="service-select-icon">
                ${Icons.get(srv.icon || 'book-open')}
              </div>
              <div class="service-select-title">${srv.title}</div>
              <div class="service-select-desc">${srv.description}</div>
              <div class="service-select-arrow">&rsaquo;</div>
            </div>
          `).join('')}
        </div>

        <div class="flex justify-end">
          <button class="btn btn-dark" id="btn-step1-next">
            Next: Select Counselor &rarr;
          </button>
        </div>
      </div>
    `;
  },

  /* Step 2: Select Counselor (List Rows Copycat) */
  renderStep2(counselors) {
    return `
      <div>
        <div style="margin-bottom: 1.25rem;">
          <h3 style="font-size: var(--text-lg); font-weight: 800;">Select Counselor</h3>
          <p class="text-xs text-muted">Choose a counselor based on your preferred area or availability.</p>
        </div>

        <div class="flex gap-2" style="margin-bottom: 1.25rem;">
          <div class="topbar-search" style="width: 280px; display: block;">
            ${Icons.get('search')}
            <input type="text" placeholder="Search counselor..." id="counselor-search-input">
          </div>
          <select class="form-select" style="width: 180px;">
            <option>All Areas</option>
            <option>Academic</option>
            <option>Personal</option>
            <option>Career</option>
          </select>
        </div>

        <div class="counselor-select-list">
          ${counselors.map(cns => `
            <div class="counselor-row-card ${this.selectedCounselorId === cns.id ? 'selected' : ''}" data-cns-id="${cns.id}">
              <div class="counselor-row-main">
                <div class="counselor-avatar">${cns.name.split(' ')[1] ? cns.name.split(' ')[1][0] : 'C'}</div>
                <div class="counselor-info">
                  <h4>${cns.name}</h4>
                  <div class="c-sub">${cns.title}</div>
                  <div class="counselor-tags">
                    ${cns.specializations.map(s => `<span class="badge badge-brand">${s}</span>`).join('')}
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-4">
                <div class="counselor-row-avail">
                  <span class="badge-dot" style="background: var(--bcc-brand);"></span> Available: Mon - Fri
                </div>
                <button class="btn btn-dark btn-sm btn-pick-counselor" data-cns-id="${cns.id}">
                  ${this.selectedCounselorId === cns.id ? 'Selected ✓' : 'Select'}
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="flex justify-between">
          <button class="btn btn-secondary" id="btn-step2-back">&larr; Back</button>
          <button class="btn btn-dark" id="btn-step2-next">Next: Select Date & Time &rarr;</button>
        </div>
      </div>
    `;
  },

  /* Step 3: Select Date & Time (Calendar + Time Slots Split) */
  renderStep3() {
    const slots = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];

    return `
      <div>
        <div style="margin-bottom: 1.25rem;">
          <h3 style="font-size: var(--text-lg); font-weight: 800;">Select Date & Time</h3>
          <p class="text-xs text-muted">Choose your preferred date and time for the appointment.</p>
        </div>

        <div class="step-datetime-grid">
          <!-- Left: Calendar Widget -->
          <div class="calendar-box">
            <div class="flex items-center justify-between" style="margin-bottom: 1rem; font-weight: 800;">
              <span>&lt; August 2026 &gt;</span>
            </div>
            <div id="step-calendar-widget"></div>
          </div>

          <!-- Right: Time Slots -->
          <div class="time-slots-box">
            <div class="time-slots-title">Available Time Slots</div>
            <div class="time-slots-grid">
              ${slots.map(s => `
                <button class="slot-btn ${this.selectedTimeSlot === s ? 'selected' : ''}" data-slot="${s}">
                  ${s}
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="flex justify-between">
          <button class="btn btn-secondary" id="btn-step3-back">&larr; Back</button>
          <button class="btn btn-dark" id="btn-step3-next">Next: Add Details &rarr;</button>
        </div>
      </div>
    `;
  },

  /* Step 4: Add Details */
  renderStep4() {
    return `
      <div style="width: 100%;">
        <div style="margin-bottom: 1.25rem;">
          <h3 style="font-size: var(--text-lg); font-weight: 800;">Add Appointment Details</h3>
          <p class="text-xs text-muted">Please provide context for your counseling session.</p>
        </div>

        <div class="card" style="margin-bottom: 1.5rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
            <div class="form-group">
              <label class="form-label required">Consultation Modality</label>
              <select id="book-modality" class="form-select">
                <option value="In-Person">In-Person at BCC Guidance Office</option>
                <option value="Online Video Consultation">Online Video Consultation (Google Meet)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label required">Urgency Level</label>
              <select id="book-urgency" class="form-select">
                <option value="Routine" selected>Routine (Standard Schedule)</option>
                <option value="Urgent">Urgent (Immediate Priority)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label required">Reason for Consultation</label>
            <textarea id="book-reason" class="form-textarea" style="min-height: 120px;" placeholder="Briefly describe what you would like to discuss with the guidance counselor..."></textarea>
          </div>
        </div>

        <div class="flex justify-between">
          <button class="btn btn-secondary" id="btn-step4-back">&larr; Back</button>
          <button class="btn btn-dark" id="btn-step4-next">Next: Review & Confirm &rarr;</button>
        </div>
      </div>
    `;
  },

  /* Step 5: Confirm & Review */
  renderStep5(services, counselors, user) {
    const srv = services.find(s => s.id === this.selectedServiceId) || services[0];
    const cns = counselors.find(c => c.id === this.selectedCounselorId) || counselors[0];

    return `
      <div style="width: 100%;">
        <div style="margin-bottom: 1.25rem;">
          <h3 style="font-size: var(--text-lg); font-weight: 800;">Confirm Appointment</h3>
          <p class="text-xs text-muted">Review your booking information before submitting.</p>
        </div>

        <div class="card" style="margin-bottom: 1.5rem;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; font-size: var(--text-sm);">
            <div style="background: var(--bg-subtle); padding: 1.15rem; border-radius: var(--r-md); border: 1px solid var(--border-light);">
              <span class="text-muted" style="display: block; font-size: 11px; text-transform: uppercase; font-weight: 700;">Student Name</span>
              <span class="font-bold" style="font-size: var(--text-base); color: var(--slate-900);">${user.name} (${user.studentId || 'BSIT'})</span>
            </div>
            <div style="background: var(--bg-subtle); padding: 1.15rem; border-radius: var(--r-md); border: 1px solid var(--border-light);">
              <span class="text-muted" style="display: block; font-size: 11px; text-transform: uppercase; font-weight: 700;">Service</span>
              <span class="font-bold text-brand" style="font-size: var(--text-base);">${srv.title}</span>
            </div>
            <div style="background: var(--bg-subtle); padding: 1.15rem; border-radius: var(--r-md); border: 1px solid var(--border-light);">
              <span class="text-muted" style="display: block; font-size: 11px; text-transform: uppercase; font-weight: 700;">Counselor</span>
              <span class="font-bold" style="font-size: var(--text-base); color: var(--slate-900);">${cns.name}</span>
            </div>
            <div style="background: var(--bg-subtle); padding: 1.15rem; border-radius: var(--r-md); border: 1px solid var(--border-light);">
              <span class="text-muted" style="display: block; font-size: 11px; text-transform: uppercase; font-weight: 700;">Schedule</span>
              <span class="font-bold text-brand" style="font-size: var(--text-base);">${this.selectedDate} at ${this.selectedTimeSlot}</span>
            </div>
          </div>
        </div>

        <div class="flex justify-between">
          <button class="btn btn-secondary" id="btn-step5-back">&larr; Back</button>
          <button class="btn btn-primary btn-lg" id="btn-submit-final-booking">
            Submit & Generate Pass
          </button>
        </div>
      </div>
    `;
  },

  /* Appointments List Tab */
  async renderAppointments(user) {
    const appointments = await ApiClient.getAppointments({ studentId: user.id });

    return `
      <div>
        <div class="flex justify-between items-center" style="margin-bottom: 1.5rem;">
          <div>
            <h2 style="font-size: var(--text-xl); font-weight: 800;">My Appointments</h2>
            <p class="text-xs text-muted">Manage your active, completed, and pending appointments.</p>
          </div>
          <button class="btn btn-primary" id="btn-apts-new-booking">
            ${Icons.get('plus')} New Booking
          </button>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Reference Code</th>
                <th>Service</th>
                <th>Counselor</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${appointments.map(apt => `
                <tr>
                  <td class="font-bold" style="font-family: var(--font-mono);">${apt.referenceCode}</td>
                  <td>${apt.serviceTitle}</td>
                  <td>${apt.counselorName}</td>
                  <td>${apt.date} at ${apt.timeSlot}</td>
                  <td>
                    <span class="badge badge-${apt.status.toLowerCase()}">
                      <span class="badge-dot"></span> ${apt.status}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-outline btn-view-pass" data-id="${apt.id}">View Pass</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  /* Counseling History Tab */
  async renderHistory(user) {
    const appointments = await ApiClient.getAppointments({ studentId: user.id, status: 'Completed' });

    return `
      <div>
        <div style="margin-bottom: 1.5rem;">
          <h2 style="font-size: var(--text-xl); font-weight: 800;">Counseling History</h2>
          <p class="text-xs text-muted">View records of your completed guidance consultations.</p>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Session Date</th>
                <th>Service Title</th>
                <th>Counselor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${appointments.length === 0 ? `
                <tr><td colspan="4" class="text-center text-muted" style="padding: 2rem;">No past completed sessions.</td></tr>
              ` : appointments.map(apt => `
                <tr>
                  <td>${apt.date}</td>
                  <td class="font-bold">${apt.serviceTitle}</td>
                  <td>${apt.counselorName}</td>
                  <td><span class="badge badge-completed"><span class="badge-dot"></span> Completed</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  /* Student Profile Tab */
  async renderProfile(user) {
    return `
      <div style="width: 100%;">
        <div class="card">
          <div class="card-header">
            <div class="card-title">${Icons.get('user')} Student Profile</div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; font-size: var(--text-sm);">
            <div style="background: var(--bg-subtle); padding: 1.15rem; border-radius: var(--r-md); border: 1px solid var(--border-light);">
              <span class="text-muted" style="display: block; font-size: 11px; text-transform: uppercase; font-weight: 700;">Full Name</span>
              <span style="font-size: var(--text-base); font-weight: 800; color: var(--slate-900);">${user.name}</span>
            </div>
            <div style="background: var(--bg-subtle); padding: 1.15rem; border-radius: var(--r-md); border: 1px solid var(--border-light);">
              <span class="text-muted" style="display: block; font-size: 11px; text-transform: uppercase; font-weight: 700;">Student ID</span>
              <span style="font-size: var(--text-base); font-weight: 800; color: var(--slate-900); font-family: var(--font-mono);">${user.studentId || 'BCC-2023-01048'}</span>
            </div>
            <div style="background: var(--bg-subtle); padding: 1.15rem; border-radius: var(--r-md); border: 1px solid var(--border-light);">
              <span class="text-muted" style="display: block; font-size: 11px; text-transform: uppercase; font-weight: 700;">Course & Section</span>
              <span style="font-size: var(--text-base); font-weight: 800; color: var(--slate-900);">${user.course || 'BSIT'} ${user.yearSection || '3A'}</span>
            </div>
            <div style="background: var(--bg-subtle); padding: 1.15rem; border-radius: var(--r-md); border: 1px solid var(--border-light);">
              <span class="text-muted" style="display: block; font-size: 11px; text-transform: uppercase; font-weight: 700;">BCC Institutional Email</span>
              <span style="font-size: var(--text-base); font-weight: 800; color: var(--bcc-brand);">${user.email}</span>
            </div>
            <div style="background: var(--bg-subtle); padding: 1.15rem; border-radius: var(--r-md); border: 1px solid var(--border-light);">
              <span class="text-muted" style="display: block; font-size: 11px; text-transform: uppercase; font-weight: 700;">Contact Number</span>
              <span style="font-size: var(--text-base); font-weight: 800; color: var(--slate-900);">${user.phone || '0917-555-0192'}</span>
            </div>
            <div style="background: var(--bg-subtle); padding: 1.15rem; border-radius: var(--r-md); border: 1px solid var(--border-light);">
              <span class="text-muted" style="display: block; font-size: 11px; text-transform: uppercase; font-weight: 700;">Emergency Contact</span>
              <span style="font-size: var(--text-base); font-weight: 800; color: var(--slate-900);">${user.emergencyContact || 'Maria Dela Cruz (Mother)'}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  attachEvents(user) {
    // Stepper navigation events
    document.querySelectorAll('.service-select-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.service-select-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedServiceId = card.getAttribute('data-srv-id');
      });
    });

    const s1Next = document.getElementById('btn-step1-next');
    if (s1Next) {
      s1Next.addEventListener('click', () => {
        this.bookingStep = 2;
        this.render('book');
      });
    }

    const s2Back = document.getElementById('btn-step2-back');
    if (s2Back) s2Back.addEventListener('click', () => { this.bookingStep = 1; this.render('book'); });

    const s2Next = document.getElementById('btn-step2-next');
    if (s2Next) s2Next.addEventListener('click', () => { this.bookingStep = 3; this.render('book'); });

    document.querySelectorAll('.btn-pick-counselor').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedCounselorId = btn.getAttribute('data-cns-id');
        this.bookingStep = 3;
        this.render('book');
      });
    });

    const s3Back = document.getElementById('btn-step3-back');
    if (s3Back) s3Back.addEventListener('click', () => { this.bookingStep = 2; this.render('book'); });

    const s3Next = document.getElementById('btn-step3-next');
    if (s3Next) s3Next.addEventListener('click', () => { this.bookingStep = 4; this.render('book'); });

    document.querySelectorAll('.slot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedTimeSlot = btn.getAttribute('data-slot');
      });
    });

    const s4Back = document.getElementById('btn-step4-back');
    if (s4Back) s4Back.addEventListener('click', () => { this.bookingStep = 3; this.render('book'); });

    const s4Next = document.getElementById('btn-step4-next');
    if (s4Next) s4Next.addEventListener('click', () => { this.bookingStep = 5; this.render('book'); });

    const s5Back = document.getElementById('btn-step5-back');
    if (s5Back) s5Back.addEventListener('click', () => { this.bookingStep = 4; this.render('book'); });

    const submitBtn = document.getElementById('btn-submit-final-booking');
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        const services = await ApiClient.getServices();
        const counselors = await ApiClient.getCounselors();
        const srv = services.find(s => s.id === this.selectedServiceId) || services[0];
        const cns = counselors.find(c => c.id === this.selectedCounselorId) || counselors[0];

        try {
          const newApt = await ApiClient.createAppointment({
            studentId: user.id,
            studentName: user.name,
            studentNumber: user.studentId || 'BCC-2023-01048',
            courseYear: `${user.course || 'BSIT'} - ${user.yearSection || '3A'}`,
            studentEmail: user.email,
            counselorId: cns.id,
            counselorName: cns.name,
            serviceId: srv.id,
            serviceTitle: srv.title,
            modality: 'In-Person',
            location: 'BCC Guidance Office',
            date: this.selectedDate,
            timeSlot: this.selectedTimeSlot,
            durationMinutes: srv.durationMinutes || 45,
            urgency: 'Routine',
            reason: 'Guidance consultation request.'
          });

          Toast.success('Appointment Created', `Reference Code: ${newApt.referenceCode}`);
          Modal.showAppointmentPass(newApt);
          this.bookingStep = 1;
          App.navigateTo('student', 'appointments');
        } catch (err) {
          Toast.error('Booking Error', err.message);
        }
      });
    }

    // View Pass buttons
    document.querySelectorAll('.btn-view-pass').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const appointments = await ApiClient.getAppointments();
        const apt = appointments.find(a => a.id === id);
        if (apt) Modal.showAppointmentPass(apt);
      });
    });

    // Quick action buttons in dashboard
    const q1 = document.getElementById('qa-dash-book');
    if (q1) q1.addEventListener('click', () => { this.bookingStep = 1; App.navigateTo('student', 'book'); });

    const q2 = document.getElementById('qa-dash-my-apts');
    if (q2) q2.addEventListener('click', () => App.navigateTo('student', 'appointments'));

    const q3 = document.getElementById('qa-dash-profile');
    if (q3) q3.addEventListener('click', () => App.navigateTo('student', 'profile'));

    const dBook = document.getElementById('btn-dash-book-now');
    if (dBook) dBook.addEventListener('click', () => { this.bookingStep = 1; App.navigateTo('student', 'book'); });

    const newBk = document.getElementById('btn-apts-new-booking');
    if (newBk) newBk.addEventListener('click', () => { this.bookingStep = 1; App.navigateTo('student', 'book'); });
  }
};
