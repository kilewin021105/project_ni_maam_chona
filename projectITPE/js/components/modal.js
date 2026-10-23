/**
 * BCC Guidance Appointment System - Modal & Dialog Component
 */

const Modal = {
  activeModal: null,

  open(options = {}) {
    this.close(); // Close any currently open modal

    const {
      id = 'custom-modal',
      title = 'Modal',
      size = '', // '', 'modal-lg', 'modal-xl'
      content = '',
      footer = '',
      onClose = null
    } = options;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = id;
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');

    backdrop.innerHTML = `
      <div class="modal-dialog ${size}">
        <div class="modal-header">
          <div class="modal-title">${title}</div>
          <button class="modal-close-btn" aria-label="Close modal">${Icons.get('x')}</button>
        </div>
        <div class="modal-body">${content}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';

    const closeBtn = backdrop.querySelector('.modal-close-btn');
    const handleClose = () => {
      this.close();
      if (typeof onClose === 'function') onClose();
    };

    closeBtn.addEventListener('click', handleClose);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) handleClose();
    });

    // Close on Escape key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        handleClose();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    requestAnimationFrame(() => {
      backdrop.classList.add('open');
    });

    this.activeModal = backdrop;
    return backdrop;
  },

  close() {
    if (this.activeModal) {
      this.activeModal.classList.remove('open');
      document.body.style.overflow = '';
      setTimeout(() => {
        if (this.activeModal && this.activeModal.parentNode) {
          this.activeModal.parentNode.removeChild(this.activeModal);
        }
        this.activeModal = null;
      }, 250);
    }
  },

  confirm(options = {}) {
    const {
      title = 'Confirm Action',
      message = 'Are you sure you want to proceed?',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      confirmType = 'btn-primary',
      onConfirm = () => {}
    } = options;

    const isDanger = confirmType.includes('btn-secondary') || 
                     confirmText.toLowerCase().includes('decline') || 
                     confirmText.toLowerCase().includes('cancel') || 
                     confirmText.toLowerCase().includes('deactivate') ||
                     confirmText.toLowerCase().includes('reject');

    const iconType = isDanger ? 'alert-triangle' : 'help-circle';
    const iconBg = isDanger ? '#fee2e2' : '#ecfdf5';
    const iconColor = isDanger ? '#dc2626' : '#059669';

    const content = `
      <div style="display: flex; gap: 1rem; align-items: flex-start; padding: 0.25rem 0;">
        <div style="width: 42px; height: 42px; border-radius: 10px; background: ${iconBg}; color: ${iconColor}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          ${Icons.get(iconType)}
        </div>
        <div style="flex: 1;">
          <p style="color: var(--slate-700); font-size: 0.95rem; line-height: 1.5; margin: 0;">${message}</p>
        </div>
      </div>
    `;
    const footer = `
      <button class="btn btn-secondary" id="modal-confirm-cancel">${cancelText}</button>
      <button class="btn ${confirmType}" id="modal-confirm-ok">${confirmText}</button>
    `;

    const modal = this.open({
      title,
      size: 'modal-sm',
      content,
      footer
    });

    modal.querySelector('#modal-confirm-cancel').addEventListener('click', () => {
      this.close();
    });

    modal.querySelector('#modal-confirm-ok').addEventListener('click', () => {
      this.close();
      onConfirm();
    });
  },

  /**
   * Generates and shows the official BCC Appointment Slip / Pass with QR Code
   */
  showAppointmentPass(appointment) {
    const isSubdir = window.location.pathname.includes('/student/') || 
                     window.location.pathname.includes('/counselor/') || 
                     window.location.pathname.includes('/admin/');
    const imgPrefix = isSubdir ? '../' : '';

    // Generate clean SVG QR code simulation
    const qrSvg = this.generateQrSvg(appointment.referenceCode);

    const content = `
      <div class="apt-pass" id="printable-pass-content">
        <div class="apt-pass-head">
          <div class="pass-logos">
            <img src="${imgPrefix}pictures/BCC_logo.png" alt="BCC Logo">
            <img src="${imgPrefix}pictures/BSIT_logo.png" alt="BSIT Logo">
          </div>
          <div class="pass-school-info">
            <h3>Buenavista Community College</h3>
            <p>Center for Student Development & Guidance Services</p>
            <p class="pass-type">OFFICIAL APPOINTMENT PASS / SLIP</p>
          </div>
          <div class="pass-verified">VERIFIED PASS</div>
        </div>

        <div class="pass-body">
          <div class="pass-fields">
            <div>
              <div class="pass-field-label">Reference Number</div>
              <div class="pass-field-value" style="color: var(--bcc-700); font-family: var(--font-mono);">${appointment.referenceCode}</div>
            </div>
            <div>
              <div class="pass-field-label">Appointment Status</div>
              <div class="pass-field-value">
                <span class="badge badge-${appointment.status.toLowerCase()}">
                  <span class="badge-dot"></span> ${appointment.status}
                </span>
              </div>
            </div>

            <div>
              <div class="pass-field-label">Student Name</div>
              <div class="pass-field-value">${appointment.studentName}</div>
            </div>
            <div>
              <div class="pass-field-label">Student ID & Section</div>
              <div class="pass-field-value">${appointment.studentNumber || 'BCC Student'} (${appointment.courseYear || 'BSIT'})</div>
            </div>

            <div>
              <div class="pass-field-label">Guidance Service</div>
              <div class="pass-field-value">${appointment.serviceTitle}</div>
            </div>
            <div>
              <div class="pass-field-label">Assigned Counselor</div>
              <div class="pass-field-value">${appointment.counselorName}</div>
            </div>

            <div>
              <div class="pass-field-label">Consultation Date & Time</div>
              <div class="pass-field-value" style="color: var(--bcc-700);">${new Date(appointment.date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })} at ${appointment.timeSlot}</div>
            </div>
            <div>
              <div class="pass-field-label">Modality & Venue</div>
              <div class="pass-field-value">${appointment.modality} (${appointment.location || 'BCC Guidance Office'})</div>
            </div>
          </div>

          <div class="pass-qr">
            ${qrSvg}
            <div class="pass-qr-code">${appointment.referenceCode}</div>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">Scan at Guidance Reception Desk upon arrival</div>
          </div>
        </div>

        ${appointment.counselorNotes ? `
          <div style="margin-top: 1rem; padding: 0.75rem; background: var(--bg-muted); border-radius: var(--r-md); font-size: var(--text-xs);">
            <strong>Counselor Instructions:</strong> ${appointment.counselorNotes}
          </div>
        ` : ''}

        <div class="pass-footer">
          <div>
            <strong>Reminders:</strong> Please arrive 5-10 minutes prior to your schedule. Present this pass at BCC Guidance Office.
          </div>
          <div style="text-align: right;">
            <div>Generated on: ${new Date().toLocaleDateString()}</div>
            <div style="font-size: 10px; color: var(--text-subtle);">Buenavista Community College &bull; Bohol</div>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="Modal.close()">${Icons.get('x')} Close</button>
      <button class="btn btn-primary" onclick="window.print()">${Icons.get('printer')} Print / Save as PDF</button>
    `;

    this.open({
      title: `${Icons.get('file-text')} Official Guidance Appointment Pass`,
      size: 'modal-lg',
      content,
      footer
    });
  },

  /**
   * Generates a crisp SVG barcode/QR pattern representation
   */
  generateQrSvg(code) {
    // Generate deterministic pattern from string
    let cells = '';
    const size = 15;
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      hash = (hash << 5) - hash + code.charCodeAt(i);
      hash |= 0;
    }

    // SVG QR Code generator
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        // Corner markers
        const isCorner = 
          (row < 4 && col < 4) || 
          (row < 4 && col >= size - 4) || 
          (row >= size - 4 && col < 4);
        
        let filled = false;
        if (isCorner) {
          filled = (row === 0 || row === 3 || col === 0 || col === 3 || (row >= size - 4 && (row === size - 4 || row === size - 1)) || (col >= size - 4 && (col === size - 4 || col === size - 1)));
        } else {
          filled = ((hash ^ (row * 31 + col * 17)) % 3 === 0);
        }

        if (filled) {
          cells += `<rect x="${col * 6 + 10}" y="${row * 6 + 10}" width="5.5" height="5.5" fill="#0f2b5c" rx="1" />`;
        }
      }
    }

    return `
      <svg viewBox="0 0 110 110" width="110" height="110" style="background: white; border-radius: 6px; padding: 4px;">
        ${cells}
      </svg>
    `;
  },

  /**
   * Generates and shows the complete Appointment Details modal
   */
  showAppointmentDetails(appointment, options = {}) {
    const isSubdir = window.location.pathname.includes('/student/') || 
                     window.location.pathname.includes('/counselor/') || 
                     window.location.pathname.includes('/admin/');
    const imgPrefix = isSubdir ? '../' : '';

    const content = `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        <!-- Top Reference & Status Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-subtle); padding: 0.85rem 1.15rem; border-radius: var(--r-md); border: 1px solid var(--border-light);">
          <div>
            <div style="font-size: 10px; font-weight: 800; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.05em;">Appointment Reference</div>
            <div style="font-family: var(--font-mono); font-size: 1.05rem; font-weight: 800; color: var(--bcc-brand); margin-top: 2px;">
              ${appointment.referenceCode}
            </div>
          </div>
          <div>
            <span class="badge badge-${appointment.status.toLowerCase()}" style="font-size: 12px; padding: 0.35rem 0.75rem;">
              <span class="badge-dot"></span> ${appointment.status}
            </span>
          </div>
        </div>

        <!-- Consultation Metadata Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: var(--text-sm);">
          <div style="background: var(--bg-muted); padding: 0.85rem 1rem; border-radius: var(--r-md); border: 1px solid var(--border-light);">
            <span class="text-muted" style="display: block; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px;">Guidance Service</span>
            <span style="font-weight: 800; color: var(--slate-900); font-size: 0.95rem;">${appointment.serviceTitle}</span>
          </div>

          <div style="background: var(--bg-muted); padding: 0.85rem 1rem; border-radius: var(--r-md); border: 1px solid var(--border-light);">
            <span class="text-muted" style="display: block; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px;">Guidance Counselor</span>
            <span style="font-weight: 800; color: var(--slate-900); font-size: 0.95rem;">${appointment.counselorName}</span>
          </div>

          <div style="background: var(--bg-muted); padding: 0.85rem 1rem; border-radius: var(--r-md); border: 1px solid var(--border-light);">
            <span class="text-muted" style="display: block; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px;">Schedule & Time</span>
            <span style="font-weight: 700; color: var(--slate-800);">📅 ${appointment.date} at ${appointment.timeSlot}</span>
          </div>

          <div style="background: var(--bg-muted); padding: 0.85rem 1rem; border-radius: var(--r-md); border: 1px solid var(--border-light);">
            <span class="text-muted" style="display: block; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px;">Modality & Location</span>
            <span style="font-weight: 700; color: var(--slate-800);">
              ${appointment.modality === 'In-Person' ? '🏢 In-Person (BCC Guidance Office)' : '💻 Online Video Consultation'}
            </span>
          </div>
        </div>

        ${appointment.studentName ? `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: var(--text-sm);">
            <div>
              <span class="text-muted" style="display: block; font-size: 10px; font-weight: 800; text-transform: uppercase;">Student Name</span>
              <span style="font-weight: 700; color: var(--slate-800);">${appointment.studentName}</span>
            </div>
            <div>
              <span class="text-muted" style="display: block; font-size: 10px; font-weight: 800; text-transform: uppercase;">Program & Section</span>
              <span style="font-weight: 700; color: var(--slate-800);">${appointment.courseYear || appointment.studentNumber || 'BSIT'}</span>
            </div>
          </div>
        ` : ''}

        ${appointment.meetingLink ? `
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: var(--r-md); padding: 0.75rem 1rem; font-size: var(--text-xs); display: flex; align-items: center; justify-content: space-between;">
            <div>
              <strong style="color: #065f46;">Virtual Video Room:</strong>
              <div style="color: var(--slate-600); margin-top: 2px;">Connect with your counselor via Google Meet</div>
            </div>
            <a href="${appointment.meetingLink}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">Join Video Meet &rarr;</a>
          </div>
        ` : ''}

        <!-- Consultation Purpose / Reason -->
        <div>
          <span class="text-muted" style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 0.4rem;">Reason for Consultation</span>
          <div style="background: var(--bg-muted); padding: 0.85rem 1rem; border-radius: var(--r-md); border: 1px solid var(--border); font-size: var(--text-sm); line-height: 1.5; color: var(--slate-800);">
            ${appointment.reason || 'No specific notes submitted for this consultation.'}
          </div>
        </div>

        <!-- Counselor Remarks / Instructions (if available) -->
        ${appointment.counselorNotes ? `
          <div>
            <span class="text-muted" style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 0.4rem;">Counselor Remarks & Instructions</span>
            <div style="background: #f0fdf4; padding: 0.85rem 1rem; border-radius: var(--r-md); border: 1px solid #bbf7d0; font-size: var(--text-sm); line-height: 1.5; color: #166534;">
              ${appointment.counselorNotes}
            </div>
          </div>
        ` : ''}

        <!-- Confidentiality Notice -->
        <div style="font-size: 11px; color: var(--slate-400); line-height: 1.4; border-top: 1px solid var(--border-light); padding-top: 0.75rem;">
          🔒 <strong>Official Confidential Record:</strong> Protected under the Philippine Guidance and Counseling Act of 2004 (RA 9258) and Data Privacy Act of 2012 (RA 10173).
        </div>
      </div>
    `;

    const footer = `
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
        <div>
          <button class="btn btn-primary btn-sm" id="btn-modal-view-pass">
            🖨️ View QR Pass Slip
          </button>
        </div>
        <div class="flex gap-2">
          ${appointment.status === 'Pending' || appointment.status === 'Approved' ? `
            <button class="btn btn-outline btn-sm" id="btn-modal-cancel-apt" style="color: #dc2626; border-color: #fca5a5;">
              Cancel Appointment
            </button>
          ` : ''}
          <button class="btn btn-secondary btn-sm" onclick="Modal.close()">Close</button>
        </div>
      </div>
    `;

    const modal = this.open({
      title: `${Icons.get('calendar')} Appointment Details`,
      size: 'modal-lg',
      content,
      footer
    });

    const passBtn = modal.querySelector('#btn-modal-view-pass');
    if (passBtn) {
      passBtn.addEventListener('click', () => {
        this.showAppointmentPass(appointment);
      });
    }

    const cancelBtn = modal.querySelector('#btn-modal-cancel-apt');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.confirm({
          title: 'Cancel Appointment Confirmation',
          message: 'Are you sure you want to cancel this scheduled appointment? This action cannot be undone.',
          confirmText: 'Yes, Cancel',
          confirmType: 'btn-secondary',
          onConfirm: async () => {
            try {
              await ApiClient.cancelAppointment(appointment.id, 'Student Request');
              Toast.success('Cancelled', 'Appointment has been cancelled.');
              setTimeout(() => window.location.reload(), 700);
            } catch (err) {
              Toast.error('Error', err.message);
            }
          }
        });
      });
    }
  }
};
