/**
 * BCC Guidance Appointment System - Modal & Dialog Component
 *
 * Callers pass trusted markup in `content`/`footer`; any user or server text inside it must
 * already be escaped with esc().
 */

const Modal = {
  activeModal: null,
  _escHandler: null,

  open(options = {}) {
    this.close(); // Close any currently open modal

    const { id = 'custom-modal', title = 'Modal', size = '', content = '', footer = '', onClose = null } = options;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = id;
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.innerHTML = `
      <div class="modal-dialog ${size}">
        <div class="modal-header">
          <div class="modal-title">${title}</div>
          <button type="button" class="modal-close-btn" aria-label="Close">${Icons.get('x')}</button>
        </div>
        <div class="modal-body">${content}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';

    const handleClose = () => {
      if (this.activeModal !== backdrop) return;
      this.close();
      if (typeof onClose === 'function') onClose();
    };
    backdrop.querySelector('.modal-close-btn').addEventListener('click', handleClose);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) handleClose(); });
    backdrop.querySelectorAll('[data-modal-close]').forEach(b => b.addEventListener('click', handleClose));

    this._escHandler = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', this._escHandler);

    requestAnimationFrame(() => backdrop.classList.add('open'));
    this.activeModal = backdrop;

    const focusTarget = backdrop.querySelector('input:not([type=hidden]), textarea, select') || backdrop.querySelector('.modal-close-btn');
    setTimeout(() => focusTarget && focusTarget.focus(), 50);
    return backdrop;
  },

  close() {
    // Capture the element now: if another modal opens before the timer fires, only this one is removed
    const el = this.activeModal;
    if (!el) return;
    this.activeModal = null;
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }
    el.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => el.remove(), 250);
  },

  /**
   * Confirmation dialog. With `input`, the dialog shows a text box and passes its value to onConfirm:
   *   input: { label, placeholder, minLength, multiline }
   * onConfirm may be async; the button stays disabled while it runs and the dialog closes when it resolves.
   */
  confirm(options = {}) {
    const {
      title = 'Confirm',
      message = 'Are you sure?',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      danger = false,
      input = null,
      onConfirm = () => {}
    } = options;

    const iconBg = danger ? '#fee2e2' : '#ecfdf5';
    const iconColor = danger ? '#dc2626' : '#059669';
    const inputHtml = input ? `
      <div class="form-group" style="margin-top: 1rem; margin-bottom: 0;">
        <label class="form-label ${input.minLength ? 'required' : ''}" for="modal-confirm-input">${esc(input.label || 'Reason')}</label>
        ${input.multiline !== false
          ? `<textarea id="modal-confirm-input" class="form-textarea" style="min-height: 80px;" placeholder="${esc(input.placeholder || '')}" maxlength="500"></textarea>`
          : `<input id="modal-confirm-input" class="form-input" placeholder="${esc(input.placeholder || '')}" maxlength="500">`}
      </div>` : '';

    const modal = this.open({
      title: esc(title),
      size: input ? 'modal-md' : 'modal-sm',
      content: `
        <div style="display: flex; gap: 1rem; align-items: flex-start;">
          <div style="width: 42px; height: 42px; border-radius: 10px; background: ${iconBg}; color: ${iconColor}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            ${Icons.get(danger ? 'alert-triangle' : 'help-circle')}
          </div>
          <p style="color: var(--slate-700); font-size: 0.95rem; line-height: 1.5; margin: 0; flex: 1;">${esc(message)}</p>
        </div>
        ${inputHtml}
      `,
      footer: `
        <button type="button" class="btn btn-secondary" data-modal-close>${esc(cancelText)}</button>
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm-ok">${esc(confirmText)}</button>
      `
    });

    const okBtn = modal.querySelector('#modal-confirm-ok');
    okBtn.addEventListener('click', async () => {
      let value;
      if (input) {
        value = modal.querySelector('#modal-confirm-input').value.trim();
        if (input.minLength && value.length < input.minLength) {
          Toast.warning('More detail needed', `Please write at least ${input.minLength} characters.`);
          return;
        }
      }
      okBtn.disabled = true;
      try {
        await onConfirm(value);
        if (this.activeModal === modal) this.close();
      } catch (err) {
        Toast.error('Something went wrong', err.message);
        okBtn.disabled = false;
      }
    });
    return modal;
  },

  qrSvg(text) {
    if (typeof qrcode === 'undefined') {
      return `<div style="width: 120px; padding: 1rem; font-size: 11px; color: var(--slate-500); text-align: center; border: 1px dashed var(--border); border-radius: 6px;">QR code unavailable. Show the reference number instead.</div>`;
    }
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: 3, margin: 2, scalable: true, alt: 'Appointment QR code' })
      .replace('<svg ', '<svg style="width: 120px; height: 120px; background: #fff; border-radius: 6px;" ');
  },

  /** Official appointment pass slip with a scannable QR code of the reference number. */
  showAppointmentPass(apt) {
    const prefix = getPortalContext().prefix;
    const when = `${Utils.formatDate(apt.date, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })} at ${apt.timeSlot}`;
    const isActive = apt.status === 'Approved' || apt.status === 'Pending';
    const content = `
      <div class="apt-pass" id="printable-pass-content">
        <div class="apt-pass-head">
          <div class="pass-logos">
            <img src="${prefix}pictures/BCC_logo.png" alt="BCC Logo">
            <img src="${prefix}pictures/BSIT_logo.png" alt="BSIT Logo">
          </div>
          <div class="pass-school-info">
            <h3>Buenavista Community College</h3>
            <p>Center for Student Development & Guidance Services</p>
            <p class="pass-type">APPOINTMENT PASS SLIP</p>
          </div>
          <div class="pass-verified">${apt.status === 'Approved' ? 'APPROVED' : esc(apt.status.toUpperCase())}</div>
        </div>

        ${apt.status === 'Pending' ? `<div class="alert alert-warning" style="margin: 0.75rem 0 0;">Waiting for counselor approval. This slip becomes valid once the appointment is approved.</div>` : ''}
        ${!isActive ? `<div class="alert alert-danger" style="margin: 0.75rem 0 0;">This appointment is ${esc(apt.status.toLowerCase())}. This slip is not valid for entry.</div>` : ''}

        <div class="pass-body">
          <div class="pass-fields">
            <div><div class="pass-field-label">Reference Number</div><div class="pass-field-value" style="color: var(--bcc-700); font-family: var(--font-mono);">${esc(apt.referenceCode)}</div></div>
            <div><div class="pass-field-label">Status</div><div class="pass-field-value">${Utils.statusBadge(apt.status)}</div></div>
            <div><div class="pass-field-label">Student Name</div><div class="pass-field-value">${esc(apt.studentName)}</div></div>
            <div><div class="pass-field-label">Student ID & Section</div><div class="pass-field-value">${esc(apt.studentNumber || '—')} ${apt.courseYear ? `(${esc(apt.courseYear)})` : ''}</div></div>
            <div><div class="pass-field-label">Guidance Service</div><div class="pass-field-value">${esc(apt.serviceTitle)}</div></div>
            <div><div class="pass-field-label">Counselor</div><div class="pass-field-value">${esc(apt.counselorName)}</div></div>
            <div><div class="pass-field-label">Date & Time</div><div class="pass-field-value" style="color: var(--bcc-700);">${esc(when)}</div></div>
            <div><div class="pass-field-label">How & Where</div><div class="pass-field-value">${esc(apt.modality)} — ${esc(apt.location || 'BCC Guidance Office')}</div></div>
          </div>
          <div class="pass-qr">
            ${this.qrSvg(apt.referenceCode)}
            <div class="pass-qr-code">${esc(apt.referenceCode)}</div>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">Show at the Guidance Office desk</div>
          </div>
        </div>

        <div class="pass-footer">
          <div><strong>Reminder:</strong> Please arrive 5–10 minutes early and present this slip at the BCC Guidance Office.</div>
          <div style="text-align: right;">
            <div>Generated ${esc(new Date().toLocaleDateString())}</div>
            <div style="font-size: 10px; color: var(--text-subtle);">Buenavista Community College • Bohol</div>
          </div>
        </div>
      </div>
    `;
    this.open({
      title: `${Icons.get('file-text')} Appointment Pass Slip`,
      size: 'modal-lg',
      content,
      footer: `
        <button type="button" class="btn btn-secondary" data-modal-close>Close</button>
        <button type="button" class="btn btn-primary" onclick="window.print()">${Icons.get('printer')} Print / Save as PDF</button>
      `
    });
  },

  /**
   * Appointment details. `actions` adds buttons to the footer:
   *   [{ label, className, onClick(apt) }]
   */
  showAppointmentDetails(apt, options = {}) {
    const actions = options.actions || [];
    const row = (label, value) => `
      <div style="background: var(--bg-muted); padding: 0.85rem 1rem; border-radius: var(--r-md); border: 1px solid var(--border-light); min-width: 0;">
        <span class="text-muted" style="display: block; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px;">${label}</span>
        <span style="font-weight: 700; color: var(--slate-900); overflow-wrap: anywhere;">${value}</span>
      </div>`;

    const content = `
      <div style="display: flex; flex-direction: column; gap: 1.1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; background: var(--bg-subtle); padding: 0.85rem 1.15rem; border-radius: var(--r-md); border: 1px solid var(--border-light);">
          <div>
            <div style="font-size: 10px; font-weight: 800; color: var(--slate-400); text-transform: uppercase;">Reference</div>
            <div style="font-family: var(--font-mono); font-size: 1.05rem; font-weight: 800; color: var(--bcc-brand);">${esc(apt.referenceCode)}</div>
          </div>
          ${Utils.statusBadge(apt.status)}
        </div>

        <div class="details-grid">
          ${row('Guidance Service', esc(apt.serviceTitle))}
          ${row('Counselor', esc(apt.counselorName))}
          ${row('Date & Time', `${esc(Utils.formatDate(apt.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }))} at ${esc(apt.timeSlot)}`)}
          ${row('How & Where', `${esc(apt.modality)}<br><span style="font-weight: 500; color: var(--slate-600);">${esc(apt.location || '')}</span>`)}
          ${row('Student', `${esc(apt.studentName)}${apt.studentNumber ? `<br><span style="font-weight: 500; color: var(--slate-600);">${esc(apt.studentNumber)} • ${esc(apt.courseYear)}</span>` : ''}`)}
          ${row('Urgency', esc(apt.urgency || 'Routine'))}
        </div>

        <div>
          <span class="text-muted" style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 0.4rem;">Reason for Consultation</span>
          <div style="background: var(--bg-muted); padding: 0.85rem 1rem; border-radius: var(--r-md); border: 1px solid var(--border); font-size: var(--text-sm); line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere;">${esc(apt.reason || 'No reason given.')}</div>
        </div>

        ${apt.status === 'Cancelled' && apt.cancellationReason ? `
          <div class="alert alert-danger" style="margin: 0;"><strong>Cancellation reason:</strong> ${esc(apt.cancellationReason)}</div>` : ''}
        ${apt.hasFeedback ? `
          <div class="alert alert-info" style="margin: 0;"><strong>Student feedback:</strong> ${'★'.repeat(apt.feedbackRating)}${'☆'.repeat(5 - apt.feedbackRating)} ${apt.feedbackComments ? `— “${esc(apt.feedbackComments)}”` : ''}</div>` : ''}

        <div style="font-size: 11px; color: var(--slate-400); line-height: 1.4; border-top: 1px solid var(--border-light); padding-top: 0.75rem;">
          🔒 Confidential record protected under RA 9258 (Guidance and Counseling Act) and RA 10173 (Data Privacy Act).
        </div>
      </div>
    `;

    const footer = `
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-modal-view-pass">${Icons.get('printer')} Pass Slip</button>
        <div class="flex gap-2" style="flex-wrap: wrap;">
          ${actions.map((a, i) => `<button type="button" class="btn btn-sm ${a.className || 'btn-primary'}" data-action-index="${i}">${esc(a.label)}</button>`).join('')}
          <button type="button" class="btn btn-secondary btn-sm" data-modal-close>Close</button>
        </div>
      </div>
    `;

    const modal = this.open({ title: `${Icons.get('calendar')} Appointment Details`, size: 'modal-lg', content, footer });
    modal.querySelector('#btn-modal-view-pass').addEventListener('click', () => this.showAppointmentPass(apt));
    modal.querySelectorAll('[data-action-index]').forEach(btn => {
      btn.addEventListener('click', () => actions[Number(btn.dataset.actionIndex)].onClick(apt));
    });
    return modal;
  }
};
