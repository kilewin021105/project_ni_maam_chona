/**
 * Buenavista Community College — Student Module Controller
 */

const StudentController = {
  user: null,

  async start() {
    this.user = await Portal.init('student');
    return this.user;
  },

  /* ── Dashboard ── */
  async initDashboard() {
    if (!await this.start()) return;
    const user = this.user;

    const greet = document.getElementById('dash-greeting');
    if (greet) greet.textContent = `${Utils.greeting()}, ${Utils.firstName(user.name) || 'Student'}!`;

    try {
      const apts = await ApiClient.getAppointments();
      const upcoming = apts.filter(a => Utils.isUpcoming(a)).sort((a, b) => (a.date + a.timeSlot).localeCompare(b.date + b.timeSlot));
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set('metric-upcoming', upcoming.length);
      set('metric-total', apts.length);
      set('metric-completed', apts.filter(a => a.status === 'Completed').length);
      set('metric-cancelled', apts.filter(a => a.status === 'Cancelled').length);

      const card = document.getElementById('dash-upcoming-content');
      const next = upcoming[0];
      if (card && next) {
        card.innerHTML = `
          <div style="background: var(--bg-subtle); border: 1px solid var(--border); border-radius: var(--r-md); padding: 1.25rem;">
            <div class="flex items-center justify-between" style="margin-bottom: 0.75rem; gap: 0.5rem; flex-wrap: wrap;">
              <div>
                <span class="badge badge-brand">${esc(next.modality)}</span>
                <h4 style="font-size: var(--text-base); font-weight: 800; margin-top: 0.35rem;">${esc(next.serviceTitle)}</h4>
              </div>
              ${Utils.statusBadge(next.status)}
            </div>
            <div style="font-size: var(--text-xs); color: var(--slate-600); margin-bottom: 1rem;">
              <div><strong>Counselor:</strong> ${esc(next.counselorName)}</div>
              <div style="margin-top: 2px;"><strong>Schedule:</strong> ${esc(Utils.formatDate(next.date, { weekday: 'short', month: 'short', day: 'numeric' }))} at ${esc(next.timeSlot)}</div>
              ${upcoming.length > 1 ? `<div style="margin-top: 2px; color: var(--slate-400);">+${upcoming.length - 1} more upcoming</div>` : ''}
            </div>
            <div class="flex gap-2 justify-end">
              <button type="button" class="btn btn-primary btn-sm" id="dash-view-apt">View Details</button>
              <button type="button" class="btn btn-secondary btn-sm" id="dash-view-pass">Pass Slip</button>
            </div>
          </div>`;
        card.querySelector('#dash-view-apt').addEventListener('click', () => this.showDetails(next));
        card.querySelector('#dash-view-pass').addEventListener('click', () => Modal.showAppointmentPass(next));
      } else if (card) {
        card.innerHTML = `
          <div class="text-center" style="padding: 2rem 1rem; color: var(--slate-500);">
            <p class="text-sm">You have no upcoming appointments.</p>
            <a href="book.html" class="btn btn-primary btn-sm" style="margin-top: 0.75rem;">Book an Appointment</a>
          </div>`;
      }
    } catch (err) {
      Toast.error('Could not load your appointments', err.message);
    }

    const adv = document.getElementById('dash-advisory-content');
    if (adv) {
      try {
        const list = await ApiClient.getAnnouncements();
        adv.innerHTML = list.length ? list.slice(0, 3).map((a, i, arr) => `
          <div style="${i < arr.length - 1 ? 'padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-light);' : ''}">
            <div class="flex items-center justify-between" style="font-size: 11px; color: var(--slate-400); margin-bottom: 2px; gap: 0.5rem;">
              <span class="badge badge-brand">${esc(a.category || 'Notice')}</span>
              <span>${esc(Utils.formatDate(a.created_at))}</span>
            </div>
            <h5 style="font-size: var(--text-sm); font-weight: 700; color: var(--slate-900);">${esc(a.title)}</h5>
            <p style="font-size: var(--text-xs); color: var(--slate-600); margin-top: 2px; white-space: pre-line;">${esc(a.content)}</p>
          </div>`).join('')
          : '<p class="text-xs text-muted">No announcements right now.</p>';
      } catch (err) {
        adv.innerHTML = '<p class="text-xs text-muted">Announcements could not be loaded.</p>';
      }
    }
  },

  /* ── Services catalog ── */
  async initServices() {
    if (!await this.start()) return;
    const grid = document.getElementById('services-catalog-grid');
    if (!grid) return;
    try {
      const services = await ApiClient.getServices();
      grid.innerHTML = services.length ? services.map(s => `
        <div class="service-select-card" style="cursor: default;">
          <div class="service-select-icon">${Icons.get(s.icon || 'book-open')}</div>
          <div class="service-select-title">${esc(s.title)}</div>
          <div class="service-select-desc">${esc(s.description)}</div>
          <div style="margin-top: 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
            <span style="font-size: 11px; font-weight: 700; color: var(--slate-500);">⏱ ${s.durationMinutes} mins</span>
            <a href="book.html?service=${encodeURIComponent(s.id)}" class="btn btn-primary btn-sm">Book Appointment &rarr;</a>
          </div>
        </div>`).join('')
        : '<p class="text-muted">No guidance services are available right now.</p>';
    } catch (err) {
      grid.innerHTML = `<p style="color: #b91c1c;">${esc(err.message)}</p>`;
    }
  },

  /* ── 5-step booking wizard ── */
  booking: { step: 1, serviceId: null, counselorId: null, date: null, slot: null },

  async initBook() {
    if (!await this.start()) return;
    let services, counselors, settings;
    try {
      [services, counselors, settings] = await Promise.all([ApiClient.getServices(), ApiClient.getCounselors(), ApiClient.getPublicSettings()]);
    } catch (err) {
      Toast.error('Could not load booking options', err.message);
      return;
    }
    this.bookingData = { services, counselors, settings };

    const preset = new URLSearchParams(window.location.search).get('service');
    if (preset && services.some(s => s.id === preset)) this.booking.serviceId = preset;

    const lead = Number(settings.lead_time_hours) || 0;
    const maxDays = Number(settings.max_advance_booking_days) || 14;
    const rule = document.getElementById('book-date-rule');
    if (rule) rule.textContent = `Book at least ${lead} hour${lead === 1 ? '' : 's'} in advance and up to ${maxDays} days ahead. Monday to Friday only.`;
    const dateInput = document.getElementById('book-schedule-date');
    if (dateInput) {
      dateInput.min = Utils.todayISO();
      dateInput.max = Utils.todayISO(maxDays);
      dateInput.addEventListener('change', () => {
        this.booking.date = dateInput.value || null;
        this.booking.slot = null;
        this.loadSlots();
      });
    }
    const reason = document.getElementById('book-reason');
    const counter = document.getElementById('book-reason-count');
    if (reason && counter) reason.addEventListener('input', () => { counter.textContent = `${reason.value.trim().length} / 1000`; });
    const urgency = document.getElementById('book-urgency');
    const crisis = document.getElementById('book-crisis-note');
    if (urgency && crisis) urgency.addEventListener('change', () => { crisis.hidden = urgency.value === 'Routine'; });

    const go = (step) => { this.booking.step = step; this.renderBookingStep(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    on('btn-step1-next', () => this.booking.serviceId ? go(2) : Toast.warning('Choose a service', 'Select the kind of help you need first.'));
    on('btn-step2-back', () => go(1));
    on('btn-step2-next', () => this.booking.counselorId ? go(3) : Toast.warning('Choose a counselor', 'Select a guidance counselor to continue.'));
    on('btn-step3-back', () => go(2));
    on('btn-step3-next', () => {
      if (!this.booking.date) return Toast.warning('Choose a date', 'Pick the day you want to come in.');
      if (!this.booking.slot) return Toast.warning('Choose a time', 'Pick one of the available time slots.');
      go(4);
    });
    on('btn-step4-back', () => go(3));
    on('btn-step4-next', () => {
      const text = (document.getElementById('book-reason').value || '').trim();
      if (text.length < 10) return Toast.warning('Tell us a little more', 'Please describe your concern in at least 10 characters.');
      go(5);
    });
    on('btn-step5-back', () => go(4));
    on('btn-submit-final-booking', (e) => this.submitBooking(e.currentTarget));

    this.renderBookingStep();
  },

  renderBookingStep() {
    const { step } = this.booking;
    const { services, counselors } = this.bookingData;
    for (let i = 1; i <= 5; i++) {
      const ind = document.getElementById(`step-indicator-${i}`);
      if (ind) ind.className = `step-item${i === step ? ' active' : i < step ? ' completed' : ''}`;
      const box = document.getElementById(`step-container-${i}`);
      if (box) box.style.display = i === step ? 'block' : 'none';
    }

    if (step === 1) {
      const grid = document.getElementById('booking-services-grid');
      grid.innerHTML = services.map(s => `
        <div class="service-select-card ${s.id === this.booking.serviceId ? 'selected' : ''}" data-id="${esc(s.id)}" role="button" tabindex="0" aria-pressed="${s.id === this.booking.serviceId}">
          <div class="service-select-icon">${Icons.get(s.icon || 'book-open')}</div>
          <div class="service-select-title">${esc(s.title)}</div>
          <div class="service-select-desc">${esc(s.description)}</div>
          <div style="font-size: 11px; font-weight: 700; color: var(--slate-500); margin-top: 0.5rem;">⏱ ${s.durationMinutes} mins</div>
        </div>`).join('') || '<p class="text-muted">No services are available right now.</p>';
      grid.querySelectorAll('.service-select-card').forEach(card => {
        const pick = () => { this.booking.serviceId = card.dataset.id; this.renderBookingStep(); };
        card.addEventListener('click', pick);
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      });
    }

    if (step === 2) {
      const list = document.getElementById('booking-counselors-list');
      list.innerHTML = counselors.map(c => {
        const selected = c.id === this.booking.counselorId;
        return `
          <div class="counselor-row-card ${selected ? 'selected' : ''}" data-id="${esc(c.id)}" role="button" tabindex="0" aria-pressed="${selected}">
            <div class="counselor-row-main">
              <div class="counselor-avatar">${esc(c.avatarInitial)}</div>
              <div class="counselor-info">
                <h4>${esc(c.name)}</h4>
                <div class="c-sub">${esc(c.title || 'Guidance Counselor')}</div>
                <div class="counselor-tags">
                  <span class="badge badge-brand">${esc(c.specialization || 'General Guidance')}</span>
                  ${c.room ? `<span style="font-size: 11px; color: var(--slate-500);">${esc(c.room)}</span>` : ''}
                </div>
              </div>
            </div>
            <span class="btn ${selected ? 'btn-primary' : 'btn-secondary'} btn-sm">${selected ? 'Selected' : 'Select'}</span>
          </div>`;
      }).join('') || '<p class="text-muted">No counselors are available right now.</p>';
      list.querySelectorAll('.counselor-row-card').forEach(card => {
        const pick = () => {
          if (this.booking.counselorId !== card.dataset.id) this.booking.slot = null;
          this.booking.counselorId = card.dataset.id;
          this.renderBookingStep();
        };
        card.addEventListener('click', pick);
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      });
    }

    if (step === 3) {
      const dateInput = document.getElementById('book-schedule-date');
      if (dateInput) dateInput.value = this.booking.date || '';
      this.loadSlots();
    }

    if (step === 5) {
      const srv = services.find(s => s.id === this.booking.serviceId);
      const cns = counselors.find(c => c.id === this.booking.counselorId);
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set('summary-student', `${this.user.name}${this.user.studentId ? ` (${this.user.studentId})` : ''}`);
      set('summary-service', srv ? srv.title : '—');
      set('summary-counselor', cns ? cns.name : '—');
      set('summary-schedule', `${Utils.formatDate(this.booking.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at ${this.booking.slot}`);
      set('summary-modality', document.getElementById('book-modality').value);
      set('summary-reason', document.getElementById('book-reason').value.trim());
    }
  },

  async loadSlots() {
    const grid = document.getElementById('booking-slots-grid');
    const msg = document.getElementById('booking-slots-message');
    if (!grid) return;
    if (!this.booking.date) {
      grid.innerHTML = '';
      if (msg) msg.textContent = 'Choose a date to see the open time slots.';
      return;
    }
    grid.innerHTML = '<p class="text-xs text-muted">Checking available times…</p>';
    if (msg) msg.textContent = '';
    try {
      const res = await ApiClient.getAvailableSlots(this.booking.counselorId, this.booking.date);
      grid.innerHTML = res.slots.map(s => `
        <button type="button" class="slot-btn ${s.time === this.booking.slot ? 'selected' : ''}" data-slot="${esc(s.time)}"
                ${s.available ? '' : 'disabled'} title="${esc(s.available ? 'Available' : s.reason || 'Not available')}">
          ${esc(s.time)}
        </button>`).join('');
      if (msg) msg.textContent = res.message || '';
      grid.querySelectorAll('.slot-btn:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => {
          grid.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          this.booking.slot = btn.dataset.slot;
        });
      });
    } catch (err) {
      grid.innerHTML = '';
      if (msg) msg.textContent = err.message;
    }
  },

  async submitBooking(button) {
    const payload = {
      service_id: this.booking.serviceId,
      counselor_id: this.booking.counselorId,
      date: this.booking.date,
      time_slot: this.booking.slot,
      modality: document.getElementById('book-modality').value,
      urgency: document.getElementById('book-urgency').value,
      reason: document.getElementById('book-reason').value.trim()
    };
    try {
      const apt = await Utils.withBusy(button, 'Booking…', () => ApiClient.createAppointment(payload));
      const box = document.getElementById('step-container-5');
      box.innerHTML = `
        <div class="card" style="text-align: center; padding: 2rem 1.25rem;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--bcc-subtle); color: var(--bcc-brand); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">${Icons.get('check-circle')}</div>
          <h3 style="font-size: 1.25rem; font-weight: 800;">Appointment request sent</h3>
          <p class="text-sm text-muted" style="margin: 0.5rem auto 0; max-width: 46ch;">
            Reference <strong style="font-family: var(--font-mono);">${esc(apt.referenceCode)}</strong>. ${esc(apt.counselorName)} will review it,
            and you'll get a notification when it is approved.
          </p>
          <div class="flex gap-2 justify-center" style="margin-top: 1.5rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-secondary" id="btn-booked-pass">View Pass Slip</button>
            <a href="appointments.html" class="btn btn-primary">Go to My Appointments</a>
          </div>
        </div>`;
      box.querySelector('#btn-booked-pass').addEventListener('click', () => Modal.showAppointmentPass(apt));
      document.getElementById('step-indicator-5').className = 'step-item completed';
      Toast.success('Appointment requested', 'Your request was sent to the counselor.');
    } catch (err) {
      Toast.error('Booking failed', err.message);
      if (/booked|slot|time|date|advance|ahead|Monday/i.test(err.message)) {
        this.booking.slot = null;
        this.booking.step = 3;
        this.renderBookingStep();
      }
    }
  },

  /* ── Shared appointment actions ── */
  appointmentActions(apt, onDone) {
    const actions = [];
    if (apt.status === 'Completed' && !apt.hasFeedback) {
      actions.push({ label: '★ Rate this session', className: 'btn-primary', onClick: () => this.showFeedbackModal(apt, onDone) });
    }
    if (apt.status === 'Pending' || apt.status === 'Approved') {
      actions.push({ label: 'Cancel appointment', className: 'btn-danger', onClick: () => this.cancelAppointment(apt, onDone) });
    }
    return actions;
  },

  showDetails(apt, onDone = () => window.location.reload()) {
    Modal.showAppointmentDetails(apt, { actions: this.appointmentActions(apt, onDone) });
  },

  cancelAppointment(apt, onDone) {
    Modal.confirm({
      title: 'Cancel appointment',
      message: `Cancel ${apt.referenceCode} on ${Utils.formatDate(apt.date)} at ${apt.timeSlot}? Your counselor will be notified.`,
      confirmText: 'Yes, cancel it',
      cancelText: 'Keep it',
      danger: true,
      input: { label: 'Reason (optional)', placeholder: 'e.g. Class schedule conflict' },
      onConfirm: async (reason) => {
        await ApiClient.updateAppointmentStatus(apt.id, 'Cancelled', reason);
        Toast.success('Appointment cancelled', 'Your counselor has been notified.');
        onDone();
      }
    });
  },

  showFeedbackModal(apt, onDone) {
    const modal = Modal.open({
      title: '★ Rate your counseling session',
      size: 'modal-md',
      content: `
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div style="background: var(--bg-subtle); padding: 1rem; border-radius: var(--r-md); border: 1px solid var(--border);">
            <div style="font-weight: 700;">${esc(apt.serviceTitle)}</div>
            <div style="font-size: var(--text-xs); color: var(--slate-500); margin-top: 2px;">${esc(apt.counselorName)} • ${esc(Utils.formatDate(apt.date))} at ${esc(apt.timeSlot)}</div>
          </div>
          <div class="form-group" style="margin: 0;">
            <span class="form-label required" id="star-label">How would you rate your experience?</span>
            <div role="radiogroup" aria-labelledby="star-label" id="star-picker" style="display: flex; gap: 0.35rem; font-size: 1.9rem;">
              ${[1, 2, 3, 4, 5].map(v => `<button type="button" class="star-item" role="radio" aria-checked="false" aria-label="${v} star${v > 1 ? 's' : ''}" data-val="${v}" style="background: none; border: none; cursor: pointer; color: #cbd5e1; padding: 0 2px;">★</button>`).join('')}
            </div>
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label" for="fb-comments-input">Comments (optional, confidential)</label>
            <textarea id="fb-comments-input" class="form-textarea" maxlength="1000" placeholder="What helped? What could be better?"></textarea>
          </div>
        </div>`,
      footer: `
        <button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
        <button type="button" class="btn btn-primary" id="btn-submit-fb">Submit feedback</button>`
    });

    let rating = 0;
    const stars = modal.querySelectorAll('.star-item');
    stars.forEach(star => star.addEventListener('click', () => {
      rating = Number(star.dataset.val);
      stars.forEach(s => {
        const on = Number(s.dataset.val) <= rating;
        s.style.color = on ? '#f59e0b' : '#cbd5e1';
        s.setAttribute('aria-checked', String(Number(s.dataset.val) === rating));
      });
    }));

    const submit = modal.querySelector('#btn-submit-fb');
    submit.addEventListener('click', async () => {
      if (!rating) return Toast.warning('Choose a rating', 'Tap 1 to 5 stars.');
      try {
        await Utils.withBusy(submit, 'Sending…', () => ApiClient.submitFeedback(apt.id, rating, modal.querySelector('#fb-comments-input').value.trim()));
        Modal.close();
        Toast.success('Thank you!', 'Your feedback was recorded.');
        onDone();
      } catch (err) {
        Toast.error('Could not submit feedback', err.message);
      }
    });
  },

  /* ── My appointments ── */
  async initAppointments() {
    if (!await this.start()) return;
    const tbody = document.getElementById('student-apts-tbody');
    if (!tbody) return;
    let appointments = [];
    let filter = 'all';

    const render = () => {
      const list = filter === 'all' ? appointments : appointments.filter(a => a.status.toLowerCase() === filter);
      if (!list.length) {
        tbody.innerHTML = Utils.emptyRow(6, filter === 'all' ? 'You have no appointments yet.' : 'No appointments with this status.');
        return;
      }
      tbody.innerHTML = list.map(a => `
        <tr>
          <td><button type="button" class="link-button btn-view-apt" data-id="${esc(a.id)}">${esc(a.referenceCode)}</button></td>
          <td><strong>${esc(a.serviceTitle)}</strong><div style="font-size: 11px; color: var(--slate-400);">${esc(a.modality)}</div></td>
          <td>${esc(a.counselorName)}</td>
          <td><div>${esc(Utils.formatDate(a.date))}</div><div style="font-size: 11px; color: var(--slate-400);">${esc(a.timeSlot)}</div></td>
          <td>${Utils.statusBadge(a.status)}${a.hasFeedback ? `<div style="font-size: 11px; color: #b45309; margin-top: 2px;">${'★'.repeat(a.feedbackRating)}</div>` : ''}</td>
          <td>
            <div class="flex gap-2" style="flex-wrap: wrap;">
              <button type="button" class="btn btn-primary btn-sm btn-view-apt" data-id="${esc(a.id)}">View</button>
              ${a.status === 'Pending' || a.status === 'Approved' ? `<button type="button" class="btn btn-secondary btn-sm btn-pass" data-id="${esc(a.id)}">Pass Slip</button>` : ''}
              ${a.status === 'Completed' && !a.hasFeedback ? `<button type="button" class="btn btn-outline btn-sm btn-feedback" data-id="${esc(a.id)}">★ Rate</button>` : ''}
              ${a.status === 'Pending' || a.status === 'Approved' ? `<button type="button" class="btn btn-outline btn-sm btn-cancel" data-id="${esc(a.id)}" style="color: #dc2626; border-color: #fca5a5;">Cancel</button>` : ''}
            </div>
          </td>
        </tr>`).join('');

      const find = (btn) => appointments.find(x => x.id === btn.dataset.id);
      tbody.querySelectorAll('.btn-view-apt').forEach(b => b.addEventListener('click', () => this.showDetails(find(b), load)));
      tbody.querySelectorAll('.btn-pass').forEach(b => b.addEventListener('click', () => Modal.showAppointmentPass(find(b))));
      tbody.querySelectorAll('.btn-feedback').forEach(b => b.addEventListener('click', () => this.showFeedbackModal(find(b), load)));
      tbody.querySelectorAll('.btn-cancel').forEach(b => b.addEventListener('click', () => this.cancelAppointment(find(b), load)));
    };

    const load = async () => {
      Modal.close();
      tbody.innerHTML = Utils.loadingRow(6);
      try {
        appointments = await ApiClient.getAppointments();
        render();
      } catch (err) {
        tbody.innerHTML = Utils.errorRow(6, err.message);
      }
    };

    document.querySelectorAll('.filter-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab-btn').forEach(b => { b.classList.remove('active', 'btn-primary'); b.classList.add('btn-secondary'); });
        btn.classList.add('active', 'btn-primary');
        btn.classList.remove('btn-secondary');
        filter = btn.dataset.filter;
        render();
      });
    });
    load();
  },

  /* ── Counseling history ── */
  async initHistory() {
    if (!await this.start()) return;
    const tbody = document.getElementById('student-history-tbody');
    if (!tbody) return;
    const load = async () => {
      Modal.close();
      try {
        const history = (await ApiClient.getAppointments()).filter(a => a.status === 'Completed' || a.status === 'Cancelled');
        if (!history.length) {
          tbody.innerHTML = Utils.emptyRow(5, 'No past counseling sessions yet.');
          return;
        }
        tbody.innerHTML = history.map(a => `
          <tr>
            <td><button type="button" class="link-button" data-id="${esc(a.id)}">${esc(a.referenceCode)}</button></td>
            <td><strong>${esc(a.serviceTitle)}</strong></td>
            <td>${esc(a.counselorName)}</td>
            <td>${esc(Utils.formatDate(a.date))} at ${esc(a.timeSlot)}</td>
            <td>${Utils.statusBadge(a.status)}${a.hasFeedback ? ` <span style="font-size: 11px; color: #b45309;">${'★'.repeat(a.feedbackRating)}</span>` : ''}</td>
          </tr>`).join('');
        tbody.querySelectorAll('.link-button').forEach(b => b.addEventListener('click', () => this.showDetails(history.find(x => x.id === b.dataset.id), load)));
      } catch (err) {
        tbody.innerHTML = Utils.errorRow(5, err.message);
      }
    };
    load();
  },

  /* ── Guidance resources ── */
  async initResources() {
    if (!await this.start()) return;
    const container = document.getElementById('resources-grid');
    if (!container) return;
    let resources = [];
    let category = 'All';
    let query = '';

    const render = () => {
      const list = resources.filter(r => (category === 'All' || r.category === category)
        && (!query || `${r.title} ${r.description}`.toLowerCase().includes(query)));
      if (!list.length) {
        container.innerHTML = '<div style="grid-column: 1/-1; padding: 3rem 1rem; text-align: center; color: var(--slate-400);">No guides match your search.</div>';
        return;
      }
      container.innerHTML = list.map(r => `
        <div class="service-select-card" style="cursor: default; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; gap: 0.5rem;">
              <span class="badge badge-brand">${esc(r.category)}</span>
              <span style="font-size: 11px; color: var(--slate-400); font-weight: 600; text-align: right;">${esc(r.target_program || 'All Programs')}</span>
            </div>
            <h4 style="font-size: 1rem; font-weight: 800; color: var(--slate-900); margin-bottom: 0.5rem; line-height: 1.4;">${esc(r.title)}</h4>
            <p style="font-size: var(--text-xs); color: var(--slate-600); line-height: 1.6; margin-bottom: 1rem;">${esc(r.description)}</p>
          </div>
          <div style="padding-top: 1rem; border-top: 1px solid var(--border-light);">
            <button type="button" class="btn btn-primary btn-sm btn-read-res" data-id="${esc(r.id)}" style="width: 100%;">Read guide &rarr;</button>
          </div>
        </div>`).join('');
      container.querySelectorAll('.btn-read-res').forEach(btn => btn.addEventListener('click', () => {
        const r = resources.find(x => x.id === btn.dataset.id);
        // Seed guides are written as "1. … 2. …" in one paragraph; put each numbered step on its own line
        const body = esc(r.content || r.description).replace(/\s(\d{1,2})\.\s/g, '\n$1. ');
        Modal.open({
          title: `📘 ${esc(r.title)}`,
          size: 'modal-lg',
          content: `
            <div style="line-height: 1.7; color: var(--slate-700);">
              <div style="margin-bottom: 1rem;"><span class="badge badge-brand">${esc(r.category)}</span>
                <span style="font-size: var(--text-xs); color: var(--slate-400); margin-left: 0.5rem;">For: ${esc(r.target_program || 'All Students')}</span></div>
              <p style="margin-bottom: 1.25rem; color: var(--slate-600); font-size: var(--text-sm);">${esc(r.description)}</p>
              <div style="background: var(--bg-subtle); padding: 1.25rem; border-radius: var(--r-md); border-left: 4px solid var(--bcc-brand); font-size: 0.95rem; white-space: pre-line;">${body}</div>
            </div>`,
          footer: '<button type="button" class="btn btn-primary" data-modal-close>Close</button>'
        });
      }));
    };

    document.querySelectorAll('.filter-tab-btn').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab-btn').forEach(b => { b.classList.remove('active', 'btn-primary'); b.classList.add('btn-secondary'); });
      btn.classList.add('active', 'btn-primary');
      btn.classList.remove('btn-secondary');
      category = btn.dataset.cat;
      render();
    }));
    const search = document.getElementById('resource-search-input');
    if (search) search.addEventListener('input', () => { query = search.value.toLowerCase().trim(); render(); });

    try {
      resources = await ApiClient.getGuidanceResources();
      render();
    } catch (err) {
      container.innerHTML = `<p style="color: #b91c1c;">${esc(err.message)}</p>`;
    }
  },

  /* ── Profile ── */
  async initProfile() {
    if (!await this.start()) return;
    const fill = () => {
      const u = this.user;
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || '—'; };
      set('prof-name', u.name);
      set('prof-id', u.studentId);
      set('prof-course', [u.course, u.yearSection].filter(Boolean).join(' '));
      set('prof-email', u.email);
      set('prof-phone', u.phone);
      set('prof-emergency', u.emergencyContact);
    };
    fill();

    const editBtn = document.getElementById('btn-edit-contact');
    if (editBtn) editBtn.addEventListener('click', () => {
      const modal = Modal.open({
        title: 'Update contact information',
        size: 'modal-md',
        content: `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div class="form-group" style="margin: 0;">
              <label class="form-label required" for="edit-phone">Contact number</label>
              <input type="tel" id="edit-phone" class="form-input" maxlength="30" value="${esc(this.user.phone || '')}" placeholder="e.g. 0917-555-0192">
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label required" for="edit-emergency">Emergency contact (name, relationship & phone)</label>
              <input type="text" id="edit-emergency" class="form-input" maxlength="150" value="${esc(this.user.emergencyContact || '')}" placeholder="e.g. Maria Dela Cruz (Mother) - 0918-555-0199">
            </div>
            <p class="text-xs text-muted" style="margin: 0;">To change your name, student ID or program, please visit the Guidance Office.</p>
          </div>`,
        footer: `
          <button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
          <button type="button" class="btn btn-primary" id="btn-save-contact">Save changes</button>`
      });
      const save = modal.querySelector('#btn-save-contact');
      save.addEventListener('click', async () => {
        const phone = modal.querySelector('#edit-phone').value.trim();
        const emergency = modal.querySelector('#edit-emergency').value.trim();
        if (!phone || !emergency) return Toast.warning('Missing information', 'Please fill in both fields.');
        try {
          this.user = await Utils.withBusy(save, 'Saving…', () => ApiClient.updateProfile({ phone, emergency_contact: emergency }));
          Modal.close();
          fill();
          Toast.success('Profile updated', 'Your contact information was saved.');
        } catch (err) {
          Toast.error('Could not save', err.message);
        }
      });
    });

    const pwBtn = document.getElementById('btn-change-password');
    if (pwBtn) pwBtn.addEventListener('click', () => PasswordDialog.open());
  }
};
