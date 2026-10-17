/**
 * Buenavista Community College — Counselor Module Controller
 */

const CounselorController = {
  /* ── Dashboard Page Logic ── */
  async initDashboard() {
    Portal.init('counselor');
    const user = Portal.currentUser;

    const appointments = await ApiClient.getAppointments();
    const today = new Date().toISOString().split('T')[0];
    const todayList = appointments.filter(a => a.date === today && a.status !== 'Cancelled');
    const pendingList = appointments.filter(a => a.status === 'Pending');
    const completedList = appointments.filter(a => a.status === 'Completed');

    // Populate Metrics
    const elToday = document.getElementById('cns-metric-today');
    if (elToday) elToday.textContent = todayList.length;

    const elWeek = document.getElementById('cns-metric-week');
    if (elWeek) elWeek.textContent = appointments.length;

    const elComp = document.getElementById('cns-metric-completed');
    if (elComp) elComp.textContent = completedList.length;

    const elPend = document.getElementById('cns-metric-pending');
    if (elPend) elPend.textContent = pendingList.length;

    // Populate Today's Appointments Table
    const tbody = document.getElementById('cns-today-tbody');
    if (tbody) {
      if (todayList.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" class="text-center" style="padding: 2rem; color: var(--slate-400);">
              No appointments scheduled for today.
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = todayList.map(a => `
          <tr>
            <td style="font-family: var(--font-mono); font-weight: 600;">${a.timeSlot}</td>
            <td class="font-bold">${a.studentName}</td>
            <td>${a.serviceTitle}</td>
            <td>
              <span class="badge badge-${a.status.toLowerCase()}">
                <span class="badge-dot"></span> ${a.status}
              </span>
            </td>
          </tr>
        `).join('');
      }
    }

    // Render Calendar Widget if present
    const calEl = document.getElementById('cns-calendar-widget');
    if (calEl && typeof Calendar !== 'undefined') {
      Calendar.renderMini('cns-calendar-widget');
    }
  },

  /* ── Appointment Queue Logic ── */
  async initAppointments() {
    Portal.init('counselor');
    const user = Portal.currentUser;

    const appointments = await ApiClient.getAppointments();
    const tbody = document.getElementById('counselor-queue-tbody');
    if (!tbody) return;

    if (appointments.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center" style="padding: 2.5rem; color: var(--slate-400);">
            No appointments currently in queue.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = appointments.map(apt => `
      <tr>
        <td class="font-bold" style="font-family: var(--font-mono); color: var(--bcc-brand);">${apt.referenceCode}</td>
        <td>
          <strong>${apt.studentName}</strong>
          <div style="font-size: 11px; color: var(--slate-400);">${apt.modality || 'In-Person'} • ${apt.urgency || 'Routine'}</div>
        </td>
        <td>${apt.serviceTitle}</td>
        <td>
          <div>${apt.date}</div>
          <div style="font-size: 11px; color: var(--slate-400);">${apt.timeSlot}</div>
        </td>
        <td>
          <span class="badge badge-${apt.status.toLowerCase()}">
            <span class="badge-dot"></span> ${apt.status}
          </span>
        </td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-sm btn-secondary btn-cns-view" data-id="${apt.id}">View</button>
            ${apt.status === 'Pending' ? `
              <button class="btn btn-sm btn-primary btn-cns-approve" data-id="${apt.id}">Approve</button>
              <button class="btn btn-sm btn-secondary btn-cns-reject" data-id="${apt.id}" style="color: #dc2626;">Reject</button>
            ` : `
              <button class="btn btn-sm btn-outline btn-cns-pass" data-id="${apt.id}">Pass Slip</button>
            `}
          </div>
        </td>
      </tr>
    `).join('');

    // View Details handlers
    tbody.querySelectorAll('.btn-cns-view').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const apt = appointments.find(a => a.id === id);
        if (apt) Modal.showAppointmentDetails(apt);
      });
    });

    // Approve handlers
    tbody.querySelectorAll('.btn-cns-approve').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        try {
          await ApiClient.updateAppointmentStatus(id, 'Approved');
          Toast.success('Approved', 'Appointment has been approved.');
          setTimeout(() => window.location.reload(), 600);
        } catch (err) {
          Toast.error('Error', err.message);
        }
      });
    });

    // Reject handlers
    tbody.querySelectorAll('.btn-cns-reject').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        Modal.confirm({
          title: 'Reject Appointment Request',
          message: 'Are you sure you want to decline this appointment request? The student will be notified.',
          confirmText: 'Decline Request',
          confirmType: 'btn-secondary',
          onConfirm: async () => {
            try {
              await ApiClient.updateAppointmentStatus(id, 'Cancelled');
              Toast.info('Rejected', 'Appointment request declined.');
              setTimeout(() => window.location.reload(), 600);
            } catch (err) {
              Toast.error('Error', err.message);
            }
          }
        });
      });
    });

    // View Pass handlers
    tbody.querySelectorAll('.btn-cns-pass').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const apt = appointments.find(a => a.id === id);
        if (apt) Modal.showAppointmentPass(apt);
      });
    });
  },

  /* ── Schedule Page Logic ── */
  initSchedule() {
    Portal.init('counselor');
    if (typeof Calendar !== 'undefined') {
      Calendar.renderFull('cns-full-calendar-widget');
    }
  },

  /* ── SOAP Notes Logic ── */
  async initNotes() {
    Portal.init('counselor');
    const user = Portal.currentUser;
    const notes = await ApiClient.getSessionNotes(user ? user.id : null);
    const tbody = document.getElementById('counselor-notes-tbody');
    if (!tbody) return;

    if (notes.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center" style="padding: 2.5rem; color: var(--slate-400);">
            No clinical SOAP case notes recorded yet.
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = notes.map(n => `
        <tr>
          <td>${n.sessionDate || n.session_date || new Date().toISOString().split('T')[0]}</td>
          <td class="font-bold">${n.studentName || n.student_name || 'BCC Student'}</td>
          <td><span class="badge badge-brand">${n.caseCategory || n.case_category || 'General'}</span></td>
          <td>${(n.assessment || '').substring(0, 45) || 'Confidential clinical assessment'}...</td>
          <td><span class="badge badge-confirmed">${n.status || 'Confidential'}</span></td>
          <td>
            <button class="btn btn-sm btn-secondary btn-view-soap" data-id="${n.id}">View Note</button>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('.btn-view-soap').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const n = notes.find(x => x.id === id);
          if (n) {
            Modal.open({
              title: `🔒 Clinical SOAP Case Record — ${n.studentName || 'Student'}`,
              size: 'modal-lg',
              content: `
                <div style="display: flex; flex-direction: column; gap: 1rem; line-height: 1.6;">
                  <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-subtle); padding: 0.75rem 1rem; border-radius: var(--r-md); border: 1px solid var(--border-light);">
                    <div>
                      <strong>Case Category:</strong> ${n.caseCategory || n.case_category || 'General Counseling'}
                    </div>
                    <div>
                      <span class="badge badge-confirmed">Strictly Confidential (RA 9258 / RA 10173)</span>
                    </div>
                  </div>

                  <div>
                    <h5 style="font-weight: 800; color: #064e3b; margin-bottom: 0.35rem;">S — Subjective (Student's Statement & Chief Concerns)</h5>
                    <div style="background: var(--bg-muted); padding: 0.85rem; border-radius: var(--r-md); border: 1px solid var(--border); font-size: var(--text-sm);">
                      ${n.subjective || 'No subjective statements recorded.'}
                    </div>
                  </div>

                  <div>
                    <h5 style="font-weight: 800; color: #064e3b; margin-bottom: 0.35rem;">O — Objective (Counselor's Behavioral Observations)</h5>
                    <div style="background: var(--bg-muted); padding: 0.85rem; border-radius: var(--r-md); border: 1px solid var(--border); font-size: var(--text-sm);">
                      ${n.objective || 'No objective observations recorded.'}
                    </div>
                  </div>

                  <div>
                    <h5 style="font-weight: 800; color: #064e3b; margin-bottom: 0.35rem;">A — Assessment (Clinical Appraisal & Diagnostic Impressions)</h5>
                    <div style="background: var(--bg-muted); padding: 0.85rem; border-radius: var(--r-md); border: 1px solid var(--border); font-size: var(--text-sm);">
                      ${n.assessment || 'No clinical appraisal recorded.'}
                    </div>
                  </div>

                  <div>
                    <h5 style="font-weight: 800; color: #064e3b; margin-bottom: 0.35rem;">P — Plan (Intervention, Coping Strategies & Follow-Up)</h5>
                    <div style="background: var(--bg-muted); padding: 0.85rem; border-radius: var(--r-md); border: 1px solid var(--border); font-size: var(--text-sm);">
                      ${n.plan || 'No plan recorded.'}
                    </div>
                  </div>

                  <div style="font-size: 11px; color: var(--slate-400); margin-top: 0.5rem;">
                    Session Date: ${n.sessionDate || n.session_date || 'N/A'} &bull; Protected Health Information
                  </div>
                </div>
              `,
              footer: `<button class="btn btn-primary" onclick="Modal.close()">Close Record</button>`
            });
          }
        });
      });
    }

    const createBtn = document.getElementById('btn-create-soap-note');
    if (createBtn) {
      createBtn.addEventListener('click', async () => {
        let students = [];
        try {
          students = await ApiClient.getUsers('student');
        } catch (e) {
          students = StorageService.getUsers().filter(u => u.role === 'student');
        }

        const studentOptions = (students && students.length > 0)
          ? students.map(s => `<option value="${s.id}" data-name="${s.name}">${s.name} (${s.courseYear || s.course || 'Student'}${s.studentNumber ? ' - ' + s.studentNumber : ''})</option>`).join('')
          : `<option value="usr-std-1" data-name="Juan Dela Cruz">Juan Dela Cruz (BSIT 3A)</option>`;

        const content = `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Student</label>
              <select id="soap-student-select" class="form-select">
                ${studentOptions}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label required">Case Category</label>
              <select id="soap-category" class="form-select">
                <option value="Academic Support">Academic Support</option>
                <option value="Career Advisory">Career Advisory</option>
                <option value="Personal / Mental Health">Personal / Mental Health</option>
                <option value="Crisis Intervention">Crisis Intervention</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label required">S — Subjective (Student's Statement)</label>
              <textarea id="soap-s" class="form-textarea" placeholder="What the student expressed during the session..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label required">O — Objective (Counselor Observations)</label>
              <textarea id="soap-o" class="form-textarea" placeholder="Behavioral, emotional, and cognitive observations..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label required">A — Assessment (Clinical Diagnosis/Impression)</label>
              <textarea id="soap-a" class="form-textarea" placeholder="Counselor's professional appraisal..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label required">P — Plan (Intervention & Next Steps)</label>
              <textarea id="soap-p" class="form-textarea" placeholder="Agreed action plan, homework, or follow-up date..."></textarea>
            </div>
          </div>
        `;

        const modal = Modal.open({
          title: `${Icons.get('file-text')} Create New SOAP Clinical Note`,
          size: 'modal-lg',
          content,
          footer: `
            <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
            <button class="btn btn-primary" id="btn-save-soap-modal">Save Note (Confidential)</button>
          `
        });

        modal.querySelector('#btn-save-soap-modal').addEventListener('click', async () => {
          const selectEl = document.getElementById('soap-student-select');
          const studentId = selectEl ? selectEl.value : 'usr-std-1';
          const studentName = selectEl && selectEl.selectedOptions[0] ? selectEl.selectedOptions[0].getAttribute('data-name') : 'Student';
          const caseCategory = document.getElementById('soap-category').value;
          const subjective = document.getElementById('soap-s').value.trim();
          const objective = document.getElementById('soap-o').value.trim();
          const assessment = document.getElementById('soap-a').value.trim();
          const plan = document.getElementById('soap-p').value.trim();

          if (!subjective || !assessment || !plan) {
            Toast.warning('Validation', 'Please provide Subjective, Assessment, and Plan observations.');
            return;
          }

          try {
            await ApiClient.createSessionNote({
              studentId,
              studentName,
              counselorId: user ? user.id : 'usr-cns-1',
              counselorName: user ? user.name : 'Maria Santos',
              caseCategory,
              subjective,
              objective: objective || 'Client was cooperative and attentive during the consultation.',
              assessment,
              plan,
              sessionDate: new Date().toISOString().split('T')[0],
              status: 'Confidential'
            });

            Modal.close();
            Toast.success('Note Recorded', 'SOAP clinical note saved to confidential storage.');
            setTimeout(() => window.location.reload(), 600);
          } catch (err) {
            Toast.error('Error', err.message);
          }
        });
      });
    }
  },

  /* ── Follow-Up Tracker Logic ── */
  async initFollowUps() {
    Portal.init('counselor');
    const appointments = await ApiClient.getAppointments();
    let followUps = appointments.filter(a => a.urgency === 'Urgent' || a.status === 'Approved');
    const tbody = document.getElementById('counselor-followups-tbody');
    if (!tbody) return;

    // Load custom reminders stored in local storage
    const customReminders = StorageService.getItem('bcc_followup_reminders', []);
    const allReminders = [...customReminders, ...followUps];

    const render = () => {
      if (allReminders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 2.5rem; color: var(--slate-400);">No active student follow-up reminders.</td></tr>`;
        return;
      }
      tbody.innerHTML = allReminders.map((a, idx) => `
        <tr>
          <td><strong style="font-family: var(--font-mono); color: var(--bcc-brand);">${a.referenceCode || `REM-${1000 + idx}`}</strong></td>
          <td><strong>${a.studentName}</strong></td>
          <td>${a.serviceTitle || a.focus || 'Progress Check-In'}</td>
          <td><span class="badge badge-${(a.urgency === 'Urgent' || a.priority === 'High') ? 'cancelled' : 'brand'}">${a.urgency || a.priority || 'Routine'}</span></td>
          <td>${a.date || a.dueDate}</td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="Toast.success('Notification Dispatched', 'Follow-up alert sent to student email.')">Send Alert</button>
          </td>
        </tr>
      `).join('');
    };

    render();

    const addBtn = document.getElementById('btn-add-followup');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const content = `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div class="form-group">
              <label class="form-label required">Student Name</label>
              <input type="text" id="rem-student-name" class="form-input" placeholder="e.g. Juan Dela Cruz" required>
            </div>
            <div class="form-group">
              <label class="form-label required">Focus / Purpose</label>
              <input type="text" id="rem-focus" class="form-input" placeholder="e.g. Midterm academic progress and coping check-in" required>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label required">Target Due Date</label>
                <input type="date" id="rem-date" class="form-input" value="${new Date().toISOString().split('T')[0]}" required>
              </div>
              <div class="form-group">
                <label class="form-label required">Priority Level</label>
                <select id="rem-priority" class="form-select">
                  <option value="Routine">Routine</option>
                  <option value="High">High / Urgent</option>
                </select>
              </div>
            </div>
          </div>
        `;

        const modal = Modal.open({
          title: '📅 Add Follow-Up Reminder',
          size: 'modal-md',
          content,
          footer: `
            <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
            <button class="btn btn-primary" id="btn-save-rem-modal">Schedule Reminder</button>
          `
        });

        modal.querySelector('#btn-save-rem-modal').addEventListener('click', () => {
          const studentName = document.getElementById('rem-student-name').value.trim();
          const focus = document.getElementById('rem-focus').value.trim();
          const dueDate = document.getElementById('rem-date').value;
          const priority = document.getElementById('rem-priority').value;

          if (!studentName || !focus) {
            Toast.warning('Validation', 'Please provide student name and focus.');
            return;
          }

          const newRem = {
            referenceCode: `REM-${Date.now().toString().slice(-4)}`,
            studentName,
            serviceTitle: focus,
            dueDate,
            date: dueDate,
            priority,
            urgency: priority === 'High' ? 'Urgent' : 'Routine'
          };

          customReminders.unshift(newRem);
          StorageService.setItem('bcc_followup_reminders', customReminders);
          allReminders.unshift(newRem);

          Modal.close();
          Toast.success('Reminder Added', `Scheduled follow-up for ${studentName}.`);
          render();
        });
      });
    }
  },

  /* ── Reports Logic ── */
  initReports() {
    Portal.init('counselor');
  }
};
