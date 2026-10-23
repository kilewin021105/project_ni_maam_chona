/**
 * Buenavista Community College — Counselor Module Controller
 */

const CASE_CATEGORIES = ['Academic Support', 'Career Advisory', 'Personal / Mental Health', 'Crisis Intervention', 'Peer Mediation', 'Psychological Assessment'];
const WEEKDAYS = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday' };

const CounselorController = {
  user: null,

  async start() {
    this.user = await Portal.init('counselor');
    return this.user;
  },

  /** Unique students who have booked with this counselor, for pickers. */
  studentsFrom(appointments) {
    const map = new Map();
    appointments.forEach(a => {
      if (!map.has(a.studentId)) map.set(a.studentId, { id: a.studentId, name: a.studentName, number: a.studentNumber, courseYear: a.courseYear });
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  },

  /* ── Appointment actions (shared by queue, dashboard and calendar) ── */
  actionsFor(apt, onDone) {
    const actions = [];
    const today = Utils.todayISO();
    if (apt.status === 'Pending') {
      actions.push({ label: 'Approve', className: 'btn-primary', onClick: () => this.approve(apt, onDone) });
      actions.push({ label: 'Reject', className: 'btn-danger', onClick: () => this.cancel(apt, onDone, true) });
    }
    if (apt.status === 'Approved' && apt.date <= today) {
      actions.push({ label: 'Mark completed', className: 'btn-primary', onClick: () => this.complete(apt, onDone) });
    }
    if (apt.status === 'Pending' || apt.status === 'Approved') {
      actions.push({ label: 'Reschedule', className: 'btn-secondary', onClick: () => this.reschedule(apt, onDone) });
    }
    if (apt.status === 'Approved') {
      actions.push({ label: 'Cancel', className: 'btn-outline', onClick: () => this.cancel(apt, onDone, false) });
    }
    if (apt.status === 'Completed' || apt.status === 'Approved') {
      actions.push({ label: 'Write SOAP note', className: 'btn-secondary', onClick: () => { window.location.href = `notes.html?appointment=${encodeURIComponent(apt.id)}`; } });
    }
    return actions;
  },

  showDetails(apt, onDone) {
    Modal.showAppointmentDetails(apt, { actions: this.actionsFor(apt, onDone) });
  },

  async approve(apt, onDone) {
    try {
      await ApiClient.updateAppointmentStatus(apt.id, 'Approved');
      Modal.close();
      Toast.success('Appointment approved', `${apt.studentName} has been notified.`);
      onDone();
    } catch (err) {
      Toast.error('Could not approve', err.message);
    }
  },

  complete(apt, onDone) {
    Modal.confirm({
      title: 'Mark session completed',
      message: `Mark ${apt.referenceCode} with ${apt.studentName} as completed? The student will be asked to rate the session.`,
      confirmText: 'Mark completed',
      onConfirm: async () => {
        await ApiClient.updateAppointmentStatus(apt.id, 'Completed');
        Toast.success('Session completed', 'You can now write the SOAP note for this session.');
        onDone();
      }
    });
  },

  cancel(apt, onDone, isReject) {
    Modal.confirm({
      title: isReject ? 'Reject appointment request' : 'Cancel appointment',
      message: `${isReject ? 'Reject' : 'Cancel'} ${apt.referenceCode} with ${apt.studentName}? The student will see your reason.`,
      confirmText: isReject ? 'Reject request' : 'Cancel appointment',
      cancelText: 'Go back',
      danger: true,
      input: { label: 'Reason for the student', placeholder: 'e.g. I am attending a seminar that day. Please book another date.', minLength: 5 },
      onConfirm: async (reason) => {
        await ApiClient.updateAppointmentStatus(apt.id, 'Cancelled', reason);
        Toast.info(isReject ? 'Request rejected' : 'Appointment cancelled', 'The student has been notified.');
        onDone();
      }
    });
  },

  reschedule(apt, onDone) {
    const modal = Modal.open({
      title: 'Reschedule appointment',
      size: 'modal-md',
      content: `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <p class="text-sm text-muted" style="margin: 0;">${esc(apt.studentName)} • currently ${esc(Utils.formatDate(apt.date))} at ${esc(apt.timeSlot)}</p>
          <div class="form-group" style="margin: 0;">
            <label class="form-label required" for="rs-date">New date</label>
            <input type="date" id="rs-date" class="form-input" min="${Utils.todayISO()}">
          </div>
          <div>
            <div class="form-label required">New time</div>
            <div class="time-slots-grid" id="rs-slots"><p class="text-xs text-muted">Choose a date first.</p></div>
            <p class="text-xs" id="rs-slots-msg" style="color: #b45309; margin-top: 0.35rem;"></p>
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label required" for="rs-reason">Reason for the student</label>
            <textarea id="rs-reason" class="form-textarea" maxlength="300" placeholder="e.g. Conflict with a faculty meeting"></textarea>
          </div>
        </div>`,
      footer: `
        <button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
        <button type="button" class="btn btn-primary" id="rs-save">Save new time</button>`
    });

    let slot = null;
    const dateInput = modal.querySelector('#rs-date');
    const slotsEl = modal.querySelector('#rs-slots');
    const msg = modal.querySelector('#rs-slots-msg');
    dateInput.addEventListener('change', async () => {
      slot = null;
      msg.textContent = '';
      if (!dateInput.value) return;
      slotsEl.innerHTML = '<p class="text-xs text-muted">Checking…</p>';
      try {
        const res = await ApiClient.getAvailableSlots(apt.counselorId, dateInput.value, { excludeId: apt.id, reschedule: true });
        slotsEl.innerHTML = res.slots.map(s => `<button type="button" class="slot-btn" data-slot="${esc(s.time)}" ${s.available ? '' : 'disabled'} title="${esc(s.reason || 'Available')}">${esc(s.time)}</button>`).join('');
        msg.textContent = res.message || '';
        slotsEl.querySelectorAll('.slot-btn:not([disabled])').forEach(b => b.addEventListener('click', () => {
          slotsEl.querySelectorAll('.slot-btn').forEach(x => x.classList.remove('selected'));
          b.classList.add('selected');
          slot = b.dataset.slot;
        }));
      } catch (err) {
        slotsEl.innerHTML = '';
        msg.textContent = err.message;
      }
    });

    const save = modal.querySelector('#rs-save');
    save.addEventListener('click', async () => {
      const reason = modal.querySelector('#rs-reason').value.trim();
      if (!dateInput.value || !slot) return Toast.warning('Choose a new time', 'Pick a date and an open time slot.');
      if (reason.length < 5) return Toast.warning('Add a reason', 'Tell the student why the time is changing.');
      try {
        await Utils.withBusy(save, 'Saving…', () => ApiClient.rescheduleAppointment(apt.id, dateInput.value, slot, reason));
        Modal.close();
        Toast.success('Appointment rescheduled', `${apt.studentName} has been notified of the new time.`);
        onDone();
      } catch (err) {
        Toast.error('Could not reschedule', err.message);
      }
    });
  },

  /* ── Dashboard ── */
  async initDashboard() {
    if (!await this.start()) return;
    const greet = document.getElementById('cns-greeting');
    if (greet) greet.textContent = `${Utils.greeting()}, ${this.user.name.split(',')[0]}`;

    const load = async () => {
      Modal.close();
      let apts;
      try {
        apts = await ApiClient.getAppointments();
      } catch (err) {
        Toast.error('Could not load appointments', err.message);
        return;
      }
      const today = Utils.todayISO();
      const now = new Date();
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
      const weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
      const weekEnd = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

      const todayList = apts.filter(a => a.date === today && a.status !== 'Cancelled').sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set('cns-metric-today', todayList.length);
      set('cns-metric-week', apts.filter(a => a.date >= weekStart && a.date <= weekEnd && a.status !== 'Cancelled').length);
      set('cns-metric-completed', apts.filter(a => a.status === 'Completed').length);
      set('cns-metric-pending', apts.filter(a => a.status === 'Pending').length);

      const tbody = document.getElementById('cns-today-tbody');
      if (tbody) {
        tbody.innerHTML = todayList.length ? todayList.map(a => `
          <tr data-id="${esc(a.id)}" class="clickable-row" tabindex="0">
            <td style="font-family: var(--font-mono); font-weight: 600;">${esc(a.timeSlot)}</td>
            <td class="font-bold">${esc(a.studentName)}</td>
            <td>${esc(a.serviceTitle)}</td>
            <td>${Utils.statusBadge(a.status)}</td>
          </tr>`).join('') : Utils.emptyRow(4, 'No appointments scheduled for today.');
        tbody.querySelectorAll('tr[data-id]').forEach(tr => {
          const open = () => this.showDetails(apts.find(a => a.id === tr.dataset.id), load);
          tr.addEventListener('click', open);
          tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
        });
      }
      Calendar.render('cns-calendar-widget', apts, null, { compact: true });
    };
    load();
  },

  /* ── Appointment queue ── */
  async initAppointments() {
    if (!await this.start()) return;
    const tbody = document.getElementById('counselor-queue-tbody');
    if (!tbody) return;
    let apts = [];
    let filter = 'active';

    const order = { Pending: 0, Approved: 1, Completed: 2, Cancelled: 3 };
    const render = () => {
      const today = Utils.todayISO();
      let list = apts;
      if (filter === 'active') list = apts.filter(a => a.status === 'Pending' || a.status === 'Approved');
      else if (filter !== 'all') list = apts.filter(a => a.status.toLowerCase() === filter);
      list = [...list].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || (a.status === 'Completed' || a.status === 'Cancelled'
        ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));

      if (!list.length) {
        tbody.innerHTML = Utils.emptyRow(6, filter === 'active' ? 'No pending or upcoming appointments.' : 'No appointments with this status.');
        return;
      }
      tbody.innerHTML = list.map(a => {
        const overdue = a.status === 'Approved' && a.date < today;
        return `
          <tr>
            <td class="font-bold" style="font-family: var(--font-mono); color: var(--bcc-brand);">${esc(a.referenceCode)}</td>
            <td><strong>${esc(a.studentName)}</strong>
              <div style="font-size: 11px; color: var(--slate-400);">${esc(a.modality)} • <span style="${a.urgency !== 'Routine' ? 'color: #b91c1c; font-weight: 700;' : ''}">${esc(a.urgency)}</span></div></td>
            <td>${esc(a.serviceTitle)}</td>
            <td><div>${esc(Utils.formatDate(a.date))}</div><div style="font-size: 11px; color: var(--slate-400);">${esc(a.timeSlot)}</div>
              ${overdue ? '<div style="font-size: 11px; color: #b45309; font-weight: 700;">Needs completing</div>' : ''}</td>
            <td>${Utils.statusBadge(a.status)}</td>
            <td><div class="flex gap-2" style="flex-wrap: wrap;">
              <button type="button" class="btn btn-sm btn-secondary" data-act="view" data-id="${esc(a.id)}">View</button>
              ${a.status === 'Pending' ? `
                <button type="button" class="btn btn-sm btn-primary" data-act="approve" data-id="${esc(a.id)}">Approve</button>
                <button type="button" class="btn btn-sm btn-outline" data-act="reject" data-id="${esc(a.id)}" style="color: #dc2626; border-color: #fca5a5;">Reject</button>` : ''}
              ${a.status === 'Approved' && a.date <= today ? `<button type="button" class="btn btn-sm btn-primary" data-act="complete" data-id="${esc(a.id)}">Mark completed</button>` : ''}
              ${a.status === 'Approved' ? `<button type="button" class="btn btn-sm btn-outline" data-act="pass" data-id="${esc(a.id)}">Pass Slip</button>` : ''}
            </div></td>
          </tr>`;
      }).join('');

      tbody.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', () => {
        const apt = apts.find(a => a.id === btn.dataset.id);
        ({
          view: () => this.showDetails(apt, load),
          approve: () => this.approve(apt, load),
          reject: () => this.cancel(apt, load, true),
          complete: () => this.complete(apt, load),
          pass: () => Modal.showAppointmentPass(apt)
        })[btn.dataset.act]();
      }));
    };

    const load = async () => {
      Modal.close();
      tbody.innerHTML = Utils.loadingRow(6);
      try {
        apts = await ApiClient.getAppointments();
        render();
      } catch (err) {
        tbody.innerHTML = Utils.errorRow(6, err.message);
      }
    };

    document.querySelectorAll('.filter-tab-btn').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab-btn').forEach(b => { b.classList.remove('active', 'btn-primary'); b.classList.add('btn-secondary'); });
      btn.classList.add('active', 'btn-primary');
      btn.classList.remove('btn-secondary');
      filter = btn.dataset.filter;
      render();
    }));
    load();
  },

  /* ── Schedule: calendar + availability ── */
  async initSchedule() {
    if (!await this.start()) return;
    const load = async () => {
      Modal.close();
      try {
        const apts = await ApiClient.getAppointments();
        Calendar.render('cns-full-calendar-widget', apts, (apt) => this.showDetails(apt, load));
      } catch (err) {
        Toast.error('Could not load your schedule', err.message);
      }
    };
    load();

    const card = document.getElementById('cns-availability-card');
    if (!card) return;
    try {
      const av = await ApiClient.getAvailability();
      card.innerHTML = `
        <div class="card-header"><div class="card-title">${Icons.get('settings')} My availability</div></div>
        <p class="text-xs text-muted" style="margin-bottom: 1rem;">Students can only book you on the days you mark as available. Existing appointments are not affected.</p>
        <div class="weekday-toggles">
          ${Object.entries(WEEKDAYS).map(([d, name]) => `
            <label class="weekday-toggle"><input type="checkbox" id="avail-day-${d}" data-day="${d}" ${av.days[d] ? 'checked' : ''}> ${name}</label>`).join('')}
        </div>
        <div class="form-group" style="margin-top: 1rem; max-width: 260px;">
          <label class="form-label" for="avail-max">Maximum appointments per day</label>
          <select id="avail-max" class="form-select">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<option value="${n}" ${n === Number(av.max_daily_appointments) ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
        <div class="flex justify-end"><button type="button" class="btn btn-primary btn-sm" id="avail-save">Save availability</button></div>`;
      const save = card.querySelector('#avail-save');
      save.addEventListener('click', async () => {
        const days = {};
        card.querySelectorAll('[data-day]').forEach(cb => { days[cb.dataset.day] = cb.checked; });
        if (!Object.values(days).some(Boolean)) {
          return Toast.warning('No days selected', 'Mark at least one day, or ask the administrator to deactivate your account while you are away.');
        }
        try {
          await Utils.withBusy(save, 'Saving…', () => ApiClient.saveAvailability(days, Number(card.querySelector('#avail-max').value)));
          Toast.success('Availability saved', 'Students will only see the days you are available.');
        } catch (err) {
          Toast.error('Could not save availability', err.message);
        }
      });
    } catch (err) {
      card.innerHTML = `<p style="color: #b91c1c;">${esc(err.message)}</p>`;
    }
  },

  /* ── SOAP notes ── */
  async initNotes() {
    if (!await this.start()) return;
    const tbody = document.getElementById('counselor-notes-tbody');
    if (!tbody) return;
    let notes = [];
    let apts = [];

    const viewNote = (n) => {
      const section = (title, body) => `
        <div>
          <h5 style="font-weight: 800; color: #064e3b; margin-bottom: 0.35rem;">${title}</h5>
          <div style="background: var(--bg-muted); padding: 0.85rem; border-radius: var(--r-md); border: 1px solid var(--border); font-size: var(--text-sm); white-space: pre-wrap; overflow-wrap: anywhere;">${esc(body)}</div>
        </div>`;
      Modal.open({
        title: `🔒 SOAP Note — ${esc(n.studentName)}`,
        size: 'modal-lg',
        content: `
          <div style="display: flex; flex-direction: column; gap: 1rem; line-height: 1.6;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap; background: var(--bg-subtle); padding: 0.75rem 1rem; border-radius: var(--r-md); border: 1px solid var(--border-light);">
              <div><strong>Category:</strong> ${esc(n.caseCategory)} &nbsp;•&nbsp; <strong>Session:</strong> ${esc(Utils.formatDate(n.sessionDate))}</div>
              <span class="badge badge-confirmed">Strictly Confidential</span>
            </div>
            ${section('S — Subjective (student’s statements)', n.subjective)}
            ${section('O — Objective (observations)', n.objective)}
            ${section('A — Assessment', n.assessment)}
            ${section('P — Plan', n.plan)}
          </div>`,
        footer: '<button type="button" class="btn btn-primary" data-modal-close>Close</button>'
      });
    };

    const render = () => {
      tbody.innerHTML = notes.length ? notes.map(n => `
        <tr>
          <td>${esc(Utils.formatDate(n.sessionDate))}</td>
          <td class="font-bold">${esc(n.studentName)}</td>
          <td><span class="badge badge-brand">${esc(n.caseCategory)}</span></td>
          <td>${esc((n.assessment || '').slice(0, 60))}${(n.assessment || '').length > 60 ? '…' : ''}</td>
          <td><span class="badge badge-confirmed">Confidential</span></td>
          <td><button type="button" class="btn btn-sm btn-secondary" data-id="${esc(n.id)}">View note</button></td>
        </tr>`).join('') : Utils.emptyRow(6, 'No SOAP notes yet. Notes you write after sessions appear here.');
      tbody.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => viewNote(notes.find(n => n.id === b.dataset.id))));
    };

    const openCreate = (presetAptId = null) => {
      const students = this.studentsFrom(apts);
      if (!students.length) return Toast.info('No students yet', 'You can write notes once students have booked appointments with you.');
      const preset = presetAptId ? apts.find(a => a.id === presetAptId) : null;
      const modal = Modal.open({
        title: `${Icons.get('file-text')} New SOAP note`,
        size: 'modal-lg',
        content: `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div class="form-row-2">
              <div class="form-group" style="margin: 0;">
                <label class="form-label required" for="soap-student">Student</label>
                <select id="soap-student" class="form-select">
                  <option value="">Choose a student…</option>
                  ${students.map(s => `<option value="${esc(s.id)}" ${preset && preset.studentId === s.id ? 'selected' : ''}>${esc(s.name)}${s.number ? ` (${esc(s.number)})` : ''}</option>`).join('')}
                </select>
              </div>
              <div class="form-group" style="margin: 0;">
                <label class="form-label" for="soap-apt">Session (optional)</label>
                <select id="soap-apt" class="form-select"></select>
              </div>
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label required" for="soap-category">Case category</label>
              <select id="soap-category" class="form-select">${CASE_CATEGORIES.map(c => `<option>${esc(c)}</option>`).join('')}</select>
            </div>
            ${[['soap-s', 'S — Subjective (student’s statements)', 'What the student shared…'],
               ['soap-o', 'O — Objective (your observations)', 'Behaviour, mood, attention…'],
               ['soap-a', 'A — Assessment', 'Your professional appraisal…'],
               ['soap-p', 'P — Plan', 'Agreed actions, homework, follow-up date…']].map(([id, label, ph]) => `
              <div class="form-group" style="margin: 0;">
                <label class="form-label required" for="${id}">${label}</label>
                <textarea id="${id}" class="form-textarea" maxlength="5000" placeholder="${ph}"></textarea>
              </div>`).join('')}
          </div>`,
        footer: `
          <button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
          <button type="button" class="btn btn-primary" id="soap-save">Save note (confidential)</button>`
      });

      const studentSel = modal.querySelector('#soap-student');
      const aptSel = modal.querySelector('#soap-apt');
      const fillApts = () => {
        const options = apts.filter(a => a.studentId === studentSel.value && (a.status === 'Completed' || a.status === 'Approved'));
        aptSel.innerHTML = '<option value="">Not linked to a session</option>' + options.map(a =>
          `<option value="${esc(a.id)}" ${preset && preset.id === a.id ? 'selected' : ''}>${esc(Utils.formatDate(a.date))} ${esc(a.timeSlot)} — ${esc(a.serviceTitle)}</option>`).join('');
      };
      studentSel.addEventListener('change', fillApts);
      fillApts();

      const save = modal.querySelector('#soap-save');
      save.addEventListener('click', async () => {
        const note = {
          student_id: studentSel.value,
          appointment_id: aptSel.value || null,
          case_category: modal.querySelector('#soap-category').value,
          subjective: modal.querySelector('#soap-s').value.trim(),
          objective: modal.querySelector('#soap-o').value.trim(),
          assessment: modal.querySelector('#soap-a').value.trim(),
          plan: modal.querySelector('#soap-p').value.trim()
        };
        if (!note.student_id) return Toast.warning('Choose a student', 'Select who this note is for.');
        if (!note.subjective || !note.objective || !note.assessment || !note.plan) return Toast.warning('Incomplete note', 'Please fill in all four SOAP sections.');
        try {
          await Utils.withBusy(save, 'Saving…', () => ApiClient.createSessionNote(note));
          Modal.close();
          Toast.success('Note saved', 'The SOAP note was saved to the confidential record.');
          load();
        } catch (err) {
          Toast.error('Could not save note', err.message);
        }
      });
    };

    const load = async () => {
      tbody.innerHTML = Utils.loadingRow(6);
      try {
        [notes, apts] = await Promise.all([ApiClient.getSessionNotes(), ApiClient.getAppointments()]);
        render();
      } catch (err) {
        tbody.innerHTML = Utils.errorRow(6, err.message);
      }
    };

    const createBtn = document.getElementById('btn-create-soap-note');
    if (createBtn) createBtn.addEventListener('click', () => openCreate());
    await load();
    const presetApt = new URLSearchParams(window.location.search).get('appointment');
    if (presetApt) openCreate(presetApt);
  },

  /* ── Follow-ups ── */
  async initFollowUps() {
    if (!await this.start()) return;
    const tbody = document.getElementById('counselor-followups-tbody');
    if (!tbody) return;
    let tasks = [];
    let apts = [];

    const render = () => {
      const today = Utils.todayISO();
      tbody.innerHTML = tasks.length ? tasks.map(t => {
        const open = t.status === 'Pending' || t.status === 'In Progress';
        const overdue = open && t.due_date < today;
        return `
          <tr style="${open ? '' : 'opacity: 0.6;'}">
            <td><strong>${esc(t.studentName)}</strong></td>
            <td>${esc(t.title)}${t.description ? `<div style="font-size: 11px; color: var(--slate-500);">${esc(t.description)}</div>` : ''}</td>
            <td>${esc(Utils.formatDate(t.due_date))}${overdue ? '<div style="font-size: 11px; color: #b91c1c; font-weight: 700;">Overdue</div>' : ''}</td>
            <td><span class="badge ${t.status === 'Completed' ? 'badge-completed' : t.status === 'Cancelled' ? 'badge-cancelled' : 'badge-pending'}">${esc(t.status)}</span></td>
            <td><div class="flex gap-2" style="flex-wrap: wrap;">
              ${open ? `
                <button type="button" class="btn btn-sm btn-secondary" data-act="remind" data-id="${esc(t.id)}">Send reminder</button>
                <button type="button" class="btn btn-sm btn-primary" data-act="Completed" data-id="${esc(t.id)}">Mark done</button>
                <button type="button" class="btn btn-sm btn-outline" data-act="Cancelled" data-id="${esc(t.id)}">Cancel</button>`
                : `<button type="button" class="btn btn-sm btn-outline" data-act="Pending" data-id="${esc(t.id)}">Reopen</button>`}
            </div></td>
          </tr>`;
      }).join('') : Utils.emptyRow(5, 'No follow-ups yet. Add one to remind yourself to check in with a student.');

      tbody.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        try {
          if (btn.dataset.act === 'remind') {
            const res = await Utils.withBusy(btn, 'Sending…', () => ApiClient.remindFollowUp(id));
            Toast.success('Reminder sent', res.message);
          } else {
            await ApiClient.updateFollowUp(id, btn.dataset.act);
            load();
          }
        } catch (err) {
          Toast.error('Could not update follow-up', err.message);
        }
      }));
    };

    const load = async () => {
      try {
        [tasks, apts] = await Promise.all([ApiClient.getFollowUps(), ApiClient.getAppointments()]);
        render();
      } catch (err) {
        tbody.innerHTML = Utils.errorRow(5, err.message);
      }
    };

    const addBtn = document.getElementById('btn-add-followup');
    if (addBtn) addBtn.addEventListener('click', () => {
      const students = this.studentsFrom(apts);
      if (!students.length) return Toast.info('No students yet', 'Follow-ups can be added for students who have booked with you.');
      const modal = Modal.open({
        title: '📅 Add follow-up',
        size: 'modal-md',
        content: `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div class="form-group" style="margin: 0;">
              <label class="form-label required" for="fu-student">Student</label>
              <select id="fu-student" class="form-select"><option value="">Choose a student…</option>
                ${students.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select>
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label required" for="fu-title">What to follow up on</label>
              <input type="text" id="fu-title" class="form-input" maxlength="200" placeholder="e.g. Midterm progress check-in">
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label" for="fu-desc">Notes (optional)</label>
              <textarea id="fu-desc" class="form-textarea" maxlength="1000"></textarea>
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label required" for="fu-date">Due date</label>
              <input type="date" id="fu-date" class="form-input" min="${Utils.todayISO()}" value="${Utils.todayISO(7)}">
            </div>
          </div>`,
        footer: `
          <button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
          <button type="button" class="btn btn-primary" id="fu-save">Save follow-up</button>`
      });
      const save = modal.querySelector('#fu-save');
      save.addEventListener('click', async () => {
        const task = {
          student_id: modal.querySelector('#fu-student').value,
          title: modal.querySelector('#fu-title').value.trim(),
          description: modal.querySelector('#fu-desc').value.trim(),
          due_date: modal.querySelector('#fu-date').value
        };
        if (!task.student_id || task.title.length < 3 || !task.due_date) return Toast.warning('Missing information', 'Choose a student, describe the follow-up and set a due date.');
        try {
          await Utils.withBusy(save, 'Saving…', () => ApiClient.createFollowUp(task));
          Modal.close();
          Toast.success('Follow-up saved', '');
          load();
        } catch (err) {
          Toast.error('Could not save follow-up', err.message);
        }
      });
    });
    load();
  },

  /* ── Reports ── */
  async initReports() {
    if (!await this.start()) return;
    try {
      const r = await ApiClient.getReportsSummary();
      Reports.renderCards('rep-cards', [
        ['Sessions completed', r.completed],
        ['Students helped', r.students_served],
        ['Completion rate', r.completion_rate === null ? '—' : `${r.completion_rate}%`],
        ['Average rating', r.avg_rating === null ? '—' : `${r.avg_rating} ★`, `${r.feedback_count} rating${r.feedback_count === 1 ? '' : 's'}`]
      ]);
      Reports.renderTable('rep-service-tbody', r.by_service, row => `
        <td class="font-bold">${esc(row.name)}</td>
        <td>${row.completed} of ${row.appointments}</td>
        <td>${row.avg_duration} mins</td>
        <td>${row.avg_rating === null ? '<span class="text-muted">No ratings</span>' : `${row.avg_rating} ★`}</td>`, 4, 'No appointments yet.');
      Reports.renderMonthly('rep-monthly', r.monthly);
    } catch (err) {
      Toast.error('Could not load reports', err.message);
    }
  }
};
