import os
import secrets
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Load .env file if available
env_path = PROJECT_ROOT / '.env'
if env_path.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(env_path)
    except ImportError:
        # Simple manual fallback parser
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def _load_jwt_secret() -> str:
    """Uses JWT_SECRET from the environment, otherwise a random secret kept in .jwt_secret
    so that sessions survive a server restart. The file is never served (see app.py)."""
    env_secret = os.environ.get('JWT_SECRET', '').strip()
    if env_secret:
        return env_secret
    secret_file = PROJECT_ROOT / '.jwt_secret'
    try:
        if secret_file.exists():
            existing = secret_file.read_text(encoding='utf-8').strip()
            if existing:
                return existing
        new_secret = secrets.token_hex(32)
        secret_file.write_text(new_secret, encoding='utf-8')
        return new_secret
    except OSError:
        return secrets.token_hex(32)


class Config:
    # Supabase Configuration (use the service-role key here; it must never reach the browser)
    SUPABASE_URL = os.environ.get('SUPABASE_URL', '').strip()
    SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '').strip() or os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '').strip()

    # Security
    JWT_SECRET = _load_jwt_secret()
    JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', '12'))
    MIN_PASSWORD_LENGTH = 8
    # Self-registration is limited to this email domain. Set ALLOWED_EMAIL_DOMAIN= (empty) to allow any domain.
    ALLOWED_EMAIL_DOMAIN = os.environ.get('ALLOWED_EMAIL_DOMAIN', 'buenavista.edu.ph').strip().lower()
    # Failed logins allowed per email + IP within the lockout window
    LOGIN_MAX_ATTEMPTS = int(os.environ.get('LOGIN_MAX_ATTEMPTS', '5'))
    LOGIN_LOCKOUT_MINUTES = int(os.environ.get('LOGIN_LOCKOUT_MINUTES', '15'))

    # Comma-separated list of extra origins allowed to call the API (the bundled frontend needs none)
    CORS_ORIGINS = [o.strip() for o in os.environ.get('CORS_ORIGINS', '').split(',') if o.strip()]

    # Server
    HOST = os.environ.get('HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', '5000'))
    DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1')

    # Local fallback SQLite database path
    LOCAL_DB_PATH = PROJECT_ROOT / 'database' / 'bcc_guidance.db'
