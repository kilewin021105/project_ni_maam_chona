/**
 * BCC Guidance Appointment System - Interactive Calendar Component
 */

const CalendarComponent = {
  currentDate: new Date(),

  /**
   * Renders a month grid with appointment pills.
   * options.compact shows a dot count instead of names (for small widgets).
   */
  render(containerId, appointments = [], onSelectAppointment = null, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const monthName = this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const todayStr = Utils.todayISO();

    let html = `
      <div class="calendar-widget">
        <div class="calendar-header">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <h3 style="font-size: 1.05rem; color: var(--slate-900); font-weight: 700;">${esc(monthName)}</h3>
            <button type="button" class="btn btn-secondary btn-sm" data-cal="today">Today</button>
          </div>
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <button type="button" class="icon-button" data-cal="prev" aria-label="Previous month">${Icons.get('chevronLeft')}</button>
            <button type="button" class="icon-button" data-cal="next" aria-label="Next month">${Icons.get('chevronRight')}</button>
          </div>
        </div>
        <div class="calendar-month-grid ${options.compact ? 'compact' : ''}">
          ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="calendar-weekday">${d}</div>`).join('')}
    `;

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      html += `<div class="calendar-day-cell other-month"><div class="day-number">${prevMonthDays - i}</div></div>`;
    }

    for (let day = 1; day <= totalDays; day++) {
      const cellDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayApts = appointments.filter(a => a.date === cellDate && a.status !== 'Cancelled');
      const pills = options.compact
        ? (dayApts.length ? `<div class="calendar-event-pill approved" title="${dayApts.length} appointment(s)">${dayApts.length}</div>` : '')
        : dayApts.map(apt => `
            <div class="calendar-event-pill ${esc(apt.status.toLowerCase())}" data-apt-id="${esc(apt.id)}" role="button" tabindex="0"
                 title="${esc(`${apt.timeSlot} – ${apt.studentName} (${apt.serviceTitle})`)}">
              ${esc(apt.timeSlot)} ${esc(Utils.firstName(apt.studentName))}
            </div>`).join('');
      html += `
        <div class="calendar-day-cell ${cellDate === todayStr ? 'today' : ''}" data-date="${cellDate}">
          <div class="day-number">${day}</div>
          <div class="calendar-events-wrap">${pills}</div>
        </div>`;
    }

    const trailing = (7 - ((firstDayIndex + totalDays) % 7)) % 7;
    for (let d = 1; d <= trailing; d++) {
      html += `<div class="calendar-day-cell other-month"><div class="day-number">${d}</div></div>`;
    }
    container.innerHTML = html + '</div></div>';

    const rerender = () => this.render(containerId, appointments, onSelectAppointment, options);
    container.querySelector('[data-cal="prev"]').addEventListener('click', () => { this.currentDate.setMonth(this.currentDate.getMonth() - 1, 1); rerender(); });
    container.querySelector('[data-cal="next"]').addEventListener('click', () => { this.currentDate.setMonth(this.currentDate.getMonth() + 1, 1); rerender(); });
    container.querySelector('[data-cal="today"]').addEventListener('click', () => { this.currentDate = new Date(); rerender(); });

    if (typeof onSelectAppointment === 'function') {
      container.querySelectorAll('.calendar-event-pill[data-apt-id]').forEach(pill => {
        const open = (e) => {
          e.stopPropagation();
          const apt = appointments.find(a => a.id === pill.dataset.aptId);
          if (apt) onSelectAppointment(apt);
        };
        pill.addEventListener('click', open);
        pill.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(e); });
      });
    }
  }
};

const Calendar = CalendarComponent;
