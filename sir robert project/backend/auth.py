import jwt
import bcrypt
import datetime
from functools import wraps
from flask import request, jsonify
from .config import Config

def hash_password(password: str) -> str:
    """Hashes a plaintext password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def check_password(password: str, hashed: str) -> bool:
    """Verifies a plaintext password against a bcrypt or legacy sha/plain hash."""
    if not hashed:
        return False
    try:
        # Standard bcrypt check
        if hashed.startswith('$2b$') or hashed.startswith('$2a$') or hashed.startswith('$2y$'):
            return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
        # Plain fallback for testing
        return password == hashed
    except Exception:
        return False

def generate_token(user: dict) -> str:
    """Generates a signed JWT access token."""
    payload = {
        'sub': user.get('id'),
        'email': user.get('email'),
        'name': user.get('name'),
        'role': user.get('role'),
        'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=Config.JWT_EXPIRATION_HOURS),
        'iat': datetime.datetime.now(datetime.timezone.utc)
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm='HS256')

def decode_token(token: str) -> dict:
    """Decodes and validates a signed JWT access token."""
    return jwt.decode(token, Config.JWT_SECRET, algorithms=['HS256'])

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
            auth_header = request.headers.get('Authorization', '')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({'error': 'Missing or invalid Authorization header'}), 401

            token = auth_header.split(' ', 1)[1].strip()
            try:
                payload = decode_token(token)
            except jwt.ExpiredSignatureError:
                return jsonify({'error': 'Authentication token has expired. Please sign in again.'}), 401
            except jwt.InvalidTokenError:
                return jsonify({'error': 'Invalid authentication token.'}), 401

            if roles and payload.get('role') not in roles:
                return jsonify({
                    'error': f"Access restricted. Role '{payload.get('role')}' is not authorized for this resource.",
                    'required_roles': roles
                }), 403

            request.current_user = payload
            return fn(*args, **kwargs)
        return wrapper
    return decorator
