#!/usr/bin/env python3
"""
Buenavista Community College (BCC) Guidance System — Backend Entry Point
"""
from backend.app import create_app
from backend.config import Config
from backend.database import DBService

app = create_app()

if __name__ == '__main__':
    port = Config.PORT
    print("=" * 70)
    print(" BUENAVISTA COMMUNITY COLLEGE — GUIDANCE SYSTEM API SERVER")
    print(f" REST API:   http://127.0.0.1:{port}/api/v1")
    print(f" Database:   {'Supabase Remote' if DBService.is_supabase() else 'SQLite Fallback'}")
    print("=" * 70)
    app.run(host='0.0.0.0', port=port, debug=Config.DEBUG)
