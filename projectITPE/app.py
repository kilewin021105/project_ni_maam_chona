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
    print(" BUENAVISTA COMMUNITY COLLEGE — GUIDANCE SYSTEM")
    print(f" Open in your browser:  http://127.0.0.1:{port}/")
    if Config.HOST == '0.0.0.0':
        print(f" On a phone (same Wi-Fi): http://<this-computer's-IP>:{port}/")
    print(f" Database: {'Supabase Remote' if DBService.is_supabase() else 'SQLite (database/bcc_guidance.db)'}")
    print("=" * 70)
    app.run(host=Config.HOST, port=port, debug=Config.DEBUG)
