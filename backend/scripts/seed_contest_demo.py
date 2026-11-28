"""Create a NEW isolated SQLite database of fictional contest demonstration data.

Run from backend/: python -m scripts.seed_contest_demo --help
Never run the old seed_role_demo script against real student records.
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from getpass import getpass
import os
from pathlib import Path
import re
import secrets


@dataclass(frozen=True)
class DemoCredentials:
    student_phone: str
    student_password: str
    counselor_email: str
    counselor_password: str
    psychologist_password: str
    director_password: str
    admin_password: str
    student_name: str = "小黄酱"
    counselor_name: str = "武则天"


PSYCHOLOGIST_EMAIL = "psychologist@here-demo.invalid"
DIRECTOR_EMAIL = "director@here-demo.invalid"
ADMIN_EMAIL = "admin@here-demo.invalid"
COLLEGE = "信息与工程学院（演示）"


def validate_credentials(c: DemoCredentials) -> None:
    if not re.fullmatch(r"1\d{10}", c.student_phone):
        raise ValueError("演示学生手机号应为 11 位数字")
    email = c.counselor_email.strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+", email) or email in {
        PSYCHOLOGIST_EMAIL, DIRECTOR_EMAIL, ADMIN_EMAIL
    }:
        raise ValueError("请输入独立的演示辅导员邮箱")
    passwords = (c.student_password, c.counselor_password, c.psychologist_password,
                 c.director_password, c.admin_password)
    if any(not 8 <= len(value) <= 128 for value in passwords):
        raise ValueError("各密码长度必须为 8–128 个字符")
    if len(c.admin_password) < 12 or c.admin_password in passwords[:-1]:
        raise ValueError("演示管理员密码至少 12 个字符，且不能与其他角色共用")
    if not c.student_name.strip() or not c.counselor_name.strip():
        raise ValueError("演示显示名称不能为空")


def create_demo_database(path: Path, c: DemoCredentials, now: datetime | None = None) -> dict:
    """Only write to an exclusively created, previously nonexistent SQLite file."""
    validate_credentials(c)
    path = path.expanduser().resolve()
    if path.suffix.lower() not in (".db", ".sqlite", ".sqlite3"):
        raise ValueError("输出文件必须以 .db、.sqlite 或 .sqlite3 结尾")
    if not path.parent.is_dir():
        raise ValueError("输出目录不存在")
    if path.exists():
        raise FileExistsError(f"拒绝覆盖已有文件：{path}")

    from sqlalchemy import create_engine
    from sqlalchemy.engine import URL
    from sqlalchemy.orm import Session

    from app.appointments import CAMPUS_TZ, slot_start
    from app.database import Base
    from app.models import (
        Alert, AuditLog, ConsultationAssignment, Intervention, StaffProfile,
        StaffUser, StudentProfile, StudentUser, WorkOrder,
    )
    from app.security import hash_password

    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    tomorrow = now.astimezone(CAMPUS_TZ).date() + timedelta(days=1)
    # O_EXCL also guards against a second process creating the same file.
    fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.close(fd)
    engine = create_engine(URL.create("sqlite+pysqlite", database=str(path)))
    try:
        Base.metadata.create_all(engine)
        with Session(engine) as session:
            staff = {}
            for i, (role, email, name, password, department) in enumerate([
                ("counselor", c.counselor_email.strip().lower(), c.counselor_name.strip(), c.counselor_password, "学生工作部"),
                ("psychologist", PSYCHOLOGIST_EMAIL, "演示咨询师", c.psychologist_password, "心理健康教育中心"),
                ("center_director", DIRECTOR_EMAIL, "演示中心负责人", c.director_password, "心理健康教育中心"),
                ("admin", ADMIN_EMAIL, "演示管理员", c.admin_password, "平台管理"),
            ], 1):
                account = StaffUser(email=email, name=name, role=role, department=department,
                                    password_hash=hash_password(password), account_status="active",
                                    is_active=True, review_scopes="psychology" if role == "center_director" else "")
                session.add(account)
                session.flush()
                staff[role] = account
                session.add(StaffProfile(
                    staff_user_id=account.id, real_name=name, display_name=name,
                    phone=f"100000001{i:02d}", organization="HERE 比赛演示校园",
                    department=department, college=COLLEGE if role == "counselor" else None,
                    employee_number=f"DEMO-STAFF-{i:02d}",
                ))

            counselor, psychologist = staff["counselor"], staff["psychologist"]
            student_specs = [
                (c.student_phone, c.student_name.strip(), c.student_password),
            ]
            extra_phones = (f"100000000{i:02d}" for i in range(1, 100) if f"100000000{i:02d}" != c.student_phone)
            for name in ("演示同学 A", "演示同学 B", "演示同学 C"):
                student_specs.append((next(extra_phones), name, secrets.token_urlsafe(24)))
            students = []
            for i, (phone, name, password) in enumerate(student_specs, 1):
                account = StudentUser(phone=phone, display_name=name, password_hash=hash_password(password), status="active")
                session.add(account)
                session.flush()
                students.append(account)
                session.add(StudentProfile(
                    student_id=account.id, student_number=f"DEMO2026{i:04d}", college=COLLEGE,
                    major="信息工程（演示）", class_name="信息2601（演示）", counselor_id=counselor.id,
                ))

            sequence = 0
            def support(student, message, created, status, assignee):
                nonlocal sequence
                sequence += 1
                alert = Alert(student_id=student.id, client_event_id=f"contest-demo-support-{sequence}",
                              category="student_support", severity="low", source="学生主动求助",
                              description=message, status="resolved" if status == "resolved" else "open",
                              created_at=created, updated_at=created)
                session.add(alert)
                session.flush()
                order = WorkOrder(alert_id=alert.id, business_number=f"WO-{created.strftime('%Y%m%d')}-{sequence:06d}",
                                  assignee_id=assignee.id, priority="low", summary=message, status=status,
                                  created_at=created, updated_at=created)
                session.add(order)
                session.flush()
                return order

            def intervention(order, person, action, when, note=None):
                session.add(Intervention(work_order_id=order.id, staff_user_id=person.id,
                                         action_type=action, created_at=when, note=note))

            first = support(students[0], "【演示】最近课业安排较满，希望了解校园心理支持服务。",
                            now - timedelta(days=2), "referred", psychologist)
            intervention(first, counselor, "student_receive", now - timedelta(days=2) + timedelta(hours=1))
            intervention(first, counselor, "student_update", now - timedelta(days=1, hours=12),
                         "【演示】已收到你的请求。可以在心理预约中选择方便的时间。")
            intervention(first, counselor, "refer", now - timedelta(days=1), "【演示】学生同意转介。")

            closed = support(students[0], "【演示】想了解学校的学习支持资源。",
                             now - timedelta(days=4), "resolved", counselor)
            intervention(closed, counselor, "student_receive", now - timedelta(days=4) + timedelta(hours=1))
            intervention(closed, counselor, "student_update", now - timedelta(days=3), "【演示】已介绍校园学习支持资源。")
            closed.resolved_at = now - timedelta(days=2, hours=12)
            closed.resolution_note = "【演示】示例关怀请求已完成。"
            intervention(closed, counselor, "resolve", closed.resolved_at, closed.resolution_note)

            pending = support(students[3], "【演示】希望了解适合自己的时间管理方法。",
                              now - timedelta(hours=3), "pending", counselor)

            session.add_all([
                ConsultationAssignment(
                    student_id=students[0].id, psychologist_id=psychologist.id,
                    work_order_id=first.id, status="assigned", consent_granted_at=now - timedelta(days=1),
                ),
                ConsultationAssignment(
                    student_id=students[1].id, psychologist_id=psychologist.id,
                    status="appointment_requested", scheduled_at=slot_start(tomorrow, 14),
                    consent_granted_at=now - timedelta(hours=2),
                ),
                ConsultationAssignment(
                    student_id=students[2].id, psychologist_id=psychologist.id,
                    status="scheduled", scheduled_at=slot_start(tomorrow, 15),
                    consent_granted_at=now - timedelta(hours=3),
                ),
                AuditLog(actor_type="staff", actor_id=staff["admin"].id, action="demo.seed",
                         resource_type="contest_demo", detail="仅含虚构比赛演示数据"),
            ])
            session.commit()
    except Exception:
        # Do not remove or overwrite anything automatically, even on failure.
        raise
    finally:
        engine.dispose()

    return {"students": 4, "staff": 4, "work_orders": 3, "consultations": 3,
            "date": tomorrow.isoformat(), "path": str(path)}


def _prompt(label: str) -> str:
    value = getpass(label + "（输入不会显示）：")
    if value != getpass("再输入一次确认："):
        raise ValueError("两次密码输入不一致")
    return value


def main() -> None:
    parser = argparse.ArgumentParser(description="创建全新的比赛演示数据库；绝不连接或覆盖现有业务库")
    parser.add_argument("--output", type=Path, required=True, help="必须是不存在的 SQLite 文件")
    parser.add_argument("--student-phone", required=True, help="与已构建的学生演示按钮一致")
    parser.add_argument("--counselor-email", required=True, help="与已构建的辅导员演示按钮一致")
    args = parser.parse_args()
    if args.output.expanduser().exists():
        parser.error("输出文件已经存在；不会覆盖。请选择一个新的文件名。")
    print("注意：以下账号仅用于隔离的比赛演示数据库。请勿使用真实学校管理员密码。")
    try:
        credentials = DemoCredentials(
            student_phone=args.student_phone,
            student_password=_prompt("演示学生密码（与快捷填充一致）"),
            counselor_email=args.counselor_email,
            counselor_password=_prompt("演示辅导员密码（与快捷填充一致）"),
            psychologist_password=_prompt("演示咨询师密码"),
            director_password=_prompt("演示中心负责人密码"),
            admin_password=_prompt("演示管理员密码（独立且至少12字符）"),
        )
        result = create_demo_database(args.output, credentials)
    except (ValueError, FileExistsError) as exc:
        parser.error(str(exc))
    print("已生成新演示数据库：", result["path"])
    print("虚构学生 4 人、工作人员 4 人、求助 3 件、预约个案 3 件。")
    print("预约占用示例：", result["date"], "的 14:00（待确认）和 15:00（已确认，北京时间）")
    print("演示咨询师邮箱：", PSYCHOLOGIST_EMAIL)
    print("演示中心负责人邮箱：", DIRECTOR_EMAIL)
    print("演示管理员邮箱：", ADMIN_EMAIL)
    print("未修改任何现有数据库、服务配置或服务器。")


if __name__ == "__main__":
    main()
