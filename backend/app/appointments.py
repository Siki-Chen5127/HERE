"""Shared booking rules for mobile requests and staff confirmation."""
from contextlib import contextmanager, nullcontext
from datetime import date, datetime, time, timedelta, timezone
from threading import RLock

from fastapi import HTTPException
from sqlalchemy import func, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from .models import ConsultationAssignment, StaffUser

CAMPUS_TZ = timezone(timedelta(hours=8))
SLOT_HOURS = (9, 10, 11, 14, 15, 16)
SLOT_LENGTH = timedelta(hours=1)
BOOKING_STATUSES = ("appointment_requested", "scheduled", "active")
OPEN_CASE_STATUSES = ("assigned", *BOOKING_STATUSES)
_SQLITE_WRITE_LOCK = RLock()


def slot_start(day: date, hour: int) -> datetime:
    return datetime.combine(day, time(hour=hour), tzinfo=CAMPUS_TZ).astimezone(timezone.utc)


def validate_slot(when: datetime, now: datetime) -> datetime:
    if when.tzinfo is None:
        raise HTTPException(status_code=422, detail="请选择带时区的预约时段")
    campus = when.astimezone(CAMPUS_TZ)
    if (when <= now or when > now + timedelta(days=30) or campus.hour not in SLOT_HOURS
            or campus.minute != 0 or campus.second != 0 or campus.microsecond != 0):
        raise HTTPException(status_code=422, detail="请选择未来 30 天内开放的整点预约时段")
    return when.astimezone(timezone.utc)


def active_psychologist_ids(session: Session) -> list[str]:
    rows = session.execute(
        select(StaffUser.id, func.count(ConsultationAssignment.id).label("workload"))
        .outerjoin(ConsultationAssignment,
                   (ConsultationAssignment.psychologist_id == StaffUser.id) &
                   ConsultationAssignment.status.in_(OPEN_CASE_STATUSES))
        .where(StaffUser.role == "psychologist", StaffUser.is_active == 1, StaffUser.account_status == "active")
        .group_by(StaffUser.id)
        .order_by(func.count(ConsultationAssignment.id), StaffUser.id)
    ).all()
    return [row[0] for row in rows]


def occupied_psychologist_ids(session: Session, when: datetime, candidate_ids: list[str],
                              exclude_assignment_id: str | None = None) -> set[str]:
    if not candidate_ids:
        return set()
    # An overlapping one-hour appointment also blocks older non-canonical appointments.
    statement = select(ConsultationAssignment.psychologist_id).where(
        ConsultationAssignment.psychologist_id.in_(candidate_ids),
        ConsultationAssignment.status.in_(BOOKING_STATUSES),
        ConsultationAssignment.scheduled_at > when - SLOT_LENGTH,
        ConsultationAssignment.scheduled_at < when + SLOT_LENGTH,
    )
    if exclude_assignment_id:
        statement = statement.where(ConsultationAssignment.id != exclude_assignment_id)
    return set(session.scalars(statement).all())


@contextmanager
def appointment_write_lock(session: Session):
    """Serialize scheduling changes until commit across workers sharing SQL Server.

    SQLite uses a database write transaction and a process lock (also suitable
    for the in-memory test connection). No schema migration or real records are
    required to establish the lock.
    """
    dialect = session.get_bind().dialect.name
    with (_SQLITE_WRITE_LOCK if dialect == "sqlite" else nullcontext()):
        try:
            if dialect == "mssql":
                try:
                    result = session.execute(text(
                        "DECLARE @lock_result int; "
                        "EXEC @lock_result = sys.sp_getapplock "
                        "@Resource = :resource, @LockMode = 'Exclusive', "
                        "@LockOwner = 'Transaction', @LockTimeout = 10000; "
                        "SELECT @lock_result AS result"
                    ), {"resource": "HERE.consultation.schedule.v1"}).scalar_one()
                except SQLAlchemyError:
                    raise HTTPException(status_code=503, detail="预约系统暂时忙，请稍后刷新重试") from None
                if result < 0:
                    raise HTTPException(status_code=409, detail="预约时段正在更新，请稍后重试")
            elif dialect == "sqlite":
                connection = session.connection()
                if not connection.connection.driver_connection.in_transaction:
                    connection.exec_driver_sql("BEGIN IMMEDIATE")
            else:
                raise HTTPException(status_code=503, detail="当前数据库暂不支持预约锁")
            yield
            if session.in_transaction():
                session.rollback()
        except Exception:
            session.rollback()
            raise
