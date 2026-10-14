import urllib.request
import json
from datetime import datetime, timedelta

BASE = 'http://127.0.0.1:8000/api/v1'

def api_call(endpoint, method='GET', data=None, token=None):
    url = f"{BASE}{endpoint}"
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f"Bearer {token}"
    req_data = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, json.loads(res.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

# 1. Admin login
status, login_res = api_call('/auth/login', 'POST', {
    'username_or_email': 'admin',
    'password': 'AdminPassword123!'
})
if status != 200:
    print(f"Admin login failed: {login_res}")
    exit(1)

admin_token = login_res['access_token']
print("[OK] Authenticated as Admin.")

# Get existing users
code, users_list = api_call('/users', 'GET', token=admin_token)
user_map = {u['username']: u for u in users_list}
print(f"[OK] Found {len(user_map)} registered users in system.")

# 2. Book appointment as patient Samantha (Scheduled for 10:30 AM local working hours)
code, pat_login = api_call('/auth/login', 'POST', {
    'username_or_email': 'samantha_b',
    'password': 'PatientPassword123!'
})
if code == 200:
    pat_token = pat_login['access_token']
    # Choose tomorrow at 10:30 AM (strictly within 09:00 - 17:00 clinical working hours)
    target_dt = (datetime.now() + timedelta(days=2)).replace(hour=10, minute=30, second=0, microsecond=0).isoformat()
    code, apt1 = api_call('/appointments', 'POST', {
        'doctor': 'Dr. Sarah Smith',
        'appointment_datetime': target_dt,
        'appointment_type': 'Specialist Consultation',
        'status': 'Scheduled',
        'notes': 'Headache and neuro consultation followup.'
    }, token=pat_token)
    if code == 201:
        print(f"[OK] Booked Appointment 1 (Patient: Samantha Brown | Doctor: Dr. Sarah Smith | Time: {target_dt} | Ref: {apt1.get('verification_code')})")
    else:
        print(f"Appointment 1 error ({code}):", apt1)

# 3. Book appointment as Reception Staff for patient David Miller (at 14:00 PM)
code, staff_login = api_call('/auth/login', 'POST', {
    'username_or_email': 'reception',
    'password': 'StaffPassword123!'
})
if code == 200:
    staff_token = staff_login['access_token']
    target_dt2 = (datetime.now() + timedelta(days=3)).replace(hour=14, minute=0, second=0, microsecond=0).isoformat()
    david_id = user_map.get('david_m', {}).get('id')
    code, apt2 = api_call('/appointments', 'POST', {
        'patient_id': david_id,
        'patient_name': 'David Miller',
        'doctor': 'Dr. Robert Chen',
        'appointment_datetime': target_dt2,
        'appointment_type': 'Cardiac Follow-up',
        'status': 'Scheduled',
        'notes': 'Booked by reception for post-treatment cardiac check.'
    }, token=staff_token)
    if code == 201:
        print(f"[OK] Booked Appointment 2 (Patient: David Miller | Doctor: Dr. Robert Chen | Time: {target_dt2} | Ref: {apt2.get('verification_code')})")
    else:
        print(f"Appointment 2 error ({code}):", apt2)

# 4. Doctor Dr. Sarah Smith logs in and adds clinical notes to complete a consultation
code, doc_login = api_call('/auth/login', 'POST', {
    'username_or_email': 'drsmith',
    'password': 'DoctorPassword123!'
})
if code == 200:
    doc_token = doc_login['access_token']
    code, my_apts = api_call('/appointments', 'GET', token=doc_token)
    print(f"[OK] Dr. Sarah Smith sees {len(my_apts)} assigned appointments in schedule.")
