import os
from pathlib import Path

# Load .env file if available
env_path = Path(__file__).resolve().parent.parent / '.env'
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

class Config:
    # Supabase Configuration
    SUPABASE_URL = os.environ.get('SUPABASE_URL', '').strip()
    SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '').strip() or os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '').strip()
    
    # Security
    JWT_SECRET = os.environ.get('JWT_SECRET', 'bcc-guidance-super-secret-key-2026')
    JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', '24'))
    
    # Server Port
    PORT = int(os.environ.get('PORT', '5000'))
    DEBUG = os.environ.get('DEBUG', 'True').lower() in ('true', '1')
    
    # Local fallback SQLite database path
    LOCAL_DB_PATH = Path(__file__).resolve().parent.parent / 'database' / 'bcc_guidance.db'
