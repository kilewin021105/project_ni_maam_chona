/**
 * Buenavista Community College — Guidance Appointment System
 * Public Homepage & Authentication (Login / Sign Up) Controller
 */

const AuthView = {
  async render() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    const announcements = await ApiClient.getAnnouncements();

    mainContent.innerHTML = `
      <div class="pub-page fade-in">
        
        <!-- Public Navigation Header Bar -->
        <header class="pub-header">
          <div class="pub-header-inner">
            <a href="#" class="pub-brand" onclick="window.scrollTo({top:0, behavior:'smooth'})">
              <img src="pictures/BCC_logo.png" alt="BCC Logo">
              <div class="pub-brand-text">
                <h1>BUENAVISTA COMMUNITY COLLEGE</h1>
                <p>Guidance Services</p>
              </div>
            </a>

            <nav>
              <ul class="pub-nav-menu">
                <li class="pub-nav-item"><a href="#sec-hero">Home</a></li>
                <li class="pub-nav-item"><a href="#sec-services-block">Services</a></li>
                <li class="pub-nav-item"><a href="#sec-quick-access">Appointments</a></li>
                <li class="pub-nav-item"><a href="#sec-announcements-block">About</a></li>
                <li class="pub-nav-item"><a href="#sec-footer">Contact</a></li>
              </ul>
            </nav>

            <div class="flex gap-2">
              <button class="btn btn-outline btn-sm" id="pub-btn-signup-modal">
                Sign Up
              </button>
              <button class="btn btn-primary btn-sm" id="pub-btn-login-modal">
                ${Icons.get('logOut')} Login
              </button>
            </div>
          </div>
        </header>

        <!-- Hero Banner Section -->
        <section class="copycat-hero" id="sec-hero">
          <div class="copycat-hero-inner">
            <div>
              <div class="hero-subtag">Your Future Matters</div>
              <h2 class="hero-headline">Guidance Services for a Brighter Tomorrow</h2>
              <p class="hero-desc">
                BUENAVISTA COMMUNITY COLLEGE provides a supportive and professional guidance system to help you achieve your academic, personal, and career goals.
              </p>

              <div class="hero-buttons">
                <button class="btn btn-primary btn-lg" id="btn-hero-book-now">
                  Book an Appointment
                </button>
                <button class="btn btn-secondary btn-lg" id="btn-hero-signup">
                  Register Student Account
                </button>
              </div>
            </div>

            <div>
              <img src="pictures/background.jpg" alt="Buenavista Community College Campus" class="hero-campus-img">
            </div>
          </div>
        </section>

        <!-- 4 Feature Cards Under Hero -->
        <div class="features-row">
          <div class="feature-box">
            <div class="feature-icon">${Icons.get('user')}</div>
            <h4 class="feature-title">Counseling Services</h4>
            <p class="feature-desc">Get personal and academic support from our certified counselors.</p>
          </div>

          <div class="feature-box">
            <div class="feature-icon">${Icons.get('clipboard')}</div>
            <h4 class="feature-title">Career Guidance</h4>
            <p class="feature-desc">Explore your interests and plan your future career.</p>
          </div>

          <div class="feature-box">
            <div class="feature-icon">${Icons.get('book-open')}</div>
            <h4 class="feature-title">Academic Support</h4>
            <p class="feature-desc">Receive help with academic challenges and course planning.</p>
          </div>

          <div class="feature-box">
            <div class="feature-icon">${Icons.get('heart')}</div>
            <h4 class="feature-title">Personal Development</h4>
            <p class="feature-desc">Build confidence and well-being for a better you.</p>
          </div>
        </div>

        <!-- Guidance Services Showcase Block -->
        <section class="services-feature-block" id="sec-services-block">
          <div>
            <img src="pictures/background.jpg" alt="Students Studying" class="services-student-img">
          </div>

          <div>
            <h3 style="font-size: var(--text-2xl); font-weight: 800; margin-bottom: 0.75rem;">Guidance Services</h3>
            <p style="font-size: var(--text-base); color: var(--slate-600); margin-bottom: 1.5rem; line-height: 1.6;">
              We are here to support you in every step of your college journey. Our guidance services are designed to help you make informed decisions and achieve your goals.
            </p>
            <button class="btn btn-primary" id="btn-view-all-services">
              View All Services
            </button>
          </div>
        </section>

        <!-- Announcements & Quick Access Split -->
        <section class="split-bottom-block" id="sec-announcements-block">
          <div>
            <div class="flex items-center justify-between" style="margin-bottom: 1.25rem;">
              <h3 style="font-size: var(--text-xl); font-weight: 800;">Latest Announcements</h3>
              <a href="#" id="btn-view-all-announcements" style="font-size: var(--text-xs); font-weight: 700;">View All &rarr;</a>
            </div>

            <div class="announcement-list-item">
              <div class="ann-date-chip">
                <div class="day">28</div>
                <div class="month">Aug</div>
              </div>
              <div>
                <h4 style="font-size: var(--text-sm); font-weight: 700;">Guidance Office Advisory</h4>
                <p style="font-size: var(--text-xs); color: var(--slate-500);">The Guidance Office will be closed on August 28, 2026 for staff development.</p>
              </div>
            </div>

            <div class="announcement-list-item">
              <div class="ann-date-chip">
                <div class="day">20</div>
                <div class="month">Aug</div>
              </div>
              <div>
                <h4 style="font-size: var(--text-sm); font-weight: 700;">Career Orientation Seminar</h4>
                <p style="font-size: var(--text-xs); color: var(--slate-500);">Join us for the upcoming Career Orientation Seminar on August 20, 2026 at BCC Auditorium.</p>
              </div>
            </div>

            <div class="announcement-list-item">
              <div class="ann-date-chip">
                <div class="day">15</div>
                <div class="month">Aug</div>
              </div>
              <div>
                <h4 style="font-size: var(--text-sm); font-weight: 700;">Mental Health Awareness</h4>
                <p style="font-size: var(--text-xs); color: var(--slate-500);">Let's support mental health. Free counseling is available for all BCC students.</p>
              </div>
            </div>
          </div>

          <div id="sec-quick-access">
            <h3 style="font-size: var(--text-xl); font-weight: 800; margin-bottom: 1.25rem;">Quick Access</h3>
            
            <div class="quick-access-grid">
              <div class="quick-access-item" id="qa-book">
                ${Icons.get('calendar')}
                <span>Book Appointment</span>
              </div>

              <div class="quick-access-item" id="qa-status">
                ${Icons.get('check-circle')}
                <span>Check Appointment Status</span>
              </div>

              <div class="quick-access-item" id="qa-services">
                ${Icons.get('book-open')}
                <span>Guidance Services</span>
              </div>

              <div class="quick-access-item" id="qa-counselors">
                ${Icons.get('users')}
                <span>Our Counselors</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Copycat Dark Footer -->
        <footer class="copycat-footer" id="sec-footer">
          <div class="copycat-footer-inner">
            <div>
              <div class="footer-logo-title">
                <img src="pictures/BCC_logo.png" alt="BCC Logo">
                <h3>BUENAVISTA COMMUNITY COLLEGE</h3>
              </div>
              <p style="font-size: var(--text-xs); color: var(--slate-300); margin-top: 0.5rem;">
                Building better futures, together.
              </p>
            </div>

            <div>
              <div class="footer-col-title">Quick Links</div>
              <ul class="footer-links">
                <li><a href="#sec-hero">Home</a></li>
                <li><a href="#sec-services-block">Services</a></li>
                <li><a href="#sec-quick-access">Appointments</a></li>
                <li><a href="#sec-announcements-block">About Us</a></li>
                <li><a href="#sec-footer">Contact</a></li>
              </ul>
            </div>

            <div>
              <div class="footer-col-title">Contact Us</div>
              <p style="font-size: var(--text-xs); margin-bottom: 0.35rem;">📞 (038) 510-1234</p>
              <p style="font-size: var(--text-xs); margin-bottom: 0.35rem;">✉️ guidance@buenavista.edu.ph</p>
              <p style="font-size: var(--text-xs);">📍 Buenavista Community College, Buenavista, Bohol</p>
            </div>

            <div>
              <div class="footer-col-title">Follow Us</div>
              <div class="flex gap-2" style="font-size: 1.2rem; color: #fff;">
                <span>🌐</span> <span>📘</span> <span>📸</span> <span>📺</span>
              </div>
            </div>
          </div>

          <div class="footer-bottom-bar">
            <div>&copy; 2026 Buenavista Community College. All rights reserved.</div>
            <div>Center for Student Development & Guidance Services</div>
          </div>
        </footer>

      </div>
    `;

    this.attachEvents();
  },

  attachEvents() {
    // Header Login & Sign Up buttons
    const loginBtn = document.getElementById('pub-btn-login-modal');
    if (loginBtn) loginBtn.addEventListener('click', () => this.openAuthModal('login'));

    const signupBtn = document.getElementById('pub-btn-signup-modal');
    if (signupBtn) signupBtn.addEventListener('click', () => this.openAuthModal('signup'));

    const heroSignup = document.getElementById('btn-hero-signup');
    if (heroSignup) heroSignup.addEventListener('click', () => this.openAuthModal('signup'));

    // Hero Book Now button
    const bookBtn = document.getElementById('btn-hero-book-now');
    if (bookBtn) {
      bookBtn.addEventListener('click', async () => {
        await ApiClient.login('juan.delacruz@buenavista.edu.ph', 'password123');
        App.navigateToRole('student');
        App.navigateTo('student', 'book');
      });
    }

    // Learn More button
    const learnBtn = document.getElementById('btn-hero-learn-more');
    if (learnBtn) {
      learnBtn.addEventListener('click', () => {
        const sec = document.getElementById('sec-services-block');
        if (sec) sec.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // View All Services
    const viewSrv = document.getElementById('btn-view-all-services');
    if (viewSrv) {
      viewSrv.addEventListener('click', async () => {
        await ApiClient.login('juan.delacruz@buenavista.edu.ph', 'password123');
        App.navigateToRole('student');
        App.navigateTo('student', 'services');
      });
    }

    // Quick Access items
    const qaBook = document.getElementById('qa-book');
    if (qaBook) {
      qaBook.addEventListener('click', async () => {
        await ApiClient.login('juan.delacruz@buenavista.edu.ph', 'password123');
        App.navigateToRole('student');
        App.navigateTo('student', 'book');
      });
    }

    const qaStatus = document.getElementById('qa-status');
    if (qaStatus) {
      qaStatus.addEventListener('click', async () => {
        await ApiClient.login('juan.delacruz@buenavista.edu.ph', 'password123');
        App.navigateToRole('student');
        App.navigateTo('student', 'appointments');
      });
    }

    const qaServices = document.getElementById('qa-services');
    if (qaServices) {
      qaServices.addEventListener('click', async () => {
        await ApiClient.login('juan.delacruz@buenavista.edu.ph', 'password123');
        App.navigateToRole('student');
        App.navigateTo('student', 'services');
      });
    }

    const qaCounselors = document.getElementById('qa-counselors');
    if (qaCounselors) {
      qaCounselors.addEventListener('click', async () => {
        await ApiClient.login('juan.delacruz@buenavista.edu.ph', 'password123');
        App.navigateToRole('student');
        App.navigateTo('student', 'book');
      });
    }
  },

  /* --------------------------------------------------------------------------
     Unified Authentication Modal (Login & Sign Up Tabs)
     -------------------------------------------------------------------------- */
  openAuthModal(initialTab = 'login') {
    const content = `
      <div style="padding: 0.25rem;">
        <div class="text-center" style="margin-bottom: 1.25rem;">
          <img src="pictures/BCC_logo.png" style="width: 48px; height: 48px; margin: 0 auto 0.4rem; display: block;">
          <h3 style="font-size: var(--text-xl); font-weight: 800;">BUENAVISTA COMMUNITY COLLEGE</h3>
          <p class="text-muted text-xs">Center for Student Development & Guidance Services</p>
        </div>

        <!-- Tabbed Switcher: Login / Sign Up -->
        <div style="display: flex; background: var(--bg-muted); border-radius: var(--r-md); padding: 3px; margin-bottom: 1.25rem;">
          <button class="btn btn-sm ${initialTab === 'login' ? 'btn-primary' : 'btn-secondary'}" id="auth-tab-login" style="flex: 1;">
            ${Icons.get('logOut')} Sign In
          </button>
          <button class="btn btn-sm ${initialTab === 'signup' ? 'btn-primary' : 'btn-secondary'}" id="auth-tab-signup" style="flex: 1;">
            ${Icons.get('user')} Student Sign Up
          </button>
        </div>

        <!-- LOGIN FORM CONTAINER -->
        <div id="auth-form-container-login" style="display: ${initialTab === 'login' ? 'block' : 'none'};">
          <div style="background: var(--bcc-subtle); border: 1px solid var(--bcc-brand); padding: 0.75rem; border-radius: var(--r-md); margin-bottom: 1.25rem;">
            <div style="font-size: 11px; font-weight: 800; color: var(--bcc-dark); margin-bottom: 0.4rem; text-transform: uppercase;">
              Quick 1-Click Role Switch:
            </div>
            <div class="flex gap-2 flex-wrap">
              <button type="button" class="demo-chip student" data-email="juan.delacruz@buenavista.edu.ph">Student Demo</button>
              <button type="button" class="demo-chip counselor" data-email="msantos.guidance@buenavista.edu.ph">Counselor Demo</button>
              <button type="button" class="demo-chip admin" data-email="admin.guidance@buenavista.edu.ph">Admin Demo</button>
            </div>
          </div>

          <form id="auth-login-form">
            <div class="form-group">
              <label class="form-label required" for="auth-login-email">BCC Email Address</label>
              <input type="email" id="auth-login-email" class="form-input" placeholder="e.g. juan.delacruz@buenavista.edu.ph" required value="juan.delacruz@buenavista.edu.ph">
            </div>

            <div class="form-group">
              <label class="form-label required" for="auth-login-password">Password</label>
              <input type="password" id="auth-login-password" class="form-input" placeholder="Enter password" required value="password123">
            </div>

            <div class="flex items-center justify-between" style="font-size: var(--text-xs); margin-bottom: 1rem;">
              <label class="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked> Remember me
              </label>
              <a href="#" id="auth-forgot-password" class="text-brand font-bold">Forgot Password?</a>
            </div>

            <button type="submit" class="btn btn-primary btn-lg w-full">
              ${Icons.get('logOut')} Sign In to Guidance Portal
            </button>
          </form>
        </div>

        <!-- SIGN UP FORM CONTAINER -->
        <div id="auth-form-container-signup" style="display: ${initialTab === 'signup' ? 'block' : 'none'};">
          <form id="auth-signup-form">
            <div class="two-col">
              <div class="form-group">
                <label class="form-label required" for="su-name">Full Name</label>
                <input type="text" id="su-name" class="form-input" placeholder="e.g. Juan P. Dela Cruz" required>
              </div>

              <div class="form-group">
                <label class="form-label required" for="su-id">Student ID Number</label>
                <input type="text" id="su-id" class="form-input" placeholder="e.g. BCC-2024-01048" required>
              </div>
            </div>

            <div class="two-col">
              <div class="form-group">
                <label class="form-label required" for="su-course">Course / Program</label>
                <select id="su-course" class="form-select" required>
                  <option value="BSIT" selected>BS Information Technology (BSIT)</option>
                  <option value="BSCS">BS Computer Science (BSCS)</option>
                  <option value="BSBA">BS Business Administration (BSBA)</option>
                  <option value="BSED">Bachelor of Secondary Education (BSED)</option>
                  <option value="BEED">Bachelor of Elementary Education (BEED)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label required" for="su-year">Year & Section</label>
                <input type="text" id="su-year" class="form-input" placeholder="e.g. 3A" required>
              </div>
            </div>

            <div class="two-col">
              <div class="form-group">
                <label class="form-label required" for="su-email">BCC Email Address</label>
                <input type="email" id="su-email" class="form-input" placeholder="e.g. juan.delacruz@buenavista.edu.ph" required>
              </div>

              <div class="form-group">
                <label class="form-label required" for="su-phone">Contact Number</label>
                <input type="tel" id="su-phone" class="form-input" placeholder="e.g. 0917-123-4567" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label required" for="su-emergency">Emergency Contact (Name & Number)</label>
              <input type="text" id="su-emergency" class="form-input" placeholder="e.g. Maria Dela Cruz (Mother) - 0918-123-4567" required>
            </div>

            <div class="form-group">
              <label class="form-label required" for="su-password">Password</label>
              <input type="password" id="su-password" class="form-input" placeholder="Minimum 6 characters" minlength="6" required>
            </div>

            <div style="margin-top: 0.5rem; font-size: 11px; color: var(--slate-600); background: var(--bg-muted); padding: 0.65rem; border-radius: var(--r-sm);">
              <label class="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" id="su-privacy-check" required style="margin-top: 2px;">
                <span>I agree to the <strong>BCC Guidance Office Confidentiality & Data Privacy Policy</strong> (RA 10173).</span>
              </label>
            </div>

            <button type="submit" class="btn btn-primary btn-lg w-full" style="margin-top: 1rem;">
              ${Icons.get('user')} Create Student Account
            </button>
          </form>
        </div>
      </div>
    `;

    const modal = Modal.open({
      title: `${Icons.get('shield')} Authentication Portal`,
      size: 'modal-box',
      content,
      footer: `<button class="btn btn-secondary" onclick="Modal.close()">Close</button>`
    });

    // Tab Switcher Click Listeners
    const tabLogin = modal.querySelector('#auth-tab-login');
    const tabSignup = modal.querySelector('#auth-tab-signup');
    const cLogin = modal.querySelector('#auth-form-container-login');
    const cSignup = modal.querySelector('#auth-form-container-signup');

    if (tabLogin && tabSignup && cLogin && cSignup) {
      tabLogin.addEventListener('click', () => {
        tabLogin.className = 'btn btn-sm btn-primary';
        tabSignup.className = 'btn btn-sm btn-secondary';
        cLogin.style.display = 'block';
        cSignup.style.display = 'none';
      });

      tabSignup.addEventListener('click', () => {
        tabSignup.className = 'btn btn-sm btn-primary';
        tabLogin.className = 'btn btn-sm btn-secondary';
        cSignup.style.display = 'block';
        cLogin.style.display = 'none';
      });
    }

    // Login Form Submit
    const loginForm = modal.querySelector('#auth-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-login-email').value.trim();
        const password = document.getElementById('auth-login-password').value;

        try {
          const res = await ApiClient.login(email, password);
          Modal.close();
          Toast.success('Login Successful', `Welcome back, ${res.user.name}!`);
          setTimeout(() => {
            if (res.user.role === 'student') window.location.href = 'student/dashboard.html';
            else if (res.user.role === 'counselor') window.location.href = 'counselor/dashboard.html';
            else if (res.user.role === 'admin') window.location.href = 'admin/dashboard.html';
          }, 300);
        } catch (err) {
          Toast.error('Login Failed', err.message);
        }
      });
    }

    // Sign Up Form Submit
    const signupForm = modal.querySelector('#auth-signup-form');
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('su-name').value.trim();
        const studentId = document.getElementById('su-id').value.trim();
        const course = document.getElementById('su-course').value;
        const yearSection = document.getElementById('su-year').value.trim();
        const email = document.getElementById('su-email').value.trim();
        const phone = document.getElementById('su-phone').value.trim();
        const emergencyContact = document.getElementById('su-emergency').value.trim();
        const password = document.getElementById('su-password').value;

        if (!name || !studentId || !email || !password) {
          Toast.warning('Validation Error', 'Please complete all required fields.');
          return;
        }

        try {
          const newUser = await ApiClient.registerStudent({
            name,
            studentId,
            course,
            yearSection,
            email,
            phone,
            emergencyContact,
            password
          });

          Modal.close();
          Toast.success('Account Created', `Welcome to BCC Guidance, ${newUser.name}!`);
          StorageService.setCurrentUser(newUser);
          setTimeout(() => {
            window.location.href = 'student/dashboard.html';
          }, 300);
        } catch (err) {
          Toast.error('Registration Error', err.message);
        }
      });
    }

    // Demo Account Chips Click
    modal.querySelectorAll('.demo-chip').forEach(chip => {
      chip.addEventListener('click', async () => {
        const email = chip.getAttribute('data-email');
        try {
          const res = await ApiClient.login(email, 'password123');
          Modal.close();
          Toast.success('Role Switched', `Logged in as ${res.user.name}`);
          setTimeout(() => {
            if (res.user.role === 'student') window.location.href = 'student/dashboard.html';
            else if (res.user.role === 'counselor') window.location.href = 'counselor/dashboard.html';
            else if (res.user.role === 'admin') window.location.href = 'admin/dashboard.html';
          }, 300);
        } catch (err) {
          Toast.error('Error', err.message);
        }
      });
    });

    // Forgot Password Click
    const forgotBtn = modal.querySelector('#auth-forgot-password');
    if (forgotBtn) {
      forgotBtn.addEventListener('click', (e) => {
        e.preventDefault();
        Modal.close();
        Modal.open({
          title: `${Icons.get('shield')} Reset Password`,
          size: 'modal-box',
          content: `
            <p class="text-xs text-muted" style="margin-bottom: 1rem;">
              Enter your registered BCC institutional email address to receive password reset instructions.
            </p>
            <div class="form-group">
              <label class="form-label required">BCC Email Address</label>
              <input type="email" class="form-input" id="reset-email-val" placeholder="e.g. yourname@buenavista.edu.ph" required>
            </div>
          `,
          footer: `
            <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
            <button class="btn btn-primary" id="btn-dispatch-reset">Send Instructions</button>
          `
        });

        document.getElementById('btn-dispatch-reset').addEventListener('click', () => {
          const em = document.getElementById('reset-email-val').value.trim();
          if (!em) {
            Toast.warning('Validation Error', 'Please enter your email.');
            return;
          }
          Modal.close();
          Toast.success('Reset Email Dispatched', `Password reset link sent to ${em}`);
        });
      });
    }
  }
};
