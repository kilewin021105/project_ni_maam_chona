/**
 * Buenavista Community College — Administrator Module Controller
 */

const AdminController = {
  /* ── Executive Dashboard ── */
  async initDashboard() {
    Portal.init('admin');
    const user = Portal.currentUser;

    const summary = await ApiClient.getReportsSummary();
    const appointments = await ApiClient.getAppointments();

    const elStudents = document.getElementById('adm-metric-students');
    if (elStudents) elStudents.textContent = summary.total_students || 0;

    const elApts = document.getElementById('adm-metric-appointments');
    if (elApts) elApts.textContent = summary.total_appointments || 0;

    const breakdown = summary.status_breakdown || {};
    const completed = breakdown.Completed || 0;
    const pending = breakdown.Pending || 0;
    const approved = breakdown.Approved || 0;
    const cancelled = breakdown.Cancelled || 0;

    const elComp = document.getElementById('adm-metric-completed');
    if (elComp) elComp.textContent = completed;

    const elPend = document.getElementById('adm-metric-pending');
    if (elPend) elPend.textContent = pending;

    const total = summary.total_appointments || 1;
    const compPct = Math.round((completed / total) * 100);
    const elPct = document.getElementById('adm-completion-pct');
    if (elPct) elPct.textContent = `${compPct}%`;

    const elPctComp = document.getElementById('adm-pct-completed');
    if (elPctComp) elPctComp.textContent = `${Math.round((completed / total) * 100)}%`;
    const elPctApp = document.getElementById('adm-pct-approved');
    if (elPctApp) elPctApp.textContent = `${Math.round((approved / total) * 100)}%`;
    const elPctPend = document.getElementById('adm-pct-pending');
    if (elPctPend) elPctPend.textContent = `${Math.round((pending / total) * 100)}%`;
    const elPctCanc = document.getElementById('adm-pct-cancelled');
    if (elPctCanc) elPctCanc.textContent = `${Math.round((cancelled / total) * 100)}%`;

    const tbody = document.getElementById('adm-recent-apts-tbody');
    if (tbody) {
      if (appointments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 2rem;">No appointments recorded.</td></tr>`;
      } else {
        const recent = appointments.slice(0, 7);
        tbody.innerHTML = recent.map(a => `
          <tr>
            <td class="font-bold">${a.studentName}</td>
            <td>${a.serviceTitle}</td>
            <td>${a.counselorName}</td>
            <td>${a.date} at ${a.timeSlot}</td>
            <td>
              <span class="badge badge-${a.status.toLowerCase()}">
                <span class="badge-dot"></span> ${a.status}
              </span>
            </td>
          </tr>
        `).join('');
      }
    }
  },

  /* ── User Management ── */
  async initUsers() {
    Portal.init('admin');
    const users = await ApiClient.getUsers();
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;

    tbody.innerHTML = users.map(u => {
      const isActive = u.status !== 'inactive';
      return `
        <tr>
          <td class="font-bold">${u.name}</td>
          <td>${u.email}</td>
          <td><span class="badge badge-brand">${u.role.toUpperCase()}</span></td>
          <td>${u.course || u.specialization || 'Guidance Staff'}</td>
          <td>
            <span class="badge badge-${isActive ? 'confirmed' : 'cancelled'}">
              ${isActive ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td>
            <button class="btn btn-sm ${isActive ? 'btn-secondary' : 'btn-primary'} btn-toggle-user" data-id="${u.id}" data-status="${u.status || 'active'}">
              ${isActive ? 'Deactivate' : 'Activate'}
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-toggle-user').forEach(btn => {
      btn.addEventListener('click', () => {
        const uid = btn.getAttribute('data-id');
        const curr = btn.getAttribute('data-status');
        const newStatus = curr === 'inactive' ? 'active' : 'inactive';
        Modal.confirm({
          title: `${newStatus === 'inactive' ? 'Deactivate' : 'Activate'} User Account`,
          message: `Are you sure you want to mark this account as ${newStatus}?`,
          confirmText: `Confirm ${newStatus === 'inactive' ? 'Deactivation' : 'Activation'}`,
          confirmType: newStatus === 'inactive' ? 'btn-secondary' : 'btn-primary',
          onConfirm: async () => {
            try {
              await ApiClient.toggleUserStatus(uid, newStatus);
              Toast.success('Updated', `User status changed to ${newStatus}.`);
              setTimeout(() => window.location.reload(), 600);
            } catch (err) {
              Toast.error('Error', err.message);
            }
          }
        });
      });
    });

    const addBtn = document.getElementById('btn-add-user');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const content = `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Full Name</label>
              <input type="text" id="nu-name" class="form-input" placeholder="e.g. Elena Ramos, RGC" required>
            </div>
            <div class="form-group">
              <label class="form-label required">BCC Email</label>
              <input type="email" id="nu-email" class="form-input" placeholder="e.g. elena.ramos@buenavista.edu.ph" required>
            </div>
            <div class="form-group">
              <label class="form-label required">Account Role</label>
              <select id="nu-role" class="form-select">
                <option value="student">Student</option>
                <option value="counselor">Guidance Counselor</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <!-- Student Specific Fields -->
            <div id="nu-student-fields">
              <div class="form-group">
                <label class="form-label required">Degree Program (Students)</label>
                <select id="nu-course" class="form-select">
                  <option value="BSIT" selected>BSIT - Bachelor of Science in Information Technology</option>
                  <option value="BSHM">BSHM - Bachelor of Science in Hospitality Management</option>
                  <option value="BSTM">BSTM - Bachelor of Science in Tourism Management</option>
                  <option value="BSCRIM">BSCRIM - Bachelor of Science in Criminal Justice</option>
                  <option value="BSED">BSED - Bachelor of Secondary Education</option>
                  <option value="BEED">BEED - Bachelor of Elementary Education</option>
                </select>
              </div>
              <div class="form-group" style="margin-top: 0.75rem;">
                <label class="form-label required">Year & Section</label>
                <input type="text" id="nu-yearsec" class="form-input" value="1A" placeholder="e.g. 1A, 2B, 3A">
              </div>
            </div>

            <!-- Counselor Specific Fields -->
            <div id="nu-counselor-fields" style="display: none;">
              <div class="form-group">
                <label class="form-label required">Counselor Professional Title</label>
                <input type="text" id="nu-cns-title" class="form-input" value="Registered Guidance Counselor (RGC)" placeholder="e.g. Registered Guidance Counselor">
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 0.75rem;">
                <div class="form-group">
                  <label class="form-label required">Assigned Office / Room</label>
                  <input type="text" id="nu-cns-room" class="form-input" value="Guidance Office Rm 204" placeholder="e.g. Guidance Rm 204">
                </div>
                <div class="form-group">
                  <label class="form-label required">Daily Appointment Limit</label>
                  <input type="number" id="nu-cns-max" class="form-input" value="5" min="1" max="15">
                </div>
              </div>
              <div class="form-group" style="margin-top: 0.75rem;">
                <label class="form-label required">Counseling Specialization</label>
                <input type="text" id="nu-cns-spec" class="form-input" value="Academic Advisory & Student Welfare" placeholder="e.g. Academic, Career, Mental Health">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label required">Default Password</label>
              <input type="password" id="nu-password" class="form-input" value="password123">
            </div>
          </div>
        `;

        const modal = Modal.open({
          title: `${Icons.get('user')} Add New User Account`,
          size: 'modal-md',
          content,
          footer: `
            <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
            <button class="btn btn-primary" id="btn-save-new-user">Create User</button>
          `
        });

        // Toggle student vs counselor fields based on role selection
        const roleSelect = modal.querySelector('#nu-role');
        const stdFields = modal.querySelector('#nu-student-fields');
        const cnsFields = modal.querySelector('#nu-counselor-fields');

        roleSelect.addEventListener('change', () => {
          if (roleSelect.value === 'counselor') {
            stdFields.style.display = 'none';
            cnsFields.style.display = 'block';
          } else if (roleSelect.value === 'student') {
            stdFields.style.display = 'block';
            cnsFields.style.display = 'none';
          } else {
            stdFields.style.display = 'none';
            cnsFields.style.display = 'none';
          }
        });

        modal.querySelector('#btn-save-new-user').addEventListener('click', async () => {
          const name = document.getElementById('nu-name').value.trim();
          const email = document.getElementById('nu-email').value.trim();
          const role = roleSelect.value;
          const password = document.getElementById('nu-password').value;

          if (!name || !email) {
            Toast.warning('Validation', 'Please provide name and institutional email.');
            return;
          }

          const userData = {
            name,
            email,
            role,
            password,
            status: 'active'
          };

          if (role === 'student') {
            userData.course = document.getElementById('nu-course').value;
            userData.year_section = document.getElementById('nu-yearsec').value.trim() || '1A';
            userData.studentId = `BCC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
          } else if (role === 'counselor') {
            userData.title = document.getElementById('nu-cns-title').value.trim();
            userData.room = document.getElementById('nu-cns-room').value.trim();
            userData.specialization = document.getElementById('nu-cns-spec').value.trim();
            userData.max_appointments = parseInt(document.getElementById('nu-cns-max').value, 10) || 5;
          }

          try {
            await ApiClient.saveUser(userData);
            Modal.close();
            Toast.success('User Created', `User account for ${name} (${role.toUpperCase()}) created successfully.`);
            setTimeout(() => window.location.reload(), 600);
          } catch (err) {
            Toast.error('Creation Failed', err.message);
          }
        });
      });
    }
  },

  /* ── Guidance Services Catalog ── */
  async initServices() {
    Portal.init('admin');
    const services = await ApiClient.getServices(false);
    const tbody = document.getElementById('admin-services-tbody');
    if (!tbody) return;

    const render = () => {
      if (services.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 2rem;">No guidance services configured.</td></tr>`;
        return;
      }
      tbody.innerHTML = services.map(s => `
        <tr>
          <td class="font-bold" style="font-family: var(--font-mono); color: var(--bcc-brand);">${s.code}</td>
          <td>
            <strong>${s.title}</strong>
            <div style="font-size: 11px; color: var(--slate-500);">${(s.description || '').substring(0, 50)}...</div>
          </td>
          <td><span class="badge badge-brand">${s.category}</span></td>
          <td>${s.durationMinutes || 45} mins</td>
          <td><span class="badge badge-${s.isActive !== false ? 'confirmed' : 'cancelled'}">${s.isActive !== false ? 'Active' : 'Inactive'}</span></td>
          <td>
            <button class="btn btn-sm btn-secondary btn-edit-service" data-id="${s.id}">Edit</button>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('.btn-edit-service').forEach(btn => {
        btn.addEventListener('click', () => {
          const sId = btn.getAttribute('data-id');
          const s = services.find(x => x.id === sId);
          if (s) openServiceModal(s);
        });
      });
    };

    const openServiceModal = (s = null) => {
      const isEdit = !!s;
      const content = `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Service Code</label>
              <input type="text" id="srv-code" class="form-input" value="${s ? s.code : ''}" placeholder="e.g. ACAD" required>
            </div>
            <div class="form-group">
              <label class="form-label required">Category</label>
              <select id="srv-category" class="form-select">
                <option value="Academic" ${s && s.category === 'Academic' ? 'selected' : ''}>Academic</option>
                <option value="Career" ${s && s.category === 'Career' ? 'selected' : ''}>Career</option>
                <option value="Mental Health" ${s && s.category === 'Mental Health' ? 'selected' : ''}>Mental Health</option>
                <option value="General" ${s && s.category === 'General' ? 'selected' : ''}>General</option>
                <option value="Interpersonal" ${s && s.category === 'Interpersonal' ? 'selected' : ''}>Interpersonal</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label required">Service Title</label>
            <input type="text" id="srv-title" class="form-input" value="${s ? s.title : ''}" placeholder="e.g. Academic Counseling & Study Skills" required>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Default Duration (Minutes)</label>
              <input type="number" id="srv-duration" class="form-input" value="${s ? (s.durationMinutes || 45) : 45}" min="15" max="180" required>
            </div>
            <div class="form-group">
              <label class="form-label required">Status</label>
              <select id="srv-status" class="form-select">
                <option value="active" ${!s || s.isActive !== false ? 'selected' : ''}>Active</option>
                <option value="inactive" ${s && s.isActive === false ? 'selected' : ''}>Inactive</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label required">Description</label>
            <textarea id="srv-desc" class="form-textarea" placeholder="Detailed scope and purpose of the guidance service...">${s ? (s.description || '') : ''}</textarea>
          </div>
        </div>
      `;

      const modal = Modal.open({
        title: isEdit ? '✏️ Edit Guidance Service' : '✨ Add New Guidance Service',
        size: 'modal-lg',
        content,
        footer: `
          <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
          <button class="btn btn-primary" id="btn-save-service-modal">${isEdit ? 'Save Changes' : 'Create Service'}</button>
        `
      });

      modal.querySelector('#btn-save-service-modal').addEventListener('click', async () => {
        const code = document.getElementById('srv-code').value.trim().toUpperCase();
        const title = document.getElementById('srv-title').value.trim();
        const category = document.getElementById('srv-category').value;
        const durationMinutes = parseInt(document.getElementById('srv-duration').value, 10);
        const isActive = document.getElementById('srv-status').value === 'active';
        const description = document.getElementById('srv-desc').value.trim();

        if (!code || !title || !description) {
          Toast.warning('Validation', 'Please fill in all required service fields.');
          return;
        }

        const serviceData = {
          id: s ? s.id : `srv-${Date.now()}`,
          code,
          title,
          category,
          durationMinutes,
          description,
          isActive,
          is_active: isActive
        };

        try {
          await ApiClient.saveService(serviceData);
          Modal.close();
          Toast.success('Service Saved', `Guidance service "${title}" saved successfully.`);
          setTimeout(() => window.location.reload(), 600);
        } catch (err) {
          Toast.error('Save Failed', err.message);
        }
      });
    };

    render();

    const addBtn = document.getElementById('btn-add-service');
    if (addBtn) {
      addBtn.addEventListener('click', () => openServiceModal(null));
    }
  },

  /* ── Master Appointments ── */
  async initAppointments() {
    Portal.init('admin');
    const appointments = await ApiClient.getAppointments();
    const tbody = document.getElementById('admin-appointments-tbody');
    if (!tbody) return;

    tbody.innerHTML = appointments.map(apt => `
      <tr>
        <td class="font-bold" style="font-family: var(--font-mono); color: var(--bcc-brand);">${apt.referenceCode}</td>
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
    `).join('');

    // Export CSV
    const exportBtn = document.getElementById('btn-export-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += 'Reference,Student,Service,Counselor,Date,Time,Status\n';
        appointments.forEach(a => {
          csvContent += `"${a.referenceCode}","${a.studentName}","${a.serviceTitle}","${a.counselorName}","${a.date}","${a.timeSlot}","${a.status}"\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `BCC_Guidance_Appointments_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Toast.success('Export Successful', 'Appointments data exported to CSV.');
      });
    }
  },

  /* ── Announcements ── */
  async initAnnouncements() {
    Portal.init('admin');
    const announcements = await ApiClient.getAnnouncements();
    const tbody = document.getElementById('admin-announcements-tbody');
    if (!tbody) return;

    const render = () => {
      if (announcements.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 2rem;">No announcements or bulletins posted yet.</td></tr>`;
        return;
      }
      tbody.innerHTML = announcements.map(ann => `
        <tr>
          <td class="font-bold">${ann.title}</td>
          <td><span class="badge badge-brand">${ann.category}</span></td>
          <td>${ann.publishDate || ann.createdAt ? new Date(ann.publishDate || ann.createdAt).toLocaleDateString() : 'Active'}</td>
          <td>${ann.author || ann.authorName || 'BCC Guidance Office'}</td>
          <td>
            <button class="btn btn-sm btn-secondary btn-view-ann" data-id="${ann.id}">View</button>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('.btn-view-ann').forEach(btn => {
        btn.addEventListener('click', () => {
          const annId = btn.getAttribute('data-id');
          const ann = announcements.find(a => a.id === annId);
          if (ann) {
            Modal.open({
              title: `📢 ${ann.title}`,
              size: 'modal-md',
              content: `
                <div style="line-height: 1.6; color: var(--slate-700);">
                  <div style="margin-bottom: 0.75rem;">
                    <span class="badge badge-brand">${ann.category}</span>
                    <span style="font-size: 11px; color: var(--slate-400); margin-left: 0.5rem;">Target: ${ann.targetAudience || ann.targetRole || 'All'}</span>
                  </div>
                  <div style="background: var(--bg-subtle); padding: 1.15rem; border-radius: var(--r-md); border-left: 3px solid var(--bcc-brand); font-size: 0.95rem; line-height: 1.6;">
                    ${ann.content}
                  </div>
                  <div style="margin-top: 1rem; font-size: 11px; color: var(--slate-400);">
                    Posted by: <strong>${ann.author || ann.authorName || 'BCC Guidance Office'}</strong>
                  </div>
                </div>
              `,
              footer: `<button class="btn btn-primary" onclick="Modal.close()">Close Notice</button>`
            });
          }
        });
      });
    };

    render();

    // Add Notice Button
    const addBtn = document.getElementById('btn-add-announcement');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const content = `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Bulletin Headline</label>
              <input type="text" id="ann-title" class="form-input" placeholder="e.g. Schedule of Career Consultation for 3rd Year Students" required>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label required">Category</label>
                <select id="ann-category" class="form-select">
                  <option value="General Notice">General Notice</option>
                  <option value="Events">Events</option>
                  <option value="Academic Advisory">Academic Advisory</option>
                  <option value="Urgent Alert">Urgent Alert</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label required">Target Audience</label>
                <select id="ann-audience" class="form-select">
                  <option value="All">All Campus Users</option>
                  <option value="Students">Students Only</option>
                  <option value="Counselors">Counselors Only</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label required">Bulletin Content / Message</label>
              <textarea id="ann-content" class="form-textarea" placeholder="Full text of the announcement..." required></textarea>
            </div>
          </div>
        `;

        const modal = Modal.open({
          title: '📢 Publish Campus Bulletin / Notice',
          size: 'modal-lg',
          content,
          footer: `
            <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
            <button class="btn btn-primary" id="btn-save-ann-modal">Publish Notice</button>
          `
        });

        modal.querySelector('#btn-save-ann-modal').addEventListener('click', async () => {
          const title = document.getElementById('ann-title').value.trim();
          const category = document.getElementById('ann-category').value;
          const target_audience = document.getElementById('ann-audience').value;
          const messageContent = document.getElementById('ann-content').value.trim();

          if (!title || !messageContent) {
            Toast.warning('Validation', 'Please provide headline and content.');
            return;
          }

          const annData = {
            id: `ann-${Date.now()}`,
            title,
            category,
            target_audience,
            targetRole: target_audience.toLowerCase(),
            content: messageContent,
            author_id: Portal.currentUser ? Portal.currentUser.id : 'usr-adm-1',
            author: Portal.currentUser ? Portal.currentUser.name : 'Guidance Administrator'
          };

          try {
            await ApiClient.saveAnnouncement(annData);
            Modal.close();
            Toast.success('Notice Published', 'Campus announcement has been broadcast successfully.');
            setTimeout(() => window.location.reload(), 600);
          } catch (err) {
            Toast.error('Publish Failed', err.message);
          }
        });
      });
    }
  },

  /* ── Reports ── */
  initReports() {
    Portal.init('admin');
  },

  /* ── Settings ── */
  async initSettings() {
    Portal.init('admin');
    const settings = await ApiClient.getSettings();

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el && val) el.textContent = val;
    };

    setVal('cfg-system-name', settings.system_name);
    setVal('cfg-lead-time', settings.lead_time_hours ? `${settings.lead_time_hours} Hours Prior` : null);
    setVal('cfg-cancel-window', settings.cancellation_window_hours ? `${settings.cancellation_window_hours} Hours Prior` : null);
    setVal('cfg-operating-hours', settings.operating_hours);

    const editBtn = document.getElementById('btn-edit-settings');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        const content = `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">System / Institution Name</label>
              <input type="text" id="set-sys-name" class="form-input" value="${settings.system_name || 'Buenavista Community College Guidance System'}" required>
            </div>
            <div class="form-group">
              <label class="form-label required">Booking Lead Time (Hours Prior)</label>
              <input type="number" id="set-lead-time" class="form-input" value="${settings.lead_time_hours || 12}" min="1" max="72" required>
            </div>
            <div class="form-group">
              <label class="form-label required">Cancellation Notice Window (Hours Prior)</label>
              <input type="number" id="set-cancel-win" class="form-input" value="${settings.cancellation_window_hours || 4}" min="1" max="24" required>
            </div>
            <div class="form-group">
              <label class="form-label required">Guidance Operating Hours</label>
              <input type="text" id="set-op-hours" class="form-input" value="${settings.operating_hours || '8:00 AM – 5:00 PM (Mon–Fri)'}" required>
            </div>
          </div>
        `;

        const modal = Modal.open({
          title: '⚙️ Configure Guidance System Policies',
          size: 'modal-md',
          content,
          footer: `
            <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
            <button class="btn btn-primary" id="btn-save-settings-modal">Save Settings</button>
          `
        });

        modal.querySelector('#btn-save-settings-modal').addEventListener('click', async () => {
          const sysName = document.getElementById('set-sys-name').value.trim();
          const leadTime = document.getElementById('set-lead-time').value;
          const cancelWin = document.getElementById('set-cancel-win').value;
          const opHours = document.getElementById('set-op-hours').value.trim();

          try {
            await ApiClient.saveSettings({
              system_name: sysName,
              lead_time_hours: leadTime,
              cancellation_window_hours: cancelWin,
              operating_hours: opHours
            });
            Modal.close();
            Toast.success('Settings Saved', 'Institutional system policies updated successfully.');
            setTimeout(() => window.location.reload(), 600);
          } catch (err) {
            Toast.error('Error', err.message);
          }
        });
      });
    }
  },

  /* ── Audit Logs ── */
  async initLogs() {
    Portal.init('admin');
    const logs = await ApiClient.getAuditLogs();
    const tbody = document.getElementById('admin-logs-tbody');
    if (!tbody) return;

    tbody.innerHTML = logs.map(l => `
      <tr>
        <td style="font-family: var(--font-mono); font-size: 11px;">${l.timestamp}</td>
        <td class="font-bold">${l.userName}</td>
        <td><span class="badge badge-brand">${l.action}</span></td>
        <td>${l.details}</td>
      </tr>
    `).join('');
  }
};
