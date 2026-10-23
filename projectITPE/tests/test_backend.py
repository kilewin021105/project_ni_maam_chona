import datetime
import uuid
import pytest
from backend.config import Config
from backend.auth import LoginThrottle
from backend.database import DBService


@pytest.fixture
def client(tmp_path, monkeypatch):
    # Every test gets its own freshly seeded SQLite file, so the real database is never touched
    monkeypatch.setattr(Config, 'LOCAL_DB_PATH', tmp_path / 'test.db')
    monkeypatch.setattr(Config, 'SUPABASE_URL', '')
    LoginThrottle._failures.clear()
    from backend.app import create_app
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as c:
        yield c


def login(client, email, password='password123'):
    res = client.post('/api/v1/auth/login', json={'email': email, 'password': password})
    assert res.status_code == 200, res.get_json()
    return {'Authorization': f"Bearer {res.get_json()['token']}"}


STUDENT = 'juan.delacruz@buenavista.edu.ph'
STUDENT2 = 'angelica.ramos@buenavista.edu.ph'
COUNSELOR = 'msantos.guidance@buenavista.edu.ph'
COUNSELOR2 = 'rrivera.guidance@buenavista.edu.ph'
ADMIN = 'admin.guidance@buenavista.edu.ph'


def next_weekday(min_days_ahead=2):
    d = datetime.date.today() + datetime.timedelta(days=min_days_ahead)
    while d.weekday() >= 5:
        d += datetime.timedelta(days=1)
    return d.isoformat()


def book(client, headers, **overrides):
    payload = {'counselor_id': 'usr-cns-1', 'service_id': 'srv-1', 'date': next_weekday(), 'time_slot': '10:00 AM',
               'modality': 'In-Person', 'urgency': 'Routine', 'reason': 'Exam stress and time management help.'}
    payload.update(overrides)
    return client.post('/api/v1/appointments', json=payload, headers=headers)


# ── Basics ──

def test_health_check(client):
    res = client.get('/api/v1/health')
    assert res.status_code == 200
    assert 'Buenavista Community College' in res.get_json()['institution']


@pytest.mark.parametrize('email,role', [(STUDENT, 'student'), (COUNSELOR, 'counselor'), (ADMIN, 'admin')])
def test_login_valid(client, email, role):
    res = client.post('/api/v1/auth/login', json={'email': email, 'password': 'password123'})
    assert res.status_code == 200
    data = res.get_json()
    assert data['user']['role'] == role
    assert 'password_hash' not in data['user']


def test_login_errors_do_not_reveal_which_emails_exist(client):
    a = client.post('/api/v1/auth/login', json={'email': 'nobody@buenavista.edu.ph', 'password': 'x'})
    b = client.post('/api/v1/auth/login', json={'email': STUDENT, 'password': 'wrongpassword'})
    assert a.status_code == b.status_code == 401
    assert a.get_json()['error'] == b.get_json()['error']


def test_login_lockout_after_repeated_failures(client):
    for _ in range(Config.LOGIN_MAX_ATTEMPTS):
        client.post('/api/v1/auth/login', json={'email': STUDENT, 'password': 'bad'})
    res = client.post('/api/v1/auth/login', json={'email': STUDENT, 'password': 'password123'})
    assert res.status_code == 429


def test_guidance_services_catalog(client):
    res = client.get('/api/v1/services')
    assert res.status_code == 200
    assert len(res.get_json()['services']) >= 6


def test_guidance_resources_catalog(client):
    res = client.get('/api/v1/resources')
    assert res.status_code == 200
    assert len(res.get_json()['resources']) >= 1


# ── Registration ──

def test_student_registration(client):
    email = f"student_{uuid.uuid4().hex[:6]}@buenavista.edu.ph"
    res = client.post('/api/v1/auth/register', json={
        'name': 'Test New Student', 'email': email, 'password': 'password123',
        'course': 'BSIT', 'year_section': '1A', 'student_id_number': f"BCC-T-{uuid.uuid4().hex[:5]}"})
    assert res.status_code == 201
    assert res.get_json()['user']['email'] == email


@pytest.mark.parametrize('overrides,status', [
    ({'password': 'short'}, 400),
    ({'email': 'someone@gmail.com'}, 400),
    ({'student_id_number': 'BCC-2023-01048'}, 409),   # Juan's ID
    ({'email': STUDENT}, 409),
    ({'course': 'BSXYZ'}, 400),
])
def test_registration_validation(client, overrides, status):
    payload = {'name': 'Val Test', 'email': f"v{uuid.uuid4().hex[:6]}@buenavista.edu.ph", 'password': 'password123',
               'course': 'BSIT', 'year_section': '1A', 'student_id_number': f"BCC-V-{uuid.uuid4().hex[:5]}"}
    payload.update(overrides)
    assert client.post('/api/v1/auth/register', json=payload).status_code == status


def test_failed_registration_does_not_lock_database(client):
    dup = client.post('/api/v1/auth/register', json={'name': 'Dup', 'email': 'dup1@buenavista.edu.ph', 'password': 'password123',
                                                     'course': 'BSIT', 'year_section': '1A', 'student_id_number': 'BCC-2023-01048'})
    assert dup.status_code == 409
    ok = book(client, login(client, STUDENT))
    assert ok.status_code == 201, ok.get_json()


# ── Security: authentication and roles ──

@pytest.mark.parametrize('method,path', [
    ('get', '/api/v1/admin/users'), ('get', '/api/v1/counseling-records'), ('get', '/api/v1/admin/audit-logs'),
    ('get', '/api/v1/appointments'), ('get', '/api/v1/notifications'), ('get', '/api/v1/reports/summary'),
    ('post', '/api/v1/admin/users'), ('patch', '/api/v1/appointments/apt-2/status'), ('put', '/api/v1/auth/profile'),
    ('post', '/api/v1/auth/change-password'), ('post', '/api/v1/announcements'), ('put', '/api/v1/admin/settings'),
])
def test_protected_endpoints_require_login(client, method, path):
    assert getattr(client, method)(path, json={}).status_code == 401


def test_student_cannot_use_admin_endpoints(client):
    h = login(client, STUDENT)
    assert client.get('/api/v1/admin/audit-logs', headers=h).status_code == 403
    assert client.post('/api/v1/admin/users', json={'name': 'X', 'email': 'x@y.com', 'role': 'admin', 'password': 'password123'},
                       headers=h).status_code == 403


def test_deactivated_user_is_locked_out_immediately(client):
    student = login(client, STUDENT2)
    admin = login(client, ADMIN)
    assert client.patch('/api/v1/admin/users/usr-std-2/status', json={'status': 'inactive'}, headers=admin).status_code == 200
    assert client.get('/api/v1/auth/me', headers=student).status_code == 401
    res = client.post('/api/v1/auth/login', json={'email': STUDENT2, 'password': 'password123'})
    assert res.status_code == 403


def test_sensitive_files_are_not_served(client):
    for path in ['/database/bcc_guidance.db', '/backend/config.py', '/tests/test_backend.py', '/supabase/seed.sql',
                 '/README.md', '/.jwt_secret', '/app.py', '/backend/..%2fapp.py']:
        assert client.get(path).status_code == 404, path
    assert client.get('/login.html').status_code == 200
    assert client.get('/css/base.css').status_code == 200
    assert client.get('/student/').status_code == 200


def test_password_hashes_never_returned(client):
    admin = login(client, ADMIN)
    for path in ['/api/v1/admin/users', '/api/v1/counselors']:
        body = client.get(path, headers=admin).get_data(as_text=True)
        assert 'password_hash' not in body and '$2b$' not in body


# ── Booking rules ──

def test_appointment_booking_and_double_booking_prevention(client):
    juan, angelica = login(client, STUDENT), login(client, STUDENT2)
    first = book(client, juan)
    assert first.status_code == 201, first.get_json()
    apt = first.get_json()['appointment']
    assert apt['studentId'] == 'usr-std-1'
    assert book(client, angelica).status_code == 400   # slot shows as taken

    slots = client.get(f"/api/v1/counselors/usr-cns-1/slots?date={apt['date']}").get_json()['slots']
    assert next(s for s in slots if s['time'] == '10:00 AM')['available'] is False


@pytest.mark.parametrize('overrides', [
    {'date': '2020-01-01'},
    {'date': 'banana'},
    {'time_slot': '3:00 AM'},
    {'date': (datetime.date.today() + datetime.timedelta(days=400)).isoformat()},
    {'counselor_id': 'usr-std-1'},         # a student is not a counselor
    {'reason': 'short'},
    {'modality': 'Telepathy'},
])
def test_invalid_bookings_rejected(client, overrides):
    assert book(client, login(client, STUDENT), **overrides).status_code == 400


def test_weekend_booking_rejected(client):
    d = datetime.date.today() + datetime.timedelta(days=2)
    while d.weekday() != 6:
        d += datetime.timedelta(days=1)
    assert book(client, login(client, STUDENT), date=d.isoformat()).status_code == 400


def test_max_active_appointments_per_student(client):
    juan = login(client, STUDENT)
    assert book(client, juan, time_slot='8:30 AM').status_code == 201
    assert book(client, juan, time_slot='9:15 AM').status_code == 201
    assert book(client, juan, time_slot='1:00 PM').status_code == 409   # limit is 2


def test_student_id_comes_from_token_not_body(client):
    res = book(client, login(client, STUDENT), student_id='usr-std-3')
    assert res.get_json()['appointment']['student_id'] == 'usr-std-1'


def test_counselor_availability_blocks_days(client):
    counselor = login(client, COUNSELOR)
    date = next_weekday()
    weekday = str(datetime.date.fromisoformat(date).isoweekday())
    res = client.put('/api/v1/counselor/availability', json={'days': {weekday: False}, 'max_daily_appointments': 5}, headers=counselor)
    assert res.status_code == 200
    assert book(client, login(client, STUDENT), date=date).status_code == 400


# ── Status workflow ──

def test_status_workflow_and_feedback(client):
    juan, santos, rivera = login(client, STUDENT), login(client, COUNSELOR), login(client, COUNSELOR2)
    apt_id = book(client, juan).get_json()['appointment']['id']

    # Another counselor can't see or touch it
    assert client.patch(f'/api/v1/appointments/{apt_id}/status', json={'status': 'Approved'}, headers=rivera).status_code == 404
    # Students can't approve
    assert client.patch(f'/api/v1/appointments/{apt_id}/status', json={'status': 'Approved'}, headers=juan).status_code == 403
    assert client.patch(f'/api/v1/appointments/{apt_id}/status', json={'status': 'Approved'}, headers=santos).status_code == 200
    # Future appointment can't be completed yet
    assert client.patch(f'/api/v1/appointments/{apt_id}/status', json={'status': 'Completed'}, headers=santos).status_code == 400
    # No feedback before completion
    assert client.post(f'/api/v1/appointments/{apt_id}/feedback', json={'rating': 5}, headers=juan).status_code == 400


def test_invalid_status_transition_rejected(client):
    santos = login(client, COUNSELOR)
    # apt-3 is Completed in the seed data
    assert client.patch('/api/v1/appointments/apt-3/status', json={'status': 'Approved'}, headers=santos).status_code == 400


def test_feedback_rules(client):
    juan, mark = login(client, STUDENT), login(client, 'mark.reyes@buenavista.edu.ph')
    # apt-3 is Juan's completed session
    assert client.post('/api/v1/appointments/apt-3/feedback', json={'rating': 'five'}, headers=juan).status_code == 400
    assert client.post('/api/v1/appointments/apt-3/feedback', json={'rating': 5}, headers=mark).status_code == 404
    assert client.post('/api/v1/appointments/apt-3/feedback', json={'rating': 5, 'comments': 'Helpful'}, headers=juan).status_code == 201
    assert client.post('/api/v1/appointments/apt-3/feedback', json={'rating': 4}, headers=juan).status_code == 409


def test_counselor_reject_requires_reason_and_reschedule(client):
    juan, santos = login(client, STUDENT), login(client, COUNSELOR)
    apt_id = book(client, juan).get_json()['appointment']['id']
    assert client.patch(f'/api/v1/appointments/{apt_id}/status', json={'status': 'Cancelled'}, headers=santos).status_code == 400
    res = client.post(f'/api/v1/appointments/{apt_id}/reschedule',
                      json={'date': next_weekday(3), 'time_slot': '2:30 PM', 'reason': 'Conflict with a faculty meeting'}, headers=santos)
    assert res.status_code == 200, res.get_json()
    assert res.get_json()['appointment']['time_slot'] == '2:30 PM'
    notes = client.get('/api/v1/notifications', headers=juan).get_json()['notifications']
    assert any(n['title'] == 'Appointment Rescheduled' for n in notes)


# ── Confidential notes ──

def test_confidential_clinical_soap_notes(client):
    santos, rivera = login(client, COUNSELOR), login(client, COUNSELOR2)
    res = client.post('/api/v1/counseling-records', json={
        'student_id': 'usr-std-1', 'case_category': 'Academic Support',
        'subjective': 'Feeling overwhelmed', 'objective': 'Calm, attentive', 'assessment': 'Normal stress', 'plan': 'Weekly check-in'
    }, headers=santos)
    assert res.status_code == 201
    mine = client.get('/api/v1/counseling-records', headers=santos).get_json()['records']
    assert any(r['subjective'] == 'Feeling overwhelmed' for r in mine)
    theirs = client.get('/api/v1/counseling-records', headers=rivera).get_json()['records']
    assert not any(r['subjective'] == 'Feeling overwhelmed' for r in theirs)
    assert client.get('/api/v1/counseling-records', headers=login(client, ADMIN)).status_code == 403


# ── Administration ──

def test_admin_creates_counselor_and_announcement(client):
    admin = login(client, ADMIN)
    res = client.post('/api/v1/admin/users', json={'name': 'New Counselor', 'email': 'nc@buenavista.edu.ph', 'role': 'counselor',
                                                   'password': 'password123', 'max_daily_appointments': 5}, headers=admin)
    assert res.status_code == 201, res.get_json()
    res = client.post('/api/v1/announcements', json={'title': 'Counselor meeting', 'content': 'Friday 3 PM',
                                                    'target_audience': 'Counselors'}, headers=admin)
    assert res.status_code == 201, res.get_json()
    public_titles = [a['title'] for a in client.get('/api/v1/announcements').get_json()['announcements']]
    assert 'Counselor meeting' not in public_titles
    counselor_titles = [a['title'] for a in client.get('/api/v1/announcements', headers=login(client, COUNSELOR)).get_json()['announcements']]
    assert 'Counselor meeting' in counselor_titles


def test_admin_settings_round_trip(client):
    admin = login(client, ADMIN)
    assert client.put('/api/v1/admin/settings', json={'lead_time_hours': 48}, headers=admin).status_code == 200
    assert client.get('/api/v1/admin/settings', headers=admin).get_json()['settings']['lead_time_hours'] == '48'
    assert client.put('/api/v1/admin/settings', json={'lead_time_hours': 'lots'}, headers=admin).status_code == 400


def test_admin_users_and_audit_logs(client):
    admin = login(client, ADMIN)
    users = client.get('/api/v1/admin/users', headers=admin).get_json()['users']
    assert len(users) >= 7
    logs = client.get('/api/v1/admin/audit-logs', headers=admin).get_json()['logs']
    assert any(l['action'] == 'USER_LOGIN' for l in logs)


def test_admin_cannot_delete_user_with_history(client):
    admin = login(client, ADMIN)
    assert client.delete('/api/v1/admin/users/usr-std-1', headers=admin).status_code == 409
    assert client.delete('/api/v1/admin/users/usr-adm-1', headers=admin).status_code == 400


def test_change_password_requires_correct_current_password(client):
    h = login(client, STUDENT)
    bad = client.post('/api/v1/auth/change-password', json={'current_password': 'wrong-one', 'new_password': 'newpass123'}, headers=h)
    assert bad.status_code == 400
    good = client.post('/api/v1/auth/change-password', json={'current_password': 'password123', 'new_password': 'newpass123'}, headers=h)
    assert good.status_code == 200
    assert client.post('/api/v1/auth/login', json={'email': STUDENT, 'password': 'password123'}).status_code == 401


def test_reports_use_real_data(client):
    admin = login(client, ADMIN)
    data = client.get('/api/v1/reports/summary', headers=admin).get_json()
    assert data['total_appointments'] == len(DBService.get_appointments())
    assert data['total_students'] >= 3
