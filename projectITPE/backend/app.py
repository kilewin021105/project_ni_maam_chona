import os
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from .config import Config
from .auth import hash_password, check_password, generate_token, auth_required
from .database import DBService

PROJECT_ROOT = Path(__file__).resolve().parent.parent

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Initialize Database connection
    DBService.init()

    # ── Health & Info ──
    @app.route('/api/v1/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'institution': 'Buenavista Community College (BCC)',
            'database_backend': 'Supabase' if DBService.is_supabase() else 'SQLite Fallback',
            'version': '1.0.0'
        })

    # ── Authentication ──

    @app.route('/api/v1/auth/login', methods=['POST'])
    def login():
        data = request.get_json() or {}
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()

        if not email or not password:
            return jsonify({'error': 'Email and password are required.'}), 400

        user = DBService.get_user_by_email(email)
        if not user:
            return jsonify({'error': 'Invalid credentials. User does not exist.'}), 401

        if user.get('status') == 'inactive':
            return jsonify({'error': 'This account has been deactivated. Contact the Guidance Office.'}), 403

        if not check_password(password, user.get('password_hash', '')):
            return jsonify({'error': 'Invalid password. Please check your credentials.'}), 401

        token = generate_token(user)
        # Remove password hash before sending to client
        clean_user = {k: v for k, v in user.items() if k != 'password_hash'}

        # Audit log
        DBService.add_audit_log(user['id'], user['name'], 'USER_LOGIN', f"User signed in successfully ({user['role']})", request.remote_addr)

        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': clean_user
        })

    @app.route('/api/v1/auth/register', methods=['POST'])
    def register_student():
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''
        name = (data.get('name') or '').strip()
        course = (data.get('course') or '').strip()
        year_section = (data.get('year_section') or data.get('yearSection') or '').strip()
        student_id_number = (data.get('student_id_number') or data.get('studentId') or data.get('student_id') or '').strip()
        emergency_contact = (data.get('emergency_contact') or data.get('emergencyContact') or '').strip()
        phone = (data.get('phone') or data.get('phoneNumber') or '').strip()

        if not email or not password or not name or not course or not year_section:
            return jsonify({'error': "Missing required fields: email, password, name, course, and year section are required."}), 400

        existing = DBService.get_user_by_email(email)
        if existing:
            return jsonify({'error': 'An account with this institutional email already exists.'}), 409

        user_data = {
            'email': email,
            'password_hash': hash_password(password),
            'name': name,
            'role': 'student',
            'avatar_initial': ''.join([p[0] for p in name.split() if p])[:2].upper() or name[:2].upper(),
            'status': 'active',
            'phone': phone,
            'student_id_number': student_id_number or f"BCC-2026-{os.urandom(2).hex().upper()}",
            'course': course,
            'year_section': year_section,
            'emergency_contact': emergency_contact
        }

        created = DBService.create_user(user_data)
        clean_user = {k: v for k, v in created.items() if k != 'password_hash'}
        token = generate_token(created)

        DBService.add_audit_log(created['id'], created['name'], 'STUDENT_REGISTER', 'Student account self-registered', request.remote_addr)

        return jsonify({
            'message': 'Student registered successfully',
            'token': token,
            'user': clean_user
        }), 201

    @app.route('/api/v1/auth/me', methods=['GET'])
    @auth_required()
    def get_current_user():
        uid = request.current_user.get('sub')
        user = DBService.get_user_by_id(uid)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        clean_user = {k: v for k, v in user.items() if k != 'password_hash'}
        return jsonify({'user': clean_user})

    @app.route('/api/v1/auth/logout', methods=['POST'])
    def logout():
        return jsonify({'message': 'Logged out successfully.'})

    @app.route('/api/v1/auth/change-password', methods=['POST'])
    def change_password():
        data = request.get_json() or {}
        user_id = data.get('user_id')
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')

        if not user_id or not current_password or not new_password:
            return jsonify({'error': 'User ID, current password, and new password are required.'}), 400

        if len(new_password) < 6:
            return jsonify({'error': 'New password must be at least 6 characters long.'}), 400

        user = DBService.get_user_by_id(user_id)
        if not user:
            return jsonify({'error': 'User not found.'}), 404

        if not check_password(current_password, user.get('password_hash', '')):
            return jsonify({'error': 'Incorrect current password. Please verify and try again.'}), 401

        new_hash = hash_password(new_password)
        DBService.update_user_password(user_id, new_hash)
        DBService.add_audit_log(user_id, user['name'], 'PASSWORD_CHANGED', 'User successfully changed account password', request.remote_addr)

        return jsonify({'message': 'Password changed successfully.'})

    @app.route('/api/v1/auth/profile', methods=['PUT'])
    def update_profile():
        data = request.get_json() or {}
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'error': 'User ID is required.'}), 400

        phone = data.get('phone')
        emergency_contact = data.get('emergency_contact')

        updated = DBService.update_student_profile(user_id, phone=phone, emergency_contact=emergency_contact)
        clean = {k: v for k, v in updated.items() if k != 'password_hash'}
        DBService.add_audit_log(user_id, updated['name'], 'PROFILE_UPDATED', 'Student updated contact and emergency details', request.remote_addr)
        return jsonify({'message': 'Profile updated successfully.', 'user': clean})

    # ── Guidance Services ──

    @app.route('/api/v1/services', methods=['GET'])
    def list_services():
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        services = DBService.get_services(active_only=active_only)
        return jsonify({'services': services})

    @app.route('/api/v1/services/<service_id>', methods=['GET'])
    def get_service(service_id):
        srv = DBService.get_service_by_id(service_id)
        if not srv:
            return jsonify({'error': 'Service not found'}), 404
        return jsonify({'service': srv})

    # ── Counselors ──

    @app.route('/api/v1/counselors', methods=['GET'])
    def list_counselors():
        counselors = DBService.get_counselors()
        return jsonify({'counselors': counselors})

    @app.route('/api/v1/counselors/<counselor_id>/slots', methods=['GET'])
    def get_counselor_slots(counselor_id):
        date = request.args.get('date')
        if not date:
            return jsonify({'error': "Query param 'date' is required (YYYY-MM-DD)."}), 400

        all_slots = [
            '8:30 AM', '9:15 AM', '10:00 AM', '10:45 AM',
            '1:00 PM', '1:45 PM', '2:30 PM', '3:15 PM', '4:00 PM'
        ]

        # Fetch booked appointments for this counselor and date
        existing = DBService.get_appointments(counselor_id=counselor_id)
        booked_times = {a['time_slot'] for a in existing if a['date'] == date and a['status'] in ('Pending', 'Approved')}

        slots = [{'time': t, 'available': t not in booked_times} for t in all_slots]
        return jsonify({
            'counselor_id': counselor_id,
            'date': date,
            'slots': slots
        })

    # ── Appointments & Booking (Workflow A & B & C) ──

    @app.route('/api/v1/appointments', methods=['GET'])
    def list_appointments():
        student_id = request.args.get('studentId')
        counselor_id = request.args.get('counselorId')
        status = request.args.get('status')
        search = request.args.get('search')

        appointments = DBService.get_appointments(
            student_id=student_id,
            counselor_id=counselor_id,
            status=status,
            search=search
        )
        return jsonify({'appointments': appointments})

    @app.route('/api/v1/appointments/<appointment_id>', methods=['GET'])
    def get_appointment(appointment_id):
        apt = DBService.get_appointment_by_id(appointment_id)
        if not apt:
            return jsonify({'error': 'Appointment not found'}), 404
        return jsonify({'appointment': apt})

    @app.route('/api/v1/appointments', methods=['POST'])
    def create_appointment():
        """
        Transactional booking with double-booking prevention.
        """
        data = request.get_json() or {}
        required = ['student_id', 'counselor_id', 'service_id', 'date', 'time_slot', 'reason']
        for field in required:
            if not data.get(field):
                return jsonify({'error': f"Field '{field}' is required."}), 400

        try:
            apt = DBService.create_appointment(data)
            DBService.add_audit_log(data['student_id'], 'Student', 'APPOINTMENT_BOOKED', f"Booked ref: {apt['reference_code']} on {data['date']} at {data['time_slot']}", request.remote_addr)
            return jsonify({
                'message': 'Appointment booked successfully',
                'appointment': apt
            }), 201
        except ValueError as e:
            return jsonify({'error': str(e)}), 409  # 409 Conflict
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({'error': f"Failed to book appointment: {str(e)}"}), 500

    @app.route('/api/v1/appointments/<appointment_id>/status', methods=['PATCH'])
    def update_appointment_status(appointment_id):
        data = request.get_json() or {}
        new_status = data.get('status')
        comments = data.get('comments', '')
        user_id = data.get('userId', 'system')

        if new_status not in ('Approved', 'Completed', 'Cancelled', 'Rescheduled'):
            return jsonify({'error': 'Invalid status'}), 400

        try:
            updated = DBService.update_appointment_status(appointment_id, new_status, user_id, comments)
            DBService.add_audit_log(user_id, 'User', f"APPOINTMENT_{new_status.upper()}", f"Updated apt {appointment_id} to {new_status}", request.remote_addr)
            return jsonify({
                'message': f'Appointment marked as {new_status}',
                'appointment': updated
            })
        except ValueError as e:
            return jsonify({'error': str(e)}), 404

    @app.route('/api/v1/appointments/<appointment_id>/feedback', methods=['POST'])
    def submit_feedback(appointment_id):
        data = request.get_json() or {}
        student_id = data.get('student_id')
        rating = data.get('rating')
        comments = data.get('comments', '')

        if not student_id or not rating or not (1 <= int(rating) <= 5):
            return jsonify({'error': 'Valid rating (1-5) and student_id are required.'}), 400

        try:
            fb = DBService.submit_feedback(appointment_id, student_id, int(rating), comments)
            return jsonify({'message': 'Feedback submitted successfully', 'feedback': fb}), 201
        except ValueError as e:
            return jsonify({'error': str(e)}), 409

    # ── Confidential Clinical SOAP Notes (Section 6.5) ──

    @app.route('/api/v1/counseling-records', methods=['GET'])
    def get_counseling_records():
        counselor_id = request.args.get('counselorId')
        student_id = request.args.get('studentId')
        records = DBService.get_counseling_records(counselor_id=counselor_id, student_id=student_id)
        return jsonify({'records': records})

    @app.route('/api/v1/counseling-records', methods=['POST'])
    def create_counseling_record():
        data = request.get_json() or {}
        required = ['student_id', 'counselor_id', 'case_category', 'subjective', 'objective', 'assessment', 'plan']
        for field in required:
            if not data.get(field):
                return jsonify({'error': f"Field '{field}' is required."}), 400

        rec = DBService.create_counseling_record(data)
        DBService.add_audit_log(data['counselor_id'], 'Counselor', 'SOAP_NOTE_CREATED', f"Confidential note created for student {data['student_id']}", request.remote_addr)
        return jsonify({'message': 'SOAP clinical note created successfully', 'record': rec}), 201

    # ── Guidance Resources (Section 5.8) ──

    @app.route('/api/v1/resources', methods=['GET'])
    def list_resources():
        category = request.args.get('category')
        resources = DBService.get_resources(category=category)
        return jsonify({'resources': resources})

    # ── Announcements & Notifications ──

    @app.route('/api/v1/announcements', methods=['GET'])
    def list_announcements():
        announcements = DBService.get_announcements()
        return jsonify({'announcements': announcements})

    @app.route('/api/v1/notifications', methods=['GET'])
    def list_notifications():
        user_id = request.args.get('userId')
        if not user_id:
            return jsonify({'notifications': []})
        notifs = DBService.get_notifications(user_id)
        return jsonify({'notifications': notifs})

    @app.route('/api/v1/notifications/<notif_id>/read', methods=['PATCH'])
    def mark_notification_read(notif_id):
        DBService.mark_notification_read(notif_id)
        return jsonify({'message': 'Notification marked as read'})

    # ── Administrator Endpoints (Section 7) ──

    @app.route('/api/v1/admin/users', methods=['GET'])
    def admin_list_users():
        role = request.args.get('role')
        users = DBService.get_all_users(role=role)
        return jsonify({'users': users})

    @app.route('/api/v1/admin/users', methods=['POST'])
    def admin_create_user():
        data = request.get_json() or {}
        required = ['name', 'email', 'role', 'password']
        for f in required:
            if not data.get(f):
                return jsonify({'error': f"Field '{f}' is required."}), 400

        user_data = {
            'email': data['email'].strip().lower(),
            'password_hash': hash_password(data['password']),
            'name': data['name'].strip(),
            'role': data['role'],
            'avatar_initial': ''.join([p[0] for p in data['name'].split() if p])[:2].upper(),
            'status': data.get('status', 'active'),
            'phone': data.get('phone', ''),
            'course': data.get('course', 'BSIT'),
            'year_section': data.get('year_section', '1A'),
            'student_id_number': data.get('student_id_number') or data.get('studentId') or '',
            'emergency_contact': data.get('emergency_contact') or '',
            'title': data.get('title', 'Registered Guidance Counselor'),
            'room': data.get('room', 'Guidance Office Rm 204'),
            'specialization': data.get('specialization', 'General Guidance'),
            'max_daily_appointments': int(data.get('max_daily_appointments') or data.get('max_appointments') or 5),
            'bio': data.get('bio', '')
        }
        created = DBService.create_user(user_data)
        clean = {k: v for k, v in created.items() if k != 'password_hash'}
        return jsonify({'message': 'User account created', 'user': clean}), 201

    @app.route('/api/v1/admin/audit-logs', methods=['GET'])
    def list_audit_logs():
        logs = DBService.get_audit_logs()
        return jsonify({'logs': logs})

    @app.route('/api/v1/admin/users/<user_id>/status', methods=['PATCH'])
    def admin_toggle_user_status(user_id):
        data = request.get_json() or {}
        new_status = data.get('status', 'active')
        if new_status not in ('active', 'inactive'):
            return jsonify({'error': "Status must be 'active' or 'inactive'."}), 400

        updated = DBService.toggle_user_status(user_id, new_status)
        clean = {k: v for k, v in updated.items() if k != 'password_hash'}
        DBService.add_audit_log('admin', 'Admin', 'USER_STATUS_TOGGLED', f"Changed status of {updated['name']} to {new_status}", request.remote_addr)
        return jsonify({'message': f"User status updated to {new_status}.", 'user': clean})

    @app.route('/api/v1/services', methods=['POST'])
    def admin_create_or_update_service():
        data = request.get_json() or {}
        required = ['title', 'description']
        for f in required:
            if not data.get(f):
                return jsonify({'error': f"Field '{f}' is required."}), 400

        srv = DBService.save_guidance_service(data)
        DBService.add_audit_log('admin', 'Admin', 'SERVICE_SAVED', f"Saved guidance service: {srv['title']}", request.remote_addr)
        return jsonify({'message': 'Guidance service saved successfully.', 'service': srv}), 201

    @app.route('/api/v1/announcements', methods=['POST'])
    def admin_create_announcement():
        data = request.get_json() or {}
        if not data.get('title') or not data.get('content'):
            return jsonify({'error': 'Title and content are required.'}), 400

        ann = DBService.save_announcement(data)
        DBService.add_audit_log('admin', 'Admin', 'ANNOUNCEMENT_POSTED', f"Posted announcement: {ann['title']}", request.remote_addr)
        return jsonify({'message': 'Announcement published successfully.', 'announcement': ann}), 201

    @app.route('/api/v1/admin/settings', methods=['PUT'])
    def update_settings():
        data = request.get_json() or {}
        saved = DBService.save_system_settings(data)
        DBService.add_audit_log('admin', 'Admin', 'SETTINGS_UPDATED', 'Updated institutional system settings', request.remote_addr)
        return jsonify({'message': 'System settings saved successfully.', 'settings': saved})


    # ── Reports & Metrics ──

    @app.route('/api/v1/reports/summary', methods=['GET'])
    def get_reports_summary():
        if DBService._use_supabase:
            total_apts = DBService._supabase_client.table('appointments').select('id', count='exact').execute().count or 0
            total_students = DBService._supabase_client.table('users').select('id', count='exact').eq('role', 'student').execute().count or 0
            total_counselors = DBService._supabase_client.table('users').select('id', count='exact').eq('role', 'counselor').execute().count or 0
            apts_res = DBService._supabase_client.table('appointments').select('status').execute()
            status_counts = {}
            for a in (apts_res.data or []):
                st = a.get('status', 'Pending')
                status_counts[st] = status_counts.get(st, 0) + 1
            return jsonify({
                'total_appointments': total_apts,
                'total_students': total_students,
                'total_counselors': total_counselors,
                'status_breakdown': status_counts
            })

        conn = DBService.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM appointments")
        total_apts = cur.fetchone()[0]

        cur.execute("SELECT status, COUNT(*) FROM appointments GROUP BY status")
        status_counts = {r[0]: r[1] for r in cur.fetchall()}

        cur.execute("SELECT COUNT(*) FROM users WHERE role = 'student'")
        total_students = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM users WHERE role = 'counselor'")
        total_counselors = cur.fetchone()[0]
        conn.close()

        return jsonify({
            'total_appointments': total_apts,
            'total_students': total_students,
            'total_counselors': total_counselors,
            'status_breakdown': status_counts
        })

    # ── Frontend Pages & Static Assets Serving ──

    @app.route('/', methods=['GET'])
    def serve_root():
        return send_from_directory(PROJECT_ROOT, 'index.html')

    @app.route('/<path:filename>', methods=['GET'])
    def serve_frontend_files(filename):
        # Don't intercept API endpoints
        if filename.startswith('api/'):
            return jsonify({'error': 'API endpoint not found'}), 404

        target = PROJECT_ROOT / filename
        if target.is_file():
            return send_from_directory(PROJECT_ROOT, filename)
        elif target.is_dir() and (target / 'index.html').is_file():
            return send_from_directory(target, 'index.html')
        elif target.is_dir() and (target / 'dashboard.html').is_file():
            return send_from_directory(target, 'dashboard.html')
        elif (PROJECT_ROOT / f"{filename}.html").is_file():
            return send_from_directory(PROJECT_ROOT, f"{filename}.html")
        return jsonify({'error': 'Page not found', 'path': filename}), 404

    return app

if __name__ == '__main__':
    app = create_app()
    port = Config.PORT
    print(f"==================================================================")
    print(f" BUENAVISTA COMMUNITY COLLEGE — GUIDANCE REST API")
    print(f" Running on http://127.0.0.1:{port}")
    print(f" Database: {'Supabase Remote' if DBService.is_supabase() else 'SQLite Fallback'}")
    print(f"==================================================================")
    app.run(host='0.0.0.0', port=port, debug=Config.DEBUG)
