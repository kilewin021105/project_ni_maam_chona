/**
 * Buenavista Community College — Student Module Controller
 */

const StudentController = {
  bookingStep: 1,
  selectedServiceId: 'srv-1',
  selectedCounselorId: 'cns-1',
  selectedDate: '2026-08-20',
  selectedTimeSlot: '1:00 PM',

  /* ── Dashboard Page Logic ── */
  async initDashboard() {
    Portal.init('student');
    const user = Portal.currentUser;

    const appointments = await ApiClient.getAppointments({ studentId: user.id });
    const upcomingCount = appointments.filter(a => a.status === 'Approved' || a.status === 'Pending').length;
    const totalCount = appointments.length;
    const completedCount = appointments.filter(a => a.status === 'Completed').length;
    const cancelledCount = appointments.filter(a => a.status === 'Cancelled').length;

    // Populate Metrics
    const mUpcoming = document.getElementById('metric-upcoming');
    if (mUpcoming) mUpcoming.textContent = upcomingCount;
    const mTotal = document.getElementById('metric-total');
    if (mTotal) mTotal.textContent = totalCount;
    const mCompleted = document.getElementById('metric-completed');
    if (mCompleted) mCompleted.textContent = completedCount;
    const mCancelled = document.getElementById('metric-cancelled');
    if (mCancelled) mCancelled.textContent = cancelledCount;

    // Upcoming Appointment Card
    const today = new Date().toISOString().split('T')[0];
    const upcoming = appointments
      .filter(a => (a.status === 'Approved' || a.status === 'Pending') && a.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0];

    const upCard = document.getElementById('dash-upcoming-content');
    if (upCard) {
      if (upcoming) {
        upCard.innerHTML = `
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
              <button class="btn btn-primary btn-sm btn-view-apt" data-id="${upcoming.id}">View Details</button>
              <button class="btn btn-secondary btn-sm btn-view-pass" data-id="${upcoming.id}">Pass Slip</button>
            </div>
          </div>
        `;

        upCard.querySelector('.btn-view-apt').addEventListener('click', () => {
          Modal.showAppointmentDetails(upcoming);
        });
        upCard.querySelector('.btn-view-pass').addEventListener('click', () => {
          Modal.showAppointmentPass(upcoming);
        });
      } else {
        upCard.innerHTML = `
          <div class="text-center" style="padding: 2rem 1rem; color: var(--slate-500);">
            <p class="text-sm">No upcoming appointments scheduled.</p>
            <a href="book.html" class="btn btn-primary btn-sm" style="margin-top: 0.75rem;">Book Appointment</a>
          </div>
        `;
      }
    }

    // Guidance Advisories & Bulletins
    const advContainer = document.getElementById('dash-advisory-content');
    if (advContainer) {
      try {
        const announcements = await ApiClient.getAnnouncements();
        if (announcements && announcements.length > 0) {
          advContainer.innerHTML = announcements.slice(0, 3).map((a, idx) => {
            const isLast = idx === Math.min(announcements.length, 3) - 1;
            const dateStr = a.created_at || a.createdAt || a.publishDate ? new Date(a.created_at || a.createdAt || a.publishDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Campus Notice';
            return `
              <div style="${isLast ? '' : 'padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-light);'}">
                <div class="flex items-center justify-between" style="font-size: 11px; color: var(--slate-400); margin-bottom: 2px;">
                  <span class="badge badge-brand">${a.category || 'Advisory'}</span>
                  <span>${dateStr}</span>
                </div>
                <h5 style="font-size: var(--text-sm); font-weight: 700; color: var(--slate-900);">${a.title}</h5>
                <p style="font-size: var(--text-xs); color: var(--slate-600); margin-top: 2px;">${a.content}</p>
              </div>
            `;
          }).join('');
        }
      } catch (err) {
        console.warn('Dashboard advisory load error:', err);
      }
    }
  },

  /* ── Services Catalog Page Logic ── */
  async initServices() {
    Portal.init('student');
    const services = await ApiClient.getServices();
    const grid = document.getElementById('services-catalog-grid');
    if (!grid) return;

    grid.innerHTML = services.map(s => `
      <div class="service-select-card" style="cursor: default;">
        <div class="service-select-icon">
          ${Icons.get(s.icon || 'book-open')}
        </div>
        <div class="service-select-title">${s.title}</div>
        <div class="service-select-desc">${s.description}</div>
        <div style="margin-top: 1.25rem; display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 11px; font-weight: 700; color: var(--slate-500);">
            ⏱ ${s.durationMinutes || 45} mins
          </span>
          <a href="book.html?service=${s.id}" class="btn btn-primary btn-sm">
            Book Appointment &rarr;
          </a>
        </div>
      </div>
    `).join('');
  },

  /* ── 5-Step Booking Wizard Page Logic ── */
  async initBook() {
    Portal.init('student');
    const user = Portal.currentUser;

    const services = await ApiClient.getServices();
    const counselors = await ApiClient.getCounselors();

    // Check URL parameters for preset service
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('service')) {
      this.selectedServiceId = urlParams.get('service');
    }

    this.renderBookingStep(services, counselors, user);
  },

  renderBookingStep(services, counselors, user) {
    // Update Stepper Bar Circles
    for (let i = 1; i <= 5; i++) {
      const stepEl = document.getElementById(`step-indicator-${i}`);
      if (!stepEl) continue;
      stepEl.className = 'step-item';
      if (i === this.bookingStep) stepEl.classList.add('active');
      else if (i < this.bookingStep) stepEl.classList.add('completed');
    }

    // Hide all step containers
    for (let i = 1; i <= 5; i++) {
      const c = document.getElementById(`step-container-${i}`);
      if (c) c.style.display = (i === this.bookingStep) ? 'block' : 'none';
    }

    // Step 1: Render Services Grid
    if (this.bookingStep === 1) {
      const grid = document.getElementById('booking-services-grid');
      if (grid) {
        grid.innerHTML = services.map(s => `
          <div class="service-select-card ${s.id === this.selectedServiceId ? 'selected' : ''}" data-id="${s.id}">
            <div class="service-select-icon">
              ${Icons.get(s.icon || 'book-open')}
            </div>
            <div class="service-select-title">${s.title}</div>
            <div class="service-select-desc">${s.description}</div>
            <div class="service-select-arrow">&rarr;</div>
          </div>
        `).join('');

        grid.querySelectorAll('.service-select-card').forEach(card => {
          card.addEventListener('click', () => {
            grid.querySelectorAll('.service-select-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            this.selectedServiceId = card.getAttribute('data-id');
          });
        });

        const next1 = document.getElementById('btn-step1-next');
        if (next1) {
          next1.onclick = () => {
            this.bookingStep = 2;
            this.renderBookingStep(services, counselors, user);
          };
        }
      }
    }

    // Step 2: Render Counselors
    if (this.bookingStep === 2) {
      const list = document.getElementById('booking-counselors-list');
      if (list) {
        list.innerHTML = counselors.map(c => `
          <div class="counselor-row-card ${c.id === this.selectedCounselorId ? 'selected' : ''}" data-id="${c.id}">
            <div class="counselor-row-main">
              <div class="counselor-avatar">${c.avatarInitial || c.name.charAt(0)}</div>
              <div class="counselor-info">
                <h4>${c.name}</h4>
                <div class="c-sub">${c.title || 'Registered Guidance Counselor'}</div>
                <div class="counselor-tags">
                  <span class="badge badge-brand">${c.specialization || 'General'}</span>
                  <span class="counselor-row-avail">● Available Today</span>
                </div>
              </div>
            </div>
            <button class="btn ${c.id === this.selectedCounselorId ? 'btn-primary' : 'btn-secondary'} btn-sm btn-select-counselor">
              ${c.id === this.selectedCounselorId ? 'Selected' : 'Select'}
            </button>
          </div>
        `).join('');

        list.querySelectorAll('.counselor-row-card').forEach(card => {
          card.addEventListener('click', () => {
            list.querySelectorAll('.counselor-row-card').forEach(c => {
              c.classList.remove('selected');
              const b = c.querySelector('.btn-select-counselor');
              if (b) { b.className = 'btn btn-secondary btn-sm btn-select-counselor'; b.textContent = 'Select'; }
            });
            card.classList.add('selected');
            const b = card.querySelector('.btn-select-counselor');
            if (b) { b.className = 'btn btn-primary btn-sm btn-select-counselor'; b.textContent = 'Selected'; }
            this.selectedCounselorId = card.getAttribute('data-id');
          });
        });

        const back2 = document.getElementById('btn-step2-back');
        if (back2) back2.onclick = () => { this.bookingStep = 1; this.renderBookingStep(services, counselors, user); };
        const next2 = document.getElementById('btn-step2-next');
        if (next2) next2.onclick = () => { this.bookingStep = 3; this.renderBookingStep(services, counselors, user); };
      }
    }

    // Step 3: Date & Slots
    if (this.bookingStep === 3) {
      const slots = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];
      const slotGrid = document.getElementById('booking-slots-grid');
      if (slotGrid) {
        slotGrid.innerHTML = slots.map(slot => `
          <button type="button" class="slot-btn ${slot === this.selectedTimeSlot ? 'selected' : ''}" data-slot="${slot}">
            ${slot}
          </button>
        `).join('');

        slotGrid.querySelectorAll('.slot-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            slotGrid.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            this.selectedTimeSlot = btn.getAttribute('data-slot');
          });
        });
      }

      const dateInput = document.getElementById('book-schedule-date');
      if (dateInput) {
        dateInput.value = this.selectedDate;
        dateInput.addEventListener('change', (e) => {
          this.selectedDate = e.target.value;
        });
      }

      const back3 = document.getElementById('btn-step3-back');
      if (back3) back3.onclick = () => { this.bookingStep = 2; this.renderBookingStep(services, counselors, user); };
      const next3 = document.getElementById('btn-step3-next');
      if (next3) next3.onclick = () => { this.bookingStep = 4; this.renderBookingStep(services, counselors, user); };
    }

    // Step 4: Modality & Reason
    if (this.bookingStep === 4) {
      const back4 = document.getElementById('btn-step4-back');
      if (back4) back4.onclick = () => { this.bookingStep = 3; this.renderBookingStep(services, counselors, user); };
      const next4 = document.getElementById('btn-step4-next');
      if (next4) next4.onclick = () => { this.bookingStep = 5; this.renderBookingStep(services, counselors, user); };
    }

    // Step 5: Summary & Final Submission
    if (this.bookingStep === 5) {
      const srv = services.find(s => s.id === this.selectedServiceId) || services[0];
      const cns = counselors.find(c => c.id === this.selectedCounselorId) || counselors[0];

      const sStudent = document.getElementById('summary-student');
      if (sStudent) sStudent.textContent = `${user.name} (${user.studentId || 'BSIT'})`;
      const sService = document.getElementById('summary-service');
      if (sService) sService.textContent = srv.title;
      const sCounselor = document.getElementById('summary-counselor');
      if (sCounselor) sCounselor.textContent = cns.name;
      const sSchedule = document.getElementById('summary-schedule');
      if (sSchedule) sSchedule.textContent = `${this.selectedDate} at ${this.selectedTimeSlot}`;

      const back5 = document.getElementById('btn-step5-back');
      if (back5) back5.onclick = () => { this.bookingStep = 4; this.renderBookingStep(services, counselors, user); };

      const submitBtn = document.getElementById('btn-submit-final-booking');
      if (submitBtn) {
        submitBtn.onclick = async () => {
          const modality = document.getElementById('book-modality')?.value || 'In-Person';
          const urgency = document.getElementById('book-urgency')?.value || 'Routine';
          const reason = document.getElementById('book-reason')?.value || 'Guidance Consultation';

          try {
            const newApt = await ApiClient.createAppointment({
              studentId: user.id,
              studentName: user.name,
              counselorId: cns.id,
              counselorName: cns.name,
              serviceId: srv.id,
              serviceTitle: srv.title,
              date: this.selectedDate,
              timeSlot: this.selectedTimeSlot,
              modality,
              urgency,
              reason
            });

            Toast.success('Appointment Confirmed', 'Your guidance appointment has been scheduled!');
            Modal.showAppointmentPass(newApt);
            setTimeout(() => {
              window.location.href = 'appointments.html';
            }, 4000);
          } catch (err) {
            Toast.error('Booking Failed', err.message);
          }
        };
      }
    }
  },

  /* ── My Appointments Page Logic ── */
  async initAppointments() {
    Portal.init('student');
    const user = Portal.currentUser;

    const appointments = await ApiClient.getAppointments({ studentId: user.id });
    const tbody = document.getElementById('student-apts-tbody');
    if (!tbody) return;

    const renderTable = (filter = 'all') => {
      let list = appointments;
      if (filter !== 'all') {
        list = appointments.filter(a => a.status.toLowerCase() === filter.toLowerCase());
      }

      if (list.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center" style="padding: 2.5rem; color: var(--slate-400);">
              No appointments found for this filter.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = list.map(a => `
        <tr>
          <td>
            <a href="javascript:void(0)" class="btn-view-apt" data-id="${a.id}" style="font-family: var(--font-mono); font-weight: 800; color: var(--bcc-brand); text-decoration: underline; cursor: pointer;" title="Click to view full details">
              ${a.referenceCode}
            </a>
          </td>
          <td>
            <strong>${a.serviceTitle}</strong>
            <div style="font-size: 11px; color: var(--slate-400);">${a.modality}</div>
          </td>
          <td>${a.counselorName}</td>
          <td>
            <div>${a.date}</div>
            <div style="font-size: 11px; color: var(--slate-400);">${a.timeSlot}</div>
          </td>
          <td>
            <span class="badge badge-${a.status.toLowerCase()}">
              <span class="badge-dot"></span> ${a.status}
            </span>
          </td>
          <td>
            <div class="flex gap-2">
              <button class="btn btn-primary btn-sm btn-view-apt" data-id="${a.id}">View</button>
              <button class="btn btn-secondary btn-sm btn-print-pass" data-id="${a.id}">Pass Slip</button>
              ${a.status === 'Completed' ? `
                <button class="btn btn-outline btn-sm btn-feedback-apt" data-id="${a.id}" style="color: var(--bcc-brand); border-color: var(--bcc-brand); font-weight: 700;">★ Feedback</button>
              ` : ''}
              ${a.status === 'Pending' || a.status === 'Approved' ? `
                <button class="btn btn-outline btn-sm btn-cancel-apt" data-id="${a.id}" style="color: #dc2626; border-color: #fca5a5;">Cancel</button>
              ` : ''}
            </div>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('.btn-view-apt').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const apt = appointments.find(x => x.id === btn.getAttribute('data-id'));
          if (apt) Modal.showAppointmentDetails(apt);
        });
      });

      tbody.querySelectorAll('.btn-print-pass').forEach(btn => {
        btn.addEventListener('click', () => {
          const apt = appointments.find(x => x.id === btn.getAttribute('data-id'));
          if (apt) Modal.showAppointmentPass(apt);
        });
      });

      tbody.querySelectorAll('.btn-feedback-apt').forEach(btn => {
        btn.addEventListener('click', () => {
          const apt = appointments.find(x => x.id === btn.getAttribute('data-id'));
          if (apt) StudentController.showFeedbackModal(apt);
        });
      });

      tbody.querySelectorAll('.btn-cancel-apt').forEach(btn => {
        btn.addEventListener('click', () => {
          const aptId = btn.getAttribute('data-id');
          Modal.confirm({
            title: 'Cancel Appointment',
            message: 'Are you sure you want to cancel this appointment? Please adhere to the 4-hour cancellation policy.',
            confirmText: 'Yes, Cancel',
            confirmType: 'btn-secondary',
            onConfirm: async () => {
              try {
                await ApiClient.cancelAppointment(aptId, 'Student Request');
                Toast.success('Cancelled', 'Your appointment has been cancelled.');
                setTimeout(() => window.location.reload(), 800);
              } catch (err) {
                Toast.error('Error', err.message);
              }
            }
          });
        });
      });
    };

    renderTable('all');

    // Filter Buttons
    document.querySelectorAll('.filter-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderTable(btn.getAttribute('data-filter'));
      });
    });
  },

  /* ── Counseling History Page Logic ── */
  async initHistory() {
    Portal.init('student');
    const user = Portal.currentUser;

    const appointments = await ApiClient.getAppointments({ studentId: user.id });
    const historyList = appointments.filter(a => a.status === 'Completed' || a.status === 'Cancelled');
    const tbody = document.getElementById('student-history-tbody');
    if (!tbody) return;

    if (historyList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center" style="padding: 2.5rem; color: var(--slate-400);">
            No past counseling history on record.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = historyList.map(a => `
      <tr>
        <td>
          <a href="javascript:void(0)" class="btn-view-hist-apt" data-id="${a.id}" style="font-family: var(--font-mono); font-weight: 800; color: var(--bcc-brand); text-decoration: underline; cursor: pointer;">
            ${a.referenceCode}
          </a>
        </td>
        <td><strong>${a.serviceTitle}</strong></td>
        <td>${a.counselorName}</td>
        <td>${a.date} at ${a.timeSlot}</td>
        <td>
          <span class="badge badge-${a.status.toLowerCase()}">
            <span class="badge-dot"></span> ${a.status}
          </span>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-view-hist-apt').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const apt = appointments.find(x => x.id === btn.getAttribute('data-id'));
        if (apt) Modal.showAppointmentDetails(apt);
      });
    });
  },

  /* ── Feedback Modal (Section 5.9) ── */
  showFeedbackModal(apt) {
    const existingFeedback = StorageService.getFeedback ? StorageService.getFeedback(apt.id) : null;
    if (existingFeedback) {
      Modal.open({
        title: '⭐ Session Feedback Already Submitted',
        size: 'modal-md',
        content: `
          <div style="padding: 1rem; line-height: 1.6;">
            <p>You have already submitted feedback for this counseling session.</p>
            <div style="margin-top: 1rem; background: var(--bg-subtle); padding: 1rem; border-radius: var(--r-md); border: 1px solid var(--border);">
              <div style="color: #f59e0b; font-size: 1.25rem;">${'★'.repeat(existingFeedback.rating)}${'☆'.repeat(5 - existingFeedback.rating)}</div>
              <p style="margin-top: 0.5rem; font-size: var(--text-sm); color: var(--slate-700); font-style: italic;">"${existingFeedback.comments || 'No remarks provided.'}"</p>
            </div>
          </div>
        `,
        footer: `<button class="btn btn-primary" onclick="Modal.close()">Close</button>`
      });
      return;
    }

    const content = `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        <div style="background: var(--bg-subtle); padding: 1rem; border-radius: var(--r-md); border: 1px solid var(--border);">
          <div style="font-weight: 700; color: var(--slate-900);">${apt.serviceTitle}</div>
          <div style="font-size: var(--text-xs); color: var(--slate-500); margin-top: 2px;">
            Counselor: ${apt.counselorName} &bull; ${apt.date} at ${apt.timeSlot}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label required">How would you rate your counseling experience?</label>
          <div style="display: flex; gap: 0.5rem; font-size: 1.75rem; cursor: pointer; user-select: none;" id="star-picker">
            <span class="star-item" data-val="1" style="color: #f59e0b;">★</span>
            <span class="star-item" data-val="2" style="color: #f59e0b;">★</span>
            <span class="star-item" data-val="3" style="color: #f59e0b;">★</span>
            <span class="star-item" data-val="4" style="color: #f59e0b;">★</span>
            <span class="star-item" data-val="5" style="color: #f59e0b;">★</span>
          </div>
          <input type="hidden" id="fb-rating-input" value="5">
        </div>

        <div class="form-group">
          <label class="form-label">Confidential Feedback &amp; Suggestions</label>
          <textarea id="fb-comments-input" class="form-textarea" placeholder="Share your experience to help us improve student counseling services..."></textarea>
        </div>
      </div>
    `;

    const modal = Modal.open({
      title: '⭐ Counseling Service Feedback',
      size: 'modal-md',
      content,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-fb-confirm">Submit Feedback</button>
      `
    });

    // Star click interaction
    const starItems = modal.querySelectorAll('.star-item');
    const ratingInput = modal.querySelector('#fb-rating-input');
    starItems.forEach(star => {
      star.addEventListener('click', () => {
        const val = parseInt(star.getAttribute('data-val'), 10);
        ratingInput.value = val;
        starItems.forEach(s => {
          const sVal = parseInt(s.getAttribute('data-val'), 10);
          s.style.color = sVal <= val ? '#f59e0b' : '#cbd5e1';
        });
      });
    });

    modal.querySelector('#btn-submit-fb-confirm').addEventListener('click', async () => {
      const user = Portal.currentUser;
      const rating = parseInt(ratingInput.value, 10);
      const comments = modal.querySelector('#fb-comments-input').value.trim();

      try {
        await ApiClient.submitFeedback(apt.id, user.id, rating, comments);
        Modal.close();
        Toast.success('Feedback Submitted', 'Thank you for your valuable feedback! It has been securely recorded.');
        setTimeout(() => window.location.reload(), 700);
      } catch (err) {
        Toast.error('Error', err.message);
      }
    });
  },

  /* ── Guidance Resources Page Logic (Section 5.8) ── */
  async initResources() {
    Portal.init('student');
    const container = document.getElementById('resources-grid');
    if (!container) return;

    let currentCategory = 'All';
    let resources = await ApiClient.getGuidanceResources();

    const renderResources = (list) => {
      if (list.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1/-1; padding: 3rem 1rem; text-align: center; color: var(--slate-400);">
            No guidance resources found for this category.
          </div>
        `;
        return;
      }

      container.innerHTML = list.map(r => `
        <div class="service-select-card" style="cursor: default; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
              <span class="badge badge-brand">${r.category}</span>
              <span style="font-size: 11px; color: var(--slate-400); font-weight: 600;">${r.targetProgram || 'All Programs'}</span>
            </div>
            <h4 style="font-size: 1rem; font-weight: 800; color: var(--slate-900); margin-bottom: 0.5rem; line-height: 1.4;">
              ${r.title}
            </h4>
            <p style="font-size: var(--text-xs); color: var(--slate-600); line-height: 1.6; margin-bottom: 1rem;">
              ${r.description}
            </p>
          </div>
          <div style="padding-top: 1rem; border-top: 1px solid var(--border-light);">
            <button class="btn btn-primary btn-sm btn-read-res" data-id="${r.id}" style="width: 100%;">
              Read &amp; View Guide &rarr;
            </button>
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.btn-read-res').forEach(btn => {
        btn.addEventListener('click', () => {
          const resId = btn.getAttribute('data-id');
          const item = list.find(x => x.id === resId);
          if (item) {
            Modal.open({
              title: `📘 ${item.title}`,
              size: 'modal-lg',
              content: `
                <div style="line-height: 1.7; color: var(--slate-700);">
                  <div style="margin-bottom: 1rem;">
                    <span class="badge badge-brand">${item.category}</span>
                    <span style="font-size: var(--text-xs); color: var(--slate-400); margin-left: 0.5rem;">Target: ${item.targetProgram || 'All Students'}</span>
                  </div>
                  <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--slate-900); margin-bottom: 0.5rem;">Resource Overview</h4>
                  <p style="margin-bottom: 1.5rem; color: var(--slate-600); font-size: var(--text-sm);">${item.description}</p>
                  
                  <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--slate-900); margin-bottom: 0.5rem;">Counseling Recommendations &amp; Guidance</h4>
                  <div style="background: var(--bg-subtle); padding: 1.25rem; border-radius: var(--r-md); border-left: 4px solid var(--bcc-brand); font-size: 0.95rem; line-height: 1.7;">
                    ${item.content || item.description}
                  </div>
                </div>
              `,
              footer: `<button class="btn btn-primary" onclick="Modal.close()">Close Guide</button>`
            });
          }
        });
      });
    };

    renderResources(resources);

    // Filter Tabs
    document.querySelectorAll('.filter-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.getAttribute('data-cat');
        const filtered = currentCategory === 'All' ? resources : resources.filter(r => r.category === currentCategory);
        renderResources(filtered);
      });
    });

    // Search
    const searchInput = document.getElementById('resource-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        const filtered = resources.filter(r => 
          (currentCategory === 'All' || r.category === currentCategory) &&
          (r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))
        );
        renderResources(filtered);
      });
    }
  },

  /* ── Profile Page Logic (Section 5.2) ── */
  initProfile() {
    Portal.init('student');
    const user = Portal.currentUser;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val || '—';
    };

    setVal('prof-name', user.name);
    setVal('prof-id', user.studentId || user.student_id_number || 'BCC-2023-01048');
    setVal('prof-course', `${user.course || 'BSIT'} ${user.yearSection || user.year_section || '3A'}`);
    setVal('prof-email', user.email);
    setVal('prof-phone', user.phone || '0917-555-0192');
    setVal('prof-emergency', user.emergencyContact || user.emergency_contact || 'Maria Dela Cruz (Mother)');

    // Contact Update Action
    const editBtn = document.getElementById('btn-edit-contact');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        const content = `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Student Contact Phone Number</label>
              <input type="text" id="edit-phone" class="form-input" value="${user.phone || '0917-555-0192'}" required>
            </div>
            <div class="form-group">
              <label class="form-label required">Emergency Contact (Name, Relationship &amp; Phone)</label>
              <input type="text" id="edit-emergency" class="form-input" value="${user.emergencyContact || user.emergency_contact || 'Maria Dela Cruz (Mother) - 0918-000-1111'}" required>
            </div>
          </div>
        `;

        const modal = Modal.open({
          title: 'Update Permitted Contact Information',
          size: 'modal-md',
          content,
          footer: `
            <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
            <button class="btn btn-primary" id="btn-save-contact-modal">Save Changes</button>
          `
        });

        modal.querySelector('#btn-save-contact-modal').addEventListener('click', async () => {
          const phone = document.getElementById('edit-phone').value.trim();
          const emergency = document.getElementById('edit-emergency').value.trim();
          if (!phone || !emergency) {
            Toast.warning('Validation', 'Please provide both contact number and emergency contact.');
            return;
          }

          try {
            await ApiClient.updateProfile(user.id, phone, emergency);
            user.phone = phone;
            user.emergencyContact = emergency;
            user.emergency_contact = emergency;
            StorageService.saveUser(user);
            StorageService.setCurrentUser(user);

            Modal.close();
            Toast.success('Profile Updated', 'Contact information updated successfully.');
            setVal('prof-phone', phone);
            setVal('prof-emergency', emergency);
          } catch (err) {
            Toast.error('Update Failed', err.message);
          }
        });
      });
    }

    // Change Password Action
    const changePassBtn = document.getElementById('btn-change-password');
    if (changePassBtn) {
      changePassBtn.addEventListener('click', () => {
        const content = `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Current Password</label>
              <input type="password" id="cp-current" class="form-input" placeholder="Enter current password" required>
            </div>
            <div class="form-group">
              <label class="form-label required">New Password</label>
              <input type="password" id="cp-new" class="form-input" placeholder="Min. 6 characters" required>
            </div>
            <div class="form-group">
              <label class="form-label required">Confirm New Password</label>
              <input type="password" id="cp-confirm" class="form-input" placeholder="Re-enter new password" required>
            </div>
          </div>
        `;

        const modal = Modal.open({
          title: '🔒 Change Account Password',
          size: 'modal-md',
          content,
          footer: `
            <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
            <button class="btn btn-primary" id="btn-save-pass-modal">Update Password</button>
          `
        });

        modal.querySelector('#btn-save-pass-modal').addEventListener('click', async () => {
          const currentPass = document.getElementById('cp-current').value;
          const newPass = document.getElementById('cp-new').value;
          const confirmPass = document.getElementById('cp-confirm').value;

          if (!currentPass || !newPass || !confirmPass) {
            Toast.warning('Validation', 'Please fill in all password fields.');
            return;
          }

          if (newPass.length < 6) {
            Toast.warning('Validation', 'New password must be at least 6 characters long.');
            return;
          }

          if (newPass !== confirmPass) {
            Toast.warning('Validation', 'New passwords do not match.');
            return;
          }

          try {
            await ApiClient.changePassword(user.id, currentPass, newPass);
            Modal.close();
            Toast.success('Password Changed', 'Your password has been securely updated.');
          } catch (err) {
            Toast.error('Error', err.message);
          }
        });
      });
    }
  }
};
