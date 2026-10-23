/**
 * BCC Guidance Appointment System - Toast Notification Manager
 */

const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      this.container.setAttribute('aria-live', 'polite');
      document.body.appendChild(this.container);
    }
  },

  show(title, message = '', type = 'info', duration = 4000) {
    this.init();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

    const iconName = { success: 'check-circle', error: 'alert-circle', warning: 'alert-triangle' }[type] || 'info';
    toast.innerHTML = `
      <div class="toast-icon">${Icons.get(iconName)}</div>
      <div class="toast-content">
        <div class="toast-title">${esc(title)}</div>
        ${message ? `<div class="toast-message">${esc(message)}</div>` : ''}
      </div>
      <button type="button" class="toast-close" aria-label="Close notification">${Icons.get('x')}</button>
    `;

    const dismiss = () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    };
    toast.querySelector('.toast-close').addEventListener('click', dismiss);

    this.container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    if (duration > 0) setTimeout(dismiss, duration);
    return toast;
  },

  success(title, message) { return this.show(title, message, 'success'); },
  error(title, message) { return this.show(title, message, 'error', 6000); },
  warning(title, message) { return this.show(title, message, 'warning', 5000); },
  info(title, message) { return this.show(title, message, 'info'); }
};
