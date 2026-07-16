from sqlalchemy.orm import Session
from app.models.activity_log import ActivityLog
import datetime


def log_activity(db: Session, username: str, role: str, action: str, module: str, details: str):
    try:
        log_entry = ActivityLog(
            username=username,
            role=role,
            action=action,
            module=module,
            details=details,
            timestamp=datetime.datetime.now(datetime.timezone.utc)
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Failed to log activity: {e}")
