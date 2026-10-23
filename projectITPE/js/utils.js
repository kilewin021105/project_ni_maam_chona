/**
 * BCC Guidance Appointment System — Shared helpers
 */

/** Escapes text before it is placed inside HTML. Use for every value that came from a user or the server. */
function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const Utils = {
  /** Today's date as YYYY-MM-DD in the viewer's own timezone (toISOString would give the UTC date). */
  todayISO(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },

  /** Parses YYYY-MM-DD as a local date, and server timestamps ("2026-10-23 03:00:00" = UTC) correctly. */
  parseDate(value) {
    if (!value) return null;
    const s = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    const iso = s.includes('T') ? s : s.replace(' ', 'T');
    const withZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`;
    const d = new Date(withZone);
    return isNaN(d) ? null : d;
  },

  formatDate(value, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
    const d = this.parseDate(value);
    return d ? d.toLocaleDateString('en-US', opts) : '—';
  },

  formatDateTime(value) {
    const d = this.parseDate(value);
    return d ? d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
  },

  timeAgo(value) {
    const d = this.parseDate(value);
    if (!d) return '';
    const mins = Math.round((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
    return this.formatDate(value);
  },

  greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  },

  firstName(name) {
    const parts = String(name || '').replace(/^(Dr|Prof|Ms|Mr|Mrs|Director)\.?\s+/i, '').split(/[\s,]+/);
    return parts[0] || '';
  },

  statusBadge(status) {
    const s = esc(status || 'Pending');
    return `<span class="badge badge-${s.toLowerCase()}"><span class="badge-dot"></span> ${s}</span>`;
  },

  /** True when the appointment is still ahead of us (Pending/Approved and not in the past). */
  isUpcoming(apt) {
    return (apt.status === 'Pending' || apt.status === 'Approved') && apt.date >= this.todayISO();
  },

  /** Disables a button while an async action runs, so double clicks can't submit twice. */
  async withBusy(button, busyText, fn) {
    if (!button) return fn();
    const original = button.innerHTML;
    button.disabled = true;
    if (busyText) button.textContent = busyText;
    try {
      return await fn();
    } finally {
      button.disabled = false;
      button.innerHTML = original;
    }
  },

  /** Adds camelCase aliases so pages can use one naming style for server records. */
  normalizeUser(u) {
    if (!u) return u;
    return {
      ...u,
      avatarInitial: u.avatar_initial || (u.name || '?').charAt(0),
      studentId: u.student_id_number || '',
      yearSection: u.year_section || '',
      emergencyContact: u.emergency_contact || ''
    };
  },

  normalizeService(s) {
    if (!s) return s;
    const active = s.is_active === undefined ? true : Boolean(s.is_active);
    return { ...s, durationMinutes: Number(s.duration_minutes) || 45, isActive: active, is_active: active };
  },

  normalizeAnnouncement(a) {
    if (!a) return a;
    return { ...a, createdAt: a.created_at, targetAudience: a.target_audience || a.targetAudience || 'All', authorName: a.authorName || 'BCC Guidance Office' };
  },

  emptyRow(colspan, message) {
    return `<tr><td colspan="${colspan}" class="text-center" style="padding: 2.5rem; color: var(--slate-400);">${esc(message)}</td></tr>`;
  },

  loadingRow(colspan) {
    return this.emptyRow(colspan, 'Loading…');
  },

  errorRow(colspan, message) {
    return `<tr><td colspan="${colspan}" class="text-center" style="padding: 2.5rem; color: #b91c1c;">${esc(message || 'Could not load data.')}</td></tr>`;
  },

  setIcons(map) {
    Object.entries(map).forEach(([id, icon]) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = Icons.get(icon);
    });
  }
};

/** Small rendering helpers shared by counselor and admin report pages. */
const Reports = {
  renderCards(id, cards) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = cards.map(([label, value, sub]) => `
      <div class="card text-center">
        <div class="report-number">${esc(value)}</div>
        <div class="text-xs text-muted">${esc(label)}</div>
        ${sub ? `<div class="text-xs" style="color: var(--slate-400); margin-top: 2px;">${esc(sub)}</div>` : ''}
      </div>`).join('');
  },

  renderTable(id, rows, rowHtml, colspan, emptyText) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = rows.length ? rows.map(r => `<tr>${rowHtml(r)}</tr>`).join('') : Utils.emptyRow(colspan, emptyText);
  },

  renderMonthly(id, months) {
    const el = document.getElementById(id);
    if (!el) return;
    const max = Math.max(1, ...months.map(m => m.count));
    el.innerHTML = `
      <div class="month-bars" role="img" aria-label="${esc(months.map(m => `${m.label}: ${m.count}`).join(', '))}">
        ${months.map(m => `
          <div class="month-bar">
            <div class="month-bar-value">${m.count}</div>
            <div class="month-bar-track"><div class="month-bar-fill" style="height: ${Math.round((m.count / max) * 100)}%;"></div></div>
            <div class="month-bar-label">${esc(m.label.split(' ')[0])}</div>
          </div>`).join('')}
      </div>`;
  }
};
