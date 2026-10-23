/**
 * BCC Guidance Appointment System - Interactive Calendar Component
 */

const CalendarComponent = {
  currentDate: new Date(),

  render(containerId, appointments = [], onSelectAppointment = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const todayStr = new Date().toISOString().split('T')[0];

    // Build Header
    let html = `
      <div class="calendar-widget">
        <div class="calendar-header">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <h3 style="font-size: 1.1rem; color: var(--primary-900); font-weight: 700;">
              ${monthNames[month]} ${year}
            </h3>
            <button class="btn btn-secondary btn-sm" id="cal-btn-today">Today</button>
          </div>
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <button class="icon-button" id="cal-btn-prev" aria-label="Previous Month">${Icons.get('chevronLeft')}</button>
            <button class="icon-button" id="cal-btn-next" aria-label="Next Month">${Icons.get('chevronRight')}</button>
          </div>
        </div>

        <div class="calendar-month-grid">
          <div class="calendar-weekday">Sun</div>
          <div class="calendar-weekday">Mon</div>
          <div class="calendar-weekday">Tue</div>
          <div class="calendar-weekday">Wed</div>
          <div class="calendar-weekday">Thu</div>
          <div class="calendar-weekday">Fri</div>
          <div class="calendar-weekday">Sat</div>
    `;

    // Previous month empty/padded days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      html += `
        <div class="calendar-day-cell other-month">
          <div class="day-number">${d}</div>
        </div>
      `;
    }

    // Days of current month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const cellDateStr = `${year}-${monthStr}-${dayStr}`;

      const isToday = cellDateStr === todayStr;
      const dayAppointments = appointments.filter(a => a.date === cellDateStr && a.status !== 'Cancelled');

      let pillsHtml = '';
      dayAppointments.forEach(apt => {
        const statusClass = apt.status.toLowerCase();
        pillsHtml += `
          <div class="calendar-event-pill ${statusClass}" data-apt-id="${apt.id}" title="${apt.timeSlot} - ${apt.studentName} (${apt.serviceTitle})">
            ${apt.timeSlot} ${apt.studentName.split(' ')[0]}
          </div>
        `;
      });

      html += `
        <div class="calendar-day-cell ${isToday ? 'today' : ''}" data-date="${cellDateStr}">
          <div class="day-number">${day}</div>
          <div class="calendar-events-wrap">${pillsHtml}</div>
        </div>
      `;
    }

    // Remaining cells to fill grid row
    const totalRendered = firstDayIndex + totalDaysInMonth;
    const nextDaysCount = (7 - (totalRendered % 7)) % 7;
    for (let nextDay = 1; nextDay <= nextDaysCount; nextDay++) {
      html += `
        <div class="calendar-day-cell other-month">
          <div class="day-number">${nextDay}</div>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach calendar navigation events
    container.querySelector('#cal-btn-prev').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.render(containerId, appointments, onSelectAppointment);
    });

    container.querySelector('#cal-btn-next').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.render(containerId, appointments, onSelectAppointment);
    });

    container.querySelector('#cal-btn-today').addEventListener('click', () => {
      this.currentDate = new Date();
      this.render(containerId, appointments, onSelectAppointment);
    });

    // Event Pill clicks
    if (typeof onSelectAppointment === 'function') {
      container.querySelectorAll('.calendar-event-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
          e.stopPropagation();
          const aptId = pill.getAttribute('data-apt-id');
          const apt = appointments.find(a => a.id === aptId);
          if (apt) onSelectAppointment(apt);
        });
      });
    }
  },

  async renderFull(containerId) {
    let appointments = [];
    try {
      if (typeof ApiClient !== 'undefined') {
        appointments = await ApiClient.getAppointments();
      } else if (typeof StorageService !== 'undefined') {
        appointments = StorageService.getAppointments();
      }
    } catch (e) {
      console.warn('Calendar loading appointments error:', e);
    }
    this.render(containerId, appointments, (apt) => {
      if (typeof Modal !== 'undefined' && Modal.showAppointmentDetails) {
        Modal.showAppointmentDetails(apt);
      }
    });
  },

  async renderMini(containerId) {
    let appointments = [];
    try {
      if (typeof ApiClient !== 'undefined') {
        appointments = await ApiClient.getAppointments();
      } else if (typeof StorageService !== 'undefined') {
        appointments = StorageService.getAppointments();
      }
    } catch (e) {
      console.warn('Mini calendar error:', e);
    }
    this.render(containerId, appointments, (apt) => {
      if (typeof Modal !== 'undefined' && Modal.showAppointmentDetails) {
        Modal.showAppointmentDetails(apt);
      }
    });
  }
};

const Calendar = CalendarComponent;
window.Calendar = CalendarComponent;
window.CalendarComponent = CalendarComponent;
