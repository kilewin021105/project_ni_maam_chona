import pytest
import os
import json
from backend.app import create_app
from backend.database import DBService

@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_health_check(client):
    res = client.get('/api/v1/health')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'healthy'
    assert 'Buenavista Community College' in data['institution']

def test_student_login_valid(client):
    res = client.post('/api/v1/auth/login', json={
        'email': 'juan.delacruz@buenavista.edu.ph',
        'password': 'password123'
    })
    assert res.status_code == 200
    data = res.get_json()
    assert 'token' in data
    assert data['user']['role'] == 'student'
    assert data['user']['name'] == 'Juan Dela Cruz'

def test_counselor_login_valid(client):
    res = client.post('/api/v1/auth/login', json={
        'email': 'msantos.guidance@buenavista.edu.ph',
        'password': 'password123'
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data['user']['role'] == 'counselor'

def test_admin_login_valid(client):
    res = client.post('/api/v1/auth/login', json={
        'email': 'admin.guidance@buenavista.edu.ph',
        'password': 'password123'
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data['user']['role'] == 'admin'

def test_login_invalid_password(client):
    res = client.post('/api/v1/auth/login', json={
        'email': 'juan.delacruz@buenavista.edu.ph',
        'password': 'wrongpassword'
    })
    assert res.status_code == 401

def test_student_registration(client):
    import uuid
    rand_email = f"student_{uuid.uuid4().hex[:6]}@buenavista.edu.ph"
    res = client.post('/api/v1/auth/register', json={
        'name': 'Test New Student',
        'email': rand_email,
        'password': 'password123',
        'course': 'BSIT',
        'year_section': '1A'
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data['user']['email'] == rand_email
    assert data['user']['role'] == 'student'

def test_guidance_services_catalog(client):
    res = client.get('/api/v1/services')
    assert res.status_code == 200
    data = res.get_json()
    assert len(data['services']) >= 6

def test_appointment_booking_and_double_booking_prevention(client):
    import uuid
    test_date = '2026-09-15'
    test_time = '10:00 AM'
    counselor_id = 'usr-cns-1'

    # First booking should succeed
    res1 = client.post('/api/v1/appointments', json={
        'student_id': 'usr-std-1',
        'counselor_id': counselor_id,
        'service_id': 'srv-1',
        'date': test_date,
        'time_slot': test_time,
        'modality': 'In-Person',
        'urgency': 'Routine',
        'reason': 'Academic and study stress testing.'
    })
    assert res1.status_code == 201
    data1 = res1.get_json()
    apt_id = data1['appointment']['id']
    assert data1['appointment']['reference_code'].startswith('BCC-APT-')

    # Second booking for the EXACT same counselor, date, and time slot MUST BE REJECTED
    res2 = client.post('/api/v1/appointments', json={
        'student_id': 'usr-std-2',
        'counselor_id': counselor_id,
        'service_id': 'srv-2',
        'date': test_date,
        'time_slot': test_time,
        'modality': 'In-Person',
        'urgency': 'Routine',
        'reason': 'Concurrent booking collision attempt.'
    })
    assert res2.status_code == 409  # Conflict!
    assert 'already has' in res2.get_json()['error'].lower()

    # Counselor can approve the appointment
    res_approve = client.patch(f'/api/v1/appointments/{apt_id}/status', json={
        'status': 'Approved',
        'userId': counselor_id,
        'comments': 'Confirmed by Dr. Santos'
    })
    assert res_approve.status_code == 200
    assert res_approve.get_json()['appointment']['status'] == 'Approved'

    # Counselor marks as Completed
    res_complete = client.patch(f'/api/v1/appointments/{apt_id}/status', json={
        'status': 'Completed',
        'userId': counselor_id
    })
    assert res_complete.status_code == 200

    # Student can submit feedback for completed appointment
    res_fb = client.post(f'/api/v1/appointments/{apt_id}/feedback', json={
        'student_id': 'usr-std-1',
        'rating': 5,
        'comments': 'Very helpful and professional session.'
    })
    assert res_fb.status_code == 201

def test_confidential_clinical_soap_notes(client):
    res = client.post('/api/v1/counseling-records', json={
        'student_id': 'usr-std-1',
        'counselor_id': 'usr-cns-1',
        'case_category': 'Personal / Emotional',
        'subjective': 'Client reported stress regarding family expectations.',
        'objective': 'Client was coherent and cooperative.',
        'assessment': 'Normal developmental anxiety.',
        'plan': 'Reflective journaling and follow-up in 2 weeks.'
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data['record']['confidentiality_level'] == 'Strictly Confidential'

    # Counselor retrieves records
    res_get = client.get('/api/v1/counseling-records?counselorId=usr-cns-1')
    assert res_get.status_code == 200
    assert len(res_get.get_json()['records']) >= 1

def test_guidance_resources_catalog(client):
    res = client.get('/api/v1/resources')
    assert res.status_code == 200
    data = res.get_json()
    assert len(data['resources']) >= 4

def test_admin_users_and_audit_logs(client):
    res_users = client.get('/api/v1/admin/users')
    assert res_users.status_code == 200
    assert len(res_users.get_json()['users']) >= 7

    res_logs = client.get('/api/v1/admin/audit-logs')
    assert res_logs.status_code == 200
    assert len(res_logs.get_json()['logs']) >= 1

def test_change_password_and_profile_update(client):
    # Test change password valid
    res_pwd = client.post('/api/v1/auth/change-password', json={
        'user_id': 'usr-std-1',
        'current_password': 'password123',
        'new_password': 'newpassword123'
    })
    assert res_pwd.status_code == 200

    # Revert password back so demo accounts keep password123
    res_revert = client.post('/api/v1/auth/change-password', json={
        'user_id': 'usr-std-1',
        'current_password': 'newpassword123',
        'new_password': 'password123'
    })
    assert res_revert.status_code == 200

    # Test student profile contact update
    res_prof = client.put('/api/v1/auth/profile', json={
        'user_id': 'usr-std-1',
        'phone': '0917-999-8888',
        'emergency_contact': 'Maria Dela Cruz (Mother) - 0918-999-7777'
    })
    assert res_prof.status_code == 200
    data = res_prof.get_json()
    assert data['user']['phone'] == '0917-999-8888'

def test_admin_user_status_toggle_and_settings(client):
    # Deactivate student
    res_deact = client.patch('/api/v1/admin/users/usr-std-2/status', json={'status': 'inactive'})
    assert res_deact.status_code == 200
    assert res_deact.get_json()['user']['status'] == 'inactive'

    # Re-activate student
    res_act = client.patch('/api/v1/admin/users/usr-std-2/status', json={'status': 'active'})
    assert res_act.status_code == 200
    assert res_act.get_json()['user']['status'] == 'active'

    # Test saving settings
    res_set = client.put('/api/v1/admin/settings', json={
        'system_name': 'Buenavista Community College (BCC) Guidance System',
        'lead_time_hours': 12,
        'cancellation_window_hours': 4
    })
    assert res_set.status_code == 200
    assert res_set.get_json()['settings']['lead_time_hours'] == '12'

