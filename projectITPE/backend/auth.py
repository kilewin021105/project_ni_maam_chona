import jwt
import bcrypt
import datetime
import threading
from functools import wraps
from flask import request, jsonify
from .config import Config


def hash_password(password: str) -> str:
    """Hashes a plaintext password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def check_password(password: str, hashed: str) -> bool:
    """Verifies a plaintext password against a bcrypt hash. Non-bcrypt values never match."""
    if not hashed or not hashed.startswith(('$2b$', '$2a$', '$2y$')):
        return False
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except (ValueError, TypeError):
        return False


def generate_token(user: dict) -> str:
    """Generates a signed JWT access token."""
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        'sub': user.get('id'),
        'email': user.get('email'),
        'name': user.get('name'),
        'role': user.get('role'),
        'exp': now + datetime.timedelta(hours=Config.JWT_EXPIRATION_HOURS),
        'iat': now
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm='HS256')


def decode_token(token: str) -> dict:
    """Decodes and validates a signed JWT access token."""
    return jwt.decode(token, Config.JWT_SECRET, algorithms=['HS256'])


def _user_from_request():
    """Returns (user, error_response). The user is re-read from the database so that
    deactivated accounts and role changes take effect immediately."""
    from .database import DBService

    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None, (jsonify({'error': 'Please sign in to continue.'}), 401)

    token = auth_header.split(' ', 1)[1].strip()
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        return None, (jsonify({'error': 'Your session has expired. Please sign in again.'}), 401)
    except jwt.InvalidTokenError:
        return None, (jsonify({'error': 'Your session is invalid. Please sign in again.'}), 401)

    user = DBService.get_user_by_id(payload.get('sub'))
    if not user:
        return None, (jsonify({'error': 'This account no longer exists.'}), 401)
    if user.get('status') == 'inactive':
        return None, (jsonify({'error': 'This account has been deactivated. Contact the Guidance Office.'}), 401)

    return {
        'sub': user['id'],
        'id': user['id'],
        'email': user.get('email'),
        'name': user.get('name'),
        'role': user.get('role')
    }, None


def get_optional_user():
    """Returns the signed-in user, or None for anonymous visitors (never an error)."""
    if not request.headers.get('Authorization', '').startswith('Bearer '):
        return None
    user, _ = _user_from_request()
    return user


def auth_required(roles=None):
    """
    Decorator enforcing valid JWT authentication and optional role checking.
    Usage: @auth_required() or @auth_required(['counselor', 'admin'])
    """
    if isinstance(roles, str):
        roles = [roles]

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user, error = _user_from_request()
            if error:
                return error
            if roles and user['role'] not in roles:
                return jsonify({'error': 'You do not have permission to do this.'}), 403
            request.current_user = user
            return fn(*args, **kwargs)
        return wrapper
    return decorator


class LoginThrottle:
    """In-memory failed-login counter per (email, ip). Resets on successful login."""
    _lock = threading.Lock()
    _failures = {}

    @classmethod
    def _key(cls, email, ip):
        return f"{(email or '').lower()}|{ip or ''}"

    @classmethod
    def _recent(cls, key):
        cutoff = datetime.datetime.now() - datetime.timedelta(minutes=Config.LOGIN_LOCKOUT_MINUTES)
        attempts = [t for t in cls._failures.get(key, []) if t > cutoff]
        cls._failures[key] = attempts
        return attempts

    @classmethod
    def minutes_locked(cls, email, ip) -> int:
        """Returns minutes left in the lockout, or 0 if login attempts are allowed."""
        with cls._lock:
            attempts = cls._recent(cls._key(email, ip))
            if len(attempts) < Config.LOGIN_MAX_ATTEMPTS:
                return 0
            unlock_at = attempts[0] + datetime.timedelta(minutes=Config.LOGIN_LOCKOUT_MINUTES)
            remaining = (unlock_at - datetime.datetime.now()).total_seconds() / 60
            return max(1, int(remaining + 0.999))

    @classmethod
    def record_failure(cls, email, ip):
        with cls._lock:
            key = cls._key(email, ip)
            cls._recent(key)
            cls._failures.setdefault(key, []).append(datetime.datetime.now())

    @classmethod
    def reset(cls, email, ip):
        with cls._lock:
            cls._failures.pop(cls._key(email, ip), None)
