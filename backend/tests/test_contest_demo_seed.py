from datetime import datetime, timezone
import sqlite3

import pytest

from scripts.seed_contest_demo import DemoCredentials, create_demo_database


def test_contest_demo_is_fictional_and_refuses_overwrite(tmp_path):
    from app.security import verify_password

    path = tmp_path / "contest-only.sqlite3"
    credentials = DemoCredentials(
        student_phone="10000000099", student_password="SyntheticTestStudent!",
        counselor_email="demo-counselor@here-demo.invalid", counselor_password="SyntheticTestCounselor!",
        psychologist_password="SyntheticTestPsychologist!", director_password="SyntheticTestDirector!",
        admin_password="IndependentSyntheticAdmin!",
    )
    result = create_demo_database(path, credentials, datetime.now(timezone.utc))
    assert result["students"] == 4
    assert result["consultations"] == 3
    with sqlite3.connect(path) as connection:
        assert connection.execute("SELECT COUNT(*) FROM staff_users").fetchone()[0] == 4
        assert connection.execute("SELECT COUNT(*) FROM student_profiles WHERE counselor_id IS NOT NULL").fetchone()[0] == 4
        assert connection.execute("SELECT COUNT(*) FROM work_orders").fetchone()[0] == 3
        assert dict(connection.execute("SELECT status, COUNT(*) FROM consultation_assignments GROUP BY status")) == {
            "assigned": 1, "appointment_requested": 1, "scheduled": 1,
        }
        assert connection.execute("SELECT COUNT(*) FROM location_events").fetchone()[0] == 0
        student_hash = connection.execute("SELECT password_hash FROM student_users WHERE phone = ?", (credentials.student_phone,)).fetchone()[0]
        assert verify_password(credentials.student_password, student_hash)
        counselor_hash = connection.execute("SELECT password_hash FROM staff_users WHERE email = ?", (credentials.counselor_email,)).fetchone()[0]
        assert verify_password(credentials.counselor_password, counselor_hash)
        assert not connection.execute("PRAGMA foreign_key_check").fetchall()
    original = path.read_bytes()
    with pytest.raises(FileExistsError):
        create_demo_database(path, credentials)
    assert path.read_bytes() == original
    assert credentials.student_password.encode() not in original
    assert credentials.admin_password.encode() not in original

    # Exercise the actual FastAPI routes in a separate process pinned to the
    # temporary SQLite file, never the developer's configured SQL Server.
    import os
    import subprocess
    import sys
    env = dict(os.environ)
    env.update({
        "HERE_ENVIRONMENT": "test",
        "HERE_DATABASE_URL": "sqlite+pysqlite:///" + path.as_posix(),
        "HERE_AUTO_CREATE_SCHEMA": "false",
        "HERE_BOOTSTRAP_ADMIN": "false",
        "HERE_JWT_SECRET": "synthetic-test-token-signing-secret-only",
        "HERE_UPLOAD_DIR": str(tmp_path / "test-uploads"),
        "HERE_DEEPSEEK_API_KEY": "",
        "PYTHONDONTWRITEBYTECODE": "1",
        "HERE_TEST_DEMO_DAY": result["date"],
    })
    code = r"""
import os
from fastapi.testclient import TestClient
from app.main import app
with TestClient(app) as client:
    student = client.post("/api/v1/auth/mobile/login", json={"phone": "10000000099", "password": "SyntheticTestStudent!"})
    assert student.status_code == 200
    sh = {"Authorization": "Bearer " + student.json()["access_token"]}
    assert len(client.get("/api/v1/mobile/support-requests", headers=sh).json()) == 2
    case = client.get("/api/v1/mobile/consultations", headers=sh).json()[0]
    assert case["status"] == "assigned"
    response = client.get("/api/v1/mobile/consultations/availability", headers=sh,
                          params={"day": os.environ["HERE_TEST_DEMO_DAY"], "assignment_id": case["id"]})
    assert response.status_code == 200, response.text
    slots = {row["hour"]: row["available"] for row in response.json()["slots"]}
    assert slots[9] and not slots[14] and not slots[15]
    for email, password, role in [
        ("demo-counselor@here-demo.invalid", "SyntheticTestCounselor!", "counselor"),
        ("psychologist@here-demo.invalid", "SyntheticTestPsychologist!", "psychologist"),
        ("director@here-demo.invalid", "SyntheticTestDirector!", "center_director"),
        ("admin@here-demo.invalid", "IndependentSyntheticAdmin!", "admin"),
    ]:
        response = client.post("/api/v1/auth/staff/login", json={"email": email, "password": password})
        assert response.status_code == 200, response.text
        assert response.json()["user"]["role"] == role
        headers = {"Authorization": "Bearer " + response.json()["access_token"]}
        if role == "counselor":
            assert len(client.get("/api/v1/students", headers=headers).json()) == 4
        elif role == "psychologist":
            assert len(client.get("/api/v1/consultations", headers=headers).json()) == 3
print("Synthetic demo logins, linked records, and reserved slots verified")
"""
    checked = subprocess.run([sys.executable, "-c", code], env=env, capture_output=True, text=True, encoding="utf-8", timeout=30)
    assert checked.returncode == 0, checked.stderr
