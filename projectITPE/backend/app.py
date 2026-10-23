import re
import datetime
import traceback
from collections import defaultdict
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.exceptions import HTTPException
from .config import Config, PROJECT_ROOT
from .auth import hash_password, check_password, generate_token, auth_required, get_optional_user, LoginThrottle
from .database import DBService

# ── Shared rules ──
ALL_SLOTS = ['8:30 AM', '9:15 AM', '10:00 AM', '10:45 AM', '1:00 PM', '1:45 PM', '2:30 PM', '3:15 PM', '4:00 PM']
MODALITIES = ['In-Person', 'Online (Google Meet)', 'Phone Call']
URGENCIES = ['Routine', 'Urgent', 'Crisis Intervention']
COURSES = ['BSIT', 'BSHM', 'BSTM', 'BSCRIM', 'BSED', 'BEED']
ROLES = ['student', 'counselor', 'admin']
AUDIENCES = ['All', 'Students', 'Counselors']
CASE_CATEGORIES = ['Academic Support', 'Career Advisory', 'Personal / Mental Health', 'Crisis Intervention', 'Peer Mediation', 'Psychological Assessment']
FOLLOWUP_STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled']
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')

# Files and folders the web server may hand to a browser. Everything else (database/, backend/,
# supabase/, tests/, .env, .jwt_secret, README) is never served.
PUBLIC_ROOT_FILES = {'index.html', 'login.html', 'signup.html'}
PUBLIC_DIRS = {'css', 'js', 'pictures', 'student', 'counselor', 'admin'}
PUBLIC_EXTENSIONS = {'.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.webp', '.gif', '.woff', '.woff2'}


# ── Small helpers ──

def body() -> dict:
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def text(data: dict, key: str, max_len: int = 255) -> str:
    value = data.get(key)
    if value is None:
        return ''
    return str(value).strip()[:max_len]


def error(message: str, status: int = 400):
    return jsonify({'error': message}), status


def clean_user(user: dict) -> dict:
    return {k: v for k, v in (user or {}).items() if k != 'password_hash'}


def me() -> dict:
    return request.current_user


def audit(action: str, details: str, user: dict = None):
    actor = user or getattr(request, 'current_user', None) or {}
    DBService.add_audit_log(actor.get('id'), actor.get('name', 'System'), action, details, request.remote_addr)


def parse_date(value):
    try:
        return datetime.datetime.strptime(str(value), '%Y-%m-%d').date()
    except (TypeError, ValueError):
        return None


def slot_datetime(date_value: datetime.date, slot: str) -> datetime.datetime:
    return datetime.datetime.combine(date_value, datetime.datetime.strptime(slot, '%I:%M %p').time())


def int_setting(settings: dict, key: str, default: int) -> int:
    try:
        return int(float(settings.get(key, default)))
    except (TypeError, ValueError):
        return default


def check_schedule(counselor: dict, date_str: str, slot: str, settings: dict, exclude_id: str = None,
                   enforce_lead_time: bool = True, availability: dict = None, booked: set = None):
    """Returns an error message when the counselor/date/slot combination can't be booked, else None.
    availability/booked may be passed in when checking many slots for the same day."""
    day = parse_date(date_str)
    if not day:
        return 'Please choose a valid date.'
    if slot not in ALL_SLOTS:
        return 'Please choose one of the listed time slots.'
    if day.weekday() >= 5:
        return 'The Guidance Office is open Monday to Friday only.'

    now = datetime.datetime.now()
    start = slot_datetime(day, slot)
    if start <= now:
        return 'That time has already passed. Please choose a later slot.'
    if enforce_lead_time:
        lead = int_setting(settings, 'lead_time_hours', 12)
        if start < now + datetime.timedelta(hours=lead):
            return f'Appointments must be booked at least {lead} hours in advance.'
        max_days = int_setting(settings, 'max_advance_booking_days', 14)
        if day > now.date() + datetime.timedelta(days=max_days):
            return f'Appointments can be booked up to {max_days} days ahead only.'

    if availability is None:
        availability = DBService.get_availability(counselor['id'])
    if not availability.get(day.isoweekday(), True):
        return f"{counselor['name']} is not taking appointments on {day.strftime('%A')}s."
    if booked is None:
        booked = DBService.booked_slots(counselor['id'], date_str, exclude_id=exclude_id)
    if slot in booked:
        return f"{counselor['name']} is already booked at {slot} on that day. Please pick another time."
    max_daily = int(counselor.get('max_daily_appointments') or 8)
    if len(booked) >= max_daily:
        return f"{counselor['name']} is fully booked on that day. Please choose another date."
    return None


def get_active_counselor(counselor_id):
    counselor = DBService.get_user_by_id(counselor_id) if counselor_id else None
    if not counselor or counselor.get('role') != 'counselor' or counselor.get('status') != 'active':
        return None
    return counselor


def can_view_appointment(user: dict, apt: dict) -> bool:
    return (user['role'] == 'admin'
            or (user['role'] == 'student' and apt['student_id'] == user['id'])
            or (user['role'] == 'counselor' and apt['counselor_id'] == user['id']))


def counselor_has_student(counselor_id: str, student_id: str) -> bool:
    return bool(DBService.get_appointments(student_id=student_id, counselor_id=counselor_id))


def location_for(modality: str, counselor: dict) -> str:
    if modality == 'Online (Google Meet)':
        return 'Google Meet (your counselor will send the link)'
    if modality == 'Phone Call':
        return 'Phone call to your registered number'
    return counselor.get('room') or 'Guidance Office Rm 204'


def validate_password(password: str):
    if len(password) < Config.MIN_PASSWORD_LENGTH:
        return f'Password must be at least {Config.MIN_PASSWORD_LENGTH} characters.'
    if len(password) > 128:
        return 'Password must be 128 characters or fewer.'
    return None


def initials(name: str) -> str:
    return (''.join(p[0] for p in name.split() if p)[:2] or name[:2]).upper()


def create_app():
    app = Flask(__name__)
    app.json.sort_keys = False

    if Config.CORS_ORIGINS:
        from flask_cors import CORS
        CORS(app, resources={r"/api/*": {"origins": Config.CORS_ORIGINS}})

    DBService.init()

    # ── Error handling: the API always answers in JSON ──

    @app.errorhandler(HTTPException)
    def handle_http_error(e):
        if request.path.startswith('/api/'):
            return jsonify({'error': e.description if e.code != 404 else 'API endpoint not found.'}), e.code
        if e.code == 404:
            return ('<!doctype html><title>Page not found</title><body style="font-family:sans-serif;padding:2rem">'
                    '<h1>Page not found</h1><p>The page you asked for does not exist.</p><p><a href="/">Go to the homepage</a></p>'), 404
        return e

    @app.errorhandler(Exception)
    def handle_unexpected(e):
        traceback.print_exc()
        return jsonify({'error': 'Something went wrong on the server. Please try again.'}), 500

    # ── Health ──

    @app.route('/api/v1/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'institution': 'Buenavista Community College (BCC)',
            'database_backend': 'Supabase' if DBService.is_supabase() else 'SQLite',
            'version': '1.1.0'
        })

    # ══════════════════════════════════════════════════════════════
    # Authentication & own account
    # ══════════════════════════════════════════════════════════════

    @app.route('/api/v1/auth/login', methods=['POST'])
    def login():
        data = body()
        email = text(data, 'email').lower()
        password = str(data.get('password') or '')
        ip = request.remote_addr
        if not email or not password:
            return error('Email and password are required.')

        locked = LoginThrottle.minutes_locked(email, ip)
        if locked:
            return error(f'Too many failed sign-in attempts. Try again in {locked} minute{"s" if locked != 1 else ""}.', 429)

        user = DBService.get_user_by_email(email, include_password=True)
        if not user or not check_password(password, user.get('password_hash', '')):
            LoginThrottle.record_failure(email, ip)
            DBService.add_audit_log(user['id'] if user else None, user['name'] if user else email, 'LOGIN_FAILED', 'Incorrect email or password', ip)
            return error('Incorrect email or password.', 401)

        if user.get('status') == 'inactive':
            return error('This account has been deactivated. Contact the Guidance Office.', 403)

        LoginThrottle.reset(email, ip)
        audit('USER_LOGIN', f"Signed in ({user['role']})", user)
        return jsonify({'message': 'Login successful', 'token': generate_token(user), 'user': clean_user(user)})

    @app.route('/api/v1/auth/register', methods=['POST'])
    def register_student():
        data = body()
        email = text(data, 'email').lower()
        password = str(data.get('password') or '')
        name = text(data, 'name', 100)
        course = text(data, 'course', 20).upper()
        year_section = text(data, 'year_section', 10).upper() or text(data, 'yearSection', 10).upper()
        student_number = text(data, 'student_id_number', 30) or text(data, 'studentId', 30)
        phone = text(data, 'phone', 30)
        emergency = text(data, 'emergency_contact', 150) or text(data, 'emergencyContact', 150)

        if not all([email, password, name, course, year_section, student_number]):
            return error('Please fill in your name, student ID, program, year & section, email and password.')
        if len(name) < 2:
            return error('Please enter your full name.')
        if not EMAIL_RE.match(email):
            return error('Please enter a valid email address.')
        if Config.ALLOWED_EMAIL_DOMAIN and not email.endswith('@' + Config.ALLOWED_EMAIL_DOMAIN):
            return error(f'Please register with your school email (@{Config.ALLOWED_EMAIL_DOMAIN}).')
        password_problem = validate_password(password)
        if password_problem:
            return error(password_problem)
        if course not in COURSES:
            return error('Please choose a valid degree program.')
        if DBService.get_user_by_email(email):
            return error('An account with this email already exists. Try signing in instead.', 409)
        if DBService.get_user_by_student_number(student_number):
            return error('This student ID is already registered. Contact the Guidance Office if this is a mistake.', 409)

        created = DBService.create_user({
            'email': email, 'password_hash': hash_password(password), 'name': name, 'role': 'student',
            'avatar_initial': initials(name), 'status': 'active', 'phone': phone,
            'student_id_number': student_number, 'course': course, 'year_section': year_section,
            'emergency_contact': emergency
        })
        audit('STUDENT_REGISTER', 'Student account self-registered', created)
        return jsonify({'message': 'Student registered successfully', 'token': generate_token(created), 'user': clean_user(created)}), 201

    @app.route('/api/v1/auth/me', methods=['GET'])
    @auth_required()
    def get_current_user():
        return jsonify({'user': clean_user(DBService.get_user_by_id(me()['id']))})

    @app.route('/api/v1/auth/logout', methods=['POST'])
    def logout():
        return jsonify({'message': 'Logged out successfully.'})

    @app.route('/api/v1/auth/change-password', methods=['POST'])
    @auth_required()
    def change_password():
        data = body()
        current_password = str(data.get('current_password') or '')
        new_password = str(data.get('new_password') or '')
        if not current_password or not new_password:
            return error('Enter your current password and a new password.')
        password_problem = validate_password(new_password)
        if password_problem:
            return error(password_problem)
        user = DBService.get_user_by_id(me()['id'], include_password=True)
        if not check_password(current_password, user.get('password_hash', '')):
            return error('Your current password is incorrect.', 400)
        if current_password == new_password:
            return error('The new password must be different from the current one.')
        DBService.update_user_password(user['id'], hash_password(new_password))
        audit('PASSWORD_CHANGED', 'Changed own password')
        return jsonify({'message': 'Password changed successfully.'})

    @app.route('/api/v1/auth/profile', methods=['PUT'])
    @auth_required()
    def update_profile():
        data = body()
        changes = {}
        if 'phone' in data:
            phone = text(data, 'phone', 30)
            if not phone:
                return error('Please enter a contact number.')
            changes['phone'] = phone
        if 'emergency_contact' in data and me()['role'] == 'student':
            emergency = text(data, 'emergency_contact', 150)
            if not emergency:
                return error('Please enter an emergency contact.')
            changes['emergency_contact'] = emergency
        if not changes:
            return error('Nothing to update.')
        updated = DBService.update_user(me()['id'], changes)
        audit('PROFILE_UPDATED', 'Updated contact details')
        return jsonify({'message': 'Profile updated successfully.', 'user': clean_user(updated)})

    # ══════════════════════════════════════════════════════════════
    # Public catalog: services, counselors, slots, resources, settings
    # ══════════════════════════════════════════════════════════════

    @app.route('/api/v1/services', methods=['GET'])
    def list_services():
        user = get_optional_user()
        include_inactive = request.args.get('active_only', 'true').lower() == 'false' and user and user['role'] == 'admin'
        return jsonify({'services': DBService.get_services(active_only=not include_inactive)})

    @app.route('/api/v1/services/<service_id>', methods=['GET'])
    def get_service(service_id):
        srv = DBService.get_service_by_id(service_id)
        if not srv:
            return error('Service not found.', 404)
        return jsonify({'service': srv})

    @app.route('/api/v1/counselors', methods=['GET'])
    def list_counselors():
        return jsonify({'counselors': DBService.get_counselors()})

    @app.route('/api/v1/counselors/<counselor_id>/slots', methods=['GET'])
    def get_counselor_slots(counselor_id):
        date_str = request.args.get('date', '')
        counselor = get_active_counselor(counselor_id)
        if not counselor:
            return error('Counselor not found.', 404)
        day = parse_date(date_str)
        if not day:
            return error("Query param 'date' must be YYYY-MM-DD.")

        settings = DBService.get_settings()
        exclude = request.args.get('exclude') or None
        enforce_lead = request.args.get('mode') != 'reschedule'
        availability = DBService.get_availability(counselor['id'])
        booked = DBService.booked_slots(counselor['id'], date_str, exclude_id=exclude)
        slots, day_message = [], None
        for slot in ALL_SLOTS:
            problem = check_schedule(counselor, date_str, slot, settings, exclude_id=exclude, enforce_lead_time=enforce_lead,
                                     availability=availability, booked=booked)
            slots.append({'time': slot, 'available': problem is None, 'reason': problem})
        if not any(s['available'] for s in slots):
            # One message for the whole day is clearer than nine identical ones
            day_message = next((s['reason'] for s in slots if 'already booked' not in (s['reason'] or '')), None) \
                or 'No free slots on this day. Please choose another date.'
        return jsonify({'counselor_id': counselor_id, 'date': date_str, 'slots': slots, 'message': day_message})

    @app.route('/api/v1/resources', methods=['GET'])
    def list_resources():
        return jsonify({'resources': DBService.get_resources(category=request.args.get('category'))})

    @app.route('/api/v1/settings', methods=['GET'])
    def public_settings():
        return jsonify({'settings': DBService.get_settings(), 'time_slots': ALL_SLOTS})

    # ══════════════════════════════════════════════════════════════
    # Appointments
    # ══════════════════════════════════════════════════════════════

    @app.route('/api/v1/appointments', methods=['GET'])
    @auth_required()
    def list_appointments():
        user = me()
        filters = {
            'status': request.args.get('status'),
            'search': (request.args.get('search') or '').strip()[:100] or None,
            'date': request.args.get('date') if parse_date(request.args.get('date')) else None
        }
        if user['role'] == 'student':
            filters['student_id'] = user['id']
        elif user['role'] == 'counselor':
            filters['counselor_id'] = user['id']
        else:
            filters['student_id'] = request.args.get('studentId') or None
            filters['counselor_id'] = request.args.get('counselorId') or None
        return jsonify({'appointments': DBService.get_appointments(**filters)})

    @app.route('/api/v1/appointments/<appointment_id>', methods=['GET'])
    @auth_required()
    def get_appointment(appointment_id):
        apt = DBService.get_appointment_by_id(appointment_id)
        if not apt or not can_view_appointment(me(), apt):
            return error('Appointment not found.', 404)
        return jsonify({'appointment': apt})

    @app.route('/api/v1/appointments', methods=['POST'])
    @auth_required(['student'])
    def create_appointment():
        data = body()
        student = me()
        counselor = get_active_counselor(text(data, 'counselor_id', 80))
        if not counselor:
            return error('Please choose a counselor from the list.')
        service = DBService.get_service_by_id(text(data, 'service_id', 80))
        if not service or not service.get('is_active'):
            return error('Please choose an available guidance service.')

        date_str, slot = text(data, 'date', 10), text(data, 'time_slot', 10)
        settings = DBService.get_settings()
        problem = check_schedule(counselor, date_str, slot, settings)
        if problem:
            return error(problem)

        modality = text(data, 'modality', 40) or 'In-Person'
        urgency = text(data, 'urgency', 40) or 'Routine'
        if modality not in MODALITIES:
            return error('Please choose how you want to meet (in person, online or phone).')
        if urgency not in URGENCIES:
            return error('Please choose an urgency level.')
        reason = text(data, 'reason', 1000)
        if len(reason) < 10:
            return error('Please describe the reason for your appointment (at least 10 characters).')

        max_active = int_setting(settings, 'max_active_appointments_per_student', 2)
        if DBService.count_active_for_student(student['id'], datetime.date.today().isoformat()) >= max_active:
            return error(f'You already have {max_active} upcoming appointment{"s" if max_active != 1 else ""}. '
                         'Cancel one or wait until it is done before booking another.', 409)

        try:
            apt = DBService.create_appointment({
                'student_id': student['id'], 'counselor_id': counselor['id'], 'service_id': service['id'],
                'date': date_str, 'time_slot': slot, 'modality': modality, 'urgency': urgency,
                'reason': reason, 'location_or_link': location_for(modality, counselor)
            })
        except ValueError as e:
            return error(str(e), 409)

        DBService.create_notification(counselor['id'], 'New Appointment Request',
                                      f"{student['name']} requested {service['title']} on {date_str} at {slot} (Ref: {apt['reference_code']}).",
                                      'appointment', 'counselor/appointments.html')
        audit('APPOINTMENT_BOOKED', f"Booked {apt['reference_code']} on {date_str} at {slot}")
        return jsonify({'message': 'Appointment booked successfully', 'appointment': apt}), 201

    @app.route('/api/v1/appointments/<appointment_id>/status', methods=['PATCH'])
    @auth_required()
    def update_appointment_status(appointment_id):
        data = body()
        user = me()
        new_status = text(data, 'status', 20)
        comments = text(data, 'comments', 500)
        apt = DBService.get_appointment_by_id(appointment_id)
        if not apt or not can_view_appointment(user, apt):
            return error('Appointment not found.', 404)

        current = apt['status']
        allowed_next = {'Pending': {'Approved', 'Cancelled'}, 'Approved': {'Completed', 'Cancelled'},
                        'Rescheduled': {'Approved', 'Completed', 'Cancelled'}}.get(current, set())
        if new_status not in allowed_next:
            return error(f'A {current.lower()} appointment cannot be marked as {new_status or "that status"}.')

        role = user['role']
        if role == 'student':
            if new_status != 'Cancelled':
                return error('Students can only cancel their own appointments.', 403)
            window = int_setting(DBService.get_settings(), 'cancellation_window_hours', 4)
            day = parse_date(apt['date'])
            if day and apt['time_slot'] in ALL_SLOTS and slot_datetime(day, apt['time_slot']) - datetime.datetime.now() < datetime.timedelta(hours=window):
                return error(f'Appointments can only be cancelled online up to {window} hours before. Please contact the Guidance Office.')
            comments = comments or 'Cancelled by student'
        elif role == 'counselor':
            if new_status == 'Cancelled' and len(comments) < 5:
                return error('Please give the student a reason (at least 5 characters).')
            if new_status == 'Completed':
                day = parse_date(apt['date'])
                if day and day > datetime.date.today():
                    return error('An appointment can only be marked completed on or after its date.')
        elif role == 'admin':
            if new_status != 'Cancelled':
                return error('Administrators can cancel appointments; approving and completing is done by the counselor.', 403)
            if len(comments) < 5:
                return error('Please enter a reason for cancelling (at least 5 characters).')

        updated = DBService.update_appointment_status(apt['id'], new_status, user['id'], comments)

        label = {'Approved': 'approved', 'Completed': 'marked as completed', 'Cancelled': 'cancelled'}[new_status]
        if role == 'student':
            DBService.create_notification(apt['counselor_id'], 'Appointment Cancelled by Student',
                                          f"{apt['studentName']} cancelled {apt['reference_code']} ({apt['date']} {apt['time_slot']}).",
                                          'appointment', 'counselor/appointments.html')
        else:
            note = f" Reason: {comments}" if new_status == 'Cancelled' and comments else ''
            extra = ' You can now rate your session.' if new_status == 'Completed' else ''
            DBService.create_notification(apt['student_id'], f"Appointment {new_status}",
                                          f"Your appointment {apt['reference_code']} on {apt['date']} at {apt['time_slot']} was {label}.{note}{extra}",
                                          'appointment', 'student/appointments.html')
        audit(f"APPOINTMENT_{new_status.upper()}", f"{apt['reference_code']}: {current} → {new_status}" + (f" ({comments})" if comments else ''))
        return jsonify({'message': f'Appointment {label}.', 'appointment': updated})

    @app.route('/api/v1/appointments/<appointment_id>/reschedule', methods=['POST'])
    @auth_required(['counselor', 'admin'])
    def reschedule_appointment(appointment_id):
        data = body()
        user = me()
        apt = DBService.get_appointment_by_id(appointment_id)
        if not apt or not can_view_appointment(user, apt):
            return error('Appointment not found.', 404)
        if apt['status'] not in ('Pending', 'Approved', 'Rescheduled'):
            return error('Only pending or approved appointments can be rescheduled.')
        reason = text(data, 'reason', 300)
        if len(reason) < 5:
            return error('Please tell the student why the time is changing (at least 5 characters).')
        counselor = get_active_counselor(apt['counselor_id'])
        if not counselor:
            return error('The assigned counselor is no longer active.')
        date_str, slot = text(data, 'date', 10), text(data, 'time_slot', 10)
        problem = check_schedule(counselor, date_str, slot, DBService.get_settings(), exclude_id=apt['id'], enforce_lead_time=False)
        if problem:
            return error(problem)
        try:
            updated = DBService.reschedule_appointment(apt['id'], date_str, slot, user['id'], reason)
        except ValueError as e:
            return error(str(e), 409)
        DBService.create_notification(apt['student_id'], 'Appointment Rescheduled',
                                      f"Your appointment {apt['reference_code']} moved to {date_str} at {slot}. Reason: {reason}. "
                                      "If the new time doesn't work, you can cancel it from My Appointments.",
                                      'appointment', 'student/appointments.html')
        audit('APPOINTMENT_RESCHEDULED', f"{apt['reference_code']}: {apt['date']} {apt['time_slot']} → {date_str} {slot}")
        return jsonify({'message': 'Appointment rescheduled.', 'appointment': updated})

    @app.route('/api/v1/appointments/<appointment_id>/feedback', methods=['POST'])
    @auth_required(['student'])
    def submit_feedback(appointment_id):
        data = body()
        apt = DBService.get_appointment_by_id(appointment_id)
        if not apt or apt['student_id'] != me()['id']:
            return error('Appointment not found.', 404)
        if apt['status'] != 'Completed':
            return error('You can rate a session after it has been completed.')
        try:
            rating = int(data.get('rating'))
        except (TypeError, ValueError):
            rating = 0
        if not 1 <= rating <= 5:
            return error('Please choose a rating from 1 to 5 stars.')
        try:
            fb = DBService.submit_feedback(apt['id'], me()['id'], rating, text(data, 'comments', 1000))
        except ValueError as e:
            return error(str(e), 409)
        audit('FEEDBACK_SUBMITTED', f"Rated {apt['reference_code']} {rating}/5")
        return jsonify({'message': 'Feedback submitted successfully', 'feedback': fb}), 201

    # ══════════════════════════════════════════════════════════════
    # Confidential SOAP notes (counselor's own cases only)
    # ══════════════════════════════════════════════════════════════

    @app.route('/api/v1/counseling-records', methods=['GET'])
    @auth_required(['counselor'])
    def get_counseling_records():
        return jsonify({'records': DBService.get_counseling_records(counselor_id=me()['id'], student_id=request.args.get('studentId') or None)})

    @app.route('/api/v1/counseling-records', methods=['POST'])
    @auth_required(['counselor'])
    def create_counseling_record():
        data = body()
        counselor = me()
        student_id = text(data, 'student_id', 80)
        if not student_id or not counselor_has_student(counselor['id'], student_id):
            return error('You can only write notes for students who have an appointment with you.')
        category = text(data, 'case_category', 60)
        if category not in CASE_CATEGORIES:
            return error('Please choose a case category.')
        fields = {k: text(data, k, 5000) for k in ('subjective', 'objective', 'assessment', 'plan')}
        missing = [k.capitalize() for k, v in fields.items() if not v]
        if missing:
            return error(f"Please fill in: {', '.join(missing)}.")

        session_date = datetime.date.today().isoformat()
        apt_id = text(data, 'appointment_id', 80) or None
        if apt_id:
            apt = DBService.get_appointment_by_id(apt_id)
            if not apt or apt['counselor_id'] != counselor['id'] or apt['student_id'] != student_id:
                return error('That appointment does not belong to this student.')
            apt_id, session_date = apt['id'], apt['date']

        rec = DBService.create_counseling_record({**fields, 'student_id': student_id, 'counselor_id': counselor['id'],
                                                  'case_category': category, 'appointment_id': apt_id, 'session_date': session_date})
        audit('SOAP_NOTE_CREATED', f"Confidential note created for student {student_id}")
        return jsonify({'message': 'SOAP note saved.', 'record': rec}), 201

    # ══════════════════════════════════════════════════════════════
    # Counselor tools: availability and follow-ups
    # ══════════════════════════════════════════════════════════════

    @app.route('/api/v1/counselor/availability', methods=['GET'])
    @auth_required(['counselor'])
    def get_my_availability():
        counselor = DBService.get_user_by_id(me()['id'])
        return jsonify({'days': DBService.get_availability(counselor['id']),
                        'max_daily_appointments': int(counselor.get('max_daily_appointments') or 8)})

    @app.route('/api/v1/counselor/availability', methods=['PUT'])
    @auth_required(['counselor'])
    def set_my_availability():
        data = body()
        raw_days = data.get('days') if isinstance(data.get('days'), dict) else {}
        days = {d: bool(raw_days.get(str(d), raw_days.get(d, True))) for d in range(1, 6)}
        try:
            max_daily = int(data.get('max_daily_appointments'))
        except (TypeError, ValueError):
            return error('Daily limit must be a number.')
        if not 1 <= max_daily <= 9:
            return error('Daily limit must be between 1 and 9 (there are 9 time slots per day).')
        DBService.set_availability(me()['id'], days)
        DBService.update_user(me()['id'], {'max_daily_appointments': max_daily})
        audit('AVAILABILITY_UPDATED', f"Available days: {[d for d, on in days.items() if on]}, daily limit {max_daily}")
        return jsonify({'message': 'Availability saved.', 'days': days, 'max_daily_appointments': max_daily})

    @app.route('/api/v1/followups', methods=['GET'])
    @auth_required(['counselor'])
    def list_followups():
        return jsonify({'followups': DBService.get_followups(me()['id'])})

    @app.route('/api/v1/followups', methods=['POST'])
    @auth_required(['counselor'])
    def create_followup():
        data = body()
        student_id = text(data, 'student_id', 80)
        if not student_id or not counselor_has_student(me()['id'], student_id):
            return error('Choose one of your students.')
        title = text(data, 'title', 200)
        if len(title) < 3:
            return error('Please describe the follow-up (at least 3 characters).')
        due = parse_date(text(data, 'due_date', 10))
        if not due:
            return error('Please choose a valid due date.')
        task = DBService.create_followup({'counselor_id': me()['id'], 'student_id': student_id, 'title': title,
                                          'description': text(data, 'description', 1000), 'due_date': due.isoformat()})
        audit('FOLLOWUP_CREATED', f"Follow-up for student {student_id} due {due.isoformat()}")
        return jsonify({'message': 'Follow-up saved.', 'followup': task}), 201

    @app.route('/api/v1/followups/<task_id>', methods=['PATCH'])
    @auth_required(['counselor'])
    def update_followup(task_id):
        task = DBService.get_followup(task_id)
        if not task or task['counselor_id'] != me()['id']:
            return error('Follow-up not found.', 404)
        status = text(body(), 'status', 20)
        if status not in FOLLOWUP_STATUSES:
            return error('Invalid status.')
        return jsonify({'message': 'Follow-up updated.', 'followup': DBService.update_followup_status(task_id, status)})

    @app.route('/api/v1/followups/<task_id>/remind', methods=['POST'])
    @auth_required(['counselor'])
    def remind_followup(task_id):
        task = DBService.get_followup(task_id)
        if not task or task['counselor_id'] != me()['id']:
            return error('Follow-up not found.', 404)
        DBService.create_notification(task['student_id'], 'Follow-up Reminder from your Counselor',
                                      f"{me()['name']}: {task['title']} (due {task['due_date']}). Please book a follow-up session.",
                                      'reminder', 'student/book.html')
        audit('FOLLOWUP_REMINDER', f"Reminder sent to student {task['student_id']}")
        return jsonify({'message': 'Reminder sent to the student’s notifications.'})

    # ══════════════════════════════════════════════════════════════
    # Announcements & notifications
    # ══════════════════════════════════════════════════════════════

    @app.route('/api/v1/announcements', methods=['GET'])
    def list_announcements():
        user = get_optional_user()
        role = user['role'] if user else None
        audiences = None if role == 'admin' else (['All', 'Students'] if role == 'student' else (['All', 'Counselors'] if role == 'counselor' else ['All']))
        return jsonify({'announcements': DBService.get_announcements(audiences)})

    @app.route('/api/v1/announcements', methods=['POST'])
    @auth_required(['admin'])
    def save_announcement():
        data = body()
        title, content = text(data, 'title', 200), text(data, 'content', 5000)
        if not title or not content:
            return error('Please enter a headline and message.')
        audience = text(data, 'target_audience', 20) or 'All'
        if audience not in AUDIENCES:
            return error('Please choose who should see this notice.')
        ann_id = text(data, 'id', 80) or None
        existing = DBService.get_announcement(ann_id) if ann_id else None
        if ann_id and not existing:
            return error('Announcement not found.', 404)
        ann = DBService.save_announcement({
            'id': ann_id, 'author_id': existing['author_id'] if existing else me()['id'], 'title': title, 'content': content,
            'category': text(data, 'category', 60) or 'General Notice', 'target_audience': audience,
            'is_pinned': bool(data.get('is_pinned'))
        })
        audit('ANNOUNCEMENT_UPDATED' if existing else 'ANNOUNCEMENT_POSTED', f"{title} (audience: {audience})")
        return jsonify({'message': 'Announcement saved.', 'announcement': ann}), 200 if existing else 201

    @app.route('/api/v1/announcements/<ann_id>', methods=['DELETE'])
    @auth_required(['admin'])
    def delete_announcement(ann_id):
        ann = DBService.get_announcement(ann_id)
        if not ann:
            return error('Announcement not found.', 404)
        DBService.delete_announcement(ann_id)
        audit('ANNOUNCEMENT_DELETED', ann['title'])
        return jsonify({'message': 'Announcement deleted.'})

    @app.route('/api/v1/notifications', methods=['GET'])
    @auth_required()
    def list_notifications():
        return jsonify({'notifications': DBService.get_notifications(me()['id'])})

    @app.route('/api/v1/notifications/read-all', methods=['PATCH'])
    @auth_required()
    def mark_all_notifications_read():
        DBService.mark_all_notifications_read(me()['id'])
        return jsonify({'message': 'All notifications marked as read'})

    @app.route('/api/v1/notifications/<notif_id>/read', methods=['PATCH'])
    @auth_required()
    def mark_notification_read(notif_id):
        DBService.mark_notification_read(notif_id, me()['id'])
        return jsonify({'message': 'Notification marked as read'})

    # ══════════════════════════════════════════════════════════════
    # Administration
    # ══════════════════════════════════════════════════════════════

    def read_user_fields(data: dict, role: str, creating: bool):
        """Validates admin-entered user fields. Returns (fields, error_message)."""
        fields = {}
        if creating or 'name' in data:
            name = text(data, 'name', 100)
            if len(name) < 2:
                return None, 'Please enter the full name.'
            fields['name'] = name
            fields['avatar_initial'] = initials(name)
        if creating or 'email' in data:
            email = text(data, 'email').lower()
            if not EMAIL_RE.match(email):
                return None, 'Please enter a valid email address.'
            fields['email'] = email
        if 'phone' in data:
            fields['phone'] = text(data, 'phone', 30)
        if role == 'student':
            if creating or 'course' in data:
                course = text(data, 'course', 20).upper() or 'BSIT'
                if course not in COURSES:
                    return None, 'Please choose a valid degree program.'
                fields['course'] = course
            if creating or 'year_section' in data:
                fields['year_section'] = text(data, 'year_section', 10).upper() or '1A'
            if 'student_id_number' in data and text(data, 'student_id_number', 30):
                fields['student_id_number'] = text(data, 'student_id_number', 30)
            if 'emergency_contact' in data:
                fields['emergency_contact'] = text(data, 'emergency_contact', 150)
        elif role == 'counselor':
            for key, limit in (('title', 150), ('room', 60), ('specialization', 200), ('bio', 1000)):
                if key in data:
                    fields[key] = text(data, key, limit)
            if 'max_daily_appointments' in data:
                try:
                    max_daily = int(data.get('max_daily_appointments'))
                except (TypeError, ValueError):
                    return None, 'Daily limit must be a number.'
                if not 1 <= max_daily <= 9:
                    return None, 'Daily limit must be between 1 and 9.'
                fields['max_daily_appointments'] = max_daily
        return fields, None

    @app.route('/api/v1/admin/users', methods=['GET'])
    @auth_required(['admin'])
    def admin_list_users():
        role = request.args.get('role')
        return jsonify({'users': DBService.get_all_users(role=role if role in ROLES else None)})

    @app.route('/api/v1/admin/users', methods=['POST'])
    @auth_required(['admin'])
    def admin_create_user():
        data = body()
        role = text(data, 'role', 20)
        if role not in ROLES:
            return error('Please choose a valid role.')
        fields, problem = read_user_fields(data, role, creating=True)
        if problem:
            return error(problem)
        password = str(data.get('password') or '')
        password_problem = validate_password(password)
        if password_problem:
            return error(password_problem)
        if DBService.get_user_by_email(fields['email']):
            return error('An account with this email already exists.', 409)
        if fields.get('student_id_number') and DBService.get_user_by_student_number(fields['student_id_number']):
            return error('This student ID is already registered.', 409)

        created = DBService.create_user({**fields, 'role': role, 'password_hash': hash_password(password), 'status': 'active'})
        audit('USER_CREATED', f"Created {role} account {created['email']}")
        return jsonify({'message': 'User account created', 'user': clean_user(created)}), 201

    @app.route('/api/v1/admin/users/<user_id>', methods=['PUT'])
    @auth_required(['admin'])
    def admin_update_user(user_id):
        target = DBService.get_user_by_id(user_id)
        if not target:
            return error('User not found.', 404)
        data = body()
        fields, problem = read_user_fields(data, target['role'], creating=False)
        if problem:
            return error(problem)
        if fields.get('email') and fields['email'] != target['email'] and DBService.get_user_by_email(fields['email']):
            return error('Another account already uses this email.', 409)
        if fields.get('student_id_number') and fields['student_id_number'] != target.get('student_id_number'):
            other = DBService.get_user_by_student_number(fields['student_id_number'])
            if other and other['id'] != user_id:
                return error('This student ID is already registered to another account.', 409)
        updated = DBService.update_user(user_id, fields)
        audit('USER_UPDATED', f"Updated account {updated['email']}")
        return jsonify({'message': 'User updated.', 'user': clean_user(updated)})

    @app.route('/api/v1/admin/users/<user_id>/status', methods=['PATCH'])
    @auth_required(['admin'])
    def admin_toggle_user_status(user_id):
        new_status = text(body(), 'status', 20)
        if new_status not in ('active', 'inactive'):
            return error("Status must be 'active' or 'inactive'.")
        if user_id == me()['id']:
            return error('You cannot change the status of your own account.')
        target = DBService.get_user_by_id(user_id)
        if not target:
            return error('User not found.', 404)
        updated = DBService.set_user_status(user_id, new_status)
        audit('USER_STATUS_CHANGED', f"{updated['email']} set to {new_status}")
        return jsonify({'message': f"User status updated to {new_status}.", 'user': clean_user(updated)})

    @app.route('/api/v1/admin/users/<user_id>/reset-password', methods=['POST'])
    @auth_required(['admin'])
    def admin_reset_password(user_id):
        target = DBService.get_user_by_id(user_id)
        if not target:
            return error('User not found.', 404)
        new_password = str(body().get('new_password') or '')
        password_problem = validate_password(new_password)
        if password_problem:
            return error(password_problem)
        DBService.update_user_password(user_id, hash_password(new_password))
        DBService.create_notification(user_id, 'Password Reset', 'Your password was reset by the Guidance Office. Please change it after signing in.', 'security')
        audit('PASSWORD_RESET', f"Reset password for {target['email']}")
        return jsonify({'message': f"Password reset for {target['name']}."})

    @app.route('/api/v1/admin/users/<user_id>', methods=['DELETE'])
    @auth_required(['admin'])
    def admin_delete_user(user_id):
        if user_id == me()['id']:
            return error('You cannot delete your own account.')
        target = DBService.get_user_by_id(user_id)
        if not target:
            return error('User not found.', 404)
        if DBService.count_user_links(user_id):
            return error('This account has appointments or case records, so it cannot be deleted. Deactivate it instead.', 409)
        DBService.delete_user(user_id)
        audit('USER_DELETED', f"Deleted account {target['email']}")
        return jsonify({'message': 'User deleted.'})

    @app.route('/api/v1/services', methods=['POST'])
    @auth_required(['admin'])
    def admin_save_service():
        data = body()
        code = text(data, 'code', 20).upper()
        title, description = text(data, 'title', 150), text(data, 'description', 2000)
        if not code or not title or not description:
            return error('Please fill in the code, title and description.')
        try:
            duration = int(data.get('duration_minutes', data.get('durationMinutes', 45)))
        except (TypeError, ValueError):
            return error('Duration must be a number of minutes.')
        if not 15 <= duration <= 180:
            return error('Duration must be between 15 and 180 minutes.')
        srv_id = text(data, 'id', 80) or None
        existing = DBService.get_service_by_id(srv_id) if srv_id else None
        if srv_id and not existing:
            return error('Service not found.', 404)
        same_code = DBService.get_service_by_code(code)
        if same_code and same_code['id'] != srv_id:
            return error(f'The code {code} is already used by "{same_code["title"]}".', 409)
        srv = DBService.save_guidance_service({
            'id': srv_id, 'code': code, 'title': title, 'description': description,
            'category': text(data, 'category', 60) or 'General', 'duration_minutes': duration,
            'icon': (existing or {}).get('icon') or text(data, 'icon', 30) or 'book-open',
            'confidentiality_level': (existing or {}).get('confidentiality_level') or 'Confidential',
            'is_active': bool(data.get('is_active', True))
        })
        audit('SERVICE_UPDATED' if existing else 'SERVICE_CREATED', f"{code} {title}")
        return jsonify({'message': 'Guidance service saved.', 'service': srv}), 200 if existing else 201

    @app.route('/api/v1/services/<service_id>', methods=['DELETE'])
    @auth_required(['admin'])
    def admin_delete_service(service_id):
        srv = DBService.get_service_by_id(service_id)
        if not srv:
            return error('Service not found.', 404)
        if DBService.service_in_use(service_id):
            return error('This service has appointments, so it cannot be deleted. Set it to Inactive instead.', 409)
        DBService.delete_service(service_id)
        audit('SERVICE_DELETED', f"{srv['code']} {srv['title']}")
        return jsonify({'message': 'Service deleted.'})

    @app.route('/api/v1/admin/audit-logs', methods=['GET'])
    @auth_required(['admin'])
    def list_audit_logs():
        return jsonify({'logs': DBService.get_audit_logs()})

    @app.route('/api/v1/admin/settings', methods=['GET'])
    @auth_required(['admin'])
    def get_admin_settings():
        return jsonify({'settings': DBService.get_settings()})

    @app.route('/api/v1/admin/settings', methods=['PUT'])
    @auth_required(['admin'])
    def update_settings():
        data = body()
        numeric = {'lead_time_hours': (0, 168), 'cancellation_window_hours': (0, 72),
                   'max_advance_booking_days': (1, 90), 'max_active_appointments_per_student': (1, 10)}
        clean = {}
        for key, (low, high) in numeric.items():
            if key in data:
                try:
                    value = int(data[key])
                except (TypeError, ValueError):
                    return error(f"{key.replace('_', ' ').capitalize()} must be a whole number.")
                if not low <= value <= high:
                    return error(f"{key.replace('_', ' ').capitalize()} must be between {low} and {high}.")
                clean[key] = value
        if 'system_name' in data:
            name = text(data, 'system_name', 120)
            if len(name) < 3:
                return error('Please enter the system name.')
            clean['system_name'] = name
        if 'operating_hours' in data:
            clean['operating_hours'] = text(data, 'operating_hours', 80)
        if not clean:
            return error('Nothing to update.')
        saved = DBService.save_system_settings(clean)
        audit('SETTINGS_UPDATED', ', '.join(f"{k}={v}" for k, v in clean.items()))
        return jsonify({'message': 'System settings saved.', 'settings': saved})

    # ══════════════════════════════════════════════════════════════
    # Reports (built from real appointment and feedback data)
    # ══════════════════════════════════════════════════════════════

    @app.route('/api/v1/reports/summary', methods=['GET'])
    @auth_required(['counselor', 'admin'])
    def get_reports_summary():
        user = me()
        apts = DBService.get_appointments(counselor_id=user['id'] if user['role'] == 'counselor' else None)
        # Ratings only count for sessions that actually took place
        ratings = [a['feedbackRating'] for a in apts if a['status'] == 'Completed' and a.get('feedbackRating') is not None]

        status_counts = defaultdict(int)
        for a in apts:
            status_counts[a['status']] += 1
        completed = [a for a in apts if a['status'] == 'Completed']
        closed = status_counts['Completed'] + status_counts['Cancelled']

        def group(key_fn):
            groups = defaultdict(list)
            for a in apts:
                groups[key_fn(a) or 'Unspecified'].append(a)
            rows = []
            for key, items in groups.items():
                done = [a for a in items if a['status'] == 'Completed']
                ended = len(done) + sum(1 for a in items if a['status'] == 'Cancelled')
                item_ratings = [a['feedbackRating'] for a in done if a.get('feedbackRating') is not None]
                services = defaultdict(int)
                for a in items:
                    services[a.get('serviceTitle') or 'Service'] += 1
                rows.append({
                    'name': key,
                    'appointments': len(items),
                    'completed': len(done),
                    'students': len({a['student_id'] for a in items}),
                    'completion_rate': round(100 * len(done) / ended) if ended else None,
                    'avg_rating': round(sum(item_ratings) / len(item_ratings), 1) if item_ratings else None,
                    'avg_duration': round(sum(int(a.get('durationMinutes') or 45) for a in items) / len(items)),
                    'top_service': max(services, key=services.get) if services else None
                })
            return sorted(rows, key=lambda r: -r['appointments'])

        today = datetime.date.today()
        months = []
        for i in range(5, -1, -1):
            y, m = today.year, today.month - i
            while m <= 0:
                m += 12
                y -= 1
            prefix = f"{y:04d}-{m:02d}"
            months.append({'month': prefix, 'label': datetime.date(y, m, 1).strftime('%b %Y'),
                           'count': sum(1 for a in apts if str(a.get('date', '')).startswith(prefix))})

        summary = {
            'scope': 'counselor' if user['role'] == 'counselor' else 'campus',
            'total_appointments': len(apts),
            'status_breakdown': dict(status_counts),
            'completed': len(completed),
            'students_served': len({a['student_id'] for a in completed}),
            'completion_rate': round(100 * status_counts['Completed'] / closed) if closed else None,
            'avg_rating': round(sum(ratings) / len(ratings), 1) if ratings else None,
            'feedback_count': len(ratings),
            'by_service': group(lambda a: a.get('serviceTitle')),
            'by_department': group(lambda a: a.get('studentCourse')),
            'monthly': months
        }
        if user['role'] == 'admin':
            all_users = DBService.get_all_users()
            summary['total_students'] = sum(1 for u in all_users if u['role'] == 'student')
            summary['total_counselors'] = sum(1 for u in all_users if u['role'] == 'counselor')
        return jsonify(summary)

    # ══════════════════════════════════════════════════════════════
    # Frontend pages & static assets (allow-listed only)
    # ══════════════════════════════════════════════════════════════

    @app.route('/', methods=['GET'])
    def serve_root():
        return send_from_directory(PROJECT_ROOT, 'index.html')

    @app.route('/<path:filename>', methods=['GET'])
    def serve_frontend_files(filename):
        if filename.startswith('api/'):
            return error('API endpoint not found.', 404)
        parts = filename.replace('\\', '/').strip('/').split('/')
        if any(p in ('', '.', '..') or p.startswith('.') for p in parts):
            return handle_http_error(_not_found())

        if len(parts) == 1 and parts[0] in PUBLIC_DIRS:
            if (PROJECT_ROOT / parts[0] / 'dashboard.html').is_file():
                return send_from_directory(PROJECT_ROOT / parts[0], 'dashboard.html')
        is_public = (len(parts) == 1 and (parts[0] in PUBLIC_ROOT_FILES or f"{parts[0]}.html" in PUBLIC_ROOT_FILES)) \
            or (len(parts) > 1 and parts[0] in PUBLIC_DIRS)
        if not is_public:
            return handle_http_error(_not_found())
        if len(parts) == 1 and f"{parts[0]}.html" in PUBLIC_ROOT_FILES:
            return send_from_directory(PROJECT_ROOT, f"{parts[0]}.html")

        target = PROJECT_ROOT.joinpath(*parts)
        if target.suffix.lower() not in PUBLIC_EXTENSIONS or not target.is_file():
            return handle_http_error(_not_found())
        return send_from_directory(PROJECT_ROOT, '/'.join(parts))

    def _not_found():
        from werkzeug.exceptions import NotFound
        return NotFound()

    return app


if __name__ == '__main__':
    app = create_app()
    print(f" Running on http://127.0.0.1:{Config.PORT}")
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
