/**
 * Buenavista Community College — Administrator Module Controller
 */

const PROGRAMS = [
  ['BSIT', 'Bachelor of Science in Information Technology'],
  ['BSHM', 'Bachelor of Science in Hospitality Management'],
  ['BSTM', 'Bachelor of Science in Tourism Management'],
  ['BSCRIM', 'Bachelor of Science in Criminal Justice'],
  ['BSED', 'Bachelor of Secondary Education'],
  ['BEED', 'Bachelor of Elementary Education']
];
const SERVICE_CATEGORIES = ['Counseling', 'Academic', 'Career', 'Emergency', 'Mediation', 'Assessment', 'General'];

const AdminController = {
  user: null,

  async start() {
    this.user = await Portal.init('admin');
    return this.user;
  },

  /* ── Executive dashboard ── */
  async initDashboard() {
    if (!await this.start()) return;
    try {
      const [summary, apts] = await Promise.all([ApiClient.getReportsSummary(), ApiClient.getAppointments()]);
      const b = summary.status_breakdown || {};
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set('adm-metric-students', summary.total_students ?? 0);
      set('adm-metric-appointments', summary.total_appointments);
      set('adm-metric-completed', b.Completed || 0);
      set('adm-metric-pending', b.Pending || 0);
      set('adm-completion-pct', summary.completion_rate === null ? '—' : `${summary.completion_rate}%`);
      const total = summary.total_appointments || 0;
      const pct = (n) => total ? `${Math.round(((n || 0) / total) * 100)}%` : '—';
      set('adm-pct-completed', pct(b.Completed));
      set('adm-pct-approved', pct(b.Approved));
      set('adm-pct-pending', pct(b.Pending));
      set('adm-pct-cancelled', pct(b.Cancelled));
      Reports.renderMonthly('adm-monthly', summary.monthly);

      const tbody = document.getElementById('adm-recent-apts-tbody');
      if (tbody) {
        const recent = [...apts].sort((x, y) => String(y.created_at).localeCompare(String(x.created_at))).slice(0, 7);
        tbody.innerHTML = recent.length ? recent.map(a => `
          <tr>
            <td class="font-bold">${esc(a.studentName)}</td>
            <td>${esc(a.serviceTitle)}</td>
            <td>${esc(a.counselorName)}</td>
            <td>${esc(Utils.formatDate(a.date))} at ${esc(a.timeSlot)}</td>
            <td>${Utils.statusBadge(a.status)}</td>
          </tr>`).join('') : Utils.emptyRow(5, 'No appointments yet.');
      }
    } catch (err) {
      Toast.error('Could not load dashboard', err.message);
    }
  },

  /* ── Users ── */
  async initUsers() {
    if (!await this.start()) return;
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;
    let users = [];
    let roleFilter = '';
    let query = '';

    const render = () => {
      const list = users.filter(u => (!roleFilter || u.role === roleFilter)
        && (!query || `${u.name} ${u.email} ${u.studentId || ''}`.toLowerCase().includes(query)));
      tbody.innerHTML = list.length ? list.map(u => {
        const active = u.status !== 'inactive';
        const isMe = u.id === this.user.id;
        const info = u.role === 'student' ? [u.course, u.yearSection, u.studentId].filter(Boolean).join(' • ')
          : u.role === 'counselor' ? (u.specialization || 'Counselor') : 'Administrator';
        return `
          <tr>
            <td class="font-bold">${esc(u.name)}${isMe ? ' <span class="text-xs text-muted">(you)</span>' : ''}</td>
            <td style="overflow-wrap: anywhere;">${esc(u.email)}</td>
            <td><span class="badge badge-brand">${esc(u.role.toUpperCase())}</span></td>
            <td>${esc(info)}</td>
            <td><span class="badge badge-${active ? 'confirmed' : 'cancelled'}">${active ? 'Active' : 'Inactive'}</span></td>
            <td><div class="flex gap-2" style="flex-wrap: wrap;">
              <button type="button" class="btn btn-sm btn-secondary" data-act="edit" data-id="${esc(u.id)}">Edit</button>
              <button type="button" class="btn btn-sm btn-outline" data-act="reset" data-id="${esc(u.id)}">Reset password</button>
              ${isMe ? '' : `
                <button type="button" class="btn btn-sm ${active ? 'btn-outline' : 'btn-primary'}" data-act="status" data-id="${esc(u.id)}">${active ? 'Deactivate' : 'Activate'}</button>
                <button type="button" class="btn btn-sm btn-outline" data-act="delete" data-id="${esc(u.id)}" style="color: #dc2626; border-color: #fca5a5;">Delete</button>`}
            </div></td>
          </tr>`;
      }).join('') : Utils.emptyRow(6, 'No accounts match your search.');

      tbody.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', () => {
        const u = users.find(x => x.id === btn.dataset.id);
        ({ edit: () => this.openUserForm(u, load), reset: () => this.resetPassword(u), status: () => this.toggleStatus(u, load), delete: () => this.deleteUser(u, load) })[btn.dataset.act]();
      }));
    };

    const load = async () => {
      tbody.innerHTML = Utils.loadingRow(6);
      try {
        users = await ApiClient.getUsers();
        render();
      } catch (err) {
        tbody.innerHTML = Utils.errorRow(6, err.message);
      }
    };

    const search = document.getElementById('user-search');
    if (search) search.addEventListener('input', () => { query = search.value.toLowerCase().trim(); render(); });
    const roleSel = document.getElementById('user-role-filter');
    if (roleSel) roleSel.addEventListener('change', () => { roleFilter = roleSel.value; render(); });
    const addBtn = document.getElementById('btn-add-user');
    if (addBtn) addBtn.addEventListener('click', () => this.openUserForm(null, load));
    load();
  },

  openUserForm(existing, onDone) {
    const isEdit = Boolean(existing);
    const role = existing ? existing.role : 'student';
    const v = (key) => esc(existing ? (existing[key] ?? '') : '');
    const modal = Modal.open({
      title: isEdit ? `Edit account — ${esc(existing.name)}` : 'Add user account',
      size: 'modal-md',
      content: `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <div class="form-group" style="margin: 0;">
            <label class="form-label required" for="nu-name">Full name</label>
            <input type="text" id="nu-name" class="form-input" maxlength="100" value="${v('name')}">
          </div>
          <div class="form-row-2">
            <div class="form-group" style="margin: 0;">
              <label class="form-label required" for="nu-email">Email</label>
              <input type="email" id="nu-email" class="form-input" maxlength="255" value="${v('email')}" placeholder="name@buenavista.edu.ph">
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label" for="nu-phone">Phone</label>
              <input type="tel" id="nu-phone" class="form-input" maxlength="30" value="${v('phone')}">
            </div>
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label required" for="nu-role">Role</label>
            <select id="nu-role" class="form-select" ${isEdit ? 'disabled' : ''}>
              ${[['student', 'Student'], ['counselor', 'Guidance Counselor'], ['admin', 'Administrator']].map(([val, label]) =>
                `<option value="${val}" ${role === val ? 'selected' : ''}>${label}</option>`).join('')}
            </select>
            ${isEdit ? '<p class="text-xs text-muted" style="margin-top: 0.25rem;">A role can’t be changed. Create a new account for a different role.</p>' : ''}
          </div>

          <div id="nu-student-fields" style="display: flex; flex-direction: column; gap: 1rem;">
            <div class="form-row-2">
              <div class="form-group" style="margin: 0;">
                <label class="form-label required" for="nu-course">Degree program</label>
                <select id="nu-course" class="form-select">${PROGRAMS.map(([code, name]) => `<option value="${code}" ${existing && existing.course === code ? 'selected' : ''}>${code} — ${name}</option>`).join('')}</select>
              </div>
              <div class="form-group" style="margin: 0;">
                <label class="form-label required" for="nu-yearsec">Year & section</label>
                <input type="text" id="nu-yearsec" class="form-input" maxlength="10" value="${v('year_section') || (isEdit ? '' : '1A')}" placeholder="e.g. 2B">
              </div>
            </div>
            <div class="form-row-2">
              <div class="form-group" style="margin: 0;">
                <label class="form-label" for="nu-studentno">Student ID number</label>
                <input type="text" id="nu-studentno" class="form-input" maxlength="30" value="${v('student_id_number')}" placeholder="Leave blank to auto-generate">
              </div>
              <div class="form-group" style="margin: 0;">
                <label class="form-label" for="nu-emergency">Emergency contact</label>
                <input type="text" id="nu-emergency" class="form-input" maxlength="150" value="${v('emergency_contact')}">
              </div>
            </div>
          </div>

          <div id="nu-counselor-fields" style="display: none; flex-direction: column; gap: 1rem;">
            <div class="form-group" style="margin: 0;">
              <label class="form-label" for="nu-cns-title">Professional title</label>
              <input type="text" id="nu-cns-title" class="form-input" maxlength="150" value="${v('title') || (isEdit ? '' : 'Registered Guidance Counselor')}">
            </div>
            <div class="form-row-2">
              <div class="form-group" style="margin: 0;">
                <label class="form-label" for="nu-cns-room">Office / room</label>
                <input type="text" id="nu-cns-room" class="form-input" maxlength="60" value="${v('room') || (isEdit ? '' : 'Guidance Office Rm 204')}">
              </div>
              <div class="form-group" style="margin: 0;">
                <label class="form-label" for="nu-cns-max">Daily appointment limit</label>
                <input type="number" id="nu-cns-max" class="form-input" min="1" max="9" value="${v('max_daily_appointments') || 5}">
              </div>
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label" for="nu-cns-spec">Specialization</label>
              <input type="text" id="nu-cns-spec" class="form-input" maxlength="200" value="${v('specialization')}" placeholder="e.g. Career guidance, stress management">
            </div>
          </div>

          ${isEdit ? '' : `
            <div class="form-group" style="margin: 0;">
              <label class="form-label required" for="nu-password">Temporary password</label>
              <input type="text" id="nu-password" class="form-input" maxlength="128" placeholder="At least 8 characters" autocomplete="off">
              <p class="text-xs text-muted" style="margin-top: 0.25rem;">Give this to the person privately and ask them to change it after signing in.</p>
            </div>`}
        </div>`,
      footer: `
        <button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
        <button type="button" class="btn btn-primary" id="btn-save-user">${isEdit ? 'Save changes' : 'Create account'}</button>`
    });

    const roleSel = modal.querySelector('#nu-role');
    const toggleFields = () => {
      modal.querySelector('#nu-student-fields').style.display = roleSel.value === 'student' ? 'flex' : 'none';
      modal.querySelector('#nu-counselor-fields').style.display = roleSel.value === 'counselor' ? 'flex' : 'none';
    };
    roleSel.addEventListener('change', toggleFields);
    toggleFields();

    const save = modal.querySelector('#btn-save-user');
    save.addEventListener('click', async () => {
      const val = (id) => (modal.querySelector(id) ? modal.querySelector(id).value.trim() : '');
      const data = { name: val('#nu-name'), email: val('#nu-email'), phone: val('#nu-phone') };
      const r = roleSel.value;
      if (r === 'student') Object.assign(data, { course: val('#nu-course'), year_section: val('#nu-yearsec'), student_id_number: val('#nu-studentno'), emergency_contact: val('#nu-emergency') });
      if (r === 'counselor') Object.assign(data, { title: val('#nu-cns-title'), room: val('#nu-cns-room'), specialization: val('#nu-cns-spec'), max_daily_appointments: Number(val('#nu-cns-max')) || 5 });
      if (!data.name || !data.email) return Toast.warning('Missing information', 'Name and email are required.');
      if (!isEdit) {
        data.role = r;
        data.password = val('#nu-password');
        if (data.password.length < 8) return Toast.warning('Password too short', 'The temporary password needs at least 8 characters.');
      }
      try {
        await Utils.withBusy(save, 'Saving…', () => isEdit ? ApiClient.updateUser(existing.id, data) : ApiClient.createUser(data));
        Modal.close();
        Toast.success(isEdit ? 'Account updated' : 'Account created', `${data.name} (${r})`);
        onDone();
      } catch (err) {
        Toast.error('Could not save account', err.message);
      }
    });
  },

  resetPassword(u) {
    Modal.confirm({
      title: 'Reset password',
      message: `Set a new temporary password for ${u.name}. Tell them privately and ask them to change it after signing in.`,
      confirmText: 'Reset password',
      input: { label: 'New temporary password (at least 8 characters)', minLength: 8, multiline: false },
      onConfirm: async (pw) => {
        const res = await ApiClient.resetUserPassword(u.id, pw);
        Toast.success('Password reset', res.message);
      }
    });
  },

  toggleStatus(u, onDone) {
    const deactivate = u.status !== 'inactive';
    Modal.confirm({
      title: deactivate ? 'Deactivate account' : 'Activate account',
      message: deactivate
        ? `${u.name} will be signed out and won't be able to sign in until the account is activated again.`
        : `${u.name} will be able to sign in again.`,
      confirmText: deactivate ? 'Deactivate' : 'Activate',
      danger: deactivate,
      onConfirm: async () => {
        await ApiClient.setUserStatus(u.id, deactivate ? 'inactive' : 'active');
        Toast.success('Account updated', `${u.name} is now ${deactivate ? 'inactive' : 'active'}.`);
        onDone();
      }
    });
  },

  deleteUser(u, onDone) {
    Modal.confirm({
      title: 'Delete account',
      message: `Permanently delete ${u.name}'s account? Accounts with appointments or case records can't be deleted; deactivate those instead.`,
      confirmText: 'Delete account',
      danger: true,
      onConfirm: async () => {
        await ApiClient.deleteUser(u.id);
        Toast.success('Account deleted', u.name);
        onDone();
      }
    });
  },

  /* ── Services ── */
  async initServices() {
    if (!await this.start()) return;
    const tbody = document.getElementById('admin-services-tbody');
    if (!tbody) return;
    let services = [];

    const render = () => {
      tbody.innerHTML = services.length ? services.map(s => `
        <tr>
          <td class="font-bold" style="font-family: var(--font-mono); color: var(--bcc-brand);">${esc(s.code)}</td>
          <td><strong>${esc(s.title)}</strong>
            <div style="font-size: 11px; color: var(--slate-500);">${esc((s.description || '').slice(0, 70))}${(s.description || '').length > 70 ? '…' : ''}</div></td>
          <td><span class="badge badge-brand">${esc(s.category)}</span></td>
          <td>${s.durationMinutes} mins</td>
          <td><span class="badge badge-${s.isActive ? 'confirmed' : 'cancelled'}">${s.isActive ? 'Active' : 'Inactive'}</span></td>
          <td><div class="flex gap-2">
            <button type="button" class="btn btn-sm btn-secondary" data-act="edit" data-id="${esc(s.id)}">Edit</button>
            <button type="button" class="btn btn-sm btn-outline" data-act="delete" data-id="${esc(s.id)}" style="color: #dc2626; border-color: #fca5a5;">Delete</button>
          </div></td>
        </tr>`).join('') : Utils.emptyRow(6, 'No guidance services yet.');
      tbody.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', () => {
        const s = services.find(x => x.id === btn.dataset.id);
        if (btn.dataset.act === 'edit') openForm(s);
        else Modal.confirm({
          title: 'Delete service',
          message: `Delete "${s.title}"? Services that already have appointments can't be deleted; set them to Inactive instead.`,
          confirmText: 'Delete service',
          danger: true,
          onConfirm: async () => {
            await ApiClient.deleteService(s.id);
            Toast.success('Service deleted', s.title);
            load();
          }
        });
      }));
    };

    const openForm = (s = null) => {
      const modal = Modal.open({
        title: s ? 'Edit guidance service' : 'Add guidance service',
        size: 'modal-lg',
        content: `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div class="form-row-2">
              <div class="form-group" style="margin: 0;">
                <label class="form-label required" for="srv-code">Service code</label>
                <input type="text" id="srv-code" class="form-input" maxlength="20" value="${esc(s ? s.code : '')}" placeholder="e.g. ACAD-ADV">
              </div>
              <div class="form-group" style="margin: 0;">
                <label class="form-label required" for="srv-category">Category</label>
                <select id="srv-category" class="form-select">
                  ${[...new Set([...(s ? [s.category] : []), ...SERVICE_CATEGORIES])].map(c => `<option ${s && s.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label required" for="srv-title">Title</label>
              <input type="text" id="srv-title" class="form-input" maxlength="150" value="${esc(s ? s.title : '')}">
            </div>
            <div class="form-row-2">
              <div class="form-group" style="margin: 0;">
                <label class="form-label required" for="srv-duration">Duration (minutes)</label>
                <input type="number" id="srv-duration" class="form-input" min="15" max="180" value="${s ? s.durationMinutes : 45}">
              </div>
              <div class="form-group" style="margin: 0;">
                <label class="form-label required" for="srv-status">Status</label>
                <select id="srv-status" class="form-select">
                  <option value="active" ${!s || s.isActive ? 'selected' : ''}>Active — students can book it</option>
                  <option value="inactive" ${s && !s.isActive ? 'selected' : ''}>Inactive — hidden from students</option>
                </select>
              </div>
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label required" for="srv-desc">Description</label>
              <textarea id="srv-desc" class="form-textarea" maxlength="2000">${esc(s ? s.description : '')}</textarea>
            </div>
          </div>`,
        footer: `
          <button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
          <button type="button" class="btn btn-primary" id="srv-save">${s ? 'Save changes' : 'Create service'}</button>`
      });
      const save = modal.querySelector('#srv-save');
      save.addEventListener('click', async () => {
        const data = {
          id: s ? s.id : undefined,
          code: modal.querySelector('#srv-code').value.trim().toUpperCase(),
          title: modal.querySelector('#srv-title').value.trim(),
          category: modal.querySelector('#srv-category').value,
          duration_minutes: Number(modal.querySelector('#srv-duration').value),
          is_active: modal.querySelector('#srv-status').value === 'active',
          description: modal.querySelector('#srv-desc').value.trim()
        };
        if (!data.code || !data.title || !data.description) return Toast.warning('Missing information', 'Code, title and description are required.');
        try {
          await Utils.withBusy(save, 'Saving…', () => ApiClient.saveService(data));
          Modal.close();
          Toast.success('Service saved', data.title);
          load();
        } catch (err) {
          Toast.error('Could not save service', err.message);
        }
      });
    };

    const load = async () => {
      tbody.innerHTML = Utils.loadingRow(6);
      try {
        services = await ApiClient.getServices(false);
        render();
      } catch (err) {
        tbody.innerHTML = Utils.errorRow(6, err.message);
      }
    };
    const addBtn = document.getElementById('btn-add-service');
    if (addBtn) addBtn.addEventListener('click', () => openForm());
    load();
  },

  /* ── Master appointment registry ── */
  async initAppointments() {
    if (!await this.start()) return;
    const tbody = document.getElementById('admin-appointments-tbody');
    if (!tbody) return;
    let apts = [];
    let status = '';
    let query = '';
    const filtered = () => apts.filter(a => (!status || a.status === status)
      && (!query || `${a.referenceCode} ${a.studentName} ${a.counselorName} ${a.serviceTitle}`.toLowerCase().includes(query)));

    const render = () => {
      const list = filtered();
      const count = document.getElementById('apt-count');
      if (count) count.textContent = `${list.length} of ${apts.length} appointments`;
      tbody.innerHTML = list.length ? list.map(a => `
        <tr>
          <td><button type="button" class="link-button" data-id="${esc(a.id)}">${esc(a.referenceCode)}</button></td>
          <td>${esc(a.studentName)}</td>
          <td>${esc(a.serviceTitle)}</td>
          <td>${esc(a.counselorName)}</td>
          <td>${esc(Utils.formatDate(a.date))} at ${esc(a.timeSlot)}</td>
          <td>${Utils.statusBadge(a.status)}</td>
        </tr>`).join('') : Utils.emptyRow(6, 'No appointments match these filters.');
      tbody.querySelectorAll('.link-button').forEach(btn => btn.addEventListener('click', () => {
        const apt = apts.find(a => a.id === btn.dataset.id);
        const actions = (apt.status === 'Pending' || apt.status === 'Approved') ? [{
          label: 'Cancel appointment', className: 'btn-danger',
          onClick: () => Modal.confirm({
            title: 'Cancel appointment',
            message: `Cancel ${apt.referenceCode} for ${apt.studentName}? The student will be notified with your reason.`,
            confirmText: 'Cancel appointment', cancelText: 'Go back', danger: true,
            input: { label: 'Reason', minLength: 5, placeholder: 'e.g. Office closed for a campus event' },
            onConfirm: async (reason) => {
              await ApiClient.updateAppointmentStatus(apt.id, 'Cancelled', reason);
              Toast.success('Appointment cancelled', 'The student was notified.');
              load();
            }
          })
        }] : [];
        Modal.showAppointmentDetails(apt, { actions });
      }));
    };

    const load = async () => {
      tbody.innerHTML = Utils.loadingRow(6);
      try {
        apts = await ApiClient.getAppointments();
        render();
      } catch (err) {
        tbody.innerHTML = Utils.errorRow(6, err.message);
      }
    };

    const statusSel = document.getElementById('apt-status-filter');
    if (statusSel) statusSel.addEventListener('change', () => { status = statusSel.value; render(); });
    const search = document.getElementById('apt-search');
    if (search) search.addEventListener('input', () => { query = search.value.toLowerCase().trim(); render(); });

    const exportBtn = document.getElementById('btn-export-csv');
    if (exportBtn) exportBtn.addEventListener('click', () => {
      const cell = (v) => {
        let s = String(v ?? '');
        if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;   // stop spreadsheets from running it as a formula
        return `"${s.replace(/"/g, '""')}"`;
      };
      const rows = [['Reference', 'Student', 'Student ID', 'Program', 'Service', 'Counselor', 'Date', 'Time', 'Modality', 'Urgency', 'Status']]
        .concat(filtered().map(a => [a.referenceCode, a.studentName, a.studentNumber, a.courseYear, a.serviceTitle, a.counselorName, a.date, a.timeSlot, a.modality, a.urgency, a.status]));
      const blob = new Blob(['﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BCC_Guidance_Appointments_${Utils.todayISO()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      Toast.success('CSV downloaded', `${rows.length - 1} appointments exported.`);
    });
    load();
  },

  /* ── Announcements ── */
  async initAnnouncements() {
    if (!await this.start()) return;
    const tbody = document.getElementById('admin-announcements-tbody');
    if (!tbody) return;
    let items = [];

    const render = () => {
      tbody.innerHTML = items.length ? items.map(a => `
        <tr>
          <td class="font-bold">${a.is_pinned ? '📌 ' : ''}${esc(a.title)}</td>
          <td><span class="badge badge-brand">${esc(a.category)}</span></td>
          <td>${esc(a.targetAudience)}</td>
          <td>${esc(Utils.formatDate(a.created_at))}</td>
          <td>${esc(a.authorName)}</td>
          <td><div class="flex gap-2" style="flex-wrap: wrap;">
            <button type="button" class="btn btn-sm btn-secondary" data-act="view" data-id="${esc(a.id)}">View</button>
            <button type="button" class="btn btn-sm btn-secondary" data-act="edit" data-id="${esc(a.id)}">Edit</button>
            <button type="button" class="btn btn-sm btn-outline" data-act="delete" data-id="${esc(a.id)}" style="color: #dc2626; border-color: #fca5a5;">Delete</button>
          </div></td>
        </tr>`).join('') : Utils.emptyRow(6, 'No announcements yet.');

      tbody.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', () => {
        const a = items.find(x => x.id === btn.dataset.id);
        if (btn.dataset.act === 'view') {
          Modal.open({
            title: `📢 ${esc(a.title)}`,
            size: 'modal-md',
            content: `
              <div style="line-height: 1.6; color: var(--slate-700);">
                <div style="margin-bottom: 0.75rem;"><span class="badge badge-brand">${esc(a.category)}</span>
                  <span style="font-size: 11px; color: var(--slate-400); margin-left: 0.5rem;">Visible to: ${esc(a.targetAudience)}</span></div>
                <div style="background: var(--bg-subtle); padding: 1.15rem; border-radius: var(--r-md); border-left: 3px solid var(--bcc-brand); white-space: pre-line; overflow-wrap: anywhere;">${esc(a.content)}</div>
                <div style="margin-top: 1rem; font-size: 11px; color: var(--slate-400);">Posted by ${esc(a.authorName)} on ${esc(Utils.formatDate(a.created_at))}</div>
              </div>`,
            footer: '<button type="button" class="btn btn-primary" data-modal-close>Close</button>'
          });
        } else if (btn.dataset.act === 'edit') {
          openForm(a);
        } else {
          Modal.confirm({
            title: 'Delete announcement', message: `Delete "${a.title}"? It will disappear from every dashboard and the homepage.`,
            confirmText: 'Delete', danger: true,
            onConfirm: async () => {
              await ApiClient.deleteAnnouncement(a.id);
              Toast.success('Announcement deleted', a.title);
              load();
            }
          });
        }
      }));
    };

    const openForm = (a = null) => {
      const modal = Modal.open({
        title: a ? 'Edit announcement' : 'Publish announcement',
        size: 'modal-lg',
        content: `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div class="form-group" style="margin: 0;">
              <label class="form-label required" for="ann-title">Headline</label>
              <input type="text" id="ann-title" class="form-input" maxlength="200" value="${esc(a ? a.title : '')}">
            </div>
            <div class="form-row-2">
              <div class="form-group" style="margin: 0;">
                <label class="form-label required" for="ann-category">Category</label>
                <select id="ann-category" class="form-select">
                  ${[...new Set([...(a ? [a.category] : []), 'General Notice', 'Event', 'Academic Advisory', 'Urgent Alert'])].map(c =>
                    `<option ${a && a.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
                </select>
              </div>
              <div class="form-group" style="margin: 0;">
                <label class="form-label required" for="ann-audience">Who can see it</label>
                <select id="ann-audience" class="form-select">
                  ${[['All', 'Everyone (including the public homepage)'], ['Students', 'Students only'], ['Counselors', 'Counselors only']].map(([val, label]) =>
                    `<option value="${val}" ${a && a.targetAudience === val ? 'selected' : ''}>${label}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label required" for="ann-content">Message</label>
              <textarea id="ann-content" class="form-textarea" maxlength="5000" style="min-height: 140px;">${esc(a ? a.content : '')}</textarea>
            </div>
            <label class="flex items-center gap-2" style="font-size: var(--text-sm); cursor: pointer;">
              <input type="checkbox" id="ann-pinned" ${a && a.is_pinned ? 'checked' : ''}> Pin to the top
            </label>
          </div>`,
        footer: `
          <button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
          <button type="button" class="btn btn-primary" id="ann-save">${a ? 'Save changes' : 'Publish'}</button>`
      });
      const save = modal.querySelector('#ann-save');
      save.addEventListener('click', async () => {
        const data = {
          id: a ? a.id : undefined,
          title: modal.querySelector('#ann-title').value.trim(),
          category: modal.querySelector('#ann-category').value,
          target_audience: modal.querySelector('#ann-audience').value,
          content: modal.querySelector('#ann-content').value.trim(),
          is_pinned: modal.querySelector('#ann-pinned').checked
        };
        if (!data.title || !data.content) return Toast.warning('Missing information', 'Please add a headline and a message.');
        try {
          await Utils.withBusy(save, 'Saving…', () => ApiClient.saveAnnouncement(data));
          Modal.close();
          Toast.success(a ? 'Announcement updated' : 'Announcement published', data.title);
          load();
        } catch (err) {
          Toast.error('Could not save announcement', err.message);
        }
      });
    };

    const load = async () => {
      tbody.innerHTML = Utils.loadingRow(6);
      try {
        items = await ApiClient.getAnnouncements();
        render();
      } catch (err) {
        tbody.innerHTML = Utils.errorRow(6, err.message);
      }
    };
    const addBtn = document.getElementById('btn-add-announcement');
    if (addBtn) addBtn.addEventListener('click', () => openForm());
    load();
  },

  /* ── Reports ── */
  async initReports() {
    if (!await this.start()) return;
    try {
      const r = await ApiClient.getReportsSummary();
      Reports.renderCards('rep-cards', [
        ['Registered students', r.total_students],
        ['Total appointments', r.total_appointments],
        ['Students helped (completed)', r.students_served],
        ['Student satisfaction', r.avg_rating === null ? '—' : `${r.avg_rating} / 5`, `${r.feedback_count} rating${r.feedback_count === 1 ? '' : 's'}`]
      ]);
      Reports.renderTable('rep-dept-tbody', r.by_department, row => `
        <td class="font-bold">${esc(row.name)}</td>
        <td>${row.students} student${row.students === 1 ? '' : 's'} • ${row.appointments} appt${row.appointments === 1 ? '' : 's'}</td>
        <td>${esc(row.top_service || '—')}</td>
        <td>${row.completion_rate === null ? '<span class="text-muted">—</span>' : `<span class="badge badge-confirmed">${row.completion_rate}%</span>`}</td>`, 4, 'No appointments yet.');
      Reports.renderTable('rep-service-tbody', r.by_service, row => `
        <td class="font-bold">${esc(row.name)}</td>
        <td>${row.completed} of ${row.appointments}</td>
        <td>${row.completion_rate === null ? '—' : `${row.completion_rate}%`}</td>
        <td>${row.avg_rating === null ? '<span class="text-muted">No ratings</span>' : `${row.avg_rating} ★`}</td>`, 4, 'No appointments yet.');
      Reports.renderMonthly('rep-monthly', r.monthly);
    } catch (err) {
      Toast.error('Could not load reports', err.message);
    }
  },

  /* ── Settings ── */
  async initSettings() {
    if (!await this.start()) return;
    let settings = {};
    const show = () => {
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set('cfg-system-name', settings.system_name);
      set('cfg-lead-time', `${settings.lead_time_hours} hours before the appointment`);
      set('cfg-cancel-window', `Up to ${settings.cancellation_window_hours} hours before`);
      set('cfg-max-days', `${settings.max_advance_booking_days} days ahead`);
      set('cfg-max-active', `${settings.max_active_appointments_per_student} at a time`);
      set('cfg-operating-hours', settings.operating_hours);
    };
    try {
      settings = await ApiClient.getSettings();
      show();
    } catch (err) {
      Toast.error('Could not load settings', err.message);
      return;
    }

    const editBtn = document.getElementById('btn-edit-settings');
    if (editBtn) editBtn.addEventListener('click', () => {
      const field = (id, label, value, attrs, help) => `
        <div class="form-group" style="margin: 0;">
          <label class="form-label required" for="${id}">${label}</label>
          <input id="${id}" class="form-input" value="${esc(value)}" ${attrs}>
          ${help ? `<p class="text-xs text-muted" style="margin-top: 0.25rem;">${help}</p>` : ''}
        </div>`;
      const modal = Modal.open({
        title: '⚙️ System settings',
        size: 'modal-md',
        content: `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${field('set-name', 'System name', settings.system_name, 'type="text" maxlength="120"')}
            <div class="form-row-2">
              ${field('set-lead', 'Booking lead time (hours)', settings.lead_time_hours, 'type="number" min="0" max="168"', 'How far ahead students must book.')}
              ${field('set-cancel', 'Online cancellation cut-off (hours)', settings.cancellation_window_hours, 'type="number" min="0" max="72"', 'Students can’t cancel online closer than this.')}
            </div>
            <div class="form-row-2">
              ${field('set-days', 'Furthest booking (days ahead)', settings.max_advance_booking_days, 'type="number" min="1" max="90"')}
              ${field('set-active', 'Upcoming appointments per student', settings.max_active_appointments_per_student, 'type="number" min="1" max="10"')}
            </div>
            ${field('set-hours', 'Office hours (shown to users)', settings.operating_hours, 'type="text" maxlength="80"')}
          </div>`,
        footer: `
          <button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
          <button type="button" class="btn btn-primary" id="set-save">Save settings</button>`
      });
      const save = modal.querySelector('#set-save');
      save.addEventListener('click', async () => {
        const v = (id) => modal.querySelector(id).value.trim();
        const data = {
          system_name: v('#set-name'),
          lead_time_hours: v('#set-lead'),
          cancellation_window_hours: v('#set-cancel'),
          max_advance_booking_days: v('#set-days'),
          max_active_appointments_per_student: v('#set-active'),
          operating_hours: v('#set-hours')
        };
        try {
          const res = await Utils.withBusy(save, 'Saving…', () => ApiClient.saveSettings(data));
          settings = res.settings;
          show();
          Modal.close();
          Toast.success('Settings saved', 'New bookings follow these rules from now on.');
        } catch (err) {
          Toast.error('Could not save settings', err.message);
        }
      });
    });
  },

  /* ── Audit logs ── */
  async initLogs() {
    if (!await this.start()) return;
    const tbody = document.getElementById('admin-logs-tbody');
    if (!tbody) return;
    let logs = [];
    let query = '';
    const render = () => {
      const list = logs.filter(l => !query || `${l.userName} ${l.action} ${l.details} ${l.ip_address || ''}`.toLowerCase().includes(query));
      tbody.innerHTML = list.length ? list.map(l => `
        <tr>
          <td style="font-family: var(--font-mono); font-size: 11px; white-space: nowrap;">${esc(Utils.formatDateTime(l.timestamp))}</td>
          <td class="font-bold">${esc(l.userName)}<div style="font-size: 11px; color: var(--slate-400); font-weight: 400;">${esc(l.ip_address || '')}</div></td>
          <td><span class="badge ${/FAILED|DELETED|CANCELLED|STATUS/.test(l.action) ? 'badge-cancelled' : 'badge-brand'}">${esc(l.action)}</span></td>
          <td style="overflow-wrap: anywhere;">${esc(l.details)}</td>
        </tr>`).join('') : Utils.emptyRow(4, 'No log entries match your search.');
    };
    const search = document.getElementById('log-search');
    if (search) search.addEventListener('input', () => { query = search.value.toLowerCase().trim(); render(); });
    try {
      logs = await ApiClient.getAuditLogs();
      render();
    } catch (err) {
      tbody.innerHTML = Utils.errorRow(4, err.message);
    }
  }
};
